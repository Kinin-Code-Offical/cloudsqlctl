param(
  [Parameter(Mandatory = $false)]
  [string]$Version,

  [Parameter(Mandatory = $false)]
  [string]$Repo
)

$ErrorActionPreference = 'Stop'

function Write-Utf8NoBomFile([string]$path, [string]$content) {
  $utf8NoBom = New-Object Text.UTF8Encoding $false
  [IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

function Resolve-Repo {
  if ($Repo) { return $Repo }

  $remoteUrl = git remote get-url origin
  if (-not $remoteUrl) { throw "Could not detect origin remote URL." }

  if ($remoteUrl -match '^https://github\.com/(?<owner>[^/]+)/(?<repo>[^/.]+)(\.git)?$') {
    return "$($Matches.owner)/$($Matches.repo)"
  }
  if ($remoteUrl -match '^git@github\.com:(?<owner>[^/]+)/(?<repo>[^/.]+)(\.git)?$') {
    return "$($Matches.owner)/$($Matches.repo)"
  }

  throw "Unsupported origin remote URL format: $remoteUrl"
}

function Resolve-Version {
  if ($Version) { return $Version }
  $pkg = Get-Content package.json -Raw | ConvertFrom-Json
  if (-not $pkg.version) { throw "package.json missing version" }
  return [string]$pkg.version
}

function Get-ReleaseShaMap([string]$ownerRepo, [string]$ver) {
  $tmp = Join-Path $env:TEMP ("cloudsqlctl-sums-" + [Guid]::NewGuid().ToString("n"))
  New-Item -ItemType Directory -Path $tmp | Out-Null

  try {
    gh release download ("v$ver") --repo $ownerRepo --pattern "SHA256SUMS.txt" --dir $tmp | Out-Null
    $sumsPath = Join-Path $tmp "SHA256SUMS.txt"
    if (-not (Test-Path $sumsPath)) { throw "SHA256SUMS.txt not found in release v$ver" }

    $map = @{}
    foreach ($line in Get-Content $sumsPath) {
      $t = $line.Trim()
      if (-not $t) { continue }
      $parts = $t -split '\s+'
      if ($parts.Length -lt 2) { continue }
      $hash = $parts[0].ToLowerInvariant()
      $file = $parts[1]
      $map[$file] = $hash
    }
    return $map
  }
  finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  }
}

function Get-ReleaseAssetSha256([string]$ownerRepo, [string]$ver, [string]$assetName) {
  $tmp = Join-Path $env:TEMP ("cloudsqlctl-asset-" + [Guid]::NewGuid().ToString("n"))
  New-Item -ItemType Directory -Path $tmp | Out-Null

  try {
    gh release download ("v$ver") --repo $ownerRepo --pattern $assetName --dir $tmp | Out-Null
    $assetPath = Join-Path $tmp $assetName
    if (-not (Test-Path $assetPath)) { throw "Asset $assetName not found in release v$ver" }
    return (Get-FileHash $assetPath -Algorithm SHA256).Hash.ToLowerInvariant()
  }
  finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  }
}

$ownerRepo = Resolve-Repo
$ver = Resolve-Version
$sha = Get-ReleaseShaMap -ownerRepo $ownerRepo -ver $ver

$zipName = 'cloudsqlctl-windows-x64.zip'
$installerName = 'cloudsqlctl-setup.exe'

if (-not $sha.ContainsKey($installerName)) { throw "Missing $installerName in SHA256SUMS.txt for v$ver" }

$zipSha = if ($sha.ContainsKey($zipName)) { $sha[$zipName] } else { Get-ReleaseAssetSha256 -ownerRepo $ownerRepo -ver $ver -assetName $zipName }
$installerSha = $sha[$installerName]

$scoopPath = Join-Path $PSScriptRoot '..\scoop\cloudsqlctl.json'
if (Test-Path $scoopPath) {
  $json = Get-Content $scoopPath -Raw | ConvertFrom-Json
  $json.version = $ver
  $json.url = "https://github.com/$ownerRepo/releases/download/v$ver/$zipName"
  $json.hash = $zipSha
  Write-Utf8NoBomFile -path $scoopPath -content (($json | ConvertTo-Json -Depth 10) + "`n")
}

$nuspecPath = Join-Path $PSScriptRoot '..\chocolatey\cloudsqlctl\cloudsqlctl.nuspec'
if (Test-Path $nuspecPath) {
  $nuspec = Get-Content $nuspecPath -Raw
  $nuspec = $nuspec -replace '<version>[^<]+</version>', "<version>$ver</version>"
  Write-Utf8NoBomFile -path $nuspecPath -content ($nuspec + "`n")
}

$chocoInstallPath = Join-Path $PSScriptRoot '..\chocolatey\cloudsqlctl\tools\chocolateyInstall.ps1'
if (Test-Path $chocoInstallPath) {
  $ps1 = Get-Content $chocoInstallPath -Raw
  $ps1 = $ps1 -replace "(?m)^(\\$packageVersion\\s*=\\s*)'.*'$", "`$1'$ver'"
  $ps1 = $ps1 -replace "(?m)^(\\$zipSha256\\s*=\\s*)'.*'$", "`$1'$zipSha'"
  Write-Utf8NoBomFile -path $chocoInstallPath -content ($ps1 + "`n")
}

$wingetPath = Join-Path $PSScriptRoot '..\distribution\winget\cloudsqlctl.yaml'
if (Test-Path $wingetPath) {
  $yaml = Get-Content $wingetPath -Raw
  $yaml = $yaml -replace "(?m)^PackageVersion:\\s*.*$", "PackageVersion: $ver"
  $yaml = $yaml -replace "(?m)^\\s*InstallerUrl:\\s*.*$", "    InstallerUrl: https://github.com/$ownerRepo/releases/download/v$ver/$installerName"
  $yaml = $yaml -replace "(?m)^\\s*InstallerSha256:\\s*.*$", "    InstallerSha256: $installerSha"
  Write-Utf8NoBomFile -path $wingetPath -content ($yaml + "`n")
}

Write-Host "Updated distribution manifests for v$ver in:" -ForegroundColor Green
Write-Host "- scoop/cloudsqlctl.json"
Write-Host "- chocolatey/cloudsqlctl/*"
Write-Host "- distribution/winget/cloudsqlctl.yaml"

$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot | Split-Path -Parent
$ArtifactsDir = Join-Path $Root "artifacts"
$BinDir = Join-Path $Root "bin"
$DistDir = Join-Path $Root "dist"

Write-Host "Staging artifacts..."

# 1. Clean and Create Artifacts Directory
if (Test-Path $ArtifactsDir) {
    Remove-Item $ArtifactsDir -Recurse -Force
}
New-Item -ItemType Directory -Path $ArtifactsDir | Out-Null

# 2. Copy Executables
$ExeSource = Join-Path $BinDir "cloudsqlctl.exe"
$SetupSource = Join-Path $DistDir "cloudsqlctl-setup.exe"

if (-not (Test-Path $ExeSource)) { Write-Error "Missing binary: $ExeSource"; exit 1 }

if (Test-Path $SetupSource) {
    Copy-Item $SetupSource -Destination $ArtifactsDir
}
else {
    Write-Warning "Installer not found at $SetupSource. Skipping."
}

Copy-Item $ExeSource -Destination $ArtifactsDir

# 3. Create Distribution Zip
$ZipPath = Join-Path $ArtifactsDir "cloudsqlctl-windows-x64.zip"
$FilesToZip = @(
    (Join-Path $ArtifactsDir "cloudsqlctl.exe"),
    (Join-Path $ArtifactsDir "cloudsqlctl-setup.exe"),
    (Join-Path $Root "README.md"),
    (Join-Path $Root "LICENSE"),
    (Join-Path $Root "docs/commands.md"),
    (Join-Path $Root "CHANGELOG.md")
)

# Filter existing files only
$FilesToZip = $FilesToZip | Where-Object { Test-Path $_ }

Compress-Archive -Path $FilesToZip -DestinationPath $ZipPath -Force

# 4. Generate SHA256 Checksums
$ChecksumFile = Join-Path $ArtifactsDir "SHA256SUMS.txt"

function Get-Sha256Hash {
    param($FilePath)
    try {
        $fileStream = [System.IO.File]::OpenRead($FilePath)
        $hasher = [System.Security.Cryptography.SHA256]::Create()
        $hashBytes = $hasher.ComputeHash($fileStream)
        $fileStream.Close()
        return [BitConverter]::ToString($hashBytes).Replace("-", "").ToLower()
    }
    catch {
        Write-Error ("Failed to calculate hash for {0}: {1}" -f $FilePath, $_)
        exit 1
    }
}

$ArtifactsToHash = Get-ChildItem $ArtifactsDir | Where-Object { $_.Extension -in @('.exe', '.zip') } | Sort-Object Name
$ArtifactsToHash | ForEach-Object {
    $hash = Get-Sha256Hash -FilePath $_.FullName
    "$hash  $($_.Name)"
} | Out-File -Encoding ASCII $ChecksumFile

Write-Host "Artifacts staged successfully in $ArtifactsDir"
Get-ChildItem $ArtifactsDir | Select-Object Name, Length

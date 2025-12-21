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
if (-not (Test-Path $SetupSource)) { Write-Error "Missing installer: $SetupSource"; exit 1 }

Copy-Item $ExeSource -Destination $ArtifactsDir
Copy-Item $SetupSource -Destination $ArtifactsDir

# 3. Generate SHA256 Checksums
$ChecksumFile = Join-Path $ArtifactsDir "SHA256SUMS.txt"
Get-ChildItem $ArtifactsDir -Filter "*.exe" | Get-FileHash -Algorithm SHA256 | ForEach-Object {
    "$($_.Hash)  $($_.Path | Split-Path -Leaf)"
} | Out-File -Encoding ASCII $ChecksumFile

# 4. Create Distribution Zip
$ZipPath = Join-Path $ArtifactsDir "cloudsqlctl-windows-x64.zip"
$FilesToZip = @(
    (Join-Path $ArtifactsDir "cloudsqlctl.exe"),
    (Join-Path $ArtifactsDir "cloudsqlctl-setup.exe"),
    (Join-Path $Root "README.md"),
    (Join-Path $Root "LICENSE")
)

# Filter existing files only
$FilesToZip = $FilesToZip | Where-Object { Test-Path $_ }

Compress-Archive -Path $FilesToZip -DestinationPath $ZipPath -Force

Write-Host "Artifacts staged successfully in $ArtifactsDir"
Get-ChildItem $ArtifactsDir | Select-Object Name, Length

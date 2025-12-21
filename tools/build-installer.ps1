$ErrorActionPreference = "Stop"

# Read version from package.json
$PackageJson = Get-Content -Path (Join-Path $PSScriptRoot "..\package.json") -Raw | ConvertFrom-Json
$Version = $PackageJson.version

Write-Host "Building Installer for Version: $Version"

$ISCC = Get-Command "iscc" -ErrorAction SilentlyContinue

if (-not $ISCC) {
    $ISCCPath = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
    if (Test-Path $ISCCPath) {
        $ISCC = $ISCCPath
    }
    else {
        Write-Error "Inno Setup Compiler (ISCC.exe) not found. Please install Inno Setup 6."
        exit 1
    }
}

$ScriptPath = Join-Path $PSScriptRoot "..\installer\cloudsqlctl.iss"
$ScriptPath = [System.IO.Path]::GetFullPath($ScriptPath)

Write-Host "Building installer from $ScriptPath..."

# Pass the version to ISCC
& $ISCC "/DMyAppVersion=$Version" $ScriptPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "Installer built successfully."
}
else {
    Write-Error "Installer build failed."
    exit $LASTEXITCODE
}

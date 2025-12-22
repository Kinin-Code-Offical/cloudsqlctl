$ErrorActionPreference = 'Stop'

$packageName = 'cloudsqlctl'
$packageVersion = '0.4.15'

$zipUrl = "https://github.com/Kinin-Code-Offical/cloudsqlctl/releases/download/v$packageVersion/cloudsqlctl-windows-x64.zip"
$zipSha256 = 'ec77bf329e2ff67d25d33877ac0a13a1f4c8fccf39bb00cc2fde139a9ea9ad11'

$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Install-ChocolateyZipPackage -PackageName $packageName -Url $zipUrl -UnzipLocation $toolsDir -Checksum $zipSha256 -ChecksumType 'sha256'

$exePath = Join-Path $toolsDir 'cloudsqlctl.exe'
Install-BinFile -Name 'cloudsqlctl' -Path $exePath



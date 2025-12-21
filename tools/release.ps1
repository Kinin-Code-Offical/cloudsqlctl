param(
    [Parameter(Mandatory = $true)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

Write-Host "Starting release process for version $Version..."

# 1. Update package.json version
Write-Host "Updating package.json version..."
$PkgJson = Get-Content package.json | ConvertFrom-Json
$PkgJson.version = $Version
$PkgJson | ConvertTo-Json -Depth 10 | Set-Content package.json

# 2. Run Checks and Build
Write-Host "Running lint, tests, and build..."
npm ci
npm run lint
npm test
npm run package
npm run installer
npm run docs:generate
npm run stage

# 3. Update CHANGELOG.md
Write-Host "Updating CHANGELOG.md..."
$Date = Get-Date -Format "yyyy-MM-dd"
$ChangelogContent = Get-Content CHANGELOG.md -Raw
$NewEntry = "## [$Version] - $Date`n`n### Added`n- Release $Version`n`n"
$NewChangelog = $NewEntry + $ChangelogContent
Set-Content CHANGELOG.md $NewChangelog

# 4. Git Operations
Write-Host "Committing and tagging..."
git add .
git commit -m "chore(release): v$Version"
git tag "v$Version"

Write-Host "Release v$Version prepared."
Write-Host "Run 'git push && git push --tags' to publish."

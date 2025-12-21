<# 
.SYNOPSIS
  Maintainer release helper for CloudSQLCTL.

.DESCRIPTION
  - Bumps version (package.json + package-lock) via `npm version`.
  - Prepends a CHANGELOG entry (if CHANGELOG.md exists).
  - Optionally runs checks (lint/test/build), generates docs, and builds artifacts locally.
  - Commits changes, (re)tags vX.Y.Z, pushes commit and tag.
  - If a GitHub Release already exists for the tag, it can update release notes (via `gh`).
  - Attempts to ensure the GitHub Actions Release workflow runs even when reusing an existing tag.

REQUIREMENTS
  - git, npm (Node 22+), and optionally GitHub CLI `gh` for workflow/release operations.
  - If you build installer locally: Inno Setup 6 (ISCC.exe) must be available (PATH or default install path).

USAGE
  ./tools/release.ps1 -Version 0.3.2
  ./tools/release.ps1 -Version 0.3.2 -SkipArtifacts   # rely on CI to build binaries
  ./tools/release.ps1 -Version 0.3.2 -SkipChecks -AllowDirty

NOTES
  This script intentionally reuses the same tag name (vX.Y.Z) and will FORCE-update the tag to point
  to the new commit, so that GitHub Actions tag-push triggers run again.
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Version,

    [string]$Remote = "origin",
    [string]$Branch = "main",

    [switch]$SkipChecks,
    [switch]$SkipDocs,
    [switch]$SkipArtifacts,

    [switch]$AllowDirty,
    [switch]$AllowSameVersion,

    # If installed and authenticated, the script will try to verify a workflow run was triggered.
    [bool]$EnsureWorkflowTriggered = $true,

    # File name under .github/workflows (e.g. release.yml). Used only with `gh`.
    [string]$ReleaseWorkflowFile = "release.yml",

    [int]$WorkflowWaitSeconds = 90,

    # Update notes for an already-published GitHub Release (only if it exists).
    [bool]$UpdateGitHubReleaseNotes = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message"
}

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$File,
        [Parameter(Mandatory = $false)][string[]]$Arguments = @()
    )
    Write-Host ("$File " + ($Arguments -join " "))
    & $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed ($LASTEXITCODE): $File $($Arguments -join ' ')"
    }
}

function Invoke-ExternalCommand {
    param(
        [Parameter(Mandatory = $true)][string]$File,
        [Parameter(Mandatory = $false)][string[]]$Arguments = @()
    )
    & $File @Arguments
    return $LASTEXITCODE
}

function Get-Json([string]$Path) {
    return (Get-Content $Path -Raw | ConvertFrom-Json)
}

function Set-Json([string]$Path, $Obj) {
    $Obj | ConvertTo-Json -Depth 100 | Set-Content $Path -Encoding UTF8
}

function Get-ChangelogNotes([string]$ChangelogPath, [string]$Ver) {
    if (-not (Test-Path $ChangelogPath)) { return $null }
    $raw = Get-Content $ChangelogPath -Raw
    # Extract section "## [X.Y.Z] - YYYY-MM-DD" up to next "## ["
    $escapedVer = [regex]::Escape($Ver)
    $pattern = "(?ms)^## \[$escapedVer\].*?(?=^## \[|\z)"
    $m = [regex]::Match($raw, $pattern)
    if ($m.Success) { return $m.Value.Trim() }
    return $null
}

# --- Preconditions ---
Assert-Command git
Assert-Command npm

Write-Step "Locating repository root"
$repoRoot = (& git rev-parse --show-toplevel) 2>$null
if (-not $repoRoot) { throw "Not a git repository (git rev-parse failed)." }
Set-Location $repoRoot

if (-not (Test-Path "package.json")) { throw "package.json not found in repo root: $repoRoot" }

# --- Version Handling ---
if ($Version -eq "minimal") {
    $pkg = Get-Json "package.json"
    $current = [string]$pkg.version
    if ($current -match '^(\d+)\.(\d+)\.(\d+)(.*)$') {
        $major = $Matches[1]
        $minor = $Matches[2]
        $patch = [int]$Matches[3] + 1
        $suffix = $Matches[4]
        $Version = "$major.$minor.$patch$suffix"
        Write-Host "Minimal version requested. Incrementing $current -> $Version"
    }
    else {
        throw "Could not parse current version from package.json: $current"
    }
}

if ($Version -notmatch '^\d+\.\d+\.\d+([\-+][0-9A-Za-z\.\-]+)?$') {
    throw "Version must look like SemVer (e.g. 0.3.2). Got: $Version"
}
$Tag = "v$Version"

Write-Step "Validating git working tree"
$dirty = (& git status --porcelain)
if ($dirty -and -not $AllowDirty) {
    throw "Working tree is dirty. Commit/stash changes or rerun with -AllowDirty."
}

$currentBranch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ($currentBranch -ne $Branch) {
    Write-Host "Warning: current branch is '$currentBranch' but -Branch is '$Branch'."
    Write-Host "The script will push HEAD to $Remote/$Branch."
}

# --- Update version ---
Write-Step "Updating version to $Version"
$pkg = Get-Json "package.json"
$currentVersion = [string]$pkg.version

if ($currentVersion -eq $Version -and -not $AllowSameVersion) {
    throw "package.json version is already $Version. Rerun with -AllowSameVersion if you intend to rebuild/re-publish the same tag."
}

if ($PSCmdlet.ShouldProcess("package.json/package-lock.json", "npm version $Version --no-git-tag-version")) {
    $npmArgs = @("version", $Version, "--no-git-tag-version")
    if ($AllowSameVersion) { $npmArgs += "--allow-same-version" }
    Invoke-Checked "npm" $npmArgs
}

# --- Changelog ---
if (Test-Path "CHANGELOG.md") {
    Write-Step "Prepending CHANGELOG.md entry"
    $date = Get-Date -Format "yyyy-MM-dd"
    $existing = Get-Content "CHANGELOG.md" -Raw
    $existing = $existing -replace '(?ms)^<!-- markdownlint-disable MD024 -->\s*', ''
    $existing = $existing -replace '(?ms)^# Changelog\s*', ''
    $entry = "<!-- markdownlint-disable MD024 -->`n`n# Changelog`n`n## [$Version] - $date`n`n### Added`n- Release $Version`n`n"
    $escapedVer = [regex]::Escape($Version)
    if ($existing -notmatch "## \[$escapedVer\]") {
        Set-Content "CHANGELOG.md" ($entry + $existing) -Encoding UTF8
    }
    else {
        Write-Host "CHANGELOG.md already contains an entry for $Version; leaving as-is."
    }
}
else {
    Write-Host "CHANGELOG.md not found; skipping changelog update."
}

# --- Optional checks/build/docs/artifacts ---
if (-not $SkipChecks) {
    Write-Step "Running checks (npm ci, lint, test, build)"
    Invoke-Checked "npm" @("ci")
    Invoke-Checked "npm" @("run", "lint")
    Invoke-Checked "npm" @("test")
    Invoke-Checked "npm" @("run", "build")
}
else {
    Write-Host "Skipping checks (-SkipChecks)."
}

# docs:generate if present and not skipped
if (-not $SkipDocs) {
    $pkg2 = Get-Json "package.json"
    $scripts = $pkg2.scripts
    if ($null -ne $scripts -and $scripts.PSObject.Properties.Name -contains "docs:generate") {
        Write-Step "Generating docs (npm run docs:generate)"
        Invoke-Checked "npm" @("run", "docs:generate")
    }
    else {
        Write-Host "docs:generate script not found; skipping docs generation."
    }
}
else {
    Write-Host "Skipping docs generation (-SkipDocs)."
}

if (-not $SkipArtifacts) {
    $pkg3 = Get-Json "package.json"
    $scripts3 = $pkg3.scripts
    if ($null -ne $scripts3 -and $scripts3.PSObject.Properties.Name -contains "package") {
        Write-Step "Building artifacts locally (package -> installer -> stage)"
        Invoke-Checked "npm" @("run", "package")
        if ($scripts3.PSObject.Properties.Name -contains "installer") {
            Invoke-Checked "npm" @("run", "installer")
        }
        else {
            Write-Host "installer script not found; skipping installer build."
        }
        if ($scripts3.PSObject.Properties.Name -contains "stage") {
            Invoke-Checked "npm" @("run", "stage")
        }
        else {
            Write-Host "stage script not found; skipping staging."
        }
    }
    else {
        Write-Host "package script not found; skipping local artifact build."
    }
}
else {
    Write-Host "Skipping local artifact build (-SkipArtifacts). CI will publish."
}

# --- Commit ---
Write-Step "Committing changes"
Invoke-Checked "git" @("add", "-A")
$commitMsg = "chore(release): v$Version"

# If nothing to commit, keep going (for rebuilds)
$commitExit = Invoke-ExternalCommand "git" @("commit", "-m", $commitMsg)
if ($commitExit -ne 0) {
    Write-Host "No changes to commit (git commit exit $commitExit). Continuing (useful for rebuild/re-publish)."
}

# --- Tag (force update) ---
Write-Step "Creating/updating tag $Tag"
Invoke-Checked "git" @("tag", "-a", "-f", $Tag, "-m", "Release $Tag")

# --- Push commit + tag ---
Write-Step "Pushing HEAD to $Remote/$Branch"
Invoke-Checked "git" @("push", $Remote, "HEAD:$Branch")

Write-Step "Pushing tag $Tag (force) to $Remote"
Invoke-Checked "git" @("push", $Remote, $Tag, "--force")

$headSha = (& git rev-parse HEAD).Trim()
$startTime = Get-Date

# --- Optional: Update GitHub Release notes if exists ---
$hasGh = $false
if (Get-Command gh -ErrorAction SilentlyContinue) { $hasGh = $true }

if ($hasGh -and $UpdateGitHubReleaseNotes) {
    Write-Step "Updating GitHub Release notes (if release exists) via gh"
    $notes = Get-ChangelogNotes "CHANGELOG.md" $Version
    if (-not $notes) { $notes = "Release $Tag" }

    $tmp = New-TemporaryFile
    Set-Content $tmp $notes -Encoding UTF8

    # Only edit if the release exists; do not create here (CI will create/publish assets).
    $viewExit = Invoke-ExternalCommand "gh" @("release", "view", $Tag)
    if ($viewExit -eq 0) {
        Invoke-Checked "gh" @("release", "edit", $Tag, "--title", $Tag, "--notes-file", $tmp)
    }
    else {
        Write-Host "GitHub Release for $Tag does not exist yet; skipping release notes update (CI will create it)."
    }

    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}

# --- Optional: Ensure workflow triggered ---
if ($hasGh -and $EnsureWorkflowTriggered) {
    Write-Step "Ensuring GitHub Actions workflow is triggered for $Tag"
    $workflowPath = Join-Path ".github\workflows" $ReleaseWorkflowFile
    $hasDispatch = $false
    if (Test-Path $workflowPath) {
        $wf = Get-Content $workflowPath -Raw
        if ($wf -match "workflow_dispatch") { $hasDispatch = $true }
    }

    $deadline = (Get-Date).AddSeconds($WorkflowWaitSeconds)
    $found = $false

    while ((Get-Date) -lt $deadline) {
        # Try to find a run with this HEAD SHA.
        $json = & gh run list --workflow $ReleaseWorkflowFile --limit 20 --json databaseId, headSha, createdAt, event, status, conclusion 2>$null
        if ($LASTEXITCODE -eq 0 -and $json) {
            try {
                $runs = $json | ConvertFrom-Json
                foreach ($r in $runs) {
                    if ($r.headSha -eq $headSha) {
                        $created = Get-Date $r.createdAt
                        if ($created -ge $startTime.AddMinutes(-5)) {
                            $found = $true
                            break
                        }
                    }
                }
            }
            catch { }
        }
        if ($found) { break }
        Start-Sleep -Seconds 10
    }

    if (-not $found) {
        Write-Host "No workflow run detected for HEAD $headSha. Attempting to re-trigger."
        if ($hasDispatch) {
            Write-Host "Triggering workflow_dispatch for $ReleaseWorkflowFile on ref $Tag"
            Invoke-ExternalCommand "gh" @("workflow", "run", $ReleaseWorkflowFile, "--ref", $Tag) | Out-Null
        }
        else {
            Write-Host "workflow_dispatch not enabled for $ReleaseWorkflowFile. Recreating remote tag to force a fresh push event."
            # Delete and recreate tag remotely, then push again.
            Invoke-ExternalCommand "git" @("push", $Remote, ":refs/tags/$Tag") | Out-Null
            Invoke-Checked "git" @("push", $Remote, $Tag, "--force")
        }
    }
    else {
        Write-Host "Workflow run detected for $Tag (HEAD $headSha)."
    }
}
elseif ($EnsureWorkflowTriggered) {
    Write-Host "GitHub CLI (gh) not found; skipping workflow verification/trigger. Tag push should trigger CI."
}

Write-Step "Done"
Write-Host "Pushed commit to $Remote/$Branch and tag $Tag."
Write-Host "If configured, GitHub Actions will publish/refresh the release for tag $Tag."

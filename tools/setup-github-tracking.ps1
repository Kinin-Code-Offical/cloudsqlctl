$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

function Require-GhAuth {
  & gh auth status | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Error "GitHub CLI is not authenticated. Run: gh auth login"
    exit 1
  }
}

function Get-RepoRoot {
  $root = (& git rev-parse --show-toplevel).Trim()
  if (-not $root) {
    throw "Unable to determine repo root."
  }
  return $root
}

function Parse-OwnerRepo {
  param([string]$RemoteUrl)
  $httpsMatch = [regex]::Match($RemoteUrl, '^https://github\.com/([^/]+)/([^/]+?)(\.git)?$')
  if ($httpsMatch.Success) {
    return @($httpsMatch.Groups[1].Value, $httpsMatch.Groups[2].Value)
  }
  $sshMatch = [regex]::Match($RemoteUrl, '^git@github\.com:([^/]+)/([^/]+?)(\.git)?$')
  if ($sshMatch.Success) {
    return @($sshMatch.Groups[1].Value, $sshMatch.Groups[2].Value)
  }
  throw "Unsupported origin remote URL: $RemoteUrl"
}

function Get-IssueByTitle {
  param([string]$Title)
  $search = "in:title $Title"
  $raw = & gh issue list --state all --search $search --limit 200 --json title,number,url
  $issues = $raw | ConvertFrom-Json
  return $issues | Where-Object { $_.title -eq $Title } | Select-Object -First 1
}

function Ensure-Issue {
  param(
    [string]$Title,
    [string]$Body,
    [string[]]$Labels,
    [string]$Milestone
  )
  $issue = Get-IssueByTitle -Title $Title
  if (-not $issue) {
    $createArgs = @("issue", "create", "--title", $Title, "--body", $Body)
    if ($Labels -and $Labels.Count -gt 0) {
      $createArgs += @("--label", ($Labels -join ","))
    }
    if ($Milestone) {
      $createArgs += @("--milestone", $Milestone)
    }
    & gh @createArgs | Out-Null
    $issue = Get-IssueByTitle -Title $Title
  }
  if (-not $issue) {
    throw "Failed to create or locate issue: $Title"
  }
  $editArgs = @("issue", "edit", $issue.number)
  $hasEdits = $false
  if ($Labels -and $Labels.Count -gt 0) {
    $editArgs += @("--add-label", ($Labels -join ","))
    $hasEdits = $true
  }
  if ($Milestone) {
    $editArgs += @("--milestone", $Milestone)
    $hasEdits = $true
  }
  if ($hasEdits) {
    & gh @editArgs | Out-Null
  }
  return $issue
}

Require-GhAuth
$repoRoot = Get-RepoRoot
Set-Location $repoRoot

$originUrl = (& git remote get-url origin).Trim()
$parsed = Parse-OwnerRepo -RemoteUrl $originUrl
$owner = $parsed[0]
$repo = $parsed[1]
$env:OWNER = $owner
$env:REPO = $repo
Write-Host "OWNER=$owner"
Write-Host "REPO=$repo"

$enDash = [char]0x2013
$leftQuote = [char]0x201c
$rightQuote = [char]0x201d
$apostrophe = [char]0x2019
$rightArrow = [char]0x2192

$DISCUSSION_TITLE = "CloudSQLCTL $enDash Production Hardening & Roadmap"
$ROADMAP_ISSUE_TITLE = "Roadmap: Production Finalization (P0/P1/P2) $enDash CloudSQLCTL"

$DISCUSSION_BODY = (@'
---
# CloudSQLCTL {0} Production Hardening & Roadmap

## Goal
Elevate CloudSQLCTL to a company-grade {1}production final{2} standard:
- Deterministic GitHub Releases (installer + exe + zip + checksums)
- Fully automated self-upgrade (`cloudsqlctl upgrade` default: check {3} download {3} verify {3} install)
- NPM publish (node CLI distribution) integrated with release versioning
- Secure machine-scope installation (no user-writable service binaries)
- Supportability (support bundle, structured logs, docs automation)

## Current state (high-level)
- Release pipeline builds SEA exe, builds Inno Setup installer, stages artifacts, uploads to GitHub Release.
- Upgrade checks GitHub Releases and verifies SHA256SUMS before applying installer/portable update.
- Setup supports gcloud login + ADC + instance selection.

## Risks / What{4}s wrong today
1) **Machine-scope security**: ProgramData bin permissions must not allow Users write (service privilege escalation risk).
2) **Release republish**: Re-running the same tag should update assets reliably (delete/replace clashing asset names).
3) **Workflow rerun**: Manual `workflow_dispatch` is required for deterministic republish without tag gymnastics.
4) **System-scope update guardrails**: system-scope writes require admin/elevation and must be enforced.
5) **Supportability gap**: need one-command support bundle zip (logs/config/doctor/paths/status/gcloud info).
6) **Upgrade rollout controls**: channel (stable/beta), pinned version, target version install, rollback.
7) **Supply chain**: code signing + better release verification is needed for enterprise environments.
8) **NPM publish**: define what we publish (node CLI) and keep contents minimal + version-gated.

## Milestones
- P0 {0} Release & Security Blockers
- P1 {0} Operations & Supportability
- P2 {0} Enterprise Distribution & Signing

## How we will track
- A single Roadmap issue will link all work items and milestones.
- Each item is an issue with labels: Priority (P0/P1/P2), Area, Type.
---
'@ -f $enDash, $leftQuote, $rightQuote, $rightArrow, $apostrophe)

$ROADMAP_BODY_TEMPLATE = (@'
---
# Roadmap: Production Finalization (P0/P1/P2) {0} CloudSQLCTL

This issue tracks all work required to reach {1}production final{2}.
Checklist items below link to the corresponding issues.

## P0 {0} Release & Security Blockers
- [ ] P0: Fix Machine-scope security for ProgramData bin (prevent Users write)
- [ ] P0: Release republish same tag (clobber existing assets safely)
- [ ] P0: Add workflow_dispatch to release workflow + manual rerun support
- [ ] P0: Update/Upgrade guardrails for system scope (admin/elevation required)
- [ ] P0: Repo hygiene (.gitignore) to prevent committing bin/dist/artifacts

## P1 {0} Operations & Supportability
- [ ] P1: Support bundle command (zip logs+config+doctor+paths+status)
- [ ] P1: Upgrade channels (stable/beta) + pinned version + target version install
- [ ] P1: GitHub API hardening (token support, retries, rate-limit messaging)
- [ ] P1: Proxy checksum verification robustness (deterministic source)
- [ ] P1: Improve portable upgrade swap (temp + atomic replace + rollback)
- [ ] P1: NPM publish pipeline + package contents control

## P2 {0} Enterprise Distribution & Signing
- [ ] P2: Code signing for exe + installer (CI integration)
- [ ] P2: winget/choco/scoop distribution
- [ ] P2: Enterprise policy.json (updates/auth constraints, rollout control)
- [ ] P2: Service-aware upgrade coordination (stop/start service safely)

## Notes
- Use labels: Priority:P0/P1/P2, Area:*, Type:*.
- Each milestone should have a clear scope and DoD.
---
'@ -f $enDash, $leftQuote, $rightQuote)

$labelDefinitions = @(
  @{ Name = "P0"; Color = "ff0000" },
  @{ Name = "P1"; Color = "ff8c00" },
  @{ Name = "P2"; Color = "0066ff" },
  @{ Name = "bug"; Color = "b60205" },
  @{ Name = "enhancement"; Color = "0e8a16" },
  @{ Name = "chore"; Color = "c5def5" },
  @{ Name = "docs"; Color = "1d76db" },
  @{ Name = "release"; Color = "5319e7" },
  @{ Name = "security"; Color = "8b0000" },
  @{ Name = "upgrade"; Color = "0052cc" },
  @{ Name = "installer"; Color = "fbca04" },
  @{ Name = "service"; Color = "006b75" },
  @{ Name = "auth"; Color = "7f8c8d" },
  @{ Name = "npm"; Color = "e99695" },
  @{ Name = "blocked"; Color = "000000" },
  @{ Name = "ready"; Color = "2ecc71" }
)

foreach ($label in $labelDefinitions) {
  & gh label create $label.Name --color $label.Color --force | Out-Null
}

$milestoneP0 = "P0 $enDash Release & Security Blockers"
$milestoneP1 = "P1 $enDash Operations & Supportability"
$milestoneP2 = "P2 $enDash Enterprise Distribution & Signing"
$milestoneTitles = @($milestoneP0, $milestoneP1, $milestoneP2)

$milestoneMap = @{}
$existingMilestones = & gh api "repos/$owner/$repo/milestones?state=all&per_page=100" | ConvertFrom-Json
foreach ($milestone in $existingMilestones) {
  $milestoneMap[$milestone.title] = [int]$milestone.number
}

foreach ($title in $milestoneTitles) {
  if (-not $milestoneMap.ContainsKey($title)) {
    $created = & gh api -X POST "repos/$owner/$repo/milestones" -f title="$title" | ConvertFrom-Json
    $milestoneMap[$title] = [int]$created.number
  }
}

$discussionUrl = $null
try {
  $repoQuery = @'
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    id
    discussionCategories(first: 100) {
      nodes { id name }
    }
    discussions(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { id title url }
    }
  }
}
'@
  $repoData = & gh api graphql -f query="$repoQuery" -f owner="$owner" -f name="$repo" | ConvertFrom-Json
  $repoInfo = $repoData.data.repository
  if (-not $repoInfo) {
    throw "Repository not found."
  }
  $categories = $repoInfo.discussionCategories.nodes
  if (-not $categories -or $categories.Count -eq 0) {
    throw "No discussion categories found."
  }
  $category = $categories | Where-Object { $_.name -eq "General" } | Select-Object -First 1
  if (-not $category) {
    $category = $categories | Select-Object -First 1
  }
  $existingDiscussion = $repoInfo.discussions.nodes | Where-Object { $_.title -eq $DISCUSSION_TITLE } | Select-Object -First 1
  if ($existingDiscussion) {
    $updateDiscussion = @'
mutation($discussionId: ID!, $body: String!) {
  updateDiscussion(input: {discussionId: $discussionId, body: $body}) {
    discussion { url }
  }
}
'@
    & gh api graphql -f query="$updateDiscussion" -f discussionId="$($existingDiscussion.id)" -f body="$DISCUSSION_BODY" | Out-Null
    $discussionUrl = $existingDiscussion.url
  } else {
    $createDiscussion = @'
mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
  createDiscussion(input: {repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body}) {
    discussion { url }
  }
}
'@
    $createdDiscussion = & gh api graphql -f query="$createDiscussion" -f repositoryId="$($repoInfo.id)" -f categoryId="$($category.id)" -f title="$DISCUSSION_TITLE" -f body="$DISCUSSION_BODY" | ConvertFrom-Json
    $discussionUrl = $createdDiscussion.data.createDiscussion.discussion.url
  }
} catch {
  Write-Warning "Discussion creation/update failed; falling back to issue. $($_.Exception.Message)"
  $discussionIssue = Ensure-Issue -Title $DISCUSSION_TITLE -Body $DISCUSSION_BODY -Labels @("docs")
  $discussionUrl = $discussionIssue.url
}

$roadmapIssue = Ensure-Issue -Title $ROADMAP_ISSUE_TITLE -Body $ROADMAP_BODY_TEMPLATE -Labels @("chore", "release", "P0")
$roadmapUrl = $roadmapIssue.url
$roadmapNumber = $roadmapIssue.number

$taskDefinitions = @(
  @{ Title = "P0: Fix Machine-scope security for ProgramData bin (prevent Users write)"; Milestone = $milestoneP0; Labels = @("P0", "security", "installer", "bug") },
  @{ Title = "P0: Release republish same tag (clobber existing assets safely)"; Milestone = $milestoneP0; Labels = @("P0", "release", "enhancement") },
  @{ Title = "P0: Add workflow_dispatch to release workflow + manual rerun support"; Milestone = $milestoneP0; Labels = @("P0", "release", "enhancement") },
  @{ Title = "P0: Update/Upgrade guardrails for system scope (admin/elevation required)"; Milestone = $milestoneP0; Labels = @("P0", "upgrade", "security", "bug") },
  @{ Title = "P0: Repo hygiene (.gitignore) to prevent committing bin/dist/artifacts"; Milestone = $milestoneP0; Labels = @("P0", "chore") },
  @{ Title = "P1: Support bundle command (zip logs+config+doctor+paths+status)"; Milestone = $milestoneP1; Labels = @("P1", "enhancement", "docs") },
  @{ Title = "P1: Upgrade channels (stable/beta) + pinned version + target version install"; Milestone = $milestoneP1; Labels = @("P1", "upgrade", "enhancement") },
  @{ Title = "P1: GitHub API hardening (token support, retries, rate-limit messaging)"; Milestone = $milestoneP1; Labels = @("P1", "upgrade", "chore") },
  @{ Title = "P1: Proxy checksum verification robustness (deterministic source)"; Milestone = $milestoneP1; Labels = @("P1", "release", "bug") },
  @{ Title = "P1: Improve portable upgrade swap (temp + atomic replace + rollback)"; Milestone = $milestoneP1; Labels = @("P1", "upgrade", "enhancement") },
  @{ Title = "P1: NPM publish pipeline + package contents control"; Milestone = $milestoneP1; Labels = @("P1", "npm", "release", "enhancement") },
  @{ Title = "P2: Code signing for exe + installer (CI integration)"; Milestone = $milestoneP2; Labels = @("P2", "security", "release", "enhancement") },
  @{ Title = "P2: winget/choco/scoop distribution"; Milestone = $milestoneP2; Labels = @("P2", "release", "enhancement") },
  @{ Title = "P2: Enterprise policy.json (updates/auth constraints, rollout control)"; Milestone = $milestoneP2; Labels = @("P2", "security", "enhancement") },
  @{ Title = "P2: Service-aware upgrade coordination (stop/start service safely)"; Milestone = $milestoneP2; Labels = @("P2", "service", "enhancement") }
)

$issueUrlMap = @{}
foreach ($task in $taskDefinitions) {
  $issue = Ensure-Issue -Title $task.Title -Body "" -Labels $task.Labels -Milestone $task.Milestone
  $issueUrlMap[$task.Title] = $issue.url
}

$milestoneUrls = $milestoneTitles | ForEach-Object { "https://github.com/$owner/$repo/milestone/$($milestoneMap[$_])" }

$p0Titles = $taskDefinitions | Where-Object { $_.Milestone -eq $milestoneP0 } | ForEach-Object { $_.Title }
$p1Titles = $taskDefinitions | Where-Object { $_.Milestone -eq $milestoneP1 } | ForEach-Object { $_.Title }
$p2Titles = $taskDefinitions | Where-Object { $_.Milestone -eq $milestoneP2 } | ForEach-Object { $_.Title }

$roadmapLines = @()
$roadmapLines += "---"
$roadmapLines += "# Roadmap: Production Finalization (P0/P1/P2) $enDash CloudSQLCTL"
$roadmapLines += ""
$roadmapLines += "## Links"
$roadmapLines += "- Discussion: $discussionUrl"
$roadmapLines += "- Milestones: $($milestoneUrls -join ' ')"
$roadmapLines += "- Repo: https://github.com/$owner/$repo"
$roadmapLines += ""
$roadmapLines += ("This issue tracks all work required to reach {0}production final{1}." -f $leftQuote, $rightQuote)
$roadmapLines += "Checklist items below link to the corresponding issues."
$roadmapLines += ""
$roadmapLines += "## $milestoneP0"
foreach ($title in $p0Titles) {
  $roadmapLines += "- [ ] [$title]($($issueUrlMap[$title]))"
}
$roadmapLines += ""
$roadmapLines += "## $milestoneP1"
foreach ($title in $p1Titles) {
  $roadmapLines += "- [ ] [$title]($($issueUrlMap[$title]))"
}
$roadmapLines += ""
$roadmapLines += "## $milestoneP2"
foreach ($title in $p2Titles) {
  $roadmapLines += "- [ ] [$title]($($issueUrlMap[$title]))"
}
$roadmapLines += ""
$roadmapLines += "## Notes"
$roadmapLines += "- Use labels: Priority:P0/P1/P2, Area:*, Type:*."
$roadmapLines += "- Each milestone should have a clear scope and DoD."
$roadmapLines += "---"

$roadmapBody = $roadmapLines -join "`n"
& gh issue edit $roadmapNumber --body $roadmapBody | Out-Null

Write-Host ""
Write-Host "Discussion/Issue URL: $discussionUrl"
Write-Host "Roadmap issue URL: $roadmapUrl"
Write-Host "Milestones:"
foreach ($title in $milestoneTitles) {
  Write-Host "  $title (#$($milestoneMap[$title]))"
}
Write-Host "Issues:"
foreach ($task in $taskDefinitions) {
  Write-Host "  $($task.Title): $($issueUrlMap[$task.Title])"
}

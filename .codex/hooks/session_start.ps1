$ErrorActionPreference = "Continue"

function Write-Section {
    param([string]$Title)

    Write-Host ""
    Write-Host "== $Title =="
}

function Write-FileStatus {
    param(
        [string]$Path,
        [bool]$Required = $false
    )

    if (Test-Path $Path) {
        Write-Host "[OK] $Path"
        return $true
    }

    if ($Required) {
        Write-Host "[MISSING] $Path (required)"
    } else {
        Write-Host "[missing] $Path"
    }

    return $false
}

$repoRoot = git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -eq 0 -and $repoRoot) {
    Set-Location $repoRoot
}

Write-Host "=== Codex SessionStart: BW AI Development Framework ==="
Write-Host "Workspace: $(Get-Location)"

Write-Section "Framework"
$hasAgents = Write-FileStatus -Path "AGENTS.md" -Required $true
$hasManifest = Write-FileStatus -Path ".ai/framework.json" -Required $true
$hasGuide = Write-FileStatus -Path "docs/ai-governance/AI_DEVELOPMENT_GUIDE.md" -Required $true
[void](Write-FileStatus -Path "docs/ai-governance/PROMPTS.md")
[void](Write-FileStatus -Path "docs/ai-governance/WIKI_REFRESH_GUIDE.md")

Write-Section "Project memory"
$requiredProjectDocs = @(
    "docs/ai-context/PROJECT_RULES.md",
    "docs/ai-context/CURRENT_STATE.md",
    "docs/ai-context/DECISIONS.md",
    "docs/ai-context/KNOWN_ISSUES.md"
)

$hasProjectMemory = $true
foreach ($doc in $requiredProjectDocs) {
    if (-not (Write-FileStatus -Path $doc -Required $true)) {
        $hasProjectMemory = $false
    }
}

$optionalProjectDocs = @(
    "docs/ai-context/ROADMAP.md",
    "docs/ai-context/CHANGELOG_AI.md"
)

foreach ($doc in $optionalProjectDocs) {
    [void](Write-FileStatus -Path $doc)
}

Write-Section "Technical wiki"
$wikiDocs = @(
    "docs/wiki/INDEX.md",
    "docs/wiki/OVERVIEW.md",
    "docs/wiki/MODULES.md",
    "docs/wiki/BUILD.md",
    "docs/wiki/TESTING.md"
)

foreach ($doc in $wikiDocs) {
    [void](Write-FileStatus -Path $doc)
}

Write-Section "Git branch"
git branch --show-current

Write-Section "Git status"
git status --short

Write-Section "Diff with main"
git rev-parse --verify main 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    git diff --stat main...HEAD
} else {
    Write-Host "main ref not found; skipping comparison."
}

Write-Section "Before code changes"
Write-Host "CRITICAL: This app must never write to Odoo. Only reads are allowed."
Write-Host "Any proposed write requires separate, explicit advance user approval for its exact scope."
Write-Host "Read docs/ai-context/PROJECT_RULES.md and preserve the RPC safety guard."
Write-Host "1. Read AGENTS.md and framework governance."
Write-Host "2. Read required project memory."
Write-Host "3. Read relevant docs/wiki pages if technical facts are needed."
Write-Host "4. Read the related Issue or task description."
Write-Host "5. Summarize understanding, risks, and ambiguities."
Write-Host "6. Propose a step-by-step plan."
Write-Host "7. Wait for approval before modifying files."

if (-not $hasAgents -or -not $hasManifest -or -not $hasGuide -or -not $hasProjectMemory) {
    Write-Host ""
    Write-Host "Required framework startup context is missing."
    exit 1
}

exit 0

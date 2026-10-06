# AI Development Guide

## Mandatory Project Constraint: Odoo Is Read-Only

This app must never, never ever write anything to Odoo. Only reads are allowed.
Follow [PROJECT_RULES.md](../ai-context/PROJECT_RULES.md), including its explicit
approval requirement for any proposed write. Ordinary task or plan approval
does not authorize an Odoo write. Preserve this project-specific constraint when
updating the framework.

## Purpose

This repository uses the BW AI Development Framework to make AI-assisted
software work repeatable, reviewable, and recoverable.

Assistant conversations are temporary. Git is the durable project memory.

Important context must live in the repository, GitHub Issues, Pull Requests,
commits, and versioned Markdown files. An assistant session should be able to end
without the project losing decisions, status, or technical knowledge.

## Responsibility Model

The framework separates AI collaboration knowledge into three areas.

### AI Governance

Location:

```text
AGENTS.md
docs/ai-governance/
```

Governance defines how AI coding agents and developers work together.

It includes:

- startup rules;
- development workflow;
- Git and Pull Request workflow;
- review expectations;
- reusable prompts;
- wiki refresh rules.

Governance is framework-managed. It is updated by installing a new framework
version.

### Language Policy

Unless the user explicitly requests otherwise:

- Use English for commit messages, Pull Request titles and descriptions, GitHub
  technical explanations, and all repository documentation, including files
  under `docs/`.
- Use the language used by the user for chat responses.

The user may override this policy for a specific task or artifact.

### Operational Project Memory

Location:

```text
docs/ai-context/
```

Project memory records information that cannot be reliably inferred from the
source code.

It includes:

- current project state;
- decisions and rationale;
- roadmap and priorities;
- known issues and technical debt;
- human-readable AI-assisted change summaries.

Project memory is project-owned. The installer may create missing starter
files, but it must not overwrite existing project memory.

### Technical Knowledge

Location:

```text
docs/wiki/
```

Technical knowledge records what actually exists in the repository.

It should be refreshed by analyzing the source tree, build files, tests,
configuration, and public interfaces. It must not describe future plans,
undocumented assumptions, or desired architecture.

Technical wiki files are generated or refreshed on demand. They are optional
for small repositories, but useful when a project has enough structure that
assistants and developers benefit from a stable technical map.

## Core Rule

If information can be inferred from the repository, it belongs in
`docs/wiki/`.

If information represents human intent, engineering decisions, priorities,
project status, or operational knowledge, it belongs in `docs/ai-context/`.

The two trees should complement each other without duplicating information.

## Recommended Target Structure

```text
/
├── AGENTS.md
├── CLAUDE.md
├── .ai/
│   └── framework.json
├── .codex/
│   ├── hooks.json
│   └── hooks/session_start.ps1
├── .github/
│   ├── ISSUE_TEMPLATE/codex-task.md
│   └── pull_request_template.md
├── docs/
│   ├── ai-governance/
│   │   ├── AI_DEVELOPMENT_GUIDE.md
│   │   ├── ASSISTANT_SETUP.md
│   │   ├── PROMPTS.md
│   │   └── WIKI_REFRESH_GUIDE.md
│   ├── ai-context/
│   │   ├── CURRENT_STATE.md
│   │   ├── DECISIONS.md
│   │   ├── ROADMAP.md
│   │   ├── KNOWN_ISSUES.md
│   │   └── CHANGELOG_AI.md
│   └── wiki/
│       ├── INDEX.md
│       ├── OVERVIEW.md
│       ├── MODULES.md
│       ├── API.md
│       ├── DOMAIN.md
│       ├── DATA_FLOW.md
│       ├── DEPENDENCIES.md
│       ├── BUILD.md
│       ├── TESTING.md
│       └── CONFIGURATION.md
```

## Context Initialization Gate

Before development work begins, the assistant should verify the required workflow
context.

Required framework files:

- `AGENTS.md`;
- `.ai/framework.json`;
- `docs/ai-governance/AI_DEVELOPMENT_GUIDE.md`.

Required project memory files:

- `docs/ai-context/PROJECT_RULES.md` (mandatory project safety policy);
- `docs/ai-context/CURRENT_STATE.md`;
- `docs/ai-context/DECISIONS.md`;
- `docs/ai-context/KNOWN_ISSUES.md`.

Recommended project memory files:

- `docs/ai-context/ROADMAP.md`;
- `docs/ai-context/CHANGELOG_AI.md`.

If required files are missing, the assistant should stop before implementation,
dependency installation, Docker startup, test execution, or build execution.
It should report the missing files and ask whether to initialize them.

Only minimal inspection is allowed before the gate is resolved: reading
`AGENTS.md`, reading this guide, checking Git branch/status, and listing
missing context files.

## Git Workflow

Use Git as the coordination system:

```text
GitHub Issue
    -> branch or worktree
    -> assistant session
    -> commits
    -> Pull Request
    -> documentation update
    -> merge
```

Recommended mapping:

```text
one Issue = one focused branch = one Pull Request
```

Keep branches focused. Split work when a mission grows beyond a reviewable
change.

A mission may span multiple sessions and assistants on the same branch.
Do not change branches or discard local work merely to match a handoff.

## Assistant Startup and Handoff

Use `ASSISTANT_SETUP.md` for Codex, Claude Code, and Cowork entry points.
All assistants share this governance and the same project memory. Hooks are
optional; read the instructions manually when automatic startup is unavailable.
Report unavailable Git, shell, build, or test checks as not verified. Resolve
missing capabilities only when they block the requested work.

An explicit handoff is optional, mainly useful when switching during unfinished
work. Routine state updates should make a separate preparation step unnecessary
after a normally completed task. When useful, maintain a concise `Session
handoff` section in `docs/ai-context/CURRENT_STATE.md`: timestamp, objective,
completed work, branch and last verified commit, local-only changes, actual
checks and results, next action, and blockers or decision references.

The prepare/resume prompts in `PROMPTS.md` are optional shortcuts. Keep the
checkpoint consistent with the rest of the current state; no separate handoff
log or update after every exchange is required. Do not automatically commit,
push, stash, or discard changes. Local-only files and unpushed commits
must be made accessible deliberately when switching checkouts or machines.

At every resumption, the incoming assistant reads the current state and verifies
any checkpoint against current files and Git when available, without requiring
a special user prompt. After a sudden interruption, reconstruct progress from
the repository; the previous assistant may not have had time to save an update.
An old handoff is not evidence that a branch, file, or test
result is still current. Resolve discrepancies affecting the task and follow
the normal approval rules for implementation.

## Issues

A assistant-ready Issue should include:

- context;
- objective;
- scope and non-goals;
- acceptance criteria;
- expected tests;
- affected areas;
- documentation expectations;
- risks and open questions.

The Issue is the mission brief. The assistant should not need hidden chat context to
understand the goal.

## Pull Requests

A Pull Request is the durable handoff record.

It should explain:

- what changed;
- why it changed;
- how it was tested;
- which documentation changed;
- what risks remain;
- which Issue it closes.

Do not invent tests. If a check was not run, say so explicitly.

## Documentation Update Rules

Update `docs/ai-context/` when the work changes project status, decisions,
roadmap, known issues, or AI-assisted handoff history.

During authorized work, proactively update `CURRENT_STATE.md` at meaningful
milestones: completed work, a relevant verification result that changes the
known status, or a changed blocker or next action. Before the final response,
check whether it still reflects the actual state and update it when needed,
including for partial or blocked work. This routine factual maintenance needs
no separate reminder or approval within the authorized task.

Update the relevant sections, including an existing `Session handoff`, so they
agree. Clear obsolete next actions and mark completed work accurately. Preserve
unrelated content and link to decisions instead of duplicating their rationale.
Do not rewrite unchanged state or turn it into a transcript. Date actual checks
without implying that unverified parts of the project were retested.

Respect explicit read-only requests and write restrictions. If an update cannot
be saved, report that limitation and provide the pending state in the response.
These instructions guide assistant behavior; they are not a background process
and cannot guarantee a final write after an abrupt interruption.

Refresh `docs/wiki/` when generated technical descriptions are stale after
code, build, test, dependency, configuration, API, or module changes.

Update `docs/ai-governance/` only when the framework workflow itself changes.

## Installation and Validation

Install from the framework repository:

```powershell
.\scripts\install.ps1 -TargetPath C:\path\to\target-repo -DryRun
.\scripts\install.ps1 -TargetPath C:\path\to\target-repo
```

Install optional wiki starter files when a project is ready to maintain them:

```powershell
.\scripts\install.ps1 -TargetPath C:\path\to\target-repo -IncludeWiki
```

Validate a target repository:

```powershell
.\scripts\validate-target.ps1 -TargetPath C:\path\to\target-repo
```

Run a fuller validation profile when optional project memory matters:

```powershell
.\scripts\validate-target.ps1 -TargetPath C:\path\to\target-repo -Profile full
```

## File Ownership

The framework manifest at `.ai/framework.json` defines file ownership and
install behavior.

Ownership classes:

- `Framework`: managed by this framework and updated by installer.
- `Project`: created if missing, then owned by the target project.
- `Generated`: created or refreshed on demand from repository analysis.

Install modes:

- `managed`: identical content is unchanged; different existing content is a
  conflict unless explicitly forced. Custom instructions are not auto-merged.
- `create-if-missing`: create a starter file only if the target path is absent.

## Finishing a Mission

An AI-assisted mission is complete only when:

- the Issue objective is covered;
- the branch is focused;
- build, lint, typecheck, and test status is known;
- documentation is updated when required;
- `CURRENT_STATE.md` reflects meaningful progress, checks, and remaining work;
- decisions are recorded when required;
- known risks and follow-up work are captured;
- the Pull Request explains the work clearly.

## Final Principle

The goal is not to make assistants remember everything.

The goal is to make assistants able to reconstruct what they need from the
repository.

# AGENTS.md

## Critical Project Rules

Read `docs/ai-context/PROJECT_RULES.md` before any implementation, test, script,
integration, or framework update. These project rules apply to every assistant,
developer, subagent, and tool working on this repository.

**This app must never, never ever write anything to Odoo. It may only read.**
Do not create, update, delete, import, synchronize back, or trigger actions that
change Odoo data. This includes scripts, tests, troubleshooting, and indirect
writes through other integrations. Never weaken or bypass the read-only RPC
guard as part of ordinary development.

If a write ever becomes necessary, stop and obtain explicit, informed approval
from the user for that specific operation, target environment, and affected
records before implementing, enabling, or executing it. General approval to
develop, fix, test, or deploy this app is not approval to write to Odoo. No Odoo
write is currently approved; there is no runtime approval flag or bypass.

The user has no administrator rights on their Windows PC. Prefer standard-user
commands and per-user tools. Any machine-wide installation, service change, or
other elevated step requires help from their IT administrator.

Keep these rules and the project-owned policy during framework updates; upstream
templates do not contain them. Review and merge managed-file conflicts instead
of blindly replacing this file with `-Force`.

## Mandatory Startup Instructions

Before making code changes, read:

- `docs/ai-governance/AI_DEVELOPMENT_GUIDE.md`

If they exist, also read:

- `docs/ai-governance/PROMPTS.md`
- `docs/ai-context/CURRENT_STATE.md`
- `docs/ai-context/DECISIONS.md`
- `docs/ai-context/KNOWN_ISSUES.md`
- `docs/ai-context/ROADMAP.md`

Use `docs/ai-governance/PROMPTS.md` when the task matches an existing reusable
prompt or workflow pattern.

If the task depends on repository structure, APIs, build behavior, tests,
configuration, or data flow, read the relevant pages under:

- `docs/wiki/`

Before creating or refreshing pages under `docs/wiki/`, read:

- `docs/ai-governance/WIKI_REFRESH_GUIDE.md`

## Context Initialization Gate

For tool-specific startup, see `docs/ai-governance/ASSISTANT_SETUP.md`.
Hooks are optional; these shared instructions also apply without hooks.
If Git, shell, tests, or build tools are unavailable, report checks as not
verified and resolve any task-blocking limitation before proceeding.

Before starting development work, dependency installation, Docker startup, test
execution, or build execution, verify that the AI workflow context exists.

Required framework files:

- `AGENTS.md`
- `.ai/framework.json`
- `docs/ai-governance/AI_DEVELOPMENT_GUIDE.md`

Required project memory files:

- `docs/ai-context/PROJECT_RULES.md` (mandatory project safety policy)
- `docs/ai-context/CURRENT_STATE.md`
- `docs/ai-context/DECISIONS.md`
- `docs/ai-context/KNOWN_ISSUES.md`

If one or more required files are missing:

1. Stop after the minimal repository inspection needed to identify the missing
   files.
2. Tell the user exactly which files are missing.
3. Ask whether to initialize the missing context before continuing.
4. Wait for explicit approval.
5. Do not implement code, run Docker, install dependencies, or run tests before
   this is resolved, unless the user explicitly says to skip the initialization
   gate for the current task.

When initialization is approved, create concise, factual first versions of the
missing project memory files. Prefer framework templates when available, but
replace placeholders with facts observed in the target repository.

## Ownership Rules

- `docs/ai-governance/` is framework-managed.
- `docs/ai-context/` is project-owned operational memory.
- `docs/wiki/` is generated technical knowledge inferred from the repository.

Apply this rule consistently:

- If information can be inferred from repository files, put it in `docs/wiki/`.
- If information represents human intent, decisions, priorities, project
  status, or operational knowledge, put it in `docs/ai-context/`.

## Language Policy

Unless the user explicitly requests otherwise:

- Use English for commit messages, Pull Request titles and descriptions, GitHub
  technical explanations, and all repository documentation, including files
  under `docs/`.
- Use the language used by the user for chat responses.

The user may override this policy for a specific task or artifact.

## Working Rules

Before coding:

1. Inspect the current Git branch.
2. Compare the branch with `main` when available.
3. Read the related Issue or task description.
4. Summarize your understanding.
5. Identify risks and ambiguities.
6. Propose a step-by-step plan.
7. Wait for approval before modifying files.

## Repository Setup

If the broader AI workflow structure is missing, propose installing or creating:

- `.ai/framework.json`
- `.github/ISSUE_TEMPLATE/codex-task.md`
- `.github/pull_request_template.md`
- `docs/ai-governance/AI_DEVELOPMENT_GUIDE.md`
- `docs/ai-context/CURRENT_STATE.md`
- `docs/ai-context/DECISIONS.md`
- `docs/ai-context/KNOWN_ISSUES.md`

Optional files:

- `docs/ai-governance/PROMPTS.md`
- `docs/ai-governance/WIKI_REFRESH_GUIDE.md`
- `docs/ai-context/ROADMAP.md`
- `docs/ai-context/CHANGELOG_AI.md`
- `docs/wiki/`

Do not create or modify this broader structure without approval.

## Keep Project State Current

During authorized work, update `docs/ai-context/CURRENT_STATE.md` without a
separate reminder when a meaningful milestone is completed, a relevant check
changes the known status, or a blocker or next action changes. Check it before
the final response and update it if needed, including when work is incomplete.
Keep relevant sections and any existing `Session handoff` consistent; mark
completed work as completed and remove obsolete next actions. Preserve unrelated
project content. Avoid rewriting unchanged state or logging every exchange.

These factual updates are part of authorized work, not a separate approval
step. Respect explicit read-only requests and access restrictions; if unable
to save an update, provide the pending state in the response. Record observed
facts and unavailable checks honestly. Do not commit, push, or stash automatically.

An explicit handoff request is optional, mainly useful when switching during
unfinished work. At every resumption, read the current state and verify it
against actual files and Git when available, even without a handoff prompt.
A sudden interruption may leave stale state; reconstruct progress rather than
requiring the user to return to the previous assistant.

## Definition of Done

A task is complete only when:

- the Issue objective is covered;
- tests are added or updated when needed;
- build, lint, typecheck, and test status is known;
- documentation is updated if required;
- `CURRENT_STATE.md` reflects meaningful progress, checks, and remaining work;
- risks and limitations are documented;
- the Pull Request contains a clear summary.

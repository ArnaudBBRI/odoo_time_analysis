# Prompts

Reusable prompts for consistent assistant work.

These prompts are framework-managed. Project-specific prompts can be added to a
separate project-owned file if a repository needs them.

## New Session

```text
Read AGENTS.md, docs/ai-governance/AI_DEVELOPMENT_GUIDE.md, and the required
project memory files under docs/ai-context/.

If docs/wiki/ exists, read the pages relevant to this task.

Inspect the current Git branch and compare it with main when available.
Report unavailable Git or execution checks as not verified.
When resuming, verify CURRENT_STATE.md and any Session handoff against actual
files and Git when available, even without a separate handoff request.
Summarize your understanding, identify risks and ambiguities, and propose a
step-by-step plan.

Do not modify files until I approve the plan.
Clearly separate observed facts from assumptions.
```

## Prepare Session Handoff

Optional shortcut for switching during unfinished work. Normal state updates
should make this unnecessary after a completed task.

```text
Prepare a handoff for another assistant. Inspect the actual files and, when
available, Git status, branch, last commit, and unpublished changes.
Update docs/ai-context/CURRENT_STATE.md with a concise Session handoff; add that
section if absent. Keep relevant state sections consistent and preserve
unrelated project memory.
Record the date/time/timezone, objective, completed work, branch and last
verified commit, local-only changes, checks and results, next action, and
blockers or relevant decision references. Mark unavailable checks explicitly.
Do not claim tests were run unless there is evidence. Explain which files or
commits would not reach a different checkout. Do not commit, push, stash, or
discard changes automatically. Keep this concise; do not copy the chat log.
```

## Resume Session Handoff

Optional shortcut; normal session startup already reads and verifies the state.

```text
Read AGENTS.md and its shared governance and project-memory references.
Read the Session handoff in docs/ai-context/CURRENT_STATE.md. Check its claims
against the current files and, where available, Git branch, commit, and status.
Identify differences, local-only work, and checks you cannot perform. Treat
the handoff as a checkpoint, not proof of the current state. If it is absent,
reconstruct what you can from the repository and ask only for missing intent.
Summarize the objective, completed work, and next action. Resolve discrepancies
that affect the task before implementation; never reset or discard work to
match a checkpoint. Follow the shared approval rules before modifying code.
```

## Analyze Existing Repository

```text
Analyze the repository without modifying code.

Identify:
- source layout;
- main modules;
- build and test commands;
- configuration model;
- public APIs;
- domain concepts visible in code;
- important data flows;
- external dependencies;
- fragile areas.

Separate information that can be inferred from the repository from information
that requires human intent or decision history.

Propose updates for docs/wiki/ and docs/ai-context/ separately.
```

## Documentation Check

```text
Review the current changes and decide whether documentation needs updates.

Check:
- docs/ai-context/CURRENT_STATE.md;
- docs/ai-context/DECISIONS.md;
- docs/ai-context/ROADMAP.md;
- docs/ai-context/KNOWN_ISSUES.md;
- docs/ai-context/CHANGELOG_AI.md;
- docs/wiki/ if generated technical knowledge is present;
- README.md.

For each file, state whether an update is needed and why.
Do not modify documentation until I approve.
```

## Refresh Technical Wiki

```text
Refresh docs/wiki/ from repository facts only.

Read docs/ai-governance/WIKI_REFRESH_GUIDE.md first.

Do not include future plans, preferences, undocumented assumptions, or desired
architecture in docs/wiki/.

If you discover human decisions, risks, or roadmap items, propose updates under
docs/ai-context/ instead.
```

## Prepare Pull Request

```text
Prepare the Pull Request for this branch.

Review the diff against main.

Write a PR description including:
- summary;
- motivation;
- key changes;
- tests performed;
- documentation updates;
- risks and limitations;
- follow-up work;
- related Issue.

Do not invent completed tests. If a test was not run, say so explicitly.
```

## Finish Mission

```text
Verify that the Issue objectives are covered, tests and documentation are
complete, no unrelated changes remain, and the branch is ready for Pull
Request.

Check docs/ai-context/CURRENT_STATE.md and update it if meaningful progress,
checks, blockers, or remaining work are missing or stale. Keep any Session
handoff consistent and clear obsolete next actions. This is part of the
authorized task; respect explicit read-only requests and report unsaved updates.

Produce:
- final summary;
- tests performed;
- risks and limitations;
- follow-up Issues recommended;
- PR description draft.
```

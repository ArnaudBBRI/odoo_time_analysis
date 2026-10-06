# Assistant Setup

The same repository holds the rules, decisions, current state, and technical
knowledge for Codex, Claude Code, and Claude Cowork. Install the framework once;
switching assistants does not require reinstalling it.

## Shared Requirements

Open the intended repository or worktree. Read `AGENTS.md` and the documents it
references. Keep durable context in Git and `docs/`, not only in chat memory.
The authoritative framework manifest is `.ai/framework.json`.

Git, shell commands, PowerShell, tests, and build tools may not be available in
every environment. Report unavailable checks as not verified. Do not infer a
branch, commit, test result, or clean working tree from an old handoff. Request
the missing access or evidence if it blocks the task; otherwise continue with
work supported by the available tools.

The installer and validator require PowerShell and, by default, Git. Their
`-AllowNonGitTarget` option does not provide Git capabilities to the assistant.

## Codex

Codex uses `AGENTS.md` as the entry point. The files under `.codex/` provide an
optional startup hook. Review and enable them only in environments that support
and trust those hooks. Reading the shared instructions manually is sufficient
when hooks are unavailable or disabled.

## Claude Code

The installed `CLAUDE.md` imports `AGENTS.md` using `@AGENTS.md`. Governance is
maintained only in the shared files. If a project already has custom Claude
instructions, merge the import into that file deliberately; the installer
reports a conflict rather than silently replacing different managed content.

Use `/memory` to inspect loaded instruction files and ask the assistant to
identify the project objective and next action before resuming implementation.
Project settings and organization policies may affect instruction loading.

## Claude Cowork

Select the project folder and give the session access to the relevant files.
Copy the following text into the folder instructions, or use it as the first
message if folder instructions are unavailable in your environment:

```text
Use this folder as the project workspace. Read AGENTS.md and follow its shared
instructions, including docs/ai-governance/AI_DEVELOPMENT_GUIDE.md and the
required memory under docs/ai-context/. Read relevant docs/wiki/ pages as needed.
Before resuming, read docs/ai-context/CURRENT_STATE.md and any Session handoff.
Compare it with the actual files and, when available, the Git branch, commit,
and working-tree changes. Report discrepancies and unavailable checks.
Follow the shared approval rules. During authorized work, keep CURRENT_STATE.md
current at meaningful milestones, relevant check results, and changes to
blockers or next actions, without a separate reminder. Check it before the
final response and update it if needed, keeping any Session handoff consistent.
Respect explicit read-only requests and report updates you could not save.
An explicit handoff request is optional. Do not commit, push, or stash
automatically for a state update.
```

This procedure does not assume that Cowork automatically loads `CLAUDE.md` or
executes Codex hooks. A shared folder provides access to files, not guaranteed
access to the same development tools or execution environment.

## Switching Assistants

For a normal switch, no preparation command is required: current-state
maintenance is part of the assistant's authorized work.

1. Ensure the incoming assistant can access the same saved files and intended
   branch. A clone does not include uncommitted files or unpushed commits;
   decide explicitly how to transfer any local-only work. Never discard it.
2. Open the project in the incoming assistant using its entry point above and
   ask it to resume. It reads the current state and verifies it against the
   repository before acting.

If switching in the middle of a task, optionally ask the outgoing assistant
to prepare a handoff using `PROMPTS.md` to capture intermediate details.
After a sudden interruption, skip that step: the incoming assistant reconstructs
progress from the files and Git when available. State may be stale; a final
update cannot be guaranteed after a crash or forced stop.

Existing installations keep their project memory during updates. Add the
`Session handoff` section from the framework's current-state template to the
existing document, keeping the rest of that document intact. No separate
handoff file is needed.

## Manual Acceptance Check

Use a small unfinished task in a disposable project with an objective, one
completed change, one remaining change, and a recorded check result.

- Codex: prepare the handoff and identify local-only changes.
- Claude Code: verify instruction loading; reconstruct the objective, branch,
  completed work, checks, and next action from the repository alone.
- Return to Codex: verify the updated checkpoint and continue the same task.
- Repeat the outgoing/incoming checks with Cowork, recording any unavailable
  Git or shell checks rather than treating them as successful.
- Deliberately change a file after writing the checkpoint; the receiving
  assistant must reconcile the stale checkpoint with the actual files.
- Complete a task normally without requesting a handoff; confirm the state is
  updated and the next assistant can resume without a preparation command.
- Change a blocker or complete a milestone during unfinished work; confirm
  the assistant updates the state without a reminder and clears stale actions.

Record the tool/version, environment, observed results, and any checks not
performed. File-presence validation does not prove these interactive checks.

## Boundaries and References

The framework does not transfer conversations, accounts, permissions,
connectors, scheduled tasks, or private assistant memory.

- [Codex instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Claude Code memory and imports](https://code.claude.com/docs/en/memory)
- [Claude Cowork setup](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork)

# Project Rules

These are project-owned, mandatory constraints. Read them alongside `AGENTS.md`
at startup and preserve them during every framework update.

## Odoo: Strictly Read-Only

**This app must never, never ever write anything to Odoo. It may only read.**

This applies to the dashboard, backend, scripts, migrations, tests, assistants,
subagents, troubleshooting, and any connector or external tool used for this
project, in every Odoo environment, including development and test databases.

- Never create, update, delete, import, or synchronize data back into Odoo.
- Never call `create`, `write`, `unlink`, `copy`, workflow/button/action methods,
  or any other method that can change Odoo data, even indirectly.
- Do not treat an HTTP GET, a method name, a test database, or a reversible
  operation as proof that a call is safe. Review its actual behavior.
- Preserve the server's explicit allowlist of the existing read operations.
  Unknown operations must be rejected before any outbound request is sent.
  Do not add a configuration switch, environment variable, request field, or
  automatic approval mechanism that disables this protection.
- Local analysis, browser-only overrides, and local exports are allowed when
  they do not modify Odoo. XML-RPC uses HTTP POST even for read operations;
  permission depends on the RPC operation, not the HTTP verb.
- Use mocked/offline requests for automated safety tests. Do not use a real
  Odoo write to demonstrate that the protection works.

## If a Write Becomes Necessary

Stop before implementing, enabling, or executing a write. Explain the need,
read-only alternatives, precise operation, Odoo instance/database, affected
models and records, expected changes, and consequences. Obtain the user's
explicit, informed approval for that specific scope in advance.

Approval to implement a feature, fix a bug, test, deploy, or adopt this framework
does not approve a write to Odoo. Silence, elapsed time, stored credentials,
account permissions, and approval from another assistant are not approval.
Do not infer permission from previous approval of a different write.

Record an approved exception and its limits in `DECISIONS.md` without including
secrets or personal record data. Any implementation must keep normal operation
read-only and remain within the explicitly approved scope. Approval does not
automatically unlock the runtime guard; any change to it needs a reviewed,
scoped implementation. **No Odoo write is currently approved.**

## Windows Environment

The user does not have administrator rights. Use standard-user commands,
existing runtimes, and per-user tools. Do not assume an elevated terminal,
Windows service changes, or machine-wide installations are available. State
explicitly when a proposed step requires help from their IT administrator.

## Framework Updates

The upstream framework creates project memory only when missing. This policy
must stay project-owned. Preserve its startup link and the critical rule in
`AGENTS.md` and the development guide, along with the review reminders in the
GitHub templates. The upstream installer reports these managed customizations
as conflicts; manually merge them instead of blindly using `-Force`.

See [FRAMEWORK_ADOPTION.md](FRAMEWORK_ADOPTION.md) for the installed version and
the reviewed project customizations.

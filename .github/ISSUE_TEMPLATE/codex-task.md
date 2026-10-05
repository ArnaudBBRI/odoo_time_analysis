---
name: AI-assisted task
about: Describe a focused development mission for an assistant
title: ""
labels: ""
assignees: ""
---

## Context

Describe the current situation, relevant background, and why this task matters.

## Objective

State the concrete outcome expected from this task.

## Scope

List what is included.

## Non-goals

List what should not be changed.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Expected Tests

List the tests, checks, or manual verification expected.

## Affected Areas

List likely files, modules, services, workflows, commands, or documentation.

## Documentation

State whether this task may require updates to:

- [ ] `docs/ai-context/CURRENT_STATE.md`
- [ ] `docs/ai-context/DECISIONS.md`
- [ ] `docs/ai-context/ROADMAP.md`
- [ ] `docs/ai-context/KNOWN_ISSUES.md`
- [ ] `docs/ai-context/CHANGELOG_AI.md`
- [ ] `docs/wiki/`
- [ ] `README.md`
- [ ] Framework governance files under `docs/ai-governance/`

## Risks and Constraints

**Mandatory: this app must never, never ever write anything to Odoo; it may only
read.** Follow `docs/ai-context/PROJECT_RULES.md`. Any proposed write requires
advance, explicit user approval for the specific operation, environment, and
affected records. General task approval is insufficient; no write is currently
approved. Preserve the read-only RPC guard and use offline safety tests.

Document technical risks, product constraints, compatibility requirements, or
known fragile areas.

## Open Questions

- Question 1

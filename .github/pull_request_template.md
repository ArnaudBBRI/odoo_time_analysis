## Summary

Briefly describe the change.

## Motivation

Explain why this change is needed.

## Changes

- Change 1
- Change 2
- Change 3

## Tests

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] Build
- [ ] Lint/typecheck
- [ ] Not run; explain why:

## Documentation

- [ ] `docs/ai-context/CURRENT_STATE.md` updated if needed
- [ ] `docs/ai-context/DECISIONS.md` updated if needed
- [ ] `docs/ai-context/ROADMAP.md` updated if needed
- [ ] `docs/ai-context/KNOWN_ISSUES.md` updated if needed
- [ ] `docs/ai-context/CHANGELOG_AI.md` updated if needed
- [ ] `docs/wiki/` refreshed if generated technical knowledge changed
- [ ] `README.md` updated if needed
- [ ] Framework governance updated if workflow rules changed

## Risks

- [ ] Odoo remains strictly read-only: no mutation, indirect write, or guard bypass
- [ ] Offline Odoo safety tests passed when connector behavior changed
- [ ] Any proposed Odoo write has separate, explicit advance user approval for
      its exact scope, recorded without secrets in `docs/ai-context/DECISIONS.md`
      (otherwise no write is permitted)

Follow `docs/ai-context/PROJECT_RULES.md`; ordinary implementation or PR approval
does not authorize writing to Odoo.

Describe known risks or limitations.

## Follow-up

List follow-up Issues if needed.

Closes #

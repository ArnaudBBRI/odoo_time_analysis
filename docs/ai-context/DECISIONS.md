# Decisions

## 2026-10-05: DiCo project/programme/unit steering

- The user approved the project/programme/unit macro and meta plan, selecting business programmes (not impact pathways), DiCo first and live reads without persisted history. A connected-project-leader shortcut was requested during implementation.
- Keep the existing time/Lead Unit flow and add a separate confirmed DiCo domain. Reuse session credentials and permissions; never use a shared integration identity or write to Odoo.
- Store business programme membership in non-secret local configuration, initially empty. Multiple memberships are excluded from programme sums and preserved once at unit level.
- Share pure calculations between server and browser; keep RPC orchestration server-only. Missing data remain null and unavailable sections do not replace authoritative project totals.
- Use project effective_hours for cumulative actuals. Show visible timesheets separately; Progress and task-aware hours must pass reconciliation before people/WP conclusions are actionable.
- Keep annual/convention periods and currencies separate. Ambiguous multiple parent budgets for the same project/period, unavailable controls and nonzero annual adjustments are excluded from verified financial aggregation.
- Default project leader relation is user_id, validated as a res.users relation; it remains configurable for the actual business schema. Match exact connected UID, not name.
- The supplied historical reliability date 2026-01-01 is unconfirmed for this dashboard and is not applied as a cutoff.
- Real Odoo schema/data verification is pending. No issue, commit, push or PR was requested for this implementation.

## 2026-10-05: Authenticate the dashboard using existing Odoo accounts

- Context: the user requested an email/password welcome page and selected existing Odoo accounts rather than separate dashboard accounts; implementation plan was approved with "go".
- Decision: authenticate through the existing XML-RPC connector using the server-configured instance and database. Bind subsequent connector requests to that user's credentials and Odoo permissions.
- Rationale: reuse the existing account system and avoid maintaining a second user/password store.
- Session design: random HttpOnly/SameSite cookie, fixed eight-hour default expiry, server-memory credential storage, logout and session rotation. Restart clears all sessions; Secure cookies are configurable for external TLS termination.
- Consequences: password-based XML-RPC must be accepted by the actual instance. SSO/MFA and shared sessions across replicas are outside this implementation. The password remains in memory while the session is retained, because subsequent XML-RPC calls require it.
- Visual choice: the user requested the Buildwise website appearance; source styles and official logo are recorded in [Visual Reference](../wiki/BRANDING.md). Proprietary font files are not bundled.
- Related Issue or PR: none supplied or created.

## 2026-10-05: Select projects by the connected person's Lead Unit

- Context: the user clarified that the project field is Lead Unit and it must be that of the connected person; there must be no ownership-field or team selector.
- Decision: fix the project relation to lead_unit_id (confirmed from the live dashboard option), resolve the account/employee by exact UID/user_id, and derive one Lead Unit through direct unit links or the department hierarchy.
- Scope: all accessible projects owned by that unit, including archived/zero-hour projects; actual/planned hours aggregate all contributors. Client overrides cannot select another unit.
- Consequences: missing/multiple units return an explicit error before project querying. No person-name or project-manager fallback is allowed. Real unit membership resolution remains a deployment verification item.

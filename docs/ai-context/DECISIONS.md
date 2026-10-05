# Decisions

## 2026-10-05: Authenticate the dashboard using existing Odoo accounts

- Context: the user requested an email/password welcome page and selected existing Odoo accounts rather than separate dashboard accounts; implementation plan was approved with "go".
- Decision: authenticate through the existing XML-RPC connector using the server-configured instance and database. Bind subsequent connector requests to that user's credentials and Odoo permissions.
- Rationale: reuse the existing account system and avoid maintaining a second user/password store.
- Session design: random HttpOnly/SameSite cookie, fixed eight-hour default expiry, server-memory credential storage, logout and session rotation. Restart clears all sessions; Secure cookies are configurable for external TLS termination.
- Consequences: password-based XML-RPC must be accepted by the actual instance. SSO/MFA and shared sessions across replicas are outside this implementation. The password remains in memory while the session is retained, because subsequent XML-RPC calls require it.
- Visual choice: the user requested the Buildwise website appearance; source styles and official logo are recorded in [Visual Reference](../wiki/BRANDING.md). Proprietary font files are not bundled.
- Related Issue or PR: none supplied or created.

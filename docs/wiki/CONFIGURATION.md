# Configuration

## Odoo instance

Copy [config.example.json](../../config.example.json) to private config.local.json if the defaults need changing. The file must contain a JSON object.

- odooUrl (alias url): HTTP/HTTPS base URL, default https://odoo.buildwise.be/. A trailing /web is normalized to the origin.
- database: Odoo database, default buildwiseprd.

Manual login accepts email/password; the client cannot select another instance.
The optional **Use config file** action reads `username` and `apiKey` (alias
`api_key`) from this private file and signs in as that configured account.
Both fields are required for this action; empty example values keep it
unconfigured. The token is retained exactly, including surrounding whitespace.
The session stores the chosen URL/database and authenticated credentials.
Config values cannot replace an established session identity or prefill another
employee's data.

Config login requires a loopback socket peer (`127.0.0.1`, `::1`, or
`::ffff:127.0.0.1`) and a loopback Host (`localhost`, `127.0.0.1`, or `[::1]`).
Forwarded headers and browser-supplied credentials/targets are ignored. Use
manual login for remote/proxy access; a proxy must preserve its public Host
rather than present itself as a direct local caller. See [API](API.md) for
the missing/invalid-config and rejected-token responses.

Authenticated queries accept employeeName or projectCode (aliases projectName/projectQuery). Request URL, database, username and apiKey values are ignored in favor of the session. /api/config returns the session's public connector fields, authenticated: true and hasApiKey: false, never its password.

## DiCo steering

The optional `pilotage` object controls a confirmed `unitDomain`, the `projectLeaderField` user relation and a non-secret programme/project-ID reference. Defaults are disabled with an empty reference. See [steering configuration](PILOTAGE.md#configuration-and-activation) for validation and an illustrative example. The connected-person Lead Unit flow is separate.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| HOST | 127.0.0.1 | HTTP listener; Docker/Compose uses 0.0.0.0. |
| PORT | 8765 | HTTP port. |
| SESSION_TTL_SECONDS | 28800 | Fixed positive session lifetime; invalid values prevent startup. |
| SESSION_COOKIE_SECURE | false | Set to true for HTTPS deployment; adds Secure and checks HTTPS POST origins. |

TLS is handled externally. A reverse proxy must preserve the public Host header for origin checks. Forwarded headers are not trusted for client-IP rate limiting; users behind a proxy may share its login counter.

Sessions and login counters live in one Node process. Logout, replacement login and expiry invalidate sessions; process restart clears them. Expired entries are pruned on incoming requests. Session credentials are held in server memory for XML-RPC calls. Manual passwords are not persisted to disk/browser storage; config tokens remain in the private file and never reach browser responses or storage. Deployment across replicas needs a separate shared-session design.

The server accepts at most 1,000 live sessions and stores at most 10,000 active login-counter addresses. Ten attempts per address in 15 minutes trigger 429 with Retry-After; successful login clears the address's counter. JSON bodies are limited to 64 KiB; each XML-RPC fetch has a 15-second abort timer.

## Files and Docker

config.local.json is excluded by .gitignore and .dockerignore. The optional Compose volume mounts it read-only at /app/config.local.json. Rebuild old images to apply the new build-context exclusion; existing images are unaffected.

Config is plaintext; these exclusions do not encrypt its token or protect it
from local file access. Keep it private. Docker port forwarding does not
necessarily present a loopback peer to the container, so configured login can
be unavailable there; manual sign-in remains available.

Only login.html, index.html and assets/buildwise-logo.svg are served by the application routes. Repository sources, documentation, workbooks and config files are not exposed, even after login. Compose still publishes port 8765 without a loopback-only binding.

## Refresh

- Last refreshed: 2026-10-08
- Source basis: server.js, login.html, config.example.json, Docker/config files and tests/auth.test.js.
- Limitations: real Buildwise credentials, proxy/TLS deployment and Docker runtime were not verified.

The portfolio ownership field is fixed to project.project.lead_unit_id. User-unit resolution is server-side and does not use projectOwnerField or client-selected team values.

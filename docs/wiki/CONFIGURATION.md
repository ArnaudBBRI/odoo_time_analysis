# Configuration

## Files and precedence

Copy [config.example.json](../../config.example.json) to config.local.json for private server-side settings. The latter must contain a JSON object and is read when connector settings are requested. Malformed configuration produces an error rather than silently falling back.

For each field, the first nonblank request value wins over local configuration and built-in defaults.

| Setting | Accepted values and defaults |
| --- | --- |
| Odoo URL | Request url or odooUrl; config odooUrl or url; default https://odoo.buildwise.be/. Only http/https are accepted; a trailing /web is normalized to the origin. |
| Database | database; default buildwiseprd. |
| Username | username; no default. |
| API key | Request apiKey; config apiKey or api_key; no default. |
| Employee | employeeName; no default. |
| Project reference | Request projectCode, projectName or projectQuery; config projectId, projectID or projectCode. Numeric characters are extracted when present. |

/api/config returns non-secret fields and hasApiKey. Static requests for config.local.json are blocked, and .gitignore excludes that file.

## Environment

| Variable | Local default | Container value |
| --- | --- | --- |
| HOST | 127.0.0.1 | 0.0.0.0 |
| PORT | 8765 | 8765 |

The JSON body limit is 64 KiB and each XML-RPC fetch has a 15-second abort timer. These values are constants, not environment settings.

## Docker configuration boundary

The optional Compose volume mounts ./config.local.json at /app/config.local.json read-only. However, .dockerignore does not exclude config.local.json, and Dockerfile uses COPY . .. If the file exists during a build, it can be copied into the image even when a bind mount is later enabled. Keep private configuration outside the build context when using the current Docker setup.

The Compose port mapping publishes 8765 without a loopback-only host binding. The server has no dashboard authentication, and its static handler can serve repository files other than the blocked private configuration. Account for this when choosing the host or container network exposure.

## Refresh

- Last refreshed: 2026-10-05
- Source basis: server.js settings and static handler, config.example.json, .gitignore, .dockerignore, Dockerfile and docker-compose.yml.
- Limitations: private configuration was not read; network exposure was not tested.

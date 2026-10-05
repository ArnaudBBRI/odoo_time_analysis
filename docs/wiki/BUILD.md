# Build and Run

No compilation or dependency-installation step is defined.

## Local execution

Use Node.js 22 to match the container runtime:

```powershell
node server.js
```

Open http://127.0.0.1:8765/ and sign in with your Odoo account. Stop with Ctrl+C. Override PORT or HOST through environment variables; the default host is loopback.

The server gates /dashboard and /index.html behind login. Directly opening a local HTML copy is outside this authentication boundary; the top-level workbook upload controls are currently commented out.

## Docker

```powershell
docker compose up --build
docker compose up --build -d
docker compose logs -f
docker compose down
```

The image uses node:22-alpine, sets /app as its working directory, copies the build context, and runs node server.js. Compose publishes host port 8765 to container port 8765, sets HOST=0.0.0.0, and uses restart: unless-stopped. Change the host side of the ports mapping if host port 8765 is occupied.

The optional config.local.json bind mount is commented out and read-only when enabled. The file is excluded from new images by .dockerignore. See [Configuration](CONFIGURATION.md) before building with private configuration present.

Run `node --test tests/auth.test.js` for the authentication integration suite. Configure `SESSION_COOKIE_SECURE=true` for HTTPS deployments and optionally `SESSION_TTL_SECONDS`; see [Configuration](CONFIGURATION.md).

## CI

No CI workflow, package scripts, build pipeline, lint command or typecheck command is defined in the inspected repository. The .github directory contains Issue and PR templates.

## Refresh

- Last refreshed: 2026-10-05
- Source basis: Dockerfile, docker-compose.yml, README.md, server.js and .github inventory.
- Limitations: Docker image build and container execution were not performed.

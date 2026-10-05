# Build

There is no application build step or dependency installation command.
`index.html` contains the browser application; `server.js` runs directly with
Node.js. No package build/lint/typecheck scripts, Docker setup, or CI workflow
files were found.

## Run

For XLSX-only use, open [index.html](../../index.html) in a compatible browser.
For the connector, use a standard-user terminal in the repository:

```powershell
node server.js
```

Open `http://127.0.0.1:8765/`, keep the terminal open, and stop with `Ctrl+C`.
To select another port:

```powershell
$env:PORT = 8766
node server.js
```

The server binds only to `127.0.0.1`. Startup serves local files; Odoo requests
are triggered by dashboard connector actions.

## Checks

Backend syntax can be checked without starting the server:

```powershell
node --check server.js
```

See [Testing](TESTING.md) for offline safety checks. Framework validation tools
belong to the upstream guide repository; installation details are recorded in
[FRAMEWORK_ADOPTION.md](../ai-context/FRAMEWORK_ADOPTION.md).

## Refresh

- Last refreshed: 2026-10-05.
- Source basis: `README.md`, server startup/environment handling in `server.js`,
  and repository build/package/CI inventory.
- Limitations: commands describe the available workflow; actual check results
  belong in `CURRENT_STATE.md`. No deployment or packaging setup was found.

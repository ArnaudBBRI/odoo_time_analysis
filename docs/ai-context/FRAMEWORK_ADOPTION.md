# Framework Adoption

## Installed Source

- Upstream: [buildwise-be/BW_CODEX_DEV_GUIDE](https://github.com/buildwise-be/BW_CODEX_DEV_GUIDE).
- Framework version: 3.0.0; manifest schema version: 2.
- Commit: [`d968ed2fb82171e9337d6fbd90f23939efdaaf90`](https://github.com/buildwise-be/BW_CODEX_DEV_GUIDE/tree/d968ed2fb82171e9337d6fbd90f23939efdaaf90), dated 2026-10-02.
- Adopted: 2026-10-05 (Europe/Brussels).
- Installation: upstream `scripts/install.ps1` dry run, then installation with
  `-IncludeWiki -AllowDirtyTarget`. The dirty-target option preserved existing
  uncommitted dashboard work; no app files were overwritten by the installer.
- License: upstream MIT notice retained in
  [BW_FRAMEWORK_LICENSE.txt](../ai-governance/BW_FRAMEWORK_LICENSE.txt). It applies
  to the copied framework material and does not set a license for the app.

## Project Customizations

The user's Odoo read-only rule is authoritative. No Odoo write is approved.
See [PROJECT_RULES.md](PROJECT_RULES.md) and [decision D001](DECISIONS.md).

The following framework-managed files deliberately differ from upstream:

| File | Local addition |
| --- | --- |
| `AGENTS.md` | Critical Odoo/Windows constraints, policy startup link, required policy file |
| `.ai/framework.json` | Required project-owned policy entry |
| `.codex/hooks/session_start.ps1` | Required policy presence and critical safety reminder |
| `docs/ai-governance/AI_DEVELOPMENT_GUIDE.md` | Read-only constraint and required policy file |
| `.github/ISSUE_TEMPLATE/codex-task.md` | Odoo safety constraints |
| `.github/pull_request_template.md` | Read-only review and explicit-approval reminders |

The manifest's additional policy entry uses `owner: Project`,
`installMode: create-if-missing`, and `required: true`. Its source points to the
project-local policy; it is an extension to the installed target manifest, not
an upstream template. The upstream validator reads the target manifest and
therefore checks that this policy exists. The upstream installer reads its own
source manifest; it does not install or merge this extension automatically.

`PROJECT_RULES.md` and this adoption record are project-owned. The manifest
extension and modified startup/template files must be deliberately retained
when updating. The optional hook checks context and reports Git status; it does
not enforce RPC behavior or prove that an assistant loaded the instructions.
The runtime RPC guard and offline tests provide separate technical protection.

## Repeat Validation as a Standard Windows User

From this app's repository root, use an existing Git and PowerShell runtime to
download a disposable copy of the pinned guide and run its validator:

```powershell
$taskRepoPath = (Get-Location).Path
$taskGuidePath = Join-Path $env:TEMP ("BW_CODEX_DEV_GUIDE-" + [guid]::NewGuid())
git clone https://github.com/buildwise-be/BW_CODEX_DEV_GUIDE.git $taskGuidePath
git -C $taskGuidePath checkout --detach d968ed2fb82171e9337d6fbd90f23939efdaaf90
& (Join-Path $taskGuidePath 'scripts/validate-target.ps1') -TargetPath $taskRepoPath -Profile full -IncludeWiki
node --check server.js
node --test tests/odoo-read-only.test.js
```

Framework validation checks required file presence and basic manifest metadata;
it does not validate policy wording, current memory accuracy, hook loading, or
live Odoo behavior. Safety tests must use mocks and must not contact real Odoo.
No administrator rights or machine-wide installs are needed for these commands.

During adoption, the sandbox blocked the default Node test worker with
`spawn EPERM`. All 11 tests passed using the existing Node.js 24.19.0 runtime
without a child process:

```powershell
node --test --test-isolation=none tests/odoo-read-only.test.js
```

## Update Procedure

1. Read `AGENTS.md`, `PROJECT_RULES.md`, and the current decisions/state before
   updating. Inspect Git status and preserve unrelated local work.
2. Obtain the desired upstream revision in a separate standard-user checkout.
3. Run its installer with `-DryRun` against this repo; when intentionally keeping
   local uncommitted work, include `-AllowDirtyTarget`. Inspect every conflict.
4. Merge upstream changes into each customized managed file. Retain the Odoo
   rule, startup references, required policy entry, and review reminders. Do not
   blindly use `-Force`: it overwrites custom instructions and the manifest.
5. Preserve project memory and the policy, refresh technical facts only when
   changed, and update this record with the new version/commit.
6. Run full validation, the offline Odoo safety tests, and a diff review before
   considering the adoption complete.

Framework updates, test setup, and hook trust do not authorize any Odoo write.

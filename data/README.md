# Project tags

[project-tags.json](project-tags.json) is the reviewed, versioned catalogue shipped
with the app. It contains one row per Odoo project ID, scoped to an Odoo base
URL/database and Digital Construction responsible unit **206**. Business codes
and names are labels, not keys. Archived projects are included. Canonical tag IDs
have English, French and Dutch labels in `tagDefinitions`.

The initial [Odoo scan report](../docs/ai-context/PROJECT_TAG_SCAN.md) lists the 50
projects reviewed on 2026-10-22: 18 tagged, 31 without a usable summary and one
with a very short summary. The separately requested
[Buildwise web enrichment](../docs/ai-context/PROJECT_TAG_WEB_ENRICHMENT.md)
adds reviewed tags for 18 of those 32 gaps, bringing the catalogue to **36 tagged
projects and 14 unresolved projects**. The original Odoo description-quality
findings remain unchanged. Full source HTML and credentials are not stored here.
Version ID/date, meaningful character count and a SHA-256 of the extracted Odoo
text retain their original provenance.

## Permanent completion

`scanCompleted: true` prevents future description/version reads for that project.
This includes missing and short descriptions, even if someone later edits the
source description. Source hashes record provenance; they do not trigger
invalidation. `project-tags.mergeNew` preserves completed rows. Unavailable
sources remain incomplete and retryable; access failures are not called missing.
A deliberate future retagging request requires an explicit local catalogue
edit. Normal scans cannot reset or replace completed entries.

`project-tags.js` validates, queries and merges the plain JSON without network or
filesystem access. The catalogue and modules are included by Docker's `COPY . .`.
The HTTP static allowlist does not expose `data/`. The Unité DiCo overview
projects a minimal tag map through its existing authenticated catalogue response,
limited to exact projects visible to that session and the matching source
namespace. The interactive map appears above the project calendar. It uses exact
shared canonical tags, with common tags weighted less; broader parent/subtype
relationships are not inferred. No automatic scan is added.

## Scan only new projects

Run manually with the existing private local configuration:

```powershell
node scripts/scan-project-tags.js
```

No dependency installation or administrator rights are required. The CLI uses
the server's unchanged Odoo read-only RPC guard without starting an HTTP
listener. It lists accessible unit-206 projects with archived records included,
then skips completed IDs before reading description links. For new projects it
uses only the latest exactly linked and project-owned
`bw.project.description.version` row, ordered by date then ID. Narrative text
comes from the bilingual project-summary section; generic template instructions
are excluded. Fewer than 200 meaningful Unicode characters is very short;
links alone do not establish a narrative.

The report defaults to `.local/project-tag-scan.json`; `--output <report.json>`
selects another path. `.local/` is excluded from Git and Docker because reports
can contain source summaries. Keep custom outputs in a private location. The
CLI never overwrites the reviewed catalogue or generates tags automatically.

Review new candidates locally against their summaries, add any new canonical
tag definitions, and convert accepted candidates to catalogue rows:
`status` becomes `descriptionStatus` (`pending-review` becomes `available`),
`tags` contains reviewed canonical IDs, `scannedAt` is the report timestamp, and
`scanCompleted` is true for available/missing/short results. Omit
`descriptionText`. Merge using `project-tags.mergeNew`, validate, review the diff
and save the result to `data/project-tags.json`. Preserve unavailable results as
`scanCompleted: false` with no tags, or leave them out for a later retry.
No step writes to Odoo.

## Reviewed Buildwise web enrichment

The 2026-10-22 enrichment is an explicit local catalogue edit following the
user's request. It does not reset a completed Odoo scan, fetch a description on
app startup, or schedule another web search. `descriptionStatus`,
`descriptionCharacterCount`, `sourceVersionId`, `sourceVersionDate`, `sourceHash`
and the original scan timestamps still describe the frozen Odoo scan. A public
description does not make a missing Odoo description available.

Each reviewed gap has separate `webEnrichment` metadata: review status,
publisher, check time, and accepted public sources. Verified results also hold
an original short public-source summary and evidence for every applied canonical
tag. Sources retain their URL, title, retrieval time, identity-match explanation
and SHA-256 content fingerprint; per-tag evidence references those exact URLs.
Raw retrieved HTML/PDF files are not shipped. A fingerprint identifies the
retrieved content; it does not assert that a live page has remained unchanged.

`project-tags.js` accepts tags for a missing Odoo description only when the
Buildwise enrichment is verified and covers every tag. Accepted provenance uses
HTTPS on the explicitly allowed Buildwise host and distinguishes showroom pages,
official pages and official documents. Unverified matches remain untagged.
Similar acronyms, a broad technical theme, or a different grant period alone do
not establish the identity of an Odoo project. The report records unresolved
matches and source/date caveats without merging separate project IDs.

Synonyms reuse canonical IDs, including `bim` for BIM/Building Information
Modelling and `information-management` for the reviewed information/data
management scope. General robotics and digital twins remain distinct from the
narrower autonomous-robotics and federated-digital-twins concepts. New canonical
concepts have English, French and Dutch labels.

The existing authenticated unit response still projects only visible project
IDs, tag IDs, their used French/Dutch labels and the original catalogue scan
timestamp. It omits web summaries, source URLs, hashes and evidence. The full
catalogue is not a static HTTP asset. No Odoo data is changed.

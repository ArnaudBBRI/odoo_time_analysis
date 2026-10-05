# Known Issues

## Active Issues

### Private configuration can enter Docker images

- Evidence: Dockerfile uses COPY . . and .dockerignore does not exclude config.local.json.
- Impact: a private file present in the build context can be retained in the image; a later bind mount does not remove it from the image.
- Workaround: keep private configuration outside the build context and change the Compose mount source.
- Follow-up: exclude config.local.json from the Docker context in a separately authorized code/configuration change.

### Actual-time label has no date cutoff

- Evidence: index.html labels the personal pie Actual time (as of today), while aggregateNamedRows sums selected month keys without comparing record dates to today.
- Impact: future-dated source records can contribute to actual totals.
- Workaround: supply exports or API data consistent with the intended reporting cutoff.
- Follow-up: clarify the label or define and implement a date cutoff if required.

## Fragile Areas

- The static server hosts repository files except the explicitly blocked local configuration. It has no dashboard authentication; Compose publishes its port without a loopback-only host binding.
- Embedded XLSX parsing depends on pivot structure and browser decompression support. No automated parser regression tests or browser compatibility matrix is defined.
- XML-RPC parsing and planning schema/domain fallbacks are implemented locally, without an automated regression suite.
- Employee searches use ilike; an ambiguous name can combine multiple employees. Use a sufficiently specific name and inspect debug results.

## Verification Limits

These observations come from repository inspection on 2026-10-05. Live Odoo access, browser imports, sample workbook contents and Docker image execution were not verified. No GitHub Issue references were supplied for these follow-up items.

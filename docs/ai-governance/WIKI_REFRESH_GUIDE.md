# Wiki Refresh Guide

## Purpose

`docs/wiki/` describes what actually exists in the repository.

It is technical knowledge, not project intent. An assistant may generate or refresh it
by analyzing the repository, but it must stay grounded in observable files,
commands, APIs, configuration, tests, and dependencies.

## Boundary

Put information in `docs/wiki/` when it can be inferred from the repository.

Examples:

- modules and responsibilities visible in code;
- public API surfaces;
- build commands from package, project, or CI files;
- test commands and test layout;
- dependency relationships;
- configuration keys and environment variables;
- observed domain concepts;
- runtime or data flows visible in implementation.

Put information in `docs/ai-context/` when it represents human intent.

Examples:

- roadmap;
- priorities;
- product decisions;
- architecture decisions and rationale;
- known issues;
- project maturity;
- temporary limitations;
- follow-up work.

## Refresh Process

1. Read `AGENTS.md` and `docs/ai-governance/AI_DEVELOPMENT_GUIDE.md`.
2. Inspect the source tree, build files, test files, CI files, and existing docs.
3. Identify which wiki pages are relevant.
4. Update only pages whose facts can be verified from the repository.
5. Link related files or commands where helpful.
6. Do not invent future plans or undocumented design intent.
7. If human intent is discovered or needed, propose updates to `docs/ai-context/`.

## Recommended Pages

### `INDEX.md`

Navigation and refresh metadata.

### `OVERVIEW.md`

High-level repository description based on observable files.

### `MODULES.md`

Modules, packages, directories, and responsibilities.

### `API.md`

Public APIs, command interfaces, exported modules, routes, or external
integration surfaces.

### `DOMAIN.md`

Business or domain concepts visible in names, schemas, APIs, tests, and docs.

### `DATA_FLOW.md`

Important execution flows that can be traced through code.

### `DEPENDENCIES.md`

Internal and external dependencies.

### `BUILD.md`

Build, run, packaging, and CI commands.

### `TESTING.md`

Testing strategy inferred from test files and commands.

### `CONFIGURATION.md`

Environment variables, config files, defaults, secrets conventions, and runtime
settings visible in the repository.

## Refresh Metadata

Each generated page should include a short footer:

```markdown
## Refresh

- Last refreshed: YYYY-MM-DD
- Source basis: files or commands inspected
- Limitations: facts not verified or areas not inspected
```

## Anti-Patterns

Avoid:

- describing planned architecture in `docs/wiki/`;
- copying roadmap items into technical pages;
- documenting assumptions without saying they are unverified;
- duplicating the same content across many pages;
- turning the wiki into a replacement for source code.

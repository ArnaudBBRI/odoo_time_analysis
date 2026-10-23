"use strict";

const test = require("node:test"), assert = require("node:assert/strict");
const path = require("node:path"), fs = require("node:fs"), os = require("node:os");
const tags = require("../project-tags"), { scan, VERSION_MODEL } = require("../project-tag-scan");
const SOURCE = "https://odoo.example.invalid|fictional-db";
const NOW = "2026-10-22T08:00:00.000Z";
const relation = (type, target) => ({ type, relation: target });
const extractor = text => ({ text, characterCount: text.length, extraction: "synthetic", warnings: [] });
const options = extra => ({ now: NOW, extractDescription: extractor, ...extra });
const empty = () => tags.emptyCatalogue({ sourceKey: SOURCE, unitId: 206 });
function completed(id, status = "available") {
  return { id, name: `Saved ${id}`, code: null, tags: [], descriptionStatus: status, scanCompleted: true,
    descriptionCharacterCount: status === "missing-description" ? 0 : status === "short-description" ? 25 : 300,
    sourceVersionId: null, sourceVersionDate: null, sourceHash: null, scannedAt: NOW };
}
function fixture() {
  const definitions = {
    "project.project": { id: { type: "integer" }, name: { type: "char" }, active: { type: "boolean" },
      lead_unit_id: relation("many2one", "hr.department"), description_version_ids: relation("one2many", VERSION_MODEL) },
    [VERSION_MODEL]: { id: { type: "integer" }, project_id: relation("many2one", "project.project"),
      date: { type: "datetime" }, description: { type: "html" } }
  };
  const records = {
    "project.project": [
      { id: 1, name: "[Demo] [12345678] Long project", lead_unit_id: [206, "DiCo"], active: false, description_version_ids: [11, 12] },
      { id: 2, name: "No description", lead_unit_id: [206, "DiCo"], active: true, description_version_ids: [] },
      { id: 3, name: "Short project", lead_unit_id: [206, "DiCo"], active: true, description_version_ids: [31] },
      { id: 4, name: "Interne", lead_unit_id: [206, "DiCo"], description_version_ids: [41] },
      { id: 5, name: "Overhead", lead_unit_id: [206, "DiCo"], description_version_ids: [51] },
      { id: 999, name: "PRIVATE_OTHER_PROJECT", lead_unit_id: [207, "Other"], description_version_ids: [990] }
    ],
    [VERSION_MODEL]: [
      { id: 11, project_id: [1, "Long project"], date: "2025-01-01 12:00:00", description: "OLD_DESCRIPTION" },
      { id: 12, project_id: [1, "Long project"], date: "2026-04-01 12:00:00", description: "Current narrative ".repeat(20) },
      { id: 31, project_id: [3, "Short project"], date: "2026-01-01 12:00:00", description: "A very brief narrative." },
      { id: 990, project_id: [999, "Other"], date: "2026-09-01 12:00:00", description: "PRIVATE_OTHER_DESCRIPTION" }
    ]
  };
  const calls = [];
  const api = {
    definitions, records, calls, fail: null, transform: null,
    rpc: {
      async fields(model) {
        calls.push({ kind: "fields", model });
        if (api.fail?.({ kind: "fields", model })) throw new Error("PRIVATE_UPSTREAM_FAULT");
        return structuredClone(definitions[model] || {});
      },
      async read(model, domain, fields, kwargs) {
        const call = { kind: "read", model, domain: structuredClone(domain), fields: [...fields], kwargs: structuredClone(kwargs) };
        calls.push(call);
        if (api.fail?.(call)) throw new Error("PRIVATE_UPSTREAM_FAULT");
        // Return deliberate unfiltered decoys: the service must still prove
        // ownership after requesting its exact bounded domains.
        let rows = structuredClone(records[model] || []);
        if (api.transform) rows = api.transform(call, rows);
        return rows.map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
      }
    }
  };
  return api;
}

test("manual scan includes archived DiCo projects, excludes decoys and reads only the latest owned descriptions", async () => {
  const data = fixture(), catalogue = empty(), before = structuredClone(catalogue);
  const report = await scan(data.rpc, catalogue, SOURCE, options());
  assert.deepEqual(report.summary, { total: 3, skipped: 0, pendingReview: 1, missingDescription: 1, shortDescription: 1, unavailable: 0 });
  assert.equal(report.asOf, NOW); assert.equal(report.unitId, 206);
  const long = report.projects.find(project => project.id === 1);
  assert.equal(long.code, "12345678"); assert.equal(long.active, false);
  assert.equal(long.sourceVersionId, 12); assert.equal(long.descriptionText, "Current narrative ".repeat(20).trim());
  assert.equal(long.scanCompleted, false, "Readable candidates require manual tag review before completion");
  assert.match(long.sourceHash, /^[a-f0-9]{64}$/);
  const contentReads = data.calls.filter(call => call.fields?.includes("description"));
  assert.equal(contentReads.length, 1);
  assert.deepEqual(contentReads[0].domain, [["id", "in", [12, 31]], ["project_id", "in", [1, 3]]]);
  assert.deepEqual(contentReads[0].fields, ["id", "project_id", "description"]);
  assert.ok(!JSON.stringify(report).includes("PRIVATE_OTHER")); assert.ok(!JSON.stringify(report).includes("OLD_DESCRIPTION"));
  for (const call of data.calls.filter(call => call.kind === "read")) assert.equal(call.kwargs.context.active_test, false);
  assert.deepEqual(catalogue, before, "Preparing a scan never mutates the shipped catalogue");
});

test("project names normalize line breaks and control whitespace before shipping candidates", async () => {
  const data = fixture();
  data.records["project.project"][0].name = "  [HARPO]\n [12345678]\t Quality\r\n  inspection\u007f ";
  const report = await scan(data.rpc, empty(), SOURCE, options());
  const project = report.projects.find(row => row.id === 1);
  assert.equal(project.name, "[HARPO] [12345678] Quality inspection");
  assert.equal(project.code, "12345678");
  assert.doesNotMatch(project.name, /[\u0000-\u001f\u007f]/);
});

test("completed available, missing and short scans are skipped before any description or version read", async () => {
  const data = fixture(), catalogue = tags.mergeNew(empty(), [completed(1), completed(2, "missing-description"), completed(3, "short-description")], { scannedAt: NOW });
  data.fail = call => call.model === VERSION_MODEL || call.fields?.includes("description_version_ids");
  const report = await scan(data.rpc, catalogue, SOURCE, options());
  assert.equal(report.summary.skipped, 3); assert.equal(report.summary.unavailable, 0);
  assert.ok(report.projects.every(project => project.scanCompleted && project.status === "skipped"));
  assert.equal(data.calls.length, 2, "Only project metadata and the unit listing are needed when everything is already scanned");
  assert.deepEqual(data.calls[1].domain, [["lead_unit_id", "=", 206]]);
  assert.deepEqual(data.calls[1].fields, ["id", "name", "lead_unit_id", "active"]);
});

test("partial catalogue skips old projects before requesting new version links", async () => {
  const data = fixture(), catalogue = tags.mergeNew(empty(), [completed(1)], { scannedAt: NOW });
  const report = await scan(data.rpc, catalogue, SOURCE, options());
  assert.equal(report.projects.find(project => project.id === 1).status, "skipped");
  const links = data.calls.find(call => call.fields?.includes("description_version_ids"));
  assert.deepEqual(links.domain, [["id", "in", [2, 3]], ["lead_unit_id", "=", 206]]);
  const metadata = data.calls.find(call => call.model === VERSION_MODEL && call.fields?.includes("date"));
  assert.deepEqual(metadata.domain, [["id", "in", [31]], ["project_id", "in", [3]]]);
});

test("namespace and wrong-unit catalogues fail before RPC calls", async () => {
  const data = fixture();
  await assert.rejects(scan(data.rpc, empty(), "https://other.example.invalid|fictional-db", options()), /namespace/);
  await assert.rejects(scan(data.rpc, { ...empty(), scope: { sourceKey: SOURCE, unitId: 207 } }, SOURCE, options()), /unit/);
  assert.equal(data.calls.length, 0);
});

test("unverifiable relation metadata and denied content stay unavailable rather than missing", async () => {
  for (const failure of ["relation", "versions", "content"]) {
    const data = fixture();
    if (failure === "relation") data.definitions["project.project"].description_version_ids.relation = "wrong.model";
    if (failure === "versions") data.fail = call => call.kind === "fields" && call.model === VERSION_MODEL;
    if (failure === "content") data.fail = call => call.fields?.includes("description");
    const report = await scan(data.rpc, empty(), SOURCE, options());
    assert.equal(report.projects.find(project => project.id === 1).status, "unavailable");
    assert.ok(!JSON.stringify(report).includes("PRIVATE_UPSTREAM_FAULT"));
    if (failure === "relation") assert.equal(data.calls.length, 2);
    else assert.equal(report.projects.find(project => project.id === 2).status, "missing-description", "A separate confirmed-empty relation stays known missing");
  }
});

test("missing or contradictory linked metadata never borrows a foreign or older narrative", async () => {
  for (const failure of ["foreign-owner", "omitted-latest", "contradiction", "invalid-date"]) {
    const data = fixture();
    data.transform = (call, rows) => {
      if (call.model !== VERSION_MODEL || !call.fields.includes("date")) return rows;
      if (failure === "foreign-owner") return rows.map(row => row.id === 12 ? { ...row, project_id: [999, "Other"] } : row);
      if (failure === "omitted-latest") return rows.filter(row => row.id !== 12);
      if (failure === "invalid-date") return rows.map(row => row.id === 12 ? { ...row, date: "2026-02-30 12:00:00" } : row);
      return rows.concat({ ...rows.find(row => row.id === 12), date: "2026-05-01 12:00:00" });
    };
    const report = await scan(data.rpc, empty(), SOURCE, options());
    const project = report.projects.find(project => project.id === 1);
    assert.equal(project.status, "unavailable"); assert.equal(project.sourceVersionId, null);
    assert.ok(!JSON.stringify(report).includes("OLD_DESCRIPTION"));
    const content = data.calls.find(call => call.fields?.includes("description"));
    assert.deepEqual(content.domain[0], ["id", "in", [31]]);
  }
});

test("same-date version ties use exact ID and content ownership remains checked", async () => {
  const data = fixture(); data.records[VERSION_MODEL][0].date = data.records[VERSION_MODEL][1].date;
  data.transform = (call, rows) => call.fields.includes("description") ? rows.map(row => row.id === 12 ? { ...row, project_id: [3, "Wrong project"] } : row) : rows;
  const report = await scan(data.rpc, empty(), SOURCE, options());
  const content = data.calls.find(call => call.fields?.includes("description"));
  assert.deepEqual(content.domain[0], ["id", "in", [12, 31]]);
  assert.equal(report.projects.find(project => project.id === 1).status, "unavailable");
});

test("quality thresholds use extracted narrative characters rather than retained links or HTML template length", async () => {
  const data = fixture();
  const report = await scan(data.rpc, empty(), SOURCE, options({ shortThreshold: 20,
    extractDescription(text) { return text.startsWith("Current") ? { text: "https://example.invalid/only-a-link", characterCount: 0, warnings: ["links-only"] }
      : { text: "Readable technical scope", characterCount: 20, warnings: [] }; } }));
  const links = report.projects.find(project => project.id === 1);
  assert.equal(links.status, "missing-description"); assert.equal(links.descriptionCharacterCount, 0);
  assert.ok(links.descriptionText.startsWith("https://")); assert.deepEqual(links.warnings, ["links-only"]);
  assert.equal(report.projects.find(project => project.id === 3).status, "pending-review", "The threshold is inclusive for sufficient descriptions");
});

test("the default extractor scans only the narrative section rather than the surrounding template", async () => {
  const data = fixture();
  data.records[VERSION_MODEL].find(row => row.id === 12).description =
    '<h2>Onglet Description</h2><h3>De samenvatting van het project | Résumé du projet</h3>' +
    '<p>Computer vision and BIM support quality inspection. '.repeat(8) + '</p><h3>Target groups</h3><p>PRIVATE_OTHER_SECTION</p>';
  const report = await scan(data.rpc, empty(), SOURCE, { now: NOW });
  const project = report.projects.find(row => row.id === 1);
  assert.equal(project.status, "pending-review");
  assert.equal(project.extraction, "summary-section");
  assert.match(project.descriptionText, /Computer vision and BIM/);
  assert.ok(!project.descriptionText.includes("Target groups"));
  assert.ok(!JSON.stringify(report).includes("PRIVATE_OTHER_SECTION"));
});

test("unrecognized template summaries remain unavailable and eligible for a later scan", async () => {
  const data = fixture();
  data.records[VERSION_MODEL].find(row => row.id === 12).description =
    "<h1>Documents clé pour les projets</h1><p>Generic instructions and personnel checklist.</p>";
  const report = await scan(data.rpc, empty(), SOURCE, { now: NOW });
  const project = report.projects.find(row => row.id === 1);
  assert.equal(project.status, "unavailable");
  assert.equal(project.reason, "description-extraction-uncertain");
  assert.equal(project.descriptionCharacterCount, null);
  assert.equal(project.scanCompleted, false);
  assert.equal(report.summary.unavailable, 1);
  assert.equal(report.summary.missingDescription, 1, "Only the separately confirmed empty relation is missing");
});

test("CLI import is inert and report paths cannot overwrite the reviewed catalogue or private config", () => {
  const savedFetch = global.fetch; let requests = 0;
  try {
    global.fetch = () => { requests++; throw new Error("No network should run during import"); };
    const { parseArgs } = require("../scripts/scan-project-tags");
    assert.equal(requests, 0);
    const root = path.resolve(__dirname, "..");
    assert.equal(parseArgs([], root).output, path.join(root, ".local", "project-tag-scan.json"));
    assert.equal(parseArgs(["--output", path.join(root, ".local", "custom.json")], root).output, path.join(root, ".local", "custom.json"));
    for (const target of ["config.local.json", "data/project-tags.json"]) assert.throws(() => parseArgs(["--output", path.join(root, target)], root), /cannot replace/);
    assert.throws(() => parseArgs(["--output"], root), /--output/);
    assert.throws(() => parseArgs(["--rescan"], root), /--output/);
  } finally { global.fetch = savedFetch; }
});

test("junction or symlink output aliases cannot replace config/catalogue at parsing or writing", t => {
  const { parseArgs, writeReport } = require("../scripts/scan-project-tags");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "odoo-tag-output-test-"));
  const root = path.join(directory, "workspace"), alias = path.join(directory, "workspace-alias");
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  const config = path.join(root, "config.local.json"), catalogue = path.join(root, "data", "project-tags.json");
  fs.writeFileSync(config, "FAKE_CONFIG_SENTINEL"); fs.writeFileSync(catalogue, "FAKE_CATALOGUE_SENTINEL");
  t.after(() => {
    // Remove only the link itself before recursively cleaning the verified
    // test-owned directory; never recurse through its junction target.
    if (fs.existsSync(alias)) process.platform === "win32" ? fs.rmdirSync(alias) : fs.unlinkSync(alias);
    const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(directory));
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Unsafe test cleanup target");
    fs.rmSync(directory, { recursive: true, force: true });
  });
  fs.symlinkSync(root, alias, process.platform === "win32" ? "junction" : "dir");
  for (const protectedFile of ["config.local.json", "data/project-tags.json"]) {
    const disguised = path.join(alias, protectedFile);
    assert.throws(() => parseArgs(["--output", disguised], root), /cannot replace/);
    assert.throws(() => writeReport(disguised, { unexpected: "overwrite" }, root), /cannot replace/);
  }
  assert.equal(fs.readFileSync(config, "utf8"), "FAKE_CONFIG_SENTINEL");
  assert.equal(fs.readFileSync(catalogue, "utf8"), "FAKE_CATALOGUE_SENTINEL");
  const ordinaryReport = path.join(alias, ".local", "new", "report.json");
  const selected = parseArgs(["--output", ordinaryReport], root).output;
  assert.equal(selected, path.join(fs.realpathSync(root), ".local", "new", "report.json"));
  writeReport(ordinaryReport, { ok: true }, root);
  assert.deepEqual(JSON.parse(fs.readFileSync(selected, "utf8")), { ok: true });
  assert.equal(fs.readFileSync(config, "utf8"), "FAKE_CONFIG_SENTINEL");
  assert.equal(fs.readFileSync(catalogue, "utf8"), "FAKE_CATALOGUE_SENTINEL");
});

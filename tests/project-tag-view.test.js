"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { createView } = require("../project-tag-view");
const { emptyCatalogue, mergeNew, sourceKeyFor } = require("../project-tags");
const SOURCE = { odooUrl: "https://fixture.example.invalid/", database: "fictional-db" };
const NOW = "2026-10-22T08:00:00.000Z";
const definitions = { bim: { en: "BIM", fr: "BIM", nl: "BIM" },
  vision: { en: "Computer vision", fr: "Vision par ordinateur", nl: "Computervisie" },
  private: { en: "Hidden-only technology", fr: "Technologie cachée", nl: "Verborgen technologie" } };
function project(id, tags, status = "available") {
  return { id, name: `PRIVATE_SAVED_NAME_${id}`, code: `PRIVATE_SAVED_CODE_${id}`, tags,
    scanCompleted: status !== "unavailable", descriptionStatus: status,
    descriptionCharacterCount: status === "missing-description" ? 0 : status === "unavailable" ? null : 300,
    sourceVersionId: id * 100, sourceVersionDate: "2026-10-01 12:00:00", sourceHash: "a".repeat(64), scannedAt: NOW,
    descriptionText: "PRIVATE_SOURCE_NARRATIVE", privateMetadata: { secret: "PRIVATE_CREDENTIAL" } };
}
function catalogue() {
  return mergeNew(emptyCatalogue({ sourceKey: sourceKeyFor(SOURCE.odooUrl, SOURCE.database), unitId: 206,
    tagDefinitions: definitions }), [project(11, ["bim", "vision"]), project(12, ["bim"]), project(13, ["private"]),
      project(14, [], "missing-description"), project(15, [], "unavailable")], { scannedAt: NOW });
}

test("tag view intersects exact visible project IDs and returns only used localized canonical tags", () => {
  const saved = catalogue(), before = structuredClone(saved);
  const first = createView(saved, [{ id: 11 }, { id: 12 }, { id: 14 }, { id: 15 }, { id: 999 }, { id: 11 }], SOURCE);
  assert.deepEqual(first, { status: "available", scannedAt: NOW,
    tagDefinitions: { bim: { fr: "BIM", nl: "BIM" }, vision: { fr: "Vision par ordinateur", nl: "Computervisie" } },
    projects: [{ id: 11, tags: ["bim", "vision"] }, { id: 12, tags: ["bim"] }] });
  const second = createView(saved, [{ id: 12 }], SOURCE);
  assert.deepEqual(second.projects, [{ id: 12, tags: ["bim"] }]);
  assert.deepEqual(Object.keys(second.tagDefinitions), ["bim"]);
  assert.doesNotMatch(JSON.stringify(first) + JSON.stringify(second), /PRIVATE_|private|Hidden|sourceVersion|sourceHash|sourceKey|code|name|en"/);
  assert.deepEqual(saved, before);
  first.projects[0].tags.length = 0; first.tagDefinitions.bim.fr = "mutated";
  assert.deepEqual(saved, before, "Public projections are detached from the stored catalogue");
});

test("missing, invalid, unresolved, different-source and wrong-unit tag catalogues are optional unavailable", () => {
  const valid = catalogue();
  const cases = [undefined, {}, { ...valid, schemaVersion: 999 },
    { ...valid, scope: { ...valid.scope, unitId: 207 } },
    { ...valid, scope: { ...valid.scope, sourceKey: "https://other.example.invalid|fictional-db" } },
    { ...valid, tagDefinitions: undefined }, { ...valid, projects: [...valid.projects, valid.projects[0]] },
    { ...valid, projects: [{ ...valid.projects[0], tags: ["undefined-tag"] }] }];
  for (const saved of cases) assert.deepEqual(createView(saved, [{ id: 11 }], SOURCE),
    { status: "unavailable", scannedAt: null, tagDefinitions: {}, projects: [] });
  assert.equal(createView(valid, [{ id: 11 }], { ...SOURCE, database: "different-db" }).status, "unavailable");
  assert.equal(createView(valid, undefined, SOURCE).status, "unavailable");
});

test("valid empty visibility, untagged-only membership and an empty catalogue remain known empty", () => {
  for (const visible of [[], [{ id: 14 }, { id: 15 }], [{ id: "11" }, { id: -1 }, null]]) {
    assert.deepEqual(createView(catalogue(), visible, SOURCE), { status: "available", scannedAt: NOW, tagDefinitions: {}, projects: [] });
  }
  const empty = emptyCatalogue({ sourceKey: sourceKeyFor(SOURCE.odooUrl, SOURCE.database), scannedAt: NOW });
  assert.deepEqual(createView(empty, [{ id: 11 }], SOURCE), { status: "available", scannedAt: NOW, tagDefinitions: {}, projects: [] });
});

test("web-enriched tags reach only visible projects while public descriptions and source evidence remain private", () => {
  const saved = require("../data/project-tags.json");
  const enriched = saved.projects.filter(row => row.webEnrichment?.status === "verified");
  assert.ok(enriched.length > 1);
  const allowed = enriched[0], url = new URL(saved.scope.sourceKey.split("|")[0]);
  const view = createView(saved, [{ id: allowed.id }], { odooUrl: url.href, database: saved.scope.sourceKey.split("|")[1] });
  assert.equal(view.status, "available");
  assert.deepEqual(view.projects, [{ id: allowed.id, tags: allowed.tags }]);
  assert.doesNotMatch(JSON.stringify(view), /webEnrichment|summary|sources|matchEvidence|tagEvidence|Buildwise|www\.buildwise|contentHash|descriptionStatus/);
});

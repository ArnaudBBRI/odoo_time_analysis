"use strict";
const assert = require("node:assert/strict"), test = require("node:test");
const Tags = require("../project-tags");

const sourceKey = "https://odoo.example.invalid|fixture-db";
const time = "2026-10-22T10:00:00.000Z";
const definitions = {
  "computer-vision": { en: "Computer vision", fr: "Vision par ordinateur", nl: "Computervisie" },
  bim: { en: "BIM", fr: "BIM", nl: "BIM" }
};
const entry = (id = 11, extra = {}) => ({ id, code: "54250011", name: "Fictional project", tags: ["computer-vision"],
  descriptionStatus: "available", descriptionCharacterCount: 400, scanCompleted: true, scannedAt: time,
  sourceVersionId: 111, sourceVersionDate: "2026-03-31 12:44:04", sourceHash: "a".repeat(64), ...extra });
const snapshot = (projects = [], extra = {}) => ({ schemaVersion: 1, scope: { sourceKey, unitId: 206 }, scannedAt: time,
  projects, ...extra });

test("source namespaces retain normalized Odoo base paths and exact database identity", () => {
  assert.equal(Tags.sourceKeyFor("HTTPS://ODOO.EXAMPLE.INVALID/", "fixture-db"), sourceKey);
  assert.equal(Tags.sourceKeyFor("HTTPS://ODOO.EXAMPLE.INVALID/odoo///", "fixture-db"), "https://odoo.example.invalid/odoo|fixture-db");
  assert.notEqual(Tags.sourceKeyFor("https://odoo.example.invalid/other", "fixture-db"), sourceKey);
  assert.notEqual(Tags.sourceKeyFor("https://other.example.invalid", "fixture-db"), sourceKey);
  assert.notEqual(Tags.sourceKeyFor("https://odoo.example.invalid", "other-db"), sourceKey);
  for (const [url, database] of [["https://secret@example.invalid", "db"], ["https://example.invalid?apiKey=secret", "db"],
    ["https://example.invalid#secret", "db"], ["file:///secret", "db"], ["https://example.invalid", "db|key"],
    ["https://example.invalid", ""]]) assert.throws(() => Tags.sourceKeyFor(url, database), /Invalid project tag catalogue/);
});

test("empty shipped catalogues retain source and scope without causing a scan side effect", () => {
  const catalogue = Tags.emptyCatalogue({ sourceKey });
  assert.deepEqual(catalogue, { schemaVersion: 1, scope: { sourceKey, unitId: 206 }, scannedAt: null, projects: [] });
  assert.equal(Tags.needsScan(catalogue, 11, sourceKey), true);
  assert.equal(Tags.getProjectTags(catalogue, 11, sourceKey), null);
});

test("completed available, short and missing scans are never repeated, including tagless scans", () => {
  const catalogue = snapshot([entry(), entry(12, { descriptionStatus: "short-description", descriptionCharacterCount: 30, tags: [] }),
    entry(13, { descriptionStatus: "missing-description", descriptionCharacterCount: 0, tags: [], sourceVersionId: null, sourceVersionDate: null, sourceHash: null }),
    entry(14, { tags: [] })]);
  for (const project of catalogue.projects) assert.equal(Tags.needsScan(catalogue, project.id, sourceKey), false);
  assert.deepEqual(Tags.getProjectTags(catalogue, 13, sourceKey), []);
  assert.deepEqual(Tags.getProjectTags(catalogue, 14, sourceKey), []);
  assert.equal(Tags.needsScan(catalogue, 11, "https://other.example.invalid|fixture-db"), true);
  assert.equal(Tags.getProjectTags(catalogue, 11, "https://other.example.invalid|fixture-db"), null);
});

test("new source hashes, versions and suggested tags cannot overwrite a completed scan", () => {
  const original = snapshot([entry()], { tagDefinitions: definitions, extractionPolicy: { shortBelowCharacters: 120 } });
  const input = structuredClone(original);
  const merged = Tags.mergeNew(original, [entry(11, { tags: ["bim"], sourceVersionId: 222, sourceHash: "b".repeat(64) }), entry(12)],
    { sourceKey, scannedAt: "2026-10-23T10:00:00Z" });
  assert.deepEqual(merged.projects[0], original.projects[0]);
  assert.equal(merged.projects.length, 2);
  assert.deepEqual(merged.tagDefinitions, definitions);
  assert.deepEqual(merged.extractionPolicy, original.extractionPolicy);
  assert.deepEqual(original, input);
});

test("unreadable source attempts stay retryable and can be replaced by a later completed scan", () => {
  const unavailable = entry(11, { tags: [], descriptionStatus: "unavailable", descriptionCharacterCount: null, scanCompleted: false,
    sourceVersionId: null, sourceVersionDate: null, sourceHash: null });
  const catalogue = snapshot([unavailable]);
  assert.equal(Tags.needsScan(catalogue, 11, sourceKey), true);
  assert.equal(Tags.getProjectTags(catalogue, 11, sourceKey), null);
  const merged = Tags.mergeNew(catalogue, [entry()], { sourceKey });
  assert.equal(Tags.needsScan(merged, 11, sourceKey), false);
  assert.deepEqual(Tags.getProjectTags(merged, 11, sourceKey), ["computer-vision"]);
  assert.deepEqual(catalogue.projects[0], unavailable);
});

test("lookups return detached data and merge refuses a different source namespace", () => {
  const catalogue = snapshot([entry()], { tagDefinitions: definitions });
  const tags = Tags.getProjectTags(catalogue, 11); tags.push("bim");
  const project = Tags.getProject(catalogue, 11); project.name = "Changed"; project.tags.length = 0;
  assert.equal(catalogue.projects[0].name, "Fictional project");
  assert.deepEqual(catalogue.projects[0].tags, ["computer-vision"]);
  assert.throws(() => Tags.mergeNew(catalogue, [entry()], { sourceKey: "https://other.example.invalid|fixture-db" }), /namespace/);
});

test("validation rejects ambiguous identities and unresolved or duplicate taxonomy IDs", () => {
  for (const catalogue of [snapshot([entry(), entry()]), snapshot([entry(0)]), snapshot([entry(11, { tags: ["BIM"] })]),
    snapshot([entry(11, { tags: ["bim", "bim"] })]), snapshot([entry(11, { tags: ["unknown"] })], { tagDefinitions: definitions }),
    snapshot([entry()], { schemaVersion: 2 }), snapshot([entry()], { scope: { sourceKey, unitId: 0 } })]) {
    assert.throws(() => Tags.validateCatalogue(catalogue), /Invalid project tag catalogue/);
  }
  assert.throws(() => Tags.mergeNew(snapshot(), [entry(), entry()]), /duplicate incoming project id/);
});

test("description quality and completion states cannot silently become a permanent failed read", () => {
  for (const extra of [{ descriptionStatus: "unavailable", scanCompleted: true },
    { descriptionStatus: "available", scanCompleted: false }, { descriptionStatus: "missing-description", descriptionCharacterCount: 5, tags: [] },
    { descriptionStatus: "missing-description", descriptionCharacterCount: 0 }, { descriptionStatus: "short-description", descriptionCharacterCount: 0 },
    { descriptionCharacterCount: null }, { scannedAt: null }, { sourceHash: "wrong" }, { sourceVersionDate: "2026-02-30" },
    { sourceKey: "https://other.example.invalid|fixture-db" }]) assert.throws(() => Tags.validateCatalogue(snapshot([entry(11, extra)])), /Invalid project tag catalogue/);
});

test("a single snapshot date can supply omitted per-project scan timestamps without mutating input", () => {
  const row = entry(); delete row.scannedAt;
  const catalogue = snapshot([row]);
  const normalized = Tags.validateCatalogue(catalogue);
  assert.equal(normalized.projects[0].scannedAt, time);
  assert.equal(Object.hasOwn(row, "scannedAt"), false);
  assert.throws(() => Tags.validateCatalogue(snapshot([row], { scannedAt: null })), /scannedAt/);
});

"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { emptyCatalogue, validateCatalogue, mergeNew, needsScan } = require("../project-tags");
const NOW = "2026-10-22T12:00:00.000Z";
const URL = "https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/fictional-project/";
function fixture() {
  const base = emptyCatalogue({ sourceKey: "https://fixture.invalid|demo", scannedAt: NOW,
    tagDefinitions: { bim: { en: "BIM", fr: "BIM", nl: "BIM" } } });
  const row = { id: 1, code: "12345678", name: "Fictional project", tags: ["bim"],
    descriptionStatus: "missing-description", descriptionCharacterCount: 0,
    scanCompleted: true, scannedAt: NOW, sourceVersionId: 12,
    sourceVersionDate: "2026-01-01 12:00:00", sourceHash: "a".repeat(64),
    webEnrichment: { status: "verified", publisher: "Buildwise", checkedAt: NOW,
      summary: "The matched public project describes BIM collaboration.",
      sources: [{ url: URL, kind: "showroom", title: "Fictional project",
        retrievedAt: NOW, contentHash: "b".repeat(64), matchEvidence: "Exact acronym and expanded project title." }],
      tagEvidence: [{ tagId: "bim", sourceUrls: [URL], reason: "The project explicitly describes BIM collaboration." }] } };
  return { ...base, projects: [row] };
}

test("verified Buildwise evidence adds tags while retaining the completed missing Odoo description", () => {
  const saved = fixture(), before = structuredClone(saved), normalized = validateCatalogue(saved);
  assert.equal(normalized.projects[0].descriptionStatus, "missing-description");
  assert.equal(normalized.projects[0].descriptionCharacterCount, 0);
  assert.equal(needsScan(normalized, 1), false);
  assert.deepEqual(saved, before);
});

test("missing Odoo evidence cannot acquire tags through incomplete or unrelated web provenance", () => {
  const mutations = [
    row => { delete row.webEnrichment; },
    row => { row.webEnrichment.status = "ambiguous"; },
    row => { row.webEnrichment.sources = []; },
    row => { row.webEnrichment.tagEvidence = []; },
    row => { row.webEnrichment.tagEvidence[0].sourceUrls = ["https://other.invalid/"]; },
    row => { row.webEnrichment.sources[0].url = "https://unrelated.invalid/project/"; },
    row => { row.webEnrichment.sources[0].url = "https://www.buildwise.be/umbraco/private"; },
    row => { row.webEnrichment.sources[0].contentHash = "not-a-hash"; },
    row => { row.webEnrichment.sources[0].matchEvidence = ""; },
    row => { row.webEnrichment.publisher = "Other"; },
    row => { row.webEnrichment.checkedAt = null; },
    row => { row.webEnrichment.tagEvidence[0].tagId = "unknown"; }
  ];
  for (const mutate of mutations) { const saved = fixture(); mutate(saved.projects[0]); assert.throws(() => validateCatalogue(saved), /Invalid project tag catalogue/); }
});

test("every tag needs evidence and neither duplicate sources nor duplicate tag citations count twice", () => {
  const saved = fixture();
  saved.tagDefinitions.vision = { en: "Computer vision", fr: "Vision par ordinateur", nl: "Computervisie" };
  saved.projects[0].tags.push("vision");
  assert.throws(() => validateCatalogue(saved), /verified evidence is incomplete/);
  saved.projects[0].webEnrichment.tagEvidence.push({ tagId: "vision", sourceUrls: [URL], reason: "The matched project explicitly applies computer vision." });
  assert.doesNotThrow(() => validateCatalogue(saved));
  for (const mutate of [
    row => row.webEnrichment.sources.push(structuredClone(row.webEnrichment.sources[0])),
    row => row.webEnrichment.tagEvidence.push(structuredClone(row.webEnrichment.tagEvidence[0])),
    row => row.webEnrichment.tagEvidence[0].sourceUrls.push(URL)
  ]) { const duplicate = structuredClone(saved); mutate(duplicate.projects[0]); assert.throws(() => validateCatalogue(duplicate), /Invalid project tag catalogue/); }
});

test("a recorded unsuccessful web search stays empty and normal merges never replace completed results", () => {
  const saved = fixture(), empty = structuredClone(saved.projects[0]);
  empty.tags = []; empty.webEnrichment = { status: "not-found", publisher: "Buildwise", checkedAt: NOW, sources: [], tagEvidence: [] };
  const original = validateCatalogue({ ...saved, projects: [empty] });
  const merged = mergeNew(original, saved.projects);
  assert.deepEqual(merged.projects, original.projects);
  assert.equal(needsScan(merged, 1), false);
});

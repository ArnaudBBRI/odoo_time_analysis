"use strict";

const test = require("node:test"), assert = require("node:assert/strict");
const catalogue = require("../data/project-tags.json");
const tags = require("../project-tags"), { scan } = require("../project-tag-scan");

test("the shipped catalogue is complete, resolves tags and contains provenance without source narratives", () => {
  const saved = tags.validateCatalogue(catalogue);
  assert.equal(saved.scope.unitId, 206);
  assert.ok(saved.projects.length > 0);
  assert.ok(saved.projects.every(row => row.scanCompleted && row.sourceHash && row.sourceVersionId));
  for (const row of saved.projects) {
    for (const field of ["description", "descriptionText", "html", "apiKey", "password"]) assert.ok(!Object.hasOwn(row, field));
  }
  const extrai = tags.getProject(saved, 2083, saved.scope.sourceKey);
  assert.equal(extrai.code, "54252043");
  assert.ok(extrai.tags.includes("computer-vision"));
  assert.ok(extrai.tags.includes("large-language-models"));
});

test("a scan with the shipped catalogue skips every saved project without a description read", async () => {
  const calls = [], snapshot = JSON.stringify(catalogue);
  const rpc = {
    async fields(model) {
      calls.push({ kind: "fields", model });
      assert.equal(model, "project.project");
      return { name: { type: "char" }, active: { type: "boolean" },
        lead_unit_id: { type: "many2one", relation: "hr.department" } };
    },
    async read(model, domain, fields) {
      calls.push({ kind: "read", model });
      assert.equal(model, "project.project");
      assert.deepEqual(domain, [["lead_unit_id", "=", 206]]);
      assert.deepEqual(fields, ["id", "name", "lead_unit_id", "active"]);
      return catalogue.projects.map(row => ({ id: row.id, name: row.name, active: !row.archived, lead_unit_id: [206, "DiCo"] }));
    }
  };
  const report = await scan(rpc, catalogue, catalogue.scope.sourceKey);
  assert.equal(report.summary.total, catalogue.projects.length);
  assert.equal(report.summary.skipped, catalogue.projects.length);
  assert.ok(report.projects.every(row => row.status === "skipped"));
  assert.equal(calls.length, 2);
  assert.equal(JSON.stringify(catalogue), snapshot);
});

"use strict";

// Manual, read-only preparation of new tag candidates. This never changes the
// shipped catalogue: successful descriptions still need local tag review.
const crypto = require("node:crypto");
const catalogueApi = require("./project-tags");
const { isExcludedProjectName } = require("./unit-dico-service");
const UNIT_ID = 206;
const VERSION_MODEL = "bw.project.description.version";
const positiveId = value => Number.isSafeInteger(value) && value > 0;
const relationId = value => Array.isArray(value) ? value[0] : value;
const projectCode = name => /\[\s*(\d{8})\s*\]/.exec(name)?.[1] || /^\s*(\d{8})\b/.exec(name)?.[1] || null;
const projectRelation = definition => definition?.type === "many2one" && definition.relation === "project.project";

function dateValue(value) {
  if (value === false || value === null || value === undefined || value === "") return { date: null, time: -Infinity };
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z?)?$/.test(value)) return null;
  const time = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value.replace(" ", "T").replace(/Z?$/, "Z"));
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value.slice(0, 10)) return null;
  return { date: value, time };
}
function versionIds(value) {
  return Array.isArray(value) && value.every(positiveId) ? [...new Set(value)].sort((a, b) => a - b) : null;
}
function unavailable(project, reason) {
  return { ...project, status: "unavailable", scanCompleted: false, descriptionCharacterCount: null,
    sourceVersionId: null, sourceVersionDate: null, sourceHash: null, reason };
}
function missing(project) {
  return { ...project, status: "missing-description", scanCompleted: false, descriptionText: "",
    descriptionCharacterCount: 0, sourceVersionId: null, sourceVersionDate: null, sourceHash: null,
    extraction: "no-description-version", warnings: [] };
}
function readOptions() { return { context: { active_test: false }, order: "id asc" }; }

async function scan(rpc, catalogue, sourceKey, options = {}) {
  const snapshot = catalogueApi.validateCatalogue(catalogue);
  if (snapshot.scope.unitId !== UNIT_ID || snapshot.scope.sourceKey !== sourceKey) throw new Error("Project tag scan source namespace or unit does not match the catalogue");
  if (!rpc || typeof rpc.fields !== "function" || typeof rpc.read !== "function") throw new Error("A read-only RPC adapter is required");
  const now = new Date(options.now === undefined ? Date.now() : options.now);
  const shortThreshold = options.shortThreshold === undefined ? 200 : options.shortThreshold;
  if (!Number.isFinite(now.getTime()) || !Number.isSafeInteger(shortThreshold) || shortThreshold < 1 || shortThreshold > 10000) throw new Error("Invalid project tag scan options");
  let definitions, roster;
  try {
    definitions = await rpc.fields("project.project");
    if (definitions?.lead_unit_id?.type !== "many2one" || definitions.lead_unit_id.relation !== "hr.department"
      || definitions.name?.type !== "char") throw new Error();
    const fields = ["id", "name", "lead_unit_id", ...(definitions.active?.type === "boolean" ? ["active"] : [])];
    roster = await rpc.read("project.project", [["lead_unit_id", "=", UNIT_ID]], fields, readOptions());
    if (!Array.isArray(roster)) throw new Error();
  } catch (_) { throw new Error("Digital Construction project catalogue is unavailable with the current Odoo access or schema"); }
  const identities = new Map();
  for (const row of roster) {
    if (!row || !positiveId(row.id) || relationId(row.lead_unit_id) !== UNIT_ID || typeof row.name !== "string" || !row.name.trim()
      || isExcludedProjectName(row.name)) continue;
    const name = row.name.replace(/[\s\u0000-\u001f\u007f]+/g, " ").trim();
    if (!name) continue;
    if (!identities.has(row.id)) identities.set(row.id, { id: row.id, code: projectCode(name), name,
      ...(typeof row.active === "boolean" ? { active: row.active } : {}) });
  }
  const projects = [...identities.values()].sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }) || a.id - b.id);
  const results = new Map(), pending = [];
  for (const project of projects) {
    if (!catalogueApi.needsScan(snapshot, project.id, sourceKey)) {
      results.set(project.id, { ...project, status: "skipped", scanCompleted: true, reason: "already-scanned" });
    } else pending.push(project);
  }
  const finish = () => {
    const entries = projects.map(project => results.get(project.id));
    const count = status => entries.filter(project => project.status === status).length;
    return { schemaVersion: 1, sourceKey, unitId: UNIT_ID, asOf: now.toISOString(), shortThreshold, projects: entries,
      summary: { total: entries.length, skipped: count("skipped"), pendingReview: count("pending-review"),
        missingDescription: count("missing-description"), shortDescription: count("short-description"), unavailable: count("unavailable") } };
  };
  if (!pending.length) return finish();
  const relation = definitions.description_version_ids;
  if (!["one2many", "many2many"].includes(relation?.type) || relation.relation !== VERSION_MODEL) {
    pending.forEach(project => results.set(project.id, unavailable(project, "description-relation-unavailable")));
    return finish();
  }
  const pendingIds = new Set(pending.map(project => project.id)), references = new Map(), contradictory = new Set();
  try {
    const rows = await rpc.read("project.project", [["id", "in", [...pendingIds]], ["lead_unit_id", "=", UNIT_ID]],
      ["id", "lead_unit_id", "description_version_ids"], readOptions());
    if (!Array.isArray(rows)) throw new Error();
    for (const row of rows) {
      if (!row || !pendingIds.has(row.id) || relationId(row.lead_unit_id) !== UNIT_ID) continue;
      const ids = versionIds(row.description_version_ids);
      if (ids === null || references.has(row.id) && JSON.stringify(references.get(row.id)) !== JSON.stringify(ids)) contradictory.add(row.id);
      else references.set(row.id, ids);
    }
  } catch (_) {
    pending.forEach(project => results.set(project.id, unavailable(project, "description-links-unavailable")));
    return finish();
  }
  const owned = new Map();
  for (const project of pending) {
    if (contradictory.has(project.id) || !references.has(project.id)) results.set(project.id, unavailable(project, "description-links-incomplete"));
    else if (!references.get(project.id).length) results.set(project.id, missing(project));
    else owned.set(project.id, project);
  }
  if (!owned.size) return finish();
  let versionDefinitions;
  try {
    versionDefinitions = await rpc.fields(VERSION_MODEL);
    if (!projectRelation(versionDefinitions.project_id) || !["date", "datetime"].includes(versionDefinitions.date?.type)
      || !["html", "text"].includes(versionDefinitions.description?.type)) throw new Error();
  } catch (_) {
    owned.forEach(project => results.set(project.id, unavailable(project, "description-model-unavailable")));
    return finish();
  }
  const allVersionIds = new Set([...owned.keys()].flatMap(id => references.get(id))), versions = new Map(), invalidVersions = new Set();
  try {
    const rows = await rpc.read(VERSION_MODEL, [["id", "in", [...allVersionIds]], ["project_id", "in", [...owned.keys()]]],
      ["id", "project_id", "date"], readOptions());
    if (!Array.isArray(rows)) throw new Error();
    for (const row of rows) {
      const ownerId = relationId(row?.project_id);
      if (!row || !allVersionIds.has(row.id) || !owned.has(ownerId) || !references.get(ownerId).includes(row.id)) continue;
      const pickedDate = dateValue(row.date);
      if (!pickedDate || versions.has(row.id) && (versions.get(row.id).projectId !== ownerId || versions.get(row.id).date !== pickedDate.date)) invalidVersions.add(row.id);
      else versions.set(row.id, { id: row.id, projectId: ownerId, ...pickedDate });
    }
  } catch (_) {
    owned.forEach(project => results.set(project.id, unavailable(project, "description-versions-unavailable")));
    return finish();
  }
  const latest = new Map();
  for (const [id, project] of owned) {
    const ids = references.get(id);
    if (ids.some(versionId => !versions.has(versionId) || versions.get(versionId).projectId !== id || invalidVersions.has(versionId))) {
      results.set(id, unavailable(project, "description-versions-incomplete")); continue;
    }
    const version = ids.map(versionId => versions.get(versionId)).sort((a, b) => b.time - a.time || b.id - a.id)[0];
    latest.set(version.id, { project, version });
  }
  if (!latest.size) return finish();
  const descriptions = new Map(), invalidDescriptions = new Set();
  try {
    const rows = await rpc.read(VERSION_MODEL, [["id", "in", [...latest.keys()]], ["project_id", "in", [...new Set([...latest.values()].map(item => item.project.id))]]],
      ["id", "project_id", "description"], readOptions());
    if (!Array.isArray(rows)) throw new Error();
    for (const row of rows) {
      const selected = latest.get(row?.id);
      if (!selected || relationId(row.project_id) !== selected.project.id) continue;
      if (row.description !== false && row.description !== null && typeof row.description !== "string"
        || descriptions.has(row.id) && descriptions.get(row.id) !== row.description) invalidDescriptions.add(row.id);
      else descriptions.set(row.id, row.description);
    }
  } catch (_) {
    latest.forEach(({ project }) => results.set(project.id, unavailable(project, "description-content-unavailable")));
    return finish();
  }
  const extract = options.extractDescription || require("./project-description").extractDescription;
  for (const [versionId, { project, version }] of latest) {
    if (!descriptions.has(versionId) || invalidDescriptions.has(versionId)) {
      results.set(project.id, unavailable(project, "description-content-incomplete")); continue;
    }
    try {
      const extracted = extract(descriptions.get(versionId) || "", { shortThreshold });
      if (!extracted || typeof extracted.text !== "string" || !Number.isSafeInteger(extracted.characterCount) || extracted.characterCount < 0) throw new Error();
      // A changed template can hide a valid narrative. Keep it eligible for a
      // later manual scan rather than recording an unverified empty summary.
      if (Array.isArray(extracted.warnings) && extracted.warnings.includes("summary-heading-missing")) {
        results.set(project.id, unavailable(project, "description-extraction-uncertain")); continue;
      }
      const text = extracted.text.trim(), count = extracted.characterCount;
      results.set(project.id, { ...project, status: count === 0 ? "missing-description" : count < shortThreshold ? "short-description" : "pending-review",
        scanCompleted: false, descriptionText: text, descriptionCharacterCount: count,
        sourceVersionId: version.id, sourceVersionDate: version.date,
        sourceHash: crypto.createHash("sha256").update(text).digest("hex"),
        extraction: typeof extracted.extraction === "string" ? extracted.extraction : null,
        warnings: Array.isArray(extracted.warnings) ? extracted.warnings.filter(warning => typeof warning === "string") : [] });
    } catch (_) { results.set(project.id, unavailable(project, "description-extraction-unavailable")); }
  }
  return finish();
}

module.exports = { UNIT_ID, VERSION_MODEL, scan };

"use strict";

// Local, shipped project-tag snapshots. This module has no Odoo, network or
// filesystem adapter: callers can only validate/query/merge ordinary JSON.
const SCHEMA_VERSION = 1;
const COMPLETED_STATUSES = new Set(["available", "missing-description", "short-description"]);
const TAG_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function fail(message) { throw new Error(`Invalid project tag catalogue: ${message}`); }
function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function id(value) { return Number.isSafeInteger(value) && value > 0; }
function text(value, name, max = 1000) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) fail(name);
  return value.trim();
}
function clone(value, depth = 0) {
  if (depth > 25) fail("JSON nesting is too deep");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(item => clone(item, depth + 1));
  if (object(value)) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) fail("ordinary JSON objects are required");
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item, depth + 1)]));
  }
  fail("non-JSON value");
}
function timestamp(value, name, nullable = true) {
  if (value === null && nullable) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value.slice(0, 10)) fail(name);
  return value;
}
function sourceDate(value) {
  if (value == null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z?)?$/.test(value)) fail("sourceVersionDate");
  const datePart = value.slice(0, 10), timePart = value.slice(11).replace(/Z$/, "");
  const parsed = Date.parse(`${datePart}T${timePart || "00:00:00"}Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== datePart) fail("sourceVersionDate");
  return value;
}

function sourceKeyFor(odooUrl, database) {
  let url;
  try { url = new URL(odooUrl); } catch (_) { fail("source URL"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) fail("source URL must not contain credentials or query data");
  const db = text(database, "source database", 200);
  if (/[|\s]/.test(db)) fail("source database");
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}|${db}`;
}
function sourceKey(value) {
  const key = text(value, "scope.sourceKey", 500), separator = key.lastIndexOf("|");
  if (separator < 0 || sourceKeyFor(key.slice(0, separator), key.slice(separator + 1)) !== key) fail("scope.sourceKey must be a normalized base URL|database");
  return key;
}
function definitions(value) {
  if (value === undefined) return undefined;
  if (!object(value)) fail("tagDefinitions");
  const result = clone(value);
  for (const [key, labels] of Object.entries(result)) {
    if (!TAG_ID.test(key) || !object(labels)) fail("tagDefinitions entry");
    for (const language of ["en", "fr", "nl"]) labels[language] = text(labels[language], `tagDefinitions.${key}.${language}`, 200);
  }
  return result;
}

function webEnrichment(value, tags) {
  if (value === undefined) return null;
  if (!object(value) || !["verified", "not-found", "ambiguous", "insufficient"].includes(value.status)
    || value.publisher !== "Buildwise") fail("webEnrichment status/publisher");
  timestamp(value.checkedAt, "webEnrichment.checkedAt", false);
  if (!Array.isArray(value.sources) || value.sources.length > 5 || !Array.isArray(value.tagEvidence)) fail("webEnrichment sources/evidence");
  const urls = new Set();
  for (const source of value.sources) {
    if (!object(source)) fail("webEnrichment source");
    let url;
    try { url = new URL(source.url); } catch (_) { fail("webEnrichment source URL"); }
    if (url.protocol !== "https:" || !["www.buildwise.be", "buildwise.be"].includes(url.hostname)
      || url.username || url.password || url.port || url.search || url.hash || url.href !== source.url
      || urls.has(source.url)) fail("webEnrichment source URL");
    const kind = /^\/(?:fr\/recherche-innovation\/showroom-des-projets|nl\/onderzoek-innovatie\/onderzoeksprojecten)\//.test(url.pathname)
      ? "showroom" : url.pathname.startsWith("/media/") ? "official-document"
        : /^\/(?:fr|nl)\//.test(url.pathname) ? "official-page" : null;
    if (!kind || source.kind !== kind) fail("webEnrichment source kind");
    text(source.title, "webEnrichment source title", 500);
    text(source.matchEvidence, "webEnrichment match evidence", 1200);
    timestamp(source.retrievedAt, "webEnrichment source retrievedAt", false);
    if (typeof source.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(source.contentHash)) fail("webEnrichment source contentHash");
    urls.add(source.url);
  }
  const evidenced = new Set();
  for (const evidence of value.tagEvidence) {
    if (!object(evidence) || !tags.includes(evidence.tagId) || evidenced.has(evidence.tagId)
      || !Array.isArray(evidence.sourceUrls) || !evidence.sourceUrls.length
      || new Set(evidence.sourceUrls).size !== evidence.sourceUrls.length
      || evidence.sourceUrls.some(url => !urls.has(url))) fail("webEnrichment tag evidence");
    text(evidence.reason, "webEnrichment tag reason", 500);
    evidenced.add(evidence.tagId);
  }
  if (value.status === "verified") {
    if (!urls.size || !tags.length || evidenced.size !== tags.length) fail("webEnrichment verified evidence is incomplete");
    text(value.summary, "webEnrichment summary", 1200);
  } else if (evidenced.size) fail("webEnrichment unverified tags");
  return value.status;
}

function normalizeProject(value, scannedAt, tagDefinitions, namespace) {
  if (!object(value) || !id(value.id)) fail("project id");
  const row = clone(value);
  row.code = value.code == null ? null : text(value.code, "project code", 100);
  row.name = text(value.name, "project name", 2000);
  if (!Array.isArray(value.tags)) fail("project tags");
  row.tags = value.tags.map(tag => {
    if (typeof tag !== "string" || tag.length > 100 || !TAG_ID.test(tag)) fail("canonical tag id");
    if (tagDefinitions && !Object.hasOwn(tagDefinitions, tag)) fail("unresolved tag id");
    return tag;
  });
  if (new Set(row.tags).size !== row.tags.length) fail("duplicate tag id");
  if (value.sourceKey !== undefined && value.sourceKey !== namespace) fail("project source namespace");
  const completed = COMPLETED_STATUSES.has(value.descriptionStatus);
  if (!completed && value.descriptionStatus !== "unavailable") fail("descriptionStatus");
  if (value.scanCompleted !== completed) fail("scanCompleted must reflect a completed description scan");
  const count = value.descriptionCharacterCount;
  if (count !== null && (!Number.isSafeInteger(count) || count < 0)) fail("descriptionCharacterCount");
  if (completed && count === null) fail("completed description character count");
  if (value.descriptionStatus === "missing-description" && count !== 0) fail("missing description must have zero characters");
  if (["available", "short-description"].includes(value.descriptionStatus) && !(count > 0)) fail("nonempty description character count");
  const webStatus = webEnrichment(value.webEnrichment, row.tags);
  if (value.descriptionStatus === "unavailable" && row.tags.length
    || value.descriptionStatus === "missing-description" && row.tags.length && webStatus !== "verified") fail("tags require readable description evidence");
  row.scannedAt = timestamp(value.scannedAt === undefined ? scannedAt : value.scannedAt, "project scannedAt", !completed);
  row.sourceVersionId = value.sourceVersionId == null ? null : value.sourceVersionId;
  if (row.sourceVersionId !== null && !id(row.sourceVersionId)) fail("sourceVersionId");
  row.sourceVersionDate = sourceDate(value.sourceVersionDate);
  row.sourceHash = value.sourceHash == null ? null : value.sourceHash;
  if (row.sourceHash !== null && (typeof row.sourceHash !== "string" || !/^[a-f0-9]{64}$/.test(row.sourceHash))) fail("sourceHash");
  return row;
}

function validateCatalogue(value) {
  if (!object(value) || value.schemaVersion !== SCHEMA_VERSION) fail("schemaVersion");
  const catalogue = clone(value);
  if (!object(value.scope) || !id(value.scope.unitId)) fail("scope.unitId");
  catalogue.scope.sourceKey = sourceKey(value.scope.sourceKey);
  catalogue.scannedAt = timestamp(value.scannedAt ?? null, "scannedAt");
  catalogue.tagDefinitions = definitions(value.tagDefinitions);
  if (catalogue.tagDefinitions === undefined) delete catalogue.tagDefinitions;
  if (!Array.isArray(value.projects)) fail("projects");
  const seen = new Set();
  catalogue.projects = value.projects.map(project => {
    const row = normalizeProject(project, catalogue.scannedAt, catalogue.tagDefinitions, catalogue.scope.sourceKey);
    if (seen.has(row.id)) fail("duplicate project id");
    seen.add(row.id);
    return row;
  });
  return catalogue;
}

function emptyCatalogue({ sourceKey: namespace, unitId = 206, scannedAt = null, tagDefinitions } = {}) {
  return validateCatalogue({ schemaVersion: SCHEMA_VERSION, scope: { sourceKey: namespace, unitId }, scannedAt,
    ...(tagDefinitions === undefined ? {} : { tagDefinitions }), projects: [] });
}
function getProject(catalogue, projectId, namespace) {
  if (!id(projectId)) fail("project id");
  const snapshot = validateCatalogue(catalogue);
  if (namespace !== undefined && sourceKey(namespace) !== snapshot.scope.sourceKey) return null;
  return snapshot.projects.find(project => project.id === projectId) || null;
}
function needsScan(catalogue, projectId, namespace) {
  return getProject(catalogue, projectId, namespace)?.scanCompleted !== true;
}
function getProjectTags(catalogue, projectId, namespace) {
  const project = getProject(catalogue, projectId, namespace);
  return project?.scanCompleted ? project.tags.slice() : null;
}
function mergeNew(catalogue, projects, { scannedAt, sourceKey: namespace } = {}) {
  const snapshot = validateCatalogue(catalogue);
  if (namespace !== undefined && sourceKey(namespace) !== snapshot.scope.sourceKey) fail("cannot merge another source namespace");
  if (!Array.isArray(projects)) fail("new projects");
  const nextScannedAt = scannedAt === undefined ? snapshot.scannedAt : timestamp(scannedAt, "scannedAt");
  const incoming = new Set();
  const byId = new Map(snapshot.projects.map(project => [project.id, project]));
  for (const value of projects) {
    const row = normalizeProject(value, nextScannedAt, snapshot.tagDefinitions, snapshot.scope.sourceKey);
    if (incoming.has(row.id)) fail("duplicate incoming project id");
    incoming.add(row.id);
    // A completed scan is permanent. New description versions, dates or
    // extraction/tagging rules do not replace it as a side effect of a scan.
    if (!byId.get(row.id)?.scanCompleted) byId.set(row.id, row);
  }
  return validateCatalogue({ ...snapshot, scannedAt: nextScannedAt, projects: [...byId.values()] });
}

module.exports = { SCHEMA_VERSION, sourceKeyFor, emptyCatalogue, validateCatalogue, getProject, getProjectTags, needsScan, mergeNew };

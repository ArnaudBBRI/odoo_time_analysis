"use strict";
const unitService = require("./unit-dico-service");

// User-defined programme identities are independent of the legacy pilotage
// project mapping, date scope and local configuration.
const definitions = Object.freeze([
  Object.freeze({ id: "DC1", subtitle: "Backbone", catchphrase: "To Structure", responsible: "Pauline Dewez" }),
  Object.freeze({ id: "DC2", subtitle: "Insight", catchphrase: "To Act", responsible: "Timothée Lonfils" }),
  Object.freeze({ id: "DC3", subtitle: "Manufacturing", catchphrase: "To Make", responsible: "François Denis" })
]);

const projectReferences = Object.freeze({
  DC1: [
    ["51232020", "BIDZ B2 B"], ["54232014", "FireBIM"], ["54232022", "HARPO"],
    ["55242009", "TETRA Ventilatie"], ["55252050", "BIM Totem"], ["56202061", "Letslink"],
    ["57252087", "Digital Building Permit Process"], ["51261787", "PRNSPEC"],
    ["51252062", "NA BIM & Digital Construction 26"], ["55261797", "DS / Harmonix"]
  ].map(([code, name]) => Object.freeze({ code, name })),
  DC2: [
    ["54222092", "S-MonhumMA"], ["55242029", "AI_werfopvolging / AIDA"], ["55242030", "AI CONSTRUCT"],
    ["55242037", "D4C"], ["55252098", "Waffle Vlaio"], ["59252034", "eDIH WallonIA Hub"],
    ["59252044", "FAITH"], ["56261849", "in-beTwin"]
  ].map(([code, name]) => Object.freeze({ code, name })),
  DC3: [
    ["56232072", "Renolab"], ["56242022", "Indus4Builder"], ["54252043", "eXtRAI"],
    ["55232032", "DigiBuild"], ["62261858", "Autogrout"]
  ].map(([code, name]) => Object.freeze({ code, name }))
});
for (const references of Object.values(projectReferences)) Object.freeze(references);

function catalogue() {
  return { ok: true, programmes: definitions.map(item => ({
    id: item.id, code: item.id, name: item.id,
    subtitle: item.subtitle, catchphrase: item.catchphrase,
    manager: { id: null, name: item.responsible, photoDataUrl: null }
  })) };
}

function fold(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

function identityKey(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 256) return null;
  return fold(value.trim()).split(/\s+/).sort().join(" ");
}

function nameVariants() {
  const variants = new Set();
  for (const item of definitions) {
    const reversed = item.responsible.split(" ").reverse().join(" ");
    for (const value of [item.responsible, reversed]) {
      variants.add(value);
      variants.add(value.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    }
  }
  return [...variants];
}

async function load(rpc, decodePhoto) {
  const result = catalogue();
  let fields, rows;
  try {
    fields = await rpc.fields("res.users");
    if (!fields || fields.id?.type !== "integer" || fields.name?.type !== "char") return result;
    const variants = nameVariants();
    // '=ilike' performs case-insensitive whole-name matching. Every variant is
    // fixed above; no caller-supplied names or wildcard patterns are accepted.
    const domain = [...Array(variants.length - 1).fill("|"),
      ...variants.map(name => ["name", "=ilike", name])];
    rows = await rpc.read("res.users", domain, ["id", "name"],
      { context: { active_test: false }, order: "id asc" });
    if (!Array.isArray(rows)) return result;
  } catch (_) {
    // Responsible photos are optional. Never expose raw upstream faults or
    // remove the fixed cards because account permissions differ.
    return result;
  }

  const requested = new Map(definitions.map((item, index) => [identityKey(item.responsible), index]));
  const candidates = definitions.map(() => new Set());
  const keysById = new Map();
  for (const row of rows) {
    if (!Number.isSafeInteger(row?.id) || row.id <= 0) continue;
    const key = identityKey(row.name);
    if (!key) continue;
    if (!keysById.has(row.id)) keysById.set(row.id, new Set());
    keysById.get(row.id).add(key);
    if (requested.has(key)) candidates[requested.get(key)].add(row.id);
  }
  const identities = new Map();
  candidates.forEach((ids, index) => {
    if (ids.size !== 1) return;
    const id = [...ids][0];
    if (keysById.get(id)?.size !== 1) return;
    const manager = result.programmes[index].manager;
    manager.id = id;
    identities.set(id, { manager, key: identityKey(manager.name) });
  });
  if (!identities.size || fields.image_128?.type !== "binary" || typeof decodePhoto !== "function") return result;

  try {
    // A separate optional exact-ID photo read cannot erase known identities.
    const photos = await rpc.read("res.users", [["id", "in", [...identities.keys()]]],
      ["id", "name", "image_128"], { context: { active_test: false }, order: "id asc" });
    if (!Array.isArray(photos)) return result;
    const byId = new Map();
    for (const row of photos) {
      if (!identities.has(row?.id)) continue;
      if (!byId.has(row.id)) byId.set(row.id, []);
      byId.get(row.id).push(row);
    }
    for (const [id, { manager, key }] of identities) {
      const matches = byId.get(id) || [];
      if (matches.length !== 1 || identityKey(matches[0].name) !== key) continue;
      try { manager.photoDataUrl = decodePhoto(matches[0].image_128) || null; }
      catch (_) { /* Invalid optional image content retains the initials. */ }
    }
  } catch (_) {
    // Denied/missing images retain the three requested names and initials.
  }
  return result;
}

function sourceCodes(row) {
  const codes = new Set();
  for (const value of [row.name, row.display_name]) {
    if (typeof value !== "string") continue;
    for (const match of value.matchAll(/\[\s*(\d{8})\s*\]/g)) codes.add(match[1]);
    const prefix = value.trim().match(/^(\d{8})(?=\s|[·:|–—/-]|\[|$)/);
    if (prefix) codes.add(prefix[1]);
  }
  return codes;
}

// Shared resolution for the selected-programme lookup and the already-visible
// unit catalogue. Neither incidental substrings nor ambiguous codes assign IDs.
function resolveProjectReferences(references, byId) {
  const candidates = references.map(() => new Set());
  const identities = new Map();
  for (const [id, rows] of byId) {
    const codes = new Set(rows.flatMap(row => [...sourceCodes(row)]));
    const sourceNames = new Set(rows.map(row => row.name));
    const matched = references.map(reference => codes.has(reference.code))
      .map((match, index) => match ? index : -1).filter(index => index >= 0);
    if (codes.size > 1 || sourceNames.size > 1 || matched.length > 1) {
      for (const index of matched) candidates[index].add(`invalid:${id}`);
      continue;
    }
    if (matched.length !== 1) continue;
    candidates[matched[0]].add(id);
    identities.set(id, rows.find(row => typeof row.display_name === "string" && row.display_name.trim()) || rows[0]);
  }
  const missing = [], ambiguous = [], selected = new Map();
  references.forEach((reference, index) => {
    const ids = candidates[index];
    if (!ids.size) missing.push({ ...reference });
    else if (ids.size !== 1 || typeof [...ids][0] !== "number") ambiguous.push({ ...reference });
    else {
      const id = [...ids][0], source = identities.get(id);
      const name = typeof source.display_name === "string" && source.display_name.trim() ? source.display_name.trim() : source.name.trim();
      selected.set(id, { id, name, startDate: null, endDate: null, manager: null });
    }
  });
  return { missing, ambiguous, selected };
}

function createProjectMap(visibleProjects) {
  if (!Array.isArray(visibleProjects)) return { status: "unavailable", programmes: [] };
  const byId = new Map();
  for (const project of visibleProjects) {
    if (!Number.isSafeInteger(project?.id) || project.id <= 0 || typeof project.name !== "string" || !project.name.trim()) continue;
    if (!byId.has(project.id)) byId.set(project.id, []);
    byId.get(project.id).push({ name: project.name, display_name: project.display_name });
  }
  return { status: "available", programmes: definitions.map(({ id, subtitle }) => {
    // Resolve each list independently: a shared reference retains every
    // programme membership instead of arbitrarily choosing one programme.
    const { selected } = resolveProjectReferences(projectReferences[id], byId);
    return { id, code: id, subtitle, projectIds: [...selected.keys()].sort((a, b) => a - b) };
  }) };
}

async function loadProjects(programmeId, rpc, now = new Date()) {
  if (!["DC1", "DC2", "DC3"].includes(programmeId)) throw new Error("Programme inconnu.");
  const references = projectReferences[programmeId];
  let fields;
  try { fields = await rpc.fields("project.project"); }
  catch (_) { throw new Error("Les informations des projets du programme sont indisponibles avec vos accès Odoo."); }
  if (!fields || fields.id?.type !== "integer" || !["char", "text"].includes(fields.name?.type)) {
    throw new Error("Les identités des projets du programme sont indisponibles avec vos accès Odoo.");
  }
  const sources = ["name", ...(["char", "text"].includes(fields.display_name?.type) ? ["display_name"] : [])];
  const options = { context: { active_test: false }, order: "id asc" };
  const byId = new Map(), warnings = [];
  let readableQueries = 0, deniedQueries = 0;
  for (const source of sources) {
    const conditions = references.map(reference => [source, "ilike", reference.code]);
    const domain = [...Array(conditions.length - 1).fill("|"), ...conditions];
    try {
      const requested = ["id", "name", ...(source === "display_name" ? ["display_name"] : [])];
      const rows = await rpc.read("project.project", domain, requested, options);
      if (!Array.isArray(rows)) throw new Error("Invalid project lookup response");
      readableQueries++;
      for (const row of rows) {
        if (!Number.isSafeInteger(row?.id) || row.id <= 0 || typeof row.name !== "string" || !row.name.trim()) continue;
        if (!byId.has(row.id)) byId.set(row.id, []);
        byId.get(row.id).push(Object.fromEntries(requested.map(name => [name, row[name]])));
      }
    } catch (_) { deniedQueries++; }
  }
  if (!readableQueries) throw new Error("Les projets du programme sont indisponibles avec vos accès Odoo.");
  if (deniedQueries) warnings.push("Une partie des recherches de projets est indisponible avec vos accès Odoo ; la couverture de la liste reste partielle.");

  const { missing, ambiguous, selected } = resolveProjectReferences(references, byId);
  if (missing.length) warnings.push(`${missing.length} projet(s) référencé(s) sont absents des données accessibles : ${missing.map(p => p.code || p.name).join(", ")}.`);
  if (ambiguous.length) warnings.push(`${ambiguous.length} référence(s) de projet sont ambiguës et restent exclues : ${ambiguous.map(p => p.code || p.name).join(", ")}.`);

  const dateFields = ["date_start", "date"].filter(name => ["date", "datetime"].includes(fields[name]?.type));
  const readDates = async names => {
    const rows = await rpc.read("project.project", [["id", "in", [...selected.keys()]]], ["id", ...names], options);
    if (!Array.isArray(rows)) throw new Error("Optional project dates unavailable");
    const seen = new Set();
    for (const row of rows) {
      if (!selected.has(row?.id) || seen.has(row.id)) continue;
      seen.add(row.id);
      for (const field of names) selected.get(row.id)[field === "date_start" ? "startDate" : "endDate"] =
        unitService.projectDate(row[field], fields[field].type);
    }
  };
  if (selected.size && dateFields.length) {
    try { await readDates(dateFields); }
    catch (_) {
      if (dateFields.length > 1) for (const field of dateFields) {
        try { await readDates([field]); }
        catch (_) { /* Unknown dates never replace catalogue membership. */ }
      }
    }
  }
  await unitService.enrichProjectBudgets(rpc, selected, fields);
  const projects = [...selected.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
  const incomplete = projects.filter(project => !project.startDate || !project.endDate).length;
  const reversed = projects.filter(project => project.startDate && project.endDate && project.endDate < project.startDate).length;
  if (incomplete) warnings.push(`${incomplete} projet(s) ont des dates absentes, invalides ou indisponibles ; leur durée ne peut pas être tracée complètement.`);
  if (reversed) warnings.push(`${reversed} projet(s) ont une fin antérieure au début ; leur durée ne peut pas être tracée.`);
  const programme = catalogue().programmes.find(item => item.id === programmeId);
  return { ok: true, programme, projects, warnings,
    coverage: { expected: references.length, matched: projects.length, missing, ambiguous, lookupComplete: deniedQueries === 0 },
    asOf: now.toISOString() };
}

module.exports = { catalogue, load, loadProjects, createProjectMap };

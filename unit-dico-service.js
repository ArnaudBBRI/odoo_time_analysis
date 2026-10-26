"use strict";

// This fixed catalogue uses only guarded metadata and project reads supplied by
// the server. It does not share the configurable legacy steering scope.
const UNIT = Object.freeze({ id: 206, name: "RESEARCH & DEVELOPMENT / DIGITAL CONSTRUCTION UNIT" });
const positiveId = value => Number.isSafeInteger(value) && value > 0 ? value : null;
const relationId = value => positiveId(Array.isArray(value) ? value[0] : value);
const cleanLabel = value => typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() : "";
const normalized = value => typeof value === "string" ? value.normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ") : "";

function responsibleField(definitions) {
  // The responsible-unit macro relation was verified on the user's example.
  // Translated labels and similarly named relations cannot select a substitute.
  const field = "lead_unit_id", definition = definitions[field];
  if (definition?.type !== "many2one" || definition.relation !== "hr.department") {
    throw new Error("Le champ Unit responsable est indisponible avec vos accès Odoo.");
  }
  return field;
}

function isExcludedProjectName(value) {
  const name = normalized(value).replace(/^(?:\[\d+\]|\d+)(?:\s*[-:·/]\s*|\s+)/, "").trim();
  return name === "interne" || name === "overhead";
}

function projectDate(value, type) {
  if (typeof value !== "string") return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const timestamp = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z)?$/.exec(value);
  if (!dateOnly && (type !== "datetime" || !timestamp
    || Number(timestamp[2]) > 23 || Number(timestamp[3]) > 59 || Number(timestamp[4]) > 59)) return null;
  const text = value.slice(0, 10), parsed = new Date(text + "T00:00:00Z");
  return Number(text.slice(0, 4)) > 0 && Number.isFinite(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === text ? text : null;
}

async function enrichProjectBudgets(rpc, projects, definitions, unitField = null) {
  for (const project of projects.values()) {
    project.totalBudget = { amount: null, currencyId: null, currency: null };
  }
  const projectIds = [...projects.keys()].filter(id => positiveId(id));
  if (!projectIds.length) return;
  if (definitions === undefined) {
    try { definitions = await rpc.fields("project.project"); }
    catch (_) { return; }
  }
  // The card's total is the complete convention macro amount, including BW
  // personnel. Annual allocations and the staffing-hours field are not substitutes.
  const fields = [];
  if (["float", "integer", "monetary"].includes(definitions?.total_budget_convention?.type)) fields.push("total_budget_convention");
  const budgetDefinition = definitions?.total_budget_convention;
  const compatibleCurrency = budgetDefinition?.type !== "monetary"
    || budgetDefinition.currency_field === undefined || budgetDefinition.currency_field === null
    || budgetDefinition.currency_field === false || budgetDefinition.currency_field === "currency_id";
  if (compatibleCurrency && definitions?.currency_id?.type === "many2one"
    && definitions.currency_id.relation === "res.currency") fields.push("currency_id");
  if (!fields.length) return;
  const requestedIds = new Set(projectIds);
  const domain = [["id", "in", projectIds], ...(unitField ? [[unitField, "=", UNIT.id]] : [])];
  const readFields = async names => {
    const requested = ["id", ...(unitField ? [unitField] : []), ...names];
    const rows = await rpc.read("project.project", domain, requested, { context: { active_test: false } });
    if (!Array.isArray(rows)) throw new Error("Optional project budget metadata is unavailable");
    const seen = new Set();
    for (const row of rows) {
      if (!row || !requestedIds.has(row.id) || seen.has(row.id)
        || unitField && relationId(row[unitField]) !== UNIT.id) continue;
      seen.add(row.id);
      const budget = projects.get(row.id).totalBudget;
      if (names.includes("total_budget_convention")) {
        budget.amount = typeof row.total_budget_convention === "number" && Number.isFinite(row.total_budget_convention)
          ? row.total_budget_convention : null;
      }
      if (names.includes("currency_id")) {
        budget.currencyId = relationId(row.currency_id);
        budget.currency = budget.currencyId && Array.isArray(row.currency_id)
          && typeof row.currency_id[1] === "string" && row.currency_id[1].trim() ? row.currency_id[1].trim() : null;
      }
    }
  };
  try { await readFields(fields); }
  catch (_) {
    if (fields.length > 1) {
      for (const field of fields) {
        try { await readFields([field]); }
        catch (_) { /* Keep an unreadable amount/currency unknown without losing the catalogue. */ }
      }
    }
  }
}

async function loadPartnerMap(rpc, projects, definitions, unitField) {
  const unavailable = { status: "unavailable", partners: [] };
  if (definitions?.bw_partner_ids?.type !== "many2many" || definitions.bw_partner_ids.relation !== "res.partner") return unavailable;
  const projectIds = [...projects.keys()].filter(id => positiveId(id)).sort((a, b) => a - b);
  if (!projectIds.length) return { status: "available", partners: [] };
  const domain = [["id", "in", projectIds], [unitField, "=", UNIT.id]];
  let rows;
  try {
    rows = await rpc.read("project.project", domain, ["id", unitField, "bw_partner_ids"], { context: { active_test: false } });
  } catch (_) { return unavailable; }
  if (!Array.isArray(rows)) return unavailable;
  const requested = new Set(projectIds), byProject = new Map();
  for (const row of rows) {
    if (!row || !requested.has(row.id) || relationId(row[unitField]) !== UNIT.id) continue;
    if (byProject.has(row.id) || !Object.hasOwn(row, "bw_partner_ids")) return unavailable;
    const value = row.bw_partner_ids;
    if (value === false || value === null) { byProject.set(row.id, []); continue; }
    if (!Array.isArray(value) || value.some(id => !positiveId(id))) return unavailable;
    byProject.set(row.id, [...new Set(value)].sort((a, b) => a - b));
  }
  if (byProject.size !== requested.size) return unavailable;
  const partnerIds = [...new Set([...byProject.values()].flat())].sort((a, b) => a - b);
  if (!partnerIds.length) return { status: "available", partners: [] };
  let partnerDefinitions, partnerRows;
  try {
    partnerDefinitions = await rpc.fields("res.partner");
    if (partnerDefinitions?.id?.type !== "integer" || !["char", "text"].includes(partnerDefinitions?.name?.type)) return unavailable;
    partnerRows = await rpc.read("res.partner", [["id", "in", partnerIds]], ["id", "name"], { context: { active_test: false } });
  } catch (_) { return unavailable; }
  if (!Array.isArray(partnerRows)) return unavailable;
  const names = new Map(), expectedPartners = new Set(partnerIds);
  for (const row of partnerRows) {
    if (!row || !expectedPartners.has(row.id)) continue;
    if (names.has(row.id)) return unavailable;
    const name = cleanLabel(row.name);
    if (!name || name.length > 160) return unavailable;
    names.set(row.id, name);
  }
  if (names.size !== expectedPartners.size) return unavailable;
  const partners = new Map(partnerIds.map(id => [id, { id, name: names.get(id), projectIds: [] }]));
  for (const projectId of projectIds) {
    for (const partnerId of byProject.get(projectId)) partners.get(partnerId).projectIds.push(projectId);
  }
  return { status: "available", partners: [...partners.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id) };
}

async function loadOrganismMap(rpc, projects, definitions, unitField) {
  const unavailable = { status: "unavailable", organisms: [] };
  if (definitions?.organism_id?.type !== "many2one" || definitions.organism_id.relation !== "res.partner") return unavailable;
  const projectIds = [...projects.keys()].filter(id => positiveId(id)).sort((a, b) => a - b);
  if (!projectIds.length) return { status: "available", organisms: [] };
  let rows;
  try {
    rows = await rpc.read("project.project", [["id", "in", projectIds], [unitField, "=", UNIT.id]],
      ["id", unitField, "organism_id"], { context: { active_test: false } });
  } catch (_) { return unavailable; }
  if (!Array.isArray(rows)) return unavailable;
  const requested = new Set(projectIds), byProject = new Map();
  for (const row of rows) {
    if (!row || !requested.has(row.id) || relationId(row[unitField]) !== UNIT.id) continue;
    if (byProject.has(row.id) || !Object.hasOwn(row, "organism_id")) return unavailable;
    const value = row.organism_id;
    if (value === false || value === null) { byProject.set(row.id, null); continue; }
    if (!Array.isArray(value) || value.length !== 2 || !positiveId(value[0]) || typeof value[1] !== "string") return unavailable;
    byProject.set(row.id, value[0]);
  }
  if (byProject.size !== requested.size) return unavailable;
  const organismIds = [...new Set([...byProject.values()].filter(id => id !== null))].sort((a, b) => a - b);
  if (!organismIds.length) return { status: "available", organisms: [] };
  let organismRows;
  try {
    const organismDefinitions = await rpc.fields("res.partner");
    if (organismDefinitions?.id?.type !== "integer" || !["char", "text"].includes(organismDefinitions?.name?.type)) return unavailable;
    organismRows = await rpc.read("res.partner", [["id", "in", organismIds]], ["id", "name"], { context: { active_test: false } });
  } catch (_) { return unavailable; }
  if (!Array.isArray(organismRows)) return unavailable;
  const expected = new Set(organismIds), organisms = new Map();
  for (const row of organismRows) {
    if (!row || !expected.has(row.id)) continue;
    const name = cleanLabel(row.name);
    if (organisms.has(row.id) || !name || name.length > 160) return unavailable;
    organisms.set(row.id, { id: row.id, name, projectIds: [] });
  }
  if (organisms.size !== expected.size) return unavailable;
  for (const [projectId, organismId] of byProject) {
    if (organismId !== null) organisms.get(organismId).projectIds.push(projectId);
  }
  for (const organism of organisms.values()) organism.projectIds.sort((a, b) => a - b);
  return { status: "available", organisms: [...organisms.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id) };
}

async function load(rpc, now = new Date()) {
  let definitions;
  try { definitions = await rpc.fields("project.project"); }
  catch (_) { throw new Error("Les informations des projets de l’unité DiCo sont indisponibles avec vos accès Odoo."); }
  if (!definitions || typeof definitions !== "object" || Array.isArray(definitions)) {
    throw new Error("Les informations des projets de l’unité DiCo sont indisponibles avec vos accès Odoo.");
  }
  const field = responsibleField(definitions);
  if (definitions.id?.type !== "integer" || !["char", "text"].includes(definitions.name?.type)) {
    throw new Error("Les identités des projets de l’unité DiCo sont indisponibles avec vos accès Odoo.");
  }
  const dateFields = ["date_start", "date"].filter(name => ["date", "datetime"].includes(definitions[name]?.type));
  const hasDisplayName = ["char", "text"].includes(definitions.display_name?.type);
  const coreFields = ["id", "name", field];
  const requested = [...coreFields, ...(hasDisplayName ? ["display_name"] : []), ...dateFields];
  const options = { order: "name asc, id asc", context: { active_test: false } };
  const domain = [[field, "=", UNIT.id]], warnings = [];
  const scoped = (rows, fields) => {
    if (!Array.isArray(rows)) throw new Error("Invalid project catalogue response");
    return rows.filter(row => row && positiveId(row.id) && relationId(row[field]) === UNIT.id)
      .map(row => Object.fromEntries(fields.map(name => [name, row[name]])));
  };
  let rows, needsDateRecovery = false;
  try { rows = scoped(await rpc.read("project.project", domain, requested, options), requested); }
  catch (_) {
    if (requested.length === coreFields.length) throw new Error("Les projets de l’unité DiCo sont indisponibles avec vos accès Odoo.");
    try { rows = scoped(await rpc.read("project.project", domain, coreFields, options), coreFields); }
    catch (_) { throw new Error("Les projets de l’unité DiCo sont indisponibles avec vos accès Odoo."); }
    needsDateRecovery = true;
    warnings.push("Certaines informations facultatives des projets sont indisponibles avec vos accès Odoo.");
  }
  const identities = new Map();
  for (const row of rows) {
    if (isExcludedProjectName(row.name) || isExcludedProjectName(row.display_name)) continue;
    if (!identities.has(row.id)) identities.set(row.id, { ...row });
  }
  if (needsDateRecovery && identities.size) {
    const ids = [...identities.keys()];
    for (const dateField of dateFields) {
      try {
        const recoveryFields = ["id", field, dateField];
        const recovered = scoped(await rpc.read("project.project", [["id", "in", ids], ...domain],
          recoveryFields, options), recoveryFields);
        const seen = new Set();
        for (const row of recovered) {
          if (identities.has(row.id) && !seen.has(row.id)) {
            identities.get(row.id)[dateField] = row[dateField]; seen.add(row.id);
          }
        }
      } catch (_) {
        // Dates are optional: never discard known project identities on denial.
      }
    }
  }
  let incompleteDates = 0, reversedDates = 0;
  const projects = [...identities.values()].map(row => {
    const startDate = dateFields.includes("date_start") ? projectDate(row.date_start, definitions.date_start.type) : null;
    const endDate = dateFields.includes("date") ? projectDate(row.date, definitions.date.type) : null;
    if (!startDate || !endDate) incompleteDates++;
    else if (endDate < startDate) reversedDates++;
    const name = typeof row.display_name === "string" && row.display_name.trim() ? row.display_name.trim()
      : typeof row.name === "string" && row.name.trim() ? row.name.trim() : `Projet ${row.id}`;
    return { id: row.id, name, startDate, endDate, manager: null };
  }).sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
  const projectMap = new Map(projects.map(project => [project.id, project]));
  await enrichProjectBudgets(rpc, projectMap, definitions, field);
  // The partner option is temporarily hidden, so its optional reads are suspended.
  const partnerMap = { status: "unavailable", partners: [] };
  const organismMap = await loadOrganismMap(rpc, projectMap, definitions, field);
  if (incompleteDates) warnings.push(`${incompleteDates} projet(s) ont des dates absentes, invalides ou indisponibles ; leur durée ne peut pas être tracée complètement.`);
  if (reversedDates) warnings.push(`${reversedDates} projet(s) ont une fin antérieure au début ; leur durée ne peut pas être tracée.`);
  return { ok: true, unit: { ...UNIT }, responsibleField: field, projects, partnerMap, organismMap, warnings, asOf: now.toISOString() };
}

module.exports = { UNIT, load, responsibleField, isExcludedProjectName, projectDate, enrichProjectBudgets, loadPartnerMap, loadOrganismMap };

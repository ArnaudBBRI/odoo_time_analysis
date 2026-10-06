"use strict";
const S = require("./steering");
const FIELDS = {
  staffing: ["bw.staffing.convention", ["id", "project_id", "employee_id", "employee_nick", "role_id", "staffing_date_start", "staffing_end_date", "staffing_hours"]],
  planning: ["planning.slot", ["id", "project_id", "employee_id", "role_id", "start_datetime", "end_datetime", "allocated_hours"]],
  budgets: ["budget.analytic", ["id", "project_id", "budget_line_ids", "budget_template", "date_from", "date_to", "currency_id", "sum_of_budgeted_amount", "total_budget_contract_bw", "sum_accounts_60", "sum_accounts_61", "sum_accounts_63", "sum_accounts_64", "sum_accounts_65"]],
  impact: ["bw.project.portfolio.link", ["id", "project_id", "name", "display_name", "portfolio_percentage"]],
  milestones: ["project.milestone", ["id", "project_id", "name", "deadline", "is_reached"]],
  timesheets: ["account.analytic.line", ["id", "project_id", "employee_id", "role_id", "date", "unit_amount"]],
  tasks: ["project.task", ["id", "project_id", "parent_id", "parent_task_id", "work_package_task_id", "work_package_id", "workpackage_id", "is_workpackage", "is_work_package", "date_start", "date_end", "planned_date_begin", "planned_date_end"]]
};
const LINE_FIELDS = ["id", "budget_analytic_id", "project_id", "x_plan7_id", "x_plan8_id", "currency_id", "budget_amount", "achieved_amount", "committed_amount", "on_approval", "balance"];
const unavailable = (model, reason) => ({ model, status: "unavailable", rows: [], reason });
function validateProgrammes(value = []) {
  if (!Array.isArray(value)) throw new Error("pilotage.programmes doit être une liste.");
  const seen = new Set();
  return value.map(row => {
    if (!row || typeof row.id !== "string" || !row.id.trim() || seen.has(row.id) || typeof row.name !== "string" || !row.name.trim() || !Array.isArray(row.projectIds) || row.projectIds.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error("Référentiel programmes invalide (id unique, nom, projectIds entiers positifs).");
    seen.add(row.id);
    return { id: row.id, name: row.name, projectIds: [...new Set(row.projectIds)] };
  });
}
async function validateScope(config, definitions, rpc) {
  if (config.unitConfirmed !== true || !Array.isArray(config.unitDomain) || !config.unitDomain.length) return "Configurer et confirmer le filtre de l’unité DiCo dans config.local.json (pilotage).";
  // AND conditions only; no arbitrary client-supplied domain, method or field execution.
  for (const condition of config.unitDomain) {
    if (!Array.isArray(condition) || condition.length !== 3) return "Le filtre DiCo doit contenir des conditions AND explicites.";
    const [field, operator, value] = condition;
    if (typeof field !== "string" || !/^[a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)*$/.test(field) || /TODO/i.test(field) || !["=", "in"].includes(operator)) return "Champ ou opérateur DiCo invalide.";
    const values = operator === "in" ? value : [value];
    if (!Array.isArray(values) || !values.length || values.some(v => !(typeof v === "string" && v.trim()) && !(Number.isSafeInteger(v) && v > 0))) return "Valeurs DiCo invalides.";
    let manifest = definitions, definition;
    const parts = field.split(".");
    for (let index = 0; index < parts.length; index++) {
      definition = manifest[parts[index]];
      if (!definition) return `Champ DiCo non disponible : ${field}`;
      if (index < parts.length - 1) {
        if (!["many2one", "many2many"].includes(definition.type) || !definition.relation) return `Relation DiCo invalide : ${field}`;
        manifest = await rpc.fields(definition.relation);
      }
    }
    if (!["many2one", "many2many", "char", "selection"].includes(definition.type)) return `Type DiCo non pris en charge : ${field}`;
  }
  return null;
}
async function metadata(config, rpc) {
  const definitions = await rpc.fields("project.project");
  const programmes = validateProgrammes(config.programmes);
  const scopeError = await validateScope(config, definitions, rpc);
  const leaderField = config.projectLeaderField || "user_id";
  const leaderDefinition = definitions[leaderField];
  const leaderAvailable = ["many2one", "many2many"].includes(leaderDefinition?.type) && leaderDefinition.relation === "res.users";
  return { enabled: !scopeError, reason: scopeError, unit: "DiCo", programmes, leader: { field: leaderField, label: leaderDefinition?.string || leaderField, available: leaderAvailable },
    unitCandidates: Object.entries(definitions).filter(([name, def]) => /unit|responsib|department|afdeling|unité|equipe|team/i.test(`${name} ${def.string}`) && ["many2one", "many2many", "char", "selection"].includes(def.type)).map(([name, def]) => ({ name, label: def.string || name, type: def.type, relation: def.relation || null })), definitions };
}
async function related(key, projectIds, rpc) {
  const [model, requested] = FIELDS[key];
  if (!projectIds.length) return { model, status: "available", rows: [] };
  try {
    const definitions = await rpc.fields(model);
    if (definitions.project_id?.relation !== "project.project") throw new Error("Relation directe au projet absente ; aucune lecture non filtrée.");
    const required = { staffing: ["staffing_hours"], planning: ["allocated_hours", "start_datetime", "end_datetime"], timesheets: ["date", "unit_amount"], budgets: ["budget_template", "budget_line_ids"] }[key] || [];
    if (required.some(field => !definitions[field])) throw new Error("Champs nécessaires indisponibles.");
    const rows = await rpc.read(model, [["project_id", "in", projectIds]], requested.filter(field => definitions[field]));
    const allowed = new Set(projectIds);
    return { model, status: "available", rows: rows.filter(row => allowed.has(S.id(row.project_id))), definitions };
  } catch (_) { return unavailable(model, "Modèle, champs ou accès indisponibles pour le compte connecté."); }
}
async function budgetLines(parents, rpc) {
  const model = "budget.line";
  if (parents.status !== "available") return unavailable(model, "Budgets parents indisponibles.");
  const ids = [...new Set(parents.rows.filter(row => ["convention", "annual"].includes(row.budget_template)).flatMap(row => Array.isArray(row.budget_line_ids) ? row.budget_line_ids : []))];
  if (!ids.length) return { model, status: "available", rows: [] };
  try {
    const definitions = await rpc.fields(model);
    const rows = await rpc.read(model, [["id", "in", ids]], LINE_FIELDS.filter(field => definitions[field]));
    const allowed = new Set(ids);
    return { model, status: "available", rows: rows.filter(row => allowed.has(row.id)) };
  } catch (_) { return unavailable(model, "Lignes budgétaires indisponibles pour le compte connecté."); }
}
async function progress(projectIds, rpc, task = false) {
  const model = S.PROGRESS_MODEL;
  if (!projectIds.length) return { model, status: "available", rows: [], taskField: null };
  try {
    const definitions = await rpc.fields(model);
    for (const field of ["effective_hours", "allocated_hours", "convention_time"]) if (!["float", "integer", "monetary"].includes(definitions[field]?.type)) throw new Error("Mesure absente.");
    if (definitions.project_id?.relation !== "project.project" || definitions.employee_id?.relation !== "hr.employee" || !definitions.role_id) throw new Error("Dimensions Progress absentes.");
    const taskField = task ? S.TASK_FIELDS.find(field => definitions[field]?.type === "many2one" && definitions[field].relation === "project.task") : null;
    if (task && !taskField) throw new Error("Relation task/WP absente.");
    const groupby = taskField ? ["project_id", taskField, "role_id", "employee_id"] : ["project_id", "role_id", "employee_id"];
    // Fixed hours-only aggregation; never accept generic read_group input from HTTP.
    const rows = await rpc.group(model, [["project_id", "in", projectIds]], {
      fields: ["effective_hours:sum", "allocated_hours:sum", "convention_time:sum"], groupby, lazy: false,
      context: { active_model: "project.project", active_id: projectIds[0], active_ids: [projectIds[0]], active_test: false }
    });
    if (!Array.isArray(rows)) throw new Error("Réponse Progress invalide.");
    const allowed = new Set(projectIds);
    return { model, status: "available", rows: rows.filter(row => allowed.has(S.id(row.project_id))), taskField };
  } catch (_) { return unavailable(model, task ? "Agrégation task/WP non disponible." : "Agrégation Progress non disponible pour le compte connecté."); }
}
async function load(config, rpc, uid, projectId = null) {
  const meta = await metadata(config, rpc);
  if (!meta.enabled) return { ok: true, ...publicMetadata(meta), projects: [], asOf: new Date().toISOString() };
  const domain = config.unitDomain.map(row => [...row]);
  if (projectId !== null) domain.push(["id", "=", projectId]);
  const fields = ["id", "name", "display_name", "active", "user_id", "stage_id", "date_start", "date", "effective_hours", "write_date", meta.leader.field].filter(field => meta.definitions[field]);
  const records = await rpc.read("project.project", domain, [...new Set(fields)]);
  const unique = [...new Map(records.filter(row => Number.isSafeInteger(row.id) && row.id > 0 && (projectId === null || row.id === projectId)).map(row => [row.id, row])).values()];
  if (projectId !== null && !unique.length) return { ok: false, notFound: true, error: "Projet absent du périmètre DiCo accessible." };
  const ids = unique.map(row => row.id), asOf = new Date().toISOString();
  const datasets = Object.fromEntries(await Promise.all(["staffing", "planning", "budgets", "impact", "milestones"].map(async key => [key, await related(key, ids, rpc)])));
  datasets.budgetLines = await budgetLines(datasets.budgets, rpc);
  const projects = unique.map(record => ({ ...S.normalizeProject(record, datasets, meta.programmes, asOf),
    isLeader: !meta.leader.available ? null : meta.definitions[meta.leader.field].type === "many2many" ? (Array.isArray(record[meta.leader.field]) ? record[meta.leader.field].includes(uid) : false) : S.id(record[meta.leader.field]) === uid,
    leaderSource: `project.project.${meta.leader.field}` }));
  if (projectId !== null) {
    const extras = await Promise.all([related("timesheets", ids, rpc), progress(ids, rpc), related("tasks", ids, rpc), progress(ids, rpc, true)]);
    [datasets.timesheets, datasets.progress, datasets.tasks, datasets.wpProgress] = extras;
    return { ok: true, ...publicMetadata(meta), asOf, project: S.buildDetail(projects[0], datasets, datasets.wpProgress.taskField, datasets.tasks.definitions || {}) };
  }
  return { ok: true, ...publicMetadata(meta), asOf, projects,
    unitSummary: S.consolidate(projects), programmeSummaries: meta.programmes.map(programme => ({ id: programme.id, name: programme.name, ...S.consolidate(projects.filter(project => project.assignment.programmeId === programme.id)) })),
    scope: { accessibleOnly: true, domain, projectCount: projects.length, note: "Projets DiCo visibles avec les permissions du compte connecté ; les projets masqués par Odoo ne peuvent pas être comptés." } };
}
function publicMetadata(meta) { const { definitions, ...publicValue } = meta; return publicValue; }
module.exports = { metadata, publicMetadata, load, validateScope, validateProgrammes, progress };

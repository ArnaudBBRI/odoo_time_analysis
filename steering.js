(function () {
"use strict";

// Pure calculations. Missing values never become zero; monetary periods stay separate.
const TOLERANCE = 0.05;
const PROGRESS_MODEL = "bw.open.plannning.slot";
const TASK_FIELDS = ["work_package_task_id", "work_package_id", "workpackage_id", "task_id", "generic_task_id", "parent_task_id"];
const number = value => typeof value === "number" && Number.isFinite(value) ? value : null;
const id = value => Array.isArray(value) ? Number(value[0]) : Number.isSafeInteger(value) ? value : null;
const label = value => Array.isArray(value) ? String(value[1] || value[0]) : typeof value === "string" ? value : null;
const round = value => value === null ? null : Math.round(value * 10000) / 10000;
const difference = (a, b) => number(a) === null || number(b) === null ? null : round(a - b);
const ratio = (a, b) => number(a) === null || number(b) === null || b <= 0 ? null : round(a / b * 100);
function sum(rows, field) {
  if (!rows.every(row => number(row[field]) !== null)) return null;
  return round(rows.reduce((total, row) => total + row[field], 0));
}
function timestamp(value, endOfDay = false) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:$|[ T])/.test(value)) return null;
  const calendarDate = new Date(value.slice(0, 10) + "T00:00:00Z");
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== value.slice(0, 10)) return null;
  const date = value.length === 10 ? value + (endOfDay ? "T23:59:59.999Z" : "T00:00:00Z") : value.replace(" ", "T") + (/Z$|[+-]\d\d:\d\d$/.test(value) ? "" : "Z");
  const time = Date.parse(date);
  return Number.isFinite(time) ? time : null;
}
function splitPeriod(start, end, hours, now) {
  const from = timestamp(start), to = timestamp(end, true);
  if (number(hours) === null || from === null || to === null || to <= from) return { elapsed: null, future: null, fraction: null };
  const fraction = Math.max(0, Math.min(1, (now - from) / (to - from)));
  return { elapsed: round(hours * fraction), future: round(hours * (1 - fraction)), fraction };
}
function assignment(projectId, programmes) {
  const matches = programmes.filter(programme => programme.projectIds.includes(projectId));
  return { status: matches.length > 1 ? "multiple" : matches.length ? "assigned" : "unassigned", programmeId: matches.length === 1 ? matches[0].id : null };
}
function normalizeProject(record, datasets, programmes, asOf) {
  const now = Date.parse(asOf), pid = record.id;
  const source = key => datasets[key] || { status: "unavailable", rows: [], reason: "Source non chargée" };
  const own = key => source(key).rows.filter(row => id(row.project_id) === pid);
  const staffing = own("staffing"), planning = own("planning");
  const convention = source("staffing").status === "available" ? sum(staffing, "staffing_hours") : null;
  const actual = number(record.effective_hours);
  const planned = source("planning").status === "available" ? sum(planning, "allocated_hours") : null;
  const planningParts = planning.map(slot => splitPeriod(slot.start_datetime, slot.end_datetime, slot.allocated_hours, now));
  const conventionParts = staffing.map(row => splitPeriod(row.staffing_date_start, row.staffing_end_date, row.staffing_hours, now));
  const elapsedPlan = planned === null ? null : sum(planningParts, "elapsed");
  const futurePlan = planned === null ? null : sum(planningParts, "future");
  const theoretical = convention === null ? null : sum(conventionParts, "elapsed");
  const ends = planning.map(row => timestamp(row.end_datetime, true)).filter(value => value !== null);
  const starts = planning.map(row => timestamp(row.start_datetime)).filter(value => value !== null);
  const horizonStart = starts.length && starts.length === planning.length ? new Date(Math.min(...starts)).toISOString() : null;
  const horizonEnd = ends.length && ends.length === planning.length ? new Date(Math.max(...ends)).toISOString() : null;
  const end = timestamp(record.date, true);
  const horizonCoversEnd = end === null || !horizonEnd ? null : Date.parse(horizonEnd) >= end;
  const remainingConvention = difference(convention, actual);
  const schedule = splitPeriod(record.date_start, record.date, 100, now).elapsed;
  const consumption = ratio(actual, convention);
  const qualities = Object.entries(datasets).map(([name, dataset]) => ({ name, status: dataset.status, reason: dataset.reason || null, source: dataset.model }));
  const budgets = buildBudgets(own("budgets"), source("budgetLines"), asOf);
  const milestones = own("milestones").map(row => ({ id: row.id, name: row.name || `Jalon ${row.id}`, deadline: row.deadline || null, reached: typeof row.is_reached === "boolean" ? row.is_reached : null }));
  const impact = own("impact").map(row => ({ id: row.id, name: row.name || row.display_name || `Trajet ${row.id}`, coefficient: number(row.portfolio_percentage), percent: number(row.portfolio_percentage) === null ? null : round(row.portfolio_percentage * 100) }));
  const impactTotal = source("impact").status === "available" ? sum(impact, "percent") : null;
  const warnings = [];
  if (actual === null) warnings.push({ title: "Réalisé cumulé indisponible", value: null, basis: "project.project.effective_hours", limitation: "Aucun total d’imputations visibles ne remplace le total projet." });
  if (remainingConvention !== null && remainingConvention < 0) warnings.push({ title: "Convention dépassée", value: remainingConvention, basis: "Convention − réalisé cumulé (h)", limitation: "Consommation de ressources, pas avancement des livrables." });
  if (horizonCoversEnd === false) warnings.push({ title: "Planning plus court que le projet", value: horizonEnd, basis: `Fin du projet : ${record.date}`, limitation: "Un planning limité ne couvre pas toute la durée du projet." });
  if (impactTotal !== null && Math.abs(impactTotal - 100) > 0.05) warnings.push({ title: "Répartition des trajets à vérifier", value: impactTotal, basis: "Somme des coefficients × 100 (%)", limitation: "Aucune normalisation automatique." });
  for (const milestone of milestones) if (milestone.reached === false && timestamp(milestone.deadline, true) !== null && timestamp(milestone.deadline, true) < now) warnings.push({ title: "Jalon échu non atteint", value: milestone.name, basis: `project.milestone : ${milestone.deadline}`, limitation: "Statut Odoo ; livraison à confirmer." });
  const assigned = assignment(pid, programmes);
  for (const budget of budgets) {
    if (budget.quality !== "reconciled") warnings.push({ title: "Budget non réconcilié", value: budget.gap, basis: `budget.analytic ${budget.id} / budget.line · ${budget.start || "période absente"}`, limitation: "Exclu de la consolidation financière ; lignes visibles dans la fiche." });
    for (const category of budget.categories) if (category.balance !== null && category.balance < 0) warnings.push({ title: "Solde de rubrique négatif", value: category.balance, basis: `${category.category} · ${budget.type} · ${budget.currency || "devise inconnue"}`, limitation: "Les soldes positifs d’autres rubriques ne compensent pas ce signal." });
  }
  if (assigned.status !== "assigned") warnings.push({ title: assigned.status === "multiple" ? "Affectations programme multiples" : "Projet non affecté", value: pid, basis: "Référentiel local des programmes", limitation: assigned.status === "multiple" ? "Exclu des consolidations par programme ; conservé dans l’unité." : "Conservé dans le total unité." });
  return { id: pid, name: String(record.display_name || record.name || pid), active: record.active !== false,
    owner: { id: id(record.user_id), name: label(record.user_id) || "Indisponible" }, stage: label(record.stage_id) || (record.active === false ? "Archivé" : "Indisponible"),
    start: record.date_start || null, end: record.date || null, writeDate: record.write_date || null, assignment: assigned,
    hours: { actual, convention, planned, elapsedPlan, futurePlan, theoreticalConventionToDate: theoretical, remainingConvention,
      remainingPlan: difference(planned, actual), remainingPlanGap: difference(futurePlan, remainingConvention), consumption,
      scheduleElapsedPercent: schedule, paceGap: difference(consumption, schedule), horizonStart, horizonEnd, horizonCoversEnd },
    budgets, milestones, impact, impactTotal, qualities, warnings,
    sources: { actual: "project.project.effective_hours", convention: "bw.staffing.convention.staffing_hours", planned: "planning.slot.allocated_hours" },
    asOf };
}

function buildBudgets(parents, linesDataset, asOf) {
  return parents.filter(parent => ["convention", "annual"].includes(parent.budget_template)).map(parent => {
    const referenced = Array.isArray(parent.budget_line_ids) ? new Set(parent.budget_line_ids) : null;
    const lines = linesDataset.rows.filter(row => referenced ? referenced.has(row.id) : id(row.budget_analytic_id) === parent.id);
    const usable = linesDataset.status === "available" && referenced !== null && referenced.size === lines.length;
    const category = row => parent.budget_template === "annual" ? label(row.x_plan8_id) : label(row.x_plan7_id);
    const normalized = lines.map(row => ({ id: row.id, category: category(row) || "Non classé", accountCode: (category(row) || "").match(/^\s*(\d{4})\b/)?.[1] || null,
      budgeted: number(row.budget_amount), approval: number(row.on_approval), committed: number(row.committed_amount), consumed: number(row.achieved_amount), balance: number(row.balance), currencyId: id(row.currency_id) || id(parent.currency_id) }));
    const sameCurrency = id(parent.currency_id) !== null && normalized.every(row => row.currencyId === id(parent.currency_id));
    const envelope = parent.budget_template === "annual" ? normalized.filter(row => row.accountCode?.startsWith("6")) : normalized;
    const knownClassification = parent.budget_template !== "annual" || normalized.every(row => row.accountCode && /^[679]/.test(row.accountCode));
    const ready = usable && sameCurrency && knownClassification;
    const totals = Object.fromEntries(["budgeted", "approval", "committed", "consumed", "balance"].map(field => [field, ready ? sum(envelope, field) : null]));
    const detailBudget = usable ? sum(normalized, "budgeted") : null;
    const netAnnual = parent.budget_template === "annual" && usable && knownClassification && normalized.every(row => row.budgeted !== null) && normalized.filter(row => row.accountCode.startsWith("9")).every(row => row.budgeted === 0) ? round(normalized.reduce((total, row) => total + (row.accountCode.startsWith("7") ? row.budgeted : row.accountCode.startsWith("6") ? -row.budgeted : 0), 0)) : null;
    const comparison = parent.budget_template === "annual" ? netAnnual : detailBudget;
    const gap = difference(comparison, number(parent.sum_of_budgeted_amount));
    const controlled = ["60", "61", "63", "64", "65"].map(prefix => {
      const amount = usable && sameCurrency && knownClassification ? sum(normalized.filter(row => row.accountCode?.startsWith(prefix)), "budgeted") : null;
      const parentAmount = number(parent[`sum_accounts_${prefix}`]);
      return { prefix, amount, parentAmount, gap: difference(amount, parentAmount) };
    });
    const controlledStatus = parent.budget_template !== "annual" ? "not-applicable" : controlled.some(row => row.gap === null) ? "not-checkable" : controlled.every(row => Math.abs(row.gap) <= TOLERANCE) ? "reconciled" : "not-reconciled";
    const period = splitPeriod(parent.date_from, parent.date_to, 100, Date.parse(asOf));
    return { id: parent.id, type: parent.budget_template, start: parent.date_from || null, end: parent.date_to || null,
      currencyId: id(parent.currency_id), currency: label(parent.currency_id), totals, categories: normalized,
      periodElapsedPercent: period.elapsed, consumedPercent: ratio(totals.consumed, totals.budgeted),
      quality: !ready ? "partial" : gap === null || (parent.budget_template === "annual" && controlledStatus === "not-checkable") ? "not-checkable" : Math.abs(gap) <= TOLERANCE && (parent.budget_template !== "annual" || controlledStatus === "reconciled") ? "reconciled" : "not-reconciled", gap, controlled, controlledStatus,
      parentTotal: number(parent.sum_of_budgeted_amount), contractTotal: number(parent.total_budget_contract_bw),
      limitation: parent.budget_template === "annual" ? "Enveloppe des dépenses 6xxx ; le net recettes − dépenses est un contrôle distinct. Les ajustements 9xxx non nuls empêchent la réconciliation automatique." : "Montants des lignes Odoo uniquement ; la complétude des coûts de personnel n’est pas confirmée. Les coûts de personnel ne sont pas déduits des heures. Commandé et consommé ne s’additionnent pas." };
  });
}

function consolidate(projects) {
  const metrics = {};
  for (const key of ["actual", "convention", "planned", "remainingConvention", "remainingPlan", "elapsedPlan", "futurePlan"]) {
    const contributors = projects.filter(project => number(project.hours[key]) !== null);
    metrics[key] = { value: contributors.length ? round(contributors.reduce((total, project) => total + project.hours[key], 0)) : null, covered: contributors.length, total: projects.length, projectIds: contributors.map(project => project.id), basis: "Cumul projet / horizon disponible, sans découpage annuel" };
  }
  const pairs = projects.filter(project => number(project.hours.actual) !== null && number(project.hours.convention) !== null);
  metrics.consumption = { value: ratio(sum(pairs.map(p => ({ value: p.hours.actual })), "value"), sum(pairs.map(p => ({ value: p.hours.convention })), "value")), covered: pairs.length, total: projects.length, projectIds: pairs.map(p => p.id), basis: "Σ réalisé / Σ convention sur les mêmes projets" };
  const groups = new Map();
  for (const project of projects) for (const budget of project.budgets) {
    const key = JSON.stringify([budget.type, budget.currencyId, budget.start, budget.end]);
    if (!groups.has(key)) groups.set(key, { type: budget.type, currency: budget.currency, currencyId: budget.currencyId, start: budget.start, end: budget.end, entries: [] });
    groups.get(key).entries.push({ project, budget });
  }
  const budgets = [...groups.values()].map(group => {
    const counts = new Map();
    for (const entry of group.entries) counts.set(entry.project.id, (counts.get(entry.project.id) || 0) + 1);
    const valid = group.entries.filter(entry => counts.get(entry.project.id) === 1 && entry.budget.quality === "reconciled" && group.currencyId !== null && timestamp(group.start) !== null && timestamp(group.end, true) !== null && timestamp(group.end, true) >= timestamp(group.start));
    return { type: group.type, currency: group.currency, start: group.start, end: group.end,
      totals: Object.fromEntries(["budgeted", "approval", "committed", "consumed", "balance"].map(field => [field, valid.length ? sum(valid.map(entry => entry.budget.totals), field) : null])),
      covered: valid.length, total: group.entries.length, projectIds: [...new Set(valid.map(entry => entry.project.id))], excludedProjectIds: [...new Set(group.entries.filter(entry => !valid.includes(entry)).map(entry => entry.project.id))], ambiguousProjectIds: [...counts].filter(([, count]) => count > 1).map(([id]) => id) };
  });
  return { projectIds: projects.map(p => p.id), metrics, budgets,
    quality: { projects: projects.length, withActual: metrics.actual.covered, withConvention: metrics.convention.covered, withPlanning: metrics.planned.covered, issues: projects.filter(p => p.warnings.length || p.qualities.some(q => q.status !== "available")).map(p => p.id) } };
}

function buildDetail(project, datasets, taskField, taskDefs) {
  const own = key => (datasets[key]?.rows || []).filter(row => id(row.project_id) === project.id);
  const available = key => datasets[key]?.status === "available";
  const visible = available("timesheets") ? sum(own("timesheets"), "unit_amount") : null;
  const progress = own("progress"), actual = available("progress") ? sum(progress, "effective_hours") : null;
  const gap = difference(actual, project.hours.actual);
  const reconciled = gap !== null && Math.abs(gap) <= TOLERANCE;
  const monthly = new Map();
  for (const row of own("timesheets")) {
    if (timestamp(row.date) === null || number(row.unit_amount) === null) continue;
    const month = row.date.slice(0, 7);
    monthly.set(month, (monthly.get(month) || 0) + row.unit_amount);
  }
  const persons = new Map();
  function person(row, fallback = "Non affecté") {
    const employeeId = id(row.employee_id), name = label(row.employee_id) || row.employee_nick || fallback;
    const key = employeeId !== null ? `employee:${employeeId}` : `collective:${name}`;
    if (!persons.has(key)) persons.set(key, { key, employeeId, name, collective: /^TH_/.test(name), roles: [], actual: null, convention: null, planned: null, staffed: false, planning: false, imputing: false });
    const entry = persons.get(key), role = label(row.role_id);
    if (role && !entry.roles.includes(role)) entry.roles.push(role);
    return entry;
  }
  for (const row of own("staffing")) { const p = person(row); p.convention = number(row.staffing_hours) === null || (p.staffed && p.convention === null) ? null : (p.convention || 0) + row.staffing_hours; p.staffed = true; }
  for (const row of own("planning")) { const p = person(row); p.planned = number(row.allocated_hours) === null || (p.planning && p.planned === null) ? null : (p.planned || 0) + row.allocated_hours; p.planning = true; }
  if (reconciled) for (const row of progress) { const p = person(row); p.actual = (p.actual || 0) + row.effective_hours; p.imputing ||= row.effective_hours !== 0; }
  const conventionGap = difference(available("progress") ? sum(progress, "convention_time") : null, project.hours.convention), plannedGap = difference(available("progress") ? sum(progress, "allocated_hours") : null, project.hours.planned);
  const comparisonComplete = reconciled && available("staffing") && available("planning") && conventionGap !== null && Math.abs(conventionGap) <= TOLERANCE && plannedGap !== null && Math.abs(plannedGap) <= TOLERANCE && progress.every(row => id(row.employee_id) !== null || row.effective_hours === 0) && own("staffing").every(row => id(row.employee_id) !== null || /^TH_/.test(row.employee_nick || "")) && own("planning").every(row => id(row.employee_id) !== null);
  if (comparisonComplete) for (const person of persons.values()) if (person.actual === null && !person.collective) person.actual = 0;
  const population = comparisonComplete ? {
    staffedWithoutActual: [...persons.values()].filter(p => p.staffed && !p.collective && !p.imputing).map(p => p.key),
    planningWithoutActual: [...persons.values()].filter(p => p.planning && !p.collective && !p.imputing).map(p => p.key),
    actualWithoutStaffing: [...persons.values()].filter(p => p.imputing && !p.staffed).map(p => p.key),
    actualWithoutPlanning: [...persons.values()].filter(p => p.imputing && !p.planning).map(p => p.key)
  } : null;
  const horizonStart = timestamp(project.hours.horizonStart), horizonEnd = timestamp(project.hours.horizonEnd), now = Date.parse(project.asOf);
  const comparableActual = available("timesheets") && horizonStart !== null && horizonEnd !== null ? sum(own("timesheets").filter(row => { const date = timestamp(row.date); return date !== null && date >= horizonStart && date <= Math.min(horizonEnd, now); }), "unit_amount") : null;
  const diagnostic = { visibleActual: visible, visibleCoverage: ratio(visible, project.hours.actual), visibleGap: difference(visible, project.hours.actual),
    progressActual: actual, progressGap: gap, progressConventionGap: conventionGap, progressPlanningGap: plannedGap, progressStatus: reconciled ? "reconciled" : gap === null ? "unavailable" : "not-reconciled",
    actualInPlanningWindow: comparableActual, elapsedPlanDeviation: difference(comparableActual, project.hours.elapsedPlan),
    comparisonBasis: "Imputations visibles dans l’horizon du planning, jusqu’au chargement ; diagnostic partiel si visibilité non réconciliée.",
    monthly: [...monthly].sort(([a], [b]) => a.localeCompare(b)).map(([month, hours]) => ({ month, hours: round(hours) })) };
  return { ...project, diagnostic, people: [...persons.values()], population,
    workPackages: buildWorkPackages(project, datasets, taskField, taskDefs, reconciled),
    detailSources: Object.entries(datasets).map(([name, data]) => ({ name, source: data.model, status: data.status, reason: data.reason || null })) };
}

function buildWorkPackages(project, datasets, taskField, defs, progressReconciled) {
  const unavailable = reason => ({ status: "unavailable", reason, rows: [] });
  if (!taskField || datasets.wpProgress?.status !== "available" || datasets.tasks?.status !== "available") return unavailable("Relation task/WP ou source indisponible.");
  if (!progressReconciled) return unavailable("Le total Progress ne correspond pas au réalisé du projet.");
  const flags = ["is_workpackage", "is_work_package"].filter(field => defs[field]?.type === "boolean");
  if (!flags.length) return unavailable("Aucun indicateur explicite de work package.");
  const tasks = new Map(datasets.tasks.rows.filter(row => id(row.project_id) === project.id).map(row => [row.id, row]));
  const wpFields = ["work_package_task_id", "work_package_id", "workpackage_id", "parent_id", "parent_task_id"].filter(field => defs[field]?.relation === "project.task");
  function resolve(taskId, seen = new Set()) {
    if (!taskId || seen.has(taskId)) return null;
    seen.add(taskId); const task = tasks.get(taskId);
    if (!task) return null;
    if (flags.some(flag => task[flag] === true)) return task;
    const parents = wpFields.map(field => id(task[field])).filter(Boolean);
    const matches = parents.map(parent => resolve(parent, new Set(seen))).filter(Boolean);
    return matches.length && matches.every(match => match.id === matches[0].id) ? matches[0] : null;
  }
  const groups = new Map(), rows = datasets.wpProgress.rows.filter(row => id(row.project_id) === project.id);
  if (!rows.length) return unavailable("Aucune ligne WP.");
  for (const row of rows) {
    const wp = resolve(id(row[taskField]));
    if (!wp) { if (["effective_hours", "allocated_hours", "convention_time"].some(field => number(row[field]) === null || Math.abs(row[field]) > TOLERANCE)) return unavailable("Heures non affectées à un WP explicite."); else continue; }
    if (!groups.has(wp.id)) groups.set(wp.id, { id: wp.id, actual: 0, planned: 0, convention: 0, start: wp.date_start || wp.planned_date_begin || null, end: wp.date_end || wp.planned_date_end || null });
    const group = groups.get(wp.id);
    for (const [field, key] of [["effective_hours", "actual"], ["allocated_hours", "planned"], ["convention_time", "convention"]]) { if (number(row[field]) === null) return unavailable("Mesure WP absente."); group[key] += row[field]; }
  }
  const result = [...groups.values()];
  if ([...tasks.values()].some(task => flags.some(flag => task[flag] === true) && !groups.has(task.id))) return unavailable("Couverture des WP explicites incomplète.");
  const base = datasets.progress.rows.filter(row => id(row.project_id) === project.id);
  if (!result.length || number(project.hours.convention) === null || Math.abs(sum(result, "actual") - project.hours.actual) > TOLERANCE || Math.abs(sum(result, "convention") - project.hours.convention) > TOLERANCE || ["effective_hours", "allocated_hours", "convention_time"].some(field => sum(base, field) === null || sum(rows, field) === null || Math.abs(sum(base, field) - sum(rows, field)) > TOLERANCE)) return unavailable("Totaux WP, Progress et convention non réconciliés (tolérance 0,05 h).");
  for (const row of result) {
    const expected = splitPeriod(row.start, row.end, row.convention, Date.parse(project.asOf)).elapsed;
    if (expected === null) return unavailable("Période explicite absente ou invalide pour un WP.");
    row.expectedToDate = expected; row.deviation = difference(row.actual, expected);
  }
  return { status: "available", reason: null, rows: result };
}

const api = { TOLERANCE, PROGRESS_MODEL, TASK_FIELDS, number, id, label, sum, ratio, timestamp, splitPeriod, assignment, normalizeProject, consolidate, buildDetail, buildBudgets, buildWorkPackages };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else window.SteeringMetrics = api;
})();

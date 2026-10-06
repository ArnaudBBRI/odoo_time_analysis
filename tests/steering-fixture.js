const definitions = {
  "project.project": { id: { type: "integer" }, name: { type: "char" }, display_name: { type: "char" }, active: { type: "boolean" }, x_unit_id: { type: "many2one", relation: "hr.department", string: "Responsible unit" }, user_id: { type: "many2one", relation: "res.users", string: "Project leader" }, stage_id: { type: "many2one", relation: "project.project.stage" }, date_start: { type: "date" }, date: { type: "date" }, effective_hours: { type: "float" } },
  "hr.department": { name: { type: "char" } }
};
const fields = {
  "bw.staffing.convention": ["staffing_hours", "staffing_date_start", "staffing_end_date", "employee_nick"],
  "planning.slot": ["allocated_hours", "start_datetime", "end_datetime"],
  "budget.analytic": ["budget_line_ids", "budget_template", "date_from", "date_to", "sum_of_budgeted_amount", "total_budget_contract_bw"],
  "budget.line": ["budget_amount", "achieved_amount", "committed_amount", "on_approval", "balance", "x_plan7_id", "x_plan8_id"],
  "bw.project.portfolio.link": ["name", "portfolio_percentage"],
  "project.milestone": ["name", "deadline", "is_reached"],
  "account.analytic.line": ["date", "unit_amount"],
  "project.task": ["is_work_package", "date_start", "date_end"],
  "bw.open.plannning.slot": ["effective_hours", "allocated_hours", "convention_time"]
};
for (const [model, names] of Object.entries(fields)) {
  definitions[model] = Object.fromEntries(names.map(name => [name, { type: /date|deadline/.test(name) ? "date" : /^is_/.test(name) ? "boolean" : "float" }]));
  Object.assign(definitions[model], { id: { type: "integer" }, project_id: { type: "many2one", relation: "project.project" }, employee_id: { type: "many2one", relation: "hr.employee" }, role_id: { type: "many2one", relation: "planning.role" }, currency_id: { type: "many2one", relation: "res.currency" } });
}
definitions["bw.open.plannning.slot"].task_id = { type: "many2one", relation: "project.task" };
definitions["project.task"].parent_id = { type: "many2one", relation: "project.task" };
const records = {
  "project.project": [
    { id: 11, name: "Projet Alpha", display_name: "[54252043] Projet Alpha", active: true, x_unit_id: [4, "DiCo"], user_id: [7, "Alice"], stage_id: [1, "En cours"], date_start: "2026-01-01", date: "2026-12-31", effective_hours: 120 },
    { id: 12, name: "Projet Beta", active: false, x_unit_id: [4, "DiCo"], user_id: [8, "Bob"], stage_id: [2, "Clôturé"], date_start: "2026-01-01", date: "2027-06-30", effective_hours: 0 }
  ],
  "bw.staffing.convention": [{ id: 1, project_id: [11, "Alpha"], employee_id: [20, "Alice"], role_id: [1, "Recherche"], staffing_date_start: "2026-01-01", staffing_end_date: "2026-12-31", staffing_hours: 100 }],
  "planning.slot": [{ id: 2, project_id: [11, "Alpha"], employee_id: [20, "Alice"], role_id: [1, "Recherche"], start_datetime: "2026-01-01 00:00:00", end_datetime: "2026-07-01 00:00:00", allocated_hours: 80 }],
  "account.analytic.line": [{ id: 3, project_id: [11, "Alpha"], employee_id: [20, "Alice"], date: "2026-02-01", unit_amount: 30 }],
  "bw.open.plannning.slot": [{ project_id: [11, "Alpha"], employee_id: [20, "Alice"], role_id: [1, "Recherche"], task_id: [40, "WP"], effective_hours: 120, allocated_hours: 80, convention_time: 100 }],
  "project.task": [{ id: 40, project_id: [11, "Alpha"], is_work_package: true, date_start: "2026-01-01", date_end: "2026-12-31" }],
  "budget.analytic": [{ id: 50, project_id: [11, "Alpha"], budget_line_ids: [51], budget_template: "convention", date_from: "2026-01-01", date_to: "2026-12-31", currency_id: [1, "EUR"], sum_of_budgeted_amount: 1000, total_budget_contract_bw: 1100 }],
  "budget.line": [{ id: 51, budget_analytic_id: [50, "Convention"], project_id: [11, "Alpha"], x_plan7_id: [1, "Matériel"], currency_id: [1, "EUR"], budget_amount: 1000, achieved_amount: 200, committed_amount: 500, on_approval: 10, balance: 500 }],
  "bw.project.portfolio.link": [{ id: 60, project_id: [11, "Alpha"], name: "1. Construction numérique", portfolio_percentage: 0.8 }],
  "project.milestone": [{ id: 70, project_id: [11, "Alpha"], name: "Rapport", deadline: "2026-03-01", is_reached: false }]
};
const config = { unitConfirmed: true, unitDomain: [["x_unit_id", "in", [4]]], programmes: [{ id: "digital", name: "Construction numérique", projectIds: [11] }], projectLeaderField: "user_id" };
function fixtureRpc(options = {}) {
  const calls = [];
  return { calls,
    async fields(model) { calls.push({ model, method: "fields_get" }); if (options.denied === model) throw new Error("secret upstream fault"); return structuredClone(definitions[model] || {}); },
    async read(model, domain, requested) { calls.push({ model, method: "search_read", domain, requested }); let rows = structuredClone(records[model] || []);
      for (const [field, operator, value] of domain) if (field === "id") rows = rows.filter(row => operator === "in" ? value.includes(row.id) : row.id === value);
      // Deliberately return unrelated relation rows; service must enforce allowed project IDs too.
      if (model !== "project.project" && model !== "budget.line") rows.push({ id: 999, project_id: [999, "Hors périmètre"], allocated_hours: 999, staffing_hours: 999, unit_amount: 999 });
      return rows;
    },
    async group(model, domain, kwargs) { calls.push({ model, method: "read_group", domain, kwargs }); const rows = structuredClone(records[model]); if (options.divergent) rows[0].effective_hours = 30; rows.push({ project_id: [999, "Autre"], effective_hours: 999 }); return rows; }
  };
}
module.exports = { definitions, records, config, fixtureRpc };

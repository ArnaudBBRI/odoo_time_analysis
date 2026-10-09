"use strict";
const relation = target => ({ type: "many2one", relation: target });
const number = { type: "monetary" }, day = { type: "date" };
const definitions = {
  "project.project": { id: { type: "integer" }, name: { type: "char" }, date_start: day, date: day,
    account_id: relation("account.analytic.account"), currency_id: relation("res.currency"), budget_ids: { type: "one2many", relation: "budget.analytic" },
    total_budget_convention: number, budget_staffing_convention_euros: number, budget_staffing_convention_hours: { type: "float" }, max_funding: number,
    funding_type_id: relation("bw.project.funding.type"), organism_id: relation("res.partner"), external_convention_ref: { type: "char" } },
  "budget.analytic": { id: { type: "integer" }, name: { type: "char" }, project_id: relation("project.project"),
    budget_template: { type: "selection", selection: [["convention", "Convention"], ["annual", "Annual"]] },
    state: { type: "selection", selection: [["draft", "Draft"], ["under_validation", "Under Validation"], ["confirmed", "Confirmed"], ["revised", "Revised"], ["done", "Done"], ["canceled", "Canceled"]] },
    budget_line_ids: { type: "one2many", relation: "budget.line" }, date_from: day, date_to: day, currency_id: relation("res.currency"),
    ...Object.fromEntries(["sum_of_budgeted_amount", "total_budget_contract_bw", "budget_ressource_bw", "external_contracts_budget", "sum_accounts_60", "sum_accounts_61", "sum_accounts_63", "sum_accounts_64", "sum_accounts_65"].map(name => [name, number])) },
  "budget.line": { id: { type: "integer" }, project_id: relation("project.project"), budget_analytic_id: relation("budget.analytic"),
    date_from: { ...day, related: "budget_analytic_id.date_from" }, date_to: { ...day, related: "budget_analytic_id.date_to" },
    x_plan7_id: relation("account.analytic.account"), x_plan8_id: relation("account.analytic.account"), currency_id: relation("res.currency"),
    ...Object.fromEntries(["budget_amount", "achieved_amount", "committed_amount", "on_approval", "balance"].map(name => [name, number])) },
  "account.analytic.line": { id: { type: "integer" }, name: { type: "char" }, account_id: relation("account.analytic.account"), project_id: relation("project.project"), amount: { ...number, currency_field: "currency_id" }, date: day,
    account_type: { type: "selection" }, parent_state: { type: "selection" }, employee_id: relation("hr.employee"), product_uom_id: relation("uom.uom"),
    x_plan7_id: relation("account.analytic.account"), x_plan8_id: relation("account.analytic.account"), partner_id: relation("res.partner"), currency_id: { ...relation("res.currency"), related: "company_id.currency_id" }, company_currency_id: { ...relation("res.currency"), related: "move_line_id.company_currency_id" }, move_id: relation("account.move"), move_line_id: relation("account.move.line") },
  "res.partner": { id: { type: "integer" }, name: { type: "char" }, commercial_partner_id: relation("res.partner") },
  "purchase.order.line": { id: { type: "integer" }, state: { type: "selection", selection: [["draft", "RFQ"], ["purchase", "Purchase"], ["done", "Locked"], ["cancel", "Canceled"]] }, partner_id: { ...relation("res.partner"), related: "order_id.partner_id" },
    distribution_analytic_account_ids: { type: "many2many", relation: "account.analytic.account" }, analytic_distribution: { type: "json" } },
  "uom.uom": { id: { type: "integer" }, name: { type: "char" }, category_id: relation("uom.category") },
  "uom.category": { id: { type: "integer" }, name: { type: "char" } }
};
const euro = [1, "EUR"], projectRef = [11, "Projet Alpha"], account = [110, "Projet Alpha"], hours = [7, "Hours"];
const parent = (id, template, lineIds, start = "2026-01-01", end = "2026-12-31") => ({ id, name: `${template} ${start.slice(0, 4)}`, project_id: projectRef, budget_template: template, state: "confirmed", budget_line_ids: lineIds, date_from: start, date_to: end, currency_id: euro, sum_of_budgeted_amount: template === "annual" ? 50 : 1000, total_budget_contract_bw: 1000, sum_accounts_60: 1000, sum_accounts_61: 0, sum_accounts_63: 0, sum_accounts_64: 0, sum_accounts_65: 0 });
const budgetLine = (id, parentId, category, budget, consumed, committed = consumed) => ({ id, project_id: projectRef, budget_analytic_id: [parentId, "Budget"], currency_id: euro,
  date_from: parentId === 70 ? "2027-01-01" : "2026-01-01", date_to: parentId === 70 ? "2027-12-31" : "2026-12-31",
  x_plan7_id: category, x_plan8_id: category, budget_amount: budget, achieved_amount: consumed, committed_amount: committed, on_approval: 0, balance: budget - committed });
const analytic = (id, values) => ({ id, account_id: account, project_id: false, date: "2026-02-01", amount: -100, currency_id: euro, company_currency_id: false, account_type: false, parent_state: false, employee_id: false, product_uom_id: false, x_plan7_id: false, x_plan8_id: false, partner_id: false, move_id: false, move_line_id: false, ...values });
const records = {
  "project.project": [{ id: 11, name: "Projet Alpha", date_start: "2026-01-01", date: "2026-09-30", account_id: account, currency_id: euro, budget_ids: [50, 60, 70],
    total_budget_convention: 1000, budget_staffing_convention_euros: 600, budget_staffing_convention_hours: 200, max_funding: 800, funding_type_id: [4, "Grant"], organism_id: [2, "Fictional funder"], external_convention_ref: "DEMO-11" },
    { id: 12, name: "Projet Beta", account_id: [120, "Projet Beta"], currency_id: euro }],
  "budget.analytic": [parent(50, "convention", [51, 52]), parent(60, "annual", [61, 62]), { ...parent(70, "annual", [71, 72], "2027-01-01", "2027-12-31"), state: "under_validation" }],
  "budget.line": [budgetLine(51, 50, [901, "Services"], 400, 200, 250), budgetLine(52, 50, [902, "Personnel"], 600, 0, 0),
    budgetLine(61, 60, [903, "6000 Personnel"], 1000, 200, 500), budgetLine(62, 60, [904, "7000 Income"], 1050, 300, 300),
    budgetLine(71, 70, [905, "6000 Equipment"], 1000, 0, 0), budgetLine(72, 70, [904, "7000 Income"], 1050, 0, 0)],
  "account.analytic.line": [analytic(1, { account_type: "expense", parent_state: "posted", amount: -200, x_plan7_id: [901, "Services"], move_id: [31, "Invoice"] }),
    analytic(2, { name: "Private person / secret timesheet text", employee_id: [20, "Private person"], product_uom_id: hours, amount: -300 }),
    analytic(3, { employee_id: [20, "Private person"], product_uom_id: hours, amount: 0 }),
    analytic(4, { account_type: "expense", parent_state: "posted", amount: 20, x_plan7_id: [901, "Services"], move_id: [32, "Credit"] }),
    analytic(5, { account_type: "asset_cash", parent_state: "posted", amount: -900, move_id: [33, "Payment"] }),
    analytic(6, { account_type: "expense", parent_state: "draft", amount: -800, move_id: [34, "Draft"] }),
    analytic(7, { account_type: "expense", parent_state: "posted", amount: -10, date: "2025-12-20", move_id: [35, "Earlier expense"] }),
    analytic(8, { employee_id: [20, "Private person"], product_uom_id: hours, amount: -40, date: "2026-10-01" }),
    analytic(9, { employee_id: [20, "Private person"], product_uom_id: hours, amount: -1000, date: "2026-12-01" })],
  "uom.uom": [{ id: 7, name: "Hours", category_id: [8, "Working Time"] }, { id: 8, name: "Units", category_id: [9, "Unit"] }],
  "uom.category": [{ id: 8, name: "Working Time" }, { id: 9, name: "Unit" }],
  "res.partner": [], "purchase.order.line": []
};
function fixtureRpc(options = {}) {
  const calls = [], source = structuredClone(options.records || records), defs = structuredClone(options.definitions || definitions);
  return { calls, source, definitions: defs,
    async fields(model) { calls.push({ model, method: "fields_get" }); if (options.denied === model) throw new Error("private-source-secret"); return defs[model] || {}; },
    async read(model, domain, requested) {
      calls.push({ model, method: "search_read", domain, requested });
      if (options.failRead === model) throw new Error("private-source-secret");
      let rows = structuredClone(source[model] || []);
      for (const [field, operator, value] of domain) rows = rows.filter(row => {
        const relationValue = row[field];
        if (operator === "in") return Array.isArray(relationValue) && typeof relationValue[1] !== "string"
          ? relationValue.some(item => value.includes(item)) : value.includes(id(relationValue));
        return operator === "<=" ? relationValue <= value : id(relationValue) === value;
      });
      if (options.unscoped) rows.push(...structuredClone(options.unscoped[model] || []));
      return rows;
    }
  };
}
function id(value) { return Array.isArray(value) ? value[0] : value; }
function supplierRecords() {
  const source = structuredClone(records), ormit = [501, "Ormit Talent DEMO-VAT DEMO-REFERENCE XX"], other = [502, "Other supplier"];
  source["res.partner"] = [
    { id: 501, name: "Ormit Talent", commercial_partner_id: [501, "Ormit Talent"] },
    { id: 502, name: "Other supplier", commercial_partner_id: other },
    { id: 503, name: "Not Ormit Talent", commercial_partner_id: [503, "Not Ormit Talent"] },
    { id: 504, name: "Ormit Talent Alternative", commercial_partner_id: [504, "Ormit Talent Alternative"] },
    { id: 505, name: "Invoice contact", commercial_partner_id: ormit },
    { id: 506, name: "Ormit Talent", commercial_partner_id: other }
  ];
  source["budget.analytic"][1] = { ...parent(60, "annual", [61, 63, 64, 62]), sum_accounts_60: 300, sum_accounts_61: 700 };
  source["budget.line"] = source["budget.line"].filter(row => ![61, 62, 71].includes(row.id));
  source["budget.line"].push(
    budgetLine(61, 60, [903, "6139 External services"], 400, 375),
    budgetLine(63, 60, [906, "6170 External staff"], 300, 200),
    budgetLine(64, 60, [907, "6000 Equipment"], 300, 50, 150),
    budgetLine(62, 60, [904, "7000 Income"], 1050, 300),
    budgetLine(71, 70, [905, "6000 Future equipment"], 1000, 100)
  );
  const expense = (recordId, category, amount, supplier = ormit, values = {}) => analytic(recordId, {
    account_type: "expense", parent_state: "posted", move_id: [1000 + recordId, "Financial entry"],
    x_plan8_id: category, amount, partner_id: supplier, name: `Fictional settlement ${recordId}`, ...values
  });
  source["account.analytic.line"] = [
    expense(101, [903, "6139 External services"], -300, ormit, { general_account_id: [2001, "613990"], name: "Supplier charge" }),
    expense(102, [903, "6139 External services"], 25),
    expense(103, [903, "6139 External services"], -100, other, { general_account_id: [2001, "613990"], name: "Ormit description alone" }),
    expense(104, [906, "6170 External staff"], -200),
    expense(105, [907, "6000 Equipment"], -50, other),
    analytic(106, { name: "Private employee / secret timesheet text", employee_id: [20, "Private employee"], product_uom_id: hours, amount: -80, x_plan8_id: [903, "6139 External services"] }),
    expense(107, [905, "6000 Future equipment"], -100, ormit, { date: "2027-03-01" }),
    expense(108, [903, "6139 External services"], -700, other, { account_type: "asset_cash" }),
    expense(109, [903, "6139 External services"], -600, ormit, { parent_state: "draft" })
  ];
  source["purchase.order.line"] = [{ id: 201, state: "purchase", partner_id: other,
    distribution_analytic_account_ids: [110, 907, 901], analytic_distribution: { "110,907,901": 100 } }];
  return source;
}
module.exports = { definitions, records, fixtureRpc, analytic, budgetLine, parent, supplierRecords };

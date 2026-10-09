"use strict";

// Fixed, project-scoped reads only. No Odoo actions or write operations are exposed.
const MONEY_FIELDS = ["budget_amount", "achieved_amount", "committed_amount", "on_approval", "balance"];
const PROJECT_NUMBERS = { conventionTotal: "total_budget_convention", personnelEuros: "budget_staffing_convention_euros", personnelHours: "budget_staffing_convention_hours", maxFunding: "max_funding" };
const PARENT_NUMBERS = ["sum_of_budgeted_amount", "total_budget_contract_bw", "budget_ressource_bw", "external_contracts_budget", "sum_accounts_60", "sum_accounts_61", "sum_accounts_63", "sum_accounts_64", "sum_accounts_65"];
const EXPENSE_TYPES = new Set(["expense", "expense_direct_cost", "expense_depreciation"]);
const NON_EXPENSE_TYPES = new Set(["asset_receivable", "asset_cash", "asset_current", "asset_non_current", "asset_prepayments", "asset_fixed", "liability_payable", "liability_credit_card", "liability_current", "liability_non_current", "equity", "equity_unaffected", "income", "income_other", "off_balance"]);
const numeric = value => typeof value === "number" && Number.isFinite(value) ? value : null;
const id = value => Array.isArray(value) && Number.isSafeInteger(value[0]) && value[0] > 0 ? value[0] : Number.isSafeInteger(value) && value > 0 ? value : null;
const label = value => Array.isArray(value) && typeof value[1] === "string" ? value[1] : null;
const money = value => value === null ? null : Math.round((value + Number.EPSILON) * 100) / 100;
const numericField = def => ["float", "integer", "monetary"].includes(def?.type);
const relation = (def, model, types = ["many2one"]) => types.includes(def?.type) && def.relation === model;
const scalar = (row, field, defs) => numericField(defs[field]) ? numeric(row[field]) : null;
const sum = (rows, field) => rows.every(row => numeric(row[field]) !== null) ? money(rows.reduce((total, row) => total + row[field], 0)) : null;
function date(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:$|[ T])/.test(value)) return null;
  const text = value.slice(0, 10), parsed = new Date(text + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text ? text : null;
}
function brusselsDate(now) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = type => parts.find(item => item.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function selected(row, fields) { return Object.fromEntries(fields.map(field => [field, row[field]])); }
function uniqueRows(rows) { return [...new Map(rows.filter(row => id(row.id)).map(row => [row.id, row])).values()]; }
function currency(row, fallback = null) {
  const value = id(row.currency_id) ? row.currency_id : fallback;
  return { currencyId: id(value), currency: label(value) };
}
function state(row, defs) {
  const code = defs.state?.type === "selection" && typeof row.state === "string" && row.state ? row.state : null;
  return { code, label: code ? defs.state.selection?.find(item => item[0] === code)?.[1] || code : "Statut indisponible" };
}
function totals(lines) {
  return Object.fromEntries(["budgeted", "consumed", "committed", "pending", "balance"].map(field => [field, sum(lines, field)]));
}
function unavailableTotals() { return Object.fromEntries(["budgeted", "consumed", "committed", "pending", "balance"].map(field => [field, null])); }

function normalizeBudget(parent, parentDefs, rows, lineDefs, sourceAvailable) {
  const warnings = [], annual = parent.budget_template === "annual";
  const refs = Array.isArray(parent.budget_line_ids) && parent.budget_line_ids.every(value => id(value)) ? new Set(parent.budget_line_ids) : null;
  const owned = uniqueRows(rows).filter(row => refs?.has(row.id) && (!id(row.budget_analytic_id) || id(row.budget_analytic_id) === parent.id) && (!id(row.project_id) || id(row.project_id) === id(parent.project_id)));
  const categoryField = annual ? "x_plan8_id" : "x_plan7_id";
  const parentCurrency = currency(parent);
  const lines = owned.map(row => ({ id: row.id, categoryId: id(row[categoryField]), category: label(row[categoryField]) || "Rubrique non renseignée",
    startDate: ["date", "datetime"].includes(lineDefs.date_from?.type) ? date(row.date_from) : null,
    endDate: ["date", "datetime"].includes(lineDefs.date_to?.type) ? date(row.date_to) : null,
    accountCode: annual ? (label(row[categoryField]) || "").match(/^\s*(\d{4})\b/)?.[1] || null : null,
    budgeted: scalar(row, "budget_amount", lineDefs), consumed: scalar(row, "achieved_amount", lineDefs), committed: scalar(row, "committed_amount", lineDefs),
    pending: scalar(row, "on_approval", lineDefs), balance: scalar(row, "balance", lineDefs), ...currency(row, lineDefs.currency_id ? null : parent.currency_id) }));
  const complete = sourceAvailable && refs !== null && refs.size === lines.length;
  const compatibleCurrency = parentCurrency.currencyId !== null && lines.every(line => line.currencyId === parentCurrency.currencyId);
  const classified = !annual || lines.every(line => /^[679]/.test(line.accountCode || ""));
  if (!complete) warnings.push("Les lignes référencées ne sont pas toutes accessibles ; les totaux sont indisponibles.");
  if (!compatibleCurrency) warnings.push("Devise absente ou différente dans les lignes ; aucun total monétaire combiné.");
  if (!classified) warnings.push("Des comptes annuels ne sont pas classifiables en 6xxx, 7xxx ou 9xxx ; les totaux sont indisponibles.");
  if (lines.some(line => MONEY_FIELDS.some((_, index) => numeric(line[["budgeted", "consumed", "committed", "pending", "balance"][index]]) === null))) warnings.push("Certains montants Odoo sont absents ou illisibles ; ils ne sont pas remplacés par zéro.");
  const ready = complete && compatibleCurrency && classified;
  const expenses = annual ? lines.filter(line => line.accountCode?.startsWith("6")) : lines;
  const amounts = ready ? totals(expenses) : unavailableTotals();
  const income = ready ? { budgeted: sum(lines.filter(line => line.accountCode?.startsWith("7")), "budgeted"), consumed: sum(lines.filter(line => line.accountCode?.startsWith("7")), "consumed") } : { budgeted: null, consumed: null };
  const adjustments = ready ? totals(lines.filter(line => line.accountCode?.startsWith("9"))) : unavailableTotals();
  const parentTotal = scalar(parent, "sum_of_budgeted_amount", parentDefs);
  const detailTotal = annual ? income.budgeted === null || amounts.budgeted === null || adjustments.budgeted !== 0 ? null : money(income.budgeted - amounts.budgeted) : amounts.budgeted;
  const gap = parentTotal === null || detailTotal === null ? null : money(detailTotal - parentTotal);
  const controls = annual ? ["60", "61", "63", "64", "65"].map(prefix => {
    const amount = ready ? sum(lines.filter(line => line.accountCode?.startsWith(prefix)), "budgeted") : null;
    const parentAmount = scalar(parent, `sum_accounts_${prefix}`, parentDefs);
    return { prefix, amount, parentAmount, gap: amount === null || parentAmount === null ? null : money(amount - parentAmount) };
  }) : [];
  const quality = !ready ? "partial" : gap === null || controls.some(control => control.gap === null) ? "not-checkable" : Math.abs(gap) > 0.05 || controls.some(control => Math.abs(control.gap) > 0.05) ? "not-reconciled" : "reconciled";
  if (annual && adjustments.budgeted !== null && adjustments.budgeted !== 0) warnings.push("Les ajustements 9xxx sont conservés ; la réconciliation automatique est indisponible.");
  return { id: parent.id, name: typeof parent.name === "string" && parent.name ? parent.name : `Budget ${parent.id}`, startDate: date(parent.date_from), endDate: date(parent.date_to),
    status: state(parent, parentDefs), ...parentCurrency, lines, quality, warnings, parentTotal,
    contractTotal: scalar(parent, "total_budget_contract_bw", parentDefs), resourceBudget: scalar(parent, "budget_ressource_bw", parentDefs), externalContractsBudget: scalar(parent, "external_contracts_budget", parentDefs),
    reconciliation: { gap, controls }, ...(annual ? { totals: amounts, income, adjustments } : { budgetedTotal: amounts.budgeted, billedTotal: amounts.consumed, committedTotal: amounts.committed, pendingApprovalTotal: amounts.pending, balanceTotal: amounts.balance }) };
}

function unavailableLifetime(reason) {
  return { status: "unavailable", currencyId: null, currency: null, consumed: null, expenseCost: null, personnelCost: null, byRubric: [], unmapped: [],
    qualifyingRecordCount: 0, zeroValuedHoursCount: 0, outOfPeriod: { beforeStart: { count: 0, consumed: null }, afterEnd: { count: 0, consumed: null } }, warnings: [reason] };
}

function supplierNameMatches(value) {
  return typeof value === "string" && value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ") === "ormit talent";
}
async function suppliers(ids, rpc, fields) {
  const requestedIds = [...new Set(ids.filter(value => id(value)))], known = new Map();
  if (!requestedIds.length) return known;
  try {
    const defs = await fields("res.partner");
    const commercial = relation(defs.commercial_partner_id, "res.partner");
    if (defs.name?.type !== "char" || !commercial) return known;
    const records = new Map(), conflicting = new Set(); let pending = requestedIds;
    for (let depth = 0; pending.length && depth < 16; depth++) {
      const allowed = new Set(pending);
      const rows = await rpc.read("res.partner", [["id", "in", pending]], ["id", "name", ...(commercial ? ["commercial_partner_id"] : [])]);
      for (const row of rows) if (allowed.has(row.id)) {
        const previous = records.get(row.id);
        if (previous && (previous.name !== row.name || id(previous.commercial_partner_id) !== id(row.commercial_partner_id))) conflicting.add(row.id);
        records.set(row.id, row);
      }
      pending = commercial ? [...new Set(rows.filter(row => allowed.has(row.id)).map(row => id(row.commercial_partner_id)).filter(value => value !== null && !records.has(value)))] : [];
    }
    for (const target of requestedIds) {
      let current = target, result = null; const visited = new Set();
      while (!visited.has(current)) {
        visited.add(current); const row = records.get(current);
        if (!row || conflicting.has(current) || typeof row.name !== "string" || !row.name.trim()) break;
        const parent = id(row.commercial_partner_id);
        // Contacts are classified by their verified commercial root, never by
        // a contact/display label that merely resembles the supplier's name.
        if (parent === current) { result = supplierNameMatches(row.name); break; }
        if (parent === null) break;
        current = parent;
      }
      known.set(target, result);
    }
  } catch (_) { /* Unknown supplier identities must not become a proved zero. */ }
  return known;
}
function parsedDistribution(value) {
  let distribution = value;
  if (typeof value === "string") { try { distribution = JSON.parse(value); } catch (_) { return null; } }
  if (!distribution || typeof distribution !== "object" || Array.isArray(distribution)) return null;
  const entries = [];
  for (const [key, percentage] of Object.entries(distribution)) {
    const tokens = key.split(",").map(token => token.trim());
    if (!tokens.length || tokens.some(token => !/^\d+$/.test(token) || id(Number(token)) === null) || numeric(percentage) === null || percentage < 0 || percentage > 100) return null;
    entries.push({ ids: tokens.map(Number), percentage });
  }
  if (entries.reduce((total, entry) => total + entry.percentage, 0) > 100.00001) return null;
  return entries;
}
async function purchaseEvidence(accountId, categoryIds, rpc, fields) {
  const proof = { available: false, blockAll: false, hasUnknown: false, hasOrmitOrders: false, blockedCategories: new Set(), warnings: [] }, rows = [];
  try {
    const defs = await fields("purchase.order.line");
    if (!relation(defs.distribution_analytic_account_ids, "account.analytic.account", ["many2many"])
      || defs.analytic_distribution?.type !== "json" || defs.state?.type !== "selection" || !relation(defs.partner_id, "res.partner")
      || !["purchase", "done"].every(code => defs.state.selection?.some(item => item[0] === code))
      || (Array.isArray(defs.partner_id.related) ? defs.partner_id.related.join(".") : defs.partner_id.related) !== "order_id.partner_id") throw new Error("Unavailable purchase evidence");
    const raw = await rpc.read("purchase.order.line", [["distribution_analytic_account_ids", "in", [accountId]], ["state", "in", ["purchase", "done"]]], ["id", "distribution_analytic_account_ids", "analytic_distribution", "state", "partner_id"]);
    const seen = new Map();
    for (const row of raw) {
      const distribution = parsedDistribution(row.analytic_distribution);
      const listed = Array.isArray(row.distribution_analytic_account_ids) && row.distribution_analytic_account_ids.includes(accountId);
      const selected = distribution?.filter(entry => entry.ids.includes(accountId) && entry.percentage > 0);
      if (!listed && !selected?.length) continue;
      if (!id(row.id) || !listed || !distribution || !selected.length || !["purchase", "done"].includes(row.state)) {
        proof.blockAll = true; continue;
      }
      const signature = JSON.stringify([row.state, id(row.partner_id), distribution]);
      if (seen.has(row.id)) { if (seen.get(row.id) !== signature) proof.blockAll = true; continue; }
      seen.set(row.id, signature); rows.push({ ...row, selected });
    }
    const names = await suppliers(rows.map(row => id(row.partner_id)), rpc, fields);
    for (const row of rows) {
      const supplier = names.get(id(row.partner_id));
      if (supplier === false) continue;
      if (supplier === true) proof.hasOrmitOrders = true;
      else proof.hasUnknown = true;
      const categories = new Set(row.selected.flatMap(entry => entry.ids.filter(value => categoryIds.has(value))));
      if (!categories.size) proof.blockAll = true;
      else for (const category of categories) proof.blockedCategories.add(category);
      if (supplier !== true) proof.warnings.push("Une commande confirmée a un fournisseur non vérifiable ; l’exclusion des engagements reste inconnue.");
    }
    proof.available = true;
    if (proof.blockAll || proof.blockedCategories.size) proof.warnings.push("Des commandes Ormit ou non attribuables empêchent de déduire automatiquement leur part engagée.");
  } catch (_) { proof.warnings.push("Les commandes confirmées du projet ne sont pas vérifiables ; aucune part engagée Ormit n’est estimée."); }
  return proof;
}
function unavailableAnnualExclusion(budget, warning) {
  const expenseLines = budget.lines.filter(line => /^6/.test(line.accountCode || ""));
  return { status: "unavailable", consumed: null, committed: null, excludedConsumed: null,
    lines: expenseLines.map(line => ({ id: line.id, consumed: null, committed: null })), warnings: [warning] };
}
function annualLineEvidence(budget, line, rows, amountCurrencyField, categoryCounts, hourUnitIds) {
  const start = date(budget.startDate), end = date(budget.endDate), lineStart = date(line.startDate), lineEnd = date(line.endDate);
  const validPeriod = Boolean(start && end && start <= end && lineStart && lineEnd && lineStart <= lineEnd && lineStart >= start && lineEnd <= end);
  const categoryKnown = line.categoryId !== null;
  const candidates = categoryKnown ? rows.filter(row => id(row.x_plan8_id) === line.categoryId && EXPENSE_TYPES.has(row.account_type)) : [];
  const uncertainClassification = categoryKnown && rows.some(row => {
    if (id(row.x_plan8_id) !== line.categoryId || row.amount === 0 || EXPENSE_TYPES.has(row.account_type) || NON_EXPENSE_TYPES.has(row.account_type)) return false;
    if (!row.account_type && !id(row.move_id) && !id(row.move_line_id) && id(row.employee_id) && hourUnitIds.has(id(row.product_uom_id))) return false;
    const recorded = date(row.date); return !recorded || recorded >= lineStart && recorded <= lineEnd;
  });
  const periodRows = candidates.filter(row => { const recorded = date(row.date); return validPeriod && recorded && recorded >= lineStart && recorded <= lineEnd && row.parent_state === "posted"; });
  const uncertainPeriod = candidates.some(row => !date(row.date) || date(row.date) >= lineStart && date(row.date) <= lineEnd && !["posted", "draft", "cancel", "removed"].includes(row.parent_state));
  const compatibleCurrency = Boolean(amountCurrencyField && line.currencyId !== null && line.currencyId === budget.currencyId
    && periodRows.every(row => id(row[amountCurrencyField]) === line.currencyId));
  const amountsKnown = periodRows.every(row => numeric(row.amount) !== null);
  const uniqueCategory = categoryKnown && categoryCounts.get(line.categoryId) === 1;
  return { periodRows, validPeriod, categoryKnown, uniqueCategory, uncertainClassification, uncertainPeriod, compatibleCurrency, amountsKnown,
    usable: validPeriod && uniqueCategory && !uncertainPeriod && !uncertainClassification && compatibleCurrency && amountsKnown };
}
function annualExclusion(budget, rows, supplierNames, amountCurrencyField, proof, sourceIssues = [], hourUnitIds = new Set()) {
  const result = unavailableAnnualExclusion(budget, "Les dépenses annuelles ne permettent pas de vérifier l’exclusion Ormit.");
  const expenses = budget.lines.filter(line => /^6/.test(line.accountCode || ""));
  const start = date(budget.startDate), end = date(budget.endDate);
  if (!start || !end || start > end || !amountCurrencyField || sourceIssues.length) {
    result.warnings.push(...sourceIssues); return result;
  }
  const warnings = [], categoryCounts = new Map();
  for (const line of expenses) categoryCounts.set(line.categoryId, (categoryCounts.get(line.categoryId) || 0) + 1);
  const values = expenses.map(line => {
    let excluded = null, filtered = null, committed = null;
    const { periodRows, usable } = annualLineEvidence(budget, line, rows, amountCurrencyField, categoryCounts, hourUnitIds);
    if (usable) {
      const billed = money(periodRows.reduce((total, row) => total - row.amount, 0));
      if (line.consumed !== null && Math.abs(billed - line.consumed) <= 0.05) {
        const suppliersKnown = periodRows.every(row => row.amount === 0 || supplierNames.get(id(row.partner_id)) === true || supplierNames.get(id(row.partner_id)) === false);
        if (suppliersKnown) {
          excluded = money(periodRows.filter(row => supplierNames.get(id(row.partner_id)) === true).reduce((total, row) => total - row.amount, 0));
          filtered = money(line.consumed - excluded);
        } else warnings.push("Un fournisseur de dépense facturée est absent ou non vérifiable ; sa part Ormit reste inconnue.");
      } else warnings.push("Les dépenses facturées ne se réconcilient pas avec une ligne annuelle pour sa période, catégorie et devise.");
    } else warnings.push("Une période, catégorie, devise ou écriture annuelle est ambiguë ; l’exclusion de cette ligne est indisponible.");
    const noOrmitOrders = proof.available && !proof.blockAll && !proof.blockedCategories.has(line.categoryId);
    const affectedProof = excluded === 0 || !proof.hasUnknown && !proof.hasOrmitOrders && line.committed !== null && line.consumed !== null && Math.abs(line.committed - line.consumed) <= 0.05;
    if (excluded !== null && line.committed !== null && noOrmitOrders && affectedProof) committed = money(line.committed - excluded);
    // A genuinely empty source commitment remains a known zero when nothing is
    // billed or excluded, even if optional PO access is unavailable.
    else if (excluded === 0 && line.consumed === 0 && line.committed === 0 && !proof.blockAll && !proof.blockedCategories.has(line.categoryId)) committed = 0;
    return { id: line.id, consumed: filtered, committed, excluded };
  });
  const consumed = budget.totals.consumed === null ? null : sum(values, "consumed"), committed = budget.totals.committed === null ? null : sum(values, "committed");
  const excludedConsumed = sum(values, "excluded");
  if (values.some(value => value.committed === null)) warnings.push(...proof.warnings, "La part engagée hors Ormit est indisponible sans preuve complète des commandes ; elle n’est pas remplacée par le facturé.");
  return { status: consumed === null ? "unavailable" : committed === null ? "partial" : "available", consumed, committed, excludedConsumed,
    lines: values.map(({ id, consumed, committed }) => ({ id, consumed, committed })), warnings: [...new Set([...warnings, "L’exclusion est vérifiée sur les écritures et commandes accessibles au compte connecté ; les règles d’accès restent applicables."])] };
}

function unavailableBillDetails(line, warning) {
  return { status: "unavailable", sourceConsumed: numeric(line.consumed), visibleConsumed: null, gap: null, items: [], warnings: [warning] };
}
async function billDescriptions(annual, rows, accountId, projectId, defs, rpc, amountCurrencyField) {
  const values = new Map(), warnings = [];
  const eligible = new Map();
  for (const budget of annual) for (const line of budget.lines.filter(line => /^6/.test(line.accountCode || ""))) {
    const start = date(line.startDate), end = date(line.endDate), parentStart = date(budget.startDate), parentEnd = date(budget.endDate);
    if (!start || !end || start > end || !parentStart || !parentEnd || start < parentStart || end > parentEnd || line.categoryId === null || line.currencyId === null || line.currencyId !== budget.currencyId) continue;
    for (const row of rows) if (id(row.id) && EXPENSE_TYPES.has(row.account_type) && row.parent_state === "posted" && id(row.x_plan8_id) === line.categoryId
      && date(row.date) && date(row.date) >= start && date(row.date) <= end && id(row[amountCurrencyField]) === line.currencyId) eligible.set(row.id, row);
  }
  if (!eligible.size) return { values, warnings };
  if (!["char", "text"].includes(defs.name?.type)) return { values, warnings: ["Le libellé Settlements New n’est pas accessible ; les montants restent disponibles."] };
  try {
    const projectRelation = relation(defs.project_id, "project.project");
    const rows = await rpc.read("account.analytic.line", [["account_id", "=", accountId], ["id", "in", [...eligible.keys()]],
      ["account_type", "in", [...EXPENSE_TYPES]], ["parent_state", "=", "posted"]],
      ["id", "account_id", ...(projectRelation ? ["project_id"] : []), "date", "account_type", "parent_state", "x_plan8_id", amountCurrencyField, "name"]);
    const conflicting = new Set();
    for (const row of rows) {
      const expected = eligible.get(row.id);
      if (!expected || id(row.account_id) !== accountId || id(row.project_id) && id(row.project_id) !== projectId
        || row.account_type !== expected.account_type || row.parent_state !== "posted" || date(row.date) !== date(expected.date)
        || id(row.x_plan8_id) !== id(expected.x_plan8_id) || id(row[amountCurrencyField]) !== id(expected[amountCurrencyField])) continue;
      const description = typeof row.name === "string" && row.name.trim() ? row.name : null;
      if (values.has(row.id) && values.get(row.id) !== description) conflicting.add(row.id);
      values.set(row.id, description);
    }
    for (const rowId of conflicting) values.delete(rowId);
    if (eligible.size !== values.size || [...values.values()].some(value => value === null)) warnings.push("Certains libellés Settlements New sont absents, modifiés ou inaccessibles ; les montants restent disponibles.");
  } catch (_) { warnings.push("Les libellés Settlements New sont indisponibles avec vos accès ; les montants restent disponibles."); }
  return { values, warnings };
}
function annualBillDetails(budget, line, rows, supplierNames, amountCurrencyField, descriptions, sourceIssues = [], hourUnitIds = new Set()) {
  if (!amountCurrencyField || sourceIssues.length) return unavailableBillDetails(line, sourceIssues[0] || "La devise des écritures annuelles n’est pas vérifiable.");
  const counts = new Map();
  for (const expense of budget.lines.filter(item => /^6/.test(item.accountCode || ""))) counts.set(expense.categoryId, (counts.get(expense.categoryId) || 0) + 1);
  const evidence = annualLineEvidence(budget, line, rows, amountCurrencyField, counts, hourUnitIds);
  if (!evidence.validPeriod || !evidence.categoryKnown) return unavailableBillDetails(line, "La période ou la catégorie exacte de cette ligne annuelle n’est pas vérifiable.");
  const items = evidence.periodRows.filter(row => line.currencyId !== null && line.currencyId === budget.currencyId && id(row[amountCurrencyField]) === line.currencyId).map(row => ({ id: row.id, date: date(row.date), description: descriptions.values.get(row.id) ?? null,
    consumed: numeric(row.amount) === null ? null : -row.amount, ...currency({ currency_id: row[amountCurrencyField] }),
    documentLabel: label(row.move_id), supplierLabel: label(row.partner_id), isOrmitTalent: supplierNames.get(id(row.partner_id)) ?? null }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const sourceConsumed = numeric(line.consumed), visibleConsumed = evidence.compatibleCurrency ? sum(items, "consumed") : null;
  const gap = sourceConsumed === null || visibleConsumed === null ? null : money(visibleConsumed - sourceConsumed);
  const warnings = [...descriptions.warnings];
  if (!evidence.uniqueCategory) warnings.push("Plusieurs lignes annuelles partagent la même catégorie ; leurs écritures ne doivent pas être additionnées plusieurs fois.");
  if (evidence.uncertainClassification || evidence.uncertainPeriod) warnings.push("Des écritures ont une classification, date ou validation inconnue ; la liste facturée est partielle.");
  if (!evidence.compatibleCurrency) warnings.push("Des devises sont absentes ou différentes ; aucun total de la liste n’est combiné.");
  if (!evidence.amountsKnown || sourceConsumed === null) warnings.push("Certains montants source sont absents ; ils ne sont pas remplacés par zéro.");
  if (gap !== null && Math.abs(gap) > 0.05) warnings.push("La liste accessible ne se réconcilie pas avec le consommé facturé de cette ligne annuelle.");
  if (items.some(item => item.consumed !== 0 && item.isOrmitTalent === null)) warnings.push("Certains fournisseurs ne sont pas vérifiables ; leur classification Ormit reste inconnue.");
  warnings.push("Les lignes sont des montants analytiques affectés à cette catégorie, pas des totaux de factures ; les règles d’accès du compte connecté restent applicables.");
  return { status: evidence.usable && gap !== null && Math.abs(gap) <= 0.05 ? "reconciled" : "partial", sourceConsumed, visibleConsumed, gap, items, warnings: [...new Set(warnings)] };
}

function aggregateLifetime(rows, project, today, hourUnitIds, sourceWarnings = [], amountCurrencyField = null) {
  const warnings = [...sourceWarnings], qualifying = [], seen = new Set();
  let unknownCount = 0, missingAmountCount = 0, invalidDateCount = 0, zeroValuedHoursCount = 0;
  for (const row of rows) {
    if (seen.has(row.id)) continue; seen.add(row.id);
    const recordDate = date(row.date);
    if (!recordDate) { invalidDateCount++; continue; }
    if (recordDate > today) continue;
    const type = typeof row.account_type === "string" ? row.account_type : "";
    const hasMove = id(row.move_id) !== null || id(row.move_line_id) !== null;
    let kind = null;
    if (EXPENSE_TYPES.has(type)) {
      if (row.parent_state === "posted") kind = "expense";
      else if (!["draft", "cancel", "removed"].includes(row.parent_state)) unknownCount++;
    } else if (NON_EXPENSE_TYPES.has(type)) continue;
    else if (!type && !hasMove && id(row.employee_id) !== null && hourUnitIds.has(id(row.product_uom_id))) kind = "personnel";
    else if (numeric(row.amount) !== 0) unknownCount++;
    if (!kind) continue;
    // Monetary amount's own metadata identifies its currency. Move/invoice currency
    // fields must not replace that relation, even when they are populated.
    const amount = numeric(row.amount), rowCurrency = currency({ currency_id: amountCurrencyField ? row[amountCurrencyField] : null });
    if (amount === null) missingAmountCount++;
    if (kind === "personnel" && amount === 0) zeroValuedHoursCount++;
    qualifying.push({ kind, date: recordDate, cost: amount === null ? null : -amount, categoryId: id(row.x_plan7_id), category: label(row.x_plan7_id), ...rowCurrency });
  }
  if (unknownCount) warnings.push(`${unknownCount} écriture(s) de classification ou statut inconnu sont exclues du sous-total connu.`);
  if (missingAmountCount) warnings.push(`${missingAmountCount} coût(s) monétaire(s) sont absents ; le sous-total connu est partiel.`);
  if (invalidDateCount) warnings.push(`${invalidDateCount} écriture(s) sans date exploitable sont exclues du sous-total connu.`);
  if (zeroValuedHoursCount) warnings.push(`${zeroValuedHoursCount} écriture(s) d’heures ont un coût enregistré nul ; aucune estimation de taux n’est appliquée.`);
  const knownCurrencies = [...new Set(qualifying.map(row => row.currencyId).filter(value => value !== null))];
  const compatible = amountCurrencyField !== null && qualifying.every(row => row.currencyId !== null) && knownCurrencies.length <= 1;
  if (!compatible) warnings.push("Les coûts qualifiés ont des devises absentes ou différentes ; aucun total combiné n’est calculé.");
  const fallback = { currencyId: project.currencyId || null, currency: project.currency || null };
  const moneyCurrency = knownCurrencies.length === 1 ? qualifying.find(row => row.currencyId === knownCurrencies[0]) : fallback;
  const cost = list => !compatible || list.length > 0 && !list.some(row => row.cost !== null) ? null : money(list.filter(row => row.cost !== null).reduce((total, row) => total + row.cost, 0));
  const buckets = new Map();
  for (const row of qualifying) {
    const mapped = row.categoryId !== null;
    const key = mapped ? `rubric:${row.categoryId}` : row.kind;
    if (!buckets.has(key)) buckets.set(key, { categoryId: mapped ? row.categoryId : null, category: mapped ? row.category || `Rubrique ${row.categoryId}` : null,
      label: row.kind === "personnel" ? "Coût des heures · rubrique non renseignée" : "Dépenses · rubrique non renseignée", rows: [] });
    buckets.get(key).rows.push(row);
  }
  const start = date(project.startDate), end = date(project.endDate);
  const before = start ? qualifying.filter(row => row.date < start) : [], after = end ? qualifying.filter(row => row.date > end) : [];
  if (!start || !end || start > end) warnings.push("Les dates du projet ne permettent pas de contrôler les écritures hors période ; les coûts à ce jour restent inclus.");
  if (before.length || after.length) warnings.push("Les coûts enregistrés avant le début ou après la fin du projet restent inclus et sont signalés séparément.");
  return { status: !compatible || unknownCount || missingAmountCount || invalidDateCount || sourceWarnings.length ? "partial" : "available",
    currencyId: compatible ? moneyCurrency.currencyId : null, currency: compatible ? moneyCurrency.currency : null,
    consumed: cost(qualifying), expenseCost: cost(qualifying.filter(row => row.kind === "expense")), personnelCost: cost(qualifying.filter(row => row.kind === "personnel")),
    byRubric: compatible ? [...buckets.values()].filter(bucket => bucket.categoryId !== null).map(bucket => ({ categoryId: bucket.categoryId, category: bucket.category, consumed: cost(bucket.rows) })) : [],
    unmapped: compatible ? [...buckets.values()].filter(bucket => bucket.categoryId === null).map(bucket => ({ label: bucket.label, consumed: cost(bucket.rows) })) : [],
    qualifyingRecordCount: qualifying.length, zeroValuedHoursCount, outOfPeriod: { beforeStart: { count: before.length, consumed: start ? cost(before) : null }, afterEnd: { count: after.length, consumed: end ? cost(after) : null } }, warnings };
}

async function load(projectId, rpc, now = new Date()) {
  if (!Number.isSafeInteger(projectId) || projectId <= 0) throw new Error("A positive integer projectId is required");
  const warnings = [], fieldsCache = new Map();
  const fields = async model => {
    if (!fieldsCache.has(model)) fieldsCache.set(model, Promise.resolve().then(() => rpc.fields(model)));
    return fieldsCache.get(model);
  };
  const exactProject = await rpc.read("project.project", [["id", "=", projectId]], ["id", "name"]);
  const identity = exactProject.find(row => row.id === projectId);
  if (!identity) return { ok: false, notFound: true, error: "Le projet sélectionné est indisponible avec vos accès Odoo." };
  let projectDefs;
  try { projectDefs = await fields("project.project"); }
  catch (_) { throw new Error("Project finance metadata unavailable"); }
  const project = { id: projectId, name: typeof identity.name === "string" && identity.name ? identity.name : `Projet ${projectId}`, startDate: null, endDate: null };
  const metadata = {};
  async function projectFields(names, reason) {
    if (!names.length) return;
    try {
      const rows = await rpc.read("project.project", [["id", "=", projectId]], ["id", ...names]);
      const row = rows.find(item => item.id === projectId);
      if (!row) throw new Error("Missing project");
      Object.assign(metadata, selected(row, names));
    } catch (_) { warnings.push(reason); }
  }
  await projectFields(["date_start", "date"].filter(name => ["date", "datetime"].includes(projectDefs[name]?.type)), "Les dates du projet sont indisponibles.");
  project.startDate = date(metadata.date_start); project.endDate = date(metadata.date);
  await projectFields(["account_id", "currency_id"].filter(name => relation(projectDefs[name], name === "account_id" ? "account.analytic.account" : "res.currency")), "Le compte analytique ou la devise du projet sont indisponibles.");
  await projectFields(relation(projectDefs.budget_ids, "budget.analytic", ["one2many", "many2many"]) ? ["budget_ids"] : [], "Les références de budgets du projet sont indisponibles.");
  const macroFields = [...Object.values(PROJECT_NUMBERS).filter(name => numericField(projectDefs[name])),
    ...["funding_type_id", "organism_id"].filter(name => relation(projectDefs[name], name === "funding_type_id" ? "bw.project.funding.type" : "res.partner")),
    ...["external_convention_ref"].filter(name => ["char", "text"].includes(projectDefs[name]?.type))];
  await projectFields(macroFields, "Certaines informations macro de la convention sont indisponibles.");
  const projectCurrency = currency(metadata);
  const macro = { ...Object.fromEntries(Object.entries(PROJECT_NUMBERS).map(([key, name]) => [key, scalar(metadata, name, projectDefs)])),
    fundingType: label(metadata.funding_type_id), fundingOrganism: label(metadata.organism_id), externalReference: typeof metadata.external_convention_ref === "string" && metadata.external_convention_ref ? metadata.external_convention_ref : null, ...projectCurrency };
  const conventions = [], annual = [];
  try {
    const parentDefs = await fields("budget.analytic");
    const direct = relation(parentDefs.project_id, "project.project");
    const referencedIds = Array.isArray(metadata.budget_ids) ? [...new Set(metadata.budget_ids.filter(value => id(value)))] : [];
    if (!direct && !referencedIds.length) throw new Error("No scoped budget relation");
    if (parentDefs.budget_template?.type !== "selection" || !relation(parentDefs.budget_line_ids, "budget.line", ["one2many", "many2many"])) throw new Error("Budget fields unavailable");
    const requested = ["id", ...["name", "budget_template", "state"].filter(name => ["char", "selection"].includes(parentDefs[name]?.type)),
      ...["date_from", "date_to"].filter(name => ["date", "datetime"].includes(parentDefs[name]?.type)), "budget_line_ids",
      ...(direct ? ["project_id"] : []), ...(relation(parentDefs.currency_id, "res.currency") ? ["currency_id"] : []), ...PARENT_NUMBERS.filter(name => numericField(parentDefs[name]))];
    const parentRows = await rpc.read("budget.analytic", direct ? [["project_id", "=", projectId]] : [["id", "in", referencedIds]], requested);
    const parents = uniqueRows(parentRows).filter(row => direct ? id(row.project_id) === projectId : referencedIds.includes(row.id)).map(row => selected(row, requested));
    if (parents.some(row => !["convention", "annual"].includes(row.budget_template))) warnings.push("Des budgets de type inconnu restent exclus des comparaisons convention/annuel.");
    let lineDefs = {}, lines = [], lineAvailable = false;
    const lineIds = [...new Set(parents.filter(row => ["convention", "annual"].includes(row.budget_template)).flatMap(row => Array.isArray(row.budget_line_ids) ? row.budget_line_ids.filter(value => id(value)) : []))];
    try {
      lineDefs = await fields("budget.line");
      const lineFields = ["id", ...MONEY_FIELDS.filter(name => numericField(lineDefs[name])),
        ...["date_from", "date_to"].filter(name => ["date", "datetime"].includes(lineDefs[name]?.type)),
        ...[["budget_analytic_id", "budget.analytic"], ["project_id", "project.project"], ["x_plan7_id", "account.analytic.account"], ["x_plan8_id", "account.analytic.account"], ["currency_id", "res.currency"]].filter(([name, model]) => relation(lineDefs[name], model)).map(([name]) => name)];
      lines = lineIds.length ? (await rpc.read("budget.line", [["id", "in", lineIds]], lineFields)).filter(row => lineIds.includes(row.id)).map(row => selected(row, lineFields)) : [];
      lineAvailable = true;
    } catch (_) { warnings.push("Les lignes budgétaires sont indisponibles avec vos accès Odoo."); }
    for (const parent of parents) {
      if (!["convention", "annual"].includes(parent.budget_template)) continue;
      if (!direct) parent.project_id = [projectId, project.name];
      const budget = normalizeBudget(parent, parentDefs, lines, lineDefs, lineAvailable);
      (parent.budget_template === "annual" ? annual : conventions).push(budget);
    }
  } catch (_) { warnings.push("Les budgets conventionnels et annuels sont indisponibles avec vos accès ou votre schéma Odoo."); }
  const ordering = (a, b) => String(a.startDate || "9999").localeCompare(String(b.startDate || "9999")) || a.id - b.id;
  conventions.sort(ordering); annual.sort(ordering);
  for (const budget of annual) {
    budget.ormitterExclusion = unavailableAnnualExclusion(budget, "Les sources de fournisseurs et de coûts annuels sont indisponibles.");
    for (const line of budget.lines.filter(item => /^6/.test(item.accountCode || ""))) line.billDetails = unavailableBillDetails(line, "Les écritures facturées de cette ligne annuelle sont indisponibles.");
  }
  let lifetime = unavailableLifetime("Le compte analytique du projet est indisponible ; aucun périmètre financier n’est inventé.");
  const accountId = id(metadata.account_id);
  if (accountId !== null) {
    try {
      const linked = await rpc.read("project.project", [["account_id", "=", accountId]], ["id", "account_id"]);
      if (linked.some(row => id(row.account_id) === accountId && row.id !== projectId)) throw new Error("Shared analytic account");
      const defs = await fields("account.analytic.line");
      if (!relation(defs.account_id, "account.analytic.account") || !numericField(defs.amount) || !["date", "datetime"].includes(defs.date?.type)
        || defs.account_type?.type !== "selection") throw new Error("Analytic finance fields unavailable");
      const declaredCurrencyField = defs.amount.currency_field;
      const amountCurrencyField = typeof declaredCurrencyField === "string" && /^[a-zA-Z_][\w]*$/.test(declaredCurrencyField)
        && relation(defs[declaredCurrencyField], "res.currency") ? declaredCurrencyField : null;
      const requested = ["id", "account_id", "date", "amount", "account_type", ...["parent_state"].filter(name => defs[name]?.type === "selection"),
        ...[["project_id", "project.project"], ["employee_id", "hr.employee"], ["product_uom_id", "uom.uom"], ["x_plan7_id", "account.analytic.account"], ["x_plan8_id", "account.analytic.account"], ["partner_id", "res.partner"], ["move_id", "account.move"], ["move_line_id", "account.move.line"]].filter(([name, model]) => relation(defs[name], model)).map(([name]) => name),
        ...(amountCurrencyField ? [amountCurrencyField] : [])];
      const today = brusselsDate(now);
      const raw = await rpc.read("account.analytic.line", [["account_id", "=", accountId]], requested);
      const rows = uniqueRows(raw).filter(row => id(row.account_id) === accountId && (!id(row.project_id) || id(row.project_id) === projectId)).map(row => selected(row, requested));
      const sourceIssues = [], billSourceIssues = [];
      if (!relation(defs.x_plan8_id, "account.analytic.account") || !relation(defs.partner_id, "res.partner")) sourceIssues.push("Les catégories annuelles ou fournisseurs des écritures ne sont pas vérifiables.");
      if (!relation(defs.x_plan8_id, "account.analytic.account")) billSourceIssues.push("Les catégories annuelles des écritures ne sont pas vérifiables.");
      const signatures = new Map();
      for (const row of raw.filter(row => id(row.account_id) === accountId && (!id(row.project_id) || id(row.project_id) === projectId))) {
        if (!id(row.id)) { const warning = "Une écriture annuelle n’a pas d’identifiant vérifiable ; sa liste et son exclusion restent indisponibles."; sourceIssues.push(warning); billSourceIssues.push(warning); }
        const signature = JSON.stringify([row.date, row.amount, row.account_type, row.parent_state, id(row.x_plan8_id), id(row.partner_id), id(row.employee_id), id(row.product_uom_id), id(row.move_id), id(row.move_line_id), amountCurrencyField ? id(row[amountCurrencyField]) : null]);
        if (signatures.has(row.id) && signatures.get(row.id) !== signature) { const warning = "Une écriture annuelle a des valeurs contradictoires ; sa liste et son exclusion restent indisponibles."; sourceIssues.push(warning); billSourceIssues.push(warning); }
        signatures.set(row.id, signature);
      }
      const supplierNames = await suppliers(rows.filter(row => EXPENSE_TYPES.has(row.account_type) && row.parent_state === "posted").map(row => id(row.partner_id)), rpc, fields);
      const categories = new Set(annual.flatMap(budget => budget.lines.filter(line => /^6/.test(line.accountCode || "")).map(line => line.categoryId).filter(value => value !== null)));
      const evidence = annual.length ? await purchaseEvidence(accountId, categories, rpc, fields) : { available: false, blockAll: false, blockedCategories: new Set(), warnings: [] };
      const units = [...new Set(rows.filter(row => date(row.date) && date(row.date) <= today && id(row.employee_id) !== null && !row.account_type && !id(row.move_id) && !id(row.move_line_id)).map(row => id(row.product_uom_id)).filter(value => value !== null))];
      const hourUnitIds = new Set(), lifetimeWarnings = [];
      if (!amountCurrencyField) lifetimeWarnings.push("La devise liée au champ monétaire amount n’est pas vérifiable ; aucun total combiné n’est calculé.");
      const movementDimensions = relation(defs.move_id, "account.move") && relation(defs.move_line_id, "account.move.line");
      if (!movementDimensions) lifetimeWarnings.push("Les liens comptables ne sont pas vérifiables ; les heures ne sont pas assimilées à des coûts de personnel.");
      if (units.length && movementDimensions) {
        try {
          const unitDefs = await fields("uom.uom");
          if (unitDefs.name?.type !== "char" || !relation(unitDefs.category_id, "uom.category")) throw new Error("Unit metadata unavailable");
          const unitRows = (await rpc.read("uom.uom", [["id", "in", units]], ["id", "name", "category_id"]))
            .filter(row => units.includes(row.id) && /^hours?$/i.test(String(row.name).trim()) && id(row.category_id) !== null);
          const categoryIds = [...new Set(unitRows.map(row => id(row.category_id)))];
          const categoryDefs = await fields("uom.category");
          if (categoryDefs.name?.type !== "char") throw new Error("Time category metadata unavailable");
          const categories = categoryIds.length ? await rpc.read("uom.category", [["id", "in", categoryIds]], ["id", "name"]) : [];
          const timeCategories = new Set(categories.filter(row => categoryIds.includes(row.id) && /^(?:working time|time|hours?)$/i.test(String(row.name).trim())).map(row => row.id));
          for (const row of unitRows) if (timeCategories.has(id(row.category_id))) hourUnitIds.add(row.id);
        } catch (_) { lifetimeWarnings.push("Les unités d’heures ne sont pas vérifiables ; les coûts de personnel restent partiels."); }
      }
      if (!relation(defs.employee_id, "hr.employee") || !relation(defs.product_uom_id, "uom.uom")) lifetimeWarnings.push("Les dimensions personnel/unité sont indisponibles ; la couverture des coûts de personnel est inconnue.");
      const descriptions = amountCurrencyField && !billSourceIssues.length ? await billDescriptions(annual, rows, accountId, projectId, defs, rpc, amountCurrencyField) : { values: new Map(), warnings: [] };
      for (const budget of annual) {
        budget.ormitterExclusion = annualExclusion(budget, rows, supplierNames, amountCurrencyField, evidence, sourceIssues, hourUnitIds);
        for (const line of budget.lines.filter(item => /^6/.test(item.accountCode || ""))) line.billDetails = annualBillDetails(budget, line, rows, supplierNames, amountCurrencyField, descriptions, billSourceIssues, hourUnitIds);
      }
      lifetime = aggregateLifetime(rows, { ...project, ...projectCurrency }, today, hourUnitIds, lifetimeWarnings, amountCurrencyField);
    } catch (_) { lifetime = unavailableLifetime("Les coûts analytiques sont indisponibles ou le compte est partagé entre plusieurs projets ; aucun total non filtré n’est utilisé."); }
  }
  return { ok: true, project, asOf: now.toISOString(), macro, conventions, annual, lifetime, warnings };
}

module.exports = { load, normalizeBudget, aggregateLifetime, brusselsDate, annualExclusion };

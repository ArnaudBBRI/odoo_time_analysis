"use strict";

// A narrow purchase-only projection of the existing project-scoped analytic read.
// Document types are verified with read-only metadata/record requests, never labels.
const EXPENSE_TYPES = new Set(["expense", "expense_direct_cost", "expense_depreciation"]);
const NON_EXPENSE_TYPES = new Set(["asset_receivable", "asset_cash", "asset_current", "asset_non_current", "asset_prepayments", "asset_fixed", "liability_payable", "liability_credit_card", "liability_current", "liability_non_current", "equity", "equity_unaffected", "income", "income_other", "off_balance"]);
const PURCHASE_TYPES = new Set(["in_invoice", "in_refund"]);
const numeric = value => typeof value === "number" && Number.isFinite(value) ? value : null;
const id = value => Array.isArray(value) && Number.isSafeInteger(value[0]) && value[0] > 0 ? value[0] : Number.isSafeInteger(value) && value > 0 ? value : null;
const label = value => Array.isArray(value) && typeof value[1] === "string" && value[1].trim() ? value[1] : null;
const relation = (def, model) => def?.type === "many2one" && def.relation === model;
function date(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:$|[ T])/.test(value)) return null;
  const text = value.slice(0, 10), parsed = new Date(`${text}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text ? text : null;
}
function unavailablePurchases(startDate, endDate, issue = "sourceUnavailable") {
  return { status: "unavailable", startDate: date(startDate), endDate, items: [], issues: [issue] };
}
function projection(startDate, endDate, items, issues, unavailable = false) {
  const uniqueIssues = [...new Set(issues)];
  return { status: unavailable ? "unavailable" : uniqueIssues.length ? "partial" : "available", startDate, endDate,
    items: items.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id), issues: uniqueIssues };
}

async function loadPurchases({ projectId, accountId, startDate, today, rows, defs, amountCurrencyField, hourUnitIds = new Set(), rpc, fields }) {
  const start = date(startDate);
  if (!start) return unavailablePurchases(start, today, "startUnavailable");
  if (defs.parent_state?.type !== "selection") return unavailablePurchases(start, today);
  const issues = [], scoped = rows.filter(row => id(row.account_id) === accountId && (!id(row.project_id) || id(row.project_id) === projectId));
  const dimensions = ["id", "account_id", "date", "amount", "account_type", "parent_state",
    ...[["project_id", "project.project"], ["x_plan7_id", "account.analytic.account"], ["x_plan8_id", "account.analytic.account"],
      ["partner_id", "res.partner"], ["move_id", "account.move"], ["move_line_id", "account.move.line"]].filter(([name, model]) => relation(defs[name], model)).map(([name]) => name),
    ...(amountCurrencyField ? [amountCurrencyField] : [])];
  const signature = row => JSON.stringify(dimensions.map(name => row[name] ?? null));
  const couldAffect = row => {
    const recorded = date(row.date);
    const knownPersonnel = !row.account_type && id(row.move_id) === null && id(row.move_line_id) === null
      && relation(defs.employee_id, "hr.employee") && id(row.employee_id) !== null
      && relation(defs.product_uom_id, "uom.uom") && hourUnitIds.has(id(row.product_uom_id));
    return (!recorded || recorded >= start && recorded <= today) && !NON_EXPENSE_TYPES.has(row.account_type)
      && !["draft", "cancel", "removed"].includes(row.parent_state) && !knownPersonnel
      && (EXPENSE_TYPES.has(row.account_type) || id(row.move_id) !== null || id(row.move_line_id) !== null || numeric(row.amount) !== 0);
  };
  const groups = new Map();
  for (const row of scoped) {
    if (!Number.isSafeInteger(row.id) || row.id <= 0) { if (couldAffect(row)) issues.push("incomplete"); continue; }
    if (!groups.has(row.id)) groups.set(row.id, []);
    groups.get(row.id).push(row);
  }
  const eligible = [];
  for (const duplicates of groups.values()) {
    if (!duplicates.some(couldAffect)) continue;
    if (new Set(duplicates.map(signature)).size > 1) { issues.push("duplicateConflict"); continue; }
    const row = duplicates[0];
    if (!EXPENSE_TYPES.has(row.account_type) || row.parent_state !== "posted") { issues.push("incomplete"); continue; }
    const recorded = date(row.date);
    if (!recorded) { issues.push("incomplete"); continue; }
    if (recorded < start || recorded > today) continue;
    if (!relation(defs.move_id, "account.move") || id(row.move_id) === null) { issues.push("documentUnavailable"); continue; }
    eligible.push(row);
  }
  if (!eligible.length) return projection(start, today, [], issues);

  let documentDefs, documents;
  const documentIds = [...new Set(eligible.map(row => id(row.move_id)))], documentIdSet = new Set(documentIds);
  try {
    documentDefs = await fields("account.move");
    const stateCodes = documentDefs.state?.selection?.map(item => item[0]) || [];
    const typeCodes = documentDefs.move_type?.selection?.map(item => item[0]) || [];
    if (documentDefs.state?.type !== "selection" || !stateCodes.includes("posted") || documentDefs.move_type?.type !== "selection"
      || ![...PURCHASE_TYPES].every(code => typeCodes.includes(code))) throw new Error("Unsupported purchase document metadata");
    documents = await rpc.read("account.move", [["id", "in", documentIds]], ["id", "state", "move_type"]);
  } catch (_) { return projection(start, today, [], [...issues, "documentUnavailable"], true); }
  const byDocument = new Map(), conflictingDocuments = new Set();
  for (const document of documents) {
    if (!documentIdSet.has(document.id)) continue;
    const previous = byDocument.get(document.id);
    if (previous && (previous.state !== document.state || previous.move_type !== document.move_type)) conflictingDocuments.add(document.id);
    byDocument.set(document.id, document);
  }
  const items = [], originals = new Map();
  const stateCodes = new Set(documentDefs.state.selection.map(item => item[0]));
  const typeCodes = new Set(documentDefs.move_type.selection.map(item => item[0]));
  for (const row of eligible) {
    const document = byDocument.get(id(row.move_id));
    if (conflictingDocuments.has(id(row.move_id))) { issues.push("duplicateConflict"); continue; }
    if (!document || !stateCodes.has(document.state) || !typeCodes.has(document.move_type)) { issues.push("documentUnavailable"); continue; }
    if (document.state !== "posted" || !PURCHASE_TYPES.has(document.move_type)) continue;
    const categoryKnown = relation(defs.x_plan7_id, "account.analytic.account"), codeKnown = relation(defs.x_plan8_id, "account.analytic.account");
    const categoryId = categoryKnown ? id(row.x_plan7_id) : null, category = categoryKnown ? label(row.x_plan7_id) : null;
    const codeCategoryId = codeKnown ? id(row.x_plan8_id) : null, codeCategory = codeKnown ? label(row.x_plan8_id) : null;
    const code = codeCategoryId !== null ? (codeCategory || "").match(/^\s*(\d{4})\b/)?.[1] || null : null;
    const currencyId = amountCurrencyField ? id(row[amountCurrencyField]) : null;
    const amount = numeric(row.amount);
    if (categoryId === null || !category || codeCategoryId === null || !code) issues.push("mappingMissing");
    if (currencyId === null) issues.push("currencyMissing");
    if (amount === null) issues.push("amountMissing");
    items.push({ id: row.id, date: date(row.date), consumed: amount === null ? null : -amount,
      currencyId, currency: currencyId !== null ? label(row[amountCurrencyField]) : null, categoryId, category, codeCategoryId, codeCategory, code,
      description: null, supplierLabel: relation(defs.partner_id, "res.partner") ? label(row.partner_id) : null,
      documentLabel: label(row.move_id), documentType: document.move_type });
    originals.set(row.id, row);
  }

  // Description text is optional and read only for confirmed, scoped purchase IDs.
  // Recheck the financial snapshot and both dimensions before attaching its text.
  const describable = new Map(items.filter(item => item.consumed !== null && item.currencyId !== null).map(item => [item.id, item]));
  if (describable.size && ["char", "text"].includes(defs.name?.type)) {
    try {
      const requested = [...new Set(dimensions.filter(name => name === "id" || defs[name]).concat("name"))];
      const descriptionRows = await rpc.read("account.analytic.line", [["account_id", "=", accountId], ["id", "in", [...describable.keys()]],
        ["account_type", "in", [...EXPENSE_TYPES]], ["parent_state", "=", "posted"]], requested);
      const descriptions = new Map(), conflicting = new Set();
      for (const row of descriptionRows) {
        const original = originals.get(row.id);
        if (!original || !describable.has(row.id)) continue;
        if (signature(row) !== signature(original)) { conflicting.add(row.id); continue; }
        const value = typeof row.name === "string" && row.name.trim() ? row.name : null;
        if (descriptions.has(row.id) && descriptions.get(row.id) !== value) conflicting.add(row.id);
        descriptions.set(row.id, value);
      }
      for (const item of describable.values()) item.description = conflicting.has(item.id) ? null : descriptions.get(item.id) ?? null;
    } catch (_) { /* Keep verified allocations when optional text is inaccessible. */ }
  }
  if (items.some(item => item.description === null)) issues.push("descriptionsMissing");
  return projection(start, today, items, issues);
}

module.exports = { loadPurchases, unavailablePurchases };

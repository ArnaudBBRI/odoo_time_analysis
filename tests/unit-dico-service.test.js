"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const service = require("../unit-dico-service");
const now = new Date("2026-10-10T12:00:00Z");
function fixture(options = {}) {
  const definitions = options.definitions || {
    id: { type: "integer" }, name: { type: "char" }, display_name: { type: "char" },
    lead_unit_id: { string: "Lead Unit", type: "many2one", relation: "hr.department" },
    x_responsible_unit: { string: "Unit responsable", type: "many2one", relation: "hr.department" },
    date_start: { type: "date" }, date: { type: "date" }
  };
  const rows = options.rows || [
    { id: 11, name: "Project A", display_name: "[54250001] Project A", lead_unit_id: [206, "DiCo"], date_start: "2025-12-01", date: "2028-05-31", active: false },
    { id: 12, name: "Project B", lead_unit_id: [206, "DiCo"], date_start: "2026-01-01", date: "2026-12-31", effective_hours: 0 }
  ];
  const calls = [];
  return { calls, definitions, rows,
    fields: async model => {
      calls.push({ method: "fields_get", model });
      if (options.fieldsError) throw new Error("private-source-secret");
      return options.modelDefinitions?.[model] || definitions;
    },
    read: async (model, domain, fields, readOptions) => {
      calls.push({ method: "search_read", model, domain, fields, options: readOptions });
      if (options.read) return options.read(model, domain, fields, readOptions);
      return rows.map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
    }
  };
}

test("fixed department catalogue retains archived and zero-hour projects without hour or financial reads", async () => {
  const rpc = fixture(), result = await service.load(rpc, now);
  assert.deepEqual(result.unit, { id: 206, name: "RESEARCH & DEVELOPMENT / DIGITAL CONSTRUCTION UNIT" });
  assert.equal(result.responsibleField, "lead_unit_id");
  assert.equal(result.asOf, now.toISOString());
  assert.deepEqual(result.projects, [
    { id: 11, name: "[54250001] Project A", startDate: "2025-12-01", endDate: "2028-05-31", manager: null,
      totalBudget: { amount: null, currencyId: null, currency: null } },
    { id: 12, name: "Project B", startDate: "2026-01-01", endDate: "2026-12-31", manager: null,
      totalBudget: { amount: null, currencyId: null, currency: null } }
  ]);
  assert.deepEqual(result.partnerMap, { status: "unavailable", partners: [] });
  assert.deepEqual(result.organismMap, { status: "unavailable", organisms: [] });
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(rpc.calls.map(call => [call.method, call.model]), [["fields_get", "project.project"], ["search_read", "project.project"]]);
  assert.deepEqual(rpc.calls[1].domain, [["lead_unit_id", "=", 206]]);
  assert.deepEqual(rpc.calls[1].options.context, { active_test: false });
  assert.ok(rpc.calls[1].fields.includes("lead_unit_id"));
  assert.doesNotMatch(JSON.stringify(result), /effective_hours|active|private-source/);
});

function partnerFixture(options = {}) {
  const source = fixture().rows.map((row, index) => ({ ...row, bw_partner_ids: index ? [502] : [501, 502] }));
  const partnerRows = options.partnerRows || [
    { id: 501, name: "  Partner Alpha  " }, { id: 502, name: "Partner Beta" }
  ];
  const rpc = fixture({ rows: source, modelDefinitions: { "res.partner": {
    id: { type: "integer" }, name: { type: "char" }
  } }, read: async (model, domain, fields) => {
    if (options.deniedField && fields.includes(options.deniedField)) throw new Error("private-partner-source-secret");
    if (options.read) return options.read(model, domain, fields, source, partnerRows);
    const rows = model === "res.partner" ? partnerRows : source;
    return rows.map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
  } });
  rpc.definitions.bw_partner_ids = { type: "many2many", relation: "res.partner" };
  return rpc;
}

async function retainedPartnerLoad(rpc) {
  const result = await service.load(rpc, now);
  result.partnerMap = await service.loadPartnerMap(rpc,
    new Map(result.projects.map(project => [project.id, project])), rpc.definitions, result.responsibleField);
  return result;
}

test("partners are projected from exact metadata-confirmed many-to-many links and bounded partner-name reads", async () => {
  const rpc = partnerFixture(), result = await retainedPartnerLoad(rpc);
  assert.deepEqual(result.partnerMap, { status: "available", partners: [
    { id: 501, name: "Partner Alpha", projectIds: [11] },
    { id: 502, name: "Partner Beta", projectIds: [11, 12] }
  ] });
  assert.deepEqual(rpc.calls[2], { method: "search_read", model: "project.project",
    domain: [["id", "in", [11, 12]], ["lead_unit_id", "=", 206]],
    fields: ["id", "lead_unit_id", "bw_partner_ids"], options: { context: { active_test: false } } });
  assert.deepEqual(rpc.calls[3], { method: "fields_get", model: "res.partner" });
  assert.deepEqual(rpc.calls[4], { method: "search_read", model: "res.partner",
    domain: [["id", "in", [501, 502]]], fields: ["id", "name"], options: { context: { active_test: false } } });
  assert.ok(result.projects.every(project => !Object.hasOwn(project, "bw_partner_ids")), "Raw source relations stay outside project DTOs");
});

test("partner projection ignores foreign or unsolicited records and keeps exact overlapping memberships", async () => {
  const rpc = partnerFixture({ read: async (model, _, fields, source, partners) => {
    if (model === "res.partner") return [...partners, { id: 999, name: "PRIVATE_UNSOLICITED_PARTNER" }];
    if (!fields.includes("bw_partner_ids")) return source.map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
    return [
      { id: 11, lead_unit_id: [206, "DiCo"], bw_partner_ids: [501, 502] },
      { id: 12, lead_unit_id: [206, "DiCo"], bw_partner_ids: [502] },
      { id: 13, lead_unit_id: [207, "Other"], bw_partner_ids: [999] },
      { id: 999, lead_unit_id: [206, "DiCo"], bw_partner_ids: [999] }
    ];
  } });
  const result = await retainedPartnerLoad(rpc);
  assert.deepEqual(result.partnerMap.partners.map(partner => [partner.id, partner.projectIds]), [[501, [11]], [502, [11, 12]]]);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_|999/);
});

test("missing, denied, incomplete or contradictory partner evidence fails closed without losing projects", async () => {
  const scenarios = [
    partnerFixture({ deniedField: "bw_partner_ids" }),
    partnerFixture({ partnerRows: [{ id: 501, name: "Partner Alpha" }] }),
    partnerFixture({ partnerRows: [{ id: 501, name: "Partner Alpha" }, { id: 501, name: "Contradiction" }, { id: 502, name: "Partner Beta" }] })
  ];
  for (const rpc of scenarios) {
    const result = await retainedPartnerLoad(rpc);
    assert.deepEqual(result.projects.map(project => project.id), [11, 12]);
    assert.deepEqual(result.partnerMap, { status: "unavailable", partners: [] });
    assert.doesNotMatch(JSON.stringify(result), /private-partner-source-secret/);
  }
});

test("the hidden partner option adds no partner source reads during a normal catalogue load", async () => {
  const rpc = partnerFixture(), result = await service.load(rpc, now);
  assert.deepEqual(result.partnerMap, { status: "unavailable", partners: [] });
  assert.ok(!rpc.calls.some(call => call.fields?.includes("bw_partner_ids") || call.model === "res.partner"));
});

function organismFixture(options = {}) {
  const source = fixture().rows.map((row, index) => ({ ...row,
    organism_id: [index ? 602 : 601, `Decorated source body ${index + 1} BE0123`],
    funding_type_id: [901, "Not a financing body"], bw_partner_ids: [999] }));
  const organisms = options.organisms || [{ id: 601, name: "  Funding Alpha  " }, { id: 602, name: "Funding Beta" }];
  const rpc = fixture({ rows: source, modelDefinitions: { "res.partner": {
    id: { type: "integer" }, name: { type: "char" }
  } }, read: async (model, domain, fields) => {
    if (options.deniedField && fields.includes(options.deniedField)) throw new Error("private-organism-source-secret");
    if (options.deniedModel === model) throw new Error("private-organism-source-secret");
    if (options.read) return options.read(model, domain, fields, source, organisms);
    const rows = model === "res.partner" ? organisms : source;
    return rows.map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
  } });
  rpc.definitions.organism_id = { type: "many2one", relation: "res.partner" };
  rpc.definitions.funding_type_id = { type: "many2one", relation: "bw.project.funding.type" };
  rpc.definitions.bw_partner_ids = { type: "many2many", relation: "res.partner" };
  return { rpc, source, organisms };
}

test("financing bodies use exact project organism links and only linked partner names", async () => {
  const { rpc } = organismFixture(), result = await service.load(rpc, now);
  assert.deepEqual(result.organismMap, { status: "available", organisms: [
    { id: 601, name: "Funding Alpha", projectIds: [11] },
    { id: 602, name: "Funding Beta", projectIds: [12] }
  ] });
  assert.deepEqual(rpc.calls[2], { method: "search_read", model: "project.project",
    domain: [["id", "in", [11, 12]], ["lead_unit_id", "=", 206]],
    fields: ["id", "lead_unit_id", "organism_id"], options: { context: { active_test: false } } });
  assert.deepEqual(rpc.calls[4], { method: "search_read", model: "res.partner",
    domain: [["id", "in", [601, 602]]], fields: ["id", "name"], options: { context: { active_test: false } } });
  assert.ok(!rpc.calls.some(call => call.fields?.some(field => ["funding_type_id", "bw_partner_ids"].includes(field))));
  assert.doesNotMatch(JSON.stringify(result), /Decorated|BE0123|Not a financing body|organism_id|bw_partner_ids/);
});

test("each catalogue refresh reflects financing-body changes, new projects and renamed source bodies dynamically", async () => {
  const { rpc, source, organisms } = organismFixture();
  const first = await service.load(rpc, now);
  source[0].organism_id = [602, "Funding Beta"];
  source.push({ ...source[1], id: 16, name: "Project C", organism_id: [603, "New body"] });
  organisms[1].name = "Funding Beta renamed";
  organisms.push({ id: 603, name: "New body" });
  const refreshed = await service.load(rpc, new Date("2026-10-26T12:00:00Z"));
  assert.deepEqual(refreshed.organismMap, { status: "available", organisms: [
    { id: 602, name: "Funding Beta renamed", projectIds: [11, 12] },
    { id: 603, name: "New body", projectIds: [16] }
  ] });
  assert.deepEqual(first.organismMap.organisms.map(body => [body.id, body.name, body.projectIds]),
    [[601, "Funding Alpha", [11]], [602, "Funding Beta", [12]]]);
});

test("financing projection discards foreign units and unsolicited projects and body names", async () => {
  const { rpc } = organismFixture({ read: async (model, _, fields, source, organisms) => {
    if (model === "res.partner") return [...organisms, { id: 999, name: "PRIVATE_FOREIGN_BODY" }];
    const rows = source.map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
    return fields.includes("organism_id") ? [...rows,
      { id: 13, lead_unit_id: [207, "Other"], organism_id: [999, "PRIVATE_FOREIGN_BODY"] },
      { id: 999, lead_unit_id: [206, "DiCo"], organism_id: [999, "PRIVATE_UNSOLICITED_BODY"] }] : rows;
  } });
  const result = await service.load(rpc, now);
  assert.equal(result.organismMap.status, "available");
  assert.deepEqual(result.organismMap.organisms.map(body => body.projectIds), [[11], [12]]);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_|999/);
});

test("unsupported financing metadata never substitutes funding type, partners or similarly labelled fields", async () => {
  for (const change of [defs => { delete defs.organism_id; }, defs => { defs.organism_id.type = "many2many"; },
    defs => { defs.organism_id.relation = "res.company"; }]) {
    const { rpc } = organismFixture(); change(rpc.definitions);
    rpc.definitions.lookalike_body = { string: "Funding Organism", type: "many2one", relation: "res.partner" };
    const result = await service.load(rpc, now);
    assert.deepEqual(result.organismMap, { status: "unavailable", organisms: [] });
    assert.equal(rpc.calls.length, 2);
  }
});

test("denied, incomplete, malformed or conflicting financing evidence disables only its map", async () => {
  const cases = [
    organismFixture({ deniedField: "organism_id" }), organismFixture({ deniedModel: "res.partner" }),
    organismFixture({ organisms: [{ id: 601, name: "Funding Alpha" }] }),
    organismFixture({ organisms: [{ id: 601, name: "Funding Alpha" }, { id: 601, name: "Contradiction" }, { id: 602, name: "Funding Beta" }] }),
    organismFixture({ read: async (model, _, fields, source) => model === "project.project"
      ? source.slice(0, fields.includes("organism_id") ? 1 : 2).map(row => Object.fromEntries(fields.map(field => [field, row[field]]))) : [] })
  ];
  for (const invalid of [[0, "Invalid"], ["601", "String ID"], 601, [], undefined]) {
    const entry = organismFixture(); entry.source[0].organism_id = invalid; cases.push(entry);
  }
  for (const { rpc } of cases) {
    const result = await service.load(rpc, now);
    assert.deepEqual(result.projects.map(project => project.id), [11, 12]);
    assert.deepEqual(result.organismMap, { status: "unavailable", organisms: [] });
    assert.doesNotMatch(JSON.stringify(result), /private-organism-source-secret/);
  }
});

test("readable absent financing bodies and empty catalogues remain known empty without body lookups", async () => {
  for (const emptyCatalogue of [false, true]) {
    const { rpc, source } = organismFixture();
    if (emptyCatalogue) source.length = 0;
    else { source[0].organism_id = false; source[1].organism_id = null; }
    const result = await service.load(rpc, now);
    assert.deepEqual(result.organismMap, { status: "available", organisms: [] });
    assert.ok(!rpc.calls.some(call => call.model === "res.partner"));
  }
});

test("verified technical responsible-unit field ignores translated labels while requiring its strict department relation", async () => {
  for (const label of ["Lead Unit", "Unit responsable", " Unité   responsable ", "RESPONSIBLE UNIT", "Unrelated translated label", null]) {
    const rpc = fixture(); rpc.definitions.lead_unit_id.string = label;
    assert.equal((await service.load(rpc, now)).projects.length, 2);
  }
  for (const change of [definition => { definition.type = "many2many"; }, definition => { definition.relation = "res.company"; }]) {
    const rpc = fixture(); change(rpc.definitions.lead_unit_id);
    await assert.rejects(() => service.load(rpc, now), /Unit responsable.*indisponible/);
    assert.equal(rpc.calls.length, 1, "Unsupported metadata cannot trigger a project lookup");
  }
});

test("lookalike responsible-unit labels cannot substitute for the verified technical source", async () => {
  const rpc = fixture(); delete rpc.definitions.lead_unit_id;
  await assert.rejects(() => service.load(rpc, now), /Unit responsable.*indisponible/);
  assert.equal(rpc.calls.length, 1, "No lookup may use the other label-matched department relation");
  const verified = fixture(); verified.definitions.x_other_unit = { ...verified.definitions.lead_unit_id, string: "Responsible Unit" };
  assert.equal((await service.load(verified, now)).responsibleField, "lead_unit_id");
  assert.deepEqual(verified.calls[1].domain, [["lead_unit_id", "=", 206]]);
});

test("missing, denied or invalid model metadata never becomes an empty verified catalogue", async () => {
  for (const rpc of [fixture({ fieldsError: true }), fixture({ definitions: [] }), fixture({ definitions: "invalid" })]) {
    await assert.rejects(() => service.load(rpc, now), /indisponibles/);
    assert.equal(rpc.calls.length, 1);
  }
  const rpc = fixture(); delete rpc.definitions.id;
  await assert.rejects(() => service.load(rpc, now), /identités/);
  assert.equal(rpc.calls.length, 1);
});

test("postfilters reject wrong units and malformed IDs, and deduplicate exact project identities", async () => {
  const rpc = fixture(); rpc.rows.push(
    { ...rpc.rows[0], name: "Duplicate later row" },
    { ...rpc.rows[0], id: 13, name: "Foreign unit", lead_unit_id: [207, "DiCo lookalike"] },
    { ...rpc.rows[0], id: 14, name: "Unknown unit", lead_unit_id: false },
    { ...rpc.rows[0], id: "15" }, { ...rpc.rows[0], id: -1 }, { ...rpc.rows[0], id: 1.5 }
  );
  const result = await service.load(rpc, now);
  assert.deepEqual(result.projects.map(project => project.id), [11, 12]);
  assert.equal(result.projects[0].name, "[54250001] Project A");
});

test("empty accessible unit returns an empty catalogue without inferred projects or related reads", async () => {
  const rpc = fixture({ rows: [] }), result = await service.load(rpc, now);
  assert.deepEqual(result.projects, []); assert.deepEqual(result.warnings, []);
  assert.equal(rpc.calls.length, 2);
});

test("only exact Interne and Overhead pseudo-project names, optionally prefixed with a code, are excluded", async () => {
  for (const name of ["Interne", " OVERHEAD ", "[54250000] Interne", "54250000 - Overhead", "54250000: Interne", "54250000 / Overhead"]) {
    assert.equal(service.isExcludedProjectName(name), true, name);
  }
  for (const name of ["Interne innovation", "Overhead monitoring", "Internal innovation", "Research overhead", "Interne-1", "Overhead costs project", null]) {
    assert.equal(service.isExcludedProjectName(name), false, String(name));
  }
  const names = ["Interne", "[54250000] Overhead", "Interne innovation", "Overhead monitoring"];
  const rpc = fixture({ rows: names.map((name, index) => ({ id: index + 1, name, lead_unit_id: [206, "DiCo"], date_start: "2026-01-01", date: "2027-01-01" })) });
  const result = await service.load(rpc, now);
  assert.deepEqual(result.projects.map(project => project.name), ["Interne innovation", "Overhead monitoring"]);
  assert.deepEqual(result.warnings, []);
});

test("raw pseudo-project names remain excluded even if display names contain a decoration", async () => {
  const rpc = fixture({ rows: [{ id: 1, name: "Interne", display_name: "[54250000] Interne (Archive)", lead_unit_id: [206, "DiCo"] }] });
  assert.deepEqual((await service.load(rpc, now)).projects, []);
});

test("missing or invalid dates preserve project identities and each independently valid endpoint", async () => {
  const rpc = fixture(); rpc.rows[0].date_start = "2026-02-30"; rpc.rows[1].date = false;
  const result = await service.load(rpc, now);
  assert.deepEqual(result.projects.map(project => [project.startDate, project.endDate]), [[null, "2028-05-31"], ["2026-01-01", null]]);
  assert.equal(result.warnings.length, 1); assert.match(result.warnings[0], /^2 projet/);
});

test("reversed dates retain known endpoints and disclose an untraceable period", async () => {
  const rpc = fixture(); rpc.rows[1].date_start = "2027-01-01";
  const project = (await service.load(rpc, now));
  assert.deepEqual([project.projects[1].startDate, project.projects[1].endDate], ["2027-01-01", "2026-12-31"]);
  assert.match(project.warnings[0], /fin antérieure au début/);
});

test("metadata-unavailable date fields are not requested and remain unavailable, never substituted", async () => {
  const rpc = fixture(); delete rpc.definitions.date_start; rpc.definitions.date.type = "char";
  rpc.definitions.planned_date_begin = { type: "date" };
  const result = await service.load(rpc, now);
  assert.ok(result.projects.every(project => project.startDate === null && project.endDate === null));
  assert.ok(!rpc.calls[1].fields.includes("date_start")); assert.ok(!rpc.calls[1].fields.includes("date"));
  assert.ok(!rpc.calls[1].fields.includes("planned_date_begin"));
  assert.match(result.warnings[0], /2 projet/);
});

test("strict calendar validation accepts leap dates and conventional metadata-confirmed timestamps only", () => {
  assert.equal(service.projectDate("2028-02-29", "date"), "2028-02-29");
  assert.equal(service.projectDate("2025-02-29", "date"), null);
  assert.equal(service.projectDate("2026-01-02 13:04:05", "datetime"), "2026-01-02");
  assert.equal(service.projectDate("2026-01-02T13:04:05.123Z", "datetime"), "2026-01-02");
  for (const value of ["0000-01-01", "2026-01-02oops", "2026-01-02 24:00:00", "2026-01-02 12:60:00", "2026-01-02 12:00:60", "2026-02-30 12:00:00", false, 0]) {
    assert.equal(service.projectDate(value, "datetime"), null, String(value));
  }
  assert.equal(service.projectDate("2026-01-02 13:04:05", "date"), null);
});

test("optional date-read denial recovers the core catalogue and preserves the other readable endpoint", async () => {
  const source = fixture().rows;
  const rpc = fixture({ read: async (_, domain, fields) => {
    if (fields.includes("date_start")) throw new Error("private-source-secret");
    return source.map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
  } });
  const result = await service.load(rpc, now);
  assert.deepEqual(result.projects.map(project => [project.id, project.startDate, project.endDate]), [[11, null, "2028-05-31"], [12, null, "2026-12-31"]]);
  const recovery = rpc.calls.filter(call => call.method === "search_read").slice(2);
  assert.equal(recovery.length, 2);
  for (const call of recovery) {
    assert.deepEqual(call.domain, [["id", "in", [11, 12]], ["lead_unit_id", "=", 206]]);
    assert.deepEqual(call.options.context, { active_test: false });
  }
  assert.doesNotMatch(JSON.stringify(result), /private-source-secret/);
});

test("optional date recovery rejects cross-unit and unsolicited project rows", async () => {
  const source = fixture().rows;
  const rpc = fixture({ read: async (_, domain, fields) => {
    if (fields.includes("date_start") && fields.includes("date")) throw new Error("Optional dates denied");
    if (domain[0][0] === "id") return [
      { id: 11, lead_unit_id: [207, "Foreign unit"], date_start: "1900-01-01", date: "2100-01-01" },
      { id: 999, lead_unit_id: [206, "DiCo"], date_start: "1900-01-01", date: "2100-01-01" }
    ];
    return source.map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
  } });
  const result = await service.load(rpc, now);
  assert.deepEqual(result.projects.map(project => project.id), [11, 12]);
  assert.ok(result.projects.every(project => project.startDate === null && project.endDate === null));
});

test("unrequested source date columns cannot defeat an explicit optional date-read denial", async () => {
  const source = fixture().rows;
  const rpc = fixture({ read: async (_, domain, fields) => {
    if (fields.includes("date_start")) throw new Error("Optional start date denied");
    return source;
  } });
  const result = await service.load(rpc, now);
  assert.ok(result.projects.every(project => project.startDate === null));
  assert.deepEqual(result.projects.map(project => project.endDate), ["2028-05-31", "2026-12-31"]);
});

test("unrecoverable catalogue errors are sanitized and cannot become a verified empty unit", async () => {
  const rpc = fixture({ read: async () => { throw new Error("private-source-secret"); } });
  await assert.rejects(() => service.load(rpc, now), error => {
    assert.match(error.message, /projets de l’unité DiCo.*indisponibles/);
    assert.doesNotMatch(error.message, /private-source-secret/); return true;
  });
  assert.equal(rpc.calls.length, 3);
});

test("project labels are projected as plain text and no unsupported source fields leak into the DTO", async () => {
  const rpc = fixture(); rpc.rows[1].name = "<img src=x onerror=alert(1)>";
  rpc.rows[1].password = "private-source-secret";
  const result = await service.load(rpc, now);
  assert.ok(result.projects.some(project => project.name === "<img src=x onerror=alert(1)>"));
  assert.ok(result.projects.every(project => Object.keys(project).join(",") === "id,name,startDate,endDate,manager,totalBudget"));
  assert.doesNotMatch(JSON.stringify(result), /private-source-secret|password/);
});

function budgetRpc(options = {}) {
  const definitions = { ...fixture().definitions, total_budget_convention: { type: "float" },
    currency_id: { type: "many2one", relation: "res.currency" }, budget_staffing_convention_hours: { type: "float" } };
  const rows = fixture().rows.map((row, index) => ({ ...row, total_budget_convention: index ? 0 : 234567.89123,
    currency_id: [index + 1, index ? "USD" : "EUR"], budget_staffing_convention_hours: 3890.4,
    password: "private-source-secret" }));
  return fixture({ definitions, rows, ...options });
}

test("Unit DiCo card totals enrich only exact retained IDs within the fixed department and use the lifetime convention scalar", async () => {
  const rpc = budgetRpc(), result = await service.load(rpc, now);
  assert.deepEqual(result.projects.map(project => project.totalBudget), [
    { amount: 234567.89123, currencyId: 1, currency: "EUR" }, { amount: 0, currencyId: 2, currency: "USD" }
  ]);
  assert.equal(rpc.calls.length, 3);
  assert.deepEqual(rpc.calls[2], { method: "search_read", model: "project.project",
    domain: [["id", "in", [11, 12]], ["lead_unit_id", "=", 206]],
    fields: ["id", "lead_unit_id", "total_budget_convention", "currency_id"], options: { context: { active_test: false } } });
  assert.doesNotMatch(JSON.stringify(result), /password|private-source|3890|budget_staffing/);
  assert.equal(result.projects[0].startDate, "2025-12-01");
});

test("Unit DiCo budget enrichment excludes wrong units, unsolicited IDs, duplicates and unrequested source fields", async () => {
  const source = budgetRpc().rows;
  const rpc = budgetRpc({ read: async (_, domain) => domain[0][0] === "id" ? [
    { ...source[0], lead_unit_id: [207, "Foreign unit"], total_budget_convention: 99999999 },
    { ...source[1], total_budget_convention: -12.34 },
    { ...source[1], total_budget_convention: 99999999 },
    { ...source[0], id: 99, total_budget_convention: 99999999 },
    { ...source[0], id: "11", total_budget_convention: 99999999 }
  ] : source });
  const result = await service.load(rpc, now);
  assert.deepEqual(result.projects.map(project => project.id), [11, 12]);
  assert.deepEqual(result.projects.map(project => project.totalBudget), [
    { amount: null, currencyId: null, currency: null }, { amount: -12.34, currencyId: 2, currency: "USD" }
  ]);
  assert.doesNotMatch(JSON.stringify(result), /password|private-source|99999999|Foreign unit/);
});

for (const denied of ["total_budget_convention", "currency_id"]) {
  test(`Unit DiCo retains all projects/dates and independently recovers optional budget metadata after ${denied} denial`, async () => {
    const source = budgetRpc().rows;
    const rpc = budgetRpc({ read: async (_, domain, fields) => {
      if (fields.includes(denied)) throw new Error("private-source-secret");
      // Extra source fields must not defeat an explicit amount/currency denial.
      return source;
    } });
    const result = await service.load(rpc, now);
    assert.deepEqual(result.projects.map(project => project.id), [11, 12]);
    assert.deepEqual(result.projects[0].totalBudget, denied === "total_budget_convention"
      ? { amount: null, currencyId: 1, currency: "EUR" } : { amount: 234567.89123, currencyId: null, currency: null });
    assert.deepEqual(result.projects.map(project => [project.startDate, project.endDate]),
      [["2025-12-01", "2028-05-31"], ["2026-01-01", "2026-12-31"]]);
    const reads = rpc.calls.filter(call => call.method === "search_read").slice(1);
    assert.equal(reads.length, 3);
    assert.ok(reads.every(call => JSON.stringify(call.domain) === JSON.stringify([["id", "in", [11, 12]], ["lead_unit_id", "=", 206]])));
    assert.doesNotMatch(JSON.stringify(result), /private-source-secret/);
  });
}

test("Unit DiCo preserves catalogue and known dates after complete optional budget denial", async () => {
  const source = budgetRpc().rows;
  const rpc = budgetRpc({ read: async (_, domain, fields) => {
    if (fields.includes("total_budget_convention") || fields.includes("currency_id")) throw new Error("private-source-secret");
    return source;
  } });
  const result = await service.load(rpc, now);
  assert.equal(result.projects.length, 2);
  assert.ok(result.projects.every(project => project.totalBudget.amount === null && project.totalBudget.currency === null));
  assert.ok(result.projects.every(project => project.startDate && project.endDate));
  assert.doesNotMatch(JSON.stringify(result), /secret/);
});

test("Unit DiCo empty or unsupported budget metadata skips budget reads and leaves honest unknown totals", async () => {
  const empty = budgetRpc({ rows: [] }); await service.load(empty, now);
  assert.equal(empty.calls.length, 2);
  const rpc = budgetRpc(); rpc.definitions.total_budget_convention.type = "char"; rpc.definitions.currency_id.relation = "res.company";
  const result = await service.load(rpc, now);
  assert.ok(result.projects.every(project => project.totalBudget.amount === null && project.totalBudget.currencyId === null));
  assert.equal(rpc.calls.length, 2);
});

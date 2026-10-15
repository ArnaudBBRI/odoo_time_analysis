"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const service = require("../programme-service");
const requested = ["Pauline Dewez", "Timothée Lonfils", "François Denis"];

function fixture(options = {}) {
  const calls = [];
  const rows = options.rows || [
    { id: 21, name: "DEWEZ Pauline", image_128: "photo-a" },
    { id: 22, name: "Timothee Lonfils", image_128: "photo-b" },
    { id: 23, name: "Denis François", image_128: "photo-c" }
  ];
  return { calls,
    fields: async model => {
      calls.push({ method: "fields_get", model });
      if (options.fieldsError) throw new Error("private-source-secret");
      return options.fields || { id: { type: "integer" }, name: { type: "char" }, image_128: { type: "binary" } };
    },
    read: async (model, domain, fields, readOptions) => {
      calls.push({ method: "search_read", model, domain, fields, options: readOptions });
      if (options.read) return options.read(model, domain, fields);
      return rows.map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
    }
  };
}
const decode = value => typeof value === "string" && value.startsWith("photo-") ? `data:image/png;base64,${value}` : null;

test("three fixed programme definitions are independent of legacy configuration and response mutation", () => {
  const expected = [
    ["DC1", "Backbone", "To Structure", "Pauline Dewez"],
    ["DC2", "Insight", "To Act", "Timothée Lonfils"],
    ["DC3", "Manufacturing", "To Make", "François Denis"]
  ];
  const first = service.catalogue();
  assert.deepEqual(first.programmes.map(p => [p.id, p.subtitle, p.catchphrase, p.manager.name]), expected);
  assert.ok(first.programmes.every(p => p.code === p.id && p.name === p.id && p.manager.id === null && p.manager.photoDataUrl === null));
  first.programmes[0].manager.name = "Changed local object"; first.programmes.pop();
  assert.deepEqual(service.catalogue().programmes.map(p => [p.id, p.subtitle, p.catchphrase, p.manager.name]), expected);
});

test("fixed exact-name variants accept reversed order, case and accents before an exact-ID photo read", async () => {
  const rpc = fixture(), result = await service.load(rpc, decode);
  assert.deepEqual(result.programmes.map(p => p.manager.id), [21, 22, 23]);
  assert.deepEqual(result.programmes.map(p => p.manager.name), requested);
  assert.deepEqual(result.programmes.map(p => p.manager.photoDataUrl), ["photo-a", "photo-b", "photo-c"].map(decode));
  assert.deepEqual(rpc.calls.map(c => [c.model, c.method]), [["res.users", "fields_get"], ["res.users", "search_read"], ["res.users", "search_read"]]);
  const identity = rpc.calls[1];
  assert.deepEqual(identity.fields, ["id", "name"]);
  const conditions = identity.domain.filter(Array.isArray);
  assert.equal(identity.domain.filter(x => x === "|").length, conditions.length - 1);
  assert.ok(conditions.every(([field, operator, value]) => field === "name" && operator === "=ilike" && !/[%_]/.test(value)));
  assert.deepEqual(new Set(conditions.map(c => c[2])), new Set([
    "Pauline Dewez", "Dewez Pauline", "Timothée Lonfils", "Timothee Lonfils", "Lonfils Timothée", "Lonfils Timothee",
    "François Denis", "Francois Denis", "Denis François", "Denis Francois"
  ]));
  assert.deepEqual(rpc.calls[2].domain, [["id", "in", [21, 22, 23]]]);
  assert.deepEqual(rpc.calls[2].fields, ["id", "name", "image_128"]);
  assert.ok(rpc.calls.filter(c => c.method === "search_read").every(c => c.options.context.active_test === false));
});

test("unrequested names, substrings, malformed IDs and inconsistent identities never receive a photo", async () => {
  const rpc = fixture({ rows: [
    { id: 21, name: "Pauline Dewez Jr", image_128: "photo-wrong" },
    { id: "22", name: "Timothée Lonfils", image_128: "photo-wrong" },
    { id: 0, name: "François Denis", image_128: "photo-wrong" },
    { id: -3, name: "François Denis", image_128: "photo-wrong" },
    { id: 24, name: "Pauline Dewez", image_128: "photo-a" },
    { id: 24, name: "Foreign person", image_128: "photo-wrong" }
  ] });
  const result = await service.load(rpc, decode);
  assert.ok(result.programmes.every(p => p.manager.id === null && p.manager.photoDataUrl === null));
  assert.equal(rpc.calls.length, 2);
  assert.doesNotMatch(JSON.stringify(result), /Foreign person|photo-wrong|Dewez Jr/);
});

test("duplicate exact people remain ambiguous while a duplicated identical ID does not invent another person", async () => {
  const rpc = fixture({ rows: [
    { id: 21, name: "Pauline Dewez", image_128: "photo-a" },
    { id: 29, name: "DEWEZ Pauline", image_128: "photo-other" },
    { id: 22, name: "Timothée Lonfils", image_128: "photo-b" },
    { id: 22, name: "Lonfils Timothee", image_128: "photo-b" }
  ] });
  const result = await service.load(rpc, decode);
  assert.deepEqual(result.programmes.map(p => p.manager.id), [null, 22, null]);
  // Duplicate photo response rows fail closed even when their contents agree.
  assert.ok(result.programmes.every(p => p.manager.photoDataUrl === null));
  assert.deepEqual(rpc.calls[2].domain, [["id", "in", [22]]]);
});

test("missing or denied identity metadata and reads preserve all fixed cards without leaking faults", async () => {
  for (const options of [
    { fieldsError: true }, { fields: {} }, { fields: { id: { type: "char" }, name: { type: "char" } } },
    { fields: { id: { type: "integer" }, name: { type: "text" } } },
    { read: async () => { throw new Error("private-source-secret"); } },
    { read: async () => ({ invalid: true }) }, { rows: [] }
  ]) {
    const rpc = fixture(options), result = await service.load(rpc, decode);
    assert.deepEqual(result, service.catalogue());
    assert.doesNotMatch(JSON.stringify(result), /private-source-secret/);
    assert.ok(rpc.calls.length <= 2);
  }
});

test("missing, denied or unsupported optional image data preserves independently resolved identities", async () => {
  for (const image of [undefined, { type: "char" }]) {
    const rpc = fixture({ fields: { id: { type: "integer" }, name: { type: "char" }, image_128: image } });
    const result = await service.load(rpc, decode);
    assert.deepEqual(result.programmes.map(p => p.manager.id), [21, 22, 23]);
    assert.ok(result.programmes.every(p => p.manager.photoDataUrl === null)); assert.equal(rpc.calls.length, 2);
  }
  const rpc = fixture({ read: async (_, domain, fields) => {
    if (fields.includes("image_128")) throw new Error("private-source-secret");
    return [{ id: 21, name: "Pauline Dewez" }];
  } });
  const result = await service.load(rpc, decode);
  assert.equal(result.programmes[0].manager.id, 21);
  assert.ok(result.programmes.every(p => p.manager.photoDataUrl === null));
  assert.doesNotMatch(JSON.stringify(result), /private-source-secret/);
});

test("photo responses require the resolved ID and unchanged exact name, and decoding errors stay optional", async () => {
  const identityRows = [{ id: 21, name: "Pauline Dewez" }, { id: 22, name: "Timothée Lonfils" }, { id: 23, name: "François Denis" }];
  const rpc = fixture({ read: async (_, domain, fields) => fields.includes("image_128") ? [
    { id: 21, name: "Foreign person", image_128: "photo-wrong" },
    { id: 22, name: "Timothée Lonfils", image_128: "throw" },
    { id: 23, name: "Denis François", image_128: "photo-c" },
    { id: 999, name: "Pauline Dewez", image_128: "photo-wrong" }
  ] : identityRows });
  const result = await service.load(rpc, value => { if (value === "throw") throw new Error("decoder-secret"); return decode(value); });
  assert.deepEqual(result.programmes.map(p => p.manager.photoDataUrl), [null, null, decode("photo-c")]);
  assert.deepEqual(result.programmes.map(p => p.manager.id), [21, 22, 23]);
  assert.doesNotMatch(JSON.stringify(result), /Foreign person|photo-wrong|decoder-secret/);
});

const programmeCodes = {
  DC1: ["51232020", "54232014", "54232022", "55242009", "55252050", "56202061", "57252087", "51261787", "51252062", "55261797"],
  DC2: ["54222092", "55242029", "55242030", "55242037", "55252098", "59252034", "59252044", "56261849"],
  DC3: ["56232072", "56242022", "54252043", "55232032", "62261858"]
};
function projectFixture(options = {}) {
  const calls = [], rows = options.rows || Object.values(programmeCodes).flat().map((code, index) => ({
    id: index + 100, name: `[Project ${index}] [${code}] Fictional project ${index}`,
    display_name: `[Project ${index}] [${code}] Fictional project ${index}`,
    date_start: "2025-12-01", date: "2028-12-31", total_budget_convention: 12345.67,
    currency_id: [1, "EUR"], lead_unit_id: [207, "Another unit"]
  }));
  const fields = options.fields || { id: { type: "integer" }, name: { type: "char" }, display_name: { type: "char" },
    date_start: { type: "date" }, date: { type: "date" }, total_budget_convention: { type: "monetary", currency_field: "currency_id" },
    currency_id: { type: "many2one", relation: "res.currency" } };
  return { calls, rows,
    fields: async model => {
      calls.push({ model, method: "fields_get" }); assert.equal(model, "project.project");
      if (options.fieldsError) throw new Error("private-source-secret"); return fields;
    },
    read: async (model, domain, requested, readOptions) => {
      calls.push({ model, method: "search_read", domain, requested, options: readOptions });
      assert.equal(model, "project.project"); assert.ok(domain.length, "No broad project read");
      if (options.read) return options.read(model, domain, requested, rows);
      const conditions = domain.filter(Array.isArray);
      const selected = conditions[0]?.[0] === "id" ? rows.filter(row => conditions[0][2].includes(row.id)) :
        rows.filter(row => conditions.some(([field, operator, value]) => operator === "ilike" && String(row[field] || "").includes(value)));
      return selected.map(row => Object.fromEntries(requested.map(field => [field, row[field]])));
    }
  };
}

test("programme project membership uses exactly the fixed 10/8/5 numeric references without a unit or year filter", async () => {
  for (const programmeId of ["DC1", "DC2", "DC3"]) {
    const rpc = projectFixture(), original = structuredClone(rpc.rows);
    const result = await service.loadProjects(programmeId, rpc, new Date("2026-10-11T12:00:00Z"));
    assert.deepEqual(new Set(result.projects.map(project => /\[(\d{8})\]/.exec(project.name)[1])), new Set(programmeCodes[programmeId]));
    assert.deepEqual(result.coverage, { expected: programmeCodes[programmeId].length, matched: programmeCodes[programmeId].length,
      missing: [], ambiguous: [], lookupComplete: true });
    assert.equal(result.programme.id, programmeId); assert.equal(result.asOf, "2026-10-11T12:00:00.000Z");
    assert.deepEqual(result.warnings, []); assert.deepEqual(rpc.rows, original);
    assert.ok(result.projects.every(project => project.startDate === "2025-12-01" && project.endDate === "2028-12-31" && project.manager === null));
    assert.ok(result.projects.every(project => project.totalBudget.amount === 12345.67 && project.totalBudget.currency === "EUR"));
    const lookups = rpc.calls.filter(call => call.method === "search_read" && call.domain[0] === "|");
    assert.equal(lookups.length, 2);
    for (const lookup of lookups) {
      const conditions = lookup.domain.filter(Array.isArray);
      assert.deepEqual(conditions.map(condition => condition[2]), programmeCodes[programmeId]);
      assert.ok(conditions.every(([field, operator]) => ["name", "display_name"].includes(field) && operator === "ilike"));
    }
    assert.ok(!JSON.stringify(rpc.calls).includes("lead_unit_id"));
    assert.ok(rpc.calls.filter(call => call.method === "search_read").every(call => call.options.context.active_test === false));
    const optional = rpc.calls.filter(call => call.method === "search_read" && call.domain[0]?.[0] === "id");
    assert.equal(optional.length, 2);
    assert.ok(optional.every(call => call.domain.length === 1 && call.domain[0][1] === "in" && call.domain[0][2].length === result.projects.length));
  }
});

test("display-only numeric codes resolve correctly, including the verified in-beTwin 56261849 identity", async () => {
  const rpc = projectFixture(); rpc.rows.forEach(row => { row.name = row.display_name.includes("56261849") ? "in-beTwin" : "Fictional project"; });
  const result = await service.loadProjects("DC2", rpc);
  assert.equal(result.projects.length, 8); assert.equal(result.coverage.missing.length, 0);
  assert.ok(result.projects.some(project => project.name.includes("[56261849]")));
  assert.ok(!rpc.calls.some(call => call.domain?.some?.(condition => Array.isArray(condition) && /Inbetwin|in-beTwin/.test(String(condition[2])))));
});

test("accidental code substrings, unrequested and malformed project IDs cannot enlarge membership", async () => {
  const rpc = projectFixture({ rows: [
    { id: 1, name: "[1542520430] Accidental substring" }, { id: 2, name: "Reference mentions 54252043 incidentally" },
    { id: 3, name: "[99999999] Unlisted project" }, { id: "4", name: "[54252043] Invalid ID" },
    { id: -1, name: "[54252043] Invalid ID" }, { id: 5, name: "54252043 - Valid prefix" }
  ] });
  const result = await service.loadProjects("DC3", rpc);
  assert.deepEqual(result.projects.map(project => project.id), [5]);
  assert.equal(result.coverage.missing.length, 4); assert.equal(result.coverage.ambiguous.length, 0);
  assert.doesNotMatch(JSON.stringify(result), /Accidental substring|incidentally|Unlisted project|Invalid ID/);
});

test("duplicate code identities and contradictory source codes remain excluded with honest ambiguity coverage", async () => {
  const rpc = projectFixture({ rows: [
    { id: 1, name: "[54252043] First accessible identity" },
    { id: 2, name: "[54252043] Second accessible identity" },
    { id: 3, name: "[56232072] Contradictory", display_name: "[56242022] Contradictory" },
    { id: 4, name: "[62261858] Unique identity" }
  ] });
  const result = await service.loadProjects("DC3", rpc);
  assert.deepEqual(result.projects.map(project => project.id), [4]);
  assert.deepEqual(new Set(result.coverage.ambiguous.map(reference => reference.code)), new Set(["54252043", "56232072", "56242022"]));
  assert.deepEqual(result.coverage.missing.map(reference => reference.code), ["55232032"]);
  assert.match(result.warnings.join(" "), /ambigu/); assert.doesNotMatch(JSON.stringify(result), /First accessible|Second accessible|Contradictory/);
});

test("unknown programme IDs and required metadata/read failures never trigger a broad fallback", async () => {
  for (const id of [null, "OTHER", "toString", "__proto__", 3]) {
    const rpc = projectFixture(); await assert.rejects(() => service.loadProjects(id, rpc), /Programme inconnu/);
    assert.equal(rpc.calls.length, 0);
  }
  for (const options of [{ fieldsError: true }, { fields: {} }, { read: async () => { throw new Error("private-source-secret"); } }]) {
    const rpc = projectFixture(options); await assert.rejects(() => service.loadProjects("DC1", rpc), /indisponibles/);
    assert.ok(rpc.calls.length <= 3);
  }
});

test("empty accessible membership discloses missing references without fabricated projects or enrichment reads", async () => {
  const rpc = projectFixture({ rows: [] }), result = await service.loadProjects("DC1", rpc);
  assert.deepEqual(result.projects, []); assert.equal(result.coverage.expected, 10); assert.equal(result.coverage.missing.length, 10);
  assert.equal(result.coverage.ambiguous.length, 0); assert.match(result.warnings.join(" "), /données accessibles/);
  assert.equal(rpc.calls.length, 3);
});

test("denied optional display names and dates retain proven identities and independent date counterparts", async () => {
  const rpc = projectFixture({ read: async (_, domain, requested, rows) => {
    if (requested.includes("display_name") || requested.includes("date_start")) throw new Error("private-source-secret");
    const ids = domain[0]?.[0] === "id" ? domain[0][2] : rows.map(row => row.id);
    return rows.filter(row => ids.includes(row.id)).map(row => Object.fromEntries(requested.map(field => [field, row[field]])));
  } });
  const result = await service.loadProjects("DC3", rpc);
  assert.equal(result.projects.length, 5); assert.equal(result.coverage.lookupComplete, false);
  assert.ok(result.projects.every(project => project.startDate === null && project.endDate === "2028-12-31"));
  assert.match(result.warnings.join(" "), /partielle/); assert.doesNotMatch(JSON.stringify(result), /private-source-secret/);
  assert.ok(rpc.calls.some(call => call.requested?.includes("date") && !call.requested.includes("date_start")));
});

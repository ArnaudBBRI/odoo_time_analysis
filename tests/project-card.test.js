const assert = require("node:assert/strict");
const test = require("node:test");
const { mount, formatDate, formatBudget, nameParts, createTitle } = require("../project-card");
const { domFixture } = require("./dom-fixture");

function mountedCard(project) {
  const container = domFixture(), doc = container.ownerDocument;
  const label = doc.createElement("label"), radio = doc.createElement("input"), name = doc.createElement("span");
  radio.type = "radio"; radio.value = String(project.id); radio.setAttribute("aria-label", project.name);
  name.textContent = project.name; mount(label, radio, project, [name]); container.append(label);
  return { container, label, radio, back: label.querySelectorAll(".project-card-back")[0] };
}

test("project name parts separate bracketed and leading source numbers before or after the acronym", () => {
  for (const [name, shortName, number, fullName] of [
    ["54252043 · [Extrai] Research [2026]", "Extrai", "54252043", "Research [2026]"],
    ["[54252043] [Extrai] Research", "Extrai", "54252043", "Research"],
    ["[Extrai] [54252043] Research", "Extrai", "54252043", "Research"],
    ["Research [Extrai] [54252043]", "Extrai", "54252043", "Research"],
    ["54252043: [Extrai] Research", "Extrai", "54252043", "Research"],
    ["[Extrai] [54252043]", "Extrai", "54252043", ""]
  ]) {
    assert.deepEqual(nameParts({ id: 99999999, name }), { sourceName: name, shortName, number, fullName }, name);
  }
});

test("project acronyms retain case and skip empty and numeric bracket notes", () => {
  for (const [name, shortName, number, fullName] of [
    ["[2026] [54252043] [MiXeD] Research [phase two]", "MiXeD", "54252043", "[2026] Research [phase two]"],
    ["[] [42] [Premier projet] [Second projet] Complete source name", "Premier projet", "", "[] [42] [Second projet] Complete source name"],
    ["[12345x] Research", "12345x", "", "Research"],
    ["[ Acronym ] [ 54252043 ] - Research", "Acronym", "54252043", "Research"]
  ]) {
    assert.deepEqual(nameParts({ id: 99999999, name }), { sourceName: name, shortName, number, fullName }, name);
  }
});

test("names without an acronym or source number use explicit empty rows without substituting the Odoo ID", () => {
  for (const [name, shortName, number, fullName] of [
    ["Project without a shorthand", "Project without a shorthand", "", ""],
    ["[54252043] Research [2026]", "Research [2026]", "54252043", ""],
    ["54252043 - Research", "Research", "54252043", ""],
    ["[2026] Research", "[2026] Research", "", ""],
    ["[Extrai] Research", "Extrai", "", "Research"],
    ["1234 - [Extrai] Research", "Extrai", "", "1234 - Research"],
    ["54252043Research [Extrai]", "Extrai", "", "54252043Research"]
  ]) {
    assert.deepEqual(nameParts({ id: 99999999, name }), { sourceName: name, shortName, number, fullName }, name);
  }
});

test("name parsing removes only chosen identity tokens and preserves malformed names and duplicate-ID suffixes", () => {
  for (const [name, shortName, number, fullName] of [
    ["[Extrai] Full [54252043] [54252043] (ID 11)", "Extrai", "54252043", "Full [54252043] (ID 11)"],
    ["[First] [Second] Full (ID 11)", "First", "", "[Second] Full (ID 11)"],
    ["[Extrai Research", "[Extrai Research", "", ""],
    ["[54252043 Research", "[54252043 Research", "", ""],
    ["Full [Extrai] [54252043] [draft]", "Extrai", "54252043", "Full [draft]"]
  ]) {
    assert.deepEqual(nameParts({ id: 11, name }), { sourceName: name, shortName, number, fullName }, name);
  }
});

test("name parsing preserves the full original source and treats hostile text literally without changing the DTO", () => {
  const name = '  [<img src=x onerror="PRIVATE_SCRIPT()">] [54252043] <script>Full</script> (ID 11)  ';
  const project = { id: 11, name, manager: { name: "Alex Example" }, number: "WRONG", shortName: "WRONG", display_name: "WRONG" };
  const original = structuredClone(project);
  Object.freeze(project);
  assert.deepEqual(nameParts(project), { sourceName: name, shortName: '<img src=x onerror="PRIVATE_SCRIPT()">',
    number: "54252043", fullName: "<script>Full</script> (ID 11)" });
  assert.deepEqual(project, original);
});

test("shared front titles show only the bold short project name with full-source tooltips and safe text", () => {
  const container = domFixture(), doc = container.ownerDocument;
  const name = '[<img src=x onerror="PRIVATE_SCRIPT()">] [54252043] <script>Full</script>';
  const project = { id: 11, name }, original = structuredClone(project);
  for (const source of [project, { id: 99999999, name: "Plain project" }]) {
    const title = createTitle(doc, source, "fixture-name"); container.append(title);
    assert.equal(title.tagName, "span");
    assert.ok(title.className.split(/\s+/).includes("project-card-name"));
    assert.ok(title.className.split(/\s+/).includes("fixture-name"));
    assert.equal(title.title, source.name);
    assert.deepEqual(title.children.map(row => [row.tagName, row.className]), [
      ["strong", "project-card-title"]
    ]);
  }
  assert.deepEqual(container.children[0].children.map(row => row.textContent),
    ['<img src=x onerror="PRIVATE_SCRIPT()">']);
  assert.deepEqual(container.children[1].children.map(row => row.textContent), ["Plain project"]);
  assert.equal(container.querySelectorAll("img").length, 0); assert.equal(container.querySelectorAll("script").length, 0);
  assert.deepEqual(project, original);
});

test("flipped cards retain unbracketed project shorthand wherever it occurs in the source name", () => {
  for (const [name, shorthand] of [
    ["[Autogrout] Automated grouting research", "Autogrout"],
    ["54252043 · [Extrai] Research [2026]", "Extrai"],
    ["[Premier projet] [Second projet] Complete source name", "Premier projet"],
    ["Project without a shorthand", "Project without a shorthand"]
  ]) {
    const project = { id: 11, name, manager: { name: "Alex Example" } }, before = structuredClone(project);
    const { back, radio, label } = mountedCard(project);
    assert.equal(back.querySelectorAll(".project-card-short-name")[0].textContent, shorthand);
    assert.equal(back.querySelectorAll(".project-card-manager-name")[0].textContent, "Alex Example");
    assert.equal(radio.getAttribute("aria-label"), name, "The accessible project identity retains the full source name");
    assert.equal(label.children[0], radio, "The choice stays outside the rotating decorative faces");
    assert.deepEqual(project, before);
  }
});

test("flipped cards keep the manager's bounded raster portrait and expose initials if that portrait fails", () => {
  for (const mime of ["png", "jpeg", "webp"]) {
    const photoDataUrl = `data:image/${mime};base64,aW1hZ2U=`;
    const project = { id: 11, name: "[Autogrout] Full source name", manager: { name: "Alex Example", photoDataUrl },
      startDate: "2025-12-01", endDate: "2028-05-31", totalBudget: { amount: 75, currencyId: 1, currency: "EUR" } };
    const original = structuredClone(project), { back, radio, label } = mountedCard(project);
    const avatar = back.querySelectorAll(".project-card-mini-avatar")[0];
    const image = avatar.querySelectorAll(".project-card-mini-photo")[0];
    assert.equal(image.src, photoDataUrl); assert.equal(image.alt, "");
    assert.equal(avatar.querySelectorAll(".project-card-mini-initials")[0].textContent, "AE");
    assert.equal(back.getAttribute("aria-hidden"), "true", "Repeated visual identity is decorative");
    image.dispatch("error"); assert.equal(image.hidden, true);
    assert.equal(avatar.querySelectorAll(".project-card-mini-initials")[0].hidden, false);
    const descriptions = label.querySelectorAll(".project-card-sr-only");
    assert.equal(descriptions.length, 1); assert.equal(radio.getAttribute("aria-describedby"), descriptions[0].id);
    assert.match(descriptions[0].textContent, /Alex Example.*01\/12\/2025.*31\/05\/2028.*75,00 EUR/);
    assert.deepEqual(project, original);
  }
});

test("flipped identity treats project text literally and rejects remote, active, malformed and oversized portraits", () => {
  const malicious = '[<img src=x onerror="PRIVATE_SCRIPT()">] Full project';
  for (const photoDataUrl of [
    "https://attacker.example/photo.png", "javascript:alert(1)", "data:image/svg+xml;base64,PHN2Zy8+",
    "data:image/png;base64,aW1hZ2U=\n", "data:image/png;base64,aW1h Z2U=",
    `data:image/png;base64,${"A".repeat(400001)}`
  ]) {
    const { container, back } = mountedCard({ id: 11, name: malicious, manager: { name: "Renée Example", photoDataUrl } });
    assert.equal(back.querySelectorAll(".project-card-short-name")[0].textContent, '<img src=x onerror="PRIVATE_SCRIPT()">');
    assert.equal(container.querySelectorAll("img").length, 0); assert.equal(container.querySelectorAll("script").length, 0);
    assert.equal(back.querySelectorAll(".project-card-mini-initials")[0].textContent, "RE");
  }
  const { back } = mountedCard({ id: 12, name: "Unknown manager", manager: null });
  assert.equal(back.querySelectorAll(".project-card-mini-initials")[0].textContent, "?");
});

test("card dates use exact valid calendar dates without interpreting timestamps or impossible dates", () => {
  assert.equal(formatDate("2024-02-29"), "29/02/2024");
  assert.equal(formatDate("2999-12-31"), "31/12/2999", "Chart-only date exclusion does not hide the source on a card");
  assert.equal(formatDate("2025-12-01"), "01/12/2025");
  for (const value of [null, undefined, false, 20261231, "", "2026-02-29", "2026-02-30", "2026-13-01", "0000-01-01",
    "2026-1-1", "2026-12-31 00:00:00", "2026-12-31T00:00:00Z", " 2026-12-31", "<script>date</script>"]) {
    assert.equal(formatDate(value), "Indisponible", String(value));
  }
});

test("card convention totals retain signed monetary amounts, zero and source currency without a default currency", () => {
  const budget = amount => ({ amount, currencyId: 2, currency: " USD " });
  assert.equal(formatBudget(budget(0)), "0,00 USD");
  assert.match(formatBudget(budget(12345.678)).replace(/\s/g, ""), /^12345,68USD$/);
  assert.match(formatBudget(budget(-125.5)).replace(/\s/g, ""), /^-125,50USD$/);
  for (const amount of [null, undefined, false, true, "0", "12345.67", NaN, Infinity, -Infinity]) {
    assert.equal(formatBudget(budget(amount)), "Indisponible", String(amount));
  }
  assert.equal(formatBudget(null), "Indisponible");
});

test("a readable card amount discloses unconfirmed currency instead of assigning one", () => {
  for (const currency of [
    { currencyId: null, currency: "EUR" }, { currencyId: 0, currency: "EUR" },
    { currencyId: "1", currency: "EUR" }, { currencyId: 1, currency: null },
    { currencyId: 1, currency: "   " }, { currencyId: 1, currency: 123 }, {}
  ]) {
    assert.equal(formatBudget({ amount: 100, ...currency }), "100,00 · devise indisponible");
  }
});

test("shared card backs render identity text literally while preserving date and budget metadata outside the visible face", () => {
  const container = domFixture(), doc = container.ownerDocument;
  const malicious = '<img src=x onerror="PRIVATE_SCRIPT()">';
  const project = { id: 11, name: malicious, startDate: "2025-12-01", endDate: "2028-05-31",
    manager: { name: '<script>manager</script>' }, totalBudget: { amount: 75, currencyId: 1, currency: malicious } };
  const original = structuredClone(project), descriptions = [];
  for (let index = 0; index < 2; index += 1) {
    const label = doc.createElement("label"), radio = doc.createElement("input"), name = doc.createElement("span");
    radio.type = "radio"; radio.name = "projects"; radio.setAttribute("aria-label", project.name); name.textContent = project.name;
    assert.equal(mount(label, radio, project, [name]), label); container.append(label);
    assert.equal(label.children[0], radio);
    const front = label.querySelectorAll(".project-card-front")[0], back = label.querySelectorAll(".project-card-back")[0];
    assert.equal(front.textContent, malicious);
    assert.equal(back.querySelectorAll(".project-card-short-name")[0].textContent, malicious);
    assert.equal(back.querySelectorAll(".project-card-manager-name")[0].textContent, project.manager.name);
    assert.equal(back.querySelectorAll(".project-card-field").length, 0);
    assert.equal(back.querySelectorAll(".project-card-date").length, 0);
    assert.equal(back.querySelectorAll(".project-card-budget").length, 0);
    assert.doesNotMatch(back.textContent, /Début01\/12\/2025|Fin31\/05\/2028|Budget total/);
    assert.ok(label.title.startsWith(`${project.name}\n`));
    assert.match(label.title, /Début : 01\/12\/2025\nFin : 31\/05\/2028\nBudget total : 75,00/);
    assert.ok(back.textContent.includes(malicious));
    assert.equal(front.getAttribute("aria-hidden"), "true"); assert.equal(back.getAttribute("aria-hidden"), "true");
    const description = label.querySelectorAll(".project-card-sr-only")[0];
    assert.equal(radio.getAttribute("aria-describedby"), description.id); descriptions.push(description.id);
    assert.ok(description.textContent.includes(project.manager.name)); assert.ok(description.textContent.includes(malicious));
    assert.equal(radio.getAttribute("aria-label"), project.name, "Card mounting preserves the radio's project identity");
    assert.equal(radio.listeners.size, 0, "A CSS flip adds no interception of the native choice interaction");
  }
  assert.equal(new Set(descriptions).size, 2, "Descriptions remain distinct even if display names match");
  assert.equal(container.querySelectorAll("img").length, 0); assert.equal(container.querySelectorAll("script").length, 0);
  assert.deepEqual(project, original);
});

test("missing card identity and metadata remain selectable without invented project numbers, budgets or dates", () => {
  const container = domFixture(), doc = container.ownerDocument;
  const label = doc.createElement("label"), radio = doc.createElement("input"), name = doc.createElement("span");
  radio.type = "radio"; radio.value = "55"; name.textContent = "No readable metadata";
  mount(label, radio, { id: 55, startDate: "2026-02-30", endDate: null, totalBudget: null }, [name]);
  container.append(label);
  const back = label.querySelectorAll(".project-card-back")[0];
  assert.equal(back.querySelectorAll(".project-card-back-number")[0].textContent, "");
  assert.equal(back.querySelectorAll(".project-card-manager-name")[0].textContent, "Responsable indisponible");
  assert.equal(back.querySelectorAll(".project-card-back-full-name")[0].textContent, "");
  assert.equal(back.querySelectorAll(".project-card-field-value").length, 0);
  assert.match(label.title, /Début : Indisponible\nFin : Indisponible\nBudget total : Indisponible/);
  assert.match(label.querySelectorAll(".project-card-sr-only")[0].textContent,
    /Responsable indisponible.*Début : Indisponible.*Fin : Indisponible.*Budget total : Indisponible/);
  assert.equal(radio.value, "55"); assert.equal(radio.type, "radio"); assert.notEqual(radio.disabled, true);
});

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const I18n = require("../i18n-core-messages");
const { domFixture } = require("./dom-fixture");
const PersonalTime = require("../personal-time");
const PersonalCapacity = require("../personal-capacity");
const ProjectCard = require("../project-card");
const ProgrammeBrowser = require("../programme-browser");
const ProjectBudget = require("../project-budget");
const ProjectMonthly = require("../project-monthly");
const ProjectPlanning = require("../project-planning");
const WorkCapacity = require("../work-capacity");
const first = (container, selector) => container.querySelectorAll(selector)[0];
function inLanguage(language, run) {
  const previous = I18n.language();
  I18n.setLanguage(language);
  try { return run(); } finally { I18n.setLanguage(previous); }
}

test("the core catalogue supplies both languages with identical named placeholders", () => {
  const entries = I18n.catalogue();
  assert.ok(Object.keys(entries).length >= 350);
  const parameters = text => [...new Set([...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(match => match[1]))].sort();
  for (const [key, entry] of Object.entries(entries)) {
    assert.equal(typeof entry.fr, "string", key); assert.equal(typeof entry.nl, "string", key);
    assert.ok(entry.fr.length > 0 && entry.nl.length > 0, key);
    assert.deepEqual(parameters(entry.fr), parameters(entry.nl), key);
  }
  const copy = I18n.catalogue(); copy["common.unavailable"].nl = "modified";
  assert.equal(I18n.t("common.unavailable", {}, "nl"), "Niet beschikbaar");
});

test("French is the default and invalid language inputs fall back to French", () => {
  inLanguage("fr", () => {
    assert.equal(I18n.locale(), "fr-BE"); assert.equal(I18n.t("common.unavailable"), "Indisponible");
    assert.equal(I18n.setLanguage("nl"), "nl"); assert.equal(I18n.language(), "nl"); assert.equal(I18n.locale(), "nl-BE");
    for (const invalid of ["en", "NL", "nl-BE", "", null, undefined, {}, ["nl"]]) {
      I18n.setLanguage("nl"); assert.equal(I18n.setLanguage(invalid), "fr");
    }
    assert.equal(I18n.t("unknown.key"), "unknown.key");
    assert.equal(I18n.t("personal.visibleProjectCount", { p0: 2, p1: 5 }), "2 / 5 affichés");
    assert.equal(I18n.t("personal.visibleProjectCount", { p0: 2, p1: 5 }, "nl"), "2 / 5 getoond");
  });
});

test("catalogue registration validates atomically and rejects placeholder or translation conflicts", () => {
  assert.throws(() => I18n.register({ "test.missing": { fr: "Texte" } }), /Missing FR\/NL/);
  assert.throws(() => I18n.register({ "test.invalid": { fr: "{hours} heures", nl: "{days} dagen" } }), /placeholders/);
  assert.throws(() => I18n.register({ "test.notCommitted": { fr: "Test", nl: "Test" }, "common.unavailable": { fr: "X", nl: "Y" } }), /Conflicting/);
  assert.equal(I18n.t("test.notCommitted"), "test.notCommitted");
  I18n.register({ "test.parameterSafety": { fr: "Nom : {name} / {name}.", nl: "Naam: {name} / {name}." } });
  const value = "<script>François $& {hours}</script>";
  assert.equal(I18n.t("test.parameterSafety", { name: value }, "nl"), `Naam: ${value} / ${value}.`);
  assert.equal(I18n.t("test.parameterSafety", Object.create({ name: "inherited" })), "Nom : {name} / {name}.");
});

test("numbers, hours and display dates follow live locale without changing canonical dates", () => {
  inLanguage("fr", () => {
    assert.equal(I18n.formatNumber(1234.5, { maximumFractionDigits: 1 }), new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 1 }).format(1234.5));
    assert.equal(I18n.formatDate("2026-08-01", { month: "long" }), "août");
    assert.equal(I18n.formatHours(null), "Indisponible");
    I18n.setLanguage("nl");
    assert.equal(I18n.formatNumber(1234.5, { maximumFractionDigits: 1 }), new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 1 }).format(1234.5));
    assert.equal(I18n.formatHours(1234.5), `${new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 2 }).format(1234.5)} h`);
    assert.equal(I18n.formatDate("2026-08-01", { month: "long" }), "augustus");
    for (const invalid of [null, undefined, true, false, "invalid"]) assert.equal(I18n.formatDate(invalid), "Niet beschikbaar");
    assert.equal(I18n.formatNumber(Infinity), "Niet beschikbaar");
    assert.equal(I18n.formatNumber(1234.5, {}, "fr"), new Intl.NumberFormat("fr-BE").format(1234.5));
    assert.equal(I18n.language(), "nl", "An explicit format locale must not mutate the selected language");
  });
});

test("explicit application-message resolution preserves source captures and leaves unknown messages alone", () => {
  inLanguage("nl", () => {
    assert.equal(I18n.message("Planning indisponible"), "Planning niet beschikbaar");
    assert.equal(I18n.message("Calendrier non publié : capacité annuelle reprise de 2026."), "Kalender niet gepubliceerd: jaarcapaciteit overgenomen uit 2026.");
    const source = "François [eXtRAI] $& <img src=x>";
    const text = I18n.t("test.parameterSafety", { name: source }, "fr");
    assert.equal(I18n.message(text), I18n.t("test.parameterSafety", { name: source }, "nl"));
    assert.equal(I18n.message("Source name: Planning indisponible"), "Source name: Planning indisponible", "Only whole application messages match");
    assert.equal(I18n.message("Nom : Alice / Bob."), "Nom : Alice / Bob.", "Repeated captures must be consistent");
    assert.equal(I18n.message("Planning niet beschikbaar", "fr"), "Planning indisponible");
    assert.equal(I18n.message(null), null);
    assert.equal(I18n.language(), "nl");
  });
});

test("English source aliases resolve to canonical French/Dutch with exact immutable placeholder captures", () => {
  const entry = { fr: "Lecture de {project} indisponible ({count}).", nl: "Uitlezing van {project} niet beschikbaar ({count}).",
    source: "Reading {project} is unavailable ({count}).", aliases: ["Unable to read {project} ({count})."] };
  I18n.register({ "test.sourceAliases": entry });
  entry.aliases[0] = "changed"; entry.source = "changed";
  const sourceName = "François [eXtRAI] $& <script>";
  inLanguage("nl", () => {
    assert.equal(I18n.message(`Reading ${sourceName} is unavailable (17).`), `Uitlezing van ${sourceName} niet beschikbaar (17).`);
    assert.equal(I18n.message(`Unable to read ${sourceName} (17).`, "fr"), `Lecture de ${sourceName} indisponible (17).`);
    assert.equal(I18n.language(), "nl");
    assert.equal(I18n.message(`Prefix Reading ${sourceName} is unavailable (17).`), `Prefix Reading ${sourceName} is unavailable (17).`);
  });
  const snapshot = I18n.catalogue(); snapshot["test.sourceAliases"].aliases[0] = "mutated";
  assert.equal(I18n.catalogue()["test.sourceAliases"].aliases[0], "Unable to read {project} ({count}).");
  assert.throws(() => I18n.register({ "test.invalidSource": { fr: "{project}", nl: "{project}", source: "{other}" } }), /placeholders/);
  assert.throws(() => I18n.register({ "test.invalidAliases": { fr: "Texte", nl: "Tekst", aliases: [false] } }), /aliases/);
  assert.throws(() => I18n.register({ "test.sourceAliases": { ...I18n.catalogue()["test.sourceAliases"], source: "Other {project} ({count})." } }), /Conflicting translation source/);
  assert.throws(() => I18n.register({ "test.aliasCollision": { fr: "Autre {project} ({count}).", nl: "Ander {project} ({count}).", source: "Reading {project} is unavailable ({count})." } }), /Conflicting translation alias/);
  assert.equal(I18n.t("test.aliasCollision"), "test.aliasCollision");
});

test("browser language changes emit one event per actual change and catalogue UMDs expose the same API", () => {
  const events = [], context = vm.createContext({ Intl, Date, Map, Object,
    dispatchEvent: event => events.push(event), CustomEvent: function (type, options) { this.type = type; this.detail = options.detail; } });
  for (const file of ["../i18n", "../i18n-core-messages"]) vm.runInContext(fs.readFileSync(require.resolve(file), "utf8"), context);
  const api = context.DashboardI18n;
  assert.equal(api.language(), "fr"); api.setLanguage("fr"); api.setLanguage("nl"); api.setLanguage("nl"); api.setLanguage("invalid");
  assert.equal(events.length, 2); assert.equal(events[0].type, "dashboard:languagechange");
  assert.equal(events[0].detail.language, "nl"); assert.equal(events[1].detail.locale, "fr-BE");
  assert.equal(api.t("capacity.heading", {}, "nl"), "Werkcapaciteit en planning");
});

test("persistent capacity cards translate in place and retain disclosure, focus and warning evidence", () => {
  inLanguage("fr", () => {
    const container = domFixture(), model = { status: "available", referenceYear: 2026, availableHours: 1733.1, availableDays: 218,
      plannedHours: 1237.2, warnings: ["CALENDRIER_PERSONNEL_INDISPONIBLE"], years: [{ year: 2026, status: "available", availableHours: 1733.1 }] };
    PersonalCapacity.render(container, model);
    const details = first(container, "details"), summary = first(details, "summary"); details.open = true; summary.focus();
    I18n.setLanguage("nl"); PersonalCapacity.render(container, model);
    assert.equal(first(container, "details"), details); assert.equal(details.open, true); assert.equal(container.ownerDocument.activeElement, summary);
    assert.match(container.textContent, /Werkcapaciteit en planning/); assert.match(container.textContent, /Percentage geplande uren/);
    assert.match(container.textContent, /Bespreek dit met uw Unit Manager/); assert.match(container.textContent, /persoonlijke werkkalender is niet beschikbaar/);
    assert.equal(first(container, '[data-capacity-available]').textContent, I18n.formatHours(1733.1));
    I18n.setLanguage("fr"); PersonalCapacity.render(container, model); assert.match(container.textContent, /Capacité de travail et planning/);
  });
});

test("personal recommendations and pie legends translate application labels while preserving names and slider state", () => {
  inLanguage("fr", () => {
    const container = domFixture(), name = "[eXtRAI] [54252043] Projet source", model = { periodLabel: "2026", tolerancePercent: 23,
      rows: [], unavailable: [{ id: 1, name, reason: "Planning indisponible" }] };
    PersonalTime.renderRecommendations(container, model);
    const slider = first(container, "input"), disclosure = first(container, "details"); slider.focus(); disclosure.open = true;
    I18n.setLanguage("nl"); PersonalTime.renderRecommendations(container, model);
    assert.equal(first(container, "input"), slider); assert.equal(slider.value, "23"); assert.equal(container.ownerDocument.activeElement, slider);
    assert.equal(disclosure.open, true); assert.match(container.textContent, /Stoppen \(of verduidelijken\)/); assert.match(container.textContent, /1 project zonder cijfermatig advies/);
    assert.match(container.textContent, /Planning niet beschikbaar/); assert.ok(container.textContent.includes(name));
    assert.equal(slider.getAttribute("aria-valuetext"), "23 % tolerantie");
    const pie = domFixture(); PersonalTime.render(pie, [{ id: 1, name, planned: 1000, actual: 250 }], { scope: [2026] });
    assert.ok(pie.textContent.includes(name)); assert.match(pie.textContent, /Mijn projecten/); assert.match(pie.textContent, /gepresteerd/);
    assert.equal(first(pie, '[data-personal-id="1"]').getAttribute("aria-label").includes("gepland"), true);
  });
});

test("project and programme cards translate manager/date/budget helpers but keep canonical identities", () => {
  inLanguage("nl", () => {
    const container = domFixture(); ProgrammeBrowser.render(container);
    assert.match(container.textContent, /Programma’s · 01 \/ Kies een programma/); assert.match(container.textContent, /Structureren/);
    assert.match(container.textContent, /Timothée Lonfils/); assert.match(container.textContent, /Manufacturing/);
    assert.match(first(container, ".programme-browser-tile").title, /Verantwoordelijke: Pauline Dewez/);
    assert.equal(ProgrammeBrowser.PROGRAMMES[0].catchphrase, "To Structure");
    assert.equal(ProjectCard.nameParts({ id: 9, name: "[eXtRAI] [54252043] Projet source" }).shortName, "eXtRAI");
    assert.equal(ProjectCard.formatBudget({ amount: 1234.5, currencyId: 1, currency: "EUR" }), `${I18n.formatNumber(1234.5, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`);
    assert.equal(ProjectCard.formatDate(null), "Niet beschikbaar");
  });
});

test("budget controls, bill dialog and accessible descriptions are Dutch without changing source categories or descriptions", () => {
  inLanguage("nl", () => {
    const container = domFixture(), sourceCategory = "6124 Équipement source", sourceDescription = "Texte de facture source", sourceManager = "Fournisseur source";
    const bill = { id: 91, date: "2026-02-01", supplierId: 1, supplierLabel: sourceManager, documentLabel: "INV-source", description: sourceDescription, consumed: 50, currencyId: 1, currency: "EUR" };
    const line = { id: 1, categoryId: 21, category: sourceCategory, accountCode: "6124", isExpense: true, budgeted: 100, consumed: 50, committed: 50, pending: 0, balance: 50,
      currencyId: 1, currency: "EUR", billDetails: { status: "reconciled", items: [bill] } };
    const data = { project: { id: 1, name: "Projet source", startDate: "2026-01-01", endDate: "2026-12-31" }, macro: { conventionTotal: 100, currencyId: 1, currency: "EUR" },
      annual: [{ id: 1, name: "Budget source", startDate: "2026-01-01", endDate: "2026-12-31", currencyId: 1, currency: "EUR", lines: [line], totals: { budgeted: 100, consumed: 50, committed: 50 } }],
      lifetime: { status: "available", currencyId: 1, currency: "EUR", consumed: 50, byRubric: [], expensesOnly: { status: "available", currencyId: 1, currency: "EUR", consumed: 50, byRubric: [] } } };
    ProjectBudget.render(container, data);
    assert.match(container.textContent, /BW-personeelskosten tonen/); assert.match(container.textContent, /Jaarbudgetten/); assert.match(container.textContent, /Gebudgetteerd/);
    assert.ok(container.textContent.includes(sourceCategory));
    const trigger = container.querySelectorAll("[data-budget-code-detail]").find(button => button.getAttribute("data-budget-code-kind") === "consumed") || first(container, "[data-budget-code-detail]");
    assert.ok(trigger); trigger.dispatch("click");
    const dialog = first(container, "dialog"); assert.match(dialog.textContent, /Facturen en boekingen/); assert.match(dialog.textContent, /Toegewezen bedrag/);
    assert.ok(dialog.textContent.includes(sourceDescription)); assert.ok(dialog.textContent.includes(sourceManager));
    assert.equal(first(dialog, "[data-budget-bills-close]").getAttribute("aria-label"), "Bijbehorende facturen en boekingen sluiten");
    ProjectBudget.cleanup(container);
  });
});

test("monthly/planning/capacity calculations localize month names and warnings without changing numeric/calendar evidence", () => {
  const source = { project: { id: 1, name: "Projet source" }, lifetime: { startDate: "2026-08-01", endDate: "2026-09-30", conventionHours: 100, conventionStatus: "available" },
    timesheets: { lines: [{ projectId: 1, employeeId: 7, employee: "François source", date: "2026-08-15", hours: 10 }] },
    planning: { ok: true, slots: [{ projectId: 1, employeeId: 7, start: "2026-08-01", end: "2026-09-01", hours: 100, planningIdentity: { status: "person", employeeId: 7 } }] } };
  const before = structuredClone(source);
  inLanguage("fr", () => {
    const fr = ProjectMonthly.summarize(source, { now: "2026-08-20" }), frPlan = ProjectPlanning.summarize(source, { now: "2026-08-20" });
    assert.equal(fr.months[0].label, "août 2026");
    I18n.setLanguage("nl");
    const nl = ProjectMonthly.summarize(source, { now: "2026-08-20" }), nlPlan = ProjectPlanning.summarize(source, { now: "2026-08-20" });
    assert.equal(nl.months[0].label, "augustus 2026"); assert.deepEqual(nl.total, fr.total); assert.equal(nl.employees[0].name, "François source");
    assert.equal(nlPlan.actualHours, frPlan.actualHours); assert.equal(nlPlan.remainingPlannedHours, frPlan.remainingPlannedHours);
    assert.equal(ProjectMonthly.summarizePlanning(null).warnings[0], "Projectdatums of -identiteit ontbreken of zijn ongeldig; de maandplanning is niet beschikbaar.");
    assert.match(WorkCapacity.summarize(null, [2026]).warnings.join(" "), /werkcapaciteit/);
    assert.deepEqual(source, before);
  });
});

test("only typed server-generated financial aggregate labels are translated; source labels remain literal", () => {
  inLanguage("nl", () => {
    const container = domFixture(), literalSource = "Coût des heures · rubrique non renseignée";
    const data = { project: { id: 1 }, macro: {}, annual: [], lifetime: { status: "available", currency: "EUR", consumed: 30,
      unmapped: [{ label: literalSource, labelMessageKey: "budget.unmappedPersonnel", consumed: 10 },
        { label: literalSource, consumed: 10 }, { label: "Source untouched", labelMessageKey: "unexpected.marker", consumed: 10 }] } };
    ProjectBudget.render(container, data, { showBwPersonnelCosts: true });
    const unmapped = first(container, ".project-budget-unmapped");
    assert.ok(unmapped.textContent.includes("Urenkosten · rubriek niet ingevuld"));
    assert.ok(unmapped.textContent.includes(literalSource)); assert.ok(unmapped.textContent.includes("Source untouched"));
  });
});

test("known financial workflow codes have localized badges while unknown source statuses stay literal", () => {
  inLanguage("nl", () => {
    const container = domFixture(), data = { project: { id: 1 }, macro: {}, annual: [], conventions: [
      { id: 1, name: "Source convention", status: { code: "confirmed", label: "Confirmed" }, lines: [] },
      { id: 2, name: "Source revision", status: { code: "under_validation", label: "Under Validation" }, lines: [] },
      { id: 3, name: "Source custom", status: { code: "custom_stage", label: "État personnalisé source" }, lines: [] }
    ] };
    ProjectBudget.render(container, data);
    assert.equal(first(container, '[data-budget-status="confirmed"]').textContent, "Bevestigd");
    assert.equal(first(container, '[data-budget-status="under_validation"]').textContent, "Ter validatie");
    assert.equal(first(container, '[data-budget-status="custom_stage"]').textContent, "État personnalisé source");
    I18n.setLanguage("fr"); ProjectBudget.render(container, data);
    assert.equal(first(container, '[data-budget-status="confirmed"]').textContent, "Confirmé");
    assert.equal(first(container, '[data-budget-status="custom_stage"]').textContent, "État personnalisé source");
  });
});

test("only provenance-marked identity fallbacks are localized, with typed IDs and unchanged source names", () => {
  inLanguage("nl", () => {
    const employee = { employeeId: 99, name: "Employé 99", nameMessageKey: "identity.employee" };
    const project = { id: 11, name: "Project 11", nameMessageKey: "identity.project" };
    const before = structuredClone({ employee, project });
    assert.equal(I18n.displayName(employee), "Werknemer 99"); assert.equal(I18n.displayName(project), "Project 11");
    assert.equal(I18n.displayName({ name: "Employé non identifié", nameMessageKey: "identity.employeeUnknown" }), "Niet-geïdentificeerde werknemer");
    assert.equal(I18n.displayName({ ...employee, nameMessageKey: undefined }), "Employé 99");
    assert.equal(I18n.displayName({ ...employee, employeeId: "99" }), "Employé 99");
    assert.equal(I18n.displayName({ ...employee, nameMessageKey: "unexpected.source.label" }), "Employé 99");
    const own = PersonalTime.summarizeProjects({ projects: [project], timesheets: { lines: [{ projectId: 11, date: "2026-08-01", hours: 5 }] } }, [2026], "2026-10-16");
    assert.equal(own[0].name, "Project 11"); assert.equal(own[0].actual, 5);
    const data = { project, lifetime: { startDate: "2026-08-01", endDate: "2026-09-30" }, contributors: [employee],
      timesheets: { lines: [{ projectId: 11, employeeId: 99, employee: "", date: "2026-08-02", hours: 5 }] },
      planning: { ok: true, slots: [{ projectId: 11, employeeId: 99, start: "2026-08-01", end: "2026-09-01", hours: 10 }] } };
    assert.equal(ProjectMonthly.summarize(data, { now: "2026-08-31" }).employees[0].name, "Werknemer 99");
    assert.equal(ProjectMonthly.summarizePlanning(data).employees[0].name, "Werknemer 99");
    assert.deepEqual({ employee, project }, before);
    I18n.setLanguage("fr"); assert.equal(I18n.displayName(project), "Projet 11"); assert.equal(I18n.displayName(employee), "Employé 99");
    assert.equal(PersonalTime.summarizeProjects({ projects: [project], timesheets: { lines: [{ projectId: 11, date: "2026-08-01", hours: 5 }] } }, [2026], "2026-10-16")[0].name, "Projet 11");
  });
});

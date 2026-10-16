const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const { render } = require("../personal-capacity");
const { domFixture } = require("./dom-fixture");

const find = (container, selector) => container.querySelectorAll(selector)[0];
const metric = (container, key) => find(container, `[data-capacity-${key}]`).textContent;
function annual(overrides = {}) {
  return {
    year: 2026, status: "available", scheduledHours: 2075, publicHolidayHours: 63.6,
    entitlementHours: 278.3, availableHours: 1733.1, availableDays: 218,
    calendarBasisYear: 2026, entitlementBasisYear: 2026, estimateReason: null,
    scope: { startDate: "2026-01-01", endDate: "2026-12-31", fraction: 1,
      scheduledHours: 2075, publicHolidayHours: 63.6, entitlementHours: 278.3,
      availableHours: 1733.1, availableDays: 218 }, warnings: [], ...overrides
  };
}
function model(overrides = {}) {
  return { status: "available", referenceYear: 2026, availableHours: 1733.1,
    availableDays: 218, scheduledHours: 2075, publicHolidayHours: 63.6,
    entitlementHours: 278.3, workTimeRate: 100, partialPeriod: false,
    plannedHours: 1710.75, scopeLabel: "2026", warnings: [], years: [annual()], ...overrides };
}

test("capacity and complete personal planning are distinct French-labelled values with an explicit period and leave policy", () => {
  const container = domFixture(), data = model(), before = structuredClone(data);
  const section = render(container, data);
  assert.equal(metric(container, "available"), "1 733,1 h");
  assert.equal(metric(container, "planned"), "1 710,75 h");
  assert.deepEqual(container.querySelectorAll("h3").map(element => element.textContent),
    ["Heures de travail disponibles", "Heures totales planifiées", "Pourcentage des heures planifiées"]);
  assert.equal(find(container, ".personal-capacity-period").textContent, "2026");
  assert.match(container.textContent, /218 jours de travail/);
  assert.match(container.textContent, /Toute la période sélectionnée.*planning futur et les projets masqués/);
  assert.match(container.textContent, /Congés sans solde et reports d’années précédentes exclus.*demandes de congé non utilisées/);
  assert.equal(section.getAttribute("aria-labelledby"), find(container, "h2").id);
  assert.equal(section.getAttribute("aria-busy"), "false");
  for (const article of container.querySelectorAll("article")) {
    assert.ok(container.querySelectorAll("h3").some(heading => heading.id === article.getAttribute("aria-labelledby")));
  }
  assert.deepEqual(data, before, "Formatting must not alter source metrics");
});

test("unknown capacity does not erase independently known planning and cannot display source numbers as confirmed capacity", () => {
  const container = domFixture();
  render(container, model({ status: "unavailable", availableHours: 1733.1 }));
  assert.equal(metric(container, "available"), "Indisponible");
  assert.equal(metric(container, "planned"), "1 710,75 h");
  assert.match(find(container, ".personal-capacity-status").textContent, /Capacité de travail indisponible/);
  assert.doesNotMatch(find(container, ".is-available").textContent, /218 jours/);
});

test("unknown planning stays unavailable while a known zero is displayed without changing available capacity", () => {
  const container = domFixture();
  for (const plannedHours of [null, undefined, "", "0", NaN, Infinity]) {
    render(container, model({ plannedHours }));
    assert.equal(metric(container, "planned"), "Indisponible");
    assert.equal(metric(container, "available"), "1 733,1 h");
  }
  render(container, model({ plannedHours: 0, availableHours: 0, availableDays: 0 }));
  assert.equal(metric(container, "planned"), "0 h");
  assert.equal(metric(container, "available"), "0 h");
  assert.match(find(container, ".is-available").textContent, /0 jours de travail/);
});

test("negative planning corrections remain signed, but invalid capacity values are never coerced to zero", () => {
  const container = domFixture();
  for (const availableHours of [null, undefined, "1733.1", NaN, Infinity, -1]) {
    render(container, model({ availableHours, plannedHours: -20.25 }));
    assert.equal(metric(container, "available"), "Indisponible");
    assert.equal(metric(container, "planned"), "-20,25 h");
  }
});

test("planned coverage warns outside the unrounded 85 to 100 percent range without hiding signed or excess planning", () => {
  const container = domFixture();
  for (const [plannedHours, availableHours, expected, low, high = false] of [
    [849.99, 1000, "< 85 %", true],
    [850, 1000, "85 %", false],
    [1661.5 * .85, 1661.5, "85 %", false],
    [1733.1 * .85, 1733.1, "85 %", false],
    [1661.5 * .85 - 1e-9, 1661.5, "< 85 %", true],
    [850.01, 1000, "85 %", false],
    [1600, 1700, "94,12 %", false],
    [1000, 1000, "100 %", false],
    [1733.1, 1733.1, "100 %", false],
    [1661.5 * (1 + Number.EPSILON), 1661.5, "100 %", false],
    [1000 + 1e-9, 1000, "> 100 %", false, true],
    [1100, 1000, "110 %", false, true],
    [0, 1000, "0 %", true],
    [-100, 1000, "-10 %", true]
  ]) {
    render(container, model({ plannedHours, availableHours }));
    assert.equal(metric(container, "coverage"), expected);
    const coverage = find(container, ".personal-capacity-coverage");
    assert.equal(coverage.className.includes("is-low"), low);
    assert.equal(coverage.className.includes("is-high"), high);
    assert.equal(coverage.textContent.includes("le ratio semble faible"), low,
      "The warning must be explicit text, not only an orange color");
    assert.equal(find(coverage, ".personal-capacity-metric-note").textContent, low
      ? "Il est normal de ne pas être planifié à 100% mais dans le cas présent le ratio semble faible. A vérifier avec votre Unit Manager."
      : high ? "Vous êtes planifié au-delà de 100%. A clarifier avec votre Unit Manager"
        : "Il est normal de ne pas être planifié à 100%. Cela tient compte des absences maladies notamment.");
    assert.equal(container.querySelectorAll("article").length, 3);
    assert.equal(find(container, ".is-planned").querySelectorAll("[data-capacity-coverage]").length, 0,
      "The percentage belongs to its own card, not inside planned hours");
    assert.equal(find(coverage, ".personal-capacity-metric-value").textContent, expected);
  }
});

test("overplanning advice and orange state clear when coverage becomes normal, low or unavailable", () => {
  const container = domFixture();
  for (const [plannedHours, availableHours, expectedClass] of [
    [1200, 1000, "is-high"], [1000, 1000, null],
    [1200, 1000, "is-high"], [500, 1000, "is-low"],
    [1200, 1000, "is-high"], [null, 1000, null],
    [1200, 1000, "is-high"], [1200, 0, null]
  ]) {
    render(container, model({ plannedHours, availableHours }));
    const card = find(container, ".personal-capacity-coverage");
    assert.equal(card.className.includes("is-high"), expectedClass === "is-high");
    assert.equal(card.className.includes("is-low"), expectedClass === "is-low");
    assert.equal(card.textContent.includes("Vous êtes planifié au-delà de 100%"), expectedClass === "is-high");
  }
});

test("unknown or nonpositive capacity and unavailable planning never retain a coverage percentage or low-coverage warning", () => {
  const container = domFixture();
  for (const [overrides, options] of [
    [{ status: "unavailable", availableHours: 1000 }, {}],
    [{ availableHours: null }, {}],
    [{ availableHours: "1000" }, {}],
    [{ availableHours: NaN }, {}],
    [{ availableHours: Infinity }, {}],
    [{ availableHours: 0 }, {}],
    [{ availableHours: -1 }, {}],
    [{ plannedHours: null }, {}],
    [{ plannedHours: "0" }, {}],
    [{ plannedHours: Infinity }, {}],
    [{ availableHours: Number.MIN_VALUE, plannedHours: Number.MAX_VALUE }, {}],
    [{}, { loading: true }],
    [{}, { error: true }]
  ]) {
    render(container, model({ availableHours: 1000, plannedHours: 100 }));
    assert.match(find(container, ".personal-capacity-coverage").textContent, /le ratio semble faible/);
    render(container, model(overrides), options);
    assert.equal(metric(container, "coverage"), "Indisponible");
    const coverage = find(container, ".personal-capacity-coverage");
    assert.equal(coverage.className.includes("is-low"), false);
    assert.doesNotMatch(coverage.textContent, /ratio semble faible|Il est normal|%/);
    assert.match(coverage.textContent, /Le taux nécessite des heures disponibles supérieures à zéro et un planning connu/);
  }
});

test("coverage follows aggregated year or custom-period values and accepts explicitly estimated capacity", () => {
  const container = domFixture();
  render(container, model({ status: "estimated", scopeLabel: "2027", availableHours: 1700, plannedHours: 1600 }));
  assert.equal(metric(container, "coverage"), "94,12 %");
  assert.match(find(container, ".personal-capacity-status").textContent, /Capacité estimée/);
  const details = find(container, "details"), summary = find(container, "summary");
  details.open = true; summary.focus();
  render(container, model({ scopeLabel: "2026 et 2027", availableHours: 3400, plannedHours: 2500 }));
  assert.equal(metric(container, "coverage"), "73,53 %");
  assert.match(find(container, ".personal-capacity-coverage").textContent, /le ratio semble faible/);
  render(container, model({ scopeLabel: "du 1er août au 31 décembre 2026", partialPeriod: true,
    availableHours: 700, plannedHours: 650 }));
  assert.equal(metric(container, "coverage"), "92,86 %");
  assert.doesNotMatch(find(container, ".personal-capacity-coverage").textContent, /le ratio semble faible/);
  assert.equal(find(container, "details"), details);
  assert.equal(details.open, true);
  assert.equal(container.ownerDocument.activeElement, summary);
});

test("loading names the source, sets busy/live status and retains the independent planning total", () => {
  const container = domFixture();
  render(container, model(), { loading: true });
  assert.equal(metric(container, "available"), "Chargement…");
  assert.equal(metric(container, "planned"), "1 710,75 h");
  assert.match(container.textContent, /Lecture du calendrier personnel et des droits annuels/);
  assert.equal(find(container, ".personal-capacity").getAttribute("aria-busy"), "true");
  const status = find(container, ".personal-capacity-status");
  assert.equal(status.getAttribute("role"), "status");
  assert.equal(status.getAttribute("aria-live"), "polite");
  assert.equal(status.getAttribute("aria-atomic"), "true");
  assert.equal(find(container, "details").hidden, true);
});

test("a source failure does not reveal a raw fault, stale capacity, annual details or warnings", () => {
  const container = domFixture();
  render(container, model({ warnings: ["Prior warning"] }), { error: "PRIVATE_TOKEN rpc fault <script>alert(1)</script>" });
  assert.equal(metric(container, "available"), "Indisponible");
  assert.equal(metric(container, "planned"), "1 710,75 h");
  assert.doesNotMatch(container.textContent, /PRIVATE_TOKEN|rpc fault|Prior warning|alert/);
  assert.equal(find(container, "details").hidden, true);
  assert.equal(find(container, ".personal-capacity-warnings").hidden, true);
});

test("a part-time calendar rate is explained without multiplying the already computed hours again", () => {
  const container = domFixture();
  render(container, model({ workTimeRate: 80, availableHours: 1386.48, availableDays: 174.4 }));
  assert.equal(metric(container, "available"), "1 386,48 h");
  assert.match(container.textContent, /Temps de travail : 80 % \(déjà intégré au calendrier\)/);
  render(container, model({ workTimeRate: 100 }));
  assert.doesNotMatch(container.textContent, /Temps de travail :/);
});

test("custom-period details reconcile the selected range while explaining annual-entitlement proration", () => {
  const container = domFixture();
  const row = annual({ scope: { startDate: "2026-08-01", endDate: "2026-12-31", fraction: .4,
    availableHours: 693.24, availableDays: 87.2, scheduledHours: 830,
    publicHolidayHours: 25.44, entitlementHours: 111.32 } });
  render(container, model({ partialPeriod: true, availableHours: 693.24, availableDays: 87.2,
    plannedHours: 650, scopeLabel: "du 1er août 2026 au 31 décembre 2026", years: [row] }));
  assert.equal(metric(container, "available"), "693,24 h");
  assert.equal(find(container, ".personal-capacity-period").textContent, "du 1er août 2026 au 31 décembre 2026");
  assert.match(find(container, ".personal-capacity-status").textContent, /droits annuels répartis au prorata des heures de calendrier sélectionnées/);
  const details = find(container, "details");
  assert.match(details.textContent, /Calendrier de travail830 h/);
  assert.match(details.textContent, /Droits de congés payés \(prorata\)111,32 h/);
  assert.match(details.textContent, /40 % des heures du calendrier annuel sélectionnées/);
  assert.match(details.textContent, /Année complète : 1 733,1 h disponibles et 278,3 h de droits/);
});

test("future fallback is visibly estimated from the reference year without pretending to know unpublished holiday hours", () => {
  const container = domFixture();
  const future = annual({ year: 2027, status: "estimated", calendarBasisYear: 2026, entitlementBasisYear: 2026,
    estimateReason: "reference-year-calendar", publicHolidayHours: null,
    scope: { fraction: 1, availableHours: 1733.1, availableDays: 218, scheduledHours: null,
      publicHolidayHours: null, entitlementHours: 278.3 } });
  render(container, model({ status: "estimated", scopeLabel: "2027", years: [future] }));
  assert.match(find(container, ".personal-capacity-status").textContent, /Calendrier non publié en 2027.*estimée.*2026/);
  assert.match(find(container, ".is-available").className, /is-estimated/);
  const details = find(container, "details");
  assert.match(details.textContent, /2027Estimation/);
  assert.match(details.textContent, /Jours fériés et fermetures collectivesIndisponible/);
  assert.match(details.textContent, /Calendrier non publié : capacité annuelle reprise de 2026/);
});

test("multi-year details preserve per-year source evidence and sort without mutating the source array", () => {
  const container = domFixture();
  const second = annual({ year: 2028, availableHours: 1900, scope: { fraction: 1,
    availableHours: 1900, availableDays: 220, scheduledHours: 2000,
    publicHolidayHours: 20, entitlementHours: 80 } });
  const data = model({ availableHours: 3633.1, plannedHours: 3600, scopeLabel: "2026 et 2028", years: [second, annual()] });
  const before = structuredClone(data);
  render(container, data);
  assert.equal(metric(container, "available"), "3 633,1 h");
  assert.deepEqual(container.querySelectorAll("[data-capacity-year]").map(element => element.getAttribute("data-capacity-year")), ["2026", "2028"]);
  assert.match(container.querySelectorAll("[data-capacity-year]")[1].textContent, /Heures de travail disponibles1 900 h/);
  assert.deepEqual(data, before);
});

test("native calculation disclosure keeps its open state and summary keyboard focus through rerenders and source loading", () => {
  const container = domFixture();
  render(container, model());
  const details = find(container, "details"), summary = find(container, "summary");
  details.open = true; summary.focus();
  for (const options of [{}, { loading: true }, {}, { error: true }, {}]) {
    render(container, model({ scopeLabel: "2026 et 2027" }), options);
    assert.equal(find(container, "details"), details);
    assert.equal(find(container, "summary"), summary);
    assert.equal(details.open, true);
    assert.equal(details.hidden, false, "Focused/open disclosure stays available during source transitions");
    assert.equal(container.ownerDocument.activeElement, summary);
  }
});

test("partial-period estimation does not claim an unpublished annual calendar", () => {
  const container = domFixture();
  render(container, model({ status: "estimated", partialPeriod: true,
    years: [annual({ status: "estimated", estimateReason: "partial-period-entitlement" })] }));
  assert.match(find(container, ".personal-capacity-status").textContent, /Période partielle/);
  assert.doesNotMatch(container.textContent, /Calendrier non publié|Droits de congés non attribués/);
  assert.match(find(container, "details").textContent, /prorata des droits annuels/);
});

test("future entitlement fallback is differentiated from a calendar capacity fallback", () => {
  const container = domFixture();
  render(container, model({ status: "estimated", scopeLabel: "2027", years: [annual({ year: 2027, status: "estimated",
    calendarBasisYear: 2027, entitlementBasisYear: 2026, estimateReason: "reference-year-entitlement" })] }));
  assert.match(find(container, ".personal-capacity-status").textContent, /Droits de congés non attribués en 2027.*droits annuels de 2026/);
  assert.doesNotMatch(container.textContent, /Calendrier non publié/);
  assert.match(find(container, "details").textContent, /droits annuels repris de 2026/);
});

test("service warning codes are displayed in French and unknown codes or already explained unpaid exclusions stay hidden", () => {
  const container = domFixture();
  render(container, model({ warnings: ["CALENDRIER_ACTUEL_APPLIQUE_AUX_ANNEES", "CONGES_SANS_SOLDE_EXCLUS",
    "DROITS_ANNUELS_INDISPONIBLES", "UNKNOWN_TECHNICAL_CODE"] }));
  const list = find(container, ".personal-capacity-warnings");
  assert.equal(list.querySelectorAll("li").length, 2);
  assert.match(list.textContent, /Les horaires actuels sont appliqués aux années sélectionnées/);
  assert.match(list.textContent, /Les droits annuels de congés ne sont pas accessibles/);
  assert.doesNotMatch(container.textContent, /CALENDRIER_ACTUEL|CONGES_SANS_SOLDE|DROITS_ANNUELS|UNKNOWN_TECHNICAL/);
});

test("ambiguous identity and unprojected accrual sources disclose their specific French unavailable reasons", () => {
  const container = domFixture();
  render(container, model({ status: "unavailable", availableHours: null, warnings: [
    "IDENTITE_CAPACITE_AMBIGUE", "DROITS_ANNUELS_ACQUISITION_NON_PROJETEE", "TYPE_ATTRIBUTION_INCONNU"
  ] }));
  const list = find(container, ".personal-capacity-warnings");
  assert.equal(list.querySelectorAll("li").length, 3);
  assert.match(list.textContent, /Plusieurs fiches employé sont liées au compte/);
  assert.match(list.textContent, /droits de congés acquis progressivement ne peuvent pas être projetés/);
  assert.match(list.textContent, /type d’attribution des droits de congés n’est pas confirmé/);
  assert.doesNotMatch(container.textContent, /IDENTITE_CAPACITE|DROITS_ANNUELS_ACQUISITION|TYPE_ATTRIBUTION/);
});

test("a current work schedule applied to another year is estimated without claiming unavailable holidays or rights", () => {
  const container = domFixture();
  render(container, model({ status: "estimated", scopeLabel: "2025", years: [annual({ year: 2025, status: "estimated",
    calendarBasisYear: 2025, entitlementBasisYear: 2025, estimateReason: "current-work-schedule" })] }));
  assert.match(find(container, "details").textContent, /Horaires actuels appliqués à cette année/);
  assert.doesNotMatch(container.textContent, /Calendrier non publié|Droits de congés non attribués/);
  assert.match(find(container, ".personal-capacity-status").textContent, /Capacité estimée/);
});

test("period and calculator notices render as literal text without HTML injection", () => {
  const container = domFixture();
  const marker = '<img src=x onerror="PRIVATE_SCRIPT()">';
  render(container, model({ scopeLabel: marker, warnings: [marker, marker, "", null] }));
  assert.equal(find(container, ".personal-capacity-period").textContent, marker);
  assert.deepEqual(find(container, ".personal-capacity-warnings").querySelectorAll("li").map(item => item.textContent), [marker]);
  assert.equal(container.querySelectorAll("img").length, 0);
  assert.equal(container.querySelectorAll("script").length, 0);
});

test("missing models and malformed optional collections produce useful unavailable states without a crash", () => {
  const container = domFixture();
  assert.equal(render(null, model()), null);
  for (const data of [null, {}, { years: {} }, { years: [null, false], warnings: {} }]) {
    render(container, data);
    assert.equal(metric(container, "available"), "Indisponible");
    assert.equal(metric(container, "planned"), "Indisponible");
    assert.equal(find(container, "details").hidden, true);
    assert.equal(find(container, ".personal-capacity-period").textContent, "Période sélectionnée");
  }
});

test("the standalone browser module exposes only the rendering API without CommonJS", () => {
  const context = vm.createContext({ Intl });
  for (const file of ["../i18n", "../i18n-core-messages"]) vm.runInContext(fs.readFileSync(require.resolve(file), "utf8"), context);
  vm.runInContext(fs.readFileSync(require.resolve("../personal-capacity"), "utf8"), context);
  assert.equal(typeof context.PersonalCapacity.render, "function");
  assert.deepEqual(Object.keys(context.PersonalCapacity), ["render"]);
});

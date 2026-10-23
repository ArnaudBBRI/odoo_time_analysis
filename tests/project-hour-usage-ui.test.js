"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const I18n = require("./i18n-fixture");
const { render, cleanup } = require("../project-browser");
const { domFixture } = require("./dom-fixture");

function planningInfo() {
  return { status: "available", startDate: "2026-01-01", endDate: "2026-12-31",
    conventionHours: 120, conventionStatus: "available", actualHours: 40, actualStatus: "available",
    actualThroughDate: "2026-06-30", plannedToDateHours: 50, plannedToDateStatus: "available",
    planningToDateDifference: -10, conventionToDateHours: 60, conventionToDateStatus: "available",
    conventionToDateDifference: -20, remainingPlannedHours: 80, remainingPlannedStatus: "available",
    remainingToHireHours: 0, remainingToHireStatus: "complete", projectedHours: 120,
    projectionDifference: 0, projectionStatus: "available", toHireStatus: "complete",
    personalToDate: { actualHours: 10, actualStatus: "available", plannedHours: 15,
      plannedStatus: "available", difference: -5, status: "available" },
    coverage: { status: "complete" }, warnings: [] };
}

function draw(container, info, detail = {}, options = {}) {
  render(container, { projects: [{ id: 11, name: "Source project" }], selectedId: 11,
    detail: { planningInfo: info, ...detail }, ...options });
  return container.querySelectorAll("[data-planning-to-date-comparison]");
}

const directions = cards => cards.map(card => card.getAttribute("data-planning-to-date-direction"));
const sentences = cards => cards.map(card => card.querySelectorAll("span")[0].textContent);

test("usage cards fail independently and never display stale deltas from unavailable sources", () => {
  const container = domFixture();
  try {
    for (const status of [undefined, null, "unavailable", "partial", "available "]) {
      for (const field of ["status", "actualStatus", "plannedStatus"]) {
        const info = planningInfo(); info.personalToDate[field] = status;
        const cards = draw(container, info);
        assert.deepEqual(directions(cards), ["unknown", "under", "under"], `Personal ${field}=${status}`);
        assert.equal(sentences(cards)[0], "Comparaison indisponible.");
      }
      for (const [field, expected] of [["actualStatus", ["under", "unknown", "unknown"]],
        ["plannedToDateStatus", ["under", "unknown", "under"]],
        ["conventionToDateStatus", ["under", "under", "unknown"]]]) {
        const info = planningInfo(); info[field] = status;
        assert.deepEqual(directions(draw(container, info)), expected, `${field}=${status}`);
      }
    }
    for (const personal of [undefined, null, {}]) {
      const info = planningInfo(); info.personalToDate = personal;
      assert.deepEqual(directions(draw(container, info)), ["unknown", "under", "under"]);
    }
  } finally { cleanup(container); }
});

test("usage cards reject nonfinite or missing deltas even when all statuses claim availability", () => {
  const container = domFixture();
  try {
    for (const value of [null, undefined, NaN, Infinity, -Infinity, false, "", " ", "invalid"]) {
      const info = planningInfo();
      info.personalToDate.difference = info.planningToDateDifference = info.conventionToDateDifference = value;
      const cards = draw(container, info);
      assert.deepEqual(directions(cards), ["unknown", "unknown", "unknown"], `Invalid delta ${String(value)}`);
      assert.ok(sentences(cards).every(text => text === "Comparaison indisponible."));
      assert.ok(cards.every(card => !/NaN|Infinity|undefined|null/.test(card.textContent)));
    }
  } finally { cleanup(container); }
});

test("usage cards retain signed differences and balance within the existing half-centihour tolerance", () => {
  const container = domFixture();
  try {
    for (const [delta, direction, sentence] of [
      [-12.125, "under", "12,13 h de sous-consommation à ce jour."],
      [-0.006, "under", "0,01 h de sous-consommation à ce jour."],
      [-0.005, "balanced", "Consommation conforme à ce jour."],
      [-0, "balanced", "Consommation conforme à ce jour."],
      [0.005, "balanced", "Consommation conforme à ce jour."],
      [0.006, "over", "0,01 h de surconsommation à ce jour."],
      [12.125, "over", "12,13 h de surconsommation à ce jour."]
    ]) {
      const info = planningInfo();
      info.personalToDate.difference = info.planningToDateDifference = info.conventionToDateDifference = delta;
      const cards = draw(container, info);
      assert.deepEqual(directions(cards), Array(3).fill(direction));
      assert.deepEqual(sentences(cards), Array(3).fill(sentence));
      assert.ok(cards.every(card => card.className.split(/\s+/).includes("is-over") === (direction === "over")));
    }
    const zeroReference = planningInfo();
    zeroReference.personalToDate = { actualHours: -2, actualStatus: "available", plannedHours: 0,
      plannedStatus: "available", difference: -2, status: "available" };
    assert.equal(sentences(draw(container, zeroReference))[0], "2 h de sous-consommation à ce jour.");
  } finally { cleanup(container); }
});

test("usage captions and over, under, balanced and unavailable sentences rerender in French and Dutch", () => {
  const container = domFixture();
  try {
    const info = planningInfo(); info.personalToDate.difference = 1.25; info.conventionToDateDifference = 0;
    for (const [language, captions, texts, unavailable] of [
      ["fr", ["Mes heures · planning", "Total · planning", "Total · convention"],
        ["1,25 h de surconsommation à ce jour.", "10 h de sous-consommation à ce jour.", "Consommation conforme à ce jour."],
        "Comparaison indisponible."],
      ["nl", ["Mijn uren · planning", "Totaal · planning", "Totaal · overeenkomst"],
        ["1,25 h meer verbruikt tot vandaag.", "10 h minder verbruikt tot vandaag.", "Verbruik volgens verwachting tot vandaag."],
        "Vergelijking niet beschikbaar."]
    ]) {
      I18n.setLanguage(language);
      const cards = draw(container, info);
      assert.deepEqual(cards.map(card => card.querySelectorAll("strong")[0].textContent), captions);
      assert.deepEqual(sentences(cards), texts);
      const missing = planningInfo(); missing.personalToDate = null;
      assert.equal(sentences(draw(container, missing))[0], unavailable);
    }
  } finally { I18n.setLanguage("fr"); cleanup(container); }
});

test("usage cards preserve full-project macro results while graph scopes and contributor filters change", () => {
  const container = domFixture(), info = planningInfo(), original = structuredClone(info);
  try {
    const baseline = sentences(draw(container, info));
    for (const [detail, options] of [
      [{ personal: { planned: 1, actual: 1000 }, project: { planned: 2, actual: 2000 }, calendarFraction: 0 }, { years: [2027] }],
      [{ personal: { planned: 1000, actual: 1 }, project: { planned: 2000, actual: 2 }, calendarFraction: 1,
        includeOrmitters: true, ignoredEmployeeIds: new Set(["employee:7"]) },
      { scope: { startDate: "2026-09-01", endDate: "2026-09-30" }, years: [2026] }],
      [{ personal: { planned: 0, actual: 0 }, project: { planned: null, actual: null },
        lifetime: { planned: 999, actual: 999, calendarFraction: 0.75 } }, { years: [2025, 2028] }]
    ]) {
      assert.deepEqual(sentences(draw(container, info, detail, options)), baseline);
      assert.deepEqual(info, original, "Presentation must not rewrite cached macro evidence");
    }
  } finally { cleanup(container); }
});

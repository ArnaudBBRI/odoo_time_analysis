const assert = require("node:assert/strict");
const test = require("node:test");
const { summarizeProjects, buildRecommendations, renderRecommendations } = require("../personal-time");
const { domFixture } = require("./dom-fixture");
const close = (value, expected) => assert.ok(Math.abs(value - expected) < 1e-8, `${value} differs from ${expected}`);
const slot = (start, end, hours, projectId = 1) => ({ projectId, start, end, hours });
function source(slots, actual, dates = ["2025-01-01", "2027-12-31"], date = "2026-06-30", name = "[eXtRAI] [54252043] Synthetic title") {
  return { projects: [{ id: 1, name, startDate: dates[0], endDate: dates[1] }], planning: { slots },
    timesheets: { lines: [{ projectId: 1, date, hours: actual }] } };
}
function model(data, scope, now, options = {}) {
  return buildRecommendations(summarizeProjects(data, scope, now), scope, { data, now, ...options });
}
const find = (container, selector) => container.querySelectorAll(selector)[0];

test("recommendations weight separate annual budgets, include today and count only remaining selected days", () => {
  const data = source([slot("2025-01-01", "2026-01-01", 900), slot("2026-01-01", "2027-01-01", 100)], 950);
  const before = structuredClone(data), result = model(data, [2025, 2026], "2026-06-30"), row = result.rows[0];
  assert.equal(result.tolerancePercent, 15); assert.equal(row.shortName, "eXtRAI"); assert.equal(row.planned, 1000);
  close(row.expected, 900 + 100 * 181 / 365); close(row.variance, 950 - row.expected);
  assert.equal(row.remainingDays, 184); close(row.weeklyHours, 50 * 7 / 184); assert.equal(row.category, "continue");
  assert.equal(row.endDate, "2026-12-31"); assert.deepEqual(data, before);
});

test("a December project start clips the linear reference without shrinking its source annual allocation", () => {
  const data = source([slot("2026-01-01", "2027-01-01", 310)], 180, ["2026-12-01", "2027-06-30"], "2026-12-15");
  const row = model(data, [2026], "2026-12-15").rows[0];
  assert.equal(row.planned, 310); close(row.expected, 150); close(row.variance, 30);
  assert.equal(row.category, "slow"); assert.equal(row.remainingDays, 16); close(row.weeklyHours, 130 * 7 / 16);
});

test("the tolerance boundary stays in Continuer and classification uses full precision rather than display rounding", () => {
  const scope = { startDate: "2026-01-01", endDate: "2026-01-10" };
  for (const [actual, category] of [[57.5, "continue"], [57.500001, "slow"], [42.5, "continue"], [42.499999, "increase"]]) {
    const data = source([slot("2025-12-31T23:00:00Z", "2026-01-10T23:00:00Z", 100)], actual,
      ["2026-01-01", "2026-01-10"], "2026-01-05");
    const row = model(data, scope, "2026-01-05").rows[0]; close(row.expected, 50); assert.equal(row.category, category);
  }
});

test("disjoint years exclude gaps from reference and remaining weeks while inactive gaps produce no live advice", () => {
  const data = source([slot("2024-01-01", "2027-01-01", 1096)], 600, ["2024-01-01", "2026-12-31"]);
  const row = model(data, [2024, 2026], "2026-06-30").rows[0];
  close(row.planned, 731); close(row.expected, 547); assert.equal(row.remainingDays, 184); close(row.weeklyHours, 131 * 7 / 184);
  const gap = model(data, [2024, 2026], "2025-06-30");
  assert.equal(gap.rows.length, 0); assert.match(gap.unavailable[0].reason, /Période non active/);
});

test("custom ranges split yearly allocations at Brussels midnight before applying each year's clipped fraction", () => {
  const data = source([slot("2025-12-24T23:00:00Z", "2025-12-31T23:00:00Z", 700),
    slot("2025-12-31T23:00:00Z", "2026-01-10T23:00:00Z", 100)], 750, ["2025-12-25", "2026-01-10"], "2026-01-05");
  const row = model(data, { startDate: "2025-12-25", endDate: "2026-01-10" }, "2026-01-05").rows[0];
  close(row.planned, 800); close(row.expected, 750); assert.equal(row.remainingDays, 5); close(row.weeklyHours, 70);
});

test("Brussels today and calendar-day references remain coherent across daylight-saving changes", () => {
  const data = source([slot("2026-03-27T23:00:00Z", "2026-03-30T22:00:00Z", 48)], 32,
    ["2026-03-28", "2026-03-30"], "2026-03-29");
  const result = model(data, { startDate: "2026-03-28", endDate: "2026-03-30" }, "2026-03-28T23:30:00Z");
  assert.equal(result.asOf, "2026-03-29"); close(result.rows[0].expected, 32);
  assert.equal(result.rows[0].remainingDays, 1); close(result.rows[0].weeklyHours, 112);
});

test("unknown or negative plans, negative net actuals and invalid project dates retain explicit unavailable reasons", () => {
  const base = source([slot("2026-01-01", "2027-01-01", 100)], 20), now = "2026-06-30";
  for (const [data, pattern] of [
    [{ ...base, planning: null }, /Planning indisponible/],
    [{ ...base, planning: { slots: [slot("2026-01-01", "2027-01-01", -100)] } }, /Planning négatif/],
    [{ ...base, timesheets: { lines: [{ projectId: 1, date: now, hours: -5 }] } }, /Corrections d’heures négatives/],
    [{ ...base, projects: [{ ...base.projects[0], startDate: null }] }, /Dates de projet/],
    [{ ...base, projects: [{ ...base.projects[0], endDate: "2026-02-30" }] }, /Dates de projet/],
    [{ ...base, projects: [{ ...base.projects[0], startDate: "2027-01-01", endDate: "2026-12-31" }] }, /Dates de projet/]
  ]) { const result = model(data, [2026], now); assert.equal(result.rows.length, 0); assert.match(result.unavailable[0].reason, pattern); }
});

test("unplanned actuals have a finite Ralentir variance and zero remaining-hour cap, while zero activity is omitted", () => {
  const data = source([], 6), result = model(data, [2026], "2026-06-30"), row = result.rows[0];
  assert.equal(row.category, "slow"); assert.equal(row.expected, 0); assert.equal(row.variance, 6);
  assert.equal(row.varianceRatio, null); assert.equal(row.weeklyHours, 0); assert.equal(row.unplanned, true);
  assert.equal(model(source([], 0), [2026], "2026-06-30").rows.length, 0);
});

test("future starts do not request more hours, and ended periods or pre-start actuals have no weekly target", () => {
  const future = source([slot("2027-01-01", "2028-01-01", 100)], 0, ["2027-01-01", "2027-12-31"]);
  const absent = model(future, [2026, 2027], "2026-06-30"); assert.equal(absent.rows.length, 0); assert.match(absent.unavailable[0].reason, /non commencé/);
  const anticipated = model({ ...future, timesheets: { lines: [{ projectId: 1, date: "2026-06-30", hours: 20 }] } }, [2026, 2027], "2026-06-30").rows[0];
  assert.equal(anticipated.category, "slow"); assert.equal(anticipated.expected, 0); assert.equal(anticipated.weeklyHours, null); assert.equal(anticipated.periodFuture, true);
  const ended = source([slot("2026-01-01", "2027-01-01", 300)], 320, ["2026-01-01", "2026-06-30"], "2026-10-08");
  const row = model(ended, [2026], "2026-10-08").rows[0]; assert.equal(row.actual, 320, "Late source actuals remain in the scoped pie total");
  assert.equal(row.expected, 300); assert.equal(row.weeklyHours, null); assert.equal(row.periodEnded, true);
});

test("annual allocation mismatches and negative annual nets cannot produce recommendation targets", () => {
  const data = source([slot("2026-01-01", "2027-01-01", 80)], 20);
  const result = buildRecommendations([{ id: 1, name: "Project", planned: 100, actual: 20 }], [2026], { data, now: "2026-06-30" });
  assert.equal(result.rows.length, 0); assert.match(result.unavailable[0].reason, /non réconcilié/);
  const negativeYear = source([slot("2025-01-01", "2026-01-01", -10), slot("2026-01-01", "2027-01-01", 200)], 20);
  assert.equal(model(negativeYear, [2025, 2026], "2026-06-30").rows.length, 0);
});

test("recommendation rendering has four ordered named groups, safe project text and a compact explanation of unavailable advice", () => {
  const container = domFixture(), name = '[<img src=x onerror="PRIVATE_SCRIPT()">] [54252043] <script>Full</script>';
  const data = source([], 6, ["2026-01-01", "2026-12-31"], "2026-06-30", name);
  const result = model(data, [2026], "2026-06-30"); result.unavailable.push({ id: 2, name: "Unknown project", reason: "Planning indisponible" });
  renderRecommendations(container, result);
  assert.equal(find(container, ".personal-time-recommendations-title").textContent,
    "Recommandations pour respecter le planning 2026 (interpolation linéaire)");
  assert.deepEqual(container.querySelectorAll(".personal-time-recommendation-heading").map(heading => heading.textContent), ["Arrêter (ou clarifier)", "Ralentir", "Augmenter", "Continuer"]);
  assert.equal(find(container, ".personal-time-recommendation-name").textContent, '<img src=x onerror="PRIVATE_SCRIPT()">');
  assert.match(container.textContent, /\+6 h au-dessus du prévu à ce jour\. Max\. 0 h\/sem\. jusqu’au 31\/12\/2026/); assert.match(container.textContent, /Hors planning/);
  assert.match(find(container, ".personal-time-recommendation-unavailable").textContent, /1 projet sans conseil chiffré.*Voir les raisons.*Unknown project : Planning indisponible/);
  assert.equal(find(container, ".personal-time-recommendation-unavailable-details").tagName, "details");
  assert.equal(container.querySelectorAll("img").length, 0); assert.equal(container.querySelectorAll("script").length, 0);
  assert.equal(find(container, ".personal-time-recommendation-status").getAttribute("aria-live"), "polite");
});

test("live tolerance updates retain the native slider, associated label/output and keyboard focus while only lists change", () => {
  const container = domFixture(), scope = { startDate: "2026-01-01", endDate: "2026-01-10" };
  const data = source([slot("2025-12-31T23:00:00Z", "2026-01-10T23:00:00Z", 100)], 60,
    ["2026-01-01", "2026-01-10"], "2026-01-05");
  let tolerancePercent = 15; const values = [];
  const draw = () => renderRecommendations(container, model(data, scope, "2026-01-05", { tolerancePercent }), {
    onToleranceChange(value) { values.push(value); tolerancePercent = value; draw(); }
  });
  draw(); const input = find(container, "[data-recommendation-tolerance]"), output = find(container, "output"); input.focus();
  assert.equal(input.type, "range"); assert.deepEqual([input.min, input.max, input.step], ["0", "100", "1"]);
  assert.equal(find(container, "label").getAttribute("for"), input.id); assert.equal(output.getAttribute("for"), input.id);
  assert.equal(input.getAttribute("aria-describedby"), find(container, ".personal-time-recommendation-helper").id);
  for (const value of [50, 0, 100]) {
    input.value = String(value); input.dispatch("input"); assert.equal(find(container, "[data-recommendation-tolerance]"), input);
    assert.equal(find(container, "output"), output); assert.equal(container.ownerDocument.activeElement, input); assert.equal(output.textContent, `${value} %`);
    assert.equal(input.getAttribute("aria-valuetext"), `${value} % de tolérance`);
  }
  assert.deepEqual(values, [50, 0, 100]); assert.match(find(container, ".is-continue").textContent, /Synthetic|PRIVATE_SCRIPT|eXtRAI/);
  const continued = find(find(container, ".is-continue"), "[data-recommendation-id]");
  assert.equal(continued.textContent, "eXtRAI"); assert.equal(continued.querySelectorAll(".personal-time-recommendation-values").length, 0);
  assert.equal(renderRecommendations(null, {}), null);
});

test("the selected recommendation period updates the same heading and slider for sorted years, custom dates and invalid scope", () => {
  const container = domFixture(), data = source([slot("2026-01-01", "2027-01-01", 100)], 20);
  const draw = scope => renderRecommendations(container, model(data, scope, "2026-06-30"));
  draw([2026]);
  const heading = find(container, ".personal-time-recommendations-title"), input = find(container, "[data-recommendation-tolerance]");
  input.focus();
  for (const [scope, period] of [
    [[2027, 2026, 2026, "invalid"], "2026 et 2027"],
    [{ startDate: "2026-08-01", endDate: "2026-12-31" }, "du 1er août 2026 au 31 décembre 2026"],
    [{ startDate: "2026-02-30", endDate: "2026-12-31" }, "sur la période sélectionnée"]
  ]) {
    draw(scope);
    assert.equal(find(container, ".personal-time-recommendations-title"), heading);
    assert.equal(heading.textContent, `Recommandations pour respecter le planning ${period} (interpolation linéaire)`);
    assert.equal(find(container, "[data-recommendation-tolerance]"), input);
    assert.equal(container.ownerDocument.activeElement, input);
  }
});

test("Ralentir and Augmenter put the greatest hour gaps first with stable title/ID ties, without mutating the model", () => {
  const container = domFixture(), scope = { startDate: "2026-01-01", endDate: "2026-01-10" };
  const cases = [
    [10, "Alpha", 10000, 5025], [12, "Zeta", 100, 90], [11, "Zeta", 100, 90],
    [20, "Alpha", 10000, 4975], [21, "Zeta", 100, 10], [22, "Delta", 100, 10],
    [30, "Zeta", 100, 50], [31, "Alpha", 100, 50]
  ];
  const data = {
    projects: cases.map(([id, name]) => ({ id, name: `[${name}] Synthetic title`, startDate: scope.startDate, endDate: scope.endDate })),
    planning: { slots: cases.map(([id, , planned]) => slot("2025-12-31T23:00:00Z", "2026-01-10T23:00:00Z", planned, id)) },
    timesheets: { lines: cases.map(([projectId, , , hours]) => ({ projectId, hours, date: "2026-01-05" })) }
  };
  const result = model(data, scope, "2026-01-05", { tolerancePercent: 0 }), before = structuredClone(result);
  const ids = category => find(container, `.is-${category}`).querySelectorAll("[data-recommendation-id]")
    .map(item => Number(item.getAttribute("data-recommendation-id")));
  renderRecommendations(container, result);
  assert.deepEqual(ids("slow"), [11, 12, 10]); assert.deepEqual(ids("increase"), [22, 21, 20]);
  assert.deepEqual(ids("continue"), [31, 30]);
  assert.deepEqual(result, before, "Rendering order must not alter source recommendations");
  const input = find(container, "[data-recommendation-tolerance]"); input.focus();
  renderRecommendations(container, model(data, scope, "2026-01-05", { tolerancePercent: 15 }));
  assert.deepEqual(ids("slow"), [11, 12]); assert.deepEqual(ids("increase"), [22, 21]);
  assert.equal(find(container, "[data-recommendation-tolerance]"), input); assert.equal(container.ownerDocument.activeElement, input);
});

test("invalid matching planning dates cannot be mistaken for a confirmed unplanned allowance", () => {
  const data = source([slot("2026-02-30", "2026-12-31", 100)], 10);
  const result = model(data, [2026], "2026-06-30");
  assert.equal(result.rows.length, 0); assert.match(result.unavailable[0].reason, /Planning annuel indisponible/);
});

test("an annual allocation with no project-date overlap leaves the advice unavailable without redistributing source hours", () => {
  const data = source([slot("2025-01-01", "2026-01-01", 100), slot("2026-01-01", "2027-01-01", 100)], 50,
    ["2026-01-01", "2026-12-31"]);
  const original = structuredClone(data), scope = [2025, 2026], now = "2026-06-30";
  const summary = summarizeProjects(data, scope, now); assert.equal(summary[0].planned, 200);
  const result = buildRecommendations(summary, scope, { data, now });
  assert.equal(result.rows.length, 0); assert.equal(result.unavailable[0].reason, "Planning hors des dates du projet");
  assert.equal(summary[0].planned, 200); assert.deepEqual(data, original);
  const currentYear = model(data, [2026], now).rows[0]; assert.equal(currentYear.planned, 100); close(currentYear.expected, 100 * 181 / 365);
});

test("exhausted personal source planning triggers a stop warning even below the selected period's linear target", () => {
  const data = source([slot("2026-01-01", "2026-02-01", 100)], 1);
  data.planning.ok = true;
  const before = structuredClone(data), row = model(data, [2026], "2026-06-30").rows[0];
  assert.equal(row.category, "stop"); assert.equal(row.futurePlanningStatus, "available");
  assert.equal(row.futurePlannedHours, 0); assert.equal(row.stopTracking, true);
  close(row.expected, 100 * 181 / 365); close(row.variance, 1 - row.expected);
  const container = domFixture(); renderRecommendations(container, { rows: [row], unavailable: [] });
  const item = find(find(container, ".is-stop"), "[data-recommendation-id]");
  assert.equal(item.textContent, "eXtRAI — Non planifié");
  assert.equal(find(item, ".personal-time-recommendation-stop").tagName, "span");
  assert.match(item.title, /en-dessous du prévu à ce jour/);
  assert.match(item.getAttribute("aria-description"), /Aucun planning personnel restant d’aujourd’hui à la fin du projet/);
  assert.doesNotMatch(item.textContent, /Cible|Max\.|h\/sem|Hors planning|prévu à ce jour/);
  assert.deepEqual(data, before, "Source slots and their amounts must remain unchanged");
});

test("confirmed empty personal planning warns for unplanned actuals, while bare or incomplete planning does not prove absence", () => {
  const data = source([], 6); data.planning.ok = true;
  const row = model(data, [2026], "2026-06-30").rows[0];
  assert.equal(row.unplanned, true); assert.equal(row.stopTracking, true); assert.equal(row.variance, 6);
  const container = domFixture(); renderRecommendations(container, { rows: [row] });
  assert.equal(find(container, "[data-recommendation-id]").textContent, "eXtRAI — Non planifié");
  assert.match(find(container, "[data-recommendation-id]").title, /\+6 h au-dessus du prévu à ce jour/);
  for (const changed of [
    { ...data, planning: { slots: [] } }, { ...data, planning: { ok: false, slots: [] } }, { ...data, ok: false },
    { ...data, planningError: "Read unavailable" },
    { ...data, planning: { ok: true, complete: false, slots: [] } }, { ...data, planning: { ok: true, partial: true, slots: [] } },
    { ...data, planning: { ok: true, truncated: true, slots: [] } }
  ]) {
    const unknown = model(changed, [2026], "2026-06-30").rows[0];
    assert.equal(unknown.futurePlanningStatus, "unavailable"); assert.equal(unknown.futurePlannedHours, null);
    assert.equal(unknown.stopTracking, false);
  }
  const aggregate = buildRecommendations([{ id: 1, name: "Aggregate", startDate: "2026-01-01", endDate: "2027-12-31", planned: 100, actual: 10 }],
    [2026], { now: "2026-06-30" }).rows[0];
  assert.equal(aggregate.futurePlanningStatus, "unavailable"); assert.equal(aggregate.stopTracking, false);
});

test("future personal allocations in unselected years prevent a false stop warning, but allocations after project end do not", () => {
  const data = source([slot("2026-01-01", "2026-02-01", 100), slot("2027-01-01", "2028-01-01", 80)], 10);
  data.planning.ok = true;
  const row = model(data, [2026], "2026-06-30").rows[0];
  assert.equal(row.planned, 100); assert.equal(row.futurePlanningStatus, "available"); assert.equal(row.stopTracking, false);
  close(row.futurePlannedHours, 80 * (365 * 864e5 - 36e5) / (365 * 864e5));
  const custom = model(data, { startDate: "2026-06-01", endDate: "2026-06-30" }, "2026-06-30").rows[0];
  assert.equal(custom.planned, 0); assert.equal(custom.stopTracking, false); assert.ok(custom.futurePlannedHours > 0);
  const later = source([slot("2028-01-01", "2029-01-01", 80)], 10); later.planning.ok = true;
  assert.equal(model(later, [2026], "2026-06-30").rows[0].stopTracking, true);
});

test("relevant future negative or missing allocations are unknown even when annual nets elsewhere remain valid", () => {
  for (const hours of [-80, null, "", NaN]) {
    const data = source([slot("2026-01-01", "2026-02-01", 100), slot("2027-01-01", "2028-01-01", hours)], 10);
    data.planning.ok = true;
    const row = model(data, [2026], "2026-06-30").rows[0];
    assert.equal(row.futurePlanningStatus, "unavailable"); assert.equal(row.futurePlannedHours, null); assert.equal(row.stopTracking, false);
  }
  const canceled = source([slot("2026-01-01", "2026-02-01", 100),
    slot("2027-01-01", "2028-01-01", 80), slot("2027-01-01", "2028-01-01", -80)], 10);
  canceled.planning.ok = true;
  assert.equal(model(canceled, [2026], "2026-06-30").rows[0].stopTracking, false, "Signed cancellation must not mean a confirmed zero allowance");
  const malformed = source([slot("2027-02-30", "2027-04-01", 80)], 10); malformed.planning.ok = true;
  const unavailable = model(malformed, [2026], "2026-06-30");
  assert.equal(unavailable.rows.length, 0); assert.match(unavailable.unavailable[0].reason, /Planning annuel indisponible/);
});

test("no-planning checks use the active project's full horizon, while ended projects stop for expiry and unstarted projects do not", () => {
  const previous = source([slot("2025-01-01", "2026-01-01", 100)], 50, ["2025-01-01", "2027-12-31"], "2025-06-30");
  previous.planning.ok = true;
  const row = model(previous, [2025], "2026-06-30").rows[0];
  assert.equal(row.periodEnded, true); assert.equal(row.stopTracking, true);
  const zeroActual = source([slot("2026-01-01", "2026-02-01", 100)], 0); zeroActual.planning.ok = true;
  assert.equal(model(zeroActual, [2026], "2026-06-30").rows[0].stopTracking, true);
  for (const [dates, stop] of [[["2026-01-01", "2026-06-29"], true], [["2027-01-01", "2027-12-31"], false]]) {
    const data = source([], 6, dates); data.planning.ok = true;
    const endedOrFuture = model(data, [2026, 2027], "2026-06-30").rows[0];
    assert.equal(endedOrFuture.futurePlanningStatus, "not-applicable"); assert.equal(endedOrFuture.stopTracking, stop);
    assert.deepEqual(endedOrFuture.stopReasons.map(reason => reason.code), stop ? ["expired"] : []);
  }
});

test("stop check includes Brussels today and preserves DST, half-open end boundaries and tiny allocations", () => {
  const data = source([slot("2026-03-28T20:00:00Z", "2026-03-28T23:00:00Z", 3)], 6,
    ["2026-03-28", "2026-03-31"], "2026-03-29"); data.planning.ok = true;
  const now = "2026-03-28T23:30:00Z", absent = model(data, [2026], now);
  assert.equal(absent.asOf, "2026-03-29"); assert.equal(absent.rows[0].stopTracking, true);
  const boundary = structuredClone(data); boundary.planning.slots[0].end = "2026-03-28T23:00:01Z";
  const present = model(boundary, [2026], now).rows[0];
  assert.equal(present.stopTracking, false); close(present.futurePlannedHours, 3 / 10801);
  const todayOnly = source([slot("2026-03-29T08:00:00Z", "2026-03-29T09:00:00Z", 2)], 6,
    ["2026-03-28", "2026-03-31"], "2026-03-29"); todayOnly.planning.ok = true;
  const todayRow = model(todayOnly, [2026], now).rows[0]; assert.equal(todayRow.stopTracking, false); close(todayRow.futurePlannedHours, 2);
  const endDay = source([slot("2026-03-31T21:59:59Z", "2026-03-31T22:00:01Z", 2)], 6,
    ["2026-03-28", "2026-03-31"], "2026-03-29"); endDay.planning.ok = true;
  close(model(endDay, [2026], now).rows[0].futurePlannedHours, 1);
  const lastDay = source([], 6, ["2026-01-01", "2026-03-29"], "2026-03-29"); lastDay.planning.ok = true;
  assert.equal(model(lastDay, [2026], now).rows[0].stopTracking, true, "The project's last calendar day still permits a meaningful stop instruction");
});

test("stop projects remain exclusively in Arrêter through tolerance changes without remounting the slider or requesting an increase", () => {
  const data = source([slot("2026-01-01", "2026-02-01", 100)], 50); data.planning.ok = true;
  const container = domFixture();
  renderRecommendations(container, model(data, [2026], "2026-06-30", { tolerancePercent: 100 }));
  const input = find(container, "[data-recommendation-tolerance]"); input.focus();
  for (const tolerancePercent of [0, 15, 100]) {
    const result = model(data, [2026], "2026-06-30", { tolerancePercent });
    assert.equal(result.rows[0].stopTracking, true); assert.equal(result.rows[0].category, "stop"); assert.equal(result.rows[0].weeklyHours, null);
    renderRecommendations(container, result);
    assert.equal(find(container, "[data-recommendation-tolerance]"), input); assert.equal(container.ownerDocument.activeElement, input);
    const warning = find(find(container, ".is-stop"), "[data-recommendation-id]"); assert.equal(warning.textContent, "eXtRAI — Non planifié");
    assert.match(warning.title, /\+0,4 h au-dessus du prévu à ce jour/);
    assert.equal(find(warning, ".personal-time-recommendation-stop").tagName, "span");
    assert.doesNotMatch(warning.textContent, /Cible|Max\.|h\/sem/);
  }
  for (const category of ["slow", "increase", "continue"]) assert.equal(find(container, `.is-${category}`).querySelectorAll("[data-recommendation-id]").length, 0);
});

test("known expiry and consumed BW budget survive missing personal planning and invalid interpolation without inventing an hour gap", () => {
  const cases = [
    { data: { ...source([], 10, [null, "2026-06-29"]), planning: null }, reason: "expired", unavailable: /Planning indisponible/ },
    { data: source([slot("2026-01-01", "2027-01-01", -20)], 10, ["2026-01-01", "2026-06-29"]), reason: "expired", unavailable: /Planning négatif/ },
    { data: source([slot("2026-02-30", "2027-01-01", 20)], 10, ["2026-01-01", "2026-06-29"]), reason: "expired", unavailable: /Planning annuel indisponible/ },
    { data: source([], 10, [null, null]), reason: "budgetConsumed", unavailable: /Dates de projet/ },
    { data: { ...source([], 10), planning: null }, reason: "budgetConsumed", unavailable: /Planning indisponible/ },
    { data: source([slot("2026-02-30", "2027-01-01", 20)], 10), reason: "budgetConsumed", unavailable: /Planning annuel indisponible/ }
  ];
  for (const { data, reason, unavailable } of cases) {
    if (reason === "budgetConsumed") data.projects[0].personnelBudget = { status: "available", conventionHours: 100, actualHours: 120, actualStatus: "available" };
    const before = structuredClone(data), result = model(data, [2026], "2026-06-30"), row = result.rows[0];
    assert.equal(row.category, "stop"); assert.equal(row.stopTracking, true); assert.ok(row.stopReasons.some(item => item.code === reason));
    assert.equal(row.expected, null); assert.equal(row.variance, null); assert.equal(row.weeklyHours, null);
    assert.match(row.paceUnavailableReason, unavailable); assert.equal(result.unavailable.length, 0);
    const container = domFixture(); renderRecommendations(container, result);
    const item = find(container, "[data-recommendation-id]");
    assert.equal(item.textContent, `eXtRAI — ${reason === "expired" ? "Projet terminé" : "Budget BW consommé"}`);
    assert.match(item.title, /Écart au prévu à ce jour indisponible/);
    assert.match(item.getAttribute("aria-description"), unavailable);
    assert.doesNotMatch(item.textContent, /0 h d’écart|Cible|Max\./);
    if (data.planning === null) assert.doesNotMatch(find(container, "[data-recommendation-id]").textContent,
      /Aucun prévu attendu à ce jour|Hors planning/, "Unavailable planning cannot be described as known zero planning");
    assert.deepEqual(data, before);
  }
});

test("an expired or budget-exhausted project remains visible when today lies in an unselected year gap", () => {
  for (const reason of ["expired", "budgetConsumed"]) {
    const data = source([slot("2024-01-01", "2025-01-01", 100), slot("2026-01-01", "2027-01-01", 100)], 20,
      ["2024-01-01", reason === "expired" ? "2025-06-29" : "2027-12-31"], "2024-06-30");
    if (reason === "budgetConsumed") data.projects[0].personnelBudget = { status: "available", actualStatus: "available", conventionHours: 100, actualHours: 100 };
    const row = model(data, [2024, 2026], "2025-06-30").rows[0];
    assert.equal(row.category, "stop"); assert.ok(row.stopReasons.some(item => item.code === reason));
    assert.equal(row.weeklyHours, null);
  }
});

test("BW convention exhaustion uses known lifetime project-wide values and full precision, independently of personal scope", () => {
  const data = source([slot("2026-01-01", "2027-01-01", 100), slot("2027-01-01", "2028-01-01", 100)], 20);
  data.planning.ok = true;
  data.projects[0].personnelBudget = { status: "available", actualStatus: "available", conventionHours: 100, actualHours: 99.999999999 };
  assert.equal(model(data, [2026], "2026-06-30").rows[0].stopTracking, false, "Rounding two values to 100 must not exhaust the budget");
  data.projects[0].personnelBudget.actualHours = 100;
  for (const scope of [[2026], [2025, 2026], { startDate: "2026-06-01", endDate: "2026-06-30" }]) {
    const row = model(data, scope, "2026-06-30").rows[0];
    assert.equal(row.category, "stop"); assert.equal(row.weeklyHours, null);
    assert.deepEqual(row.stopReasons, [{ code: "budgetConsumed", conventionHours: 100, actualHours: 100 }]);
    const container = domFixture(); renderRecommendations(container, { rows: [row] });
    const item = find(container, "[data-recommendation-id]");
    assert.equal(item.textContent, "eXtRAI — Budget BW consommé");
    assert.match(item.title, /100 h réalisées sur 100 h prévues par la convention, hors Ormitters/);
    assert.equal(item.getAttribute("aria-description"), item.title);
  }
  data.projects[0].personnelBudget.actualHours = 95;
  assert.equal(model(data, [2026], "2026-06-30").rows[0].stopTracking, false, "Signed source corrections can restore budget room");
});

test("unknown or nonpositive convention budgets and unknown actuals cannot produce an exhaustion reason", () => {
  for (const budget of [
    undefined, { status: "unavailable", conventionHours: 100, actualHours: 200, actualStatus: "available" },
    { status: "empty", conventionHours: 0, actualHours: 200, actualStatus: "available" },
    { status: "available", conventionHours: -100, actualHours: 200, actualStatus: "available" },
    { status: "available", conventionHours: null, actualHours: 200, actualStatus: "available" },
    { status: "available", conventionHours: Infinity, actualHours: 200, actualStatus: "available" },
    { status: "available", conventionHours: 100, actualHours: 200, actualStatus: "unavailable" },
    { status: "available", conventionHours: 100, actualHours: null, actualStatus: "available" },
    { status: "available", conventionHours: 100, actualHours: NaN, actualStatus: "available" },
    { status: "available", conventionHours: 100, actualHours: -20, actualStatus: "available" }
  ]) {
    const data = source([slot("2026-01-01", "2027-01-01", 100)], 20);
    data.planning.ok = true; data.projects[0].personnelBudget = budget;
    const row = model(data, [2026], "2026-06-30").rows[0];
    assert.equal(row.stopTracking, false); assert.ok(!row.stopReasons.some(reason => reason.code === "budgetConsumed"));
  }
});

test("expiry includes Brussels today, rejects unknown or reversed end dates and exposes the actual project deadline", () => {
  const data = source([slot("2026-01-01", "2027-01-01", 100)], 20, ["2026-01-01", "2026-06-30"]);
  const row = model(data, [2026], "2026-06-29T22:30:00Z").rows[0];
  assert.equal(row.category, "stop"); assert.deepEqual(row.stopReasons, [{ code: "expired", endDate: "2026-06-30" }]);
  const container = domFixture(); renderRecommendations(container, { rows: [row] });
  assert.equal(find(container, "[data-recommendation-id]").textContent, "eXtRAI — Projet terminé");
  assert.match(find(container, "[data-recommendation-id]").title, /Projet terminé le 30\/06\/2026/);
  for (const [startDate, endDate] of [[null, null], ["2026-01-01", "2026-02-30"], ["2027-01-01", "2026-06-30"]]) {
    const invalid = structuredClone(data); invalid.projects[0].startDate = startDate; invalid.projects[0].endDate = endDate;
    const unknown = model(invalid, [2026], "2026-06-30");
    assert.equal(unknown.rows.length, 0); assert.match(unknown.unavailable[0].reason, /Dates de projet/);
    invalid.projects[0].personnelBudget = { status: "available", actualStatus: "available", conventionHours: 100, actualHours: 100 };
    assert.deepEqual(model(invalid, [2026], "2026-06-30").rows[0].stopReasons.map(reason => reason.code), ["budgetConsumed"]);
  }
});

test("all applicable stop reasons combine once, take priority over linear advice and never add out-of-scope or zero-activity projects", () => {
  const data = source([slot("2026-01-01", "2026-02-01", 100)], 30, ["2026-01-01", "2026-06-30"]);
  data.planning.ok = true;
  data.projects[0].personnelBudget = { status: "available", actualStatus: "available", conventionHours: 100, actualHours: 120 };
  data.projects.push({ id: 2, name: "Uninvolved exhausted", startDate: "2026-01-01", endDate: "2026-06-30", personnelBudget: data.projects[0].personnelBudget });
  const row = model(data, [2026], "2026-06-30").rows[0];
  assert.equal(row.category, "stop"); assert.deepEqual(row.stopReasons.map(reason => reason.code), ["expired", "noPersonalPlan", "budgetConsumed"]);
  assert.equal(row.actual, 30); assert.equal(row.expected, 100); assert.equal(row.variance, -70);
  assert.equal(model(data, [2026], "2026-06-30").rows.length, 1);
  const zero = structuredClone(data); zero.planning.slots = []; zero.timesheets.lines[0].hours = 0;
  assert.equal(model(zero, [2026], "2026-06-30").rows.length, 0);
  const container = domFixture(); renderRecommendations(container, { rows: [row] });
  const item = find(container, "[data-recommendation-id]");
  assert.equal(item.textContent, "eXtRAI — Projet terminé · Non planifié · Budget BW consommé");
  assert.equal(item.querySelectorAll(".personal-time-recommendation-stop").length, 1);
  assert.equal(item.querySelectorAll(".personal-time-recommendation-values").length, 0);
  assert.equal(item.querySelectorAll(".personal-time-recommendation-note").length, 0);
  assert.match(item.getAttribute("aria-description"), /Projet terminé le 30\/06\/2026/);
  assert.match(item.getAttribute("aria-description"), /Aucun planning personnel restant/);
  assert.match(item.getAttribute("aria-description"), /120 h réalisées sur 100 h prévues par la convention, hors Ormitters/);
  for (const category of ["slow", "increase", "continue"]) assert.equal(find(container, `.is-${category}`).querySelectorAll("[data-recommendation-id]").length, 0);
});

test("Arrêter ranks known signed hour gaps before unavailable comparisons, then uses stable short-name/ID ties", () => {
  const container = domFixture(), rows = [
    { id: 9, name: "Beta", shortName: "Beta", variance: null }, { id: 8, name: "Alpha", shortName: "Alpha", variance: null },
    { id: 6, name: "Beta", shortName: "Beta", variance: 20 }, { id: 5, name: "Beta", shortName: "Beta", variance: -20 },
    { id: 4, name: "Alpha", shortName: "Alpha", variance: 10 }
  ].map(row => ({ ...row, category: "stop", stopTracking: true, stopReasons: [{ code: "expired", endDate: "2026-06-30" }] }));
  const before = structuredClone(rows); renderRecommendations(container, { rows });
  assert.deepEqual(find(container, ".is-stop").querySelectorAll("[data-recommendation-id]").map(item => Number(item.getAttribute("data-recommendation-id"))), [5, 6, 4, 8, 9]);
  assert.deepEqual(rows, before);
});

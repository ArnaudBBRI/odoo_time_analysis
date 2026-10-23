const assert = require("node:assert/strict");
const test = require("node:test");
const { render, cleanup, monthlyGeometry } = require("../project-browser");
const i18n = require("../i18n");
const { domFixture } = require("./dom-fixture");

function summary(overrides = {}) {
  return {
    status: "available", mode: "monthly", startDate: "2024-01-15", throughDate: "2024-03-05", endDate: "2024-04-30",
    months: [{ key: "2024-01" }, { key: "2024-02" }, { key: "2024-03" }],
    employees: [{ id: "employee:1", name: "Alex Example", values: [8, 12, 3] },
      { id: "employee:2", name: "Drew Example", values: [2, -1, 4] }],
    total: [10, 11, 7], convention: [9, 14, 2], budgetStatus: "available", warnings: [], ...overrides
  };
}

const source = milestones => ({ available: true, milestones });

function detail(milestones) {
  const monthly = summary();
  return {
    personal: { planned: 50, actual: 23 },
    project: { planned: 80, actual: 28, employees: [{ id: "employee:1", name: "Alex Example", actual: 23 },
      { id: "employee:2", name: "Drew Example", actual: 5 }] },
    monthly,
    plannedMonthly: summary({ kind: "planned", throughDate: "2024-04-30",
      months: [...monthly.months, { key: "2024-04" }],
      employees: [{ id: "employee:1", name: "Alex Example", values: [8, 12, 3, 20] },
        { id: "employee:2", name: "Drew Example", values: [2, 1, 4, 10] }], total: [10, 13, 7, 30], convention: [9, 14, 15, 14] }),
    milestones
  };
}

const projectOptions = data => ({ projects: [{ id: 17, name: "Fictional milestone project" }], selectedId: 17, detail: data });
const chart = (container, kind = "actual") => container.querySelectorAll(`[data-monthly-kind="${kind}"]`)[0];
const markerDates = element => element.querySelectorAll("[data-monthly-milestone]").map(marker => marker.getAttribute("data-milestone-date"));

function rotatedLabelBounds(milestone, axis, measure) {
  const angle = axis.angle * Math.PI / 180, points = [];
  milestone.labelLines.forEach((line, index) => {
    for (const x of [-measure(line), 0]) for (const y of [index * axis.lineHeight - axis.fontSize,
      index * axis.lineHeight + axis.fontSize / 4]) {
      points.push({ x: milestone.labelX + x * Math.cos(angle) - y * Math.sin(angle),
        y: milestone.labelY + x * Math.sin(angle) + y * Math.cos(angle) });
    }
  });
  return { left: Math.min(...points.map(point => point.x)), right: Math.max(...points.map(point => point.x)),
    top: Math.min(...points.map(point => point.y)), bottom: Math.max(...points.map(point => point.y)) };
}

function assertLabelSeparation(geometry, measure) {
  const bounds = geometry.milestones.map(milestone => rotatedLabelBounds(milestone, geometry.milestoneAxis, measure));
  for (const box of bounds) {
    assert.ok(box.left >= 0 && box.right <= geometry.width + 1e-6, "Rotated text stays within both chart edges");
    assert.ok(box.top > geometry.milestoneAxis.y + 4, "Names clear the secondary axis ticks and the main month axis");
    assert.ok(box.bottom < geometry.axisCaptionY - 8, "Both text lines clear the relocated month caption");
  }
  for (let first = 0; first < bounds.length; first++) for (let second = first + 1; second < bounds.length; second++) {
    const a = bounds[first], b = bounds[second];
    const intersectsX = a.left < b.right - 1e-6 && b.left < a.right - 1e-6;
    const intersectsY = a.top < b.bottom - 1e-6 && b.top < a.bottom - 1e-6;
    assert.ok(!(intersectsX && intersectsY), `Rotated label boxes ${first} and ${second} cannot overlap`);
  }
  return bounds;
}

test("milestone geometry clips strict dates to the displayed project period and preserves source data", () => {
  const data = summary();
  const milestones = source([
    { id: 9, name: "After cutoff", date: "2024-03-06" },
    { id: 4, name: "Leap-day review", date: "2024-02-29" },
    { id: 2, name: "First day", date: "2024-01-15" },
    { id: 8, name: "Cutoff day", date: "2024-03-05" },
    { id: 1, name: "Before project", date: "2024-01-14" },
    { id: 5, name: "Invalid day", date: "2024-02-30" },
    { id: 6, name: "Datetime is not a source date", date: "2024-02-20T12:00:00Z" },
    { id: 7, name: "No date", date: false },
    { id: 3, name: "Mid-February", date: "2024-02-15" }
  ]);
  const original = structuredClone({ data, milestones });
  for (const width of [280, 390, 800, 1200]) {
    const geometry = monthlyGeometry(data, width, null, milestones);
    assert.deepEqual(geometry.milestones.map(marker => marker.id), [2, 3, 4, 8]);
    assert.deepEqual(geometry.milestones.map(marker => marker.monthKey), ["2024-01", "2024-02", "2024-02", "2024-03"]);
    assert.ok(geometry.milestones.every(marker => Number.isFinite(marker.x) && marker.x >= geometry.plot.left && marker.x <= geometry.plot.left + geometry.plot.width));
    for (let index = 1; index < geometry.milestones.length; index++) assert.ok(geometry.milestones[index].x > geometry.milestones[index - 1].x);
    const leap = geometry.milestones.find(marker => marker.id === 4);
    assert.ok(leap.x > geometry.x[1] && leap.x < (geometry.x[1] + geometry.x[2]) / 2,
      "Late February stays within February's month target rather than snapping to March");
  }
  assert.deepEqual({ data, milestones }, original);
  const withMissingMonth = summary({ months: [{ key: "2024-01" }, { key: "2024-03" }] });
  assert.deepEqual(monthlyGeometry(withMissingMonth, 800, null, milestones).milestones.map(marker => marker.id), [2, 8]);
});

test("different milestone days remain separate in the final and single visible month", () => {
  const milestones = source([{ id: 1, name: "Start", date: "2024-03-10" }, { id: 2, name: "Middle", date: "2024-03-15" },
    { id: 3, name: "Finish", date: "2024-03-20" }, { id: 4, name: "Too late", date: "2024-03-21" }]);
  const one = summary({ startDate: "2024-03-10", throughDate: "2024-03-20", months: [{ key: "2024-03" }],
    employees: [{ id: "employee:1", name: "Alex Example", values: [0] }], total: [0], convention: null });
  const geometry = monthlyGeometry(one, 280, "employee:1", milestones);
  assert.equal(geometry.milestones.length, 3);
  const [start, middle, finish] = geometry.milestones.map(marker => marker.x);
  assert.ok(start >= geometry.plot.left && start < middle && middle < finish && finish <= geometry.plot.left + geometry.plot.width);
  assert.ok(Math.abs(middle - (geometry.plot.left + geometry.plot.width / 2)) < 1,
    "A milestone halfway through the visible dates is halfway across a single-month plot");
  for (const input of [null, undefined, { available: false, milestones: milestones.milestones }, source([])]) {
    assert.deepEqual(monthlyGeometry(one, 280, null, input).milestones, []);
  }
  assert.deepEqual(monthlyGeometry({ ...one, months: [] }, 280, null, milestones).milestones, []);
  assert.deepEqual(monthlyGeometry({ ...one, months: {} }, 280, null, milestones).milestones, []);
});

test("actual and planned charts show solid black markers, literal details and month tooltip evidence", () => {
  const container = domFixture();
  const unsafeName = '<img src=x onerror="alert(1)"> & source milestone';
  const data = detail(source([{ id: 2, name: "Future review", date: "2024-04-15" },
    { id: 1, name: unsafeName, date: "2024-02-29" }, { id: 3, name: "Second review", date: "2024-02-14" }]));
  const original = structuredClone(data);
  try {
    render(container, projectOptions(data));
    const actual = chart(container), planned = chart(container, "planned");
    assert.deepEqual(markerDates(actual), ["2024-02-14", "2024-02-29"]);
    assert.deepEqual(markerDates(planned), ["2024-02-14", "2024-02-29", "2024-04-15"]);
    for (const section of [actual, planned]) {
      for (const marker of section.querySelectorAll("[data-monthly-milestone]")) {
        assert.equal(marker.tagName, "line");
        assert.equal(marker.getAttribute("stroke"), "#000");
        assert.equal(marker.getAttribute("stroke-dasharray"), "none");
        assert.equal(marker.getAttribute("pointer-events"), "none", "Markers cannot block existing month hover/touch targets");
        assert.ok(Number(marker.getAttribute("y2")) > Number(marker.getAttribute("y1")));
      }
      const details = section.querySelectorAll("[data-monthly-milestones]")[0];
      assert.equal(details.tagName, "details");
      assert.ok(details.textContent.includes(unsafeName));
      assert.ok(details.textContent.includes("29/02/2024"));
      assert.equal(details.querySelectorAll("img").length, 0);
      section.querySelectorAll('[data-monthly-month="2024-02"]')[0].focus();
      const tooltip = section.querySelectorAll("[data-monthly-tooltip]")[0];
      assert.equal(tooltip.hidden, false);
      assert.ok(tooltip.textContent.includes(unsafeName));
      assert.ok(tooltip.textContent.includes("Second review"));
      assert.ok(tooltip.textContent.includes("29/02/2024"));
      assert.ok(tooltip.textContent.includes("14/02/2024"));
      assert.ok(!tooltip.textContent.includes("Future review"));
    }
    assert.deepEqual(data, original);
  } finally { cleanup(container); }
});

test("a separate angled milestone axis preserves the month plot and keeps crowded boundary labels inside the chart", () => {
  const data = summary(), milestones = source([
    ...Array.from({ length: 18 }, (_, index) => ({ id: index + 1,
      name: `${index === 0 ? "Very long milestone title repeated ".repeat(16) : "Shared-day review"} ${index + 1}`,
      date: "2024-01-15" })),
    { id: 99, name: "Milestone at the final visible date", date: "2024-03-05" }
  ]);
  const original = structuredClone({ data, milestones });
  const measure = text => Array.from(text).length * 7;
  for (const width of [280, 390, 800, 1200]) {
    const baseline = monthlyGeometry(data, width);
    const geometry = monthlyGeometry(data, width, null, milestones, measure);
    assert.equal(geometry.baseHeight, baseline.height);
    assert.ok(geometry.height > geometry.baseHeight);
    assert.deepEqual(geometry.plot, baseline.plot, "The new axis must not compress the existing filled areas");
    for (const key of ["min", "max", "x", "ticks", "series", "positive", "negative"]) {
      assert.deepEqual(geometry[key], baseline[key], `Milestone names cannot change the hours ${key}`);
    }
    const axis = geometry.milestoneAxis;
    assert.equal(axis.angle, -30);
    assert.equal(axis.fontSize, 9);
    assert.equal(axis.lineHeight, 10.5);
    assert.ok(axis.y > geometry.plot.top + geometry.plot.height + 28,
      "The secondary baseline stays below the month ticks without reserving room for the old caption");
    assert.ok(geometry.axisCaptionY > axis.y, "The month caption moves below the secondary axis");
    assert.ok(geometry.height >= geometry.axisCaptionY + 12);
    assert.equal(geometry.milestones.length, milestones.milestones.length);
    const positions = new Set();
    for (const milestone of geometry.milestones) {
      for (const key of ["labelWidth", "labelX", "labelY", "labelLane"]) assert.ok(Number.isFinite(milestone[key]), key);
      assert.ok(milestone.labelText.length > 0);
      assert.ok(milestone.labelWidth > 0);
      assert.ok(milestone.labelLines.length >= 1 && milestone.labelLines.length <= 2);
      positions.add(`${milestone.labelX}:${milestone.labelY}`);
      assert.ok(milestone.x >= geometry.plot.left && milestone.x <= geometry.plot.left + geometry.plot.width,
        "The source date marker remains at its original plot coordinate");
    }
    assert.equal(positions.size, geometry.milestones.length, "Same-date milestone names must remain separate");
    assertLabelSeparation(geometry, measure);
    for (const lane of new Set(geometry.milestones.map(milestone => milestone.labelLane))) {
      const labels = geometry.milestones.filter(milestone => milestone.labelLane === lane)
        .map(milestone => rotatedLabelBounds(milestone, axis, measure)).sort((a, b) => a.left - b.left);
      for (let index = 1; index < labels.length; index++) {
        assert.ok(labels[index].left - labels[index - 1].right >= axis.spacing - 1e-6,
          "Lane spacing uses the full horizontal projection of both text lines");
      }
    }
    assert.ok(geometry.milestones[0].labelText.endsWith("…"), "Extreme titles are shortened only on the bounded axis");
    assert.equal(geometry.milestones[0].name, milestones.milestones[0].name, "The complete source title remains available");
  }
  assert.deepEqual({ data, milestones }, original);
});

test("the compact milestone title axis uses two tilted lines above the moved month caption and retains safe source titles", () => {
  const container = domFixture();
  const longName = '<svg onload="alert(1)"> ' + "Long milestone source title ".repeat(20);
  const data = detail(source([{ id: 1, name: longName, date: "2024-01-15" },
    { id: 2, name: "First-month second title", date: "2024-01-15" },
    { id: 3, name: "Future source title", date: "2024-04-30" }]));
  try {
    render(container, projectOptions(data));
    for (const [kind, expected] of [["actual", 2], ["planned", 3]]) {
      const section = chart(container, kind), axes = section.querySelectorAll("[data-monthly-milestone-axis]");
      assert.equal(axes.length, 1);
      const captions = section.querySelectorAll("[data-monthly-axis-caption]");
      assert.equal(captions.length, 1);
      const labels = axes[0].querySelectorAll("[data-monthly-milestone-label]");
      assert.equal(labels.length, expected);
      for (const label of labels) {
        assert.equal(label.tagName, "text");
        assert.equal(label.getAttribute("fill"), "#000");
        assert.equal(label.getAttribute("text-anchor"), "end");
        assert.match(label.getAttribute("transform"), /^rotate\(-30[ ,]/);
        assert.ok(Number(label.getAttribute("y")) < Number(captions[0].getAttribute("y")));
        const lines = label.querySelectorAll("tspan");
        assert.equal(lines.length, 2, "Multiword names use two smaller lines on the secondary axis");
        assert.ok(lines.every(line => line.textContent.trim()));
        assert.ok(lines.every(line => Number(line.getAttribute("x")) === Number(label.getAttribute("x"))));
        assert.equal(Number(lines[1].getAttribute("y")) - Number(lines[0].getAttribute("y")), 10.5);
        assert.ok(label.getAttribute("data-milestone-date"));
      }
      const first = labels.find(label => label.getAttribute("data-monthly-milestone-label") === "1");
      assert.ok(first.querySelectorAll("title").some(title => title.textContent.includes(longName)));
      assert.ok(section.querySelectorAll("[data-monthly-milestones]")[0].textContent.includes(longName));
      assert.equal(section.querySelectorAll("[onload]").length, 0);
    }
  } finally { cleanup(container); }
});

test("normal milestone names have a compact two-line footer and one-word names stay intact", () => {
  const data = summary(), milestones = source([
    { id: 1, name: "Lancement de la campagne", date: "2024-01-22" },
    { id: 2, name: "Rapport intermédiaire", date: "2024-02-15" },
    { id: 3, name: "Validation des résultats", date: "2024-03-03" }
  ]);
  const measure = text => Array.from(text).length * 5;
  for (const width of [280, 390, 420, 800, 899, 1200, 1339]) {
    const geometry = monthlyGeometry(data, width, null, milestones, measure, 4096);
    assert.ok(geometry.milestones.every(milestone => milestone.labelLines.length === 2));
    assert.ok(geometry.milestones.every(milestone => !milestone.labelText.includes("…")),
      "Ordinary full milestone names should fit without shortening");
    assert.ok(geometry.height - geometry.baseHeight <= 125,
      "A normal one-lane title axis must not bring back the former deep footer");
    assert.ok(geometry.milestoneAxis.y < geometry.baseHeight - 8,
      "Moving the caption frees the gap immediately below the month ticks");
    assertLabelSeparation(geometry, measure);
  }
  const geometry = monthlyGeometry(data, 800, null, source([{ id: 1, name: "Review", date: "2024-02-15" }]));
  assert.deepEqual(geometry.milestones[0].labelLines, ["Review"]);
  assert.equal(geometry.milestones[0].name, "Review");
});

test("twelve same-date unicode and long milestone titles pack by rotated bounds at normal and wide widths", () => {
  const measure = text => Array.from(text).reduce((width, character) => width +
    (/[^\u0000-\u024f]/.test(character) ? 9 : /[MW]/.test(character) ? 8 : 5), 0);
  for (const kind of ["actual", "planned"]) for (const mode of ["monthly", "cumulative"]) {
    const data = kind === "planned" ? detail(null).plannedMonthly : summary(); data.mode = mode;
    for (const date of [data.startDate, "2024-02-29", data.throughDate]) {
      const milestones = source(Array.from({ length: 12 }, (_, index) => ({ id: index + 1, date,
        name: index === 0 ? "🏗️工程ÉTAPE🧱".repeat(30) : index % 2
          ? `${"Évaluation technique – 工程 🧱 et validation complète ".repeat(8)} ${index}`
          : `Révision ${index} · données BIM et contrôle qualité` })));
      const original = structuredClone({ data, milestones });
      for (const width of [280, 420, 899, 1200, 1339]) {
        const baseline = monthlyGeometry(data, width, null, null, measure, 4096);
        const geometry = monthlyGeometry(data, width, "employee:1", milestones, measure, 4096);
        const isolated = monthlyGeometry(data, width, "employee:1", null, measure, 4096);
        assert.equal(geometry.width, width); assert.equal(geometry.milestoneAxis.angle, -30);
        assert.equal(geometry.milestoneAxis.fontSize, 9); assert.equal(geometry.milestoneAxis.lineHeight, 10.5);
        assert.deepEqual(geometry.plot, baseline.plot);
        for (const key of ["min", "max", "x", "ticks", "series", "positive", "negative"]) {
          assert.deepEqual(geometry[key], isolated[key], `${kind}/${mode} preserves hours ${key}`);
        }
        assert.equal(geometry.milestones.length, 12);
        assert.equal(new Set(geometry.milestones.map(milestone => milestone.x)).size, 1,
          "Label packing cannot spread the same source date's vertical marker coordinates");
        assert.ok(geometry.milestones.every(milestone => milestone.labelLines.length <= 2 && !milestone.labelText.includes("\ufffd")));
        const boxes = assertLabelSeparation(geometry, measure);
        const lanes = new Set(geometry.milestones.map(milestone => milestone.labelLane)).size;
        const widest = Math.max(...boxes.map(box => box.right - box.left));
        const capacity = Math.max(1, Math.floor((width - 20 + geometry.milestoneAxis.spacing) /
          (widest + geometry.milestoneAxis.spacing)));
        assert.ok(lanes <= Math.ceil(12 / capacity) + 1,
          "Same-date boundary labels use the available horizontal space before creating more footer lanes");
        assert.ok(geometry.height - geometry.baseHeight <= lanes * (Math.max(...boxes.map(box => box.bottom - box.top)) + 6) + 12,
          "Dense footer height follows only the projected text and small lane gaps");
        for (const milestone of geometry.milestones) assert.equal(milestone.name, milestones.milestones[milestone.id - 1].name);
      }
      assert.deepEqual({ data, milestones }, original);
    }
  }
});

test("empty or unavailable milestone sources retain the original chart height without a secondary axis", () => {
  const data = summary();
  for (const width of [280, 800]) for (const milestones of [null, source([]), { available: false, milestones: [] },
    source([{ id: 1, name: "Outside chart", date: "2024-05-01" }])]) {
    const geometry = monthlyGeometry(data, width, null, milestones);
    assert.equal(geometry.height, width < 520 ? 300 : 340);
    assert.equal(geometry.baseHeight, geometry.height);
    assert.equal(geometry.milestoneAxis, null);
    assert.equal(geometry.axisCaptionY, geometry.baseHeight - 8,
      "A chart without milestone labels keeps its original month-caption position");
  }
  const container = domFixture();
  try {
    render(container, projectOptions(detail(source([]))));
    assert.equal(container.querySelectorAll("[data-monthly-milestone-axis]").length, 0);
    assert.equal(container.querySelectorAll("[data-monthly-milestone-label]").length, 0);
  } finally { cleanup(container); }
});

test("milestones remain project-wide across mode, employee, exclusion and language changes", () => {
  const container = domFixture();
  const data = detail(source([{ id: 1, name: "Design validation", date: "2024-02-29" },
    { id: 2, name: "Final review", date: "2024-04-30" }]));
  try {
    for (const language of ["fr", "nl"]) {
      i18n.setLanguage(language);
      for (const mode of ["monthly", "cumulative"]) for (const selected of [null, "employee:1"]) {
        Object.assign(data, { monthlyMode: mode, monthlyEmployeeId: selected, plannedMonthlyEmployeeId: selected,
          includeOrmitters: selected !== null, ignoredEmployeeIds: new Set(["employee:2"]) });
        render(container, projectOptions(data));
        assert.deepEqual(markerDates(chart(container)), ["2024-02-29"]);
        assert.deepEqual(markerDates(chart(container, "planned")), ["2024-02-29", "2024-04-30"]);
        assert.ok(chart(container).querySelectorAll("[data-monthly-milestones]")[0].textContent.includes("Design validation"));
        assert.ok(chart(container, "planned").querySelectorAll("[data-monthly-milestones]")[0].textContent.includes("Final review"));
        assert.ok(container.querySelectorAll("[data-monthly-milestone-label]")
          .every(label => /^rotate\(-30[ ,]/.test(label.getAttribute("transform"))),
        "The gentler angle applies to actual/planned, monthly/cumulative, employee and language modes");
      }
    }
  } finally { i18n.setLanguage("fr"); cleanup(container); }
});

test("missing, empty, unavailable and out-of-range milestones add no phantom chart markers", () => {
  const container = domFixture();
  try {
    for (const milestones of [undefined, null, source([]), { available: false, milestones: [{ id: 1, name: "Unreadable", date: "2024-02-01" }] },
      source([{ id: 1, name: "Not in either chart", date: "2024-05-01" }])]) {
      render(container, projectOptions(detail(milestones)));
      assert.equal(container.querySelectorAll("[data-monthly-milestone]").length, 0);
      assert.equal(container.querySelectorAll("[data-monthly-milestones]").length, 0);
      assert.equal(container.querySelectorAll("[data-monthly-chart]").length, 2, "Optional milestone availability never removes known hour charts");
      assert.ok(container.querySelectorAll("[data-monthly-area]").length > 0);
    }
  } finally { cleanup(container); }
});

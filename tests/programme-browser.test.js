const assert = require("node:assert/strict");
const test = require("node:test");
const { PROGRAMMES, normalizeCatalogue, render } = require("../programme-browser");
const { domFixture } = require("./dom-fixture");

const expected = [
  ["DC1", "Backbone", "To Structure", "Pauline Dewez"],
  ["DC2", "Insight", "To Act", "Timothée Lonfils"],
  ["DC3", "Manufacturing", "To Make", "François Denis"]
];
const frenchCatchphrases = ["Structurer", "Agir", "Fabriquer"];
const photo = "data:image/png;base64,aW1hZ2U=";
const find = (container, selector) => container.querySelectorAll(selector)[0];
const catalogue = () => PROGRAMMES.map((programme, index) => ({ ...programme,
  manager: { id: index + 10, name: programme.manager.name, photoDataUrl: photo } }));

test("the programme catalogue contains exactly the three approved identities independently of project data", () => {
  assert.deepEqual(PROGRAMMES.map(row => [row.id, row.subtitle, row.catchphrase, row.manager.name]), expected);
  assert.ok(Object.isFrozen(PROGRAMMES));
  for (const programme of PROGRAMMES) {
    assert.equal(programme.code, programme.id); assert.equal(programme.name, programme.id);
    assert.equal(programme.manager.id, null); assert.equal(programme.manager.photoDataUrl, null);
  }
});

test("catalogue normalization orders fixed identities and accepts only matched responsible-person enrichment", () => {
  const input = catalogue().reverse(), original = structuredClone(input);
  input.forEach(row => { row.name = "Untrusted replacement"; row.subtitle = "Wrong subtitle"; row.catchphrase = "Wrong catchphrase"; });
  const before = structuredClone(input);
  const normalized = normalizeCatalogue({ programmes: input });
  assert.deepEqual(normalized.map(row => [row.id, row.subtitle, row.catchphrase, row.manager.name]), expected);
  assert.deepEqual(normalized.map(row => row.manager.id), [10, 11, 12]);
  assert.ok(normalized.every(row => row.manager.photoDataUrl === photo));
  assert.deepEqual(input.map(row => row.manager), original.map(row => row.manager), "Normalization does not alter source person records");
  assert.deepEqual(input, before);
  const wrongPerson = catalogue(); wrongPerson[0].manager = { id: 999, name: "Another responsible person", photoDataUrl: photo };
  const fixed = normalizeCatalogue(wrongPerson)[0];
  assert.equal(fixed.manager.name, "Pauline Dewez"); assert.equal(fixed.manager.id, null); assert.equal(fixed.manager.photoDataUrl, null);
});

test("catalogue normalization rejects missing, duplicate and unrelated programme identities without mutating them", () => {
  for (const programmes of [null, {}, [], [{ id: "DC1" }], [...catalogue(), { id: "OTHER" }],
    [catalogue()[0], catalogue()[0], catalogue()[2]], catalogue().map((row, index) => index === 0 ? { ...row, id: "dc1" } : row),
    catalogue().map((row, index) => index === 0 ? { ...row, id: 1 } : row)]) {
    const original = structuredClone(programmes);
    assert.throws(() => normalizeCatalogue(programmes)); assert.deepEqual(programmes, original);
  }
});

test("default programme cards have one native radio each and show the approved front and flipped identities", () => {
  const container = domFixture(); render(container);
  const radios = container.querySelectorAll("[data-programme-choice]");
  assert.equal(find(container, ".programme-browser-grid").tagName, "fieldset");
  assert.deepEqual(radios.map(radio => radio.value), ["DC1", "DC2", "DC3"]);
  radios.forEach((radio, index) => {
    assert.equal(radio.type, "radio"); assert.equal(radio.name, "programme-choice"); assert.notEqual(radio.disabled, true);
    const label = radio.parentElement, front = find(label, ".project-card-front"), back = find(label, ".project-card-back");
    assert.ok(label.className.split(/\s+/).includes("programme-browser-tile")); assert.equal(label.children[0], radio);
    assert.equal(find(front, ".project-card-title").textContent, expected[index][0]);
    assert.doesNotMatch(front.textContent, /Backbone|Insight|Manufacturing|Structurer|Agir|Fabriquer/);
    assert.deepEqual(["project-card-back-number", "project-card-short-name", "project-card-manager-name", "project-card-back-full-name"]
      .map(className => find(back, `.${className}`).textContent), [frenchCatchphrases[index], expected[index][0], expected[index][3], expected[index][1]]);
    assert.equal(find(back, ".project-card-back-full-name").tagName, "em");
    assert.equal(front.getAttribute("aria-hidden"), "true"); assert.equal(back.getAttribute("aria-hidden"), "true");
    const descriptions = label.querySelectorAll(".project-card-sr-only");
    assert.equal(descriptions.length, 1); assert.equal(radio.getAttribute("aria-describedby"), descriptions[0].id);
    assert.ok(descriptions[0].textContent.includes(expected[index][3])); assert.ok(label.title.includes(expected[index][1]));
    assert.ok(descriptions[0].textContent.includes(expected[index][1])); assert.ok(descriptions[0].textContent.includes(frenchCatchphrases[index]));
    assert.ok(radio.getAttribute("aria-label").includes(frenchCatchphrases[index]));
    assert.ok(label.title.includes(frenchCatchphrases[index]));
    assert.doesNotMatch(`${radio.getAttribute("aria-label")} ${descriptions[0].textContent} ${label.title} ${back.textContent}`, /To Structure|To Act|To Make/);
    assert.doesNotMatch(descriptions[0].textContent, /Budget total|Début|Fin|Indisponible/);
    assert.doesNotMatch(label.title, /Budget total|Début|Fin|Indisponible/);
    assert.doesNotMatch(back.textContent, /Budget total|Début|Fin|Indisponible/);
  });
  assert.equal(container.querySelectorAll(".project-browser").length, 0, "Choosing a programme does not invent project detail panels");
});

test("responsible photos use only bounded raster data and failures retain initials on both programme card faces", () => {
  const container = domFixture(), programmes = catalogue(), original = structuredClone(programmes);
  render(container, { programmes });
  const first = find(container, '[data-programme-choice="DC1"]').parentElement;
  const images = first.querySelectorAll("img"); assert.equal(images.length, 2);
  images.forEach(image => { assert.equal(image.src, photo); assert.equal(image.alt, ""); image.dispatch("error"); assert.equal(image.hidden, true); });
  assert.match(first.textContent, /PD/); assert.deepEqual(programmes, original);
  for (const photoDataUrl of ["https://invalid.example/person.png", "javascript:alert(1)", "data:image/svg+xml;base64,PHN2Zy8+",
    "data:image/png;base64,aW1h Z2U=", `data:image/png;base64,${"A".repeat(400001)}`]) {
    const invalid = catalogue(); invalid.forEach(row => { row.manager.photoDataUrl = photoDataUrl; });
    render(container, { programmes: invalid }); assert.equal(container.querySelectorAll("img").length, 0);
    assert.match(container.textContent, /PD/);
  }
});

test("fixed programme text and responsible identity cannot be replaced with active source markup", () => {
  const container = domFixture(), programmes = catalogue();
  programmes.forEach(row => { row.name = '<img src=x onerror="PRIVATE_SCRIPT()">'; row.subtitle = "<script>subtitle</script>";
    row.manager.name = "<script>person</script>"; });
  const original = structuredClone(programmes); render(container, { programmes });
  assert.equal(container.querySelectorAll("img").length, 0); assert.equal(container.querySelectorAll("script").length, 0);
  assert.match(container.textContent, /Pauline Dewez/); assert.doesNotMatch(container.textContent, /PRIVATE_SCRIPT|<script>/);
  assert.deepEqual(programmes, original);
});

test("programme choices preserve native selection, exact IDs and radio focus during a catalogue redraw", () => {
  const container = domFixture(), programmes = catalogue(), choices = [];
  const draw = () => render(container, { programmes }, { selectedId: "DC2", focusId: "DC2", onSelect: id => choices.push(id) });
  draw();
  const radios = container.querySelectorAll("[data-programme-choice]");
  assert.deepEqual(radios.map(radio => radio.checked), [false, true, false]);
  const selected = find(container, '[data-programme-choice="DC2"]'); assert.equal(container.ownerDocument.activeElement, selected);
  selected.checked = false; selected.dispatch("change"); assert.deepEqual(choices, []);
  selected.checked = true; selected.dispatch("change"); assert.deepEqual(choices, ["DC2"]);
  draw(); assert.equal(container.ownerDocument.activeElement, find(container, '[data-programme-choice="DC2"]'));
});

test("photo loading and errors retain all programme choices and a working retry action", () => {
  const container = domFixture(), retries = [], selections = [];
  render(container, {}, { loading: true, selectedId: "DC3", onSelect: id => selections.push(id) });
  assert.equal(container.querySelectorAll("[data-programme-choice]").length, 3);
  assert.equal(find(container, ".programme-browser-status").getAttribute("role"), "status");
  assert.equal(container.querySelectorAll(".programme-browser-retry").length, 0);
  render(container, {}, { error: "<script>Photos indisponibles</script>", selectedId: "DC3", onRetry: () => retries.push("retry"),
    onSelect: id => selections.push(id) });
  assert.equal(container.querySelectorAll("script").length, 0); assert.match(container.textContent, /<script>Photos indisponibles<\/script>/);
  const radios = container.querySelectorAll("[data-programme-choice]");
  assert.deepEqual(radios.map(radio => radio.checked), [false, false, true]); assert.ok(radios.every(radio => radio.disabled !== true));
  const retry = find(container, ".programme-browser-retry"); assert.equal(retry.type, "button"); retry.dispatch("click");
  assert.deepEqual(retries, ["retry"]);
  radios[0].checked = true; radios[0].dispatch("change"); assert.deepEqual(selections, ["DC1"]);
});

test("programme retries retain keyboard focus while loading, ignore duplicate clicks and restore a native choice on success", () => {
  for (const selectedId of ["DC2", null]) {
    const container = domFixture(), retries = [];
    const draw = options => render(container, {}, { selectedId, onRetry: () => retries.push("retry"), ...options });
    draw({ error: "Portraits indisponibles" });
    let retry = find(container, "[data-programme-retry]"); retry.focus(); retry.dispatch("click");
    assert.deepEqual(retries, ["retry"]);
    draw({ loading: true }); retry = find(container, "[data-programme-retry]");
    assert.equal(container.ownerDocument.activeElement, retry); assert.equal(retry.getAttribute("aria-disabled"), "true");
    assert.notEqual(retry.disabled, true, "A pending retry remains focusable");
    retry.dispatch("click"); assert.deepEqual(retries, ["retry"], "A loading retry cannot launch another request");
    draw({ error: "Portraits toujours indisponibles" }); retry = find(container, "[data-programme-retry]");
    assert.equal(container.ownerDocument.activeElement, retry); assert.equal(retry.getAttribute("aria-disabled"), "false");
    retry.dispatch("click"); assert.deepEqual(retries, ["retry", "retry"]);
    draw({ loading: true }); draw({});
    assert.equal(container.querySelectorAll("[data-programme-retry]").length, 0);
    assert.equal(container.ownerDocument.activeElement, find(container, `[data-programme-choice="${selectedId || "DC1"}"]`),
      "A completed retry returns focus to the selected programme, or the first choice when none is selected");
  }
});

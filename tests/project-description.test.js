"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { decodeEntities, htmlToText, extractDescription } = require("../project-description");

const prompt = "<p><i>Beschrijf de noden die in de sector worden vastgesteld, hoe dit probleem zal aangepakt worden. (max 15 lijnen) | Décrivez les besoins identifiés dans le secteur, la manière dont ce problème sera abordé. (max 15 lignes)</i></p>";
const template = content => "<h1>Documents clé pour les projets / Basis documenten voor projecten</h1><ul><li>De samenvatting van het project | Résumé du projet</li></ul><h1>Tabblad ‘omschrijving’</h1><h2><b>Samenvatting van het project | Résumé du projet</b></h2>" + content + "<h2>De doelgroep | La/les groupe(s) cible(s)</h2><p>Other section must not count.</p>";

test("HTML entities and text extraction preserve literal source text without running markup", () => {
  assert.equal(decodeEntities("BIM&nbsp;&amp; r&eacute;alit&eacute; &#xE9;tendue &#233; &Eacute; &unknown;"), "BIM & réalité étendue é É &unknown;");
  assert.equal(decodeEntities("&#x110000; &#xD800; &#0;"), "� � �");
  assert.equal(htmlToText('<p>Vision <b>par ordinateur</b></p><script>alert("private")</script><style>secret</style><p>&lt;source&gt;<br>XR</p>'), "Vision par ordinateur\n<source>\nXR");
});

test("the real summary section wins over introductory checklist text and excludes subsequent sections", () => {
  const narrative = "Le projet développe une solution BIM et une analyse par vision pour le contrôle des éléments de construction. ".repeat(3).trim();
  const result = extractDescription(template(`<div>${narrative}</div>`));
  assert.equal(result.text, narrative);
  assert.equal(result.status, "available");
  assert.equal(result.characterCount, Array.from(narrative).length);
  assert.equal(result.extraction, "summary-section");
  assert.ok(!result.text.includes("Other section"));
});

test("bilingual boilerplate and placeholder-only summaries are missing regardless of full template length", () => {
  const result = extractDescription(template(prompt + "<p>&lt;…&gt;</p>"));
  assert.equal(result.text, ""); assert.equal(result.characterCount, 0); assert.equal(result.status, "missing");
  assert.equal(result.extraction, "template-empty");
  assert.ok(result.warnings.includes("template-instructions-removed"));
});

test("bounded template prompts are removed while appended same-paragraph and encoded-bracket narratives survive", () => {
  const narrative = "DigiBuild verbindt ontwerpers, aannemers en producenten via gestandaardiseerde BIM-informatie. ".repeat(3).trim();
  const result = extractDescription(template(prompt.replace("</p>", `&lt;${narrative}&gt;</p>`)));
  assert.equal(result.text, narrative); assert.equal(result.status, "available");
});

test("links-only content is not counted as a description and is never followed", () => {
  const url = "https://example.invalid/" + "very-long-project-link/".repeat(20);
  const result = extractDescription(template(prompt + `<p>&lt;<a href="${url}">${url}</a>&gt;</p>`));
  assert.equal(result.status, "missing"); assert.equal(result.characterCount, 0);
  assert.ok(result.text.includes("https://example.invalid/")); assert.ok(result.warnings.includes("links-only"));
});

test("short descriptions use meaningful Unicode character counts and a configurable strict threshold", () => {
  const result = extractDescription(template("<p>Développer un outil BIM pour le contrôle.</p>"));
  assert.equal(result.status, "short"); assert.equal(result.characterCount, 41);
  assert.equal(extractDescription("<p>é</p>", { shortThreshold: 1 }).status, "available");
  assert.equal(extractDescription("<p>é</p>", { shortThreshold: 2 }).status, "short");
  assert.equal(extractDescription(null).status, "missing");
});

test("custom plain descriptions are retained while an unrecognized full template stays unavailable as narrative", () => {
  const narrative = "This custom project description discusses open BIM interoperability. ".repeat(4).trim();
  assert.equal(extractDescription(`<div>${narrative}</div>`).text, narrative);
  const templateOnly = extractDescription("<h1>Documents clé pour les projets</h1><p>Generic instructions and personnel checklist.</p>");
  assert.equal(templateOnly.status, "missing"); assert.equal(templateOnly.characterCount, 0);
  assert.ok(templateOnly.warnings.includes("summary-heading-missing"));
});

test("nested lower-level headings remain in the summary while the next peer heading ends it", () => {
  const result = extractDescription("<h2>Project summary</h2><p>First paragraph.</p><h3>Technical approach</h3><p>Second paragraph.</p><h2>Budget</h2><p>Do not include.</p>");
  assert.equal(result.text, "First paragraph. Technical approach Second paragraph.");
  assert.ok(!result.text.includes("Do not include"));
});

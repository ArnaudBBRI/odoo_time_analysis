"use strict";

// Offline text extraction only. Source HTML is never executed or rendered.
const ENTITY = Object.freeze({
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ensp: " ", emsp: " ", thinsp: " ",
  ndash: "–", mdash: "—", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", bull: "•", shy: "",
  eacute: "é", egrave: "è", ecirc: "ê", euml: "ë", agrave: "à", acirc: "â", auml: "ä", aring: "å", aelig: "æ",
  ccedil: "ç", icirc: "î", iuml: "ï", iacute: "í", igrave: "ì", ocirc: "ô", ouml: "ö", oacute: "ó", ograve: "ò",
  ugrave: "ù", ucirc: "û", uuml: "ü", uacute: "ú", yuml: "ÿ", oelig: "œ", szlig: "ß", euro: "€", copy: "©", reg: "®"
});

function decodeEntities(value) {
  return String(value || "").replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const point = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : "�";
    }
    const decoded = ENTITY[entity.toLowerCase()];
    if (decoded === undefined) return match;
    return /^[A-Z]/.test(entity) && /\p{L}/u.test(decoded) ? decoded.toUpperCase() : decoded;
  });
}

function htmlToText(value) {
  if (typeof value !== "string") return "";
  return decodeEntities(value
    .replace(/<!--[\s\S]*?(?:-->|$)/g, "")
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, "")
    .replace(/<\s*(?:br\b[^>]*|\/(?:p|div|li|tr|td|th|h[1-6]))\s*>/gi, "\n")
    .replace(/<\/?[a-z][^>]*>/gi, ""))
    .replace(/[\u200b-\u200d\ufeff\u00ad]/g, "")
    .replace(/[^\S\n]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function normalized(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function isSummaryHeading(text) {
  const name = normalized(text);
  return /^(?:(?:de )?samenvatting van het project(?: resume du projet)?|resume du projet(?: (?:de )?samenvatting van het project)?|project summary|summary of the project|project abstract|description du projet)$/.test(name);
}

function isTemplate(text) {
  const value = normalized(text);
  return /documents cle pour les projets|basis documenten voor projecten|tabblad omschrijving|gelieve in deze fase|risicobeheer gestion des risques/.test(value);
}

function cleanSummary(text) {
  const warnings = [];
  let cleaned = text;
  // These are the actual bilingual prompts, not project narratives. The user
  // may append text in the same paragraph, so remove only the bounded prompt.
  const prompts = [
    /Beschrijf\s+de\s+noden[\s\S]*?\(\s*max\.?\s*15\s*lijnen\s*\)/gi,
    /D[eé]crivez\s+les\s+besoins[\s\S]*?\(\s*max\.?\s*15\s*lignes\s*\)/gi
  ];
  for (const prompt of prompts) {
    cleaned = cleaned.replace(prompt, () => { warnings.push("template-instructions-removed"); return ""; });
  }
  cleaned = cleaned.replace(/<\s*(?:…|\.{2,})\s*>/g, "").replace(/^\s*[|]+\s*|\s*[|]+\s*$/g, "").trim();
  if (/^<[\s\S]+>$/.test(cleaned)) cleaned = cleaned.slice(1, -1).trim();
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  if (/^(?:[\s\p{P}\p{S}]*|tbd|todo|n\/?a|n\.?v\.?t\.?|a completer|à compléter|te vervolledigen|geen beschrijving|no description)$/iu.test(cleaned)) {
    cleaned = "";
  }
  return { text: cleaned, warnings: [...new Set(warnings)] };
}

function extractDescription(html, options = {}) {
  const shortThreshold = Number.isInteger(options.shortThreshold) && options.shortThreshold > 0 ? options.shortThreshold : 200;
  const raw = typeof html === "string" ? html : "";
  // Odoo's description version contains an introductory checklist as well as
  // the real summary heading. Only actual heading elements can select it.
  const headings = [...raw.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)]
    .map(match => ({ index: match.index, end: match.index + match[0].length, level: Number(match[1]), text: htmlToText(match[2]) }));
  const candidates = headings.filter(heading => isSummaryHeading(heading.text));
  const selected = candidates.find(heading => headings.some(prior => prior.index < heading.index &&
    prior.level < heading.level && /tabblad omschrijving|onglet description/.test(normalized(prior.text)))) || candidates[0];
  let section, extraction;
  if (selected) {
    const next = headings.find(heading => heading.index > selected.index && heading.level <= selected.level);
    section = htmlToText(raw.slice(selected.end, next?.index ?? raw.length));
    extraction = "summary-section";
  } else {
    section = htmlToText(raw);
    if (isTemplate(section)) return { text: "", characterCount: 0, wordCount: 0, status: "missing", extraction: "template-empty",
      sourceHeading: null, warnings: ["summary-heading-missing"] };
    extraction = "plain-description";
  }
  const cleaned = cleanSummary(section);
  // An external link is useful evidence, but not an actual description. Never
  // follow it or count a long URL as hundreds of narrative characters.
  const meaningful = cleaned.text.replace(/(?:https?:\/\/|www\.)[^\s<>]+/gi, " ")
    .replace(/[<>|]/g, " ").replace(/\s+/g, " ").trim();
  const characterCount = Array.from(meaningful).length;
  const wordCount = meaningful ? meaningful.split(/\s+/).length : 0;
  const warnings = [...cleaned.warnings];
  if (!characterCount && cleaned.text) warnings.push("links-only");
  return { text: cleaned.text, characterCount, wordCount,
    status: characterCount === 0 ? "missing" : characterCount < shortThreshold ? "short" : "available",
    extraction: !characterCount && isTemplate(htmlToText(raw)) ? "template-empty" : extraction,
    sourceHeading: selected?.text || null, warnings };
}

module.exports = { decodeEntities, htmlToText, extractDescription };

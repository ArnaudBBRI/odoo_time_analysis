(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DashboardI18n = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const messages = new Map(), numberFormats = new Map(), dateFormats = new Map();
  let currentLanguage = "fr", reverseTemplates = null;
  const normalize = value => value === "nl" ? "nl" : "fr";
  const placeholders = value => [...new Set(Array.from(value.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g), match => match[1]))].sort();
  const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const render = (template, params) => template.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g,
    (match, name) => Object.hasOwn(params, name) ? String(params[name] ?? "") : match);
  function register(fragment) {
    if (!fragment || typeof fragment !== "object" || Array.isArray(fragment)) throw new TypeError("A translation catalogue must be an object");
    const entries = Object.entries(fragment);
    const prepared = new Map();
    for (const [key, entry] of entries) {
      if (!key || !entry || typeof entry.fr !== "string" || typeof entry.nl !== "string") throw new TypeError(`Missing FR/NL translation: ${key}`);
      if (JSON.stringify(placeholders(entry.fr)) !== JSON.stringify(placeholders(entry.nl))) throw new TypeError(`Translation placeholders differ: ${key}`);
      if (Object.hasOwn(entry, "source") && (typeof entry.source !== "string" || !entry.source.trim())) throw new TypeError(`Invalid source translation: ${key}`);
      if (Object.hasOwn(entry, "aliases") && (!Array.isArray(entry.aliases) || entry.aliases.some(alias => typeof alias !== "string" || !alias.trim()))) {
        throw new TypeError(`Invalid translation aliases: ${key}`);
      }
      for (const alias of [entry.source, ...(entry.aliases || [])].filter(value => value !== undefined)) {
        if (JSON.stringify(placeholders(alias)) !== JSON.stringify(placeholders(entry.fr))) throw new TypeError(`Source translation placeholders differ: ${key}`);
      }
      const existing = messages.get(key);
      if (existing && (existing.fr !== entry.fr || existing.nl !== entry.nl)) throw new TypeError(`Conflicting translation: ${key}`);
      if (existing?.source !== undefined && entry.source !== undefined && existing.source !== entry.source) throw new TypeError(`Conflicting translation source: ${key}`);
      const source = entry.source ?? existing?.source;
      const aliases = [...new Set([...(existing?.aliases || []), ...(entry.aliases || [])])];
      prepared.set(key, Object.freeze({ fr: entry.fr, nl: entry.nl,
        ...(source !== undefined ? { source } : {}), ...(aliases.length ? { aliases: Object.freeze(aliases) } : {}) }));
    }
    // An English source alias cannot silently acquire a second meaning.
    const sourceOwners = new Map();
    for (const [key, entry] of new Map([...messages, ...prepared])) for (const alias of [entry.source, ...(entry.aliases || [])].filter(value => value !== undefined)) {
      const owner = sourceOwners.get(alias);
      if (owner && (owner.fr !== entry.fr || owner.nl !== entry.nl)) throw new TypeError(`Conflicting translation alias: ${key}`);
      sourceOwners.set(alias, entry);
    }
    for (const [key, entry] of prepared) messages.set(key, entry);
    reverseTemplates = null;
    return api;
  }
  function t(key, params = {}, requestedLanguage = currentLanguage) {
    const entry = messages.get(key);
    return entry ? render(entry[normalize(requestedLanguage)], params && typeof params === "object" ? params : {}) : String(key);
  }
  function setLanguage(value) {
    const next = normalize(value), changed = next !== currentLanguage;
    currentLanguage = next;
    if (changed && typeof root.dispatchEvent === "function" && typeof root.CustomEvent === "function") {
      root.dispatchEvent(new root.CustomEvent("dashboard:languagechange", { detail: { language: next, locale: locale() } }));
    }
    return next;
  }
  function locale(requestedLanguage = currentLanguage) { return normalize(requestedLanguage) === "nl" ? "nl-BE" : "fr-BE"; }
  function formatNumber(value, options = {}, requestedLanguage = currentLanguage) {
    if (typeof value !== "number" || !Number.isFinite(value)) return t("common.unavailable", {}, requestedLanguage);
    const key = `${locale(requestedLanguage)}:${JSON.stringify(options)}`;
    if (!numberFormats.has(key)) numberFormats.set(key, new Intl.NumberFormat(locale(requestedLanguage), options));
    return numberFormats.get(key).format(value);
  }
  function formatDate(value, options = {}, requestedLanguage = currentLanguage) {
    if (value == null || typeof value === "boolean") return t("common.unavailable", {}, requestedLanguage);
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return t("common.unavailable", {}, requestedLanguage);
    const settings = { timeZone: "UTC", ...options }, key = `${locale(requestedLanguage)}:${JSON.stringify(settings)}`;
    if (!dateFormats.has(key)) dateFormats.set(key, new Intl.DateTimeFormat(locale(requestedLanguage), settings));
    return dateFormats.get(key).format(date);
  }
  function formatHours(value, options = {}, requestedLanguage = currentLanguage) {
    return typeof value !== "number" || !Number.isFinite(value) ? t("common.unavailable", {}, requestedLanguage)
      : `${formatNumber(value, { maximumFractionDigits: 2, ...options }, requestedLanguage)} h`;
  }
  function displayName(record) {
    const original = typeof record?.name === "string" ? record.name : "";
    const positiveId = value => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
    if (record?.nameMessageKey === "identity.employee" && positiveId(record.employeeId)) return t("identity.employee", { id: record.employeeId });
    if (record?.nameMessageKey === "identity.employeeUnknown") return t("identity.employeeUnknown");
    if (record?.nameMessageKey === "identity.project" && positiveId(record.id)) return t("identity.project", { id: record.id });
    return original;
  }
  // Resolve only application-authored messages at explicit warning/error seams.
  // Source project/person/bill labels must never be passed through this helper.
  function message(text, requestedLanguage = currentLanguage) {
    if (typeof text !== "string") return text;
    if (!reverseTemplates) {
      reverseTemplates = [];
      for (const [key, entry] of messages) for (const template of new Set([entry.fr, entry.nl, entry.source, ...(entry.aliases || [])].filter(value => value !== undefined))) {
        const parts = [], names = [], indices = new Map();
        let position = 0, fixedLength = 0;
        for (const match of template.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)) {
          const fixed = template.slice(position, match.index); parts.push(escapePattern(fixed)); fixedLength += fixed.length;
          if (indices.has(match[1])) parts.push(`\\${indices.get(match[1])}`);
          else { names.push(match[1]); indices.set(match[1], names.length); parts.push("([\\s\\S]*?)"); }
          position = match.index + match[0].length;
        }
        const fixed = template.slice(position); parts.push(escapePattern(fixed)); fixedLength += fixed.length;
        // A capture-only template could accidentally recognize arbitrary source text.
        if (fixedLength > 0) reverseTemplates.push({ key, names, fixedLength, pattern: new RegExp(`^${parts.join("")}$`) });
      }
      reverseTemplates.sort((a, b) => b.fixedLength - a.fixedLength);
    }
    for (const entry of reverseTemplates) {
      const match = entry.pattern.exec(text);
      if (match) return t(entry.key, Object.fromEntries(entry.names.map((name, index) => [name, match[index + 1]])), requestedLanguage);
    }
    return text;
  }
  const api = { t, register, locale, language: () => currentLanguage, setLanguage, formatNumber, formatDate, formatHours, displayName, message,
    catalogue: () => Object.fromEntries([...messages].map(([key, entry]) => [key, { ...entry,
      ...(entry.aliases ? { aliases: [...entry.aliases] } : {}) }])) };
  register({ "common.unavailable": { fr: "Indisponible", nl: "Niet beschikbaar" } });
  return api;
});

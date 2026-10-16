(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.DashboardLanguage = factory(root, root.DashboardI18n);
})(typeof globalThis !== "undefined" ? globalThis : this, function (root, I18n) {
  "use strict";
  let revision = 0, initialized = false, saveChain = Promise.resolve();
  const attributes = ["aria-label", "title", "placeholder", "data-help"];
  function applyStatic(document = root.document) {
    if (!document) return;
    if (document.documentElement) document.documentElement.lang = I18n.language();
    document.querySelectorAll?.("[data-i18n]").forEach(element => { element.textContent = I18n.t(element.getAttribute("data-i18n")); });
    for (const attribute of attributes) document.querySelectorAll?.(`[data-i18n-${attribute}]`).forEach(element => {
      element.setAttribute(attribute, I18n.t(element.getAttribute(`data-i18n-${attribute}`)));
    });
    const select = document.getElementById?.("languageSelect");
    if (select) select.value = I18n.language();
  }
  function notifyStatus(key, warning = false) {
    const status = root.document?.getElementById("languageStatus");
    if (status) { status.textContent = key ? I18n.t(key) : ""; status.dataset.state = warning ? "warning" : ""; }
  }
  async function select(language) {
    if (language !== "fr" && language !== "nl") return false;
    const own = ++revision;
    I18n.setLanguage(language); applyStatic(); notifyStatus("shell.language.saving");
    const save = async () => {
      try {
        const response = await root.fetch("/api/preferences/language", { method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language }),
          ...(root.AbortSignal?.timeout ? { signal: root.AbortSignal.timeout(4000) } : {}) });
        const result = await response.json();
        if (!response.ok || result.ok !== true || result.language !== language) throw new Error("Preference not saved");
        if (revision === own) notifyStatus("shell.language.saved");
        return true;
      } catch (_) { if (revision === own) notifyStatus("shell.language.notSaved", true); return false; }
    };
    const result = saveChain.then(save, save); saveChain = result;
    return result;
  }
  function initialize() {
    applyStatic(); if (initialized) return; initialized = true;
    root.document?.getElementById("languageSelect")?.addEventListener("change", event => { select(event.target.value); });
    root.addEventListener?.("dashboard:languagechange", () => applyStatic());
  }
  initialize();
  const ready = (async () => {
    const own = revision;
    try {
      const response = await root.fetch("/api/preferences/language", { credentials: "same-origin",
        ...(root.AbortSignal?.timeout ? { signal: root.AbortSignal.timeout(4000) } : {}) });
      const result = await response.json();
      if (own === revision && response.ok && result.ok === true) I18n.setLanguage(result.language);
    } catch (_) { /* A failed preference read retains the French default. */ }
    initialize(); return I18n.language();
  })();
  return { ready, select, applyStatic, initialize };
});

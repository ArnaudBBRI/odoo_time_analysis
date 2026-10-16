(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./project-card") : root.ProjectCard, typeof module === "object" && module.exports ? require("./i18n-core-messages") : root.DashboardI18n);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ProgrammeBrowser = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (ProjectCard, I18n) {
  "use strict";
  const t = I18n.t;

  const PROGRAMMES = Object.freeze([
    ["DC1", "Backbone", "To Structure", "Pauline Dewez"],
    ["DC2", "Insight", "To Act", "Timothée Lonfils"],
    ["DC3", "Manufacturing", "To Make", "François Denis"]
  ].map(([code, subtitle, catchphrase, name]) => Object.freeze({ id: code, code, name: code,
    subtitle, catchphrase, manager: Object.freeze({ id: null, name, photoDataUrl: null }) })));
  const CATCHPHRASES = Object.freeze({ DC1: "programme.structure", DC2: "programme.act", DC3: "programme.make" });

  function safePhoto(value) {
    return typeof value === "string" && value.length <= 400000 &&
      /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : null;
  }

  function normalizeCatalogue(input) {
    const rows = Array.isArray(input) ? input : input?.programmes;
    if (!Array.isArray(rows) || rows.length !== PROGRAMMES.length ||
      new Set(rows.map(row => row?.id)).size !== PROGRAMMES.length ||
      rows.some(row => !PROGRAMMES.some(programme => programme.id === row?.id))) {
      throw new Error(t("programme.catalogueMismatch"));
    }
    return PROGRAMMES.map(programme => {
      const source = rows.find(row => row.id === programme.id)?.manager;
      const identified = source?.name === programme.manager.name && Number.isSafeInteger(source.id) && source.id > 0;
      return { ...programme, manager: { ...programme.manager,
        id: identified ? source.id : null, photoDataUrl: identified ? safePhoto(source.photoDataUrl) : null } };
    });
  }

  function render(container, data = {}, options = {}) {
    const doc = container.ownerDocument;
    const node = (tag, className, text) => {
      const element = doc.createElement(tag); element.className = className;
      if (text != null) element.textContent = text;
      return element;
    };
    const programmes = data.programmes === undefined ? PROGRAMMES : normalizeCatalogue(data);
    const oldFocus = container.contains(doc.activeElement) ? doc.activeElement?.getAttribute("data-programme-choice") : null;
    const retryFocused = container.contains(doc.activeElement) && doc.activeElement?.getAttribute("data-programme-retry") === "";
    const keepRetry = options.loading && container.querySelectorAll("[data-programme-retry]").length > 0;
    let retry;
    const section = node("section", "programme-browser");
    section.append(node("h2", "programme-browser-heading", t("programme.heading")));
    if (options.loading || options.error) {
      const status = node("div", "programme-browser-status"); status.setAttribute("data-programme-status", "");
      status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
      status.append(node("span", "programme-browser-message", options.error ? I18n.message(options.error) : t("programme.loadingPortraits")));
      if (options.error || keepRetry) {
        retry = node("button", "programme-browser-retry", t("common.retry")); retry.type = "button";
        retry.setAttribute("data-programme-retry", "");
        retry.setAttribute("aria-disabled", options.loading ? "true" : "false");
        retry.addEventListener("click", () => { if (!options.loading) options.onRetry?.(); }); status.append(retry);
      }
      section.append(status);
    }
    const grid = node("fieldset", "programme-browser-grid");
    grid.append(node("legend", "project-card-sr-only", t("programme.choose")));
    const choices = new Map();
    for (const programme of programmes) {
      const catchphrase = t(CATCHPHRASES[programme.code]);
      const label = node("label", "programme-browser-tile");
      const radio = node("input", "programme-browser-radio"); radio.type = "radio"; radio.name = "programme-choice";
      radio.value = programme.id; radio.checked = options.selectedId === programme.id;
      radio.setAttribute("data-programme-choice", programme.id);
      radio.setAttribute("aria-label", `${programme.code} · ${programme.subtitle} · ${catchphrase} · ${programme.manager.name}`);
      radio.addEventListener("change", () => { if (radio.checked) options.onSelect?.(programme.id); });
      const avatar = node("span", "programme-browser-avatar"); avatar.title = t("common.managerName", { p0: programme.manager.name });
      const initials = programme.manager.name.split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join("").toLocaleUpperCase("fr");
      avatar.append(node("span", "programme-browser-initials", initials));
      const photoSource = safePhoto(programme.manager.photoDataUrl);
      if (photoSource) {
        const photo = node("img", "programme-browser-photo"); photo.src = photoSource; photo.alt = "";
        photo.width = 64; photo.height = 64; photo.addEventListener("error", () => { photo.hidden = true; }); avatar.append(photo);
      }
      ProjectCard.mount(label, radio, programme, [avatar, ProjectCard.createTitle(doc, programme, "programme-browser-name")], {
        badge: catchphrase, fullName: programme.subtitle,
        tooltip: t("programme.tooltip", { p0: programme.code, p1: programme.subtitle, p2: catchphrase, p3: programme.manager.name }),
        description: t("programme.description", { p0: programme.subtitle, p1: catchphrase, p2: programme.manager.name })
      });
      grid.append(label); choices.set(programme.id, radio);
    }
    section.append(grid); container.replaceChildren(section);
    if (retryFocused) (retry || choices.get(options.selectedId) || choices.values().next().value)?.focus();
    else choices.get(options.focusId || oldFocus)?.focus();
    return section;
  }

  return { PROGRAMMES, normalizeCatalogue, render };
});

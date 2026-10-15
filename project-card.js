(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ProjectCard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const moneyFormat = new Intl.NumberFormat("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let descriptionId = 0;

  function formatDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-")) return "Indisponible";
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "Indisponible";
    return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
  }

  function formatBudget(budget) {
    if (typeof budget?.amount !== "number" || !Number.isFinite(budget.amount)) return "Indisponible";
    const knownCurrency = Number.isSafeInteger(budget.currencyId) && budget.currencyId > 0 &&
      typeof budget.currency === "string" && budget.currency.trim();
    return `${moneyFormat.format(budget.amount)} ${knownCurrency ? budget.currency.trim() : "· devise indisponible"}`;
  }

  function nameParts(project) {
    const sourceName = typeof project?.name === "string" && project.name.trim() ? project.name : `Projet ${project?.id ?? ""}`.trim();
    const displayName = sourceName.trim();
    const tokens = Array.from(displayName.matchAll(/\[([^\[\]\r\n]+)\]/g));
    const numberToken = tokens.find(token => /^\d{5,}$/.test(token[1].trim()));
    const shortToken = tokens.find(token => token[1].trim() && !/^\d+$/.test(token[1].trim()));
    const prefix = numberToken ? null : displayName.match(/^\d{5,}(?=\s|[·:|–—-]|\[|$)/);
    const number = numberToken ? numberToken[1].trim() : prefix?.[0] || "";
    let remainder = displayName;
    if (numberToken) remainder = remainder.replace(numberToken[0], "");
    else if (prefix) remainder = remainder.slice(prefix[0].length);
    if (shortToken) remainder = remainder.replace(shortToken[0], "");
    remainder = remainder.replace(/^\s*[·:|–—-]+\s*/, "").replace(/\s+/g, " ").trim();
    const shortName = shortToken ? shortToken[1].trim() : remainder || "Projet";
    return { sourceName, shortName, number, fullName: shortToken && remainder !== shortName ? remainder : "" };
  }

  function createTitle(doc, project, className) {
    const parts = nameParts(project);
    const title = doc.createElement("span"); title.className = `project-card-name ${className || ""}`.trim();
    title.title = parts.sourceName;
    const shortName = doc.createElement("strong"); shortName.className = "project-card-title";
    shortName.textContent = parts.shortName; title.append(shortName);
    return title;
  }

  function mount(label, input, project, frontChildren, presentation = {}) {
    const doc = label.ownerDocument;
    const node = (tag, className, text) => {
      const element = doc.createElement(tag);
      element.className = className;
      if (text != null) element.textContent = text;
      return element;
    };
    label.classList.add("project-card");
    const inner = node("span", "project-card-inner");
    const front = node("span", "project-card-front"); front.setAttribute("aria-hidden", "true");
    front.append(...frontChildren);
    const back = node("span", "project-card-back"); back.setAttribute("aria-hidden", "true");
    const parts = nameParts(project);
    const ambient = node("span", "project-card-ambient");
    for (const color of ["teal", "blue", "yellow"]) ambient.append(node("span", `project-card-orb project-card-orb-${color}`));
    const content = node("span", "project-card-back-content");
    const identity = node("span", "project-card-identity");
    const shortName = node("strong", "project-card-short-name", parts.shortName);
    shortName.title = parts.sourceName;
    const avatar = node("span", "project-card-mini-avatar");
    avatar.title = project.manager?.name ? `Responsable : ${project.manager.name}` : "Responsable indisponible";
    const initials = String(project.manager?.name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => Array.from(part)[0]).join("").toLocaleUpperCase("fr") || "?";
    avatar.append(node("span", "project-card-mini-initials", initials));
    const photoSource = project.manager?.photoDataUrl;
    if (typeof photoSource === "string" && photoSource.length <= 400000 &&
      /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photoSource)) {
      const photo = node("img", "project-card-mini-photo"); photo.src = photoSource; photo.alt = "";
      photo.width = 24; photo.height = 24;
      photo.addEventListener("error", () => { photo.hidden = true; }); avatar.append(photo);
    }
    const number = node("span", "project-card-back-number", typeof presentation.badge === "string" ? presentation.badge : parts.number);
    identity.append(avatar, number);
    const manager = node("span", "project-card-manager-name", project.manager?.name || "Responsable indisponible");
    const fullName = node("em", "project-card-back-full-name", typeof presentation.fullName === "string" ? presentation.fullName : parts.fullName);
    content.append(identity, shortName, manager, fullName); back.append(ambient, content);
    const fields = [
      ["Début", formatDate(project.startDate), "project-card-date"],
      ["Fin", formatDate(project.endDate), "project-card-date"],
      ["Budget total", formatBudget(project.totalBudget), "project-card-budget"]
    ];
    label.title = typeof presentation.tooltip === "string" ? presentation.tooltip :
      `${parts.sourceName}\n${fields.map(([name, value]) => `${name} : ${value}`).join("\n")}`;
    const description = node("span", "project-card-sr-only",
      typeof presentation.description === "string" ? presentation.description :
        `${project.manager?.name ? `Responsable : ${project.manager.name}. ` : "Responsable indisponible. "}${fields.map(([name, value]) => `${name} : ${value}.`).join(" ")}`);
    description.id = `project-card-description-${++descriptionId}`;
    input.setAttribute("aria-describedby", description.id);
    inner.append(front, back); label.append(input, inner, description);
    return label;
  }

  return { mount, formatDate, formatBudget, nameParts, createTitle };
});

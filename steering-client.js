(function () {
"use strict";
const S = typeof window !== "undefined" ? window.SteeringMetrics : require("./steering");
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const format = (value, unit = "h") => typeof value !== "number" || !Number.isFinite(value) ? "Indisponible" : `${value.toLocaleString("fr-BE", { maximumFractionDigits: 1 })} ${unit}`;
const names = { actual: "Réalisé cumulé", convention: "Convention", planned: "Planning disponible", remainingConvention: "Reste convention", remainingPlan: "Solde du planning", elapsedPlan: "Planning écoulé", futurePlan: "Planning futur", consumption: "Consommation convention" };
const quality = value => ({ available: "Disponible", unavailable: "Indisponible", partial: "Partiel", reconciled: "Réconcilié", "not-reconciled": "Non réconcilié", "not-checkable": "Non vérifiable" }[value] || value);
function filterProjects(projects, filters) {
  return projects.filter(project => {
    const assignment = project.assignment;
    if (filters.programme && (filters.programme === "__unassigned" ? assignment.status !== "unassigned" : filters.programme === "__multiple" ? assignment.status !== "multiple" : assignment.programmeId !== filters.programme)) return false;
    if (filters.owner && String(project.owner.id ?? "unknown") !== filters.owner) return false;
    if (filters.stage && project.stage !== filters.stage) return false;
    if (filters.leader && project.isLeader !== true) return false;
    if (filters.period) {
      const start = S.timestamp(project.start), end = S.timestamp(project.end, true), year = Number(filters.period);
      if ((start !== null && start >= Date.UTC(year + 1, 0, 1)) || (end !== null && end < Date.UTC(year, 0, 1))) return false;
    }
    return true;
  });
}
function cards(summary, keys = ["actual", "convention", "remainingConvention", "consumption"]) {
  return `<div class="pilotage-grid">${Object.entries(summary.metrics).filter(([key]) => keys.includes(key)).map(([key, metric]) => `<button class="pilotage-card" type="button" data-contributors="${metric.projectIds.join(",")}"><span>${names[key]}</span><strong>${format(metric.value, key === "consumption" ? "%" : "h")}</strong><small>${metric.covered}/${metric.total} projets couverts${metric.covered < metric.total ? " · total partiel" : ""}</small><small>${escape(metric.basis)}</small></button>`).join("")}</div>`;
}
function projectTable(projects, programmes) {
  return `<div class="pilotage-table-wrap"><table class="pilotage-table"><thead><tr><th>Projet</th><th>Programme / responsable</th><th>Réalisé</th><th>Convention</th><th>Reste convention</th><th>Échéance / attention</th></tr></thead><tbody>${projects.map(project => `<tr><td><button class="pilotage-link" type="button" data-project="${project.id}">${escape(project.name)}</button><br><small>${escape(project.stage)}${project.active ? "" : " · Archivé"}${project.isLeader ? " · Mon projet" : ""}</small></td><td>${escape(programmes.find(p => p.id === project.assignment.programmeId)?.name || (project.assignment.status === "multiple" ? "Affectations multiples" : "Non affecté"))}<br>${escape(project.owner.name)}</td><td>${format(project.hours.actual)}</td><td>${format(project.hours.convention)}</td><td>${format(project.hours.remainingConvention)}</td><td>${escape(project.end || "Date indisponible")}<br>${project.warnings.length} points à examiner</td></tr>`).join("")}</tbody></table></div>`;
}
function monetaryTable(budgets, aggregate = false) {
  if (!budgets.length) return `<p class="pilotage-empty">Aucun budget disponible dans ce périmètre.</p>`;
  return `<p class="pilotage-note">Convention et allocation annuelle restent distinctes. Commandé peut inclure consommé : les deux montants ne s’additionnent pas. Aucune conversion des heures en euros.</p><div class="pilotage-table-wrap"><table class="pilotage-table"><thead><tr><th>Type / période / devise</th><th>Budgeté</th><th>En approbation</th><th>Commandé</th><th>Consommé</th><th>Solde</th><th>Fiabilité</th></tr></thead><tbody>${budgets.map(budget => `<tr><td>${budget.type === "annual" ? "Annuel · dépenses 6xxx" : "Convention"}<br>${escape(budget.start || "?")} → ${escape(budget.end || "?")}<br>${escape(budget.currency || "Devise indisponible")}</td>${["budgeted", "approval", "committed", "consumed", "balance"].map(key => `<td>${format(budget.totals[key], escape(budget.currency || ""))}</td>`).join("")}<td>${aggregate ? `<button class="pilotage-link" type="button" data-contributors="${budget.projectIds.join(",")}">${budget.covered}/${budget.total} budgets réconciliés</button><br>${budget.excludedProjectIds.length} projets exclus` : `${escape(quality(budget.quality))}<br>Écart contrôle : ${format(budget.gap, escape(budget.currency || ""))}`}</td></tr>`).join("")}</tbody></table></div>`;
}
function warnings(projects) {
  const entries = projects.flatMap(project => project.warnings.map(warning => ({ project, warning })));
  return entries.length ? entries.map(({ project, warning }) => `<div class="pilotage-warning"><button class="pilotage-link" type="button" data-project="${project.id}">${escape(project.name)}</button> · <strong>${escape(warning.title)}</strong><br>Valeur : ${escape(warning.value ?? "Indisponible")} · Base : ${escape(warning.basis)}<br><small>${escape(warning.limitation)}</small></div>`).join("") : `<p>Aucun point d’attention calculable. Cela ne confirme pas l’absence de risque.</p>`;
}
function deadlines(projects) {
  const now = Date.now();
  const entries = projects.flatMap(project => [
    { project, name: "Fin du projet", date: project.end },
    ...project.milestones.filter(m => m.reached !== true).map(m => ({ project, name: m.name, date: m.deadline }))
  ]).filter(entry => S.timestamp(entry.date, true) !== null && S.timestamp(entry.date, true) >= now).sort((a, b) => S.timestamp(a.date) - S.timestamp(b.date)).slice(0, 10);
  return `<h3>Prochaines échéances connues</h3>${entries.length ? entries.map(entry => `<p><button type="button" class="pilotage-link" data-project="${entry.project.id}">${escape(entry.project.name)}</button> · ${escape(entry.name)} · ${escape(entry.date)}</p>`).join("") : "<p>Aucune échéance future connue dans les sources accessibles.</p>"}<p class="pilotage-note">Les dix premières dates connues, sans seuil de risque. Les dates manquantes restent à vérifier.</p>`;
}
function monthlyChart(rows) {
  if (!rows.length) return `<p>Aucune série d’imputations visibles disponible.</p>`;
  const max = Math.max(1, ...rows.map(row => Math.abs(row.hours))), count = rows.length;
  return `<svg class="pilotage-spark" viewBox="0 0 700 180" role="img" aria-label="Heures mensuelles visibles, couverture potentiellement partielle"><line x1="35" x2="690" y1="90" y2="90" stroke="#ccdce5"/>${rows.map((row, index) => { const x = 40 + index * 640 / count, h = Math.abs(row.hours) / max * 60; return `<rect x="${x}" y="${row.hours < 0 ? 90 : 90 - h}" width="${Math.max(2, 550 / count)}" height="${h}" fill="${row.hours < 0 ? "#647887" : "#16899b"}"><title>${escape(row.month)} : ${format(row.hours)}</title></rect>${index % Math.max(1, Math.ceil(count / 6)) === 0 ? `<text x="${x}" y="168">${escape(row.month)}</text>` : ""}`; }).join("")}</svg><p class="pilotage-note">Série des lignes visibles uniquement ; aucune continuité historique entre chargements. Les corrections négatives sont conservées.</p>`;
}
function detailBody(project, tab) {
  const d = project.diagnostic, h = project.hours;
  if (tab === "summary") return `<div class="pilotage-grid">${["actual", "convention", "remainingConvention", "futurePlan"].map(key => `<div class="pilotage-card"><span>${names[key]}</span><strong>${format(h[key])}</strong></div>`).join("")}</div><p>Consommation convention : ${format(h.consumption, "%")} · Durée écoulée : ${format(h.scheduleElapsedPercent, "%")} · Écart de rythme : ${format(h.paceGap, "points")}</p><p class="pilotage-note">Comparaison linéaire de ressources ; elle ne mesure pas la réalisation des livrables.</p><h3>Jalons</h3>${project.milestones.length ? project.milestones.map(m => `<p>${escape(m.name)} · ${escape(m.deadline || "Date indisponible")} · ${m.reached === null ? "Statut indisponible" : m.reached ? "Atteint" : "Non atteint"}</p>`).join("") : "<p>Jalons indisponibles ou absents de la source accessible.</p>"}<h3>Trajets d’impact</h3>${project.impact.map(row => `<p>${escape(row.name)} : ${format(row.percent, "%")} (coefficient ${escape(row.coefficient ?? "?")})</p>`).join("") || "<p>Indisponible</p>"}<p>Part non affectée : ${format(project.impactTotal === null ? null : Math.max(0, 100 - project.impactTotal), "%")}. Axe distinct des programmes ; aucune ventilation automatique des heures.</p>${warnings([project])}`;
  if (tab === "resources") return `<p>Planning écoulé : ${format(h.elapsedPlan)} · Planning futur : ${format(h.futurePlan)} · Solde planning : ${format(h.remainingPlan)}</p><p>Écart planning futur / reste convention : ${format(h.remainingPlanGap)} · Convention théorique à date : ${format(h.theoreticalConventionToDate)}</p><p>Horizon : ${escape(h.horizonStart || "?")} → ${escape(h.horizonEnd || "?")} · Couvre la fin du projet : ${h.horizonCoversEnd === null ? "Indisponible" : h.horizonCoversEnd ? "Oui" : "Non"}</p><p>Réalisé visible dans la fenêtre du planning : ${format(d.actualInPlanningWindow)} · Écart au planning écoulé : ${format(d.elapsedPlanDeviation)}</p><p class="pilotage-note">${escape(d.comparisonBasis)} Les périodes de planning sont réparties selon leur durée calendaire ; aucune capacité disponible n’est déduite.</p>${monthlyChart(d.monthly)}<h3>Équipe et rôles</h3><p>Progress : ${escape(quality(d.progressStatus))}. Les heures par personne ne sont affichées qu’après réconciliation du total projet.</p><div class="pilotage-table-wrap"><table class="pilotage-table"><thead><tr><th>Personne / ressource</th><th>Rôles</th><th>Convention</th><th>Planning</th><th>Réalisé Progress</th></tr></thead><tbody>${project.people.map(p => `<tr><td>${escape(p.name)}${p.collective ? " · ressource collective" : ""}</td><td>${escape(p.roles.join(", ") || "Indisponible")}</td><td>${format(p.convention)}</td><td>${format(p.planned)}</td><td>${format(p.actual)}</td></tr>`).join("")}</tbody></table></div><h3>Écarts de population</h3>${project.population ? Object.entries(project.population).map(([key, values]) => `<p>${({ staffedWithoutActual: "Convention sans imputation", planningWithoutActual: "Planning sans imputation", actualWithoutStaffing: "Imputation sans convention", actualWithoutPlanning: "Imputation sans planning" })[key]} : ${escape(values.map(key => project.people.find(p => p.key === key)?.name || key).join(", ") || "Aucun dans la population réconciliée")}</p>`).join("") : "<p>Indisponibles : couverture des populations non confirmée.</p>"}<h3>Work packages</h3>${project.workPackages.status === "available" ? `<div class="pilotage-table-wrap"><table class="pilotage-table"><thead><tr><th>WP</th><th>Période</th><th>Convention</th><th>Réalisé</th><th>Attendu à date</th><th>Écart</th></tr></thead><tbody>${project.workPackages.rows.map(wp => `<tr><td>WP ${wp.id}</td><td>${escape(wp.start)} → ${escape(wp.end)}</td><td>${format(wp.convention)}</td><td>${format(wp.actual)}</td><td>${format(wp.expectedToDate)}</td><td>${format(wp.deviation)}</td></tr>`).join("")}</tbody></table></div><p class="pilotage-note">Attendu à date = convention du WP × fraction de sa période écoulée. Tolérance des réconciliations : 0,05 h.</p>` : `<p>WP drill-down indisponible : ${escape(project.workPackages.reason)}</p>`}`;
  if (tab === "budgets") return monetaryTable(project.budgets) + project.budgets.map(budget => `<h3>${budget.type === "annual" ? "Allocation annuelle" : "Convention"} · ${escape(budget.start || "?")}</h3><p class="pilotage-note">${escape(budget.limitation)}</p><p>Budget parent : ${format(budget.parentTotal, escape(budget.currency || ""))} · Contrat : ${format(budget.contractTotal, escape(budget.currency || ""))}</p>${budget.type === "annual" ? `<p>Contrôle des comptes 60/61/63/64/65 : ${escape(quality(budget.controlledStatus))}</p>${budget.controlled.map(row => `<p>${row.prefix} : détail ${format(row.amount, escape(budget.currency || ""))} · parent ${format(row.parentAmount, escape(budget.currency || ""))} · écart ${format(row.gap, escape(budget.currency || ""))}</p>`).join("")}` : ""}<div class="pilotage-table-wrap"><table class="pilotage-table"><thead><tr><th>Rubrique / compte</th><th>Budgeté</th><th>En approbation</th><th>Commandé</th><th>Consommé</th><th>Solde</th></tr></thead><tbody>${budget.categories.map(row => `<tr><td>${escape(row.category)}</td>${["budgeted", "approval", "committed", "consumed", "balance"].map(key => `<td>${format(row[key], escape(budget.currency || ""))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`).join("");
  return `<p>Source chargé le ${escape(project.asOf)}. L’historique antérieur au 01/01/2026 n’est pas exclu : sa fiabilité reste à confirmer.</p><p>Réalisé projet : ${format(h.actual)} · Imputations visibles : ${format(d.visibleActual)} · Couverture : ${format(d.visibleCoverage, "%")} · Écart visible/projet : ${format(d.visibleGap)}</p><p>Progress : ${format(d.progressActual)} · Écart Progress/projet : ${format(d.progressGap)} · ${escape(quality(d.progressStatus))}</p><p>Écart convention Progress / staffing : ${format(d.progressConventionGap)} · Écart planning Progress / slots : ${format(d.progressPlanningGap)}</p><div class="pilotage-source-list">${Object.entries(project.sources).map(([key, source]) => `<p>${escape(names[key] || key)} : <code>${escape(source)}</code></p>`).join("")}<p>Project leader : <code>${escape(project.leaderSource)}</code></p>${project.detailSources.map(source => `<p><code>${escape(source.source)}</code> : ${escape(quality(source.status))}${source.reason ? ` · ${escape(source.reason)}` : ""}</p>`).join("")}</div><p class="pilotage-note">Odoo applique les permissions du compte connecté. Les projets et lignes masqués ne peuvent pas être comptés. Une source disponible n’est pas une preuve de complétude métier.</p>`;
}
if (typeof module !== "undefined" && module.exports) { module.exports = { filterProjects, cards, projectTable, monetaryTable, detailBody, escape, format }; return; }
const $ = id => document.getElementById(id);
const pageTitle = document.querySelector("header h1"), pageSubtitle = document.querySelector("header .subtitle");
const originalTitle = pageTitle?.textContent, originalSubtitle = pageSubtitle?.textContent;
const state = { view: "time", portfolio: null, metadata: null, contributorIds: null, detail: null, tab: "summary", generation: 0, detailGeneration: 0, loading: false };
async function post(route, body = {}) {
  const response = await fetch(`/api/odoo/pilotage/${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (response.status === 401) { location.assign("/login"); throw new Error("Session expirée"); }
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "Lecture indisponible");
  return result;
}
function options(element, entries) {
  const old = element.value;
  element.innerHTML = `<option value="">Tous</option>${entries.map(([value, text]) => `<option value="${escape(value)}">${escape(text)}</option>`).join("")}`;
  if (entries.some(([value]) => String(value) === old)) element.value = old;
}
function filters() { return { programme: $("pilotage-programme").value, owner: $("pilotage-owner").value, stage: $("pilotage-stage").value, period: $("pilotage-period").value, leader: $("pilotage-leader").checked }; }
function visible() { return filterProjects(state.portfolio?.projects || [], filters()).filter(p => state.contributorIds === null || state.contributorIds.includes(p.id)); }
function setView(view) {
  if (["time", "projects"].includes(view)) ++state.detailGeneration;
  if (pageTitle) pageTitle.textContent = view === "time" ? originalTitle : view === "projects" ? "Projets" : "Pilotage DiCo";
  if (pageSubtitle) pageSubtitle.textContent = ["time", "projects"].includes(view) ? originalSubtitle : "Projets, programmes et unité · ressources, budgets et fiabilité des données Odoo.";
  state.view = view;
  $("time-view").hidden = view !== "time"; $("pilotage-view").hidden = ["time", "projects"].includes(view);
  $("personal-projects-view").hidden = view !== "projects";
  document.title = `${({ time: "Mon temps", projects: "Projets", programmes: "Programmes", unit: "Unité DiCo" })[view] || "Odoo"} · Odoo Dashboard`;
  window.dispatchEvent(new CustomEvent("dashboard:viewchange", { detail: { view } }));
  document.querySelectorAll("#pilotage-nav [data-view]").forEach(button => { if (button.dataset.view === view) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current"); });
  if (["programmes", "unit", "portfolio"].includes(view) && !state.portfolio && !state.loading) refresh();
  else if (view !== "projects") render();
}
async function refresh() {
  const generation = ++state.generation; ++state.detailGeneration;
  state.loading = true; state.detail = null; state.contributorIds = null; $("pilotage-detail").hidden = true;
  $("pilotage-refresh").disabled = true; $("pilotage-status").textContent = "Chargement des projets DiCo accessibles…";
  try {
    const result = await post("portfolio");
    if (generation !== state.generation) return;
    if (!result.enabled) throw new Error(result.reason);
    state.portfolio = result;
    options($("pilotage-programme"), [...result.programmes.map(p => [p.id, p.name]), ["__unassigned", "Non affecté"], ["__multiple", "Affectations multiples"]]);
    options($("pilotage-owner"), [...new Map(result.projects.map(p => [String(p.owner.id ?? "unknown"), p.owner.name])).entries()]);
    options($("pilotage-stage"), [...new Set(result.projects.map(p => p.stage))].map(value => [value, value]));
    const years = new Set();
    for (const p of result.projects) for (const value of [p.start, p.end]) if (S.timestamp(value) !== null) years.add(Number(value.slice(0, 4)));
    const bounds = [...years];
    if (bounds.length) for (let year = Math.min(...bounds); year <= Math.max(...bounds) && year < Math.min(...bounds) + 150; year++) years.add(year);
    options($("pilotage-period"), [...years].sort((a, b) => b - a).map(year => [String(year), String(year)]));
    $("pilotage-date").textContent = `Chargé le ${new Date(result.asOf).toLocaleString("fr-BE")} · ${result.projects.length} projets accessibles`;
    $("pilotage-status").textContent = "Les résultats reflètent les permissions Odoo du compte connecté.";
    render();
  } catch (error) { if (generation === state.generation) { state.portfolio = null; $("pilotage-content").innerHTML = ""; $("pilotage-date").textContent = ""; $("pilotage-status").textContent = error.message; } }
  finally { if (generation === state.generation) { state.loading = false; $("pilotage-refresh").disabled = false; } }
}
function render() {
  if (["time", "projects"].includes(state.view) || !state.portfolio) return;
  const projects = visible(), summary = S.consolidate(projects), programmes = state.portfolio.programmes;
  $("pilotage-title").textContent = ({ portfolio: "Projets · DiCo", programmes: "Programmes métier · DiCo", unit: "Unité · Digital Construction" })[state.view];
  if (state.detail && !projects.some(p => p.id === state.detail.id)) { state.detail = null; ++state.detailGeneration; $("pilotage-detail").hidden = true; }
  const heading = `<p>${projects.length} projets dans la sélection${state.contributorIds !== null ? ' · <button type="button" class="pilotage-link" data-clear-contributors>Revenir à tous les contributeurs</button>' : ""}</p>`;
  if (!projects.length) { $("pilotage-content").innerHTML = heading + `<p class="pilotage-empty">Aucun projet accessible ne correspond à ces filtres.</p>`; return; }
  const meta = `<section class="panel pilotage-panel"><h3>Lecture méta · fiabilité et couverture</h3><p>Réalisé : ${summary.quality.withActual}/${projects.length} · Convention : ${summary.quality.withConvention}/${projects.length} · Planning : ${summary.quality.withPlanning}/${projects.length}</p><p>Les dates absentes restent incluses dans la sélection de période et doivent être vérifiées.</p><button type="button" class="pilotage-link" data-contributors="${summary.quality.issues.join(",")}">Examiner les projets avec points d’attention ou sources indisponibles (${summary.quality.issues.length})</button><p class="pilotage-note">${escape(state.portfolio.scope.note)}</p></section>`;
  const groups = [...programmes.map(programme => ({ ...programme, projects: projects.filter(p => p.assignment.programmeId === programme.id) })), { id: "__unassigned", name: "Non affecté", projects: projects.filter(p => p.assignment.status === "unassigned") }, { id: "__multiple", name: "Affectations multiples · hors programmes", projects: projects.filter(p => p.assignment.status === "multiple") }];
  const max = Math.max(1, ...groups.map(group => Math.abs(S.consolidate(group.projects).metrics.actual.value || 0)));
  const bars = `<section class="panel pilotage-panel"><h3>Répartition du réalisé par programme</h3><p class="pilotage-note">Longueur des barres : valeur absolue en heures ; les valeurs signées restent affichées.</p><div class="pilotage-bars">${groups.filter(group => group.projects.length).map(group => { const total = S.consolidate(group.projects).metrics.actual; return `<div class="pilotage-bar"><button type="button" class="pilotage-link" data-programme="${escape(group.id)}">${escape(group.name)}</button><div class="pilotage-track"><span style="width:${Math.abs(total.value || 0) / max * 100}%"></span></div><span>${format(total.value)}<br><small>${total.covered}/${total.total} couverts</small></span></div>`; }).join("")}</div></section>`;
  const body = state.view === "portfolio" ? `<section class="panel pilotage-panel"><h3>Projets contributeurs</h3>${projectTable(projects, programmes)}</section>` : state.view === "programmes" ? groups.filter(group => group.projects.length).map(group => `<section class="panel pilotage-panel"><h3>${escape(group.name)} · ${group.projects.length} projets</h3>${cards(S.consolidate(group.projects))}${deadlines(group.projects)}${projectTable(group.projects, programmes)}</section>`).join("") : bars + `<section class="panel pilotage-panel">${deadlines(projects)}<h3>Portefeuille de l’unité</h3>${projectTable(projects, programmes)}</section>`;
  $("pilotage-content").innerHTML = heading + cards(summary) + meta + body + `<section class="panel pilotage-panel"><h3>Planning opérationnel · horizon disponible</h3>${cards(summary, ["planned", "remainingPlan", "elapsedPlan", "futurePlan"])}</section><section class="panel pilotage-panel"><h3>Enveloppes financières par période et devise</h3>${monetaryTable(summary.budgets, true)}</section><section class="panel pilotage-panel"><h3>Points à examiner</h3>${warnings(projects)}</section>`;
}
async function openProject(projectId) {
  const generation = ++state.detailGeneration;
  $("pilotage-status").textContent = "Chargement de la fiche projet et des contrôles de réconciliation…";
  state.detail = null; $("pilotage-detail").hidden = true;
  try {
    const result = await post("project", { projectId });
    if (generation !== state.detailGeneration) return;
    if (!result.project) throw new Error(result.reason || "Fiche projet indisponible");
    state.detail = result.project; state.tab = "summary";
    renderDetail(); $("pilotage-status").textContent = "Fiche chargée à la demande ; son horodatage peut différer du portefeuille.";
    $("pilotage-detail").scrollIntoView({ behavior: "smooth", block: "start" });
    $("pilotage-detail-title").focus({ preventScroll: true });
  } catch (error) { if (generation === state.detailGeneration) $("pilotage-status").textContent = error.message; }
}
function renderDetail() {
  const p = state.detail; if (!p) return;
  $("pilotage-detail").hidden = false;
  $("pilotage-detail").innerHTML = `<div class="pilotage-detail-head"><div><h2 id="pilotage-detail-title" tabindex="-1">${escape(p.name)}</h2><p>${escape(p.owner.name)} · ${escape(p.stage)} · ${escape(p.start || "?")} → ${escape(p.end || "?")}</p><small>Fiche chargée le ${escape(new Date(p.asOf).toLocaleString("fr-BE"))}</small></div><button class="pilotage-link" type="button" data-close-detail>Fermer la fiche</button></div><div class="pilotage-tabs" role="tablist" aria-label="Détails du projet">${[["summary", "Synthèse"], ["resources", "Ressources"], ["budgets", "Budgets"], ["quality", "Fiabilité"]].map(([key, name]) => `<button id="pilotage-tab-${key}" type="button" role="tab" tabindex="${state.tab === key ? 0 : -1}" data-tab="${key}" aria-controls="pilotage-tab-panel" aria-selected="${state.tab === key}">${name}</button>`).join("")}</div><div id="pilotage-tab-panel" role="tabpanel" aria-labelledby="pilotage-tab-${state.tab}">${detailBody(p, state.tab)}</div>`;
}
document.addEventListener("click", event => {
  const button = event.target.closest("button"); if (!button) return;
  if (button.dataset.view) setView(button.dataset.view);
  if (button.id === "pilotage-my-projects") { document.querySelectorAll(".pilotage-filters select").forEach(select => { select.value = ""; }); $("pilotage-leader").checked = true; state.contributorIds = null; setView("portfolio"); }
  if (button.id === "pilotage-refresh") refresh();
  if (button.hasAttribute("data-project")) openProject(Number(button.dataset.project));
  if (button.hasAttribute("data-contributors")) { state.contributorIds = button.dataset.contributors ? button.dataset.contributors.split(",").map(Number) : []; setView("portfolio"); }
  if (button.hasAttribute("data-clear-contributors")) { state.contributorIds = null; render(); }
  if (button.hasAttribute("data-programme")) { $("pilotage-programme").value = button.dataset.programme; state.contributorIds = null; setView("programmes"); }
  if (button.dataset.tab) { state.tab = button.dataset.tab; renderDetail(); $(`pilotage-tab-${state.tab}`).focus(); }
  if (button.hasAttribute("data-close-detail")) { ++state.detailGeneration; state.detail = null; $("pilotage-detail").hidden = true; }
});
document.querySelectorAll(".pilotage-filters select, .pilotage-filters input").forEach(element => element.addEventListener("change", () => { state.contributorIds = null; ++state.detailGeneration; render(); }));
document.addEventListener("keydown", event => {
  if (!event.target.matches('.pilotage-tabs [role="tab"]') || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = ["summary", "resources", "budgets", "quality"], index = tabs.indexOf(state.tab);
  state.tab = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[3] : tabs[(index + (event.key === "ArrowRight" ? 1 : 3)) % 4];
  event.preventDefault(); renderDetail(); $(`pilotage-tab-${state.tab}`).focus();
});
post("metadata").then(meta => {
  state.metadata = meta;
  $("pilotage-activation").hidden = true;
  $("pilotage-activation").textContent = "";
  document.querySelectorAll("#pilotage-nav [data-view]:not([data-view=time]):not([data-view=projects])").forEach(button => { button.disabled = !meta.enabled; });
  $("pilotage-my-projects").disabled = !meta.enabled || !meta.leader.available;
  $("pilotage-my-projects").title = meta.leader.available ? `Source : project.project.${meta.leader.field} (${meta.leader.label})` : "Relation project leader vers res.users indisponible";
  $("pilotage-leader").disabled = !meta.leader.available;
}).catch(() => { $("pilotage-activation").hidden = true; $("pilotage-activation").textContent = ""; });
})();

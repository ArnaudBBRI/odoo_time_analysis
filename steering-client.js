(function () {
"use strict";
const S = typeof window !== "undefined" ? window.SteeringMetrics : require("./steering");
const I18n = typeof window !== "undefined" ? window.DashboardI18n : require("./i18n");
if (typeof module === "object" && module.exports) { require("./i18n-steering-messages"); require("./i18n-server-messages"); }
const t = (key, parameters) => I18n.t(key, parameters);
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const tx = (key, parameters) => escape(t(key, parameters));
const app = value => escape(I18n.message(value));
const format = (value, unit = "h") => typeof value !== "number" || !Number.isFinite(value) ? t("steering.indisponible_dae75c") : `${I18n.formatNumber(value, { maximumFractionDigits: 1 })} ${unit}`;
const date = value => value ? I18n.formatDate(value, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }) : t("steering.date_indisponible_24dfcf");
const loadedDate = value => I18n.formatDate(value, { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Brussels" });
const count = value => I18n.formatNumber(value, { maximumFractionDigits: 0 });
const month = value => /^\d{4}-\d{2}$/.test(value) ? I18n.formatDate(`${value}-01T00:00:00Z`, { month: "short", year: "numeric", timeZone: "UTC" }) : value;
const warningValue = value => typeof value === "number" ? I18n.formatNumber(value, { maximumFractionDigits: 2 })
  : typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? date(value) : value ?? t("steering.indisponible_dae75c");
const names = () => ({ actual: t("steering.realise_cumule_7803b3"), convention: t("steering.convention_14be4f"), planned: t("steering.planning_disponible_1bc69e"), remainingConvention: t("steering.reste_convention_eb2839"), remainingPlan: t("steering.solde_du_planning_778b19"), elapsedPlan: t("steering.planning_ecoule_8299c9"), futurePlan: t("steering.planning_futur_13d8f2"), consumption: t("steering.consommation_convention_8fbf0d") });
const quality = value => ({ available: t("steering.disponible_f4e4f6"), unavailable: t("steering.indisponible_dae75c"), partial: t("steering.partiel_e9d830"), reconciled: t("steering.reconcilie_959004"), "not-reconciled": t("steering.non_reconcilie_2fca4b"), "not-checkable": t("steering.non_verifiable_66f197") }[value] || value);
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
  return `<div class="pilotage-grid">${Object.entries(summary.metrics).filter(([key]) => keys.includes(key)).map(([key, metric]) => `<button class="pilotage-card" type="button" data-contributors="${metric.projectIds.join(",")}"><span>${names()[key]}</span><strong>${format(metric.value, key === "consumption" ? "%" : "h")}</strong><small>${count(metric.covered)}/${count(metric.total)}${tx("steering.projets_couverts_52e952")}${metric.covered < metric.total ? t("steering.total_partiel_d8aab5") : ""}</small><small>${app(metric.basis)}</small></button>`).join("")}</div>`;
}
function projectTable(projects, programmes) {
  return `<div class="pilotage-table-wrap"><table class="pilotage-table"><thead><tr><th>${tx("steering.projet_9c4661")}</th><th>${tx("steering.programme_responsable_27fb61")}</th><th>${tx("steering.realise_b4f8e0")}</th><th>${tx("steering.convention_14be4f")}</th><th>${tx("steering.reste_convention_eb2839")}</th><th>${tx("steering.echeance_attention_c6c0e2")}</th></tr></thead><tbody>${projects.map(project => `<tr><td><button class="pilotage-link" type="button" data-project="${project.id}">${escape(project.name)}</button><br><small>${escape(project.stage)}${project.active ? "" : t("steering.archive_f9de33")}${project.isLeader ? t("steering.mon_projet_94add5") : ""}</small></td><td>${escape(programmes.find(p => p.id === project.assignment.programmeId)?.name || (project.assignment.status === "multiple" ? t("steering.affectations_multiples_08c0bc") : t("steering.non_affecte_a95639")))}<br>${escape(project.owner.name)}</td><td>${format(project.hours.actual)}</td><td>${format(project.hours.convention)}</td><td>${format(project.hours.remainingConvention)}</td><td>${escape(date(project.end))}<br>${count(project.warnings.length)}${tx("steering.points_a_examiner_8147b4")}</td></tr>`).join("")}</tbody></table></div>`;
}
function monetaryTable(budgets, aggregate = false) {
  if (!budgets.length) return `<p class="pilotage-empty">${tx("steering.aucun_budget_disponible_dans_ce_perimetre_c37a0b")}</p>`;
  return `<p class="pilotage-note">${tx("steering.convention_et_allocation_annuelle_restent_distinctes_commande_peut_281f4f")}</p><div class="pilotage-table-wrap"><table class="pilotage-table"><thead><tr><th>${tx("steering.type_periode_devise_608742")}</th><th>${tx("steering.budgete_d7d321")}</th><th>${tx("steering.en_approbation_fc84f9")}</th><th>${tx("steering.commande_fcd785")}</th><th>${tx("steering.consomme_01e538")}</th><th>${tx("steering.solde_caa359")}</th><th>${tx("steering.fiabilite_10859b")}</th></tr></thead><tbody>${budgets.map(budget => `<tr><td>${budget.type === "annual" ? t("steering.annuel_depenses_6xxx_8ab13e") : t("steering.convention_14be4f")}<br>${escape(date(budget.start))} → ${escape(date(budget.end))}<br>${escape(budget.currency || t("steering.devise_indisponible_1e3d6d"))}</td>${["budgeted", "approval", "committed", "consumed", "balance"].map(key => `<td>${format(budget.totals[key], escape(budget.currency || ""))}</td>`).join("")}<td>${aggregate ? `<button class="pilotage-link" type="button" data-contributors="${budget.projectIds.join(",")}">${count(budget.covered)}/${count(budget.total)}${tx("steering.budgets_reconcilies_fa4242")}</button><br>${count(budget.excludedProjectIds.length)}${tx("steering.projets_exclus_18e63a")}` : `${escape(quality(budget.quality))}<br>${tx("steering.ecart_controle_df259b")}${format(budget.gap, escape(budget.currency || ""))}`}</td></tr>`).join("")}</tbody></table></div>`;
}
function warnings(projects) {
  const entries = projects.flatMap(project => project.warnings.map(warning => ({ project, warning })));
  return entries.length ? entries.map(({ project, warning }) => `<div class="pilotage-warning"><button class="pilotage-link" type="button" data-project="${project.id}">${escape(project.name)}</button> · <strong>${app(warning.title)}</strong><br>${tx("steering.valeur_95b2a5")}${escape(warningValue(warning.value))}${tx("steering.base_380e02")}${app(warning.basis)}<br><small>${app(warning.limitation)}</small></div>`).join("") : `<p>${tx("steering.aucun_point_d_attention_calculable_cela_ne_confirme_660cee")}</p>`;
}
function deadlines(projects) {
  const now = Date.now();
  const entries = projects.flatMap(project => [
    { project, name: t("steering.fin_du_projet_19faaf"), date: project.end },
    ...project.milestones.filter(m => m.reached !== true).map(m => ({ project, name: m.name, date: m.deadline }))
  ]).filter(entry => S.timestamp(entry.date, true) !== null && S.timestamp(entry.date, true) >= now).sort((a, b) => S.timestamp(a.date) - S.timestamp(b.date)).slice(0, 10);
  return `<h3>${tx("steering.prochaines_echeances_connues_b8995a")}</h3>${entries.length ? entries.map(entry => `<p><button type="button" class="pilotage-link" data-project="${entry.project.id}">${escape(entry.project.name)}</button> · ${escape(entry.name)} · ${escape(date(entry.date))}</p>`).join("") : `<p>${tx("steering.aucune_echeance_future_connue_dans_les_sources_accessibles_322b0a")}</p>`}<p class="pilotage-note">${tx("steering.les_dix_premieres_dates_connues_sans_seuil_de_f5ac72")}</p>`;
}
function monthlyChart(rows) {
  if (!rows.length) return `<p>${tx("steering.aucune_serie_d_imputations_visibles_disponible_6db934")}</p>`;
  const max = Math.max(1, ...rows.map(row => Math.abs(row.hours))), count = rows.length;
  return `<svg class="pilotage-spark" viewBox="0 0 700 180" role="img" aria-label="${tx("steering.heures_mensuelles_visibles_couverture_potentiellement_partielle_842655")}"><line x1="35" x2="690" y1="90" y2="90" stroke="#ccdce5"/>${rows.map((row, index) => { const x = 40 + index * 640 / count, h = Math.abs(row.hours) / max * 60; return `<rect x="${x}" y="${row.hours < 0 ? 90 : 90 - h}" width="${Math.max(2, 550 / count)}" height="${h}" fill="${row.hours < 0 ? "#647887" : "#16899b"}"><title>${escape(month(row.month))} : ${format(row.hours)}</title></rect>${index % Math.max(1, Math.ceil(count / 6)) === 0 ? `<text x="${x}" y="168">${escape(month(row.month))}</text>` : ""}`; }).join("")}</svg><p class="pilotage-note">${tx("steering.serie_des_lignes_visibles_uniquement_aucune_continuite_historique_6c35d4")}</p>`;
}
function detailBody(project, tab) {
  const d = project.diagnostic, h = project.hours;
  if (tab === "summary") return `<div class="pilotage-grid">${["actual", "convention", "remainingConvention", "futurePlan"].map(key => `<div class="pilotage-card"><span>${names()[key]}</span><strong>${format(h[key])}</strong></div>`).join("")}</div><p>${tx("steering.consommation_convention_651f95")}${format(h.consumption, "%")}${tx("steering.duree_ecoulee_1b30b4")}${format(h.scheduleElapsedPercent, "%")}${tx("steering.ecart_de_rythme_bbe297")}${format(h.paceGap, t("steering.points_c54a06"))}</p><p class="pilotage-note">${tx("steering.comparaison_lineaire_de_ressources_elle_ne_mesure_pas_2fd0e1")}</p><h3>${tx("steering.jalons_0781af")}</h3>${project.milestones.length ? project.milestones.map(m => `<p>${escape(m.name)} · ${escape(date(m.deadline))} · ${m.reached === null ? t("steering.statut_indisponible_db18ae") : m.reached ? t("steering.atteint_c26acb") : t("steering.non_atteint_f517ea")}</p>`).join("") : `<p>${tx("steering.jalons_indisponibles_ou_absents_de_la_source_accessible_e59ba7")}</p>`}<h3>${tx("steering.trajets_d_impact_9063c6")}</h3>${project.impact.map(row => `<p>${escape(row.name)} : ${format(row.percent, "%")}${tx("steering.coefficient_93bdbf")}${escape(typeof row.coefficient === "number" ? I18n.formatNumber(row.coefficient) : row.coefficient ?? "?")})</p>`).join("") || `<p>${tx("steering.indisponible_dae75c")}</p>`}<p>${tx("steering.part_non_affectee_68a4b3")}${format(project.impactTotal === null ? null : Math.max(0, 100 - project.impactTotal), "%")}${tx("steering.axe_distinct_des_programmes_aucune_ventilation_automatique_des_b018ab")}</p>${warnings([project])}`;
  if (tab === "resources") return `<p>${tx("steering.planning_ecoule_3d06b6")}${format(h.elapsedPlan)}${tx("steering.planning_futur_a3c4e8")}${format(h.futurePlan)}${tx("steering.solde_planning_530c52")}${format(h.remainingPlan)}</p><p>${tx("steering.ecart_planning_futur_reste_convention_1ee38c")}${format(h.remainingPlanGap)}${tx("steering.convention_theorique_a_date_581669")}${format(h.theoreticalConventionToDate)}</p><p>${tx("steering.horizon_3b52e4")}${escape(date(h.horizonStart))} → ${escape(date(h.horizonEnd))}${tx("steering.couvre_la_fin_du_projet_25f942")}${h.horizonCoversEnd === null ? t("steering.indisponible_dae75c") : h.horizonCoversEnd ? t("steering.oui_0a9040") : t("steering.non_7f6249")}</p><p>${tx("steering.realise_visible_dans_la_fenetre_du_planning_772ebb")}${format(d.actualInPlanningWindow)}${tx("steering.ecart_au_planning_ecoule_6db107")}${format(d.elapsedPlanDeviation)}</p><p class="pilotage-note">${app(d.comparisonBasis)}${tx("steering.les_periodes_de_planning_sont_reparties_selon_leur_452cce")}</p>${monthlyChart(d.monthly)}<h3>${tx("steering.equipe_et_roles_afdd1f")}</h3><p>${tx("steering.progress_20699f")}${escape(quality(d.progressStatus))}${tx("steering.les_heures_par_personne_ne_sont_affichees_qu_91d75b")}</p><div class="pilotage-table-wrap"><table class="pilotage-table"><thead><tr><th>${tx("steering.personne_ressource_053699")}</th><th>${tx("steering.roles_7fd503")}</th><th>${tx("steering.convention_14be4f")}</th><th>${tx("steering.planning_21cc30")}</th><th>${tx("steering.realise_progress_392398")}</th></tr></thead><tbody>${project.people.map(p => `<tr><td>${escape(p.name)}${p.collective ? t("steering.ressource_collective_d2d298") : ""}</td><td>${escape(p.roles.join(", ") || t("steering.indisponible_dae75c"))}</td><td>${format(p.convention)}</td><td>${format(p.planned)}</td><td>${format(p.actual)}</td></tr>`).join("")}</tbody></table></div><h3>${tx("steering.ecarts_de_population_578a99")}</h3>${project.population ? Object.entries(project.population).map(([key, values]) => `<p>${({ staffedWithoutActual: t("steering.convention_sans_imputation_c803ee"), planningWithoutActual: t("steering.planning_sans_imputation_99f97a"), actualWithoutStaffing: t("steering.imputation_sans_convention_f15573"), actualWithoutPlanning: t("steering.imputation_sans_planning_bed683") })[key]} : ${escape(values.map(key => project.people.find(p => p.key === key)?.name || key).join(", ") || t("steering.aucun_dans_la_population_reconciliee_11b7d2"))}</p>`).join("") : `<p>${tx("steering.indisponibles_couverture_des_populations_non_confirmee_76b3d5")}</p>`}<h3>${tx("steering.lots_de_travail_92eb7e")}</h3>${project.workPackages.status === "available" ? `<div class="pilotage-table-wrap"><table class="pilotage-table"><thead><tr><th>${tx("steering.wp_db0a62")}</th><th>${tx("steering.periode_217100")}</th><th>${tx("steering.convention_14be4f")}</th><th>${tx("steering.realise_b4f8e0")}</th><th>${tx("steering.attendu_a_date_17e904")}</th><th>${tx("steering.ecart_1dc71a")}</th></tr></thead><tbody>${project.workPackages.rows.map(wp => `<tr><td>${tx("steering.wp_3dd7b2")}${wp.id}</td><td>${escape(date(wp.start))} → ${escape(date(wp.end))}</td><td>${format(wp.convention)}</td><td>${format(wp.actual)}</td><td>${format(wp.expectedToDate)}</td><td>${format(wp.deviation)}</td></tr>`).join("")}</tbody></table></div><p class="pilotage-note">${tx("steering.attendu_a_date_convention_du_wp_fraction_de_68ad3e")}</p>` : `<p>${tx("steering.detail_des_lots_de_travail_indisponible_303cf8")}${app(project.workPackages.reason)}</p>`}`;
  if (tab === "budgets") return monetaryTable(project.budgets) + project.budgets.map(budget => `<h3>${budget.type === "annual" ? t("steering.allocation_annuelle_85cec1") : t("steering.convention_14be4f")} · ${escape(date(budget.start))}</h3><p class="pilotage-note">${app(budget.limitation)}</p><p>${tx("steering.budget_parent_ee7b6f")}${format(budget.parentTotal, escape(budget.currency || ""))}${tx("steering.contrat_55c673")}${format(budget.contractTotal, escape(budget.currency || ""))}</p>${budget.type === "annual" ? `<p>${tx("steering.controle_des_comptes_60_61_63_64_65_f9d752")}${escape(quality(budget.controlledStatus))}</p>${budget.controlled.map(row => `<p>${row.prefix}${tx("steering.detail_4a153a")}${format(row.amount, escape(budget.currency || ""))}${tx("steering.parent_7ab6ba")}${format(row.parentAmount, escape(budget.currency || ""))}${tx("steering.ecart_9ff859")}${format(row.gap, escape(budget.currency || ""))}</p>`).join("")}` : ""}<div class="pilotage-table-wrap"><table class="pilotage-table"><thead><tr><th>${tx("steering.rubrique_compte_87acf3")}</th><th>${tx("steering.budgete_d7d321")}</th><th>${tx("steering.en_approbation_fc84f9")}</th><th>${tx("steering.commande_fcd785")}</th><th>${tx("steering.consomme_01e538")}</th><th>${tx("steering.solde_caa359")}</th></tr></thead><tbody>${budget.categories.map(row => `<tr><td>${escape(row.category)}</td>${["budgeted", "approval", "committed", "consumed", "balance"].map(key => `<td>${format(row[key], escape(budget.currency || ""))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`).join("");
  return `<p>${tx("steering.source_chargee_le_57256c")}${escape(loadedDate(project.asOf))}${tx("steering.l_historique_anterieur_au_01_01_2026_n_085f14")}</p><p>${tx("steering.realise_projet_7ef84c")}${format(h.actual)}${tx("steering.imputations_visibles_446d19")}${format(d.visibleActual)}${tx("steering.couverture_852f81")}${format(d.visibleCoverage, "%")}${tx("steering.ecart_visible_projet_9261a7")}${format(d.visibleGap)}</p><p>${tx("steering.progress_20699f")}${format(d.progressActual)}${tx("steering.ecart_progress_projet_93fef9")}${format(d.progressGap)} · ${escape(quality(d.progressStatus))}</p><p>${tx("steering.ecart_convention_progress_affectations_4f2cf2")}${format(d.progressConventionGap)}${tx("steering.ecart_planning_progress_allocations_b8399c")}${format(d.progressPlanningGap)}</p><div class="pilotage-source-list">${Object.entries(project.sources).map(([key, source]) => `<p>${escape(names()[key] || key)} : <code>${escape(source)}</code></p>`).join("")}<p>${tx("steering.responsable_de_projet_814a82")}<code>${escape(project.leaderSource)}</code></p>${project.detailSources.map(source => `<p><code>${escape(source.source)}</code> : ${escape(quality(source.status))}${source.reason ? ` · ${app(source.reason)}` : ""}</p>`).join("")}</div><p class="pilotage-note">${tx("steering.odoo_applique_les_permissions_du_compte_connecte_les_f0825f")}</p>`;
}
if (typeof module !== "undefined" && module.exports) { module.exports = { filterProjects, cards, projectTable, monetaryTable, detailBody, escape, format }; return; }
const $ = id => document.getElementById(id);
const pageTitle = document.querySelector("header h1"), pageSubtitle = document.querySelector("header .subtitle");
const originalTitle = pageTitle?.textContent, originalSubtitle = pageSubtitle?.textContent;
const state = { view: "time", portfolio: null, metadata: null, contributorIds: null, detail: null, tab: "summary", generation: 0, detailGeneration: 0, loading: false };
async function post(route, body = {}) {
  const response = await fetch(`/api/odoo/pilotage/${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (response.status === 401) { location.assign("/login"); throw new Error(t("steering.session_expiree_73f6a3")); }
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || t("steering.lecture_indisponible_ce6a03"));
  return result;
}
function options(element, entries) {
  const old = element.value;
  element.innerHTML = `<option value="">${tx("steering.tous_2ff599")}</option>${entries.map(([value, text]) => `<option value="${escape(value)}">${escape(text)}</option>`).join("")}`;
  if (entries.some(([value]) => String(value) === old)) element.value = old;
}
function filters() { return { programme: $("pilotage-programme").value, owner: $("pilotage-owner").value, stage: $("pilotage-stage").value, period: $("pilotage-period").value, leader: $("pilotage-leader").checked }; }
function visible() { return filterProjects(state.portfolio?.projects || [], filters()).filter(p => state.contributorIds === null || state.contributorIds.includes(p.id)); }
function renderPageHead(view) {
  const dashboardView = ["time", "projects", "unit-dico", "programmes"].includes(view);
  if (pageTitle) pageTitle.textContent = view === "time" ? I18n.message(originalTitle) : view === "projects" ? t("steering.projets_0dad61") : view === "unit-dico" ? t("steering.unite_dico_aa8785") : view === "programmes" ? t("steering.programmes_784872") : t("steering.pilotage_dico_7c588d");
  if (pageSubtitle) pageSubtitle.textContent = view === "unit-dico" ? t("steering.projets_de_l_unite_digital_construction_calendrier_et_eb8208") : dashboardView ? I18n.message(originalSubtitle) : t("steering.projets_programmes_et_unite_ressources_budgets_et_fiabilite_4f8bd1");
  document.title = t("steering.tableau_de_bord_odoo_8c3ac3", {p0: ({ time: t("steering.mon_temps_57a852"), projects: t("steering.projets_0dad61"), "unit-dico": t("steering.unite_dico_aa8785"), programmes: t("steering.programmes_784872"), unit: t("steering.pilotage_dico_7c588d") })[view] || t("steering.odoo_d79221")});
}
function populateFilters(result) {
  options($("pilotage-programme"), [...result.programmes.map(p => [p.id, p.name]), ["__unassigned", t("steering.non_affecte_a95639")], ["__multiple", t("steering.affectations_multiples_08c0bc")]]);
  options($("pilotage-owner"), [...new Map(result.projects.map(p => [String(p.owner.id ?? "unknown"), p.owner.id == null ? I18n.message(p.owner.name) : p.owner.name])).entries()]);
  options($("pilotage-stage"), [...new Set(result.projects.map(p => p.stage))].map(value => [value, value]));
  const years = new Set();
  for (const p of result.projects) for (const value of [p.start, p.end]) if (S.timestamp(value) !== null) years.add(Number(value.slice(0, 4)));
  const bounds = [...years];
  if (bounds.length) for (let year = Math.min(...bounds); year <= Math.max(...bounds) && year < Math.min(...bounds) + 150; year++) years.add(year);
  options($("pilotage-period"), [...years].sort((a, b) => b - a).map(year => [String(year), String(year)]));
  $("pilotage-date").textContent = t("steering.charge_le_projets_accessibles_b18fb2", {p0: loadedDate(result.asOf), p1: count(result.projects.length)});
}
function setView(view) {
  const dashboardView = ["time", "projects", "unit-dico", "programmes"].includes(view);
  if (dashboardView) ++state.detailGeneration;
  renderPageHead(view);
  state.view = view;
  $("time-view").hidden = view !== "time"; $("pilotage-view").hidden = dashboardView;
  $("personal-projects-view").hidden = view !== "projects";
  $("unit-dico-view").hidden = view !== "unit-dico";
  $("programmes-view").hidden = view !== "programmes";
  window.dispatchEvent(new CustomEvent("dashboard:viewchange", { detail: { view } }));
  document.querySelectorAll("#pilotage-nav [data-view]").forEach(button => { if (button.dataset.view === view) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current"); });
  if (["unit", "portfolio"].includes(view) && !state.portfolio && !state.loading) refresh();
  else if (!dashboardView) render();
}
async function refresh() {
  const generation = ++state.generation; ++state.detailGeneration;
  state.loading = true; state.detail = null; state.contributorIds = null; $("pilotage-detail").hidden = true;
  $("pilotage-refresh").disabled = true; $("pilotage-status").textContent = t("steering.chargement_des_projets_dico_accessibles_106698");
  try {
    const result = await post("portfolio");
    if (generation !== state.generation) return;
    if (!result.enabled) throw new Error(result.reason);
    state.portfolio = result;
    populateFilters(result);
    $("pilotage-status").textContent = t("steering.les_resultats_refletent_les_permissions_odoo_du_compte_081e46");
    render();
  } catch (error) { if (generation === state.generation) { state.portfolio = null; $("pilotage-content").innerHTML = ""; $("pilotage-date").textContent = ""; $("pilotage-status").textContent = I18n.message(error.message); } }
  finally { if (generation === state.generation) { state.loading = false; $("pilotage-refresh").disabled = false; } }
}
function render() {
  if (["time", "projects", "unit-dico", "programmes"].includes(state.view) || !state.portfolio) return;
  const projects = visible(), summary = S.consolidate(projects), programmes = state.portfolio.programmes;
  $("pilotage-title").textContent = ({ portfolio: t("steering.projets_dico_012f37"), programmes: t("steering.programmes_metier_dico_34237d"), unit: t("steering.unite_digital_construction_3c232d") })[state.view];
  if (state.detail && !projects.some(p => p.id === state.detail.id)) { state.detail = null; ++state.detailGeneration; $("pilotage-detail").hidden = true; }
  const heading = `<p>${count(projects.length)}${tx("steering.projets_dans_la_selection_224a8f")}${state.contributorIds !== null ? ` · <button type="button" class="pilotage-link" data-clear-contributors>${tx("steering.revenir_a_tous_les_contributeurs_92f100")}</button>` : ""}</p>`;
  if (!projects.length) { $("pilotage-content").innerHTML = heading + `<p class="pilotage-empty">${tx("steering.aucun_projet_accessible_ne_correspond_a_ces_filtres_09b49b")}</p>`; return; }
  const meta = `<section class="panel pilotage-panel"><h3>${tx("steering.lecture_meta_fiabilite_et_couverture_5df8e7")}</h3><p>${tx("steering.realise_177159")}${count(summary.quality.withActual)}/${count(projects.length)}${tx("steering.convention_8dae49")}${count(summary.quality.withConvention)}/${count(projects.length)}${tx("steering.planning_858799")}${count(summary.quality.withPlanning)}/${count(projects.length)}</p><p>${tx("steering.les_dates_absentes_restent_incluses_dans_la_selection_625fd8")}</p><button type="button" class="pilotage-link" data-contributors="${summary.quality.issues.join(",")}">${tx("steering.examiner_les_projets_avec_points_d_attention_ou_95448e")}${count(summary.quality.issues.length)})</button><p class="pilotage-note">${app(state.portfolio.scope.note)}</p></section>`;
  const groups = [...programmes.map(programme => ({ ...programme, projects: projects.filter(p => p.assignment.programmeId === programme.id) })), { id: "__unassigned", name: t("steering.non_affecte_a95639"), projects: projects.filter(p => p.assignment.status === "unassigned") }, { id: "__multiple", name: t("steering.affectations_multiples_hors_programmes_14fe7e"), projects: projects.filter(p => p.assignment.status === "multiple") }];
  const max = Math.max(1, ...groups.map(group => Math.abs(S.consolidate(group.projects).metrics.actual.value || 0)));
  const bars = `<section class="panel pilotage-panel"><h3>${tx("steering.repartition_du_realise_par_programme_ead3d3")}</h3><p class="pilotage-note">${tx("steering.longueur_des_barres_valeur_absolue_en_heures_les_84bbef")}</p><div class="pilotage-bars">${groups.filter(group => group.projects.length).map(group => { const total = S.consolidate(group.projects).metrics.actual; return `<div class="pilotage-bar"><button type="button" class="pilotage-link" data-programme="${escape(group.id)}">${escape(group.name)}</button><div class="pilotage-track"><span style="width:${Math.abs(total.value || 0) / max * 100}%"></span></div><span>${format(total.value)}<br><small>${count(total.covered)}/${count(total.total)}${tx("steering.couverts_b1b15d")}</small></span></div>`; }).join("")}</div></section>`;
  const body = state.view === "portfolio" ? `<section class="panel pilotage-panel"><h3>${tx("steering.projets_contributeurs_493cec")}</h3>${projectTable(projects, programmes)}</section>` : state.view === "programmes" ? groups.filter(group => group.projects.length).map(group => `<section class="panel pilotage-panel"><h3>${escape(group.name)} · ${count(group.projects.length)}${tx("steering.projets_74258d")}</h3>${cards(S.consolidate(group.projects))}${deadlines(group.projects)}${projectTable(group.projects, programmes)}</section>`).join("") : bars + `<section class="panel pilotage-panel">${deadlines(projects)}<h3>${tx("steering.portefeuille_de_l_unite_ab66d4")}</h3>${projectTable(projects, programmes)}</section>`;
  $("pilotage-content").innerHTML = heading + cards(summary) + meta + body + `<section class="panel pilotage-panel"><h3>${tx("steering.planning_operationnel_horizon_disponible_a82af8")}</h3>${cards(summary, ["planned", "remainingPlan", "elapsedPlan", "futurePlan"])}</section><section class="panel pilotage-panel"><h3>${tx("steering.enveloppes_financieres_par_periode_et_devise_6c70e5")}</h3>${monetaryTable(summary.budgets, true)}</section><section class="panel pilotage-panel"><h3>${tx("steering.points_a_examiner_06713c")}</h3>${warnings(projects)}</section>`;
}
async function openProject(projectId) {
  const generation = ++state.detailGeneration;
  $("pilotage-status").textContent = t("steering.chargement_de_la_fiche_projet_et_des_controles_d49c40");
  state.detail = null; $("pilotage-detail").hidden = true;
  try {
    const result = await post("project", { projectId });
    if (generation !== state.detailGeneration) return;
    if (!result.project) throw new Error(result.reason || t("steering.fiche_projet_indisponible_7d89df"));
    state.detail = result.project; state.tab = "summary";
    renderDetail(); $("pilotage-status").textContent = t("steering.fiche_chargee_a_la_demande_son_horodatage_peut_e8a844");
    $("pilotage-detail").scrollIntoView({ behavior: "smooth", block: "start" });
    $("pilotage-detail-title").focus({ preventScroll: true });
  } catch (error) { if (generation === state.detailGeneration) $("pilotage-status").textContent = I18n.message(error.message); }
}
function renderDetail() {
  const p = state.detail; if (!p) return;
  $("pilotage-detail").hidden = false;
  $("pilotage-detail").innerHTML = `<div class="pilotage-detail-head"><div><h2 id="pilotage-detail-title" tabindex="-1">${escape(p.name)}</h2><p>${escape(p.owner.name)} · ${escape(p.stage)} · ${escape(date(p.start))} → ${escape(date(p.end))}</p><small>${tx("steering.fiche_chargee_le_267a54")}${escape(loadedDate(p.asOf))}</small></div><button class="pilotage-link" type="button" data-close-detail>${tx("steering.fermer_la_fiche_6a9a17")}</button></div><div class="pilotage-tabs" role="tablist" aria-label="${tx("steering.details_du_projet_0c3b32")}">${[["summary", t("steering.synthese_be2180")], ["resources", t("steering.ressources_f15c12")], ["budgets", t("steering.budgets_a1a06e")], ["quality", t("steering.fiabilite_10859b")]].map(([key, name]) => `<button id="pilotage-tab-${key}" type="button" role="tab" tabindex="${state.tab === key ? 0 : -1}" data-tab="${key}" aria-controls="pilotage-tab-panel" aria-selected="${state.tab === key}">${name}</button>`).join("")}</div><div id="pilotage-tab-panel" role="tabpanel" aria-labelledby="pilotage-tab-${state.tab}">${detailBody(p, state.tab)}</div>`;
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
function localizeMetadata() {
  const meta = state.metadata;
  if (!meta) return;
  $("pilotage-my-projects").title = meta.leader.available ? t("steering.source_du_responsable_de_projet_project_project_73a2dc", {p0: meta.leader.field}) : t("steering.relation_du_responsable_de_projet_vers_res_users_8bc0e8");
}
window.addEventListener?.("dashboard:languagechange", () => {
  renderPageHead(state.view);
  if (state.portfolio) populateFilters(state.portfolio);
  $("pilotage-status").textContent = I18n.message($("pilotage-status").textContent);
  localizeMetadata();
  render();
  if (state.detail) renderDetail();
});
(window.DashboardLanguage?.ready || Promise.resolve()).then(() => renderPageHead(state.view));
post("metadata").then(meta => {
  state.metadata = meta;
  $("pilotage-activation").hidden = true;
  $("pilotage-activation").textContent = "";
  document.querySelectorAll("#pilotage-nav [data-view]:not([data-view=time]):not([data-view=projects]):not([data-view=unit-dico]):not([data-view=programmes])").forEach(button => { button.disabled = !meta.enabled; });
  $("pilotage-my-projects").disabled = !meta.enabled || !meta.leader.available;
  localizeMetadata();
  $("pilotage-leader").disabled = !meta.leader.available;
}).catch(() => { $("pilotage-activation").hidden = true; $("pilotage-activation").textContent = ""; });
})();

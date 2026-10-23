(function (root, factory) {
  const messages = factory(typeof module === "object" && module.exports ? require("./i18n") : root.DashboardI18n);
  if (typeof module === "object" && module.exports) module.exports = messages;
})(typeof globalThis !== "undefined" ? globalThis : this, function (I18n) {
  "use strict";
  const messages = {
  "steering.indisponible_dae75c": {
    "fr": "Indisponible",
    "nl": "Niet beschikbaar"
  },
  "steering.realise_cumule_7803b3": {
    "fr": "Réalisé cumulé",
    "nl": "Gecumuleerde realisatie"
  },
  "steering.convention_14be4f": {
    "fr": "Convention",
    "nl": "Conventie"
  },
  "steering.planning_disponible_1bc69e": {
    "fr": "Planning disponible",
    "nl": "Beschikbare planning"
  },
  "steering.reste_convention_eb2839": {
    "fr": "Reste convention",
    "nl": "Resterende conventie"
  },
  "steering.solde_du_planning_778b19": {
    "fr": "Solde du planning",
    "nl": "Planningssaldo"
  },
  "steering.planning_ecoule_8299c9": {
    "fr": "Planning écoulé",
    "nl": "Verstreken planning"
  },
  "steering.planning_futur_13d8f2": {
    "fr": "Planning futur",
    "nl": "Toekomstige planning"
  },
  "steering.consommation_convention_8fbf0d": {
    "fr": "Consommation convention",
    "nl": "Verbruik conventie"
  },
  "steering.disponible_f4e4f6": {
    "fr": "Disponible",
    "nl": "Beschikbaar"
  },
  "steering.partiel_e9d830": {
    "fr": "Partiel",
    "nl": "Gedeeltelijk"
  },
  "steering.reconcilie_959004": {
    "fr": "Réconcilié",
    "nl": "Afgestemd"
  },
  "steering.non_reconcilie_2fca4b": {
    "fr": "Non réconcilié",
    "nl": "Niet afgestemd"
  },
  "steering.non_verifiable_66f197": {
    "fr": "Non vérifiable",
    "nl": "Niet verifieerbaar"
  },
  "steering.projets_couverts_52e952": {
    "fr": " projets couverts",
    "nl": " projecten gedekt"
  },
  "steering.total_partiel_d8aab5": {
    "fr": " · total partiel",
    "nl": " · gedeeltelijk totaal"
  },
  "steering.projet_9c4661": {
    "fr": "Projet",
    "nl": "Project"
  },
  "steering.programme_responsable_27fb61": {
    "fr": "Programme / responsable",
    "nl": "Programma / verantwoordelijke"
  },
  "steering.realise_b4f8e0": {
    "fr": "Réalisé",
    "nl": "Gerealiseerd"
  },
  "steering.echeance_attention_c6c0e2": {
    "fr": "Échéance / attention",
    "nl": "Einddatum / aandachtspunt"
  },
  "steering.points_a_examiner_8147b4": {
    "fr": " points à examiner",
    "nl": " te onderzoeken punten"
  },
  "steering.archive_f9de33": {
    "fr": " · Archivé",
    "nl": " · Gearchiveerd"
  },
  "steering.mon_projet_94add5": {
    "fr": " · Mon projet",
    "nl": " · Mijn project"
  },
  "steering.affectations_multiples_08c0bc": {
    "fr": "Affectations multiples",
    "nl": "Meerdere toewijzingen"
  },
  "steering.non_affecte_a95639": {
    "fr": "Non affecté",
    "nl": "Niet toegewezen"
  },
  "steering.date_indisponible_24dfcf": {
    "fr": "Date indisponible",
    "nl": "Datum niet beschikbaar"
  },
  "steering.aucun_budget_disponible_dans_ce_perimetre_c37a0b": {
    "fr": "Aucun budget disponible dans ce périmètre.",
    "nl": "Geen budget beschikbaar binnen deze selectie."
  },
  "steering.convention_et_allocation_annuelle_restent_distinctes_commande_peut_281f4f": {
    "fr": "Convention et allocation annuelle restent distinctes. Commandé peut inclure consommé : les deux montants ne s’additionnent pas. Aucune conversion des heures en euros.",
    "nl": "Conventie en jaarlijkse toewijzing blijven afzonderlijk. Besteld kan verbruikt omvatten: beide bedragen worden niet opgeteld. Uren worden niet naar euro omgerekend."
  },
  "steering.type_periode_devise_608742": {
    "fr": "Type / période / devise",
    "nl": "Type / periode / valuta"
  },
  "steering.budgete_d7d321": {
    "fr": "Budgeté",
    "nl": "Gebudgetteerd"
  },
  "steering.en_approbation_fc84f9": {
    "fr": "En approbation",
    "nl": "Ter goedkeuring"
  },
  "steering.commande_fcd785": {
    "fr": "Commandé",
    "nl": "Besteld"
  },
  "steering.consomme_01e538": {
    "fr": "Consommé",
    "nl": "Verbruikt"
  },
  "steering.solde_caa359": {
    "fr": "Solde",
    "nl": "Saldo"
  },
  "steering.fiabilite_10859b": {
    "fr": "Fiabilité",
    "nl": "Betrouwbaarheid"
  },
  "steering.annuel_depenses_6xxx_8ab13e": {
    "fr": "Annuel · dépenses 6xxx",
    "nl": "Jaarlijks · uitgaven 6xxx"
  },
  "steering.devise_indisponible_1e3d6d": {
    "fr": "Devise indisponible",
    "nl": "Valuta niet beschikbaar"
  },
  "steering.budgets_reconcilies_fa4242": {
    "fr": " budgets réconciliés",
    "nl": " afgestemde budgetten"
  },
  "steering.projets_exclus_18e63a": {
    "fr": " projets exclus",
    "nl": " uitgesloten projecten"
  },
  "steering.ecart_controle_df259b": {
    "fr": "Écart contrôle : ",
    "nl": "Controleverschil: "
  },
  "steering.valeur_95b2a5": {
    "fr": "Valeur : ",
    "nl": "Waarde: "
  },
  "steering.base_380e02": {
    "fr": " · Base : ",
    "nl": " · Basis: "
  },
  "steering.aucun_point_d_attention_calculable_cela_ne_confirme_660cee": {
    "fr": "Aucun point d’attention calculable. Cela ne confirme pas l’absence de risque.",
    "nl": "Geen berekenbaar aandachtspunt. Dit bevestigt niet dat er geen risico is."
  },
  "steering.fin_du_projet_19faaf": {
    "fr": "Fin du projet",
    "nl": "Einde van het project"
  },
  "steering.prochaines_echeances_connues_b8995a": {
    "fr": "Prochaines échéances connues",
    "nl": "Volgende bekende einddatums"
  },
  "steering.les_dix_premieres_dates_connues_sans_seuil_de_f5ac72": {
    "fr": "Les dix premières dates connues, sans seuil de risque. Les dates manquantes restent à vérifier.",
    "nl": "De eerste tien bekende datums, zonder risicodrempel. Ontbrekende datums moeten worden gecontroleerd."
  },
  "steering.aucune_echeance_future_connue_dans_les_sources_accessibles_322b0a": {
    "fr": "Aucune échéance future connue dans les sources accessibles.",
    "nl": "Geen toekomstige einddatum bekend in de toegankelijke bronnen."
  },
  "steering.aucune_serie_d_imputations_visibles_disponible_6db934": {
    "fr": "Aucune série d’imputations visibles disponible.",
    "nl": "Geen reeks zichtbare tijdregistraties beschikbaar."
  },
  "steering.heures_mensuelles_visibles_couverture_potentiellement_partielle_842655": {
    "fr": "Heures mensuelles visibles, couverture potentiellement partielle",
    "nl": "Zichtbare maanduren, mogelijk gedeeltelijke dekking"
  },
  "steering.serie_des_lignes_visibles_uniquement_aucune_continuite_historique_6c35d4": {
    "fr": "Série des lignes visibles uniquement ; aucune continuité historique entre chargements. Les corrections négatives sont conservées.",
    "nl": "Alleen de reeks zichtbare regels; geen historische continuïteit tussen laadmomenten. Negatieve correcties blijven behouden."
  },
  "steering.consommation_convention_651f95": {
    "fr": "Consommation convention : ",
    "nl": "Verbruik conventie: "
  },
  "steering.duree_ecoulee_1b30b4": {
    "fr": " · Durée écoulée : ",
    "nl": " · Verstreken looptijd: "
  },
  "steering.ecart_de_rythme_bbe297": {
    "fr": " · Écart de rythme : ",
    "nl": " · Tempoverschil: "
  },
  "steering.comparaison_lineaire_de_ressources_elle_ne_mesure_pas_2fd0e1": {
    "fr": "Comparaison linéaire de ressources ; elle ne mesure pas la réalisation des livrables.",
    "nl": "Lineaire vergelijking van middelen; deze meet niet de oplevering van resultaten."
  },
  "steering.jalons_0781af": {
    "fr": "Jalons",
    "nl": "Mijlpalen"
  },
  "steering.trajets_d_impact_9063c6": {
    "fr": "Trajets d’impact",
    "nl": "Impacttrajecten"
  },
  "steering.part_non_affectee_68a4b3": {
    "fr": "Part non affectée : ",
    "nl": "Niet toegewezen aandeel: "
  },
  "steering.axe_distinct_des_programmes_aucune_ventilation_automatique_des_b018ab": {
    "fr": ". Axe distinct des programmes ; aucune ventilation automatique des heures.",
    "nl": ". Afzonderlijk van de programma’s; geen automatische verdeling van uren."
  },
  "steering.points_c54a06": {
    "fr": "points",
    "nl": "punten"
  },
  "steering.statut_indisponible_db18ae": {
    "fr": "Statut indisponible",
    "nl": "Status niet beschikbaar"
  },
  "steering.atteint_c26acb": {
    "fr": "Atteint",
    "nl": "Bereikt"
  },
  "steering.non_atteint_f517ea": {
    "fr": "Non atteint",
    "nl": "Niet bereikt"
  },
  "steering.jalons_indisponibles_ou_absents_de_la_source_accessible_e59ba7": {
    "fr": "Jalons indisponibles ou absents de la source accessible.",
    "nl": "Mijlpalen zijn niet beschikbaar of ontbreken in de toegankelijke bron."
  },
  "steering.coefficient_93bdbf": {
    "fr": " (coefficient ",
    "nl": " (coëfficiënt "
  },
  "steering.planning_ecoule_3d06b6": {
    "fr": "Planning écoulé : ",
    "nl": "Verstreken planning: "
  },
  "steering.planning_futur_a3c4e8": {
    "fr": " · Planning futur : ",
    "nl": " · Toekomstige planning: "
  },
  "steering.solde_planning_530c52": {
    "fr": " · Solde planning : ",
    "nl": " · Planningssaldo: "
  },
  "steering.ecart_planning_futur_reste_convention_1ee38c": {
    "fr": "Écart planning futur / reste convention : ",
    "nl": "Verschil toekomstige planning / resterende conventie: "
  },
  "steering.convention_theorique_a_date_581669": {
    "fr": " · Convention théorique à date : ",
    "nl": " · Theoretische conventie tot vandaag: "
  },
  "steering.horizon_3b52e4": {
    "fr": "Horizon : ",
    "nl": "Horizon: "
  },
  "steering.couvre_la_fin_du_projet_25f942": {
    "fr": " · Couvre la fin du projet : ",
    "nl": " · Dekt het projecteinde: "
  },
  "steering.realise_visible_dans_la_fenetre_du_planning_772ebb": {
    "fr": "Réalisé visible dans la fenêtre du planning : ",
    "nl": "Zichtbare realisatie binnen de planningsperiode: "
  },
  "steering.ecart_au_planning_ecoule_6db107": {
    "fr": " · Écart au planning écoulé : ",
    "nl": " · Verschil met verstreken planning: "
  },
  "steering.les_periodes_de_planning_sont_reparties_selon_leur_452cce": {
    "fr": " Les périodes de planning sont réparties selon leur durée calendaire ; aucune capacité disponible n’est déduite.",
    "nl": " De planningsperioden worden volgens hun kalenderduur verdeeld; er wordt geen beschikbare capaciteit afgeleid."
  },
  "steering.equipe_et_roles_afdd1f": {
    "fr": "Équipe et rôles",
    "nl": "Team en rollen"
  },
  "steering.progress_20699f": {
    "fr": "Progress : ",
    "nl": "Progress: "
  },
  "steering.les_heures_par_personne_ne_sont_affichees_qu_91d75b": {
    "fr": ". Les heures par personne ne sont affichées qu’après réconciliation du total projet.",
    "nl": ". Uren per persoon worden pas getoond na afstemming met het projecttotaal."
  },
  "steering.personne_ressource_053699": {
    "fr": "Personne / ressource",
    "nl": "Persoon / resource"
  },
  "steering.roles_7fd503": {
    "fr": "Rôles",
    "nl": "Rollen"
  },
  "steering.planning_21cc30": {
    "fr": "Planning",
    "nl": "Planning"
  },
  "steering.realise_progress_392398": {
    "fr": "Réalisé Progress",
    "nl": "Realisatie Progress"
  },
  "steering.ecarts_de_population_578a99": {
    "fr": "Écarts de population",
    "nl": "Verschillen in populatie"
  },
  "steering.lots_de_travail_92eb7e": {
    "fr": "Lots de travail",
    "nl": "Werkpakketten"
  },
  "steering.oui_0a9040": {
    "fr": "Oui",
    "nl": "Ja"
  },
  "steering.non_7f6249": {
    "fr": "Non",
    "nl": "Nee"
  },
  "steering.ressource_collective_d2d298": {
    "fr": " · ressource collective",
    "nl": " · collectieve resource"
  },
  "steering.convention_sans_imputation_c803ee": {
    "fr": "Convention sans imputation",
    "nl": "Conventie zonder tijdregistratie"
  },
  "steering.planning_sans_imputation_99f97a": {
    "fr": "Planning sans imputation",
    "nl": "Planning zonder tijdregistratie"
  },
  "steering.imputation_sans_convention_f15573": {
    "fr": "Imputation sans convention",
    "nl": "Tijdregistratie zonder conventie"
  },
  "steering.imputation_sans_planning_bed683": {
    "fr": "Imputation sans planning",
    "nl": "Tijdregistratie zonder planning"
  },
  "steering.aucun_dans_la_population_reconciliee_11b7d2": {
    "fr": "Aucun dans la population réconciliée",
    "nl": "Geen binnen de afgestemde populatie"
  },
  "steering.indisponibles_couverture_des_populations_non_confirmee_76b3d5": {
    "fr": "Indisponibles : couverture des populations non confirmée.",
    "nl": "Niet beschikbaar: dekking van de populaties is niet bevestigd."
  },
  "steering.wp_db0a62": {
    "fr": "WP",
    "nl": "WP"
  },
  "steering.periode_217100": {
    "fr": "Période",
    "nl": "Periode"
  },
  "steering.attendu_a_date_17e904": {
    "fr": "Attendu à date",
    "nl": "Verwacht tot vandaag"
  },
  "steering.ecart_1dc71a": {
    "fr": "Écart",
    "nl": "Verschil"
  },
  "steering.attendu_a_date_convention_du_wp_fraction_de_68ad3e": {
    "fr": "Attendu à date = convention du WP × fraction de sa période écoulée. Tolérance des réconciliations : 0,05 h.",
    "nl": "Verwacht tot vandaag = conventie van het WP × verstreken deel van de periode. Afstemmingstolerantie: 0,05 u."
  },
  "steering.wp_3dd7b2": {
    "fr": "WP ",
    "nl": "WP "
  },
  "steering.detail_des_lots_de_travail_indisponible_303cf8": {
    "fr": "Détail des lots de travail indisponible : ",
    "nl": "Detail van de werkpakketten niet beschikbaar: "
  },
  "steering.budget_parent_ee7b6f": {
    "fr": "Budget parent : ",
    "nl": "Bovenliggend budget: "
  },
  "steering.contrat_55c673": {
    "fr": " · Contrat : ",
    "nl": " · Contract: "
  },
  "steering.rubrique_compte_87acf3": {
    "fr": "Rubrique / compte",
    "nl": "Rubriek / rekening"
  },
  "steering.allocation_annuelle_85cec1": {
    "fr": "Allocation annuelle",
    "nl": "Jaarlijkse toewijzing"
  },
  "steering.controle_des_comptes_60_61_63_64_65_f9d752": {
    "fr": "Contrôle des comptes 60/61/63/64/65 : ",
    "nl": "Controle van rekeningen 60/61/63/64/65: "
  },
  "steering.detail_4a153a": {
    "fr": " : détail ",
    "nl": ": detail "
  },
  "steering.parent_7ab6ba": {
    "fr": " · parent ",
    "nl": " · bovenliggend "
  },
  "steering.ecart_9ff859": {
    "fr": " · écart ",
    "nl": " · verschil "
  },
  "steering.source_chargee_le_57256c": {
    "fr": "Source chargée le ",
    "nl": "Bron geladen op "
  },
  "steering.l_historique_anterieur_au_01_01_2026_n_085f14": {
    "fr": ". L’historique antérieur au 01/01/2026 n’est pas exclu : sa fiabilité reste à confirmer.",
    "nl": ". De historiek vóór 01/01/2026 is niet uitgesloten: de betrouwbaarheid moet nog worden bevestigd."
  },
  "steering.realise_projet_7ef84c": {
    "fr": "Réalisé projet : ",
    "nl": "Projectrealisatie: "
  },
  "steering.imputations_visibles_446d19": {
    "fr": " · Imputations visibles : ",
    "nl": " · Zichtbare tijdregistraties: "
  },
  "steering.couverture_852f81": {
    "fr": " · Couverture : ",
    "nl": " · Dekking: "
  },
  "steering.ecart_visible_projet_9261a7": {
    "fr": " · Écart visible/projet : ",
    "nl": " · Verschil zichtbaar/project: "
  },
  "steering.ecart_progress_projet_93fef9": {
    "fr": " · Écart Progress/projet : ",
    "nl": " · Verschil Progress/project: "
  },
  "steering.ecart_convention_progress_affectations_4f2cf2": {
    "fr": "Écart convention Progress / affectations : ",
    "nl": "Verschil conventie Progress / toewijzingen: "
  },
  "steering.ecart_planning_progress_allocations_b8399c": {
    "fr": " · Écart planning Progress / allocations : ",
    "nl": " · Verschil planning Progress / allocaties: "
  },
  "steering.responsable_de_projet_814a82": {
    "fr": "Responsable de projet : ",
    "nl": "Projectverantwoordelijke: "
  },
  "steering.odoo_applique_les_permissions_du_compte_connecte_les_f0825f": {
    "fr": "Odoo applique les permissions du compte connecté. Les projets et lignes masqués ne peuvent pas être comptés. Une source disponible n’est pas une preuve de complétude métier.",
    "nl": "Odoo past de toegangsrechten van de aangemelde account toe. Verborgen projecten en regels kunnen niet worden meegeteld. Een beschikbare bron bewijst niet dat de bedrijfsgegevens volledig zijn."
  },
  "steering.session_expiree_73f6a3": {
    "fr": "Session expirée",
    "nl": "Sessie verlopen"
  },
  "steering.lecture_indisponible_ce6a03": {
    "fr": "Lecture indisponible",
    "nl": "Gegevens lezen niet beschikbaar"
  },
  "steering.tous_2ff599": {
    "fr": "Tous",
    "nl": "Alle"
  },
  "steering.projets_0dad61": {
    "fr": "Mes Projets",
    "nl": "Mijn projecten"
  },
  "steering.unite_dico_aa8785": {
    "fr": "Unité DiCo",
    "nl": "Eenheid DiCo"
  },
  "steering.programmes_784872": {
    "fr": "Programmes",
    "nl": "Programma’s"
  },
  "steering.pilotage_dico_7c588d": {
    "fr": "Pilotage DiCo",
    "nl": "DiCo-sturing"
  },
  "steering.projets_de_l_unite_digital_construction_calendrier_et_eb8208": {
    "fr": "Projets de l’unité Digital Construction · calendrier et vues par projet.",
    "nl": "Projecten van de eenheid Digital Construction · kalender en projectweergaven."
  },
  "steering.projets_programmes_et_unite_ressources_budgets_et_fiabilite_4f8bd1": {
    "fr": "Projets, programmes et unité · ressources, budgets et fiabilité des données Odoo.",
    "nl": "Projecten, programma’s en eenheid · middelen, budgetten en betrouwbaarheid van Odoo-gegevens."
  },
  "steering.tableau_de_bord_odoo_8c3ac3": {
    "fr": "{p0} · Tableau de bord Odoo",
    "nl": "{p0} · Odoo-dashboard"
  },
  "steering.mon_temps_57a852": {
    "fr": "Mon temps",
    "nl": "Mijn tijd"
  },
  "steering.odoo_d79221": {
    "fr": "Odoo",
    "nl": "Odoo"
  },
  "steering.chargement_des_projets_dico_accessibles_106698": {
    "fr": "Chargement des projets DiCo accessibles…",
    "nl": "Toegankelijke DiCo-projecten laden…"
  },
  "steering.charge_le_projets_accessibles_b18fb2": {
    "fr": "Chargé le {p0} · {p1} projets accessibles",
    "nl": "Geladen op {p0} · {p1} toegankelijke projecten"
  },
  "steering.les_resultats_refletent_les_permissions_odoo_du_compte_081e46": {
    "fr": "Les résultats reflètent les permissions Odoo du compte connecté.",
    "nl": "De resultaten weerspiegelen de Odoo-toegangsrechten van de aangemelde account."
  },
  "steering.projets_dico_012f37": {
    "fr": "Projets · DiCo",
    "nl": "Projecten · DiCo"
  },
  "steering.programmes_metier_dico_34237d": {
    "fr": "Programmes métier · DiCo",
    "nl": "Bedrijfsprogramma’s · DiCo"
  },
  "steering.unite_digital_construction_3c232d": {
    "fr": "Unité · Digital Construction",
    "nl": "Eenheid · Digital Construction"
  },
  "steering.projets_dans_la_selection_224a8f": {
    "fr": " projets dans la sélection",
    "nl": " projecten in de selectie"
  },
  "steering.revenir_a_tous_les_contributeurs_92f100": {
    "fr": "Revenir à tous les contributeurs",
    "nl": "Terug naar alle medewerkers"
  },
  "steering.aucun_projet_accessible_ne_correspond_a_ces_filtres_09b49b": {
    "fr": "Aucun projet accessible ne correspond à ces filtres.",
    "nl": "Geen toegankelijk project voldoet aan deze filters."
  },
  "steering.lecture_meta_fiabilite_et_couverture_5df8e7": {
    "fr": "Lecture méta · fiabilité et couverture",
    "nl": "Metaoverzicht · betrouwbaarheid en dekking"
  },
  "steering.realise_177159": {
    "fr": "Réalisé : ",
    "nl": "Gerealiseerd: "
  },
  "steering.convention_8dae49": {
    "fr": " · Convention : ",
    "nl": " · Conventie: "
  },
  "steering.planning_858799": {
    "fr": " · Planning : ",
    "nl": " · Planning: "
  },
  "steering.les_dates_absentes_restent_incluses_dans_la_selection_625fd8": {
    "fr": "Les dates absentes restent incluses dans la sélection de période et doivent être vérifiées.",
    "nl": "Ontbrekende datums blijven in de periodeselectie opgenomen en moeten worden gecontroleerd."
  },
  "steering.examiner_les_projets_avec_points_d_attention_ou_95448e": {
    "fr": "Examiner les projets avec points d’attention ou sources indisponibles (",
    "nl": "Projecten met aandachtspunten of onbeschikbare bronnen bekijken ("
  },
  "steering.affectations_multiples_hors_programmes_14fe7e": {
    "fr": "Affectations multiples · hors programmes",
    "nl": "Meerdere toewijzingen · buiten programma’s"
  },
  "steering.repartition_du_realise_par_programme_ead3d3": {
    "fr": "Répartition du réalisé par programme",
    "nl": "Verdeling van de realisatie per programma"
  },
  "steering.longueur_des_barres_valeur_absolue_en_heures_les_84bbef": {
    "fr": "Longueur des barres : valeur absolue en heures ; les valeurs signées restent affichées.",
    "nl": "Lengte van de balken: absolute waarde in uren; de waarden met hun teken blijven zichtbaar."
  },
  "steering.couverts_b1b15d": {
    "fr": " couverts",
    "nl": " gedekt"
  },
  "steering.projets_contributeurs_493cec": {
    "fr": "Projets contributeurs",
    "nl": "Bijdragende projecten"
  },
  "steering.projets_74258d": {
    "fr": " projets",
    "nl": " projecten"
  },
  "steering.portefeuille_de_l_unite_ab66d4": {
    "fr": "Portefeuille de l’unité",
    "nl": "Projectportefeuille van de eenheid"
  },
  "steering.planning_operationnel_horizon_disponible_a82af8": {
    "fr": "Planning opérationnel · horizon disponible",
    "nl": "Operationele planning · beschikbare horizon"
  },
  "steering.enveloppes_financieres_par_periode_et_devise_6c70e5": {
    "fr": "Enveloppes financières par période et devise",
    "nl": "Financiële enveloppen per periode en valuta"
  },
  "steering.points_a_examiner_06713c": {
    "fr": "Points à examiner",
    "nl": "Te onderzoeken punten"
  },
  "steering.chargement_de_la_fiche_projet_et_des_controles_d49c40": {
    "fr": "Chargement de la fiche projet et des contrôles de réconciliation…",
    "nl": "Projectfiche en afstemmingscontroles laden…"
  },
  "steering.fiche_projet_indisponible_7d89df": {
    "fr": "Fiche projet indisponible",
    "nl": "Projectfiche niet beschikbaar"
  },
  "steering.fiche_chargee_a_la_demande_son_horodatage_peut_e8a844": {
    "fr": "Fiche chargée à la demande ; son horodatage peut différer du portefeuille.",
    "nl": "Fiche op verzoek geladen; het tijdstip kan verschillen van de portefeuille."
  },
  "steering.fiche_chargee_le_267a54": {
    "fr": "Fiche chargée le ",
    "nl": "Fiche geladen op "
  },
  "steering.fermer_la_fiche_6a9a17": {
    "fr": "Fermer la fiche",
    "nl": "Fiche sluiten"
  },
  "steering.details_du_projet_0c3b32": {
    "fr": "Détails du projet",
    "nl": "Projectdetails"
  },
  "steering.synthese_be2180": {
    "fr": "Synthèse",
    "nl": "Samenvatting"
  },
  "steering.ressources_f15c12": {
    "fr": "Ressources",
    "nl": "Middelen"
  },
  "steering.budgets_a1a06e": {
    "fr": "Budgets",
    "nl": "Budgetten"
  },
  "steering.source_du_responsable_de_projet_project_project_73a2dc": {
    "fr": "Source du responsable de projet : project.project.{p0}",
    "nl": "Bron van de projectverantwoordelijke: project.project.{p0}"
  },
  "steering.relation_du_responsable_de_projet_vers_res_users_8bc0e8": {
    "fr": "Relation du responsable de projet vers res.users indisponible",
    "nl": "Relatie van de projectverantwoordelijke naar res.users niet beschikbaar"
  }
};
  I18n.register(messages);
  return messages;
});

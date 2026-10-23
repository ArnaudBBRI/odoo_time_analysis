(function (root, factory) {
  const api = typeof module === "object" && module.exports ? require("./i18n") : root.DashboardI18n;
  const catalogue = factory();
  api.register(catalogue);
  if (typeof module === "object" && module.exports) module.exports = catalogue;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  return {
  "project.browser.usagePersonalPlanning": {
    "fr": "Mes heures · planning",
    "nl": "Mijn uren · planning"
  },
  "project.browser.usageTotalPlanning": {
    "fr": "Total · planning",
    "nl": "Totaal · planning"
  },
  "project.browser.usageTotalConvention": {
    "fr": "Total · convention",
    "nl": "Totaal · overeenkomst"
  },
  "project.browser.usageOver": {
    "fr": "{hours} de surconsommation à ce jour.",
    "nl": "{hours} meer verbruikt tot vandaag."
  },
  "project.browser.usageUnder": {
    "fr": "{hours} de sous-consommation à ce jour.",
    "nl": "{hours} minder verbruikt tot vandaag."
  },
  "project.browser.usageBalanced": {
    "fr": "Consommation conforme à ce jour.",
    "nl": "Verbruik volgens verwachting tot vandaag."
  },
  "project.browser.usageUnavailable": {
    "fr": "Comparaison indisponible.",
    "nl": "Vergelijking niet beschikbaar."
  },
  "project.browser.milestoneName": {
    "fr": "Jalon {id}",
    "nl": "Mijlpaal {id}"
  },
  "project.browser.milestones": {
    "fr": "Jalons du projet",
    "nl": "Projectmijlpalen"
  },
  "project.browser.milestonesLegend": {
    "fr": "Jalons du projet ({count}) · repères verticaux noirs",
    "nl": "Projectmijlpalen ({count}) · zwarte verticale lijnen"
  },
  "project.browser.milestonesUnavailable": {
    "fr": "Les jalons Odoo sont indisponibles.",
    "nl": "De Odoo-mijlpalen zijn niet beschikbaar."
  },
  "project.browser.indisponible.m9mk9v": {
    "fr": "Indisponible",
    "nl": "Niet beschikbaar"
  },
  "project.browser.mesHeures.1smqbg4": {
    "fr": "Mes heures",
    "nl": "Mijn uren"
  },
  "project.browser.periodeSelectionnee.3dm9lq": {
    "fr": "{p0} · période sélectionnée",
    "nl": "{p0} · geselecteerde periode"
  },
  "project.browser.fevrier.t3x3c8": {
    "fr": "février",
    "nl": "februari"
  },
  "project.browser.decembre.xeujks": {
    "fr": "décembre",
    "nl": "december"
  },
  "project.browser.duAu.2j40gd": {
    "fr": "{p0} du {p1} au {p2}",
    "nl": "{p0} van {p1} tot {p2}"
  },
  "project.browser.conventionEtPlanning.pne8w4": {
    "fr": "Convention et planning",
    "nl": "Overeenkomst en planning"
  },
  "project.browser.informationsSurLaConventionEtLePlanning.8kfjkz": {
    "fr": "Informations sur la convention et le planning",
    "nl": "Informatie over de overeenkomst en de planning"
  },
  "project.browser.chargementDesInformationsDePlanning.19p8se6": {
    "fr": "Chargement des informations de planning…",
    "nl": "Planninginformatie laden…"
  },
  "project.browser.informationsDePlanningIndisponibles.1hoa4c9": {
    "fr": "Informations de planning indisponibles.",
    "nl": "Planninginformatie niet beschikbaar."
  },
  "project.browser.lesDetailsSerontDisponiblesApresLeChargement.g2vh7x": {
    "fr": "Les détails seront disponibles après le chargement du planning.",
    "nl": "De details worden beschikbaar zodra de planning geladen is."
  },
  "project.browser.lesInformationsDetailleesDePlanningSontIndisponibles.1ctsnhf": {
    "fr": "Les informations détaillées de planning sont indisponibles.",
    "nl": "De gedetailleerde planninginformatie is niet beschikbaar."
  },
  "project.browser.dureeTotaleDuProjetIndependammentDeLa.hka6yn": {
    "fr": "{p0} · durée totale du projet · indépendamment de la période sélectionnée · hors Ormitters.",
    "nl": "{p0} · volledige projectduur · onafhankelijk van de geselecteerde periode · zonder Ormitters."
  },
  "project.browser.duAu.1nvv6b9": {
    "fr": "Du {p0} au {p1}",
    "nl": "Van {p0} tot {p1}"
  },
  "project.browser.datesDuProjetIndisponibles.1r7666u": {
    "fr": "Dates du projet indisponibles",
    "nl": "Projectdatums niet beschikbaar"
  },
  "project.browser.prevuesParLaConvention.1yacpue": {
    "fr": "prévues par la convention",
    "nl": "voorzien in de overeenkomst"
  },
  "project.browser.dejaPresteesAuTotalDepuisLeDebut.1qllhvp": {
    "fr": "déjà prestées au total depuis le début du projet",
    "nl": "in totaal gepresteerd sinds de start van het project"
  },
  "project.browser.restantesPlanifieesAuTotal.1d68ghm": {
    "fr": "restantes planifiées au total",
    "nl": "in totaal resterend gepland"
  },
  "project.browser.ecartProjeteAvecLaConvention.1o1n4n0": {
    "fr": "écart projeté avec la convention",
    "nl": "verwacht verschil met de overeenkomst"
  },
  "project.browser.planifieesEnTropParRapportALa.alqp0m": {
    "fr": "planifiées en trop par rapport à la convention",
    "nl": "te veel gepland ten opzichte van de overeenkomst"
  },
  "project.browser.enMoinsParRapportALaConvention.xtdt13": {
    "fr": "en moins par rapport à la convention",
    "nl": "minder dan in de overeenkomst"
  },
  "project.browser.dEcartAvecLaConvention.mmlsgk": {
    "fr": "d’écart avec la convention",
    "nl": "verschil met de overeenkomst"
  },
  "project.browser.nonRenseigne.un1dwo": {
    "fr": "Non renseigné",
    "nl": "Niet ingevuld"
  },
  "project.browser.jusquAu.1muw713": {
    "fr": " · jusqu’au {p0}",
    "nl": " · tot en met {p0}"
  },
  "project.browser.partDesHeuresTHIndisponible.2g1ea4": {
    "fr": "Part des heures TH indisponible.",
    "nl": "Aandeel TH-uren niet beschikbaar."
  },
  "project.browser.dontARecruterTH.1vdehlo": {
    "fr": "dont {p0} à recruter (TH){p1}.",
    "nl": "waarvan {p0} voor nog aan te werven medewerkers (TH){p1}."
  },
  "project.browser.identifiees.tvicya": {
    "fr": " identifiées",
    "nl": " geïdentificeerd"
  },
  "project.browser.aPartirDu.you2fc": {
    "fr": "À partir du {p0}.",
    "nl": "Vanaf {p0}."
  },
  "project.browser.auPlanningDate.1bfzva0": {
    "fr": "au planning daté",
    "nl": "met de gedateerde planning"
  },
  "project.browser.aLaConventionInterpolationLineaire.1kz6grd": {
    "fr": "à la convention (interpolation linéaire)",
    "nl": "met de overeenkomst (lineaire interpolatie)"
  },
  "project.browser.comparaisonACeJourIndisponible.b2dtvz": {
    "fr": "Comparaison {p0} à ce jour indisponible.",
    "nl": "Vergelijking {p0} tot vandaag niet beschikbaar."
  },
  "project.browser.aCeJourLesHeuresPointeesCorrespondent.1c2iw00": {
    "fr": "À ce jour, les heures pointées correspondent {p0}.",
    "nl": "Tot vandaag komen de geregistreerde uren overeen {p0}."
  },
  "project.browser.aCeJourPointeesParRapport.gpdblq": {
    "fr": "À ce jour, {p0} pointées {p1} par rapport {p2}.",
    "nl": "Tot vandaag is {p0} {p1} geregistreerd in vergelijking {p2}."
  },
  "project.browser.enTrop.15cor83": {
    "fr": "en trop",
    "nl": "te veel"
  },
  "project.browser.enMoins.1tga3fu": {
    "fr": "en moins",
    "nl": "te weinig"
  },
  "project.browser.ecartProjeteHeuresDejaPresteesHeuresRestantes.194yuth": {
    "fr": "Écart projeté = heures déjà prestées + heures restantes planifiées (TH inclus) − convention. Tous ces chiffres sont hors Ormitters.",
    "nl": "Verwacht verschil = reeds gepresteerde uren + resterende geplande uren (inclusief TH) − overeenkomst. Al deze cijfers zijn zonder Ormitters."
  },
  "project.browser.lesComparaisonsACeJourUtilisentLe.10ti53d": {
    "fr": "Les comparaisons à ce jour utilisent le planning réellement daté et la convention répartie linéairement sur les dates du projet. Elles sont indépendantes de la période sélectionnée. La comparaison personnelle utilise uniquement vos imputations et allocations identifiées, hors ressources TH.",
    "nl": "De vergelijkingen tot vandaag gebruiken de werkelijk gedateerde planning en de overeenkomst lineair verdeeld over de projectdatums. Ze zijn onafhankelijk van de geselecteerde periode. De persoonlijke vergelijking gebruikt alleen uw geïdentificeerde tijdregistraties en planningsuren, zonder TH-resources."
  },
  "project.browser.duAu.1aa9v9x": {
    "fr": "du {p0} au {p1}",
    "nl": "van {p0} tot {p1}"
  },
  "project.browser.datesIndisponibles.gjpgh5": {
    "fr": "dates indisponibles",
    "nl": "datums niet beschikbaar"
  },
  "project.browser.planningFuturAucunePersonneReellementPlanifiee.iqoow0": {
    "fr": "Planning futur : aucune personne réellement planifiée{p0}{p1}.",
    "nl": "Toekomstige planning: niemand daadwerkelijk gepland{p0}{p1}."
  },
  "project.browser.surCertainesPeriodesDAuMoinsUn.q9owpy": {
    "fr": " sur certaines périodes d’au moins un mois",
    "nl": " in bepaalde periodes van minstens één maand"
  },
  "project.browser.periode.16g0b91": {
    "fr": " période",
    "nl": " periode"
  },
  "project.browser.sPeriodes.1byq0yj": {
    "fr": "s périodes",
    "nl": " periodes"
  },
  "project.browser.voirSansPersonnePlanifiee.n7wdn3": {
    "fr": "Voir {p0} sans personne planifiée",
    "nl": "Bekijk {p0} zonder geplande medewerker"
  },
  "project.browser.laPeriode.ouyo1q": {
    "fr": "la période",
    "nl": "de periode"
  },
  "project.browser.lesPeriodes.1trh9za": {
    "fr": "les {p0} périodes",
    "nl": "de {p0} periodes"
  },
  "project.browser.jour.1qaqtp1": {
    "fr": " · {p0} jour{p1}",
    "nl": " · {p0} dag{p1}"
  },
  "project.browser.calendaire.1n0nijx": {
    "fr": " calendaire",
    "nl": " kalender"
  },
  "project.browser.aucunePeriodeSansPersonneReellementPlanifieeD.jmdd29": {
    "fr": "Aucune période sans personne réellement planifiée d’au moins un mois.",
    "nl": "Geen periode van minstens één maand zonder daadwerkelijk geplande medewerker."
  },
  "project.browser.aucunePeriodeFutureACouvrir.8vnfoj": {
    "fr": "Aucune période future à couvrir.",
    "nl": "Geen toekomstige periode om te dekken."
  },
  "project.browser.couvertureFutureIndetermineeLePlanningOuLes.1tgskrv": {
    "fr": "Couverture future indéterminée : le planning ou les identités accessibles ne permettent pas de confirmer les périodes sans personne planifiée.",
    "nl": "Toekomstige dekking onbepaald: de toegankelijke planning of identiteiten volstaan niet om periodes zonder geplande medewerker te bevestigen."
  },
  "project.browser.seulesLesInterruptionsContinuesDAuMoins.1u4paw5": {
    "fr": "Seules les interruptions continues d’au moins un mois sont signalées.",
    "nl": "Alleen aaneengesloten onderbrekingen van minstens één maand worden gemeld."
  },
  "project.browser.ressourcesTHDureeTotaleDuProjetRessource.57cldv": {
    "fr": "Ressources TH · durée totale du projet : {p0} ressource{p1}{p2}",
    "nl": "TH-resources · volledige projectduur: {p0} resource{p1}{p2}"
  },
  "project.browser.identifiees.12sjkrn": {
    "fr": " · {p0} identifiées",
    "nl": " · {p0} geïdentificeerd"
  },
  "project.browser.lesRessourcesTHRepresententDesPostesA.s9grcp": {
    "fr": "Les ressources TH représentent des postes à pourvoir ; leurs heures restent incluses dans le planning et dans l’écart projeté.",
    "nl": "TH-resources zijn nog in te vullen functies; hun uren blijven opgenomen in de planning en het verwachte verschil."
  },
  "project.browser.identificationDesRessourcesTHIncompleteSeulesLes.1dvi590": {
    "fr": "Identification des ressources TH incomplète : seules les heures TH confirmées peuvent être distinguées dans le planning.",
    "nl": "TH-resources onvolledig geïdentificeerd: alleen bevestigde TH-uren kunnen in de planning worden onderscheiden."
  },
  "project.browser.identificationDesRessourcesTHIndisponibleLeurPart.194e0gc": {
    "fr": "Identification des ressources TH indisponible : leur part dans le planning ne peut pas être confirmée.",
    "nl": "TH-resources niet beschikbaar: hun aandeel in de planning kan niet worden bevestigd."
  },
  "project.browser.autreRessourceSansPersonneAttribuee.1nrouwm": {
    "fr": "{p0} autre{p1} ressource{p2} sans personne attribuée",
    "nl": "{p0} andere resource{p1}{p2} zonder toegewezen persoon"
  },
  "project.browser.projets03PlanningMensuelDureeDuProjet.1o4mhtq": {
    "fr": "Projets · 03 / Planning mensuel · durée du projet",
    "nl": "Projecten · 03 / Maandelijkse planning · projectduur"
  },
  "project.browser.projets02EvolutionMensuelleDureeDuProjet.1sqrl4c": {
    "fr": "Projets · 02 / Heures réalisées · jusqu’à aujourd’hui",
    "nl": "Projecten · 02 / Gepresteerde uren · tot vandaag"
  },
  "project.browser.plannedConventionMonthly": {
    "fr": "La ligne pointillée représente les heures de convention du projet réparties linéairement sur ses dates, au prorata des jours de chaque mois. Cette référence reste à l’échelle du projet lorsqu’une personne est sélectionnée.",
    "nl": "De stippellijn toont de uren van de projectovereenkomst, lineair verdeeld over de projectdatums volgens het aantal dagen per maand. Deze referentie blijft op projectniveau wanneer een persoon is geselecteerd."
  },
  "project.browser.plannedConventionCumulative": {
    "fr": "La ligne pointillée cumule la référence linéaire de la convention jusqu’au total des heures prévues à la fin du projet. Cette référence reste à l’échelle du projet lorsqu’une personne est sélectionnée.",
    "nl": "De stippellijn telt de lineaire referentie van de overeenkomst op tot het totale aantal voorziene uren op de einddatum van het project. Deze referentie blijft op projectniveau wanneer een persoon is geselecteerd."
  },
  "project.browser.plannedConventionEmpty": {
    "fr": "Aucun budget horaire positif n’est renseigné dans la convention ; la référence pointillée n’est pas affichée.",
    "nl": "De overeenkomst bevat geen positief urenbudget; de stippellijn wordt niet getoond."
  },
  "project.browser.plannedConventionUnavailable": {
    "fr": "Les heures de convention n’ont pas pu être déterminées ; la référence pointillée n’est pas affichée.",
    "nl": "De uren van de overeenkomst konden niet worden bepaald; de stippellijn wordt niet getoond."
  },
  "project.browser.inclureLesHeuresDesOrmitters.4nxxt6": {
    "fr": "Inclure les heures des Ormitters",
    "nl": "Uren van Ormitters opnemen"
  },
  "project.browser.affichageDesHeuresPlanifiees.xl33n1": {
    "fr": "Affichage des heures planifiées",
    "nl": "Weergave van de geplande uren"
  },
  "project.browser.affichageDesHeuresRealisees.tdvbu6": {
    "fr": "Affichage des heures réalisées",
    "nl": "Weergave van de gepresteerde uren"
  },
  "project.browser.parMois.p8cog8": {
    "fr": "Par mois",
    "nl": "Per maand"
  },
  "project.browser.cumule.1jfjd6g": {
    "fr": "Cumulé",
    "nl": "Cumulatief"
  },
  "project.browser.chargementDuPlanningMensuel.15xdjkq": {
    "fr": "Chargement du planning mensuel…",
    "nl": "Maandelijkse planning laden…"
  },
  "project.browser.planningMensuelIndisponibleVerifiezLePlanningEt.1wehhr0": {
    "fr": "Planning mensuel indisponible : vérifiez le planning et les dates du projet.",
    "nl": "Maandelijkse planning niet beschikbaar: controleer de planning en de projectdatums."
  },
  "project.browser.chargementDeLEvolutionMensuelle.163i15w": {
    "fr": "Chargement de l’évolution mensuelle…",
    "nl": "Maandelijkse evolutie laden…"
  },
  "project.browser.leProjetNAPasEncoreCommence.18vxctf": {
    "fr": "Le projet n’a pas encore commencé.",
    "nl": "Het project is nog niet gestart."
  },
  "project.browser.evolutionMensuelleIndisponibleVerifiezLesDatesDu.wpt9d2": {
    "fr": "Évolution mensuelle indisponible : vérifiez les dates du projet.",
    "nl": "Maandelijkse evolutie niet beschikbaar: controleer de projectdatums."
  },
  "project.browser.employeNonIdentifie.1je10ie": {
    "fr": "Employé non identifié",
    "nl": "Niet-geïdentificeerde medewerker"
  },
  "project.browser.planningIndividuelReferenceLineaireSurToutLe.kl0tl5": {
    "fr": "Planning individuel · référence linéaire{p0} sur tout le projet",
    "nl": "Individuele planning · lineaire{p0} referentie over het volledige project"
  },
  "project.browser.cumulee.1ntd16p": {
    "fr": " cumulée",
    "nl": " cumulatieve"
  },
  "project.browser.planningDateCumuleACeJour.ixfgb1": {
    "fr": "Planning daté cumulé à ce jour",
    "nl": "Gedateerde cumulatieve planning tot vandaag"
  },
  "project.browser.planningDateACeJour.vjw4g0": {
    "fr": "Planning daté à ce jour",
    "nl": "Gedateerde planning tot vandaag"
  },
  "project.browser.tousLesEmployes.1cn3rkm": {
    "fr": "Tous les employés",
    "nl": "Alle medewerkers"
  },
  "project.browser.duAuTotaliteDuPlanningIndividuelIndependamment.cc67q4": {
    "fr": "Du {p0} au {p1} · totalité du planning individuel, indépendamment de la période sélectionnée.",
    "nl": "Van {p0} tot {p1} · volledige individuele planning, onafhankelijk van de geselecteerde periode."
  },
  "project.browser.totaliteDuPlanningIndividuelSurLesDates.1n6eysj": {
    "fr": "Totalité du planning individuel sur les dates du projet, indépendamment de la période sélectionnée.",
    "nl": "Volledige individuele planning over de projectdatums, onafhankelijk van de geselecteerde periode."
  },
  "project.browser.datesDuProjetDuAu.1kynew1": {
    "fr": "Dates du projet : du {p0} au {p1}.",
    "nl": "Projectdatums: van {p0} tot {p1}."
  },
  "project.browser.datesDeReferenceDuProjetIndisponibles.1suef02": {
    "fr": "Dates de référence du projet indisponibles.",
    "nl": "Referentiedatums van het project niet beschikbaar."
  },
  "project.browser.heuresDuAu.1m1awp1": {
    "fr": "Heures du {p0} au {p1}. ",
    "nl": "Uren van {p0} tot {p1}. "
  },
  "project.browser.independammentDeLaPeriodeSelectionnee.m3i1v2": {
    "fr": "{p0} Indépendamment de la période sélectionnée.",
    "nl": "{p0} Onafhankelijk van de geselecteerde periode."
  },
  "project.browser.duAuHorsPeriodeSelectionnee.1wfzy2l": {
    "fr": "Du {p0} au {p1} · hors période sélectionnée · {p2}",
    "nl": "Van {p0} tot {p1} · buiten de geselecteerde periode · {p2}"
  },
  "project.browser.periodeDuProjetHorsPeriodeSelectionnee.1p9kbnx": {
    "fr": "Période du projet · hors période sélectionnée",
    "nl": "Projectperiode · buiten de geselecteerde periode"
  },
  "project.browser.auMoisEnCours.qadwma": {
    "fr": " · au {p0} (mois en cours)",
    "nl": " · tot {p0} (lopende maand)"
  },
  "project.browser.heuresPlanifieesRepartiesSelonLesDatesDes.1vb6uh7": {
    "fr": "Heures planifiées {p0}, réparties selon les dates des créneaux sur toute la durée du projet, y compris les allocations futures et les ressources à recruter (TH). Indépendamment de la période sélectionnée.",
    "nl": "Geplande uren {p0}, verdeeld volgens de datums van de planningsblokken over de volledige projectduur, inclusief toekomstige toewijzingen en nog aan te werven resources (TH). Onafhankelijk van de geselecteerde periode."
  },
  "project.browser.cumuleesMoisApresMois.ap6m10": {
    "fr": "cumulées mois après mois",
    "nl": "cumulatief per maand"
  },
  "project.browser.parMois.1m3su94": {
    "fr": "par mois",
    "nl": "per maand"
  },
  "project.browser.duDebutDuProjetAAujourdHui.f4nku2": {
    "fr": "{p0} · {p1}, du début du projet à aujourd’hui. Le mois en cours est partiel. La référence répartit son planning total, y compris les allocations futures, linéairement sur toute la durée du projet. Elle est indépendante de la période sélectionnée.",
    "nl": "{p0} · {p1}, van de projectstart tot vandaag. De lopende maand is onvolledig. De referentie verdeelt de volledige planning, inclusief toekomstige toewijzingen, lineair over de volledige projectduur. Ze is onafhankelijk van de geselecteerde periode."
  },
  "project.browser.heuresCumulees.1bn48vi": {
    "fr": "heures cumulées",
    "nl": "cumulatieve uren"
  },
  "project.browser.heuresDeChaqueMois.1aczx4h": {
    "fr": "heures de chaque mois",
    "nl": "uren per maand"
  },
  "project.browser.heuresCumuleesMoisApresMoisDepuisLe.1f94wm5": {
    "fr": "Heures cumulées mois après mois depuis le début du projet. Le mois en cours est partiel. La convention s’accumule au prorata des jours du projet, puis reste constante après sa fin.",
    "nl": "Uren maand na maand opgeteld sinds de projectstart. De lopende maand is onvolledig. De overeenkomst wordt opgebouwd naar verhouding van de projectdagen en blijft na het einde constant."
  },
  "project.browser.heuresDeChaqueMoisDuDebutDu.1sd24c4": {
    "fr": "Heures de chaque mois, du début du projet à aujourd’hui. Le mois en cours est partiel. La convention est répartie par jour sur les dates du projet, puis nulle après sa fin.",
    "nl": "Uren per maand, van de projectstart tot vandaag. De lopende maand is onvolledig. De overeenkomst wordt per dag over de projectdatums verdeeld en is nul na het einde."
  },
  "project.browser.planningTotalDeSurTouteLaDuree.1ch5rh8": {
    "fr": "Planning total de {p0} sur toute la durée du projet : {p1}{p2}",
    "nl": "Totale planning van {p0} over de volledige projectduur: {p1}{p2}"
  },
  "project.browser.aucuneHeurePlanifiee.1pavted": {
    "fr": " · aucune heure planifiée.",
    "nl": " · geen geplande uren."
  },
  "project.browser.planningDeIndisponibleLaProjectionLineaireNe.y6adoc": {
    "fr": "Planning de {p0} indisponible ; la projection linéaire ne peut pas être affichée.",
    "nl": "Planning van {p0} niet beschikbaar; de lineaire projectie kan niet worden weergegeven."
  },
  "project.browser.laLigneRougeContinueSuitLesHeures.g5dnen": {
    "fr": "La ligne rouge continue suit les heures des créneaux de planning datés, jusqu’à aujourd’hui ; elle ne représente pas une interpolation linéaire.",
    "nl": "De doorlopende rode lijn volgt de uren van de gedateerde planningsblokken tot vandaag; ze is geen lineaire interpolatie."
  },
  "project.browser.planningDateIndisponibleLaLigneRougeDe.ypncfg": {
    "fr": "Planning daté indisponible : la ligne rouge de comparaison ne peut pas être affichée.",
    "nl": "Gedateerde planning niet beschikbaar: de rode vergelijkingslijn kan niet worden weergegeven."
  },
  "project.browser.lesCorrectionsNegativesRestentVisiblesSousZero.2xtj4m": {
    "fr": "Les corrections négatives restent visibles sous zéro.",
    "nl": "Negatieve correcties blijven onder nul zichtbaar."
  },
  "project.browser.lesCorrectionsNegativesSontEmpileesSousZero.duvfph": {
    "fr": "Les corrections négatives sont empilées sous zéro. La ligne Total indique la somme nette des employés.",
    "nl": "Negatieve correcties worden onder nul gestapeld. De totaallijn toont de nettosom van de medewerkers."
  },
  "project.browser.planifie.1urbp38": {
    "fr": "{p0} planifié{p1}",
    "nl": "{p0} gepland{p1}"
  },
  "project.browser.totalDuProjet.1gwm8km": {
    "fr": "Total du projet",
    "nl": "Projecttotaal"
  },
  "project.browser.cumule.k6ftxa": {
    "fr": " cumulé",
    "nl": " cumulatief"
  },
  "project.browser.totalCumuleDuProjet.imrt4l": {
    "fr": "Total cumulé du projet",
    "nl": "Cumulatief projecttotaal"
  },
  "project.browser.conventionCumuleeProrataJournalier.xnbvk7": {
    "fr": "Convention cumulée · prorata journalier",
    "nl": "Cumulatieve overeenkomst · dagverhouding"
  },
  "project.browser.choisirUnEmployeOuAfficherTousLes.1gq4dq5": {
    "fr": "Choisir un employé ou afficher tous les employés",
    "nl": "Een medewerker kiezen of alle medewerkers weergeven"
  },
  "project.browser.afficherTousLesEmployes.1krklem": {
    "fr": "Afficher tous les employés",
    "nl": "Alle medewerkers weergeven"
  },
  "project.browser.courbePointillee.1lgkiks": {
    "fr": "courbe pointillée",
    "nl": "stippellijn"
  },
  "project.browser.courbePleineEpaisse.jxmab0": {
    "fr": "courbe pleine épaisse",
    "nl": "dikke doorlopende lijn"
  },
  "project.browser.courbePleine.shngv4": {
    "fr": "courbe pleine",
    "nl": "doorlopende lijn"
  },
  "project.browser.aireEmpilee.2stcmz": {
    "fr": "aire empilée",
    "nl": "gestapeld vlak"
  },
  "project.browser.ormitter.1aqkj5": {
    "fr": "Ormitter",
    "nl": "Ormitter"
  },
  "project.browser.deEtEnHeuresEtIndependammentDe.1uh3hr": {
    "fr": "{p0} {p1}de {p2}, {p3} et en heures, {p4} et indépendamment de la période sélectionnée. Flèches gauche et droite pour parcourir les mois.",
    "nl": "{p0} {p1}van {p2}, {p3} in uren, {p4} en onafhankelijk van de geselecteerde periode. Gebruik de linker- en rechterpijl om de maanden te doorlopen."
  },
  "project.browser.evolutionCumulee.11wbt3u": {
    "fr": "Évolution cumulée",
    "nl": "Cumulatieve evolutie"
  },
  "project.browser.duPlanning.157l591": {
    "fr": "du planning ",
    "nl": "van de planning "
  },
  "project.browser.realiseEtPrevuEnLignes.1o8okhe": {
    "fr": "réalisé et prévu en lignes",
    "nl": "gepresteerd en gepland als lijnen"
  },
  "project.browser.enAiresEmpilees.gk119g": {
    "fr": "en aires empilées",
    "nl": "als gestapelde vlakken"
  },
  "project.browser.surTouteLaDureeDuProjet.1d8ne0n": {
    "fr": "sur toute la durée du projet",
    "nl": "over de volledige projectduur"
  },
  "project.browser.depuisLeDebutDuProjet.f544wl": {
    "fr": "depuis le début du projet",
    "nl": "sinds de projectstart"
  },
  "project.browser.survolezOuTouchezUnMoisPourLe.zf2mw9": {
    "fr": "Survolez ou touchez un mois pour le détail. Au clavier : flèches gauche/droite, Début/Fin ; Échap ferme le détail.",
    "nl": "Beweeg over een maand of raak deze aan voor details. Toetsenbord: linker-/rechterpijl, Home/End; Escape sluit het detail."
  },
  "project.browser.realise.9jp52q": {
    "fr": "{p0} · Réalisé{p1}",
    "nl": "{p0} · Gepresteerd{p1}"
  },
  "project.browser.conventionCumulee.13mnilu": {
    "fr": "Convention cumulée",
    "nl": "Cumulatieve overeenkomst"
  },
  "project.browser.convention.1b9uycy": {
    "fr": "Convention",
    "nl": "Overeenkomst"
  },
  "project.browser.voirLesValeursCumuleesParMois.1j9d1nh": {
    "fr": "Voir les valeurs cumulées par mois",
    "nl": "Cumulatieve waarden per maand bekijken"
  },
  "project.browser.voirLesValeursExactesParMois.1jvpbnt": {
    "fr": "Voir les valeurs exactes par mois",
    "nl": "Exacte waarden per maand bekijken"
  },
  "project.browser.heuresDeDepuisLeDebutDuProjet.ft4s16": {
    "fr": "Heures {p0} de {p1} depuis le début du projet, indépendamment de la période sélectionnée",
    "nl": "Uren {p0} van {p1} sinds de projectstart, onafhankelijk van de geselecteerde periode"
  },
  "project.browser.cumulees.bwck2k": {
    "fr": "cumulées",
    "nl": "cumulatief"
  },
  "project.browser.mois.s4y96t": {
    "fr": "Mois",
    "nl": "Maand"
  },
  "project.browser.heuresCumulees.15h9vda": {
    "fr": "Heures cumulées",
    "nl": "Cumulatieve uren"
  },
  "project.browser.heuresParMois.1ha1m2e": {
    "fr": "Heures par mois",
    "nl": "Uren per maand"
  },
  "project.browser.realiseAfficherLeDetail.xkcmqu": {
    "fr": "{p0} : {p1}, {p2} réalisé{p3} ; {p4}, {p5}. Afficher le détail.",
    "nl": "{p0}: {p1}, {p2} gepresteerd{p3}; {p4}, {p5}. Detail weergeven."
  },
  "project.browser.afficherLeDetail.1r4gjbk": {
    "fr": "{p0} : {p1} {p2}. Afficher le détail.",
    "nl": "{p0}: {p1} {p2}. Detail weergeven."
  },
  "project.browser.planifiees.1f4tf6n": {
    "fr": "planifiées",
    "nl": "gepland"
  },
  "project.browser.auTotal.1jwlw1": {
    "fr": "au total",
    "nl": "in totaal"
  },
  "project.browser.dureeTotaleDuProjet.1egner8": {
    "fr": "Durée totale du projet",
    "nl": "Volledige projectduur"
  },
  "project.browser.vueDuProjet.1kmjl1s": {
    "fr": "Vue du projet",
    "nl": "Projectweergave"
  },
  "project.browser.heures.q1d82l": {
    "fr": "Heures",
    "nl": "Uren"
  },
  "project.browser.budget.auevmw": {
    "fr": "Budget",
    "nl": "Budget"
  },
  "project.browser.realises.buswm7": {
    "fr": "{p0} réalisés",
    "nl": "{p0} gepresteerd"
  },
  "project.browser.surLesDatesDuProjet.hvbstv": {
    "fr": "Sur les dates du projet",
    "nl": "Over de projectdatums"
  },
  "project.browser.surLaPeriodeSelectionnee.pphm6": {
    "fr": "Sur la période sélectionnée",
    "nl": "Over de geselecteerde periode"
  },
  "project.browser.tousLesEmployes.13yop4z": {
    "fr": "{p0} · tous les employés ({p1})",
    "nl": "{p0} · alle medewerkers ({p1})"
  },
  "project.browser.heuresDuProjet.o2jfc6": {
    "fr": "Heures du projet",
    "nl": "Projecturen"
  },
  "project.browser.conventionDureeDuProjet.12ze0a4": {
    "fr": "Convention · durée du projet ({p0})",
    "nl": "Overeenkomst · projectduur ({p0})"
  },
  "project.browser.duAuHorsPeriodeSelectionnee.uf3780": {
    "fr": "Du {p0} au {p1} · hors période sélectionnée",
    "nl": "Van {p0} tot {p1} · buiten de geselecteerde periode"
  },
  "project.browser.datesDuProjetIndisponiblesHorsPeriodeSelectionnee.nktreb": {
    "fr": "Dates du projet indisponibles · hors période sélectionnée",
    "nl": "Projectdatums niet beschikbaar · buiten de geselecteerde periode"
  },
  "project.browser.repereLineaireDuAuPeriodeSelectionneeDans.ph6wjx": {
    "fr": "Repère linéaire du {p0} au {p1} · période sélectionnée dans les dates du projet.",
    "nl": "Lineaire referentie van {p0} tot {p1} · geselecteerde periode binnen de projectdatums."
  },
  "project.browser.prevu.laxr1v": {
    "fr": "Prévu",
    "nl": "Gepland"
  },
  "project.browser.realise.1mgjmgg": {
    "fr": "Réalisé",
    "nl": "Gepresteerd"
  },
  "project.browser.chargementDesHeures.zt1p2v": {
    "fr": "Chargement des heures…",
    "nl": "Uren laden…"
  },
  "project.browser.budgetPersonnelBWNonRenseigneDemandezAu.3gj8ma": {
    "fr": "Budget personnel BW non renseigné. Demandez au MIS de mettre ce champ à jour.",
    "nl": "BW-personeelsbudget niet ingevuld. Vraag de MIS om dit veld bij te werken."
  },
  "project.browser.realisesSurLesDatesDuProjetA.q4o8qk": {
    "fr": "{p0} : {p1}, {p2} réalisés sur les dates du projet à ce jour.",
    "nl": "{p0}: {p1}, {p2} gepresteerd over de projectdatums tot vandaag."
  },
  "project.browser.prevusSurLaPeriodeRealisesACe.1qre3hq": {
    "fr": "{p0} : {p1} prévus sur la période, {p2} réalisés à ce jour.",
    "nl": "{p0}: {p1} gepland in de periode, {p2} gepresteerd tot vandaag."
  },
  "project.browser.realiseCompte.zsnv34": {
    "fr": "Réalisé compté",
    "nl": "Meegeteld gepresteerd"
  },
  "project.browser.realises.182d1j4": {
    "fr": "{p0} : {p1} réalisés",
    "nl": "{p0}: {p1} gepresteerd"
  },
  "project.browser.heuresIgnorees.1e7728t": {
    "fr": "Heures ignorées : {p0}",
    "nl": "Genegeerde uren: {p0}"
  },
  "project.browser.repereDuJourDeLaPeriodeEcoulee.t28y72": {
    "fr": " Repère du jour : {p0} de la période écoulée.",
    "nl": " Referentie vandaag: {p0} van de periode verstreken."
  },
  "project.browser.surpointage.116gb9s": {
    "fr": "Surpointage",
    "nl": "Te veel geregistreerd"
  },
  "project.browser.surpointageLeRealiseDepasseLeMaximumPlanifie.klodvv": {
    "fr": " Surpointage : le réalisé dépasse le maximum planifié de la période (rouge).",
    "nl": " Te veel geregistreerd: de gepresteerde uren overschrijden het geplande maximum van de periode (rood)."
  },
  "project.browser.surpointageLeRealiseDepasseLeRepereLineaire.1qnmh94": {
    "fr": " Surpointage : le réalisé dépasse le repère linéaire d’aujourd’hui (orange).",
    "nl": " Te veel geregistreerd: de gepresteerde uren overschrijden de lineaire referentie van vandaag (oranje)."
  },
  "project.browser.heuresCompteesHeuresIgnoreesLaLongueurTotale.1wrj1nl": {
    "fr": " Heures comptées : {p0}. Heures ignorées : {p1}. La longueur totale, le planning et le repère du jour restent inchangés.",
    "nl": " Meegetelde uren: {p0}. Genegeerde uren: {p1}. De totale lengte, planning en referentie van vandaag blijven gelijk."
  },
  "project.browser.heuresIgnorees.1m1pe05": {
    "fr": "Heures ignorées",
    "nl": "Genegeerde uren"
  },
  "project.browser.repartitionDuRealiseSansEchelleConventionnelle.sr6hjd": {
    "fr": "Répartition du réalisé · sans échelle conventionnelle.",
    "nl": "Verdeling gepresteerde uren · zonder schaal van de overeenkomst."
  },
  "project.browser.conventionBudgetPersonnelBWRepartiLineairementSur.2yukvi": {
    "fr": "Convention : Budget personnel BW, réparti linéairement sur les dates du projet ; le repère du jour suit le calendrier.",
    "nl": "Overeenkomst: BW-personeelsbudget, lineair verdeeld over de projectdatums; de referentie van vandaag volgt de kalender."
  },
  "project.browser.prevuRepartiLineairementSurLaPeriodeSelectionnee.hy20xr": {
    "fr": "Prévu réparti linéairement sur la période sélectionnée, dans les dates du projet ; le repère du jour suit cette période.",
    "nl": "Planning lineair verdeeld over de geselecteerde periode, binnen de projectdatums; de referentie van vandaag volgt deze periode."
  },
  "project.browser.prevuSurLaPeriodeSelectionneeRepereLineaire.9dyxy3": {
    "fr": "Prévu sur la période sélectionnée ; repère linéaire indisponible sans dates valides du projet.",
    "nl": "Planning over de geselecteerde periode; lineaire referentie niet beschikbaar zonder geldige projectdatums."
  },
  "project.browser.prevuRepartiLineairementSurLaPeriodeSelectionnee.8eubvq": {
    "fr": "Prévu réparti linéairement sur la période sélectionnée ; le repère du jour suit le calendrier.",
    "nl": "Planning lineair verdeeld over de geselecteerde periode; de referentie van vandaag volgt de kalender."
  },
  "project.browser.horsPlanningAucuneHeurePrevueSurLa.1qfh1gb": {
    "fr": "Hors planning · aucune heure prévue sur la période.",
    "nl": "Buiten planning · geen geplande uren in de periode."
  },
  "project.browser.planningIndisponibleEchelleDeComparaisonIndisponible.1ik4cue": {
    "fr": "Planning indisponible · échelle de comparaison indisponible.",
    "nl": "Planning niet beschikbaar · vergelijkingsschaal niet beschikbaar."
  },
  "project.browser.planningNetNegatifApresCorrectionsEchelleDe.2qpgbq": {
    "fr": "Planning net négatif après corrections · échelle de comparaison indisponible.",
    "nl": "Negatieve nettoplanning na correcties · vergelijkingsschaal niet beschikbaar."
  },
  "project.browser.aucuneHeurePrevueEchelleDeComparaisonIndisponible.xg8t6k": {
    "fr": "Aucune heure prévue · échelle de comparaison indisponible.",
    "nl": "Geen geplande uren · vergelijkingsschaal niet beschikbaar."
  },
  "project.browser.datesDuProjetAbsentesOuInvalidesLe.1yvf6os": {
    "fr": "Dates du projet absentes ou invalides ; le réalisé est indisponible.",
    "nl": "Projectdatums ontbreken of zijn ongeldig; gepresteerde uren niet beschikbaar."
  },
  "project.browser.repereDuJourIndisponibleDatesDuProjet.1qrayht": {
    "fr": "Repère du jour indisponible · dates du projet absentes, invalides ou hors de la période sélectionnée.",
    "nl": "Referentie van vandaag niet beschikbaar · projectdatums ontbreken, zijn ongeldig of vallen buiten de geselecteerde periode."
  },
  "project.browser.laBarreMontreLeRealiseNetLes.3bekl1": {
    "fr": "La barre montre le réalisé net. Les corrections négatives restent dans le détail signé ; elles ne sont pas dessinées comme des surfaces positives.",
    "nl": "De balk toont de gepresteerde netto-uren. Negatieve correcties blijven in het detail met hun teken; ze worden niet als positieve oppervlakken getekend."
  },
  "project.browser.leDetailParEmployeNeSeReconcilie.tdwzu2": {
    "fr": "Le détail par employé ne se réconcilie pas avec le total affiché ; la barre conserve le total net.",
    "nl": "Het detail per medewerker sluit niet aan op het getoonde totaal; de balk behoudt het nettototaal."
  },
  "project.browser.heuresRealiseesParEmploye.wvx7lw": {
    "fr": "Heures réalisées par employé",
    "nl": "Gepresteerde uren per medewerker"
  },
  "project.browser.lesHeuresDe.1f88ez9": {
    "fr": "{p0} les heures de {p1} : {p2}.",
    "nl": "{p0} de uren van {p1}: {p2}."
  },
  "project.browser.reintegrer.ou9oeq": {
    "fr": "Réintégrer",
    "nl": "Opnieuw meetellen"
  },
  "project.browser.ignorer.9a8udf": {
    "fr": "Ignorer",
    "nl": "Negeren"
  },
  "project.browser.realisesAfficherLeDetail.1tai6q2": {
    "fr": "{p0} : {p1} réalisés. Afficher le détail.",
    "nl": "{p0}: {p1} gepresteerd. Detail weergeven."
  },
  "project.browser.heuresCompteesHeuresIgnoreesTotalRealiseLe.1d88zcp": {
    "fr": "Heures comptées : {p0} · Heures ignorées : {p1} · Total réalisé : {p2}. Le planning et le repère du jour restent inchangés.",
    "nl": "Meegetelde uren: {p0} · Genegeerde uren: {p1} · Totaal gepresteerd: {p2}. De planning en de referentie van vandaag blijven gelijk."
  },
  "project.browser.totalRealiseDetaille.1v5vh3e": {
    "fr": "Total réalisé détaillé : {p0}",
    "nl": "Gedetailleerd gepresteerd totaal: {p0}"
  },
  "project.browser.deLaConvention.984x34": {
    "fr": "de la convention",
    "nl": "de overeenkomst"
  },
  "project.browser.duPrevu.q9w2za": {
    "fr": "du prévu",
    "nl": "de planning"
  },
  "project.browser.barrePlafonneeAuDela.xn1dic": {
    "fr": "Barre plafonnée · +{p0} au-delà {p1}",
    "nl": "Balk begrensd · +{p0} boven {p1}"
  },
  "project.browser.auDela.1by8cjt": {
    "fr": "+{p0} au-delà {p1}",
    "nl": "+{p0} boven {p1}"
  },
  "project.browser.plusQuePrevuesDisponibles.vlno8z": {
    "fr": "Plus que {p0} prévues disponibles{p1}",
    "nl": "Nog {p0} geplande uren beschikbaar{p1}"
  },
  "project.browser.dIciAu.gbhlm5": {
    "fr": " d’ici au {p0}",
    "nl": " tot {p0}"
  },
  "project.browser.surLaPeriodeSelectionneeDateDeFin.1s6zmzj": {
    "fr": " sur la période sélectionnée (date de fin indisponible)",
    "nl": " in de geselecteerde periode (einddatum niet beschikbaar)"
  },
  "project.browser.realiseNegatifApresCorrectionsLeTotalSigne.jzbfxe": {
    "fr": "Réalisé négatif après corrections ; le total signé est conservé.",
    "nl": "Negatieve gepresteerde uren na correcties; het totaal met teken blijft behouden."
  },
  "project.browser.reessayer.1eklqww": {
    "fr": "Réessayer",
    "nl": "Opnieuw proberen"
  },
  "project.browser.aucunProjetAvecDesHeuresPrevuesOu.ofpau6": {
    "fr": "Aucun projet avec des heures prévues ou réalisées sur cette période.",
    "nl": "Geen project met geplande of gepresteerde uren in deze periode."
  },
  "project.browser.choisirUnProjet.1zoqej": {
    "fr": "Choisir un projet",
    "nl": "Een project kiezen"
  },
  "project.browser.responsableIndisponible.5oo2wv": {
    "fr": "Responsable indisponible",
    "nl": "Verantwoordelijke niet beschikbaar"
  },
  "project.browser.photoDuResponsable.1avcx9i": {
    "fr": "Photo du responsable",
    "nl": "Foto van de verantwoordelijke"
  },
  "project.browser.horsOrmitters.1dqprly": {
    "fr": "Hors Ormitters",
    "nl": "Zonder Ormitters"
  },
  "project.browser.ormittersInclus.1vjemeq": {
    "fr": "Ormitters inclus",
    "nl": "Ormitters inbegrepen"
  },
  "project.browser.horsOrmitters.v90iw6": {
    "fr": "hors Ormitters",
    "nl": "zonder Ormitters"
  },
  "project.browser.totalIndividuel.1k2ikus": {
    "fr": "Total individuel",
    "nl": "Individueel totaal"
  },
  "project.browser.conventionProrataJournalier.1y5fz0n": {
    "fr": "Convention · prorata journalier",
    "nl": "Overeenkomst · dagverhouding"
  },
  "project.browser.afficherUniquement.v0fl4e": {
    "fr": "Afficher uniquement",
    "nl": "Alleen weergeven"
  },
  "project.browser.evolutionMensuelle.2rp778": {
    "fr": "Évolution mensuelle",
    "nl": "Maandelijkse evolutie"
  },
  "project.browser.mensuelles.1w90zce": {
    "fr": "mensuelles",
    "nl": "per maand"
  },
  "project.browser.moisEnCours.1xh7y3r": {
    "fr": "Mois · * en cours",
    "nl": "Maand · * lopend"
  },
  "project.browser.budgetConventionnelIndisponible.17bl09w": {
    "fr": "budget conventionnel indisponible",
    "nl": "budget van de overeenkomst niet beschikbaar"
  },
  "project.browser.budgetPersonnelBWIndisponibleImpossibleDeLire.116ezr3": {
    "fr": "Budget personnel BW indisponible. Impossible de lire ce champ dans Odoo.",
    "nl": "BW-personeelsbudget niet beschikbaar. Dit veld kan niet in Odoo worden gelezen."
  },
  "project.browser.heuresIndisponibles.1snb9vs": {
    "fr": "Heures indisponibles.",
    "nl": "Uren niet beschikbaar."
  },
  "project.browser.laVueBudgetEstIndisponibleRechargezLe.a0hrbj": {
    "fr": "La vue Budget est indisponible. Rechargez le tableau de bord.",
    "nl": "De budgetweergave is niet beschikbaar. Laad het dashboard opnieuw."
  },
  "project.browser.tousLesProjets.swzqmr": {
    "fr": "Tous les projets",
    "nl": "Alle projecten"
  },
  "project.browser.chargementDeMesProjets.1b3kx9q": {
    "fr": "Chargement de mes projets…",
    "nl": "Mijn projecten laden…"
  },
  "project.browser.responsable.13gup33": {
    "fr": "Responsable : {p0}",
    "nl": "Verantwoordelijke: {p0}"
  },
  "project.browser.photoDe.1du8mqi": {
    "fr": "Photo de {p0}",
    "nl": "Foto van {p0}"
  },
  "project.browser.enDessous.dgs1yg": {
    "fr": "−{p0} en-dessous {p1}",
    "nl": "−{p0} onder {p1}"
  },
  "project.browser.joursCalendaires.1jc1k9e": {
    "fr": " ({p0} jours calendaires)",
    "nl": " ({p0} kalenderdagen)"
  },
  "project.browser.etAutre.1r1py1h": {
    "fr": " ; et {p0} autre{p1}",
    "nl": " ; en {p0} andere{p1}"
  },
  "project.browser.en.1176rxd": {
    "fr": "{p0} en {p1}",
    "nl": "{p0} in {p1}"
  },
  "project.browser.et.1gc6hrz": {
    "fr": "{p0} et {p1}",
    "nl": "{p0} en {p1}"
  },
  "project.browser.projets01VueDEnsemble.qczmgn": {
    "fr": "Projets · 01 / Vue d’ensemble",
    "nl": "Projecten · 01 / Overzicht"
  },
  "project.browser.projets02CalendrierDesProjets.ki8buc": {
    "fr": "Projets · 02 / Calendrier des projets",
    "nl": "Projecten · 02 / Projectkalender"
  },
  "project.browser.ressource.18ho8hs": {
    "fr": "Ressource {p0}",
    "nl": "Resource {p0}"
  },
  "project.browser.calendaires.x4mz8c": {
    "fr": "calendaires",
    "nl": "kalenderdagen"
  },
  "project.browser.today": {
    "fr": "Aujourd’hui",
    "nl": "Vandaag"
  },
  "project.browser.actualExclusion": {
    "fr": "Hors Ormitters{through}.",
    "nl": "Zonder Ormitters{through}."
  },
  "project.browser.datesUnavailable": {
    "fr": "Dates indisponibles",
    "nl": "Datums niet beschikbaar"
  },
  "project.browser.calendarDay": {
    "fr": " · {count} jour calendaire",
    "nl": " · {count} kalenderdag"
  },
  "project.browser.calendarDays": {
    "fr": " · {count} jours calendaires",
    "nl": " · {count} kalenderdagen"
  },
  "project.browser.otherGap": {
    "fr": " ; et {count} autre période",
    "nl": " ; en {count} andere periode"
  },
  "project.browser.otherGaps": {
    "fr": " ; et {count} autres périodes",
    "nl": " ; en {count} andere periodes"
  },
  "project.browser.unlinkedResource": {
    "fr": "{count} autre ressource sans personne attribuée",
    "nl": "{count} andere resource zonder toegewezen persoon"
  },
  "project.browser.ignoreEmployeeHours": {
    "fr": "Ignorer les heures de {name} : {hours}.",
    "nl": "De uren van {name} negeren: {hours}."
  },
  "project.browser.restoreEmployeeHours": {
    "fr": "Réintégrer les heures de {name} : {hours}.",
    "nl": "De uren van {name} opnieuw meetellen: {hours}."
  },
  "project.browser.conventionHoursCaption": {
    "fr": "{hours} conventionnelles",
    "nl": "{hours} volgens de overeenkomst"
  },
  "project.browser.unlinkedResources": {
    "fr": "{count} autres ressources sans personne attribuée",
    "nl": "{count} andere resources zonder toegewezen persoon"
  },
  "project.browser.fullActualBadge": {
    "fr": "Total réalisé, heures ignorées incluses · {detail}",
    "nl": "Totaal gepresteerd, inclusief genegeerde uren · {detail}"
  },
  "project.browser.fullActualBadgeReference": {
    "fr": "Écart calculé sur le total réalisé, heures ignorées incluses.",
    "nl": "Afwijking berekend op het totaal gepresteerd, inclusief genegeerde uren."
  }
};
});

(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./i18n") : root.DashboardI18n);
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (I18n) {
  "use strict";
  I18n.register({
  "common.unavailable": {
    "fr": "Indisponible",
    "nl": "Niet beschikbaar"
  },
  "common.project": {
    "fr": "Projet",
    "nl": "Project"
  },
  "common.start": {
    "fr": "Début",
    "nl": "Start"
  },
  "common.end": {
    "fr": "Fin",
    "nl": "Einde"
  },
  "common.totalBudget": {
    "fr": "Budget total",
    "nl": "Totaalbudget"
  },
  "common.managerUnavailable": {
    "fr": "Responsable indisponible",
    "nl": "Projectverantwoordelijke niet beschikbaar"
  },
  "common.managerUnavailableSentence": {
    "fr": "Responsable indisponible. ",
    "nl": "Projectverantwoordelijke niet beschikbaar. "
  },
  "common.currencyUnavailable": {
    "fr": "· devise indisponible",
    "nl": "· valuta niet beschikbaar"
  },
  "common.retry": {
    "fr": "Réessayer",
    "nl": "Opnieuw proberen"
  },
  "common.close": {
    "fr": "Fermer",
    "nl": "Sluiten"
  },
  "common.show": {
    "fr": "Afficher",
    "nl": "Tonen"
  },
  "common.hide": {
    "fr": "Masquer",
    "nl": "Verbergen"
  },
  "common.dateUnavailable": {
    "fr": "date indisponible",
    "nl": "datum niet beschikbaar"
  },
  "common.dateUnavailableCapital": {
    "fr": "Date indisponible",
    "nl": "Datum niet beschikbaar"
  },
  "common.loading": {
    "fr": "Chargement…",
    "nl": "Laden…"
  },
  "common.selectedPeriod": {
    "fr": "Période sélectionnée",
    "nl": "Geselecteerde periode"
  },
  "common.periodUnavailable": {
    "fr": "Période indisponible",
    "nl": "Periode niet beschikbaar"
  },
  "common.unknownYear": {
    "fr": "Année inconnue",
    "nl": "Onbekend jaar"
  },
  "common.unspecifiedYear": {
    "fr": "Année non précisée",
    "nl": "Jaar niet opgegeven"
  },
  "common.dayUnit": {
    "fr": "jours",
    "nl": "dagen"
  },
  "common.workingDayUnit": {
    "fr": "jours de travail",
    "nl": "werkdagen"
  },
  "common.estimate": {
    "fr": "Estimation",
    "nl": "Raming"
  },
  "common.planned": {
    "fr": "Prévu",
    "nl": "Gepland"
  },
  "common.planningUnavailable": {
    "fr": "Planning indisponible",
    "nl": "Planning niet beschikbaar"
  },
  "common.actualUnavailable": {
    "fr": "Réalisé indisponible",
    "nl": "Gepresteerde uren niet beschikbaar"
  },
  "common.actualToDate": {
    "fr": "Réalisé à ce jour",
    "nl": "Gepresteerd tot vandaag"
  },
  "common.outsidePlanning": {
    "fr": "Hors planning",
    "nl": "Buiten planning"
  },
  "common.myTime": {
    "fr": "Mon temps",
    "nl": "Mijn tijd"
  },
  "common.myProjects": {
    "fr": "Mes projets",
    "nl": "Mijn projecten"
  },
  "common.overview": {
    "fr": "Vue d’ensemble",
    "nl": "Overzicht"
  },
  "personal.noProject": {
    "fr": "Sans projet",
    "nl": "Zonder project"
  },
  "personal.selectedPeriodLower": {
    "fr": "sur la période sélectionnée",
    "nl": "over de geselecteerde periode"
  },
  "personal.periodUnknown": {
    "fr": "Période ou date indisponible",
    "nl": "Periode of datum niet beschikbaar"
  },
  "personal.negativePlanning": {
    "fr": "Planning négatif",
    "nl": "Negatieve planning"
  },
  "personal.negativeCorrections": {
    "fr": "Corrections d’heures négatives",
    "nl": "Negatieve urencorrecties"
  },
  "personal.invalidProjectDates": {
    "fr": "Dates de projet indisponibles ou incohérentes",
    "nl": "Projectdatums niet beschikbaar of tegenstrijdig"
  },
  "personal.annualPlanningUnreconciled": {
    "fr": "Planning annuel indisponible ou non réconcilié",
    "nl": "Jaarplanning niet beschikbaar of niet afgestemd"
  },
  "personal.annualPlanningUnavailable": {
    "fr": "Planning annuel indisponible",
    "nl": "Jaarplanning niet beschikbaar"
  },
  "personal.planningOutsideDates": {
    "fr": "Planning hors des dates du projet",
    "nl": "Planning buiten de projectdatums"
  },
  "personal.projectOutsidePeriod": {
    "fr": "Projet hors de la période sélectionnée",
    "nl": "Project buiten de geselecteerde periode"
  },
  "personal.projectNotStarted": {
    "fr": "Projet non commencé",
    "nl": "Project nog niet gestart"
  },
  "personal.periodNotActive": {
    "fr": "Période non active aujourd’hui",
    "nl": "Periode vandaag niet actief"
  },
  "personal.recommendationsAria": {
    "fr": "Recommandations de rythme",
    "nl": "Aanbevelingen voor tijdsbesteding"
  },
  "personal.showReasons": {
    "fr": "Voir les raisons",
    "nl": "Redenen bekijken"
  },
  "personal.tolerance": {
    "fr": "Tolérance",
    "nl": "Tolerantie"
  },
  "personal.toleranceHelp": {
    "fr": "La tolérance classe les écarts au prévu linéaire à ce jour. « Arrêter (ou clarifier) » indique un projet terminé, sans planning personnel restant ou au budget BW consommé.",
    "nl": "De tolerantie bepaalt de afwijking van de lineaire planning tot vandaag. “Stoppen (of verduidelijken)” duidt op een beëindigd project, zonder resterende persoonlijke planning of met een opgebruikt BW-budget."
  },
  "personal.stop": {
    "fr": "Arrêter (ou clarifier)",
    "nl": "Stoppen (of verduidelijken)"
  },
  "personal.slow": {
    "fr": "Ralentir",
    "nl": "Vertragen"
  },
  "personal.increase": {
    "fr": "Augmenter",
    "nl": "Verhogen"
  },
  "personal.continue": {
    "fr": "Continuer",
    "nl": "Doorgaan"
  },
  "personal.noPaceBeforeStart": {
    "fr": "Projet non commencé ; pas de rythme conseillé.",
    "nl": "Project nog niet gestart; nog geen aanbevolen tempo."
  },
  "personal.maximum": {
    "fr": "Max.",
    "nl": "Max."
  },
  "personal.target": {
    "fr": "Cible",
    "nl": "Doel"
  },
  "personal.aboveThe": {
    "fr": "au-dessus du",
    "nl": "boven de"
  },
  "personal.belowThe": {
    "fr": "en-dessous du",
    "nl": "onder de"
  },
  "personal.differenceWithThe": {
    "fr": "d’écart avec le",
    "nl": "verschil met de"
  },
  "personal.above": {
    "fr": "au-dessus",
    "nl": "boven"
  },
  "personal.below": {
    "fr": "en-dessous",
    "nl": "onder"
  },
  "personal.paceGapUnknown": {
    "fr": "Écart au prévu à ce jour indisponible.",
    "nl": "Afwijking van de planning tot vandaag niet beschikbaar."
  },
  "personal.projectEnded": {
    "fr": "Projet terminé",
    "nl": "Project beëindigd"
  },
  "personal.bwBudgetConsumed": {
    "fr": "Budget BW consommé",
    "nl": "BW-budget opgebruikt"
  },
  "personal.notPlanned": {
    "fr": "Non planifié",
    "nl": "Niet gepland"
  },
  "personal.reasonUnknown": {
    "fr": "Motif indisponible",
    "nl": "Reden niet beschikbaar"
  },
  "personal.noExpectedYet": {
    "fr": "Aucun prévu attendu à ce jour",
    "nl": "Tot vandaag nog geen uren verwacht"
  },
  "personal.noProjects": {
    "fr": "Aucun projet",
    "nl": "Geen projecten"
  },
  "personal.pieDescription": {
    "fr": "Le prévu dessine les parts ; le réalisé les remplit, jusqu’à aujourd’hui.",
    "nl": "De planning bepaalt de sectoren; de gepresteerde uren tot vandaag vullen ze op."
  },
  "personal.plannedInPeriod": {
    "fr": "Prévu sur la période",
    "nl": "Gepland in de periode"
  },
  "personal.partialPlanning": {
    "fr": "Planning partiel ou indisponible",
    "nl": "Planning onvolledig of niet beschikbaar"
  },
  "personal.displayedProjects": {
    "fr": "Sur les projets affichés",
    "nl": "Voor de getoonde projecten"
  },
  "personal.correctionsIncluded": {
    "fr": "Corrections d’heures incluses",
    "nl": "Urencorrecties inbegrepen"
  },
  "personal.legendHelp": {
    "fr": "Sélectionnez un projet pour le masquer ou l’afficher.",
    "nl": "Selecteer een project om het te verbergen of te tonen."
  },
  "personal.negativeActual": {
    "fr": "Solde réalisé négatif après corrections.",
    "nl": "Negatief gepresteerd saldo na correcties."
  },
  "personal.pieAria": {
    "fr": "Répartition des heures prévues par projet et réalisé à ce jour",
    "nl": "Verdeling van geplande uren per project en gepresteerde uren tot vandaag"
  },
  "personal.pieAreaNote": {
    "fr": "La surface colorée représente le réalisé. Les dépassements restent indiqués dans la légende.",
    "nl": "Het gekleurde oppervlak toont de gepresteerde uren. Overschrijdingen blijven zichtbaar in de legenda."
  },
  "personal.calendarNote": {
    "fr": " Le cercle suit le calendrier de façon linéaire, indépendamment des dates du planning.",
    "nl": " De cirkel volgt de kalender lineair, onafhankelijk van de planningsdatums."
  },
  "personal.allHidden": {
    "fr": "Tous les projets sont masqués",
    "nl": "Alle projecten zijn verborgen"
  },
  "personal.noHoursPeriod": {
    "fr": "Aucune heure pour cette période",
    "nl": "Geen uren in deze periode"
  },
  "personal.noPlannedHours": {
    "fr": "Aucune heure prévue",
    "nl": "Geen uren gepland"
  },
  "personal.showProjectHelp": {
    "fr": "Affichez un projet dans la légende pour retrouver le graphique.",
    "nl": "Toon een project in de legenda om de grafiek opnieuw te zien."
  },
  "personal.changePeriodHelp": {
    "fr": "Choisissez une autre période ou actualisez vos données.",
    "nl": "Kies een andere periode of vernieuw uw gegevens."
  },
  "personal.noPiePlanning": {
    "fr": "Le réalisé reste disponible dans la légende ; aucune répartition prévue ne peut être dessinée.",
    "nl": "De gepresteerde uren blijven beschikbaar in de legenda; een geplande verdeling kan niet worden getekend."
  },
  "personal.showAll": {
    "fr": "Tout afficher",
    "nl": "Alles tonen"
  },
  "personal.noPlanBadge": {
    "fr": "Sans heures prévues",
    "nl": "Zonder geplande uren"
  },
  "personal.remainingNoDate": {
    "fr": " sur la période sélectionnée (date de fin indisponible)",
    "nl": " in de geselecteerde periode (einddatum niet beschikbaar)"
  },
  "personal.netCorrection": {
    "fr": "Correction nette",
    "nl": "Nettocorrectie"
  },
  "personal.projectsWithPlan": {
    "fr": "Projets avec heures prévues",
    "nl": "Projecten met geplande uren"
  },
  "personal.planCorrections": {
    "fr": "Corrections de planning",
    "nl": "Planningscorrecties"
  },
  "personal.actualDisplayed": {
    "fr": "réalisés affichés",
    "nl": "getoonde gepresteerde uren"
  },
  "personal.noInvolvedProjects": {
    "fr": "Aucun projet impliqué dans la période sélectionnée.",
    "nl": "Geen betrokken projecten in de geselecteerde periode."
  },
  "capacity.currentScheduleWarning": {
    "fr": "Les horaires actuels sont appliqués aux années sélectionnées ; leurs changements passés ou futurs ne peuvent pas être confirmés.",
    "nl": "Het huidige werkrooster wordt toegepast op de geselecteerde jaren; vroegere of toekomstige wijzigingen kunnen niet worden bevestigd."
  },
  "capacity.personalCalendarUnavailable": {
    "fr": "Le calendrier personnel de travail est indisponible.",
    "nl": "De persoonlijke werkkalender is niet beschikbaar."
  },
  "capacity.collectiveCalendarUnavailable": {
    "fr": "Les jours fériés et fermetures collectives ne sont pas accessibles.",
    "nl": "Feestdagen en collectieve sluitingen zijn niet toegankelijk."
  },
  "capacity.annualRightsUnavailable": {
    "fr": "Les droits annuels de congés ne sont pas accessibles.",
    "nl": "De jaarlijkse verlofrechten zijn niet toegankelijk."
  },
  "capacity.ambiguousIdentity": {
    "fr": "Plusieurs fiches employé sont liées au compte ; la capacité annuelle ne peut pas être déterminée sans identifier la fiche active.",
    "nl": "Er zijn meerdere werknemersfiches aan het account gekoppeld; de jaarcapaciteit kan niet worden bepaald zonder de actieve fiche te identificeren."
  },
  "capacity.accrualUnavailable": {
    "fr": "Les droits de congés acquis progressivement ne peuvent pas être projetés pour l’année avec les données disponibles.",
    "nl": "Geleidelijk opgebouwde verlofrechten kunnen met de beschikbare gegevens niet voor het jaar worden geraamd."
  },
  "capacity.allocationTypeUnknown": {
    "fr": "Le type d’attribution des droits de congés n’est pas confirmé ; la capacité annuelle ne peut pas être calculée.",
    "nl": "Het toekenningstype van de verlofrechten is niet bevestigd; de jaarcapaciteit kan niet worden berekend."
  },
  "capacity.otherLeaveExcluded": {
    "fr": "Les autres catégories de congé sont exclues des droits annuels payés.",
    "nl": "Andere verlofcategorieën zijn uitgesloten van de jaarlijkse betaalde rechten."
  },
  "capacity.heading": {
    "fr": "Capacité de travail et planning",
    "nl": "Werkcapaciteit en planning"
  },
  "capacity.availableHours": {
    "fr": "Heures de travail disponibles",
    "nl": "Beschikbare werkuren"
  },
  "capacity.plannedHours": {
    "fr": "Heures totales planifiées",
    "nl": "Totaal geplande uren"
  },
  "capacity.coverage": {
    "fr": "Pourcentage des heures planifiées",
    "nl": "Percentage geplande uren"
  },
  "capacity.details": {
    "fr": "Voir le calcul par année",
    "nl": "Berekening per jaar bekijken"
  },
  "capacity.policy": {
    "fr": "Calendrier personnel, jours fériés et fermetures collectives, moins les droits annuels de congés payés. Congés sans solde et reports d’années précédentes exclus ; demandes de congé non utilisées.",
    "nl": "Persoonlijke kalender, feestdagen en collectieve sluitingen, verminderd met de jaarlijkse betaalde verlofrechten. Onbetaald verlof en overdrachten uit vorige jaren zijn uitgesloten; verlofaanvragen worden niet gebruikt."
  },
  "capacity.workCalendar": {
    "fr": "Calendrier de travail",
    "nl": "Werkkalender"
  },
  "capacity.holidays": {
    "fr": "Jours fériés et fermetures collectives",
    "nl": "Feestdagen en collectieve sluitingen"
  },
  "capacity.prorataRights": {
    "fr": "Droits de congés payés (prorata)",
    "nl": "Betaalde verlofrechten (pro rata)"
  },
  "capacity.annualRights": {
    "fr": "Droits annuels de congés payés",
    "nl": "Jaarlijkse betaalde verlofrechten"
  },
  "capacity.availableDays": {
    "fr": "Jours de travail disponibles",
    "nl": "Beschikbare werkdagen"
  },
  "capacity.partialRightsEstimate": {
    "fr": "Estimation des congés sur la période sélectionnée par prorata des droits annuels ; demandes de congé non utilisées.",
    "nl": "Verlof in de geselecteerde periode wordt pro rata van de jaarlijkse rechten geraamd; verlofaanvragen worden niet gebruikt."
  },
  "capacity.currentScheduleEstimate": {
    "fr": "Horaires actuels appliqués à cette année ; les changements de régime de travail ne peuvent pas être confirmés.",
    "nl": "Het huidige werkrooster wordt op dit jaar toegepast; wijzigingen in het arbeidsregime kunnen niet worden bevestigd."
  },
  "capacity.annualEstimate": {
    "fr": "Estimation établie à partir des données annuelles disponibles.",
    "nl": "Raming op basis van de beschikbare jaargegevens."
  },
  "capacity.insufficientAnnualSources": {
    "fr": "Calendrier ou droits annuels insuffisants pour calculer la capacité de cette année.",
    "nl": "Onvoldoende kalendergegevens of jaarlijkse rechten om de capaciteit voor dit jaar te berekenen."
  },
  "capacity.detailsLoading": {
    "fr": "Détail du calcul en cours de chargement.",
    "nl": "De details van de berekening worden geladen."
  },
  "capacity.detailsUnavailable": {
    "fr": "Détail annuel indisponible avec les sources accessibles.",
    "nl": "Jaardetails niet beschikbaar met de toegankelijke bronnen."
  },
  "capacity.reading": {
    "fr": "Lecture du calendrier personnel et des droits annuels…",
    "nl": "Persoonlijke kalender en jaarlijkse rechten worden gelezen…"
  },
  "capacity.cannotEstablish": {
    "fr": "La capacité ne peut pas être établie avec les sources disponibles.",
    "nl": "De capaciteit kan niet met de beschikbare bronnen worden vastgesteld."
  },
  "capacity.personalPlanningUnavailable": {
    "fr": "Planning personnel indisponible.",
    "nl": "Persoonlijke planning niet beschikbaar."
  },
  "capacity.fullPlanningScope": {
    "fr": "Toute la période sélectionnée, y compris le planning futur et les projets masqués.",
    "nl": "De volledige geselecteerde periode, inclusief toekomstige planning en verborgen projecten."
  },
  "capacity.coverageUnavailable": {
    "fr": "Le taux nécessite des heures disponibles supérieures à zéro et un planning connu.",
    "nl": "Het percentage vereist meer dan nul beschikbare uren en een bekende planning."
  },
  "capacity.lowCoverage": {
    "fr": "Il est normal de ne pas être planifié à 100% mais dans le cas présent le ratio semble faible. A vérifier avec votre Unit Manager.",
    "nl": "Het is normaal om niet voor 100% gepland te zijn, maar in dit geval lijkt het percentage laag. Bespreek dit met uw Unit Manager."
  },
  "capacity.highCoverage": {
    "fr": "Vous êtes planifié au-delà de 100%. A clarifier avec votre Unit Manager",
    "nl": "U bent voor meer dan 100% gepland. Bespreek dit met uw Unit Manager"
  },
  "capacity.normalCoverage": {
    "fr": "Il est normal de ne pas être planifié à 100%. Cela tient compte des absences maladies notamment.",
    "nl": "Het is normaal om niet voor 100% gepland te zijn. Dit houdt onder meer rekening met ziekteverzuim."
  },
  "capacity.calculating": {
    "fr": "Calcul de la capacité de travail en cours.",
    "nl": "De werkcapaciteit wordt berekend."
  },
  "capacity.unavailableKeepPlanning": {
    "fr": "Capacité de travail indisponible. Les heures planifiées restent affichées lorsqu’elles sont connues.",
    "nl": "Werkcapaciteit niet beschikbaar. Bekende geplande uren blijven zichtbaar."
  },
  "capacity.estimated": {
    "fr": "Capacité estimée à partir des données annuelles disponibles.",
    "nl": "Capaciteit geraamd op basis van de beschikbare jaargegevens."
  },
  "programme.catalogueMismatch": {
    "fr": "Le catalogue reçu ne correspond pas aux trois programmes attendus.",
    "nl": "De ontvangen catalogus komt niet overeen met de drie verwachte programma’s."
  },
  "programme.heading": {
    "fr": "Programmes · 01 / Choisir un programme",
    "nl": "Programma’s · 01 / Kies een programma"
  },
  "programme.loadingPortraits": {
    "fr": "Chargement des portraits…",
    "nl": "Profielfoto’s laden…"
  },
  "programme.choose": {
    "fr": "Choisir un programme",
    "nl": "Kies een programma"
  },
  "programme.structure": {
    "fr": "Structurer",
    "nl": "Structureren"
  },
  "programme.act": {
    "fr": "Agir",
    "nl": "Handelen"
  },
  "programme.make": {
    "fr": "Fabriquer",
    "nl": "Maken"
  },
  "monthly.invalidPlanDates": {
    "fr": "Dates du projet absentes ou invalides ; le planning mensuel est indisponible.",
    "nl": "Projectdatums ontbreken of zijn ongeldig; de maandplanning is niet beschikbaar."
  },
  "monthly.planningUnavailable": {
    "fr": "Le planning mensuel est indisponible avec les données accessibles.",
    "nl": "De maandplanning is niet beschikbaar met de toegankelijke gegevens."
  },
  "monthly.invalidAllocationDates": {
    "fr": "Certaines allocations ont des dates invalides ; le planning mensuel est indisponible.",
    "nl": "Sommige toewijzingen hebben ongeldige datums; de maandplanning is niet beschikbaar."
  },
  "monthly.invalidAllocationHours": {
    "fr": "Certaines allocations ont des heures invalides ; le planning mensuel est indisponible.",
    "nl": "Sommige toewijzingen hebben ongeldige uren; de maandplanning is niet beschikbaar."
  },
  "monthly.resourceUnidentified": {
    "fr": "Ressource non identifiée",
    "nl": "Niet-geïdentificeerde resource"
  },
  "monthly.planningOverflow": {
    "fr": "Les heures planifiées dépassent la capacité de calcul ; le planning mensuel est indisponible.",
    "nl": "De geplande uren overschrijden de rekencapaciteit; de maandplanning is niet beschikbaar."
  },
  "monthly.resourceGroupsWarning": {
    "fr": "Certaines ressources planifiées ne peuvent pas être reliées à un employé confirmé ; leurs heures restent dans des groupes de ressources distincts.",
    "nl": "Sommige geplande resources kunnen niet aan een bevestigde werknemer worden gekoppeld; hun uren blijven in afzonderlijke resourcegroepen."
  },
  "monthly.thWarning": {
    "fr": "Les ressources TH sont des postes à pourvoir ; leurs heures restent incluses dans le planning.",
    "nl": "TH-resources zijn nog in te vullen functies; hun uren blijven opgenomen in de planning."
  },
  "monthly.unknownPlannedFunctions": {
    "fr": "Certaines fonctions planifiées sont inconnues ; leurs heures restent incluses.",
    "nl": "Sommige geplande functies zijn onbekend; hun uren blijven inbegrepen."
  },
  "monthly.roleFallback": {
    "fr": "Certaines fonctions sont déterminées à partir du rôle de planning.",
    "nl": "Sommige functies worden bepaald op basis van de planningsrol."
  },
  "monthly.individualScheduledIdentityUnknown": {
    "fr": "L’identité de certaines allocations ne permet pas de confirmer le planning mensuel individuel.",
    "nl": "De identiteit van sommige toewijzingen laat niet toe de individuele maandplanning te bevestigen."
  },
  "monthly.invalidProjectIdentity": {
    "fr": "Dates ou identité du projet absentes ou invalides ; le planning mensuel est indisponible.",
    "nl": "Projectdatums of -identiteit ontbreken of zijn ongeldig; de maandplanning is niet beschikbaar."
  },
  "monthly.planningTooLong": {
    "fr": "La période dépasse 2 400 mois ; le planning mensuel est indisponible.",
    "nl": "De periode omvat meer dan 2.400 maanden; de maandplanning is niet beschikbaar."
  },
  "monthly.individualDatesInvalid": {
    "fr": "Dates du projet absentes ou invalides ; la référence de planning individuelle est indisponible.",
    "nl": "Projectdatums ontbreken of zijn ongeldig; de individuele planningsreferentie is niet beschikbaar."
  },
  "monthly.individualUnavailable": {
    "fr": "Le planning individuel est indisponible avec les données accessibles.",
    "nl": "De individuele planning is niet beschikbaar met de toegankelijke gegevens."
  },
  "monthly.ambiguousResource": {
    "fr": "L’identité de la ressource est ambiguë ; la référence de planning individuelle est indisponible.",
    "nl": "De identiteit van de resource is dubbelzinnig; de individuele planningsreferentie is niet beschikbaar."
  },
  "monthly.unidentifiedEmployeeReference": {
    "fr": "Employé non identifié ; la référence de planning individuelle est indisponible.",
    "nl": "Werknemer niet geïdentificeerd; de individuele planningsreferentie is niet beschikbaar."
  },
  "monthly.invalidAllocationIdentity": {
    "fr": "Certaines allocations ont une identité invalide ; la référence de planning individuelle est indisponible.",
    "nl": "Sommige toewijzingen hebben een ongeldige identiteit; de individuele planningsreferentie is niet beschikbaar."
  },
  "monthly.unresolvedAllocationIdentity": {
    "fr": "L’identité de certaines allocations ne peut pas être résolue ; la référence de planning individuelle est indisponible.",
    "nl": "De identiteit van sommige toewijzingen kan niet worden vastgesteld; de individuele planningsreferentie is niet beschikbaar."
  },
  "monthly.noAllocationEmployee": {
    "fr": "Certaines allocations ne permettent pas d’identifier l’employé ; sa référence de planning est indisponible.",
    "nl": "Bij sommige toewijzingen kan de werknemer niet worden geïdentificeerd; diens planningsreferentie is niet beschikbaar."
  },
  "monthly.ambiguousAllocationIdentity": {
    "fr": "L’identité de certaines allocations est ambiguë ; la référence de planning individuelle est indisponible.",
    "nl": "De identiteit van sommige toewijzingen is dubbelzinnig; de individuele planningsreferentie is niet beschikbaar."
  },
  "monthly.unlinkedEmployeeResource": {
    "fr": "Certaines ressources ne peuvent pas être reliées à l’employé ; sa référence de planning est indisponible.",
    "nl": "Sommige resources kunnen niet aan de werknemer worden gekoppeld; diens planningsreferentie is niet beschikbaar."
  },
  "monthly.invalidIndividualDates": {
    "fr": "Certaines allocations ont des dates invalides ; la référence de planning individuelle est indisponible.",
    "nl": "Sommige toewijzingen hebben ongeldige datums; de individuele planningsreferentie is niet beschikbaar."
  },
  "monthly.invalidIndividualHours": {
    "fr": "Certaines allocations ont des heures invalides ; la référence de planning individuelle est indisponible.",
    "nl": "Sommige toewijzingen hebben ongeldige uren; de individuele planningsreferentie is niet beschikbaar."
  },
  "monthly.individualOverflow": {
    "fr": "Les heures planifiées dépassent la capacité de calcul ; la référence individuelle est indisponible.",
    "nl": "De geplande uren overschrijden de rekencapaciteit; de individuele referentie is niet beschikbaar."
  },
  "monthly.startMissing": {
    "fr": "Date de début du projet absente ou invalide ; le suivi mensuel est indisponible.",
    "nl": "De projectstartdatum ontbreekt of is ongeldig; het maandoverzicht is niet beschikbaar."
  },
  "monthly.todayInvalid": {
    "fr": "La date courante est invalide ; le suivi mensuel est indisponible.",
    "nl": "De huidige datum is ongeldig; het maandoverzicht is niet beschikbaar."
  },
  "monthly.actualUnavailable": {
    "fr": "Les heures réalisées du projet sont indisponibles.",
    "nl": "De gepresteerde projecturen zijn niet beschikbaar."
  },
  "monthly.actualTooLong": {
    "fr": "La période dépasse 2 400 mois ; le suivi mensuel est indisponible.",
    "nl": "De periode omvat meer dan 2.400 maanden; het maandoverzicht is niet beschikbaar."
  },
  "monthly.employeeUnidentified": {
    "fr": "Employé non identifié",
    "nl": "Niet-geïdentificeerde werknemer"
  },
  "monthly.actualOverflow": {
    "fr": "Les heures dépassent la capacité de calcul ; le suivi mensuel est indisponible.",
    "nl": "De uren overschrijden de rekencapaciteit; het maandoverzicht is niet beschikbaar."
  },
  "monthly.ignoredDates": {
    "fr": "Certaines imputations ont une date invalide et ont été ignorées.",
    "nl": "Sommige urenboekingen hebben een ongeldige datum en zijn genegeerd."
  },
  "monthly.ignoredHours": {
    "fr": "Certaines imputations ont des heures invalides et ont été ignorées.",
    "nl": "Sommige urenboekingen hebben ongeldige uren en zijn genegeerd."
  },
  "monthly.unknownFunctions": {
    "fr": "Certaines fonctions sont inconnues ; leurs heures restent incluses.",
    "nl": "Sommige functies zijn onbekend; hun uren blijven inbegrepen."
  },
  "monthly.incompleteOrmitters": {
    "fr": "Certaines affectations ou fonctions sont indisponibles ; la présence d’Ormitters peut être incomplète.",
    "nl": "Sommige toewijzingen of functies zijn niet beschikbaar; de aanwezigheid van Ormitters kan onvolledig zijn."
  },
  "monthly.conventionDatesInvalid": {
    "fr": "Dates du projet absentes ou invalides ; la référence conventionnelle est indisponible.",
    "nl": "Projectdatums ontbreken of zijn ongeldig; de conventiereferentie is niet beschikbaar."
  },
  "planning.invalidActual": {
    "fr": "Certaines imputations ont des dates ou des heures invalides ; les heures déjà prestées restent indisponibles.",
    "nl": "Sommige urenboekingen hebben ongeldige datums of uren; de reeds gepresteerde uren blijven niet beschikbaar."
  },
  "planning.unknownActualFunctions": {
    "fr": "Certaines fonctions sont inconnues ; l’exclusion des heures d’Ormitters peut être incomplète.",
    "nl": "Sommige functies zijn onbekend; de uitsluiting van Ormitter-uren kan onvolledig zijn."
  },
  "planning.actualUnavailable": {
    "fr": "Les heures déjà prestées sont indisponibles avec les données accessibles.",
    "nl": "De reeds gepresteerde uren zijn niet beschikbaar met de toegankelijke gegevens."
  },
  "planning.invalidProject": {
    "fr": "Dates ou identité du projet indisponibles ; les totaux sur sa durée ne peuvent pas être confirmés.",
    "nl": "Projectdatums of -identiteit zijn niet beschikbaar; de totalen over de looptijd kunnen niet worden bevestigd."
  },
  "planning.unavailable": {
    "fr": "Planning indisponible avec les données accessibles.",
    "nl": "Planning niet beschikbaar met de toegankelijke gegevens."
  },
  "planning.toDateUnavailable": {
    "fr": "Les heures planifiées à ce jour sont indisponibles : certaines allocations ou la date du jour ne peuvent pas être confirmées.",
    "nl": "De geplande uren tot vandaag zijn niet beschikbaar: sommige toewijzingen of de huidige datum kunnen niet worden bevestigd."
  },
  "planning.toDateUnknownFunctions": {
    "fr": "La fonction de certaines ressources planifiées est inconnue ; l’exclusion des heures d’Ormitters à ce jour peut être incomplète.",
    "nl": "De functie van sommige geplande resources is onbekend; de uitsluiting van Ormitter-uren tot vandaag kan onvolledig zijn."
  },
  "planning.futureUnavailable": {
    "fr": "Les heures planifiées restantes sont indisponibles : certaines allocations ou la date du jour ne peuvent pas être confirmées.",
    "nl": "De resterende geplande uren zijn niet beschikbaar: sommige toewijzingen of de huidige datum kunnen niet worden bevestigd."
  },
  "planning.futureThUnknown": {
    "fr": "La part future des ressources à recruter peut être incomplète : certaines identités ne sont pas confirmées.",
    "nl": "Het toekomstige aandeel van nog aan te werven resources kan onvolledig zijn: sommige identiteiten zijn niet bevestigd."
  },
  "planning.futureUnknownFunctions": {
    "fr": "La fonction de certaines ressources planifiées est inconnue ; l’exclusion des heures futures d’Ormitters peut être incomplète.",
    "nl": "De functie van sommige geplande resources is onbekend; de uitsluiting van toekomstige Ormitter-uren kan onvolledig zijn."
  },
  "planning.invalidAllocations": {
    "fr": "Certaines allocations ont des dates ou des heures invalides ; les totaux planifiés restent indisponibles.",
    "nl": "Sommige toewijzingen hebben ongeldige datums of uren; de geplande totalen blijven niet beschikbaar."
  },
  "planning.unknownIdentities": {
    "fr": "L’identité de certaines ressources n’est pas confirmée ; les ressources à recruter ne peuvent pas être toutes identifiées.",
    "nl": "De identiteit van sommige resources is niet bevestigd; niet alle nog aan te werven resources kunnen worden geïdentificeerd."
  },
  "planning.unlinkedResources": {
    "fr": "Certaines ressources ne sont liées à aucun employé et ne sont pas des ressources à recruter confirmées.",
    "nl": "Sommige resources zijn niet aan een werknemer gekoppeld en zijn geen bevestigde nog aan te werven resources."
  },
  "planning.coverageIndeterminate": {
    "fr": "La couverture future par des personnes réelles est indéterminée : certaines allocations peuvent modifier les périodes sans couverture.",
    "nl": "De toekomstige dekking door echte personen is onbepaald: sommige toewijzingen kunnen de ongedekte periodes wijzigen."
  },
  "planning.todayUnavailable": {
    "fr": "La date du jour à Bruxelles est indisponible ; la couverture future ne peut pas être évaluée.",
    "nl": "De huidige datum in Brussel is niet beschikbaar; de toekomstige dekking kan niet worden beoordeeld."
  },
  "workCapacity.calendarUnavailable": {
    "fr": "Calendrier annuel ou horaires de travail indisponibles.",
    "nl": "Jaarkalender of werkrooster niet beschikbaar."
  },
  "workCapacity.statusUnknown": {
    "fr": "L’état du calendrier ou des droits annuels ne peut pas être confirmé.",
    "nl": "De status van de kalender of de jaarlijkse rechten kan niet worden bevestigd."
  },
  "workCapacity.sourcesUnavailable": {
    "fr": "Les jours fériés ou les droits de congé ne sont pas accessibles pour cette année.",
    "nl": "De feestdagen of verlofrechten voor dit jaar zijn niet toegankelijk."
  },
  "workCapacity.referenceUnavailable": {
    "fr": "La capacité de l’année actuelle n’est pas disponible pour estimer cette année future.",
    "nl": "De capaciteit van het huidige jaar is niet beschikbaar om dit toekomstige jaar te ramen."
  },
  "workCapacity.holidaysUnknown": {
    "fr": "Les jours fériés de cette année ne peuvent pas être confirmés.",
    "nl": "De feestdagen van dit jaar kunnen niet worden bevestigd."
  },
  "workCapacity.invalidClosures": {
    "fr": "Certaines périodes de fermeture ont des dates invalides.",
    "nl": "Sommige sluitingsperiodes hebben ongeldige datums."
  },
  "workCapacity.rightsUnavailable": {
    "fr": "Le droit annuel de congé payé est indisponible.",
    "nl": "Het jaarlijkse betaalde verlofrecht is niet beschikbaar."
  },
  "workCapacity.leaveExceedsHours": {
    "fr": "Les congés et fermetures dépassent les heures ouvrées ; capacité annuelle non confirmée.",
    "nl": "Verlof en sluitingen overschrijden de werkuren; de jaarcapaciteit is niet bevestigd."
  },
  "workCapacity.unavailable": {
    "fr": "La capacité de travail ne peut pas être calculée avec les données accessibles.",
    "nl": "De werkcapaciteit kan niet met de toegankelijke gegevens worden berekend."
  },
  "workCapacity.conflictingYears": {
    "fr": "Plusieurs sources annuelles se contredisent pour cette année.",
    "nl": "Verschillende jaarbronnen spreken elkaar voor dit jaar tegen."
  },
  "workCapacity.partialLeaveExceedsHours": {
    "fr": "Les congés estimés dépassent les heures ouvrées de la période sélectionnée.",
    "nl": "Het geraamde verlof overschrijdt de werkuren van de geselecteerde periode."
  },
  "workCapacity.partialLeavePolicy": {
    "fr": "Sur une période partielle, le droit annuel de congé est réparti au prorata des heures ouvrées, indépendamment des demandes de congé.",
    "nl": "Voor een deelperiode wordt het jaarlijkse verlofrecht pro rata van de werkuren verdeeld, onafhankelijk van verlofaanvragen."
  },
  "budget.currencyUnknown": {
    "fr": "Devise inconnue",
    "nl": "Onbekende valuta"
  },
  "budget.sourceInformationUnavailable": {
    "fr": "Information de source indisponible",
    "nl": "Broninformatie niet beschikbaar"
  },
  "budget.noExpensesOnlySource": {
    "fr": "La consommation hors personnel BW est indisponible dans cette lecture. Actualisez les données ou activez Afficher les coûts de personnel BW pour afficher la source complète.",
    "nl": "Het verbruik zonder BW-personeel is niet beschikbaar in deze uitlezing. Vernieuw de gegevens of schakel BW-personeelskosten tonen in om de volledige bron te zien."
  },
  "budget.noExpensesOnlyBudget": {
    "fr": "Budget conventionnel hors personnel BW indisponible : les allocations, rubriques ou devises de personnel ne sont pas toutes vérifiables.",
    "nl": "Conventiebudget zonder BW-personeel niet beschikbaar: niet alle personeelstoewijzingen, rubrieken of valuta’s kunnen worden gecontroleerd."
  },
  "budget.categoryMissing": {
    "fr": "Catégorie non renseignée",
    "nl": "Categorie niet ingevuld"
  },
  "budget.duplicateEntries": {
    "fr": "Des écritures se retrouvent dans plusieurs lignes budgétaires de cette catégorie ; elles ne sont comptées qu’une fois dans la liste.",
    "nl": "Boekingen komen in meerdere budgetlijnen van deze categorie voor; ze worden slechts één keer in de lijst geteld."
  },
  "budget.conflictingEntries": {
    "fr": "Des écritures identiques présentent des montants, devises ou statuts contradictoires ; aucun rapprochement complet n’est confirmé.",
    "nl": "Identieke boekingen hebben tegenstrijdige bedragen, valuta’s of statussen; een volledige afstemming is niet bevestigd."
  },
  "budget.illegibleEntryIdentity": {
    "fr": "Certaines écritures ont une identité illisible ; le détail accessible est incomplet.",
    "nl": "Sommige boekingen hebben een onleesbare identiteit; de toegankelijke details zijn onvolledig."
  },
  "budget.unverifiedSuppliers": {
    "fr": "Certains fournisseurs ne sont pas vérifiés. Ces écritures restent signalées séparément et ne confirment pas le sous-total filtré.",
    "nl": "Sommige leveranciers zijn niet geverifieerd. Deze boekingen blijven apart gemarkeerd en bevestigen het gefilterde subtotaal niet."
  },
  "budget.unreconciledList": {
    "fr": "Le montant de la liste ne peut pas être rapproché entièrement du consommé affiché ; les montants accessibles restent visibles.",
    "nl": "Het lijstbedrag kan niet volledig met het getoonde verbruik worden afgestemd; toegankelijke bedragen blijven zichtbaar."
  },
  "budget.statusUnavailable": {
    "fr": "Statut indisponible",
    "nl": "Status niet beschikbaar"
  },
  "budget.closeBills": {
    "fr": "Fermer les factures et écritures associées",
    "nl": "Bijbehorende facturen en boekingen sluiten"
  },
  "budget.budgeted": {
    "fr": "Budgeté",
    "nl": "Gebudgetteerd"
  },
  "budget.invoicedConsumed": {
    "fr": "Consommé · facturé",
    "nl": "Verbruikt · gefactureerd"
  },
  "budget.committed": {
    "fr": "Engagé",
    "nl": "Vastgelegd"
  },
  "budget.relatedExpenses": {
    "fr": "Dépenses associées",
    "nl": "Bijbehorende uitgaven"
  },
  "budget.incompleteExpenses": {
    "fr": "Dépenses accessibles · détail incomplet",
    "nl": "Toegankelijke uitgaven · onvolledige details"
  },
  "budget.relatedEntries": {
    "fr": "Écritures associées",
    "nl": "Bijbehorende boekingen"
  },
  "budget.billsScope": {
    "fr": "Cette liste présente les dépenses facturées associées. Elle ne détaille pas les allocations budgétaires ni les commandes non facturées de la barre sélectionnée.",
    "nl": "Deze lijst toont de bijbehorende gefactureerde uitgaven. Ze bevat geen details over budgettoewijzingen of nog niet gefactureerde bestellingen van de geselecteerde balk."
  },
  "budget.billsUnavailable": {
    "fr": "Le détail des factures est indisponible dans cette lecture. Aucun montant de facture n’est inventé.",
    "nl": "Factuurdetails zijn niet beschikbaar in deze uitlezing. Er worden geen factuurbedragen verzonnen."
  },
  "budget.partialBills": {
    "fr": "Liste partielle ou non rapprochée du consommé affiché. Les écritures accessibles restent visibles ; leur somme ne confirme pas une liste complète.",
    "nl": "De lijst is onvolledig of niet afgestemd op het getoonde verbruik. Toegankelijke boekingen blijven zichtbaar; hun som bevestigt geen volledige lijst."
  },
  "budget.noBills": {
    "fr": "Aucune dépense facturée associée à cette catégorie sur la période confirmée.",
    "nl": "Geen gefactureerde uitgaven gekoppeld aan deze categorie in de bevestigde periode."
  },
  "budget.entriesRegion": {
    "fr": "Écritures et descriptions associées",
    "nl": "Bijbehorende boekingen en beschrijvingen"
  },
  "budget.date": {
    "fr": "Date",
    "nl": "Datum"
  },
  "budget.supplier": {
    "fr": "Fournisseur",
    "nl": "Leverancier"
  },
  "budget.settlementsDescription": {
    "fr": "Référence / Description Settlements New",
    "nl": "Referentie / Beschrijving Settlements New"
  },
  "budget.postedAmount": {
    "fr": "Montant imputé",
    "nl": "Toegewezen bedrag"
  },
  "budget.supplierUnavailable": {
    "fr": "Fournisseur indisponible",
    "nl": "Leverancier niet beschikbaar"
  },
  "budget.unverifiedSupplier": {
    "fr": "Fournisseur non vérifié · hors sous-total filtré",
    "nl": "Leverancier niet geverifieerd · buiten gefilterd subtotaal"
  },
  "budget.referenceDescription": {
    "fr": "Référence / Description",
    "nl": "Referentie / Beschrijving"
  },
  "budget.referenceUnavailable": {
    "fr": "Référence indisponible",
    "nl": "Referentie niet beschikbaar"
  },
  "budget.descriptionMissing": {
    "fr": "Description non renseignée",
    "nl": "Beschrijving niet ingevuld"
  },
  "budget.billsFooter": {
    "fr": "Détail des écritures accessibles avec vos droits Odoo · lecture seule.",
    "nl": "Details van boekingen die met uw Odoo-rechten toegankelijk zijn · alleen-lezen."
  },
  "budget.loading": {
    "fr": "Chargement des budgets du projet…",
    "nl": "Projectbudgetten laden…"
  },
  "budget.unavailable": {
    "fr": "Budgets indisponibles.",
    "nl": "Budgetten niet beschikbaar."
  },
  "budget.conventionHeading": {
    "fr": "Budget · 01 / Convention",
    "nl": "Budget · 01 / Conventie"
  },
  "budget.conventionDescription": {
    "fr": "Budget conventionnel et coûts enregistrés sur toute la durée du projet · hors filtre d’années.",
    "nl": "Conventiebudget en geregistreerde kosten over de volledige projectduur · onafhankelijk van het jaarfilter."
  },
  "budget.showBwPersonnel": {
    "fr": "Afficher les coûts de personnel BW",
    "nl": "BW-personeelskosten tonen"
  },
  "budget.projectSheetTotal": {
    "fr": "Budget total · fiche projet",
    "nl": "Totaalbudget · projectfiche"
  },
  "budget.conventionAmountSource": {
    "fr": "Montant conventionnel renseigné dans Odoo",
    "nl": "Conventiebedrag ingevuld in Odoo"
  },
  "budget.personnelBudget": {
    "fr": "Budget personnel",
    "nl": "Personeelsbudget"
  },
  "budget.maximumFunding": {
    "fr": "Financement maximum",
    "nl": "Maximale financiering"
  },
  "budget.typeMissing": {
    "fr": "Type non renseigné",
    "nl": "Type niet ingevuld"
  },
  "budget.projectDates": {
    "fr": "Dates du projet",
    "nl": "Projectdatums"
  },
  "budget.fundingOrganisation": {
    "fr": "Organisme de financement",
    "nl": "Financieringsinstantie"
  },
  "budget.notProvided": {
    "fr": "Non renseigné",
    "nl": "Niet ingevuld"
  },
  "budget.conventionReference": {
    "fr": "Référence convention",
    "nl": "Conventiereferentie"
  },
  "budget.notProvidedFeminine": {
    "fr": "Non renseignée",
    "nl": "Niet ingevuld"
  },
  "budget.chooseConvention": {
    "fr": "Convention à comparer",
    "nl": "Te vergelijken conventie"
  },
  "budget.conventionCheckIncomplete": {
    "fr": "Contrôle de la convention incomplet ou non réconcilié · les montants affichés ne constituent pas un budget contrôlé.",
    "nl": "De conventiecontrole is onvolledig of niet afgestemd · de getoonde bedragen vormen geen gecontroleerd budget."
  },
  "budget.chooseConventionHelp": {
    "fr": "Choisissez une convention pour comparer son budget aux coûts du projet. Les différentes versions ne sont pas additionnées.",
    "nl": "Kies een conventie om het budget met de projectkosten te vergelijken. Verschillende versies worden niet opgeteld."
  },
  "budget.conventionBudget": {
    "fr": "Budget conventionnel",
    "nl": "Conventiebudget"
  },
  "budget.selectedConvention": {
    "fr": "Convention sélectionnée",
    "nl": "Geselecteerde conventie"
  },
  "budget.projectSheet": {
    "fr": "Fiche projet",
    "nl": "Projectfiche"
  },
  "budget.excludingBwPersonnelSuffix": {
    "fr": " · hors personnel BW",
    "nl": " · zonder BW-personeel"
  },
  "budget.partialConsumed": {
    "fr": "Consommation connue · partielle",
    "nl": "Bekend verbruik · gedeeltelijk"
  },
  "budget.recordedConsumed": {
    "fr": "Consommation enregistrée",
    "nl": "Geregistreerd verbruik"
  },
  "budget.costWithBw": {
    "fr": "Dépenses + coût monétaire des heures BW",
    "nl": "Uitgaven + geldelijke kost van BW-uren"
  },
  "budget.costWithoutBw": {
    "fr": "Dépenses hors coût monétaire des heures BW",
    "nl": "Uitgaven zonder geldelijke kost van BW-uren"
  },
  "budget.calculatedBalance": {
    "fr": "Solde calculé",
    "nl": "Berekend saldo"
  },
  "budget.budgetMinusConsumed": {
    "fr": "Budget − consommation",
    "nl": "Budget − verbruik"
  },
  "budget.ratioUnavailable": {
    "fr": "Ratio indisponible · budget nul ou négatif",
    "nl": "Percentage niet beschikbaar · budget is nul of negatief"
  },
  "budget.currencyComparisonUnavailable": {
    "fr": "Comparaison indisponible : les devises des coûts et du budget ne sont pas confirmées identiques.",
    "nl": "Vergelijking niet beschikbaar: het is niet bevestigd dat kosten en budget dezelfde valuta hebben."
  },
  "budget.partialConsumptionWarning": {
    "fr": "Consommation partielle : seuls les coûts accessibles et identifiables sont inclus. Le solde ne constitue pas une disponibilité financière confirmée.",
    "nl": "Gedeeltelijk verbruik: alleen toegankelijke en identificeerbare kosten zijn inbegrepen. Het saldo vormt geen bevestigde financiële beschikbaarheid."
  },
  "budget.bwCostHiddenSuffix": {
    "fr": " · Coût enregistré des heures BW masqué",
    "nl": " · Geregistreerde kost van BW-uren verborgen"
  },
  "budget.fullConventionBasis": {
    "fr": "Budget conventionnel complet, personnel BW inclus.",
    "nl": "Volledig conventiebudget, inclusief BW-personeel."
  },
  "budget.excludingBwConventionBasis": {
    "fr": "Budget conventionnel comparé hors allocation de personnel BW.",
    "nl": "Conventiebudget vergeleken zonder BW-personeelstoewijzing."
  },
  "budget.consumptionByRubric": {
    "fr": "Consommation par rubrique conventionnelle",
    "nl": "Verbruik per conventierubriek"
  },
  "budget.rubricMissing": {
    "fr": "Rubrique non renseignée",
    "nl": "Rubriek niet ingevuld"
  },
  "budget.consumed": {
    "fr": "Consommé",
    "nl": "Verbruikt"
  },
  "budget.unmatchedCosts": {
    "fr": "Coûts sans rapprochement de rubrique",
    "nl": "Kosten zonder gekoppelde rubriek"
  },
  "budget.unmatchedCostHelp": {
    "fr": "Ces coûts restent dans la consommation totale. Aucune correspondance de rubrique n’est déduite de leur libellé.",
    "nl": "Deze kosten blijven in het totale verbruik. Er wordt geen rubriekkoppeling afgeleid uit de omschrijving."
  },
  "budget.conventionRubricDetails": {
    "fr": "Détail des rubriques conventionnelles",
    "nl": "Details van conventierubrieken"
  },
  "budget.rubric": {
    "fr": "Rubrique",
    "nl": "Rubriek"
  },
  "budget.noConventionLines": {
    "fr": "Aucune ligne de convention disponible dans cette lecture. Le budget de la fiche projet reste affiché lorsqu’il est renseigné ; consultez les informations de source en cas de lecture incomplète.",
    "nl": "Geen conventielijnen beschikbaar in deze uitlezing. Het ingevulde budget op de projectfiche blijft zichtbaar; raadpleeg de broninformatie bij onvolledige uitlezing."
  },
  "budget.annualHeading": {
    "fr": "Budget · 02 / Budgets annuels",
    "nl": "Budget · 02 / Jaarbudgetten"
  },
  "budget.annualDescription": {
    "fr": "Tous les budgets annuels accessibles, y compris les années futures · catégories annuelles distinctes de la convention.",
    "nl": "Alle toegankelijke jaarbudgetten, inclusief toekomstige jaren · jaarcategorieën verschillen van die van de conventie."
  },
  "budget.annualAccountingNote": {
    "fr": "Engagé comprend le facturé et les commandes confirmées selon Odoo. Consommé et engagé se chevauchent : ils ne s’additionnent pas. La consommation annuelle ci-dessous est facturée. Les coûts BW de personnel ne sont jamais inclus dans les budgets annuels affichés, indépendamment de la case ci-dessus.",
    "nl": "Vastgelegd omvat gefactureerde bedragen en bevestigde bestellingen volgens Odoo. Verbruikt en vastgelegd overlappen en worden niet opgeteld. Het jaarverbruik hieronder is gefactureerd. BW-personeelskosten zijn nooit opgenomen in de getoonde jaarbudgetten, ongeacht het selectievakje hierboven."
  },
  "budget.excludeOrmitters": {
    "fr": "Exclure les coûts des Ormitters",
    "nl": "Ormitter-kosten uitsluiten"
  },
  "budget.ormitterScope": {
    "fr": "Filtre des dépenses liées au fournisseur Ormit Talent · les coûts monétaires des heures et la convention restent inchangés.",
    "nl": "Filter voor uitgaven aan leverancier Ormit Talent · de geldelijke urenkosten en de conventie blijven ongewijzigd."
  },
  "budget.ormitterFilteredNote": {
    "fr": "Les montants consommés et engagés ci-dessous excluent les coûts identifiés des Ormitters. Les allocations budgétaires, l’approbation et le solde Odoo restent inchangés. Un engagement filtré non vérifiable reste indisponible.",
    "nl": "De verbruikte en vastgelegde bedragen hieronder sluiten geïdentificeerde Ormitter-kosten uit. Budgettoewijzingen, goedkeuring en het Odoo-saldo blijven ongewijzigd. Een niet-verifieerbaar gefilterd vastgelegd bedrag blijft niet beschikbaar."
  },
  "budget.noAnnualBudgets": {
    "fr": "Aucun budget annuel accessible pour ce projet.",
    "nl": "Geen jaarbudget toegankelijk voor dit project."
  },
  "budget.confirmCurrencySuffix": {
    "fr": " · devise à confirmer",
    "nl": " · valuta te bevestigen"
  },
  "budget.currencyScaleUnavailable": {
    "fr": "Devise différente ou inconnue · échelle de la barre indisponible.",
    "nl": "Afwijkende of onbekende valuta · balkschaal niet beschikbaar."
  },
  "budget.scaleUnavailableSuffix": {
    "fr": "; échelle indisponible",
    "nl": "; schaal niet beschikbaar"
  },
  "budget.annualExpenseDetails": {
    "fr": "Détail des dépenses annuelles",
    "nl": "Details van jaaruitgaven"
  },
  "budget.annualCategory": {
    "fr": "Catégorie annuelle",
    "nl": "Jaarcategorie"
  },
  "budget.pendingApproval": {
    "fr": "En approbation",
    "nl": "Ter goedkeuring"
  },
  "budget.odooBalance": {
    "fr": "Solde Odoo",
    "nl": "Odoo-saldo"
  },
  "budget.otherAnnualLines": {
    "fr": "Recettes, ajustements et lignes non classées",
    "nl": "Ontvangsten, correcties en niet-geclassificeerde lijnen"
  },
  "budget.lineCheckIncomplete": {
    "fr": "Contrôle des lignes incomplet ou non réconcilié · consultez les informations de source.",
    "nl": "De lijncontrole is onvolledig of niet afgestemd · raadpleeg de broninformatie."
  },
  "budget.ormitterExclusionUnavailable": {
    "fr": "Exclusion Ormit Talent indisponible dans cette lecture · montants consommés et engagés indisponibles.",
    "nl": "Uitsluiting van Ormit Talent niet beschikbaar in deze uitlezing · verbruikte en vastgelegde bedragen niet beschikbaar."
  },
  "common.projectWithId": {
    "fr": "Projet {p0}",
    "nl": "Project {p0}"
  },
  "common.employeeWithId": {
    "fr": "Employé {p0}",
    "nl": "Werknemer {p0}"
  },
  "common.resourceWithId": {
    "fr": "Ressource {p0}",
    "nl": "Resource {p0}"
  },
  "common.managerName": {
    "fr": "Responsable : {p0}",
    "nl": "Verantwoordelijke: {p0}"
  },
  "common.managerNameSentence": {
    "fr": "Responsable : {p0}. ",
    "nl": "Verantwoordelijke: {p0}. "
  },
  "personal.yearsAnd": {
    "fr": "{p0} et {p1}",
    "nl": "{p0} en {p1}"
  },
  "personal.rangePeriod": {
    "fr": "du {p0} au {p1}",
    "nl": "van {p0} tot {p1}"
  },
  "personal.toleranceAria": {
    "fr": "{p0} % de tolérance",
    "nl": "{p0} % tolerantie"
  },
  "personal.recommendationsTitle": {
    "fr": "Recommandations pour respecter le planning {p0} (interpolation linéaire)",
    "nl": "Aanbevelingen om de planning {p0} te respecteren (lineaire interpolatie)"
  },
  "personal.recommendationTooltip": {
    "fr": "{p0}\nPrévu à ce jour : {p1}\nRéalisé : {p2}\nFin : {p3}",
    "nl": "{p0}\nGepland tot vandaag: {p1}\nGepresteerd: {p2}\nEinde: {p3}"
  },
  "personal.periodEndedDate": {
    "fr": "Période terminée le {p0}.",
    "nl": "Periode geëindigd op {p0}."
  },
  "personal.weeklyPace": {
    "fr": "{p0} {p1} h/sem. jusqu’au {p2}.",
    "nl": "{p0} {p1} h/week tot {p2}."
  },
  "personal.paceDifference": {
    "fr": "{p0} {p1} prévu à ce jour.",
    "nl": "{p0} {p1} planning tot vandaag."
  },
  "personal.endedDate": {
    "fr": "Projet terminé le {p0}.",
    "nl": "Project beëindigd op {p0}."
  },
  "personal.budgetConsumedDetail": {
    "fr": "Le budget personnel BW du projet est consommé ({p0} réalisées sur {p1} prévues par la convention, hors Ormitters).",
    "nl": "Het BW-personeelsbudget van het project is opgebruikt ({p0} gepresteerd van {p1} voorzien in de conventie, zonder Ormitters)."
  },
  "personal.noFuturePlanDetail": {
    "fr": "Aucun planning personnel restant d’aujourd’hui à la fin du projet (du {p0} au {p1}).",
    "nl": "Geen resterende persoonlijke planning vanaf vandaag tot het projecteinde (van {p0} tot {p1})."
  },
  "personal.recommendationGap": {
    "fr": " — {p0} {p1} du prévu à ce jour. {p2}",
    "nl": " — {p0} {p1} de planning tot vandaag. {p2}"
  },
  "personal.noNumericAdvice": {
    "fr": "{p0} projet{p1} sans conseil chiffré.",
    "nl": "{p0} project{p1} zonder cijfermatig advies."
  },
  "personal.visibleProjectCount": {
    "fr": "{p0} / {p1} affichés",
    "nl": "{p0} / {p1} getoond"
  },
  "personal.abovePlanBadge": {
    "fr": "+{p0} au-delà du prévu",
    "nl": "+{p0} boven de planning"
  },
  "personal.sectorAria": {
    "fr": "{p0} : {p1} prévus, {p2} réalisés. Afficher le détail.",
    "nl": "{p0}: {p1} gepland, {p2} gepresteerd. Details tonen."
  },
  "personal.calendarAria": {
    "fr": "Repère calendaire : {p0} de la période écoulée. Référence linéaire sur la période sélectionnée.",
    "nl": "Kalendermarkering: {p0} van de periode verstreken. Lineaire referentie over de geselecteerde periode."
  },
  "personal.todayMarker": {
    "fr": "Repère du jour · {p0}",
    "nl": "Markering vandaag · {p0}"
  },
  "personal.legendAria": {
    "fr": "{p0} {p1} : {p2} prévus, {p3} réalisés",
    "nl": "{p0} {p1}: {p2} gepland, {p3} gepresteerd"
  },
  "personal.legendValues": {
    "fr": "{p0} réalisés · {p1} prévus",
    "nl": "{p0} gepresteerd · {p1} gepland"
  },
  "personal.remainingHours": {
    "fr": "Plus que {p0} prévues disponibles{p1}",
    "nl": "Nog {p0} geplande uren beschikbaar{p1}"
  },
  "personal.deadlineSuffix": {
    "fr": " d’ici au {p0}",
    "nl": " tot {p0}"
  },
  "personal.unplannedSubtotal": {
    "fr": "Réalisé hors planning sur les projets affichés : {p0}",
    "nl": "Buiten planning gepresteerd op de getoonde projecten: {p0}"
  },
  "capacity.partialYearDetails": {
    "fr": "{p0} % des heures du calendrier annuel sélectionnées. Année complète : {p1} disponibles et {p2} de droits de congés payés.",
    "nl": "{p0} % van de jaarlijkse kalenderuren geselecteerd. Volledig jaar: {p1} beschikbaar en {p2} betaalde verlofrechten."
  },
  "capacity.unpublishedCalendarBasis": {
    "fr": "Calendrier non publié : capacité annuelle reprise de {p0}.",
    "nl": "Kalender niet gepubliceerd: jaarcapaciteit overgenomen uit {p0}."
  },
  "capacity.unallocatedRightsBasis": {
    "fr": "Droits de congés non attribués : droits annuels repris de {p0}.",
    "nl": "Verlofrechten niet toegekend: jaarlijkse rechten overgenomen uit {p0}."
  },
  "capacity.workTimeRate": {
    "fr": "Temps de travail : {p0} % (déjà intégré au calendrier)",
    "nl": "Arbeidsregime: {p0} % (reeds opgenomen in de kalender)"
  },
  "capacity.unpublishedCalendarYears": {
    "fr": "Calendrier non publié en {p0} : capacité annuelle estimée d’après {p1}.",
    "nl": "Kalender niet gepubliceerd voor {p0}: jaarcapaciteit geraamd op basis van {p1}."
  },
  "capacity.unallocatedRightsYears": {
    "fr": "{p0}Droits de congés non attribués en {p1} : estimation d’après les droits annuels de {p2}.",
    "nl": "{p0}Verlofrechten niet toegekend voor {p1}: raming op basis van de jaarlijkse rechten van {p2}."
  },
  "capacity.partialPeriodNote": {
    "fr": "{p0}Période partielle : droits annuels répartis au prorata des heures de calendrier sélectionnées.",
    "nl": "{p0}Deelperiode: jaarlijkse rechten pro rata verdeeld over de geselecteerde kalenderuren."
  },
  "budget.rangePeriod": {
    "fr": "Du {p0} au {p1}",
    "nl": "Van {p0} tot {p1}"
  },
  "budget.billsTitle": {
    "fr": "Factures et écritures · {p0} · {p1}",
    "nl": "Facturen en boekingen · {p0} · {p1}"
  },
  "budget.billsPeriodScope": {
    "fr": "Périmètre des lignes : {p0} · montants imputés à cette catégorie, et non totaux des factures.",
    "nl": "Bereik van de lijnen: {p0} · bedragen toegewezen aan deze categorie, geen factuurtotalen."
  },
  "budget.selectedBar": {
    "fr": "Barre sélectionnée · {p0}",
    "nl": "Geselecteerde balk · {p0}"
  },
  "budget.ormitterBillsFiltered": {
    "fr": "Filtre fournisseur Ormit Talent actif · {p0} écriture(s) vérifiée(s) retirée(s) ({p1}).",
    "nl": "Leveranciersfilter Ormit Talent actief · {p0} geverifieerde boeking(en) verwijderd ({p1})."
  },
  "budget.billsGap": {
    "fr": "Écart liste − consommé affiché : {p0}.",
    "nl": "Verschil lijst − getoond verbruik: {p0}."
  },
  "budget.conventionHoursCaption": {
    "fr": "{p0} conventionnelles",
    "nl": "{p0} volgens de conventie"
  },
  "budget.conventionWithId": {
    "fr": "Convention {p0}",
    "nl": "Conventie {p0}"
  },
  "budget.consumptionRatio": {
    "fr": "{p0} du budget consommé{p1}",
    "nl": "{p0} van het budget verbruikt{p1}"
  },
  "budget.sourceCost": {
    "fr": "Coûts de dépenses : {p0}{p1}. {p2}",
    "nl": "Uitgavenkosten: {p0}{p1}. {p2}"
  },
  "budget.bwRecordedCostSuffix": {
    "fr": " · Coût enregistré des heures BW : {p0}",
    "nl": " · Geregistreerde kost van BW-uren: {p0}"
  },
  "budget.outsideProjectDates": {
    "fr": "Écritures hors dates du projet, incluses dans le total : {p0} avant le début ({p1}), {p2} après la fin ({p3}).",
    "nl": "Boekingen buiten de projectdatums, inbegrepen in het totaal: {p0} vóór de start ({p1}), {p2} na het einde ({p3})."
  },
  "budget.unvaluedHours": {
    "fr": "{p0} écriture(s) d’heures sans coût monétaire enregistré · aucun coût n’est estimé à partir des heures.",
    "nl": "{p0} urenboeking(en) zonder geregistreerde geldelijke kost · er worden geen kosten uit uren geraamd."
  },
  "budget.hiddenPersonnelRubricExpense": {
    "fr": "Dépenses · {p0} · rubrique personnel masquée",
    "nl": "Uitgaven · {p0} · personeelsrubriek verborgen"
  },
  "budget.outsideConventionLines": {
    "fr": "{p0} · hors lignes de la convention sélectionnée",
    "nl": "{p0} · buiten de lijnen van de geselecteerde conventie"
  },
  "budget.currencyGroupScale": {
    "fr": "{p0} · même échelle pour les budgets de ce groupe{p1}",
    "nl": "{p0} · dezelfde schaal voor de budgetten in deze groep{p1}"
  },
  "budget.annualChartAria": {
    "fr": "{p0}, {p1} : budgeté {p2}, consommé facturé {p3}, engagé {p4}. Échelle {p5} à {p6}.",
    "nl": "{p0}, {p1}: gebudgetteerd {p2}, gefactureerd verbruik {p3}, vastgelegd {p4}. Schaal {p5} tot {p6}."
  },
  "budget.totalMeasure": {
    "fr": "Total {p0} : {p1}",
    "nl": "Totaal {p0}: {p1}"
  },
  "budget.codeThreeAmounts": {
    "fr": "{p0} : détail des trois montants",
    "nl": "{p0}: details van de drie bedragen"
  },
  "budget.incomeSeparate": {
    "fr": "Recettes séparées · budgetées : {p0} · facturées : {p1}.",
    "nl": "Afzonderlijke ontvangsten · gebudgetteerd: {p0} · gefactureerd: {p1}."
  },
  "budget.odooNetTotal": {
    "fr": "Total net Odoo : {p0} · ne représente pas l’enveloppe des dépenses.",
    "nl": "Odoo-nettototaal: {p0} · vertegenwoordigt niet het uitgavenbudget."
  },
  "budget.readAsOf": {
    "fr": "Lecture Odoo : {p0} · données accessibles avec vos droits Odoo · lecture seule.",
    "nl": "Odoo-uitlezing: {p0} · gegevens toegankelijk met uw Odoo-rechten · alleen-lezen."
  },
  "programme.tooltip": {
    "fr": "{p0} · {p1}\n{p2}\nResponsable : {p3}",
    "nl": "{p0} · {p1}\n{p2}\nVerantwoordelijke: {p3}"
  },
  "programme.description": {
    "fr": "{p0}. {p1}. Responsable : {p2}.",
    "nl": "{p0}. {p1}. Verantwoordelijke: {p2}."
  },
  "workCapacity.futureCalendarBasis": {
    "fr": "Calendrier futur non publié : nombre de jours et d’heures disponibles repris de {p0}.",
    "nl": "Toekomstige kalender niet gepubliceerd: aantal beschikbare dagen en uren overgenomen uit {p0}."
  },
  "workCapacity.futureRightsBasis": {
    "fr": "Droits futurs non attribués : droit annuel de congé repris de {p0}.",
    "nl": "Toekomstige rechten niet toegekend: jaarlijks verlofrecht overgenomen uit {p0}."
  },
  "workCapacity.scheduleBasisYears": {
    "fr": "Le calendrier de travail de {p0} est appliqué à {p1} ; les changements historiques ou futurs de régime ne peuvent pas être confirmés.",
    "nl": "De werkkalender van {p0} wordt toegepast op {p1}; vroegere of toekomstige wijzigingen in het arbeidsregime kunnen niet worden bevestigd."
  },
  "personal.noNumericAdviceOne": {
    "fr": "{count} projet sans conseil chiffré.",
    "nl": "{count} project zonder cijfermatig advies."
  },
  "personal.noNumericAdviceMany": {
    "fr": "{count} projets sans conseil chiffré.",
    "nl": "{count} projecten zonder cijfermatig advies."
  },
  "budget.unmappedPersonnel": {
    "fr": "Coût des heures · rubrique non renseignée",
    "nl": "Urenkosten · rubriek niet ingevuld"
  },
  "budget.unmappedExpense": {
    "fr": "Dépenses · rubrique non renseignée",
    "nl": "Uitgaven · rubriek niet ingevuld"
  },
  "identity.employee": { "fr": "Employé {id}", "nl": "Werknemer {id}" },
  "identity.employeeUnknown": { "fr": "Employé non identifié", "nl": "Niet-geïdentificeerde werknemer" },
  "identity.project": { "fr": "Projet {id}", "nl": "Project {id}" },
  "budget.status.draft": { "fr": "Brouillon", "nl": "Concept" },
  "budget.status.underValidation": { "fr": "En validation", "nl": "Ter validatie" },
  "budget.status.confirmed": { "fr": "Confirmé", "nl": "Bevestigd" },
  "budget.status.revised": { "fr": "Révisé", "nl": "Herzien" },
  "budget.status.done": { "fr": "Clôturé", "nl": "Afgesloten" },
  "budget.status.canceled": { "fr": "Annulé", "nl": "Geannuleerd" },
  "budget.partialSourceSuffix": {
    "fr": " · source partielle",
    "nl": " · gedeeltelijke bron"
  }
});
  return I18n;
});

(function (root, factory) {
  const messages = factory(typeof module === "object" && module.exports ? require("./i18n") : root.DashboardI18n);
  if (typeof module === "object" && module.exports) module.exports = messages;
})(typeof globalThis !== "undefined" ? globalThis : this, function (I18n) {
  "use strict";
  const messages = {
  "server.requiredDatabase": {
    "source": "Database is required",
    "fr": "La base de données est obligatoire.",
    "nl": "De database is verplicht."
  },
  "server.requiredUsername": {
    "source": "Username is required",
    "fr": "L’identifiant est obligatoire.",
    "nl": "De gebruikersnaam is verplicht."
  },
  "server.requiredEmployee": {
    "source": "Employee name is required",
    "fr": "Le nom de l’employé est obligatoire.",
    "nl": "De medewerkersnaam is verplicht."
  },
  "server.requiredOdooUrl": {
    "source": "Odoo URL is required",
    "fr": "L’adresse Odoo est obligatoire.",
    "nl": "Het Odoo-adres is verplicht."
  },
  "server.requiredProject": {
    "source": "Project is required",
    "fr": "Le projet est obligatoire.",
    "nl": "Het project is verplicht."
  },
  "server.invalidProgress": {
    "fr": "Réponse Progress invalide.",
    "nl": "Ongeldig Progress-antwoord."
  },
  "server.cross_origin_requests_are_not_allowed_0d086c": {
    "fr": "Les requêtes provenant d’une autre origine ne sont pas autorisées.",
    "nl": "Verzoeken vanaf een andere oorsprong zijn niet toegestaan.",
    "source": "Cross-origin requests are not allowed"
  },
  "server.use_get_for_this_endpoint_49bfd3": {
    "fr": "Utilisez GET pour cette adresse.",
    "nl": "Gebruik GET voor dit adres.",
    "source": "Use GET for this endpoint"
  },
  "server.use_post_for_this_endpoint_e6b3c5": {
    "fr": "Utilisez POST pour cette adresse.",
    "nl": "Gebruik POST voor dit adres.",
    "source": "Use POST for this endpoint"
  },
  "server.please_sign_in_to_continue_33d1f7": {
    "fr": "Veuillez vous connecter pour continuer.",
    "nl": "Meld u aan om verder te gaan.",
    "source": "Please sign in to continue"
  },
  "server.not_found_e3ebaa": {
    "fr": "Introuvable",
    "nl": "Niet gevonden",
    "source": "Not found"
  },
  "server.unexpected_server_error_e0d3bc": {
    "fr": "Erreur inattendue du serveur.",
    "nl": "Onverwachte serverfout.",
    "source": "Unexpected server error"
  },
  "server.config_file_sign_in_is_available_only_on_4c9cad": {
    "fr": "La connexion via le fichier de configuration est disponible uniquement sur cet ordinateur via localhost.",
    "nl": "Aanmelden via het configuratiebestand is alleen op deze computer via localhost beschikbaar.",
    "source": "Config-file sign-in is available only on this computer via localhost."
  },
  "server.too_many_attempts_please_try_again_later_282db6": {
    "fr": "Trop de tentatives. Réessayez plus tard.",
    "nl": "Te veel pogingen. Probeer het later opnieuw.",
    "source": "Too many attempts. Please try again later."
  },
  "server.request_body_must_be_valid_json_374c57": {
    "fr": "La requête doit contenir un objet JSON valide.",
    "nl": "Het verzoek moet een geldig JSON-object bevatten.",
    "source": "Request body must be valid JSON"
  },
  "server.please_provide_a_valid_email_and_password_e48cd7": {
    "fr": "Veuillez fournir une adresse e-mail et un mot de passe valides.",
    "nl": "Geef een geldig e-mailadres en wachtwoord op.",
    "source": "Please provide a valid email and password"
  },
  "server.the_local_config_file_could_not_be_read_33b050": {
    "fr": "Le fichier de configuration local est illisible. Vérifiez son JSON et les paramètres du jeton.",
    "nl": "Het lokale configuratiebestand kon niet worden gelezen. Controleer de JSON en de tokeninstellingen.",
    "source": "The local config file could not be read. Check its JSON and token settings."
  },
  "server.no_config_local_json_file_is_present_796b55": {
    "fr": "Aucun fichier config.local.json n’est présent.",
    "nl": "Er is geen bestand config.local.json aanwezig.",
    "source": "No config.local.json file is present."
  },
  "server.the_local_config_file_needs_a_valid_username_33d401": {
    "fr": "Le fichier de configuration local doit contenir un identifiant, un jeton API et des paramètres de connexion Odoo valides.",
    "nl": "Het lokale configuratiebestand moet een geldige gebruikersnaam, API-token en Odoo-verbindingsinstellingen bevatten.",
    "source": "The local config file needs a valid username, API token and Odoo connection settings."
  },
  "server.the_configured_token_was_rejected_by_odoo_it_8f0708": {
    "fr": "Le jeton configuré a été refusé par Odoo. Il peut être invalide ou expiré.",
    "nl": "Odoo heeft de ingestelde token geweigerd. Deze kan ongeldig of verlopen zijn.",
    "source": "The configured token was rejected by Odoo. It may be invalid or expired."
  },
  "server.email_or_password_not_recognized_by_odoo_4dc784": {
    "fr": "Adresse e-mail ou mot de passe non reconnu par Odoo.",
    "nl": "E-mailadres of wachtwoord niet herkend door Odoo.",
    "source": "Email or password not recognized by Odoo"
  },
  "server.odoo_sign_in_is_unavailable_please_try_again_f23453": {
    "fr": "La connexion à Odoo est indisponible. Réessayez plus tard.",
    "nl": "Aanmelden bij Odoo is niet beschikbaar. Probeer het later opnieuw.",
    "source": "Odoo sign-in is unavailable. Please try again later."
  },
  "server.sign_in_is_temporarily_unavailable_please_try_again_a7ed15": {
    "fr": "La connexion est temporairement indisponible. Réessayez plus tard.",
    "nl": "Aanmelden is tijdelijk niet beschikbaar. Probeer het later opnieuw.",
    "source": "Sign-in is temporarily unavailable. Please try again later."
  },
  "server.odoo_rejected_the_database_username_or_api_key_f00e2e": {
    "fr": "Odoo a refusé la base de données, l’identifiant ou la clé API.",
    "nl": "Odoo heeft de database, gebruikersnaam of API-sleutel geweigerd.",
    "source": "Odoo rejected the database, username, or API key."
  },
  "server.odoo_returned_an_unexpected_database_list_response_9e2bc2": {
    "fr": "Odoo a renvoyé une liste de bases de données inattendue.",
    "nl": "Odoo gaf een onverwachte databaselijst terug.",
    "source": "Odoo returned an unexpected database-list response."
  },
  "server.direct_employee_name_search_failed_5d4761": {
    "fr": "La recherche directe par nom d’employé a échoué : {p0}",
    "nl": "Rechtstreeks zoeken op medewerkersnaam is mislukt: {p0}",
    "source": "Direct employee-name search failed: {p0}"
  },
  "server.no_employee_found_matching_e91fa1": {
    "fr": "Aucun employé trouvé pour « {p0} ».",
    "nl": "Geen medewerker gevonden voor ‘{p0}’.",
    "source": "No employee found matching \"{p0}\"."
  },
  "server.planning_search_failed_for_88844c": {
    "fr": "La recherche du planning a échoué pour {p0} : {p1}",
    "nl": "Zoeken naar planning mislukt voor {p0}: {p1}",
    "source": "Planning search failed for {p0}: {p1}"
  },
  "server.could_not_search_planning_slots_b93472": {
    "fr": "Impossible de rechercher les allocations de planning.",
    "nl": "Planningsallocaties konden niet worden opgezocht.",
    "source": "Could not search planning slots"
  },
  "server.could_not_search_project_planning_slots_3cd281": {
    "fr": "Impossible de rechercher le planning du projet.",
    "nl": "De projectplanning kon niet worden opgezocht.",
    "source": "Could not search project planning slots"
  },
  "server.task_search_failed_for_23dbc8": {
    "fr": "La recherche des tâches a échoué pour {p0} : {p1}",
    "nl": "Zoeken naar taken mislukt voor {p0}: {p1}",
    "source": "Task search failed for {p0}: {p1}"
  },
  "server.could_not_search_project_tasks_7db70b": {
    "fr": "Impossible de rechercher les tâches du projet.",
    "nl": "De projecttaken konden niet worden opgezocht.",
    "source": "Could not search project tasks"
  },
  "server.no_workpackage_tasks_were_detected_in_the_fetched_1bd3d1": {
    "fr": "Aucun lot de travail n’a été détecté dans les tâches chargées du projet.",
    "nl": "Er werd geen werkpakket gevonden in de geladen projecttaken.",
    "source": "No workpackage tasks were detected in the fetched project tasks."
  },
  "server.project_milestone_lookup_failed_f33227": {
    "fr": "La recherche des jalons du projet a échoué : {p0}",
    "nl": "Zoeken naar projectmijlpalen mislukt: {p0}",
    "source": "Project milestone lookup failed: {p0}"
  },
  "server.milestone_search_failed_for_321d63": {
    "fr": "La recherche des jalons a échoué pour {p0} : {p1}",
    "nl": "Zoeken naar mijlpalen mislukt voor {p0}: {p1}",
    "source": "Milestone search failed for {p0}: {p1}"
  },
  "server.could_not_search_project_milestones_701e81": {
    "fr": "Impossible de rechercher les jalons du projet.",
    "nl": "De projectmijlpalen konden niet worden opgezocht.",
    "source": "Could not search project milestones"
  },
  "server.no_likely_project_responsible_unit_field_was_found_a479a3": {
    "fr": "Aucun champ d’unité responsable du projet n’a été identifié.",
    "nl": "Er werd geen veld voor de verantwoordelijke projecteenheid gevonden.",
    "source": "No likely project responsible-unit field was found."
  },
  "server.dico_project_search_failed_for_fb3acf": {
    "fr": "La recherche des projets DiCo a échoué pour {p0} : {p1}",
    "nl": "Zoeken naar DiCo-projecten mislukt voor {p0}: {p1}",
    "source": "Dico project search failed for {p0}: {p1}"
  },
  "server.no_projects_found_with_responsible_unit_using_97afa1": {
    "fr": "Aucun projet trouvé pour l’unité responsable « {p0} » avec {p1}.",
    "nl": "Geen projecten gevonden voor verantwoordelijke eenheid ‘{p0}’ met {p1}.",
    "source": "No projects found with responsible unit \"{p0}\" using {p1}."
  },
  "server.dico_project_timesheet_fetch_failed_d04ad8": {
    "fr": "Le chargement des pointages des projets DiCo a échoué : {p0}",
    "nl": "Laden van tijdregistraties van DiCo-projecten mislukt: {p0}",
    "source": "Dico project timesheet fetch failed: {p0}"
  },
  "server.no_project_planning_domain_was_available_for_dico_8c6570": {
    "fr": "Aucun périmètre de planning n’est disponible pour les projets DiCo.",
    "nl": "Er is geen planningsselectie beschikbaar voor DiCo-projecten.",
    "source": "No project planning domain was available for Dico projects."
  },
  "server.dico_project_planning_fetch_failed_3ddf93": {
    "fr": "Le chargement du planning des projets DiCo a échoué : {p0}",
    "nl": "Laden van planning van DiCo-projecten mislukt: {p0}",
    "source": "Dico project planning fetch failed: {p0}"
  },
  "server.local_configuration_files_are_not_served_efbc0e": {
    "fr": "Les fichiers de configuration locaux ne sont pas accessibles par le serveur web.",
    "nl": "Lokale configuratiebestanden worden niet via de webserver aangeboden.",
    "source": "Local configuration files are not served"
  },
  "server.use_get_or_post_for_this_endpoint_6c7fe3": {
    "fr": "Utilisez GET ou POST pour cette adresse.",
    "nl": "Gebruik GET of POST voor dit adres.",
    "source": "Use GET or POST for this endpoint"
  },
  "server.choose_french_or_dutch_8b6461": {
    "fr": "Choisissez le français ou le néerlandais.",
    "nl": "Kies Frans of Nederlands.",
    "source": "Choose French or Dutch"
  },
  "server.the_local_language_preference_could_not_be_saved_e90ff9": {
    "fr": "La préférence de langue n’a pas pu être enregistrée localement.",
    "nl": "De taalvoorkeur kon niet lokaal worden opgeslagen.",
    "source": "The local language preference could not be saved"
  },
  "server.could_not_be_read_check_that_it_contains_77a794": {
    "fr": "Impossible de lire {p0}. Vérifiez qu’il contient un objet JSON valide.",
    "nl": "{p0} kon niet worden gelezen. Controleer of het een geldig JSON-object bevat.",
    "source": "{p0} could not be read. Check that it contains a valid JSON object."
  },
  "server.request_body_is_too_large_fd973e": {
    "fr": "La requête est trop volumineuse.",
    "nl": "Het verzoek is te groot.",
    "source": "Request body is too large"
  },
  "server.odoo_url_must_be_a_valid_http_or_4eb141": {
    "fr": "L’adresse Odoo doit être une URL http ou https valide.",
    "nl": "Het Odoo-adres moet een geldige http- of https-URL zijn.",
    "source": "Odoo URL must be a valid http or https URL"
  },
  "server.odoo_url_must_start_with_http_or_https_a22478": {
    "fr": "L’adresse Odoo doit commencer par http:// ou https://.",
    "nl": "Het Odoo-adres moet beginnen met http:// of https://.",
    "source": "Odoo URL must start with http:// or https://"
  },
  "server.is_required_dbcad6": {
    "fr": "{p0} est obligatoire.",
    "nl": "{p0} is verplicht.",
    "source": "{p0} is required"
  },
  "server.api_key_is_required_59b831": {
    "fr": "La clé API est obligatoire.",
    "nl": "De API-sleutel is verplicht.",
    "source": "API key is required"
  },
  "server.search_read_returned_an_unexpected_response_dd1016": {
    "fr": "{p0}.search_read a renvoyé une réponse inattendue.",
    "nl": "{p0}.search_read gaf een onverwacht antwoord.",
    "source": "{p0}.search_read returned an unexpected response"
  },
  "server.selected_project_is_unavailable_b15bde": {
    "fr": "Le projet sélectionné est indisponible.",
    "nl": "Het geselecteerde project is niet beschikbaar.",
    "source": "Selected project is unavailable"
  },
  "server.project_lookup_failed_763350": {
    "fr": "La recherche du projet a échoué : {p0}",
    "nl": "Zoeken naar het project mislukt: {p0}",
    "source": "Project lookup failed: {p0}"
  },
  "server.budget_search_failed_8e0a08": {
    "fr": "La recherche des budgets {p0} a échoué : {p1}",
    "nl": "Zoeken naar budgetten {p0} mislukt: {p1}",
    "source": "{p0} budget search failed: {p1}"
  },
  "server.budget_model_discovery_failed_deca1f": {
    "fr": "La recherche des modèles de budget a échoué : {p0}",
    "nl": "Zoeken naar budgetmodellen mislukt: {p0}",
    "source": "Budget model discovery failed: {p0}"
  },
  "server.budget_line_model_discovery_failed_f43102": {
    "fr": "La recherche des modèles de lignes budgétaires a échoué : {p0}",
    "nl": "Zoeken naar modellen voor budgetregels mislukt: {p0}",
    "source": "Budget line model discovery failed: {p0}"
  },
  "server.fields_get_returned_an_unexpected_response_e055ef": {
    "fr": "fields_get a renvoyé une réponse inattendue.",
    "nl": "fields_get gaf een onverwacht antwoord.",
    "source": "fields_get returned an unexpected response"
  },
  "server.could_not_inspect_2ce51e": {
    "fr": "Impossible d’examiner {p0} : {p1}",
    "nl": "{p0} kon niet worden onderzocht: {p1}",
    "source": "Could not inspect {p0}: {p1}"
  },
  "server.budget_line_search_failed_f0a7db": {
    "fr": "La recherche des lignes budgétaires {p0} a échoué : {p1}",
    "nl": "Zoeken naar budgetregels {p0} mislukt: {p1}",
    "source": "{p0} budget line search failed: {p1}"
  },
  "server.budget_1508eb": {
    "fr": "Budget {p0}",
    "nl": "Budget {p0}"
  },
  "server.budget_line_e45188": {
    "fr": "Ligne budgétaire {p0}",
    "nl": "Budgetregel {p0}",
    "source": "Budget line {p0}"
  },
  "server.found_convention_like_budgets_showing_the_largest_one_9fdbe0": {
    "fr": "{p0} budgets de type convention trouvés ; le plus grand est affiché.",
    "nl": "{p0} conventieachtige budgetten gevonden; het grootste wordt getoond.",
    "source": "Found {p0} convention-like budgets; showing the largest one."
  },
  "server.excluded_future_annual_budget_after_dcb6c5": {
    "fr": "{p0} budget{p1} annuel{p1} futur{p1} exclu{p1} après {p2}.",
    "nl": "{p0} toekomstige budget{p1} na {p2} uitgesloten.",
    "source": "Excluded {p0} future annual budget{p1} after {p2}."
  },
  "server.project_d3be21": {
    "fr": "Projet {p0}",
    "nl": "Project {p0}",
    "source": "Project {p0}"
  },
  "server.milestone_642656": {
    "fr": "Jalon {p0}",
    "nl": "Mijlpaal {p0}",
    "source": "Milestone {p0}"
  },
  "server.task_8144db": {
    "fr": "Tâche {p0}",
    "nl": "Taak {p0}",
    "source": "Task {p0}"
  },
  "server.employee_function_lookup_via_failed_52f623": {
    "fr": "La recherche de la fonction de l’employé via {p0} a échoué : {p1}",
    "nl": "Zoeken naar de medewerkersfunctie via {p0} mislukt: {p1}",
    "source": "Employee function lookup via {p0} failed: {p1}"
  },
  "server.employee_function_unavailable_for_planning_record_s_subcontractor_7eb330": {
    "fr": "Fonction employé indisponible pour {p0} allocation(s) ; la classification des sous-traitants utilise le rôle du planning.",
    "nl": "Medewerkersfunctie niet beschikbaar voor {p0} planningsregel(s); de classificatie van onderaannemers gebruikt de planningsrol.",
    "source": "Employee function unavailable for {p0} planning record(s); subcontractor classification uses the planning role instead."
  },
  "server.employee_function_unavailable_for_record_s_their_hours_db786e": {
    "fr": "Fonction employé indisponible pour {p0} ligne(s) ; leurs heures restent incluses car le statut de sous-traitant est invérifiable.",
    "nl": "Medewerkersfunctie niet beschikbaar voor {p0} regel(s); hun uren blijven inbegrepen omdat de onderaannemersstatus niet kan worden geverifieerd.",
    "source": "Employee function unavailable for {p0} record(s); their hours remain included because subcontractor status cannot be verified."
  },
  "server.no_project_dfd8ad": {
    "fr": "(Sans projet)",
    "nl": "(Geen project)",
    "source": "(No project)"
  },
  "server.no_employee_5a26f0": {
    "fr": "(Sans employé)",
    "nl": "(Geen medewerker)",
    "source": "(No employee)"
  },
  "server.project_272274": {
    "fr": "[{p0}] Projet {p1}",
    "nl": "[{p0}] Project {p1}",
    "source": "[{p0}] Project {p1}"
  },
  "server.odoo_is_strictly_read_only_this_rpc_operation_a4b220": {
    "fr": "Odoo est strictement en lecture seule : cette opération RPC est bloquée. Toute écriture nécessite une approbation explicite avant implémentation ou exécution.",
    "nl": "Odoo is strikt alleen-lezen: deze RPC-bewerking is geblokkeerd. Elke schrijfactie vereist expliciete goedkeuring vóór implementatie of uitvoering.",
    "source": "Odoo is strictly read-only: this RPC operation is blocked. Any write requires explicit user approval before implementation or execution."
  },
  "server.odoo_returned_http_d3863f": {
    "fr": "Odoo a renvoyé le statut HTTP {p0}.",
    "nl": "Odoo gaf HTTP-status {p0} terug.",
    "source": "Odoo returned HTTP {p0}"
  },
  "server.odoo_did_not_respond_within_15_seconds_86556c": {
    "fr": "Odoo n’a pas répondu dans les 15 secondes.",
    "nl": "Odoo heeft niet binnen 15 seconden geantwoord.",
    "source": "Odoo did not respond within 15 seconds"
  },
  "server.access_denied_by_odoo_e5ad70": {
    "fr": "Accès refusé par Odoo.",
    "nl": "Toegang geweigerd door Odoo.",
    "source": "Access denied by Odoo."
  },
  "server.odoo_request_failed_check_the_connection_and_account_751e6f": {
    "fr": "La requête Odoo a échoué. Vérifiez la connexion et les droits du compte.",
    "nl": "Het Odoo-verzoek is mislukt. Controleer de verbinding en de accountrechten.",
    "source": "Odoo request failed. Check the connection and account permissions."
  },
  "server.could_not_reach_odoo_623186": {
    "fr": "Impossible de joindre Odoo : {p0}",
    "nl": "Odoo niet bereikbaar: {p0}",
    "source": "Could not reach Odoo: {p0}"
  },
  "server.odoo_returned_an_xml_rpc_fault_253f0c": {
    "fr": "Odoo a renvoyé une erreur XML-RPC.",
    "nl": "Odoo gaf een XML-RPC-fout terug.",
    "source": "Odoo returned an XML-RPC fault"
  },
  "server.odoo_response_did_not_contain_a_value_49eeb7": {
    "fr": "La réponse Odoo ne contient aucune valeur.",
    "nl": "Het Odoo-antwoord bevat geen waarde.",
    "source": "Odoo response did not contain a value"
  },
  "server.odoo_rejected_your_credentials_36ddde": {
    "fr": "Odoo a refusé vos identifiants.",
    "nl": "Odoo heeft uw aanmeldgegevens geweigerd.",
    "source": "Odoo rejected your credentials"
  },
  "server.projectid_must_be_a_positive_integer_6db60f": {
    "fr": "projectId doit être un entier positif.",
    "nl": "projectId moet een positief geheel getal zijn.",
    "source": "projectId must be a positive integer"
  },
  "server.lecture_du_pilotage_indisponible_verifier_le_filtre_dico_60dabd": {
    "fr": "Lecture du pilotage indisponible. Vérifier le filtre DiCo, le référentiel programmes et les accès Odoo.",
    "nl": "Sturingsgegevens niet beschikbaar. Controleer het DiCo-filter, de programmalijst en de Odoo-toegang."
  },
  "server.odoo_project_lead_unit_lead_unit_id_is_905279": {
    "fr": "Le champ Lead Unit (lead_unit_id) du projet Odoo est indisponible.",
    "nl": "Het Odoo-projectveld Lead Unit (lead_unit_id) is niet beschikbaar.",
    "source": "Odoo project Lead Unit (lead_unit_id) is unavailable"
  },
  "server.your_employee_lead_unit_cannot_be_read_with_093fc1": {
    "fr": "L’unité responsable de votre employé n’est pas accessible avec vos droits Odoo.",
    "nl": "De verantwoordelijke eenheid van uw medewerker kan niet worden gelezen met uw Odoo-rechten.",
    "source": "Your employee Lead Unit cannot be read with your Odoo permissions"
  },
  "server.your_odoo_account_has_multiple_lead_units_contact_3dbb2e": {
    "fr": "Votre compte Odoo a plusieurs unités responsables ; contactez votre administrateur.",
    "nl": "Uw Odoo-account heeft meerdere verantwoordelijke eenheden; neem contact op met uw beheerder.",
    "source": "Your Odoo account has multiple Lead Units; contact your administrator"
  },
  "server.no_lead_unit_is_linked_to_your_odoo_821064": {
    "fr": "Aucune unité responsable n’est liée à votre compte Odoo.",
    "nl": "Er is geen verantwoordelijke eenheid aan uw Odoo-account gekoppeld.",
    "source": "No Lead Unit is linked to your Odoo account"
  },
  "server.planning_has_no_supported_project_relation_no_unfiltered_ae537d": {
    "fr": "Le planning n’a aucune relation projet prise en charge ; aucune requête non filtrée n’a été effectuée.",
    "nl": "De planning heeft geen ondersteunde projectrelatie; er is geen ongefilterde zoekopdracht uitgevoerd.",
    "source": "Planning has no supported project relation; no unfiltered query was made"
  },
  "server.your_odoo_account_could_not_be_linked_to_aee528": {
    "fr": "Votre compte Odoo n’a pas pu être lié à un employé accessible.",
    "nl": "Uw Odoo-account kon niet aan een toegankelijke medewerker worden gekoppeld.",
    "source": "Your Odoo account could not be linked to an accessible employee."
  },
  "server.veuillez_vous_connecter_pour_continuer_a2c2ed": {
    "fr": "Veuillez vous connecter pour continuer.",
    "nl": "Meld u aan om verder te gaan."
  },
  "server.utilisez_post_pour_cette_lecture_c3a341": {
    "fr": "Utilisez POST pour cette lecture.",
    "nl": "Gebruik POST voor deze leesopdracht."
  },
  "server.la_requete_doit_contenir_un_objet_json_valide_7fdb27": {
    "fr": "La requête doit contenir un objet JSON valide.",
    "nl": "Het verzoek moet een geldig JSON-object bevatten."
  },
  "server.choisissez_de_1_a_30_annees_valides_pour_8ff25a": {
    "fr": "Choisissez de 1 à 30 années valides pour cette période.",
    "nl": "Kies 1 tot 30 geldige jaren voor deze periode."
  },
  "server.veuillez_vous_reconnecter_pour_verifier_votre_identite_4c5dc8": {
    "fr": "Veuillez vous reconnecter pour vérifier votre identité.",
    "nl": "Meld u opnieuw aan om uw identiteit te controleren."
  },
  "server.le_calendrier_de_travail_ou_les_droits_annuels_a602c4": {
    "fr": "Le calendrier de travail ou les droits annuels ne sont pas accessibles avec vos droits Odoo.",
    "nl": "De werkkalender of jaarlijkse verlofrechten zijn niet toegankelijk met uw Odoo-rechten."
  },
  "server.personal_time_is_unavailable_please_try_again_later_77f922": {
    "fr": "Les heures personnelles sont indisponibles. Réessayez plus tard.",
    "nl": "Persoonlijke uren zijn niet beschikbaar. Probeer het later opnieuw.",
    "source": "Personal time is unavailable. Please try again later."
  },
  "server.personal_timesheets_are_unavailable_with_your_current_odoo_e2168a": {
    "fr": "Les pointages personnels sont indisponibles avec vos accès ou le schéma Odoo actuel.",
    "nl": "Persoonlijke tijdregistraties zijn niet beschikbaar met uw huidige Odoo-toegang of -schema.",
    "source": "Personal timesheets are unavailable with your current Odoo access or schema."
  },
  "server.personal_planning_is_unavailable_with_your_current_odoo_127e1c": {
    "fr": "Le planning personnel est indisponible avec vos accès ou le schéma Odoo actuel.",
    "nl": "Persoonlijke planning is niet beschikbaar met uw huidige Odoo-toegang of -schema.",
    "source": "Personal planning is unavailable with your current Odoo access or schema."
  },
  "server.employe_7a7329": {
    "fr": "Employé {p0}",
    "nl": "Medewerker {p0}"
  },
  "server.employe_non_identifie_7b6957": {
    "fr": "Employé non identifié",
    "nl": "Niet-geïdentificeerde medewerker"
  },
  "server.project_lifetime_metadata_is_unavailable_with_your_current_6c7b8e": {
    "fr": "Les données de durée du projet sont indisponibles avec vos accès Odoo actuels.",
    "nl": "De looptijdgegevens van het project zijn niet beschikbaar met uw huidige Odoo-toegang.",
    "source": "Project lifetime metadata is unavailable with your current Odoo access."
  },
  "server.project_convention_budget_is_unavailable_with_your_current_a3b780": {
    "fr": "Le budget conventionnel du projet est indisponible avec vos accès Odoo actuels.",
    "nl": "Het conventiebudget van het project is niet beschikbaar met uw huidige Odoo-toegang.",
    "source": "Project convention budget is unavailable with your current Odoo access."
  },
  "server.project_dates_are_unavailable_with_your_current_odoo_561ecd": {
    "fr": "Les dates du projet sont indisponibles avec vos accès Odoo actuels.",
    "nl": "De projectdatums zijn niet beschikbaar met uw huidige Odoo-toegang.",
    "source": "Project dates are unavailable with your current Odoo access."
  },
  "server.les_projets_de_unit_dico_sont_indisponibles_reessayez_37bf9b": {
    "fr": "Les projets de Unit DiCo sont indisponibles. Réessayez ou vérifiez vos accès Odoo et le champ d’unité responsable.",
    "nl": "De projecten van Eenheid DiCo zijn niet beschikbaar. Probeer opnieuw of controleer uw Odoo-toegang en het veld voor de verantwoordelijke eenheid."
  },
  "server.an_empty_json_object_is_required_5def93": {
    "fr": "Un objet JSON vide est requis.",
    "nl": "Een leeg JSON-object is vereist.",
    "source": "An empty JSON object is required"
  },
  "server.les_photos_des_responsables_de_programme_sont_indisponibles_0c58fa": {
    "fr": "Les photos des responsables de programme sont indisponibles. Réessayez ou vérifiez vos accès Odoo.",
    "nl": "De foto’s van de programmaverantwoordelijken zijn niet beschikbaar. Probeer opnieuw of controleer uw Odoo-toegang."
  },
  "server.programmeid_must_identify_dc1_dc2_or_dc3_without_9aaca8": {
    "fr": "programmeId doit identifier DC1, DC2 ou DC3, sans champ supplémentaire.",
    "nl": "programmeId moet DC1, DC2 of DC3 identificeren, zonder extra velden.",
    "source": "programmeId must identify DC1, DC2 or DC3 without additional fields"
  },
  "server.les_projets_du_programme_sont_indisponibles_reessayez_ou_e043e4": {
    "fr": "Les projets du programme sont indisponibles. Réessayez ou vérifiez vos accès Odoo.",
    "nl": "De projecten van het programma zijn niet beschikbaar. Probeer opnieuw of controleer uw Odoo-toegang."
  },
  "server.a_positive_integer_projectid_is_required_592de9": {
    "fr": "Un projectId entier positif est requis.",
    "nl": "Een positief geheel getal voor projectId is vereist.",
    "source": "A positive integer projectId is required"
  },
  "server.les_budgets_du_projet_sont_indisponibles_reessayez_ou_7c46d0": {
    "fr": "Les budgets du projet sont indisponibles. Réessayez ou vérifiez vos accès Odoo.",
    "nl": "De projectbudgetten zijn niet beschikbaar. Probeer opnieuw of controleer uw Odoo-toegang."
  },
  "server.project_hours_are_unavailable_please_try_again_later_fdc401": {
    "fr": "Les heures du projet sont indisponibles. Réessayez plus tard.",
    "nl": "De projecturen zijn niet beschikbaar. Probeer het later opnieuw.",
    "source": "Project hours are unavailable. Please try again later."
  },
  "server.the_selected_project_is_unavailable_with_your_current_c4c808": {
    "fr": "Le projet sélectionné est indisponible avec vos accès Odoo actuels.",
    "nl": "Het geselecteerde project is niet beschikbaar met uw huidige Odoo-toegang.",
    "source": "The selected project is unavailable with your current Odoo access."
  },
  "server.project_timesheets_are_unavailable_with_your_current_odoo_66ab7d": {
    "fr": "Les pointages du projet sont indisponibles avec vos accès ou le schéma Odoo actuel.",
    "nl": "Projecttijdregistraties zijn niet beschikbaar met uw huidige Odoo-toegang of -schema.",
    "source": "Project timesheets are unavailable with your current Odoo access or schema."
  },
  "server.project_planning_is_unavailable_with_your_current_odoo_79b9fb": {
    "fr": "Le planning du projet est indisponible avec vos accès ou le schéma Odoo actuel.",
    "nl": "Projectplanning is niet beschikbaar met uw huidige Odoo-toegang of -schema.",
    "source": "Project planning is unavailable with your current Odoo access or schema."
  },
  "server.project_assignment_functions_are_unavailable_ormitter_presence_is_6d749d": {
    "fr": "Les fonctions des affectations sont indisponibles ; la présence d’Ormitters repose uniquement sur les lignes confirmées.",
    "nl": "Functies van projecttoewijzingen zijn niet beschikbaar; de aanwezigheid van Ormitters is alleen gebaseerd op bevestigde regels.",
    "source": "Project assignment functions are unavailable; Ormitter presence is based on confirmed records only."
  },
  "server.project_assignments_are_unavailable_ormitter_presence_is_based_dae9b4": {
    "fr": "Les affectations du projet sont indisponibles ; la présence d’Ormitters repose uniquement sur les heures confirmées.",
    "nl": "Projecttoewijzingen zijn niet beschikbaar; de aanwezigheid van Ormitters is alleen gebaseerd op bevestigde urenregels.",
    "source": "Project assignments are unavailable; Ormitter presence is based on confirmed hour records only."
  },
  "server.rubrique_non_renseignee_3c7fa2": {
    "fr": "Rubrique non renseignée",
    "nl": "Rubriek niet ingevuld"
  },
  "server.les_lignes_referencees_ne_sont_pas_toutes_accessibles_ab51a1": {
    "fr": "Les lignes référencées ne sont pas toutes accessibles ; les totaux sont indisponibles.",
    "nl": "Niet alle gekoppelde regels zijn toegankelijk; totalen zijn niet beschikbaar."
  },
  "server.devise_absente_ou_differente_dans_les_lignes_aucun_beb077": {
    "fr": "Devise absente ou différente dans les lignes ; aucun total monétaire combiné.",
    "nl": "Valuta ontbreekt of verschilt tussen regels; geen gecombineerd geldbedrag."
  },
  "server.des_comptes_annuels_ne_sont_pas_classifiables_en_f651d1": {
    "fr": "Des comptes annuels ne sont pas classifiables en 6xxx, 7xxx ou 9xxx ; les totaux sont indisponibles.",
    "nl": "Sommige jaarrekeningen kunnen niet als 6xxx, 7xxx of 9xxx worden geclassificeerd; totalen zijn niet beschikbaar."
  },
  "server.certains_montants_odoo_sont_absents_ou_illisibles_ils_67c3ff": {
    "fr": "Certains montants Odoo sont absents ou illisibles ; ils ne sont pas remplacés par zéro.",
    "nl": "Sommige Odoo-bedragen ontbreken of zijn onleesbaar; ze worden niet door nul vervangen."
  },
  "server.les_ajustements_9xxx_sont_conserves_la_reconciliation_automatique_c444bb": {
    "fr": "Les ajustements 9xxx sont conservés ; la réconciliation automatique est indisponible.",
    "nl": "Aanpassingen 9xxx blijven behouden; automatische afstemming is niet beschikbaar."
  },
  "server.une_commande_confirmee_a_un_fournisseur_non_verifiable_bca2a6": {
    "fr": "Une commande confirmée a un fournisseur non vérifiable ; l’exclusion des engagements reste inconnue.",
    "nl": "Een bevestigde bestelling heeft een niet-verifieerbare leverancier; de uitsluiting van vastleggingen blijft onbekend."
  },
  "server.des_commandes_ormit_ou_non_attribuables_empechent_de_9a55bd": {
    "fr": "Des commandes Ormit ou non attribuables empêchent de déduire automatiquement leur part engagée.",
    "nl": "Ormit-bestellingen of niet-toewijsbare bestellingen verhinderen de automatische aftrek van hun vastgelegde aandeel."
  },
  "server.les_commandes_confirmees_du_projet_ne_sont_pas_a0119a": {
    "fr": "Les commandes confirmées du projet ne sont pas vérifiables ; aucune part engagée Ormit n’est estimée.",
    "nl": "De bevestigde projectbestellingen kunnen niet worden geverifieerd; er wordt geen vastgelegd Ormit-aandeel geschat."
  },
  "server.les_depenses_annuelles_ne_permettent_pas_de_verifier_36ce3e": {
    "fr": "Les dépenses annuelles ne permettent pas de vérifier l’exclusion Ormit.",
    "nl": "De jaarlijkse uitgaven laten niet toe de Ormit-uitsluiting te verifiëren."
  },
  "server.un_fournisseur_de_depense_facturee_est_absent_ou_98cfc0": {
    "fr": "Un fournisseur de dépense facturée est absent ou non vérifiable ; sa part Ormit reste inconnue.",
    "nl": "Een leverancier van gefactureerde uitgaven ontbreekt of is niet verifieerbaar; het Ormit-aandeel blijft onbekend."
  },
  "server.les_depenses_facturees_ne_se_reconcilient_pas_avec_32e9c2": {
    "fr": "Les dépenses facturées ne se réconcilient pas avec une ligne annuelle pour sa période, catégorie et devise.",
    "nl": "De gefactureerde uitgaven stemmen niet overeen met een jaarregel voor dezelfde periode, categorie en valuta."
  },
  "server.une_periode_categorie_devise_ou_ecriture_annuelle_est_084dd2": {
    "fr": "Une période, catégorie, devise ou écriture annuelle est ambiguë ; l’exclusion de cette ligne est indisponible.",
    "nl": "Een periode, categorie, valuta of jaarlijkse boeking is dubbelzinnig; uitsluiting van deze regel is niet beschikbaar."
  },
  "server.la_part_engagee_hors_ormit_est_indisponible_sans_7c0ae4": {
    "fr": "La part engagée hors Ormit est indisponible sans preuve complète des commandes ; elle n’est pas remplacée par le facturé.",
    "nl": "Het vastgelegde aandeel zonder Ormit is niet beschikbaar zonder volledig bewijs van bestellingen; het wordt niet door het gefactureerde bedrag vervangen."
  },
  "server.l_exclusion_est_verifiee_sur_les_ecritures_et_f6525f": {
    "fr": "L’exclusion est vérifiée sur les écritures et commandes accessibles au compte connecté ; les règles d’accès restent applicables.",
    "nl": "De uitsluiting wordt gecontroleerd op boekingen en bestellingen die voor de aangemelde account toegankelijk zijn; toegangsregels blijven van toepassing."
  },
  "server.le_libelle_settlements_new_n_est_pas_accessible_3580ed": {
    "fr": "Le libellé Settlements New n’est pas accessible ; les montants restent disponibles.",
    "nl": "De omschrijving in Settlements New is niet toegankelijk; de bedragen blijven beschikbaar."
  },
  "server.certains_libelles_settlements_new_sont_absents_modifies_ou_a846da": {
    "fr": "Certains libellés Settlements New sont absents, modifiés ou inaccessibles ; les montants restent disponibles.",
    "nl": "Sommige omschrijvingen in Settlements New ontbreken, zijn gewijzigd of niet toegankelijk; de bedragen blijven beschikbaar."
  },
  "server.les_libelles_settlements_new_sont_indisponibles_avec_vos_802783": {
    "fr": "Les libellés Settlements New sont indisponibles avec vos accès ; les montants restent disponibles.",
    "nl": "Omschrijvingen in Settlements New zijn niet beschikbaar met uw toegangsrechten; de bedragen blijven beschikbaar."
  },
  "server.la_devise_des_ecritures_annuelles_n_est_pas_0db0cb": {
    "fr": "La devise des écritures annuelles n’est pas vérifiable.",
    "nl": "De valuta van de jaarlijkse boekingen is niet verifieerbaar."
  },
  "server.la_periode_ou_la_categorie_exacte_de_cette_2e1e0e": {
    "fr": "La période ou la catégorie exacte de cette ligne annuelle n’est pas vérifiable.",
    "nl": "De exacte periode of categorie van deze jaarregel is niet verifieerbaar."
  },
  "server.plusieurs_lignes_annuelles_partagent_la_meme_categorie_leurs_44e9a7": {
    "fr": "Plusieurs lignes annuelles partagent la même catégorie ; leurs écritures ne doivent pas être additionnées plusieurs fois.",
    "nl": "Meerdere jaarregels delen dezelfde categorie; hun boekingen mogen niet meermaals worden opgeteld."
  },
  "server.des_ecritures_ont_une_classification_date_ou_validation_1d5051": {
    "fr": "Des écritures ont une classification, date ou validation inconnue ; la liste facturée est partielle.",
    "nl": "Sommige boekingen hebben een onbekende classificatie, datum of validatie; de lijst met gefactureerde posten is gedeeltelijk."
  },
  "server.des_devises_sont_absentes_ou_differentes_aucun_total_b348d5": {
    "fr": "Des devises sont absentes ou différentes ; aucun total de la liste n’est combiné.",
    "nl": "Valuta’s ontbreken of verschillen; de lijst wordt niet tot één totaal samengevoegd."
  },
  "server.certains_montants_source_sont_absents_ils_ne_sont_9b6e01": {
    "fr": "Certains montants source sont absents ; ils ne sont pas remplacés par zéro.",
    "nl": "Sommige bronbedragen ontbreken; ze worden niet door nul vervangen."
  },
  "server.la_liste_accessible_ne_se_reconcilie_pas_avec_e83279": {
    "fr": "La liste accessible ne se réconcilie pas avec le consommé facturé de cette ligne annuelle.",
    "nl": "De toegankelijke lijst stemt niet overeen met het gefactureerde verbruik van deze jaarregel."
  },
  "server.certains_fournisseurs_ne_sont_pas_verifiables_leur_classification_1c182e": {
    "fr": "Certains fournisseurs ne sont pas vérifiables ; leur classification Ormit reste inconnue.",
    "nl": "Sommige leveranciers kunnen niet worden geverifieerd; hun Ormit-classificatie blijft onbekend."
  },
  "server.les_lignes_sont_des_montants_analytiques_affectes_a_f4ab71": {
    "fr": "Les lignes sont des montants analytiques affectés à cette catégorie, pas des totaux de factures ; les règles d’accès du compte connecté restent applicables.",
    "nl": "De regels zijn analytische bedragen toegewezen aan deze categorie, geen factuurtotalen; de toegangsregels van de aangemelde account blijven van toepassing."
  },
  "server.ecriture_s_de_classification_ou_statut_inconnu_sont_7ef30d": {
    "fr": "{p0} écriture(s) de classification ou statut inconnu sont exclues du sous-total connu.",
    "nl": "{p0} boeking(en) met onbekende classificatie of status zijn uitgesloten van het bekende subtotaal."
  },
  "server.cout_s_monetaire_s_sont_absents_le_sous_ac3a6f": {
    "fr": "{p0} coût(s) monétaire(s) sont absents ; le sous-total connu est partiel.",
    "nl": "{p0} geldbedrag(en) ontbreken; het bekende subtotaal is gedeeltelijk."
  },
  "server.ecriture_s_sans_date_exploitable_sont_exclues_du_246e19": {
    "fr": "{p0} écriture(s) sans date exploitable sont exclues du sous-total connu.",
    "nl": "{p0} boeking(en) zonder bruikbare datum zijn uitgesloten van het bekende subtotaal."
  },
  "server.ecriture_s_d_heures_ont_un_cout_enregistre_08558f": {
    "fr": "{p0} écriture(s) d’heures ont un coût enregistré nul ; aucune estimation de taux n’est appliquée.",
    "nl": "{p0} urenboeking(en) hebben een geregistreerde kost van nul; er wordt geen tarief geschat."
  },
  "server.les_couts_qualifies_ont_des_devises_absentes_ou_d890f9": {
    "fr": "Les coûts qualifiés ont des devises absentes ou différentes ; aucun total combiné n’est calculé.",
    "nl": "De gekwalificeerde kosten hebben ontbrekende of verschillende valuta’s; er wordt geen gecombineerd totaal berekend."
  },
  "server.rubrique_c40612": {
    "fr": "Rubrique {p0}",
    "nl": "Rubriek {p0}"
  },
  "server.cout_des_heures_rubrique_non_renseignee_70cd13": {
    "fr": "Coût des heures · rubrique non renseignée",
    "nl": "Urenkosten · rubriek niet ingevuld"
  },
  "server.depenses_rubrique_non_renseignee_0a3cf3": {
    "fr": "Dépenses · rubrique non renseignée",
    "nl": "Uitgaven · rubriek niet ingevuld"
  },
  "server.les_dates_du_projet_ne_permettent_pas_de_ca3883": {
    "fr": "Les dates du projet ne permettent pas de contrôler les écritures hors période ; les coûts à ce jour restent inclus.",
    "nl": "De projectdatums laten niet toe boekingen buiten de periode te controleren; kosten tot vandaag blijven inbegrepen."
  },
  "server.les_couts_enregistres_avant_le_debut_ou_apres_d70f49": {
    "fr": "Les coûts enregistrés avant le début ou après la fin du projet restent inclus et sont signalés séparément.",
    "nl": "Kosten geregistreerd vóór de start of na het einde van het project blijven inbegrepen en worden afzonderlijk vermeld."
  },
  "server.le_projet_selectionne_est_indisponible_avec_vos_acces_fcf4f9": {
    "fr": "Le projet sélectionné est indisponible avec vos accès Odoo.",
    "nl": "Het geselecteerde project is niet beschikbaar met uw Odoo-toegang."
  },
  "server.projet_a1e982": {
    "fr": "Projet {p0}",
    "nl": "Project {p0}"
  },
  "server.les_dates_du_projet_sont_indisponibles_86aa43": {
    "fr": "Les dates du projet sont indisponibles.",
    "nl": "De projectdatums zijn niet beschikbaar."
  },
  "server.le_compte_analytique_ou_la_devise_du_projet_d417a5": {
    "fr": "Le compte analytique ou la devise du projet sont indisponibles.",
    "nl": "De analytische rekening of de projectvaluta is niet beschikbaar."
  },
  "server.les_references_de_budgets_du_projet_sont_indisponibles_0b39be": {
    "fr": "Les références de budgets du projet sont indisponibles.",
    "nl": "De budgetreferenties van het project zijn niet beschikbaar."
  },
  "server.certaines_informations_macro_de_la_convention_sont_indisponibles_2af9f2": {
    "fr": "Certaines informations macro de la convention sont indisponibles.",
    "nl": "Sommige macrogegevens van de conventie zijn niet beschikbaar."
  },
  "server.des_budgets_de_type_inconnu_restent_exclus_des_ddc8b8": {
    "fr": "Des budgets de type inconnu restent exclus des comparaisons convention/annuel.",
    "nl": "Budgetten van een onbekend type blijven uitgesloten van vergelijkingen tussen conventie en jaarbudget."
  },
  "server.les_lignes_budgetaires_sont_indisponibles_avec_vos_acces_80d55d": {
    "fr": "Les lignes budgétaires sont indisponibles avec vos accès Odoo.",
    "nl": "De budgetregels zijn niet beschikbaar met uw Odoo-toegang."
  },
  "server.les_budgets_conventionnels_et_annuels_sont_indisponibles_avec_ad6ed7": {
    "fr": "Les budgets conventionnels et annuels sont indisponibles avec vos accès ou votre schéma Odoo.",
    "nl": "De conventie- en jaarbudgetten zijn niet beschikbaar met uw Odoo-toegang of -schema."
  },
  "server.les_sources_de_fournisseurs_et_de_couts_annuels_ad1166": {
    "fr": "Les sources de fournisseurs et de coûts annuels sont indisponibles.",
    "nl": "Bronnen voor leveranciers en jaarlijkse kosten zijn niet beschikbaar."
  },
  "server.les_ecritures_facturees_de_cette_ligne_annuelle_sont_6f3427": {
    "fr": "Les écritures facturées de cette ligne annuelle sont indisponibles.",
    "nl": "De gefactureerde boekingen voor deze jaarregel zijn niet beschikbaar."
  },
  "server.le_compte_analytique_du_projet_est_indisponible_aucun_522049": {
    "fr": "Le compte analytique du projet est indisponible ; aucun périmètre financier n’est inventé.",
    "nl": "De analytische projectrekening is niet beschikbaar; er wordt geen financieel bereik verzonnen."
  },
  "server.les_categories_annuelles_ou_fournisseurs_des_ecritures_ne_c23ba2": {
    "fr": "Les catégories annuelles ou fournisseurs des écritures ne sont pas vérifiables.",
    "nl": "De jaarcategorieën of leveranciers van de boekingen zijn niet verifieerbaar."
  },
  "server.les_categories_annuelles_des_ecritures_ne_sont_pas_b55891": {
    "fr": "Les catégories annuelles des écritures ne sont pas vérifiables.",
    "nl": "De jaarcategorieën van de boekingen zijn niet verifieerbaar."
  },
  "server.une_ecriture_annuelle_n_a_pas_d_identifiant_1af0fd": {
    "fr": "Une écriture annuelle n’a pas d’identifiant vérifiable ; sa liste et son exclusion restent indisponibles.",
    "nl": "Een jaarlijkse boeking heeft geen verifieerbaar ID; de lijst en uitsluiting blijven niet beschikbaar."
  },
  "server.une_ecriture_de_cout_n_a_pas_d_b70269": {
    "fr": "Une écriture de coût n’a pas d’identifiant vérifiable ; le sous-total connu est partiel.",
    "nl": "Een kostenboeking heeft geen verifieerbaar ID; het bekende subtotaal is gedeeltelijk."
  },
  "server.une_ecriture_annuelle_a_des_valeurs_contradictoires_sa_e0d4df": {
    "fr": "Une écriture annuelle a des valeurs contradictoires ; sa liste et son exclusion restent indisponibles.",
    "nl": "Een jaarlijkse boeking heeft tegenstrijdige waarden; de lijst en uitsluiting blijven niet beschikbaar."
  },
  "server.une_ecriture_de_cout_a_des_valeurs_contradictoires_ea41e9": {
    "fr": "Une écriture de coût a des valeurs contradictoires ; le sous-total connu est partiel.",
    "nl": "Een kostenboeking heeft tegenstrijdige waarden; het bekende subtotaal is gedeeltelijk."
  },
  "server.la_devise_liee_au_champ_monetaire_amount_n_111304": {
    "fr": "La devise liée au champ monétaire amount n’est pas vérifiable ; aucun total combiné n’est calculé.",
    "nl": "De valuta gekoppeld aan het geldveld amount is niet verifieerbaar; er wordt geen gecombineerd totaal berekend."
  },
  "server.les_liens_comptables_ne_sont_pas_verifiables_les_67639c": {
    "fr": "Les liens comptables ne sont pas vérifiables ; les heures ne sont pas assimilées à des coûts de personnel.",
    "nl": "De boekhoudkundige koppelingen zijn niet verifieerbaar; uren worden niet als personeelskosten behandeld."
  },
  "server.les_unites_d_heures_ne_sont_pas_verifiables_3281e4": {
    "fr": "Les unités d’heures ne sont pas vérifiables ; les coûts de personnel restent partiels.",
    "nl": "De ureneenheden zijn niet verifieerbaar; personeelskosten blijven gedeeltelijk."
  },
  "server.les_dimensions_personnel_unite_sont_indisponibles_la_couverture_54a01f": {
    "fr": "Les dimensions personnel/unité sont indisponibles ; la couverture des coûts de personnel est inconnue.",
    "nl": "De dimensies personeel/eenheid zijn niet beschikbaar; de dekking van personeelskosten is onbekend."
  },
  "server.les_couts_analytiques_sont_indisponibles_ou_le_compte_2032d0": {
    "fr": "Les coûts analytiques sont indisponibles ou le compte est partagé entre plusieurs projets ; aucun total non filtré n’est utilisé.",
    "nl": "De analytische kosten zijn niet beschikbaar of de rekening wordt door meerdere projecten gedeeld; er wordt geen ongefilterd totaal gebruikt."
  },
  "server.le_champ_unit_responsable_est_indisponible_avec_vos_c46459": {
    "fr": "Le champ Unit responsable est indisponible avec vos accès Odoo.",
    "nl": "Het veld voor de verantwoordelijke eenheid is niet beschikbaar met uw Odoo-toegang."
  },
  "server.les_informations_des_projets_de_l_unite_dico_9e646f": {
    "fr": "Les informations des projets de l’unité DiCo sont indisponibles avec vos accès Odoo.",
    "nl": "De projectgegevens van Eenheid DiCo zijn niet beschikbaar met uw Odoo-toegang."
  },
  "server.les_identites_des_projets_de_l_unite_dico_b7fea4": {
    "fr": "Les identités des projets de l’unité DiCo sont indisponibles avec vos accès Odoo.",
    "nl": "De projectidentiteiten van Eenheid DiCo zijn niet beschikbaar met uw Odoo-toegang."
  },
  "server.les_projets_de_l_unite_dico_sont_indisponibles_10def5": {
    "fr": "Les projets de l’unité DiCo sont indisponibles avec vos accès Odoo.",
    "nl": "De projecten van Eenheid DiCo zijn niet beschikbaar met uw Odoo-toegang."
  },
  "server.certaines_informations_facultatives_des_projets_sont_indisponibles_avec_6aabca": {
    "fr": "Certaines informations facultatives des projets sont indisponibles avec vos accès Odoo.",
    "nl": "Sommige optionele projectgegevens zijn niet beschikbaar met uw Odoo-toegang."
  },
  "server.projet_s_ont_des_dates_absentes_invalides_ou_479b47": {
    "fr": "{p0} projet(s) ont des dates absentes, invalides ou indisponibles ; leur durée ne peut pas être tracée complètement.",
    "nl": "Bij {p0} project(en) ontbreken geldige of toegankelijke datums; de looptijd kan niet volledig worden getekend."
  },
  "server.projet_s_ont_une_fin_anterieure_au_debut_92a16f": {
    "fr": "{p0} projet(s) ont une fin antérieure au début ; leur durée ne peut pas être tracée.",
    "nl": "Bij {p0} project(en) ligt de einddatum vóór de begindatum; de looptijd kan niet worden getekend."
  },
  "server.les_informations_des_projets_du_programme_sont_indisponibles_340683": {
    "fr": "Les informations des projets du programme sont indisponibles avec vos accès Odoo.",
    "nl": "De projectgegevens van het programma zijn niet beschikbaar met uw Odoo-toegang."
  },
  "server.les_identites_des_projets_du_programme_sont_indisponibles_5c24b2": {
    "fr": "Les identités des projets du programme sont indisponibles avec vos accès Odoo.",
    "nl": "De projectidentiteiten van het programma zijn niet beschikbaar met uw Odoo-toegang."
  },
  "server.les_projets_du_programme_sont_indisponibles_avec_vos_790793": {
    "fr": "Les projets du programme sont indisponibles avec vos accès Odoo.",
    "nl": "De projecten van het programma zijn niet beschikbaar met uw Odoo-toegang."
  },
  "server.une_partie_des_recherches_de_projets_est_indisponible_ba242c": {
    "fr": "Une partie des recherches de projets est indisponible avec vos accès Odoo ; la couverture de la liste reste partielle.",
    "nl": "Een deel van de projectzoekopdrachten is niet beschikbaar met uw Odoo-toegang; de lijst blijft gedeeltelijk gedekt."
  },
  "server.projet_s_reference_s_sont_absents_des_donnees_d0b6f3": {
    "fr": "{p0} projet(s) référencé(s) sont absents des données accessibles : {p1}.",
    "nl": "{p0} opgenomen project(en) ontbreken in de toegankelijke gegevens: {p1}."
  },
  "server.reference_s_de_projet_sont_ambigues_et_restent_fb1e14": {
    "fr": "{p0} référence(s) de projet sont ambiguës et restent exclues : {p1}.",
    "nl": "{p0} projectreferentie(s) zijn dubbelzinnig en blijven uitgesloten: {p1}."
  },
  "server.pilotage_programmes_doit_etre_une_liste_1f87c9": {
    "fr": "pilotage.programmes doit être une liste.",
    "nl": "pilotage.programmes moet een lijst zijn."
  },
  "server.referentiel_programmes_invalide_id_unique_nom_projectids_entiers_ab379d": {
    "fr": "Référentiel programmes invalide (id unique, nom, projectIds entiers positifs).",
    "nl": "Ongeldige programmalijst (uniek ID, naam en positieve gehele projectIds)."
  },
  "server.configurer_et_confirmer_le_filtre_de_l_unite_56b02d": {
    "fr": "Configurer et confirmer le filtre de l’unité DiCo dans config.local.json (pilotage).",
    "nl": "Configureer en bevestig het filter voor Eenheid DiCo in config.local.json (pilotage)."
  },
  "server.le_filtre_dico_doit_contenir_des_conditions_and_6f6988": {
    "fr": "Le filtre DiCo doit contenir des conditions AND explicites.",
    "nl": "Het DiCo-filter moet expliciete AND-voorwaarden bevatten."
  },
  "server.champ_ou_operateur_dico_invalide_6cccc4": {
    "fr": "Champ ou opérateur DiCo invalide.",
    "nl": "Ongeldig DiCo-veld of ongeldige operator."
  },
  "server.valeurs_dico_invalides_17dbd6": {
    "fr": "Valeurs DiCo invalides.",
    "nl": "Ongeldige DiCo-waarden."
  },
  "server.champ_dico_non_disponible_ab971c": {
    "fr": "Champ DiCo non disponible : {p0}",
    "nl": "DiCo-veld niet beschikbaar: {p0}"
  },
  "server.relation_dico_invalide_bd3ea8": {
    "fr": "Relation DiCo invalide : {p0}",
    "nl": "Ongeldige DiCo-relatie: {p0}"
  },
  "server.type_dico_non_pris_en_charge_70b127": {
    "fr": "Type DiCo non pris en charge : {p0}",
    "nl": "Niet-ondersteund DiCo-type: {p0}"
  },
  "server.relation_directe_au_projet_absente_aucune_lecture_non_4a5975": {
    "fr": "Relation directe au projet absente ; aucune lecture non filtrée.",
    "nl": "Rechtstreekse projectrelatie ontbreekt; geen ongefilterde leesopdracht."
  },
  "server.champs_necessaires_indisponibles_59e72d": {
    "fr": "Champs nécessaires indisponibles.",
    "nl": "Vereiste velden niet beschikbaar."
  },
  "server.modele_champs_ou_acces_indisponibles_pour_le_compte_84d02f": {
    "fr": "Modèle, champs ou accès indisponibles pour le compte connecté.",
    "nl": "Model, velden of toegang niet beschikbaar voor de aangemelde account."
  },
  "server.budgets_parents_indisponibles_ec79c3": {
    "fr": "Budgets parents indisponibles.",
    "nl": "Bovenliggende budgetten niet beschikbaar."
  },
  "server.lignes_budgetaires_indisponibles_pour_le_compte_connecte_a94167": {
    "fr": "Lignes budgétaires indisponibles pour le compte connecté.",
    "nl": "Budgetregels niet beschikbaar voor de aangemelde account."
  },
  "server.agregation_task_wp_non_disponible_5420a9": {
    "fr": "Agrégation task/WP non disponible.",
    "nl": "Aggregatie van taken/WP niet beschikbaar."
  },
  "server.agregation_progress_non_disponible_pour_le_compte_connecte_92bb76": {
    "fr": "Agrégation Progress non disponible pour le compte connecté.",
    "nl": "Progress-aggregatie niet beschikbaar voor de aangemelde account."
  },
  "server.projet_absent_du_perimetre_dico_accessible_053d61": {
    "fr": "Projet absent du périmètre DiCo accessible.",
    "nl": "Project ontbreekt binnen het toegankelijke DiCo-bereik."
  },
  "server.projets_dico_visibles_avec_les_permissions_du_compte_6d416a": {
    "fr": "Projets DiCo visibles avec les permissions du compte connecté ; les projets masqués par Odoo ne peuvent pas être comptés.",
    "nl": "DiCo-projecten zichtbaar met de rechten van de aangemelde account; door Odoo verborgen projecten kunnen niet worden meegeteld."
  },
  "server.source_non_chargee_c5104f": {
    "fr": "Source non chargée",
    "nl": "Bron niet geladen"
  },
  "server.jalon_13e216": {
    "fr": "Jalon {p0}",
    "nl": "Mijlpaal {p0}"
  },
  "server.trajet_0b7616": {
    "fr": "Trajet {p0}",
    "nl": "Traject {p0}"
  },
  "server.realise_cumule_indisponible_1a0419": {
    "fr": "Réalisé cumulé indisponible",
    "nl": "Gecumuleerde realisatie niet beschikbaar"
  },
  "server.aucun_total_d_imputations_visibles_ne_remplace_le_0ee252": {
    "fr": "Aucun total d’imputations visibles ne remplace le total projet.",
    "nl": "Geen totaal van zichtbare tijdregistraties vervangt het projecttotaal."
  },
  "server.convention_depassee_36524b": {
    "fr": "Convention dépassée",
    "nl": "Conventie overschreden"
  },
  "server.convention_realise_cumule_h_961bbc": {
    "fr": "Convention − réalisé cumulé (h)",
    "nl": "Conventie − gecumuleerde realisatie (u)"
  },
  "server.consommation_de_ressources_pas_avancement_des_livrables_7f2553": {
    "fr": "Consommation de ressources, pas avancement des livrables.",
    "nl": "Verbruik van middelen, geen voortgang van op te leveren resultaten."
  },
  "server.planning_plus_court_que_le_projet_3998f6": {
    "fr": "Planning plus court que le projet",
    "nl": "Planning korter dan het project"
  },
  "server.fin_du_projet_bc7286": {
    "fr": "Fin du projet : {p0}",
    "nl": "Einde van het project: {p0}"
  },
  "server.un_planning_limite_ne_couvre_pas_toute_la_5b3b79": {
    "fr": "Un planning limité ne couvre pas toute la durée du projet.",
    "nl": "Een beperkte planning dekt niet de volledige projectlooptijd."
  },
  "server.repartition_des_trajets_a_verifier_b18ee1": {
    "fr": "Répartition des trajets à vérifier",
    "nl": "Verdeling van de trajecten controleren"
  },
  "server.somme_des_coefficients_100_6d3eae": {
    "fr": "Somme des coefficients × 100 (%)",
    "nl": "Som van de coëfficiënten × 100 (%)"
  },
  "server.aucune_normalisation_automatique_53ba6e": {
    "fr": "Aucune normalisation automatique.",
    "nl": "Geen automatische normalisatie."
  },
  "server.jalon_echu_non_atteint_3ccbbd": {
    "fr": "Jalon échu non atteint",
    "nl": "Vervallen mijlpaal niet bereikt"
  },
  "server.project_milestone_d74e55": {
    "fr": "project.milestone : {p0}",
    "nl": "project.milestone: {p0}"
  },
  "server.statut_odoo_livraison_a_confirmer_2c113d": {
    "fr": "Statut Odoo ; livraison à confirmer.",
    "nl": "Odoo-status; oplevering moet worden bevestigd."
  },
  "server.budget_non_reconcilie_22c51e": {
    "fr": "Budget non réconcilié",
    "nl": "Budget niet afgestemd"
  },
  "server.periode_absente_d19330": {
    "fr": "période absente",
    "nl": "periode ontbreekt"
  },
  "server.exclu_de_la_consolidation_financiere_lignes_visibles_dans_1fa1cd": {
    "fr": "Exclu de la consolidation financière ; lignes visibles dans la fiche.",
    "nl": "Uitgesloten van de financiële consolidatie; regels zichtbaar in de fiche."
  },
  "server.solde_de_rubrique_negatif_e82e61": {
    "fr": "Solde de rubrique négatif",
    "nl": "Negatief rubrieksaldo"
  },
  "server.devise_inconnue_c80909": {
    "fr": "devise inconnue",
    "nl": "onbekende valuta"
  },
  "server.les_soldes_positifs_d_autres_rubriques_ne_compensent_7353d5": {
    "fr": "Les soldes positifs d’autres rubriques ne compensent pas ce signal.",
    "nl": "Positieve saldi van andere rubrieken compenseren dit signaal niet."
  },
  "server.affectations_programme_multiples_b4c4eb": {
    "fr": "Affectations programme multiples",
    "nl": "Meerdere programmatoewijzingen"
  },
  "server.projet_non_affecte_2ee328": {
    "fr": "Projet non affecté",
    "nl": "Niet toegewezen project"
  },
  "server.referentiel_local_des_programmes_a916c9": {
    "fr": "Référentiel local des programmes",
    "nl": "Lokale programmalijst"
  },
  "server.exclu_des_consolidations_par_programme_conserve_dans_l_42715e": {
    "fr": "Exclu des consolidations par programme ; conservé dans l’unité.",
    "nl": "Uitgesloten van consolidaties per programma; behouden in de eenheid."
  },
  "server.conserve_dans_le_total_unite_4e8da8": {
    "fr": "Conservé dans le total unité.",
    "nl": "Behouden in het eenheidstotaal."
  },
  "server.indisponible_dae75c": {
    "fr": "Indisponible",
    "nl": "Niet beschikbaar"
  },
  "server.archive_19dd65": {
    "fr": "Archivé",
    "nl": "Gearchiveerd"
  },
  "server.non_classe_846588": {
    "fr": "Non classé",
    "nl": "Niet ingedeeld"
  },
  "server.enveloppe_des_depenses_6xxx_le_net_recettes_depenses_65bb5c": {
    "fr": "Enveloppe des dépenses 6xxx ; le net recettes − dépenses est un contrôle distinct. Les ajustements 9xxx non nuls empêchent la réconciliation automatique.",
    "nl": "Uitgavenenveloppe 6xxx; het saldo ontvangsten − uitgaven is een afzonderlijke controle. Niet-nulaanpassingen 9xxx verhinderen automatische afstemming."
  },
  "server.montants_des_lignes_odoo_uniquement_la_completude_des_f46158": {
    "fr": "Montants des lignes Odoo uniquement ; la complétude des coûts de personnel n’est pas confirmée. Les coûts de personnel ne sont pas déduits des heures. Commandé et consommé ne s’additionnent pas.",
    "nl": "Alleen bedragen van Odoo-regels; de volledigheid van personeelskosten is niet bevestigd. Personeelskosten worden niet uit uren afgeleid. Besteld en verbruikt worden niet opgeteld."
  },
  "server.cumul_projet_horizon_disponible_sans_decoupage_annuel_ae2ac8": {
    "fr": "Cumul projet / horizon disponible, sans découpage annuel",
    "nl": "Projecttotaal / beschikbare horizon, zonder jaarindeling"
  },
  "server.realise_convention_sur_les_memes_projets_c78443": {
    "fr": "Σ réalisé / Σ convention sur les mêmes projets",
    "nl": "Σ gerealiseerd / Σ conventie voor dezelfde projecten"
  },
  "server.non_affecte_a95639": {
    "fr": "Non affecté",
    "nl": "Niet toegewezen"
  },
  "server.imputations_visibles_dans_l_horizon_du_planning_jusqu_a5009e": {
    "fr": "Imputations visibles dans l’horizon du planning, jusqu’au chargement ; diagnostic partiel si visibilité non réconciliée.",
    "nl": "Zichtbare tijdregistraties binnen de planningshorizon, tot het laadmoment; gedeeltelijke diagnose als de zichtbaarheid niet is afgestemd."
  },
  "server.le_total_progress_ne_correspond_pas_au_realise_fe335d": {
    "fr": "Le total Progress ne correspond pas au réalisé du projet.",
    "nl": "Het Progress-totaal stemt niet overeen met de projectrealisatie."
  },
  "server.heures_non_affectees_a_un_wp_explicite_8ecb0a": {
    "fr": "Heures non affectées à un WP explicite.",
    "nl": "Uren niet toegewezen aan een expliciet WP."
  },
  "server.couverture_des_wp_explicites_incomplete_d0e7f7": {
    "fr": "Couverture des WP explicites incomplète.",
    "nl": "Dekking van de expliciete WP onvolledig."
  },
  "server.totaux_wp_progress_et_convention_non_reconcilies_tolerance_ca76bb": {
    "fr": "Totaux WP, Progress et convention non réconciliés (tolérance 0,05 h).",
    "nl": "Totalen van WP, Progress en conventie niet afgestemd (tolerantie 0,05 u)."
  },
  "server.periode_explicite_absente_ou_invalide_pour_un_wp_eb34c2": {
    "fr": "Période explicite absente ou invalide pour un WP.",
    "nl": "Expliciete periode ontbreekt of is ongeldig voor een WP."
  }
};
  I18n.register(messages);
  return messages;
});

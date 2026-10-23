# Digital Construction project-tag web enrichment

Reviewed: **2026-10-22**. Scope: the 32 Digital Construction unit-206 projects
whose original Odoo scan found a missing or very short usable description,
including archived records. Publisher: **Buildwise**. Grain: the exact Odoo
source namespace and project ID.

The user explicitly requested public-site research and a local tag update.
**18 projects received verified public-source tags; 14 remain unresolved.**
Together with the 18 previously tagged projects, the shipped catalogue now
contains **36 tagged projects out of 50**. The original Odoo findings remain
31 missing descriptions and one short description; these statuses describe
the Odoo source rather than the availability of a public project page.

| Web review result | Projects | Tag outcome |
| --- | ---: | --- |
| Verified | 18 | Reviewed canonical tags applied |
| Not found | 8 | No tags applied |
| Ambiguous identity | 4 | No tags applied |
| Insufficient information | 2 | No tags applied |

## Method and attribution

The review inventoried **520 project URLs**, including **229 French parent
project pages**, from the public French and Dutch Buildwise sitemaps. Candidate
French/Dutch project pages, relevant child pages, official Buildwise evidence
pages and a dated standards PDF were then read. The accepted source set contains
**22 distinct fetched and hashed sources**. Exact acronyms, expanded local
titles, programme context and available dates were compared. Search snippets,
broad topic matches and similar acronyms alone were not accepted as evidence.

The retrieved HTML date blocks were checked separately from the readable
narratives. **Eight public/local period discrepancies** are recorded below:
Letslink, BIMup, S-MonHuMa, FireBIM, HARPO, Data4Construction, AcceleRATE and
EDIH CONNECT. These do not change the exact local project identity or dates.
HARPO's local end-period text is itself ambiguous and is preserved verbatim.

Project summaries below are original short paraphrases of the linked Buildwise
material. All public project content is attributed to **Buildwise** through
direct source links. The official April 2026 standards PDF is the accepted
source for the NA 2026 record; a standing programme page alone cannot establish
the separate 2025 grant's scope. A public match establishes the documented
technical scope; most pages do not publish internal Odoo codes or exact
administrative funding periods.

The catalogue retains source title/URL, retrieval timestamp, identity-match
explanation, SHA-256 content fingerprint and evidence linked to each applied
tag. The fingerprint uses retrieved response bytes. Full raw HTML/PDF files
are not shipped; hashes do not claim that the live source remains unchanged.

## Verified projects and applied tags

All 18 entries in this section have web status `verified`. Canonical IDs below
are the actual saved IDs in [data/project-tags.json](../../data/project-tags.json).
English, French and Dutch labels are defined once per canonical concept.

### NA BIM & Digital Construction 26 — ID 1974, code 51252062

The 2026 BIM and Digital Construction standards antenna helps Belgian construction professionals understand and apply standards for BIM information management, interoperable data exchange, product data templates and related digital processes.

Sources: [Normen-Antenne: BIM & Digital Construction — Normenoverzicht BIM & Digital Construction (CEN/TC 442), gepubliceerd en in ontwikkeling](https://www.buildwise.be/media/nipnohqc/nabimdigitalconstruction_overviewcentc442_nl.pdf).

Canonical tags: `bim`, `information-management`, `data-standardisation`, `data-interoperability`, `ifc`, `product-data-templates`, `level-of-information-need`.

Identity and limits: Official Buildwise publication has the exact programme name and is explicitly dated April 2026, matching the local annual Normen-Antenne BIM & Digital Construction 2026 record. Verified at programme/year level. Public evidence establishes the technical scope but does not expose the internal funding code or prove the administrative funding-record dates.

### Letslink — ID 1982, code 56202061

Letslink develops a collaborative hub that connects construction participants’ information with BIM during execution and supports delivery of a client-compliant as-built dossier.

Sources: [Développement d’un hub digital pour centraliser les données des différentes parties prenantes durant la phase d’exécution d’un projet - Letslink](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/developpement-d-un-hub-digital-pour-centraliser-les-donnees-des-differentes-parties-prenantes-durant-la-phase-d-execution-d-un-projet-letslink/).

Canonical tags: `bim`, `information-management`, `data-interoperability`.

Identity and limits: Exact distinctive Letslink name and the BIM-access objective match the local expanded project title; the page identifies Cooperlink, Buildwise and ULiège-LUCID. Date discrepancy: the public page lists 1 January 2022–31 December 2025; the local title lists January 2022–December 2026. Retain the local identity and dates; the public page does not expose the internal code.

### BIMUP — ID 1987, code 55222032

BIMup supports wider and deeper BIM use through reusable workflows, templates, practical guidance and workshops for construction companies.

Sources: [Vers une implémentation étendue de la construction digitale - BIMup](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/vers-une-implementation-etendue-de-la-construction-digitale-bimup/); [COOCK BIMup - Bredere en diepere implementatie en innovatie voor digitaal bouwen](https://www.buildwise.be/nl/onderzoek-innovatie/onderzoeksprojecten/coock-bimup-bredere-en-diepere-implementatie-en-innovatie-voor-digitaal-bouwen/); [BIM opleidingen](https://www.buildwise.be/nl/onderzoek-innovatie/onderzoeksprojecten/coock-bimup-bredere-en-diepere-implementatie-en-innovatie-voor-digitaal-bouwen/bim-opleidingen/).

Canonical tags: `bim`, `information-management`, `workforce-training`.

Identity and limits: Exact unique BIMup and COOCK names match the local VL COOCK BIMUP record. The public project has the same BIM-adoption purpose. Date discrepancy: public showroom lists 1 January 2023–31 December 2025; local title lists March 2023–February 2026. Retain the local dates and record this difference.

### S-MonhumMA — ID 1989, code 54222092

S-MonHuMa develops wireless in-material moisture sensors and remote IoT monitoring to guide drying, renovation and finishing decisions and check moisture-remediation performance.

Sources: [Smart monitoring de l’humidité dans les matériaux de construction - S-MonHuMa](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/smart-monitoring-de-l-humidite-dans-les-materiaux-de-construction-s-monhuma/).

Canonical tags: `in-situ-measurements`, `internet-of-things`, `moisture-monitoring`.

Identity and limits: Distinctive near-identical acronym and Brussels research context match the local BXL record. The public name S-MonHuMa differs slightly from the local S-MonhumMA spelling. Date discrepancy: the public page lists 1 September 2023–31 August 2026; the local title lists September 2023–December 2026. Retain the local identity and dates; the public page does not expose the internal code.

### FireBIM — ID 2017, code 54232014

FireBIM integrates fire-safety rules from five European countries into an online open-source BIM platform that automatically checks building models for regulatory compliance.

Sources: [Intégration et harmonisation de la sécurité incendie au sein d’une plateforme BIM - FireBIM](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/integration-et-harmonisation-de-la-securite-incendie-au-sein-d-une-plateforme-bim-firebim/).

Canonical tags: `bim`, `automated-compliance-checking`, `fire-safety`.

Identity and limits: Exact distinctive FireBIM name and Buildwise involvement match the local research record; the public page identifies its multinational ITEA4 context. Date discrepancy: the public page lists 1 January 2024–31 December 2026; the local title lists November 2023–November 2026. Retain the local identity and dates; the public page does not expose the internal code.

### HARPO — ID 2018, code 54232022

HARPO combines execution data with BIM models and learning algorithms to provide business intelligence for resource use, productivity and construction management.

Sources: [Plateforme collaborative pour la gestion des ressources et la rationalisation des processus de construction - HARPO](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/plateforme-collaborative-pour-la-gestion-des-ressources-et-la-rationalisation-des-processus-de-construction-harpo/).

Canonical tags: `bim`, `machine-learning`, `information-management`, `business-intelligence`.

Identity and limits: Exact acronym and complete expanded name Human-centered Application for the Resource and Productivity Optimization of buildings match the local title. Date discrepancy: the public page lists 1 October 2022–31 March 2026; the local title contains the ambiguous period `10/23 - 03/2026 /25`. Preserve that local text without inferring an end date; the public page does not expose the internal code.

### CdF — ID 2019, code 56232023

Construction du Futur helps the construction value chain adopt digital tools through awareness activities, company support and large-scale training.

Sources: [Construction du Futur: un écosystème numérique structurant](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/construction-du-futur-un-ecosysteme-numerique-structurant/).

Canonical tags: `digital-transformation`, `workforce-training`.

Identity and limits: Exact expanded project name Construction du Futur and the Walloon digital-construction programme context match the local RW title. Do not infer specific technologies from the page's unrelated-publication links.

### Renolab — ID 2028, code 56232072

RENOLAB provides shared prefabrication, prototyping, testing and material-reuse facilities, plus training, to scale sustainable and circular renovation through off-site industrialisation.

Sources: [Un centre de services pour accélérer l'industrialisation off-site des entreprises de rénovation - RENOLAB](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/un-centre-de-services-pour-accelerer-lindustrialisation-off-site-des-entreprises-de-renovation-renolab/).

Canonical tags: `prefabricated-construction`, `circular-construction`, `workforce-training`, `building-renovation`.

Identity and limits: Exact RENOLAB acronym, Buildwise leadership, Walloon renovation, shared equipment and industrialisation objectives match the local expanded title. The public page describes sustainable and circular renovation broadly; it does not justify narrowing a new tag to energy renovation alone.

### Indus4Builder — ID 2034, code 56242022

Indus4Builder develops flexible prefabrication methods for customised housing, combining process proofs of concept with BIM, virtual and augmented reality, AI and robotics.

Sources: [Industrialisation et personnalisation de la préfabrication pour des logements durables - INDUS4BUILDER](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/industrialisation-et-personnalisation-de-la-prefabrication-pour-des-logements-durables-indus4builder/).

Canonical tags: `bim`, `prefabricated-construction`, `augmented-reality`, `artificial-intelligence`, `virtual-reality`, `robotics`.

Identity and limits: Exact distinctive acronym and the expanded objective of flexible industrial production for construction mass customisation match the local RW Win4Collective title. The public narrative says robotics without establishing autonomy; do not substitute the existing narrower autonomous-robotics tag.

### AI CONSTRUCT — ID 2036, code 55242030

AI CONSTRUCT helps construction firms adopt generative AI through pilots addressing document analysis and repetitive workflows, then shares implementation methods and demonstrators.

Sources: [Adoption de l’IA Générative dans les Processus de Construction - AI CONSTRUCT](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/adoption-de-lia-generative-dans-les-processus-de-construction-ai-construct/).

Canonical tags: `artificial-intelligence`, `generative-ai`, `engineering-document-review`, `engineering-workflow-automation`.

Identity and limits: Exact acronym and Flemish generative-AI construction-information objective match the Odoo title. Public showroom dates are 1 January 2025–31 December 2027, matching the local month/year range. The internal Odoo business code is not published.

### CLUSTER-DIGICONSTR — ID 2120, code 57202015

The Cluster connects digital-construction practitioners and develops shared BIM information processes, open standards, classification references and training through specialist working groups.

Sources: [Cluster Digital Construction](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/cluster-digital-construction/).

Canonical tags: `bim`, `ifc`, `information-management`, `data-standardisation`, `construction-classification`, `workforce-training`.

Identity and limits: Exact expanded name Cluster Digital Construction matches the Odoo project, with Buildwise and Belgian buildingSMART role confirmed. Public initiative page does not publish an internal Odoo code.

### DCC — ID 2166, code 55232065

DCC is a construction-data demonstration control room that collects and visualises measurements from different sources to illustrate monitoring, IoT and process optimisation.

Sources: [Data Connection Center - DCC](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/data-connection-center-dcc/).

Canonical tags: `field-data-capture`, `information-management`, `internet-of-things`, `data-visualisation`.

Identity and limits: Exact acronym and full Data Connection Center name match the Odoo title; the page describes the same Buildwise demonstration facility. Public showroom dates are 26 September 2023–31 December 2023, consistent with the local September–December 2023 range. The internal Odoo project code is not published.

### D4C — ID 2168, code 55242037

Data4Construction supplies test infrastructure and repeatable construction cases for data capture, helping firms put site-data technologies into practice through demonstrations and workshops.

Sources: [Sensibilisation et soutien à la saisie de données dans le secteur de la construction - Data4Construction](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/sensibilisation-et-soutien-a-la-saisie-de-donnees-dans-le-secteur-de-la-construction-data4construction/).

Canonical tags: `field-data-capture`, `drones`, `reality-capture`, `internet-of-things`, `artificial-intelligence`.

Identity and limits: Exact full project name Data4Construction matches the Odoo D4C title. Date discrepancy: the public page lists 1 July 2025–30 June 2026; the local funding record lists July 2025–June 2027. Retain the local identity and dates. The listed technology examples describe the project's application context rather than guaranteed individual deliverables.

### ACCELERATE — ID 2170, code 56242089

AcceleRATE aims to industrialise energy renovation through standard technical solutions and digital planning and coordination tools, improving delivery efficiency and energy performance.

Sources: [Création d’un accélérateur de rénovation énergétique - AcceleRATE](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/creation-d-un-accelerateur-de-renovation-energetique-accelerate/).

Canonical tags: `energy-renovation`, `energy-efficiency`, `planning-optimisation`, `construction-industrialisation`.

Identity and limits: Exact uncommon AcceleRATE name and industrialised energy-renovation objective agree with the expanded Odoo envelope-renovation title. Date discrepancy: the public page lists 1 March 2026–28 February 2030; the local INTERREG funding record lists January 2026–December 2028. Retain the exact local identity and dates; the public page does not establish the administrative record's period.

### EDIH CONNECT — ID 2173, code 59212066

EDIH CONNECT helps Walloon construction SMEs adopt digital technologies through testing, skills development and innovation support, explicitly covering AI, IoT and robotics.

Sources: [Un Centre Européen d’Innovation Numérique pour la Construction - EDIH CONNECT](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/un-centre-europeen-dinnovation-numerique-pour-la-construction-edih-connect/).

Canonical tags: `artificial-intelligence`, `internet-of-things`, `robotics`, `workforce-training`, `digital-transformation`.

Identity and limits: Exact EDIH CONNECT name and Buildwise-led Walloon construction digital-innovation hub match the Odoo title. Date discrepancy: the public page lists 1 November 2022–31 October 2025; the local funding record lists November 2022–February 2026. The public period is shorter. Retain the exact local funding identity and dates.

### eDIH WallonIA Hub — ID 2180, code 59252034

WallonIA supports digital adoption in construction and manufacturing through AI, BIM, digital twins, IoT, data management and cybersecurity, combined with demonstrations, investment testing and skills development.

Sources: [Europees digitaal hub voor maakindustrie en bouw in Wallonië - EU EDIH WallonIA](https://www.buildwise.be/nl/onderzoek-innovatie/onderzoeksprojecten/europees-digitaal-hub-voor-maakindustrie-en-bouw-in-wallonie-eu-edih-wallonia/).

Canonical tags: `artificial-intelligence`, `bim`, `workforce-training`, `digital-transformation`, `digital-twins`, `internet-of-things`, `cybersecurity`, `information-management`.

Identity and limits: Exact eDIH WallonIA programme acronym and expanded construction/manufacturing hub identity. Page distinguishes the current merged eDIH-Connect/WalHub initiative. Public showroom dates are 1 March 2026–28 February 2029, matching the local month/year range; the internal Odoo code is not published. Dutch showroom read successfully; the corresponding French URL failed in the web reader. Generic digital twins are not equated with the existing narrower federated-digital-twins tag.

### SPEC — ID 2414, code 77252041

SPEC develops a shared framework for future construction specifications, connecting standardised requirements and classification with digital data exchange and BIM; completed feasibility work informs a planned proof of concept.

Sources: [SPEC - Système de spécifications du futur](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/spec-systeme-de-specifications-du-futur/); [L'étude de faisabilité](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/spec-systeme-de-specifications-du-futur/letude-de-faisabilite/).

Canonical tags: `bim`, `data-standardisation`, `construction-classification`, `data-interoperability`, `construction-specifications`.

Identity and limits: Exact SPEC acronym, Specifications title and Buildwise-owned specification-system initiative. The feasibility phase ran September 2025–September 2026; the internal code is not publicly shown.

### ExpCenterBouw — ID 2429, code 55232030

ExperienceCenterBouw helps construction SMEs adopt digital tools through trade-specific demonstrations, a permanent centre, a mobile hub, implementation guidance and workshops. Its camera toolkit supports practical site capture and monitoring.

Sources: [ExperienceCenterBouw](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/experiencecenterbouw/); [40 Vlaamse bouw-kmo’s gaan drie maanden lang aan de slag met 360° camera](https://www.buildwise.be/nl/persberichten/toolkit-360/).

Canonical tags: `digital-transformation`, `workforce-training`, `reality-capture`, `construction-progress-monitoring`.

Identity and limits: Exact distinctive ExperienceCenterBouw name. The Buildwise supplement explicitly identifies its toolkit initiative as part of that EFRO-funded project, matching the local EFRO title.

## Unresolved projects

All 14 entries remain untagged. `Not found` means no suitable public Buildwise
project description was located in this review; it does not establish that no
description exists elsewhere. Candidate links below are references investigated,
not accepted identity or tag evidence.

| Project | Odoo ID | Code | Web status | Finding and source limitation |
| --- | ---: | --- | --- | --- |
| BIDZ B2 B | 1891 | 51232020 | `ambiguous` | BIDS resembles local BIDZ, but no public source links it to the B2 phase, code 51232020 or the September 2025–December 2026 record. The 2023 annual report already reports BIDS results; the 2026 work programme mentions a continuing BIDS working group. Do not apply predecessor or working-group tags to the exact local B2 grant without an identity bridge. |
| Coock DPD | 2077 | 55252033 | `not-found` | No identity-verified project page found. General product-data regulation/charter material and differently named HARMONIX-GO cannot establish this archived project's identity. |
|  Enginuity | 2086 | 54252067 | `not-found` | No Buildwise project-specific page found. Do not infer tags from the acronym or transfer tags from unrelated engineering projects. |
| Digital Building Permit Process | 2127 | 57252087 | `not-found` | No project-specific match found. General digital-permit strategy references and old building case studies do not identify the 2026–2029 internal project. |
| FEDER BIMPermis | 2169 | 54242055 | `not-found` | No identity-verified project page found. General BIM permit examples lack the named Brussels FEDER initiative and cannot safely be attached. |
| Enginuity | 2178 | 59242091 | `not-found` | No Buildwise project-specific page found. The shared name and dates suggest the same initiative as Odoo 2086 but do not supply public technology evidence; keep both Odoo IDs separate. |
| FAITH | 2181 | 59252044 | `not-found` | No FAITH or Flanders AI and Technology Hub match in the FR/NL showroom URL inventory or Buildwise-targeted search. Earlier Flanders AI EDIH material cannot establish the current 2026–2028 project's scope. |
| DC | 2248 | 62004360 | `insufficient` | Digital Construction matches a broad Buildwise topic and unit, which does not identify this internal project or its technical scope. |
| PRNSPEC-A | 2536 | 51261787 | `ambiguous` | Future construction specifications overlap with SPEC; neither the PRNSPEC-A acronym nor its internal code is mapped publicly. A separate related research activity must not inherit SPEC's tags without confirmation. |
| Scan2Val | 2552 | 55261803 | `not-found` | No Scan2Val or expanded enriched-BIM/value-assessment match in the FR/NL showroom inventory or targeted search. |
| NABim25 | 2573 | 51242050 | `ambiguous` | The public Normen-Antenne BIM & Digital Construction is the expanded NA programme name. It does not independently identify the 2025 grant period or internal code. Fallback is an official standing programme page, not a year-specific showroom project description. Do not imply that all standards mentioned on the current page were covered by the 2025 annual grant. |
| BW_Data_Platform_IS | 2684 | 57261908 | `insufficient` | Generic platform references in Buildwise strategy material cannot establish this internal IS project's purpose or technologies. |
| PRNSPEC-B | 2694 | 51261917 | `ambiguous` | The title overlaps with SPEC, but PRNSPEC-B is a distinct local record and code with no explicit public mapping. |
| Physical-AI | 2707 | 57261930 | `not-found` | No exact Physical-AI project or internal-code match in the showroom inventory or Buildwise-targeted searches. Generic AI material cannot identify this activity. |

Candidate references were left outside accepted catalogue provenance:

- **BIDZ B2 B (1891):** the [BIDS showroom page](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/specifications-belges-pour-la-livraison-de-linformation-dans-un-projet-bim-bids/), [2023 annual report / Next Report 2024](https://www.buildwise.be/media/hkidp05s/next_report_2024.pdf) and [2026 Digital Construction work programme](https://www.buildwise.be/media/pr1lcvk4/werkprogramma-2026-vp-fr-def.pdf) document BIDS or its working group, without mapping the exact B2 record.
- **PRNSPEC-A (2536) and PRNSPEC-B (2694):** [SPEC](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/spec-systeme-de-specifications-du-futur/) and its [feasibility study](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/spec-systeme-de-specifications-du-futur/letude-de-faisabilite/) overlap in subject, but neither identifies the distinct PRNSPEC records.
- **NABim25 (2573):** the [standing BIM and Digital Construction standards programme](https://mijn.buildwise.be/nl/normen-en-regelgeving/bim-digital-construction/) is a programme-name match, without year-specific evidence for 2025. The accepted April 2026 PDF for ID 1974 does not resolve that earlier grant.
- **Coock DPD, both Enginuity IDs, Digital Building Permit Process, FEDER BIMPermis, FAITH, DC, Scan2Val, BW_Data_Platform_IS and Physical-AI:** no project-specific public source was accepted. A general product-data, permit, AI, construction or platform page cannot establish the missing technical scope.

## Identity and taxonomy decisions

The two Enginuity records (2086 and 2178) remain distinct. EDIH CONNECT (2173)
and the successor WallonIA hub (2180) also retain separate IDs and programme
evidence. **Data4Construction (2168)** is matched only to its named data-capture
project page. The older [Digital4CircularConstruction / D4C project](https://www.buildwise.be/fr/recherche-innovation/showroom-des-projets/rendre-le-secteur-de-la-construction-plus-durable-et-circulaire-grace-a-la-numerisation-d4c/)
(2023–2025, circular BIM information exchange) is a different initiative; its
BIM/circularity scope was not transferred to Data4Construction.

Canonical IDs are reused where meanings agree. BIM and Building Information
Modelling use `bim`; the reviewed data/information-management material uses
`information-management`. HARPO's centralisation evidence is tagged
`information-management`; centralising data alone was not treated as proof of
technical interoperability. General `robotics` and `digital-twins` do not imply
`autonomous-robotics` or `federated-digital-twins`. Generative AI does not by
itself establish a particular large-language-model implementation. RENOLAB's
public sustainable-renovation scope uses `building-renovation`; AcceleRATE's
explicit energy-renovation scope uses `energy-renovation`. Parent/subtype
relations are not inferred by the existing exact-tag similarity map.

## Persistence, privacy and Odoo separation

This is an explicit reviewed edit of the shipped local catalogue. Original
`descriptionStatus`, character count, version ID/date, Odoo text hash,
project scan timestamp, catalogue scan timestamp and `scanCompleted` values
are preserved. The 18 original tag sets are unchanged. A public summary is
stored under `webEnrichment`; it does not replace an Odoo description or
reclassify the original description-quality finding.

Completed projects remain frozen for normal scans. `mergeNew` still preserves
them, including the 14 unresolved results. There is no automatic Odoo
description rescan, runtime website scrape or periodic enrichment. A later
request to change an existing result requires another deliberate local edit.

The session-scoped unit DTO exposes only visible project IDs, tag IDs, used
French/Dutch labels and the original catalogue scan time. Web summaries,
source URLs, hashes and per-tag evidence stay outside that DTO; the full
`data/` catalogue remains outside static HTTP routes. No credentials or full
private Odoo description narratives were added. **No Odoo data was changed.**

See the [initial Odoo scan](PROJECT_TAG_SCAN.md), [catalogue workflow](../../data/README.md)
and [domain/data flow](../wiki/DOMAIN.md) for the separate source-quality and
runtime contracts. This report records research and applied local data; it
does not assert an application test or build result.

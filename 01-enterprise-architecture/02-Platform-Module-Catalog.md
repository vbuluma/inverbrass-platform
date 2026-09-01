Platform Principle & Vission PP-001 – Digital Business Platform

The InverBrass Platform is a configurable SME Digital Business Platform designed to digitize business operations and provide a foundation for value-added ecosystem services such as embedded finance, insurance, lending, analytics, AI, and partner integrations. Operational modules exist to generate trusted digital business data, not to replicate traditional ERP systems
I want to introduce one rule that we'll follow throughout this project:
Every capability must have one and only one owner.
For example, Customer Management belongs to the Customer Domain. Property, School, Business Operations, Chama, and Academy all use it—they don't create their own customer management.
This principle will prevent duplication across the platform.



The Comprehensive module & capability scope shall cover the following



The Build Packs are **shared platform capabilities consumed by Industry Editions**. Each Industry Edition composes the Build Packs it needs and presents them through an industry-native experience powered by **ENG-003k Industry Experience Engine**. This keeps the architecture clean and reinforces the vision: **Industry Editions powered by a shared enterprise platform**.

# InverBrass Digitalization Platform – Build Pack Roadmap (Version 1.0)


| **Build Pack ID** | **Build Pack Name**                        | **Primary Purpose**                                                             | **Key Capabilities**                                                                                                                                                                                 | **Primary Core Engines Consumed**                                                          |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **BP-001**        | **Business Setup & Onboarding**            | Establish businesses on the platform and configure their operating environment. | Business registration, onboarding wizard, business profile, operating countries, users, initial configuration                                                                                        | Authentication, Authorization, Configuration, Business Presence, Localization & Regulatory, Checklist & Completion |
| **BP-002**        | **Party & Relationship Management**        | Manage all people, organizations and business relationships.                    | Individuals, organizations, groups, contacts, addresses, roles, relationships, identity & regulatory identification, communication preferences, documents & compliance, timeline, audit history      | Identity & Regulatory Identification, Consent, Document & Compliance, Audit, Search, Checklist & Completion        |
| **BP-003**        | **Product & Service Catalogue**            | Create and manage everything a business offers.                                 | Products, services, digital products, subscriptions, memberships, insurance products, loan products, rental assets, variants, bundles, attributes, lifecycle, documents, relationships               | Product Intelligence, Configuration, AI, Search, Checklist & Completion, Portfolio & Roadmap (consumption)         |
| **BP-004**        | **CRM & Customer Engagement**              | Manage customer relationships and engagement.                                   | Leads, opportunities, accounts, activities, calendar, visits, campaigns, cases, quotations (pipeline), Customer 360, engagement history                                                               | Work Assignment & SLA, Workflow, Notification, AI, Search, Checklist & Completion           |
| **BP-005**        | **Pricing, Tax & Commercial Rules**        | Define commercial policies that govern products and services.                   | Tax, discounts, promotions, commissions, pricing rules, commercial policies (offering unit prices remain in BP-003)                                                                                    | Rules Engine, Localization & Regulatory, Checklist & Completion                                                    |
| **BP-006**        | **Sales, Orders & Service Delivery**       | Convert a validated commercial agreement into a controlled sale/order and deliver it. | Direct sale, quote-to-order conversion, sales orders, checkout, physical fulfilment, goods inspection/acceptance, service delivery of sold orders, cancellation/return initiation (CRM quotations remain in BP-004; bookings/appointments/resource scheduling are out of scope) | Workflow, Notification, Audit, Checklist & Completion, Document |
| **BP-007**        | **Payments, Billing & Receipting**         | Collect, allocate, bill and receipt customer payments from confirmed sales without operating payment rails. | Payment obligation, method/rail/provider/channel catalogues, adapter orchestration (ENG-006/ENG-003e), initiation, partial/split/allocation, invoicing & credit sales, receipts, refunds, settlement **handoff** (not matching; not collections) | Payment, Receipting, Integration, Localization & Regulatory, Workflow, Audit, Notification, Document |
| **BP-008**        | **Inventory & Resource Management**        | Hold, move and control stock of inventory-tracked offerings without becoming a WMS, MRP, purchasing system or general ledger. | Inventory locations, stock ledger, derived on-hand/reserved/available, receiving & opening balances, sales reservation & issue from BP-006 fulfilment-ready contract, transfers, adjustments, stocktake, batch/expiry/serial, reorder **signals** (not POs), operational exceptions | Workflow, Organization, Audit, Notification, Localization & Regulatory, Document |
| **BP-009**        | **Procurement & Supplier Management**      | Provide end-to-end buy-side procurement without owning supplier identity, inventory on-hand, or GL. | Supplier procurement relationship (on BP-002 Party), purchase requests, RFX, supplier response, evaluation & award, POs, contracts, receiving **handoff** (not on-hand), supplier invoices, 2/3-way matching, exceptions, supplier performance, AP/payment **handoff** (rails open v1) | Workflow, Audit, Notification, Document, Organization, Localization & Regulatory, Integration, Work Assignment & SLA |
| **BP-010**        | **Finance & Accounting Foundation**        | Provide operational financial management capabilities.                          | Journals, cost centres, accounting periods, budgets, financial integration, reporting foundation                                                                                                     | Reporting, Reconciliation                                                                  |
| **BP-011**        | **Workflow & Business Process Automation** | Automate business processes across the platform.                                | Maker-checker, approvals, SLAs, escalations, task routing, workflow designer                                                                                                                         | Workflow, Notification, Audit                                                              |
| **BP-012**        | **Analytics, AI & Decision Intelligence**  | Transform operational data into business intelligence.                          | Dashboards, KPIs, forecasting, OCR, RAG, anomaly detection, AI recommendations, predictive analytics                                                                                                 | AI, Reporting, Event Ingestion                                                             |
| **BP-013**        | **Product Management & Innovation**        | Manage products from ideation to retirement.                                    | Product vision, business cases, personas, roadmaps, releases, MVPs, feature backlog, GTM planning, product analytics, customer feedback, AI product health, resource, budget and delivery management | Product Intelligence, Portfolio & Roadmap, AI, Workflow, Reporting                                              |

> **Build Pack ID realignment (AV-1.7):** CRM is **BP-004** (as implemented). Prior draft IDs for Pricing→BP-005, Sales→BP-006, Payments→BP-007, Inventory→BP-008. Former catalog “BP-008 CRM” is retired.
>
> **AV-1.8:** BP-007 ownership lock — not a processor; not collections (SC-032 future, **not BP-013**); not ENG-008 matching. See [01b – Architecture Versions](./01b-Architecture-Versions.md).
>
> **AV-1.9:** BP-008 ownership lock — quantity ledger; not BP-009; not writable on-hand; not ENG-008 matching; not GL. See [01b – Architecture Versions](./01b-Architecture-Versions.md).
>
> **AV-1.10:** BP-009 ownership lock — procurement transaction; not BP-002 supplier master; not BP-008 inventory ledger; not BP-010 GL; not BP-007 customer AR; outgoing payment rails **open v1**. See [01b – Architecture Versions](./01b-Architecture-Versions.md).
>
> **AV-1.11:** Procurement is an approved NAV-001 business hub. Suppliers (and later RFX/PO/Contract/Receiving/Invoice/Performance) nest under Procurement. Runtime hub registration occurs with IP-01. See [01b – Architecture Versions](./01b-Architecture-Versions.md).
>
> **AV-1.12:** BP-009 IP-03/IP-04/IP-05 are certification boundaries on one sourcing implementation — do not rebuild portal, quotes, or award. Tender opening is configurable (Standard vs Maker-Checker); enforcement rules may mandate Maker-Checker. See [01b – Architecture Versions](./01b-Architecture-Versions.md).


---

# InverBrass Industry Editions

> **Formerly:** Vertical Solutions (VS-001 onward). Edition IDs are retained for traceability.

Each Industry Edition is a purpose-built product experience assembled from shared Build Packs and platform engines. Customers perceive each edition as a dedicated solution — not as a generic platform with hidden menus.

| **Edition ID** | **Industry Edition** | **Purpose** | **Primary Build Packs Consumed** | **Edition-Specific Experience** |
| -------------- | -------------------- | ----------- | -------------------------------- | --------------------------------- |
| **VS-001** | **InverBrass Retail & Wholesale** | Digitize retail and wholesale operations | BP-001 to BP-012 | POS, promotions, stock replenishment, merchandise-focused navigation |
| **VS-002** | **InverBrass Property** | Manage residential, commercial and mixed-use properties | BP-001, BP-002, BP-003, BP-006, BP-007, BP-008, BP-011, BP-012 | Properties, units, tenants, leases, rent, maintenance — no Patients or Loans |
| **VS-003** | **InverBrass Education** | Digitize educational institutions | BP-001, BP-002, BP-003, BP-004, BP-006, BP-007, BP-011, BP-012 | Students, teachers, classes, fees, examinations — no Patients or Mortgages |
| **VS-004** | **InverBrass Healthcare** | Digitize healthcare providers | BP-001, BP-002, BP-003, BP-004, BP-006, BP-007, BP-011, BP-012 | Patients, doctors, appointments, laboratory, pharmacy — no Loans or Classrooms |
| **VS-005** | **InverBrass Agriculture** | Support farms, cooperatives and agribusinesses | BP-001, BP-002, BP-003, BP-006, BP-008, BP-011, BP-012 | Crops, livestock, farm inputs, production cycles |
| **VS-006** | **InverBrass Hospitality** | Manage hotels, restaurants and tourism businesses | BP-001, BP-002, BP-003, BP-006, BP-007, BP-008, BP-012 | Rooms, reservations, packages — no Patients or Loan Products |
| **VS-007** | **InverBrass Transport & Logistics** | Manage transport and logistics operations | BP-001, BP-002, BP-003, BP-006, BP-008, BP-011, BP-012 | Fleet, trips, cargo, deliveries, route planning |
| **VS-008** | **InverBrass Insurance** | Support insurers, brokers and agencies | BP-001, BP-002, BP-003, BP-005, BP-006, BP-007, BP-012 | Policies, claims, underwriting, renewals |
| **VS-009** | **InverBrass Banking & Financial Services** | Support lending and financial institutions | BP-001, BP-002, BP-003, BP-005, BP-007, BP-010, BP-012 | Loans, deposits, cards, treasury — no Patients or Rental Units |
| **VS-010** | **InverBrass NGO & Programmes** | Manage development programmes and beneficiaries | BP-001, BP-002, BP-004, BP-006, BP-011, BP-012 | Beneficiaries, projects, field activities, grants |
| **VS-011** | **InverBrass Manufacturing** | Digitize production operations | BP-001, BP-003, BP-006, BP-008, BP-009, BP-010, BP-012 | Bills of materials, production orders, quality control |
| **VS-012** | **InverBrass Professional Services** | Support consulting, legal and accounting firms | BP-001, BP-002, BP-004, BP-006, BP-007, BP-012 | Engagements, projects, billable hours, retainers |

Each edition is bound at business onboarding. The **Industry Experience Engine (ENG-003k)** generates navigation, terminology, dashboards, product templates, and feature visibility from the selected edition.


---

# Platform Design Principles


| **Principle**                        | **Description**                                                                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **AP-001 Industry-Native Experience** | Every business operates within an Industry Edition. Users must perceive the system as purpose-built for their domain — not as a generic platform with hidden menus. See [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md) §5. |
| **Composable Platform**              | Industry Editions are assembled from reusable Build Packs rather than developed as independent applications.                                  |
| **Engine-Driven Architecture**       | Build Packs orchestrate the Core Platform Engines; engines remain technology and capability providers.                                         |
| **Configuration over Customization** | Business, regulatory and country-specific behaviour is driven by metadata and configuration.                                                   |
| **Industry Editions, Shared Engines** | The architecture is generic; the experience is specialized. Specialization is delivered through ENG-003k Industry Experience Engine — not through engine forks or duplicate modules. |
| **Single Source of Truth**           | Parties, Products, Documents, Identity, Consent, Checklists and Workflow are shared across all editions.                                        |
| **Event-Driven Platform**            | Business events flow through the Event Ingestion Engine, enabling integrations, automation, reporting and AI.                                  |
| **AI-Native Architecture**           | Every Build Pack publishes structured data and events that can be consumed by AI for insights, recommendations and automation.                 |
| **Enterprise Scalability**           | The platform supports multi-business, multi-country, multi-tenant, multi-role and future cloud-scale deployment without architectural changes. |


This structure clearly distinguishes the platform layers:

1. **Core Platform Engines (ENG-001 to ENG-016, ENG-003k, ENG-003l, ENG-003m, ENG-003n)** – foundational, experience, completion, portfolio planning, and work assignment capabilities.
2. **Build Packs (BP-001 to BP-013)** – reusable business capabilities consumed by Industry Editions.
3. **Industry Editions (VS-001 onward)** – industry-native products (InverBrass Banking, InverBrass Property, etc.).
4. **Business Configuration** – tenant-specific settings within an edition.
5. **Users** – authenticated users operating within their business context.

---

02 - Platform Module Catalog

1. Document Information

Attribute	Value
Document Name	Platform Module Catalog
Version	1.0
Architecture Version	AV-1.6 (see [01b – Architecture Versions](./01b-Architecture-Versions.md))
Purpose	Defines every platform capability, ownership, dependencies and reuse strategy.
Scope	Entire InverBrass Business Platform
Audience	Product Owner, Solution Architect, Developers, AI Coding Assistants

---

1. Platform Foundation

These are mandatory platform services used by every solution.
Capability	Purpose	Used By	Configurable	Future Extensible
Authentication	Login, MFA, Password Management	All	No	Yes
Tenant Management	Business registration and isolation	All	No	Yes
Subscription Management	Plans, licensing and billing	All	Yes	Yes
User Management	Platform users	All	Yes	Yes
Role & Permission Management	Access control	All	Yes	Yes
Configuration Management	Business settings	All	Yes	Yes
Audit & Activity Logging	Track all business activities	All	No	Yes
File & Document Management	Store files and attachments	All	Yes	Yes
Document & Compliance	Required-document matching, evidence verification, compliance scoring	All Build Packs	Yes	Yes

---

1. Core Platform Engines — v1.0 Baseline

Every reusable processing capability is owned by exactly one Core Platform Engine. Build Packs and Industry Solutions **consume** engines — they do not reimplement them.

**Canonical specification:** [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md) §5 (v1.0 Platform Engine Baseline).

### v1.0 Platform Engine Baseline


| Engine ID    | Platform Engine                             | Purpose                                                                                 | What it Handles                                                                                                                                                                                                          | Status                      |
| ------------ | ------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| **ENG-001**  | Authentication Engine                       | Establishes user identity and secure access to the platform.                            | Login, logout, password management, PIN, MFA, SSO, session management, password reset, account lockout, identity providers (Google, Microsoft, Azure AD), token issuance.                                                | Implemented (BP-001)        |
| **ENG-002**  | Authorization Engine                        | Controls what authenticated users can access and perform.                               | Roles, permissions, RBAC, ABAC (future), business access, module access, feature access, data visibility, delegated access, segregation of duties.                                                                       | Implemented                 |
| **ENG-003a** | Configuration Engine                        | Central metadata engine that makes the platform configurable instead of hardcoded.      | System parameters, dropdowns, feature toggles, metadata, dynamic forms, numbering rules, statuses, configurable workflows, validation parameters, business settings, **Industry Profiles**, visible menus, navigation layouts. | Partial                     |
| **ENG-003b** | Localization & Regulatory Engine            | Enables country-specific behaviour without changing application code.                   | Countries, languages, currencies, taxes, date/time formats, address formats, identity document definitions, regulatory rules, invoicing rules, fiscal requirements, compliance configuration.                            | Partial (BP-002)            |
| **ENG-003c** | Organization Structure Engine               | Manages internal organizational hierarchy for Organization Parties.                     | Branches, departments, divisions, regions, campuses, organizational units, reporting hierarchy, head office designation, internal ownership structures.                                                                  | Implemented (BP-002)        |
| **ENG-003d** | Event Ingestion Engine                      | Receives and standardizes events entering the platform.                                 | Business events, webhooks, queues, event validation, event routing, event normalization, asynchronous processing, event publishing.                                                                                      | Planned                     |
| **ENG-003e** | Enterprise Integration Engine               | Provides a single integration layer between the platform and all external systems.      | REST APIs, SOAP, GraphQL, OAuth, API keys, webhooks, polling, retries, circuit breakers, provider routing, banking APIs, payment gateways, government APIs, CRM integrations, AI providers, connector health monitoring. | Planned                     |
| **ENG-003f** | Product Intelligence Engine                 | Analyses offerings and portfolio performance using analytics and AI.                    | Offering analytics, performance KPIs, adoption metrics, portfolio health scoring, decline detection, AI recommendations, retirement recommendations, customer feedback analysis, GTM insights — consumes roadmap and release data from ENG-003m. | Planned                     |
| **ENG-003g** | Business Presence Engine                    | Defines where an organization legally and operationally exists.                         | Countries of operation, legal entities, operating jurisdictions, registrations, branches by country, licensing jurisdictions, market presence.                                                                           | Planned                     |
| **ENG-003h** | Platform Performance & Scalability Engine   | Ensures enterprise-grade reliability and scalability.                                   | Caching, queues, observability, monitoring, telemetry, performance metrics, distributed tracing, load management, rate limiting, resilience, health monitoring.                                                          | Planned                     |
| **ENG-003i** | Consent Engine                              | Captures and manages customer consent as immutable business events.                     | Marketing consent, communication consent, regulatory consent, consent events, consent evidence, consent history, consent withdrawals, consent channels, compliance tracking.                                             | Implemented                 |
| **ENG-003j** | Identity & Regulatory Identification Engine | Captures and manages official regulatory identifiers independent of uploaded documents. | National IDs, passports, tax numbers, business registration numbers, VAT numbers, licences, issuing authorities, verification status, identifier lifecycle, linkage to supporting evidence.                              | Implemented (BP-002)        |
| **ENG-003k** | Industry Experience Engine                  | Presents an industry-native user experience on top of shared platform engines.          | Industry Editions, navigation generation, menu visibility, terminology mapping, dashboard layouts, feature visibility, configuration visibility, product templates, workflow templates, report templates, landing pages. | Planned                     |
| **ENG-003l** | Checklist & Completion Engine               | Provides metadata-driven operational checklists that guide processes and enforce completion. | Checklist definitions, checklist instances, mandatory and optional items, sequence, blocking rules, auto-complete rules, completion expressions, progress calculation, submission gates, warnings, manual completion, event-driven item completion. | Planned                     |
| **ENG-003m** | Portfolio & Roadmap Engine                  | Provides structured planning and controlled evolution of any portfolio subject.         | Roadmap items, releases, milestones, implementation progress, release history, retirement plans, timeline views, portfolio initiatives — offerings, services, programmes, projects, regulatory and strategic initiatives. | Planned                     |
| **ENG-003n** | Work Assignment & SLA Engine                | Tracks ownership, assignment history, and time-based SLA across work items.               | Assignment tracking, immutable assignment history, per-assignee SLA segments, cumulative lifecycle SLA, active/waiting/paused time, breach detection, queue metrics, SLA policy configuration by entity type.              | Planned                     |
| **ENG-004**  | Rules Engine                                | Executes deterministic business rules.                                                  | Eligibility rules, validations, calculations, decision tables, configurable rule execution, business policies, rule versioning.                                                                                          | Planned                     |
| **ENG-005**  | Workflow Engine                             | Orchestrates business processes requiring approvals or multiple steps.                  | Maker-checker, approvals, escalations, routing, SLA monitoring, workflow history, task assignment, decision points.                                                                                                      | Planned                     |
| **ENG-006**  | Payment Engine                              | Processes all incoming and outgoing financial transactions.                             | Cash, mobile money, bank transfers, cards, split payments, partial payments, refunds, credits, payment gateways.                                                                                                         | Planned                     |
| **ENG-007**  | Receipting Engine                           | Produces legally compliant financial documents.                                         | Receipts, invoices, quotations, credit notes, debit notes, numbering, fiscal compliance, digital delivery.                                                                                                               | Planned                     |
| **ENG-008**  | Reconciliation Engine                       | Matches financial movements across systems.                                             | Bank reconciliation, payment reconciliation, settlement matching, cash balancing, exception management, reconciliation reports.                                                                                          | Planned                     |
| **ENG-009**  | Notification Engine                         | Delivers communications across multiple channels.                                       | SMS, email, WhatsApp, push notifications, in-app notifications, reminders, templates, scheduling, delivery tracking.                                                                                                     | Planned                     |
| **ENG-011**  | Reporting Engine                            | Produces operational and management information.                                        | Operational reports, dashboards, exports, scheduled reports, management reports, compliance reports, BI data feeds.                                                                                                      | Planned                     |
| **ENG-012**  | Intelligence Engine                         | Provides platform-wide intelligent capabilities.                                        | Machine Learning, GenAI, OCR, RAG, NLP, recommendations, predictive analytics, decision support, document intelligence, conversational AI.                                                                               | Planned                     |
| **ENG-013**  | Audit Engine                                | Maintains immutable records of system changes.                                          | CRUD audit, field-level audit, user activity, change history, correlation IDs, compliance audit, forensic investigation.                                                                                                 | Partial (emitter interface) |
| **ENG-014**  | Offline Sync Engine                         | Enables offline-first operation for unreliable connectivity.                            | Local storage, synchronization, conflict resolution, retry mechanisms, synchronization queues, offline validation.                                                                                                       | Planned                     |
| **ENG-015**  | Document Engine                             | Manages all documents and digital evidence across the platform.                         | Uploads, storage, preview, OCR readiness, versioning, digital signatures, classification, compliance evidence, verification, document lifecycle, retention, archival, AI extraction.                                     | Partial (BP-002)            |
| **ENG-016**  | Search Engine                               | Provides unified enterprise search across all modules.                                  | Global search, indexing, filters, relevance ranking, autocomplete, faceted search, cross-module search, saved searches.                                                                                                  | Planned                     |


> **Extension ID:** **ENG-015a** — Document & Compliance Engine (compliance scoring and requirement matching layer on ENG-015). Partial (BP-002). Not a separate baseline row; implements the compliance-evidence slice of ENG-015.

> **Extension IDs:** **ENG-003k** — Industry Experience Engine. **ENG-003l** — Checklist & Completion Engine. **ENG-003m** — Portfolio & Roadmap Engine. **ENG-003n** — Work Assignment & SLA Engine. Sub-engines under ENG-003 alongside ENG-003a–n. **Next ID (AV-1.5 lock): ENG-003o.**

> **ENG-003 family note:** ENG-003 originally represented Platform Foundation / Metadata; the family now spans 14 sub-engines (003a–n). **AV-1.5 Engine Catalog Lock:** no renumbering, no regrouping — new capabilities use **ENG-003o**, **ENG-003p**, … until AV-2.0 is deliberately initiated. Possible AV-2.0 regrouping is recorded in [01b – Architecture Versions](./01b-Architecture-Versions.md) — Future Architecture Considerations.

> **ENG-001 – ENG-016** are the active v1.0 baseline engine IDs. Retired or merged IDs are recorded in §3.1 below — not as separate active catalog rows.



### Phase 2 Engines (Introduce Only When Needed)


| Engine ID   | Platform Engine              | Purpose                                                                    | What it Handles                                                                                                                    | Status  |
| ----------- | ---------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **ENG-017** | Identity Resolution Engine   | Maintains a single trusted identity across duplicate records.              | Deduplication, matching, golden record management, survivorship rules, CIF resolution, merge/split operations, similarity scoring. | Planned |
| **ENG-018** | Scheduling & Calendar Engine | Central scheduling capability shared by multiple domains.                  | Appointments, bookings, reservations, recurring schedules, availability, reminders, calendars, resource allocation.                | Planned |
| **ENG-019** | Analytics & Insights Engine  | Generates analytical and predictive insights beyond operational reporting. | KPI analytics, trend analysis, forecasting, benchmarking, anomaly detection, performance scoring, executive insights.              | Planned |


> **Note:** The retired Localization & Regulatory duplicate **ENG-017** was merged into **ENG-003b** (see §3.1). The Phase 2 **ENG-017 Identity Resolution Engine** is a distinct future capability — not a reinstatement of the retired ID.



### 3.1 Engine Merge Registry

When two engine IDs describe the same capability, merge into **one canonical engine** and record the merge here. Legacy IDs remain searchable but must not appear as separate engines in new documentation.


| Retired ID                           | Canonical ID | Status              | Merge Rationale                                                                    | Content Absorbed                                                                                                                                                                                                               |
| ------------------------------------ | ------------ | ------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ENG-017** (Localization duplicate) | **ENG-003b** | Approved 2026-07-29 | Duplicate Localization & Regulatory Engine numbering                               | Tax policies, invoice policies, receipt numbering, country integrations (eTIMS, KRA, URA, TRA, ZRA), feature policy matrix (Kenya/Uganda/Tanzania), feature toggle dimensions (country, industry, business type, subscription) |
| **ENG-010**                          | **ENG-003e** | Approved 2026-07-30 | Integration scope consolidated under Enterprise Integration Engine (v1.0 baseline) | APIs, Daraja, banks, eTIMS, external system connectors, webhook and API integration patterns                                                                                                                                   |


**Rule:** Before recording a merge, compare both engine definitions side-by-side, port any missing responsibilities into the canonical engine, present the **single merged output** for user approval, then update this registry. See `.cursor/rules/eng-catalog-governance.mdc`.

> **Localization First Principle:** All country-, region-, and jurisdiction-specific behaviour shall be implemented through **ENG-003b** (not the retired Localization duplicate ENG-017, not inline `if country == "KE"` checks). External integrations shall use **ENG-003e Enterprise Integration Engine** (not the retired ENG-010).

### 3.2 Foundation Freeze Registry

Frozen implementation packages define stable schemas and core patterns. Avoid revisiting them unless a genuine architectural gap is discovered. Industry-specific presentation belongs in **ENG-003k Industry Experience Engine** and the UI layer.

| Build Pack | Frozen Scope | Frozen Date | Notes |
| ---------- | ------------ | ----------- | ----- |
| **BP-001** | IP-001 — Business Setup & Onboarding foundation | 2026-07-30 | Business registration, profile, configuration |
| **BP-002** | IP-001–IP-012 — Party & Relationship foundation | 2026-07-30 | Party master, timeline, audit, documents |
| **BP-003** | IP-001 — Product & Service Foundation (Offering Engine) | 2026-07-30 | `product_*` tables frozen; internal **Offering** terminology; UI labels via ENG-003k |

**Rule:** Complete remaining IPs without restructuring frozen foundations. Enhance through configuration, Industry Experience profiles, and UI — not schema churn.

### 3.3 Build Pack Delivery Boundaries (AV-1.5)

Delivery boundaries define when a Build Pack stops accepting new IPs — distinct from schema foundation freeze (§3.2).

| Build Pack | Delivery boundary | Status |
| ---------- | ----------------- | ------ |
| **BP-003** | **IP-013 (Offering Governance)** — final IP | IP-014 retired → ENG-003m; IP-015 deferred → ENG-003f / BP-013 |

New platform capabilities (checklist, portfolio roadmap, work assignment & SLA, etc.) are implemented as **Core Platform Engines** (ENG-003l, ENG-003m, ENG-003n, …) consumed by Build Packs — not as additional Build Pack IPs.

**BP-004 CRM baseline (2026-08-02; ID locked AV-1.7):** Build Pack documentation in `Build Pack 004 - Customer Relationship Management/` establishes a **13-IP CRM baseline** (IP-01 through IP-13) as catalog **BP-004**. **IP-01 CRM Foundation & Customer 360** owns the single pane of glass (default profile landing); IP-02–IP-12 contribute widgets and timeline events. IP-07 owns visit and call report management separately from calendar scheduling (IP-06).

**BP-003 IP-011 — Offering Pricing (2026-08-01):** Implemented as reusable platform tables `pricing_catalogue`, `pricing_item`, and reference `pricing_method`. BP-003 consumes via the Product Workspace **Pricing** tab. Prices are never stored on the offering master (`product`). Future commercial capabilities (discounts, promotions, taxes — BP-004) extend the workspace without redesigning the pricing engine.

**BP-003 IP-012 — Offering Analytics (2026-08-01):** Implemented as reusable framework tables `offering_metric_definition` and immutable `offering_metric_snapshot`. BP-003 consumes via the Product Workspace **Analytics** tab. Platform-derived KPIs use existing offering data; transaction metrics await Sales, Inventory, CRM, and Finance Build Packs.

**BP-003 IP-013 — Offering Governance (2026-08-01):** Implemented as `offering_governance`, immutable `offering_governance_history`, and metadata-driven `offering_governance_checklist_definition` (ENG-003l foundation). BP-003 consumes via the Product Workspace **Governance** tab and `/products/governance` dashboard. Readiness score is deterministic from weighted checklist items; workflow approvals remain ENG-005.

### Engine Ownership Rules


| Rule                     | Description                                                                    |
| ------------------------ | ------------------------------------------------------------------------------ |
| Single Owner             | Every engine has one owning service in `03-platform/src/core/`                 |
| Consume, Don't Duplicate | Domain modules call engine services; they never reimplement engine logic       |
| Configuration First      | Engine behaviour adapts through configuration (`ENG-003a`) before code changes |
| AV-1.5 Catalog Lock      | New sub-engines: ENG-003o, ENG-003p, … — no renumbering or regrouping until AV-2.0 |
| Audit Cross-Cut          | All mutating engine operations emit events via **ENG-013**                     |


---

1. Business Capability Domains (Summary)

Customer Domain
Capability	Purpose	Shared	Used By
CRM	Lead and customer relationship management	Yes	All Solutions
Customer Management	Customer records	Yes	All Solutions
Contact Management	Customer contacts	Yes	All Solutions
Communication History	Emails, Calls, WhatsApp	Yes	All Solutions
Tasks & Follow-ups	Customer follow-up activities	Yes	All Solutions

---

Sales & Commerce Domain
Capability	Purpose	Shared	Used By
Quotations	Sales quotations	Yes	Business Operations
Sales Orders	Customer orders	Yes	Business Operations
Invoicing	Customer invoicing	Yes	Business Operations, Property, Academy
Point of Sale	Fast retail sales	Yes	Business Operations
Returns	Sales returns	Yes	Business Operations
Promotions & Discounts	Campaigns and offers	Yes	Business Operations

---

Inventory Domain
Capability	Purpose	Shared	Used By
Product Management	Products and services	Yes	Business Operations
Categories	Product grouping	Yes	Business Operations
Stock Management	Inventory control	Yes	Business Operations
Warehouses	Stock locations	Yes	Business Operations
Stock Adjustments	Inventory corrections	Yes	Business Operations
Procurement	Purchasing and supplier orders	Yes	Business Operations

---

Finance Domain
Capability	Purpose	Shared	Used By
Billing	Bills and invoices	Yes	Most Solutions
Payments	Payment allocation	Yes	Most Solutions
Receipts	Customer receipts	Yes	Most Solutions
Expenses	Expense tracking	Yes	Business Operations
Cash Management	Cash reconciliation	Yes	Business Operations
Tax Management	Tax calculations and configuration	Yes	Most Solutions

---

Operations Domain
Capability	Purpose	Shared	Used By
Scheduling	Appointments and bookings	Yes	Property, Academy, Future Solutions
Work Orders	Service job management	Yes	Property, Business Operations
Asset Management	Business assets	Yes	Business Operations, Property
Document Management	Business documents	Yes	All Solutions
Checklists	Operational process completion and guided steps (ENG-003l)	Yes	All Industry Solutions
Work Assignment & SLA	Ownership history, per-assignee and cumulative SLA (ENG-003n)	Yes	All Industry Solutions

---

Intelligence Domain
Capability	Purpose	Shared	Used By
Business Rules	Configurable rule execution	Yes	All Solutions
Machine Learning	Predictions and anomaly detection	Yes	All Solutions
Generative AI	Business assistant and summaries	Yes	All Solutions
Decision Support	Recommendations and insights	Yes	All Solutions

---

1. Industry Solutions (Industry Editions)

> See **InverBrass Industry Editions** above. Edition IDs VS-001 onward are retained.

Solution	Built Using
InverBrass Retail (VS-001)	Customer, CRM, Inventory, Sales, Finance, Operations
InverBrass Property (VS-002)	Customer, CRM, Finance, Workflow, Documents
InverBrass Education (VS-003)	Customer, CRM, Finance, Workflow, Scheduling
Chama Management	Customer, CRM, Finance, Workflow
SME Academy	Customer, CRM, Finance, Scheduling, Documents

---

1. Configuration Philosophy

Principle	Description
Configuration over Development	Business behaviour should be changed through settings, not code.
Feature Toggle	Capabilities can be enabled or disabled per tenant.
Business Type Templates	Predefined templates (Shop, Salon, Restaurant, Pharmacy, Car Wash, etc.) configure the Business Operations solution.
Progressive Feature Enablement	Start with essential features and unlock advanced capabilities as businesses grow.
Self-Service Setup	Business owners configure the platform through guided setup without requiring technical support.

---

1. Capability Ownership Principles

Principle	Description
Single Owner	Every capability has one owning domain.
Reuse First	Existing capabilities must be reused before creating new ones.
Document & Compliance Reuse	Property, HR, Fleet, Projects, Loans, Suppliers, Customers, Procurement, Healthcare, Education and future Build Packs must reuse the Core Platform Document & Compliance capability — not create module-specific document engines.
API First	Capabilities expose services through APIs.
Loose Coupling	Capabilities communicate through well-defined interfaces.
Mobile First	Every capability must provide a mobile-optimized experience.
Offline First	Critical business processes continue without connectivity and synchronize later.

---

Industry Solution Configuration Principle
Principle	Description
Industry Editions (AP-001)	Industry Editions are assembled from reusable Build Packs and delivered through ENG-003k Industry Experience Engine. Users never see unrelated industry capabilities.
Industry Edition Selection	Business onboarding selects an Industry Edition (Banking, Property, Healthcare, Education, etc.) — not a generic business type. This binds navigation, terminology, and feature visibility.
Edition Templates	Each Industry Edition may provide preconfigured templates (product types, workflows, reports) that enable rapid self-service onboarding.
Reusable Capabilities	Templates reuse Platform Foundation, Platform Engines and Build Packs without duplicating functionality.
Extensibility	New Industry Editions can be introduced through configuration with minimal or no code changes wherever possible.

Edition-specific business templates within an Industry Edition:

Industry Edition	Business Template	Uses Capabilities
InverBrass Retail (VS-001)	Retail Shop	Retail + CRM + Inventory + Finance
InverBrass Retail (VS-001)	Restaurant	Retail + Tables + Kitchen + Finance
InverBrass Retail (VS-001)	Salon	Retail + Bookings + CRM + Finance
InverBrass Retail (VS-001)	Car Wash	Retail + Vehicles + Services + Finance
InverBrass Retail (VS-001)	Pharmacy	Retail + Inventory + Finance + Compliance




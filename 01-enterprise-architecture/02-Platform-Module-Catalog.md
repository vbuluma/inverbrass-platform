
Platform Principle & Vission PP-001 – Digital Business Platform

The InverBrass Platform is a configurable SME Digital Business Platform designed to digitize business operations and provide a foundation for value-added ecosystem services such as embedded finance, insurance, lending, analytics, AI, and partner integrations. Operational modules exist to generate trusted digital business data, not to replicate traditional ERP systems
I want to introduce one rule that we'll follow throughout this project:
Every capability must have one and only one owner.
For example, Customer Management belongs to the Customer Domain. Property, School, Business Operations, Chama, and Academy all use it—they don't create their own customer management.
This principle will prevent duplication across the platform.
________________________________________
02 - Platform Module Catalog
1. Document Information
Attribute	Value
Document Name	Platform Module Catalog
Version	1.0
Purpose	Defines every platform capability, ownership, dependencies and reuse strategy.
Scope	Entire InverBrass Business Platform
Audience	Product Owner, Solution Architect, Developers, AI Coding Assistants
________________________________________
2. Platform Foundation
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
________________________________________
3. Core Platform Engines — v1.0 Baseline

Every reusable processing capability is owned by exactly one Core Platform Engine. Build Packs and Industry Solutions **consume** engines — they do not reimplement them.

**Canonical specification:** [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md) §5 (v1.0 Platform Engine Baseline).

### v1.0 Platform Engine Baseline

| Engine ID | Platform Engine | Purpose | What it Handles | Status |
|-----------|-----------------|---------|-----------------|--------|
| **ENG-001** | Authentication Engine | Establishes user identity and secure access to the platform. | Login, logout, password management, PIN, MFA, SSO, session management, password reset, account lockout, identity providers (Google, Microsoft, Azure AD), token issuance. | Implemented (BP-001) |
| **ENG-002** | Authorization Engine | Controls what authenticated users can access and perform. | Roles, permissions, RBAC, ABAC (future), business access, module access, feature access, data visibility, delegated access, segregation of duties. | Implemented |
| **ENG-003a** | Configuration Engine | Central metadata engine that makes the platform configurable instead of hardcoded. | System parameters, dropdowns, feature toggles, metadata, dynamic forms, numbering rules, statuses, configurable workflows, validation parameters, business settings. | Partial |
| **ENG-003b** | Localization & Regulatory Engine | Enables country-specific behaviour without changing application code. | Countries, languages, currencies, taxes, date/time formats, address formats, identity document definitions, regulatory rules, invoicing rules, fiscal requirements, compliance configuration. | Partial (BP-002) |
| **ENG-003c** | Organization Structure Engine | Manages internal organizational hierarchy for Organization Parties. | Branches, departments, divisions, regions, campuses, organizational units, reporting hierarchy, head office designation, internal ownership structures. | Implemented (BP-002) |
| **ENG-003d** | Event Ingestion Engine | Receives and standardizes events entering the platform. | Business events, webhooks, queues, event validation, event routing, event normalization, asynchronous processing, event publishing. | Planned |
| **ENG-003e** | Enterprise Integration Engine | Provides a single integration layer between the platform and all external systems. | REST APIs, SOAP, GraphQL, OAuth, API keys, webhooks, polling, retries, circuit breakers, provider routing, banking APIs, payment gateways, government APIs, CRM integrations, AI providers, connector health monitoring. | Planned |
| **ENG-003f** | Product Intelligence Engine | Governs products throughout their lifecycle using analytics and AI. | Product portfolio, product lifecycle, roadmaps, business cases, feature tracking, MVPs, KPIs, adoption metrics, AI recommendations, product retirement analysis, GTM support. | Planned |
| **ENG-003g** | Business Presence Engine | Defines where an organization legally and operationally exists. | Countries of operation, legal entities, operating jurisdictions, registrations, branches by country, licensing jurisdictions, market presence. | Planned |
| **ENG-003h** | Platform Performance & Scalability Engine | Ensures enterprise-grade reliability and scalability. | Caching, queues, observability, monitoring, telemetry, performance metrics, distributed tracing, load management, rate limiting, resilience, health monitoring. | Planned |
| **ENG-003i** | Consent Engine | Captures and manages customer consent as immutable business events. | Marketing consent, communication consent, regulatory consent, consent events, consent evidence, consent history, consent withdrawals, consent channels, compliance tracking. | Implemented |
| **ENG-003j** | Identity & Regulatory Identification Engine | Captures and manages official regulatory identifiers independent of uploaded documents. | National IDs, passports, tax numbers, business registration numbers, VAT numbers, licences, issuing authorities, verification status, identifier lifecycle, linkage to supporting evidence. | Implemented (BP-002) |
| **ENG-004** | Rules Engine | Executes deterministic business rules. | Eligibility rules, validations, calculations, decision tables, configurable rule execution, business policies, rule versioning. | Planned |
| **ENG-005** | Workflow Engine | Orchestrates business processes requiring approvals or multiple steps. | Maker-checker, approvals, escalations, routing, SLA monitoring, workflow history, task assignment, decision points. | Planned |
| **ENG-006** | Payment Engine | Processes all incoming and outgoing financial transactions. | Cash, mobile money, bank transfers, cards, split payments, partial payments, refunds, credits, payment gateways. | Planned |
| **ENG-007** | Receipting Engine | Produces legally compliant financial documents. | Receipts, invoices, quotations, credit notes, debit notes, numbering, fiscal compliance, digital delivery. | Planned |
| **ENG-008** | Reconciliation Engine | Matches financial movements across systems. | Bank reconciliation, payment reconciliation, settlement matching, cash balancing, exception management, reconciliation reports. | Planned |
| **ENG-009** | Notification Engine | Delivers communications across multiple channels. | SMS, email, WhatsApp, push notifications, in-app notifications, reminders, templates, scheduling, delivery tracking. | Planned |
| **ENG-011** | Reporting Engine | Produces operational and management information. | Operational reports, dashboards, exports, scheduled reports, management reports, compliance reports, BI data feeds. | Planned |
| **ENG-012** | Intelligence Engine | Provides platform-wide intelligent capabilities. | Machine Learning, GenAI, OCR, RAG, NLP, recommendations, predictive analytics, decision support, document intelligence, conversational AI. | Planned |
| **ENG-013** | Audit Engine | Maintains immutable records of system changes. | CRUD audit, field-level audit, user activity, change history, correlation IDs, compliance audit, forensic investigation. | Partial (emitter interface) |
| **ENG-014** | Offline Sync Engine | Enables offline-first operation for unreliable connectivity. | Local storage, synchronization, conflict resolution, retry mechanisms, synchronization queues, offline validation. | Planned |
| **ENG-015** | Document Engine | Manages all documents and digital evidence across the platform. | Uploads, storage, preview, OCR readiness, versioning, digital signatures, classification, compliance evidence, verification, document lifecycle, retention, archival, AI extraction. | Partial (BP-002) |
| **ENG-016** | Search Engine | Provides unified enterprise search across all modules. | Global search, indexing, filters, relevance ranking, autocomplete, faceted search, cross-module search, saved searches. | Planned |

> **Extension ID:** **ENG-015a** — Document & Compliance Engine (compliance scoring and requirement matching layer on ENG-015). Partial (BP-002). Not a separate baseline row; implements the compliance-evidence slice of ENG-015.

> **ENG-001 – ENG-016** are the active v1.0 baseline engine IDs. Retired or merged IDs are recorded in §3.1 below — not as separate active catalog rows.

### Phase 2 Engines (Introduce Only When Needed)

| Engine ID | Platform Engine | Purpose | What it Handles | Status |
|-----------|-----------------|---------|-----------------|--------|
| **ENG-017** | Identity Resolution Engine | Maintains a single trusted identity across duplicate records. | Deduplication, matching, golden record management, survivorship rules, CIF resolution, merge/split operations, similarity scoring. | Planned |
| **ENG-018** | Scheduling & Calendar Engine | Central scheduling capability shared by multiple domains. | Appointments, bookings, reservations, recurring schedules, availability, reminders, calendars, resource allocation. | Planned |
| **ENG-019** | Analytics & Insights Engine | Generates analytical and predictive insights beyond operational reporting. | KPI analytics, trend analysis, forecasting, benchmarking, anomaly detection, performance scoring, executive insights. | Planned |

> **Note:** The retired Localization & Regulatory duplicate **ENG-017** was merged into **ENG-003b** (see §3.1). The Phase 2 **ENG-017 Identity Resolution Engine** is a distinct future capability — not a reinstatement of the retired ID.

### 3.1 Engine Merge Registry

When two engine IDs describe the same capability, merge into **one canonical engine** and record the merge here. Legacy IDs remain searchable but must not appear as separate engines in new documentation.

| Retired ID | Canonical ID | Status | Merge Rationale | Content Absorbed |
|------------|--------------|--------|-----------------|------------------|
| **ENG-017** (Localization duplicate) | **ENG-003b** | Approved 2026-07-29 | Duplicate Localization & Regulatory Engine numbering | Tax policies, invoice policies, receipt numbering, country integrations (eTIMS, KRA, URA, TRA, ZRA), feature policy matrix (Kenya/Uganda/Tanzania), feature toggle dimensions (country, industry, business type, subscription) |
| **ENG-010** | **ENG-003e** | Approved 2026-07-30 | Integration scope consolidated under Enterprise Integration Engine (v1.0 baseline) | APIs, Daraja, banks, eTIMS, external system connectors, webhook and API integration patterns |

**Rule:** Before recording a merge, compare both engine definitions side-by-side, port any missing responsibilities into the canonical engine, present the **single merged output** for user approval, then update this registry. See `.cursor/rules/eng-catalog-governance.mdc`.

> **Localization First Principle:** All country-, region-, and jurisdiction-specific behaviour shall be implemented through **ENG-003b** (not the retired Localization duplicate ENG-017, not inline `if country == "KE"` checks). External integrations shall use **ENG-003e Enterprise Integration Engine** (not the retired ENG-010).

### Engine Ownership Rules

| Rule | Description |
|------|-------------|
| Single Owner | Every engine has one owning service in `03-platform/src/core/` |
| Consume, Don't Duplicate | Domain modules call engine services; they never reimplement engine logic |
| Configuration First | Engine behaviour adapts through configuration (`ENG-003a`) before code changes |
| Audit Cross-Cut | All mutating engine operations emit events via **ENG-013** |

________________________________________
4. Business Capability Domains (Summary)
Customer Domain
Capability	Purpose	Shared	Used By
CRM	Lead and customer relationship management	Yes	All Solutions
Customer Management	Customer records	Yes	All Solutions
Contact Management	Customer contacts	Yes	All Solutions
Communication History	Emails, Calls, WhatsApp	Yes	All Solutions
Tasks & Follow-ups	Customer follow-up activities	Yes	All Solutions
________________________________________
Sales & Commerce Domain
Capability	Purpose	Shared	Used By
Quotations	Sales quotations	Yes	Business Operations
Sales Orders	Customer orders	Yes	Business Operations
Invoicing	Customer invoicing	Yes	Business Operations, Property, Academy
Point of Sale	Fast retail sales	Yes	Business Operations
Returns	Sales returns	Yes	Business Operations
Promotions & Discounts	Campaigns and offers	Yes	Business Operations
________________________________________
Inventory Domain
Capability	Purpose	Shared	Used By
Product Management	Products and services	Yes	Business Operations
Categories	Product grouping	Yes	Business Operations
Stock Management	Inventory control	Yes	Business Operations
Warehouses	Stock locations	Yes	Business Operations
Stock Adjustments	Inventory corrections	Yes	Business Operations
Procurement	Purchasing and supplier orders	Yes	Business Operations
________________________________________
Finance Domain
Capability	Purpose	Shared	Used By
Billing	Bills and invoices	Yes	Most Solutions
Payments	Payment allocation	Yes	Most Solutions
Receipts	Customer receipts	Yes	Most Solutions
Expenses	Expense tracking	Yes	Business Operations
Cash Management	Cash reconciliation	Yes	Business Operations
Tax Management	Tax calculations and configuration	Yes	Most Solutions
________________________________________
Operations Domain
Capability	Purpose	Shared	Used By
Scheduling	Appointments and bookings	Yes	Property, Academy, Future Solutions
Work Orders	Service job management	Yes	Property, Business Operations
Asset Management	Business assets	Yes	Business Operations, Property
Document Management	Business documents	Yes	All Solutions
Checklists	Operational task lists	Yes	Future Solutions
________________________________________
Intelligence Domain
Capability	Purpose	Shared	Used By
Business Rules	Configurable rule execution	Yes	All Solutions
Machine Learning	Predictions and anomaly detection	Yes	All Solutions
Generative AI	Business assistant and summaries	Yes	All Solutions
Decision Support	Recommendations and insights	Yes	All Solutions
________________________________________
6. Industry Solutions
Solution	Built Using
Business Operations	Customer, CRM, Inventory, Sales, Finance, Operations
Property Management	Customer, CRM, Finance, Workflow, Documents
School Management	Customer, CRM, Finance, Workflow, Scheduling
Chama Management	Customer, CRM, Finance, Workflow
SME Academy	Customer, CRM, Finance, Scheduling, Documents
________________________________________
7. Configuration Philosophy
Principle	Description
Configuration over Development	Business behaviour should be changed through settings, not code.
Feature Toggle	Capabilities can be enabled or disabled per tenant.
Business Type Templates	Predefined templates (Shop, Salon, Restaurant, Pharmacy, Car Wash, etc.) configure the Business Operations solution.
Progressive Feature Enablement	Start with essential features and unlock advanced capabilities as businesses grow.
Self-Service Setup	Business owners configure the platform through guided setup without requiring technical support.
________________________________________
8. Capability Ownership Principles
Principle	Description
Single Owner	Every capability has one owning domain.
Reuse First	Existing capabilities must be reused before creating new ones.
Document & Compliance Reuse	Property, HR, Fleet, Projects, Loans, Suppliers, Customers, Procurement, Healthcare, Education and future Build Packs must reuse the Core Platform Document & Compliance capability — not create module-specific document engines.
API First	Capabilities expose services through APIs.
Loose Coupling	Capabilities communicate through well-defined interfaces.
Mobile First	Every capability must provide a mobile-optimized experience.
Offline First	Critical business processes continue without connectivity and synchronize later.
________________________________________

Industry Solution Configuration Principle
Principle	Description
Industry Solutions	Industry solutions are assembled from reusable business capabilities and delivered primarily through configuration rather than custom development.
Business Templates	Every industry solution may provide one or more preconfigured business templates that enable rapid self-service onboarding.
Reusable Capabilities	Templates reuse Platform Foundation, Business Engines and Business Capabilities without duplicating functionality.
Extensibility	New industry templates can be introduced through configuration with minimal or no code changes wherever possible.
Then your examples become:
Industry Solution	Business Template	Uses Capabilities
Business Operations	Retail Shop	Business Operations + CRM + Inventory + Finance
Business Operations	Restaurant	Business Operations + Tables + Kitchen + Finance
Business Operations	Salon	Business Operations + Bookings + CRM + Finance
Business Operations	Car Wash	Business Operations + Vehicles + Services + Finance
Business Operations	Pharmacy	Business Operations + Inventory + Finance + Compliance

🏛️ InverBrass Platform: Final Blueprint (v1.0 Architecture & Documentation)
This is the frozen, enterprise-ready InverBrass v1.0 Architecture Blueprint. It maximizes your velocity as a solo developer by prioritizing extreme modular uniformity and configuration over one-off custom code. [1]

**Architecture Version:** AV-1.6 — see [01b – Architecture Versions](./01b-Architecture-Versions.md) for the full change history (from → to, reasoning). **Engine catalog locked** under AV-1.5 — next sub-engine ID: ENG-003o.

T**his & future architecture changes MUST support My core VISSION below**:
****Platform Principle & Vission PP-001 – Digital Business Platform**

```
 The InverBrass Platform is a configurable SME Digital Business Platform designed to digitize business operations and provide a foundation for value-added ecosystem services such as embedded finance, insurance, lending, analytics, AI, and partner integrations. Operational modules exist to generate trusted digital business data, not to replicate traditional ERP systems I want to introduce one rule that we'll follow throughout this project: Every capability must have one and only one owner. For example, Customer Management belongs to the Customer Domain. Property, School, Business Operations, Chama, and Academy all use it—they don't create their own customer management. This principle will prevent duplication across the platform.
```

📂 Production Directory Layout
Implement this identical structure in your workspace root. This clean hierarchy ensures Cursor can scan, index, and modify code blocks without losing relational context.
inverbrass-platform/
├── src/
│   ├── app/                          # Next.js App Router (Entry Points, Layouts, API Handlers)
│   │   ├── api/                      # System endpoints & webhooks (e.g., api/webhooks/mpesa)
│   │   ├── sme/                      # SME OS user application route space
│   │   ├── school/                   # School OS user application route space
│   │   └── property/                 # Property OS user application route space
│   ├── components/                   # Predictable Shared Visual Elements
│   │   ├── common/ | forms/ | tables/ | charts/ | layout/ | dialogs/
│   ├── modules/                      # Business Line Capabilities (Highly Uniform)
│   │   ├── crm/ | sales/ | inventory/ | expenses/ | revenue-assurance/ 
│   │   ├── school/ (students, fees, attendance)
│   │   └── property/ (tenants, leases, maintenance)
│   ├── core/                         # Shared Platform Foundations (CORE-001 to CORE-012)
│   │   ├── auth/ | workflow/ | payments/ | billing/ | receipting/ | reconciliation/
│   │   └── notifications/ | reporting/ | documents/ | integrations/ | audit/ | ai/
│   ├── db/                           # Database Configuration & TypeScript Schemas
│   │   ├── schema/
│   │   │   ├── core.ts (tenants, users, roles)
│   │   │   ├── mpesa-payments.ts | sme.ts | school.ts | property.ts
│   │   └── index.ts                  # Drizzle DB instantiation pool
│   └── config/                       # Configuration Engine (Data-driven platform values)
│       └── roles.ts | permissions.ts | workflows.ts | menus.ts | business-types.ts
├── docs/                             # The AI Knowledge Base (Cursor's Memory Box)
│   ├── Architecture/ | PRDs/ | Functional Specifications/ | Database/ 
│   └── APIs/ | UI Standards/ | Prompt Library/ | Cursor/
├── tests/                            # Unit and end-to-end integration workflows
├── public/                           # Static assets, fonts, icons, PWA manifest configurations
└── .cursorrules                      # Main developer governance rule matrix

---

📐 Structural Uniformity Rule for Modules
Every folder inside src/modules/ and its nested domains must implement this exact folder blueprint. This makes feature code highly predictable for Cursor:
[module-name]/
├── components/   # UI view segments unique to this specific module domain
├── services/     # Core business logic processing rules & Drizzle database operations
├── actions/      # Next.js Server Actions connecting the UI to the service layer
├── validators/   # Zod validation structural schemas for requests or state management
├── types/        # TypeScript typing maps isolated to this module environment
├── hooks/        # React functional lifecycle bindings or local interaction state
└── README.md     # Context summary describing the operational boundaries of this module

---

📝 Final Production .cursorrules
Copy and paste this configuration file directly into .cursorrules in the root of your application repository.

# Configuration Directive

- **Core Principle**: "Every feature must be configurable before it is customizable." Drive business variations through `src/config/` definitions instead of modifying underlying engine code.
- **Framework Stack**: Next.js 15+ (App Router, React Server Components, TypeScript)
- **Styling UI Elements**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Data & Security**:

Supabase PostgreSQL

- Supabase Auth
- **Database Engine Access**: Drizzle ORM (Type-safe client query builder)
- **Structural Blueprint**: Single-app Modular Monolith. Do not invent cross-app packages or monorepo configurations.



# Code Architecture Boundaries



## 1. Directory Structure Enforcement

- Layer enforcement is absolute: UI Elements (src/components/ or app/) ──> Server Actions/Route Handlers (src/app/api/) ──> Domain Module Logic (src/modules/) ──> Shared Platform Utilities (src/core/) ──> Drizzle Client Queries (src/db/).
- Multi-industry code isolation lives inside `src/modules/`. Maintain identical internal module setups: `components/`, `services/`, `actions/`, `validators/`, `types/`, `hooks/`, `README.md`.
- Shared foundation mechanics live within `src/core/` (auth, workflow, payments, billing, receipting, reconciliation, notifications, reporting, documents, integrations, audit, ai).
- Each code block must be explained



## 2. Multi-Tenancy & Integrity Constraints

- Every data mutation and read query must enforce isolation filtering using an explicit `organization_id` or `tenant_id`.
- Never execute raw SQL text snippets anywhere inside the client interface files.
- Secure API endpoints using valid server-side Supabase user identity state inspections.
- Enforce structural **idempotency tracking checks** within payment processing databases to neutralize double-execution risks from external Safaricom Daraja API network callbacks.



## 3. UI, State, & Data Validation

- Maximize **React Server Components (RSC)** to orchestrate layout assembly, rendering content securely from server memory where viable.
- Use `"use client"` exclusively for files housing explicit active interactions, state loops, or local browser hooks.
- Map and manage form data collections using `react-hook-form` validation rules parsed strictly by a custom `zod` object map.



## 4. Cursor Execution Rules

- Prioritize reading contextual instructions located inside the database files (`src/db/schema/*`) and design guides (`docs/`) before building functions.
- Do not write placeholder descriptors like `// TODO: handle later`. Generate operational pathways or catch block logging routines.

---

🎯 First Steps to Initialize the Project
To jumpstart development without hitting tool friction, run through these exact sequential actions inside your terminal:
1.	Initialize the App Engine: Spin up your basic setup inside an empty directory:
1.	Bash
npx create-next-app@latest inverbrass-platform --typescript --tailwind --app --src-dir --eslint
2.	Add Component Tools: Navigate into the app root and install shadcn/ui components along with basic primitives:
Bash 
•	npx shadcn@latest init
3.	Connect Data Layers: Install your data modeling packages to get your background engines running:
Bash.
npm install drizzle-orm @supabase/supabase-js zod react-hook-form @hookform/validators
4.	npm install -D drizzle-kit
5.	Create Structure & Documentation: Build out your directory skeleton exactly as outlined above and paste your .cursorrules in place.
I can help you construct your foundational multi-tenant database blueprint inside src/db/schema/core.ts (CORE-001 & CORE-002), or we can write the unified configurations inside src/config/ for roles and menus. Which one would you like to handle first?

Product Design Principles, containing the philosophies  defined below:

1. Self-Service First
2. Mobile-First Experience
3. Simplicity Over Feature Count
4. Configuration Over Consulting
5. Progressive Feature Disclosure
6. CRM as a Shared Capability
7. 80/20 Design-Build the features that solve 80% of SME needs with 20% of the complexity. Always ask, What is the simplest workflow that solves the business problem?"
8. AI as a Guide, Not a Replacement

## 5 – Platform Layer Architecture

### Architectural Principle AP-001 — Industry-Native Experience

The InverBrass Platform shall present an **industry-specific user experience**. Every business operates within an **Industry Edition** that exposes only the capabilities, terminology, configuration options, workflows, dashboards, and navigation relevant to that industry.

While all editions share a common set of enterprise platform engines, users and administrators must perceive the system as **purpose-built for their domain** — not as a generic multi-industry platform.

**Positioning:** Industry Editions powered by a shared enterprise platform.

| What stays generic | What feels specialized |
|--------------------|------------------------|
| Platform engines (auth, workflow, payments, audit, search, etc.) | Navigation menus and module labels |
| Build Pack capabilities (Party, Product, Payments, etc.) | Terminology (Customer vs Patient vs Tenant vs Student) |
| Data models and APIs | Product type templates and configuration forms |
| Multi-tenant isolation | Dashboard layouts and landing pages |
| | Workflow and report templates |
| | Feature and menu visibility |

A bank administrator never sees Patients, Classrooms, or Bedrooms. A hospital administrator never sees Loan Products, Collateral, or Mortgage Installments. A landlord never sees Patients or Deposits unless those are genuinely part of their business model.

### Platform Layer Stack

```
Shared Platform Engines (ENG-001 – ENG-016, ENG-003k)
              │
              ▼
    Industry Experience Layer (ENG-003k)
              │
              ▼
       Business Configuration
              │
              ▼
            Users
```

**Build Packs** are shared platform capabilities consumed by Industry Editions — they are not a separate customer-facing layer. Each edition composes the Build Packs it needs and presents them through its Industry Experience Profile.

#### Industry Editions (Examples)

| Edition | Administration Label | Example Navigation | Example Product Types |
|---------|---------------------|-------------------|----------------------|
| **InverBrass Banking** | Banking Administration | Products, Customers, Loans, Deposits, Cards, Treasury, Branches, Compliance | Loan Product, Savings Product, Card Product |
| **InverBrass Healthcare** | Healthcare Administration | Patients, Doctors, Appointments, Procedures, Laboratory, Pharmacy, Billing | Medical Service, Procedure, Medication |
| **InverBrass Property** | Property Administration | Properties, Units, Tenants, Leases, Rent, Maintenance, Utilities | Rental Unit, Property, Parking Space |
| **InverBrass Education** | Education Administration | Students, Teachers, Classes, Subjects, Fees, Examinations, Attendance | Course, Fee Item, Examination |
| **InverBrass Retail** | Retail Administration | Products, Inventory, Sales, Customers, Promotions | Physical Product, Service, Bundle |

Same engines underneath. Different experience above the Industry Edition boundary.

### v1.0 Platform Engine Baseline

> **Canonical engine catalog:** [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3.

> **v1.0 note:** ENG-003 sub-engines (003a–n) use flat extension IDs under one family. **AV-1.5 lock:** next ID is ENG-003o; no regrouping until AV-2.0. See [01b – Architecture Versions](./01b-Architecture-Versions.md) — AV-1.5 Engine Catalog Lock and Future Architecture Considerations.

| Engine ID | Platform Engine | Purpose | What it Handles |
|-----------|-----------------|---------|-----------------|
| **ENG-001** | Authentication Engine | Establishes user identity and secure access to the platform. | Login, logout, password management, PIN, MFA, SSO, session management, password reset, account lockout, identity providers (Google, Microsoft, Azure AD), token issuance. |
| **ENG-002** | Authorization Engine | Controls what authenticated users can access and perform. | Roles, permissions, RBAC, ABAC (future), business access, module access, feature access, data visibility, delegated access, segregation of duties. |
| **ENG-003a** | Configuration Engine | Central metadata engine that makes the platform configurable instead of hardcoded. | System parameters, dropdowns, feature toggles, metadata, dynamic forms, numbering rules, statuses, configurable workflows, validation parameters, business settings, Industry Profiles, visible menus, navigation layouts. |
| **ENG-003b** | Localization & Regulatory Engine | Enables country-specific behaviour without changing application code. | Countries, languages, currencies, taxes, date/time formats, address formats, identity document definitions, regulatory rules, invoicing rules, fiscal requirements, compliance configuration. |
| **ENG-003c** | Organization Structure Engine | Manages internal organizational hierarchy for Organization Parties. | Branches, departments, divisions, regions, campuses, organizational units, reporting hierarchy, head office designation, internal ownership structures. |
| **ENG-003d** | Event Ingestion Engine | Receives and standardizes events entering the platform. | Business events, webhooks, queues, event validation, event routing, event normalization, asynchronous processing, event publishing. |
| **ENG-003e** | Enterprise Integration Engine | Provides a single integration layer between the platform and all external systems. | REST APIs, SOAP, GraphQL, OAuth, API keys, webhooks, polling, retries, circuit breakers, provider routing, banking APIs, payment gateways, government APIs, CRM integrations, AI providers, connector health monitoring. |
| **ENG-003f** | Product Intelligence Engine | Analyses offerings and portfolio performance using analytics and AI. | Offering analytics, performance KPIs, adoption metrics, portfolio health scoring, decline detection, AI recommendations, retirement recommendations, customer feedback analysis, GTM insights — consumes roadmap and release data from ENG-003m. |
| **ENG-003g** | Business Presence Engine | Defines where an organization legally and operationally exists. | Countries of operation, legal entities, operating jurisdictions, registrations, branches by country, licensing jurisdictions, market presence. |
| **ENG-003h** | Platform Performance & Scalability Engine | Ensures enterprise-grade reliability and scalability. | Caching, queues, observability, monitoring, telemetry, performance metrics, distributed tracing, load management, rate limiting, resilience, health monitoring. |
| **ENG-003i** | Consent Engine | Captures and manages customer consent as immutable business events. | Marketing consent, communication consent, regulatory consent, consent events, consent evidence, consent history, consent withdrawals, consent channels, compliance tracking. |
| **ENG-003j** | Identity & Regulatory Identification Engine | Captures and manages official regulatory identifiers independent of uploaded documents. | National IDs, passports, tax numbers, business registration numbers, VAT numbers, licences, issuing authorities, verification status, identifier lifecycle, linkage to supporting evidence. |
| **ENG-003k** | Industry Experience Engine | Presents an industry-native user experience on top of shared platform engines. | Industry Editions, navigation generation, menu visibility, terminology mapping, dashboard layouts, feature visibility, configuration visibility, product templates, workflow templates, report templates, landing pages, optional branding/themes. |
| **ENG-003l** | Checklist & Completion Engine | Provides metadata-driven operational checklists that guide users through business processes, enforce mandatory steps, calculate completion, and prevent progression when required items are incomplete. | Checklist definitions, checklist instances, mandatory and optional items, sequence, blocking and warning rules, auto-complete rules, completion expressions, progress calculation, submission gates, manual completion, event-driven item completion. |
| **ENG-003m** | Portfolio & Roadmap Engine | Provides structured planning and controlled evolution of portfolio subjects across the platform. | Roadmap items, releases, milestones, implementation progress, release history, retirement plans, timeline views — offerings, services, programmes, projects, regulatory initiatives, strategic initiatives. |
| **ENG-003n** | Work Assignment & SLA Engine | Tracks ownership, assignment history, and time-based SLA across platform work items. | Assignment tracking, immutable assignment history, per-assignee SLA segments, cumulative lifecycle SLA, active/waiting/paused time, breach detection, queue metrics, SLA policy configuration by entity type. |
| **ENG-004** | Rules Engine | Executes deterministic business rules. | Eligibility rules, validations, calculations, decision tables, configurable rule execution, business policies, rule versioning. |
| **ENG-005** | Workflow Engine | Orchestrates business processes requiring approvals or multiple steps. | Maker-checker, approvals, escalations, routing, SLA monitoring, workflow history, task assignment, decision points. |
| **ENG-006** | Payment Engine | Processes all incoming and outgoing financial transactions. | Cash, mobile money, bank transfers, cards, split payments, partial payments, refunds, credits, payment gateways. |
| **ENG-007** | Receipting Engine | Produces legally compliant financial documents. | Receipts, invoices, quotations, credit notes, debit notes, numbering, fiscal compliance, digital delivery. |
| **ENG-008** | Reconciliation Engine | Matches financial movements across systems. | Bank reconciliation, payment reconciliation, settlement matching, cash balancing, exception management, reconciliation reports. |
| **ENG-009** | Notification Engine | Delivers communications across multiple channels. | SMS, email, WhatsApp, push notifications, in-app notifications, reminders, templates, scheduling, delivery tracking. |
| **ENG-011** | Reporting Engine | Produces operational and management information. | Operational reports, dashboards, exports, scheduled reports, management reports, compliance reports, BI data feeds. |
| **ENG-012** | Intelligence Engine | Provides platform-wide intelligent capabilities. | Machine Learning, GenAI, OCR, RAG, NLP, recommendations, predictive analytics, decision support, document intelligence, conversational AI. |
| **ENG-013** | Audit Engine | Maintains immutable records of system changes. | CRUD audit, field-level audit, user activity, change history, correlation IDs, compliance audit, forensic investigation. |
| **ENG-014** | Offline Sync Engine | Enables offline-first operation for unreliable connectivity. | Local storage, synchronization, conflict resolution, retry mechanisms, synchronization queues, offline validation. |
| **ENG-015** | Document Engine | Manages all documents and digital evidence across the platform. | Uploads, storage, preview, OCR readiness, versioning, digital signatures, classification, compliance evidence, verification, document lifecycle, retention, archival, AI extraction. |
| **ENG-016** | Search Engine | Provides unified enterprise search across all modules. | Global search, indexing, filters, relevance ranking, autocomplete, faceted search, cross-module search, saved searches. |

#### Phase 2 Engines (Introduce Only When Needed)

| Engine ID | Platform Engine | Purpose | What it Handles |
|-----------|-----------------|---------|-----------------|
| **ENG-017** | Identity Resolution Engine | Maintains a single trusted identity across duplicate records. | Deduplication, matching, golden record management, survivorship rules, CIF resolution, merge/split operations, similarity scoring. |
| **ENG-018** | Scheduling & Calendar Engine | Central scheduling capability shared by multiple domains. | Appointments, bookings, reservations, recurring schedules, availability, reminders, calendars, resource allocation. |
| **ENG-019** | Analytics & Insights Engine | Generates analytical and predictive insights beyond operational reporting. | KPI analytics, trend analysis, forecasting, benchmarking, anomaly detection, performance scoring, executive insights. |

> **Note:** The retired Localization & Regulatory duplicate **ENG-017** was merged into **ENG-003b** (see [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3.1). The Phase 2 **ENG-017 Identity Resolution Engine** above is a distinct future capability — not a reinstatement of the retired ID.

### ENG-003b – Localization & Regulatory Engine

> **Merge note:** The retired Localization duplicate **ENG-017** was merged into ENG-003b (see [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3.1). Phase 2 **ENG-017 Identity Resolution Engine** is a distinct future capability. Use **ENG-003b** for all localization and regulatory configuration references.

**Purpose**

Provides centralized country-, region-, and jurisdiction-specific localization, regulatory compliance, and feature policy management through configuration rather than application code, enabling the InverBrass Platform to operate consistently across multiple countries from a single codebase.

**Core Responsibilities**

1. **Geographic Configuration** — Countries; states / counties / provinces; cities / towns; regions; postal codes; GPS standards; time zones.

2. **Localization** — Languages; date, time, number, currency, address, and name formats.

3. **Financial & Tax Configuration** — Base and additional currencies; exchange rate sources; tax regimes (VAT / GST / sales tax); withholding tax; tax calculation rules; financial year definitions; **tax policies**; **invoice policies**; **receipt numbering** rules.

4. **Regulatory Compliance** — Business registration requirements; identity document types; industry licensing; receipt and invoice regulations; fiscal device integrations; government reporting; country-specific validation rules; required identity and organization documents by country; verification rules; public holidays; compliance requirements.

5. **Government & External Integrations** — Revenue authorities and tax platforms; company registries; national identity services; regulatory APIs.

   | Integration | Jurisdiction |
   |-------------|--------------|
   | Kenya eTIMS | Kenya |
   | KRA PIN validation | Kenya |
   | Uganda URA | Uganda |
   | Tanzania TRA | Tanzania |
   | Zambia ZRA | Zambia |
   | Future government APIs | As configured |

6. **Feature Policies** — Enable or disable features based on country, region, industry, business type, subscription plan, or individual business.

   Example policy matrix:

   | Feature | Kenya | Uganda | Tanzania |
   |---------|-------|--------|----------|
   | eTIMS | ✅ | ❌ | ❌ |
   | Multi Currency | ✅ | ✅ | ✅ |
   | Embedded Finance | ✅ | ✅ | ❌ |

   Additional policy-controlled features: embedded insurance, AI services, payroll, fiscal receipts, inventory, loyalty.

7. **Calendars** — Public holidays; working days; weekend definitions; financial and tax periods.

8. **Country Profiles** — Reusable profiles defining how a business operates within a particular jurisdiction.

9. **Consent Source Catalogue** — Country-configurable `consent_source` reference data (consumed by ENG-003i Consent Engine).

**Design Principles**

- One platform, one codebase.
- No country-specific application forks.
- Regulatory behaviour is configuration-driven.
- Country rules are reusable across all Build Packs.
- New countries should primarily require configuration rather than development.

**Localization First Principle:** All country-, region-, and jurisdiction-specific behaviour shall be implemented through **ENG-003b** wherever possible. New country support should primarily require configuration and integration, not changes to core business logic.

This single principle will stop future developers (or AI assistants) from introducing code like `if country == "KE"` throughout the application. Instead, they'll naturally look to the engine for policies and configuration, keeping the platform scalable as you expand into new markets.

### ENG-003c – Organization Structure Engine

**Purpose**

Provides a reusable internal hierarchy for Organization Parties — head offices, departments, regional offices, branches, campuses, warehouses, and other unit types — without creating duplicate Party records. Organizational Units remain internal to a single Organization; subsidiaries continue to be modeled as separate Organization Parties linked through Party Relationships (IP-006).

**Canonical entity:** `organizational_unit` (owned by Organization Party via `organization_party_id`).

**Core responsibilities**

1. Hierarchical organizational structure (parent/child units within one Organization)
2. Configurable unit types via Configuration Engine (`organizational_unit_type`)
3. Head Office designation (exactly one active Head Office per Organization)
4. Unit lifecycle (active, inactive, soft delete)
5. Location (address via EDS-009, optional country and GPS coordinates)
6. Contact (phone via EDS-003, email)

**Future Build Packs** shall reference `organizational_unit_id` for employees, inventory, sales, receipts, assets, projects, appointments, and related capabilities.

**Implementation location:** `03-platform/src/modules/party` — Organization Structure tab in Party Workspace.

### ENG-003i — Consent Engine (UX-001.2)

Captures regulatory consent as immutable events from platform channels. Updates Party Communication Preferences as the read model.

```
Channel → Consent Engine → party_consent_event + party_communication_preference
```

- **ENG-003b** owns `consent_source` reference data (country-configurable)
- **ENG-003d / ENG-003e** (future) ingest partner and channel events
- **Party Module** displays consent — never sets source on manual save
- Manual consent entry permitted only for **Branch**

**Implementation:** `03-platform/src/core/consent/services/consent-engine-service.ts`

### ENG-003j — Identity & Regulatory Identification Engine

Captures official regulatory identifiers belonging to a Party as **master data**. Uploaded documents remain **evidence only** (ENG-015a). Configuration of required identifier types, applicability, and validation rules is owned by **ENG-003b**.

```
ENG-003b (configuration) → ENG-003j (captured identifiers) → Party Module (consumer)
                                                      ↘ party_document (evidence link)
```

**Core responsibilities**

1. Resolve required identifiers from ENG-003b rule sets (country, party type, industry)
2. Store, update, and soft-delete captured identifier values
3. Validate uniqueness per business tenant and identifier type
4. Mask sensitive values; authorize full-value viewing via permission
5. Link uploaded document evidence without duplicating document metadata
6. Manual verification today; verification provider abstraction for future government/partner APIs
7. OCR comparison interface (no implementation in IP-013)
8. Emit timeline events and audit records on all mutations

**Canonical entity:** `party_identity_identifier`

**Implementation location:** `03-platform/src/core/identity-regulatory/`

### ENG-003k — Industry Experience Engine

**Purpose**

Provides the Industry Experience Layer that makes the shared platform feel like a dedicated product for each industry. Every business is onboarded into exactly one Industry Edition. The edition determines what users see, how it is labelled, and which capabilities are available — without forking the underlying engines or Build Packs.

**Core responsibilities**

1. **Industry Editions** — Banking, Property, Healthcare, Education, Agriculture, Hospitality, Retail, and future editions
2. **Navigation generation** — Edition-specific menus (e.g. Loans & Deposits for Banking; Patients & Appointments for Healthcare)
3. **Menu and feature visibility** — Hide capabilities irrelevant to the edition
4. **Terminology mapping** — Customer vs Patient vs Tenant vs Student; Product vs Service vs Procedure
5. **Dashboard layouts** — Edition-specific landing pages and KPI widgets
6. **Configuration visibility** — Edition-specific product types, attribute sets, and setup forms
7. **Product templates** — Predefined product type schemas per edition (Loan Product, Rental Unit, Medical Service, Course)
8. **Workflow templates** — Edition-specific approval flows (Loan Approval, Lease Approval, Patient Admission)
9. **Report templates** — Edition-specific operational and compliance reports
10. **Landing pages and branding** — Optional edition-specific themes and welcome experiences

**Relationship to other engines**

- **ENG-003a Configuration Engine** stores Industry Profiles, visible menus, feature toggles, and navigation layouts as metadata
- **ENG-003b Localization & Regulatory Engine** applies country rules within the edition context
- **ENG-002 Authorization Engine** enforces edition-scoped module access
- Build Packs (Party, Product, Workflow, etc.) remain shared — the Industry Experience Engine decides exposure and presentation

**Onboarding integration**

Business registration selects an **Industry Edition** (not a generic business type). That selection binds the business to its Industry Experience Profile for the lifetime of the tenant.

**Implementation location:** `03-platform/src/core/industry-experience/` (planned)

### ENG-003l — Checklist & Completion Engine

**Purpose**

Provides configurable, metadata-driven operational checklists that guide users through business processes, enforce mandatory steps, calculate completion, and prevent progression when required items are incomplete. This is a **cross-cutting platform capability** — not a document-only feature. Every Build Pack and Industry Edition consumes it rather than implementing module-specific task lists.

**Core responsibilities**

1. **Checklist definitions** — Business administrators configure checklist templates by module, entity type, country, industry, and sequence
2. **Checklist instances** — Bind a definition to a business object (Party, Product, Loan Application, Property, etc.) and track live completion state
3. **Mandatory and optional items** — Each item may be required or advisory; blocking rules determine whether incomplete mandatory items prevent submission
4. **Auto-complete** — Items complete automatically when underlying platform events occur (document uploaded, identifier captured, pricing saved, approval granted)
5. **Manual completion** — Items that require human attestation (e.g. physical site inspection) remain manually ticked by authorized users
6. **Completion rules** — Expression-based rules evaluate whether an item is complete (consumed from ENG-004 Rules Engine where appropriate)
7. **Progress calculation** — Compute completed count, percentage, and missing mandatory items for any bound instance
8. **Submission gates** — Block workflow progression or return structured blocking reasons when mandatory completion is below 100%
9. **Advisory warnings** — Allow submission with warnings when optional items remain incomplete
10. **Event emission** — Publish checklist item completion and instance readiness events for Workflow, Notification, and Audit consumers

**Configuration dimensions (business-admin configurable)**

| Field | Example |
|-------|---------|
| Checklist Name | Loan Product Creation |
| Applicable Module | Product |
| Applicable Type | Loan Product |
| Country | Kenya |
| Industry | Banking |
| Sequence | 1, 2, 3… |
| Mandatory | Yes / No |
| Blocking | Yes / No |
| Auto-complete | Yes / No |
| Completion Rule | Expression (e.g. document uploaded, field populated, approval granted) |

**Where it is used (examples)**

| Module / Process | Checklist Example |
|------------------|-------------------|
| Party Onboarding | Identity captured, Address, KRA PIN, Documents uploaded |
| Loan Origination | Payslips, CRB, ID, Guarantor, Income verified |
| Account Opening | KYC, FATCA, Signature, Consent |
| Product Creation | Pricing, Documents, Attributes, Approval |
| Insurance | Medical Report, Proposal Form, Beneficiary |
| Healthcare | Patient registered, Insurance validated, Consent |
| School Admission | Birth Certificate, KCPE Result, Parent Details |
| Property Onboarding | Ownership Documents, Inspection, Photos |
| Procurement | Quotations, Approval, Budget |
| HR Recruitment | CV, Interview, Offer Letter |
| Business Setup (BP-001) | Business Profile, Industry Edition, Payments, Tax, Activation |

**Relationship to other engines**

```
ENG-003b (country/industry rules)
        ↓
ENG-003a (checklist definition metadata)
        ↓
ENG-003l (instance + completion state)
        ↓
Build Pack modules (Party, Product, Workflow, etc.)
        ↓
ENG-005 Workflow Engine → Approval
ENG-015 Document Engine → auto-complete document items
ENG-015a Document & Compliance → required vs provided matrix
ENG-003j Identity & Regulatory → auto-complete identifier items
ENG-012 Intelligence Engine → future recommendations ("customers often forget KRA PIN")
```

**Explicit non-ownership**

- **ENG-015 Document Engine** stores and manages documents — it does not own checklist logic
- **ENG-015a Document & Compliance** evaluates document requirement matching — checklist items may *consume* compliance state but compliance scoring remains in ENG-015a
- **ENG-005 Workflow Engine** orchestrates approvals and routing — checklists gate progression; they do not replace workflow
- Build Packs display checklist UI and call ENG-003l services — they do not embed checklist business rules

**Canonical entities (planned)**

| Entity | Purpose |
|--------|---------|
| `checklist_definition` | Template: name, module, type, country, industry, version |
| `checklist_item_definition` | Item within template: label, sequence, mandatory, blocking, auto-complete rule |
| `checklist_instance` | Live checklist bound to a business object |
| `checklist_item_completion` | Per-item state: complete, incomplete, auto-completed, manually completed, blocked reason |

**Implementation location:** `03-platform/src/core/checklist-completion/` (planned)

**UX integration:** `PlatformCompletionMeter` and `PlatformCompletionCard` (UX-001.1) render checklist progress; data sourced from ENG-003l services rather than ad-hoc module calculations.

### ENG-003m — Portfolio & Roadmap Engine

**Purpose**

Provides structured planning and controlled evolution of portfolio subjects across the platform. Answers: *What improvements are planned? What is being released? What has changed? When will changes go live? Which customers are affected?*

This is a **cross-cutting platform capability** — not a Product Catalogue module. Roadmap and release management applies equally to offerings, customer onboarding journeys, loan products, hospital services, school programmes, property listings, NGO programmes, and business processes. Build Packs **consume** ENG-003m; they do not implement module-local roadmap tables.

> **Architecture note (AV-1.5):** BP-003 IP-014 (Offering Roadmap & Release Management) is **retired as a Build Pack IP**. Its requirements are absorbed into ENG-003m. BP-003 delivery **freezes after IP-013 (Offering Governance)** for the operational catalogue scope.

**Core responsibilities**

1. **Roadmap items** — Create and manage initiatives linked to a portfolio subject (offering, programme, service, project)
2. **Releases** — Group roadmap items into planned releases (e.g. Release 2027-Q1)
3. **Milestones** — Track progress through standard phases (Idea → Business Approval → Analysis → Development → Testing → Training → Pilot → Production → Retirement)
4. **Implementation progress** — Track status and completion of roadmap items within a release
5. **Release history** — Immutable record of completed releases and what changed
6. **Retirement plans** — Plan controlled end-of-life; retirement cannot occur before active release
7. **Timeline views** — Display current roadmap, upcoming releases, and milestone progress
8. **Search** — Find roadmap items by release, milestone, status, owner, or subject
9. **Event emission** — Publish roadmap item created, release planned, release completed, retirement planned events

**Roadmap item types (examples)**

| Type | Example |
|------|---------|
| Enhancement | Add overdraft |
| Feature | Mobile repayments |
| Regulatory | CBK reporting update |
| Compliance | GDPR support |
| Pricing Change | New pricing model |
| Channel Expansion | WhatsApp onboarding |
| Integration | CRM integration |
| Retirement | End product |

**Release status (examples)**

Planned → Approved → In Progress → Ready → Released | Cancelled

**Business rules**

| Rule | Description |
|------|-------------|
| Subject binding | Roadmap items belong to one portfolio subject |
| Release grouping | Releases may contain multiple roadmap items |
| Immutability | Released items become read-only |
| History | Cancelled items remain historical |
| Retirement gate | Retirement cannot occur before active release |

**Where it is used (examples)**

| Consumer | Roadmap Example |
|----------|-----------------|
| BP-003 Product Catalogue | Offering enhancements, pricing changes, channel expansion |
| BP-002 Party | Customer onboarding journey improvements |
| BP-013 Product Management | Strategic product initiatives, MVPs, GTM releases |
| Banking Edition | Loan product releases, regulatory updates |
| Healthcare Edition | Service line expansions, procedure updates |
| Education Edition | Programme and curriculum releases |
| NGO Edition | Field programme rollouts |

**Relationship to other engines**

```
ENG-003a (configuration) → ENG-003m (roadmap + releases)
        ↓
Build Pack modules (Product, Party, Programme, etc.) — display Roadmap tab
        ↓
ENG-005 Workflow Engine → release approvals
ENG-011 Reporting Engine → portfolio planning reports
ENG-012 Intelligence Engine → prioritization recommendations
ENG-003f Product Intelligence → analytics on roadmap outcomes (consumes ENG-003m data)
ENG-013 Audit Engine → release and milestone change history
```

**Explicit non-ownership**

- **ENG-003f Product Intelligence** analyses performance and recommends actions — it consumes roadmap/release data; it does not own planning entities
- **BP-003 Product module** owns offering master data — roadmap UI binds to offerings via ENG-003m subject references
- **ENG-005 Workflow Engine** orchestrates release approvals — roadmap defines *what*; workflow defines *how* approval proceeds

**Canonical entities (planned)**

| Entity | Purpose |
|--------|---------|
| `portfolio_release` | A named release (e.g. 2027-Q1) with status and target date |
| `portfolio_roadmap_item` | An initiative linked to subject type, subject id, and optional release |
| `portfolio_release_history` | Immutable history of release completions and changes |
| `portfolio_milestone` | Milestone progress within a roadmap item or release |

**Implementation location:** `03-platform/src/core/portfolio-roadmap/` (planned)

**BP-003 consumption pattern:** Product Workspace **Roadmap** tab renders ENG-003m data for `subject_type = offering`. No `offering_release` or `offering_roadmap_item` tables in the Product module.

### ENG-003n — Work Assignment & SLA Engine

**Purpose**

Provides cross-cutting ownership tracking, assignment history, and time-based SLA measurement for any work item across the platform. Answers: *Who owns this work? How long has each owner held it? What is the total elapsed and processing time? Has SLA been breached?*

This is a **cross-cutting platform capability** — not a CRM, sales, or service module concern. Build Packs **consume** ENG-003n through a shared consumption contract; they do not implement module-local assignment or SLA tables.

> **Architecture note (AV-1.6):** BP-008 CRM documentation (Build Pack 004 folder) defines the ENG-003n consumption contract and **Customer 360 hub** in **IP-01 CRM Foundation & Customer 360**. ENG-004 remains the **Rules Engine** (scoring, routing rules); ENG-005 orchestrates approvals and escalations — it complements but does not replace ENG-003n segment tracking.

**Core responsibilities**

1. **Assignment tracking** — Record every assignment of a work item to a user, team, branch, business unit, or queue
2. **Assignment history** — Maintain immutable history: previous owner, new owner, assigned by, date/time, reason, assignment type (manual / automatic / escalation / queue pull)
3. **Per-assignee SLA segments** — Measure time with each assignee; close segment on reassignment; open new segment for new owner
4. **Cumulative lifecycle SLA** — Roll up total processing time, total elapsed time, active working time, waiting time, paused time, and breached duration across all segments
5. **SLA policies** — Configurable policies by entity type (lead, opportunity, case, visit report, quotation, etc.)
6. **Pause and resume** — Support configured pause reasons (awaiting customer, legal hold) without inflating active working time
7. **Breach detection** — Flag when segment or cumulative SLA exceeds policy thresholds
8. **Queue metrics** — Expose current owner elapsed time, sum of prior owners' elapsed time, total lifecycle duration, SLA remaining, and breach flags for analytics
9. **Event emission** — Publish assignment created, reassigned, SLA breached, and segment closed events

**Business rules**

| Rule | Description |
|------|-------------|
| Append-only history | Assignment and SLA segments are never overwritten; corrections via addendum audit entries only |
| Segment closure | SLA timer for current assignee stops on ownership change; prior segment end time is recorded |
| Segment opening | New SLA segment starts for new assignee on assignment |
| Cumulative total | Total SLA equals cumulative processing duration across all assignee segments (excluding configured pause periods) |
| Single owner | Work item has one current owner at a time; queue membership is tracked separately |
| Policy binding | SLA policies bind to entity type and optional priority or classification |

**Where it is used (examples)**

| Consumer | Assignment / SLA Example |
|----------|--------------------------|
| BP-008 CRM (IP-01 contract) | Lead, opportunity, case, visit report ownership and TAT |
| BP-005 Sales & Service Delivery | Work order and fulfilment assignment (future) |
| BP-011 Workflow & Process Automation | Task routing metrics complementing ENG-005 |
| Loan origination (Banking Edition) | Application handler segments and cumulative approval SLA |
| Property maintenance | Ticket assignment and resolution TAT |

**Relationship to other engines**

```
ENG-003a (configuration) → ENG-003n (SLA policies, entity types)
        ↓
Build Pack modules (CRM, Sales, Service, etc.) — call assignment/SLA services on owner change
        ↓
ENG-004 Rules Engine → optional routing/scoring rules for auto-assignment
ENG-005 Workflow Engine → approvals, escalations on breach (complements ENG-003n)
ENG-009 Notification Engine → owner change and breach alerts
ENG-011 Reporting Engine → queue and TAT analytics
ENG-013 Audit Engine → assignment history immutability
```

**Explicit non-ownership**

- **ENG-004 Rules Engine** executes deterministic routing and scoring rules — it does not own assignment history or SLA segments
- **ENG-005 Workflow Engine** orchestrates approval steps and escalation workflows — it consumes breach signals from ENG-003n
- **Build Pack modules** own entity-specific SLA policy definitions and UI; ENG-003n owns segment storage and calculation

**Canonical entities (planned)**

| Entity | Purpose |
|--------|---------|
| `work_assignment` | Current owner binding for a work item (subject type + subject id) |
| `work_assignment_history` | Immutable assignment change records |
| `work_sla_segment` | Per-assignee SLA segment with start, end, durations, and breach state |
| `work_sla_policy` | Configurable SLA thresholds by entity type, priority, and business |

**Implementation location:** `03-platform/src/core/work-assignment-sla/` (planned)

**BP-008 consumption pattern:** CRM modules call ENG-003n on every ownership change per IP-01 contract. No `lead_assignment_history` or module-local SLA tables in CRM.


|                                         |                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ENG-003d Event Ingestion Engine**     | Receives, validates, normalizes, and routes business events from internal and external sources (e.g., Gmail, Outlook, WhatsApp, SMS, APIs, webhooks, payment platforms, IoT devices) into the Workflow Engine and other platform services.                                                                                                                         |
| **ENG-003e Enterprise Integration Engine** | Provides a centralized integration layer between the platform and all external systems. Manages connectors, OAuth, API keys, webhooks, polling, rate limiting, retries, circuit breakers, connector health monitoring, configuration, and lifecycle management. Connectors (e.g., Gmail, Outlook, Banks, Insurers, M-Pesa) publish standardized events to the Event Ingestion Engine. |




### Architecture Flow

```

```

```
External Systems
(Gmail, Outlook, WhatsApp, APIs, Banks, M-Pesa, IoT)
                │
                ▼
ENG-003e Enterprise Integration Engine
                │
                ▼
ENG-003d Event Ingestion Engine
                │
                ▼
Workflow Engine
                │
                ▼
Industry Experience Layer (ENG-003k)
                │
                ▼
Platform Services & Industry Editions
```


| Engine                                   | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ENG-003f Product Intelligence Engine** | Analyses offering and portfolio performance using analytics and AI. Consumes roadmap and release data from ENG-003m. Answers: which offerings are declining, which need reinvestment, which features drive adoption, which releases affected satisfaction, which roadmap items to prioritize. Integrates with Workflow, Reporting, and Intelligence engines. Does not own roadmap or release planning entities. |





|                                       |
| ------------------------------------- |
| **ENG-003g Business Presence Engine** |



|                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maintains the countries and legal jurisdictions in which a business operates, including operational status, effective dates, legal entities, tax registrations, licenses, banking relationships, and links to the applicable Localization & Regulatory configuration. |


### **ENG-003h – Platform Performance & Scalability Engine**

Responsibilities:

- Caching
- Connection pooling
- Rate limiting
- Background job processing
- Queue management
- Performance monitoring
- Auto scaling
- Health monitoring
- Circuit breakers
- Distributed locking
- Observability (metrics, logs, tracing)

This isn't a business engine—it's a platform capability that ensures every Build Pack performs well under load.

---

| Principle | Description |
|-----------|-------------|
| **Cross-Platform First** | InverBrass shall be delivered as a mobile-first Progressive Web Application (PWA) providing a consistent user experience across Android, iOS, and modern desktop browsers from a single codebase. |

EDS-003 – All telephone numbers shall be stored in canonical E.164 format. User input may be entered in local or international formats, but the platform shall normalize before validation, duplicate detection, integration, and persistence.

# What we have designed that supports this vision

The platform already has the core building blocks. The Industry Experience Layer (ENG-003k) adds a presentation boundary — it does not replace anything already built.

### Enterprise Engines

✔ Configuration Engine (extended to store Industry Profiles)

✔ Localization & Regulatory Engine

✔ Organization Structure Engine

✔ Industry Experience Engine (ENG-003k — planned)

✔ Checklist & Completion Engine (ENG-003l — planned)

✔ Portfolio & Roadmap Engine (ENG-003m — planned)

✔ Work Assignment & SLA Engine (ENG-003n — planned)

✔ Event Ingestion Engine (planned)

✔ Enterprise Integration Engine (planned)

✔ Workflow Engine

✔ Intelligence Engine (ENG-012)

✔ Notification Engine

✔ Reporting Engine

These are exactly the kinds of engines a digital platform needs.

### Implications for work already completed

| Completed capability | Status | Industry Edition impact |
|---------------------|--------|-------------------------|
| Party Workspace | ✔ Reusable | Terminology filtered by edition (Customer / Patient / Tenant / Student) |
| Product Workspace | ✔ Reusable | Product types shown come from edition profile |
| Timeline | ✔ Reusable | No change — events remain cross-cutting |
| Audit | ✔ Reusable | No change |
| Documents & Compliance | ✔ Reusable | Requirement sets may vary by edition |
| Consent | ✔ Reusable | No change |
| Search | ✔ Reusable | Results scoped to edition-visible modules |
| Authentication & Onboarding | ✔ Reusable | Registration selects Industry Edition instead of generic business type |
| Global Navigation | ✔ Reusable | Menus generated from Industry Profile |
| Organization Structure | ✔ Reusable | No change |

Nothing is wasted. The Industry Experience Layer decides whether capabilities are exposed and how they are presented.

---

### Core Data Foundations

✔ Party Management

✔ Organization Structure

✔ Document & Compliance (Core Platform — BP-002 Party is first consumer)

✔ Documents

✔ Products

✔ Users

✔ Workflow

✔ Payments

✔ Reporting

These become the "digital memory" of the business.

Technology Baseline (Version 1.0)
This is the official approved technology stack

1. Next.js
2. TypeScript
3. Supabase
4. Drizzle
5. Tailwind
6. shadcn/ui
7. PWA
8. GitHub
9. GitHubActions
10. Cursor
11. Playwright
12. Vitest
13. Pino
14. Zod

Approved Technology Decisions
ADR	Decision	Status
ADR-001	Modular Monolith Architecture	Approved
ADR-002	Next.js 15 as Application Framework	Approved
ADR-003	PostgreSQL (Supabase) as Database	Approved
ADR-004	Drizzle ORM	Approved
ADR-005	PWA instead of Native Mobile	Approved
ADR-006	GitHub as Source Control	Approved
ADR-007	Cursor AI as Primary Development Tool	Approved
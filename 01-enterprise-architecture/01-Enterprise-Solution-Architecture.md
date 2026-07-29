🏛️ InverBrass Platform: Final Blueprint (v1.0 Architecture & Documentation)
This is the frozen, enterprise-ready InverBrass v1.0 Architecture Blueprint. It maximizes your velocity as a solo developer by prioritizing extreme modular uniformity and configuration over one-off custom code. [1] 
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

### Layer 1 – Core Platform Services (ENG-001 – ENG-016)

> **Canonical engine catalog:** [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3.

| Engine ID | Core Engine | Purpose |
|-----------|-------------|---------|
| **ENG-001** | Authentication Engine | Identity, login, PIN, MFA |
| **ENG-002** | Authorization Engine | Roles and permissions |
| **ENG-003a** | Configuration Engine | Stores configurable behaviour |
| **ENG-003b** | Localization & Regulatory Engine | Country-, region-, and jurisdiction-specific configuration and regulatory behaviour |
| **ENG-003c** | Organization Structure Engine | Internal organizational units (departments, branches, campuses) owned by Organization Parties; future Build Packs reference `organizational_unit_id` |
| **ENG-003d** | Event Ingestion Engine | Receives, validates, normalizes, and routes business events |
| **ENG-003e** | Partner Integration Engine | External platform connectors, OAuth, webhooks, rate limiting |
| **ENG-003f** | Product Intelligence Engine | Product governance, roadmap, analytics, AI-assisted insights |
| **ENG-003g** | Business Presence Engine | Countries and legal jurisdictions in which a business operates |
| **ENG-003h** | Platform Performance & Scalability Engine | Caching, queues, observability, circuit breakers |
| **ENG-003i** | Consent Engine | Event-driven regulatory consent capture |
| **ENG-003j** | Identity & Regulatory Identification Engine | Captures, validates, and verifies official regulatory identifiers (master data) |
| **ENG-004** | Rules Engine | Executes deterministic business rules |
| **ENG-005** | Workflow Engine | Maker-checker, approvals |
| **ENG-006** | Payment Engine | Cash, M-Pesa, cards, credit, split payments |
| **ENG-007** | Receipting Engine | Receipts, invoices, credit notes |
| **ENG-008** | Reconciliation Engine | Cash balancing and payment reconciliation |
| **ENG-009** | Notification Engine | SMS, email, WhatsApp, push |
| **ENG-010** | Integration Engine | APIs, Daraja, banks, eTIMS |
| **ENG-011** | Reporting Engine | Operational and management reports |
| **ENG-012** | AI Engine | Rules → ML → GenAI |
| **ENG-013** | Audit Engine | Immutable audit trail |
| **ENG-014** | Offline Sync Engine | Offline-first synchronization |
| **ENG-015** | Document Engine | PDF, attachments, contracts |
| **ENG-015a** | Document & Compliance Engine | Evidence storage, requirement matching, verification, compliance scoring |
| **ENG-016** | Search Engine | Global search |

### ENG-003b – Localization & Regulatory Engine

> **Merge note:** ENG-017 was merged into ENG-003b (see [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3.1). Use **ENG-003b** in all new references.

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


|                                         |                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ENG-003d Event Ingestion Engine**     | Receives, validates, normalizes, and routes business events from internal and external sources (e.g., Gmail, Outlook, WhatsApp, SMS, APIs, webhooks, payment platforms, IoT devices) into the Workflow Engine and other platform services.                                                                                                                         |
| **ENG-003e Partner Integration Engine** | Provides a centralized framework for integrating with external platforms and partners. Manages connectors, OAuth, API keys, webhooks, polling, rate limiting, retries, connector health monitoring, configuration, and lifecycle management. Connectors (e.g., Gmail, Outlook, Banks, Insurers, M-Pesa) publish standardized events to the Event Ingestion Engine. |




### Architecture Flow

```

```

```
External Systems
(Gmail, Outlook, WhatsApp, APIs, Banks, M-Pesa, IoT)
                │
                ▼
ENG-003e Partner Integration Engine
                │
                ▼
ENG-003d Event Ingestion Engine
                │
                ▼
Workflow Engine
                │
                ▼
Platform Services & Industry Solutions
```


| Engine                                   | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ENG-003f Product Intelligence Engine** | Provides product governance, roadmap management, product analytics, feature prioritization, AI-assisted product insights, and lifecycle management. Integrates with Workflow, Reporting, AI, Document Management, and Collaboration services to support end-to-end product management.(ideation to retirement). Capability to analyse the products through it's live, and propose when it is declining and how to manage(Re-invent, retire etc)-AI will shine here.Product │ ├── Vision ├── Objectives ├── Business Case ├── Personas ├── Roadmap ├── Releases │ ├── BP-001 │ ├── BP-002 │ └── BP-003 ├── KPIs ├── Go-to-Market ├── Customer Feedback ├── Product Analytics ├── AI Product Insights ├── Recommendations └── Lifecycle Decisions |





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

The platform already has the core building blocks.

### Enterprise Engines

✔ Configuration Engine

✔ Localization & Regulatory Engine

✔ Organization Structure Engine

✔ Event Ingestion Engine (planned)

✔ Partner Integration Engine (planned)

✔ Workflow Engine

✔ AI Services

✔ Notification Engine

✔ Reporting Engine

✔ Integration Engine

These are exactly the kinds of engines a digital platform needs.

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
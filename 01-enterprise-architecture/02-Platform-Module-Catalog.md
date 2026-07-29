
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
3. Core Platform Engines (ENG-001 – ENG-016)

Every reusable processing capability is owned by exactly one Core Platform Engine. Build Packs and Industry Solutions **consume** engines — they do not reimplement them.

**Canonical specification:** [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md) §5 (Layer 1 – Core Platform Services).

### Layer 1 – Foundation Engines

| Engine ID | Core Engine | Purpose | Status |
|-----------|-------------|---------|--------|
| **ENG-001** | Authentication Engine | Identity, login, PIN, MFA | Implemented (BP-001) |
| **ENG-002** | Authorization Engine | Roles and permissions | Implemented |
| **ENG-003a** | Configuration Engine | Stores configurable platform behaviour | Partial |
| **ENG-003b** | Localization & Regulatory Engine | Country-, region-, and jurisdiction-specific configuration and regulatory behaviour | Partial (BP-002) |
| **ENG-003c** | Organization Structure Engine | Internal organizational units (departments, branches, campuses) owned by Organization Parties | Implemented (BP-002) |
| **ENG-003d** | Event Ingestion Engine | Receives, validates, normalizes, and routes business events from internal and external sources | Planned |
| **ENG-003e** | Partner Integration Engine | Connectors, OAuth, webhooks, rate limiting, connector health for external platforms | Planned |
| **ENG-003f** | Product Intelligence Engine | Product governance, roadmap, analytics, AI-assisted product insights | Planned |
| **ENG-003g** | Business Presence Engine | Countries and legal jurisdictions in which a business operates | Planned |
| **ENG-003h** | Platform Performance & Scalability Engine | Caching, queues, rate limiting, observability, circuit breakers | Planned |
| **ENG-003i** | Consent Engine | Event-driven regulatory consent capture; updates communication preferences read model | Implemented |

### Layer 2 – Business Processing Engines

| Engine ID | Core Engine | Purpose | Status |
|-----------|-------------|---------|--------|
| **ENG-004** | Rules Engine | Executes deterministic business rules | Planned |
| **ENG-005** | Workflow Engine | Maker-checker, approvals | Planned |
| **ENG-006** | Payment Engine | Cash, M-Pesa, cards, credit, split payments | Planned |
| **ENG-007** | Receipting Engine | Receipts, invoices, credit notes | Planned |
| **ENG-008** | Reconciliation Engine | Cash balancing and payment reconciliation | Planned |
| **ENG-009** | Notification Engine | SMS, email, WhatsApp, push | Planned |
| **ENG-010** | Integration Engine | APIs, Daraja, banks, eTIMS | Planned |
| **ENG-011** | Reporting Engine | Operational and management reports | Planned |
| **ENG-012** | AI Engine | Rules → ML → GenAI (Enterprise Intelligence) | Planned |
| **ENG-013** | Audit Engine | Immutable audit trail | Partial (emitter interface) |
| **ENG-014** | Offline Sync Engine | Offline-first synchronization | Planned |
| **ENG-015** | Document Engine | PDF generation, attachments, contracts | Planned |
| **ENG-015a** | Document & Compliance Engine | Evidence storage, requirement matching, verification, compliance scoring | Partial (BP-002) |
| **ENG-016** | Search Engine | Global search | Planned |

> **ENG-001 – ENG-016** are the active engine IDs. Retired or merged IDs are recorded in §3.1 below — not as separate catalog rows.

### 3.1 Engine Merge Registry

When two engine IDs describe the same capability, merge into **one canonical engine** and record the merge here. Legacy IDs remain searchable but must not appear as separate engines in new documentation.

| Retired ID | Canonical ID | Status | Merge Rationale | Content Absorbed |
|------------|--------------|--------|-----------------|------------------|
| **ENG-017** | **ENG-003b** | Approved 2026-07-29 | Duplicate Localization & Regulatory Engine numbering | Tax policies, invoice policies, receipt numbering, country integrations (eTIMS, KRA, URA, TRA, ZRA), feature policy matrix (Kenya/Uganda/Tanzania), feature toggle dimensions (country, industry, business type, subscription) |

**Rule:** Before recording a merge, compare both engine definitions side-by-side, port any missing responsibilities into the canonical engine, present the **single merged output** for user approval, then update this registry. See `.cursor/rules/eng-catalog-governance.mdc`.

> **Localization First Principle:** All country-, region-, and jurisdiction-specific behaviour shall be implemented through **ENG-003b** (not ENG-017, not inline `if country == "KE"` checks).

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

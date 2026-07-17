🏛️ InverBrass Platform: Final Blueprint (v1.0 Architecture & Documentation)
This is the frozen, enterprise-ready InverBrass v1.0 Architecture Blueprint. It maximizes your velocity as a solo developer by prioritizing extreme modular uniformity and configuration over one-off custom code. [1] 

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
________________________________________
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
________________________________________
📝 Final Production .cursorrules
Copy and paste this configuration file directly into .cursorrules in the root of your application repository.
# Configuration Directive
- **Core Principle**: "Every feature must be configurable before it is customizable." Drive business variations through `src/config/` definitions instead of modifying underlying engine code.
- **Framework Stack**: Next.js 15+ (App Router, React Server Components, TypeScript)
- **Styling UI Elements**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Data & Security**: 

Supabase PostgreSQL

 + Supabase Auth
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
________________________________________
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

##5 – Platform Layer Architecture
Layer 1 – Core Platform ServicesS
Engine ID	Core Engine	Purpose
ENG-001	Authentication Engine	Identity, Login, PIN, MFA
ENG-002	Authorization Engine	Roles & Permissions
ENG-003	Configuration Engine	Stores configurable behaviour
ENG-004	Rules Engine	Executes deterministic business rules
ENG-005	Workflow Engine	Maker-Checker, approvals
ENG-006	Payment Engine	Cash, M-Pesa, Cards, Credit, Split Payments
ENG-007	Receipting Engine	Receipts, Invoices, Credit Notes
ENG-008	Reconciliation Engine	Cash balancing & payment reconciliation
ENG-009	Notification Engine	SMS, Email, WhatsApp, Push
ENG-010	Integration Engine	APIs, Daraja, Banks, eTIMS
ENG-011	Reporting Engine	Operational & Management reports
ENG-012	AI Engine	Rules → ML → GenAI
ENG-013	Audit Engine	Immutable audit trail
ENG-014	Offline Sync Engine	Offline-first synchronization
ENG-015	Document Engine	PDF, Attachments, Contracts
ENG-016	Search Engine	Global search

| Principle |          Description                                                                  |
------------------------------------------------------------------------------------- |
| **Cross-Platform First** | InverBrass shall be delivered as a mobile-first Progressive Web Application (PWA) providing a consistent user experience across Android, iOS, and modern desktop browsers from a single codebase. |

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



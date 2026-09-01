# 01b – Architecture Versions

## Document Information

| Attribute | Value |
|-----------|-------|
| Document Name | Architecture Versions |
| Current Version | **AV-1.12** |
| Former Name | Architecture Decision Record (ADR) — enterprise scope |
| Scope | Entire InverBrass Enterprise Architecture |
| Audience | Product Owner, Solution Architect, Developers, AI Coding Assistants |

## Purpose

This document is the **single version registry** for enterprise architecture changes. It replaces the informal “Architecture Decision Record” concept at the enterprise level.

When architecture changes, record a new version here with:

1. **From → To** — what changed (explicit before/after)
2. **Reasoning** — why the change was made
3. **Affected documents** — which architecture files were updated
4. **Implementation impact** — code, schema, or build-pack scope affected (if any)

Build-pack–scoped decisions (e.g. ADR-009–021 in BP-001) remain in their deliverable documents. This registry covers **cross-cutting enterprise architecture** only.

---

## Governance Rules

| Rule | Description |
|------|-------------|
| **One registry** | All enterprise architecture version changes are recorded in this document — not scattered across build packs. |
| **From / To required** | Every version entry must state what existed before and what exists after. Vague summaries are not sufficient. |
| **Reasoning required** | Every version entry must explain why the change was made and what problem it solves. |
| **Increment on material change** | Bump the minor version (AV-1.x) when engine IDs, platform layers, ownership rules, foundation freeze status, or cross-document principles change. |
| **Major version** | Bump AV-2.0 only for breaking platform-wide restructuring (e.g. monolith → microservices, tenant model change, **engine family regrouping**). |
| **AV-1.5 engine catalog lock** | **Locked.** No renumbering. No regrouping. New platform capabilities continue as **ENG-003o**, **ENG-003p**, etc. until an **AV-2.0** review is deliberately initiated. See [AV-1.5 Engine Catalog Lock](#av-15-engine-catalog-lock). |
| **Engine merges** | Engine ID merges are recorded here **and** in [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3.1 Engine Merge Registry. |
| **Foundation freeze** | Foundation freeze declarations are recorded here **and** in [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3.2 Foundation Freeze Registry. |
| **Build-pack ADRs** | BP-specific ADRs (authentication, IAM, etc.) stay in build-pack deliverables; reference them from implementation notes when relevant. |

### When to add a version entry

Add a new AV entry when any of the following change:

- Platform engine baseline (ENG-001 – ENG-019, ENG-003a–m, ENG-015a)
- Platform design principles (AP-001 onward)
- Industry Edition model or ENG-003k Industry Experience Engine
- Foundation freeze scope or status
- Canonical document ownership or layering model
- Technology baseline (Document 01 § Technology Baseline)

Do **not** add an AV entry for routine build-pack IP completion unless it introduces a new cross-cutting architectural mechanism.

Do **not** regroup or renumber ENG-003 sub-engines under AV-1.x — **AV-1.5 Engine Catalog Lock** is in force. New IDs: ENG-003o, ENG-003p, …

---

## Version History

### AV-1.0 — Initial Enterprise Architecture Baseline

| Field | Value |
|-------|-------|
| **Date** | 2026 (initial approval) |
| **Status** | Superseded by AV-1.1 |
| **Author** | Product Owner / Solution Architect |

#### From → To

| Area | From | To |
|------|------|-----|
| Platform layers | Informal module list | Six-layer model: Presentation, Application, Core Platform Services, Domain Modules, Data, Infrastructure |
| Engine catalog | Mixed numbering; some engines undocumented | ENG-001 – ENG-016 as core engines; informal extension IDs |
| Industry model | “Vertical Solutions” (VS-001 onward) | VS-001 onward retained as Edition IDs; terminology informal |
| Build packs | BP-001 – BP-013 roadmap | Same scope; consumed by vertical solutions |
| Technology stack | Next.js, Supabase, Drizzle, Tailwind, shadcn/ui | Frozen as Technology Baseline v1.0 in Document 01 |

#### Reasoning

Establish a frozen, enterprise-ready v1.0 blueprint that maximizes velocity for a solo developer through modular uniformity and configuration over custom code. Every capability must have one and only one owner (PP-001).

#### Affected Documents

- [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md)
- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md)
- [13 – Platform Blueprint](./13-platform-blueprint.md)

---

### AV-1.1 — v1.0 Platform Engine Baseline & Engine Merge Registry

| Field | Value |
|-------|-------|
| **Date** | 2026-07-30 |
| **Status** | Superseded by AV-1.2 |
| **Author** | Solution Architect |

#### From → To

| Area | From | To |
|------|------|-----|
| Engine catalog structure | Two-layer split (Foundation / Business Processing); brief purpose-only rows | Single **v1.0 Platform Engine Baseline** table with Purpose + “What it Handles” for ENG-001 – ENG-016 |
| ENG-012 naming | “AI Engine” | **Intelligence Engine** — ML, GenAI, OCR, RAG, NLP, recommendations, predictive analytics |
| ENG-003e naming | “Partner Integration Engine” | **Enterprise Integration Engine** — REST, SOAP, GraphQL, OAuth, webhooks, banking/government APIs |
| ENG-010 | Standalone Integration Engine (ENG-010) in v1.0 baseline | **Retired** — scope merged into ENG-003e |
| ENG-017 (duplicate) | Duplicate Localization & Regulatory Engine numbered ENG-017 | **Retired** — merged into ENG-003b; Phase 2 ENG-017 reserved for Identity Resolution Engine |
| Phase 2 engines | Not formally separated | ENG-017 (Identity Resolution), ENG-018 (Scheduling), ENG-019 (Analytics) — introduce only when needed |
| Extension IDs | ENG-015a implicit | ENG-015a documented as compliance layer on ENG-015; ENG-003a–j documented as Configuration Engine sub-engines |
| Governance | No merge registry | **§3.1 Engine Merge Registry** with approval workflow (`.cursor/rules/eng-catalog-governance.mdc`) |
| Localization principle | Informal | **Localization First Principle** — country behaviour via ENG-003b only; integrations via ENG-003e |

#### Reasoning

The engine catalog had grown inconsistent: duplicate IDs (ENG-017 Localization vs Phase 2 Identity Resolution), overlapping integration scope (ENG-010 vs ENG-003e), and insufficient detail for AI coding assistants to know engine boundaries. Consolidating to a single v1.0 baseline with explicit “What it Handles” columns and a merge registry prevents future duplication and gives Cursor a authoritative engine map.

#### Affected Documents

- [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md) §5
- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3, §3.1
- [03 – Enterprise Domain Model](./03-Enterprise-Domain-Model.md)
- [08 – Enterprise Intelligence Architecture](./08-Enterprise-Intelligence-Architecture.md)
- [10 – Business Operations Solution Design](./10-Business-Operations-Solution-Design.md)
- [11 – Development Roadmap](./11-Development-Roadmap.md)
- `.cursor/rules/eng-catalog-governance.mdc`

---

### AV-1.2 — Industry Experience Layer & Industry Editions

| Field | Value |
|-------|-------|
| **Date** | 2026-07-30 |
| **Status** | Superseded by AV-1.3 |
| **Author** | Solution Architect |

#### From → To

| Area | From | To |
|------|------|-----|
| Industry model naming | “Vertical Solutions” | **Industry Editions** — InverBrass Banking, Property, Healthcare, etc. VS-001 IDs retained |
| User experience principle | Generic platform with module menus | **AP-001 Industry-Native Experience** — users perceive purpose-built domain software |
| New engine | None | **ENG-003k — Industry Experience Engine** — navigation, terminology, dashboards, product templates, feature visibility from edition profile |
| Platform composition | Build Packs consumed by vertical solutions | **Industry Editions powered by shared enterprise platform** — editions compose Build Packs via ENG-003k |
| Onboarding | Generic business type selection | Industry Edition selection at business onboarding binds navigation and terminology |
| BP-003 scope | Not defined | BP-003 Product & Service Catalogue scoped; product types filtered by edition via ENG-003k |
| UX standards | UI-only (Document 06) | UX-001.2 enterprise experience patterns added (Document 06b) |

#### Reasoning

A generic ERP-style menu exposes unrelated industry capabilities (e.g. Patients in a retail shop). Industry Editions solve this at the presentation layer without forking engines or duplicating domain modules. ENG-003k centralizes edition-specific navigation, labels, and feature visibility so Party, Product, Timeline, Audit, and Documents remain reusable across all editions.

#### Affected Documents

- [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md) — Industry Experience Layer, AP-001
- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) — Industry Editions table, ENG-003k, AP-001
- [06b – UX & Interaction Standards](./06b-UX%20%26%20Interaction%20Standards.md)
- [13 – Platform Blueprint](./13-platform-blueprint.md)
- BP-001 AD-009, onboarding guides, global navigation IP
- BP-003 build-pack scope and IP-001/IP-002 specifications

#### Implementation Notes

- `03-platform/src/core/industry-experience/` — ENG-003k service layer (terminology, product-type filters)
- Platform navigation service consumes edition profile for menu generation

---

### AV-1.3 — Foundation Freeze & Offering Engine (BP-003 IP-001)

| Field | Value |
|-------|-------|
| **Date** | 2026-07-30 |
| **Status** | Superseded by AV-1.4 |
| **Author** | Solution Architect |

#### From → To

| Area | From | To |
|------|------|-----|
| Foundation freeze | Not declared | **BP-001 IP-001**, **BP-002 IP-001–IP-012**, **BP-003 IP-001** frozen — schemas and core patterns stable |
| Product domain terminology | “Product” only | Internal **Offering Engine** terminology; UI labels via ENG-003k (`product` tables retained) |
| BP-003 engine alignment | Product Intelligence (ENG-003f) implied | Product module owns offering master data; ENG-003f governs lifecycle analytics (future); ENG-003k drives UI labels |
| Product data model | Not implemented | `product`, `product_type`, `product_status`, `product_timeline` tables — **frozen** at IP-001 |
| Product capabilities | Not implemented | Registration, workspace, dashboard KPIs, timeline taxonomy, audit history, capability grouping |
| Audit scope | Party-focused | Product entity audit events via ENG-013 |
| Timeline scope | Party timeline only | Shared product-timeline engine (`core/product-timeline/`) |

#### Reasoning

BP-001 and BP-002 foundations are complete and stable. BP-003 IP-001 establishes the offering master-data pattern without blocking future classification (IP-002), pricing (BP-004), or inventory (BP-007). Freezing schemas now prevents rework while remaining IPs (classification, variants, bundles) extend — not restructure — the foundation. “Offering” as internal terminology separates domain language from industry-specific UI labels (Product, Service, Policy, Loan Product) resolved by ENG-003k.

#### Affected Documents

- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3.2 Foundation Freeze Registry
- BP-003 build-pack scope
- BP-003 IP-001 Product & Service Foundation specification

#### Implementation Notes

- Migration: `03-platform/drizzle/0028_bp003_ip001_product_foundation.sql`
- Module: `03-platform/src/modules/product/`
- Core: `03-platform/src/core/product-timeline/`, `03-platform/src/core/industry-experience/`
- Smoke validation: `03-platform/scripts/bp003-ip001-product-foundation-smoke-validation.ts`

#### Foundation Freeze Rule (effective AV-1.3)

Complete remaining IPs without restructuring frozen foundations. Enhance through configuration, Industry Experience profiles, and UI — not schema churn.

---

### AV-1.4 — Checklist & Completion Engine (ENG-003l)

| Field | Value |
|-------|-------|
| **Date** | 2026-07-31 |
| **Status** | Superseded by AV-1.5 |
| **Author** | Solution Architect |

#### From → To

| Area | From | To |
|------|------|-----|
| Checklist capability | Ad-hoc module task lists; "Checklists" in Operations Domain marked "Future Solutions"; document matrix UI proposed inside BP-003 only | **ENG-003l — Checklist & Completion Engine** as a Core Platform sub-engine under ENG-003 |
| Ownership | Implicit in Document Engine / Build Pack UI | Single engine owner: metadata-driven definitions, instances, auto-complete, blocking rules, progress calculation |
| Build Pack consumption | No cross-cutting checklist service | All Build Packs consume ENG-003l (BP-001 onboarding, BP-002 party onboarding, BP-003 product creation, BP-004 pricing setup, etc.) |
| Document relationship | Document compliance matrix treated as UI-only concern | ENG-015a remains document matching owner; ENG-003l checklist items consume compliance state — checklist logic is not embedded in Document Engine |
| UX pattern | `PlatformCompletionMeter` used ad-hoc for profile completion | Completion meter and card components (UX-001.1) fed by ENG-003l service API |

#### Reasoning

Virtually every business process has a "have I completed everything?" requirement. Elevating checklists to a metadata-driven Core Platform Engine avoids reinventing guided-process UX in every Build Pack and Industry Edition. The engine supports mandatory blocking, optional warnings, auto-complete from platform events (document upload, identifier capture, approval), and manual attestation (site inspection). This is a platform differentiator: metadata-driven and reusable across Banking, Healthcare, Property, Education, and all verticals.

#### Affected Documents

- [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md) §5 — ENG-003l specification
- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3 — engine row, Build Pack consumption, Operations Domain
- [03 – Enterprise Domain Model](./03-Enterprise-Domain-Model.md) — Operations Domain ownership
- [06 – UI Standards](./06-UI-Standards.md) — extension ID reference
- [06b – UX & Interaction Standards](./06b-UX%20%26%20Interaction%20Standards.md) — UX-001.2h checklist patterns
- [13 – Platform Blueprint](./13-platform-blueprint.md) — Core Platform Services
- `.cursor/rules/eng-catalog-governance.mdc` — ENG-003a–l extension IDs
- BP-001 Business Setup requirements — setup checklist consumes ENG-003l
- BP-003 offering documents & compliance — document matrix powered by ENG-003l + ENG-015a

#### Implementation Notes (planned)

- Module: `03-platform/src/core/checklist-completion/` (not yet implemented)
- Existing UX components: `platform-completion-meter.tsx`, `platform-completion-card.tsx` — to be wired to ENG-003l
- Not in scope for BP-003 IP delivery — engine consumed by Build Packs when implemented

---

### AV-1.5 — Portfolio & Roadmap Engine (ENG-003m); BP-003 IP-014 Retired

| Field | Value |
|-------|-------|
| **Date** | 2026-07-31 |
| **Status** | Superseded by AV-1.6 |
| **Author** | Solution Architect |

#### From → To

| Area | From | To |
|------|------|-----|
| BP-003 IP-014 | Offering Roadmap & Release Management as a Product module IP with `offering_release`, `offering_roadmap_item` tables | **Retired from BP-003** — requirements absorbed into **ENG-003m Portfolio & Roadmap Engine** |
| BP-003 delivery boundary | IP-001 through IP-015 planned (governance, roadmap, intelligence) | **BP-003 freezes after IP-013 (Offering Governance)** for operational catalogue scope; roadmap and intelligence deferred to platform engines |
| Roadmap ownership | Implied in ENG-003f Product Intelligence ("roadmaps, releases, MVPs") | **ENG-003m** owns roadmap, release, milestone, and retirement planning; **ENG-003f** refocused on analytics and AI insights consuming ENG-003m data |
| Engine ID proposal | ENG-017 suggested for Portfolio & Roadmap | **ENG-003m** assigned — ENG-017 remains reserved for Phase 2 Identity Resolution Engine |
| Entity model | Product-specific `offering_*` roadmap tables | Generic `portfolio_release`, `portfolio_roadmap_item`, `portfolio_release_history`, `portfolio_milestone` with subject binding |

#### Reasoning

Roadmap and release management is not unique to products. The same capability is needed for customer onboarding journeys, loan products, hospital services, school programmes, property offerings, NGO programmes, and business processes. Implementing it inside BP-003 would duplicate planning logic across Build Packs. Elevating it to ENG-003m keeps the architecture aligned with "implement once, reuse everywhere" while allowing BP-003 to freeze after IP-013 as a complete operational offering master. ENG-017 cannot be reused — it is the Phase 2 Identity Resolution Engine per the v1.0 baseline.

#### Affected Documents

- [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md) §5 — ENG-003m specification; ENG-003f scope refined
- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3 — ENG-003m row; BP-003/BP-013 consumption
- BP-003 Scope — IP table updated; delivery freeze after IP-013
- BP-003 IP-014 — retired; redirected to ENG-003m
- `.cursor/rules/eng-catalog-governance.mdc` — ENG-003a–m

#### Implementation Notes (planned)

- Module: `03-platform/src/core/portfolio-roadmap/` (not yet implemented)
- BP-003 Product Workspace Roadmap tab will consume ENG-003m when implemented — no BP-003 IP-014 delivery
- IP-015 Product Intelligence remains future scope under ENG-003f / BP-013

#### AV-1.5 Engine Catalog Lock

**Status: LOCKED** — effective with AV-1.5; remains in force until AV-2.0 is deliberately initiated.

| Rule | Requirement |
|------|-------------|
| **No renumbering** | Existing engine IDs (ENG-001 – ENG-016, ENG-003a–n, ENG-015a, Phase 2 ENG-017 – ENG-019) must not be renamed or reassigned under AV-1.x |
| **No regrouping** | ENG-003 sub-engines remain a flat family — no engine families, no parent/child restructure under AV-1.x |
| **New capabilities** | Assign the next sequential sub-engine ID: **ENG-003o**, **ENG-003p**, … Record in [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3 before implementation |
| **AV-2.0 only** | Engine family regrouping, ID migration, or taxonomy restructure requires explicit **AV-2.0** approval, migration map, and Merge Registry updates |

This lock preserves implementation stability while the platform grows. Defer family regrouping to AV-2.0 — see [Future Architecture Considerations (AV-2.0)](#future-architecture-considerations-av-20).

---

### AV-1.6 — Work Assignment & SLA Engine (ENG-003n); CRM 13-IP Baseline

| Field | Value |
|-------|-------|
| **Date** | 2026-08-02 |
| **Status** | **Superseded in part by AV-1.7** (CRM catalog ID is **BP-004**, not BP-008; ENG-003n content remains current) |
| **Author** | Solution Architect |

#### From → To

| Area | From | To |
|------|------|-----|
| Work assignment & SLA | Implied in ENG-005 Workflow ("SLA monitoring, task assignment") without dedicated ownership | **ENG-003n Work Assignment & SLA Engine** — assignment history, per-assignee segments, cumulative lifecycle SLA, queue metrics |
| ENG-004 scope | Risk of conflating Rules Engine with SLA tracking | **ENG-004 unchanged** — Rules Engine only; SLA is ENG-003n |
| ENG-005 scope | Implied SLA ownership | **ENG-005 refocused** — approvals, escalations, workflow orchestration; complements ENG-003n breach signals |
| CRM documentation (then labeled BP-008 in draft catalog) | Legacy 15-IP model in `build-pack 004-CRM.md/` | **13-IP baseline** in `Build Pack 004 - Customer Relationship Management/` — IP-01 through IP-13 (**canonical ID BP-004** per AV-1.7) |
| CRM IP structure | Activities, calendar, visits combined or scattered | **IP-05** Activities, **IP-06** Calendar, **IP-07** Visit & Call Reports (standalone); IP-04 merges accounts + contacts |
| CRM consumption contract | Per-module SLA duplication risk | **IP-01** defines ENG-003n consumption contract and **Customer 360 hub** for all CRM work items |
| Next ENG-003 sub-engine ID | ENG-003n (reserved) | **ENG-003n registered**; next ID **ENG-003o** |

#### Reasoning

Assignment history and SLA measurement apply across CRM, sales, service, lending, and operations — not only within workflow steps. Implementing SLA segments inside each Build Pack would duplicate logic and prevent cross-module queue analytics. ENG-003n elevates the capability to platform level while ENG-005 retains approval orchestration. CRM documentation is restructured to 13 IPs with explicit boundaries between calendar scheduling (IP-06) and visit/call report documentation with collaborative approval (IP-07).

#### Affected Documents

- [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md) §5 — ENG-003n specification
- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3 — ENG-003n row; BP-004 CRM baseline note
- [03 – Enterprise Domain Model](./03-Enterprise-Domain-Model.md) — Work Assignment & SLA capability
- [13 – Platform Blueprint](./13-platform-blueprint.md) — ENG-003n in platform layer
- `Build Pack 004 - Customer Relationship Management/` — 13 IP specifications and scope
- `.cursor/rules/eng-catalog-governance.mdc` — next ID ENG-003o

#### Implementation Notes (planned)

- Module: `03-platform/src/core/work-assignment-sla/` (not yet implemented)
- BP-004 IP-01 defines consumption contract; IP-02, IP-03, IP-07, IP-09 consume ENG-003n for entity-specific SLA policies
- ENG-005 escalation workflows triggered on ENG-003n breach events

---

### AV-1.7 — Build Pack ID realignment (CRM remains BP-004)

| Field | Value |
|-------|-------|
| **Date** | 2026-08-12 |
| **Status** | Superseded by AV-1.8 |
| **Author** | Integration Manager / Solution Architect |

#### From → To

| Area | From (prior catalog draft) | To (canonical) |
|------|----------------------------|----------------|
| CRM & Customer Engagement | BP-008 | **BP-004** (locked to implemented delivery) |
| Pricing, Tax & Commercial Rules | BP-004 | **BP-005** |
| Sales, Orders & Service Delivery | BP-005 | **BP-006** |
| Payments, Billing & Receipting | BP-006 | **BP-007** |
| Inventory & Resource Management | BP-007 | **BP-008** |
| BP-001–BP-003, BP-009–BP-013 | Unchanged | Unchanged |

#### Reasoning

CRM was delivered and certified as Build Pack 004. Retaining CRM as BP-008 would force a permanent delivery/catalog mismatch. Catalog IDs are realigned so **CRM stays BP-004** and remaining commercial/operations packs follow in logical order: Pricing → Sales → Payments → Inventory → Procurement → Finance → Workflow → Analytics → Product Innovation.

#### Affected Documents

- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) — Build Pack table + Industry Edition pack lists
- [11 – Development Roadmap](./11-Development-Roadmap.md) — canonical sequence + status
- [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md) — CRM references updated to BP-004
- CRM folder `Build Pack 004 - Customer Relationship Management/` — remains authoritative for BP-004

---

### AV-1.8 — BP-007 Payments ownership lock

| Field | Value |
|-------|-------|
| **Date** | 2026-08-25 |
| **Status** | Superseded by AV-1.9 |
| **Author** | Integration Manager / Solution Architect |

#### From → To

| Area | From | To |
|------|------|-----|
| BP-007 key capabilities | Billing, invoicing, receipts, **collections**, refunds, allocation, **reconciliation** | Obligation, four-dimension catalogues, adapter orchestration, initiation, split/allocation, invoicing & credit sales, receipts, refunds, settlement **handoff** |
| Collections (SC-032) | Implied in BP-007 catalog keys; some narrative used **BP-013 Receivables** | **Out of BP-007.** Future capability — **no pack ID in AV-1.8**. Canonical **BP-013 remains Product Management & Innovation** |
| Reconciliation | Listed as BP-007 in-pack work | **ENG-008** later. BP-007 IP-07 = handoff only |
| Provider integration | Unspecified (risk of pack-direct Daraja) | **ENG-006 adapters via ENG-003e**. Pack does not own rails |
| Payment dimensions | Flattened methods in BP-001 / Doc 10 (Credit listed as a method) | Independent **method / rail / provider / channel**. Credit = billing, not tender |
| Pack documentation | No BP-007 folder | `02-build-packs/build pack 007-Payments Billing & Receipting/` — IP-01–IP-08 specified; implementation not started |

#### Reasoning

BP-006 is certified and must hand off a payment-ready contract. Documenting BP-007 without locking ownership would recreate the old ID collision (Receivables as BP-013) and would let the pack become a processor or a reconciliation engine. AV-1.8 records the lock so implementation prompts cannot reuse those IDs.

#### Affected Documents

- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) — BP-007 row
- [11 – Development Roadmap](./11-Development-Roadmap.md) — BP-007 IP list; historical BP-013 Receivables note
- `02-build-packs/build pack 007-Payments Billing & Receipting/` — Scope + IP-01–IP-08
- `02-build-packs/build pack 006-Sales-Orders & Service Delivery/Build Pack-006 Scope.md` — reconciliation owner line

#### Implementation impact

Documentation only. No payment runtime yet. Existing unused `payment_method` / `payment_network` / `payment_provider` / `payment_channel` schema is the catalogue target for IP-01.

---

### AV-1.9 — BP-008 Inventory ownership lock

| Field | Value |
|-------|-------|
| **Date** | 2026-08-27 |
| **Status** | Superseded by AV-1.10 |
| **Author** | Integration Manager / Solution Architect |

#### From → To

| Area | From | To |
|------|------|-----|
| Inventory pack ID | Risk of documenting inventory as “BP-009” because it has nine IPs | **BP-008** Inventory & Resource Management. **BP-009** remains Procurement & Supplier Management |
| On-hand | Risk of writable stock field | **Derived from stock ledger** |
| Sales deduction | Risk of scraping sales order lines | Consume **BP-006 fulfilment-ready contract** |
| Receiving | Risk of embedding purchase orders | IP-02 goods received / opening balance **without** BP-009 POs |
| Reorder | Risk of auto-creating POs | **Signal only**; PO is BP-009 |
| Stocktake | Risk of calling it ENG-008 reconciliation | **Quantity count vs ledger**; not statement matching |
| Valuation | Implied in inventory | **BP-010** later; v1 is quantity-first |
| Pack documentation | No BP-008 folder | `02-build-packs/build pack 008-Inventory & Resource Management/` — Scope + IP-01–IP-09 specified; implementation not started |

#### Reasoning

BP-007 v1 is certified. The next pack is inventory. Naming that pack BP-009 because it contains IP-01–IP-09 would collide with locked Procurement. AV-1.9 records the lock so implementation prompts cannot misnumber the pack or turn inventory into purchasing, GL, or WMS.

#### Affected Documents

- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) — BP-008 row
- [11 – Development Roadmap](./11-Development-Roadmap.md) — BP-008 IP list
- `02-build-packs/build pack 008-Inventory & Resource Management/` — Scope + IP-01–IP-09

#### Implementation impact

Documentation only. No inventory runtime yet. Implementation starts at IP-01 after this specification is approved.

---

### AV-1.10 — BP-009 Procurement ownership lock

| Field | Value |
|-------|-------|
| **Date** | 2026-08-31 |
| **Status** | Superseded by AV-1.11 |
| **Author** | Integration Manager / Solution Architect |

#### From → To

| Area | From | To |
|------|------|-----|
| Pack documentation | Catalog row only; no BP-009 folder | `02-build-packs/build pack 009-Procurement & Supplier Management/` — Scope + IP-01–IP-12 specified; implementation not started |
| Supplier master | Risk of a second supplier list inside procurement | **BP-002 Party** owns identity. BP-009 owns **procurement relationship** (profile, qualification, status, performance) |
| Inventory | Risk of posting on-hand on goods receipt | **BP-008** owns ledger/on-hand. BP-009 IP-08 is **receipt instruction / handoff** only |
| Reorder → PO | Risk of inventory creating POs | Unchanged from AV-1.9: BP-008 signal → BP-009 Purchase Request. **PO is BP-009** |
| GL / AP rails | Risk of procurement posting journals or paying suppliers | **BP-010** owns GL. Outgoing payment rails remain an **open v1 decision**. IP-09 = match + **payment-ready / AP handoff** |
| Customer AR | Risk of reusing BP-007 payment catalogues for supplier pay | **BP-007** remains customer AR. BP-009 does not create customer receipts |
| Matching | Risk of calling invoice match ENG-008 | **2-way / 3-way match is BP-009 IP-09** (PO/receipt/invoice). ENG-008 remains statement/settlement matching |
| IP structure | Informal “suppliers, RFQs, POs” | **12 IPs** frozen at scope: Foundation → PR → RFX → Response → Award → PO → Contract → Receiving handoff → Invoice match → Exceptions → Performance → Analytics |

#### Reasoning

BP-008 v1 is implemented. The next operations pack is procurement. Documenting BP-009 without locking ownership would recreate a second supplier master, a shadow inventory ledger, or a premature AP/GL engine. AV-1.10 records the lock so implementation prompts start at IP-01 (procurement profile on Party) and cannot implement RFX, PO, matching, receiving or payment in that increment. Supplier payment rails stay explicitly open.

#### Affected Documents

- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) — BP-009 row
- [11 – Development Roadmap](./11-Development-Roadmap.md) — BP-009 IP list
- `02-build-packs/build pack 009-Procurement & Supplier Management/` — Scope + IP-01–IP-12

#### Implementation impact

Documentation only. No procurement runtime yet. Implementation starts at **IP-01 — Procurement Foundation & Supplier Relationship** after this specification is approved. IP-01 must not implement RFX, PO, invoice matching, receiving or payment.

---

### AV-1.11 — Procurement hub information architecture lock

| Field | Value |
|-------|-------|
| **Date** | 2026-08-31 |
| **Status** | Superseded by AV-1.12 |
| **Author** | Integration Manager / Solution Architect |

#### From → To

| Area | From | To |
|------|------|-----|
| Primary hubs (NAV-001) | Dashboard, Parties, Offerings, CRM, Sales, Payments, Inventory, Settings | Same list **plus Procurement** after Inventory, before Settings |
| Suppliers in navigation | Risk of a top-level Suppliers hub or IP-labelled procurement menu | **Suppliers** is nested under **Procurement**. Qualification, categories, blacklisting, preferred, and eligibility live on Supplier Profile — not as sidebar modules |
| Future buy-side items | Risk of RFQ, PO, Contract, Receiving, Invoice, Performance as top-level peers | Target tree nested under Procurement (Sourcing, Purchasing, Contracts, Receiving, Supplier Invoices, Supplier Performance, Analytics). Expose only when implemented |
| IP-01 exposed tree | Unspecified | `Procurement → Suppliers` only. No empty/fake items for later IPs |
| Mobile | Unspecified for procurement | Existing pattern: Dashboard, CRM, Sales, Payments, More. Procurement under **More**, not the bottom bar |
| Runtime nav | Live sidebar has no Procurement hub | Unchanged until IP-01 pages exist. Shared files (`platform-nav-config.ts`, `business-app-routes.ts`, breadcrumbs, IA certification) are updated at IP-01 merge — not as empty placeholders |
| Ownership | Unchanged from AV-1.10 | Unchanged: Party identity BP-002; inventory on-hand BP-008; customer AR BP-007; GL BP-010; payment rails open v1 |

#### Reasoning

AV-1.10 locked *what* BP-009 owns. Without an IA lock, IP-01 could still ship a second primary hub named Suppliers, expose unimplemented RFX/PO items, or fork a procurement-specific navigation shell. AV-1.11 records hub-first navigation so the user job is “buy something → Procurement → manage a supplier”, and later IPs extend the same hub without another redesign.

#### Affected Documents

- [06 – UI/UX Standards](./06-UI-Standards.md) — NAV-001 hub list
- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) — AV-1.11 note
- [11 – Development Roadmap](./11-Development-Roadmap.md) — BP-009 navigation note
- `02-build-packs/build-pack 001-business setup& Onboarding.md/ip-007-global navigation.md` — minimum hub list
- `02-build-packs/build pack 009-Procurement & Supplier Management/BP-009 Navigation Hub.md` — canonical IA
- `02-build-packs/build pack 009-Procurement & Supplier Management/Build Pack-009 Scope.md` — §18
- `02-build-packs/build pack 009-Procurement & Supplier Management/IP-01 Procurement Foundation & Supplier Relationship.md` — NAV-001–NAV-020

#### Implementation impact

Documentation only at the time of AV-1.11. Runtime Procurement hub was added with IP-01 and later sourcing routes. Engine catalog (ENG-001–ENG-019 / ENG-003a–n) is unchanged.

---

### AV-1.12 — BP-009 sourcing IP boundary and configurable tender opening

| Field | Value |
|-------|-------|
| **Date** | 2026-09-01 |
| **Status** | **Current** |
| **Author** | Integration Manager / Solution Architect |

#### From → To

| Area | From | To |
|------|------|-----|
| IP-03 written scope | Bundled RFX + response + evaluation + award; next IP described as PO | IP-03 = RFX + criteria lock + opening policy. IP-04 = response. IP-05 = evaluation/award. IP-06 = PO |
| Code vs labels | Header portal, quote versions, commercial savings, and header award shipped under IP-03 | **Reclassify, do not rebuild.** One `SourcingService`. Certify capabilities under IP-04/IP-05 |
| Tender opening | Implied always-open buyer comparison, or assumed universal sealed Maker-Checker | **Configurable:** Organisation Default, Standard, Maker-Checker. Enforcement rules by RFX value, category, type, risk may **mandate** Maker-Checker. Users cannot weaken a mandate |
| Standard opening | Risk of treating Standard as “no controls” | Standard still requires RBAC, audit, bid submission locking, bid version integrity, and access logging. Difference is **no** second-person unseal gate |
| Evaluation model | Mixed criteria list (price/quality/delivery as one table) | Technical **phases** (Desktop, Demo, PoC, Reference, Site visit) + Financial weight/basis. Payment terms are IP-04 financial proposal, not scores |
| Engine catalog | Unchanged | **Unchanged.** Opening policy is BP-009 configuration; Maker-Checker opening uses ENG-005 when required. No ENG-003o |

#### Reasoning

The implemented sourcing slice already contains IP-04/IP-05 capabilities. A greenfield IP-04/IP-05 would duplicate portal, quotes, savings, and award. SME customers need a simple default (Standard opening). Larger or high-risk organisations need sealed bids with Maker-Checker. Always-on governance must not disappear when Standard is selected.

#### Affected Documents

- `02-build-packs/build pack 009-Procurement & Supplier Management/IP-03 RFX Management.md`
- `02-build-packs/build pack 009-Procurement & Supplier Management/IP-04 Supplier Response & Collaboration.md`
- `02-build-packs/build pack 009-Procurement & Supplier Management/IP-05 Evaluation, Award & Sourcing Decision.md`
- `02-build-packs/build pack 009-Procurement & Supplier Management/Build Pack-009 Scope.md`
- `02-build-packs/build pack 009-Procurement & Supplier Management/IP-06 Purchase Order Management.md`
- `02-build-packs/build pack 009-Procurement & Supplier Management/IP-01 Procurement Foundation & Supplier Relationship.md`
- `02-build-packs/build pack 009-Procurement & Supplier Management/BP-009 Navigation Hub.md`
- [11 – Development Roadmap](./11-Development-Roadmap.md)
- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md)
- [06 – UI/UX Standards](./06-UI-Standards.md)

#### Implementation impact

**Documentation lock only in this version.** No schema, route, or service changes in AV-1.12. Next code increments require explicit approval and must enhance existing sourcing artefacts. Engine catalog lock (AV-1.5) is unchanged.

---

## Future Architecture Considerations (AV-2.0)


> **Status:** Recorded for planning only. **Not in effect.** Current v1.0 IDs (ENG-003a–n, ENG-017 Identity Resolution, etc.) remain canonical until an explicit **AV-2.0** approval and migration plan.

### Context — ENG-003 family growth

ENG-003 was originally intended to represent **Platform Foundation / Metadata** engines. The family has grown to **14 sub-engines** (ENG-003a through ENG-003n):

| ID | Engine |
|----|--------|
| ENG-003a | Configuration |
| ENG-003b | Localization & Regulatory |
| ENG-003c | Organization Structure |
| ENG-003d | Event Ingestion |
| ENG-003e | Enterprise Integration |
| ENG-003f | Product Intelligence |
| ENG-003g | Business Presence |
| ENG-003h | Platform Performance & Scalability |
| ENG-003i | Consent |
| ENG-003j | Identity & Regulatory Identification |
| ENG-003k | Industry Experience |
| ENG-003l | Checklist & Completion |
| ENG-003m | Portfolio & Roadmap |
| ENG-003n | Work Assignment & SLA |

This remains **technically valid for v1.0** — flat sub-engine IDs under ENG-003 are governed by `.cursor/rules/eng-catalog-governance.mdc`. As the platform matures, the breadth of the family may warrant **logical grouping** into engine families with clearer domain boundaries.

### Draft proposal — engine family regrouping (AV-2.0)

When the platform reaches a scale where catalog navigation and ownership clarity suffer, consider grouping sub-engines into **families** rather than one flat ENG-003 list:

**Family 1 — Platform Metadata Services (ENG-003)**

| Sub-ID | Engine (current v1.0 ID) |
|--------|--------------------------|
| 003a | Configuration |
| 003b | Localization & Regulatory |
| 003c | Organization Structure |
| *(TBD)* | Business Presence (003g), Consent (003i), Identity & Regulatory (003j), Industry Experience (003k), Integration (003e), etc. |

**Family 2 — Platform Intelligence Services (illustrative — ID TBD)**

| Sub-ID | Engine (current v1.0 ID) |
|--------|--------------------------|
| 017a | Checklist & Completion (ENG-003l) |
| 017b | Portfolio & Roadmap (ENG-003m) |
| 017c | Product Intelligence (ENG-003f) |
| 017d | Event Intelligence / Event Ingestion (ENG-003d) |

Additional families (e.g. **Platform Operations Services** for Performance 003h, Integration 003e) may emerge as the catalog is rationalized.

### ID conflict to resolve before AV-2.0

**ENG-017 is currently reserved** for the Phase 2 **Identity Resolution Engine** (deduplication, golden record, CIF). Repurposing ENG-017 as "Platform Intelligence Services" in AV-2.0 would require either:

1. Relocating Identity Resolution to a new baseline or Phase 2 ID, or
2. Using a different family parent ID (e.g. ENG-020+) for Intelligence Services

Any AV-2.0 regrouping must include a **full ID migration map**, Merge Registry updates, and code-path aliases — not a documentation-only rename.

### AV-2.0 review triggers (measurable)

Formal AV-2.0 engine-taxonomy review is **required** when any trigger below is met. Until a trigger fires, the [AV-1.5 Engine Catalog Lock](#av-15-engine-catalog-lock) remains in force.

| Trigger | Action |
|---------|--------|
| ENG-003 reaches **20 sub-engines** | Architecture review **required** |
| More than **3 distinct capability domains** under ENG-003 | Consider regrouping |
| Multiple implementation teams require ownership boundaries | Create engine families |
| AI prompts frequently misclassify engines | Review engine taxonomy |

**Current count (AV-1.6):** 14 sub-engines (ENG-003a – ENG-003n). Next assigned ID: **ENG-003o**.

**Capability domain examples** (for the "3 domains" trigger): Metadata & Configuration, Regulatory & Identity, Integration & Events, Intelligence & Analytics, Experience & Presentation, Operations & Performance. More than three of these actively represented under ENG-003 warrants regrouping consideration.

Until an AV-2.0 review is deliberately initiated: **continue adding sub-engines as ENG-003o, ENG-003p, …** per the AV-1.5 lock. Record each new ID in the catalog before implementation.

---

## How to Record the Next Version

When making a material architecture change:

1. **Draft the change** in the relevant architecture document(s).
2. **Add a new AV-x.y section** above the current version (newest first).
3. **Mark the previous version** as `Superseded by AV-x.y`.
4. **Update the Current Version** in Document Information at the top of this file.
5. **Update cross-registries** (Engine Merge §3.1, Foundation Freeze §3.2) if applicable.
6. **Reference this AV ID** in commit messages and build-pack deliverables.

### Entry template

```markdown
### AV-x.y — [Short title]

| Field | Value |
|-------|-------|
| **Date** | YYYY-MM-DD |
| **Status** | Current / Superseded by AV-x.z |
| **Author** | [Role or name] |

#### From → To

| Area | From | To |
|------|------|-----|
| [Area] | [Before state] | [After state] |

#### Reasoning

[Why this change was made; what problem it solves; what it enables.]

#### Affected Documents

- [List documents]

#### Implementation Notes (optional)

- [Code paths, migrations, smoke tests]
```

---

## Related Documents

| Document | Relationship |
|----------|--------------|
| [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md) | Canonical platform layers and engine baseline |
| [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) | Engine catalog, merge registry, foundation freeze |
| [07 – Coding Standards](./07-Coding-Standards.md) | Requires new mechanisms to be justified; references this registry |
| [13 – Platform Blueprint](./13-platform-blueprint.md) | Implementation blueprint aligned to current AV |
| `.cursor/rules/eng-catalog-governance.mdc` | Engine merge approval workflow |
| BP-001 AD-009 | Build-pack authentication ADRs (ADR-009 – ADR-021) — separate namespace |

# 01b – Architecture Versions

## Document Information

| Attribute | Value |
|-----------|-------|
| Document Name | Architecture Versions |
| Current Version | **AV-1.3** |
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
| **Major version** | Bump AV-2.0 only for breaking platform-wide restructuring (e.g. monolith → microservices, tenant model change). |
| **Engine merges** | Engine ID merges are recorded here **and** in [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3.1 Engine Merge Registry. |
| **Foundation freeze** | Foundation freeze declarations are recorded here **and** in [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3.2 Foundation Freeze Registry. |
| **Build-pack ADRs** | BP-specific ADRs (authentication, IAM, etc.) stay in build-pack deliverables; reference them from implementation notes when relevant. |

### When to add a version entry

Add a new AV entry when any of the following change:

- Platform engine baseline (ENG-001 – ENG-019, ENG-003a–k, ENG-015a)
- Platform design principles (AP-001 onward)
- Industry Edition model or ENG-003k Industry Experience Engine
- Foundation freeze scope or status
- Canonical document ownership or layering model
- Technology baseline (Document 01 § Technology Baseline)

Do **not** add an AV entry for routine build-pack IP completion unless it introduces a new cross-cutting architectural mechanism.

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
| **Status** | **Current** |
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

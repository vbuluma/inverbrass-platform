# BP-005 IP-02 – Price Components & Charge Composition

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-02 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-01, ENG-004 |
| Scope coverage | SC-005, SC-006, SC-009 |

---

## Objective

Define the **commercial component model** and **charge composition** so that a payable amount is built from principal, commission, fees, surcharges, discounts, tax, levies and other configurable components — with dependencies, calculation order, precision and mathematical reconciliation.

---

## Business Problem

A single “price” is insufficient for enterprise commerce. Businesses need transparent breakdowns (principal vs tax vs commission), consistent rounding, and component integrity so Sales, Payments and Assurance can trust the composition without recalculating it.

---

## Scope

### Included

- Configurable commercial component types with unique identity
- Principal/base, commission, fee, surcharge, discount, tax, levy and extensible component kinds
- Calculation basis retained per component
- Component dependencies and defined calculation order
- Prevention of circular dependencies
- Internal decimal precision and currency rounding consistency (with IP-03 / IP-09)
- Mathematical reconciliation: components must sum/reconcile to the commercial result
- Charge composition producing final payable candidate for IP-06

### Excluded

- Tax rate master and tax applicability policy detail (IP-03 owns tax rules; IP-02 provides the tax *component slot*)
- Discount eligibility policy detail (IP-04)
- Rule conflict arbitration (IP-05)
- Snapshot persistence (IP-06)
- Payment split / allocation (BP-007)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Decompose commercial amounts into configurable components. |
| BR-002 | Support principal, commission, fee, surcharge, discount, tax, levy and other configured types. |
| BR-003 | Each component has unique type/identity and retained calculation basis. |
| BR-004 | Component dependencies and calculation order are explicit and cycle-free. |
| BR-005 | Component values reconcile mathematically to the resulting commercial amount. |
| BR-006 | Future component types can be added without redesigning the transaction commercial model (NFR-010). |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Support decomposition of a commercial amount into configurable components. | FR-008 |
| FR-002 | Support principal/base, commission, fee, surcharge, discount, tax, levy and other configurable components. | FR-009 |
| FR-003 | Assign unique type/identity to each commercial component. | FR-010 |
| FR-004 | Retain calculation basis for each component. | FR-011 |
| FR-005 | Support component dependencies and defined calculation order. | FR-012 |
| FR-006 | Prevent circular component dependencies. | FR-013 |
| FR-007 | Maintain sufficient internal precision and apply configured currency rounding consistently. | FR-014 |
| FR-008 | Ensure component values reconcile mathematically to the resulting commercial amount. | FR-015 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Principal/base is derived from IP-01 resolved base price (adjusted by quantity/method as applicable). |
| BRU-002 | Calculation order is configuration-driven; default order must be documented per business template. |
| BRU-003 | Circular dependency graphs are rejected at configuration validation (IP-09) and at runtime. |
| BRU-004 | Rounding is applied per currency rules; intermediate precision exceeds display precision. |
| BRU-005 | Floating-point binary types must not be used for monetary calculation (NFR-003). |
| BRU-006 | Component codes are stable identifiers for downstream contracts (IP-10). |

---

## Critical Example (composition)

| Component | Calculation Basis | Amount |
|-----------|-------------------|--------|
| Principal | Base price | 850.00 |
| Commission | Configured rule | 50.00 |
| Tax | Taxable basis × tax rate | 100.00 |
| Customer Payable | Resolved total | 1,000.00 |

---

## High-Level Process Flow

```
ResolvedBasePrice (IP-01)
        ↓
Load applicable component rules (IP-03/IP-04/ENG-004)
        ↓
Build dependency-ordered component graph
        ↓
Calculate each component with basis + precision
        ↓
Apply currency rounding rules
        ↓
Reconcile components → payable candidate
        ↓
Pass composition result → IP-06
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Component type catalogue | Codes, labels, sign (add/subtract), category |
| Calculation order | Explicit ordered list / dependency edges |
| Rounding mode | Per currency (half-up, banker's, etc.) |
| Precision | Internal vs presentation scale |
| Extensibility | Allow new component types without schema fork |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01 | Base/principal input |
| IP-03 | Tax component calculation |
| IP-04 | Discount / adjustment components |
| IP-05 | Which component rules win |
| IP-06 | Composition included in resolution result |
| IP-09 | Integrity and circular dependency validation |
| ENG-004 | Rule-driven component applicability |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Composition integrity exceptions | Failed reconciliations |
| Component mix by period | Volume by component type (downstream analytics) |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Composition produces principal + at least one additional component type in the critical example pattern. |
| AC-002 | Circular dependencies are rejected. |
| AC-003 | Components reconcile to payable within configured rounding tolerance (prefer exact reconcile after rounding policy). |
| AC-004 | Calculation basis and component identity are present on every emitted component. |
| AC-005 | Monetary math uses decimal precision, not floating-point. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | **Implemented** in `03-platform` (2026-08-12) |
| Related FRs | FR-008–FR-015 |
| UX | `/commercial/resolve` — progressive workspace (IP-02 step) |
| Smoke | `npx tsx scripts/bp005-ip02-commercial-composition-smoke-validation.ts` — **20/20 PASS** (incl. TC-01…10) |
| Migrations | **None** — in-memory composition contracts; no new pricing/commercial master tables |
| Lint (IP-02 files) | PASS (0 errors) |
| Typecheck | Pre-existing failure only: `bp001-004-system-integration-certification.ts` (`"leads"`); **no IP-02 errors** |

---

## Implementation Status

### Architecture flow (implemented)

```text
Downstream consumer
      ↓
CommercialCompositionService
      ├── composeFromBasePriceRequest → BasePriceResolutionService (IP-01) → ResolvedBasePrice
      └── compose(ResolvedBasePrice + optional supplied components)
      ↓
ResolvedCommercialComposition
  (components[], payableCandidate, provenance, reconciled)
```

Principal is **always** derived from IP-01 `ResolvedBasePrice`. IP-02 does **not** call BP-003 `PricingService` / `pricing_item` directly.

Tax/discount/commission **amounts** are accepted only as supplied contributions (slots for IP-03/IP-04). IP-02 does not invent those amounts.

### Files created

| File | Purpose |
|------|---------|
| `03-platform/src/modules/commercial/money/commercial-money.ts` | Integer-scaled decimal money helpers |
| `03-platform/src/modules/commercial/services/commercial-component-rules.ts` | Type catalogue, order, cycle detection |
| `03-platform/src/modules/commercial/services/commercial-composition-service.ts` | Composition orchestrator |
| `03-platform/scripts/bp005-ip02-commercial-composition-smoke-validation.ts` | TC-01…TC-10 smoke |

### Files modified

| File | Change |
|------|--------|
| `03-platform/src/modules/commercial/constants.ts` | Component type catalogue + default order |
| `03-platform/src/modules/commercial/errors.ts` | IP-02 error codes |
| `03-platform/src/modules/commercial/types.ts` | Composition contracts |
| `03-platform/src/modules/commercial/index.ts` | Public exports |
| This document | Status, handover, prompt archive |

### Contracts introduced

- `CommercialCompositionRequest` / `ResolvedCommercialComposition`
- `CommercialComponentContribution` / `ResolvedCommercialComponent`
- `CommercialCompositionService.compose` / `composeFromBasePriceRequest`
- Default type codes: `PRINCIPAL`, `COMMISSION`, `FEE`, `SURCHARGE`, `DISCOUNT`, `TAX`, `LEVY`

### Intentional boundaries / known gaps

- No tax/discount/commission **rule engines** (IP-03 / IP-04)
- No precedence (IP-05); no snapshot persistence (IP-06)
- No ENG-004 runtime (not available) — type order + dependency graph only
- Quantity multiplies unit principal; BP-003 still has no quantity-tier price columns
- CRM quotation adapter still consumes IP-01 for unit price; IP-02 is available for commercial pipeline consumers (IP-06+)

### Downstream integration points

- IP-03 / IP-04 → supply `additionalComponents` with rule provenance
- IP-06 → consume `ResolvedCommercialComposition` into resolution/snapshot
- IP-09 → reuse cycle detection / reconciliation failures
- IP-10 → stable component type codes

---

## UX / Interaction Standards (boundary)

**UI implemented** — progressive commercial resolution workspace consuming IP-02 after IP-01.

| Item | Value |
|------|-------|
| Route | `/commercial/resolve` |
| Workspace | `src/modules/commercial/components/commercial-resolution-workspace.tsx` |
| Flow | Base price (IP-01) → Components (IP-02) → Tax (IP-03) → Review |
| Standards | Platform UX-001: stepper/progress, Previous/Next, contextual field errors, loading/success feedback, empty states, guidance column, sticky action footer |
| Components reused | `PlatformEmptyState`, `PlatformProcessingButton`, `PlatformFormActionFooter`, `PlatformInlineFormFeedback` |
| Out of scope | No second pricing master UI; component catalogue admin UI deferred |

Downstream UI MUST continue to reuse BP-001–BP-004 platform components and patterns — do not invent a separate UX language for commercial resolution.

---

## Implementation Prompt (archived)

# BP-005 IP-02 — Commercial Component Definition & Composition

You are implementing **BP-005 IP-02 — Commercial Component Definition & Composition** for the InverBrass Platform.

## 1. Context

BP-005 is the **Pricing, Tax & Commercial Rules** Build Pack.

**BP-003 owns the price master.**

**BP-005 owns the commercial interpretation of that price.**

IP-01 has now been implemented and smoke-validated.

The current flow is:

```text
Downstream consumer
      ↓
BasePriceResolutionService
      ↓
BP-003 Pricing Read Adapter
      ↓
BP-003 pricing_catalogue / pricing_item / pricing_method
      ↓
ResolvedBasePrice + provenance
```

CRM quotations already consume BP-005 IP-01 through the existing pricing-resolution adapter.

IP-02 must build on this capability.

---

# 2. Objective

Implement a **deterministic commercial component model** that takes the resolved base price from IP-01 and represents the commercial components that make up a transaction amount.

The objective is to establish a backend commercial-resolution capability capable of representing:

```text
Base / Principal
      +
Commission / Charge
      +
Tax
      -
Discount
      =
Expected / Payable amount
```

However, **IP-02 must only implement the responsibilities assigned to IP-02 in the approved BP-005 decomposition**.

Do not prematurely implement IP-03, IP-04, IP-05, IP-06, payments, orders, checkout, receipting, inventory, or revenue assurance.

Before coding, inspect the approved BP-005 documentation and the IP-02 requirements document and preserve the approved ownership boundaries.

---

# 3. Mandatory architecture principle

Do not create another pricing master.

```text
BP-003
Price Master
    │
    │ read
    ▼
BP-005 IP-01
Base Price Resolution
    │
    │ ResolvedBasePrice + provenance
    ▼
BP-005 IP-02
Commercial Component Model
```

IP-02 must consume IP-01.

It must **not bypass IP-01** and independently query `pricing_item` to determine the base price.

---

# 4. Scope

Implement only the IP-02 capabilities defined in the approved requirements.

At minimum, inspect and establish the correct model for:

* base/principal component
* commercial component identity
* component type
* component amount/value
* component calculation basis where applicable
* component ordering
* positive/negative component semantics
* component provenance
* deterministic composition
* component validation
* business/tenant isolation
* downstream resolution contract

The implementation must support the commercial model required by subsequent IPs without hardcoding a particular industry.

---

# 5. Important distinction

Do not confuse:

### Price

The configured BP-003 price:

```text
Product X = KES 1,000
```

### Commercial components

How that price is interpreted:

```text
Principal       KES 1,000
Commission      KES 100
Tax             KES 198
Discount       -KES 50
-----------------------
Expected        KES 1,248
```

IP-02 establishes the structure required to represent these components.

It must not implement actual payment collection.

---

# 6. Ownership boundaries

Maintain these boundaries strictly.

| Capability                             | Owner                                          |
| -------------------------------------- | ---------------------------------------------- |
| Product/offering master                | BP-003                                         |
| Base/unit price master                 | BP-003                                         |
| Applicable base-price selection        | BP-005 IP-01                                   |
| Commercial component model/composition | **BP-005 IP-02**                               |
| Tax rules/calculation                  | IP-03                                          |
| Discount rules/calculation             | IP-04                                          |
| Precedence/conflict resolution         | IP-05                                          |
| Final commercial resolution/snapshot   | IP-06                                          |
| Expected amount validation             | IP-09                                          |
| Actual payment                         | BP-007                                         |
| Payment split                          | BP-007                                         |
| Receipt                                | BP-007                                         |
| Revenue assurance                      | Future capability / designated downstream pack |
| Sales order                            | BP-006                                         |

Do not implement capabilities owned by another IP simply because the model could support them.

---

# 7. Reuse IP-01

Use the existing IP-01 contract.

Locate and understand:

* `BasePriceResolutionService`
* `ResolvedBasePrice`
* price provenance
* BP-003 pricing adapter
* existing commercial module exports
* existing CRM `PricingResolutionAdapter`

Do not duplicate these contracts.

The resulting architecture should be conceptually:

```text
BasePriceResolutionService
        ↓
ResolvedBasePrice
        ↓
Commercial Component Resolution
        ↓
ResolvedCommercialComponents
```

---

# 8. Component model

Design the model so that a commercial amount can be decomposed into identifiable components.

Example:

```text
KES 1,000
```

may eventually resolve to:

```text
PRINCIPAL     +1,000
COMMISSION      +100
TAX             +198
DISCOUNT         -50
--------------------
PAYABLE       1,248
```

The system must preserve component identity rather than returning only a single opaque amount.

Do not assume that every transaction has every component.

For example:

```text
Principal only
Principal + Tax
Principal + Commission
Principal + Tax + Commission
Principal - Discount
```

must all be representable.

---

# 9. Backend-first requirement

This is a **backend commercial capability**, not a UI pricing exercise.

Do not build a new pricing UI.

Do not modify the BP-003 Product Workspace Pricing master unless absolutely required for an existing contract defect.

The primary deliverable is:

* service layer
* domain types
* rules
* validation
* adapter/contracts
* tests
* integration with IP-01

A UI is not required for IP-02 unless explicitly required by the approved IP-02 documentation.

---

# 10. Determinism

Commercial component resolution must be deterministic.

Given the same:

```text
businessId
resolved base price
commercial context
effective date
configured rules
```

the same component result must be produced.

Do not:

* randomly select rules
* silently ignore conflicts
* invent missing values
* silently fall back to arbitrary defaults

Where required configuration is missing or contradictory, fail explicitly using the established BP-005 error pattern.

---

# 11. Provenance

Every resolved commercial component must retain sufficient provenance to explain where it came from.

For example:

```text
component:
  type = PRINCIPAL
  amount = 1000
  source = BP-003 price item
  priceItemId = ...
  catalogueId = ...
  pricingMethod = FIXED
```

For future tax/commission/discount components, the model must be extensible enough to retain the corresponding rule/configuration identity.

Do not create fake provenance for capabilities that IP-03/IP-04 have not implemented yet.

---

# 12. Monetary correctness

Treat monetary values as financial values, not JavaScript floating-point arithmetic.

Inspect the existing platform monetary conventions and reuse them.

Do not introduce inconsistent money representations.

Ensure:

* currency is retained
* precision/scale is respected
* component arithmetic is deterministic
* rounding behaviour is explicit
* intermediate rounding is not silently introduced

Do not invent a new monetary convention if one already exists in the platform.

---

# 13. Currency

Commercial components must remain currency-aware.

At minimum:

```text
businessId
currency
base amount
component amounts
```

must remain associated.

Do not allow components from different currencies to be silently combined.

---

# 14. Tenant isolation

All resolution must remain scoped to:

```text
businessId
```

A commercial configuration belonging to Business A must never resolve for Business B.

Add explicit tests for cross-business isolation.

---

# 15. Database impact

Before creating migrations, inspect whether IP-02 genuinely requires persistence.

Do not create tables merely because the model could theoretically be persisted.

If IP-02 can operate using existing BP-003 configuration and in-memory resolution contracts, prefer that approach.

If persistence is required by the approved IP-02 requirements:

* follow existing Drizzle conventions
* update the migration
* update `_journal.json` according to the Integration Manager rules
* update `src/db/schema/index.ts`
* seed only required reference data
* validate migration ordering

Do not modify shared integration files casually.

---

# 16. Existing integration

The implementation must not break:

```text
BP-003 → IP-01
CRM quotation → PricingResolutionAdapter → IP-01
```

Existing IP-01 smoke tests must continue passing.

Existing BP-003 pricing tests must continue passing.

If an existing downstream consumer needs to consume the IP-02 contract, wire it through the appropriate adapter rather than creating a second resolution path.

---

# 17. Testing requirements

Create an IP-02 smoke-validation script consistent with IP-01.

At minimum test:

### TC-01 — Base component

Given a valid IP-01 `ResolvedBasePrice`:

```text
KES 1,000
```

verify that the principal/base component is represented correctly.

### TC-02 — Multiple components

Verify that multiple commercial components can coexist without losing component identity.

### TC-03 — Positive and negative components

Verify that additive and subtractive components are represented correctly.

### TC-04 — Monetary precision

Verify that component arithmetic respects the platform's monetary precision rules.

### TC-05 — Currency isolation

Verify that incompatible currencies cannot be silently combined.

### TC-06 — Business isolation

Business A configuration must not resolve for Business B.

### TC-07 — Determinism

Same inputs + same configuration must produce the same result.

### TC-08 — Missing configuration

Required configuration must fail explicitly rather than inventing a default.

### TC-09 — Provenance

Verify that the resulting components retain the expected source/provenance information.

### TC-10 — Regression

Verify:

* BP-003 IP-011 smoke
* BP-005 IP-01 smoke
* existing CRM pricing-resolution smoke

all remain passing.

Add additional tests where the approved IP-02 requirements demand them.

---

# 18. Quality gates

Run:

```bash
npm run typecheck
npm run lint
npm run db:migrate
```

if migrations are introduced.

Run:

```bash
npm run db:seed
```

only if new seed/reference data is introduced or required.

Run:

```bash
npx tsx scripts/bp005-ip02-<appropriate-name>-smoke-validation.ts
```

Use the repository's established smoke-test conventions.

---

# 19. Do not fix unrelated failures

If a quality gate exposes a failure that:

* predates IP-02
* is outside IP-02
* is unrelated to files changed by IP-02

do not modify unrelated application code merely to make the gate green.

Record:

```text
Pre-existing
Unrelated
Not caused by IP-02
```

and continue unless it genuinely blocks IP-02.

---

# 20. No premature implementation

Do NOT implement:

* tax calculation
* discount calculation
* commission rule engines
* pricing precedence
* final payable orchestration
* transaction snapshots
* payment splitting
* payment execution
* checkout
* receipts
* revenue assurance
* inventory
* sales orders

unless the approved IP-02 documentation explicitly assigns a specific part of that capability to IP-02.

If IP-02 requires a contract that later IPs consume, implement the **contract**, not the later capability itself.

---

# 21. Documentation requirement

At the end of implementation, update:

```text
IP-02 Commercial Component Definition & Composition.md
```

with:

* implementation status
* files created
* files modified
* architecture flow
* contracts introduced
* tests performed
* test results
* quality-gate results
* intentional boundaries
* known gaps
* downstream integration points

**Mandatory:** preserve the full implementation prompt in the IP-02 documentation, as we did for IP-01.

Append this exact instruction to the documentation:

> **Documentation preservation instruction:** Paste this full implementation prompt at the bottom of this IP-02 requirements document so that the approved implementation instructions, scope boundaries, architecture principles, testing requirements, and delivery expectations are permanently retained as part of the IP documentation.

---

# 22. Final handover

At completion provide a concise handover containing:

1. **IP-02 status**
2. Files created
3. Files modified
4. Architecture flow
5. Tests and results
6. Quality gates
7. Genuine defects found/fixed
8. Pre-existing failures
9. Intentional gaps/boundaries
10. Downstream dependencies
11. Whether migrations were introduced
12. Whether shared integration files were changed

Do not proceed to IP-03.

Stop after IP-02 and provide the handover for review/approval.

> **Documentation preservation instruction:** Paste this full implementation prompt at the bottom of this IP-02 requirements document so that the approved implementation instructions, scope boundaries, architecture principles, testing requirements, and delivery expectations are permanently retained as part of the IP documentation.

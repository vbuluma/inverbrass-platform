# BP-005 IP-03 – Tax Rules & Calculation

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-03 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-01, IP-02, ENG-003b, ENG-004 |
| Scope coverage | SC-007 |

---

## Objective

Maintain **tax types, rates, applicability and calculation rules** — including inclusive/exclusive pricing, taxable basis, effective dating and rounding — so tax components are calculated consistently and retained with full provenance.

---

## Business Problem

Tax treatment varies by jurisdiction, product class, customer type and date. Embedding tax logic in Sales or UI creates inconsistent payables and irreversible audit gaps. Tax must be configuration-driven, effective-dated and explained on every commercial result.

---

## Scope

### Included

- Configurable tax types and rates
- Effective-dated tax rules
- Tax-inclusive and tax-exclusive pricing modes
- Tax applicability rules (product, customer, location/jurisdiction, channel, exemptions)
- Taxable basis determination
- Tax component calculation and rounding (with IP-02)
- Retention of tax type, rate and taxable basis on each tax component
- Consumption of regulatory/localization context via ENG-003b where applicable

### Excluded

- Filing, remittance and tax authority returns (Finance / compliance future)
- GL tax posting (BP-010 / Finance)
- Document generation of tax invoices (ENG-015 / BP-007 billing documents)
- Payment of tax amounts (BP-007)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Support configurable tax types and rates per business / jurisdiction context. |
| BR-002 | Support effective-dated tax rules without rewriting history. |
| BR-003 | Support tax-inclusive and tax-exclusive pricing. |
| BR-004 | Determine tax applicability via configurable rules. |
| BR-005 | Retain tax type, rate and taxable basis for each tax component. |
| BR-006 | Align with localization/regulatory context (ENG-003b) where configured. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Support configurable tax types and rates. | FR-016 |
| FR-002 | Support effective-dated tax rules. | FR-017 |
| FR-003 | Support tax-inclusive and tax-exclusive pricing. | FR-018 |
| FR-004 | Determine tax applicability using configurable rules. | FR-019 |
| FR-005 | Retain tax type, rate and taxable basis used for each tax component. | FR-020 |
| FR-006 | Apply currency rounding consistently with IP-02. | FR-014 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Tax rules are isolated by `businessId` (and jurisdiction keys where configured). |
| BRU-002 | Inclusive pricing must reverse-calculate tax consistently with configured formula. |
| BRU-003 | Exempt or zero-rated treatments must be explicit — not silent omission without rule match. |
| BRU-004 | Multiple applicable taxes must follow IP-05 precedence / stacking configuration. |
| BRU-005 | Committed snapshots retain historical rate/basis even if current rates change (IP-06). |

---

## High-Level Process Flow

```
Composition context (taxable items, mode, jurisdiction, date)
        ↓
Load effective tax rules
        ↓
Evaluate applicability (ENG-004 / configured predicates)
        ↓
Determine taxable basis
        ↓
Calculate tax amount (inclusive or exclusive path)
        ↓
Emit tax component(s) with type, rate, basis → IP-02
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Tax types | VAT, GST, sales tax, levy codes |
| Rates | Rate value, effective from/to |
| Inclusivity default | Per catalogue / channel / offering |
| Applicability | Product tax class, customer tax profile, location |
| Stacking | Compound vs parallel taxes |
| Rounding | Per tax type / currency |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-02 | Tax as commercial component |
| IP-05 | Conflict / multiple-tax precedence |
| IP-06 / IP-07 | Snapshot and expected amounts |
| ENG-003b | Jurisdiction / regulatory context |
| ENG-004 | Applicability decision tables |
| BP-002 | Customer tax attributes where modelled |
| BP-003 | Offering tax class attributes where modelled |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Tax rule inventory | Active rates by jurisdiction/date |
| Tax component totals | Aggregates for downstream assurance (read model) |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Tax-exclusive and tax-inclusive modes produce correct tax and payable for the same net commercial intent. |
| AC-002 | Effective dating selects the correct rate for the resolution date. |
| AC-003 | Each tax component retains type, rate and taxable basis. |
| AC-004 | Missing tax configuration fails explicitly when tax is required (IP-09). |
| AC-005 | Rate changes do not alter committed snapshots. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Implemented in `03-platform` (2026-08-12) |
| Related FRs | FR-014, FR-016–FR-020 |
| UX | `/commercial/resolve` — progressive workspace (IP-03 step; session tax rules) |
| Smoke | `npx tsx scripts/bp005-ip03-tax-resolution-smoke-validation.ts` — PASS |
| Migrations | None (no new `tax_rule` tables; consumes in-memory `TaxRuleConfiguration`; pre-existing `tax_type` reference table codes-only not used as rate master) |

---

## Implementation Status

### Architecture flow (implemented)

```text
IP-01 ResolvedBasePrice
      ↓
TaxAwareCommercialCompositionService
      ↓
TaxResolutionService
      ↓
IP-02 CommercialCompositionService
      ↓
ResolvedCommercialComposition
```

### Files created

| File | Purpose |
|------|---------|
| `03-platform/src/modules/commercial/services/tax-calculation-rules.ts` | Inclusive/exclusive tax calculation & rounding |
| `03-platform/src/modules/commercial/services/tax-applicability-rules.ts` | Effective-dated applicability matching |
| `03-platform/src/modules/commercial/services/tax-resolution-service.ts` | Tax resolution orchestrator |
| `03-platform/src/modules/commercial/services/tax-composition-bridge.ts` | TaxAwareCommercialCompositionService bridge to IP-02 |
| `03-platform/scripts/bp005-ip03-tax-resolution-smoke-validation.ts` | IP-03 smoke validation |

### Files modified

| File | Change |
|------|--------|
| `03-platform/src/modules/commercial/constants.ts` | Tax treatment / error-related constants |
| `03-platform/src/modules/commercial/errors.ts` | IP-03 error codes |
| `03-platform/src/modules/commercial/types.ts` | Tax resolution contracts |
| `03-platform/src/modules/commercial/index.ts` | Public exports |
| `03-platform/src/modules/commercial/services/commercial-composition-service.ts` | `principalAmountOverride` for inclusive tax |
| This document | Status, implementation status, prompt archive |

### Contracts introduced

- `TaxRuleConfiguration`
- `TaxResolutionRequest`
- `TaxResolutionResult`
- `ResolvedTaxComponent`
- `TaxAwareCommercialCompositionService`

### Intentional boundaries / known gaps

- No `tax_rule` persistence
- ENG-003b / ENG-004 not wired
- IP-05 full precedence deferred (ties fail closed)
- `tax_type` table is codes-only pre-existing (not used as rate master)
- **IP-11 owns tax compliance / remittance / evidence** — see `IP-11 Tax Compliance, Remittance & Evidence Management.md`. IP-03 calculates tax liability only; it is **not** a filing/remittance/compliance engine.

---

## UX / Interaction Standards (boundary)

**UI implemented** — progressive commercial resolution workspace consuming IP-03 after IP-01/IP-02.

| Item | Value |
|------|-------|
| Route | `/commercial/resolve` |
| Workspace | `src/modules/commercial/components/commercial-resolution-workspace.tsx` |
| Flow | Base price (IP-01) → Components (IP-02) → Tax (IP-03) → Review |
| Standards | Platform UX-001: stepper/progress, Previous/Next, contextual field errors, loading/success feedback, empty states, guidance column, sticky action footer |
| Tax UX note | Session tax rule input only — no persisted tax-rule master UI yet |
| Components reused | `PlatformEmptyState`, `PlatformProcessingButton`, `PlatformFormActionFooter`, `PlatformInlineFormFeedback` |
| Out of scope | No customer-facing tax UI; no tax configuration admin screens |

Downstream UI MUST continue to reuse BP-001–BP-004 platform components and patterns — do not invent a separate UX language for commercial resolution.

---

## Implementation Prompt (archived)

You are implementing **BP-005 IP-03 — Tax Resolution & Tax Components** for the InverBrass Platform.

## 1. Role

Act as the implementation engineer for this IP.

Implement **only IP-03**.

Do not implement IP-04, IP-05, IP-06, IP-07, IP-08, IP-09, or IP-10 except where a minimal interface/contract is required for IP-03 integration.

Do not modify unrelated Build Packs.

Do not redesign BP-003 pricing.

Do not implement payment, billing, receipting, inventory, checkout, or order processing.

---

# 2. Build Pack Context

**Build Pack:** BP-005 — Pricing, Tax & Commercial Rules
**IP:** IP-03 — Tax Resolution & Tax Components

BP-005 is the commercial rules/resolution layer.

The architectural principle is:

> **BP-003 owns configured base prices. BP-005 determines the commercial meaning of those prices for a transaction.**

The current chain is:

```text
BP-003 Pricing
      ↓
IP-01 Base Price Resolution
      ↓
IP-02 Commercial Composition
      ↓
IP-03 Tax Resolution
      ↓
IP-04 Discount / Commission
      ↓
IP-05 Precedence / Conflict
      ↓
IP-06 Commercial Resolution / Snapshot
```

IP-01 and IP-02 are already implemented.

---

# 3. Existing Contracts You MUST Consume

IP-03 must consume the **IP-02 commercial composition contract**.

Do not bypass IP-01/IP-02 and read `pricing_item` directly.

The intended flow is:

```text
BasePriceResolutionService
        ↓
CommercialCompositionService
        ↓
TaxResolutionService
        ↓
Tax component(s)
        ↓
ResolvedCommercialComposition
```

The principal/base amount must originate from IP-01/IP-02.

IP-03 owns the **tax calculation/resolution**, not the base price.

---

# 4. Objective

Implement a deterministic tax-resolution capability that can determine applicable tax treatment for a commercial transaction and produce explicit tax component(s) that can be consumed by the commercial composition pipeline.

The implementation must support:

* tax applicability
* tax type selection
* tax rate resolution
* inclusive/exclusive tax treatment
* tax calculation
* multiple tax components where legitimately configured
* tax provenance
* rounding
* exact monetary reconciliation
* fail-closed behaviour where tax configuration is missing or ambiguous

The result must be suitable for downstream payable calculation.

---

# 5. Critical Architectural Principle

Tax must **not** be treated as a simple percentage hardcoded into a service.

The design must allow future configuration such as:

```text
Product / Offering
Customer / Segment
Business
Industry
Transaction Type
Channel
Tax Type
Tax Rate
Effective Date
Tax Inclusion
```

However, **do not invent database tables or configuration models that the current repository does not support**.

First inspect the existing schema, services, seeds, and BP-003/BP-005 contracts.

If required tax configuration does not currently exist, implement the IP-03 resolution abstraction against the available model and document the missing configuration capability rather than creating an uncontrolled parallel master.

---

# 6. Scope

## Included

### Tax applicability

Determine whether tax applies to the commercial component based on available configuration.

### Tax type

Resolve the applicable tax type/code.

Examples may include:

```text
VAT
ZERO_RATED
EXEMPT
OTHER_CONFIGURED_TAX
```

Do not hardcode these as the only possible future values.

### Tax rate

Resolve the applicable configured rate.

Support effective-dated rates where the existing architecture supports effective dating.

### Tax treatment

Support:

* tax exclusive
* tax inclusive
* zero tax
* exempt treatment

Where the underlying repository does not yet distinguish these configurations, create the appropriate domain contract without inventing persistence.

### Calculation

Calculate the tax amount from the applicable taxable base.

### Multiple components

The design should allow more than one tax component where configuration legitimately requires it.

Do not assume that all businesses or industries have only one tax.

### Provenance

Every resolved tax component must identify the source configuration/rule used to derive it.

For example:

```text
taxType
taxRate
taxRuleId / configurationId where available
effectiveAt
calculation basis
```

### Money precision

Use the existing BP-005 money approach.

Do not use floating-point arithmetic for monetary calculations.

Preserve exactness through calculation and rounding.

### Reconciliation

The resulting commercial composition must remain internally consistent:

```text
principal
+ tax
+ commission
- discount
= payableCandidate
```

IP-03 should contribute tax components without corrupting the composition.

---

# 7. Explicitly Excluded

Do NOT implement:

* payment execution
* payment splitting
* cash/M-Pesa/card allocation
* receipting
* billing
* sales orders
* checkout
* inventory
* revenue assurance
* actual-vs-expected reconciliation
* settlement reconciliation
* tax filing/reporting
* KRA/eTIMS integration
* external tax APIs
* customer-facing tax UI
* tax configuration UI
* BP-003 pricing CRUD
* discounts
* commissions
* commercial snapshot persistence
* final payable persistence

These belong to later IPs or Build Packs.

---

# 8. Tax vs Payment Boundary

Do not confuse:

```text
Tax calculation
```

with:

```text
Payment allocation
```

For example:

```text
Price = KES 1,000
Tax = KES 160
Payable = KES 1,160
```

IP-03 determines the **KES 160 tax component**.

It does NOT determine whether the customer subsequently pays:

```text
KES 500 cash
KES 660 M-Pesa
```

Payment splitting belongs to the Payments/Sales transaction domain.

---

# 9. Tax vs Revenue Assurance Boundary

IP-03 determines the **expected commercial tax**.

It does not compare expected tax against actual collected/applied tax.

For example:

```text
Expected:
Principal = 1,000
Tax = 160
Expected payable = 1,160
```

Actual collection:

```text
Collected = 1,150
```

The variance/revenue-assurance question is **not IP-03**.

IP-03 should simply provide reliable expected values and provenance that later systems can use.

---

# 10. Inclusive vs Exclusive Tax

Where supported by the existing model, correctly handle:

### Exclusive

```text
Principal = 1,000
Tax rate = 16%

Tax = 160
Payable = 1,160
```

### Inclusive

If the configured commercial amount already includes tax:

```text
Gross = 1,160
Tax rate = 16%

Tax = 1,160 × 16 / 116
Principal = 1,000
```

Do not double-charge tax.

The calculation basis must be explicitly represented in the result.

---

# 11. Rounding

Establish deterministic rounding behaviour.

Do not allow JavaScript floating-point behaviour to determine monetary results.

The implementation must define:

* calculation precision
* tax rounding precision
* rounding mode
* component-level rounding behaviour

If the platform already has a monetary rounding convention, reuse it.

Do not introduce a competing convention.

---

# 12. Effective Dating

Where tax rates are effective-dated:

```text
resolutionDate < effectiveFrom
→ not applicable

effectiveFrom <= resolutionDate <= effectiveTo
→ candidate

resolutionDate > effectiveTo
→ expired
```

Do not silently select an expired rate.

Do not silently use a future rate for a current transaction.

If overlapping active tax rules create ambiguity, fail explicitly rather than arbitrarily choosing one.

This should remain compatible with IP-05's precedence/conflict handling.

---

# 13. Business Isolation

All tax resolution must be scoped by:

```text
businessId
```

A tax rule/configuration belonging to Business A must never be usable for Business B.

Add tests proving tenant isolation.

---

# 14. Fail-Closed Rules

The system must not invent tax treatment.

Examples:

### Missing required tax configuration

```text
TAX_CONFIGURATION_MISSING
```

### Multiple equally applicable tax rules

```text
TAX_CONFIGURATION_CONFLICT
```

### Invalid tax rate

```text
INVALID_TAX_RATE
```

### Invalid tax treatment

```text
INVALID_TAX_TREATMENT
```

Use the project's existing error conventions where available rather than blindly introducing new patterns.

---

# 15. Domain Contract

Create clear types/interfaces for the IP-03 boundary.

Conceptually:

```text
TaxResolutionRequest
TaxResolutionResult
ResolvedTaxComponent
TaxRule / TaxConfiguration reference
```

A resolved tax component should contain enough information for downstream systems to understand:

```text
what tax was applied
why it was applied
what rate was used
what amount it was calculated from
how much tax resulted
when it was resolved
which configuration/rule produced it
```

Do not expose internal repository implementation details unnecessarily.

---

# 16. Integration With IP-02

IP-03 must integrate cleanly with the existing:

```text
CommercialCompositionService
```

Do not replace the IP-02 composition model.

The intended model is:

```text
IP-01
ResolvedBasePrice
     ↓
IP-02
Principal component
     ↓
IP-03
Tax component(s)
     ↓
Commercial composition
```

IP-02 must continue to work when no tax is supplied.

Existing IP-01 and BP-003 regression tests must remain passing.

---

# 17. Testing

Create a dedicated smoke validation script:

```text
03-platform/scripts/bp005-ip03-tax-resolution-smoke-validation.ts
```

Do not create production functionality inside the smoke script.

The script is a validation/test harness only.

At minimum test:

### TC-01 — Tax applies

Given valid taxable principal and configured tax:

```text
Principal = 1,000
Rate = 16%
```

Expected:

```text
Tax = 160
```

---

### TC-02 — Tax-exclusive calculation

Verify:

```text
1,000 + 160 = 1,160
```

---

### TC-03 — Tax-inclusive calculation

Given:

```text
Gross = 1,160
Rate = 16%
```

Verify:

```text
Tax = 160
Principal = 1,000
```

---

### TC-04 — Zero-rated treatment

Verify that a configured zero-rated treatment produces:

```text
Tax = 0
```

without incorrectly treating it as missing configuration.

---

### TC-05 — Exempt treatment

Verify exempt treatment produces the correct zero-tax result and retains the correct tax treatment/provenance.

---

### TC-06 — Effective dating

Test:

* current rate
* future rate
* expired rate

Ensure the correct rate is selected for the requested effective date.

---

### TC-07 — Tax configuration conflict

Create/represent two equally applicable tax configurations.

Expected:

```text
TAX_CONFIGURATION_CONFLICT
```

No silent selection.

---

### TC-08 — Missing configuration

Expected explicit failure.

No invented tax.

---

### TC-09 — Business isolation

Business A tax configuration must not resolve for Business B.

---

### TC-10 — Multiple tax components

Where supported by the available configuration model, verify multiple legitimate tax components compose correctly.

---

### TC-11 — Monetary precision

Test values that expose floating-point problems.

Ensure exact expected monetary results.

---

### TC-12 — IP-02 regression

Existing IP-02 smoke must still pass.

---

### TC-13 — IP-01/BP-003 regression

Run the existing IP-01 and relevant BP-003 pricing smoke tests.

---

# 18. Quality Gates

Before handover:

```bash
npm run lint
npm run typecheck
npm run db:migrate
npm run db:seed
```

Run:

```text
BP-003 relevant smoke
BP-005 IP-01 smoke
BP-005 IP-02 smoke
BP-005 IP-03 smoke
```

Do not modify unrelated failing tests simply to make the IP pass.

If a failure is pre-existing and unrelated, document it clearly.

---

# 19. Database / Shared Integration Rule

Do NOT add migrations unless IP-03 genuinely requires persistence that already belongs to BP-005.

If no migration is required, explicitly report:

```text
No migrations
No schema barrel changes
No seed changes
```

Do not modify:

```text
drizzle/meta/_journal.json
src/db/schema/index.ts
src/db/seed.ts
```

unless genuinely required.

If shared integration files are required, stop and clearly identify the requirement before changing them.

---

# 20. Architectural Rules

Do not:

* duplicate BP-003 pricing
* query `pricing_item` directly from IP-03
* create a second pricing master
* put tax logic into CRM
* put tax logic into quotation service
* hardcode industry-specific tax assumptions
* couple tax resolution to payment
* couple tax resolution to receipting
* create UI prematurely
* create speculative database tables
* bypass IP-01/IP-02
* implement future IPs

Prefer:

* pure calculation functions
* explicit contracts
* deterministic resolution
* immutable resolution results
* provenance
* fail-closed behaviour
* business isolation
* regression-safe integration

---

# 21. Deliverable

At completion provide a concise handover containing:

1. **Status**
2. **Files created**
3. **Files modified**
4. **Architecture flow**
5. **Tax-resolution contract**
6. **Test cases and results**
7. **Quality-gate results**
8. **Defects found/fixed**
9. **Intentional gaps**
10. **Migration/schema/seed changes**
11. **Downstream integration**
12. **Confirmation that IP-04+ was not implemented**

Do not proceed to IP-04 after completing IP-03.

Stop for review.

---

# 22. Documentation Requirement

At the bottom of:

```text
02-build-packs/build pack 005-Pricing, Tax & Commercial Rules/IP-03 Tax Resolution & Tax Components.md
```

append this **full implementation prompt verbatim** so that the implementation instructions are permanently archived with the IP documentation.

Update the document status to reflect the actual implementation state.

---

# 23. Final Principle

The commercial architecture must ultimately support:

```text
BP-003 Base Price
        ↓
IP-01 Applicable Base Price
        ↓
IP-02 Component Composition
        ↓
IP-03 Tax
        ↓
IP-04 Discount / Commission
        ↓
IP-05 Precedence / Conflict
        ↓
IP-06 Commercial Resolution + Snapshot
        ↓
IP-07 Expected Amount Validation
        ↓
IP-08 Governance / Configuration
        ↓
IP-09 Validation / Explainability
        ↓
IP-10 Downstream Commercial API
```

The objective is **not merely to calculate tax**.

The objective is to establish a robust, deterministic, auditable commercial-resolution architecture that can later support different industries, products, customers, channels, tax treatments and transaction contexts **without creating multiple competing pricing/tax engines**.

**Implement IP-03 only. Run the tests. Archive this prompt in the IP-03 documentation. Stop after handover.**

# BP-005 IP-01 – Base Price Consumption & Applicable Selection

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-01 |
| Build Pack | **BP-005** – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | BP-001, **upstream** BP-003 IP-011 (read-only), ENG-004 |
| Scope coverage | SC-001, SC-002, SC-003, SC-004 |
| Clarification | This is a **BP-005** IP. It does **not** implement BP-003. |

---

## Objective

Provide deterministic **base-price consumption and candidate selection** for commercial transactions by reading BP-003 offering prices — **without owning or duplicating the price master**. Winning-price arbitration among candidates is owned by **IP-05**.

### Pack principle (mandatory)

> **BP-003 defines what a product/offering costs. BP-005 determines what that price means commercially for a specific transaction.**

IP-01 answers: *which BP-003 base/unit price candidates match this commercial context?*  
**IP-05** answers: *which candidate wins under precedence/conflict rules?*  
Tax, discount, commission, payable and snapshot are owned by later BP-005 IPs.

---

## Business Problem

Businesses need multiple catalogues, channels, segments, currencies and effective-dated prices. BP-003 IP-011 already stores offering unit prices. Downstream packs must not invent their own price lookup. BP-005 must resolve *which* price applies for a commercial context and retain provenance of that selection for charge composition and snapshots.

---

## Architecture Boundary (mandatory)

| Owner | Responsibility | Example |
|-------|----------------|---------|
| **BP-003 IP-011** | Configured / base price master; Product Workspace Pricing UI | Product X = KES 1,000 |
| **BP-005 IP-01** | Consume BP-003 prices; identify candidate applicable prices for transaction dimensions; pass candidates/context to **IP-05**; consume the returned winner; retain catalogue/item/method provenance | Candidates → IP-05 → winner base = 1,000 |
| **BP-005 IP-05** | Deterministic precedence / conflict resolution over candidates; returns the single winning price (or explicit failure) | Winner + explanation |
| **BP-005 IP-02…IP-07** | Commercial meaning: components, tax, discount, commission, payable, expected amounts | Payable 1,230 with breakdown |
| **Not BP-005** | Second pricing master, payment split, actual-vs-collected RA | — |

> IP-01 **consumes** BP-003. It does **not** replace `pricing_catalogue` / `pricing_item` / `pricing_method` or the Product Workspace Pricing tab.

---

## Scope

### Included

- Consume multiple pricing catalogues / price lists per business (BP-003)
- Consume configurable pricing methods (fixed, tiered, usage, etc. as configured in BP-003)
- Effective-dated price selection and pricing lifecycle awareness (active / future / expired)
- Identify candidate unit/base prices using dimensions: product/offering, customer context, channel, catalogue, currency, quantity, effective date
- Pass candidate prices and resolution context to **IP-05** for deterministic precedence / conflict resolution; consume the returned winner (IP-01 does not independently arbitrate conflicts)
- Retain the pricing rule / catalogue / price item identity used to derive the resolved price
- Expose resolved base price into the commercial resolution pipeline (IP-06)

### Excluded

- Creating or owning product/offering master (BP-003)
- Replacing BP-003 pricing CRUD UI as the master of unit prices (Product Workspace Pricing remains BP-003)
- Precedence / conflict arbitration among multiple matching prices (owned by **IP-05**)
- Tax, discounts, commissions composition (IP-02–IP-04)
- Transaction snapshot persistence (IP-06)
- Payment or order creation (BP-006 / BP-007)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Support multiple pricing catalogues per business via BP-003 consumption. |
| BR-002 | Support configurable pricing methods without hardcoding industry models. |
| BR-003 | Support effective-dated pricing so future prices do not alter current resolution incorrectly. |
| BR-004 | Resolve the applicable price using configured commercial dimensions. |
| BR-005 | Retain provenance of catalogue / price item / method used for each resolution. |
| BR-006 | Keep offering master independent from commercial resolution logic. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Resolve price against multiple pricing catalogues per business. | FR-001 |
| FR-002 | Honour configured pricing methods when selecting / interpreting price. | FR-002 |
| FR-003 | Support effective-dated pricing selection. | FR-003 |
| FR-004 | Respect pricing lifecycle states (e.g. draft/active/expired as provided by BP-003). | FR-004 |
| FR-005 | Resolve applicable price using product, customer, channel, catalogue, currency, quantity and effective date. | FR-005 |
| FR-006 | Identify candidate applicable prices and pass candidates/context to **IP-05** for deterministic precedence/conflict resolution; consume the winner returned by IP-05. | FR-006 |
| FR-007 | Retain pricing rule/catalogue/price-item identity on the resolution result. | FR-007 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Resolution must be scoped by `businessId`. |
| BRU-002 | For a given dimension combination and effective date, the resolution outcome is a single winning price — **guaranteed by IP-05** precedence/conflict resolution over IP-01 candidates (no silent pick by IP-01). |
| BRU-003 | Expired prices are not selected for new resolutions after expiry. |
| BRU-004 | Future-dated prices apply only when the resolution effective date reaches them. |
| BRU-005 | Missing required price configuration fails explicitly (IP-09) — no invented default price. |
| BRU-006 | Resolved base price feeds principal/base component in IP-02; it is not the final payable. |

---

## High-Level Process Flow

```
Resolution Request
  (businessId, offering, party/customer, channel, catalogue?, currency, qty, date)
        ↓
Load candidate price items from BP-003 IP-011
        ↓
Filter by effective dating + lifecycle + dimensions
        ↓
Pass candidates + context → IP-05
  (IP-05 owns precedence / conflict resolution)
        ↓
Receive winning price item + method from IP-05
  (or explicit failure if unresolved)
        ↓
Emit ResolvedBasePrice + provenance → IP-02 / IP-06
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Default catalogue | Per business / channel / segment |
| Dimension priority | Catalogue vs channel vs segment vs quantity tier |
| Currency defaults | Business operating currency |
| Quantity tier interpretation | Inclusive/exclusive bounds |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| BP-003 IP-011 | Read catalogues, items, methods |
| BP-002 | Optional customer segment / party attributes for dimension matching |
| BP-001 | Business context, currency defaults |
| ENG-004 | Precedence / eligibility decision tables where configured |
| IP-05 | Owns precedence / conflict resolution; IP-01 supplies candidates/context and consumes the returned winner |
| IP-06 | Commercial resolution orchestration |
| IP-09 | Fail-closed validation |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Price resolution coverage | Offerings without resolvable price for default dimensions |
| Catalogue usage | Resolutions by catalogue |
| Ambiguous matches | Near-conflicts detected by IP-05 |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Given valid BP-003 prices and dimensions, IP-01 identifies candidates, obtains the IP-05 winner, and returns a single deterministic base price with provenance. |
| AC-002 | Effective dating filters candidates correctly for past, current and future resolution dates. |
| AC-003 | Ambiguous candidates are passed to IP-05; IP-01 does not silently pick a winner. |
| AC-004 | No new offering unit-price master tables are introduced that duplicate BP-003 IP-011. |
| AC-005 | Resolution is isolated by `businessId`. |

---

## UX / Interaction Standards (boundary)

**UI implemented** — progressive commercial resolution workspace consuming IP-01.

| Item | Value |
|------|-------|
| Route | `/commercial/resolve` |
| Workspace | `src/modules/commercial/components/commercial-resolution-workspace.tsx` |
| Flow | Base price (IP-01) → Components (IP-02) → Tax (IP-03) → Review |
| Standards | Platform UX-001: stepper/progress, Previous/Next, contextual field errors, loading/success feedback, empty + search states, guidance column, sticky action footer |
| Components reused | `PlatformSearchState`, `PlatformEmptyState`, `PlatformProcessingButton`, `PlatformFormActionFooter`, `PlatformInlineFormFeedback` |
| Out of scope | No second pricing master UI; BP-003 Product Workspace Pricing remains the price master |

Downstream UI MUST continue to reuse BP-001–BP-004 platform components and patterns — do not invent a separate UX language for commercial resolution.

---

## Document Control

| Item | Value |
|------|-------|
| Status | Approved — clarification applied (IP-01 candidates → IP-05 winner); **implemented** in `03-platform` |
| Related FRs | FR-001–FR-007 |
| Clarification | IP-01 identifies candidates; IP-05 owns precedence/conflict resolution and returns the winner |
| Implementation | `src/modules/commercial/` — `BasePriceResolutionService`; CRM `PricingResolutionAdapter` consumes IP-01 |
| UX | `/commercial/resolve` — progressive workspace (IP-01 step) |
| Smoke | `npx tsx scripts/bp005-ip01-base-price-resolution-smoke-validation.ts` |

---

## Implementation Prompt (archived)

Implement BP-005 IP-01 — Base Price Consumption & Applicable Selection

The approved IP-01 specification is the source of truth. Implement it fully in the existing platform. Do not redesign the requirements and do not expand into IP-02+ or BP-006.

Objective

Build the BP-005 backend capability that consumes the existing BP-003 pricing master and deterministically identifies the applicable base/unit price for a commercial context.

Critical ownership rule:

BP-003 IP-011 remains the authoritative owner of pricing_catalogue, pricing_item, pricing_method and the existing Product Workspace Pricing capability.
BP-005 IP-01 must not create a second pricing master.
BP-005 IP-01 is a consumer/resolution layer.
IP-01 determines the applicable base price and preserves its provenance.
Tax, discount, commission, payable calculation and commercial snapshots belong to later BP-005 IPs and must NOT be implemented here.
Payment/order creation belongs to later Build Packs and must NOT be implemented here.
Implement
Pricing resolution contract/service
Create a clean service/API contract for requesting base-price resolution.
Request context must support, where applicable:
businessId
offering/product
party/customer context
channel
catalogue
currency
quantity
effective date
Return:
resolved base/unit price
currency
pricing method
pricing catalogue identity
pricing item identity
relevant provenance/context
effective date used
Make the result suitable for consumption by the future BP-005 commercial-resolution pipeline.
Consume BP-003 pricing
Reuse the existing BP-003 schema and services.
Do not duplicate pricing tables.
Do not duplicate pricing CRUD logic.
Inspect the actual existing BP-003 implementation before coding and use its real contracts/field names.
Effective dating
Correctly distinguish past, current and future prices.
A future price must not become applicable before its effective date.
An expired price must not be selected for a new resolution after expiry.
Resolution must accept an explicit effective/as-at date rather than relying blindly on current system time.
Lifecycle
Respect the lifecycle states supplied by BP-003.
Do not select draft/inactive/expired pricing where the existing BP-003 lifecycle says it is not applicable.
Do not invent lifecycle states.
Commercial dimensions
Support the dimensions already represented/configured by BP-003.
Where a dimension is optional, do not invent assumptions.
Inspect the existing schema/configuration and document any dimension that is not yet represented by BP-003 rather than creating a parallel model.
Candidate selection and conflicts
Build candidate-price identification separately from final precedence/conflict resolution.
Do not silently choose between genuinely conflicting candidates.
Where IP-05 is the designated owner of precedence/conflict resolution, expose the candidate/context information required by IP-05 and keep the boundary explicit.
If the existing architecture already provides an eligibility/precedence mechanism through ENG-004, integrate with it rather than creating another rules engine.
Missing configuration
Fail explicitly when no applicable price exists.
Never invent a default price.
Use the platform's existing error/validation conventions.
Tenant isolation
Every resolution must be scoped to businessId.
A price belonging to Business A must never be resolvable by Business B.
Test this explicitly.
Provenance
The resolution result must retain enough information to answer:
Which catalogue was considered/selected?
Which pricing item produced the price?
Which pricing method was used?
Which effective date was used?
Which commercial dimensions were used for the selection?
Do not create a persistent transaction snapshot yet; that belongs to the later IP specified for snapshots.
Important architectural constraint

Do not implement:

tax calculation
discounts
commissions/fees
principal + charge + tax component composition
final payable calculation
payment split
cash/M-Pesa/card allocation
sales orders
checkout
receipts
actual-vs-expected revenue assurance
reconciliation
new pricing master/UI

IP-01 should essentially answer:

"Given this business, offering, customer/context, catalogue/channel/currency/quantity and effective date, which BP-003 base price applies, and why?"

Testing

Add/update appropriate automated tests and an IP-01 smoke/runtime validation script following the existing BP-001–BP-004 testing conventions.

At minimum prove:

TC-01 — Single applicable price

Configure a BP-003 price.
Resolve it through IP-01.
Verify the correct price and provenance.

TC-02 — Effective dating

Have past/current/future price records.
Resolve at different effective dates.
Verify the correct price is selected each time.

TC-03 — Multiple catalogues/dimensions

Create valid candidate prices across supported catalogues/dimensions.
Verify candidate selection behaves deterministically according to the existing rules/boundary.

TC-04 — Conflict

Create genuinely conflicting applicable candidates.
Verify there is no silent arbitrary selection.
Verify the conflict is exposed to the designated precedence/conflict mechanism.

TC-05 — Missing price

Resolve an offering with no applicable price.
Verify explicit failure; no fallback/invented price.

TC-06 — Tenant isolation

Create pricing for Business A.
Attempt resolution from Business B.
Verify Business A's pricing cannot be returned.

TC-07 — Pricing method

Verify the configured BP-003 pricing method is respected without duplicating pricing-method ownership.

TC-08 — Provenance

Verify the result identifies the actual catalogue/pricing item/method/effective context used.
Quality gates

Before declaring IP-01 complete:

npm run typecheck → PASS
npm run lint → PASS with no new errors
npm run db:migrate → PASS if migrations are required
existing BP-001–BP-004 tests/smokes must remain passing
IP-01 tests/smoke → PASS
verify no duplicate BP-003 pricing master/table has been introduced
Integration requirement

Do not only make the service compile.

Wire IP-01 into the existing application architecture at the appropriate service/adapter boundary so that a downstream consumer such as BP-005 IP-02 or BP-004/BP-006 can consume the resolution contract without bypassing IP-01.

The existing BP-004 quotation → PricingResolutionAdapter → BP-003 pricing path is particularly important. Inspect it before implementation and avoid creating a competing pricing-resolution mechanism.

Deliverable

At completion provide:

Files created/modified.
IP-01 implementation summary.
Exact BP-003 components consumed.
Confirmation that no duplicate pricing master was created.
Tests executed and results.
Quality-gate results.
Any genuine architectural gaps discovered.
Explicit confirmation that IP-02+ and BP-006 scope was not implemented.
Paste this full prompt at the bottom of IP-01 Base price consumption & applicable selection.md so that it is saved as part of documentation
Do not stop at analysis or produce a proposal. Implement IP-01 in the repository, validate it, and report the actual result.

# BP-005 IP-05 – Pricing Precedence, Eligibility & Conflict Resolution

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-05 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-01 (candidates), BP-003 IP-011 (price master) |
| Related | Replaces interim IP-05 port used by IP-01; tax/discount family precedence remains within IP-03/IP-04 fail-closed paths pending ENG-004 |

> **Note:** Earlier draft title was “Rule Precedence & Conflict Management”. This document is the authoritative IP-05 implementation record for **base-price** precedence. Broader commercial-rule family precedence (tax/discount stacking matrices via ENG-004) remains an intentional gap beyond this IP’s price-candidate scope.

---

## Objective

Implement the authoritative pricing precedence and conflict-resolution capability for BP-005. IP-05 determines which eligible BP-003 pricing candidate wins when multiple configured prices could apply — deterministically, explainably, auditably, tenant-safely, and fail-closed.

---

## Implementation Status

**Implemented** in `03-platform` (2026-08-12).

### Architecture flow (implemented)

```text
BP-003 Pricing Master
        ↓
BP-005 IP-01 BasePriceResolutionService
  → Bp003PricingReadAdapter (tenant-scoped read)
  → filterApplicableCandidates (eligibility / lifecycle / effective dating)
        ↓
eligible BasePriceCandidate[]
        ↓
BP-005 IP-05 Ip05BasePricePrecedenceResolver
  → explicit specificity weights
  → winner OR PRICE_CONFLICT OR NO_ELIGIBLE_PRICE
  → structured explanation metadata
        ↓
ResolvedBasePrice (+ provenance.precedenceDecision)
        ↓
IP-02 / IP-03 / IP-04 / CRM quotations
```

### Precedence model (explicit)

Weights live in `BASE_PRICE_PRECEDENCE_WEIGHTS`:

| Dimension | Rule | Weight key |
|-----------|------|------------|
| Catalogue | Request names catalogue and candidate matches | `CATALOGUE_EXACT` (50) |
| Customer segment / channel / region | Exact match | `DIMENSION_EXACT` (20) |
| Same dimensions | Wildcard when request specifies value | `DIMENSION_WILDCARD_WHEN_REQUESTED` (8) |
| Same dimensions | Both broad (null) | `DIMENSION_BOTH_BROAD` (5) |
| Same dimensions | Request unset, candidate narrowed | `DIMENSION_NARROW_UNUSED` (2) |
| Currency | Exact match | `CURRENCY_EXACT` (10) |

- Higher total score wins.
- Equal top score → **PRICE_CONFLICT** (no silent pick).
- Sort by `pricingItemId` is for **explanation list stability only**, never winner selection.
- `quantity` / `partyId` are **not scored** (unsupported on BP-003 `pricing_item`); noted on provenance only.

### Conflict behaviour

| Code | Service outcome | Meaning |
|------|-----------------|---------|
| `PRICE_RESOLVED` | `WINNER` | Unique winner |
| `PRICE_CONFLICT` | `CONFLICT` → `CommercialError` `BASE_PRICE_CONFLICT` | Equal specificity tie |
| `NO_ELIGIBLE_PRICE` | `MISSING` → `CommercialError` `MISSING_BASE_PRICE` | No eligible candidates |

Conflict details include tied pricing item IDs, catalogues, precedence stage (`SPECIFICITY_TIE`), and structured explanation.

### Provenance / explainability

`ResolvedBasePrice.provenance` retains IP-01 fields and adds:

- `selectionMode`: `SINGLE_CANDIDATE` | `SPECIFICITY`
- `precedenceOwner`: `IP-05`
- `precedenceDecision`: ranked scores, suppressed candidates, request dimensions, effectiveAt

### Files created

| File | Purpose |
|------|---------|
| `03-platform/src/modules/commercial/services/pricing-precedence-rules.ts` | Explicit scoring + explanation builders |
| `03-platform/scripts/bp005-ip05-pricing-precedence-smoke-validation.ts` | TC-01…TC-15 smoke |

### Files modified

| File | Change |
|------|--------|
| `ip05-base-price-precedence-port.ts` | Authoritative `Ip05BasePricePrecedenceResolver`; interim class is alias |
| `base-price-resolution-service.ts` | Wires IP-05; enriches conflict/missing details + provenance |
| `base-price-candidate-rules.ts` | Specificity moved to IP-05; re-exports score helpers |
| `types.ts` | Explanation / scored candidate contracts; selectionMode `SPECIFICITY` |
| `constants.ts` | Precedence weights, stages, resolution codes |
| `errors.ts` | Conflict message references PRICE_CONFLICT |
| `index.ts` | Public IP-05 exports |
| `commercial-resolution-actions.ts` | Conflict UX message for `/commercial/resolve` |
| `commercial-resolution-workspace.tsx` | Guidance copy for IP-05 |
| `pricing-resolution-adapter.ts` | Comment: CRM → IP-01 → IP-05 |

### Smoke-test results

Run: `npx tsx scripts/bp005-ip05-pricing-precedence-smoke-validation.ts`

**Result: 22/22 PASS** (2026-08-12) including TC-01…TC-15 and file/architecture checks.

| TC | Scenario | Expected |
|----|----------|----------|
| TC-01 | Single candidate | PRICE_RESOLVED |
| TC-02 | Specific beats generic | Channel-specific wins |
| TC-03 | Catalogue precedence | Requested catalogue wins |
| TC-04 | Effective dating | Past/current/future windows |
| TC-05 | Lifecycle | DRAFT/EXPIRED excluded |
| TC-06 | Exact tie | PRICE_CONFLICT |
| TC-07 | Determinism | Identical repeated results |
| TC-08 | Tenant isolation + IP-05 wiring | Contract checks |
| TC-09 | Missing price | NO_ELIGIBLE_PRICE |
| TC-10 | Provenance | Catalogue/item/method + explanation |
| TC-11 | IP-01 regression | External smoke |
| TC-12 | IP-02 regression | External smoke |
| TC-13 | IP-03 regression | External smoke |
| TC-14 | BP-003 IP-011 regression | External smoke |
| TC-15 | CRM quotation path | Adapter → BasePriceResolutionService only |

### Quality gates

| Gate | Result |
|------|--------|
| IP-05 smoke | **22/22 PASS** |
| Lint (IP-05 files) | PASS (0 errors) |
| Typecheck | Pre-existing only: `bp001-004-system-integration-certification.ts` (`"leads"`); **no IP-05 errors** |

### Migrations / schema / seed

**No `_journal.json`, `schema/index.ts`, or `seed.ts` changes were required.**

No new pricing master tables. No precedence configuration persistence (in-code weights).

### UX changes

- No new screen.
- Existing `/commercial/resolve` base-price step: conflict errors explain PRICE_CONFLICT, tied items, and next action (fix pricing master — do not pick arbitrarily).

### Intentional gaps / limitations

- ENG-004 decision tables not wired
- Cross-family tax/discount precedence matrices not unified here (IP-03/IP-04 keep fail-closed ties)
- No `quantity` / `partyId` scoring (BP-003 columns absent)
- No persisted precedence configuration table
- IP-08 rule versioning not implemented

### Downstream consumers

- IP-01 `BasePriceResolutionService` (mandatory)
- CRM `PricingResolutionAdapter` → quotations
- IP-02 / IP-03 / IP-04 consume `ResolvedBasePrice` unchanged

### Defects fixed

- Interim IP-05 used `effectiveFrom` as a sort key during ranking (not as silent winner, but ambiguous). IP-05 now ranks explanation lists by score + stable `pricingItemId` only.
- Selection mode renamed from `INTERIM_SPECIFICITY` → `SPECIFICITY`.

### Stop boundary

IP-06+ not started.

---

## Document Control

| Item | Value |
|------|-------|
| Status | **Implemented** in `03-platform` |
| Related FRs | FR-006, FR-024–FR-027 (pack); prompt FR-01…FR-02 |
| Smoke | `npx tsx scripts/bp005-ip05-pricing-precedence-smoke-validation.ts` — **22/22 PASS** |
| Migrations | None |
| UX | Conflict messaging on `/commercial/resolve` only |

---

## Related draft

See also: `IP-05 Rule Precedence & Conflict Management.md` (earlier pack draft — requirements for broader commercial-rule precedence; base-price engine is implemented here).

---

## Implementation Prompt (archived)

The full IP-05 implementation prompt from the user session is archived below without shortening or paraphrasing.

---

You are implementing BP-005 – Pricing, Tax & Commercial Rules.

Implementation Package

IP-05 — Pricing Precedence, Eligibility & Conflict Resolution

Objective

Implement the authoritative pricing precedence and conflict-resolution capability for BP-005.

IP-05 determines which eligible BP-003 pricing candidate wins when multiple configured prices could apply to the same commercial resolution request.

IP-05 must make pricing selection deterministic, explainable, auditable, tenant-safe, and fail-closed.

1. Critical Architecture Principles

These are mandatory.

BP-003 remains the price master

BP-003 owns:

Product/offering pricing configuration
pricing_catalogue
pricing_item
pricing_method
Product Workspace Pricing UI

Do not create another pricing master.

IP-05 consumes candidate prices through the existing BP-005/IP-01 contracts.

BP-005 owns commercial interpretation

BP-005 determines:

Given the eligible BP-003 prices and the commercial context, which price applies?

IP-05 owns:

Eligibility precedence
Specificity comparison
Conflict detection
Deterministic winner selection
Fail-closed ambiguity handling
Explanation of why a candidate won/lost

IP-05 does not own:

Product/offering CRUD
Pricing master CRUD
Payment
Checkout
Orders
Receipts
Actual collected amounts
Revenue assurance
Tax calculation
Discount calculation
Commission calculation
Final transaction settlement
2. Existing Architecture — Do Not Bypass

The intended flow is:

BP-003 Pricing Master
        ↓
BP-005 IP-01
BasePriceResolutionService
        ↓
candidate prices
        ↓
BP-005 IP-05
Precedence / Eligibility / Conflict Resolution
        ↓
single deterministic winner
        ↓
ResolvedBasePrice
        ↓
IP-02 / IP-03 / IP-04 / IP-06

IP-01 already has an interim IP-05 precedence port.

Replace/complete that interim implementation rather than creating a competing resolution mechanism.

Before changing anything:

Inspect the existing IP-01 implementation.
Inspect BasePriceResolutionService.
Inspect ip05-base-price-precedence-port.ts.
Inspect existing commercial types/contracts.
Inspect IP-02 and IP-03 consumers.
Inspect BP-003 pricing structures and rules.
Inspect existing smoke tests.
Inspect the BP-005 documentation.

Do not assume the documentation perfectly reflects the current code.

3. Functional Scope

Implement the following.

FR-01 — Candidate eligibility

Determine whether a candidate price is eligible for the resolution request.

Eligibility must consider the dimensions supported by the existing BP-003/IP-01 contracts, including where available:

businessId
offering/product
party/customer context
catalogue
channel
currency
quantity
effective date
pricing lifecycle/status
pricing method

Do not invent database columns that do not exist.

Where a dimension is unavailable in BP-003, represent that limitation explicitly rather than fabricating resolution behaviour.

FR-02 — Specificity

When multiple eligible candidates exist, compare their specificity.

The implementation must distinguish between:

broad/default price
catalogue-specific price
channel-specific price
customer/segment-specific price
quantity-specific price
other dimensions actually supported by the existing model

A more specifically targeted candidate should beat a broader candidate only according to an explicit deterministic precedence rule.

Do not rely on:

database insertion order
UUID order
arbitrary array order
LIMIT 1
"first matching record"
undocumented SQL ordering
4. Precedence Rules

Create a clear deterministic precedence model.

The precedence model must be:

Explicit

The order must be visible in code/configuration.

Deterministic

The same inputs must always produce the same winner.

Explainable

The resolution result must be able to explain why the winning candidate was selected.

Extensible

The architecture must allow additional commercial dimensions to be introduced later without rewriting the entire resolution engine.

Do not hardcode industry-specific assumptions into the generic engine.

5. Conflict Resolution

This is critical.

If two candidates remain equally eligible and equally specific after applying all configured precedence rules:

DO NOT silently select one.

Return a controlled conflict result.

Example:

PRICE_CONFLICT

The conflict response should identify:

resolution context
conflicting candidate identities
relevant catalogue/price-item references
dimensions causing the conflict
precedence stage reached
reason no unique winner could be determined

The caller must be able to distinguish:

NO_ELIGIBLE_PRICE

from

PRICE_CONFLICT

from

PRICE_RESOLVED
6. Fail-Closed Behaviour

The engine must never invent a price.

Examples:

No candidate
NO_ELIGIBLE_PRICE
Candidate expired

Exclude it.

Candidate future-dated

Exclude it unless the requested effective date makes it valid.

Two equal winners
PRICE_CONFLICT
Invalid commercial context

Return a controlled validation error.

Missing required configuration

Fail explicitly.

Never:

default to first price
default to cheapest price
default to latest inserted price
default to oldest price
default to zero

unless that behaviour is explicitly defined by an existing approved rule.

7. Effective Dating

Respect the effective date supplied by the resolution request.

Support:

past effective dates
current effective dates
future effective dates

The engine must not allow:

expired prices to win when they are outside their validity period
future prices to override current prices before their effective date

Boundary conditions must be explicitly tested.

8. Lifecycle Eligibility

Only candidates in an eligible lifecycle state may participate.

Use the states already provided by BP-003.

Do not invent new BP-003 lifecycle states.

Examples:

DRAFT → excluded
ACTIVE → eligible
EXPIRED → excluded

Use the actual repository/model values rather than assuming these exact names if the implementation differs.

9. Business / Tenant Isolation

Every resolution must remain scoped to businessId.

A candidate belonging to Business A must never resolve for Business B.

This must be explicitly tested.

Do not rely solely on UI filtering.

Tenant isolation must exist in the service/repository resolution path.

10. Provenance

The winning result must retain enough information to explain its origin.

At minimum preserve the existing IP-01 provenance contract, including where available:

catalogue ID
pricing item ID
pricing method
offering/product identity
applicable dimensions
effective date
precedence decision

Do not create duplicate pricing tables merely to store provenance.

11. Explainability

The resolution engine should produce structured explanation metadata.

For example:

candidateCount
eligibleCandidateCount
excludedCandidates
winningCandidate
precedenceDecision
conflict

The exact structure should follow existing project contracts.

The purpose is to allow downstream systems and future UI/reporting to answer:

"Why did the platform select KES 1,000 rather than KES 1,200?"

Do not build an artificial narrative/LLM explanation.

Use deterministic structured metadata.

12. IP-01 Integration

Replace the current interim IP-05 behaviour in IP-01.

Current interim behaviour:

specificity comparison
        ↓
tie
        ↓
CONFLICT

IP-05 should become the authoritative precedence implementation.

Do not duplicate precedence logic inside BasePriceResolutionService.

The architecture should become:

BasePriceResolutionService
        ↓
candidate retrieval / eligibility
        ↓
IP-05 precedence engine
        ↓
winner OR conflict
13. IP-02 / IP-03 Compatibility

Do not break existing commercial composition.

Existing flow must continue to work:

IP-01
 ↓
IP-02
 ↓
IP-03

Where tax-aware composition currently uses:

IP-01 → IP-03 → IP-02

preserve the existing approved contract unless there is a genuine architectural defect.

Do not redesign IP-02 or IP-03.

14. Persistence Boundary

IP-05 must not introduce a new pricing master.

Do not create tables for:

duplicate prices
duplicate catalogues
duplicate pricing items

If persistence is genuinely required for precedence configuration, first inspect the existing architecture and documentation.

Do not invent migrations merely to make implementation easier.

If no persistence model currently exists, implement the precedence engine using the existing contract/configuration boundary and document the limitation.

15. UX Requirement

IP-05 is primarily a commercial resolution engine.

Do not create UI merely to satisfy this IP.

However, if the existing BP-005 /commercial/resolve workspace needs to expose IP-05 decisions or conflicts, extend the existing workspace rather than creating a separate screen.

Where IP-05 is exposed to a user, follow the established BP-005 UX standards:

progressive stepper/state
clear current/completed/pending state
Previous/Next navigation where applicable
search where selection requires it
loading/progress feedback
empty states
success feedback
errors beside the affected step/field/tab rather than only at the top
clear next action
clear Previous/Next action
preserve navigation/back state
consistent platform action footer
reuse the existing BP-005 commercial-resolution workspace
do not create competing navigation patterns

For a pricing conflict, the UI should clearly communicate:

Price configuration conflict
↓
Why the candidates conflict
↓
What configuration needs attention
↓
Next action

Do not attempt to let the user arbitrarily pick a price if doing so would bypass the deterministic commercial rules.

If no UI is necessary, do not create one.

16. Regression Requirements

Do not regress:

BP-003
Pricing catalogue
Pricing item
Pricing methods
Product Workspace Pricing
Existing pricing resolution
BP-005
IP-01
IP-02
IP-03
CRM

Quotation pricing must continue to resolve through:

QuotationService
 → PricingResolutionAdapter
 → BasePriceResolutionService
 → IP-05
 → BP-003 pricing

CRM must not score prices locally.

17. Smoke Tests

Create:

03-platform/scripts/bp005-ip05-pricing-precedence-smoke-validation.ts

Tests must be read-only with respect to application code and should exercise the actual service layer.

At minimum test:

TC-01 — Single candidate

One eligible candidate returns that candidate.

TC-02 — Specific beats generic

A more specific eligible price beats a broad/default candidate according to the documented precedence.

TC-03 — Catalogue precedence

Where catalogue specificity is supported, the correct catalogue candidate wins.

TC-04 — Effective date

Current, future and expired candidates resolve correctly.

TC-05 — Lifecycle

Inactive/expired candidates cannot win.

TC-06 — Exact tie

Two candidates with identical precedence produce:

PRICE_CONFLICT

No silent winner.

TC-07 — Determinism

Repeated identical requests return the same result.

TC-08 — Tenant isolation

Business A cannot resolve Business B's price.

TC-09 — Missing price

Returns controlled:

NO_ELIGIBLE_PRICE
TC-10 — Provenance

Winning result contains the expected BP-003 catalogue/item/method provenance.

TC-11 — IP-01 regression

Existing BP-005 IP-01 smoke must continue to pass.

TC-12 — IP-02 regression

Existing IP-02 smoke must continue to pass.

TC-13 — IP-03 regression

Existing IP-03 smoke must continue to pass.

TC-14 — BP-003 regression

Existing BP-003 IP-011 pricing smoke must continue to pass.

TC-15 — CRM quotation regression

Quotation pricing continues through IP-01/IP-05 rather than local CRM pricing logic.

Add further tests where the existing model supports additional dimensions.

18. Quality Gates

Run:

npm run lint
npm run typecheck

and relevant smoke tests.

If there is a pre-existing unrelated failure, do not modify unrelated code merely to make the IP pass.

Clearly classify:

genuine IP-05 defect
pre-existing defect
test/harness defect
environment failure

Do not hide failures.

19. Shared Files

Do not modify shared integration files unless genuinely required.

Especially:

drizzle/meta/_journal.json
src/db/schema/index.ts
src/db/seed.ts

If no migration/schema/seed change is required, explicitly report:

No _journal.json, schema/index.ts, or seed.ts changes were required.

Do not manufacture changes.

20. No Scope Creep

Do NOT implement:

IP-06 transaction snapshots
payment split
payment execution
checkout
orders
receipting
revenue assurance
actual-vs-expected reconciliation
tax filing
additional pricing master
discount engine
commission engine
new pricing UI/master
IP-07+
BP-006+

Those belong to later approved scope.

21. Documentation

Update:

02-build-packs/build pack 005-Pricing, Tax & Commercial Rules/IP-05 Pricing Precedence, Eligibility & Conflict Resolution.md

with:

implementation status
files created
files modified
architecture flow
precedence model
conflict behaviour
provenance behaviour
smoke-test results
quality gates
defects found/fixed
intentional limitations
migrations/schema/seed impact
downstream consumers
regression results
Mandatory documentation rule

Paste this full implementation prompt at the bottom of the IP-05 documentation file so that the exact implementation instructions are permanently archived with the IP requirements.

Do not shorten or paraphrase the archived prompt.

22. Stop Boundary

Implement IP-05 only.

Do not start:

IP-06
IP-07
IP-08
IP-09
IP-10

At completion, provide a handover containing:

Status
Files created
Files modified
Architecture flow
Precedence rules implemented
Conflict handling
Provenance
Smoke tests and results
Quality gates
Genuine defects fixed
Pre-existing failures
Migrations/schema/seed impact
UX changes, if any
Intentional gaps
Downstream integration
Confirmation that IP-06+ was not started

Do not commit. Do not modify unrelated code. Do not proceed beyond IP-05.

# BP-005 IP-07 – Expected Commercial Amount

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-07 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-06 |
| Scope coverage | SC-013 |
| Related FRs | FR-033–FR-035 |

---

## Objective

Establish the **expected commercial amount** for a transaction — including component-level expected amounts — as the control basis for Payments, Reconciliation and Revenue Assurance, without BP-005 becoming a payment or assurance engine.

IP-06 freezes what the commercial calculation means. IP-07 determines what the business expects to receive/charge from that frozen commercial result. IP-07 must not recalculate pricing, tax, discounts or commissions independently.

---

## Business Problem

Payment collection and assurance need a stable “what should have been paid” figure. Without expected amounts at header and component level, under/over payments and leakage cannot be detected reliably against commercial truth.

---

## Scope

### Included

- Expected customer payable for a transaction
- Expected component-level amounts (principal, tax, commission, fees, discounts, etc.)
- Linkage to commercial snapshot / resolution result (IP-06)
- Consumability by downstream payment, reconciliation and assurance processes
- Clear separation: expected commercial ≠ actual payment received

### Excluded

- Recording actual payments or allocations (BP-007)
- Matching bank/M-Pesa statements (future reconciliation)
- Running revenue assurance investigations (future RA pack)
- GL expected vs posted variance accounting (Finance)
- Payment splitting / allocation
- Order creation, billing, receipting, inventory
- Tax remittance / filing (IP-11)
- IP-08+

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Establish expected commercial amount for a transaction. |
| BR-002 | Retain expected component-level amounts for applicable components. |
| BR-003 | Make expected commercial result consumable by Payments, Reconciliation and Assurance. |
| BR-004 | Preserve separation between expected commercial obligation and actual settlement. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Establish the expected commercial amount for a transaction. | FR-033 |
| FR-002 | Retain expected component-level amounts for principal, tax, commission, fees, discounts and other applicable components. | FR-034 |
| FR-003 | Expected commercial result shall be consumable by downstream payment, reconciliation and assurance processes. | FR-035 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Expected amounts are derived from committed commercial snapshot (or explicitly governed preview-to-commit path). |
| BRU-002 | Expected amounts are immutable once the commercial transaction is committed (same as snapshot). |
| BRU-003 | Partial payments do not change expected commercial — they create payment variance for BP-007 / future RA. |
| BRU-004 | Component expected amounts must reconcile to header expected payable. |

---

## High-Level Process Flow

```
CommercialSnapshot (IP-06)
        ↓
Materialise ExpectedCommercialAmount (header)
        ↓
Materialise ExpectedCommercialComponents[]
        ↓
Expose read API / events for BP-007 and future RA
        ↓
Actual payments compared externally (not in BP-005)
```

---

## Example Boundary

| Concept | Owner | Example |
|---------|-------|---------|
| Expected payable | BP-005 IP-07 | KES 300 |
| Order exists | BP-006 | Customer owes KES 300 |
| Actual paid | BP-007 | KES 100 cash + KES 200 M-Pesa |
| Shortfall analysis | Future RA | Expected 300 vs actual 280 |

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Component inclusion | Which components are control-relevant |
| Tolerance hooks | Reserved for future RA (BP-005 stores expected only) |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-06 | Snapshot source |
| IP-10 | Contract fields for expected amounts |
| BP-007 | Read expected payable / components |
| Future Reconciliation / RA | Compare expected vs actual |
| Future Finance | Consume expected commercial basis |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Expected payable register | By transaction / period |
| Component expected totals | Tax/commission/fee expected aggregates |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | After commit, expected header payable equals snapshot payable. |
| AC-002 | Component expected amounts are retained and reconcile to header. |
| AC-003 | Payment posting does not mutate expected commercial amounts. |
| AC-004 | Downstream read contract is documented in IP-10. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Implemented in `03-platform` (2026-08-12) |
| Smoke | `npx tsx scripts/bp005-ip07-expected-commercial-amount-smoke-validation.ts` — **23/23 PASS** |
| Migrations | None |
| UX | `/commercial/resolve` Review / Expected step owned by IP-06 → IP-07 |

---

## Implementation Status

**Implemented** in `03-platform` (2026-08-12).

### Architecture flow (implemented)

```text
BP-003 Price Master
        ↓
IP-01 Base Price Resolution
        ↓
IP-05 Precedence / Conflict Resolution
        ↓
IP-03 Tax Resolution
        ↓
IP-04 Commercial Components / Adjustments
        ↓
IP-02 Commercial Composition
        ↓
IP-06 Commercial Snapshot
        ↓
IP-07 Expected Commercial Amount
        ↓
Future BP-006 Sales / Orders
        ↓
Future BP-007 Payments / Billing / Receipting
        ↓
Future Revenue Assurance / Reconciliation
```

IP-07 consumes **IP-06 only** as its commercial source of truth. It does not read `pricing_item`, catalogues, tax masters, discount masters, or BP-003 pricing services.

### Persistence decision

**No database tables for expected amount.**

- Expected commercial amount is an application-level immutable value object derived from `CommercialSnapshot`.
- BP-006+ owns durable transactional storage when a transaction is committed.
- **No** `drizzle/meta/_journal.json` changes
- **No** `src/db/schema/index.ts` changes
- **No** `src/db/seed.ts` changes
- **No migration required**

### Files created

| File | Purpose |
|------|---------|
| `03-platform/src/modules/commercial/services/expected-commercial-amount-service.ts` | Validate snapshot, derive expected amount, reconcile, return contract |
| `03-platform/src/modules/commercial/services/expected-commercial-amount-rules.ts` | Pure classification / aggregation / formula reconstruction |
| `03-platform/scripts/bp005-ip07-expected-commercial-amount-smoke-validation.ts` | IP-07 smoke (TC-01…TC-11 + architecture/UX) — **23/23 PASS** |

### Files modified

| File | Change |
|------|--------|
| `03-platform/src/modules/commercial/types.ts` | `ExpectedCommercialAmount`, component/line role contracts |
| `03-platform/src/modules/commercial/constants.ts` | `IP_07_EXPECTED_AMOUNT`, `EXPECTED_AMOUNT_SIGN_CONVENTION` |
| `03-platform/src/modules/commercial/errors.ts` | IP-07 error codes + actionable messages |
| `03-platform/src/modules/commercial/index.ts` | Public IP-07 exports |
| `03-platform/src/modules/commercial/services/commercial-resolution-service.ts` | `calculateExpectedAmount` / `resolveExpectedAmount` pipeline wiring |
| `03-platform/src/modules/commercial/actions/commercial-resolution-actions.ts` | `finalizeCommercialExpectedAction`, `calculateExpectedCommercialAmountAction` |
| `03-platform/src/modules/commercial/components/commercial-resolution-workspace.tsx` | Review / Expected UX with expected vs actual vs variance |
| `03-platform/src/modules/commercial/components/commercial-resolution-stepper.tsx` | Step label alignment |
| `03-platform/scripts/bp005-ip06-commercial-resolution-snapshot-smoke-validation.ts` | TC-16 UX check compatibility with IP-07 Review step |
| `02-build-packs/.../IP-07 Expected Commercial Amount.md` | This implementation record |

### Contracts

| Contract | Role |
|----------|------|
| `CommercialSnapshot` (IP-06) | Sole commercial input — validated for structure, reconcile, immutability, hash, business scope, currency |
| `ExpectedCommercialAmount` | Immutable expected-value projection for downstream consumers |
| `ExpectedCommercialComponent` | Component-level expected lines with role + signed amount + magnitude |

#### ExpectedCommercialAmount (minimum fields)

| Field | Meaning |
|-------|---------|
| `businessId` | Business scope |
| `snapshotId` | IP-06 snapshot reference |
| `resolutionId` | Upstream resolution reference |
| `generatedAt` | Deterministic = `snapshot.frozenAt` (does not affect amounts) |
| `effectiveAt` | Commercial effective time from snapshot |
| `principalAmount` | Principal / base (IP-01 origin via snapshot) |
| `totalComponentAmount` | Positive charges excl. principal & tax |
| `totalDiscountAmount` | Non-negative reduction magnitude |
| `totalTaxAmount` | Non-negative tax/levy magnitude |
| `totalCommissionAmount` | Non-negative commission magnitude |
| `payableAmount` | Authoritative IP-06 `payable` |
| `expectedAmount` | Expected charge/collect (= `payableAmount`) |
| `currency` | Snapshot currency |

Boundary fields (always unavailable in IP-07):

- `actualAmountCollected: null`
- `variance: null`
- `paymentAllocation: null`

### Sign convention

Documented in `EXPECTED_AMOUNT_SIGN_CONVENTION`:

```text
expectedAmount = principal + positiveCharges + tax − discounts
               = sum(signed snapshot components)
               = snapshot.payable
```

- Snapshot component lines remain signed (`ADD` positive / `SUBTRACT` negative).
- Header totals for discount / tax / commission / charges are non-negative magnitudes.
- Ambiguous unsigned amounts are not used without this convention.

### Service ownership

| Service | Ownership |
|---------|-----------|
| `ExpectedCommercialAmountService.calculateExpectedAmount(snapshot)` | IP-07 — validate, derive, reconcile, return |
| `CommercialResolutionService.calculateExpectedAmount` | Thin IP-07 wire-through |
| `CommercialResolutionService.resolveExpectedAmount` | Resolve → snapshot → expected |
| IP-01 / IP-05 / IP-03 / IP-04 / IP-02 / IP-06 | Unchanged ownership |

### Calculation / reconciliation rules

1. Validate snapshot via `assertCommercialSnapshotValid` (structure, payable reconcile, hash, business alignment).
2. Map integrity failures → `SNAPSHOT_INTEGRITY_FAILURE`; other snapshot failures → `INVALID_COMMERCIAL_SNAPSHOT`.
3. Aggregate component roles from snapshot lines only (no master re-query).
4. Reconstruct expected formula and require exact scaled-money equality with `snapshot.payable`.
5. Reject inconsistent snapshots — never silently correct.

### Error handling

| Code | When |
|------|------|
| `INVALID_COMMERCIAL_SNAPSHOT` | Snapshot not usable for expected amount |
| `SNAPSHOT_INTEGRITY_FAILURE` | Hash / immutability integrity failure |
| `COMMERCIAL_AMOUNT_RECONCILIATION_ERROR` | Formula / payable mismatch |
| `CURRENCY_MISMATCH` | Mixed or invalid currency |
| `INVALID_EXPECTED_AMOUNT` | Derived amount structurally invalid |
| `INVALID_CONTEXT` | Business isolation / scope mismatch |

### UX implementation

Route: `/commercial/resolve`

Progression:

```text
Base Price → Components → Tax → Review / Expected
```

Review / Expected stage explicitly shows:

| Concept | Display |
|---------|---------|
| Expected Commercial Amount | `KES X,XXX` |
| Actual Payment | Not available yet |
| Variance | Not available yet |

Also: step progression, loading, success/error near step, empty state, currency, commercial breakdown, platform action footer, Previous / Resolve another — no payment functionality.

### Test results

`npx tsx scripts/bp005-ip07-expected-commercial-amount-smoke-validation.ts` — **23/23 PASS**

| Case | Result |
|------|--------|
| TC-01 Principal only → 1,000 | PASS |
| TC-02 Principal + tax → 1,180 | PASS |
| TC-03 Principal + commission + tax → 1,280 | PASS |
| TC-04 Discount → 1,130 | PASS |
| TC-05 Multiple components reconcile | PASS |
| TC-06 Inclusive-tax snapshot consumed | PASS |
| TC-07 Invalid snapshot fails closed | PASS |
| TC-08 Business isolation | PASS |
| TC-09 Determinism | PASS |
| TC-10 Provenance | PASS |
| TC-11 Regression BP-003 IP-011 + IP-01…IP-06 | PASS |

### Quality gates

| Gate | Result |
|------|--------|
| `npm run lint` | PASS (0 errors; pre-existing warnings in unrelated modules) |
| `npm run typecheck` | FAIL — pre-existing unrelated error in `scripts/bp001-004-system-integration-certification.ts` (`"leads"` tab comparison). No commercial/IP-07 type errors. |
| `npm run db:migrate` | PASS — no new migrations applied |

### Migration / schema / seed status

| Item | Status |
|------|--------|
| `_journal.json` | No changes |
| `schema/index.ts` | No changes |
| `seed.ts` | No changes |
| Migration required | **No** |

### Intentional boundaries / gaps

- No actual collection, payment split, variance engine, billing, receipting, orders, inventory, tax remittance
- No expected-amount persistence table
- No new pricing / tax masters
- IP-08, IP-09, IP-10, IP-11 **not started**
- Downstream contract documentation for IP-10 remains future work (AC-004)

### Downstream integration points

| Consumer | How to integrate |
|----------|------------------|
| BP-006 Sales / Orders | Store `CommercialSnapshot` + `ExpectedCommercialAmount` with the transaction |
| BP-007 Payments | Read `expectedAmount` / component breakdown; record actual separately |
| Future RA / Reconciliation | Compare expected vs actual; variance outside IP-07 |
| CRM | Continue via IP-06 snapshot path; may call `calculateExpectedAmount` on held snapshot |

---

## Implementation Prompt Archive

This section preserves the complete Cursor implementation prompt used for IP-07 implementation and serves as the authoritative implementation record for this IP.

You are implementing BP-005 – Pricing, Tax & Commercial Rules.

Implementation Package

IP-07 — Expected Commercial Amount

You are working on IP-07 only.

Do not implement IP-08, IP-09, IP-10, IP-11, payments, billing, receipting, orders, inventory, reconciliation, or tax-remittance functionality.

Do not modify unrelated modules.

1. Objective

Implement a deterministic Expected Commercial Amount capability that derives the amount a business expects to charge/collect for a commercial transaction from the finalized IP-06 Commercial Snapshot.

The expected amount must preserve the commercial breakdown and provide a stable expected-value contract for downstream transaction, payment and revenue-assurance capabilities.

The key principle is:

IP-06 freezes what the commercial calculation means. IP-07 determines what the business expects to receive/charge from that frozen commercial result.

IP-07 must not recalculate pricing, tax, discounts or commissions independently.

2. Mandatory Architecture Boundary

The flow must be:

BP-003 Price Master
        ↓
IP-01 Base Price Resolution
        ↓
IP-05 Precedence / Conflict Resolution
        ↓
IP-03 Tax Resolution
        ↓
IP-04 Commercial Components
        ↓
IP-02 Commercial Composition
        ↓
IP-06 Commercial Snapshot
        ↓
IP-07 Expected Commercial Amount
        ↓
Future BP-006 Sales / Orders
        ↓
Future BP-007 Payments / Billing / Receipting
        ↓
Future Revenue Assurance / Reconciliation

IP-07 consumes IP-06 only as its commercial source of truth.

Do not bypass IP-06 and read directly from:

pricing_item
pricing_catalogue
tax configuration
discount configuration
commission configuration
BP-003 pricing services

IP-07 is an expected-value projection, not another pricing engine.

3. Core Business Meaning

For example:

Product price                     1,000
Commission                         100
Tax                                180
Discount                            50
---------------------------------------
Expected commercial amount       1,230

The exact composition must come from the IP-06 snapshot.

IP-07 should answer:

"Given this finalized commercial snapshot, what amount should the business expect to charge/collect?"

It must not answer:

"How much money was actually received?"

That belongs to future payment/reconciliation capabilities.

4. Expected Amount Contract

Create a clear immutable/value-object contract representing the expected commercial amount.

At minimum capture:

Identity
businessId
snapshotId
resolution/reference ID where applicable
generatedAt
effectiveAt
Amounts
principalAmount
totalComponentAmount
totalDiscountAmount
totalTaxAmount
totalCommissionAmount
payableAmount
expectedAmount
currency

Do not duplicate amounts unnecessarily if they can be deterministically derived from the snapshot. Prefer references/derived values where appropriate.

5. Expected Amount Semantics

Clearly distinguish:

Principal

The base commercial amount originating from IP-01.

Components

Additional commercial components such as:

commission
service charge
surcharge
levy
fee
other configured charge
Reductions

Examples:

discount
waiver
promotional reduction
Tax

Tax contributions calculated by IP-03.

Payable / Expected Amount

The final amount expected from the customer according to the finalized commercial snapshot.

The model must explicitly distinguish positive charges from reductions.

Do not rely on ambiguous signs without documenting the convention.

6. Money Integrity

Use the existing commercial money abstraction.

Do not use JavaScript floating-point arithmetic for financial calculations.

Maintain exact integer-scaled money / existing CommercialMoney conventions.

The implementation must guarantee:

expectedAmount =
    principal
  + positive charges
  + tax
  - discounts/reductions

or the equivalent calculation represented by the existing IP-02/IP-06 composition contract.

The result must reconcile exactly.

Reject inconsistent snapshots rather than silently correcting them.

7. Snapshot Authority

IP-07 must validate that the supplied IP-06 snapshot is:

structurally valid
internally reconciled
immutable
hash-valid
business-scoped
currency-consistent
commercially complete enough to calculate expected amount

If the snapshot is invalid:

INVALID_COMMERCIAL_SNAPSHOT

must be returned.

Do not attempt to reconstruct or repair the snapshot.

8. Idempotency / Determinism

For the same:

businessId
snapshotId

the expected commercial amount must always be deterministic.

Repeated calculation must produce the same:

expected amount
currency
component breakdown
provenance
snapshot reference

No timestamps or generated identifiers should affect the financial result.

If a separate expected-amount object is created, ensure repeated resolution does not produce conflicting commercial values.

9. Provenance

The result must preserve provenance back to the IP-06 snapshot.

At minimum:

snapshotId
businessId
currency
commercial calculation/version information

Where available, preserve the underlying component provenance already present in the snapshot.

The downstream system must be able to answer:

"Why is the expected amount KES 1,230?"

without recalculating the commercial rules.

10. Actual vs Expected Boundary — VERY IMPORTANT

Do not implement actual collection.

IP-07 must explicitly distinguish:

Expected Commercial Amount
        ≠
Actual Amount Collected

For example:

Expected: KES 1,230
Actual collected: NOT AVAILABLE
Variance: NOT AVAILABLE

Do not introduce payment records or reconciliation logic.

This boundary is important because future capabilities will compare:

Expected amount
        ↓
Actual transaction amount
        ↓
Actual payment allocation
        ↓
Variance

That is outside IP-07.

11. Split Payment Boundary

Do not implement payment splitting in IP-07.

For example:

Expected amount = KES 300

Cash = 100
M-Pesa = 200

The above is a payment allocation, not expected commercial amount calculation.

IP-07 may expose:

expectedAmount = KES 300

but must not create:

cashAllocation = 100
mpesaAllocation = 200

That belongs to the future payment/transaction layer.

12. Principal / Tax / Commission Granularity

Preserve the commercial breakdown so downstream systems can distinguish:

Principal
Commission
Tax
Discount
Other charges
Expected payable

This is a backend financial representation, not necessarily a user-facing pricing screen.

Do not create a new pricing master.

Do not create a tax master.

Do not create payment tables.

Do not create revenue-assurance tables.

13. API / Service

Implement a focused service, for example:

ExpectedCommercialAmountService

with a clear operation such as:

calculateExpectedAmount(snapshot)

or an equivalent naming convention consistent with the existing commercial module.

The service must:

validate the snapshot
derive the expected amount
reconcile the result
return the expected commercial amount contract
preserve provenance
fail explicitly when the snapshot is invalid

Keep calculation logic pure wherever practical.

14. Integration

Wire IP-07 into the commercial resolution pipeline:

IP-06 CommercialSnapshot
        ↓
IP-07 ExpectedCommercialAmountService
        ↓
ExpectedCommercialAmount

Do not modify BP-003 pricing ownership.

Do not modify IP-01 precedence ownership.

Do not modify IP-03 tax ownership.

Do not modify IP-04 component ownership.

Do not redesign IP-06.

15. UX §14

Because IP-07 is part of the progressive commercial-resolution workspace, extend:

/commercial/resolve

from:

Base Price
   ↓
Components
   ↓
Tax
   ↓
Review

to include the expected amount appropriately.

The UX must follow the existing architecture standards.

Required UX behaviour
clear step progression
visible current step
Previous / Next navigation where applicable
loading state during resolution
success state
errors shown near the relevant field/step
no generic error dumped at the top of the page
empty state where applicable
clear explanation of what is being calculated
clear distinction between expected and actual amounts
clear currency display
clear commercial breakdown
platform action footer
obvious next action
ability to return to the previous step
no dead-end screen

The Review/Expected Amount stage should make the following distinction explicit:

Expected Commercial Amount
KES X,XXX

Actual Payment
Not available yet

Variance
Not available yet

Do not expose payment functionality.

16. Error Handling

Use existing commercial error conventions.

At minimum handle:

INVALID_COMMERCIAL_SNAPSHOT
SNAPSHOT_INTEGRITY_FAILURE
COMMERCIAL_AMOUNT_RECONCILIATION_ERROR
CURRENCY_MISMATCH
INVALID_EXPECTED_AMOUNT

Use existing errors where equivalent ones already exist rather than creating duplicates.

Errors must be actionable.

Example:

"The commercial snapshot is invalid and cannot be used to calculate the expected amount. Re-resolve the commercial transaction."

17. Testing

Create:

scripts/bp005-ip07-expected-commercial-amount-smoke-validation.ts

Do not modify previous smoke scripts except where required for legitimate regression compatibility.

Include at least:

TC-01 — Principal only
Principal = 1,000
Expected = 1,000
TC-02 — Principal + tax
Principal = 1,000
Tax = 180
Expected = 1,180
TC-03 — Principal + commission + tax
Principal = 1,000
Commission = 100
Tax = 180
Expected = 1,280
TC-04 — Discount
Principal = 1,000
Tax = 180
Discount = 50
Expected = 1,130
TC-05 — Multiple components

Validate several positive and negative components reconcile exactly.

TC-06 — Inclusive-tax snapshot

Validate that IP-03/IP-06's finalized commercial result is consumed without recalculating tax.

TC-07 — Invalid snapshot

Must fail explicitly.

TC-08 — Business isolation

Business A's snapshot must not resolve through Business B context.

TC-09 — Determinism

Same snapshot → same expected amount.

TC-10 — Provenance

Expected result references the correct snapshot and commercial provenance.

TC-11 — Regression

Run:

BP-003 IP-011 regression
BP-005 IP-01
IP-02
IP-03
IP-04
IP-05
IP-06

Do not weaken previous tests to make IP-07 pass.

18. Quality Gates

Run:

npm run lint
npm run typecheck
npm run db:migrate

Only run migration/seed changes if the implementation genuinely requires them.

Prefer no database changes for IP-07 because the current architecture treats IP-06 as an immutable value object and BP-006+ will own durable transaction storage.

If no migration is required, explicitly report:

No _journal.json changes
No schema/index.ts changes
No seed.ts changes
No migration required
19. Scope Protection

Do NOT implement:

payment allocation
cash/M-Pesa/card split
payment execution
receipt issuance
billing
reconciliation
revenue assurance
actual-vs-expected variance engine
order creation
fulfilment
inventory
tax remittance
tax filing
tax calendar
tax-payment evidence
IP-08+
new pricing master
new tax master
new commercial transaction database

Those belong to later Build Packs/IPs.

20. Documentation

Update:

BP-005 IP-07 – Expected Commercial Amount.md

with:

implementation status
architecture flow
contracts
service ownership
UX implementation
test results
quality gates
migration/schema status
intentional boundaries
downstream dependencies

At the bottom of the IP-07 document, append this exact implementation-control section so that the full prompt is preserved as part of the documentation:

Implementation Prompt Archive
This section preserves the complete Cursor implementation prompt used for IP-07 implementation and serves as the authoritative implementation record for this IP.

Then paste the complete prompt into that section.

21. Stop Condition

After IP-07 is implemented and validated:

STOP.

Do not start IP-08, IP-09, IP-10 or IP-11.

Return a handover containing:

Status
Files created
Files modified
Architecture flow
Expected Commercial Amount contract
Calculation/reconciliation rules
UX changes
Smoke test results
Regression results
Quality gates
Migration/schema/seed impact
Defects fixed
Intentional gaps
Downstream integration points
Confirmation that IP-08+ were not started

Do not commit.

Do not make unrelated fixes.

Implement IP-07 only, validate it, document it, and stop.

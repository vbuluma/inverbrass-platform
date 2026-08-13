# BP-005 IP-10 – Downstream Commercial Contract

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-10 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-06, IP-07, IP-09 |
| Scope coverage | SC-016 |
| Related FRs | FR-028–FR-035, FR-042, FR-044 |

---

## Objective

Define the **stable service/API contract** that Sales, Payments, Finance, Reconciliation and Revenue Assurance consume — so downstream Build Packs use the resolved commercial result rather than independently reproducing commercial calculations.

IP-10 is an **integration contract**, not another pricing engine.

---

## Business Problem

Without a published contract, each pack invents its own total, tax and discount fields. That violates single ownership and breaks assurance. IP-10 freezes the commercial exchange format and consumption rules.

---

## Scope

### Included

- Standard commercial resolution request/response contract
- Snapshot and expected-amount read contracts
- Error contract (from IP-09)
- Consumption rules for BP-006, BP-007, Finance, Reconciliation, RA
- Versioning / compatibility policy for the contract (`v1`)
- Provenance fields required for explanation (NFR-012)
- Idempotent consumption and integrity / tenant isolation

### Excluded

- Implementing consumer UIs for orders/payments
- Payment allocation schemas (BP-007)
- GL journal schemas (Finance)
- IP-11 tax remittance
- Actual order/payment/receipt persistence

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Downstream Build Packs shall consume the resolved commercial result rather than independently reproducing commercial calculations. |
| BR-002 | Contract remains stable across BP-006/BP-007 delivery (NFR-009). |
| BR-003 | Contract supports future components without redesign of core transaction commercial model (NFR-010). |
| BR-004 | Contract supports Finance / Reconciliation / RA integration without duplicating calculations (NFR-011). |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Downstream Build Packs shall consume the resolved commercial result rather than independently reproducing commercial calculations. | FR-044 |
| FR-002 | Expose resolve, commit/snapshot, and expected-amount operations as documented APIs. | FR-028–FR-035 |
| FR-003 | Expose structured commercial errors to consumers. | FR-042 |

---

## Consumption Rules

| Consumer | Allowed | Forbidden |
|----------|---------|-----------|
| BP-006 Sales | Call resolve; attach snapshot id on order commit | Recalculate tax/discount in checkout UI/server independently |
| BP-004 Quotations | May call resolve for quote totals (future alignment) | Store only a naked total without snapshot/provenance when commercial commit is required |
| BP-007 Payments | Read expected payable/components; allocate actuals | Re-derive tax as system of record |
| Future RA | Compare expected vs actual using BP-005 expected amounts | Rebuild expected commercial from current rules for historical txns |
| Future Finance | Consume commercial basis / components | Dual commercial engines |

---

## Logical Contract Surfaces

### 1) Pipeline resolve / snapshot / expected (existing IP-01…IP-07)

Backed by `CommercialResolutionService` — unchanged ownership.

### 2) `CommercialTransactionContract` (IP-10)

Authoritative downstream exchange format built from:

- IP-06 `CommercialSnapshot`
- IP-07 `ExpectedCommercialAmount`
- IP-09 validation gate

### 3) `CommercialContractService`

- `getCommercialContract` / `consumeCommercialContract`
- `validateCommercialContract`
- `verifyCommercialContractIntegrity`

### 4) `DownstreamCommercialContractAdapter`

Future BP-006/BP-007 entry point — must not call BP-003 / tax / composition engines.

### 5) Errors

Structured code/message/family/hint per IP-09 (+ IP-10 contract codes).

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Consumers must persist `snapshotId` (or equivalent) on committed commercial transactions. |
| BRU-002 | Breaking contract changes require versioned API (`v1`, `v2`) — no silent field reuse. |
| BRU-003 | Additive component types are non-breaking if unknown components are safely ignorable for display but retained for integrity. |
| BRU-004 | Frontends may format/display amounts; they must not recompute authoritative payable. |

---

## High-Level Process Flow

```
Downstream transaction request
        ↓
IP-10 Commercial Contract Adapter / Service
        ↓
IP-09 validation
        ↓
IP-06 immutable snapshot
        ↓
IP-07 expected commercial amount
        ↓
CommercialTransactionContract (v1)
        ↓
Downstream transaction (BP-006 / BP-007 — future)
```

---

## Document Control

| Item | Value |
|------|-------|
| Status | Implemented in `03-platform` (2026-08-13) |
| Smoke | `npx tsx scripts/bp005-ip10-downstream-commercial-contract-smoke-validation.ts` — **33/33 PASS** |
| Migration | None |
| UX | `/commercial/resolve` Review step — downstream contract panel |
| Related FRs | FR-028–FR-035, FR-042, FR-044 |

---

## Implementation Status

**Implemented** in `03-platform` (2026-08-13).

### Architecture flow (implemented)

```text
BP-003 → IP-01 → IP-05 → IP-03 → IP-04 → IP-02 → IP-06 → IP-07
                                                    ↓
                                              IP-08 / IP-09
                                                    ↓
                              IP-10 CommercialTransactionContract
                                                    ↓
                         Future: BP-006 / BP-007 / RA / Finance
```

IP-10 **consumes** the validated snapshot + expected amount. It does **not** re-query BP-003 or recalculate tax/discounts/payable.

### Contract exposed

`CommercialTransactionContract` (`contractVersion: v1`) includes:

- Identity: businessId, snapshotId, resolutionId, expectedAmountId, timestamps
- Commercial: currency, principal, charges, discounts, tax, commission, expectedPayable
- Breakdown: signed expected components
- Provenance: catalogue/item/method/precedence/rule refs
- Integrity: snapshot hash, determinism fingerprint, validation PASSED
- Explicit nulls: actualAmountCollected, paymentAllocation (BP-007+)

### Consumer boundary

| May call | Must not call for transaction execution |
|----------|------------------------------------------|
| `CommercialContractService` / `DownstreamCommercialContractAdapter` | `BasePriceResolutionService`, `TaxResolutionService`, composition services |

### Security / isolation

- Authenticated business context required (actions)
- Snapshot belonging to Business A rejected for Business B (`BUSINESS_CONTEXT_MISMATCH`)
- Currency mismatch rejected — no FX (`COMMERCIAL_CONTRACT_CURRENCY_MISMATCH`)
- Tampered hash / payable rejected fail-closed

### Idempotency

Same `businessId` + snapshot integrity → same `contractId` and monetary fields.  
`consumerRef` / `consumedAt` may differ; commercial amounts never mutate.

### UX

Review step shows:

- Expected amount / Actual (N/A) / Variance (N/A)
- Downstream contract: expected payable, currency, snapshot id, status, contract id, next action

### Artefacts

| Area | Path |
|------|------|
| Rules | `commercial-contract-rules.ts` |
| Service | `commercial-contract-service.ts` |
| Adapter | `adapters/downstream-commercial-contract-adapter.ts` |
| Smoke | `scripts/bp005-ip10-downstream-commercial-contract-smoke-validation.ts` |

### Quality gates

- No migration / no seed / no shared journal changes
- Lint/typecheck: IP-10 sources clean (pre-existing unrelated `leads` certification error remains)
- Smoke: see results below

### Intentional gaps

- No BP-006 order persistence
- No BP-007 payment/receipt/allocation
- No revenue-assurance variance engine
- No FX
- Nested IP-02…IP-08 smoke trees not fully re-spawned (artifact continuity + BP-003 IP-011 / IP-01 / IP-09 regressions)
- IP-11 not started

### Downstream readiness

BP-006 can attach `snapshotId` + contract identity without a local tax engine.  
BP-007 can read `expectedPayable` / breakdown without recalculation.  
RA can later compare expected (IP-07 via contract) vs actual (BP-007).

---

## Implementation Prompt Archive

This section preserves the complete Cursor implementation prompt used for IP-10 implementation and serves as the authoritative implementation record for this IP.

# BP-005 IP-10 — Downstream Commercial Contract & Integration
## Cursor Implementation Prompt

You are implementing ONLY:

BP-005 — Pricing, Tax & Commercial Rules
IP-10 — Downstream Commercial Contract & Integration

STOP CONDITION:
Do not implement IP-11 or any capability outside IP-10.
Do not implement BP-006 Sales/Orders, BP-007 Payments/Billing/Receipting, Inventory, or additional CRM functionality.

==================================================
1. OBJECTIVE
==================================================

Implement the authoritative downstream commercial contract that allows future Build Packs to consume the completed BP-005 commercial result without:

- re-querying BP-003 pricing
- recalculating tax
- recalculating discounts
- recalculating commissions
- rebuilding payable logic
- bypassing IP-06 snapshots
- bypassing IP-07 expected commercial amounts
- duplicating commercial rules in downstream modules

IP-10 is an INTEGRATION CONTRACT, not another pricing engine.

The downstream consumer must receive a complete, authoritative commercial result and treat it as the source of truth for the transaction.

==================================================
2. CURRENT BP-005 ARCHITECTURE
==================================================

The completed commercial pipeline is:

BP-003
  ↓
IP-01 Base Price Consumption
  ↓
IP-05 Price Precedence / Conflict Resolution
  ↓
IP-03 Tax Rules & Calculation
  ↓
IP-04 Commercial Component Rules
  ↓
IP-02 Charge Composition
  ↓
IP-06 Commercial Snapshot
  ↓
IP-07 Expected Commercial Amount
  ↓
IP-08 Commercial Governance
  ↓
IP-09 Commercial Validation & Resilience
  ↓
IP-10 DOWNSTREAM COMMERCIAL CONTRACT
  ↓
Future consumers: BP-006 Sales/Orders, BP-007 Payments/Billing/Receipting, Revenue Assurance, etc.

IMPORTANT:

IP-10 must consume the validated IP-06/IP-07 result.

It must NOT go backwards to BP-003 or independently invoke pricing/tax engines.

==================================================
3. ARCHITECTURAL PRINCIPLE
==================================================

BP-005 owns commercial meaning.

Downstream Build Packs own transaction execution.

Therefore:

BP-005:
"What should this transaction commercially amount to?"

Downstream:
"Create/order/collect/receipt/reconcile this transaction using that commercial result."

The downstream module must never reinterpret the commercial result.

==================================================
4. SCOPE
==================================================

Implement:

1. A stable downstream commercial contract.
2. Consumer-safe request/response types.
3. Authoritative expected commercial amount consumption.
4. Snapshot identity and provenance propagation.
5. Commercial component breakdown propagation.
6. Currency propagation.
7. Business/tenant identity propagation.
8. Deterministic commercial-result identity.
9. Idempotent consumption semantics.
10. Validation that consumers are using a valid commercial snapshot/result.
11. Explicit rejection of stale/tampered/invalid commercial results.
12. Integration adapters/interfaces for future downstream Build Packs.
13. Regression protection for IP-01 through IP-09.
14. UX only where IP-10 requires user-facing integration state.

Do NOT implement actual order/payment/receipt persistence.

==================================================
5. AUTHORITATIVE SOURCE
==================================================

The authoritative source is:

IP-06 CommercialSnapshot
+
IP-07 ExpectedCommercialAmount
+
IP-09 validation result

A downstream consumer should receive enough information to execute the transaction without having to ask:

"How was this price calculated?"

The commercial result should already contain the answer through:

- snapshotId
- resolutionId
- businessId
- effectiveAt
- currency
- principal
- components
- tax
- discount
- commission
- payable / expected amount
- component breakdown
- provenance
- integrity information
- generation/frozen timestamps

Do not create a second commercial calculation.

==================================================
6. DOWNSTREAM CONTRACT
==================================================

Create an explicit contract such as:

CommercialTransactionContract

or an equivalent name consistent with the existing codebase.

It must expose at minimum:

identity:
- businessId
- snapshotId
- resolutionId
- expectedAmountId where applicable
- effectiveAt
- generatedAt/frozenAt

commercial:
- currency
- principalAmount
- totalCharges
- totalDiscounts
- totalTax
- totalCommission
- expectedPayable

breakdown:
- signed commercial components
- component type
- component amount
- calculation/provenance reference

provenance:
- source pricing catalogue
- source pricing item
- pricing method
- precedence decision
- commercial rule references where available
- governance/version references where available

integrity:
- snapshot integrity/hash
- validation status/fingerprint where applicable

The exact field names must follow existing BP-005 contracts where already defined.

Do NOT create duplicate parallel representations when an existing authoritative type can be reused.

==================================================
7. CONSUMPTION CONTRACT
==================================================

Provide a controlled way for downstream consumers to consume the commercial result.

Example conceptual flow:

Downstream transaction request
        ↓
IP-10 Commercial Contract Adapter
        ↓
IP-09 validation
        ↓
IP-06 immutable snapshot
        ↓
IP-07 expected commercial amount
        ↓
CommercialTransactionContract
        ↓
Downstream transaction

The consumer receives the result.

It does not calculate it.

==================================================
8. IDEMPOTENCY
==================================================

The contract must support safe repeated consumption.

The same:

businessId + snapshotId + downstream transaction context

must not cause the commercial result to mutate.

Repeated reads must return the same authoritative commercial result.

Do not silently create a new commercial snapshot merely because a downstream consumer requests the amount again.

If a consumer requires a new commercial resolution, that must be an explicit new resolution request with a new effective context.

==================================================
9. SNAPSHOT IMMUTABILITY
==================================================

Once IP-06 freezes the commercial snapshot:

Downstream consumers MUST NOT modify:

- principal
- tax
- discount
- commission
- charges
- payable
- currency
- provenance

If a business change requires a different commercial result:

create a new commercial resolution/snapshot.

Never mutate the old snapshot.

==================================================
10. STALE RESULT PROTECTION
==================================================

IP-10 must reject inappropriate use of a commercial result where required.

Examples:

- wrong businessId
- invalid snapshot
- failed integrity check
- invalid validation status
- incompatible currency
- expired/invalid commercial context where the contract requires re-resolution
- snapshot/result that cannot reconcile

Fail closed.

Do not invent an amount.

Do not default payable to zero.

Do not silently re-resolve using BP-003.

==================================================
11. MONEY PRECISION
==================================================

Continue using the existing BP-005 integer-scaled money model.

Do not introduce floating-point monetary calculations.

All downstream amounts must preserve the exact commercial values produced by BP-005.

The following must remain true:

expectedPayable
=
principal
+
positive charges/tax/commission
-
discounts

and must reconcile to the authoritative IP-06 snapshot/IP-07 expected amount.

==================================================
12. CURRENCY
==================================================

The commercial contract carries an authoritative currency.

Do not perform FX in IP-10.

Current BP-005 policy is fail-closed where FX is required but unavailable.

Therefore:

- matching currency → allowed
- unsupported currency conversion → rejected
- no invented FX rate
- no implicit currency conversion

Future FX capability belongs elsewhere.

==================================================
13. BUSINESS / TENANT ISOLATION
==================================================

Every commercial consumption request must be scoped to businessId.

A commercial snapshot belonging to Business A must never be consumable by Business B.

Test:

Business A snapshot + Business B request
→ REJECT

No cross-tenant fallback.

==================================================
14. PROVENANCE
==================================================

Downstream consumers must retain the commercial provenance references.

Do not copy the entire pricing master into downstream modules.

Instead retain references such as:

- snapshotId
- resolutionId
- pricingItemId
- pricingCatalogueId
- pricingMethod
- precedence decision
- commercial rule/version references

The purpose is auditability and traceability without duplicating ownership.

==================================================
15. FUTURE BP-006 / BP-007 BOUNDARY
==================================================

IP-10 must make the following future integrations possible:

BP-006 Sales / Orders / Service Delivery:
- consume expected commercial amount
- attach commercial snapshot to transaction
- preserve commercial breakdown
- establish transaction commercial baseline

BP-007 Payments / Billing / Receipting:
- consume expected amount
- compare actual collection later
- allocate payments later
- issue receipts later
- support revenue assurance later

IMPORTANT:

Do NOT implement those capabilities now.

Only establish the contract that makes them possible.

==================================================
16. REVENUE ASSURANCE BOUNDARY
==================================================

IP-10 must preserve enough information for future Revenue Assurance to compare:

EXPECTED
vs
ACTUAL

Expected comes from:

IP-07 ExpectedCommercialAmount

Actual will eventually come from:

BP-007 payment/billing/receipting execution.

Do not implement actual-vs-expected reconciliation in IP-10.

Do not implement payment allocation here.

Do not implement cash/M-Pesa/card/bank split here.

Those belong to downstream transaction/payment capabilities.

==================================================
17. API / SERVICE DESIGN
==================================================

Create an authoritative service/interface such as:

CommercialContractService

or equivalent consistent with the existing module.

It should support operations conceptually equivalent to:

- getCommercialContract(...)
- validateCommercialContract(...)
- consumeCommercialContract(...)
- verifyCommercialContractIntegrity(...)

Avoid unnecessary APIs.

Do not expose internal implementation details of IP-01–IP-09 to downstream modules.

Downstream modules should consume the stable contract rather than individual pricing/tax services.

==================================================
18. ADAPTER DESIGN
==================================================

Where an adapter is needed, use the existing InverBrass adapter pattern.

Do not allow downstream consumers to directly call:

PricingService
TaxResolutionService
CommercialCompositionService
BasePriceResolutionService

for transaction execution.

They should consume IP-10.

The only exception is internal BP-005 orchestration where existing services are legitimately chained.

==================================================
19. UI / UX
==================================================

If IP-10 requires a UI integration state, follow the existing BP-005 UX standard.

The commercial resolution workspace already implements:

- progressive stepper
- Previous / Next
- search
- loading/progress state
- success feedback
- errors beside the relevant step/control
- empty states
- guidance
- action footer
- Review step
- clear next action

Do not create another pricing screen.

Do not duplicate BP-003 Product Workspace Pricing.

If the UI displays the downstream contract, make it clear:

Commercial result:
[Expected amount]
Currency:
[Currency]
Snapshot:
[Snapshot ID]
Status:
[Validated / Invalid]
Next action:
[Continue to transaction / Resolve issue]

Errors must appear beside the relevant area, NOT as a generic page-top error.

==================================================
20. SECURITY / AUTHORIZATION
==================================================

Enforce:

- authenticated user
- active business context
- business isolation
- appropriate permission to consume commercial information

Do not allow a user to retrieve another business's commercial snapshot by supplying its ID.

Use existing platform authentication and authorization mechanisms.

Do not invent a parallel RBAC system.

==================================================
21. PERSISTENCE
==================================================

Do not create another pricing master.

Do not create another commercial snapshot master.

Do not duplicate IP-06/IP-07 persistence.

If IP-10 requires a durable downstream reference, establish only the minimum contract/reference structure needed.

Follow the existing ownership boundary:

BP-005 owns commercial resolution/snapshot semantics.

Future transaction Build Packs own transaction persistence.

If no migration is genuinely required, do not create one merely for IP-10.

==================================================
22. AUDIT / TRACEABILITY
==================================================

The contract must be traceable back to:

Business
→ commercial resolution
→ pricing provenance
→ commercial components
→ snapshot
→ expected amount
→ downstream consumer

Use existing audit/event infrastructure where appropriate.

Do not create duplicate audit systems.

==================================================
23. TESTING — MANDATORY
==================================================

Create:

03-platform/scripts/bp005-ip10-downstream-commercial-contract-smoke-validation.ts

Use the same smoke-test discipline used by IP-01 through IP-09.

At minimum test:

TC-01 — Valid commercial contract consumption
Expected: contract returned successfully.

TC-02 — Correct expected amount
Expected: contract amount equals IP-07 ExpectedCommercialAmount.

TC-03 — Snapshot identity preserved
Expected: snapshotId/resolutionId preserved.

TC-04 — Component breakdown preserved
Expected: principal, tax, commission, discount and charges reconcile.

TC-05 — Provenance preserved
Expected: pricing catalogue/item/method/provenance remain traceable.

TC-06 — Integrity validation
Tamper with/alter the commercial result.
Expected: rejection.

TC-07 — Invalid snapshot
Expected: fail closed.

TC-08 — Wrong businessId
Expected: tenant-isolation rejection.

TC-09 — Currency mismatch
Expected: rejection; no implicit FX.

TC-10 — Repeated consumption
Expected: same authoritative result; no mutation.

TC-11 — No pricing re-query
Verify downstream consumption does not bypass IP-10 to BP-003 pricing.

TC-12 — No commercial recalculation
Verify downstream receives the frozen commercial result rather than recomputing it.

TC-13 — Expected amount regression
IP-07 expected amount remains unchanged.

TC-14 — IP-06 regression
Snapshot integrity remains valid.

TC-15 — IP-09 regression
Invalid commercial state cannot enter downstream contract.

TC-16 — BP-003 regression
BP-003 pricing remains the sole price master.

==================================================
24. REGRESSION
==================================================

Run regression against:

- BP-003 IP-011
- BP-005 IP-01
- IP-02
- IP-03
- IP-04
- IP-05
- IP-06
- IP-07
- IP-08
- IP-09

Do not modify existing behaviour merely to make IP-10 tests pass.

If an existing failure is unrelated, classify it explicitly as pre-existing.

==================================================
25. QUALITY GATES
==================================================

Run:

npm run lint
npm run typecheck
npm run db:migrate

Run db:seed ONLY if required by an actual IP-10 reference-data dependency.

Do not modify:

- drizzle/meta/_journal.json
- src/db/schema/index.ts
- src/db/seed.ts

unless a genuine IP-10 persistence/reference-data requirement requires it.

If schema/migration changes are required:

STOP and clearly report:
- why they are required
- what tables/columns are proposed
- ownership
- why existing BP-005 structures cannot be reused

Do not silently modify shared integration files.

==================================================
26. ARCHITECTURE RULES
==================================================

Do not:

- create a second pricing engine
- create a second tax engine
- create a second commercial composition engine
- duplicate BP-003 pricing tables
- recalculate expected amount downstream
- create payment logic
- create order logic
- create receipt logic
- create inventory logic
- create revenue-assurance reconciliation
- extend CRM
- implement IP-11
- create a parallel authorization system

Reuse existing BP-005 contracts and services.

==================================================
27. DOCUMENTATION
==================================================

Update:

BP-005 IP-10 documentation with:

- implementation status
- architecture flow
- contract definition
- consumer boundary
- security/isolation rules
- idempotency
- integrity rules
- provenance
- UX behaviour if applicable
- smoke-test results
- regression results
- migrations, if any
- quality-gate results
- intentional gaps
- downstream readiness

At the bottom of the IP-10 document, archive this complete implementation prompt verbatim.

==================================================
28. STOP CONDITION
==================================================

When IP-10 is complete:

STOP.

Do NOT start IP-11.

Report:

1. Status
2. Architecture flow
3. Files created
4. Files modified
5. Contract exposed
6. Downstream integration boundary
7. Smoke-test results
8. Regression results
9. Quality gates
10. Migration/schema/seed changes
11. UX changes
12. Security/isolation validation
13. Intentional gaps
14. Confirmation that IP-11 was NOT implemented

Final status should clearly state:

"IP-10 COMPLETE — STOPPED BEFORE IP-11."

==================================================
29. IMPORTANT
==================================================

Do not interpret "downstream integration" as permission to implement BP-006/BP-007.

This IP establishes the commercial contract and integration boundary only.

The objective is:

BP-005 produces one authoritative, validated, immutable commercial result.

IP-10 makes that result safely consumable by the rest of the platform.

No downstream module should ever have to independently calculate what the customer should pay.

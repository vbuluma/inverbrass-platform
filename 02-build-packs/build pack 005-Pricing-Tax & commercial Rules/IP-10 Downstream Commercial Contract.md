# BP-005 IP-10 – Downstream Commercial Contract

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-10 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-06, IP-07, IP-09 |
| Scope coverage | SC-016 |

---

## Objective

Define the **stable service/API contract** that Sales, Payments, Finance, Reconciliation and Revenue Assurance consume — so downstream Build Packs use the resolved commercial result rather than independently reproducing commercial calculations.

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
- Versioning / compatibility policy for the contract
- Provenance fields required for explanation (NFR-012)

### Excluded

- Implementing consumer UIs
- Payment allocation schemas (BP-007 owns payment shape; references commercial ids)
- GL journal schemas (Finance)

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

### 1) `resolveCommercial`

**Request (logical):** businessId, offering/lines, partyId, channel, catalogue?, currency, quantity, effectiveAt, options (inclusive mode, version pin)

**Response (logical):** payableTotal, currency, components[], provenance, explanation, calculationId, ruleSetVersion

### 2) `commitCommercialSnapshot`

**Request:** calculationId / resolution payload + consumingTransactionRef  
**Response:** snapshotId (immutable)

### 3) `getCommercialSnapshot` / `getExpectedCommercialAmount`

**Response:** header expected + component expected amounts + provenance

### 4) Errors

Structured code/message/context per IP-09

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
BP-006/BP-004 → resolveCommercial
        ↓
User confirms → commitCommercialSnapshot
        ↓
Order/Quote stores snapshotId
        ↓
BP-007 reads expectedCommercial
        ↓
Future RA compares expected vs actual
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Contract version | Active API version per platform release |
| Consumer allow-list | Which modules may commit snapshots |
| Field extension policy | How new components are advertised |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-06 / IP-07 / IP-09 | Backing services |
| BP-006 | Primary commit consumer |
| BP-007 | Expected amount consumer |
| BP-004 IP-10 | Quotation alignment (planned) |
| Future Finance / RA | Read models |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Consumer adoption | Calls by consuming pack |
| Contract version usage | v1 vs v2 traffic |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Published contract covers resolve, snapshot, expected amounts and errors. |
| AC-002 | BP-006 design can commit without local tax engine. |
| AC-003 | BP-007 can read expected payable without recalculation. |
| AC-004 | Additive component type does not break existing consumers. |
| AC-005 | FR-044 is enforceable in architecture review for BP-006/BP-007. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Draft — awaiting approval |
| Related FRs | FR-028–FR-035, FR-042, FR-044 |

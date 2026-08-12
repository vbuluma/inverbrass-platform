# BP-005 IP-07 – Expected Commercial Amount

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-07 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-06 |
| Scope coverage | SC-013 |

---

## Objective

Establish the **expected commercial amount** for a transaction — including component-level expected amounts — as the control basis for Payments, Reconciliation and Revenue Assurance, without BP-005 becoming a payment or assurance engine.

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
| Status | Draft — awaiting approval |
| Related FRs | FR-033–FR-035 |

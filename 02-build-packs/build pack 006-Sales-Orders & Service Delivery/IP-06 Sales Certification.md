# BP-006 IP-06 – Sales Certification

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-06 |
| Build Pack | BP-006 – Sales, Orders & Service Delivery |
| Priority | High |
| Depends On | IP-01–IP-05 |
| Scope coverage | SC-016 |
| Related | Pack NFRs; runtime tests in the Traceability Matrix |

---

## Objective

Prove **BP-001 → BP-006 continuity** and the locked boundaries (commercial consume-only, quote-to-order, inspection/SoD, no payment, no inventory, no bookings) **before BP-007 starts**.

IP-06 is **certification**, not feature development.

---

## Business Problem

A pack can look complete in isolation while the journey is broken: quotation cannot convert, checkout recalculates tax, inspection is skipped, or “paid” is inferred from order create. Certification exists to prevent that.

---

## Scope

### Included

- End-to-end manual and automated journey evidence
- Boundary proofs (what BP-006 must not do)
- Traceability matrix runtime tests RT-01…RT-n
- Handover / readiness record for BP-007

### Excluded

- New sales features
- Implementing BP-007 payments
- Implementing BP-008 inventory
- Reopening BP-004 quotation authoring
- Recalculating commercial rules

---

## Journeys to certify

### J-01 Direct sale

Business → customer (BP-002) → offering (BP-003) → commercial contract (BP-005) → draft → confirm (SoD if on) → order exists with snapshot + expected amount.

### J-02 Quote-to-order

BP-004 accepted quotation → Convert Quote (BP-006) → order linked to quotation → BP-004 does not own the order row → ineligible quote cannot convert.

### J-03 Physical fulfilment + inspection

Confirmed physical order → IP-03 delivery → inspect 80 accept / 15 reject / 5 missing → delivered 95, **outstanding 20** → SoD (maker ≠ checker) → cannot complete while outstanding > 0 → reject does not become complete → reject-and-return + replace keeps outstanding 20; credit-only closes 15 and leaves outstanding 5.

### J-04 Service delivery

Service line completes without stock movement → header blocked until service complete → evidence required when configured.

### J-05 Amendment / cancel / return initiation

Silent post-confirm amount change fails → versioned amendment consumes new BP-005 contract → cancel emits financial instruction only → IP-03 rejection of 15 can initiate IP-04 return/replace without refund or restock.

### J-06 Downstream contracts

Payment-ready contract amount due = commercial expected; no collected amount. Fulfilment-ready contract has quantities/inspection; no stock on hand.

### J-07 Tenancy & fail-closed

Cross-business order/customer/offering/quotation access denied. Invalid commercial contract cannot confirm.

---

## Explicit non-ownership proofs

| Capability | Must remain absent in BP-006 |
|------------|------------------------------|
| Price/tax/discount engine | No `pricing_item` write; no local tax calculator producing payable |
| Payment | No split tender, receipt, or “paid because ordered” |
| Inventory | No stock quantity mutation |
| Quotation master | No quotation create/version in sales module |
| Bookings/appointments | No resource calendar/scheduler |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | J-01 through J-07 evidenced (automated smoke and/or controlled manual journey). |
| AC-002 | Traceability matrix wave tests for Waves 1–3 pass before this IP is declared done. |
| AC-003 | No BP-007 or BP-008 feature code is required to pass certification (contracts/mocks permitted). |
| AC-004 | Certification record states remaining gaps without inventing payment data. |
| AC-005 | Users can complete the happy path without seeing Build Pack/IP identifiers. |

---

## Certification record (minimum)

- Date, environment, business used
- Journeys run and result
- SoD users used (maker vs checker)
- Commercial snapshot ids consumed
- Known defects / waivers
- Sign-off: Integration Manager

Do **not** start BP-007 until this record exists.

---

## Document Control

| Item | Value |
|------|-------|
| Status | Implemented — Wave 4 IP-06 (2026-08-24) |
| Pack | [Build Pack-006 Scope](./Build%20Pack-006%20Scope.md) |
| Previous | [IP-05](./IP-05%20Downstream%20Handoff%20%26%20Sales%20Workspace.md) |
| Traceability | [BP-006-Requirements-Traceability-Matrix](./BP-006-Requirements-Traceability-Matrix.md) |

---

## Implementation notes (2026-08-24)

**Status:** Implemented. Certification only — no new sales features. BP-007 and BP-008 were not started.

### Evidence

- Validator: `03-platform/scripts/bp006-ip06-sales-certification.ts`
- Record: `03-platform/docs/certification/BP-006-SALES-CERTIFICATION.md`
- J-01–J-07 run in-process (SoD maker/checker/inspector)
- RT-01–RT-11 via spawned IP-01–IP-05 smokes
- RT-12: tenancy fail-closed + this record

### Intentional exclusions

Payment capture (BP-007), stock movement (BP-008), quotation authoring (BP-004), commercial recalculation (BP-005), appointment calendar.

---

## Manual business-user reproduction (BA)

**Business:** Journey Alpha Services KE  
**Customer:** Test Customer Alpha  

Staff A **Sell** a customer + offering, sees expected total, saves draft, submits. Staff A cannot confirm. Staff B confirms. Payment is not recorded.

**Convert quote** from an accepted quotation creates a draft sale linked to that quotation. A draft quotation cannot convert.

On a physical sale of 100, record arrival 100, inspect 80 / 15 / 5 as another person. Outstanding is 20. Return and replace keeps 20. Return and credit leaves 5. Money is not refunded. Stock is not moved.

---

## IMPLEMENTATION PROMPT ARCHIVE

The following is the Wave 4 implementation prompt that authorised this IP.

```
Cursor Implementation Prompt — BP-006 IP-06 Sales Certification

Implement ONLY BP-006 IP-06. Certification, not feature development.
Do not implement BP-007, BP-008, payment execution, inventory movement,
CRM/quotation ownership, or a BP-005 redesign.

Prove BP-001 → BP-006 continuity and locked boundaries before BP-007.
J-01–J-07, RT-01–RT-12, non-ownership proofs, certification record.

STOP after the certification record. Do not commit unless instructed.
```


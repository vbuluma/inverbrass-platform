# BP-006 IP-02 – Order Lifecycle & Fulfilment

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-02 |
| Build Pack | BP-006 – Sales, Orders & Service Delivery |
| Priority | Critical |
| Depends On | IP-01, ENG-005, ENG-013, ENG-003l |
| Scope coverage | SC-005, SC-006, SC-008 (gated completion), SC-015 |
| Related pack FRs | FR-011–FR-025, FR-020 |

---

## Objective

Manage a confirmed sales order through its **lifecycle** and keep **line-level fulfilment status** visible: ordered, in progress, partially fulfilled, completed or cancelled.

IP-02 owns **whether the order may progress and whether it may complete**. It does **not** record physical delivery, inspection, accept/reject, or service-completion evidence — those belong to **IP-03**. Inventory movement is BP-008. Post-rejection amend/cancel/return is IP-04.

---

## Business Problem

Without a single state machine, an order can jump from confirmed to complete while delivery, inspection or service work is still outstanding. IP-02 enforces legal transitions and completion gates using outcomes produced by IP-03.

---

## Scope

### Included

- Lifecycle: Draft, Confirmed, In Progress, Partially Fulfilled, Fulfilled/Completed, Cancelled
- Valid transition enforcement
- Roll-up of ordered / accepted / rejected / outstanding quantities **from IP-03** (physical) and service completion (IP-03)
- Partial-fulfilment status when remainder remains
- Prevent fulfilment activity on cancelled orders
- Prevent header completion while mandatory IP-03 delivery, inspection or service work remains outstanding
- Maker-checker on **header completion** when gated
- Ready-for-next-action flags consumed by IP-05

### Excluded

- Order creation and quote conversion (IP-01)
- Recording a delivery event (IP-03)
- Inspection, accept/reject, condition/quality findings, rejection reasons (IP-03)
- Service delivery evidence and service completion (IP-03)
- Amendment / cancellation / return / replace / correct initiation (IP-04)
- Payment collection (BP-007)
- Stock reservation, pick, ship, valuation (BP-008)
- Booking / resource scheduling
- Recalculation of commercial amounts

---

## Boundary with IP-03 and IP-04

| Question | Owner |
|----------|-------|
| What state is the order in, and may it complete? | **IP-02** |
| What was delivered, inspected, accepted or rejected? | **IP-03** |
| What do we do after rejection (return, replace, correct, cancel, amend)? | **IP-04** |
| What financial consequence follows? | BP-007 |
| What happens to physical stock? | BP-008 |

Physical quantity identity used by IP-02 is **derived**, not independently keyed:

```
ordered       = IP-01 confirmed quantity
delivered     = IP-03 (accepted + rejected)     // physically present
accepted      = IP-03                           // operationally fulfilled
rejected      = IP-03                           // arrived, not accepted
missing       = ordered − delivered             // not delivered
outstanding   = ordered − accepted              // still due = missing + rejected
              = missing + rejected              // until IP-04 closes qty without replacement
```

**Reject and return** (replace expected): outstanding stays **rejected + missing**. Those units were not accepted, so they remain due.

**Reject and return** (credit / cancel, no replacement): IP-04 closes the rejected qty; outstanding then equals **missing only**.

IP-02 must not invent a second “fulfilled” quantity that disagrees with IP-03 accepted.

---

## Lifecycle

```
DRAFT
  → CONFIRMED
       → IN_PROGRESS          (first IP-03 delivery or service activity)
            → PARTIALLY_FULFILLED
                 → FULFILLED / COMPLETED
  → CANCELLED                 (IP-04 owns the action)
```

| From | To | Gate |
|------|----|------|
| Draft | Confirmed | IP-01 commercial validation (+ SoD if required) |
| Confirmed | In Progress | First eligible IP-03 delivery or service activity |
| In Progress | Partially Fulfilled | IP-03 shows partial accepted/delivered; remainder outstanding or rejected pending IP-04 |
| * | Fulfilled / Completed | Outstanding = 0; mandatory inspection complete (IP-03); rejected qty has IP-04 disposition where required; mandatory service complete (IP-03); SoD if gated |
| Eligible | Cancelled | IP-04; not from Completed via ordinary edit |
| Cancelled | (fulfilment / delivery) | **Forbidden** |

Invalid transitions fail closed. Actor, timestamp and reason are recorded on material changes.

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-005 | Controlled lifecycle from draft through completion/cancellation. |
| BR-007 | Order quantities and line-level fulfilment status (rolled up from IP-03). |
| BR-008 | Partial fulfilment status where remainder remains. |
| BR-009 | Track ordered, fulfilled (accepted), outstanding, inspected and cancelled. |
| BR-010 | Prevent fulfilment of an order not in an eligible state. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Support Draft, Confirmed, In Progress, Partially Fulfilled, Fulfilled/Completed, Cancelled. | FR-011–FR-016 |
| FR-002 | Enforce valid lifecycle transitions. | FR-017 |
| FR-003 | Record actor, timestamp and reason for material lifecycle changes. | FR-018 |
| FR-004 | Prevent fulfilment/delivery of cancelled orders. | FR-019 |
| FR-005 | Prevent completion where required IP-03 delivery, inspection or service remains outstanding. | FR-020 |
| FR-006 | Display outstanding quantity per line (derived: `ordered − accepted` = missing + open rejected). | FR-021 |
| FR-007 | Display accepted/fulfilled quantity from IP-03; support partial status. | FR-022–FR-023 |
| FR-008 | Prevent implied fulfilment beyond ordered quantity. | FR-024 |
| FR-009 | Track fulfilment status independently per line. | FR-025 |
| FR-010 | Apply maker-checker on header completion when gated. | SC-008 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-009 | An order cannot be fulfilled beyond its ordered quantity. |
| BRU-010 | An order cannot be marked complete while mandatory IP-03 delivery, inspection or service remains outstanding. |
| BRU-011 | Cancelled orders cannot be fulfilled or delivered. |
| BRU-012 | Completed orders cannot be ordinarily edited. |
| BRU-013 | Partial fulfilment must leave remaining outstanding (and rejected, if any) explicitly visible. |
| BRU-014 | Material lifecycle transitions are auditable. |
| BRU-020 | Failed delivery/inspection validation (IP-03) prevents completion. |
| BRU-025 | Never silently convert failed delivery/inspection into completed. |

---

## High-level process flow

```
Confirmed order (IP-01)
        ↓
IP-03 records delivery / inspection / service
        ↓
IP-02 updates status from those outcomes
        ↓
Outstanding or inspection pending or rejected without IP-04 disposition?
   Yes → remain In Progress / Partially Fulfilled
   No  → Complete (SoD if gated)
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| SoD on header completion | When inspection- or evidence-gated, or above threshold |
| Partial fulfilment status | Enabled (default on) |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01 | Confirmed order and ordered quantities |
| IP-03 | Delivery, inspection, accept/reject, service completion — **source of operational quantities** |
| IP-04 | Cancellation; disposition of rejected quantity |
| IP-05 | Status and next actions in the Sales workspace |
| ENG-005 | Header-completion SoD |
| ENG-013 | Lifecycle audit |
| ENG-003l | Completion checklist: IP-03 gates must be satisfied |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Orders by lifecycle | Draft through completed/cancelled |
| Outstanding fulfilment | Lines with outstanding (undelivered) quantity |
| Partial fulfilment | Partially fulfilled orders |

Delivery/inspection detail reports are IP-03 / IP-05.

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Only valid lifecycle transitions succeed; invalid transitions fail closed. |
| AC-002 | Cancelled orders cannot receive IP-03 delivery. |
| AC-003 | Header cannot complete while IP-03 outstanding > 0 or inspection pending. |
| AC-004 | Accepted/delivered/rejected/outstanding on the order match IP-03; IP-02 does not store a conflicting fulfilled qty. |
| AC-005 | Partial status leaves outstanding visible as missing + open rejected (`ordered − accepted`). |
| AC-006 | Material lifecycle events are audited. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Implemented — Wave 2 IP-02 (2026-08-24) |
| Pack | [Build Pack-006 Scope](./Build%20Pack-006%20Scope.md) |
| Previous | [IP-01](./IP-01%20Sales%20%26%20Order%20Creation.md) |
| Next | [IP-03 Delivery, Inspection & Service Completion](./IP-03%20Delivery%2C%20Inspection%20%26%20Service%20Completion.md) |

---

## Implementation notes (2026-08-24)

**Status:** Implemented. IP-03 supplies operational outcomes. IP-04 now supplies cancellation authorisation and rejected-quantity disposition. BP-007 and BP-008 were not started.

### Architecture flow

```
Confirmed sale (IP-01)
        ↓
IP-03 operational outcome (delivery / inspection / service records)
        ↓
IP-02 derives line quantities and rolls up header status
        ↓
Outstanding / inspection / service / rejected disposition / checklist?
   Yes → remain In progress or Partially fulfilled
   No  → Request completion (SoD if configured) → Completed
```

Cancellation is recognised only when IP-04 authorises it. IP-02 does not provide a cancel action.

### Files created

- `03-platform/src/modules/sales/services/order-lifecycle-rules.ts`
- `03-platform/src/modules/sales/adapters/fulfilment-outcome-adapter.ts`
- `03-platform/src/modules/sales/adapters/order-disposition-adapter.ts`
- `03-platform/src/modules/sales/adapters/completion-checklist-adapter.ts`
- `03-platform/drizzle/0058_bp006_ip002_order_lifecycle_fulfilment.sql`
- `03-platform/scripts/bp006-ip02-order-lifecycle-fulfilment-smoke-validation.ts`

### Files modified

- Sales constants, errors, types, ports, service, repository, memory store, audit helper, actions, index
- Sales workspace and dashboard
- `sales-order` schema (completion SoD columns only)
- `drizzle/meta/_journal.json`

### Persistence

Migration `0058` adds completion maker-checker columns on `sales_order`. It does **not** store accepted, rejected, or fulfilled quantity. Those remain derived from the IP-03 port.

### Contracts

- **IP-03** `FulfilmentOutcomePort` — accepted/rejected/inspection/service/evidence. Production uses the IP-03 persisted adapter.
- **IP-04** `OrderDispositionPort` — cancellation authorisation and rejected-quantity close. Production uses the persisted IP-04 adapter (`PersistedOrderDispositionAdapter`).
- **ENG-003l** `CompletionChecklistPort` — completion checklist from operational facts.
- **IP-05 readiness** — `readyForDelivery`, `readyForInspection`, `readyForCompletion`, `completionBlocked`, `completionBlockers[]`, `readyForCancellation`.

### UX

Sale detail shows current status, expected total, progress (Confirmed → In progress → Partially fulfilled → Completed), line quantities, and completion blocked/ready copy in business language. Payment remains not recorded. Cancellation, return and versioned amendment actions are IP-04 on this same workspace.

### Smoke

`npx tsx scripts/bp006-ip02-order-lifecycle-fulfilment-smoke-validation.ts`

### Intentional exclusions

Payment (BP-007), inventory (BP-008), commercial recalculation. Delivery/inspection capture is IP-03. Cancellation/return/replace initiation is IP-04.

---

## Manual business-user reproduction (BA)

Synthetic data — same Journey Alpha path as IP-01.

**Business:** Journey Alpha Services KE  
**Customer:** Test Customer Alpha  
**Offering:** Journey Alpha Advisory Service  

1. Complete the IP-01 journey so a sale is **Confirmed** (for example `SO-000001`) with expected total unchanged and **Payment not yet recorded**.
2. Open the sale from **Sales**.
3. Confirm the header shows customer, order date, current status **Confirmed**, and expected total.
4. Confirm **Sale progress** shows Confirmed as the current step.
5. In the line table, Ordered equals the confirmed quantity. Accepted, Rejected, Missing and Outstanding show `0 / 0 / ordered / ordered` because delivery has not been recorded yet.
6. Confirm **Completion blocked** with a business reason such as outstanding units or delivery not started. Do not see IP/engine names.
7. What must **not** happen in IP-02 itself: no cancel button, no cash/M-Pesa, no stock movement, no change to expected total. After IP-03, arrival and inspection are recorded on this same sale.

When delivery results exist later, refresh the sale: status moves to **In progress** then **Partially fulfilled** as accepted quantity appears, and completion stays blocked until outstanding is zero and required checks pass. A second authorised user completes the sale when asked.

After IP-03, the same workspace also records arrival, inspection, and service completion. IP-02 still owns whether the sale header may complete.

---

## IMPLEMENTATION PROMPT ARCHIVE

The following is the Wave 2 implementation prompt that authorised this IP.

```
Cursor Implementation Prompt — BP-006 IP-02 Order Lifecycle & Fulfilment

Implement ONLY BP-006 IP-02. Do not implement IP-03, IP-04, IP-05, BP-007,
BP-008, payment, inventory, booking, scheduling, delivery capture, inspection,
rejection processing, returns, amendments, replacement, refunds, invoicing or
stock movement. Do not redesign IP-01.

Objective: manage a confirmed sales order through its lifecycle and keep
line-level fulfilment status visible. IP-02 owns whether the order may progress
or complete, transition validation, audit, completion gates, roll-up from IP-03,
outstanding quantity, partial status, and next-action flags.

Lifecycle:
DRAFT → CONFIRMED → IN_PROGRESS → PARTIALLY_FULFILLED → FULFILLED/COMPLETED
Eligible (not Completed) → CANCELLED (IP-04 owns the action)
Cancelled → any fulfilment state FORBIDDEN
Completed → ordinary edit FORBIDDEN

CONFIRMED → IN_PROGRESS only from first eligible IP-03 activity.
Do not independently create a delivery event.

Quantity (derived from IP-03, never a local fulfilled qty):
ordered = IP-01; delivered = accepted + rejected; outstanding = ordered − accepted
= missing + open rejected. IP-04 may later close rejected qty; IP-02 only consumes that.

Completion fails closed unless outstanding = 0, IP-03 inspection/service gates
pass, rejected disposition complete, SoD passes, and ENG-003l checklist passes.

Use existing ENG-003l, ENG-005, ENG-013. Create IP-03/IP-04 ports if unimplemented.
Do not fake successful disposition or invent fulfilment records.

UX: extend Sales workspace with lifecycle, line quantities, completion readiness
in business language. Payment not recorded.

STOP after implementation report. Do not commit unless instructed.
```


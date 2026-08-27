# BP-006 IP-05 – Downstream Handoff & Sales Workspace

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-05 |
| Build Pack | BP-006 – Sales, Orders & Service Delivery |
| Priority | Critical |
| Depends On | IP-01–IP-04, BP-005 IP-10 |
| Scope coverage | SC-012, SC-013, SC-014, SC-015 |
| Related pack FRs | FR-031, FR-038, FR-045; UX-001–UX-021 |

---

## Objective

Produce the **downstream contracts** that Payments and Inventory consume, and the **operational Sales workspace** users work in — without implementing payment or inventory.

Rename rationale: this IP is **not** “payment/inventory”. BP-006 says *here is the confirmed transaction and what needs to be fulfilled*. BP-007 says *how it was actually paid*. BP-008 says *how physical stock was actually fulfilled*.

---

## Business Problem

If sales screens bury next actions, or if BP-007/BP-008 must scrape order tables ad hoc, integration will fork. A stable handoff plus a coherent Sell → Order → Fulfil/Inspect/Deliver workspace keeps ownership clean.

---

## Scope

### Included

- **Payment-ready transaction contract** for BP-007 (amount due, order reference, commercial snapshot/expected amount, customer, currency, billable lines)
- **Fulfilment-ready contract** for BP-008 (offering, quantities ordered/to-fulfil/accepted, customer, order, inspection outcome)
- Cancellation / return **financial instruction** surface for BP-007 (execution remains BP-007)
- Cancellation / return **stock instruction** surface for BP-008 (execution remains BP-008)
- Sales operational workspace: Sell / Price a Sale, Convert Quote, order status, fulfilment, inspection, service remaining, next actions
- Operational reporting views listed in the pack scope
- Display of payment status **only when BP-007 exists** (read, do not own)
- Contextual links to customer, offering, quotation, order
- Duplicate-submit guards at workspace level
- Distinct maker vs checker actions in the UI

### Excluded

- Payment capture, split tender, receipts, refunds, settlement, variance (BP-007)
- Stock on-hand, reservation, pick/pack/ship, valuation (BP-008)
- Commercial calculation (BP-005)
- Quotation authoring (BP-004)
- Appointment/resource scheduling
- Certification evidence pack (IP-06)

---

## What BP-006 says vs what others do

| BP-006 (this IP) | BP-007 | BP-008 |
|------------------|--------|--------|
| Amount due = KES 300 | Collected = 100 cash + 200 M-Pesa | — |
| Order ORD-… is confirmed / cancelled / return initiated | Executes collection or refund | — |
| Fulfil 5 units of Product X; 4 accepted, 1 rejected on inspection (IP-03) | — | Reserves/moves/adjusts stock for the requested qty |
| Service line complete (no stock) | May bill | No movement |

---

## Payment-ready contract (logical)

Minimum for BP-007:

| Field | Source |
|-------|--------|
| `businessId` | Order |
| Sales/order id and number | IP-01 |
| Customer id | BP-002 via order |
| Currency | BP-005 contract (must match) |
| Expected / amount due | BP-005 expected payable |
| Snapshot / contract ids | BP-005 |
| Line billable breakdown | Copied commercial components, not recalculated |
| Order operational status | IP-02 / IP-03 |
| Financial instruction type | Sale / cancel / return (IP-04) |

BP-006 must not store “amount collected” as system of record.

---

## Fulfilment-ready contract (logical)

Minimum for BP-008:

| Field | Source |
|-------|--------|
| `businessId`, order id, line id | Order |
| Offering id | BP-003 via line |
| Quantity ordered | IP-01 |
| Quantity delivered | IP-03 |
| Quantity accepted | IP-03 |
| Quantity rejected | IP-03 |
| Quantity outstanding | IP-03 (`ordered − accepted` = missing + open rejected) |
| Customer id | Order |
| Fulfilment / inspection status | IP-02 (status) / IP-03 (outcome) |
| Return/replace/correction quantity (if initiated) | IP-04 |

No stock balances. No valuation.

---

## Sales workspace UX (mandatory)

Users never see BP/IP names.

| Journey | Intent |
|---------|--------|
| **Sell / Price a Sale** | Direct sale: customer → offerings → commercial result → confirm |
| **Convert Quote** | From accepted quotation → order (no disconnected second sale) |
| **Orders** | Lifecycle status, next action |
| **Fulfil / Inspect** | Ordered vs delivered vs accepted vs rejected vs outstanding; reasons on reject |
| **Deliver service** | What remains to be delivered |
| **Amend / Cancel / Return** | State-legal actions only |

UX rules UX-001–UX-021 in the pack scope apply. Errors near the field; empty states explain next action; ≤4-tap for common transactions where practical; success feedback; Previous/Next on multi-step flows.

Maker and checker must be **separate actions**. The UI must not present Approve on the maker’s own pending item when SoD applies.

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-015 | Reliable billable/payment-ready transaction contract for BP-007. |
| BR-016 | Fulfilment/stock-movement information for BP-008 without owning inventory. |
| BR-020 | Clear operational status and next actions. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Produce fulfilment-ready contract for BP-008. | FR-031 |
| FR-002 | Produce payment-ready contract for BP-007. | BR-015 |
| FR-003 | Surface cancel/return financial instructions without executing them. | FR-045 |
| FR-004 | Handoff hook for future booking/resource capability. | FR-038 |
| FR-005 | Sales workspace journeys and operational views. | UX-001–UX-021 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-015 | Order creation is not payment success. |
| BRU-016 | Actual collected amount comes from BP-007. |
| BRU-017 | Do not invent commercial amounts in the workspace. |
| BRU-030 | Handoff does not move stock. |

---

## Reporting (workspace views)

Sales by date/customer/offering/status; orders by lifecycle; outstanding fulfilment; partial fulfilment; pending/partial/rejected inspection; service pending/completed; cancelled sales and reasons; customer and product sales history; quote conversions; expected sales value from commercial contract; payment status **only if BP-007 exists**.

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Payment-ready contract exposes amount due from BP-005; no tender split fields as system of record. |
| AC-002 | Fulfilment-ready contract exposes offering and quantities including inspection accepted/rejected; no stock-on-hand. |
| AC-003 | Cancel/return emits instructions only; no refund or stock API execution. |
| AC-004 | Sell / Price a Sale and Convert Quote are reachable without BP/IP jargon. |
| AC-005 | Fulfilment/inspection UI shows ordered, delivered, accepted, rejected and outstanding. |
| AC-006 | Inspection UI shows missing separately from rejected; outstanding = rejected + missing until IP-04 closes rejected qty without replace. |
| AC-007 | Service UI shows remaining to deliver. |
| AC-008 | When SoD applies, UI prevents self-approval. |
| AC-009 | Payment status is absent or explicitly “not available” until BP-007 exists. |
| AC-010 | Duplicate submit of confirm/fulfil/inspect is guarded. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Implemented — Wave 3 IP-05 (2026-08-24) |
| Pack | [Build Pack-006 Scope](./Build%20Pack-006%20Scope.md) |
| Previous | [IP-04](./IP-04%20Amendments%2C%20Cancellation%20%26%20Returns.md) |
| Next | [IP-06](./IP-06%20Sales%20Certification.md) |

---

## Implementation notes (2026-08-24)

**Status:** Implemented. IP-06 certified the downstream contracts. BP-007 and BP-008 were not started. Payment collection and stock movement remain unexecuted.

### Architecture flow

```
Confirmed sale (IP-01–IP-04)
        ↓
Payment-ready contract (amount due from BP-005; tenderSplit null)
Fulfilment-ready contract (ordered / delivered / accepted / rejected / missing / outstanding; stockOnHand null)
Financial / stock-return / booking instructions (refundExecuted / stockMoved / schedulerExecuted = false)
        ↓
Sales workspace: Sell / Price a sale / Convert quote / fulfilment views / next actions
        ↓
BP-007 and BP-008 consume contracts later — this IP does not collect cash or move stock
```

Operational notes live in order `metadata.operationalNotes`. No new migration.

### Files created

- `03-platform/src/modules/sales/services/handoff-rules.ts`
- `03-platform/src/modules/sales/components/convert-quote-workspace.tsx`
- `03-platform/src/app/(authenticated)/(app)/sales/convert-quote/page.tsx`
- `03-platform/scripts/bp006-ip05-downstream-handoff-sales-workspace-smoke-validation.ts`

### Persistence

No new tables. Notes append to existing order metadata. Handoff contracts are derived views.

### Contracts

- Payment-ready: expected amount copied from BP-005; `paymentCollectionAvailable: false`; `collectedAmount: null`; `tenderSplit: null`.
- Fulfilment-ready: inspection quantities including missing; `stockOnHand: null`; `inventoryExecuted: false`.
- Cancel/return: financial and stock instructions only; `refundExecuted: false`; `stockMoved: false`.
- Booking handoff: payload only; `schedulerExecuted: false`.

### UX

Sales workspace uses **Sell**, **Price a sale**, and **Convert quote**. Fulfilment shows ordered, delivered, accepted, rejected, missing and outstanding. Service lines show remaining to deliver. Maker cannot see Approve on their own pending confirmation, inspection, cancellation, return or amendment. Payment copy is **Payment not yet recorded — collection is not available yet.** Duplicate confirm/fulfil/inspect submits are guarded in the workspace.

### Smoke

`npx tsx scripts/bp006-ip05-downstream-handoff-sales-workspace-smoke-validation.ts`

### Intentional exclusions

Certification (IP-06), payment capture/refund (BP-007), stock movement (BP-008), commercial recalculation (BP-005), quotation authoring (BP-004), appointment calendar.

---

## Manual business-user reproduction (BA)

**Business:** Journey Alpha Services KE  
**Customer:** Test Customer Alpha  

### Journeys (AC-004 / RT-11)

From **Sales**: **Sell** opens a new sale, **Price a sale** opens commercial resolution, **Convert quote** lists accepted quotations. No BP/IP labels on those buttons.

### Fulfilment quantities (AC-005 / AC-006 / RT-10)

Open a confirmed physical sale after inspection 80 accepted / 15 rejected / 5 missing. Confirm ordered, delivered, accepted, rejected, missing and outstanding. Missing is not shown as rejected. Outstanding is 20 until a return without replacement closes the rejected quantity.

### Service remaining (AC-007)

On a service line, the delivery panel shows **Remaining to deliver**.

### Maker vs checker (AC-008)

Staff A confirms, records arrival, or requests cancellation. Staff A must not see **Approve**. Staff B sees the approve action.

### Payment and handoff (AC-001 / AC-002 / AC-003 / AC-009)

Throughout, the badge reads **Payment not yet recorded — collection is not available yet.** There is no cash/M-Pesa split and no stock-on-hand figure. Cancel and return emit instructions only.

---

## IMPLEMENTATION PROMPT ARCHIVE

The following is the Wave 3 implementation prompt that authorised this IP.

```
Cursor Implementation Prompt — BP-006 IP-05 Downstream Handoff & Sales Workspace

Implement ONLY BP-006 IP-05. Do not implement IP-06, BP-007, BP-008,
payment execution, inventory movement, CRM/quotation ownership,
or a BP-005 redesign.

Objective: downstream contracts for BP-007/BP-008 plus the operational
Sales workspace. Do not collect payment, move stock, or schedule resources.

Locked behaviour:
- Payment-ready contract exposes amount due from BP-005; no tender split as SoR
- Fulfilment-ready contract exposes offering + quantities including inspection; no stock-on-hand
- Cancel/return emits instructions only; refundExecuted false; stockMoved false
- Sell / Price a sale / Convert quote reachable without BP/IP jargon
- Fulfilment UI: ordered, delivered, accepted, rejected, missing, outstanding
- Missing shown separately from rejected; outstanding = rejected + missing until IP-04 closes rejected without replace
- Service UI shows remaining to deliver
- When SoD applies, UI must not present Approve on the maker’s own pending item
- Payment status explicitly “not available” until BP-007 exists
- Duplicate submit of confirm/fulfil/inspect is guarded

UX: Sales workspace in business language. Payment not yet recorded —
collection is not available yet.

STOP after implementation report. Do not commit unless instructed.
```


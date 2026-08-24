# BP-006 IP-03 – Delivery, Inspection & Service Completion

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-03 |
| Build Pack | BP-006 – Sales, Orders & Service Delivery |
| Priority | Critical |
| Depends On | IP-01, IP-02, ENG-005, ENG-013, ENG-015, ENG-003l |
| Scope coverage | SC-007, SC-009, SC-008 (inspection/delivery SoD) |
| Related pack FRs | FR-026–FR-030, FR-032–FR-038, FR-049–FR-060 |

---

## Objective

Record **what was delivered** and **what the customer/business accepted or rejected** — for both **physical goods** and **already-sold services** — with inspection, quantities, reasons, condition/quality findings and evidence.

IP-03 records the **operational outcome**. It does **not** perform inventory accounting or financial settlement.

This IP is not a CRM, booking or resource-scheduling module.

---

## Business Problem

Physical delivery and service completion are different operational facts from “the order exists”. If inspection lives on the order state machine (IP-02), rejection, missing goods and quality findings get collapsed into a single fulfilled quantity. Real deliveries need ordered / delivered / accepted / rejected / outstanding kept distinct.

---

## Scope

### Included

| Capability | In IP-03 |
|------------|----------|
| Physical goods delivery | Yes |
| Service delivery | Yes |
| Delivery inspection | Yes |
| Accept delivered goods (full) | Yes |
| Reject delivered goods (full) | Yes |
| Partial acceptance | Yes |
| Partial rejection | Yes |
| Record rejection reason | Yes |
| Capture delivery/inspection evidence | Yes |
| Record condition/quality findings | Yes |
| Confirm accepted quantity | Yes |
| Confirm rejected quantity | Yes |
| Service completion evidence | Yes |
| Mark delivery/service complete | Yes |
| Prevent false completion | Yes |

### Excluded

- Order lifecycle / whether the header may complete (IP-02 — consumes these outcomes)
- Return, replace, correct, amend, cancel **after** rejection (IP-04)
- Inventory movement, stock adjustment, valuation (BP-008)
- Refunds, credits execution, payment (BP-007)
- Quotation authoring (BP-004)
- General calendar / appointments / resource scheduling
- Recalculation of commercial amounts (BP-005)

---

## Locked split

| IP / pack | Question |
|-----------|----------|
| **IP-03** | What was delivered and what did the customer/business accept or reject? |
| **IP-04** | What do we do operationally after rejection — amend, cancel, return, replace, correct? |
| **BP-007** | What financial consequence does that create? |
| **BP-008** | What happens to the physical stock? |

---

## Handoff

### Physical goods

```
BP-006 IP-02
Order / Fulfilment status
       ↓
IP-03
Delivery
       ↓
Inspection
       ↓
Accepted / Rejected / Partially Accepted
       ↓
BP-008
Inventory movement / stock adjustment
```

Accepted quantity is what IP-05 may present to BP-008 as the stock-relevant fulfilled qty. Rejected quantity is an IP-04 candidate (return/replace) and a BP-008 stock-adjustment candidate — **executed in BP-008, not here**.

### Services

```
BP-006 IP-02
Order
       ↓
IP-03
Service Delivery
       ↓
Evidence / Completion
       ↓
Completed
```

Service completion does **not** require inventory movement.

---

## Worked example (physical)

Order: **100** units.

Delivery arrives claiming 100. Inspection finds **80** acceptable, **15** defective, **5** missing.

IP-03 records:

| Quantity | Value | Meaning |
|----------|------:|---------|
| Ordered | 100 | From the confirmed order (IP-01 / IP-02) |
| Delivered | 95 | Physically present = accepted + rejected |
| Accepted | 80 | Passed inspection — only this qty is fulfilled |
| Rejected | 15 | Defective; reason/evidence required |
| Missing | 5 | Not delivered = ordered − delivered |
| **Outstanding (still due)** | **20** | **rejected + missing** = ordered − accepted |

The customer still does not have 20 units. Rejecting 15 does not shrink outstanding to the 5 missing.

The user may:

- Accept 80, reject 15 (with reasons/evidence). **Outstanding = 20** until IP-04 acts.
- **Reject and return + replace:** outstanding remains **20** (15 to replace + 5 still missing).
- **Reject and return + credit / no replace:** IP-04 closes the 15; outstanding becomes **5** (missing only).
- Reject the entire delivered quantity (95): outstanding = 95 rejected + 5 missing = **100**.

IP-03 does **not** restock the 15, credit the customer, or reduce the commercial payable. Those are IP-04 → BP-007 / BP-008.

---

## Quantity rules (physical)

Always keep the buckets distinct. **Outstanding** is “still due”, not “not yet arrived”.

```
delivered     = accepted + rejected
missing       = ordered − delivered
outstanding   = ordered − accepted
              = missing + rejected          // default after inspection
delivered     ≤ ordered
accepted + rejected + missing = ordered
accepted + outstanding        = ordered     // before IP-04 closes qty without replacement
```

| Bucket | Meaning | In outstanding? |
|--------|---------|-----------------|
| Accepted | Fulfilled | No |
| Missing (not delivered) | Never arrived | **Yes** |
| Rejected | Arrived, not accepted | **Yes**, until IP-04 credits/cancels with no replacement |
| Closed (IP-04, no replace) | No longer due | No |

- **Missing ≠ rejected.** Both can sit inside outstanding at the same time.
- Fulfilled-for-completion of a quantity = **accepted**.
- Rejected quantity must not be silently treated as completed.
- **Reject and return** with replacement expected: outstanding stays rejected + missing.
- **Reject and return** with credit only: IP-04 removes rejected qty from outstanding.

---

## Inspection outcomes (physical)

| Outcome | Meaning |
|---------|---------|
| Full acceptance | Accepted = delivered; rejected = 0 |
| Partial acceptance / partial rejection | Both accepted and rejected > 0 (and/or outstanding > 0) |
| Full rejection | Accepted = 0; rejected = delivered |

Comments / rejection reason:

- Mandatory on any rejection (partial or full).
- Mandatory on partial acceptance (must explain the split).
- Condition/quality findings recorded where configured (e.g. damaged, wrong item, short dated).
- Evidence (ENG-015) where configured.

Maker/checker: the user who records delivery (maker) cannot inspect/accept/reject when SoD is required (default **on** for inspection-required physical lines).

---

## Service completion

- Identify service lines from BP-003 offering type (no second master).
- Associate delivery with the originating order line.
- Status: pending → in progress → delivered/completed (or cancelled via IP-04).
- Evidence required where configured; missing evidence fails closed.
- Maker-checker on completion when configured.
- No inventory API / stock change.
- Handoff hook only for future booking/resource capability (FR-038) — no scheduler in this IP.

---

## Prevent false completion

IP-03 must not mark a delivery or service complete when:

- inspection is required and has not been recorded
- accepted + rejected + missing do not reconcile to ordered
- outstanding does not equal ordered − accepted (before IP-04 closes qty without replacement)
- required reasons, findings or evidence are missing
- SoD is required and checker has not approved
- the order is cancelled (IP-02 / IP-04)

IP-02 refuses header completion until these IP-03 gates pass.

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-006 | Support both physical product sales and service delivery transactions. |
| BR-011 | Mark service-based orders delivered/completed with appropriate evidence. |
| BR-022 | Inspect delivered physical goods; accept in full, in part, or reject, with reasons. |
| BR-023 | Maker-checker at inspection and gated delivery/service completion. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Record physical delivery quantity against an order line. | FR-026, FR-055 |
| FR-002 | Require inspection of delivered physical goods where configured. | FR-049 |
| FR-003 | Support full acceptance, partial acceptance, full rejection, partial rejection. | FR-050, FR-058, FR-059 |
| FR-004 | Confirm accepted quantity and rejected quantity. | FR-052, FR-060 |
| FR-005 | Record rejection reason; comments mandatory on partial accept and any reject. | FR-051, FR-057 |
| FR-006 | Record condition/quality findings where configured. | FR-056 |
| FR-007 | Capture delivery/inspection evidence where configured. | FR-030 |
| FR-008 | Record delivery date and responsible users (maker and checker). | FR-029 |
| FR-009 | Record missing quantity separately; outstanding (still due) = missing + open rejected. | FR-021, FR-055 |
| FR-010 | Identify service lines and associate delivery with the order line. | FR-032–FR-034 |
| FR-011 | Record service completion evidence; mark service complete. | FR-028, FR-035 |
| FR-012 | Complete service without inventory movement. | FR-036 |
| FR-013 | Prevent false completion of delivery or service. | FR-037, FR-053 |
| FR-014 | Enforce maker-checker on inspection/completion when SoD is required. | FR-054 |
| FR-015 | Handoff hook to future booking/resource capability. | FR-038 |
| FR-016 | Mark physical accepted qty ready for BP-008 via IP-05 (do not move stock). | FR-027 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-009 | Delivered (accepted + rejected) cannot exceed ordered quantity. |
| BRU-010 | Line/order cannot complete while mandatory inspection or service remains outstanding. |
| BRU-011 | Cancelled orders cannot be delivered. |
| BRU-013 | Partial accept/reject and missing qty remain explicitly visible. |
| BRU-014 | Delivery, inspection and service completion events are auditable. |
| BRU-020 | Failed inspection/delivery validation prevents completion. |
| BRU-024 | Required evidence, reasons and findings must be supplied before completion. |
| BRU-025 | Never silently convert failed or rejected delivery into completed. |
| BRU-028 | Rejection reason/comments mandatory on partial accept and any reject. |
| BRU-029 | Maker cannot approve own inspection or gated completion when SoD required. |
| BRU-030 | Inspection/delivery recording does not move stock or settle money. |
| BRU-031 | Missing ≠ rejected. Outstanding (still due) = ordered − accepted = missing + open rejected. |
| BRU-033 | Reject-and-return with replace keeps rejected qty in outstanding. Credit/cancel without replace (IP-04) removes it. |
| BRU-032 | Rejected quantity is an IP-04 input; IP-03 does not initiate the return. |

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Inspection required | Default **on** for physical lines; per offering / business override |
| Evidence | Comments only vs comments + attachment |
| Quality finding codes | Damaged, defective, wrong item, short dated, other |
| Rejection reasons | Required list |
| SoD on inspection | Default on when inspection required |
| SoD on service completion | On when evidence-gated or above threshold |
| Service evidence required | Per offering / business |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01 / IP-02 | Order, lines, ordered qty, eligible state |
| IP-04 | Consumes rejected (and optionally accepted-for-return) qty; does not inspect |
| IP-05 | Delivery/inspection UI; fulfilment-ready contract for BP-008 uses accepted qty |
| ENG-005 | Inspection and completion SoD |
| ENG-013 | Delivery / inspection / service audit |
| ENG-015 | Evidence attachments |
| ENG-003l | Delivery/inspection/service completion gates |
| BP-008 | Does **not** execute here; IP-05 publishes accepted / rejected / return quantities |
| Future booking | Handoff payload only |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Pending inspection | Delivered but not inspected |
| Partial / rejected inspection | Accepted-in-part, partial reject, full reject |
| Outstanding (still due) | Missing + open rejected (`ordered − accepted`) |
| Services pending / completed | Service lines |
| Evidence outstanding | Delivery recorded but required evidence missing |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | 100 ordered, 80 accepted, 15 rejected, 5 missing stores delivered 95, missing 5, **outstanding 20**. |
| AC-002 | Missing quantity is not classified as rejected. |
| AC-003 | Full rejection of delivered goods is supported with mandatory reason. |
| AC-004 | Partial accept/reject requires comments/reason; quality findings stored when configured. |
| AC-005 | Inspection-required line cannot complete without an inspection outcome. |
| AC-006 | When SoD is required, delivery recorder cannot inspect/accept own delivery. |
| AC-007 | Rejected or failed inspection cannot be stored as line-complete. |
| AC-008 | Service completion does not call inventory/stock APIs. |
| AC-009 | IP-03 does not create a return, refund or stock movement. |
| AC-010 | Cancelled orders cannot receive delivery. |
| AC-011 | No appointment calendar or resource scheduler is introduced. |
| AC-012 | Delivery, inspection and service events are audited. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Implemented — Wave 2 IP-03 (2026-08-24) |
| Pack | [Build Pack-006 Scope](./Build%20Pack-006%20Scope.md) |
| Previous | [IP-02](./IP-02%20Order%20Lifecycle%20%26%20Fulfilment.md) |
| Next | [IP-04](./IP-04%20Amendments%2C%20Cancellation%20%26%20Returns.md) |
| Supersedes | `IP-03 Service Delivery & Completion.md` (renamed and broadened 2026-08-24) |

---

## Implementation notes (2026-08-24)

**Status:** Implemented. IP-04 now consumes rejected quantity. IP-05 consumes delivery/inspection quantities in the fulfilment-ready contract. IP-06 certified the pack. BP-007 and BP-008 were not started.

### Architecture flow

```
Confirmed sale (IP-01 / IP-02)
        ↓
Record arrival (physical) or start service
        ↓
Inspect: accepted / rejected / missing (physical)
or complete service with evidence
        ↓
IP-02 rolls quantities and header status
        ↓
Header completion remains IP-02 (blocked while outstanding, inspection pending, or service incomplete)
```

Operational facts live on `sales_delivery_event` and `sales_inspection_outcome`. IP-02 does not store a competing fulfilled quantity on the order line.

IP-03 does not start a return, move stock, or take payment. The fulfilment-ready contract may expose a zero `returnReplaceQuantity` for IP-05; execution remains BP-008.

### Files created

- `03-platform/src/db/schema/sales-delivery.ts`
- `03-platform/drizzle/0059_bp006_ip003_delivery_inspection_service.sql`
- `03-platform/src/modules/sales/services/delivery-rules.ts`
- `03-platform/src/modules/sales/services/sales-delivery-service.ts`
- `03-platform/src/modules/sales/services/sales-delivery-memory-store.ts`
- `03-platform/src/modules/sales/adapters/delivery-outcome-adapter.ts`
- `03-platform/src/modules/sales/repositories/sales-delivery-repository.ts`
- `03-platform/src/modules/sales/components/sales-delivery-panel.tsx`
- `03-platform/scripts/bp006-ip03-delivery-inspection-service-smoke-validation.ts`

### Persistence

Migration `0059` adds delivery events and one inspection outcome per arrival. Accepted and rejected quantities are stored on the inspection record, then rolled into IP-02.

### Contracts

- IP-02 `FulfilmentOutcomePort` is now backed by delivery/inspection records.
- Inventory handoff includes accepted/rejected quantity with `inventoryExecuted: false` and `stockMoved: false`.
- Booking handoff is payload-only with `schedulerExecuted: false`.

### UX

Confirmed sales show **Record arrival**, **Inspect**, **Start service**, and **Complete service** in business language. Payment remains not recorded. Cancel, return and versioned amendment are IP-04 on the same workspace. IP-03 does not start a return, take cash, or move stock.

### Smoke

`npx tsx scripts/bp006-ip03-delivery-inspection-service-smoke-validation.ts`

### Intentional exclusions

Amend/cancel/return/replace (IP-04), sales workspace chrome (IP-05), certification (IP-06), payment (BP-007), inventory (BP-008), commercial recalculation, appointment calendar.

---

## Manual business-user reproduction (BA)

**Business:** Journey Alpha Services KE  
**Customer:** Test Customer Alpha  

### Physical inspection (RT-06)

Use a **physical product** offering (not the Advisory service). Confirm a sale for **100** units.

1. Sign in as staff A. Open the confirmed sale from **Sales**.
2. Under **Delivery and inspection**, enter **100** and choose **Record arrival**.
3. Staff A chooses **Inspect** for 80 accepted / 15 rejected — this must fail. Another authorised person must inspect.
4. Sign in as staff B. Inspect: accepted **80**, rejected **15**, reason **Defective**, comments explaining the split and the 5 that did not arrive.
5. Confirm quantities: delivered **95**, missing **5**, outstanding **20**. Missing is not shown as rejected.
6. Confirm **Payment not yet recorded**. Stock is not moved. No return is started. Expected total is unchanged.

### Service completion (RT-07)

Use **Journey Alpha Advisory Service**. Confirm a sale, **Start service** as staff A, then **Complete service** as staff B with a completion note. Payment is still not recorded. No stock movement occurs. Completion of the sale header remains a later approval step if outstanding checks remain.

---

## IMPLEMENTATION PROMPT ARCHIVE

The following is the Wave 2 implementation prompt that authorised this IP.

```
Cursor Implementation Prompt — BP-006 IP-03 Delivery, Inspection & Service Completion

Implement ONLY BP-006 IP-03. Do not implement IP-04, IP-05, IP-06, BP-007,
BP-008, payment, inventory movement, returns, amendments, refunds, or a
scheduler. Do not redesign IP-01 or IP-02.

Objective: record what was delivered and what the customer/business accepted
or rejected — for physical goods and already-sold services — with inspection,
quantities, reasons, quality findings and evidence.

Locked example: ordered 100, inspect 80 accepted / 15 rejected / 5 missing
→ delivered 95, outstanding 20 (ordered − accepted). Missing ≠ rejected.
Rejected stays outstanding until IP-04.

IP-02 still owns header completion. Persist delivery/inspection off the
order line. Roll outcomes into FulfilmentOutcomePort. Physical inspection
and service completion use maker-checker when configured. Evidence is a
note/ref stub (no binary upload). Handoffs stay unexecuted.

UX: extend the Sales order workspace in business language (Record arrival,
Inspect, Start service, Complete service). Payment not yet recorded.

STOP after implementation report. Do not commit unless instructed.
```


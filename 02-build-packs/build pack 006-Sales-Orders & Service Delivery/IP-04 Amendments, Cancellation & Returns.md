# BP-006 IP-04 – Amendments, Cancellation & Returns

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-04 |
| Build Pack | BP-006 – Sales, Orders & Service Delivery |
| Priority | High |
| Depends On | IP-01, IP-02, IP-03, ENG-005, ENG-013 |
| Scope coverage | SC-010, SC-011, SC-008 |
| Related pack FRs | FR-039–FR-045 |

---

## Objective

Provide **controlled** amendment, cancellation and return/replace/correction **initiation** according to order state — without silent commercial mutation, without executing refunds, and without executing inventory returns.

**IP-03** decides what was delivered and accepted or rejected. **IP-04** decides what to do next.

---

## Business Problem

If staff can edit a confirmed order’s price or quantity in place, commercial provenance from BP-005 is lost. If cancellation tries to refund money or restock goods inside Sales, BP-006 becomes a payment and inventory engine.

---

## Scope

### Included

- Cancel eligible draft and confirmed (and in-progress, where configured) transactions
- Cancellation reason where configured
- Block ordinary-edit cancellation of completed transactions
- Controlled amendment **before** confirmation (edit draft)
- Material change **after** confirmation creates an **amendment version**, not an in-place silent change
- New commercial contract from BP-005 when amendment changes commercially material values
- Initiate return / replace / correction **after** IP-03 rejection (or from accepted qty where a later return is required)
- Pass financial consequence as an **instruction** to BP-007
- Pass stock-return need as an **instruction** via IP-05 to BP-008
- Maker-checker on cancel, return initiation, and post-confirm amendment when configured

### Excluded

- Refund execution, receipt reversal, payment allocation (BP-007)
- Stock put-away, reverse reservation, inventory valuation (BP-008)
- Recalculation of tax/discount inside BP-006 (must call BP-005 for a new contract)
- Quotation revision (BP-004)
- Ordinary fulfilment status (IP-02)
- Delivery, inspection, accept/reject, quality findings (IP-03 — IP-04 **consumes** rejected qty)

---

## State eligibility

| Action | Draft | Confirmed / In progress / Partial | Completed | Cancelled |
|--------|-------|-----------------------------------|-----------|-----------|
| Edit lines/amounts in place | Allowed (re-consume BP-005 before confirm) | **Forbidden** — amendment version | Forbidden | Forbidden |
| Confirm | IP-01 | n/a | n/a | n/a |
| Cancel | Eligible | Eligible with reason (+ SoD if configured); financial instruction if payment may exist | Not via ordinary edit | n/a |
| Initiate return/correction | n/a | Eligible where fulfilled/inspected qty exists | Eligible as correction path, not ordinary edit | No |

Completed orders are not ordinarily edited (BRU-012). Corrections use the return/correction process.

---

## Amendment after confirmation

```
Confirmed order (immutable commercial values)
        ↓
Propose amendment (maker)
        ↓
Material commercial change?
   No  → version notes / non-material fields (instructions) per policy
   Yes → BP-005 resolve new CommercialTransactionContract
        ↓
Validate new contract
        ↓
Checker approves version (SoD when required)
        ↓
Prior version retained; new version becomes current
        ↓
Fulfilment quantities remain constrained by the new ordered qty (cannot exceed)
```

Silent in-place change of payable, tax, discount, currency, offering or ordered quantity after confirmation is **forbidden**.

If BP-005 cannot produce a valid contract for the amendment, the amendment fails closed. The original confirmed version remains.

---

## Cancellation

- Reason required where configured.
- Actor, timestamp, reason audited.
- Cancelled orders cannot be fulfilled (IP-02).
- If payment may already exist (BP-007 later), BP-006 emits a **cancellation financial instruction**; it does not refund.
- Maker-checker when configured (especially after confirmation).

---

## After IP-03 rejection (returns, replace, correct)

IP-03 records rejected quantity. IP-04 **initiates** what happens next. It does not re-inspect.

Typical dispositions for rejected (and, where configured, for a later return of previously accepted goods):

| Disposition | IP-04 does | Does not |
|-------------|------------|----------|
| Return + replace | Initiate return of rejected qty; **outstanding stays rejected + missing** | Move stock (BP-008) |
| Return + credit (no replace) | Initiate return; **close rejected qty so outstanding becomes missing only**; financial instruction | Execute refund (BP-007) |
| Replace (without treating as credit) | Keep rejected qty in outstanding as still due | Recalculate price (BP-005) unless a material amendment is required |
| Correct / amend | Versioned commercial amendment if amounts change | Silent in-place edit |
| Cancel remainder | Cancel outstanding or rejected qty per eligibility | Refund (BP-007) |

Initiation only:

1. Identify order/line and quantities from IP-03 (rejected, and/or accepted if a subsequent return).
2. Choose return / replace / correct / cancel remainder.
3. Capture reason and comments.
4. SoD approve when configured.
5. Emit:
   - financial instruction for BP-007 (credit/refund/adjustment — BP-007 executes)
   - stock instruction for BP-008 via IP-05 (BP-008 executes)

Missing is **not** a rejection, but it **is** part of outstanding. After inspection, outstanding = missing + rejected.

- **Return + replace:** outstanding remains rejected + missing (still due).
- **Return + credit / cancel remainder (no replace):** rejected qty leaves outstanding; missing remains due unless also cancelled/amended.

BP-006 does not collect money back or move stock.

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-017 | Cancellation and controlled amendment according to transaction state. |
| BR-018 | Prevent silent modification of commercially material values after confirmation. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Allow cancellation of eligible draft/confirmed transactions. | FR-039 |
| FR-002 | Require a cancellation reason where configured. | FR-040 |
| FR-003 | Prevent cancellation of completed transactions through an ordinary edit. | FR-041 |
| FR-004 | Support controlled amendment before confirmation. | FR-042 |
| FR-005 | Material post-confirm changes create an amendment/version. | FR-043 |
| FR-006 | Support initiation of return, replace or correction after IP-03 rejection (or a later return of accepted goods). | FR-044 |
| FR-007 | Pass financial consequence to BP-007; do not execute refunds. | FR-045 |
| FR-008 | Maker-checker on cancel / return / post-confirm amendment when configured. | SC-008 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-007 | Confirmed commercial values cannot be silently changed. |
| BRU-008 | Material commercial amendment requires a controlled version and a new valid BP-005 contract where amounts change. |
| BRU-012 | Completed orders cannot be ordinarily edited. |
| BRU-017 | BP-006 must not invent or recalculate commercial amounts. |
| BRU-021 | Cancellation after payment requires BP-007 financial handling where applicable. |
| BRU-029 | Maker cannot approve own cancellation, return or amendment when SoD required. |
| BRU-032 | IP-03 records accept/reject; this IP initiates return/replace/correct after rejection. |
| BRU-033 | Return + replace keeps rejected qty in outstanding. Return + credit (no replace) removes rejected qty from outstanding. |

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Cancellation reasons | Required list |
| Return reasons | Required list |
| SoD on cancel after confirm | Default on |
| SoD on return initiation | Default on |
| SoD on material amendment | Default on |
| Material field paths | Quantity, offering, currency, commercial amounts, customer |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01 | Draft amendment; version current order |
| IP-02 / IP-03 | Honour cancelled state; consume IP-03 rejected qty as return/replace candidate |
| IP-05 | Financial instruction (BP-007) and stock-return instruction (BP-008) |
| BP-005 IP-10 | New contract on material commercial amendment |
| ENG-005 | SoD |
| ENG-013 | Amendment / cancel / return audit |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Cancelled sales | Transactions and reasons |
| Amendments | Versioned post-confirm changes |
| Open returns/corrections | Initiated, not yet handled downstream |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Draft lines/amounts can be edited; confirmation still requires a valid BP-005 contract. |
| AC-002 | Changing payable or quantity on a confirmed order in place is rejected. |
| AC-003 | Material post-confirm change produces a new version and consumes a new valid commercial contract. |
| AC-004 | Failed new-contract validation leaves the original confirmed version unchanged. |
| AC-005 | Completed orders cannot be cancelled via ordinary edit. |
| AC-006 | Cancellation records reason, actor and timestamp where required. |
| AC-007 | Return initiation does not post a refund or stock movement. |
| AC-008 | When SoD is required, maker cannot approve own cancel/return/amendment. |
| AC-009 | Cancelled orders cannot subsequently be fulfilled. |
| AC-010 | IP-04 does not record inspection outcomes; it consumes IP-03 rejected/accepted qty. |
| AC-011 | Replace or return can be initiated from rejected qty without executing refund or stock movement. |
| AC-012 | After 80 accepted / 15 rejected / 5 missing, return+replace leaves outstanding 20; return+credit (no replace) leaves outstanding 5. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Implemented — Wave 3 IP-04 (2026-08-24) |
| Pack | [Build Pack-006 Scope](./Build%20Pack-006%20Scope.md) |
| Previous | [IP-03 Delivery, Inspection & Service Completion](./IP-03%20Delivery%2C%20Inspection%20%26%20Service%20Completion.md) |
| Next | [IP-05](./IP-05%20Downstream%20Handoff%20%26%20Sales%20Workspace.md) |

---

## Implementation notes (2026-08-24)

**Status:** Implemented. IP-05 now consumes the financial and stock instruction surfaces. IP-06 certified the pack. BP-007 and BP-008 were not started.

### Architecture flow

```
Confirmed sale (IP-01 / IP-02) + IP-03 inspection outcomes
        ↓
Draft: edit in place (IP-01 updateDraft)
Confirmed: in-place payable/qty edit rejected (MATERIAL_VALUE_IMMUTABLE)
        ↓
Cancel (reason + SoD after confirm) → CANCELLED; cannot be fulfilled
or
Return + replace / return + credit from IP-03 rejected qty (SoD)
or
Versioned quantity/commercial change (new BP-005 contract; prior version retained)
        ↓
Financial instruction (refundExecuted: false) and stock instruction (stockMoved: false)
```

Instructions are stored on `sales_disposition_instruction` and `sales_order_amendment`. IP-04 does not refund, move stock, re-inspect, or silently edit confirmed commercial values.

Quantity formula consumed by IP-02:

- outstanding = ordered − accepted − closedWithoutReplacement
- return + replace keeps rejected qty in outstanding (`replacementPending`)
- return + credit closes rejected qty; outstanding becomes missing only

### Files created

- `03-platform/src/db/schema/sales-exception.ts`
- `03-platform/drizzle/0060_bp006_ip004_amendments_cancellation_returns.sql`
- `03-platform/src/modules/sales/services/exception-rules.ts`
- `03-platform/src/modules/sales/services/sales-exception-service.ts`
- `03-platform/src/modules/sales/services/sales-exception-memory-store.ts`
- `03-platform/src/modules/sales/repositories/sales-exception-repository.ts`
- `03-platform/src/modules/sales/components/sales-exception-panel.tsx`
- `03-platform/scripts/bp006-ip04-amendments-cancellation-returns-smoke-validation.ts`

### Persistence

Migration `0060` adds disposition instructions and amendment versions. `refund_executed` and `stock_moved` default to false and are not flipped by this IP.

### Contracts

- Production `OrderDispositionPort` reads **approved** IP-04 instructions.
- Financial instruction: `refundExecuted: false`, `paymentRecorded: false`.
- Stock-return instruction: `stockMoved: false`, `inventoryExecuted: false`.

### UX

The sale workspace shows **Request cancellation**, **Return and replace**, **Return and credit**, and **Request a quantity change** in business language. Another authorised person must approve after confirmation. Payment remains not recorded.

### Smoke

`npx tsx scripts/bp006-ip04-amendments-cancellation-returns-smoke-validation.ts`

### Intentional exclusions

Sales workspace chrome (IP-05), certification (IP-06), refund execution (BP-007), stock movement (BP-008), commercial recalculation inside Sales, quotation revision (BP-004), re-inspection (IP-03).

---

## Manual business-user reproduction (BA)

**Business:** Journey Alpha Services KE  
**Customer:** Test Customer Alpha  

### Draft edit (AC-001)

Create a draft sale and change quantity before confirmation. Confirmation still uses a valid commercial total.

### Confirmed in-place edit (AC-002)

On a confirmed sale, try to change quantity or payable in place. This must fail. Use **Request a quantity change** instead: staff A requests, staff B approves. A new version and a new commercial total are stored. The previous version remains.

### Cancel (AC-005 / AC-006 / AC-008 / AC-009)

Completed sales cannot be cancelled through this ordinary path. For a confirmed sale, staff A chooses a cancellation reason and **Request cancellation**. Staff A cannot approve their own request. Staff B **Approve cancellation**. Arrival/inspection is then blocked. Payment is not refunded.

### After IP-03 inspection 80 / 15 / 5 (AC-012)

Use a **physical product** offering. Confirm a sale for **100**, record arrival **100**, inspect accepted **80** / rejected **15** (5 missing).

1. Staff A **Return and replace** for the 15 rejected. Staff B approves. Outstanding stays **20**. Stock is not moved.
2. On a second sale with the same split, staff A **Return and credit**. Staff B approves. Outstanding becomes **5** (missing only). Money is not refunded.

Confirm **Payment not yet recorded** throughout.

---

## IMPLEMENTATION PROMPT ARCHIVE

The following is the Wave 3 implementation prompt that authorised this IP.

```
Cursor Implementation Prompt — BP-006 IP-04 Amendments, Cancellation & Returns

Implement ONLY BP-006 IP-04. Do not implement IP-05, IP-06, BP-007,
BP-008, payment execution, inventory movement, CRM/quotation ownership,
or a BP-005 redesign.

Objective: controlled cancel / return+replace / return+credit / versioned
post-confirm amendment. Do not refund, move stock, re-inspect, or silently
edit confirmed commercial values.

Locked behaviour:
- Draft edit allowed (IP-01 updateDraft)
- Confirmed in-place edit forbidden (MATERIAL_VALUE_IMMUTABLE)
- Post-confirm material change = new amendment version + new BP-005 contract
- Failed new contract leaves original confirmed order unchanged
- Completed cancel via ordinary edit forbidden
- After 80/15/5: return+replace outstanding 20; return+credit outstanding 5
- Instructions: refundExecuted false, stockMoved false

UX: extend the Sales order workspace in business language
(Request cancellation, Return and replace, Return and credit,
Request a quantity change). Payment not yet recorded.

STOP after implementation report. Do not commit unless instructed.
```

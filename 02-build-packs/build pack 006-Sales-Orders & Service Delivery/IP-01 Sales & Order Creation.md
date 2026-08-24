# BP-006 IP-01 – Sales & Order Creation

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-01 |
| Build Pack | BP-006 – Sales, Orders & Service Delivery |
| Priority | Critical |
| Depends On | BP-001, BP-002, BP-003, BP-004 IP-10 (read/handoff), BP-005 IP-10, ENG-005, ENG-013 |
| Scope coverage | SC-001, SC-002, SC-003, SC-004, SC-008 (confirmation SoD) |
| Related pack FRs | FR-001–FR-010, FR-046–FR-048 |

---

## Objective

Create a **sales order** for an existing customer from existing offerings, either as a **direct sale** or by **converting an eligible BP-004 quotation**, consuming a validated **BP-005 commercial contract** without recalculating commercial values.

Do **not** split this IP. Customer, lines, quantities, commercial-contract consumption, quote conversion, validation, confirmation and creation audit are one transaction-creation capability.

---

## Business Problem

Without a single order-creation owner, users finish a quotation in CRM and then start an unrelated sale, or checkout recalculates price/tax independently of BP-005. Both break commercial truth and the BP-001–005 journey.

---

## Scope

### Included

- Direct sale: existing customer + one or more existing offerings + quantities
- Quote-to-order conversion from an eligible BP-004 quotation
- Order header and order lines with agreed commercial values copied from BP-005
- Consume / attach `CommercialTransactionContract` (snapshot id, expected amount, provenance)
- Integrity validation of the commercial contract before confirmation
- Draft sales transactions
- Confirmation (with maker-checker where configured)
- Unique sales/order identifier within the business
- Creation / confirmation audit
- Linkage back to customer, offerings, quotation and opportunity (when converted)

### Excluded

- Quotation create / send / accept / reject / expire / version (BP-004 IP-10)
- Recalculation of price, tax, discount or commission (BP-005)
- Order lifecycle after confirm (IP-02)
- Delivery, inspection, accept/reject, service completion (IP-03)
- Post-confirmation amendment, cancellation, returns (IP-04)
- Payment execution (BP-007)
- Inventory movement (BP-008)
- Sales workspace chrome (IP-05 owns journey UX; IP-01 supplies create/confirm actions)
- Booking / appointment / resource scheduling

---

## Quote-to-order boundary (locked)

```
Quotation (BP-004)
   → Accept quotation (BP-004 lifecycle)
   → Convert Quote (BP-006 IP-01)
   → Sales Order (BP-006)
   → Fulfilment status (IP-02) → Delivery / Inspection / Service Completion (IP-03)
```

| Action | Owner |
|--------|-------|
| Create, revise, send, accept, reject, expire quotation | BP-004 IP-10 |
| Decide quotation is eligible for conversion | BP-004 exposes eligibility; BP-006 enforces |
| Create the sales order from that quotation | **BP-006 IP-01** |
| Persist sales order records | **BP-006 only** |

BP-004 must not persist a sales order. A conversion stub in CRM is a handoff, not order ownership.

### Conversion eligibility

A quotation may convert only when all are true:

- same `businessId` as the acting user/business
- linked customer belongs to that business
- quotation status is conversion-eligible (Accepted, or equivalent configured status)
- not expired, rejected, cancelled or already converted (unless a governed re-conversion path exists)
- a valid BP-005 commercial contract can be consumed (existing quote-locked snapshot if still valid, otherwise a newly resolved-and-validated contract — **resolved by BP-005, not by BP-006**)

Expired or rejected quotations fail closed. The user revises the quotation in BP-004 or starts a direct sale.

---

## Two creation paths

### Path A — Direct sale

```
Select customer (BP-002)
        ↓
Select offering(s) + quantities (BP-003)
        ↓
BP-005 resolve → CommercialTransactionContract
        ↓
Draft sale / order (lines + commercial snapshot)
        ↓
Validate contract integrity
        ↓
Confirm (SoD if required)
        ↓
Confirmed sales order
```

### Path B — Quote conversion

```
Eligible quotation (BP-004)
        ↓
Convert Quote (BP-006 IP-01)
        ↓
Carry customer, lines, quantities from quotation
        ↓
Consume valid BP-005 CommercialTransactionContract
        ↓
Draft sale / order linked to quotation (+ opportunity if present)
        ↓
Validate contract integrity
        ↓
Confirm (SoD if required)
        ↓
Confirmed sales order
        ↓
Notify BP-004 of conversion (quotation consumed / converted)
```

Both paths store currency and totals **from the commercial contract**, not from a local calculator.

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Create a sale/order for an existing customer using existing Party/Customer records. |
| BR-002 | A sale may contain one or more existing product/offering or service lines. |
| BR-003 | Convert a validated BP-005 commercial result without recalculating commercial values. |
| BR-004 | Preserve commercial snapshot/contract and provenance on the transaction. |
| BR-014 | Initiate sale from the natural BP-001–005 journey (direct or quote conversion). |
| BR-021 | Convert an eligible BP-004 quotation into a BP-006 sales order without owning quotation. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Create a sales transaction for an existing business/customer. | FR-001 |
| FR-002 | Select one or more existing offerings/products/services. | FR-002 |
| FR-003 | Specify quantity and relevant line attributes. | FR-003 |
| FR-004 | Associate the transaction with the BP-005 commercial contract. | FR-004 |
| FR-005 | Validate the commercial contract before confirmed order creation. | FR-005 |
| FR-006 | Block confirmed order if contract is invalid, expired or tampered with. | FR-006 |
| FR-007 | Generate a unique sales/order identifier within the business. | FR-007 |
| FR-008 | Store currency and commercial totals from BP-005. | FR-008 |
| FR-009 | Preserve line-level commercial breakdown where supplied by BP-005. | FR-009 |
| FR-010 | Support draft sales transactions before confirmation. | FR-010 |
| FR-011 | Convert an eligible BP-004 quotation into a sales order with linkage. | FR-046 |
| FR-012 | Prevent conversion of expired, rejected or ineligible quotations. | FR-047 |
| FR-013 | Do not persist a sales order inside BP-004. | FR-048 |
| FR-014 | Apply maker-checker on confirmation when SoD or value threshold is configured. | FR-054 / SC-008 |
| FR-015 | Prevent duplicate create/confirm submission where technically possible. | UX-017 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Every sale/order is scoped by `businessId`. |
| BRU-002 | Customer must belong to the same business as the transaction. |
| BRU-003 | Offering must belong to the same business as the transaction. |
| BRU-004 | Confirmed sale must reference a valid BP-005 commercial contract. |
| BRU-005 | Contract must pass integrity validation before confirmation. |
| BRU-006 | Currency must match the validated commercial contract unless an explicit FX process exists. |
| BRU-017 | BP-006 must not invent or recalculate commercial amounts. |
| BRU-018 | Cross-tenant access fails closed. |
| BRU-019 | Failed commercial validation prevents confirmation. |
| BRU-022 | Sales/order identifiers unique within the business. |
| BRU-026 | Quote-to-order conversion is owned by BP-006; BP-004 does not persist the order. |
| BRU-027 | Only conversion-eligible quotations may convert. |
| BRU-029 | When SoD is required, the maker who submits confirmation cannot approve it. |
| BRU-015 | Creating or confirming an order is not payment success. |

---

## Logical entities (minimum)

| Entity | Role |
|--------|------|
| `SalesOrder` | Header: business, customer, source (direct / quotation), status, order number, currency, commercial contract refs, expected amount, timestamps |
| `SalesOrderLine` | Offering, quantity ordered, line commercial values from BP-005, line type (physical / service) |
| `SalesOrderCommercialLink` | `snapshotId`, contract id, expected-amount refs, integrity hash / provenance |
| `SalesOrderSourceLink` | Optional quotation id, opportunity id, conversion actor/timestamp |
| `SalesOrderConfirmation` | Submit/approve/reject, maker, checker, reason |

Durable transactional storage of the commercial amounts lives on the order. BP-005 remains the calculation owner; BP-006 stores the consumed result.

---

## Confirmation & maker-checker

```
DRAFT
  → SUBMITTED_FOR_CONFIRMATION   (when SoD / threshold requires it)
  → CONFIRMED
  → (rejected) back to DRAFT
```

When SoD is **not** required, `DRAFT → CONFIRMED` is allowed after contract validation.

When SoD **is** required:

- Maker submits confirmation.
- Checker (different user) approves or rejects.
- Self-approval fails closed.
- Confirmation is blocked until the commercial contract validates.

Quote conversion may land in Draft then follow the same confirmation path; it must not skip contract validation.

---

## Forbidden behaviours

- Query `pricing_item` (or BP-003 price services) to determine a new price at checkout
- Recalculate tax, discount or commission in the sales module
- Create a second commercial snapshot
- Confirm an order with a missing, expired, invalid or tampered contract
- Convert an ineligible quotation
- Write a sales order row from BP-004
- Treat confirmation as payment collected
- Allow cross-business customer or offering on the order

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Order number | Prefix / sequence unique per business |
| Confirmation SoD | Required always / above expected-amount threshold / off |
| Confirmation threshold | Monetary threshold in transaction currency |
| Quote conversion | Which quotation statuses are eligible |
| Draft retention | How long unconfirmed drafts remain active |
| Line types | Physical vs service from offering (BP-003), not re-mastered here |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| BP-002 | Customer search and identity; same-business check |
| BP-003 | Offering search; line type (product vs service) |
| BP-004 IP-10 | Read eligible quotation; notify converted; **do not create order in CRM** |
| BP-005 IP-10 | `get` / `consume` / `validate` / `verifyIntegrity` of `CommercialTransactionContract` |
| ENG-005 | Confirmation maker-checker |
| ENG-013 | Created / converted / confirmed / rejected audit events |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Draft orders | Unconfirmed sales requiring action |
| Conversions | Quotations converted in period |
| Confirmed sales | Confirmed orders by date/customer/source |

Pack operational reporting is assembled in IP-05; IP-01 must emit the data.

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Direct sale can be created as Draft for an existing same-business customer and offering(s). |
| AC-002 | Confirmed order stores snapshot id, expected payable and component breakdown from BP-005; amounts are not locally recalculated. |
| AC-003 | Invalid, expired or tampered commercial contract cannot be confirmed (fail closed). |
| AC-004 | Eligible accepted quotation converts to a BP-006 order linked to quotation (and opportunity when present). |
| AC-005 | Expired, rejected or already-converted quotations cannot convert. |
| AC-006 | No sales-order persistence occurs in BP-004 as part of conversion. |
| AC-007 | Order numbers are unique within the business. |
| AC-008 | Cross-tenant customer/offering/quotation access fails closed. |
| AC-009 | When SoD is required, maker cannot confirm own order. |
| AC-010 | Duplicate submit does not create two confirmed orders. |
| AC-011 | Confirming an order does not record a payment or collected amount. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Implemented — Wave 1 (2026-08-24) |
| Pack | [Build Pack-006 Scope](./Build%20Pack-006%20Scope.md) |
| Next IP | [IP-02 Order Lifecycle & Fulfilment](./IP-02%20Order%20Lifecycle%20%26%20Fulfilment.md) |

---

## Implementation status (Wave 1)

**Implemented.** BP-006 IP-01 is the owner of sale/order creation, quote-to-order conversion, commercial-contract consumption, draft editing, and maker-checker confirmation. IP-02+ were not started.

### Architecture flow

```
Customer (BP-002 / CRM) + Offering (BP-003)
        + optional accepted Quotation (BP-004)
        ↓
BP-005 resolve → CommercialTransactionContract (consumed, not recalculated)
        ↓
BP-006 Draft sale (header + lines + commercial link)
        ↓
Submit for confirmation (maker)
        ↓
Confirm (checker; self-approval blocked)
        ↓
Confirmed sale — expected total preserved; payment not recorded
```

### Contracts exposed (not executed)

- **Payment-ready:** order id, expected amount, currency, customer, commercial contract/snapshot refs, `paymentStatus = NOT_RECORDED`, `tenderSplit = null`
- **Fulfilment-ready:** order id, lines (offering, quantity, line type), `inventoryExecuted = false`

### Persistence

Evolved existing `sales_order` / `sales_order_line` (quotation id now nullable for direct sales). Added `sales_order_commercial_link` to hold the consumed BP-005 snapshot/contract (BP-005 does not persist snapshots). Unique order number remains `(business_id, order_number)`.

### UX delivered

- **Sales** nav → `/sales` list, `/sales/new` wizard, `/sales/[orderId]` review/confirm
- Wizard: Customer → Product/quantity → Expected total → Review → Save draft
- Quotation workspace: **Convert to Sale** creates a BP-006 draft and links to review
- Price-a-sale review: **Create sale** continues the journey
- Business language only; “Payment not yet recorded” on confirmation

### Files created

- `03-platform/src/modules/sales/**` (module, actions, UX, adapters, rules, memory store)
- `03-platform/src/app/(authenticated)/(app)/sales/**`
- `03-platform/drizzle/0057_bp006_ip001_sales_order_creation.sql`
- `03-platform/scripts/bp006-ip01-sales-order-creation-smoke-validation.ts`

### Files modified

- `03-platform/src/db/schema/sales-order.ts`, `index.ts`, `drizzle/meta/_journal.json`
- `03-platform/src/core/audit/constants.ts`
- `03-platform/src/lib/navigation/platform-nav-config.ts`, `business-app-routes.ts`
- CRM quotation conversion stub now delegates to BP-006
- Commercial review: Create sale CTA

### Smoke tests

`npx tsx scripts/bp006-ip01-sales-order-creation-smoke-validation.ts` — TC-01…TC-18 (in-memory, fail-closed).

### Quality gates

See handover. `npm run typecheck` still reports a pre-existing error in `scripts/bp001-004-system-integration-certification.ts` (unrelated `leads` comparison).

### Known gaps

- Draft line/commercial edit UI is service-backed; the wizard recreates rather than editing lines in place
- Session handoff of a frozen snapshot into `/sales/new` is prepared (`sales-journey-handoff.ts`) but the wizard re-resolves via BP-005 from the selected customer/offering/quantity
- SoD is always required in IP-01 (ENG-005 contract); threshold-off bypass exists only as a service policy flag

### Intentional exclusions

Payment, cash/M-Pesa split, inventory, tax/price recalculation, quotation create/accept, fulfilment lifecycle (IP-02), inspection (IP-03), amendments (IP-04), sales workspace chrome (IP-05), certification (IP-06), BP-007, BP-008.

---

## Manual business-user reproduction (BA)

Synthetic data — adjust names if your tenant uses different records.

**Business:** Journey Alpha Services KE  
**Customer:** Test Customer Alpha  
**Offering:** Journey Alpha Advisory Service  

1. Sign in and select **Journey Alpha Services KE**.
2. Confirm the customer exists under **Customers** (or Parties → CRM). Note the customer name.
3. Confirm the offering exists under **Offerings**, with a sellable price in the KES catalogue so commercial resolution can produce a total.
4. Open **Price a sale** (`/commercial/resolve`):
   - Search and select Test Customer Alpha
   - Search and select Journey Alpha Advisory Service
   - Quantity `1`, currency `KES`
   - Complete Find price → charges → tax → review
   - Note the **Expected total** (this is the amount the sale must keep)
   - Click **Create sale**
5. On **New sale**, confirm customer and product, enter quantity `1`, click **Get expected total**. The expected total must match the commercial result. Payment must still show as not recorded.
6. Click **Save draft sale**. Note the order number (e.g. `SO-000001`).
7. Open the draft. Expected total is visible. Click **Submit for confirmation** (same user).
8. Sign in as a **different** authorised user in the same business. Open the sale. Click **Confirm sale**.
9. Result: status **Confirmed**, expected total unchanged, banner **Payment not yet recorded**.
10. What must **not** happen: no cash/M-Pesa split, no receipt, no stock movement, no new price/tax calculation on the sale screen.

If starting from a quotation instead: accept the quotation in **Quotations**, click **Convert to Sale**, then follow steps 6–9.

---

## IMPLEMENTATION PROMPT ARCHIVE

The following is the Wave 1 implementation prompt that authorised this IP.

```
BP-006 IP-01 — SALES & ORDER CREATION
IMPLEMENTATION PROMPT

You are implementing BP-006 IP-01 only.

BUILD PACK
BP-006 — Sales, Orders & Service Delivery

IP
IP-01 — Sales & Order Creation

STATUS
Approved for implementation — Wave 1.

IMPORTANT
Implement ONLY BP-006 IP-01.
Do not implement IP-02, IP-03, IP-04, IP-05, IP-06.
Do not start BP-007 Payments/Billing.
Do not start BP-008 Inventory.
Do not extend CRM functionality.
Do not redesign BP-005.

LOCKED BP-006 BOUNDARY
BP-006 converts an existing commercial transaction into a controlled sale/order
and owns the operational order record.

Platform flow:
BP-002 Customer + BP-003 Offering + BP-004 Quotation (optional)
  → BP-005 CommercialTransactionContract
  → BP-006 IP-01 Sale / Order
  → IP-02 / IP-03 Fulfilment / Delivery / Inspection / Service
  → BP-007 Payment / Billing and BP-008 Inventory

BP-004 remains owner of CRM, pipeline, opportunities, quotation create/lifecycle/acceptance.
BP-006 owns conversion of an accepted quotation, direct sale/order creation,
order header/lines/quantities, agreed commercial values, confirmation,
transaction identity, and operational lifecycle from Draft.

CRITICAL COMMERCIAL BOUNDARY
BP-005 is authoritative. BP-006 consumes CommercialTransactionContract.
Do not query pricing_item, calculate tax/commission/discounts/payable,
create another snapshot, override the contract, invent a price, or bypass IP-10.
Expected amount remains EXPECTED. Actual payment is BP-007.
Do not record cash/M-Pesa splits on the order.

OBJECTIVE
Create a Draft or Confirmed sale from (A) an accepted quotation or
(B) existing customer + offering + valid BP-005 contract.

QUOTE-TO-ORDER
Conversion after acceptance is BP-006. Unaccepted quotations fail closed.
Maintain source quotation reference. Do not duplicate quotation master.

DIRECT SALE
Customer from BP-002/CRM, offering from BP-003, quantity, valid contract.
No free-text customer/offering create. Cross-business reject.

ORDER HEADER / LINES
businessId, unique order number in business, customer, optional quotation,
commercial contract/snapshot, currency, order date, status, expected amount,
audit fields. Lines keep agreed commercial values from BP-005. Quantity is
operational. Do not recalculate tax/discount/commission.

COMMERCIAL INTEGRITY
Validate contract exists, same business, valid, integrity, not tampered,
currency match, customer/offering tenancy, required lines, quantities,
expected amount from BP-005, no new price calculation. Fail closed with
structured errors.

LIFECYCLE
IP-01: DRAFT → CONFIRMED (and SUBMITTED_FOR_CONFIRMATION when SoD).
IP-02 owns later fulfilment states. Invalid transitions fail closed.

MAKER-CHECKER
ENG-005 mandatory. Maker cannot approve own confirmation.

MATERIAL IMMUTABILITY
Confirmed commercial values cannot be silently edited. Amendments are IP-04.

TENANCY / AUDIT / DOWNSTREAM
Every operation scoped by authenticated businessId.
Audit: created, draft updated, submitted, confirmed, rejected.
Expose payment-ready and fulfilment-ready contracts without executing them.

UX
Business language. Progress, previous/next, field errors, loading, success,
empty states, search, next action. Show expected amount. Payment not recorded.
Responsive. Do not invent a new offline sync engine.

DO NOT IMPLEMENT
Payment, inventory, pricing/tax engines, CRM quotation create/accept,
bookings, IP-02–IP-06, BP-007, BP-008.

STOP AFTER IP-01. Do not commit unless instructed.
```


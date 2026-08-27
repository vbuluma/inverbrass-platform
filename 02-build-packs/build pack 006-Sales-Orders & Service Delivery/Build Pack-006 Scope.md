# Build Pack 006 – Sales, Orders & Service Delivery

| Attribute | Description |
|-----------|-------------|
| Build Pack | BP-006 |
| Name | Sales, Orders & Service Delivery |
| Status | Wave 1–4 IP-01–IP-06 implemented (2026-08-24); pack certified for BP-007 gate; bookings remain out of scope |
| Architecture baseline | AV-1.5 / AV-1.7 Build Pack ID realignment |
| Predecessor | BP-005 Pricing, Tax & Commercial Rules |
| Next | BP-007 Payments, Billing & Receipting |
| Related | BP-008 Inventory & Resource Management |
| Primary engines | ENG-005 Workflow, ENG-013 Audit, ENG-003l Checklist & Completion, ENG-009 Notification, ENG-015 Document, ENG-016 Search |

---

## Objective

Convert a **validated BP-005 commercial transaction** into a **controlled sale/order**, then manage **fulfilment or service delivery** through completion — including **physical goods inspection** — while producing clean handoff contracts for Payments (BP-007) and Inventory (BP-008).

BP-006 delivers an **operational sales/order capability**. It does **not** recalculate prices, taxes or discounts; it does **not** take payment; it does **not** own inventory; it does **not** own CRM quotations; and it does **not** own general booking/appointment/resource scheduling.

---

## Purpose Statement

Given this business, existing customer, existing offering(s), and a validated BP-005 commercial contract:

1. Create a sale/order (directly, or by converting an accepted BP-004 quotation).
2. Preserve the commercial snapshot, expected amount and provenance without recalculation.
3. Control the order through draft, confirmation, fulfilment/service delivery, inspection (physical goods), completion or cancellation.
4. Tell BP-007 what is billable/payable and tell BP-008 what physical quantity needs stock processing.

---

## Locked architecture

```
BP-002 Customer
       +
BP-003 Offering
       +
BP-004 Quotation (optional)
       ↓
BP-005 Commercial Contract
       ↓
BP-006 IP-01
Sales / Order
       ↓
BP-006 IP-02
Order lifecycle / fulfilment status
       ↓
BP-006 IP-03
Delivery / Inspection / Service Completion
       ↓
       ├──────────────→ BP-007 Payment / Billing
       │
       └──────────────→ BP-008 Inventory
```

### Locked ownership

| Capability | Owner |
|------------|-------|
| Create quotation | BP-004 |
| Accept quotation (CRM lifecycle) | BP-004 |
| Convert/accept quotation → sales order | **BP-006 IP-01** |
| Create direct sale | **BP-006 IP-01** |
| Sales order | BP-006 |
| Physical fulfilment status | **BP-006 IP-02** → BP-008 (via IP-05) |
| Physical delivery, inspection, accept/reject | **BP-006 IP-03** |
| Service delivery of an already-sold service | **BP-006 IP-03** |
| Return / replace / correct after rejection | **BP-006 IP-04** |
| Appointment / resource scheduling | Later capability (not BP-006) |
| Payment execution / receipts / refunds | BP-007 |
| Inventory stock / reservation / valuation | BP-008 |
| Commercial calculation | BP-005 |

### Locked IP model

Do **not** split IP-01 further. Customer, lines, quantities, commercial-contract consumption, quote conversion, validation, confirmation and creation audit are one transaction-creation capability.

| IP | Name | Verdict |
|----|------|---------|
| IP-01 | Sales & Order Creation | Locked |
| IP-02 | Order Lifecycle & Fulfilment | Locked |
| IP-03 | Delivery, Inspection & Service Completion | Locked |
| IP-04 | Amendments, Cancellation & Returns | Locked |
| IP-05 | Downstream Handoff & Sales Workspace | Locked |
| IP-06 | Sales Certification | Locked |

IP-05 is **not** payment or inventory implementation. It produces the contracts those packs consume and the operational workspace users work in.

---

## Scope

### Primary inputs

- Customer / party context from **BP-002**
- Offering / product / service from **BP-003**
- Optional accepted quotation from **BP-004 IP-10**
- `CommercialTransactionContract` from **BP-005 IP-10** (snapshot, expected amount, provenance, integrity)

### Primary outputs

- Sales / order header and lines with preserved commercial values
- Order lifecycle state and audit trail
- Fulfilment progress (ordered / delivered / accepted / rejected / outstanding)
- Delivery inspection outcomes and service completion evidence
- Payment-ready transaction contract for **BP-007**
- Fulfilment-ready contract for **BP-008**
- Cancellation / return **instructions** for BP-007 (financial) and BP-008 (stock), not the execution of those packs

### Design principles

| Principle | Description |
|-----------|-------------|
| **Consume, do not recalculate** | BP-006 never queries `pricing_item` to invent a new price; never recalculates tax, discount or commission; never creates a second commercial snapshot |
| **Expected ≠ actual** | Amount due comes from the BP-005 contract. Actual collected amount comes from BP-007. Creating an order is not payment success |
| **One owner** | Quotations stay in BP-004. Conversion into an order is BP-006. Stock movement stays in BP-008. Payment stays in BP-007 |
| **Fail closed** | Invalid, expired or tampered commercial contracts cannot be confirmed. Cross-tenant access fails. Failed fulfilment cannot silently become completed |
| **Inspection before completion (physical)** | Where inspection is required, physical goods must be inspected and accepted (full or partial) with comments before the line/order can complete |
| **Maker / checker** | Material confirmation, inspection acceptance, cancellation, returns and completion use ENG-005 maker-checker where configured. Maker cannot approve own action |
| **Not a second CRM** | BP-006 manages delivery of an already-sold product/service. It does not own pipeline, quoting, or general appointments |

---

## Implementation Package Structure

| IP | Module |
|----|--------|
| IP-01 | Sales & Order Creation |
| IP-02 | Order Lifecycle & Fulfilment |
| IP-03 | Delivery, Inspection & Service Completion |
| IP-04 | Amendments, Cancellation & Returns |
| IP-05 | Downstream Handoff & Sales Workspace |
| IP-06 | Sales Certification |

---

## IP Summaries

| IP | Purpose | Depends On |
|----|---------|------------|
| IP-01 | Direct sale and quote-to-order conversion; lines; consume BP-005 contract; draft; confirmation; validation; creation audit | BP-001, BP-002, BP-003, BP-004 IP-10 (read/handoff), BP-005 IP-10, ENG-005, ENG-013 |
| IP-02 | Draft → confirmed → in progress → partially fulfilled → completed / cancelled; fulfilment status rolled up from IP-03 | IP-01, ENG-005, ENG-013 |
| IP-03 | Physical delivery, inspection, accept/reject (full/partial), reasons/evidence/quality findings; service delivery & completion | IP-01, IP-02, ENG-005, ENG-013, ENG-015 |
| IP-04 | After rejection: amend, cancel, return, replace, correct; financial instruction to BP-007 | IP-01, IP-02, IP-03, ENG-005, ENG-013 |
| IP-05 | Payment-ready contract, fulfilment handoff to BP-008, Sales workspace UX, operational status | IP-01–IP-04, BP-005 IP-10 |
| IP-06 | End-to-end certification of BP-001 → BP-006; not feature development | IP-01–IP-05 |

---

## In Scope (SC)

| Scope ID | Capability | Description | Primary IP |
|----------|------------|-------------|------------|
| SC-001 | Direct sale / order creation | Create a sale for an existing customer using existing offerings | IP-01 |
| SC-002 | Quote-to-order conversion | Convert an eligible BP-004 quotation into a BP-006 sales order | IP-01 |
| SC-003 | Commercial contract consumption | Attach and validate BP-005 contract; preserve snapshot, expected amount, provenance | IP-01 |
| SC-004 | Order lines & quantities | Product/service lines, quantities, agreed commercial values | IP-01 |
| SC-005 | Order lifecycle | Draft, confirmed, in progress, partially fulfilled, completed, cancelled | IP-02 |
| SC-006 | Order fulfilment status | Line-level ordered / accepted / rejected / outstanding rolled up from IP-03 | IP-02 |
| SC-007 | Delivery, inspection & acceptance | Physical delivery; inspect; accept/reject full or partial; reasons, findings, evidence | IP-03 |
| SC-008 | Maker-checker / SoD | ENG-005 at confirmation, inspection, cancellation, returns, gated completion | IP-01, IP-02, IP-03, IP-04 |
| SC-009 | Service delivery | Deliver/complete already-sold services with evidence | IP-03 |
| SC-010 | Amendment | Material post-confirmation change creates a version; no silent commercial mutation | IP-04 |
| SC-011 | Cancellation & returns initiation | Controlled cancel/return; financial consequence to BP-007 | IP-04 |
| SC-012 | Payment-ready contract | Billable transaction reference and amount due for BP-007 | IP-05 |
| SC-013 | Inventory fulfilment handoff | Fulfilment request for BP-008 without owning stock | IP-05 |
| SC-014 | Sales workspace UX | Sell / Price a Sale / Convert Quote operational experience | IP-05 |
| SC-015 | Audit & reporting | Lifecycle events, delivery/inspection, SoD, operational sales/order views | IP-02, IP-03, IP-05 |
| SC-016 | Certification | Prove BP-001→BP-006 continuity before BP-007 | IP-06 |

---

## Out of Scope

| Out-of-Scope Area | Owner | Boundary |
|-------------------|-------|----------|
| Party / customer master | BP-002 | Link only; do not create a second customer master |
| Product / offering master | BP-003 | Link order lines to existing offerings |
| Quotation create / send / accept / reject / expire / version | BP-004 IP-10 | BP-006 converts an already-accepted (or conversion-eligible) quotation |
| CRM pipeline, leads, opportunities, Customer 360 shell | BP-004 | BP-006 may link back; it does not own CRM |
| Calendar / general appointments / resource booking | BP-004 IP-06 / later capability | BP-006 may hand off; it does not schedule resources |
| Tax / discount / commission / price recalculation | BP-005 | Consume `CommercialTransactionContract` only |
| Payment execution, split tender, receipts | BP-007 | Amount due is BP-006; collected/allocated is BP-007 |
| Refund execution | BP-007 | BP-006 raises a financial instruction only |
| Inventory quantities, reservation, valuation, stock movement | BP-008 | BP-006 states what to fulfil |
| Supplier / procurement orders | BP-009 | Sales orders only |
| Full resource scheduling / work-order dispatch beyond sold-service delivery | Later | FR-038 handoff only |
| Financial reconciliation matching | ENG-008 (later) | BP-007 IP-07 settlement handoff only; RA compares BP-005 expected vs BP-007 actual collected (future) |
| Full offline sync / conflict engine | Platform architecture | Transaction capture only where already supported |

---

## Architecture Boundary

| Build Pack | Responsibility |
|------------|----------------|
| BP-002 | Who the customer is |
| BP-003 | What is offered |
| BP-004 | Relationship, pipeline, **quotation** (create → accept) |
| BP-005 | What the customer should be charged (commercial contract) |
| **BP-006** | **The sale/order, fulfilment, inspection, and service delivery of that commercial agreement** |
| BP-007 | How it was actually paid / billed / refunded |
| BP-008 | How physical stock was actually reserved / moved |

### Worked example (boundary)

**BP-003:** Product X unit price = KES 1,000  
**BP-005:** Principal 1,000 + commission 100 + tax 180 + discount −50 → **payable 1,230** (snapshot + expected amount)  
**BP-006:** Confirmed order for Product X, qty 1, amount due **1,230**, then fulfil / inspect / complete  
**BP-007:** Collect 1,230 as KES 400 cash + KES 830 M-Pesa  
**BP-008:** Move 1 unit of Product X from stock when fulfilment requires it

KES 300 sale paid as KES 100 cash + KES 200 M-Pesa is **BP-007**, not BP-006. BP-006 only states **amount due = 300**.

---

## BP-005 Integration (mandatory)

BP-006 **must not**:

- query `pricing_item` to determine a new price
- recalculate tax, discounts or commissions
- create another commercial snapshot
- create another pricing master
- override a validated commercial result without an explicit IP-04 amendment process

Confirmation requires a valid, integer, unexpired BP-005 contract. Commercial provenance inherited from BP-005 remains traceable on the order.

---

## BP-007 Payment Boundary

| BP-006 Owns | BP-007 Owns |
|-------------|-------------|
| Amount due from commercial contract | Payment execution |
| Sales/order transaction | Cash / M-Pesa / card / bank |
| Payment-ready transaction reference | Split payments |
| Outstanding operational status | Payment allocation |
| Billing trigger / instruction | Receipts |
| Cancellation financial instruction | Refund execution |
| Order / payment relationship (reference) | Settlement |
| Expected amount | Actual amount collected |
| | Variance |

**BRU:** No payment may be considered successful merely because an order was created.

---

## BP-008 Inventory Boundary

```
BP-006 IP-02
Order / Fulfilment status
    ↓
BP-006 IP-03
Delivery → Inspection → Accepted / Rejected / Partial
    ↓
IP-05 Fulfilment-ready contract
    ↓
BP-008 Inventory availability / reservation / stock movement / adjustment
```

BP-006 communicates: offering, quantity ordered, delivered, accepted, rejected, outstanding, order, customer, fulfilment status. It does **not** own stock quantities or valuation.

Inspection is a **sales/delivery control** (did the customer receive acceptable goods?). Stock movement remains BP-008.

---

## Delivery, inspection & acceptance (IP-03)

Physical delivery and service completion are recorded in **IP-03**, not on the IP-02 state machine.

Where a line is a physical product and inspection is required (default **on**):

1. Record what was **delivered** (physically present).
2. Inspect.
3. **Accept in full**, **accept in part**, **reject in part**, or **reject in full**, with **reasons**, optional **condition/quality findings**, and **evidence**.
4. **Missing** is not classified as rejected. **Outstanding (still due)** = missing + rejected until IP-04 closes rejected qty without replacement.
5. The line/order cannot complete while mandatory inspection is outstanding, quantities do not reconcile, required evidence is missing, or outstanding > 0.
6. Failed or rejected delivery does not silently become completed.

### Quantity identity

```
delivered   = accepted + rejected
missing     = ordered − delivered
outstanding = ordered − accepted = missing + rejected
```

Example: 100 ordered; 80 acceptable, 15 defective, 5 missing → delivered 95, accepted 80, rejected 15, missing 5, **outstanding 20**.

**Reject and return + replace:** outstanding stays 20.  
**Reject and return + credit (no replace):** IP-04 closes 15; outstanding becomes 5.

### After rejection (not IP-03)

| Layer | Responsibility |
|-------|----------------|
| IP-03 | Operational outcome (what arrived; what was accepted/rejected) |
| IP-04 | Return, replace, correct, amend, cancel |
| BP-007 | Financial consequence |
| BP-008 | Physical stock |

Maker/checker: the user who records delivery cannot inspect/accept/reject when SoD is required.

---

## Maker-checker stages (ENG-005)

| Stage | Maker | Checker | When |
|-------|-------|---------|------|
| Confirm order (incl. quote conversion) | Submits for confirmation | Approves confirmation | When SoD or value threshold is configured |
| Physical inspection / acceptance | Records delivery | Inspects; accept full / partial / reject with reasons | When inspection is required (IP-03) |
| Service completion | Records delivery | Confirms completion with evidence | When evidence/SoD configured (IP-03) |
| Material amendment after confirmation | Proposes amendment version | Approves version | When SoD required |
| Cancel confirmed / in-progress order | Requests cancellation | Approves cancellation | When configured |
| Initiate return / correction | Initiates | Approves initiation | When configured |
| Complete order after inspection / service | Requests completion | Approves completion | When inspection- or evidence-gated |

Maker cannot approve own action. Failed SoD fails closed.

---

## Core Business Requirements

| ID | Business Requirement | Priority |
|----|----------------------|----------|
| BR-001 | Create a sale/order for an existing customer using existing Party/Customer records. | Critical |
| BR-002 | A sale may contain one or more existing product/offering or service lines. | Critical |
| BR-003 | Convert a validated BP-005 commercial result into a sales transaction without recalculating commercial values. | Critical |
| BR-004 | Preserve the commercial snapshot/contract and its provenance on the resulting transaction. | Critical |
| BR-005 | Support a controlled sales-order lifecycle from draft through completion/cancellation. | Critical |
| BR-006 | Support both physical product sales and service delivery transactions. | Critical |
| BR-007 | Support order quantities and line-level fulfilment status. | High |
| BR-008 | Support partial fulfilment where an order contains multiple lines or quantities. | High |
| BR-009 | Track what has been ordered, fulfilled, outstanding, inspected and cancelled. | High |
| BR-010 | Prevent fulfilment of an order that is not in an eligible state. | Critical |
| BR-011 | Allow service-based orders to be marked delivered/completed with appropriate evidence. | High |
| BR-012 | Maintain a complete audit trail of sales/order lifecycle events. | Critical |
| BR-013 | Prevent cross-business access to sales, orders, fulfilment and inspection records. | Critical |
| BR-014 | Allow a customer-facing or staff-facing sale from the BP-001–005 journey, including quote-to-order. | High |
| BR-015 | Provide BP-007 with a reliable billable/payment-ready transaction contract. | Critical |
| BR-016 | Provide BP-008 with fulfilment/stock-movement information without owning inventory. | Critical |
| BR-017 | Support cancellation and controlled amendment according to transaction state. | High |
| BR-018 | Prevent silent modification of commercially material values after confirmation. | Critical |
| BR-019 | Support transaction-level and line-level notes/instructions where required. | Medium |
| BR-020 | Provide clear operational status and next actions throughout the order lifecycle. | High |
| BR-021 | Convert an eligible BP-004 quotation into a BP-006 sales order without BP-006 owning quotation. | Critical |
| BR-022 | Inspect delivered physical goods; accept in full, in part, or reject (full/partial), with reasons, findings and evidence. | Critical |
| BR-023 | Apply maker-checker (SoD) at confirmation, inspection, cancellation, returns and gated completion. | Critical |

---

## Pack-level Functional Requirements

### Sales & Order Creation

| ID | Functional Requirement | Primary IP |
|----|------------------------|------------|
| FR-001 | Create a sales transaction for an existing business/customer. | IP-01 |
| FR-002 | Select one or more existing offerings/products/services. | IP-01 |
| FR-003 | Specify quantity and relevant line attributes. | IP-01 |
| FR-004 | Associate the transaction with the BP-005 commercial contract. | IP-01 |
| FR-005 | Validate that the commercial contract is valid before creating a confirmed order. | IP-01 |
| FR-006 | Prevent creation of a confirmed order where the commercial contract is invalid, expired or tampered with. | IP-01 |
| FR-007 | Generate a unique sales/order identifier within the business. | IP-01 |
| FR-008 | Store transaction currency and commercial totals from BP-005. | IP-01 |
| FR-009 | Preserve line-level commercial breakdown where supplied by BP-005. | IP-01 |
| FR-010 | Support draft sales transactions before confirmation. | IP-01 |
| FR-046 | Convert an eligible BP-004 quotation into a sales order, linking quotation, opportunity and customer. | IP-01 |
| FR-047 | Prevent conversion of expired, rejected, or ineligible quotations. | IP-01 |
| FR-048 | Do not persist a sales order inside BP-004; conversion is executed by BP-006. | IP-01 |

### Order Lifecycle

| ID | Functional Requirement | Primary IP |
|----|------------------------|------------|
| FR-011 | Support Draft status. | IP-02 |
| FR-012 | Support Confirmed status. | IP-02 |
| FR-013 | Support In Progress / Fulfilment status. | IP-02 |
| FR-014 | Support Partially Fulfilled status. | IP-02 |
| FR-015 | Support Fulfilled/Completed status. | IP-02 |
| FR-016 | Support Cancelled status. | IP-02 |
| FR-017 | Enforce valid lifecycle transitions. | IP-02 |
| FR-018 | Record actor, timestamp and reason for material lifecycle changes. | IP-02 |
| FR-019 | Prevent fulfilment of cancelled orders. | IP-02 |
| FR-020 | Prevent completion where required fulfilment, inspection or service delivery remains outstanding. | IP-02, IP-03 |

### Fulfilment status (IP-02) & delivery / inspection (IP-03)

| ID | Functional Requirement | Primary IP |
|----|------------------------|------------|
| FR-021 | Display outstanding quantity for each order line (`ordered − accepted` = missing + open rejected). | IP-02, IP-03 |
| FR-022 | Display accepted/fulfilled quantity from inspection (do not invent a second figure). | IP-02, IP-03 |
| FR-023 | Support partial fulfilment status. | IP-02 |
| FR-024 | Prevent delivered (accepted + rejected) quantity exceeding ordered quantity. | IP-03 |
| FR-025 | Track fulfilment status independently for each line. | IP-02 |
| FR-026 | Support delivery / fulfilment events and evidence. | IP-03 |
| FR-027 | Allow accepted physical quantities to be marked ready for downstream inventory processing. | IP-03, IP-05 |
| FR-028 | Allow services to be marked as delivered/completed. | IP-03 |
| FR-029 | Record delivery/completion date and responsible user. | IP-03 |
| FR-030 | Allow delivery/service notes, rejection reasons, quality findings and supporting evidence where configured. | IP-03 |
| FR-031 | Produce a fulfilment-ready contract for BP-008 where stock/resource processing is required. | IP-05 |
| FR-049 | Require inspection of delivered physical goods where configured. | IP-03 |
| FR-050 | Support inspect outcomes: accepted in full, accepted in part, rejected in part, rejected in full. | IP-03 |
| FR-051 | Require comments/reasons on partial acceptance and any rejection. | IP-03 |
| FR-052 | Record delivered, accepted, rejected and outstanding quantities, inspector, timestamp. | IP-03 |
| FR-053 | Prevent line/order completion while mandatory inspection is outstanding. | IP-02, IP-03 |
| FR-054 | Enforce maker-checker on inspection acceptance when SoD is required. | IP-03 |
| FR-055 | Record delivered, accepted, rejected and missing separately; outstanding (still due) = missing + open rejected, not missing alone. | IP-03 |
| FR-056 | Record condition/quality findings where configured. | IP-03 |
| FR-057 | Record rejection reason for partial or full rejection. | IP-03 |
| FR-058 | Support full rejection of a delivery. | IP-03 |
| FR-059 | Support partial rejection of a delivery. | IP-03 |
| FR-060 | Confirm accepted quantity and rejected quantity before the outcome is stored. | IP-03 |

### Service Delivery

| ID | Functional Requirement | Primary IP |
|----|------------------------|------------|
| FR-032 | Identify service lines requiring delivery. | IP-03 |
| FR-033 | Associate service delivery with the originating order line. | IP-03 |
| FR-034 | Track service delivery status. | IP-03 |
| FR-035 | Record service completion evidence where required. | IP-03 |
| FR-036 | Support service completion without requiring inventory movement. | IP-03 |
| FR-037 | Prevent an order from being fully completed while mandatory service delivery remains outstanding. | IP-03 |
| FR-038 | Provide a clear handoff to future booking/resource capabilities where applicable. | IP-03, IP-05 |

### Cancellation, Amendment & Returns

| ID | Functional Requirement | Primary IP |
|----|------------------------|------------|
| FR-039 | Allow cancellation of eligible draft/confirmed transactions. | IP-04 |
| FR-040 | Require a cancellation reason where configured. | IP-04 |
| FR-041 | Prevent cancellation of completed transactions through an ordinary edit action. | IP-04 |
| FR-042 | Support controlled amendment before confirmation. | IP-04 |
| FR-043 | Material changes after confirmation must create an amendment/version rather than silently changing the original. | IP-04 |
| FR-044 | Support initiation of a return/correction process where applicable. | IP-04 |
| FR-045 | Pass any financial consequence to BP-007 rather than executing refunds in BP-006. | IP-04, IP-05 |

---

## Business Rules

| ID | Business Rule |
|----|---------------|
| BRU-001 | Every sale/order must be scoped by `businessId`. |
| BRU-002 | Customer must belong to the same business as the transaction. |
| BRU-003 | Offering must belong to the same business as the transaction. |
| BRU-004 | A confirmed sale must reference a valid BP-005 commercial contract. |
| BRU-005 | The commercial contract must pass integrity validation before confirmation. |
| BRU-006 | Transaction currency must match the validated commercial contract unless an explicitly supported FX process exists. |
| BRU-007 | A confirmed transaction's commercial values cannot be silently changed. |
| BRU-008 | Any material commercial amendment requires a controlled amendment/version (and a new valid commercial contract where amounts change). |
| BRU-009 | An order cannot be fulfilled beyond its ordered quantity. |
| BRU-010 | An order cannot be marked complete while mandatory fulfilment, inspection or service delivery remains outstanding. |
| BRU-011 | Cancelled orders cannot be fulfilled. |
| BRU-012 | Completed orders cannot be ordinarily edited. |
| BRU-013 | Partial fulfilment and partial inspection must leave the remaining balance/quantity explicitly visible. |
| BRU-014 | Every material lifecycle transition must be auditable. |
| BRU-015 | No payment may be considered successful merely because an order was created. |
| BRU-016 | Actual collected amount must come from BP-007, not BP-006. |
| BRU-017 | BP-006 must not invent or recalculate commercial amounts. |
| BRU-018 | Cross-tenant access must fail closed. |
| BRU-019 | Failed commercial validation prevents confirmation. |
| BRU-020 | Failed fulfilment or inspection validation prevents fulfilment/completion. |
| BRU-021 | Cancellation after payment requires BP-007 financial handling where applicable. |
| BRU-022 | Sales/order identifiers must remain unique within the business. |
| BRU-023 | All transaction timestamps must use the platform's standard time handling. |
| BRU-024 | Evidence required for a service/delivery/inspection completion must be supplied before completion. |
| BRU-025 | The system must never silently convert a failed fulfilment or failed inspection into completed status. |
| BRU-026 | Quote-to-order conversion is owned by BP-006; BP-004 must not persist the sales order. |
| BRU-027 | Only conversion-eligible quotations (accepted, unexpired, same business/customer) may convert. |
| BRU-028 | Physical inspection comments/reasons are mandatory on partial accept and any reject. |
| BRU-029 | When SoD is required, maker cannot approve own confirmation, inspection, cancellation, return or gated completion. |
| BRU-030 | Inspection does not move stock; BP-008 remains the inventory owner. |
| BRU-031 | Missing ≠ rejected. Outstanding (still due) = ordered − accepted = missing + open rejected. |
| BRU-032 | IP-03 records accept/reject; IP-04 initiates return/replace/correct after rejection. |
| BRU-033 | Reject-and-return with replace keeps rejected qty in outstanding. Credit/cancel without replace removes it from outstanding. |

---

## User Experience Requirements

These are platform UX requirements, not optional polish. Users must not see BP/IP terminology.

| ID | Requirement | Primary IP |
|----|-------------|------------|
| UX-001 | User must not need to understand BP/IP terminology. | IP-05 |
| UX-002 | Sale creation accessible through a clear **Sell / Price a Sale** journey. | IP-05 |
| UX-003 | Customer search must be available before creating the sale. | IP-01, IP-05 |
| UX-004 | Product/service search must be available. | IP-01, IP-05 |
| UX-005 | Commercial result must be clearly presented before confirmation. | IP-01, IP-05 |
| UX-006 | User must see principal, charges, tax, discounts and expected amount where applicable. | IP-01, IP-05 |
| UX-007 | User must clearly understand whether an order is Draft, Confirmed, In Progress, Partially Fulfilled or Complete. | IP-02, IP-05 |
| UX-008 | Errors must appear close to the affected field/step. | IP-05 |
| UX-009 | Loading/progress states must be visible. | IP-05 |
| UX-010 | Empty states must explain the next action. | IP-05 |
| UX-011 | Previous/Next actions should be available in multi-step journeys. | IP-05 |
| UX-012 | Contextual links back to customer, offering, quotation and order. | IP-05 |
| UX-013 | After confirmation, the next operational action must be obvious. | IP-05 |
| UX-014 | Fulfilment screens must show ordered vs delivered vs accepted vs rejected vs outstanding. | IP-03, IP-05 |
| UX-015 | Service delivery must show what remains to be delivered. | IP-03, IP-05 |
| UX-016 | Users must receive confirmation/success feedback after material actions. | IP-05 |
| UX-017 | Prevent duplicate submission where technically possible. | IP-01, IP-05 |
| UX-018 | Mobile workflows should respect the platform ≤4-tap principle for common transactions where practical. | IP-05 |
| UX-019 | Quote conversion must be available from an accepted quotation without starting a disconnected sale. | IP-01, IP-05 |
| UX-020 | Inspection screens must show delivered vs accepted vs rejected vs outstanding, with reasons. | IP-03, IP-05 |
| UX-021 | Maker and checker actions must be distinct; the UI must not allow self-approval when SoD applies. | IP-05 |

---

## Audit & Governance

The system shall capture at least:

- sale/order created
- quotation converted (when applicable)
- commercial contract consumed
- order submitted for confirmation / confirmed / confirmation rejected
- order amended (version created)
- order cancelled (reason)
- fulfilment started / partially completed / completed
- goods presented for inspection
- inspection accepted in full / accepted in part / rejected in part / rejected in full (reasons, quality findings, accepted/rejected/outstanding quantities)
- maker and checker identities
- service delivered
- evidence attached
- return / replace / correct initiated (IP-04)
- completion / cancellation reason
- user/actor and timestamp

Commercial provenance inherited from BP-005 must remain traceable.

---

## Reporting

| Report / View | Requirement | Owner |
|---------------|-------------|-------|
| Sales | Sales by date/customer/offering/status | IP-05 |
| Orders | Orders by lifecycle status | IP-05 |
| Outstanding fulfilment | Orders/lines not fully fulfilled | IP-05 |
| Partial fulfilment | Partially fulfilled orders | IP-05 |
| Inspection | Pending inspection; partial/rejected inspection | IP-05 |
| Service delivery | Services pending/completed | IP-05 |
| Cancelled sales | Cancelled transactions and reasons | IP-05 |
| Customer sales history | Sales linked to customer | IP-05 |
| Product sales history | Sales linked to offering | IP-05 |
| Quote conversion | Quotations converted vs expired/rejected | IP-05 |
| Expected sales value | From validated commercial contract | IP-05 |
| Payment status | Display only when BP-007 exists; not owned | IP-05 / BP-007 |

---

## Dependencies

**Consumes**

- BP-001 – Business Setup & Onboarding (`businessId` isolation)
- BP-002 – Party & Relationship Management (customer)
- BP-003 – Product & Service Catalogue (offerings)
- BP-004 IP-10 – Quotations (eligible quotation records; conversion executed here)
- BP-005 IP-06 / IP-07 / IP-09 / IP-10 – snapshot, expected amount, validation, `CommercialTransactionContract`

**Platform engines**

| Engine | Role in BP-006 |
|--------|----------------|
| ENG-005 Workflow | Maker-checker / SoD at confirmation, inspection, cancellation, returns, gated completion |
| ENG-013 Audit | Material lifecycle, inspection, SoD and amendment audit |
| ENG-003l Checklist & Completion | Completion gates (fulfilment, inspection, service evidence) |
| ENG-009 Notification | Confirmation, inspection pending, completion, cancellation |
| ENG-015 Document | Delivery/inspection/service evidence attachments |
| ENG-016 Search | Customer, offering, quotation, order search |
| ENG-003k Industry Experience | Industry-native labels (Sell / Order / Delivery) |

---

## Recommended Delivery Sequence

| Wave | IPs | Outcome |
|------|-----|---------|
| **1** — Core sale | IP-01 | Direct sale + quote-to-order; consume BP-005; draft; confirmation; SoD on confirm |
| **2** — Fulfilment & delivery | IP-02, IP-03 | Lifecycle status; physical delivery/inspection/accept-reject; service completion |
| **3** — Exceptions & workspace | IP-04, IP-05 | Amendment/cancel/returns; payment & inventory handoff; Sales workspace |
| **4** — Certification | IP-06 | BP-001→BP-006 continuity; no BP-007 feature work |

Implementation of a wave is not complete until the traceability matrix runtime tests for that wave pass.

---

## Non-Functional Requirements (Pack-level)

| NFR ID | Requirement |
|--------|-------------|
| NFR-001 | Tenant isolation on every sales/order/fulfilment/inspection record (`businessId`). |
| NFR-002 | Authorization enforced; cross-tenant access fails closed. |
| NFR-003 | Commercial amounts stored with platform decimal/money handling; never floating-point recalculation. |
| NFR-004 | Confirmed commercial values are immutable except via IP-04 versioning. |
| NFR-005 | Lifecycle transitions are explicit and fail closed. |
| NFR-006 | Maker-checker SoD is enforceable where configured; self-approval is impossible. |
| NFR-007 | Material actions are auditable with actor, timestamp, reason and before/after where applicable. |
| NFR-008 | Duplicate submit of create/confirm/fulfil/inspect is prevented where technically possible. |
| NFR-009 | Payment-ready and fulfilment-ready contracts remain stable for BP-007 / BP-008. |
| NFR-010 | Design supports future booking/resource handoff without BP-006 becoming a scheduler. |
| NFR-011 | Offline capture only where platform architecture already supports it; no sync engine in this pack. |
| NFR-012 | UX must not expose engine/Build Pack IDs to business users. |

---

## Bottom Line

BP-006 turns a validated commercial agreement into an operational sale/order and gets that sale delivered — including inspecting physical goods — while preparing a clean transaction for Payments and Inventory to consume. It preserves the architecture established in BP-001–005 rather than becoming a second pricing, tax, payment, inventory, quotation or booking engine.

---

## Document Control

| Item | Value |
|------|-------|
| Source | BP-006 requirements brief; locked 6-IP model (2026-08-24) |
| Related | `01-enterprise-architecture/02-Platform-Module-Catalog.md`, `11-Development-Roadmap.md`, BP-004 IP-10, BP-005 IP-10 |
| Approval | YES — 6 IPs; quote-to-order in IP-01; bookings out of scope; IP-05 renamed; IP-03 owns delivery/inspection/accept-reject; IP-04 owns post-rejection actions |
| Traceability | `BP-006-Requirements-Traceability-Matrix.md` |
| IP index | [IP-01](./IP-01%20Sales%20%26%20Order%20Creation.md) · [IP-02](./IP-02%20Order%20Lifecycle%20%26%20Fulfilment.md) · [IP-03](./IP-03%20Delivery%2C%20Inspection%20%26%20Service%20Completion.md) · [IP-04](./IP-04%20Amendments%2C%20Cancellation%20%26%20Returns.md) · [IP-05](./IP-05%20Downstream%20Handoff%20%26%20Sales%20Workspace.md) · [IP-06](./IP-06%20Sales%20Certification.md) |

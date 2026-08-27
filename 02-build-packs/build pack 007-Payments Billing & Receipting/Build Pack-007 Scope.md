# Build Pack 007 – Payments, Billing & Receipting

| Attribute | Description |
|-----------|-------------|
| Build Pack | **BP-007** |
| Name | Payments, Billing & Receipting |
| Status | Implemented — IP-01–IP-08 complete (2026-08-27) |
| Architecture baseline | AV-1.8 (BP-007 ownership lock) / AV-1.7 Build Pack IDs |
| Predecessor | BP-006 Sales, Orders & Service Delivery (certified) |
| Next | BP-008 Inventory & Resource Management |
| Related | BP-005 commercial contract; BP-010 Finance (later); ENG-008 Reconciliation (later) |
| Primary engines | ENG-006 Payment, ENG-007 Receipting, ENG-003e Integration, ENG-003b Localization & Regulatory, ENG-005 Workflow, ENG-013 Audit, ENG-009 Notification, ENG-015 Document |

---

## Core principle

BP-007 shall provide the business **payment, billing and receipting** capability while integrating with **external payment providers**. The platform shall **not** operate or replicate payment networks or provider infrastructure.

**Payment Method, Payment Rail / Network, Payment Provider and Payment Channel shall be represented independently** to support configurable provider integrations, provider-specific capabilities and provider-enforced limits.

The platform does **not** become a payment processor, payment switch, payment network, acquiring bank, mobile-money operator or payment service provider.

---

## Objective

Enable a business to **collect, record, allocate, evidence and manage customer payments** arising from confirmed BP-006 sales (and formal invoices created from those obligations).

```
BP-005  expected payable
   ↓
BP-006  confirmed order  →  payment-ready contract
   ↓
BP-007  payment obligation / billing / receipting
   ↓
ENG-006 + ENG-003e  provider adapter
   ↓
External payment provider
   ↓
Payment network / rail
```

BP-007 shall support:

- **integrated electronic payments** through external providers (via ENG-006 adapters); and
- **manual / offline payment capture** where appropriate (cash, staff-recorded bank transfer).

---

## Locked ID and ownership decisions (AV-1.8)

These replace the review blockers. **Do not reintroduce the retired numbering.**

| Topic | Locked decision |
|-------|-----------------|
| Pack ID | **BP-007** (canonical). Not “BP-07”. Not the pre-AV-1.7 “BP-006 Payments”. |
| BP-013 | **Product Management & Innovation.** Never Receivables & Collections. |
| Overdue collections (SC-032) | **Out of BP-007.** Future capability — **no Build Pack ID assigned** in AV-1.8. Do not use BP-013. Do not invent BP-014 here. Likely after BP-010 Finance exists. |
| Reconciliation matching | **ENG-008**, not BP-007. IP-07 produces a **handoff** only. |
| Provider connectivity | **ENG-006** Payment Engine adapters through **ENG-003e**. BP-007 does not call Daraja, card schemes or bank APIs directly. |
| Checkout wording | **BP-006** confirms the sale and amount due. **BP-007** is tender selection and capture. |
| Credit | **Not a payment method.** Credit sales are billing (IP-04). BP-001 `creditSalesEnabled` is a tenant policy flag. |
| v1 transaction source | **Customer AR from BP-006 payment-ready contracts** (plus invoices issued from those obligations). No supplier / outgoing / AP payments. |
| Invoice | **Not required on every POS cash sale.** Obligation + receipt is enough. Invoice when credit, terms or formal billing is required. |
| Provider rows | **One `payment_provider` row per rail** (matches current unique `code` + `paymentNetworkId`). Same bank on Visa and RTGS is two rows. Party-level provider identity is later (BP-002). |
| BP-001 method flags | **Coarse tenant enablement** until IP-01 catalogues are system of record. |

---

## Locked architecture

```
BP-006 IP-05
Payment-ready contract  (amount due, order, customer, currency, snapshot)
Financial instruction   (sale / cancel / return)
        ↓
BP-007 IP-01
Obligation + catalogues + adapter contract
        ↓
BP-007 IP-02
Initiation via ENG-006 / ENG-003e
        ↓
BP-007 IP-03
Partial / split / allocation
        ↓
        ├──────────────→ IP-04 Billing / credit (when required)
        │
        └──────────────→ IP-05 Receipt (on successful payment)
        ↓
BP-007 IP-06
Refunds / reversals (from BP-006 financial instruction or payment correction)
        ↓
BP-007 IP-07
Settlement status + ENG-008 handoff
        ↓
ENG-008 Reconciliation (later — not this pack)

IP-08 Exception & controls — cross-cutting on IP-02–IP-07
```

### Locked ownership

| Capability | Owner |
|------------|-------|
| Expected payable / commercial composition | BP-005 |
| Confirmed sale / order / amount due | BP-006 |
| Payment-ready contract; financial instruction | BP-006 IP-05 / IP-04 |
| Payment obligation, catalogues, initiation, status | **BP-007** |
| Provider API / webhook / rail | **ENG-006 via ENG-003e** (external provider owns the rail) |
| Invoice / credit sale receivable | **BP-007 IP-04** |
| Receipt as payment evidence | **BP-007 IP-05** consuming **ENG-007** + ENG-003b numbering / fiscal policy |
| Refund execution | **BP-007 IP-06** |
| Settlement matching / cash balancing | **ENG-008** (later) |
| Overdue collections, aging campaigns, dunning | **Future (SC-032)** — not BP-007, not BP-013 |
| General ledger / journals | BP-010 |
| Inventory | BP-008 |
| Supplier / outgoing payments | BP-009 / later — not v1 |

---

## Four-dimension payment model (locked)

These dimensions **must not** be collapsed into a single payment-method field.

| Dimension | Meaning | Examples |
|-----------|---------|----------|
| **Payment Method** | How the customer pays | Cash, Mobile Money, Card, Bank |
| **Payment Rail / Network** | Network that carries the payment | M-Pesa, Airtel Money, VISA, RTGS |
| **Payment Provider** | External institution on that rail | Safaricom, Airtel Kenya, Equity Bank (RTGS row), KCB |
| **Payment Channel** | How the customer initiates | STK Push, PayBill, Buy Goods, App, POS, Branch, Internet Banking |

Example A:

```
Method: Mobile Money
  → Rail: M-Pesa
    → Provider: Safaricom
      → Channel: STK Push
```

Example B:

```
Method: Bank
  → Rail: RTGS
    → Provider: Equity Bank (RTGS participant row)
      → Channel: Internet Banking
```

Customer-facing checkout may show **M-Pesa / Card / Bank Transfer**. The customer does not choose rail, provider or channel. The platform resolves an eligible combination from IP-01 configuration.

Existing schema (not yet migrated) already matches this model:

- `03-platform/src/db/schema/payment-method.ts`
- `03-platform/src/db/schema/payment-network.ts` (comment: Network / Rails)
- `03-platform/src/db/schema/payment-provider.ts`
- `03-platform/src/db/schema/payment-channel.ts`
- seeds: `payment-providers.ts`, `payment-channels.ts`

IP-01 must complete catalogues (method + network seeds currently missing) and journal the tables. Do not replace this model with BP-001 booleans.

---

## Scope

### Primary inputs

- **BP-006 IP-05 payment-ready contract** (do not scrape order tables)
- **BP-006 IP-04 financial instruction** (cancel / return / credit)
- Customer from **BP-002** via the contract
- Currency and expected amount from **BP-005** via the contract
- Tenant payment enablement from **BP-001** (coarse flags until catalogues exist)
- Provider limits / capabilities from ENG-006 adapter metadata where available

### Primary outputs

- Payment obligation (amount due, paid, outstanding)
- Payment transactions (method, rail, provider, channel, provider reference, status, settlement status)
- Allocations (including unallocated / overpayment handling)
- Invoices where formal billing applies
- Receipts as evidence of successful payment
- Refund / reversal transactions linked to originals (never overwrite)
- Settlement status + reconciliation handoff payload

### Design principles

| Principle | Description |
|-----------|-------------|
| **Consume, do not recalculate** | Amount due is the BP-005 expected payable on the BP-006 contract |
| **Expected ≠ actual** | Commercial expected stays on the contract. Actual collected is BP-007 |
| **Payment ≠ settlement** | Provider SUCCESSFUL ≠ funds SETTLED |
| **Engine first** | No direct Daraja / card / bank calls from pack modules |
| **Provider is authoritative** | Rejection is never treated as success. Limits are not invented by BP-007 |
| **Four dimensions** | Method / rail / provider / channel stay independent |
| **Idempotency** | Safe retry; never blindly retry when outcome is unknown |
| **Receipt ≠ payment** | Receipt evidences a successful payment; it is not the payment |
| **One owner** | Collections, GL, inventory, commercial pricing, order lifecycle stay elsewhere |

---

## Implementation Package Structure

| IP | Module | Priority |
|----|--------|----------|
| IP-01 | Payment Obligation & Provider Integration Foundation | Critical |
| IP-02 | Payment Initiation & Processing | Critical |
| IP-03 | Partial, Split Payment & Allocation | Critical |
| IP-04 | Billing, Invoicing & Credit Sales | Critical |
| IP-05 | Receipting & Payment Evidence | High |
| IP-06 | Refunds, Reversals & Adjustments | High |
| IP-07 | Settlement & Reconciliation Handoff | High |
| IP-08 | Payment Exceptions, Operations & Controls | High |

IP-08 is **cross-cutting** (not a later sequential step). POS cash/split may complete IP-03 → IP-05 **without** an invoice. Credit sales require IP-04 before outstanding becomes a formal receivable.

---

## IP Summaries

| IP | Purpose | Depends On |
|----|---------|------------|
| IP-01 | Obligation from payment-ready contract; method/rail/provider/channel catalogues; adapter **interface**; limits metadata; idempotency keys; status foundation. **Does not execute payments.** | BP-001, BP-002, BP-006 IP-05, ENG-006, ENG-003e, ENG-003a |
| IP-02 | Initiate via ENG-006 adapter; callbacks/webhooks/polling; timeout; failure; expiry; safe retry; error normalisation | IP-01, ENG-006, ENG-003e, ENG-003d |
| IP-03 | Partial, split, multiple tenders, allocation, outstanding, overpayment. Limits apply **per transaction**, not only to the order total | IP-01, IP-02 |
| IP-04 | Invoice lifecycle, terms, due date, credit sale receivable. Not every sale. Outstanding receivable for later SC-032 | IP-01, IP-03, ENG-007, ENG-003b |
| IP-05 | Receipt on successful payment; numbering/fiscal **consumed** from ENG-003b / ENG-007; delivery via ENG-015 / ENG-009 | IP-02, IP-03, ENG-007, ENG-003b, ENG-015, ENG-009 |
| IP-06 | Full/partial refund, reversal, adjustment; new transaction referencing original; consume BP-006 financial instruction | IP-02–IP-05, ENG-006, ENG-005, ENG-013 |
| IP-07 | Settlement status, batch, expected vs received settlement; **handoff** to ENG-008. No matching engine | IP-02, ENG-008 (later consumer) |
| IP-08 | Unknown/pending, duplicate, callback mismatch, exception queue, maker-checker, never blind-retry unknown | IP-02–IP-07, ENG-005, ENG-013 |

---

## In Scope (SC)

| Scope ID | Capability | Description | Primary IP |
|----------|------------|-------------|------------|
| SC-001 | Payment obligation | Create obligation from BP-006 payment-ready contract; amount due / paid / outstanding | IP-01 |
| SC-002 | Payment catalogues | Independent method, rail/network, provider, channel | IP-01 |
| SC-003 | Provider adapter contract | Normalised initiation / status / callback / limit metadata via ENG-006 | IP-01, IP-02 |
| SC-004 | Provider limits | Enforce published limits; do not override; guide split or alternate option | IP-01, IP-02, IP-03 |
| SC-005 | Payment initiation | Channel-specific initiation through adapters | IP-02 |
| SC-006 | Payment lifecycle | NOT_STARTED → INITIATED → PENDING → SUCCESSFUL / FAILED / EXPIRED; later REVERSED / REFUNDED | IP-02 |
| SC-007 | Partial payment | Obligation settled by more than one successful transaction | IP-03 |
| SC-008 | Split payment | Multiple methods/rails on one obligation (cash + M-Pesa, etc.) | IP-03 |
| SC-009 | Allocation | Allocate to obligation / invoice; unallocated and overpayment | IP-03 |
| SC-010 | Billing / invoice | Formal invoice when required; DRAFT → ISSUED → PARTIALLY_PAID → PAID; OVERDUE / CANCELLED / CREDITED | IP-04 |
| SC-011 | Credit sales | Unpaid remainder as receivable; not a tender type | IP-04 |
| SC-012 | Receipting | Evidence of successful payment; method, rail, provider, channel, provider reference | IP-05 |
| SC-013 | Refunds & reversals | New transaction linked to original; consume financial instruction | IP-06 |
| SC-014 | Settlement handoff | Settlement status distinct from payment status; payload for ENG-008 | IP-07 |
| SC-015 | Exceptions & controls | Unknown status, duplicates, mismatch, SoD, audit | IP-08 |
| SC-016 | Tenant isolation & audit | All material financial events; ENG-013 | All |

---

## Out of Scope

| Out-of-Scope Area | Owner | Boundary |
|-------------------|-------|----------|
| Commercial pricing / tax / discount recalculation | BP-005 | Consume expected payable only |
| Sales / order lifecycle, fulfilment, inspection | BP-006 | Consume contracts only |
| Inventory movement / valuation | BP-008 | None |
| Payment processor / switch / rail / PSP | External provider | ENG-006 adapter only |
| Direct Daraja / bank / card API from pack code | ENG-006 / ENG-003e | Pack calls engine APIs |
| Reconciliation matching, cash balancing, exception matching | ENG-008 | IP-07 handoff only |
| Overdue collections, aging dunning, collector workflows | Future SC-032 | BP-007 answers paid vs outstanding only |
| Product management / innovation | **BP-013** | Unrelated pack — do not reuse this ID |
| General ledger, journals, cost centres | BP-010 | Settlement/receipt facts may later feed finance |
| Cashbook / till open-close (SC-020) | Later / BP-010 | Record cash payments; do not own till sessions |
| Supplier / outgoing / AP payments | BP-009 / later | v1 is customer AR from sales |
| Wallets, gift voucher, store credit, stablecoins, deposits, instalments | Future IPs | Named future — not silent drops |
| eTIMS device integration | ENG-003b / ENG-007 | IP-05 reserves the hook; not first IPs unless Kenya go-live requires it |
| Revenue Assurance expected-vs-actual commercial compare | Future RA | Distinct from IP-07 settlement expected vs received |

---

## Provider limits (locked)

BP-007 shall enforce applicable limits and constraints **published by** the selected provider, rail or channel via ENG-006 metadata. BP-007 shall **not** independently redefine or override provider limits.

Example: order KES 200,000; selected M-Pesa → Safaricom → STK Push; provider limit KES 150,000 → cannot process full amount as one transaction. The platform shall prevent initiation, guide another option, or allow a **permitted split** (IP-03). Limits apply **per payment transaction**.

Where the provider does not expose a limit in advance, the **provider remains authoritative during execution**. Provider rejection is never successful payment.

---

## Payment obligation model

```
BP-006 confirmed order
Expected total = KES 10,000
        ↓
BP-007 Payment Obligation
Amount due = 10,000
Paid = 0
Outstanding = 10,000
```

BP-007 **must not** recalculate the commercial amount.

---

## Payment transaction model

```
Payment Transaction
 ├── Payment Obligation
 ├── Order / Invoice reference
 ├── Customer
 ├── Amount
 ├── Currency
 ├── Payment Method
 ├── Payment Rail
 ├── Payment Provider
 ├── Payment Channel
 ├── Provider Transaction Reference
 ├── Status
 ├── Initiated At
 ├── Completed At
 └── Settlement Status
```

Provider-specific payloads stay behind the ENG-006 adapter. Internal records are normalised.

Do **not** model payment as `paid = true`.

---

## Lifecycles

### Payment

```
NOT_STARTED
     ↓
INITIATED
     ↓
PENDING
     ↓
SUCCESSFUL

INITIATED → FAILED
INITIATED → EXPIRED
PENDING   → FAILED
SUCCESSFUL → REVERSED
SUCCESSFUL → REFUNDED
```

### Invoice (when used)

```
DRAFT → ISSUED → PARTIALLY_PAID → PAID
Exceptions: OVERDUE, CANCELLED, CREDITED
```

### Settlement (distinct)

```
Payment SUCCESSFUL
        ↓
Settlement PENDING
        ↓
Settlement RECEIVED
        ↓
Settlement CONFIRMED
```

Successful payment does **not** necessarily mean settled funds.

Use **settlement expected vs received** in IP-07. Do not confuse with BP-005 **commercial expected vs actual collected** (future Revenue Assurance).

---

## Customer journey (UX)

Staff / customer checkout after a confirmed sale:

```
Order KES 10,000
Choose how to pay:  M-Pesa  |  Card  |  Bank Transfer
```

If M-Pesa is selected, the platform resolves eligible provider/channel (typically Safaricom STK Push), ENG-006 initiates, customer approves, payment SUCCESSFUL, receipt issued.

Users never see BP/IP names or the four-dimension catalogue unless they are configuring providers.

---

## Core Business Requirements

| ID | Business Requirement | Priority |
|----|----------------------|----------|
| BR-001 | Create a payment obligation from a confirmed BP-006 payment-ready contract without recalculating commercial values. | Critical |
| BR-002 | Represent method, rail, provider and channel independently. | Critical |
| BR-003 | Initiate electronic payments only through ENG-006 / ENG-003e adapters. | Critical |
| BR-004 | Support manual capture for cash and staff-recorded bank transfers. | Critical |
| BR-005 | Enforce published provider limits; never treat provider rejection as success. | Critical |
| BR-006 | Support partial and split payments; outstanding = due − allocated successful amounts. | Critical |
| BR-007 | Allocate payments to obligations and invoices; handle unallocated and overpayment. | Critical |
| BR-008 | Support credit sales as unpaid receivable, not as a tender type. | Critical |
| BR-009 | Issue receipts as evidence of successful payment. | Critical |
| BR-010 | Process refunds/reversals as new transactions linked to the original. | Critical |
| BR-011 | Keep payment status independent from settlement status. | Critical |
| BR-012 | Hand settlement facts to ENG-008 without becoming the reconciliation engine. | High |
| BR-013 | Control unknown, duplicate and mismatched provider outcomes without blind retry. | Critical |
| BR-014 | Enforce tenant isolation and audit of material financial events. | Critical |
| BR-015 | Consume BP-006 financial instructions for cancel/return refunds. | Critical |
| BR-016 | Do not implement inventory, collections campaigns, GL, or commercial recalculation. | Critical |

---

## Pack-level Functional Requirements

| ID | Functional Requirement | Primary IP |
|----|------------------------|------------|
| FR-001 | Create obligation from payment-ready contract (business, order, customer, currency, amount due, snapshot ids). | IP-01 |
| FR-002 | Persist method, network/rail, provider, channel catalogues with unique codes. | IP-01 |
| FR-003 | Expose a provider-adapter interface; pack modules must not import Daraja/bank SDKs. | IP-01 |
| FR-004 | Store provider transaction reference and idempotency key. | IP-01, IP-02 |
| FR-005 | Initiate payment for a selected eligible method/rail/provider/channel combination. | IP-02 |
| FR-006 | Process adapter callbacks / webhooks / polling into the payment lifecycle. | IP-02 |
| FR-007 | Record FAILED, EXPIRED and timeout without marking SUCCESSFUL. | IP-02 |
| FR-008 | Allow a second payment transaction on the same obligation (partial). | IP-03 |
| FR-009 | Allow mixed methods on one obligation (split). | IP-03 |
| FR-010 | Allocate successful amounts; compute outstanding; record overpayment. | IP-03 |
| FR-011 | Apply provider limits per transaction when metadata exists. | IP-01, IP-03 |
| FR-012 | Create/issue invoice when credit or formal billing is required; not mandatory for POS cash. | IP-04 |
| FR-013 | Track invoice PARTIALLY_PAID / PAID / OVERDUE from allocations. | IP-04 |
| FR-014 | Generate receipt on SUCCESSFUL payment with four dimensions + provider reference. | IP-05 |
| FR-015 | Consume ENG-003b receipt numbering / fiscal policy; do not invent a second numbering engine. | IP-05 |
| FR-016 | Request receipt delivery via ENG-015 (PDF) and ENG-009 (email/WhatsApp) where configured. | IP-05 |
| FR-017 | Create refund/reversal transaction referencing original payment. | IP-06 |
| FR-018 | Execute refunds arising from BP-006 cancel/return financial instructions. | IP-06 |
| FR-019 | Record settlement status separately from payment status. | IP-07 |
| FR-020 | Emit reconciliation handoff payload; do not match bank statements in this pack. | IP-07 |
| FR-021 | Queue UNKNOWN/PENDING for investigation; query adapter; never blindly retry unknown. | IP-08 |
| FR-022 | Detect duplicate provider references and callback mismatches. | IP-08 |
| FR-023 | Maker-checker on refunds and manual status resolution when configured (ENG-005). | IP-06, IP-08 |
| FR-024 | Reject cross-business access to obligations, payments, invoices, receipts. | All |

---

## UX (pack)

| ID | Requirement | Primary IP |
|----|-------------|------------|
| UX-001 | After a confirmed sale, next action is “Take payment” / “Record payment”, not a second price calculation. | IP-02 |
| UX-002 | Customer/staff choose simple options (M-Pesa, Card, Bank, Cash). Do not require rail/provider/channel literacy. | IP-02 |
| UX-003 | Show amount due, paid, outstanding. Never show collected as a BP-006 field. | IP-03 |
| UX-004 | If a channel cannot take the full amount, explain why and offer split or another option. | IP-02, IP-03 |
| UX-005 | Pending electronic payment must show waiting/timeout, not success. | IP-02, IP-08 |
| UX-006 | Receipt is available after SUCCESSFUL payment. | IP-05 |
| UX-007 | Credit sale shows outstanding receivable, not a fake “paid” state. | IP-04 |
| UX-008 | Maker and checker actions are distinct; no self-approval when SoD applies. | IP-06, IP-08 |

---

## Audit & Governance

Capture at least:

- obligation created (contract ids, amount due)
- payment initiated / callback received / status transition
- allocation created / adjusted
- invoice issued / cancelled / credited
- receipt issued / reversed linkage
- refund/reversal requested / approved / completed / failed
- settlement status change
- exception opened / resolved
- actor, timestamp, correlation / idempotency keys
- ENG-013 audit for material events

---

## Reporting (pack views)

| View | Requirement | Owner |
|------|-------------|-------|
| Amount due / paid / outstanding | Per order / obligation | IP-03 |
| Payments by method / rail / provider / channel | Operational | IP-02, IP-08 |
| Failed / expired / pending | Exception queues | IP-08 |
| Invoices aging (status only) | OVERDUE flag — no dunning | IP-04 |
| Receipts | By customer / date | IP-05 |
| Refunds | Linked to original | IP-06 |
| Settlement pending vs confirmed | Distinct from payment success | IP-07 |
| Payment status on sales workspace | BP-006 **reads**; BP-007 **owns** | IP-02 / BP-006 IP-05 |

---

## Dependencies

**Consumes**

- BP-001 – tenant isolation; coarse payment method flags
- BP-002 – customer party
- BP-005 IP-10 – expected payable on the commercial contract (read via BP-006)
- BP-006 IP-05 – payment-ready contract
- BP-006 IP-04 – financial instruction (cancel / return)

**Platform engines**

| Engine | Role in BP-007 |
|--------|----------------|
| ENG-006 Payment | Adapter interface, initiation, status, refunds, limit metadata |
| ENG-003e Integration | Connectors, secrets, retries, circuit breakers — no pack-direct HTTP to providers |
| ENG-003d Event Ingestion | Provider webhooks as events into ENG-006 / BP-007 |
| ENG-007 Receipting | Legally compliant receipt/invoice documents |
| ENG-003b Localization & Regulatory | Invoice/receipt numbering rules, fiscal policy (eTIMS reserved) |
| ENG-005 Workflow | Maker-checker on refunds and manual resolution |
| ENG-013 Audit | Material financial events |
| ENG-009 Notification | Receipt delivery, payment reminders (not collections engine) |
| ENG-015 Document | PDF receipt/invoice storage |
| ENG-008 Reconciliation | **Later consumer** of IP-07 handoff — not implemented here |

**Does not implement:** BP-008, BP-009 AP, BP-010 GL, BP-013, SC-032 collections.

---

## Definition of Done (pack)

BP-007 is complete when:

- obligations are created from BP-006 payment-ready contracts;
- method, rail, provider and channel are independent;
- pack code uses ENG-006 adapters (no direct provider SDKs);
- published provider limits are enforced per transaction;
- provider remains authoritative for acceptance;
- payment lifecycle is captured (not a boolean);
- callbacks / polling update status idempotently;
- unknown/duplicate/mismatch cases are controlled (IP-08);
- partial and split payments and allocation work;
- invoices and credit sales work when required (not forced on POS cash);
- receipts evidence successful payment;
- refunds/reversals are new linked transactions;
- settlement status is distinct; ENG-008 handoff exists without matching;
- tenant isolation and audit hold;
- BP-005 amounts are not recalculated;
- BP-008 inventory is not implemented;
- SC-032 collections is not implemented;
- BP-013 is untouched.

---

## Explicit exclusions (must not become)

A payment processor; payment switch; payment network; mobile-money platform; card network; bank; acquiring institution; provider settlement engine; general ledger; accounting engine; reconciliation engine; collections engine.

---

## Future (named, not in v1 IPs)

- Wallets, gift voucher, store credit, stablecoins (Doc 10 / BP-001)
- Deposits and instalment plans (OBJ-006)
- Cashbook / till sessions (SC-020)
- eTIMS fiscal device (ENG-003b) unless go-live forces IP-05 hook
- Outgoing / supplier payments
- Party-level provider identity spanning rails
- SC-032 receivables collections (ID to be assigned in a later AV — **not BP-013**)

---

## Implementation sequence

Implement **one IP at a time**. IP-01 must land catalogues + adapter interface before IP-02. Do not start BP-008 in this pack.

See individual IP documents in this folder.

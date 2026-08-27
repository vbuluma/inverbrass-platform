# BP-007 IP-04 — Billing, Invoicing & Credit Sales

## BRD / Requirements Specification

| Attribute                  | Description                             |
| -------------------------- | --------------------------------------- |
| **Implementation Package** | IP-04                                   |
| **Build Pack**             | BP-007 – Payments, Billing & Receipting |
| **Priority**               | Critical                                |
| **Status**                 | Implemented                             |
| **Depends On**             | IP-01, IP-03, ENG-007, ENG-003b         |
| **Scope Coverage**         | SC-010, SC-011                          |
| **Related Pack FRs**       | FR-012, FR-013, FR-015                  |

---

# 1. Objective

Provide formal billing capability for sales where the customer is not fully settled at the point of sale.

IP-04 shall support:

* invoice creation;
* invoice numbering;
* invoice issuance;
* payment terms;
* due dates;
* credit sales;
* invoice outstanding balances;
* partial payment;
* invoice payment status;
* invoice cancellation;
* applicable credit/adjustment documents;
* document generation through ENG-007.

### Core principle

> **Not every sale requires an invoice.**

A fully paid transaction may complete through:

```text
Sale
 ↓
Payment Obligation
 ↓
Successful Payment
 ↓
Receipt
```

A credit transaction may require:

```text
Sale
 ↓
Payment Obligation
 ↓
Partial/No Payment
 ↓
Invoice
 ↓
Receivable
```

---

# 2. Business Problem

Treating every sale as an invoice creates unnecessary administrative overhead, particularly for POS transactions.

Conversely, treating **Credit** as a payment method creates an incorrect domain model:

```text
Cash
M-Pesa
Card
Credit   ❌
```

Credit is not money received.

Instead:

```text
Amount Due
   │
   ├── Amount Paid
   │
   └── Amount Outstanding
              ↓
         Credit / Receivable
              ↓
            Invoice
```

Therefore:

> **Credit is a billing/collection policy, not a payment method.**

---

# 3. Scope

## 3.1 Included

### A. Invoice Creation

Create an invoice against a valid underlying:

* Payment Obligation;
* confirmed sale/order;
* applicable commercial contract/provenance.

The invoice shall not independently reconstruct the commercial transaction.

---

### B. Invoice Numbering

Invoice numbers shall be obtained through:

**ENG-003b — Document/Numbering Policy**

IP-04 shall not implement its own numbering engine.

The system shall not hard-code:

```text
INV-000001
INV-2026-001
```

or similar numbering logic in BP-007.

---

### C. Invoice Issuance

Support:

```text
DRAFT
   ↓
ISSUED
```

An invoice shall not be considered a formal customer billing document merely because a draft exists.

---

### D. Payment Terms

Support configurable payment terms such as:

* immediate;
* configurable number of days;
* configured due date;
* other approved business terms.

Terms shall be configuration/policy data rather than hard-coded values.

For example:

```text
Payment Terms = 30 days
```

is configuration.

IP-04 shall not contain:

```text
dueDate = invoiceDate + 30
```

as a universal business rule.

---

### E. Credit Sales

Where credit sales are permitted by business policy, IP-04 shall support:

```text
Sale Amount        KES 50,000
Paid               KES 20,000
Outstanding        KES 30,000

Invoice            KES 30,000
```

The unpaid portion becomes the formal receivable represented by the invoice.

---

# 4. Credit Sales Enablement

BP-001's:

```text
creditSalesEnabled
```

shall act as a **coarse business-policy gate**.

It shall not become a payment method.

### If disabled

A transaction requiring unpaid credit balance shall be rejected.

### If enabled

IP-04 may create the applicable invoice/receivable subject to the configured credit policy.

---

# 5. Credit Policy

The implementation should not assume that:

> `creditSalesEnabled = true` means unlimited credit.

The detailed credit policy may eventually include:

* customer eligibility;
* credit limit;
* payment terms;
* approval requirements;
* maximum outstanding balance;
* authorization thresholds.

If those capabilities are not yet available, IP-04 should use only the currently approved policy controls.

**Do not invent a credit-scoring or credit-limit engine in IP-04.**

---

# 6. Invoice Amount

Invoice amount shall derive from the applicable commercial/payment obligation.

IP-04 shall **not independently recalculate**:

* selling price;
* discounts;
* tax;
* commercial totals.

The invoice must preserve the financial basis supplied by the upstream commercial/payment domain.

---

# 7. Invoice Snapshot / Provenance

This is an important addition.

An issued invoice should preserve sufficient provenance to identify:

* originating order/sale;
* payment obligation;
* commercial contract;
* customer;
* applicable lines;
* amount;
* currency;
* tax information supplied by the upstream contract;
* payment terms.

The invoice shall not depend on re-running BP-005 pricing logic later to determine what the customer was originally billed.

---

# 8. Invoice and Payment Relationship

Payment and invoicing remain separate.

```text
Invoice
   │
   └── Outstanding Balance
          ↑
          │
    IP-03 Allocations
          ↑
          │
   Successful Payments
```

Therefore:

> **IP-04 consumes payment allocations; it does not create payment transactions.**

---

# 9. Invoice Balance

The invoice outstanding amount shall be derived from valid allocations.

Conceptually:

```text
Invoice Amount
      −
Valid Allocations
      =
Invoice Outstanding
```

Example:

```text
Invoice = KES 50,000

Payment 1 = KES 20,000
Payment 2 = KES 10,000

Allocated = KES 30,000
Outstanding = KES 20,000
```

---

# 10. Invoice Status

IP-04 shall support:

```text
DRAFT
  ↓
ISSUED
  ↓
PARTIALLY_PAID
  ↓
PAID
```

With applicable alternative states:

```text
ISSUED → OVERDUE
ISSUED → CANCELLED
ISSUED → CREDITED
```

### Status principles

| Status             | Meaning                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| **DRAFT**          | Invoice created but not formally issued                                   |
| **ISSUED**         | Formal invoice issued to customer                                         |
| **PARTIALLY_PAID** | Some amount allocated but balance remains                                 |
| **PAID**           | Full invoice amount allocated                                             |
| **OVERDUE**        | Outstanding balance remains after due date                                |
| **CANCELLED**      | Invoice formally cancelled                                                |
| **CREDITED**       | Invoice has been fully/appropriately offset by an approved credit process |

---

# 11. Overdue

Overdue is a **status**, not a collections process.

For example:

```text
Invoice
Due Date: 10 Aug

Today: 20 Aug
Outstanding: KES 30,000

Status → OVERDUE
```

IP-04 may identify the invoice as overdue.

It shall **not** implement:

* SMS campaigns;
* WhatsApp reminders;
* collection queues;
* collector assignment;
* escalation campaigns;
* dunning;
* collection scoring.

Those belong to the future collections capability.

---

# 12. Invoice Cancellation

IP-04 shall support controlled invoice cancellation where permitted.

Cancellation shall:

* validate that the invoice is eligible for cancellation;
* prevent cancellation where prohibited by downstream financial state;
* record actor;
* record timestamp;
* record reason;
* preserve the invoice audit history.

An issued invoice should not simply be deleted.

---

# 13. Credit / Adjustment Documents

IP-04 may support the creation of a controlled credit/adjustment document where applicable.

However:

> **A credit note is not a refund.**

The financial consequence of returning money to the customer belongs to IP-06.

Therefore:

```text
Credit adjustment
       ≠
Cash refund
```

---

# 14. Invoice Lifecycle Rules

Recommended rules:

| From                  | To             | Rule                                        |
| --------------------- | -------------- | ------------------------------------------- |
| DRAFT                 | ISSUED         | Required invoice data valid                 |
| ISSUED                | PARTIALLY_PAID | Valid allocation exists and balance remains |
| ISSUED                | PAID           | Full valid allocation exists                |
| PARTIALLY_PAID        | PAID           | Remaining balance fully allocated           |
| ISSUED                | OVERDUE        | Due date passed and balance remains         |
| PARTIALLY_PAID        | OVERDUE        | Due date passed and balance remains         |
| ISSUED                | CANCELLED      | Cancellation permitted                      |
| PARTIALLY_PAID        | CANCELLED      | Only if policy permits                      |
| ISSUED/PARTIALLY_PAID | CREDITED       | Valid credit/adjustment process completed   |

Invalid transitions must fail closed.

---

# 15. Business Requirements

| ID         | Requirement                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------- |
| **BR-001** | The platform shall support formal invoicing for eligible sales requiring billing/credit.       |
| **BR-002** | Not every sale shall require an invoice.                                                       |
| **BR-003** | Credit shall not be represented as a payment method.                                           |
| **BR-004** | Credit sales shall only be permitted where the applicable business policy allows them.         |
| **BR-005** | Invoice amounts shall derive from the applicable payment/commercial obligation.                |
| **BR-006** | IP-04 shall not independently recalculate commercial amounts.                                  |
| **BR-007** | Invoice numbering shall be provided by ENG-003b.                                               |
| **BR-008** | Invoice documents shall be produced through ENG-007.                                           |
| **BR-009** | Invoice balances shall reflect valid payment allocations from IP-03.                           |
| **BR-010** | Partial payment shall result in a partially paid invoice where an invoice exists.              |
| **BR-011** | An invoice shall become paid only when its full amount is validly allocated.                   |
| **BR-012** | An invoice may become overdue when its due date has passed and an outstanding balance remains. |
| **BR-013** | Overdue status shall not initiate collection activity.                                         |
| **BR-014** | Invoice cancellation shall be controlled and auditable.                                        |
| **BR-015** | Invoice credit/adjustment shall not be treated as a payment refund.                            |
| **BR-016** | Invoice data shall preserve sufficient commercial/payment provenance.                          |
| **BR-017** | Invoice and payment status shall remain separate concepts.                                     |
| **BR-018** | Cross-business invoice access shall fail closed.                                               |
| **BR-019** | Invoice lifecycle transitions shall be auditable.                                              |
| **BR-020** | IP-04 shall not implement supplier billing or accounts payable.                                |

---

# 16. Functional Requirements

| ID         | Functional Requirement                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| **FR-001** | Determine whether an eligible transaction requires formal invoicing.                                      |
| **FR-002** | Validate that the originating obligation/order is valid.                                                  |
| **FR-003** | Create an invoice linked to the originating obligation.                                                   |
| **FR-004** | Preserve originating order, customer, contract and obligation references.                                 |
| **FR-005** | Preserve applicable line and financial information supplied by the upstream commercial/payment domain.    |
| **FR-006** | Obtain an invoice number through ENG-003b.                                                                |
| **FR-007** | Support configurable payment terms.                                                                       |
| **FR-008** | Calculate/store the applicable invoice due date according to configured policy.                           |
| **FR-009** | Support DRAFT invoice status.                                                                             |
| **FR-010** | Issue a valid invoice.                                                                                    |
| **FR-011** | Produce invoice documents through ENG-007.                                                                |
| **FR-012** | Determine invoice outstanding amount from valid allocations.                                              |
| **FR-013** | Update invoice status based on payment allocation.                                                        |
| **FR-014** | Support PARTIALLY_PAID.                                                                                   |
| **FR-015** | Support PAID.                                                                                             |
| **FR-016** | Support OVERDUE.                                                                                          |
| **FR-017** | Support controlled invoice cancellation.                                                                  |
| **FR-018** | Support applicable credit/adjustment documents.                                                           |
| **FR-019** | Preserve invoice audit history.                                                                           |
| **FR-020** | Prevent invoice amount from being recalculated independently of the originating commercial obligation.    |
| **FR-021** | Prevent creation of credit sales where credit sales are disabled.                                         |
| **FR-022** | Support payment allocation against an invoice where an invoice exists.                                    |
| **FR-023** | Prevent payment allocation from exceeding the invoice's outstanding amount under normal allocation rules. |
| **FR-024** | Detect overdue invoices based on configured due-date rules.                                               |
| **FR-025** | Maintain tenant isolation.                                                                                |
| **FR-026** | Expose invoice status and outstanding balance to downstream capabilities.                                 |
| **FR-027** | Prevent deletion of issued invoices where controlled cancellation is required.                            |

---

# 17. Business Rules

| ID          | Rule                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------- |
| **BRU-001** | Fully paid cash/electronic sales do not automatically require an invoice.                    |
| **BRU-002** | Credit is not a payment method.                                                              |
| **BRU-003** | Credit sales require `creditSalesEnabled` or the applicable future credit-policy capability. |
| **BRU-004** | Invoice amount must originate from the approved commercial/payment obligation.               |
| **BRU-005** | IP-04 shall not recalculate price, tax or discounts.                                         |
| **BRU-006** | Invoice numbers must come from ENG-003b.                                                     |
| **BRU-007** | Invoice documents must be produced through ENG-007.                                          |
| **BRU-008** | An invoice is not PAID until the required amount has been validly allocated.                 |
| **BRU-009** | Partial allocation results in PARTIALLY_PAID while balance remains.                          |
| **BRU-010** | An invoice with an outstanding balance past its due date becomes OVERDUE.                    |
| **BRU-011** | OVERDUE does not automatically trigger collection activity.                                  |
| **BRU-012** | An issued invoice cannot simply be deleted.                                                  |
| **BRU-013** | Invoice cancellation requires authorization according to configured policy.                  |
| **BRU-014** | A credit/adjustment document does not itself constitute a payment refund.                    |
| **BRU-015** | Invoice status must not be used as the payment transaction status.                           |
| **BRU-016** | Invoice access must be tenant isolated.                                                      |
| **BRU-017** | Invoice lifecycle changes must be auditable.                                                 |

---

# 18. Acceptance Criteria

| ID         | Acceptance Criterion                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **AC-001** | A fully paid sale can complete without creating an invoice.                                                |
| **AC-002** | A credit sale cannot proceed when credit sales are disabled.                                               |
| **AC-003** | A permitted credit sale can create an invoice for the unpaid amount.                                       |
| **AC-004** | Invoice numbering comes from ENG-003b and is not hard-coded in BP-007.                                     |
| **AC-005** | Invoice document generation occurs through ENG-007.                                                        |
| **AC-006** | Invoice amount matches the applicable obligation/contract amount and is not independently recalculated.    |
| **AC-007** | A KES 50,000 invoice with KES 20,000 allocated shows outstanding = KES 30,000 and status = PARTIALLY_PAID. |
| **AC-008** | A fully allocated invoice becomes PAID.                                                                    |
| **AC-009** | An invoice past its due date with outstanding balance becomes OVERDUE.                                     |
| **AC-010** | OVERDUE does not create a collection case or dunning action.                                               |
| **AC-011** | Invoice cancellation is controlled and audited.                                                            |
| **AC-012** | An issued invoice cannot simply be deleted.                                                                |
| **AC-013** | Invoice provenance identifies its originating sale/order and payment obligation.                           |
| **AC-014** | Cross-business invoice access fails.                                                                       |
| **AC-015** | Credit is not present in the payment method catalogue.                                                     |
| **AC-016** | Payment allocations update invoice balances without changing the original invoice amount.                  |
| **AC-017** | IP-04 does not contain a tax/pricing recalculation engine.                                                 |
| **AC-018** | No collections/dunning functionality is implemented.                                                       |
| **AC-019** | No supplier/AP billing functionality is implemented.                                                       |
| **AC-020** | No direct payment-provider integration is implemented in IP-04.                                            |

---

# 19. Recommended UX

The customer should **not be forced through an invoice journey for every sale**.

### Normal POS sale

```text
Sale
 ↓
Payment
 ↓
Receipt
 ↓
Complete
```

### Credit sale

```text
Sale
 ↓
Customer
 ↓
Payment
 ↓
Outstanding amount
 ↓
Create/Issue Invoice
 ↓
Customer receives invoice
```

For example:

```text
Sale Total          KES 50,000
Paid                KES 20,000
Outstanding         KES 30,000

Payment terms       30 days

[Issue Invoice]
```

The user does not need to understand:

```text
IP-04
ENG-003b
ENG-007
```

or the underlying payment architecture.

---

# 20. Important Architectural Boundary

The most important relationship across BP-007 is:

```text
                 BP-006
              Sales Amount
                   │
                   ▼
            Payment Obligation
                 IP-01
                   │
          ┌────────┴────────┐
          ▼                 ▼
       IP-02              IP-04
 Payment Transaction      Invoice
          │                 │
          ▼                 ▼
       IP-03 Allocation ────┘
          │
          ▼
    Paid / Outstanding
```

In simpler terms:

### IP-01

**What does the customer owe?**

### IP-02

**How was a payment initiated and what happened to it?**

### IP-03

**How much of successful payments is applied to the obligation?**

### IP-04

**When does the unpaid obligation become a formal invoice/receivable?**

### IP-05

**What evidence do we give the customer for the payment?**

### IP-06

**What happens when money needs to be reversed/refunded?**

### IP-07

**Has the money actually settled?**

### IP-08

**What happens when the payment cannot be confidently matched or processed?**

---

## One major refinement to your original IP-04

I would **not** define the lifecycle simply as:

```text
DRAFT → ISSUED → PARTIALLY_PAID → PAID
OVERDUE | CANCELLED | CREDITED
```

because `OVERDUE` is really a **derived business status** that can coexist conceptually with an unpaid/partially-paid state.

A cleaner model is:

```text
Document lifecycle:
DRAFT → ISSUED → CANCELLED / CREDITED

Payment status:
UNPAID → PARTIALLY_PAID → PAID

Due status:
CURRENT → OVERDUE
```


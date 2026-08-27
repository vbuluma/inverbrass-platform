
# BP-007 IP-03 — Partial, Split Payment & Allocation

## BRD / Requirements Specification

| Attribute                  | Description                             |
| -------------------------- | --------------------------------------- |
| **Implementation Package** | IP-03                                   |
| **Build Pack**             | BP-007 – Payments, Billing & Receipting |
| **Priority**               | Critical                                |
| **Status**                 | Implemented                             |
| **Depends On**             | IP-01, IP-02                            |
| **Scope Coverage**         | SC-007, SC-008, SC-009, SC-004          |
| **Related Pack FRs**       | FR-008–FR-011                           |

---

# 1. Objective

Enable a single Payment Obligation to be satisfied through **one or more successful payment transactions**, including:

* partial payments;
* multiple payments;
* split tender;
* different payment methods;
* allocation of successful payments;
* controlled handling of overpayments;
* visibility of paid and outstanding amounts.

IP-03 shall ensure that:

> **Payment transaction ≠ allocation ≠ obligation amount.**

IP-03 shall **not change the commercial amount due**.

---

# 2. Business Problem

A customer may settle one obligation through several payments.

For example:

```text
Obligation = KES 10,000

M-Pesa       KES 5,000
Cash         KES 2,000
Bank         KES 3,000
----------------------
Allocated    KES 10,000
Outstanding  KES 0
```

The three payments are separate payment transactions but collectively satisfy one obligation.

Without IP-03:

* partial payments cannot be represented correctly;
* mixed tenders become difficult;
* provider transaction limits cannot be handled cleanly;
* Sales may incorrectly become responsible for payment allocation;
* overpayments may accidentally change the commercial amount.

---

# 3. Core Domain Model

IP-03 shall maintain a clear separation:

```text
Payment Obligation
        │
        ├──────── Payment Transaction 1
        │              │
        │              └── Allocation
        │
        ├──────── Payment Transaction 2
        │              │
        │              └── Allocation
        │
        └──────── Payment Transaction 3
                       │
                       └── Allocation
```

### Payment Transaction

Represents money received or a payment event.

### Allocation

Represents how much of a successful payment is applied to an obligation.

### Payment Obligation

Represents what the customer owes.

---

# 4. Scope

## 4.1 Included

### A. Partial Payments

Allow multiple successful payment transactions against one obligation.

Example:

```text
Due          KES 10,000
Payment 1   KES 4,000
Payment 2   KES 3,000

Allocated    KES 7,000
Outstanding  KES 3,000
```

The obligation remains outstanding until the applicable amount is fully allocated.

---

### B. Split Tender

Allow one obligation to be settled using different payment methods.

Example:

```text
KES 10,000 obligation

M-Pesa     5,000
Cash       2,000
Bank       3,000
```

Each payment remains an independent transaction.

IP-03 aggregates them at obligation level.

---

### C. Multiple Payment Transactions

An obligation may have multiple successful payment transactions.

There shall be no assumption that:

> One obligation = one payment.

---

### D. Payment Allocation

Successful payment transactions shall be allocated to an eligible Payment Obligation.

Example:

```text
Payment transaction
Amount = KES 5,000
Status = SUCCESSFUL

        ↓

Allocation

Obligation A = KES 5,000
```

Only successful payments may be allocated.

---

# 5. Allocation Rules

IP-03 shall calculate:

```text
Allocated Amount
=
sum of successful allocations
```

and:

```text
Outstanding Amount
=
Amount Due − Allocated Amount
```

Subject to adjustments required by later refund/reversal processing.

### Important

IP-03 shall **not recalculate the original amount due**.

---

# 6. Payment Status vs Allocation Status

These must remain separate.

For example:

```text
Payment Transaction
KES 5,000
SUCCESSFUL
```

does not automatically mean:

```text
Obligation paid
```

The payment must be allocated.

Similarly:

```text
Payment = SUCCESSFUL
Allocation = KES 4,000
Unallocated = KES 1,000
```

is valid.

---

# 7. Overpayment

If a successful payment exceeds the remaining obligation:

```text
Amount Due             10,000
Existing Allocated      8,000
New Payment             5,000
-----------------------------
Remaining obligation   2,000
Allocatable             2,000
Unallocated             3,000
```

The system shall **not** change:

```text
Amount Due = 10,000
```

to:

```text
Amount Due = 13,000
```

The excess shall remain explicitly identifiable as:

> **Unallocated / Overpayment**

---

# 8. Overpayment Treatment

IP-03 shall support:

* identifying an overpayment;
* recording the unallocated amount;
* preventing automatic increase of the obligation;
* exposing the amount for subsequent controlled handling.

The actual financial treatment of the overpayment—such as refund, customer credit, transfer to another obligation or other business treatment—is outside this IP unless explicitly configured as part of a later capability.

**Do not silently consume overpayments.**

---

# 9. Provider Limits

Provider/channel limits apply to **each individual payment transaction**.

For example:

```text
Obligation = KES 200,000

Transaction 1 = KES 150,000
Transaction 2 = KES 50,000
```

IP-03 may allow the business to construct multiple payment transactions, but **IP-03 must not bypass IP-02's provider-limit enforcement**.

Therefore:

```text
IP-03
  ↓
Create payment transaction
  ↓
IP-02
  ↓
ENG-006
  ↓
Applicable provider/channel limit
```

### Important

IP-03 shall not hard-code limits such as:

```text
150000
```

or provider names.

Limits remain configuration/provider capability data.

---

# 10. Allocation Eligibility

A payment transaction may be allocated only when:

* payment belongs to the same business;
* payment status is `SUCCESSFUL`;
* payment has an allocatable amount;
* target obligation belongs to the same business;
* target obligation is eligible for allocation;
* allocation amount is greater than zero.

Failed, expired or pending payments shall not be allocated.

---

# 11. Allocation Amount

The system shall prevent allocation beyond the available payment amount.

For example:

```text
Successful payment = 5,000
Already allocated  = 3,000
Remaining payment  = 2,000
```

Maximum additional allocation:

```text
KES 2,000
```

The system shall not permit:

```text
Allocation = KES 3,000
```

unless an explicit controlled adjustment mechanism exists.

---

# 12. Obligation-Level Allocation

The system shall also prevent uncontrolled allocation beyond the obligation.

If:

```text
Outstanding = 2,000
```

and:

```text
Payment = 5,000
```

the maximum normal allocation is:

```text
2,000
```

The remaining:

```text
3,000
```

becomes unallocated/overpayment.

---

# 13. Allocation Adjustment

Controlled allocation adjustment may be required to correct an operational allocation error.

Any adjustment shall:

* require authorization according to configured policy;
* record previous allocation;
* record new allocation;
* record actor;
* record timestamp;
* record reason;
* maintain an audit trail;
* never modify the original commercial amount.

An allocation shall not simply be deleted without an auditable history.

---

# 14. Concurrency

This is an important requirement missing from the original.

IP-03 shall protect against two users allocating the same outstanding amount simultaneously.

Example:

```text
Outstanding = 5,000

User A allocates 5,000
User B simultaneously allocates 5,000
```

The platform must not end up with:

```text
Allocated = 10,000
```

against a:

```text
5,000 obligation
```

Allocation must therefore use appropriate transactional/concurrency controls.

---

# 15. Payment and Allocation Relationship

A single payment may potentially be allocated according to the capabilities defined by the payment domain.

For IP-03 v1, I recommend:

> **One payment transaction may be allocated to one obligation.**

This keeps the first implementation simple.

If later requirements need:

```text
KES 10,000 payment
   ├── Invoice A = 6,000
   └── Invoice B = 4,000
```

that can be explicitly introduced as a later allocation capability rather than accidentally creating it now.

---

# 16. Business Requirements

| ID         | Requirement                                                                      |
| ---------- | -------------------------------------------------------------------------------- |
| **BR-001** | An obligation may be satisfied through multiple successful payment transactions. |
| **BR-002** | Payment transactions shall remain independently identifiable.                    |
| **BR-003** | IP-03 shall support partial payment.                                             |
| **BR-004** | IP-03 shall support split tender across configured payment methods.              |
| **BR-005** | Only successful payments may be allocated.                                       |
| **BR-006** | Allocation shall not change the original obligation amount.                      |
| **BR-007** | Outstanding amount shall reflect the amount due less valid allocations.          |
| **BR-008** | The system shall identify unallocated payment amounts.                           |
| **BR-009** | Overpayments shall not silently increase the amount due.                         |
| **BR-010** | Payment/channel limits shall apply independently to each payment transaction.    |
| **BR-011** | IP-03 shall rely on IP-02/ENG-006 for provider-limit enforcement.                |
| **BR-012** | IP-03 shall not hard-code provider, rail, channel or transaction limits.         |
| **BR-013** | Allocation shall be tenant isolated.                                             |
| **BR-014** | Allocation changes shall be auditable.                                           |
| **BR-015** | Concurrent allocation shall not allow the obligation to be over-allocated.       |
| **BR-016** | Failed, pending and expired payments shall not be allocated.                     |
| **BR-017** | IP-03 shall not modify commercial pricing or amount due.                         |

---

# 17. Functional Requirements

| ID         | Functional Requirement                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------- |
| **FR-001** | Retrieve a valid Payment Obligation.                                                           |
| **FR-002** | Display amount due, allocated amount and outstanding amount.                                   |
| **FR-003** | Retrieve successful payment transactions available for allocation.                             |
| **FR-004** | Allocate a successful payment to an eligible obligation.                                       |
| **FR-005** | Prevent allocation of failed, pending or expired payments.                                     |
| **FR-006** | Prevent allocation beyond the unallocated amount of the payment transaction.                   |
| **FR-007** | Prevent normal allocation beyond the obligation's outstanding amount.                          |
| **FR-008** | Support multiple successful payment transactions against one obligation.                       |
| **FR-009** | Support multiple configured payment methods against one obligation.                            |
| **FR-010** | Store allocation amount and allocation relationship.                                           |
| **FR-011** | Calculate allocated amount from valid allocations.                                             |
| **FR-012** | Calculate outstanding amount from amount due and valid allocations.                            |
| **FR-013** | Identify unallocated payment amounts.                                                          |
| **FR-014** | Identify overpayments.                                                                         |
| **FR-015** | Prevent overpayment from changing amount due.                                                  |
| **FR-016** | Support controlled allocation adjustment.                                                      |
| **FR-017** | Record actor, timestamp and reason for allocation adjustments.                                 |
| **FR-018** | Maintain an auditable allocation history.                                                      |
| **FR-019** | Enforce tenant isolation for payment and obligation relationships.                             |
| **FR-020** | Prevent concurrent allocation from causing over-allocation.                                    |
| **FR-021** | Preserve payment method/rail/provider/channel information on each payment transaction.         |
| **FR-022** | Prevent IP-03 from bypassing IP-02 payment initiation and provider-limit controls.             |
| **FR-023** | Support creation of multiple payment transactions where the customer needs multiple tenders.   |
| **FR-024** | Maintain separation between payment status and settlement status.                              |
| **FR-025** | Expose payment allocation state for downstream receipt, settlement and reporting capabilities. |

---

# 18. Business Rules

| ID          | Rule                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| **BRU-001** | Only `SUCCESSFUL` payments are allocatable.                                                           |
| **BRU-002** | A payment cannot be allocated more than its unallocated amount.                                       |
| **BRU-003** | An obligation cannot be normally allocated beyond its outstanding amount.                             |
| **BRU-004** | Overpayment shall remain explicitly identifiable.                                                     |
| **BRU-005** | Overpayment shall not increase the commercial amount due.                                             |
| **BRU-006** | A failed payment contributes zero to allocated amount.                                                |
| **BRU-007** | A pending payment contributes zero to allocated amount until successfully completed.                  |
| **BRU-008** | Provider/channel limits apply to each payment transaction.                                            |
| **BRU-009** | IP-03 shall not override provider limits.                                                             |
| **BRU-010** | Provider limits shall not be hard-coded in IP-03.                                                     |
| **BRU-011** | Allocation must belong to the same business as the payment and obligation.                            |
| **BRU-012** | Allocation adjustment requires authorization and audit.                                               |
| **BRU-013** | Material allocation changes must be traceable to an actor and reason.                                 |
| **BRU-014** | Concurrent allocation shall be serialized/controlled to prevent over-allocation.                      |
| **BRU-015** | IP-03 shall not modify the commercial contract or amount due.                                         |
| **BRU-016** | Refund/reversal effects are introduced through IP-06 and must not be independently invented by IP-03. |

---

# 19. Integration Requirements

| Component   | Responsibility                                        |
| ----------- | ----------------------------------------------------- |
| **IP-01**   | Payment Obligation and payment catalogue foundation   |
| **IP-02**   | Payment initiation and payment transaction lifecycle  |
| **IP-03**   | Payment allocation and partial/split payment          |
| **IP-04**   | Invoice/credit capability                             |
| **IP-05**   | Receipting                                            |
| **IP-06**   | Refund/reversal                                       |
| **IP-07**   | Settlement                                            |
| **IP-08**   | Payment exceptions                                    |
| **ENG-006** | Provider/payment engine                               |
| **BP-006**  | Commercial amount/payment-ready contract              |
| **ENG-008** | Settlement/reconciliation capability where applicable |

---

# 20. Acceptance Criteria

| ID         | Acceptance Criterion                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| **AC-001** | Two successful payments of KES 4,000 and KES 6,000 against a KES 10,000 obligation result in outstanding = KES 0. |
| **AC-002** | A successful payment of KES 4,000 against KES 10,000 results in outstanding = KES 6,000.                          |
| **AC-003** | Cash + mobile money + bank payments can independently exist against the same obligation.                          |
| **AC-004** | Each payment retains its own configured method/rail/provider/channel information.                                 |
| **AC-005** | A failed payment contributes zero to allocated amount.                                                            |
| **AC-006** | A pending payment contributes zero to allocated amount.                                                           |
| **AC-007** | A successful payment can be allocated to an eligible obligation.                                                  |
| **AC-008** | A payment cannot be allocated beyond its unallocated balance.                                                     |
| **AC-009** | An obligation cannot normally be allocated beyond its outstanding amount.                                         |
| **AC-010** | Excess payment is recorded as unallocated/overpayment without changing amount due.                                |
| **AC-011** | Provider/channel transaction limits remain enforced through IP-02/ENG-006.                                        |
| **AC-012** | IP-03 contains no hard-coded provider limits.                                                                     |
| **AC-013** | IP-03 contains no hard-coded provider names.                                                                      |
| **AC-014** | Cross-business payment allocation fails.                                                                          |
| **AC-015** | Concurrent allocation cannot over-allocate an obligation.                                                         |
| **AC-016** | Allocation adjustments require the configured authorization and produce an audit trail.                           |
| **AC-017** | Amount due remains unchanged after payment and allocation.                                                        |
| **AC-018** | No refund, reversal or settlement functionality is implemented in IP-03.                                          |

---

# 21. Recommended UX

The customer should not need to understand the four-level payment model.

For example:

```text
Amount Due
KES 10,000

How would you like to pay?

[ M-Pesa ]

[ Cash ]

[ Card ]

[ Bank ]
```

If the first payment is:

```text
KES 5,000
```

the system should show:

```text
Payment successful

Paid:        KES 5,000
Outstanding: KES 5,000

[Pay remaining]
```

For mixed tender:

```text
Amount due       KES 10,000

M-Pesa            KES 5,000 ✓
Cash              KES 2,000 ✓
Bank              KES 3,000 ✓

Paid              KES 10,000
Outstanding       KES 0

Payment complete
```

The UI should **not expose**:

```text
M-Pesa → MPESA → Safaricom → STK_PUSH
```

unless there is a genuine operational reason to expose those details.

---

# 22. Important Architectural Decision

I would explicitly lock this into the specification:

> **IP-03 does not bypass IP-02 to create payment transactions.**

If the user wants to split:

```text
KES 200,000
```

into:

```text
M-Pesa = 150,000
Bank   = 50,000
```

IP-03 orchestrates the multiple-payment journey, but each payment transaction still goes through the normal IP-02 initiation path.

```text
                IP-03
           Split / Allocation
             /          \
            ↓            ↓
         IP-02         IP-02
          /               \
      Payment 1         Payment 2
          ↓                 ↓
      ENG-006           ENG-006
```

This is important because **provider limits, idempotency, provider status and payment lifecycle remain consistently enforced**.

---

## 23. One change to your original example

I would remove this from the BRD:

> `STK limit 150,000; order 200,000`

Not because the scenario is wrong, but because **150,000 is an implementation/provider example and risks becoming a hard-coded business rule**.

Use:

> **Where the configured provider/channel limit is lower than the requested transaction amount, the transaction shall not be initiated. The customer may use multiple permitted transactions or another eligible payment option.**

That keeps BP-007 **provider-agnostic and future-proof**.



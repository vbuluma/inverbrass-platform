Yes. **IP-02 is directionally correct**, but I would tighten it before giving it to Cursor.

The biggest issue is the same one we corrected in IP-01: **the BRD should describe payment initiation capability, not hard-code M-Pesa/Safaricom/STK as the implementation model.** Those can be configured examples.

There is also one important conceptual distinction to preserve:

> **IP-02 records and manages the payment transaction lifecycle; ENG-006 owns the actual provider interaction.**

---

# BP-007 IP-02 — Payment Initiation & Processing

## BRD / Requirements Specification

**Build Pack:** BP-007 – Payments, Billing & Receipting
**Implementation Package:** IP-02
**Priority:** Critical
**Status:** Implemented
**Depends On:** BP-007 IP-01, ENG-006, ENG-003e, ENG-003d
**Scope Coverage:** SC-005, SC-006, SC-004, SC-016
**Related Pack FRs:** FR-005–FR-007, FR-004, FR-024

---

# 1. Objective

Enable a user or customer to initiate a payment against an existing **Payment Obligation** and manage the resulting payment transaction through its initial lifecycle.

IP-02 shall:

* initiate payments through **ENG-006**;
* resolve an eligible payment option from the configured method/rail/provider/channel model;
* persist the payment transaction;
* maintain payment initiation status;
* consume provider responses through ENG-006;
* process provider callbacks/events;
* support provider status queries where required;
* handle timeout and expiry;
* enforce idempotency;
* normalize provider outcomes into platform payment statuses;
* support manual capture for configured offline/manual payment methods.

**IP-02 does not own or implement payment rails or external provider integrations.**

---

# 2. Business Problem

Without a controlled payment-initiation lifecycle:

* staff may mark an unpaid transaction as paid;
* an initiated payment may be mistaken for a successful payment;
* provider callbacks may create duplicate transactions;
* retries may create duplicate charges;
* provider failures may be incorrectly recorded as successful payments;
* provider-specific terminology may leak into the business application;
* customers may be offered payment options that the configured provider cannot actually support.

IP-02 establishes a **single controlled payment initiation and processing path**.

---

# 3. Architectural Principle

The responsibility boundary shall be:

```text
Customer / Cashier
        │
        ▼
     BP-007
      IP-02
        │
        │ payment operation
        ▼
     ENG-006
 Payment Engine
        │
        ▼
 ENG-003e / ENG-003d
 Integration & Events
        │
        ▼
External Provider
```

### Critical rule

**BP-007 shall never directly call a payment provider.**

No BP-007 module shall contain:

* provider SDK imports;
* provider-specific HTTP clients;
* provider API credentials;
* provider-specific authentication;
* provider-specific callback processing.

---

# 4. Scope

## 4.1 Included

### A. Payment Initiation

Initiate a payment against an existing IP-01 Payment Obligation.

The system shall:

* validate the obligation;
* validate that payment is still outstanding;
* identify the requested payment method;
* resolve eligible payment options;
* validate amount;
* validate applicable provider/channel limits;
* generate/use an idempotency key;
* submit the operation through ENG-006;
* persist the resulting payment transaction.

---

### B. Payment Option Resolution

The user experience may remain simple:

> **How would you like to pay?**

For example:

* Mobile Money
* Card
* Bank
* Cash

The platform shall resolve the underlying:

```text
Method
   ↓
Rail
   ↓
Provider
   ↓
Channel
```

from configuration and ENG-006 capability information.

### Important

The business/UI layer shall **not contain logic such as**:

```text
If M-Pesa → Safaricom → STK
```

Instead:

```text
Selected Method
      ↓
Configured eligible options
      ↓
ENG-006 capability resolution
      ↓
Eligible Provider/Rail/Channel
```

This allows another provider or channel to be introduced without modifying payment business logic.

---

# 5. Manual Payment Capture

IP-02 shall support manual payment capture for configured payment methods where no real-time provider integration is required.

Examples may include:

* Cash;
* staff-recorded bank transfer;
* other configured offline/manual payment methods.

Manual capture shall:

* require an authorized actor;
* record the payment method;
* record amount;
* record actor and timestamp;
* create the payment transaction;
* move the transaction to `SUCCESSFUL` only after the applicable business validation;
* remain auditable.

Manual capture shall **not pretend that an external provider transaction occurred**.

Therefore provider reference may remain null.

---

# 6. Payment Transaction Lifecycle

IP-02 shall establish the following lifecycle:

```text
NOT_STARTED
      │
      ▼
 INITIATED
      │
      ▼
  PENDING
    /   \
   /     \
FAILED   SUCCESSFUL
   │
   └── EXPIRED
```

More precisely:

| From        | To         | Condition                                  |
| ----------- | ---------- | ------------------------------------------ |
| NOT_STARTED | INITIATED  | Payment initiation accepted for processing |
| INITIATED   | PENDING    | Provider requires further processing       |
| INITIATED   | SUCCESSFUL | Provider immediately confirms success      |
| INITIATED   | FAILED     | Provider rejects/fails initiation          |
| INITIATED   | EXPIRED    | Initiation expires                         |
| PENDING     | SUCCESSFUL | Provider confirms success                  |
| PENDING     | FAILED     | Provider reports failure                   |
| PENDING     | EXPIRED    | Provider/payment request expires           |

### Out of scope

`REVERSED` and `REFUNDED` belong to IP-06.

---

# 7. Payment Status Rules

| Provider Outcome        | Platform Outcome                 |
| ----------------------- | -------------------------------- |
| Accepted for processing | INITIATED                        |
| Awaiting final result   | PENDING                          |
| Successful              | SUCCESSFUL                       |
| Rejected                | FAILED                           |
| Failed                  | FAILED                           |
| Expired                 | EXPIRED                          |
| Unknown/untrusted       | Fail closed / exception handling |

### Mandatory rules

**Provider rejection shall never become SUCCESSFUL.**

**Absence of a provider response shall never become SUCCESSFUL.**

**An unknown provider outcome shall never be assumed successful.**

---

# 8. Provider Callback Processing

Provider callbacks/events shall reach BP-007 through the enterprise integration layer:

```text
Provider
   ↓
ENG-003d
   ↓
ENG-006
   ↓
BP-007
```

IP-02 shall:

* identify the relevant payment transaction;
* validate the callback;
* validate provider reference;
* verify business/tenant context;
* apply the status transition;
* maintain idempotency;
* record the provider response;
* reject invalid or contradictory callbacks.

BP-007 shall not implement provider-specific callback parsers.

Those belong in **ENG-006 adapters**.

---

# 9. Duplicate Callback Handling

If the same provider transaction reference and equivalent outcome are received more than once:

> The event shall be processed idempotently.

It shall **not create another payment transaction**.

If the same provider reference produces contradictory outcomes:

> The transaction shall fail closed and be made available to the appropriate exception process.

IP-02 shall not silently overwrite a previously confirmed successful payment with an incompatible result.

---

# 10. Provider Query / Polling

Where ENG-006 indicates that a payment requires status polling, IP-02 shall support requesting the payment status through the engine.

```text
IP-02
  ↓
ENG-006
  ↓
Provider
```

IP-02 shall not implement polling logic against individual provider APIs.

The provider-specific polling mechanism belongs to ENG-006.

---

# 11. Timeout and Expiry

IP-02 shall support payment expiry.

A payment shall transition to `EXPIRED` when:

* the configured payment validity period is reached; or
* ENG-006 reports that the payment request has expired.

An expired payment shall **not be treated as successful**.

The original Payment Obligation shall remain outstanding unless another successful payment transaction is applied by the applicable payment process.

---

# 12. Idempotency

IP-02 shall enforce idempotency for payment initiation.

For a given:

```text
businessId
+
idempotencyKey
+
payment operation
```

the platform shall not create multiple payment initiation transactions.

If the same request is submitted again:

* return/reference the existing transaction where appropriate;
* do not initiate a second provider transaction.

---

# 13. Provider Limits

Before initiation, IP-02 shall obtain applicable limits through ENG-006.

Where the requested amount exceeds the applicable provider/channel limit:

> **The payment shall not be initiated.**

The user/application may subsequently use IP-03 split payment capability.

### Important

IP-02 shall **not hard-code provider limits**.

For example, the code must not contain:

```text
if amount > 150000 then reject
```

Instead:

```text
IP-02
  ↓
ENG-006
  ↓
Applicable provider/channel limit
  ↓
Validate amount
```

The actual limit remains provider/configuration data.

---

# 14. Payment Amount

IP-02 shall consume the Payment Obligation established by IP-01.

It shall **not**:

* recalculate product prices;
* recalculate tax;
* recalculate discounts;
* reconstruct the sales total;
* modify the commercial contract amount.

The amount being initiated must be derived from the payment obligation and must not exceed the amount available for payment.

---

# 15. Partial Payment Boundary

IP-02 handles a **single payment transaction**.

IP-02 does not determine how multiple payments are allocated across an obligation.

Therefore:

```text
Payment Obligation = KES 1,230
```

IP-02 may initiate:

```text
KES 1,230
```

subject to provider limits.

If the customer needs:

```text
KES 400 + KES 830
```

the split/allocation decision belongs to **IP-03**.

---

# 16. Business Requirements

| ID         | Requirement                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| **BR-001** | Payment initiation shall only occur against a valid IP-01 Payment Obligation.                                          |
| **BR-002** | Payment initiation shall use the outstanding amount available on the Payment Obligation.                               |
| **BR-003** | IP-02 shall not recalculate the commercial amount.                                                                     |
| **BR-004** | Payment initiation shall occur through ENG-006.                                                                        |
| **BR-005** | BP-007 shall not directly integrate with external payment providers.                                                   |
| **BR-006** | Payment Method, Rail, Provider and Channel shall be resolved through configuration and engine capabilities.            |
| **BR-007** | Provider-specific implementation shall remain within ENG-006.                                                          |
| **BR-008** | Provider rejection shall never result in a successful payment.                                                         |
| **BR-009** | An absent or unknown provider response shall not be treated as success.                                                |
| **BR-010** | Duplicate provider callbacks shall be processed idempotently.                                                          |
| **BR-011** | Payment initiation shall be idempotent.                                                                                |
| **BR-012** | Provider/channel limits supplied by ENG-006 shall be enforced before initiation where available.                       |
| **BR-013** | Provider limits shall not be hard-coded in BP-007.                                                                     |
| **BR-014** | Manual payment capture shall be supported for configured manual payment methods.                                       |
| **BR-015** | Payment status shall represent the actual payment lifecycle and shall not be represented by a simple `paid=true` flag. |
| **BR-016** | Cross-business payment initiation shall fail closed.                                                                   |
| **BR-017** | Every material payment transaction state change shall be auditable.                                                    |

---

# 17. Functional Requirements

| ID         | Functional Requirement                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| **FR-001** | Retrieve and validate the target Payment Obligation.                                                                     |
| **FR-002** | Verify that the obligation belongs to the authenticated business.                                                        |
| **FR-003** | Verify that the obligation is eligible for payment.                                                                      |
| **FR-004** | Determine the amount available for the payment transaction.                                                              |
| **FR-005** | Resolve eligible payment options through IP-01 configuration and ENG-006 capabilities.                                   |
| **FR-006** | Resolve the applicable rail/provider/channel without hard-coded provider logic.                                          |
| **FR-007** | Validate provider/channel limits before initiation where available.                                                      |
| **FR-008** | Generate or accept a valid idempotency key.                                                                              |
| **FR-009** | Initiate the payment through ENG-006.                                                                                    |
| **FR-010** | Persist the payment transaction before/with the initiation operation according to the established transactional pattern. |
| **FR-011** | Store provider transaction reference when supplied.                                                                      |
| **FR-012** | Store payment method, rail, provider and channel references used for the transaction.                                    |
| **FR-013** | Set initial transaction status to `INITIATED` where initiation is accepted.                                              |
| **FR-014** | Move an asynchronously processed transaction to `PENDING`.                                                               |
| **FR-015** | Process provider success into `SUCCESSFUL`.                                                                              |
| **FR-016** | Process provider rejection/failure into `FAILED`.                                                                        |
| **FR-017** | Process expiry into `EXPIRED`.                                                                                           |
| **FR-018** | Process provider callbacks/events through the ENG-006 integration contract.                                              |
| **FR-019** | Support provider status query through ENG-006 where required.                                                            |
| **FR-020** | Apply duplicate provider callbacks idempotently.                                                                         |
| **FR-021** | Reject contradictory or invalid provider events without silently changing the payment outcome.                           |
| **FR-022** | Support configured manual payment capture.                                                                               |
| **FR-023** | Record manual payment actor, timestamp and method.                                                                       |
| **FR-024** | Maintain provider reference as nullable for manual transactions where no provider exists.                                |
| **FR-025** | Prevent payment initiation where the requested amount exceeds an applicable configured/provider limit.                   |
| **FR-026** | Prevent payment initiation against cancelled or otherwise ineligible obligations.                                        |
| **FR-027** | Maintain audit history for material payment state transitions.                                                           |
| **FR-028** | Ensure payment transaction access is tenant isolated.                                                                    |
| **FR-029** | Ensure retry occurs only where ENG-006 indicates that the original request was not accepted.                             |
| **FR-030** | Return the existing transaction for an idempotently repeated initiation request rather than creating a duplicate.        |

---

# 18. Business Rules

| ID          | Rule                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------- |
| **BRU-001** | A payment cannot be initiated without a valid Payment Obligation.                                   |
| **BRU-002** | A payment cannot exceed the amount available on the obligation.                                     |
| **BRU-003** | A cancelled or ineligible obligation cannot receive a payment.                                      |
| **BRU-004** | Provider rejection = `FAILED`.                                                                      |
| **BRU-005** | No provider response = `PENDING` or other explicitly defined non-success state, never `SUCCESSFUL`. |
| **BRU-006** | Provider success is required before a payment becomes `SUCCESSFUL` for electronic payments.         |
| **BRU-007** | Duplicate provider events shall not create duplicate payment transactions.                          |
| **BRU-008** | Contradictory provider outcomes shall fail closed.                                                  |
| **BRU-009** | Provider limits shall be obtained through the approved engine/configuration mechanism.              |
| **BRU-010** | Provider limits shall not be hard-coded in BP-007.                                                  |
| **BRU-011** | A retry is permitted only when the original request is confirmed as not accepted by ENG-006.        |
| **BRU-012** | The same idempotency key shall not produce two provider payment attempts.                           |
| **BRU-013** | Manual capture requires an authorized actor.                                                        |
| **BRU-014** | Manual capture shall not fabricate an external provider reference.                                  |
| **BRU-015** | IP-02 does not determine payment allocation across multiple payment transactions.                   |
| **BRU-016** | Payment status is independent of settlement status.                                                 |
| **BRU-017** | IP-02 shall never infer successful payment merely because initiation was requested.                 |

---

# 19. Integration Requirements

| Component    | Responsibility                                                        |
| ------------ | --------------------------------------------------------------------- |
| **IP-01**    | Payment Obligation, catalogues, eligibility and limits foundation     |
| **ENG-006**  | Provider adapters and payment-provider communication                  |
| **ENG-003e** | Integration connectivity, credentials, retries and connector controls |
| **ENG-003d** | External event/callback ingestion                                     |
| **BP-006**   | Source of confirmed sale/payment-ready contract                       |
| **IP-03**    | Split payment and allocation                                          |
| **IP-06**    | Refund/reversal                                                       |
| **IP-07**    | Settlement                                                            |
| **IP-08**    | Exception operations                                                  |

---

# 20. Acceptance Criteria

| ID         | Acceptance Criterion                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **AC-001** | A valid Payment Obligation can be presented for payment.                                                   |
| **AC-002** | An eligible configured payment option can be selected without hard-coded provider logic.                   |
| **AC-003** | IP-02 resolves the applicable method/rail/provider/channel through configuration and ENG-006.              |
| **AC-004** | Electronic payment initiation is sent only through ENG-006.                                                |
| **AC-005** | No BP-007 module imports a provider SDK or directly calls an external payment API.                         |
| **AC-006** | An accepted asynchronous payment enters `INITIATED`/`PENDING` and does not become successful prematurely.  |
| **AC-007** | Provider success results in `SUCCESSFUL`.                                                                  |
| **AC-008** | Provider rejection results in `FAILED`.                                                                    |
| **AC-009** | Expired payment results in `EXPIRED`.                                                                      |
| **AC-010** | No provider response does not result in `SUCCESSFUL`.                                                      |
| **AC-011** | Duplicate callback with the same provider reference does not create another payment.                       |
| **AC-012** | Contradictory callback outcomes fail closed.                                                               |
| **AC-013** | Repeated initiation with the same idempotency key does not create a second payment attempt.                |
| **AC-014** | A retry is performed only where ENG-006 confirms the original request was not accepted.                    |
| **AC-015** | Payment exceeding an applicable provider/channel limit is rejected before initiation.                      |
| **AC-016** | No provider limit is hard-coded in BP-007.                                                                 |
| **AC-017** | Manual cash capture can create a successful payment without an external provider reference.                |
| **AC-018** | Manual bank-transfer capture records the authorized actor and timestamp.                                   |
| **AC-019** | A payment cannot be initiated against another business's obligation.                                       |
| **AC-020** | A cancelled/ineligible obligation cannot receive a payment.                                                |
| **AC-021** | IP-02 does not recalculate the commercial amount.                                                          |
| **AC-022** | IP-02 does not implement split payment/allocation.                                                         |
| **AC-023** | Material payment state transitions are auditable.                                                          |
| **AC-024** | Adding a new provider/channel through configuration does not require modification of IP-02 business logic. |

---

# 21. UX Requirements

The customer/cashier experience should remain simple.

### Payment selection

```text
Amount Due
KES 1,230

How would you like to pay?

○ Mobile Money
○ Card
○ Bank
○ Cash

[Continue]
```

The UI should **not expose the underlying provider architecture unless necessary**.

For example, the user should generally not have to choose:

```text
Method → Rail → Provider → Channel
```

Instead:

```text
Customer chooses
      ↓
Simple payment method
      ↓
Platform resolves eligible configuration
      ↓
ENG-006 executes
```

---

# 22. Provider-Agnostic Requirement

This is the most important addition I would make to your original specification.

### Mandatory architectural acceptance test

The implementation shall be demonstrably provider-agnostic.

For example, if a new configured provider is introduced:

```text
Provider X
Rail Y
Channel Z
```

IP-02 shall be able to use it through ENG-006 **without modifying payment business logic**.

Therefore the following are prohibited in IP-02:

```text
if provider === "SAFARICOM"
if method === "MPESA"
if rail === "RTGS"
if provider === "EQUITY"
if channel === "STK_PUSH"
```

Provider-specific behavior belongs in **ENG-006 adapters/configuration**.

---

# 23. Out of Scope Verification

Cursor must not implement:

* IP-03 split/allocation;
* IP-04 invoices/credit;
* IP-05 receipts;
* IP-06 refunds/reversals;
* IP-07 settlement;
* IP-08 exception operations;
* BP-008 inventory;
* collections;
* reconciliation;
* eTIMS;
* direct provider APIs;
* provider SDKs.

---

# 24. Recommended corrections to your original IP-02

I would specifically change these parts of the original:

### ❌ Original

> Customer chooses M-Pesa → platform resolves Safaricom + STK Push

### ✅ Replace with

> Customer selects a configured payment method. IP-02 resolves an eligible rail/provider/channel through IP-01 configuration and ENG-006 capabilities.

---

### ❌ Original

> STK Push, PayBill acknowledgement, card session

### ✅ Replace with

> Channel-specific payment initiation supported through configured ENG-006 capabilities.

Those are **examples**, not architectural requirements.

---

### ❌ Original

> If initiation amount exceeds published channel limit → do not initiate

### ✅ Keep, but clarify:

> If the applicable provider/channel limit supplied by ENG-006 is known and the requested amount exceeds that limit, IP-02 shall not initiate the transaction. IP-02 shall not define or hard-code provider limits.

---

### One additional requirement I strongly recommend

Add this to the BRD:

> **IP-02 shall distinguish between “payment initiation accepted”, “payment pending”, and “payment successful”. A payment shall only be marked SUCCESSFUL based on an authoritative successful outcome from the applicable payment source or an authorized manual-capture process.**

That rule is fundamental. It prevents the classic banking error of treating **“we sent the payment request”** as **“the customer has paid.”**



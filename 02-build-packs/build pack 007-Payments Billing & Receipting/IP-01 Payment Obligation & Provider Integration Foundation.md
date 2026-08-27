# BP-007 IP-01 — Payment Obligation & Provider Integration Foundation

**Build Pack:** BP-007 – Payments, Billing & Receipting
**Implementation Package:** IP-01
**Priority:** Critical
**Status:** Implemented
**Depends On:** BP-001, BP-002, BP-006 IP-05, ENG-006, ENG-003e, ENG-003a
**Scope Coverage:** SC-001, SC-002, SC-003, SC-004, SC-016

---

## 1. Objective

Establish the foundational payment capability for BP-007 by:

* creating a **Payment Obligation** from the BP-006 payment-ready contract;
* maintaining independent **Payment Method, Payment Rail/Network, Payment Provider and Payment Channel** catalogues;
* consuming provider capabilities and applicable limits through **ENG-006**;
* establishing the normalized provider-integration contract for subsequent payment IPs;
* establishing payment status, currency, provider-reference and idempotency foundations;
* enforcing tenant isolation and provenance.

**IP-01 does not execute payments.**

---

# 2. Business Problem

Without a common payment foundation:

* payment options can become hard-coded into individual journeys;
* payment method, rail, provider and channel can become incorrectly conflated;
* different payment IPs can implement different provider assumptions;
* payment amounts may be recalculated instead of consuming the approved commercial amount;
* provider-specific integrations can leak into business modules;
* future providers and payment channels become expensive to introduce.

IP-01 establishes a **provider-agnostic payment foundation** that later payment IPs consume.

---

# 3. Architectural Principle

> **BP-007 is a business payment, billing and receipting capability. It is not a payment processor, payment switch, payment network or payment service provider.**

External payment execution is owned by **ENG-006 Payment Engine**, using the enterprise integration capabilities provided by **ENG-003e**.

Therefore:

```text
BP-007
Business Payment Capability
        │
        ▼
ENG-006
Payment Engine
        │
        ▼
ENG-003e
Integration / Provider Connectivity
        │
        ▼
External Provider
```

BP-007 modules **must not directly call external payment providers**.

---

# 4. Four-Dimension Payment Model

The system shall maintain four independent concepts.

| Dimension                  | Definition                                               | Example                                       |
| -------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| **Payment Method**         | How the customer pays                                    | Mobile Money, Card, Bank, Cash                |
| **Payment Rail / Network** | Network through which the payment is carried             | Mobile-money network, card network, RTGS      |
| **Payment Provider**       | External provider through which the payment is processed | Bank, mobile-money provider, payment provider |
| **Payment Channel**        | How the customer initiates the payment                   | STK, POS, App, Internet Banking               |

### Mandatory rule

> A payment method, rail, provider and channel shall be represented as separate configurable concepts and shall not be collapsed into a single payment-method value.

### Important

Specific providers, banks, networks and channels appearing in examples or seed data are **configuration data only**.

They shall **not be hard-coded into business logic, validation rules or UI logic**.

---

# 5. Scope

## 5.1 Included

### A. Payment Obligation

The system shall:

* create a payment obligation from a valid BP-006 payment-ready contract;
* retain the originating order and commercial contract references;
* copy the amount due from the contract;
* retain currency from the contract;
* initialize paid amount to zero;
* calculate initial outstanding amount as amount due;
* assign a unique payment-obligation reference;
* establish initial payment status;
* retain provenance to the originating contract.

---

### B. Payment Method Catalogue

The system shall maintain configurable payment methods.

Examples may include:

* Cash
* Mobile Money
* Bank
* Card
* Wallet

These are **illustrative configuration examples**, not hard-coded system values.

Each method shall support:

* unique code;
* name/label;
* description where required;
* active/inactive status;
* ordering/display priority where required;
* applicable business/tenant scope where required.

---

### C. Payment Rail / Network Catalogue

The system shall maintain configurable payment rails/networks.

A rail shall support:

* unique code;
* name;
* description;
* active/inactive status;
* supported methods where applicable.

A rail shall not be assumed to belong to a particular provider.

---

### D. Payment Provider Catalogue

The system shall maintain configurable payment providers/integration participants.

A provider shall support:

* unique code;
* name;
* active/inactive status;
* applicable integration reference;
* supported currencies where applicable;
* supported capabilities where supplied by ENG-006.

Provider identity shall not be hard-coded in application logic.

---

### E. Payment Channel Catalogue

The system shall maintain configurable payment channels.

Examples may include:

* Mobile application;
* POS;
* USSD;
* payment prompt;
* internet banking;
* branch;
* API.

Channels shall be configurable and associated with valid method/rail/provider combinations.

---

### F. Provider Capabilities

IP-01 shall consume provider capability information exposed by ENG-006.

Capabilities may include:

* supported payment methods;
* supported rails;
* supported channels;
* supported currencies;
* transaction limits;
* payment initiation capabilities;
* status-query capability;
* refund capability.

BP-007 shall **consume** this information; it shall not implement provider capability logic itself.

---

### G. Provider Limits

Where ENG-006 exposes provider limits, IP-01 shall make the applicable limit information available to subsequent payment journeys.

The platform shall:

* consume provider limits;
* enforce applicable limits when supplied;
* avoid hard-coding provider limits;
* avoid overriding provider limits;
* treat the external provider as authoritative at execution time.

Where a provider does not expose a limit in advance, the platform shall not invent one.

---

### H. Provider Integration Contract

IP-01 shall establish the contract through which BP-007 communicates with ENG-006.

Conceptually:

```text
getEligiblePaymentOptions(...)
getProviderCapabilities(...)
getLimits(...)
initiatePayment(...)       → IP-02
queryPayment(...)          → IP-02 / IP-08
refundPayment(...)         → IP-06
```

Only applicable operations shall be implemented in each subsequent IP.

IP-01 does not execute the operations.

---

### I. Idempotency Foundation

The system shall establish an idempotency mechanism for payment operations.

The foundation shall support:

* unique idempotency key;
* business/tenant scope;
* operation context;
* prevention of accidental duplicate payment operations.

The mechanism shall be reusable by IP-02 and later payment IPs.

---

### J. Payment Status Foundation

The payment domain shall establish an initial payment status.

At IP-01 creation:

```text
NOT_STARTED
```

Later IPs may introduce:

```text
INITIATED
PENDING
SUCCESSFUL
FAILED
EXPIRED
CANCELLED
REVERSED
REFUNDED
```

IP-01 shall **not implement the payment execution lifecycle**.

---

### K. Tenant Isolation

All payment obligations and catalogue access subject to business configuration shall respect the authenticated `businessId`.

Cross-business access shall fail closed.

---

# 6. Excluded from IP-01

| Capability                   | Owner                      |
| ---------------------------- | -------------------------- |
| Payment initiation           | IP-02                      |
| STK/payment prompts          | IP-02                      |
| Provider callbacks/webhooks  | IP-02                      |
| Payment status processing    | IP-02                      |
| Partial payments             | IP-03                      |
| Split payments               | IP-03                      |
| Payment allocation           | IP-03                      |
| Invoices                     | IP-04                      |
| Credit sales                 | IP-04                      |
| Receipts                     | IP-05                      |
| Refunds                      | IP-06                      |
| Reversals                    | IP-06                      |
| Settlement                   | IP-07                      |
| Reconciliation               | ENG-008                    |
| Payment exception operations | IP-08                      |
| Collections                  | Future capability / SC-032 |
| Inventory                    | BP-008                     |
| eTIMS                        | Separate capability        |
| Direct provider API calls    | ENG-006 / ENG-003e         |

---

# 7. Business Requirements

| ID         | Business Requirement                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| **BR-001** | A Payment Obligation shall only be created from a valid BP-006 payment-ready contract.                            |
| **BR-002** | The Payment Obligation amount due shall be copied from the originating payment-ready contract.                    |
| **BR-003** | BP-007 shall not recalculate the commercial amount, price, tax or payable amount from sales-order data.           |
| **BR-004** | Payment Method, Rail/Network, Provider and Channel shall be maintained as independent concepts.                   |
| **BR-005** | Payment configuration shall be data-driven and shall not depend on hard-coded provider names or payment networks. |
| **BR-006** | Provider capabilities and applicable limits shall be consumed through ENG-006.                                    |
| **BR-007** | BP-007 shall not directly integrate with external payment providers.                                              |
| **BR-008** | A payment obligation shall retain provenance to its originating commercial/payment-ready contract.                |
| **BR-009** | Payment obligations shall be isolated by business/tenant.                                                         |
| **BR-010** | Credit sales shall be treated as a billing policy and shall not be represented as a payment method.               |
| **BR-011** | Provider limits shall not be invented, hard-coded or overridden by BP-007.                                        |
| **BR-012** | The Payment Obligation shall remain consistent with the originating payment-ready contract.                       |
| **BR-013** | Provider-specific implementation details shall remain within the payment/integration engine layer.                |
| **BR-014** | IP-01 shall establish reusable payment-operation idempotency controls.                                            |

---

# 8. Functional Requirements

| ID         | Functional Requirement                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-001** | Create a Payment Obligation from a valid BP-006 payment-ready contract.                                                                |
| **FR-002** | Reject creation where the payment-ready contract is missing, invalid, expired, belongs to another business or has no valid amount due. |
| **FR-003** | Store amount due, paid amount and outstanding amount for the obligation.                                                               |
| **FR-004** | Initialize a newly created obligation with `paid = 0` and `outstanding = amount due`.                                                  |
| **FR-005** | Store the originating business, customer, order and commercial/payment contract references.                                            |
| **FR-006** | Store the contract currency as the payment-obligation currency.                                                                        |
| **FR-007** | Prevent BP-007 from recalculating the amount due from order lines.                                                                     |
| **FR-008** | Maintain independent Payment Method, Rail, Provider and Channel catalogues.                                                            |
| **FR-009** | Enforce unique catalogue codes within the applicable scope.                                                                            |
| **FR-010** | Inactive catalogue records shall not be offered as active payment options.                                                             |
| **FR-011** | Store provider capability and limit metadata supplied by ENG-006 where applicable.                                                     |
| **FR-012** | Expose eligible payment-option information to subsequent payment journeys through the payment-engine contract.                         |
| **FR-013** | Establish a reusable provider-integration port consumed by BP-007.                                                                     |
| **FR-014** | Prevent BP-007 modules from importing provider SDKs or implementing direct provider HTTP calls.                                        |
| **FR-015** | Generate and persist an idempotency key for payment operations requiring one.                                                          |
| **FR-016** | Establish `NOT_STARTED` as the initial payment status.                                                                                 |
| **FR-017** | Store provider transaction reference as nullable until an external payment operation occurs.                                           |
| **FR-018** | Enforce business/tenant isolation on payment obligations and applicable catalogue configuration.                                       |
| **FR-019** | Support configurable method enablement derived from BP-001 coarse payment flags.                                                       |
| **FR-020** | Ensure BP-001 payment flags do not replace the detailed payment catalogues.                                                            |
| **FR-021** | Ensure `creditSalesEnabled` is treated as a business policy and is not exposed as a tender/payment method.                             |
| **FR-022** | Record material creation and configuration changes through the applicable audit mechanism.                                             |
| **FR-023** | Preserve payment-obligation provenance for downstream payment IPs.                                                                     |
| **FR-024** | Reject cross-business access to payment obligations.                                                                                   |

---

# 9. Business Rules

| ID          | Rule                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **BRU-001** | No Payment Obligation may exist without a valid originating payment-ready contract.                                             |
| **BRU-002** | Amount Due must equal the amount provided by the originating contract.                                                          |
| **BRU-003** | BP-007 shall never silently invent a payment amount.                                                                            |
| **BRU-004** | BP-007 shall not recalculate commercial pricing or taxation.                                                                    |
| **BRU-005** | A Payment Method may exist without a Rail where the method supports manual capture, subject to configuration.                   |
| **BRU-006** | A payment option requiring a rail shall not be usable without a valid configured rail.                                          |
| **BRU-007** | A Provider may participate in multiple rails.                                                                                   |
| **BRU-008** | Provider participation on different rails shall be represented as distinct configuration where required by the catalogue model. |
| **BRU-009** | Inactive methods, rails, providers and channels shall not be offered for new transactions.                                      |
| **BRU-010** | Provider limits supplied through ENG-006 shall be respected.                                                                    |
| **BRU-011** | Provider limits shall not be hard-coded as platform business rules.                                                             |
| **BRU-012** | External providers remain authoritative for acceptance/rejection of actual transactions.                                        |
| **BRU-013** | Credit sales shall not be represented as a payment method.                                                                      |
| **BRU-014** | Payment status shall be independent from settlement status.                                                                     |
| **BRU-015** | Payment-obligation provenance shall not be removable from the obligation record.                                                |
| **BRU-016** | Cross-tenant payment-obligation access shall fail closed.                                                                       |

---

# 10. Integration Requirements

| System           | Integration                                                         |
| ---------------- | ------------------------------------------------------------------- |
| **BP-006 IP-05** | Consume payment-ready commercial contract                           |
| **BP-001**       | Consume coarse payment-method enablement flags                      |
| **ENG-006**      | Consume payment-provider capabilities and integration services      |
| **ENG-003e**     | Provider credentials, connector framework, retries and connectivity |
| **ENG-003a**     | Applicable security/identity controls                               |
| **ENG-008**      | Later settlement/reconciliation handoff                             |
| **BP-007 IP-02** | Consume IP-01 payment foundation                                    |
| **BP-007 IP-03** | Consume payment obligation for allocation                           |
| **BP-007 IP-04** | Consume payment obligation for billing                              |
| **BP-007 IP-05** | Consume successful payment information for receipting               |

---

# 11. Payment-Ready Contract

IP-01 shall consume, at minimum:

| Field                        | Purpose                   |
| ---------------------------- | ------------------------- |
| `businessId`                 | Tenant                    |
| `orderId`                    | Originating sale          |
| `orderNumber`                | Business reference        |
| `customerId`                 | Customer                  |
| `currency`                   | Payment currency          |
| `expectedAmount / amountDue` | Payment obligation        |
| `commercialContractId`       | Commercial provenance     |
| `paymentReadyContractId`     | Contract provenance       |
| `lineBreakdown`              | Downstream reference only |
| `financialInstructionType`   | Transaction type          |

### Mandatory rule

The line breakdown may be copied for provenance, but **must not be used to recalculate the payment amount**.

---

# 12. Fail-Closed Conditions

Payment-obligation creation shall fail when:

* payment-ready contract does not exist;
* contract is expired;
* contract belongs to another business;
* contract is invalid;
* amount due is null;
* currency is missing;
* required provenance is missing;
* contract is not eligible for payment;
* contract has already been consumed where single consumption is required.

The system shall provide a meaningful business error and shall not create a partial obligation.

---

# 13. Acceptance Criteria

| ID         | Acceptance Criterion                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **AC-001** | A valid BP-006 payment-ready contract for KES 10,000 creates an obligation with amount due = 10,000, paid = 0 and outstanding = 10,000. |
| **AC-002** | The created obligation retains the originating order and payment-ready contract references.                                             |
| **AC-003** | A missing payment-ready contract fails without creating an obligation.                                                                  |
| **AC-004** | A tampered, expired or cross-business contract fails without creating an obligation.                                                    |
| **AC-005** | The amount stored on the obligation exactly matches the payment-ready contract amount.                                                  |
| **AC-006** | Changing order-line values after obligation creation cannot silently recalculate the obligation amount.                                 |
| **AC-007** | Payment Method, Rail, Provider and Channel exist as independent catalogues.                                                             |
| **AC-008** | Catalogue codes are unique within their applicable scope.                                                                               |
| **AC-009** | Inactive catalogue records cannot be selected as active payment options.                                                                |
| **AC-010** | A configured payment method that does not require a rail can operate without one.                                                       |
| **AC-011** | A payment method requiring a rail cannot be used without an appropriate configured rail.                                                |
| **AC-012** | Provider capability and limit information supplied by ENG-006 can be consumed without hard-coded provider assumptions.                  |
| **AC-013** | No provider transaction limit is hard-coded into BP-007 business logic.                                                                 |
| **AC-014** | No provider SDK or direct external payment HTTP client exists in BP-007 modules.                                                        |
| **AC-015** | `creditSalesEnabled` does not appear as a selectable payment method.                                                                    |
| **AC-016** | A newly created obligation has payment status `NOT_STARTED`.                                                                            |
| **AC-017** | Provider transaction reference remains empty/null before payment initiation.                                                            |
| **AC-018** | Idempotency foundation prevents duplicate processing of the same operation key.                                                         |
| **AC-019** | Cross-business access to an obligation fails closed.                                                                                    |
| **AC-020** | Initial catalogue data can be changed/extended through configuration or seed data without modifying business logic.                     |
| **AC-021** | Removing or adding a provider does not require code changes to payment-obligation logic.                                                |
| **AC-022** | Removing or adding a payment channel does not require changes to the customer payment-domain logic.                                     |
| **AC-023** | Provider-specific names, limits and channel assumptions do not appear in core payment business rules.                                   |
| **AC-024** | IP-01 does not initiate, refund, split, allocate, invoice or receipt any payment.                                                       |

---

# 14. Non-Functional Requirements

| ID          | Requirement                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| **NFR-001** | All payment-obligation reads/writes shall enforce tenant isolation.                                         |
| **NFR-002** | Payment-obligation creation shall be idempotent where the originating contract requires single consumption. |
| **NFR-003** | Material payment-domain changes shall be auditable.                                                         |
| **NFR-004** | Provider-specific integration logic shall remain outside BP-007 modules.                                    |
| **NFR-005** | Catalogue changes shall not require source-code changes.                                                    |
| **NFR-006** | Payment information shall be protected according to applicable platform security controls.                  |
| **NFR-007** | Provider credentials/secrets shall never be stored in BP-007 business modules.                              |

---

# 15. Seed / Configuration Requirements

This is where I would make your concern **very explicit**.

> **Provider, rail, method and channel examples are configuration/seed data and shall not be hard-coded in application logic.**

Initial deployment may contain whatever payment options are approved for the target market, but:

```text
Code
  ≠
Provider catalogue
```

For example, the system should be capable of supporting:

```text
Payment Method A
   ↓
Rail B
   ↓
Provider C
   ↓
Channel D
```

without changing TypeScript/JavaScript business logic.

Adding:

```text
Provider X
```

should be a **configuration/seed change**, not a code change.

---

# 16. Out of Scope Verification

The Cursor implementation must explicitly verify that it has **not implemented**:

* external payment calls;
* provider SDKs;
* payment initiation;
* payment callbacks;
* split payments;
* allocation;
* invoices;
* credit-sale processing;
* receipts;
* refunds;
* settlement;
* reconciliation;
* collections;
* eTIMS.

---

## Final IP-01 boundary

The clean mental model is:

```text
              BP-006
        Confirmed Sale
              │
              ▼
     Payment-Ready Contract
              │
              ▼
        ┌─────────────┐
        │ BP-007 IP-01│
        │             │
        │ Obligation  │
        │             │
        │ Method      │
        │ Rail        │
        │ Provider    │
        │ Channel     │
        │ Capabilities│
        │ Limits      │
        │ Idempotency │
        └──────┬──────┘
               │
               ▼
          ENG-006
       Payment Engine
               │
               ▼
      External Provider
```

**The key architectural rule is:** IP-01 defines the **business payment foundation and the integration contract**; it does **not** become the payment engine itself, and it does **not hard-code any particular provider, rail, channel, or provider limit.**


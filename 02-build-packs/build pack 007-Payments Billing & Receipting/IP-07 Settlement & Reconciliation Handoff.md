BP-007 IP-07 — Settlement & Reconciliation Handoff
BRD / Requirements Specification
Attribute	Description
Implementation Package	IP-07
Build Pack	BP-007 – Payments, Billing & Receipting
Priority	High
Status	Implemented
Depends On	IP-02, IP-06 where applicable, ENG-006
Downstream Consumer	ENG-008
Scope Coverage	SC-014
Related Pack FRs	FR-019, FR-020

1. Objective

Provide a controlled settlement tracking and reconciliation handoff foundation for successful payments.

IP-07 shall distinguish:

Payment successful ≠ Funds settled

The payment lifecycle confirms that the payment provider accepted/processed the customer payment.

The settlement lifecycle confirms whether the corresponding funds have subsequently been settled to the business.

Customer Payment
       ↓
Payment SUCCESSFUL
       ↓
Settlement PENDING
       ↓
Provider Settlement
       ↓
Settlement RECEIVED
       ↓
Settlement CONFIRMED

IP-07 provides settlement information and prepares data for ENG-008 reconciliation.

It does not perform reconciliation itself.

1. Core Principle

The following states must remain independent:

PAYMENT STATUS
        +
SETTLEMENT STATUS

Example:

Payment Status       = SUCCESSFUL
Settlement Status    = PENDING

This is a valid state.

The system must never automatically interpret:

SUCCESSFUL payment

as:

SETTLED funds
3. Business Problem

A customer may successfully pay KES 10,000 through M-Pesa/card/bank, while the provider settles funds to the business later.

If the platform treats payment success as settlement:

revenue reporting may be overstated;
settlement delays cannot be identified;
provider settlement discrepancies cannot be isolated;
reconciliation becomes unreliable.

IP-07 therefore establishes the settlement lifecycle while leaving matching and exception resolution to ENG-008.

1. Scope

4.1 Included
A. Settlement Status

Support settlement states such as:

NOT_APPLICABLE
PENDING
RECEIVED
CONFIRMED
EXCEPTION

The exact provider behaviour must be configuration/adapter driven.

B. Settlement Reference

Store settlement information supplied by the provider/engine, including where available:

settlement reference;
provider transaction reference;
settlement batch/reference;
settlement date/time;
settlement amount;
settlement currency;
provider;
channel;
rail.
C. Expected Settlement

Track the amount that the payment system expects to be settled.

For example:

Payment successful       KES 10,000
Expected settlement      KES 10,000

This is not the BP-005 commercial expected amount.

The distinction is:

Concept	Owner
Commercial amount due	BP-005 / BP-006
Customer payment	BP-007
Expected settlement	IP-07
Actual provider settlement	IP-07 / ENG-006
Reconciliation/matching	ENG-008
5. Settlement Amount

Where provider settlement information is available, IP-07 shall capture:

Expected Settlement Amount
Actual Settlement Amount
Settlement Variance

Conceptually:

# Settlement Variance

Actual Settlement Amount
−
Expected Settlement Amount

Example:

Expected settlement     10,000
Actual settlement         9,850
                         ------
Variance                  -150

The variance should be flagged, not automatically resolved by IP-07.

1. Provider Settlement Information

Settlement information shall be consumed through the payment engine.

Provider
   ↓
ENG-006 adapter
   ↓
Settlement information
   ↓
IP-07

BP-007 must not directly integrate with:

Safaricom;
Airtel;
banks;
card networks;
acquirers;
other providers.

Provider-specific implementation remains in ENG-006.

1. Provider Capability

Not all payment providers/channels necessarily expose settlement information in the same way.

Therefore the platform must support:

Settlement capability = SUPPORTED
Settlement capability = NOT_SUPPORTED
Settlement capability = NOT_APPLICABLE

Do not assume every payment transaction will have a provider settlement reference.

For example:

CASH
Settlement = NOT_APPLICABLE

while an electronic payment may be:

M-Pesa
Settlement = PENDING
8. Settlement Lifecycle

Recommended lifecycle:

NOT_APPLICABLE

or:

PENDING
   ↓
RECEIVED
   ↓
CONFIRMED

With an exception path:

PENDING
   ↓
EXCEPTION

or:

RECEIVED
   ↓
EXCEPTION

depending on where the discrepancy is detected.

Meaning
Status	Meaning
NOT_APPLICABLE	Settlement does not apply to the payment
PENDING	Payment succeeded but settlement has not yet been confirmed
RECEIVED	Provider settlement information/funds have been received
CONFIRMED	Settlement has passed the applicable confirmation/handoff condition
EXCEPTION	Settlement requires downstream investigation/reconciliation
9. Settlement vs Reconciliation

This distinction should be locked.

IP-07 owns:

What settlement information do we know?

ENG-008 owns:

Does the settlement match the expected external/internal records?

Therefore:

IP-07
Payment
  ↓
Settlement information
  ↓
Handoff
  ↓
ENG-008
  ↓
Matching
  ↓
Exception / Reconciled

IP-07 must not implement:

bank statement matching;
M-Pesa statement matching;
settlement file matching;
cashbook reconciliation;
GL reconciliation;
automated exception resolution.
10. Settlement Batch

Where a provider settles multiple payments together, IP-07 should support a settlement batch/reference.

Example:

Settlement Batch ST-001

Payment 001     5,000
Payment 002     7,000
Payment 003     8,000
                ------
Expected        20,000

Provider settlement:

Batch ST-001
Actual          19,850
Variance          -150

IP-07 records this information and exposes it for ENG-008.

It does not perform the batch matching itself.

1. Transaction-to-Settlement Relationship

Where the provider supplies the information, the system should support:

Payment
   │
   └── Settlement
          │
          └── Settlement Batch

This allows downstream reconciliation to trace:

Order
 ↓
Payment
 ↓
Provider Reference
 ↓
Settlement
 ↓
Settlement Batch
12. Settlement Reference

Provider references must be preserved rather than replaced by an internally generated identifier.

The platform may have its own settlement ID:

Internal Settlement ID

but should also retain:

Provider Settlement Reference
Provider Transaction Reference
Provider Batch Reference

These are critical for downstream reconciliation and investigation.

1. Settlement Currency

Settlement currency shall be explicitly captured.

Where:

Payment Currency = KES
Settlement Currency = KES

this is straightforward.

Where provider capabilities allow different currencies, IP-07 must not silently assume that payment and settlement currency are identical.

Currency conversion is outside this IP unless an existing engine explicitly provides the applicable conversion information.

1. Settlement Date

Capture both where available:

provider settlement date/time;
platform receipt/recording date/time.

This provides an audit trail for settlement delays.

Example:

Payment successful:
25 Aug 2026 10:15

Settlement received:
26 Aug 2026 02:30
15. Settlement Delay

The system should expose settlement ageing information where useful:

Payment Successful
        ↓
Settlement Pending
        ↓
Elapsed settlement time

This supports operational monitoring.

However, IP-07 should not become a collections/dunning engine.

1. Handoff to ENG-008

IP-07 shall expose a standard reconciliation payload.

Minimum payload:

Field	Purpose
businessId	Tenant
paymentId	Internal payment
obligationId	Payment obligation
orderId	Originating order
customerId	Customer
paymentAmount	Successful payment
currency	Payment currency
paymentStatus	Payment status
settlementStatus	Settlement status
expectedSettlementAmount	Expected provider settlement
actualSettlementAmount	Actual settlement where available
settlementVariance	Difference where calculable
providerId	Provider
paymentRail	Rail
paymentChannel	Channel
providerTransactionReference	Provider transaction
settlementReference	Provider settlement reference
settlementBatchReference	Provider batch
paymentDateTime	Payment event
settlementDateTime	Settlement event
businessId	Tenant isolation
17. Idempotency

Settlement updates must be idempotent.

The same provider settlement event must not create duplicate settlement records.

For example:

Settlement Reference = SETTLE-12345

received twice must result in:

ONE settlement event

not two.

1. Corrections

Settlement information must not be overwritten without an audit trail.

If a provider sends a correction:

Settlement A
      ↓
Correction
      ↓
Settlement B

the system should preserve the history of the material change.

1. Cash

Cash does not necessarily have a provider settlement event.

Configuration may therefore determine:

CASH
Settlement = NOT_APPLICABLE

or:

CASH
Settlement = IMMEDIATE

This must be configuration-driven rather than hard-coded.

Cashbook/till balancing remains outside IP-07.

1. Business Requirements

ID	Requirement
BR-001	Payment status and settlement status shall be maintained independently.
BR-002	A SUCCESSFUL payment may remain in SETTLEMENT PENDING.
BR-003	IP-07 shall track settlement information provided by the payment engine/provider.
BR-004	Settlement references shall be retained where provided.
BR-005	Settlement batch references shall be supported where providers settle transactions in batches.
BR-006	Expected and actual settlement amounts shall be distinguishable.
BR-007	Settlement variance shall be identifiable where expected and actual amounts are available.
BR-008	Settlement information shall be available to ENG-008 for reconciliation.
BR-009	IP-07 shall not perform bank/M-Pesa/card statement matching.
BR-010	Provider integrations shall occur through ENG-006.
BR-011	Provider-specific settlement behaviour shall not be hard-coded in BP-007.
BR-012	Payments without applicable settlement shall be supported.
BR-013	Settlement updates shall be idempotent.
BR-014	Settlement changes shall be auditable.
BR-015	Settlement information shall maintain tenant isolation.
21. Functional Requirements
ID	Functional Requirement
FR-001	Maintain settlement status independently from payment status.
FR-002	Create settlement tracking information for eligible successful payments.
FR-003	Store provider settlement reference.
FR-004	Store provider transaction reference.
FR-005	Store settlement batch/reference where provided.
FR-006	Store expected settlement amount.
FR-007	Store actual settlement amount where supplied.
FR-008	Calculate settlement variance where both amounts are available.
FR-009	Support settlement statuses PENDING, RECEIVED, CONFIRMED, EXCEPTION and NOT_APPLICABLE as applicable.
FR-010	Record settlement date/time.
FR-011	Support settlement capability metadata from ENG-006.
FR-012	Prevent duplicate settlement events.
FR-013	Preserve settlement history for material changes.
FR-014	Generate reconciliation handoff payload for ENG-008.
FR-015	Expose payment-to-settlement relationship.
FR-016	Expose settlement-batch-to-payment relationships where available.
FR-017	Support non-settling payment methods such as configured cash.
FR-018	Maintain settlement currency.
FR-019	Maintain settlement and payment timestamps separately.
FR-020	Enforce cross-business access control.
22. Business Rules
ID	Rule
BRU-001	SUCCESSFUL payment does not automatically mean SETTLED.
BRU-002	Settlement status cannot change payment status.
BRU-003	Settlement confirmation cannot change the original payment amount.
BRU-004	Provider settlement references must be preserved where available.
BRU-005	Duplicate settlement events must be idempotently handled.
BRU-006	Expected settlement is not the same as commercial amount due.
BRU-007	Actual settlement must not be invented when the provider has not supplied it.
BRU-008	Settlement variance must be flagged, not silently corrected.
BRU-009	IP-07 does not resolve reconciliation exceptions.
BRU-010	Provider-specific settlement rules belong in ENG-006/configuration.
BRU-011	Bank statement and provider statement matching belong to ENG-008.
BRU-012	Cash settlement treatment is configuration-driven.
BRU-013	Settlement events are auditable.
BRU-014	Cross-tenant settlement access fails closed.
23. Acceptance Criteria
ID	Acceptance Criterion
AC-001	A successful electronic payment can remain SETTLEMENT PENDING.
AC-002	Settlement confirmation does not change payment status from SUCCESSFUL.
AC-003	Provider settlement reference is retained when supplied.
AC-004	Provider transaction reference remains linked to the settlement.
AC-005	Settlement batch reference can group multiple payments where supplied.
AC-006	Expected settlement and actual settlement amounts are stored separately.
AC-007	A settlement variance can be identified where actual and expected amounts differ.
AC-008	IP-07 does not automatically resolve a settlement variance.
AC-009	Duplicate provider settlement events do not create duplicate settlement records.
AC-010	Settlement information can be handed to ENG-008 using the defined payload.
AC-011	No bank/M-Pesa/card statement matching exists in BP-007 IP-07.
AC-012	No direct provider API exists in BP-007 modules.
AC-013	Provider-specific settlement rules are not hard-coded.
AC-014	Cash can be configured as settlement NOT_APPLICABLE or immediate.
AC-015	Settlement date/time is recorded separately from payment date/time.
AC-016	Material settlement changes are auditable.
AC-017	Cross-business settlement access fails.
24. Example
Successful payment but not yet settled
Order                  KES 10,000
Payment                KES 10,000
Payment Status         SUCCESSFUL
Settlement Status      PENDING

This is completely valid.

Later:

Provider Settlement
Reference              SET-98765
Amount                  KES 9,850

IP-07 records:

Expected Settlement     KES 10,000
Actual Settlement        KES 9,850
Variance                  KES -150
Settlement Status       RECEIVED / EXCEPTION

It then hands the information to:

ENG-008
   ↓
Reconciliation
   ↓
Investigate KES 150 variance

IP-07 does not decide why the KES 150 is missing.

1. Architecture Boundary

The locked architecture should be:

```
             IP-02
         Payment SUCCESSFUL
                │
                ▼
             IP-07
      Settlement Tracking
                │
         ┌──────┴──────┐
         ▼             ▼
      ENG-006       Settlement
      Adapter        Metadata
         │
         ▼
      Provider
         │
         ▼
   Settlement Event
         │
         ▼
      IP-07
         │
         ▼
Reconciliation Handoff
         │
         ▼
      ENG-008
         │
   ┌─────┴─────┐
   ▼           ▼
```

   Matched      Exception
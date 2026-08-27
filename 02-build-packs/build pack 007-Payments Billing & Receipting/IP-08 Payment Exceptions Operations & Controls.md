BP-007 IP-08 — Payment Exceptions, Operations & Controls
BRD / Requirements Specification
Attribute	Description
Implementation Package	IP-08
Build Pack	BP-007 – Payments, Billing & Receipting
Priority	High
Status	Implemented
Depends On	IP-02–IP-07, ENG-005, ENG-006, ENG-013, ENG-003e
Scope Coverage	SC-015, SC-016
Related Pack FRs	FR-021–FR-023
1. Objective

Provide a controlled operational capability for payment situations that cannot safely progress through the normal automated payment lifecycle.

IP-08 shall provide:

exception identification;
pending/unknown monitoring;
provider status investigation;
callback validation;
duplicate detection;
payment mismatch handling;
controlled manual resolution;
safe retry controls;
operational audit;
visibility of provider/connector health.

IP-08 is cross-cutting across BP-007, not simply a final transaction step.

IP-02 Payment
      ↓
IP-03 Allocation
      ↓
IP-04 Billing
      ↓
IP-05 Receipt
      ↓
IP-06 Refund
      ↓
IP-07 Settlement
      ↓
      └─────────────┐
                    ▼
                  IP-08
             Exception / Control
2. Core Principle

The most important rule is:

When the external payment outcome is unknown, the platform must preserve the uncertainty rather than inventing a result.

Therefore:

Situation	Platform Treatment
Provider confirms success	SUCCESSFUL
Provider confirms failure	FAILED
Provider confirms expiry	EXPIRED
No response	PENDING / UNKNOWN
Conflicting callback	EXCEPTION
Amount mismatch	EXCEPTION
Currency mismatch	EXCEPTION
Obligation mismatch	EXCEPTION
Duplicate provider reference	Existing transaction / exception
Unknown provider outcome	Do not initiate another payment automatically
3. Business Problem

Electronic payment failures are not always actual payment failures.

For example:

Customer
   ↓
STK Push
   ↓
Customer approves
   ↓
Provider processes payment
   ↓
Callback never reaches platform

The platform sees:

NO CALLBACK

It therefore cannot safely conclude:

PAYMENT FAILED

If it automatically initiates another STK:

STK #1 → possibly SUCCESSFUL
STK #2 → SUCCESSFUL

the customer could be charged twice.

IP-08 therefore provides the operational controls required to resolve uncertainty safely.

4. Scope
4.1 Included
A. Pending Payment Monitoring

Identify payments that remain:

INITIATED
PENDING

beyond their configured expected response period.

Monitoring thresholds shall be configuration/provider driven.

B. Unknown Payment Outcome

Where the platform cannot establish the provider outcome:

Payment = UNKNOWN

or an equivalent exception state may be used where required.

The system must not convert UNKNOWN automatically to FAILED.

C. Provider Status Query

Where supported:

IP-08
   ↓
ENG-006
   ↓
Provider Adapter
   ↓
Query provider

Possible response:

SUCCESSFUL
FAILED
EXPIRED
UNKNOWN

The provider adapter remains responsible for provider-specific implementation.

D. Callback Validation

Validate incoming provider outcomes against the original payment initiation.

At minimum:

payment reference;
provider transaction reference;
amount;
currency;
obligation;
business/tenant;
payment status.
5. Callback Mismatch

A callback must not be accepted simply because the provider reference exists.

Example:

Initiated:
KES 10,000

Callback:
KES 8,000

Result:

EXCEPTION

Not:

SUCCESSFUL

Similarly:

Initiated currency = KES
Callback currency = USD

must fail validation.

6. Obligation Mismatch

Example:

Payment initiated for:

Order A
KES 10,000

Provider callback refers to:

Order B

The callback must not be allocated automatically.

It becomes:

EXCEPTION
7. Duplicate Provider Reference

Provider transaction references must be unique within the appropriate provider/business context.

Example:

Provider Reference = MPESA12345

received twice:

Callback 1 → SUCCESSFUL
Callback 2 → duplicate

The second callback must be handled idempotently.

It must not create another payment or another allocation.

8. Duplicate Payment vs Duplicate Callback

These are different.

Duplicate callback

Same payment:

Payment A
   ├── Callback 1
   └── Callback 2

This is normally idempotent.

Possible duplicate payment
Payment A → KES 10,000
Payment B → KES 10,000

Both may have different provider references.

This requires operational investigation and must not be automatically treated as the same payment.

IP-08 should flag the condition rather than silently merge transactions.

9. Safe Retry

Retry must be tightly controlled.

Safe case

ENG-006 confirms:

Original request was never accepted by provider

Then a retry may be allowed using the appropriate idempotency strategy.

Unsafe case

Provider outcome:

UNKNOWN

Then:

DO NOT AUTOMATICALLY RETRY

The system must first query/investigate the original transaction where possible.

10. Idempotency

IP-08 must preserve the idempotency model established in IP-01/IP-02.

A retry must never accidentally create:

Payment A
Payment B

for one logical customer action unless a new payment attempt is explicitly authorised.

A new payment attempt must have a distinct payment transaction identity while retaining linkage to the original attempt.

11. Manual Investigation Queue

IP-08 shall provide an operational queue for unresolved exceptions.

Example categories:

Exception	Example
UNKNOWN_OUTCOME	No provider response
CALLBACK_MISMATCH	Callback amount differs
CURRENCY_MISMATCH	Currency differs
OBLIGATION_MISMATCH	Wrong obligation
DUPLICATE_REFERENCE	Provider reference already exists
PROVIDER_ERROR	Provider returned unresolved error
SETTLEMENT_EXCEPTION	Settlement inconsistency
REFUND_EXCEPTION	Refund outcome unresolved
12. Exception Priority

The exception queue should support operational prioritisation.

Recommended attributes:

exception type;
severity;
payment amount;
age;
provider;
channel;
business;
current status;
assigned user;
created date/time.

This is an operations queue, not a collections queue.

13. Exception Lifecycle

Recommended:

OPEN
  ↓
INVESTIGATING
  ↓
RESOLVED

Alternative outcome:

OPEN
  ↓
INVESTIGATING
  ↓
ESCALATED

and eventually:

RESOLVED

Possible resolution classifications:

SUCCESSFUL;
FAILED;
EXPIRED;
DUPLICATE;
REJECTED;
NO_ACTION_REQUIRED.

The exact resolution codes should be configurable.

14. Manual Resolution

Manual resolution must not be equivalent to simply changing:

PENDING → SUCCESSFUL

The operator must provide:

resolution reason;
supporting reference/evidence where applicable;
actor;
timestamp;
resolution outcome.

Where SoD is configured:

Maker
  ↓
Resolution
  ↓
Checker
  ↓
Final status

A user must not approve their own resolution.

15. Manual Success

A manual SUCCESSFUL resolution must be particularly controlled.

It must not:

change the original amount due;
change commercial pricing;
invent a provider transaction reference;
bypass allocation rules;
bypass tenant isolation;
create duplicate payment.

Where there is no provider reference, the system should distinguish:

Provider-confirmed success

from:

Manually resolved success

This is important for audit and reconciliation.

16. Provider/Connector Health

IP-08 may display provider integration health obtained from:

ENG-003e;
ENG-006.

Examples:

Safaricom adapter
    HEALTHY

Bank adapter
    DEGRADED

Card adapter
    UNAVAILABLE

However:

IP-08 must consume connector health; it must not build another monitoring platform.

17. Operational Actions

The operational user may be presented with actions such as:

View Payment
Query Provider
View Callback
Investigate
Retry — if eligible
Resolve
Escalate
View Audit

The available actions must depend on the exception state.

For example:

UNKNOWN

should expose:

Query Provider
Investigate

but not:

Retry Automatically
18. Payment Status Protection

IP-08 must protect the integrity of payment states.

The system must never:

PENDING → SUCCESSFUL

without a valid provider outcome or authorised manual resolution.

It must never:

UNKNOWN → SUCCESSFUL

merely because the customer claims to have paid.

It must never:

FAILED → SUCCESSFUL

without a legitimate new provider outcome or controlled resolution.

19. Allocation Protection

An exception must not be allocated to the obligation until the payment is legitimately confirmed successful.

Example:

Payment = UNKNOWN
Amount = 10,000

Allocated = 0

not:

Allocated = 10,000

Therefore:

Unknown payments do not reduce outstanding balance.

20. Settlement Exception Boundary

IP-08 may surface settlement exceptions originating from IP-07.

However:

IP-08
   ↓
Surface / operationally manage
   ↓
ENG-008
   ↓
Reconciliation

IP-08 must not perform the actual bank/provider statement matching.

21. Audit

Every material operational action shall record:

payment ID;
obligation ID;
exception ID;
previous status;
new status;
action;
actor;
timestamp;
reason;
provider reference;
resolution reference where applicable.

ENG-013 remains the audit engine.

22. Business Requirements
ID	Requirement
BR-001	Payment exceptions shall be identified and managed through a controlled operational workflow.
BR-002	Unknown payment outcomes shall not be automatically treated as failures.
BR-003	Unknown payment outcomes shall not be automatically retried.
BR-004	Callback information shall be validated against the original payment.
BR-005	Duplicate provider references shall not create duplicate payments or allocations.
BR-006	Amount, currency and obligation mismatches shall be routed to exception handling.
BR-007	Manual payment resolution shall be controlled and auditable.
BR-008	Maker-checker shall apply to manual resolution where configured.
BR-009	Exception status shall not independently change the commercial amount due.
BR-010	Exception handling shall not bypass payment allocation controls.
BR-011	Provider investigation shall occur through ENG-006.
BR-012	Provider/connector health shall be consumed from existing engines.
BR-013	Reconciliation matching shall remain the responsibility of ENG-008.
BR-014	All material exception actions shall be auditable.
BR-015	Exception handling shall enforce tenant isolation.
23. Functional Requirements
ID	Functional Requirement
FR-001	Identify payments remaining pending beyond configured thresholds.
FR-002	Support UNKNOWN/exception handling for unresolved provider outcomes.
FR-003	Query provider status through ENG-006 where supported.
FR-004	Validate callback provider reference.
FR-005	Validate callback amount.
FR-006	Validate callback currency.
FR-007	Validate callback obligation/business association.
FR-008	Detect duplicate provider references.
FR-009	Prevent duplicate payment allocation.
FR-010	Create and manage payment exceptions.
FR-011	Provide an operational exception queue.
FR-012	Record exception classification and severity.
FR-013	Support controlled provider status investigation.
FR-014	Support safe retry where ENG-006 confirms the original request was not accepted.
FR-015	Prevent retry when original payment outcome remains unknown unless explicitly authorised under configured policy.
FR-016	Support controlled manual payment resolution.
FR-017	Support maker-checker for manual resolution where configured.
FR-018	Record resolution reason and evidence/reference.
FR-019	Consume connector health from ENG-003e/ENG-006.
FR-020	Surface settlement exceptions from IP-07 without performing reconciliation.
FR-021	Maintain full operational audit history.
FR-022	Enforce cross-business access control.
24. Business Rules
ID	Rule
BRU-001	PENDING does not mean SUCCESSFUL.
BRU-002	UNKNOWN does not mean FAILED.
BRU-003	UNKNOWN does not mean SUCCESSFUL.
BRU-004	A provider rejection must not become SUCCESSFUL.
BRU-005	Callback amount mismatch results in EXCEPTION.
BRU-006	Callback currency mismatch results in EXCEPTION.
BRU-007	Callback obligation mismatch results in EXCEPTION.
BRU-008	Duplicate provider callbacks are handled idempotently.
BRU-009	Duplicate successful payments must not be silently merged.
BRU-010	Failed or unknown payments cannot be allocated as successful payments.
BRU-011	Blind retry of UNKNOWN/PENDING payment is prohibited.
BRU-012	Retry is allowed only where the adapter confirms the original request was not accepted, or where explicit configured operational policy permits a new payment attempt after investigation.
BRU-013	A new payment attempt must have its own transaction identity.
BRU-014	Manual resolution cannot modify the commercial amount due.
BRU-015	Manual SUCCESSFUL resolution must be distinguishable from provider-confirmed success.
BRU-016	Maker cannot approve own resolution when SoD applies.
BRU-017	Provider-specific investigation remains within ENG-006.
BRU-018	Reconciliation matching remains within ENG-008.
BRU-019	Connector health is consumed from existing engines.
BRU-020	Every material resolution must be audited.
25. Acceptance Criteria
ID	Acceptance Criterion
AC-001	PENDING payment with no callback remains PENDING and is not shown as paid.
AC-002	Provider query can resolve a pending payment to SUCCESSFUL where the provider confirms success.
AC-003	Provider query can resolve a pending payment to FAILED where the provider confirms failure.
AC-004	Provider query returning UNKNOWN leaves the payment unresolved and creates/maintains an exception.
AC-005	Callback amount different from initiated amount creates an exception rather than SUCCESSFUL status.
AC-006	Callback currency different from initiated currency creates an exception.
AC-007	Callback referring to another obligation cannot be automatically allocated.
AC-008	Duplicate provider callback does not create another payment or allocation.
AC-009	Unknown payment cannot be automatically retried.
AC-010	Retry is permitted only when ENG-006 confirms the original request was not accepted or configured policy explicitly permits a new attempt.
AC-011	A new payment attempt receives a distinct transaction identity.
AC-012	Manual resolution requires reason and actor.
AC-013	Manual SUCCESSFUL resolution is distinguishable from provider-confirmed SUCCESSFUL.
AC-014	Maker cannot approve own resolution when SoD is enabled.
AC-015	All material resolution actions are recorded in the audit trail.
AC-016	Exception queue shows unresolved payment exceptions and their current state.
AC-017	Provider/connector health is consumed from ENG-003e/ENG-006 rather than implemented independently.
AC-018	Settlement exceptions can be surfaced without implementing reconciliation matching.
AC-019	No bank/M-Pesa/card statement matching exists in IP-08.
AC-020	No direct provider SDK/API exists in BP-007 modules.
AC-021	Cross-business access to payment exceptions fails.
26. Example — Unknown STK
Customer
   ↓
STK Push KES 10,000
   ↓
Provider
   ↓
No callback

Platform:

Payment Status = PENDING
Exception      = OPEN
Paid           = 0
Outstanding    = 10,000

IP-08:

Query Provider
      ↓
SUCCESSFUL

Then:

Payment Status = SUCCESSFUL
Exception      = RESOLVED
Allocated      = 10,000
Outstanding    = 0
27. Example — Callback Mismatch
Initiated payment:
KES 10,000

Callback:

Provider reference = ABC123
Amount             = KES 8,000

Result:

Payment = EXCEPTION
Allocation = 0
Outstanding = 10,000

The system must not accept KES 8,000 automatically.

An operator investigates and resolves it through the controlled process.

28. Example — Duplicate Callback
Callback 1
Provider Ref = ABC123
Amount       = 10,000
→ SUCCESSFUL

Same callback arrives again:

Callback 2
Provider Ref = ABC123
Amount       = 10,000

Result:

No second payment
No second allocation
No second receipt

The second event is handled idempotently.

29. Architecture Boundary

The final BP-007 architecture should be:

                  BP-006
               Sales Order
                    │
                    ▼
             BP-007 IP-01
           Payment Obligation
                    │
                    ▼
             IP-02 Initiation
                    │
                    ▼
                ENG-006
                    │
             Provider Adapter
                    │
                    ▼
              External Provider
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       Callback              Query
          │                   │
          └─────────┬─────────┘
                    ▼
                 IP-08
          Exceptions & Controls
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       Resolve              Escalate
          │                   │
          ▼                   ▼
      IP-03/05             ENG-008
      Allocation          Reconciliation
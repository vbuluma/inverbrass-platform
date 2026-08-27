BP-007 IP-06 — Refunds, Reversals & Adjustments
BRD / Requirements Specification
Attribute	Description
Implementation Package	IP-06
Build Pack	BP-007 – Payments, Billing & Receipting
Priority	High
Status	Implemented
Depends On	IP-02–IP-05, BP-006 IP-04 financial instruction, ENG-006, ENG-005, ENG-013
Scope Coverage	SC-013
Related Pack FRs	FR-017, FR-018, FR-023
1. Objective

Provide controlled post-payment processing for:

full refunds;
partial refunds;
payment reversals;
applicable financial adjustments.

IP-06 shall preserve the original payment and create a new transaction representing the subsequent financial event.

Original Payment
       │
       │ immutable
       ▼
Refund / Reversal Transaction
       │
       └── references original payment

The objective is to ensure that payment history remains auditable and that refunds can be reconciled independently.

2. Core Principles
Principle 1 — Never overwrite the original payment

If:

Payment = KES 10,000
Status = SUCCESSFUL

and KES 3,000 is refunded:

Original Payment
KES 10,000
SUCCESSFUL
        │
        └── Refund
            KES 3,000
            SUCCESSFUL

The original transaction remains:

KES 10,000 SUCCESSFUL

It must not become:

KES 7,000

and must not be changed to:

REFUNDED

in a way that destroys the original payment event.

3. Important Terminology

The implementation should distinguish these concepts.

Term	Meaning
Refund	Money previously received is returned to the customer
Reversal	A payment is reversed according to the applicable transaction/provider process
Adjustment	Financial/documentary correction that does not necessarily mean money is returned
Cancellation	A business instruction to cancel an underlying sale/order
Commercial amendment	Change to the underlying sale/commercial obligation

These must not become interchangeable statuses.

4. Scope
4.1 Included
A. Refund Request

Create a refund transaction/request against an eligible successful payment.

The request must identify:

original payment;
amount;
currency;
reason;
originating order;
customer;
originating financial instruction;
requesting actor;
timestamp.
B. Full Refund

Support refunding the entire refundable amount.

Example:

Original payment = KES 10,000
Previously refunded = KES 0

Refund request = KES 10,000
C. Partial Refund

Support refunding part of the payment.

Example:

Original payment = KES 10,000

Refund 1 = KES 3,000
Refund 2 = KES 2,000

Total refunded = KES 5,000
Remaining refundable = KES 5,000
5. Refundable Amount

This should be an explicit business rule.

The platform shall not allow:

Total refunds > refundable amount

Conceptually:

Refundable Amount
=
Successful Payment Amount
−
Previously Successful Refunds/Reversals

subject to applicable allocation/commercial rules.

Example:

Payment                  10,000
Previous refunds          3,000
                         -------
Remaining refundable      7,000

New refund cannot exceed 7,000

This prevents duplicate or excessive refunds.

6. Refund Lifecycle

I recommend explicitly introducing a refund transaction lifecycle.

REQUESTED
    ↓
PENDING_APPROVAL       (when SoD applies)
    ↓
APPROVED
    ↓
PROCESSING
    ↓
SUCCESSFUL

Alternative outcomes:

REQUESTED → REJECTED
APPROVED  → FAILED
PROCESSING → UNKNOWN

The exact states may be simplified depending on the ENG-006 adapter capabilities.

Important

UNKNOWN must not automatically become FAILED.

If the external provider's outcome cannot be established, IP-06 should fail closed and route the case appropriately rather than blindly retrying.

7. Refund Approval / Maker-Checker

Refunds may be subject to configurable approval rules.

Examples:

all refunds require checker;
refunds above a configured threshold require checker;
certain refund types require checker;
certain roles may approve without additional approval.

The rule should be configuration-driven.

Segregation of Duties

Where maker-checker applies:

The person who creates the refund request cannot approve the same refund.

Approval must be enforced by:

ENG-005

not implemented as a BP-007-specific approval framework.

8. Electronic Refund

If the original payment was electronic and the provider supports refunds:

IP-06
   ↓
ENG-006
   ↓
Configured provider adapter
   ↓
External provider

BP-007 must never directly call:

Safaricom APIs;
bank APIs;
card APIs;
other provider APIs.

No provider SDKs should exist inside BP-007 payment modules.

9. Manual Cash Refund

For a cash-originated payment, an electronic provider refund may not apply.

Example:

Original:
Method = CASH
Amount = KES 5,000

Refund:
Method = CASH
Amount = KES 2,000

IP-06 should support a controlled manual refund process subject to the configured approval policy.

10. Refund Method

A useful refinement is to avoid assuming that every refund must use the original payment channel.

The business/provider policy may determine the permitted refund route.

Therefore:

Original payment method
        ↓
Refund eligibility/policy
        ↓
Permitted refund method/channel

The system should not automatically assume:

"Refund must always use exactly the original provider/channel"

unless policy requires it.

11. Provider Refund Limits

This should explicitly connect to your earlier principle about provider limits.

Where the provider exposes refund limits/capabilities:

IP-06 shall enforce the configured/provider-supplied limits for the individual refund transaction.

The platform must not hard-code examples such as:

STK refund limit = 150,000

or any provider-specific rule.

If a refund exceeds the permitted transaction limit, the system should:

reject the request; or
route it through an approved alternative process,

according to configuration.

It must not silently split a refund unless such splitting is explicitly supported and authorised.

12. Refund vs Reversal

The system should maintain a distinction between:

Refund

Money is returned after the payment has been successfully completed.

SUCCESSFUL PAYMENT
        ↓
REFUND
Reversal

The payment transaction is reversed according to the applicable payment/provider process.

PAYMENT
   ↓
REVERSAL

Both are post-payment financial events, but they may have different provider semantics.

Do not collapse them into a single generic "refund" status if the underlying provider transaction distinguishes them.

13. Financial Instruction

IP-06 shall consume the approved financial instruction from BP-006.

For example:

BP-006
Cancel / Return instruction
          ↓
       IP-06
          ↓
Determine collected amount
          ↓
Create refund/reversal transaction

The Sales module must not directly modify payment records.

14. No Collected Amount

If the financial instruction says:

Cancel sale

but:

Amount collected = 0

there is nothing to refund.

IP-06 should therefore not create a meaningless refund transaction.

Instead:

Financial instruction
       ↓
Collected = 0
       ↓
No refund required

The underlying business cancellation continues through its appropriate workflow.

15. Allocation / Outstanding Balance

A successful refund must affect the amount considered paid/allocated against the obligation.

Example:

Obligation       10,000
Payment          10,000
Refund            3,000
----------------------
Net allocated     7,000
Outstanding       3,000

Therefore:

Refunds reduce the net amount allocated to the obligation; they do not change the original commercial amount due.

This distinction is critical.

Amount Due = 10,000       ← unchanged
Net Paid   = 7,000
Outstanding = 3,000

A refund must never silently change:

Amount Due
16. Invoice Interaction

Where an invoice exists, a successful refund may affect:

invoice paid amount;
invoice outstanding amount;
applicable credit/adjustment state.

IP-06 must consume the established billing/allocation model rather than creating an independent invoice-balance calculation.

17. Receipt Interaction

The original receipt remains unchanged.

Example:

Payment
KES 10,000
     ↓
Receipt R001
     ↓
Refund KES 3,000
     ↓
Refund Evidence R002

R001 remains evidence that KES 10,000 was originally received.

R002 provides evidence that KES 3,000 was subsequently returned.

18. Idempotency

This should be explicit.

A refund request must have an idempotency mechanism preventing:

Retry
Retry
Callback
Retry

from producing multiple refund transactions.

For example:

Refund Request ID
        +
Original Payment
        +
Idempotency Key

must uniquely identify the refund operation.

19. Unknown Provider Outcome

This is particularly important for electronic refunds.

Example:

Refund submitted
      ↓
Network timeout
      ↓
Did provider receive it?
      ↓
UNKNOWN

The system must not automatically issue another refund.

It should:

UNKNOWN
   ↓
Query / exception handling

according to the payment-engine capabilities and IP-08 process.

This protects against double refunds.

20. Business Requirements
ID	Requirement
BR-001	The platform shall support controlled full and partial refunds.
BR-002	The platform shall support applicable payment reversals.
BR-003	Original successful payments shall remain immutable.
BR-004	Every refund/reversal shall reference its originating payment.
BR-005	Refunds shall only be created against eligible payments.
BR-006	Refund amount shall not exceed the remaining refundable amount.
BR-007	Multiple partial refunds shall be supported without exceeding the refundable amount.
BR-008	Refunds shall consume applicable BP-006 financial instructions.
BR-009	Refund approval shall use configured maker-checker rules where applicable.
BR-010	Electronic refunds shall be processed through ENG-006 adapters.
BR-011	Manual cash refunds shall follow the configured manual-refund process.
BR-012	Provider/refund limits shall be enforced where supplied by the payment engine/provider capability.
BR-013	Provider limits shall not be hard-coded in BP-007.
BR-014	Unknown refund outcomes shall not be blindly retried.
BR-015	Successful refunds shall reduce the net allocated payment amount appropriately.
BR-016	Refunds shall not alter the original commercial amount due.
BR-017	Original receipts shall remain intact after refund.
BR-018	Refund/reversal transactions shall be independently auditable.
BR-019	Cross-business refund access shall fail closed.
BR-020	IP-06 shall not implement inventory restocking or collections.
21. Functional Requirements
ID	Functional Requirement
FR-001	Identify eligible successful payment transactions for refund/reversal.
FR-002	Create full refund requests.
FR-003	Create partial refund requests.
FR-004	Validate refund amount against remaining refundable amount.
FR-005	Prevent refunding more than the refundable amount.
FR-006	Record refund reason.
FR-007	Record requesting actor and timestamp.
FR-008	Apply configured maker-checker approval where required.
FR-009	Prevent self-approval where SoD applies.
FR-010	Route electronic refunds through ENG-006.
FR-011	Support controlled manual cash refunds.
FR-012	Persist provider refund reference where applicable.
FR-013	Process provider refund outcomes.
FR-014	Support refund states including requested, approved, processing, successful and failed.
FR-015	Support an unresolved/unknown outcome without automatically retrying.
FR-016	Enforce refund idempotency.
FR-017	Apply successful refund effects to net payment allocation.
FR-018	Preserve original payment amount and status.
FR-019	Link refund to originating financial instruction.
FR-020	Link refund to originating order/payment obligation.
FR-021	Preserve original receipt and establish refund linkage.
FR-022	Support applicable refund/adjustment documentation.
FR-023	Support provider/channel capability and limit validation through ENG-006.
FR-024	Maintain complete audit history.
FR-025	Enforce tenant isolation.
FR-026	Expose refund status to downstream payment/customer journeys.
22. Business Rules
ID	Rule
BRU-001	Original payment transactions are immutable.
BRU-002	A refund must reference the original payment.
BRU-003	Refund amount cannot exceed the remaining refundable amount.
BRU-004	Failed refunds do not reduce the allocated payment amount.
BRU-005	Successful refunds reduce net allocated payment.
BRU-006	Refunds do not change the original amount due.
BRU-007	A refund cannot be created where no amount was collected.
BRU-008	A maker cannot approve their own refund where SoD applies.
BRU-009	Provider-specific refund processing occurs through ENG-006.
BRU-010	Provider limits/capabilities must be obtained from configuration/ENG-006 and not hard-coded.
BRU-011	Unknown provider outcomes must not be blindly retried.
BRU-012	Duplicate refund requests must be prevented through idempotency.
BRU-013	Original receipts cannot be deleted or overwritten by a refund.
BRU-014	Refunds must be auditable.
BRU-015	Cross-business refund access must fail closed.
BRU-016	Inventory consequences belong to BP-008.
BRU-017	Collection consequences belong to SC-032/future capability.
BRU-018	Commercial price/tax recalculation does not occur in IP-06.
23. Acceptance Criteria
ID	Acceptance Criterion
AC-001	A successful KES 10,000 payment can generate a full refund while the original payment remains SUCCESSFUL and immutable.
AC-002	A KES 10,000 payment can receive a KES 3,000 partial refund.
AC-003	A second KES 8,000 refund is rejected when only KES 7,000 remains refundable.
AC-004	Multiple successful partial refunds cannot exceed the original refundable amount.
AC-005	A refund against a payment with zero collected amount is rejected/not created.
AC-006	Electronic refunds are routed through ENG-006 rather than directly to a provider API.
AC-007	Cash refunds follow the configured manual-refund process.
AC-008	Maker-checker prevents the maker from approving their own refund when SoD applies.
AC-009	Failed refund does not reduce net payment allocation.
AC-010	Successful KES 3,000 refund against KES 10,000 payment leaves KES 7,000 net allocated.
AC-011	Original amount due remains unchanged after refund.
AC-012	Original receipt remains available after refund.
AC-013	Refund evidence links back to the original payment/receipt.
AC-014	Duplicate refund request with the same idempotency key does not create another refund.
AC-015	Unknown provider outcome is not automatically retried.
AC-016	Provider refund limits are enforced where provided by ENG-006.
AC-017	No provider-specific refund limits are hard-coded in BP-007.
AC-018	Refund reason, actor, timestamp and outcome are auditable.
AC-019	Cross-business refund access fails.
AC-020	No inventory restocking or collections functionality is implemented.
24. Example End-to-End Scenarios
Scenario A — Full electronic refund
Sale                  KES 10,000
Payment               KES 10,000 SUCCESSFUL
Receipt               R001

BP-006 cancellation/return instruction
             ↓
IP-06 Refund Request
             ↓
ENG-006
             ↓
Provider
             ↓
SUCCESSFUL
             ↓
Refund KES 10,000

Result:

Original Payment     KES 10,000 SUCCESSFUL
Refund               KES 10,000 SUCCESSFUL
Net allocated        KES 0
Outstanding          KES 10,000
Original Receipt     R001 remains
Refund evidence      R002
Scenario B — Partial refund
Original payment     KES 10,000
Refund               KES 3,000

Result:

Original payment     KES 10,000
Refund               KES 3,000
Net allocated        KES 7,000
Outstanding          KES 3,000
Scenario C — Multiple refunds
Payment              10,000

Refund 1              2,000
Refund 2              3,000
Refund 3              5,000

Valid.

Total refunded       10,000
Remaining refundable      0

A further refund must fail.

Scenario D — Unknown provider outcome
Refund KES 5,000
       ↓
ENG-006
       ↓
Provider
       ↓
Network timeout
       ↓
UNKNOWN

Do not automatically submit another KES 5,000 refund.

That should move toward status query/exception handling.

25. Architectural Boundary

The final IP-06 architecture should look like:

                 BP-006
            Financial Instruction
                    │
                    ▼
                 IP-06
        Refund / Reversal Request
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
     ENG-005              ENG-006
    Approval/SoD        Payment Adapter
                              │
                              ▼
                     Configured Provider
                              │
                              ▼
                     Refund Outcome
                              │
                              ▼
                         IP-06
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
          IP-03           IP-05           Audit
       Allocation        Receipt          ENG-013

And the critical accounting relationship is:

                 COMMERCIAL OBLIGATION
                         │
                         │ unchanged
                         ▼
                    Amount Due
                         │
                         ▼
                  Payment Allocation
                         │
                  − Successful Refunds
                         │
                         ▼
                    Net Paid
                         │
                         ▼
                     Outstanding
BP-007 IP-05 — Receipting & Payment Evidence
BRD / Requirements Specification
Attribute	Description
Implementation Package	IP-05
Build Pack	BP-007 – Payments, Billing & Receipting
Priority	High
Status	Implemented
Depends On	IP-02, IP-03, ENG-007, ENG-003b, ENG-015, ENG-009
Scope Coverage	SC-012
Related Pack FRs	FR-014–FR-016
1. Objective

Provide formal customer/business evidence that a payment was successfully recorded.

Payment
   ↓
SUCCESSFUL
   ↓
Receipt

The receipt is a documentary representation of the payment event.

It is not:

a payment transaction;
a settlement confirmation;
an invoice;
a refund;
a tax calculation;
a replacement for the original payment record.
2. Core Principles
Principle 1 — Payment precedes receipt

A receipt shall only be generated from a payment that has reached the required successful state.

INITIATED
   ↓
PENDING
   ↓
SUCCESSFUL
   ↓
RECEIPT

Never:

Payment initiated
       ↓
Receipt issued ❌
Principle 2 — Receipt is immutable evidence

Once issued, the original receipt shall not be silently edited.

If something subsequently happens:

Refund
Reversal
Correction
Credit

the original receipt remains available and the subsequent event is represented separately and linked to it.

Principle 3 — Receipt reflects the payment, not merely the sale

The receipt must identify what was actually paid.

For example:

Sale Amount       KES 10,000
Payment           KES 6,000
Outstanding       KES 4,000

The receipt should evidence:

KES 6,000 payment

not incorrectly state:

KES 10,000 paid.

This is particularly important for IP-03 partial payments.

3. Scope
3.1 Included
A. Receipt Generation

Generate a receipt when a qualifying payment becomes:

SUCCESSFUL

The receipt shall be linked to the underlying payment transaction.

B. Receipt Content

Receipt content shall be configuration/policy driven but should support:

receipt number;
business;
customer;
payment amount;
currency;
payment date/time;
payment method;
payment rail/network;
payment provider;
payment channel;
provider transaction reference where applicable;
originating order/sale reference;
invoice reference where applicable;
payment allocation;
amount allocated;
remaining outstanding where relevant.
4. Payment Method / Rail / Provider / Channel

The receipt should preserve the four-dimensional payment identity already established in IP-01:

Payment Method
      ↓
Payment Rail / Network
      ↓
Payment Provider
      ↓
Payment Channel

For example, the data could result in:

Method:    Mobile Money
Rail:      M-Pesa
Provider:  [configured provider]
Channel:   STK Push
Reference: [provider transaction reference]

But do not hard-code Safaricom, M-Pesa, VISA, Equity, KCB, STK Push, etc. into receipt-generation logic.

The receipt consumes the actual payment metadata associated with the transaction.

This preserves the platform's industry/channel flexibility.

5. Cash and Manual Payments

Not every payment has a rail or provider.

For example:

Method       = CASH
Rail         = N/A
Provider     = N/A
Channel      = Manual/Cashier

The system shall not force meaningless values into the receipt simply to satisfy the four-dimensional model.

6. Receipt Numbering

Receipt numbering shall be controlled by:

ENG-003b — Numbering/Fiscal Policy

IP-05 shall request a receipt number from the applicable policy/engine.

It shall not implement its own numbering engine.

Do not hard-code:

RCT-000001
REC-2026-00001

or any country-specific numbering sequence in BP-007.

The actual numbering policy must remain configurable.

7. Receipt Document Generation

IP-05 shall prepare the receipt data/document request.

Document production shall be delegated to:

ENG-007

Where the document must be stored or managed, use:

ENG-015

BP-007 must not implement a separate document-generation engine.

8. Receipt Delivery

The platform should support delivery through configured channels such as:

on-screen display;
PDF;
print;
email;
WhatsApp;
other enabled delivery channels.

However:

BP-007 requests delivery; it does not implement the communication channel.

Delivery is delegated to the appropriate engine, such as:

ENG-009

This means BP-007 should not directly implement:

WhatsApp API
Email SMTP
PDF rendering
Printer drivers
9. Receipt History

The system shall maintain receipt history showing:

receipt identifier;
payment reference;
issue date/time;
status;
document reference;
delivery attempts/status where applicable;
originating order/invoice;
subsequent reversal/refund linkage where applicable.
10. Duplicate Receipt Protection

This should be explicitly added to the original proposal.

A repeated provider callback, retry, polling result, or system retry must not create duplicate receipts for the same successful payment event.

For example:

Provider callback
      ↓
SUCCESSFUL
      ↓
Receipt R001

If the same callback arrives again:

Duplicate callback
      ↓
Same payment reference
      ↓
No second receipt

The receipt-generation process should therefore be idempotent.

11. Partial Payment

IP-05 must support receipts for individual successful payment transactions.

Example:

Obligation       KES 10,000

Payment 1        KES 4,000
Payment 2        KES 6,000

This results in:

Receipt 1        KES 4,000
Receipt 2        KES 6,000

Each receipt evidences its own successful payment.

It should not generate one artificial KES 10,000 receipt unless the business explicitly has a separate consolidated-receipt requirement.

12. Split Tender

For:

Order = KES 10,000

Cash       = KES 2,000
M-Pesa     = KES 5,000
Bank       = KES 3,000

IP-05 should preserve evidence of the individual payment transactions.

Each payment retains its own:

method;
rail;
provider;
channel;
reference;
amount.

A future consolidated customer view can aggregate them, but it must not destroy the underlying transaction evidence.

13. Receipt vs Invoice

The system must maintain a clear distinction:

Document	Purpose
Invoice	States what the customer is formally billed/owes
Receipt	Evidence of money successfully received
Credit Note/Adjustment	Reduces/adjusts an applicable billing obligation
Refund/Reversal Document	Evidence of money subsequently returned/reversed

Therefore:

Invoice = "You owe/pay this"
Receipt = "We received this"
14. Receipt vs Settlement

A receipt must not imply settlement.

This is particularly important because BP-007 separates:

Payment
   ↓
Receipt
   ↓
Settlement

A successful payment may have a receipt while settlement is:

PENDING

Therefore the receipt should evidence payment success, not claim:

"Funds have settled"

unless the applicable business/fiscal policy explicitly requires that wording.

15. Refund / Reversal

A later refund or reversal shall not modify the original receipt.

Example:

Payment
KES 10,000
   ↓
Receipt R001
   ↓
Refund KES 3,000
   ↓
Refund Document R002

The relationship should be:

Original Receipt
       │
       └── Refund/Reversal

The original receipt remains auditable.

16. Receipt Status

I recommend explicitly defining receipt status rather than assuming that document generation equals issuance.

For example:

PENDING_GENERATION
       ↓
ISSUED
       ↓
DELIVERY_PENDING
       ↓
DELIVERED

with failure states where appropriate.

However, delivery failure must not mean payment failure.

Example:

Payment = SUCCESSFUL
Receipt = ISSUED
Email = FAILED

The payment remains successful.

17. Business Requirements
ID	Requirement
BR-001	The platform shall generate formal payment evidence for qualifying successful payments.
BR-002	A receipt shall only be generated after payment reaches SUCCESSFUL status.
BR-003	A receipt shall reference the underlying payment transaction.
BR-004	Receipt content shall reflect the actual successful payment amount.
BR-005	Receipt numbering shall be controlled by ENG-003b.
BR-006	Receipt documents shall be generated through ENG-007.
BR-007	Receipt storage/document management shall use ENG-015 where applicable.
BR-008	Receipt delivery shall use configured communication/document delivery services.
BR-009	Receipt data shall preserve payment method, rail, provider and channel where applicable.
BR-010	Cash/manual payments shall not require a rail or provider.
BR-011	Duplicate payment events shall not generate duplicate receipts.
BR-012	Partial successful payments shall generate evidence for the actual amount received.
BR-013	Split payments shall retain independent payment evidence.
BR-014	A receipt shall not represent payment settlement unless explicitly required by policy.
BR-015	A receipt shall not be treated as an invoice.
BR-016	Original receipts shall remain immutable after issuance.
BR-017	Refund/reversal documents shall link to the original receipt without overwriting it.
BR-018	Receipt history shall be retained and auditable.
BR-019	Cross-business receipt access shall fail closed.
BR-020	Receipt generation shall not contain hard-coded provider, rail, channel or numbering assumptions.
18. Functional Requirements
ID	Functional Requirement
FR-001	Detect qualifying SUCCESSFUL payment transactions.
FR-002	Create a receipt against the successful payment.
FR-003	Prevent receipt creation for INITIATED, PENDING, FAILED or EXPIRED payments.
FR-004	Populate receipt amount from the successful payment transaction.
FR-005	Populate payment identity from the payment transaction/catalogue.
FR-006	Include provider transaction reference where applicable.
FR-007	Link receipt to originating order/payment obligation.
FR-008	Link receipt to invoice where applicable.
FR-009	Support receipt numbering through ENG-003b.
FR-010	Generate receipt document through ENG-007.
FR-011	Store/manage generated receipt document through ENG-015.
FR-012	Request receipt delivery through ENG-009/configured delivery capability.
FR-013	Record receipt issue date/time.
FR-014	Record receipt delivery attempts/status where applicable.
FR-015	Prevent duplicate receipt generation for the same payment event.
FR-016	Support receipts for partial payments.
FR-017	Support evidence for each component of a split payment.
FR-018	Preserve original receipt after refund/reversal.
FR-019	Link subsequent refund/reversal evidence to the original receipt.
FR-020	Maintain receipt history.
FR-021	Enforce tenant isolation.
FR-022	Support configured receipt content and formatting policies.
FR-023	Support configured delivery channels without embedding channel-specific integrations in BP-007.
FR-024	Expose receipt reference/status to downstream customer and transaction journeys.
19. Business Rules
ID	Rule
BRU-001	Payment success is a prerequisite for receipt generation.
BRU-002	Receipt generation must be idempotent.
BRU-003	One successful payment event must not produce multiple receipts through retries/callback duplication.
BRU-004	Receipt amount must equal the amount of the payment it evidences.
BRU-005	Receipt numbering must come from ENG-003b.
BRU-006	Receipt generation must not create or modify payment status.
BRU-007	Receipt generation must not create settlement status.
BRU-008	Receipt delivery failure must not change payment status.
BRU-009	Original issued receipts must not be silently modified.
BRU-010	Refunds/reversals require separate evidence linked to the original receipt.
BRU-011	Provider/rail/channel information must come from configured payment data.
BRU-012	Cash payments may have no rail/provider.
BRU-013	Receipt generation must not recalculate the commercial amount.
BRU-014	Receipt generation must not implement direct provider integrations.
BRU-015	Receipt access must be tenant isolated.
BRU-016	Receipt lifecycle changes must be auditable.
20. Acceptance Criteria
ID	Acceptance Criterion
AC-001	No receipt is generated for a payment that is not SUCCESSFUL.
AC-002	A successful KES 5,000 payment produces receipt evidence for exactly KES 5,000.
AC-003	Receipt contains the applicable method, rail, provider and channel.
AC-004	CASH receipt does not require a rail/provider.
AC-005	Electronic receipt contains the provider transaction reference where available.
AC-006	Receipt numbering is obtained through ENG-003b.
AC-007	Receipt document is generated through ENG-007.
AC-008	Receipt can be delivered through configured delivery services without BP-007 directly calling WhatsApp/email APIs.
AC-009	Repeated provider callback does not generate a second receipt.
AC-010	A KES 4,000 partial payment generates evidence for KES 4,000, not the full obligation.
AC-011	Multiple split payments retain independent payment evidence.
AC-012	Payment remains SUCCESSFUL even if receipt email/WhatsApp delivery fails.
AC-013	Original receipt remains available after refund/reversal.
AC-014	Refund/reversal creates separate linked evidence.
AC-015	Receipt does not claim settlement merely because payment is SUCCESSFUL.
AC-016	Receipt cannot be used to change the underlying amount due.
AC-017	Cross-business receipt access fails.
AC-018	No provider, rail, channel, country or numbering values are hard-coded in receipt-generation logic.
21. Explicitly Out of Scope

IP-05 must not implement:

payment initiation — IP-02;
payment allocation — IP-03;
invoice creation — IP-04;
refunds/reversals — IP-06;
settlement — IP-07;
exception operations — IP-08;
collections / dunning — SC-032;
direct Safaricom/bank/card APIs;
payment-provider SDKs;
payment switching;
payment-rail processing;
independent tax calculation;
independent invoice numbering;
independent document rendering engine;
eTIMS device integration unless explicitly brought into scope by the approved fiscal architecture.
22. Recommended IP-05 Architecture
                 IP-02
             Payment Processing
                    │
                    ▼
              SUCCESSFUL
                    │
                    ▼
                 IP-03
              Allocation
                    │
                    ▼
                 IP-05
              RECEIPT
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    ENG-003b      ENG-007     ENG-015
    Numbering     Document     Storage
                    │
                    ▼
                 ENG-009
                 Delivery
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
        Email    WhatsApp    Print/
                              PDF
The key separation is:

IP-02: Did the payment succeed?
IP-03: How much of the obligation was allocated?
IP-04: What does the customer formally owe/bill?
IP-05: What evidence do we provide that money was received?
IP-06: Was money subsequently reversed/refunded?
IP-07: Has the money settled?
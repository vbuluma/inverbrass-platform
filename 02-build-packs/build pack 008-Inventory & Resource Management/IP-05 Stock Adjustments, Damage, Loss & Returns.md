P-008 IP-05 — Stock Adjustments, Damage, Loss & Returns
Attribute	Description
Implementation Package	IP-05
Build Pack	BP-008 – Inventory & Resource Management
Priority	High
Depends On	IP-01, IP-02, IP-03, IP-04, ENG-005, ENG-013
Scope coverage	Stock corrections, damage, loss, write-offs, inventory returns
Related pack FRs	Inventory adjustment, stock correction, damage/loss, returns, auditability
Objective

Provide a controlled mechanism for correcting physical inventory differences and recording non-sale stock movements without directly editing stock balances.

IP-05 handles situations where stock needs to change for reasons other than:

Sales
Purchases/receiving
Transfers
Stocktake reconciliation

The central rule is:

Every adjustment must create an auditable inventory movement. Stock balances are never edited directly.

Business Problem

SMEs routinely experience:

Damaged goods
Lost/stolen stock
Expired goods
Broken items
Incorrect opening balances
Physical count corrections
Customer returns
Supplier returns
Administrative stock corrections

If staff can simply edit:

Product A = 100 → Product A = 95

there is no reliable explanation for the five-unit difference.

Instead:

Stock = 100
       ↓
Adjustment: DAMAGE
       ↓
Quantity = -5
       ↓
Stock = 95

The original ledger history remains intact.

Scope
1. Stock adjustment

Allow an authorised user to create an adjustment against a specific:

Business
Location
Product
Variant/SKU
Unit of measure
Quantity
Adjustment reason
Date
Notes
Supporting reference/document where applicable

Adjustment types should be configurable rather than hardcoded.

Examples:

DAMAGE
LOSS
THEFT
EXPIRY
FOUND
COUNT_CORRECTION
ADMINISTRATIVE_CORRECTION
OTHER
2. Adjustment direction

An adjustment can either increase or decrease stock.

Decrease
On hand = 100
Damage = 5

Result = 95
Increase
On hand = 100
Found stock = 3

Result = 103

The system should represent the movement explicitly rather than relying on a negative/positive number without context.

3. Reason is mandatory

Every adjustment must have a reason.

Example:

Adjustment
Product: Coca-Cola 500ml
Location: Nairobi Store
Quantity: -10
Reason: DAMAGE
Notes: Damaged during unloading

A generic OTHER reason should require an explanatory note.

4. Approval / maker-checker

Inventory adjustments should support business-configurable approval.

Example:

inventoryAdjustmentApprovalRequired = false

Normal flow:

DRAFT
  ↓
POSTED

When approval is enabled:

DRAFT
  ↓
APPROVAL_PENDING
  ↓
APPROVED
  ↓
POSTED

Rejection:

APPROVAL_PENDING
        ↓
     REJECTED

When configured for maker-checker:

Maker cannot approve own adjustment
Checker must explicitly approve
Rejection requires a reason
Approval/rejection is audited through ENG-013
Adjustment must not affect stock before approval

ENG-005 owns the workflow mechanism; IP-05 only consumes it.

5. Damage and loss

Provide first-class operational reasons for:

Damage
DAMAGE

Examples:

Broken during handling
Damaged packaging
Water/fire damage
Defective physical item
Loss
LOSS

Examples:

Missing stock
Unexplained shortage
Theft
Shrinkage

These must remain distinguishable for reporting.

6. Expired stock

Expired inventory should be removable through an adjustment reason such as:

EXPIRY

IP-05 does not implement expiry-date tracking.

That belongs to IP-07.

Therefore:

IP-05
"Remove 20 units because they are expired"

is supported.

But:

Automatically identify products expiring tomorrow

is IP-07, not IP-05.

7. Customer returns

Support inventory return from a customer where the physical product is being returned into inventory.

Example:

Customer bought:
10 units

Customer returns:
2 units

Inventory:
+2

The return must identify the originating transaction/order where available.

However, IP-05 should not independently reverse the financial payment.

Financial refund/reversal remains owned by BP-007 IP-06.

Therefore:

Customer Return
      ↓
Inventory movement → IP-05

Financial refund
      ↓
Payment refund → BP-007 IP-06

The two records should be linkable but independently owned.

8. Returned stock condition

A returned product may not necessarily be saleable.

Support a condition/state such as:

SALEABLE
DAMAGED
QUARANTINED

However, detailed quality-control workflows are outside this IP.

Example:

Customer returns 2 units

Received:
2

Condition:
1 SALEABLE
1 DAMAGED

Inventory movements should reflect the resulting stock state.

9. Supplier returns

Support stock leaving the business because it is returned to a supplier.

Example:

Stock = 100
Supplier return = 10

Stock = 90

The return should reference the relevant supplier/purchase transaction where available.

Supplier settlement/credit-note processing belongs to BP-009 and must not be implemented here.

10. Stock correction

Support administrative correction where an authorised user identifies an incorrect inventory balance.

Example:

System = 97
Physical observation = 100

Adjustment:
+3
Reason:
COUNT_CORRECTION

However, once IP-06 exists, formal stocktake reconciliation should be performed through IP-06.

Therefore IP-05 supports controlled one-off corrections, while IP-06 owns structured stocktake reconciliation.

11. Available stock and reservations

Adjustments must respect IP-03 reservation rules.

For a decrease:

On hand = 100
Reserved = 30
Available = 70

Attempt:

Damage = 80

must be rejected unless a specific business policy allows adjustment against reserved stock.

The default should be:

Do not allow an adjustment to consume stock already committed to a reservation/order.

This prevents:

Reserved = 30
Available = -10
12. Transfers interaction

IP-05 must not be used to correct normal transfers.

For example, this is wrong:

Warehouse → Store

Subtract 20 using DAMAGE
Add 20 using FOUND

A transfer must use IP-04.

IP-05 is for genuine inventory corrections/non-transfer movements.

13. Ledger integration

Every adjustment must create an inventory ledger movement.

Example:

Inventory Ledger

Opening          +100
Sale              -20
Transfer          -10
Damage             -5
Customer Return    +2
--------------------
Balance            67

IP-05 must never:

Directly update quantityOnHand
Delete previous movements
Rewrite historical ledger entries
Recalculate stock independently from the ledger
14. Idempotency

Adjustment operations must be idempotent.

Examples:

CREATE_ADJUSTMENT
APPROVE_ADJUSTMENT
POST_ADJUSTMENT
REJECT_ADJUSTMENT

Repeated requests must not create duplicate stock movements.

For example:

POST adjustment AJ-000001

called twice must produce one ledger movement.

15. Concurrency

Adjustments must use the inventory concurrency mechanism established in IP-01.

Example:

Available = 20

User A adjusts -15
User B adjusts -10

The system must prevent both operations from succeeding if that would produce an invalid available position.

The final available quantity must never become negative unless an explicit future policy permits negative inventory.

16. Audit

Use ENG-013 for all adjustment actions.

Events should include:

ADJUSTMENT_CREATED
ADJUSTMENT_APPROVAL_REQUESTED
ADJUSTMENT_APPROVED
ADJUSTMENT_REJECTED
ADJUSTMENT_POSTED
ADJUSTMENT_CANCELLED
DAMAGE_RECORDED
LOSS_RECORDED
RETURN_RECEIVED
SUPPLIER_RETURN_POSTED

Audit should capture:

Business
Actor
Adjustment
Location
Product
Quantity
Reason
Previous status
New status
Approval actor
Timestamp
Reference
Notes

No credentials/secrets.

17. Tenant isolation

Every operation must use the authenticated businessId.

Cross-business:

Read
Create
Approve
Reject
Post
Cancel

must fail closed.

Never trust a client-supplied business ID.

18. UI / UX
Inventory workspace

Provide:

Inventory
├── Stock
├── Transfers
├── Adjustments
└── Returns

Adjustment workspace:

Adjustments

Adjustment #   Product       Location    Qty    Reason     Status
AJ-000001      Product A     Nairobi     -5     Damage     Posted
AJ-000002      Product B     Nairobi     +3     Found      Pending
Adjustment creation
Create Adjustment

Location
Product
Quantity
Direction
Reason
Reference
Notes

[Submit]

If approval is configured:

Submit for approval

rather than immediately posting.

Adjustment detail

Display:

Adjustment AJ-000001

Product: Product A
Location: Nairobi Store

Movement: -5
Reason: Damage

Status: Posted

Created by: User A
Approved by: User B
Posted: 27 Aug 2026

Customer/staff UI should use operational language.

Do not expose:

BP-008
IP-05
ENG-005
ENG-013
Business Rules
ID	Rule
ADJ-001	Adjustment quantity must be greater than zero
ADJ-002	Adjustment reason is mandatory
ADJ-003	OTHER requires an explanatory note
ADJ-004	Adjustment must reference a valid business/location/product
ADJ-005	Decrease cannot exceed available stock by default
ADJ-006	Reserved stock cannot be consumed by default
ADJ-007	Adjustment approval is configuration-driven
ADJ-008	Maker cannot approve own adjustment when SoD applies
ADJ-009	Rejected adjustment must not affect stock
ADJ-010	Approved adjustment can be posted once
ADJ-011	Posting creates an inventory ledger movement
ADJ-012	Historical ledger movements cannot be overwritten
ADJ-013	Duplicate posting must be idempotent
ADJ-014	Customer return increases inventory only through an explicit return movement
ADJ-015	Supplier return decreases inventory through an explicit return movement
ADJ-016	Financial refunds are not performed by inventory
ADJ-017	Transfer discrepancies must not be disguised as adjustments
ADJ-018	Formal stocktake reconciliation belongs to IP-06
ADJ-019	Expiry-date automation belongs to IP-07
ADJ-020	Cross-business operations fail closed
ADJ-021	All adjustments are auditable
ADJ-022	No direct stock-balance editing is permitted
Acceptance Criteria
ID	Criterion
AC-001	User can create a positive stock adjustment
AC-002	User can create a negative stock adjustment
AC-003	Adjustment without a reason is rejected
AC-004	OTHER without explanatory notes is rejected
AC-005	Adjustment exceeding available stock is rejected by default
AC-006	Reserved stock cannot be consumed by an adjustment
AC-007	Configured maker-checker places adjustment into approval
AC-008	Maker cannot approve own adjustment when SoD applies
AC-009	Rejected adjustment does not affect inventory
AC-010	Approved adjustment creates exactly one ledger movement
AC-011	Repeated posting is idempotent
AC-012	Damage can be recorded as a stock decrease
AC-013	Loss can be recorded as a stock decrease
AC-014	Found stock can be recorded as a stock increase
AC-015	Customer return can increase inventory
AC-016	Supplier return can decrease inventory
AC-017	Customer return can reference the originating sale/order
AC-018	Inventory return does not directly execute a financial refund
AC-019	Returned stock condition can distinguish saleable vs non-saleable stock
AC-020	Every movement is traceable to its adjustment/return
AC-021	Cross-business access fails closed
AC-022	Concurrent adjustments cannot create an invalid stock balance
AC-023	Original ledger records remain immutable
AC-024	IP-05 does not implement formal stocktake reconciliation
AC-025	IP-05 does not implement automatic expiry detection
AC-026	IP-05 does not use adjustments to implement transfers
AC-027	All adjustment actions are audited through ENG-013
Do Not Implement

IP-05 must NOT implement:

Stocktake/reconciliation engine → IP-06
Batch tracking → IP-07
Expiry-date tracking/automation → IP-07
Serial tracking → IP-07
Reorder points → IP-08
Low-stock alerts → IP-08
Exception operations → IP-09
Supplier purchasing → BP-009
Supplier financial credit notes → BP-009
Payment refunds → BP-007 IP-06
GL/accounting postings → BP-010
Inventory valuation
Direct provider integrations
A second inventory ledger
Direct stock-balance editing
Core IP-05 invariant
Physical / Operational Event
          ↓
   Adjustment / Return
          ↓
 Approval (if configured)
          ↓
 Inventory Ledger Movement
          ↓
     Stock Balance

Never:

User edits stock balance
        ↓
New quantity saved
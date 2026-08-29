BP-008 IP-04 — Stock Transfers & Multi-Location
Attribute	Description
Implementation Package	IP-04
Build Pack	BP-008 – Inventory & Resource Management
Priority	High
Depends On	IP-01, IP-02, IP-03, ENG-005, ENG-013
Scope coverage	Multi-location inventory, stock transfers
Related pack FRs	Inventory location visibility, transfer management, in-transit stock, transfer auditability
Objective

Enable businesses with multiple inventory locations to move stock between locations while maintaining an accurate stock position at each location and across the business.

The system must distinguish:

Stock at source
Stock in transit
Stock received at destination
Available stock
Reserved/committed stock

A transfer must maintain a complete chain from source → dispatch → transit → destination receipt.

Business Problem

Without a formal transfer lifecycle, staff may simply reduce stock at one location and increase it at another.

This creates:

Double-counting
Lost stock
Incorrect available quantities
No visibility of stock in transit
Poor auditability
Difficulty investigating transfer discrepancies

The system must therefore treat a transfer as a stock movement with its own identity and lifecycle, rather than two unrelated stock adjustments.

Scope
Included
1. Multi-location stock visibility

Support stock balances by:

Business
Location
Product
Variant/SKU where applicable
Unit of measure
Stock state

At minimum:

On Hand
Reserved
Available
In Transit

The business should be able to see:

Total Business Stock
        ↓
Location A
Location B
Location C

A consolidated total must not hide the location-level position.

2. Transfer creation

Create a stock transfer containing:

Transfer number
Source location
Destination location
Product
Quantity requested
Unit of measure
Reason
Requested by
Requested date
Notes
Status

Source and destination must be different locations.

3. Stock availability validation

Before dispatch:

Available Source Stock
        ≥
Transfer Quantity

Reserved stock must not be transferable unless a future policy explicitly permits it.

Example:

On hand       100
Reserved       30
Available      70

Transfer       80  → BLOCKED
Transfer       50  → ALLOWED

IP-04 must use the stock availability produced by IP-01/IP-03 rather than maintaining a second availability calculation.

4. Transfer lifecycle

Recommended lifecycle:

DRAFT
  ↓
REQUESTED
  ↓
APPROVED* 
  ↓
DISPATCHED
  ↓
IN_TRANSIT
  ↓
RECEIVED
  ↓
COMPLETED

With controlled exception states:

REQUESTED → CANCELLED
APPROVED  → CANCELLED
IN_TRANSIT → DISCREPANCY

APPROVED is conditional based on business configuration.

A business should be able to configure whether transfer approval is required.

5. Dispatch

When stock is dispatched:

Source stock is reduced
Transfer quantity becomes in transit
Destination stock is not yet increased
Transfer records the dispatcher
Dispatch date/time is recorded
Source stock movement is linked to the transfer

Example:

Location A

Before:
On hand = 100
Available = 100

Dispatch 30

After:
On hand = 70
Available = 70
In transit = 30

Destination:

Before:
On hand = 20

After dispatch:
On hand = 20
In transit = 30

The destination must not show the 30 as available stock yet.

6. Receiving

Destination staff must explicitly receive the transfer.

Example:

Transferred = 30
Received = 30

Result:

Source:
-30

Destination:
+30

In transit:
0

Receiving must record:

Receiver
Date/time
Quantity received
Quantity rejected/damaged, if applicable
Notes
Discrepancy reason where applicable

This separation of dispatch and receipt is important because the physical quantity received can differ from the quantity dispatched.

7. Partial receipt / discrepancy

Support:

Dispatched = 30
Received = 28
Difference = 2

The transfer must not silently complete as 30 received.

The system should record:

Received       28
Discrepancy     2

The discrepancy becomes an operational exception/handoff for the appropriate later control process.

Do not use a generic stock adjustment to hide the discrepancy.

IP-05/IP-06 can subsequently handle damage, loss and reconciliation.

8. Cancellation

Transfers may be cancelled only before the point where cancellation would create an invalid stock position.

For example:

REQUESTED → CANCELLED
APPROVED  → CANCELLED

Once dispatched:

DISPATCHED / IN_TRANSIT

the system should not simply cancel the transfer and restore source stock.

A return/reversal movement is required and belongs to the appropriate later inventory operation.

9. Multi-location stock rules

The system must support:

Location A
Location B
Location C
Warehouse
Shop
Branch
Store

The location model must remain configurable rather than hardcoding:

WAREHOUSE
STORE
BRANCH

as the only possible types.

A business may have:

Main Warehouse
Nairobi CBD
Westlands
Kisumu
Mombasa

or any other configured locations.

10. Location ownership / access

Users should only be able to perform location operations permitted by their access configuration.

Examples:

User	Source	Destination
Branch user	Own branch	Permitted branches
Warehouse user	Warehouse	Permitted locations
Business owner	Any	Any
Central inventory manager	Any	Any

Cross-business access must always fail closed.

11. Maker-checker

Transfer approval must be configuration-driven.

Example:

transferApprovalRequired = false

Normal workflow:

REQUESTED
   ↓
DISPATCHED

If enabled:

REQUESTED
   ↓
APPROVAL_PENDING
   ↓
APPROVED
   ↓
DISPATCHED

When maker-checker is configured:

Maker cannot approve own transfer
Checker approval is auditable
Rejection must include reason
Approval rules must not be hardcoded into the transfer service

ENG-005 should provide the approval mechanism rather than IP-04 building a new workflow engine.

12. Inventory ledger integration

Every physical stock movement must create the appropriate ledger event through the existing inventory foundation.

Transfer events should be distinguishable, for example:

TRANSFER_DISPATCH
TRANSFER_RECEIPT
TRANSFER_RETURN

IP-04 must not directly manipulate a stock balance field as a substitute for ledger movements.

The ledger remains the source of truth.

13. Reservations interaction

IP-03 reservations must be respected.

Example:

On hand = 100
Reserved = 40
Available = 60

Transfer request:

Transfer 70

→ blocked.

Transfer request:

Transfer 50

→ allowed.

A transfer must never silently consume stock reserved for an existing sale/order.

14. In-transit stock

The system must expose in-transit stock separately.

Example:

Location	On Hand	Reserved	Available	In Transit
Nairobi	70	10	60	0
Mombasa	20	5	15	30
Kisumu	40	0	40	0

Business total:

On hand = 130
In transit = 30

But the 30 in transit must not be counted as destination available stock until received.

This separation is a core multi-location inventory control.

15. Transfer audit

Every transfer action must be auditable through ENG-013.

Audit events should include:

TRANSFER_CREATED
TRANSFER_REQUESTED
TRANSFER_APPROVED
TRANSFER_REJECTED
TRANSFER_DISPATCHED
TRANSFER_RECEIVED
TRANSFER_DISCREPANCY
TRANSFER_CANCELLED
TRANSFER_COMPLETED

Audit should capture:

Business
Actor
Transfer
Source
Destination
Product
Quantity
Previous status
New status
Reason
Timestamp
16. Idempotency

Transfer operations must be idempotent.

Examples:

CREATE_TRANSFER
APPROVE_TRANSFER
DISPATCH_TRANSFER
RECEIVE_TRANSFER

A repeated request must not:

Dispatch stock twice
Receive stock twice
Create duplicate ledger movements
Increase destination stock twice
17. Concurrency

The system must protect against concurrent operations on the same stock position.

Example:

Available stock = 10

User A transfers 8
User B transfers 5

Only one operation may consume the overlapping available quantity.

The final state must never produce:

Available = -3

or create duplicate stock movements.

Use the inventory locking/concurrency mechanism established by IP-01 rather than inventing a second mechanism.

18. UI / UX

Provide a simple operational workflow.

Inventory workspace

Show:

Total Stock
Available
Reserved
In Transit
Locations
Open Transfers
Transfer list

Columns:

Transfer #
From
To
Items
Quantity
Status
Requested By
Date
Transfer detail

Show:

Transfer TR-000001

From: Nairobi Warehouse
To: Westlands Store

Product       Qty
Product A     20
Product B     10

Status: IN TRANSIT

Dispatched by: John
Dispatched: 27 Aug 2026

Received: —

Destination user should see:

Receive Transfer

and record the actual quantity received.

Customer-facing screens should not expose:

BP-008
IP-04
ENG-005
ENG-013
Business Rules
ID	Rule
TR-001	Source and destination must be different locations
TR-002	Transfer quantity must be greater than zero
TR-003	Source must have sufficient available stock
TR-004	Reserved stock cannot be transferred by default
TR-005	Dispatch reduces source stock
TR-006	Dispatch creates in-transit stock
TR-007	Dispatch does not increase destination available stock
TR-008	Receipt increases destination stock
TR-009	Receipt quantity may not exceed dispatched quantity unless explicitly supported by policy
TR-010	Partial receipt must remain visible as a discrepancy
TR-011	Transfer cannot be silently cancelled after dispatch
TR-012	Duplicate dispatch/receipt requests must be idempotent
TR-013	All stock movements must be represented in the inventory ledger
TR-014	Cross-business access must fail closed
TR-015	Approval is configuration-driven
TR-016	Maker cannot approve own transfer when SoD applies
TR-017	In-transit stock must not be treated as destination available stock
TR-018	Transfer must retain complete source → destination traceability
Acceptance Criteria
ID	Criterion
AC-001	Business can create a transfer between two configured locations
AC-002	Transfer between the same location is rejected
AC-003	Transfer exceeding available stock is rejected
AC-004	Reserved stock is excluded from transferable quantity
AC-005	Dispatch creates a source stock-out movement
AC-006	Dispatch creates an in-transit position
AC-007	Destination stock does not increase at dispatch
AC-008	Destination receipt increases destination stock
AC-009	Full receipt completes the transfer
AC-010	Partial receipt records the actual received quantity and discrepancy
AC-011	Duplicate receipt cannot increase stock twice
AC-012	Duplicate dispatch cannot reduce source stock twice
AC-013	In-transit stock is visible separately from on-hand stock
AC-014	Transfer respects IP-03 reservations
AC-015	Configured maker-checker prevents maker self-approval
AC-016	Approval can be disabled through configuration
AC-017	Every transfer movement is linked to its transfer record
AC-018	All transfer lifecycle events are audited through ENG-013
AC-019	Cross-business transfer access fails closed
AC-020	Concurrent transfers cannot drive available stock negative
AC-021	Cancelled pre-dispatch transfers do not affect stock
AC-022	Post-dispatch cancellation cannot simply restore stock without a valid reversal movement
AC-023	No provider/API integrations are introduced
AC-024	No second inventory ledger or stock-balance engine is introduced
Explicitly Excluded from IP-04

Do not implement:

Stock adjustments
Damage/loss processing
Returns
Stocktake/reconciliation
Batch/expiry tracking
Serial tracking
Reorder calculations
Low-stock alerts
Supplier purchasing
Inventory valuation
Accounting/GL
Revenue assurance
Collections
IP-05 adjustment workflows
IP-06 stocktake
IP-07 batch/expiry/serial
IP-08 reorder controls
IP-09 exception operations
Architectural boundary

IP-04 should therefore be viewed as:

IP-01
Inventory Foundation
      ↓
IP-02
Receiving / Opening Stock
      ↓
IP-03
Reservation / Sales Deduction
      ↓
IP-04
MULTI-LOCATION TRANSFERS
      ↓
┌──────────────┬──────────────┬──────────────┐
IP-05          IP-06          IP-07
Adjustments    Stocktake      Batch/Serial
      ↓
IP-08
Reorder & Controls
      ↓
IP-09
Operations / Exceptions
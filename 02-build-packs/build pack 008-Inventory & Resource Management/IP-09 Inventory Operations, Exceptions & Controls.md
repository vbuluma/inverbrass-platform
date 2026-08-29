BP-008 IP-09 — Inventory Operations, Exceptions & Controls
Attribute	Description
Implementation Package	IP-09
Build Pack	BP-008 – Inventory & Resource Management
Priority	High
Depends On	IP-01–IP-08, ENG-005, ENG-013
Scope coverage	SC-028, SC-029, SC-030, SC-031
Related pack FRs	FR-028–FR-032
Objective

Provide a controlled operational layer for inventory exceptions, approvals, investigations, corrections and operational monitoring across the inventory lifecycle.

IP-09 is cross-cutting, not a sequential transaction after IP-08.

Inventory Operation
       ↓
Normal Path ───────────────→ Completed
       │
       └── Exception
              ↓
        OPEN / INVESTIGATING
              ↓
       Resolve / Approve / Reject
              ↓
        Corrective Action
              ↓
           CLOSED

The objective is to ensure that inventory problems are visible, owned, investigated, controlled and auditable, rather than being silently corrected.

Business Problem

Inventory errors rarely occur only because a transaction is missing. They occur when physical stock, system records, locations, quantities, reservations, batches, serials and operational decisions diverge.

Examples:

Stock received does not match the expected quantity.
Barcode cannot be identified.
Duplicate serial is scanned.
Stock becomes unexpectedly negative.
Transfer is dispatched but not received.
Stocktake produces a material variance.
Damaged stock requires disposition.
A reservation cannot be fulfilled.
A user attempts an operation beyond their authority.
An adjustment exceeds the configured approval threshold.
A transaction fails part-way through processing.

These situations should not be solved by editing the stock balance directly.

IP-09 provides the controlled workflow around these conditions. Good inventory controls emphasize visible exceptions, accountable ownership, evidence, approval where required and traceable corrective action.

Scope
Included
1. Inventory Exception Management

Create and manage exceptions arising from IP-01–IP-08.

Example exception types:

UNKNOWN_ITEM
BARCODE_NOT_FOUND
DUPLICATE_SERIAL
NEGATIVE_STOCK
OVER_RECEIPT
SHORT_RECEIPT
DAMAGED_STOCK
LOCATION_MISMATCH
TRANSFER_MISMATCH
RESERVATION_SHORTAGE
STOCKTAKE_VARIANCE
ADJUSTMENT_THRESHOLD
EXPIRY_EXCEPTION
DUPLICATE_TRANSACTION
FAILED_OPERATION
STALE_PENDING_OPERATION
UNAUTHORIZED_OPERATION
SYSTEM_PROCESSING_ERROR

Exception types should be catalogue/configuration driven, not hard-coded throughout the UI.

2. Exception Lifecycle
OPEN
  ↓
INVESTIGATING
  ↓
ACTION_REQUIRED
  ↓
RESOLVED
  ↓
CLOSED

Alternative controlled outcomes:

OPEN → REJECTED
OPEN → CANCELLED
INVESTIGATING → ESCALATED

Invalid state jumps must fail closed.

An exception cannot simply disappear because the underlying inventory number was changed.

3. Exception Ownership

Every material exception must have:

Exception owner
Business/location
Inventory item/resource
Related transaction
Related stock ledger entry where applicable
Severity
Priority
Created date/time
Due date/SLA where configured
Current status
Resolution action
Resolution reason
Supporting evidence
Closure actor/date

One person should be accountable for resolution even where several people contribute.

4. Configurable Severity

Support configurable severity:

Severity	Example
LOW	Minor barcode/data issue
MEDIUM	Small stock variance
HIGH	Material variance or repeated operational failure
CRITICAL	Significant stock loss, systemic failure or high-value exposure

Severity should drive escalation and approval requirements where configured.

5. Maker-Checker Controls

IP-09 is the operational control point for inventory maker-checker.

The business must be able to configure whether maker-checker is required for defined inventory operations.

Examples:

Adjustment > KES 50,000
        ↓
Maker submits
        ↓
APPROVAL_PENDING
        ↓
Checker approves
        ↓
Adjustment posted

Configuration should support:

Operation type
Threshold
Location
Item/category
Severity
User role
Approval requirement
Number of approval levels where supported
Self-approval prohibited

Maker-checker should not be hard-coded as mandatory for every operation.

Normal low-risk operations can proceed without approval where business policy allows. Risk-based controls and thresholds are commonly used to avoid forcing supervisor approval onto every minor variance.

6. Investigation

An exception investigation should support:

Review related transactions
Review stock ledger
Review item/location history
Review reservation/transfer/receipt/count records
Record investigation notes
Attach evidence
Identify root cause
Record corrective action
Assign/reassign owner
Escalate

Root cause should be structured rather than free text only.

Example:

SUPPLIER_VARIANCE
WAREHOUSE_ERROR
DATA_ENTRY
BARCODE_ERROR
SYSTEM_ERROR
TIMING
DAMAGE
LOSS
MASTER_DATA
USER_ERROR
UNKNOWN
7. Controlled Resolution

Resolution must reference the correct business transaction.

For example:

Stocktake variance
       ↓
Investigation
       ↓
Confirmed shortage
       ↓
IP-05 adjustment
       ↓
Adjustment posted
       ↓
Exception resolved

IP-09 should not create a parallel stock ledger.

It orchestrates/controls the resolution and invokes the appropriate inventory capability from IP-01–IP-08.

8. No Direct Balance Editing

This is a critical invariant.

IP-09 must never allow:

Stock = 100
      ↓
User edits
Stock = 95

Instead:

Stock = 100
      ↓
Exception
      ↓
Approved adjustment -5
      ↓
Stock ledger transaction
      ↓
Stock = 95

The inventory ledger remains the authoritative source of stock movement.

9. Safe Operational Retry

For operations that fail or remain unresolved:

Do not blindly repeat a transaction.
Determine whether the original operation was accepted.
Query the relevant operation where supported.
Retry only when the system can establish that the original operation was not accepted.
Use a new operation/idempotency context for an approved retry.
Preserve linkage between original and retry.

This follows the same safety principle already established in BP-007.

10. Escalation

Support configurable escalation based on:

Severity
SLA/TAT
Value
Location
Item/category
Exception type
Repeated occurrence
Business impact

Example:

HIGH exception
      ↓
Owner assigned
      ↓
SLA expires
      ↓
Escalate
      ↓
Supervisor
      ↓
Manager

Escalation should preserve the complete exception history rather than creating a new disconnected issue.

11. Operational Dashboard

Provide an inventory operations workspace showing:

KPIs
Open exceptions
Investigating
Awaiting approval
Overdue
High/Critical
Resolved today
Repeated exceptions
Exceptions by location
Exceptions by item/category
Queues
All
Open
Investigating
Awaiting Approval
Escalated
Overdue
Resolved
Closed

Filters:

Location
Item
Category
Exception type
Severity
Status
Owner
Date range
Transaction type
12. Audit

All material actions must be audited through ENG-013.

Examples:

EXCEPTION_CREATED
EXCEPTION_ASSIGNED
EXCEPTION_INVESTIGATED
EXCEPTION_ESCALATED
EXCEPTION_APPROVAL_REQUESTED
EXCEPTION_APPROVED
EXCEPTION_REJECTED
EXCEPTION_RESOLVED
EXCEPTION_CLOSED
EXCEPTION_REOPENED
RETRY_REQUESTED

Audit must capture:

Business
Actor
Exception
Related inventory transaction
Action
Previous status
New status
Reason
Timestamp

No credentials, secrets or sensitive authentication data.

13. Tenant Isolation

Every IP-09 operation must use the authenticated businessId.

Cross-business:

Read
Update
Assign
Approve
Resolve
Close
Retry

must fail closed.

14. Integration Boundaries

IP-09 orchestrates existing capabilities.

Capability	Owner
Stock ledger	IP-01
Receiving	IP-02
Reservation/sales deduction	IP-03
Transfers	IP-04
Adjustments/damage/loss/returns	IP-05
Stocktake/reconciliation	IP-06
Batch/expiry/serial	IP-07
Reorder/control signals	IP-08
Approval	ENG-005
Audit	ENG-013

Do not duplicate these engines inside IP-09.

15. Exception Evidence

Exceptions should support evidence appropriate to the operation:

Photos
Documents
Delivery notes
Count sheets
Barcode/serial evidence
Related transaction references
Investigation notes

Document storage/delivery should use existing platform engines rather than creating a new document engine.

16. Acceptance Criteria
ID	Criterion
AC-001	Inventory exceptions can be created from controlled inventory operations
AC-002	Every material exception has an owner, severity and status
AC-003	Exception lifecycle prevents invalid status transitions
AC-004	Exception resolution cannot directly edit stock balance
AC-005	Resolution must reference an appropriate inventory transaction/correction
AC-006	Business can configure maker-checker requirements for defined inventory operations
AC-007	Maker cannot approve own transaction when SoD is configured
AC-008	Approval requirements can be threshold/configuration driven
AC-009	Unknown/uncertain operations cannot be blindly retried
AC-010	Retry is allowed only after the system establishes the original operation was not accepted
AC-011	Exceptions can be assigned, reassigned and escalated
AC-012	Overdue exceptions are identifiable
AC-013	Investigation supports root cause and corrective action
AC-014	All material exception actions are audited through ENG-013
AC-015	Cross-business exception access fails closed
AC-016	Exception resolution does not create a second stock ledger
AC-017	Operational dashboard exposes open, overdue, high-risk and approval queues
AC-018	Repeated exceptions can be identified
AC-019	IP-09 does not duplicate IP-01–IP-08 business logic
AC-020	Customer/staff UI uses operational language and does not expose BP/IP/ENG terminology
Do Not Implement

IP-09 must not become another inventory transaction engine.

Do not implement:

New stock ledger
New receiving engine
New reservation engine
New transfer engine
New adjustment engine
New stocktake engine
New batch/serial engine
New reorder engine
GL posting
Inventory valuation
Supplier/AP
Sales
Collections
Procurement
Live external warehouse integrations
New barcode/scan engine
Direct database stock-balance manipulation
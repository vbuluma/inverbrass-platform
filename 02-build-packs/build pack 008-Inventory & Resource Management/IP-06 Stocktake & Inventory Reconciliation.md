BP-008 IP-06 – Stocktake & Inventory Reconciliation
Attribute	Description
Implementation Package	IP-06
Build Pack	BP-008 – Inventory & Resource Management
Priority	High
Depends On	IP-01, IP-02, IP-03, IP-04, IP-05, ENG-005, ENG-013
Scope coverage	Stocktake & Inventory Reconciliation
Related capabilities	Inventory Ledger, Product Catalogue, Locations, Workflow, Audit
Objective

Provide a controlled process to:

initiate a physical stocktake
establish the system quantity at the stocktake point
capture physical counts
calculate quantity/value variance
investigate/review variances
approve reconciliation
hand off required stock corrections to IP-05
maintain a complete audit trail

The stocktake does not directly rewrite inventory balances.

IP-06 identifies and controls the variance; IP-05 performs the inventory adjustment.

Business Problem

Without controlled stocktakes, SMEs cannot reliably determine whether physical stock agrees with system stock.

For example:

System stock       100 units
Physical count      96 units
                   ─────────
Variance            -4 units

IP-06 must answer:

"What did we physically count, what did the system expect, and what variance requires correction?"

IP-05 answers:

"How is that approved variance posted as an inventory adjustment?"

Scope
Included
Stocktake
Create stocktake
Select business/location
Define stocktake scope
Capture products expected to be counted
Freeze/snapshot system quantity
Record physical counts
Support zero-count items
Calculate variance
Review variance
Approve/reject reconciliation
Generate adjustment handoff to IP-05
Track reconciliation status
Audit all actions
Reconciliation

Calculate:

Variance Quantity
= Physical Quantity − System Quantity

Where valuation is available:

Variance Value
= Variance Quantity × Applicable Unit Cost

Use the existing inventory valuation rules.

Do not create another valuation engine.

Excluded

Do NOT implement:

actual inventory adjustment posting — IP-05
damage/loss processing — IP-05
returns — IP-05
stock reservation — IP-03
sales deduction — IP-03
stock transfers — IP-04
batch/expiry/serial tracking — IP-07
reorder controls — IP-08
inventory exception operations — IP-09
supplier bills — BP-009
GL posting — BP-010
cashbook
Revenue Assurance
external stocktake devices/integrations
Stocktake Lifecycle

Recommended:

DRAFT
  ↓
OPEN
  ↓
COUNTING
  ↓
COUNT_COMPLETE
  ↓
UNDER_REVIEW
  ↓
APPROVED
  ↓
RECONCILIATION_PENDING
  ↓
RECONCILED

Alternative terminal states:

CANCELLED
REJECTED

Important:

APPROVED does not mean stock has been changed.

Approval authorizes the reconciliation outcome.

The actual quantity correction occurs through IP-05.

1. Create Stocktake

A stocktake should identify:

stocktake number
business
location
stocktake date/time
scope
status
initiated by
count responsibility
notes

Example:

STK-000001

Location: Main Warehouse
Date: 27 Aug 2026

Products:
Product A
Product B
Product C

Use the existing numbering mechanism where available.

Do not create a separate local numbering engine.

2. Stocktake Scope

Support controlled stocktake scope.

At minimum:

Full location
Main Warehouse
→ all inventory products
Selected products
Main Warehouse
→ Product A
→ Product B
→ Product C

The design should allow future extension to more sophisticated scopes without hard-coding the current UI selection logic.

3. System Quantity Snapshot

When the stocktake is opened/counting begins, capture the system quantity relevant to the stocktake.

Example:

Product A

System quantity at snapshot = 100

That snapshot becomes the reconciliation baseline.

Do not continuously recalculate the original system quantity while the physical count is being reviewed.

Otherwise:

System = 100
Physical = 96

Later sale = -10

System becomes 90

Variance incorrectly becomes +6

The stocktake needs a defined system baseline.

4. Stock Movement During Stocktake

The business may or may not physically stop movement during a stocktake.

Do not assume stock movement is automatically blocked unless that capability is explicitly configured.

The stocktake must therefore distinguish:

snapshot quantity
subsequent ledger movements
physical count

If the platform supports a stocktake lock/freeze policy, consume the existing configuration.

Do not build a separate inventory locking engine.

5. Physical Count

For each stocktake line capture:

product
location
system quantity snapshot
physical quantity
unit of measure
applicable unit cost
variance quantity
variance value
notes

Example:

Product A
System:   100
Counted:   96
Variance:  -4

Zero is a valid physical count:

System: 20
Counted: 0
Variance: -20

Do not interpret zero as "not counted."

A missing count should remain explicitly uncounted.

6. Variance Calculation

Use:

varianceQty = physicalQty - snapshotQty

Therefore:

Positive = excess stock
Negative = shortage
Zero     = no variance

Example:

Product	System	Physical	Variance
A	100	96	-4
B	50	55	+5
C	20	20	0

Do not allow users to manually type the variance.

The system calculates it.

7. Variance Value

Where inventory valuation is available:

varianceValue = varianceQty × applicableUnitCost

Example:

Variance = -4
Unit cost = KES 500

Variance value = -KES 2,000

The valuation must come from the existing inventory valuation rules.

Do not allow IP-06 to create its own valuation methodology.

8. No Direct Stock Mutation

This is a critical architectural rule.

IP-06 must never do:

stockQuantity = physicalQuantity

or:

stockQuantity += variance

The correct flow is:

Physical Count
      ↓
Variance
      ↓
Review
      ↓
Approval
      ↓
Adjustment Handoff
      ↓
IP-05
      ↓
Inventory Ledger Adjustment
      ↓
New Stock Balance

The original ledger history remains intact.

9. Reconciliation Handoff

After approval, IP-06 creates a controlled reconciliation/adjustment instruction for IP-05.

Example:

Stocktake:
STK-000001

Product A
System = 100
Physical = 96
Variance = -4

        ↓

Adjustment instruction
Type = STOCKTAKE_VARIANCE
Quantity = -4
Source = STK-000001

        ↓

IP-05
        ↓
Inventory adjustment ledger movement

The handoff must contain enough provenance to trace:

Stocktake
→ Stocktake line
→ Variance
→ IP-05 adjustment
→ Inventory ledger movement

IP-06 must not duplicate IP-05 adjustment logic.

10. Zero Variance

A zero-variance line:

System = 100
Physical = 100
Variance = 0

does not require an adjustment.

The stocktake can be reconciled without generating an IP-05 adjustment for that line.

11. Positive and Negative Variance

Support both:

Shortage
System = 100
Physical = 96
Variance = -4
Surplus
System = 100
Physical = 103
Variance = +3

Both require the same controlled review process.

Do not assume stocktake variance is always a loss.

12. Recount

The process should support recount before final reconciliation.

Example:

Initial count = 96
       ↓
Variance = -4
       ↓
Recount requested
       ↓
Second count = 98
       ↓
Final variance = -2

Maintain the history of counts rather than silently overwriting the first count.

A business should be able to see:

original count
recount
final accepted count
who performed each count
timestamps
reason for recount where applicable
13. Maker-Checker

IP-06 must respect the configurable inventory control policy.

The business may determine whether stocktake approval requires maker-checker.

Where required:

Count completed
      ↓
Maker submits
      ↓
Checker reviews
      ↓
Approve / Reject

Rules:

Maker cannot approve own reconciliation where SoD applies.
Approval must go through ENG-005.
Rejection requires a reason.
Approval/rejection is audited.
Approval does not directly mutate stock.

Where maker-checker is not required, the configured workflow may permit direct reconciliation/handoff.

Do not hard-code maker-checker as universally mandatory.

14. Variance Thresholds

If the platform already has configurable inventory control thresholds, IP-06 may consume them.

Examples:

Variance quantity threshold
Variance percentage threshold
Variance value threshold

Example:

System = 1,000
Physical = 990
Variance = -10
Variance % = -1%

A threshold may require additional review.

However:

Do not build a new generic controls engine in IP-06.

If threshold configuration is not already available, keep the architecture ready for IP-08/IP-09 rather than introducing an isolated control framework.

15. Reconciliation Status

A stocktake should distinguish:

COUNTING

from:

REVIEW

and:

RECONCILED

A stocktake should not become RECONCILED merely because physical counts were entered.

Correct:

Counts entered
      ↓
Variance calculated
      ↓
Review
      ↓
Approval
      ↓
Adjustment handoff
      ↓
Reconciled

Where an adjustment is required, final reconciliation should reflect whether the IP-05 handoff was successfully accepted/posted.

16. Idempotency

Reconciliation must be idempotent.

Repeated reconciliation must not generate duplicate IP-05 adjustment instructions.

Example:

RECONCILE:STK-000001

Repeated request:

→ existing reconciliation result
→ no second adjustment instruction

Use the platform's existing tenant-scoped idempotency mechanism.

17. Concurrency

Prevent two users/processes from reconciling the same stocktake simultaneously.

Example:

User A → Approve/Reconcile
User B → Approve/Reconcile

Result:
one reconciliation
one adjustment handoff

Use the platform's existing locking/concurrency patterns where available.

Do not create duplicate reconciliation records.

18. Immutability

Once reconciliation is finalized:

count history remains immutable
accepted physical count remains immutable
variance remains immutable
reconciliation decision remains immutable

Corrections after reconciliation should use a new controlled stocktake or IP-05 adjustment process.

Do not edit historical stocktake results in place.

19. Audit

Use ENG-013.

At minimum:

Stocktake
STOCKTAKE_CREATED
STOCKTAKE_OPENED
STOCKTAKE_COUNTING_STARTED
STOCKTAKE_COUNT_COMPLETED
STOCKTAKE_SUBMITTED
STOCKTAKE_CANCELLED
Counts
STOCK_COUNT_RECORDED
STOCK_COUNT_RECOUNTED
Reconciliation
STOCKTAKE_REVIEWED
STOCKTAKE_APPROVED
STOCKTAKE_REJECTED
STOCKTAKE_RECONCILIATION_CREATED
STOCKTAKE_RECONCILED

Include:

business
actor
stocktake
product
location
system quantity
physical quantity
variance
action
reason
timestamp

Never log credentials/secrets.

20. Tenant Isolation

context.businessId remains authoritative.

Every operation must be tenant scoped:

stocktake creation
stocktake retrieval
count entry
recount
review
approval
rejection
reconciliation
adjustment handoff

Cross-business access must fail closed.

21. UI / UX

Add an operational inventory area such as:

Inventory
 ├── Stock
 ├── Receive Stock
 ├── Opening Balances
 ├── Stocktakes
 └── ...
Stocktake workspace

Show:

Stocktake number
Location
Date
Status
Number of products
Products counted
Products remaining
Variance count
Variance value

Example:

Stocktake #STK-000001

Main Warehouse
27 Aug 2026

Products        125
Counted         125
Variances        18
Variance value  -KES 12,450

[Review Reconciliation]
22. Count UI

For each item:

Product A
System quantity: 100

Physical count: [96]

Variance: -4

Do not ask the user to manually enter variance.

Support:

zero
positive count
negative count is invalid
recount
notes

The UI should make it difficult to accidentally confuse system quantity with physical quantity.

23. Reconciliation UI

Show a clear comparison:

Product	System	Counted	Variance	Action
Product A	100	96	-4	Adjustment
Product B	50	50	0	None
Product C	20	23	+3	Adjustment

The user should understand exactly what will happen before approval.

Customer-facing terminology is not required; this is an operational staff workflow.

Do not expose:

BP-008
IP-06
ENG-005
ENG-013

to ordinary users.

24. Integration with IP-05

IP-06 must expose a clean handoff contract to IP-05.

Conceptually:

StocktakeReconciliation
{
    stocktakeId,
    businessId,
    locationId,
    productId,
    systemQuantity,
    physicalQuantity,
    varianceQuantity,
    varianceValue,
    reason,
    sourceType: STOCKTAKE_VARIANCE
}

IP-05 then decides how the actual inventory adjustment is created and posted.

Do not duplicate IP-05's adjustment rules inside IP-06.

25. Integration with Inventory Ledger

IP-06 reads the IP-01 ledger/balance state to establish the system quantity.

It does not become another inventory balance source.

Correct:

Inventory Ledger
       ↓
System Snapshot
       ↓
Stocktake
       ↓
Physical Count
       ↓
Variance

Incorrect:

Stocktake maintains its own permanent stock balance
26. Architecture Rules
Reuse
IP-01 inventory ledger
IP-02 receiving/opening balances
IP-03 reservation/deduction state where relevant
IP-04 location/transfer model
IP-05 adjustment capability
ENG-005 workflow
ENG-013 audit
existing numbering
existing idempotency
existing tenant context
Do not create
second stock ledger
second adjustment engine
second workflow engine
second audit engine
GL posting
supplier/AP logic
valuation engine
stock reservation engine
transfer engine
27. Critical Financial/Inventory Invariants

The implementation must preserve:

System Quantity
    = inventory ledger-derived quantity

and:

Variance
    = Physical Count − System Snapshot

and:

IP-06 does not directly change inventory quantity

and:

IP-05 adjustment
    = mechanism that changes ledger quantity

Also:

zero variance produces no adjustment
positive variance is allowed
negative variance is allowed
uncounted is not equivalent to zero
rejected reconciliation does not change stock
duplicate reconciliation does not create duplicate adjustment
amount/value calculations do not change commercial sales data
28. Acceptance Criteria
ID	Criterion
AC-001	User can create a stocktake for a valid business/location
AC-002	Stocktake captures a defined system quantity snapshot
AC-003	Physical quantity can be recorded per product
AC-004	Zero is accepted as a valid physical count
AC-005	Uncounted products remain distinguishable from zero
AC-006	Variance is calculated as physical − system
AC-007	Positive and negative variances are supported
AC-008	Zero variance produces no adjustment requirement
AC-009	Recount preserves count history
AC-010	Maker-checker is respected when configured
AC-011	Maker cannot self-approve where SoD applies
AC-012	Rejected reconciliation does not change inventory
AC-013	Approved reconciliation produces a controlled IP-05 adjustment handoff
AC-014	IP-06 does not directly mutate inventory stock
AC-015	Duplicate reconciliation is idempotent
AC-016	Historical stocktake results cannot be overwritten after finalization
AC-017	Tenant isolation is enforced
AC-018	All material actions are audited
AC-019	System quantity is derived from the IP-01 inventory foundation
AC-020	No second inventory ledger is introduced
AC-021	Inventory movement during stocktake does not silently rewrite the original snapshot
AC-022	IP-05 remains the authority for actual inventory adjustment posting
29. Tests

Create:

03-platform/scripts/bp008-ip06-stocktake-inventory-reconciliation-smoke-validation.ts

At minimum test:

Stocktake
Create stocktake
Valid location
Invalid/cross-business location rejected
System snapshot captured
Multiple products included
Open/counting lifecycle
Counting
Record physical count
Zero physical count
Uncounted remains distinct
Positive variance
Negative variance
Zero variance
Recount preserves history
Reconciliation
Variance calculated correctly
Variance value calculated correctly where applicable
Review state
Approval
Rejection
Maker-checker
Self-approval blocked
Idempotent reconciliation
Duplicate handoff prevented
IP-05 boundary
Approved variance creates IP-05 handoff
IP-06 does not directly mutate stock
IP-05 adjustment changes stock through the ledger
Zero variance creates no adjustment
Isolation / architecture
Cross-business stocktake access fails
No second inventory ledger
No direct stock balance mutation
No supplier/AP implementation
No GL implementation
No IP-07 batch/serial implementation
No IP-08 reorder implementation
No IP-09 exception engine
30. Regression

Run:

IP-06 smoke
IP-01 regression
IP-02 regression
IP-03 regression
IP-04 regression
IP-05 regression
relevant BP-006 regression
lint
TypeScript typecheck
migration validation

Clearly separate:

NEW FAILURES

from:

PRE-EXISTING FAILURES

Do not modify unrelated modules simply to eliminate pre-existing failures.

31. Do Not Implement

STOP at IP-06.

Do not implement:

IP-07 Batch, Expiry & Serial Resource Tracking
IP-08 Reorder & Inventory Controls
IP-09 Inventory Operations, Exceptions & Controls
BP-009 Supplier Bills/AP
BP-010 GL
SC-032 Collections
external stocktake hardware
external inventory integrations
Key architectural decision

The most important boundary for this IP is:

             IP-06
       STOCKTAKE & RECONCILIATION
                 │
                 ▼
       Physical Count vs Snapshot
                 │
                 ▼
             Variance
                 │
           Approval
                 │
                 ▼
        IP-05 Adjustment Handoff
                 │
                 ▼
        Inventory Ledger Movement
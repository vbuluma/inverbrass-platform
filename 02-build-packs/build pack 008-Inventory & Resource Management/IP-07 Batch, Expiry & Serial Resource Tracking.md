BP-008 IP-07 – Batch, Expiry & Serial Resource Tracking
Attribute	Description
Implementation Package	IP-07
Build Pack	BP-008 – Inventory & Resource Management
Priority	High
Depends On	IP-01, IP-02, IP-03, IP-04, IP-05, IP-06, ENG-003b, ENG-005, ENG-013
Scope coverage	Inventory traceability, batch/lot tracking, expiry management, serialised inventory
Related pack FRs	To be mapped in BP-008 FR catalogue
1. Objective

Provide configurable batch, lot, expiry and serial-number tracking for products that require item-level or lot-level traceability.

IP-07 determines how stock is identified and traced.

It does not own the underlying stock movement.

Stock Movement
      ↓
IP-07 Tracking
      ↓
Batch / Lot / Serial / Expiry
      ↓
Traceability
2. Business Problem

Without controlled tracking:

businesses cannot identify which batch a product came from;
expired stock can accidentally be sold;
serialised assets cannot be traced to individual units;
recalls cannot identify affected stock;
stock movements lose batch/serial provenance;
users may manually type inconsistent serial numbers;
the same serial number can accidentally exist against multiple active stock units.

IP-07 provides the tracking layer that other inventory operations consume.

3. Scope
Included
A. Tracking configuration

Products should support configurable tracking modes:

Tracking Mode	Description
NONE	Quantity-only inventory
BATCH	Stock tracked by batch/lot
EXPIRY	Stock tracked by expiry date
BATCH_EXPIRY	Batch and expiry tracked together
SERIAL	Individual units tracked by serial number

Tracking configuration should be product-driven, not hard-coded by IP.

B. Batch / Lot management

Capture and maintain:

Batch/lot number
Product
Location
Quantity
Manufacturing date, where applicable
Expiry date, where applicable
Supplier/batch reference
Status
Source transaction
Creation date
Relevant metadata

A batch should be traceable across inventory movements.

C. Serial number management

For serialised products:

capture serial number;
validate uniqueness;
associate serial with product;
associate serial with location;
track current status;
track source movement;
track subsequent movements;
prevent duplicate active serials.

Example:

Product: Laptop Model X

SN001 → Nairobi Warehouse
SN002 → Nairobi Warehouse
SN003 → Customer / Sold
D. Expiry management

Capture:

expiry date;
expiry status;
days until expiry;
expired status;
configurable warning threshold.

Example:

Expiry Date: 30 Sep 2026

> 30 days       NORMAL
8–30 days       EXPIRING_SOON
1–7 days        EXPIRING
Past date       EXPIRED

Thresholds should be configurable rather than hard-coded.

E. Stock traceability

Provide traceability such as:

Batch BATCH-001
      ↓
Received from Supplier X
      ↓
Warehouse A
      ↓
Transferred to Shop B
      ↓
Reserved
      ↓
Sold on SO-000123

For serialised products:

Serial SN001
      ↓
Received
      ↓
Transferred
      ↓
Reserved
      ↓
Sold

IP-07 should provide the tracking history, while the originating IP remains responsible for the business transaction.

F. Batch/serial allocation validation

When another IP attempts a movement involving a tracked product, IP-07 should validate:

tracking requirement;
valid batch/serial;
available quantity;
correct location;
expiry status;
serial uniqueness;
serial availability;
whether the batch/serial can be consumed.

Example:

Sale
 ↓
Product requires SERIAL
 ↓
Serial number required
 ↓
Validate SN001
 ↓
Available at selling location?
 ↓
YES → allow allocation
NO  → reject
4. Expiry Controls

IP-07 should support configurable policies for:

Expired stock

Default:

EXPIRED → cannot be sold

But the policy should be configurable where the business legitimately needs another behaviour.

Near-expiry stock

The system should identify:

expiring soon;
expired;
available quantity;
location;
batch.

This information should be consumable by IP-08 Inventory Controls.

5. FEFO Support

IP-07 should expose expiry information required for FEFO — First Expiry, First Out.

However:

IP-07 provides the tracking data; it does not own the stock reservation/deduction process.

For example:

BATCH A → expires 10 Sep → 100 units
BATCH B → expires 20 Sep → 200 units
BATCH C → expires 30 Sep → 150 units

Sale = 120

FEFO recommendation:
100 from A
20 from B

The actual reservation/deduction remains with IP-03.

6. Integration with Other IPs
IP	IP-07 relationship
IP-01 Foundation	Tracking records reference the inventory ledger
IP-02 Receiving	Capture batch/expiry/serial when stock enters inventory
IP-03 Reservation & Sales Deduction	Validate and consume batch/serial stock
IP-04 Transfers	Track batch/serial movement between locations
IP-05 Adjustments/Loss/Returns	Track affected batch/serial
IP-06 Stocktake	Count and reconcile tracked inventory
IP-07	Owns tracking identity and traceability
IP-08 Controls	Consumes expiry, ageing and tracking information
IP-09 Operations	Handles operational exceptions involving tracking

This prevents IP-07 from becoming a duplicate inventory movement engine.

7. Tracking Rules
Rule 1 — Product configuration controls tracking

Do not use:

if product.category == "medicine"

Use configurable product tracking metadata.

Rule 2 — Tracking cannot be silently bypassed

If a product requires serial tracking:

Serial missing → transaction rejected

If batch tracking is mandatory:

Batch missing → transaction rejected
Rule 3 — Serial numbers are unique

A serial number cannot represent two active units of the same product.

Rule 4 — Batch quantities must reconcile

For batch-tracked inventory:

Batch quantity
≤
Available inventory quantity

The system must prevent negative batch quantities.

Rule 5 — Historical traceability is immutable

Completed movements should not be rewritten simply because the current batch/serial information changes.

Corrections should use the appropriate inventory adjustment process.

Rule 6 — Expiry is evaluated at transaction time

A batch that becomes expired should not require a manual transaction to become recognised as expired.

Expiry status should be derived from:

Current Date
+
Expiry Date
+
Configured Policy
8. Barcode / Scanning Integration

IP-07 should support identification through:

barcode;
QR code;
GS1-style identifiers where supported;
serial scanning;
batch scanning.

But scanning remains an input mechanism, not a separate inventory process.

For example:

Barcode scanned
      ↓
Resolve product
      ↓
Resolve batch / serial
      ↓
IP-07 validates tracking
      ↓
Calling IP completes movement
9. Maker-Checker

IP-07 should not automatically require maker-checker for every tracking operation.

Whether approval is required should come from the platform/business control configuration established for inventory operations.

Examples:

Operation	Possible approval
Add batch	Configurable
Register serial	Configurable
Correct serial	Potentially required
Change expiry	Potentially required
Retire serial	Potentially required
Bulk tracking upload	Potentially required

When approval is required:

Maker
 ↓
Pending Approval
 ↓
Checker
 ↓
Approved / Rejected

Self-approval must be prevented where SoD applies.

10. Bulk Tracking Capture

IP-07 should support bulk capture where appropriate, especially for:

batch uploads;
serial number uploads;
barcode-based capture.

However, the capture mechanism should reuse the validation and posting services rather than creating a separate bulk-processing engine.

Example:

CSV Upload
    ↓
Validate
    ↓
Preview
    ↓
Errors?
 ┌──┴──┐
YES   NO
 ↓     ↓
Fix   Submit
       ↓
 IP-07 tracking service
11. Audit

All material tracking changes should be auditable through ENG-013.

Examples:

batch created;
batch updated;
serial registered;
serial assigned;
serial transferred;
serial status changed;
expiry changed;
tracking configuration changed;
tracking exception;
bulk tracking upload;
approval requested;
approved/rejected.

Audit should capture:

business;
actor;
timestamp;
product;
batch/serial;
previous value;
new value;
reason;
originating transaction.

No sensitive credentials should be logged.

12. Tenant Isolation

Every operation must use the authenticated businessId.

Cross-business access must fail closed.

Business A
  ↓
Batch/Serial A

Business B
  ↓
Batch/Serial B

Business A must never be able to query, modify or allocate Business B's tracking records.

13. Status Models
Batch
ACTIVE
QUARANTINED
EXPIRED
DEPLETED
CLOSED
Serial
AVAILABLE
RESERVED
SOLD
TRANSFERRED
DAMAGED
LOST
RETURNED
RETIRED

These statuses should be driven by legitimate inventory events rather than arbitrary manual edits.

14. Acceptance Criteria
ID	Criterion
AC-001	Product can be configured as NONE, BATCH, EXPIRY, BATCH_EXPIRY or SERIAL tracked
AC-002	Batch-tracked stock cannot be received without required batch information
AC-003	Serial-tracked stock cannot be received without serial numbers
AC-004	Duplicate active serial numbers are rejected
AC-005	Batch quantities cannot exceed available inventory or become negative
AC-006	Expired stock is identified automatically from expiry date and configured policy
AC-007	Configured expiry controls can prevent consumption of expired stock
AC-008	Batch/serial information is preserved across receiving, reservation, transfer, adjustment and stocktake
AC-009	Historical batch/serial movements remain traceable
AC-010	FEFO data can be supplied to IP-03 without IP-07 performing the reservation itself
AC-011	Barcode/QR/serial scanning resolves tracking information without creating a separate movement engine
AC-012	Bulk batch/serial capture uses the same validation rules as manual capture
AC-013	Configured maker-checker is enforced for controlled tracking operations
AC-014	Maker cannot approve own action where SoD applies
AC-015	All material tracking changes are audited through ENG-013
AC-016	Cross-business tracking access fails closed
AC-017	Tracking configuration is data-driven and does not depend on hard-coded product/category logic
AC-018	IP-07 does not independently change commercial sales amounts, tax or payment obligations
AC-019	IP-07 does not create duplicate stock ledger movements
AC-020	Tracking information remains available for downstream inventory controls and reporting
15. Explicit Non-Goals

Do not implement:

sales reservation;
sales deduction;
stock receiving;
stock transfers;
stock adjustments;
stocktake reconciliation;
reorder generation;
supplier purchasing;
GL posting;
payment processing;
customer billing;
collections;
warehouse management;
manufacturing/MRP;
live IoT/RFID infrastructure;
external barcode-provider integrations;
a separate approval engine;
a separate audit engine.

Those remain owned by their respective IPs/engines.

16. Architectural Boundary

The key principle for IP-07 is:

IP-07 owns inventory identity and traceability, not inventory movement.

             INVENTORY MOVEMENT
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
   Receiving     Transfer      Sale
    IP-02         IP-04        IP-03
       │            │            │
       └────────────┼────────────┘
                    ↓
             IP-07 TRACKING
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
     Batch        Serial       Expiry
       │            │            │
       └────────────┼────────────┘
                    ↓
              Traceability
                    ↓
                 IP-08
                Controls
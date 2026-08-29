BP-008 IP-03 – Stock Reservation & Sales Deduction
Attribute	Description
Implementation Package	IP-03
Build Pack	BP-008 – Inventory & Resource Management
Priority	Critical
Depends On	IP-01, IP-02, BP-006, ENG-013
Scope coverage	SC-022, SC-023
Related pack FRs	FR-XXX–FR-XXX
Objective

Manage the inventory impact of a confirmed sale by supporting:

Stock availability checking
Stock reservation
Reservation release
Reservation conversion to stock deduction
Stock deduction when a sale is fulfilled
Prevention of overselling
Linkage between sales/order lines and inventory movements

Inventory deduction must originate from the confirmed sales/fulfilment lifecycle, not from a payment event.

BP-006 Confirmed Sale
        ↓
Inventory Availability
        ↓
Reserve Stock
        ↓
Sales Fulfilment
        ↓
Deduct Stock
        ↓
Inventory Movement
        ↓
Updated Available / On-Hand

Payment status is not the trigger for stock deduction.

Business Problem

Without controlled reservation and deduction:

Two customers can purchase the same stock simultaneously.
Sales can exceed available inventory.
Payment and inventory become incorrectly coupled.
Cancelled/unfulfilled orders can leave stock unavailable.
Staff may manually change stock to compensate for sales.
Inventory movements cannot reliably be traced back to the originating sale.

IP-03 establishes the inventory-to-sales boundary.

Scope
Included
Inventory availability calculation
Available-to-sell quantity
Stock reservation
Reservation against sales/order lines
Reservation reference
Reservation quantity
Reservation status
Reservation expiry where configured
Reservation release
Partial reservation
Full reservation
Conversion of reservation into stock deduction
Direct stock deduction where reservation is not required by configuration
Inventory movement for every stock deduction
Linkage to BP-006 sales/order/fulfilment reference
Multi-line sales
Multiple sales against the same inventory item
Concurrency protection
Idempotency
Tenant isolation
Audit through ENG-013
Configurable negative-stock policy
Configurable reservation policy
Inventory availability display
Excluded
Manual stock adjustments — IP-05
Damage/loss/write-off — IP-05
Customer returns — IP-05
Stocktake — IP-06
Stock transfers — IP-04
Batch/expiry/serial tracking — IP-07
Reorder — IP-08
Exception operations — IP-09
Purchasing/receiving — IP-02
Inventory valuation
COGS
GL posting
Payment processing — BP-007
Refund processing — BP-007 IP-06
Supplier returns
Core Inventory Quantities

IP-03 must distinguish:

On Hand
Reserved
Available

The fundamental relationship is:

Available = On Hand − Reserved

Example:

On Hand   = 100
Reserved  = 30
Available = 70

A new reservation for 50 is therefore allowed.

A reservation for 80 is rejected.

Business Rules
BR-001 — Availability is not the same as on-hand

Users must not be told that all on-hand inventory is available for sale.

The system shall calculate available inventory after existing reservations.

BR-002 — Reservation cannot exceed available stock
Requested quantity <= Available quantity

must hold unless an explicit business configuration permits otherwise.

Default:

allowNegativeStock = false
BR-003 — Reservation belongs to a sales context

A reservation must reference the originating:

Business
Sale/order
Order line
Inventory item
Location

Where the originating sales contract provides a stable line reference, use that reference rather than duplicating commercial calculations.

BR-004 — Do not recalculate commercial quantities

IP-03 consumes the confirmed sales/order quantity from BP-006.

It must **not independently calculate:

Selling price
Discount
Tax
Commercial totals
Order totals**

Inventory quantity is the concern of IP-03.

BR-005 — Payment does not reserve or deduct stock

A successful payment does not itself mean stock should be deducted.

For example:

Payment SUCCESSFUL
        ≠
Stock DEDUCTED

The inventory action follows the configured sales/fulfilment lifecycle.

This prevents BP-007 payment processing from becoming an inventory engine.

Reservation Lifecycle

Recommended lifecycle:

REQUESTED
    ↓
RESERVED
    ↓
CONVERTED

Alternative outcomes:

REQUESTED → REJECTED
RESERVED → RELEASED
RESERVED → EXPIRED
Meaning

REQUESTED

Reservation is being evaluated.

RESERVED

Quantity is unavailable to other sales.

CONVERTED

Reservation has become an actual stock deduction.

RELEASED

Reserved quantity has been returned to available stock without deduction.

EXPIRED

Reservation automatically becomes available again according to configured policy.

Stock Deduction

When the sale reaches the configured fulfilment/deduction event:

RESERVED
    ↓
STOCK DEDUCTION
    ↓
CONVERTED

Example:

On Hand   = 100
Reserved  = 20
Available = 80

Sale fulfilled for 20

On Hand   = 80
Reserved  = 0
Available = 80

The deduction must create an inventory movement.

Direct Deduction

The business may configure whether a reservation is required.

Reservation required
Sale
 ↓
Reserve
 ↓
Fulfil
 ↓
Deduct
Reservation not required
Sale
 ↓
Availability check
 ↓
Deduct

The policy must be configuration-driven.

Do not hard-code:

if (saleType === "POS") ...

or similar channel-specific inventory logic.

Partial Reservation

If an order requires 10 units and only 6 are available:

Default behaviour:

Requested = 10
Available = 6

→ Reservation rejected

Unless the business has explicitly enabled partial reservation.

If partial reservation is enabled:

Requested = 10
Reserved  = 6
Unreserved = 4

The system must clearly expose the remaining quantity.

No silent partial reservation.

Reservation Release

A reservation must be releasable when the originating sale/order is cancelled or otherwise exits the configured fulfilment journey.

Example:

On Hand   = 100
Reserved  = 20
Available = 80

Order cancelled

Reserved  = 0
Available = 100

Releasing a reservation must not change on-hand inventory.

It changes the reserved quantity only.

Cancellation After Deduction

Once stock has been deducted, simply releasing the reservation is insufficient.

Reserved → Converted

means stock has already left inventory.

A later return/restock belongs to the appropriate IP-05 return process.

IP-03 must not invent an inventory restock mechanism for this case.

Inventory Movement

Every actual deduction must create an immutable inventory movement.

Example:

Field	Value
Movement	INV-MOV-000001
Type	SALE_DEDUCTION
Product	Product A
Location	Main Store
Quantity	-5
Source	SALES_ORDER
Source Reference	SO-000001
Order Line	SOL-000001
Before	100
After	95

The movement must be traceable back to BP-006.

Concurrency

This is a critical requirement.

Example:

Available = 5

Customer A requests 5
Customer B requests 5

The system must not allow both reservations to succeed.

Only one operation can consume the available quantity.

The service must re-read the authoritative inventory state inside the protected transaction/lock before committing the reservation/deduction.

UI availability is informational only.

Idempotency

Reservation and deduction operations must be idempotent.

Example:

Reserve:
businessId = biz-a
operation = RESERVE_STOCK
key = SO-000001-LINE-001

Repeating the same request must return the existing reservation.

It must not create:

Reservation 1
Reservation 2

Likewise, fulfilment/deduction must not create duplicate stock movements.

Multiple Sales

Example:

Stock = 10

Sale A = 4
Sale B = 3
Sale C = 5

Reservations:

A → 4
B → 3
C → rejected

Available:

10 − 4 − 3 = 3

Sale C cannot reserve 5 unless additional stock becomes available.

Multi-Location

IP-03 should support location-specific inventory.

Example:

Main Store:
On Hand = 100

Branch A:
On Hand = 20

A sale fulfilled from Branch A must consume Branch A inventory.

It must not automatically consume Main Store inventory.

Complex transfer between locations belongs to IP-04.

Audit

Use ENG-013.

At minimum:

STOCK_RESERVATION_REQUESTED
STOCK_RESERVED
STOCK_RESERVATION_RELEASED
STOCK_RESERVATION_EXPIRED
STOCK_RESERVATION_REJECTED
STOCK_DEDUCTION_REQUESTED
STOCK_DEDUCTED

Audit should contain:

Business
Actor
Product/inventory item
Location
Quantity
Reservation
Sales order
Sales order line
Before quantity
After quantity
Action
Timestamp

No credentials or secrets.

Tenant Isolation

context.businessId is authoritative.

Every:

availability query
reservation
release
deduction
conversion
history query

must be business-scoped.

Cross-business inventory access must fail closed.

UI / UX

The sales/inventory experience should show:

Product A

On hand:       100
Reserved:       30
Available:      70

Requested:      20

✓ Available

If insufficient:

Product A

Available: 6
Requested: 10

Insufficient stock

Do not expose:

BP-008
IP-03
ENG-013
internal engine terminology

to normal users.

Inventory Reservation History

Example:

Field	Example
Reservation	RSV-000001
Sale	SO-000001
Product	Product A
Location	Main Store
Quantity	5
Status	Reserved
Created	27 Aug 2026
Expires	27 Aug 2026 23:59
Acceptance Criteria
ID	Criterion
AC-001	Available stock equals on-hand minus active reservations
AC-002	Reservation cannot exceed available stock by default
AC-003	Successful reservation reduces available stock without reducing on-hand stock
AC-004	Releasing a reservation restores available stock without changing on-hand stock
AC-005	Reservation is linked to the originating BP-006 sale/order and order line
AC-006	Successful fulfilment converts the reservation into a stock deduction
AC-007	Stock deduction decreases on-hand inventory exactly once
AC-008	Every stock deduction creates an immutable inventory movement
AC-009	Inventory movement references the originating sale/order
AC-010	Payment SUCCESSFUL alone does not trigger stock deduction
AC-011	Cancellation before deduction releases reservation without changing on-hand stock
AC-012	Partial reservation is rejected by default when requested quantity exceeds availability
AC-013	Partial reservation works only when explicitly enabled by configuration
AC-014	Concurrent reservations cannot oversell inventory
AC-015	Repeated reservation request with same idempotency key does not create a duplicate
AC-016	Repeated deduction request does not create a duplicate inventory movement
AC-017	Failed reservation does not alter inventory
AC-018	Failed deduction does not leave a partially applied inventory state
AC-019	Location-specific stock is respected
AC-020	Sale deduction uses the quantity supplied by the confirmed sales contract/order
AC-021	IP-03 does not recalculate sales tax, discounts or commercial totals
AC-022	Cross-business inventory access fails closed
AC-023	Reservation and deduction actions are audited through ENG-013
AC-024	Released/expired reservations remain in history
AC-025	Converted reservations remain linked to their resulting stock movement
AC-026	No direct user editing of on-hand quantity is introduced
AC-027	No GL, valuation or COGS posting is performed
AC-028	No stock transfer is performed by IP-03
Architectural Boundaries
IP-03 owns
Stock availability calculation
Reservation lifecycle
Reservation policy
Reservation release
Reservation conversion
Sales-driven stock deduction
Inventory movement creation for sales
Concurrency protection
Idempotency
IP-03 consumes
IP-01 — inventory/stock ledger foundation
IP-02 — received/opening inventory
BP-006 — confirmed sales/order/fulfilment information
ENG-013 — audit
Shared configuration/control policy where applicable
IP-03 must not own
Payment processing
Payment success determination
Sales pricing
Tax calculation
Inventory valuation
GL
Purchasing
Transfers
Manual adjustments
Stocktake
Reordering
Important Architectural Principle

The clean separation should remain:

BP-006
Sales / Order
      │
      │ confirmed sale / fulfilment
      ▼
BP-008 IP-03
Reservation / Deduction
      │
      ▼
Inventory Ledger
      │
      ▼
Stock Balance

while payments remain independently:

BP-006
   ↓
BP-007
Payment → Allocation → Receipt → Settlement
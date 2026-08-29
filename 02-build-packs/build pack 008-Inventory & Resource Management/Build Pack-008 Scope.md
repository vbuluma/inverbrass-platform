BP-008 — Inventory & Resource Management
1. Build Pack Definition
Attribute	Definition
Build Pack	BP-008
Name	Inventory & Resource Management
Priority	Critical
Status	IP-01–IP-02 Implemented; IP-03–IP-09 specified
Primary Purpose	Control inventory/resources from receipt through storage, reservation, consumption, transfer, adjustment and reconciliation
Primary Owner	Inventory / Operations
Depends On	BP-003 Product & Service Catalogue, BP-005 Pricing/Tax/Discounts, BP-006 Sales & Order Management
Integrates With	BP-007 Payments, BP-009 Supplier Management, BP-010 Finance/GL, ENG-013 Audit
Core Principle	Stock movements are the source of truth; balances are derived from movements
Tenant Model	Fully tenant/business isolated
Version	BP-008 v1
2. Business Objective

Provide SMEs with a simple but controlled way to know:

What resources do I have, where are they, what is available, what has been reserved, what has been consumed, and what needs attention?

BP-008 should eliminate situations where the business relies on spreadsheets or memory to determine stock availability.

The system should support both:

Physical inventory

Examples:

Products for resale
Raw materials
Consumables
Packaging
Spare parts
Operational resources

Examples:

Equipment
Assets/resources used to deliver services
Service capacity/resources where appropriate

However, BP-008 should not become a general fixed-asset accounting system.

3. Business Problem

Without inventory control:

Sales can sell items that are unavailable.
Staff cannot reliably determine available stock.
Stock movements are difficult to audit.
Transfers between locations are poorly controlled.
Damaged/lost stock is hidden in manual adjustments.
Physical stock counts do not reconcile cleanly.
Reordering is reactive.
Inventory received from suppliers is disconnected from stock.
Returns/refunds can leave stock inconsistent.
Different users can simultaneously consume the same stock.

BP-008 provides a controlled inventory lifecycle.

4. Scope Boundary
BP-008 owns
Inventory Item
      ↓
Location
      ↓
Stock
      ↓
Reservation
      ↓
Movement
      ↓
Consumption / Transfer / Adjustment
      ↓
Reconciliation

BP-008 owns the inventory state and movement of resources.

5. In Scope
A. Inventory master / stock configuration
Inventory-enabled products
SKU / item identification
Units of measure
Inventory categories
Stock locations
Warehouses/stores
Reorder thresholds
Minimum/maximum stock levels
Stock tracking configuration
Batch/expiry configuration
Serial-number configuration
B. Stock ledger

The ledger is the core of BP-008.

Every stock-changing event creates a movement.

Examples:

OPENING_BALANCE
RECEIPT
SALE
RETURN
TRANSFER_OUT
TRANSFER_IN
ADJUSTMENT_IN
ADJUSTMENT_OUT
DAMAGE
LOSS
CONSUMPTION
COUNT_ADJUSTMENT

Stock movements should be immutable.

Corrections should create compensating movements rather than editing historical movements.

C. Stock balances

System should provide:

On Hand
Reserved
Available
In Transit
Damaged

At minimum:

Available = On Hand - Reserved

Subject to the applicable inventory policy.

D. Stock receiving

Support inventory entering the business through:

Opening balances
Supplier receiving
Manual receipt
Customer return where applicable
Transfer-in

Supplier procurement itself belongs to BP-009.

BP-008 records the inventory consequence of receiving.

E. Stock reservation

Allow stock to be reserved against a confirmed sales/order requirement.

Example:

On hand = 20
Reserved = 5
Available = 15

Reservation prevents two concurrent transactions from consuming the same available stock.

F. Sales deduction

Integration with BP-006:

Confirmed Sale
      ↓
Inventory availability check
      ↓
Reservation / deduction
      ↓
Stock movement

BP-008 should consume the BP-006 sales contract/event.

It should not recalculate the sale.

G. Stock transfers

Transfer inventory between locations:

Warehouse A
     ↓
TRANSFER_OUT
     ↓
In Transit
     ↓
Warehouse B
     ↓
TRANSFER_IN

The transfer must preserve:

Item
Quantity
UOM
Source
Destination
User
Date/time
Reference
Status
H. Stock adjustments

Controlled adjustments for:

Damage
Loss
Theft
Expiry
Found stock
Data correction
Other approved adjustment reasons

Adjustments should require a reason and audit trail.

I. Stock counting

Support physical stocktake:

System quantity
       ↓
Physical count
       ↓
Variance
       ↓
Approval
       ↓
Adjustment movement

Do not simply overwrite the system quantity.

J. Batch / expiry / serial tracking

Where configured:

Batch numbers
Manufacturing date
Expiry date
Serial numbers
Lot tracking
Stock availability by batch
Expiry visibility

This should be configuration-driven, not forced on every product.

K. Reorder controls

Provide:

Minimum stock
Reorder level
Reorder quantity
Maximum stock
Low-stock indicators
Out-of-stock indicators

BP-008 can generate a replenishment requirement.

Actual purchasing belongs to BP-009.

L. Inventory operational reporting

At minimum:

Current stock
Available stock
Reserved stock
Low stock
Out of stock
Stock movement history
Stock adjustments
Stock transfers
Stocktake variance
Expiring stock
Inventory by location

Inventory valuation/GL reporting should be owned by BP-010.

6. Explicitly Out of Scope

This boundary is important.

BP-003 — Product Catalogue

BP-008 does not own:

Product creation
Product descriptions
Product pricing
Tax configuration
Discount rules
Product catalogue management

It consumes product/SKU information from BP-003.

BP-005 — Commercial Calculation

BP-008 does not calculate:

Selling price
Discount
VAT
Tax
Sale totals
BP-006 — Sales

BP-008 does not own:

Cart
Order creation
Sales pricing
Customer checkout
Sales lifecycle

It consumes approved sales/inventory instructions.

BP-007 — Payments

BP-008 does not own:

Payment initiation
Payment allocation
Receipts
Refund processing
Settlement

For example, a refund may generate an inventory-return instruction, but BP-007 owns the financial refund and BP-008 owns the stock return consequence.

BP-009 — Supplier Management

BP-008 does not own:

Supplier master
RFQs
Purchase orders
Supplier contracts
Procurement approval
Supplier invoices

It receives inventory from approved procurement/receiving instructions.

BP-010 — Finance / GL

BP-008 does not own:

GL posting
Journal entries
Inventory valuation accounting
COGS accounting
Financial period closing

It should expose appropriate inventory events/data for BP-010.

Collections

Not in BP-008.

Fixed Asset Management

Do not turn BP-008 into:

Depreciation
Asset capitalization
Asset disposal accounting
Fixed asset register

Those belong elsewhere.

7. Proposed Inventory Lifecycle
Stock
NOT_AVAILABLE
     ↓
RECEIVED
     ↓
ON_HAND
     ↓
RESERVED
     ↓
CONSUMED / SOLD

Additional movements:

ON_HAND
  ├── TRANSFER_OUT
  ├── ADJUSTMENT_OUT
  ├── DAMAGE
  ├── LOSS
  └── RETURN

The actual implementation should treat movements as events, rather than relying exclusively on a status field.

8. Core Inventory Model

I recommend this conceptual model:

Product / SKU
      │
      ▼
Inventory Item
      │
      ├──────────────┐
      ▼              ▼
Location        Tracking Profile
      │          (batch/serial/expiry)
      ▼
Stock Balance
      │
      ▼
Stock Ledger
      │
      ├── Receipt
      ├── Sale
      ├── Reservation
      ├── Release
      ├── Transfer
      ├── Adjustment
      ├── Damage
      ├── Loss
      ├── Return
      └── Consumption
9. Key Invariants

These should become non-negotiable architecture rules.

Inventory truth

Stock ledger movements are the source of truth.

Never silently edit historical stock movements.

Availability
Available = On Hand - Reserved

unless a configured policy explicitly defines otherwise.

Sales

A sale cannot consume more available stock than the configured inventory policy permits.

Reservation

Reservation reduces availability but does not reduce physical on-hand quantity.

Transfer

A transfer must decrease source stock and increase destination stock through controlled movements.

Adjustment

Every adjustment must have a reason and audit record.

Stocktake

Physical count must never simply overwrite historical stock.

Tenant isolation

All inventory data must be scoped to the authenticated businessId.

Idempotency

The same inventory instruction must not create duplicate stock movements.

Audit

All stock-changing operations must be auditable through ENG-013.

10. Architecture

BP-008 should follow the same architecture pattern established in BP-007.

src/core/
   inventory-engine/
       ports
       types
       policies
       adapters

src/modules/inventory/
       services
       repositories
       rules
       actions
       components
Core Engine

Owns reusable inventory mechanics:

Availability
Stock movement
Reservation
Balance calculation
Movement validation
Inventory policies
Domain Module

Owns:

Inventory screens
Stock management
Transfers
Adjustments
Stocktakes
Operational workflows
11. Integration Architecture
BP-003
Product Catalogue
       │
       ▼
    BP-008
Inventory & Resource Management
       ▲
       │
BP-006 Sales ────────┐
                     │
BP-007 Payments ─────┤
                     │
BP-009 Suppliers ────┤
                     │
BP-010 Finance ◄──────┘

More precisely:

BP-006
  │
  │ Inventory instruction
  ▼
BP-008
  │
  ├── Stock movement
  ├── Reservation
  └── Availability
       │
       ▼
   BP-010 / reporting
12. Proposed IP Structure

I recommend 9 IPs, mirroring the maturity pattern of BP-007:

IP	Name	Purpose	Status
IP-01	Inventory Foundation & Stock Ledger	Establish inventory entities, locations, ledger and balances	✅ Implemented
IP-02	Stock Receiving & Opening Balances	Bring stock into inventory	✅ Implemented
IP-03	Stock Reservation & Sales Deduction	Connect inventory to BP-006 sales	✅ Implemented
IP-04	Stock Transfers & Multi-Location	Move inventory between locations	✅ Implemented
IP-05	Stock Adjustments, Damage, Loss & Returns	Controlled non-sales stock movements	✅ Implemented
IP-06	Stocktake & Inventory Reconciliation	Physical counts and variance handling	✅ Implemented
IP-07	Batch, Expiry & Serial Resource Tracking	Advanced tracking	✅ Implemented
IP-08	Reorder & Inventory Controls	Low-stock/replenishment controls	✅ Implemented
IP-09	Inventory Operations, Exceptions & Controls	Operational exceptions, approvals and final controls	✅ Implemented

This gives us a very clean progression:

IP-01
Foundation
   ↓
IP-02
Get stock in
   ↓
IP-03
Consume stock through Sales
   ↓
IP-04
Move stock
   ↓
IP-05
Correct/return stock
   ↓
IP-06
Count & reconcile
   ↓
IP-07
Track complex inventory
   ↓
IP-08
Control replenishment
   ↓
IP-09
Operations & controls
   ↓
BP-008 v1 Certification
13. Important Design Decision: "Resource Management"

Because the pack is called Inventory & Resource Management, I would make the distinction explicit:

Inventory resources

Primary BP-008 scope

Goods
Materials
Consumables
Spare parts
Stock for resale
Operational resources

Limited BP-008 v1 support

Equipment/resources that have availability or allocation requirements

But avoid building a full resource-management platform in v1.

For example, BP-008 could support:

"Room 1 is unavailable/reserved"

or

"Equipment X is allocated to Service Order Y"

where this directly supports an SME operational process.

It should not attempt to become a full:

HR resource system
Fixed asset system
Fleet system
Facility management system
Project resource management system

Those can be future capabilities.

14. BP-008 v1 Definition of Done

BP-008 should be considered complete when the system can reliably answer:

What do I have, where is it, what is available, what is reserved, what moved, what was consumed, what was adjusted, what was counted, and what needs replenishment?

And technically:

✅ Stock ledger implemented
✅ Stock balances derived correctly
✅ Receiving implemented
✅ Sales deduction integrated
✅ Reservations implemented
✅ Transfers implemented
✅ Adjustments implemented
✅ Stocktake implemented
✅ Batch/expiry/serial capability implemented
✅ Reorder controls implemented
✅ Exception controls implemented
✅ Tenant isolation
✅ Idempotency
✅ Concurrency protection
✅ Audit
✅ Architecture boundary enforcement
✅ No duplicate product catalogue
✅ No procurement engine
✅ No payment engine
✅ No GL engine
✅ No collections
✅ Pack-level end-to-end certification
One architectural principle I would lock before we start

Do not let BP-008 calculate commercial truth.

BP-006 says:

"We sold 5 units."

BP-007 says:

"KES 50,000 was paid."

BP-008 says:

"5 units left inventory."

BP-010 eventually says:

"The financial/accounting consequence is X."

That separation will keep the ERP architecture clean as InverBrass grows.

Next step: define the BRD/requirements for BP-008 IP-01 — Inventory Foundation & Stock Ledger, using the same detailed requirement format we established for BP-007.
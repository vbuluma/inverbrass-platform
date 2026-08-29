BP-008 IP-01 – Inventory Foundation & Stock Item Master
Attribute	Description
Implementation Package	IP-01
Build Pack	BP-008 – Inventory & Resource Management
Status	✅ Implemented
Priority	Critical
Depends On	BP-001, BP-003, BP-006, ENG-013
Scope coverage	SC-017, SC-018
Related pack FRs	FR-024, FR-025, FR-026
Objective

Establish the inventory foundation and stock item master required for all subsequent inventory operations.

IP-01 defines what the business stocks, where it is stocked, and how stock is measured.

It does not move or adjust stock.

Product / Service Catalogue
          ↓
    Stock Item Master
          ↓
   Inventory Locations
          ↓
   Stock Units / UOM

A product becomes inventory-managed only when explicitly configured as a stock item.

Business Problem

Not every product sold by an SME is inventory.

A service, consultation, delivery fee or other non-stock item should not create inventory movements. Conversely, physical goods need a controlled stock identity, unit of measure and location before purchases, sales, transfers or adjustments can safely affect inventory.

Inventory must therefore be a separate operational capability linked to the existing product catalogue, rather than duplicating products inside BP-008.

Scope
Included
1. Stock Item Master

Create and maintain inventory-specific attributes for an existing BP-003 product/service catalogue item:

Stock item identity
Product reference
SKU
Barcode where applicable
Inventory tracking enabled/disabled
Stock item type
Base unit of measure
Purchase unit of measure where configured
Sales unit of measure where configured
Conversion factor where applicable
Reorder level
Reorder quantity
Minimum stock level
Maximum stock level
Active/inactive status

The product catalogue remains the commercial product master.

BP-008 owns the inventory attributes.

2. Inventory Item Types

Support configuration for:

STOCKED_ITEM
NON_STOCK_ITEM

Future item types may be added through configuration rather than hard-coded branching.

A service must not automatically become a stock item.

3. Inventory Locations

Establish inventory locations within a business:

Examples:

Main Store
Shop Floor
Warehouse
Branch Store
Back Store

Each location shall have:

Location ID
Business/tenant
Name
Code
Description
Active/inactive status
Location type
Parent location where hierarchical locations are required

Locations are business-scoped.

4. Unit of Measure

Provide a controlled UOM catalogue.

Examples:

EA   Each
KG   Kilogram
G    Gram
L    Litre
ML   Millilitre
BOX  Box
PACK Pack

UOM definitions must not be hard-coded in sales or inventory transaction logic.

5. Stock Item ↔ Location Configuration

A stock item may be enabled at one or more inventory locations.

The relationship shall support:

Item
Location
Active/inactive status
Reorder level override
Minimum stock override
Maximum stock override

This allows:

Product A
   ├── Main Store
   └── Branch Store

with different stock-control parameters per location.

6. Opening Stock Foundation

IP-01 may establish an opening stock balance only as an initial inventory baseline.

Opening stock must be represented as a controlled inventory event/entry rather than an arbitrary editable balance.

Example:

Product A
Main Store
Opening Quantity = 100

The detailed stock movement lifecycle belongs to subsequent IPs.

7. Inventory Balance Foundation

Establish the data model required to determine:

On Hand
Reserved
Available

However, IP-01 does not implement reservation, sales deduction, purchasing, transfers or adjustments.

Initial balance may therefore be:

On Hand      = Opening Stock
Reserved     = 0
Available    = On Hand
8. Product Catalogue Integration

Inventory must reference the existing BP-003 product/service catalogue.

Do not create a second product master.

Example:

BP-003 Product
      │
      └── Inventory Configuration
             │
             ├── SKU
             ├── UOM
             ├── Stock tracking
             └── Locations

If the commercial product is deleted/deactivated, inventory must not silently lose historical references.

9. Tenant Isolation

All inventory entities must be scoped by authenticated businessId.

Cross-business access must fail closed.

businessId A
    ↓
Inventory A

businessId B
    ↓
Inventory B

No inventory record may be read, created, updated or deleted across tenant boundaries.

10. Audit

Inventory master-data changes must use ENG-013.

Audit events should cover at minimum:

Stock item created
Stock item updated
Stock item activated/deactivated
Location created
Location updated
Location activated/deactivated
Stock item enabled at location
Opening stock recorded

Do not log credentials, secrets or unnecessary customer information.

Inventory Identity Model

The foundational relationship should be:

Product
   │
   │ 1:0..1
   ▼
Stock Item
   │
   │
   ├──────────────► UOM
   │
   └──────────────► Inventory Location
                         │
                         ▼
                    Stock Balance

The same product can exist in multiple locations.

Business Rules
BR-001 — Product reference

Every stock item must reference an existing BP-003 product.

BR-002 — No duplicate stock item

A product should not have multiple active inventory-stock configurations within the same business unless the architecture explicitly supports separate inventory identities.

BR-003 — Services

Products configured as services must not create stock balances.

BR-004 — Stock tracking

Inventory movement is permitted only for products configured as inventory-managed.

BR-005 — UOM

Every stock item must have a valid base UOM before inventory transactions can occur.

BR-006 — Location

Every stock balance must belong to a valid active inventory location.

BR-007 — Tenant isolation

businessId from the authenticated context is authoritative.

Client-supplied business IDs must not override the authenticated tenant.

BR-008 — Historical integrity

Deactivating a stock item or location must not delete historical inventory records.

BR-009 — Opening stock

Opening stock cannot be silently edited as a balance.

Any correction must be represented through the appropriate inventory adjustment mechanism in a later IP.

BR-010 — No commercial recalculation

IP-01 must not modify:

Product selling price
Tax
Discount
Sales totals
Payment obligation
Invoice
Receipt

Those remain owned by the existing build packs.

UI / UX

Provide an Inventory workspace with:

Inventory Dashboard
Inventory

Stock Items       124
Low Stock          12
Out of Stock        5
Locations           3
Stock Item List
SKU	Product	UOM	Tracking	Status
SKU-001	Product A	EA	Yes	Active
SKU-002	Product B	KG	Yes	Active
SKU-003	Service C	—	No	Active
Stock Item Detail

Show:

Product
SKU
Barcode
Stock tracking
Base UOM
Reorder parameters
Locations
Current foundational balance
Status

No customer-facing technical terminology such as BP/IP/ENG.

Acceptance Criteria
ID	Criterion
AC-001	Existing BP-003 product can be configured as an inventory-managed stock item
AC-002	A service/non-stock product cannot create an inventory balance
AC-003	Stock item references the existing product catalogue; no duplicate product master is created
AC-004	Stock item has a valid base UOM
AC-005	Business can create and manage multiple inventory locations
AC-006	One stock item can be enabled at multiple locations
AC-007	Location-specific reorder parameters can be configured
AC-008	Opening stock can establish an initial balance through a controlled inventory entry
AC-009	Initial available quantity equals on-hand quantity when no reservations exist
AC-010	Deactivating a stock item does not delete historical records
AC-011	Deactivating a location does not delete historical inventory records
AC-012	All inventory reads/writes are tenant-scoped
AC-013	Cross-business stock-item and location access fails closed
AC-014	Inventory master-data changes are audited through ENG-013
AC-015	IP-01 does not alter sales, pricing, tax, payment, invoice or receipt calculations
AC-016	No inventory movement occurs from merely creating or editing a stock item
AC-017	UOM and inventory configuration are catalogue/configuration driven rather than hard-coded
AC-018	Historical product references remain intact when the originating product is deactivated
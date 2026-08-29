# BP-008 IP-02 – Stock Receiving & Inventory Inbound

| Attribute                  | Description                              |
| -------------------------- | ---------------------------------------- |
| **Implementation Package** | IP-02                                    |
| **Build Pack**             | BP-008 – Inventory & Resource Management |
| **Status**                 | ✅ Implemented                            |
| **Priority**               | Critical                                 |
| **Depends On**             | IP-01, BP-006, BP-009 later, ENG-013     |
| **Scope coverage**         | SC-019, SC-020                           |
| **Related pack FRs**       | FR-027, FR-028, FR-029, FR-030           |

---

## Objective

Provide the controlled process for **bringing physical stock into inventory**.

IP-02 converts an actual stock receipt into an inventory movement and updates the stock balance.

```text
Goods physically received
        ↓
Receive Stock
        ↓
Validate item / location / quantity
        ↓
POSTED receipt
        ↓
On Hand increases
```

The important distinction is that **receiving stock is a physical inventory event**, not merely editing a quantity. Inventory systems generally treat receipts, issues, transfers and adjustments as distinct movements so that the stock ledger remains explainable. ([SAP Help Portal][1])

---

# Business Problem

Without a controlled receiving process, SMEs can have:

* Stock physically received but missing from the system
* Stock entered against the wrong product
* Incorrect quantities
* Duplicate receiving
* Damaged/short deliveries being accepted as full quantities
* No trace of who received stock
* Stock balances changed without an underlying movement

IP-02 therefore establishes **receipt-based stock increases**, while preserving IP-01's inventory master and balance foundation.

---

# Scope

## Included

### 1. Stock Receipt

Create a stock receipt transaction for inventory-managed items.

A receipt must identify:

* Business
* Receipt number
* Stock item
* Location
* Quantity received
* UOM
* Receipt date/time
* Receiver/actor
* Reference/document number where applicable
* Notes/reason
* Status

---

### 2. Multi-line Receipts

A single receipt may contain multiple stock items.

Example:

```text
GR-000001

Main Store

Product A     20 EA
Product B     10 EA
Product C      5 BOX
```

Each line must independently contribute to inventory.

---

### 3. Partial Receiving

Support receiving less than an expected quantity where an originating expected quantity exists.

Example:

```text
Expected: 100 EA
Received: 80 EA

Stock increases by 80 EA.
Remaining expected: 20 EA.
```

Do **not** force the system to receive the full expected quantity.

Partial receipts are normal operational events and should preserve the difference rather than pretending the full quantity arrived. ([URBLD][2])

---

### 4. Over-Receipt Control

If an expected quantity exists:

```text
Expected = 100
Received = 120
```

the system must not silently accept the excess.

Apply a configurable policy:

* BLOCK
* ALLOW_WITH_WARNING
* ALLOW

Default should be **BLOCK** unless the existing configuration framework specifies otherwise.

No hard-coded supplier-specific rules.

---

### 5. Stock Balance Update

A successful receipt increases:

```text
On Hand
```

and therefore:

```text
Available = On Hand - Reserved
```

For IP-02:

```text
Receipt 50
On Hand      +50
Reserved       0
Available     +50
```

No reservation functionality is implemented here.

---

### 6. Inventory Ledger

Every successful receipt must create an immutable inventory movement.

Conceptually:

```text
Inventory Movement

Type: RECEIPT
Direction: IN
Stock Item
Location
Quantity
UOM
Reference
Actor
Timestamp
```

The movement becomes the source of truth for the stock change.

Do **not** directly overwrite the balance without recording the movement.

---

### 7. Duplicate Protection / Idempotency

A receipt submission must support tenant-scoped idempotency.

Repeated submission with the same idempotency key must return the existing receipt rather than adding stock twice.

Example:

```text
Receive 100 EA
idempotencyKey = REC-ABC

First request  → +100
Second request → existing receipt
```

No duplicate stock movement.

---

### 8. Pre-post Cancellation (posted reversal is out of scope)

A posted receipt must not be deleted or edited in place.

IP-02 supports **pre-post cancellation** only (`DRAFT`, `SUBMITTED`, `APPROVED`).

Posted receipt corrections belong to **IP-05 – Stock Adjustments, Damage, Loss & Returns**. Do not implement:

```text
Posted Receipt
      ↓
REVERSAL -100
```

inside IP-02.

---

### 9. Product Validation

A receipt can only reference:

* An existing BP-008 stock item
* That is active
* That is inventory-managed
* With a valid UOM
* At a valid active inventory location

A service/non-stock product cannot be received into inventory.

---

### 10. Location Validation

Stock must be received into a valid inventory location.

```text
Stock Item
    +
Active Location
    +
Quantity
    ↓
Receipt
```

Receiving into an inactive/non-existent location must fail closed.

---

### 11. UOM Validation

The receipt quantity must use a valid UOM.

Where IP-01 has configured a purchase UOM:

```text
Purchase UOM → Base UOM
```

the system may convert the received quantity using the configured conversion factor.

Example:

```text
1 BOX = 12 EA

Receive 5 BOX
       ↓
60 EA on hand
```

Do not introduce an independent UOM conversion engine.

---

### 12. Supplier / Purchase Reference

IP-02 should support an optional external reference:

* Supplier
* Delivery note
* Supplier invoice
* Purchase reference

However:

**BP-008 IP-02 must not implement supplier/AP functionality.**

BP-009 will own supplier bills and purchasing.

If BP-009 purchase-order structures already exist when this IP is implemented, provide a clean reference/handoff rather than duplicating them.

---

### 13. Receiving Status

Use a controlled lifecycle:

```text
DRAFT → POSTED
```

Optional exception:

```text
DRAFT → CANCELLED
```

Once POSTED:

* Stock has changed
* Movement is immutable
* Editing quantity is prohibited

Corrections must occur through a controlled subsequent inventory movement.

---

### 14. Opening Balances

Opening balances bring initial stock into the IP-01 ledger. They are **not** supplier receipts and must not create a supplier purchase transaction unless explicitly associated with one.

Reuse the existing IP-02 inbound services. Do not invent a second opening-balance engine.

```text
Opening Balance Entry
        ↓
Validate Item
        ↓
Validate Location
        ↓
Validate UOM
        ↓
Apply UOM Conversion
        ↓
Authorization / Maker-Checker if configured
        ↓
Post OPENING_BALANCE Ledger Movement
        ↓
Update On-Hand
        ↓
Audit
```

An opening-balance document must:

* Identify business/tenant
* Identify item/resource
* Identify location
* Capture quantity and UOM
* Apply IP-01 UOM conversion where required
* Create an authoritative `OPENING_BALANCE` stock ledger movement
* Update on-hand through the existing ledger mechanism
* Be auditable
* Respect authorization/maker-checker configuration where applicable
* Be idempotent under the IP-02 posting model
* Not directly edit the stock balance
* Not implement posted reversal (IP-05)

---

# Business Rules

### BR-001 — Stock-managed items only

Only active STOCKED_ITEM records can be received.

---

### BR-002 — Positive quantity

Receipt quantity must be greater than zero.

Negative quantities are not receipts.

---

### BR-003 — Active location

Stock must be received only into an active inventory location.

---

### BR-004 — UOM validity

Receipt UOM must be valid for the stock item.

---

### BR-005 — No silent balance editing

A receipt must create an inventory movement before changing the stock balance.

---

### BR-006 — Atomic posting

Receipt posting must be atomic:

```text
Receipt
+
Movement
+
Balance update
```

must succeed together.

No situation where the receipt says POSTED but stock was not increased.

---

### BR-007 — Idempotency

The same tenant-scoped receipt request must not increase stock twice.

---

### BR-008 — Immutable posted receipt

A POSTED receipt cannot have its quantity, stock item, location or UOM edited in place.

---

### BR-009 — Partial receipt

Receiving less than an expected quantity is permitted.

The remaining quantity stays outstanding against the originating expected quantity where applicable.

---

### BR-010 — Over-receipt

Over-receipt follows configured policy.

Default:

```text
BLOCK
```

No hard-coded supplier rules.

---

### BR-011 — Tenant isolation

Authenticated `businessId` is authoritative.

Cross-business receipt access/posting must fail closed.

---

### BR-012 — Audit

Receipt creation, posting and cancellation/reversal must be audited through ENG-013.

---

### BR-013 — Commercial separation

Receiving stock must not change:

* Selling price
* Tax
* Discount
* Customer sale
* Payment obligation
* Invoice
* Receipt

---

### BR-014 — No supplier accounting

Receiving stock does not create:

* Supplier bill
* Accounts payable
* GL posting

Those belong to later packs.

---

### BR-015 — Purchase UOM conversion

Receipt and opening-balance quantities convert to the IP-01 base UOM before the stock ledger is posted.

Conversion factors come from the existing stock-item configuration. Do not assume `1:1` when a non-base purchase UOM is selected. Missing or invalid conversion configuration fails closed.

The entered quantity and UOM remain on the document for provenance. The ledger movement is posted in base UOM.

---

### BR-016 — Expected, received and remaining

Where an expected quantity exists:

```text
Remaining = Expected − Received
```

`Received` is the cumulative successfully posted quantity for the relevant receipt/PO line, normalized to base UOM. Pending, failed and cancelled documents do not count. Remaining never displays below zero; over-receipt still follows BR-010.

---

# Stock Balance Rule

After IP-02:

```text
On Hand =
Opening Stock
+ Posted Receipts
- Future Outbound Movements
```

Because outbound movements are not yet implemented, IP-02 only adds to on-hand.

For current IP-02:

```text
On Hand after receipt
    =
On Hand before receipt
    +
Received Quantity in Base UOM
```

And:

```text
Available = On Hand - Reserved
```

with `Reserved = 0` until reservation functionality exists.

---

# Capture-mode neutrality

The method of capturing stock sits in IP-02 because this IP brings stock into the inventory ledger. Capture method is not the same as the inventory business event.

| Capture method | IP | Why |
| --- | --- | --- |
| Manual entry | IP-02 | Manual receiving/opening-balance capture |
| Barcode scanning | IP-02 | An input method for receiving stock |
| Batch upload / Excel/CSV | IP-02 | Bulk receiving/opening balance |
| Purchase order → receive stock | IP-02 | Receiving creates the stock ledger entries |
| Opening balance import | IP-02 | Initial stock enters the ledger |
| Stock transfer scanning | IP-04 | The business event is a transfer |
| Adjustment entry | IP-05 | The business event is an adjustment |
| Stocktake count/scanning | IP-06 | The business event is physical counting |
| Serial/batch/expiry capture | IP-07 | Tracking attributes on relevant transactions |

Do not create separate barcode, Excel, PO, or opening-balance stock-posting engines. All supported capture mechanisms are input channels into the same IP-02 receiving/opening-balance services and must not bypass validation, UOM conversion, authorization, maker-checker where configured, idempotency, audit, stock ledger posting, or exception handling.

```text
Manual Entry ───────┐
Barcode Scan ───────┤
Batch Upload ───────┤
Purchase Receiving ─┤
Opening Balance ────┘
                    ↓
          IP-02 inbound services
                    ↓
          Validation & UOM conversion
                    ↓
        Maker/Checker if configured
                    ↓
             Stock Ledger
```

---

# UI / UX

## Receive Stock

Simple operational flow:

```text
Receive Stock

Location: [ Main Store ]

Item
[ Product A ]

Quantity
[ 20 ]

UOM
[ EA ]

Reference
[ Delivery Note 123 ]

Notes
[ ]

        Receive Stock
```

For multi-line receiving:

| Item      | Expected | Received | UOM |
| --------- | -------: | -------: | --- |
| Product A |      100 |       80 | EA  |
| Product B |       20 |       20 | BOX |
| Product C |        — |       10 | EA  |

---

## Receipt Detail

Show:

* Receipt number
* Status
* Date/time
* Location
* Received by
* Reference
* Items
* Quantities
* UOM
* Resulting stock balance

Example:

```text
Receipt GR-000001
Status: Posted

Main Store

Product A
Received: 80 EA
On Hand: 180 EA

Received by: Staff User
Date: 27 Aug 2026
```

Use operational language.

Do not expose:

* BP-008
* IP-02
* ENG-013

---

# Acceptance Criteria

| ID         | Criterion                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| **AC-001** | Active inventory-managed stock item can be received                                                          |
| **AC-002** | Service/non-stock item cannot be received                                                                    |
| **AC-003** | Receipt requires positive quantity                                                                           |
| **AC-004** | Receipt requires valid active location                                                                       |
| **AC-005** | Receipt validates UOM                                                                                        |
| **AC-006** | Posted receipt increases on-hand quantity correctly                                                          |
| **AC-007** | Receipt creates an immutable inventory movement                                                              |
| **AC-008** | Multi-line receipt updates each stock item correctly                                                         |
| **AC-009** | Partial receipt is supported                                                                                 |
| **AC-010** | Remaining expected quantity is preserved where an expected quantity exists                                   |
| **AC-011** | Over-receipt follows configured policy                                                                       |
| **AC-012** | Duplicate idempotency request does not create another stock movement                                         |
| **AC-013** | Posted receipt cannot be edited in place                                                                     |
| **AC-014** | Pre-post cancellation is supported; posted reversal is out of scope and belongs to IP-05                      |
| **AC-015** | Receipt quantity is converted to base UOM using configured UOM conversion where applicable                   |
| **AC-016** | Receipt into inactive location fails closed                                                                  |
| **AC-017** | Cross-business receipt access/posting fails closed                                                           |
| **AC-018** | Receipt posting and resulting stock change are atomic                                                        |
| **AC-019** | Receipt actions are audited through ENG-013                                                                  |
| **AC-020** | Receiving stock does not modify product pricing, tax or discounts                                            |
| **AC-021** | Receiving stock does not create a payment obligation, invoice or customer receipt                            |
| **AC-022** | Receiving stock does not create supplier/AP or GL postings                                                   |
| **AC-023** | No provider integrations are introduced                                                                      |
| **AC-024** | Stock balance is derived consistently from the inventory ledger/foundation                                   |
| **AC-025** | Historical receipt records remain available after product/location deactivation                              |
| **AC-026** | Opening balance creates an OPENING_BALANCE ledger movement                                                   |
| **AC-027** | Opening balance updates on-hand through the inventory ledger                                                 |
| **AC-028** | Opening balance applies IP-01 UOM conversion where required                                                  |
| **AC-029** | Opening balance actions are audited                                                                          |
| **AC-030** | Opening balance respects configured maker-checker                                                            |



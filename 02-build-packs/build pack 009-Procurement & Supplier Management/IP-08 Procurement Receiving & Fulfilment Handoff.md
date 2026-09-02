# BP-009 IP-08 — Procurement Receiving & Fulfilment Handoff

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-08 |
| Build Pack | BP-009 – Procurement & Supplier Management |
| Status | ✅ Implemented — smoke 47/47 (`bp009-ip08-procurement-receiving-smoke-validation.ts`) |
| Priority | Critical |
| Depends On | IP-06, BP-008 IP-02 (inventory receipt), ENG-013, ENG-005 |
| Integrates With | BP-008 inventory ledger; Asset/Finance capability (later); service confirmation in BP-009 |
| Scope coverage | SC-011, PROC-029 |
| Objective | Orchestrate inventory, asset and service receipt against a PO without owning on-hand quantity |

---

## Objective

BP-009 owns the **procurement transaction**, not inventory on-hand.

```text
PO
 ├── Inventory  → Goods Receipt instruction → BP-008 IP-02 → Inventory
 ├── Asset      → Asset Receipt handoff → Asset Register / Finance
 └── Service    → Service Confirmation → Accepted Service
```

**BP-009 must not create its own inventory ledger.**

Delivery tracking (promised vs actual, partial, overdue) is in scope as procurement fulfilment state.

---

## Business Problem

If procurement posts stock itself, BP-008's ledger is bypassed. If receiving lives only in inventory with no PO, three-way match cannot work.

---

## Scope

### Included

#### 1. Receipt types

| PO line type | BP-009 artefact | Downstream |
|--------------|-----------------|------------|
| Inventory | Goods receipt instruction (quantities, item, location, PO/line refs, packing evidence) | BP-008 IP-02 posts the stock movement |
| Asset | Asset receipt handoff | Asset register / finance capability — **not** a BP-009 asset ledger |
| Service | Service confirmation | Accepted service record in BP-009 |

A single PO may mix types by line.

#### 2. Goods receipt handoff (inventory)

```text
BP-009 PO (ACCEPTED)
   ↓
Goods Receipt (procurement document)
   ↓
Handoff instruction to BP-008 IP-02
   ↓
BP-008 stock movement / on-hand
```

BP-009 stores: receipt number, PO reference, lines, quantities received, date, receiver, discrepancies noted, status, **BP-008 movement/receipt reference** when returned.

BP-009 must not store a writable on-hand balance.

If BP-008 is unavailable, fail closed rather than writing a shadow stock qty.

#### 3. Asset receipt handoff

Record that an asset-deliverable was received against the PO and emit a handoff for the future asset/finance owner. Do not implement depreciation, capitalisation journals, or a fixed-asset register in BP-009.

#### 4. Service confirmation

Confirm services delivered: period, description, quantity/hours, acceptor, evidence. This **is** the receipt artefact for two-way/three-way match on service POs (IP-09). No inventory movement.

#### 5. Delivery tracking

Against PO lines:

* promised date
* quantity ordered / received / outstanding
* partial delivery
* overdue indicator

Over-delivery / short delivery / damage flags may be raised here and become IP-10 exceptions; IP-08 records the factual receipt.

#### 6. Inspection (foundation)

Optional inspection status on a receipt (pending / passed / failed). **Four-way match** (PO → Receipt → Inspection → Invoice) is a documented future matching mode in IP-09; IP-08 may store inspection outcome so that mode can be enabled later without a new receipt entity.

---

## Business Rules

| ID | Rule |
| -- | ---- |
| RCV-001 | Receipt must reference an issued/accepted PO line. |
| RCV-002 | Inventory receipts must hand off to BP-008; they must not increment a BP-009 stock field. |
| RCV-003 | Received quantity defaults must not exceed open PO quantity unless over-delivery policy allows. |
| RCV-004 | Duplicate receipt posting against the same instruction must be idempotent. |
| RCV-005 | Service confirmation does not call BP-008. |
| RCV-006 | Asset handoff does not create a BP-008 stock item unless the line is also inventory-typed. |
| RCV-007 | IP-08 must not capture supplier invoices or GL. |
| RCV-008 | Tenant isolation; fail closed. |

---

## UI / UX

**Receive against PO** — select PO, enter quantities, type (goods/asset/service), confirm.

**Delivery tracking** — open PO lines, overdue, partial.

Inventory on-hand shown only if read from BP-008 as display, never edited in BP-009.

No BP/IP/ENG labels.

---

## Acceptance Criteria

| ID | Criterion | Implementation |
| -- | --------- | -------------- |
| AC-001 | Goods receipt against an inventory PO line creates a handoff consumed by BP-008 IP-02 | ✅ `ReceivingService` + `InProcessInventoryHandoffAdapter` (production BP-008 port boundary) |
| AC-002 | BP-009 does not persist an independent on-hand quantity | ✅ Receipt facts only; no stock balance tables |
| AC-003 | Service confirmation records accepted service without a stock movement | ✅ `SERVICE_CONFIRMATION` receipt type |
| AC-004 | Asset receipt is a handoff, not a depreciation engine | ✅ `ASSET_RECEIPT` + future asset handoff reference |
| AC-005 | Partial receipt updates outstanding PO quantity | ✅ Derived from confirmed receipt lines |
| AC-006 | Over-receipt is blocked or exception-flagged per policy | ✅ `procurement_receiving_control.over_receipt_policy` |
| AC-007 | Duplicate confirm does not double-hand-off | ✅ Idempotency key on `procurement_receipt_handoff` |
| AC-008 | Receipt is auditable and linked to PO | ✅ ENG-013 audit actions + PO/version FKs |
| AC-009 | Cross-business receipt access fails closed | ✅ Repository business scoping |
| AC-010 | IP-08 does not create supplier invoices, matches or payments | ✅ Receiving service boundary |

### Verification

- Smoke: `npx tsx scripts/bp009-ip08-procurement-receiving-smoke-validation.ts` — **47/47**
- Migration: `0088_bp009_ip008_procurement_receiving.sql`
- Routes: `/procurement/receiving`, `/procurement/receiving/[receiptId]`
- PO integration: fulfilment panel on purchase order workspace

---

## Explicitly Excluded from IP-08

Inventory ledger, WMS putaway, MRP, stocktake, supplier invoice (IP-09), exception case workspace as the system of record (IP-10 may be spawned), GL, asset depreciation.

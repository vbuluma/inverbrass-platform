# BP-009 IP-06 — Purchase Order Management

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-06 |
| Build Pack | BP-009 – Procurement & Supplier Management |
| Status | ✅ Implemented — core backend + minimal UI (Phase 0 award lines prerequisite complete) |
| Priority | Critical |
| Depends On | IP-01, IP-02, IP-05 (when RFX path used; award must supply supplier, amounts, currency, RFX/PR refs, winning response id, and **award lines**), ENG-005, ENG-013, ENG-015, ENG-009 |
| Scope coverage | SC-011, PROC-028 |
| Objective | Generate, approve, issue, accept, amend and close purchase orders |

---

## Objective

A Purchase Order is the commercial buy-side order. It may be generated from an approved award, or from an approved Purchase Request where policy allows skipping RFX (direct / catalogue / threshold).

```text
Purchase Request
      ↓
RFX (optional per policy)
      ↓
Supplier Response (optional)
      ↓
Award (when RFX used)
      ↓
Purchase Order
```

Supplier should be able to **Accept**, **Reject**, or **Request Change** where permitted.

---

## Business Problem

Verbal or email orders have no acceptance, no amendment history, and no object for receiving and invoice matching.

---

## Scope

### Included

#### 1. PO content

* PO number
* Supplier (IP-01 profile / BP-002 Party)
* Origin: PR, RFX, Award, contract call-off (IP-07), direct
* Lines: item/service (BP-003 where applicable), qty, price, tax, promised date
* Delivery location
* Payment terms
* Contract reference (when IP-07 exists; optional stub until then)
* Warranty / terms & conditions
* Approval status
* Issue date
* Currency
* Attachments (ENG-015)

#### 2. PO lifecycle

```text
DRAFT
  → PENDING_APPROVAL
  → APPROVED
  → ISSUED
  → ACCEPTED | REJECTED | CHANGE_REQUESTED
  → AMENDED
  → PARTIALLY_FULFILLED (set by IP-08)
  → FULFILLED (set by IP-08)
  → CLOSED
  → CANCELLED
```

IP-06 owns issue, acceptance and commercial closure. Fulfilment quantities are updated from IP-08 handoff events; IP-06 must not post inventory.

#### 3. Generation from award / PR

* From award: copy awarded supplier, **lines**, prices; retain award and **winning response / quote version** IDs.
* Header-only `procurement_award` (amount + allocated budget) is **not** a complete IP-06 contract. Do not start IP-06 until award lines exist or an explicit v1 header-only PO exception is approved.
* From approved PR (no RFX): only when policy permits (e.g. below threshold, preferred catalogue). Still requires PO approval per rules.

Must not generate a PO from a BP-008 reorder signal.

#### 4. Approval and issue

PO approval consumes ENG-005 (amount, category, etc.). Issue transmits PO to supplier (document + notification). Issued PO is the version suppliers accept.

#### 5. Supplier acceptance

Where permitted:

| Action | Effect |
|--------|--------|
| Accept | PO becomes ACCEPTED; fulfilment may begin (IP-08) |
| Reject | Reason required; buyer must amend, cancel or re-source |
| Request Change | Proposed changes recorded; buyer accepts as amendment or declines |

Secure supplier action may reuse IP-04 token patterns. Do not require the supplier to be a full business user if tokenised acceptance is configured.

#### 6. Amendments

Amendments create a new PO version: quantities, prices, dates, terms. Prior version retained. Material amendments may re-approve. Receiving/matching in later IPs must reference the current accepted version.

#### 7. Cancellation and closure

Cancel before fulfilment according to policy. Close when complete or administratively closed with reason. Do not delete issued POs.

---

## Business Rules

| ID | Rule |
| -- | ---- |
| PO-001 | PO must reference an eligible supplier profile (not Blacklisted). |
| PO-002 | When sourced from RFX, PO must reference Award and winning response. |
| PO-003 | Line quantity and price must be ≥ 0; quantity > 0 unless cancellation line policy. |
| PO-004 | Reorder signal must not create a PO. |
| PO-005 | Issued PO cannot be silently overwritten; use amendment. |
| PO-006 | Maker cannot self-approve when SoD applies. |
| PO-007 | Reject / change request require a reason. |
| PO-008 | IP-06 must not create inventory movements or GL postings. |
| PO-009 | Duplicate issue of the same approved PO is idempotent. |
| PO-010 | Tenant isolation; fail closed. |

---

## UI / UX

**Purchase orders** — list by status, supplier, overdue delivery date.

**PO detail** — header, lines, versions, acceptance, related PR/RFX/Award.

**Supplier PO view** — accept / reject / request change.

No inventory on-hand figures as if BP-009 owned stock. No BP/IP/ENG labels.

---

## Acceptance Criteria

| ID | Criterion |
| -- | --------- |
| AC-001 | PO can be created from an approved award with line/price copy and trace IDs |
| AC-002 | PO can be created from approved PR only when skip-RFX policy allows |
| AC-003 | BP-008 reorder cannot create a PO directly |
| AC-004 | PO approval uses ENG-005 when configured |
| AC-005 | Supplier can accept, reject or request change where enabled |
| AC-006 | Amendment creates a new version and retains history |
| AC-007 | Blacklisted supplier cannot receive a new PO |
| AC-008 | Issued PO is audited; silent edit is rejected |
| AC-009 | IP-06 does not post stock or journals |
| AC-010 | Cross-business PO access fails closed |

---

## Explicitly Excluded from IP-06

Contract authoring (IP-07), receipt posting / BP-008 ledger (IP-08), supplier invoice matching (IP-09), exception case management (IP-10), performance (IP-11), analytics (IP-12), outgoing payment rails, customer sales orders.

---

## IMPLEMENTATION PROMPT

### Scope delivered (IP-06 core)

- **Schema:** `procurement_po_control`, `procurement_purchase_order`, versions, lines, payment terms, supplier tokens/responses (`0086_bp009_ip006_award_lines_purchase_orders.sql`)
- **Services:** `PurchaseOrderService` — generate from award/PR, submit/approve/reject, issue (idempotent), supplier portal (accept/reject/request change), amend (versioned), cancel, close, fulfilment stub
- **Rules:** `purchase-order-rules.ts` — lifecycle guards, line validation, totals, skip-RFX policy, material amendment threshold
- **Ports:** `PurchaseOrderStorePort`, `PurchaseOrderControlPort`
- **Persistence:** `purchase-order-repository.ts` (Drizzle) + `purchase-order-memory-store.ts` (smoke)
- **Workflow:** `procurement-po-workflow-adapter.ts` — ENG-005 `PURCHASE_ORDER_APPROVAL`
- **UI:** list, detail workspace, public supplier portal at `/procurement/po/respond/[token]`
- **Smoke:** `scripts/bp009-ip06-purchase-order-smoke-validation.ts`

### Key constraints enforced

- PO lines from **award lines only** on award path (not quote lines directly)
- Blacklist via `evaluateSupplierEligibility`
- Tenant isolation (`businessId`) on all operations
- Token security pattern aligned with IP-04 sourcing invitations
- No inventory/GL postings (IP-08 handoff stub only)
- Payment terms + year1/tcv/tco copied from winning quote on award generation
- BP-008 reorder origin blocked on direct PR path

### Verification

```bash
cd 03-platform
npx tsx scripts/bp009-ip06-purchase-order-smoke-validation.ts
npx tsc --noEmit
```


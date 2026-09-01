# BP-009 IP-07 — Contract Management

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-07 |
| Build Pack | BP-009 – Procurement & Supplier Management |
| Status | ✅ Implemented — smoke 35/35 (`bp009-ip07-contract-management-smoke-validation.ts`) |
| Priority | High |
| Depends On | IP-01, IP-05, IP-06 (contracts may also exist alongside or before POs), ENG-005, ENG-013, ENG-015, ENG-009, ENG-003n |
| Scope coverage | SC-011 |
| Objective | Manage procurement contracts, versions, obligations, milestones, expiry and renewal |

---

## Objective

Contracts must be linked to procurement activity. They are not a second document dump and not a legal-matter CMS.

```text
Supplier
   ↓
RFX
   ↓
Award
   ↓
PO
   ↓
Contract
```

Contracts can exist **before or alongside POs** (framework / master agreement then call-off POs). IP-07 must not assume a single rigid sequence.

---

## Business Problem

Expiry dates in spreadsheets cause lapsed SLAs, unnoticed auto-renewals, and POs issued against dead agreements.

---

## Scope

### Included

#### 1. Contract record

* Contract number
* Supplier profile / Party
* Linked RFX, Award, PO (0..n)
* Title and scope
* Type (master, call-off, one-off, SLA, NDA-as-procurement-ancillary — configuration)
* Value and currency
* Effective date, expiry date, renewal date
* Payment terms
* SLA references (ENG-003n where SLA tracking is used)
* Status (Draft, Active, Suspended, Expired, Terminated, Renewed)
* Attached documents (ENG-015) — contract file is not a pack-local store

#### 2. Versioning

Each amendment produces a new version. Prior versions remain readable. Current version is the one POs and invoices should honour unless a PO is pinned to a version.

#### 3. Milestones and obligations

* Milestone: date, description, owner, status, related payment/receipt expectation (reference only)
* Obligation: description, due date, responsible party (buyer/supplier), status, evidence

IP-07 tracks fulfilment of contractual obligations. It does not post receipts (IP-08) or invoices (IP-09).

#### 4. Alerts

Renewal and expiry alerts via ENG-009 at configured lead times. Alerts are operational, not a separate marketing campaign engine.

#### 5. Performance linkage

Contract may be referenced by IP-11 performance and IP-10 exceptions (e.g. expired contract used on a PO). IP-07 stores the dates and status those IPs will query.

#### 6. Call-off

A master contract may authorise subsequent POs (IP-06) within value/quantity ceilings. IP-07 enforces remaining-value visibility; IP-06 must consult it when a PO is contract-backed.

---

## Business Rules

| ID | Rule |
| -- | ---- |
| CTR-001 | Contract must reference an IP-01 supplier profile. |
| CTR-002 | Expiry < effective date is invalid. |
| CTR-003 | Silent overwrite of an issued/active contract is forbidden; version instead. |
| CTR-004 | Terminated/expired contracts cannot authorise new POs unless policy exception is recorded. |
| CTR-005 | Documents use ENG-015. |
| CTR-006 | IP-07 must not create inventory, GL or customer AR records. |
| CTR-007 | Tenant isolation; fail closed. |

---

## UI / UX

**Contracts** — list with expiry countdown, supplier, value, status.

**Contract detail** — versions, parties, linked PR/RFX/PO, milestones, obligations, documents, alerts.

**Alerts** — expiring / expired / renewal due.

No BP/IP/ENG labels.

---

## Acceptance Criteria

| ID | Criterion | Implementation |
| -- | --------- | -------------- |
| AC-001 | Contract can be created and linked to supplier, award and/or PO | ✅ Manual create, generate from award/PR, call-off PO linkage |
| AC-002 | Amendment creates a new version with history retained | ✅ `amend` / `renew` with version supersede |
| AC-003 | Effective, expiry and renewal dates are stored and queryable | ✅ Header + version dates; `refreshExpiryStatus` |
| AC-004 | Milestones and obligations can be tracked to completion | ⏳ Deferred — payment-term milestones only; obligation entities not built |
| AC-005 | Expiry and renewal generate notifications at configured lead time | ⏳ Expiry status derivation only; ENG-009 alerts not wired |
| AC-006 | Expired/terminated contract cannot authorise a new PO without recorded exception | ✅ `assertCallOffAllowed` blocks inactive contracts |
| AC-007 | Contract documents use ENG-015 | ⏳ `executionEvidenceDocumentId` reference on activate; full attachment UI deferred |
| AC-008 | Events are audited through ENG-013 | ✅ `PROCUREMENT_CONTRACT_*` audit actions |
| AC-009 | IP-07 does not post stock, invoices or journals | ✅ Contract service scope only |
| AC-010 | Cross-business contract access fails closed | ✅ Repository business scoping |

### Verification

- Smoke: `npx tsx scripts/bp009-ip07-contract-management-smoke-validation.ts` — **35/35**
- Migration: `0087_bp009_ip007_contract_management.sql`
- Routes: `/procurement/contracts`, `/procurement/contracts/new`, `/procurement/contracts/[contractId]`

---

## Explicitly Excluded from IP-07

Legal e-discovery, full CLM clause libraries as a product, customer sales contracts (BP-006), inventory, invoice matching, payment rails, HR employment contracts.

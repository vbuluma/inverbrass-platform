# BP-009 IP-10 — Procurement Exceptions & Controls

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-10 |
| Build Pack | BP-009 – Procurement & Supplier Management |
| Status | ✅ Implemented — smoke validation via `bp009-ip10-procurement-exceptions-smoke-validation.ts` |
| Priority | High |
| Depends On | IP-06, IP-07, IP-08, IP-09, ENG-005, ENG-013, ENG-009, ENG-003n |
| Scope coverage | SC-011 |
| Objective | Manage procurement exceptions with owner, action, resolution, approval and audit |

---

## Objective

Provide a dedicated exception capability so variances are not lost in comments on POs.

```text
Issue
 ↓
Owner
 ↓
Action
 ↓
Resolution
 ↓
Approval
 ↓
Audit
```

---

## Business Problem

Price variance, short delivery and duplicate invoices are handled in chat. Nothing forces resolution before payment-ready.

---

## Scope

### Included

#### 1. Exception types (configuration-driven catalogue)

Examples:

* price variance
* quantity variance
* partial delivery
* over-delivery
* under-delivery
* damaged goods
* rejected goods
* missing receipt
* invoice mismatch
* duplicate invoice
* expired contract
* PO expiry
* supplier dispute
* late delivery
* quality failure

New types may be added through configuration.

#### 2. Exception record

* Exception number
* Type
* Severity
* Linked objects (PR, RFX, PO, Contract, Receipt, Invoice, Match, Supplier)
* Description / evidence (ENG-015)
* Owner (user / role / ENG-003n assignment)
* Status
* Raised from (system match vs user)
* Resolution notes
* Approval of resolution where required

#### 3. Lifecycle

```text
OPEN
  → ASSIGNED
  → IN_PROGRESS
  → RESOLVED_PENDING_APPROVAL
  → CLOSED
  → CANCELLED (duplicate / raised in error)
```

Closing a matching exception may release or void payment-ready state according to policy (IP-09 consumes the outcome).

#### 4. Controls

* Maker-checker on high-severity write-offs / over-receipt acceptances
* Cannot close "duplicate invoice" by ignoring detection without recorded decision
* Escalation via ENG-005 / ENG-003n when SLA breached

#### 5. Supplier dispute

Dispute is an exception type linked to supplier communications (IP-04 patterns) and invoices/POs. It is not BP-004 customer case management.

---

## Business Rules

| ID | Rule |
| -- | ---- |
| EX-001 | Exception must reference at least one procurement object. |
| EX-002 | High-severity closure requires approval when configured. |
| EX-003 | Resolution that accepts a variance must record who authorised the tolerance. |
| EX-004 | Closed exceptions are not deleted. |
| EX-005 | IP-10 must not post inventory or GL. |
| EX-006 | Tenant isolation; fail closed. |

---

## UI / UX

**Exceptions** — open / overdue / my items.

**Exception detail** — timeline, links into PO/invoice/receipt, assign, resolve, approve.

Operational counts on the procurement workspace (open exceptions, unmatched invoices) may be shown here; pack analytics remain IP-12.

No BP/IP/ENG labels.

---

## Acceptance Criteria

| ID | Criterion |
| -- | --------- |
| AC-001 | Exceptions can be raised automatically from match variances and manually by users |
| AC-002 | Catalogue includes the listed example types and is extensible by configuration |
| AC-003 | Each exception has owner, action history, resolution and audit |
| AC-004 | High-severity resolution can require ENG-005 approval |
| AC-005 | Duplicate-invoice exception cannot be closed without a recorded decision |
| AC-006 | Linked navigation to PO, receipt and invoice works both ways |
| AC-007 | Cross-business access fails closed |
| AC-008 | IP-10 does not execute payment or stock movements |

### Acceptance matrix

| ID | Criterion | Implementation |
| -- | --------- | -------------- |
| AC-001 | Auto-raise from match/receipt + manual user raise | ✅ `raiseSystem` bridge from `InvoiceService` / `ReceivingService` + `ExceptionService.create` |
| AC-002 | Configurable catalogue of example types | ✅ `procurement_exception_type` seeded from `procurementExceptionTypes` |
| AC-003 | Owner, action history, resolution, audit | ✅ `procurement_exception_action` + ENG-013 audit actions |
| AC-004 | High-severity closure requires approval | ✅ `requiresApproval` + `approveClose` |
| AC-005 | Duplicate invoice needs recorded decision | ✅ `assertDuplicateInvoiceDecision` |
| AC-006 | Linked navigation to PO, receipt, invoice | ✅ `buildExceptionLinkHref` + exception links |
| AC-007 | Cross-business access fails closed | ✅ Repository business scoping |
| AC-008 | No payment or stock movements | ✅ Service boundary — no GL/inventory/payment imports |

### Verification

- Smoke: `npx tsx scripts/bp009-ip10-procurement-exceptions-smoke-validation.ts` — **17/17**
- Migration: `0090_bp009_ip010_procurement_exceptions.sql`
- Routes: `/procurement/exceptions`, `/procurement/exceptions/new`, `/procurement/exceptions/[exceptionId]`

---

## Explicitly Excluded from IP-10

Generic ITSM, customer complaints (BP-004 cases), inventory stocktake variances (BP-008 IP-06), payment settlement exceptions (BP-007 IP-08), GL suspense.

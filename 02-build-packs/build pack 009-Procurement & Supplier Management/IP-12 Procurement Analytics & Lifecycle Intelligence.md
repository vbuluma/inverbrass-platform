# BP-009 IP-12 — Procurement Analytics & Lifecycle Intelligence

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-12 |
| Build Pack | BP-009 – Procurement & Supplier Management |
| Status | ✅ Implemented — **18/18** smoke via `bp009-ip12-procurement-analytics-smoke-validation.ts` |
| Priority | Medium |
| Depends On | IP-01–IP-11 (reads operational stores; does not own transactions) |
| Consumes | ENG-013 (audit queries where needed); must not become BP-012 |
| Scope coverage | SC-011, SC-025 (procurement slice) |
| Objective | Provide procurement, supplier, RFX and operational analytics over the BP-009 lifecycle |

---

## Objective

BP-009 should provide operational intelligence so buyers and owners can act without exporting to spreadsheets.

IP-12 **reads** procurement data. It must not become BP-012 Analytics, AI & Decision Intelligence, and must not implement a second BI platform.

---

## Scope

### Included

#### 1. Procurement

* spend by supplier
* spend by category
* spend by business unit
* PO value
* outstanding POs
* procurement cycle time (PR submit → award → PO issue → receipt → match)

#### 2. Supplier

* supplier performance (from IP-11)
* preferred suppliers
* suspended suppliers
* blacklisted suppliers
* supplier concentration

#### 3. RFX

* RFX count
* response rate
* supplier participation
* award rate
* savings / variance (awarded vs estimated PR / vs median bid — method documented)

#### 4. Operational

* overdue deliveries
* open exceptions
* unmatched invoices
* contract expiries
* pending approvals

#### 5. Lifecycle navigation

Users should open a PR and walk:

```text
PR → RFX → Response → Award → PO → Contract → Receipt → Invoice → Match → Payment Handoff
```

in either direction. IP-12 should expose this chain as a first-class view, not only charts.

#### 6. Export

Authorised export of the above views for the authenticated tenant. No cross-tenant cubes.

---

## Business Rules

| ID | Rule |
| -- | ---- |
| AN-001 | Analytics are tenant-scoped; fail closed. |
| AN-002 | Figures must reconcile to operational records (PO, invoice, receipt), not a separate writable fact table as system of truth. |
| AN-003 | IP-12 must not create POs, invoices or inventory movements. |
| AN-004 | IP-12 must not replace BP-012 as the enterprise AI/analytics pack. |
| AN-005 | Savings calculations must state their formula in-product or in configuration. |

---

## UI / UX

**Procurement dashboard** — KPIs + drill to lists.

**Lifecycle** — chain view for a single buying event.

**Supplier intelligence** — concentration, performance, status counts.

No BP/IP/ENG labels. No fake precision (do not show "AI predicted savings" as a v1 requirement).

---

## Acceptance Criteria

| ID | Criterion |
| -- | --------- |
| AC-001 | Dashboard shows spend by supplier, category and business unit for the tenant |
| AC-002 | Outstanding POs, unmatched invoices, open exceptions and contract expiries are visible |
| AC-003 | RFX response and award rates can be viewed |
| AC-004 | Cycle-time metric can be explained from timestamped lifecycle events |
| AC-005 | User can navigate the full document chain in both directions |
| AC-006 | Cross-business analytics access fails closed |
| AC-007 | IP-12 does not write procurement transactions |
| AC-008 | IP-12 does not implement BP-012 RAG/OCR/forecast product scope |

### Acceptance matrix

| ID | Criterion | Implementation |
| -- | --------- | -------------- |
| AC-001 | Spend by supplier, category, BU | ✅ `ProcurementAnalyticsRepository` + dashboard tables |
| AC-002 | Operational KPIs | ✅ Outstanding POs, unmatched invoices, exceptions, contract expiries |
| AC-003 | RFX response/award rates | ✅ `getRfxMetrics` + `calculateRate` |
| AC-004 | Cycle time explained | ✅ `explainCycleTime` on lifecycle nodes |
| AC-005 | Lifecycle chain navigation | ✅ `/procurement/lifecycle/[anchorType]/[anchorId]` |
| AC-006 | Cross-business fails closed | ✅ `assertPermission` + business-scoped repository |
| AC-007 | No transaction writes | ✅ Read-only service/repository |
| AC-008 | No BP-012 scope | ✅ No RAG/OCR/forecast product features |

### Verification

- Smoke: **18/18** — `npx tsx scripts/bp009-ip12-procurement-analytics-smoke-validation.ts`
- Migration: `0092_bp009_ip011_evaluations_ip012_analytics.sql` (analytics indexes)
- UI: `/procurement/analytics` dashboard + lifecycle chain page

---

## Explicitly Excluded from IP-12

Enterprise data warehouse, BP-012 AI features, customer sales analytics (BP-006/004), inventory valuation dashboards (BP-010/BP-008), GL trial balance, public supplier directory.

---

## Pack close

IP-12 is the last specified increment before **BP-009 v1 certification**. Certification must prove the Definition of Done in `Build Pack-009 Scope.md`, including ownership locks: no supplier master, no inventory ledger, no GL, no customer AR, payment rails still an open v1 decision unless separately closed.

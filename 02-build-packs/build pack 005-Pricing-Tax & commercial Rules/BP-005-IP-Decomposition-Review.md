# BP-005 — IP Decomposition Review & Approval Report

| Attribute | Value |
|-----------|-------|
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Document type | Architecture / documentation review |
| Code changes | **None** |
| Status | **SUPERSEDED for decisions** — see `BP-005-Stakeholder-Review-Response.md` |
| Date | 2026-08-12 (original); decision update same day |

---

## Current decision status

Stakeholder verdict received: **YES WITH CHANGES**.

| Decision | Outcome |
|----------|---------|
| BP-005 | Approved with changes |
| Option A (BP-003 price master) | Confirmed |
| IP-01 boundary | Clarified in Scope + IP-01 |
| Delivery waves | Revised to dependency graph |
| Traceability matrix | Issued — `BP-005-Requirements-Traceability-Matrix.md` |

This file retains the original pre-approval analysis below for history. **Do not use the original wave table or “awaiting approval” checklist for execution.**

---

## Original verdict (pre-stakeholder response)

BP-005 scope is **architecturally sound** and correctly positions a **Commercial Rules & Resolution Engine** ahead of BP-006/BP-007. IP decomposition IP-01…IP-10 is coherent, FR coverage is complete, and boundaries with payment/sales are clear.

One **mandatory alignment decision** must be confirmed before implementation: **IP-01 vs BP-003 IP-011 ownership of offering unit prices**. *(Confirmed Option A.)*

---

## Documents (no code)

Folder: `02-build-packs/build pack 005-Pricing-Tax & commercial Rules/`

| Document | Purpose |
|----------|---------|
| `Build Pack-005 Scope.md` | Pack scope, principle, dependency graph, revised waves |
| `IP-01` … `IP-10` | IP specifications |
| `BP-005-Requirements-Traceability-Matrix.md` | Requirement → IP → runtime tests |
| `BP-005-Stakeholder-Review-Response.md` | Acceptance of YES WITH CHANGES |
| `BP-005-IP-Decomposition-Review.md` | This historical review |

---

## Alignment with Enterprise Catalog

| Catalog statement | Assessment |
|-------------------|------------|
| BP-005 = Pricing, Tax & Commercial Rules | ✅ Matches |
| Offering unit prices remain in BP-003 | ✅ Confirmed Option A |
| Engines: Rules, Localization & Regulatory, Checklist | ✅ ENG-004, ENG-003b, ENG-003l (+ ENG-005/ENG-013) |
| Roadmap R2b — Commercial Completion | ✅ Consistent |
| Catalog note still mentions “taxes — BP-004” in places | ⚠️ Stale — separate hygiene when authorized |

---

## FR Traceability

See **`BP-005-Requirements-Traceability-Matrix.md`** for FR/NFR → IP → runtime flow (authoritative). Compact FR→IP map remains valid:

| Pack FRs | IP |
|----------|----|
| FR-001–FR-007 | IP-01 (+ FR-006 with IP-05) |
| FR-008–FR-015 | IP-02 (+ FR-014 with IP-03) |
| FR-016–FR-020 | IP-03 |
| FR-021–FR-023 | IP-04 |
| FR-024–FR-027 | IP-05 (+ versioning with IP-08) |
| FR-028–FR-032 | IP-06 |
| FR-033–FR-035 | IP-07 |
| FR-036–FR-038 | IP-08 |
| FR-039–FR-043 | IP-09 |
| FR-044 | IP-10 |

---

## Delivery waves — superseded

Original wave table below is **obsolete**. Use revised dependency-based waves in Scope and Stakeholder Review Response.

| Wave (obsolete) | IPs |
|-----------------|-----|
| 1 | IP-01, IP-02, IP-09 |
| 2 | IP-03, IP-04, IP-05 |
| 3 | IP-06, IP-07 |
| 4 | IP-08, IP-10 |

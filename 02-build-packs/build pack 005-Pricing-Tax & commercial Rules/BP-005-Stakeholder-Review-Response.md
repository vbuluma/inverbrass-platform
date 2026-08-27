# BP-005 — Stakeholder Review Response Report

| Attribute | Value |
|-----------|-------|
| **Subject pack** | **BP-005 – Pricing, Tax & Commercial Rules** |
| Not the subject | BP-003 is an **upstream dependency only** (already delivered price master) |
| Input | Stakeholder verdict: YES WITH CHANGES |
| Date | 2026-08-12 |
| Code changes | **None** |

---

## Read this first — no pack confusion

| Pack | Role in this work |
|------|-------------------|
| **BP-005 (this pack)** | Commercial Rules & Resolution Engine — tax, discounts, components, payable, snapshot, expected amounts, downstream contract |
| **BP-003 (dependency)** | Already owns product/offering **base price** (IP-011). BP-005 **reads** it; does not rebuild it |
| BP-006 / BP-007 | Future **consumers** of BP-005 output |

Mentions of BP-003 in these docs mean **“input we consume”**, not “we are documenting or implementing BP-003.”

---

## Executive verdict

Your review is **accepted in full** for **BP-005**. Direction was already correct; your changes close the remaining architectural risk (boundary clarity, wave sequencing, integration traceability).

| Decision | Stakeholder | Architect response |
|----------|-------------|-------------------|
| **BP-005** approval | ✅ YES WITH CHANGES | **Accepted** — this pack = Commercial Rules & Resolution Engine |
| Upstream price master stays in BP-003 | ✅ YES | **Confirmed** — BP-005 does not own base price tables/UI |
| BP-005 IP-01 boundary | ⚠️ Clarify strongly | **Done** — IP-01 = consume/select base price for commercial resolve only |
| Delivery waves | ⚠️ REVISE | **Done** — BP-005 waves only; BP-003 listed as external prerequisite |
| Pricing UI | ✅ Out of BP-005 | **Confirmed** |
| Payment split | ❌ Not BP-005 | **Confirmed** — BP-007 |
| Revenue assurance | ⚠️ Partial BP-005 | **Confirmed** — expected + provenance in BP-005; actual/variance later |

---

## Principle locked (canonical for BP-005)

> **Upstream (BP-003) defines what a product/offering costs. BP-005 determines what that price means commercially for a specific transaction.**

| Layer | Role | Example |
|-------|------|---------|
| Upstream BP-003 | Input: configured base price | Product X = KES 1,000 |
| **This pack BP-005** | **Deliverable: commercial resolution** | Principal 1,000 + Commission 100 + Tax 180 + Discount −50 → **Payable 1,230** + rule versions + timestamp |
| Downstream BP-006 | Consumer | Consumes resolved commercial result |
| Downstream BP-007 | Consumer | Settles amount due (split tender) |
| Future RA | Consumer | Expected vs actual |

---

## Three protections — confirmed

| Protection | Ownership | Status |
|------------|-----------|--------|
| 1. Payment split | BP-007 | Explicit out of scope for BP-005 |
| 2. Component granularity | BP-005 mandatory backend capability (even if UI shows total only) | Locked in Scope critical example |
| 3. Revenue assurance split | BP-005 = expected outcome + provenance; later = actual/variance | Locked; BP-005 must not become reconciliation engine |

---

## Delivery waves — revised (**BP-005 only**)

| | What |
|--|------|
| **External prerequisite** | BP-003 IP-011 already available (not a BP-005 wave; not BP-005 work) |
| **BP-005 Wave 1** | IP-01, IP-02, IP-09 — consume base price + component model + fail-closed |
| **BP-005 Wave 2** | IP-04 → IP-03 → IP-05 — discounts, tax, precedence |
| **BP-005 Wave 3** | IP-08 — versioning / governance |
| **BP-005 Wave 4** | IP-06, IP-07 — resolve API, snapshot, expected amounts |
| **BP-005 Wave 5** | IP-10 — downstream contract freeze |

Full graph is in `Build Pack-005 Scope.md`.

**Note:** Canonical IPs remain BP-005 IP-01…IP-10; conceptual rename mapping is in the Traceability Matrix.

---

## Traceability matrix — delivered

Per your gate (“do not approve implementation without this”):

**File:** `BP-005-Requirements-Traceability-Matrix.md`

Includes:

- Requirement → IP → Owner → Consumes → Produces → Downstream → Runtime test
- FR/NFR compact maps
- Anti-regression non-ownership guards
- RT-01…RT-10 briefs and wave exit criteria

This is the control that prevents “IPs look done, integration is incomplete.”

---

## Docs updated this pass

| File | Change |
|------|--------|
| `Build Pack-005 Scope.md` | Principle, example, RA/payment boundaries, dependency graph, revised waves |
| `IP-01 Base Price Consumption & Applicable Selection.md` | BP-005 consume/select only — not BP-003 |
| `BP-005-Requirements-Traceability-Matrix.md` | **New** |
| `BP-005-IP-Decomposition-Review.md` | Superseded for decisions by this response report (original retained as history) |
| `BP-005-Stakeholder-Review-Response.md` | This report |

---

## What is still open (non-blocking for pack approval)

| Item | Recommendation |
|------|----------------|
| Catalog stale “taxes — BP-004” wording | Separate hygiene PR when you authorize architecture doc edits |
| BP-004 quotations still using BP-003 + local totals | Align later: call BP-005 resolve; snapshot when commercially locked |
| ENG-004 still Planned | Implement BP-005 deterministic services with ENG-004-shaped seams |
| FX multi-currency | Keep fail-closed in v1 unless FX policy exists |

---

## Implementation gate

| Gate | Status |
|------|--------|
| Pack scope approval | **Conditionally closed** (YES WITH CHANGES applied) |
| Implementation start | **Still closed** until you explicitly open Wave 1 |
| Wave done definition | Must pass Traceability Matrix RT exit criteria |

---

## Ask back (confirm close-out)

Reply:

```
BP-005 conditional approval close-out: YES
Traceability matrix: ACCEPT / REVISE
Open Wave 1 implementation: YES / NO (docs only for now)
```

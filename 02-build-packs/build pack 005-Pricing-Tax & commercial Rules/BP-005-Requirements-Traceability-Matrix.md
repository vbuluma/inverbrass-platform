# BP-005 — Requirements → IP → Runtime Traceability Matrix

| Attribute | Value |
|-----------|-------|
| **Subject pack** | **BP-005** – Pricing, Tax & Commercial Rules |
| Upstream only | BP-003 IP-011 = read-only price input (not this pack’s deliverable) |
| Purpose | Prevent “IPs look complete / system integration incomplete” |
| Status | Issued for conditional approval close-out |
| Date | 2026-08-12 |
| Code | None |

---

## Read this first

Every row below is **BP-005 work** unless the cell explicitly says “upstream BP-003”.  
BP-003 appears only as **Consumes** (input), never as the pack being built.

---

## How to read this matrix

- **IP IDs** = BP-005 IP-01…IP-10 (canonical).
- **Runtime tests (RT-xx)** = minimum integration proofs before declaring a BP-005 wave done.
- Downstream consumers must **not** reimplement the “Produces” column.

---

## Core runtime path (end-to-end)

| Step | Requirement (plain language) | IP | Owner | Consumes | Produces | Downstream consumer | Runtime test |
|------|------------------------------|----|-------|----------|----------|---------------------|--------------|
| 1 | Read configured/base price from catalogue | IP-01 | BP-005 | BP-003 IP-011 price master | Candidate / selected base price + price-item provenance | IP-02, IP-06 | RT-01 |
| 2 | Resolve applicable base price for context (channel, party, qty, date, catalogue, currency) | IP-01 | BP-005 | BP-003 prices + dimensions | Deterministic base/principal input | IP-02, IP-05 | RT-01 |
| 3 | Apply discount eligibility & amount | IP-04 | BP-005 | Base price + discount rules | Discount component (−) | IP-02, IP-06 | RT-02 |
| 4 | Calculate tax (inclusive/exclusive, basis, rate) | IP-03 | BP-005 | Taxable components + tax rules + ENG-003b context | Tax component(s) | IP-02, IP-06 | RT-03 |
| 5 | Compose commercial components (principal, fee, commission, tax, discount, …) | IP-02 | BP-005 | Base + tax + discount + other rules | Component tree + payable candidate | IP-06, Finance later | RT-04 |
| 6 | Apply precedence / eligibility; no silent conflict | IP-05 | BP-005 | Candidate rules from IP-01/03/04 | Winning rules + explanation (applied/suppressed) | IP-06, audit | RT-05 |
| 7 | Validate config/currency/integrity; fail closed | IP-09 | BP-005 | Partial or full resolution context | Pass or structured error | All resolve callers | RT-06 |
| 8 | Version / effective-date / activate commercial rules | IP-08 | BP-005 | Draft commercial config | Rule versions, activation audit | IP-05, IP-06, audit | RT-07 |
| 9 | Resolve commercially (API) + commit immutable snapshot | IP-06 | BP-005 | All above | CommercialResult + Snapshot (amounts, components, rule versions, timestamp) | BP-006, IP-07 | RT-08 |
| 10 | Establish expected commercial amounts (header + components) | IP-07 | BP-005 | Snapshot | Expected payable + expected components | BP-007, Future RA | RT-09 |
| 11 | Publish stable downstream contract | IP-10 | BP-005 | IP-06/07/09 surfaces | Versioned API contract | BP-006, BP-007, Finance, RA | RT-10 |

---

## FR → IP → runtime (compact)

| FR range | Requirement theme | Primary IP | Supporting IP | Runtime test |
|----------|-------------------|------------|---------------|--------------|
| FR-001–FR-007 | Catalogues, methods, effective dating, applicable price, provenance | IP-01 | IP-05, IP-09 | RT-01 |
| FR-008–FR-015 | Components, dependencies, precision, reconcile | IP-02 | IP-09 | RT-04 |
| FR-016–FR-020 | Tax types, rates, inclusive/exclusive, basis | IP-03 | IP-02, ENG-003b | RT-03 |
| FR-021–FR-023 | Discounts, eligibility, limits/approvals | IP-04 | IP-05, ENG-005 | RT-02 |
| FR-024–FR-027 | Conflict, no silent pick, traceability, versioning | IP-05 | IP-08 | RT-05, RT-07 |
| FR-028–FR-032 | Resolve API, snapshot, immutability, current vs historical | IP-06 | IP-09 | RT-08 |
| FR-033–FR-035 | Expected amounts for controls | IP-07 | IP-06 | RT-09 |
| FR-036–FR-038 | Governance, audit, no destructive delete of history | IP-08 | ENG-005, ENG-013 | RT-07 |
| FR-039–FR-043 | Validate, fail closed, structured errors, determinism | IP-09 | IP-06 | RT-06 |
| FR-044 | Downstream consumes resolved result | IP-10 | BP-006/BP-007 | RT-10 |

---

## NFR → runtime proof

| NFR | Proof owner | Runtime test / evidence |
|-----|-------------|-------------------------|
| NFR-001 Deterministic | IP-06, IP-09 | RT-08 repeatability |
| NFR-002 Snapshot immutable | IP-06 | RT-08 after rule change |
| NFR-003 Decimal money | IP-02 | RT-04 |
| NFR-004 Currency rounding | IP-02, IP-03 | RT-03, RT-04 |
| NFR-005/006 businessId + auth | IP-06, IP-09 | RT-06 cross-tenant deny |
| NFR-007 Auditable changes | IP-08 | RT-07 audit row |
| NFR-008 No silent fallback | IP-09 | RT-06 missing config |
| NFR-009 Stable contract | IP-10 | RT-10 consumer compile/contract check |
| NFR-010 Extensible components | IP-02, IP-10 | RT-04 additive component |
| NFR-011 No duplicate calc for Finance/RA | IP-07, IP-10 | RT-09 read-only consume |
| NFR-012 Provenance | IP-05, IP-06 | RT-05, RT-08 explanation present |

---

## Explicit non-ownership (anti-regression)

| Capability | BP-005 owns? | Actually owned by | Guard test |
|------------|--------------|-------------------|------------|
| Configured/base product price | **No** | Upstream BP-003 IP-011 | RT-01 asserts price item id from BP-003 |
| Commercial components / tax / discount / payable | **Yes** | BP-005 | RT-02…RT-04 |
| Payment split (cash + M-Pesa) | **No** | BP-007 | RT-10 amount due only — no tender split |
| Actual collected / variance RA | **No** | Future RA (+ BP-007 actuals) | RT-09 exposes expected only |
| Pricing master UI | **No** | BP-003 Product Workspace Pricing | AC on IP-01 |
| Order/checkout execution | **No** | BP-006 | RT-10 |

---

## Runtime test briefs (minimum)

| ID | Given | When | Then |
|----|-------|------|------|
| RT-01 | BP-003 Product X = 1,000; valid dimensions | Resolve base | Base = 1,000; provenance includes BP-003 price item / catalogue |
| RT-02 | Discount rule −50 eligible | Resolve | Discount component −50; rule id retained |
| RT-03 | Tax rule yields 180 on taxable basis | Resolve | Tax component 180; type/rate/basis retained |
| RT-04 | Principal 1000 + commission 100 + tax 180 + discount −50 | Compose | Payable 1,230; components reconcile |
| RT-05 | Two exclusive discounts match | Resolve | Hard fail or deterministic precedence — never silent arbitrary pick; explanation present |
| RT-06 | Missing required tax/price config | Resolve | Structured error; no invented payable |
| RT-07 | New tax rate version activated | Resolve at date D / D+1 | Correct version; prior snapshots unchanged |
| RT-08 | Successful resolve then commit; later rate change | Read snapshot | Snapshot still 1,230 composition; rule versions + timestamp present |
| RT-09 | Snapshot committed | Read expected | Expected payable 1,230 + component expecteds; payment posting does not mutate |
| RT-10 | BP-006/BP-007 mock consumers | Call contract | Consume snapshot/expected; no local tax/discount engine |

---

## Conceptual dependency map ↔ IP IDs

| Conceptual step (stakeholder view) | Canonical IP |
|------------------------------------|--------------|
| Base price consumption (read upstream) | IP-01 |
| Applicable base-price selection for commercial context | IP-01 |
| Discounts | IP-04 |
| Tax resolution | IP-03 |
| Commercial components | IP-02 |
| Rules / eligibility / precedence | IP-05 |
| Effective dating / versioning | IP-08 (+ dating already on IP-01/IP-03 rules) |
| Resolution snapshot | IP-06 |
| Expected amount | IP-07 |
| Provenance | IP-05 explanation + IP-06 snapshot |
| Downstream contract | IP-10 |
| Validation / resilience | IP-09 (cross-cutting) |

---

## Wave exit criteria (use this matrix)

| Wave | Must pass |
|------|-----------|
| 1 | RT-01, RT-04 (skeleton), RT-06 (basic) |
| 2 | RT-02, RT-03, RT-05 |
| 3 | RT-07 |
| 4 | RT-08, RT-09 |
| 5 | RT-10 |

Implementation of a wave is **not** complete until listed RTs pass — regardless of UI polish.

# BP-009 IP-11 — Supplier Performance & Governance

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-11 |
| Build Pack | BP-009 – Procurement & Supplier Management |
| Status | ✅ Implemented — **22/22** smoke via `bp009-ip11-supplier-performance-smoke-validation.ts` (includes multi-rater enhancement) |
| Priority | High |
| Depends On | IP-01, IP-06, IP-08, IP-09, IP-10, ENG-005, ENG-013, ENG-015 |
| Scope coverage | SC-003, SC-011 |
| Objective | Accumulate transactional supplier performance, manage preferred status, suspension and blacklisting |

---

## Objective

Supplier performance should be continuously accumulated from actual transactions and feed future sourcing — not sit as a static report.

```text
Supplier Performance
       ↓
Score ≥ configured threshold
       ↓
Preferred Supplier
       ↓
Future RFx
       ↓
Higher ranking / invitation preference
```

This must **not automatically guarantee awards**. Procurement governance remains intact.

Blacklisting requires reason, effective date, approving authority, supporting evidence, and review date where applicable.

---

## Business Problem

"Preferred" on a sticky note and "do not use" in a WhatsApp group cannot be enforced on RFX invitation or PO issue.

---

## Scope

### Included

#### 1. Performance measures

Accumulated from POs, receipts, invoices, exceptions and contracts:

| Dimension | Examples |
|-----------|----------|
| Delivery | On-time %, lead time |
| Quality | Rejection rate |
| Price | Competitiveness vs award/market reference where available |
| Fulfilment | Complete vs partial deliveries |
| Service | SLA adherence |
| Responsiveness | Issue resolution |
| Compliance | Contract/document compliance |
| Invoice accuracy | Invoice discrepancies |
| Disputes | Number/severity |
| Overall | Composite score |

Measures and weights are configuration-driven. Scores preserve underlying event counts, not only the composite.

#### 2. Scorecards

Period scorecard per supplier / category. Visible on the procurement profile (IP-01). Used as an optional IP-05 criterion and IP-03 invitation ranking.
Score card dimensions i.e questions to be answered are configurable and can be uploaded from excel or input.

**Multi-rater performance review (v1.1 enhancement):** One or more internal reviewers score each active measure; scores are averaged per measure. Supplier self-review is required by default. Buyers configure whether supplier scores are included in the average (`includeSupplierSelfEvalInAverage`, default **false** = information only). Distinct from **RFX bid evaluation** (IP-05).

#### 3. Preferred supplier

Configurable threshold and approval. Preferred affects invitation ranking and pickers. **Does not auto-award (INV-009).** Can be withdrawn when scores fall.

#### 4. Status governance

Full workflow for:

```text
Active
Preferred
Conditional
Suspended
Blacklisted
Inactive
```

Blacklisting / suspension requires:

* reason
* effective date
* approving authority
* supporting evidence (ENG-015)
* review date where applicable

IP-01 already stores the status model. IP-11 owns the governed transition, evidence pack and enforcement policy.

#### 5. Enforcement

Configurable policy must prevent **new** procurement involving blacklisted suppliers:

* new RFX invitation
* new award
* new PO
* new contract
* payment-ready (unless exception)

Historical PR/PO/invoice records remain accessible.

Conditional status may limit categories or require extra approval (configuration).

---

## Business Rules

| ID | Rule |
| -- | ---- |
| PERF-001 | Composite score is derived from recorded measures; it is not the only stored evidence. |
| PERF-002 | Preferred must not auto-create Award or PO. |
| PERF-003 | Blacklist transition requires reason, authority and audit. |
| PERF-004 | New invitations/POs to Blacklisted suppliers fail per policy. |
| PERF-005 | Historical documents remain readable after blacklist. |
| PERF-006 | IP-11 must not create a second Party/supplier master. |
| PERF-007 | Tenant isolation; fail closed. |

---

## UI / UX

**Supplier scorecard** — dimensions, trend, linked events (late POs, exceptions).

**Governance** — propose preferred / suspend / blacklist with evidence and approval.

**Enforcement** — blocked action shows a clear business reason ("Supplier is blacklisted") not an engine ID.

---

## Acceptance Criteria

| ID | Criterion |
| -- | --------- |
| AC-001 | Scorecard measures can be derived from receipts, invoices and exceptions |
| AC-002 | Preferred status can be granted from a threshold + approval |
| AC-003 | Preferred supplier is not auto-awarded in IP-05 |
| AC-004 | Blacklisting requires reason, authority, evidence and audit |
| AC-005 | New PO/RFX invitation to a blacklisted supplier is blocked by policy |
| AC-006 | Historical POs remain accessible after blacklist |
| AC-007 | Suspension is distinct from blacklist and inactive |
| AC-008 | Profile identity remains BP-002 |
| AC-009 | Transitions are audited through ENG-013 |
| AC-010 | Cross-business scorecard access fails closed |

### Scope notes / conflicts

| Topic | Resolution |
|-------|------------|
| Excel upload for scorecard dimensions (spec §2) | **Deferred** — catalogue is seeded and extensible per business; manual dimension entry via governance UI only in v1. |
| IP-01 direct status/preferred toggles | **Coexists** — IP-01 quick actions remain for operational use; IP-11 governance path is required for blacklist/suspend evidence and preferred grant when `preferredRequiresApproval` is enabled. |
| INV-009 auto-award | **Preserved** — preferred affects invitation ranking only; `awardSuppliers` still requires explicit award selection. |
| IP-03 invitation ranking UI | ✅ **Implemented** — `rankSuppliers()` integrated into sourcing invitation supplier sort; buyer override preserved. |
| Multi-rater performance reviews | ✅ **Implemented** — `procurement_performance_evaluation` + averaging rules; supplier self-review required by default. |
| Supplier portal self-review | **Deferred** — buyer can record supplier self-review; dedicated supplier portal form not in v1. |

### Acceptance matrix

| ID | Criterion | Implementation |
| -- | --------- | -------------- |
| AC-001 | Measures from receipts, invoices, exceptions | ✅ `ProcurementPerformanceBridge` hooks on receiving, invoice, exception services |
| AC-002 | Preferred from threshold + approval | ✅ `proposeGovernance` + `approveGovernance` |
| AC-003 | Preferred not auto-awarded | ✅ Explicit award in `awardSuppliers` |
| AC-004 | Blacklist requires reason, authority, evidence, audit | ✅ `assertGovernanceEvidence` + ENG-013 audit |
| AC-005 | New PO/RFX blocked for blacklisted | ✅ `evaluateSupplierEligibility` enforcement (existing + clearer PO errors) |
| AC-006 | Historical POs readable | ✅ Profile/history not deleted on blacklist |
| AC-007 | Suspension distinct from blacklist/inactive | ✅ Separate status transitions |
| AC-008 | Profile identity on BP-002 | ✅ `procurement_profile` unchanged |
| AC-009 | Audited transitions | ✅ Governance + performance audit actions |
| AC-010 | Cross-business fails closed | ✅ Repository business scoping |

### Verification

- Smoke: **22/22** — `npx tsx scripts/bp009-ip11-supplier-performance-smoke-validation.ts`
- Migration: `0091_bp009_ip011_supplier_performance.sql`, `0092_bp009_ip011_evaluations_ip012_analytics.sql`
- UI: Supplier profile → **Performance** tab (scorecard + performance reviews + governance)

---

## Explicitly Excluded from IP-11

Credit-bureau scoring, customer loyalty (not this pack), HR appraisals, IP-12 analytics productisation beyond operational scorecards, payment default scoring as a credit engine.

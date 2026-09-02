# BP-009 IP-05 — Evaluation, Award & Sourcing Decision

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-05 |
| Build Pack | BP-009 – Procurement & Supplier Management |
| Status | ✅ Implemented — **30/30** smoke via `bp009-ip05-evaluation-award-smoke-validation.ts`; bid opening, phase scores, rank/recommendation, line-level award split, ENG-005 award approval UI, sealed-bid count-only mode, and blacklist gate |
| Architecture baseline | AV-1.12 |
| Priority | High |
| Depends On | IP-01, IP-03, IP-04, ENG-005 (Maker-Checker opening and award approval when configured), ENG-013 |
| Scope coverage | SC-011 |
| Objective | Open bids under policy, evaluate against locked criteria, recommend, and award without creating a PO |

---

## Objective

IP-05 answers:

> **How do we evaluate the responses, and who should we select?**

```text
IP-04 responses stored
          ↓
Tender closed (bids received)
          ↓
Set up evaluation committee
          ↓
Set evaluation criteria (locked for this RFX)
          ↓
Start evaluation
          ↓
Opening (Standard or Maker-Checker)   ← policy locked in IP-03
          ↓
Technical evaluation (phases)
          ↓
Financial evaluation
          ↓
Due diligence required? (Y/N — before award recommendation)
          ↓
Rank / recommend
          ↓
Buyer award (override + reason)
          ↓
Award record  →  IP-06
```

**Preferred supplier status must not automatically guarantee an award.**

**Do not rebuild** `computeCommercialOutcome`, header comparison, or `procurement_award`. Enhance them. **Do not** create a second award table or a second savings formula.

---

## Current implementation (reuse)

| Capability | Evidence | Status |
| --- | --- | --- |
| Budgeted / negotiated savings, awarded amount, savings % | `evaluation-outcome-rules.ts` | Implemented (header) |
| Budget from linked PR estimated values | `SourcingBudgetAdapter` | Implemented — do not add a second budget ledger |
| Side-by-side commercial comparison | `evaluation-outcome-workspace.tsx` | Implemented (header prices/savings only) |
| Recommendation text | `procurement_sourcing_event.recommendation` | Implemented |
| Header award + split allocated budget | `awardSuppliers`, `procurement_award` | Implemented |
| Line-level award split | `lineAwards[]`, `procurement_award_line` | Implemented |
| Split does not double-count RFX budget | allocated sum ≤ RFX budget | Implemented — single RFX baseline |
| Award audit | `PROCUREMENT_SOURCING_AWARDED` / `SOURCING_AWARD_SUBMITTED` / `SOURCING_AWARD_APPROVED` | Implemented |
| Quotes visible during bidding | `toEvaluation()` while `ISSUED` | Sealed until `EVALUATING` + `bidsOpenedAt` |
| Bid opening (Standard / Maker-Checker) | `openBids`, `bids_opened_*` columns | Implemented |
| Technical phases / scores / rank / methods A–B | `evaluation-scoring-rules.ts`, `procurement_sourcing_phase_score` | Implemented |
| System recommendation + override reason | `recommended_profile_ids`, `override_reason` | Implemented |
| Award lines + winning quote version FK | `procurement_award.winning_quote_id` | Implemented |
| ENG-005 award approval UI | `approveAward`, `evaluation-outcome-workspace.tsx` | Implemented when `award_requires_approval` |

---

## Opening (consumes IP-03 policy)

Do **not** assume Maker-Checker is universal.

| Policy | After close |
| --- | --- |
| **Standard** | An authorised role may open bids for evaluation. **Still required:** RBAC, audit, submission lock, version integrity, **access logging of who opened/viewed bids**. No second-person gate. |
| **Maker-Checker** | Bids stay sealed until the configured dual-control opening completes (ENG-005 when required). An RFX user must not bypass a mandate from organisation default or enforcement rules (value, category, type, risk). |

IP-05 must refuse to show commercial comparison, scores, or award actions until the RFX is **opened** (or policy explicitly allows a documented exception).

---

## Evaluation criteria (configured after tender close)

Evaluation criteria are **not** set at RFX creation. After the tender is closed and bids are received, the buyer follows this sequence:

1. **Close tender** — confirm bids received; lock submissions.
2. **Evaluation committee** — record committee members (at least one).
3. **Evaluation criteria** — method, technical phases, weights, passmarks, financial basis.
4. **Lock criteria** — immutable snapshot + SHA-256 hash; blocks further criteria changes.
5. **Start evaluation** — status moves to `EVALUATING`; commercial content remains sealed.
6. **Open bids** — authorised opening unlocks commercial comparison (requires criteria lock).

```text
Technical evaluation
├── Desktop
├── Demo
├── PoC
├── Reference calls
└── Site visits
    Configurable: include/omit, sequence, weight, passmark, required/optional, evaluators

Financial evaluation
└── Weight + basis (Year 1 / Total Contract Value / TCO)
```

**Payment terms are not scored here.** They may be displayed as proposal facts from IP-04.

### Due diligence (before award recommendation)

Immediately before the award recommendation, record **Due diligence required: Yes / No**.

When **Yes**, confirm:

- Location verified
- Staff verified
- Legal requirements verified
- Others (free-text notes)

Award is blocked until due diligence is recorded and, when required, all mandatory checks are confirmed.

### Method A — Lowest Compliant Quote

Technical passmark(s) → only qualified suppliers → lowest quote on the configured financial basis.

Buyer explanation (operational language, no IP labels):

> Lowest Compliant Quote: suppliers must first meet the required technical passmark. Price then determines the award among technically qualified suppliers.

### Method B — Best Overall Score

Overall = Technical score × technical weight + Financial score × financial weight.

Buyer explanation:

> Best Overall Score: both technical capability and price contribute to the award. The supplier with the highest combined score is ranked first.

Financial score, when used, should be transparent (for example lowest qualified quote / supplier quote × 100). The formula must be **configured or clearly defined**, not a hidden black box.

Failed technical gates do not proceed where the phase is a gate.

---

## Comparison and history

Side-by-side: line items (when IP-04 has lines), initial vs final quote, technical score, financial score, overall, rank.

Quote **versions** already preserve initial vs final **price**. Do not destroy them. Add score snapshots so revisions do not erase earlier evaluation evidence.

---
NB:Preview to be enabled at each evaluation stage e.g Evaluation criteria preview, Desktop,....Financial preview.
## Award

* System recommendation from the method (rank 1, or lowest compliant).
* Buyer makes the final selection; if different from recommendation, capture **override reason**.
* Award references winning **response/quote version**.
* Split awards: keep existing supplier-level budget split; extend to **line-level** without double-counting RFX budget.
* Commercial savings display remains the approved header/allocated model — computed, not a stored `total_savings` ledger.
* Award approval uses ENG-005 **when configured** (same pattern as opening: not always on).
* IP-05 does not create PO, inventory, or payment records.

---

## Business Rules

| ID | Rule |
| -- | ---- |
| AW-001 | Award from RFX must reference the winning submitted response. |
| AW-002 | Cannot award a supplier who did not submit (unless a documented exception type exists). |
| AW-003 | Cannot award a Blacklisted supplier. |
| AW-004 | Preferred status must not auto-create an award. |
| AW-005 | Calculated score must not overwrite stored evaluator scores. |
| AW-006 | Split award quantities cannot exceed RFX/PR quantities unless policy allows. |
| AW-007 | Award approval is configuration-driven. |
| AW-008 | IP-05 must not create PO, contract, receipt or invoice records. |
| AW-009 | Commercial comparison and award are blocked until the RFX is opened under locked policy. |
| AW-010 | IP-05 must not weaken Maker-Checker when organisation/enforcement rules mandate it. |
| AW-011 | Onboarding provenance (IP-01) is not an evaluation score input. |

---

## UI / UX

**Configure** lives in the **evaluation workflow** after tender close — committee, then method/phases/passmarks/weights/financial basis.

**Evaluate** — stepped: close → committee → criteria → start → comparison; powerful configuration, simple buyer screens.

**Due diligence** — Y/N gate immediately before award recommendation.

**Award** — recommendation → decision → rationale if overridden.

No BP/IP/ENG labels in the UI.

---

## Acceptance Criteria

| ID | Criterion |
| -- | --------- |
| AC-001 | Evaluators can score submitted responses against locked RFX technical phases |
| AC-002 | Composite technical / overall scores are calculated from stored evaluator input |
| AC-003 | Comparison view shows invited suppliers who submitted (after opening) |
| AC-004 | Award is linked to the winning response |
| AC-005 | Preferred supplier is not auto-awarded |
| AC-006 | Blacklisted supplier cannot be awarded |
| AC-007 | Award approval uses ENG-005 when configured |
| AC-008 | Split awards are line-explicit when lines exist; header split remains valid until then |
| AC-009 | Evaluation, opening, and award events are audited |
| AC-010 | IP-05 does not create a PO or inventory movement |
| AC-011 | Existing commercial savings and header award remain; they are not replaced by a parallel engine |
| AC-012 | Standard opening still requires RBAC, audit, locks, version integrity, and access logging |

---

## Explicitly Excluded from IP-05

PO generation (IP-06), contracts (IP-07), receiving, invoices, exception workspace, automated IP-11 scorecard as a hidden award, analytics pack (IP-12), payment execution, payment-term **scoring**, RFX publication, supplier response entry, a second quote or award datastore.

---

## IMPLEMENTATION PROMPT

> **Superseded (2026-09-01):** Final BP-009 certification pass completed. See `bp009-final-integration-certification.ts` and `docs/certification/BP-009-PROCUREMENT-CERTIFICATION.md`.

The following historical prompt is retained for traceability only:

```
Cursor Implementation Prompt — BP-009 IP-05 Evaluation, Award & Sourcing Decision

Implement ONLY pending BP-009 IP-05 on the existing SourcingService. Do not rebuild
computeCommercialOutcome, header comparison, procurement_award, supplier portal, or
quote writer. Do not create a second sourcing engine or duplicate commercial logic.
Do not implement IP-06 PO, line-level award split, ENG-015 attachments, or full
ENG-005 award approval UI.

Enhance existing SourcingService / procurement_sourcing_event / procurement_award.

Objective: open bids under locked IP-03 policy, score against locked criteria,
recommend, and award with winning quote reference.

Must implement:
1. Bid opening separate from start evaluation: bids stay sealed until openBids().
   Standard: RBAC + audit. Maker-Checker: distinct opener/approver (SELF_APPROVAL gate).
2. isCommercialSealedToBuyer requires bidsOpenedAt (not only EVALUATING status).
3. Phase score persistence (procurement_sourcing_phase_score) + recordPhaseScores().
4. evaluation-scoring-rules.ts: technical/financial/overall scores, rank, recommendation.
5. Comparison view: technical, financial, overall, rank, recommended flag after opening.
6. awardSuppliers(): blacklist via evaluateSupplierEligibility; winningQuoteId on award;
   override reason when deviating from system recommendation.
7. Migration 0085; memory store + repository parity; workspace UI for open/score/award.
8. Actions: openBidsAction, recordPhaseScoresAction.
9. Audit: SOURCING_BIDS_OPENED, SOURCING_PHASE_SCORED (extend existing award audit).
10. Dedicated IP-05 smoke script; update IP-03 smoke advanceToAwardReady helper.

Do not implement: PO generation, line-level award split, payment-term scoring,
second award table, or parallel savings engine.

STOP after implementation report.
```

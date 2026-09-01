# BP-009 IP-04 — Supplier Response & Collaboration

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-04 |
| Build Pack | BP-009 – Procurement & Supplier Management |
| Status | ✅ Implemented — migration `0083`, structured response (lines, payment terms, TCO), withdraw, clarifications, sealed buyer view, ENG-009 ack, portal audit; smoke `bp009-ip04-supplier-response-smoke-validation.ts` 22/22 |
| Architecture baseline | AV-1.12 |
| Priority | High |
| Depends On | IP-01, IP-03, ENG-013, ENG-015, ENG-009, ENG-003e |
| Scope coverage | SC-011 |
| Objective | Let invited suppliers submit a complete, versioned response without email re-keying, without exposing competitor bids |

---

## Objective

IP-04 answers:

> **What did each invited supplier tell us?**

```text
IP-03 RFX published + invited
          ↓
Secure link / token
          ↓
Supplier response (sealed storage)
          ↓
Close (IP-03 lifecycle) — tender closed, bids received
          ↓
Evaluation committee → criteria → start evaluation (IP-05)
          ↓
Opening (IP-03 policy) → commercial comparison
```

**Do not rebuild** the existing portal, invitation token, or quote-version writer. Enhance `SourcingService` / `procurement_supplier_quote` (and children). **Do not** score, rank, or award (IP-05). **Do not** create POs (IP-06).

---

## Current implementation (reuse)

| Capability | Evidence | Status |
| --- | --- | --- |
| Invitation token + expiry | `procurement_sourcing_invitation.access_token`, `token_expires_at` | Implemented |
| Public supplier workspace | `/sourcing/respond/[token]`, `sourcing-supplier-portal.tsx` | Implemented |
| Own quotes only | `toPortal()` filters by `profileId` | Implemented |
| Header quote versions | `procurement_supplier_quote.version`; v1 never overwritten | Implemented |
| Structured lines + payment schedule | `procurement_supplier_quote_line`, `procurement_supplier_quote_payment_term` | Implemented |
| TCO / comments / delivery / warranty | Quote version columns + portal form | Implemented |
| Withdraw bid | `withdrawQuote` / `withdrawQuoteByToken`; `QUOTE_WITHDRAWN` audit | Implemented |
| Staff capture | `capturedOnBehalf` flag + buyer workspace label | Implemented |
| Bid version integrity | Append-only versions; idempotency key | Implemented |
| Competitor isolation (supplier) | Portal omits other suppliers and budget | Implemented |
| Buyer sealed view during bidding | `isCommercialSealedToBuyer`; invitation status only while `ISSUED` | Implemented |
| Clarifications | `procurement_sourcing_clarification` + portal / workspace UI | Implemented |
| Portal opened audit | `SOURCING_PORTAL_OPENED` on first token load | Implemented |
| Submission notification | ENG-009 in-process adapter (non-blocking) | Implemented |
| Attachments (ENG-015) | — | Deferred |
| Late-submit `LATE` marking | Hard block after close only | Deferred to IP-05 policy |

---

## Opening policy — IP-04 behaviour

Opening policy is **resolved and locked on the RFX in IP-03** (Organisation Default / Standard / Maker-Checker, plus enforcement rules). IP-04 does not let a supplier or buyer pick a weaker policy.

Maker-Checker is **not** required on every RFX.

### Always on (Standard and Maker-Checker)

| Control | IP-04 requirement |
| --- | --- |
| Role-based access | Token is RFX- and invitation-scoped. Buyer APIs require sourcing permissions. |
| Audit logging | Quote submit/revise audited (`PROCUREMENT_SOURCING_QUOTE_SUBMITTED` exists; extend for lines). |
| Bid submission locking | While open: invited suppliers may submit/revise per rules. After close: lock except late policy. |
| Bid version integrity | New version rows; never update prior version amounts. |
| Access logging | Viewing another supplier’s commercial content is an IP-05 opening concern; IP-04 must not leak it through the portal. Log supplier access to the RFX (opened link) when implemented. |

**Standard vs Maker-Checker** does **not** change supplier isolation or versioning. It only changes **when authorised buyers may see submitted commercial content** (IP-05 opening).

Until opening, buyers should see invitation/submission **status**, not prices — including under Standard. Standard means no second-person unseal **after close**, not “prices visible while bidding.”

Staff capture-on-behalf during a sealed bidding period is an audited exception, not a way to display competitor prices.

---

## Scope

### Included

#### 1. Secure invitation (enhance existing)

Tokenised URL, tenant- and RFX-scoped. Add expiry, revocation on cancel/close, optional Party-linked supplier user. Do not dump all RFX publicly.

#### 2. Supplier response content

* Header and **line** pricing: line item, quantity, unit price, price, tax, total
* Comments / commercial assumptions (e.g. perpetual licence vs subscription)
* Delivery / lead time / warranties where requested
* Attachments (ENG-015)
* Clarifications (Q&A)

#### 3. Quote versions

Initial / revision / final. Preserve history, submitter, timestamps. Evaluation uses the **final** version after opening unless a version is explicitly selected.

While the tender is **open** (IP-03 `closesAt` not passed, not awarded), the vendor may:

* submit
* revise (append a new version — never overwrite version 1)
* cancel / withdraw the bid (status WITHDRAWN; prior versions remain)

After close, submit / revise / withdraw are blocked unless late-response policy applies.

#### 3b. Submission notification

On successful submit or revision, notify the supplier through ENG-009 (in-process adapter until transport is wired). Audit the bid regardless of delivery outcome. Do not implement this as a second CRM mailbox.

#### 4. Multi-year / TCO (optional per RFX)

Year 1…N amounts and TCO total on the quote version. IP-05 may select Year 1 / TCV / TCO as financial basis. Do not store a second TCO ledger.

#### 5. Payment terms (financial proposal — not evaluation)

Configurable schedule on the **response**, not on evaluation weights:

* milestone name
* percentage
* amount where applicable
* trigger/event
* due period
* comments

Validate percentages total **100%**.

Do **not** use `procurement_profile.default_payment_terms` as this schedule. That field is an IP-01 supplier default string only.

#### 6. Clarifications

Supplier question, buyer answer, auditable, RFX-linked. **All questions and answers are published on the same RFX and are visible to every invited supplier** (not limited to the asking vendor). Material requirement changes follow IP-03 addendum rules.

#### 7. Assisted capture

Explicit “captured for supplier” with attribution.

---

## Business Rules

| ID | Rule |
| -- | ---- |
| SR-001 | Only invited suppliers may respond to that RFX. |
| SR-002 | Blacklisted / ineligible suppliers must not receive a usable invitation when policy forbids it. |
| SR-003 | Submitted versions are immutable except via a new version before close. |
| SR-004 | Tokens must not leak across tenants. |
| SR-005 | Late submit is rejected or marked LATE by configuration. |
| SR-006 | Duplicate submit of an identical in-progress draft is idempotent. |
| SR-007 | IP-04 must not compute award scores or create POs. |
| SR-008 | Response documents use ENG-015. |
| SR-009 | Suppliers never see competitor responses or internal budget/savings. |
| SR-010 | IP-04 must not weaken a Maker-Checker opening mandate locked on the RFX. |
| SR-011 | Payment-term percentages on a submitted proposal must total 100% when a schedule is required. |
| SR-012 | While the RFX is open (not awarded and before `closesAt`), the supplier may submit, revise (new version), or withdraw their bid. After close, those actions are blocked except late policy. |
| SR-013 | On successful submit or revision, the supplier receives a notification (ENG-009). Failure to deliver the notice must not roll back the stored bid. |
| SR-014 | Clarification questions and buyer answers are published on the RFX and visible to all invited suppliers. |

---

## UI / UX

**Buyer (during bidding):** invitation status (invited / opened / submitted). No competitor prices until the RFX is opened under IP-03 policy.

**Supplier:** RFX summary, lines, pricing, payment-term section, Q&A, submit. No BP/IP/ENG labels.

---

## Acceptance Criteria

| ID | Criterion |
| -- | --------- |
| AC-001 | Buyer can issue a secure invitation link for an invited supplier |
| AC-002 | Supplier can submit pricing, terms, documents and comments through the link |
| AC-003 | Response is stored against RFX and supplier profile |
| AC-004 | Uninvited party cannot submit |
| AC-005 | Cross-tenant token use fails closed |
| AC-006 | After close, on-time submit is blocked or marked LATE per policy |
| AC-007 | Clarification Q&A is recorded on the RFX |
| AC-008 | Staff capture-on-behalf is attributed and auditable |
| AC-009 | Competitor responses are not visible to a supplier |
| AC-010 | IP-04 does not create evaluation scores, awards or POs |
| AC-011 | Header quote versions already in production remain valid; new line/TCO/payment fields extend them |
| AC-012 | Always-on controls apply under Standard opening as well as Maker-Checker |
| AC-013 | Vendor may cancel or resubmit only while the tender is open |
| AC-014 | Vendor is notified on successful submission (ENG-009); bid remains stored if notify fails |

---

## Explicitly Excluded from IP-04

Evaluation/award (IP-05), tender **opening** decision (IP-03 policy; IP-05 consumes it), PO (IP-06), contracts, receiving, invoices, supplier performance scoring, analytics, payment rails, customer CRM as system of record, mixing payment terms into technical/financial **weights**.

---

## IMPLEMENTATION PROMPT

The following is the copy-paste-ready instruction set for the **pending IP-04 increment only**.

```
Cursor Implementation Prompt — BP-009 IP-04 Supplier Response & Collaboration

Implement ONLY pending BP-009 IP-04. Do not implement IP-05 scoring, rank, unseal,
or award-line changes. Do not rebuild the supplier portal, quote-version writer,
commercial savings formulas, or procurement_award. Do not create a second sourcing
engine. Do not implement IP-06.

Enhance the existing SourcingService / procurement_supplier_quote (and children).

Objective: complete supplier response depth and buyer sealed bidding while tender
is ISSUED.

Must implement:
1. Quote version extensions: status ACTIVE|WITHDRAWN|LATE; comments; delivery lead
   time; warranty notes; optional year1/tcv/tco amounts; capturedOnBehalf flag;
   idempotencyKey for duplicate draft protection.
2. Line items child table (description, qty, unit price, tax, line total).
   Header amount may be supplied or derived from line totals.
3. Payment-term schedule on the quote version (milestone, %, amount, trigger,
   due period, comments). Percentages must total 100% when schedule provided.
4. Withdraw bid while tender open (WITHDRAWN on latest version; invitation status).
5. Submission notification via ENG-009 on submit/revise (non-blocking; bid stored
   if notify fails).
6. Invitation enhancements: openedAt, responseStatus, tokenExpiresAt (= closesAt).
   Revoke/expiry checks on portal access.
7. Portal access audit (SOURCING_PORTAL_OPENED).
8. Clarifications Q&A (supplier ask via token; buyer answer with optional broadcast).
9. Buyer sealed view: while event status ISSUED, hide commercial comparison from
   buyer workspace; show invitation status (invited/opened/submitted/withdrawn).
10. Supplier portal UI: lines, payment schedule, TCO fields, comments, withdraw,
    clarifications. Staff capture labelled "Capture response for supplier".
11. Audit: QUOTE_SUBMITTED (extend refs), QUOTE_WITHDRAWN, PORTAL_OPENED,
    CLARIFICATION_ASKED, CLARIFICATION_ANSWERED.
12. Migration 0083; memory store + repository; dedicated IP-04 smoke script.
13. Existing header-only quotes remain valid (AC-011).

Do not implement IP-05 opening UI, ENG-015 attachment upload, or late-submit
policy marking (hard block after close is sufficient for this increment).

STOP after implementation report.
```

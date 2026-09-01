# BP-009 IP-03 — Sourcing & RFX Management

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-03 |
| Build Pack | BP-009 – Procurement & Supplier Management |
| Status | ✅ Implemented — RFX lifecycle through close, committee constitution, post-close criteria configuration, criteria lock before bid opening, configurable opening policy, and sealed-bid controls |
| Architecture baseline | AV-1.12 (sourcing IP boundary + configurable tender opening) / AV-1.11 (hub IA) / AV-1.10 (ownership lock) |
| Depends On | IP-01, IP-02, ENG-013, ENG-003a (organisation configuration), ENG-005 when Maker-Checker opening is required |
| Objective | Convert approved demand into a controlled RFX that suppliers can respond to |

> **Canonical lifecycle (do not use the historical “IP-03 includes award / next IP is PO” mapping):**
>
> `IP-01 → IP-02 → IP-03 RFX → IP-04 Response → IP-05 Evaluation & Award → IP-06 Purchase Order`
>
> Later sections of this file that still describe supplier quote entry, scoring, or award as IP-03 **delivery** are historical design notes. Those capabilities that already exist in the sourcing module are **reclassified**: response = IP-04, evaluation/award = IP-05. **Do not rebuild them.** **Do not implement IP-04 or IP-05 as a second engine.**

---

## 1. Purpose

IP-03 converts an **approved Purchase Request** into a controlled sourcing event: RFX type, linked demand, invited suppliers, closing rules, **locked evaluation configuration**, and **resolved opening policy**.

It answers:

> **What are we asking suppliers to provide, under which rules, and how will this RFX be opened when bidding ends?**

It does **not** independently own quote capture, evaluation scoring, or award. Those sit in IP-04 and IP-05. Code today hosts some of that work in `SourcingService`; ownership is logical, not a file move.

Core flow:

```text
Approved Purchase Request
          ↓
     Sourcing Event (draft)
          ↓
  Evaluation criteria locked
  Opening policy resolved
          ↓
      RFX published
          ↓
 Suppliers invited  →  IP-04 responses (sealed storage)
          ↓
      RFX closed
          ↓
 Opening (Standard or Maker-Checker)  →  IP-05
          ↓
 Evaluation / Award (IP-05)
          ↓
 Purchase Order (IP-06)
```

IP-03 does not create purchase orders.

---

## 2. Scope

| Capability | IP-03 | Notes |
| --- | ---: | --- |
| Create sourcing event | ✓ | Implemented (creates as `ISSUED` today) |
| Link to approved PR | ✓ | Implemented; budget derived from PR estimated values |
| RFI / RFQ / RFP / generic RFX | ✓ | Type label implemented; type-specific content still thin |
| Select / invite eligible suppliers | ✓ | Implemented; eligibility from IP-01 |
| Closing date/time | ✓ | Pending increment: `closesAt` + extension |
| Lock evaluation configuration before publish | ✓ specified | Method, technical phases, weights, passmarks, financial basis — scored in IP-05 |
| Resolve opening policy | ✓ specified | Organisation default + enforcement rules; see §2.2 |
| Secure supplier response link | Invite token: ✓ in code | Response workspace is **IP-04** |
| Supplier response / clarifications | ✗ as IP-03 | IP-04 (header quotes already exist — enhance, do not rebuild) |
| Bid comparison / scoring / recommendation / award | ✗ as IP-03 | IP-05 (commercial comparison and header award already exist — enhance, do not rebuild) |
| Purchase Order | ✗ | IP-06 |
| Supplier master / registration | ✗ | IP-01 / BP-002 |
| Contract / receipt / invoice / payment / performance scoring | ✗ | Later IPs |

### 2.1 Current implementation (do not duplicate)

Present in `03-platform` under BP-009 IP-03 labelling, to be **certified under the IP that owns them**:

| Capability | Location | Logical IP |
| --- | --- | --- |
| RFX create, type, PR link, invite | `SourcingService`, `procurement_sourcing_event` | IP-03 |
| Token portal, quote versions | `/sourcing/respond/[token]`, `procurement_supplier_quote` | IP-04 |
| Commercial savings, comparison, header/split award | `evaluation-outcome-rules.ts`, `procurement_award` | IP-05 |

Smoke evidence: `scripts/bp009-ip03-evaluation-outcome-smoke-validation.ts` (header commercial slice). That pass does **not** mean opening policy, sealed opening, or technical phases are done.

### 2.2 Opening policy (configurable — not universally Maker-Checker)

Maker-Checker tender opening is **not** mandatory for every RFX.

```text
Enforcement Rules
   ├── By RFX value
   ├── By procurement category
   ├── By procurement type
   └── By risk level
        ↓
RFX Opening Policy (resolved, then locked)
   ├── Organisation Default
   ├── Standard
   └── Maker-Checker
```

**Organisation Default** — the business’s configured default (typically **Standard** for SME simplicity).

**Standard** — after close, an authorised procurement role may open bids for evaluation. There is **no** second-person unseal gate.

**Maker-Checker** — after close, bids remain sealed until a distinct opener/checker path completes (ENG-005 when required). The person who cannot solely unseal is defined by policy (typically not the same as the sole invite issuer where segregation is required).

#### Always-on controls (both Standard and Maker-Checker)

Opening policy only chooses **whether a maker-checker unseal is required**. It does **not** turn off governance. Every RFX must still enforce:

| Control | Meaning |
| --- | --- |
| Role-based access | Only permitted roles read RFX, invitations, or (after opening) responses |
| Audit logging | Create, invite, publish, close, open/unseal, and award are auditable (ENG-013) |
| Bid submission locking | After close (and while sealed), new on-time submits are blocked per late policy |
| Bid version integrity | Submitted versions are append-only; version 1 is never overwritten |
| Access logging | Opening or viewing competitor/submitted bid content is logged (who, when, RFX) |

Suppliers never see other suppliers’ responses, regardless of opening policy.

#### Tender Admin sealed-bid view (count-only mode)

When `procurement_sourcing_control.bid_submission_count_visible` is enabled for the business, authorised tender administrators may see **only** the aggregate bid count (e.g. “Bids received: 7”) while bids remain sealed. Per-supplier identity, commercial amounts, technical responses, and attachments remain blocked at the service layer via `isCommercialSealedToBuyer` until authorised bid opening. This is not UI-only hiding — `toEvaluation()` omits comparison rows and redacts invitation details when count-only mode applies.

#### Deliberate v1 lifecycle interpretation

**`ISSUED` = published + open for bidding.** A separate `DRAFT` / `PUBLISHED` / `CANCELLED` state machine is not required for v1. Events are created as `ISSUED` and progress through `CLOSED` → `EVALUATING` → `AWARDED`.

#### Policy precedence (cannot weaken)

```text
Enforcement rule match (value / category / type / risk)
        ↓  if any matching rule requires Maker-Checker
Mandatory Maker-Checker
        ↓  else
Organisation Default
        ↓  else
Standard
```

- If organisation policy or a matching enforcement rule **requires Maker-Checker**, the RFX user **must not** select Standard or otherwise weaken opening.
- If no rule mandates Maker-Checker, the RFX may use Organisation Default or Standard (per what the org allows).
- Resolved opening policy is **stored on the RFX at publish** and must not be silently changed after invitations exist.

Simple by default; enterprise-grade when rules require it. Not a new platform engine — BP-009 configuration, using ENG-005 only when Maker-Checker opening is in force.

### 2.4 Tender duration and extension (IP-03)

Every published RFX has a **tender close datetime**. Bidding is open only while the event is not awarded **and** `now < closesAt`.

**Extension:** an authorised user may move `closesAt` later. Whether that action requires approval is **organisation configuration** (`extensionRequiresApproval`). SME default is **no extra approval** (SOURCING_UPDATE). When approval is required, ENG-005 / `Procurement.Sourcing.Approve` applies — the requester cannot self-approve.

Extensions are audited (previous close, new close, reason). Extension is forbidden after award. Extension cannot be used to reopen an awarded RFX.

IP-04 uses this close time as the gate for vendor submit / revise / withdraw. IP-05 uses it as the earliest moment bids may be opened under policy. IP-03 owns the clock.

### 2.3 Evaluation criteria governance (IP-03 configures; IP-05 scores)

**Authoritative integrity model (do not lock criteria at RFX creation or first invitation):**

```text
RFX closes (bidding ends)
  → Evaluation committee constituted
  → Committee configures evaluation criteria and methodology
  → Criteria locked (immutable snapshot + hash)
  → Controlled bid opening (policy-driven maker-checker when required)
  → Evaluation and award (IP-05)
```

Submitted bids remain **sealed** while the constituted committee establishes the evaluation basis. Criteria are finalized and locked **before** bid opening so evaluators cannot alter criteria after seeing commercial content.

The committee configures:

```text
Evaluation method
├── Lowest Compliant Quote
└── Best Overall Score

Technical evaluation (configurable phases; subset allowed)
├── Desktop
├── Demo
├── PoC
├── Reference calls
└── Site visits
    (sequence, weight, passmark, required/optional)

Financial evaluation
└── Weight + financial basis (Year 1 / Total Contract Value / TCO)

Technical weight + Financial weight = 100% when Best Overall Score is used.
```

After lock: no edit, delete, reorder, weight, passmark, or methodology changes for that RFX. `openBids` fails unless criteria are locked. Evaluation uses the locked snapshot.

**Payment terms are not evaluation criteria.** They belong on the supplier **financial proposal** (IP-04).

Scoring, ranking, and award are IP-05, and only after bids are opened under the resolved opening policy.

---

# 3. RFX Types

Do not build four completely separate systems.

Use one **RFX framework** with a configurable type:

```text
RFX
├── RFI
├── RFQ
├── RFP
└── Other RFX
```

### RFI

Used primarily to gather information.

```text
Information
Capabilities
Technical responses
No commercial award necessarily
```

### RFQ

Used where requirements are sufficiently defined and price is a major factor.

```text
Quantity
Specification
Unit price
Taxes
Delivery
Validity
Commercial terms
```

### RFP

Used where suppliers need to propose a solution.

```text
Technical proposal
Commercial proposal
Implementation approach
Experience
Methodology
Price
```

### Generic RFX

Allows future sourcing types without creating another architecture.

---

# 4. Creation Sources

An RFX should normally originate from an approved PR.

```text
Approved PR
    ↓
Create RFX
```

But procurement should also be able to create an RFX directly where organisational policy permits.

If created without a PR:

```text
Reason
Budget reference
Business justification
Approval/reference
```

must be captured according to configuration.

This prevents users from bypassing procurement controls.

---

# 5. One RFX Can Cover Multiple PRs

This is important for real procurement.

Example:

```text
PR-001 → 20 laptops
PR-002 → 30 laptops
PR-003 → 50 laptops
```

Procurement can create:

```text
RFX-001
100 laptops
```

with all source PRs linked.

The system should preserve:

```text
RFX
 ↓
PR-001
PR-002
PR-003
```

Do not duplicate the underlying requirements unnecessarily.

---

# 6. RFX Header

Minimum:

```text
RFX Number
Title
Type
Procurement Category
Description
Issue Date
Closing Date/Time
Currency
Buyer/Procurement Owner
Status
Confidentiality
Evaluation Method
```

Optional:

```text
Expected Award Date
Required Delivery Date
Location
Instructions to Suppliers
```

---

# 7. RFX Requirements

The procurement officer should be able to define:

```text
Requirement
Specification
Quantity
Unit
Delivery requirement
Mandatory/optional
Supporting document
```

Example:

```text
Laptop
Quantity: 100
RAM: 16GB minimum
Storage: 512GB SSD minimum
Warranty: 3 years
Delivery: Nairobi
```

Requirements should be structured wherever practical.

---

# 8. Supplier Selection

Suppliers come from the **single supplier master** established through BP-002/IP-01.

Do not create another supplier master.

Procurement can:

```text
Search suppliers
Filter eligible suppliers
Select suppliers
Invite suppliers
```

Potential filters:

```text
Category
Location
Qualification
Status
Performance
Preferred supplier
Certification
```

---

# 9. Blacklisted Suppliers

The supplier's blacklist status must be respected.

If:

```text
Supplier A
Status: Blacklisted
Reason: Fraudulent documentation
```

the system should:

```text
Prevent invitation
```

or require an explicitly authorised override if policy permits.

Never silently invite a blacklisted supplier.

The blacklist remains owned by the supplier-management capability.

---

# 10. Preferred / High-Performance Suppliers

Your earlier requirement should also influence sourcing.

Suppliers with strong performance can be surfaced as:

```text
Preferred / High-performing suppliers
```

But:

> **Preference must not automatically equal award.**

For example:

```text
Recommended suppliers

★ Supplier A — High performance
★ Supplier B — Preferred
Supplier C
Supplier D
```

The procurement officer still controls the final supplier selection according to procurement policy.

---

# 11. Supplier Invitation

Once suppliers are selected:

```text
RFX
 ↓
Invite
 ↓
Supplier
```

Invitation should contain:

```text
RFX reference
Title
Closing date/time
Instructions
Secure response link
```

Use the existing notification architecture.

---

# 12. Supplier Portal / Secure Link

This is a critical capability.

A supplier should be able to receive:

```text
"Invitation to RFQ — RFX-00123"
```

and click:

```text
Respond to RFX
```

The supplier should not need to understand the internal BP/IP architecture.

The link should take the supplier into the procurement response experience.

---

# 13. Secure Supplier Access

Do not expose the entire internal application.

Supplier access must be scoped to:

```text
Supplier
   ↓
RFX
   ↓
Response
```

Supplier A must never see:

```text
Supplier B's response
Internal evaluation
Internal scores
Internal comments
Award recommendation
Other suppliers
```

This is a critical security boundary.

---

# 14. Supplier Response

Depending on RFX type, suppliers can provide:

```text
Commercial response
Technical response
Documents
Delivery information
Validity period
Terms
Clarifications
```

For an RFQ:

```text
Item
Quantity
Unit Price
Tax
Discount
Delivery
Total
```

System calculates totals rather than relying on manually entered totals.

---

# 15. Supplier Response Draft

Suppliers should be able to:

```text
Save Draft
Continue Later
Submit
```

Before closing.

After submission:

```text
Submitted
```

The supplier should not silently modify it.

If amendments are permitted:

```text
Amendment / revised response
```

must create a traceable version.

---

# 16. Closing Date

RFX must have a firm closing date/time.

At closure:

```text
OPEN
   ↓
CLOSED
```

After closure:

```text
No new response
```

unless an authorised procurement user formally reopens/extends the RFX.

Extension must be audited.

---

# 17. Supplier Clarifications

Allow suppliers to ask questions.

Example:

```text
Supplier:
"Does the warranty requirement include onsite support?"

Procurement:
"Yes."
```

The important rule:

> If a clarification materially changes the requirement, the information should be made available to all invited suppliers where procurement policy requires equal treatment.

This prevents one supplier receiving privileged information.

---

# 18. Addendum / Requirement Change

If the procurement officer changes the RFX after invitations have been issued:

```text
Change
 ↓
Audit
 ↓
Supplier notification
```

For material changes, suppliers may need to revise their responses.

Do not silently change an active RFX.

---

# 19. Evaluation

> **Ownership:** IP-03 **locks** the evaluation configuration (see §2.3). IP-05 **executes** scoring, ranking, and award after bids are opened under §2.2. Do not implement a second evaluation engine.

The mixed “price 40% / quality 20%” list is **not** the v1 model. v1 uses:

```text
Technical evaluation (phases)  +  Financial evaluation (weight + basis)
```

Technical phases (configurable subset): Desktop, Demo, PoC, Reference calls, Site visits.

Payment-term schedules are **not** evaluation criteria.

---

# 20. Evaluation Types

Configured on the RFX (IP-03); executed in IP-05.

### Lowest Compliant Quote

Technical phases and passmarks determine eligibility. Among technically qualified suppliers, award follows the configured **financial basis** (lowest evaluated quote).

### Best Overall Score

Technical score × technical weight + financial score × financial weight (weights = 100%).

### Manual evaluation

Where policy requires qualitative assessment without composite scores. Still subject to opening policy, access control, and audit.

Do not hard-code a single scoring model. Do not treat Maker-Checker opening as a scoring type.

---

# 21. Mandatory Requirements

Allow requirements to be marked:

```text
Mandatory
Optional
```

Example:

```text
3-year warranty      Mandatory
ISO certification    Mandatory
Training             Optional
```

A supplier failing a mandatory requirement can be flagged:

```text
Non-compliant
```

This prevents a cheap but invalid bid from automatically winning.

---

# 22. Evaluation Separation

Supplier response information and internal evaluation must be separate.

Supplier sees:

```text
Their response
```

Evaluator sees:

```text
Responses
Scores
Comments
Comparison
```

Supplier must never see:

```text
Internal scores
Other supplier prices
Evaluator comments
Ranking
Recommendation
```

---

# 23. Multi-Evaluator Support

Where required:

```text
Evaluator A
Evaluator B
Evaluator C
        ↓
Combined Evaluation
```

Each evaluator's assessment should be attributable.

Do not allow evaluators to overwrite each other's assessments.

---

# 24. Conflict of Interest

For controlled procurement, an evaluator should be able to declare:

```text
No conflict
```

or:

```text
Conflict declared
```

If conflict exists:

```text
Evaluator
   ↓
Removed/reassigned
```

according to configured governance.

If the platform already has a governance/approval mechanism, reuse it.

---

# 25. Bid Comparison

Provide a simple comparison workspace:

```text
RFX-00123

                Supplier A   Supplier B   Supplier C
----------------------------------------------------
Price             10M          9.5M         11M
Technical         88           92           79
Delivery          30 days      20 days      25 days
Warranty          3 years      3 years      2 years
Score             87           89           76
----------------------------------------------------
Status            Compliant    Compliant    Failed
```

Do not force users to download Excel to compare suppliers.

---

# 26. Recommendation

After evaluation:

```text
Evaluation
    ↓
Recommendation
```

The system should show:

```text
Recommended Supplier
Reason
Evaluation summary
Total value
Risks/exceptions
```
Evaluation outcome:
Metric	Formula
Budgeted Amount	Approved procurement budget
Initial Quote	Supplier's original quotation
Final Quote	Supplier's final negotiated quotation
Budgeted Savings	Budgeted Amount − Final Quote
Negotiated Savings	Initial Quote − Final Quote
Awarded Amount	Final approved award value
Total Savings	Same as Budgeted Savings (derived; not a persisted field)
Savings %	(Budgeted Amount − Final Quote) ÷ Budgeted Amount × 100

So the procurement story becomes:

Approved Budget
      ↓
Initial Quote
      ↓
Negotiation
      ↓
Final Quote
      ↓
Award

Example:

Budgeted Amount       10,000,000
Initial Quote          9,500,000
Final Quote             9,000,000
                         ─────────
Budgeted Savings        1,000,000
Negotiated Savings        500,000

Key distinction: budgeted savings measures the total saving against the approved budget, while negotiated savings measures the additional saving achieved through negotiation.

The recommendation is not yet the PO.

---

# 27. Award

Authorised procurement users can award.

Example:

```text
Award

Supplier: ABC Technologies
Value: KES 9,500,000
Reason: Highest compliant evaluation score
```

Award should capture:

```text
Supplier
Award amount
Awarded lines
Quantity
Currency
Decision
Reason
Decision maker
Date/time
```

---

# 28. Split Awards

This is essential.

Do **not** assume one RFX = one supplier.

Example:

```text
RFX
100 laptops

Supplier A → 60
Supplier B → 40
```

The system must support:

```text
Award 1
Supplier A
60 units

Award 2
Supplier B
40 units
```

This is one of the reasons RFX and PO must be separate.

---

# 29. Partial Award

Similarly:

```text
Requested: 100
Awarded:    80
Remaining:  20
```

The procurement team can decide what happens to the remaining quantity:

```text
Re-source
Cancel
Create another sourcing event
```

Do not automatically create another RFX.

---

# 30. Award → PO Handoff

The output of IP-03 is:

```text
AWARD
  ↓
IP-04 Purchase Order
```

IP-03 must provide:

```text
RFX
Award
Supplier
Awarded lines
Quantity
Price
Currency
Terms
Delivery requirements
Supporting documents
Evaluation result
```

IP-04 then creates the PO.

---

# 31. Contract Handoff

If the award requires a contract:

```text
Award
  ↓
Contract
```

The contract capability should own contract creation.

IP-03 should simply indicate:

```text
Contract required: Yes/No
```

and provide the award information needed downstream.

---

# 32. Supplier Performance Handoff

The award should create the basis for future supplier performance tracking:

```text
Award
 ↓
PO
 ↓
Delivery
 ↓
Receipt
 ↓
Performance
```

Performance should later measure actual delivery against what was awarded.

IP-03 should **not score supplier performance based on the sourcing event alone**.

---

# 33. RFX Lifecycle

Keep the lifecycle manageable:

```text
DRAFT
   ↓
PUBLISHED / OPEN     (bidding; responses stored sealed)
   ↓
CLOSED
   ↓
OPENED               (Standard: authorised role; Maker-Checker: dual control)
   ↓
UNDER_EVALUATION     (IP-05)
   ↓
RECOMMENDED
   ↓
AWARDED              (IP-05)
```

**Current code** uses only `ISSUED` → `AWARDED`. Do not treat that as the target lifecycle. Extend it; do not fork a second RFX state machine.

Alternative terminal states:

```text
CANCELLED
NO_AWARD
```

Possible:

```text
EXTENDED
```

but extension can also be an audited action against `OPEN`.

Avoid dozens of states.

---

# 34. Supplier Response Lifecycle

```text
INVITED
   ↓
VIEWED
   ↓
DRAFT
   ↓
SUBMITTED
   ↓
EVALUATED
```

Supplier may also:

```text
DECLINED
```

No response by closing time:

```text
NO_RESPONSE
```

---

# 35. Procurement Navigation

The hub should be:

```text
Procurement
├── Suppliers
├── Purchase Requests
└── Sourcing
```

Under Sourcing:

```text
Sourcing
├── RFX
├── Evaluations
└── Awards
```

Do **not** expose:

```text
IP-03
RFQ Engine
RFX Engine
Supplier Response Engine
Award Engine
```

The user thinks:

> "I need to source something."

Not:

> "I need to open IP-03."

---

# 36. Sourcing Workspace

A simple landing workspace:

```text
Sourcing

[Create RFX]

Open RFX       8
Awaiting Responses  5
Under Evaluation    3
Pending Award       2

Recent Sourcing Events
------------------------------------------------
RFX-00123 | Laptops | RFQ | 5 suppliers | Open
RFX-00124 | Security | RFP | 4 suppliers | Evaluation

Quick Actions
Create RFQ
Create RFP
View Responses
Evaluate
Awards
```

---

# 37. Supplier Response Experience

Supplier experience should be extremely simple.

```text
RFQ-00123

Laptops — 100 Units

Requirement
--------------------------------
16GB RAM
512GB SSD
3-year warranty

Your Response
--------------------------------
Unit Price       [       ]
Tax              [       ]
Delivery         [       ]
Warranty         [       ]

Documents
[Upload]

[Save Draft] [Submit Response]
```

The supplier should not be forced through the entire internal procurement application.

---

# 38. Security Requirements

Mandatory:

```text
Tenant isolation
Supplier isolation
RFX access control
Response confidentiality (sealed storage during bidding; opening per §2.2)
Role-based evaluation access (after opening)
Audit trail
Secure links
Expiry/revocation
```

A response URL must not allow:

```text
/change supplier ID
/change RFX ID
/view other response
```

and gain access.

Use server-side authorization, not just UI hiding.

---

# 39. Audit

Use the existing audit engine.

Record:

```text
RFX created
RFX published
Supplier invited
Invitation sent
Supplier viewed
Supplier submitted
Supplier response amended
RFX extended
RFX closed
Evaluator assigned
Evaluation completed
Recommendation created
Award approved
Award changed
Award cancelled
```

Also capture who performed each action and when.

---

# 40. Idempotency

Protect:

```text
Publish
Invite supplier
Submit supplier response
Save response
Award
```

against duplicate operations caused by retries/double clicks.

Example:

```text
Supplier clicks Submit twice
```

must not create two responses.

---

# 41. Concurrency

Protect evaluation and award operations.

Example:

```text
Evaluator A evaluates
Evaluator B evaluates
Procurement awards
```

A stale evaluation must not overwrite newer information.

An RFX cannot simultaneously become:

```text
AWARDED
CANCELLED
```

through competing operations.

---

# 42. Notifications

Reuse existing notification infrastructure.

Notify:

### Suppliers

```text
RFX invitation
Clarification
Addendum
Closing reminder
RFX extension
Award outcome
```

### Internal users

```text
Response received
RFX closing
Evaluation required
Evaluation complete
Award pending
```

Don't build another notification engine.

---

# 43. Documents

Support:

```text
RFX documents
Supplier submissions
Technical proposals
Commercial proposals
Evaluation evidence
Award documents
```

Use the existing document/evidence architecture.

---

# 44. Important Procurement Controls

The system should prevent:

### Award to non-invited supplier

Unless authorised procurement policy explicitly permits it.

### Award above submitted value

Unless a controlled variation mechanism exists.

### Award to blacklisted supplier

Block or require authorised exception.

### Award beyond requested quantity

Prevent unless the PR is formally amended/reapproved.

### Award without required evaluation

Prevent where evaluation is mandatory.

### Award after RFX cancellation

Prevent.

### Award after closing without valid response

Prevent.

---

# 45. Relationship Model

The core relationships should support:

```text
Procurement Plan
      ↓
Purchase Demand
      ↓
Purchase Request
      ↓
     RFX
      ↓
Supplier Responses
      ↓
Evaluation
      ↓
Award
      ↓
Purchase Order
      ↓
Contract
      ↓
Receipt
      ↓
Supplier Performance
```

And importantly:

```text
One PR
 ↓
Multiple RFX

One RFX
 ↓
Multiple PRs

One RFX
 ↓
Multiple Suppliers

One RFX
 ↓
Multiple Awards

One Award
 ↓
Potentially one/multiple POs
```

This gives the platform enough flexibility without overengineering it.

---

# 46. Core Entities

Conceptually:

```text
SourcingEvent
├── id
├── businessId / tenantId
├── number
├── type
├── title
├── status
├── closingAt
├── owner
├── evaluationMethod
└── timestamps

SourcingRequirement
├── sourcingEventId
├── sourcePurchaseRequestId
├── offeringId
├── description
├── quantity
├── unit
└── mandatory

SupplierInvitation
├── sourcingEventId
├── supplierId
├── status
├── invitedAt
└── respondedAt

SupplierResponse
├── sourcingEventId
├── supplierId
├── version
├── status
├── submittedAt
└── totalValue

SupplierResponseLine
├── responseId
├── requirementId
├── unitPrice
├── quantity
├── tax
├── delivery
└── total

Evaluation
├── sourcingEventId
├── supplierId
├── evaluator
├── score
├── comments
└── status

Award
├── sourcingEventId
├── supplierId
├── requirementId
├── quantity
├── amount
├── decision
├── reason
└── timestamps
```

Follow the existing platform naming, ID, tenant, audit and soft-delete conventions rather than blindly creating these exact schemas.

---

# 47. Acceptance Criteria

### RFX

```text
AC-001 Create RFX from approved PR.
AC-002 Support RFI/RFQ/RFP/RFX.
AC-003 Link RFX to one or more PRs.
AC-004 Define structured requirements.
AC-005 Define closing date/time.
AC-006 Publish RFX.
```

### Supplier

```text
AC-007 Select suppliers from existing supplier master.
AC-008 Prevent unauthorised/blacklisted suppliers from participation.
AC-009 Send supplier invitation.
AC-010 Supplier receives secure access.
AC-011 Supplier cannot access another supplier's response.
```

### Response

```text
AC-012 Supplier can save draft.
AC-013 Supplier can submit response.
AC-014 System calculates commercial totals.
AC-015 Submitted response is immutable unless controlled amendment is permitted.
AC-016 Closing event prevents late submission.
```

### Evaluation

```text
AC-017 Define evaluation criteria.
AC-018 Support mandatory requirements.
AC-019 Support weighted evaluation.
AC-020 Support multiple evaluators where configured.
AC-021 Compare supplier responses.
AC-022 Record evaluator identity and comments.
```

### Award

```text
AC-023 Create recommendation.
AC-024 Authorised user can award.
AC-025 Support split awards.
AC-026 Support partial awards.
AC-027 Award cannot exceed authorised/requested quantity.
AC-028 Award cannot be made to an invalid supplier.
AC-029 Award is fully auditable.
```

### Handoff

```text
AC-030 Award provides stable downstream reference.
AC-031 IP-04 can consume the award to create a PO.
AC-032 Contract requirement can be handed downstream.
AC-033 No inventory movement occurs.
AC-034 No supplier payment occurs.
AC-035 No GL posting occurs.
```

---

# 48. Certification

At minimum:

```text
Create RFX                         ✓
Link approved PR                   ✓
Create RFQ                        ✓
Create RFP                        ✓
Invite suppliers                  ✓
Reject blacklisted supplier       ✓
Generate secure supplier access   ✓
Supplier save draft               ✓
Supplier submit                   ✓
Supplier isolation                ✓
Closing enforcement               ✓
Clarification                     ✓
Evaluation                        ✓
Weighted scoring                  ✓
Multi-evaluator                   ✓
Recommendation                    ✓
Single award                      ✓
Split award                       ✓
Partial award                     ✓
Award audit                       ✓
PO handoff                         ✓
Tenant isolation                  ✓
Authorization                     ✓
Idempotency                       ✓
Concurrency                       ✓
```

And regression:

```text
BP-002
BP-003
BP-005
BP-006
BP-007
BP-008
BP-009 IP-01
BP-009 IP-02
```

---

# 49. Final IP-03 Boundary

At the end of IP-03:

```text
APPROVED PR
     ↓
   RFX created / configured
     ↓
 Evaluation criteria locked
 Opening policy resolved and locked
     ↓
   Published + suppliers invited
     ↓
 ───────────────
     STOP (IP-03)
 ───────────────
     ↓
   IP-04  Supplier responses (sealed storage)
     ↓
   Close
     ↓
   Opening (Standard or Maker-Checker)
     ↓
   IP-05  Evaluation, ranking, award
     ↓
   IP-06  Purchase Order
```

**IP-03 does not become a PO engine. IP-03 does not become a second quote or award engine.**

Canonical progression:

```text
IP-01  Supplier Foundation
          ↓
IP-02  Demand + Purchase Request + Approval
          ↓
IP-03  RFX + criteria lock + opening policy
          ↓
IP-04  Supplier Response & Collaboration
          ↓
IP-05  Evaluation, Award & Sourcing Decision
          ↓
IP-06  Purchase Order
          ↓
IP-07  Contract Management
```

**BP-008** remains the owner of physical receipt/inventory movement. Historical text in this file that numbered PO as IP-04 is **retired**.

---

## IMPLEMENTATION PROMPT

The following is the copy-paste-ready instruction set for the **pending IP-03 increment only**.

```
Cursor Implementation Prompt — BP-009 IP-03 RFX Management (pending increment)

Implement ONLY pending BP-009 IP-03. Do not implement IP-04 commercial depth
(line quotes, payment-term schedules, TCO years, clarifications, withdraw UI,
submission notifications). Do not implement IP-05 scoring, rank, unseal, or
award-line changes. Do not rebuild the supplier portal, quote-version writer,
commercial savings formulas, or procurement_award. Do not create a second
sourcing engine. Do not implement IP-06.

Enhance the existing SourcingService / procurement_sourcing_event.

Objective: complete the RFX control surface that IP-04 and IP-05 consume.

Must implement:
1. Tender close datetime (closesAt) on the RFX. Create/publish requires it.
   Bidding is open only while status is not AWARDED and now < closesAt.
   Invite and quote submit/revise already in this service MUST respect that
   clock (IP-03 gate on existing paths — not a new quote engine).
2. Tender duration extension: authorised user moves closesAt later, with
   reason, audit (previous/new close). Cannot extend after award. New close
   must be after current close and after now.
   Organisation config extensionRequiresApproval: if false, Sourcing.Update
   may extend; if true, Sourcing.Approve is required (ENG-005 operation
   SOURCING_EXTENSION_APPROVAL). Requester cannot weaken a true flag.
   SME default: approval not required.
3. Lock evaluation configuration on the RFX at create:
   method LOWEST_COMPLIANT | BEST_OVERALL | MANUAL;
   technical phases Desktop, Demo, PoC, Reference, Site visit (include/omit,
   sequence, weight, passmark, required/optional);
   financial basis YEAR_1 | TCV | TCO;
   for BEST_OVERALL, technical weight + financial weight = 100%.
   Do not score suppliers. Do not build evaluator score sheets.
4. Resolve and persist opening policy STANDARD | MAKER_CHECKER from:
   enforcement rules (RFX value, procurement category, type, risk level)
   then organisation default, then RFX request.
   Mandate cannot be weakened to Standard. Strengthening to Maker-Checker
   is allowed. Persist source. Do not implement unseal/opening UI (IP-05).
5. Per-business sourcing control (defaults): defaultOpeningPolicy STANDARD,
   extensionRequiresApproval false, optional makerCheckerMinAmount.
   Opening rules table for category/type/risk/value matches.
6. Optional riskLevel on the RFX (LOW/MEDIUM/HIGH) for rule matching.
7. UX: create RFX form collects close datetime, evaluation method/phases/
   weights/basis, requested opening policy (Organisation default / Standard /
   Maker-Checker). Event workspace shows close time, policy, evaluation
   summary, and Extend tender when permitted. Lists may show close date.
   Operational language only — no IP/ENG labels.
8. Audit ENG-013 for create (already), plus SOURCING_EXTENDED.
9. Tenant isolation, existing permissions, no PO/inventory/payment.
10. Extend IP-03 smoke validation: duration gate, extension with and without
    approval, cannot weaken Maker-Checker, evaluation lock stored, existing
    commercial 36-check slice still passes (supply closesAt on create).
11. Migration for new columns/tables; existing events: backfill closesAt
    (e.g. created_at + 14 days) so NOT NULL is safe.

Do not hide buyer quotes in this increment (sealed opening is IP-04/IP-05).
Do not add vendor withdraw or ENG-009 bid-ack (IP-04).
Do not commit unless instructed.

STOP after implementation report.
```


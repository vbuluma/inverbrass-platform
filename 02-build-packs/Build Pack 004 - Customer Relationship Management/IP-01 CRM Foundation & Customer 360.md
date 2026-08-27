# BP-004 IP-01 – CRM Foundation & Customer 360

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-01 |
| Build Pack | BP-004 – Customer Relationship Management |
| Priority | Critical |
| Depends On | BP-001, BP-002 IP-01, ENG-003n, ENG-005 |

---

## Objective

Establish the CRM master record, **Customer 360 single pane of glass**, and workspace foundation that extends Party Master (BP-002) without duplicating party identity data. Provide the authoritative CRM layer for customer lifecycle, ownership, numbering, unified customer experience, and the **shared Work Assignment & SLA consumption contract** used by all subsequent BP-004 IPs.

The purpose of CRM is not to manage leads or opportunities in isolation — it is to **know everything about a customer**. When a user opens John Smith or ABC Manufacturing Ltd, **Customer 360** is the first and primary landing page.

---

## Business Problem

Party Master identifies who a person or organisation is, but it does not express CRM context—customer status, sales ownership, relationship manager, or engagement lifecycle. Vertical solutions either overload Party records with CRM fields, maintain parallel customer tables, or force users to navigate many modules to understand a customer.

Without Customer 360, CRM modules accumulate data but never assemble it. Without a single Party identity through Prospect → Lead → Customer, conversions duplicate records and fragment history. Without a shared assignment and SLA model, each CRM module implements its own timers—making cross-module analytics impossible.

---

## Scope

### Included — CRM Master

- CRM master record linked to Party (**one Party ID throughout the lifecycle**)
- Customer number generation
- CRM types and statuses (Prospect, Lead, Customer, and governed transitions)
- CRM lifecycle transitions without Party duplication
- Ownership and relationship manager assignment
- CRM workspace shell with **Customer 360 as default landing tab**
- Search, audit, and timeline hooks
- Migration and bulk import support

### Included — Customer 360 (Single Pane of Glass)

Customer 360 is a **first-class capability** of IP-01 — not an afterthought under a generic Overview page. It **aggregates** data from BP-002, BP-004 IPs, and future Build Packs; it does **not** duplicate master data.

**Customer Profile workspace navigation**

```
Customer Profile
├── Customer 360          ← Primary landing page (default)
├── Opportunities
├── Activities
├── Visits
├── Communications
├── Cases
├── Quotations
├── Campaigns
├── Documents             ← reads BP-002
├── Relationships         ← reads BP-002; navigates to related parties
├── Timeline              ← reads BP-002 Party Timeline + CRM events
├── Analytics             ← IP-12 customer-scoped widgets
└── Settings              ← IP-13 governance (role-gated)
```

**Customer 360 page sections**

| Section | Source | Content |
|---------|--------|---------|
| **Identity** | BP-002 + IP-01 | Name, type, segment, owner, status, branch, since date, preferred channel |
| **Relationship Network** | BP-002 IP-006 | Directors, shareholders, UBOs, related companies, guarantors, beneficiaries — grouped by relationship type; navigate to related Party/CRM records |
| **Business Summary** | IP-02–IP-11 + future BPs | Products held, cases open, outstanding quotes, campaigns, recent visits, tasks due, risk rating, health score |
| **Customer Insights** | IP-01 aggregator | Last interaction, last complaint, last visit, products owned, revenue, open opportunities, outstanding quotations, cases overdue, documents expiring, SLA breaches, next visit, next follow-up, recent relationship/risk changes |
| **Activity Timeline** | BP-002 IP-010 | Unified chronological history — lead created, email sent, visit, opportunity, onboarding, case, campaign response, etc. |
| **AI Summary** | ENG-012 (future) | Natural-language relationship summary (Phase 2) |

**Individual 360 vs Entity 360**

Same workspace shell; default widgets adapt by CRM/Party type:

- **Individual** — employment, companies linked, personal products, family/guarantor relationships
- **Entity** — directors, shareholders, UBOs, branches, subsidiaries, corporate products, signatories

**Widget registration contract (future Build Packs)**

Future Build Packs register Customer 360 widgets without changing CRM core:

| Build Pack | Widget examples |
|------------|-----------------|
| BP-005 Sales | Orders |
| BP-006+ Billing | Invoices |
| BP-006+ Payments | Payment history |
| Lending | Loans, collateral, repayments |
| Insurance | Policies, claims |
| AML / Compliance | EDD, KYC status, risk rating |

IP-01 owns the widget shell and layout; contributing modules supply read-only data contracts and timeline event types.

### Included — Single Identity Lifecycle

One Party. One history. One timeline.

```
Party (BP-002)
    ↓
CRM Record (IP-01)
    ↓
Lead (IP-02)          — same Party ID; no duplicate identity
    ↓
Opportunity (IP-03)
    ↓
Customer (status)     — conversion updates CRM status; does not recreate Party
    ↓
Products (BP-003+)    — linked to same Party / CRM context
```

**Rules**

- Prospect, Lead, and Customer stages reference the **same Party ID**
- Lead conversion **must not** create a duplicate Party when identity already exists
- All lifecycle events append to the **same Party Timeline** (BP-002 IP-010)
- CRM record persists across stage transitions; status and linked entities evolve

### Included — Work Assignment & SLA (Consumption Contract)

BP-004 does **not** implement assignment/SLA logic per module. IP-01 defines how all CRM entities consume the platform **Work Assignment & SLA Engine** (**ENG-003n**):

- Assignment tracking (user, team, branch, queue)
- Complete assignment history (immutable)
- Per-assignee SLA segments and cumulative total SLA
- Active working time, waiting time, paused time, breached duration
- Queue management hooks
- Work-duration analytics inputs for IP-12
- SLA breach indicators on Customer 360 Insights panel

Workflow approvals and escalations remain **ENG-005**; deterministic assignment rules may consume **ENG-004** where configured.

### Excluded

- Party registration and identity master data (BP-002)
- Relationship type master and CRUD (BP-002 IP-006) — Customer 360 **reads** only
- Document storage (BP-002) — Customer 360 **reads** only
- Lead, opportunity, case **detail screens** (IP-02–IP-09) — those IPs own depth; Customer 360 **summarises**
- Product catalogue (BP-003) — widgets consume when available
- Portfolio/team **aggregate** dashboards (IP-12) — Analytics tab is customer-scoped; executive dashboards remain IP-12
- Graph visualization engine (Phase 2 — list and navigate first; graph optional later)

---

## Business Requirements

### CRM Master

| ID | Requirement |
|----|-------------|
| BR-001 | Maintain one CRM record per customer relationship context per business. |
| BR-002 | Support Individual and Organization customers via Party reference. |
| BR-003 | Assign customer ownership and relationship management accountability. |
| BR-004 | Track customer since date, source, and lifecycle status. |
| BR-005 | Support legacy migration without breaking Party integrity. |
| BR-006 | Present industry-native CRM labels via ENG-003k. |
| BR-007 | Every ownership change on a CRM work item shall create an assignment history record via ENG-003n. |
| BR-008 | SLA shall be measurable per assignee and cumulatively across all assignees for the same work item. |
| BR-009 | Queue-based work shall support current owner elapsed time and total lifecycle duration. |
| BR-010 | Assignment and SLA data shall be available to analytics (IP-12) without module-specific duplication. |
| BR-011 | Historical assignment and SLA records shall never be overwritten. |

### Customer 360

| ID | Requirement |
|----|-------------|
| BR-012 | Customer 360 shall be the **default landing tab** when opening any CRM customer profile. |
| BR-013 | Users shall understand current customer state from Customer 360 **without navigating to other tabs** for routine relationship management. |
| BR-014 | Customer 360 shall **read** Party identity, contacts, relationships, documents, consent, and timeline from BP-002 — never duplicate. |
| BR-015 | Customer 360 shall aggregate summary widgets from IP-02–IP-11 via defined contribution contracts. |
| BR-016 | Customer 360 shall display a unified Activity Timeline sourced from BP-002 Party Timeline plus CRM-enriched events. |
| BR-017 | Customer 360 shall support Individual and Entity profile layouts with appropriate default widgets. |
| BR-018 | Relationship Network shall group BP-002 relationships by type and allow navigation to related Party/CRM records. |
| BR-019 | Customer Insights shall answer operational questions: last interaction, open cases, overdue items, expiring documents, SLA breaches, next actions. |
| BR-020 | Future Build Packs shall register new Customer 360 widgets without CRM schema changes. |
| BR-021 | Prospect → Lead → Customer transitions shall preserve **one Party ID** and continuous timeline history. |

---

## Functional Requirements

### CRM Master

| ID | Requirement |
|----|-------------|
| FR-001 | Create CRM record from existing Party, new Party, API, or bulk import. |
| FR-002 | Generate configurable customer numbers (prefix, suffix, branch, sequence). |
| FR-003 | Maintain CRM profile: number, party reference, display name, type, status, owner, branch, source. |
| FR-004 | Support configurable CRM types (Individual, Business, SME, Corporate, Government, NGO, etc.). |
| FR-005 | Support configurable statuses (Prospect, Lead, Active, Dormant, Suspended, Closed, Archived). |
| FR-006 | Enforce governed lifecycle transitions between statuses. |
| FR-007 | Assign customer owner and optional relationship manager (Party references). |
| FR-008 | Provide CRM list dashboard with counts by status and type. |
| FR-009 | Open Customer Profile with **Customer 360** as the default tab. |
| FR-010 | Publish create, update, and status change events to Party Timeline and audit. |
| FR-011 | Support CRM search and filter by number, name, status, owner, branch. |
| FR-012 | Prevent duplicate CRM records for the same Party within a business. |

### Customer 360

| ID | Requirement |
|----|-------------|
| FR-018 | Render **Identity** panel from BP-002 Party + IP-01 CRM context. |
| FR-019 | Render **Relationship Network** panel from BP-002 relationships; support drill-through to related records. |
| FR-020 | Render **Business Summary** widgets contributed by IP-02–IP-11 (counts, totals, status indicators). |
| FR-021 | Render **Customer Insights** panel with configurable insight tiles (see BR-019). |
| FR-022 | Render **Activity Timeline** panel consuming BP-002 `PartyTimelineService` events. |
| FR-023 | Provide dedicated workspace tabs for depth modules (Opportunities, Cases, etc.) linked from 360 widgets. |
| FR-024 | Support widget visibility by industry edition profile (ENG-003k). |
| FR-025 | Register placeholder widget regions for future Build Pack contributions. |
| FR-026 | Display assignment/SLA summary on Customer 360: current owner, segment elapsed, total elapsed, breach flag. |

### Work Assignment & SLA (ENG-003n Consumption)

| ID | Requirement |
|----|-------------|
| FR-013 | **Assignment tracking:** Record every assignment of a CRM work item between users, teams, branches, business units, or queues. |
| FR-014 | **Assignment history:** Maintain immutable history including: previous owner, new owner, assigned by, assignment date/time, reason, assignment type (manual / automatic / escalation / queue pull). |
| FR-015 | **SLA tracking:** Measure per assignee segment and roll-up totals: time with assignee, total processing time, total elapsed time, active working time, waiting time, paused time, breached SLA duration. |
| FR-016 | **Queue analytics inputs:** Expose current owner elapsed time, sum of previous owners' elapsed time, total lifecycle duration, average processing duration per segment, SLA remaining time, and breach flags for IP-12 reporting. |
| FR-017 | Surface assignment and SLA summary on Customer 360 Insights panel. |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Every CRM record must reference exactly one valid Party. |
| BRU-002 | Customer number must be unique within a business. |
| BRU-003 | Archived CRM records are read-only. |
| BRU-004 | Closed customers cannot be deleted; only archived via governed transition. |
| BRU-005 | Party identity fields are read from BP-002; not copied into CRM master. |
| BRU-006 | Status transitions require configured rules or workflow where mandated. |
| BRU-007 | Every ownership change shall create an SLA history segment; prior segment end time is recorded. |
| BRU-008 | SLA timers for the current assignee shall stop when ownership changes. |
| BRU-009 | A new SLA segment shall start for the new assignee on assignment. |
| BRU-010 | Total SLA for a work item equals the cumulative processing duration across all assignee segments (excluding configured pause periods). |
| BRU-011 | Historical assignment and SLA segments are append-only; corrections via addendum audit entries only. |
| BRU-012 | Customer 360 must not persist copies of BP-002 master data — read services only. |
| BRU-013 | Lifecycle transitions (Prospect → Lead → Customer) must retain the same Party ID. |
| BRU-014 | Customer 360 widget failures must not block Customer Profile access; degrade gracefully per widget. |
| BRU-015 | All CRM modules (IP-02–IP-11) must publish timeline events to BP-002 Party Timeline for Customer 360 visibility. |

---

## Customer 360 — IP Contribution Matrix

IP-02 through IP-12 **feed** Customer 360; they do not implement separate profile experiences.

| IP | Widgets / insights on Customer 360 | Timeline events |
|----|--------------------------------------|-----------------|
| IP-02 | Lead status, active lead, conversion history | Lead created, qualified, converted, disqualified |
| IP-03 | Open/won/lost opportunities, pipeline value | Opportunity created, stage changed, won/lost |
| IP-04 | Account hierarchy, primary contacts, account team | Account created, contact role assigned |
| IP-05 | Tasks due, recent activities | Activity created, completed, overdue |
| IP-06 | Next appointment, upcoming meetings | Appointment scheduled, completed, cancelled |
| IP-07 | Recent visits, open call-report actions | Visit planned, completed, report submitted/approved |
| IP-08 | Last interaction, channel summary | Communication sent/received |
| IP-09 | Open cases, last complaint, SLA breaches | Case opened, escalated, resolved |
| IP-10 | Outstanding quotations, pending acceptance | Quotation sent, accepted, rejected, expired |
| IP-11 | Campaign membership, recent responses | Campaign response, lead attributed |
| IP-12 | Health score, risk/churn flags, customer Analytics tab | — (metrics consumed by 360) |
| IP-13 | Settings tab only | Governance events where configured |

---

## High-Level Process Flow

```
New CRM Record
      ↓
Select or Create Party (BP-002) — Party ID assigned once
      ↓
Capture CRM Context (type, owner, source)
      ↓
Generate Customer Number
      ↓
Initial Assignment → ENG-003n segment opened
      ↓
Open Customer Profile → Customer 360 (default)
      ↓
Prospect → Lead (IP-02) → Opportunity (IP-03) → Customer status
      — same Party ID, continuous timeline
      ↓
IP-02–IP-11 contribute widgets and timeline events
      ↓
Future Build Packs register additional widgets
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Customer number format | Sequence, prefix, branch code |
| CRM types | Metadata-driven list per industry |
| Status values and transitions | Lifecycle matrix (Prospect → Lead → Customer) |
| Default owner assignment rules | Branch or team mapping (ENG-004 optional) |
| Industry labels | ENG-003k (e.g. "Member" vs "Customer") |
| Customer 360 widget layout | Default panels per Individual vs Entity |
| Insight tiles | Which Customer Insights appear by edition |
| Assignment reason codes | Manual, auto-route, escalation, queue |
| Pause reasons | Pending customer, awaiting approval |
| SLA clock modes | Business hours vs calendar hours |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| BP-002 Party | Read identity; create Party when needed; **single Party ID lifecycle** |
| BP-002 IP-006 | Read relationships for Relationship Network panel |
| BP-002 IP-010 | Party Timeline for Activity Timeline panel |
| BP-002 Documents / Consent | Read for Documents tab and insight tiles |
| BP-001 | Business context, permissions |
| ENG-003n | Assignment history, SLA segments, queue metrics |
| ENG-005 | Workflow, escalations |
| ENG-004 | Optional auto-assignment and routing rules |
| ENG-003k | Industry widget visibility and labels |
| ENG-013 | Audit |
| ENG-016 | Search |
| ENG-009 | Notifications |
| IP-02–IP-12 | Widget and timeline contributions per matrix above |
| Future BPs | Widget registration API (planned) |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Customer register | All CRM records by status and type |
| New customers | Registrations by period and source |
| Ownership coverage | Records without assigned owner |
| Lifecycle distribution | Count by status and branch |
| Assignment history | Segments by work item, owner, duration |
| SLA breach summary | Breaches by owner, team, entity type |
| 360 coverage | Customers with incomplete insight data (data quality) |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | CRM record creatable from existing and new Party. |
| AC-002 | Customer numbers generated per configured format. |
| AC-003 | Duplicate Party-CRM linkage prevented within business. |
| AC-004 | **Customer 360 is the default tab** when opening Customer Profile. |
| AC-005 | Customer 360 Identity panel reads BP-002 without data duplication. |
| AC-006 | Relationship Network displays BP-002 relationships with navigation to related records. |
| AC-007 | Activity Timeline shows unified chronological events from Party Timeline. |
| AC-008 | Customer Insights panel displays last interaction, open cases, and next follow-up without tab navigation. |
| AC-009 | Prospect → Lead → Customer preserves same Party ID and continuous timeline. |
| AC-010 | Status transitions enforce configured rules. |
| AC-011 | Audit and timeline events published for all CRM master changes. |
| AC-012 | Ownership change creates immutable assignment history segment via ENG-003n. |
| AC-013 | At least one widget each from IP-02, IP-03, IP-05, IP-09 visible on Customer 360 when data exists. |

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| BP-001 IP-003 | Business context |
| BP-002 IP-01 | Party Master |
| BP-002 IP-006 | Relationships (read) |
| BP-002 IP-010 | Party Timeline (read/write events) |
| ENG-003a | CRM and 360 layout configuration |
| ENG-003k | Industry presentation |
| ENG-003n | Work Assignment & SLA Engine |
| ENG-005 | Workflow and escalation |
| ENG-013 | Audit |
| ENG-016 | Search |
| ENG-009 | Notifications |

---

## Future Enhancements

- Relationship graph visualization (Phase 2)
- ENG-012 AI natural-language Customer 360 summary
- Cross–Build Pack widget SDK for BP-005+, Lending, Insurance, AML
- Predictive health scoring via ENG-012 Intelligence Engine

---

## Architectural principles (CRM Core freeze)

### Interaction continuity

The customer should not be required to repeatedly explain the same issue or interaction when moving between channels, employees or service processes.

Intended future convergence (owned by later IPs / channels — **not implemented in IP-01**):

```
WhatsApp → Contact Centre → Case → Visit → Relationship Manager → Customer 360
```

All relevant interactions must ultimately converge on the same Party, CRM record, Case (when applicable), Party Timeline, and relevant operational object.

### Preferred communication channel

Customer 360 Identity surfaces preferred channel by **reading** BP-002 `party_communication_preference.preferred_contact_method` (display label). CRM does not store a parallel preference. Outbound enforcement remains IP-08.

### Progressive / digital onboarding (boundary)

Digital onboarding is **not** an IP-01 deliverable. CRM Core must remain compatible with self-service, assisted, hybrid, partner/API, and progressive onboarding journeys owned elsewhere:

- Onboarding is a journey, not a form.
- Low-information first contact may create or reuse a Party; CRM consumes that Party ID.
- CRM must never create a second customer master for the same Party.
- Leads may originate from catalogue sources (WEB, API, IMPORT, INSTITUTION, …) with incomplete profiles.

### Customer 360 contribution contract

IP-05–IP-13 and future Build Packs register widgets/timeline events into the existing catalog/registry. Placeholders remain until owning IPs ship. Do not invent fake implementations to complete the 360 UI.
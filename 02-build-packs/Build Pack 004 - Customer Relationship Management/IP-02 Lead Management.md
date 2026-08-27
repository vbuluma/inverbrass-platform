# BP-004 IP-02 – Lead Management

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-02 |
| Build Pack | BP-004 – Customer Relationship Management |
| Priority | High |
| Depends On | IP-01 CRM Foundation & Customer 360, BP-002 |

---

## Objective

Enable capture, qualification, assignment, nurturing, and conversion of sales leads into CRM accounts, contacts, and opportunities while preserving lead source attribution and conversion history.

---

## Business Problem

Inbound interest arrives through web forms, walk-ins, referrals, campaigns, and partner channels. Without a central lead process, prospects are lost, duplicated, or assigned inconsistently. Sales teams need a governed path from first contact to qualified opportunity without prematurely creating full customer records.

---

## Scope

### Included

- Lead registration and source tracking
- Lead qualification scoring and status
- Lead assignment and reassignment
- Lead nurturing tasks and follow-up triggers
- Lead conversion to CRM account, contact, and opportunity
- Lead disqualification and recycle
- Lead search and pipeline views

### Excluded

- Party identity management (BP-002)
- Opportunity pipeline management beyond conversion handoff (IP-03)
- Campaign execution detail (IP-11)
- Marketing automation platforms

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Capture leads from multiple channels with source attribution. |
| BR-002 | Qualify leads before conversion to reduce poor-fit customers. |
| BR-003 | Route leads to owners by territory, product, or team rules. |
| BR-004 | Convert qualified leads without duplicate Party or CRM records — **same Party ID from prospect through customer**. |
| BR-005 | Retain lead history after conversion for analytics. |
| BR-006 | Support industry-specific lead types and qualification criteria. |
| BR-007 | Track per-owner and cumulative SLA from lead creation through conversion or disqualification (ENG-003n). |

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Create leads manually, via API, web capture, import, or campaign response. |
| FR-002 | Record lead source, campaign, referrer, and channel. |
| FR-003 | Support lead statuses: New, Contacted, Qualified, Unqualified, Converted, Recycled. |
| FR-004 | Assign and reassign lead owner with notification; record assignment history via IP-01 / ENG-003n. |
| FR-005 | Apply configurable qualification score or checklist (ENG-003l). |
| FR-006 | Convert lead to CRM record, account, contact, and/or opportunity in one flow. |
| FR-007 | Link converted lead to resulting CRM entities; mark lead Converted. |
| FR-008 | Disqualify with reason code; optionally recycle to New. |
| FR-009 | Schedule follow-up tasks on lead (handoff to IP-05). |
| FR-010 | Search and filter leads by status, owner, source, date, score. |
| FR-011 | Publish lead lifecycle events to timeline and audit. |
| FR-012 | Display current owner, segment elapsed time, total elapsed time, and SLA status on lead workspace. |
| FR-013 | Pause SLA clock when lead is in configured waiting states (e.g. pending customer). |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Converted leads are read-only except notes and audit reference. |
| BRU-002 | Conversion must not create duplicate Party for same identity. |
| BRU-003 | Unqualified leads require a reason. |
| BRU-004 | Only authorized users may convert or disqualify leads. |
| BRU-005 | Lead conversion updates CRM status and linked entities; it does not create a new Party when one already exists. |
| BRU-006 | All lead lifecycle events publish to the Party Timeline for Customer 360. |
| BRU-007 | Lead owner must be assigned before qualification in configured industries. |
| BRU-008 | Duplicate lead detection warns on matching email, phone, or organisation name. |
| BRU-009 | Lead reassignment closes current ENG-003n SLA segment and opens a new segment for the new owner. |
| BRU-010 | Total lead processing time equals cumulative duration across all owner segments. |

---

## High-Level Process Flow

```
Lead Capture
      ↓
Assign Owner → ENG-003n segment opened
      ↓
Contact & Qualify
      ↓
Qualified? ──No──→ Disqualify / Recycle
      │
     Yes
      ↓
Convert → CRM + Account + Contact + Opportunity
      ↓
Lead marked Converted (historical)
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Lead sources and channels | Metadata list (`lead_source` catalogue) |
| Qualification criteria | `settings.crm.lead.qualification` (score, owner, ENG-003l checklist reserved) |
| Lead scoring | `settings.crm.lead.scoring` (ENG-004 reserved) |
| Conversion | `settings.crm.lead.conversion` — see [Lead Conversion Contract](./Lead%20Conversion%20Contract.md) |
| Assignment rules | Territory, round-robin, team (ENG-004 optional) |
| Lead SLA targets | Time-to-contact, time-to-qualify, time-to-convert |
| Reason codes | Disqualification, recycle |

**Conversion defaults (v1):** Payload overrides (`createOpportunity`, `createCrmIfMissing`) take precedence when supplied; otherwise business configuration defaults apply. New CRM on convert uses `crmStatusOnConvert` (default `LEAD`). Opportunity win may promote CRM to `ACTIVE` via `promoteCrmToActiveOnWin`.

**Low-information intake:** Incomplete profiles are allowed. Sources such as WEB/API/IMPORT/INSTITUTION may originate leads; Party resolution/onboarding remains BP-002 / future onboarding — IP-02 never creates a duplicate Party or CRM master on convert.
---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01 | CRM record on conversion; assignment/SLA contract |
| ENG-003n | Per-owner and total lead SLA |
| IP-03 | Opportunity creation on conversion (attribution metadata persisted) |
| IP-04 | Optional account enrichment (`account_id`); contacts remain BP-002 |
| IP-05 | Follow-up tasks |
| IP-11 | Campaign source reference |
| BP-002 | Party reuse — create Party only via identity/onboarding flows, not CRM duplicate |
| ENG-009 | Owner assignment notifications |
| ENG-004 | Scoring rules |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Lead funnel | Count by status and stage |
| Conversion rate | Qualified and converted percentages |
| Source effectiveness | Leads and conversions by source |
| Owner performance | Response time, segment duration, conversion by owner |
| SLA analysis | Breaches by owner/team; average time to convert |
| Disqualification analysis | Reasons and volumes |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Leads creatable from manual, import, and API channels. |
| AC-002 | Assignment and qualification workflows operational. |
| AC-003 | Conversion creates linked CRM entities without duplication. |
| AC-004 | Converted leads retain historical link to outcomes. |
| AC-005 | Duplicate detection surfaces potential matches. |
| AC-006 | Assignment history and per-owner/total SLA visible on lead record. |

---

## Customer 360 Contribution

Feeds **IP-01 Customer 360** — does not implement a separate profile experience.

| Contribution | Description |
|--------------|-------------|
| **Widgets** | Active lead indicator, lead status, source, conversion readiness |
| **Insights** | Time since last lead activity, conversion stage |
| **Timeline** | `LEAD_CREATED`, `LEAD_QUALIFIED`, `LEAD_CONVERTED`, `LEAD_DISQUALIFIED` |
| **Lifecycle** | Lead stage uses same Party ID as CRM record; conversion updates status without Party duplication |

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| IP-01 | CRM Foundation & Customer 360; SLA contract |
| BP-002 | Party on conversion |
| ENG-003l | Qualification checklist |
| ENG-003n | Assignment and SLA tracking |
| ENG-004 | Lead scoring rules |
| ENG-009 | Notifications |

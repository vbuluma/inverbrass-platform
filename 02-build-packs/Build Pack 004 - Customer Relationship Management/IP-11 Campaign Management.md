# BP-004 IP-11 – Campaign Management

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-11 |
| Build Pack | BP-004 – Customer Relationship Management |
| Priority | Medium |
| Depends On | IP-02, IP-08, BP-002 IP-08, ENG-003n (optional) |

---

## Objective

Plan and track CRM campaigns—target audience selection, execution scheduling, response capture, and ROI measurement—without implementing full marketing automation or duplicating Party group management from BP-002.

---

## Business Problem

Marketing initiatives lack connection to sales outcomes when run outside CRM. Teams cannot measure which campaigns generate qualified leads or revenue. Campaign management in CRM must define targets, track responses into lead management (IP-02), and respect consent for outreach.

---

## Scope

### Included

- Campaign master record
- Campaign types: email, event, referral, advertising, partner
- Target audience selection (segments, party groups via BP-002)
- Campaign status lifecycle
- Budget and expected response tracking
- Response capture linked to leads (IP-02)
- Campaign member status tracking

### Excluded

- Marketing automation workflows (future BP)
- Email blast engine implementation (ENG-009 consumption only)
- Party group definition (BP-002 IP-08)
- Loyalty and promotion engines

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Plan campaigns with clear objectives and target audience. |
| BR-002 | Track responses as attributable leads. |
| BR-003 | Measure campaign cost versus pipeline generated. |
| BR-004 | Respect BP-002 consent for campaign outreach. |
| BR-005 | Support industry-specific campaign types. |
| BR-006 | Optional: track campaign follow-up SLA for unconverted responses via ENG-003n (lower priority). |

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Create campaign with name, type, dates, budget, objective. |
| FR-002 | Define target audience via segment rules or BP-002 party group reference. |
| FR-003 | Support campaign statuses: Planned, Active, Completed, Cancelled. |
| FR-004 | Launch campaign with scheduled start; activate response capture. |
| FR-005 | Record campaign member and response status (Sent, Responded, Converted). |
| FR-006 | Auto-create lead (IP-02) from response with campaign source attribution. |
| FR-007 | Track actual cost and compare to budget. |
| FR-008 | Close campaign with summary metrics. |
| FR-009 | Search campaigns by status, type, date, owner. |
| FR-010 | Publish campaign events to timeline and audit. |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Campaign outreach requires consent check per BP-002 IP-12. |
| BRU-002 | Responses must link to campaign for attribution. |
| BRU-003 | Completed campaigns are read-only except reporting notes. |
| BRU-004 | Target audience must resolve to valid Party or segment definition. |
| BRU-005 | Converted lead counts roll up to campaign ROI metrics. |

---

## High-Level Process Flow

```
Plan Campaign + Define Audience
      ↓
Activate → Execute Outreach (ENG-009)
      ↓
Capture Responses
      ↓
Create Leads (IP-02) with Source = Campaign
      ↓
Track Converted → Opportunity Value
      ↓
Close Campaign → ROI Report
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Campaign types | Metadata per industry |
| Segment rules | Audience criteria |
| Response statuses | Member lifecycle |
| Budget categories | Cost classification |
| Consent requirements | Channel-specific (ENG-003b) |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-02 | Lead creation from responses |
| IP-03 | Pipeline value attribution |
| BP-002 IP-08 | Party groups for targeting |
| BP-002 IP-12 | Consent verification |
| ENG-009 | Outbound campaign messages |
| ENG-011 | Campaign performance reports |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Campaign summary | Responses, leads, conversions |
| ROI | Cost vs pipeline and won revenue |
| Response rate | By campaign and channel |
| Lead quality | Conversion rate by campaign |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Campaigns creatable with audience and budget. |
| AC-002 | Responses generate attributed leads. |
| AC-003 | Consent enforced before outreach. |
| AC-004 | ROI metrics calculate cost vs outcomes. |
| AC-005 | Completed campaign metrics locked for reporting. |

---

## Customer 360 Contribution

| Contribution | Description |
|--------------|-------------|
| **Widgets** | Active campaigns, campaign responses, last campaign touch |
| **Insights** | Campaign response rate, attributed leads |
| **Quick actions** | Log campaign response |
| **Timeline** | `CAMPAIGN_MEMBER_ADDED`, `CAMPAIGN_RESPONSE`, `CAMPAIGN_LEAD_ATTRIBUTED` |
| **Publisher** | `CampaignCustomer360Provider` — mounted by IP-01 |

---

## Implementation Status (Sales & Marketing — Frozen)

| Area | Status |
|------|--------|
| Schema / migration `0044` | Complete (journal = Integration Manager) |
| Party group audience | Complete — dynamic segments deferred |
| Consent before outreach | Complete (BP-002 prefs) |
| Membership + responses | Complete |
| Lead attribution adapter | Stub until IP-02 — no Lead tables here |
| ENG-009 outreach | Manual stub |
| ROI summary | Complete (pipeline value pending IP-03) |
| UI + navigation | Complete |
| Customer 360 contribution | Complete |

**Lead merge contract:** Campaign response → `LeadAttributionAdapter` → IP-02 Lead service → `campaign_member.lead_id`.

**Canonical handover:** `sales-marketing-implementation.md`

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| IP-02 | Lead attribution |
| BP-002 IP-08, IP-12 | Audience and consent |
| ENG-009 | Message delivery |
| ENG-011 | Reporting |
| IP-01 | Mount 360 contribution |

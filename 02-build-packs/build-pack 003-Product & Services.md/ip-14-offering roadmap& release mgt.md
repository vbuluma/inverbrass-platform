# BP-003 IP-014 – Offering Roadmap & Release Management

> **Status: RETIRED from BP-003 (AV-1.5)**
>
> This capability is **not implemented as a Build Pack IP**. Requirements are owned by the Core Platform Engine:
>
> **ENG-003m – Portfolio & Roadmap Engine**
>
> See [01 – Enterprise Solution Architecture](../../01-enterprise-architecture/01-Enterprise-Solution-Architecture.md) §5 (ENG-003m specification).
>
> **Why retired:** Roadmap and release management applies to offerings, programmes, services, projects, and business processes — not only products. BP-003 **freezes after IP-013 (Offering Governance)**.
>
> **Engine ID note:** ENG-017 is reserved for the Phase 2 **Identity Resolution Engine** and cannot be used for portfolio planning. ENG-003m follows the established ENG-003 sub-engine pattern (alongside ENG-003l Checklist & Completion).

---

## Original Requirements (preserved for ENG-003m implementation)

### Objective

Provide structured planning and controlled evolution of offerings by managing initiatives, releases, milestones, enhancements, and retirement plans.

This module answers:

- What improvements are planned?
- What is being released?
- What has changed?
- When will changes go live?
- Which customers are affected?

### Business Objectives

| ID | Requirement |
|----|-------------|
| BR-001 | Manage offering roadmap |
| BR-002 | Plan future releases |
| BR-003 | Track enhancement initiatives |
| BR-004 | Record release history |
| BR-005 | Support controlled retirement planning |
| BR-006 | Improve product portfolio planning |

### Functional Requirements

| FR | Requirement |
|----|-------------|
| FR-001 | Create roadmap items |
| FR-002 | Group roadmap items into releases |
| FR-003 | Track milestones |
| FR-004 | Track implementation progress |
| FR-005 | Display roadmap timeline |
| FR-006 | Maintain release history |
| FR-007 | Link roadmap items to offerings |
| FR-008 | Track retirement plans |
| FR-009 | Search roadmap items |
| FR-010 | Display upcoming releases |

### Roadmap Item Types (examples)

| Type | Example |
|------|---------|
| Enhancement | Add overdraft |
| Feature | Mobile repayments |
| Regulatory | CBK reporting update |
| Compliance | GDPR support |
| Pricing Change | New pricing model |
| Channel Expansion | WhatsApp onboarding |
| Integration | CRM integration |
| Retirement | End product |

### Release Status (examples)

Planned → Approved → In Progress → Ready → Released | Cancelled

### Milestones (examples)

Idea → Business Approval → Analysis → Development → Testing → Training → Pilot → Production → Retirement

### Business Rules

| Rule | Description |
|------|-------------|
| Roadmap items belong to one offering | Subject binding via ENG-003m `portfolio_roadmap_item` |
| Releases may contain multiple roadmap items | Release grouping |
| Released items become read-only | Immutability |
| Cancelled items remain historical | Audit trail |
| Retirement cannot occur before active release | Retirement gate |

### Platform Entity Mapping (ENG-003m — not BP-003 tables)

| Original BP-003 concept | ENG-003m entity |
|-------------------------|-----------------|
| `offering_release` | `portfolio_release` |
| `offering_roadmap_item` | `portfolio_roadmap_item` (with `subject_type = offering`) |
| `offering_release_history` | `portfolio_release_history` |
| Milestones | `portfolio_milestone` |

### UI (future BP-003 consumption)

Product Workspace tab **Roadmap** — sections rendered from ENG-003m services:

- Current Roadmap
- Upcoming Releases
- Milestones
- Release History
- Retirement Plan
- Timeline

### Integration (ENG-003m feeds)

| Engine | Purpose |
|--------|---------|
| ENG-005 Workflow | Release approvals |
| ENG-011 Reporting | Portfolio planning reports |
| ENG-012 Intelligence | Prioritization recommendations |
| ENG-003f Product Intelligence | Analytics on roadmap outcomes |
| ENG-013 Audit | Release and milestone changes |

### DO NOT IMPLEMENT in BP-003

- `offering_release`, `offering_roadmap_item`, or `offering_release_history` tables in the Product module
- Roadmap business logic in `03-platform/src/modules/product/`
- IP-014 Cursor implementation prompts under BP-003

**When ENG-003m is implemented:** BP-003 adds a Roadmap workspace tab that consumes the platform engine API — same pattern as checklist consumption via ENG-003l.

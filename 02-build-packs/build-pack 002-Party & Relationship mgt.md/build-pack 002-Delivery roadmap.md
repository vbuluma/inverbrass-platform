I actually think we can improve on what we did in BP-001.

BP-001 implementation was mostly **feature-driven** (Authentication → Business Setup → Dashboard). For BP-002, because it becomes a **core platform service**, the implementation should be **layer-driven**.

This reduces rework and ensures every later Build Pack (Sales, Inventory, CRM, Payments, etc.) can immediately consume the Party engine.

---

# BP-002 – Party & Relationship Management

## Implementation Roadmap

### Release Goal

Deliver a reusable **Party Management Engine** that becomes the master repository for Individuals and Organizations across the InverBrass Platform.

---

# IP-001 — Party Foundation

**Objective**

Build the master Party engine.

### Deliverables

* Party entity
* Individual Profile
* Organization Profile
* Party Status
* Party Types
* Party Repository
* Party Service
* Party Registration APIs
* Basic validation
* Party ID generation
* Party lifecycle

### UI

* Party Registration
* Party Details (Overview only)

### Smoke Tests

* Create Individual
* Create Organization
* Validation
* Read-only verification

---

# IP-002 — Party Roles

**Objective**

Allow one Party to perform multiple roles.

### Deliverables

* Party Role entity
* Role Assignment
* Role History
* Primary Role
* Role activation/deactivation

Examples

Keith

✓ Customer

✓ Supplier

✓ Employee

### UI

Roles tab

### Smoke Tests

* Add Role
* Remove Role
* Multiple Roles
* Primary Role

---

# IP-003 — Contact Management

**Objective**

Centralize communications.

### Deliverables

* Phone Numbers
* Emails
* WhatsApp
* Preferred Contact
* Verification Status

### UI

Contacts tab

---

# IP-004 — Address Management

Deliver

* Physical
* Postal
* Billing
* Delivery
* GPS

Default Address

Multiple Addresses

### UI

Addresses tab

---

# IP-005 — Organization Branches

Deliver

Organization Branch Engine

Head Office

Branch Hierarchy

Branch Manager

Branch Status

Branch Search

### UI

Branches Tab

This integrates nicely with the Branch capability introduced in BP-001.

---

# IP-006 — Relationships

Deliver

Parent

Student

Landlord

Tenant

Patient

Next of Kin

Supplier

Customer

Relationship Types

### UI

Relationships Tab

---

# IP-007 — Groups

Deliver

Groups

Segments

Communities

Classrooms

Farmer Groups

Villages

Customer Segments

### UI

Groups Tab

---

# IP-008 — Documents

Deliver

Document Upload

Expiry

Verification

Preview

### UI

Documents Tab

---

# IP-009 — Timeline & Notes

Deliver

Activity Timeline

Notes

History

Events

### UI

Timeline Tab

---

# IP-010 — Search Engine

Deliver

Global Party Search

Advanced Filters

Saved Filters

Quick Search

Duplicate Candidate Search

This is where performance matters.

---

# IP-011 — Duplicate Detection & Merge

Deliver

Matching Rules

Similarity Score

Merge Wizard

Audit

Undo Merge

One of the most important enterprise features.

---

# IP-012 — Dashboard

Deliver

Party Dashboard

Widgets

KPIs

Recent Activity

Duplicate Queue

Pending Approvals

Quick Actions

---

# IP-013 — Approval Workflow

Deliver

Maker

Checker

Approval

Rejection

Audit

Integrates with your Workflow Engine.

---

# IP-014 — AI Insights

Deliver

Customer Health

Risk

Loyalty Suggestions

Relationship Insights

Recommendations

Only visible when AI Services are enabled.

---

# Final Workspace

At completion, opening a Party should show:

```
Party Workspace

─────────────────────────────

Overview

Roles

Contacts

Addresses

Branches

Relationships

Documents

Groups

Timeline

Communication Preferences

Audit History

```

Exactly the "One Pane of Glass" you designed.

---

# Development Sequence

```
Party Foundation
        │
        ▼
Roles
        │
        ▼
Contacts
        │
        ▼
Addresses
        │
        ▼
Branches
        │
        ▼
Relationships
        │
        ▼
Groups
        │
        ▼
Documents
        │
        ▼
Timeline
        │
        ▼
Search
        │
        ▼
Duplicate Detection
        │
        ▼
Dashboard
        │
        ▼
Workflow
        │
        ▼
AI
```

---

# Estimated Complexity

| IP     | Description         | Complexity |
| ------ | ------------------- | ---------- |
| IP-001 | Party Foundation    | ⭐⭐⭐        |
| IP-002 | Roles               | ⭐⭐         |
| IP-003 | Contacts            | ⭐⭐         |
| IP-004 | Addresses           | ⭐⭐         |
| IP-005 | Branches            | ⭐⭐⭐        |
| IP-006 | Relationships       | ⭐⭐⭐        |
| IP-007 | Groups              | ⭐⭐         |
| IP-008 | Documents           | ⭐⭐         |
| IP-009 | Timeline            | ⭐⭐         |
| IP-010 | Search              | ⭐⭐⭐⭐       |
| IP-011 | Duplicate Detection | ⭐⭐⭐⭐⭐      |
| IP-012 | Dashboard           | ⭐⭐⭐        |
| IP-013 | Approval Workflow   | ⭐⭐⭐        |
| IP-014 | AI Insights         | ⭐⭐⭐⭐       |

## One recommendation

I would make **one structural enhancement** to this roadmap based on what we learned from BP-001.

Before IP-001, add a **BP-002A – Foundation & Reference Data** mini-implementation whose only purpose is to establish the platform foundation for Party Management. It would include:

* Reference/catalog tables (Party Types, Role Types, Contact Types, Address Types, Relationship Types, Group Types, Statuses)
* Drizzle schema and migrations
* Seed data
* Repository interfaces
* Read-only smoke tests
* Architecture validation

This means IP-001 can focus purely on the **Party domain** rather than mixing foundational configuration with business logic. It follows the same successful pattern you adopted in BP-001, where a stable foundation reduced downstream issues. I think this will make BP-002 smoother to implement and easier to maintain as future Build Packs begin consuming the Party engine.

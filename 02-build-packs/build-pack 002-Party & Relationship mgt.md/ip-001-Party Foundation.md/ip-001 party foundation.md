Perfect. Based on how BP-001 was documented and implemented, **IP-001 should not be about "building screens."** It should establish the **Party Foundation** that every subsequent implementation package depends on.

---

# BP-002 — IP-001: Party Foundation

## 1. Purpose

The purpose of IP-001 is to establish the foundational Party Management capability by creating the master Party repository, core data model, business services, registration workflow, and reusable platform components required by all future Party-related functionality.

This implementation package delivers the canonical Party entity and provides the ability to register, view, and maintain Individual and Organization Parties through a single configurable platform service.

No duplicate detection, advanced search, branches, documents, relationships, or AI capabilities are implemented in this package. These are delivered in subsequent implementation packages.

---

# 2. Objectives

IP-001 shall:

* Establish the master Party repository.
* Support registration of Individuals and Organizations.
* Support configurable Party Types.
* Generate unique Party IDs.
* Maintain a single Party record across the platform.
* Support Party lifecycle management.
* Provide reusable services for future Build Packs.
* Provide the first version of the Party Workspace.

---

# 3. Scope

## Included

* Party entity
* Individual Profile
* Organization Profile
* Party registration
* Party overview
* Party status management
* Party lifecycle
* Party repository
* Party service
* Party validation
* Party dashboard (basic)
* Party workspace (Overview tab only)

## Excluded

* Roles
* Contacts
* Addresses
* Branches
* Documents
* Groups
* Relationships
* Timeline
* Search
* Duplicate detection
* Merge
* AI insights

---

# 4. Business Capabilities Delivered

| Capability | Description                                    |
| ---------- | ---------------------------------------------- |
| PC-001     | Individual Party Management                    |
| PC-002     | Organization Party Management                  |
| PC-008     | Party Status Management (basic lifecycle only) |

---

# 5. User Journey

## Register Individual

```
Party Dashboard

↓

New Party

↓

Individual

↓

Capture Core Details

↓

Save

↓

Activate

↓

Party Workspace
```

---

## Register Organization

```
Party Dashboard

↓

New Party

↓

Organization

↓

Capture Core Details

↓

Save

↓

Activate

↓

Party Workspace
```

---

# 6. Screens Delivered

| Screen             | Purpose                             |
| ------------------ | ----------------------------------- |
| Party Dashboard    | View registered Parties             |
| Party Registration | Register Individual or Organization |
| Party Workspace    | Overview only                       |

---

# 7. Party Registration

The registration screen shall dynamically display fields based on Party Type.

## Individual

* Full Name
* Date of Birth
* Gender
* Preferred Language
* Notes (optional)

---

## Organization

* Organization Name
* Registration Number (optional)
* Tax Number (optional)
* Industry
* Organization Type
* Website (optional)
* Notes (optional)

---

# 8. Party Workspace

Only one tab is delivered.

## Overview

Displays

* Party ID
* Party Type
* Display Name
* Status
* Registration Date
* Primary Information
* Summary Card

Other tabs display

> Coming in later Implementation Packages

* Roles
* Contacts
* Addresses
* Branches
* Relationships
* Documents
* Groups
* Timeline
* Communication Preferences
* Audit History

---

# 9. Business Rules

| Rule ID      | Rule                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------- |
| BR-IP001-001 | Every Party shall have one master Party record.                                               |
| BR-IP001-002 | A Party must be either Individual or Organization.                                            |
| BR-IP001-003 | Party Type cannot be changed after creation.                                                  |
| BR-IP001-004 | Every Party receives a system-generated Party ID.                                             |
| BR-IP001-005 | Party Status defaults to Active unless approval is configured.                                |
| BR-IP001-006 | Organization and Individual fields shall display dynamically based on Party Type.             |
| BR-IP001-007 | Party registration shall complete without requiring Roles, Contacts, Addresses, or Documents. |

---

# 10. Functional Requirements

| ID     | Requirement                 |
| ------ | --------------------------- |
| FR-001 | Register Individual Party   |
| FR-002 | Register Organization Party |
| FR-003 | Generate Party ID           |
| FR-004 | View Party Overview         |
| FR-005 | Update Party Overview       |
| FR-006 | Activate Party              |
| FR-007 | Suspend Party               |
| FR-008 | Archive Party               |
| FR-009 | List Parties                |
| FR-010 | View Party Summary          |

---

# 11. Data Model Delivered

Entities implemented:

* Party
* Individual Profile
* Organization Profile

Reference data consumed:

* Party Type
* Party Status
* Industry
* Organization Type

---

# 12. APIs / Server Actions

Implemented services:

* Create Party
* Get Party
* Update Party
* Activate Party
* Suspend Party
* Archive Party
* List Parties

---

# 13. Dashboard

The first Party Dashboard shall display:

* Total Parties
* Individuals
* Organizations
* Active Parties
* Recently Registered Parties

Quick Actions:

* New Individual
* New Organization

---

# 14. Smoke Tests

Read-only verification shall confirm:

* Party creation succeeds.
* Individual registration succeeds.
* Organization registration succeeds.
* Party IDs are unique.
* Party lifecycle transitions work.
* Party Dashboard statistics are accurate.
* Party Workspace loads correctly.
* No duplicate Party records are created during normal registration.

Smoke tests must remain read-only and must not insert, update, seed, repair, or modify database records.

---

# 15. Quality Gates

Before approval, the following must pass:

* `npm run typecheck`
* `npm run lint`
* `npm run build`
* IP-001 smoke tests (read-only)
* Architecture compliance review
* Manual registration of Individual and Organization Parties
* Verification that Party records are reusable by future Build Packs

---

## Definition of Done

IP-001 is complete when:

* A single reusable Party repository exists.
* Individual and Organization Parties can be registered.
* The Party Dashboard lists registered Parties.
* The Party Workspace (Overview tab) is operational.
* All quality gates pass.
* The implementation conforms to the established architecture: **UI → Server Actions → Services → Repositories → Drizzle → PostgreSQL**.
* No duplicate domain logic is introduced, and future capabilities (Roles, Contacts, Addresses, Branches, Documents, etc.) can be added without redesigning the Party foundation.

This provides a solid, extensible foundation for BP-002 while deliberately limiting scope so that subsequent implementation packages can build on it cleanly.

I think we should make **IP-001** as strong as we made **BP-003 IP-001**. This is the **foundation** of CRM, and if we get it right, the remaining 14 IPs become much easier.

---

# BP-004 – Customer Relationship Management

# IP-001 – Customer Profile Foundation

## Status

**Foundation IP (Mandatory)**

---

# 1. Objective

Establish a configurable, enterprise-grade Customer Profile that extends the Party Master (BP-002) and provides the foundation for all customer engagement capabilities.

The Customer Profile shall serve as the single CRM record for customers across all supported industries without duplicating Party information.

---

# 2. Scope

This IP shall deliver the Customer Profile Foundation including registration, ownership, lifecycle management, customer preferences, search, workspace, timeline, audit, migration support, and integration with the Party Master.

---

# 3. Functional Requirements

## FR-001 Customer Registration

The solution shall allow creation of a Customer Profile from:

* Existing Party
* New Party
* API Integration
* Migration
* Bulk Import

The Customer Profile shall always reference a valid Party.

---

## FR-002 Customer Number

The system shall automatically generate a configurable Customer Number.

Support:

* Prefix
* Suffix
* Branch code
* Business Unit code
* Running sequence

Example

```text
CUS-000001
SME-000345
CORP-000021
```

---

## FR-003 Customer Profile

Maintain:

* Customer Number
* Party Reference
* Display Name
* Customer Type
* Customer Status
* Customer Since
* Customer Owner
* Relationship Manager
* Branch
* Business Unit
* Portfolio
* Record Source

---

## FR-004 Customer Types

Configurable customer types.

Examples

* Individual
* Business
* SME
* Corporate
* Government
* NGO
* School
* Hospital
* Cooperative
* Religious Institution
* Other

Metadata driven.

---

## FR-005 Customer Status

Support configurable statuses.

Default

* Prospect
* Active
* Dormant
* Suspended
* Closed
* Archived

---

## FR-006 Customer Lifecycle

Support lifecycle transitions.

Example

```text
Prospect

↓

Active

↓

Dormant

↓

Closed

↓

Archived
```

Business rules shall govern transitions.

---

## FR-007 Customer Ownership

Assign:

* Relationship Manager
* Team
* Branch
* Department
* Business Unit

Support reassignment.

Maintain history.

---

## FR-008 Customer Preferences

Maintain:

* Preferred Language
* Preferred Communication Channel
* Preferred Contact Time
* Preferred Currency
* Time Zone

Support future extension.

---

## FR-009 Migration Support

Support migrated customers.

Capture:

* Legacy Customer Number
* Legacy System
* Migration Date
* Migration Batch
* Record Source

Record Source values

* PLATFORM_CREATED
* MIGRATED
* API

---

## FR-010 Search

Support searching using:

* Customer Number
* Customer Name
* Party Number
* National ID
* Registration Number
* Email
* Phone Number

Integrated with ENG-016 Search Engine.

---

## FR-011 Timeline

Automatically record:

* Customer Created
* Activated
* Suspended
* Closed
* Archived
* Ownership Changed
* Status Changed

---

## FR-012 Audit

All create/update operations shall use the Platform Audit Engine.

---

## FR-013 Customer Dashboard

Provide:

KPIs

* Total Customers
* Active Customers
* Prospects
* Dormant Customers
* Archived Customers

Quick Actions

* Register Customer
* Search Customer
* View Recent Customers

---

## FR-014 Customer Workspace

Workspace tabs

### Active

* Overview
* Timeline
* Audit

### Placeholder

* Classification
* Contacts
* Addresses
* Relationships
* Documents
* Leads
* Opportunities
* Activities
* Communications
* Customer 360
* Analytics
* Governance

---

## FR-015 Industry Experience

Display industry terminology dynamically.

Examples

| Industry   | Display     |
| ---------- | ----------- |
| Banking    | Customer    |
| School     | Parent      |
| Healthcare | Patient     |
| Property   | Tenant      |
| NGO        | Beneficiary |
| Church     | Member      |
| Hotel      | Guest       |

The underlying entity remains **Customer Profile**.

---

# 4. Business Rules

| ID     | Rule                                                        |
| ------ | ----------------------------------------------------------- |
| BR-001 | Customer Profile must reference an existing Party.          |
| BR-002 | Customer Number shall be unique within a Business.          |
| BR-003 | Archived Customers are read-only.                           |
| BR-004 | Customer Number cannot be modified.                         |
| BR-005 | Status transitions shall follow configured lifecycle rules. |
| BR-006 | Active Customers require an assigned Relationship Manager.  |
| BR-007 | Timeline event required for lifecycle changes.              |
| BR-008 | Audit required for all updates.                             |
| BR-009 | Soft Delete only.                                           |
| BR-010 | Customer Profile shall not duplicate Party information.     |

---

# 5. Process Flow

```text
Customer Registration

        │

Create / Select Party

        │

Create Customer Profile

        │

Assign Owner

        │

Set Status

        │

Generate Customer Number

        │

Audit

        │

Timeline

        │

Customer Workspace
```

---

# 6. Database Objects

## Tables

* customer_profile
* customer_type
* customer_status
* customer_timeline

No duplication of:

* Party
* Address
* Contacts
* Identifiers

Those remain under BP-002.

---

# 7. Integrations

Consumes

* BP-001 Identity
* BP-002 Party
* ENG-003 Configuration
* ENG-013 Audit
* ENG-016 Search
* Timeline Engine

---

# 8. Deliverables

* Database migration
* Drizzle schema
* Repository
* Services
* Validators
* Server Actions
* Customer Dashboard
* Customer Registration
* Customer Workspace
* Timeline
* Audit
* Smoke Validation
* Documentation
* Implementation Handover

---

# 9. Acceptance Criteria

* Customer Profile can be created from an existing or new Party.
* Customer Number is generated automatically and remains immutable.
* Lifecycle status changes follow configured business rules.
* Relationship Manager can be assigned and reassigned with audit history.
* Customer records are searchable using configured identifiers.
* Timeline and Audit entries are automatically generated for lifecycle and ownership changes.
* Dashboard and Workspace are fully functional with Overview, Timeline, and Audit tabs, while future tabs are scaffolded for subsequent IPs.
* The solution supports dynamic industry terminology (e.g., Customer, Patient, Tenant, Parent) without changing the underlying Customer Profile model.

---

## Architecture Recommendation

One enhancement I'd introduce here is a **Customer Readiness Score** on the Overview page. Instead of waiting until Governance (IP-013), the workspace can already display a non-blocking completion indicator such as **"Customer Profile 45% Complete"**, showing what's missing (contacts, addresses, documents, relationship manager, etc.). As later IPs are implemented, they simply contribute to the same score through **ENG-003l Checklist & Completion**, giving users immediate feedback and making the CRM feel progressively complete rather than a collection of disconnected modules.

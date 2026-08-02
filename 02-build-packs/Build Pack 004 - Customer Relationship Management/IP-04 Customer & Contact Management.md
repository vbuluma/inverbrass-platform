# BP-004 IP-04 – Customer & Contact Management

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-04 |
| Build Pack | BP-004 – Customer Relationship Management |
| Priority | High |
| Depends On | IP-01, BP-002, ENG-003n |

---

## Objective

Provide unified CRM customer and contact management—customer accounts as the organisational context for B2B and group relationships, plus CRM contact roles that consume Party contact master data from BP-002 without duplicating identity, channels, or consent.

---

## Business Problem

B2B sales and service operate at account level—a company, school, hospital, or household—not individual contact level. Without CRM accounts, opportunities and cases attach only to persons, fragmenting visibility. Contact persons are stored once in Party Management, but CRM needs decision makers, billing contacts, and technical liaisons per account. Re-entering contact details in CRM creates inconsistency and consent conflicts with BP-002.

---

## Scope

### Included — Customer Accounts

- CRM account master record
- Account types and statuses
- Account hierarchy (parent/child)
- Account ownership and team
- Account–CRM record linkage
- Account classification and segment tags
- Account workspace tab

### Included — Contacts

- CRM contact role at account
- Primary and secondary contact designation
- Decision role and influence level
- Contact–opportunity and contact–case association
- Contact workspace within account and CRM record

### Excluded

- Party organisation registration (BP-002)
- Contact person identity creation detail (BP-002 IP-03)
- Phone, email, address storage (BP-002)
- Consent and communication preferences (BP-002 IP-12)
- Org chart and party relationships (BP-002 IP-06)
- Product or contract ownership

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Model selling and service relationships at account level. |
| BR-002 | Support parent–child account hierarchies for enterprise and franchise models. |
| BR-003 | Link accounts to underlying Party where the account represents an organisation. |
| BR-004 | Assign account owner and account team for shared responsibility. |
| BR-005 | Reuse BP-002 contacts as the single source of contact identity. |
| BR-006 | Assign CRM-specific roles per account (Decision Maker, Influencer, User, Billing). |
| BR-007 | Designate primary contact per account and opportunity. |
| BR-008 | Respect BP-002 consent when initiating CRM communications (IP-08). |
| BR-009 | Account and team ownership changes shall record assignment history via IP-01 / ENG-003n. |

---

## Functional Requirements

### Customer Accounts

| ID | Requirement |
|----|-------------|
| FR-001 | Create account manually, from lead conversion, or import. |
| FR-002 | Link account to Party (organisation) and CRM record where applicable. |
| FR-003 | Support account types: Enterprise, SME, Household, Government, Partner, etc. |
| FR-004 | Support account statuses: Prospect, Active, Inactive, Closed. |
| FR-005 | Define parent account and child accounts in hierarchy. |
| FR-006 | Assign account owner and optional account team members; record assignment history via IP-01 / ENG-003n. |
| FR-007 | Apply classification tags and industry segment. |
| FR-008 | Display account roll-up: open opportunities, cases, activities. |

### Contacts

| ID | Requirement |
|----|-------------|
| FR-009 | Link existing BP-002 contact to CRM account. |
| FR-010 | Create new contact via BP-002 flow from account context. |
| FR-011 | Assign CRM role and influence level per account–contact link. |
| FR-012 | Mark primary contact for account; enforce single primary where configured. |
| FR-013 | Associate contacts with opportunities and cases. |
| FR-014 | Display contact summary with BP-002 communication channels (read-only). |
| FR-015 | Indicate consent status from BP-002 before outbound communication. |

### Shared

| ID | Requirement |
|----|-------------|
| FR-016 | Search accounts and contacts by name, role, owner, segment, hierarchy. |
| FR-017 | Publish account and contact role changes to timeline and audit. |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Account name must be unique within a business. |
| BRU-002 | Circular account hierarchy is prohibited. |
| BRU-003 | Contact identity fields are owned by BP-002; CRM stores role context only. |
| BRU-004 | Primary contact designation is unique per account. |
| BRU-005 | Outbound communication must check BP-002 consent flags. |
| BRU-006 | Removing contact role does not delete BP-002 contact record. |

---

## High-Level Process Flow

```
Create Account
      ↓
Link Party (optional) + CRM Record
      ↓
Set Type, Owner, Classification
      ↓
Add Contact → Select BP-002 Contact or Create New (BP-002)
      ↓
Assign CRM Role + Primary Flag
      ↓
Engage via Opportunities (IP-03), Activities (IP-05), Communications (IP-08)
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Account types | Metadata per industry |
| CRM contact roles | Decision Maker, Influencer, etc. |
| Classification tags | Segment definitions |
| Hierarchy depth limits | Max levels |
| Primary contact rules | Mandatory for Active accounts |
| Team roles | Account owner, sales rep, service rep |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01 | CRM record linkage |
| ENG-003n | Account and team ownership assignment history |
| IP-03 | Opportunities at account |
| IP-05 | Activities at account |
| IP-08 | Communication initiation |
| IP-09 | Cases at account |
| BP-002 IP-03 | Contact master read/create |
| BP-002 IP-12 | Consent and preferences |
| ENG-016 | Account and contact search |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Account register | By type, status, segment |
| Hierarchy view | Parent–child structure |
| Contacts by account | Role distribution |
| Decision maker coverage | Accounts without decision maker |
| Coverage | Accounts without owner or contacts |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Accounts creatable with and without Party linkage. |
| AC-002 | Hierarchy prevents circular references. |
| AC-003 | Contacts linked from BP-002 without data duplication. |
| AC-004 | CRM roles assignable per account–contact pair. |
| AC-005 | Primary contact enforced per configuration. |
| AC-006 | Consent status visible before communication actions. |

---

## Customer 360 Contribution

| Contribution | Description |
|--------------|-------------|
| **Widgets** | Account hierarchy summary, primary contacts, account team |
| **Relationship Network** | Surfaces BP-002 contact roles and account links on Customer 360 (master data remains BP-002) |
| **Timeline** | `ACCOUNT_CREATED`, `CONTACT_ROLE_ASSIGNED`, `ACCOUNT_OWNER_CHANGED` |

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| IP-01 | CRM Foundation & Customer 360 |
| BP-002 IP-03 | Contact master |
| BP-002 IP-12 | Consent |
| ENG-003a | Account configuration |

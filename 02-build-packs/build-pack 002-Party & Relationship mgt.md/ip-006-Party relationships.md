BP-002 – IP-005: Party Relationships

Implement IP-005 – Party Relationships only.

Follow the established InverBrass architecture:

UI → Server Actions → Services → Repositories → Drizzle → PostgreSQL

Do not modify existing Party, Roles, Contacts, or Addresses functionality except where required to integrate Relationships into the existing Party Workspace.

Scope

Implement reusable enterprise Party Relationship Management.

Deliver:

Relationship Type catalogue
Party Relationships
Relationship Status
Relationship CRUD
Relationships tab in Party Workspace

Do NOT implement:

Relationship approvals
Workflow
Family trees
Organization charts
Graph visualization
AI relationship analysis
Relationship history visualization beyond standard audit

These belong to later Implementation Packages.

Database

Create:

relationship_type
party_relationship

party_relationship shall include:

From Party ID
To Party ID
Relationship Type
Start Date
End Date
Status
Notes
Enterprise Base Entity
Tenant isolation
Soft delete
Audit fields

Seed configurable relationship types.

Relationship Types

Seed the following (configurable):

**Individual-oriented**

Director
Shareholder
UBO (Ultimate Beneficial Owner)
Trustee
Guarantor
Beneficiary
Signatory
Spouse
Next of Kin
Parent
Guardian

**Organisation-oriented**

Parent Company
Subsidiary
Sister Company
Franchise
Partner
Supplier
Customer
Agent

**General (all editions)**

Student
Employee
Employer
Landlord
Tenant
Property Manager
Doctor
Patient
Organization Contact
Cooperative Member
Donor
Contractor

> **CRM consumption:** BP-004 IP-01 Customer 360 **reads** these relationships for the Relationship Network panel — BP-002 remains the single owner. Graph visualization is Phase 2; list and navigation first.

Future relationship types shall be managed through the Configuration Engine.

Business Rules

Implement:

A Party may have unlimited Relationships.
A Relationship always links exactly two Parties.
Self-relationships are not allowed.
Duplicate active relationships of the same type between the same Parties are not allowed.
Relationships may have effective and end dates.
Inactive relationships remain historically available.
Soft delete only.
Relationship Types are configurable.

Business rules belong only inside Services.

Party Workspace

Enable the Relationships tab.

Display:

Related Party
Relationship Type
Start Date
End Date
Status

Actions:

Add Relationship
Edit Relationship
Deactivate
Reactivate
Remove

Reuse the existing Party Workspace.

Do not create separate relationship pages.

Relationship Creation

Users shall:

Search existing Party.
Select Party.
Select Relationship Type.
Save.

No duplicate Party creation.

Relationships always connect existing Parties.

Search

Support Party lookup by:

Name
Party ID
Mobile
Email
Organization Name

Reuse existing Party search services.

Architecture Rules

Maintain strict separation:

UI Components
Server Actions
Services
Repositories

Repositories perform persistence only.

Services enforce business rules.

No business logic inside UI or Repositories.

Examples to Support

The implementation shall support these scenarios without additional code:

Property Management

John Mwangi
        │
Property Manager
        │
Mary Wanjiku

School

Parent
     │
Student

Healthcare

Patient
      │
Next of Kin

Hospital

Hospital
      │
Doctor

Agriculture

Farmer
      │
Cooperative

NGO

Donor
      │
Beneficiary

These are examples only. The implementation must remain generic.

Quality Gates

Before stopping:

Smoke tests
Typecheck
ESLint
Production build

All must pass.

Stop Point

Complete only IP-005 – Party Relationships.

Do not begin:

IP-006 Party Documents
IP-007 Party Groups
IP-008 Communication Preferences

Return:

Files Created
Files Modified
Database entities
Architecture compliance
Business rules implemented
Smoke results
Typecheck
ESLint
Production build
Remaining manual verification

Stop after IP-005 and await approval before proceeding to IP-006.
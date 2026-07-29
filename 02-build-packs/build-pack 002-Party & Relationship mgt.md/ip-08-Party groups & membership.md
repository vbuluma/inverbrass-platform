Implement BP-002 IP-008 — Party Groups & Membership.

IMPORTANT

This is NOT a Chama module.

This is a reusable Party capability.

Future Build Packs (Property, Agriculture, NGO, Healthcare, Education, CRM, Community, Cooperatives, SACCO, etc.) will consume it.

Maintain Enterprise Architecture.

====================================================
OBJECTIVE
====================================================

Implement configurable Party Groups & Membership.

A Group is a Party aggregation.

Groups are NOT Organizations.

Groups are NOT Organizational Units.

Groups represent collections of Parties.

Examples

Chama

Savings Group

Investment Club

Farmer Group

Church Cell

Association

Committee

Project Team

Cooperative Society

Community Group

NGO Beneficiary Group

Customer Segment

Supplier Network

====================================================
DATABASE
====================================================

Create

group_type

Configurable catalogue.

Examples

CHAMA

SACCO

FARMER_GROUP

SELF_HELP_GROUP

PROJECT_TEAM

BOARD

COMMITTEE

CUSTOMER_SEGMENT

SUPPLIER_NETWORK

CHURCH_GROUP

COMMUNITY_GROUP

COOPERATIVE

NGO_GROUP

etc.

Create

party_group

Contains

Group Name

Group Code

Group Type

Status

Description

Country

Business

Audit

Soft Delete

Create

party_group_member

Contains

Group

Party

Membership Role

Chairperson

Secretary

Treasurer

Member

Coordinator

etc.

Join Date

Exit Date

Status

Primary Contact

Notes

Audit

Soft Delete

====================================================
BUSINESS RULES
====================================================

Unlimited Groups.

Unlimited Members.

One Party may belong to many Groups.

Groups may contain Individuals and Organizations.

Duplicate active membership prohibited.

Exited members retained as history.

Membership roles configurable.

====================================================
UI
====================================================

New Party Workspace tab

Groups

Shows

Groups this Party belongs to

Add Membership

Leave Group

View Group

Membership history

Separate

Group Workspace

Overview

Members

Documents

Contacts

Meetings (future)

Contributions (future)

Activities (future)

====================================================
ARCHITECTURE
====================================================

UI

↓

Server Actions

↓

Services

↓

Repositories

↓

Drizzle

↓

PostgreSQL

Business Rules only in Services.

Repositories remain persistence only.

====================================================
DO NOT IMPLEMENT
====================================================

No Contributions.

No Loans.

No Meetings.

No Voting.

No Accounting.

No Wallets.

No Collections.

Those belong to future Build Packs.

====================================================
QUALITY
====================================================

Typecheck PASS

ESLint PASS

Production Build PASS

Smoke PASS

====================================================
HANDOVER
====================================================

Stop after IP-008.

Do NOT begin IP-009.

Provide

1. Files Created

2. Files Modified

3. Database Entities

4. Business Rules

5. Architecture Compliance

6. Manual Verification

7. Quality Gates

8. Future Build Pack Integration

Explicitly explain how Property Management, Agriculture, NGO, Healthcare, Education, CRM and other Build Packs can reuse Party Groups & Membership without modification.
One architectural recommendation

I would make Groups a sibling of Relationships, not a replacement.

By the end of BP-002 your Party Workspace becomes:

Overview
Roles
Contacts
Addresses
Relationships (Party ↔ Party)
Organization Structure (Organization ↔ Organizational Units)
Documents & Compliance
Groups & Membership (Party ↔ Group)

These four concepts are fundamentally different:

Relationships = "Who is related to whom?" (e.g., Landlord → Tenant, Employer → Employee)
Organization Structure = "How is an organization internally structured?" (HQ → Branch → Department)
Groups = "Which collective does this party belong to?" (Chama, Farmer Group, Project Team)
Roles = "What function does this party perform?" (Customer, Supplier, Employee)

Keeping them separate will make the platform much easier to extend as new verticals are added.

Architectural Recommendation
Keep the four Party concepts separate and composable:

Party
      Roles
    Relationships
    Organization Structure
    Groups & Membership
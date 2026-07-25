InverBrass AI-Assisted Development Methodology (Agreed)

For every deliverable, we will execute this lifecycle:

Architecture
      ↓
Build Pack
      ↓
Capability
      ↓
Deliverable
      ↓
Cursor Build
      ↓
ChatGPT Architecture Review
      ↓
Single Consolidated Fix (if required)
      ↓
Approval
      ↓
Documentation Pack
      ↓
Git Commit
      ↓
Capability Tracker Update
      ↓
Next Deliverable

No exceptions.

Documentation Pack – Deliverable D-004
1. Delivery Summary

Release: R1 – Platform Foundation

Build Pack: BP-001 – Business Setup & Onboarding

Capability: Role & Permission Management

Deliverable ID: D-004

Deliverable: Role Schema (role.ts)

Status: ✅ Complete

Files Modified

src/db/schema/role.ts

Outcome

Implemented the approved Hybrid Role Model supporting both platform-managed and tenant-managed roles using PostgreSQL partial unique indexes.

2. Architecture Decision Record (ADR)
ADR-005 — Hybrid Role Model

Status: Approved

Context

The InverBrass platform must support:

Platform-managed roles shared across all businesses.
Tenant-managed roles created independently by each business.

A single role model was required that supports both scenarios while preventing naming conflicts.

Decision

The role entity shall implement a Hybrid Role Model.

The following principles were adopted:

businessId = NULL identifies a Platform Role.
businessId populated identifies a Business Role.
isSystem = true identifies InverBrass-managed platform roles.
isSystem = false identifies tenant-created roles.

Global uniqueness on the code column was removed.

Instead, PostgreSQL partial unique indexes were adopted:

Unique code where businessId IS NULL.
Unique (businessId, code) where businessId IS NOT NULL.

No CHECK constraint was implemented at this stage to preserve future flexibility.

Rationale

This design:

Eliminates duplication of platform roles.
Allows businesses to define custom roles.
Supports unlimited tenants.
Aligns with PostgreSQL best practices.
Preserves extensibility for future IAM integrations.
Consequences

Platform roles will be seeded once and shared across all businesses.

Business roles remain isolated within each tenant.

Future authorization services will reference roles by UUID regardless of origin.

3. Implementation Decision Log
Date	Deliverable	Decision
2026-07	D-004 Role Schema	Adopted Hybrid Role Model with PostgreSQL partial unique indexes. No CHECK constraint implemented.



4. Cursor Context Summary
Deliverable D-004 approved.

Role Schema is complete.

Architecture decisions:
- Hybrid Role Model adopted.
- businessId NULL = Platform Role.
- businessId populated = Business Role.
- isSystem distinguishes platform vs tenant roles.
- PostgreSQL partial unique indexes enforce uniqueness.
- No CHECK constraint implemented.

Do not revisit this design unless explicitly instructed.
Proceed to the next approved deliverable.



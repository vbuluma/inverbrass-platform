# D-005 — IAM Schema Validation & Freeze Review

Review scope: `permission-action.ts`, `permission.ts`, `user-role.ts`, `role-permission.ts` against the approved Hybrid Role Model (`role.ts`), enterprise architecture documents, and existing schema conventions.

**Overall verdict:** The four schemas establish a sound RBAC foundation aligned with the Hybrid Role Model — platform catalog entities plus tenant-scoped assignment via `business_membership`. Several referential integrity, tenant isolation, and audit gaps must be closed before freeze.

---

## 1. `permission-action.ts`

### Purpose
Platform-managed reference catalog of permission verbs (VIEW, CREATE, UPDATE, etc.). Normalizes the action dimension so `permission` records compose permissions as `module + resource + action` rather than embedding action strings.

### Architecture assessment
Correctly classified as a **Platform Entity** (Document 04). No tenant scoping — consistent with global catalogs (`business-membership-status`, `currency`, `payment-method`). Matches the approved `role.ts` pattern: UUID PK, `code` business key, display metadata, `isActive`, audit timestamps. Seed data exists in `seeds/permission-actions.ts`.

Aligns with future external IAM integration: stable, human-readable `code` values map cleanly to external claim/action vocabularies.

### Strengths
- Global uniqueness on `code` prevents duplicate action definitions
- Field set mirrors other approved reference tables
- `isActive` supports deactivation without deletion (consistent with `role.ts`; no soft-delete on catalog entities)
- Appropriate `varchar` lengths for action codes

### Risks
- None that block enterprise readiness at the schema level
- Downstream `permission` rows depend on this catalog; deletion remains blocked by FK default (`ON DELETE NO ACTION`) — acceptable

### Required changes
**None.**

---

## 2. `permission.ts`

### Purpose
Platform-managed permission catalog. Each row defines one authorizable capability decomposed into `module`, `resource`, and `permissionActionId`, with a globally unique `code` as the enterprise business key for authorization checks and external IAM mapping.

### Architecture assessment
Correctly scoped as a **Platform Entity** — permissions are system-defined; tenants configure access by assigning permissions to roles via `role-permission`, not by creating permissions. This aligns with BP-001 (“Role permissions shall be configurable and extensible through the Core Security Engine”) and Document 09 RBAC principles.

Structure supports extensibility: new modules/resources/actions add rows without schema changes. UUID + `code` dual identity supports internal joins and external claim mapping.

### Strengths
- Decomposed `module` / `resource` / `permissionActionId` model is query-friendly and extensible
- FK to `permission_action` enforces referential integrity
- Globally unique `code` provides stable authorization key
- Audit timestamps and `isActive` align with approved catalog conventions

### Risks
| Risk | Severity |
|------|----------|
| No composite uniqueness on `(module, resource, permission_action_id)` — semantically duplicate permissions can exist under different `code` values | High |
| No index on `permission_action_id` — FK column will be joined/filtered frequently; PostgreSQL does not auto-index FKs | Medium |

### Required changes
1. **Add composite unique constraint** on `(module, resource, permission_action_id)` — enforces one permission definition per module/resource/action combination.
2. **Add index** on `permission_action_id` — PostgreSQL FK best practice; required for authorization catalog queries at scale.

---

## 3. `user-role.ts`

### Purpose
Tenant-scoped assignment table linking a `business_membership` to one or more `role` records. Supports temporal validity via `effectiveFrom` / `effectiveTo` and assignment audit via `assignedBy` and `assignmentReason`. This is the bridge between identity (`platform_user` via membership) and the Hybrid Role Model.

### Architecture assessment
Correct architectural choice: assignments go through `business_membership`, not directly to `platform_user`. That enforces tenant context (Document 09 SEC-002: every request executes within authenticated Business/Tenant context) and supports users with memberships in multiple businesses.

Temporal fields support access reviews and audit requirements (BP-001 §52: “Role assignment changed”). `assignedBy` FK to `platform_user` aligns with Document 04 user accountability for significant IAM actions.

**Gap:** The schema does not prevent assigning a **Business Role belonging to a different tenant** to a membership. The FK chain is:

```
user_role.business_membership_id → business_membership.business_id  (Tenant A)
user_role.role_id                → role.business_id                 (could be Tenant B)
```

Platform roles (`role.business_id IS NULL`) are correctly assignable to any membership. Business roles must be tenant-aligned — this is not enforced today.

### Strengths
- Tenant context via `business_membership` (not direct user FK) — correct multi-tenancy pattern
- Temporal assignment model supports access reviews and history
- `assignedBy` and `assignmentReason` support audit trail requirements
- `createdAt` / `updatedAt` present (consistent with assignment entity pattern)
- Compatible with both Platform Roles and Business Roles from approved Hybrid Role Model

### Risks
| Risk | Severity |
|------|----------|
| Cross-tenant role assignment possible at DB level (Business Role from Tenant B assignable to Tenant A membership) | **Critical** |
| No constraint preventing multiple concurrently active assignments of the same role to the same membership | High |
| No indexes on `business_membership_id` or `role_id` — authorization hot-path joins | Medium |
| Depends on `business_membership` enforcing one membership per `(business_id, platform_user_id)` — not present today; duplicate memberships would corrupt assignments | Medium (dependency) |

### Required changes
1. **Add partial unique index** on `(business_membership_id, role_id) WHERE effective_to IS NULL` — prevents duplicate active assignments; allows historical re-assignments after expiry.
2. **Add indexes** on `business_membership_id` and `role_id` — required for authorization query performance.
3. **Add database trigger** (migration artifact) on INSERT/UPDATE of `user_role` to enforce:
   - `role.business_id IS NULL` (Platform Role — assignable to any membership), **OR**
   - `role.business_id = business_membership.business_id` (Business Role — tenant-aligned only)

   Drizzle cannot express cross-table CHECK constraints; a trigger is required for DB-level tenant isolation on this hot-path table (Document 04 §11, Document 09 §3).

---

## 4. `role-permission.ts`

### Purpose
Many-to-many junction mapping roles to permissions. Platform roles receive seeded permission sets shared across tenants; Business Roles receive tenant-configured permission subsets from the global catalog.

### Architecture assessment
Correct junction pattern for RBAC. Permissions remain platform-global; scoping is applied at the role level via the approved Hybrid Role Model, then propagated to users through `user_role`.

Minimal column set is appropriate for a junction table. Missing elements are integrity constraints, assignment audit, and query indexes.

**Gap:** No protection against duplicate `(role_id, permission_id)` rows or against unauthorized modification of Platform Role permission mappings (`role.business_id IS NULL`), which would affect all tenants.

### Strengths
- Correct M:M relationship between approved `role` and `permission` entities
- UUID PK supports distributed/offline patterns (Document 04)
- `createdAt` captures when a permission was granted to a role
- Aligns with Hybrid Role Model — same junction serves Platform and Business Roles

### Risks
| Risk | Severity |
|------|----------|
| No unique constraint on `(role_id, permission_id)` — duplicate mappings possible | High |
| No `assignedBy` / `grantedBy` — assignment audit gap vs. `user_role` (BP-001 §52, Document 04 §8) | High |
| No indexes on `role_id` or `permission_id` — primary authorization lookup path | Medium |
| Platform Role permission mappings modifiable without DB-level guard — cross-tenant blast radius | Medium |

### Required changes
1. **Add unique constraint** on `(role_id, permission_id)` — prevents duplicate role-permission mappings.
2. **Add `grantedBy`** — nullable UUID FK to `platform_user.id`, consistent with `user_role.assignedBy`; captures who granted the permission to the role.
3. **Add indexes** on `role_id` and `permission_id` — required for “resolve permissions for role” authorization queries.
4. **Add database trigger or RLS policy** (migration artifact) restricting INSERT/UPDATE/DELETE on `role_permission` rows where the referenced role is a Platform Role (`role.business_id IS NULL`) to platform service roles only — prevents tenant-scoped sessions from altering global permission mappings.

---

## Cross-schema alignment summary

| Concern | permission-action | permission | user-role | role-permission |
|---------|:-:|:-:|:-:|:-:|
| Hybrid Role Model | N/A (catalog) | N/A (catalog) | Aligned | Aligned |
| Multi-tenancy | N/A (global) | N/A (global) | Gap — cross-tenant FK | Indirect via role |
| Drizzle conventions | Aligned | Aligned | Aligned | Aligned |
| Audit standards | Aligned (catalog) | Aligned (catalog) | Aligned | Gap — no `grantedBy` |
| Referential integrity | Aligned | Gap — composite unique | Gap — active assignment unique | Gap — pair unique |
| PostgreSQL indexes | N/A | Gap — FK index | Gap — FK indexes | Gap — FK indexes |
| External IAM readiness | Aligned | Aligned | Aligned | Aligned |

Approved `role.ts` decisions intentionally preserved: no CHECK on `isSystem`/`businessId` alignment, no `createdBy` on catalog entities, partial unique indexes as the PostgreSQL pattern.

---

# Consolidated Implementation Plan — Required Changes Only

Execute in this order before schema freeze and migration generation.

### Phase 1 — Schema file changes (Drizzle)

| # | File | Change |
|---|------|--------|
| 1.1 | `permission.ts` | Add composite unique constraint on `(module, resource, permission_action_id)` |
| 1.2 | `permission.ts` | Add index on `permission_action_id` |
| 1.3 | `user-role.ts` | Add partial unique index on `(business_membership_id, role_id) WHERE effective_to IS NULL` |
| 1.4 | `user-role.ts` | Add indexes on `business_membership_id` and `role_id` |
| 1.5 | `role-permission.ts` | Add unique constraint on `(role_id, permission_id)` |
| 1.6 | `role-permission.ts` | Add `grantedBy` UUID column, nullable FK → `platform_user.id` |
| 1.7 | `role-permission.ts` | Add indexes on `role_id` and `permission_id` |

### Phase 2 — Migration artifacts (SQL, not Drizzle schema redesign)

| # | Artifact | Change |
|---|----------|--------|
| 2.1 | `user_role` trigger | Enforce role scope: Platform Role (`business_id IS NULL`) OR Business Role where `role.business_id = business_membership.business_id` |
| 2.2 | `role_permission` trigger or RLS | Restrict mutations on Platform Role mappings to platform service role |

### Phase 3 — Pre-migration validation

| # | Check |
|---|-------|
| 3.1 | Confirm no existing seed/migration data violates new unique constraints |
| 3.2 | Confirm `permission-actions` seed codes align with expected `permission` composite keys |
| 3.3 | Document trigger/RLS behavior in ADR alongside D-005 freeze decision |

### Out of scope (not required for this freeze)

- Changes to approved `role.ts`
- `businessId` denormalization on `user_role` (tenant context available via join; trigger addresses isolation)
- `createdBy` / `updatedBy` on catalog tables (not in approved `role.ts` pattern)
- Soft-delete / `version` / sync metadata columns (not in approved IAM catalog pattern)
- `business_membership` unique constraint on `(business_id, platform_user_id)` — dependency risk noted; separate deliverable

---

**Status:** Review complete. No files modified. Awaiting approval before consolidated fix and migration generation.


APPROVAL DECISION & PROMPT
Delivery Summary

Release: R1 – Platform Foundation

Build Pack: BP-001 – Business Setup & Onboarding

Capability: Role & Permission Management

Deliverable: D-005 – IAM Schema Freeze Review

Status: ✅ Approved with Changes

ADR-006 – Tenant Isolation Enforcement
Decision

Tenant boundary validation shall be enforced by the Application Layer rather than PostgreSQL triggers.

Rationale
Keeps the database simple.
Easier to test.
Easier for AI-assisted development.
Easier to maintain.
Easier to integrate with future external IAM providers.
Consistent with the existing Business Context architecture.
Consequences

Future services responsible for role assignment shall validate:

Platform Roles (businessId = NULL) may be assigned to any business membership.
Business Roles (businessId ≠ NULL) may only be assigned to memberships belonging to the same business.

No PostgreSQL trigger will be implemented for this rule.

Cursor Prompt (Consolidated Fix)

This is the only implementation prompt Cursor should receive next:

Release:
R1 – Platform Foundation

Build Pack:
BP-001 – Business Setup & Onboarding

Capability:
Role & Permission Management

Deliverable:
D-006 – IAM Schema Freeze Corrections

Apply ONLY the following approved architecture changes.

permission.ts
- Add composite unique constraint:
  (module, resource, permission_action_id)
- Add index on permission_action_id

user-role.ts
- Add partial unique index:
  (business_membership_id, role_id)
  WHERE effective_to IS NULL
- Add indexes:
  business_membership_id
  role_id

role-permission.ts
- Add unique constraint:
  (role_id, permission_id)
- Add nullable grantedBy UUID FK to platform_user.id
- Add indexes:
  role_id
  permission_id

Do NOT implement PostgreSQL triggers.

Do NOT implement Row-Level Security.

Tenant isolation and Platform Role protection will be enforced by the Application Layer in future IAM services.

Do not modify any other files.

Do not generate migrations.

Provide a summary of all changes.

Wait for approval.
Prompt:
Capability

Role & Permission Management

Deliverable

D-007 – IAM Seed Design & Validation

Notice Design, not coding.

We are going to design the entire RBAC catalog before Cursor generates any seed files.

Why design first?

The permission catalog is one of the hardest things to change later.

If we seed:

CustomerManagement.Customer.Delete

today,

and six months later rename it,

every role,

every authorization check,

every audit log,

every external IAM integration,

and every API

can break.

This is one of those things we should get right once.

Cursor Prompt
Release:
R1 – Platform Foundation

Build Pack:
BP-001 – Business Setup & Onboarding

Capability:
Role & Permission Management

Deliverable:
D-007 – IAM Seed Design & Validation

Objective

The IAM schema has been approved and frozen.

Do NOT generate seed files yet.

Design the complete RBAC reference data model that will populate the approved schema.

Review the existing architecture documents and current schemas.

Produce a complete design covering:

1. Platform Roles
   - Recommend the complete list of default Platform Roles.
   - Explain the purpose of each role.
   - Distinguish Platform Roles from Business Roles.

2. Permission Actions
   - Validate the existing action catalog.
   - Recommend additions only if absolutely required.

3. Permission Catalog
   - Propose the complete permission naming convention.
   - Validate consistency with the approved Hybrid Role Model.
   - Group permissions by capability.

4. Default Role-Permission Matrix
   - Recommend which permissions belong to each default Platform Role.
   - Explain inheritance philosophy (if any).

5. Seed Execution Order
   - Recommend the correct order for seeding:
     - Permission Actions
     - Permissions
     - Platform Roles
     - Role Permissions

6. Future Business Roles
   - Explain how tenant-created Business Roles will reuse the Platform Permission Catalog.

Important

This is a DESIGN deliverable only.

Do NOT write seed code.

Do NOT modify schemas.

Do NOT generate migrations.

Do NOT create files.

Wait for approval.

CURSOR PROPOSAL
# D-007 — IAM Seed Design & Validation

**Release:** R1 – Platform Foundation  
**Build Pack:** BP-001 – Business Setup & Onboarding  
**Capability:** Role & Permission Management  
**Status:** Design for approval — no seed code, no schema changes

---

## Executive Summary

This design defines the RBAC reference data that will populate the frozen IAM schema (`permission_action`, `permission`, `role`, `role_permission`) under the approved **Hybrid Role Model** (ADR-005).

| Layer | Scope | Tenant isolation |
|-------|--------|------------------|
| Permission Actions | Global catalog | N/A |
| Permissions | Global catalog | N/A — tenants never create permissions |
| Platform Roles | Global catalog (`businessId = NULL`, `isSystem = true`) | Assignable to any membership |
| Business Roles | Tenant-scoped (`businessId` set, `isSystem = false`) | Assignable only within owning tenant |
| Role Permissions | Junction — same table for both role types | Platform role mappings protected at application layer |

**R1 seed scope:** BP-001 onboarding capabilities only (~45 permissions, 6 platform roles). Future build packs extend the permission catalog incrementally using the same naming convention — permissions are never renamed once published.

---

## 1. Platform Roles

### 1.1 Platform Role vs Business Role

| Dimension | Platform Role | Business Role |
|-----------|---------------|---------------|
| `businessId` | `NULL` | Populated (tenant UUID) |
| `isSystem` | `true` | `false` |
| Created by | InverBrass (seed) | Business Owner (via IAM service) |
| Code uniqueness | Globally unique | Unique per `(businessId, code)` |
| Permission source | Seeded `role_permission` rows | Tenant-configured subsets from global permission catalog |
| Examples | `BUSINESS_OWNER`, `SUPERVISOR` | `CASHIER`, `BRANCH_MANAGER`, `PHARMACIST` |
| BP-001 reference | §20–22 Initial Roles; §51 Authorization | §43 Workforce Configuration — "Owner-defined operational roles" |

Platform Roles are **shared defaults** — not duplicated per tenant. Every business assigns users to the same platform role records. Business Roles let tenants compose custom access from the global permission catalog without inventing new permission codes.

### 1.2 Recommended Default Platform Roles

| # | Code | Display Name | `displayOrder` | Purpose |
|---|------|--------------|----------------|---------|
| 1 | `BUSINESS_OWNER` | Business Owner | 10 | Full tenant administration: onboarding completion, business activation, configuration, security, user/role management, audit review. Maps to BP-001 primary actor and Document 09 §4.5. |
| 2 | `SUPERVISOR` | Supervisor | 20 | Operational leadership: employee management, PIN resets, branch oversight, configuration viewing, limited reporting. Cannot activate business or modify platform role mappings. |
| 3 | `EMPLOYEE` | Employee | 30 | Day-to-day operational access baseline. Minimal permissions in R1; expanded as operational build packs ship. Default for PIN-authenticated staff (Document 09 §4.3). |
| 4 | `MAKER` | Maker | 40 | Workflow originator role (FR-006). Creates/submits records requiring approval. Orthogonal to EMPLOYEE — assigned **additively** alongside an operational role. Minimal R1 footprint until Workflow Engine ships. |
| 5 | `CHECKER` | Checker | 50 | Workflow approver role (FR-006). Reviews, approves, or rejects maker submissions. Orthogonal to SUPERVISOR — separation-of-duties pattern. |
| 6 | `PLATFORM_ADMIN` | Platform Administrator | 900 | InverBrass internal operations: industry templates, subscription management, platform audit. **No default access to tenant business data** (BP-001 §51 System Administrator). |

**Seed attributes for all platform roles:**
- `businessId`: `NULL`
- `isSystem`: `true`
- `isActive`: `true`

### 1.3 Roles intentionally excluded from R1 seed

| Role | Reason |
|------|--------|
| `PLATFORM_SUPPORT` | Defer until support tooling exists; can be added as a 7th platform role with read-only tenant access |
| Industry-specific roles (e.g. `PHARMACIST`) | Business Roles — tenant-created, not seeded |
| `CUSTOMER` | External/portal identity — separate identity domain, not BP-001 RBAC |

### 1.4 Multi-role assignment model

The schema supports multiple concurrent `user_role` assignments per membership. Recommended R1 patterns:

| User type | Typical role assignment |
|-----------|------------------------|
| Onboarding owner | `BUSINESS_OWNER` |
| Shift manager | `SUPERVISOR` |
| Cashier | `EMPLOYEE` or tenant Business Role `CASHIER` |
| Accounts clerk (future) | `EMPLOYEE` + `MAKER` |
| Approving manager (future) | `SUPERVISOR` + `CHECKER` |

Effective permissions = **union** of all actively assigned roles (`effectiveTo IS NULL`). No role hierarchy in the database.

---

## 2. Permission Actions

### 2.1 Existing catalog — validated ✅

The 13 actions in `seeds/permission-actions.ts` are **sufficient for R1 and the foreseeable platform catalog**. They cover CRUD, workflow (APPROVE/REJECT), delegation (ASSIGN), data movement (IMPORT/EXPORT), process execution (EXECUTE), configuration (CONFIGURE), and lifecycle (ACTIVATE/DEACTIVATE).

| Code | Display Order | R1 usage examples |
|------|---------------|-------------------|
| `VIEW` | 1 | Read business profile, view audit log |
| `CREATE` | 2 | Create branch, create employee |
| `UPDATE` | 3 | Update configuration, update user |
| `DELETE` | 4 | Delete branch, remove role assignment |
| `APPROVE` | 5 | Reserved — CHECKER role (future workflow) |
| `REJECT` | 6 | Reserved — CHECKER role (future workflow) |
| `ASSIGN` | 7 | Assign roles to users |
| `IMPORT` | 8 | Reserved — future data import |
| `EXPORT` | 9 | Export audit log |
| `EXECUTE` | 10 | Activate business, reset PIN |
| `CONFIGURE` | 11 | Manage security profile, feature toggles |
| `ACTIVATE` | 12 | Activate user account |
| `DEACTIVATE` | 13 | Deactivate user account |

### 2.2 Recommended additions

**None for R1.**

Specific operations map cleanly to existing verbs:

| Operation | Mapping | Permission example |
|-----------|---------|-------------------|
| PIN reset | `EXECUTE` on credential resource | `Authentication.UserCredential.Execute` |
| Business activation | `EXECUTE` on business resource | `TenantManagement.Business.Execute` |
| Feature toggle enable/disable | `ACTIVATE` / `DEACTIVATE` | `ConfigurationManagement.FeatureToggle.Activate` |
| Soft-delete records | `DEACTIVATE` | `UserManagement.User.Deactivate` |

**Future consideration (not R1):** `RESTORE` — only if soft-delete reversal becomes a distinct authorization boundary separate from `ACTIVATE`. Defer until a build pack requires it.

---

## 3. Permission Catalog

### 3.1 Naming convention

**Business key (`permission.code`) — ADR-008:**

```
{Capability}.{Resource}.{Action}
```

| Segment | Rules | Examples |
|---------|-------|----------|
| `Capability` | PascalCase; taken directly from the Platform Module Catalog (Document 02) | `CRM`, `Finance`, `TenantManagement`, `UserManagement` |
| `Resource` | PascalCase; singular business entity or capability group | `Customer`, `Payment`, `Business`, `UserRole` |
| `Action` | PascalCase; maps to a `permission_action.code` (see action mapping below) | `Read`, `Create`, `Approve`, `Execute` |

**Action mapping (`permission.code` Action → `permission_action.code`):**

| Permission code Action | `permission_action.code` |
|------------------------|--------------------------|
| `Read` | `VIEW` |
| `Create` | `CREATE` |
| `Update` | `UPDATE` |
| `Delete` | `DELETE` |
| `Approve` | `APPROVE` |
| `Reject` | `REJECT` |
| `Assign` | `ASSIGN` |
| `Import` | `IMPORT` |
| `Export` | `EXPORT` |
| `Execute` | `EXECUTE` |
| `Configure` | `CONFIGURE` |
| `Activate` | `ACTIVATE` |
| `Deactivate` | `DEACTIVATE` |

**Database columns align with code decomposition:**

| Column | Value for `UserManagement.User.Create` |
|--------|----------------------------------------|
| `code` | `UserManagement.User.Create` |
| `module` | `UserManagement` |
| `resource` | `User` |
| `permissionActionId` | FK → `CREATE` |
| `name` | Human-readable: "Create User" |
| `description` | Business context sentence |

**Rules:**
1. **Immutable codes** — once seeded, a code is never renamed; deprecate via `isActive = false`.
2. **One semantic permission per `(module, resource, action)`** — enforced by composite unique index on `permission`.
3. **No tenant-specific permission codes** — tenants express variance through Business Role composition.
4. **Authorization checks use `permission.code`** — stable for audit logs and external IAM claim mapping.
5. **Max length** — longest R1 code is ~55 chars; well within `varchar(150)`.

### 3.2 Hybrid Role Model consistency

| Principle | How the catalog supports it |
|-----------|----------------------------|
| Permissions are platform-global | No `businessId` on `permission`; tenants cannot INSERT permissions |
| Roles scope access | Platform vs Business distinction lives on `role.businessId` |
| Tenants configure access | Business Roles get `role_permission` rows pointing to global permissions |
| External IAM readiness | Stable `code` values map 1:1 to claims/scopes |

### 3.3 R1 permission catalog — grouped by capability

#### Capability: `TenantManagement` — Tenant & onboarding entities

| Code | Resource | Action | Purpose |
|------|----------|--------|---------|
| `TenantManagement.Business.Read` | Business | Read | View business profile |
| `TenantManagement.Business.Create` | Business | Create | Register new business (onboarding) |
| `TenantManagement.Business.Update` | Business | Update | Update business profile |
| `TenantManagement.Business.Execute` | Business | Execute | Activate business (API-009) |
| `TenantManagement.Branch.Read` | Branch | Read | View branches |
| `TenantManagement.Branch.Create` | Branch | Create | Create branch (API-006) |
| `TenantManagement.Branch.Update` | Branch | Update | Update branch |
| `TenantManagement.Branch.Delete` | Branch | Delete | Remove branch |
| `TenantManagement.Branch.Activate` | Branch | Activate | Enable branch |
| `TenantManagement.Branch.Deactivate` | Branch | Deactivate | Disable branch |
| `TenantManagement.Dashboard.Read` | Dashboard | Read | Access onboarding/activation dashboard (API-010) |

#### Capability: `SubscriptionManagement` — Subscription & licensing

| Code | Resource | Action | Purpose |
|------|----------|--------|---------|
| `SubscriptionManagement.Subscription.Read` | Subscription | Read | View subscription & enabled modules |

#### Capability: `ConfigurationManagement` — Business configuration & feature toggles

| Code | Resource | Action | Purpose |
|------|----------|--------|---------|
| `ConfigurationManagement.IndustryTemplate.Read` | IndustryTemplate | Read | Browse industry templates (API-004) |
| `ConfigurationManagement.BusinessConfiguration.Read` | BusinessConfiguration | Read | View business configuration |
| `ConfigurationManagement.BusinessConfiguration.Update` | BusinessConfiguration | Update | Save business configuration (API-005) |
| `ConfigurationManagement.BusinessConfiguration.Configure` | BusinessConfiguration | Configure | Advanced configuration wizard access |
| `ConfigurationManagement.FeatureToggle.Read` | FeatureToggle | Read | View enabled premium capabilities |
| `ConfigurationManagement.FeatureToggle.Activate` | FeatureToggle | Activate | Enable AI, Loyalty, Notifications, etc. (FR-008) |
| `ConfigurationManagement.FeatureToggle.Deactivate` | FeatureToggle | Deactivate | Disable optional capabilities |

#### Capability: `UserManagement` — Platform users

| Code | Resource | Action | Purpose |
|------|----------|--------|---------|
| `UserManagement.User.Read` | User | Read | View employees/memberships |
| `UserManagement.User.Create` | User | Create | Create employee (API-007) |
| `UserManagement.User.Update` | User | Update | Update employee profile |
| `UserManagement.User.Activate` | User | Activate | Activate user account |
| `UserManagement.User.Deactivate` | User | Deactivate | Deactivate user account |

#### Capability: `RolePermissionManagement` — Roles, permissions & assignments

| Code | Resource | Action | Purpose |
|------|----------|--------|---------|
| `RolePermissionManagement.UserRole.Read` | UserRole | Read | View role assignments |
| `RolePermissionManagement.UserRole.Assign` | UserRole | Assign | Assign roles to users |
| `RolePermissionManagement.UserRole.Update` | UserRole | Update | Modify assignment (effective dates, reason) |
| `RolePermissionManagement.UserRole.Delete` | UserRole | Delete | End/revoke role assignment |
| `RolePermissionManagement.Role.Read` | Role | Read | View available roles |
| `RolePermissionManagement.Role.Create` | Role | Create | Create Business Role |
| `RolePermissionManagement.Role.Update` | Role | Update | Update Business Role metadata |
| `RolePermissionManagement.Role.Delete` | Role | Delete | Delete/deactivate Business Role |
| `RolePermissionManagement.RolePermission.Read` | RolePermission | Read | View permissions assigned to a role |
| `RolePermissionManagement.RolePermission.Assign` | RolePermission | Assign | Grant permission to Business Role |
| `RolePermissionManagement.RolePermission.Delete` | RolePermission | Delete | Revoke permission from Business Role |
| `RolePermissionManagement.Permission.Read` | Permission | Read | Browse permission catalog (for role configuration UI) |

#### Capability: `Authentication` — Security profile & credentials

| Code | Resource | Action | Purpose |
|------|----------|--------|---------|
| `Authentication.SecurityProfile.Read` | SecurityProfile | Read | View security settings |
| `Authentication.SecurityProfile.Configure` | SecurityProfile | Configure | Configure PIN policy, session timeout, lockout (API-008) |
| `Authentication.SecurityProfile.Update` | SecurityProfile | Update | Update security profile values |
| `Authentication.UserCredential.Execute` | UserCredential | Execute | Reset employee PIN (Document 09 §4.5) |

#### Capability: `AuditActivityLogging` — Audit & activity logging

| Code | Resource | Action | Purpose |
|------|----------|--------|---------|
| `AuditActivityLogging.AuditLog.Read` | AuditLog | Read | View audit trail (BP-001 §52) |
| `AuditActivityLogging.AuditLog.Export` | AuditLog | Export | Export audit records |

**R1 total: 42 permissions** across 7 capabilities.

### 3.4 Future capability registry (design only — not seeded in R1)

Future build packs append permissions using the same convention. Capabilities are reserved per the Platform Module Catalog:

| Capability | Build Pack | Example future codes |
|------------|------------|---------------------|
| `CustomerManagement` | BP-002 | `CustomerManagement.Customer.Read`, `CustomerManagement.Supplier.Create` |
| `ProductManagement` | BP-003 | `ProductManagement.Product.Read`, `ProductManagement.Category.Update` |
| `TaxManagement` | BP-004 | `TaxManagement.TaxRule.Configure` |
| `SalesOrders` | BP-005 | `SalesOrders.SalesOrder.Create`, `SalesOrders.Quote.Approve` |
| `Finance` | BP-006 | `Finance.Payment.Create`, `Finance.Receipt.Read` |
| `StockManagement` | BP-007 | `StockManagement.StockAdjustment.Execute` |
| `CRM` | BP-008 | `CRM.Lead.Assign` |
| `WorkflowEngine` | BP-016 | `WorkflowEngine.WorkflowInstance.Approve` |
| `ReportingEngine` | BP-015 | `ReportingEngine.Dashboard.Read`, `ReportingEngine.FinancialReport.Export` |
| `NotificationEngine` | BP-016 | `NotificationEngine.NotificationTemplate.Configure` |
| `DocumentManagement` | BP-019 | `DocumentManagement.File.Create` |
| `GenerativeAI` | BP-021 | `GenerativeAI.Advisor.Execute` |

New permissions are **additive only** — existing codes are never modified.

---

## 4. Default Role-Permission Matrix

### 4.1 Inheritance philosophy

**No database role hierarchy.** The design uses three explicit principles:

1. **Explicit grants** — every permission on every role is a concrete `role_permission` row.
2. **Additive composition** — users with multiple roles receive the union of all granted permissions.
3. **Least privilege defaults** — EMPLOYEE and workflow roles (MAKER/CHECKER) start minimal; BUSINESS_OWNER is the only role with broad tenant administration in R1.

Conceptual tiering (documentation only, not enforced structurally):

```
PLATFORM_ADMIN  →  InverBrass platform scope (no tenant ops by default)
BUSINESS_OWNER  →  Full tenant administration
SUPERVISOR      →  Operational management subset
EMPLOYEE        →  Baseline read/operate
MAKER / CHECKER →  Workflow overlay (orthogonal)
```

### 4.2 Matrix — TenantManagement & SubscriptionManagement

| Permission | OWNER | SUPERVISOR | EMPLOYEE | MAKER | CHECKER | PLATFORM_ADMIN |
|------------|:-----:|:----------:|:--------:|:-----:|:-------:|:--------------:|
| `TenantManagement.Business.Read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `TenantManagement.Business.Create` | ✅ | — | — | — | — | — |
| `TenantManagement.Business.Update` | ✅ | — | — | — | — | — |
| `TenantManagement.Business.Execute` | ✅ | — | — | — | — | — |
| `TenantManagement.Branch.Read` | ✅ | ✅ | ✅ | — | — | — |
| `TenantManagement.Branch.Create` | ✅ | ✅ | — | — | — | — |
| `TenantManagement.Branch.Update` | ✅ | ✅ | — | — | — | — |
| `TenantManagement.Branch.Delete` | ✅ | — | — | — | — | — |
| `TenantManagement.Branch.Activate` | ✅ | ✅ | — | — | — | — |
| `TenantManagement.Branch.Deactivate` | ✅ | — | — | — | — | — |
| `TenantManagement.Dashboard.Read` | ✅ | ✅ | ✅ | — | — | — |
| `SubscriptionManagement.Subscription.Read` | ✅ | — | — | — | — | ✅ |
| `ConfigurationManagement.IndustryTemplate.Read` | ✅ | ✅ | — | — | — | ✅ |

### 4.3 Matrix — UserManagement & RolePermissionManagement

| Permission | OWNER | SUPERVISOR | EMPLOYEE | MAKER | CHECKER | PLATFORM_ADMIN |
|------------|:-----:|:----------:|:--------:|:-----:|:-------:|:--------------:|
| `UserManagement.User.Read` | ✅ | ✅ | — | — | — | — |
| `UserManagement.User.Create` | ✅ | ✅ | — | — | — | — |
| `UserManagement.User.Update` | ✅ | ✅ | — | — | — | — |
| `UserManagement.User.Activate` | ✅ | ✅ | — | — | — | — |
| `UserManagement.User.Deactivate` | ✅ | ✅ | — | — | — | — |
| `Authentication.UserCredential.Execute` | ✅ | ✅ | — | — | — | — |
| `RolePermissionManagement.UserRole.Read` | ✅ | ✅ | — | — | — | — |
| `RolePermissionManagement.UserRole.Assign` | ✅ | ✅ | — | — | — | — |
| `RolePermissionManagement.UserRole.Update` | ✅ | — | — | — | — | — |
| `RolePermissionManagement.UserRole.Delete` | ✅ | — | — | — | — | — |
| `RolePermissionManagement.Role.Read` | ✅ | ✅ | — | — | — | ✅ |
| `RolePermissionManagement.Role.Create` | ✅ | — | — | — | — | — |
| `RolePermissionManagement.Role.Update` | ✅ | — | — | — | — | — |
| `RolePermissionManagement.Role.Delete` | ✅ | — | — | — | — | — |
| `RolePermissionManagement.RolePermission.Read` | ✅ | — | — | — | — | ✅ |
| `RolePermissionManagement.RolePermission.Assign` | ✅ | — | — | — | — | — |
| `RolePermissionManagement.RolePermission.Delete` | ✅ | — | — | — | — | — |
| `RolePermissionManagement.Permission.Read` | ✅ | — | — | — | — | ✅ |

**Application-layer guardrails (ADR-006):**
- SUPERVISOR may assign only `EMPLOYEE`, `MAKER`, `CHECKER`, and Business Roles — not `BUSINESS_OWNER` or `SUPERVISOR`.
- Only platform services may mutate `role_permission` rows for Platform Roles (`role.businessId IS NULL`).

### 4.4 Matrix — Authentication, ConfigurationManagement & AuditActivityLogging

| Permission | OWNER | SUPERVISOR | EMPLOYEE | MAKER | CHECKER | PLATFORM_ADMIN |
|------------|:-----:|:----------:|:--------:|:-----:|:-------:|:--------------:|
| `Authentication.SecurityProfile.Read` | ✅ | ✅ | — | — | — | — |
| `Authentication.SecurityProfile.Configure` | ✅ | — | — | — | — | — |
| `Authentication.SecurityProfile.Update` | ✅ | — | — | — | — | — |
| `ConfigurationManagement.BusinessConfiguration.Read` | ✅ | ✅ | — | — | — | — |
| `ConfigurationManagement.BusinessConfiguration.Update` | ✅ | — | — | — | — | — |
| `ConfigurationManagement.BusinessConfiguration.Configure` | ✅ | — | — | — | — | — |
| `ConfigurationManagement.FeatureToggle.Read` | ✅ | ✅ | — | — | — | — |
| `ConfigurationManagement.FeatureToggle.Activate` | ✅ | — | — | — | — | — |
| `ConfigurationManagement.FeatureToggle.Deactivate` | ✅ | — | — | — | — | — |
| `AuditActivityLogging.AuditLog.Read` | ✅ | ✅ | — | — | ✅ | ✅ |
| `AuditActivityLogging.AuditLog.Export` | ✅ | — | — | — | — | ✅ |

### 4.5 Permission counts per role (R1)

| Role | Granted permissions |
|------|-------------------|
| `BUSINESS_OWNER` | 42 (all R1 permissions) |
| `SUPERVISOR` | 22 |
| `EMPLOYEE` | 3 |
| `MAKER` | 2 (`TenantManagement.Business.Read`, `TenantManagement.Dashboard.Read`) |
| `CHECKER` | 2 (`TenantManagement.Business.Read`, `AuditActivityLogging.AuditLog.Read`) |
| `PLATFORM_ADMIN` | 8 |

MAKER/CHECKER intentionally minimal in R1 — workflow permissions (`APPROVE`/`REJECT` on operational resources) attach when BP-016 ships.

---

## 5. Seed Execution Order

### 5.1 Dependency graph

```
permission_action  (no dependencies — already seeded)
        │
        ▼
   permission        (FK → permission_action)
        │
        ├──────────────────┐
        ▼                  ▼
      role            (no FK to permission)
   (Platform Roles)        │
        │                  │
        └────────┬─────────┘
                 ▼
          role_permission   (FK → role, permission)
```

### 5.2 Execution sequence

| Step | Entity | Notes |
|------|--------|-------|
| **1** | `permission_action` | Idempotent upsert by `code`. **Already exists** in `seeds/permission-actions.ts` — verify 13 actions before proceeding. |
| **2** | `permission` | Insert 42 R1 permissions. Resolve `permissionActionId` by action `code` at seed runtime. Upsert by `code` (or `(module, resource, permissionActionId)`). |
| **3** | `role` | Insert 6 Platform Roles. Upsert by `code` WHERE `businessId IS NULL`. Set `isSystem = true`. |
| **4** | `role_permission` | Insert ~79 mapping rows. Upsert by `(roleId, permissionId)`. Set `grantedBy = NULL` for bootstrap seed. |

### 5.3 Idempotency requirements

Each seed step must be **safe to re-run**:

- Use `code`-based lookup before insert
- Skip or update on conflict — never duplicate
- Log counts: inserted / skipped / updated
- Run inside a transaction per step

### 5.4 Pre-seed validation checklist

| Check | Validates |
|-------|-----------|
| All 13 action codes exist | Permission FK integrity |
| No duplicate `(module, resource, action)` combinations | Composite unique constraint |
| All permission codes ≤ 150 chars | Schema limit |
| All role codes unique where `businessId IS NULL` | Partial unique index |
| Matrix references only defined permissions | Referential completeness |
| PLATFORM_ADMIN lacks tenant ConfigurationManagement/Authentication write permissions | Least privilege / BP-001 §51 |

---

## 6. Future Business Roles

### 6.1 How tenants create custom roles

```
Business Owner
      │
      ▼
IAM Service: Create Business Role
  • role.businessId = current tenant
  • role.isSystem = false
  • role.code = tenant-chosen (e.g. CASHIER)
      │
      ▼
IAM Service: Grant permissions from catalog
  • INSERT role_permission rows
  • permissionId → global permission catalog only
  • Application validates caller holds RolePermissionManagement.RolePermission.Assign
  • Application blocks mutation of Platform Role mappings
      │
      ▼
IAM Service: Assign to users
  • INSERT user_role rows
  • Application validates role.businessId = membership.businessId
```

### 6.2 Rules for Business Role permission composition

| Rule | Enforcement |
|------|-------------|
| Permissions are read-only for tenants | Tenants SELECT from `permission`; never INSERT |
| Subset only | Business Roles grant ≤ platform catalog; no privilege escalation beyond catalog |
| No cross-tenant roles | `user_role` assignment validates `role.businessId = membership.businessId` OR `role.businessId IS NULL` |
| Platform role mappings immutable by tenants | Application layer blocks `role_permission` changes where `role.businessId IS NULL` |
| Unique role codes per tenant | Partial unique index on `(businessId, code)` |
| Audit trail | `role_permission.grantedBy` populated for tenant grants; `user_role.assignedBy` populated for assignments |

### 6.3 Example: tenant creates `CASHIER` role (Release 2+)

After BP-005/006 permissions exist in the catalog:

```
Business Role: CASHIER (businessId = tenant-uuid, isSystem = false)

Granted permissions (selected by owner):
  SalesOrders.SalesOrder.Create
  SalesOrders.SalesOrder.Read
  Finance.Payment.Create
  Finance.Receipt.Read
  ProductManagement.Product.Read
  CustomerManagement.Customer.Read
  TenantManagement.Dashboard.Read
```

The tenant **reuses** seeded permission codes — no new codes created. If a needed permission does not exist yet, the build pack that introduces the capability must seed it first.

### 6.4 Industry template role presets (future)

Industry templates (BP-001 §45) may recommend **Business Role presets** — not new platform roles:

| Template | Suggested Business Roles |
|----------|-------------------------|
| Retail Shop | `CASHIER`, `STOCK_CLERK` |
| Restaurant | `WAITER`, `KITCHEN_STAFF` |
| Pharmacy | `PHARMACIST`, `DISPENSING_CLERK` |

Presets are created as Business Roles during business activation, copying recommended permission sets from template configuration — still referencing the global catalog.

---

## 7. Design Decisions Requiring Confirmation

| # | Decision | Recommendation | Alternative |
|---|----------|----------------|-------------|
| D-7.1 | Are BP-001 default roles Platform Roles? | **Yes** — `BUSINESS_OWNER`, `SUPERVISOR`, `EMPLOYEE`, `MAKER`, `CHECKER` seeded as Platform Roles | Duplicate as Business Roles per tenant (rejected — violates ADR-005 intent) |
| D-7.2 | MAKER/CHECKER minimal R1 permissions | **Yes** — 2 permissions each until Workflow Engine | Pre-grant APPROVE/REJECT with no resources (premature) |
| D-7.3 | `TenantManagement.Business.Create` permission | **Include** — authorization boundary even if registration endpoint is partially public | Omit and handle outside RBAC |
| D-7.4 | Separate `Authentication.UserCredential.Execute` vs reusing `UserManagement.User.Execute` | **Separate resource** — clearer audit trail for PIN reset | Single `UserManagement.User.Execute` |
| D-7.5 | Permission action additions | **None** | Add `RESET` action |

---

## 8. Alignment Summary

| Source | Alignment |
|--------|-----------|
| ADR-005 Hybrid Role Model | Platform vs Business role distinction preserved; permissions global |
| ADR-006 Tenant Isolation | Application-layer enforcement documented for assignment and platform role protection |
| BP-001 §20–22, §51 | Six platform roles cover Owner, Supervisor, Employee, Maker, Checker, System Admin |
| BP-001 APIs (API-001–010) | All endpoints mapped to specific permissions |
| Document 09 §4.3–4.5 | PIN reset, role assignment, owner management mapped |
| ADR-008 Platform Permission Catalog | `{Capability}.{Resource}.{Action}` naming; capabilities sourced from Document 02 |
| Frozen schema (`permission.ts`, `role.ts`, etc.) | Design uses existing columns; no schema changes required |

---

**Deliverable status:** Design complete. Awaiting approval before seed file generation (next deliverable).

If you want adjustments before approval, the highest-impact decisions are **D-7.1** (platform vs tenant default roles), **SUPERVISOR's IAM assignment boundaries**, and whether **MAKER/CHECKER** should receive any R1 permissions at all versus being role shells until the Workflow Engine ships.

FINAL VERDICT & RATIONALE

Documentation Pack
ADR-008 – Platform Permission Catalog
Decision

Permissions shall follow the convention:

{Capability}.{Resource}.{Action}

where:

Capability maps directly to the Platform Module Catalog (Document 02).
Resource identifies the business entity (PascalCase, singular).
Action references the Platform Permission Action catalog (PascalCase; e.g. Read, Create, Approve).

Business Roles shall never create new permissions.

They only combine existing Platform Permissions.

Rationale
Aligns authorization with enterprise architecture.
Supports future industry solutions.
Eliminates duplicate permissions.
Simplifies external IAM integration.
Makes permission ownership clear.
One additional improvement before coding

I recommend we add permission codes as constants (or an enum-like structure) later in the application layer rather than scattering string literals throughout the codebase. That way, services reference `PermissionCodes.CRM.Customer.Read` instead of typing raw strings, reducing errors and making refactoring easier.


ADR-010 – Permission Constants
Decision

Application code shall never reference permission strings directly.

Instead:

PermissionCodes.TenantManagement.Business.Read

shall be used throughout the platform.

Rationale
Compile-time safety
Easier refactoring
Prevents spelling errors
Improves discoverability
Better IDE auto-completion
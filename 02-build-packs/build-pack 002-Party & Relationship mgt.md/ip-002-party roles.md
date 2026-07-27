I think IP-002 should remain narrowly focused, just as we did with BP-001. Since IP-001 established the **Party Foundation**, IP-002 should establish the **Party Roles** capability and nothing else.

---

# BP-002 – IP-002: Party Roles

## Objective

Implement configurable **Party Role Management**, enabling a single Party to perform one or more business roles simultaneously without creating duplicate Party records.

Examples:

* Customer
* Supplier
* Farmer
* Parent
* Student
* Patient
* Tenant
* Landlord
* Beneficiary
* Employee
* Donor
* Partner
* Contractor
* Prospect

---

# Scope

Implement only:

## Database

Create:

* `party_role`
* `role_type` (reference catalogue)

A Party:

* may have zero roles initially
* may have many active roles
* may have historical roles

Fields include:

* Party
* Role Type
* Effective Date
* End Date
* Status
* Is Primary Role

---

## Services

Create:

* PartyRoleService

Functions:

* Assign Role
* Remove Role
* End Role
* Reactivate Role
* Change Primary Role
* Get Party Roles

---

## Repository

Create:

* PartyRoleRepository

Persistence only.

---

## Server Actions

Implement:

* Assign Role
* Remove Role
* Update Role
* List Roles

---

## UI

### Party Workspace

Make **Roles** the first functional tab.

The user should be able to:

* View assigned roles
* Assign a role
* Remove a role
* Set primary role
* View role history

---

### Role Assignment

Show:

Current Roles

```
✓ Customer
✓ Supplier
✓ Farmer
```

Below:

Assign New Role

Dropdown

```
Customer
Supplier
Farmer
Parent
Student
...
```

Button

```
Assign Role
```

---

## Dashboard

Add widget

```
Roles
```

Example

```
Customers     210

Suppliers      56

Farmers       800

Students      350

Patients      420
```

---

# Business Rules

Implement:

* A Party may hold multiple roles simultaneously.
* Duplicate active roles are not permitted.
* One role may be designated as the Primary Role.
* Roles may have Effective and End Dates.
* Historical roles are retained (no physical deletion).
* Role Types come from configurable reference data.

---

# Excluded

Do **NOT** implement:

* Contacts
* Addresses
* Branches
* Relationships
* Documents
* Groups
* Timeline
* Communication Preferences
* Duplicate Detection
* Merge
* Search

These belong to later IPs.

---

# Smoke Tests

Read-only only.

No:

* Seed
* Insert
* Update
* Delete
* Repair

Validate:

* Role assignment
* Duplicate prevention
* Primary role
* Historical role handling
* Multiple concurrent roles

---

# Quality Gates

Must pass:

* `npm run typecheck`
* `npm run lint`
* `npm run build`
* BP-002 IP-002 smoke tests

---

# Deliverables

At completion provide:

1. Files Created
2. Files Modified
3. Database entities
4. Architecture compliance
5. Smoke test results
6. Typecheck
7. ESLint
8. Production build
9. Remaining manual verification

---

# Stop Condition

* Stop after IP-002.
* Do not proceed to IP-003 (Contacts).
* Do not perform any Git operations.

---

One additional recommendation: before Cursor starts IP-002, ask it to **reuse the Party Workspace created in IP-001** rather than creating a new Roles page. The Roles tab should simply become the **second functional tab** after Overview. This keeps the "one pane of glass" UX philosophy intact and avoids duplicate screens as BP-002 grows.

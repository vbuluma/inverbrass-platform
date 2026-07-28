# BP-002 – IP-005: Organization Structure Engine (ENG-003c)

## Purpose

Provide a reusable **Organization Structure Engine** that allows Organization Parties to create, maintain, activate, deactivate, and hierarchically organize **Organizational Units** from a single Organization record.

This refactoring generalizes the former Branch model into a platform capability consumed by future Build Packs via `organizational_unit_id`.

Every Organizational Unit must be **locatable**. Physical address is a first-class concern — users, regulators, logistics, field teams, and future modules (inventory, assets, HR, healthcare) need to know **where** a unit operates, not just its name and type.

## Scope

- Organizational Unit Type catalogue (`organizational_unit_type`)
- Organizational Units (`organizational_unit`)
- **Physical address linkage** via `party_address_id` (EDS-009 / IP-004)
- Supplementary location fields (`country_code`, GPS coordinates)
- Head Office designation (explicit user action — no automatic reassignment)
- Hierarchical parent/child structure
- Organization Structure tab in Party Workspace
- Multiple creation entry points (Dashboard, Overview, Structure tab, empty state)

**Excluded:** Employees, inventory, financials, workflows, Party Relationships (IP-006), geocoding, maps integration, address verification APIs.

---

## Database

### `organizational_unit_type`

Configurable catalogue: Head Office, Department, Regional Office, Branch, Division, Business Unit, Store, Warehouse, Distribution Centre, Factory, Campus, Clinic, Service Centre, Call Centre, Project Office, Collection Centre, etc.

### `organizational_unit`

| Field | Description |
|-------|-------------|
| organization_party_id | Owning Organization Party |
| parent_organizational_unit_id | Optional parent unit |
| unit_code | Unique within organization |
| unit_name | Display name |
| organizational_unit_type_code | Type from catalogue |
| is_head_office | Boolean |
| phone | E.164 (EDS-003) |
| email | Optional |
| **party_address_id** | **Optional FK → `party_address.id` — primary physical location (EDS-009)** |
| **country_code** | **Optional ISO-3166 alpha-2; used when no linked address or as quick country hint** |
| **latitude / longitude** | **Optional GPS coordinates (decimal degrees)** |
| status_code | ACTIVE / INACTIVE |
| opening_date / closing_date | Optional |
| notes | Optional |

Enterprise Base Entity: tenant isolation, audit, version, soft delete.

**Do not** duplicate address line fields on `organizational_unit`. All structured address data lives on `party_address` (IP-004). The unit stores only a reference plus optional GPS/country shortcuts for display and future map services.

---

## Physical Address (EDS-009)

### Why it matters

Organizational Units represent real-world operating locations — branches, stores, clinics, warehouses. Without a physical address:

- Users cannot locate the unit on maps or in reports
- Delivery, field service, and asset modules cannot resolve location
- Regulatory filings (licences, tax offices) lack required premises data
- Head Office vs regional office distinction is incomplete

Physical address is therefore **strongly recommended at creation** and **required for active units that represent a physical premises** (Branch, Store, Warehouse, Factory, Clinic, Campus, etc.). Virtual units (Department, Division, Call Centre without premises) may omit address.

### Integration with IP-004

Each Organizational Unit links to the **owning Organization Party's** address book:

1. **Select existing address** — user picks from active Organization Party addresses filtered to location-suitable types:
   - `PHYSICAL`
   - `BRANCH`
   - `OFFICE`
   - `HEAD_OFFICE`
2. **Add address from unit form** — creates a new `party_address` row on the Organization Party (type defaults to `BRANCH` or `PHYSICAL`) and links it via `party_address_id`.
3. **Manage full address later** — user edits structured fields on the Party **Addresses** tab; the unit continues to reference the same `party_address_id`.

Address labels in the UI are formatted from EDS-009 fields: address lines, city, county/state, country (see `party_address` in IP-004).

### Supplementary location fields

| Field | Use |
|-------|-----|
| `country_code` | Quick filter/display when address not yet linked; must match linked address country when both present |
| `latitude` / `longitude` | Optional GPS pin; may copy from linked `party_address` GPS or be entered independently for fine-grained map placement |

**Do not implement** geocoding, Google Maps, or routing in this IP — GPS and country are stored only.

### Location display

The Organization Structure tree and detail views show a computed **Location** column:

```
{party_address_label} · {country_code} · {latitude}, {longitude}
```

Omit empty segments. Show `—` when no location data exists.

---

## Business Rules

### Structure

- Only Organization Parties may own Organizational Units
- Unlimited units and unlimited child units per organization
- Parent must belong to same organization; self-parenting prohibited
- Unit codes unique within organization
- Exactly one active Head Office; changing requires explicit removal first
- Phone: EDS-003; Address: EDS-009; optional GPS

### Physical address

- `party_address_id`, when set, must reference an **active** `party_address` belonging to the **same Organization Party**
- Allowed address types for unit linkage: `PHYSICAL`, `BRANCH`, `OFFICE`, `HEAD_OFFICE`
- Deactivating or soft-deleting a linked address does **not** auto-clear the unit reference — UI warns user; service blocks activation of units with inactive linked addresses
- Multiple units **may** share the same `party_address_id` (e.g. co-located departments)
- When `party_address_id` is set, `country_code` on the unit should align with the address `country_code` (service normalizes or validates)
- GPS on the unit is optional; if both unit and linked address have GPS, unit-level GPS takes precedence for display
- Head Office units should prefer address type `HEAD_OFFICE` or `PHYSICAL` when address is provided

Business rules belong only in Services.

---

## Party Workspace

Tab: **Organization Structure** (formerly Branches)

### List / tree display

| Column | Description |
|--------|-------------|
| Unit Code | Unique code |
| Name | Display name |
| Type | From catalogue |
| Parent | Parent unit name |
| Head Office | Badge when `is_head_office` |
| Status | ACTIVE / INACTIVE |
| **Location** | **Formatted physical address + country + GPS** |

View: Collapsible hierarchical tree (not a graphical org chart).

### Add / Edit form — location section

**Physical Address** (optional, recommended for premises-based units):

Mode selector with three options:

| Mode | Behaviour |
|------|-----------|
| **None** | No physical address linked |
| **Select existing** | Dropdown of active Organization Party addresses filtered to `PHYSICAL`, `BRANCH`, `OFFICE`, `HEAD_OFFICE` |
| **Capture new** | Inline EDS-009 fields (country, address line 1, city, county/state, optional GPS) — creates `party_address` on the Organization Party and links via `party_address_id` |

When capturing new, address type defaults to `BRANCH` or `PHYSICAL` based on unit type. Full structured editing remains on the Party **Addresses** tab.

Do **not** expose a generic "party address" dropdown without the mode selector — users must explicitly choose existing vs new physical address.

### Actions

Add, Edit, View, Set Head Office, Remove Head Office, Activate, Deactivate, Remove

View detail shows full linked address breakdown (type, lines, city, county, country, GPS).

---

## Validation

- Unit code, name, type: required
- Phone: EDS-003 when provided
- Email: valid format when provided
- `party_address_id`: must exist, belong to organization party, be active, allowed type
- `country_code`: valid ISO-3166 alpha-2 when provided
- GPS: valid decimal ranges when provided
- No maps or geocoding integration

---

## Architecture

Maintain strict separation:

```text
UI → Server Actions → OrganizationalUnitService → OrganizationalUnitRepository → Drizzle → PostgreSQL
```

Address creation/reuse delegates to `PartyAddressService` — no address business logic in Organizational Unit repository.

Module path: `03-platform/src/modules/party/` — services, repositories, actions, validators, UI components.

Migration `0017_organization_structure_engine.sql` renames legacy branch tables and adds location fields.

---

## Future Compatibility

Future Build Packs reference `organizational_unit_id` — not `branch_id`.

Subsidiaries remain Party Relationships (IP-006); Organizational Units are internal to one Organization.

Future map/geocoding services read `party_address_id` + GPS without schema changes.

---

## Enterprise Standards

- **EDS-001** — Enterprise Base Entity (tenant, audit, version, soft delete)
- **EDS-003** — Phone Numbers
- **EDS-009** — Address Standardization (via `party_address`)

---

## Quality Gates

Before stopping:

- Smoke tests
- Typecheck
- ESLint
- Production build

All must pass.

---

## Return

1. Files Created
2. Files Modified
3. Database Entities
4. Business Rules Implemented
5. Architecture Compliance
6. Smoke Test Results
7. Typecheck Results
8. ESLint Results
9. Production Build Results
10. Remaining Manual Verification

Await approval before proceeding to IP-007 (Party Documents).

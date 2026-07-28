# BP-002 – IP-005: Organization Structure Engine (ENG-003c)

## Purpose

Provide a reusable **Organization Structure Engine** that allows Organization Parties to create, maintain, activate, deactivate, and hierarchically organize **Organizational Units** from a single Organization record.

This refactoring generalizes the former Branch model into a platform capability consumed by future Build Packs via `organizational_unit_id`.

## Scope

- Organizational Unit Type catalogue (`organizational_unit_type`)
- Organizational Units (`organizational_unit`)
- Head Office designation (explicit user action — no automatic reassignment)
- Hierarchical parent/child structure
- Organization Structure tab in Party Workspace
- Multiple creation entry points (Dashboard, Overview, Structure tab, empty state)

**Excluded:** Employees, inventory, financials, workflows, Party Relationships (IP-006).

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
| party_address_id | Optional link to party address (EDS-009) |
| country_code | Optional |
| latitude / longitude | Optional GPS |
| status_code | ACTIVE / INACTIVE |
| opening_date / closing_date | Optional |
| notes | Optional |

Enterprise Base Entity: tenant isolation, audit, version, soft delete.

## Business Rules

- Only Organization Parties may own Organizational Units
- Unlimited units and unlimited child units per organization
- Parent must belong to same organization; self-parenting prohibited
- Unit codes unique within organization
- Exactly one active Head Office; changing requires explicit removal first
- Phone: EDS-003; Address: EDS-009; optional GPS

## Party Workspace

Tab: **Organization Structure** (formerly Branches)

Display: Unit Code, Name, Type, Parent, Head Office, Status, Location

Actions: Add, Edit, View, Set Head Office, Remove Head Office, Activate, Deactivate, Remove

View: Collapsible hierarchical tree (not a graphical org chart).

## Future Compatibility

Future Build Packs reference `organizational_unit_id` — not `branch_id`.

Subsidiaries remain Party Relationships (IP-006); Organizational Units are internal to one Organization.

## Implementation

Migration `0017_organization_structure_engine.sql` renames legacy branch tables and adds location fields.

Module path: `03-platform/src/modules/party/` — services, repositories, actions, validators, UI components.

Implement BP-002 IP-011 — Enterprise Audit History.

IMPORTANT

This is NOT the Timeline.

Timeline records business events.

Audit History records immutable system changes.

Both must coexist.

==================================================
OBJECTIVE
==================================================

Create an Enterprise Audit capability for all Party entities.

The Audit History must record

WHO

changed

WHAT

WHEN

FROM

TO

HOW

Future Build Packs must reuse this capability.

==================================================
DATABASE
==================================================

Create

audit_history

Fields

Audit ID

Business ID

Entity Name

Entity ID

Operation

CREATE

UPDATE

DELETE (Soft Delete)

RESTORE

VERIFY

ACTIVATE

DEACTIVATE

ARCHIVE

Field Name

Old Value

New Value

Changed By

Changed DateTime

Source Module

Correlation ID

Request ID

IP Address

Browser / Client

Device

System Generated

Metadata (JSON)

Audit

Retention Flag

==================================================
BUSINESS RULES
==================================================

Audit records are append-only.

Never update.

Never delete.

Never edit.

Every successful transaction records audit entries.

Repositories do NOT create audit entries.

Services create audit entries.

Audit failure must NOT roll back business transactions.

==================================================
SCOPE
==================================================

Audit

Party

Roles

Contacts

Addresses

Relationships

Organization Structure

Documents

Groups

Timeline

Future modules reuse the same capability.

==================================================
UI
==================================================

New Party Workspace tab

Audit History

Display

Date

User

Operation

Entity

Field

Old Value

New Value

Module

Support

Search

Date filters

User filters

Entity filters

Operation filters

Pagination

View Details

==================================================
DETAIL VIEW
==================================================

Display

Who

When

Operation

Fields Changed

Old Values

New Values

Metadata

==================================================
ARCHITECTURE
==================================================

Business Service

↓

Audit Service

↓

Audit Repository

↓

Database

Reusable Platform capability.

Future modules call

AuditService.record()

No duplicated implementations.

==================================================
DO NOT IMPLEMENT
==================================================

No rollback.

No analytics.

No AI.

No notifications.

No reports.

Those belong to future Build Packs.

==================================================
QUALITY
==================================================

Maintain

Typecheck PASS

ESLint PASS

Production Build PASS

Smoke PASS

==================================================
HANDOVER
==================================================

Stop after IP-011.

Do NOT begin another IP.

Provide

1. Files Created

2. Files Modified

3. Database Entities

4. Audit Operations Supported

5. Business Rules

6. Architecture Compliance

7. Manual Verification

8. Quality Gates

9. Future Platform Reuse

Explain how future Build Packs will use the same Audit Service without implementing separate audit logic.

IMPLEMENTED

BP-002 IP-011 — Enterprise Audit History (Complete)
Enterprise Audit History is implemented as a reusable platform capability. It coexists with Party Timeline — Timeline records business events; Audit History records immutable system changes.

1. Files Created
File	Purpose
03-platform/src/db/schema/audit-history.ts
Drizzle schema for audit_history
03-platform/drizzle/0023_bp002_ip011_audit_history.sql
Migration
03-platform/src/core/audit/constants.ts
Operations, entities, source modules
03-platform/src/core/audit/helpers.ts
buildAuditRecordFromContext, field diff helpers
03-platform/src/core/audit/repositories/audit-history-repository.ts
Append-only persistence
03-platform/src/core/audit/services/audit-service.ts
record(), listByPartyId(), getEntryDetail()
03-platform/src/modules/party/services/party-audit-helper.ts
Party-scoped recordPartyEntityAudit()
03-platform/src/modules/party/services/party-audit-query-service.ts
Party Workspace query layer
03-platform/src/modules/party/validators/party-audit-validators.ts
Filter validation
03-platform/src/modules/party/actions/party-audit-actions.ts
Server actions
03-platform/src/modules/party/components/party-audit-history-panel.tsx
Audit History tab UI
03-platform/scripts/bp002-ip011-audit-history-smoke-validation.ts
Smoke validation
2. Files Modified
File	Change
src/db/schema/index.ts
Export auditHistory
drizzle/meta/_journal.json
Migration journal entry
src/core/audit/types.ts
Extended with audit history types (auth types preserved)
src/core/audit/index.ts
Public exports for AuditService
src/modules/party/constants.ts
Audit History tab available: true
src/modules/party/types.ts
PartyAuditHistoryPanelView types
src/modules/party/components/party-workspace.tsx
Audit History tab wiring
src/app/(authenticated)/(app)/parties/[partyId]/page.tsx
Load audit panel data
Party services (all mutation paths):
party-service, individual-profile-service, organization-profile-service, party-role-service, party-contact-service, party-address-service, organizational-unit-service, party-relationship-service, party-document-service, party-group-service
3. Database Entity
Table: audit_history (append-only — no updated_at, deleted_at, or update/delete paths)

Column	Description
id
Audit ID
business_id
Business ID
party_id
Party scope (for workspace queries)
entity_name
Entity name
entity_id
Entity ID
operation
CREATE / UPDATE / DELETE / etc.
field_name
Changed field
old_value / new_value
FROM → TO
changed_by
WHO
changed_date_time
WHEN
source_module
HOW (module)
correlation_id
Groups multi-field changes
request_id
Request trace
ip_address / browser_client / device
Client context
system_generated
System vs user
metadata
JSON metadata
retention_flag
Future retention policy
created_at
Insert timestamp
4. Audit Operations Supported
CREATE, UPDATE, DELETE, RESTORE, VERIFY, ACTIVATE, DEACTIVATE, ARCHIVE

5. Business Rules
Append-only — repository has insert only; no update/delete methods
Services create audit entries — repositories never audit
Audit failure never rolls back — AuditService.record() swallows errors and logs them
Every successful Party mutation records audit entries alongside existing Timeline events
Timeline and Audit coexist — separate tables, separate UI tabs, separate purposes
6. Architecture Compliance
Business Service (Party modules)
        ↓
AuditService.record()          ← reusable platform capability
        ↓
AuditHistoryRepository         ← insert-only
        ↓
audit_history (PostgreSQL)
Party UI reads via:

PartyAuditHistoryPanel → party-audit-actions → PartyAuditQueryService → AuditService
7. Manual Verification
Run migration: npm run db:migrate
Open a Party Workspace → Audit History tab
Perform mutations (update overview, assign role, add contact, etc.)
Confirm audit rows appear with Date, User, Operation, Entity, Field, Old/New values, Module
Click Details on a row — verify Who, When, Operation, Fields Changed, Metadata
Test filters: operation, entity, user, date range, search, pagination
8. Quality Gates
Gate	Result
Typecheck
PASS
ESLint
PASS
Production Build
PASS
Smoke (27/27)
PASS
npx tsx scripts/bp002-ip011-audit-history-smoke-validation.ts
9. Future Platform Reuse
Future Build Packs call the same AuditService — no separate audit logic:

import {
  createAuditService,
  buildAuditRecordFromContext,
  AUDIT_OPERATIONS,
  AUDIT_ENTITY_NAMES,
  AUDIT_SOURCE_MODULES,
} from "@/core/audit";
// In any module service, after a successful transaction:
await this.auditService.record(
  buildAuditRecordFromContext(context, {
    partyId: optionalPartyId,           // when party-scoped
    entityName: AUDIT_ENTITY_NAMES.PARTY, // or a new entity constant
    entityId: entityId,
    operation: AUDIT_OPERATIONS.UPDATE,
    sourceModule: AUDIT_SOURCE_MODULES.PARTY_MANAGEMENT, // or new module constant
    changes: [
      { fieldName: "status", oldValue: "DRAFT", newValue: "ACTIVE" },
    ],
    metadata: { /* optional context */ },
  })
);
Pattern for Party modules: use recordPartyEntityAudit() from party-audit-helper.ts with createValues, before/after, or explicit changes.

Key guarantees for reuse:

One AuditService in src/core/audit/
One audit_history table for all modules
Non-throwing record() — safe to call after every successful mutation
correlationId auto-groups multi-field changes from one transaction
Add new AUDIT_ENTITY_NAMES / AUDIT_SOURCE_MODULES constants as new domains onboard
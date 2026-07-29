Implement BP-002 IP-010 — Party Timeline & Activity History.

IMPORTANT

This is NOT an audit log.

This is NOT workflow history.

This is the Party Timeline.

The Timeline becomes the single chronological history of everything important that has happened to a Party.

Future Build Packs must contribute events to the same timeline.

====================================================
OBJECTIVE
====================================================

Create a reusable Party Timeline capability.

Every important event concerning a Party should appear in one chronological timeline.

Examples

Party Created

Role Assigned

Role Removed

Contact Added

Contact Updated

Address Added

Address Changed

Relationship Created

Organization Unit Assigned

Document Uploaded

Document Verified

Document Expired

Group Joined

Group Left

Status Activated

Status Suspended

Status Archived

Future Build Packs will add events such as

Invoice Created

Sale Completed

Appointment Booked

Property Assigned

Loan Approved

Insurance Policy Issued

Inspection Completed

Complaint Logged

Training Completed

etc.

====================================================
DATABASE
====================================================

Create

party_timeline

Fields

Timeline ID

Business ID

Party ID

Event DateTime

Event Type

Event Category

Source Module

Reference Entity

Reference ID

Summary

Description

Performed By

Visibility

System Generated

Metadata (JSON)

Audit

Soft Delete

====================================================
EVENT TYPES
====================================================

Examples

PARTY_CREATED

ROLE_ASSIGNED

ROLE_REMOVED

CONTACT_CREATED

CONTACT_UPDATED

ADDRESS_CREATED

DOCUMENT_UPLOADED

DOCUMENT_VERIFIED

DOCUMENT_EXPIRED

GROUP_JOINED

GROUP_LEFT

STATUS_CHANGED

RELATIONSHIP_CREATED

ORGANIZATION_UNIT_CREATED

etc.

Do NOT hardcode.

Use configurable event codes where appropriate.

====================================================
EVENT CATEGORIES
====================================================

Registration

Compliance

Communication

Relationship

Organization

Documents

Groups

Lifecycle

Operations

Future Build Packs may introduce additional categories.

====================================================
UI
====================================================

New Party Workspace tab

Party Timeline & Activity History

Display

Chronological activity feed

Newest first

Each item shows

Date & Time

Event

Category

Summary

Performed By

Source Module

Optional View Details

Support

Filter

Category

Date Range

Source Module

Search

Infinite scrolling or paging

====================================================
TIMELINE CARD
====================================================

Example

--------------------------------------------------

12 Aug 2026 10:45

Documents

National ID verified

Performed by

Compliance Officer

Module

Party Management

--------------------------------------------------

====================================================
BUSINESS RULES
====================================================

Timeline is append-only.

Never edit history.

No physical deletes.

Events generated automatically from Services.

Repositories never create timeline events.

Services publish timeline events after successful transactions.

Timeline failures must not roll back business transactions.

====================================================
ARCHITECTURE
====================================================

Business Service

↓

Timeline Service

↓

Timeline Repository

↓

Database

Timeline recording must be reusable.

Future modules simply call

TimelineService.recordEvent()

Do NOT duplicate timeline logic.

====================================================
DO NOT IMPLEMENT
====================================================

No notifications.

No workflow.

No AI.

No analytics.

No dashboards.

Those belong to future Build Packs.

====================================================
QUALITY
====================================================

Maintain

Typecheck PASS

ESLint PASS

Production Build PASS

Smoke PASS

====================================================
HANDOVER
====================================================

Stop after IP-010.

Do NOT continue to another IP.

Provide

1. Files Created

2. Files Modified

3. Database Entities

4. Event Types

5. Business Rules

6. Architecture Compliance

7. Manual Verification

8. Quality Gates

9. Future Integration

Explain how future Build Packs (Property, CRM, HR, Healthcare, Agriculture, Finance, Projects, Fleet, etc.) will contribute events into the same Party Timeline without changing BP-002.

====================================================
REASON FOR CHANGE
====================================================

Why IP-010 was introduced

Party activity was previously scattered across separate workspace tabs (Roles, Contacts, Documents, Groups, etc.) with no single chronological view of what has happened to a Party. Operators had no unified place to answer: "What has happened to this party?"

What this change delivers

- A reusable Party Timeline & Activity History capability — one append-only feed per Party, newest first.
- Automatic event recording from all BP-002 party services after successful business transactions.
- A dedicated Party Workspace tab labelled "Party Timeline & Activity History" (not "Timeline" alone) to distinguish this from audit logs, workflow history, or future generic timeline engines.
- A core platform module (`PartyTimelineService.recordEvent()`) so future Build Packs (Property, CRM, Finance, HR, etc.) can contribute events without modifying BP-002.

What this is NOT

- Not an audit log (immutable system audit trail — separate future capability).
- Not workflow history (process/step tracking — separate future capability).
- Not notifications, analytics, or dashboards (deferred to future Build Packs).

Key design constraints

- Timeline is append-only — history is never edited or physically deleted.
- Services publish events; repositories do not.
- Timeline recording failures must not roll back business transactions.

Implementation status

- Database: `party_timeline` table — migration `0022_bp002_ip010_party_timeline` applied.
- Core engine: `src/core/party-timeline/` — `PartyTimelineService.recordEvent()`.
- UI: Party Workspace tab id `timeline`, label "Party Timeline & Activity History".
- Quality gates: Typecheck, ESLint, Production Build, and Smoke validation — PASS.

One architectural recommendation

I would go one step further and make the Timeline a Core Platform capability from the beginning.

Rather than being "Party Timeline", think of it as:

Timeline Engine
        │
        ├── Party Timeline
        ├── Property Timeline
        ├── Customer Timeline
        ├── Employee Timeline
        ├── Project Timeline
        ├── Asset Timeline
        └── Loan Timeline
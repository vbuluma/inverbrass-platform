Implement BP-002 IP-012 — Party Communication & Consent Preferences.

IMPORTANT

This is NOT a notification engine.

This is NOT messaging.

This defines HOW a Party wishes to be contacted and what communications they have consented to receive.

Future Build Packs must respect these preferences before sending any communication.

==================================================
OBJECTIVE
==================================================

Create a reusable Communication & Consent capability for every Party.

The Party Workspace shall include a new tab:

Communication & Consent Preferences

The platform stores communication channels, preferred contact methods, notification preferences, language preferences, quiet hours, and regulatory consents.

==================================================
DATABASE
==================================================

Create

party_communication_preference

Fields

Preference ID

Business ID

Party ID

Preferred Language

Preferred Time Zone

Preferred Contact Method

Preferred Contact Time

Quiet Hours Start

Quiet Hours End

Marketing Consent

Transactional Consent

Promotional Consent

SMS Enabled

Email Enabled

WhatsApp Enabled

Phone Enabled

Push Notification Enabled

Postal Mail Enabled

Consent Date

Consent Source

Consent Version

Notes

Status

Audit

Soft Delete

==================================================
BUSINESS RULES
==================================================

Every Party has one active communication preference profile.

Preferences are editable.

Consent changes are recorded.

Quiet hours cannot overlap invalid ranges.

Preferred contact method must be enabled.

Marketing communications require Marketing Consent.

Transactional communications ignore Marketing Consent but respect enabled channels.

If Email is disabled, no email campaigns may be sent.

If SMS disabled, no SMS campaigns.

Future notification engines must read these preferences before sending.

==================================================
UI
==================================================

Party Workspace

Communication & Consent Preferences tab

Sections

--------------------------------------------------

Communication Channels

Email

SMS

WhatsApp

Phone

Push

Postal

--------------------------------------------------

Preferred Contact

Preferred Method

Preferred Language

Preferred Time Zone

Preferred Contact Time

Quiet Hours

--------------------------------------------------

Consent

Marketing

Promotions

Transactional

Consent Date

Consent Source

--------------------------------------------------

Save

Reset

==================================================
ARCHITECTURE
==================================================

UI

↓

Server Actions

↓

CommunicationPreferenceService

↓

Repository

↓

Drizzle

↓

PostgreSQL

No notification logic.

No email logic.

No SMS logic.

Only preference management.

==================================================
INTEGRATION
==================================================

Future modules MUST consume this capability.

CRM

Marketing

Collections

Loan reminders

Insurance renewal

Appointment reminders

Property inspection reminders

School notifications

Healthcare reminders

Workflow notifications

Notification Engine

The Notification Engine decides

WHAT

to send.

Communication & Consent Preferences decide

IF

and

HOW

it may be sent.

==================================================
DO NOT IMPLEMENT
==================================================

No email sending.

No SMS sending.

No WhatsApp integration.

No notification scheduling.

No campaigns.

Those belong to later Build Packs.

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

Stop after IP-012.

Do NOT continue into another Build Pack.

Provide

1. Files Created

2. Files Modified

3. Database Entity

4. Business Rules

5. UI

6. Architecture Compliance

7. Manual Verification

8. Quality Gates

9. Future Platform Integration

Explain how CRM, Notification Engine, Marketing, Workflow, Finance, Healthcare, Property, Education and other Build Packs will consume Communication & Consent Preferences instead of maintaining their own notification settings.


IMPLEENTED BY CURSOR-29/7/26
IP-012 implemented
BP-002 IP-012 — Party Communication & Consent Preferences is implemented end-to-end.

Files created
Layer	Files
Database
src/db/schema/party-communication-preference.ts, drizzle/0024_bp002_ip012_party_communication_preference.sql
Core
src/core/communication-preference/ (constants, types, rules, repository, service, index)
Party module
party-communication-preference-service.ts, validators, actions, panel component
Validation
scripts/bp002-ip012-communication-preference-smoke-validation.ts
Files modified
src/db/schema/index.ts, drizzle/meta/_journal.json
src/core/audit/constants.ts (entity + source module)
src/modules/party/constants.ts — tab label Communication & Consent Preferences, available: true
src/modules/party/types.ts, party-workspace.tsx, parties/[partyId]/page.tsx
src/modules/party/repositories/party-reference-repository.ts — listActiveTimezones()
ip-12-communication & Consent preference.md — all "Communication Preferences" → Communication & Consent Preferences
Database entity
party_communication_preference — one active profile per party (unique index), with channels, preferred contact settings, consents, quiet hours, audit fields, and soft delete.

Business rules enforced
One active profile per party (auto-created on first load)
Preferred contact method must be an enabled channel
Quiet hours must be both set or both empty; valid HH:MM; start ≠ end
Consent changes update consent date/source/version and are audit + timeline recorded
No notification/email/SMS sending logic
UI
Party Workspace tab Communication & Consent Preferences with sections:

Communication Channels — Email, SMS, WhatsApp, Phone, Push, Postal
Preferred Contact — language, timezone, method, contact time, quiet hours
Consent — Marketing, Promotions, Transactional + consent date/source
Save / Reset
Architecture
UI → Server Actions → PartyCommunicationPreferenceService → CommunicationPreferenceService → Repository → Drizzle → PostgreSQL
Audit and timeline hooks integrated for consent/preference changes.

Quality gates
Gate	Result
Migration 0024
Applied
IP-012 smoke
24/24 PASS
Typecheck
PASS
ESLint
PASS
Production build
PASS
Manual verification
Open any party → Communication & Consent Preferences tab
Toggle channels/consents → Save
Check Audit History and Timeline for recorded changes
Try setting preferred method to a disabled channel → validation error
Future platform integration
Future Build Packs (CRM, Marketing, Collections, Notification Engine, Workflow, Finance, Healthcare, Property, Education) should read CommunicationPreferenceService / party_communication_preference before sending anything:

Notification Engine decides what to send
Communication & Consent Preferences decide if and how it may be sent (channel enabled, marketing consent, quiet hours, preferred method)
No module should maintain its own per-party notification settings.
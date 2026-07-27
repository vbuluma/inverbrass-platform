BP-002 – IP-003: Contacts & Communication
Objective

Implement a reusable Contact Management capability that allows every Party (Individual or Organization) to maintain one or more communication channels.

This package shall establish the enterprise Contact repository used by all Industry Solutions without embedding any industry-specific logic.

Scope

Implement only:

Contact Types
Party Contacts
Preferred Contact
Verified Status
Contact Status
Contact validation
Contact Workspace
CRUD operations

Do not implement yet:

Communication Preferences (IP-008)
WhatsApp integration
SMS integration
Email integration
Notification Engine integration
OTP verification
AI communication recommendations
Business capabilities delivered
PC-005 Contact Management
Supported Contact Types

Configurable catalogue:

Mobile
Office Phone
Home Phone
Email
WhatsApp
Fax
Website
Social Media
Emergency Contact

Future contact types should be configurable through the Configuration Engine.

Contact fields

Each contact shall include:

Contact Type
Value
Preferred (Yes/No)
Verified (Yes/No)
Status
Notes (optional)
Business Rules
BR-001

A Party may have multiple Contacts.

BR-002

Only one Contact of the same type may be marked Preferred.

Example

Mobile

✓ 0712...

○ 0722...

BR-003

A Party may have multiple Preferred Contacts across different types.

Example

Preferred Mobile

Preferred Email

Preferred WhatsApp

BR-004

Inactive Contacts shall not be selectable by other Build Packs.

BR-005

Verification shall only update the Verified flag.

No OTP implementation yet.

BR-006

Deleting a Contact shall perform a soft delete.

BR-007

Preferred Contact cannot be inactive.

BR-008

Organizations may have Website contacts.

Individuals normally may not.

Party Workspace

The Contacts tab becomes fully functional.

Display:

| Type | Value | Preferred | Verified | Status | Actions |

Actions

Add Contact
Edit
Set Preferred
Verify
Deactivate
Reactivate
Remove
Party Registration

Keep registration simple.

Only collect

Individual

Mobile (mandatory)

Organization

Mobile
Email (optional)

Everything else belongs in the Party Workspace.

Dashboard

Party Details

Overview

Roles

Contacts   ← Functional

Addresses

Branches

Relationships

Documents

Groups

Timeline

Audit
Database

New tables

contact_type

party_contact
Repositories
ContactTypeRepository

PartyContactRepository
Services
PartyContactService
Actions
addPartyContactAction

updatePartyContactAction

setPreferredPartyContactAction

verifyPartyContactAction

deactivatePartyContactAction

reactivatePartyContactAction
Validation

Examples

Mobile

Kenya

07xxxxxxxx

Email

Valid email format

Website

Valid URL

No country-specific telecom validation yet.

Manual Tests
Individual

Register Individual

↓

Add Mobile

↓

Add Email

↓

Set Mobile Preferred

↓

Verify Mobile

↓

Deactivate Email

Organization

Register Organization

↓

Add Office Phone

↓

Add Website

↓

Add WhatsApp

↓

Change Preferred Phone

↓

Verify Website

Cross-check

Confirm

✓ Multiple Contacts

✓ One Preferred per Contact Type

✓ Verified flag updates

✓ Deactivate works

✓ Workspace refreshes correctly
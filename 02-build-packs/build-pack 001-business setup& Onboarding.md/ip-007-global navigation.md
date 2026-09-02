Objective

Implement IP-007 – Global Navigation & Session Management.

The implementation must become the standard navigation framework for the entire platform.

**Industry-native navigation (AP-001):** Left navigation entries are generated from the business's **Industry Experience Profile (ENG-003k)**, not from a global module list. A bank sees Loans, Deposits, Treasury; a hospital sees Patients, Appointments, Laboratory. The navigation framework is reusable; the menu content is edition-specific.

Functional Requirements

Implement the following:

1. Global Platform Header

Visible on every authenticated page.

Include:

InverBrass logo
Current Business name
Business Switcher (future-ready)
Global Search placeholder
Notifications placeholder
Help placeholder
User Profile menu
2. User Profile Menu

Provide:

My Profile
Preferences
Switch Business (placeholder if only one business)
Help
About InverBrass
Sign Out

Sign Out must terminate the session correctly and redirect to the Login page.

3. Left Navigation

Provide a collapsible navigation drawer.

Navigation entries are generated from the business's Industry Edition profile (ENG-003k).

**Banking edition example:** Dashboard, Customers, Products, Loans, Deposits, Cards, Treasury, Branches, Compliance, Reports, Settings

**Healthcare edition example:** Dashboard, Patients, Doctors, Appointments, Procedures, Laboratory, Pharmacy, Billing, Insurance, Reports, Settings

**Property edition example:** Dashboard, Properties, Units, Tenants, Leases, Rent, Maintenance, Utilities, Reports, Settings

**Education edition example:** Dashboard, Students, Teachers, Classes, Subjects, Fees, Examinations, Attendance, Reports, Settings

Minimum framework entries (when edition profile is not yet loaded):

Dashboard
Parties
Offerings
CRM
Sales
Payments
Inventory
Procurement
Settings

NAV-001: these are capability hubs. Implementation Packages add nested capabilities or hub-landing actions — they must not add a new top-level sidebar item.

**AV-1.11:** Procurement is the approved buy-side hub. It is added to runtime navigation with BP-009 IP-01 as `Procurement → Suppliers`. Until those pages exist, do not register an empty Procurement item. Do not promote Suppliers (or future RFX/PO/Contract items) to a top-level hub. Mobile: Procurement is under More, not the bottom bar. See `02-build-packs/build pack 009-Procurement & Supplier Management/BP-009 Navigation Hub.md`.

Must be reusable across all Build Packs and Industry Editions.

4. Breadcrumb Navigation

Display breadcrumbs on all pages below Dashboard.

Example:

Dashboard

Parties

ABC Company

Organization Structure

Each breadcrumb must be clickable.

5. Standard Cancel / Back Navigation

Every editable page must expose an obvious exit path.

Examples:

Cancel

Back

Close

Users must never rely on the browser Back button.

6. Authentication Pages

Improve Login UX.

Provide links for:

Forgot Password

Register Business (placeholder)

Help

Privacy Policy

Terms

Back to Home (placeholder)

Architecture Requirements

This implementation belongs to:

BP-001 Platform Foundation

NOT BP-002.

It shall become reusable by every future Build Pack.

Do not duplicate navigation components inside modules.

Navigation must be shared platform infrastructure.

Technical Requirements

Follow the existing architecture:

UI
→ Server Actions
→ Services
→ Repository
→ Drizzle
→ PostgreSQL

Use existing authentication.

Do not modify business logic.

Do not change Party functionality.

Future Readiness

Design for:

Multiple Businesses
Multiple Roles
Notifications
Universal Search
Favorites
Recently Viewed
Product modules
AI Assistant entry point
Mobile intuitive UI
Even if some features are placeholders.

Quality Gates

Before completion ensure:

Typecheck passes
ESLint passes
Production build passes
Existing Build Packs remain unaffected
Navigation is available across all authenticated pages
Deliverables

Provide:

Files Created
Files Modified
Components Added
Routes Updated
Architecture Compliance
Quality Gate Results
Remaining Manual Verification

Stop after IP-006 is complete.

Do not proceed to any additional Platform Foundation work without approval.

**Industry-native navigation (AP-001):** Navigation is generated from the business's Industry Edition profile (ENG-003k), not from a global module list. The framework (header, drawer, breadcrumbs, session management) is shared; menu content is edition-specific. See [01 – Enterprise Solution Architecture](../../01-enterprise-architecture/01-Enterprise-Solution-Architecture.md) AP-001.
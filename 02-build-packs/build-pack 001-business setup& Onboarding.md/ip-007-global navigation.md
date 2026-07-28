Objective

Implement IP-006 – Global Navigation & Session Management.

The implementation must become the standard navigation framework for the entire platform.

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

Minimum entries:

Dashboard
Parties
Modules (placeholder)
Favorites (placeholder)
Recent Items (placeholder)
Settings

Must be reusable across all Build Packs.

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

One additional recommendation: since your vision is a Digitalization Platform rather than an ERP, I'd rename the left navigation item "Modules" to "Solutions" or "Workspace". This reinforces that users are accessing platform capabilities (e.g., Property, Healthcare, Schools, NGOs, SMEs) rather than traditional ERP modules. It aligns better with the long-term positioning of InverBrass as a multi-industry digital platform.
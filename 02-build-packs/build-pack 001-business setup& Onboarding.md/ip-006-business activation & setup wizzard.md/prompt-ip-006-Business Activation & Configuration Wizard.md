Release:
Release 1 – Platform Foundation

Build Pack:
BP-001 – Business Setup & Onboarding

Implementation Package:
IP-006 – Business activation & configuration wizard


Architecture Dependency:
AD-009 Authentication & Business Onboarding (Architecture Locked), and all documents under 01-enterprise-architecture)

Business REQUIREMENTS
please implement based on BRD_IP-006-platform activationa

Prerequisite Implementation Packages:
• IP-001 – Authentication Foundation (Approved)
• IP-002 – Business Owner Registration & Business Onboarding (Approved)
• IP-003 – Business context (Approved)
• IP-004 – first login & password management (Approved)
• IP-005 

The objective is to produce enterprise-quality production code that strictly adheres to the approved architecture, development standards, and Build Pack scope.

====================================================
GENERAL IMPLEMENTATION PRINCIPLES
====================================================

1. Implement ONLY the approved scope of the current Implementation Package.

2. Do NOT implement future Build Packs or future Implementation Packages.

3. Follow Configuration over Customization wherever possible.

4. Reuse existing platform capabilities before creating new ones.

5. Respect the Single Capability Ownership principle:
   - Every capability has one and only one owner.
   - Never duplicate functionality already owned by another capability or domain.
   - Consume existing services through the approved architecture.

6. Preserve the approved architecture:

UI
→ Server Actions
→ Services
→ Repositories / Adapters
→ Supabase

Never bypass layers.

====================================================
BUSINESS REQUIREMENTS COMPLIANCE
====================================================

The approved Business Requirements Document (BRD) is the authoritative source.

Every implementation shall comply with the approved:

• Business Requirements (BR)
• Functional Requirements (FR)
• Business Rules
• Process Flows
• Data Model
• Architecture Documents
• Coding Standards

Do NOT invent new functionality.

Do NOT change approved business behaviour.

If implementation requires clarification because the BRD is ambiguous:

• Stop.
• Report the ambiguity.
• Do not guess.

====================================================
FUNCTIONAL REQUIREMENT TRACEABILITY
====================================================

Before implementing any feature:

1. Identify the Functional Requirement(s) being implemented.

2. Identify the Business Rule(s) governing the feature.

3. Ensure every implemented function satisfies one or more approved Functional Requirements.

4. Do not implement functionality that cannot be traced back to an approved Functional Requirement.

====================================================
BUSINESS RULE IMPLEMENTATION
====================================================

Business Rules are mandatory.

Every business rule shall be implemented within the appropriate Service layer.

Never implement Business Rules inside:

• UI
• Components
• Pages
• Server Actions
• Database queries

Business Rules belong inside Services.

If validation is required:

• Structural validation belongs in Zod Validators.

• Business validation belongs in Services.

====================================================
TRACEABILITY
====================================================

====================================================
ARCHITECTURE RULES
====================================================

• No business logic inside UI components.

• No direct Supabase calls from UI.

• Validation must use Zod.

• All server communication must use Server Actions.

• Business rules belong inside Services.

• Database access belongs only inside Repositories / Adapters.

• Keep modules loosely coupled.

• Reuse existing platform services whenever possible.

====================================================
DOCUMENTATION STANDARDS
====================================================

Every production file must include the approved project documentation header.

In addition, every production file shall include:

1. Purpose
   Explain what the file does.

2. Why
   Explain why this file exists.

3. Rationale
   Explain why this implementation approach was selected.

4. Dependencies
   List important services or modules used.

====================================================
CODE DOCUMENTATION STANDARD
====================================================

Code should be understandable by a developer joining the project years later.

For every important block of code, provide concise explanatory comments that describe:

• What this block is doing.
• Why it is required.
• The business rationale where applicable.

Example:

// ----------------------------------------------------
// Validate the incoming registration request.
// This ensures all mandatory business fields exist
// before any service logic executes.
// ----------------------------------------------------

Avoid commenting every single line.

Instead, document logical code blocks using clear enterprise-style comments similar to banking standards.

Code should be self-explanatory, readable and maintainable.

====================================================
IMPLEMENTATION RULES
====================================================

• Modify existing files only where necessary.

• Do not delete existing functionality unless explicitly instructed.

• Do not introduce unnecessary abstractions.

• Maintain consistent naming conventions.

• Keep implementations modular.

• Prefer readability over clever code.

====================================================
QUALITY REQUIREMENTS
====================================================

Before completion verify:

✓ TypeScript passes

✓ Lint passes

✓ Build passes

✓ Architecture remains compliant

✓ No duplicate functionality introduced

====================================================
VALIDATION
====================================================
Before starting any new Implementation Package, Cursor must first validate that the previous approved Implementation Package is still complete. If any required production file has been accidentally deleted or corrupted, it must restore it before implementing the next IP.
If a required production file is missing:

• Determine whether an equivalent implementation already exists.

• If an equivalent implementation exists:
  - Reuse it.
  - Do not recreate it.

• If no equivalent exists:
  - Rebuild the missing production file using the approved architecture.

Never recreate files unnecessarily.

====================================================
SMOKE TEST REQUIREMENTS
====================================================

Before declaring the Implementation Package complete:

1. Verify every file listed in the approved implementation scope exists.

2. Verify every required:
   - Route
   - UI Component
   - Server Action
   - Service
   - Repository / Adapter
   - Validator
   - Utility
   - Middleware
   - Configuration file

3. Verify that every implementation complies with the approved architecture.

4. If a required production file is missing:

   • Determine whether it has been intentionally replaced by an equivalent implementation.

   • If an equivalent implementation exists:
     - Report it.
     - Do not recreate the file.

   • If no equivalent implementation exists:
     - Automatically rebuild the missing file using the approved implementation specification.

5. Rebuild missing smoke-test or utility files only if they are approved deliverables for the current Implementation Package.

6. Do NOT modify files that are already correct.

7. Do NOT delete existing files.

8. Preserve documentation headers and enterprise code comments.

====================================================
QUALITY GATES
====================================================

Run and verify where applicable:

✓ TypeScript compilation

✓ ESLint

✓ Production Build

✓ Route compilation

✓ Architecture validation

✓ File completeness validation

✓ Smoke test validation

Where the project includes smoke-test scripts:

• Execute the smoke-test script.

• If the smoke-test script is missing but is an approved deliverable for the current IP, rebuild it.

• If the smoke test identifies missing implementation files, rebuild those files before declaring completion.

• Continue until all smoke tests pass.

====================================================
COMPLETION CRITERIA
====================================================

An Implementation Package is NOT complete unless:

✓ All required files exist.

✓ Smoke tests pass.

✓ Typecheck passes.

✓ Lint passes.

✓ Build passes.

✓ Architecture remains compliant.

✓ No duplicate capabilities have been introduced.

====================================================
OUTPUT
====================================================

Provide ONLY:

1. Files Created

2. Files Modified

3. Files Verified

4. Files Rebuilt (if any)

5. Smoke Test Results

6. Architecture Compliance

7. Quality Gate Results

8. Known Limitations

9. Remaining Manual Verification

End with exactly:

Implementation complete. Awaiting manual review and approval.

No Git operations (commit, push, pull, fetch, merge, rebase, checkout or branch manipulation) have been performed.

I will manually review every change using the Cursor Review Panel.

I alone will perform all Git operations after approval.

====================================================
OUTPUT FORMAT
====================================================

After implementation provide ONLY:

1. Files Created

2. Files Modified

3. Architecture Compliance

4. Quality Gate Results

5. Known Limitations

6. Remaining Manual Verification

End with exactly:

Implementation complete. Awaiting manual review and approval.

No Git operations (commit, push, pull, fetch, merge, rebase, checkout or branch manipulation) have been performed.


PROMPT 2-UPDATE FIRST BUILD-24/7/2026
Implement the following approved refinements for IP-006.

IMPORTANT

- Do NOT change the approved business scope.
- Do NOT rename Business Activation (already corrected manually).
- Do NOT modify functionality that already works.
- Do NOT perform any Git operations (commit, push, pull, merge, fetch, rebase, checkout or branch manipulation).
- Preserve the existing architecture, coding standards, documentation headers and layering.
- Follow Server Actions → Services → Repository → Drizzle/Supabase architecture.
- Keep all business rules inside services.
- Keep UI components presentation-only.
- Use Zod validation where applicable.
- Preserve existing smoke tests and extend them only where required.

--------------------------------------------------
1. Business Configuration Model
--------------------------------------------------

Review the current business_configuration implementation.

Where practical, make it metadata/configuration-driven instead of tightly coupling every configuration to a dedicated column.

The design should support future configuration without schema redesign.

Examples include (but are not limited to):

- Payment methods
- Receipt configuration
- AI enablement
- Loyalty enablement
- Future business configuration items

The implementation must remain simple and maintainable while supporting future extensibility.

Do NOT over-engineer.

--------------------------------------------------
2. Business Setup Progress
--------------------------------------------------

Extend business_setup_progress to support better auditability and future wizard versions.

Include support for:

- current_step
- last_completed_step
- completed_by
- completed_at
- wizard_version

If additional audit metadata already exists through shared platform components, reuse it instead of duplicating it.

Preserve existing functionality.

--------------------------------------------------
3. Currency Reference Data
--------------------------------------------------

Review the currency reference implementation.

Ensure currency master data supports standard ISO attributes including:

- ISO Currency Code
- Currency Name
- Currency Symbol
- Decimal Places
- Active Status

Reuse existing reference-data architecture where possible.

Avoid duplicate country/currency ownership.

Country continues to determine the default base currency.

--------------------------------------------------
4. Smoke Tests
--------------------------------------------------

Retain all existing smoke tests.

Extend IP-006 smoke validation to include:

Happy Path

- Register Business
- Complete setup
- Activate business
- Redirect to dashboard

Optional Path

- Skip optional AI configuration
- Skip optional Loyalty configuration
- Activate successfully

Negative Tests

- Reject duplicate operating currency
- Reject activation without mandatory Base Currency
- Reject operational access while Business Status = DRAFT

Resume Test

- Save progress
- Resume wizard from last completed step

Ensure all smoke tests remain deterministic and executable.

--------------------------------------------------
5. Documentation
--------------------------------------------------

Update inline documentation where required.

For every production class, function and major logical block include concise documentation explaining:

WHAT the code does.

WHY it exists.

RATIONALE behind the implementation or design decision.

Avoid redundant comments.

Comments should improve maintainability for future developers.

--------------------------------------------------
6. Quality Gates
--------------------------------------------------

Run all quality gates after implementation.

- Typecheck
- ESLint
- Production Build
- Existing Smoke Tests
- Extended IP-006 Smoke Tests

Automatically fix any issues introduced by the implementation.

--------------------------------------------------
7. Final Report
--------------------------------------------------

After completion provide ONLY:

Files Modified

Files Created (if any)

Architecture Compliance

Smoke Test Results

Quality Gate Results

Remaining Manual Verification

End with exactly:

Implementation complete. Awaiting manual review and approval.

No Git operations (commit, push, pull, fetch, merge, rebase, checkout or branch manipulation) have been performed.
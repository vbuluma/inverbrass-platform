# BP-005 IP-11 – Tax Compliance, Remittance & Evidence Management

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-11 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-03, IP-06, IP-08, IP-10 |
| Status | **Implemented in `03-platform` (2026-08-13)** |
| Smoke | `npx tsx scripts/bp005-ip11-tax-compliance-smoke-validation.ts` — **49/49 PASS** |
| Migration | `0056_bp005_ip011_tax_compliance.sql` (journal idx **60**) |

---

## Objective

Provide a configurable tax-compliance capability that converts tax liabilities from IP-03/IP-06 into trackable statutory obligations (filing, remittance recording, evidence, calendar, compliance status) — **without becoming a second tax calculation engine**.

Platform capability ≠ guaranteed statutory compliance.

---

## Architecture boundary

| Capability | Owner |
|------------|-------|
| Tax calculation | **IP-03** |
| Commercial freeze | **IP-06** |
| Downstream contract | **IP-10** |
| Tax obligation / calendar / filing / remittance record / evidence | **IP-11** |
| Payment execution | **BP-007** (not implemented) |
| Authority connectors (eTIMS/iTax) | Future integration |

```text
IP-03 tax amount → IP-06 snapshot → IP-10 contract
        ↓
IP-11 tax obligation (preserves amounts + snapshot/component refs)
        ↓
Filing / Remittance record / Evidence / Compliance status
```

---

## Tax compliance model (implemented)

- Profile + registrations (business tax profile)
- Versioned compliance rules (effective-dated; ACTIVE required)
- Filing periods / due-date engine (fail-closed)
- Obligations linked to snapshot / tax component / contract id
- Filing lifecycle: NOT_DUE → DUE → PREPARED → SUBMITTED → ACCEPTED | REJECTED
- Remittance lifecycle: DUE → PARTIALLY_PAID → PAID (+ outstanding)
- Evidence: REQUIRED/MISSING → UPLOADED → VERIFIED | REJECTED (document **reference** only)
- Compliance status derived from filing + remittance + evidence + due dates
- Events for auditability (in-process event log; ENG-013 optional later)

---

## Kenya configuration boundary

**Implemented as configuration capability + Kenya template pack:**

- Jurisdiction `KE` / `KE-NATIONAL` / authority `KRA`
- Templates: `KE-VAT-MONTHLY`, `KE-WHT-MONTHLY` (illustrative due-day defaults)
- Seeded into a business when a KE profile is created

**Not claimed as certified legal compliance.** Operators must validate due days and registration rules against current KRA notices before production.

**Unavailable / not invented as hard law facts:** exact current statutory due-day statutes, penalty matrices, and live eTIMS submission — represented as configurable data / future integration only.

Uganda stub (`UG` / `URA`) demonstrates multi-jurisdiction readiness without engine rewrite.

---

## Persistence

Tables: `tax_compliance_profile`, `tax_registration`, `tax_compliance_rule`, `tax_filing_period`, `tax_obligation`, `tax_filing`, `tax_remittance`, `tax_evidence`, `tax_compliance_event`.

Runtime UX/smoke uses process-scoped in-memory store (same pattern as IP-08). Migration applied for durable readiness.

Permissions: `CommercialManagement.TaxCompliance.{Read,Manage,File,Remit,Evidence}` (+ new permission actions).

---

## UX

`/commercial/tax-compliance` — dashboard, registrations, calendar, obligations, evidence/remittance panels. Nav entry added.

---

## Quality gates

- Smoke **49/49 PASS**
- `db:migrate` applied successfully
- `db:seed` updated for tax-compliance permissions/actions
- Lint: IP-11 sources cleaned
- Regressions: BP-003 IP-011, IP-01, IP-10 spawned; IP-06…IP-09 artifact continuity

---

## Intentional gaps

- No BP-006/BP-007 / RA / payment execution / eTIMS live filing
- No OCR / document storage platform (references only)
- Full nested IP-02…IP-09 smoke trees not re-spawned (timeout risk)
- Kenya templates are **illustrative configuration**, not legal certification
- Async Drizzle repository not fully wired (in-memory runtime + migrated tables)

---

## Implementation Prompt Archive

This section preserves the complete Cursor implementation prompt used for IP-11 implementation and serves as the authoritative implementation record for this IP.

# BP-005 IP-11 — Tax Compliance, Filing, Remittance Calendar & Evidence
## Cursor Implementation Prompt

You are implementing ONLY:

BP-005 — Pricing, Tax & Commercial Rules
IP-11 — Tax Compliance, Filing, Remittance Calendar & Evidence

STOP CONDITION:
Do not implement BP-006, BP-007, Revenue Assurance, payments, billing, receipting, inventory, or additional CRM functionality.

IP-11 is the FINAL IP of BP-005.

==================================================
1. OBJECTIVE
==================================================

Implement the tax-compliance capability required to make BP-005 commercially and tax-compliance ready for real-world operation, starting with Kenya as the first supported country while designing the model so that other countries can be configured without rewriting the engine.

IMPORTANT ARCHITECTURAL BOUNDARY:

IP-03 owns TAX CALCULATION.

IP-11 owns TAX COMPLIANCE.

Therefore:

IP-03 answers:

    "How much tax applies to this commercial transaction?"

IP-11 answers:

    "What tax obligation does this create, when is it due, how is it reported/remitted, what evidence is required, and what compliance status does it have?"

Do NOT move tax calculation into IP-11.

Do NOT duplicate IP-03 tax calculation rules.

==================================================
2. CORE PRINCIPLE
==================================================

Tax compliance must be:

- country configurable
- tax-regime configurable
- effective-dated
- auditable
- versioned
- evidence-aware
- calendar-aware
- fail-closed where required configuration is missing
- capable of supporting multiple tax types
- capable of supporting different filing/remittance frequencies
- capable of handling different due-date rules
- capable of tracking compliance status
- capable of supporting future countries without code forks

Kenya is the first configuration.

Do not hardcode "Kenya" throughout service logic.

Country-specific behaviour must be configuration/data driven wherever practical.

==================================================
3. CURRENT ARCHITECTURE
==================================================

BP-003
  ↓
IP-01 Base Price
  ↓
IP-05 Price Precedence
  ↓
IP-03 Tax Calculation
  ↓
IP-04 Commercial Components
  ↓
IP-02 Composition
  ↓
IP-06 Immutable Commercial Snapshot
  ↓
IP-07 Expected Commercial Amount
  ↓
IP-08 Commercial Governance
  ↓
IP-09 Commercial Validation
  ↓
IP-10 Downstream Commercial Contract
  ↓
IP-11 TAX COMPLIANCE
       ├── tax obligation
       ├── filing obligation
       ├── remittance obligation
       ├── due-date calendar
       ├── compliance status
       └── evidence requirements

IP-11 consumes the authoritative commercial/tax result.

It must NOT recalculate the tax.

==================================================
4. TAX COMPLIANCE MODEL
==================================================

Separate these concepts explicitly:

A. Tax calculation
   IP-03

B. Tax obligation
   IP-11

C. Filing obligation
   IP-11

D. Remittance obligation
   IP-11

E. Evidence
   IP-11

F. Compliance status
   IP-11

G. Calendar / due dates
   IP-11

Do not collapse all of these into one tax record.

==================================================
5. TAX OBLIGATION
==================================================

Create a tax-obligation contract capable of representing:

- businessId
- country
- tax regime
- tax type/code
- tax period
- source commercial snapshot
- source commercial contract
- taxable amount
- calculated tax amount
- currency
- obligation date
- due date
- filing status
- remittance status
- evidence status
- compliance status
- createdAt
- updatedAt
- applicable rule/version

The exact field names must follow existing project conventions.

==================================================
6. TAX TYPES
==================================================

The model must support multiple tax types.

Do not assume VAT is the only tax.

The configuration model should support, where applicable:

- VAT / sales tax
- withholding taxes
- excise-type taxes
- income-related tax obligations
- payroll-related tax obligations where the platform later needs them
- other statutory taxes/levies
- zero-rated transactions
- exempt transactions

IMPORTANT:

Do not implement every tax calculation engine in this IP.

IP-11 must be capable of representing compliance obligations for different tax types.

Where calculation is required, consume IP-03 output or establish a clearly defined future calculation boundary.

==================================================
7. KENYA FIRST CONFIGURATION
==================================================

Kenya must be the initial configured jurisdiction.

The implementation should provide configurable structures for Kenyan tax compliance requirements, including where applicable:

- VAT
- withholding tax obligations
- applicable statutory tax/levy obligations
- filing periods
- remittance periods
- due-date rules
- taxpayer/business registration references
- evidence requirements
- filing/remittance statuses

Do not assume that every business is subject to every tax.

Applicability must be configuration driven.

Do not hardcode eligibility solely from country.

==================================================
8. TAX REGISTRATION PROFILE
==================================================

Support a business tax profile.

Conceptually:

Business
  ↓
Tax Compliance Profile
  ↓
Country / jurisdiction
  ↓
Tax registrations
  ↓
Applicable tax regimes

The profile should support:

- country
- tax registration number(s)
- registration type
- tax authority
- effectiveFrom
- effectiveTo
- active status
- applicable tax regimes

Do not expose sensitive registration information unnecessarily in ordinary transaction screens.

==================================================
9. TAX RULE CONFIGURATION
==================================================

IP-11 must support configuration of compliance rules.

A rule should be capable of defining:

- jurisdiction
- tax type
- effective period
- filing frequency
- remittance frequency
- due-date calculation
- applicable taxpayer/business category
- required registration
- required evidence
- filing requirement
- remittance requirement
- status

Rules must be versioned.

An active rule must not be silently mutated.

Use the existing BP-005 governance/versioning principles from IP-08.

==================================================
10. EFFECTIVE DATING
==================================================

Tax compliance rules must be effective-dated.

Given:

transaction date
+
jurisdiction
+
tax type

the system must identify the applicable compliance rule/version.

Historical transactions must not change because a future rule is introduced.

Future rules must not apply prematurely.

==================================================
11. FILING CALENDAR
==================================================

Implement a configurable tax compliance calendar.

The calendar must support:

- tax type
- filing period
- period start
- period end
- filing due date
- remittance due date
- jurisdiction
- rule version
- status

Support configurable frequencies such as:

- monthly
- quarterly
- annual
- event-driven
- custom

Do not assume all tax obligations share the same calendar.

==================================================
12. DUE-DATE ENGINE
==================================================

Due dates must be calculated from configurable rules.

Do not hardcode one universal date.

Support concepts such as:

- fixed day of following month
- fixed day after period end
- business-day adjustment
- weekend/holiday adjustment
- event-relative deadlines
- jurisdiction-specific rules

If a rule cannot determine a valid due date:

FAIL CLOSED.

Do not invent a date.

==================================================
13. FILING OBLIGATION
==================================================

A filing obligation should track:

- filing reference
- tax type
- period
- amount declared
- amount expected where available
- filing date
- due date
- status
- authority
- evidence
- acknowledgement/reference
- notes
- rule version

Statuses should support a meaningful lifecycle, for example:

NOT_DUE
DUE
PREPARED
SUBMITTED
ACCEPTED
REJECTED
AMENDED
OVERDUE

Use appropriate names consistent with the codebase.

==================================================
14. REMITTANCE OBLIGATION
==================================================

A remittance obligation should track:

- expected amount
- amount remitted
- outstanding amount
- remittance date
- due date
- payment/reference number
- authority
- status
- evidence
- variance where applicable

Statuses should support:

NOT_DUE
DUE
PARTIALLY_PAID
PAID
OVERDUE
DISPUTED
WAIVED

Do not implement the payment execution engine.

IP-11 records the compliance/remittance obligation.

Actual payment execution belongs to downstream payment/financial capabilities.

==================================================
15. TAX PAYMENT EVIDENCE
==================================================

Support evidence attachments.

Examples:

- tax payment confirmation
- authority acknowledgement
- filing acknowledgement
- tax return
- payment receipt
- assessment notice
- exemption certificate
- withholding certificate
- other statutory evidence

Evidence metadata should include:

- evidenceId
- obligationId
- evidenceType
- document/file reference
- uploadedBy
- uploadedAt
- description
- period
- status

Do not store arbitrary files directly in commercial tables.

Use the platform's existing document/file abstraction where available.

If none exists, create only an appropriate reference contract — not a new uncontrolled document subsystem.

==================================================
16. EVIDENCE STATUS
==================================================

Track whether required evidence exists.

Example:

REQUIRED
MISSING
UPLOADED
VERIFIED
REJECTED
NOT_REQUIRED

Compliance status must be able to identify:

"tax was remitted but evidence is missing."

This is different from:

"tax was not remitted."

==================================================
17. COMPLIANCE STATUS
==================================================

The system should provide an overall compliance state.

Examples:

COMPLIANT
DUE
AT_RISK
OVERDUE
EVIDENCE_MISSING
FILING_MISSING
REMITTANCE_MISSING
PARTIALLY_COMPLIANT
EXCEPTION
NOT_APPLICABLE

Do not reduce compliance to a simple paid/unpaid flag.

==================================================
18. COMPLIANCE EVENTS
==================================================

Track important events such as:

- obligation created
- obligation amended
- filing prepared
- filing submitted
- filing accepted
- filing rejected
- remittance recorded
- evidence uploaded
- evidence verified
- evidence rejected
- obligation marked overdue
- exception raised
- rule version changed

Use the existing audit/event framework.

Do not create a parallel audit system.

==================================================
19. COMMERCIAL SNAPSHOT LINK
==================================================

Where a tax obligation originates from a commercial transaction:

CommercialSnapshot
      ↓
Tax component
      ↓
Tax obligation

Retain:

- snapshotId
- resolutionId
- commercial contract reference
- tax component reference
- tax rule/version

This provides traceability:

Expected commercial amount
→ Tax calculated
→ Tax obligation
→ Filing
→ Remittance
→ Evidence

Do not copy the entire commercial calculation.

==================================================
20. MULTI-TENANCY
==================================================

All tax compliance data must be scoped by:

businessId

Business A must never see Business B's:

- tax registrations
- tax obligations
- filings
- remittances
- evidence
- compliance calendar

Test cross-business access explicitly.

==================================================
21. GOVERNANCE
==================================================

Tax compliance rule configuration is governed by IP-08.

Therefore:

- maker/checker where configured
- versioning
- effective dating
- approval before activation
- no silent mutation of active rules
- audit trail

Do not build a second governance mechanism.

IP-11 consumes the IP-08 governance framework.

==================================================
22. RESILIENCE / FAIL-CLOSED
==================================================

If required configuration is missing:

Examples:

- tax regime unknown
- tax registration required but missing
- filing frequency missing
- due-date rule missing
- tax authority missing
- required evidence rule missing

the system must not invent compliance information.

Return structured errors such as:

TAX_COMPLIANCE_CONFIG_MISSING
TAX_RULE_INVALID
TAX_REGISTRATION_MISSING
FILING_CALENDAR_MISSING
DUE_DATE_RULE_MISSING
EVIDENCE_REQUIREMENT_MISSING

Use the project's existing error conventions.

==================================================
23. REPORTING / MONITORING
==================================================

Provide service-level/reporting capability for:

- upcoming filings
- upcoming remittances
- overdue obligations
- missing evidence
- partially remitted taxes
- rejected filings
- rejected evidence
- compliance exceptions
- obligations by tax type
- obligations by period
- obligations by jurisdiction
- compliance status

Do not build a large analytics platform.

Expose the data needed by future reporting/analytics modules.

==================================================
24. UX
==================================================

If IP-11 introduces user-facing screens, follow the established BP-005 UX standard.

Use:

- progressive navigation
- clear step/status progression
- Previous / Next where applicable
- loading/progress feedback
- empty states
- search/filtering
- contextual guidance
- action footer
- clear next action
- errors beside the relevant field/section
- no generic error dump at the top

Recommended areas:

A. Tax Compliance Dashboard
- Upcoming filings
- Upcoming remittances
- Overdue
- Missing evidence
- Exceptions

B. Tax Registration
- registrations
- status
- effective dates

C. Tax Obligation
- amount
- period
- due date
- filing status
- remittance status
- evidence status

D. Evidence
- required documents
- uploaded documents
- verification status

E. Compliance Calendar
- filing deadlines
- remittance deadlines
- status

Do not create a duplicate commercial pricing UI.

==================================================
25. SEARCH / NAVIGATION UX
==================================================

Compliance users must be able to locate:

- tax obligation
- tax period
- tax type
- filing
- remittance
- evidence
- overdue items

Search/filter should support practical dimensions such as:

- tax type
- period
- status
- due date
- jurisdiction
- compliance state

Errors should appear beside the affected obligation/filing/evidence section.

==================================================
26. DOCUMENT / FILE BOUNDARY
==================================================

IP-11 owns:

"What evidence is required and what evidence is attached to the compliance obligation?"

It does NOT own:

- document management platform
- OCR
- file storage infrastructure
- document generation

Reuse existing platform document abstractions where available.

==================================================
27. COUNTRY CONFIGURATION
==================================================

Design the model so another country can be introduced by configuration.

Example conceptual model:

Jurisdiction
  ↓
Tax Regime
  ↓
Tax Type
  ↓
Compliance Rule Version
  ↓
Filing Calendar
  ↓
Remittance Rule
  ↓
Evidence Requirements

Adding another country should NOT require rewriting:

- tax obligation service
- filing service
- remittance service
- evidence service
- compliance status engine

Country-specific configuration should be data/rule driven.

==================================================
28. KENYA CONFIGURATION BOUNDARY
==================================================

Do not pretend to implement every Kenyan tax requirement from memory.

Where a specific statutory rule is required, it must be represented as configurable data/rule configuration with:

- source/reference
- effective date
- authority
- rule version

If the repository already contains authoritative Kenya tax requirements, use them.

If a required legal fact is unavailable in the project documentation, STOP and flag it rather than inventing the requirement.

The implementation must distinguish:

CONFIGURATION CAPABILITY
from
ACTUAL CONFIGURED KENYA RULES.

==================================================
29. DATA MODEL / MIGRATIONS
==================================================

Unlike IP-01–IP-07 and IP-09/10, IP-11 may legitimately require persistence.

Before modifying schema:

inspect existing:

- tax_type
- tax-related tables
- commercial governance tables
- audit/event infrastructure
- document/file abstractions
- business configuration
- existing calendar/date utilities

Do NOT duplicate existing tables.

If new tables are genuinely required, use appropriate normalized ownership.

Potential concepts include:

- tax_compliance_profile
- tax_registration
- tax_compliance_rule
- tax_filing_period
- tax_obligation
- tax_filing
- tax_remittance
- tax_evidence

These are conceptual only.

Use the existing schema conventions and create only what is genuinely necessary.

If migration is required:

- create migration
- update schema barrel
- update journal
- update seeds only for reference/configuration data
- preserve migration ordering

==================================================
30. TAX TYPE MASTER BOUNDARY
==================================================

The existing tax_type table must be inspected first.

Do not assume it is sufficient.

If it is merely a tax-code catalogue, retain it as reference data.

Do not turn it into an uncontrolled tax-rate master if that conflicts with IP-03 ownership.

IP-03 remains responsible for tax calculation inputs/rules.

IP-11 owns compliance obligations and calendars.

==================================================
31. TESTING — MANDATORY
==================================================

Create:

03-platform/scripts/bp005-ip11-tax-compliance-smoke-validation.ts

At minimum include:

TC-01 — Create tax compliance profile
Expected: business tax profile created.

TC-02 — Add tax registration
Expected: registration linked to correct business/jurisdiction.

TC-03 — Resolve applicable compliance rule
Expected: correct effective-dated rule selected.

TC-04 — Create tax obligation from commercial snapshot
Expected: obligation references snapshot/tax component and preserves calculated amount.

TC-05 — Filing period generation
Expected: correct filing period and due date.

TC-06 — Remittance due-date generation
Expected: correct remittance deadline.

TC-07 — Filing lifecycle
Expected:
NOT_DUE → DUE → PREPARED → SUBMITTED → ACCEPTED

TC-08 — Filing rejection
Expected:
SUBMITTED → REJECTED

TC-09 — Remittance lifecycle
Expected:
DUE → PARTIALLY_PAID → PAID

TC-10 — Overdue detection
Expected: obligation becomes OVERDUE when due date passes without required action.

TC-11 — Evidence required
Expected: missing required evidence produces EVIDENCE_MISSING / compliance warning.

TC-12 — Evidence upload
Expected: evidence becomes UPLOADED.

TC-13 — Evidence verification
Expected: UPLOADED → VERIFIED.

TC-14 — Evidence rejection
Expected: VERIFIED path cannot silently accept rejected evidence; structured rejection state.

TC-15 — Tax rule effective dating
Expected: historical transaction uses historical rule.

TC-16 — Future rule
Expected: future rule does not apply before effective date.

TC-17 — Missing configuration
Expected: fail closed.

TC-18 — Missing tax registration
Expected: structured failure where registration is mandatory.

TC-19 — Business isolation
Expected: Business B cannot access Business A compliance data.

TC-20 — Snapshot traceability
Expected:
CommercialSnapshot → tax component → tax obligation → filing/remittance.

TC-21 — No tax recalculation
Expected: IP-11 consumes IP-03/IP-06 result rather than calculating tax again.

TC-22 — Rule version traceability
Expected: obligation retains applicable compliance rule/version.

TC-23 — Governance
Expected: inactive/unapproved rule cannot be used as active compliance configuration.

TC-24 — Calendar
Expected: filing/remittance calendar generates correct obligations.

TC-25 — Multiple tax types
Expected: more than one tax type can coexist without hardcoded branching.

TC-26 — Multiple jurisdictions
Expected: Kenya configuration works and architecture allows another jurisdiction without service rewrite.

TC-27 — Compliance status
Expected: status correctly reflects filing/remittance/evidence conditions.

TC-28 — Partial remittance
Expected: outstanding amount remains correctly identifiable.

TC-29 — Evidence-to-obligation linkage
Expected: evidence cannot accidentally attach to another business/obligation.

TC-30 — Regression
Run BP-003 IP-011 and BP-005 IP-01 through IP-10 regression.

==================================================
32. QUALITY GATES
==================================================

Run:

npm run lint
npm run typecheck
npm run db:migrate
npm run db:seed

Also run:

IP-11 smoke validation
BP-003 regression
BP-005 IP-01 regression
BP-005 IP-02 regression
BP-005 IP-03 regression
BP-005 IP-04 regression
BP-005 IP-05 regression
BP-005 IP-06 regression
BP-005 IP-07 regression
BP-005 IP-08 regression
BP-005 IP-09 regression
BP-005 IP-10 regression

Do not modify unrelated failing scripts merely to make the IP-11 gate green.

Classify pre-existing failures separately.

==================================================
33. NO CODE OUTSIDE IP-11
==================================================

Do not:

- change BP-003 pricing ownership
- move tax calculation from IP-03
- change IP-02 composition semantics
- change IP-05 pricing precedence
- change IP-06 snapshot semantics
- change IP-07 expected amount semantics
- bypass IP-08 governance
- bypass IP-09 validation
- change IP-10 downstream contract
- implement payment
- implement order
- implement billing
- implement receipting
- implement revenue assurance
- implement inventory
- implement tax payment execution
- implement tax filing submission integrations unless explicitly already supported by existing integration infrastructure

Integration adapters to tax authorities may be future work.

==================================================
34. DOCUMENTATION
==================================================

Update:

BP-005 IP-11 Tax Compliance, Filing, Remittance Calendar & Evidence.md

Include:

- objective
- scope
- out of scope
- architecture boundary
- Kenya configuration boundary
- country configuration model
- tax registration
- compliance rules
- filing calendar
- remittance calendar
- obligations
- evidence
- compliance status
- governance
- security
- tenant isolation
- UX
- persistence
- migrations
- smoke tests
- regression tests
- quality gates
- intentional gaps

At the bottom of the document, archive this COMPLETE implementation prompt verbatim.

==================================================
35. IMPORTANT LEGAL / REGULATORY SAFETY
==================================================

Do not state that the system is legally compliant merely because the software capability exists.

The implementation should make the platform:

"configurable to support tax compliance requirements"

not claim:

"guaranteed statutory compliance"

unless the relevant rules have been explicitly configured and validated against authoritative requirements.

==================================================
36. STOP CONDITION
==================================================

When IP-11 is complete:

STOP.

Do NOT start BP-006.

Do NOT start BP-007.

Do NOT implement Revenue Assurance.

Report:

1. Status
2. Architecture flow
3. Tax compliance model
4. Kenya configuration implemented
5. Country configurability
6. Tax registration
7. Filing calendar
8. Remittance calendar
9. Evidence capability
10. Compliance lifecycle
11. Governance integration
12. UX changes
13. Files created
14. Files modified
15. Database/migration/seed changes
16. Smoke-test results
17. Regression results
18. Quality gates
19. Security/tenant isolation
20. Intentional gaps
21. Any statutory requirements that could NOT be safely configured because authoritative source material was unavailable

Final status must clearly state:

"IP-11 COMPLETE — BP-005 COMPLETE — STOPPED BEFORE BP-006."

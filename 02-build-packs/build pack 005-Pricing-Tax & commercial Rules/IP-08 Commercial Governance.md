# BP-005 IP-08 – Commercial Governance

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-08 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | High |
| Depends On | IP-01–IP-05, ENG-005, ENG-013, ENG-003l |
| Scope coverage | SC-014 |

---

## Objective

Govern the commercial configuration lifecycle: **versioning, approval, activation, retirement, effective dating and audit** — preventing uncontrolled changes and protecting configuration needed to interpret historical transactions.

---

## Business Problem

Commercial rules are high-risk configuration. Unapproved changes, silent deletes and missing versions break reproducibility and auditability. Governance must make material changes controlled, auditable and non-destructive to history.

---

## Scope

### Included

- Controlled creation, modification, activation and retirement of commercial rules
- Versioning of commercial configuration (aligned with IP-05 evaluation)
- Effective dating of rule versions
- Approval of material changes via ENG-005 where configured
- Audit of material commercial configuration changes (ENG-013)
- Prevent deletion of configuration required to interpret committed historical transactions
- Optional readiness checklists via ENG-003l (commercial setup complete)

### Excluded

- Day-to-day price item CRUD owned by BP-003 Product Workspace (BP-003 retains offering price master UX; BP-005 may govern commercial policy objects)
- Runtime resolution algorithm (IP-06)
- Payment approvals (BP-007)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Support controlled creation, modification, activation and retirement of commercial rules. |
| BR-002 | Material commercial configuration changes shall be auditable. |
| BR-003 | Prevent deletion of configuration required to interpret committed historical transactions. |
| BR-004 | Support versioning and effective dating of commercial rules. |
| BR-005 | Gate activation of incomplete commercial setup where checklists apply. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Support commercial-rule versioning. | FR-027 |
| FR-002 | Support controlled creation, modification, activation and retirement of commercial rules. | FR-036 |
| FR-003 | Material commercial configuration changes shall be auditable. | FR-037 |
| FR-004 | Prevent deletion of configuration required to interpret committed historical transactions. | FR-038 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Active rules used by snapshots cannot be hard-deleted; retire/supersede only. |
| BRU-002 | Activation may require approval when materiality thresholds are met. |
| BRU-003 | Draft versions are not used in production resolution unless explicitly previewing a version pin. |
| BRU-004 | Every activation/retirement emits an audit event. |
| BRU-005 | Business isolation: users only govern rules within authorised `businessId`. |

---

## High-Level Process Flow

```
Create/Edit Draft Rule Version
        ↓
Validate (IP-09)
        ↓
Submit for approval (ENG-005) if material
        ↓
Activate with effective from
        ↓
Prior version retired / superseded
        ↓
Audit trail recorded (ENG-013)
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Materiality thresholds | What requires approval |
| Approval roles | Maker-checker matrix |
| Checklist templates | ENG-003l commercial readiness |
| Retention | Minimum retain-for-history policy |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01–IP-05 | Governed objects |
| IP-06 / IP-09 | Version pins and validation gates |
| ENG-005 | Approvals |
| ENG-013 | Audit |
| ENG-003l | Setup completion |
| BP-001 | Admin roles / permissions |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Pending commercial approvals | Workflow queue |
| Rule version inventory | Active/draft/retired |
| Audit extract | Material changes by actor/date |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Material change requires configured approval before activation. |
| AC-002 | Hard delete blocked when rule version is referenced by snapshot/history. |
| AC-003 | Audit records actor, before/after, version and timestamp. |
| AC-004 | Resolution can pin/evaluate a specific rule version for reproducibility. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Implemented in `03-platform` (2026-08-13) |
| Smoke | `npx tsx scripts/bp005-ip08-commercial-governance-smoke-validation.ts` — **42/42 PASS** |
| Migration | `0055_bp005_ip008_commercial_governance.sql` (journal idx **59**) |
| UX | `/commercial/governance` — Configuration → Review → Approval → Activation |
| Related FRs | FR-027, FR-036–FR-038 |

---

## Implementation Status

**Implemented** in `03-platform` (2026-08-13).

### Architecture boundary (implemented)

Governance sits **around** commercial resolution. It does **not** recalculate price, tax, discount, commission or expected amount.

```text
Commercial configuration / resolution request
              ↓
       IP-08 GovernanceDecision
       (ALLOWED / APPROVAL_REQUIRED /
        REJECTED / REVIEW_REQUIRED)
              ↓
      Existing commercial engine
      (IP-01 → IP-05 → IP-03 → IP-04 → IP-02)
              ↓
 IP-06 Commercial Snapshot
              ↓
 IP-07 Expected Commercial Amount
```

Post-result validation (non-mutating):

```text
IP-06 Snapshot
      ↓
IP-08 validateSnapshotGovernance
      ↓
GovernanceDecision (snapshot unchanged)
```

Ownership remains:

| Capability | Owner |
|------------|-------|
| Price master | BP-003 |
| Base price / precedence / tax / components / composition | IP-01–IP-05, IP-02 |
| Snapshot | IP-06 |
| Expected amount | IP-07 |
| Governance / control | **IP-08** |

### Governance lifecycle

```text
DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → SUSPENDED / EXPIRED / RETIRED
REJECTED → DRAFT / PENDING_APPROVAL
```

| Rule | Behaviour |
|------|-----------|
| Invalid transitions | Fail closed |
| `DRAFT → ACTIVE` | Forbidden when approval is required |
| `REJECTED → ACTIVE` | Forbidden without resubmission |
| Historical / ACTIVE / APPROVED material mutate | Blocked — create a new version |

Transitions encoded in `COMMERCIAL_GOVERNANCE_TRANSITIONS`.

### Maker / Checker (SoD)

- Policy flag: `requiresSegregationOfDuties` (default **true**).
- Maker cannot approve own submission when SoD is required.
- Roles: MAKER (create/edit/submit/override request) vs CHECKER (approve/reject/activate/suspend/override approve).
- Permissions: `CommercialManagement.Config.*` and `CommercialManagement.Override.*`.

### Material change detection

| Class | Fields (defaults) | Governance |
|-------|-------------------|------------|
| Material | `DEFAULT_MATERIAL_FIELD_PATHS` (unit price, rates, amounts, currency, treatment, scope, effective dates, …) | Approval path; ACTIVE/APPROVED material mutation blocked |
| Non-material | `label`, `description`, metadata / display notes | Lighter path (`NON_MATERIAL_UPDATED`) |

Material mutation of ACTIVE/APPROVED → fail closed → `createNewVersionDraft`.

### Effective dating

- Future `effectiveFrom` cannot activate early → `EFFECTIVE_DATE_NOT_REACHED` / `REVIEW_REQUIRED`.
- Expired / retired configurations are not commercially applicable to new resolution.

### Overrides

- Controlled; policy default `allowOverride=false`.
- Justification required when overrides are permitted.
- SoD applies on override approve.
- Unauthorized override fails explicitly.
- Captures business, actor, reason, original/overridden values, rule references, timestamps, approval status.

### Versioning

- `createNewVersionDraft` for successor drafts.
- Historical versions remain immutable.
- Prior ACTIVE version retired/superseded on activation of a successor.

### Audit

| Layer | Mechanism |
|-------|-----------|
| Domain | `commercial_governance_event` |
| Platform | ENG-013 `AuditService` — entity `COMMERCIAL_RULE_VERSION`, source `COMMERCIAL_GOVERNANCE` |

Event types include submit / approve / reject / activate / suspend / override request-approve-reject / material & non-material updates.

### Persistence

Migration: `drizzle/0055_bp005_ip008_commercial_governance.sql` — journal idx **59**.

| Table | Purpose |
|-------|---------|
| `commercial_governance_policy` | Per-business governance configuration |
| `commercial_rule_version` | Versioned governed commercial rules + lifecycle |
| `commercial_governance_event` | Domain governance event history |
| `commercial_override_request` | Controlled override requests |

Schema barrel (`src/db/schema/index.ts`) updated.

**Runtime store:** process-scoped `InMemoryCommercialGovernanceStore` via `getProcessCommercialGovernanceStore()` — schema ready for durable async Drizzle repos (`commercial-governance-drizzle-store.ts` scaffold); full async repository wiring deferred.

Permissions seeded (`permissions.ts`); MAKER/CHECKER matrix updated (`role-permissions.ts`).

### Authorization

| Permission | Intent |
|------------|--------|
| `CommercialManagement.Config.Create` | Create drafts |
| `CommercialManagement.Config.Update` | Edit drafts / policy |
| `CommercialManagement.Config.Execute` | Submit for approval |
| `CommercialManagement.Config.Approve` / `Reject` | Checker decisions |
| `CommercialManagement.Config.Activate` / `Deactivate` | Activate / suspend |
| `CommercialManagement.Config.Read` | View governance |
| `CommercialManagement.Override.Create` / `Approve` | Override request / approve |

**Gap:** workspace actions currently grant the actor the full Config/Override permission set until the platform RBAC checker ships — seed matrix is correct; runtime gate not fully enforced in the workspace.

### UX implementation

Route: `/commercial/governance`  
Nav: Commercial governance entry in `platform-nav-config.ts`.

Progression:

```text
Configuration → Review → Approval → Activation
```

Includes history table (version, status, actor, dates, approval/rejection), status badges, stepper, empty/loading/error/success states, action footer — no payment / RA / IP-09+ UI.

### Files created

| File | Purpose |
|------|---------|
| `03-platform/src/db/schema/commercial-governance-policy.ts` | Policy schema |
| `03-platform/src/db/schema/commercial-rule-version.ts` | Rule version schema |
| `03-platform/src/db/schema/commercial-governance-event.ts` | Domain event schema |
| `03-platform/src/db/schema/commercial-override-request.ts` | Override request schema |
| `03-platform/drizzle/0055_bp005_ip008_commercial_governance.sql` | Migration |
| `03-platform/src/modules/commercial/services/commercial-governance-service.ts` | Lifecycle, SoD, overrides, audit |
| `03-platform/src/modules/commercial/services/commercial-governance-rules.ts` | Transitions, materiality, decisions |
| `03-platform/src/modules/commercial/services/commercial-governance-store.ts` | In-memory store interface + impl |
| `03-platform/src/modules/commercial/services/commercial-governance-drizzle-store.ts` | Process-scoped store + Drizzle scaffold |
| `03-platform/src/modules/commercial/actions/commercial-governance-actions.ts` | Server actions |
| `03-platform/src/modules/commercial/components/commercial-governance-workspace.tsx` | Governance workspace UX |
| `03-platform/src/app/(authenticated)/(app)/commercial/governance/page.tsx` | Route page |
| `03-platform/scripts/bp005-ip08-commercial-governance-smoke-validation.ts` | Smoke + regressions |

### Files modified

| File | Change |
|------|--------|
| `03-platform/src/modules/commercial/constants.ts` | Lifecycle, decisions, permissions, material paths, transitions |
| `03-platform/src/modules/commercial/types.ts` | Governance / override / policy contracts |
| `03-platform/src/modules/commercial/errors.ts` | Governance error codes + messages |
| `03-platform/src/modules/commercial/index.ts` | Public IP-08 exports |
| `03-platform/src/core/audit/constants.ts` | `COMMERCIAL_RULE_VERSION`, `COMMERCIAL_GOVERNANCE` |
| `03-platform/src/db/seeds/permissions.ts` | `CommercialManagement.Config.*` / `Override.*` |
| `03-platform/src/db/seeds/role-permissions.ts` | MAKER / CHECKER matrix |
| `03-platform/src/lib/navigation/platform-nav-config.ts` | Nav entry |
| `03-platform/src/db/schema/index.ts` | Barrel exports |
| `03-platform/drizzle/meta/_journal.json` | idx 59 → `0055_bp005_ip008_commercial_governance` |
| `02-build-packs/.../IP-08 Commercial Governance.md` | This implementation record |

### Contracts

| Contract | Role |
|----------|------|
| `CommercialGovernanceDecision` | `ALLOWED` / `APPROVAL_REQUIRED` / `REJECTED` / `REVIEW_REQUIRED` + reason, rule, business, actor, approval ref, timestamp |
| `CommercialGovernancePolicy` | Approval, SoD, thresholds, override flags, material field paths |
| `CommercialRuleVersion` | Versioned rule + lifecycle + effective dating |
| `CommercialOverrideRequest` | Controlled override with justification and approval state |
| `CommercialSnapshot` (IP-06) | Validated by `validateSnapshotGovernance` without mutation |

### Service ownership

| Service / API | Ownership |
|---------------|-----------|
| `CommercialGovernanceService` | IP-08 — policy, draft/version, submit/approve/reject, activate/suspend, overrides, audit |
| `evaluateActivationDecision` / `buildGovernanceDecision` | Pure decision helpers |
| `validateSnapshotGovernance` | Post-snapshot governance check (non-mutating) |
| `createNewVersionDraft` | Immutable history + successor draft |
| IP-01–IP-07 | Unchanged calculation / snapshot / expected ownership |

### Test results

`npx tsx scripts/bp005-ip08-commercial-governance-smoke-validation.ts` — **42/42 PASS**

Includes:

| Area | Coverage |
|------|----------|
| File / migration / schema / UX checks | Presence + journal + barrel + no pricing master + nav/workspace |
| TC-01…TC-18 | Draft, submit, approve, SoD, reject, invalid transition, activate, future effective date, suspend, material/non-material, unauthorized, tenant isolation, override, version integrity, audit, IP-06/IP-07 compatibility |
| Extra core | TC-10b active mutation blocked; TC-14b authorized override |
| Regressions | BP-003 IP-011; BP-005 IP-01…IP-07 |

### Quality gates

| Gate | Result |
|------|--------|
| Lint (commercial IP-08 files) | Clean; `prefer-const` fixed. Full `npm run lint` may still show pre-existing unrelated warnings/errors. |
| Typecheck (commercial IP-08) | Clean. Pre-existing fail in `scripts/bp001-004-system-integration-certification.ts` (`"leads"`). |
| `npm run db:migrate` | **PASS** — `0055` applied |
| `npm run db:seed` | Required for permissions — attempted (permissions + role matrix) |

### Migration / schema / seed status

| Item | Status |
|------|--------|
| `_journal.json` | Updated — idx **59** |
| `schema/index.ts` | Updated — four governance exports |
| `permissions.ts` / `role-permissions.ts` | Updated |
| Migration required | **Yes** — `0055_bp005_ip008_commercial_governance.sql` |

### Intentional gaps

- No payment, revenue assurance, IP-09, IP-10, or IP-11
- No second pricing / tax / commercial calculation engine
- Async Drizzle repository not fully wired (in-memory process store + migrated tables ready)
- ENG-005 / ENG-003l — local stubs / hooks only (no full workflow/checklist engine integration)
- RBAC runtime gate not fully enforced in workspace (actor receives full Config/Override perms until platform checker ships)
- IP-09+ **not started**

### Downstream integration points

| Consumer | How to integrate |
|----------|------------------|
| Commercial resolution | Gate requests with `GovernanceDecision` before engine run |
| IP-06 / IP-07 | Call `validateSnapshotGovernance` on completed snapshots; never mutate |
| ENG-005 | Replace local approval stubs with workflow references when available |
| ENG-003l | Optional readiness checklist gate on activation |
| BP-001 RBAC | Enforce seeded Config/Override permissions at action boundary |

### Defects fixed during IP-08

- Prefer-const lint in commercial IP-08 sources

---

## Implementation Prompt Archive

This section preserves the complete Cursor implementation prompt used for IP-08 implementation and serves as the authoritative implementation record for this IP.

You are implementing BP-005 – Pricing, Tax & Commercial Rules.

Implementation Package

IP-08 — Commercial Governance

Implement IP-08 only.

Do not implement IP-09, IP-10, IP-11, payments, billing, receipting, orders, inventory, reconciliation, revenue assurance, or tax-remittance functionality.

Do not modify unrelated modules.

1. Objective

Implement the governance and control layer that ensures commercial pricing and resolution activity operates according to configured business rules, authority, lifecycle, auditability and control requirements.

IP-08 answers:

"Is this commercial configuration/resolution allowed, controlled, traceable and within the business's governance rules?"

It does not calculate the price, tax, discount, commission or expected amount.

Those remain owned by:

BP-003 → price master
IP-01   → base-price consumption
IP-03   → tax calculation
IP-04   → commercial components
IP-05   → precedence/conflict
IP-06   → commercial snapshot
IP-07   → expected commercial amount
IP-08   → governance/control
2. Mandatory Architecture Principle

Do not create a second commercial engine.

The governance layer must sit around commercial resolution rather than duplicate it.

Preferred architecture:

Commercial configuration / resolution request
              ↓
       IP-08 Governance
              ↓
       Allowed / Rejected /
       Requires Approval /
       Requires Review
              ↓
      Existing commercial engine
              ↓
 IP-06 Commercial Snapshot
              ↓
 IP-07 Expected Amount

Where appropriate, governance may also validate the completed result:

IP-06 Snapshot
      ↓
IP-08 Governance validation
      ↓
Governance-approved commercial result

Do not introduce circular dependencies.

3. Scope

IP-08 must cover governance concerns such as:

commercial configuration lifecycle
activation controls
effective dating controls
approval requirements
maker/checker separation where applicable
segregation of duties
controlled changes
audit/provenance
business-level governance
authorization
validation before activation/use
governance status
rejection/review reasons
controlled override handling
traceability of who changed what and when

The implementation should be configuration-driven, not hard-coded for one industry.

4. Governance State Model

Establish a clear lifecycle for governed commercial configurations.

At minimum support concepts equivalent to:

DRAFT
    ↓
PENDING_APPROVAL
    ↓
APPROVED
    ↓
ACTIVE
    ↓
SUSPENDED
    ↓
EXPIRED / RETIRED

Do not force every configuration to use every state if the existing architecture has a more appropriate lifecycle.

The important principle is:

A configuration must not become commercially effective merely because somebody created or edited it.

Governance must distinguish:

created
submitted
approved
activated
suspended
retired/expired
5. Maker / Checker

Where the platform's authorization model supports it, implement maker/checker controls.

At minimum:

The person creating or materially changing a governed commercial configuration must not be able to approve their own change where segregation of duties is required.

Support:

Maker
  ↓
Submit for approval
  ↓
Checker
  ↓
Approve / Reject

For rejection:

Rejected
   ↓
Reason required
   ↓
Maker can amend
   ↓
Resubmit

Do not create a new authentication system.

Use the existing platform identity/authentication context.

6. Governance Configuration

Do not hard-code:

Kenya = approval required
Industry X = approval required
Business Y = approval required

Instead provide a configurable governance model capable of expressing things such as:

approval required
number of approvers
approval threshold
effective-date restrictions
allowed override
mandatory justification
segregation-of-duty requirement
activation authority
change sensitivity

If persistence is required by the existing architecture, design it as governance configuration, not as another pricing/tax master.

7. Material Change Detection

Governance must distinguish between:

Non-material change

Examples may include:

description
display label
explanatory metadata
Material commercial change

Examples:

price
tax rate
discount
commission
charge
precedence
effective date
commercial applicability
customer/segment/channel scope
currency
commercial rule

Material changes must trigger the appropriate governance process.

Do not allow a material change to silently alter an already-approved/active commercial configuration.

8. Effective-Dated Governance

Governance must work with effective dating.

Examples:

Current configuration
KES 1,000
Effective: 2026-01-01

Future configuration
KES 1,100
Effective: 2026-09-01

The future configuration must not become active before its effective date merely because it was approved.

Similarly, an expired/retired configuration must not become applicable to new commercial resolution.

Coordinate with IP-01/IP-05 rather than duplicating price-selection logic.

9. Existing Transactions / Snapshots

This is critical.

Governance changes must not rewrite historical commercial results.

For example:

Transaction A
Commercial Snapshot
Expected = KES 1,000

Later:
Price changed → KES 1,200

Transaction A must remain:

KES 1,000

The new governance state applies only to future applicable resolutions.

This is one reason IP-06's immutable snapshot must remain authoritative for historical commercial meaning.

10. Overrides

Commercial overrides must be controlled.

An override must never mean:

"Ignore all commercial rules."

If an override is permitted, capture:

businessId
user/actor
reason
original value/result
overridden value/result
applicable rule/configuration
timestamp
authorization/approval
reference to commercial resolution/snapshot where applicable

An unauthorized override must fail explicitly.

Do not create payment or revenue-assurance override logic.

11. Auditability

Governance must provide a traceable history of material governance events.

At minimum capture concepts equivalent to:

WHO
WHAT
WHEN
BEFORE
AFTER
WHY
APPROVAL STATUS

Examples:

PRICE_CONFIGURATION_SUBMITTED
PRICE_CONFIGURATION_APPROVED
PRICE_CONFIGURATION_REJECTED
COMMERCIAL_RULE_ACTIVATED
COMMERCIAL_RULE_SUSPENDED
COMMERCIAL_OVERRIDE_REQUESTED
COMMERCIAL_OVERRIDE_APPROVED
COMMERCIAL_OVERRIDE_REJECTED

Use existing platform audit mechanisms where available.

Do not invent a second audit framework.

12. Business / Tenant Isolation

Every governance operation must be scoped by:

businessId

Business A must never:

see Business B's governance configurations
approve Business B's changes
activate Business B's rules
override Business B's commercial results

Cross-business access must fail explicitly.

13. Authorization

Governance permissions must be separate from ordinary commercial usage where appropriate.

Conceptually support permissions such as:

COMMERCIAL_CONFIG_CREATE
COMMERCIAL_CONFIG_EDIT
COMMERCIAL_CONFIG_SUBMIT
COMMERCIAL_CONFIG_APPROVE
COMMERCIAL_CONFIG_REJECT
COMMERCIAL_CONFIG_ACTIVATE
COMMERCIAL_CONFIG_SUSPEND
COMMERCIAL_OVERRIDE_REQUEST
COMMERCIAL_OVERRIDE_APPROVE

Do not create a new RBAC framework if the platform already has one.

Integrate with the existing authorization model.

14. Approval Thresholds

Where monetary thresholds are supported, make them configurable.

Example:

Change <= KES 10,000
    → standard approval

Change > KES 10,000
    → enhanced approval

Do not hard-code the KES example.

The model must support different currencies and business configurations.

Threshold evaluation must use the existing money abstraction.

Never use floating-point arithmetic for financial thresholds.

15. Governance Decisions

Create a clear governance decision contract.

Conceptually:

GovernanceDecision

decision:
  ALLOWED
  APPROVAL_REQUIRED
  REJECTED
  REVIEW_REQUIRED

reason
governanceRule
businessId
actor
approvalReference
timestamp

The exact naming may follow the existing commercial module conventions.

The result must be deterministic and explainable.

16. Fail Closed

Governance must fail closed where control cannot be established.

Examples:

Missing approval authority
Missing mandatory justification
Unauthorized approver
Material change without approval
Invalid lifecycle transition
Cross-business access
Invalid override
Conflicting governance configuration

Do not silently approve.

Do not silently select a default governance rule.

17. Lifecycle Transition Rules

Define explicit transition rules.

For example:

DRAFT → PENDING_APPROVAL
PENDING_APPROVAL → APPROVED
PENDING_APPROVAL → REJECTED
APPROVED → ACTIVE
ACTIVE → SUSPENDED
ACTIVE → EXPIRED
SUSPENDED → ACTIVE

Reject invalid transitions.

Example:

DRAFT → ACTIVE

must not be allowed if approval is required.

Likewise:

REJECTED → ACTIVE

must not be allowed without resubmission/approval.

18. Governance and IP-05

Do not duplicate precedence.

IP-05 owns:

Which eligible commercial rule wins?

IP-08 owns:

Whether the configuration/rule is properly governed and authorized to be used.

Therefore:

IP-05 = resolution precedence
IP-08 = governance authority/control

Keep these responsibilities separate.

19. Governance and IP-06/IP-07

IP-06 remains responsible for freezing the commercial result.

IP-07 remains responsible for expected amount.

IP-08 may validate that the commercial configuration/result satisfies governance requirements, but must not recalculate:

price
tax
commission
discount
payable

The dependency must not become:

IP-08 → re-run IP-01/IP-03/IP-04

unless absolutely necessary for governance validation and without creating duplicate calculation logic.

20. UX §14 — Governance Workspace

If IP-08 requires user interaction, implement the governance experience using the existing platform UX standards.

Use the existing progressive workspace patterns.

Potential route:

/commercial/governance

Use the actual route convention if a more appropriate existing route exists.

The UI must provide:

Progressive navigation
Configuration
   ↓
Review
   ↓
Approval
   ↓
Activation
Required UX standards
stepper/progression where multi-step
search
filtering
empty states
loading state
success feedback
errors near the relevant field/section
clear Previous / Next actions
clear primary action
clear next action
contextual guidance
action footer
no dead-end states
clear status badges
approval/rejection reason visibility
audit/history visibility
obvious distinction between draft/approved/active/suspended

Do not build UI for functionality that is explicitly outside IP-08.

21. Governance History

Where a governed configuration is displayed, provide an appropriate history view showing:

Version
Status
Changed by
Changed date
Change summary
Approval status
Approver
Approval date
Rejection reason

Do not expose sensitive information unnecessarily.

22. Persistence

Unlike IP-06/IP-07, governance configuration and approval history may require durable storage.

First inspect the existing schema and architecture.

If persistence is genuinely required:

create appropriate tables
enforce business isolation
enforce lifecycle integrity
enforce approval relationships
preserve historical versions
create required indexes
add migrations

Do not create:

another pricing master
another tax master
another commercial transaction table
duplicate product/pricing tables

If no persistence is actually required for the implemented governance scope, do not invent tables.

If migrations are required, update:

drizzle/meta/_journal.json
src/db/schema/index.ts

through the established integration rules.

Do not bypass migration governance.

23. Versioning

Material commercial configurations should be versionable.

Example:

Rule v1 → APPROVED → ACTIVE
Rule v2 → DRAFT

Editing v2 must not mutate the historical meaning of v1.

The system must be able to establish:

"Which approved governance version was applicable at the time?"

This should align with the commercial provenance/snapshot architecture.

24. Testing

Create:

scripts/bp005-ip08-commercial-governance-smoke-validation.ts

Include at minimum:

TC-01 — Draft creation

Valid governed configuration starts in the correct lifecycle state.

TC-02 — Submit for approval

Draft can be submitted when all mandatory governance requirements are satisfied.

TC-03 — Approval

Authorized checker can approve.

TC-04 — Self-approval rejection

Maker cannot approve own material change where segregation of duties applies.

TC-05 — Rejection

Checker rejects with mandatory reason.

TC-06 — Invalid lifecycle transition

Invalid transitions fail.

TC-07 — Activation

Approved configuration can become active subject to effective-date rules.

TC-08 — Future effective date

Future configuration does not become effective prematurely.

TC-09 — Suspension

Active configuration can be suspended by an authorized actor.

TC-10 — Material change

Material commercial change triggers governance appropriately.

TC-11 — Non-material change

Non-material change follows the appropriate lighter governance path.

TC-12 — Unauthorized action

Unauthorized user cannot approve/activate/suspend.

TC-13 — Tenant isolation

Business A cannot operate on Business B governance records.

TC-14 — Override control

Unauthorized override fails; authorized override requires appropriate justification/approval.

TC-15 — Historical version integrity

Changing a later version does not alter the earlier approved version.

TC-16 — Audit

Governance actions generate appropriate audit history.

TC-17 — IP-06 compatibility

Governance does not mutate an existing commercial snapshot.

TC-18 — IP-07 compatibility

Expected commercial amount remains derived from the same immutable snapshot.

TC-19 — IP-01/IP-05 regression

Existing price resolution continues to work.

TC-20 — IP-03/IP-04 regression

Existing tax/component composition continues to work.

TC-21 — IP-06/IP-07 regression

Existing commercial snapshot and expected amount tests continue to pass.

Do not weaken existing tests.

25. Quality Gates

Run:

npm run lint
npm run typecheck
npm run db:migrate
npm run db:seed

Only make seed changes where genuinely required.

If migrations/schema/seed are unchanged, explicitly report:

No _journal.json changes
No schema/index.ts changes
No seed.ts changes
No migration required

If migrations are introduced, ensure:

SQL ↔ journal = complete
No orphan migrations
No missing journal entries
Schema barrel updated
Migration applies successfully
26. Regression Scope

Before declaring IP-08 complete, run relevant regression tests for:

BP-003 IP-011
BP-005 IP-01
BP-005 IP-02
BP-005 IP-03
BP-005 IP-04
BP-005 IP-05
BP-005 IP-06
BP-005 IP-07

The existing commercial-resolution workspace must continue working.

27. Explicitly Out of Scope

Do NOT implement:

payment
payment allocation/split
cash/M-Pesa/card settlement
billing
receipting
orders
fulfilment
inventory
reconciliation
revenue assurance
actual-vs-expected variance
tax remittance
tax filing
tax calendars
tax payment evidence
country-specific tax compliance engines
IP-09
IP-10
IP-11
new pricing master
new tax master
new product master
duplicate commercial calculation engine

The previously identified IP-11 tax compliance requirements remain separate and must not be pulled into IP-08.

28. Documentation

Update:

BP-005 IP-08 – Commercial Governance.md

Include:

Implementation status
Objective
Scope
Architecture boundary
Governance lifecycle
Approval model
Authorization
Material-change rules
Override rules
Versioning
Auditability
Persistence/schema impact
UX implementation
Smoke-test results
Regression results
Quality gates
Defects fixed
Intentional gaps
Downstream integration
Migration/schema/seed status

At the bottom of the document append:

Implementation Prompt Archive
This section preserves the complete Cursor implementation prompt used for IP-08 implementation and serves as the authoritative implementation record for this IP.

Then paste this complete prompt into that section.

29. Stop Condition

After IP-08 is implemented, tested and documented:

STOP.

Do not start IP-09, IP-10 or IP-11.

Do not commit.

Do not fix unrelated pre-existing failures.

Return a handover containing:

Status
Files created
Files modified
Architecture flow
Governance model
Lifecycle states/transitions
Approval/SoD behaviour
Versioning behaviour
Override behaviour
Audit behaviour
UX changes
Smoke-test results
Regression results
Quality gates
Migration/schema/seed impact
Defects fixed
Intentional gaps
Downstream integration points
Confirmation that IP-09+ were not started

Implement IP-08 only, validate it, document it, and stop.


# Test Package – IP-006 Business Activation & Configuration Wizard

| Field | Value |
|-------|--------|
| Release | Release 1 – Platform Foundation |
| Build Pack | BP-001 – Business Setup & Onboarding |
| Implementation Package | IP-006 – Business Activation & Configuration Wizard |
| Architecture Dependency | AD-009 Authentication & Business Onboarding (A4) |
| Test Script | `03-platform/scripts/ip006-smoke-validation.ts` |
| Execution Command | `npx tsx scripts/ip006-smoke-validation.ts` |
| Test Date | 2026-07-24 |
| Environment | Local (deterministic smoke; no live DB mutations) |
| Overall Result | **PASS** |

---

## 1. Scope

This test package records all automated smoke / quality-gate checks executed for IP-006, including:

- File completeness
- Zod validators
- Step catalogue / wizard version
- Service factory importability
- Happy path (register → setup → activate → dashboard eligibility)
- Optional path (skip AI / Loyalty)
- Negative path (duplicates, missing base currency, DRAFT access)
- Resume path (save progress → resume)
- Configuration metadata model
- Prerequisite IP-005 smoke (regression)
- Typecheck, ESLint, production build

Manual browser end-to-end verification against a live database remains outside this package (see Section 8).

---

## 2. Summary Results

| Suite | Checks | Passed | Failed | Result |
|-------|--------|--------|--------|--------|
| IP-006 Smoke Validation | 51 | 51 | 0 | PASS |
| IP-005 Smoke (prerequisite regression) | 24 | 24 | 0 | PASS |
| TypeScript (`npm run typecheck`) | — | — | — | PASS |
| ESLint (`npm run lint`) | — | — | — | PASS |
| Production Build (`npm run build`) | — | — | — | PASS |

**IP-006 smoke: 51/51 checks passed.**

---

## 3. Traceability to Business Rules / FRs

| Test Area | Related BR / FR |
|-----------|-----------------|
| Happy path DRAFT → ACTIVE → dashboard | BR-007, BR-008, BR-011, BR-012, BR-013, FR-013 |
| Optional AI / Loyalty skip | BR-003, BR-007 |
| Duplicate currency rejection | BR-005, FR-008 |
| Activation without base currency rejected | BR-004, BR-008, FR-009 |
| Operational access blocked while DRAFT | BR-013 |
| Resume from last completed step | BR-006, BR-009, FR-004, FR-005 |
| Progress indicator / catalogue | FR-002 |
| Country → currency defaults (service design) | BR-001, BR-002, FR-006 |
| Configuration metadata model | FR-012 |

---

## 4. Test Cases and Results

### 4.1 File Completeness (22 checks) — PASS

Verifies every required IP-006 production file exists on disk.

| ID | Test Case | Result |
|----|-----------|--------|
| TC-FILE-01 | `business-setup-service.ts` exists | PASS |
| TC-FILE-02 | `setup-rules.ts` exists | PASS |
| TC-FILE-03 | `setup-actions.ts` exists | PASS |
| TC-FILE-04 | `setup-validators.ts` exists | PASS |
| TC-FILE-05 | `constants.ts` exists | PASS |
| TC-FILE-06 | `setup-wizard.tsx` exists | PASS |
| TC-FILE-07 | `setup-progress-indicator.tsx` exists | PASS |
| TC-FILE-08 | `business-configuration-repository.ts` exists | PASS |
| TC-FILE-09 | `business-setup-progress-repository.ts` exists | PASS |
| TC-FILE-10 | `setup/page.tsx` exists | PASS |
| TC-FILE-11 | `setup/layout.tsx` exists | PASS |
| TC-FILE-12 | `setup/[step]/page.tsx` exists | PASS |
| TC-FILE-13 | `setup/activated/page.tsx` exists | PASS |
| TC-FILE-14 | `business-profile` schema exists | PASS |
| TC-FILE-15 | `business-operating-currency` schema exists | PASS |
| TC-FILE-16 | `business-configuration` schema exists | PASS |
| TC-FILE-17 | `business-setup-progress` schema exists | PASS |
| TC-FILE-18 | `currency` schema exists | PASS |
| TC-FILE-19 | `currencies` seed data exists | PASS |
| TC-FILE-20 | `currencies-seed.ts` exists | PASS |
| TC-FILE-21 | Migration `0002_ip006_business_setup.sql` exists | PASS |
| TC-FILE-22 | Migration `0003_ip006_configuration_metadata.sql` exists | PASS |

---

### 4.2 Zod Validators (6 checks) — PASS

| ID | Test Case | Input Summary | Expected | Result |
|----|-----------|---------------|----------|--------|
| TC-VAL-01 | `businessDetailsSchema` accepts valid profile payload | logo, email, address, county, city | Valid | PASS |
| TC-VAL-02 | `countryStepSchema` accepts ISO country code | `KE` | Valid | PASS |
| TC-VAL-03 | `baseCurrencySchema` accepts ISO currency code | `KES` | Valid | PASS |
| TC-VAL-04 | `additionalCurrenciesSchema` accepts currency list | `["USD"]` | Valid | PASS |
| TC-VAL-05 | `paymentMethodsSchema` requires ≥1 enabled method | Cash + Mobile Money on | Valid | PASS |
| TC-VAL-06 | `receiptConfigurationSchema` accepts receipt + tax | prefix, footer, tax 16% | Valid | PASS |

---

### 4.3 Step Catalogue (5 checks) — PASS

| ID | Test Case | Expected | Result |
|----|-----------|----------|--------|
| TC-CAT-01 | Review is mandatory | Included in `MANDATORY_SETUP_STEPS` | PASS |
| TC-CAT-02 | Additional Currencies is optional | Included in `OPTIONAL_SETUP_STEPS` | PASS |
| TC-CAT-03 | AI Toggle is optional | Included in `OPTIONAL_SETUP_STEPS` | PASS |
| TC-CAT-04 | Loyalty Toggle is optional | Included in `OPTIONAL_SETUP_STEPS` | PASS |
| TC-CAT-05 | Wizard version is `1.0.0` | `SETUP_WIZARD_VERSION === "1.0.0"` | PASS |

---

### 4.4 Service Factory (2 checks) — PASS

| ID | Test Case | Expected | Result |
|----|-----------|----------|--------|
| TC-FAC-01 | `createBusinessSetupService()` is importable | `getSetupProgress` is a function | PASS |
| TC-FAC-02 | Activation API present | `activateBusiness` is a function | PASS |

---

### 4.5 Happy Path (4 checks) — PASS

Simulates: Register Business → Complete setup → Activate → Dashboard eligibility.

| ID | Test Case | Description | Expected | Result |
|----|-----------|-------------|----------|--------|
| TC-HAP-01 | Register → setup (DRAFT) | After registration business is DRAFT; operational access denied | `isOperationalAccessAllowed(DRAFT) === false` | PASS |
| TC-HAP-02 | Complete setup (mandatory) | All mandatory steps completed | `areMandatoryStepsComplete === true` | PASS |
| TC-HAP-03 | Activate eligible | Mandatory complete and base currency present | Activate allowed | PASS |
| TC-HAP-04 | Redirect to dashboard | ACTIVE unlocks operational modules | `isOperationalAccessAllowed(ACTIVE) === true` | PASS |

Smoke IDs: `happy:registerToSetupEligible`, `happy:completeSetupMandatory`, `happy:activateEligible`, `happy:redirectDashboardEligible`

---

### 4.6 Optional Path (3 checks) — PASS

| ID | Test Case | Description | Expected | Result |
|----|-----------|-------------|----------|--------|
| TC-OPT-01 | Skip optional AI configuration | AI step omitted; mandatory still complete | Activate still allowed | PASS |
| TC-OPT-02 | Skip optional Loyalty configuration | Loyalty step omitted; mandatory still complete | Activate still allowed | PASS |
| TC-OPT-03 | Activate successfully after skips | Mandatory + base currency satisfied | Activation eligible | PASS |

Smoke IDs: `optional:skipAiStillMandatoryComplete`, `optional:skipLoyaltyStillMandatoryComplete`, `optional:activateSuccessfully`

---

### 4.7 Negative Tests (4 checks) — PASS

| ID | Test Case | Description | Expected | Result |
|----|-----------|-------------|----------|--------|
| TC-NEG-01 | Reject duplicate operating currency | Additional list includes base (`KES` + `KES`) | Duplicate detected | PASS |
| TC-NEG-02 | Reject duplicate within additional list | `["USD","USD"]` | Duplicate detected | PASS |
| TC-NEG-03 | Reject activation without mandatory Base Currency | Base currency step removed from completed set | Activation blocked | PASS |
| TC-NEG-04 | Reject operational access while DRAFT | Status = DRAFT | Operational access denied | PASS |

Smoke IDs: `negative:rejectDuplicateOperatingCurrency`, `negative:rejectDuplicateWithinAdditional`, `negative:rejectActivationWithoutBaseCurrency`, `negative:rejectOperationalAccessWhileDraft`

---

### 4.8 Resume Test (2 checks) — PASS

| ID | Test Case | Description | Expected | Result |
|----|-----------|-------------|----------|--------|
| TC-RES-01 | Save progress | Complete Welcome then Business Details | `lastCompletedStep = business-details` | PASS |
| TC-RES-02 | Resume wizard from last completed step | Resolve next incomplete step | Resume at `country` | PASS |

Smoke IDs: `resume:saveProgressTracksLastCompleted`, `resume:resumeFromLastCompletedStep`

---

### 4.9 Configuration Metadata Model (3 checks) — PASS

| ID | Test Case | Description | Expected | Result |
|----|-----------|-------------|----------|--------|
| TC-CFG-01 | Default settings document | Defaults for payment / features | Cash on; AI off | PASS |
| TC-CFG-02 | Merge preserves sibling groups | Patch AI feature only | Payments unchanged | PASS |
| TC-CFG-03 | Flattened view for UI | Nested settings → flat view | AI on; receipt prefix `RCPT` | PASS |

Smoke IDs: `config:metadataDefaultDocument`, `config:metadataMergePreservesSiblings`, `config:flattenedViewForUi`

---

## 5. Prerequisite Regression – IP-005 Smoke

Executed to confirm prior auth UI package remains intact.

| Suite | Result |
|-------|--------|
| IP-005 Authentication UI smoke | **24/24 PASS** |

---

## 6. Quality Gates

| Gate | Command | Result |
|------|---------|--------|
| TypeScript | `npm run typecheck` | PASS |
| ESLint | `npm run lint` | PASS |
| Production Build | `npm run build` | PASS |
| Routes compiled | `/setup`, `/setup/[step]`, `/setup/activated`, `/dashboard` | PASS |

---

## 7. Execution Log (excerpt)

```
Running IP-006 Business Activation & Configuration smoke validation...

PASS  ... (51 checks)

IP-006 smoke validation: 51/51 checks passed.

IP-005 smoke validation: 24/24 checks passed.

> typecheck → pass
> lint → pass
> build → pass
```

---

## 8. Remaining Manual Verification (Not Automated)

These are **not** covered by the deterministic smoke script and should be verified manually against a live database after `db:migrate` + `db:seed`:

| ID | Manual Case | Status |
|----|-------------|--------|
| MAN-01 | Register a new owner/business end-to-end | Pending manual |
| MAN-02 | Walk all wizard steps including optional skips | Pending manual |
| MAN-03 | Confirm country change reloads default currency | Pending manual |
| MAN-04 | Activate and confirm `Welcome to {Business Name}` then dashboard | Pending manual |
| MAN-05 | Confirm DRAFT cannot open `/dashboard` | Pending manual |
| MAN-06 | Logout / login and resume mid-wizard | Pending manual |

---

## 9. Sign-off

| Role | Name | Date | Decision |
|------|------|------|----------|
| Implementation (Cursor) | Automated smoke + quality gates | 2026-07-24 | Ready for review |
| Manual Reviewer | | | Awaiting approval |

**Verdict:** All automated IP-006 test cases executed in this package **PASSED** (51/51 smoke + quality gates). Manual E2E verification remains outstanding (Section 8).

## BP-002 – IP-013 Identity & Regulatory Information

### Scope

Introduce **ENG-003j – Identity & Regulatory Identification Engine** — a reusable platform capability that captures official regulatory identifiers belonging to a Party.

> Uploaded documents are **evidence**. Regulatory identifiers are **master data**. Those are different concepts.

This is a **Digitalization Platform** capability — not a Party-specific shortcut. Future verticals (Banking, Insurance, Property, Healthcare, etc.) consume the same engine.

---

## Deliverables

### 1. Identity & Regulatory Tab (Party Workspace)

Position: **Groups → Identity & Regulatory → Timeline**

Four sections:

1. **Regulatory Profile Summary** — country, rule set, verification %, required/captured/verified/missing/expired counts
2. **Required Identifiers** — table with capture/edit/verify actions (from ENG-003b config)
3. **Captured Identifiers** — masked values, verification status, evidence link, expiry
4. **Verification** — manual today; architecture ready for government/partner APIs

### 2. ENG-003b Configuration Extension

New configuration entities:

| Entity | Owner | Purpose |
|--------|-------|---------|
| `identifier_type` | ENG-003b | Platform catalogue (National ID, KRA PIN, etc.) |
| `required_identifier` | ENG-003b | Required/optional identifiers per rule set |

No hardcoded identifier types in the Party module.

### 3. ENG-003j Core Engine

| Component | Path |
|-----------|------|
| Service | `03-platform/src/core/identity-regulatory/services/identity-regulatory-service.ts` |
| Repository | `03-platform/src/core/identity-regulatory/repositories/party-identity-identifier-repository.ts` |
| Profile assembler | `03-platform/src/core/identity-regulatory/services/identifier-profile-assembler.ts` |
| Masking | `03-platform/src/core/identity-regulatory/helpers/masking.ts` |
| Verification provider abstraction | `03-platform/src/core/identity-regulatory/providers/verification-provider.ts` |
| OCR comparison abstraction | `03-platform/src/core/identity-regulatory/providers/ocr-comparison-provider.ts` |

### 4. Database Entity

`party_identity_identifier` — master data for captured regulatory identifiers with optional `linked_document_id` evidence reference.

### 5. Onboarding Guided Step

Flow: **Party Registration → Identity & Regulatory → Documents → Finish**

Route: `/parties/[partyId]/onboarding/identity-regulatory`

Registration screen remains uncluttered; identifiers captured in a dedicated guided step.

### 6. Timeline & Audit

Timeline events: `IDENTIFIER_CAPTURED`, `IDENTIFIER_UPDATED`, `IDENTIFIER_VERIFIED`, `IDENTIFIER_EXPIRED`, `IDENTIFIER_REMOVED`

Audit entity: `party_identity_identifier` with field-level change tracking.

### 7. Security

- Masked display by default (`********5678`)
- Permission `PartyManagement.PartyIdentityIdentifier.ReadFull` for unmasked values

---

## Architecture

```text
UI → Server Actions → PartyIdentityRegulatoryService → IdentityRegulatoryService (ENG-003j)
                                                     ↘ RegulatoryIdentifierRequirementsService (ENG-003b)
                                                     ↘ PartyTimelineService / AuditService
```

**Separation of concerns:**

- **ENG-003b** — configuration (what identifiers are required, validation patterns)
- **ENG-003j** — captured identifier master data
- **ENG-015a / party_document** — uploaded evidence only

---

## IP-013 Completion Status

**Status:** Implemented — pending `db:migrate`, `db:seed`, and manual verification.

### Files Created

- `03-platform/src/db/schema/identifier-type.ts`
- `03-platform/src/db/schema/required-identifier.ts`
- `03-platform/src/db/schema/party-identity-identifier.ts`
- `03-platform/drizzle/0026_eng003b_required_identifiers.sql`
- `03-platform/drizzle/0027_bp002_ip013_party_identity_identifier.sql`
- `03-platform/src/db/seeds/identifier-types.ts`
- `03-platform/src/db/seeds/required-identifiers.ts`
- `03-platform/src/db/seeds/identifier-types-seed.ts`
- `03-platform/src/db/seeds/required-identifiers-seed.ts`
- `03-platform/src/core/identity-regulatory/` (engine)
- `03-platform/src/core/localization-regulatory/services/regulatory-identifier-requirements-service.ts`
- `03-platform/src/modules/party/services/party-identity-regulatory-service.ts`
- `03-platform/src/modules/party/actions/party-identity-regulatory-actions.ts`
- `03-platform/src/modules/party/validators/party-identity-regulatory-validators.ts`
- `03-platform/src/modules/party/components/party-identity-regulatory-panel.tsx`
- `03-platform/src/modules/party/components/party-identity-regulatory-onboarding-step.tsx`
- `03-platform/src/app/(authenticated)/(app)/parties/[partyId]/onboarding/identity-regulatory/page.tsx`
- `03-platform/scripts/bp002-ip013-identity-regulatory-smoke-validation.ts`

### Files Modified

- `03-platform/src/db/schema/index.ts`
- `03-platform/src/db/seed.ts`
- `03-platform/drizzle/meta/_journal.json`
- `03-platform/src/core/localization-regulatory/types.ts`
- `03-platform/src/core/localization-regulatory/repositories/regulatory-config-repository.ts`
- `03-platform/src/core/localization-regulatory/index.ts`
- `03-platform/src/modules/party/constants.ts`
- `03-platform/src/modules/party/types.ts`
- `03-platform/src/modules/party/components/party-workspace.tsx`
- `03-platform/src/modules/party/repositories/party-reference-repository.ts`
- `03-platform/src/app/(authenticated)/(app)/parties/[partyId]/page.tsx`
- `03-platform/src/core/party-timeline/constants.ts`
- `03-platform/src/core/audit/constants.ts`
- `03-platform/src/core/platform/party-next-actions.ts`
- `03-platform/src/db/seeds/permissions.ts`
- `01-enterprise-architecture/02-Platform-Module-Catalog.md`
- `01-enterprise-architecture/01-Enterprise-Solution-Architecture.md`

### Manual Verification Steps

1. Run `npm run db:migrate` then `npm run db:seed`
2. Register a new Individual Party → follow **Capture Identity & Regulatory** next action
3. Confirm required identifiers load from ENG-003b (e.g. National ID, KRA PIN for Kenya Individual)
4. Capture an identifier → verify masked display in Captured Identifiers table
5. Verify identifier → confirm verification % increases
6. Link evidence document → confirm `linked_document_id` reference without duplicating document data
7. Open Party Workspace → **Identity & Regulatory** tab (between Groups and Timeline)
8. Confirm timeline events and audit history entries for capture/update/verify/remove

### Quality Gate

| Gate | Command |
|------|---------|
| Typecheck | `npm run typecheck` |
| ESLint | `npm run lint` |
| Production build | `npm run build` |
| Smoke tests | `npx tsx scripts/bp002-ip013-identity-regulatory-smoke-validation.ts` |

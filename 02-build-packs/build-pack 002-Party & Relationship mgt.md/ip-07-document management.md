## BP-002 – IP-007 Documents & Compliance

### Scope

Transform **PC-012 – Party Documents** from a generic document repository into a **Party-centric compliance capability** that answers:

> **Is this Party compliant?**

This is a **Digitalization Platform** capability — not an ERP document module. The Documents tab stores **evidence**; **ENG-003b Localization & Regulatory Engine** owns applicable document requirements.

Design preserves the existing storage abstraction and `party_document` metadata model. Upload, verify, replace, and lifecycle rules are unchanged — only presentation and compliance orchestration are extended.

---

## Deliverables

### 1. Documents & Compliance Tab

Party Workspace tab renamed to **Documents & Compliance** with five sections:

1. **Compliance Summary** — country, rule set, compliance %, required/uploaded/verified/expired/missing counts
2. **Required Documents** — all applicable requirements (including missing), with upload/replace/view/verify actions
3. **Uploaded Documents** — existing repository (preview, download, replace, deactivate, reactivate, soft delete, hash, audit trail)
4. **Verification** — status, verified by, date, method (manual), comments; API-ready architecture
5. **AI Compliance Insights** — collapsed placeholder (no OCR/RAG in this IP)

### 2. ENG-003b Integration

Applicable document requirements loaded from ENG-003b configuration by:

- Country (party default address → business operating country fallback)
- Party Type
- Industry (Organization profile; optional rule-set scoping)

**No hardcoded** document types in the Party module.

### 3. Compliance Rules

- Compliance % = verified required documents ÷ total required documents
- Optional documents do not affect score
- Missing required → status `MISSING`, upload action visible
- Expired documents highlighted (amber)
- Manual verification only; architecture ready for regulator APIs

### 4. Unchanged Upload Engine

PDF, JPG, JPEG, PNG — max 10 MB. Duplicate detection, soft delete, version replacement via `supersedes_document_id`.

---

## Architecture

```text
UI → Server Actions → PartyDocumentService → PartyDocumentRepository → Drizzle → PostgreSQL
                      ↘ RegulatoryDocumentRequirementsService (ENG-003b)
                      ↘ StorageProvider → Supabase Storage
```

Business rules:

- **ENG-003b** — requirement resolution (configuration)
- **party-document-compliance-rules** — evidence matching & score calculation
- **PartyDocumentService** — orchestration

---

## IP-007 Completion Status

**Status:** Rebuilt — Documents & Compliance (Party-centric). Pending `db:migrate`, `db:seed`, and Supabase bucket for live uploads.

### Files Created

- `03-platform/src/db/schema/regulatory-rule-set.ts`
- `03-platform/src/db/schema/regulatory-document-requirement.ts`
- `03-platform/drizzle/0019_eng003b_regulatory_document_requirements.sql`
- `03-platform/src/db/seeds/regulatory-document-requirements.ts`
- `03-platform/src/db/seeds/regulatory-document-requirements-seed.ts`
- `03-platform/src/core/localization-regulatory/types.ts`
- `03-platform/src/core/localization-regulatory/index.ts`
- `03-platform/src/core/localization-regulatory/repositories/regulatory-config-repository.ts`
- `03-platform/src/core/localization-regulatory/services/regulatory-document-requirements-service.ts`
- `03-platform/src/modules/party/services/party-document-compliance-rules.ts`

### Files Modified

- `03-platform/src/db/schema/index.ts`
- `03-platform/src/db/seed.ts`
- `03-platform/drizzle/meta/_journal.json`
- `03-platform/src/modules/party/constants.ts` — tab label **Documents & Compliance**
- `03-platform/src/modules/party/types.ts` — compliance view models
- `03-platform/src/modules/party/services/party-document-service.ts` — ENG-003b integration
- `03-platform/src/modules/party/repositories/party-address-repository.ts` — primary country lookup
- `03-platform/src/modules/party/components/party-documents-panel.tsx` — five-section UI
- `03-platform/src/modules/party/components/party-workspace.tsx`
- `03-platform/scripts/bp002-ip007-party-documents-smoke-validation.ts`

### Database Entities

| Entity | Owner | Purpose |
|--------|-------|---------|
| `document_type` | Platform catalogue | Document type names/codes |
| `party_document` | BP-002 IP-007 | Evidence storage metadata |
| `regulatory_rule_set` | ENG-003b | Country/party-type/industry policies |
| `regulatory_document_requirement` | ENG-003b | Required/optional documents per rule set |

No changes to `party_document` schema.

### Business Rules Implemented

| Rule | Implementation |
|------|----------------|
| Requirements from ENG-003b | `RegulatoryDocumentRequirementsService.resolveDocumentRequirements` |
| No hardcoded document types in Party module | Requirements loaded from DB configuration |
| Compliance % | Verified required ÷ total required (optional excluded) |
| Missing requirements visible | Required Documents table lists all applicable types |
| Expired highlighting | Amber badge + summary count |
| Manual verification | `verifyDocument` unchanged; method shown as MANUAL |
| Upload engine unchanged | Same service methods and storage abstraction |

### Seed Configuration (initial)

| Rule Set | Country | Party Type | Required (examples from config) |
|----------|---------|------------|----------------------------------|
| Individual - Kenya | KE | INDIVIDUAL | 3 required (+ optional) |
| Organization - Kenya | KE | ORGANIZATION | 4 required (+ optional) |

Document type **codes** reference `document_type` catalogue — labels are not hardcoded in Party code.

### Quality Gate Results

| Gate | Result |
|------|--------|
| Typecheck | Pass (after rebuild) |
| ESLint | Pass (after rebuild) |
| Production build | Pass (after rebuild) |
| Smoke tests | Pass (after rebuild) |

### Manual Verification Steps

1. Run `npm run db:migrate` then `npm run db:seed`
2. Ensure Supabase Storage bucket `party-documents` exists (private)
3. Open a Party Workspace → **Documents & Compliance** tab
4. Confirm Compliance Summary shows country and rule set (e.g. Individual - Kenya)
5. Confirm Required Documents lists all applicable types including missing rows
6. Upload a required document → status moves to UPLOADED
7. Verify document → status VERIFIED; compliance % increases
8. Set expiry date in the past → status EXPIRED (amber)
9. Confirm Uploaded Documents section retains preview/download/replace/deactivate/remove/hash
10. Confirm Verification table shows manual method and verifier
11. Confirm AI section is collapsed placeholder only
12. Re-run smoke: `npx tsx scripts/bp002-ip007-party-documents-smoke-validation.ts`

---

## Handover

1. **Build Pack:** BP-002 – Party & Relationship Management
2. **Implementation Package:** IP-007 – Documents & Compliance
3. **Completion Status:** Rebuilt from document repository to Party-centric compliance view
4. **Architecture alignment:** UI → Server Actions → Services → Repositories → Drizzle; ENG-003b owns regulatory configuration; Party module stores evidence only
5. **Services:** `PartyDocumentService`, `RegulatoryDocumentRequirementsService` (ENG-003b), `party-document-compliance-rules`
6. **UI:** `PartyDocumentsPanel` (5 sections), tab **Documents & Compliance** in `PartyWorkspace`
7. **Enterprise Standards:** EDS-001 (base entity), Localization First Principle (ENG-003b)
8. **Known limitations:** ENG-003b slice covers document requirements only (not full localization); no regulator API verification; no OCR/RAG; AI placeholder only; additional countries require ENG-003b configuration + seed, not Party code changes
9. **Remaining IPs in BP-002:** Groups, Timeline, Communication Preferences, Audit History (future tabs)
10. **Do not proceed to IP-008** until this IP is approved

### Future Enhancements

- Full ENG-003b admin UI for rule sets and requirements
- Industry-specific rule set overrides per country
- Regulator API verification (KRA PIN, company registry, etc.)
- OCR extraction and AI compliance insights (placeholder prepared)
- Expiry notifications and compliance dashboards
- Additional storage providers (S3, Azure, GCS)

**Await approval before proceeding to the next Implementation Package.**

---

## Platform Architecture Refactor (Post IP-007)

**Status:** Complete — architecture-only refactor; no user-facing behaviour change.

### Architecture Changes

```text
Core Platform – Document & Compliance (core/document-compliance)
        ↓
Party Module (first consumer — BP-002 IP-007)
        ↓
Future Build Packs (Property, HR, Fleet, Projects, Loans, …)
```

- Reusable compliance logic moved to `03-platform/src/core/document-compliance/`
- ENG-003b config table renamed: `regulatory_document_requirement` → `required_document`
- Validity status and verification status separated internally; UI display status unchanged
- Verification methods configurable via `verification_method` catalogue + `party_document.verification_method_code`

### Files Created (Refactor)

- `03-platform/src/core/document-compliance/**`
- `03-platform/src/db/schema/required-document.ts`
- `03-platform/src/db/schema/verification-method.ts`
- `03-platform/drizzle/0020_document_compliance_platform_refactor.sql`
- `03-platform/src/db/seeds/verification-methods.ts`
- `03-platform/src/db/seeds/verification-methods-seed.ts`
- `03-platform/src/modules/party/adapters/party-document-evidence-adapter.ts`

### Business Rule Changes

**None.** Compliance %, scoring, UI sections, upload engine, and storage provider behaviour are unchanged.

### Documentation Updates

- `01-enterprise-architecture/01-Enterprise-Solution-Architecture.md` — ENG-015a Document & Compliance Engine
- `01-enterprise-architecture/02-Platform-Module-Catalog.md` — Core Platform capability + reuse rule

### Migration Impact

Run `npm run db:migrate` then `npm run db:seed` for migration `0020`:

- Renames `regulatory_document_requirement` → `required_document` (if present)
- Creates `verification_method` catalogue
- Adds `party_document.verification_method_code` (nullable; set to `MANUAL` on verify)

### Future Reuse Guidance

1. Import compliance assembly from `@/core/document-compliance`
2. Resolve requirements from `@/core/localization-regulatory` (ENG-003b)
3. Map module-specific evidence rows to `DocumentEvidenceRecord`
4. Do **not** duplicate compliance scoring or requirement matching in Build Pack modules
5. Store evidence in subject-specific tables that reference platform document metadata patterns


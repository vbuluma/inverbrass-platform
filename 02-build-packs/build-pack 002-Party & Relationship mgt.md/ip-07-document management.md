## BP-002 – IP-007 Party Documents

### Scope

Implement **PC-012 – Party Documents** from the BRD.

This is a **generic Enterprise Document Management capability** attached to a Party. It is **not** a general document repository and **not** a DMS—those can come later as a platform service.

Design this document engine from the start to support **multiple storage providers** (via a storage abstraction), even if you initially implement only Supabase Storage.

---

## Deliverables

### 1. Document Type Catalogue

Configurable document types, seeded initially (National ID, Passport, Driving Licence, Business Registration, Tax Certificate, etc.).

### 2. Party Document Entity

Metadata in PostgreSQL; binaries in object storage (Supabase Storage initially).

### 3. Documents Tab

Party Workspace **Documents** tab — upload, preview, download, replace, verify, reactivate, remove, filter by type.

### 4. Upload Rules

PDF, JPG, JPEG, PNG — max 10 MB. Upload progress/status display.

### 5. Business Rules

Unlimited documents per party, duplicate detection (type + SHA-256 hash), soft delete, verify active only, version replacement preserves audit via `supersedes_document_id`, download active only.

### 6. Future Compatibility

Reusable by KYC, HR, supplier onboarding, contracts, assets, etc. — not implemented now.

---

## Architecture

```text
UI → Server Actions → PartyDocumentService → PartyDocumentRepository → Drizzle → PostgreSQL
                                              ↘ StorageProvider → Supabase Storage
```

---

## IP-007 Completion Status

**Status:** Implemented — pending `db:migrate`, `db:seed`, and Supabase bucket setup for live uploads.

### Files Created

- `03-platform/src/db/schema/document-type.ts`
- `03-platform/src/db/schema/party-document.ts`
- `03-platform/drizzle/0018_bp002_ip007_party_documents.sql`
- `03-platform/src/db/seeds/document-types.ts`
- `03-platform/src/db/seeds/document-types-seed.ts`
- `03-platform/src/core/shared/storage/types.ts`
- `03-platform/src/core/shared/storage/supabase-storage-provider.ts`
- `03-platform/src/core/shared/storage/index.ts`
- `03-platform/src/modules/party/repositories/party-document-repository.ts`
- `03-platform/src/modules/party/services/party-document-service.ts`
- `03-platform/src/modules/party/services/party-document-rules.ts`
- `03-platform/src/modules/party/validators/party-document-validators.ts`
- `03-platform/src/modules/party/actions/party-document-actions.ts`
- `03-platform/src/modules/party/components/party-documents-panel.tsx`
- `03-platform/scripts/bp002-ip007-party-documents-smoke-validation.ts`

### Files Modified

- `03-platform/src/db/schema/index.ts`
- `03-platform/src/db/seed.ts`
- `03-platform/drizzle/meta/_journal.json`
- `03-platform/src/modules/party/constants.ts`
- `03-platform/src/modules/party/errors.ts`
- `03-platform/src/modules/party/types.ts`
- `03-platform/src/modules/party/repositories/party-reference-repository.ts`
- `03-platform/src/modules/party/components/party-workspace.tsx`
- `03-platform/src/app/(authenticated)/(app)/parties/[partyId]/page.tsx`

### Database Entities

- `document_type` — reference catalogue
- `party_document` — tenant-scoped metadata with storage reference, verification, versioning link

### Business Rules Implemented

- Unlimited documents per party
- Duplicate detection (same type + SHA-256 hash)
- MIME whitelist (PDF, JPG, JPEG, PNG) and size limit (10 MB)
- Soft delete only
- Cannot verify inactive documents
- Version replacement soft-deletes prior row and links via `supersedes_document_id`
- Download/preview only for active documents

### Quality Gate Results

| Gate | Result |
|------|--------|
| Typecheck | Pass |
| ESLint | Pass |
| Production build | Pass |
| Smoke tests | 31/32 pass — `document_type` seed pending migrate + seed |

### Remaining Manual Verification

1. Run `npm run db:migrate` then `npm run db:seed`
2. Create Supabase Storage bucket `party-documents` (private) with service-role access
3. Upload, preview, download, replace, verify, deactivate, reactivate, remove in Party Workspace
4. Re-run smoke: `npx tsx scripts/bp002-ip007-party-documents-smoke-validation.ts`

---

## Handover

1. **Build Pack:** BP-002 – Party & Relationship Management
2. **Implementation Package:** IP-007 – Party Documents
3. **Completion Status:** Code complete; DB migration + storage bucket pending
4. **Architecture decisions:** Storage abstraction (`StorageProvider`); metadata in PostgreSQL; Supabase Storage initial provider; `supersedes_document_id` for version audit trail
5. **Database entities:** `document_type`, `party_document`
6. **Services:** `PartyDocumentService`
7. **UI:** `PartyDocumentsPanel`, Documents tab enabled in `PartyWorkspace`
8. **Enterprise Standards:** EDS-001 (base entity pattern)
9. **Known limitations:** No AWS S3/Azure/GCS providers yet; no in-app PDF viewer (opens signed URL); bucket must be created manually in Supabase
10. **Remaining IPs in BP-002:** Groups, Timeline, Communication Preferences, Audit History (future tabs)
11. **Quality gates:** Typecheck, ESLint, build — all pass

**Await approval before proceeding to the next Implementation Package.**

# SL-CUS-003 — Customer Quotation Request

**Document ID:** IB-ED-SME-SL-CUS-003  
**Version:** 1.0  
**Status:** AUTHORITATIVE — **CERTIFIED** (2026-09-04)  
**Date:** 2026-09-04  
**Slice:** SL-CUS-003  
**Prerequisite:** SL-ENG-003o-002 (CERTIFIED), SL-CUS-001 foundation reuse  
**Closure:** [SL-CUS-003-Customer-Quotation-Request-Closure-Report.md](./SL-CUS-003-Customer-Quotation-Request-Closure-Report.md)

---

## 1. Document Control

| Field | Value |
|-------|-------|
| Owner | SME Digitization Launch 1 / Phase 2 |
| Parent | [SME-Digitization-Slice-Register.md](./SME-Digitization-Slice-Register.md) |
| Governing model | IB-ARCH-CHN-001 / IB-ARCH-CHN-002 |
| Engine | ENG-003o |
| Implementation package | Customer Web channel expose of BP-004 Quotation |

---

## 2. Slice Identity

| Attribute | Value |
|-----------|-------|
| **Slice ID** | SL-CUS-003 |
| **Name** | Customer Quotation Request |
| **Type** | End-to-end customer commercial vertical slice |
| **Horizon** | SME Phase 2 |

---

## 3. Governing Documents

- `07-Industry Editions/00-InverBrass Master Capability, Industry, Journey & Slice Model.md`
- `07-Industry Editions/02-Master-Registers-and-Traceability-Inventory.md`
- `07-Industry Editions/SME Digitization/SME-Digitization-Edition-Definition.md`
- `07-Industry Editions/SME Digitization/SME-Digitization-MVP-Scope.md`
- `07-Industry Editions/SME Digitization/SME-Digitization-Journey-Map.md`
- `07-Industry Editions/SME Digitization/SME-Digitization-Slice-Register.md`
- `07-Industry Editions/SME Digitization/SME-Edition-Gap-and-Decision-Register.md`
- `07-Industry Editions/SME Digitization/SL-CUS-001-Customer-Web-Goods-Purchase-Requirements.md`
- `01-enterprise-architecture/15-ENG-003o-Channel-Experience-Engine.md`
- `02-build-packs/Build Pack 004 - Customer Relationship Management/IP-10 Quotations & Sales Pipeline.md`

---

## 4. Business Objective

Enable an SME customer (guest-first) on Customer Web to **browse offerings → select items → request a quotation → provide contact/request details → submit → receive a reference → track request/quotation status → view customer-safe quotation evidence when issued**, using the **existing BP-004 quotation domain** — without a parallel Web quotation ERP.

---

## 5. Industry

`IND-SME` / `IND-COM` (Professional / B2B-leaning SME primary; retail-capable)

---

## 6. Business Type

`RETAIL` / `PROFESSIONAL` (SME Digitization edition)

---

## 7. Edition

`ED-SME-001` — SME Digitization Edition

---

## 8. Actor

| Actor | Mode |
|-------|------|
| Customer (guest) | **Primary (D-01)** |
| Customer (authenticated) | Optional — same allow-list; Party bind may be `PENDING_IAM` |

Customer is **not** a staff user. No staff RBAC.

---

## 9. Journey

**J-CUS-003** Request quotation

---

## 10. Capabilities

| Cap ID | Runtime ID | Access | Notes |
|--------|------------|--------|-------|
| CAP-CUS-001 | `OFFERING_VIEW` | Allow | Reuse SL-CUS-001 |
| CAP-CUS-002 / CAP-CUS-004 | `PRICE_QUERY` | Allow | Display only; domain authoritative |
| CAP-CUS-008 | `CREATE_QUOTATION` | Allow | **Channel expose** of CAP-BIZ-025 |
| — | `VIEW_QUOTATION` | Allow | ENG-003o registry expose of existing `getQuotationDetail` |

**Deny (non-exhaustive):** all `*_WORKSPACE`, procurement, supplier, inventory mutation, pricing admin, quotation approval/send/revise/convert staff operations, configuration.

**Policy:** deny-by-default (`evaluateCustomerWebPolicy`).

**Explicitly not invented:** `CREATE_QUOTATION_REQUEST`, `VIEW_QUOTATION_REQUEST`, `WebQuotationService` as domain owners.

---

## 11. Channel

**CH-CUST** — Customer Web presentation profile over runtime channel `WEB`.

Route root: `/store/[businessCode]`

---

## 12. Domain Ownership

| Domain | Owner | Customer Web role |
|--------|-------|-------------------|
| Quotation entity + lifecycle | **BP-004** | Create DRAFT + read own resource |
| Offering/catalogue | BP-003 | Read published offerings |
| Price resolution | BP-003 / BP-005 via CRM pricing adapter | Authoritative at create (ignore client price) |
| Party | BP-002 | Guest party at request submit |
| Documents | BP-004 QuotationDocumentAdapter (+ ENG-015 later) | Customer-safe link/view when available |
| Audit | ENG-013 via CRM audit helper | Correlation on WRITE |

No Customer Web ownership of quotation state machine, numbering, approval, expiry, conversion, or pricing rules.

---

## 13. Build Pack Ownership

**BP-004** (canonical quotation) + BP-003 (offerings) + BP-002 (guest party) + ENG-003o (channel)

---

## 14. Engine Dependencies

| Engine | Role |
|--------|------|
| ENG-003o | Customer gateway, policy, session, adapter |
| ENG-013 | Audit correlation |
| ENG-015 | Quotation PDF (deferred; HTML adapter exists) |
| ENG-005 | Staff approval threshold (staff path; not customer-owned) |

---

## 15. Preconditions

| Precondition | Status |
|--------------|--------|
| SL-ENG-003o-002 certified | **MET** |
| SL-CUS-001 Customer Web foundation / trust boundary | **MET** (reuse) |
| BP-004 QuotationService + schema | **MET** |
| Staff CREATE_QUOTATION | **MET** |
| CAP-CUS-008 runtime assignment | **Required by this slice** → `CREATE_QUOTATION` |
| Quotation create idempotency (customer path) | **Required by this slice** at BP-004 boundary |

---

## 16. Existing Capability Assessment

| # | Question | Finding |
|---|----------|---------|
| A | Canonical quotation entity? | **YES** — `quotation`, `quotation_version`, `quotation_line` |
| B | Quotation service/contract? | **YES** — `QuotationService` |
| C | Lifecycle/state transitions? | **YES** — Draft → Sent → Accepted/Rejected/Expired (+ revise) |
| D | Creation? | **YES** — `createQuotation` |
| E | Retrieval? | **YES** — `getQuotationDetail`, `searchQuotations` |
| F | Pricing/snapshots? | **YES** — pricing adapter + version totals; locked on Sent |
| G | Quotation-to-sale? | **YES** — BP-006 convert path (staff; **out of customer scope**) |
| H | Documents? | **YES** — HTML `QuotationDocumentAdapter` (PDF deferred) |
| I | Approval/workflow? | **YES** — threshold rules (staff) |
| J | Audit? | **YES** — CRM audit + timeline |
| K | Capability Register? | **YES** — CAP-BIZ-025 / `CREATE_QUOTATION`; CAP-CUS-008 **DESIGNED** (channel expose) |
| L | Journey Register? | **YES** — J-CUS-003 DESIGNED |
| M | Build Pack? | **YES** — BP-004 IP-10 |
| N | Engine? | **YES** — CRM domain + ENG-015/ENG-005 adjuncts |

### Semantic distinction

| Concept | Exists? | Slice treatment |
|---------|---------|-----------------|
| `QUOTATION` | **YES** | Canonical SoR |
| `QUOTE_REQUEST` entity | **NO** | Do **not** invent. Customer “request” = create **DRAFT** quotation via `CREATE_QUOTATION` with `metadata.customerWeb` |

**Governance gate verdict:** Prerequisite reusable quotation capability **IS defined**. Slice proceeds as **channel expose**, not new business capability.

---

## 17. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | Browse customer-visible catalogue (reuse) |
| FR-02 | Select offering(s) + quantities for quotation request |
| FR-03 | Capture customer/request notes and contact fields (customer-safe) |
| FR-04 | Submit request via ENG-003o → `CREATE_QUOTATION` → `QuotationService.createQuotation` |
| FR-05 | Persist as **DRAFT** quotation; numbering/pricing/audit owned by BP-004 |
| FR-06 | Mandatory domain idempotency for customer create path |
| FR-07 | Return customer-safe reference + status |
| FR-08 | View own quotation/request via `VIEW_QUOTATION` with resource scoping |
| FR-09 | Customer-safe document/evidence when domain marks document available and status permits |
| FR-10 | Guest party provision at submit (reuse guest-party pattern) |
| FR-11 | Ignore/reject client-supplied authoritative prices |

---

## 18. Customer Journey

```text
/store/[businessCode]
  → Catalogue (OFFERING_VIEW)
  → Select offering(s) / Request quotation
  → Customer + request details
  → Review
  → Submit (CREATE_QUOTATION → DRAFT)
  → Confirmation (quotationNumber reference)
  → Status (VIEW_QUOTATION)
  → Quotation document when available (customer-safe)
```

Staff may later Send / Approve / Convert using existing staff path — **not** Customer Web ownership.

---

## 19. Customer Trust Boundary

Reuse SL-CUS-001 / SL-ENG-003o-002:

1. Tenant from URL `businessCode`
2. Guest session cookie
3. Customer identity (no staff grants)
4. `invokeCustomerWebCapability`
5. `buildCustomerDomainContext`

Customer must never control: `tenantId`, authoritative identity, quotation owner, authoritative price, status.

---

## 20. Tenant Resolution

Reuse `/store/[businessCode]` → ACTIVE `business.code`. Session mismatch deny. Staff cookie must not override.

---

## 21. Customer Identity

| State | actorType | Party |
|-------|-----------|-------|
| Guest | ANONYMOUS | Created at quotation submit; `partyId` on session |
| Authenticated | CUSTOMER | Session `partyId` or `PENDING_IAM` |

No second customer master.

---

## 22. Customer Authorization

| Grant | Capability |
|-------|------------|
| `CustomerWeb.Offering.Read` | OFFERING_VIEW |
| `CustomerWeb.Price.Read` | PRICE_QUERY |
| `CustomerWeb.Quotation.Create` | CREATE_QUOTATION |
| `CustomerWeb.Quotation.Read` | VIEW_QUOTATION |

Staff permissions ignored. Staff-only quotation ops remain denied.

---

## 23. Resource Authorization

Quotation reads MUST verify:

- `businessId` match
- `metadata.customerWeb.guestSessionId` OR `partyId` match

| Case | Result |
|------|--------|
| Customer A → Request A | PASS |
| Customer B → Request A | DENY |
| Tenant B → Request A | DENY |
| Guessed ID | DENY |
| Customer A → Quotation B | DENY |

---

## 24. Quotation Request Data

Customer may submit: offering IDs, quantities, optional variant, customer notes/contact fields, idempotency key.

Server builds BP-004 `CreateQuotationPayload` with domain-resolved prices (omit client `unitPrice`).

---

## 25. Offering Selection

Reuse catalogue `OFFERING_VIEW`. No duplicate catalogue logic.

---

## 26. Pricing

Domain resolves unit price when `unitPrice` omitted (`insertLineForVersion`). Customer Web **must omit** client unit prices. Tampered browser prices are ignored.

Displayed catalogue prices are informational until domain snapshot on create.

---

## 27. Customer Information

Minimal contact/notes for staff follow-up. Bound to guest Party; not a new CRM customer master UI.

---

## 28. Submission

Server Action → Customer quotation orchestration → ENG-003o `CREATE_QUOTATION` → `QuotationService.createQuotation`.

---

## 29. Quotation Lifecycle

| Domain status | Customer-safe label |
|---------------|---------------------|
| DRAFT | REQUEST_RECEIVED |
| SENT | QUOTATION_ISSUED |
| ACCEPTED | ACCEPTED |
| REJECTED | REJECTED |
| EXPIRED | EXPIRED |

Customer Web does **not** transition status (no send/accept/reject/convert from customer in this slice unless separately authorized later).

---

## 30. Response / Status

Customer-safe DTO: reference (`quotationNumber`), status label, currency, line summaries, totals when appropriate, createdAt. No approval internals, owner user IDs, cost/margin, staff workflow metadata.

---

## 31. Document / Evidence

Reuse `QuotationDocumentAdapter` / `documentAvailable`. Customer Web may render/link customer-safe evidence when issued. External delivery **out of scope**.

---

## 32. Audit

Reuse ENG-013 via BP-004 `recordCrmEntityAudit` + timeline. Propagate `correlationId` in `metadata.customerWeb`.

---

## 33. Idempotency

Domain-level (BP-004) `quotation_idempotency` for operation `CREATE_QUOTATION`:

- Key required for customer path
- Same key + same hash → replay original quotation
- Same key + different hash → reject
- Concurrent duplicate → one quotation
- Scope: `businessId` + operation + key

Channel key namespace: `customer-web:create-quotation:{guestSessionId}:{clientKey}`

---

## 34. Concurrency

Test: double-click submit, refresh, retry, concurrent same key, payload mismatch.

---

## 35. Security Invariants

- No staff RBAC on customer path
- No client-authoritative tenant/price/status
- No unrestricted GET by ID
- No Web-only quotation domain
- No channel-only idempotency without domain store

---

## 36. UX Requirements

Mobile-first: catalogue → request quote → details → confirm → status. Guest-first. Simple navigation under `/store/[businessCode]/quote/...`.

---

## 37. Error Handling

Customer-readable errors only. No SQL, stacks, internal auth details, supplier/cost/margin, approval internals.

---

## 38. Non-Goals

- New `QUOTE_REQUEST` entity
- Customer quotation approval/send/revise/convert
- WhatsApp / Mobile / public API adapters (reuse contracts later)
- WebQuotationPDFService
- Parallel pricing engine
- Broad customer IAM redesign

---

## 39. Acceptance Criteria

| AC | Criterion |
|----|-----------|
| AC-01 | Customer can submit quotation request on `/store/[businessCode]` path |
| AC-02 | Domain creates DRAFT quotation via `QuotationService` |
| AC-03 | Tenant + resource isolation holds |
| AC-04 | Idempotent create on customer path |
| AC-05 | Customer-safe DTOs (no forbidden fields) |
| AC-06 | Client prices not authoritative |
| AC-07 | Status view scoped to owner |
| AC-08 | Staff CREATE_QUOTATION / ENG-003o staff path still works |
| AC-09 | TypeScript + ESLint + production build pass |

---

## 40. Certification Requirements

Script: `03-platform/scripts/sl-cus-003-customer-quotation-request-certification.ts`

Mandatory gates A–U per implementation prompt, plus **CHANNEL REUSE / BUSINESS LOGIC SEPARATION**.

---

## 41. Traceability

```text
SME Digitization → Customer → J-CUS-003 → SL-CUS-003
  → Customer Web → CAP-CUS-008 / CREATE_QUOTATION (+ VIEW_QUOTATION)
  → ENG-003o → BP-004 QuotationService → IP-10 → Data (quotation*)
  → Certification
```

---

## 42. Implementation Checklist

- [ ] Requirements (this document)
- [ ] Registry: CREATE_QUOTATION customer channels; VIEW_QUOTATION
- [ ] CustomerWeb grants + allow-list
- [ ] Quotation orchestration (channel) + DTOs + resource auth
- [ ] BP-004 create idempotency
- [ ] Storefront quote UX routes
- [ ] Certification script
- [ ] Update SME Slice / Journey / Gap / Master registers

---

## 43. Open Questions / Decisions

| ID | Topic | Decision |
|----|-------|----------|
| D-Q-01 | Request vs Quotation entity | **APPROVED** — no QUOTE_REQUEST; DRAFT quotation is the request |
| D-Q-02 | CAP-CUS-008 runtime | **APPROVED** — `CREATE_QUOTATION` (channel expose) |
| D-Q-03 | Customer status transitions | **OUT OF SCOPE** this slice |
| D-Q-04 | External quote delivery | **OUT OF SCOPE** |

---

## 44. Reusable Business Logic Boundary

| Layer | Examples | Classification |
|-------|----------|----------------|
| Storefront pages, forms, Server Actions mapping | `/store/.../quote/*`, `quotation-actions.ts` | **CHANNEL-SPECIFIC** |
| Customer DTOs, resource scope helpers, grants | `dto`, `quotation-resource-auth`, policy | **CHANNEL-SPECIFIC** (presentation/authz partition) |
| `QuotationService`, pricing resolve, lifecycle, audit, idempotency store | BP-004 | **REUSABLE BUSINESS LOGIC** |

**Channel reuse test:** WhatsApp / Mobile / API must call the same `QuotationService.createQuotation` / `getQuotationDetail` (+ domain idempotency) via their adapters through ENG-003o — not Customer Web modules.

---

*Document authorizes channel expose of existing BP-004 quotation. It does not authorize inventing a Web-owned quotation capability.*

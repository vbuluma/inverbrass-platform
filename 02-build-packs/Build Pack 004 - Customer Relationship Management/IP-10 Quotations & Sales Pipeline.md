# BP-004 IP-10 – Quotations & Sales Pipeline

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-10 |
| Build Pack | BP-004 – Customer Relationship Management |
| Priority | High |
| Depends On | IP-03, BP-003 IP-01, BP-003 IP-11, BP-006 IP-01 (conversion consumer), ENG-003n (optional) |

---

## Objective

Enable CRM users to create quotations and advance the sales pipeline from opportunity and account context, consuming catalogue/pricing (and BP-005 commercial resolution when aligned) while maintaining CRM-to-commercial document linkage. **Quotation ownership stays in BP-004. Conversion of an eligible quotation into a sales order is owned by BP-006 IP-01.** BP-004 does not persist sales orders and does not implement fulfilment or billing.

---

## Business Problem

Sales teams rebuild quotes manually outside CRM, introducing pricing errors and losing traceability from opportunity to order. Quotations must pull live offering and price data, respect account context, and **hand off conversion to BP-006** so the user is not forced to start a disconnected sale. CRM does not own the sales order, inventory or billing.

---

## Scope

### Included

- Quotation header and line items from BP-003 offerings
- Price resolution from BP-003 pricing engine
- Quotation lifecycle: Draft, Sent, Accepted, Rejected, Expired
- Quotation versioning and revision
- Customer acceptance tracking
- Conversion eligibility for BP-006 IP-01 (accepted, unexpired, same business/customer)
- Handoff to BP-006 to convert quotation → sales order (CRM does **not** persist the order)
- Linkage to opportunity, account, and CRM record
- PDF/document output via ENG-015
- Pipeline visibility from quotation stage through acceptance

### Excluded

- Product catalogue management (BP-003)
- Pricing rule configuration (BP-003 IP-11)
- **Sales order persistence and quote-to-order execution (BP-006 IP-01)**
- Order fulfilment, inspection, shipping, inventory (BP-006 / BP-008)
- Invoicing and payment (BP-007)
- Complex discount approval engines (BP-005 / future)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Generate accurate quotations from live catalogue and pricing. |
| BR-002 | Maintain traceability from opportunity to quotation to order. |
| BR-003 | Support quotation revision without losing history. |
| BR-004 | Expose accepted quotations as eligible for conversion; **BP-006 IP-01 executes conversion** into a sales order. |
| BR-005 | Apply business-specific quotation validity and terms. |
| BR-006 | Surface quotation progress within the sales pipeline view (IP-03). |
| BR-007 | Optional: track quotation turnaround SLA from draft to sent/accepted via ENG-003n. |

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Create quotation from opportunity or account context. |
| FR-002 | Add line items by selecting BP-003 offerings with quantity and UoM. |
| FR-003 | Resolve unit price from BP-003 pricing by price list, segment, and date. |
| FR-004 | Calculate line totals and quotation grand total. |
| FR-005 | Support quotation statuses and validity expiry date. |
| FR-006 | Generate quotation document via ENG-015. |
| FR-007 | Mark quotation Sent, Accepted, Rejected, or Expired. |
| FR-008 | Create revised quotation version preserving prior versions. |
| FR-009 | Hand off an Accepted (conversion-eligible) quotation to **BP-006 IP-01**; do not persist a sales order in CRM. |
| FR-010 | Retain linkage from quotation to the resulting BP-006 order id once conversion succeeds. |
| FR-011 | Publish quotation and order events to timeline and audit. |
| FR-012 | Search quotations by number, account, status, date. Order search is owned by BP-006. |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Line items must reference active BP-003 offerings. |
| BRU-002 | Pricing resolved at quotation creation; locked on Sent unless revised. |
| BRU-003 | Expired quotations cannot convert to order without renewal. |
| BRU-004 | BP-006 requires a conversion-eligible quotation; CRM must not create the sales order. |
| BRU-005 | Quotation versions are immutable once Sent. |
| BRU-006 | Successful BP-006 conversion may update linked opportunity stage where configured. |

---

## High-Level Process Flow

```
Opportunity → Create Quotation
      ↓
Add Offerings (BP-003) + Prices (BP-003)
      ↓
Draft → Review → Send
      ↓
Accepted? ──Yes──→ Convert Quote (BP-006 IP-01) → Sales Order (BP-006) → Fulfilment
      │
      No → Rejected / Expired → Revise or Close Opportunity
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Quotation number format | Sequence and prefix |
| Default validity period | Days until expiry |
| Price list defaults | By channel or segment |
| Terms and conditions templates | ENG-015 document templates |
| Order creation rules | Auto-stage update on opportunity after **BP-006** conversion |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| BP-003 IP-01 | Offering lookup |
| BP-003 IP-11 | Price resolution |
| IP-03 | Opportunity and pipeline linkage |
| IP-04 | Account and billing context |
| BP-006 IP-01 | **Owns** quote-to-order conversion and sales order persistence |
| ENG-015 | Quotation PDF generation |
| ENG-005 | Approval for high-value quotes |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Quotation pipeline | Open, sent, accepted values |
| Conversion rate | Quotations to orders |
| Expiring quotations | Validity within N days |
| Quote-to-order cycle | Time from send to acceptance |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Quotations build from BP-003 offerings and pricing. |
| AC-002 | Version history preserved on revision. |
| AC-003 | Eligible accepted quotation is handed to BP-006 IP-01; CRM does not persist the sales order. |
| AC-004 | Expired quotations blocked from order conversion. |
| AC-005 | Document generation produces quotation PDF. |

> **v1 note (AC-005):** PDF deferred to ENG-015 Phase 2. v1 delivers printable HTML via `QuotationDocumentAdapter`.

---

## Customer 360 Contribution

| Contribution | Description |
|--------------|-------------|
| **Widgets** | Outstanding, pending acceptance, expired, **accepted** (`quotation.*` stable IDs) |
| **Insights** | Quotation awaiting response, total quoted value |
| **Quick actions** | View latest, create quotation, **Convert Quote** (invokes BP-006 IP-01 when eligible) |
| **Timeline** | `QUOTATION_CREATED`, `QUOTATION_SENT`, `QUOTATION_ACCEPTED`, `QUOTATION_REJECTED`, `QUOTATION_EXPIRED`, `QUOTATION_REVISED`, `QUOTATION_CONVERTED` (when BP-006 conversion succeeds) |
| **Publisher** | `QuotationCustomer360Provider` — mounted by IP-01 (not a second 360 shell) |

---

## Implementation Status (Sales & Marketing — Frozen)

| Area | Status |
|------|--------|
| Schema / migrations `0042`–`0043` | Complete (journal = Integration Manager) |
| Lifecycle + versioning + expiry | Complete |
| BP-003 pricing consumption | Complete |
| Approval threshold (ENG-005-ready) | Complete — multi-tier deferred |
| Acceptance channel metadata | Complete — channels not implemented |
| Sales order handoff stub | Complete — **execution owner is BP-006 IP-01**; CRM must not persist orders |
| HTML document adapter | Complete — PDF deferred |
| UI + navigation | Complete |
| Customer 360 contribution contract | Complete |

**Canonical handover:** `sales-marketing-implementation.md`

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| IP-03 | Opportunity and pipeline |
| BP-003 IP-01, IP-11 | Catalogue and pricing |
| ENG-015 | Documents |
| ENG-005 | Quote approval |
| IP-01 | Mount 360 contribution |

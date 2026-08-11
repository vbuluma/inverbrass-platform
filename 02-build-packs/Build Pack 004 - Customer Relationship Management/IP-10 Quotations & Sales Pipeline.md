# BP-004 IP-10 – Quotations & Sales Pipeline

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-10 |
| Build Pack | BP-004 – Customer Relationship Management |
| Priority | High |
| Depends On | IP-03, BP-003 IP-01, BP-003 IP-11, ENG-003n (optional) |

---

## Objective

Enable CRM users to create quotations and advance the sales pipeline from opportunity and account context, consuming BP-003 offerings and pricing while maintaining CRM-to-commercial document linkage without implementing fulfilment or billing.

---

## Business Problem

Sales teams rebuild quotes manually outside CRM, introducing pricing errors and losing traceability from opportunity to order. Quotations must pull live offering and price data from BP-003, respect account context, and hand off to operational Build Packs for fulfilment without CRM owning inventory or billing.

---

## Scope

### Included

- Quotation header and line items from BP-003 offerings
- Price resolution from BP-003 pricing engine
- Quotation lifecycle: Draft, Sent, Accepted, Rejected, Expired
- Quotation versioning and revision
- Customer acceptance tracking
- Sales order initiation from accepted quotation
- Linkage to opportunity, account, and CRM record
- PDF/document output via ENG-015
- Pipeline visibility from quotation stage through acceptance

### Excluded

- Product catalogue management (BP-003)
- Pricing rule configuration (BP-003 IP-11)
- Order fulfilment, shipping, inventory (BP-006+)
- Invoicing and payment (BP-007+)
- Complex discount approval engines (future)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Generate accurate quotations from live catalogue and pricing. |
| BR-002 | Maintain traceability from opportunity to quotation to order. |
| BR-003 | Support quotation revision without losing history. |
| BR-004 | Convert accepted quotations to sales orders for downstream fulfilment. |
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
| FR-009 | Convert Accepted quotation to sales order record. |
| FR-010 | Link sales order to quotation, opportunity, and account. |
| FR-011 | Publish quotation and order events to timeline and audit. |
| FR-012 | Search quotations and orders by number, account, status, date. |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Line items must reference active BP-003 offerings. |
| BRU-002 | Pricing resolved at quotation creation; locked on Sent unless revised. |
| BRU-003 | Expired quotations cannot convert to order without renewal. |
| BRU-004 | Accepted quotation required before order creation where configured. |
| BRU-005 | Quotation versions are immutable once Sent. |
| BRU-006 | Sales order creation updates linked opportunity stage where configured. |

---

## High-Level Process Flow

```
Opportunity → Create Quotation
      ↓
Add Offerings (BP-003) + Prices (BP-003)
      ↓
Draft → Review → Send
      ↓
Accepted? ──Yes──→ Create Sales Order → Handoff to Fulfilment BP
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
| Order creation rules | Auto-stage update on opportunity |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| BP-003 IP-01 | Offering lookup |
| BP-003 IP-11 | Price resolution |
| IP-03 | Opportunity and pipeline linkage |
| IP-04 | Account and billing context |
| ENG-015 | Quotation PDF generation |
| ENG-005 | Approval for high-value quotes |
| BP-006+ | Sales order handoff (future consumption) |

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
| AC-003 | Accepted quotation converts to sales order with linkage. |
| AC-004 | Expired quotations blocked from order conversion. |
| AC-005 | Document generation produces quotation PDF. |

> **v1 note (AC-005):** PDF deferred to ENG-015 Phase 2. v1 delivers printable HTML via `QuotationDocumentAdapter`.

---

## Customer 360 Contribution

| Contribution | Description |
|--------------|-------------|
| **Widgets** | Outstanding, pending acceptance, expired, **accepted** (`quotation.*` stable IDs) |
| **Insights** | Quotation awaiting response, total quoted value |
| **Quick actions** | View latest, create quotation |
| **Timeline** | `QUOTATION_CREATED`, `QUOTATION_SENT`, `QUOTATION_ACCEPTED`, `QUOTATION_REJECTED`, `QUOTATION_EXPIRED`, `QUOTATION_REVISED` |
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
| Sales order handoff stub | Complete |
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

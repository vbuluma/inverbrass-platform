# BP-009 IP-09 — Supplier Invoice & Matching



| Attribute | Description |

|-----------|-------------|

| Implementation Package | IP-09 |

| Build Pack | BP-009 – Procurement & Supplier Management |

| Status | ✅ Implemented — smoke 22/22 (`bp009-ip09-supplier-invoice-smoke-validation.ts`) |

| Priority | Critical |

| Depends On | IP-06, IP-08, ENG-005, ENG-013, ENG-015, ENG-003b |

| Scope coverage | SC-011 |

| Objective | Capture supplier invoices, detect duplicates, and perform configurable 2-way / 3-way matching |



---



## Objective



Supplier invoices are captured against the procurement transaction.



```text

PO

 ↓

Receipt (when required)

 ↓

Supplier Invoice

 ↓

Match

 ↓

Approval

 ↓

Payment-ready / AP handoff

```



**Outgoing payment rails remain an open v1 decision.** IP-09 produces payment-ready / AP handoff. It does not operate payment networks or post GL.



---



## Business Problem



Paying from a PDF in email causes duplicate pay, overpay on short delivery, and no PO control.



---



## Scope



### Included



#### 1. Invoice capture



* Invoice number (supplier's)

* Supplier

* PO reference (required for matchable invoices; non-PO invoices only if policy allows — default: PO required)

* Invoice date, due date

* Tax (ENG-003b / commercial tax references — do not reimplement BP-005 sales tax engine as a second product)

* Line items, quantities, amounts

* Attachments (ENG-015)

* Currency

* Status



#### 2. Duplicate detection



Detect duplicates by tenant + supplier + invoice number (and configurable extras: amount + date). Block or exception (IP-10) before match/approval.



#### 3. Two-way matching



```text

PO ↔ Invoice

```



Used for services or procurement types where receipt is not required.



#### 4. Three-way matching



```text

PO

 ↕

Receipt

 ↕

Invoice

```



Required for physical goods and procurement types configured to require receipt.



Tolerances (price, quantity, tax) are configuration-driven.



#### 5. Four-way matching (future-ready)



```text

PO → Receipt → Inspection → Invoice

```



IP-09 should allow a configured matching mode of FOUR_WAY without implementing a full quality-management system. If inspection is missing, match fails or waits.



#### 6. Match outcome



| Outcome | Next |

|---------|------|

| MATCHED | Eligible for approval → payment-ready |

| VARIANCE | IP-10 exception |

| UNMATCHED | Wait / exception |

| DUPLICATE | Block / exception |



Match results are stored with PO, receipt and invoice references so the lifecycle can be navigated both ways.



#### 7. AP / payment handoff



After match + approval:



```text

Payment-ready instruction

  — payee Party

  — amount

  — currency

  — due date

  — invoice / PO refs

  — businessId

```



Handoff target is BP-010 / future AP execution. **Do not** call customer payment catalogues in BP-007 as if this were customer AR. **Do not** implement disbursement rails in IP-09.



---



## Business Rules



| ID | Rule |

| -- | ---- |

| INV-001 | Duplicate supplier invoice numbers for the same supplier in the same business are detected. |

| INV-002 | Three-way types cannot reach MATCHED without a receipt covering the invoiced quantity within tolerance. |

| INV-003 | Two-way types cannot reach MATCHED without PO line coverage within tolerance. |

| INV-004 | Blacklisted supplier invoices may be captured for history but cannot become payment-ready unless policy exception. |

| INV-005 | IP-09 must not post GL or execute payment. |

| INV-006 | IP-09 must not increment inventory. |

| INV-007 | Match is idempotent for the same invoice version. |

| INV-008 | Tenant isolation; fail closed. |



---



## UI / UX



**Supplier invoices** — capture, list unmatched / matched / exception.



**Match workbench** — PO vs receipt vs invoice lines, variances, accept within tolerance or raise exception.



**Payment-ready queue** — read-only handoff status (not a pay button to M-Pesa/bank unless the open decision is later closed).



No BP/IP/ENG labels.



---



## Acceptance Criteria



| ID | Criterion | Implementation |

| -- | --------- | -------------- |

| AC-001 | Supplier invoice can be captured against a PO with lines, tax, dates and attachment | ✅ `InvoiceService.create` + `procurement_supplier_invoice*` |

| AC-002 | Duplicate invoice number for the same supplier is detected | ✅ `findDuplicateInvoice` + `DUPLICATE` outcome |

| AC-003 | Two-way match compares PO and invoice within configured tolerance | ✅ Service lines via `resolveMatchingModeForLine` |

| AC-004 | Three-way match requires receipt and fails closed without it when type requires receipt | ✅ `RECEIPT_MISSING` → `UNMATCHED` |

| AC-005 | Variance produces a match exception rather than silent payment-ready | ✅ `VARIANCE` status blocks approval |

| AC-006 | Matched + approved invoice produces AP/payment-ready handoff without executing payment | ✅ `InProcessApHandoffAdapter` + `PAYMENT_READY` |

| AC-007 | No GL journal is posted | ✅ Service boundary — no finance module imports |

| AC-008 | No BP-007 customer receipt is created | ✅ No customer AR integration |

| AC-009 | Events are audited | ✅ ENG-013 audit actions |

| AC-010 | Cross-business invoice access fails closed | ✅ Repository business scoping |



### Verification



- Smoke: `npx tsx scripts/bp009-ip09-supplier-invoice-smoke-validation.ts` — **22/22**

- Migration: `0089_bp009_ip009_supplier_invoice.sql`

- Routes: `/procurement/invoices`, `/procurement/invoices/new`, `/procurement/invoices/[invoiceId]`, `/procurement/invoices/payment-ready`



---



## Explicitly Excluded from IP-09



Payment rails / disbursement, BP-007 customer AR, ENG-008 bank statement matching, BP-010 journals, inventory, OCR as a required v1 engine (may consume ENG-012 later), full IP-10 case workflow beyond raising the exception.


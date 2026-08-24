# BP-001 → BP-005 — Manual Journey Revalidation Guide

**Audience:** Product Owner / Business Analyst  
**Purpose:** Prove Customer → Offering → Commercial Resolution → Expected Amount → Tax Obligations as **one continuous user journey** after UX remediation Round 1.  
**Do not start BP-006.** Do not invent payment data.

**Synthetic scenario (preferred):**

| Entity | Value |
|---|---|
| Business | `Journey Alpha Services KE` (KES, Kenya) |
| Customer | `Test Customer Alpha` |
| Offering | `Journey Alpha Advisory Service` (`JA-ADV-001`) |
| List price | FIXED **2750.50** KES (activated) |

If masters already exist, reuse them. Do not create duplicate catalogues for the same offering.

---

## Prerequisites

1. Sign in and select / create the business above.  
2. Complete setup until the business is active.  
3. Keep a notepad for evidence (IDs from URLs are fine).

---

### Step 1 — Business context

**Navigate to:** `/select-business` or `/businesses/create` then `/setup/...`

**Action:** Select `Journey Alpha Services KE` (or create it).

**Test data:** Country KE, currency KES.

**Expected result:** Dashboard loads for that business.

**Evidence:** Business name in switcher / chrome.

**Next:** Create or open customer.

---

### Step 2 — Customer

**Navigate to:** `/customers` or `/parties/new` then `/customers/new`

**Action:** Ensure party `Test Customer Alpha` exists with CUSTOMER role; register as CRM customer if needed.

**Test data:** Name `Test Customer Alpha`, synthetic mobile `+254712345001`.

**Expected result:** Customer workspace opens; name searchable.

**Evidence:** Customer display name; optional `crmId` from URL `/customers/[crmId]`.

**Next action:** From customer header, click **Price a sale** (deep link), **or** continue to offerings first.

---

### Step 3 — Offering

**Navigate to:** `/products/new` or `/products`

**Action:** Create/activate `Journey Alpha Advisory Service` / `JA-ADV-001`, sellable, KES.

**Expected result:** Offering visible in Offerings list.

**Evidence:** Product name/code; optional product ID from URL.

**Next:** Pricing lists.

---

### Step 4 — Pricing (list price master)

**Navigate to:** `/products/pricing` or product pricing panel

**Action:** Catalogue for KES; FIXED unit price **2750.50**; activate price item on the offering.

**Expected result:** Price appears for the offering.

**Evidence:** Catalogue name, unit price 2750.50 KES, active status.

**Next:** Optional Commercial rules (`/commercial/governance`), then Price a sale.

---

### Step 5 — Price a sale (customer + offering)

**Navigate to:** `/commercial/resolve` (nav: **Price a sale**)  
Or open from Customer / Offering **Price a sale** quick action.

**Action:**

1. Search customer `Test Customer Alpha` → select  
2. Search offering `Journey Alpha` / `JA-ADV-001` → select  
3. Currency `KES`, quantity `1`  
4. Click **Find price**  
5. **Build charges**  
6. Tax: VAT / 16 / EXCLUSIVE → **Apply tax**  
7. Land on **Review**

**Expected result:**

- List price ≈ 2750.50  
- Expected amount ≈ 3190.58 (2750.50 + 16% exclusive VAT)  
- Actual payment = **Not available yet**  
- Primary CTA: **View tax obligations**  
- No IP/BP jargon required to complete the steps

**Evidence:** Customer name, offering name, principal, tax, expected amount (copy from Review cards).

**Next:** View tax obligations (do **not** copy IDs).

---

### Step 6 — Expected amount review (same screen)

**Screen:** Price a sale → Review step

**Action:** Confirm breakdown (principal, charges, tax, discounts, expected amount).

**Expected:** Clear business language; payment/variance unavailable.

**Evidence:** Screenshot or written amounts.

**Next:** Click **View tax obligations**.

---

### Step 7 — Tax obligations (no manual paste)

**Navigate to:** `/commercial/tax-compliance?handoff=1` (via the Review button)

**Action:**

1. If prompted, create country profile `KE` under Registrations  
2. Add registration e.g. VAT / `P051234567A` / KRA  
3. On Obligations, confirm banner **Commercial result ready** with customer, offering, tax amounts  
4. Click **Create tax obligation** (no retyping of snapshot/tax fields)

**Expected result:** Obligation appears with filing/remittance/evidence/compliance statuses. Due dates labelled as configurable (not legal certification).

**Evidence:** Obligation line amounts match Review tax; statuses visible.

**Next:** Optional filing transitions; then stop. Do not enter payments/orders.

---

### Step 8 — Recovery check (optional)

**Action:** On Price a sale, try Find price without selecting a customer, or with an offering that has no active price.

**Expected:** Near-step error with clear next action (select customer / fix pricing lists) — not a raw stack trace.

**Evidence:** Error message text.

---

## Continuity proof checklist

- [ ] Same business throughout  
- [ ] Same customer selected on Price a sale  
- [ ] Same offering selected  
- [ ] Expected amount shown without IP terminology  
- [ ] Tax obligation created **without** pasting snapshot/tax IDs  
- [ ] Actual payment still unavailable  

---

## Pass criteria for this guide

| Criterion | Pass if |
|---|---|
| Continuous journey | Steps 2→5→6→7 use the same customer/offering without re-keying commercial amounts |
| Language | Tester completes without needing BP/IP knowledge |
| Handoff | Tax obligation create uses prefilled commercial result |

**Browser tested by agent:** No — this guide is for human/BA revalidation.

# BP-004 — Lead Conversion Contract

| Attribute | Description |
|-----------|-------------|
| Build Pack | BP-004 – Customer Relationship Management |
| Status | Active — governs IP-02 → IP-03 → IP-04 handoffs |
| Owner | CRM Core (IP-01, IP-02, IP-03, IP-04) |

---

## Target lifecycle

```
Prospect / Lead (IP-02)
  ↓
Qualified
  ↓
Conversion (IP-02 + IP-03)
  ↓
CRM record reused or created (IP-01) — same Party ID
  ↓
Opportunity created by default (IP-03)
  ↓
Account & contact enrichment optional (IP-04)
  ↓
Customer ACTIVE on opportunity win (configurable)
```

**Invariant:** One **Party ID** from prospect through customer. Conversion never creates a duplicate Party. Where a CRM record already exists for that Party, conversion **reuses** it.

---

## Phase ownership

| Phase | IP | Creates | References |
|-------|-----|---------|------------|
| Lead capture & qualification | IP-02 | `crm_lead` | `party`, `lead_source`, ENG-003n assignment |
| Lead conversion | IP-02 + IP-03 | `crm_record` (if missing), `crm_opportunity` (default) | `converted_crm_id`, `source_lead_id` |
| Account & contact enrichment | IP-04 | `crm_account`, `crm_account_contact` | Existing Party / CRM record; optional `crm_opportunity.account_id` |
| Customer relationship | IP-01 | — | Customer 360 reads all layers |

**IP-04 status:** Implemented. Account hierarchy and CRM contact roles are live.

- **Account:** `crm_account` with optional `party_id` and `crm_record_id`
- **Contact:** `crm_account_contact` references BP-002 Party only (no identity duplication)
- **Opportunity link:** optional `crm_opportunity.account_id` on create/update (does not duplicate account data)

---

## Lead conversion (IP-02 → IP-03)

### What gets **copied**

| Field / context | From | To |
|-----------------|------|-----|
| Party identity | `crm_lead.party_id` | `crm_record.party_id`, `crm_opportunity.party_id` |
| Owner | `crm_lead.owner_party_id` | `crm_record.owner_party_id`, `crm_opportunity.owner_party_id`, ENG-003n segment |
| Branch | `crm_lead.branch_id` | `crm_record.branch_id`, `crm_opportunity.branch_id` |
| Source attribution | `crm_lead.source_code` | `crm_record.source_code`; opportunity `metadata.leadConversion.sourceCode` |
| Qualification score | `crm_lead.qualification_score` | opportunity `metadata.leadConversion.qualificationScore` |
| Contact hints | email, phone, company, contact name | opportunity `metadata.leadConversion.*` (until account contacts enrich via IP-04) |

### What gets **referenced** (not duplicated)

| Entity | Reference |
|--------|-----------|
| Party | Same UUID — never re-created |
| CRM record | `crm_lead.converted_crm_id` → `crm_opportunity.crm_record_id` |
| Lead history | `crm_opportunity.source_lead_id` → `crm_lead.id` |
| Account (optional) | `crm_opportunity.account_id` → `crm_account.id` (IP-04 ownership) |
| Offerings (BP-003) | Opportunity line items reference `product.id` only |
| Timeline | All events on **Party Timeline** (BP-002 IP-010) |

### What gets **archived**

| Entity | Behaviour |
|--------|-----------|
| Lead | Status → `CONVERTED`; row retained read-only |
| Lead assignment SLA | Final segment closed; historical segments preserved |
| Lead editable fields | Locked except audit/timeline reference |

### What remains **immutable**

| After conversion | Rule |
|------------------|------|
| `crm_lead.party_id` | Never changed |
| `crm_lead.lead_number` | Never changed |
| Converted lead status | Only `CONVERTED` (no revert to pipeline) |
| Party ID on CRM record | Never changed after creation |
| Timeline events | Append-only on Party Timeline |

---

## CRM status policy (v1)

| Event | Default behaviour | Configuration |
|-------|-------------------|---------------|
| Convert creates missing CRM | Status = `LEAD` | `settings.crm.lead.conversion.crmStatusOnConvert` |
| Convert finds existing CRM | Status unchanged | — |
| Opportunity won | Promote CRM to `ACTIVE` when transition is allowed | `settings.crm.lead.conversion.promoteCrmToActiveOnWin` (default `true`) |

Request payload on convert may override:

- `createCrmIfMissing`
- `createOpportunity`

when omitted, defaults come from `settings.crm.lead.conversion`.

---

## Opportunity outcomes (IP-03)

### Won

- Stage → closed-won; status → `WON`
- Requires close date and final amount
- Optional quotation link (IP-10 — future)
- CRM record may progress to `ACTIVE` per conversion config above

### Lost

- Stage → closed-lost; status → `LOST`
- Requires loss reason code
- Opportunity read-only except governed reopen

### Reopen

- Governed workflow (ENG-005 — future); returns to configured open stage

---

## Configuration surfaces

| Area | Path | Purpose |
|------|------|---------|
| Lead qualification | `settings.crm.lead.qualification` | Min score, owner requirement, checklist mode (ENG-003l) |
| Lead scoring | `settings.crm.lead.scoring` | Weights / model version (ENG-004 — reserved) |
| Lead sources | `lead_source` catalogue | WEB, API, INSTITUTION, IMPORT, PARTNER, … |
| Conversion | `settings.crm.lead.conversion` | `createOpportunityDefault`, `createCrmIfMissingDefault`, `crmStatusOnConvert`, `promoteCrmToActiveOnWin` |
| Pipelines | `opportunity_pipeline` + `opportunity_stage` | Stage order, default probability |

**v1 note:** Convert API accepts explicit overrides for `createOpportunity` / `createCrmIfMissing`. When those fields are omitted, business configuration defaults apply. Payload and configuration are complementary — not competing.

---

## Timeline events (Party Timeline)

| Event | When |
|-------|------|
| `LEAD_CREATED` | Lead registered |
| `LEAD_QUALIFIED` | Lead reaches qualified status |
| `LEAD_CONVERTED` | Lead converted |
| `LEAD_DISQUALIFIED` | Lead disqualified |
| `OPPORTUNITY_CREATED` | Opportunity created (incl. from lead) |
| `STAGE_CHANGED` | Opportunity stage transition |
| `OPPORTUNITY_WON` | Opportunity won |
| `OPPORTUNITY_LOST` | Opportunity lost |

---

## IP-04 enrichment (live)

Account & Contact Management is implemented:

- Opportunities may optionally set `account_id` → `crm_account` (Party identity unchanged)
- Account contacts are BP-002 Party role links (`crm_account_contact`) — no CRM identity clone
- Conversion does **not** require an account; enrichment can happen before or after convert
- This contract does **not** require redesign of IP-02 or IP-03 — only optional enrichment references

---

## Compatibility principles (future channels & onboarding)

CRM Core remains compatible with progressive / low-information intake (WhatsApp, Contact Centre, Mobile, Web, Social, API, institution systems) and platform onboarding journeys **without implementing those channels here**:

1. Capture interaction elsewhere; resolve against existing Party where possible.
2. Create Party only when necessary (BP-002 / future onboarding).
3. CRM consumes that Party ID — never a second customer master.
4. Leads may originate from any catalogue source; incomplete profiles are allowed.
5. Convert reuses Party and CRM; Customer 360 and Party Timeline remain the continuity spine.

**Digital onboarding is not an IP-01 deliverable.** Onboarding is a journey owned by platform onboarding/origination capabilities; CRM Core only consumes Party identities and preserves Prospect → Lead → Customer without duplication.

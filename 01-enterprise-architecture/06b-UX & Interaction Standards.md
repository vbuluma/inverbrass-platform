# 07 – UX & Interaction Standards

## Document Information

| Attribute | Value |
|-----------|-------|
| Document Name | UX & Interaction Standards |
| Version | 1.1 |
| Standard ID | UX-001 Enterprise Interaction Standard |
| Scope | Entire Digitalization Platform |
| Audience | Product Owner, UX Designers, Developers, AI Coding Assistants |

## Purpose

Define platform-wide interaction patterns so every module delivers a consistent, enterprise-grade experience: clear actions, predictable feedback, guided next steps, and accessible navigation.

Related documents:

- [06 – UI/UX Standards & Design System](./06-UI-Standards.md) — design philosophy, layout, branding
- `.cursor/rules/ui-std-004-server-action-refresh.mdc` — server action refresh pattern
- `.cursor/rules/ui-std-006-enterprise-experience.mdc` — enterprise dashboard, search, consent, preview, zoning

---

## UX-001a — Action Naming Standard

Buttons must begin with a clear action verb. Replace ambiguous labels:

| Avoid | Use |
|-------|-----|
| New Individual | Create Individual |
| New Organization | Create Organization |
| New Group | Create Group |
| New Contact | Create Contact |
| New Address | Create Address |
| New Document | Upload Document |
| New Relationship | Create Relationship |
| New Role | Assign Role |
| Add Contact | Create Contact |
| Add Address | Create Address |

Approved verbs: Create, Upload, Assign, Verify, Approve, Suspend, Activate, Archive, Continue, Finish, Save, Cancel, Back, Close, View, Remove, Deactivate.

---

## UX-001b — Standard Action Result Component

Every server action should return (or be adapted to) `PlatformActionResult`:

```typescript
type PlatformActionResult = {
  success: boolean;
  severity: "success" | "warning" | "error";
  title: string;
  message: string;
  nextActions?: PlatformActionLink[];
}
```

UI component: `PlatformActionResultDisplay` (`03-platform/src/components/platform/platform-action-result.tsx`).

Examples:

- Success: Party created successfully — with Next Steps links
- Warning: Head Office already exists
- Error: Document upload failed — with Try Again / Close

---

## UX-001c — Standard Processing Component

During all server actions:

1. Disable submit buttons
2. Show spinner
3. Show action-specific text (e.g. Creating Party…, Uploading Document…)

Components: `PlatformProcessingButton`, `PlatformProcessingIndicator`, `PROCESSING_LABELS`.

No duplicate clicks. No repeated submissions.

---

## UX-001d — Guided Next Steps

After successful create actions, present contextual navigation via `nextActions` on `PlatformActionResult`.

Helpers: `03-platform/src/core/platform/party-next-actions.ts`

Examples:

- Party Created → Create Contact, Create Address, Upload Documents, Go to Party Workspace
- Organization Created → Create Organization Structure, Create Contact, Upload Compliance Documents
- Document Uploaded → Verify Document, Upload Another, Return to Party
- Group Created → Add Member, Go to Group Workspace

---

## UX-001e — Enterprise Button Standard

| Type | Style | Examples |
|------|-------|----------|
| Primary | Filled accent (`default` variant) | Create, Save, Upload, Continue, Approve |
| Secondary | Outline | Cancel, Back, Close, View |
| Danger | Red filled (`destructive` variant) | Delete, Deactivate, Archive, Remove |
| Success | Green filled (`success` variant) | Verified, Completed |

Implementation: `03-platform/src/components/ui/button.tsx`

---

## UX-001f — Clickable Tabs

All workspace tabs use enclosed pill/card styling:

- Rounded corners
- Background color
- Selected tab clearly highlighted
- Hover state
- Keyboard accessible (`role="tablist"`, `aria-selected`)

Component: `PlatformTabs` (`03-platform/src/components/platform/platform-tabs.tsx`)

---

## UX-001g — Standard Empty States

Replace generic table messages with guided empty states.

Component: `PlatformEmptyState`

| Area | Title | Action |
|------|-------|--------|
| Contacts | No Contacts Yet | Create Contact |
| Addresses | No Addresses Yet | Create Address |
| Documents | No Documents Yet | Upload Document |
| Groups | No Groups Yet | Create Group |
| Relationships | No Relationships Yet | Create Relationship |
| Roles | No Roles Yet | Assign Role |
| Timeline | No Timeline Events Yet | — |
| Audit | No Audit Records Yet | — |
| Organization Structure | No Units Yet | Create Organizational Unit |

---

## UX-001h — Confirmation Dialog Standard

All destructive actions use `PlatformConfirmDialog`:

- Deactivate Address / Contact / Document
- Remove Relationship / Group Member / Head Office
- Archive Party / Group

Pattern: `useConfirmAction` or `requestConfirm` from `usePanelFeedback`.

---

## UX-001i — Sticky Action Bar

Long forms keep Save / Cancel / Back visible while scrolling.

Component: `PlatformStickyActionBar`

---

## UX-001j — Unsaved Changes Protection

When a user edits a form and attempts to leave:

> You have unsaved changes.

Actions: Save | Discard | Cancel

Hook: `useUnsavedChangesGuard`

---

## UX-001k — Breadcrumb Navigation

Standard header trail:

Dashboard → Module → Workspace → Current Page

Implementation: `BreadcrumbNav`, `SetBreadcrumbs`, `buildDefaultBreadcrumbs`

Every workspace sets contextual overrides (party name, active tab).

---

## UX-001l — Platform Action Result Model

Core types: `03-platform/src/core/platform/types.ts`

Helpers: `03-platform/src/core/platform/platform-action-helpers.ts`

Panel hook: `usePanelFeedback` — combines result display, processing state, and confirm dialogs for workspace tabs.

Architecture:

```
UI → Server Actions → Services → Repositories → Database
```

Business logic stays in services. Reusable UX components live under:

- `03-platform/src/components/platform/`
- `03-platform/src/components/ui/`

---

## Implementation Checklist

Before merging a new screen:

- [ ] Action labels use approved verbs
- [ ] Server actions return or adapt to `PlatformActionResult`
- [ ] Processing state disables buttons and shows spinner text
- [ ] Create flows offer guided next steps
- [ ] Empty states guide the user
- [ ] Destructive actions use confirmation dialog
- [ ] Long forms use sticky action bar
- [ ] Edited forms warn on navigation
- [ ] Workspace tabs use `PlatformTabs`
- [ ] Breadcrumbs reflect current context
- [ ] Forms follow Platform Form Standard (UI-STD-005)
- [ ] Workspace screens use `PlatformWorkspaceHeader` where applicable

---

## UX-001.1 — Enterprise Workspace Experience

Next-generation workspace patterns (UX sprint UX-001.1):

| ID | Component | Path |
|----|-----------|------|
| UX-001.1a | Completion Card | `platform-completion-card.tsx` |
| UX-001.1b | Completion Meter | `platform-completion-meter.tsx` |
| UX-001.1c | Quick Actions Card | `platform-quick-actions-card.tsx` |
| UX-001.1d | Recent Activity | `platform-recent-activity-card.tsx` |
| UX-001.1e | Recommendations (rules) | `platform-recommendations-card.tsx` |
| UX-001.1f | KPI Cards | `platform-kpi-card.tsx` |
| UX-001.1g | Workspace Header | `platform-workspace-header.tsx` |
| UX-001.1h | Notification Center | `platform-notification-center.tsx` |
| UX-001.1i | Global Search Shell | `platform-global-search-shell.tsx` |
| UX-001.1j | Favorites | `platform-favorites.tsx` |

Helpers: `platform-workspace-helpers.ts` — completion items, quick actions, recommendations.

Success create actions with `summary` on `PlatformActionResult` render `PlatformCompletionCard` automatically via `PlatformActionResultDisplay`.

---

## Platform Form Standard (UI-STD-005)

**Rule file:** `.cursor/rules/ui-std-005-form-consistency.mdc`

### Controlled inputs (preferred)

Use `useControlledForm` from `03-platform/src/lib/forms/use-controlled-form.ts`:

```tsx
const form = useControlledForm({
  initial: { displayName: textFieldValue(party.displayName), notes: "" },
  resetKey: `${party.id}-${party.version}`,
  draft: draftValues,
  draftHydrated: isHydrated,
});

<Input
  value={form.textValue("displayName")}
  onChange={(e) => form.setField("displayName", e.target.value)}
/>
```

### Empty values

Import from `03-platform/src/lib/forms/form-field-values.ts`:

- Text → `textFieldValue(serverValue)` or `""`
- Select → `""` with placeholder `<option value="">`
- Checkbox → `booleanFieldValue(value)`
- Date input → `dateFieldValue(isoDate)`

### Draft loading

1. Load draft via `useFormDraft`.
2. Pass `draft` and `draftHydrated` to `useControlledForm`.
3. Draft merges once on hydration — no `defaultValue` changes after mount.

### Async loading / form reset

- Pass `resetKey` to `useControlledForm` when server data version changes.
- After successful save, update local state from returned data; do not rely on changing `defaultValue`.

### Validation

- Set `invalidField` via `form.setInvalidField(fieldName)`.
- Use `form.fieldClassName(name)` for error styling.

### Uncontrolled preserved forms (auth / wizard only)

Use `usePreservedFormValues` + `formKey` remount. **All fields in the form must be uncontrolled.**

---

## Enterprise UX Principles

1. **Contextual completion** — After create, show summary + recommended next steps (not a generic toast).
2. **Progress visibility** — Workspace completion meter shows missing profile items.
3. **Action discovery** — Quick Actions surface relevant tasks per workspace type.
4. **Activity awareness** — Recent Activity consumes the Timeline engine.
5. **Guided improvement** — Rule-based Recommendations until AI engine ships.
6. **Metrics at a glance** — KPI cards replace plain lists where counts matter.
7. **Consistent workspace chrome** — Header, status, favorites, primary actions in one layout.
8. **Notification foundation** — Bell + persisted store for successes, warnings, errors.
9. **Search foundation** — Shell ready for Ctrl+K global search.
10. **Favorites** — Pin parties, groups, and future modules locally.

---

## Notifications

- Component: `PlatformNotificationCenter`, `PlatformNotificationBell`
- Hook: `useNotifications` — localStorage-backed store
- Header integration: `platform-header.tsx`

Future: workflow, AI, approvals, domain events.

---

## Favorites

- Component: `PlatformFavoriteButton`
- Hook: `useFavorites` — localStorage-backed pins
- Entity types: `party`, `group`, `organization` (extensible)

---

## Global Search

- Component: `PlatformGlobalSearchShell`, `PlatformGlobalSearchTrigger`
- Current: placeholder shell only
- Future: Ctrl+K, cross-module search

---

## Workspace Header

Component: `PlatformWorkspaceHeader`

Every workspace provides:

- Back link, workspace label, title, status, created date
- Optional completion meter + quick actions row
- Primary lifecycle actions (Activate, Suspend, Archive, etc.)
- Favorite pin control

---

## UX-001.2 — Enterprise Experience & Channel-Aware Consent

Sprint UX-001.2 delivers enterprise-grade workspace patterns:

| ID | Standard | Component / Engine |
|----|----------|-------------------|
| UX-001.2a | Enterprise Dashboard Identity | `platform-enterprise-dashboard-header.tsx` |
| UX-001.2b | Workspace Visual Zones | CSS vars + `platform-workspace-*` utilities |
| UX-001.2c | Search Experience Standard | `platform-search-state.tsx` |
| UX-001.2d | Document Preview Standard | `platform-document-preview.tsx` |
| UX-001.2e | Consent Capture Architecture | `ConsentEngineService` |
| UX-001.2f | Event-driven Consent Model | `party_consent_event` + ENG-003b sources |
| UX-001.2g | Consent Sources (ENG-003b) | `consent_source` reference entity |

**Rule file:** `.cursor/rules/ui-std-006-enterprise-experience.mdc`

### Enterprise Dashboard Identity

```
Good Afternoon, Vincent
ABC Kenya Ltd
Operations Manager
```

Identity resolution via `resolveUserGreetingName`: Preferred Name → First Name → Display Name → Full Name → Username → Email → Phone (last resort).

### Workspace Visual Zones

| Zone | Background | Purpose |
|------|------------|---------|
| Left Navigation | `#F6F8FA` | Navigation |
| Center Workspace | `#FFFFFF` | Focused work |
| Right Guidance Panel | `#F8FBFF` | Assistant, recommendations |

### Search Experience Standard

`PlatformSearchState` — Searching / Empty / Error / Success.

### Document Preview Standard

`PlatformDocumentPreview` — in-app slide-over; never `window.open` for preview.

### Consent Capture Architecture

Event-driven consent via Consent Engine; ENG-003b owns `consent_source`; Party Workspace displays only.

### Platform UX Principles (UX-001.2)

11. Identity-first dashboards  
12. Event-sourced consent  
13. In-app document preview  
14. Consistent search states  
15. Visual workspace zoning  

---

## UX-001.3 — Industry-Native Experience (AP-001)

**Architectural principle:** [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md) AP-001.

Users must never see capabilities, terminology, or configuration options from unrelated industries. The platform presents an Industry Edition — not a generic multi-industry interface with hidden menus.

### Rule

Every authenticated business operates within exactly one **Industry Edition**. Navigation, labels, dashboards, product types, workflow templates, and configuration forms are generated from that edition's Industry Experience Profile (ENG-003k).

### Visibility examples

| Industry Edition | User sees | User never sees |
|-----------------|-----------|-----------------|
| **Banking** | Customers, Loans, Deposits, Cards, Treasury, Branches, Compliance | Patients, Classrooms, Bedrooms, Rental Units |
| **Healthcare** | Patients, Doctors, Appointments, Procedures, Laboratory, Pharmacy | Loan Products, Collateral, Classrooms, Mortgages |
| **Property** | Properties, Units, Tenants, Leases, Rent, Maintenance | Patients, Loan Installments, Students, Deposits |
| **Education** | Students, Teachers, Classes, Subjects, Fees, Examinations | Patients, Mortgages, Loan Products, Rental Units |
| **Retail** | Products, Inventory, Sales, Customers, Promotions | Patients, Loan Products, Tenants, Procedures |

### UX implementation requirements

1. **Navigation** — Left navigation is generated from the Industry Profile, not from a global module list.
2. **Terminology** — Labels adapt by edition (Customer / Patient / Tenant / Student; Product / Service / Procedure).
3. **Product creation** — Product type picker shows only edition-relevant types (Loan Product for Banking; Rental Unit for Property; Medical Service for Healthcare).
4. **Dashboards** — Landing pages and KPI widgets are edition-specific.
5. **Empty states and guided actions** — Next-step prompts reference edition-relevant modules only.
6. **Search** — Global search results are scoped to edition-visible modules.

### Relationship to existing UX standards

All UX-001 standards (action naming, empty states, breadcrumbs, workspace chrome) apply within the edition boundary. Industry-native experience is an additional constraint — not a replacement for enterprise interaction patterns.

**Rule file (planned):** `.cursor/rules/ui-std-007-industry-native-experience.mdc`

**Engine owner:** ENG-003k Industry Experience Engine; metadata stored via ENG-003a Configuration Engine.


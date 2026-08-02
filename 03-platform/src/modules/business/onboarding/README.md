# Business Onboarding Module

## Purpose

Implements IP-006 Business Activation & Configuration Wizard.

## WHY

Guide DRAFT businesses through mandatory setup, then activate to ACTIVE so
operational Build Packs become available.

## UX Standards (ENG-003j)

Business Setup Wizard feedback follows platform UX standards:

- **Success:** green `Alert variant="success"` with step-specific copy; navigation only after explicit Continue (no silent redirect).
- **Validation:** section-scoped destructive alerts with field highlight and auto-scroll to the first invalid field.
- **Duplicates:** friendly messages include the conflicting value (mobile, email, etc.).
- **Employee setup:** after creation, only **Create another employee** and **Continue to review** — never re-submits created employees.

See `components/setup-wizard-feedback.tsx` and `setup-step-success-messages.ts`.

## Structure

- `actions/` — Server Actions for setup UI
- `services/` — BusinessSetupService + pure setup-rules helpers
- `repositories/` — Drizzle persistence for configuration and progress
- `validators/` — Zod structural validators
- `components/` — Presentation-only wizard UI
- `constants.ts` — Step catalogue and wizard version

## Architecture

UI → Server Actions → BusinessSetupService → Repositories → Drizzle → Supabase

## Configuration Model

`business_configuration.settings` is a metadata JSON document grouped as:

- paymentMethods
- receipt
- tax
- features

New configuration items can be added as settings keys without schema redesign.

## Progress Audit

`business_setup_progress` tracks:

- current_step
- last_completed_step
- completed_by (platform_user)
- completed_at
- wizard_version

## Status Lifecycle

- Registration creates business as `DRAFT`
- Setup wizard completes mandatory steps
- Activate transitions to `ACTIVE`
- Operational modules require `ACTIVE`

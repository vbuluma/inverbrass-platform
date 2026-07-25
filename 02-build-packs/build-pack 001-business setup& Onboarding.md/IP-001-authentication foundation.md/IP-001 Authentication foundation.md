# IP-001 — Authentication Foundation

**Implementation Package:** IP-001  
**Status:** Ready for Review  
**Architecture Dependency:** AD-009 Authentication & Business Onboarding (Architecture Locked)  
**Release:** R1 – Platform Foundation  
**Build Pack:** BP-001 – Business Setup & Onboarding  

---

## 1. Executive Summary

IP-001 implements the **Authentication Foundation only** for the InverBrass Platform, scoped strictly to ENG-001 authentication responsibilities defined in AD-009 §2.7 (`AuthService`, `BusinessContextService`).

This package provides Supabase Auth integration, login/logout orchestration, session management, authentication middleware, current business context initialization, authentication validation, and authentication audit event emission through the defined interface.

**Business onboarding responsibilities have been removed from IP-001** and deferred to **IP-002** (registration orchestration, `OnboardingService`, `SecurityQuestionService`, role assignment, security question schema/seeds, and related migrations).

No architecture redesign was performed.

---
### Prompt implemented(Skills)

Release:
Release 1 – Platform Foundation

Build Pack:
BP-001 – Business Setup & Onboarding

Implementation Package:
IP-001 – Authentication Foundation

Architecture Dependency:
AD-009 Authentication & Business Onboarding (Architecture Locked)

Objective

Implement the Authentication Foundation exactly as defined in AD-009.

This is an implementation package.

Do NOT redesign the architecture.

Follow all approved Architecture Decisions (ADRs).

----------------------------------------------------------
Scope
----------------------------------------------------------

Implement ONLY the Authentication Foundation.

Include:

1. Supabase Authentication integration

2. Authentication Service layer

3. Password hashing using Supabase Auth

4. Security Question hashing

5. User registration orchestration

6. Login orchestration

7. Logout orchestration

8. Session management

9. Authentication middleware

10. Current Business Context initialization

11. Authentication audit event generation

----------------------------------------------------------
Do NOT Implement
----------------------------------------------------------

Do NOT implement:

• Business Registration UI

• Employee Management

• Business Invitations

• Password Recovery

• SMS OTP

• Email Verification

• Google Login

• Microsoft Login

• Authenticator App

• MFA

• Business Switcher UI

• Configuration Management

Those belong to future Implementation Packages.

----------------------------------------------------------
Implementation Principles
----------------------------------------------------------

Follow the existing project architecture.

Inspect existing folders before creating new files.

Reuse existing code where possible.

Do not modify unrelated files.

Use:

• Next.js App Router

• TypeScript

• Drizzle ORM

• Supabase Auth

Follow:

• UUID primary keys

• camelCase in TypeScript

• snake_case in PostgreSQL

• Existing coding conventions

• Existing folder structure

----------------------------------------------------------
Authentication Requirements
----------------------------------------------------------

Username

• Mobile Number

Password

• Managed by Supabase Auth

Security Questions

• Store Question ID only

• Store hashed Security Answer only

• Never store plain text answers

Business Context

Initialize Current Business Context after successful authentication using the approved architecture.

Authentication Events

Generate audit events for:

• Registration

• Login Success

• Login Failure

• Logout

Do not implement the Audit Engine.

Only emit events through the defined interface.

----------------------------------------------------------
Quality Requirements
----------------------------------------------------------

Implementation must:

• Compile successfully

• Pass TypeScript checks

• Pass linting

• Contain no placeholder logic

• Follow modular monolith architecture

----------------------------------------------------------
Deliverables
----------------------------------------------------------

Provide:

1. Executive Summary

2. Files Created

3. Files Modified

4. Services Implemented

5. Middleware Implemented

6. Authentication Flow Implemented

7. Business Rules Implemented

8. Architecture Compliance Check

9. Type Check Result

10. Lint Result

11. Known Limitations

12. Implementation Record (IR)

Include:

Implementation Package:
IP-001

Status:
Ready for Review

Do not proceed to another Implementation Package.

Wait for approval.

## 2. Scope Boundary

### In scope (IP-001)

| # | Capability |
|---|------------|
| 1 | Supabase Authentication integration |
| 2 | Authentication Service layer (`AuthService`) |
| 3 | Password verification via Supabase Auth (hashing delegated to provider) |
| 4 | Login orchestration |
| 5 | Logout orchestration |
| 6 | Session management |
| 7 | Authentication middleware |
| 8 | Current Business Context initialization (`BusinessContextService`) |
| 9 | Authentication validation (login credentials, E.164 mobile normalization) |
| 10 | Authentication audit interface (`AuthenticationAuditEmitter`) |

### Removed from IP-001 (deferred to IP-002)

| Item | Reason |
|------|--------|
| `OnboardingService` | Business onboarding — IP-002 |
| Owner registration orchestration | Business onboarding — IP-002 |
| `RoleAssignmentService` | Provisioning/onboarding — IP-002 |
| `SecurityQuestionService` | Onboarding + recovery — IP-002 |
| Security question schema/seeds | Onboarding — IP-002 |
| `platform_user` schema changes | Onboarding schema deliverable — IP-002 |
| Migration `0001_ip001_auth_foundation.sql` | Onboarding/IAM migration — IP-002 |
| `registerOwnerAction` | Registration UI/onboarding — IP-002 |
| BP-001 password policy validator (registration) | Onboarding validation — IP-002 |

---

## 3. Files Created

### Core Auth (ENG-001)

| File | Purpose |
|------|---------|
| `03-platform/src/core/auth/README.md` | Module documentation |
| `03-platform/src/core/auth/index.ts` | Public exports |
| `03-platform/src/core/auth/constants.ts` | Auth constants and lockout policy |
| `03-platform/src/core/auth/types.ts` | Auth session and login types |
| `03-platform/src/core/auth/errors.ts` | AuthError + user-friendly messages |
| `03-platform/src/core/auth/adapters/identity-provider-adapter.ts` | Provider adapter interface |
| `03-platform/src/core/auth/adapters/supabase-identity-provider-adapter.ts` | Supabase Auth adapter |
| `03-platform/src/core/auth/validators/auth-validators.ts` | Login credential validation (Zod) |
| `03-platform/src/core/auth/utils/phone-normalizer.ts` | E.164 normalization (ADR-016) |
| `03-platform/src/core/auth/utils/helpers.ts` | Client context helper |
| `03-platform/src/core/auth/session/business-context-cookie.ts` | Signed business context cookie |
| `03-platform/src/core/auth/services/auth-service.ts` | Login/logout/session orchestration |
| `03-platform/src/core/auth/services/business-context-service.ts` | Current business context |
| `03-platform/src/core/auth/actions/auth-actions.ts` | Server Actions (login, logout, session) |

### Core Audit Interface

| File | Purpose |
|------|---------|
| `03-platform/src/core/audit/types.ts` | Audit event types + emitter port |
| `03-platform/src/core/audit/authentication-audit-emitter.ts` | `AuthenticationAuditEmitter` default implementation |
| `03-platform/src/core/audit/index.ts` | Public exports |

### Database Client

| File | Purpose |
|------|---------|
| `03-platform/src/db/client.ts` | Shared Drizzle database client |
| `03-platform/src/db/schema/index.ts` | Schema barrel export |
| `03-platform/src/db/schema/user-security-profile.ts` | Lockout / must-change-password profile (auth reads) |

### Middleware

| File | Purpose |
|------|---------|
| `03-platform/middleware.ts` | Supabase session refresh + route protection |

---

## 4. Files Deferred to IP-002 (scope correction)

| File | Former purpose | Moved to |
|------|----------------|----------|
| `src/core/auth/services/onboarding-service.ts` | Owner registration | IP-002 |
| `src/core/auth/services/role-assignment-service.ts` | Role assignment | IP-002 |
| `src/core/auth/services/security-question-service.ts` | Security answer hashing | IP-002 |
| `src/core/auth/utils/password-policy.ts` | Registration password policy | IP-002 |
| `src/db/schema/security-question.ts` | Security question catalog | IP-002 |
| `src/db/schema/user-security-answer.ts` | Hashed security answers | IP-002 |
| `src/db/seeds/security-questions.ts` | Catalog seed data | IP-002 |
| `src/db/seeds/security-questions-seed.ts` | Seeder | IP-002 |
| `drizzle/0001_ip001_auth_foundation.sql` | IAM/onboarding migration | IP-002 |

---

## 5. Files Modified

| File | Change |
|------|--------|
| `03-platform/package.json` | Added `zod`, `typecheck` script; removed `bcryptjs` (IP-002) |
| `03-platform/src/db/schema/platform-user.ts` | **Reverted** to frozen IAM schema (email NOT NULL, optional phone) |
| `03-platform/drizzle/meta/_journal.json` | Removed IP-001 migration entry |
| `03-platform/src/db/seed.ts` | Removed security question seeding |

---

## 6. Services Implemented

| Service | Operations |
|---------|------------|
| **AuthService** | `login`, `logout`, `getAuthenticatedUser`, `refreshSession` |
| **BusinessContextService** | `getCurrentContext`, `setCurrentBusiness`, `initializeContextForUser`, `clearContext`, `getActiveMemberships` |
| **SupabaseIdentityProviderAdapter** | `signInWithPassword`, `signOut`, `getSession`, `getUser`, `updatePassword` |
| **AuthenticationAuditEmitter** | `emit` (interface port; ENG-013 not implemented) |

---

## 7. Middleware Implemented

**File:** `03-platform/middleware.ts`

| Responsibility | Implementation |
|----------------|----------------|
| Supabase session refresh | `@supabase/ssr` cookie handling |
| Unauthenticated redirect | Protected routes → `/login` |
| Authenticated redirect | `/login`, `/register` → `/dashboard` |
| Business context enforcement | Authenticated routes require signed business context cookie |
| Public routes | `/`, `/login`, `/register`, `/recover-password` |
| Context-exempt routes | `/select-business`, `/first-login` |

---

## 8. Authentication Flow Implemented

### Login (`AuthService.login`)

1. Validate credentials (Zod)
2. Normalize mobile to E.164
3. Supabase Auth `signInWithPassword`
4. Load platform user + security profile
5. Enforce account active + lockout rules
6. If `mustChangePassword`, return redirect signal
7. Initialize business context via `BusinessContextService`
8. Emit `LOGIN_SUCCESS` or `LOGIN_FAILURE` audit event

### Logout (`AuthService.logout`)

1. Clear business context cookie
2. Supabase Auth `signOut`
3. Emit `LOGOUT` audit event

---

## 9. Business Rules Implemented

| Rule | ADR | Implementation |
|------|-----|----------------|
| Mobile number as username | ADR-010 | E.164 normalization + Supabase email alias |
| Password hashing by Supabase Auth | ADR-009 | No platform password storage |
| Current business context | ADR-012 | Signed httpOnly cookie + `is_primary` persistence |
| Combined access evaluation | AD-009 §2.8.4 | Active user + active membership + active business |
| Authentication audit events | ADR-018 | Login success/failure, logout, account locked |
| Business-friendly errors | AD-009 §2.9.4 | Mapped in `AuthError` |
| Failed login lockout | AD-009 §2.8.1 | 5 attempts → 15-minute lockout |

---

## 10. Architecture Compliance Check

| Requirement | Status | Notes |
|-------------|--------|-------|
| AD-009 AuthService scope | ✅ | Login, logout, session only |
| AD-009 BusinessContextService scope | ✅ | Context init/switch/clear |
| Onboarding excluded from IP-001 | ✅ | Deferred to IP-002 |
| Supabase Auth for credentials | ✅ | `IdentityProviderAdapter` |
| Audit Engine not implemented | ✅ | `AuthenticationAuditEmitterPort` interface only |
| Modular monolith layering | ✅ | Server Actions → Services → DB/Provider |
| Frozen IAM schema preserved | ✅ | `platform_user` reverted |

---

## 11. Type Check Result

```
npm run typecheck → Exit code: 0 ✅
```

---

## 12. Lint Result

```
npm run lint → Exit code: 0 ✅
```

---

## 13. Known Limitations

1. **Registration not available** — deferred to IP-002 (`OnboardingService`, security questions, role assignment).
2. **Mobile alias mapping** — E.164 maps to internal Supabase email alias until Phase 2 phone OTP.
3. **Audit persistence** — events emit via `AuthenticationAuditEmitter`; ENG-013 not implemented.
4. **Schema/migrations** — IAM tables and security profile migration deferred to IP-002; existing `0000_mature_blob.sql` unchanged.
5. **No UI screens** — Server Actions only; UI in IP-002/IP-003.
6. **`user_security_profile` schema present** — read/written by `AuthService` for lockout; table migration deferred to IP-002.

---

## 14. Implementation Record (IR)

| Field | Value |
|-------|-------|
| **Implementation Package** | IP-001 |
| **Title** | Authentication Foundation |
| **Architecture Dependency** | AD-009 (Locked) |
| **Status** | **Ready for Review** |
| **Scope correction applied** | 2026-07-22 — onboarding removed, deferred to IP-002 |
| **Verification** | TypeScript ✅ · ESLint ✅ |
| **Next Step** | Await approval; then proceed to **IP-002 — Business Onboarding** |

---

**Do not proceed to IP-002 until IP-001 is approved.**

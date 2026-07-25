# IP-004 – First Login & Password Management

Release:
Release 1 – Platform Foundation

Build Pack:
BP-001 – Business Setup & Onboarding

Implementation Package:
IP-004 – First Login & Password Management

Architecture Dependency:
AD-009 Authentication & Business Onboarding (Architecture Locked)

Prerequisite Implementation Packages:
• IP-001 – Authentication Foundation (Approved)
• IP-002 – Business Owner Registration & Business Onboarding (Approved)
• IP-003 – Business context (Approved)

==================================================================
OBJECTIVE
==================================================================

Implement the First Login & Password Management capability exactly as defined in AD-009.

This is an Implementation Package.

Do NOT redesign the architecture.

Reuse all existing implementations from IP-001 and IP-002 and IP-003 wherever applicable.

==================================================================
PRE-IMPLEMENTATION VALIDATION (MANDATORY)
==================================================================

Before writing any code:

1. Review AD-009 Authentication & Business Onboarding.

2. Review:
   • IP-001 Authentication Foundation
   • IP-002 Business Owner Registration & Business Onboarding
   • IP-003 – Business context (Approved)

3. Identify existing services, validators, utilities, constants, schemas, middleware and reusable code.

4. Reuse existing implementations wherever possible.

5. Do NOT duplicate existing functionality.

6. If any architectural conflict or dependency gap exists, report it before implementation.

Only begin coding after successful validation.

==================================================================
SCOPE
==================================================================

Implement ONLY the following capabilities.

----------------------------------------------------------
1. First Login Detection
----------------------------------------------------------

Implement first-login enforcement using the approved authentication architecture.

After successful authentication:

• Check mustChangePassword
• Prevent access to business modules
• Redirect user to First Login page
• Preserve authenticated session
• Preserve Business Context

----------------------------------------------------------
2. Password Change
----------------------------------------------------------

Implement secure password change.

Include:

• Current password validation
• New password
• Confirm password
• BP-001 Password Policy validation
• Update password using Supabase Auth
• Clear mustChangePassword
• Update audit information

Passwords shall continue to be managed exclusively by Supabase Auth.

No platform password storage.

----------------------------------------------------------
3. Security Question Setup
----------------------------------------------------------

If the user has not configured Security Questions:

• Load active Security Question catalog
• Allow user to select one approved question
• Capture Security Answer
• Hash Security Answer using bcrypt
• Store only:
    - Security Question ID
    - Security Answer Hash

Never store plaintext answers.

Reuse the existing SecurityQuestionService.

----------------------------------------------------------
4. Business Context
----------------------------------------------------------

Business Context shall remain active.

The user shall NOT be required to log in again after changing the password.

Business Context shall continue uninterrupted.

----------------------------------------------------------
5. Authentication Audit Events
----------------------------------------------------------

Emit events only through the existing Authentication Audit interface.

Generate:

• PASSWORD_CHANGED
• FIRST_LOGIN_COMPLETED

Do NOT implement the Audit Engine.

==================================================================
DO NOT IMPLEMENT
==================================================================

Do NOT implement:

• Forgot Password
• Password Recovery
• SMS OTP
• Email OTP
• MFA
• Authenticator Apps
• Google Login
• Microsoft Login
• Passkeys
• Employee Invitations
• Business Switching
• Session Timeout Hardening
• Business Registration UI

These belong to future Implementation Packages.

==================================================================
IMPLEMENTATION PRINCIPLES
==================================================================

Reuse existing implementations wherever possible.

Specifically reuse:

• AuthService
• BusinessContextService
• SecurityQuestionService
• IdentityProviderAdapter
• Validators
• Middleware
• Existing constants
• Existing schemas
• Existing audit interfaces

Do not duplicate logic.

Follow:

• Next.js App Router
• TypeScript
• Drizzle ORM
• Supabase Auth
• Zod
• Existing project structure
• Existing naming standards
• Existing folder structure

==================================================================
MANDATORY DEVELOPMENT STANDARDS
==================================================================

This implementation SHALL comply with:

Document 07 – Development Standards & Coding standards

The implementation is considered INCOMPLETE if these standards are not followed.

----------------------------------------------------------
Explainable Code
----------------------------------------------------------

Every production file shall begin with a documentation header containing:

• Purpose
• Business Context
• Architecture Dependency
• Implementation Package
• Responsibilities
• Non-Responsibilities
• Dependencies
• Business Rules Implemented
• Extension Points

----------------------------------------------------------
Public Classes
----------------------------------------------------------

Every public class shall include business-focused documentation.

----------------------------------------------------------
Public Methods
----------------------------------------------------------

Every public method shall document:

• Purpose
• Business Context
• Inputs
• Outputs
• Exceptions
• Business Rules Implemented
• ADR references where applicable

----------------------------------------------------------
Comments
----------------------------------------------------------

Comments shall explain WHY the code exists rather than WHAT the code does.

----------------------------------------------------------
Transactions
----------------------------------------------------------

Every database transaction shall document:

• Why the transaction is required
• Consistency guarantees
• Rollback behaviour

----------------------------------------------------------
Integrations
----------------------------------------------------------

Every integration shall document:

• External dependency
• Purpose
• Failure behaviour

----------------------------------------------------------
Business Traceability
----------------------------------------------------------

Every major service shall document:

• Release
• Build Pack
• Capability
• Architecture Dependency
• Implementation Package

Business Rules shall reference the originating ADR or Architecture section wherever applicable.

==================================================================
ENGINEERING PRINCIPLES
==================================================================

Mandatory:

• Security by Design
• Configuration over Customization
• API First
• Metadata Driven
• Modular Development
• Reuse Before Create
• Logging Required
• No Orphan Code
• Deployment Agnostic

==================================================================
QUALITY REQUIREMENTS
==================================================================

Implementation must:

• Compile successfully
• Pass TypeScript checks
• Pass linting
• Contain no placeholder logic
• Reuse existing services
• Follow Modular Monolith Architecture
• Follow Development Standards
• Maintain Architecture Traceability

==================================================================
DELIVERABLES
==================================================================

Provide:

1. Executive Summary

2. Files Created

3. Files Modified

4. Services Implemented

5. First Login Flow

6. Password Change Flow

7. Security Question Setup Flow

8. Business Rules Implemented

9. Architecture Compliance Check

10. Development Standards Compliance Check

11. Type Check Result

12. Lint Result

13. Known Limitations

14. Implementation Record (IR)

Include:

Implementation Package:
IP-004

Status:
Ready for Review

Architecture Dependency:
AD-009

Depends On:
• IP-001
• IP-002
• IP-003

==================================================================
STOP CONDITION
==================================================================

Do NOT proceed to another Implementation Package.

Wait for approval before beginning IP-005.

---

# IP-004 — Implementation Record

**Implementation Package:** IP-004  
**Status:** Ready for Review  
**Architecture Dependency:** AD-009 Authentication & Business Onboarding (Architecture Locked)  
**Release:** R1 – Platform Foundation  
**Build Pack:** BP-001 – Business Setup & Onboarding  

---

## 1. Executive Summary

IP-004 implements **First Login & Password Management** per AD-009 §3.4, reusing IP-001 authentication, IP-002 security question storage, and IP-003 business context without redesigning the architecture.

This package delivers forced first-login detection, middleware enforcement of the first-login route, secure password change with current-password validation and BP-001 policy, optional security question setup when no answer exists, uninterrupted business context preservation, and authentication audit events (`PASSWORD_CHANGED`, `FIRST_LOGIN_COMPLETED`).

No password recovery, MFA, or employee provisioning UI were implemented — those remain in future Implementation Packages.

---

## 2. Files Created

| File | Purpose |
|------|---------|
| `03-platform/src/core/auth/session/auth-flags-cookie.ts` | ~~Signed httpOnly cookie mirroring `mustChangePassword`~~ **Removed in architecture review** |
| `03-platform/src/core/auth/guards/authenticated-route-guard.ts` | Service-layer route guards using AuthService as SSOT |
| `03-platform/src/core/auth/validators/first-login-validators.ts` | Zod validation for first-login password change payload |
| `03-platform/src/core/auth/actions/first-login-actions.ts` | Server Actions (`getFirstLoginContextAction`, `completeFirstLoginAction`) |
| `03-platform/src/app/first-login/page.tsx` | First-login page (loads context + security questions) |
| `03-platform/src/app/first-login/first-login-form.tsx` | Client form for password change and security Q&A |
| `03-platform/src/app/dashboard/page.tsx` | Minimal post-login destination (middleware target) |

---

## 3. Files Modified

| File | Change |
|------|--------|
| `03-platform/middleware.ts` | Session refresh + business context validation only (first-login delegated to route guards) |
| `03-platform/src/core/auth/constants.ts` | ~~Added `AUTH_FLAGS_COOKIE`~~ Removed after architecture review |
| `03-platform/src/core/auth/types.ts` | Added `FirstLoginPayload`, `FirstLoginResult`, `FirstLoginContext` |
| `03-platform/src/core/auth/errors.ts` | First-login error codes and user messages |
| `03-platform/src/core/auth/services/auth-service.ts` | Business context on forced login; `getFirstLoginContext`, `completeFirstLogin` |
| `03-platform/src/core/auth/services/security-question-service.ts` | Added `hasStoredAnswer` |
| `03-platform/src/core/auth/adapters/identity-provider-adapter.ts` | Added `verifyPassword` port |
| `03-platform/src/core/auth/adapters/supabase-identity-provider-adapter.ts` | Implemented `verifyPassword` |
| `03-platform/src/core/audit/types.ts` | Added `FIRST_LOGIN_COMPLETED` audit event |
| `03-platform/src/core/auth/index.ts` | Export first-login actions and types |
| `03-platform/src/core/auth/README.md` | Updated scope and entry points |

---

## 4. Services Implemented

| Service | Operations |
|---------|------------|
| **AuthService** | `getFirstLoginContext`, `completeFirstLogin` (added); login updated to preserve business context when `mustChangePassword=true` |
| **SecurityQuestionService** | `hasStoredAnswer` (added) |
| **SupabaseIdentityProviderAdapter** | `verifyPassword` (added) — validates current password via Supabase Auth |

**Reused:** `BusinessContextService`, `SecurityQuestionService.hashAndStoreAnswer`, `AuthenticationAuditEmitter`

---

## 5. First Login Flow

1. User signs in with temporary password (`AuthService.login`)
2. Platform detects `must_change_password=true`
3. Business context initialized and preserved (`BusinessContextService.initializeContextForUser`)
4. Signed auth-flags cookie set; route guards restrict access to business modules
5. User submits new password (+ security Q&A if not configured)
6. `AuthService.completeFirstLogin` validates current password, updates Supabase Auth password, stores hashed security answer when required, clears `must_change_password`
7. Audit events `PASSWORD_CHANGED` and `FIRST_LOGIN_COMPLETED` emitted
8. User redirected to dashboard (or business selection when applicable) without re-login

---

## 6. Password Change Flow

1. Validate payload (Zod + BP-001 password policy + confirm match + new ≠ current)
2. Verify session and `mustChangePassword` flag
3. Verify current password via `IdentityProviderAdapter.verifyPassword`
4. Update password via Supabase Auth `updateUser`
5. Transaction: store security answer (if required) + set `must_change_password=false`
6. Preserve existing business context cookie; initialize only if missing
7. Emit audit events

---

## 7. Security Question Setup Flow

1. `SecurityQuestionService.hasStoredAnswer` checks `user_security_answer`
2. When no answer exists, first-login form loads catalog via `getSecurityQuestionsAction`
3. User selects one active question and provides answer
4. Answer normalized and hashed with bcrypt; only question ID + hash stored

---

## 8. Business Rules Implemented

| Rule | ADR / Section | Implementation |
|------|---------------|----------------|
| First-login password change | AD-009 §3.4 | `mustChangePassword` gate + middleware redirect |
| BP-001 password policy | AD-009 §2.10 | `passwordPolicySchema` in `first-login-validators.ts` |
| Current password validation | AD-009 §3.4.2 | `verifyPassword` before `updatePassword` |
| New password ≠ current password | AD-009 §3.4.2 | Zod refine in `firstLoginSchema` |
| Security answer hashing | AD-009 §3.7 | Reused `SecurityQuestionService.hashAndStoreAnswer` |
| Business context preserved | IP-004 §4 | Context initialized at login; not cleared on password change |
| No platform password storage | AD-009 | Supabase Auth only |
| Authentication audit events | ADR-018 | `PASSWORD_CHANGED`, `FIRST_LOGIN_COMPLETED` |

---

## 9. Architecture Compliance Check

| Requirement | Status | Notes |
|-------------|--------|-------|
| AD-009 AuthService first-login orchestration | ✅ | `completeFirstLogin` per §3.4 sequence |
| Reuse SecurityQuestionService | ✅ | Catalog, hash, store |
| Reuse BusinessContextService | ✅ | Context preserved across first login |
| Supabase Auth for passwords | ✅ | No platform password storage |
| Audit Engine not implemented | ✅ | Events via `AuthenticationAuditEmitterPort` |
| Scope exclusions respected | ✅ | No recovery, MFA, invitations |
| Modular monolith layering | ✅ | Server Actions → Services → DB/Provider |

---

## 10. Development Standards Compliance Check

| Standard | Status |
|----------|--------|
| Documentation headers on new production files | ✅ |
| Public method business documentation (AuthService) | ✅ |
| Transaction documented in `completeFirstLogin` | ✅ |
| Zod validation | ✅ |
| Reuse before create | ✅ |
| Architecture traceability | ✅ |

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

1. **Employee provisioning UI not implemented** — `mustChangePassword=true` users must be created by a future IP; first-login flow is ready when provisioned.
2. **Minimal UI** — Functional first-login page only; styling polish deferred.
3. **Dashboard placeholder** — `/dashboard` is a minimal stub for middleware redirect targets.
4. **Audit persistence** — Events emit via `AuthenticationAuditEmitter`; ENG-013 not implemented.

---

## 14. Implementation Record (IR)

| Field | Value |
|-------|-------|
| Implementation Package | IP-004 |
| Status | Architecture Review Complete |
| Architecture Dependency | AD-009 |
| Depends On | IP-001, IP-002, IP-003 |
| Date | 2026-07-23 |

---

# IP-004 — Architecture Compliance Review

**Status:** Architecture Review Complete  
**Review Date:** 2026-07-23  

---

## 1. Architecture Compliance Findings

| Area | Initial Finding | Resolution |
|------|-----------------|------------|
| Duplicate state | `auth-flags-cookie` mirrored `user_security_profile.must_change_password` | **Removed** — single source of truth restored |
| Middleware scope | Middleware evaluated duplicate cookie flag | **Corrected** — middleware reverted to IP-001 scope; first-login enforcement moved to route guards |
| Route protection | First-login enforcement relied on cookie sync | **Corrected** — `authenticated-route-guard` reads AuthService / DB |
| Documentation | Several IP-004 files lacked Document 07 headers | **Corrected** on guard, middleware, actions, AuthService |
| Business context | No duplication found | **Compliant** — BusinessContextService remains sole owner |
| Security questions | No duplicated hashing | **Compliant** — SecurityQuestionService reused |
| Audit | No duplicate audit engine | **Compliant** — AuthenticationAuditEmitter only |

---

## 2. Issues Identified

1. **Critical — Duplicate `mustChangePassword` state**  
   Signed `inverbrass-auth-flags` cookie duplicated `user_security_profile.must_change_password`, creating sync risk and violating single-source-of-truth.

2. **Major — Middleware business flag evaluation**  
   Middleware read the duplicate cookie instead of delegating first-login policy to services.

3. **Minor — Incomplete Document 07 headers**  
   `auth-service.ts`, `middleware.ts`, and `first-login-actions.ts` lacked required explainability headers.

4. **Minor — Orphan export**  
   `getAuthFlagsFromCookie()` was exported but never consumed.

5. **Minor — Incorrect method documentation**  
   `getFirstLoginContext()` documented a `clientContext` input that does not exist.

---

## 3. Changes Applied

| Change | Description |
|--------|-------------|
| Removed auth-flags cookie module | Deleted `auth-flags-cookie.ts` and `AUTH_FLAGS_COOKIE` constant |
| Added route guards | Created `authenticated-route-guard.ts` with `assertAuthenticatedSession` and `assertFirstLoginCompleted` |
| Restructured App Router groups | `(authenticated)/first-login` and `(authenticated)/(app)/dashboard` with layout guards |
| Reverted middleware | Removed cookie-based first-login redirects; middleware performs session + business context checks only |
| Removed cookie sync calls | Deleted `setMustChangePasswordCookie` / `clearAuthFlagsCookie` from AuthService |
| Documentation | Added Document 07 headers to guard, middleware, actions, AuthService; expanded transaction and method docs |

---

## 4. Justification for Each Change

| Change | Justification |
|--------|---------------|
| Remove auth-flags cookie | Cookie duplicated an authoritative DB column with no architectural role distinct from business context cookie (which transports runtime selection, not a mirrored flag). Edge middleware cannot query PostgreSQL; route guards in Server Components call AuthService instead. |
| Route guard vs middleware cookie | AD-009 §3.4.2 requires first-login route restriction. Service-layer guards enforce the rule using `user_security_profile.must_change_password` as the only source of truth, avoiding hidden sync logic. |
| Middleware reversion | Middleware must not encode business rules from duplicate state. It retains authentication validation, session refresh, and business context cookie validation per IP-001/IP-003. |
| App Router grouping | `(authenticated)/(app)/layout.tsx` blocks business modules until first login completes; `(authenticated)/first-login` remains accessible with session only. |
| Documentation updates | Document 07 mandates explainable production code with architecture traceability. |

---

## 5. Files Modified

| File | Change |
|------|--------|
| `03-platform/middleware.ts` | Removed auth-flags logic; added Document 07 header |
| `03-platform/src/core/auth/constants.ts` | Removed `AUTH_FLAGS_COOKIE` |
| `03-platform/src/core/auth/services/auth-service.ts` | Removed cookie sync; added class/method/transaction documentation |
| `03-platform/src/core/auth/services/security-question-service.ts` | Completed `hasStoredAnswer` method documentation |
| `03-platform/src/core/auth/actions/first-login-actions.ts` | Added Document 07 header |
| `03-platform/src/core/auth/README.md` | Documented route guard and corrected scope |
| `03-platform/src/app/(authenticated)/layout.tsx` | **Created** — session guard |
| `03-platform/src/app/(authenticated)/(app)/layout.tsx` | **Created** — first-login completion guard |
| `03-platform/src/app/(authenticated)/first-login/*` | **Moved** from `app/first-login/` |
| `03-platform/src/app/(authenticated)/(app)/dashboard/*` | **Moved** from `app/dashboard/` |

---

## 6. Files Removed

| File | Reason |
|------|--------|
| `03-platform/src/core/auth/session/auth-flags-cookie.ts` | Duplicate state removed |
| `03-platform/src/app/first-login/page.tsx` | Moved to authenticated route group |
| `03-platform/src/app/first-login/first-login-form.tsx` | Moved to authenticated route group |
| `03-platform/src/app/dashboard/page.tsx` | Moved to protected app route group |

---

## 7. Documentation Improvements

- Added Document 07 file headers to `authenticated-route-guard.ts`, `middleware.ts`, `first-login-actions.ts`, and `AuthService`
- Documented single source of truth for `mustChangePassword` in route guard
- Documented middleware Edge runtime limitation and delegation to route guards
- Expanded transaction rollback/consistency documentation in `completeFirstLogin`
- Corrected `getFirstLoginContext` input documentation

---

## 8. Remaining Architectural Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Edge middleware cannot evaluate `mustChangePassword` | Low | Route guards enforce before business module render; AD-009 restriction preserved |
| Business context cookie is runtime transport, not SSOT | Accepted | Same pattern as IP-001/IP-003; authoritative membership data remains in PostgreSQL |
| `/select-business` page not yet implemented | Low | When added, place under `(authenticated)/(app)` so first-login guard applies |
| Employee provisioning not yet implemented | Medium | Future IP must set `user_security_profile.must_change_password=true` only in DB |

---

## 9. Type Check Result

```
npm run typecheck → Exit code: 0 ✅
```

---

## 10. Lint Result

```
npm run lint → Exit code: 0 ✅
```

---

## 11. Final Architecture Compliance Report

| Checklist Item | Status |
|----------------|--------|
| 1. Remove duplicate state | ✅ Auth-flags cookie removed |
| 2. Single source of truth | ✅ `mustChangePassword` → `user_security_profile` only |
| 3. Middleware scope | ✅ Session + business context only; no business rules |
| 4. BusinessContextService ownership | ✅ No duplication |
| 5. AuthService scope | ✅ Authentication only; no onboarding logic added |
| 6. SecurityQuestionService ownership | ✅ Hashing/storage reused |
| 7. Document 07 compliance | ✅ Improved on all IP-004 production files |
| 8. Orphan code removed | ✅ Cookie module and unused export removed |
| 9. Reuse verified | ✅ Existing services/adapters/validators reused |
| 10. Transactions documented | ✅ Rollback/consistency documented |
| 11. Audit events | ✅ AuthenticationAuditEmitter only |
| 12. Security | ✅ Supabase passwords; bcrypt for answers only |
| 13. Development standards | ✅ Compliant after refinement |

**Overall Status:** ✅ **Architecture Compliant — Ready for Approval**
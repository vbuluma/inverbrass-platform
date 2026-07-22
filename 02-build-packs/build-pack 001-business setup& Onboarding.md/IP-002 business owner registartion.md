# IP-002 — Business Owner Registration & Business Onboarding

**Implementation Package:** IP-002  
**Status:** Ready for Review  
**Architecture Dependency:** AD-009 Authentication & Business Onboarding (Architecture Locked)  
**Release:** R1 – Platform Foundation  
**Build Pack:** BP-001 – Business Setup & Onboarding  

---

## 1. Executive Summary

IP-002 implements **Business Owner Registration and Business Onboarding** per AD-009 §3.1, reusing the IP-001 Authentication Foundation without redesigning the architecture.

This package delivers atomic owner self-registration: Supabase Auth sign-up, platform user provisioning, security question answer storage (question ID + bcrypt hash), business and membership creation (with business contact phone persisted on the `business` entity), default `OWNER` platform role assignment, business context initialization, automatic session establishment, and granular authentication audit events (`USER_REGISTERED`, `BUSINESS_CREATED`, `MEMBERSHIP_CREATED`, `ROLE_ASSIGNED`).

Businesses are created with status **ACTIVE**. Onboarding progress is handled separately from business status.

No employee invitations, password recovery, MFA, or registration UI were implemented — those remain in future Implementation Packages.

---

## 2. Files Created

### Core Auth Services (ENG-001 — Onboarding)

| File | Purpose |
|------|---------|
| `03-platform/src/core/auth/services/onboarding-service.ts` | Owner registration orchestration (`registerOwner`) |
| `03-platform/src/core/auth/services/security-question-service.ts` | Catalog read, answer hashing (bcrypt), storage |
| `03-platform/src/core/auth/services/role-assignment-service.ts` | Platform role assignment with ADR-006 validation |
| `03-platform/src/core/auth/actions/onboarding-actions.ts` | Server Actions (`registerOwnerAction`, `getSecurityQuestionsAction`) |
| `03-platform/src/core/auth/validators/registration-validators.ts` | Zod validation for owner registration payload |
| `03-platform/src/core/auth/utils/password-policy.ts` | BP-001 password policy (AD-009 §2.10) |
| `03-platform/src/core/auth/utils/business-code.ts` | Unique business code generation with collision handling |

### Database Schema

| File | Purpose |
|------|---------|
| `03-platform/src/db/schema/security-question.ts` | Security question catalog |
| `03-platform/src/db/schema/user-security-answer.ts` | Per-user hashed security answers |
| `03-platform/drizzle/0001_ip002_business_owner_registration.sql` | IAM + onboarding migration |

### Seeds

| File | Purpose |
|------|---------|
| `03-platform/src/db/seeds/security-questions.ts` | Catalog seed data (16 questions) |
| `03-platform/src/db/seeds/security-questions-seed.ts` | Idempotent seeder |

---

## 3. Files Modified

| File | Change |
|------|--------|
| `03-platform/package.json` | Added `bcryptjs`, `@types/bcryptjs` |
| `03-platform/package-lock.json` | Dependency lock update |
| `03-platform/src/core/auth/adapters/identity-provider-adapter.ts` | Added `signUp` port |
| `03-platform/src/core/auth/adapters/supabase-identity-provider-adapter.ts` | Implemented Supabase `signUp` |
| `03-platform/src/core/auth/constants.ts` | Added `PLATFORM_ROLE_CODES.OWNER` |
| `03-platform/src/core/auth/errors.ts` | Registration error codes and messages |
| `03-platform/src/core/auth/types.ts` | `OwnerRegistrationPayload`, `OwnerRegistrationResult` |
| `03-platform/src/core/auth/index.ts` | Export onboarding services and actions |
| `03-platform/src/core/audit/types.ts` | Added `USER_REGISTERED`, `BUSINESS_CREATED`, `MEMBERSHIP_CREATED`, `ROLE_ASSIGNED` |
| `03-platform/src/db/schema/business.ts` | Added `phoneNumber` (business contact phone, E.164) |
| `03-platform/src/db/schema/index.ts` | Export new schema modules |
| `03-platform/src/db/seed.ts` | Security question catalog seeding |
| `03-platform/src/db/seeds/platform-roles.ts` | Platform role code `OWNER` |
| `03-platform/src/db/seeds/role-permissions.ts` | Permission matrix key `OWNER` |
| `03-platform/drizzle/0000_mature_blob.sql` | Added `phone_number` to `business` table |
| `03-platform/drizzle/meta/_journal.json` | Migration journal entry |

---

## 4. Services Implemented

| Service | Operations |
|---------|------------|
| **OnboardingService** | `registerOwner` — atomic owner registration orchestration |
| **SecurityQuestionService** | `getActiveCatalog`, `assertActiveQuestion`, `hashAndStoreAnswer`, `hashAnswer`, `verifyAnswer` |
| **RoleAssignmentService** | `assignPlatformRole` — assigns seeded platform roles to memberships |
| **SupabaseIdentityProviderAdapter** | `signUp` (added) — delegates password hashing to Supabase Auth |

**Reused from IP-001:** `AuthService`, `BusinessContextService`, `AuthenticationAuditEmitter`

---

## 5. Registration Flow Implemented

### `OnboardingService.registerOwner` (AD-009 §3.1.2)

1. Validate payload (Zod + BP-001 password policy)
2. Normalize owner and business mobile numbers to E.164
3. Assert phone not already registered
4. Validate business type, country, and security question catalog entry
5. Supabase Auth `signUp` (password hashed by provider)
6. **BEGIN TRANSACTION**
   - INSERT `platform_user` (linked via `auth_user_id`)
   - INSERT `user_security_profile`
   - INSERT `user_security_answer` (question ID + bcrypt hash only)
   - INSERT `business` (status `ACTIVE`, `phone_number` = business contact E.164)
   - INSERT `business_membership` (`ACTIVE`, `is_primary = true`)
   - INSERT `user_role` (`OWNER` platform role)
7. **COMMIT**
8. Establish session (`signUp` session or `signInWithPassword` fallback)
9. Initialize business context via `BusinessContextService.setCurrentBusiness`
10. Emit audit events: `USER_REGISTERED`, `BUSINESS_CREATED`, `MEMBERSHIP_CREATED`, `ROLE_ASSIGNED` (each SUCCESS)

### Server Action Entry Point

- `registerOwnerAction(payload)` — registration orchestration
- `getSecurityQuestionsAction()` — catalog for registration UI (future IP-003)

---

## 6. Business Rules Implemented

| Rule | ADR / AD-009 | Implementation |
|------|--------------|----------------|
| Mobile number as username | ADR-016 | E.164 normalization + Supabase email alias |
| Password hashed by Supabase Auth | ADR-009 | No platform password storage |
| BP-001 password policy | AD-009 §2.10 | Zod validator (8+ chars, upper, lower, number, special) |
| Security answer hashed by platform | ADR-011 | bcrypt (12 rounds); normalized before hash |
| Store question ID + hash only | AD-009 §3.8 | `user_security_answer` table |
| Default owner role | Approved seed | `OWNER` platform role code |
| Business status at registration | IP-002 refinement | `ACTIVE` — onboarding progress tracked separately |
| Business contact phone persisted | IP-002 refinement | `business.phone_number` (E.164) |
| Phone uniqueness | AD-009 §3.1 | Pre-check before Supabase sign-up |
| Confirm password match | AD-009 §2.10 | Zod refine on registration schema |
| Granular audit events | ADR-018 | Four separate events via audit emitter |
| Atomic provisioning | AD-009 §3.1 | Single DB transaction for platform records |

---

## 7. Business Code Generation Algorithm

**File:** `03-platform/src/core/auth/utils/business-code.ts`

### Algorithm

1. **Name prefix** — Take the business name, trim whitespace, convert to uppercase, strip non-alphanumeric characters, and take the first 8 characters. If the result is empty (e.g. name is all symbols), use `"BIZ"` as the prefix.
2. **Random suffix** — Generate 3 cryptographically random bytes (`randomBytes(3)`) and encode as 6 uppercase hexadecimal characters.
3. **Candidate code** — Concatenate `{prefix}-{suffix}` and truncate to 20 characters (matching `business.code` column length).

**Example:** `"Acme Retail"` → slug `ACMERETAI` → candidate `ACMERETAI-A3F2B1`

### Uniqueness guarantee

- Before insert, `generateUniqueBusinessCode()` queries `business.code` for each candidate.
- If a collision is found, a new candidate is generated with a fresh random suffix.
- Up to **10 attempts** are made; if all collide, registration fails with an error (extremely unlikely given 6 hex digits = 16,777,216 suffix combinations per prefix).
- The `business.code` column has a **UNIQUE constraint** as a final database-level safeguard.

### Collision handling

| Scenario | Handling |
|----------|----------|
| Candidate exists in DB | Regenerate with new random suffix (retry loop) |
| 10 consecutive collisions | Throw error; transaction rolls back; `USER_REGISTERED` FAILURE audit emitted |
| Concurrent insert race | UNIQUE constraint violation triggers transaction rollback |

---

## 8. Architecture Compliance Check

| Requirement | Status | Notes |
|-------------|--------|-------|
| AD-009 OnboardingService scope | ✅ | Owner registration only; add-business deferred |
| Reuse IP-001 AuthService / BusinessContextService | ✅ | No duplicated login/session logic |
| No architecture redesign | ✅ | Follows AD-009 §3.1 sequence |
| Supabase Auth for credentials | ✅ | `signUp` + session establishment |
| SecurityQuestionService scope | ✅ | Catalog read, hash, store |
| RoleAssignmentService scope | ✅ | Platform role assignment (`OWNER`) |
| Audit Engine not implemented | ✅ | Events via `AuthenticationAuditEmitterPort` only |
| Out-of-scope items excluded | ✅ | No invitations, recovery, MFA, UI |
| Modular monolith layering | ✅ | Server Actions → Services → DB/Provider |

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

## 11. Known Limitations

1. **No registration UI** — Server Actions only; UI deferred to IP-003.
2. **Supabase email confirmation** — If enabled in Supabase project settings, auto sign-in after registration may require confirmation; disable for BP-001 Phase 1 dev environments.
3. **Orphan auth user on DB failure** — Supabase `signUp` occurs before the DB transaction; a failed transaction leaves an auth user without platform records (compensating delete requires service-role API — future hardening).
4. **Business email** — Optional business email captured in payload; dedicated column deferred to business profile schema (phone is persisted on `business`).
5. **Migration prerequisite** — Run `npm run db:migrate` and `npm run db:seed` before registration (requires `country` and IAM reference data).
6. **Add-business flow** — `createAdditionalBusiness` deferred to a future IP per AD-009 §3.2.

---

## 12. Implementation Record (IR)

| Field | Value |
|-------|-------|
| **Implementation Package** | IP-002 |
| **Title** | Business Owner Registration & Business Onboarding |
| **Architecture Dependency** | AD-009 (Locked) |
| **Status** | **Ready for Review** |
| **Builds on** | IP-001 Authentication Foundation |
| **Refinements applied** | 2026-07-22 — OWNER role code, ACTIVE business status, 16 security questions, business phone persistence, granular audit events, business code algorithm documented |
| **Verification** | TypeScript ✅ · ESLint ✅ |
| **Next Step** | Await approval |

---

**Do not proceed to another Implementation Package until IP-002 is approved.**

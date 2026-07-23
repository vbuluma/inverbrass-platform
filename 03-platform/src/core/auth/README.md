# ENG-001 Authentication Engine (IP-001 + IP-002)

Authentication and onboarding services for BP-001, implemented per AD-009 §2.7.

## Scope

| Package | In scope | Out of scope |
|---------|----------|--------------|
| **IP-001** | Login / logout, session, business context init | Registration, security questions |
| **IP-002** | Owner registration, security Q&A, role assignment | Employee invitations, recovery UI, MFA |
| **IP-004** | First login detection, password change, security Q setup, route guards | Password recovery, MFA |

## Services

| Service | Responsibility |
|---------|----------------|
| `AuthService` | Login, logout, session refresh, first-login completion, authenticated user resolution |
| `authenticated-route-guard` | Session and first-login route enforcement via AuthService |
| `OnboardingService` | Owner self-registration orchestration |
| `SecurityQuestionService` | Catalog read, answer hash/store/verify |
| `RoleAssignmentService` | Platform role assignment (ADR-006) |
| `BusinessContextService` | Current business context initialization, switch, clear |
| `SupabaseIdentityProviderAdapter` | Supabase Auth sign-up, sign-in, sign-out, session |
| `AuthenticationAuditEmitter` | Audit event interface (ENG-013 not implemented) |

## Entry Points

- Auth Server Actions: `src/core/auth/actions/auth-actions.ts`
- First Login Server Actions: `src/core/auth/actions/first-login-actions.ts`
- Route guards: `src/core/auth/guards/authenticated-route-guard.ts`
- Onboarding Server Actions: `src/core/auth/actions/onboarding-actions.ts`
- Middleware: `middleware.ts`

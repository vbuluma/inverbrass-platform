# ENG-001 Authentication Engine (IP-001)

Authentication foundation services for BP-001, implemented per AD-009 §2.7 (AuthService, BusinessContextService).

## Scope (IP-001)

| In scope | Out of scope (IP-002+) |
|----------|------------------------|
| Login / logout orchestration | Owner registration |
| Supabase Auth integration | OnboardingService |
| Session management | SecurityQuestionService |
| Business context initialization | Role assignment |
| Authentication validation | Security question seeds/schema |
| Authentication audit interface | Registration UI |

## Services

| Service | Responsibility |
|---------|----------------|
| `AuthService` | Login, logout, session refresh, authenticated user resolution |
| `BusinessContextService` | Current business context initialization, switch, clear |
| `SupabaseIdentityProviderAdapter` | Supabase Auth sign-in, sign-out, session, password update |
| `AuthenticationAuditEmitter` | Audit event interface (ENG-013 not implemented) |

## Entry Points

- Server Actions: `src/core/auth/actions/auth-actions.ts`
- Middleware: `middleware.ts`

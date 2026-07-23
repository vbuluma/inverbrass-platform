/**
 * Purpose:
 * Provide a shared layout shell for unauthenticated authentication routes.
 *
 * Business Context:
 * Login, registration, and password recovery pages share a centered card layout
 * without business context or authenticated navigation chrome.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Render public authentication route children
 *
 * Non-Responsibilities:
 * - Session enforcement (middleware)
 * - Business context initialization (BusinessContextService)
 *
 * Dependencies:
 * - Next.js App Router route groups
 *
 * Business Rules Implemented:
 * - AD-009 §3.5 — public auth routes remain outside authenticated guards
 *
 * Extension Points:
 * - Shared branding or locale switchers may be added here in future UI packages
 */

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

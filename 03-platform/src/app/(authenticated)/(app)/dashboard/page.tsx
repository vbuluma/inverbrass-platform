/**
 * Purpose:
 * Provide a minimal post-login destination for middleware and first-login redirects.
 *
 * Business Context:
 * IP-004 requires a protected route to verify first-login and business context guards;
 * dashboard functionality belongs to future Implementation Packages.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-004 – Post-Implementation Validation (stub only)
 *
 * Responsibilities:
 * - Render a placeholder under the (app) route guard group
 *
 * Non-Responsibilities:
 * - Dashboard business capabilities
 *
 * Dependencies:
 * - (app)/layout.tsx route guards
 *
 * Business Rules Implemented:
 * - None — placeholder route only
 *
 * Extension Points:
 * - Replaced by full dashboard module in a future IP
 */

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
    </main>
  );
}

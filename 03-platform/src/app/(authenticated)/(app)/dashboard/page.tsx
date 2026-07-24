/**
 * Purpose:
 * Display the activated business welcome message on the dashboard.
 *
 * Business Context:
 * FR-010 — existing/activated businesses see "Welcome to {Business Name}".
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-006 – Business Setup Wizard, Configuration & Activation
 *
 * Responsibilities:
 * - Load current business name through setup/catalog action boundary
 *
 * Non-Responsibilities:
 * - Setup orchestration
 */

import { getDashboardWelcomeAction } from "@/modules/business/onboarding/actions/setup-actions";

export default async function DashboardPage() {
  const welcome = await getDashboardWelcomeAction();
  const businessName =
    welcome.success && welcome.data.businessName
      ? welcome.data.businessName
      : "your business";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4">
      <h1 className="text-center text-3xl font-semibold tracking-tight">
        Welcome to {businessName}
      </h1>
      <p className="text-sm text-muted-foreground">
        Your business is active and ready to operate.
      </p>
    </main>
  );
}

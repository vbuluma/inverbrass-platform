/**
 * Purpose:
 * Render the BP-001 Business Dashboard — operational landing for ACTIVE businesses.
 *
 * Design rationale:
 * Platform Home manages businesses; this page runs the selected ACTIVE business.
 * Activation welcome copy stays on /setup/activated — not here.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * BP-001 – Business Dashboard
 *
 * Responsibilities:
 * - Load dashboard data through the action → service boundary
 * - Render operational summary, quick actions, setup progress, notifications
 *
 * Non-Responsibilities:
 * - Activation / routing guards (handled by (app) layout)
 * - Operational modules (future Build Packs)
 */

import { redirect } from "next/navigation";

import { BusinessDashboard } from "@/app/(authenticated)/(app)/dashboard/business-dashboard";
import { getBusinessDashboardAction } from "@/modules/business/onboarding/actions/setup-actions";

export default async function DashboardPage() {
  const result = await getBusinessDashboardAction();

  if (!result.success) {
    // Context / session failures — return to Platform Home; do not show activation copy.
    redirect("/home");
  }

  return <BusinessDashboard data={result.data} />;
}

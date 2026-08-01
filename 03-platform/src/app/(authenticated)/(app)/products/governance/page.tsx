/**
 * Purpose:
 * Offering Governance Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

import { redirect } from "next/navigation";

import { getOfferingGovernanceDashboardAction } from "@/modules/product/actions/offering-governance-actions";
import { OfferingGovernanceDashboard } from "@/modules/product/components/offering-governance-dashboard";

export default async function OfferingGovernanceDashboardPage() {
  const result = await getOfferingGovernanceDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Offering Governance</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <OfferingGovernanceDashboard data={result.data} />;
}

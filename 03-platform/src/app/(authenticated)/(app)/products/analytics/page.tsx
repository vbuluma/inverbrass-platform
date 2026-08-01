/**
 * Purpose:
 * Offering Analytics Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

import { redirect } from "next/navigation";

import { getOfferingAnalyticsDashboardAction } from "@/modules/product/actions/offering-analytics-actions";
import { OfferingAnalyticsDashboard } from "@/modules/product/components/offering-analytics-dashboard";

export default async function OfferingAnalyticsDashboardPage() {
  const result = await getOfferingAnalyticsDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Offering Analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <OfferingAnalyticsDashboard data={result.data} />;
}

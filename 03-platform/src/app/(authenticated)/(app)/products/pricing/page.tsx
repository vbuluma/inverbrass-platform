/**
 * Purpose:
 * Offering Pricing Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

import { redirect } from "next/navigation";

import { getPricingDashboardAction } from "@/modules/product/actions/pricing-actions";
import { PricingDashboard } from "@/modules/product/components/pricing-dashboard";

export default async function PricingDashboardPage() {
  const result = await getPricingDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Offering Pricing</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <PricingDashboard data={result.data} />;
}

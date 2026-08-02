/**
 * Purpose:
 * Offering Pricing Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

import { redirect } from "next/navigation";

import { getPricingDashboardAction } from "@/modules/product/actions/pricing-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
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
      <ProductModuleErrorPage message={result.error.message} titleKind="pricing" />
    );
  }

  return <PricingDashboard data={result.data} />;
}

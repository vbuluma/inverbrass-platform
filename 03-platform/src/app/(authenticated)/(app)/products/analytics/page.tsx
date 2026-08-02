/**
 * Purpose:
 * Offering Analytics Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

import { redirect } from "next/navigation";

import { getOfferingAnalyticsDashboardAction } from "@/modules/product/actions/offering-analytics-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
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
      <ProductModuleErrorPage message={result.error.message} titleKind="analytics" />
    );
  }

  return <OfferingAnalyticsDashboard data={result.data} />;
}

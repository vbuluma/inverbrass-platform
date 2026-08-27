/**
 * Purpose:
 * Units of Measure Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import { redirect } from "next/navigation";

import { getUnitDashboardAction } from "@/modules/product/actions/unit-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
import { UnitDashboard } from "@/modules/product/components/unit-dashboard";

export default async function UnitsDashboardPage() {
  const result = await getUnitDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <ProductModuleErrorPage message={result.error.message} titleKind="dashboard" />
    );
  }

  return <UnitDashboard data={result.data} />;
}

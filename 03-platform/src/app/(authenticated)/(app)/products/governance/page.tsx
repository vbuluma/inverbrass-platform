/**
 * Purpose:
 * Offering Governance Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

import { redirect } from "next/navigation";

import { getOfferingGovernanceDashboardAction } from "@/modules/product/actions/offering-governance-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
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
      <ProductModuleErrorPage message={result.error.message} titleKind="governance" />
    );
  }

  return <OfferingGovernanceDashboard data={result.data} />;
}

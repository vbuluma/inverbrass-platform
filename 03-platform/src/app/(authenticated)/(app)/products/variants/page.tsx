/**
 * Purpose:
 * Product Variants Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import { redirect } from "next/navigation";

import { getVariantDashboardAction } from "@/modules/product/actions/variant-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
import { VariantDashboard } from "@/modules/product/components/variant-dashboard";

export default async function VariantsDashboardPage() {
  const result = await getVariantDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <ProductModuleErrorPage message={result.error.message} titleKind="variants" />
    );
  }

  return <VariantDashboard data={result.data} />;
}

/**
 * Purpose:
 * Product Classification Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 */

import { redirect } from "next/navigation";

import { getProductClassificationDashboardAction } from "@/modules/product/actions/product-classification-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
import { ProductClassificationDashboard } from "@/modules/product/components/product-classification-dashboard";

export default async function ProductClassificationDashboardPage() {
  const result = await getProductClassificationDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <ProductModuleErrorPage message={result.error.message} titleKind="classifications" />
    );
  }

  return <ProductClassificationDashboard data={result.data} />;
}

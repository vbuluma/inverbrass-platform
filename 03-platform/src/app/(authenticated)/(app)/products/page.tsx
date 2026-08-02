/**
 * Purpose:
 * Product Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { redirect } from "next/navigation";

import { getProductDashboardAction } from "@/modules/product/actions/product-actions";
import { ProductDashboard } from "@/modules/product/components/product-dashboard";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";

export default async function ProductsPage() {
  const result = await getProductDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return <ProductModuleErrorPage message={result.error.message} titleKind="dashboard" />;
  }

  return <ProductDashboard data={result.data} />;
}

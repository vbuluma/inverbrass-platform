/**
 * Purpose:
 * Product Lifecycle Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-008 – Product Lifecycle Management
 */

import { redirect } from "next/navigation";

import { getProductLifecycleDashboardAction } from "@/modules/product/actions/product-lifecycle-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
import { ProductLifecycleDashboard } from "@/modules/product/components/product-lifecycle-dashboard";

export default async function ProductLifecyclePage() {
  const result = await getProductLifecycleDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <ProductModuleErrorPage message={result.error.message} titleKind="lifecycle" />
    );
  }

  return (
    <main className="platform-workspace-main px-4 py-6 lg:px-8">
      <ProductLifecycleDashboard data={result.data} />
    </main>
  );
}

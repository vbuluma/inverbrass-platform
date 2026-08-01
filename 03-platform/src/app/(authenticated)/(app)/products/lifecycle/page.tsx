/**
 * Purpose:
 * Product Lifecycle Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-008 – Product Lifecycle Management
 */

import { redirect } from "next/navigation";

import { getProductLifecycleDashboardAction } from "@/modules/product/actions/product-lifecycle-actions";
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Lifecycle Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="platform-workspace-main px-4 py-6 lg:px-8">
      <ProductLifecycleDashboard data={result.data} />
    </main>
  );
}

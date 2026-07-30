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

export default async function ProductsPage() {
  const result = await getProductDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Catalogue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.error.message}
        </p>
      </main>
    );
  }

  return <ProductDashboard data={result.data} />;
}

/**
 * Purpose:
 * Product Classification Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 */

import { redirect } from "next/navigation";

import { getProductClassificationDashboardAction } from "@/modules/product/actions/product-classification-actions";
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Classification</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <ProductClassificationDashboard data={result.data} />;
}

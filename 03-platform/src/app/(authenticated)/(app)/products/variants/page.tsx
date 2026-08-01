/**
 * Purpose:
 * Product Variants Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import { redirect } from "next/navigation";

import { getVariantDashboardAction } from "@/modules/product/actions/variant-actions";
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Variants</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <VariantDashboard data={result.data} />;
}

/**
 * Purpose:
 * Product Bundles Dashboard page.
 */

import { redirect } from "next/navigation";

import { getBundleDashboardAction } from "@/modules/product/actions/product-bundle-actions";
import { BundleDashboard } from "@/modules/product/components/bundle-dashboard";

export default async function BundlesDashboardPage() {
  const result = await getBundleDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Bundles</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <BundleDashboard data={result.data} />;
}

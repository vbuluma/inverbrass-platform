/**
 * Purpose:
 * Digital Catalogue Dashboard page.
 */

import { redirect } from "next/navigation";

import { getCatalogueDashboardAction } from "@/modules/product/actions/product-catalogue-actions";
import { CatalogueDashboard } from "@/modules/product/components/catalogue-dashboard";

export default async function CatalogueDashboardPage() {
  const result = await getCatalogueDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Digital Catalogue</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <CatalogueDashboard data={result.data} />;
}

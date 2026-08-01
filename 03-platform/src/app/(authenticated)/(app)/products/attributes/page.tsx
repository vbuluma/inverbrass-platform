/**
 * Purpose:
 * Product Attributes Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import { redirect } from "next/navigation";

import { getAttributeDashboardAction } from "@/modules/product/actions/attribute-actions";
import { AttributeDashboard } from "@/modules/product/components/attribute-dashboard";

export default async function ProductAttributesPage() {
  const result = await getAttributeDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Attributes</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <AttributeDashboard data={result.data} />;
}

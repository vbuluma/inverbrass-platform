/**
 * Purpose:
 * Units of Measure Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import { redirect } from "next/navigation";

import { getUnitDashboardAction } from "@/modules/product/actions/unit-actions";
import { UnitDashboard } from "@/modules/product/components/unit-dashboard";

export default async function UnitsDashboardPage() {
  const result = await getUnitDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Units of Measure</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <UnitDashboard data={result.data} />;
}

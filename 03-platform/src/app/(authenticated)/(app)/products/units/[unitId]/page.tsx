/**
 * Purpose:
 * Unit workspace page.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import { redirect } from "next/navigation";

import { getUnitWorkspaceAction } from "@/modules/product/actions/unit-actions";
import { UnitWorkspace } from "@/modules/product/components/unit-workspace";

type UnitWorkspacePageProps = {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function UnitWorkspacePage({
  params,
  searchParams,
}: UnitWorkspacePageProps) {
  const { unitId } = await params;
  const { tab } = await searchParams;
  const result = await getUnitWorkspaceAction(unitId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Unit Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <UnitWorkspace initialData={result.data} initialTab={tab} />;
}

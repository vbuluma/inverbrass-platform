/**
 * Purpose:
 * Unit workspace page.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import { redirect } from "next/navigation";

import { getUnitWorkspaceAction } from "@/modules/product/actions/unit-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
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
      <ProductModuleErrorPage message={result.error.message} titleKind="dashboard" />
    );
  }

  return <UnitWorkspace initialData={result.data} initialTab={tab} />;
}

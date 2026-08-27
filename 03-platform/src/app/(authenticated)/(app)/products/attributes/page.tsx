/**
 * Purpose:
 * Product Attributes Dashboard page.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import { redirect } from "next/navigation";

import { getAttributeDashboardAction } from "@/modules/product/actions/attribute-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
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
      <ProductModuleErrorPage message={result.error.message} titleKind="attributes" />
    );
  }

  return <AttributeDashboard data={result.data} />;
}

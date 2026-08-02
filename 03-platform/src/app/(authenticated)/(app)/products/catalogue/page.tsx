/**
 * Purpose:
 * Digital Catalogue Dashboard page.
 */

import { redirect } from "next/navigation";

import { getCatalogueDashboardAction } from "@/modules/product/actions/product-catalogue-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
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
      <ProductModuleErrorPage message={result.error.message} titleKind="dashboard" />
    );
  }

  return <CatalogueDashboard data={result.data} />;
}

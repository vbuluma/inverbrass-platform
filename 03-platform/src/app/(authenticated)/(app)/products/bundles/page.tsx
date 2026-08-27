/**
 * Purpose:
 * Product Bundles Dashboard page.
 */

import { redirect } from "next/navigation";

import { getBundleDashboardAction } from "@/modules/product/actions/product-bundle-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
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
      <ProductModuleErrorPage message={result.error.message} titleKind="bundles" />
    );
  }

  return <BundleDashboard data={result.data} />;
}

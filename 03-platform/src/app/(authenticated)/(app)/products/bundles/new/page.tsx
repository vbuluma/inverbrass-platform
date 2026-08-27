/**
 * Purpose:
 * Bundle registration page.
 */

import { redirect } from "next/navigation";

import { getBundleRegistrationCataloguesAction } from "@/modules/product/actions/product-bundle-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
import { BundleRegistrationWizard } from "@/modules/product/components/bundle-registration-wizard";

export default async function BundleRegistrationPage() {
  const result = await getBundleRegistrationCataloguesAction();

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

  return <BundleRegistrationWizard catalogues={result.data} />;
}

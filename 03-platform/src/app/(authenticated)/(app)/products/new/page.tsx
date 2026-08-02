/**
 * Purpose:
 * Product Registration page.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { redirect } from "next/navigation";

import { getProductRegistrationCataloguesAction } from "@/modules/product/actions/product-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
import { ProductRegistrationForm } from "@/modules/product/components/product-registration-form";

export default async function NewProductPage() {
  const result = await getProductRegistrationCataloguesAction();

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

  return (
    <ProductRegistrationForm
      catalogues={result.data}
      catalogueLabel={result.data.catalogueLabel}
    />
  );
}

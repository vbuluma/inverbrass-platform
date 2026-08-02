/**
 * Purpose:
 * Unit registration page.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import { redirect } from "next/navigation";

import { getUnitRegistrationCataloguesAction } from "@/modules/product/actions/unit-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
import { UnitRegistrationForm } from "@/modules/product/components/unit-registration-form";

export default async function UnitRegistrationPage() {
  const result = await getUnitRegistrationCataloguesAction();

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

  return <UnitRegistrationForm catalogues={result.data} />;
}

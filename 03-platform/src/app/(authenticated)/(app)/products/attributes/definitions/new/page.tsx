/**
 * Purpose:
 * Create Attribute Definition page.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import { redirect } from "next/navigation";

import { getAttributeDashboardAction } from "@/modules/product/actions/attribute-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
import { AttributeDefinitionRegistrationForm } from "@/modules/product/components/attribute-definition-registration-form";

export default async function NewAttributeDefinitionPage() {
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

  return <AttributeDefinitionRegistrationForm dashboard={result.data} />;
}

/**
 * Purpose:
 * Create Attribute Definition page.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import { redirect } from "next/navigation";

import { getAttributeDashboardAction } from "@/modules/product/actions/attribute-actions";
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Create Attribute</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <AttributeDefinitionRegistrationForm dashboard={result.data} />;
}

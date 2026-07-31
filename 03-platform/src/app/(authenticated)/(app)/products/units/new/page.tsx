/**
 * Purpose:
 * Unit registration page.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import { redirect } from "next/navigation";

import { getUnitRegistrationCataloguesAction } from "@/modules/product/actions/unit-actions";
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Register Unit</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <UnitRegistrationForm catalogues={result.data} />;
}

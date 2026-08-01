/**
 * Purpose:
 * Bundle registration page.
 */

import { redirect } from "next/navigation";

import { getBundleRegistrationCataloguesAction } from "@/modules/product/actions/product-bundle-actions";
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Register Bundle</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <BundleRegistrationWizard catalogues={result.data} />;
}

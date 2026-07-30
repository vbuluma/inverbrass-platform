/**
 * Purpose:
 * Product Registration page.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { redirect } from "next/navigation";

import { getProductRegistrationCataloguesAction } from "@/modules/product/actions/product-actions";
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Register Product</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.error.message}
        </p>
      </main>
    );
  }

  return (
    <ProductRegistrationForm
      catalogues={result.data}
      catalogueLabel={result.data.catalogueLabel}
    />
  );
}

/**
 * Purpose:
 * Variant registration page.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import { redirect } from "next/navigation";

import { getVariantRegistrationCataloguesAction } from "@/modules/product/actions/variant-actions";
import { VariantRegistrationForm } from "@/modules/product/components/variant-registration-form";

type PageProps = {
  searchParams: Promise<{ productId?: string }>;
};

export default async function VariantRegistrationPage({ searchParams }: PageProps) {
  const { productId } = await searchParams;
  const result = await getVariantRegistrationCataloguesAction(productId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Register Variant</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  let catalogues = result.data;
  if (!productId && catalogues.products[0]) {
    const enriched = await getVariantRegistrationCataloguesAction(
      catalogues.products[0].id
    );
    if (enriched.success) {
      catalogues = enriched.data;
    }
  }

  return (
    <VariantRegistrationForm
      catalogues={catalogues}
      initialProductId={productId ?? catalogues.products[0]?.id}
    />
  );
}

/**
 * Purpose:
 * Variant Workspace page.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import { redirect } from "next/navigation";

import { getVariantWorkspaceAction } from "@/modules/product/actions/variant-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
import { VariantWorkspace } from "@/modules/product/components/variant-workspace";

type PageProps = {
  params: Promise<{ variantId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function VariantWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { variantId } = await params;
  const { tab } = await searchParams;

  const result = await getVariantWorkspaceAction(variantId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <ProductModuleErrorPage message={result.error.message} titleKind="variants" />
    );
  }

  return (
    <VariantWorkspace initialData={result.data} initialTab={tab ?? "overview"} />
  );
}

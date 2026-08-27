/**
 * Purpose:
 * Digital Catalogue Workspace page (per product).
 */

import { redirect } from "next/navigation";

import { getCatalogueWorkspaceAction } from "@/modules/product/actions/product-catalogue-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
import { CatalogueWorkspace } from "@/modules/product/components/catalogue-workspace";

type PageProps = {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function CatalogueWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { productId } = await params;
  const { tab } = await searchParams;

  const result = await getCatalogueWorkspaceAction(productId);

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

  return <CatalogueWorkspace initialData={result.data} initialTab={tab ?? "publications"} />;
}

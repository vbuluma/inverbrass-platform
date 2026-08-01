/**
 * Purpose:
 * Digital Catalogue Workspace page (per product).
 */

import { redirect } from "next/navigation";

import { getCatalogueWorkspaceAction } from "@/modules/product/actions/product-catalogue-actions";
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Catalogue Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <CatalogueWorkspace initialData={result.data} initialTab={tab ?? "publications"} />;
}

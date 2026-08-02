/**
 * Purpose:
 * Product Classification Workspace page.
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 */

import { redirect } from "next/navigation";

import { getProductClassificationWorkspaceAction } from "@/modules/product/actions/product-classification-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
import { ProductClassificationWorkspace } from "@/modules/product/components/product-classification-workspace";

type PageProps = {
  params: Promise<{ classificationId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ProductClassificationWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { classificationId } = await params;
  const { tab } = await searchParams;

  const result = await getProductClassificationWorkspaceAction(classificationId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <ProductModuleErrorPage message={result.error.message} titleKind="classifications" />
    );
  }

  return (
    <ProductClassificationWorkspace
      initialData={result.data}
      initialTab={tab ?? "overview"}
    />
  );
}

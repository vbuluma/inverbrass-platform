/**
 * Purpose:
 * Bundle Workspace page.
 */

import { redirect } from "next/navigation";

import { getBundleWorkspaceAction } from "@/modules/product/actions/product-bundle-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
import { BundleWorkspace } from "@/modules/product/components/bundle-workspace";

type PageProps = {
  params: Promise<{ bundleId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function BundleWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { bundleId } = await params;
  const { tab } = await searchParams;

  const result = await getBundleWorkspaceAction(bundleId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <ProductModuleErrorPage message={result.error.message} titleKind="bundles" />
    );
  }

  return <BundleWorkspace initialData={result.data} initialTab={tab ?? "overview"} />;
}

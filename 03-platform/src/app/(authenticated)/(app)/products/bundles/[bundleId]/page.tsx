/**
 * Purpose:
 * Bundle Workspace page.
 */

import { redirect } from "next/navigation";

import { getBundleWorkspaceAction } from "@/modules/product/actions/product-bundle-actions";
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Bundle Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <BundleWorkspace initialData={result.data} initialTab={tab ?? "overview"} />;
}

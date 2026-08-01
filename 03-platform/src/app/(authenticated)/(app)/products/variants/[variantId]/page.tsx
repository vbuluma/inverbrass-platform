/**
 * Purpose:
 * Variant Workspace page.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import { redirect } from "next/navigation";

import { getVariantWorkspaceAction } from "@/modules/product/actions/variant-actions";
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Variant Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return (
    <VariantWorkspace initialData={result.data} initialTab={tab ?? "overview"} />
  );
}

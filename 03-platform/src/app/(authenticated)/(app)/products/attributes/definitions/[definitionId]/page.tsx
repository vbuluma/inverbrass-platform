/**
 * Purpose:
 * Attribute Definition Workspace page.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import { redirect } from "next/navigation";

import { getAttributeDefinitionWorkspaceAction } from "@/modules/product/actions/attribute-actions";
import { AttributeDefinitionWorkspace } from "@/modules/product/components/attribute-definition-workspace";

type PageProps = {
  params: Promise<{ definitionId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function AttributeDefinitionWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { definitionId } = await params;
  const { tab } = await searchParams;

  const result = await getAttributeDefinitionWorkspaceAction(definitionId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Attribute Definition</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return (
    <AttributeDefinitionWorkspace
      initialData={result.data}
      initialTab={tab ?? "overview"}
    />
  );
}

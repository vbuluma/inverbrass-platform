/**
 * Purpose:
 * Attribute Definition Workspace page.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import { redirect } from "next/navigation";

import { getAttributeDefinitionWorkspaceAction } from "@/modules/product/actions/attribute-actions";
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
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
      <ProductModuleErrorPage message={result.error.message} titleKind="attributes" />
    );
  }

  return (
    <AttributeDefinitionWorkspace
      initialData={result.data}
      initialTab={tab ?? "overview"}
    />
  );
}

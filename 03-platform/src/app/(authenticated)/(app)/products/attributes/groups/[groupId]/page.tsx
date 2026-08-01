/**
 * Purpose:
 * Attribute Group Workspace page.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { getAttributeGroupWorkspaceAction } from "@/modules/product/actions/attribute-actions";
import { ATTRIBUTE_UI_LABELS } from "@/modules/product/attribute-ui-labels";

type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function AttributeGroupWorkspacePage({ params }: PageProps) {
  const { groupId } = await params;
  const result = await getAttributeGroupWorkspaceAction(groupId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Attribute Group</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  const { group, definitions } = result.data;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/products/attributes" className="text-sm text-muted-foreground">
        ← Back to attributes
      </Link>
      <div className="mt-4 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
        <p className="text-sm text-muted-foreground">
          {group.code} · {group.statusLabel} · {definitions.length} definitions
        </p>
      </div>
      <div className="mt-6 space-y-2">
        {definitions.map((definition) => (
          <Link
            key={definition.id}
            href={`/products/attributes/definitions/${definition.id}`}
            className="block rounded-lg border p-4 hover:bg-muted/40"
          >
            <p className="font-medium">{definition.name}</p>
            <p className="text-sm text-muted-foreground">
              {definition.code} · {definition.dataTypeLabel}
            </p>
          </Link>
        ))}
        {definitions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No definitions in this group yet.{" "}
            <Link href="/products/attributes/definitions/new">
              {ATTRIBUTE_UI_LABELS.quickActionDefinition}
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}

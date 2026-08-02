"use client";

import { useProductUiLabels } from "@/modules/product/product-terminology-labels";

type ProductModuleErrorPageProps = {
  message: string;
  /** Terminology key for title — defaults to offerings hub catalogue title */
  titleKind?:
    | "dashboard"
    | "workspace"
    | "variants"
    | "bundles"
    | "attributes"
    | "classifications"
    | "pricing"
    | "governance"
    | "analytics"
    | "lifecycle";
};

export function ProductModuleErrorPage({
  message,
  titleKind = "dashboard",
}: ProductModuleErrorPageProps) {
  const labels = useProductUiLabels();

  const title = (() => {
    switch (titleKind) {
      case "workspace":
        return labels.workspace.workspaceLabel;
      case "variants":
        return labels.variant.dashboardTitle;
      case "bundles":
        return labels.bundle.dashboardTitle;
      case "attributes":
        return labels.attribute.dashboardTitle;
      case "classifications":
        return labels.catalogueStructure.dashboardTitle;
      case "pricing":
        return labels.pricing.dashboardTitle;
      case "governance":
        return labels.governance.dashboardTitle;
      case "analytics":
        return labels.analytics.dashboardTitle;
      case "lifecycle":
        return labels.lifecycle.dashboardTitle;
      default:
        return labels.dashboard.pageTitle;
    }
  })();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </main>
  );
}

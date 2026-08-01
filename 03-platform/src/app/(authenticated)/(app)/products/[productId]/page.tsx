/**
 * Purpose:
 * Product Workspace page.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { redirect } from "next/navigation";

import { getProductClassificationPanelAction } from "@/modules/product/actions/product-classification-actions";
import {
  getProductAction,
  getProductRegistrationCataloguesAction,
} from "@/modules/product/actions/product-actions";
import { listProductAuditHistoryAction } from "@/modules/product/actions/product-audit-actions";
import { listProductTimelineAction } from "@/modules/product/actions/product-timeline-actions";
import { getProductAttributesPanelAction } from "@/modules/product/actions/attribute-actions";
import { getProductVariantsPanelAction } from "@/modules/product/actions/variant-actions";
import { getProductCataloguePanelAction } from "@/modules/product/actions/product-catalogue-actions";
import { getProductBundlesPanelAction } from "@/modules/product/actions/product-bundle-actions";
import { ProductWorkspace } from "@/modules/product/components/product-workspace";

type PageProps = {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ProductWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { productId } = await params;
  const { tab } = await searchParams;

  const [productResult, cataloguesResult, classificationResult, timelineResult, auditHistoryResult, attributesResult, variantsResult, bundlesResult, catalogueResult] =
    await Promise.all([
      getProductAction(productId),
      getProductRegistrationCataloguesAction(),
      getProductClassificationPanelAction(productId),
      listProductTimelineAction(productId),
      listProductAuditHistoryAction(productId),
      getProductAttributesPanelAction(productId),
      getProductVariantsPanelAction(productId),
      getProductBundlesPanelAction(productId),
      getProductCataloguePanelAction(productId),
    ]);

  if (!productResult.success) {
    if (
      productResult.error.code === "SESSION_REQUIRED" ||
      productResult.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {productResult.error.message}
        </p>
      </main>
    );
  }

  if (!cataloguesResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {cataloguesResult.error.message}
        </p>
      </main>
    );
  }

  if (!classificationResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {classificationResult.error.message}
        </p>
      </main>
    );
  }

  if (!timelineResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {timelineResult.error.message}
        </p>
      </main>
    );
  }

  if (!auditHistoryResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {auditHistoryResult.error.message}
        </p>
      </main>
    );
  }

  if (!attributesResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {attributesResult.error.message}
        </p>
      </main>
    );
  }

  if (!variantsResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {variantsResult.error.message}
        </p>
      </main>
    );
  }

  if (!bundlesResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {bundlesResult.error.message}
        </p>
      </main>
    );
  }

  if (!catalogueResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {catalogueResult.error.message}
        </p>
      </main>
    );
  }

  return (
    <ProductWorkspace
      product={productResult.data}
      catalogues={cataloguesResult.data}
      classification={classificationResult.data}
      timeline={timelineResult.data}
      auditHistory={auditHistoryResult.data}
      attributes={attributesResult.data}
      variants={variantsResult.data}
      bundles={bundlesResult.data}
      catalogue={catalogueResult.data}
      initialTab={tab ?? "overview"}
    />
  );
}

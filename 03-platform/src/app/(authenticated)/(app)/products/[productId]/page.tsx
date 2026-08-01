/**
 * Purpose:
 * Product Workspace page.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { redirect } from "next/navigation";

import { getProductClassificationPanelAction } from "@/modules/product/actions/product-classification-actions";
import { getProductAnalyticsPanelAction } from "@/modules/product/actions/offering-analytics-actions";
import { getProductGovernancePanelAction } from "@/modules/product/actions/offering-governance-actions";
import { getProductPricingPanelAction } from "@/modules/product/actions/pricing-actions";
import {
  getProductAction,
  getProductRegistrationCataloguesAction,
} from "@/modules/product/actions/product-actions";
import { listProductAuditHistoryAction } from "@/modules/product/actions/product-audit-actions";
import { listProductTimelineAction } from "@/modules/product/actions/product-timeline-actions";
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

  const [productResult, cataloguesResult, classificationResult, pricingResult, analyticsResult, governanceResult, timelineResult, auditHistoryResult] =
    await Promise.all([
      getProductAction(productId),
      getProductRegistrationCataloguesAction(),
      getProductClassificationPanelAction(productId),
      getProductPricingPanelAction(productId),
      getProductAnalyticsPanelAction(productId),
      getProductGovernancePanelAction(productId),
      listProductTimelineAction(productId),
      listProductAuditHistoryAction(productId),
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

  if (!pricingResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pricingResult.error.message}
        </p>
      </main>
    );
  }

  if (!analyticsResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {analyticsResult.error.message}
        </p>
      </main>
    );
  }

  if (!governanceResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Product Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {governanceResult.error.message}
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

  return (
    <ProductWorkspace
      product={productResult.data}
      catalogues={cataloguesResult.data}
      classification={classificationResult.data}
      pricing={pricingResult.data}
      analytics={analyticsResult.data}
      governance={governanceResult.data}
      timeline={timelineResult.data}
      auditHistory={auditHistoryResult.data}
      initialTab={tab ?? "overview"}
    />
  );
}

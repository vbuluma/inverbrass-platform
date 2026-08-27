/**
 * Purpose:
 * Product Workspace page.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { redirect } from "next/navigation";

import { getProductClassificationPanelAction } from "@/modules/product/actions/product-classification-actions";
import { getProductLifecyclePanelAction } from "@/modules/product/actions/product-lifecycle-actions";
import { getOfferingDocumentsPanelAction } from "@/modules/product/actions/offering-document-actions";
import { getOfferingRelationshipsPanelAction } from "@/modules/product/actions/offering-relationship-actions";
import { getProductAnalyticsPanelAction } from "@/modules/product/actions/offering-analytics-actions";
import { getProductGovernancePanelAction } from "@/modules/product/actions/offering-governance-actions";
import { getProductPricingPanelAction } from "@/modules/product/actions/pricing-actions";
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
import { ProductModuleErrorPage } from "@/modules/product/components/product-module-error-page";
import { ProductWorkspace } from "@/modules/product/components/product-workspace";

type PageProps = {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

function renderError(message: string) {
  return <ProductModuleErrorPage message={message} titleKind="workspace" />;
}

export default async function ProductWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { productId } = await params;
  const { tab } = await searchParams;

  const [
    productResult,
    cataloguesResult,
    classificationResult,
    lifecycleResult,
    documentsResult,
    relationshipsResult,
    pricingResult,
    analyticsResult,
    governanceResult,
    timelineResult,
    auditHistoryResult,
    attributesResult,
    variantsResult,
    bundlesResult,
    catalogueResult,
  ] = await Promise.all([
    getProductAction(productId),
    getProductRegistrationCataloguesAction(),
    getProductClassificationPanelAction(productId),
    getProductLifecyclePanelAction(productId),
    getOfferingDocumentsPanelAction(productId),
    getOfferingRelationshipsPanelAction(productId),
    getProductPricingPanelAction(productId),
    getProductAnalyticsPanelAction(productId),
    getProductGovernancePanelAction(productId),
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

    return renderError(productResult.error.message);
  }

  if (!cataloguesResult.success) {
    return renderError(cataloguesResult.error.message);
  }

  if (!classificationResult.success) {
    return renderError(classificationResult.error.message);
  }

  if (!lifecycleResult.success) {
    return renderError(lifecycleResult.error.message);
  }

  if (!documentsResult.success) {
    return renderError(documentsResult.error.message);
  }

  if (!relationshipsResult.success) {
    return renderError(relationshipsResult.error.message);
  }

  if (!pricingResult.success) {
    return renderError(pricingResult.error.message);
  }

  if (!analyticsResult.success) {
    return renderError(analyticsResult.error.message);
  }

  if (!governanceResult.success) {
    return renderError(governanceResult.error.message);
  }

  if (!timelineResult.success) {
    return renderError(timelineResult.error.message);
  }

  if (!auditHistoryResult.success) {
    return renderError(auditHistoryResult.error.message);
  }

  if (!attributesResult.success) {
    return renderError(attributesResult.error.message);
  }

  if (!variantsResult.success) {
    return renderError(variantsResult.error.message);
  }

  if (!bundlesResult.success) {
    return renderError(bundlesResult.error.message);
  }

  if (!catalogueResult.success) {
    return renderError(catalogueResult.error.message);
  }

  return (
    <ProductWorkspace
      product={productResult.data}
      catalogues={cataloguesResult.data}
      classification={classificationResult.data}
      lifecycle={lifecycleResult.data}
      documents={documentsResult.data}
      relationships={relationshipsResult.data}
      pricing={pricingResult.data}
      analytics={analyticsResult.data}
      governance={governanceResult.data}
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

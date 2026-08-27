/**
 * Purpose:
 * Pure business rules for Digital Catalogue Engine (no I/O).
 *
 * Implementation Package:
 * BP-003 / IP-007 – Digital Catalogue Engine
 */

import {
  CATALOGUE_VISIBILITY_CODES,
  CATALOGUE_VISIBILITY_LABELS,
  PRODUCT_STATUS_CODES,
  type CatalogueVisibilityCode,
} from "@/modules/product/constants";

export function isProductPublishable(statusCode: string): boolean {
  return statusCode === PRODUCT_STATUS_CODES.ACTIVE;
}

export function visibilityLabel(visibility: string): string {
  if (visibility in CATALOGUE_VISIBILITY_LABELS) {
    return CATALOGUE_VISIBILITY_LABELS[visibility as CatalogueVisibilityCode];
  }
  return visibility;
}

export function validatePublicationSchedule(
  publishFrom?: string | Date | null,
  publishTo?: string | Date | null
): boolean {
  if (!publishFrom || !publishTo) {
    return true;
  }
  const from = publishFrom instanceof Date ? publishFrom : new Date(publishFrom);
  const to = publishTo instanceof Date ? publishTo : new Date(publishTo);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return false;
  }
  return from.getTime() < to.getTime();
}

export function isPublicationCurrentlyActive(input: {
  published: boolean;
  publishFrom?: Date | string | null;
  publishTo?: Date | string | null;
  now?: Date;
}): boolean {
  if (!input.published) {
    return false;
  }
  const now = input.now ?? new Date();
  if (input.publishFrom) {
    const from = input.publishFrom instanceof Date ? input.publishFrom : new Date(input.publishFrom);
    if (!Number.isNaN(from.getTime()) && from.getTime() > now.getTime()) {
      return false;
    }
  }
  if (input.publishTo) {
    const to = input.publishTo instanceof Date ? input.publishTo : new Date(input.publishTo);
    if (!Number.isNaN(to.getTime()) && to.getTime() < now.getTime()) {
      return false;
    }
  }
  return true;
}

export function buildQrSlug(productCode: string, channelCode: string): string {
  return `${productCode.toLowerCase().replace(/\s+/g, "-")}-${channelCode.toLowerCase()}`;
}

export function visibilityOptions() {
  return Object.values(CATALOGUE_VISIBILITY_CODES).map((code) => ({
    code,
    label: CATALOGUE_VISIBILITY_LABELS[code],
  }));
}

export type PublicationMetadata = {
  qrEnabled?: boolean;
  qrSlug?: string;
};

export function normalizePublicationMetadata(
  metadata: Record<string, unknown> | null | undefined
): PublicationMetadata {
  if (!metadata) {
    return {};
  }
  return {
    qrEnabled: metadata.qrEnabled === true,
    qrSlug: typeof metadata.qrSlug === "string" ? metadata.qrSlug : undefined,
  };
}

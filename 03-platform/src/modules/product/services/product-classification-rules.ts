/**
 * Purpose:
 * Pure Catalogue Structure business-rule helpers (no I/O).
 */

import {
  PRODUCT_CLASSIFICATION_APPROVAL_STATUS_CODES,
  PRODUCT_CLASSIFICATION_STATUS_CODES,
  type ProductClassificationStatusCode,
} from "@/modules/product/constants";

export function normalizeClassificationCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isProductClassificationStatusCode(
  value: string
): value is ProductClassificationStatusCode {
  return Object.values(PRODUCT_CLASSIFICATION_STATUS_CODES).includes(
    value as ProductClassificationStatusCode
  );
}

export function resolveDefaultClassificationStatus(): ProductClassificationStatusCode {
  return PRODUCT_CLASSIFICATION_STATUS_CODES.DRAFT;
}

export function canAssignToClassification(status: string): boolean {
  return status === PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE;
}

export function canTransitionClassificationStatus(
  current: ProductClassificationStatusCode,
  next: ProductClassificationStatusCode
): boolean {
  if (current === next) {
    return true;
  }
  if (current === PRODUCT_CLASSIFICATION_STATUS_CODES.ARCHIVED) {
    return false;
  }
  if (next === PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE) {
    return (
      current === PRODUCT_CLASSIFICATION_STATUS_CODES.DRAFT ||
      current === PRODUCT_CLASSIFICATION_STATUS_CODES.SUSPENDED ||
      current === PRODUCT_CLASSIFICATION_STATUS_CODES.DEPRECATED
    );
  }
  if (next === PRODUCT_CLASSIFICATION_STATUS_CODES.SUSPENDED) {
    return current === PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE;
  }
  if (next === PRODUCT_CLASSIFICATION_STATUS_CODES.DEPRECATED) {
    return (
      current === PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE ||
      current === PRODUCT_CLASSIFICATION_STATUS_CODES.SUSPENDED
    );
  }
  if (next === PRODUCT_CLASSIFICATION_STATUS_CODES.ARCHIVED) {
    return (
      current === PRODUCT_CLASSIFICATION_STATUS_CODES.DRAFT ||
      current === PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE ||
      current === PRODUCT_CLASSIFICATION_STATUS_CODES.SUSPENDED ||
      current === PRODUCT_CLASSIFICATION_STATUS_CODES.DEPRECATED
    );
  }
  if (next === PRODUCT_CLASSIFICATION_STATUS_CODES.DRAFT) {
    return current === PRODUCT_CLASSIFICATION_STATUS_CODES.DRAFT;
  }
  return false;
}

export function canArchiveClassification(status: string): boolean {
  return status === PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE;
}

export function isValidDirectParent(
  classificationId: string,
  parentClassificationId: string | null | undefined
): boolean {
  if (!parentClassificationId) {
    return true;
  }
  return (
    parentClassificationId.trim().toLowerCase() !==
    classificationId.trim().toLowerCase()
  );
}

export function wouldCreateCircularHierarchy(
  classificationId: string,
  proposedParentId: string | null,
  parentById: Map<string, string | null>
): boolean {
  if (!proposedParentId) {
    return false;
  }

  let current: string | null = proposedParentId;
  const visited = new Set<string>();

  while (current) {
    if (current === classificationId) {
      return true;
    }
    if (visited.has(current)) {
      return true;
    }
    visited.add(current);
    current = parentById.get(current) ?? null;
  }

  return false;
}

export function computeHierarchyLevel(
  parentLevel: number | null | undefined
): number {
  if (parentLevel === null || parentLevel === undefined) {
    return 0;
  }
  return parentLevel + 1;
}

export function shouldAssignAsPrimary(
  existingActiveCount: number,
  requestedPrimary?: boolean
): boolean {
  if (existingActiveCount === 0) {
    return true;
  }
  return requestedPrimary === true;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_LABELS: Record<string, string> = {
  [PRODUCT_CLASSIFICATION_STATUS_CODES.DRAFT]: "Draft",
  [PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE]: "Active",
  [PRODUCT_CLASSIFICATION_STATUS_CODES.SUSPENDED]: "Suspended",
  [PRODUCT_CLASSIFICATION_STATUS_CODES.ARCHIVED]: "Archived",
  [PRODUCT_CLASSIFICATION_STATUS_CODES.DEPRECATED]: "Deprecated",
};

export function classificationStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const APPROVAL_LABELS: Record<string, string> = {
  [PRODUCT_CLASSIFICATION_APPROVAL_STATUS_CODES.PENDING]: "Pending",
  [PRODUCT_CLASSIFICATION_APPROVAL_STATUS_CODES.APPROVED]: "Approved",
  [PRODUCT_CLASSIFICATION_APPROVAL_STATUS_CODES.REJECTED]: "Rejected",
  [PRODUCT_CLASSIFICATION_APPROVAL_STATUS_CODES.NOT_REQUIRED]: "Not Required",
};

export function classificationApprovalStatusLabel(status: string): string {
  return APPROVAL_LABELS[status] ?? status;
}

export function isClassificationEditable(status: string): boolean {
  return status !== PRODUCT_CLASSIFICATION_STATUS_CODES.ARCHIVED;
}

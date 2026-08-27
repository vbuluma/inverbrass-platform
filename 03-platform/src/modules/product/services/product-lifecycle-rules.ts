/**
 * Purpose:
 * Pure Product Lifecycle business-rule helpers (no I/O).
 *
 * Implementation Package:
 * BP-003 / IP-008 – Product Lifecycle Management
 */

import {
  DEFAULT_PRODUCT_LIFECYCLE_POLICIES,
  PRODUCT_LIFECYCLE_APPROVAL_STATUS_CODES,
  PRODUCT_LIFECYCLE_STATE_CODES,
  PRODUCT_STATUS_CODES,
  type ProductLifecyclePolicies,
  type ProductLifecycleStateCode,
  type ProductStatusCode,
} from "@/modules/product/constants";

export function isProductLifecycleStateCode(
  value: string
): value is ProductLifecycleStateCode {
  return Object.values(PRODUCT_LIFECYCLE_STATE_CODES).includes(
    value as ProductLifecycleStateCode
  );
}

export function mapLifecycleStateToProductStatus(
  state: ProductLifecycleStateCode
): ProductStatusCode {
  switch (state) {
    case PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE:
      return PRODUCT_STATUS_CODES.ACTIVE;
    case PRODUCT_LIFECYCLE_STATE_CODES.SUSPENDED:
      return PRODUCT_STATUS_CODES.SUSPENDED;
    case PRODUCT_LIFECYCLE_STATE_CODES.DEPRECATED:
    case PRODUCT_LIFECYCLE_STATE_CODES.DISCONTINUED:
      return PRODUCT_STATUS_CODES.DISCONTINUED;
    case PRODUCT_LIFECYCLE_STATE_CODES.ARCHIVED:
      return PRODUCT_STATUS_CODES.ARCHIVED;
    default:
      return PRODUCT_STATUS_CODES.DRAFT;
  }
}

export function canTransitionLifecycleState(
  current: ProductLifecycleStateCode,
  next: ProductLifecycleStateCode
): boolean {
  if (current === next) {
    return true;
  }

  if (current === PRODUCT_LIFECYCLE_STATE_CODES.ARCHIVED) {
    return false;
  }

  const allowed: Record<ProductLifecycleStateCode, ProductLifecycleStateCode[]> =
    {
      [PRODUCT_LIFECYCLE_STATE_CODES.DRAFT]: [
        PRODUCT_LIFECYCLE_STATE_CODES.PENDING_APPROVAL,
        PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE,
      ],
      [PRODUCT_LIFECYCLE_STATE_CODES.PENDING_APPROVAL]: [
        PRODUCT_LIFECYCLE_STATE_CODES.APPROVED,
        PRODUCT_LIFECYCLE_STATE_CODES.DRAFT,
      ],
      [PRODUCT_LIFECYCLE_STATE_CODES.APPROVED]: [
        PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE,
        PRODUCT_LIFECYCLE_STATE_CODES.DRAFT,
      ],
      [PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE]: [
        PRODUCT_LIFECYCLE_STATE_CODES.SUSPENDED,
        PRODUCT_LIFECYCLE_STATE_CODES.DEPRECATED,
      ],
      [PRODUCT_LIFECYCLE_STATE_CODES.SUSPENDED]: [
        PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE,
        PRODUCT_LIFECYCLE_STATE_CODES.DEPRECATED,
      ],
      [PRODUCT_LIFECYCLE_STATE_CODES.DEPRECATED]: [
        PRODUCT_LIFECYCLE_STATE_CODES.DISCONTINUED,
        PRODUCT_LIFECYCLE_STATE_CODES.ARCHIVED,
      ],
      [PRODUCT_LIFECYCLE_STATE_CODES.DISCONTINUED]: [
        PRODUCT_LIFECYCLE_STATE_CODES.ARCHIVED,
      ],
      [PRODUCT_LIFECYCLE_STATE_CODES.ARCHIVED]: [],
    };

  return allowed[current]?.includes(next) ?? false;
}

export function isLifecycleEditable(state: ProductLifecycleStateCode): boolean {
  return (
    state === PRODUCT_LIFECYCLE_STATE_CODES.DRAFT ||
    state === PRODUCT_LIFECYCLE_STATE_CODES.PENDING_APPROVAL
  );
}

export function isLifecycleReadOnly(state: ProductLifecycleStateCode): boolean {
  return state === PRODUCT_LIFECYCLE_STATE_CODES.ARCHIVED;
}

export function canSubmitForApproval(
  state: ProductLifecycleStateCode,
  policies: ProductLifecyclePolicies = DEFAULT_PRODUCT_LIFECYCLE_POLICIES
): boolean {
  return (
    policies.approvalRequiredBeforeActivation &&
    state === PRODUCT_LIFECYCLE_STATE_CODES.DRAFT
  );
}

export function canApprove(
  state: ProductLifecycleStateCode,
  approvalStatus: string | null | undefined
): boolean {
  return (
    state === PRODUCT_LIFECYCLE_STATE_CODES.PENDING_APPROVAL &&
    approvalStatus === PRODUCT_LIFECYCLE_APPROVAL_STATUS_CODES.PENDING
  );
}

export function canActivate(
  state: ProductLifecycleStateCode,
  approvalStatus: string | null | undefined,
  policies: ProductLifecyclePolicies = DEFAULT_PRODUCT_LIFECYCLE_POLICIES
): boolean {
  if (state === PRODUCT_LIFECYCLE_STATE_CODES.APPROVED) {
    return true;
  }

  if (
    policies.allowDirectActivation &&
    state === PRODUCT_LIFECYCLE_STATE_CODES.DRAFT &&
    !policies.approvalRequiredBeforeActivation
  ) {
    return true;
  }

  if (
    state === PRODUCT_LIFECYCLE_STATE_CODES.DRAFT &&
    approvalStatus === PRODUCT_LIFECYCLE_APPROVAL_STATUS_CODES.APPROVED
  ) {
    return true;
  }

  return false;
}

export function canSuspend(state: ProductLifecycleStateCode): boolean {
  return state === PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE;
}

export function canReactivate(
  state: ProductLifecycleStateCode,
  policies: ProductLifecyclePolicies = DEFAULT_PRODUCT_LIFECYCLE_POLICIES
): boolean {
  return (
    policies.allowReactivationFromSuspended &&
    state === PRODUCT_LIFECYCLE_STATE_CODES.SUSPENDED
  );
}

export function canDeprecate(state: ProductLifecycleStateCode): boolean {
  return (
    state === PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE ||
    state === PRODUCT_LIFECYCLE_STATE_CODES.SUSPENDED
  );
}

export function canArchive(state: ProductLifecycleStateCode): boolean {
  return (
    state === PRODUCT_LIFECYCLE_STATE_CODES.DEPRECATED ||
    state === PRODUCT_LIFECYCLE_STATE_CODES.DISCONTINUED ||
    state === PRODUCT_LIFECYCLE_STATE_CODES.DRAFT
  );
}

export function canCreateNewVersion(state: ProductLifecycleStateCode): boolean {
  return (
    state === PRODUCT_LIFECYCLE_STATE_CODES.APPROVED ||
    state === PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE ||
    state === PRODUCT_LIFECYCLE_STATE_CODES.SUSPENDED ||
    state === PRODUCT_LIFECYCLE_STATE_CODES.DEPRECATED ||
    state === PRODUCT_LIFECYCLE_STATE_CODES.DISCONTINUED
  );
}

export function canAssignReplacement(state: ProductLifecycleStateCode): boolean {
  return (
    state === PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE ||
    state === PRODUCT_LIFECYCLE_STATE_CODES.DEPRECATED ||
    state === PRODUCT_LIFECYCLE_STATE_CODES.DISCONTINUED
  );
}

export function isSelfReplacement(
  productId: string,
  replacementProductId: string
): boolean {
  return (
    productId.trim().toLowerCase() === replacementProductId.trim().toLowerCase()
  );
}

export function hasValidEffectiveDates(
  effectiveFrom: string | null | undefined,
  effectiveTo: string | null | undefined
): boolean {
  if (!effectiveFrom || !effectiveTo) {
    return true;
  }
  return effectiveFrom <= effectiveTo;
}

export function incrementVersion(
  majorVersion: number,
  minorVersion: number,
  isMajor: boolean
): { majorVersion: number; minorVersion: number; versionNumber: string } {
  if (isMajor) {
    const nextMajor = majorVersion + 1;
    return {
      majorVersion: nextMajor,
      minorVersion: 0,
      versionNumber: `${nextMajor}.0`,
    };
  }

  const nextMinor = minorVersion + 1;
  return {
    majorVersion,
    minorVersion: nextMinor,
    versionNumber: `${majorVersion}.${nextMinor}`,
  };
}

export function getAvailableLifecycleActions(
  state: ProductLifecycleStateCode,
  approvalStatus: string | null | undefined,
  policies: ProductLifecyclePolicies = DEFAULT_PRODUCT_LIFECYCLE_POLICIES
): string[] {
  const actions: string[] = [];

  if (canSubmitForApproval(state, policies)) {
    actions.push("SUBMIT_FOR_APPROVAL");
  }
  if (canApprove(state, approvalStatus)) {
    actions.push("APPROVE", "REJECT");
  }
  if (canActivate(state, approvalStatus, policies)) {
    actions.push("ACTIVATE");
  }
  if (canSuspend(state)) {
    actions.push("SUSPEND");
  }
  if (canReactivate(state, policies)) {
    actions.push("REACTIVATE");
  }
  if (canDeprecate(state)) {
    actions.push("DEPRECATE");
  }
  if (canArchive(state)) {
    actions.push("ARCHIVE");
  }
  if (canCreateNewVersion(state)) {
    actions.push("CREATE_NEW_VERSION");
  }
  if (canAssignReplacement(state)) {
    actions.push("REPLACE");
  }

  return actions;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

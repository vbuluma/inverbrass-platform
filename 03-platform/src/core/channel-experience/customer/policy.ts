/**
 * Purpose:
 * ENG-003o — Customer Web capability policy (D-04).
 *
 * Deny-by-default. Explicit allow-list. Never evaluates staff RBAC grants.
 */

import { getCapabilityDefinition } from "@/core/channel-experience/capability-registry";
import {
  CUSTOMER_WEB_AUTHENTICATED_ONLY_CAPABILITIES,
  CUSTOMER_WEB_CAPABILITY_ALLOW_LIST,
  CUSTOMER_WEB_CAPABILITY_PERMISSION,
  type CustomerWebCapabilityId,
} from "@/core/channel-experience/customer/constants";
import type { CustomerChannelIdentity } from "@/core/channel-experience/customer/types";
import type { ChannelPolicyDecision } from "@/core/channel-experience/types";

const ALLOW_SET = new Set<string>(CUSTOMER_WEB_CAPABILITY_ALLOW_LIST);
const AUTH_ONLY_SET = new Set<string>(
  CUSTOMER_WEB_AUTHENTICATED_ONLY_CAPABILITIES
);

export function isCustomerWebAllowListed(capabilityId: string): boolean {
  return ALLOW_SET.has(capabilityId);
}

export function evaluateCustomerWebPolicy(
  capabilityId: string,
  identity: CustomerChannelIdentity
): ChannelPolicyDecision {
  const capability = getCapabilityDefinition(capabilityId);
  if (!capability) {
    return { allowed: false, reason: "UNKNOWN CAPABILITY → DENY" };
  }

  if (!ALLOW_SET.has(capabilityId)) {
    return {
      allowed: false,
      reason: "CUSTOMER CAPABILITY NOT EXPLICITLY GRANTED → DENY",
    };
  }

  if (capability.requiresStaffContext) {
    return { allowed: false, reason: "STAFF-ONLY CAPABILITY → DENY" };
  }

  if (
    AUTH_ONLY_SET.has(capabilityId) &&
    identity.authenticationState !== "AUTHENTICATED"
  ) {
    return {
      allowed: false,
      reason: "Authenticated customer identity is required.",
    };
  }

  const requiredGrant =
    CUSTOMER_WEB_CAPABILITY_PERMISSION[capabilityId as CustomerWebCapabilityId];

  if (
    requiredGrant &&
    !identity.customerPermissionCodes.includes(requiredGrant)
  ) {
    return {
      allowed: false,
      reason: "Customer Web grant is missing for this capability.",
    };
  }

  /**
   * Hard partition: staff permissionCodes on the identity must never authorize
   * Customer Web. Grants come only from customerPermissionCodes.
   */
  if (
    identity.permissionCodes.length > 0 &&
    identity.presentationProfile === "CUSTOMER_WEB"
  ) {
    // Defensive: customer identity builders always set permissionCodes = [].
    // If a caller injects staff grants, still ignore them (do not allow via them).
  }

  return { allowed: true };
}

export function listCustomerWebAllowList(): readonly string[] {
  return CUSTOMER_WEB_CAPABILITY_ALLOW_LIST;
}

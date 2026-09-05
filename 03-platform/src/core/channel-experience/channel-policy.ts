/**
 * Purpose:
 * ENG-003o — Channel → Capability policy evaluation.
 *
 * Channel policy is separate from domain logic. Future channels (WhatsApp, etc.)
 * are enabled by policy configuration — not by domain code changes.
 */

import { CHANNEL_CODES, type ChannelCode } from "@/core/channel-experience/constants";
import { getCapabilityDefinition } from "@/core/channel-experience/capability-registry";
import type {
  ChannelIdentity,
  ChannelPolicyDecision,
} from "@/core/channel-experience/types";

const DOMAIN_WORKSPACE_POLICY = {
  PARTY_WORKSPACE: "ALLOW",
  PRODUCT_WORKSPACE: "ALLOW",
  CRM_WORKSPACE: "ALLOW",
  COMMERCIAL_WORKSPACE: "ALLOW",
  COMMERCIAL_GOVERNANCE_WORKSPACE: "ALLOW",
  TAX_COMPLIANCE_WORKSPACE: "ALLOW",
  SALES_WORKSPACE: "ALLOW",
  PAYMENT_WORKSPACE: "ALLOW",
  INVENTORY_WORKSPACE: "ALLOW",
  PROCUREMENT_WORKSPACE: "ALLOW",
} as const;

const CHANNEL_CAPABILITY_POLICY: Record<
  ChannelCode,
  Readonly<Record<string, "ALLOW" | "DENY" | "NOT_CONFIGURED">>
> = {
  [CHANNEL_CODES.WEB]: {
    OFFERING_VIEW: "ALLOW",
    PRICE_QUERY: "ALLOW",
    STOCK_AVAILABILITY_QUERY: "ALLOW",
    CREATE_QUOTATION: "ALLOW",
    VIEW_QUOTATION: "ALLOW",
    CREATE_SALE: "ALLOW",
    VIEW_ORDER: "ALLOW",
    INITIATE_PAYMENT: "ALLOW",
    VIEW_PAYMENT_STATUS: "ALLOW",
    CUSTOMER_ACCOUNT_VIEW: "ALLOW",
    VIEW_SUPPLIER: "ALLOW",
    CREATE_PROCUREMENT_REQUEST: "ALLOW",
    VIEW_PROCUREMENT_STATUS: "ALLOW",
    PROCUREMENT_DASHBOARD: "ALLOW",
    ...DOMAIN_WORKSPACE_POLICY,
  },
  [CHANNEL_CODES.STAFF]: {
    OFFERING_VIEW: "ALLOW",
    PRICE_QUERY: "ALLOW",
    STOCK_AVAILABILITY_QUERY: "ALLOW",
    CREATE_QUOTATION: "ALLOW",
    VIEW_QUOTATION: "ALLOW",
    CREATE_SALE: "ALLOW",
    VIEW_ORDER: "ALLOW",
    INITIATE_PAYMENT: "ALLOW",
    VIEW_PAYMENT_STATUS: "ALLOW",
    VIEW_SUPPLIER: "ALLOW",
    CREATE_PROCUREMENT_REQUEST: "ALLOW",
    VIEW_PROCUREMENT_STATUS: "ALLOW",
    PROCUREMENT_DASHBOARD: "ALLOW",
    ...DOMAIN_WORKSPACE_POLICY,
  },
  [CHANNEL_CODES.APP]: {
    OFFERING_VIEW: "ALLOW",
    PRICE_QUERY: "ALLOW",
    STOCK_AVAILABILITY_QUERY: "ALLOW",
    CREATE_QUOTATION: "ALLOW",
    VIEW_QUOTATION: "ALLOW",
    CREATE_SALE: "ALLOW",
    VIEW_ORDER: "ALLOW",
    INITIATE_PAYMENT: "ALLOW",
    VIEW_PAYMENT_STATUS: "ALLOW",
    VIEW_SUPPLIER: "ALLOW",
    CREATE_PROCUREMENT_REQUEST: "ALLOW",
    VIEW_PROCUREMENT_STATUS: "ALLOW",
    PROCUREMENT_DASHBOARD: "ALLOW",
    ...DOMAIN_WORKSPACE_POLICY,
  },
  [CHANNEL_CODES.API]: {
    CREATE_SALE: "ALLOW",
    VIEW_ORDER: "ALLOW",
    INITIATE_PAYMENT: "ALLOW",
    VIEW_PAYMENT_STATUS: "ALLOW",
  },
  [CHANNEL_CODES.CONVERSATIONAL]: {},
  [CHANNEL_CODES.WHATSAPP]: {},
  [CHANNEL_CODES.MESSENGER]: {},
  [CHANNEL_CODES.INSTAGRAM]: {},
};

export function evaluateChannelPolicy(
  channel: ChannelCode,
  capabilityId: string,
  identity: ChannelIdentity
): ChannelPolicyDecision {
  const capability = getCapabilityDefinition(capabilityId);
  if (!capability) {
    return { allowed: false, reason: "Capability is not registered." };
  }

  if (!capability.allowedChannels.includes(channel)) {
    return {
      allowed: false,
      reason: `Capability ${capabilityId} is not exposed on channel ${channel}.`,
    };
  }

  const channelPolicy = CHANNEL_CAPABILITY_POLICY[channel]?.[capabilityId];
  if (channelPolicy === "DENY") {
    return { allowed: false, reason: "Channel policy denies this capability." };
  }
  if (channelPolicy !== "ALLOW") {
    return {
      allowed: false,
      reason: `Channel ${channel} is not yet enabled for capability ${capabilityId}.`,
    };
  }

  if (capability.requiresAuthentication && !identity.platformUserId) {
    return { allowed: false, reason: "Authentication is required." };
  }

  if (
    capability.requiredPermission &&
    !identity.permissionCodes.includes(capability.requiredPermission)
  ) {
    return { allowed: false, reason: "Required permission is missing." };
  }

  if (capability.requiresStaffContext && identity.actorType !== "STAFF") {
    return { allowed: false, reason: "Staff context is required." };
  }

  if (capability.requiresCustomerContext && identity.actorType !== "CUSTOMER") {
    return { allowed: false, reason: "Customer context is required." };
  }

  return { allowed: true };
}

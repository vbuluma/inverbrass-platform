/**
 * Purpose:
 * ENG-003o — Channel & Experience Engine contract types.
 */

import type {
  CapabilityAccessMode,
  ChannelActorType,
  ChannelCode,
} from "@/core/channel-experience/constants";
import type { CurrentBusinessContext } from "@/core/auth/types";

export type ChannelIdentity = {
  channel: ChannelCode;
  actorType: ChannelActorType;
  platformUserId: string | null;
  partyId: string | null;
  externalIdentityKey: string | null;
  roleCodes: readonly string[];
  permissionCodes: readonly string[];
};

export type ChannelSession = {
  sessionId: string;
  correlationId: string;
  channel: ChannelCode;
  businessId: string | null;
  platformUserId: string | null;
  partyId: string | null;
  startedAt: string;
};

export type ChannelContext = {
  channel: ChannelCode;
  session: ChannelSession;
  businessContext: CurrentBusinessContext | null;
  identity: ChannelIdentity;
};

export type ChannelCapabilityDefinition = {
  id: string;
  owningDomain: string;
  requiredPermission: string | null;
  allowedChannels: readonly ChannelCode[];
  requiresAuthentication: boolean;
  requiresStaffContext: boolean;
  requiresCustomerContext: boolean;
  requiresApproval: boolean;
  accessMode: CapabilityAccessMode;
  auditRequired: boolean;
};

export type ChannelPolicyDecision = {
  allowed: boolean;
  reason?: string;
};

export type ChannelRequest<TPayload = unknown> = {
  channel: ChannelCode;
  capabilityId: string;
  payload?: TPayload;
  correlationId?: string;
  sessionId?: string;
};

export type ChannelResponse<TData = unknown> = {
  success: true;
  data: TData;
  correlationId: string;
  sessionId: string;
};

export type ChannelExecutionContext = {
  channel: ChannelCode;
  capabilityId: string;
  channelContext: ChannelContext;
  businessContext: CurrentBusinessContext;
  identity: ChannelIdentity;
  correlationId: string;
  sessionId: string;
};

export type ChannelAdapter = {
  channel: ChannelCode;
  invoke<TPayload, TResult>(
    request: ChannelRequest<TPayload>,
    handler: (execution: ChannelExecutionContext) => Promise<TResult>
  ): Promise<ChannelResponse<TResult>>;
};

export type BusinessIntentCode =
  | "PRODUCT_PRICE_QUERY"
  | "STOCK_AVAILABILITY_QUERY"
  | "CREATE_ORDER_REQUEST"
  | "VIEW_ORDER_STATUS"
  | "INITIATE_PAYMENT_REQUEST"
  | "VIEW_SUPPLIER"
  | "CREATE_PROCUREMENT_REQUEST"
  | "VIEW_PROCUREMENT_STATUS";

export type IntentResolution = {
  intentCode: BusinessIntentCode;
  capabilityId: string;
  confidence: number;
};

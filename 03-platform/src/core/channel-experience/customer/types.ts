/**
 * Purpose:
 * ENG-003o — Customer Web contract types (SL-ENG-003o-002).
 */

import type { ChannelIdentity, ChannelContext } from "@/core/channel-experience/types";
import type { ChannelCode } from "@/core/channel-experience/constants";
import type { CustomerWebPermission } from "@/core/channel-experience/customer/constants";

export type CustomerAuthenticationState = "GUEST" | "AUTHENTICATED";

export type CustomerTenantContext = {
  businessId: string;
  businessCode: string;
  businessName: string;
  statusCode: string;
};

export type CustomerCartLine = {
  offeringId: string;
  quantity: number;
};

/** Channel/session cart — not a Sales/Order domain entity (D-03). */
export type CustomerCartState = {
  lines: readonly CustomerCartLine[];
  updatedAt: string;
};

export type CustomerWebSessionPayload = {
  /** Opaque server-generated session id (UUID). */
  sessionId: string;
  businessId: string;
  businessCode: string;
  issuedAt: number;
  /** Previous session id after rotation (fixation protection). */
  rotatedFrom: string | null;
  partyId: string | null;
  cart: CustomerCartState | null;
};

export type CustomerChannelIdentity = ChannelIdentity & {
  presentationProfile: "CUSTOMER_WEB";
  authenticationState: CustomerAuthenticationState;
  guestSessionId: string;
  customerPermissionCodes: readonly CustomerWebPermission[];
};

export type CustomerChannelExecutionContext = {
  channel: ChannelCode;
  capabilityId: string;
  channelContext: ChannelContext;
  customerTenant: CustomerTenantContext;
  identity: CustomerChannelIdentity;
  correlationId: string;
  sessionId: string;
  authenticationState: CustomerAuthenticationState;
  cart: CustomerCartState | null;
  /** Caller-supplied or generated key for CREATE_SALE / INITIATE_PAYMENT. */
  idempotencyKey: string | null;
};

export type CustomerResourceScope = {
  businessId: string;
  guestSessionId: string;
  partyId: string | null;
};

export type CustomerSafeBusinessSummary = {
  businessCode: string;
  businessName: string;
  statusCode: string;
};

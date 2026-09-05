/**
 * Purpose:
 * ENG-003o public exports — Channel & Experience Engine.
 */

export {
  CHANNEL_EXPERIENCE_ENGINE_ID,
  CHANNEL_CODES,
  CHANNEL_ACTOR_TYPES,
  CAPABILITY_ACCESS_MODES,
} from "@/core/channel-experience/constants";
export type {
  ChannelCode,
  ChannelActorType,
  CapabilityAccessMode,
} from "@/core/channel-experience/constants";
export {
  CHANNEL_EXPERIENCE_ERROR_CODES,
  ChannelExperienceError,
} from "@/core/channel-experience/errors";
export type { ChannelExperienceErrorCode } from "@/core/channel-experience/errors";
export {
  CAPABILITY_REGISTRY,
  getCapabilityDefinition,
  listRegisteredCapabilities,
} from "@/core/channel-experience/capability-registry";
export { evaluateChannelPolicy } from "@/core/channel-experience/channel-policy";
export {
  createChannelSession,
  buildChannelContext,
  defaultWebChannelContext,
} from "@/core/channel-experience/session/channel-session-context";
export {
  ChannelIdentityResolver,
  createChannelIdentityResolver,
} from "@/core/channel-experience/identity/channel-identity-resolver";
export type { WebIdentityResolution } from "@/core/channel-experience/identity/channel-identity-resolver";
export {
  resolveIntentToCapability,
  listIntentMappings,
} from "@/core/channel-experience/intent/intent-model";
export {
  ChannelGatewayService,
  createChannelGatewayService,
} from "@/core/channel-experience/services/channel-gateway-service";
export {
  WebChannelAdapter,
  createWebChannelAdapter,
  invokeWebCapability,
} from "@/core/channel-experience/adapters/web-channel-adapter";
export {
  DOMAIN_WORKSPACE_CAPABILITIES,
  DOMAIN_PERMISSION_PREFIXES,
} from "@/core/channel-experience/domain-capabilities";
export type { DomainWorkspaceCapability } from "@/core/channel-experience/domain-capabilities";
export {
  requireWebChannelContext,
  buildPermissionActor,
} from "@/core/channel-experience/helpers/web-channel-context";
export type { WebChannelContextResult } from "@/core/channel-experience/helpers/web-channel-context";
export {
  requirePartyChannelContext,
  requireProductChannelContext,
  requireCrmChannelContext,
  requireCommercialChannelContext,
  requireCommercialGovernanceChannelContext,
  requireTaxComplianceChannelContext,
  requireSalesChannelContext,
  requirePaymentChannelContext,
  requireInventoryChannelContext,
  requireProcurementChannelContext,
} from "@/core/channel-experience/helpers/domain-channel-entry";
export type {
  ChannelIdentity,
  ChannelSession,
  ChannelContext,
  ChannelCapabilityDefinition,
  ChannelPolicyDecision,
  ChannelRequest,
  ChannelResponse,
  ChannelExecutionContext,
  ChannelAdapter,
  BusinessIntentCode,
  IntentResolution,
} from "@/core/channel-experience/types";

/** SL-ENG-003o-002 — Customer Web foundation */
export {
  CUSTOMER_WEB_SESSION_COOKIE,
  CUSTOMER_WEB_COOKIE_OPTIONS,
  CUSTOMER_WEB_PRESENTATION_PROFILE,
  CUSTOMER_WEB_PERMISSIONS,
  CUSTOMER_WEB_GUEST_GRANTS,
  CUSTOMER_WEB_CAPABILITY_ALLOW_LIST,
  CUSTOMER_WEB_AUTHENTICATED_ONLY_CAPABILITIES,
  CUSTOMER_WEB_SALE_IDEMPOTENCY_NAMESPACE,
  CUSTOMER_WEB_QUOTATION_IDEMPOTENCY_NAMESPACE,
  CUSTOMER_WEB_PAYMENT_IDEMPOTENCY_NAMESPACE,
} from "@/core/channel-experience/customer/constants";
export {
  evaluateCustomerWebPolicy,
  isCustomerWebAllowListed,
  listCustomerWebAllowList,
} from "@/core/channel-experience/customer/policy";
export {
  WebCustomerChannelAdapter,
  createWebCustomerChannelAdapter,
  invokeCustomerWebCapability,
} from "@/core/channel-experience/customer/adapter";
export {
  resolveCustomerTenantByBusinessCode,
  normalizeBusinessCode,
  isValidBusinessCodeFormat,
  assertSessionMatchesTenant,
} from "@/core/channel-experience/customer/tenant-resolution";
export {
  encodeCustomerWebSession,
  decodeCustomerWebSession,
  createCustomerWebSessionPayload,
  isOpaqueSessionId,
  CUSTOMER_CART_BOUNDARY,
  buildCustomerSaleIdempotencyKey,
  CREATE_SALE_IDEMPOTENCY_STATUS,
  buildCustomerQuotationIdempotencyKey,
  CREATE_QUOTATION_IDEMPOTENCY_STATUS,
  buildCustomerPaymentIdempotencyKey,
  INITIATE_PAYMENT_IDEMPOTENCY_STATUS,
  assertCustomerResourceAccess,
  canAccessCustomerResource,
  toCustomerSafeBusinessSummary,
  toCustomerSafeCatalogueItem,
  toCustomerSafeOrderDetail,
  toCustomerSafeOrderHubDetail,
  toCustomerSafeOrderListItem,
  toCustomerSafeOrderPaymentView,
  toCustomerSafePaymentInitiationResult,
  toCustomerSafeQuotationView,
  toCustomerQuotationStatusLabel,
  assertNoForbiddenCustomerFields,
  hashCreateSalePayload,
  hashCreateQuotationPayload,
  resolveCustomerWebStoreContext,
  buildGuestCustomerIdentity,
  buildAuthenticatedCustomerIdentity,
  resolveCustomerWebIdentity,
  assertCustomerOrderAccess,
  assertCustomerQuotationAccess,
  resolveCustomerOrderContext,
  resolveCustomerPaymentObligationContext,
  createCustomerCommerceService,
  createCustomerWebQuotationAdapter,
  createCustomerWebOrderTrackingAdapter,
  createCustomerWebPaymentAdapter,
} from "@/core/channel-experience/customer";

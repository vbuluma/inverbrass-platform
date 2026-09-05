/**
 * Purpose:
 * ENG-003o — Customer Web channel gateway execution (SL-ENG-003o-002).
 *
 * Parallel to staff ChannelGatewayService.execute — never uses staff
 * business-context cookie as tenant source.
 */

import { getCapabilityDefinition } from "@/core/channel-experience/capability-registry";
import { CHANNEL_CODES } from "@/core/channel-experience/constants";
import { evaluateCustomerWebPolicy } from "@/core/channel-experience/customer/policy";
import type {
  CustomerChannelExecutionContext,
  CustomerChannelIdentity,
  CustomerTenantContext,
  CustomerWebSessionPayload,
} from "@/core/channel-experience/customer/types";
import {
  CHANNEL_EXPERIENCE_ERROR_CODES,
  ChannelExperienceError,
} from "@/core/channel-experience/errors";
import { buildChannelContext } from "@/core/channel-experience/session/channel-session-context";
import type {
  ChannelRequest,
  ChannelResponse,
} from "@/core/channel-experience/types";

export type CustomerGatewayPreResolved = {
  identity: CustomerChannelIdentity;
  customerTenant: CustomerTenantContext;
  session: CustomerWebSessionPayload;
};

export class CustomerChannelGatewayService {
  async executeCustomer<TPayload, TResult>(
    request: ChannelRequest<TPayload>,
    handler: (execution: CustomerChannelExecutionContext) => Promise<TResult>,
    preResolved: CustomerGatewayPreResolved
  ): Promise<ChannelResponse<TResult>> {
    const capability = getCapabilityDefinition(request.capabilityId);
    if (!capability) {
      throw new ChannelExperienceError(
        CHANNEL_EXPERIENCE_ERROR_CODES.CAPABILITY_NOT_REGISTERED,
        `Capability ${request.capabilityId} is not registered.`,
        404
      );
    }

    const { identity, customerTenant, session } = preResolved;

    if (identity.presentationProfile !== "CUSTOMER_WEB") {
      throw new ChannelExperienceError(
        CHANNEL_EXPERIENCE_ERROR_CODES.CAPABILITY_DENIED,
        "Customer Web presentation profile is required.",
        403
      );
    }

    if (session.businessId !== customerTenant.businessId) {
      throw new ChannelExperienceError(
        CHANNEL_EXPERIENCE_ERROR_CODES.CAPABILITY_DENIED,
        "Customer session tenant mismatch.",
        403
      );
    }

    const policyDecision = evaluateCustomerWebPolicy(
      request.capabilityId,
      identity
    );
    if (!policyDecision.allowed) {
      throw new ChannelExperienceError(
        CHANNEL_EXPERIENCE_ERROR_CODES.CAPABILITY_DENIED,
        policyDecision.reason ?? "Capability denied by Customer Web policy.",
        403
      );
    }

    const channelContext = buildChannelContext({
      channel: CHANNEL_CODES.WEB,
      identity,
      businessContext: null,
      sessionId: session.sessionId,
      correlationId: request.correlationId,
    });

    /** Overlay tenant from URL resolution — never from staff cookie. */
    channelContext.session.businessId = customerTenant.businessId;

    const payloadRecord =
      request.payload && typeof request.payload === "object"
        ? (request.payload as Record<string, unknown>)
        : null;
    const idempotencyKey =
      typeof payloadRecord?.idempotencyKey === "string"
        ? payloadRecord.idempotencyKey
        : null;

    const execution: CustomerChannelExecutionContext = {
      channel: CHANNEL_CODES.WEB,
      capabilityId: request.capabilityId,
      channelContext,
      customerTenant,
      identity,
      correlationId: channelContext.session.correlationId,
      sessionId: session.sessionId,
      authenticationState: identity.authenticationState,
      cart: session.cart,
      idempotencyKey,
    };

    const data = await handler(execution);

    return {
      success: true,
      data,
      correlationId: execution.correlationId,
      sessionId: execution.sessionId,
    };
  }
}

export function createCustomerChannelGatewayService(): CustomerChannelGatewayService {
  return new CustomerChannelGatewayService();
}

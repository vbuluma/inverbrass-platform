/**
 * Purpose:
 * ENG-003o — Channel Gateway orchestrates tenant, identity, auth, policy, and capability execution.
 *
 * The gateway does not contain domain business rules.
 */

import { getCapabilityDefinition } from "@/core/channel-experience/capability-registry";
import { evaluateChannelPolicy } from "@/core/channel-experience/channel-policy";
import {
  CHANNEL_EXPERIENCE_ERROR_CODES,
  ChannelExperienceError,
} from "@/core/channel-experience/errors";
import { createChannelIdentityResolver } from "@/core/channel-experience/identity/channel-identity-resolver";
import { buildChannelContext } from "@/core/channel-experience/session/channel-session-context";
import type {
  ChannelExecutionContext,
  ChannelRequest,
  ChannelResponse,
} from "@/core/channel-experience/types";
import type { CurrentBusinessContext } from "@/core/auth/types";

export class ChannelGatewayService {
  async execute<TPayload, TResult>(
    request: ChannelRequest<TPayload>,
    handler: (execution: ChannelExecutionContext) => Promise<TResult>,
    options?: {
      identityResolver?: ReturnType<typeof createChannelIdentityResolver>;
      preResolved?: {
        identity: Awaited<
          ReturnType<
            ReturnType<typeof createChannelIdentityResolver>["resolveWebStaffIdentity"]
          >
        >["identity"];
        businessContext: CurrentBusinessContext | null;
      };
    }
  ): Promise<ChannelResponse<TResult>> {
    const capability = getCapabilityDefinition(request.capabilityId);
    if (!capability) {
      throw new ChannelExperienceError(
        CHANNEL_EXPERIENCE_ERROR_CODES.CAPABILITY_NOT_REGISTERED,
        `Capability ${request.capabilityId} is not registered.`,
        404
      );
    }

    const identityResolver = options?.identityResolver ?? createChannelIdentityResolver();
    const resolved =
      options?.preResolved ??
      (await identityResolver.resolveAuthenticatedStaffIdentity(request.channel));

    const { identity, businessContext } = resolved;

    if (capability.requiresAuthentication && !identity.platformUserId) {
      throw new ChannelExperienceError(
        CHANNEL_EXPERIENCE_ERROR_CODES.AUTHENTICATION_REQUIRED,
        "Authentication is required for this capability.",
        401
      );
    }

    if (!businessContext) {
      throw new ChannelExperienceError(
        CHANNEL_EXPERIENCE_ERROR_CODES.BUSINESS_CONTEXT_REQUIRED,
        "Select a business before continuing.",
        403
      );
    }

    const policyDecision = evaluateChannelPolicy(
      request.channel,
      request.capabilityId,
      identity
    );
    if (!policyDecision.allowed) {
      throw new ChannelExperienceError(
        CHANNEL_EXPERIENCE_ERROR_CODES.CAPABILITY_DENIED,
        policyDecision.reason ?? "Capability denied by channel policy.",
        403
      );
    }

    const channelContext = buildChannelContext({
      channel: request.channel,
      identity,
      businessContext,
      sessionId: request.sessionId,
      correlationId: request.correlationId,
    });

    const execution: ChannelExecutionContext = {
      channel: request.channel,
      capabilityId: request.capabilityId,
      channelContext,
      businessContext,
      identity,
      correlationId: channelContext.session.correlationId,
      sessionId: channelContext.session.sessionId,
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

export function createChannelGatewayService(): ChannelGatewayService {
  return new ChannelGatewayService();
}

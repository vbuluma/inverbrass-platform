/**
 * Purpose:
 * ENG-003o — Web channel adapter (first reference implementation).
 *
 * Server Actions invoke capabilities through this adapter instead of bypassing
 * tenant, identity, and policy checks.
 */

import { CHANNEL_CODES } from "@/core/channel-experience/constants";
import { createChannelGatewayService } from "@/core/channel-experience/services/channel-gateway-service";
import type {
  ChannelAdapter,
  ChannelExecutionContext,
  ChannelRequest,
  ChannelResponse,
} from "@/core/channel-experience/types";

export class WebChannelAdapter implements ChannelAdapter {
  readonly channel = CHANNEL_CODES.WEB;

  async invoke<TPayload, TResult>(
    request: ChannelRequest<TPayload>,
    handler: (execution: ChannelExecutionContext) => Promise<TResult>
  ): Promise<ChannelResponse<TResult>> {
    return createChannelGatewayService().execute(
      { ...request, channel: CHANNEL_CODES.WEB },
      handler
    );
  }
}

export function createWebChannelAdapter(): WebChannelAdapter {
  return new WebChannelAdapter();
}

export async function invokeWebCapability<TResult>(
  capabilityId: string,
  handler: (execution: ChannelExecutionContext) => Promise<TResult>,
  options?: { correlationId?: string; sessionId?: string }
): Promise<ChannelResponse<TResult>> {
  return createWebChannelAdapter().invoke(
    {
      channel: CHANNEL_CODES.WEB,
      capabilityId,
      correlationId: options?.correlationId,
      sessionId: options?.sessionId,
    },
    handler
  );
}

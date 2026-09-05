/**
 * Purpose:
 * ENG-003o — Web Customer Channel Adapter (SL-ENG-003o-002).
 *
 * Presentation adapter for Customer Web over channel WEB.
 * Does not contain BP domain business rules.
 */

import { CHANNEL_CODES } from "@/core/channel-experience/constants";
import {
  createCustomerChannelGatewayService,
  type CustomerGatewayPreResolved,
} from "@/core/channel-experience/customer/gateway";
import type { CustomerChannelExecutionContext } from "@/core/channel-experience/customer/types";
import type {
  ChannelRequest,
  ChannelResponse,
} from "@/core/channel-experience/types";

export class WebCustomerChannelAdapter {
  readonly channel = CHANNEL_CODES.WEB;
  readonly presentationProfile = "CUSTOMER_WEB" as const;

  async invoke<TPayload, TResult>(
    request: ChannelRequest<TPayload>,
    handler: (execution: CustomerChannelExecutionContext) => Promise<TResult>,
    preResolved: CustomerGatewayPreResolved
  ): Promise<ChannelResponse<TResult>> {
    return createCustomerChannelGatewayService().executeCustomer(
      { ...request, channel: CHANNEL_CODES.WEB },
      handler,
      preResolved
    );
  }
}

export function createWebCustomerChannelAdapter(): WebCustomerChannelAdapter {
  return new WebCustomerChannelAdapter();
}

export async function invokeCustomerWebCapability<TResult>(
  capabilityId: string,
  preResolved: CustomerGatewayPreResolved,
  handler: (execution: CustomerChannelExecutionContext) => Promise<TResult>,
  options?: {
    correlationId?: string;
    payload?: unknown;
  }
): Promise<ChannelResponse<TResult>> {
  return createWebCustomerChannelAdapter().invoke(
    {
      channel: CHANNEL_CODES.WEB,
      capabilityId,
      correlationId: options?.correlationId,
      sessionId: preResolved.session.sessionId,
      payload: options?.payload,
    },
    handler,
    preResolved
  );
}

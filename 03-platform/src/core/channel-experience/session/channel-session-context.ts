/**
 * Purpose:
 * ENG-003o — Channel session and correlation context foundation.
 */

import { randomUUID } from "node:crypto";

import {
  CHANNEL_CODES,
  type ChannelCode,
} from "@/core/channel-experience/constants";
import type { ChannelContext, ChannelSession } from "@/core/channel-experience/types";
import type { CurrentBusinessContext } from "@/core/auth/types";
import type { ChannelIdentity } from "@/core/channel-experience/types";

export function createChannelSession(
  channel: ChannelCode,
  options?: {
    sessionId?: string;
    correlationId?: string;
    businessId?: string | null;
    platformUserId?: string | null;
    partyId?: string | null;
  }
): ChannelSession {
  return {
    sessionId: options?.sessionId ?? randomUUID(),
    correlationId: options?.correlationId ?? randomUUID(),
    channel,
    businessId: options?.businessId ?? null,
    platformUserId: options?.platformUserId ?? null,
    partyId: options?.partyId ?? null,
    startedAt: new Date().toISOString(),
  };
}

export function buildChannelContext(input: {
  channel?: ChannelCode;
  identity: ChannelIdentity;
  businessContext: CurrentBusinessContext | null;
  sessionId?: string;
  correlationId?: string;
}): ChannelContext {
  const channel = input.channel ?? input.identity.channel;
  const session = createChannelSession(channel, {
    sessionId: input.sessionId,
    correlationId: input.correlationId,
    businessId: input.businessContext?.businessId ?? null,
    platformUserId: input.identity.platformUserId,
    partyId: input.identity.partyId,
  });

  return {
    channel,
    session,
    businessContext: input.businessContext,
    identity: input.identity,
  };
}

export function defaultWebChannelContext(
  identity: ChannelIdentity,
  businessContext: CurrentBusinessContext | null
): ChannelContext {
  return buildChannelContext({
    channel: CHANNEL_CODES.WEB,
    identity,
    businessContext,
  });
}

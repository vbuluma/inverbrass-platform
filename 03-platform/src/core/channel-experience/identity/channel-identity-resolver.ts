/**
 * Purpose:
 * ENG-003o — Resolve channel-neutral identity from channel-specific credentials.
 *
 * Web uses the existing authenticated platform user and business context.
 * Future conversational channels resolve external identity keys to the same Party model.
 */

import {
  CHANNEL_ACTOR_TYPES,
  CHANNEL_CODES,
  type ChannelCode,
} from "@/core/channel-experience/constants";
import { createPermissionResolutionService } from "@/core/auth/services/permission-resolution-service";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import type { CurrentBusinessContext } from "@/core/auth/types";
import type { ChannelIdentity } from "@/core/channel-experience/types";

export type WebIdentityResolution = {
  identity: ChannelIdentity;
  businessContext: CurrentBusinessContext | null;
};

export class ChannelIdentityResolver {
  async resolveWebStaffIdentity(): Promise<WebIdentityResolution> {
    return this.resolveAuthenticatedStaffIdentity(CHANNEL_CODES.WEB);
  }

  async resolveAuthenticatedStaffIdentity(
    channel: ChannelCode = CHANNEL_CODES.WEB
  ): Promise<WebIdentityResolution> {
    const authService = createAuthService();
    const user = await authService.getAuthenticatedUser();

    const businessContextService = createBusinessContextService();
    const businessContext = await businessContextService.getCurrentContext();

    if (!user) {
      return {
        identity: {
          channel,
          actorType: CHANNEL_ACTOR_TYPES.ANONYMOUS,
          platformUserId: null,
          partyId: null,
          externalIdentityKey: null,
          roleCodes: [],
          permissionCodes: [],
        },
        businessContext: null,
      };
    }

    const permissions = businessContext
      ? await createPermissionResolutionService().resolveForContext(businessContext)
      : { roleCodes: [], permissionCodes: [] };

    return {
      identity: {
        channel,
        actorType: CHANNEL_ACTOR_TYPES.STAFF,
        platformUserId: user.platformUserId,
        partyId: null,
        externalIdentityKey: null,
        roleCodes: permissions.roleCodes,
        permissionCodes: permissions.permissionCodes,
      },
      businessContext,
    };
  }

  /**
   * Future adapter hook — maps WhatsApp phone number / social handle to canonical Party.
   * Not implemented in this phase.
   */
  resolveExternalIdentity(): Promise<ChannelIdentity | null> {
    return Promise.resolve(null);
  }
}

export function createChannelIdentityResolver(): ChannelIdentityResolver {
  return new ChannelIdentityResolver();
}

/**
 * Purpose:
 * ENG-003o — Customer Web identity boundary (SL-ENG-003o-002).
 *
 * Guest-first (D-01). Authenticated customers map to BP-002 Party when bound;
 * never to staff RBAC / business membership grants.
 */

import {
  CHANNEL_ACTOR_TYPES,
  CHANNEL_CODES,
} from "@/core/channel-experience/constants";
import {
  CUSTOMER_WEB_GUEST_GRANTS,
  CUSTOMER_WEB_PERMISSIONS,
  CUSTOMER_WEB_PRESENTATION_PROFILE,
} from "@/core/channel-experience/customer/constants";
import type {
  CustomerAuthenticationState,
  CustomerChannelIdentity,
  CustomerTenantContext,
  CustomerWebSessionPayload,
} from "@/core/channel-experience/customer/types";
import { getAuthSessionFromCookie } from "@/core/auth/session/auth-session-cookie";

const CUSTOMER_WEB_AUTHENTICATED_GRANTS = [
  ...CUSTOMER_WEB_GUEST_GRANTS,
  CUSTOMER_WEB_PERMISSIONS.ACCOUNT_READ,
] as const;

export type CustomerIdentityResolution = {
  identity: CustomerChannelIdentity;
  authenticationState: CustomerAuthenticationState;
  /**
   * Party binding for authenticated customers is a foundation contract.
   * Full platformUser → Party mapping for Customer Web remains a documented gap
   * until SL-CUS-001 / IAM completes account linking within the tenant.
   */
  partyBindingStatus: "NONE" | "SESSION_BOUND" | "PENDING_IAM";
};

export function buildGuestCustomerIdentity(
  session: CustomerWebSessionPayload
): CustomerChannelIdentity {
  return {
    channel: CHANNEL_CODES.WEB,
    actorType: CHANNEL_ACTOR_TYPES.ANONYMOUS,
    platformUserId: null,
    partyId: session.partyId,
    externalIdentityKey: null,
    roleCodes: [],
    /** Staff permission codes intentionally empty — never reuse staff grants. */
    permissionCodes: [],
    presentationProfile: CUSTOMER_WEB_PRESENTATION_PROFILE,
    authenticationState: "GUEST",
    guestSessionId: session.sessionId,
    customerPermissionCodes: CUSTOMER_WEB_GUEST_GRANTS,
  };
}

export function buildAuthenticatedCustomerIdentity(input: {
  session: CustomerWebSessionPayload;
  platformUserId: string;
  partyId: string | null;
}): CustomerChannelIdentity {
  return {
    channel: CHANNEL_CODES.WEB,
    actorType: CHANNEL_ACTOR_TYPES.CUSTOMER,
    platformUserId: input.platformUserId,
    partyId: input.partyId,
    externalIdentityKey: null,
    roleCodes: [],
    permissionCodes: [],
    presentationProfile: CUSTOMER_WEB_PRESENTATION_PROFILE,
    authenticationState: "AUTHENTICATED",
    guestSessionId: input.session.sessionId,
    customerPermissionCodes: CUSTOMER_WEB_AUTHENTICATED_GRANTS,
  };
}

/**
 * WHAT: Resolve Customer Web identity without staff business-context cookies.
 * WHY: Customer authorization must remain partitioned from ENG-002 staff RBAC.
 */
export async function resolveCustomerWebIdentity(
  session: CustomerWebSessionPayload,
  tenant: CustomerTenantContext
): Promise<CustomerIdentityResolution> {
  // Tenant reserved for future tenant-scoped Party lookup (SL-CUS-001).
  void tenant;

  const authSession = await getAuthSessionFromCookie().catch(() => null);

  if (!authSession?.platformUserId) {
    return {
      identity: buildGuestCustomerIdentity(session),
      authenticationState: "GUEST",
      partyBindingStatus: session.partyId ? "SESSION_BOUND" : "NONE",
    };
  }

  /**
   * Authenticated platform user on Customer Web:
   * - Does NOT load staff membership permissions
   * - Does NOT select arbitrary tenant via membership
   * - Party mapping deferred (PENDING_IAM) unless already on session
   */
  const partyId = session.partyId;
  return {
    identity: buildAuthenticatedCustomerIdentity({
      session,
      platformUserId: authSession.platformUserId,
      partyId,
    }),
    authenticationState: "AUTHENTICATED",
    partyBindingStatus: partyId ? "SESSION_BOUND" : "PENDING_IAM",
  };
}

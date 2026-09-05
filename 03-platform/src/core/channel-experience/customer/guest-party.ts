/**
 * Purpose:
 * SL-CUS-001 — Guest checkout Party provisioning (BP-002 minimal).
 *
 * Does not create a second customer master. One guest party per guest session.
 */

import { createHash } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  PARTY_STATUS_CODES,
  PARTY_TYPE_CODES,
} from "@/modules/party/constants";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import { generatePartyNumber } from "@/modules/party/services/party-rules";

const GUEST_PARTY_NOTES_PREFIX = "CUSTOMER_WEB_GUEST:";

export async function findOrCreateGuestCheckoutParty(
  context: CurrentBusinessContext,
  guestSessionId: string
): Promise<string> {
  const parties = createPartyRepository();
  const marker = `${GUEST_PARTY_NOTES_PREFIX}${guestSessionId}`;

  const existing = await parties.searchByNotesMarker(context.businessId, marker);
  if (existing) {
    return existing.id;
  }

  const shortLabel = createHash("sha256")
    .update(guestSessionId)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();

  const row = await parties.insert({
    businessId: context.businessId,
    partyNumber: generatePartyNumber(),
    partyTypeCode: PARTY_TYPE_CODES.INDIVIDUAL,
    displayName: `Guest ${shortLabel}`,
    statusCode: PARTY_STATUS_CODES.ACTIVE,
    notes: marker,
    createdBy: context.platformUserId,
    updatedBy: context.platformUserId,
  });

  return row.id;
}

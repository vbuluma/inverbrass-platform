/**
 * Purpose:
 * ENG-003o channel contract smoke validation — all domain workspaces.
 *
 * Run: npx tsx scripts/eng003o-channel-smoke-validation.ts
 */

import assert from "node:assert/strict";

import {
  CAPABILITY_REGISTRY,
  CHANNEL_CODES,
  ChannelExperienceError,
  DOMAIN_WORKSPACE_CAPABILITIES,
  evaluateChannelPolicy,
  getCapabilityDefinition,
  listIntentMappings,
  resolveIntentToCapability,
} from "@/core/channel-experience";
import { PROCUREMENT_PERMISSIONS } from "@/modules/procurement/constants";

const DOMAIN_WORKSPACES = Object.values(DOMAIN_WORKSPACE_CAPABILITIES);

function runRegistryChecks() {
  assert.ok(getCapabilityDefinition("VIEW_SUPPLIER"));
  for (const workspace of DOMAIN_WORKSPACES) {
    assert.ok(
      getCapabilityDefinition(workspace),
      `Missing workspace capability: ${workspace}`
    );
  }
  assert.equal(Object.keys(CAPABILITY_REGISTRY).length >= 22, true);
  console.log("PASS registry — all domain workspace capabilities registered");
}

function runPolicyChecks() {
  const staffIdentity = {
    channel: CHANNEL_CODES.WEB,
    actorType: "STAFF" as const,
    platformUserId: "user-1",
    partyId: null,
    externalIdentityKey: null,
    roleCodes: ["OWNER"],
    permissionCodes: [
      PROCUREMENT_PERMISSIONS.VIEW,
      "CommercialManagement.Config.Read",
    ],
  };

  for (const workspace of DOMAIN_WORKSPACES) {
    const allowed = evaluateChannelPolicy(CHANNEL_CODES.WEB, workspace, staffIdentity);
    assert.equal(allowed.allowed, true, `${workspace} should be allowed on WEB`);
  }

  const denied = evaluateChannelPolicy(
    CHANNEL_CODES.WHATSAPP,
    DOMAIN_WORKSPACE_CAPABILITIES.SALES,
    staffIdentity
  );
  assert.equal(denied.allowed, false);

  const missingPermission = evaluateChannelPolicy(
    CHANNEL_CODES.WEB,
    "COMMERCIAL_WORKSPACE",
    { ...staffIdentity, permissionCodes: [] }
  );
  assert.equal(missingPermission.allowed, false);

  console.log("PASS policy — all domain workspaces on WEB; WhatsApp denied");
}

function runIntentChecks() {
  const resolution = resolveIntentToCapability("PRODUCT_PRICE_QUERY");
  assert.equal(resolution.capabilityId, "PRICE_QUERY");
  assert.equal(listIntentMappings().length >= 8, true);
  console.log("PASS intent — maps to capability without domain mutation");
}

function runGatewayErrorChecks() {
  assert.equal(getCapabilityDefinition("NOT_A_CAPABILITY"), null);
  const err = new ChannelExperienceError("CAPABILITY_DENIED", "Denied", 403);
  assert.equal(err.httpStatus, 403);
  console.log("PASS gateway contracts — error model stable");
}

function main() {
  runRegistryChecks();
  runPolicyChecks();
  runIntentChecks();
  runGatewayErrorChecks();
  console.log("\nENG-003o channel smoke validation complete.");
}

main();

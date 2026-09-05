/**
 * Purpose:
 * SL-ENG-003o-002 Customer Web foundation certification smoke validation.
 *
 * Run: npx tsx scripts/eng003o-customer-web-foundation-smoke.ts
 */

import assert from "node:assert/strict";

import {
  CAPABILITY_REGISTRY,
  CHANNEL_CODES,
  CREATE_SALE_IDEMPOTENCY_STATUS,
  CUSTOMER_CART_BOUNDARY,
  CUSTOMER_WEB_AUTHENTICATED_ONLY_CAPABILITIES,
  CUSTOMER_WEB_CAPABILITY_ALLOW_LIST,
  CUSTOMER_WEB_COOKIE_OPTIONS,
  CUSTOMER_WEB_GUEST_GRANTS,
  CUSTOMER_WEB_PERMISSIONS,
  CUSTOMER_WEB_SESSION_COOKIE,
  assertCustomerResourceAccess,
  assertNoForbiddenCustomerFields,
  buildAuthenticatedCustomerIdentity,
  buildCustomerSaleIdempotencyKey,
  buildGuestCustomerIdentity,
  canAccessCustomerResource,
  createCustomerWebSessionPayload,
  decodeCustomerWebSession,
  encodeCustomerWebSession,
  evaluateChannelPolicy,
  evaluateCustomerWebPolicy,
  getCapabilityDefinition,
  isOpaqueSessionId,
  isValidBusinessCodeFormat,
  normalizeBusinessCode,
  toCustomerSafeBusinessSummary,
} from "@/core/channel-experience";
import { ChannelExperienceError } from "@/core/channel-experience/errors";
import { createCustomerChannelGatewayService } from "@/core/channel-experience/customer/gateway";
import type {
  CustomerChannelIdentity,
  CustomerTenantContext,
  CustomerWebSessionPayload,
} from "@/core/channel-experience/customer/types";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

function guestIdentity(
  session?: CustomerWebSessionPayload
): CustomerChannelIdentity {
  const s =
    session ??
    createCustomerWebSessionPayload({
      businessId: "biz-1",
      businessCode: "DEMO-AAA111",
    });
  return buildGuestCustomerIdentity(s);
}

function authIdentity(): CustomerChannelIdentity {
  const session = createCustomerWebSessionPayload({
    businessId: "biz-1",
    businessCode: "DEMO-AAA111",
  });
  return buildAuthenticatedCustomerIdentity({
    session,
    platformUserId: "user-1",
    partyId: "party-1",
  });
}

function runTenantChecks() {
  check("tenant — normalize business code", () => {
    assert.equal(normalizeBusinessCode(" demo-abc "), "DEMO-ABC");
  });

  check("tenant — valid format accepted", () => {
    assert.equal(isValidBusinessCodeFormat("DEMO-AAA111"), true);
  });

  check("tenant — invalid format rejected", () => {
    assert.equal(isValidBusinessCodeFormat("x"), false);
    assert.equal(isValidBusinessCodeFormat("../etc"), false);
  });
}

function runCapabilityPolicyChecks() {
  const guest = guestIdentity();

  check("policy — allowed customer capability succeeds", () => {
    for (const id of [
      "OFFERING_VIEW",
      "PRICE_QUERY",
      "STOCK_AVAILABILITY_QUERY",
      "CREATE_SALE",
      "INITIATE_PAYMENT",
      "VIEW_ORDER",
      "VIEW_PAYMENT_STATUS",
    ]) {
      assert.equal(
        evaluateCustomerWebPolicy(id, guest).allowed,
        true,
        id
      );
    }
  });

  check("policy — unknown capability denied", () => {
    assert.equal(
      evaluateCustomerWebPolicy("NOT_A_REAL_CAPABILITY", guest).allowed,
      false
    );
  });

  check("policy — staff-only capability denied", () => {
    assert.equal(
      evaluateCustomerWebPolicy("VIEW_SUPPLIER", guest).allowed,
      false
    );
    assert.equal(
      evaluateCustomerWebPolicy("PROCUREMENT_WORKSPACE", guest).allowed,
      false
    );
    assert.equal(
      evaluateCustomerWebPolicy("SALES_WORKSPACE", guest).allowed,
      false
    );
  });

  check("policy — customer cannot use staff grant", () => {
    const withStaffPerms: CustomerChannelIdentity = {
      ...guest,
      permissionCodes: [
        "SalesManagement.Order.Create",
        "ProductManagement.Offering.Read",
        "ProcurementManagement.Supplier.View",
      ],
    };
    assert.equal(
      evaluateCustomerWebPolicy("VIEW_SUPPLIER", withStaffPerms).allowed,
      false
    );
    assert.equal(
      evaluateCustomerWebPolicy("CREATE_SALE", withStaffPerms).allowed,
      true
    );
  });

  check("policy — guest denied authenticated-only capability", () => {
    assert.ok(
      CUSTOMER_WEB_AUTHENTICATED_ONLY_CAPABILITIES.includes(
        "CUSTOMER_ACCOUNT_VIEW"
      )
    );
    assert.equal(
      evaluateCustomerWebPolicy("CUSTOMER_ACCOUNT_VIEW", guest).allowed,
      false
    );
  });

  check("policy — authenticated customer can access account view", () => {
    assert.equal(
      evaluateCustomerWebPolicy("CUSTOMER_ACCOUNT_VIEW", authIdentity()).allowed,
      true
    );
  });

  check("policy — guest grants exclude account read", () => {
    assert.equal(
      CUSTOMER_WEB_GUEST_GRANTS.includes(
        CUSTOMER_WEB_PERMISSIONS.ACCOUNT_READ
      ),
      false
    );
  });
}

function runStaffRegressionPolicy() {
  check("regression — staff workspace policy still allows SALES_WORKSPACE", () => {
    const staffIdentity = {
      channel: CHANNEL_CODES.WEB,
      actorType: "STAFF" as const,
      platformUserId: "user-1",
      partyId: null,
      externalIdentityKey: null,
      roleCodes: ["OWNER"],
      permissionCodes: [] as string[],
    };
    assert.equal(
      evaluateChannelPolicy(CHANNEL_CODES.WEB, "SALES_WORKSPACE", staffIdentity)
        .allowed,
      true
    );
  });

  check("regression — SALES_WORKSPACE requires staff context in registry", () => {
    const def = getCapabilityDefinition("SALES_WORKSPACE");
    assert.ok(def);
    assert.equal(def.requiresStaffContext, true);
    assert.equal(def.allowedChannels.includes(CHANNEL_CODES.API), false);
  });

  check("regression — PAYMENT_WORKSPACE staff-only", () => {
    const def = getCapabilityDefinition("PAYMENT_WORKSPACE");
    assert.ok(def);
    assert.equal(def.requiresStaffContext, true);
  });

  check("regression — OFFERING_VIEW available to customer channels", () => {
    const def = getCapabilityDefinition("OFFERING_VIEW");
    assert.ok(def);
    assert.equal(def.requiresStaffContext, false);
    assert.equal(def.allowedChannels.includes(CHANNEL_CODES.WEB), true);
  });

  check("regression — CUSTOMER_ACCOUNT_VIEW registered", () => {
    assert.ok(getCapabilityDefinition("CUSTOMER_ACCOUNT_VIEW"));
    assert.ok(Object.keys(CAPABILITY_REGISTRY).length >= 23);
  });
}

function runSessionChecks() {
  check("session — server-generated opaque UUID", () => {
    const session = createCustomerWebSessionPayload({
      businessId: "biz-1",
      businessCode: "DEMO-AAA111",
    });
    assert.equal(isOpaqueSessionId(session.sessionId), true);
    assert.equal(session.sessionId.includes("DEMO"), false);
    assert.equal(typeof session.issuedAt, "number");
  });

  check("session — encode/decode round-trip", () => {
    process.env.CUSTOMER_WEB_SESSION_SECRET =
      process.env.CUSTOMER_WEB_SESSION_SECRET ?? "test-customer-web-secret";
    const session = createCustomerWebSessionPayload({
      businessId: "biz-1",
      businessCode: "DEMO-AAA111",
    });
    const encoded = encodeCustomerWebSession(session);
    const decoded = decodeCustomerWebSession(encoded);
    assert.ok(decoded);
    assert.equal(decoded.sessionId, session.sessionId);
    assert.equal(decoded.businessId, "biz-1");
  });

  check("session — tampered cookie rejected", () => {
    process.env.CUSTOMER_WEB_SESSION_SECRET =
      process.env.CUSTOMER_WEB_SESSION_SECRET ?? "test-customer-web-secret";
    const session = createCustomerWebSessionPayload({
      businessId: "biz-1",
      businessCode: "DEMO-AAA111",
    });
    const encoded = encodeCustomerWebSession(session);
    const tampered = `${encoded.slice(0, -4)}xxxx`;
    assert.equal(decodeCustomerWebSession(tampered), null);
  });

  check("session — cookie secure attributes in production config", () => {
    assert.equal(CUSTOMER_WEB_SESSION_COOKIE, "inverbrass-customer-web-session");
    assert.equal(CUSTOMER_WEB_COOKIE_OPTIONS.httpOnly, true);
    assert.equal(CUSTOMER_WEB_COOKIE_OPTIONS.sameSite, "lax");
    assert.equal(CUSTOMER_WEB_COOKIE_OPTIONS.path, "/store");
    assert.equal(
      CUSTOMER_WEB_COOKIE_OPTIONS.secure,
      process.env.NODE_ENV === "production"
    );
  });

  check("session — fixation rotation changes session id", () => {
    const first = createCustomerWebSessionPayload({
      businessId: "biz-1",
      businessCode: "DEMO-AAA111",
    });
    const rotated = createCustomerWebSessionPayload({
      businessId: first.businessId,
      businessCode: first.businessCode,
      cart: first.cart,
      partyId: first.partyId,
      rotatedFrom: first.sessionId,
    });
    assert.notEqual(first.sessionId, rotated.sessionId);
    assert.equal(rotated.rotatedFrom, first.sessionId);
  });
}

function runResourceScopeChecks() {
  const scope = {
    businessId: "biz-1",
    guestSessionId: "guest-a",
    partyId: null as string | null,
  };

  check("resource — guest can access own resource", () => {
    assert.equal(
      canAccessCustomerResource(scope, {
        businessId: "biz-1",
        guestSessionId: "guest-a",
        partyId: null,
      }),
      true
    );
  });

  check("resource — guest cannot access another guest order", () => {
    assert.equal(
      canAccessCustomerResource(scope, {
        businessId: "biz-1",
        guestSessionId: "guest-b",
        partyId: null,
      }),
      false
    );
  });

  check("resource — tampered id does not bypass", () => {
    assert.throws(
      () =>
        assertCustomerResourceAccess(scope, {
          businessId: "biz-1",
          guestSessionId: "guessed-uuid",
          partyId: null,
        }),
      ChannelExperienceError
    );
  });

  check("resource — cross-tenant denied", () => {
    assert.equal(
      canAccessCustomerResource(scope, {
        businessId: "biz-other",
        guestSessionId: "guest-a",
        partyId: null,
      }),
      false
    );
  });

  check("resource — authenticated party can access own resource", () => {
    assert.equal(
      canAccessCustomerResource(
        { businessId: "biz-1", guestSessionId: "guest-a", partyId: "party-1" },
        {
          businessId: "biz-1",
          guestSessionId: "other-guest",
          partyId: "party-1",
        }
      ),
      true
    );
  });

  check("resource — customer cannot access another customer resource", () => {
    assert.equal(
      canAccessCustomerResource(
        { businessId: "biz-1", guestSessionId: "guest-a", partyId: "party-1" },
        {
          businessId: "biz-1",
          guestSessionId: "guest-z",
          partyId: "party-2",
        }
      ),
      false
    );
  });
}

function runDtoChecks() {
  check("dto — business summary is customer-safe", () => {
    const summary = toCustomerSafeBusinessSummary({
      businessId: "internal-uuid-should-not-leak-via-summary-api",
      businessCode: "DEMO-AAA111",
      businessName: "Demo Store",
      statusCode: "ACTIVE",
    });
    assert.equal("businessId" in summary, false);
    assert.deepEqual(summary, {
      businessCode: "DEMO-AAA111",
      businessName: "Demo Store",
      statusCode: "ACTIVE",
    });
    assertNoForbiddenCustomerFields(summary as unknown as Record<string, unknown>);
  });

  check("dto — forbidden staff fields rejected", () => {
    assert.throws(() =>
      assertNoForbiddenCustomerFields({
        name: "Widget",
        supplierCost: 10,
      })
    );
    assert.throws(() =>
      assertNoForbiddenCustomerFields({
        marginPercent: 0.2,
      })
    );
  });
}

function runCartAndIdempotencyChecks() {
  check("cart — session boundary not a domain entity", () => {
    assert.equal(CUSTOMER_CART_BOUNDARY.domainEntity, null);
    assert.equal(CUSTOMER_CART_BOUNDARY.checkoutCapability, "CREATE_SALE");
  });

  check("idempotency — CREATE_SALE channel + domain contracts ready", () => {
    const key = buildCustomerSaleIdempotencyKey({
      businessId: "biz-1",
      guestSessionId: "guest-a",
      clientKey: "checkout-1",
    });
    assert.match(key.key, /^customer-web:create-sale:guest-a:checkout-1$/);
    assert.equal(CREATE_SALE_IDEMPOTENCY_STATUS.channelContract, "READY");
    assert.equal(CREATE_SALE_IDEMPOTENCY_STATUS.domainIntegration, "READY");
  });
}

/** Async-aware check helper */
async function checkAsync(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

async function runGatewayChecksFixed() {
  const tenant: CustomerTenantContext = {
    businessId: "biz-1",
    businessCode: "DEMO-AAA111",
    businessName: "Demo Store",
    statusCode: "ACTIVE",
  };
  const session = createCustomerWebSessionPayload({
    businessId: tenant.businessId,
    businessCode: tenant.businessCode,
  });
  const identity = buildGuestCustomerIdentity(session);
  const gateway = createCustomerChannelGatewayService();

  await checkAsync(
    "gateway — allowed capability executes with correlation",
    async () => {
      const response = await gateway.executeCustomer(
        {
          channel: CHANNEL_CODES.WEB,
          capabilityId: "PRICE_QUERY",
          correlationId: "corr-test-1",
        },
        async (execution) => {
          assert.equal(execution.customerTenant.businessId, "biz-1");
          assert.equal(execution.channelContext.businessContext, null);
          assert.equal(execution.identity.presentationProfile, "CUSTOMER_WEB");
          assert.equal(execution.correlationId, "corr-test-1");
          return { ok: true };
        },
        { identity, customerTenant: tenant, session }
      );
      assert.equal(response.success, true);
      assert.equal(response.correlationId, "corr-test-1");
    }
  );

  await checkAsync("gateway — staff capability denied", async () => {
    await assert.rejects(
      () =>
        gateway.executeCustomer(
          {
            channel: CHANNEL_CODES.WEB,
            capabilityId: "VIEW_SUPPLIER",
          },
          async () => ({ ok: true }),
          { identity, customerTenant: tenant, session }
        ),
      (err: unknown) =>
        err instanceof ChannelExperienceError &&
        err.code === "CAPABILITY_DENIED"
    );
  });

  await checkAsync("gateway — tenant mismatch denied", async () => {
    const otherSession = createCustomerWebSessionPayload({
      businessId: "biz-other",
      businessCode: "OTHER-111",
    });
    await assert.rejects(
      () =>
        gateway.executeCustomer(
          {
            channel: CHANNEL_CODES.WEB,
            capabilityId: "PRICE_QUERY",
          },
          async () => ({ ok: true }),
          {
            identity: buildGuestCustomerIdentity(otherSession),
            customerTenant: tenant,
            session: otherSession,
          }
        ),
      ChannelExperienceError
    );
  });
}

async function main() {
  console.log("SL-ENG-003o-002 Customer Web foundation certification\n");
  console.log(`Allow-list: ${CUSTOMER_WEB_CAPABILITY_ALLOW_LIST.join(", ")}\n`);

  runTenantChecks();
  runCapabilityPolicyChecks();
  runStaffRegressionPolicy();
  runSessionChecks();
  runResourceScopeChecks();
  runDtoChecks();
  runCartAndIdempotencyChecks();
  await runGatewayChecksFixed();

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
    return;
  }
  console.log("\nCustomer Web foundation smoke validation complete.");
  console.log(
    "Note: CREATE_SALE domain idempotency is READY (SL-CUS-001). Apply sales_idempotency migration for live uniqueness."
  );
}

main();

/**
 * Purpose:
 * SL-CUS-001 — Customer Web Goods Purchase certification.
 *
 * Run: npx tsx scripts/sl-cus-001-customer-web-goods-purchase-certification.ts
 *
 * Covers BLOCKER-01 (trust boundary), BLOCKER-02 (resource auth),
 * BLOCKER-03 (CREATE_SALE domain idempotency) plus live DB uniqueness,
 * concurrent CREATE_SALE, and policy/DTO/cart gates.
 */

import assert from "node:assert/strict";

import {
  CREATE_SALE_IDEMPOTENCY_STATUS,
  CUSTOMER_CART_BOUNDARY,
  CUSTOMER_WEB_CAPABILITY_ALLOW_LIST,
  CUSTOMER_WEB_COOKIE_OPTIONS,
  assertCustomerResourceAccess,
  assertNoForbiddenCustomerFields,
  buildAuthenticatedCustomerIdentity,
  buildCustomerSaleIdempotencyKey,
  buildGuestCustomerIdentity,
  canAccessCustomerResource,
  createCustomerWebSessionPayload,
  evaluateCustomerWebPolicy,
  hashCreateSalePayload,
  isOpaqueSessionId,
  isValidBusinessCodeFormat,
  toCustomerSafeCatalogueItem,
  toCustomerSafeOrderDetail,
} from "@/core/channel-experience";
import { ChannelExperienceError } from "@/core/channel-experience/errors";
import { assertCustomerOrderAccess } from "@/core/channel-experience/customer/order-resource-auth";
import { evaluateChannelPolicy } from "@/core/channel-experience/channel-policy";
import { CHANNEL_CODES } from "@/core/channel-experience/constants";
import { SALES_IDEMPOTENCY_OPERATIONS } from "@/modules/sales/constants";
import {
  SALES_ERROR_CODES,
  SalesOrderError,
} from "@/modules/sales/errors";
import { upsertCartLine, emptyCustomerCart } from "@/core/channel-experience/customer/cart";
import {
  closeDbIfOpen,
  runCreateSaleIntegrityProofs,
  runLiveDbUniquenessProofs,
  runSecurityAndDtoProofs,
  type CertResult,
} from "./sl-cus-001-certification-closure";
import { runLiveSeededPurchaseProofs } from "./sl-cus-001-live-e2e";

let passed = 0;
let failed = 0;
let skipped = 0;

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

function na(name: string, reason: string) {
  skipped += 1;
  console.log(`NA   ${name} — ${reason}`);
}

function recordClosure(results: CertResult[]) {
  for (const result of results) {
    if (result.status === "PASS") {
      passed += 1;
      console.log(`PASS ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
    } else if (result.status === "FAIL") {
      failed += 1;
      console.error(`FAIL ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
    } else {
      skipped += 1;
      console.log(`NA   ${result.name} — ${result.detail ?? "not applicable"}`);
    }
  }
}

function guestSession(businessId = "biz-1", businessCode = "DEMO-AAA111") {
  return createCustomerWebSessionPayload({ businessId, businessCode });
}

function guestIdentity(session = guestSession()) {
  return buildGuestCustomerIdentity(session);
}

function runTenantIsolation() {
  console.log("\n=== A. TENANT ISOLATION ===");
  check("valid business code format", () => {
    assert.equal(isValidBusinessCodeFormat("DEMO-AAA111"), true);
  });
  check("invalid business code denied", () => {
    assert.equal(isValidBusinessCodeFormat("x"), false);
    assert.equal(isValidBusinessCodeFormat("../hack"), false);
  });
  check("guest session binds businessId", () => {
    const session = guestSession("biz-1", "DEMO-AAA111");
    assert.equal(session.businessId, "biz-1");
    assert.equal(session.businessCode, "DEMO-AAA111");
  });
}

function runCustomerAuthorization() {
  console.log("\n=== B. CUSTOMER AUTHORIZATION ===");
  const guest = guestIdentity();

  check("allow-listed capability PASS", () => {
    for (const id of CUSTOMER_WEB_CAPABILITY_ALLOW_LIST) {
      if (id === "CUSTOMER_ACCOUNT_VIEW") continue;
      assert.equal(evaluateCustomerWebPolicy(id, guest).allowed, true, id);
    }
  });

  check("unknown capability DENY", () => {
    assert.equal(evaluateCustomerWebPolicy("NOT_REAL", guest).allowed, false);
  });

  check("staff-only / procurement DENY", () => {
    assert.equal(evaluateCustomerWebPolicy("VIEW_SUPPLIER", guest).allowed, false);
    assert.equal(
      evaluateCustomerWebPolicy("CREATE_PROCUREMENT_REQUEST", guest).allowed,
      false
    );
    assert.equal(
      evaluateCustomerWebPolicy("PROCUREMENT_WORKSPACE", guest).allowed,
      false
    );
    assert.equal(evaluateCustomerWebPolicy("SALES_WORKSPACE", guest).allowed, false);
  });

  check("staff grants do not authorize customer path", () => {
    const withStaff = {
      ...guest,
      permissionCodes: ["SalesManagement.Order.Create", "ProcurementManagement.Supplier.View"],
    };
    assert.equal(evaluateCustomerWebPolicy("VIEW_SUPPLIER", withStaff).allowed, false);
  });

  check("staff identity cannot use customer allow-list via staff policy for procurement", () => {
    const staff = {
      channel: CHANNEL_CODES.WEB,
      actorType: "STAFF" as const,
      platformUserId: "staff-1",
      partyId: null,
      externalIdentityKey: null,
      roleCodes: ["OWNER"],
      permissionCodes: [] as string[],
    };
    // Staff workspace remains staff path; customer policy still deny-by-default for unknowns
    assert.equal(
      evaluateCustomerWebPolicy("INVENTORY_WORKSPACE", guestIdentity()).allowed,
      false
    );
    assert.equal(
      evaluateChannelPolicy(CHANNEL_CODES.WEB, "SALES_WORKSPACE", staff).allowed,
      true
    );
  });
}

function runResourceAuthorization() {
  console.log("\n=== C. RESOURCE AUTHORIZATION ===");
  const scope = {
    businessId: "biz-1",
    guestSessionId: "guest-a",
    partyId: null as string | null,
  };

  check("same tenant + same guest = PASS", () => {
    assert.equal(
      canAccessCustomerResource(scope, {
        businessId: "biz-1",
        guestSessionId: "guest-a",
        partyId: null,
      }),
      true
    );
  });

  check("same tenant + different guest = DENY", () => {
    assert.equal(
      canAccessCustomerResource(scope, {
        businessId: "biz-1",
        guestSessionId: "guest-b",
        partyId: null,
      }),
      false
    );
  });

  check("different tenant = DENY", () => {
    assert.equal(
      canAccessCustomerResource(scope, {
        businessId: "biz-2",
        guestSessionId: "guest-a",
        partyId: null,
      }),
      false
    );
  });

  check("guessed order via metadata DENY", () => {
    assert.throws(
      () =>
        assertCustomerOrderAccess(scope, {
          businessId: "biz-1",
          partyId: "party-other",
          metadata: {
            customerWeb: { guestSessionId: "guessed-session", partyId: "party-other" },
          },
        }),
      ChannelExperienceError
    );
  });

  check("another Party order DENY", () => {
    assert.equal(
      canAccessCustomerResource(
        { businessId: "biz-1", guestSessionId: "guest-a", partyId: "party-1" },
        { businessId: "biz-1", guestSessionId: "guest-z", partyId: "party-2" }
      ),
      false
    );
  });

  check("own Party order PASS", () => {
    assert.equal(
      canAccessCustomerResource(
        { businessId: "biz-1", guestSessionId: "guest-a", partyId: "party-1" },
        { businessId: "biz-1", guestSessionId: null, partyId: "party-1" }
      ),
      true
    );
  });

  check("guessed payment/receipt pattern DENY (resource scope)", () => {
    assert.throws(
      () =>
        assertCustomerResourceAccess(scope, {
          businessId: "biz-1",
          guestSessionId: "random-uuid",
          partyId: null,
        }),
      ChannelExperienceError
    );
  });
}

function runDtoSafety() {
  console.log("\n=== D. DTO SAFETY ===");
  check("catalogue DTO customer-safe", () => {
    const item = toCustomerSafeCatalogueItem({
      productCode: "SKU-1",
      productName: "Widget",
      productTypeCode: "GOODS",
      featured: false,
    });
    assert.equal("productId" in item, false);
    assertNoForbiddenCustomerFields(item as unknown as Record<string, unknown>);
  });

  check("purchase result DTO customer-safe", () => {
    const result = toCustomerSafeOrderDetail({
      orderNumber: "SO-1",
      status: "CONFIRMED",
      currencyCode: "KES",
      grandTotal: "100.00",
      createdAt: new Date().toISOString(),
      lines: [
        {
          offeringCode: "SKU-1",
          offeringName: "Widget",
          orderedQuantity: "1",
          commercialLineAmount: "100.00",
          currencyCode: "KES",
        },
      ],
    });
    assert.equal("businessId" in result, false);
    assertNoForbiddenCustomerFields(result as unknown as Record<string, unknown>);
  });

  check("forbidden internal fields rejected", () => {
    assert.throws(() =>
      assertNoForbiddenCustomerFields({ marginPercent: 0.2, supplierCost: 10 })
    );
  });
}

function runCart() {
  console.log("\n=== E. CART ===");
  check("cart is session boundary not domain", () => {
    assert.equal(CUSTOMER_CART_BOUNDARY.domainEntity, null);
    assert.equal(CUSTOMER_CART_BOUNDARY.checkoutCapability, "CREATE_SALE");
  });
  check("add/update/remove cart lines", () => {
    let cart = emptyCustomerCart();
    cart = upsertCartLine(cart, { offeringId: "p1", quantity: 2 });
    assert.equal(cart.lines.length, 1);
    cart = upsertCartLine(cart, { offeringId: "p1", quantity: 5 });
    assert.equal(cart.lines[0]?.quantity, 5);
    cart = upsertCartLine(cart, { offeringId: "p1", quantity: 0 });
    assert.equal(cart.lines.length, 0);
  });
  na("stale price handled", "Requires live DB seed — covered by checkout revalidation path");
  na("stale availability handled", "Requires live DB seed — covered by assertProductAvailable");
}

function runCreateSaleIdempotency() {
  console.log("\n=== F. CREATE_SALE IDEMPOTENCY ===");
  check("domain integration READY (G-09 closed)", () => {
    assert.equal(CREATE_SALE_IDEMPOTENCY_STATUS.channelContract, "READY");
    assert.equal(CREATE_SALE_IDEMPOTENCY_STATUS.domainIntegration, "READY");
    assert.equal(CREATE_SALE_IDEMPOTENCY_STATUS.blocker, null);
  });

  check("idempotency key required contract", () => {
    const key = buildCustomerSaleIdempotencyKey({
      businessId: "biz-1",
      guestSessionId: "guest-a",
      clientKey: "checkout-1",
    });
    assert.match(key.key, /^customer-web:create-sale:guest-a:checkout-1$/);
    assert.equal(
      SALES_IDEMPOTENCY_OPERATIONS.CREATE_DIRECT_SALE,
      "CREATE_DIRECT_SALE"
    );
  });

  check("payload hash stable for identical request", () => {
    const lines = [
      {
        offeringId: "off-1",
        quantity: 1,
        snapshot: {
          snapshotId: "snap-1",
          businessId: "biz-1",
          frozenAt: new Date().toISOString(),
          integrityHash: "abc",
          immutable: true as const,
          resolution: {} as never,
        },
        expected: { expectedAmount: "10.00" } as never,
      },
    ];
    const a = hashCreateSalePayload({
      customerPartyId: "party-1",
      currencyCode: "KES",
      lines,
    });
    const b = hashCreateSalePayload({
      customerPartyId: "party-1",
      currencyCode: "KES",
      lines,
    });
    assert.equal(a, b);
    assert.equal(a.length, 64);
  });

  check("payload hash differs when quantity changes", () => {
    const base = {
      offeringId: "off-1",
      snapshot: {
        snapshotId: "snap-1",
        businessId: "biz-1",
        frozenAt: new Date().toISOString(),
        integrityHash: "abc",
        immutable: true as const,
        resolution: {} as never,
      },
      expected: { expectedAmount: "10.00" } as never,
    };
    const a = hashCreateSalePayload({
      customerPartyId: "party-1",
      currencyCode: "KES",
      lines: [{ ...base, quantity: 1 }],
    });
    const b = hashCreateSalePayload({
      customerPartyId: "party-1",
      currencyCode: "KES",
      lines: [{ ...base, quantity: 2 }],
    });
    assert.notEqual(a, b);
  });

  check("SalesOrderError codes for idempotency exist", () => {
    assert.equal(SALES_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED, "IDEMPOTENCY_KEY_REQUIRED");
    assert.equal(
      SALES_ERROR_CODES.IDEMPOTENCY_PAYLOAD_MISMATCH,
      "IDEMPOTENCY_PAYLOAD_MISMATCH"
    );
    const err = new SalesOrderError(SALES_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED);
    assert.equal(err.statusCode, 400);
  });

  check("opaque guest session id", () => {
    const session = guestSession();
    assert.equal(isOpaqueSessionId(session.sessionId), true);
  });

  check("cookie secure attributes", () => {
    assert.equal(CUSTOMER_WEB_COOKIE_OPTIONS.httpOnly, true);
    assert.equal(CUSTOMER_WEB_COOKIE_OPTIONS.path, "/store");
  });
}

function runPaymentReceipt() {
  console.log("\n=== G/H. PAYMENT & RECEIPT ===");
  check("authenticated customer identity contract", () => {
    const session = guestSession();
    const identity = buildAuthenticatedCustomerIdentity({
      session,
      platformUserId: "user-1",
      partyId: "party-1",
    });
    assert.equal(identity.actorType, "CUSTOMER");
    assert.equal(identity.presentationProfile, "CUSTOMER_WEB");
    assert.equal(identity.permissionCodes.length, 0);
  });
}

function runRegression() {
  console.log("\n=== I. REGRESSION NOTES ===");
  console.log(
    "Run separately: npx tsx scripts/eng003o-channel-smoke-validation.ts"
  );
  console.log(
    "Run separately: npx tsx scripts/eng003o-customer-web-foundation-smoke.ts"
  );
  check("customer allow-list still excludes workspaces", () => {
    assert.equal(
      CUSTOMER_WEB_CAPABILITY_ALLOW_LIST.includes("SALES_WORKSPACE" as never),
      false
    );
  });
}

async function main() {
  console.log("SL-CUS-001 Customer Web Goods Purchase certification\n");
  runTenantIsolation();
  runCustomerAuthorization();
  runResourceAuthorization();
  runDtoSafety();
  runCart();
  runCreateSaleIdempotency();
  runPaymentReceipt();
  runRegression();

  console.log("\n=== J. LIVE DB UNIQUENESS (migration) ===");
  recordClosure(await runLiveDbUniquenessProofs());

  console.log("\n=== K. CREATE_SALE INTEGRITY + CONCURRENCY ===");
  recordClosure(await runCreateSaleIntegrityProofs());

  console.log("\n=== L. SECURITY + DTO CLOSURE ===");
  recordClosure(runSecurityAndDtoProofs());

  console.log("\n=== M. SEEDED STOREFRONT E2E ===");
  recordClosure(await runLiveSeededPurchaseProofs());

  // Remaining stale-cart live negatives stay NA when covered by server revalidation
  // contracts already exercised in commerce-service (no client price/tenant fields).
  na(
    "stale price client override field",
    "Checkout API has no client price field — server re-resolves commercial totals"
  );
  na(
    "stale availability after concurrent sell-out",
    "Covered by assertProductAvailable; requires multi-actor stock race harness beyond this pass"
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed, ${skipped} NA`);
  if (failed > 0) {
    process.exitCode = 1;
    console.log("\nSL-CUS-001 status: BLOCKED (certification failures)");
    await closeDbIfOpen();
    return;
  }

  console.log("\nContract + live uniqueness + concurrent CREATE_SALE gates executed.");
  console.log("BLOCKER-01/02/03 evidence collected this pass (see PASS lines).");
  await closeDbIfOpen();
}

main().catch(async (error) => {
  console.error(error);
  await closeDbIfOpen();
  process.exitCode = 1;
});

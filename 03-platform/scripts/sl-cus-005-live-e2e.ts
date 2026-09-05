/**
 * Purpose:
 * SL-CUS-005 controlled live pay-later / partial payment E2E.
 */

import "@/lib/env/load-env";

import { and, eq } from "drizzle-orm";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  buildGuestCustomerIdentity,
  createCustomerWebSessionPayload,
  resolveCustomerTenantByBusinessCode,
  toCustomerSafeBusinessSummary,
} from "@/core/channel-experience";
import { createCustomerCommerceService } from "@/core/channel-experience/customer/commerce-service";
import type { CustomerWebStoreContext } from "@/core/channel-experience/customer/context";
import { CustomerCommerceError } from "@/core/channel-experience/customer/commerce-errors";
import { findOrCreateGuestCheckoutParty } from "@/core/channel-experience/customer/guest-party";
import { buildCustomerSaleIdempotencyKey } from "@/core/channel-experience/customer/idempotency";
import { hashCreateSalePayload } from "@/core/channel-experience/customer/commerce-payload";
import {
  buildCustomerDomainContext,
} from "@/core/channel-experience/customer/domain-context";
import { buildCustomerWebOrderMetadata } from "@/core/channel-experience/customer/order-resource-auth";
import { createCustomerWebPaymentAdapter } from "@/core/channel-experience/customer/payment-adapter";
import { createCustomerSalesOrderService } from "@/core/channel-experience/customer/commerce-service";
import { closeDb, getDb } from "@/db/client";
import { business } from "@/db/schema/business";
import { businessOperatingCurrency } from "@/db/schema/business-operating-currency";
import { catalogueChannel } from "@/db/schema/catalogue-channel";
import { product } from "@/db/schema/product";
import { productCataloguePublication } from "@/db/schema/product-catalogue-publication";
import { pricingItem } from "@/db/schema/pricing-item";
import { stockItem } from "@/db/schema/stock-item";
import { unitOfMeasure } from "@/db/schema/unit-of-measure";
import { STOCK_ITEM_TYPE_CODES } from "@/modules/inventory/constants";
import { createInventoryFoundationService } from "@/modules/inventory/services/inventory-foundation-service";
import { createStockReceivingService } from "@/modules/inventory/services/stock-receiving-service";
import { createStockReservationService } from "@/modules/inventory/services/stock-reservation-service";
import {
  PRICING_CATALOGUE_STATUS_CODES,
  PRICING_ITEM_STATUS_CODES,
} from "@/modules/product/constants";
import { createPricingCatalogueRepository } from "@/modules/product/repositories/pricing-catalogue-repository";
import { createPricingItemRepository } from "@/modules/product/repositories/pricing-item-repository";
import { createPaymentObligationService } from "@/modules/payments/services/payment-obligation-service";
import { createPaymentObligationRepository } from "@/modules/payments/repositories/payment-obligation-repository";
import { createPaymentTransactionRepository } from "@/modules/payments/repositories/payment-transaction-repository";
import { SALES_ORDER_STATUS_CODES } from "@/modules/sales/constants";
import { comparePaymentAmount } from "@/core/payment-engine";

export type CertResult = {
  name: string;
  status: "PASS" | "FAIL" | "NA";
  detail?: string;
};

export const FIXTURE_BUSINESS_CODE = "TASHALTD-58CC76";
const OPENING_QTY = "40";

function staffActor(businessId: string): CurrentBusinessContext {
  return {
    businessId,
    platformUserId: "00000000-0000-4000-8000-00000000c005",
    businessMembershipId: "00000000-0000-4000-8000-00000000c0m5",
  };
}

export function buildStoreContext(
  tenant: Awaited<ReturnType<typeof resolveCustomerTenantByBusinessCode>>,
  options?: {
    offeringId?: string;
    sessionId?: string;
    partyId?: string | null;
  }
): CustomerWebStoreContext {
  const session = createCustomerWebSessionPayload({
    businessId: tenant.businessId,
    businessCode: tenant.businessCode,
    ...(options?.sessionId ? { sessionId: options.sessionId } : {}),
    ...(options?.partyId !== undefined ? { partyId: options.partyId } : {}),
    cart: options?.offeringId
      ? {
          lines: [{ offeringId: options.offeringId, quantity: 1 }],
          updatedAt: new Date().toISOString(),
        }
      : undefined,
  });
  return {
    identity: buildGuestCustomerIdentity(session),
    customerTenant: tenant,
    session,
    store: toCustomerSafeBusinessSummary(tenant),
  };
}

async function totalAvailable(businessId: string, productId: string): Promise<number> {
  const [item] = await getDb()
    .select()
    .from(stockItem)
    .where(
      and(
        eq(stockItem.businessId, businessId),
        eq(stockItem.productId, productId),
        eq(stockItem.isActive, true)
      )
    )
    .limit(1);
  if (!item) return 0;
  const availability = await createStockReservationService().listAvailability(
    staffActor(businessId)
  );
  return availability
    .filter((row) => row.stockItemId === item.id)
    .reduce((sum, row) => sum + Number(row.available ?? 0), 0);
}

export async function ensureActivePrice(businessId: string, productId: string) {
  const actor = staffActor(businessId);
  const [item] = await getDb()
    .select()
    .from(pricingItem)
    .where(
      and(eq(pricingItem.businessId, businessId), eq(pricingItem.offeringId, productId))
    )
    .limit(1);
  if (!item) throw new Error("No pricing item for published offering");

  const catalogues = createPricingCatalogueRepository();
  const catalogue = await catalogues.findById(businessId, item.pricingCatalogueId);
  if (!catalogue) throw new Error("Pricing catalogue missing");
  if (catalogue.status !== PRICING_CATALOGUE_STATUS_CODES.ACTIVE) {
    await catalogues.updateById(businessId, catalogue.id, {
      status: PRICING_CATALOGUE_STATUS_CODES.ACTIVE,
      updatedBy: actor.platformUserId,
    });
  }
  if (item.status !== PRICING_ITEM_STATUS_CODES.ACTIVE) {
    await createPricingItemRepository().updateById(businessId, item.id, {
      status: PRICING_ITEM_STATUS_CODES.ACTIVE,
      updatedBy: actor.platformUserId,
    });
  }
}

export async function ensureStockFixture(businessId: string, productId: string) {
  const db = getDb();
  const actor = staffActor(businessId);
  const foundation = createInventoryFoundationService();
  const receiving = createStockReceivingService();

  let [item] = await db
    .select()
    .from(stockItem)
    .where(
      and(
        eq(stockItem.businessId, businessId),
        eq(stockItem.productId, productId),
        eq(stockItem.isActive, true)
      )
    )
    .limit(1);

  const [piece] = await db
    .select()
    .from(unitOfMeasure)
    .where(
      and(eq(unitOfMeasure.businessId, businessId), eq(unitOfMeasure.code, "PIECE"))
    )
    .limit(1);
  if (!piece) throw new Error("PIECE UOM missing for fixture business");

  if (!item) {
    const created = await foundation.createStockItem(actor, {
      productId,
      sku: `CUS005-${Date.now()}`,
      itemTypeCode: STOCK_ITEM_TYPE_CODES.STOCKED_ITEM,
      baseUomId: piece.id,
      stockTrackingEnabled: true,
    });
    const [refetched] = await db
      .select()
      .from(stockItem)
      .where(eq(stockItem.id, created.id))
      .limit(1);
    item = refetched!;
  }

  const locations = await foundation.listLocations(actor);
  const location =
    locations.find((row) => row.isActive !== false) ??
    (await foundation.createLocation(actor, {
      code: `CUS005-${Date.now().toString().slice(-6)}`,
      name: "SL-CUS-005 Cert Store",
      locationTypeCode: "BRANCH_STORE",
    }));

  await foundation.configureStockItemLocation(actor, {
    stockItemId: item.id,
    locationId: location.id,
  });

  const available = await totalAvailable(businessId, productId);
  if (available >= 8) return available;

  const opening = await receiving.createOpeningBalance(actor, {
    locationId: location.id,
    notes: "SL-CUS-005 certification fixture",
  });
  await receiving.addOpeningBalanceLine(actor, opening.id, {
    stockItemId: item.id,
    quantity: OPENING_QTY,
    uomId: piece.id,
    unitCost: "100",
    lineTotal: String(100 * Number(OPENING_QTY)),
    currencyCode: "KES",
  });
  await receiving.postOpeningBalance(actor, opening.id);

  return totalAvailable(businessId, productId);
}

async function resolveBaseCurrency(businessId: string): Promise<string> {
  const [row] = await getDb()
    .select({ currencyCode: businessOperatingCurrency.currencyCode })
    .from(businessOperatingCurrency)
    .where(
      and(
        eq(businessOperatingCurrency.businessId, businessId),
        eq(businessOperatingCurrency.isBase, true)
      )
    )
    .limit(1);
  return row?.currencyCode ?? "KES";
}

/** Create confirmed sale + obligation WITHOUT payment (pay-later fixture). */
export async function createUnpaidCustomerObligation(
  store: CustomerWebStoreContext,
  offeringId: string,
  clientKey: string
): Promise<{ orderReference: string; orderId: string; obligationId: string; outstanding: string }> {
  const domainContext = buildCustomerDomainContext(
    store.customerTenant,
    store.identity
  );
  const partyId =
    store.session.partyId ??
    (await findOrCreateGuestCheckoutParty(domainContext, store.session.sessionId));
  const currencyCode = await resolveBaseCurrency(domainContext.businessId);
  const sales = createCustomerSalesOrderService();
  const idempotency = buildCustomerSaleIdempotencyKey({
    businessId: domainContext.businessId,
    guestSessionId: store.session.sessionId,
    clientKey,
  });
  const commercial = await sales.prepareCommercial(domainContext, {
    customerPartyId: partyId,
    offeringId,
    quantity: 1,
    currencyCode,
  });
  const intentHash = hashCreateSalePayload({
    customerPartyId: partyId,
    currencyCode,
    lines: [{ offeringId, quantity: 1 }],
  });
  const order = await sales.createDirectSale(domainContext, {
    customerPartyId: partyId,
    currencyCode,
    lines: [
      {
        offeringId,
        quantity: 1,
        snapshot: commercial.snapshot,
        expected: commercial.expected,
      },
    ],
    idempotencyKey: idempotency.key,
    idempotencyPayloadHash: intentHash,
    requireIdempotencyKey: true,
    channelMetadata: buildCustomerWebOrderMetadata({
      guestSessionId: store.session.sessionId,
      partyId,
      correlationId: `cus005-${Date.now()}`,
    }),
  });
  const confirmed =
    order.status === SALES_ORDER_STATUS_CODES.CONFIRMED
      ? order
      : await sales.approveConfirmation(domainContext, order.id);

  const obligation = await createPaymentObligationService().createObligation(
    domainContext,
    {
      orderId: confirmed.id,
      idempotencyKey: `customer-web:obligation:${idempotency.key}`,
    }
  );

  return {
    orderReference: confirmed.orderNumber,
    orderId: confirmed.id,
    obligationId: obligation.id,
    outstanding: obligation.outstandingAmount,
  };
}

function liveLog(step: string) {
  console.log(`[sl-cus-005-live ${new Date().toISOString()}] ${step}`);
}

export async function runLiveCustomerPaymentProofs(): Promise<CertResult[]> {
  const results: CertResult[] = [];
  const db = getDb();

  try {
    liveLog("start");
    const [biz] = await db
      .select()
      .from(business)
      .where(eq(business.code, FIXTURE_BUSINESS_CODE))
      .limit(1);
    if (!biz || biz.statusCode !== "ACTIVE") {
      results.push({
        name: "live-e2e:fixture business ACTIVE",
        status: "NA",
        detail: `${FIXTURE_BUSINESS_CODE} not ACTIVE`,
      });
      return results;
    }

    const [website] = await db
      .select()
      .from(catalogueChannel)
      .where(eq(catalogueChannel.code, "WEBSITE"))
      .limit(1);
    if (!website) {
      results.push({ name: "live-e2e:WEBSITE channel", status: "FAIL", detail: "missing" });
      return results;
    }

    const [pub] = await db
      .select({
        productId: productCataloguePublication.productId,
        code: product.productCode,
      })
      .from(productCataloguePublication)
      .innerJoin(product, eq(product.id, productCataloguePublication.productId))
      .where(
        and(
          eq(productCataloguePublication.businessId, biz.id),
          eq(productCataloguePublication.channelId, website.id),
          eq(productCataloguePublication.published, true)
        )
      )
      .limit(1);

    if (!pub) {
      results.push({
        name: "live-e2e:published WEBSITE offering",
        status: "NA",
        detail: "No published WEBSITE catalogue rows",
      });
      return results;
    }

    liveLog("ensure price + stock");
    await ensureActivePrice(biz.id, pub.productId);
    const available = await ensureStockFixture(biz.id, pub.productId);
    results.push({
      name: "live-e2e:stock fixture ready",
      status: available >= 4 ? "PASS" : "FAIL",
      detail: `available=${available}`,
    });
    if (available < 4) return results;

    const tenant = await resolveCustomerTenantByBusinessCode(FIXTURE_BUSINESS_CODE);
    const paymentAdapter = createCustomerWebPaymentAdapter();
    const stamp = Date.now();

    liveLog("create unpaid (full)");
    const guestFull = buildStoreContext(tenant, { offeringId: pub.productId });
    const unpaidFull = await createUnpaidCustomerObligation(
      guestFull,
      pub.productId,
      `cus005-full-${stamp}`
    );
    liveLog(`status before pay ${unpaidFull.orderReference}`);
    const statusBefore = await paymentAdapter.getPaymentStatusForOrder(
      guestFull,
      unpaidFull.orderReference
    );
    results.push({
      name: "live-e2e:outstanding displayed before pay",
      status:
        comparePaymentAmount(statusBefore.outstandingAmount, "0") > 0
          ? "PASS"
          : "FAIL",
      detail: `out=${statusBefore.outstandingAmount}`,
    });

    liveLog("full payment");
    const fullPay = await paymentAdapter.initiatePaymentForOrder(guestFull, {
      orderReference: unpaidFull.orderReference,
      clientPaymentKey: `cus005-pay-full-${stamp}`,
    });
    liveLog(`full payment done status=${fullPay.paymentStatusCode}`);
    results.push({
      name: "live-e2e:full payment succeeds",
      status:
        (fullPay.paymentStatusCode === "SUCCESS" ||
          fullPay.paymentStatusCode === "SUCCESSFUL") &&
        comparePaymentAmount(fullPay.outstandingAmount, "0") === 0
          ? "PASS"
          : "FAIL",
      detail: `status=${fullPay.paymentStatusCode} out=${fullPay.outstandingAmount}`,
    });

    const txsFull = await createPaymentTransactionRepository().listByObligation(
      biz.id,
      unpaidFull.obligationId
    );
    results.push({
      name: "live-e2e:full payment single transaction",
      status: txsFull.length === 1 ? "PASS" : "FAIL",
      detail: `txCount=${txsFull.length}`,
    });

    // --- Partial payment ---
    liveLog("create unpaid (partial)");
    const guestPartial = buildStoreContext(tenant, { offeringId: pub.productId });
    const unpaidPartial = await createUnpaidCustomerObligation(
      guestPartial,
      pub.productId,
      `cus005-partial-${stamp}`
    );
    const half = (Number(unpaidPartial.outstanding) / 2).toFixed(2);
    liveLog(`partial payment 1 amount=${half}`);
    const partial1 = await paymentAdapter.initiatePaymentForOrder(guestPartial, {
      orderReference: unpaidPartial.orderReference,
      amount: half,
      clientPaymentKey: `cus005-pay-p1-${stamp}`,
    });
    liveLog(`partial 1 done out=${partial1.outstandingAmount}`);
    results.push({
      name: "live-e2e:partial payment reduces outstanding",
      status:
        comparePaymentAmount(partial1.outstandingAmount, "0") > 0 &&
        comparePaymentAmount(partial1.outstandingAmount, unpaidPartial.outstanding) <
          0
          ? "PASS"
          : "FAIL",
      detail: `paid=${half} remaining=${partial1.outstandingAmount}`,
    });

    liveLog("partial payment 2 (remainder)");
    const partial2 = await paymentAdapter.initiatePaymentForOrder(guestPartial, {
      orderReference: unpaidPartial.orderReference,
      clientPaymentKey: `cus005-pay-p2-${stamp}`,
    });
    liveLog(`partial 2 done out=${partial2.outstandingAmount}`);
    results.push({
      name: "live-e2e:second payment clears remainder",
      status:
        comparePaymentAmount(partial2.outstandingAmount, "0") === 0
          ? "PASS"
          : "FAIL",
      detail: `out=${partial2.outstandingAmount}`,
    });

    // --- Invalid amounts ---
    liveLog("invalid amount + guest isolation checks");
    const guestInvalid = buildStoreContext(tenant, { offeringId: pub.productId });
    const unpaidInvalid = await createUnpaidCustomerObligation(
      guestInvalid,
      pub.productId,
      `cus005-invalid-${stamp}`
    );
    for (const [label, amount] of [
      ["zero", "0"],
      ["negative", "-1"],
      ["over-outstanding", String(Number(unpaidInvalid.outstanding) + 100)],
      ["malformed", "abc"],
    ] as const) {
      try {
        await paymentAdapter.initiatePaymentForOrder(guestInvalid, {
          orderReference: unpaidInvalid.orderReference,
          amount,
          clientPaymentKey: `cus005-bad-${label}-${stamp}`,
        });
        results.push({
          name: `live-e2e:reject ${label} amount`,
          status: "FAIL",
          detail: "unexpected allow",
        });
      } catch (error) {
        const denied = error instanceof CustomerCommerceError;
        results.push({
          name: `live-e2e:reject ${label} amount`,
          status: denied ? "PASS" : "FAIL",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // --- Guest isolation ---
    const guestB = buildStoreContext(tenant, { offeringId: pub.productId });
    try {
      await paymentAdapter.initiatePaymentForOrder(guestB, {
        orderReference: unpaidInvalid.orderReference,
        clientPaymentKey: `cus005-guestb-${stamp}`,
      });
      results.push({
        name: "live-e2e:Guest B denied Guest A obligation",
        status: "FAIL",
        detail: "unexpected allow",
      });
    } catch (error) {
      results.push({
        name: "live-e2e:Guest B denied Guest A obligation",
        status: error instanceof CustomerCommerceError ? "PASS" : "FAIL",
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    // --- Idempotency sequential ---
    liveLog("idempotency checks");
    const guestIdem = buildStoreContext(tenant, { offeringId: pub.productId });
    const unpaidIdem = await createUnpaidCustomerObligation(
      guestIdem,
      pub.productId,
      `cus005-idem-${stamp}`
    );
    const idemKey = `cus005-idem-key-${stamp}`;
    const first = await paymentAdapter.initiatePaymentForOrder(guestIdem, {
      orderReference: unpaidIdem.orderReference,
      amount: (Number(unpaidIdem.outstanding) / 4).toFixed(2),
      clientPaymentKey: idemKey,
    });
    const second = await paymentAdapter.initiatePaymentForOrder(guestIdem, {
      orderReference: unpaidIdem.orderReference,
      amount: (Number(unpaidIdem.outstanding) / 4).toFixed(2),
      clientPaymentKey: idemKey,
    });
    results.push({
      name: "live-e2e:idempotent retry same key/payload",
      status:
        first.paymentReference === second.paymentReference ? "PASS" : "FAIL",
      detail: `${first.paymentReference} vs ${second.paymentReference}`,
    });

    try {
      await paymentAdapter.initiatePaymentForOrder(guestIdem, {
        orderReference: unpaidIdem.orderReference,
        amount: (Number(unpaidIdem.outstanding) / 2).toFixed(2),
        clientPaymentKey: idemKey,
      });
      results.push({
        name: "live-e2e:same key different payload rejected",
        status: "FAIL",
        detail: "unexpected allow",
      });
    } catch (error) {
      results.push({
        name: "live-e2e:same key different payload rejected",
        status: error instanceof CustomerCommerceError ? "PASS" : "FAIL",
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    // --- Concurrent full-amount race (sequential contention; max:1 pool safe) ---
    liveLog("second-full-after-settle contention");
    const guestConc = buildStoreContext(tenant, { offeringId: pub.productId });
    const unpaidConc = await createUnpaidCustomerObligation(
      guestConc,
      pub.productId,
      `cus005-conc-${stamp}`
    );
    let concSuccess = 0;
    let concReject = 0;
    try {
      await paymentAdapter.initiatePaymentForOrder(guestConc, {
        orderReference: unpaidConc.orderReference,
        clientPaymentKey: `cus005-conc-a-${stamp}`,
      });
      concSuccess += 1;
    } catch {
      concReject += 1;
    }
    try {
      await paymentAdapter.initiatePaymentForOrder(guestConc, {
        orderReference: unpaidConc.orderReference,
        clientPaymentKey: `cus005-conc-b-${stamp}`,
      });
      concSuccess += 1;
    } catch {
      concReject += 1;
    }
    const afterConc = await createPaymentObligationRepository().findById(
      biz.id,
      unpaidConc.obligationId
    );
    results.push({
      name: "live-e2e:second full pay after settle rejected — no overpayment",
      status:
        comparePaymentAmount(afterConc?.outstandingAmount ?? "1", "0") === 0 &&
        concSuccess === 1 &&
        concReject === 1
          ? "PASS"
          : "FAIL",
      detail: `success=${concSuccess} reject=${concReject} out=${afterConc?.outstandingAmount}`,
    });

    // --- Stale balance: display full, concurrent half then stale full ---
    liveLog("stale balance checks");
    const guestStale = buildStoreContext(tenant, { offeringId: pub.productId });
    const unpaidStale = await createUnpaidCustomerObligation(
      guestStale,
      pub.productId,
      `cus005-stale-${stamp}`
    );
    const staleDisplayed = unpaidStale.outstanding;
    await paymentAdapter.initiatePaymentForOrder(guestStale, {
      orderReference: unpaidStale.orderReference,
      amount: (Number(staleDisplayed) / 2).toFixed(2),
      clientPaymentKey: `cus005-stale-first-${stamp}`,
    });
    try {
      await paymentAdapter.initiatePaymentForOrder(guestStale, {
        orderReference: unpaidStale.orderReference,
        amount: staleDisplayed,
        clientPaymentKey: `cus005-stale-second-${stamp}`,
      });
      results.push({
        name: "live-e2e:stale full amount rejected after partial",
        status: "FAIL",
        detail: "unexpected allow",
      });
    } catch (error) {
      results.push({
        name: "live-e2e:stale full amount rejected after partial",
        status: error instanceof CustomerCommerceError ? "PASS" : "FAIL",
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    // --- Already settled reject ---
    try {
      await paymentAdapter.initiatePaymentForOrder(guestFull, {
        orderReference: unpaidFull.orderReference,
        clientPaymentKey: `cus005-settled-${stamp}`,
      });
      results.push({
        name: "live-e2e:already settled rejected",
        status: "FAIL",
        detail: "unexpected allow",
      });
    } catch (error) {
      results.push({
        name: "live-e2e:already settled rejected",
        status: error instanceof CustomerCommerceError ? "PASS" : "FAIL",
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    // Regression: paid checkout path still works
    liveLog("SL-CUS-001 checkout regression");
    const commerce = createCustomerCommerceService();
    const guestCheckout = buildStoreContext(tenant, { offeringId: pub.productId });
    const purchase = await commerce.checkout(guestCheckout, {
      clientCheckoutKey: `cus005-checkout-reg-${stamp}`,
    });
    results.push({
      name: "live-e2e:SL-CUS-001 checkout path still works",
      status: purchase.orderReference ? "PASS" : "FAIL",
      detail: purchase.orderReference,
    });
    liveLog("complete");
  } catch (error) {
    const cause =
      error && typeof error === "object" && "cause" in error
        ? (error as { cause?: unknown }).cause
        : undefined;
    const causeMessage =
      cause instanceof Error
        ? cause.message
        : cause
          ? String(cause)
          : undefined;
    const commerce =
      error instanceof CustomerCommerceError
        ? [
            `commerce=${error.code}`,
            error.underlyingKind ? `kind=${error.underlyingKind}` : null,
            error.underlyingCode ? `under=${error.underlyingCode}` : null,
          ]
            .filter(Boolean)
            .join(" ")
        : null;
    results.push({
      name: "live-e2e:unexpected harness error",
      status: "FAIL",
      detail: [
        commerce,
        error instanceof Error ? error.message : String(error),
        causeMessage ? `cause=${causeMessage}` : null,
      ]
        .filter(Boolean)
        .join(" | ")
        .slice(0, 800),
    });
  }

  return results;
}

export async function closeDbIfOpen() {
  await closeDb();
}

async function runAsCli() {
  const results = await runLiveCustomerPaymentProofs();
  let pass = 0;
  let fail = 0;
  let na = 0;
  console.log("\n=== SL-CUS-005 LIVE E2E RESULTS ===");
  for (const row of results) {
    console.log(
      `${row.status} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`
    );
    if (row.status === "PASS") pass += 1;
    else if (row.status === "FAIL") fail += 1;
    else na += 1;
  }
  console.log(`\nLive totals: ${pass} PASS / ${fail} FAIL / ${na} NA`);
  await closeDbIfOpen();
  process.exit(fail > 0 ? 1 : 0);
}

const invokedDirectly =
  typeof process.argv[1] === "string" &&
  process.argv[1].replace(/\\/g, "/").endsWith("sl-cus-005-live-e2e.ts");

if (invokedDirectly) {
  runAsCli().catch(async (error) => {
    console.error(error);
    await closeDbIfOpen();
    process.exit(1);
  });
}

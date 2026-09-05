/**
 * Purpose:
 * SL-CUS-001 live DB + domain integrity closure proofs.
 */

import "@/lib/env/load-env";

import { and, eq, sql } from "drizzle-orm";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  assertCustomerOrderAccess,
  assertCustomerResourceAccess,
  assertNoForbiddenCustomerFields,
  buildGuestCustomerIdentity,
  canAccessCustomerResource,
  createCustomerWebSessionPayload,
  evaluateCustomerWebPolicy,
  hashCreateSalePayload,
  toCustomerSafeCatalogueItem,
  toCustomerSafeOrderDetail,
} from "@/core/channel-experience";
import { ChannelExperienceError } from "@/core/channel-experience/errors";
import { closeDb, getDb } from "@/db/client";
import { business } from "@/db/schema/business";
import { salesIdempotency } from "@/db/schema/sales-idempotency";
import {
  CommercialResolutionService,
  createCommercialContractService,
  createDownstreamCommercialContractAdapter,
  type ResolvedBasePrice,
} from "@/modules/commercial";
import {
  SALES_CUSTOMER_WEB_CONFIRMATION_POLICY,
  SALES_IDEMPOTENCY_OPERATIONS,
  SALES_ORDER_STATUS_CODES,
} from "@/modules/sales/constants";
import { SalesOrderError, SALES_ERROR_CODES } from "@/modules/sales/errors";
import type { CommercialContractPort } from "@/modules/sales/ports";
import { RecordingSalesAudit } from "@/modules/sales/services/sales-order-audit-helper";
import { createInMemorySalesIdempotencyStore } from "@/modules/sales/services/sales-idempotency-memory-store";
import {
  InMemoryOfferingLookup,
  InMemoryPartyLookup,
  InMemoryQuotationLookup,
  InMemorySalesOrderStore,
} from "@/modules/sales/services/sales-order-memory-store";
import { SalesOrderService } from "@/modules/sales/services/sales-order-service";
import type { CreateDirectSaleLineInput } from "@/modules/sales/types";

export type CertResult = {
  name: string;
  status: "PASS" | "FAIL" | "NA";
  detail?: string;
};

function ctx(businessId: string, userId = "maker-1"): CurrentBusinessContext {
  return {
    businessId,
    platformUserId: userId,
    businessMembershipId: `mem-${businessId}`,
  };
}

function fixtureResolvedBase(
  overrides: Partial<ResolvedBasePrice> = {}
): ResolvedBasePrice {
  return {
    unitPrice: 300,
    currencyCode: "KES",
    pricingMethod: "FIXED",
    pricingMethodLabel: "Fixed",
    pricingCatalogueId: "cat-1",
    catalogueCode: "DEFAULT",
    catalogueName: "Default",
    pricingItemId: "price-1",
    offeringId: "offering-1",
    offeringCode: "W-1",
    offeringName: "Widget",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    effectiveAt: "2026-06-01T00:00:00.000Z",
    minimumPrice: null,
    maximumPrice: null,
    customerSegment: null,
    salesChannel: "WEB",
    region: null,
    provenance: {
      businessId: "biz-a",
      offeringId: "offering-1",
      effectiveAt: "2026-06-01T00:00:00.000Z",
      pricingCatalogueId: "cat-1",
      catalogueCode: "DEFAULT",
      catalogueName: "Default",
      pricingItemId: "price-1",
      pricingMethod: "FIXED",
      pricingMethodLabel: "Fixed",
      dimensions: {
        currencyCode: "KES",
        customerSegment: null,
        salesChannel: "WEB",
        region: null,
        quantity: 1,
      },
    },
    ...overrides,
  } as ResolvedBasePrice;
}

function commercialPort(): CommercialContractPort {
  const adapter = createDownstreamCommercialContractAdapter();
  const service = createCommercialContractService();
  return {
    consumeFromSnapshot: (context, snapshot, options) =>
      adapter.consumeFromSnapshot(context, snapshot, options),
    validate: (context, contract, snapshot) =>
      adapter.validate(context, contract, snapshot),
    verifyIntegrity: (context, contract, snapshot) =>
      service.verifyCommercialContractIntegrity(context, contract, snapshot),
  };
}

async function buildLine(
  businessId: string,
  offeringId: string,
  quantity: number,
  currencyCode = "KES"
): Promise<CreateDirectSaleLineInput> {
  const resolution = new CommercialResolutionService({
    resolveBasePrice: async () =>
      fixtureResolvedBase({
        offeringId,
        provenance: {
          ...fixtureResolvedBase().provenance,
          businessId,
          offeringId,
          dimensions: {
            ...fixtureResolvedBase().provenance.dimensions,
            currencyCode,
            quantity,
          },
        },
      }),
  } as never);
  const pipeline = await resolution.resolveExpectedAmount(ctx(businessId), {
    businessId,
    offeringId,
    currencyCode,
    quantity,
  });
  return {
    offeringId,
    quantity,
    snapshot: pipeline.snapshot,
    expected: pipeline.expected,
  };
}

function makeHarness(idempotency = createInMemorySalesIdempotencyStore()) {
  const store = new InMemorySalesOrderStore();
  const service = new SalesOrderService({
    orders: store,
    parties: new InMemoryPartyLookup([
      { id: "party-1", businessId: "biz-a", displayName: "Guest A" },
      { id: "party-2", businessId: "biz-a", displayName: "Guest B" },
    ]),
    offerings: new InMemoryOfferingLookup([
      {
        id: "offering-1",
        businessId: "biz-a",
        productCode: "W-1",
        productName: "Widget",
        productTypeCode: "GOODS",
      },
    ]),
    quotations: new InMemoryQuotationLookup([]),
    commercial: commercialPort(),
    commercialResolver: {
      resolveAndConsume: async (context, input) => {
        const line = await buildLine(
          context.businessId,
          input.offeringId,
          input.quantity,
          input.currencyCode
        );
        const contract = commercialPort().consumeFromSnapshot(
          context,
          line.snapshot,
          {
            expected: line.expected,
            expectedCurrency: input.currencyCode,
            consumerRef: input.consumerRef,
          }
        );
        return {
          snapshot: line.snapshot,
          expected: line.expected!,
          contract,
        };
      },
    },
    audit: new RecordingSalesAudit(),
    idempotency,
    confirmationPolicy: SALES_CUSTOMER_WEB_CONFIRMATION_POLICY,
  });
  return { service, store, idempotency };
}

export async function runLiveDbUniquenessProofs(): Promise<CertResult[]> {
  const results: CertResult[] = [];
  const db = getDb();

  try {
    const table = await db.execute(
      sql`select to_regclass('public.sales_idempotency') as table_name`
    );
    const rows = table as unknown as Array<{ table_name: string | null }>;
    results.push({
      name: "migration:sales_idempotency table exists",
      status: rows[0]?.table_name === "sales_idempotency" ? "PASS" : "FAIL",
      detail: String(rows[0]?.table_name),
    });

    const indexes = await db.execute(
      sql`select indexname from pg_indexes where tablename = 'sales_idempotency'`
    );
    const indexNames = (indexes as unknown as Array<{ indexname: string }>).map(
      (row) => row.indexname
    );
    results.push({
      name: "migration:unique index exists",
      status: indexNames.includes("sales_idempotency_business_operation_key_uidx")
        ? "PASS"
        : "FAIL",
      detail: indexNames.join(","),
    });

    const [biz] = await db
      .select({ id: business.id, code: business.code })
      .from(business)
      .where(eq(business.statusCode, "ACTIVE"))
      .limit(1);

    if (!biz) {
      results.push({
        name: "db:active business available",
        status: "FAIL",
        detail: "No ACTIVE business",
      });
      return results;
    }

    results.push({
      name: "db:active business available",
      status: "PASS",
      detail: biz.code,
    });

    const key = `cert-cus001-${Date.now()}`;
    const resourceA = crypto.randomUUID();
    const resourceB = crypto.randomUUID();

    await db.insert(salesIdempotency).values({
      businessId: biz.id,
      idempotencyKey: key,
      operationType: SALES_IDEMPOTENCY_OPERATIONS.CREATE_DIRECT_SALE,
      payloadHash: "a".repeat(64),
      resourceType: "sales_order",
      resourceId: resourceA,
    });

    try {
      await db.insert(salesIdempotency).values({
        businessId: biz.id,
        idempotencyKey: key,
        operationType: SALES_IDEMPOTENCY_OPERATIONS.CREATE_DIRECT_SALE,
        payloadHash: "a".repeat(64),
        resourceType: "sales_order",
        resourceId: resourceB,
      });
      results.push({
        name: "db:duplicate key rejected",
        status: "FAIL",
        detail: "Second insert succeeded",
      });
    } catch {
      results.push({
        name: "db:duplicate key rejected",
        status: "PASS",
        detail: "UNIQUE(business_id, operation_type, idempotency_key)",
      });
    }

    const stored = await db
      .select()
      .from(salesIdempotency)
      .where(
        and(
          eq(salesIdempotency.businessId, biz.id),
          eq(salesIdempotency.idempotencyKey, key)
        )
      );

    results.push({
      name: "db:exactly one idempotency row after duplicate attempt",
      status:
        stored.length === 1 && stored[0]?.resourceId === resourceA ? "PASS" : "FAIL",
      detail: `count=${stored.length}`,
    });

    // Tenant scoping: same key allowed under different business_id
    const [biz2] = await db
      .select({ id: business.id, code: business.code })
      .from(business)
      .where(eq(business.statusCode, "ACTIVE"))
      .limit(2);
    const businesses = await db
      .select({ id: business.id, code: business.code })
      .from(business)
      .where(eq(business.statusCode, "ACTIVE"))
      .limit(2);

    if (businesses.length >= 2 && businesses[1]) {
      await db.insert(salesIdempotency).values({
        businessId: businesses[1].id,
        idempotencyKey: key,
        operationType: SALES_IDEMPOTENCY_OPERATIONS.CREATE_DIRECT_SALE,
        payloadHash: "a".repeat(64),
        resourceType: "sales_order",
        resourceId: crypto.randomUUID(),
      });
      results.push({
        name: "db:same key allowed across tenants",
        status: "PASS",
        detail: `${businesses[0]?.code} vs ${businesses[1].code}`,
      });
      await db
        .delete(salesIdempotency)
        .where(
          and(
            eq(salesIdempotency.businessId, businesses[1].id),
            eq(salesIdempotency.idempotencyKey, key)
          )
        );
    } else {
      results.push({
        name: "db:same key allowed across tenants",
        status: "NA",
        detail: "Only one ACTIVE business available",
      });
    }

    await db
      .delete(salesIdempotency)
      .where(
        and(
          eq(salesIdempotency.businessId, biz.id),
          eq(salesIdempotency.idempotencyKey, key)
        )
      );

    void biz2;
  } catch (error) {
    results.push({
      name: "db:live uniqueness suite",
      status: "FAIL",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

export async function runCreateSaleIntegrityProofs(): Promise<CertResult[]> {
  const results: CertResult[] = [];
  const { service, store, idempotency } = makeHarness();
  const maker = ctx("biz-a", "customer-web-actor");
  const line = await buildLine("biz-a", "offering-1", 1);
  const payloadHash = hashCreateSalePayload({
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [line],
  });
  const key = `customer-web:create-sale:guest-a:cert-${Date.now()}`;

  try {
    await service.createDirectSale(maker, {
      customerPartyId: "party-1",
      currencyCode: "KES",
      lines: [line],
      requireIdempotencyKey: true,
    });
    results.push({ name: "create_sale:missing key DENY", status: "FAIL" });
  } catch (error) {
    results.push({
      name: "create_sale:missing key DENY",
      status:
        error instanceof SalesOrderError &&
        error.code === SALES_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED
          ? "PASS"
          : "FAIL",
      detail: error instanceof SalesOrderError ? error.code : String(error),
    });
  }

  const first = await service.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [line],
    idempotencyKey: key,
    idempotencyPayloadHash: payloadHash,
    requireIdempotencyKey: true,
    channelMetadata: {
      customerWeb: {
        guestSessionId: "guest-a",
        partyId: "party-1",
        correlationId: "corr-1",
        channelSource: "CUSTOMER_WEB",
      },
    },
  });

  const replay = await service.createDirectSale(maker, {
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [line],
    idempotencyKey: key,
    idempotencyPayloadHash: payloadHash,
    requireIdempotencyKey: true,
  });

  results.push({
    name: "create_sale:same key + same hash replays",
    status: first.id === replay.id ? "PASS" : "FAIL",
    detail: `${first.id} vs ${replay.id}`,
  });
  results.push({
    name: "create_sale:exactly one order after replay",
    status: store.orders.size === 1 ? "PASS" : "FAIL",
    detail: `orders=${store.orders.size}`,
  });
  results.push({
    name: "create_sale:exactly one idempotency record",
    status: idempotency.rows.length === 1 ? "PASS" : "FAIL",
    detail: `rows=${idempotency.rows.length}`,
  });

  try {
    await service.createDirectSale(maker, {
      customerPartyId: "party-1",
      currencyCode: "KES",
      lines: [{ ...line, quantity: 2 }],
      idempotencyKey: key,
      idempotencyPayloadHash: hashCreateSalePayload({
        customerPartyId: "party-1",
        currencyCode: "KES",
        lines: [{ ...line, quantity: 2 }],
      }),
      requireIdempotencyKey: true,
    });
    results.push({
      name: "create_sale:same key + different hash DENY",
      status: "FAIL",
    });
  } catch (error) {
    results.push({
      name: "create_sale:same key + different hash DENY",
      status:
        error instanceof SalesOrderError &&
        error.code === SALES_ERROR_CODES.IDEMPOTENCY_PAYLOAD_MISMATCH
          ? "PASS"
          : "FAIL",
      detail: error instanceof SalesOrderError ? error.code : String(error),
    });
  }

  results.push({
    name: "create_sale:payload conflict did not create second sale",
    status: store.orders.size === 1 ? "PASS" : "FAIL",
  });

  const concurrentKey = `customer-web:create-sale:guest-a:concurrent-${Date.now()}`;
  const concurrentHarness = makeHarness();
  const concurrentLine = await buildLine("biz-a", "offering-1", 1);
  const concurrentHash = hashCreateSalePayload({
    customerPartyId: "party-1",
    currencyCode: "KES",
    lines: [concurrentLine],
  });

  const settled = await Promise.allSettled(
    Array.from({ length: 8 }, () =>
      concurrentHarness.service.createDirectSale(ctx("biz-a", "customer-web-actor"), {
        customerPartyId: "party-1",
        currencyCode: "KES",
        lines: [concurrentLine],
        idempotencyKey: concurrentKey,
        idempotencyPayloadHash: concurrentHash,
        requireIdempotencyKey: true,
        channelMetadata: {
          customerWeb: {
            guestSessionId: "guest-a",
            partyId: "party-1",
            correlationId: "corr-concurrent",
            channelSource: "CUSTOMER_WEB",
          },
        },
      })
    )
  );

  const fulfilled = settled.filter((row) => row.status === "fulfilled");
  const orderIds = new Set(
    fulfilled.map((row) => (row.status === "fulfilled" ? row.value.id : ""))
  );
  orderIds.delete("");

  results.push({
    name: "create_sale:concurrent duplicate = one sale",
    status:
      orderIds.size === 1 &&
      concurrentHarness.store.orders.size === 1 &&
      concurrentHarness.idempotency.rows.length === 1
        ? "PASS"
        : "FAIL",
    detail: `fulfilled=${fulfilled.length} unique=${orderIds.size} store=${concurrentHarness.store.orders.size} idem=${concurrentHarness.idempotency.rows.length}`,
  });

  const order = store.orders.get(first.id)!;
  results.push({
    name: "create_sale:customer confirmation policy disables SoD",
    status: order.confirmationRequiresSod === false ? "PASS" : "FAIL",
    detail: `confirmationRequiresSod=${String(order.confirmationRequiresSod)} status=${order.status}`,
  });
  results.push({
    name: "create_sale:order remains DRAFT until confirm step",
    status:
      order.status === SALES_ORDER_STATUS_CODES.DRAFT ? "PASS" : "FAIL",
    detail: order.status,
  });

  try {
    assertCustomerOrderAccess(
      { businessId: "biz-a", guestSessionId: "guest-a", partyId: "party-1" },
      {
        businessId: order.businessId,
        metadata: order.metadata,
        partyId: order.partyId ?? "party-1",
      }
    );
    results.push({ name: "resource:owner guest can access order", status: "PASS" });
  } catch (error) {
    results.push({
      name: "resource:owner guest can access order",
      status: "FAIL",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    assertCustomerOrderAccess(
      { businessId: "biz-a", guestSessionId: "guest-b", partyId: "party-2" },
      {
        businessId: order.businessId,
        metadata: order.metadata,
        partyId: order.partyId ?? "party-1",
      }
    );
    results.push({ name: "resource:other guest DENY order", status: "FAIL" });
  } catch (error) {
    results.push({
      name: "resource:other guest DENY order",
      status: error instanceof ChannelExperienceError ? "PASS" : "FAIL",
    });
  }

  results.push({
    name: "resource:cross-tenant DENY",
    status: canAccessCustomerResource(
      { businessId: "biz-a", guestSessionId: "guest-a", partyId: "party-1" },
      { businessId: "biz-b", guestSessionId: "guest-a", partyId: "party-1" }
    )
      ? "FAIL"
      : "PASS",
  });

  return results;
}

export function runSecurityAndDtoProofs(): CertResult[] {
  const results: CertResult[] = [];
  const guest = buildGuestCustomerIdentity(
    createCustomerWebSessionPayload({
      businessId: "biz-a",
      businessCode: "SHOP-1",
    })
  );

  for (const capabilityId of [
    "VIEW_SUPPLIER",
    "CREATE_PROCUREMENT_REQUEST",
    "PROCUREMENT_WORKSPACE",
    "SALES_WORKSPACE",
    "INVENTORY_WORKSPACE",
    "PAYMENT_WORKSPACE",
  ]) {
    results.push({
      name: `policy:deny ${capabilityId}`,
      status: evaluateCustomerWebPolicy(capabilityId, guest).allowed
        ? "FAIL"
        : "PASS",
    });
  }

  const withStaff = {
    ...guest,
    permissionCodes: [
      "SalesManagement.Order.Create",
      "ALL_PROCUREMENT_PERMISSIONS",
      "InventoryManagement.Stock.Adjust",
    ],
  };
  results.push({
    name: "policy:staff grants do not authorize procurement",
    status: evaluateCustomerWebPolicy("VIEW_SUPPLIER", withStaff).allowed
      ? "FAIL"
      : "PASS",
  });

  const catalogue = toCustomerSafeCatalogueItem({
    productCode: "W-1",
    productName: "Widget",
    productTypeCode: "GOODS",
    featured: false,
  });
  try {
    assertNoForbiddenCustomerFields(catalogue as unknown as Record<string, unknown>);
    results.push({ name: "dto:catalogue safe", status: "PASS" });
  } catch (error) {
    results.push({
      name: "dto:catalogue safe",
      status: "FAIL",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  const purchase = toCustomerSafeOrderDetail({
    orderNumber: "SO-1",
    status: "CONFIRMED",
    currencyCode: "KES",
    grandTotal: "100.00",
    createdAt: new Date().toISOString(),
    lines: [
      {
        offeringCode: "W-1",
        offeringName: "Widget",
        orderedQuantity: "1",
        commercialLineAmount: "100.00",
        currencyCode: "KES",
      },
    ],
  });
  results.push({
    name: "dto:purchase omits businessId",
    status: "businessId" in purchase ? "FAIL" : "PASS",
  });

  try {
    assertCustomerResourceAccess(
      { businessId: "biz-a", guestSessionId: "g1", partyId: null },
      { businessId: "biz-a", guestSessionId: "guessed", partyId: null }
    );
    results.push({ name: "resource:guessed payment/receipt DENY", status: "FAIL" });
  } catch {
    results.push({ name: "resource:guessed payment/receipt DENY", status: "PASS" });
  }

  return results;
}

export async function closeDbIfOpen() {
  await closeDb().catch(() => undefined);
}

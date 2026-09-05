/**
 * Purpose:
 * SL-CUS-001 — Customer Web commerce orchestration.
 *
 * All domain calls go through Customer Web gateway context — never staff paths.
 */

import { and, eq } from "drizzle-orm";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { invokeCustomerWebCapability } from "@/core/channel-experience/customer/adapter";
import {
  CUSTOMER_COMMERCE_ERROR_CODES,
  CustomerCommerceError,
} from "@/core/channel-experience/customer/commerce-errors";
import { hashCreateSalePayload } from "@/core/channel-experience/customer/commerce-payload";
import {
  buildCustomerDomainContext,
  assertDomainTenantMatches,
} from "@/core/channel-experience/customer/domain-context";
import {
  toCustomerSafeCatalogueItem,
  toCustomerSafeOrderDetail,
  type CustomerSafeCatalogueItem,
  type CustomerSafePurchaseResult,
  type CustomerSafeStockView,
} from "@/core/channel-experience/customer/dto";
import { findOrCreateGuestCheckoutParty } from "@/core/channel-experience/customer/guest-party";
import { buildCustomerSaleIdempotencyKey } from "@/core/channel-experience/customer/idempotency";
import { resolveCustomerOrderContext } from "@/core/channel-experience/customer/order-context";
import {
  assertCustomerOrderAccess,
  buildCustomerWebOrderMetadata,
} from "@/core/channel-experience/customer/order-resource-auth";
import { loadCanonicalPaymentForAuthorizedOrder } from "@/core/channel-experience/customer/payment-adapter";
import type { CustomerWebStoreContext } from "@/core/channel-experience/customer/context";
import {
  emptyCustomerCart,
  upsertCartLine,
  withCart,
} from "@/core/channel-experience/customer/cart";
import type {
  CustomerCartLine,
  CustomerWebSessionPayload,
} from "@/core/channel-experience/customer/types";
import {
  setCustomerWebSessionCookie,
} from "@/core/channel-experience/customer/guest-session";
import type { CustomerResourceScope } from "@/core/channel-experience/customer/types";
import { getDb } from "@/db/client";
import { businessOperatingCurrency } from "@/db/schema/business-operating-currency";
import { createProductCatalogueService } from "@/modules/product/services/product-catalogue-service";
import { createStockReservationService } from "@/modules/inventory/services/stock-reservation-service";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { createStockItemRepository } from "@/modules/inventory/repositories/stock-item-repository";
import {
  createDefaultSalesOrderDependencies,
  createSalesOrderService,
} from "@/modules/sales/services/sales-order-service";
import { SALES_CUSTOMER_WEB_CONFIRMATION_POLICY } from "@/modules/sales/constants";
import { SALES_IDEMPOTENCY_OPERATIONS } from "@/modules/sales/constants";
import type { CreateDirectSaleLineInput } from "@/modules/sales/types";
import { createPaymentObligationService } from "@/modules/payments/services/payment-obligation-service";
import { createPaymentInitiationService } from "@/modules/payments/services/payment-initiation-service";
import { createSalesOrderRepository } from "@/modules/sales/repositories/sales-order-repository";
import { createSalesIdempotencyRepository } from "@/modules/sales/repositories/sales-idempotency-repository";
import { SALES_ORDER_STATUS_CODES } from "@/modules/sales/constants";

const CUSTOMER_CATALOGUE_CHANNEL = "WEBSITE";

export function createCustomerSalesOrderService() {
  return createSalesOrderService({
    ...createDefaultSalesOrderDependencies(),
    confirmationPolicy: SALES_CUSTOMER_WEB_CONFIRMATION_POLICY,
  });
}

function resourceScopeFromContext(
  store: CustomerWebStoreContext
): CustomerResourceScope {
  return {
    businessId: store.customerTenant.businessId,
    guestSessionId: store.session.sessionId,
    partyId: store.session.partyId,
  };
}

async function resolveBaseCurrency(businessId: string): Promise<string> {
  const db = getDb();
  const [row] = await db
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

async function assertProductAvailable(
  context: CurrentBusinessContext,
  productId: string,
  quantity: number
): Promise<void> {
  const stockItem = await createStockItemRepository().findActiveByProduct(
    context.businessId,
    productId
  );
  if (!stockItem) {
    throw new CustomerCommerceError(
      CUSTOMER_COMMERCE_ERROR_CODES.AVAILABILITY_CHANGED,
      "An item in your cart is out of stock.",
      409
    );
  }
  const availability = await createStockReservationService().listAvailability(context);
  const totalAvailable = availability
    .filter((row) => row.stockItemId === stockItem.id)
    .reduce((sum, row) => sum + Number(row.available ?? 0), 0);
  if (totalAvailable < quantity) {
    throw new CustomerCommerceError(
      CUSTOMER_COMMERCE_ERROR_CODES.AVAILABILITY_CHANGED,
      "An item in your cart is no longer available in the requested quantity.",
      409
    );
  }
}

export class CustomerCommerceService {
  async listCatalogue(
    store: CustomerWebStoreContext
  ): Promise<CustomerSafeCatalogueItem[]> {
    const response = await invokeCustomerWebCapability(
      "OFFERING_VIEW",
      store,
      async (execution) => {
        const domainContext = buildCustomerDomainContext(
          execution.customerTenant,
          execution.identity
        );
        assertDomainTenantMatches(domainContext, execution.customerTenant);
        const rows = await createProductCatalogueService().getPublishedProducts(
          domainContext,
          CUSTOMER_CATALOGUE_CHANNEL
        );
        return rows.map((row) =>
          toCustomerSafeCatalogueItem({
            productCode: row.productCode,
            productName: row.productName,
            productTypeCode: row.productTypeCode,
            featured: row.featured,
          })
        );
      }
    );
    return response.data;
  }

  async getAvailability(
    store: CustomerWebStoreContext,
    offeringCode: string
  ): Promise<CustomerSafeStockView> {
    const response = await invokeCustomerWebCapability(
      "STOCK_AVAILABILITY_QUERY",
      store,
      async (execution) => {
        const domainContext = buildCustomerDomainContext(
          execution.customerTenant,
          execution.identity
        );
        const products = createProductRepository();
        const product = await products.findByProductCode(
          domainContext.businessId,
          offeringCode
        );
        if (!product) {
          return {
            offeringCode,
            available: false,
            availabilityLabel: "UNKNOWN" as const,
          };
        }
        const stockItem = await createStockItemRepository().findActiveByProduct(
          domainContext.businessId,
          product.id
        );
        const availability = await createStockReservationService().listAvailability(
          domainContext
        );
        const totalAvailable = stockItem
          ? availability
              .filter((row) => row.stockItemId === stockItem.id)
              .reduce((sum, row) => sum + Number(row.available ?? 0), 0)
          : 0;
        const label: CustomerSafeStockView["availabilityLabel"] =
          totalAvailable <= 0
            ? "OUT_OF_STOCK"
            : totalAvailable < 5
              ? "LOW_STOCK"
              : "IN_STOCK";
        return {
          offeringCode,
          available: totalAvailable > 0,
          availabilityLabel: label,
        };
      }
    );
    return response.data;
  }

  async updateCart(
    store: CustomerWebStoreContext,
    line: CustomerCartLine
  ): Promise<CustomerWebSessionPayload> {
    const nextCart = upsertCartLine(store.session.cart, line);
    const nextSession = withCart(store.session, nextCart);
    await setCustomerWebSessionCookie(nextSession);
    return nextSession;
  }

  async clearCart(store: CustomerWebStoreContext): Promise<CustomerWebSessionPayload> {
    const nextSession = withCart(store.session, emptyCustomerCart());
    await setCustomerWebSessionCookie(nextSession);
    return nextSession;
  }

  async checkout(
    store: CustomerWebStoreContext,
    input: { clientCheckoutKey: string; paymentMethodId?: string | null }
  ): Promise<CustomerSafePurchaseResult> {
    const cart = store.session.cart;
    if (!cart || cart.lines.length === 0) {
      throw new CustomerCommerceError(
        CUSTOMER_COMMERCE_ERROR_CODES.CART_EMPTY,
        "Your cart is empty.",
        400
      );
    }

    const response = await invokeCustomerWebCapability(
      "CREATE_SALE",
      store,
      async (execution) => {
        const domainContext = buildCustomerDomainContext(
          execution.customerTenant,
          execution.identity
        );
        assertDomainTenantMatches(domainContext, execution.customerTenant);

        const partyId =
          store.session.partyId ??
          (await findOrCreateGuestCheckoutParty(
            domainContext,
            execution.sessionId
          ));

        const currencyCode = await resolveBaseCurrency(domainContext.businessId);
        const sales = createCustomerSalesOrderService();

        const idempotency = buildCustomerSaleIdempotencyKey({
          businessId: domainContext.businessId,
          guestSessionId: execution.sessionId,
          clientKey: input.clientCheckoutKey,
        });

        const intentHash = hashCreateSalePayload({
          customerPartyId: partyId,
          currencyCode,
          lines: cart.lines.map((line) => ({
            offeringId: line.offeringId,
            quantity: line.quantity,
          })),
        });

        const existingIdempotency = await createSalesIdempotencyRepository().find(
          domainContext.businessId,
          SALES_IDEMPOTENCY_OPERATIONS.CREATE_DIRECT_SALE,
          idempotency.key
        );

        if (existingIdempotency) {
          if (existingIdempotency.payloadHash !== intentHash) {
            throw new CustomerCommerceError(
              CUSTOMER_COMMERCE_ERROR_CODES.CHECKOUT_FAILED,
              "This purchase reference was already used for a different order. Start a new checkout.",
              409
            );
          }
          const orderRecord = await createSalesOrderRepository().findById(
            domainContext.businessId,
            existingIdempotency.resourceId
          );
          if (!orderRecord) {
            throw new CustomerCommerceError(
              CUSTOMER_COMMERCE_ERROR_CODES.CHECKOUT_FAILED,
              "This purchase is not available.",
              403
            );
          }
          assertCustomerOrderAccess(resourceScopeFromContext(store), {
            businessId: orderRecord.businessId,
            metadata: orderRecord.metadata as Record<string, unknown> | null,
            partyId: orderRecord.partyId ?? partyId,
          });
          const existingOrder = await sales.getOrder(
            domainContext,
            existingIdempotency.resourceId
          );
          return {
            ...toCustomerSafeOrderDetail({
              orderNumber: existingOrder.orderNumber,
              status: existingOrder.status,
              currencyCode: existingOrder.currencyCode,
              grandTotal: existingOrder.expectedAmount,
              createdAt: existingOrder.createdAt ?? new Date().toISOString(),
              lines: existingOrder.lines.map((line) => ({
                offeringCode: line.offeringCode,
                offeringName: line.offeringName,
                orderedQuantity: line.orderedQuantity,
                commercialLineAmount: line.commercialLineAmount,
                currencyCode: line.currencyCode,
              })),
            }),
            paymentReference: null,
            paymentStatusCode: existingOrder.paymentStatus ?? "PENDING",
            receiptAvailable: false,
          };
        }

        const lineInputs: CreateDirectSaleLineInput[] = [];

        for (const cartLine of cart.lines) {
          const commercial = await sales.prepareCommercial(domainContext, {
            customerPartyId: partyId,
            offeringId: cartLine.offeringId,
            quantity: cartLine.quantity,
            currencyCode,
          });

          await assertProductAvailable(
            domainContext,
            cartLine.offeringId,
            cartLine.quantity
          );
          lineInputs.push({
            offeringId: cartLine.offeringId,
            quantity: cartLine.quantity,
            snapshot: commercial.snapshot,
            expected: commercial.expected,
          });
        }

        const order = await sales.createDirectSale(domainContext, {
          customerPartyId: partyId,
          currencyCode,
          lines: lineInputs,
          idempotencyKey: idempotency.key,
          idempotencyPayloadHash: intentHash,
          requireIdempotencyKey: true,
          channelMetadata: buildCustomerWebOrderMetadata({
            guestSessionId: execution.sessionId,
            partyId,
            correlationId: execution.correlationId,
          }),
        });

        const confirmed =
          order.status === SALES_ORDER_STATUS_CODES.CONFIRMED
            ? order
            : await sales.approveConfirmation(domainContext, order.id);

        const obligations = createPaymentObligationService();
        const obligation = await obligations.createObligation(domainContext, {
          orderId: confirmed.id,
          idempotencyKey: `customer-web:obligation:${idempotency.key}`,
        });

        const initiation = createPaymentInitiationService();
        const obligationDetail = await initiation.getObligationDetail(
          domainContext,
          obligation.id
        );

        const manualOption =
          obligationDetail.eligibleOptions.find(
            (option) => !option.requiresElectronicRail
          ) ?? obligationDetail.eligibleOptions[0];

        if (!manualOption) {
          throw new CustomerCommerceError(
            CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_METHOD_UNAVAILABLE,
            "No payment method is available for this store.",
            503
          );
        }

        const methodId = input.paymentMethodId ?? manualOption.methodId;
        const paymentResult = await initiation.initiatePayment(domainContext, {
          obligationId: obligation.id,
          methodId,
          idempotencyKey: `customer-web:payment:${idempotency.key}`,
          confirmManual: !manualOption.requiresElectronicRail,
        });

        try {
          await this.clearCart(store);
        } catch {
          // Cookie write requires Server Action/Route Handler context; cert harness
          // and some render paths may omit it without affecting domain purchase.
        }

        const purchase = toCustomerSafeOrderDetail({
          orderNumber: confirmed.orderNumber,
          status: confirmed.status,
          currencyCode: confirmed.currencyCode,
          grandTotal: confirmed.expectedAmount,
          createdAt: confirmed.createdAt,
          lines: confirmed.lines.map((line) => ({
            offeringCode: line.offeringCode,
            offeringName: line.offeringName,
            orderedQuantity: line.orderedQuantity,
            commercialLineAmount: line.commercialLineAmount,
            currencyCode: line.currencyCode,
          })),
        });

        return {
          ...purchase,
          paymentReference: paymentResult.transaction.transactionNumber,
          paymentStatusCode: paymentResult.transaction.status,
          receiptAvailable:
            paymentResult.transaction.status === "SUCCESS" ||
            paymentResult.transaction.status === "SUCCESSFUL",
        };
      },
      {
        payload: { idempotencyKey: input.clientCheckoutKey },
      }
    );

    return response.data;
  }

  async getOrderByReference(
    store: CustomerWebStoreContext,
    orderReference: string
  ): Promise<CustomerSafePurchaseResult> {
    const response = await invokeCustomerWebCapability(
      "VIEW_ORDER",
      store,
      async (execution) => {
        const domainContext = buildCustomerDomainContext(
          execution.customerTenant,
          execution.identity
        );
        const orderContext = await resolveCustomerOrderContext(
          store,
          orderReference
        );

        const detail = await createCustomerSalesOrderService().getOrder(
          domainContext,
          orderContext.orderId
        );

        const payment = await loadCanonicalPaymentForAuthorizedOrder({
          businessId: orderContext.businessId,
          orderId: orderContext.orderId,
          orderReference: orderContext.orderReference,
          expectedAmount: detail.expectedAmount,
          currencyCode: detail.currencyCode,
        });

        return {
          ...toCustomerSafeOrderDetail({
            orderNumber: detail.orderNumber,
            status: detail.status,
            currencyCode: detail.currencyCode,
            grandTotal: detail.expectedAmount,
            createdAt: detail.createdAt ?? new Date().toISOString(),
            lines: detail.lines.map((line) => ({
              offeringCode: line.offeringCode,
              offeringName: line.offeringName,
              orderedQuantity: line.orderedQuantity,
              commercialLineAmount: line.commercialLineAmount,
              currencyCode: line.currencyCode,
            })),
          }),
          paymentReference: payment.paymentReference,
          paymentStatusCode: payment.paymentStatusCode,
          receiptAvailable: payment.receiptAvailable,
        };
      }
    );
    return response.data;
  }
}

export function createCustomerCommerceService(): CustomerCommerceService {
  return new CustomerCommerceService();
}

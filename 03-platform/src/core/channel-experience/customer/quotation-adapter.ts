/**
 * Purpose:
 * SL-CUS-003 — Customer Web Quotation Adapter (channel-specific).
 *
 * Maps Customer Web requests → ENG-003o → BP-004 QuotationService.
 * Does NOT own quotation business rules, pricing, lifecycle, or persistence.
 */

import { and, eq } from "drizzle-orm";

import { invokeCustomerWebCapability } from "@/core/channel-experience/customer/adapter";
import {
  CUSTOMER_COMMERCE_ERROR_CODES,
  CustomerCommerceError,
} from "@/core/channel-experience/customer/commerce-errors";
import type { CustomerWebStoreContext } from "@/core/channel-experience/customer/context";
import {
  toCustomerSafeQuotationView,
  type CustomerSafeQuotationView,
} from "@/core/channel-experience/customer/dto";
import {
  assertDomainTenantMatches,
  buildCustomerDomainContext,
} from "@/core/channel-experience/customer/domain-context";
import { findOrCreateGuestCheckoutParty } from "@/core/channel-experience/customer/guest-party";
import { setCustomerWebSessionCookie } from "@/core/channel-experience/customer/guest-session";
import { buildCustomerQuotationIdempotencyKey } from "@/core/channel-experience/customer/idempotency";
import { hashCreateQuotationPayload } from "@/core/channel-experience/customer/quotation-payload";
import {
  assertCustomerQuotationAccess,
  buildCustomerWebQuotationMetadata,
} from "@/core/channel-experience/customer/quotation-resource-auth";
import type { CustomerResourceScope } from "@/core/channel-experience/customer/types";
import {
  CHANNEL_EXPERIENCE_ERROR_CODES,
  ChannelExperienceError,
} from "@/core/channel-experience/errors";
import { getDb } from "@/db/client";
import { businessOperatingCurrency } from "@/db/schema/business-operating-currency";
import { CrmError, CRM_ERROR_CODES } from "@/modules/crm/errors";
import { createQuotationService } from "@/modules/crm/quotation/services/quotation-service";
import type { QuotationDetailView } from "@/modules/crm/quotation/types";
import { createProductRepository } from "@/modules/product/repositories/product-repository";

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

function mapQuotationDetail(
  detail: QuotationDetailView
): CustomerSafeQuotationView {
  return toCustomerSafeQuotationView({
    quotationNumber: detail.quotationNumber,
    status: String(detail.status),
    currencyCode: detail.currencyCode,
    grandTotal: detail.grandTotal,
    createdAt: detail.createdAt,
    documentAvailable: detail.documentAvailable,
    lines: detail.currentVersion.lines.map((line) => ({
      offeringCode: line.offeringCode,
      offeringName: line.offeringName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    })),
  });
}

function mapCrmError(error: unknown): never {
  if (error instanceof CrmError) {
    if (
      error.code === CRM_ERROR_CODES.IDEMPOTENCY_PAYLOAD_MISMATCH ||
      error.code === CRM_ERROR_CODES.IDEMPOTENCY_CONFLICT ||
      error.code === CRM_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED
    ) {
      throw new CustomerCommerceError(
        CUSTOMER_COMMERCE_ERROR_CODES.CHECKOUT_FAILED,
        error.message,
        error.statusCode
      );
    }
    if (error.code === CRM_ERROR_CODES.QUOTATION_NOT_FOUND) {
      throw new ChannelExperienceError(
        CHANNEL_EXPERIENCE_ERROR_CODES.CAPABILITY_DENIED,
        "This quotation is not available.",
        403
      );
    }
    throw new CustomerCommerceError(
      CUSTOMER_COMMERCE_ERROR_CODES.CHECKOUT_FAILED,
      "Unable to process your quotation request. Please try again.",
      error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 400
    );
  }
  throw error;
}

export type CustomerQuotationRequestLine = {
  offeringId: string;
  quantity: number;
};

export type CustomerQuotationRequestInput = {
  lines: CustomerQuotationRequestLine[];
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  clientIdempotencyKey?: string;
  /**
   * Tamper surface for certification only — never mapped into domain unitPrice.
   * Present to prove client-supplied prices cannot become authoritative.
   */
  clientUnitPriceTamper?: number;
};

/**
 * CHANNEL-SPECIFIC adapter for Customer Web quotation request / view.
 * Reusable business logic remains in BP-004 QuotationService.
 */
export class CustomerWebQuotationAdapter {
  async requestQuotation(
    store: CustomerWebStoreContext,
    input: CustomerQuotationRequestInput
  ): Promise<CustomerSafeQuotationView> {
    if (!input.lines.length) {
      throw new CustomerCommerceError(
        CUSTOMER_COMMERCE_ERROR_CODES.CART_EMPTY,
        "Select at least one item for your quotation request.",
        400
      );
    }

    // Intentionally ignore clientUnitPriceTamper — domain resolves price.
    void input.clientUnitPriceTamper;

    const response = await invokeCustomerWebCapability(
      "CREATE_QUOTATION",
      store,
      async (execution) => {
        const domainContext = buildCustomerDomainContext(
          execution.customerTenant,
          execution.identity
        );
        assertDomainTenantMatches(domainContext, execution.customerTenant);

        let partyId = store.session.partyId;
        if (!partyId) {
          partyId = await findOrCreateGuestCheckoutParty(
            domainContext,
            execution.sessionId
          );
          store.session.partyId = partyId;
          try {
            await setCustomerWebSessionCookie(store.session);
          } catch {
            // Cookie write may be unavailable in harness/render paths.
          }
        }

        const products = createProductRepository();
        for (const line of input.lines) {
          const product = await products.findById(
            execution.customerTenant.businessId,
            line.offeringId
          );
          if (!product) {
            throw new CustomerCommerceError(
              CUSTOMER_COMMERCE_ERROR_CODES.OFFERING_NOT_FOUND,
              "One or more selected items are not available.",
              404
            );
          }
          if (line.quantity <= 0) {
            throw new CustomerCommerceError(
              CUSTOMER_COMMERCE_ERROR_CODES.CHECKOUT_FAILED,
              "Quantity must be greater than zero.",
              400
            );
          }
        }

        const currencyCode = await resolveBaseCurrency(
          execution.customerTenant.businessId
        );
        const idempotency = buildCustomerQuotationIdempotencyKey({
          businessId: execution.customerTenant.businessId,
          guestSessionId: execution.sessionId,
          clientKey: input.clientIdempotencyKey,
        });
        const payloadHash = hashCreateQuotationPayload({
          partyId,
          currencyCode,
          notes: input.notes,
          lines: input.lines,
        });

        const metadata = buildCustomerWebQuotationMetadata({
          guestSessionId: execution.sessionId,
          partyId,
          correlationId: execution.correlationId,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
        });

        try {
          const detail = await createQuotationService().createQuotation(
            domainContext,
            {
              partyId,
              currencyCode,
              // Align with Customer Web catalogue channel for price dimensions.
              salesChannel: "WEBSITE",
              notes: input.notes?.trim() || undefined,
              metadata: metadata as Record<string, unknown>,
              // Domain resolves unitPrice when omitted — never trust client prices.
              lines: input.lines.map((line) => ({
                offeringId: line.offeringId,
                quantity: line.quantity,
              })),
              idempotencyKey: idempotency.key,
              idempotencyPayloadHash: payloadHash,
              requireIdempotencyKey: true,
            }
          );
          return mapQuotationDetail(detail);
        } catch (error) {
          mapCrmError(error);
        }
      },
      {
        payload: { lineCount: input.lines.length },
      }
    );

    return response.data;
  }

  async getQuotation(
    store: CustomerWebStoreContext,
    quotationReference: string
  ): Promise<CustomerSafeQuotationView> {
    const response = await invokeCustomerWebCapability(
      "VIEW_QUOTATION",
      store,
      async (execution) => {
        const domainContext = buildCustomerDomainContext(
          execution.customerTenant,
          execution.identity
        );
        assertDomainTenantMatches(domainContext, execution.customerTenant);

        let detail: QuotationDetailView;
        try {
          detail = await createQuotationService().getQuotationByNumber(
            domainContext,
            quotationReference.trim()
          );
        } catch (error) {
          mapCrmError(error);
        }

        assertCustomerQuotationAccess(resourceScopeFromContext(store), {
          businessId: execution.customerTenant.businessId,
          metadata: detail.metadata,
          partyId: detail.partyId,
        });

        return mapQuotationDetail(detail);
      },
      {
        payload: { quotationReference },
      }
    );

    return response.data;
  }
}

export function createCustomerWebQuotationAdapter(): CustomerWebQuotationAdapter {
  return new CustomerWebQuotationAdapter();
}

/** @deprecated Use createCustomerWebQuotationAdapter — retained for transitional imports. */
export function createCustomerQuotationService(): CustomerWebQuotationAdapter {
  return createCustomerWebQuotationAdapter();
}

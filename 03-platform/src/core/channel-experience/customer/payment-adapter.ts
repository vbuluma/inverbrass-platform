/**
 * Purpose:
 * SL-CUS-004 / SL-CUS-005 — Customer Web Payment Adapter (channel-specific).
 *
 * Maps Customer Web → ENG-003o VIEW_PAYMENT_STATUS / INITIATE_PAYMENT → BP-007.
 * Does NOT own payment state, amounts, allocation, or receipt generation.
 */

import { invokeCustomerWebCapability } from "@/core/channel-experience/customer/adapter";
import type { CustomerWebStoreContext } from "@/core/channel-experience/customer/context";
import {
  CUSTOMER_COMMERCE_ERROR_CODES,
  CustomerCommerceError,
} from "@/core/channel-experience/customer/commerce-errors";
import {
  toCustomerSafeOrderPaymentView,
  toCustomerSafePaymentInitiationResult,
  type CustomerSafeOrderPaymentView,
  type CustomerSafePaymentInitiationResult,
} from "@/core/channel-experience/customer/dto";
import {
  assertDomainTenantMatches,
  buildCustomerDomainContext,
} from "@/core/channel-experience/customer/domain-context";
import { buildCustomerPaymentIdempotencyKey } from "@/core/channel-experience/customer/idempotency";
import { resolveCustomerOrderContext } from "@/core/channel-experience/customer/order-context";
import { resolveCustomerPaymentObligationContext } from "@/core/channel-experience/customer/payment-obligation-context";
import {
  ChannelExperienceError,
} from "@/core/channel-experience/errors";
import {
  comparePaymentAmount,
  isPositivePaymentAmount,
} from "@/core/payment-engine";
import { PAYMENT_FINANCIAL_INSTRUCTION_TYPES } from "@/modules/payments/constants";
import {
  PAYMENT_ERROR_CODES,
  PaymentObligationError,
} from "@/modules/payments/errors";
import { createPaymentObligationRepository } from "@/modules/payments/repositories/payment-obligation-repository";
import { createPaymentReceiptRepository } from "@/modules/payments/repositories/payment-receipt-repository";
import { createPaymentTransactionRepository } from "@/modules/payments/repositories/payment-transaction-repository";
import { createPaymentInitiationService } from "@/modules/payments/services/payment-initiation-service";

function isSuccessfulPaymentStatus(status: string): boolean {
  const normalized = status.trim().toUpperCase();
  return normalized === "SUCCESSFUL" || normalized === "SUCCESS";
}

function normalizeCustomerPaymentAmount(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    throw new CustomerCommerceError(
      CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_AMOUNT_INVALID,
      "Enter a payment amount.",
      400
    );
  }
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) {
    throw new CustomerCommerceError(
      CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_AMOUNT_INVALID,
      "Enter a valid payment amount.",
      400
    );
  }
  return trimmed;
}

function classifyUnknownPaymentError(error: unknown): {
  underlyingKind: string;
  underlyingCode?: string;
} {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("emaxconnsession") || message.includes("max clients")) {
      return { underlyingKind: "pool_exhausted", underlyingCode: "EMAXCONNSESSION" };
    }
    if (message.includes("connect_timeout") || message.includes("connection timed out")) {
      return { underlyingKind: "pool_acquisition_timeout" };
    }
    if (message.includes("failed query") || message.includes("postgres")) {
      return {
        underlyingKind: "database_error",
        underlyingCode: error.name || "FailedQuery",
      };
    }
    return { underlyingKind: "application_error", underlyingCode: error.name };
  }
  return { underlyingKind: "unknown_error" };
}

function mapPaymentDomainError(error: unknown): never {
  if (error instanceof CustomerCommerceError) {
    throw error;
  }
  if (error instanceof ChannelExperienceError) {
    throw new CustomerCommerceError(
      CUSTOMER_COMMERCE_ERROR_CODES.OBLIGATION_NOT_AVAILABLE,
      "This payment is not available.",
      error.httpStatus >= 400 && error.httpStatus < 600 ? error.httpStatus : 403,
      {
        underlyingKind: "authorization_failure",
        underlyingCode: error.code,
      }
    );
  }
  if (error instanceof PaymentObligationError) {
    if (
      error.code === PAYMENT_ERROR_CODES.PAYMENT_AMOUNT_EXCEEDS_OUTSTANDING ||
      error.code === PAYMENT_ERROR_CODES.PAYMENT_INVALID_AMOUNT ||
      error.code === PAYMENT_ERROR_CODES.OVERPAYMENT_NOT_ALLOWED
    ) {
      throw new CustomerCommerceError(
        CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_AMOUNT_INVALID,
        "This payment amount is no longer valid. Refresh and try again.",
        409,
        {
          underlyingKind: "payment_initiation_domain_rejection",
          underlyingCode: error.code,
        }
      );
    }
    if (
      error.code === PAYMENT_ERROR_CODES.OBLIGATION_NOT_ELIGIBLE ||
      error.code === PAYMENT_ERROR_CODES.OBLIGATION_NOT_FOUND
    ) {
      throw new CustomerCommerceError(
        CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_ALREADY_SETTLED,
        "This payment is not available.",
        409,
        {
          underlyingKind:
            error.code === PAYMENT_ERROR_CODES.OBLIGATION_NOT_FOUND
              ? "obligation_not_found"
              : "obligation_already_paid_or_ineligible",
          underlyingCode: error.code,
        }
      );
    }
    if (error.code === PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT) {
      throw new CustomerCommerceError(
        CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_FAILED,
        "This payment reference was already used for a different request.",
        409,
        {
          underlyingKind: "idempotency_conflict",
          underlyingCode: error.code,
        }
      );
    }
    if (error.code === PAYMENT_ERROR_CODES.PAYMENT_CHANNEL_UNAVAILABLE) {
      throw new CustomerCommerceError(
        CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_METHOD_UNAVAILABLE,
        "No payment method is available for this store.",
        503,
        {
          underlyingKind: "provider_or_payment_method_failure",
          underlyingCode: error.code,
        }
      );
    }
    throw new CustomerCommerceError(
      CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_FAILED,
      error.message || "The payment could not be completed. Please try again.",
      error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 400,
      {
        underlyingKind: "payment_initiation_domain_rejection",
        underlyingCode: error.code,
      }
    );
  }
  const classified = classifyUnknownPaymentError(error);
  throw new CustomerCommerceError(
    CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_FAILED,
    "The payment could not be completed. Please try again.",
    400,
    classified
  );
}

/**
 * Canonical BP-007 payment summary for an already-authorized order.
 * Channel adapters must authorize the order before calling this.
 */
export async function loadCanonicalPaymentForAuthorizedOrder(input: {
  businessId: string;
  orderId: string;
  orderReference: string;
  expectedAmount: string;
  currencyCode: string;
}): Promise<CustomerSafeOrderPaymentView> {
  const obligations = createPaymentObligationRepository();
  const obligation = await obligations.findByOrderInstruction(
    input.businessId,
    input.orderId,
    PAYMENT_FINANCIAL_INSTRUCTION_TYPES.SALE
  );

  if (!obligation) {
    return toCustomerSafeOrderPaymentView({
      orderReference: input.orderReference,
      paymentReference: null,
      paymentStatusCode: "UNKNOWN",
      amountDue: input.expectedAmount,
      amountPaid: "0",
      outstandingAmount: input.expectedAmount,
      currencyCode: input.currencyCode,
      receiptAvailable: false,
    });
  }

  const transactions = createPaymentTransactionRepository();
  const txs = await transactions.listByObligation(
    input.businessId,
    obligation.id
  );
  const latest = txs[0] ?? null;

  const receipts = createPaymentReceiptRepository();
  const receiptRows = await receipts.listByObligation(
    input.businessId,
    obligation.id
  );

  const paymentStatusCode =
    latest?.status ?? obligation.paymentStatus ?? "UNKNOWN";
  const receiptAvailable =
    receiptRows.length > 0 || isSuccessfulPaymentStatus(paymentStatusCode);

  return toCustomerSafeOrderPaymentView({
    orderReference: input.orderReference,
    paymentReference: latest?.transactionNumber ?? null,
    paymentStatusCode,
    amountDue: obligation.amountDue,
    amountPaid: obligation.paidAmount,
    outstandingAmount: obligation.outstandingAmount,
    currencyCode: obligation.currencyCode,
    receiptAvailable,
  });
}

export class CustomerWebPaymentAdapter {
  async getPaymentStatusForOrder(
    store: CustomerWebStoreContext,
    orderReference: string
  ): Promise<CustomerSafeOrderPaymentView> {
    const response = await invokeCustomerWebCapability(
      "VIEW_PAYMENT_STATUS",
      store,
      async (execution) => {
        const domainContext = buildCustomerDomainContext(
          execution.customerTenant,
          execution.identity
        );
        assertDomainTenantMatches(
          domainContext,
          store.customerTenant
        );

        const orderContext = await resolveCustomerOrderContext(
          store,
          orderReference
        );

        return loadCanonicalPaymentForAuthorizedOrder({
          businessId: orderContext.businessId,
          orderId: orderContext.orderId,
          orderReference: orderContext.orderReference,
          expectedAmount: orderContext.order.expectedAmount,
          currencyCode: orderContext.order.currencyCode,
        });
      }
    );

    return response.data;
  }

  /**
   * SL-CUS-005 — Standalone INITIATE_PAYMENT against an existing obligation.
   * Re-reads authoritative outstanding immediately before initiation (stale-safe).
   */
  async initiatePaymentForOrder(
    store: CustomerWebStoreContext,
    input: {
      orderReference: string;
      /** Omit or empty → pay full current outstanding. */
      amount?: string | null;
      clientPaymentKey: string;
      paymentMethodId?: string | null;
    }
  ): Promise<CustomerSafePaymentInitiationResult> {
    const response = await invokeCustomerWebCapability(
      "INITIATE_PAYMENT",
      store,
      async (execution) => {
        try {
          const domainContext = buildCustomerDomainContext(
            execution.customerTenant,
            execution.identity
          );
          assertDomainTenantMatches(domainContext, store.customerTenant);

          const paymentContext =
            await resolveCustomerPaymentObligationContext(
              store,
              input.orderReference
            );

          /** Fresh read after authorization — never use page-load balances. */
          const obligations = createPaymentObligationRepository();
          const fresh = await obligations.findById(
            paymentContext.order.businessId,
            paymentContext.obligation.id
          );
          if (!fresh) {
            throw new CustomerCommerceError(
              CUSTOMER_COMMERCE_ERROR_CODES.OBLIGATION_NOT_AVAILABLE,
              "This payment is not available.",
              403
            );
          }

          if (
            !isPositivePaymentAmount(fresh.outstandingAmount) ||
            comparePaymentAmount(fresh.outstandingAmount, "0") <= 0
          ) {
            throw new CustomerCommerceError(
              CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_ALREADY_SETTLED,
              "This order is already fully paid.",
              409
            );
          }

          const requestedRaw = input.amount?.trim()
            ? normalizeCustomerPaymentAmount(input.amount)
            : fresh.outstandingAmount;

          if (!isPositivePaymentAmount(requestedRaw)) {
            throw new CustomerCommerceError(
              CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_AMOUNT_INVALID,
              "Payment amount must be greater than zero.",
              400
            );
          }

          if (comparePaymentAmount(requestedRaw, fresh.outstandingAmount) > 0) {
            throw new CustomerCommerceError(
              CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_AMOUNT_INVALID,
              "Payment amount cannot exceed the outstanding balance. Refresh and try again.",
              409
            );
          }

          const initiation = createPaymentInitiationService();
          const detail = await initiation.getObligationDetail(
            domainContext,
            fresh.id
          );
          const manualOption =
            detail.eligibleOptions.find(
              (option) => !option.requiresElectronicRail
            ) ?? detail.eligibleOptions[0];

          if (!manualOption) {
            throw new CustomerCommerceError(
              CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_METHOD_UNAVAILABLE,
              "No payment method is available for this store.",
              503
            );
          }

          const methodId = input.paymentMethodId ?? manualOption.methodId;
          const idempotency = buildCustomerPaymentIdempotencyKey({
            businessId: domainContext.businessId,
            guestSessionId: execution.sessionId,
            clientKey: input.clientPaymentKey,
          });

          const existingByKey =
            await createPaymentTransactionRepository().findByIdempotencyKey(
              domainContext.businessId,
              idempotency.key
            );
          if (
            existingByKey &&
            comparePaymentAmount(existingByKey.amount, requestedRaw) !== 0
          ) {
            throw new CustomerCommerceError(
              CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_FAILED,
              "This payment reference was already used for a different request.",
              409
            );
          }

          const paymentResult = await initiation.initiatePayment(
            domainContext,
            {
              obligationId: fresh.id,
              methodId,
              amount: requestedRaw,
              currency: fresh.currencyCode,
              idempotencyKey: idempotency.key,
              confirmManual: !manualOption.requiresElectronicRail,
            }
          );

          const after = await obligations.findById(
            paymentContext.order.businessId,
            fresh.id
          );
          const receipts = createPaymentReceiptRepository();
          const receiptRows = after
            ? await receipts.listByObligation(
                paymentContext.order.businessId,
                after.id
              )
            : [];

          const paymentStatusCode = paymentResult.transaction.status;
          const receiptAvailable =
            receiptRows.length > 0 ||
            isSuccessfulPaymentStatus(paymentStatusCode);

          return toCustomerSafePaymentInitiationResult({
            orderReference: paymentContext.order.orderReference,
            paymentReference: paymentResult.transaction.transactionNumber,
            paymentStatusCode,
            requestedAmount: requestedRaw,
            amountDue: after?.amountDue ?? fresh.amountDue,
            amountPaid: after?.paidAmount ?? paymentResult.obligation.paidAmount,
            outstandingAmount:
              after?.outstandingAmount ??
              paymentResult.obligation.outstandingAmount,
            currencyCode: fresh.currencyCode,
            receiptAvailable,
          });
        } catch (error) {
          mapPaymentDomainError(error);
        }
      },
      {
        payload: {
          idempotencyKey: input.clientPaymentKey,
          orderReference: input.orderReference,
        },
      }
    );

    return response.data;
  }
}

export function createCustomerWebPaymentAdapter(): CustomerWebPaymentAdapter {
  return new CustomerWebPaymentAdapter();
}

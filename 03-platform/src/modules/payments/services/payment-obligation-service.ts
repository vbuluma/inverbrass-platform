/**
 * Purpose:
 * BP-007 IP-01 orchestration — create payment obligations from the
 * BP-006 payment-ready contract and resolve eligible catalogue options.
 * Does not initiate, refund, split, invoice, or receipt payments.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  createCatalogueCapabilityPaymentEngine,
  type PaymentEnginePort,
} from "@/core/payment-engine";
import { createBusinessPaymentEnablementAdapter } from "@/modules/payments/adapters/business-payment-enablement-adapter";
import { createCurrencyCatalogueAdapter } from "@/modules/payments/adapters/currency-catalogue-adapter";
import { createSalesPaymentReadyContractAdapter } from "@/modules/payments/adapters/payment-ready-contract-adapter";
import {
  PAYMENT_AUDIT_ACTIONS,
  PAYMENT_IDEMPOTENCY_OPERATIONS,
  PAYMENT_IP01_STATUS,
  PAYMENT_OBLIGATION_NUMBER_PREFIX,
  PAYMENT_STATUS_LABELS,
} from "@/modules/payments/constants";
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_USER_MESSAGES,
  PaymentObligationError,
} from "@/modules/payments/errors";
import type {
  CurrencyReferencePort,
  PaymentAuditPort,
  PaymentCatalogueRepositoryPort,
  PaymentEnablementPort,
  PaymentIdempotencyRepositoryPort,
  PaymentObligationRepositoryPort,
  PaymentReadyContractPort,
} from "@/modules/payments/ports";
import {
  createPaymentCapabilityStoreAdapter,
  createPaymentCatalogueRepository,
} from "@/modules/payments/repositories/payment-catalogue-repository";
import { createPaymentIdempotencyRepository } from "@/modules/payments/repositories/payment-idempotency-repository";
import { createPaymentObligationRepository } from "@/modules/payments/repositories/payment-obligation-repository";
import { buildCatalogueCandidates } from "@/modules/payments/services/payment-catalogue-rules";
import { createPaymentAuditAdapter } from "@/modules/payments/services/payment-obligation-audit-helper";
import {
  assertTrustedPaymentReadyContract,
  copiedAmountDueFromContract,
  copiedCurrencyFromContract,
  lineBreakdownForProvenance,
  paymentReadyContractRef,
} from "@/modules/payments/services/payment-obligation-rules";
import type {
  CreatePaymentObligationInput,
  PaymentDashboardView,
  PaymentObligationDetailView,
  PaymentObligationRecord,
  PaymentObligationView,
  PaymentOptionView,
} from "@/modules/payments/types";

export type PaymentObligationServiceDependencies = {
  contracts: PaymentReadyContractPort;
  obligations: PaymentObligationRepositoryPort;
  idempotency: PaymentIdempotencyRepositoryPort;
  catalogues: PaymentCatalogueRepositoryPort;
  engine: PaymentEnginePort;
  enablement: PaymentEnablementPort;
  currencies: CurrencyReferencePort;
  audit: PaymentAuditPort;
};

function toView(row: PaymentObligationRecord): PaymentObligationView {
  return {
    id: row.id,
    obligationNumber: row.obligationNumber,
    businessId: row.businessId,
    salesOrderId: row.salesOrderId,
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    currencyCode: row.currencyCode,
    amountDue: row.amountDue,
    paidAmount: row.paidAmount,
    outstandingAmount: row.outstandingAmount,
    paymentStatus: row.paymentStatus,
    paymentStatusLabel: PAYMENT_STATUS_LABELS[row.paymentStatus] ?? row.paymentStatus,
    financialInstructionType: row.financialInstructionType,
    commercialContractId: row.commercialContractId,
    snapshotId: row.snapshotId,
    providerTransactionReference: row.providerTransactionReference,
    createdAt: row.createdAt.toISOString(),
  };
}

export class PaymentObligationService {
  constructor(private readonly deps: PaymentObligationServiceDependencies) {}

  async createObligation(
    context: CurrentBusinessContext,
    input: CreatePaymentObligationInput
  ): Promise<PaymentObligationDetailView> {
    this.assertContext(context);
    const orderId = input.orderId?.trim();
    if (!orderId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVALID_INPUT,
        PAYMENT_USER_MESSAGES.INVALID_INPUT,
        400,
        { field: "orderId", entity: "payment" }
      );
    }

    try {
      const fetched = await this.deps.contracts.getByOrderId(context, orderId);
      const contract = assertTrustedPaymentReadyContract({
        contextBusinessId: context.businessId,
        trusted: fetched,
        claimed: input.claimedContract,
      });
      const amountDue = copiedAmountDueFromContract(contract);
      const currencyCode = copiedCurrencyFromContract(contract);
      const currencyKnown = await this.deps.currencies.isActiveCode(currencyCode);
      if (!currencyKnown) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.CURRENCY_UNSUPPORTED,
          PAYMENT_USER_MESSAGES.CURRENCY_UNSUPPORTED,
          409,
          { field: "currency", entity: "payment" }
        );
      }

      const idempotencyKey = (
        input.idempotencyKey?.trim() ||
        `${PAYMENT_IDEMPOTENCY_OPERATIONS.CREATE_OBLIGATION}:${contract.orderId}:${contract.financialInstructionType}`
      ).slice(0, 180);

      const existingByKey = await this.deps.obligations.findByIdempotencyKey(
        context.businessId,
        idempotencyKey
      );
      if (existingByKey) {
        return this.toDetail(context, existingByKey);
      }

      const existingByOrder = await this.deps.obligations.findByOrderInstruction(
        context.businessId,
        contract.orderId,
        contract.financialInstructionType
      );
      if (existingByOrder) {
        return this.toDetail(context, existingByOrder);
      }

      const obligationNumber = await this.generateObligationNumber(context.businessId);
      const created = await this.deps.obligations.insert({
        businessId: context.businessId,
        obligationNumber,
        salesOrderId: contract.orderId,
        orderNumber: contract.orderNumber,
        customerId: contract.customerId,
        currencyCode,
        amountDue,
        paidAmount: "0",
        outstandingAmount: amountDue,
        paymentStatus: PAYMENT_IP01_STATUS,
        financialInstructionType: contract.financialInstructionType,
        commercialContractId: contract.commercialContractId as string,
        snapshotId: contract.snapshotId as string,
        paymentReadyContractRef: paymentReadyContractRef(contract),
        lineBreakdown: lineBreakdownForProvenance(contract),
        paymentReadyContractPayload: contract,
        providerTransactionReference: null,
        idempotencyKey,
        metadata: null,
        createdBy: context.platformUserId,
        updatedBy: context.platformUserId,
      });

      await this.deps.idempotency.insert({
        businessId: context.businessId,
        idempotencyKey,
        operationType: PAYMENT_IDEMPOTENCY_OPERATIONS.CREATE_OBLIGATION,
        resourceType: "payment_obligation",
        resourceId: created.id,
        createdBy: context.platformUserId,
      });

      await this.deps.audit.record({
        businessId: context.businessId,
        actorUserId: context.platformUserId,
        obligationId: created.id,
        operation: PAYMENT_AUDIT_ACTIONS.OBLIGATION_CREATED,
        action: PAYMENT_AUDIT_ACTIONS.OBLIGATION_CREATED,
        outcome: "SUCCESS",
        references: {
          orderId: created.salesOrderId,
          orderNumber: created.orderNumber,
          amountDue: created.amountDue,
          currencyCode: created.currencyCode,
        },
      });

      return this.toDetail(context, created);
    } catch (error) {
      await this.recordFailure(context, orderId, error);
      throw error;
    }
  }

  async getObligation(
    context: CurrentBusinessContext,
    obligationId: string
  ): Promise<PaymentObligationDetailView> {
    this.assertContext(context);
    const row = await this.deps.obligations.findById(context.businessId, obligationId);
    if (!row) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.OBLIGATION_NOT_FOUND,
        PAYMENT_USER_MESSAGES.OBLIGATION_NOT_FOUND,
        404,
        { entity: "payment" }
      );
    }
    return this.toDetail(context, row);
  }

  async getDashboard(context: CurrentBusinessContext): Promise<PaymentDashboardView> {
    this.assertContext(context);
    const rows = await this.deps.obligations.listByBusiness(context.businessId);
    return {
      obligationCount: rows.length,
      notStartedCount: rows.filter((row) => row.paymentStatus === PAYMENT_IP01_STATUS)
        .length,
      recentObligations: rows.slice(0, 50).map(toView),
    };
  }

  async listEligibleOptions(
    context: CurrentBusinessContext,
    input: { amount: string; currency: string; methodCode?: string | null }
  ): Promise<PaymentOptionView[]> {
    this.assertContext(context);
    const snapshot = await this.deps.catalogues.loadSnapshot();
    const flags = await this.deps.enablement.getFlags(context.businessId);
    const candidates = buildCatalogueCandidates(snapshot, flags);
    const eligible = await this.deps.engine.getEligibleChannels(
      {
        businessId: context.businessId,
        methodCode: input.methodCode,
        amount: input.amount,
        currency: input.currency,
      },
      candidates
    );
    return eligible.map((option) => ({
      methodId: option.methodId,
      methodCode: option.methodCode,
      label: option.customerLabel,
      requiresElectronicRail: option.requiresRail,
      railId: option.railId,
      providerId: option.providerId,
      channelId: option.channelId,
      minAmount: option.limits?.minAmount ?? null,
      maxAmount: option.limits?.maxAmount ?? null,
    }));
  }

  private async toDetail(
    context: CurrentBusinessContext,
    row: PaymentObligationRecord
  ): Promise<PaymentObligationDetailView> {
    const eligibleOptions = await this.listEligibleOptions(context, {
      amount: row.outstandingAmount,
      currency: row.currencyCode,
    });
    return {
      ...toView(row),
      eligibleOptions,
      recentTransactions: [],
      allocations: [],
      unallocatedTotal: "0",
    };
  }

  private async generateObligationNumber(businessId: string): Promise<string> {
    const count = await this.deps.obligations.countAll(businessId);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = `${PAYMENT_OBLIGATION_NUMBER_PREFIX}-${String(count + 1 + attempt).padStart(6, "0")}`;
      const existing = await this.deps.obligations.findByObligationNumber(
        businessId,
        candidate
      );
      if (!existing) {
        return candidate;
      }
    }
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.PROVIDER_ERROR,
      PAYMENT_USER_MESSAGES.PROVIDER_ERROR,
      500
    );
  }

  private assertContext(context: CurrentBusinessContext): void {
    if (!context?.businessId?.trim()) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.BUSINESS_CONTEXT_REQUIRED,
        PAYMENT_USER_MESSAGES.BUSINESS_CONTEXT_REQUIRED,
        403
      );
    }
  }

  private async recordFailure(
    context: CurrentBusinessContext,
    orderId: string,
    error: unknown
  ): Promise<void> {
    if (!(error instanceof PaymentObligationError)) {
      return;
    }
    try {
      await this.deps.audit.record({
        businessId: context.businessId,
        actorUserId: context.platformUserId,
        obligationId: null,
        operation: PAYMENT_AUDIT_ACTIONS.OBLIGATION_CREATE_FAILED,
        action: PAYMENT_AUDIT_ACTIONS.OBLIGATION_CREATE_FAILED,
        outcome: "FAILURE",
        references: {
          orderId,
          code: error.code,
        },
      });
    } catch {
      // Audit must not mask the original fail-closed error.
    }
  }
}

export function createDefaultPaymentObligationDependencies(): PaymentObligationServiceDependencies {
  const catalogues = createPaymentCatalogueRepository();
  return {
    contracts: createSalesPaymentReadyContractAdapter(),
    obligations: createPaymentObligationRepository(),
    idempotency: createPaymentIdempotencyRepository(),
    catalogues,
    engine: createCatalogueCapabilityPaymentEngine(
      createPaymentCapabilityStoreAdapter(catalogues)
    ),
    enablement: createBusinessPaymentEnablementAdapter(),
    currencies: createCurrencyCatalogueAdapter(),
    audit: createPaymentAuditAdapter(),
  };
}

export function createPaymentObligationService(
  deps?: PaymentObligationServiceDependencies
) {
  return new PaymentObligationService(
    deps ?? createDefaultPaymentObligationDependencies()
  );
}

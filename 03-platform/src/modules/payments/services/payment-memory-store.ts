/**
 * Purpose:
 * In-memory payment catalogues, obligations, and idempotency for IP-01 tests.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import type { PaymentCapabilityRecord } from "@/core/payment-engine/types";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type {
  PaymentAllocationRepositoryPort,
  PaymentCatalogueRepositoryPort,
  PaymentCatalogueSnapshot,
  PaymentIdempotencyRepositoryPort,
  PaymentInvoiceRepositoryPort,
  InvoicePaymentTermPort,
  PaymentObligationRepositoryPort,
  PaymentReceiptRepositoryPort,
  PaymentRefundRepositoryPort,
  PaymentSettlementRepositoryPort,
  PaymentExceptionRepositoryPort,
  PaymentTransactionRepositoryPort,
} from "@/modules/payments/ports";
import type {
  InvoiceAdjustmentRecord,
  InvoicePaymentTermRecord,
  PaymentAllocationInsert,
  PaymentAllocationRecord,
  PaymentCapabilityRecordView,
  PaymentChannelRecord,
  PaymentIdempotencyRecord,
  PaymentInvoiceInsert,
  PaymentInvoiceRecord,
  PaymentMethodRecord,
  PaymentNetworkRecord,
  PaymentObligationInsert,
  PaymentObligationRecord,
  PaymentProviderRecord,
  PaymentReceiptDeliveryRecord,
  PaymentReceiptInsert,
  PaymentReceiptRecord,
  PaymentRefundInsert,
  PaymentRefundPatch,
  PaymentRefundRecord,
  PaymentSettlementInsert,
  PaymentSettlementPatch,
  PaymentSettlementRecord,
  PaymentExceptionInsert,
  PaymentExceptionPatch,
  PaymentExceptionRecord,
  PaymentTransactionInsert,
  PaymentTransactionPatch,
  PaymentTransactionRecord,
} from "@/modules/payments/types";

function now() {
  return new Date();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryPaymentStore
  implements PaymentObligationRepositoryPort, PaymentCatalogueRepositoryPort
{
  readonly obligations = new Map<string, PaymentObligationRecord>();
  readonly transactions = new Map<string, PaymentTransactionRecord>();
  readonly allocations = new Map<string, PaymentAllocationRecord>();
  readonly invoices = new Map<string, PaymentInvoiceRecord>();
  readonly invoiceAdjustments = new Map<string, InvoiceAdjustmentRecord>();
  readonly receipts = new Map<string, PaymentReceiptRecord>();
  readonly receiptDeliveries = new Map<string, PaymentReceiptDeliveryRecord>();
  readonly refunds = new Map<string, PaymentRefundRecord>();
  readonly settlements = new Map<string, PaymentSettlementRecord>();
  readonly paymentExceptions = new Map<string, PaymentExceptionRecord>();
  readonly idempotency = new Map<string, PaymentIdempotencyRecord>();
  paymentTerms: InvoicePaymentTermRecord[] = defaultInvoicePaymentTerms();
  snapshot: PaymentCatalogueSnapshot = {
    methods: [],
    networks: [],
    providers: [],
    channels: [],
    capabilities: [],
  };

  readonly idempotencyPort: PaymentIdempotencyRepositoryPort = {
    insert: (values) => this.insertIdempotency(values),
    find: (businessId, operationType, idempotencyKey) =>
      this.findIdempotency(businessId, operationType, idempotencyKey),
  };

  readonly transactionPort: PaymentTransactionRepositoryPort = {
    insert: (values) => this.insertTransaction(values),
    update: (businessId, transactionId, patch) =>
      this.updateTransaction(businessId, transactionId, patch),
    findById: (businessId, transactionId) =>
      this.findTransactionById(businessId, transactionId),
    findByIdempotencyKey: (businessId, idempotencyKey) =>
      this.findTransactionByIdempotencyKey(businessId, idempotencyKey),
    findByProviderReference: (businessId, providerTransactionReference) =>
      this.findTransactionByProviderReference(businessId, providerTransactionReference),
    findByTransactionNumber: (businessId, transactionNumber) =>
      this.findTransactionByNumber(businessId, transactionNumber),
    listByObligation: (businessId, obligationId) =>
      this.listTransactionsByObligation(businessId, obligationId),
    countAll: (businessId) => this.countTransactions(businessId),
  };

  readonly allocationPort: PaymentAllocationRepositoryPort = {
    insert: (values) => this.insertAllocation(values),
    update: (businessId, allocationId, patch) =>
      this.updateAllocation(businessId, allocationId, patch),
    findById: (businessId, allocationId) =>
      this.findAllocationById(businessId, allocationId),
    findByIdempotencyKey: (businessId, idempotencyKey) =>
      this.findAllocationByIdempotencyKey(businessId, idempotencyKey),
    findByAllocationNumber: (businessId, allocationNumber) =>
      this.findAllocationByNumber(businessId, allocationNumber),
    listByObligation: (businessId, obligationId) =>
      this.listAllocationsByObligation(businessId, obligationId),
    listByTransaction: (businessId, paymentTransactionId) =>
      this.listAllocationsByTransaction(businessId, paymentTransactionId),
    listByBusiness: (businessId) => this.listAllocationsByBusiness(businessId),
    countAll: (businessId) => this.countAllocations(businessId),
  };

  readonly invoicePort: PaymentInvoiceRepositoryPort = {
    insert: (values) => this.insertInvoice(values),
    update: (businessId, invoiceId, patch) =>
      this.updateInvoice(businessId, invoiceId, patch),
    findById: (businessId, invoiceId) => this.findInvoiceById(businessId, invoiceId),
    findByIdempotencyKey: (businessId, idempotencyKey) =>
      this.findInvoiceByIdempotencyKey(businessId, idempotencyKey),
    findActiveByObligation: (businessId, obligationId) =>
      this.findActiveInvoiceByObligation(businessId, obligationId),
    listByBusiness: (businessId) => this.listInvoicesByBusiness(businessId),
    listByObligation: (businessId, obligationId) =>
      this.listInvoicesByObligation(businessId, obligationId),
    countAll: (businessId) => this.countInvoices(businessId),
    insertAdjustment: (values) => this.insertInvoiceAdjustment(values),
    listAdjustments: (businessId, invoiceId) =>
      this.listInvoiceAdjustments(businessId, invoiceId),
  };

  readonly termPort: InvoicePaymentTermPort = {
    listActive: async () => this.paymentTerms.filter((row) => row.isActive),
    findByCode: async (code) =>
      this.paymentTerms.find((row) => row.code === code) ?? null,
  };

  readonly receiptPort: PaymentReceiptRepositoryPort = {
    insert: (values) => this.insertReceipt(values),
    updateDelivery: (businessId, receiptId, patch) =>
      this.updateReceiptDelivery(businessId, receiptId, patch),
    findById: (businessId, receiptId) => this.findReceiptById(businessId, receiptId),
    findByTransaction: (businessId, paymentTransactionId) =>
      this.findReceiptByTransaction(businessId, paymentTransactionId),
    findByIdempotencyKey: (businessId, idempotencyKey) =>
      this.findReceiptByIdempotencyKey(businessId, idempotencyKey),
    listByBusiness: (businessId) => this.listReceiptsByBusiness(businessId),
    listByObligation: (businessId, obligationId) =>
      this.listReceiptsByObligation(businessId, obligationId),
    insertDelivery: (values) => this.insertReceiptDelivery(values),
    listDeliveries: (businessId, receiptId) =>
      this.listReceiptDeliveries(businessId, receiptId),
  };

  readonly refundPort: PaymentRefundRepositoryPort = {
    insert: (values) => this.insertRefund(values),
    update: (businessId, refundId, patch) =>
      this.updateRefund(businessId, refundId, patch),
    findById: (businessId, refundId) => this.findRefundById(businessId, refundId),
    findByIdempotencyKey: (businessId, idempotencyKey) =>
      this.findRefundByIdempotencyKey(businessId, idempotencyKey),
    listByTransaction: (businessId, originalPaymentTransactionId) =>
      this.listRefundsByTransaction(businessId, originalPaymentTransactionId),
    listByObligation: (businessId, obligationId) =>
      this.listRefundsByObligation(businessId, obligationId),
    listByBusiness: (businessId) => this.listRefundsByBusiness(businessId),
  };

  readonly settlementPort: PaymentSettlementRepositoryPort = {
    insert: (values) => this.insertSettlement(values),
    update: (businessId, settlementId, patch) =>
      this.updateSettlement(businessId, settlementId, patch),
    findById: (businessId, settlementId) => this.findSettlementById(businessId, settlementId),
    findByTransaction: (businessId, paymentTransactionId) =>
      this.findSettlementByTransaction(businessId, paymentTransactionId),
    findByIdempotencyKey: (businessId, idempotencyKey) =>
      this.findSettlementByIdempotencyKey(businessId, idempotencyKey),
    findBySettlementReference: (businessId, settlementReference) =>
      this.findSettlementByReference(businessId, settlementReference),
  };

  readonly exceptionPort: PaymentExceptionRepositoryPort = {
    insert: (values) => this.insertException(values),
    update: (businessId, exceptionId, patch) =>
      this.updateException(businessId, exceptionId, patch),
    findById: (businessId, exceptionId) => this.findExceptionById(businessId, exceptionId),
    findByIdempotencyKey: (businessId, idempotencyKey) =>
      this.findExceptionByIdempotencyKey(businessId, idempotencyKey),
    findOpenByTransactionAndType: (businessId, paymentTransactionId, exceptionType) =>
      this.findOpenExceptionByType(businessId, paymentTransactionId, exceptionType),
    listByTransaction: (businessId, paymentTransactionId) =>
      this.listExceptionsByTransaction(businessId, paymentTransactionId),
    listByObligation: (businessId, obligationId) =>
      this.listExceptionsByObligation(businessId, obligationId),
    listByBusiness: (businessId) => this.listExceptionsByBusiness(businessId),
  };

  seedCatalogue(snapshot: PaymentCatalogueSnapshot) {
    this.snapshot = clone(snapshot);
  }

  async loadSnapshot(): Promise<PaymentCatalogueSnapshot> {
    return clone(this.snapshot);
  }

  capabilityRecords(): PaymentCapabilityRecord[] {
    return this.snapshot.capabilities.map((row) => ({
      providerId: row.paymentProviderId,
      channelId: row.paymentChannelId,
      minAmount: row.minAmount,
      maxAmount: row.maxAmount,
      dailyLimit: row.dailyLimit,
      transactionLimit: row.transactionLimit,
      supportedCurrencies: row.supportedCurrencies,
      supportsInitiation: row.supportsInitiation,
      supportsRefund: row.supportsRefund,
      supportsStatusQuery: row.supportsStatusQuery,
      isAvailable: row.isAvailable,
    }));
  }

  async insert(values: PaymentObligationInsert): Promise<PaymentObligationRecord> {
    const duplicateKey = [...this.obligations.values()].find(
      (row) =>
        row.businessId === values.businessId &&
        row.idempotencyKey === values.idempotencyKey
    );
    if (duplicateKey) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        undefined,
        409
      );
    }
    const duplicateInstruction = [...this.obligations.values()].find(
      (row) =>
        row.businessId === values.businessId &&
        row.salesOrderId === values.salesOrderId &&
        row.financialInstructionType === values.financialInstructionType
    );
    if (duplicateInstruction) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        undefined,
        409
      );
    }
    const timestamp = now();
    const row: PaymentObligationRecord = {
      ...values,
      id: values.id ?? crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.obligations.set(row.id, row);
    return clone(row);
  }

  async findById(businessId: string, obligationId: string) {
    const row = this.obligations.get(obligationId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const row = [...this.obligations.values()].find(
      (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
    );
    return row ? clone(row) : null;
  }

  async findByOrderInstruction(
    businessId: string,
    salesOrderId: string,
    financialInstructionType: string
  ) {
    const row = [...this.obligations.values()].find(
      (item) =>
        item.businessId === businessId &&
        item.salesOrderId === salesOrderId &&
        item.financialInstructionType === financialInstructionType
    );
    return row ? clone(row) : null;
  }

  async findByObligationNumber(businessId: string, obligationNumber: string) {
    const row = [...this.obligations.values()].find(
      (item) =>
        item.businessId === businessId && item.obligationNumber === obligationNumber
    );
    return row ? clone(row) : null;
  }

  async listByBusiness(businessId: string) {
    return [...this.obligations.values()]
      .filter((row) => row.businessId === businessId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async countAll(businessId: string) {
    return [...this.obligations.values()].filter((row) => row.businessId === businessId)
      .length;
  }

  async update(
    businessId: string,
    obligationId: string,
    patch: Partial<
      Pick<
        PaymentObligationRecord,
        | "paidAmount"
        | "outstandingAmount"
        | "paymentStatus"
        | "providerTransactionReference"
        | "updatedBy"
        | "metadata"
      >
    >
  ): Promise<PaymentObligationRecord> {
    const row = this.obligations.get(obligationId);
    if (!row || row.businessId !== businessId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.OBLIGATION_NOT_FOUND,
        undefined,
        404
      );
    }
    const next: PaymentObligationRecord = {
      ...row,
      ...patch,
      updatedAt: now(),
    };
    this.obligations.set(row.id, next);
    return clone(next);
  }

  async insertTransaction(values: PaymentTransactionInsert): Promise<PaymentTransactionRecord> {
    const duplicateKey = [...this.transactions.values()].find(
      (row) =>
        row.businessId === values.businessId && row.idempotencyKey === values.idempotencyKey
    );
    if (duplicateKey) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PAYMENT_DUPLICATE,
        undefined,
        409
      );
    }
    const timestamp = now();
    const row: PaymentTransactionRecord = {
      ...values,
      id: values.id ?? crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.transactions.set(row.id, row);
    return clone(row);
  }

  async updateTransaction(
    businessId: string,
    transactionId: string,
    patch: PaymentTransactionPatch
  ): Promise<PaymentTransactionRecord> {
    const row = this.transactions.get(transactionId);
    if (!row || row.businessId !== businessId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND,
        undefined,
        404
      );
    }
    const next: PaymentTransactionRecord = {
      ...row,
      ...patch,
      updatedAt: now(),
    };
    this.transactions.set(row.id, next);
    return clone(next);
  }

  async findTransactionById(businessId: string, transactionId: string) {
    const row = this.transactions.get(transactionId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async findTransactionByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const row = [...this.transactions.values()].find(
      (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
    );
    return row ? clone(row) : null;
  }

  async findTransactionByProviderReference(
    businessId: string,
    providerTransactionReference: string
  ) {
    const row = [...this.transactions.values()].find(
      (item) =>
        item.businessId === businessId &&
        item.providerTransactionReference === providerTransactionReference
    );
    return row ? clone(row) : null;
  }

  async findTransactionByNumber(businessId: string, transactionNumber: string) {
    const row = [...this.transactions.values()].find(
      (item) =>
        item.businessId === businessId && item.transactionNumber === transactionNumber
    );
    return row ? clone(row) : null;
  }

  async listTransactionsByObligation(businessId: string, obligationId: string) {
    return [...this.transactions.values()]
      .filter((row) => row.businessId === businessId && row.obligationId === obligationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async countTransactions(businessId: string) {
    return [...this.transactions.values()].filter((row) => row.businessId === businessId)
      .length;
  }

  async insertIdempotency(values: {
    id?: string;
    businessId: string;
    idempotencyKey: string;
    operationType: string;
    resourceType: string;
    resourceId: string;
    createdBy: string | null;
  }): Promise<PaymentIdempotencyRecord> {
    const key = `${values.businessId}:${values.operationType}:${values.idempotencyKey}`;
    if (this.idempotency.has(key)) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        undefined,
        409
      );
    }
    const row: PaymentIdempotencyRecord = {
      id: values.id ?? crypto.randomUUID(),
      businessId: values.businessId,
      idempotencyKey: values.idempotencyKey,
      operationType: values.operationType,
      resourceType: values.resourceType,
      resourceId: values.resourceId,
      createdAt: now(),
      createdBy: values.createdBy,
    };
    this.idempotency.set(key, row);
    return clone(row);
  }

  async findIdempotency(
    businessId: string,
    operationType: string,
    idempotencyKey: string
  ): Promise<PaymentIdempotencyRecord | null> {
    const row = this.idempotency.get(
      `${businessId}:${operationType}:${idempotencyKey}`
    );
    return row ? clone(row) : null;
  }

  async insertAllocation(values: PaymentAllocationInsert): Promise<PaymentAllocationRecord> {
    const duplicateKey = [...this.allocations.values()].find(
      (row) =>
        row.businessId === values.businessId && row.idempotencyKey === values.idempotencyKey
    );
    if (duplicateKey) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PAYMENT_DUPLICATE,
        undefined,
        409
      );
    }
    const timestamp = now();
    const row: PaymentAllocationRecord = {
      ...values,
      id: values.id ?? crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.allocations.set(row.id, row);
    return clone(row);
  }

  async updateAllocation(
    businessId: string,
    allocationId: string,
    patch: Partial<Pick<PaymentAllocationRecord, "status" | "reason" | "updatedBy" | "metadata">>
  ): Promise<PaymentAllocationRecord> {
    const row = this.allocations.get(allocationId);
    if (!row || row.businessId !== businessId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.ALLOCATION_NOT_FOUND,
        undefined,
        404
      );
    }
    const next: PaymentAllocationRecord = {
      ...row,
      ...patch,
      updatedAt: now(),
    };
    this.allocations.set(row.id, next);
    return clone(next);
  }

  async findAllocationById(businessId: string, allocationId: string) {
    const row = this.allocations.get(allocationId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async findAllocationByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const row = [...this.allocations.values()].find(
      (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
    );
    return row ? clone(row) : null;
  }

  async findAllocationByNumber(businessId: string, allocationNumber: string) {
    const row = [...this.allocations.values()].find(
      (item) => item.businessId === businessId && item.allocationNumber === allocationNumber
    );
    return row ? clone(row) : null;
  }

  async listAllocationsByObligation(businessId: string, obligationId: string) {
    return [...this.allocations.values()]
      .filter((row) => row.businessId === businessId && row.obligationId === obligationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async listAllocationsByTransaction(businessId: string, paymentTransactionId: string) {
    return [...this.allocations.values()]
      .filter(
        (row) =>
          row.businessId === businessId && row.paymentTransactionId === paymentTransactionId
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async listAllocationsByBusiness(businessId: string) {
    return [...this.allocations.values()]
      .filter((row) => row.businessId === businessId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async countAllocations(businessId: string) {
    return [...this.allocations.values()].filter((row) => row.businessId === businessId)
      .length;
  }

  async insertInvoice(values: PaymentInvoiceInsert): Promise<PaymentInvoiceRecord> {
    const duplicateKey = [...this.invoices.values()].find(
      (row) =>
        row.businessId === values.businessId && row.idempotencyKey === values.idempotencyKey
    );
    if (duplicateKey) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        undefined,
        409
      );
    }
    const timestamp = now();
    const row: PaymentInvoiceRecord = {
      ...values,
      id: values.id ?? crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.invoices.set(row.id, row);
    return clone(row);
  }

  async updateInvoice(
    businessId: string,
    invoiceId: string,
    patch: Partial<PaymentInvoiceRecord>
  ): Promise<PaymentInvoiceRecord> {
    const row = this.invoices.get(invoiceId);
    if (!row || row.businessId !== businessId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVOICE_NOT_FOUND,
        undefined,
        404
      );
    }
    const next: PaymentInvoiceRecord = {
      ...row,
      ...patch,
      updatedAt: now(),
    };
    this.invoices.set(row.id, next);
    return clone(next);
  }

  async findInvoiceById(businessId: string, invoiceId: string) {
    const row = this.invoices.get(invoiceId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async findInvoiceByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const row = [...this.invoices.values()].find(
      (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
    );
    return row ? clone(row) : null;
  }

  async findActiveInvoiceByObligation(businessId: string, obligationId: string) {
    const row = [...this.invoices.values()].find(
      (item) =>
        item.businessId === businessId &&
        item.obligationId === obligationId &&
        item.status !== "CANCELLED" &&
        item.status !== "CREDITED"
    );
    return row ? clone(row) : null;
  }

  async listInvoicesByBusiness(businessId: string) {
    return [...this.invoices.values()]
      .filter((row) => row.businessId === businessId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async listInvoicesByObligation(businessId: string, obligationId: string) {
    return [...this.invoices.values()]
      .filter((row) => row.businessId === businessId && row.obligationId === obligationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async countInvoices(businessId: string) {
    return [...this.invoices.values()].filter((row) => row.businessId === businessId).length;
  }

  async insertInvoiceAdjustment(values: {
    businessId: string;
    invoiceId: string;
    adjustmentType: string;
    status: string;
    amount: string;
    currencyCode: string;
    reason: string;
    handedOffToIp06: string;
    createdBy: string | null;
  }): Promise<InvoiceAdjustmentRecord> {
    const row: InvoiceAdjustmentRecord = {
      ...values,
      id: crypto.randomUUID(),
      createdAt: now(),
    };
    this.invoiceAdjustments.set(row.id, row);
    return clone(row);
  }

  async listInvoiceAdjustments(businessId: string, invoiceId: string) {
    return [...this.invoiceAdjustments.values()]
      .filter((row) => row.businessId === businessId && row.invoiceId === invoiceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async insertReceipt(values: PaymentReceiptInsert): Promise<PaymentReceiptRecord> {
    const duplicateTxn = [...this.receipts.values()].find(
      (row) =>
        row.businessId === values.businessId &&
        row.paymentTransactionId === values.paymentTransactionId
    );
    if (duplicateTxn) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        undefined,
        409
      );
    }
    const duplicateKey = [...this.receipts.values()].find(
      (row) =>
        row.businessId === values.businessId && row.idempotencyKey === values.idempotencyKey
    );
    if (duplicateKey) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        undefined,
        409
      );
    }
    const timestamp = now();
    const row: PaymentReceiptRecord = {
      ...values,
      id: values.id ?? crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.receipts.set(row.id, row);
    return clone(row);
  }

  async updateReceiptDelivery(
    businessId: string,
    receiptId: string,
    patch: Partial<Pick<PaymentReceiptRecord, "deliveryStatus" | "updatedBy" | "metadata">>
  ): Promise<PaymentReceiptRecord> {
    const row = this.receipts.get(receiptId);
    if (!row || row.businessId !== businessId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.RECEIPT_NOT_FOUND,
        undefined,
        404
      );
    }
    const next: PaymentReceiptRecord = {
      ...row,
      ...patch,
      amount: row.amount,
      currencyCode: row.currencyCode,
      receiptNumber: row.receiptNumber,
      paymentTransactionId: row.paymentTransactionId,
      updatedAt: now(),
    };
    this.receipts.set(row.id, next);
    return clone(next);
  }

  async findReceiptById(businessId: string, receiptId: string) {
    const row = this.receipts.get(receiptId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async findReceiptByTransaction(businessId: string, paymentTransactionId: string) {
    const row = [...this.receipts.values()].find(
      (item) =>
        item.businessId === businessId && item.paymentTransactionId === paymentTransactionId
    );
    return row ? clone(row) : null;
  }

  async findReceiptByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const row = [...this.receipts.values()].find(
      (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
    );
    return row ? clone(row) : null;
  }

  async listReceiptsByBusiness(businessId: string) {
    return [...this.receipts.values()]
      .filter((row) => row.businessId === businessId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async listReceiptsByObligation(businessId: string, obligationId: string) {
    return [...this.receipts.values()]
      .filter(
        (row) => row.businessId === businessId && row.paymentObligationId === obligationId
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async insertReceiptDelivery(values: {
    businessId: string;
    receiptId: string;
    channel: string;
    status: string;
    failureReason: string | null;
    createdBy: string | null;
  }): Promise<PaymentReceiptDeliveryRecord> {
    const row: PaymentReceiptDeliveryRecord = {
      ...values,
      id: crypto.randomUUID(),
      requestedAt: now(),
    };
    this.receiptDeliveries.set(row.id, row);
    return clone(row);
  }

  async listReceiptDeliveries(businessId: string, receiptId: string) {
    return [...this.receiptDeliveries.values()]
      .filter((row) => row.businessId === businessId && row.receiptId === receiptId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
      .map((row) => clone(row));
  }

  async insertRefund(values: PaymentRefundInsert): Promise<PaymentRefundRecord> {
    const duplicateKey = [...this.refunds.values()].find(
      (row) =>
        row.businessId === values.businessId && row.idempotencyKey === values.idempotencyKey
    );
    if (duplicateKey) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        undefined,
        409
      );
    }
    const row: PaymentRefundRecord = {
      ...values,
      id: values.id ?? crypto.randomUUID(),
      createdAt: now(),
      updatedAt: now(),
    };
    this.refunds.set(row.id, row);
    return clone(row);
  }

  async updateRefund(
    businessId: string,
    refundId: string,
    patch: PaymentRefundPatch
  ): Promise<PaymentRefundRecord> {
    const row = this.refunds.get(refundId);
    if (!row || row.businessId !== businessId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.REFUND_NOT_FOUND,
        undefined,
        404
      );
    }
    const next: PaymentRefundRecord = {
      ...row,
      ...patch,
      amount: row.amount,
      currencyCode: row.currencyCode,
      refundNumber: row.refundNumber,
      originalPaymentTransactionId: row.originalPaymentTransactionId,
      updatedAt: now(),
    };
    this.refunds.set(row.id, next);
    return clone(next);
  }

  async findRefundById(businessId: string, refundId: string) {
    const row = this.refunds.get(refundId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async findRefundByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const row = [...this.refunds.values()].find(
      (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
    );
    return row ? clone(row) : null;
  }

  async listRefundsByTransaction(businessId: string, originalPaymentTransactionId: string) {
    return [...this.refunds.values()]
      .filter(
        (row) =>
          row.businessId === businessId &&
          row.originalPaymentTransactionId === originalPaymentTransactionId
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async listRefundsByObligation(businessId: string, obligationId: string) {
    return [...this.refunds.values()]
      .filter(
        (row) => row.businessId === businessId && row.paymentObligationId === obligationId
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async listRefundsByBusiness(businessId: string) {
    return [...this.refunds.values()]
      .filter((row) => row.businessId === businessId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async insertSettlement(values: PaymentSettlementInsert): Promise<PaymentSettlementRecord> {
    const duplicateTxn = [...this.settlements.values()].find(
      (row) =>
        row.businessId === values.businessId &&
        row.paymentTransactionId === values.paymentTransactionId
    );
    if (duplicateTxn) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        undefined,
        409
      );
    }
    const duplicateKey = [...this.settlements.values()].find(
      (row) =>
        row.businessId === values.businessId && row.idempotencyKey === values.idempotencyKey
    );
    if (duplicateKey) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        undefined,
        409
      );
    }
    if (values.settlementReference) {
      const duplicateRef = [...this.settlements.values()].find(
        (row) =>
          row.businessId === values.businessId &&
          row.settlementReference === values.settlementReference
      );
      if (duplicateRef) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          undefined,
          409
        );
      }
    }
    const timestamp = now();
    const row: PaymentSettlementRecord = {
      ...values,
      id: values.id ?? crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.settlements.set(row.id, row);
    return clone(row);
  }

  async updateSettlement(
    businessId: string,
    settlementId: string,
    patch: PaymentSettlementPatch
  ): Promise<PaymentSettlementRecord> {
    const row = this.settlements.get(settlementId);
    if (!row || row.businessId !== businessId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.SETTLEMENT_NOT_FOUND,
        undefined,
        404
      );
    }
    if (patch.settlementReference) {
      const duplicateRef = [...this.settlements.values()].find(
        (item) =>
          item.businessId === businessId &&
          item.id !== settlementId &&
          item.settlementReference === patch.settlementReference
      );
      if (duplicateRef) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.SETTLEMENT_CONFLICT,
          undefined,
          409
        );
      }
    }
    const next: PaymentSettlementRecord = {
      ...row,
      ...patch,
      expectedAmount: row.expectedAmount,
      currencyCode: row.currencyCode,
      paymentTransactionId: row.paymentTransactionId,
      paymentObligationId: row.paymentObligationId,
      updatedAt: now(),
    };
    this.settlements.set(row.id, next);
    return clone(next);
  }

  async findSettlementById(businessId: string, settlementId: string) {
    const row = this.settlements.get(settlementId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async findSettlementByTransaction(businessId: string, paymentTransactionId: string) {
    const row = [...this.settlements.values()].find(
      (item) =>
        item.businessId === businessId && item.paymentTransactionId === paymentTransactionId
    );
    return row ? clone(row) : null;
  }

  async findSettlementByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const row = [...this.settlements.values()].find(
      (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
    );
    return row ? clone(row) : null;
  }

  async findSettlementByReference(businessId: string, settlementReference: string) {
    const row = [...this.settlements.values()].find(
      (item) =>
        item.businessId === businessId && item.settlementReference === settlementReference
    );
    return row ? clone(row) : null;
  }

  async insertException(values: PaymentExceptionInsert): Promise<PaymentExceptionRecord> {
    const duplicateKey = [...this.paymentExceptions.values()].find(
      (row) =>
        row.businessId === values.businessId && row.idempotencyKey === values.idempotencyKey
    );
    if (duplicateKey) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        undefined,
        409
      );
    }
    const openDup = [...this.paymentExceptions.values()].find(
      (row) =>
        row.businessId === values.businessId &&
        row.paymentTransactionId === values.paymentTransactionId &&
        row.exceptionType === values.exceptionType &&
        (row.status === "OPEN" || row.status === "INVESTIGATING")
    );
    if (openDup) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        undefined,
        409
      );
    }
    const timestamp = now();
    const row: PaymentExceptionRecord = {
      ...values,
      id: values.id ?? crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.paymentExceptions.set(row.id, row);
    return clone(row);
  }

  async updateException(
    businessId: string,
    exceptionId: string,
    patch: PaymentExceptionPatch
  ): Promise<PaymentExceptionRecord> {
    const row = this.paymentExceptions.get(exceptionId);
    if (!row || row.businessId !== businessId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.EXCEPTION_NOT_FOUND,
        undefined,
        404
      );
    }
    const next: PaymentExceptionRecord = {
      ...row,
      ...patch,
      paymentTransactionId: row.paymentTransactionId,
      paymentObligationId: row.paymentObligationId,
      exceptionNumber: row.exceptionNumber,
      updatedAt: now(),
    };
    this.paymentExceptions.set(row.id, next);
    return clone(next);
  }

  async findExceptionById(businessId: string, exceptionId: string) {
    const row = this.paymentExceptions.get(exceptionId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async findExceptionByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const row = [...this.paymentExceptions.values()].find(
      (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
    );
    return row ? clone(row) : null;
  }

  async findOpenExceptionByType(
    businessId: string,
    paymentTransactionId: string,
    exceptionType: string
  ) {
    const row = [...this.paymentExceptions.values()].find(
      (item) =>
        item.businessId === businessId &&
        item.paymentTransactionId === paymentTransactionId &&
        item.exceptionType === exceptionType &&
        (item.status === "OPEN" || item.status === "INVESTIGATING")
    );
    return row ? clone(row) : null;
  }

  async listExceptionsByTransaction(businessId: string, paymentTransactionId: string) {
    return [...this.paymentExceptions.values()]
      .filter(
        (row) =>
          row.businessId === businessId && row.paymentTransactionId === paymentTransactionId
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async listExceptionsByObligation(businessId: string, obligationId: string) {
    return [...this.paymentExceptions.values()]
      .filter(
        (row) => row.businessId === businessId && row.paymentObligationId === obligationId
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }

  async listExceptionsByBusiness(businessId: string) {
    return [...this.paymentExceptions.values()]
      .filter((row) => row.businessId === businessId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => clone(row));
  }
}

export function defaultInvoicePaymentTerms(): InvoicePaymentTermRecord[] {
  return [
    { code: "IMMEDIATE", name: "Due immediately", netDays: 0, displayOrder: 1, isActive: true },
    { code: "NET_7", name: "Net 7 days", netDays: 7, displayOrder: 2, isActive: true },
    { code: "NET_14", name: "Net 14 days", netDays: 14, displayOrder: 3, isActive: true },
    { code: "NET_30", name: "Net 30 days", netDays: 30, displayOrder: 4, isActive: true },
  ];
}

export function defaultCatalogueFixture(): PaymentCatalogueSnapshot {
  const methodCash: PaymentMethodRecord = {
    id: "method-cash",
    code: "CASH",
    name: "Cash",
    description: "Cash",
    customerLabel: "Cash",
    displayOrder: 1,
    isActive: true,
    requiresRail: false,
    requiresProvider: false,
    requiresChannel: false,
    enablementFlag: "cashEnabled",
  };
  const methodMobile: PaymentMethodRecord = {
    id: "method-mm",
    code: "MOBILE_MONEY",
    name: "Mobile Money",
    description: "Mobile money",
    customerLabel: "M-Pesa",
    displayOrder: 2,
    isActive: true,
    requiresRail: true,
    requiresProvider: true,
    requiresChannel: true,
    enablementFlag: "mobileMoneyEnabled",
  };
  const methodCard: PaymentMethodRecord = {
    id: "method-card",
    code: "CARD",
    name: "Card",
    description: "Card",
    customerLabel: "Card",
    displayOrder: 3,
    isActive: true,
    requiresRail: true,
    requiresProvider: true,
    requiresChannel: true,
    enablementFlag: "cardEnabled",
  };
  const methodBank: PaymentMethodRecord = {
    id: "method-bank",
    code: "BANK_TRANSFER",
    name: "Bank Transfer",
    description: "Bank",
    customerLabel: "Bank",
    displayOrder: 4,
    isActive: true,
    requiresRail: true,
    requiresProvider: true,
    requiresChannel: true,
    enablementFlag: "bankTransferEnabled",
  };
  const railMm: PaymentNetworkRecord = {
    id: "rail-mm-1",
    paymentMethodId: methodMobile.id,
    code: "RAIL_MM_PRIMARY",
    name: "Mobile money rail",
    description: null,
    customerLabel: "M-Pesa",
    displayOrder: 1,
    isActive: true,
  };
  const railCard: PaymentNetworkRecord = {
    id: "rail-card-1",
    paymentMethodId: methodCard.id,
    code: "RAIL_CARD_PRIMARY",
    name: "Card rail",
    description: null,
    customerLabel: "Card",
    displayOrder: 1,
    isActive: true,
  };
  const railBank: PaymentNetworkRecord = {
    id: "rail-bank-1",
    paymentMethodId: methodBank.id,
    code: "RAIL_BANK_PRIMARY",
    name: "Bank rail",
    description: null,
    customerLabel: "Bank",
    displayOrder: 1,
    isActive: true,
  };
  const providerMm: PaymentProviderRecord = {
    id: "provider-mm-1",
    paymentNetworkId: railMm.id,
    code: "PROVIDER_MM_PRIMARY",
    name: "Mobile money provider",
    description: null,
    integrationRef: "eng-003e:mobile-money",
    displayOrder: 1,
    isActive: true,
  };
  const providerCard: PaymentProviderRecord = {
    id: "provider-card-1",
    paymentNetworkId: railCard.id,
    code: "PROVIDER_CARD_PRIMARY",
    name: "Card provider",
    description: null,
    integrationRef: "eng-003e:card",
    displayOrder: 1,
    isActive: true,
  };
  const providerBank: PaymentProviderRecord = {
    id: "provider-bank-1",
    paymentNetworkId: railBank.id,
    code: "PROVIDER_BANK_PRIMARY",
    name: "Bank provider",
    description: null,
    integrationRef: "eng-003e:bank-transfer",
    displayOrder: 1,
    isActive: true,
  };
  const channelMm: PaymentChannelRecord = {
    id: "channel-mm-1",
    paymentProviderId: providerMm.id,
    code: "CHANNEL_MM_PROMPT",
    name: "Mobile prompt",
    description: null,
    customerLabel: "M-Pesa",
    displayOrder: 1,
    isActive: true,
  };
  const channelCard: PaymentChannelRecord = {
    id: "channel-card-1",
    paymentProviderId: providerCard.id,
    code: "CHANNEL_CARD_POS",
    name: "Card terminal",
    description: null,
    customerLabel: "Card",
    displayOrder: 1,
    isActive: true,
  };
  const channelBank: PaymentChannelRecord = {
    id: "channel-bank-1",
    paymentProviderId: providerBank.id,
    code: "CHANNEL_BANK_APP",
    name: "Bank app",
    description: null,
    customerLabel: "Bank",
    displayOrder: 1,
    isActive: true,
  };
  const capability = (
    channel: PaymentChannelRecord,
    provider: PaymentProviderRecord,
    maxAmount: string | null = null
  ): PaymentCapabilityRecordView => ({
    id: `cap-${channel.id}`,
    paymentChannelId: channel.id,
    paymentProviderId: provider.id,
    minAmount: "1",
    maxAmount,
    dailyLimit: null,
    transactionLimit: null,
    supportedCurrencies: ["KES"],
    supportsInitiation: true,
    supportsRefund: false,
    supportsStatusQuery: true,
    isAvailable: true,
    metadata: null,
  });

  return {
    methods: [methodCash, methodMobile, methodCard, methodBank],
    networks: [railMm, railCard, railBank],
    providers: [providerMm, providerCard, providerBank],
    channels: [channelMm, channelCard, channelBank],
    capabilities: [
      capability(channelMm, providerMm),
      capability(channelCard, providerCard),
      capability(channelBank, providerBank),
    ],
  };
}

export class InMemoryCapabilityStore {
  constructor(private readonly store: InMemoryPaymentStore) {}

  async findByProviderAndChannel(providerId: string, channelId: string) {
    return (
      this.store.capabilityRecords().find(
        (row) => row.providerId === providerId && row.channelId === channelId
      ) ?? null
    );
  }

  async listByProvider(providerId: string) {
    return this.store.capabilityRecords().filter((row) => row.providerId === providerId);
  }
}

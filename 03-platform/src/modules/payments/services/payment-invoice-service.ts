/**
 * Purpose:
 * BP-007 IP-04 orchestration — create, issue, and cancel invoices against
 * an existing payment obligation. Numbering is ENG-003b. Documents are
 * ENG-007. Paid/outstanding come from IP-03 allocations.
 *
 * Implementation Package:
 * BP-007 / IP-04 – Billing, Invoicing & Credit Sales
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  DOCUMENT_NUMBERING_DOCUMENT_TYPES,
  DOCUMENT_NUMBERING_ERROR_CODES,
  DocumentNumberingError,
  type DocumentNumberingPort,
} from "@/core/localization-regulatory/document-numbering";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import { isPositivePaymentAmount } from "@/core/payment-engine";
import {
  RECEIPTING_DOCUMENT_STATES,
  RECEIPTING_DOCUMENT_TYPES,
  createInProcessReceiptingAdapter,
  type ReceiptingEnginePort,
} from "@/core/receipting-engine";
import { createBusinessPaymentEnablementAdapter } from "@/modules/payments/adapters/business-payment-enablement-adapter";
import {
  INVOICE_ADJUSTMENT_TYPES,
  INVOICE_STATUS,
  INVOICE_STATUS_LABELS,
  PAYMENT_AUDIT_ACTIONS,
  PAYMENT_IDEMPOTENCY_OPERATIONS,
} from "@/modules/payments/constants";
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_USER_MESSAGES,
  PaymentObligationError,
} from "@/modules/payments/errors";
import type {
  InvoiceClockPort,
  InvoicePaymentTermPort,
  PaymentAuditPort,
  PaymentEnablementPort,
  PaymentIdempotencyRepositoryPort,
  PaymentInvoiceRepositoryPort,
  PaymentObligationRepositoryPort,
} from "@/modules/payments/ports";
import { createInvoicePaymentTermRepository } from "@/modules/payments/repositories/invoice-payment-term-repository";
import { createPaymentIdempotencyRepository } from "@/modules/payments/repositories/payment-idempotency-repository";
import { createPaymentInvoiceRepository } from "@/modules/payments/repositories/payment-invoice-repository";
import { createPaymentObligationRepository } from "@/modules/payments/repositories/payment-obligation-repository";
import {
  assertCreditSalesAllowed,
  billedAmountFromObligation,
  deriveOpenInvoiceStatus,
  dueDateFromTerm,
  invoiceSettlement,
} from "@/modules/payments/services/payment-invoice-rules";
import { createPaymentAuditAdapter } from "@/modules/payments/services/payment-obligation-audit-helper";
import type {
  CancelInvoiceCommand,
  CreateInvoiceCommand,
  InvoiceDashboardView,
  InvoiceDetailView,
  InvoicePaymentTermRecord,
  InvoiceView,
  IssueInvoiceCommand,
  PaymentInvoiceRecord,
} from "@/modules/payments/types";

export type PaymentInvoiceServiceDependencies = {
  obligations: PaymentObligationRepositoryPort;
  invoices: PaymentInvoiceRepositoryPort;
  terms: InvoicePaymentTermPort;
  enablement: PaymentEnablementPort;
  numbering: DocumentNumberingPort;
  receipting: ReceiptingEnginePort;
  idempotency: PaymentIdempotencyRepositoryPort;
  audit: PaymentAuditPort;
  clock: InvoiceClockPort;
};

function toView(
  row: PaymentInvoiceRecord,
  term: InvoicePaymentTermRecord | null
): InvoiceView {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    businessId: row.businessId,
    obligationId: row.obligationId,
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    currencyCode: row.currencyCode,
    invoiceAmount: row.invoiceAmount,
    paidAmount: row.paidAmount,
    outstandingAmount: row.outstandingAmount,
    amountDueSnapshot: row.amountDueSnapshot,
    paymentTermCode: row.paymentTermCode,
    paymentTermName: term?.name ?? row.paymentTermCode,
    issueDate: row.issueDate ? row.issueDate.toISOString() : null,
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    status: row.status,
    statusLabel: INVOICE_STATUS_LABELS[row.status] ?? row.status,
    documentId: row.documentId,
    documentStatus: row.documentStatus,
    commercialContractId: row.commercialContractId,
    snapshotId: row.snapshotId,
    createdAt: row.createdAt.toISOString(),
  };
}

export class SystemInvoiceClock implements InvoiceClockPort {
  now(): Date {
    return new Date();
  }
}

export class ConfigurableInvoiceClock implements InvoiceClockPort {
  constructor(private current: Date = new Date()) {}

  now(): Date {
    return this.current;
  }

  setNow(value: Date) {
    this.current = value;
  }
}

export class PaymentInvoiceService {
  constructor(private readonly deps: PaymentInvoiceServiceDependencies) {}

  async getDashboard(context: CurrentBusinessContext): Promise<InvoiceDashboardView> {
    this.assertContext(context);
    const [rows, paymentTerms] = await Promise.all([
      this.deps.invoices.listByBusiness(context.businessId),
      this.deps.terms.listActive(),
    ]);
    const synced: PaymentInvoiceRecord[] = [];
    for (const row of rows) {
      synced.push(await this.syncSettlement(context, row));
    }
    const termsByCode = new Map(paymentTerms.map((term) => [term.code, term]));
    return {
      invoiceCount: synced.length,
      draftCount: synced.filter((row) => row.status === INVOICE_STATUS.DRAFT).length,
      issuedCount: synced.filter(
        (row) =>
          row.status === INVOICE_STATUS.ISSUED ||
          row.status === INVOICE_STATUS.PARTIALLY_PAID
      ).length,
      overdueCount: synced.filter((row) => row.status === INVOICE_STATUS.OVERDUE).length,
      recentInvoices: synced
        .slice(0, 20)
        .map((row) => toView(row, termsByCode.get(row.paymentTermCode) ?? null)),
      paymentTerms,
    };
  }

  async getInvoice(
    context: CurrentBusinessContext,
    invoiceId: string
  ): Promise<InvoiceDetailView> {
    this.assertContext(context);
    const invoice = await this.requireInvoice(context, invoiceId);
    const synced = await this.syncSettlement(context, invoice);
    return this.toDetail(context, synced);
  }

  async listForObligation(
    context: CurrentBusinessContext,
    obligationId: string
  ): Promise<{ invoices: InvoiceView[]; paymentTerms: InvoicePaymentTermRecord[] }> {
    this.assertContext(context);
    await this.requireObligation(context, obligationId);
    const [rows, paymentTerms] = await Promise.all([
      this.deps.invoices.listByObligation(context.businessId, obligationId),
      this.deps.terms.listActive(),
    ]);
    const termsByCode = new Map(paymentTerms.map((term) => [term.code, term]));
    const invoices: InvoiceView[] = [];
    for (const row of rows) {
      const synced = await this.syncSettlement(context, row);
      invoices.push(toView(synced, termsByCode.get(synced.paymentTermCode) ?? null));
    }
    return { invoices, paymentTerms };
  }

  async reflectObligationSettlements(
    context: CurrentBusinessContext,
    obligationId: string
  ): Promise<void> {
    this.assertContext(context);
    const rows = await this.deps.invoices.listByObligation(context.businessId, obligationId);
    for (const row of rows) {
      await this.syncSettlement(context, row);
    }
  }

  async createInvoice(
    context: CurrentBusinessContext,
    command: CreateInvoiceCommand
  ): Promise<InvoiceDetailView> {
    this.assertContext(context);
    const obligationId = command.obligationId?.trim();
    const paymentTermCode = command.paymentTermCode?.trim();
    if (!obligationId || !paymentTermCode) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVALID_INPUT,
        PAYMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }
    const obligation = await this.requireObligation(context, obligationId);
    const term = await this.requireTerm(paymentTermCode);
    const billedAmount = billedAmountFromObligation(obligation);
    const flags = await this.deps.enablement.getFlags(context.businessId);
    if (isPositivePaymentAmount(obligation.outstandingAmount)) {
      assertCreditSalesAllowed({
        billedAmount,
        creditSalesEnabled: flags.creditSalesEnabled,
      });
      if (!obligation.customerId) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.INVOICE_CUSTOMER_REQUIRED,
          undefined,
          409
        );
      }
    }
    if (!obligation.currencyCode?.trim()) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.CURRENCY_MISSING,
        undefined,
        409
      );
    }

    const idempotencyKey = (
      command.idempotencyKey?.trim() ||
      `${PAYMENT_IDEMPOTENCY_OPERATIONS.CREATE_INVOICE}:${obligation.id}:${paymentTermCode}`
    ).slice(0, 180);
    const existing = await this.deps.invoices.findByIdempotencyKey(
      context.businessId,
      idempotencyKey
    );
    if (existing) {
      if (
        existing.status === INVOICE_STATUS.CANCELLED ||
        existing.status === INVOICE_STATUS.CREDITED
      ) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.INVOICE_ALREADY_CANCELLED,
          undefined,
          409
        );
      }
      return this.toDetail(context, await this.syncSettlement(context, existing));
    }

    const conflict = await this.deps.invoices.findActiveByObligation(
      context.businessId,
      obligation.id
    );
    if (conflict) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVOICE_ALREADY_EXISTS,
        undefined,
        409
      );
    }

    let allocatedNumber;
    try {
      allocatedNumber = await this.deps.numbering.allocate({
        businessId: context.businessId,
        documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.INVOICE,
      });
    } catch (error) {
      if (
        error instanceof DocumentNumberingError &&
        error.code === DOCUMENT_NUMBERING_ERROR_CODES.POLICY_MISSING
      ) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.NUMBERING_POLICY_MISSING,
          undefined,
          409
        );
      }
      throw error;
    }

    const settlement = invoiceSettlement({
      invoiceAmount: billedAmount,
      openingPaidAmount: obligation.paidAmount,
      obligationPaidAmount: obligation.paidAmount,
    });

    const created = await this.deps.invoices.insert({
      businessId: context.businessId,
      obligationId: obligation.id,
      salesOrderId: obligation.salesOrderId,
      orderNumber: obligation.orderNumber,
      customerId: obligation.customerId,
      invoiceNumber: allocatedNumber.number,
      numberingPolicyId: allocatedNumber.policyId,
      currencyCode: obligation.currencyCode,
      invoiceAmount: billedAmount,
      paidAmount: settlement.paidAmount,
      outstandingAmount: settlement.outstandingAmount,
      openingPaidAmount: obligation.paidAmount,
      amountDueSnapshot: obligation.amountDue,
      commercialContractId: obligation.commercialContractId,
      snapshotId: obligation.snapshotId,
      paymentTermCode: term.code,
      issueDate: null,
      dueDate: null,
      status: INVOICE_STATUS.DRAFT,
      documentId: null,
      documentStatus: null,
      cancellationReason: null,
      cancelledAt: null,
      cancelledBy: null,
      idempotencyKey,
      provenance: {
        commercialContractId: obligation.commercialContractId,
        snapshotId: obligation.snapshotId,
        amountDue: obligation.amountDue,
        currencyCode: obligation.currencyCode,
        lineBreakdown: obligation.lineBreakdown,
        paymentTermCode: term.code,
        paymentTermNetDays: term.netDays,
      },
      metadata: { numberingPolicyCode: allocatedNumber.policyCode },
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.deps.idempotency
      .insert({
        businessId: context.businessId,
        idempotencyKey,
        operationType: PAYMENT_IDEMPOTENCY_OPERATIONS.CREATE_INVOICE,
        resourceType: "payment_invoice",
        resourceId: created.id,
        createdBy: context.platformUserId,
      })
      .catch((error) => {
        if (
          error instanceof PaymentObligationError &&
          error.code === PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT
        ) {
          return;
        }
        throw error;
      });

    const draftDocument = await this.produceDocument(
      created,
      RECEIPTING_DOCUMENT_STATES.DRAFT
    );
    const withDocument = await this.deps.invoices.update(context.businessId, created.id, {
      documentId: draftDocument.documentId,
      documentStatus: draftDocument.documentState,
      updatedBy: context.platformUserId,
    });

    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.INVOICE_CREATED,
      obligationId: obligation.id,
      invoiceId: withDocument.id,
      outcome: "SUCCESS",
      references: {
        invoiceNumber: withDocument.invoiceNumber,
        invoiceAmount: withDocument.invoiceAmount,
        amountDue: obligation.amountDue,
      },
    });
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.INVOICE_DOCUMENT_REQUESTED,
      obligationId: obligation.id,
      invoiceId: withDocument.id,
      outcome: "SUCCESS",
      references: {
        documentId: withDocument.documentId,
        documentStatus: withDocument.documentStatus,
      },
    });

    return this.toDetail(context, withDocument, term);
  }

  async issueInvoice(
    context: CurrentBusinessContext,
    command: IssueInvoiceCommand
  ): Promise<InvoiceDetailView> {
    this.assertContext(context);
    const invoice = await this.requireInvoice(context, command.invoiceId);
    if (invoice.status === INVOICE_STATUS.CANCELLED) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVOICE_ALREADY_CANCELLED,
        undefined,
        409
      );
    }
    if (invoice.status !== INVOICE_STATUS.DRAFT) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVOICE_INVALID_TRANSITION,
        undefined,
        409
      );
    }
    const term = await this.requireTerm(invoice.paymentTermCode);
    const issueDate = this.deps.clock.now();
    const dueDate = dueDateFromTerm(issueDate, term);
    const synced = await this.syncSettlement(context, invoice);
    const nextStatus = deriveOpenInvoiceStatus({
      currentStatus: INVOICE_STATUS.ISSUED,
      paidAmount: synced.paidAmount,
      outstandingAmount: synced.outstandingAmount,
      dueDate,
      now: issueDate,
    });
    const issuedDocument = await this.produceDocument(
      { ...synced, issueDate, dueDate, status: nextStatus },
      RECEIPTING_DOCUMENT_STATES.ISSUED
    );
    const updated = await this.deps.invoices.update(context.businessId, invoice.id, {
      status: nextStatus,
      issueDate,
      dueDate,
      paidAmount: synced.paidAmount,
      outstandingAmount: synced.outstandingAmount,
      documentId: issuedDocument.documentId,
      documentStatus: issuedDocument.documentState,
      updatedBy: context.platformUserId,
    });
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.INVOICE_ISSUED,
      obligationId: invoice.obligationId,
      invoiceId: updated.id,
      outcome: "SUCCESS",
      references: {
        dueDate: dueDate.toISOString(),
        paymentTermCode: term.code,
        status: updated.status,
      },
    });
    if (updated.status === INVOICE_STATUS.OVERDUE) {
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.INVOICE_OVERDUE,
        obligationId: invoice.obligationId,
        invoiceId: updated.id,
        outcome: "SUCCESS",
        references: { dueDate: dueDate.toISOString() },
      });
    }
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.INVOICE_DOCUMENT_REQUESTED,
      obligationId: invoice.obligationId,
      invoiceId: updated.id,
      outcome: "SUCCESS",
      references: {
        documentId: updated.documentId,
        documentStatus: updated.documentStatus,
      },
    });
    return this.toDetail(context, updated, term);
  }

  async cancelInvoice(
    context: CurrentBusinessContext,
    command: CancelInvoiceCommand
  ): Promise<InvoiceDetailView> {
    this.assertContext(context);
    const reason = command.reason?.trim();
    if (!reason) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVALID_INPUT,
        PAYMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }
    const invoice = await this.requireInvoice(context, command.invoiceId);
    if (invoice.status === INVOICE_STATUS.CANCELLED) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVOICE_ALREADY_CANCELLED,
        undefined,
        409
      );
    }
    if (invoice.status === INVOICE_STATUS.PAID) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVOICE_INVALID_TRANSITION,
        undefined,
        409
      );
    }
    const now = this.deps.clock.now();
    if (isPositivePaymentAmount(invoice.paidAmount)) {
      await this.deps.invoices.insertAdjustment({
        businessId: context.businessId,
        invoiceId: invoice.id,
        adjustmentType: INVOICE_ADJUSTMENT_TYPES.CREDIT_NOTE,
        status: "RECORDED",
        amount: invoice.paidAmount,
        currencyCode: invoice.currencyCode,
        reason,
        handedOffToIp06: "YES",
        createdBy: context.platformUserId,
      });
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.INVOICE_CREDIT_LINKAGE_CREATED,
        obligationId: invoice.obligationId,
        invoiceId: invoice.id,
        outcome: "SUCCESS",
        references: { reason, handedOffToIp06: true },
      });
    }
    const updated = await this.deps.invoices.update(context.businessId, invoice.id, {
      status: INVOICE_STATUS.CANCELLED,
      cancellationReason: reason,
      cancelledAt: now,
      cancelledBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.INVOICE_CANCELLED,
      obligationId: invoice.obligationId,
      invoiceId: updated.id,
      outcome: "SUCCESS",
      references: { reason },
    });
    return this.toDetail(context, updated);
  }

  async listPaymentTerms() {
    return this.deps.terms.listActive();
  }

  private async syncSettlement(
    context: CurrentBusinessContext,
    invoice: PaymentInvoiceRecord
  ): Promise<PaymentInvoiceRecord> {
    if (
      invoice.status === INVOICE_STATUS.CANCELLED ||
      invoice.status === INVOICE_STATUS.CREDITED
    ) {
      return invoice;
    }
    const obligation = await this.requireObligation(context, invoice.obligationId);
    const settlement = invoiceSettlement({
      invoiceAmount: invoice.invoiceAmount,
      openingPaidAmount: invoice.openingPaidAmount,
      obligationPaidAmount: obligation.paidAmount,
    });
    const nextStatus = deriveOpenInvoiceStatus({
      currentStatus: invoice.status,
      paidAmount: settlement.paidAmount,
      outstandingAmount: settlement.outstandingAmount,
      dueDate: invoice.dueDate,
      now: this.deps.clock.now(),
    });
    if (
      nextStatus === invoice.status &&
      settlement.paidAmount === invoice.paidAmount &&
      settlement.outstandingAmount === invoice.outstandingAmount
    ) {
      return invoice;
    }
    const updated = await this.deps.invoices.update(context.businessId, invoice.id, {
      status: nextStatus,
      paidAmount: settlement.paidAmount,
      outstandingAmount: settlement.outstandingAmount,
      updatedBy: context.platformUserId,
    });
    await this.audit(context, {
      action:
        nextStatus === INVOICE_STATUS.OVERDUE && invoice.status !== INVOICE_STATUS.OVERDUE
          ? PAYMENT_AUDIT_ACTIONS.INVOICE_OVERDUE
          : PAYMENT_AUDIT_ACTIONS.INVOICE_ALLOCATION_REFLECTED,
      obligationId: invoice.obligationId,
      invoiceId: invoice.id,
      outcome: "SUCCESS",
      references: {
        paidAmount: updated.paidAmount,
        outstandingAmount: updated.outstandingAmount,
        status: updated.status,
        amountDueSnapshot: updated.amountDueSnapshot,
      },
    });
    if (nextStatus !== invoice.status) {
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.INVOICE_STATUS_CHANGED,
        obligationId: invoice.obligationId,
        invoiceId: invoice.id,
        outcome: "SUCCESS",
        references: { from: invoice.status, to: nextStatus },
      });
    }
    return updated;
  }

  private async produceDocument(invoice: PaymentInvoiceRecord, documentState: string) {
    try {
      return await this.deps.receipting.produceFinancialDocument({
        businessId: invoice.businessId,
        documentType: RECEIPTING_DOCUMENT_TYPES.INVOICE,
        documentState,
        referenceId: invoice.id,
        currencyCode: invoice.currencyCode,
        amount: invoice.invoiceAmount,
        payload: {
          invoiceNumber: invoice.invoiceNumber,
          obligationId: invoice.obligationId,
          orderNumber: invoice.orderNumber,
          commercialContractId: invoice.commercialContractId,
          snapshotId: invoice.snapshotId,
          amountDueSnapshot: invoice.amountDueSnapshot,
          provenance: invoice.provenance,
        },
      });
    } catch {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.DOCUMENT_PRODUCTION_UNAVAILABLE,
        undefined,
        500
      );
    }
  }

  private async toDetail(
    context: CurrentBusinessContext,
    invoice: PaymentInvoiceRecord,
    term?: InvoicePaymentTermRecord | null
  ): Promise<InvoiceDetailView> {
    const [obligation, adjustments, resolvedTerm] = await Promise.all([
      this.requireObligation(context, invoice.obligationId),
      this.deps.invoices.listAdjustments(context.businessId, invoice.id),
      term ? Promise.resolve(term) : this.deps.terms.findByCode(invoice.paymentTermCode),
    ]);
    return {
      ...toView(invoice, resolvedTerm),
      obligationNumber: obligation.obligationNumber,
      salesOrderId: invoice.salesOrderId,
      provenance: invoice.provenance,
      adjustments: adjustments.map((row) => ({
        id: row.id,
        adjustmentType: row.adjustmentType,
        amount: row.amount,
        reason: row.reason,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  private async requireInvoice(context: CurrentBusinessContext, invoiceId: string) {
    const row = await this.deps.invoices.findById(
      context.businessId,
      invoiceId?.trim() || ""
    );
    if (!row) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVOICE_NOT_FOUND,
        undefined,
        404
      );
    }
    return row;
  }

  private async requireObligation(context: CurrentBusinessContext, obligationId: string) {
    const row = await this.deps.obligations.findById(context.businessId, obligationId);
    if (!row) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.OBLIGATION_NOT_FOUND,
        undefined,
        404
      );
    }
    return row;
  }

  private async requireTerm(code: string) {
    const term = await this.deps.terms.findByCode(code);
    if (!term || !term.isActive) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVOICE_TERM_INVALID,
        undefined,
        409
      );
    }
    return term;
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

  private async audit(
    context: CurrentBusinessContext,
    entry: {
      action: string;
      obligationId: string | null;
      invoiceId?: string | null;
      outcome: "SUCCESS" | "FAILURE";
      references?: Record<string, unknown>;
    }
  ): Promise<void> {
    try {
      await this.deps.audit.record({
        businessId: context.businessId,
        actorUserId: context.platformUserId,
        obligationId: entry.obligationId,
        invoiceId: entry.invoiceId,
        operation: entry.action,
        action: entry.action,
        outcome: entry.outcome,
        references: entry.references,
      });
    } catch {
      // Audit must not mask the original fail-closed error.
    }
  }
}

export function createDefaultPaymentInvoiceDependencies(): PaymentInvoiceServiceDependencies {
  return {
    obligations: createPaymentObligationRepository(),
    invoices: createPaymentInvoiceRepository(),
    terms: createInvoicePaymentTermRepository(),
    enablement: createBusinessPaymentEnablementAdapter(),
    numbering: new ConfigurableDocumentNumberingService(
      createDocumentNumberingPolicyRepository()
    ),
    receipting: createInProcessReceiptingAdapter(),
    idempotency: createPaymentIdempotencyRepository(),
    audit: createPaymentAuditAdapter(),
    clock: new SystemInvoiceClock(),
  };
}

export function createPaymentInvoiceService(deps?: PaymentInvoiceServiceDependencies) {
  return new PaymentInvoiceService(deps ?? createDefaultPaymentInvoiceDependencies());
}

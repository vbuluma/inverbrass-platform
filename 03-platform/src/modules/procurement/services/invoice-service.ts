/**
 * Purpose:
 * Orchestrate BP-009 IP-09 supplier invoices: capture, duplicate detection,
 * 2/3/4-way matching, approval, and AP handoff. Does not post GL or execute payment.
 */

import { randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  DOCUMENT_NUMBERING_DOCUMENT_TYPES,
  DocumentNumberingError,
  type DocumentNumberingPort,
} from "@/core/localization-regulatory/document-numbering";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import {
  AP_HANDOFF_STATUSES,
  EXCEPTION_OBJECT_TYPES,
  EXCEPTION_RAISED_FROM,
  EXCEPTION_TYPE_CODES,
  INVOICE_STATUSES,
  MATCH_OUTCOMES,
  MATCHING_MODES,
  PERFORMANCE_MEASURE_CODES,
  PERFORMANCE_SOURCE_TYPES,
  PROCUREMENT_AUDIT_ACTIONS,
  PROCUREMENT_PERMISSIONS,
  PROCUREMENT_STATUS_CODES,
  RECEIPT_STATUSES,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  InvoiceControlPort,
  InvoiceStorePort,
  ProcurementApHandoffPort,
  ProcurementAuditPort,
  ProcurementExceptionBridgePort,
  ProcurementPerformanceBridgePort,
  PurchaseOrderStorePort,
  ReceivingStorePort,
  SuggestedSupplierPort,
} from "@/modules/procurement/ports";
import { createInProcessApHandoffAdapter } from "@/modules/procurement/adapters/procurement-ap-handoff-adapter";
import { createSuggestedSupplierAdapter } from "@/modules/procurement/adapters/suggested-supplier-adapter";
import {
  createInvoiceControlRepository,
  createInvoiceRepository,
} from "@/modules/procurement/repositories/invoice-repository";
import { createPurchaseOrderRepository } from "@/modules/procurement/repositories/purchase-order-repository";
import { createReceivingRepository } from "@/modules/procurement/repositories/receiving-repository";
import { createProcurementAuditAdapter } from "@/modules/procurement/services/procurement-audit-helper";
import { mapMatchOutcomeToExceptionType } from "@/modules/procurement/services/exception-rules";
import { createProcurementExceptionBridge } from "@/modules/procurement/services/exception-service";
import { createProcurementPerformanceBridge } from "@/modules/procurement/services/performance-service";
import {
  aggregateMatchOutcome,
  assertCanApprove,
  assertCanCapture,
  assertPoEligibleForInvoice,
  buildApHandoffIdempotencyKey,
  buildMatchIdempotencyKey,
  computeLineAmounts,
  duplicateBlocksCapture,
  evaluateLineMatch,
  invoiceStatusLabel,
  parseInvoiceAmount,
  resolveMatchingModeForLine,
  statusForMatchOutcome,
  sumInvoiceLines,
} from "@/modules/procurement/services/invoice-rules";
import { sumReceivedQuantities } from "@/modules/procurement/services/receiving-rules";
import { assertPermission } from "@/modules/procurement/services/procurement-rules";
import type {
  CreateSupplierInvoiceCommand,
  InvoiceDecisionCommand,
  InvoiceListFilter,
  InvoiceListView,
  InvoiceMatchLineRecord,
  InvoiceView,
  PaymentReadyListView,
  ProcurementActor,
  SupplierInvoiceLineRecord,
} from "@/modules/procurement/types";

export type InvoiceServiceDependencies = {
  store: InvoiceStorePort;
  poStore: PurchaseOrderStorePort;
  receivingStore: ReceivingStorePort;
  controls: InvoiceControlPort;
  numbering: DocumentNumberingPort;
  audit: ProcurementAuditPort;
  suggestedSupplier: SuggestedSupplierPort;
  apHandoff: ProcurementApHandoffPort;
  exceptions?: ProcurementExceptionBridgePort;
  performance?: ProcurementPerformanceBridgePort;
};

function actorId(context: CurrentBusinessContext) {
  return context.platformUserId || null;
}

function requireInvoice<T>(row: T | null): T {
  if (!row) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVOICE_NOT_FOUND, undefined, 404);
  }
  return row;
}

export class InvoiceService {
  constructor(private readonly deps: InvoiceServiceDependencies) {}

  async list(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    filter: InvoiceListFilter = {}
  ): Promise<InvoiceListView[]> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.INVOICE_READ);
    const rows = await this.deps.store.listInvoicesByBusiness(context.businessId);
    const views: InvoiceListView[] = [];
    for (const row of rows) {
      const supplier = await this.deps.suggestedSupplier.resolve(context.businessId, row.profileId);
      const po = row.purchaseOrderId
        ? await this.deps.poStore.findById(context.businessId, row.purchaseOrderId)
        : null;
      if (filter.status && filter.status !== "all") {
        const normalized = filter.status.replace("-", "_").toUpperCase();
        if (normalized === "PAYMENT_READY" && row.status !== INVOICE_STATUSES.PAYMENT_READY) {
          continue;
        }
        if (normalized !== "PAYMENT_READY" && row.status !== normalized) {
          continue;
        }
      }
      if (filter.query?.trim()) {
        const query = filter.query.trim().toLowerCase();
        const haystack = [
          row.internalInvoiceNumber,
          row.supplierInvoiceNumber,
          supplier?.party.displayName ?? "",
          po?.poNumber ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) {
          continue;
        }
      }
      views.push({
        id: row.id,
        internalInvoiceNumber: row.internalInvoiceNumber,
        supplierInvoiceNumber: row.supplierInvoiceNumber,
        supplierName: supplier?.party.displayName ?? "Supplier",
        poNumber: po?.poNumber ?? null,
        purchaseOrderId: row.purchaseOrderId,
        invoiceDate: row.invoiceDate,
        dueDate: row.dueDate,
        totalAmount: row.totalAmount,
        currencyCode: row.currencyCode,
        status: row.status,
        statusLabel: invoiceStatusLabel(row.status),
        matchOutcome: row.matchOutcome,
        duplicateFlag: row.duplicateFlag,
      });
    }
    return views.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
  }

  async listPaymentReady(
    context: CurrentBusinessContext,
    actor: ProcurementActor
  ): Promise<PaymentReadyListView[]> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.INVOICE_READ);
    const rows = await this.deps.store.listPaymentReadyInvoices(context.businessId);
    const views: PaymentReadyListView[] = [];
    for (const row of rows) {
      const supplier = await this.deps.suggestedSupplier.resolve(context.businessId, row.profileId);
      const handoff = await this.deps.store.findApHandoffByInvoice(context.businessId, row.id);
      views.push({
        id: row.id,
        internalInvoiceNumber: row.internalInvoiceNumber,
        supplierInvoiceNumber: row.supplierInvoiceNumber,
        supplierName: supplier?.party.displayName ?? "Supplier",
        totalAmount: row.totalAmount,
        currencyCode: row.currencyCode,
        dueDate: row.dueDate,
        paymentReadyAt: row.paymentReadyAt?.toISOString() ?? null,
        handoffStatus: handoff?.status ?? null,
        handoffReference: handoff?.downstreamReference ?? null,
      });
    }
    return views;
  }

  async listByPurchaseOrder(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    purchaseOrderId: string
  ): Promise<InvoiceListView[]> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.INVOICE_READ);
    const rows = await this.deps.store.listInvoicesByPurchaseOrder(
      context.businessId,
      purchaseOrderId
    );
    const views: InvoiceListView[] = [];
    const po = await this.deps.poStore.findById(context.businessId, purchaseOrderId);
    for (const row of rows) {
      const supplier = await this.deps.suggestedSupplier.resolve(context.businessId, row.profileId);
      views.push({
        id: row.id,
        internalInvoiceNumber: row.internalInvoiceNumber,
        supplierInvoiceNumber: row.supplierInvoiceNumber,
        supplierName: supplier?.party.displayName ?? "Supplier",
        poNumber: po?.poNumber ?? null,
        purchaseOrderId: row.purchaseOrderId,
        invoiceDate: row.invoiceDate,
        dueDate: row.dueDate,
        totalAmount: row.totalAmount,
        currencyCode: row.currencyCode,
        status: row.status,
        statusLabel: invoiceStatusLabel(row.status),
        matchOutcome: row.matchOutcome,
        duplicateFlag: row.duplicateFlag,
      });
    }
    return views;
  }

  async get(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    invoiceId: string
  ): Promise<InvoiceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.INVOICE_READ);
    const row = requireInvoice(
      await this.deps.store.findInvoiceById(context.businessId, invoiceId)
    );
    return this.toView(context.businessId, row);
  }

  async create(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    input: CreateSupplierInvoiceCommand
  ): Promise<InvoiceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.INVOICE_CREATE);
    if (!input.lines.length) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVOICE_EMPTY, undefined, 400);
    }
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    if (!input.purchaseOrderId && !control.allowNonPoInvoices) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVOICE_PO_REQUIRED, undefined, 400, {
        field: "purchaseOrderId",
      });
    }

    const supplier = await this.deps.suggestedSupplier.resolve(
      context.businessId,
      input.profileId
    );
    if (!supplier) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404);
    }

    let purchaseOrderId: string | null = input.purchaseOrderId ?? null;
    let purchaseOrderVersionId: string | null = null;
    let poLines: Awaited<ReturnType<PurchaseOrderStorePort["listLines"]>> = [];
    if (purchaseOrderId) {
      const po = await this.deps.poStore.findById(context.businessId, purchaseOrderId);
      if (!po) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_NOT_FOUND, undefined, 404);
      }
      if (po.profileId !== input.profileId) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400);
      }
      assertPoEligibleForInvoice(po.status);
      if (po.currencyCode !== input.currencyCode) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.CURRENCY_MISMATCH, undefined, 409);
      }
      const versionId = po.acceptedVersionId ?? po.currentVersionId;
      if (!versionId) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_VERSION_INVALID, undefined, 409);
      }
      purchaseOrderVersionId = versionId;
      poLines = await this.deps.poStore.listLines(versionId);
    }

    const preparedLines = input.lines.map((line, index) => {
      const amounts = computeLineAmounts({
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
      });
      if (line.poLineId && purchaseOrderId) {
        const poLine = poLines.find((row) => row.id === line.poLineId);
        if (!poLine) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_LINE_NOT_FOUND, undefined, 404);
        }
      }
      return {
        id: randomUUID(),
        businessId: context.businessId,
        invoiceId: "",
        poLineId: line.poLineId ?? null,
        sequence: index + 1,
        description: line.description.trim(),
        quantity: line.quantity,
        uom: line.uom?.trim() || "EA",
        unitPrice: line.unitPrice,
        taxRate: amounts.taxRate,
        lineSubtotal: amounts.lineSubtotal,
        lineTax: amounts.lineTax,
        lineTotal: amounts.lineTotal,
        taxReference: line.taxReference?.trim() || null,
      } satisfies SupplierInvoiceLineRecord;
    });

    const totals = sumInvoiceLines(preparedLines);
    const numbering = await this.allocateInvoiceNumber(context.businessId);
    const invoiceId = randomUUID();

    const row = await this.deps.store.insertInvoice({
      id: invoiceId,
      businessId: context.businessId,
      internalInvoiceNumber: numbering.number,
      supplierInvoiceNumber: input.supplierInvoiceNumber.trim(),
      profileId: input.profileId,
      partyId: supplier.partyId,
      purchaseOrderId,
      purchaseOrderVersionId,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate ?? null,
      currencyCode: input.currencyCode,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      taxReference: input.taxReference?.trim() || null,
      attachmentDocumentId: input.attachmentDocumentId?.trim() || null,
      status: INVOICE_STATUSES.DRAFT,
      matchOutcome: null,
      matchingMode: input.matchingMode?.trim() || null,
      duplicateFlag: false,
      duplicateOfInvoiceId: null,
      matchVersion: 1,
      matchIdempotencyKey: null,
      capturedAt: null,
      capturedBy: null,
      matchedAt: null,
      approvedAt: null,
      approvedBy: null,
      paymentReadyAt: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });

    await this.deps.store.insertInvoiceLines(
      preparedLines.map((line) => ({ ...line, invoiceId: row.id }))
    );

    await this.audit(context, row.id, PROCUREMENT_AUDIT_ACTIONS.INVOICE_CREATED);
    return this.toView(context.businessId, row);
  }

  async capture(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    invoiceId: string
  ): Promise<InvoiceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.INVOICE_CAPTURE);
    const row = requireInvoice(
      await this.deps.store.findInvoiceById(context.businessId, invoiceId)
    );
    assertCanCapture(row.status);
    const control = await this.deps.controls.getOrCreateControl(context.businessId);

    const duplicate = await this.deps.store.findDuplicateInvoice(
      context.businessId,
      row.profileId,
      row.supplierInvoiceNumber,
      row.id
    );
    if (duplicate) {
      const duplicateFlag = true;
      const updated = await this.deps.store.updateInvoice(context.businessId, invoiceId, {
        status: INVOICE_STATUSES.DUPLICATE,
        matchOutcome: MATCH_OUTCOMES.DUPLICATE,
        duplicateFlag,
        duplicateOfInvoiceId: duplicate.id,
        capturedAt: new Date(),
        capturedBy: actorId(context),
        updatedBy: actorId(context),
      });
      await this.audit(context, invoiceId, PROCUREMENT_AUDIT_ACTIONS.INVOICE_DUPLICATE_DETECTED, {
        duplicateOfInvoiceId: duplicate.id,
      });
      await this.raiseInvoiceException(context, actor, updated, {
        sourceKey: `invoice:${invoiceId}:duplicate`,
        exceptionTypeCode: EXCEPTION_TYPE_CODES.DUPLICATE_INVOICE,
        title: `Duplicate supplier invoice ${row.supplierInvoiceNumber}`,
        description: `Duplicate of invoice ${duplicate.internalInvoiceNumber}.`,
        matchId: null,
      });
      await this.recordInvoicePerformance(context, row.profileId, invoiceId, {
        measureCode: PERFORMANCE_MEASURE_CODES.INVOICE_DUPLICATE,
        sourceKey: `invoice:${invoiceId}:perf:duplicate`,
      });
      if (duplicateBlocksCapture(control.duplicatePolicy)) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVOICE_DUPLICATE, undefined, 409);
      }
      return this.toView(context.businessId, updated);
    }

    const captured = await this.deps.store.updateInvoice(context.businessId, invoiceId, {
      status: INVOICE_STATUSES.CAPTURED,
      capturedAt: new Date(),
      capturedBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.audit(context, invoiceId, PROCUREMENT_AUDIT_ACTIONS.INVOICE_CAPTURED);
    return this.runMatch(context, actor, captured.id);
  }

  async runMatch(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    invoiceId: string
  ): Promise<InvoiceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.INVOICE_MATCH);
    const row = requireInvoice(
      await this.deps.store.findInvoiceById(context.businessId, invoiceId)
    );

    const idempotencyKey = buildMatchIdempotencyKey(row.id, row.matchVersion);
    const existing = await this.deps.store.findMatchByIdempotencyKey(
      context.businessId,
      idempotencyKey
    );
    if (existing) {
      return this.toView(context.businessId, row);
    }

    if (
      row.status !== INVOICE_STATUSES.CAPTURED &&
      row.status !== INVOICE_STATUSES.UNMATCHED &&
      row.status !== INVOICE_STATUSES.VARIANCE
    ) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.MATCH_NOT_ALLOWED, undefined, 409);
    }

    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    const invoiceLines = await this.deps.store.listInvoiceLines(invoiceId);
    const poLines = row.purchaseOrderVersionId
      ? await this.deps.poStore.listLines(row.purchaseOrderVersionId)
      : [];

    const receiptContext = await this.loadReceiptContext(context.businessId, row.purchaseOrderId);
    const explicitMatchingMode = row.matchingMode?.trim() || null;
    const tolerances = {
      pricePercent: parseInvoiceAmount(control.priceTolerancePercent),
      quantityPercent: parseInvoiceAmount(control.quantityTolerancePercent),
      taxAmount: parseInvoiceAmount(control.taxToleranceAmount),
    };

    const lineEvaluations: Array<{
      withinTolerance: boolean;
      varianceType: string | null;
      record: InvoiceMatchLineRecord;
    }> = [];

    let priceVariance = 0;
    let quantityVariance = 0;
    let taxVariance = 0;

    for (const line of invoiceLines) {
      const poLine = line.poLineId ? poLines.find((item) => item.id === line.poLineId) ?? null : null;
      const lineType = poLine?.lineType ?? "INVENTORY";
      const effectiveMode = resolveMatchingModeForLine(lineType, control, explicitMatchingMode);
      const receipt = line.poLineId ? receiptContext.byPoLine.get(line.poLineId) : undefined;
      const evaluation = evaluateLineMatch({
        matchingMode: effectiveMode,
        poLine: poLine
          ? {
              id: poLine.id,
              quantity: poLine.quantity,
              lineTotal: poLine.lineTotal,
              lineType: poLine.lineType,
            }
          : null,
        invoiceLine: {
          id: line.id,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
          lineTax: line.lineTax,
        },
        receivedQuantity: receipt?.receivedQuantity ?? null,
        receiptLineId: receipt?.receiptLineId ?? null,
        inspectionStatus: receipt?.inspectionStatus ?? null,
        tolerances,
      });

      if (evaluation.varianceAmount) {
        if (evaluation.varianceType?.includes("PRICE")) {
          priceVariance += parseInvoiceAmount(evaluation.varianceAmount);
        } else if (evaluation.varianceType?.includes("QUANTITY")) {
          quantityVariance += parseInvoiceAmount(evaluation.varianceAmount);
        } else if (evaluation.varianceType?.includes("TAX")) {
          taxVariance += parseInvoiceAmount(evaluation.varianceAmount);
        }
      }

      lineEvaluations.push({
        withinTolerance: evaluation.withinTolerance,
        varianceType: evaluation.varianceType,
        record: {
          id: randomUUID(),
          businessId: context.businessId,
          matchId: "",
          invoiceLineId: line.id,
          poLineId: line.poLineId,
          receiptLineId: evaluation.receiptLineId,
          poQuantity: poLine?.quantity ?? null,
          receiptQuantity: evaluation.receiptQuantity,
          invoiceQuantity: line.quantity,
          poAmount: poLine?.lineTotal ?? null,
          invoiceAmount: line.lineTotal,
          varianceType: evaluation.varianceType,
          varianceAmount: evaluation.varianceAmount,
          withinTolerance: evaluation.withinTolerance,
        },
      });
    }

    const outcome = aggregateMatchOutcome(lineEvaluations);
    const status = statusForMatchOutcome(outcome);
    const matchId = randomUUID();
    const recordedMatchingMode =
      explicitMatchingMode ??
      resolveMatchingModeForLine(
        poLines[0]?.lineType ?? "INVENTORY",
        control,
        null
      );
    const match = await this.deps.store.insertMatch({
      id: matchId,
      businessId: context.businessId,
      invoiceId,
      matchingMode: recordedMatchingMode,
      outcome,
      idempotencyKey,
      priceVarianceAmount: String(priceVariance),
      quantityVarianceAmount: String(quantityVariance),
      taxVarianceAmount: String(taxVariance),
      summary:
        outcome === MATCH_OUTCOMES.MATCHED
          ? "Invoice matched within configured tolerance."
          : "Match variances detected.",
    });
    await this.deps.store.insertMatchLines(
      lineEvaluations.map((row) => ({ ...row.record, matchId: match.id }))
    );

    const updated = await this.deps.store.updateInvoice(context.businessId, invoiceId, {
      status,
      matchOutcome: outcome,
      matchedAt: new Date(),
      matchIdempotencyKey: idempotencyKey,
      updatedBy: actorId(context),
    });

    const auditAction =
      outcome === MATCH_OUTCOMES.MATCHED
        ? PROCUREMENT_AUDIT_ACTIONS.INVOICE_MATCHED
        : outcome === MATCH_OUTCOMES.UNMATCHED
          ? PROCUREMENT_AUDIT_ACTIONS.INVOICE_UNMATCHED
          : PROCUREMENT_AUDIT_ACTIONS.INVOICE_VARIANCE;
    await this.audit(context, invoiceId, auditAction, { outcome });

    if (outcome !== MATCH_OUTCOMES.MATCHED) {
      const primaryVariance =
        lineEvaluations.find((row) => !row.withinTolerance)?.varianceType ?? null;
      await this.raiseInvoiceException(context, actor, updated, {
        sourceKey: `invoice:${invoiceId}:match:${row.matchVersion}`,
        exceptionTypeCode: mapMatchOutcomeToExceptionType(outcome, primaryVariance),
        title: `Invoice ${row.supplierInvoiceNumber} match ${outcome.toLowerCase()}`,
        description: match.summary,
        matchId: match.id,
      });
      await this.recordInvoicePerformance(context, row.profileId, invoiceId, {
        measureCode: PERFORMANCE_MEASURE_CODES.INVOICE_VARIANCE,
        sourceKey: `invoice:${invoiceId}:perf:match:${row.matchVersion}`,
      });
    }

    return this.toView(context.businessId, updated);
  }

  async approve(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    invoiceId: string
  ): Promise<InvoiceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.INVOICE_APPROVE);
    const row = requireInvoice(
      await this.deps.store.findInvoiceById(context.businessId, invoiceId)
    );
    assertCanApprove(row.status, row.matchOutcome);

    const supplier = await this.deps.suggestedSupplier.resolve(context.businessId, row.profileId);
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    if (
      supplier?.profile.statusCode === PROCUREMENT_STATUS_CODES.BLACKLISTED &&
      !control.allowBlacklistedPaymentReady
    ) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVOICE_BLACKLISTED, undefined, 409);
    }

    const approved = await this.deps.store.updateInvoice(context.businessId, invoiceId, {
      status: INVOICE_STATUSES.APPROVED,
      approvedAt: new Date(),
      approvedBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.audit(context, invoiceId, PROCUREMENT_AUDIT_ACTIONS.INVOICE_APPROVED);
    return this.createPaymentReadyHandoff(context, approved);
  }

  async reject(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    invoiceId: string,
    input: InvoiceDecisionCommand
  ): Promise<InvoiceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.INVOICE_REJECT);
    const row = requireInvoice(
      await this.deps.store.findInvoiceById(context.businessId, invoiceId)
    );
    if (row.status === INVOICE_STATUSES.REJECTED || row.status === INVOICE_STATUSES.PAYMENT_READY) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVOICE_NOT_APPROVABLE, undefined, 409);
    }
    const updated = await this.deps.store.updateInvoice(context.businessId, invoiceId, {
      status: INVOICE_STATUSES.REJECTED,
      rejectedAt: new Date(),
      rejectedBy: actorId(context),
      rejectionReason: input.reason?.trim() || null,
      updatedBy: actorId(context),
    });
    await this.audit(context, invoiceId, PROCUREMENT_AUDIT_ACTIONS.INVOICE_REJECTED, {
      reason: input.reason ?? "",
    });
    return this.toView(context.businessId, updated);
  }

  private async createPaymentReadyHandoff(
    context: CurrentBusinessContext,
    row: Awaited<ReturnType<InvoiceStorePort["findInvoiceById"]>> & object
  ) {
    const idempotencyKey = buildApHandoffIdempotencyKey(row.id);
    const existing = await this.deps.store.findApHandoffByIdempotencyKey(
      context.businessId,
      idempotencyKey
    );
    if (existing?.status === AP_HANDOFF_STATUSES.SUCCEEDED) {
      return this.toView(context.businessId, row);
    }

    const handoffId = randomUUID();
    const pending = await this.deps.store.insertApHandoff({
      id: handoffId,
      businessId: context.businessId,
      invoiceId: row.id,
      status: AP_HANDOFF_STATUSES.PENDING,
      payeePartyId: row.partyId,
      amount: row.totalAmount,
      currencyCode: row.currencyCode,
      dueDate: row.dueDate,
      purchaseOrderId: row.purchaseOrderId,
      supplierInvoiceNumber: row.supplierInvoiceNumber,
      internalInvoiceNumber: row.internalInvoiceNumber,
      downstreamSystem: "AP",
      downstreamReference: null,
      idempotencyKey,
      errorMessage: null,
      attemptedAt: new Date(),
      completedAt: null,
    });
    await this.audit(context, row.id, PROCUREMENT_AUDIT_ACTIONS.AP_HANDOFF_CREATED);

    const result = await this.deps.apHandoff.processHandoff({
      businessId: context.businessId,
      invoiceId: row.id,
      payeePartyId: row.partyId,
      amount: row.totalAmount,
      currencyCode: row.currencyCode,
      dueDate: row.dueDate,
      purchaseOrderId: row.purchaseOrderId,
      supplierInvoiceNumber: row.supplierInvoiceNumber,
      internalInvoiceNumber: row.internalInvoiceNumber,
      idempotencyKey,
    });

    if (!result.success) {
      await this.deps.store.updateApHandoff(context.businessId, pending.id, {
        status: AP_HANDOFF_STATUSES.FAILED,
        errorMessage: result.errorMessage,
        completedAt: new Date(),
      });
      await this.audit(context, row.id, PROCUREMENT_AUDIT_ACTIONS.AP_HANDOFF_FAILED);
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.HANDOFF_FAILED, undefined, 502);
    }

    await this.deps.store.updateApHandoff(context.businessId, pending.id, {
      status: AP_HANDOFF_STATUSES.SUCCEEDED,
      downstreamReference: result.handoffReference,
      completedAt: new Date(),
    });
    const paymentReady = await this.deps.store.updateInvoice(context.businessId, row.id, {
      status: INVOICE_STATUSES.PAYMENT_READY,
      paymentReadyAt: new Date(),
      updatedBy: actorId(context),
    });
    await this.audit(context, row.id, PROCUREMENT_AUDIT_ACTIONS.AP_HANDOFF_SUCCEEDED, {
      downstreamReference: result.handoffReference ?? "",
    });
    return this.toView(context.businessId, paymentReady);
  }

  private async loadReceiptContext(businessId: string, purchaseOrderId: string | null) {
    const byPoLine = new Map<
      string,
      { receivedQuantity: string; receiptLineId: string | null; inspectionStatus: string | null }
    >();
    if (!purchaseOrderId) {
      return { byPoLine };
    }
    const receipts = await this.deps.receivingStore.listReceiptsByPurchaseOrder(
      businessId,
      purchaseOrderId
    );
    for (const receipt of receipts) {
      if (receipt.status !== RECEIPT_STATUSES.CONFIRMED) {
        continue;
      }
      const lines = await this.deps.receivingStore.listReceiptLines(receipt.id);
      for (const line of lines) {
        const current = byPoLine.get(line.poLineId);
        const quantities = current?.receivedQuantity
          ? [current.receivedQuantity, line.quantityReceived]
          : [line.quantityReceived];
        byPoLine.set(line.poLineId, {
          receivedQuantity: sumReceivedQuantities(quantities),
          receiptLineId: line.id,
          inspectionStatus: receipt.inspectionStatus,
        });
      }
    }
    return { byPoLine };
  }

  private async toView(businessId: string, row: NonNullable<Awaited<ReturnType<InvoiceStorePort["findInvoiceById"]>>>) {
    const supplier = await this.deps.suggestedSupplier.resolve(businessId, row.profileId);
    const po = row.purchaseOrderId
      ? await this.deps.poStore.findById(businessId, row.purchaseOrderId)
      : null;
    const lines = await this.deps.store.listInvoiceLines(row.id);
    const matches = await this.deps.store.listMatchesByInvoice(row.id);
    const latestMatch = matches.at(-1) ?? null;
    const matchLines = latestMatch
      ? await this.deps.store.listMatchLines(latestMatch.id)
      : [];
    const handoff = await this.deps.store.findApHandoffByInvoice(businessId, row.id);

    return {
      id: row.id,
      internalInvoiceNumber: row.internalInvoiceNumber,
      supplierInvoiceNumber: row.supplierInvoiceNumber,
      profileId: row.profileId,
      supplierName: supplier?.party.displayName ?? "Supplier",
      purchaseOrderId: row.purchaseOrderId,
      poNumber: po?.poNumber ?? null,
      purchaseOrderVersionId: row.purchaseOrderVersionId,
      invoiceDate: row.invoiceDate,
      dueDate: row.dueDate,
      currencyCode: row.currencyCode,
      subtotalAmount: row.subtotalAmount,
      taxAmount: row.taxAmount,
      totalAmount: row.totalAmount,
      taxReference: row.taxReference,
      attachmentDocumentId: row.attachmentDocumentId,
      status: row.status,
      statusLabel: invoiceStatusLabel(row.status),
      matchOutcome: row.matchOutcome,
      matchingMode: row.matchingMode,
      duplicateFlag: row.duplicateFlag,
      duplicateOfInvoiceId: row.duplicateOfInvoiceId,
      lines: lines.map((line) => ({
        id: line.id,
        sequence: line.sequence,
        poLineId: line.poLineId,
        description: line.description,
        quantity: line.quantity,
        uom: line.uom,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        lineSubtotal: line.lineSubtotal,
        lineTax: line.lineTax,
        lineTotal: line.lineTotal,
        taxReference: line.taxReference,
      })),
      latestMatch: latestMatch
        ? {
            id: latestMatch.id,
            matchingMode: latestMatch.matchingMode,
            outcome: latestMatch.outcome,
            priceVarianceAmount: latestMatch.priceVarianceAmount,
            quantityVarianceAmount: latestMatch.quantityVarianceAmount,
            taxVarianceAmount: latestMatch.taxVarianceAmount,
            summary: latestMatch.summary,
            lines: matchLines.map((line) => {
              const invoiceLine = lines.find((item) => item.id === line.invoiceLineId);
              return {
                id: line.id,
                invoiceLineId: line.invoiceLineId,
                poLineId: line.poLineId,
                description: invoiceLine?.description ?? "",
                poQuantity: line.poQuantity,
                receiptQuantity: line.receiptQuantity,
                invoiceQuantity: line.invoiceQuantity,
                poAmount: line.poAmount,
                invoiceAmount: line.invoiceAmount,
                varianceType: line.varianceType,
                varianceAmount: line.varianceAmount,
                withinTolerance: line.withinTolerance,
              };
            }),
          }
        : null,
      apHandoff: handoff
        ? {
            id: handoff.id,
            status: handoff.status,
            downstreamSystem: handoff.downstreamSystem,
            downstreamReference: handoff.downstreamReference,
            amount: handoff.amount,
            currencyCode: handoff.currencyCode,
            dueDate: handoff.dueDate,
            errorMessage: handoff.errorMessage,
          }
        : null,
      canCapture: row.status === INVOICE_STATUSES.DRAFT,
      canMatch:
        row.status === INVOICE_STATUSES.CAPTURED ||
        row.status === INVOICE_STATUSES.UNMATCHED ||
        row.status === INVOICE_STATUSES.VARIANCE,
      canApprove:
        row.status === INVOICE_STATUSES.PENDING_APPROVAL &&
        row.matchOutcome === MATCH_OUTCOMES.MATCHED,
      canReject:
        row.status !== INVOICE_STATUSES.REJECTED &&
        row.status !== INVOICE_STATUSES.PAYMENT_READY &&
        row.status !== INVOICE_STATUSES.CANCELLED,
      canViewPaymentReady: row.status === INVOICE_STATUSES.PAYMENT_READY,
    } satisfies InvoiceView;
  }

  private async allocateInvoiceNumber(businessId: string) {
    try {
      return await this.deps.numbering.allocate({
        businessId,
        documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.PROCUREMENT_SUPPLIER_INVOICE,
      });
    } catch (error) {
      if (error instanceof DocumentNumberingError) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.NUMBERING_POLICY_MISSING, undefined, 409);
      }
      throw error;
    }
  }

  private async recordInvoicePerformance(
    context: CurrentBusinessContext,
    profileId: string,
    invoiceId: string,
    input: { measureCode: string; sourceKey: string }
  ) {
    if (!this.deps.performance) {
      return;
    }
    await this.deps.performance.recordEvent({
      businessId: context.businessId,
      profileId,
      measureCode: input.measureCode,
      sourceType: PERFORMANCE_SOURCE_TYPES.INVOICE,
      sourceId: invoiceId,
      sourceKey: input.sourceKey,
      actorUserId: actorId(context),
    });
  }

  private async raiseInvoiceException(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    row: {
      id: string;
      profileId: string;
      supplierInvoiceNumber: string;
      purchaseOrderId: string | null;
    },
    input: {
      sourceKey: string;
      exceptionTypeCode: string;
      title: string;
      description: string | null;
      matchId: string | null;
    }
  ) {
    if (!this.deps.exceptions) {
      return;
    }
    const links = [
      { objectType: EXCEPTION_OBJECT_TYPES.INVOICE, objectId: row.id },
      ...(row.purchaseOrderId
        ? [{ objectType: EXCEPTION_OBJECT_TYPES.PURCHASE_ORDER, objectId: row.purchaseOrderId }]
        : []),
      ...(input.matchId
        ? [{ objectType: EXCEPTION_OBJECT_TYPES.MATCH, objectId: input.matchId }]
        : []),
      { objectType: EXCEPTION_OBJECT_TYPES.PROFILE, objectId: row.profileId },
    ];
    await this.deps.exceptions.raiseSystem({
      businessId: context.businessId,
      sourceKey: input.sourceKey,
      exceptionTypeCode: input.exceptionTypeCode,
      title: input.title,
      description: input.description,
      raisedFrom: EXCEPTION_RAISED_FROM.SYSTEM_MATCH,
      profileId: row.profileId,
      actorUserId: actorId(context),
      links,
    });
  }

  private async audit(
    context: CurrentBusinessContext,
    entityId: string,
    action: string,
    references?: Record<string, string>
  ) {
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityId,
      action,
      outcome: "SUCCESS",
      references,
    });
  }
}

export function createDefaultInvoiceDependencies(): InvoiceServiceDependencies {
  return {
    store: createInvoiceRepository(),
    poStore: createPurchaseOrderRepository(),
    receivingStore: createReceivingRepository(),
    controls: createInvoiceControlRepository(),
    numbering: new ConfigurableDocumentNumberingService(createDocumentNumberingPolicyRepository()),
    audit: createProcurementAuditAdapter(),
    suggestedSupplier: createSuggestedSupplierAdapter(),
    apHandoff: createInProcessApHandoffAdapter(),
    exceptions: createProcurementExceptionBridge(),
    performance: createProcurementPerformanceBridge(),
  };
}

export function createInvoiceService(
  overrides: Partial<InvoiceServiceDependencies> = {}
): InvoiceService {
  return new InvoiceService({ ...createDefaultInvoiceDependencies(), ...overrides });
}

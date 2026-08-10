/**
 * Purpose:
 * Sales order creation from accepted quotations — BP-006 handoff stub.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.4)
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { AUDIT_OPERATIONS, createAuditService } from "@/core/audit";
import { createOpportunityHandoffAdapter } from "@/modules/crm/adapters/opportunity-handoff-adapter";
import {
  CRM_TIMELINE_EVENT_TYPES,
  SALES_ORDER_HANDOFF_STATUS_CODES,
  SALES_ORDER_NUMBER_PREFIX,
  SALES_ORDER_STATUS_CODES,
} from "@/modules/crm/constants";
import { CrmError, CRM_USER_MESSAGES } from "@/modules/crm/errors";
import { createQuotationLineRepository } from "@/modules/crm/quotation/repositories/quotation-line-repository";
import { createQuotationRepository } from "@/modules/crm/quotation/repositories/quotation-repository";
import { createQuotationVersionRepository } from "@/modules/crm/quotation/repositories/quotation-version-repository";
import {
  createSalesOrderLineRepository,
  createSalesOrderRepository,
} from "@/modules/crm/quotation/repositories/sales-order-repository";
import {
  CRM_AUDIT_ENTITY_NAMES,
  recordCrmEntityAudit,
} from "@/modules/crm/quotation/services/crm-audit-helper";
import { canConvertQuotationToOrder } from "@/modules/crm/quotation/services/quotation-rules";
import type { SalesOrderDetailView } from "@/modules/crm/quotation/types";
import {
  createPartyTimelineService,
  PARTY_TIMELINE_EVENT_CATEGORIES,
} from "@/core/party-timeline";

const CRM_TIMELINE_SOURCE_MODULE = "crm_quotations";

export class SalesOrderService {
  constructor(
    private readonly salesOrderRepository = createSalesOrderRepository(),
    private readonly salesOrderLineRepository = createSalesOrderLineRepository(),
    private readonly quotationRepository = createQuotationRepository(),
    private readonly versionRepository = createQuotationVersionRepository(),
    private readonly lineRepository = createQuotationLineRepository(),
    private readonly opportunityAdapter = createOpportunityHandoffAdapter(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async createFromQuotation(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<SalesOrderDetailView> {
    const quotation = await this.quotationRepository.findById(
      context.businessId,
      quotationId
    );

    if (!quotation) {
      throw new CrmError(
        "QUOTATION_NOT_FOUND",
        CRM_USER_MESSAGES.QUOTATION_NOT_FOUND,
        404
      );
    }

    if (!canConvertQuotationToOrder(quotation.status, quotation.validUntil)) {
      throw new CrmError(
        "QUOTATION_EXPIRED",
        CRM_USER_MESSAGES.QUOTATION_EXPIRED,
        409
      );
    }

    const existing = await this.salesOrderRepository.findByQuotationId(
      context.businessId,
      quotationId
    );
    if (existing) {
      throw new CrmError(
        "SALES_ORDER_ALREADY_EXISTS",
        CRM_USER_MESSAGES.SALES_ORDER_ALREADY_EXISTS,
        409
      );
    }

    const version = await this.versionRepository.findByQuotationAndNumber(
      context.businessId,
      quotationId,
      quotation.currentVersionNumber
    );
    if (!version) {
      throw new CrmError(
        "QUOTATION_VERSION_NOT_FOUND",
        CRM_USER_MESSAGES.QUOTATION_VERSION_NOT_FOUND,
        404
      );
    }

    const lines = await this.lineRepository.listByVersionIdWithRelations(
      context.businessId,
      version.id
    );

    const orderNumber = await this.generateOrderNumber(context.businessId);

    const order = await this.salesOrderRepository.insert({
      businessId: context.businessId,
      orderNumber,
      quotationId,
      quotationVersionId: version.id,
      crmRecordId: quotation.crmRecordId,
      partyId: quotation.partyId,
      accountId: quotation.accountId,
      opportunityId: quotation.opportunityId,
      status: SALES_ORDER_STATUS_CODES.HANDOFF_READY,
      currencyCode: quotation.currencyCode,
      subtotal: version.subtotal,
      taxAmount: version.taxAmount,
      grandTotal: version.grandTotal,
      handoffStatus: SALES_ORDER_HANDOFF_STATUS_CODES.PENDING,
      createdBy: context.platformUserId ?? null,
      updatedBy: context.platformUserId ?? null,
    });

    const orderLines = await this.salesOrderLineRepository.insertMany(
      lines.map(({ line }) => ({
        businessId: context.businessId,
        salesOrderId: order.id,
        lineNumber: line.lineNumber,
        offeringId: line.offeringId,
        offeringVariantId: line.offeringVariantId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        quotationLineId: line.id,
      }))
    );

    if (quotation.opportunityId) {
      await this.opportunityAdapter.onSalesOrderCreated(context, {
        opportunityId: quotation.opportunityId,
        quotationId,
        salesOrderId: order.id,
        stageCode: "ORDER_CREATED",
      });
    }

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: quotation.partyId,
      entityName: "sales_order",
      entityId: order.id,
      operation: AUDIT_OPERATIONS.CREATE,
      createValues: {
        orderNumber: order.orderNumber,
        quotationId,
      },
    });

    await this.timelineService.recordEvent({
      businessId: context.businessId,
      partyId: quotation.partyId,
      eventType: CRM_TIMELINE_EVENT_TYPES.SALES_ORDER_CREATED,
      eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
      sourceModule: CRM_TIMELINE_SOURCE_MODULE,
      referenceEntity: CRM_AUDIT_ENTITY_NAMES.QUOTATION,
      referenceId: quotationId,
      summary: `Sales order ${order.orderNumber} created from quotation ${quotation.quotationNumber}`,
      performedByUserId: context.platformUserId ?? null,
      metadata: { salesOrderId: order.id, orderNumber: order.orderNumber },
    });

    return this.mapDetailView(order, orderLines);
  }

  async getByQuotationId(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<SalesOrderDetailView | null> {
    const order = await this.salesOrderRepository.findByQuotationId(
      context.businessId,
      quotationId
    );
    if (!order) {
      return null;
    }
    const lines = await this.salesOrderLineRepository.listBySalesOrderId(
      context.businessId,
      order.id
    );
    return this.mapDetailView(order, lines);
  }

  private async generateOrderNumber(businessId: string): Promise<string> {
    const count = await this.salesOrderRepository.countAll(businessId);
    return `${SALES_ORDER_NUMBER_PREFIX}-${String(count + 1).padStart(6, "0")}`;
  }

  private mapDetailView(
    order: NonNullable<
      Awaited<ReturnType<SalesOrderRepository["findById"]>>
    >,
    lines: Awaited<
      ReturnType<SalesOrderLineRepository["listBySalesOrderId"]>
    >
  ): SalesOrderDetailView {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      quotationId: order.quotationId,
      quotationVersionId: order.quotationVersionId,
      partyId: order.partyId,
      accountId: order.accountId,
      opportunityId: order.opportunityId,
      status: order.status,
      handoffStatus: order.handoffStatus,
      currencyCode: order.currencyCode,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      grandTotal: Number(order.grandTotal),
      lines: lines.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        offeringId: line.offeringId,
        description: line.description,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        lineTotal: Number(line.lineTotal),
        quotationLineId: line.quotationLineId,
      })),
      createdAt: order.createdAt.toISOString(),
    };
  }
}

type SalesOrderRepository = ReturnType<typeof createSalesOrderRepository>;
type SalesOrderLineRepository = ReturnType<typeof createSalesOrderLineRepository>;

export function createSalesOrderService() {
  return new SalesOrderService();
}

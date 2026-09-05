/**
 * Purpose:
 * Quotation lifecycle orchestration — create, edit, send, accept/reject/expire, revise.
 *
 * Architecture:
 * Server Actions → QuotationService → Repositories / Adapters → Drizzle
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.3)
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { AUDIT_OPERATIONS, createAuditService } from "@/core/audit";
import {
  createPartyTimelineService,
  PARTY_TIMELINE_EVENT_CATEGORIES,
} from "@/core/party-timeline";
import { createOpportunityHandoffAdapter } from "@/modules/crm/adapters/opportunity-handoff-adapter";
import { createQuotationDocumentAdapter } from "@/modules/crm/adapters/quotation-document-adapter";
import { createPricingResolutionAdapter } from "@/modules/crm/adapters/pricing-resolution-adapter";
import {
  CRM_TIMELINE_EVENT_TYPES,
  QUOTATION_ACCEPTANCE_CHANNELS,
  QUOTATION_APPROVAL_STATUS_CODES,
  QUOTATION_DEFAULT_VALIDITY_DAYS,
  QUOTATION_IDEMPOTENCY_OPERATIONS,
  QUOTATION_NUMBER_PREFIX,
  QUOTATION_STATUS_CODES,
  approvalStatusLabel,
  quotationStatusLabel,
  type QuotationStatusCode,
} from "@/modules/crm/constants";
import { CrmError, CRM_ERROR_CODES, CRM_USER_MESSAGES } from "@/modules/crm/errors";
import { createQuotationIdempotencyRepository } from "@/modules/crm/quotation/repositories/quotation-idempotency-repository";
import type { QuotationIdempotencyRepositoryPort } from "@/modules/crm/quotation/repositories/quotation-idempotency-repository";
import { createQuotationLineRepository } from "@/modules/crm/quotation/repositories/quotation-line-repository";
import { createQuotationRepository } from "@/modules/crm/quotation/repositories/quotation-repository";
import { createQuotationVersionRepository } from "@/modules/crm/quotation/repositories/quotation-version-repository";
import {
  CRM_AUDIT_ENTITY_NAMES,
  recordCrmEntityAudit,
} from "@/modules/crm/quotation/services/crm-audit-helper";
import { createQuotationCalculationService } from "@/modules/crm/quotation/services/quotation-calculation-service";
import {
  canTransitionQuotationStatus,
  isQuotationEditable,
  isQuotationExpiredByDate,
  isQuotationVersionLocked,
  nextRevisionVersionNumber,
  resolveDefaultValidUntil,
  resolveEffectiveQuotationStatus,
  timelineEventForStatusTransition,
} from "@/modules/crm/quotation/services/quotation-rules";
import type {
  AddQuotationLinePayload,
  CreateQuotationPayload,
  QuotationDashboardView,
  QuotationDetailView,
  QuotationDocumentView,
  QuotationLineView,
  QuotationSearchFilters,
  QuotationSearchResultView,
  QuotationSummaryView,
  QuotationVersionView,
  ReviseQuotationPayload,
  UpdateQuotationHeaderPayload,
  UpdateQuotationLinePayload,
} from "@/modules/crm/quotation/types";
import {
  canSendQuotationWithApproval,
  canSubmitForApproval,
  resolveRequiredApprovalStatus,
} from "@/modules/crm/quotation/services/quotation-approval-rules";
import { createSalesOrderService } from "@/modules/crm/quotation/services/sales-order-service";
import {
  createQuotationLineSchema,
  createQuotationSchema,
  quotationSearchFiltersSchema,
  reviseQuotationSchema,
  transitionQuotationStatusSchema,
  updateQuotationHeaderSchema,
  updateQuotationLineSchema,
} from "@/modules/crm/quotation/validators/quotation-validators";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";

const CRM_TIMELINE_SOURCE_MODULE = "crm_quotations";

type QuotationRow = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createQuotationRepository>["findById"]>>
>;

export class QuotationService {
  constructor(
    private readonly quotationRepository = createQuotationRepository(),
    private readonly versionRepository = createQuotationVersionRepository(),
    private readonly lineRepository = createQuotationLineRepository(),
    private readonly partyRepository = createPartyRepository(),
    private readonly pricingAdapter = createPricingResolutionAdapter(),
    private readonly calculationService = createQuotationCalculationService(),
    private readonly documentAdapter = createQuotationDocumentAdapter(),
    private readonly salesOrderService = createSalesOrderService(),
    private readonly opportunityAdapter = createOpportunityHandoffAdapter(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly idempotency: QuotationIdempotencyRepositoryPort | null = createQuotationIdempotencyRepository()
  ) {}

  async createQuotation(
    context: CurrentBusinessContext,
    payload: CreateQuotationPayload
  ): Promise<QuotationDetailView> {
    const idempotencyKey = payload.idempotencyKey?.trim();
    if (payload.requireIdempotencyKey && !idempotencyKey) {
      throw new CrmError(
        CRM_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED,
        CRM_USER_MESSAGES.IDEMPOTENCY_KEY_REQUIRED,
        400,
        "idempotencyKey"
      );
    }

    if (idempotencyKey && this.idempotency) {
      const existing = await this.idempotency.find(
        context.businessId,
        QUOTATION_IDEMPOTENCY_OPERATIONS.CREATE_QUOTATION,
        idempotencyKey
      );
      if (existing) {
        if (
          payload.idempotencyPayloadHash &&
          existing.payloadHash !== payload.idempotencyPayloadHash
        ) {
          throw new CrmError(
            CRM_ERROR_CODES.IDEMPOTENCY_PAYLOAD_MISMATCH,
            CRM_USER_MESSAGES.IDEMPOTENCY_PAYLOAD_MISMATCH,
            409
          );
        }
        return this.getQuotationDetail(context, existing.resourceId);
      }
    }

    /**
     * Claim-first idempotency: reserve the key before creating the quotation so
     * concurrent callers with the same key converge on one resource id.
     */
    let claimedResourceId: string | null = null;
    if (idempotencyKey && this.idempotency) {
      claimedResourceId = crypto.randomUUID();
      try {
        await this.idempotency.insert({
          businessId: context.businessId,
          idempotencyKey,
          operationType: QUOTATION_IDEMPOTENCY_OPERATIONS.CREATE_QUOTATION,
          payloadHash: payload.idempotencyPayloadHash ?? "",
          resourceType: "quotation",
          resourceId: claimedResourceId,
          createdBy: context.platformUserId ?? null,
        });
      } catch (error) {
        const raced = await this.idempotency.find(
          context.businessId,
          QUOTATION_IDEMPOTENCY_OPERATIONS.CREATE_QUOTATION,
          idempotencyKey
        );
        if (raced) {
          if (
            payload.idempotencyPayloadHash &&
            raced.payloadHash !== payload.idempotencyPayloadHash
          ) {
            throw new CrmError(
              CRM_ERROR_CODES.IDEMPOTENCY_PAYLOAD_MISMATCH,
              CRM_USER_MESSAGES.IDEMPOTENCY_PAYLOAD_MISMATCH,
              409
            );
          }
          // Winner may still be inserting the quotation row — brief retry.
          for (let attempt = 0; attempt < 20; attempt += 1) {
            try {
              return await this.getQuotationDetail(context, raced.resourceId);
            } catch {
              await new Promise((resolve) =>
                setTimeout(resolve, 50 * (attempt + 1))
              );
            }
          }
          return this.getQuotationDetail(context, raced.resourceId);
        }
        if (
          error instanceof CrmError &&
          error.code === CRM_ERROR_CODES.IDEMPOTENCY_CONFLICT
        ) {
          throw error;
        }
        throw error;
      }
    }

    const {
      idempotencyKey: _ignoredKey,
      idempotencyPayloadHash: _ignoredHash,
      requireIdempotencyKey: _ignoredRequire,
      ...createPayload
    } = payload;
    void _ignoredKey;
    void _ignoredHash;
    void _ignoredRequire;

    const parsed = createQuotationSchema.safeParse(createPayload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmError(
        "INVALID_INPUT",
        first?.message ?? CRM_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    await this.requireParty(context, parsed.data.partyId);

    const quotationNumber = await this.generateQuotationNumber(context.businessId);
    const validUntil = parsed.data.validUntil
      ? new Date(parsed.data.validUntil)
      : resolveDefaultValidUntil(new Date(), QUOTATION_DEFAULT_VALIDITY_DAYS);

    const quotationRow = await this.quotationRepository.insert({
      ...(claimedResourceId ? { id: claimedResourceId } : {}),
      businessId: context.businessId,
      quotationNumber,
      partyId: parsed.data.partyId,
      crmRecordId: parsed.data.crmRecordId,
      accountId: parsed.data.accountId,
      opportunityId: parsed.data.opportunityId,
      status: QUOTATION_STATUS_CODES.DRAFT,
      currencyCode: parsed.data.currencyCode,
      pricingCatalogueId: parsed.data.pricingCatalogueId,
      customerSegment: parsed.data.customerSegment ?? null,
      salesChannel: parsed.data.salesChannel ?? null,
      region: parsed.data.region ?? null,
      validUntil,
      currentVersionNumber: 1,
      ownerUserId: parsed.data.ownerUserId ?? context.platformUserId ?? null,
      notes: parsed.data.notes ?? null,
      termsTemplateCode: parsed.data.termsTemplateCode ?? null,
      metadata: parsed.data.metadata ?? null,
      createdBy: context.platformUserId ?? null,
      updatedBy: context.platformUserId ?? null,
    });

    const versionRow = await this.versionRepository.insert({
      businessId: context.businessId,
      quotationId: quotationRow.id,
      versionNumber: 1,
      status: QUOTATION_STATUS_CODES.DRAFT,
      createdBy: context.platformUserId ?? null,
    });

    if (parsed.data.lines?.length) {
      for (const [index, line] of parsed.data.lines.entries()) {
        await this.insertLineForVersion(context, quotationRow, versionRow.id, {
          ...line,
          lineNumber: index + 1,
        });
      }
      await this.recalculateVersionTotals(context, quotationRow.id, versionRow.id);
    }

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: quotationRow.partyId,
      entityName: CRM_AUDIT_ENTITY_NAMES.QUOTATION,
      entityId: quotationRow.id,
      operation: AUDIT_OPERATIONS.CREATE,
      createValues: {
        quotationNumber: quotationRow.quotationNumber,
        status: quotationRow.status,
        partyId: quotationRow.partyId,
      },
    });

    await this.recordTimelineEvent(context, quotationRow, {
      eventType: CRM_TIMELINE_EVENT_TYPES.QUOTATION_CREATED,
      summary: `Quotation ${quotationRow.quotationNumber} created`,
    });

    return this.getQuotationDetail(context, quotationRow.id);
  }

  async getQuotationDetail(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<QuotationDetailView> {
    const row = await this.requireQuotation(context, quotationId);
    await this.applyExpiryIfNeeded(context, row);
    return this.mapDetailView(context, row);
  }

  async getQuotationByNumber(
    context: CurrentBusinessContext,
    quotationNumber: string
  ): Promise<QuotationDetailView> {
    const row = await this.quotationRepository.findByNumber(
      context.businessId,
      quotationNumber
    );
    if (!row) {
      throw new CrmError(
        CRM_ERROR_CODES.QUOTATION_NOT_FOUND,
        CRM_USER_MESSAGES.QUOTATION_NOT_FOUND,
        404
      );
    }
    await this.applyExpiryIfNeeded(context, row);
    return this.mapDetailView(context, row);
  }

  async searchQuotations(
    context: CurrentBusinessContext,
    filters: QuotationSearchFilters
  ): Promise<QuotationSearchResultView> {
    const parsed = quotationSearchFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmError(
        "INVALID_INPUT",
        first?.message ?? CRM_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const { rows, totalCount } = await this.quotationRepository.search(
      context.businessId,
      {
        ...parsed.data,
        partyId: parsed.data.partyId ?? undefined,
        accountId: parsed.data.accountId ?? undefined,
        opportunityId: parsed.data.opportunityId ?? undefined,
        crmRecordId: parsed.data.crmRecordId ?? undefined,
        ownerUserId: parsed.data.ownerUserId ?? undefined,
        validUntilBefore: parsed.data.validUntilBefore ?? undefined,
        validUntilAfter: parsed.data.validUntilAfter ?? undefined,
        query: parsed.data.query || undefined,
      }
    );

    const items = await Promise.all(
      rows.map(async ({ quotation, partyDisplayName }) => {
        const effective = await this.resolveRowWithExpiry(context, quotation);
        const version = await this.versionRepository.findByQuotationAndNumber(
          context.businessId,
          effective.id,
          effective.currentVersionNumber
        );
        return this.mapSummaryView(
          effective,
          partyDisplayName,
          version ? Number(version.grandTotal) : 0
        );
      })
    );

    return {
      items,
      totalCount,
      page: parsed.data.page ?? 1,
      pageSize: parsed.data.pageSize ?? 25,
    };
  }

  async updateQuotationHeader(
    context: CurrentBusinessContext,
    quotationId: string,
    payload: UpdateQuotationHeaderPayload
  ): Promise<QuotationDetailView> {
    const quotationRow = await this.requireEditableQuotation(context, quotationId);
    const parsed = updateQuotationHeaderSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmError(
        "INVALID_INPUT",
        first?.message ?? CRM_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const before = { ...quotationRow };
    await this.quotationRepository.updateById(context.businessId, quotationId, {
      currencyCode: parsed.data.currencyCode,
      pricingCatalogueId: parsed.data.pricingCatalogueId,
      customerSegment: parsed.data.customerSegment,
      salesChannel: parsed.data.salesChannel,
      region: parsed.data.region,
      validUntil: parsed.data.validUntil
        ? new Date(parsed.data.validUntil)
        : parsed.data.validUntil === null
          ? null
          : undefined,
      ownerUserId: parsed.data.ownerUserId,
      notes: parsed.data.notes,
      termsTemplateCode: parsed.data.termsTemplateCode,
      metadata: parsed.data.metadata,
      updatedBy: context.platformUserId ?? null,
    });

    const updated = await this.requireQuotation(context, quotationId);

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: updated.partyId,
      entityName: CRM_AUDIT_ENTITY_NAMES.QUOTATION,
      entityId: quotationId,
      operation: AUDIT_OPERATIONS.UPDATE,
      before: before as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      trackFields: [
        "currencyCode",
        "pricingCatalogueId",
        "customerSegment",
        "salesChannel",
        "region",
        "validUntil",
        "notes",
      ],
    });

    return this.mapDetailView(context, updated);
  }

  async addQuotationLine(
    context: CurrentBusinessContext,
    quotationId: string,
    payload: AddQuotationLinePayload
  ): Promise<QuotationDetailView> {
    const quotationRow = await this.requireEditableQuotation(context, quotationId);
    const parsed = createQuotationLineSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmError(
        "INVALID_INPUT",
        first?.message ?? CRM_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const version = await this.requireCurrentVersion(context, quotationRow);
    const lineNumber = await this.lineRepository.getNextLineNumber(
      context.businessId,
      version.id
    );

    await this.insertLineForVersion(context, quotationRow, version.id, {
      ...parsed.data,
      lineNumber,
    });
    await this.recalculateVersionTotals(context, quotationId, version.id);

    return this.getQuotationDetail(context, quotationId);
  }

  async updateQuotationLine(
    context: CurrentBusinessContext,
    quotationId: string,
    lineId: string,
    payload: UpdateQuotationLinePayload
  ): Promise<QuotationDetailView> {
    const quotationRow = await this.requireEditableQuotation(context, quotationId);
    const parsed = updateQuotationLineSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmError(
        "INVALID_INPUT",
        first?.message ?? CRM_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const version = await this.requireCurrentVersion(context, quotationRow);
    const existing = await this.lineRepository.findById(context.businessId, lineId);
    if (!existing || existing.quotationVersionId !== version.id) {
      throw new CrmError(
        "QUOTATION_LINE_NOT_FOUND",
        CRM_USER_MESSAGES.QUOTATION_LINE_NOT_FOUND,
        404
      );
    }

    const quantity = parsed.data.quantity ?? Number(existing.quantity);
    const unitPrice = parsed.data.unitPrice ?? Number(existing.unitPrice);
    const lineTotal = this.calculationService.calculateLine({
      lineNumber: existing.lineNumber,
      quantity,
      unitPrice,
    }).lineTotal;

    await this.lineRepository.updateById(context.businessId, lineId, {
      description: parsed.data.description,
      quantity: parsed.data.quantity?.toFixed(6),
      unitOfMeasureId: parsed.data.unitOfMeasureId,
      unitPrice: parsed.data.unitPrice?.toFixed(6),
      pricingItemId: parsed.data.pricingItemId,
      lineTotal: lineTotal.toFixed(6),
      metadata: parsed.data.metadata,
      updatedBy: context.platformUserId ?? null,
    });

    await this.recalculateVersionTotals(context, quotationId, version.id);
    return this.getQuotationDetail(context, quotationId);
  }

  async removeQuotationLine(
    context: CurrentBusinessContext,
    quotationId: string,
    lineId: string
  ): Promise<QuotationDetailView> {
    const quotationRow = await this.requireEditableQuotation(context, quotationId);
    const version = await this.requireCurrentVersion(context, quotationRow);
    const existing = await this.lineRepository.findById(context.businessId, lineId);
    if (!existing || existing.quotationVersionId !== version.id) {
      throw new CrmError(
        "QUOTATION_LINE_NOT_FOUND",
        CRM_USER_MESSAGES.QUOTATION_LINE_NOT_FOUND,
        404
      );
    }

    await this.lineRepository.deleteById(context.businessId, lineId);
    await this.recalculateVersionTotals(context, quotationId, version.id);
    return this.getQuotationDetail(context, quotationId);
  }

  async refreshQuotationPrices(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<QuotationDetailView> {
    const quotationRow = await this.requireEditableQuotation(context, quotationId);
    const version = await this.requireCurrentVersion(context, quotationRow);
    const lines = await this.lineRepository.listByVersionIdWithRelations(
      context.businessId,
      version.id
    );

    for (const { line } of lines) {
      const resolved = await this.pricingAdapter.resolveUnitPrice(context, {
        offeringId: line.offeringId,
        currencyCode: quotationRow.currencyCode,
        pricingCatalogueId: quotationRow.pricingCatalogueId ?? undefined,
        customerSegment: quotationRow.customerSegment,
        salesChannel: quotationRow.salesChannel,
        region: quotationRow.region,
      });

      const lineTotal = this.calculationService.calculateLine({
        lineNumber: line.lineNumber,
        quantity: Number(line.quantity),
        unitPrice: resolved.unitPrice,
      }).lineTotal;

      await this.lineRepository.updateById(context.businessId, line.id, {
        unitPrice: resolved.unitPrice.toFixed(6),
        pricingItemId: resolved.pricingItemId,
        lineTotal: lineTotal.toFixed(6),
        updatedBy: context.platformUserId ?? null,
      });
    }

    await this.recalculateVersionTotals(context, quotationId, version.id);
    return this.getQuotationDetail(context, quotationId);
  }

  async sendQuotation(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<QuotationDetailView> {
    const quotationRow = await this.requireQuotation(context, quotationId);
    this.assertStatusTransition(
      quotationRow.status as QuotationStatusCode,
      QUOTATION_STATUS_CODES.SENT
    );

    const version = await this.requireCurrentVersion(context, quotationRow);
    const lines = await this.lineRepository.listByVersionIdWithRelations(
      context.businessId,
      version.id
    );

    if (lines.length === 0) {
      throw new CrmError(
        "QUOTATION_LINE_REQUIRED",
        CRM_USER_MESSAGES.QUOTATION_LINE_REQUIRED,
        400
      );
    }

    await this.recalculateVersionTotals(context, quotationId, version.id);

    const refreshed = await this.requireQuotation(context, quotationId);

    if (!canSendQuotationWithApproval(refreshed.approvalStatus)) {
      throw new CrmError(
        "APPROVAL_REQUIRED",
        CRM_USER_MESSAGES.APPROVAL_REQUIRED,
        409
      );
    }

    const now = new Date();
    const validUntil =
      quotationRow.validUntil ??
      resolveDefaultValidUntil(now, QUOTATION_DEFAULT_VALIDITY_DAYS);

    await this.versionRepository.lockVersion(
      context.businessId,
      version.id,
      QUOTATION_STATUS_CODES.SENT,
      now
    );

    await this.quotationRepository.updateById(context.businessId, quotationId, {
      status: QUOTATION_STATUS_CODES.SENT,
      validUntil,
      updatedBy: context.platformUserId ?? null,
    });

    await this.recordStatusTimeline(context, quotationRow, QUOTATION_STATUS_CODES.SENT);

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: quotationRow.partyId,
      entityName: CRM_AUDIT_ENTITY_NAMES.QUOTATION,
      entityId: quotationId,
      operation: AUDIT_OPERATIONS.UPDATE,
      createValues: { status: QUOTATION_STATUS_CODES.SENT },
    });

    return this.getQuotationDetail(context, quotationId);
  }

  async acceptQuotation(
    context: CurrentBusinessContext,
    quotationId: string,
    options: {
      acceptanceChannel?: string;
    } = {}
  ): Promise<QuotationDetailView> {
    return this.transitionTerminalResponse(
      context,
      quotationId,
      QUOTATION_STATUS_CODES.ACCEPTED,
      {
        acceptanceChannel:
          options.acceptanceChannel ?? QUOTATION_ACCEPTANCE_CHANNELS.CRM,
      }
    );
  }

  async rejectQuotation(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<QuotationDetailView> {
    return this.transitionTerminalResponse(
      context,
      quotationId,
      QUOTATION_STATUS_CODES.REJECTED
    );
  }

  async expireQuotation(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<QuotationDetailView> {
    return this.transitionTerminalResponse(
      context,
      quotationId,
      QUOTATION_STATUS_CODES.EXPIRED
    );
  }

  async reviseQuotation(
    context: CurrentBusinessContext,
    quotationId: string,
    payload: ReviseQuotationPayload = {}
  ): Promise<QuotationDetailView> {
    const parsed = reviseQuotationSchema.safeParse({
      quotationId,
      ...payload,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmError(
        "INVALID_INPUT",
        first?.message ?? CRM_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const quotationRow = await this.requireQuotation(context, quotationId);
    const currentStatus = quotationRow.status as QuotationStatusCode;

    if (
      currentStatus !== QUOTATION_STATUS_CODES.SENT &&
      currentStatus !== QUOTATION_STATUS_CODES.REJECTED &&
      currentStatus !== QUOTATION_STATUS_CODES.EXPIRED
    ) {
      throw new CrmError(
        "INVALID_QUOTATION_STATUS_TRANSITION",
        CRM_USER_MESSAGES.INVALID_QUOTATION_STATUS_TRANSITION,
        409
      );
    }

    const currentVersion = await this.requireCurrentVersion(context, quotationRow);
    const currentLines = await this.lineRepository.listByVersionIdWithRelations(
      context.businessId,
      currentVersion.id
    );

    if (!isQuotationVersionLocked(currentVersion.status)) {
      await this.versionRepository.lockVersion(
        context.businessId,
        currentVersion.id,
        currentVersion.status,
        currentVersion.sentAt,
      );
    }

    const nextVersionNumber = nextRevisionVersionNumber(
      quotationRow.currentVersionNumber
    );

    const newVersion = await this.versionRepository.insert({
      businessId: context.businessId,
      quotationId,
      versionNumber: nextVersionNumber,
      status: QUOTATION_STATUS_CODES.DRAFT,
      revisionReason: parsed.data.revisionReason ?? null,
      subtotal: currentVersion.subtotal,
      taxAmount: currentVersion.taxAmount,
      grandTotal: currentVersion.grandTotal,
      createdBy: context.platformUserId ?? null,
    });

    if (currentLines.length > 0) {
      await this.lineRepository.insertMany(
        currentLines.map(({ line }) => ({
          businessId: context.businessId,
          quotationVersionId: newVersion.id,
          lineNumber: line.lineNumber,
          offeringId: line.offeringId,
          offeringVariantId: line.offeringVariantId,
          description: line.description,
          quantity: line.quantity,
          unitOfMeasureId: line.unitOfMeasureId,
          unitPrice: line.unitPrice,
          pricingItemId: line.pricingItemId,
          lineTotal: line.lineTotal,
          metadata: line.metadata as Record<string, unknown> | null,
          createdBy: context.platformUserId ?? null,
          updatedBy: context.platformUserId ?? null,
        }))
      );
    }

    await this.quotationRepository.updateById(context.businessId, quotationId, {
      status: QUOTATION_STATUS_CODES.DRAFT,
      currentVersionNumber: nextVersionNumber,
      validUntil: resolveDefaultValidUntil(new Date(), QUOTATION_DEFAULT_VALIDITY_DAYS),
      updatedBy: context.platformUserId ?? null,
    });

    await this.recordTimelineEvent(context, quotationRow, {
      eventType: CRM_TIMELINE_EVENT_TYPES.QUOTATION_REVISED,
      summary: `Quotation ${quotationRow.quotationNumber} revised (v${nextVersionNumber})`,
      metadata: { versionNumber: nextVersionNumber },
    });

    return this.getQuotationDetail(context, quotationId);
  }

  async listQuotationVersions(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<QuotationVersionView[]> {
    await this.requireQuotation(context, quotationId);
    const versions = await this.versionRepository.listByQuotationId(
      context.businessId,
      quotationId
    );

    return Promise.all(
      versions.map((version) => this.mapVersionView(context, version))
    );
  }

  async getDashboard(
    context: CurrentBusinessContext
  ): Promise<QuotationDashboardView> {
    const statusCounts = await this.quotationRepository.countByStatus(
      context.businessId
    );
    const countMap = Object.fromEntries(
      statusCounts.map((row) => [row.status, row.count])
    );
    const totalQuotations = await this.quotationRepository.countAll(
      context.businessId
    );

    const { rows } = await this.quotationRepository.search(
      context.businessId,
      { page: 1, pageSize: 8 }
    );

    const recentQuotations = await Promise.all(
      rows.map(async ({ quotation, partyDisplayName }) => {
        const version = await this.versionRepository.findByQuotationAndNumber(
          context.businessId,
          quotation.id,
          quotation.currentVersionNumber
        );
        return this.mapSummaryView(
          quotation,
          partyDisplayName,
          version ? Number(version.grandTotal) : 0
        );
      })
    );

    const { rows: allRows } = await this.quotationRepository.search(
      context.businessId,
      { page: 1, pageSize: 500 }
    );

    let totalQuotedValue = 0;
    let pendingApprovalCount = 0;

    for (const { quotation } of allRows) {
      if (quotation.approvalStatus === QUOTATION_APPROVAL_STATUS_CODES.PENDING) {
        pendingApprovalCount += 1;
      }
      const version = await this.versionRepository.findByQuotationAndNumber(
        context.businessId,
        quotation.id,
        quotation.currentVersionNumber
      );
      if (version) {
        totalQuotedValue += Number(version.grandTotal);
      }
    }

    return {
      totalQuotations,
      draftCount: countMap[QUOTATION_STATUS_CODES.DRAFT] ?? 0,
      sentCount: countMap[QUOTATION_STATUS_CODES.SENT] ?? 0,
      acceptedCount: countMap[QUOTATION_STATUS_CODES.ACCEPTED] ?? 0,
      rejectedCount: countMap[QUOTATION_STATUS_CODES.REJECTED] ?? 0,
      expiredCount: countMap[QUOTATION_STATUS_CODES.EXPIRED] ?? 0,
      totalQuotedValue,
      pendingApprovalCount,
      recentQuotations,
    };
  }

  async submitForApproval(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<QuotationDetailView> {
    const quotationRow = await this.requireEditableQuotation(context, quotationId);
    const version = await this.requireCurrentVersion(context, quotationRow);
    const grandTotal = Number(version.grandTotal);

    if (
      !canSubmitForApproval(quotationRow.approvalStatus, grandTotal)
    ) {
      throw new CrmError(
        "INVALID_QUOTATION_STATUS_TRANSITION",
        CRM_USER_MESSAGES.INVALID_QUOTATION_STATUS_TRANSITION,
        409
      );
    }

    await this.quotationRepository.updateById(context.businessId, quotationId, {
      approvalStatus: QUOTATION_APPROVAL_STATUS_CODES.PENDING,
      updatedBy: context.platformUserId ?? null,
    });

    return this.getQuotationDetail(context, quotationId);
  }

  async approveQuotation(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<QuotationDetailView> {
    const quotationRow = await this.requireQuotation(context, quotationId);
    if (quotationRow.approvalStatus !== QUOTATION_APPROVAL_STATUS_CODES.PENDING) {
      throw new CrmError(
        "INVALID_QUOTATION_STATUS_TRANSITION",
        CRM_USER_MESSAGES.INVALID_QUOTATION_STATUS_TRANSITION,
        409
      );
    }

    await this.quotationRepository.updateById(context.businessId, quotationId, {
      approvalStatus: QUOTATION_APPROVAL_STATUS_CODES.APPROVED,
      approvedAt: new Date(),
      approvedBy: context.platformUserId ?? null,
      updatedBy: context.platformUserId ?? null,
    });

    return this.getQuotationDetail(context, quotationId);
  }

  async rejectQuotationApproval(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<QuotationDetailView> {
    const quotationRow = await this.requireQuotation(context, quotationId);
    if (quotationRow.approvalStatus !== QUOTATION_APPROVAL_STATUS_CODES.PENDING) {
      throw new CrmError(
        "INVALID_QUOTATION_STATUS_TRANSITION",
        CRM_USER_MESSAGES.INVALID_QUOTATION_STATUS_TRANSITION,
        409
      );
    }

    await this.quotationRepository.updateById(context.businessId, quotationId, {
      approvalStatus: QUOTATION_APPROVAL_STATUS_CODES.REJECTED,
      updatedBy: context.platformUserId ?? null,
    });

    return this.getQuotationDetail(context, quotationId);
  }

  async generateQuotationDocument(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<QuotationDocumentView> {
    const detail = await this.getQuotationDetail(context, quotationId);
    const snapshot = this.documentAdapter.generateSnapshot(detail);

    await this.quotationRepository.updateById(context.businessId, quotationId, {
      documentSnapshot: snapshot,
      updatedBy: context.platformUserId ?? null,
    });

    return snapshot;
  }

  async convertToSalesOrder(
    context: CurrentBusinessContext,
    quotationId: string
  ) {
    return this.salesOrderService.createFromQuotation(context, quotationId);
  }

  private async transitionTerminalResponse(
    context: CurrentBusinessContext,
    quotationId: string,
    nextStatus: QuotationStatusCode,
    options: {
      acceptanceChannel?: string;
    } = {}
  ): Promise<QuotationDetailView> {
    const parsed = transitionQuotationStatusSchema.safeParse({
      quotationId,
      status: nextStatus,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmError(
        "INVALID_INPUT",
        first?.message ?? CRM_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const quotationRow = await this.requireQuotation(context, quotationId);
    const effectiveStatus = resolveEffectiveQuotationStatus(
      quotationRow.status,
      quotationRow.validUntil
    ) as QuotationStatusCode;

    if (effectiveStatus === QUOTATION_STATUS_CODES.EXPIRED && nextStatus !== QUOTATION_STATUS_CODES.EXPIRED) {
      throw new CrmError(
        "QUOTATION_EXPIRED",
        CRM_USER_MESSAGES.QUOTATION_EXPIRED,
        409
      );
    }

    this.assertStatusTransition(effectiveStatus, nextStatus);

    const version = await this.requireCurrentVersion(context, quotationRow);

    await this.versionRepository.lockVersion(
      context.businessId,
      version.id,
      nextStatus,
      version.sentAt
    );

    const existingMetadata =
      (quotationRow.metadata as Record<string, unknown> | null) ?? {};
    const nextMetadata =
      nextStatus === QUOTATION_STATUS_CODES.ACCEPTED
        ? {
            ...existingMetadata,
            acceptanceChannel:
              options.acceptanceChannel ?? QUOTATION_ACCEPTANCE_CHANNELS.CRM,
            acceptedAt: new Date().toISOString(),
          }
        : existingMetadata;

    await this.quotationRepository.updateById(context.businessId, quotationId, {
      status: nextStatus,
      metadata: nextMetadata,
      updatedBy: context.platformUserId ?? null,
    });

    await this.recordStatusTimeline(context, quotationRow, nextStatus);

    if (
      nextStatus === QUOTATION_STATUS_CODES.ACCEPTED &&
      quotationRow.opportunityId
    ) {
      await this.opportunityAdapter.onQuotationAccepted(context, {
        opportunityId: quotationRow.opportunityId,
        quotationId,
        stageCode: "QUOTATION_ACCEPTED",
      });
    }

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: quotationRow.partyId,
      entityName: CRM_AUDIT_ENTITY_NAMES.QUOTATION,
      entityId: quotationId,
      operation: AUDIT_OPERATIONS.UPDATE,
      createValues: { status: nextStatus },
    });

    return this.getQuotationDetail(context, quotationId);
  }

  private async insertLineForVersion(
    context: CurrentBusinessContext,
    quotationRow: QuotationRow,
    versionId: string,
    line: {
      offeringId: string;
      offeringVariantId?: string | null;
      description?: string | null;
      quantity: number;
      unitOfMeasureId?: string | null;
      unitPrice?: number;
      pricingItemId?: string | null;
      lineNumber: number;
      metadata?: Record<string, unknown> | null;
    }
  ): Promise<void> {
    let unitPrice = line.unitPrice;
    let pricingItemId = line.pricingItemId ?? null;

    if (unitPrice == null) {
      const resolved = await this.pricingAdapter.resolveUnitPrice(context, {
        offeringId: line.offeringId,
        currencyCode: quotationRow.currencyCode,
        pricingCatalogueId: quotationRow.pricingCatalogueId ?? undefined,
        customerSegment: quotationRow.customerSegment,
        salesChannel: quotationRow.salesChannel,
        region: quotationRow.region,
      });
      unitPrice = resolved.unitPrice;
      pricingItemId = resolved.pricingItemId;
    }

    const lineTotal = this.calculationService.calculateLine({
      lineNumber: line.lineNumber,
      quantity: line.quantity,
      unitPrice,
    }).lineTotal;

    await this.lineRepository.insert({
      businessId: context.businessId,
      quotationVersionId: versionId,
      lineNumber: line.lineNumber,
      offeringId: line.offeringId,
      offeringVariantId: line.offeringVariantId,
      description: line.description,
      quantity: line.quantity.toFixed(6),
      unitOfMeasureId: line.unitOfMeasureId,
      unitPrice: unitPrice.toFixed(6),
      pricingItemId,
      lineTotal: lineTotal.toFixed(6),
      metadata: line.metadata,
      createdBy: context.platformUserId ?? null,
      updatedBy: context.platformUserId ?? null,
    });
  }

  private async recalculateVersionTotals(
    context: CurrentBusinessContext,
    quotationId: string,
    versionId: string
  ): Promise<void> {
    const lines = await this.lineRepository.listByVersionIdWithRelations(
      context.businessId,
      versionId
    );

    if (lines.length === 0) {
      await this.versionRepository.updateTotals(context.businessId, versionId, {
        subtotal: "0",
        taxAmount: "0",
        grandTotal: "0",
      });
      return;
    }

    const totals = this.calculationService.calculateTotals(
      lines.map(({ line }) => ({
        lineNumber: line.lineNumber,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      }))
    );

    const persisted = this.calculationService.toPersistedTotals(totals);
    await this.versionRepository.updateTotals(
      context.businessId,
      versionId,
      persisted
    );

    const quotation = await this.requireQuotation(context, quotationId);
    if (isQuotationEditable(quotation.status)) {
      const requiredApproval = resolveRequiredApprovalStatus(totals.grandTotal);
      if (
        quotation.approvalStatus === QUOTATION_APPROVAL_STATUS_CODES.NOT_REQUIRED &&
        requiredApproval === QUOTATION_APPROVAL_STATUS_CODES.PENDING
      ) {
        await this.quotationRepository.updateById(context.businessId, quotationId, {
          approvalStatus: requiredApproval,
          updatedBy: context.platformUserId ?? null,
        });
      }
    }
  }

  private async applyExpiryIfNeeded(
    context: CurrentBusinessContext,
    quotationRow: QuotationRow
  ): Promise<QuotationRow> {
    if (
      quotationRow.status === QUOTATION_STATUS_CODES.SENT &&
      isQuotationExpiredByDate(quotationRow.validUntil)
    ) {
      const version = await this.requireCurrentVersion(context, quotationRow);
      await this.versionRepository.lockVersion(
        context.businessId,
        version.id,
        QUOTATION_STATUS_CODES.EXPIRED,
        version.sentAt
      );
      const updated = await this.quotationRepository.updateById(
        context.businessId,
        quotationRow.id,
        {
          status: QUOTATION_STATUS_CODES.EXPIRED,
          updatedBy: context.platformUserId ?? null,
        }
      );
      if (updated) {
        await this.recordStatusTimeline(context, updated, QUOTATION_STATUS_CODES.EXPIRED);
        return updated;
      }
    }
    return quotationRow;
  }

  private async resolveRowWithExpiry(
    context: CurrentBusinessContext,
    quotationRow: QuotationRow
  ): Promise<QuotationRow> {
    return this.applyExpiryIfNeeded(context, quotationRow);
  }

  private assertStatusTransition(
    current: QuotationStatusCode,
    next: QuotationStatusCode
  ): void {
    if (!canTransitionQuotationStatus(current, next)) {
      throw new CrmError(
        "INVALID_QUOTATION_STATUS_TRANSITION",
        CRM_USER_MESSAGES.INVALID_QUOTATION_STATUS_TRANSITION,
        409
      );
    }
  }

  private async requireQuotation(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<QuotationRow> {
    const row = await this.quotationRepository.findById(
      context.businessId,
      quotationId
    );
    if (!row) {
      throw new CrmError(
        "QUOTATION_NOT_FOUND",
        CRM_USER_MESSAGES.QUOTATION_NOT_FOUND,
        404
      );
    }
    return row;
  }

  private async requireEditableQuotation(
    context: CurrentBusinessContext,
    quotationId: string
  ): Promise<QuotationRow> {
    const row = await this.requireQuotation(context, quotationId);
    if (!isQuotationEditable(row.status)) {
      throw new CrmError(
        "QUOTATION_NOT_EDITABLE",
        CRM_USER_MESSAGES.QUOTATION_NOT_EDITABLE,
        409
      );
    }
    return row;
  }

  private async requireCurrentVersion(
    context: CurrentBusinessContext,
    quotationRow: QuotationRow
  ) {
    const version = await this.versionRepository.findByQuotationAndNumber(
      context.businessId,
      quotationRow.id,
      quotationRow.currentVersionNumber
    );
    if (!version) {
      throw new CrmError(
        "QUOTATION_VERSION_NOT_FOUND",
        CRM_USER_MESSAGES.QUOTATION_VERSION_NOT_FOUND,
        404
      );
    }
    return version;
  }

  private async requireParty(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<void> {
    const party = await this.partyRepository.findById(context.businessId, partyId);
    if (!party) {
      throw new CrmError(
        "PARTY_NOT_FOUND",
        CRM_USER_MESSAGES.PARTY_NOT_FOUND,
        404
      );
    }
  }

  private async generateQuotationNumber(businessId: string): Promise<string> {
    const count = await this.quotationRepository.countAll(businessId);
    const sequence = String(count + 1).padStart(6, "0");
    return `${QUOTATION_NUMBER_PREFIX}-${sequence}`;
  }

  private async mapDetailView(
    context: CurrentBusinessContext,
    quotationRow: QuotationRow
  ): Promise<QuotationDetailView> {
    const withParty = await this.quotationRepository.findByIdWithParty(
      context.businessId,
      quotationRow.id
    );
    const version = await this.requireCurrentVersion(context, quotationRow);
    const currentVersion = await this.mapVersionView(context, version);

    const effectiveStatus = resolveEffectiveQuotationStatus(
      quotationRow.status,
      quotationRow.validUntil
    );

    const summary = this.mapSummaryView(
      { ...quotationRow, status: effectiveStatus },
      withParty?.partyDisplayName ?? null,
      currentVersion.grandTotal
    );

    return {
      ...summary,
      pricingCatalogueId: quotationRow.pricingCatalogueId,
      customerSegment: quotationRow.customerSegment,
      salesChannel: quotationRow.salesChannel,
      region: quotationRow.region,
      notes: quotationRow.notes,
      termsTemplateCode: quotationRow.termsTemplateCode,
      metadata: quotationRow.metadata as Record<string, unknown> | null,
      approvalStatus: quotationRow.approvalStatus,
      approvalStatusLabel: approvalStatusLabel(quotationRow.approvalStatus),
      documentAvailable: quotationRow.documentSnapshot != null,
      acceptanceChannel:
        typeof (quotationRow.metadata as Record<string, unknown> | null)
          ?.acceptanceChannel === "string"
          ? String(
              (quotationRow.metadata as Record<string, unknown>).acceptanceChannel
            )
          : null,
      currentVersion,
    };
  }

  private mapSummaryView(
    quotationRow: QuotationRow,
    partyDisplayName: string | null,
    grandTotal = 0
  ): QuotationSummaryView {
    return {
      id: quotationRow.id,
      quotationNumber: quotationRow.quotationNumber,
      status: quotationRow.status,
      statusLabel: quotationStatusLabel(quotationRow.status),
      partyId: quotationRow.partyId,
      partyDisplayName,
      crmRecordId: quotationRow.crmRecordId,
      accountId: quotationRow.accountId,
      opportunityId: quotationRow.opportunityId,
      currencyCode: quotationRow.currencyCode,
      grandTotal,
      validUntil: quotationRow.validUntil?.toISOString() ?? null,
      currentVersionNumber: quotationRow.currentVersionNumber,
      ownerUserId: quotationRow.ownerUserId,
      createdAt: quotationRow.createdAt.toISOString(),
      updatedAt: quotationRow.updatedAt.toISOString(),
    };
  }

  private async mapVersionView(
    context: CurrentBusinessContext,
    version: Awaited<
      ReturnType<ReturnType<typeof createQuotationVersionRepository>["findById"]>
    >
  ): Promise<QuotationVersionView> {
    if (!version) {
      throw new CrmError(
        "QUOTATION_VERSION_NOT_FOUND",
        CRM_USER_MESSAGES.QUOTATION_VERSION_NOT_FOUND,
        404
      );
    }

    const lineRows = await this.lineRepository.listByVersionIdWithRelations(
      context.businessId,
      version.id
    );

    const lines: QuotationLineView[] = lineRows.map(({ line, offeringCode, offeringName, unitOfMeasureSymbol }) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      offeringId: line.offeringId,
      offeringCode,
      offeringName,
      offeringVariantId: line.offeringVariantId,
      description: line.description,
      quantity: Number(line.quantity),
      unitOfMeasureId: line.unitOfMeasureId,
      unitOfMeasureSymbol,
      unitPrice: Number(line.unitPrice),
      pricingItemId: line.pricingItemId,
      lineTotal: Number(line.lineTotal),
      metadata: line.metadata as Record<string, unknown> | null,
    }));

    return {
      id: version.id,
      versionNumber: version.versionNumber,
      status: version.status,
      statusLabel: quotationStatusLabel(version.status),
      subtotal: Number(version.subtotal),
      taxAmount: Number(version.taxAmount),
      grandTotal: Number(version.grandTotal),
      revisionReason: version.revisionReason,
      sentAt: version.sentAt?.toISOString() ?? null,
      lockedAt: version.lockedAt?.toISOString() ?? null,
      createdAt: version.createdAt.toISOString(),
      lines,
    };
  }

  private async recordStatusTimeline(
    context: CurrentBusinessContext,
    quotationRow: QuotationRow,
    nextStatus: QuotationStatusCode
  ): Promise<void> {
    const eventType = timelineEventForStatusTransition(nextStatus);
    if (!eventType) {
      return;
    }

    await this.recordTimelineEvent(context, quotationRow, {
      eventType,
      summary: `Quotation ${quotationRow.quotationNumber} ${quotationStatusLabel(nextStatus).toLowerCase()}`,
    });
  }

  private async recordTimelineEvent(
    context: CurrentBusinessContext,
    quotationRow: QuotationRow,
    input: {
      eventType: string;
      summary: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.timelineService.recordEvent({
      businessId: context.businessId,
      partyId: quotationRow.partyId,
      eventType: input.eventType,
      eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
      sourceModule: CRM_TIMELINE_SOURCE_MODULE,
      referenceEntity: CRM_AUDIT_ENTITY_NAMES.QUOTATION,
      referenceId: quotationRow.id,
      summary: input.summary,
      performedByUserId: context.platformUserId ?? null,
      metadata: {
        quotationNumber: quotationRow.quotationNumber,
        ...input.metadata,
      },
    });
  }
}

export function createQuotationService(options?: {
  idempotency?: QuotationIdempotencyRepositoryPort | null;
}) {
  if (options?.idempotency !== undefined) {
    return new QuotationService(
      createQuotationRepository(),
      createQuotationVersionRepository(),
      createQuotationLineRepository(),
      createPartyRepository(),
      createPricingResolutionAdapter(),
      createQuotationCalculationService(),
      createQuotationDocumentAdapter(),
      createSalesOrderService(),
      createOpportunityHandoffAdapter(),
      createPartyTimelineService(),
      createAuditService(),
      options.idempotency
    );
  }
  return new QuotationService();
}

/**
 * Purpose:
 * Orchestrate BP-009 IP-10 procurement exceptions.
 * Does not post inventory, GL, or execute payment.
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
  EXCEPTION_ACTION_TYPES,
  EXCEPTION_RAISED_FROM,
  EXCEPTION_STATUSES,
  PROCUREMENT_AUDIT_ACTIONS,
  PROCUREMENT_PERMISSIONS,
  PERFORMANCE_MEASURE_CODES,
  PERFORMANCE_SOURCE_TYPES,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  ExceptionControlPort,
  ExceptionStorePort,
  ProcurementAuditPort,
  ProcurementExceptionBridgePort,
  ProcurementPerformanceBridgePort,
} from "@/modules/procurement/ports";
import {
  createExceptionControlRepository,
  createExceptionRepository,
} from "@/modules/procurement/repositories/exception-repository";
import { createProcurementAuditAdapter } from "@/modules/procurement/services/procurement-audit-helper";
import { createProcurementPerformanceBridge } from "@/modules/procurement/services/performance-service";
import {
  assertDuplicateInvoiceDecision,
  assertExceptionEditable,
  assertExceptionLinks,
  buildExceptionLinkHref,
  buildExceptionLinkLabel,
  defaultSeverityForType,
  exceptionStatusLabel,
  isExceptionOverdue,
  requiresApprovalToClose,
  resolveExceptionType,
} from "@/modules/procurement/services/exception-rules";
import { assertPermission } from "@/modules/procurement/services/procurement-rules";
import type {
  AssignExceptionCommand,
  CreateExceptionCommand,
  ExceptionDecisionCommand,
  ExceptionListFilter,
  ExceptionListView,
  ExceptionRecord,
  ExceptionView,
  ProcurementActor,
  RaiseSystemExceptionCommand,
  ResolveExceptionCommand,
} from "@/modules/procurement/types";

export type ExceptionServiceDependencies = {
  store: ExceptionStorePort;
  controls: ExceptionControlPort;
  numbering: DocumentNumberingPort;
  audit: ProcurementAuditPort;
  performance?: ProcurementPerformanceBridgePort;
};

function actorId(context: CurrentBusinessContext) {
  return context.platformUserId || null;
}

function requireException<T>(row: T | null): T {
  if (!row) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.EXCEPTION_NOT_FOUND, undefined, 404);
  }
  return row;
}

export class ExceptionService {
  constructor(private readonly deps: ExceptionServiceDependencies) {}

  async countOpen(context: CurrentBusinessContext, actor: ProcurementActor) {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.EXCEPTION_READ);
    return this.deps.store.countOpenExceptions(context.businessId);
  }

  async listTypes(context: CurrentBusinessContext, actor: ProcurementActor) {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.EXCEPTION_READ);
    return this.deps.store.listTypes(context.businessId);
  }

  async list(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    filter: ExceptionListFilter = {}
  ): Promise<ExceptionListView[]> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.EXCEPTION_READ);
    const types = await this.deps.store.listTypes(context.businessId);
    const typeName = new Map(types.map((row) => [row.code, row.name]));
    const rows = await this.deps.store.listExceptionsByBusiness(context.businessId);
    const views: ExceptionListView[] = [];
    for (const row of rows) {
      if (filter.status === "open" && (row.status === EXCEPTION_STATUSES.CLOSED || row.status === EXCEPTION_STATUSES.CANCELLED)) {
        continue;
      }
      if (filter.status === "mine" && row.ownerUserId !== actor.userId) {
        continue;
      }
      if (filter.status === "pending-approval" && row.status !== EXCEPTION_STATUSES.RESOLVED_PENDING_APPROVAL) {
        continue;
      }
      if (filter.status === "overdue" && !isExceptionOverdue(row.dueAt, row.status)) {
        continue;
      }
      if (filter.query?.trim()) {
        const query = filter.query.trim().toLowerCase();
        const haystack = [row.exceptionNumber, row.title, row.exceptionTypeCode, typeName.get(row.exceptionTypeCode) ?? ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) {
          continue;
        }
      }
      views.push(this.toListView(row, typeName.get(row.exceptionTypeCode) ?? row.exceptionTypeCode));
    }
    return views.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    exceptionId: string
  ): Promise<ExceptionView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.EXCEPTION_READ);
    const row = requireException(
      await this.deps.store.findExceptionById(context.businessId, exceptionId)
    );
    return this.toView(context.businessId, row, actor);
  }

  async create(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    input: CreateExceptionCommand
  ): Promise<ExceptionView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.EXCEPTION_CREATE);
    assertExceptionLinks(input.links);
    const types = await this.deps.store.listTypes(context.businessId);
    const type = resolveExceptionType(types, input.exceptionTypeCode);
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    const severity = defaultSeverityForType(type, input.severity);
    const numbering = await this.allocateNumber(context.businessId);
    const exceptionId = randomUUID();
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + control.defaultSlaDays);
    const row = await this.deps.store.insertException({
      id: exceptionId,
      businessId: context.businessId,
      exceptionNumber: numbering.number,
      exceptionTypeCode: type.code,
      severity,
      status: input.ownerUserId ? EXCEPTION_STATUSES.ASSIGNED : EXCEPTION_STATUSES.OPEN,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      evidenceDocumentId: input.evidenceDocumentId?.trim() || null,
      raisedFrom: EXCEPTION_RAISED_FROM.USER,
      sourceKey: null,
      profileId: input.profileId ?? null,
      ownerUserId: input.ownerUserId ?? null,
      resolutionNotes: null,
      resolutionDecision: null,
      varianceAcceptedBy: null,
      requiresApproval: requiresApprovalToClose({ control, type, severity }),
      approvedAt: null,
      approvedBy: null,
      dueAt,
      closedAt: null,
      closedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      createdBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.insertLinks(context.businessId, exceptionId, input.links);
    await this.recordAction(context, exceptionId, EXCEPTION_ACTION_TYPES.RAISED, "Exception raised.");
    if (input.ownerUserId) {
      await this.recordAction(context, exceptionId, EXCEPTION_ACTION_TYPES.ASSIGNED, "Owner assigned.");
    }
    await this.audit(context, exceptionId, PROCUREMENT_AUDIT_ACTIONS.EXCEPTION_RAISED);
    return this.toView(context.businessId, row, actor);
  }

  async raiseSystem(input: RaiseSystemExceptionCommand): Promise<{ exceptionId: string } | null> {
    assertExceptionLinks(input.links);
    const existing = await this.deps.store.findExceptionBySourceKey(
      input.businessId,
      input.sourceKey
    );
    if (existing) {
      return { exceptionId: existing.id };
    }
    const types = await this.deps.store.listTypes(input.businessId);
    const type = resolveExceptionType(types, input.exceptionTypeCode);
    const control = await this.deps.controls.getOrCreateControl(input.businessId);
    const severity = defaultSeverityForType(type, input.severity);
    const numbering = await this.allocateNumber(input.businessId);
    const exceptionId = randomUUID();
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + control.defaultSlaDays);
    const row = await this.deps.store.insertException({
      id: exceptionId,
      businessId: input.businessId,
      exceptionNumber: numbering.number,
      exceptionTypeCode: type.code,
      severity,
      status: EXCEPTION_STATUSES.OPEN,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      evidenceDocumentId: input.evidenceDocumentId?.trim() || null,
      raisedFrom: input.raisedFrom,
      sourceKey: input.sourceKey,
      profileId: input.profileId ?? null,
      ownerUserId: null,
      resolutionNotes: null,
      resolutionDecision: null,
      varianceAcceptedBy: null,
      requiresApproval: requiresApprovalToClose({ control, type, severity }),
      approvedAt: null,
      approvedBy: null,
      dueAt,
      closedAt: null,
      closedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      createdBy: input.actorUserId ?? null,
      updatedBy: input.actorUserId ?? null,
    });
    await this.insertLinks(input.businessId, exceptionId, input.links);
    await this.deps.store.insertAction({
      id: randomUUID(),
      businessId: input.businessId,
      exceptionId,
      actionType: EXCEPTION_ACTION_TYPES.RAISED,
      actorUserId: input.actorUserId ?? null,
      notes: "Raised automatically by procurement controls.",
    });
    await this.deps.audit.record({
      businessId: input.businessId,
      actorUserId: input.actorUserId ?? null,
      entityId: exceptionId,
      action: PROCUREMENT_AUDIT_ACTIONS.EXCEPTION_RAISED,
      outcome: "SUCCESS",
      references: { sourceKey: input.sourceKey },
    });
    if (input.profileId) {
      await this.recordPerformanceEvent(input.businessId, input.profileId, row.id, {
        measureCode: PERFORMANCE_MEASURE_CODES.DISPUTE_OPENED,
        sourceKey: `exception:${row.id}:opened`,
        actorUserId: input.actorUserId ?? null,
      });
    }
    return { exceptionId: row.id };
  }

  async assign(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    exceptionId: string,
    input: AssignExceptionCommand
  ): Promise<ExceptionView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.EXCEPTION_ASSIGN);
    const row = requireException(
      await this.deps.store.findExceptionById(context.businessId, exceptionId)
    );
    assertExceptionEditable(row.status);
    const updated = await this.deps.store.updateException(context.businessId, exceptionId, {
      ownerUserId: input.ownerUserId,
      status: EXCEPTION_STATUSES.ASSIGNED,
      updatedBy: actorId(context),
    });
    await this.recordAction(context, exceptionId, EXCEPTION_ACTION_TYPES.ASSIGNED, input.notes ?? null);
    await this.audit(context, exceptionId, PROCUREMENT_AUDIT_ACTIONS.EXCEPTION_ASSIGNED);
    return this.toView(context.businessId, updated, actor);
  }

  async startProgress(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    exceptionId: string
  ): Promise<ExceptionView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.EXCEPTION_RESOLVE);
    const row = requireException(
      await this.deps.store.findExceptionById(context.businessId, exceptionId)
    );
    assertExceptionEditable(row.status);
    const updated = await this.deps.store.updateException(context.businessId, exceptionId, {
      status: EXCEPTION_STATUSES.IN_PROGRESS,
      updatedBy: actorId(context),
    });
    await this.recordAction(context, exceptionId, EXCEPTION_ACTION_TYPES.STARTED, null);
    return this.toView(context.businessId, updated, actor);
  }

  async resolve(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    exceptionId: string,
    input: ResolveExceptionCommand
  ): Promise<ExceptionView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.EXCEPTION_RESOLVE);
    const row = requireException(
      await this.deps.store.findExceptionById(context.businessId, exceptionId)
    );
    assertExceptionEditable(row.status);
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    const types = await this.deps.store.listTypes(context.businessId);
    const type = resolveExceptionType(types, row.exceptionTypeCode);
    assertDuplicateInvoiceDecision({
      control,
      exceptionTypeCode: row.exceptionTypeCode,
      resolutionDecision: input.resolutionDecision,
    });
    const needsApproval = row.requiresApproval;
    const updated = await this.deps.store.updateException(context.businessId, exceptionId, {
      status: needsApproval
        ? EXCEPTION_STATUSES.RESOLVED_PENDING_APPROVAL
        : EXCEPTION_STATUSES.CLOSED,
      resolutionNotes: input.resolutionNotes.trim(),
      resolutionDecision: input.resolutionDecision?.trim() || null,
      varianceAcceptedBy: input.varianceAccepted ? actor.userId : null,
      closedAt: needsApproval ? null : new Date(),
      closedBy: needsApproval ? null : actorId(context),
      updatedBy: actorId(context),
    });
    await this.recordAction(
      context,
      exceptionId,
      EXCEPTION_ACTION_TYPES.RESOLUTION_RECORDED,
      input.resolutionNotes
    );
    if (!needsApproval) {
      await this.audit(context, exceptionId, PROCUREMENT_AUDIT_ACTIONS.EXCEPTION_CLOSED);
      await this.recordPerformanceEvent(context.businessId, row.profileId, exceptionId, {
        measureCode: PERFORMANCE_MEASURE_CODES.DISPUTE_RESOLVED,
        sourceKey: `exception:${exceptionId}:resolved`,
        actorUserId: actorId(context),
      });
    } else {
      await this.audit(context, exceptionId, PROCUREMENT_AUDIT_ACTIONS.EXCEPTION_RESOLVED);
    }
    return this.toView(context.businessId, updated, actor);
  }

  async approveClose(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    exceptionId: string
  ): Promise<ExceptionView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.EXCEPTION_APPROVE);
    const row = requireException(
      await this.deps.store.findExceptionById(context.businessId, exceptionId)
    );
    if (row.status !== EXCEPTION_STATUSES.RESOLVED_PENDING_APPROVAL) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EXCEPTION_APPROVAL_REQUIRED, undefined, 409);
    }
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    assertDuplicateInvoiceDecision({
      control,
      exceptionTypeCode: row.exceptionTypeCode,
      resolutionDecision: row.resolutionDecision,
    });
    const updated = await this.deps.store.updateException(context.businessId, exceptionId, {
      status: EXCEPTION_STATUSES.CLOSED,
      approvedAt: new Date(),
      approvedBy: actorId(context),
      closedAt: new Date(),
      closedBy: actorId(context),
      updatedBy: actorId(context),
    });
    await this.recordAction(context, exceptionId, EXCEPTION_ACTION_TYPES.APPROVED, null);
    await this.audit(context, exceptionId, PROCUREMENT_AUDIT_ACTIONS.EXCEPTION_APPROVED);
    await this.audit(context, exceptionId, PROCUREMENT_AUDIT_ACTIONS.EXCEPTION_CLOSED);
    await this.recordPerformanceEvent(context.businessId, row.profileId, exceptionId, {
      measureCode: PERFORMANCE_MEASURE_CODES.DISPUTE_RESOLVED,
      sourceKey: `exception:${exceptionId}:approved-close`,
      actorUserId: actorId(context),
    });
    return this.toView(context.businessId, updated, actor);
  }

  async cancel(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    exceptionId: string,
    input: ExceptionDecisionCommand
  ): Promise<ExceptionView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.EXCEPTION_CANCEL);
    const row = requireException(
      await this.deps.store.findExceptionById(context.businessId, exceptionId)
    );
    assertExceptionEditable(row.status);
    const updated = await this.deps.store.updateException(context.businessId, exceptionId, {
      status: EXCEPTION_STATUSES.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: actorId(context),
      cancellationReason: input.reason?.trim() || null,
      updatedBy: actorId(context),
    });
    await this.recordAction(context, exceptionId, EXCEPTION_ACTION_TYPES.CANCELLED, input.reason ?? null);
    await this.audit(context, exceptionId, PROCUREMENT_AUDIT_ACTIONS.EXCEPTION_CANCELLED);
    return this.toView(context.businessId, updated, actor);
  }

  private async recordPerformanceEvent(
    businessId: string,
    profileId: string | null,
    exceptionId: string,
    input: { measureCode: string; sourceKey: string; actorUserId?: string | null }
  ) {
    if (!this.deps.performance || !profileId) {
      return;
    }
    await this.deps.performance.recordEvent({
      businessId,
      profileId,
      measureCode: input.measureCode,
      sourceType: PERFORMANCE_SOURCE_TYPES.EXCEPTION,
      sourceId: exceptionId,
      sourceKey: input.sourceKey,
      actorUserId: input.actorUserId ?? null,
    });
  }

  private async insertLinks(businessId: string, exceptionId: string, links: CreateExceptionCommand["links"]) {
    await this.deps.store.insertLinks(
      links.map((link) => ({
        id: randomUUID(),
        businessId,
        exceptionId,
        objectType: link.objectType,
        objectId: link.objectId,
        createdAt: new Date(),
      }))
    );
  }

  private async recordAction(
    context: CurrentBusinessContext,
    exceptionId: string,
    actionType: string,
    notes: string | null
  ) {
    await this.deps.store.insertAction({
      id: randomUUID(),
      businessId: context.businessId,
      exceptionId,
      actionType,
      actorUserId: actorId(context),
      notes,
    });
  }

  private toListView(row: ExceptionRecord, exceptionTypeName: string): ExceptionListView {
    return {
      id: row.id,
      exceptionNumber: row.exceptionNumber,
      exceptionTypeCode: row.exceptionTypeCode,
      exceptionTypeName,
      severity: row.severity,
      status: row.status,
      statusLabel: exceptionStatusLabel(row.status),
      title: row.title,
      ownerUserId: row.ownerUserId,
      dueAt: row.dueAt?.toISOString() ?? null,
      isOverdue: isExceptionOverdue(row.dueAt, row.status),
      raisedFrom: row.raisedFrom,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async toView(businessId: string, row: ExceptionRecord, actor: ProcurementActor) {
    const types = await this.deps.store.listTypes(businessId);
    const type = types.find((item) => item.code === row.exceptionTypeCode);
    const links = await this.deps.store.listLinks(row.id);
    const actions = await this.deps.store.listActions(row.id);
    return {
      id: row.id,
      exceptionNumber: row.exceptionNumber,
      exceptionTypeCode: row.exceptionTypeCode,
      exceptionTypeName: type?.name ?? row.exceptionTypeCode,
      severity: row.severity,
      status: row.status,
      statusLabel: exceptionStatusLabel(row.status),
      title: row.title,
      description: row.description,
      evidenceDocumentId: row.evidenceDocumentId,
      raisedFrom: row.raisedFrom,
      profileId: row.profileId,
      ownerUserId: row.ownerUserId,
      resolutionNotes: row.resolutionNotes,
      resolutionDecision: row.resolutionDecision,
      varianceAcceptedBy: row.varianceAcceptedBy,
      requiresApproval: row.requiresApproval,
      dueAt: row.dueAt?.toISOString() ?? null,
      isOverdue: isExceptionOverdue(row.dueAt, row.status),
      links: links.map((link) => ({
        id: link.id,
        objectType: link.objectType,
        objectId: link.objectId,
        href: buildExceptionLinkHref(link.objectType, link.objectId),
        label: buildExceptionLinkLabel(link.objectType, link.objectId),
      })),
      actions: actions.map((action) => ({
        id: action.id,
        actionType: action.actionType,
        actorUserId: action.actorUserId,
        notes: action.notes,
        createdAt: action.createdAt.toISOString(),
      })),
      canAssign:
        row.status !== EXCEPTION_STATUSES.CLOSED &&
        row.status !== EXCEPTION_STATUSES.CANCELLED &&
        actor.permissions.includes(PROCUREMENT_PERMISSIONS.EXCEPTION_ASSIGN),
      canStart:
        (row.status === EXCEPTION_STATUSES.OPEN ||
          row.status === EXCEPTION_STATUSES.ASSIGNED) &&
        actor.permissions.includes(PROCUREMENT_PERMISSIONS.EXCEPTION_RESOLVE),
      canResolve:
        row.status !== EXCEPTION_STATUSES.CLOSED &&
        row.status !== EXCEPTION_STATUSES.CANCELLED &&
        row.status !== EXCEPTION_STATUSES.RESOLVED_PENDING_APPROVAL &&
        actor.permissions.includes(PROCUREMENT_PERMISSIONS.EXCEPTION_RESOLVE),
      canApprove:
        row.status === EXCEPTION_STATUSES.RESOLVED_PENDING_APPROVAL &&
        actor.permissions.includes(PROCUREMENT_PERMISSIONS.EXCEPTION_APPROVE),
      canClose: false,
      canCancel:
        row.status !== EXCEPTION_STATUSES.CLOSED &&
        row.status !== EXCEPTION_STATUSES.CANCELLED &&
        actor.permissions.includes(PROCUREMENT_PERMISSIONS.EXCEPTION_CANCEL),
    };
  }

  private async allocateNumber(businessId: string) {
    try {
      return await this.deps.numbering.allocate({
        businessId,
        documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.PROCUREMENT_EXCEPTION,
      });
    } catch (error) {
      if (error instanceof DocumentNumberingError) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.NUMBERING_POLICY_MISSING, undefined, 409);
      }
      throw error;
    }
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

export function createDefaultExceptionDependencies(): ExceptionServiceDependencies {
  return {
    store: createExceptionRepository(),
    controls: createExceptionControlRepository(),
    numbering: new ConfigurableDocumentNumberingService(createDocumentNumberingPolicyRepository()),
    audit: createProcurementAuditAdapter(),
    performance: createProcurementPerformanceBridge(),
  };
}

export function createExceptionService(
  overrides: Partial<ExceptionServiceDependencies> = {}
): ExceptionService {
  return new ExceptionService({ ...createDefaultExceptionDependencies(), ...overrides });
}

export function createProcurementExceptionBridge(
  service: ExceptionService = createExceptionService()
): ProcurementExceptionBridgePort {
  return {
    raiseSystem: (input) => service.raiseSystem(input),
  };
}

/**
 * Purpose:
 * ENG-003n — Work Assignment & SLA orchestration.
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  DEFAULT_CRM_RECORD_SLA_SECONDS,
  WORK_ASSIGNMENT_TYPES,
} from "@/core/work-assignment-sla/constants";
import {
  createWorkAssignmentRepository,
  type WorkAssignmentRepository,
} from "@/core/work-assignment-sla/repositories/work-assignment-repository";
import type {
  AssignWorkItemPayload,
  WorkAssignmentHistoryView,
  WorkAssignmentSummaryView,
} from "@/core/work-assignment-sla/types";

function elapsedSeconds(from: Date, to: Date = new Date()): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));
}

export class WorkAssignmentService {
  constructor(
    private readonly repository: WorkAssignmentRepository = createWorkAssignmentRepository()
  ) {}

  async assign(
    context: CurrentBusinessContext,
    payload: AssignWorkItemPayload
  ): Promise<void> {
    await this.reassign(context, payload);
  }

  async reassign(
    context: CurrentBusinessContext,
    payload: AssignWorkItemPayload
  ): Promise<void> {
    const now = new Date();
    const policy =
      (await this.repository.findActivePolicyByEntityType(payload.subjectType)) ??
      null;
    const targetSeconds = policy?.targetSeconds ?? DEFAULT_CRM_RECORD_SLA_SECONDS;

    const openSegment = await this.repository.findOpenSegment(
      context.businessId,
      payload.subjectType,
      payload.subjectId
    );

    if (openSegment) {
      const activeSeconds = elapsedSeconds(openSegment.startedAt, now);
      const isBreached = activeSeconds > targetSeconds;
      const breachedSeconds = isBreached ? activeSeconds - targetSeconds : 0;

      await this.repository.closeSegment(
        openSegment.id,
        now,
        activeSeconds,
        isBreached,
        breachedSeconds
      );
    }

    const { previous } = await this.repository.upsertAssignment({
      businessId: context.businessId,
      subjectType: payload.subjectType,
      subjectId: payload.subjectId,
      ownerType: payload.ownerType,
      ownerId: payload.ownerId,
      ownerPartyId: payload.ownerPartyId ?? null,
      assignedBy: context.platformUserId,
      assignmentType: payload.assignmentType ?? WORK_ASSIGNMENT_TYPES.MANUAL,
      reasonCode: payload.reasonCode ?? null,
    });

    await this.repository.insertAssignmentHistory({
      businessId: context.businessId,
      subjectType: payload.subjectType,
      subjectId: payload.subjectId,
      previousOwnerType: previous?.ownerType ?? null,
      previousOwnerId: previous?.ownerId ?? null,
      previousOwnerPartyId: previous?.ownerPartyId ?? null,
      newOwnerType: payload.ownerType,
      newOwnerId: payload.ownerId,
      newOwnerPartyId: payload.ownerPartyId ?? null,
      assignedBy: context.platformUserId,
      assignmentType: payload.assignmentType ?? WORK_ASSIGNMENT_TYPES.MANUAL,
      reasonCode: payload.reasonCode ?? null,
    });

    await this.repository.insertSegment({
      businessId: context.businessId,
      subjectType: payload.subjectType,
      subjectId: payload.subjectId,
      assigneeType: payload.ownerType,
      assigneeId: payload.ownerId,
      assigneePartyId: payload.ownerPartyId ?? null,
      slaPolicyId: policy?.id ?? null,
    });
  }

  async getSummary(
    context: CurrentBusinessContext,
    subjectType: string,
    subjectId: string,
    ownerDisplayName: string | null = null
  ): Promise<WorkAssignmentSummaryView | null> {
    const assignment = await this.repository.findCurrentAssignment(
      context.businessId,
      subjectType,
      subjectId
    );

    if (!assignment) {
      return null;
    }

    const policy =
      (await this.repository.findActivePolicyByEntityType(subjectType)) ?? null;
    const targetSeconds = policy?.targetSeconds ?? DEFAULT_CRM_RECORD_SLA_SECONDS;

    const segments = await this.repository.listSegments(
      context.businessId,
      subjectType,
      subjectId
    );

    const now = new Date();
    let totalElapsedSeconds = 0;
    let currentSegmentElapsedSeconds = 0;
    let isBreached = false;

    for (const segment of segments) {
      const end = segment.endedAt ?? now;
      const seconds = elapsedSeconds(segment.startedAt, end);
      totalElapsedSeconds += seconds;
      if (!segment.endedAt) {
        currentSegmentElapsedSeconds = seconds;
        isBreached = seconds > targetSeconds;
      } else if (segment.isBreached) {
        isBreached = true;
      }
    }

    const slaRemainingSeconds = Math.max(0, targetSeconds - currentSegmentElapsedSeconds);

    return {
      subjectType,
      subjectId,
      ownerType: assignment.ownerType,
      ownerId: assignment.ownerId,
      ownerPartyId: assignment.ownerPartyId,
      ownerDisplayName,
      assignedAt: assignment.assignedAt.toISOString(),
      assignmentType: assignment.assignmentType,
      reasonCode: assignment.reasonCode,
      currentSegmentElapsedSeconds,
      totalElapsedSeconds,
      isBreached,
      slaRemainingSeconds: isBreached ? 0 : slaRemainingSeconds,
    };
  }

  async listHistory(
    context: CurrentBusinessContext,
    subjectType: string,
    subjectId: string
  ): Promise<WorkAssignmentHistoryView[]> {
    const rows = await this.repository.listAssignmentHistory(
      context.businessId,
      subjectType,
      subjectId
    );

    return rows.map((row) => ({
      id: row.id,
      previousOwnerDisplayName: row.previousOwnerPartyId ?? row.previousOwnerId ?? null,
      newOwnerDisplayName: row.newOwnerPartyId ?? row.newOwnerId ?? null,
      assignedAt: row.assignedAt.toISOString(),
      assignmentType: row.assignmentType,
      reasonCode: row.reasonCode,
    }));
  }
}

export function createWorkAssignmentService() {
  return new WorkAssignmentService();
}

/**
 * Purpose:
 * ENG-003n — Work Assignment & SLA Engine types.
 */

import type {
  WorkAssignmentType,
  WorkOwnerType,
  WorkSubjectType,
} from "@/core/work-assignment-sla/constants";

export type AssignWorkItemPayload = {
  subjectType: WorkSubjectType | string;
  subjectId: string;
  ownerType: WorkOwnerType | string;
  ownerId: string;
  ownerPartyId?: string | null;
  assignmentType?: WorkAssignmentType | string;
  reasonCode?: string | null;
};

export type ReassignWorkItemPayload = AssignWorkItemPayload;

export type WorkAssignmentSummaryView = {
  subjectType: string;
  subjectId: string;
  ownerType: string;
  ownerId: string;
  ownerPartyId: string | null;
  ownerDisplayName: string | null;
  assignedAt: string;
  assignmentType: string;
  reasonCode: string | null;
  currentSegmentElapsedSeconds: number;
  totalElapsedSeconds: number;
  isBreached: boolean;
  slaRemainingSeconds: number | null;
};

export type WorkAssignmentHistoryView = {
  id: string;
  previousOwnerDisplayName: string | null;
  newOwnerDisplayName: string | null;
  assignedAt: string;
  assignmentType: string;
  reasonCode: string | null;
};

/**
 * ENG-003n — Work Assignment & SLA Engine public API.
 */

export {
  DEFAULT_CRM_RECORD_SLA_SECONDS,
  WORK_ASSIGNMENT_TYPES,
  WORK_OWNER_TYPES,
  WORK_SLA_CLOCK_MODES,
  WORK_SUBJECT_TYPES,
} from "@/core/work-assignment-sla/constants";
export type {
  WorkAssignmentType,
  WorkOwnerType,
  WorkSlaClockMode,
  WorkSubjectType,
} from "@/core/work-assignment-sla/constants";
export {
  createWorkAssignmentService,
  WorkAssignmentService,
} from "@/core/work-assignment-sla/services/work-assignment-service";
export type {
  AssignWorkItemPayload,
  ReassignWorkItemPayload,
  WorkAssignmentHistoryView,
  WorkAssignmentSummaryView,
} from "@/core/work-assignment-sla/types";

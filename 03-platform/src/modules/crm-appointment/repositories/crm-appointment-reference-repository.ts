/**
 * Reference data for appointment forms — delegates to activity reference patterns.
 * BP-004 / IP-06
 */

export {
  CrmActivityReferenceRepository as CrmAppointmentReferenceRepository,
  createCrmActivityReferenceRepository as createCrmAppointmentReferenceRepository,
} from "@/modules/crm-activity/repositories/crm-activity-reference-repository";

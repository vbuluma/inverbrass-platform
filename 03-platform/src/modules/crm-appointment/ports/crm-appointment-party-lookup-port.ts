/**
 * Party lookup port for appointment forms — IP-04 picker plugs in later.
 * BP-004 / IP-06
 */

export type {
  CrmActivityPartyLookupPort as CrmAppointmentPartyLookupPort,
  CrmActivityPartyLookupResult as CrmAppointmentPartyLookupResult,
} from "@/modules/crm-activity/ports/crm-activity-party-lookup-port";

export { createCrmActivityPartyLookupAdapter as createCrmAppointmentPartyLookupAdapter } from "@/modules/crm-activity/adapters/crm-activity-party-lookup-adapter";

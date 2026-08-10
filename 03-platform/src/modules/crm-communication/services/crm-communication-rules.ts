import {
  CRM_COMMUNICATION_CHANNEL_CODES,
  CRM_COMMUNICATION_CONSENT_RESULTS,
  CRM_COMMUNICATION_DIRECTION_CODES,
  CRM_COMMUNICATION_NUMBER_PREFIX,
} from "@/modules/crm-communication/constants";

export function buildCommunicationNumber(sequence: number): string {
  return `${CRM_COMMUNICATION_NUMBER_PREFIX}-${String(sequence).padStart(6, "0")}`;
}

export function requiresOutboundContactValue(
  directionCode: string,
  channelTypeCode: string
): boolean {
  if (directionCode !== CRM_COMMUNICATION_DIRECTION_CODES.OUTBOUND) return false;
  return (
    channelTypeCode === CRM_COMMUNICATION_CHANNEL_CODES.EMAIL ||
    channelTypeCode === CRM_COMMUNICATION_CHANNEL_CODES.SMS ||
    channelTypeCode === CRM_COMMUNICATION_CHANNEL_CODES.WHATSAPP ||
    channelTypeCode === CRM_COMMUNICATION_CHANNEL_CODES.PHONE
  );
}

export function mapChannelToPreferenceField(
  channelTypeCode: string
):
  | "emailEnabled"
  | "smsEnabled"
  | "whatsAppEnabled"
  | "phoneEnabled"
  | "postalMailEnabled"
  | null {
  switch (channelTypeCode) {
    case CRM_COMMUNICATION_CHANNEL_CODES.EMAIL:
      return "emailEnabled";
    case CRM_COMMUNICATION_CHANNEL_CODES.SMS:
      return "smsEnabled";
    case CRM_COMMUNICATION_CHANNEL_CODES.WHATSAPP:
      return "whatsAppEnabled";
    case CRM_COMMUNICATION_CHANNEL_CODES.PHONE:
      return "phoneEnabled";
    case CRM_COMMUNICATION_CHANNEL_CODES.LETTER:
      return "postalMailEnabled";
    default:
      return null;
  }
}

export function resolveConsentResult(input: {
  directionCode: string;
  requiresConsentOutbound: boolean;
  channelEnabled: boolean | null;
  allowOverride?: boolean;
}): string {
  if (input.directionCode !== CRM_COMMUNICATION_DIRECTION_CODES.OUTBOUND) {
    return CRM_COMMUNICATION_CONSENT_RESULTS.NOT_REQUIRED;
  }
  if (!input.requiresConsentOutbound) {
    return CRM_COMMUNICATION_CONSENT_RESULTS.NOT_REQUIRED;
  }
  if (input.channelEnabled === null) {
    // No preference profile — warn but allow log with transactional default
    return CRM_COMMUNICATION_CONSENT_RESULTS.WARNED;
  }
  if (input.channelEnabled) {
    return CRM_COMMUNICATION_CONSENT_RESULTS.ALLOWED;
  }
  if (input.allowOverride) {
    return CRM_COMMUNICATION_CONSENT_RESULTS.WARNED;
  }
  return CRM_COMMUNICATION_CONSENT_RESULTS.BLOCKED;
}

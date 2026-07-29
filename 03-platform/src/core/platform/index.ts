export type {
  LegacyActionResult,
  PlatformActionLink,
  PlatformActionResult,
  PlatformActionSeverity,
} from "@/core/platform/types";
export {
  adaptLegacyResult,
  platformError,
  platformSuccess,
  platformWarning,
  severityToAlertVariant,
} from "@/core/platform/platform-action-helpers";
export * from "@/core/platform/party-next-actions";

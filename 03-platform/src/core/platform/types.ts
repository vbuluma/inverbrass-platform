/**
 * UX-001l — Standard platform action result model.
 *
 * Every server action should return (or be adapted to) this envelope so UI
 * components can render consistent success, warning, and error feedback.
 */

export type PlatformActionSeverity = "success" | "warning" | "error";

export type PlatformActionLink = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "success" | "destructive";
};

export type PlatformActionResult<T = unknown> = {
  success: boolean;
  severity: PlatformActionSeverity;
  title: string;
  message: string;
  data?: T;
  nextActions?: PlatformActionLink[];
  /** Optional field name for inline form validation highlighting. */
  field?: string;
  /** UX-001.1a — contextual completion summary rows. */
  summary?: Array<{ label: string; value: string }>;
  /** UX-001.1a — completion card title override (defaults to title). */
  completionTitle?: string;
};

export type LegacyActionError = {
  code: string;
  message: string;
  field?: string;
};

export type LegacyActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: LegacyActionError };

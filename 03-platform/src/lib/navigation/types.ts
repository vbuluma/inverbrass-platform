/**
 * Purpose:
 * Shared navigation types for BP-001 Platform Foundation (IP-007).
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 * 06-UI-Standards.md §4 — Global Navigation & Session Management
 */

import type { LucideIcon } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type PlatformNavItem = {
  id: string;
  label: string;
  href?: string;
  icon: LucideIcon;
  /** When true, item is visible but not yet routable. */
  placeholder?: boolean;
  /** Optional badge for future notifications/counts. */
  badge?: string;
};

export type PlatformChromeMode = "platform" | "business-app";

export type PlatformChromeContext = {
  mode: PlatformChromeMode;
  userDisplayName: string;
  userInitials: string;
  businessName: string | null;
  businessStatusCode: string | null;
  canSwitchBusiness: boolean;
  businessCount: number;
  showSidebar: boolean;
};

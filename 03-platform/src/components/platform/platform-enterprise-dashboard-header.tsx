/**
 * UX-001.2 — Enterprise Dashboard Identity Header
 *
 * Reusable identity header for operational workspaces.
 * Resolves greeting from user display hierarchy; shows current business + role.
 */

"use client";

import { BadgeCheckIcon } from "lucide-react";

type PlatformEnterpriseDashboardHeaderProps = {
  greeting: string;
  greetingName: string;
  businessName: string;
  roleLabel: string;
  businessStatusCode?: string;
  canSwitchBusiness?: boolean;
};

export function PlatformEnterpriseDashboardHeader({
  greeting,
  greetingName,
  businessName,
  roleLabel,
  businessStatusCode,
  canSwitchBusiness = false,
}: PlatformEnterpriseDashboardHeaderProps) {
  return (
    <header className="space-y-4 border-b border-border pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {greeting}, {greetingName}
          </h1>
          <p className="text-lg font-medium text-foreground/90">{businessName}</p>
          <p className="text-base text-muted-foreground">{roleLabel}</p>
          {businessStatusCode ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
                <BadgeCheckIcon className="size-3.5" aria-hidden />
                Status: {businessStatusCode}
              </span>
            </div>
          ) : null}
        </div>

        {canSwitchBusiness ? (
          <p className="text-xs text-muted-foreground sm:max-w-[14rem] sm:text-right">
            Use the header business switcher to change operating context.
          </p>
        ) : null}
      </div>
    </header>
  );
}

export function timeBasedGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) {
    return "Good Morning";
  }
  if (hour < 17) {
    return "Good Afternoon";
  }
  return "Good Evening";
}

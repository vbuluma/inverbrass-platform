/**
 * UX-001f — Enclosed pill/card style tabs for all workspace navigation.
 */

"use client";

import { cn } from "@/lib/utils";

export type PlatformTabItem = {
  id: string;
  label: string;
};

type PlatformTabsProps = {
  tabs: PlatformTabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  ariaLabel: string;
  className?: string;
};

export function PlatformTabs({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel,
  className,
}: PlatformTabsProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn("flex gap-1.5 overflow-x-auto pb-1", className)}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-emerald-100 text-emerald-900 shadow-sm ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:ring-emerald-800"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

type PlatformTabPanelProps = {
  tabId: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
};

export function PlatformTabPanel({
  tabId,
  activeTab,
  children,
  className,
}: PlatformTabPanelProps) {
  if (activeTab !== tabId) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      className={className}
    >
      {children}
    </div>
  );
}

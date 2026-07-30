"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { PlaceholderNotice } from "@/components/platform/placeholder-notice";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BUSINESS_APP_NAV_ITEMS,
  PLACEHOLDER_MESSAGES,
} from "@/lib/navigation/platform-nav-config";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "inverbrass.sidebar.collapsed";

type PlatformSidebarProps = {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  mobile?: boolean;
  onNavigate?: () => void;
  navLabelOverrides?: Partial<Record<string, string>>;
};

export function PlatformSidebar({
  collapsed = false,
  onCollapsedChange,
  mobile = false,
  onNavigate,
  navLabelOverrides,
}: PlatformSidebarProps) {
  const pathname = usePathname();
  const [placeholder, setPlaceholder] = useState<{
    title: string;
    message: string;
  } | null>(null);

  return (
    <>
      <nav
        aria-label="Main navigation"
        className={cn(
          "flex h-full flex-col bg-sidebar text-sidebar-foreground",
          mobile ? "w-full" : "border-r border-sidebar-border",
          !mobile && collapsed ? "w-[4.25rem]" : !mobile ? "w-60" : undefined
        )}
      >
        <div className="flex items-center justify-between gap-2 p-3">
          {!collapsed || mobile ? (
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Navigation
            </p>
          ) : (
            <span className="sr-only">Navigation</span>
          )}
          {!mobile ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="hidden lg:inline-flex"
              onClick={() => onCollapsedChange?.(!collapsed)}
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            >
              {collapsed ? "»" : "«"}
            </Button>
          ) : null}
        </div>

        <Separator className="bg-sidebar-border" />

        <ul className="flex-1 space-y-1 overflow-y-auto p-2">
          {BUSINESS_APP_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const label = navLabelOverrides?.[item.id] ?? item.label;
            const isActive =
              item.href != null &&
              (pathname === item.href || pathname.startsWith(`${item.href}/`));

            if (item.placeholder || !item.href) {
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setPlaceholder({
                        title: label,
                        message:
                          PLACEHOLDER_MESSAGES[item.id] ??
                          `${label} will be available in a future release.`,
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      collapsed && !mobile && "justify-center px-2"
                    )}
                    title={collapsed && !mobile ? label : undefined}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {(!collapsed || mobile) && <span>{label}</span>}
                  </button>
                </li>
              );
            }

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  prefetch={false}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && !mobile && "justify-center px-2"
                  )}
                  title={collapsed && !mobile ? label : undefined}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {(!collapsed || mobile) && <span>{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {placeholder ? (
        <PlaceholderNotice
          title={placeholder.title}
          message={placeholder.message}
          open
          onOpenChange={(open) => {
            if (!open) {
              setPlaceholder(null);
            }
          }}
        />
      ) : null}
    </>
  );
}

/** Desktop sidebar with persisted collapse state. */
export function PlatformSidebarDesktop({
  navLabelOverrides,
}: {
  navLabelOverrides?: Partial<Record<string, string>>;
}) {
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);

  function handleCollapsedChange(next: boolean) {
    setCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Ignore storage failures.
    }
  }

  return (
    <aside className="hidden shrink-0 lg:block">
      <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
        <PlatformSidebar
          collapsed={collapsed}
          onCollapsedChange={handleCollapsedChange}
          navLabelOverrides={navLabelOverrides}
        />
      </div>
    </aside>
  );
}

function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

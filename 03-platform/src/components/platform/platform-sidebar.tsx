"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { PlaceholderNotice } from "@/components/platform/placeholder-notice";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BUSINESS_APP_NAV_ITEMS,
  PLACEHOLDER_MESSAGES,
} from "@/lib/navigation/platform-nav-config";
import {
  getPrimaryHubItems,
  getUtilityNavItems,
  isNavItemActive,
  findLongestMatchingNavItem,
} from "@/lib/navigation/nav-tree";
import type { PlatformNavItem } from "@/lib/navigation/types";
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

  const primaryItems = getPrimaryHubItems(BUSINESS_APP_NAV_ITEMS);
  const utilityItems = getUtilityNavItems(BUSINESS_APP_NAV_ITEMS);

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

        <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {primaryItems.map((item) => (
            <NavNode
              key={item.id}
              item={item}
              depth={0}
              collapsed={collapsed}
              mobile={mobile}
              pathname={pathname}
              navLabelOverrides={navLabelOverrides}
              onNavigate={onNavigate}
              onPlaceholder={(title, message) =>
                setPlaceholder({ title, message })
              }
            />
          ))}
        </ul>

        {utilityItems.length > 0 ? (
          <>
            <Separator className="bg-sidebar-border" />
            <div className="p-2 pb-3">
              {(!collapsed || mobile) && (
                <p className="mb-1 px-3 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Shortcuts
                </p>
              )}
              <ul className="space-y-0.5">
                {utilityItems.map((item) => (
                  <NavNode
                    key={item.id}
                    item={item}
                    depth={0}
                    collapsed={collapsed}
                    mobile={mobile}
                    pathname={pathname}
                    navLabelOverrides={navLabelOverrides}
                    onNavigate={onNavigate}
                    onPlaceholder={(title, message) =>
                      setPlaceholder({ title, message })
                    }
                  />
                ))}
              </ul>
            </div>
          </>
        ) : null}
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

type NavNodeProps = {
  item: PlatformNavItem;
  depth: number;
  collapsed: boolean;
  mobile: boolean;
  pathname: string;
  navLabelOverrides?: Partial<Record<string, string>>;
  onNavigate?: () => void;
  onPlaceholder: (title: string, message: string) => void;
};

function NavNode({
  item,
  depth,
  collapsed,
  mobile,
  pathname,
  navLabelOverrides,
  onNavigate,
  onPlaceholder,
}: NavNodeProps) {
  const Icon = item.icon;
  const label = navLabelOverrides?.[item.id] ?? item.label;
  const children = item.children ?? [];
  const hasChildren = children.length > 0;
  const descendantActive = isNavItemActive(
    item,
    pathname,
    BUSINESS_APP_NAV_ITEMS
  );
  const selfActive =
    findLongestMatchingNavItem(BUSINESS_APP_NAV_ITEMS, pathname)?.id === item.id;
  const [open, setOpen] = useState(descendantActive);
  const [trackedPath, setTrackedPath] = useState(pathname);
  if (pathname !== trackedPath) {
    setTrackedPath(pathname);
    if (descendantActive) {
      setOpen(true);
    }
  }
  const showLabel = !collapsed || mobile;
  const showChildren = hasChildren && open && showLabel;

  const itemClass = cn(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
    selfActive
      ? "bg-sidebar-primary text-sidebar-primary-foreground"
      : descendantActive && !selfActive
        ? "bg-sidebar-accent/70 text-sidebar-accent-foreground"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    collapsed && !mobile && "justify-center px-2"
  );

  const paddingStyle =
    depth > 0 && showLabel ? { paddingLeft: 12 + depth * 12 } : undefined;

  function renderPlaceholderButton() {
    return (
      <button
        type="button"
        onClick={() =>
          onPlaceholder(
            label,
            PLACEHOLDER_MESSAGES[item.id] ??
              `${label} will be available in a future release.`
          )
        }
        className={itemClass}
        style={paddingStyle}
        title={collapsed && !mobile ? label : undefined}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        {showLabel && <span>{label}</span>}
      </button>
    );
  }

  if (item.placeholder || (!item.href && !hasChildren)) {
    return <li>{renderPlaceholderButton()}</li>;
  }

  return (
    <li>
      <div className="flex items-center">
        {item.href ? (
          <Link
            href={item.href}
            prefetch={false}
            onClick={onNavigate}
            className={cn(itemClass, hasChildren && showLabel && "pr-1")}
            style={paddingStyle}
            title={collapsed && !mobile ? label : undefined}
            aria-current={selfActive ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {showLabel && <span className="min-w-0 flex-1 truncate">{label}</span>}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className={itemClass}
            style={paddingStyle}
            aria-expanded={showChildren}
            aria-controls={`nav-group-${item.id}`}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {showLabel && (
              <span className="min-w-0 flex-1 truncate text-left">{label}</span>
            )}
            {showLabel ? (
              <ChevronDownIcon
                className={cn(
                  "size-4 shrink-0 transition-transform",
                  open ? "rotate-0" : "-rotate-90"
                )}
                aria-hidden
              />
            ) : null}
          </button>
        )}
        {hasChildren && showLabel && item.href ? (
          <button
            type="button"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent"
            aria-expanded={showChildren}
            aria-controls={`nav-group-${item.id}`}
            aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
            onClick={() => setOpen((value) => !value)}
          >
            <ChevronDownIcon
              className={cn("size-4 transition-transform", open ? "rotate-0" : "-rotate-90")}
              aria-hidden
            />
          </button>
        ) : null}
      </div>
      {showChildren ? (
        <ul id={`nav-group-${item.id}`} className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <NavNode
              key={child.id}
              item={child}
              depth={depth + 1}
              collapsed={collapsed}
              mobile={mobile}
              pathname={pathname}
              navLabelOverrides={navLabelOverrides}
              onNavigate={onNavigate}
              onPlaceholder={onPlaceholder}
            />
          ))}
        </ul>
      ) : null}
    </li>
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

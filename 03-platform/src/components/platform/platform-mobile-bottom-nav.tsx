"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontalIcon } from "lucide-react";

import { BUSINESS_APP_NAV_ITEMS } from "@/lib/navigation/platform-nav-config";
import {
  getMobilePrimaryNavItems,
  isNavItemActive,
} from "@/lib/navigation/nav-tree";
import { cn } from "@/lib/utils";

type PlatformMobileBottomNavProps = {
  onMoreClick: () => void;
  navLabelOverrides?: Partial<Record<string, string>>;
};

export function PlatformMobileBottomNav({
  onMoreClick,
  navLabelOverrides,
}: PlatformMobileBottomNavProps) {
  const pathname = usePathname();
  const primaryItems = getMobilePrimaryNavItems(BUSINESS_APP_NAV_ITEMS);
  const moreActive = BUSINESS_APP_NAV_ITEMS.some(
    (item) =>
      !item.mobilePrimary &&
      !item.utility &&
      isNavItemActive(item, pathname, BUSINESS_APP_NAV_ITEMS)
  );

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="grid h-14 grid-cols-5">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const label = navLabelOverrides?.[item.id] ?? item.label;
          const active =
            item.href != null &&
            isNavItemActive(item, pathname, BUSINESS_APP_NAV_ITEMS);
          return (
            <li key={item.id}>
              <Link
                href={item.href ?? "/dashboard"}
                prefetch={false}
                className={cn(
                  "flex h-full min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[11px]",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4" aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMoreClick}
            className={cn(
              "flex h-full min-h-11 w-full flex-col items-center justify-center gap-0.5 px-1 text-[11px]",
              moreActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-current={moreActive ? "true" : undefined}
            aria-label="More navigation"
          >
            <MoreHorizontalIcon className="size-4" aria-hidden />
            <span>More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

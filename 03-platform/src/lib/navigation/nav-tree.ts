/**
 * Purpose:
 * Tree helpers for hub-first platform navigation (NAV-001).
 */

import type { PlatformNavItem } from "@/lib/navigation/types";

export function flattenPlatformNavItems(
  items: PlatformNavItem[]
): PlatformNavItem[] {
  const out: PlatformNavItem[] = [];
  for (const item of items) {
    out.push(item);
    if (item.children?.length) {
      out.push(...flattenPlatformNavItems(item.children));
    }
  }
  return out;
}

export function navContainsHref(
  items: PlatformNavItem[],
  href: string
): boolean {
  return flattenPlatformNavItems(items).some((item) => item.href === href);
}

export function isHrefActive(href: string | undefined, pathname: string): boolean {
  if (!href) {
    return false;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function findLongestMatchingNavItem(
  items: PlatformNavItem[],
  pathname: string
): PlatformNavItem | undefined {
  let best: PlatformNavItem | undefined;
  for (const item of flattenPlatformNavItems(items)) {
    if (!isHrefActive(item.href, pathname)) {
      continue;
    }
    if (!best || (item.href?.length ?? 0) > (best.href?.length ?? 0)) {
      best = item;
    }
  }
  return best;
}

function itemContainsId(item: PlatformNavItem, id: string): boolean {
  if (item.id === id) {
    return true;
  }
  return item.children?.some((child) => itemContainsId(child, id)) ?? false;
}

export function isNavItemActive(
  item: PlatformNavItem,
  pathname: string,
  forest: PlatformNavItem[]
): boolean {
  const best = findLongestMatchingNavItem(forest, pathname);
  if (best) {
    return itemContainsId(item, best.id);
  }
  return isHrefActive(item.href, pathname);
}

export function findNavItemByHref(
  items: PlatformNavItem[],
  href: string
): PlatformNavItem | undefined {
  return flattenPlatformNavItems(items).find((item) => item.href === href);
}

export function getPrimaryHubItems(items: PlatformNavItem[]): PlatformNavItem[] {
  return items.filter((item) => !item.utility);
}

export function getUtilityNavItems(items: PlatformNavItem[]): PlatformNavItem[] {
  return items.filter((item) => item.utility);
}

export function getMobilePrimaryNavItems(
  items: PlatformNavItem[]
): PlatformNavItem[] {
  return items.filter((item) => item.mobilePrimary && !item.utility);
}

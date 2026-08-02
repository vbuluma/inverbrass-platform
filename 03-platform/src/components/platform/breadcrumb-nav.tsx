"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buildDefaultBreadcrumbs } from "@/lib/navigation/breadcrumb-utils";
import type { BreadcrumbItem as Crumb } from "@/lib/navigation/types";
import { useBusinessTerminology } from "@/core/industry-experience/business-terminology-context";

import { useBreadcrumbContext } from "./breadcrumb-context";

type BreadcrumbNavProps = {
  /** When true, hide on the dashboard root route. */
  hideOnDashboard?: boolean;
};

export function BreadcrumbNav({ hideOnDashboard = true }: BreadcrumbNavProps) {
  const pathname = usePathname();
  const terminology = useBusinessTerminology();
  const { items: overrideItems, setItems } = useBreadcrumbContext();

  useEffect(() => {
    return () => setItems(null);
  }, [pathname, setItems]);

  const items = useMemo(() => {
    if (overrideItems && overrideItems.length > 0) {
      return overrideItems;
    }
    return buildDefaultBreadcrumbs(pathname, {
      products: terminology.navigation.breadcrumbOfferings,
    });
  }, [overrideItems, pathname, terminology.navigation.breadcrumbOfferings]);

  if (hideOnDashboard && pathname === "/dashboard") {
    return null;
  }

  if (items.length <= 1 && pathname === "/dashboard") {
    return null;
  }

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList>
        {items.map((item, index) => (
          <CrumbSegment
            key={`${item.label}-${index}`}
            item={item}
            isLast={index === items.length - 1}
          />
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function CrumbSegment({ item, isLast }: { item: Crumb; isLast: boolean }) {
  return (
    <>
      <BreadcrumbItem>
        {isLast || !item.href ? (
          <BreadcrumbPage>{item.label}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink
            render={
              <Link href={item.href} prefetch={false}>
                {item.label}
              </Link>
            }
          />
        )}
      </BreadcrumbItem>
      {!isLast ? <BreadcrumbSeparator /> : null}
    </>
  );
}

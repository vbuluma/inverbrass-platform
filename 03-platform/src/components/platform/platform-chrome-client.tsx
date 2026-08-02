"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { BreadcrumbProvider } from "@/components/platform/breadcrumb-context";
import {
  PlatformAppShell,
  PlatformChromeShell,
} from "@/components/platform/platform-app-shell";
import {
  BusinessTerminologyProvider,
} from "@/core/industry-experience/business-terminology-context";
import { DEFAULT_BUSINESS_TERMINOLOGY } from "@/core/industry-experience/business-terminology";
import { isBusinessAppRoute } from "@/lib/navigation/business-app-routes";
import type {
  PlatformChromeContext,
  PlatformChromeMode,
} from "@/lib/navigation/types";

type PlatformChromeClientProps = {
  context: PlatformChromeContext;
  children: ReactNode;
};

export function PlatformChromeClient({
  context,
  children,
}: PlatformChromeClientProps) {
  const pathname = usePathname();
  const showSidebar = isBusinessAppRoute(pathname);
  const mode: PlatformChromeMode = showSidebar ? "business-app" : "platform";
  const shellContext: PlatformChromeContext = {
    ...context,
    mode,
    showSidebar,
  };

  return (
    <BusinessTerminologyProvider
      terminology={context.terminology ?? DEFAULT_BUSINESS_TERMINOLOGY}
    >
      <BreadcrumbProvider>
        {showSidebar ? (
          <PlatformAppShell context={shellContext}>{children}</PlatformAppShell>
        ) : (
          <PlatformChromeShell context={shellContext}>{children}</PlatformChromeShell>
        )}
      </BreadcrumbProvider>
    </BusinessTerminologyProvider>
  );
}

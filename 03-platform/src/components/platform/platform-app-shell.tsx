"use client";

import { useState, type ReactNode } from "react";

import { BreadcrumbNav } from "@/components/platform/breadcrumb-nav";
import { PlatformHeader } from "@/components/platform/platform-header";
import { PlatformMobileBottomNav } from "@/components/platform/platform-mobile-bottom-nav";
import {
  PlatformSidebar,
  PlatformSidebarDesktop,
} from "@/components/platform/platform-sidebar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PlatformChromeContext } from "@/lib/navigation/types";

type PlatformAppShellProps = {
  context: PlatformChromeContext;
  children: ReactNode;
};

export function PlatformAppShell({ context, children }: PlatformAppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PlatformHeader
        {...context}
        showMenuButton={context.showSidebar}
        onMenuClick={() => setMobileNavOpen(true)}
      />

      <div className="flex flex-1">
        {context.showSidebar ? (
          <PlatformSidebarDesktop
            navLabelOverrides={context.navLabelOverrides}
          />
        ) : null}

        <div className="platform-workspace-main flex min-w-0 flex-1 flex-col pb-16 shadow-[inset_1px_0_0_0_rgba(0,0,0,0.04)] lg:pb-0">
          {context.showSidebar ? (
            <div className="border-b border-border px-4 py-2 sm:px-6">
              <BreadcrumbNav />
            </div>
          ) : null}
          <div className="flex-1">{children}</div>
        </div>
      </div>

      {context.showSidebar ? (
        <PlatformMobileBottomNav
          onMoreClick={() => setMobileNavOpen(true)}
          navLabelOverrides={context.navLabelOverrides}
        />
      ) : null}

      {context.showSidebar ? (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[min(100vw-2rem,18rem)] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation menu</SheetTitle>
              <SheetDescription>
                Main navigation for InverBrass business operations
              </SheetDescription>
            </SheetHeader>
            <PlatformSidebar
              mobile
              onNavigate={() => setMobileNavOpen(false)}
              navLabelOverrides={context.navLabelOverrides}
            />
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

type PlatformChromeShellProps = {
  context: PlatformChromeContext;
  children: ReactNode;
};

/** Header-only shell for platform-level authenticated routes. */
export function PlatformChromeShell({
  context,
  children,
}: PlatformChromeShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PlatformHeader {...context} />
      <div className="flex-1">{children}</div>
    </div>
  );
}

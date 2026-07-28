/**
 * Purpose:
 * Server wrapper that loads platform chrome context for authenticated layouts.
 *
 * Implementation Package:
 * BP-001 / IP-007 – Global Navigation & Session Management
 */

import {
  PlatformAppShell,
  PlatformChromeShell,
} from "@/components/platform/platform-app-shell";
import { createPlatformNavigationService } from "@/core/navigation/services/platform-navigation-service";
import type { PlatformChromeMode } from "@/lib/navigation/types";

type PlatformChromeProps = {
  mode: PlatformChromeMode;
  children: React.ReactNode;
};

export async function PlatformChrome({ mode, children }: PlatformChromeProps) {
  const service = createPlatformNavigationService();
  const context = await service.getChromeContext(mode);

  if (!context) {
    return children;
  }

  if (context.showSidebar) {
    return <PlatformAppShell context={context}>{children}</PlatformAppShell>;
  }

  return (
    <PlatformChromeShell context={context}>{children}</PlatformChromeShell>
  );
}

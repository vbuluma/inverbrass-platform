/**
 * Purpose:
 * Server wrapper that loads platform chrome context for authenticated layouts.
 *
 * Implementation Package:
 * BP-001 / IP-007 – Global Navigation & Session Management
 */

import { PlatformChromeClient } from "@/components/platform/platform-chrome-client";
import { createPlatformNavigationService } from "@/core/navigation/services/platform-navigation-service";

type PlatformChromeProps = {
  children: React.ReactNode;
};

export async function PlatformChrome({ children }: PlatformChromeProps) {
  const service = createPlatformNavigationService();
  const context = await service.getChromeContext();

  if (!context) {
    return children;
  }

  return (
    <PlatformChromeClient context={context}>{children}</PlatformChromeClient>
  );
}

/**
 * Purpose:
 * Gate Platform Home routes on authenticated session and completed first-login.
 *
 * Design rationale:
 * Platform Home does not require a business context — users may have zero businesses.
 *
 * Why this exists:
 * BP-001 foundation correction — Platform Home is the post-auth entry point.
 */

import { assertPlatformHomeAccess } from "@/core/auth/guards/authenticated-route-guard";

export default async function PlatformHomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await assertPlatformHomeAccess();
  return children;
}

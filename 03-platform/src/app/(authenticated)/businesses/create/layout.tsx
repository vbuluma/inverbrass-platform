/**
 * Purpose:
 * Gate Business Creation on authenticated Platform User session.
 *
 * Why this exists:
 * Business Registration starts only after Platform Registration completes.
 */

import { assertPlatformHomeAccess } from "@/core/auth/guards/authenticated-route-guard";

export default async function CreateBusinessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await assertPlatformHomeAccess();
  return children;
}

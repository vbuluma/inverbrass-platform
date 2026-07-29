import { assertAuthenticatedSession } from "@/core/auth/guards/authenticated-route-guard";
import { PlatformChrome } from "@/components/platform/platform-chrome";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await assertAuthenticatedSession();

  return <PlatformChrome>{children}</PlatformChrome>;
}

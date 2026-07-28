import { assertAuthenticatedSession } from "@/core/auth/guards/authenticated-route-guard";
import { PlatformChrome } from "@/components/platform/platform-chrome";
import {
  getRequestPathname,
  isBusinessAppRoute,
} from "@/lib/navigation/request-pathname";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await assertAuthenticatedSession();

  const pathname = await getRequestPathname();
  const mode = isBusinessAppRoute(pathname) ? "business-app" : "platform";

  return <PlatformChrome mode={mode}>{children}</PlatformChrome>;
}

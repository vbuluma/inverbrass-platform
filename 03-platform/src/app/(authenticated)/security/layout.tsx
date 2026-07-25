import { assertPlatformHomeAccess } from "@/core/auth/guards/authenticated-route-guard";

export default async function SecurityLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await assertPlatformHomeAccess();
  return children;
}

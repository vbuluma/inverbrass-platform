import { assertPlatformHomeAccess } from "@/core/auth/guards/authenticated-route-guard";

export default async function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await assertPlatformHomeAccess();
  return children;
}

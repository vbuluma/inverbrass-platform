import { assertPlatformHomeAccess } from "@/core/auth/guards/authenticated-route-guard";

export default async function ProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await assertPlatformHomeAccess();
  return children;
}

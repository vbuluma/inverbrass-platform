import { assertAuthenticatedSession } from "@/core/auth/guards/authenticated-route-guard";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await assertAuthenticatedSession();

  return children;
}

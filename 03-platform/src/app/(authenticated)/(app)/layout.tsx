import { assertFirstLoginCompleted } from "@/core/auth/guards/authenticated-route-guard";

export default async function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await assertFirstLoginCompleted();

  return children;
}

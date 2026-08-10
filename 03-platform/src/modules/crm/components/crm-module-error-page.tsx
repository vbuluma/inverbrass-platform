/**
 * Purpose:
 * CRM module error page for route-level failures.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

"use client";

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CrmModuleErrorPageProps = {
  message: string;
  titleKind?: "dashboard" | "workspace" | "registration";
};

export function CrmModuleErrorPage({
  message,
  titleKind = "dashboard",
}: CrmModuleErrorPageProps) {
  const title =
    titleKind === "workspace"
      ? "Customer profile unavailable"
      : titleKind === "registration"
        ? "Registration unavailable"
        : "Customers unavailable";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/customers" label="Back to customers" />
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/customers" className={buttonVariants({ variant: "outline" })}>
            Return to customers
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

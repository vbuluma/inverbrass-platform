/**
 * Purpose:
 * CRM module error page for route-level failures.
 *
 * Implementation Package:
 * BP-004 / IP-001 - CRM Foundation & Customer 360
 * BP-004 / IP-10/11/12 - Sales & Marketing modules
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
import { cn } from "@/lib/utils";

type CrmModuleErrorPageProps = {
  message: string;
  /** Preset title for CRM Foundation (customer) error pages. */
  titleKind?: "dashboard" | "workspace" | "registration";
  /** Explicit title override — takes precedence over titleKind. Used by Sales & Marketing modules. */
  title?: string;
  /** Where the "back" link should go. Defaults to /customers. */
  backHref?: string;
  /** Label for the back link / button. Defaults to "Back to Customer Profile". */
  backLabel?: string;
};

export function CrmModuleErrorPage({
  message,
  titleKind = "dashboard",
  title,
  backHref = "/customers",
  backLabel = "Back to Customer Profile",
}: CrmModuleErrorPageProps) {
  const resolvedTitle =
    title ??
    (titleKind === "workspace"
      ? "Customer profile unavailable"
      : titleKind === "registration"
        ? "Registration unavailable"
        : "Customer Profile unavailable");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href={backHref} label={backLabel} />
      <Card>
        <CardHeader>
          <CardTitle>{resolvedTitle}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={backHref}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {backLabel}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
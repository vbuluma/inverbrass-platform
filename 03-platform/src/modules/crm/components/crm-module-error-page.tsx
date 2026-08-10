/**
 * CRM module error page.
 */

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CrmModuleErrorPageProps = {
  message: string;
  title?: string;
};

export function CrmModuleErrorPage({
  message,
  title = "Quotations",
}: CrmModuleErrorPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <div>
        <Link href="/quotations" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to Quotations
        </Link>
      </div>
    </main>
  );
}

import Link from "next/link";
import { ArrowLeftIcon, XIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageBackLinkProps = {
  href: string;
  label?: string;
  variant?: "back" | "cancel" | "close";
  className?: string;
};

const VARIANT_LABELS = {
  back: "Back",
  cancel: "Cancel",
  close: "Close",
} as const;

export function PageBackLink({
  href,
  label,
  variant = "back",
  className,
}: PageBackLinkProps) {
  const text = label ?? VARIANT_LABELS[variant];
  const Icon = variant === "close" ? XIcon : ArrowLeftIcon;

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "w-fit gap-2 px-0",
        className
      )}
    >
      <Icon className="size-4" aria-hidden />
      {text}
    </Link>
  );
}

"use client";

import Link from "next/link";
import {
  ArrowLeftRightIcon,
  Building2Icon,
  ChevronDownIcon,
} from "lucide-react";
import { useState } from "react";

import { PlaceholderNotice } from "@/components/platform/placeholder-notice";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PLACEHOLDER_MESSAGES,
  PLATFORM_BRAND,
} from "@/lib/navigation/platform-nav-config";
import { cn } from "@/lib/utils";

type BusinessSwitcherProps = {
  businessName: string | null;
  canSwitchBusiness: boolean;
  businessCount: number;
  compact?: boolean;
};

export function BusinessSwitcher({
  businessName,
  canSwitchBusiness,
  businessCount,
  compact = false,
}: BusinessSwitcherProps) {
  const [placeholderOpen, setPlaceholderOpen] = useState(false);

  if (!businessName) {
    return (
      <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground sm:inline">
        {PLATFORM_BRAND.name}
      </span>
    );
  }

  if (canSwitchBusiness) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("max-w-[14rem] gap-1.5", compact && "h-8 px-2")}
            >
              <Building2Icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{businessName}</span>
              <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Current business</DropdownMenuLabel>
          <DropdownMenuItem disabled>{businessName}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            render={
              <Link href="/select-business" prefetch={false}>
                <ArrowLeftRightIcon aria-hidden />
                Switch Business
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link href="/home" prefetch={false}>
                Platform Home
              </Link>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPlaceholderOpen(true)}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "max-w-[14rem] gap-1.5",
          compact && "h-8 px-2"
        )}
        title={businessName}
      >
        <Building2Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{businessName}</span>
        {businessCount === 1 ? (
          <ChevronDownIcon className="size-3.5 shrink-0 opacity-40" aria-hidden />
        ) : null}
      </button>
      <PlaceholderNotice
        title="Switch Business"
        message={PLACEHOLDER_MESSAGES["switch-business-single"]}
        open={placeholderOpen}
        onOpenChange={setPlaceholderOpen}
      />
    </>
  );
}

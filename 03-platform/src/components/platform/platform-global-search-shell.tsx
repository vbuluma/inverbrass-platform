/**
 * UX-001.1i — Global search shell (architecture foundation; full search deferred).
 */

"use client";

import { SearchIcon } from "lucide-react";
import { useMemo } from "react";

import { useBusinessTerminology } from "@/core/industry-experience/business-terminology-context";
import { PLATFORM_NAV_LABELS } from "@/core/industry-experience/platform-terminology";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type PlatformGlobalSearchShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function useGlobalSearchLabels() {
  const terminology = useBusinessTerminology();

  return useMemo(() => {
    const partyPlural = terminology.entities.party.plural;
    const offeringsPlural = terminology.offerings.plural;
    const branchSingular = terminology.entities.branch.singular;

    return {
      description: `Global search foundation. Future: Ctrl+K to search ${partyPlural}, ${offeringsPlural}, Document, ${PLATFORM_NAV_LABELS.groups}, and more.`,
      placeholder: `Search ${partyPlural.toLowerCase()}, documents, ${PLATFORM_NAV_LABELS.groups.toLowerCase()}…`,
      partySearch: `${partyPlural} search`,
      orgUnitSearch: `${branchSingular} search`,
    };
  }, [terminology]);
}

export function PlatformGlobalSearchShell({
  open,
  onOpenChange,
}: PlatformGlobalSearchShellProps) {
  const searchLabels = useGlobalSearchLabels();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="mx-auto max-h-[85vh] w-full max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Search</SheetTitle>
          <SheetDescription>{searchLabels.description}</SheetDescription>
        </SheetHeader>

        <div className="relative mt-4">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder={searchLabels.placeholder}
            className="pl-9"
            autoFocus
            readOnly
            aria-readonly
          />
        </div>

        <div className="mt-6 space-y-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Coming soon</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{searchLabels.partySearch}</li>
            <li>Document search</li>
            <li>{`${PLATFORM_NAV_LABELS.groups} search`}</li>
            <li>{searchLabels.orgUnitSearch}</li>
            <li>Keyboard shortcut: Ctrl+K</li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PlatformGlobalSearchTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label="Open search"
    >
      <div className="relative w-full max-w-[14rem] lg:max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          readOnly
          placeholder="Search..."
          className="h-8 cursor-pointer pl-8 text-sm"
          tabIndex={-1}
        />
      </div>
    </button>
  );
}

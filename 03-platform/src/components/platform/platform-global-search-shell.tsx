/**
 * UX-001.1i — Global search shell (architecture foundation; full search deferred).
 */

"use client";

import { SearchIcon } from "lucide-react";

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

export function PlatformGlobalSearchShell({
  open,
  onOpenChange,
}: PlatformGlobalSearchShellProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="mx-auto max-h-[85vh] w-full max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Search</SheetTitle>
          <SheetDescription>
            Global search foundation. Future: Ctrl+K to search Party, Product, Document, Group, and more.
          </SheetDescription>
        </SheetHeader>

        <div className="relative mt-4">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Search parties, documents, groups…"
            className="pl-9"
            autoFocus
            readOnly
            aria-readonly
          />
        </div>

        <div className="mt-6 space-y-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Coming soon</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Party search</li>
            <li>Document search</li>
            <li>Group search</li>
            <li>Organization unit search</li>
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

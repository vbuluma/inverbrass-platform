"use client";

import { InfoIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type PlaceholderNoticeProps = {
  title: string;
  message: string;
  triggerLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function PlaceholderNotice({
  title,
  message,
  triggerLabel,
  open: controlledOpen,
  onOpenChange,
}: PlaceholderNoticeProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <>
      {triggerLabel ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
          {triggerLabel}
        </Button>
      ) : null}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh]">
          <SheetHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <InfoIcon className="size-5" aria-hidden />
              </span>
              <div className="space-y-1 text-left">
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription>{message}</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="px-4 pb-4">
            <Button type="button" className="w-full" onClick={() => setOpen(false)}>
              Got it
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

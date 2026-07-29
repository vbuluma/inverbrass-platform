/**
 * UX-001.1h — Reusable notification center (bell + sheet).
 */

"use client";

import { BellIcon } from "lucide-react";

import { useNotifications, type PlatformNotification } from "@/components/platform/use-notifications";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type PlatformNotificationCenterProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function severityDotClass(severity: PlatformNotification["severity"]): string {
  switch (severity) {
    case "success":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "error":
      return "bg-destructive";
    case "info":
      return "bg-primary";
  }
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PlatformNotificationBell({
  onClick,
  unreadCount,
}: {
  onClick: () => void;
  unreadCount: number;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      className="relative"
    >
      <BellIcon aria-hidden />
      {unreadCount > 0 ? (
        <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Button>
  );
}

export function PlatformNotificationCenter({
  open,
  onOpenChange,
}: PlatformNotificationCenterProps) {
  const { notifications, markRead, markAllRead, clearAll } = useNotifications();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            Action successes, warnings, and errors. Workflow and AI alerts will appear here in future releases.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={markAllRead}>
            Mark all read
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clearAll}>
            Clear all
          </Button>
        </div>

        <div className="mt-4 space-y-3 overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => markRead(item.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50",
                  !item.read && "border-primary/30 bg-primary/5"
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", severityDotClass(item.severity))}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.title}</p>
                    {item.message ? (
                      <p className="mt-0.5 text-muted-foreground">{item.message}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { useNotifications } from "@/components/platform/use-notifications";
/**
 * UX-001.1h — Notification store and types.
 */

"use client";

import { useCallback, useState } from "react";

export type PlatformNotificationSeverity = "success" | "warning" | "error" | "info";

export type PlatformNotification = {
  id: string;
  title: string;
  message: string;
  severity: PlatformNotificationSeverity;
  createdAt: string;
  read: boolean;
  href?: string;
};

const STORAGE_KEY = "platform-notifications";

function readStored(): PlatformNotification[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as PlatformNotification[];
  } catch {
    return [];
  }
}

function writeStored(notifications: PlatformNotification[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<PlatformNotification[]>(
    () => (typeof window === "undefined" ? [] : readStored())
  );
  const isHydrated = typeof window !== "undefined";

  const persist = useCallback((next: PlatformNotification[]) => {
    setNotifications(next);
    writeStored(next);
  }, []);

  const addNotification = useCallback(
    (input: Omit<PlatformNotification, "id" | "createdAt" | "read">) => {
      const notification: PlatformNotification = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        read: false,
      };
      persist([notification, ...readStored()].slice(0, 50));
      return notification.id;
    },
    [persist]
  );

  const markRead = useCallback(
    (id: string) => {
      persist(
        readStored().map((item) =>
          item.id === id ? { ...item, read: true } : item
        )
      );
    },
    [persist]
  );

  const markAllRead = useCallback(() => {
    persist(readStored().map((item) => ({ ...item, read: true })));
  }, [persist]);

  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  return {
    notifications,
    unreadCount,
    isHydrated,
    addNotification,
    markRead,
    markAllRead,
    clearAll,
  };
}

/**
 * UX-001.1j — Favorites / pinning for workspaces.
 */

"use client";

import { StarIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FavoriteEntityType = "party" | "group" | "organization";

export type PlatformFavorite = {
  id: string;
  entityType: FavoriteEntityType;
  entityId: string;
  label: string;
  href: string;
  pinnedAt: string;
};

const STORAGE_KEY = "platform-favorites";

function readFavorites(): PlatformFavorite[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as PlatformFavorite[];
  } catch {
    return [];
  }
}

function writeFavorites(favorites: PlatformFavorite[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<PlatformFavorite[]>(
    () => (typeof window === "undefined" ? [] : readFavorites())
  );
  const isHydrated = typeof window !== "undefined";

  const isPinned = useCallback(
    (entityType: FavoriteEntityType, entityId: string) =>
      readFavorites().some(
        (item) => item.entityType === entityType && item.entityId === entityId
      ),
    []
  );

  const toggleFavorite = useCallback(
    (input: Omit<PlatformFavorite, "id" | "pinnedAt">) => {
      const current = readFavorites();
      const existing = current.find(
        (item) =>
          item.entityType === input.entityType && item.entityId === input.entityId
      );
      let next: PlatformFavorite[];
      if (existing) {
        next = current.filter((item) => item.id !== existing.id);
      } else {
        next = [
          {
            ...input,
            id: crypto.randomUUID(),
            pinnedAt: new Date().toISOString(),
          },
          ...current,
        ];
      }
      setFavorites(next);
      writeFavorites(next);
      return !existing;
    },
    []
  );

  return { favorites, isHydrated, isPinned, toggleFavorite };
}

type PlatformFavoriteButtonProps = {
  entityType: FavoriteEntityType;
  entityId: string;
  label: string;
  href: string;
  className?: string;
};

export function PlatformFavoriteButton({
  entityType,
  entityId,
  label,
  href,
  className,
}: PlatformFavoriteButtonProps) {
  const { isPinned, toggleFavorite, isHydrated } = useFavorites();
  const pinned = isHydrated && isPinned(entityType, entityId);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      aria-label={pinned ? `Unpin ${label}` : `Pin ${label}`}
      aria-pressed={pinned}
      onClick={() =>
        toggleFavorite({ entityType, entityId, label, href })
      }
    >
      <StarIcon
        className={cn("size-4", pinned && "fill-amber-400 text-amber-500")}
        aria-hidden
      />
    </Button>
  );
}

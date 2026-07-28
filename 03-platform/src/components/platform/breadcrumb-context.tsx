"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { BreadcrumbItem } from "@/lib/navigation/types";

type BreadcrumbContextValue = {
  items: BreadcrumbItem[] | null;
  setItems: (items: BreadcrumbItem[] | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItemsState] = useState<BreadcrumbItem[] | null>(null);

  const setItems = useCallback((next: BreadcrumbItem[] | null) => {
    setItemsState(next);
  }, []);

  const value = useMemo(
    () => ({
      items,
      setItems,
    }),
    [items, setItems]
  );

  return (
    <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbContext(): BreadcrumbContextValue {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error("useBreadcrumbContext must be used within BreadcrumbProvider");
  }
  return context;
}

/** Merge page-specific breadcrumb overrides into the shell. */
export function SetBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const { setItems } = useBreadcrumbContext();

  useEffect(() => {
    setItems(items);
    return () => setItems(null);
  }, [items, setItems]);

  return null;
}

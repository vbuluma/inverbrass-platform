/**
 * Purpose:
 * Display a friendly notice when a reference catalogue has no active rows.
 *
 * Design rationale:
 * Keeps empty-catalogue UX consistent across registration, login, recovery,
 * and setup without duplicating alert markup.
 *
 * Business rationale:
 * IP-006A requires user-friendly messaging when lookups return empty sets.
 *
 * Implementation Package:
 * IP-006A – Platform Initialization & Security Hardening
 */

import { Alert, AlertDescription } from "@/components/ui/alert";

type CatalogEmptyNoticeProps = {
  message: string;
};

export function CatalogEmptyNotice({ message }: CatalogEmptyNoticeProps) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

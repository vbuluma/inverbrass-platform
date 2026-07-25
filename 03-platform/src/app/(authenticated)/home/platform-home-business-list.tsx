/**
 * Purpose:
 * Client list of businesses on Platform Home with Open → selectBusinessAction.
 *
 * Design rationale:
 * Opening a business must set the signed business-context cookie before navigating
 * to setup or dashboard.
 *
 * Why this exists:
 * BP-001 Platform Home — My Businesses entry into Industry Solutions.
 */

"use client";

import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { selectBusinessAction } from "@/core/auth/actions/select-business-actions";
import type { SelectableBusiness } from "@/core/auth/types";

type PlatformHomeBusinessListProps = {
  businesses: SelectableBusiness[];
};

export function PlatformHomeBusinessList({
  businesses,
}: PlatformHomeBusinessListProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openBusiness(membershipId: string) {
    setErrorMessage(null);
    setPendingId(membershipId);

    startTransition(async () => {
      const result = await selectBusinessAction(membershipId);

      if (result && !result.success) {
        setErrorMessage(result.error.message);
        setPendingId(null);
      }
    });
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2 rounded-lg border border-border p-3">
        {businesses.map((business) => (
          <li
            key={business.membershipId}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div>
              <p className="font-medium">{business.businessName}</p>
              <p className="text-muted-foreground">
                {business.businessTypeName} · {business.countryName}
                {business.businessStatusCode === "DRAFT"
                  ? " · Setup in progress"
                  : ""}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => openBusiness(business.membershipId)}
            >
              {pendingId === business.membershipId ? "Opening..." : "Open"}
            </Button>
          </li>
        ))}
      </ul>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

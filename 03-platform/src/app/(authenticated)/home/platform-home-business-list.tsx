/**
 * Purpose:
 * Client list of businesses on Platform Home with Open → selectBusinessFormAction.
 *
 * Design rationale:
 * Native form submit + server redirect() sets the business-context cookie and
 * navigates to /setup (DRAFT) or /dashboard (ACTIVE) without App Router races.
 *
 * Why this exists:
 * BP-001 Platform Home — My Businesses entry into Industry Solutions.
 */

"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { selectBusinessFormAction } from "@/core/auth/actions/select-business-actions";
import type { SelectableBusiness } from "@/core/auth/types";

type PlatformHomeBusinessListProps = {
  businesses: SelectableBusiness[];
};

function OpenBusinessSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "Opening..." : "Open Business"}
    </Button>
  );
}

export function PlatformHomeBusinessList({
  businesses,
}: PlatformHomeBusinessListProps) {
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
                {business.businessStatusCode === "DRAFT"
                  ? "Setup in progress"
                  : business.businessStatusCode === "ACTIVE"
                    ? "Active"
                    : business.businessStatusCode}
                {" · "}
                {business.businessTypeName} · {business.countryName}
              </p>
            </div>
            <form action={selectBusinessFormAction}>
              <input
                type="hidden"
                name="membershipId"
                value={business.membershipId}
              />
              <OpenBusinessSubmitButton />
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

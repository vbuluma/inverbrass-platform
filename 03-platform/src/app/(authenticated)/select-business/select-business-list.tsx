/**
 * Purpose:
 * Present selectable businesses and submit the user's business context choice.
 *
 * Design rationale:
 * Native form + selectBusinessFormAction + server redirect() matches Open Business
 * and Create Business navigation reliability.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (ADR-012)
 *
 * Implementation Package:
 * BP-001 Final Stabilization
 */

"use client";

import { Building2Icon } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { selectBusinessFormAction } from "@/core/auth/actions/select-business-actions";
import type { SelectableBusiness } from "@/core/auth/types";
import { cn } from "@/lib/utils";

type SelectBusinessListProps = {
  businesses: SelectableBusiness[];
};

function ContinueSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Switching..." : "Continue"}
    </Button>
  );
}

export function SelectBusinessList({ businesses }: SelectBusinessListProps) {
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(
    businesses.find((business) => business.isPrimary)?.membershipId ??
      businesses[0]?.membershipId ??
      null
  );

  return (
    <form action={selectBusinessFormAction} className="space-y-4">
      <div className="space-y-2">
        {businesses.map((business) => {
          const isSelected = selectedMembershipId === business.membershipId;

          return (
            <label
              key={business.membershipId}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <input
                type="radio"
                name="membershipId"
                value={business.membershipId}
                checked={isSelected}
                onChange={() => setSelectedMembershipId(business.membershipId)}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Building2Icon className="size-4 text-muted-foreground" />
                  <span className="font-medium">{business.businessName}</span>
                  {business.isOwner ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      Owner
                    </span>
                  ) : null}
                  {business.isPrimary ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Last active
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {business.businessTypeName} · {business.countryName}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      <ContinueSubmitButton />
    </form>
  );
}

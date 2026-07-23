/**
 * Purpose:
 * Present selectable businesses and submit the user's business context choice.
 *
 * Business Context:
 * Multi-business users pick their active business before dashboard access. Owner and
 * last-active badges help distinguish memberships at a glance.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (ADR-012)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Render selectable businesses with owner and primary badges
 * - Invoke selectBusinessAction on user selection
 *
 * Non-Responsibilities:
 * - Business context cookie signing (BusinessContextService)
 * - Membership eligibility checks (BusinessContextService)
 *
 * Dependencies:
 * - selectBusinessAction, shadcn/ui components
 *
 * Business Rules Implemented:
 * - ADR-012 — explicit business selection for multi-membership users
 *
 * Extension Points:
 * - Business search or recent activity sorting may be added later
 */

"use client";

import { Building2Icon } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { selectBusinessAction } from "@/core/auth/actions/select-business-actions";
import type { SelectableBusiness } from "@/core/auth/types";
import { cn } from "@/lib/utils";

type SelectBusinessListProps = {
  businesses: SelectableBusiness[];
};

export function SelectBusinessList({ businesses }: SelectBusinessListProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(
    businesses.find((business) => business.isPrimary)?.membershipId ??
      businesses[0]?.membershipId ??
      null
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErrorMessage(null);

    const membershipId = String(formData.get("membershipId") ?? "");

    startTransition(async () => {
      const result = await selectBusinessAction(membershipId);

      if (result && !result.success) {
        setErrorMessage(result.error.message);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
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

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isPending || !selectedMembershipId} className="w-full">
        {isPending ? "Switching..." : "Continue"}
      </Button>
    </form>
  );
}

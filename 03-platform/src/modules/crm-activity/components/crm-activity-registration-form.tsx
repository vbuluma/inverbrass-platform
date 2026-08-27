/**
 * Purpose:
 * Create activity form.
 *
 * Implementation Package:
 * BP-004 / IP-05 – Activity & Task Management
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useControlledForm } from "@/lib/forms";
import { EMPTY_TEXT } from "@/lib/forms/form-field-values";
import { cn } from "@/lib/utils";
import { createCrmActivityAction } from "@/modules/crm-activity/actions/crm-activity-actions";
import {
  CRM_ACTIVITY_PRIORITY_CODES,
  CRM_ACTIVITY_TYPE_CODES,
} from "@/modules/crm-activity/constants";
import type { CrmActivityRegistrationCatalogues } from "@/modules/crm-activity/types";

type FormState = {
  activityTypeCode: string;
  subject: string;
  description: string;
  priorityCode: string;
  dueDate: string;
  ownerUserId: string;
  primaryPartyId: string;
};

type CrmActivityRegistrationFormProps = {
  catalogues: CrmActivityRegistrationCatalogues;
  defaultOwnerUserId: string;
  defaultPartyId?: string;
};

const fieldClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function CrmActivityRegistrationForm({
  catalogues,
  defaultOwnerUserId,
  defaultPartyId,
}: CrmActivityRegistrationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { values, setField } = useControlledForm<FormState>({
    initial: {
      activityTypeCode: CRM_ACTIVITY_TYPE_CODES.TASK,
      subject: EMPTY_TEXT,
      description: EMPTY_TEXT,
      priorityCode: CRM_ACTIVITY_PRIORITY_CODES.NORMAL,
      dueDate: EMPTY_TEXT,
      ownerUserId: defaultOwnerUserId,
      primaryPartyId: defaultPartyId ?? EMPTY_TEXT,
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await createCrmActivityAction({
        activityTypeCode: values.activityTypeCode,
        subject: values.subject,
        description: values.description || null,
        priorityCode: values.priorityCode,
        dueDate: values.dueDate
          ? new Date(values.dueDate).toISOString()
          : null,
        ownerUserId: values.ownerUserId,
        primaryPartyId: values.primaryPartyId,
      });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setMessage(result.platform?.message ?? "Activity created.");
      router.push(`/crm/activities/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/activities" label="Back to Activities" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Log Activity</h1>
        <p className="text-sm text-muted-foreground">
          Record customer-facing work linked to a party for timeline visibility.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="activityTypeCode">Activity Type</Label>
            <select
              id="activityTypeCode"
              className={fieldClassName}
              value={values.activityTypeCode}
              onChange={(event) => setField("activityTypeCode", event.target.value)}
            >
              {catalogues.activityTypes.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priorityCode">Priority</Label>
            <select
              id="priorityCode"
              className={fieldClassName}
              value={values.priorityCode}
              onChange={(event) => setField("priorityCode", event.target.value)}
            >
              {catalogues.priorities.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={values.subject}
            onChange={(event) => setField("subject", event.target.value)}
            required
            maxLength={300}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            className={cn(fieldClassName, "min-h-24 py-2")}
            value={values.description}
            onChange={(event) => setField("description", event.target.value)}
            rows={4}
            maxLength={4000}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primaryPartyId">Party ID</Label>
            <Input
              id="primaryPartyId"
              value={values.primaryPartyId}
              onChange={(event) => setField("primaryPartyId", event.target.value)}
              required
              placeholder="UUID from Parties module"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={values.dueDate}
              onChange={(event) => setField("dueDate", event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownerUserId">Owner</Label>
          <select
            id="ownerUserId"
            className={fieldClassName}
            value={values.ownerUserId}
            onChange={(event) => setField("ownerUserId", event.target.value)}
          >
            {catalogues.owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.displayName}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Create Activity"}
          </Button>
        </div>
      </form>
    </main>
  );
}

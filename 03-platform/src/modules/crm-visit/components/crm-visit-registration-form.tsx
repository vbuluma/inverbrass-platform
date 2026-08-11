"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useControlledForm } from "@/lib/forms";
import { EMPTY_TEXT } from "@/lib/forms/form-field-values";
import { createCrmVisitAction } from "@/modules/crm-visit/actions/crm-visit-actions";
import { CRM_VISIT_TYPE_CODES } from "@/modules/crm-visit/constants";
import type { CrmVisitRegistrationCatalogues } from "@/modules/crm-visit/types";

type FormState = {
  visitTypeCode: string;
  subject: string;
  visitDate: string;
  location: string;
  objectives: string;
  ownerUserId: string;
  primaryPartyId: string;
  linkedAppointmentId: string;
};

type Props = {
  catalogues: CrmVisitRegistrationCatalogues;
  defaultOwnerUserId: string;
  defaultPartyId?: string;
  defaultAppointmentId?: string;
};

const fieldClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function CrmVisitRegistrationForm({
  catalogues,
  defaultOwnerUserId,
  defaultPartyId,
  defaultAppointmentId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { values, setField } = useControlledForm<FormState>({
    initial: {
      visitTypeCode: catalogues.visitTypes[0]?.code ?? CRM_VISIT_TYPE_CODES.SALES,
      subject: EMPTY_TEXT,
      visitDate: new Date().toISOString().slice(0, 16),
      location: EMPTY_TEXT,
      objectives: EMPTY_TEXT,
      ownerUserId: defaultOwnerUserId,
      primaryPartyId: defaultPartyId ?? EMPTY_TEXT,
      linkedAppointmentId: defaultAppointmentId ?? EMPTY_TEXT,
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCrmVisitAction({
        visitTypeCode: values.visitTypeCode,
        subject: values.subject,
        visitDate: new Date(values.visitDate).toISOString(),
        location: values.location || null,
        objectives: values.objectives || null,
        ownerUserId: values.ownerUserId,
        primaryPartyId: values.primaryPartyId,
        linkedAppointmentId: values.linkedAppointmentId || null,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/crm/visits/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/visits" label="Back to Visits" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Log Visit</h1>
        <p className="text-sm text-muted-foreground">
          Create a collaborative visit / call report linked to a customer party.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="visitTypeCode">Visit Type</Label>
          <select
            id="visitTypeCode"
            className={fieldClassName}
            value={values.visitTypeCode}
            onChange={(e) => setField("visitTypeCode", e.target.value)}
          >
            {catalogues.visitTypes.map((type) => (
              <option key={type.code} value={type.code}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            required
            value={values.subject}
            onChange={(e) => setField("subject", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="visitDate">Visit Date</Label>
          <Input
            id="visitDate"
            type="datetime-local"
            required
            value={values.visitDate}
            onChange={(e) => setField("visitDate", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={values.location}
            onChange={(e) => setField("location", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="objectives">Objectives</Label>
          <textarea
            id="objectives"
            className={`${fieldClassName} min-h-20 py-2`}
            value={values.objectives}
            onChange={(e) => setField("objectives", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerUserId">Owner</Label>
          <select
            id="ownerUserId"
            className={fieldClassName}
            value={values.ownerUserId}
            onChange={(e) => setField("ownerUserId", e.target.value)}
          >
            {catalogues.owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="primaryPartyId">Primary Party (UUID)</Label>
          <Input
            id="primaryPartyId"
            required
            value={values.primaryPartyId}
            onChange={(e) => setField("primaryPartyId", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkedAppointmentId">Linked Appointment (optional UUID)</Label>
          <Input
            id="linkedAppointmentId"
            value={values.linkedAppointmentId}
            onChange={(e) => setField("linkedAppointmentId", e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Create Visit"}
        </Button>
      </form>
    </main>
  );
}

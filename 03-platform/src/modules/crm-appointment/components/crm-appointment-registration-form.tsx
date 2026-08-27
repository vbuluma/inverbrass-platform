/**
 * Schedule appointment form.
 * BP-004 / IP-06
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
import { createCrmAppointmentAction } from "@/modules/crm-appointment/actions/crm-appointment-actions";
import { CRM_APPOINTMENT_TYPE_CODES } from "@/modules/crm-appointment/constants";
import type { CrmAppointmentRegistrationCatalogues } from "@/modules/crm-appointment/types";

type FormState = {
  appointmentTypeCode: string;
  subject: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  virtualMeetingUrl: string;
  ownerUserId: string;
  primaryPartyId: string;
};

type CrmAppointmentRegistrationFormProps = {
  catalogues: CrmAppointmentRegistrationCatalogues;
  defaultOwnerUserId: string;
  defaultPartyId?: string;
};

const fieldClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function defaultEndFromStart(startLocal: string, durationMinutes: number): string {
  if (!startLocal) return EMPTY_TEXT;
  const start = new Date(startLocal);
  if (Number.isNaN(start.getTime())) return EMPTY_TEXT;
  return new Date(start.getTime() + durationMinutes * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function CrmAppointmentRegistrationForm({
  catalogues,
  defaultOwnerUserId,
  defaultPartyId,
}: CrmAppointmentRegistrationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const defaultType =
    catalogues.appointmentTypes[0]?.code ?? CRM_APPOINTMENT_TYPE_CODES.MEETING;
  const defaultDuration =
    catalogues.appointmentTypes[0]?.defaultDurationMinutes ?? 60;

  const now = new Date();
  now.setMinutes(now.getMinutes() + 30 - (now.getMinutes() % 30));
  const defaultStart = now.toISOString().slice(0, 16);

  const { values, setField } = useControlledForm<FormState>({
    initial: {
      appointmentTypeCode: defaultType,
      subject: EMPTY_TEXT,
      description: EMPTY_TEXT,
      startDateTime: defaultStart,
      endDateTime: defaultEndFromStart(defaultStart, defaultDuration),
      location: EMPTY_TEXT,
      virtualMeetingUrl: EMPTY_TEXT,
      ownerUserId: defaultOwnerUserId,
      primaryPartyId: defaultPartyId ?? EMPTY_TEXT,
    },
  });

  function handleTypeChange(code: string) {
    setField("appointmentTypeCode", code);
    const type = catalogues.appointmentTypes.find((row) => row.code === code);
    if (type && values.startDateTime) {
      setField(
        "endDateTime",
        defaultEndFromStart(values.startDateTime, type.defaultDurationMinutes)
      );
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createCrmAppointmentAction({
        appointmentTypeCode: values.appointmentTypeCode,
        subject: values.subject,
        description: values.description || null,
        startDateTime: new Date(values.startDateTime).toISOString(),
        endDateTime: new Date(values.endDateTime).toISOString(),
        location: values.location || null,
        virtualMeetingUrl: values.virtualMeetingUrl || null,
        ownerUserId: values.ownerUserId,
        primaryPartyId: values.primaryPartyId,
      });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      router.push(`/crm/appointments/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/appointments" label="Back to Calendar" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Schedule Appointment</h1>
        <p className="text-sm text-muted-foreground">
          Time-box customer engagement with participants and location details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="appointmentTypeCode">Appointment Type</Label>
          <select
            id="appointmentTypeCode"
            className={fieldClassName}
            value={values.appointmentTypeCode}
            onChange={(event) => handleTypeChange(event.target.value)}
          >
            {catalogues.appointmentTypes.map((type) => (
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
            onChange={(event) => setField("subject", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            className={`${fieldClassName} min-h-20 py-2`}
            value={values.description}
            onChange={(event) => setField("description", event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startDateTime">Start</Label>
            <Input
              id="startDateTime"
              type="datetime-local"
              required
              value={values.startDateTime}
              onChange={(event) => setField("startDateTime", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDateTime">End</Label>
            <Input
              id="endDateTime"
              type="datetime-local"
              required
              value={values.endDateTime}
              onChange={(event) => setField("endDateTime", event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={values.location}
            onChange={(event) => setField("location", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="virtualMeetingUrl">Virtual Meeting URL</Label>
          <Input
            id="virtualMeetingUrl"
            type="url"
            value={values.virtualMeetingUrl}
            onChange={(event) => setField("virtualMeetingUrl", event.target.value)}
          />
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

        <div className="space-y-2">
          <Label htmlFor="primaryPartyId">Primary Party (UUID)</Label>
          <Input
            id="primaryPartyId"
            required
            placeholder="Party UUID until IP-04 picker"
            value={values.primaryPartyId}
            onChange={(event) => setField("primaryPartyId", event.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Scheduling…" : "Schedule Appointment"}
        </Button>
      </form>
    </main>
  );
}

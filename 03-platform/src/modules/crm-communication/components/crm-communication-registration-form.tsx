"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useControlledForm } from "@/lib/forms";
import { EMPTY_TEXT } from "@/lib/forms/form-field-values";
import { logCrmCommunicationAction } from "@/modules/crm-communication/actions/crm-communication-actions";
import {
  CRM_COMMUNICATION_CHANNEL_CODES,
  CRM_COMMUNICATION_DIRECTION_CODES,
} from "@/modules/crm-communication/constants";
import type { CrmCommunicationRegistrationCatalogues } from "@/modules/crm-communication/types";

type FormState = {
  channelTypeCode: string;
  directionCode: string;
  subject: string;
  summary: string;
  contactChannelValue: string;
  templateCode: string;
  ownerUserId: string;
  primaryPartyId: string;
  createFollowUpTask: boolean;
};

type Props = {
  catalogues: CrmCommunicationRegistrationCatalogues;
  defaultOwnerUserId: string;
  defaultPartyId?: string;
};

const fieldClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function CrmCommunicationRegistrationForm({
  catalogues,
  defaultOwnerUserId,
  defaultPartyId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { values, setField } = useControlledForm<FormState>({
    initial: {
      channelTypeCode:
        catalogues.channels[0]?.code ?? CRM_COMMUNICATION_CHANNEL_CODES.EMAIL,
      directionCode: CRM_COMMUNICATION_DIRECTION_CODES.OUTBOUND,
      subject: EMPTY_TEXT,
      summary: EMPTY_TEXT,
      contactChannelValue: EMPTY_TEXT,
      templateCode: EMPTY_TEXT,
      ownerUserId: defaultOwnerUserId,
      primaryPartyId: defaultPartyId ?? EMPTY_TEXT,
      createFollowUpTask: false,
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await logCrmCommunicationAction({
        channelTypeCode: values.channelTypeCode,
        directionCode: values.directionCode,
        subject: values.subject || null,
        summary: values.summary,
        contactChannelValue: values.contactChannelValue || null,
        templateCode: values.templateCode || null,
        ownerUserId: values.ownerUserId,
        primaryPartyId: values.primaryPartyId,
        createFollowUpTask: values.createFollowUpTask,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/crm/communications/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/communications" label="Back to Communications" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Log Communication</h1>
        <p className="text-sm text-muted-foreground">
          Record an inbound or outbound interaction. Outbound channels respect BP-002 consent.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="channelTypeCode">Channel</Label>
            <select
              id="channelTypeCode"
              className={fieldClassName}
              value={values.channelTypeCode}
              onChange={(e) => setField("channelTypeCode", e.target.value)}
            >
              {catalogues.channels.map((channel) => (
                <option key={channel.code} value={channel.code}>
                  {channel.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="directionCode">Direction</Label>
            <select
              id="directionCode"
              className={fieldClassName}
              value={values.directionCode}
              onChange={(e) => setField("directionCode", e.target.value)}
            >
              <option value={CRM_COMMUNICATION_DIRECTION_CODES.OUTBOUND}>
                Outbound
              </option>
              <option value={CRM_COMMUNICATION_DIRECTION_CODES.INBOUND}>
                Inbound
              </option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={values.subject}
            onChange={(e) => setField("subject", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="summary">Summary</Label>
          <textarea
            id="summary"
            required
            className={`${fieldClassName} min-h-24 py-2`}
            value={values.summary}
            onChange={(e) => setField("summary", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactChannelValue">Contact channel value</Label>
          <Input
            id="contactChannelValue"
            placeholder="email@example.com / +254… / WhatsApp number"
            value={values.contactChannelValue}
            onChange={(e) => setField("contactChannelValue", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="templateCode">Template code (optional)</Label>
          <Input
            id="templateCode"
            value={values.templateCode}
            onChange={(e) => setField("templateCode", e.target.value)}
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.createFollowUpTask}
            onChange={(e) => setField("createFollowUpTask", e.target.checked)}
          />
          Create IP-05 follow-up task
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Log Communication"}
        </Button>
      </form>
    </main>
  );
}

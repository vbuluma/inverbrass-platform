"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useControlledForm } from "@/lib/forms";
import { EMPTY_TEXT } from "@/lib/forms/form-field-values";
import { createCrmCaseAction } from "@/modules/crm-case/actions/crm-case-actions";
import {
  CRM_CASE_PRIORITY_CODES,
  CRM_CASE_SEVERITY_CODES,
  CRM_CASE_TYPE_CODES,
} from "@/modules/crm-case/constants";
import type { CrmCaseRegistrationCatalogues } from "@/modules/crm-case/types";

type FormState = {
  caseTypeCode: string;
  categoryCode: string;
  subcategoryCode: string;
  subject: string;
  description: string;
  priorityCode: string;
  severityCode: string;
  channelCode: string;
  ownerUserId: string;
  queueCode: string;
  primaryPartyId: string;
  linkedCommunicationId: string;
  createFollowUpTask: boolean;
};

type Props = {
  catalogues: CrmCaseRegistrationCatalogues;
  defaultOwnerUserId: string;
  defaultPartyId?: string;
};

const fieldClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function CrmCaseRegistrationForm({
  catalogues,
  defaultOwnerUserId,
  defaultPartyId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { values, setField } = useControlledForm<FormState>({
    initial: {
      caseTypeCode: catalogues.caseTypes[0]?.code ?? CRM_CASE_TYPE_CODES.ENQUIRY,
      categoryCode: EMPTY_TEXT,
      subcategoryCode: EMPTY_TEXT,
      subject: EMPTY_TEXT,
      description: EMPTY_TEXT,
      priorityCode: catalogues.priorities[0]?.code ?? CRM_CASE_PRIORITY_CODES.NORMAL,
      severityCode: catalogues.severities[0]?.code ?? CRM_CASE_SEVERITY_CODES.MEDIUM,
      channelCode: EMPTY_TEXT,
      ownerUserId: defaultOwnerUserId,
      queueCode: EMPTY_TEXT,
      primaryPartyId: defaultPartyId ?? EMPTY_TEXT,
      linkedCommunicationId: EMPTY_TEXT,
      createFollowUpTask: false,
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCrmCaseAction({
        caseTypeCode: values.caseTypeCode,
        categoryCode: values.categoryCode || null,
        subcategoryCode: values.subcategoryCode || null,
        subject: values.subject,
        description: values.description,
        priorityCode: values.priorityCode,
        severityCode: values.severityCode,
        channelCode: values.channelCode || null,
        ownerUserId: values.ownerUserId || null,
        queueCode: values.queueCode || null,
        primaryPartyId: values.primaryPartyId,
        linkedCommunicationId: values.linkedCommunicationId || null,
        createFollowUpTask: values.createFollowUpTask,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/crm/cases/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/cases" label="Back to Cases" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create Case</h1>
        <p className="text-sm text-muted-foreground">
          Register an enquiry, complaint, feedback, or service request.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="caseTypeCode">Type</Label>
            <select
              id="caseTypeCode"
              className={fieldClassName}
              value={values.caseTypeCode}
              onChange={(e) => setField("caseTypeCode", e.target.value)}
            >
              {catalogues.caseTypes.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryCode">Category (optional)</Label>
            <Input
              id="categoryCode"
              value={values.categoryCode}
              onChange={(e) => setField("categoryCode", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subcategoryCode">Subcategory (optional)</Label>
          <Input
            id="subcategoryCode"
            value={values.subcategoryCode}
            onChange={(e) => setField("subcategoryCode", e.target.value)}
          />
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
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            required
            className={`${fieldClassName} min-h-24 py-2`}
            value={values.description}
            onChange={(e) => setField("description", e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="priorityCode">Priority</Label>
            <select
              id="priorityCode"
              className={fieldClassName}
              value={values.priorityCode}
              onChange={(e) => setField("priorityCode", e.target.value)}
            >
              {catalogues.priorities.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="severityCode">Severity</Label>
            <select
              id="severityCode"
              className={fieldClassName}
              value={values.severityCode}
              onChange={(e) => setField("severityCode", e.target.value)}
            >
              {catalogues.severities.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="channelCode">Channel (optional)</Label>
            <Input
              id="channelCode"
              value={values.channelCode}
              onChange={(e) => setField("channelCode", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="queueCode">Queue (optional)</Label>
            <Input
              id="queueCode"
              value={values.queueCode}
              onChange={(e) => setField("queueCode", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerUserId">Owner</Label>
          <select
            id="ownerUserId"
            className={fieldClassName}
            value={values.ownerUserId}
            onChange={(e) => setField("ownerUserId", e.target.value)}
          >
            <option value="">Unassigned (queue)</option>
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
          <Label htmlFor="linkedCommunicationId">Linked communication (optional UUID)</Label>
          <Input
            id="linkedCommunicationId"
            value={values.linkedCommunicationId}
            onChange={(e) => setField("linkedCommunicationId", e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.createFollowUpTask}
            onChange={(e) => setField("createFollowUpTask", e.target.checked)}
          />
          Create IP-05 follow-up task (CASE_ACTION)
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Create Case"}
        </Button>
      </form>
    </main>
  );
}

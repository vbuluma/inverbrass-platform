/**
 * Purpose:
 * Party Workspace Communication & Consent Preferences tab.
 *
 * Implementation Package:
 * BP-002 / IP-012 – Party Communication & Consent Preferences
 */

"use client";

import { useMemo, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CommunicationPreferenceView,
  PreferredContactMethod,
  PreferredContactTime,
} from "@/core/communication-preference";
import {
  resetPartyCommunicationPreferencesAction,
  savePartyCommunicationPreferencesAction,
} from "@/modules/party/actions/party-communication-preference-actions";
import type { PartyCommunicationPreferencesPanelView } from "@/modules/party/types";

type PartyCommunicationPreferencesPanelProps = {
  partyId: string;
  initialData: PartyCommunicationPreferencesPanelView;
};

type FormState = {
  preferredLanguageCode: string;
  preferredTimezoneCode: string;
  preferredContactMethod: string;
  preferredContactTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  marketingConsent: boolean;
  transactionalConsent: boolean;
  promotionalConsent: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsAppEnabled: boolean;
  phoneEnabled: boolean;
  pushNotificationEnabled: boolean;
  postalMailEnabled: boolean;
  consentSource: string;
  notes: string;
  version: number;
};

function toFormState(preference: CommunicationPreferenceView): FormState {
  return {
    preferredLanguageCode: preference.preferredLanguageCode ?? "",
    preferredTimezoneCode: preference.preferredTimezoneCode ?? "",
    preferredContactMethod: preference.preferredContactMethod ?? "",
    preferredContactTime: preference.preferredContactTime ?? "",
    quietHoursStart: preference.quietHoursStart ?? "",
    quietHoursEnd: preference.quietHoursEnd ?? "",
    marketingConsent: preference.marketingConsent,
    transactionalConsent: preference.transactionalConsent,
    promotionalConsent: preference.promotionalConsent,
    emailEnabled: preference.emailEnabled,
    smsEnabled: preference.smsEnabled,
    whatsAppEnabled: preference.whatsAppEnabled,
    phoneEnabled: preference.phoneEnabled,
    pushNotificationEnabled: preference.pushNotificationEnabled,
    postalMailEnabled: preference.postalMailEnabled,
    consentSource: preference.consentSource ?? "PARTY_WORKSPACE",
    notes: preference.notes ?? "",
    version: preference.version,
  };
}

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PartyCommunicationPreferencesPanel({
  partyId,
  initialData,
}: PartyCommunicationPreferencesPanelProps) {
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [form, setForm] = useState(() => toFormState(initialData.preference));
  const [savedForm, setSavedForm] = useState(() =>
    toFormState(initialData.preference)
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    const nextForm = toFormState(initialData.preference);
    setForm(nextForm);
    setSavedForm(nextForm);
  }

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm]
  );

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyResult(
    result:
      | { success: true; data: PartyCommunicationPreferencesPanelView }
      | { success: false; error: { message: string } },
    successMessage: string
  ) {
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setError(null);
    setMessage(successMessage);
    setPanel(result.data);
    const nextForm = toFormState(result.data.preference);
    setForm(nextForm);
    setSavedForm(nextForm);
  }

  function onSave() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await savePartyCommunicationPreferencesAction(partyId, {
        preferredLanguageCode: form.preferredLanguageCode || null,
        preferredTimezoneCode: form.preferredTimezoneCode || null,
        preferredContactMethod:
          (form.preferredContactMethod as PreferredContactMethod) || null,
        preferredContactTime:
          (form.preferredContactTime as PreferredContactTime) || null,
        quietHoursStart: form.quietHoursStart || null,
        quietHoursEnd: form.quietHoursEnd || null,
        emailEnabled: form.emailEnabled,
        smsEnabled: form.smsEnabled,
        whatsAppEnabled: form.whatsAppEnabled,
        phoneEnabled: form.phoneEnabled,
        pushNotificationEnabled: form.pushNotificationEnabled,
        postalMailEnabled: form.postalMailEnabled,
        notes: form.notes || null,
        version: form.version,
      });
      applyResult(result, "Communication & consent preferences saved.");
    });
  }

  function onReset() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await resetPartyCommunicationPreferencesAction(partyId);
      applyResult(result, "Changes discarded.");
    });
  }

  const { preference, catalogues } = panel;

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Communication Channels</CardTitle>
          <CardDescription>
            Enable or disable how this party may be contacted. Campaign and
            notification engines must respect these settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ChannelToggle
            id="emailEnabled"
            label="Email"
            checked={form.emailEnabled}
            disabled={isPending}
            onCheckedChange={(checked) => updateForm("emailEnabled", checked)}
          />
          <ChannelToggle
            id="smsEnabled"
            label="SMS"
            checked={form.smsEnabled}
            disabled={isPending}
            onCheckedChange={(checked) => updateForm("smsEnabled", checked)}
          />
          <ChannelToggle
            id="whatsAppEnabled"
            label="WhatsApp"
            checked={form.whatsAppEnabled}
            disabled={isPending}
            onCheckedChange={(checked) =>
              updateForm("whatsAppEnabled", checked)
            }
          />
          <ChannelToggle
            id="phoneEnabled"
            label="Phone"
            checked={form.phoneEnabled}
            disabled={isPending}
            onCheckedChange={(checked) => updateForm("phoneEnabled", checked)}
          />
          <ChannelToggle
            id="pushNotificationEnabled"
            label="Push"
            checked={form.pushNotificationEnabled}
            disabled={isPending}
            onCheckedChange={(checked) =>
              updateForm("pushNotificationEnabled", checked)
            }
          />
          <ChannelToggle
            id="postalMailEnabled"
            label="Postal"
            checked={form.postalMailEnabled}
            disabled={isPending}
            onCheckedChange={(checked) =>
              updateForm("postalMailEnabled", checked)
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferred Contact</CardTitle>
          <CardDescription>
            Language, time zone, preferred method, contact window, and quiet
            hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="preferredLanguageCode">Preferred Language</Label>
            <select
              id="preferredLanguageCode"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              value={form.preferredLanguageCode}
              disabled={isPending}
              onChange={(event) =>
                updateForm("preferredLanguageCode", event.target.value)
              }
            >
              <option value="">Not set</option>
              {catalogues.languages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredTimezoneCode">Preferred Time Zone</Label>
            <select
              id="preferredTimezoneCode"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              value={form.preferredTimezoneCode}
              disabled={isPending}
              onChange={(event) =>
                updateForm("preferredTimezoneCode", event.target.value)
              }
            >
              <option value="">Not set</option>
              {catalogues.timezones.map((timezone) => (
                <option key={timezone.code} value={timezone.code}>
                  {timezone.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredContactMethod">Preferred Method</Label>
            <select
              id="preferredContactMethod"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              value={form.preferredContactMethod}
              disabled={isPending}
              onChange={(event) =>
                updateForm("preferredContactMethod", event.target.value)
              }
            >
              <option value="">Not set</option>
              {catalogues.contactMethods.map((method) => (
                <option key={method.code} value={method.code}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredContactTime">Preferred Contact Time</Label>
            <select
              id="preferredContactTime"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              value={form.preferredContactTime}
              disabled={isPending}
              onChange={(event) =>
                updateForm("preferredContactTime", event.target.value)
              }
            >
              <option value="">Not set</option>
              {catalogues.contactTimes.map((time) => (
                <option key={time.code} value={time.code}>
                  {time.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quietHoursStart">Quiet Hours Start</Label>
            <Input
              id="quietHoursStart"
              type="time"
              value={form.quietHoursStart}
              disabled={isPending}
              onChange={(event) =>
                updateForm("quietHoursStart", event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quietHoursEnd">Quiet Hours End</Label>
            <Input
              id="quietHoursEnd"
              type="time"
              value={form.quietHoursEnd}
              disabled={isPending}
              onChange={(event) =>
                updateForm("quietHoursEnd", event.target.value)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consent</CardTitle>
          <CardDescription>
            Consent is captured through channel events (Website, Mobile App,
            Branch, etc.). This workspace displays consent — it does not
            determine consent source.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <ReadOnlyConsentBadge
              label="Marketing"
              granted={preference.marketingConsent}
            />
            <ReadOnlyConsentBadge
              label="Promotions"
              granted={preference.promotionalConsent}
            />
            <ReadOnlyConsentBadge
              label="Transactional"
              granted={preference.transactionalConsent}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField
              label="Consent Date"
              value={formatDateTime(preference.consentDate)}
            />
            <ReadOnlyField
              label="Consent Source"
              value={
                catalogues.consentSources.find(
                  (source) => source.code === preference.consentSource
                )?.label ??
                preference.consentSource ??
                "—"
              }
            />
          </div>

          {panel.consentEvents.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Consent Events</p>
              <ul className="space-y-2">
                {panel.consentEvents.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">
                      {event.consentTypeCode} · {event.statusCode}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.consentSourceLabel} ·{" "}
                      {formatDateTime(event.consentDate)}
                    </p>
                    {event.evidence ? (
                      <p className="text-xs text-muted-foreground">
                        Evidence: {event.evidence}
                      </p>
                    ) : null}
                    {event.referenceId ? (
                      <p className="text-xs text-muted-foreground">
                        Reference: {event.referenceId}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No consent events recorded yet. Consent will appear when captured
              through a configured channel.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
            value={form.notes}
            disabled={isPending}
            onChange={(event) => updateForm("notes", event.target.value)}
            placeholder="Optional notes about communication preferences or consent."
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={isPending || !isDirty} onClick={onSave}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending || !isDirty}
          onClick={onReset}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

function ChannelToggle({
  id,
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function ReadOnlyConsentBadge({
  label,
  granted,
}: {
  label: string;
  granted: boolean;
}) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{granted ? "Granted" : "Not granted"}</p>
    </div>
  );
}

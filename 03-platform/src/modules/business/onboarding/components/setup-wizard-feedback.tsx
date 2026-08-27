/**
 * ENG-003j — Shared feedback components for Business Setup Wizard.
 */

"use client";

import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useEffect, useRef } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type SetupSuccessAlertProps = {
  message: string;
  className?: string;
};

export function SetupSuccessAlert({ message, className }: SetupSuccessAlertProps) {
  return (
    <Alert variant="success" className={className}>
      <CheckCircle2Icon aria-hidden />
      <AlertDescription>
        <p className="font-medium">{message}</p>
      </AlertDescription>
    </Alert>
  );
}

type SetupNavigatingAlertProps = {
  message: string;
  className?: string;
};

export function SetupNavigatingAlert({
  message,
  className,
}: SetupNavigatingAlertProps) {
  return (
    <Alert className={className} aria-live="polite" aria-busy="true">
      <Loader2Icon className="animate-spin" aria-hidden />
      <AlertDescription>
        <p className="font-medium">{message}</p>
      </AlertDescription>
    </Alert>
  );
}

type SetupSectionErrorProps = {
  title: string;
  messages: string[];
  className?: string;
};

export function SetupSectionError({
  title,
  messages,
  className,
}: SetupSectionErrorProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircleIcon aria-hidden />
      <AlertDescription>
        <p className="font-medium">
          {title}
          {messages.length > 1 ? ` (${messages.length} issues)` : null}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

type SetupFieldErrorProps = {
  message: string | null;
  className?: string;
};

export function SetupFieldError({ message, className }: SetupFieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p className={cn("text-sm text-destructive", className)} role="alert">
      {message}
    </p>
  );
}

type SetupDuplicateErrorProps = {
  entityLabel: string;
  fieldLabel: string;
  value: string;
  className?: string;
};

export function SetupDuplicateError({
  entityLabel,
  fieldLabel,
  value,
  className,
}: SetupDuplicateErrorProps) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircleIcon aria-hidden />
      <AlertDescription>
        <p className="font-medium">{entityLabel} with {fieldLabel}</p>
        <p className="mt-1 font-mono text-sm">{value}</p>
        <p className="mt-1">already exists.</p>
      </AlertDescription>
    </Alert>
  );
}

export function useScrollToFirstInvalidField(
  fieldName: string | undefined,
  enabled: boolean
) {
  const previousField = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled || !fieldName || fieldName === previousField.current) {
      return;
    }

    previousField.current = fieldName;
    const selector = `[name="${fieldName}"], [data-field="${fieldName}"]`;
    const element = document.querySelector<HTMLElement>(selector);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus?.();
  }, [enabled, fieldName]);
}

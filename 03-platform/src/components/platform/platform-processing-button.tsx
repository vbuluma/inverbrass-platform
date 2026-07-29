/**
 * UX-001c — Standard processing feedback for server actions.
 */

"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type PlatformProcessingButtonProps = React.ComponentProps<typeof Button> & {
  isProcessing: boolean;
  processingLabel: string;
  idleLabel: string;
};

export function PlatformProcessingButton({
  isProcessing,
  processingLabel,
  idleLabel,
  disabled,
  children,
  className,
  ...props
}: PlatformProcessingButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || isProcessing}
      className={cn("gap-2", className)}
      aria-busy={isProcessing}
    >
      {isProcessing ? (
        <>
          <Spinner
            className="size-4 shrink-0 text-current opacity-90"
            label={processingLabel}
          />
          <span>{processingLabel}</span>
        </>
      ) : (
        (children ?? idleLabel)
      )}
    </Button>
  );
}

type PlatformProcessingIndicatorProps = {
  isProcessing: boolean;
  label: string;
  className?: string;
};

export function PlatformProcessingIndicator({
  isProcessing,
  label,
  className,
}: PlatformProcessingIndicatorProps) {
  if (!isProcessing) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm font-medium text-foreground",
        className
      )}
    >
      <Spinner className="size-4 shrink-0 text-emerald-700" label={label} />
      <span>{label}</span>
    </div>
  );
}

/**
 * UX-001c — Standard processing label patterns.
 */
export const PROCESSING_LABELS = {
  creatingParty: "Creating Party…",
  creatingIndividual: "Creating Individual…",
  creatingOrganization: "Creating Organization…",
  creatingGroup: "Creating Group…",
  creatingContact: "Creating Contact…",
  creatingAddress: "Creating Address…",
  creatingRelationship: "Creating Relationship…",
  uploadingDocument: "Uploading Document…",
  savingAddress: "Saving Address…",
  savingContact: "Saving Contact…",
  savingOverview: "Saving Overview…",
  assigningRole: "Assigning Role…",
  assigningRelationship: "Assigning Relationship…",
  verifyingDocument: "Verifying Document…",
  deactivating: "Deactivating…",
  removing: "Removing…",
  saving: "Saving…",
} as const;

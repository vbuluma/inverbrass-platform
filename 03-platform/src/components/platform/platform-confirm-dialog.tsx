/**
 * UX-001h — Standard confirmation dialog for destructive actions.
 */

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PlatformProcessingButton,
  PROCESSING_LABELS,
} from "@/components/platform/platform-processing-button";

type PlatformConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  isProcessing?: boolean;
  onConfirm: () => void;
};

export function PlatformConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "destructive",
  isProcessing = false,
  onConfirm,
}: PlatformConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isProcessing}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <PlatformProcessingButton
            type="button"
            variant={variant}
            isProcessing={isProcessing}
            processingLabel={PROCESSING_LABELS.deactivating}
            idleLabel={confirmLabel}
            onClick={onConfirm}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type UseConfirmActionOptions = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
};

export function useConfirmAction() {
  const [state, setState] = useState<UseConfirmActionOptions | null>(null);
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  function requestConfirm(options: UseConfirmActionOptions) {
    setState(options);
    setOpen(true);
  }

  async function handleConfirm() {
    if (!state) {
      return;
    }
    setIsProcessing(true);
    try {
      await state.onConfirm();
      setOpen(false);
      setState(null);
    } finally {
      setIsProcessing(false);
    }
  }

  function confirmDialogProps(): PlatformConfirmDialogProps | null {
    if (!state) {
      return null;
    }
    return {
      open,
      onOpenChange: (next) => {
        if (!isProcessing) {
          setOpen(next);
          if (!next) {
            setState(null);
          }
        }
      },
      title: state.title,
      description: state.description,
      confirmLabel: state.confirmLabel,
      isProcessing,
      onConfirm: handleConfirm,
    };
  }

  return { requestConfirm, confirmDialogProps };
}

export function PlatformConfirmDialogHost({
  props,
}: {
  props: PlatformConfirmDialogProps | null;
}) {
  if (!props) {
    return null;
  }
  return <PlatformConfirmDialog {...props} />;
}

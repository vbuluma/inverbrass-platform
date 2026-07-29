/**
 * UX-001j — Unsaved changes protection for edited forms.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type UseUnsavedChangesGuardOptions = {
  isDirty: boolean;
  onSave?: () => void | Promise<void>;
  onDiscard?: () => void;
};

export function useUnsavedChangesGuard({
  isDirty,
  onSave,
  onDiscard,
}: UseUnsavedChangesGuardOptions) {
  const [showDialog, setShowDialog] = useState(false);
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (isDirtyRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const requestLeave = useCallback(
    (proceed: () => void) => {
      if (!isDirtyRef.current) {
        proceed();
        return;
      }
      pendingNavigationRef.current = proceed;
      setShowDialog(true);
    },
    []
  );

  async function handleSave() {
    if (onSave) {
      await onSave();
    }
    setShowDialog(false);
    pendingNavigationRef.current?.();
    pendingNavigationRef.current = null;
  }

  function handleDiscard() {
    onDiscard?.();
    setShowDialog(false);
    pendingNavigationRef.current?.();
    pendingNavigationRef.current = null;
  }

  function handleCancel() {
    setShowDialog(false);
    pendingNavigationRef.current = null;
  }

  const unsavedChangesDialog = (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>You have unsaved changes.</DialogTitle>
          <DialogDescription>
            Save your changes before leaving, or discard them to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={handleDiscard}>
            Discard
          </Button>
          {onSave ? (
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { requestLeave, unsavedChangesDialog, isDirty };
}

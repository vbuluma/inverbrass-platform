/**
 * UX-001c — Ensures processing feedback is visible even on fast server responses.
 */

"use client";

import { useCallback, useState } from "react";

const DEFAULT_MIN_MS = 450;

export function useAsyncAction(minDisplayMs = DEFAULT_MIN_MS) {
  const [isProcessing, setIsProcessing] = useState(false);

  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      setIsProcessing(true);
      const startedAt = Date.now();
      try {
        return await action();
      } finally {
        const elapsed = Date.now() - startedAt;
        if (elapsed < minDisplayMs) {
          await new Promise((resolve) => {
            setTimeout(resolve, minDisplayMs - elapsed);
          });
        }
        setIsProcessing(false);
      }
    },
    [minDisplayMs]
  );

  return { isProcessing, run };
}

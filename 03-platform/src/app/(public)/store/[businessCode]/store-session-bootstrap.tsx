"use client";

/**
 * Purpose:
 * Client bootstrap for Customer Web guest session cookie (Server Action).
 */

import { useEffect, useState, useTransition } from "react";

import { bootstrapCustomerWebSessionAction } from "@/core/channel-experience/customer/actions";

type Props = {
  businessCode: string;
};

export function StoreSessionBootstrap({ businessCode }: Props) {
  const [status, setStatus] = useState<"pending" | "ready" | "error">("pending");
  const [message, setMessage] = useState<string>("Establishing secure session…");
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await bootstrapCustomerWebSessionAction(businessCode);
      if (!result.ok) {
        setStatus("error");
        setMessage(result.error);
        return;
      }
      setStatus("ready");
      setMessage(`Session ready (${result.sessionId.slice(0, 8)}…)`);
    });
  }, [businessCode]);

  return (
    <p
      className={
        status === "error"
          ? "text-sm text-red-700"
          : "text-sm text-neutral-500"
      }
      aria-live="polite"
    >
      {message}
    </p>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { checkoutAction } from "@/core/channel-experience/customer/commerce-actions";

type Props = {
  businessCode: string;
};

export function CheckoutButton({ businessCode }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function checkout() {
    startTransition(async () => {
      setMessage(null);
      const clientCheckoutKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}`;
      const result = await checkoutAction(businessCode, { clientCheckoutKey });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.push(
        `/store/${businessCode}/purchase/${encodeURIComponent(result.data.orderReference)}`
      );
    });
  }

  return (
    <div className="mt-8 space-y-3">
      <button
        type="button"
        disabled={isPending}
        onClick={checkout}
        className="rounded-md bg-neutral-900 px-5 py-3 text-sm text-white disabled:opacity-60"
      >
        {isPending ? "Processing…" : "Checkout"}
      </button>
      {message ? <p className="text-sm text-red-700">{message}</p> : null}
    </div>
  );
}

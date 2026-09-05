"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import {
  getOfferingAvailabilityAction,
  updateCartAction,
} from "@/core/channel-experience/customer/commerce-actions";

type Props = {
  businessCode: string;
  offeringCode: string;
  productId: string;
  offeringName?: string;
};

export function ProductPurchasePanel({
  businessCode,
  offeringCode,
  productId,
}: Props) {
  const [quantity, setQuantity] = useState(1);
  const [availability, setAvailability] = useState<string>("Checking availability…");
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getOfferingAvailabilityAction(businessCode, offeringCode);
      if (!result.ok) {
        setAvailability("Unavailable");
        return;
      }
      setAvailability(result.data.availabilityLabel.replaceAll("_", " "));
    });
  }, [businessCode, offeringCode]);

  function addToCart() {
    startTransition(async () => {
      setMessage(null);
      const result = await updateCartAction(businessCode, {
        offeringId: productId,
        quantity,
      });
      setMessage(result.ok ? "Added to cart." : result.message);
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-neutral-600">Availability: {availability}</p>
      <div className="flex items-center gap-3">
        <label className="text-sm" htmlFor="qty">
          Qty
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value) || 1)}
          className="w-20 rounded border px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={addToCart}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          Add to cart
        </button>
      </div>
      {message ? <p className="text-sm text-neutral-600">{message}</p> : null}
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href={`/store/${businessCode}/cart`} className="underline">
          Go to cart
        </Link>
        <Link
          href={`/store/${businessCode}/quote/request/${offeringCode}`}
          className="underline"
        >
          Request quotation
        </Link>
      </div>
    </div>
  );
}

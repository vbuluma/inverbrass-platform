/**
 * Purpose:
 * SL-CUS-001 — Customer cart page (session state).
 */

import Link from "next/link";

import { resolveCustomerWebStoreContext } from "@/core/channel-experience/customer/context";
import {
  isValidBusinessCodeFormat,
  normalizeBusinessCode,
} from "@/core/channel-experience/customer/tenant-resolution";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { CheckoutButton } from "./checkout-button";

type Props = {
  params: Promise<{ businessCode: string }>;
};

export default async function CartPage({ params }: Props) {
  const { businessCode: rawCode } = await params;
  const businessCode = normalizeBusinessCode(rawCode);

  if (!isValidBusinessCodeFormat(businessCode)) {
    return <main className="p-8">Store not found</main>;
  }

  const store = await resolveCustomerWebStoreContext(businessCode);
  const lines = store.session.cart?.lines ?? [];
  const products = createProductRepository();

  const enriched = await Promise.all(
    lines.map(async (line) => {
      const product = await products.findById(
        store.customerTenant.businessId,
        line.offeringId
      );
      return {
        ...line,
        name: product?.productName ?? "Item",
        code: product?.productCode ?? line.offeringId,
      };
    })
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/store/${businessCode}`} className="text-sm underline">
        Continue shopping
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Your cart</h1>
      <ul className="mt-6 divide-y divide-neutral-200 border-t">
        {enriched.map((line) => (
          <li key={line.offeringId} className="flex justify-between py-4 text-sm">
            <span>
              {line.name} × {line.quantity}
            </span>
            <span className="text-neutral-500">{line.code}</span>
          </li>
        ))}
        {enriched.length === 0 ? (
          <li className="py-8 text-neutral-500">Your cart is empty.</li>
        ) : null}
      </ul>
      {enriched.length > 0 ? <CheckoutButton businessCode={businessCode} /> : null}
    </main>
  );
}

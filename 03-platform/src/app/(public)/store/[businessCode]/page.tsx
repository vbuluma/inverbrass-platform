/**
 * Purpose:
 * SL-CUS-001 — Customer Web storefront catalogue page.
 */

import Link from "next/link";

import { listStoreCatalogueAction } from "@/core/channel-experience/customer/commerce-actions";
import { toCustomerSafeBusinessSummary } from "@/core/channel-experience/customer/dto";
import { ChannelExperienceError } from "@/core/channel-experience/errors";
import {
  isValidBusinessCodeFormat,
  normalizeBusinessCode,
  resolveCustomerTenantByBusinessCode,
} from "@/core/channel-experience/customer/tenant-resolution";
import { StoreSessionBootstrap } from "./store-session-bootstrap";

type StorePageProps = {
  params: Promise<{ businessCode: string }>;
};

export default async function CustomerStorePage({ params }: StorePageProps) {
  const { businessCode: rawCode } = await params;
  const businessCode = normalizeBusinessCode(rawCode);

  if (!isValidBusinessCodeFormat(businessCode)) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Store not found</h1>
      </main>
    );
  }

  let tenant;
  try {
    tenant = await resolveCustomerTenantByBusinessCode(businessCode);
  } catch (error) {
    const message =
      error instanceof ChannelExperienceError ? error.message : "Store not found";
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Store not found</h1>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
      </main>
    );
  }

  const store = toCustomerSafeBusinessSummary(tenant);
  const catalogue = await listStoreCatalogueAction(businessCode);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <header className="mb-8 space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Store</p>
        <h1 className="text-3xl font-semibold tracking-tight">{store.businessName}</h1>
        <StoreSessionBootstrap businessCode={store.businessCode} />
      </header>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href={`/store/${store.businessCode}/cart`}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          View cart
        </Link>
        <Link
          href={`/store/${store.businessCode}/orders`}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-800"
        >
          My Orders
        </Link>
      </div>

      {catalogue.ok ? (
        <ul className="divide-y divide-neutral-200 border-t border-neutral-200">
          {catalogue.data.map((item) => (
            <li key={item.offeringCode} className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-neutral-500">{item.offeringCode}</p>
              </div>
              <Link
                href={`/store/${store.businessCode}/products/${item.offeringCode}`}
                className="text-sm text-neutral-700 underline"
              >
                View
              </Link>
            </li>
          ))}
          {catalogue.data.length === 0 ? (
            <li className="py-8 text-sm text-neutral-500">
              No products are published for this store yet.
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="text-sm text-red-700">{catalogue.message}</p>
      )}
    </main>
  );
}

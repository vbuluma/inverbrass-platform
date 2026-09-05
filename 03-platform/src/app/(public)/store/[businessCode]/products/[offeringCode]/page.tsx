/**
 * Purpose:
 * SL-CUS-001 — Product detail page.
 */

import Link from "next/link";

import { createProductRepository } from "@/modules/product/repositories/product-repository";
import {
  isValidBusinessCodeFormat,
  normalizeBusinessCode,
  resolveCustomerTenantByBusinessCode,
} from "@/core/channel-experience/customer/tenant-resolution";
import { ProductPurchasePanel } from "./product-purchase-panel";

type Props = {
  params: Promise<{ businessCode: string; offeringCode: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { businessCode: rawCode, offeringCode: rawOffering } = await params;
  const businessCode = normalizeBusinessCode(rawCode);
  const offeringCode = rawOffering.trim().toUpperCase();

  if (!isValidBusinessCodeFormat(businessCode)) {
    return <main className="p-8">Store not found</main>;
  }

  const tenant = await resolveCustomerTenantByBusinessCode(businessCode);
  const product = await createProductRepository().findByProductCode(
    tenant.businessId,
    offeringCode
  );

  if (!product) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link href={`/store/${businessCode}`} className="text-sm underline">
          Back to store
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Product not found</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/store/${businessCode}`} className="text-sm underline">
        Back to store
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">{product.productName}</h1>
      <p className="text-sm text-neutral-500">{product.productCode}</p>
      <ProductPurchasePanel
        businessCode={businessCode}
        offeringCode={product.productCode}
        productId={product.id}
        offeringName={product.productName}
      />
    </main>
  );
}

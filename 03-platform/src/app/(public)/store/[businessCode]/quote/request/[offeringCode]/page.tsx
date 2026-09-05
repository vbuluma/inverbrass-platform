/**
 * Purpose:
 * SL-CUS-003 — Quotation request page for a selected offering.
 */

import Link from "next/link";

import { createProductRepository } from "@/modules/product/repositories/product-repository";
import {
  isValidBusinessCodeFormat,
  normalizeBusinessCode,
  resolveCustomerTenantByBusinessCode,
} from "@/core/channel-experience/customer/tenant-resolution";
import { QuotationRequestForm } from "./quotation-request-form";

type Props = {
  params: Promise<{ businessCode: string; offeringCode: string }>;
};

export default async function QuotationRequestPage({ params }: Props) {
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
      <Link
        href={`/store/${businessCode}/products/${product.productCode}`}
        className="text-sm underline"
      >
        Back to product
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Request a quotation</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Submit your request. The business will prepare your quotation using the
        platform quotation process.
      </p>
      <QuotationRequestForm
        businessCode={businessCode}
        offeringId={product.id}
        offeringName={product.productName}
        offeringCode={product.productCode}
      />
    </main>
  );
}

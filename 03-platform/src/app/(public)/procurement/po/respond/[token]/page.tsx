import { getPoSupplierPortalAction } from "@/modules/procurement/actions/purchase-order-actions";
import { PoSupplierPortal } from "@/modules/procurement/components/po-supplier-portal";

type PoRespondPageProps = {
  params: Promise<{ token: string }>;
};

export default async function PoRespondPage({ params }: PoRespondPageProps) {
  const { token } = await params;
  const result = await getPoSupplierPortalAction(token);
  if (!result.success) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Purchase order link not valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask the buyer to send a new purchase order link.
        </p>
      </main>
    );
  }
  return <PoSupplierPortal token={token} initial={result.data} />;
}

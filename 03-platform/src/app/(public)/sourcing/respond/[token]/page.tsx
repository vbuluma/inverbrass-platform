import { getSupplierPortalAction } from "@/modules/procurement/actions/sourcing-actions";
import { SourcingSupplierPortal } from "@/modules/procurement/components/sourcing-supplier-portal";

type SupplierRespondPageProps = {
  params: Promise<{ token: string }>;
};

export default async function SupplierRespondPage({ params }: SupplierRespondPageProps) {
  const { token } = await params;
  const result = await getSupplierPortalAction(token);
  if (!result.success) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Response link not valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask the buyer to send a new invitation link.
        </p>
      </main>
    );
  }
  return <SourcingSupplierPortal token={token} initial={result.data} />;
}

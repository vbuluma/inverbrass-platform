"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProcurementSupplierByPartyAction } from "@/modules/procurement/actions/procurement-actions";

type PartyProcurementLinkProps = {
  partyId: string;
};

export function PartyProcurementLink({ partyId }: PartyProcurementLinkProps) {
  const [href, setHref] = useState<string | null>(null);
  const [label, setLabel] = useState("Checking procurement…");

  useEffect(() => {
    let cancelled = false;
    void getProcurementSupplierByPartyAction(partyId).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.success) {
        setHref(`/procurement/suppliers/new`);
        setLabel("Open procurement");
        return;
      }
      if (result.data) {
        setHref(`/procurement/suppliers/${result.data.id}`);
        setLabel(`${result.data.displayStatusLabel} · ${result.data.qualificationLabel}`);
        return;
      }
      setHref("/procurement/suppliers/new");
      setLabel("Add procurement profile");
    });
    return () => {
      cancelled = true;
    };
  }, [partyId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Procurement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">{label}</p>
        {href ? (
          <Link href={href} className="font-medium underline">
            {href.includes("/new") ? "Create procurement profile" : "View supplier profile"}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

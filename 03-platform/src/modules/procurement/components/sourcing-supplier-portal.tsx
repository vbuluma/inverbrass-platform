"use client";

/**
 * Purpose:
 * Supplier response portal — own quotes only. No budget, savings, or competitor data.
 */

import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  askSupplierPortalClarificationAction,
  submitSupplierPortalQuoteAction,
  withdrawSupplierPortalQuoteAction,
} from "@/modules/procurement/actions/sourcing-actions";
import type { SupplierPortalView } from "@/modules/procurement/types";

type SourcingSupplierPortalProps = {
  token: string;
  initial: SupplierPortalView;
};

type LineDraft = {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
};

type PaymentTermDraft = {
  milestoneName: string;
  percentage: string;
  triggerEvent: string;
};

export function SourcingSupplierPortal({ token, initial }: SourcingSupplierPortalProps) {
  const [view, setView] = useState(initial);
  const [amount, setAmount] = useState("");
  const [comments, setComments] = useState("");
  const [deliveryLeadDays, setDeliveryLeadDays] = useState("");
  const [year1Amount, setYear1Amount] = useState("");
  const [tcoAmount, setTcoAmount] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([
    { description: "", quantity: "1", unitPrice: "", taxRate: "0" },
  ]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermDraft[]>([
    { milestoneName: "On delivery", percentage: "100", triggerEvent: "Delivery" },
  ]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function apply(next: SupplierPortalView) {
    setView(next);
    setError(null);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await submitSupplierPortalQuoteAction(token, {
        amount: amount || undefined,
        comments: comments || undefined,
        deliveryLeadDays: deliveryLeadDays ? Number(deliveryLeadDays) : undefined,
        year1Amount: year1Amount || undefined,
        tcoAmount: tcoAmount || undefined,
        lines: lines
          .filter((row) => row.description.trim() && row.unitPrice.trim())
          .map((row) => ({
            description: row.description,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            taxRate: row.taxRate,
          })),
        paymentTerms: paymentTerms
          .filter((row) => row.milestoneName.trim())
          .map((row) => ({
            milestoneName: row.milestoneName,
            percentage: row.percentage,
            triggerEvent: row.triggerEvent || undefined,
          })),
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      apply(result.data);
      setAmount("");
    });
  }

  function onWithdraw() {
    startTransition(async () => {
      const result = await withdrawSupplierPortalQuoteAction(token);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      apply(result.data);
    });
  }

  function onAskClarification(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await askSupplierPortalClarificationAction(token, question);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      apply(result.data);
      setQuestion("");
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-sm text-muted-foreground">{view.eventNumber}</p>
        <h1 className="text-2xl font-semibold">{view.eventTitle}</h1>
        <p className="text-sm text-muted-foreground">
          Closes {new Date(view.closesAt).toLocaleString()}
          {view.biddingOpen ? " · Open for submissions" : " · Closed"}
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {view.ownQuotes.length > 0 ? (
        <ul className="space-y-2 rounded-lg border p-4 text-sm">
          {view.ownQuotes.map((row) => (
            <li key={row.id}>
              Version {row.version} ({row.statusLabel}): {row.amountLabel}
              {row.lines.length > 0 ? ` · ${row.lines.length} line(s)` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No quotation submitted yet.</p>
      )}
      {view.canSubmit ? (
        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-4">
          <h2 className="font-semibold">Submit response</h2>
          <div className="space-y-2">
            <Label htmlFor="amount">Header amount ({view.currencyCode})</Label>
            <Input
              id="amount"
              value={amount}
              onChange={(change) => setAmount(change.target.value)}
              placeholder="Optional if line items are provided"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comments">Comments / assumptions</Label>
            <textarea
              id="comments"
              value={comments}
              onChange={(change) => setComments(change.target.value)}
              className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="lead">Lead time (days)</Label>
              <Input
                id="lead"
                value={deliveryLeadDays}
                onChange={(change) => setDeliveryLeadDays(change.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year1">Year 1 amount</Label>
              <Input
                id="year1"
                value={year1Amount}
                onChange={(change) => setYear1Amount(change.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tco">TCO total</Label>
              <Input
                id="tco"
                value={tcoAmount}
                onChange={(change) => setTcoAmount(change.target.value)}
              />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Line items</legend>
            {lines.map((row, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-4">
                <Input
                  value={row.description}
                  onChange={(change) =>
                    setLines((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, description: change.target.value } : item
                      )
                    )
                  }
                  placeholder="Description"
                />
                <Input
                  value={row.quantity}
                  onChange={(change) =>
                    setLines((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, quantity: change.target.value } : item
                      )
                    )
                  }
                  placeholder="Qty"
                />
                <Input
                  value={row.unitPrice}
                  onChange={(change) =>
                    setLines((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, unitPrice: change.target.value } : item
                      )
                    )
                  }
                  placeholder="Unit price"
                />
                <Input
                  value={row.taxRate}
                  onChange={(change) =>
                    setLines((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, taxRate: change.target.value } : item
                      )
                    )
                  }
                  placeholder="Tax %"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setLines((current) => [
                  ...current,
                  { description: "", quantity: "1", unitPrice: "", taxRate: "0" },
                ])
              }
            >
              Add line
            </Button>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Payment schedule</legend>
            {paymentTerms.map((row, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-3">
                <Input
                  value={row.milestoneName}
                  onChange={(change) =>
                    setPaymentTerms((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, milestoneName: change.target.value } : item
                      )
                    )
                  }
                  placeholder="Milestone"
                />
                <Input
                  value={row.percentage}
                  onChange={(change) =>
                    setPaymentTerms((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, percentage: change.target.value } : item
                      )
                    )
                  }
                  placeholder="%"
                />
                <Input
                  value={row.triggerEvent}
                  onChange={(change) =>
                    setPaymentTerms((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, triggerEvent: change.target.value } : item
                      )
                    )
                  }
                  placeholder="Trigger"
                />
              </div>
            ))}
          </fieldset>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Submitting…" : view.ownQuotes.length ? "Submit revision" : "Submit quote"}
          </Button>
        </form>
      ) : null}
      {view.canWithdraw ? (
        <Button type="button" variant="outline" disabled={isPending} onClick={onWithdraw}>
          Withdraw bid
        </Button>
      ) : null}
      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">RFX clarifications</h2>
        <p className="text-sm text-muted-foreground">
          All questions and answers on this RFX are visible to every invited supplier.
        </p>
        {view.clarifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No questions yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {view.clarifications.map((row) => (
              <li key={row.id}>
                {row.partyName ? (
                  <p className="text-xs text-muted-foreground">{row.partyName}</p>
                ) : null}
                <p className="font-medium">Q: {row.question}</p>
                {row.answer ? <p className="text-muted-foreground">A: {row.answer}</p> : null}
              </li>
            ))}
          </ul>
        )}
        {view.biddingOpen ? (
          <form onSubmit={onAskClarification} className="flex gap-2">
            <Input
              value={question}
              onChange={(change) => setQuestion(change.target.value)}
              placeholder="Ask a question"
              className="flex-1"
            />
            <Button type="submit" disabled={isPending || !question.trim()}>
              Ask
            </Button>
          </form>
        ) : null}
      </section>
    </main>
  );
}

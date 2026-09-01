"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  approveGovernanceAction,
  proposeGovernanceAction,
  rejectGovernanceAction,
} from "@/modules/procurement/actions/performance-actions";
import { GOVERNANCE_PROPOSAL_TYPES } from "@/modules/procurement/constants";
import type { GovernanceProposalRecord } from "@/modules/procurement/types";

type SupplierGovernancePanelProps = {
  profileId: string;
  pendingProposals: GovernanceProposalRecord[];
  canPropose: boolean;
  canApprove: boolean;
  onChanged?: () => void;
};

export function SupplierGovernancePanel({
  profileId,
  pendingProposals,
  canPropose,
  canApprove,
  onChanged,
}: SupplierGovernancePanelProps) {
  const [proposalType, setProposalType] = useState<string>(GOVERNANCE_PROPOSAL_TYPES.GRANT_PREFERRED);
  const [reason, setReason] = useState("");
  const [authority, setAuthority] = useState("");
  const [evidenceDocumentId, setEvidenceDocumentId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [reviewDate, setReviewDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const requiresEvidence =
    proposalType === GOVERNANCE_PROPOSAL_TYPES.BLACKLIST ||
    proposalType === GOVERNANCE_PROPOSAL_TYPES.SUSPEND;

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h2 className="font-semibold">Governance</h2>
        <p className="text-sm text-muted-foreground">
          Propose preferred status, suspension, or blacklisting with evidence and approval.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {pendingProposals.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Pending proposals</h3>
          {pendingProposals.map((proposal) => (
            <div key={proposal.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{proposal.proposalType.replaceAll("_", " ")}</p>
              <p className="text-muted-foreground">{proposal.reason}</p>
              {canApprove ? (
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await approveGovernanceAction(profileId, proposal.id);
                        if (!result.success) {
                          setError(result.error.message);
                          return;
                        }
                        setError(null);
                        onChanged?.();
                      })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await rejectGovernanceAction(profileId, proposal.id, "Rejected");
                        if (!result.success) {
                          setError(result.error.message);
                          return;
                        }
                        setError(null);
                        onChanged?.();
                      })
                    }
                  >
                    Reject
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {canPropose ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await proposeGovernanceAction(profileId, {
                proposalType,
                reason,
                authority: authority || null,
                evidenceDocumentId: evidenceDocumentId || null,
                effectiveDate,
                reviewDate: reviewDate || null,
              });
              if (!result.success) {
                setError(result.error.message);
                return;
              }
              setError(null);
              setReason("");
              onChanged?.();
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="proposalType">Proposal</Label>
            <select
              id="proposalType"
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={proposalType}
              onChange={(event) => setProposalType(event.target.value)}
            >
              <option value={GOVERNANCE_PROPOSAL_TYPES.GRANT_PREFERRED}>Grant preferred</option>
              <option value={GOVERNANCE_PROPOSAL_TYPES.REVOKE_PREFERRED}>Revoke preferred</option>
              <option value={GOVERNANCE_PROPOSAL_TYPES.SUSPEND}>Suspend</option>
              <option value={GOVERNANCE_PROPOSAL_TYPES.BLACKLIST}>Blacklist</option>
              <option value={GOVERNANCE_PROPOSAL_TYPES.REACTIVATE}>Reactivate</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          {requiresEvidence ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="authority">Approving authority</Label>
                <Input
                  id="authority"
                  value={authority}
                  onChange={(event) => setAuthority(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evidenceDocumentId">Evidence document ID</Label>
                <Input
                  id="evidenceDocumentId"
                  value={evidenceDocumentId}
                  onChange={(event) => setEvidenceDocumentId(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewDate">Review date</Label>
                <Input
                  id="reviewDate"
                  type="date"
                  value={reviewDate}
                  onChange={(event) => setReviewDate(event.target.value)}
                />
              </div>
            </>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="effectiveDate">Effective date</Label>
            <Input
              id="effectiveDate"
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={isPending || !reason.trim()}>
            Submit proposal
          </Button>
        </form>
      ) : null}
    </section>
  );
}

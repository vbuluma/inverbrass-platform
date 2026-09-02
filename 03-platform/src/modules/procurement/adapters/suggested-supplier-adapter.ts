/**
 * Purpose:
 * Resolve a suggested supplier through IP-01 profile + eligibility.
 * Suggestion is not an award.
 */

import { createProcurementPartyAdapter } from "@/modules/procurement/adapters/procurement-party-adapter";
import { createProcurementProfileRepository } from "@/modules/procurement/repositories/procurement-profile-repository";
import { createSupplierQualificationRepository } from "@/modules/procurement/repositories/supplier-qualification-repository";
import type {
  ProcurementPartyPort,
  ProcurementProfileRepositoryPort,
  SuggestedSupplierPort,
  SupplierQualificationRepositoryPort,
} from "@/modules/procurement/ports";

export class SuggestedSupplierAdapter implements SuggestedSupplierPort {
  constructor(
    private readonly profiles: ProcurementProfileRepositoryPort = createProcurementProfileRepository(),
    private readonly parties: ProcurementPartyPort = createProcurementPartyAdapter(),
    private readonly qualifications: SupplierQualificationRepositoryPort = createSupplierQualificationRepository()
  ) {}

  async resolve(businessId: string, profileId: string) {
    const profile = await this.profiles.findById(businessId, profileId);
    if (!profile) {
      return null;
    }
    const party = await this.parties.findParty(businessId, profile.partyId);
    if (!party) {
      return null;
    }
    const qualifications = await this.qualifications.listByProfile(businessId, profile.id);
    return {
      profileId: profile.id,
      partyId: party.id,
      party,
      profile,
      latestQualification: qualifications[0] ?? null,
    };
  }
}

export function createSuggestedSupplierAdapter() {
  return new SuggestedSupplierAdapter();
}

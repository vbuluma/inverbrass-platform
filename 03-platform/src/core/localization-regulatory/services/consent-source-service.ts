/**
 * ENG-003b — Consent Source catalogue service.
 *
 * Country administrators configure valid consent sources.
 * Consumers (Consent Engine, Party module) read catalogues — never hardcode.
 */

import {
  createConsentSourceRepository,
  type ConsentSourceRepository,
} from "@/core/localization-regulatory/repositories/consent-source-repository";

export type ConsentSourceCatalogue = Array<{ code: string; label: string }>;

export class ConsentSourceService {
  constructor(
    private readonly repository: ConsentSourceRepository = createConsentSourceRepository()
  ) {}

  async getCatalogue(countryCode?: string | null): Promise<ConsentSourceCatalogue> {
    const rows = await this.repository.findActiveForCountry(countryCode);
    return rows.map((row) => ({ code: row.code, label: row.label }));
  }

  async isValidSource(
    sourceCode: string,
    countryCode?: string | null
  ): Promise<boolean> {
    const catalogue = await this.getCatalogue(countryCode);
    return catalogue.some((entry) => entry.code === sourceCode);
  }
}

export function createConsentSourceService(): ConsentSourceService {
  return new ConsentSourceService();
}

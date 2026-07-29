/**
 * Purpose:
 * Verification provider abstraction — future government/partner API integrations.
 *
 * Engine:
 * ENG-003j – Identity & Regulatory Identification Engine
 *
 * Note:
 * Interface only — no provider implementations in IP-013.
 */

import type {
  IdentifierVerificationRequest,
  IdentifierVerificationResponse,
} from "@/core/identity-regulatory/types";

export type IdentifierVerificationProviderCode =
  | "GOVERNMENT_REGISTRY"
  | "TAX_AUTHORITY"
  | "COMPANY_REGISTRY"
  | "CREDIT_BUREAU"
  | "PASSPORT_AUTHORITY"
  | "DRIVING_LICENCE_AUTHORITY";

export interface IdentifierVerificationProvider {
  readonly providerCode: IdentifierVerificationProviderCode;
  supportsIdentifierType(identifierTypeCode: string): boolean;
  verify(
    request: IdentifierVerificationRequest
  ): Promise<IdentifierVerificationResponse>;
}

/** Registry for future verification providers — no implementations yet. */
export class IdentifierVerificationProviderRegistry {
  private readonly providers = new Map<
    IdentifierVerificationProviderCode,
    IdentifierVerificationProvider
  >();

  register(provider: IdentifierVerificationProvider): void {
    this.providers.set(provider.providerCode, provider);
  }

  findForIdentifierType(
    identifierTypeCode: string
  ): IdentifierVerificationProvider | null {
    for (const provider of this.providers.values()) {
      if (provider.supportsIdentifierType(identifierTypeCode)) {
        return provider;
      }
    }
    return null;
  }
}

export function createIdentifierVerificationProviderRegistry(): IdentifierVerificationProviderRegistry {
  return new IdentifierVerificationProviderRegistry();
}

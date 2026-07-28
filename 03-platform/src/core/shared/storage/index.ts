/**
 * Purpose:
 * Factory for storage providers used by document services.
 *
 * Implementation Package:
 * BP-002 / IP-007 – Party Documents
 */

import { createSupabaseStorageProvider } from "@/core/shared/storage/supabase-storage-provider";
import type { StorageProvider } from "@/core/shared/storage/types";
import { STORAGE_PROVIDER_CODES } from "@/modules/party/constants";

export type { StorageProvider, StorageUploadInput, StorageUploadResult } from "@/core/shared/storage/types";

export function createStorageProvider(
  providerCode: string = STORAGE_PROVIDER_CODES.SUPABASE
): StorageProvider {
  switch (providerCode) {
    case STORAGE_PROVIDER_CODES.SUPABASE:
      return createSupabaseStorageProvider();
    default:
      throw new Error(`Unsupported storage provider: ${providerCode}`);
  }
}

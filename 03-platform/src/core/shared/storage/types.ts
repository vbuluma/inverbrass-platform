/**
 * Purpose:
 * Storage provider abstraction for enterprise document binaries.
 *
 * Design rationale:
 * Party module depends on this interface — not a specific cloud vendor.
 * Initial implementation: Supabase Storage.
 *
 * Implementation Package:
 * BP-002 / IP-007 – Party Documents
 */

export type StorageUploadInput = {
  bucket: string;
  path: string;
  data: Buffer;
  contentType: string;
};

export type StorageUploadResult = {
  providerCode: string;
  bucket: string;
  path: string;
};

export type StorageSignedUrlResult = {
  url: string;
  expiresAt: Date;
};

export interface StorageProvider {
  readonly providerCode: string;
  ensureBucket(bucket: string): Promise<void>;
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;
  createSignedDownloadUrl(
    bucket: string,
    path: string,
    expiresInSeconds?: number
  ): Promise<StorageSignedUrlResult>;
  remove(bucket: string, path: string): Promise<void>;
}

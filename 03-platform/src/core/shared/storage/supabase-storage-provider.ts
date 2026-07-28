/**
 * Purpose:
 * Supabase Storage implementation of the StorageProvider interface.
 *
 * Implementation Package:
 * BP-002 / IP-007 – Party Documents
 */

import { createAdminClient } from "@/lib/supabase/admin";

import type {
  StorageProvider,
  StorageSignedUrlResult,
  StorageUploadInput,
  StorageUploadResult,
} from "@/core/shared/storage/types";
import {
  PARTY_DOCUMENT_MAX_SIZE_BYTES,
  STORAGE_PROVIDER_CODES,
} from "@/modules/party/constants";

const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;

function isBucketAlreadyExistsError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("already exists") || normalized.includes("duplicate");
}

export class SupabaseStorageProvider implements StorageProvider {
  readonly providerCode = STORAGE_PROVIDER_CODES.SUPABASE;

  async ensureBucket(bucket: string): Promise<void> {
    const client = createAdminClient();
    const { data: buckets, error: listError } = await client.storage.listBuckets();

    if (listError) {
      throw new Error(`Storage bucket list failed: ${listError.message}`);
    }

    if (buckets?.some((entry) => entry.name === bucket)) {
      return;
    }

    const { error: createError } = await client.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: PARTY_DOCUMENT_MAX_SIZE_BYTES,
    });

    if (createError && !isBucketAlreadyExistsError(createError.message)) {
      throw new Error(`Storage bucket create failed: ${createError.message}`);
    }
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    await this.ensureBucket(input.bucket);
    const client = createAdminClient();
    const { error } = await client.storage.from(input.bucket).upload(input.path, input.data, {
      contentType: input.contentType,
      upsert: false,
    });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    return {
      providerCode: this.providerCode,
      bucket: input.bucket,
      path: input.path,
    };
  }

  async createSignedDownloadUrl(
    bucket: string,
    path: string,
    expiresInSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS
  ): Promise<StorageSignedUrlResult> {
    const client = createAdminClient();
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(
        `Storage signed URL failed: ${error?.message ?? "Missing signed URL."}`
      );
    }

    return {
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }

  async remove(bucket: string, path: string): Promise<void> {
    const client = createAdminClient();
    const { error } = await client.storage.from(bucket).remove([path]);

    if (error) {
      throw new Error(`Storage remove failed: ${error.message}`);
    }
  }
}

export function createSupabaseStorageProvider(): SupabaseStorageProvider {
  return new SupabaseStorageProvider();
}

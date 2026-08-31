"use server";

/**
 * Purpose:
 * Expose Offering Document Management server actions to the App Router UI.
 *
 * Architecture:
 * UI → Server Actions → OfferingDocumentService → Repositories + Storage
 *
 * Implementation Package:
 * BP-003 / IP-009 – Offering Documents & Compliance
 */

import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProductError } from "@/modules/product/errors";
import { createOfferingDocumentService } from "@/modules/product/services/offering-document-service";
import type {
  OfferingDocumentsPanelView,
  UploadOfferingDocumentMetadata,
  VerifyOfferingDocumentPayload,
} from "@/modules/product/types";

async function requireContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    throw new ProductError(
      "SESSION_REQUIRED",
      "Your session has expired. Please sign in again.",
      401
    );
  }

  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!context) {
    throw new ProductError(
      "BUSINESS_CONTEXT_REQUIRED",
      "Select a business before managing products.",
      403
    );
  }

  return context;
}

function toActionError(error: unknown): AuthActionResult<never> {
  if (isNextRedirectError(error)) {
    throw error;
  }
  if (error instanceof ProductError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.field ? { field: error.field } : {}),
      },
    };
  }
  if (error instanceof AuthError) {
    return {
      success: false,
      error: { code: error.code, message: error.message },
    };
  }
  console.error("[offering-document-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that product action. Please try again.",
    },
  };
}

async function parseUploadFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new ProductError(
      "INVALID_INPUT",
      "Select a file to upload.",
      400,
      "file"
    );
  }

  return {
    name: file.name,
    type: file.type,
    size: file.size,
    buffer: Buffer.from(await file.arrayBuffer()),
  };
}

function parseMetadata(formData: FormData): UploadOfferingDocumentMetadata {
  return {
    documentTypeCode: String(formData.get("documentTypeCode") ?? ""),
    issueDate: String(formData.get("issueDate") ?? "") || undefined,
    expiryDate: String(formData.get("expiryDate") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  };
}

function revalidateProductPath(productId: string) {
  revalidatePath(`/products/${productId}`);
}

export async function getOfferingDocumentsPanelAction(
  productId: string,
  filterDocumentTypeCode?: string
): Promise<AuthActionResult<OfferingDocumentsPanelView>> {
  try {
    const context = await requireContext();
    const service = createOfferingDocumentService();
    const data = await service.getOfferingDocumentsPanel(
      context,
      productId,
      filterDocumentTypeCode
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function uploadOfferingDocumentAction(
  productId: string,
  formData: FormData
): Promise<AuthActionResult<OfferingDocumentsPanelView>> {
  try {
    const context = await requireContext();
    const service = createOfferingDocumentService();
    const file = await parseUploadFile(formData);
    const metadata = parseMetadata(formData);
    const data = await service.uploadDocument(
      context,
      productId,
      file,
      metadata
    );
    revalidateProductPath(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function replaceOfferingDocumentAction(
  productId: string,
  offeringDocumentId: string,
  formData: FormData
): Promise<AuthActionResult<OfferingDocumentsPanelView>> {
  try {
    const context = await requireContext();
    const service = createOfferingDocumentService();
    const file = await parseUploadFile(formData);
    const metadata = parseMetadata(formData);
    const data = await service.replaceDocument(
      context,
      productId,
      offeringDocumentId,
      file,
      metadata
    );
    revalidateProductPath(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function verifyOfferingDocumentAction(
  productId: string,
  offeringDocumentId: string,
  payload: VerifyOfferingDocumentPayload
): Promise<AuthActionResult<OfferingDocumentsPanelView>> {
  try {
    const context = await requireContext();
    const service = createOfferingDocumentService();
    const data = await service.verifyDocument(
      context,
      productId,
      offeringDocumentId,
      payload
    );
    revalidateProductPath(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deactivateOfferingDocumentAction(
  productId: string,
  offeringDocumentId: string
): Promise<AuthActionResult<OfferingDocumentsPanelView>> {
  try {
    const context = await requireContext();
    const service = createOfferingDocumentService();
    const data = await service.deactivateDocument(
      context,
      productId,
      offeringDocumentId
    );
    revalidateProductPath(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reactivateOfferingDocumentAction(
  productId: string,
  offeringDocumentId: string
): Promise<AuthActionResult<OfferingDocumentsPanelView>> {
  try {
    const context = await requireContext();
    const service = createOfferingDocumentService();
    const data = await service.reactivateDocument(
      context,
      productId,
      offeringDocumentId
    );
    revalidateProductPath(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeOfferingDocumentAction(
  productId: string,
  offeringDocumentId: string
): Promise<AuthActionResult<OfferingDocumentsPanelView>> {
  try {
    const context = await requireContext();
    const service = createOfferingDocumentService();
    const data = await service.removeDocument(
      context,
      productId,
      offeringDocumentId
    );
    revalidateProductPath(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getOfferingDocumentDownloadUrlAction(
  productId: string,
  offeringDocumentId: string
): Promise<AuthActionResult<{ url: string; fileName: string }>> {
  try {
    const context = await requireContext();
    const service = createOfferingDocumentService();
    const data = await service.getDownloadUrl(
      context,
      productId,
      offeringDocumentId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getOfferingDocumentPreviewUrlAction(
  productId: string,
  offeringDocumentId: string
): Promise<AuthActionResult<{ url: string }>> {
  try {
    const context = await requireContext();
    const service = createOfferingDocumentService();
    const data = await service.getPreviewUrl(
      context,
      productId,
      offeringDocumentId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

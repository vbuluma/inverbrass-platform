"use server";

/**
 * Purpose:
 * Expose Party Document Management server actions to the App Router UI.
 *
 * Architecture:
 * UI → Server Actions → PartyDocumentService → Repositories + Storage
 *
 * Implementation Package:
 * BP-002 / IP-007 – Party Documents
 */

import { requirePartyChannelContext as requirePartyContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PartyError } from "@/modules/party/errors";
import { createPartyDocumentService } from "@/modules/party/services/party-document-service";
import type {
  PartyDocumentsPanelView,
  UploadPartyDocumentMetadata,
  VerifyPartyDocumentPayload,
} from "@/modules/party/types";
import { revalidatePath } from "next/cache";

function isNextDynamicServerError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).includes("DYNAMIC_SERVER_USAGE")
  );
}


function toActionError(error: unknown): AuthActionResult<never> {
  if (isNextRedirectError(error) || isNextDynamicServerError(error)) {
    throw error;
  }

  if (error instanceof PartyError) {
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

  console.error("[party-document-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that Party action. Please try again.",
    },
  };
}

async function parseUploadFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new PartyError(
      "DOCUMENT_UPLOAD_INVALID",
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

function parseMetadata(formData: FormData): UploadPartyDocumentMetadata {
  return {
    documentTypeCode: String(formData.get("documentTypeCode") ?? ""),
    issueDate: String(formData.get("issueDate") ?? "") || undefined,
    expiryDate: String(formData.get("expiryDate") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  };
}

export async function listPartyDocumentsAction(
  partyId: string,
  filterDocumentTypeCode?: string
): Promise<AuthActionResult<PartyDocumentsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyDocumentService();
    const data = await service.getPartyDocuments(
      context,
      partyId,
      filterDocumentTypeCode
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function uploadPartyDocumentAction(
  partyId: string,
  formData: FormData
): Promise<AuthActionResult<PartyDocumentsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyDocumentService();
    const file = await parseUploadFile(formData);
    const metadata = parseMetadata(formData);
    const data = await service.uploadDocument(context, partyId, file, metadata);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function replacePartyDocumentAction(
  partyId: string,
  partyDocumentId: string,
  formData: FormData
): Promise<AuthActionResult<PartyDocumentsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyDocumentService();
    const file = await parseUploadFile(formData);
    const metadata = parseMetadata(formData);
    const data = await service.replaceDocument(
      context,
      partyId,
      partyDocumentId,
      file,
      metadata
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function verifyPartyDocumentAction(
  partyId: string,
  partyDocumentId: string,
  payload: VerifyPartyDocumentPayload
): Promise<AuthActionResult<PartyDocumentsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyDocumentService();
    const data = await service.verifyDocument(
      context,
      partyId,
      partyDocumentId,
      payload
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deactivatePartyDocumentAction(
  partyId: string,
  partyDocumentId: string
): Promise<AuthActionResult<PartyDocumentsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyDocumentService();
    const data = await service.deactivateDocument(
      context,
      partyId,
      partyDocumentId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reactivatePartyDocumentAction(
  partyId: string,
  partyDocumentId: string
): Promise<AuthActionResult<PartyDocumentsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyDocumentService();
    const data = await service.reactivateDocument(
      context,
      partyId,
      partyDocumentId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removePartyDocumentAction(
  partyId: string,
  partyDocumentId: string
): Promise<AuthActionResult<PartyDocumentsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyDocumentService();
    const data = await service.removeDocument(context, partyId, partyDocumentId);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPartyDocumentDownloadUrlAction(
  partyId: string,
  partyDocumentId: string
): Promise<AuthActionResult<{ url: string; fileName: string }>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyDocumentService();
    const data = await service.getDownloadUrl(context, partyId, partyDocumentId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPartyDocumentPreviewUrlAction(
  partyId: string,
  partyDocumentId: string
): Promise<AuthActionResult<{ url: string }>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyDocumentService();
    const data = await service.getPreviewUrl(context, partyId, partyDocumentId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

"use server";

/**
 * Purpose:
 * Expose Product Attributes server actions to the App Router UI.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import { requireProductChannelContext as requireProductContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProductError } from "@/modules/product/errors";
import { createAttributeAssignmentService } from "@/modules/product/services/attribute-assignment-service";
import { createAttributeDefinitionService } from "@/modules/product/services/attribute-definition-service";
import type {
  AssignAttributeScopePayload,
  AttributeDashboardView,
  AttributeDefinitionView,
  AttributeDefinitionWorkspaceView,
  AttributeGroupView,
  AttributeGroupWorkspaceView,
  AttributeOptionView,
  AttributeScopeView,
  CreateAttributeDefinitionPayload,
  CreateAttributeGroupPayload,
  CreateAttributeOptionPayload,
  ProductAttributesPanelView,
  ProductSummaryView,
  SaveProductAttributeValuesPayload,
  SearchAttributesPayload,
  SearchProductsByAttributePayload,
  UpdateAttributeDefinitionPayload,
  UpdateAttributeGroupPayload,
  UpdateAttributeOptionPayload,
} from "@/modules/product/types";


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

  console.error("[attribute-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that attribute action. Please try again.",
    },
  };
}

function revalidateAttributePaths(definitionId?: string, groupId?: string) {
  revalidatePath("/products/attributes");
  if (groupId) {
    revalidatePath(`/products/attributes/groups/${groupId}`);
  }
  if (definitionId) {
    revalidatePath(`/products/attributes/definitions/${definitionId}`);
  }
}

export async function getAttributeDashboardAction(): Promise<
  AuthActionResult<AttributeDashboardView>
> {
  try {
    const context = await requireProductContext();
    const data = await createAttributeDefinitionService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createAttributeGroupAction(
  payload: CreateAttributeGroupPayload
): Promise<AuthActionResult<AttributeGroupView>> {
  try {
    const context = await requireProductContext();
    const data = await createAttributeDefinitionService().createGroup(
      context,
      payload
    );
    revalidateAttributePaths(undefined, data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateAttributeGroupAction(
  groupId: string,
  payload: UpdateAttributeGroupPayload
): Promise<AuthActionResult<AttributeGroupView>> {
  try {
    const context = await requireProductContext();
    const data = await createAttributeDefinitionService().updateGroup(
      context,
      groupId,
      payload
    );
    revalidateAttributePaths(undefined, groupId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getAttributeGroupWorkspaceAction(
  groupId: string
): Promise<AuthActionResult<AttributeGroupWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createAttributeDefinitionService().getGroupWorkspace(
      context,
      groupId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createAttributeDefinitionAction(
  payload: CreateAttributeDefinitionPayload
): Promise<AuthActionResult<AttributeDefinitionView>> {
  try {
    const context = await requireProductContext();
    const data = await createAttributeDefinitionService().createDefinition(
      context,
      payload
    );
    revalidateAttributePaths(data.id, data.attributeGroupId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateAttributeDefinitionAction(
  definitionId: string,
  payload: UpdateAttributeDefinitionPayload
): Promise<AuthActionResult<AttributeDefinitionView>> {
  try {
    const context = await requireProductContext();
    const data = await createAttributeDefinitionService().updateDefinition(
      context,
      definitionId,
      payload
    );
    revalidateAttributePaths(definitionId, data.attributeGroupId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getAttributeDefinitionWorkspaceAction(
  definitionId: string
): Promise<AuthActionResult<AttributeDefinitionWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data =
      await createAttributeDefinitionService().getDefinitionWorkspace(
        context,
        definitionId
      );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveAttributeDefinitionAction(
  definitionId: string
): Promise<AuthActionResult<AttributeDefinitionView>> {
  try {
    const context = await requireProductContext();
    const data = await createAttributeDefinitionService().archiveDefinition(
      context,
      definitionId
    );
    revalidateAttributePaths(definitionId, data.attributeGroupId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createAttributeOptionAction(
  definitionId: string,
  payload: CreateAttributeOptionPayload
): Promise<AuthActionResult<AttributeOptionView>> {
  try {
    const context = await requireProductContext();
    const data = await createAttributeDefinitionService().createOption(
      context,
      definitionId,
      payload
    );
    revalidateAttributePaths(definitionId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateAttributeOptionAction(
  definitionId: string,
  optionId: string,
  payload: UpdateAttributeOptionPayload
): Promise<AuthActionResult<AttributeOptionView>> {
  try {
    const context = await requireProductContext();
    const data = await createAttributeDefinitionService().updateOption(
      context,
      definitionId,
      optionId,
      payload
    );
    revalidateAttributePaths(definitionId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function assignAttributeScopeAction(
  payload: AssignAttributeScopePayload
): Promise<AuthActionResult<AttributeScopeView>> {
  try {
    const context = await requireProductContext();
    const data = await createAttributeDefinitionService().assignScope(
      context,
      payload
    );
    revalidateAttributePaths(payload.attributeDefinitionId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeAttributeScopeAction(
  definitionId: string,
  scopeId: string
): Promise<AuthActionResult<{ removed: true }>> {
  try {
    const context = await requireProductContext();
    await createAttributeDefinitionService().removeScope(context, scopeId);
    revalidateAttributePaths(definitionId);
    return { success: true, data: { removed: true } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchAttributesAction(
  payload: SearchAttributesPayload
): Promise<AuthActionResult<AttributeDefinitionView[]>> {
  try {
    const context = await requireProductContext();
    const data = await createAttributeDefinitionService().searchDefinitions(
      context,
      payload
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProductAttributesPanelAction(
  productId: string
): Promise<AuthActionResult<ProductAttributesPanelView>> {
  try {
    const context = await requireProductContext();
    const data = await createAttributeAssignmentService().getProductAttributesPanel(
      context,
      productId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveProductAttributeValuesAction(
  productId: string,
  payload: SaveProductAttributeValuesPayload
): Promise<AuthActionResult<ProductAttributesPanelView>> {
  try {
    const context = await requireProductContext();
    const data = await createAttributeAssignmentService().saveProductAttributeValues(
      context,
      productId,
      payload
    );
    revalidatePath(`/products/${productId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchProductsByAttributeAction(
  payload: SearchProductsByAttributePayload
): Promise<AuthActionResult<ProductSummaryView[]>> {
  try {
    const context = await requireProductContext();
    const data =
      await createAttributeAssignmentService().searchProductsByAttribute(
        context,
        payload
      );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

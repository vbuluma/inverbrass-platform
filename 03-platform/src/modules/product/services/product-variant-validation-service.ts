/**
 * Purpose:
 * Validate variant attribute overrides using IP-004 definitions (no I/O).
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import { ProductError, PRODUCT_USER_MESSAGES } from "@/modules/product/errors";
import type { VariantAttributePair } from "@/modules/product/services/product-variant-rules";
import {
  buildCombinationFingerprint,
  hasDistinguishingAttributes,
} from "@/modules/product/services/product-variant-rules";
import {
  validateAttributeValue,
  type AttributeDefinitionForValidation,
} from "@/modules/product/services/attribute-validation-service";

export type VariantAttributeDefinitionContext = AttributeDefinitionForValidation & {
  id: string;
};

export function validateVariantAttributes(
  definitions: VariantAttributeDefinitionContext[],
  attributes: VariantAttributePair[]
): Record<string, unknown> {
  if (!hasDistinguishingAttributes(attributes)) {
    throw new ProductError(
      "VARIANT_REQUIRES_DISTINGUISHING_ATTRIBUTE",
      PRODUCT_USER_MESSAGES.VARIANT_REQUIRES_DISTINGUISHING_ATTRIBUTE,
      400,
      "attributes"
    );
  }

  const definitionById = new Map(
    definitions.map((definition) => [definition.id, definition])
  );

  const normalized: Record<string, unknown> = {};

  for (const attribute of attributes) {
    const definition = definitionById.get(attribute.attributeDefinitionId);

    if (!definition) {
      throw new ProductError(
        "ATTRIBUTE_DEFINITION_NOT_FOUND",
        PRODUCT_USER_MESSAGES.ATTRIBUTE_DEFINITION_NOT_FOUND,
        400,
        attribute.attributeDefinitionId
      );
    }

    const result = validateAttributeValue(definition, attribute.value);
    normalized[definition.code] = result.normalizedValue;
  }

  return normalized;
}

export function computeVariantFingerprint(
  attributes: VariantAttributePair[]
): string | null {
  return buildCombinationFingerprint(attributes);
}

/**
 * ENG-003k — Dynamic product module user-facing error and validation messages.
 */

import type { BusinessTerminology } from "@/core/industry-experience/business-terminology";
import { resolveBusinessTerminology } from "@/core/industry-experience/business-terminology";
import type { ProductErrorCode } from "@/modules/product/errors";

export type ProductUserMessages = Record<ProductErrorCode, string>;

export function buildProductUserMessages(
  terminology: BusinessTerminology
): ProductUserMessages {
  const offering = terminology.offerings.singular;
  const offerings = terminology.offerings.plural;
  const offeringLower = offering.toLowerCase();
  const offeringsLower = offerings.toLowerCase();
  const variant = terminology.variants.singular;
  const variants = terminology.variants.plural;
  const variantLower = variant.toLowerCase();
  const bundle = terminology.bundles.singular;
  const bundles = terminology.bundles.plural;
  const category = terminology.categories.singular;
  const hub = terminology.offerings.hubTitle;

  return {
    INVALID_INPUT: `Please check the ${offeringLower} details and try again.`,
    SESSION_REQUIRED: "Your session has expired. Please sign in again.",
    BUSINESS_CONTEXT_REQUIRED: "Select a business before managing offerings.",
    PRODUCT_NOT_FOUND: `${offering} not found.`,
    DUPLICATE_PRODUCT_CODE: `A ${offeringLower} with this code already exists.`,
    INVALID_PRODUCT_TYPE: `Selected ${terminology.offerings.typeLabel.toLowerCase()} is not valid.`,
    INVALID_STATUS_TRANSITION: "This status change is not allowed.",
    ARCHIVED_PRODUCT_IMMUTABLE: `Archived ${offeringsLower} cannot be modified.`,
    REFERENCE_DATA_MISSING: `${offering} reference catalogues are not available. Contact your administrator.`,
    OWNER_PARTY_NOT_FOUND: `Selected ${offeringLower} owner was not found.`,
    CLASSIFICATION_NOT_FOUND: `${category} not found.`,
    DUPLICATE_CLASSIFICATION_CODE: `A ${category.toLowerCase()} with this code already exists.`,
    CIRCULAR_CLASSIFICATION_HIERARCHY:
      "This move would create a circular hierarchy.",
    CLASSIFICATION_HAS_ACTIVE_CHILDREN:
      "Cannot deactivate a classification that has active child nodes.",
    CLASSIFICATION_HAS_ACTIVE_PRODUCTS: `Cannot deactivate a classification with assigned active ${offeringsLower}.`,
    INACTIVE_CLASSIFICATION: `Only active catalogue nodes can receive new ${offeringsLower}.`,
    DUPLICATE_CLASSIFICATION_ASSIGNMENT: `This ${offeringLower} is already assigned to this classification.`,
    ASSIGNMENT_NOT_FOUND: "Classification assignment not found.",
    PRIMARY_CLASSIFICATION_REQUIRED:
      "Exactly one primary classification is required when assignments exist.",
    UNIT_NOT_FOUND: "Unit of measure not found.",
    UNIT_CATEGORY_NOT_FOUND: "Unit category not found.",
    DUPLICATE_UNIT_CODE: "A unit with this code already exists.",
    DUPLICATE_UNIT_SYMBOL: "This symbol is already used in the selected category.",
    INVALID_CONVERSION_FACTOR: "Conversion factor must be greater than zero.",
    UNIT_CATEGORY_MISMATCH: "Conversion is only allowed within the same category.",
    MULTIPLE_BASE_UNITS: "Only one base unit is allowed per category.",
    ARCHIVED_UNIT_IMMUTABLE: "Archived units cannot be modified.",
    INVALID_UNIT_STATUS_TRANSITION: "This status change is not allowed.",
    ATTRIBUTE_GROUP_NOT_FOUND: "Attribute group not found.",
    ATTRIBUTE_DEFINITION_NOT_FOUND: "Attribute definition not found.",
    ATTRIBUTE_ASSIGNMENT_NOT_FOUND: "Attribute assignment not found.",
    DUPLICATE_ATTRIBUTE_GROUP_CODE: "An attribute group with this code already exists.",
    DUPLICATE_ATTRIBUTE_CODE: "An attribute with this code already exists.",
    DUPLICATE_ATTRIBUTE_NAME_IN_GROUP:
      "An attribute with this name already exists in the group.",
    DUPLICATE_ATTRIBUTE_OPTION_CODE: "This option code already exists for the attribute.",
    DUPLICATE_ATTRIBUTE_SCOPE: "This attribute is already assigned to the selected scope.",
    ARCHIVED_ATTRIBUTE_IMMUTABLE: "Archived attributes cannot be modified.",
    ARCHIVED_ATTRIBUTE_NOT_ASSIGNABLE: "Archived attributes cannot be assigned.",
    INVALID_ATTRIBUTE_DATA_TYPE: "Selected attribute data type is not valid.",
    INVALID_ATTRIBUTE_VALUE: "Attribute value failed validation.",
    OPTIONS_NOT_ALLOWED_FOR_DATA_TYPE:
      "Options are only valid for select-type attributes.",
    OPTIONS_REQUIRED_FOR_DATA_TYPE: "Select-type attributes require at least one option.",
    INVALID_ATTRIBUTE_STATUS_TRANSITION: "This status change is not allowed.",
    VARIANT_NOT_FOUND: `${variant} not found.`,
    DUPLICATE_VARIANT_CODE: `A ${variantLower} with this code already exists.`,
    DUPLICATE_VARIANT_COMBINATION: `A ${variantLower} with this attribute combination already exists for this ${offeringLower}.`,
    ARCHIVED_VARIANT_IMMUTABLE: `Archived ${variants.toLowerCase()} cannot be modified.`,
    INVALID_VARIANT_STATUS_TRANSITION: "This status change is not allowed.",
    VARIANT_REQUIRES_DISTINGUISHING_ATTRIBUTE:
      "At least one distinguishing attribute is required.",
    PARENT_PRODUCT_ARCHIVED: `Cannot modify ${variants.toLowerCase()} on an archived ${offeringLower}.`,
    VARIANT_NOT_TRANSACTABLE: `Archived ${variants.toLowerCase()} cannot be transacted.`,
    BUNDLE_NOT_FOUND: `${bundle} not found.`,
    DUPLICATE_BUNDLE_CODE: `A ${bundle.toLowerCase()} with this code already exists.`,
    DUPLICATE_BUNDLE_ITEM: `This ${offeringLower} or ${variantLower} is already in the ${bundle.toLowerCase()}.`,
    ARCHIVED_BUNDLE_IMMUTABLE: `Archived ${bundles.toLowerCase()} cannot be modified.`,
    INVALID_BUNDLE_STATUS_TRANSITION: "This status change is not allowed.",
    BUNDLE_REQUIRES_ITEMS: `A ${bundle.toLowerCase()} must contain at least one item.`,
    INACTIVE_PRODUCT_NOT_BUNDLEABLE: `Only active ${offeringsLower} can be added to ${bundles.toLowerCase()}.`,
    ARCHIVED_PRODUCT_NOT_BUNDLEABLE: `Archived ${offeringsLower} cannot be added to ${bundles.toLowerCase()}.`,
    INVALID_BUNDLE_ITEM_VARIANT: `The selected ${variantLower} does not belong to this ${offeringLower}.`,
    NESTED_BUNDLE_NOT_ALLOWED: `${bundles} cannot contain other ${bundles.toLowerCase()}.`,
    INVALID_BUNDLE_ITEM_QUANTITY: "Invalid bundle item quantity.",
    PRODUCT_NOT_PUBLISHABLE: `Only active ${offeringsLower} can be published to the catalogue.`,
    PUBLICATION_NOT_FOUND: "Catalogue publication not found.",
    INVALID_PUBLICATION_SCHEDULE: "Publish-from must be before publish-to.",
    DUPLICATE_CATALOGUE_PUBLICATION: "A publication already exists for this channel.",
    CHANNEL_NOT_FOUND: "Catalogue channel not found.",
    INVALID_LIFECYCLE_TRANSITION: "This lifecycle action is not allowed.",
    INVALID_EFFECTIVE_DATES: "Effective From must be before Effective To.",
    MAX_ACTIVE_VERSIONS_EXCEEDED: "Maximum number of active versions reached.",
    SELF_REPLACEMENT_NOT_ALLOWED: `A ${offeringLower} cannot replace itself.`,
    LIFECYCLE_NOT_FOUND: `${offering} lifecycle record not found.`,
    DUPLICATE_OFFERING_RELATIONSHIP: "This relationship already exists.",
    SELF_RELATIONSHIP_NOT_ALLOWED: "An offering cannot relate to itself.",
    CIRCULAR_DEPENDENCY: "This relationship would create a circular dependency.",
    OFFERING_RELATIONSHIP_NOT_FOUND: "Relationship not found.",
    OFFERING_DOCUMENT_NOT_FOUND: "Document not found.",
    PRICING_CATALOGUE_NOT_FOUND: "Pricing catalogue not found.",
    PRICING_ITEM_NOT_FOUND: "Price record not found.",
    DUPLICATE_PRICING_CATALOGUE_CODE:
      "A pricing catalogue with this code already exists.",
    DUPLICATE_ACTIVE_PRICING:
      `An active price already exists for this ${offeringLower} and dimension combination.`,
    OVERLAPPING_PRICING_PERIOD:
      "This price overlaps an existing active price for the same dimensions.",
    INVALID_PRICING_METHOD: "Selected pricing method is not valid.",
    INVALID_PRICING_STATUS_TRANSITION: "This pricing status change is not allowed.",
    EXPIRED_PRICING_IMMUTABLE: "Expired prices cannot be modified.",
    INVALID_PRICE_RANGE: "Price range is not valid.",
    INVALID_EFFECTIVE_PERIOD: "Effective period is not valid.",
    METRIC_DEFINITION_NOT_FOUND: "Metric definition not found.",
    ANALYTICS_READ_ONLY: "Analytics snapshots are read-only.",
    SNAPSHOT_ALREADY_EXISTS: "A snapshot already exists for this metric and period.",
    GOVERNANCE_NOT_FOUND: "Governance record not found.",
    GOVERNANCE_IMMUTABLE: `Archived ${hub.toLowerCase()} cannot modify governance.`,
    GOVERNANCE_LOCKED: "Governance is locked and cannot be changed.",
    BUSINESS_OWNER_REQUIRED: "A Responsible Business Owner is required.",
    PROVIDER_ERROR: "We could not complete that action. Please try again.",
  };
}

export const DEFAULT_PRODUCT_USER_MESSAGES = buildProductUserMessages(
  resolveBusinessTerminology(null)
);

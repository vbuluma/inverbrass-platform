/**
 * Purpose:
 * Seed data for Offering Relationship Type catalogue.
 *
 * Implementation Package:
 * BP-003 / IP-010 – Offering Relationships
 */

export const offeringRelationshipTypes = [
  { code: "PARENT_OF", name: "Parent Of", description: "Hierarchical ownership.", sortOrder: 1, isBidirectional: false },
  { code: "CHILD_OF", name: "Child Of", description: "Reverse hierarchy.", sortOrder: 2, isBidirectional: false },
  { code: "DEPENDS_ON", name: "Depends On", description: "Cannot exist without another offering.", sortOrder: 3, isBidirectional: false },
  { code: "REQUIRED_WITH", name: "Required With", description: "Must be sold together.", sortOrder: 4, isBidirectional: false },
  { code: "OPTIONAL_WITH", name: "Optional With", description: "Recommended companion.", sortOrder: 5, isBidirectional: false },
  { code: "ALTERNATIVE_TO", name: "Alternative To", description: "Customer may choose either.", sortOrder: 6, isBidirectional: true },
  { code: "UPGRADE_TO", name: "Upgrade To", description: "Higher-tier offering.", sortOrder: 7, isBidirectional: false },
  { code: "DOWNGRADE_TO", name: "Downgrade To", description: "Lower-tier offering.", sortOrder: 8, isBidirectional: false },
  { code: "REPLACES", name: "Replaces", description: "Successor offering.", sortOrder: 9, isBidirectional: false },
  { code: "REPLACED_BY", name: "Replaced By", description: "Previous offering.", sortOrder: 10, isBidirectional: false },
  { code: "COMPATIBLE_WITH", name: "Compatible With", description: "Can work together.", sortOrder: 11, isBidirectional: true },
  { code: "INCOMPATIBLE_WITH", name: "Incompatible With", description: "Cannot coexist.", sortOrder: 12, isBidirectional: true },
  { code: "CROSS_SELL", name: "Cross Sell", description: "Suggested additional offering.", sortOrder: 13, isBidirectional: false },
  { code: "UPSELL", name: "Upsell", description: "Higher-value offering.", sortOrder: 14, isBidirectional: false },
  { code: "ACCESSORY", name: "Accessory", description: "Supporting offering.", sortOrder: 15, isBidirectional: false },
] as const;

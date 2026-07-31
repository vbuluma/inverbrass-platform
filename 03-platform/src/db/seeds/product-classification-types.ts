/**
 * Purpose:
 * Platform seed data for Catalogue Structure node types.
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 */

export const productClassificationTypes = [
  {
    code: "CATEGORY",
    name: "Category",
    description: "Top-level catalogue grouping",
    displayOrder: 10,
  },
  {
    code: "SUB_CATEGORY",
    name: "Sub-category",
    description: "Nested category beneath a parent category",
    displayOrder: 20,
  },
  {
    code: "COLLECTION",
    name: "Collection",
    description: "Curated grouping of related offerings",
    displayOrder: 30,
  },
  {
    code: "BRAND",
    name: "Brand",
    description: "Manufacturer or brand node",
    displayOrder: 40,
  },
  {
    code: "PRODUCT_FAMILY",
    name: "Product Family",
    description: "Family of related products",
    displayOrder: 50,
  },
  {
    code: "PRODUCT_LINE",
    name: "Product Line",
    description: "Line within a product family",
    displayOrder: 60,
  },
  {
    code: "DEPARTMENT",
    name: "Department",
    description: "Organisational department grouping",
    displayOrder: 70,
  },
  {
    code: "SEGMENT",
    name: "Segment",
    description: "Market or customer segment",
    displayOrder: 80,
  },
  {
    code: "SERIES",
    name: "Series",
    description: "Product series (e.g. Galaxy)",
    displayOrder: 90,
  },
  {
    code: "MODEL",
    name: "Model",
    description: "Specific model node (e.g. S24)",
    displayOrder: 100,
  },
] as const;

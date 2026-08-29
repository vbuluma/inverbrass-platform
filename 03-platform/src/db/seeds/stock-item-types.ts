/**
 * Purpose:
 * Static stock-item type catalogue for BP-008 IP-01.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

export const stockItemTypes = [
  {
    code: "STOCKED_ITEM",
    name: "Stocked item",
    description: "Physical goods tracked in inventory.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "NON_STOCK_ITEM",
    name: "Non-stock item",
    description: "Catalogue items that are not inventory-managed.",
    displayOrder: 20,
    isActive: true,
  },
] as const;

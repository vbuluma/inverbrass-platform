/**
 * Purpose:
 * Static inventory location type catalogue for BP-008 IP-01.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

export const inventoryLocationTypes = [
  {
    code: "MAIN_STORE",
    name: "Main store",
    description: "Primary stock holding location.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "SHOP_FLOOR",
    name: "Shop floor",
    description: "Stock held on the sales floor.",
    displayOrder: 20,
    isActive: true,
  },
  {
    code: "WAREHOUSE",
    name: "Warehouse",
    description: "Bulk storage location.",
    displayOrder: 30,
    isActive: true,
  },
  {
    code: "BRANCH_STORE",
    name: "Branch store",
    description: "Stock held at a branch.",
    displayOrder: 40,
    isActive: true,
  },
  {
    code: "BACK_STORE",
    name: "Back store",
    description: "Stock held behind the shop floor.",
    displayOrder: 50,
    isActive: true,
  },
] as const;

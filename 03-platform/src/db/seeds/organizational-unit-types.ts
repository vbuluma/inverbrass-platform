/**
 * Purpose:
 * Seed data for Organizational Unit Type reference catalogue.
 *
 * Engine:
 * ENG-003c – Organization Structure Engine
 */

export const organizationalUnitTypes = [
  { code: "HEAD_OFFICE", name: "Head Office", description: "Primary headquarters.", displayOrder: 1, isActive: true },
  { code: "DEPARTMENT", name: "Department", description: "Functional department.", displayOrder: 2, isActive: true },
  { code: "REGIONAL_OFFICE", name: "Regional Office", description: "Regional administrative office.", displayOrder: 3, isActive: true },
  { code: "BRANCH", name: "Branch", description: "Standard operating branch.", displayOrder: 4, isActive: true },
  { code: "DIVISION", name: "Division", description: "Business division.", displayOrder: 5, isActive: true },
  { code: "BUSINESS_UNIT", name: "Business Unit", description: "Semi-autonomous business unit.", displayOrder: 6, isActive: true },
  { code: "STORE", name: "Store", description: "Retail store location.", displayOrder: 7, isActive: true },
  { code: "OUTLET", name: "Outlet", description: "Retail or service outlet.", displayOrder: 8, isActive: true },
  { code: "WAREHOUSE", name: "Warehouse", description: "Storage and logistics facility.", displayOrder: 9, isActive: true },
  { code: "DISTRIBUTION_CENTRE", name: "Distribution Centre", description: "Distribution and fulfilment centre.", displayOrder: 10, isActive: true },
  { code: "FACTORY", name: "Factory", description: "Manufacturing facility.", displayOrder: 11, isActive: true },
  { code: "CAMPUS", name: "Campus", description: "Educational or institutional campus.", displayOrder: 12, isActive: true },
  { code: "CLINIC", name: "Clinic", description: "Healthcare clinic location.", displayOrder: 13, isActive: true },
  { code: "SERVICE_CENTRE", name: "Service Centre", description: "Customer or technical service centre.", displayOrder: 14, isActive: true },
  { code: "CALL_CENTRE", name: "Call Centre", description: "Contact or support centre.", displayOrder: 15, isActive: true },
  { code: "PROJECT_OFFICE", name: "Project Office", description: "Temporary or project-based office.", displayOrder: 16, isActive: true },
  { code: "COLLECTION_CENTRE", name: "Collection Centre", description: "Collection or pickup point.", displayOrder: 17, isActive: true },
] as const;

export type PlatformRoleSeed = {
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  isSystem: boolean;
  isActive: boolean;
};

export const platformRoles: PlatformRoleSeed[] = [
  {
    code: "BUSINESS_OWNER",
    name: "Business Owner",
    description:
      "Full tenant administration including onboarding, activation, configuration, security, and user management.",
    displayOrder: 10,
    isSystem: true,
    isActive: true,
  },
  {
    code: "SUPERVISOR",
    name: "Supervisor",
    description:
      "Operational leadership including employee management, PIN resets, branch oversight, and limited reporting.",
    displayOrder: 20,
    isSystem: true,
    isActive: true,
  },
  {
    code: "EMPLOYEE",
    name: "Employee",
    description:
      "Baseline operational access for day-to-day business activities.",
    displayOrder: 30,
    isSystem: true,
    isActive: true,
  },
  {
    code: "MAKER",
    name: "Maker",
    description:
      "Workflow originator role for creating and submitting records requiring approval.",
    displayOrder: 40,
    isSystem: true,
    isActive: true,
  },
  {
    code: "CHECKER",
    name: "Checker",
    description:
      "Workflow approver role for reviewing, approving, or rejecting submissions.",
    displayOrder: 50,
    isSystem: true,
    isActive: true,
  },
  {
    code: "PLATFORM_ADMIN",
    name: "Platform Administrator",
    description:
      "InverBrass internal platform operations without default tenant business data access.",
    displayOrder: 900,
    isSystem: true,
    isActive: true,
  },
];

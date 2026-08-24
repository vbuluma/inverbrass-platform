/**
 * Purpose:
 * Central navigation registry for the InverBrass platform shell (IP-007).
 *
 * Design rationale:
 * All Build Packs inherit navigation from this config — modules must not
 * duplicate nav items locally.
 */
import {
  Building2Icon,
  CalculatorIcon,
  CalendarDaysIcon,
  CheckSquareIcon,
  ClockIcon,
  GitBranchIcon,
  HandshakeIcon,
  FileTextIcon,
  BarChart3Icon,
  LayersIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  PackageIcon,
  SettingsIcon,
  ShieldCheckIcon,
  StarIcon,
  TargetIcon,
  UsersIcon,
  UsersRoundIcon,
  LifeBuoyIcon,
} from "lucide-react";
import type { PlatformNavItem } from "@/lib/navigation/types";
export const PLATFORM_BRAND = {
  name: "InverBrass",
  tagline: "Digitalization Platform",
} as const;
/** Primary left navigation for authenticated business operations. */
export const BUSINESS_APP_NAV_ITEMS: PlatformNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    id: "parties",
    label: "Parties",
    href: "/parties",
    icon: UsersIcon,
  },
  {
    id: "groups",
    label: "Groups",
    href: "/groups",
    icon: UsersRoundIcon,
  },
  {
    id: "products",
    label: "Offerings",
    href: "/products",
    icon: PackageIcon,
  },
  {
    id: "customers",
    label: "Customers",
    href: "/customers",
    icon: HandshakeIcon,
  },
  {
    id: "leads",
    label: "Leads",
    href: "/leads",
    icon: TargetIcon,
  },
  {
    id: "opportunities",
    label: "Opportunities",
    href: "/opportunities",
    icon: GitBranchIcon,
  },
  {
    id: "accounts",
    label: "Accounts",
    href: "/accounts",
    icon: Building2Icon,
  },
  {
    id: "quotations",
    label: "Quotations",
    href: "/quotations",
    icon: FileTextIcon,
  },
  {
    id: "commercial-resolve",
    label: "Price a sale",
    href: "/commercial/resolve",
    icon: CalculatorIcon,
  },
  {
    id: "commercial-governance",
    label: "Commercial rules",
    href: "/commercial/governance",
    icon: ShieldCheckIcon,
  },
  {
    id: "tax-compliance",
    label: "Tax obligations",
    href: "/commercial/tax-compliance",
    icon: FileTextIcon,
  },
  {
    id: "campaigns",
    label: "Campaigns",
    href: "/campaigns",
    icon: MegaphoneIcon,
  },
  {
    id: "crm-analytics",
    label: "CRM Analytics",
    href: "/crm-analytics",
    icon: BarChart3Icon,
  },
  {
    id: "crm-activities",
    label: "Activities",
    href: "/crm/activities",
    icon: CheckSquareIcon,
  },
  {
    id: "crm-appointments",
    label: "Appointments",
    href: "/crm/appointments",
    icon: CalendarDaysIcon,
  },
  {
    id: "crm-visits",
    label: "Visits",
    href: "/crm/visits",
    icon: MapPinIcon,
  },
  {
    id: "crm-communications",
    label: "Communications",
    href: "/crm/communications",
    icon: MessageSquareIcon,
  },
  {
    id: "crm-cases",
    label: "Cases",
    href: "/crm/cases",
    icon: LifeBuoyIcon,
  },
  {
    id: "crm-governance",
    label: "CRM Governance",
    href: "/crm/governance",
    icon: ShieldCheckIcon,
  },
  {
    id: "solutions",
    label: "Solutions",
    icon: LayersIcon,
    placeholder: true,
  },
  {
    id: "favorites",
    label: "Favorites",
    icon: StarIcon,
    placeholder: true,
  },
  {
    id: "recent",
    label: "Recent Items",
    icon: ClockIcon,
    placeholder: true,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: SettingsIcon,
  },
];
export const PLACEHOLDER_MESSAGES: Record<string, string> = {
  solutions:
    "Industry Solutions (Property, Healthcare, Schools, and more) will appear here as Build Packs ship.",
  favorites: "Pin records and screens you use most — coming in a future release.",
  recent: "Recently viewed items will appear here — coming in a future release.",
  search: "Universal search across your business will be available here.",
  notifications: "Notifications and alerts will appear here.",
  help: "Help and guided support will be available here.",
  "register-business": "Register a new business from Platform Home after sign-in.",
  "back-home": "Public marketing home page — coming soon.",
  "switch-business-single":
    "You have one business. Create or join another to switch without signing out.",
  privacy: "Privacy policy will be published here.",
  terms: "Terms of service will be published here.",
  about:
    "InverBrass is a multi-industry digitalization platform for SMEs and growing organizations.",
};
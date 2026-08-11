/**
 * Purpose:
 * Central navigation registry for the InverBrass platform shell (IP-007).
 *
 * Design rationale:
 * All Build Packs inherit navigation from this config ΓÇö modules must not
 * duplicate nav items locally.
 */

import {
  Building2Icon,
  ClockIcon,
  GitBranchIcon,
  HandshakeIcon,
  LayersIcon,
  LayoutDashboardIcon,
  PackageIcon,
  SettingsIcon,
  StarIcon,
  TargetIcon,
  UsersIcon,
  UsersRoundIcon,
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
  favorites: "Pin records and screens you use most ΓÇö coming in a future release.",
  recent: "Recently viewed items will appear here ΓÇö coming in a future release.",
  search: "Universal search across your business will be available here.",
  notifications: "Notifications and alerts will appear here.",
  help: "Help and guided support will be available here.",
  "register-business": "Register a new business from Platform Home after sign-in.",
  "back-home": "Public marketing home page ΓÇö coming soon.",
  "switch-business-single":
    "You have one business. Create or join another to switch without signing out.",
  privacy: "Privacy policy will be published here.",
  terms: "Terms of service will be published here.",
  about:
    "InverBrass is a multi-industry digitalization platform for SMEs and growing organizations.",
};




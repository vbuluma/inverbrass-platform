/**
 * Purpose:
 * Central navigation registry for the InverBrass platform shell (IP-007 / NAV-001).
 *
 * Design rationale:
 * All Build Packs inherit navigation from this config — modules must not
 * duplicate nav items locally. Top-level entries are user-job hubs, not IPs.
 */
import {
  AlertTriangleIcon,
  ArchiveIcon,
  ArrowLeftRightIcon,
  BanknoteIcon,
  BarChart3Icon,
  BookmarkIcon,
  BoxesIcon,
  Building2Icon,
  CalculatorIcon,
  CalendarDaysIcon,
  CheckSquareIcon,
  ClipboardCheckIcon,
  ClockIcon,
  FileTextIcon,
  FolderTreeIcon,
  GitBranchIcon,
  GlobeIcon,
  HandshakeIcon,
  LayersIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  MapPinIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  PackageIcon,
  RulerIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  StarIcon,
  TargetIcon,
  TruckIcon,
  UsersIcon,
  UsersRoundIcon,
  WarehouseIcon,
} from "lucide-react";
import type { PlatformNavItem } from "@/lib/navigation/types";

export const PLATFORM_BRAND = {
  name: "InverBrass",
  tagline: "Digitalization Platform",
} as const;

export const PRIMARY_HUB_IDS = [
  "dashboard",
  "parties",
  "products",
  "crm",
  "sales",
  "payments",
  "inventory",
  "procurement",
  "settings",
] as const;

export const MOBILE_PRIMARY_NAV_IDS = [
  "dashboard",
  "crm",
  "sales",
  "payments",
] as const;

/** Primary left navigation for authenticated business operations. */
export const BUSINESS_APP_NAV_ITEMS: PlatformNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
    mobilePrimary: true,
  },
  {
    id: "parties",
    label: "Parties",
    href: "/parties",
    icon: UsersIcon,
    children: [
      {
        id: "groups",
        label: "Groups",
        href: "/groups",
        icon: UsersRoundIcon,
      },
    ],
  },
  {
    id: "products",
    label: "Offerings",
    href: "/products",
    icon: PackageIcon,
    children: [
      {
        id: "product-catalogue",
        label: "Catalogue",
        href: "/products/catalogue",
        icon: GlobeIcon,
      },
      {
        id: "product-classifications",
        label: "Classifications",
        href: "/products/classifications",
        icon: FolderTreeIcon,
      },
      {
        id: "product-units",
        label: "Units",
        href: "/products/units",
        icon: RulerIcon,
      },
      {
        id: "product-variants",
        label: "Variants",
        href: "/products/variants",
        icon: BoxesIcon,
      },
      {
        id: "product-bundles",
        label: "Bundles",
        href: "/products/bundles",
        icon: LayersIcon,
      },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    href: "/crm",
    icon: HandshakeIcon,
    mobilePrimary: true,
    children: [
      {
        id: "customers",
        label: "Customer Profile",
        href: "/customers",
        icon: HandshakeIcon,
      },
      {
        id: "crm-pipeline",
        label: "Pipeline",
        icon: GitBranchIcon,
        children: [
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
        ],
      },
      {
        id: "crm-engagement",
        label: "Engagement",
        icon: MessageSquareIcon,
        children: [
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
        ],
      },
      {
        id: "campaigns",
        label: "Campaigns",
        href: "/campaigns",
        icon: MegaphoneIcon,
      },
      {
        id: "crm-analytics",
        label: "Analytics",
        href: "/crm-analytics",
        icon: BarChart3Icon,
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    href: "/sales",
    icon: ShoppingCartIcon,
    mobilePrimary: true,
    children: [
      {
        id: "commercial-resolve",
        label: "Price a sale",
        href: "/commercial/resolve",
        icon: CalculatorIcon,
      },
      {
        id: "sales-convert-quote",
        label: "Convert quote",
        href: "/sales/convert-quote",
        icon: FileTextIcon,
      },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    href: "/payments",
    icon: BanknoteIcon,
    mobilePrimary: true,
    children: [
      {
        id: "invoices",
        label: "Invoices",
        href: "/invoices",
        icon: FileTextIcon,
      },
      {
        id: "receipts",
        label: "Receipts",
        href: "/receipts",
        icon: FileTextIcon,
      },
      {
        id: "payment-reviews",
        label: "Payment reviews",
        href: "/payments/exceptions",
        icon: ShieldCheckIcon,
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    href: "/inventory",
    icon: WarehouseIcon,
    children: [
      {
        id: "inventory-locations",
        label: "Locations",
        href: "/inventory/locations",
        icon: MapPinIcon,
      },
      {
        id: "inventory-operations",
        label: "Operations",
        icon: ArrowLeftRightIcon,
        children: [
          {
            id: "inventory-receive",
            label: "Receiving",
            href: "/inventory/receive",
            icon: PackageIcon,
          },
          {
            id: "inventory-opening-balances",
            label: "Opening balances",
            href: "/inventory/opening-balances",
            icon: ArchiveIcon,
          },
          {
            id: "inventory-transfers",
            label: "Transfers",
            href: "/inventory/transfers",
            icon: ArrowLeftRightIcon,
          },
          {
            id: "inventory-reservations",
            label: "Reservations",
            href: "/inventory/reservations",
            icon: BookmarkIcon,
          },
          {
            id: "inventory-adjustments",
            label: "Adjustments",
            href: "/inventory/adjustments",
            icon: ArchiveIcon,
          },
          {
            id: "inventory-stocktakes",
            label: "Stocktake",
            href: "/inventory/stocktakes",
            icon: ClipboardCheckIcon,
          },
        ],
      },
      {
        id: "inventory-controls-group",
        label: "Controls",
        icon: SlidersHorizontalIcon,
        children: [
          {
            id: "inventory-traceability",
            label: "Traceability",
            href: "/inventory/traceability",
            icon: ClipboardCheckIcon,
          },
          {
            id: "inventory-controls",
            label: "Inventory controls",
            href: "/inventory/controls",
            icon: SlidersHorizontalIcon,
          },
          {
            id: "inventory-exceptions",
            label: "Exceptions",
            href: "/inventory/exceptions",
            icon: AlertTriangleIcon,
          },
        ],
      },
    ],
  },
  {
    id: "procurement",
    label: "Procurement",
    href: "/procurement",
    icon: TruckIcon,
    children: [
      {
        id: "suppliers",
        label: "Suppliers",
        href: "/procurement/suppliers",
        icon: TruckIcon,
      },
      {
        id: "purchase-requests",
        label: "Purchase Requests",
        href: "/procurement/requests",
        icon: FileTextIcon,
      },
      {
        id: "procurement-sourcing",
        label: "Sourcing",
        icon: FileTextIcon,
        children: [
          {
            id: "procurement-rfx",
            label: "RFX",
            href: "/procurement/sourcing",
            icon: FileTextIcon,
          },
          {
            id: "procurement-evaluations",
            label: "Evaluations",
            href: "/procurement/sourcing/evaluations",
            icon: ClipboardCheckIcon,
          },
          {
            id: "procurement-awards",
            label: "Awards",
            href: "/procurement/sourcing/awards",
            icon: CheckSquareIcon,
          },
        ],
      },
      {
        id: "procurement-orders",
        label: "Purchase orders",
        href: "/procurement/orders",
        icon: FileTextIcon,
      },
      {
        id: "procurement-contracts",
        label: "Contracts",
        href: "/procurement/contracts",
        icon: FileTextIcon,
      },
      {
        id: "procurement-receiving",
        label: "Receiving",
        href: "/procurement/receiving",
        icon: FileTextIcon,
      },
      {
        id: "procurement-invoices",
        label: "Supplier invoices",
        href: "/procurement/invoices",
        icon: FileTextIcon,
      },
      {
        id: "procurement-exceptions",
        label: "Exceptions",
        href: "/procurement/exceptions",
        icon: FileTextIcon,
      },
      {
        id: "procurement-analytics",
        label: "Analytics",
        href: "/procurement/analytics",
        icon: FileTextIcon,
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: SettingsIcon,
    children: [
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
        id: "crm-governance",
        label: "CRM Governance",
        href: "/crm/governance",
        icon: ShieldCheckIcon,
      },
    ],
  },
  {
    id: "solutions",
    label: "Solutions",
    icon: LayersIcon,
    placeholder: true,
    utility: true,
  },
  {
    id: "favorites",
    label: "Favorites",
    icon: StarIcon,
    placeholder: true,
    utility: true,
  },
  {
    id: "recent",
    label: "Recent Items",
    icon: ClockIcon,
    placeholder: true,
    utility: true,
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

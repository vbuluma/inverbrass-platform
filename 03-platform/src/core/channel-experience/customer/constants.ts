/**
 * Purpose:
 * ENG-003o — Customer Web constants (SL-ENG-003o-002).
 *
 * Customer Web is a distinct presentation profile over channel WEB.
 * It must never inherit staff RBAC or staff business-context cookies.
 */

export const CUSTOMER_WEB_SESSION_COOKIE = "inverbrass-customer-web-session";

export const CUSTOMER_WEB_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  /** Scoped to storefront paths — never shared with staff workspace cookies. */
  path: "/store",
  /** 24h sliding window — rotation handled on bind/checkout. */
  maxAge: 60 * 60 * 24,
};

export const CUSTOMER_WEB_PRESENTATION_PROFILE = "CUSTOMER_WEB" as const;

/**
 * Explicit Customer Web permission grants — NOT staff ENG-002 codes.
 */
export const CUSTOMER_WEB_PERMISSIONS = {
  OFFERING_READ: "CustomerWeb.Offering.Read",
  PRICE_READ: "CustomerWeb.Price.Read",
  STOCK_READ: "CustomerWeb.Stock.Read",
  ORDER_CREATE: "CustomerWeb.Order.Create",
  ORDER_READ: "CustomerWeb.Order.Read",
  PAYMENT_CREATE: "CustomerWeb.Payment.Create",
  PAYMENT_READ: "CustomerWeb.Payment.Read",
  QUOTATION_CREATE: "CustomerWeb.Quotation.Create",
  QUOTATION_READ: "CustomerWeb.Quotation.Read",
  /** Authenticated-only foundation grant — account surface not implemented in this slice. */
  ACCOUNT_READ: "CustomerWeb.Account.Read",
} as const;

export type CustomerWebPermission =
  (typeof CUSTOMER_WEB_PERMISSIONS)[keyof typeof CUSTOMER_WEB_PERMISSIONS];

/** Guest grant set for browse → checkout / quotation MVP path. */
export const CUSTOMER_WEB_GUEST_GRANTS: readonly CustomerWebPermission[] = [
  CUSTOMER_WEB_PERMISSIONS.OFFERING_READ,
  CUSTOMER_WEB_PERMISSIONS.PRICE_READ,
  CUSTOMER_WEB_PERMISSIONS.STOCK_READ,
  CUSTOMER_WEB_PERMISSIONS.ORDER_CREATE,
  CUSTOMER_WEB_PERMISSIONS.ORDER_READ,
  CUSTOMER_WEB_PERMISSIONS.PAYMENT_CREATE,
  CUSTOMER_WEB_PERMISSIONS.PAYMENT_READ,
  CUSTOMER_WEB_PERMISSIONS.QUOTATION_CREATE,
  CUSTOMER_WEB_PERMISSIONS.QUOTATION_READ,
];

/**
 * Deny-by-default allow-list of ENG-003o capability IDs for Customer Web.
 * Staff workspace and operational capabilities are never listed here.
 */
export const CUSTOMER_WEB_CAPABILITY_ALLOW_LIST = [
  "OFFERING_VIEW",
  "PRICE_QUERY",
  "STOCK_AVAILABILITY_QUERY",
  "CREATE_SALE",
  "INITIATE_PAYMENT",
  "VIEW_ORDER",
  "VIEW_PAYMENT_STATUS",
  "CREATE_QUOTATION",
  "VIEW_QUOTATION",
  "CUSTOMER_ACCOUNT_VIEW",
] as const;

export type CustomerWebCapabilityId =
  (typeof CUSTOMER_WEB_CAPABILITY_ALLOW_LIST)[number];

export const CUSTOMER_WEB_CAPABILITY_PERMISSION: Record<
  CustomerWebCapabilityId,
  CustomerWebPermission
> = {
  OFFERING_VIEW: CUSTOMER_WEB_PERMISSIONS.OFFERING_READ,
  PRICE_QUERY: CUSTOMER_WEB_PERMISSIONS.PRICE_READ,
  STOCK_AVAILABILITY_QUERY: CUSTOMER_WEB_PERMISSIONS.STOCK_READ,
  CREATE_SALE: CUSTOMER_WEB_PERMISSIONS.ORDER_CREATE,
  INITIATE_PAYMENT: CUSTOMER_WEB_PERMISSIONS.PAYMENT_CREATE,
  VIEW_ORDER: CUSTOMER_WEB_PERMISSIONS.ORDER_READ,
  VIEW_PAYMENT_STATUS: CUSTOMER_WEB_PERMISSIONS.PAYMENT_READ,
  CREATE_QUOTATION: CUSTOMER_WEB_PERMISSIONS.QUOTATION_CREATE,
  VIEW_QUOTATION: CUSTOMER_WEB_PERMISSIONS.QUOTATION_READ,
  CUSTOMER_ACCOUNT_VIEW: CUSTOMER_WEB_PERMISSIONS.ACCOUNT_READ,
};

/** Capabilities that require an authenticated customer (not guest). */
export const CUSTOMER_WEB_AUTHENTICATED_ONLY_CAPABILITIES: readonly string[] = [
  "CUSTOMER_ACCOUNT_VIEW",
];

/**
 * CREATE_SALE idempotency contract key namespace for Customer Web.
 */
export const CUSTOMER_WEB_SALE_IDEMPOTENCY_NAMESPACE = "customer-web:create-sale";

/** CREATE_QUOTATION idempotency contract key namespace for Customer Web. */
export const CUSTOMER_WEB_QUOTATION_IDEMPOTENCY_NAMESPACE =
  "customer-web:create-quotation";

/** INITIATE_PAYMENT (pay-later) channel request key namespace for Customer Web. */
export const CUSTOMER_WEB_PAYMENT_IDEMPOTENCY_NAMESPACE =
  "customer-web:initiate-payment";

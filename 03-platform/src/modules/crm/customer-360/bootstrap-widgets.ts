/**
 * Purpose:
 * Bootstrap Customer 360 widget loaders contributed by CRM IPs.
 *
 * Import this module once during CRM service initialisation so loaders
 * register before composition runs.
 */

import "@/modules/crm/customer-360/widget-registry";
import "@/modules/crm/customer-360/widgets/register-lead-widget";
import "@/modules/crm/customer-360/widgets/register-open-opportunities-widget";
import "@/modules/crm/customer-360/widgets/register-account-hierarchy-widget";

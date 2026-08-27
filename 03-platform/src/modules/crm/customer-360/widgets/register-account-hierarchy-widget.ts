/**
 * Purpose:
 * Register IP-04 Account Hierarchy widget for Customer 360.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
 */

import { registerCustomer360WidgetLoader } from "@/modules/crm/customer-360/widget-registry";
import { createAccountService } from "@/modules/crm/account/services/account-service";

registerCustomer360WidgetLoader(
  "account-hierarchy",
  async ({ businessContext, customer }) => {
    const accountService = createAccountService();
    const summary = await accountService.getAccountHierarchyWidgetSummary(
      businessContext,
      customer.partyId
    );

    if (!summary) {
      return null;
    }

    return {
      id: "account-hierarchy",
      sourceIp: "IP-04",
      title: "Account Hierarchy",
      label: "Accounts",
      value: String(summary.accountCount),
      hint: summary.primaryAccount
        ? `${summary.primaryAccount.name}${
            summary.primaryContactName
              ? ` · ${summary.primaryContactName}`
              : ""
          }${summary.childCount > 0 ? ` · ${summary.childCount} children` : ""}`
        : undefined,
      status: "default",
      href: summary.primaryAccount
        ? `/accounts/${summary.primaryAccount.accountId}`
        : "/accounts",
    };
  }
);

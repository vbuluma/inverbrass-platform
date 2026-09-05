/**
 * Purpose:
 * Bootstrap Customer Web guest session cookie for /store/[businessCode].
 * Must run from a Server Action (cookies().set allowed).
 */

"use server";

import {
  createCustomerWebSessionPayload,
  getCustomerWebSessionFromCookie,
  rotateCustomerWebSession,
  setCustomerWebSessionCookie,
  clearCustomerWebSessionCookie,
} from "@/core/channel-experience/customer/guest-session";
import {
  assertSessionMatchesTenant,
  resolveCustomerTenantByBusinessCode,
} from "@/core/channel-experience/customer/tenant-resolution";
import { toCustomerSafeBusinessSummary } from "@/core/channel-experience/customer/dto";

export type BootstrapCustomerWebSessionResult =
  | {
      ok: true;
      store: ReturnType<typeof toCustomerSafeBusinessSummary>;
      sessionId: string;
      rotated: boolean;
    }
  | { ok: false; error: string };

/**
 * WHAT: Ensure a guest session bound to the URL-resolved tenant.
 * WHY: Session fixation protection rotates when re-entering a store after auth events.
 */
export async function bootstrapCustomerWebSessionAction(
  businessCode: string,
  options?: { rotate?: boolean }
): Promise<BootstrapCustomerWebSessionResult> {
  try {
    const tenant = await resolveCustomerTenantByBusinessCode(businessCode);
    const existing = await getCustomerWebSessionFromCookie();

    if (existing) {
      assertSessionMatchesTenant(
        existing.businessId,
        existing.businessCode,
        tenant
      );

      if (options?.rotate) {
        const rotated = await rotateCustomerWebSession(existing);
        return {
          ok: true,
          store: toCustomerSafeBusinessSummary(tenant),
          sessionId: rotated.sessionId,
          rotated: true,
        };
      }

      return {
        ok: true,
        store: toCustomerSafeBusinessSummary(tenant),
        sessionId: existing.sessionId,
        rotated: false,
      };
    }

    const session = createCustomerWebSessionPayload({
      businessId: tenant.businessId,
      businessCode: tenant.businessCode,
    });
    await setCustomerWebSessionCookie(session);

    return {
      ok: true,
      store: toCustomerSafeBusinessSummary(tenant),
      sessionId: session.sessionId,
      rotated: false,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Store not available.",
    };
  }
}

export async function endCustomerWebSessionAction(): Promise<void> {
  await clearCustomerWebSessionCookie();
}

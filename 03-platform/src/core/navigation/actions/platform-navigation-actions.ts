/**
 * Purpose:
 * Platform navigation server actions — sign out with redirect (IP-007).
 */

"use server";

import { redirect } from "next/navigation";

import { logoutAction } from "@/core/auth/actions/auth-actions";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";

export async function signOutAndRedirectAction(): Promise<void> {
  try {
    await logoutAction();
    redirect("/login");
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    redirect("/login");
  }
}

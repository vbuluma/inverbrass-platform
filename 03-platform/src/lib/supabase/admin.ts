/**
 * Purpose:
 * Provide a Supabase admin client for privileged auth operations outside user sessions.
 *
 * Business Context:
 * Password recovery must reset credentials without an active login session, which requires
 * the service role key per AD-009 §3.7.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Create a Supabase client authenticated with the service role key
 *
 * Non-Responsibilities:
 * - Session management for authenticated users
 * - Business logic orchestration
 *
 * Dependencies:
 * - @supabase/supabase-js
 * - SUPABASE_SERVICE_ROLE_KEY environment variable
 *
 * Business Rules Implemented:
 * - AD-009 §3.7 — admin password update during recovery
 *
 * Extension Points:
 * - Additional admin-only auth operations may reuse this client
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin credentials are not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

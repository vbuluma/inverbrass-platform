import { createClient } from "@/lib/supabase/server";

import {
  AUTH_ERROR_CODES,
  AUTH_USER_MESSAGES,
  AuthError,
} from "@/core/auth/errors";
import type {
  IdentityProviderAdapter,
  IdentityProviderSignInInput,
  IdentityProviderUser,
} from "@/core/auth/adapters/identity-provider-adapter";

function mapProviderError(errorMessage: string): AuthError {
  const normalized = errorMessage.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return new AuthError(
      AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      AUTH_USER_MESSAGES.INVALID_CREDENTIALS,
      401
    );
  }

  return new AuthError(
    AUTH_ERROR_CODES.PROVIDER_ERROR,
    AUTH_USER_MESSAGES.PROVIDER_ERROR,
    502
  );
}

export class SupabaseIdentityProviderAdapter
  implements IdentityProviderAdapter
{
  async signInWithPassword(
    input: IdentityProviderSignInInput
  ): Promise<{ authUserId: string; session: NonNullable<Awaited<ReturnType<IdentityProviderAdapter["getSession"]>>> }> {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.authEmailAlias,
      password: input.password,
    });

    if (error || !data.user || !data.session) {
      throw mapProviderError(error?.message ?? "Sign in failed.");
    }

    return {
      authUserId: data.user.id,
      session: data.session,
    };
  }

  async signOut(): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw mapProviderError(error.message);
    }
  }

  async getSession() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw mapProviderError(error.message);
    }

    return data.session;
  }

  async getUser(): Promise<IdentityProviderUser | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      throw mapProviderError(error.message);
    }

    if (!data.user) {
      return null;
    }

    return {
      authUserId: data.user.id,
      metadata: (data.user.user_metadata ?? {}) as Record<string, unknown>,
    };
  }

  async updatePassword(newPassword: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw mapProviderError(error.message);
    }
  }
}

export function createIdentityProviderAdapter(): IdentityProviderAdapter {
  return new SupabaseIdentityProviderAdapter();
}

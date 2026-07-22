import type { Session } from "@supabase/supabase-js";

export type IdentityProviderSignInInput = {
  authEmailAlias: string;
  password: string;
};

export type IdentityProviderSignUpInput = {
  authEmailAlias: string;
  password: string;
  metadata?: Record<string, unknown>;
};

export type IdentityProviderUser = {
  authUserId: string;
  metadata: Record<string, unknown>;
};

export interface IdentityProviderAdapter {
  signUp(
    input: IdentityProviderSignUpInput
  ): Promise<{ authUserId: string; session: Session | null }>;
  signInWithPassword(
    input: IdentityProviderSignInInput
  ): Promise<{ authUserId: string; session: Session }>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  getUser(): Promise<IdentityProviderUser | null>;
  updatePassword(newPassword: string): Promise<void>;
}

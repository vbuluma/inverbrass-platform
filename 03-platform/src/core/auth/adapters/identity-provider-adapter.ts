import type { Session } from "@supabase/supabase-js";

export type IdentityProviderSignInInput = {
  authEmailAlias: string;
  password: string;
};

export type IdentityProviderUser = {
  authUserId: string;
  metadata: Record<string, unknown>;
};

export interface IdentityProviderAdapter {
  signInWithPassword(
    input: IdentityProviderSignInInput
  ): Promise<{ authUserId: string; session: Session }>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  getUser(): Promise<IdentityProviderUser | null>;
  updatePassword(newPassword: string): Promise<void>;
}

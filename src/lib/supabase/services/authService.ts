import { getSupabaseClient } from '../client';
import type { User, Session } from '@supabase/supabase-js';

export const authService = {
  async signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
    const client = getSupabaseClient();
    if (!client) {
      return { user: null, session: null, error: new Error('Supabase is not configured') };
    }
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    return {
      user: data.user,
      session: data.session,
      error: error ? new Error(error.message) : null,
    };
  },

  async signInWithGoogle(): Promise<{ error: Error | null; url?: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { error: new Error('Supabase is not configured') };
    }

    try {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null, url: data?.url ?? undefined };
    } catch (err: any) {
      return { error: new Error(err.message || 'Failed to initiate Google sign-in') };
    }
  },

  async signUp(email: string, password: string, fullName: string): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
    const client = getSupabaseClient();
    if (!client) {
      return { user: null, session: null, error: new Error('Supabase is not configured') };
    }
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return {
      user: data.user,
      session: data.session,
      error: error ? new Error(error.message) : null,
    };
  },

  async signOut(): Promise<{ error: Error | null }> {
    const client = getSupabaseClient();
    if (!client) return { error: null };
    const { error } = await client.auth.signOut();
    return { error: error ? new Error(error.message) : null };
  },

  async getSession(): Promise<Session | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session;
  },

  async getCurrentUser(): Promise<User | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data.user;
  },

  onAuthStateChange(callback: (session: Session | null) => void): (() => void) {
    const client = getSupabaseClient();
    if (!client) {
      return () => {};
    }
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return () => {
      subscription.unsubscribe();
    };
  },

  async ensureUserAccount(user: User): Promise<string> {
    const client = getSupabaseClient();
    if (!client) return user.id;

    try {
      const { data: existingAccount } = await client
        .from('accounts')
        .select('id, full_name, email')
        .eq('id', user.id)
        .maybeSingle();

      if (existingAccount) {
        return existingAccount.id;
      }

      // Create new account row for Google OAuth user
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Atrium Owner';

      await client.from('accounts').insert({
        id: user.id,
        email: user.email || `${user.id}@atrium.cloud`,
        full_name: fullName,
        is_active: true,
      });

      return user.id;
    } catch (err) {
      console.warn('[authService] ensureUserAccount fallback:', err);
      return user.id;
    }
  },
};

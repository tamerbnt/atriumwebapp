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
};

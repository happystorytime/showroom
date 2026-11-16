import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, requireSupabase, supabase } from './supabaseClient';
import { classifyAuthError } from './pureCalculations';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

let cachedProviderToken: string | null = null;

function mapSupabaseUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const displayName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    user.email?.split('@')[0] ||
    null;

  return {
    uid: user.id,
    email: user.email || null,
    displayName,
  };
}

function captureSessionToken(session: Session | null) {
  if (session?.provider_token) {
    cachedProviderToken = session.provider_token;
  } else if (!session) {
    cachedProviderToken = null;
  }
}

export const initAuth = (
  onAuthChange: (user: AuthUser | null, token: string | null) => void
) => {
  if (!isSupabaseConfigured || !supabase) {
    onAuthChange(null, null);
    return () => {};
  }

  let active = true;

  supabase.auth
    .getSession()
    .then(({ data }) => {
      if (!active) return;
      captureSessionToken(data.session);
      onAuthChange(mapSupabaseUser(data.session?.user || null), cachedProviderToken);
    })
    .catch(() => {
      if (!active) return;
      onAuthChange(null, null);
    });

  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    captureSessionToken(session);
    onAuthChange(mapSupabaseUser(session?.user || null), cachedProviderToken);
  });

  return () => {
    active = false;
    sub.subscription.unsubscribe();
  };
};

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<AuthUser> => {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    throw new Error(error.message || 'Invalid email or password.');
  }
  const mapped = mapSupabaseUser(data.user);
  if (!mapped) {
    throw new Error('Authentication succeeded without a valid user profile.');
  }
  return mapped;
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  fullName?: string
): Promise<{ user: AuthUser | null; needsEmailConfirmation: boolean }> => {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: fullName?.trim() ? { full_name: fullName.trim() } : undefined,
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  if (error) {
    throw new Error(error.message || 'Could not create account.');
  }
  return {
    user: mapSupabaseUser(data.user),
    needsEmailConfirmation: !data.session,
  };
};

export const googleSignIn = async (): Promise<{
  user: AuthUser | null;
  accessToken: string | null;
} | null> => {
  const client = requireSupabase();
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });
  if (error) {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const info = classifyAuthError(error, hostname);
    if (info.isUserCancelled) return null;
    throw new Error(info.message);
  }
  return null;
};

export const googleSheetsSignIn = async (): Promise<{
  user: AuthUser | null;
  accessToken: string | null;
} | null> => {
  const client = requireSupabase();
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) {
    throw new Error(error.message || 'Google Workspace OAuth authorization failed.');
  }
  return null;
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedProviderToken) return cachedProviderToken;
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  captureSessionToken(data.session);
  return cachedProviderToken;
};

export const logout = async () => {
  if (supabase) {
    await supabase.auth.signOut();
  }
  cachedProviderToken = null;
};

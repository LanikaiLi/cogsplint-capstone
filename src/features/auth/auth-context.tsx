import type { AuthError, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

// Result of sign up / log in. `message` is always readable English for the user.
export type AuthResult = { ok: true; message?: string } | { ok: false; message: string };

type AuthContextValue = {
  session: Session | null;
  // True until we know whether a saved session exists on this phone.
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  logIn: (email: string, password: string) => Promise<AuthResult>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return value;
}

// Turn a Supabase error into a message a person can understand.
function readableError(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'That email or password does not look right. Please try again.';
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with this email already exists. Try logging in instead.';
    case 'weak_password':
      return 'Please choose a longer password (at least 6 characters).';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Please enter a valid email address.';
    case 'email_not_confirmed':
      return 'Please confirm your email first, then log in.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many attempts. Please wait a little and try again.';
    default:
      // Network problems have no code. Supabase names them AuthRetryableFetchError.
      if (error.name === 'AuthRetryableFetchError') {
        return 'Could not reach the server. Please check your connection.';
      }
      return 'Something went wrong. Please try again.';
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load the session saved on this phone (if any), then listen for changes.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    // Only refresh the login token while the app is on screen.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    supabase.auth.startAutoRefresh();

    return () => {
      listener.subscription.unsubscribe();
      appStateSub.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  async function signUp(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { ok: false, message: readableError(error) };
    }
    // When "Confirm email" is on, Supabase hides duplicates: no error, but no identities.
    if (data.user && data.user.identities?.length === 0) {
      return { ok: false, message: readableError({ code: 'user_already_exists' } as AuthError) };
    }
    // No session means the user must confirm their email before logging in.
    if (!data.session) {
      return { ok: true, message: 'Account created. Please check your email to confirm it, then log in.' };
    }
    return { ok: true };
  }

  async function logIn(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { ok: false, message: readableError(error) };
    }
    return { ok: true };
  }

  async function logOut() {
    await supabase.auth.signOut();
    // Forget the saved task list so the next person to log in never sees it.
    queryClient.clear();
  }

  return (
    <AuthContext.Provider value={{ session, isLoading, signUp, logIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

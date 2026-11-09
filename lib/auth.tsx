"use client";

import * as React from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AuthUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  authReady: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ verificationRequired: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

function mapSupabaseUser(user: SupabaseUser): AuthUser {
  return {
    id: user.id,
    name:
      (user.user_metadata.name as string | undefined) ??
      user.email?.split("@")[0] ??
      "User",
    email: user.email ?? "",
    createdAt: user.created_at,
    bio: user.user_metadata.bio as string | undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = React.useState(!isSupabaseConfigured);
  const [authError, setAuthError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setUser(null);
          setAuthError(error.message);
        } else {
          setUser(data.session?.user ? mapSupabaseUser(data.session.user) : null);
          setAuthError(null);
        }
        setAuthReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setUser(null);
        setAuthError(
          error instanceof Error ? error.message : "Unable to verify your session."
        );
        setAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ? mapSupabaseUser(session.user) : null);
      setAuthError(null);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error(
        "Supabase is not configured. Add its URL and anon key to .env.local."
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error("Supabase did not return a signed-in user.");
    setUser(mapSupabaseUser(data.user));
    setAuthError(null);
    setAuthReady(true);
  }, []);

  const signUp = React.useCallback(
    async (name: string, email: string, password: string) => {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error(
          "Supabase is not configured. Add its URL and anon key to .env.local."
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name.trim() } },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Supabase did not create an account.");
      if (!data.session) {
        return { verificationRequired: true };
      }
      setUser(mapSupabaseUser(data.user));
      setAuthError(null);
      setAuthReady(true);
      return { verificationRequired: false };
    },
    []
  );

  const signOut = React.useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setUser(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setAuthError(null);
  }, []);

  const updateProfile = React.useCallback(async (patch: Partial<AuthUser>) => {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error(
        "Supabase is not configured. Add its URL and anon key to .env.local."
      );
    }

    const metadata: Record<string, string> = {};
    if (patch.name !== undefined) metadata.name = patch.name;
    if (patch.bio !== undefined) metadata.bio = patch.bio;
    const { data, error } = await supabase.auth.updateUser({ data: metadata });
    if (error) throw error;
    if (!data.user) throw new Error("Supabase did not return the updated user.");
    setUser(mapSupabaseUser(data.user));
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      authReady,
      authError,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }),
    [user, authReady, authError, signIn, signUp, signOut, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

export { isSupabaseConfigured };

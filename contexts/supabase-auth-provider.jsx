"use client";

import { useCallback } from "react";
import {
  useSessionContext,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";

export function useSupabaseAuth() {
  const { session, isLoading, error } = useSessionContext();
  const supabase = useSupabaseClient();
  const user = session?.user ?? null;

  const signIn = useCallback(
    async (email, password) => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        throw signInError;
      }
    },
    [supabase]
  );

  const signUp = useCallback(
    async (payload) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Registration failed" }));
        throw new Error(data.error ?? "Registration failed");
      }
    },
    []
  );

  const signInWithOAuth = useCallback(
    async (provider) => {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/redirect`,
        },
      });
      if (oauthError) {
        throw oauthError;
      }
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      throw signOutError;
    }
  }, [supabase]);

  const getAccessToken = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    return currentSession?.access_token ?? null;
  }, [supabase]);

  return {
    supabase,
    session,
    user,
    isLoading,
    error,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    getAccessToken,
  };
}

"use client";

import { useMemo } from "react";

import { useSupabaseAuth } from "../../../contexts/supabase-auth-provider";
import CorpLogin from "./CorpLogin";
import LoadingState from "./LoadingState";

export default function AuthGate({ children }) {
  const { session, user, isLoading, error } = useSupabaseAuth();
  const certificationParam = null; // No longer needed for client-side redirection

  const access = useMemo(() => {
    if (!user) {
      return { role: null, category: null };
    }

    const role = user?.user_metadata?.role ?? null;
    const category = user?.user_metadata?.category ?? null;

    return { role, category };
  }, [user]);

  if (isLoading) {
    return <LoadingState message="Checking authentication" />;
  }

  if (!session) {
    return <CorpLogin error={error} />;
  }

  return children;
}

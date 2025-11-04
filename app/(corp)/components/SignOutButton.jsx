"use client";

import { useState } from "react";
import { useSupabaseAuth } from "../../../contexts/supabase-auth-provider";

export default function SignOutButton() {
  const { signOut, isLoading } = useSupabaseAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut || isLoading) return;

    try {
      setSigningOut(true);
      await signOut();
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={signingOut || isLoading}
      className="w-full rounded-lg border border-nuanu-beige-light/50 bg-nuanu-beige-light/90 px-3 py-2 text-xs font-semibold text-nuanu-green-dark shadow-sm transition hover:border-destructive/60 hover:bg-nuanu-beige-light hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
    >
      {signingOut || isLoading ? "Signing out…" : "Sign out"}
    </button>
  );
}

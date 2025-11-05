"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "../../../contexts/supabase-auth-provider";
import LoadingState from "../components/LoadingState";

export default function RedirectPage() {
  const router = useRouter();
  const { user, session, isLoading } = useSupabaseAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!session || !user) {
      // Not logged in, stay on login page (handled by AuthGate)
      return;
    }

    // Redirect based on user role from metadata
    const role = user.user_metadata?.role;

    if (role === "admin") {
      router.replace("/admin");
    } else if (role === "employee") {
      router.replace("/employee");
    } else {
      // No role assigned, show error
      console.error("User has no role assigned:", user.email);
      router.replace("/employee"); // Default to employee
    }
  }, [isLoading, session, user, router]);

  return <LoadingState message="Redirecting..." />;
}

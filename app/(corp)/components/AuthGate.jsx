"use client";

import { useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { useSupabaseAuth } from "../../../contexts/supabase-auth-provider";
import CorpLogin from "./CorpLogin";
import LoadingState from "./LoadingState";

const ADMIN_PREFIX = "/admin";
const EMPLOYEE_PREFIX = "/employee";
const QUIZ_PREFIX = "/quiz";

const ADMIN_ROLE = "admin";
const EMPLOYEE_ROLE = "employee";

const EMPLOYEE_CATEGORY_TO_CERT = {
  sales: "sales-cert",
  hostess: "hostess-cert",
};

export default function AuthGate({ children }) {
  const { session, user, isLoading, error } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const certificationParam = searchParams?.get("certification") ?? null;

  const access = useMemo(() => {
    if (!user) {
      return { role: null, category: null };
    }

    const role = user?.user_metadata?.role ?? null;
    const category = user?.user_metadata?.category ?? null;

    return { role, category };
  }, [user]);

  useEffect(() => {
    if (isLoading) return;
    
    if (!session) return;

    const { role, category } = access;

    if (!role) {
      console.warn("User has no role assigned");
      // Don't redirect to /corp/redirect - stay and show login
      return;
    }

    const isAdmin = role === ADMIN_ROLE;
    const isEmployee = role === EMPLOYEE_ROLE;

    const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
    const isEmployeeRoute = pathname.startsWith(EMPLOYEE_PREFIX);
    const isQuizRoute = pathname.startsWith(QUIZ_PREFIX);
    const isRedirectRoute = pathname === "/corp/redirect";

    // Handle redirect page - send to proper destination
    if (isRedirectRoute) {
      if (isAdmin) {
        router.replace("/admin");
        return;
      }
      if (isEmployee) {
        router.replace("/employee");
        return;
      }
      return;
    }

    if (isAdmin) {
      if (isEmployeeRoute || isQuizRoute) {
        router.replace("/admin");
        return;
      }
      return;
    }

    if (isEmployee) {
      if (isAdminRoute) {
        router.replace("/employee");
        return;
      }

      if (isEmployeeRoute || isQuizRoute) {
        // Employee is on allowed route, let them stay
        if (isQuizRoute) {
          const allowed = EMPLOYEE_CATEGORY_TO_CERT[category ?? ""];
          if (!allowed || certificationParam !== allowed) {
            router.replace("/employee");
            return;
          }
        }
        return;
      }

      // Only redirect if not already on an employee route
      router.replace("/employee");
      return;
    }

    console.warn("Unknown role:", role);
  }, [session, access, isLoading, pathname, router, certificationParam]);

  if (isLoading) {
    return <LoadingState message="Checking authentication" />;
  }

  if (!session) {
    return <CorpLogin error={error} />;
  }

  return children;
}

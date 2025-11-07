import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (videos, etc.)
     * This also excludes all files in the api folder.
     * Match everything else, including root
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*..*).*)",
  ],
};

const PUBLIC_FILE_ASSETS = ["/icons", "/images", "/videos", "/logo.jpg"]; // Add any other public asset paths here

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // Define routes that are always public, even if a session exists
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/api/auth/callback",
    "/api/auth/register",
    "/reset-password",
    "/forgot-password",
  ];

  // Define protected prefixes (any route starting with these needs authentication)
  const protectedPrefixes = ["/admin", "/employee", "/quiz"];

  const isPublicRoute = publicRoutes.includes(pathname);
  const isProtectedPrefix = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isPublicAsset = PUBLIC_FILE_ASSETS.some((asset) =>
    pathname.startsWith(asset)
  );

  // Allow access to public assets
  if (isPublicAsset) {
    return res;
  }

  // Case 1: No session
  if (!session) {
    // Allow access to explicitly public routes
    if (isPublicRoute) {
      return res;
    }

    // Allow access to quiz if certification parameter is present, even if not logged in
    if (
      pathname.startsWith("/quiz") &&
      req.nextUrl.searchParams.has("certification")
    ) {
      return res;
    }

    // For any other protected route without a session, redirect to login
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Case 2: Session exists
  const userRole = session.user.user_metadata?.role as string | undefined;
  const userCategory = session.user.user_metadata?.category as
    | string
    | undefined;

  // If already logged in, redirect from login/signup pages to their dashboard
  if (pathname === "/login" || pathname === "/signup") {
    return NextResponse.redirect(new URL("/employee", req.nextUrl.origin));
  }

  // Role-based authorization
  if (userRole === "admin") {
    // Admin can access admin routes
    if (pathname.startsWith("/admin")) {
      return res;
    }
    // Admin cannot access employee or quiz routes directly, redirect to admin dashboard
    if (pathname.startsWith("/employee") || pathname.startsWith("/quiz")) {
      return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
    }
  } else if (userRole === "employee") {
    // Employee can access employee routes
    if (pathname.startsWith("/employee")) {
      return res;
    }
    // Employee can access quiz routes, but with specific certification validation
    if (pathname.startsWith("/quiz")) {
      const certificationParam = req.nextUrl.searchParams.get("certification");
      const EMPLOYEE_CATEGORY_TO_CERT: { [key: string]: string } = {
        sales: "sales-cert",
        hostess: "hostess-cert",
      };
      const allowedCert = EMPLOYEE_CATEGORY_TO_CERT[userCategory as string];

      if (allowedCert && certificationParam === allowedCert) {
        return res; // Employee is allowed to take this specific quiz
      } else {
        // Not allowed to take this quiz, redirect to employee dashboard
        return NextResponse.redirect(new URL("/employee", req.nextUrl.origin));
      }
    }
    // Employee cannot access admin routes, redirect to employee dashboard
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/employee", req.nextUrl.origin));
    }
  } else {
    // If user has a session but no assigned role or an unknown role
    if (!userRole) {
      console.warn(
        "Middleware: User with session has no assigned role or unknown role:",
        session.user.email
      );
      return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
    }
  }

  return res;
}

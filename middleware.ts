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

  console.log("Middleware: Pathname:", pathname); // Added log
  console.log("Middleware: Session exists:", !!session); // Added log

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
    console.log("Middleware: Public asset, allowing access."); // Added log
    return res;
  }

  // Case 1: No session
  if (!session) {
    console.log("Middleware: No session found."); // Added log
    // Allow access to explicitly public routes
    if (isPublicRoute) {
      console.log("Middleware: Public route without session, allowing access."); // Added log
      return res;
    }

    // Allow access to quiz if certification parameter is present, even if not logged in
    if (
      pathname.startsWith("/quiz") &&
      req.nextUrl.searchParams.has("certification")
    ) {
      console.log(
        "Middleware: Quiz route with certification param without session, allowing access."
      ); // Added log
      return res;
    }

    // For any other protected route without a session, redirect to login
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("redirectedFrom", pathname);
    console.log(
      "Middleware: No session on protected route, redirecting to login:",
      loginUrl.toString()
    ); // Added log
    return NextResponse.redirect(loginUrl);
  }

  // Case 2: Session exists
  console.log("Middleware: Session exists."); // Added log
  const role = session.user.user_metadata?.role;
  const category = session.user.user_metadata?.category;
  console.log("Middleware: User role:", role, "category:", category); // Added log

  // If already logged in, redirect from login/signup pages to their dashboard
  if (pathname === "/login" || pathname === "/signup") {
    console.log("Middleware: Authenticated user on login/signup page."); // Added log
    if (role === "admin") {
      console.log("Middleware: Admin on login/signup, redirecting to /admin."); // Added log
      return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
    } else if (role === "employee") {
      console.log(
        "Middleware: Employee on login/signup, redirecting to /employee."
      ); // Added log
      return NextResponse.redirect(new URL("/employee", req.nextUrl.origin));
    }
  }

  // Role-based authorization
  if (role === "admin") {
    console.log("Middleware: User is admin."); // Added log
    // Admin can access admin routes
    if (pathname.startsWith("/admin")) {
      console.log("Middleware: Admin accessing admin route, allowing access."); // Added log
      return res;
    }
    // Admin cannot access employee or quiz routes directly, redirect to admin dashboard
    if (pathname.startsWith("/employee") || pathname.startsWith("/quiz")) {
      console.log(
        "Middleware: Admin accessing employee/quiz route, redirecting to /admin."
      ); // Added log
      return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
    }
  } else if (role === "employee") {
    console.log("Middleware: User is employee."); // Added log
    // Employee can access employee routes
    if (pathname.startsWith("/employee")) {
      console.log(
        "Middleware: Employee accessing employee route, allowing access."
      ); // Added log
      return res;
    }
    // Employee can access quiz routes, but with specific certification validation
    if (pathname.startsWith("/quiz")) {
      console.log("Middleware: Employee accessing quiz route."); // Added log
      const certificationParam = req.nextUrl.searchParams.get("certification");
      const EMPLOYEE_CATEGORY_TO_CERT: { [key: string]: string } = {
        sales: "sales-cert",
        hostess: "hostess-cert",
      };
      const allowedCert = EMPLOYEE_CATEGORY_TO_CERT[category as string];

      if (allowedCert && certificationParam === allowedCert) {
        console.log(
          "Middleware: Employee allowed to take this specific quiz, allowing access."
        ); // Added log
        return res; // Employee is allowed to take this specific quiz
      } else {
        // Not allowed to take this quiz, redirect to employee dashboard
        console.log(
          "Middleware: Employee not allowed to take this quiz, redirecting to /employee."
        ); // Added log
        return NextResponse.redirect(new URL("/employee", req.nextUrl.origin));
      }
    }
    // Employee cannot access admin routes, redirect to employee dashboard
    if (pathname.startsWith("/admin")) {
      console.log(
        "Middleware: Employee accessing admin route, redirecting to /employee."
      ); // Added log
      return NextResponse.redirect(new URL("/employee", req.nextUrl.origin));
    }
  } else {
    // User has a session but no assigned role or an unknown role
    // This could happen if user_metadata is not properly set.
    console.warn(
      "Middleware: User with session has no assigned role or unknown role:",
      session.user.email
    ); // Added log
    // Redirect to login or a default safe page
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  console.log(
    "Middleware: No specific redirection/authorization rule hit, allowing access."
  ); // Added log
  return res;
}

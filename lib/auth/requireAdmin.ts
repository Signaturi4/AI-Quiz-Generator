import { redirect } from "next/navigation";
import { createSupabaseServerComponentClient } from "../supabase/server";

/**
 * Server-side helper to require admin role
 * Redirects non-admin users to /employee
 */
export async function requireAdmin() {
  const client = createSupabaseServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    redirect("/corp/redirect");
  }

  // Check user metadata first (fast)
  const metadataRole = user.user_metadata?.role;
  
  if (metadataRole && metadataRole !== "admin") {
    redirect("/employee");
  }

  // Double-check with database
  const { data: userProfile } = await client
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = userProfile?.role || metadataRole;

  if (role !== "admin") {
    redirect("/employee");
  }

  return { user, client };
}


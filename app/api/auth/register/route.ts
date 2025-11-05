import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

import { Database } from "../../../../lib/supabase/database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable"
  );
}

const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type RegisterPayload = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  invitationCode?: string;
};

const CATEGORY_TO_CERTIFICATION: Record<string, string | null> = {
  sales: "sales-cert",
  hostess: "hostess-cert",
  receptionist: null,
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RegisterPayload;

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const invitationCode = body.invitationCode?.trim().toUpperCase();

  if (!email || !password || !firstName || !lastName || !invitationCode) {
    return NextResponse.json(
      { error: "Email, password, name, and invitation code are required." },
      { status: 400 }
    );
  }

  // Check if this is a static code that can be reused
  const isStaticCode =
    invitationCode === "SALES" || invitationCode === "HOSTESS";

  const invitationQuery = adminClient
    .from("invitation_codes")
    .select("*")
    .eq("code", invitationCode);

  // Static codes can be reused, so don't filter by used_at
  if (!isStaticCode) {
    invitationQuery.is("used_at", null);
  }

  const { data: invitation, error: invitationError } =
    await invitationQuery.maybeSingle();

  if (invitationError) {
    return NextResponse.json(
      { error: invitationError.message },
      { status: 500 }
    );
  }

  if (!invitation) {
    return NextResponse.json(
      { error: "Invalid or already used invitation code." },
      { status: 400 }
    );
  }

  // Get role and category from invitation code (codes never expire)
  const invitationData = invitation as any;
  const role = invitationData.role || "employee";
  const category = invitationData.category || null;
  const certificationCode = category
    ? CATEGORY_TO_CERTIFICATION[category.toLowerCase()]
    : null;

  const displayName = `${firstName} ${lastName}`.trim();

  const { data: existingUser, error: existingError } = await adminClient
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const { data: createResult, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        firstName,
        lastName,
        displayName,
        role,
        category,
      },
    });

  if (createError || !createResult?.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Unable to create user." },
      { status: 500 }
    );
  }

  const userId = createResult.user.id;

  try {
    const { error: userRecordError } = await (adminClient as any)
      .from("users")
      .upsert(
        {
          id: userId,
          email,
          first_name: firstName,
          last_name: lastName,
          role,
          category,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (userRecordError) {
      throw userRecordError;
    }

    // Removed: Only mark invitation code as used if it's not a static code
    // if (!isStaticCode) {
    // const { error: invitationUpdateError } = await (adminClient as any)
    //   .from("invitation_codes")
    //   .update({
    //     used_at: new Date().toISOString(),
    //     used_by: userId,
    //   })
    //   .eq("code", invitationCode);

    //   if (invitationUpdateError) {
    //     throw invitationUpdateError;
    //   }
    // }

    if (certificationCode) {
      const { data: certification, error: certificationError } =
        await adminClient
          .from("certifications")
          .select("id")
          .eq("code", certificationCode)
          .maybeSingle();

      if (certificationError) {
        throw certificationError;
      }

      if (certification) {
        const certData = certification as any;
        const { error: assignmentError } = await (adminClient as any)
          .from("assignments")
          .insert({
            id: randomUUID(),
            profile_id: userId,
            certification_id: certData.id,
            status: "pending",
            assigned_at: new Date().toISOString(),
            next_eligible_at: new Date().toISOString(),
          });

        if (assignmentError) {
          throw assignmentError;
        }
      }
    }
  } catch (err) {
    await adminClient.auth.admin.deleteUser(userId);

    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

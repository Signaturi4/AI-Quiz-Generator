/**
 * Script to assign tests to all users based on their category
 * and clean up duplicate assignments
 */

require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const { createClient } = require("@supabase/supabase-js");
const { randomUUID } = require("crypto");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE environment variables");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const CATEGORY_TO_CERT_CODE = {
  sales: "sales-cert",
  hostess: "hostess-cert",
};

async function cleanupDuplicateAssignments() {
  console.log("\n🧹 Cleaning up duplicate assignments...");

  // Find all duplicate assignments
  const { data: allAssignments, error } = await adminClient
    .from("assignments")
    .select("*")
    .order("profile_id")
    .order("certification_id")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch assignments:", error);
    return;
  }

  // Group by profile_id + certification_id
  const grouped = {};
  allAssignments.forEach((assignment) => {
    const key = `${assignment.profile_id}:${assignment.certification_id}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(assignment);
  });

  // Delete duplicates (keep most recent)
  let deletedCount = 0;
  for (const [key, assignments] of Object.entries(grouped)) {
    if (assignments.length > 1) {
      console.log(`  Found ${assignments.length} duplicates for ${key}`);
      // Keep the first (most recent), delete the rest
      const toDelete = assignments.slice(1);
      for (const duplicate of toDelete) {
        const { error: deleteError } = await adminClient
          .from("assignments")
          .delete()
          .eq("id", duplicate.id);

        if (deleteError) {
          console.error(`  ❌ Failed to delete ${duplicate.id}:`, deleteError);
        } else {
          deletedCount++;
        }
      }
    }
  }

  console.log(`✅ Deleted ${deletedCount} duplicate assignments`);
}

async function assignTestsToAllUsers() {
  console.log("\n📋 Assigning tests to users based on category...");

  // Get all users (exclude admin role)
  const { data: users, error: usersError } = await adminClient
    .from("users")
    .select("id, email, role, category, first_name, last_name")
    .neq("role", "admin");

  if (usersError) {
    console.error("Failed to fetch users:", usersError);
    return;
  }

  console.log(`Found ${users.length} non-admin users`);

  // Get all certifications
  const { data: certifications, error: certsError } = await adminClient
    .from("certifications")
    .select("id, code, title");

  if (certsError) {
    console.error("Failed to fetch certifications:", certsError);
    return;
  }

  const certMap = new Map(certifications.map((c) => [c.code, c]));
  console.log(`Found ${certifications.length} certifications`);

  let assignedCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    const category = user.category?.toLowerCase();
    const certCode = CATEGORY_TO_CERT_CODE[category];

    if (!certCode) {
      console.log(
        `  ⚠️  Skipping user ${user.email} - no category or unsupported category: ${category}`
      );
      skippedCount++;
      continue;
    }

    const certification = certMap.get(certCode);
    if (!certification) {
      console.log(
        `  ⚠️  Skipping user ${user.email} - certification ${certCode} not found`
      );
      skippedCount++;
      continue;
    }

    // Check if assignment already exists
    const { data: existing, error: existingError } = await adminClient
      .from("assignments")
      .select("id")
      .eq("profile_id", user.id)
      .eq("certification_id", certification.id)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error(
        `  ❌ Error checking assignment for ${user.email}:`,
        existingError
      );
      continue;
    }

    if (existing) {
      console.log(`  ✓ User ${user.email} already has ${certification.title}`);
      continue;
    }

    // Get the question pool for this certification
    const { data: cert, error: certError } = await adminClient
      .from("certifications")
      .select("question_pool_id")
      .eq("id", certification.id)
      .single();

    if (certError || !cert) {
      console.error(
        `  ❌ Failed to get question pool for ${certification.title}:`,
        certError
      );
      continue;
    }

    // Get all published versions for this pool
    const { data: versions, error: versionsError } = await adminClient
      .from("question_pool_versions")
      .select("id, version_number")
      .eq("pool_id", cert.question_pool_id)
      .eq("status", "published")
      .order("version_number", { ascending: false });

    if (versionsError || !versions || versions.length === 0) {
      console.error(
        `  ❌ No published versions found for ${certification.title}`
      );
      continue;
    }

    // Randomly select a version
    const randomVersion = versions[Math.floor(Math.random() * versions.length)];
    console.log(
      `  📝 Selected version ${randomVersion.version_number} (${randomVersion.id}) for ${user.email}`
    );

    // Create assignment
    const now = new Date();
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const { error: insertError } = await adminClient
      .from("assignments")
      .insert({
        id: randomUUID(),
        profile_id: user.id,
        certification_id: certification.id,
        status: "pending",
        assigned_at: now.toISOString(),
        next_eligible_at: now.toISOString(),
        due_at: dueDate.toISOString(),
      });

    if (insertError) {
      console.error(
        `  ❌ Failed to assign ${certification.title} to ${user.email}:`,
        insertError
      );
      continue;
    }

    // Update user with assigned pool version
    const { error: updateError } = await adminClient
      .from("users")
      .update({ assigned_pool_version_id: randomVersion.id })
      .eq("id", user.id);

    if (updateError) {
      console.error(
        `  ⚠️  Created assignment but failed to update user pool version:`,
        updateError
      );
    }

    console.log(
      `  ✅ Assigned ${certification.title} (v${randomVersion.version_number}) to ${user.email} (${user.first_name} ${user.last_name})`
    );
    assignedCount++;
  }

  console.log(
    `\n📊 Summary: ${assignedCount} new assignments, ${skippedCount} skipped`
  );
}

async function updateExistingUsersWithPoolVersions() {
  console.log("\n🔄 Updating existing users with pool version assignments...");

  // Get all users with assignments but no assigned_pool_version_id
  const { data: users, error: usersError } = await adminClient
    .from("users")
    .select("id, email, category")
    .is("assigned_pool_version_id", null)
    .neq("role", "admin");

  if (usersError) {
    console.error("Failed to fetch users:", usersError);
    return;
  }

  console.log(`Found ${users.length} users without assigned pool versions`);

  let updatedCount = 0;

  for (const user of users) {
    const category = user.category?.toLowerCase();
    const certCode = CATEGORY_TO_CERT_CODE[category];

    if (!certCode) {
      continue;
    }

    // Get their assignment
    const { data: assignment, error: assignError } = await adminClient
      .from("assignments")
      .select("certification_id, certifications(question_pool_id)")
      .eq("profile_id", user.id)
      .limit(1)
      .single();

    if (assignError || !assignment) {
      continue;
    }

    const questionPoolId = assignment.certifications?.question_pool_id;
    if (!questionPoolId) {
      continue;
    }

    // Get all published versions
    const { data: versions, error: versionsError } = await adminClient
      .from("question_pool_versions")
      .select("id, version_number")
      .eq("pool_id", questionPoolId)
      .eq("status", "published")
      .order("version_number", { ascending: false });

    if (versionsError || !versions || versions.length === 0) {
      console.log(`  ⚠️  No published versions for ${user.email}`);
      continue;
    }

    // Randomly assign a version
    const randomVersion = versions[Math.floor(Math.random() * versions.length)];

    const { error: updateError } = await adminClient
      .from("users")
      .update({ assigned_pool_version_id: randomVersion.id })
      .eq("id", user.id);

    if (updateError) {
      console.error(`  ❌ Failed to update ${user.email}:`, updateError);
    } else {
      console.log(
        `  ✅ Assigned version ${randomVersion.version_number} to ${user.email}`
      );
      updatedCount++;
    }
  }

  console.log(`\n📊 Updated ${updatedCount} existing users`);
}

async function main() {
  console.log("🚀 Starting test assignment script...");

  await cleanupDuplicateAssignments();
  await assignTestsToAllUsers();
  await updateExistingUsersWithPoolVersions();

  console.log("\n✨ Done!");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
}

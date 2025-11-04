const { randomUUID } = require("crypto");
const { resolve } = require("path");
const dotenv = require("dotenv");
const { adminClient, ensureAssignment } = require("./seedSupabase");

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
  process.exit(1);
}

const QUESTIONS_PER_ATTEMPT = 10;
const SALES_CERTIFICATION_CODE = "sales-cert";

function createTestIdentifiers() {
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "");
  const suffix = timestamp.slice(-8);
  return {
    email: `sales.tester+${suffix}@nuanu.dev`,
    password: `SalesTest!${suffix}`,
    firstName: "Sales",
    lastName: `Tester${suffix}`,
    invitationCode: `NAUNU-SALES-${suffix}`,
  };
}

async function upsertInvitationCode(code) {
  const payload = {
    code,
    role: "employee",
    category: "sales",
    notes: "Automated test invitation",
    expires_at: null,
    used_at: null,
    used_by: null,
  };

  const { error } = await adminClient
    .from("invitation_codes")
    .upsert(payload, { onConflict: "code" });

  if (error) {
    throw new Error(`Failed to upsert invitation code: ${error.message}`);
  }
}

async function registerSalesProfile({
  email,
  password,
  firstName,
  lastName,
  invitationCode,
}) {
  const { data: existingUser, error: existingError } = await adminClient
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check existing user: ${existingError.message}`);
  }

  if (existingUser) {
    return existingUser.id;
  }

  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        firstName,
        lastName,
        role: "employee",
        category: "sales",
      },
    });

  if (createError || !created?.user) {
    throw new Error(createError?.message ?? "Unable to create Supabase user");
  }

  const userId = created.user.id;

  const { error: userRecordError } = await adminClient.from("users").upsert(
    {
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      role: "employee",
      category: "sales",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (userRecordError) {
    await adminClient.auth.admin.deleteUser(userId);
    throw new Error(
      `Failed to upsert user profile: ${userRecordError.message}`
    );
  }

  const { error: invitationUpdateError } = await adminClient
    .from("invitation_codes")
    .update({
      used_at: new Date().toISOString(),
      used_by: userId,
    })
    .eq("code", invitationCode);

  if (invitationUpdateError) {
    console.warn(
      `Warning: failed to mark invitation code as used (${invitationUpdateError.message})`
    );
  }

  return userId;
}

async function ensureSalesCertification() {
  const { data, error } = await adminClient
    .from("certifications")
    .select("id, question_pool_id, title")
    .eq("code", SALES_CERTIFICATION_CODE)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load sales certification: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      "Sales certification not found. Run scripts/seedSupabase.js first to set up the database."
    );
  }

  return data;
}

function pickRandomQuestions(questions, count) {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function fetchPublishedPoolVersion(poolId) {
  const { data, error } = await adminClient
    .from("question_pool_versions")
    .select("id, version_number")
    .eq("pool_id", poolId)
    .eq("status", "published")
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load pool version: ${error.message}`);
  }

  if (!data) {
    throw new Error("No published sales question pool version available.");
  }

  return data;
}

async function loadQuestionsForVersion(versionId) {
  const { data, error } = await adminClient
    .from("questions")
    .select("id, prompt, choices, topic, explanation")
    .eq("pool_version_id", versionId);

  if (error) {
    throw new Error(`Failed to load questions: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("Question bank is empty for the published sales pool.");
  }

  return data;
}

async function launchSalesQuiz({ userId, certification, assignment }) {
  const poolVersion = await fetchPublishedPoolVersion(
    certification.question_pool_id
  );

  const questions = await loadQuestionsForVersion(poolVersion.id);
  const quizQuestions = pickRandomQuestions(questions, QUESTIONS_PER_ATTEMPT);

  const attemptId = randomUUID();
  const now = new Date().toISOString();

  const { error: insertError } = await adminClient.from("attempts").insert({
    id: attemptId,
    assignment_id: assignment.id,
    certification_id: certification.id,
    pool_version_id: poolVersion.id,
    profile_id: userId,
    started_at: now,
    question_count: quizQuestions.length,
    correct_count: 0,
    responses: [],
  });

  if (insertError) {
    throw new Error(`Failed to create quiz attempt: ${insertError.message}`);
  }

  return {
    attemptId,
    poolVersion,
    questions: quizQuestions.map((question, index) => ({
      order: index + 1,
      id: question.id,
      prompt: question.prompt,
      topic: question.topic,
      choices: question.choices,
      explanation: question.explanation,
    })),
  };
}

async function ensureAssignmentReady(userId, certificationId) {
  const assignment = await ensureAssignment({
    profile_id: userId,
    certification_id: certificationId,
  });

  const availabilityPayload = {
    status: "pending",
    next_eligible_at: new Date().toISOString(),
  };

  const { error } = await adminClient
    .from("assignments")
    .update(availabilityPayload)
    .eq("id", assignment.id);

  if (error) {
    throw new Error(
      `Failed to refresh assignment availability: ${error.message}`
    );
  }

  return assignment;
}

async function main() {
  const credentials = createTestIdentifiers();

  console.log("🔐 Preparing invitation code...");
  await upsertInvitationCode(credentials.invitationCode);

  console.log("👤 Registering sales profile...");
  const userId = await registerSalesProfile(credentials);

  console.log(`✔️ Sales profile ready (user id: ${userId})`);

  console.log("🎯 Ensuring sales certification and assignment...");
  const certification = await ensureSalesCertification();
  const assignment = await ensureAssignmentReady(userId, certification.id);

  console.log(`✔️ Assignment ${assignment.id} is ready for quiz attempts.`);

  console.log("📝 Launching sales quiz attempt with random questions...");
  const attempt = await launchSalesQuiz({
    userId,
    certification,
    assignment,
  });

  console.log("🎉 Test attempt created successfully!\n");

  console.log("=== Test Credentials ===");
  console.log(`Email:      ${credentials.email}`);
  console.log(`Password:   ${credentials.password}`);
  console.log(`InviteCode: ${credentials.invitationCode}`);
  console.log("");

  console.log("=== Launch Details ===");
  console.log(`Attempt ID:     ${attempt.attemptId}`);
  console.log(`Pool Version:   v${attempt.poolVersion.version_number}`);
  console.log(`Question Count: ${attempt.questions.length}`);
  console.log("");

  console.log("=== Sample Questions ===");
  attempt.questions.forEach((question) => {
    console.log(`\n${question.order}. ${question.prompt}`);
    question.choices.forEach((choice, index) => {
      const text =
        typeof choice === "string"
          ? choice
          : choice?.text ?? JSON.stringify(choice);
      console.log(`   ${String.fromCharCode(65 + index)}. ${text}`);
    });
  });

  console.log("\n=== Manual Test Scenario ===");
  console.log(
    "1. Start the Next.js app locally (npm run dev) and open http://localhost:3000."
  );
  console.log(
    "2. Sign in with the generated credentials, then visit /employee to confirm the Sales certification tile shows as ready to start."
  );
  console.log(
    `3. Launch the quiz via /quiz?certification=${SALES_CERTIFICATION_CODE}; the attempt created above (${attempt.attemptId}) will be reused and questions should match the list printed here.`
  );
  console.log(
    "4. Complete the quiz to validate scoring and assignment status transitions."
  );

  console.log("\n✅ Flow complete. Happy testing!");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Sales test flow failed", error);
    process.exit(1);
  });
}

module.exports = {
  createTestIdentifiers,
  upsertInvitationCode,
  registerSalesProfile,
  ensureSalesCertification,
  launchSalesQuiz,
  ensureAssignmentReady,
};

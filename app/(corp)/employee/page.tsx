export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerComponentClient } from "../../../lib/supabase/server";
import { Database } from "../../../lib/supabase/database.types";

const statusConfig = {
  due: {
    badge: "Ready to Start",
    className: "bg-primary/20 text-primary border border-primary/30",
    actionLabel: "Start Test",
    disabled: false,
  },
  locked: {
    badge: "Locked",
    className:
      "bg-nuanu-grey-dark/20 text-nuanu-grey-dark border border-nuanu-grey-dark/30",
    actionLabel: "Retake Available Soon",
    disabled: true,
  },
  passed: {
    badge: "Completed",
    className: "bg-primary/30 text-primary-foreground border border-primary/50",
    actionLabel: "View Certificate",
    disabled: false,
  },
} as const;

const CATEGORY_TO_POOL_NAME: Record<string, string> = {
  sales: "Sales Certification Pool",
  hostess: "Hostess Certification Pool",
};

const CATEGORY_TO_CERTIFICATION: Record<string, string> = {
  sales: "sales-cert",
  hostess: "hostess-cert",
};

type StatusKey = keyof typeof statusConfig;

type AssignmentRecord = {
  id: string;
  status: StatusKey | "failed" | "pending" | string;
  next_eligible_at: string | null;
  last_attempt_at: string | null;
  certification: {
    id: string;
    code: string;
    title: string;
    description: string | null;
    duration_minutes: number | null;
    passing_threshold: number;
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
};

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export default async function EmployeeDashboardPage() {
  const client = createSupabaseServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    redirect("/corp/redirect");
  }

  const userId = user.id;

  const { data: profile, error: profileError } = await client
    .from("users")
    .select("role, category")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to resolve profile", profileError);
    redirect("/corp/redirect");
  }

  if (!profile) {
    redirect("/corp/redirect");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  const categoryRaw = profile.category ?? null;
  const categoryKey = categoryRaw ? categoryRaw.toLowerCase() : null;

  const { data: assignmentRows, error: assignmentsError } = await client
    .from("assignments")
    .select(
      `id, status, next_eligible_at, last_attempt_at, certification:certifications(id, code, title, description, duration_minutes, passing_threshold)`
    )
    .eq("profile_id", userId);

  if (assignmentsError) {
    console.error(assignmentsError);
    throw new Error("Failed to load assignments");
  }

  let currentAssignments = assignmentRows ?? [];

  if (
    currentAssignments.length === 0 &&
    profile.role === "employee" &&
    categoryKey &&
    CATEGORY_TO_POOL_NAME[categoryKey]
  ) {
    const poolName = CATEGORY_TO_POOL_NAME[categoryKey];
    const certificationCode = CATEGORY_TO_CERTIFICATION[categoryKey];

    console.log(
      `[Auto-Assignment] User ${userId} (category: ${categoryKey}) needs pool: ${poolName}`
    );

    const { data: questionPool, error: poolError } = await client
      .from("question_pools")
      .select("id, name")
      .eq("name", poolName)
      .maybeSingle();

    if (poolError) {
      console.error(
        "[Auto-Assignment] Failed to find question pool:",
        poolError
      );
    }

    if (!questionPool) {
      console.error(
        `[Auto-Assignment] Question pool "${poolName}" not found. Run: npm run supabase:seed`
      );
    }

    if (questionPool) {
      console.log(`[Auto-Assignment] Found question pool:`, questionPool);

      let certification: {
        id: string;
        code: string;
        title: string;
        description: string | null;
        duration_minutes: number | null;
        passing_threshold: number;
      } | null = null;
      const { data: existingCert, error: certError } = await client
        .from("certifications")
        .select(
          "id, code, title, description, duration_minutes, passing_threshold"
        )
        .eq("code", certificationCode)
        .maybeSingle();

      if (certError && certError.code !== "PGRST116") {
        console.error(
          "[Auto-Assignment] Error checking certification:",
          certError
        );
      }

      if (existingCert) {
        certification = existingCert;
        console.log(
          `[Auto-Assignment] Using existing certification:`,
          certification
        );
      } else {
        console.log(
          `[Auto-Assignment] Creating certification ${certificationCode} for pool ${questionPool.id}`
        );
        const serviceClient = createServiceRoleClient();

        if (!serviceClient) {
          console.error(
            "[Auto-Assignment] Service role client not configured - check SUPABASE_SERVICE_ROLE_KEY"
          );
        } else {
          const { data: newCert, error: createError } = await (
            serviceClient as any
          )
            .from("certifications")
            .insert({
              code: certificationCode,
              title: `${
                categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)
              } Certification`,
              description: `Assessment for ${categoryKey} staff`,
              question_pool_id: questionPool.id,
              passing_threshold: 0.7,
              duration_minutes: 30,
              active: true,
            })
            .select(
              "id, code, title, description, duration_minutes, passing_threshold"
            )
            .single();

          if (createError) {
            console.error(
              "[Auto-Assignment] Failed to create certification:",
              createError
            );
          } else {
            certification = newCert;
            console.log(
              `[Auto-Assignment] Created certification:`,
              certification
            );
          }
        }
      }

      if (certification) {
        const serviceClient = createServiceRoleClient();

        if (!serviceClient) {
          console.error("[Auto-Assignment] Service role client not available");
        } else {
          const { data: existingAssignment, error: fetchExistingError } =
            await serviceClient
              .from("assignments")
              .select("id")
              .eq("profile_id", userId)
              .eq("certification_id", certification.id)
              .maybeSingle();

          if (fetchExistingError && fetchExistingError.code !== "PGRST116") {
            console.error(
              "[Auto-Assignment] Error checking assignment:",
              fetchExistingError
            );
          }

          if (!existingAssignment) {
            console.log(
              `[Auto-Assignment] Creating assignment for user ${userId}`
            );
            const now = new Date();
            const dueAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            const { error: insertError } = await (serviceClient as any)
              .from("assignments")
              .insert({
                profile_id: userId,
                certification_id: certification.id,
                status: "pending",
                assigned_at: now.toISOString(),
                next_eligible_at: now.toISOString(),
                due_at: dueAt.toISOString(),
              });

            if (insertError) {
              console.error(
                "[Auto-Assignment] Failed to create assignment:",
                insertError
              );
            } else {
              console.log(
                `[Auto-Assignment] ✅ Assignment created successfully`
              );
            }
          } else {
            console.log(`[Auto-Assignment] Assignment already exists`);
          }

          const { data: refreshed, error: refreshError } = await client
            .from("assignments")
            .select(
              `id, status, next_eligible_at, last_attempt_at, certification:certifications(id, code, title, description, duration_minutes, passing_threshold)`
            )
            .eq("profile_id", userId);

          if (refreshError) {
            console.error("[Auto-Assignment] Failed to refresh:", refreshError);
          } else {
            console.log(
              `[Auto-Assignment] Found ${
                refreshed?.length ?? 0
              } assignments after refresh`
            );
            currentAssignments = refreshed ?? [];
          }
        }
      }
    }
  }

  const normalizedAssignments: AssignmentRecord[] = currentAssignments
    .map((record) => {
      const certificationRecord = Array.isArray(record.certification)
        ? record.certification[0]
        : record.certification;

      if (!certificationRecord) {
        return null;
      }

      return {
        id: record.id as string,
        status: (record.status ?? "due") as AssignmentRecord["status"],
        next_eligible_at: (record.next_eligible_at ?? null) as string | null,
        last_attempt_at: (record.last_attempt_at ?? null) as string | null,
        certification: {
          id: certificationRecord.id as string,
          code: certificationRecord.code as string,
          title: certificationRecord.title as string,
          description: (certificationRecord.description ?? null) as
            | string
            | null,
          duration_minutes: (certificationRecord.duration_minutes ?? null) as
            | number
            | null,
          passing_threshold: (certificationRecord.passing_threshold ??
            0) as number,
        },
      } satisfies AssignmentRecord;
    })
    .filter((entry): entry is AssignmentRecord => entry !== null);

  // Get all completed attempts for history
  const { data: allAttempts } = await client
    .from("attempts")
    .select(
      `
      id,
      submitted_at,
      score,
      passed,
      correct_count,
      question_count,
      certification:certifications(id, code, title)
    `
    )
    .eq("profile_id", userId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  if (normalizedAssignments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-nuanu-grey-dark/30 bg-card p-6 text-sm text-muted-foreground">
          <p className="font-semibold text-destructive">⚠️ No Quiz Assigned</p>
          <p className="mt-2 text-foreground">
            {categoryKey
              ? `Your category is "${categoryKey}". The system attempted to auto-assign a quiz from the "${CATEGORY_TO_POOL_NAME[categoryKey]}" question pool.`
              : "No category assigned to your profile."}
          </p>
          <div className="mt-4 rounded-lg bg-nuanu-green-dark/10 p-4 text-xs">
            <p className="font-semibold text-foreground">Troubleshooting:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                Check server logs for &ldquo;[Auto-Assignment]&rdquo; messages
              </li>
              <li>
                Verify question pool &ldquo;
                {CATEGORY_TO_POOL_NAME[categoryKey] ?? "N/A"}&rdquo; exists in
                database
              </li>
              <li>Ensure SUPABASE_SERVICE_ROLE_KEY is set in environment</li>
              <li>Try refreshing the page</li>
            </ul>
          </div>
          <p className="mt-4 text-xs text-nuanu-grey-light">
            Debug: role={profile.role}, category={categoryKey ?? "null"}
          </p>
        </div>
      </div>
    );
  }

  const attemptHistory = (allAttempts ?? [])
    .map((attempt) => {
      const cert = Array.isArray(attempt.certification)
        ? attempt.certification[0]
        : attempt.certification;

      if (!cert) return null;

      return {
        id: attempt.id as string,
        submittedAt: attempt.submitted_at as string,
        score: Number(attempt.score) || 0,
        passed: Boolean(attempt.passed),
        correctCount: attempt.correct_count as number,
        questionCount: attempt.question_count as number,
        certificationTitle: cert.title as string,
        certificationCode: cert.code as string,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return (
    <div className="space-y-8">
      {/* Active Assignments Section */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-nuanu-beige-light">
          Current Certification
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {normalizedAssignments.map((assignment) => {
            const certification = assignment.certification;
            const nextEligibleDate = assignment.next_eligible_at
              ? new Date(assignment.next_eligible_at)
              : null;

            let derivedStatus: StatusKey = "due";
            if (assignment.status === "passed") {
              derivedStatus = "passed";
            } else if (
              nextEligibleDate &&
              nextEligibleDate.getTime() > Date.now()
            ) {
              derivedStatus = "locked";
            }

            const status = statusConfig[derivedStatus];

            let nextEligible = "Available now";
            if (derivedStatus === "locked" && nextEligibleDate) {
              const formatted = formatDate(nextEligibleDate.toISOString());
              nextEligible = formatted
                ? `Retake on ${formatted}`
                : "Retake pending";
            }
            if (derivedStatus === "passed") {
              const formatted = formatDate(assignment.last_attempt_at);
              nextEligible = formatted ? `Completed ${formatted}` : "Completed";
            }

            const actionHref =
              derivedStatus === "passed"
                ? `/employee/${certification.code}/result`
                : `/quiz?certification=${certification.code}`;

            return (
              <article
                key={assignment.id}
                className="gradient-nuanu-card flex h-full flex-col justify-between rounded-2xl border border-nuanu-grey-dark/30 p-6 shadow-sm transition hover:border-primary/50 hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                    >
                      {status.badge}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {nextEligible}
                    </p>
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground">
                    {certification.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {certification.description ?? "Certification overview"}
                  </p>
                </div>
                <div className="mt-6">
                  {status.disabled ? (
                    <button
                      disabled
                      className="inline-flex cursor-not-allowed items-center rounded-lg border border-nuanu-grey-dark/30 bg-muted px-4 py-2 text-sm font-semibold text-nuanu-grey-dark"
                    >
                      {status.actionLabel}
                    </button>
                  ) : (
                    <Link
                      href={actionHref}
                      className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      {status.actionLabel}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Test History Section */}
      {attemptHistory.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-nuanu-beige-light">
            Previous Results
          </h2>
          <div className="space-y-3">
            {attemptHistory.map((attempt) => {
              const percentage = Math.round(attempt.score * 100);
              const formattedDate = formatDate(attempt.submittedAt);

              return (
                <article
                  key={attempt.id}
                  className="gradient-nuanu-subtle rounded-xl border border-nuanu-grey-dark/30 p-4 shadow-sm transition hover:border-primary/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-foreground">
                          {attempt.certificationTitle}
                        </h4>
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                            attempt.passed
                              ? "border-primary/30 bg-primary/20 text-primary"
                              : "border-destructive/30 bg-destructive/10 text-destructive"
                          }`}
                        >
                          {attempt.passed ? "Passed" : "Failed"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>
                          Score:{" "}
                          <strong className="text-foreground">
                            {percentage}%
                          </strong>
                        </span>
                        <span>
                          Correct:{" "}
                          <strong className="text-foreground">
                            {attempt.correctCount}/{attempt.questionCount}
                          </strong>
                        </span>
                        <span className="text-nuanu-grey-light">
                          {formattedDate}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/employee/${attempt.certificationCode}/result?attempt=${attempt.id}`}
                      className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:border-primary/50 hover:bg-primary/20"
                    >
                      View Certificate
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

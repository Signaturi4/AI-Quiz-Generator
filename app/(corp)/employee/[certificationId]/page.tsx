export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createSupabaseServerComponentClient } from "../../../../lib/supabase/server";

const formatDate = (value?: string | null) => {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
};

type Params = {
  params: {
    certificationId: string;
  };
};

export default async function CertificationIntroPage({ params }: Params) {
  const client = createSupabaseServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userId = user.id;

  const { data: certification, error: certError } = await client
    .from("certifications")
    .select("*")
    .eq("code", params.certificationId)
    .maybeSingle();

  if (certError) {
    console.error(certError);
    throw new Error("Failed to load certification");
  }

  if (!certification) {
    notFound();
  }

  const { data: assignment, error: assignmentError } = await client
    .from("assignments")
    .select("*")
    .eq("profile_id", userId)
    .eq("certification_id", certification.id)
    .maybeSingle();

  if (assignmentError) {
    console.error(assignmentError);
    throw new Error("Failed to load assignment");
  }

  if (!assignment) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-200/70">
        You are not assigned to this certification yet. Contact your
        administrator to request access.
      </div>
    );
  }

  const nextEligibleDate = assignment.next_eligible_at
    ? new Date(assignment.next_eligible_at)
    : null;
  const locked =
    assignment.status !== "passed" &&
    !!nextEligibleDate &&
    nextEligibleDate.getTime() > Date.now();

  const { data: latestAttempt } = await client
    .from("attempts")
    .select("score, passed, submitted_at")
    .eq("assignment_id", assignment.id)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const durationLabel = certification.duration_minutes
    ? `${certification.duration_minutes} minutes`
    : "—";

  const nextEligibleLabel = (() => {
    if (!locked) return "Available now";
    const formatted = nextEligibleDate
      ? formatDate(nextEligibleDate.toISOString())
      : null;
    return formatted
      ? `Retake available ${formatted}`
      : "Retake window pending";
  })();

  const startHref = `/quiz?certification=${certification.code}`;

  return (
    <div className="flex flex-col gap-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <header className="space-y-2">
        <h2 className="text-3xl font-semibold">{certification.title}</h2>
        <p className="max-w-2xl text-sm text-slate-200/70">
          {certification.description ?? "Certification overview."}
        </p>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-300/60">
          {nextEligibleLabel}
        </p>
      </header>

      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <dt className="text-xs uppercase tracking-[0.3em] text-slate-200/60">
            Duration
          </dt>
          <dd className="mt-2 text-lg font-semibold text-white">
            {durationLabel}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <dt className="text-xs uppercase tracking-[0.3em] text-slate-200/60">
            Passing Score
          </dt>
          <dd className="mt-2 text-lg font-semibold text-white">
            {Math.round(certification.passing_threshold * 100)}%
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <dt className="text-xs uppercase tracking-[0.3em] text-slate-200/60">
            Retake Policy
          </dt>
          <dd className="mt-2 text-lg font-semibold text-white">
            Once every 30 days
          </dd>
        </div>
      </dl>

      {latestAttempt && (
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200/70">
          <p className="font-semibold text-slate-200/80">Last attempt</p>
          <p>
            {latestAttempt.passed ? "Passed" : "Not passed"} • Score:{" "}
            {Math.round((latestAttempt.score ?? 0) * 100)}%
          </p>
          <p>Submitted {formatDate(latestAttempt.submitted_at) ?? "—"}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={startHref}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            locked
              ? "cursor-not-allowed border border-white/10 text-slate-200/40"
              : "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
          }`}
          aria-disabled={locked}
        >
          Begin Assessment
        </Link>
        <Link
          href="/employee"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-100/40"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

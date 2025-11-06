export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";

import { createSupabaseServerComponentClient } from "../../../../../lib/supabase/server";
import CertificateView from "./CertificateView";

const formatDate = (value?: string | null) => {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
};

type Params = {
  params: {
    certificationId: string;
  };
};

type AttemptResponse = {
  question_id: string;
  choice_index: number;
  correct: boolean;
};

export default async function ResultPage({ params }: Params) {
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
    notFound();
  }

  const { data: profile } = await client
    .from("users")
    .select("first_name, last_name, email, category")
    .eq("id", assignment.profile_id)
    .maybeSingle();

  const employeeName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "Employee"
    : user.email ?? "Employee";

  const { data: attempt, error: attemptError } = await client
    .from("attempts")
    .select("*")
    .eq("assignment_id", assignment.id)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (attemptError) {
    console.error(attemptError);
    throw new Error("Failed to load attempt");
  }

  if (!attempt) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-200/70">
        No completed attempts yet. Start the assessment to see your results.
      </div>
    );
  }

  const score = Number(attempt.score) || 0;
  const passed = Boolean(attempt.passed);
  const completedDate = formatDate(attempt.submitted_at) || "Unknown Date";

  return (
    <CertificateView
      employeeName={employeeName}
      email={profile?.email || user.email || ""}
      certificationTitle={certification.title}
      category={profile?.category || "general"}
      score={score}
      passed={passed}
      correctCount={attempt.correct_count}
      questionCount={attempt.question_count}
      completedDate={completedDate}
      attemptId={attempt.id}
    />
  );
}

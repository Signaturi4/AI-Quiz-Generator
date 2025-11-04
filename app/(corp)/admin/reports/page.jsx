import { requireAdmin } from "../../../../lib/auth/requireAdmin";
import { createServerClient } from "../../../../lib/supabase/server";

async function getCertificationAttempts() {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("attempts")
    .select(`
      id,
      submitted_at,
      score,
      passed,
      certification_id,
      profile_id,
      certifications(title),
      profiles(display_name, email)
    `)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch certification attempts:", error);
    return [];
  }

  // Fetch next eligible dates from assignments
  const profileIds = [...new Set(data.map(a => a.profile_id))];
  const certIds = [...new Set(data.map(a => a.certification_id))];
  
  const { data: assignments } = await supabase
    .from("assignments")
    .select("profile_id, certification_id, next_eligible_at")
    .in("profile_id", profileIds)
    .in("certification_id", certIds);

  const assignmentMap = new Map(
    (assignments || []).map(a => [
      `${a.profile_id}-${a.certification_id}`,
      a.next_eligible_at
    ])
  );

  return data.map(attempt => ({
    attemptId: attempt.id,
    employee: attempt.profiles?.display_name || attempt.profiles?.email || "Unknown",
    certification: attempt.certifications?.title || "Unknown",
    submittedAt: attempt.submitted_at,
    score: attempt.score || 0,
    passed: attempt.passed || false,
    nextEligible: assignmentMap.get(`${attempt.profile_id}-${attempt.certification_id}`) || null,
  }));
}

const formatPercentage = (value) => `${Math.round(value * 100)}%`;

const formatDate = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
};

export default async function ReportsPage() {
  await requireAdmin();
  
  const sampleRows = await getCertificationAttempts();
  
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-start gap-4">
          <img
            src="/icons/logo.jpg"
            alt="Nuanu Logo"
            className="h-12 w-12 flex-shrink-0 rounded-lg object-cover mt-1"
          />
          <div className="flex-1">
        <h2 className="text-3xl font-semibold text-white">Certification Reports</h2>
            <p className="max-w-2xl text-sm text-white">
              Explore outcomes, retake eligibility, and compliance status across
              teams.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-nuanu-grey-dark/30 bg-card p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-foreground/80">
            <thead className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Certification</th>
                <th className="px-3 py-2">Submitted</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Next Eligible</th>
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((row) => (
                <tr key={row.attemptId} className="border-t border-nuanu-grey-dark/20">
                  <td className="px-3 py-3 font-medium text-foreground">
                    {row.employee}
                  </td>
                  <td className="px-3 py-3 text-foreground/80">{row.certification}</td>
                  <td className="px-3 py-3 text-muted-foreground">{formatDate(row.submittedAt)}</td>
                  <td className="px-3 py-3 text-foreground">{formatPercentage(row.score)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        row.passed
                          ? "border-primary/30 bg-primary/20 text-primary"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                      }`}
                    >
                      {row.passed ? "Passed" : "Failed"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{formatDate(row.nextEligible)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

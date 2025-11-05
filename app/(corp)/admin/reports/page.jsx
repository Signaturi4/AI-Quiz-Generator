import { requireAdmin } from "../../../../lib/auth/requireAdmin";
import { createSupabaseServerComponentClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

const formatPercentage = (value) => `${Math.round(value * 100)}%`;

export default async function ReportsPage() {
  await requireAdmin();
  const supabase = createSupabaseServerComponentClient();

  const { data: assignments, error } = await supabase
    .from("assignments")
    .select(
      `
        id,
        assigned_at,
        due_at,
        status,
        profiles:profile_id (
          first_name,
          last_name
        ),
        certifications:certification_id (
          title
        ),
        attempts:id(
          submitted_at,
          score,
          passed
        )
      `
    )
    .order("assigned_at", { ascending: false });

  if (error) {
    console.error("Error fetching assignments:", error);
    return <p>Error loading reports.</p>;
  }

  const formattedAssignments = assignments.map((assignment) => {
    const latestAttempt = assignment.attempts[0]; // Assuming attempts are ordered by submitted_at DESC if needed
    return {
      attemptId: assignment.id,
      employee: `${assignment.profiles.first_name} ${assignment.profiles.last_name}`,
      certification: assignment.certifications.title,
      submittedAt: latestAttempt?.submitted_at
        ? new Date(latestAttempt.submitted_at).toLocaleDateString()
        : "N/A",
      score: latestAttempt?.score || 0,
      passed: latestAttempt?.passed || false,
      nextEligible: assignment.next_eligible_at
        ? new Date(assignment.next_eligible_at).toLocaleDateString()
        : "N/A",
    };
  });

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
            <h2 className="text-3xl font-semibold text-nuanu-beige-light">
              Certification Reports
            </h2>
            <p className="max-w-2xl text-sm text-nuanu-beige-dark">
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
              {formattedAssignments.map((row) => (
                <tr
                  key={row.attemptId}
                  className="border-t border-nuanu-grey-dark/20"
                >
                  <td className="px-3 py-3 font-medium text-foreground">
                    {row.employee}
                  </td>
                  <td className="px-3 py-3 text-foreground/80">
                    {row.certification}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {row.submittedAt}
                  </td>
                  <td className="px-3 py-3 text-foreground">
                    {formatPercentage(row.score)}
                  </td>
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
                  <td className="px-3 py-3 text-muted-foreground">
                    {row.nextEligible}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

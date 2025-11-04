import { requireAdmin } from "../../../../lib/auth/requireAdmin";

export const dynamic = "force-dynamic";

const sampleRows = [
  {
    attemptId: "att-001",
    employee: "Amara Putri",
    certification: "Sales Certification",
    submittedAt: "2024-11-01",
    score: 0.8,
    passed: true,
    nextEligible: "2024-12-01",
  },
  {
    attemptId: "att-002",
    employee: "Dewa Adi",
    certification: "Hostess Certification",
    submittedAt: "2024-10-28",
    score: 0.6,
    passed: false,
    nextEligible: "2024-11-27",
  },
];

const formatPercentage = (value) => `${Math.round(value * 100)}%`;

export default async function ReportsPage() {
  await requireAdmin();

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
              {sampleRows.map((row) => (
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

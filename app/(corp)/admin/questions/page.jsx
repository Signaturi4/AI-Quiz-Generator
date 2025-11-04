export const dynamic = "force-dynamic";

import Link from "next/link";
import { getServerQuestionBankService } from "../../../../lib/services/serverInstances";
import { requireAdmin } from "../../../../lib/auth/requireAdmin";

function formatDate(value) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

export default async function QuestionBankPage() {
  await requireAdmin();
  
  const { service } = getServerQuestionBankService();
  const pools = await service.listPools();

  const summaries = await Promise.all(
    pools.map(async (pool) => {
      const latest = await service.getLatestPublishedVersionSummary(pool.id);
      return {
        pool,
        latest,
      };
    })
  );

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
            <h2 className="text-3xl font-semibold text-nuanu-beige-light">Question Bank</h2>
            <p className="max-w-2xl text-sm text-nuanu-beige-dark">
              Maintain version-controlled question pools. Updates here propagate to
              future exam runs while preserving historical attempts.
            </p>
            <div className="mt-2 text-xs text-nuanu-beige-dark">
              <p>• Pools available: {summaries.length}</p>
              <p>• Categories: Sales, Hostess (extensible via Supabase)</p>
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-nuanu-grey-dark/30 bg-card p-6 shadow-sm">
        {summaries.length === 0 ? (
          <div className="flex flex-col items-start justify-center gap-3 rounded-xl border border-dashed border-nuanu-grey-dark/30 bg-muted p-6 text-sm text-muted-foreground">
            <p className="text-foreground">No question pools found.</p>
            <p>
              Use the seeding script (`npm run supabase:seed`) or the &ldquo;Generate
              Test&rdquo; workflow to create the initial pools.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {summaries.map(({ pool, latest }) => {
              const questionCount = latest?.questionCount ?? 0;
              const versionLabel = latest
                ? `v${latest.version.versionNumber}`
                : "Draft";
              const lastUpdated = latest?.lastUpdated
                ? formatDate(latest.lastUpdated)
                : "Not published";

              return (
                <article
                  key={pool.id}
                  className="rounded-xl border border-nuanu-grey-dark/30 bg-background p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {pool.name}
                      </p>
                      {pool.description && (
                        <p className="mt-1 max-w-2xl text-sm text-foreground/80">
                          {pool.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-primary/30 bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                        {versionLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {questionCount} question{questionCount === 1 ? "" : "s"}
                      </span>
                      <Link
                        href={`/admin/questions/${pool.id}`}
                        className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary transition hover:border-primary/50 hover:bg-primary/20"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                    <div>
                      <p className="font-semibold text-foreground/90">
                        Last updated
                      </p>
                      <p>{lastUpdated}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground/90">
                        Latest status
                      </p>
                      <p>{latest?.version.status ?? "draft"}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground/90">
                        Version created
                      </p>
                      <p>
                        {latest?.version.createdAt
                          ? formatDate(latest.version.createdAt)
                          : "Unknown"}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

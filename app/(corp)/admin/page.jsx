import Link from "next/link";

import { requireAdmin } from "../../../lib/auth/requireAdmin";

export const dynamic = "force-dynamic";

const highlightCards = [
  {
    title: "Upcoming Retakes",
    value: "--",
    description: "Employees due for certification this month",
    href: "/admin/reports?filter=overdue",
  },
  {
    title: "Pass Rate (30 days)",
    value: "--%",
    description: "Percentage of employees passing on first try",
    href: "/admin/reports?range=30d",
  },
  {
    title: "Active Certifications",
    value: "2",
    description: "Sales Certification, Hostess Certification",
    href: "/admin/questions",
  },
];

export default async function AdminOverviewPage() {
  await requireAdmin();

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <div className="flex items-start gap-4">
          <img
            src="/icons/logo.jpg"
            alt="Nuanu Logo"
            className="h-12 w-12 flex-shrink-0 rounded-lg object-cover mt-1"
          />
          <div className="flex-1">
            <h2 className="text-3xl font-semibold text-nuanu-beige-light">Operational Snapshot</h2>
            <p className="max-w-2xl text-base text-nuanu-beige-dark">
              Monitor certification health, schedule upcoming exam cycles, and
              ensure compliance across Sales and Hostess teams.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {highlightCards.map(({ title, value, description, href }) => (
          <Link
            key={title}
            href={href}
            className="gradient-nuanu-card group rounded-xl border border-nuanu-grey-dark/30 p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {title}
            </p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            <p className="mt-4 text-sm font-medium text-primary group-hover:text-primary/80">
              View details →
            </p>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-nuanu-grey-dark/30 bg-card p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-nuanu-beige-light">Next Steps</h3>
        <ul className="mt-4 space-y-3 text-sm text-nuanu-beige-dark">
          <li>• Configure question pools for each certification track.</li>
          <li>• Assign upcoming exam windows and notify employees.</li>
          <li>• Review pass/fail distribution to plan coaching sessions.</li>
        </ul>
      </section>
    </div>
  );
}

import Link from "next/link";
import AuthGate from "../components/AuthGate";
import SignOutButton from "../components/SignOutButton";

const navLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/generate", label: "Generate Test" },
  { href: "/admin/questions", label: "Question Bank" },
  { href: "/admin/reports", label: "Reports" },
];

export default function AdminLayout({ children }) {
  return (
    <AuthGate>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="gradient-nuanu-card rounded-xl border border-nuanu-grey-dark/30 p-6 shadow-md">
          <div className="mb-8 space-y-1">
            <div className="mb-4 flex items-center gap-3">
              <img
                src="/icons/logo.jpg"
                alt="Nuanu Logo"
                className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-primary">
                  Admin Console
                </p>
                <h1 className="text-2xl font-semibold text-foreground">
                  Certification Control
                </h1>
              </div>
            </div>
          </div>
          <nav className="space-y-2">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-primary/10 hover:text-primary"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-10 border-t border-nuanu-grey-dark/20 pt-6">
            <SignOutButton />
          </div>
        </aside>
        <section className="space-y-8">{children}</section>
      </div>
    </AuthGate>
  );
}

import AuthGate from "../components/AuthGate";
import SignOutButton from "../components/SignOutButton";

export default function EmployeeLayout({ children }) {
  return (
    <AuthGate>
      <div className="space-y-8">
        <header className="gradient-nuanu-header rounded-2xl border border-nuanu-grey-dark/30 p-6 shadow-md">
          <div className="flex items-start gap-4">
            <img
              src="/icons/logo.jpg"
              alt="Nuanu Logo"
              className="h-12 w-12 flex-shrink-0 rounded-lg object-cover mt-0.5"
            />
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-primary">
                Nuanu Workforce Academy
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-foreground">
                My Certifications
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Track your progress, review results, and prepare for upcoming
                assessments.
              </p>
            </div>
          </div>
        </header>
        <section>{children}</section>
        <div className="flex justify-end">
          <div className="w-full max-w-[220px]">
            <SignOutButton />
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

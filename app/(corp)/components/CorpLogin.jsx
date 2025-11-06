"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSupabaseAuth } from "../../../contexts/supabase-auth-provider";

const loginCopy = {
  title: "Access Required",
  description:
    "Only approved Nuanu team members can enter. Sign in with your credentials or request access with a valid invitation code provided by the corporate team.",
  secondaryAction: "request access",
};

const tabs = [
  { key: "signin", label: "Sign in" },
  { key: "signup", label: "Sign up" },
];

export default function CorpLogin({ error: initialError = null }) {
  const { signIn, signUp } = useSupabaseAuth();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState("signin");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpInviteCode, setSignUpInviteCode] = useState("");
  const [signUpFirstName, setSignUpFirstName] = useState("");
  const [signUpLastName, setSignUpLastName] = useState("");

  const [formError, setFormError] = useState(initialError);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);

  useEffect(() => {
    setFormError(initialError);
  }, [initialError]);

  // Read invitation code from URL parameter
  useEffect(() => {
    const codeParam = searchParams?.get("code");
    if (codeParam) {
      setSignUpInviteCode(codeParam.toUpperCase());
      setMode("signup");
    }
  }, [searchParams]);

  const resetFeedback = useCallback(() => {
    setFormError(null);
    setSuccessMessage("");
  }, []);

  const handleModeChange = useCallback(
    (nextMode) => {
      if (mode === nextMode) return;
      setMode(nextMode);
      resetFeedback();
    },
    [mode, resetFeedback]
  );

  const handleSignIn = useCallback(
    async (event) => {
      event.preventDefault();
      resetFeedback();

      console.log("Attempting to sign in..."); // Added log

      const email = signInEmail.trim();
      const password = signInPassword;

      if (!email || !password) {
        setFormError(new Error("Email and password are required."));
        console.error("Sign-in failed: Email or password missing."); // Added log
        return;
      }

      try {
        setIsSigningIn(true);
        await signIn(email, password);
        console.log("Sign-in successful (or initiated)."); // Added log
      } catch (err) {
        setFormError(err instanceof Error ? err : new Error(String(err)));
        console.error("Sign-in failed:", err); // Added log
      } finally {
        setIsSigningIn(false);
      }
    },
    [resetFeedback, signIn, signInEmail, signInPassword]
  );

  const handleSignUp = useCallback(
    async (event) => {
      event.preventDefault();
      resetFeedback();

      const email = signUpEmail.trim();
      const password = signUpPassword;
      const invite = signUpInviteCode.trim().toUpperCase();
      const firstName = signUpFirstName.trim();
      const lastName = signUpLastName.trim();

      if (!email || !password || !firstName || !lastName || !invite) {
        setFormError(new Error("All fields are required."));
        return;
      }

      try {
        setIsRequestingAccess(true);
        await signUp({
          email,
          password,
          firstName,
          lastName,
          invitationCode: invite,
        });

        setMode("signin");
        setSignInEmail(email);
        setSignInPassword("");
        setSignUpEmail("");
        setSignUpPassword("");
        setSignUpInviteCode("");
        setSignUpFirstName("");
        setSignUpLastName("");
        setSuccessMessage(
          "Request received. Check your inbox for a confirmation email or wait for an administrator to approve your access."
        );
      } catch (err) {
        setFormError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsRequestingAccess(false);
      }
    },
    [
      resetFeedback,
      signUp,
      signUpEmail,
      signUpPassword,
      signUpInviteCode,
      signUpFirstName,
      signUpLastName,
    ]
  );

  const errorMessage = formError
    ? formError instanceof Error
      ? formError.message
      : String(formError)
    : null;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center">
      <div className="gradient-nuanu-card grid gap-10 rounded-3xl border border-nuanu-grey-dark/30 p-10 shadow-lg md:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <div className="space-y-2">
            <div className="mb-4 flex items-center gap-3">
              <img
                src="/icons/logo.jpg"
                alt="Nuanu Logo"
                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-primary">
                  Nuanu Corp
                </p>
                <h1 className="text-2xl font-semibold text-foreground">
                  Certification Control
                </h1>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Gain access to configure exams, review performance, and manage
            certification lifecycles across the organisation.
          </p>
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-xs text-primary">
            Access is limited to authorised Nuanu personnel. New teammates need
            a valid invitation code from the corporate team before requesting
            access.
          </div>
        </aside>

        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {loginCopy.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {loginCopy.description}
            </p>
          </div>

          <div className="inline-flex rounded-full bg-muted p-1 text-xs font-semibold text-muted-foreground">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleModeChange(key)}
                className={`rounded-full px-4 py-1 transition ${
                  mode === key
                    ? "bg-primary text-primary-foreground"
                    : "hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "signin" ? (
            <form className="space-y-4" onSubmit={handleSignIn}>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={signInEmail}
                  onChange={(event) => setSignInEmail(event.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="you@nuanu.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Password
                </label>
                <input
                  type="password"
                  value={signInPassword}
                  onChange={(event) => setSignInPassword(event.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={isSigningIn}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningIn ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSignUp}>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Corporate email
                </label>
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={(event) => setSignUpEmail(event.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="you@nuanu.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    First name
                  </label>
                  <input
                    type="text"
                    value={signUpFirstName}
                    onChange={(event) => setSignUpFirstName(event.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Jane"
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={signUpLastName}
                    onChange={(event) => setSignUpLastName(event.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Doe"
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Password
                </label>
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={(event) => setSignUpPassword(event.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Create a password"
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Invitation code
                </label>
                <input
                  type="text"
                  value={signUpInviteCode}
                  onChange={(event) => setSignUpInviteCode(event.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter the code from Nuanu"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isRequestingAccess}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRequestingAccess ? "Signing up…" : "Sign up"}
              </button>
            </form>
          )}

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-xs text-primary">
              {successMessage}
            </div>
          ) : null}

          <div className="rounded-lg border border-nuanu-grey-dark/20 bg-muted px-4 py-3 text-xs text-muted-foreground">
            Need help? Reach out to the Nuanu corporate administrator to request
            access or update your invitation.
          </div>
        </section>
      </div>
    </div>
  );
}

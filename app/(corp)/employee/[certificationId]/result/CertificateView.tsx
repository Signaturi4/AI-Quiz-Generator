"use client";

import { useState } from "react";

type CertificateProps = {
  employeeName: string;
  email: string;
  certificationTitle: string;
  category: string;
  score: number;
  passed: boolean;
  correctCount: number;
  questionCount: number;
  completedDate: string;
  attemptId: string;
};

export default function CertificateView({
  employeeName,
  email,
  certificationTitle,
  category,
  score,
  passed,
  correctCount,
  questionCount,
  completedDate,
  attemptId,
}: CertificateProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/certificates/${attemptId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const percentage = Math.round(score * 100);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Certificate Card */}
      <div className="gradient-nuanu-certificate relative overflow-hidden rounded-3xl border-2 border-nuanu-grey-dark/30 p-12 shadow-2xl">
        {/* Decorative corner elements */}
        <div className="absolute left-0 top-0 h-32 w-32 border-l-4 border-t-4 border-primary/40"></div>
        <div className="absolute bottom-0 right-0 h-32 w-32 border-b-4 border-r-4 border-primary/40"></div>

        {/* Status Badge */}
        <div className="mb-8 flex justify-center">
          {passed ? (
            <div className="rounded-full bg-primary/20 px-6 py-2 text-sm font-semibold text-primary ring-2 ring-primary/50">
              ✓ CERTIFIED
            </div>
          ) : (
            <div className="rounded-full bg-destructive/20 px-6 py-2 text-sm font-semibold text-destructive ring-2 ring-destructive/50">
              ✗ NOT PASSED
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-8 text-center">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Certificate of {passed ? "Completion" : "Attempt"}
            </p>
            <h1 className="mt-4 text-4xl font-bold text-foreground md:text-5xl">
              {certificationTitle}
            </h1>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">This certifies that</p>
            <p className="text-3xl font-semibold text-primary">
              {employeeName}
            </p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>

          <div className="my-8 border-t border-nuanu-grey-dark/20"></div>

          <div className="space-y-4">
            <p className="text-foreground/80">
              {passed ? "has successfully completed" : "has attempted"} the
            </p>
            <p className="text-xl font-semibold capitalize text-foreground">
              {category} Staff Assessment
            </p>
            <p className="text-sm text-muted-foreground">on {completedDate}</p>
          </div>

          {/* Score Display */}
          <div className="mx-auto mt-8 max-w-md">
            <div className="rounded-2xl border border-nuanu-grey-dark/20 bg-muted p-6">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p
                    className={`mt-2 text-5xl font-bold ${
                      passed ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {percentage}%
                  </p>
                </div>
                {/* Removed Correct Answers Counter */}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 space-y-4">
            <div className="border-t border-nuanu-grey-dark/20 pt-6">
              <p className="text-xs text-nuanu-grey-light">
                Certificate ID: {attemptId.slice(0, 8)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <a
          href="/employee"
          className="rounded-lg border border-nuanu-grey-dark/30 bg-muted px-6 py-3 font-semibold text-foreground transition hover:bg-card"
        >
          ← Back to Dashboard
        </a>

        <button
          onClick={handleCopyLink}
          className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          {copied ? "✓ Link Copied!" : "📋 Share Certificate"}
        </button>

        {!passed && (
          <p className="w-full text-center text-sm text-muted-foreground">
            You need at least 70% to pass. Contact your administrator for retake
            options.
          </p>
        )}
      </div>
    </div>
  );
}

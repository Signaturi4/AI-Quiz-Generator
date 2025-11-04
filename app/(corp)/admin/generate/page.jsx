export const dynamic = "force-dynamic";

"use client";

import { useState } from "react";

const certificationOptions = [
  { value: "sales", label: "Sales Certification" },
  { value: "hostess", label: "Hostess Certification" },
];

export default function GenerateTestPage() {
  const [formState, setFormState] = useState({
    certification: "sales",
    questionCount: 10,
    scheduleDate: "",
  });

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("Generate test payload", formState);
    // TODO: wire to Supabase RPC / OpenAI generator
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-3xl font-semibold">Generate Certification Run</h2>
        <p className="max-w-2xl text-sm text-slate-200/70">
          Configure a new assessment cycle, curate the question set, and assign
          it to the appropriate employee segment.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            <span>Certification Track</span>
            <select
              value={formState.certification}
              onChange={handleChange("certification")}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
            >
              {certificationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Number of Questions</span>
            <input
              type="number"
              min={5}
              max={50}
              value={formState.questionCount}
              onChange={handleChange("questionCount")}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
            />
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Release Date</span>
            <input
              type="date"
              value={formState.scheduleDate}
              onChange={handleChange("scheduleDate")}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Generate Draft
          </button>
          <p className="text-xs text-slate-200/60">
            Drafts are saved to the Supabase question pool before publishing.
          </p>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useTransition } from "react";

import { createDraftVersionAction } from "../actions";

type VersionActionsProps = {
  poolId: string;
  latestVersionId?: string;
  latestStatus?: string;
};

export default function VersionActions({
  poolId,
  latestVersionId,
  latestStatus,
}: VersionActionsProps) {
  const [isPending, startTransition] = useTransition();

  if (!latestVersionId) {
    return null;
  }

  const handleCreateDraft = (formData: FormData) => {
    formData.append("poolId", poolId);
    formData.append("sourceVersionId", latestVersionId);
    startTransition(async () => {
      await createDraftVersionAction(formData);
    });
  };

  return (
    <form action={handleCreateDraft} className="flex items-center gap-3 text-xs">
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-white/10 px-3 py-2 font-semibold text-slate-100 transition hover:border-sky-400/60 hover:text-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Cloning…" : "Create Draft from Latest"}
      </button>
      <span className="text-slate-300/60">
        Latest status: {latestStatus ?? "unknown"}
      </span>
    </form>
  );
}


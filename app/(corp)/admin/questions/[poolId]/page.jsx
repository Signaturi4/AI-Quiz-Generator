export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { getServerQuestionBankService } from "../../../../../lib/services/serverInstances";
import { requireAdmin } from "../../../../../lib/auth/requireAdmin";
import QuestionManager from "./QuestionManager";
import VersionActions from "./VersionActions";

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

async function getCertificationForPool(client, poolId) {
  const { data, error } = await client
    .from("certifications")
    .select("id, code, title")
    .eq("question_pool_id", poolId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load certification for pool", error);
    return null;
  }

  return data;
}

export default async function QuestionPoolDetail({ params, searchParams }) {
  await requireAdmin();
  
  const { poolId } = params;
  const selectedVersion = searchParams?.version;

  const { client, service } = getServerQuestionBankService();
  const result = await service.getPoolWithVersions(poolId);

  if (!result) {
    notFound();
  }

  const certification = await getCertificationForPool(client, poolId);

  const { pool, versions } = result;
  const effectiveVersionId = selectedVersion ?? versions[0]?.id ?? null;

  const versionData =
    effectiveVersionId && (await service.getVersionWithQuestions(effectiveVersionId));

  const versionList = versions.map((version) => ({
    id: version.id,
    versionNumber: version.versionNumber,
    status: version.status,
    notes: version.notes,
    createdAt: version.createdAt,
    publishedAt: version.publishedAt,
  }));

  const selectedVersionMeta = versionList.find((version) => version.id === effectiveVersionId);

  const questions = versionData?.questions.map((question) => ({
    id: question.id,
    topic: question.topic,
    prompt: question.prompt,
    choices: question.choices,
    answerIndex: question.answerIndex,
    explanation: question.explanation,
    difficulty: question.difficulty,
    tags: question.tags,
    orderIndex: question.orderIndex,
  })) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300/60">
            Question Pool
          </p>
          <h2 className="mt-1 text-3xl font-semibold text-white">{pool.name}</h2>
          {pool.description && (
            <p className="mt-2 max-w-2xl text-sm text-slate-200/70">
              {pool.description}
            </p>
          )}
          {certification && (
            <div className="mt-4 space-y-1 text-xs text-slate-200/60">
              <p>
                Linked certification: <span className="font-semibold">{certification.title}</span>
              </p>
              <p>Code: {certification.code}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {certification && (
            <Link
              href={`/quiz?certification=${certification.code}`}
              className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              <span className="text-white">Start Test</span>
            </Link>
          )}
          <Link
            href="/admin/questions"
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-100/40"
          >
            <span className="text-white">← Back to Question Bank</span>
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300/60">
              Versions
            </p>
            <p className="text-sm text-slate-200/70">
              Select a version to inspect questions, clone drafts, or publish updates.
            </p>
          </div>
          {versions.length > 0 && (
            <VersionActions
              poolId={pool.id}
              latestVersionId={versions[0].id}
              latestStatus={versions[0].status}
            />
          )}
        </header>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {versionList.map((version) => {
            const href = `/admin/questions/${pool.id}?version=${version.id}`;
            const isActive = version.id === effectiveVersionId;

            return (
              <Link
                key={version.id}
                href={href}
                className={`rounded-xl border px-4 py-3 transition ${
                  isActive
                    ? "border-sky-400/60 bg-sky-400/10"
                    : "border-white/10 bg-slate-950/40 hover:border-sky-400/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-300/60">
                      Version {version.versionNumber}
                    </p>
                    <p className="text-sm text-slate-200/70">
                      Status: {version.status}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-300/60">
                    <p>Created: {formatDate(version.createdAt)}</p>
                    <p>Published: {formatDate(version.publishedAt)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {effectiveVersionId ? (
        <QuestionManager
          key={effectiveVersionId}
          poolId={pool.id}
          versionId={effectiveVersionId}
          versionNumber={selectedVersionMeta?.versionNumber ?? 0}
          versionStatus={selectedVersionMeta?.status ?? "draft"}
          questions={questions}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-200/70">
          No versions available. Create a draft from the latest baseline to begin.
        </div>
      )}
    </div>
  );
}


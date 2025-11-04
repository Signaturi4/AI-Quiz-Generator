"use client";

import { useState, useTransition } from "react";

import {
  deleteQuestionAction,
  publishVersionAction,
  upsertQuestionAction,
} from "../actions";

type Choice = {
  text: string;
};

type Question = {
  id: string;
  topic: string;
  prompt: string;
  choices: Choice[];
  answerIndex: number;
  explanation: string | null;
  difficulty: string | null;
  tags: string[] | null;
  orderIndex: number | null;
};

type QuestionManagerProps = {
  poolId: string;
  versionId: string;
  versionNumber: number;
  versionStatus?: string;
  questions: Question[];
};

export default function QuestionManager({
  poolId,
  versionId,
  versionNumber,
  versionStatus = "draft",
  questions,
}: QuestionManagerProps) {
  const [activeEditor, setActiveEditor] = useState<string | "new" | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isPublishing, startPublishTransition] = useTransition();

  const handleDelete = (questionId: string) => {
    const formData = new FormData();
    formData.append("poolId", poolId);
    formData.append("questionId", questionId);

    startDeleteTransition(async () => {
      await deleteQuestionAction(formData);
      setActiveEditor(null);
    });
  };

  const handlePublish = () => {
    const formData = new FormData();
    formData.append("poolId", poolId);
    formData.append("versionId", versionId);

    startPublishTransition(async () => {
      await publishVersionAction(formData);
    });
  };

  return (
    <section className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300/60">
            Version Details
          </p>
          <p className="text-sm text-slate-200/70">
            Version {versionNumber} • Status: {versionStatus}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            onClick={() => setActiveEditor("new")}
            className="rounded-lg border border-white/10 px-3 py-2 font-semibold text-slate-100 transition hover:border-sky-400/60 hover:text-sky-100"
          >
            + Add Question
          </button>
          {versionStatus !== "published" && (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="rounded-lg border border-emerald-400/40 px-3 py-2 font-semibold text-emerald-200 transition hover:border-emerald-300 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPublishing ? "Publishing…" : "Publish Version"}
            </button>
          )}
        </div>
      </header>

      {activeEditor === "new" && (
        <QuestionForm
          key="new-question"
          poolId={poolId}
          versionId={versionId}
          onClose={() => setActiveEditor(null)}
        />
      )}

      <div className="space-y-4">
        {questions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-sm text-slate-200/70">
            This version has no questions yet. Add questions to activate the certification.
          </p>
        ) : (
          questions.map((question, index) => {
            const isEditing = activeEditor === question.id;
            return (
              <div
                key={question.id}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-300/60">
                      Question {index + 1} • Topic: {question.topic}
                    </p>
                    <h3 className="text-lg font-semibold text-white">
                      {question.prompt}
                    </h3>
                    <ul className="space-y-1 text-sm text-slate-200/70">
                      {question.choices.map((choice, choiceIndex) => (
                        <li
                          key={`${question.id}-${choiceIndex}`}
                          className={
                            choiceIndex === question.answerIndex
                              ? "font-semibold text-emerald-300"
                              : ""
                          }
                        >
                          {choiceIndex + 1}. {choice.text}
                        </li>
                      ))}
                    </ul>
                    {question.explanation && (
                      <p className="text-xs text-slate-300/60">
                        Explanation: {question.explanation}
                      </p>
                    )}
                    {question.tags?.length ? (
                      <p className="text-xs text-slate-300/60">
                        Tags: {question.tags.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() =>
                        setActiveEditor((current) =>
                          current === question.id ? null : question.id
                        )
                      }
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-sky-400/60 hover:text-sky-100"
                    >
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                    <button
                      onClick={() => handleDelete(question.id)}
                      disabled={isDeleting}
                      className="rounded-lg border border-rose-400/40 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:border-rose-300 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDeleting ? "Removing…" : "Delete"}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <QuestionForm
                      poolId={poolId}
                      versionId={versionId}
                      question={question}
                      onClose={() => setActiveEditor(null)}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

type QuestionFormProps = {
  poolId: string;
  versionId: string;
  question?: Question;
  onClose?: () => void;
};

function QuestionForm({ poolId, versionId, question, onClose }: QuestionFormProps) {
  const [topic, setTopic] = useState(question?.topic ?? "general");
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [choices, setChoices] = useState<string[]>(
    question?.choices?.map((choice) => choice.text) ?? [""]
  );
  const [answerIndex, setAnswerIndex] = useState<number>(question?.answerIndex ?? 0);
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [difficulty, setDifficulty] = useState(question?.difficulty ?? "");
  const [tags, setTags] = useState(question?.tags?.join(", ") ?? "");
  const [orderIndex, setOrderIndex] = useState<number | "">(
    typeof question?.orderIndex === "number" ? question.orderIndex : ""
  );
  const [isPending, startTransition] = useTransition();

  const isEdit = Boolean(question);

  const handleChoiceUpdate = (index: number, value: string) => {
    setChoices((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddChoice = () => {
    setChoices((prev) => [...prev, ""]);
  };

  const handleRemoveChoice = (index: number) => {
    setChoices((prev) => prev.filter((_, idx) => idx !== index));
    setAnswerIndex((prev) => (prev >= index ? Math.max(0, prev - 1) : prev));
  };

  const handleSubmit = (formData: FormData) => {
    const serializedChoices = choices
      .map((choice) => choice.trim())
      .filter(Boolean);

    formData.append(
      "choices",
      JSON.stringify(serializedChoices.map((text) => ({ text })))
    );
    formData.set("answerIndex", String(answerIndex));
    if (orderIndex !== "" && orderIndex !== null) {
      formData.set("orderIndex", String(orderIndex));
    }
    formData.set("topic", topic.trim());
    formData.set("prompt", prompt.trim());
    formData.set("explanation", explanation.trim());
    formData.set("difficulty", difficulty.trim());
    formData.set("tags", tags);

    startTransition(async () => {
      await upsertQuestionAction(formData);
      onClose?.();
    });
  };

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        formData.append("poolId", poolId);
        formData.append("versionId", versionId);
        if (question?.id) {
          formData.append("questionId", question.id);
        }
        handleSubmit(formData);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/60">
          <span>Topic</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            required
          />
        </label>
        <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/60">
          <span>Difficulty</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
            placeholder="Beginner / Intermediate / Advanced"
          />
        </label>
      </div>

      <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/60">
        <span>Prompt</span>
        <textarea
          className="min-h-[120px] w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm leading-relaxed text-slate-100 focus:border-sky-400 focus:outline-none"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          required
        />
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/60">
            Choices
          </p>
          <button
            type="button"
            onClick={handleAddChoice}
            className="rounded border border-white/10 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400/60 hover:text-sky-100"
          >
            + Add Choice
          </button>
        </div>

        <div className="space-y-2">
          {choices.map((choice, index) => (
            <div key={index} className="flex items-center gap-3">
              <input
                className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                value={choice}
                onChange={(event) => handleChoiceUpdate(index, event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => handleRemoveChoice(index)}
                className="rounded border border-white/10 px-2 py-1 text-xs text-rose-200 transition hover:border-rose-400/60 hover:text-rose-100"
                disabled={choices.length <= 2}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/60">
          <span>Correct Choice</span>
          <select
            className="rounded border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
            value={Math.min(answerIndex, choices.length - 1)}
            onChange={(event) => setAnswerIndex(Number(event.target.value))}
          >
            {choices.map((_, index) => (
              <option key={index} value={index}>
                Choice {index + 1}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/60">
        <span>Explanation</span>
        <textarea
          className="min-h-[80px] w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm leading-relaxed text-slate-100 focus:border-sky-400 focus:outline-none"
          value={explanation ?? ""}
          onChange={(event) => setExplanation(event.target.value)}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/60">
          <span>Tags (comma separated)</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="e.g. onboarding, crm"
          />
        </label>
        <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/60">
          <span>Order</span>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
            value={orderIndex === "" ? "" : orderIndex}
            onChange={(event) =>
              setOrderIndex(event.target.value === "" ? "" : Number(event.target.value))
            }
          />
        </label>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => onClose?.()}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300/80 transition hover:border-slate-100/40 hover:text-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-emerald-400/40 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Question"}
        </button>
      </div>
    </form>
  );
}


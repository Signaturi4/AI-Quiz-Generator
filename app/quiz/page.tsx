"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { motion, useSpring } from "framer-motion";

import LoadingScreen from "../components/LoadingScreen";

import "highlight.js/styles/atom-one-dark.css";
import hljs from "highlight.js";

type QuizQuestion = {
  id: string;
  prompt: string;
  choices: { text: string }[];
  answerIndex: number;
  explanation?: string | null;
  difficulty?: string | null;
  tags?: string[] | null;
};

type QuizInitResponse = {
  attemptId: string;
  questions: QuizQuestion[];
};

const QuizPage = () => {
  const params = useSearchParams();
  const router = useRouter();

  const certification = params?.get("certification") ?? "";
  const topic = params?.get("topic") ?? undefined;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [responses, setResponses] = useState<
    { questionId: string; choiceIndex: number; correct: boolean }[]
  >([]);
  const [isSubmitting, startSubmit] = useTransition();

  const progress = questions.length
    ? (currentIndex + (selectedChoice !== null ? 0.75 : 0)) / questions.length
    : 0;
  const scaleX = useSpring(progress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.002,
  });

  useEffect(() => {
    hljs.highlightAll();
  }, [questions, currentIndex]);

  useEffect(() => {
    if (!certification) return;

    const controller = new AbortController();
    const initializeQuiz = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/quiz", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ certificationCode: certification, topic }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json();
          const errorMessage =
            payload.details || payload.error || "Failed to start quiz";
          setError(errorMessage);
          throw new Error(errorMessage);
        }

        const payload: QuizInitResponse = await response.json();
        setAttemptId(payload.attemptId);
        setQuestions(payload.questions);
        setResponses([]);
        setCurrentIndex(0);
        setSelectedChoice(null);
      } catch (err) {
        console.error("Quiz init error", err);
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeQuiz();

    return () => controller.abort();
  }, [certification, topic]);

  useEffect(() => {
    scaleX.set(progress);
  }, [progress, scaleX]);

  const currentQuestion = useMemo(
    () => questions[currentIndex],
    [questions, currentIndex]
  );

  const handleChoiceSelect = (choiceIndex: number) => {
    if (isSubmitting) return;
    setSelectedChoice(choiceIndex);
  };

  const submitAttempt = (
    finalResponses: {
      questionId: string;
      choiceIndex: number;
      correct: boolean;
    }[]
  ) => {
    if (!attemptId) return;

    startSubmit(async () => {
      try {
        const response = await fetch("/api/quiz", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attemptId,
            responses: finalResponses.map((response) => ({
              questionId: response.questionId,
              choiceIndex: response.choiceIndex,
            })),
          }),
        });

        if (!response.ok) {
          const errorPayload = await response.json();
          throw new Error(errorPayload.error ?? "Failed to submit attempt");
        }

        const result = await response.json();
        // Redirect to the certification result page
        router.push(`/employee/${certification}/result?attempt=${attemptId}`);
      } catch (error) {
        console.error("Attempt submission failed", error);
      }
    });
  };

  const handleAdvance = () => {
    if (selectedChoice === null || !currentQuestion) return;

    const isCorrect = selectedChoice === currentQuestion.answerIndex;
    const updatedResponses = [
      ...responses,
      {
        questionId: currentQuestion.id,
        choiceIndex: selectedChoice,
        correct: isCorrect,
      },
    ];

    setResponses(updatedResponses);

    if (currentIndex === questions.length - 1) {
      submitAttempt(updatedResponses);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedChoice(null);
    }
  };

  return (
    <div>
      <motion.div className="progress-bar" style={{ scaleX }} />

      {isLoading ? (
        <LoadingScreen responseStream="Preparing quiz…" />
      ) : error ? (
        <div className="mx-auto max-w-2xl space-y-6 pt-8">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 shadow-md">
            <h2 className="text-xl font-semibold text-destructive">
              ⚠️ Unable to Start Quiz
            </h2>
            <p className="mt-3 text-sm text-foreground">{error}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => router.push("/employee")}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg border border-nuanu-grey-dark/30 bg-muted px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/80"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : questions.length === 0 ? (
        <LoadingScreen responseStream="Loading questions…" />
      ) : (
        <div className="mx-auto max-w-3xl space-y-8 pt-8">
          <header className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <img
                src="/icons/logo.jpg"
                alt="Nuanu Logo"
                className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
              />
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Sales Certification Assessment
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Question {questions.length ? currentIndex + 1 : 0} of{" "}
              {questions.length}
            </h1>
          </header>

          {currentQuestion ? (
            <div className="space-y-6">
              <section className="gradient-nuanu-card rounded-2xl border border-nuanu-grey-dark/30 p-6 shadow-md">
                <h2 className="text-lg font-semibold text-foreground">
                  {currentQuestion.prompt}
                </h2>
                <div className="mt-6 grid gap-3">
                  {currentQuestion.choices.map((choice, index) => {
                    const isSelected = selectedChoice === index;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleChoiceSelect(index)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                          isSelected
                            ? "border-primary bg-primary/20 font-medium text-primary"
                            : "border-nuanu-grey-dark/30 bg-background text-foreground hover:border-primary/50 hover:bg-primary/5"
                        }`}
                        disabled={isSubmitting}
                      >
                        {choice.text}
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Answer each question in order. You cannot return to previous
                  questions.
                </p>
                <button
                  type="button"
                  onClick={handleAdvance}
                  disabled={selectedChoice === null || isSubmitting}
                  className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
                    selectedChoice === null || isSubmitting
                      ? "cursor-not-allowed border border-nuanu-grey-dark/30 bg-muted text-nuanu-grey-dark"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {currentIndex === questions.length - 1
                    ? "Submit Assessment"
                    : "Next Question"}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-nuanu-grey-dark/30 bg-card p-6 text-sm text-muted-foreground">
              No questions are available for this assessment. Please contact an
              administrator.
            </div>
          )}

          {isSubmitting && (
            <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Submitting attempt…
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizPage;

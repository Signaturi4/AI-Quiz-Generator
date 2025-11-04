import { ReactNode, useEffect, useState } from "react";

import { HiCheck, HiOutlineXMark } from "react-icons/hi2";

type Choice = string | { text: string };

type QuestionProps = {
  id: number;
  question: {
    id: string;
    prompt: string;
    choices: Choice[];
    answerIndex: number;
    explanation?: string | null;
  };
  onSubmit: (payload: { questionId: string; choiceIndex: number; correct: boolean }) => void;
};

const Question = ({ question, id, onSubmit }: QuestionProps) => {
  const { id: questionId, prompt, choices, answerIndex, explanation } = question;

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isExplained, setIsExplained] = useState(false);
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const normalizeChoices = (choiceList: Choice[]) =>
    choiceList.map((choice) => ({
      text: typeof choice === "string" ? choice : choice.text,
      isSelected: false,
    }));

  const [choiceObjects, setChoiceObjects] = useState(
    () =>
      normalizeChoices(choices)
  );

  useEffect(() => {
    setChoiceObjects(normalizeChoices(choices));
    setIsSubmitted(false);
    setIsExplained(false);
    setSelectedChoiceIndex(null);
  }, [choices]);

  const isCorrect = (index: number | null) => {
    if (index === null) return false;
    return Number(answerIndex) === index;
  };

  const handleChoiceSelect = (choiceIndex: number) => {
    if (isSubmitted) return;

    setSelectedChoiceIndex(choiceIndex);

    setChoiceObjects((prevChoices) =>
      prevChoices.map((choice, index) => ({
        ...choice,
        isSelected: index === choiceIndex,
      }))
    );
  };

  const handleAnswerSubmit = () => {
    if (isSubmitted || selectedChoiceIndex === null) return;

    const correct = isCorrect(selectedChoiceIndex);
    setIsSubmitted(true);
    setIsExplained(correct);
    onSubmit({ questionId, choiceIndex: selectedChoiceIndex, correct });
  };

  const handleExplain = () => {
    setIsExplained(true);
  };

  const submitButtonStyles = () => {
    if (isSubmitted) {
      return "pointer-events-none border-gray-500 bg-stone-700 opacity-50";
    }
    if (selectedChoiceIndex !== null) {
      return "pointer-events-auto bg-cyan-600/75";
    }
    return "pointer-events-none border-gray-500 bg-stone-700";
  };

  const explainButtonStyles = () => {
    return isExplained ? "pointer-events-none opacity-50" : "pointer-events-auto";
  };

  const renderChoices = () => {
    return choiceObjects.map((choice, index) => {
      let style = choice.isSelected
        ? "border-cyan-600/75 bg-cyan-600/20"
        : "border-gray-500 hover:bg-cyan-600/10";

      let checkOrX: ReactNode = null;

      if (isSubmitted) {
        if (index === selectedChoiceIndex) {
          if (isCorrect(selectedChoiceIndex)) {
            style = "border-emerald-300 bg-emerald-300/10";
            checkOrX = (
              <div>
                <HiCheck size={30} color="#6ee7b7" />
              </div>
            );
          } else {
            style = "border-red-400 bg-red-400/10";
            checkOrX = (
              <div>
                <HiOutlineXMark size={30} color="#f87171" />
              </div>
            );
          }
        }
      }

      if (isExplained && index === Number(answerIndex)) {
        style = "border-emerald-300 bg-emerald-300/10";
        checkOrX = (
          <div>
            <HiCheck size={30} color="#6ee7b7" />
          </div>
        );
      }

      return (
        <div
          key={index}
          className={`w-full p-4 text-left border rounded cursor-pointer ${style} flex items-center justify-between`}
          onClick={() => handleChoiceSelect(index)}
        >
          <pre className=" whitespace-pre-wrap">
            <code
              className="rounded"
              style={{
                padding: 5,
                backgroundColor: "transparent",
              }}
            >
              {choice.text}
            </code>
          </pre>

          {checkOrX}
        </div>
      );
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-sm font-semibold text-gray-300/80">Question {id + 1}</h2>
      <div className="border border-gray-500/0 rounded">
        <div className="py-2 mt-2 text-xl">{prompt}</div>
        <div className="grid gap-2 mt-4">{renderChoices()}</div>
        <div className="flex items-center justify-end gap-2 mt-2">
          {isSubmitted && (
            <button
              onClick={handleExplain}
              className={`px-6 py-3 border-gray-500 rounded bg-stone-700 hover:bg-stone-600 ${explainButtonStyles()}`}
            >
              Explain
            </button>
          )}
          <button onClick={handleAnswerSubmit} className={`px-6 py-3 rounded ${submitButtonStyles()}`}>
            {isSubmitted ? "Submitted" : "Submit"}
          </button>
        </div>
        {((isSubmitted && isCorrect(selectedChoiceIndex)) || isExplained) && explanation && (
          <div className="mt-2 p-4 rounded bg-stone-700/50">
            <h3 className="text-emerald-300/60 text-sm font-bold">Explanation</h3>
            <p className="mt-2 text-sm font-light">{explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Question;

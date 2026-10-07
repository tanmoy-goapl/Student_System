import React from "react";
import { Answer } from "@/constants/practicepage-data";

interface AnswerOptionProps {
  answer: Answer;
  isSelected: boolean;
  isAnswered: boolean;
  onSelect: () => void;
}

function renderFormattedText(text: string): React.ReactNode {
  if (!text) return "";
  let cleanText = text;
  if (cleanText.endsWith("**") && (cleanText.match(/\*\*/g) || []).length === 1) {
    cleanText = "**" + cleanText;
  } else if (cleanText.startsWith("**") && (cleanText.match(/\*\*/g) || []).length === 1) {
    cleanText = cleanText + "**";
  }
  const regex = /(\*\*.*?\*\*|\*.*?\*|\`.*?\`)/g;
  const parts = cleanText.split(regex);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={index} className="italic text-slate-300">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={index} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/80 font-mono text-sm text-pink-400">{part.slice(1, -1)}</code>;
        }
        return part;
      })}
    </>
  );
}

export default function AnswerOption({
  answer,
  isSelected,
  isAnswered,
  onSelect,
}: AnswerOptionProps) {
  const isCorrect = answer.isCorrect;
  const showCorrect =
    isAnswered && isCorrect;
  const showIncorrect =
    isAnswered && !isCorrect && isSelected;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isAnswered}
      className={`
        w-full min-w-0 p-4 rounded-xl border-2 transition-all duration-200
        flex items-center gap-4
        ${
          showCorrect
            ? "bg-emerald-500/10 border-emerald-500/50"
            : showIncorrect
              ? "bg-red-500/10 border-red-500/50"
              : isSelected && !isAnswered
                ? "bg-[#5B5FFF]/10 border-[#5B5FFF]/50"
                : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/50"
        }
      `}
    >
      {/* Answer Label */}
      <div
        className={`
          flex items-center justify-center w-10 h-10 shrink-0
          rounded-lg font-bold text-sm
          ${
            showCorrect
              ? "bg-emerald-500/20 text-emerald-400"
              : showIncorrect
                ? "bg-red-500/20 text-red-400"
                : isSelected && !isAnswered
                  ? "bg-[#5B5FFF]/20 text-[#8F93FF]"
                  : "bg-slate-700/30 text-slate-400"
          }
        `}
      >
        {answer.id}
      </div>

      {/* Answer Text */}
      <span
        className={`
          min-w-0 flex-1 text-left text-base font-medium break-words whitespace-pre-wrap
          ${
            showCorrect || showIncorrect
              ? isCorrect
                ? "text-emerald-400"
                : "text-red-400"
              : "text-slate-200"
          }
        `}
      >
        {renderFormattedText(answer.text)}
      </span>

      {/* Feedback Icons */}
      {isAnswered && (
        <div className="ml-auto">
          {showCorrect && (
            <span className="text-xl">✓</span>
          )}
          {showIncorrect && (
            <span className="text-xl">✗</span>
          )}
        </div>
      )}
    </button>
  );
}
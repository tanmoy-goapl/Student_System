import { Answer } from "@/constants/practicepage-data";

interface AnswerOptionProps {
  answer: Answer;
  isSelected: boolean;
  isAnswered: boolean;
  onSelect: () => void;
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
      onClick={onSelect}
      disabled={isAnswered}
      className={`
        w-full p-4 rounded-xl border-2 transition-all duration-200
        flex items-center gap-4
        ${
          showCorrect
            ? "bg-emerald-500/10 border-emerald-500/50"
            : showIncorrect
              ? "bg-red-500/10 border-red-500/50"
              : isSelected && !isAnswered
                ? "bg-blue-500/10 border-blue-500/50"
                : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/50"
        }
      `}
    >
      {/* Answer Label */}
      <div
        className={`
          flex items-center justify-center w-10 h-10
          rounded-lg font-bold text-sm
          ${
            showCorrect
              ? "bg-emerald-500/20 text-emerald-400"
              : showIncorrect
                ? "bg-red-500/20 text-red-400"
                : isSelected && !isAnswered
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-slate-700/30 text-slate-400"
          }
        `}
      >
        {answer.id}
      </div>

      {/* Answer Text */}
      <span
        className={`
          text-left text-base font-medium
          ${
            showCorrect || showIncorrect
              ? isCorrect
                ? "text-emerald-400"
                : "text-red-400"
              : "text-slate-200"
          }
        `}
      >
        {answer.text}
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
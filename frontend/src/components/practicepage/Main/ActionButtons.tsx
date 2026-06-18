interface ActionButtonsProps {
  answered: boolean;
  selectedAnswer: string | null;
  onSubmit: () => void;
  onHint: () => void;
  onSkip: () => void;
  onNext?: () => void;
  canProceed: boolean;
}

export default function ActionButtons({
  answered,
  selectedAnswer,
  onSubmit,
  onHint,
  onSkip,
  onNext,
  canProceed,
}: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {/* Submit/Next Button */}
      {answered ? (
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`
            flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200
            ${
              canProceed
                ? "bg-[#5B5FFF] hover:bg-[#4c4fdb] text-white hover:shadow-lg hover:scale-105 active:scale-95 shadow-indigo-500/15 border border-[#7276ff]/20"
                : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            }
          `}
        >
          Next Question
        </button>
      ) : (
        <button
          onClick={onSubmit}
          disabled={!selectedAnswer}
          className={`
            flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200
            ${
              selectedAnswer
                ? "bg-[#5B5FFF] hover:bg-[#4c4fdb] text-white hover:shadow-lg hover:scale-105 active:scale-95 shadow-indigo-500/15 border border-[#7276ff]/20"
                : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            }
          `}
        >
          Submit Answer
        </button>
      )}

      {/* Hint Button */}
      {!answered && (
        <button
          onClick={onHint}
          className="px-6 py-3 rounded-xl border-2 border-amber-500/50 text-amber-400 font-semibold hover:bg-amber-500/10 hover:border-amber-500 transition-all duration-200"
        >
          💡 Hint
        </button>
      )}

      {/* Skip Button */}
      <button
        onClick={onSkip}
        className="px-6 py-3 rounded-xl border-2 border-slate-600/50 text-slate-300 font-semibold hover:bg-slate-800/50 hover:border-slate-500 transition-all duration-200"
      >
        ⏭️ Skip
      </button>
    </div>
  );
}
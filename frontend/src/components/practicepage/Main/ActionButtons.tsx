interface ActionButtonsProps {
  answered: boolean;
  selectedAnswer: string | null;
  onSubmit: () => void;
  onHint: () => void;
  onSkip: () => void;
  onNext?: () => void;
  canProceed: boolean;
  isLastQuestion?: boolean;
}

export default function ActionButtons({
  answered,
  selectedAnswer,
  onSubmit,
  onHint,
  onSkip,
  onNext,
  canProceed,
  isLastQuestion = false,
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
          {isLastQuestion ? "Finish Practice" : "Next Question"}
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
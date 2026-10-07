interface ActionButtonsProps {
  answered: boolean;
  selectedAnswer: string | null;
  onSubmit: () => void;
  onHint: () => void;
  onSkip: () => void;
  onNext?: () => void;
  canProceed: boolean;
  isLastQuestion?: boolean;
  isSubmitting?: boolean;
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
  isSubmitting = false,
}: ActionButtonsProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
      {/* Submit/Next Button */}
      {answered ? (
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed || isSubmitting}
          className={`
            w-full sm:flex-1 min-w-0 px-6 py-3 rounded-xl font-semibold transition-all duration-200 break-words
            ${
              canProceed && !isSubmitting
                ? "bg-[#5B5FFF] hover:bg-[#4c4fdb] text-white hover:shadow-lg hover:scale-105 active:scale-95 shadow-indigo-500/15 border border-[#7276ff]/20"
                : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            }
          `}
        >
          {isSubmitting ? "Saving..." : isLastQuestion ? "Finish Practice" : "Next Question"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!selectedAnswer || isSubmitting}
          className={`
            w-full sm:flex-1 min-w-0 px-6 py-3 rounded-xl font-semibold transition-all duration-200 break-words
            ${
              selectedAnswer && !isSubmitting
                ? "bg-[#5B5FFF] hover:bg-[#4c4fdb] text-white hover:shadow-lg hover:scale-105 active:scale-95 shadow-indigo-500/15 border border-[#7276ff]/20"
                : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            }
          `}
        >
          {isSubmitting ? "Checking Answer..." : "Submit Answer"}
        </button>
      )}

      {/* Skip Button */}
      <button
        type="button"
        onClick={onSkip}
        disabled={isSubmitting}
        className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-xl border-2 border-slate-600/50 text-slate-300 font-semibold hover:bg-slate-800/50 hover:border-slate-500 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ⏭️ Skip
      </button>
    </div>
  );
}
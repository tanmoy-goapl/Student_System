interface ProgressIndicatorProps {
  currentQuestion: number;
  totalQuestions: number;
}

export default function ProgressIndicator({
  currentQuestion,
  totalQuestions,
}: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/20 shadow-lg">
      <div className="text-center">
        <div className="text-xs font-bold text-white">
          {currentQuestion}
        </div>
        <div className="text-[0.65rem] text-slate-400">
          of {totalQuestions}
        </div>
      </div>
    </div>
  );
}
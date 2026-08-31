interface ProgressIndicatorProps {
  currentQuestion: number;
  totalQuestions: number;
}

export default function ProgressIndicator({
  currentQuestion,
  totalQuestions,
}: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-violet-500/15 border border-violet-500/35 shadow-lg shadow-violet-500/10 backdrop-blur-sm">
      <div className="text-center">
        <div className="text-sm font-black text-white leading-none">
          {currentQuestion}
        </div>
        <div className="text-[0.55rem] font-bold text-violet-300 uppercase tracking-widest mt-0.5">
          of {totalQuestions}
        </div>
      </div>
    </div>
  );
}
interface SessionProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  progressColor: string;
}

export default function SessionProgress({
  currentQuestion,
  totalQuestions,
  progressColor,
}: SessionProgressProps) {
  const colors = [
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-red-500",
  ];

  return (
    <div className="flex flex-col gap-2 items-center">

      <div className="flex items-center gap-1">
        {Array.from({ length: totalQuestions }).map(
          (_, index) => (
            <div
              key={index}
              className={`
              w-2 h-2 rounded-full transition-all duration-300
              ${index < currentQuestion
                  ? colors[index % colors.length]
                  : index === currentQuestion - 1
                    ? `${colors[index % colors.length]} ring-2 ring-offset-1 ring-offset-slate-900`
                    : "bg-slate-700"
                }
            `}
            />
          )
        )}

      </div>
      <span className="ml-3 text-xs text-slate-400">
        Session progress
      </span>
    </div>
  );
}
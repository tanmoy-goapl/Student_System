interface QuestionCounterProps {
  value: number;
  onChange: (count: number) => void;
}

const QUESTION_OPTIONS = [2, 10, 20, 30, 40];

export default function QuestionCounter({
  value,
  onChange,
}: QuestionCounterProps) {
  return (
    <div className="flex gap-2">
      {QUESTION_OPTIONS.map((count) => (
        <button
          key={count}
          onClick={() => onChange(count)}
          className={`
            flex-1 px-3 py-2 rounded-lg text-xs font-medium
            transition-all duration-200 border
            ${
              value === count
                ? "bg-[#5B5FFF]/20 border-[#5B5FFF]/40 text-white"
                : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
            }
          `}
        >
          {count}
        </button>
      ))}
    </div>
  );
}
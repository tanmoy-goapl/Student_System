import { Difficulty } from "@/constants/practicepage-data";

interface DifficultySelectorProps {
  difficulties: Difficulty[];
  selectedDifficulty: string;
  onSelectDifficulty: (value: string) => void;
}

export default function DifficultySelector({
  difficulties,
  selectedDifficulty,
  onSelectDifficulty,
}: DifficultySelectorProps) {
  return (
    <div className="flex gap-2">
      {difficulties.map((difficulty) => (
        <button
          key={difficulty.value}
          onClick={() =>
            onSelectDifficulty(difficulty.value)
          }
          className={`
            flex-1 px-3 py-2 rounded-lg text-xs font-medium
            transition-all duration-200 border
            ${
              selectedDifficulty === difficulty.value
                ? "bg-[#5B5FFF]/20 border-[#5B5FFF]/40 text-white"
                : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
            }
          `}
        >
          {difficulty.label}
        </button>
      ))}
    </div>
  );
}
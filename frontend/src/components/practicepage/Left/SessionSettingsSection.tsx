// SessionSettingsSection.tsx

import { Difficulty } from "@/constants/practicepage-data";
import DifficultySelector from "./DifficultySelector";
import QuestionCounter from "./QuestionCounter";

interface SessionSettingsSectionProps {
  difficulties: Difficulty[];
  selectedDifficulty: string;
  onSelectDifficulty: (value: string) => void;
  questionCount: number;
  onQuestionCountChange: (
    count: number
  ) => void;
}

export default function SessionSettingsSection({
  difficulties,
  selectedDifficulty,
  onSelectDifficulty,
  questionCount,
  onQuestionCountChange,
}: SessionSettingsSectionProps) {
  return (
    <div className="px-4 py-4 border-b border-white/10">
      <h3 className="text-xs text-white/40 mb-4">
        Session Settings
      </h3>

      {/* Difficulty */}
      <div className="mb-2">
        <label className="text-xs text-white/50 mb-2 block">
          Difficulty
        </label>

        <DifficultySelector
          difficulties={difficulties}
          selectedDifficulty={
            selectedDifficulty
          }
          onSelectDifficulty={
            onSelectDifficulty
          }
        />
      </div>

      {/* Question Count */}
      <div>
        <label className="text-xs text-white/50 mb-2 block">
          Questions
        </label>

        <QuestionCounter
          value={questionCount}
          onChange={
            onQuestionCountChange
          }
        />
      </div>
    </div>
  );
}
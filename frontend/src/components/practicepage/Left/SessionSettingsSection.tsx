// SessionSettingsSection.tsx

import { Switch, ConfigProvider } from "antd";

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

      {/* Timer Toggle */}
      <div
        className="
          mt-5
          flex items-center justify-between
          p-3 rounded-xl
          bg-white/[0.03]
          border border-white/10
        "
      >
        <div className="flex flex-col">
          <span className="text-xs font-medium text-white">
            Timer Mode
          </span>

          <span className="text-[10px] text-white/40 mt-0.5">
            Track solving speed
          </span>
        </div>

        <ConfigProvider
          theme={{
            token: {
              colorPrimary: "#5B5FFF",
            },
            components: {
              Switch: {
                colorPrimary: "#5B5FFF",
                colorPrimaryHover: "#4c4fdb",
              },
            },
          }}
        >
          <Switch
            defaultChecked
            size="small"
          />
        </ConfigProvider>
      </div>
    </div>
  );
}
import { PracticeMode } from "@/constants/practicepage-data";
import PracticeModeCard from "./PracticeModeCard";

interface PracticeModeSectionProps {
  modes: PracticeMode[];
  selectedMode: string;
  onSelectMode: (modeId: string) => void;
}

export default function PracticeModeSection({
  modes,
  selectedMode,
  onSelectMode,
}: PracticeModeSectionProps) {
  return (
    <div className="px-4 py-4 border-b border-white/10">
      <h3 className="text-xs text-white/40 mb-3">
        Practice Mode
      </h3>
      <div className="space-y-2">
        {modes.map((mode) => (
          <PracticeModeCard
            key={mode.id}
            mode={mode}
            isSelected={selectedMode === mode.id}
            onSelect={() => onSelectMode(mode.id)}
          />
        ))}
      </div>
    </div>
  );
}
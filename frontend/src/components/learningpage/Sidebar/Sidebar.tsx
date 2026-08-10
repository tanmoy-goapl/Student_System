import { memo } from "react";
import { CommonMistakes } from "./CommonMistakes";
import { SidebarResponse } from "./types";
import { UnderstandingLevel } from "./UnderstandingLevel";
import { QuickActions } from "../QuickActions";
import { QuickAction } from "@/constants/learningpage-data";
import { AISuggestions } from "./AISuggestions";


interface SidebarProps {
  data: SidebarResponse["data"];
  quickActions: QuickAction[];
  onActionClick?: (id: string) => void;
  onSuggestionClick?: (id: string) => void;
}

export const Sidebar = memo(function Sidebar({ 
  data, 
  quickActions,
  onActionClick,
  onSuggestionClick
}: SidebarProps) {
  return (
    <aside className="w-full space-y-4">
      <UnderstandingLevel data={data.understandingLevel} />
      <CommonMistakes data={data.commonMistakes} />
      <AISuggestions
        data={data.aiSuggestions}
        onSuggestionClick={onSuggestionClick}
      />
      <QuickActions
        actions={quickActions}
        onActionClick={onActionClick}
      />
    </aside>
  );
});
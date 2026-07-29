import { memo } from "react";
import { AISuggestions } from "./AISuggestions";
import { CommonMistakes } from "./CommonMistakes";
import { RelatedDocuments } from "./RelatedDocuments";
import { TimeSpent } from "./TimeSpent";
import { SidebarResponse } from "./types";
import { UnderstandingLevel } from "./UnderstandingLevel";


interface SidebarProps {
  data: SidebarResponse["data"];
  onSuggestionClick?: (id: string) => void;
  onDocumentClick?: (id: string) => void;
}

export const Sidebar = memo(function Sidebar({ 
  data, 
  onSuggestionClick, 
  onDocumentClick 
}: SidebarProps) {
  return (
    <aside className="w-full space-y-4">
      <UnderstandingLevel data={data.understandingLevel} />
      <CommonMistakes data={data.commonMistakes} />
      <AISuggestions
        data={data.aiSuggestions}
        onSuggestionClick={onSuggestionClick}
      />
      <RelatedDocuments
        data={data.relatedDocuments}
        onDocumentClick={onDocumentClick}
      />
      <TimeSpent data={data.timeSpent} />
    </aside>
  );
});
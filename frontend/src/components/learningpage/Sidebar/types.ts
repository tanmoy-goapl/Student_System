// ==================== UNDERSTANDING LEVEL ====================
export interface SkillMetric {
  id: string;
  label: string;
  percentage: number;
  color: string;
}

export interface UnderstandingLevelData {
  mainPercentage: number;
  status: "weak" | "medium" | "strong";
  skillBreakdown: SkillMetric[];
  baselineText: string;
}

// ==================== COMMON MISTAKES ====================
export interface CommonMistake {
  id: string;
  text: string;
  severity: "low" | "medium" | "high";
}

export interface CommonMistakesData {
  mistakes: CommonMistake[];
}

// ==================== AI SUGGESTIONS ====================
export interface AISuggestion {
  id: string;
  label: string;
  icon: React.ElementType;
  color: "indigo" | "amber" | "cyan";
  onClick?: () => void;
}

export interface AISuggestionsData {
  suggestions: AISuggestion[];
}

// ==================== RELATED DOCUMENTS ====================
export type DocumentType = "pdf" | "note" | "pyq";

export interface RelatedDocument {
  id: string;
  title: string;
  type: DocumentType;
  icon: React.ElementType;
}

export interface RelatedDocumentsData {
  documents: RelatedDocument[];
}

// ==================== TIME SPENT ====================
export interface TimeMetric {
  id: string;
  label: string;
  value: string;
  color: string;
}

export interface TimeSpentData {
  metrics: TimeMetric[];
  comparison: {
    value: string;
    trend: "up" | "down" | "neutral";
    text: string;
  };
}

// ==================== SIDEBAR RESPONSE ====================
export interface SidebarResponse {
  success: boolean;
  data: {
    understandingLevel: UnderstandingLevelData;
    commonMistakes: CommonMistakesData;
    aiSuggestions: AISuggestionsData;
    relatedDocuments: RelatedDocumentsData;
    timeSpent: TimeSpentData;
  };
}
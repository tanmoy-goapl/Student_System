import { RelatedConcept } from "@/constants/learningpage-data";
import { ArrowLeft, ArrowRight, Link } from "lucide-react";

interface RelatedConceptsProps {
  title?: string;
  concepts: RelatedConcept[];
  onConceptClick?: (concept: RelatedConcept) => void;
}

interface RelatedConceptChipProps {
  concept: RelatedConcept;
  onClick?: (concept: RelatedConcept) => void;
}

function RelatedConceptChip({
  concept,
  onClick,
}: RelatedConceptChipProps) {
  return (
    <button
      onClick={() => onClick?.(concept)}
      className="flex items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/15 px-5 py-3 text-xs text-indigo-100 transition-all duration-200 hover:bg-indigo-500/20"
    >
      {concept.label}
      <ArrowRight className="h-4 w-4 text-indigo-400" />
    </button>
  );
}

export function RelatedConcepts({
  title = 'RELATED CONCEPTS',
  concepts,
  onConceptClick,
}: RelatedConceptsProps) {
  return (
    <div >
      <div className="flex items-center gap-2 mb-4">
        <Link className="w-5 h-5 text-[#8B5CF6]" />
        <h3 className="text-xs text-white opacity-50">
          {title}
        </h3>
      </div>


      <div className="flex flex-wrap gap-4">
        {concepts.map((concept) => (
          <RelatedConceptChip
            key={concept.id}
            concept={concept}
            onClick={onConceptClick}
          />
        ))}
      </div>
    </div>
  );
}
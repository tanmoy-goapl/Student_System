import { RelatedDocument, RelatedDocumentsData } from "./types";

interface DocumentCardProps {
  document: RelatedDocument;
  onClick?: (id: string) => void;
}

function DocumentCard({ document, onClick }: DocumentCardProps) {
  const Icon = document.icon;

  const typeConfig = {
    pdf: {
      label: "PDF",
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    note: {
      label: "Note",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    pyq: {
      label: "PYQ",
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
  };

  const config = typeConfig[document.type];

  return (
    <button
      onClick={() => onClick?.(document.id)}
      className="w-full flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/30 p-3 transition-all duration-200 hover:bg-slate-900/50"
    >
      <div className="flex items-start gap-3 flex-1 text-left">
        <Icon className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />
        <p className="text-[0.7rem]">
          {document.title}
        </p>
      </div>
      <span className={`text-[0.5rem] font-medium px-2 py-1 rounded ${config.bg} ${config.color} flex-shrink-0`}>
        {config.label}
      </span>
    </button>
  );
}

interface RelatedDocumentsProps {
  data: RelatedDocumentsData;
  onDocumentClick?: (id: string) => void;
}

export function RelatedDocuments({ 
  data, 
  onDocumentClick 
}: RelatedDocumentsProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/50 p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-400">
        Related Documents
      </h3>

      <div className="space-y-2">
        {data.documents.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            onClick={onDocumentClick}
          />
        ))}
      </div>
    </div>
  );
}
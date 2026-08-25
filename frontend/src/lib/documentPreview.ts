export type DocumentPreviewKind = "pdf" | "image" | "text";

type DocumentLike = {
  id?: string | number;
  name?: string;
  filename?: string;
  type?: string;
};

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".webp",
  ".tif",
  ".tiff",
  ".svg",
]);

function getExtension(document: DocumentLike): string {
  const filename = String(document.filename || document.name || "").toLowerCase();
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot) : "";
}

export function getDocumentId(id: string | number): string {
  return String(id).replace(/^db-/, "");
}

function currentUserQuery(): string {
  if (typeof window === "undefined") return "";
  const userId = window.localStorage.getItem("user_id");
  return userId ? `&user_id=${encodeURIComponent(userId)}` : "";
}

export function getDocumentViewUrl(id: string | number): string {
  return "/api/documents/view?document_id=" + encodeURIComponent(getDocumentId(id)) + currentUserQuery();
}

export function getDocumentTextPreviewUrl(id: string | number): string {
  return "/api/documents/preview?document_id=" + encodeURIComponent(getDocumentId(id)) + currentUserQuery();
}

export function getDocumentPreviewKind(document: DocumentLike): DocumentPreviewKind {
  const extension = getExtension(document);
  const type = String(document.type || "").toLowerCase();

  if (extension === ".pdf" || type === "pdf") return "pdf";
  if (IMAGE_EXTENSIONS.has(extension)) return "image";

  // The preview endpoint extracts readable text for TXT/MD/CSV/JSON and
  // supported Office documents, so all remaining document formats use it.
  return "text";
}

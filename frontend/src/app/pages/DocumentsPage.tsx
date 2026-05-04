"use client";

import { useState, useEffect } from "react";
import { uploadDocument } from "@/lib/api";
import Loader from "@/components/Loader";

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "numeric", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });
}

type DocItem = {
  id: number;
  filename: string;
  uploaded_at: string;
  file_size?: number;
  readable_by?: string;
  file_path?: string;
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [readableBy, setReadableBy] = useState("owner");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const getStudentId = () => parseInt(localStorage.getItem("user_id") || "0", 10);

  useEffect(() => { fetchDocs(); }, []);

  const fetchDocs = async () => {
    const sid = getStudentId();
    if (!sid || isNaN(sid)) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/documents?student_id=${sid}`);
      if (res.ok) setDocs(await res.json());
    } catch { setError("Failed to load documents"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (docId: number, filename: string) => {
    if (!confirm(`Delete "${filename}"?`)) return;
    setDeleting(docId); setError("");
    try {
      const res = await fetch(`/api/documents?document_id=${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) { setError(err.message || "Delete failed"); }
    finally { setDeleting(null); }
  };

  const handleUpload = async () => {
    if (!file) { setError("Please select a file"); return; }
    const studentId = getStudentId();
    if (!studentId || isNaN(studentId)) { setError("Session expired. Please log in again."); return; }
    setError(""); setUploadMessage(""); setUploading(true);
    try {
      const res = await uploadDocument(studentId, file, readableBy);
      setUploadMessage(`✅ "${res.filename}" uploaded — ${res.chunks_created} chunks processed`);
      setFile(null);
      const input = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (input) input.value = "";
      fetchDocs();
    } catch (err: any) { setError(err.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const visibilityLabel: Record<string, string> = {
    owner: "Only Me", professor: "Professors", all: "Everyone",
  };

  console.log(previewUrl)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Uploaded Documents</h2>
        <p className="mt-1 text-xs text-slate-400">
          Supported: PDF, Word (DOCX), TXT, and images (PNG, JPG, JPEG, BMP, WEBP, TIFF). Images are processed with OCR.
        </p>
      </div>

      {/* Upload card */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
        <p className="mb-3 text-sm font-medium text-slate-300">Upload a new document</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:bg-slate-800">
            <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 8l-3-3m3 3l3-3" />
            </svg>
            {file ? file.name : "Choose file"}
            <input
              className="sr-only"
              type="file"
              accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.bmp,.webp,.tiff,.tif,.gif"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <select
            className="rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            value={readableBy}
            onChange={(e) => setReadableBy(e.target.value)}
          >
            <option value="owner">Only Me</option>
            <option value="professor">Professors</option>
            <option value="all">Everyone</option>
          </select>

          <button
            className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-violet-500 disabled:opacity-40"
            onClick={handleUpload}
            disabled={uploading || !file}
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>
        )}
        {uploadMessage && (
          <div className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-300">{uploadMessage}</div>
        )}
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
        {loading ? (
          <Loader fullScreen text="Loading..." />
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
            <svg className="h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/5 bg-slate-800/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">File</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Uploaded</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Visible To</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id} className="border-b border-white/5 transition hover:bg-slate-800/40">
                    <td className="px-5 py-3.5">
                      <button
                        className="text-sm font-medium text-cyan-400 transition hover:text-cyan-300 hover:underline text-left"
                        onClick={() => setPreviewUrl(`http://localhost:8001/uploads/${encodeURIComponent(doc.file_path ?? "")}`)}
                        title="Click to view"
                      >
                        {doc.filename}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{formatDate(doc.uploaded_at)}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">
                        {visibilityLabel[doc.readable_by ?? "owner"]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        disabled={deleting === doc.id}
                        className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                        title="Delete document"
                      >
                        {deleting === doc.id ? (
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex h-[90%] w-[90%] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-200">Document Preview</h3>
              <button
                onClick={() => setPreviewUrl(null)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1">
              <iframe src={previewUrl} className="h-full w-full rounded-b-2xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
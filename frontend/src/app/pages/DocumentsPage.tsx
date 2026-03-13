"use client";

import { useState, useEffect } from "react";
import { uploadDocument } from "@/lib/api";

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}


type DocItem = {
  id: number;
  filename: string;
  uploaded_at: string;
  file_size?: number;
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const getStudentId = () => parseInt(localStorage.getItem("user_id") || "0", 10);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    const sid = getStudentId();
    if (!sid || isNaN(sid)) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/documents?student_id=${sid}`);
      if (res.ok) {
        const data = await res.json();
        setDocs(data);
      }
    } catch (err: any) {
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId: number, filename: string) => {
    if (!confirm(`Delete "${filename}"?`)) return;
    setDeleting(docId);
    setError("");
    try {
      const res = await fetch(`/api/documents?document_id=${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      setError(err.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  };


  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }
    const studentId = getStudentId();
    if (!studentId || isNaN(studentId)) {
      setError("Session expired. Please log in again.");
      return;
    }
    setError("");
    setUploadMessage("");
    setUploading(true);
    try {
      const res = await uploadDocument(studentId, file);
      setUploadMessage(
        `✅ "${res.filename}" uploaded — ${res.chunks_created} chunks processed`
      );
      setFile(null);
      const input = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (input) input.value = "";
      fetchDocs();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-xs text-gray-500 mb-4">
        Supported formats: PDF, Word (DOCX), TXT, and images (PNG, JPG, JPEG, BMP, WEBP, TIFF).
        Images are processed with OCR to extract any printed or handwritten text.
      </p>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">Uploaded Documents</h2>
        <div className="flex items-center gap-2">
          <input
            className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            type="file"
            accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.bmp,.webp,.tiff,.tif,.gif"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            onClick={handleUpload}
            disabled={uploading || !file}
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {uploadMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">
          {uploadMessage}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading documents...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm border rounded-lg">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">File</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Uploaded</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800">{doc.filename}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(doc.uploaded_at)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(doc.id, doc.filename)}
                      disabled={deleting === doc.id}
                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition disabled:opacity-40"
                      title="Delete document"
                    >
                      {deleting === doc.id ? (
                        <span className="text-xs">…</span>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
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
  );
}

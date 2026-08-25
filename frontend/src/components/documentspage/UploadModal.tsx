'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Studies');
  const [subject, setSubject] = useState('Physics'); // Default for 'Studies'
  const [customSubject, setCustomSubject] = useState(''); // Default for 'Personal Learning'
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync default subjects when category changes
  useEffect(() => {
    if (category === 'Studies') {
      setSubject('');
    } else if (category === 'Resume & Interview') {
      setSubject('Resume');
    } else {
      setSubject('');
    }
  }, [category]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Auto-set title if empty or matches previous default
      const nameWithoutExt = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
      setTitle(nameWithoutExt);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a document title.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('category', category);
    
    // Determine subject value
    const finalSubject = category === 'Personal Learning' ? customSubject.trim() : subject.trim();
    formData.append('subject', finalSubject || 'General');
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      setError("Authentication required. Please sign in again.");
      setLoading(false);
      return;
    }
    formData.append('student_id', userId);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Upload failed');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFile(null);
        setTitle('');
        setCustomSubject('');
        onUploadSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0A0F1D] p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white">Upload Document</h2>
          <p className="text-xs text-white/45 mt-1">Add reports, syllabus, or personal material to index with AI</p>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-bounce" />
            <p className="text-sm font-semibold text-white">Uploaded & processed successfully!</p>
            <p className="text-xs text-white/45">Indexing knowledge base in real-time...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* File Drag / Drop Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition ${
                file
                  ? 'border-blue-500/40 bg-blue-500/5'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.txt,.docx,.doc"
                className="hidden"
              />
              <Upload className={`h-8 w-8 mb-2 ${file ? 'text-blue-400' : 'text-white/30'}`} />
              {file ? (
                <div className="text-center">
                  <p className="text-xs font-semibold text-white max-w-[260px] truncate">{file.name}</p>
                  <p className="text-[10px] text-white/40 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xs font-medium text-white/70">Click to browse your files</p>
                  <p className="text-[10px] text-white/40 mt-1">Supports PDF, DOCX, TXT up to 10MB</p>
                </div>
              )}
            </div>

            {/* Title Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold tracking-wider uppercase text-white/45">Document Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title (defaults to file name)"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 transition"
              />
            </div>

            {/* Category Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold tracking-wider uppercase text-white/45">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition"
              >
                <option value="Studies">Studies</option>
                <option value="Resume & Interview">Resume & Interview</option>
                <option value="Personal Learning">Personal Learning</option>
              </select>
            </div>

            {/* Dynamic Subject / Type Selection */}
            {category === 'Studies' && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold tracking-wider uppercase text-white/45">Subject / Course Name</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Operating Systems, DBMS"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 transition"
                />
              </div>
            )}

            {category === 'Resume & Interview' && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold tracking-wider uppercase text-white/45">Document Type</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition"
                >
                  <option value="Resume">Resume</option>
                  <option value="Interview">Interview Prep</option>
                </select>
              </div>
            )}

            {category === 'Personal Learning' && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold tracking-wider uppercase text-white/45">Subject / Field Name</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="e.g. History, Machine Learning"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 transition"
                />
              </div>
            )}

            {/* Buttons */}
            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/5 transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !file || !title.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {loading ? 'Processing...' : 'Upload File'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

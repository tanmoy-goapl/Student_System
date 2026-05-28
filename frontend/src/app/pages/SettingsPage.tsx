"use client";

import { useEffect, useState } from "react";
import { getLlmConfig, updateLlmConfig, type LLMProvider } from "../../lib/api";
import Loader from "@/components/Loader";
import MentorPreferences from "@/components/settingpage/MentorPreferences";
import ResponseStyle from "@/components/settingpage/ResponseStyle";
import ToneSelector from "@/components/settingpage/ToneSelector";
import PersonalizationCard from "@/components/settingpage/PersonalizationCard";
import {
  defaultModes,
  responseStyles,
  tones,
} from "@/constants/settingpage-data";


function RadioCard({
  value, current, pending, onChange, disabled, title, description,
}: {
  value: LLMProvider;
  current: LLMProvider;
  pending: LLMProvider;
  onChange: () => void;
  disabled: boolean;
  title: string;
  description: string;
}) {
  const isSelected = pending === value;
  return (
    <label
      className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition ${isSelected
          ? "border-cyan-500/40 bg-cyan-500/5"
          : "border-white/10 bg-slate-800/40 hover:border-white/20 hover:bg-slate-800/60"
        }`}
    >
      <div className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          type="radio"
          name="llm"
          value={value}
          checked={isSelected}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`h-5 w-5 rounded-full border-2 transition ${isSelected ? "border-cyan-400" : "border-slate-600"
            }`}
        />
        {isSelected && (
          <div className="absolute h-2.5 w-2.5 rounded-full bg-cyan-400" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </label>
  );
}

export default function SettingsPage() {
  const [selectedModel, setSelectedModel] = useState<LLMProvider>("llama");
  const [pendingModel, setPendingModel] = useState<LLMProvider>("llama");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getLlmConfig();
        setSelectedModel(data.provider);
        setPendingModel(data.provider);
      } catch { setError("Failed to load current LLM setting."); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true); setError(null); setSaved(false);
      const res = await updateLlmConfig(pendingModel);
      setSelectedModel(res.provider);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { setError("Failed to save LLM selection."); }
    finally { setSaving(false); }
  };

  const isDirty = pendingModel !== selectedModel;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="mt-1 text-sm text-slate-400">Manage platform-wide configuration</p>
      </div>

      <MentorPreferences data={defaultModes} />
      <ResponseStyle data={responseStyles} />
      <ToneSelector data={tones} />
      <PersonalizationCard />

      {/* LLM card */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm">
        <div className="mb-1 flex items-center gap-2">
          <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.65 1.65c-.42.42-.98.65-1.557.65h-8.186c-.577 0-1.137-.23-1.557-.65L5 14.5m14.8.5l.15.15c.42.42.65.98.65 1.56v.594c0 .58-.23 1.14-.65 1.56l-1.5 1.5c-.42.42-.98.65-1.56.65H7.11c-.58 0-1.14-.23-1.56-.65l-1.5-1.5A2.25 2.25 0 013.5 17v-.586c0-.58.23-1.14.65-1.56L5 14.5" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-200">Default LLM Configuration</h3>
        </div>
        <p className="mb-5 text-xs text-slate-500">
          Select the system-wide language model used for chat, classification, and reasoning.
        </p>

        {loading && (
          <Loader fullScreen text="Loading..." />
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">{error}</div>
        )}

        <div className="space-y-3">
          <RadioCard
            value="gpt4o"
            current={selectedModel}
            pending={pendingModel}
            onChange={() => setPendingModel("gpt4o")}
            disabled={loading || saving}
            title="GPT-4o-mini (Cloud / Proxy)"
            description="Uses the configured cloud API endpoint from your backend environment variables."
          />
          <RadioCard
            value="llama"
            current={selectedModel}
            pending={pendingModel}
            onChange={() => setPendingModel("llama")}
            disabled={loading || saving}
            title="On-Premise Llama-3.3-70B"
            description={`Connects to your local LLM endpoint (${process.env.NEXT_PUBLIC_LLM_BASE_URL || "the URL set in .env"}).`}
          />
        </div>

        <p className="mt-4 text-xs text-slate-600">
          Note: The actual LLM endpoint and model are configured in the backend{" "}
          <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-400">.env</code> file. This selection
          should match your server configuration.
        </p>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || !isDirty}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {isDirty && !saving && (
            <span className="text-xs text-slate-500">You have unsaved changes.</span>
          )}
          {saved && (
            <span className="flex items-center gap-1 text-xs text-cyan-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
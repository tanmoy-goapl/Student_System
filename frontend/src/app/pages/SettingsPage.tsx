"use client";

import { useEffect, useState } from "react";
import { getLlmConfig, updateLlmConfig, type LLMProvider } from "../../lib/api";

export default function SettingsPage() {
  const [selectedModel, setSelectedModel] = useState<LLMProvider>("llama"); // current saved value
  const [pendingModel, setPendingModel] = useState<LLMProvider>("llama");  // value in the UI
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getLlmConfig();
        setSelectedModel(data.provider);
        setPendingModel(data.provider);
      } catch (err) {
        console.error(err);
        setError("Failed to load current LLM setting.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await updateLlmConfig(pendingModel);
      setSelectedModel(res.provider);
    } catch (err) {
      console.error(err);
      setError("Failed to save LLM selection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <div className="space-y-6">
        {/* LLM selection section */}
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Default LLM Configuration</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select the system-wide Language Model (LLM) to be used for Mentor AI operations such as
            chat, classification, and reasoning.
          </p>

          {loading && (
            <p className="text-xs text-gray-500 mb-2">Loading current LLM selection…</p>
          )}
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="llm"
                value="gpt4o"
                checked={pendingModel === "gpt4o"}
                onChange={() => setPendingModel("gpt4o")}
                className="h-4 w-4"
                disabled={loading || saving}
              />
              <div>
                <div className="font-medium text-sm">GPT-4o-mini (Cloud / Proxy)</div>
                <div className="text-xs text-gray-500">
                  Uses the configured cloud API endpoint from your backend environment variables.
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="llm"
                value="llama"
                checked={pendingModel === "llama"}
                onChange={() => setPendingModel("llama")}
                className="h-4 w-4"
                disabled={loading || saving}
              />
              <div>
                <div className="font-medium text-sm">On-Premise Llama-3.3-70B</div>
                <div className="text-xs text-gray-500">
                  Connects to your local LLM endpoint (for example {process.env.NEXT_PUBLIC_LLM_BASE_URL || "the URL set in .env"}).
                </div>
              </div>
            </label>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Note: The actual LLM endpoint and model are configured in the backend <code>.env</code> file.
            This selection is for UI/administrative purposes; make sure it matches your server configuration.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving || pendingModel === selectedModel}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {pendingModel !== selectedModel && !saving && (
              <span className="text-xs text-gray-500">You have unsaved changes.</span>
            )}
          </div>
        </div>

        {/* Other settings sections (placeholders) */}
        
      </div>
    </div>
  );
}

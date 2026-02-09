import React, { useState } from "react";
import { Key, ExternalLink, Sparkles, AlertCircle } from "lucide-react";
import { setApiKey } from "../services/geminiConfig";

interface ApiKeyModalProps {
  onKeySubmit: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onKeySubmit }) => {
  const [apiKey, setApiKeyInput] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      setError("Please enter your API key");
      return;
    }

    if (!trimmedKey.startsWith("AIza")) {
      setError(
        'Invalid API key format. Gemini API keys typically start with "AIza"',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Store the API key
      setApiKey(trimmedKey);

      // Small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Notify parent that key was submitted
      onKeySubmit();
    } catch (err) {
      setError("Failed to save API key. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
      {/* Modal Container */}
      <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-300">
        {/* Glowing background effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-2xl blur-lg opacity-40 animate-pulse" />

        {/* Modal Content */}
        <div className="relative bg-slate-900/95 border border-slate-700/50 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-900/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome to Omni-Lab
            </h1>
            <p className="text-slate-400 text-sm">
              Enter your Gemini API key to get started with the Empirical Tutor
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="apiKey"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Gemini API Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIza..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              {error && (
                <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-900/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Start Learning
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-purple-400 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Get your free API key from Google AI Studio
            </a>
          </div>

          {/* Privacy note */}
          <p className="mt-4 text-xs text-center text-slate-500">
            Your API key is stored locally in your browser and never sent to any
            server except Google's AI services.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;

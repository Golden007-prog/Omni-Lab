/**
 * ResearchPanel
 * Side panel that appears when the tutor enters research mode.
 * Shows web search results, YouTube video, and a summary.
 */

import React from "react";
import {
  X,
  ExternalLink,
  Search,
  Youtube,
  BookOpen,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAutoTutor } from "../contexts/AutoTutorContext";

const ResearchPanel: React.FC = () => {
  const { researchPanelData, showResearchPanel, closeResearchPanel, tutorState } =
    useAutoTutor();

  if (!showResearchPanel || !researchPanelData) return null;

  const { question, summary, webResults, youtubeResults, isLoading } =
    researchPanelData;

  return (
    <div className="fixed right-0 top-14 bottom-0 w-[380px] z-40 flex flex-col bg-slate-950 border-l border-slate-800 shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-900/50 border border-emerald-700 flex items-center justify-center">
            <Search className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-mono text-emerald-400">
              RESEARCH MODE
            </div>
            <div className="text-sm font-medium text-white truncate max-w-[250px]">
              {question}
            </div>
          </div>
        </div>
        <button
          onClick={closeResearchPanel}
          className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-white">
                Researching your question...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Searching the web and YouTube
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Section */}
            {summary && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Quick Summary
                  </h3>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {summary.summary}
                  </p>
                </div>

                {/* Key Points */}
                {summary.keyPoints.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono text-slate-500 uppercase">
                      Key Points
                    </h4>
                    <ul className="space-y-1.5">
                      {summary.keyPoints.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-slate-300"
                        >
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* YouTube Section */}
            {youtubeResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Video Explanation
                  </h3>
                </div>
                {youtubeResults.map((video) => (
                  <div
                    key={video.videoId}
                    className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900"
                  >
                    {/* Thumbnail */}
                    <div className="relative">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-[180px] object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                          <div className="w-0 h-0 border-l-[16px] border-l-white border-y-[10px] border-y-transparent ml-1" />
                        </div>
                      </div>
                    </div>

                    {/* Video info */}
                    <div className="p-3 space-y-2">
                      <h4 className="text-sm font-medium text-white line-clamp-2">
                        {video.title}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {video.description}
                      </p>
                      <a
                        href={`https://www.youtube.com/watch?v=${video.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-900/50 border border-red-700 rounded-lg text-xs font-medium text-red-200 hover:bg-red-900/70 transition-colors"
                      >
                        <Youtube className="w-3.5 h-3.5" />
                        Watch on YouTube
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Web Results */}
            {webResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Web Sources
                  </h3>
                </div>
                <div className="space-y-2">
                  {webResults.map((result, idx) => (
                    <a
                      key={idx}
                      href={result.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium text-blue-300 group-hover:text-blue-200 line-clamp-1">
                          {result.title}
                        </h4>
                        <ExternalLink className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {result.snippet}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        <div className="text-xs text-slate-500 text-center">
          {tutorState === "research_mode" ? (
            <span className="flex items-center justify-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Tutor is explaining findings...
            </span>
          ) : (
            'Say "continue" to resume the lecture'
          )}
        </div>
      </div>
    </div>
  );
};

export default ResearchPanel;

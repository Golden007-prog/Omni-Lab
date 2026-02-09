/**
 * LivePresentationViewer
 * Displays slides with themed backgrounds and integrates with the auto-explain system.
 *
 * Key behaviours:
 *  - "Play Auto-Explain" button starts the voice-driven lecture
 *  - Slide index is driven by AutoTutorContext when in auto mode
 *  - Explanation text is NOT shown on the slide — only bullet points & title
 *  - Subtitles + voice handle the explanation instead
 *  - Pause / Resume / Stop controls exposed in the header
 */

import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Palette,
  Play,
  Square,
  Pause,
  SkipForward,
} from "lucide-react";
import { ThemeName, THEMES, getThemeNames } from "../utils/presentationThemes";
import { useTutor } from "../contexts/TutorContext";
import { useAutoTutor } from "../contexts/AutoTutorContext";

// Slide data structure
interface SlideData {
  id: number;
  title: string;
  bullet_points: string[];
  script: string;
  quiz_question?: string;
  answer?: string;
  image_url?: string;
}

export interface LivePresentationData {
  title: string;
  slides: SlideData[];
}

export interface LivePresentationHandle {
  sendMessage: (text: string) => void;
}

interface LivePresentationViewerProps {
  apiKey: string;
  data: LivePresentationData;
  onClose?: () => void;
}

const LivePresentationViewer = forwardRef<
  LivePresentationHandle,
  LivePresentationViewerProps
>(({ data }, ref) => {
  const [localIndex, setLocalIndex] = useState(0);
  const [currentTheme, setCurrentTheme] = useState<ThemeName>("Modern Tech");
  const themeConfig = THEMES[currentTheme];
  const { setSlideExplanation } = useTutor();
  const {
    isAutoMode,
    tutorState,
    currentSlideIndex: autoSlideIndex,
    startAutoExplain,
    stopAutoExplain,
    pauseAutoExplain,
    resumeAutoExplain,
    goToSlide,
  } = useAutoTutor();

  // Use auto-tutor index when in auto mode, local index otherwise
  const currentIndex = isAutoMode ? autoSlideIndex : localIndex;
  const currentSlide = data.slides[currentIndex];

  useImperativeHandle(ref, () => ({
    sendMessage: () => {},
  }));

  // Sync slide explanation to tutor context (for regular voice mode)
  useEffect(() => {
    if (currentSlide?.script && !isAutoMode) {
      setSlideExplanation(currentSlide.script);
    }
  }, [currentIndex, currentSlide?.script, setSlideExplanation, isAutoMode]);

  // Keep local index in sync when auto mode changes slides
  useEffect(() => {
    if (isAutoMode) {
      setLocalIndex(autoSlideIndex);
    }
  }, [isAutoMode, autoSlideIndex]);

  const handlePrev = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    if (isAutoMode) {
      goToSlide(newIndex);
    } else {
      setLocalIndex(newIndex);
    }
  };

  const handleNext = () => {
    const newIndex = Math.min(data.slides.length - 1, currentIndex + 1);
    if (isAutoMode) {
      goToSlide(newIndex);
    } else {
      setLocalIndex(newIndex);
    }
  };

  const handleDotClick = (idx: number) => {
    if (isAutoMode) {
      goToSlide(idx);
    } else {
      setLocalIndex(idx);
    }
  };

  const handleAutoExplainToggle = () => {
    if (isAutoMode) {
      stopAutoExplain();
    } else {
      startAutoExplain(data.slides);
    }
  };

  if (!currentSlide) return null;

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-slate-600" />
          <h3 className="font-semibold text-white">{data.title}</h3>
          <span className="text-xs text-slate-500 font-mono">
            SLIDE {currentIndex + 1} / {data.slides.length}
          </span>

          {/* Auto mode state badge */}
          {isAutoMode && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                tutorState === "auto_explaining"
                  ? "bg-purple-900/40 text-purple-300 border-purple-700"
                  : tutorState === "paused_for_question" ||
                      tutorState === "answering"
                    ? "bg-amber-900/40 text-amber-300 border-amber-700"
                    : tutorState === "research_mode"
                      ? "bg-emerald-900/40 text-emerald-300 border-emerald-700"
                      : tutorState === "waiting_to_resume"
                        ? "bg-amber-900/40 text-amber-300 border-amber-700"
                        : tutorState === "finished"
                          ? "bg-green-900/40 text-green-300 border-green-700"
                          : "bg-slate-900 text-slate-400 border-slate-800"
              }`}
            >
              {tutorState === "auto_explaining"
                ? "AUTO EXPLAINING"
                : tutorState === "paused_for_question"
                  ? "LISTENING..."
                  : tutorState === "answering"
                    ? "ANSWERING"
                    : tutorState === "research_mode"
                      ? "RESEARCHING"
                      : tutorState === "waiting_to_resume"
                        ? "WAITING TO RESUME"
                        : tutorState === "finished"
                          ? "FINISHED"
                          : "AUTO MODE"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* ▶ Play / ⏹ Stop Auto-Explain */}
          <button
            onClick={handleAutoExplainToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isAutoMode
                ? "bg-red-900/50 border border-red-700 text-red-200 hover:bg-red-900/70"
                : "bg-purple-600 hover:bg-purple-500 text-white"
            }`}
          >
            {isAutoMode ? (
              <>
                <Square className="w-3.5 h-3.5" />
                Stop Auto-Explain
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Play Auto-Explain
              </>
            )}
          </button>

          {/* ⏸ Pause (visible only when auto-explaining) */}
          {isAutoMode && tutorState === "auto_explaining" && (
            <button
              onClick={pauseAutoExplain}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              title="Pause"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}

          {/* ⏭ Resume / Skip (visible when paused or waiting) */}
          {isAutoMode &&
            (tutorState === "paused_for_question" ||
              tutorState === "waiting_to_resume") && (
              <button
                onClick={resumeAutoExplain}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-900/50 border border-emerald-700 text-emerald-200 hover:bg-emerald-900/70 transition-colors"
                title="Resume / Skip to Next"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            )}

          {/* Theme selector */}
          <div className="flex items-center gap-1.5">
            <Palette className="w-3 h-3 text-slate-400" />
            <select
              value={currentTheme}
              onChange={(e) =>
                setCurrentTheme(e.target.value as ThemeName)
              }
              className="bg-slate-800/90 text-white text-xs px-2 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer transition-all"
            >
              {getThemeNames().map((themeName) => (
                <option key={themeName} value={themeName}>
                  {themeName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── Progress bar ───────────────────────────────────────────── */}
      <div className="h-1 bg-slate-800">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / data.slides.length) * 100}%`,
            background: `linear-gradient(to right, ${themeConfig.accentColor}, #3b82f6)`,
          }}
        />
      </div>

      {/* ─── Main content area ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Slide Content with Themed Background */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${themeConfig.backgroundFrom}, ${themeConfig.backgroundTo})`,
          }}
        >
          {/* Semi-transparent overlay for text readability */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: themeConfig.overlayColor }}
          />

          {/* Content Layout */}
          <div className="relative z-10 h-full p-8 md:p-12 overflow-y-auto flex items-center justify-center">
            <div className={`w-full max-w-7xl grid grid-cols-1 ${currentSlide.image_url ? 'lg:grid-cols-2 gap-12' : ''} items-center`}>
              
              {/* Text Column */}
              <div 
                className={`max-w-2xl w-full ${!currentSlide.image_url ? 'mx-auto' : ''}`}
                style={{ color: themeConfig.textColor }}
              >
                <h2
                  className="text-3xl md:text-4xl font-bold mb-8 leading-tight"
                  style={{
                    textShadow:
                      themeConfig.textColor === "#ffffff"
                        ? "0 2px 8px rgba(0,0,0,0.5)"
                        : "none",
                  }}
                >
                  {currentSlide.title}
                </h2>

                <ul className="space-y-5 mb-8">
                  {currentSlide.bullet_points.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-4 text-lg md:text-xl">
                      <span
                        className="w-2.5 h-2.5 rounded-full mt-2.5 flex-shrink-0"
                        style={{
                          backgroundColor: themeConfig.accentColor,
                        }}
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Image Column */}
              {currentSlide.image_url && (
                <div className="flex justify-center items-center h-full">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                    <img 
                      src={currentSlide.image_url} 
                      alt={currentSlide.title} 
                      className="relative rounded-2xl shadow-2xl max-h-[60vh] w-auto object-contain bg-white/5 backdrop-blur-sm border border-white/10 p-2" 
                    />
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Auto-explain LIVE overlay indicator */}
          {isAutoMode && tutorState === "auto_explaining" && (
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-purple-900/70 backdrop-blur-sm rounded-full border border-purple-700">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              <span className="text-xs font-mono text-purple-200">
                LIVE
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Navigation ─────────────────────────────────────────────── */}
      <div
        className={`p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950 ${
          isAutoMode ? "pb-6" : ""
        }`}
      >
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex items-center gap-1">
          {data.slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleDotClick(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex
                  ? "bg-purple-500"
                  : "bg-slate-700 hover:bg-slate-600"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === data.slides.length - 1}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

LivePresentationViewer.displayName = "LivePresentationViewer";

export default LivePresentationViewer;
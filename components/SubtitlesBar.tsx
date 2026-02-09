/**
 * SubtitlesBar
 * Fixed bottom bar that shows live streaming subtitles from the voice tutor.
 * Appears during auto-explain mode with a smooth, modern design.
 *
 * IMPORTANT: All hooks are called unconditionally (Rules of Hooks).
 * Visibility is controlled via CSS, NOT conditional returns before hooks.
 */

import React, { useEffect, useRef, useState } from "react";
import { Volume2, Pause, Play, Mic } from "lucide-react";
import { useAutoTutor, type TutorState } from "../contexts/AutoTutorContext";
import { useTutor } from "../contexts/TutorContext";

const STATE_LABELS: Record<TutorState, string> = {
  idle: "",
  auto_explaining: "Explaining...",
  paused_for_question: "Listening to your question...",
  answering: "Answering...",
  research_mode: "Researching...",
  visual_explaining: "Generating visual...",
  waiting_to_resume: 'Say "continue" to resume',
  finished: "Lecture complete!",
};

const STATE_COLORS: Record<TutorState, string> = {
  idle: "bg-slate-800",
  auto_explaining: "bg-purple-900/80",
  paused_for_question: "bg-amber-900/80",
  answering: "bg-blue-900/80",
  research_mode: "bg-emerald-900/80",
  visual_explaining: "bg-blue-900/80",
  waiting_to_resume: "bg-amber-900/80",
  finished: "bg-green-900/80",
};

const SubtitlesBar: React.FC = () => {
  const {
    tutorState,
    isAutoMode,
    currentSlideIndex,
    totalSlides,
    subtitlesText,
    pauseAutoExplain,
    resumeAutoExplain,
  } = useAutoTutor();
  const { isTutorSpeaking } = useTutor();
  const textRef = useRef<HTMLDivElement>(null);
  const [displayText, setDisplayText] = useState("");

  // ── ALL hooks MUST come BEFORE any conditional return ──────────────────

  // Smooth text display — show the last ~200 characters for readability
  useEffect(() => {
    if (!subtitlesText) {
      setDisplayText("");
      return;
    }
    const maxLen = 200;
    const text =
      subtitlesText.length > maxLen
        ? "..." + subtitlesText.slice(-maxLen)
        : subtitlesText;
    setDisplayText(text);
  }, [subtitlesText]);

  // Auto-scroll to end of subtitles
  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollLeft = textRef.current.scrollWidth;
    }
  }, [displayText]);

  // ── Derived values (safe after hooks) ─────────────────────────────────

  const isVisible = isAutoMode || tutorState !== "idle";
  const stateLabel = STATE_LABELS[tutorState];
  const stateColor = STATE_COLORS[tutorState];

  // Hide via CSS instead of returning null before hooks
  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-0 md:bottom-0 left-0 right-0 z-50 transition-all duration-500 mobile-subtitles-bar ${
        tutorState === "idle"
          ? "translate-y-full opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
    >
      {/* Gradient fade */}
      <div className="h-6 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />

      {/* Main bar */}
      <div className={`${stateColor} backdrop-blur-xl border-t border-white/10`}>
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
          {/* State indicator */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Pulsing dot */}
            <div
              className={`w-2 h-2 rounded-full ${
                tutorState === "auto_explaining" && isTutorSpeaking
                  ? "bg-purple-400 animate-pulse"
                  : tutorState === "paused_for_question"
                    ? "bg-amber-400 animate-pulse"
                    : tutorState === "research_mode"
                      ? "bg-emerald-400 animate-pulse"
                      : tutorState === "finished"
                        ? "bg-green-400"
                        : "bg-slate-400"
              }`}
            />

            {/* State icon */}
            {tutorState === "auto_explaining" && (
              <Volume2 className="w-4 h-4 text-purple-300" />
            )}
            {tutorState === "paused_for_question" && (
              <Mic className="w-4 h-4 text-amber-300 animate-pulse" />
            )}
            {tutorState === "answering" && (
              <Volume2 className="w-4 h-4 text-blue-300" />
            )}
            {tutorState === "waiting_to_resume" && (
              <Mic className="w-4 h-4 text-amber-300" />
            )}

            {/* State label */}
            <span className="text-xs font-mono text-white/70 whitespace-nowrap">
              {stateLabel}
            </span>
          </div>

          {/* Slide progress */}
          {totalSlides > 0 && (
            <div className="text-xs font-mono text-white/50 shrink-0">
              {currentSlideIndex + 1}/{totalSlides}
            </div>
          )}

          {/* Subtitle text */}
          <div
            ref={textRef}
            className="flex-1 overflow-hidden text-white text-sm font-medium leading-relaxed"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
            }}
          >
            <span className="whitespace-nowrap">
              {displayText ||
                (tutorState === "finished"
                  ? "All slides have been explained!"
                  : "\u00A0")}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {tutorState === "auto_explaining" && (
              <button
                onClick={pauseAutoExplain}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Pause"
              >
                <Pause className="w-4 h-4 text-white" />
              </button>
            )}
            {(tutorState === "paused_for_question" ||
              tutorState === "waiting_to_resume") && (
              <button
                onClick={resumeAutoExplain}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Resume"
              >
                <Play className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {totalSlides > 0 && (
          <div className="h-0.5 bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700"
              style={{
                width: `${((currentSlideIndex + 1) / totalSlides) * 100}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtitlesBar;
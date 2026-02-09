/**
 * FloatingVoiceTutor
 * Floating panel that appears when voice mode is active.
 * Shows connection state, audio visualisation, and auto-lecture controls.
 *
 * Integrates with both TutorContext (voice connection) and
 * AutoTutorContext (auto-lecture state machine).
 * 
 * Also serves as the bridge for external "Explain" requests from tools.
 */

import React, { useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  BookOpen,
  Pause,
  Play,
} from "lucide-react";
import { useTutor } from "../contexts/TutorContext";
import { useAutoTutor } from "../contexts/AutoTutorContext";
import { registerTutor, unregisterTutor } from "../services/tutorBridge";

const FloatingVoiceTutor: React.FC = () => {
  const {
    tutorMode,
    isVoiceConnected,
    isRecording,
    isConnecting,
    startVoiceTutor,
    stopVoiceTutor,
    isTutorSpeaking,
    isMicMuted,
    muteMic,
    unmuteMic,
    sendTextToTutor,
  } = useTutor();

  const {
    isAutoMode,
    tutorState,
    currentSlideIndex,
    totalSlides,
    pauseAutoExplain,
    resumeAutoExplain,
    stopAutoExplain,
  } = useAutoTutor();

  // ── Bridge handler for external "Explain" requests ─────────────────────
  
  const handleExternalExplain = useCallback(
    async (content: string) => {
      console.log("[FloatingVoiceTutor] Explain request received:", content.substring(0, 80));

      // If not connected, start voice tutor first
      if (!isVoiceConnected && !isConnecting) {
        console.log("[FloatingVoiceTutor] Starting voice tutor for explain request");
        await startVoiceTutor();
        // Wait a moment for connection
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Pause auto lecture if running
      if (isAutoMode && tutorState === "auto_explaining") {
        console.log("[FloatingVoiceTutor] Pausing auto lecture for explain request");
        pauseAutoExplain();
      }

      // Build the explain prompt
      const explainPrompt = `You are a friendly teacher. Explain this clearly and concisely:\n\n${content}`;
      
      console.log("[FloatingVoiceTutor] Sending to Gemini for explanation");
      sendTextToTutor(explainPrompt);
    },
    [isVoiceConnected, isConnecting, startVoiceTutor, isAutoMode, tutorState, pauseAutoExplain, sendTextToTutor]
  );

  // Register with tutor bridge on mount
  useEffect(() => {
    registerTutor(handleExternalExplain);
    console.log("[FloatingVoiceTutor] Registered with tutor bridge");
    
    return () => {
      unregisterTutor();
      console.log("[FloatingVoiceTutor] Unregistered from tutor bridge");
    };
  }, [handleExternalExplain]);

  // Only render when in voice mode
  if (tutorMode !== "voice") return null;

  // ── Status helpers ────────────────────────────────────────────────────

  const getStatusText = () => {
    if (isAutoMode) {
      switch (tutorState) {
        case "auto_explaining":
          return `Explaining slide ${currentSlideIndex + 1}/${totalSlides}`;
        case "paused_for_question":
          return "Listening to your question...";
        case "answering":
          return "Answering your question...";
        case "research_mode":
          return "Researching your question...";
        case "waiting_to_resume":
          return 'Say "continue" to resume';
        case "finished":
          return "Lecture complete!";
        default:
          return "Auto-explain active";
      }
    }
    if (isRecording) return "Listening for questions...";
    if (isConnecting) return "Connecting...";
    return "Microphone idle";
  };

  const getSubtext = () => {
    if (isAutoMode) {
      if (tutorState === "auto_explaining")
        return "Interrupt anytime to ask a question";
      if (tutorState === "waiting_to_resume")
        return 'Or click ▶ to continue';
      if (tutorState === "finished")
        return "You've completed all slides!";
      return "The tutor is handling your request";
    }
    return "Speak naturally, I will answer aloud.";
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="fixed right-5 bottom-5 md:bottom-5 w-[340px] max-w-[calc(100vw-2.5rem)] h-[440px] max-h-[calc(100vh-8rem)] z-[1000] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden mobile-voice-panel">
      {/* ─ Header ─ */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-slate-500">
            {isAutoMode ? "AUTO LECTURE" : "LIVE VOICE"}
          </div>
          <div className="text-sm font-semibold text-white">
            Omni Tutor
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* State badge (auto mode only) */}
          {isAutoMode && (
            <div
              className={`text-[10px] font-mono px-2 py-1 rounded-full border ${
                tutorState === "auto_explaining"
                  ? "bg-purple-900/40 text-purple-300 border-purple-700"
                  : tutorState === "research_mode"
                    ? "bg-emerald-900/40 text-emerald-300 border-emerald-700"
                    : tutorState === "finished"
                      ? "bg-green-900/40 text-green-300 border-green-700"
                      : "bg-amber-900/40 text-amber-300 border-amber-700"
              }`}
            >
              {tutorState === "auto_explaining"
                ? "EXPLAINING"
                : tutorState === "research_mode"
                  ? "RESEARCH"
                  : tutorState === "finished"
                    ? "DONE"
                    : "PAUSED"}
            </div>
          )}

          {/* Connection badge */}
          <div
            className={`text-[10px] font-mono px-2 py-1 rounded-full border ${
              isVoiceConnected
                ? "bg-green-900/40 text-green-300 border-green-700"
                : isConnecting
                  ? "bg-yellow-900/40 text-yellow-300 border-yellow-700"
                  : "bg-slate-900 text-slate-400 border-slate-800"
            }`}
          >
            {isVoiceConnected
              ? "CONNECTED"
              : isConnecting
                ? "CONNECTING"
                : "DISCONNECTED"}
          </div>
        </div>
      </div>

      {/* ─ Main visual area ─ */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        {/* Main indicator orb */}
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
            isTutorSpeaking
              ? "bg-blue-600 shadow-[0_0_30px_rgba(59,130,246,0.5)]"
              : isRecording && !isMicMuted
                ? "bg-purple-600 shadow-[0_0_30px_rgba(124,58,237,0.5)]"
                : "bg-slate-800"
          }`}
        >
          {isTutorSpeaking ? (
            <Volume2 className="w-10 h-10 text-white animate-pulse" />
          ) : isAutoMode && tutorState === "research_mode" ? (
            <BookOpen className="w-10 h-10 text-emerald-300" />
          ) : isRecording && !isMicMuted ? (
            <Mic className="w-10 h-10 text-white" />
          ) : (
            <MicOff className="w-10 h-10 text-slate-400" />
          )}
        </div>

        {/* Audio bars */}
        <div className="w-full flex items-end justify-center gap-1 h-16">
          {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
            <div
              key={bar}
              className={`w-2 rounded-full transition-all ${
                isTutorSpeaking
                  ? "bg-blue-400 animate-pulse"
                  : isRecording && !isMicMuted
                    ? "bg-purple-400 animate-pulse"
                    : "bg-slate-700"
              }`}
              style={{
                height: `${
                  isTutorSpeaking
                    ? 20 + bar * 6
                    : isRecording && !isMicMuted
                      ? 30 + bar * 4
                      : 12
                }px`,
              }}
            />
          ))}
        </div>

        {/* Status text */}
        <div className="text-center">
          <div className="text-sm font-medium text-white">
            {getStatusText()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {getSubtext()}
          </div>
        </div>
      </div>

      {/* ─ Footer controls ─ */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2">
        {isAutoMode ? (
          <>
            {/* Auto mode controls */}
            {tutorState === "auto_explaining" ? (
              <button
                onClick={pauseAutoExplain}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-amber-900/50 border border-amber-700 text-amber-200 hover:bg-amber-900/70 transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            ) : tutorState === "paused_for_question" ||
              tutorState === "waiting_to_resume" ? (
              <button
                onClick={resumeAutoExplain}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-emerald-900/50 border border-emerald-700 text-emerald-200 hover:bg-emerald-900/70 transition-colors"
              >
                <Play className="w-4 h-4" />
                Continue
              </button>
            ) : (
              <div className="flex-1" />
            )}

            {/* Mic mute toggle */}
            <button
              onClick={() => (isMicMuted ? unmuteMic() : muteMic())}
              className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isMicMuted
                  ? "bg-red-900/50 border border-red-700 text-red-200"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200"
              }`}
            >
              {isMicMuted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* End auto-explain */}
            <button
              onClick={stopAutoExplain}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-red-900/50 border border-red-700 text-red-200 hover:bg-red-900/70 transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
              End
            </button>
          </>
        ) : (
          <>
            {/* Regular voice mode controls */}
            <button
              onClick={() => startVoiceTutor()}
              disabled={isRecording || isConnecting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mic className="w-4 h-4" />
              {isConnecting ? "Connecting..." : "Start Mic"}
            </button>
            <button
              onClick={stopVoiceTutor}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <PhoneOff className="w-4 h-4" />
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FloatingVoiceTutor;

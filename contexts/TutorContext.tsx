/**
 * TutorContext
 * Manages the voice/text tutor connection and state.
 * Provides:
 *  - Voice tutor lifecycle (start/stop)
 *  - Text-to-model messaging
 *  - Subtitle text streaming
 *  - Speaking state tracking
 *  - Mic mute/unmute
 *  - Callback refs for AutoTutor integration
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  startGeminiVoice,
  type GeminiVoiceHandle,
  type VoiceCallbacks,
} from "../services/geminiRealtime";

// Global mode setter for AppModeContext sync
let globalModeSetterFn: ((mode: "chat" | "voice") => void) | null = null;

export function setGlobalModeSetter(fn: (mode: "chat" | "voice") => void) {
  globalModeSetterFn = fn;
}

function syncGlobalMode(mode: "chat" | "voice") {
  if (globalModeSetterFn) {
    globalModeSetterFn(mode);
  }
}

type TutorMode = "idle" | "text" | "voice";

interface TutorContextValue {
  tutorMode: TutorMode;
  isVoiceConnected: boolean;
  isRecording: boolean;
  isConnecting: boolean;
  currentSlideExplanation: string;
  /** Current subtitle text streaming from Gemini */
  subtitlesText: string;
  /** Whether the tutor is actively speaking (audio playing) */
  isTutorSpeaking: boolean;
  startVoiceTutor: (options?: { autoExplainMode?: boolean }) => Promise<void>;
  stopVoiceTutor: () => void;
  setSlideExplanation: (text: string) => void;
  /** Send a text message to the voice tutor */
  sendTextToTutor: (text: string) => void;
  /** Mute/unmute mic */
  muteMic: () => void;
  unmuteMic: () => void;
  isMicMuted: boolean;
  /** Clear subtitles */
  clearSubtitles: () => void;
  /** Register callback for turn complete events */
  onTurnComplete: React.MutableRefObject<(() => void) | null>;
  /** Register callback for user speech detection (interruption) */
  onUserSpeechDetected: React.MutableRefObject<(() => void) | null>;
  /** Register callback for local user voice activity (VAD) */
  onUserActivity: React.MutableRefObject<(() => void) | null>;
  /** Stop all audio playback immediately */
  stopAudioPlayback: () => void;
}

const TutorContext = createContext<TutorContextValue | null>(null);

export const TutorProvider: React.FC<{
  apiKey: string;
  children: React.ReactNode;
}> = ({ children }) => {
  const [tutorMode, setTutorMode] = useState<TutorMode>("text");
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentSlideExplanation, setCurrentSlideExplanation] = useState("");
  const [subtitlesText, setSubtitlesText] = useState("");
  const [isTutorSpeaking, setIsTutorSpeaking] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const realtimeRef = useRef<GeminiVoiceHandle | null>(null);

  // External callback refs for auto-tutor integration
  const onTurnCompleteRef = useRef<(() => void) | null>(null);
  const onUserSpeechDetectedRef = useRef<(() => void) | null>(null);
  const onUserActivityRef = useRef<(() => void) | null>(null);

  // ── Stop / cleanup ────────────────────────────────────────────────────

  const stopVoiceTutor = useCallback(() => {
    console.log("[TutorContext] Stopping voice tutor");
    realtimeRef.current?.stop();
    realtimeRef.current = null;
    setIsVoiceConnected(false);
    setIsRecording(false);
    setIsConnecting(false);
    setTutorMode("text");
    setSubtitlesText("");
    setIsMicMuted(false);
    setIsTutorSpeaking(false);
    // Sync global mode for explainRouter
    syncGlobalMode("chat");
  }, []);

  const stopAudioPlayback = useCallback(() => {
    console.log("[TutorContext] Stopping audio playback");
    realtimeRef.current?.clearAudio();
    setIsTutorSpeaking(false);
  }, []);

  // ── Start voice tutor ─────────────────────────────────────────────────

  const startVoiceTutor = useCallback(
    async (options?: { autoExplainMode?: boolean }) => {
      if (isRecording || isConnecting) {
        console.log(
          "[TutorContext] Already recording or connecting, skipping"
        );
        return;
      }

      console.log(
        "[TutorContext] Starting voice tutor, autoExplainMode:",
        options?.autoExplainMode ?? false
      );

      setTutorMode("voice");
      setIsConnecting(true);
      setSubtitlesText("");
      // Sync global mode for explainRouter
      syncGlobalMode("voice");

      try {
        const voiceCallbacks: VoiceCallbacks = {
          onOpen: () => {
            console.log("[TutorContext] ✓ Voice tutor connected");
            setIsVoiceConnected(true);
            setIsRecording(true);
            setIsConnecting(false);
          },
          onClose: () => {
            console.log("[TutorContext] Voice tutor disconnected");
            setIsVoiceConnected(false);
            setIsRecording(false);
            setIsConnecting(false);
            setIsTutorSpeaking(false);
          },
          onError: (error) => {
            console.error("[TutorContext] Voice tutor error:", error);
            setIsVoiceConnected(false);
            setIsRecording(false);
            setIsConnecting(false);
            setIsTutorSpeaking(false);
          },
          onText: (text) => {
            // Append streamed text for subtitles
            setSubtitlesText((prev) => prev + text);
          },
          onTurnComplete: () => {
            console.log("[TutorContext] Turn complete → forwarding");
            onTurnCompleteRef.current?.();
          },
          onInterrupted: () => {
            console.log(
              "[TutorContext] ⚡ User interrupted (API-level) → forwarding"
            );
            setIsTutorSpeaking(false);
            onUserSpeechDetectedRef.current?.();
          },
          onSpeakingStart: () => {
            setIsTutorSpeaking(true);
          },
          onSpeakingStop: () => {
            setIsTutorSpeaking(false);
          },
          onUserActivity: () => {
            // Forward local VAD activity
            onUserActivityRef.current?.();
          }
        };

        const handle = await startGeminiVoice(voiceCallbacks, {
          autoExplainMode: options?.autoExplainMode ?? false,
        });

        realtimeRef.current = handle;
      } catch (error) {
        console.error("[TutorContext] Failed to start voice tutor:", error);
        setIsConnecting(false);
        stopVoiceTutor();
      }
    },
    [isConnecting, isRecording, stopVoiceTutor]
  );

  // ── Helpers ───────────────────────────────────────────────────────────

  const setSlideExplanation = useCallback((text: string) => {
    setCurrentSlideExplanation(text);
  }, []);

  const sendTextToTutor = useCallback((text: string) => {
    if (realtimeRef.current) {
      console.log(
        "[TutorContext] 📤 sendTextToTutor:",
        text.substring(0, 80) + (text.length > 80 ? "..." : "")
      );
      setSubtitlesText(""); // Clear subtitles for new response
      realtimeRef.current.sendText(text);
    } else {
      console.warn(
        "[TutorContext] sendTextToTutor called but no active session"
      );
    }
  }, []);

  const muteMic = useCallback(() => {
    realtimeRef.current?.muteMic();
    setIsMicMuted(true);
    console.log("[TutorContext] Mic muted");
  }, []);

  const unmuteMic = useCallback(() => {
    realtimeRef.current?.unmuteMic();
    setIsMicMuted(false);
    console.log("[TutorContext] Mic unmuted");
  }, []);

  const clearSubtitles = useCallback(() => {
    setSubtitlesText("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopVoiceTutor();
  }, [stopVoiceTutor]);

  // ── Context value ─────────────────────────────────────────────────────

  const value = useMemo(
    () => ({
      tutorMode,
      isVoiceConnected,
      isRecording,
      isConnecting,
      currentSlideExplanation,
      subtitlesText,
      isTutorSpeaking,
      startVoiceTutor,
      stopVoiceTutor,
      setSlideExplanation,
      sendTextToTutor,
      muteMic,
      unmuteMic,
      isMicMuted,
      clearSubtitles,
      onTurnComplete: onTurnCompleteRef,
      onUserSpeechDetected: onUserSpeechDetectedRef,
      onUserActivity: onUserActivityRef,
      stopAudioPlayback,
    }),
    [
      tutorMode,
      isVoiceConnected,
      isRecording,
      isConnecting,
      currentSlideExplanation,
      subtitlesText,
      isTutorSpeaking,
      startVoiceTutor,
      stopVoiceTutor,
      setSlideExplanation,
      sendTextToTutor,
      muteMic,
      unmuteMic,
      isMicMuted,
      clearSubtitles,
      stopAudioPlayback,
    ]
  );

  return (
    <TutorContext.Provider value={value}>{children}</TutorContext.Provider>
  );
};

export function useTutor(): TutorContextValue {
  const ctx = useContext(TutorContext);
  if (!ctx) {
    throw new Error("useTutor must be used within TutorProvider");
  }
  return ctx;
}

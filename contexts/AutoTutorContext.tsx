/**
 * AutoTutorContext
 * Manages the auto-lecture state machine for voice-driven slide explanations.
 * Now supports Visual Explanation Overlays triggered by user voice commands.
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
import { useTutor } from "./TutorContext";
import { searchWeb, type WebSearchResult } from "../services/webSearch";
import { searchYouTube, type YouTubeResult } from "../services/youtubeSearch";
import {
  summarizeForTeaching,
  detectQuestionType,
  type SummarizedContent,
} from "../services/summarizeContent";
import { getResearchImage } from "../services/researchImageService";
import { generateVideoClip } from "../services/videoGen";
import { getApiKey } from "../services/geminiConfig";
import type { VisualOverlayState } from "../components/VisualExplainOverlay";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TutorState =
  | "idle"
  | "auto_explaining"
  | "paused_for_question"
  | "answering"
  | "research_mode"
  | "visual_explaining" // New state for visual explanation
  | "waiting_to_resume"
  | "finished";

export interface ResearchPanelData {
  question: string;
  summary: SummarizedContent | null;
  webResults: WebSearchResult[];
  youtubeResults: YouTubeResult[];
  isLoading: boolean;
}

export interface SlideData {
  id: number;
  title: string;
  bullet_points: string[];
  script: string;
  quiz_question?: string;
  answer?: string;
}

interface AutoTutorContextValue {
  /** Current state of the auto-tutor state machine */
  tutorState: TutorState;
  /** Whether auto-explain mode is active */
  isAutoMode: boolean;
  /** Current slide index being explained */
  currentSlideIndex: number;
  /** Current subtitles text */
  subtitlesText: string;
  /** Whether the user is speaking */
  isUserSpeaking: boolean;
  /** Data for the research panel (when in research_mode) */
  researchPanelData: ResearchPanelData | null;
  /** Whether the research panel is visible */
  showResearchPanel: boolean;
  
  /** Visual Overlay State */
  visualOverlay: VisualOverlayState | null;
  showVisualOverlay: boolean;
  closeVisualOverlay: () => void;

  /** Start auto-explain mode with the given slides */
  startAutoExplain: (slides: SlideData[]) => void;
  /** Stop/cancel auto-explain mode */
  stopAutoExplain: () => void;
  /** Pause auto-explain (user clicked pause) */
  pauseAutoExplain: () => void;
  /** Resume from waiting state (user said "continue") */
  resumeAutoExplain: () => void;
  /** Set the current slide index (for manual navigation during auto mode) */
  goToSlide: (index: number) => void;
  /** Close the research panel */
  closeResearchPanel: () => void;
  /** Total number of slides */
  totalSlides: number;
}

const AutoTutorContext = createContext<AutoTutorContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export const AutoTutorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    isVoiceConnected,
    startVoiceTutor,
    stopVoiceTutor,
    sendTextToTutor,
    subtitlesText,
    clearSubtitles,
    onTurnComplete,
    onUserSpeechDetected,
    onUserActivity,
    stopAudioPlayback,
    muteMic,
    unmuteMic,
  } = useTutor();

  // ─── State ───────────────────────────────────────────────────────────────

  const [tutorState, setTutorState] = useState<TutorState>("idle");
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [researchPanelData, setResearchPanelData] =
    useState<ResearchPanelData | null>(null);
  const [showResearchPanel, setShowResearchPanel] = useState(false);
  
  // Visual Overlay State
  const [visualOverlay, setVisualOverlay] = useState<VisualOverlayState | null>(null);
  const [showVisualOverlay, setShowVisualOverlay] = useState(false);

  // ─── Refs ───────────────────────────────────────────────────────────────

  const slidesRef = useRef<SlideData[]>([]);
  const stateRef = useRef<TutorState>("idle");
  const currentSlideIndexRef = useRef(0);
  const isAutoModeRef = useRef(false);
  const pendingSlideExplainRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const researchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVisualGeneratingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    stateRef.current = tutorState;
    console.log("[AutoTutor] State →", tutorState);
  }, [tutorState]);

  useEffect(() => {
    currentSlideIndexRef.current = currentSlideIndex;
  }, [currentSlideIndex]);

  useEffect(() => {
    isAutoModeRef.current = isAutoMode;
  }, [isAutoMode]);

  // ─── Cleanup ────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (researchTimerRef.current) clearTimeout(researchTimerRef.current);
    };
  }, []);

  // ─── Slide Explanation ──────────────────────────────────────────────────

  const explainCurrentSlide = useCallback(() => {
    const slides = slidesRef.current;
    const index = currentSlideIndexRef.current;

    if (index >= slides.length) {
      console.log("[AutoTutor] 🏁 All slides finished");
      setTutorState("finished");
      return;
    }

    const slide = slides[index];
    setTutorState("auto_explaining");
    clearSubtitles();

    const slideContent = `
SLIDE ${index + 1} of ${slides.length}
Title: ${slide.title}

Key Points:
${slide.bullet_points.map((bp) => `• ${bp}`).join("\n")}

Teaching Script:
${slide.script}

Now explain this slide content to the student in a friendly, conversational way. Be clear and engaging.`;

    console.log("[AutoTutor] 📤 Sending explanation request to Gemini");
    sendTextToTutor(slideContent);
  }, [sendTextToTutor, clearSubtitles]);

  // ─── Turn Complete Handler ──────────────────────────────────────────────

  const handleTurnComplete = useCallback(() => {
    const state = stateRef.current;
    console.log("[AutoTutor] 🔄 Turn complete in state:", state);

    if (state === "auto_explaining") {
      // Auto-advance logic
      const nextIndex = currentSlideIndexRef.current + 1;
      if (nextIndex >= slidesRef.current.length) {
        setTutorState("finished");
        return;
      }
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = setTimeout(() => {
        advanceTimerRef.current = null;
        if (stateRef.current === "auto_explaining" && isAutoModeRef.current) {
          setCurrentSlideIndex(nextIndex);
          currentSlideIndexRef.current = nextIndex;
          explainCurrentSlide();
        }
      }, 1500);
    } else if (state === "answering" || state === "paused_for_question") {
      // If we received a turn complete while answering (or even paused), 
      // we assume the model has finished its answer to the user's question.
      // We then wait for the user to resume.
      setTutorState("waiting_to_resume");
      // sendTextToTutor('Say "continue" when you\'re ready.'); // Optional: avoid spamming
    } else if (state === "research_mode") {
      // Research done -> wait
      setTutorState("waiting_to_resume");
    } else if (state === "visual_explaining") {
      // If we are still generating, this turn complete was just the "Please wait" message. Ignore it.
      if (isVisualGeneratingRef.current) {
        console.log("[AutoTutor] Ignoring turn complete (generation in progress)");
        return;
      }

      // Visual explanation done -> close overlay and resume
      console.log("[AutoTutor] 👁️ Visual explanation complete");
      
      // Auto-close overlay after brief delay
      setTimeout(() => {
        setShowVisualOverlay(false);
        setVisualOverlay(null);
        unmuteMic();
        
        console.log("[AutoTutor] Resuming flow after visual");
        setTutorState("waiting_to_resume");
        // We do not auto-resume immediately to give user a breath, but they can say 'continue'
      }, 1000);
    }
  }, [explainCurrentSlide, sendTextToTutor, unmuteMic]);

  // ─── User Speech Detection ──────────────────────────────────────────────

  const handleUserSpeechDetected = useCallback(() => {
    const state = stateRef.current;
    // Interruption logic: If explaining, pause immediately.
    if (state === "auto_explaining") {
      console.log("[AutoTutor] ⚡ User activity detected! Pausing auto-explain.");
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
      setIsUserSpeaking(true);
      // Immediately stop the narration so we can hear the user
      stopAudioPlayback();
      setTutorState("paused_for_question");

      // Give it a moment to settle into answering state
      setTimeout(() => {
        if (stateRef.current === "paused_for_question") {
          setIsUserSpeaking(false);
          setTutorState("answering");
        }
      }, 2000);
    }
  }, [stopAudioPlayback]);

  useEffect(() => {
    if (isAutoMode) {
      onTurnComplete.current = handleTurnComplete;
      // Use both API interruption AND local VAD activity to trigger pause
      onUserSpeechDetected.current = handleUserSpeechDetected;
      onUserActivity.current = handleUserSpeechDetected;
    } else {
      onTurnComplete.current = null;
      onUserSpeechDetected.current = null;
      onUserActivity.current = null;
    }
    return () => {
      onTurnComplete.current = null;
      onUserSpeechDetected.current = null;
      onUserActivity.current = null;
    };
  }, [isAutoMode, handleTurnComplete, handleUserSpeechDetected, onTurnComplete, onUserSpeechDetected, onUserActivity]);

  // ─── Resume Command Detection ───────────────────────────────────────────

  useEffect(() => {
    if (stateRef.current !== "waiting_to_resume") return;
    const lower = subtitlesText.toLowerCase();
    const resumeKeywords = ["continue", "next", "ok", "go on", "resume", "keep going"];
    if (resumeKeywords.some((kw) => lower.includes(kw)) && subtitlesText.length > 5) {
      setTimeout(() => {
        if (stateRef.current === "waiting_to_resume") {
          const nextIndex = currentSlideIndexRef.current + 1;
          if (nextIndex < slidesRef.current.length) {
            setCurrentSlideIndex(nextIndex);
            currentSlideIndexRef.current = nextIndex;
          }
          clearSubtitles();
          explainCurrentSlide();
        }
      }, 1000);
    }
  }, [subtitlesText, clearSubtitles, explainCurrentSlide]);

  // ─── Question Classification & Visual Request ───────────────────────────

  useEffect(() => {
    if (tutorState !== "paused_for_question") return;
    if (researchTimerRef.current) clearTimeout(researchTimerRef.current);

    // Wait for transition to answering + buffer
    researchTimerRef.current = setTimeout(async () => {
      researchTimerRef.current = null;
      if (stateRef.current !== "answering") return;

      const currentSlide = slidesRef.current[currentSlideIndexRef.current];
      if (!currentSlide) return;

      const recentText = subtitlesText.slice(-250); // increased buffer
      if (!recentText.trim()) return;

      try {
        const questionType = await detectQuestionType(
          recentText,
          `${currentSlide.title}\n${currentSlide.bullet_points.join("\n")}\n${currentSlide.script}`
        );

        if (questionType === "external") {
          setTutorState("research_mode");
          setResearchPanelData({
            question: recentText.trim(),
            summary: null,
            webResults: [],
            youtubeResults: [],
            isLoading: true,
          });
          setShowResearchPanel(true);

          const [webResults, youtubeResults] = await Promise.all([
            searchWeb(recentText.trim()),
            searchYouTube(recentText.trim()),
          ]);

          const summary = await summarizeForTeaching(
            recentText.trim(),
            webResults.map((r) => `${r.title}: ${r.snippet}`),
            youtubeResults.map((r) => r.description)
          );

          setResearchPanelData({
            question: recentText.trim(),
            summary,
            webResults,
            youtubeResults,
            isLoading: false,
          });

          sendTextToTutor(
            `Let me share what I found about the student's question. Here's a summary:\n\n${summary.teacherScript}\n\nExplain this to the student. Start with "Let me show you something interesting I found."`
          );
        } else if (questionType === "visual_request") {
          // ── VISUAL REQUEST DETECTED ─────────────────────────────
          console.log("[AutoTutor] 🎨 Visual request detected");
          setTutorState("visual_explaining");
          
          // Mute mic to prevent self-interruption during generation
          muteMic();
          isVisualGeneratingRef.current = true;
          
          // Determine if video requested via keywords
          const textLower = recentText.toLowerCase();
          const isVideo = textLower.includes("video") || textLower.includes("animation") || textLower.includes("movie");
          const visualPrompt = recentText.replace(/show|me|can|you|generate|create|visualize/gi, "").trim() || currentSlide.title;

          // Initialize overlay state
          setVisualOverlay({
            url: null,
            type: isVideo ? 'video' : 'image',
            isGenerating: true,
            prompt: visualPrompt
          });
          setShowVisualOverlay(true);

          // Tell tutor to announce generation
          sendTextToTutor(
            'Say exactly: "Please wait for a moment. I’m generating a visual explanation for you." and wait for further instructions.'
          );

          // Generate Content
          let url: string | null = null;
          try {
            if (isVideo) {
              // Note: This can take time (5-10s+), user will see loader
              url = await generateVideoClip(visualPrompt, getApiKey());
            } else {
              url = await getResearchImage(visualPrompt, currentSlide.title);
            }
          } catch (e) {
            console.error("Visual generation failed", e);
          }

          // Mark generation as done
          isVisualGeneratingRef.current = false;

          if (url) {
            setVisualOverlay(prev => prev ? { ...prev, url, isGenerating: false } : null);
            // Trigger explanation of the generated visual
            sendTextToTutor(
              `The ${isVideo ? 'video' : 'diagram'} is ready and visible to the student. Explain what it shows regarding "${visualPrompt}". Be descriptive as they are looking at it.`
            );
          } else {
            setShowVisualOverlay(false);
            setVisualOverlay(null);
            unmuteMic(); // Failed, so unmute
            sendTextToTutor("I had trouble generating that visual. Let me explain it verbally instead.");
            // Revert state to answering
            setTutorState("answering"); 
          }
        }
      } catch (error) {
        console.error("[AutoTutor] Question classification error:", error);
      }
    }, 3000);
  }, [tutorState, subtitlesText, sendTextToTutor, muteMic, unmuteMic]);

  // ─── Actions ────────────────────────────────────────────────────────────

  const startAutoExplain = useCallback(async (slides: SlideData[]) => {
    slidesRef.current = slides;
    setCurrentSlideIndex(0);
    setIsAutoMode(true);
    setTutorState("auto_explaining");
    setShowResearchPanel(false);
    setShowVisualOverlay(false);
    
    if (!isVoiceConnected) {
      await startVoiceTutor({ autoExplainMode: true });
      pendingSlideExplainRef.current = true;
    } else {
      setTimeout(() => explainCurrentSlide(), 500);
    }
  }, [isVoiceConnected, startVoiceTutor, explainCurrentSlide]);

  useEffect(() => {
    if (isVoiceConnected && pendingSlideExplainRef.current && isAutoModeRef.current) {
      pendingSlideExplainRef.current = false;
      setTimeout(() => explainCurrentSlide(), 1000);
    }
  }, [isVoiceConnected, explainCurrentSlide]);

  const stopAutoExplain = useCallback(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (researchTimerRef.current) clearTimeout(researchTimerRef.current);
    setIsAutoMode(false);
    setTutorState("idle");
    stopAudioPlayback();
    clearSubtitles();
    setShowResearchPanel(false);
    setShowVisualOverlay(false);
    setVisualOverlay(null);
    stopVoiceTutor();
  }, [stopAudioPlayback, clearSubtitles, stopVoiceTutor]);

  const pauseAutoExplain = useCallback(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    stopAudioPlayback();
    setTutorState("paused_for_question");
  }, [stopAudioPlayback]);

  const resumeAutoExplain = useCallback(() => {
    clearSubtitles();
    if (stateRef.current === "waiting_to_resume" || stateRef.current === "paused_for_question" || stateRef.current === "answering") {
      const nextIndex = currentSlideIndexRef.current + 1;
      if (nextIndex < slidesRef.current.length) {
        setCurrentSlideIndex(nextIndex);
        currentSlideIndexRef.current = nextIndex;
      }
    }
    explainCurrentSlide();
  }, [clearSubtitles, explainCurrentSlide]);

  const goToSlide = useCallback((index: number) => {
    if (index < 0 || index >= slidesRef.current.length) return;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    setCurrentSlideIndex(index);
    currentSlideIndexRef.current = index;
    if (isAutoModeRef.current && stateRef.current !== "idle") {
      clearSubtitles();
      stopAudioPlayback();
      explainCurrentSlide();
    }
  }, [clearSubtitles, stopAudioPlayback, explainCurrentSlide]);

  const closeResearchPanel = useCallback(() => setShowResearchPanel(false), []);
  const closeVisualOverlay = useCallback(() => {
    setShowVisualOverlay(false);
    setVisualOverlay(null);
  }, []);

  // ─── Value ──────────────────────────────────────────────────────────────

  const value = useMemo(() => ({
    tutorState,
    isAutoMode,
    currentSlideIndex,
    subtitlesText,
    isUserSpeaking,
    researchPanelData,
    showResearchPanel,
    visualOverlay,
    showVisualOverlay,
    startAutoExplain,
    stopAutoExplain,
    pauseAutoExplain,
    resumeAutoExplain,
    goToSlide,
    closeResearchPanel,
    closeVisualOverlay,
    totalSlides: slidesRef.current.length,
  }), [
    tutorState, isAutoMode, currentSlideIndex, subtitlesText, isUserSpeaking, 
    researchPanelData, showResearchPanel, visualOverlay, showVisualOverlay,
    startAutoExplain, stopAutoExplain, pauseAutoExplain, resumeAutoExplain, 
    goToSlide, closeResearchPanel, closeVisualOverlay
  ]);

  return (
    <AutoTutorContext.Provider value={value}>
      {children}
    </AutoTutorContext.Provider>
  );
};

export function useAutoTutor(): AutoTutorContextValue {
  const ctx = useContext(AutoTutorContext);
  if (!ctx) throw new Error("useAutoTutor must be used within AutoTutorProvider");
  return ctx;
}

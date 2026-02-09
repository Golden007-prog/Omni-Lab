/**
 * WorkspaceContext
 * ────────────────────────────────────────────────────────────
 * CENTRAL BRAIN of the application.
 *
 * Holds ALL workspace data: sources, generated content (slides,
 * flashcards, quiz, mindmap, etc.), scientist state, and
 * generation status.
 *
 * Every component reads data from here.  No component-local
 * copies of sources or generated content.
 *
 * View switching is handled by ViewContext (separate concern).
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";

import {
  SourceFile,
  ScientistState,
  SimulationStatus,
  VisualizationStatus,
  ThoughtLog,
} from "../types";

import { SlidesContent, SimulationContent } from "../services/marathonLoop";
import type { FlashcardsData } from "../components/FlashcardsViewer";
import type { LivePresentationData } from "../components/LivePresentationViewer";
import type { GeneratedSlidesDeck } from "../services/generateSlides";
import type { StudioActionType } from "../components/StudioPanel";
import { arrayBufferToBase64 } from "../utils/audio";

// =============================================================================
// Types
// =============================================================================

/** Extracted text representation of a source document. */
export interface WorkspaceDocument {
  sourceId: string;
  name: string;
  text: string; // Extracted text (or placeholder until real extraction)
}

export interface WorkspaceState {
  // ── Sources ──────────────────────────────────────────────
  sources: SourceFile[];
  documents: WorkspaceDocument[];
  isWebSearchEnabled: boolean;

  // ── Generated Content (cached, never lost on view switch) ─
  slides: SlidesContent | null;
  flashcards: FlashcardsData | null;
  livePresentation: LivePresentationData | null;
  pptxDeck: GeneratedSlidesDeck | null;
  pptxFileNameBase: string;
  simulation: SimulationContent | null;

  // ── Tool-generated content ──────────────────────────────
  quiz: any | null;
  mindmap: any | null;
  infographic: any | null;
  video: any | null;
  dataTable: any | null;
  report: any | null;
  notes: string[];

  // ── Generation status ──────────────────────────────────
  isGenerating: boolean;
  generatingType: StudioActionType | null;
  isGeneratingPresentation: boolean;

  // ── Scientist / simulation state ───────────────────────
  scientistState: ScientistState;

  // ── Speech ─────────────────────────────────────────────
  autoSpeak: boolean;
  isSpeaking: boolean;
}

export interface WorkspaceActions {
  // Sources
  addSource: (file: File) => Promise<void>;
  removeSource: (id: string) => void;
  setWebSearchEnabled: (enabled: boolean) => void;

  // Content setters (set data, keep it cached)
  setSlides: (data: SlidesContent | null) => void;
  setFlashcards: (data: FlashcardsData | null) => void;
  setLivePresentation: (data: LivePresentationData | null) => void;
  setPptxDeck: (deck: GeneratedSlidesDeck | null, fileNameBase?: string) => void;
  setSimulation: (data: SimulationContent | null) => void;
  setQuiz: (data: any | null) => void;
  setMindmap: (data: any | null) => void;
  setInfographic: (data: any | null) => void;
  setVideo: (data: any | null) => void;
  setDataTable: (data: any | null) => void;
  setReport: (data: any | null) => void;

  // Generation status
  setGenerating: (isGenerating: boolean, type?: StudioActionType | null) => void;
  setGeneratingPresentation: (isGenerating: boolean) => void;

  // Scientist
  setScientistState: React.Dispatch<React.SetStateAction<ScientistState>>;
  addThought: (thought: ThoughtLog) => void;

  // Speech
  setAutoSpeak: (enabled: boolean) => void;
  setIsSpeaking: (speaking: boolean) => void;

  // Helpers
  /** Returns concatenated text from all documents — used by agents, chat prompts. */
  getSourceContent: () => string;
  /** Returns true if any source data exists. */
  hasSources: boolean;
}

type WorkspaceContextValue = WorkspaceState & WorkspaceActions;

// =============================================================================
// Context
// =============================================================================

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // ── Sources ──────────────────────────────────────────────────────────
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);

  // ── Generated content (cached) ──────────────────────────────────────
  const [slides, setSlides] = useState<SlidesContent | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardsData | null>(null);
  const [livePresentation, setLivePresentation] = useState<LivePresentationData | null>(null);
  const [pptxDeck, _setPptxDeck] = useState<GeneratedSlidesDeck | null>(null);
  const [pptxFileNameBase, setPptxFileNameBase] = useState("omni-lab");
  const [simulation, setSimulation] = useState<SimulationContent | null>(null);
  const [quiz, setQuiz] = useState<any | null>(null);
  const [mindmap, setMindmap] = useState<any | null>(null);
  const [infographic, setInfographic] = useState<any | null>(null);
  const [video, setVideo] = useState<any | null>(null);
  const [dataTable, setDataTable] = useState<any | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [notes] = useState<string[]>([]);

  // ── Generation status ──────────────────────────────────────────────
  const [isGenerating, _setIsGenerating] = useState(false);
  const [generatingType, _setGeneratingType] = useState<StudioActionType | null>(null);
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);

  // ── Scientist state ────────────────────────────────────────────────
  const [scientistState, setScientistState] = useState<ScientistState>({
    status: SimulationStatus.IDLE,
    visualizationStatus: VisualizationStatus.IDLE,
    thoughts: [],
    result: null,
    attemptCount: 0,
  });

  // ── Speech ────────────────────────────────────────────────────────
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── Source management ─────────────────────────────────────────────

  const addSource = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      const id = Math.random().toString(36).substr(2, 9);

      const newSource: SourceFile = {
        id,
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64,
        file,
      };

      setSources((prev) => [...prev, newSource]);

      // Create document text entry.
      // TODO: Replace with real PDF/text extraction when available.
      const docText: WorkspaceDocument = {
        sourceId: id,
        name: file.name,
        text: `Source: ${file.name}\nType: ${file.type}\nSize: ${(file.size / 1024).toFixed(1)} KB`,
      };
      setDocuments((prev) => [...prev, docText]);

      console.log("[Workspace] Source added:", file.name);
    } catch (e) {
      console.error("Failed to read file", e);
      alert("Could not upload file.");
    }
  }, []);

  const removeSource = useCallback((id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    setDocuments((prev) => prev.filter((d) => d.sourceId !== id));
    console.log("[Workspace] Source removed:", id);
  }, []);

  // ── Content setters ───────────────────────────────────────────────

  const setPptxDeck = useCallback(
    (deck: GeneratedSlidesDeck | null, fileNameBase?: string) => {
      _setPptxDeck(deck);
      if (fileNameBase) setPptxFileNameBase(fileNameBase);
    },
    []
  );

  const setGenerating = useCallback(
    (generating: boolean, type?: StudioActionType | null) => {
      _setIsGenerating(generating);
      _setGeneratingType(type ?? null);
    },
    []
  );

  const addThought = useCallback((thought: ThoughtLog) => {
    setScientistState((prev) => ({
      ...prev,
      thoughts: [...prev.thoughts, thought],
    }));
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────

  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;
  const documentsRef = useRef(documents);
  documentsRef.current = documents;

  const getSourceContent = useCallback((): string => {
    if (documentsRef.current.length === 0) {
      return "No sources uploaded. Please provide some context or upload documents.";
    }
    return documentsRef.current.map((d) => d.text).join("\n\n");
  }, []);

  const hasSources = sources.length > 0;

  // ── Debug ──────────────────────────────────────────────────────────

  // Log state changes (dev only)
  const prevSourceCount = useRef(sources.length);
  if (sources.length !== prevSourceCount.current) {
    console.log("[Workspace] sources:", sources.length, "documents:", documents.length);
    prevSourceCount.current = sources.length;
  }

  // ── Context value ──────────────────────────────────────────────────

  const value: WorkspaceContextValue = {
    // state
    sources,
    documents,
    isWebSearchEnabled,
    slides,
    flashcards,
    livePresentation,
    pptxDeck,
    pptxFileNameBase,
    simulation,
    quiz,
    mindmap,
    infographic,
    video,
    dataTable,
    report,
    notes,
    isGenerating,
    generatingType,
    isGeneratingPresentation,
    scientistState,
    autoSpeak,
    isSpeaking,

    // actions
    addSource,
    removeSource,
    setWebSearchEnabled: setIsWebSearchEnabled,
    setSlides,
    setFlashcards,
    setLivePresentation,
    setPptxDeck,
    setSimulation,
    setQuiz,
    setMindmap,
    setInfographic,
    setVideo,
    setDataTable,
    setReport,
    setGenerating,
    setGeneratingPresentation: setIsGeneratingPresentation,
    setScientistState,
    addThought,
    setAutoSpeak,
    setIsSpeaking,
    getSourceContent,
    hasSources,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}

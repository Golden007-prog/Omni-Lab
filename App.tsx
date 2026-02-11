import React, { useState, useCallback, useRef, useEffect } from 'react';
import ApiKeyModal from './components/ApiKeyModal';
import TextChat, { TextChatHandle } from './components/TextChat';
import Visualizer from './components/Visualizer';
import ThoughtLogger from './components/ThoughtLogger';
import SourcesPanel from './components/SourcesPanel';
import StudioPanel, { StudioAction, StudioActionType } from './components/StudioPanel';
import FlashcardsViewer from './components/FlashcardsViewer';
import LivePresentationViewer from './components/LivePresentationViewer';
import QuizViewer from './components/QuizViewer';
import InfographicViewer from './components/InfographicViewer';
import VideoViewer from './components/VideoViewer';
import MindmapViewer from './components/MindmapViewer';
import DataTableViewer from './components/DataTableViewer';
import ReportViewer from './components/ReportViewer';
import FloatingVoiceTutor from './components/FloatingVoiceTutor';
import SubtitlesBar from './components/SubtitlesBar';
import ResearchPanel from './components/ResearchPanel';
import WorkspaceNav from './components/WorkspaceNav';
import VisualExplainOverlay from './components/VisualExplainOverlay';
import { TutorProvider, useTutor, setGlobalModeSetter } from './contexts/TutorContext';
import { AutoTutorProvider, useAutoTutor } from './contexts/AutoTutorContext';
import { AppModeProvider, useAppMode } from './contexts/AppModeContext';
import { ViewProvider, useView } from './contexts/ViewContext';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { SimulationStatus, VisualizationStatus } from './types';
import { processUserMessage, OmniResponse, SlidesContent, SimulationContent, getApiKey } from './services/marathonLoop';
import { runFlashcardsAgent, runPresentationAgent, runQuizAgent, runInfographicAgent, runVideoAgent, runMindmapAgent, runDataTableAgent, runReportAgent } from './services/agents';
import { generateSlides } from './services/generateSlides';
import { generatePresentation } from './services/pptGenerator';
import { exportElementToPdf } from './services/pdfExport';
import SlidePreview from './components/SlidePreview';
import { speak, cancelSpeech } from './utils/audio';
import { explainFlashcardInChat, explainFlashcardInVoice } from './services/explainRouter';
import { registerPanelController, unregisterPanelController } from './services/panelBridge';
import { Beaker, MessageSquare, Sparkles, Presentation, Volume2, VolumeX, Radio, Menu, X } from 'lucide-react';
import MobileNav, { MobilePanel } from './components/MobileNav';
import { useIsMobile } from './hooks/useIsMobile';

// =============================================================================
// TUTOR UI HELPERS
// =============================================================================

const VoiceControlButton: React.FC = () => {
  const { tutorMode, startVoiceTutor, stopVoiceTutor, isRecording } = useTutor();
  const isVoice = tutorMode === "voice";

  return (
    <button
      onClick={isVoice ? stopVoiceTutor : () => startVoiceTutor()}
      className={`px-3 py-2 min-h-[44px] rounded-lg border text-xs font-medium transition-all ${
        isVoice
          ? "bg-red-900/40 border-red-700 text-red-200 hover:bg-red-900/60 active:bg-red-900/80"
          : "bg-purple-900/50 border-purple-700 text-purple-200 hover:bg-purple-900/70 active:bg-purple-900/90"
      }`}
      title={isVoice ? "Stop Voice Tutor" : "Start Voice Tutor"}
    >
      {isVoice ? "Stop Voice" : isRecording ? "Starting..." : "Start Voice"}
    </button>
  );
};

const AppModeSyncer: React.FC = () => {
  const { setMode } = useAppMode();
  useEffect(() => {
    setGlobalModeSetter(setMode);
    return () => { setGlobalModeSetter(() => {}); };
  }, [setMode]);
  return null;
};

const PanelSyncer: React.FC<{ setActiveTab: (tab: 'chat' | 'studio' | 'logs') => void }> = ({ setActiveTab }) => {
  useEffect(() => {
    registerPanelController(setActiveTab as any);
    return () => { unregisterPanelController(); };
  }, [setActiveTab]);
  return null;
};

const MobileVoiceTrigger: React.FC<{ shouldTrigger: boolean; onTriggered: () => void }> = ({
  shouldTrigger,
  onTriggered,
}) => {
  const { tutorMode, startVoiceTutor, stopVoiceTutor } = useTutor();
  useEffect(() => {
    if (shouldTrigger) {
      if (tutorMode === 'voice') { stopVoiceTutor(); } else { startVoiceTutor(); }
      onTriggered();
    }
  }, [shouldTrigger, tutorMode, startVoiceTutor, stopVoiceTutor, onTriggered]);
  return null;
};

const VoiceStatusBadge: React.FC = () => {
  const { tutorMode, isVoiceConnected, isRecording } = useTutor();
  const status =
    tutorMode !== "voice" ? "IDLE"
    : isRecording ? "LISTENING"
    : isVoiceConnected ? "CONNECTED"
    : "CONNECTING";

  const statusClass =
    status === "LISTENING" ? "bg-green-900/50 border-green-700 text-green-300"
    : status === "CONNECTED" ? "bg-blue-900/50 border-blue-700 text-blue-300"
    : status === "CONNECTING" ? "bg-yellow-900/50 border-yellow-700 text-yellow-300"
    : "bg-slate-900 border-slate-800 text-slate-400";

  return (
    <div className={`text-[10px] font-mono px-3 py-1 rounded-full flex items-center gap-2 ${statusClass}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
      <Radio className="w-3 h-3" />
      TEACHER: {status}
    </div>
  );
};

const VisualOverlayContainer: React.FC = () => {
  const { visualOverlay, showVisualOverlay, closeVisualOverlay } = useAutoTutor();
  return (
    <VisualExplainOverlay
      state={visualOverlay}
      isVisible={showVisualOverlay}
      onClose={closeVisualOverlay}
    />
  );
};

const InteractionTabs: React.FC<{
  activeTab: "chat" | "studio";
  setActiveTab: React.Dispatch<React.SetStateAction<"chat" | "studio">>;
}> = ({ activeTab, setActiveTab }) => {
  const { tutorMode } = useTutor();
  const hideChat = tutorMode === "voice";

  useEffect(() => {
    if (hideChat && activeTab === "chat") setActiveTab("studio");
  }, [hideChat, activeTab, setActiveTab]);

  return (
    <div className="flex items-center p-1 m-2 bg-slate-900 border border-slate-800 rounded-lg shrink-0 overflow-x-auto">
      <button onClick={() => setActiveTab('studio')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'studio' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
        <Sparkles className="w-4 h-4" /> Studio
      </button>
      {!hideChat && (
        <button onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'chat' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
          <MessageSquare className="w-4 h-4" /> Chat
        </button>
      )}
    </div>
  );
};

const TextTutorPanel: React.FC<{
  activeTab: "chat" | "studio";
  apiKey: string;
  onSimulationRequest: (hypothesis: string) => Promise<string>;
  textChatRef: React.RefObject<TextChatHandle>;
}> = ({ activeTab, apiKey, onSimulationRequest, textChatRef }) => {
  const { tutorMode } = useTutor();
  const ws = useWorkspace();
  if (tutorMode === "voice") return null;

  return (
    <div className={`h-full ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
      <TextChat
        ref={textChatRef}
        apiKey={apiKey}
        sources={ws.sources}
        isWebSearchEnabled={ws.isWebSearchEnabled}
        onSimulationRequest={onSimulationRequest}
        disabled={false}
      />
    </div>
  );
};

// =============================================================================
// APP SHELL — consumes WorkspaceContext + ViewContext
// =============================================================================

const AppShell: React.FC<{ apiKey: string }> = ({ apiKey }) => {
  // ── Contexts ───────────────────────────────────────────────────────
  const { activeView, setView } = useView();
  const ws = useWorkspace();

  // ── Local UI state (not shared data) ──────────────────────────────
  const [activeTab, setActiveTab] = useState<'chat' | 'studio'>('chat');
  const textChatRef = useRef<TextChatHandle>(null);

  // Mobile
  const isMobile = useIsMobile();
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanel>('slides');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileVoiceTrigger, setMobileVoiceTrigger] = useState(false);

  const handleMobilePanelChange = useCallback((panel: MobilePanel) => {
    if (panel === 'voice') {
      setMobileVoiceTrigger(true);
    } else {
      setActiveMobilePanel(panel);
      setMobileMenuOpen(false);
    }
  }, []);

  // ── Debug: log active view changes ────────────────────────────────
  useEffect(() => {
    console.log("Active view:", activeView);
  }, [activeView]);

  // ── Force layout recalculation on view switch ─────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
    return () => clearTimeout(timer);
  }, [activeView]);

  // ==========================================================================
  // STUDIO ACTION HANDLER
  // ==========================================================================

  const handleStudioAction = useCallback(async (action: StudioAction) => {
    const sourceContent = ws.getSourceContent();

    switch (action.type) {
      case 'flashcards': {
        ws.setGenerating(true, 'flashcards');
        try {
          const result = await runFlashcardsAgent(sourceContent, ws.sources.length);
          ws.setFlashcards({
            title: result.title || 'Study Flashcards',
            sourceCount: ws.sources.length,
            cards: result.cards.map((card, idx) => ({
              id: card.id || idx + 1,
              front: card.front,
              back: card.back,
              topic: card.topic,
            })),
          });
          setView('flashcards');
        } catch (error) {
          console.error('Flashcards generation failed:', error);
          alert('Failed to generate flashcards. Please try again.');
        } finally {
          ws.setGenerating(false);
        }
        break;
      }

      case 'quiz': {
        ws.setGenerating(true, 'quiz');
        try {
          const result = await runQuizAgent(sourceContent, ws.sources.length);
          ws.setQuiz({
            title: result.title || 'Study Quiz',
            sourceCount: ws.sources.length,
            questions: result.questions.map((q, idx) => ({
              id: q.id || idx + 1,
              question: q.question,
              options: q.options,
              correctIndex: q.correctIndex,
              explanation: q.explanation,
              topic: q.topic,
            })),
          });
          setView('quiz');
        } catch (error) {
          console.error('Quiz generation failed:', error);
          alert('Failed to generate quiz. Please try again.');
        } finally {
          ws.setGenerating(false);
        }
        break;
      }

      case 'infographic': {
        ws.setGenerating(true, 'infographic');
        try {
          const result = await runInfographicAgent(sourceContent, ws.sources.length);
          ws.setInfographic({
            title: result.title || 'Infographic',
            subtitle: result.subtitle,
            sourceCount: ws.sources.length,
            sections: result.sections || [],
            keyStats: result.keyStats || [],
          });
          setView('infographic');
        } catch (error) {
          console.error('Infographic generation failed:', error);
          alert('Failed to generate infographic. Please try again.');
        } finally {
          ws.setGenerating(false);
        }
        break;
      }

      case 'video_overview': {
        ws.setGenerating(true, 'video_overview');
        try {
          const result = await runVideoAgent(sourceContent, ws.sources.length);
          ws.setVideo({
            title: result.title || 'Video Script',
            duration: result.duration,
            sourceCount: ws.sources.length,
            sections: result.sections || [],
            summary: result.summary,
          });
          setView('video');
        } catch (error) {
          console.error('Video generation failed:', error);
          alert('Failed to generate video script. Please try again.');
        } finally {
          ws.setGenerating(false);
        }
        break;
      }

      case 'audio_overview': {
        // Audio uses the same video agent but with audio-focused view
        ws.setGenerating(true, 'audio_overview');
        try {
          const result = await runVideoAgent(sourceContent, ws.sources.length);
          ws.setVideo({
            title: result.title || 'Audio Script',
            duration: result.duration,
            sourceCount: ws.sources.length,
            sections: result.sections || [],
            summary: result.summary,
          });
          setView('audio');
        } catch (error) {
          console.error('Audio generation failed:', error);
          alert('Failed to generate audio script. Please try again.');
        } finally {
          ws.setGenerating(false);
        }
        break;
      }

      case 'mind_map': {
        ws.setGenerating(true, 'mind_map');
        try {
          const result = await runMindmapAgent(sourceContent, ws.sources.length);
          ws.setMindmap({
            title: result.title || 'Mind Map',
            sourceCount: ws.sources.length,
            rootNode: result.rootNode,
            summary: result.summary,
          });
          setView('mindmap');
        } catch (error) {
          console.error('Mind map generation failed:', error);
          alert('Failed to generate mind map. Please try again.');
        } finally {
          ws.setGenerating(false);
        }
        break;
      }

      case 'data_table': {
        ws.setGenerating(true, 'data_table');
        try {
          const result = await runDataTableAgent(sourceContent, ws.sources.length);
          ws.setDataTable({
            title: result.title || 'Data Table',
            description: result.description,
            sourceCount: ws.sources.length,
            columns: result.columns || [],
            rows: result.rows || [],
          });
          setView('data_table');
        } catch (error) {
          console.error('Data table generation failed:', error);
          alert('Failed to generate data table. Please try again.');
        } finally {
          ws.setGenerating(false);
        }
        break;
      }

      case 'reports': {
        ws.setGenerating(true, 'reports');
        try {
          const result = await runReportAgent(sourceContent, ws.sources.length);
          ws.setReport({
            title: result.title || 'Report',
            subtitle: result.subtitle,
            sourceCount: ws.sources.length,
            executiveSummary: result.executiveSummary || '',
            sections: result.sections || [],
            conclusions: result.conclusions || [],
            recommendations: result.recommendations || [],
          });
          setView('report');
        } catch (error) {
          console.error('Report generation failed:', error);
          alert('Failed to generate report. Please try again.');
        } finally {
          ws.setGenerating(false);
        }
        break;
      }

      case 'pptx_slides': {
        if (ws.sources.length === 0) {
          alert('Please upload at least one document to generate slides.');
          return;
        }
        ws.setGenerating(true, 'pptx_slides');
        try {
          const source = ws.sources[0];
          const file = source.file;
          if (!file) throw new Error("Source file object is missing. Please remove and re-upload the document.");

          const deck = await generateSlides({ file, titleHint: source.name, slideCount: 8 });
          const base = source.name.replace(/\.[^.]+$/, "") || "omni-lab";
          ws.setPptxDeck(deck, base);
          setView('pptx_preview');
        } catch (error) {
          console.error('PPTX slide generation failed:', error);
          alert('Failed to generate PPTX slides. Please try again.');
        } finally {
          ws.setGenerating(false);
        }
        break;
      }

      case 'slide_deck':
        setActiveTab('chat');
        setTimeout(() => { textChatRef.current?.sendMessage(action.prompt); }, 100);
        break;

      default:
        // Fallback for any unhandled types
        console.warn('Unhandled studio action type:', action.type);
        break;
    }
  }, [ws, setView]);

  // ==========================================================================
  // GENERATE PRESENTATION
  // ==========================================================================

  const handleGeneratePresentation = useCallback(async () => {
    if (ws.sources.length === 0) {
      alert('Please upload at least one document to generate a presentation.');
      return;
    }
    ws.setGeneratingPresentation(true);
    try {
      const source = ws.sources[0];
      const textContent = `This is a document from an uploaded file.
File name: ${source.name}
File type: ${source.type}
File size: ${(source.size / 1024).toFixed(1)} KB

Generate an educational presentation about this document. Since I cannot read the PDF directly, please create general educational slides about the topic suggested by the filename.`;

      const result = await runPresentationAgent(source.name, textContent);
      ws.setLivePresentation({
        title: result.title || `Presentation: ${source.name}`,
        slides: result.slides.map((slide) => ({
          id: slide.id,
          title: slide.title,
          bullet_points: slide.bullet_points,
          script: slide.script,
          quiz_question: slide.quiz_question,
          answer: slide.answer,
          image_url: slide.image_url,
        })),
      });
      setView('live_presentation');
    } catch (error) {
      console.error('Failed to generate presentation:', error);
      alert('Failed to generate presentation. Please try again.');
    } finally {
      ws.setGeneratingPresentation(false);
    }
  }, [ws, setView]);

  // ==========================================================================
  // MULTI-MODAL RESPONSE HANDLER
  // ==========================================================================

  const handleOmniResponse = useCallback(async (response: OmniResponse) => {
    switch (response.type) {
      case 'slides':
        ws.setSlides(response.content as SlidesContent);
        setView('slides');
        ws.setScientistState((prev) => ({
          ...prev,
          status: SimulationStatus.COMPLETED,
          visualizationStatus: VisualizationStatus.READY,
        }));
        break;

      case 'simulation': {
        const simContent = response.content as SimulationContent;
        ws.setSimulation(simContent);
        setView('simulation');
        if (simContent.code || simContent.executionResult) {
          ws.setScientistState((prev) => ({
            ...prev,
            status: SimulationStatus.COMPLETED,
            visualizationStatus: VisualizationStatus.READY,
            result: {
              code: simContent.code || '',
              data: [],
              chartType: 'line' as const,
              xAxisKey: 'x',
              yAxisKey: 'y',
              explanation: simContent.explanation,
            },
          }));
        }
        break;
      }

      case 'chat':
        setView('idle');
        break;

      case 'error':
        setView('idle');
        break;
    }

    if (ws.autoSpeak && response.audioScript) {
      ws.setIsSpeaking(true);
      try { await speak(response.audioScript); } catch (e) { console.error('Speech synthesis error:', e); }
      ws.setIsSpeaking(false);
    }
  }, [ws, setView]);

  // ==========================================================================
  // SIMULATION REQUEST
  // ==========================================================================

  const handleSimulationRequest = useCallback(async (hypothesis: string): Promise<string> => {
    // Simulation requested
    ws.setScientistState((prev) => ({
      ...prev,
      status: SimulationStatus.PLANNING,
      visualizationStatus: VisualizationStatus.IDLE,
      thoughts: [],
      result: null,
    }));

    ws.addThought({
      id: 'init', level: 1,
      message: `Orchestrator received request: "${hypothesis}"`,
      timestamp: new Date(), status: 'info',
    });

    try {
      const response = await processUserMessage({ message: hypothesis, onThought: ws.addThought });
      await handleOmniResponse(response);

      if (response.type === 'simulation') return "Simulation successful. The results have been generated in the Lab View.";
      if (response.type === 'slides') return "Presentation created successfully. Check the Lab View to see your slides.";
      if (response.type === 'error') return response.audioScript;
      return response.type === 'chat' ? (response.content as { text: string }).text : "Request processed successfully.";
    } catch {
      ws.setScientistState((prev) => ({ ...prev, status: SimulationStatus.FAILED, visualizationStatus: VisualizationStatus.IDLE }));
      ws.addThought({ id: 'fail', level: 4, message: "Processing failed after retries.", timestamp: new Date(), status: 'error' });
      return "I'm sorry, I couldn't process that request. Please try again.";
    }
  }, [ws, handleOmniResponse]);

  // ==========================================================================
  // VOICE / SPEECH
  // ==========================================================================

  const toggleSpeech = useCallback(() => {
    if (ws.isSpeaking) {
      cancelSpeech();
      ws.setIsSpeaking(false);
    } else {
      ws.setAutoSpeak(!ws.autoSpeak);
    }
  }, [ws]);

  const handleSlideSpeak = useCallback((text: string) => {
    if (ws.autoSpeak) {
      ws.setIsSpeaking(true);
      speak(text).finally(() => ws.setIsSpeaking(false));
    }
  }, [ws]);

  // ==========================================================================
  // DERIVED
  // ==========================================================================

  const hasContent =
    activeView !== 'idle' ||
    ws.slides !== null ||
    ws.flashcards !== null ||
    ws.livePresentation !== null;

  const viewLabel =
    activeView === 'slides' ? 'SLIDES MODE'
    : activeView === 'live_presentation' ? 'LIVE PRESENTATION'
    : activeView === 'simulation' ? 'SIMULATION MODE'
    : activeView === 'flashcards' ? 'FLASHCARDS'
    : activeView === 'pptx_preview' ? 'PPTX PREVIEW'
    : null;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <>
    <AppModeSyncer />
    <PanelSyncer setActiveTab={setActiveTab} />
    {isMobile && (
      <MobileVoiceTrigger shouldTrigger={mobileVoiceTrigger} onTriggered={() => setMobileVoiceTrigger(false)} />
    )}
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-white overflow-hidden font-sans selection:bg-purple-500/30">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/20">
            <Beaker className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight leading-none">Omni-Lab</h1>
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">The Empirical Tutor</span>
          </div>
        </div>

        {/* Desktop header */}
        {!isMobile && (
        <div className="flex items-center gap-4">
          {viewLabel && (
            <div className="text-[10px] font-mono px-3 py-1 rounded-full bg-purple-900/50 border border-purple-700 text-purple-300 flex items-center gap-2">
              <Presentation className="w-3 h-3" /> {viewLabel}
            </div>
          )}
          <button onClick={toggleSpeech}
            className={`p-2 rounded-lg border transition-all ${ws.autoSpeak ? 'bg-purple-900/50 border-purple-700 text-purple-300 hover:bg-purple-900/70' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
            title={ws.autoSpeak ? 'Auto-speak enabled' : 'Auto-speak disabled'}>
            {ws.isSpeaking ? <Volume2 className="w-4 h-4 animate-pulse" /> : ws.autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <VoiceControlButton />
          <div className="text-[10px] font-mono px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${ws.scientistState.status !== SimulationStatus.IDLE && ws.scientistState.status !== SimulationStatus.FAILED && ws.scientistState.status !== SimulationStatus.COMPLETED ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
            SCIENTIST: {ws.scientistState.status.toUpperCase()}
          </div>
          <VoiceStatusBadge />
          <div className="text-[10px] font-mono px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${ws.scientistState.visualizationStatus === VisualizationStatus.WORKING ? 'bg-blue-500 animate-pulse' : ws.scientistState.visualizationStatus === VisualizationStatus.READY ? 'bg-blue-500' : 'bg-slate-600'}`} />
            VISUALIZER: {ws.scientistState.visualizationStatus}
          </div>
        </div>
        )}

        {/* Mobile header */}
        {isMobile && (
          <div className="flex items-center gap-2">
            <VoiceControlButton />
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 active:bg-slate-800">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        )}
      </header>

      {/* Mobile dropdown menu */}
      {isMobile && mobileMenuOpen && (
        <div className="absolute top-14 left-0 right-0 z-40 bg-slate-950 border-b border-slate-800 p-4 mobile-slide-down">
          <div className="flex flex-wrap gap-2 mb-4">
            {viewLabel && (
              <div className="text-[10px] font-mono px-3 py-1 rounded-full bg-purple-900/50 border border-purple-700 text-purple-300 flex items-center gap-2">
                <Presentation className="w-3 h-3" /> {viewLabel}
              </div>
            )}
            <VoiceStatusBadge />
            <div className="text-[10px] font-mono px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${ws.scientistState.status !== SimulationStatus.IDLE && ws.scientistState.status !== SimulationStatus.FAILED && ws.scientistState.status !== SimulationStatus.COMPLETED ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
              SCIENTIST: {ws.scientistState.status.toUpperCase()}
            </div>
          </div>
          <div className="border-t border-slate-800 pt-4">
            <SourcesPanel sources={ws.sources} onAddSource={ws.addSource} onRemoveSource={ws.removeSource}
              isWebSearchEnabled={ws.isWebSearchEnabled} setIsWebSearchEnabled={ws.setWebSearchEnabled} />
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
      <div className={`flex-1 flex min-h-0 bg-slate-950 ${isMobile ? 'pb-14' : ''}`}>

        {/* Left Column: Sources — hidden on mobile */}
        {!isMobile && (
        <div className="w-72 flex-shrink-0 flex flex-col hidden md:flex">
          <SourcesPanel sources={ws.sources} onAddSource={ws.addSource} onRemoveSource={ws.removeSource}
            isWebSearchEnabled={ws.isWebSearchEnabled} setIsWebSearchEnabled={ws.setWebSearchEnabled} />
        </div>
        )}

        {/* Center Column: Workspace views (always mounted, CSS show/hide) */}
        <div className={`flex-1 flex flex-col min-w-0 bg-slate-900/50 ${isMobile ? '' : 'border-r border-slate-800'}`}>
          
          {/* Navigation Bar - Always visible at top of center column */}
          {!isMobile && <WorkspaceNav hasContent={hasContent} />}

          {/* Viewport Content Wrapper - Relative container for all views */}
          <div className="flex-1 relative min-h-0 w-full">

            {/* Idle / Visualizer */}
            <div className={activeView === 'idle' ? 'absolute inset-0' : 'hidden'}>
              <Visualizer result={ws.scientistState.result} status={ws.scientistState.status} vizStatus={ws.scientistState.visualizationStatus}
                hasSources={ws.hasSources} onGeneratePresentation={handleGeneratePresentation} isGeneratingPresentation={ws.isGeneratingPresentation} />
            </div>

            {/* Slides — stays mounted */}
            {ws.slides && (
              <div className={activeView === 'slides' ? 'absolute inset-0 flex flex-col' : 'hidden'}>
                <LivePresentationViewer
                  apiKey={apiKey}
                  data={{
                    title: "Generated Slides",
                    slides: ws.slides.slides
                  }}
                  onClose={() => setView('idle')}
                />
              </div>
            )}

            {/* PPTX Preview — stays mounted */}
            {ws.pptxDeck && (
              <div className={activeView === 'pptx_preview' ? 'absolute inset-0 flex flex-col' : 'hidden'}>
                <SlidePreview deck={ws.pptxDeck} fileNameBase={ws.pptxFileNameBase}
                  onClose={() => setView('idle')}
                  onExportPptx={async () => { await generatePresentation(ws.pptxDeck!, { fileName: `${ws.pptxFileNameBase}-slides.pptx`, download: true }); }}
                  onExportPdf={async (el) => { await exportElementToPdf({ element: el, fileName: `${ws.pptxFileNameBase}-slides.pdf`, pixelWidth: 1280 }); }}
                />
              </div>
            )}

            {/* Live Presentation — stays mounted */}
            {ws.livePresentation && (
              <div className={activeView === 'live_presentation' ? 'absolute inset-0 flex flex-col' : 'hidden'}>
                <LivePresentationViewer apiKey={apiKey} data={ws.livePresentation} onClose={() => setView('idle')} />
              </div>
            )}

            {/* Simulation image — stays mounted */}
            {ws.simulation?.imageUrl && (
              <div className={activeView === 'simulation' ? 'absolute inset-0' : 'hidden'}>
                <div className="h-full flex flex-col p-4">
                  <div className="flex-1 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                    <img src={ws.simulation.imageUrl} alt="Simulation Result" className="max-w-full max-h-full object-contain rounded-lg" />
                  </div>
                  {ws.simulation.explanation && (
                    <div className="mt-4 p-4 bg-slate-800/30 rounded-lg border border-slate-800">
                      <p className="text-sm text-slate-300">{ws.simulation.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Flashcards — slide-in overlay */}
            {ws.flashcards && (
              <div className={activeView === 'flashcards' ? 'absolute inset-0' : 'hidden'}>
                <FlashcardsViewer data={ws.flashcards}
                  isGenerating={ws.isGenerating && ws.generatingType === 'flashcards'}
                  onExplainInChat={(card) => { explainFlashcardInChat(card.front, card.back); setActiveMobilePanel('chat'); }}
                  onExplainInVoice={(card) => { explainFlashcardInVoice(card.front, card.back); }}
                  onFeedback={(type) => { console.log('Flashcard feedback:', type); }}
                />
              </div>
            )}

            {/* Quiz — slide-in overlay */}
            {ws.quiz && (
              <div className={activeView === 'quiz' ? 'absolute inset-0' : 'hidden'}>
                <QuizViewer
                  data={ws.quiz}
                  isGenerating={ws.isGenerating && ws.generatingType === 'quiz'}
                />
              </div>
            )}

            {/* Infographic — slide-in overlay */}
            {ws.infographic && (
              <div className={activeView === 'infographic' ? 'absolute inset-0' : 'hidden'}>
                <InfographicViewer
                  data={ws.infographic}
                  isGenerating={ws.isGenerating && ws.generatingType === 'infographic'}
                />
              </div>
            )}

            {/* Video — slide-in overlay */}
            {ws.video && (
              <div className={(activeView === 'video' || activeView === 'audio') ? 'absolute inset-0' : 'hidden'}>
                <VideoViewer
                  data={ws.video}
                  loading={ws.isGenerating && (ws.generatingType === 'video_overview' || ws.generatingType === 'audio_overview')}
                  onBack={() => setView('idle')}
                  apiKey={apiKey} // Pass API key here for generation
                />
              </div>
            )}

            {/* Mindmap — slide-in overlay */}
            {ws.mindmap && (
              <div className={activeView === 'mindmap' ? 'absolute inset-0' : 'hidden'}>
                <MindmapViewer
                  data={ws.mindmap}
                  isGenerating={ws.isGenerating && ws.generatingType === 'mind_map'}
                />
              </div>
            )}

            {/* DataTable — slide-in overlay */}
            {ws.dataTable && (
              <div className={activeView === 'data_table' ? 'absolute inset-0' : 'hidden'}>
                <DataTableViewer
                  data={ws.dataTable}
                  isGenerating={ws.isGenerating && ws.generatingType === 'data_table'}
                />
              </div>
            )}

            {/* Report — slide-in overlay */}
            {ws.report && (
              <div className={activeView === 'report' ? 'absolute inset-0' : 'hidden'}>
                <ReportViewer
                  data={ws.report}
                  isGenerating={ws.isGenerating && ws.generatingType === 'reports'}
                />
              </div>
            )}
          
          </div>
        </div>

        {/* Right Column: Interaction Hub — hidden on mobile */}
        {!isMobile && (
        <div className="w-[420px] flex-shrink-0 flex flex-col bg-slate-950">
          <InteractionTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="flex-1 min-h-0 border-t border-slate-800 relative">
            <div className={`h-full ${activeTab === 'studio' ? 'block' : 'hidden'}`}>
              <StudioPanel onAction={handleStudioAction} isGenerating={ws.isGenerating} generatingType={ws.generatingType} />
            </div>
            <TextTutorPanel activeTab={activeTab} apiKey={apiKey} onSimulationRequest={handleSimulationRequest} textChatRef={textChatRef} />

          </div>
        </div>
        )}
      </div>

      {/* ── MOBILE OVERLAYS ───────────────────────────────────────── */}

      {isMobile && activeMobilePanel === 'chat' && (
        <div className="fixed inset-0 z-40 flex flex-col mobile-slide-up">
          <div className="absolute inset-0 bg-black/60" onClick={() => setActiveMobilePanel('slides')} />
          <div className="relative mt-auto h-full flex flex-col bg-slate-950 rounded-t-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-purple-400" /><span className="font-semibold text-sm">Chat</span></div>
              <button onClick={() => setActiveMobilePanel('slides')} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 active:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TextChat ref={textChatRef} apiKey={apiKey} sources={ws.sources} isWebSearchEnabled={ws.isWebSearchEnabled}
                onSimulationRequest={handleSimulationRequest} disabled={false} />
            </div>
          </div>
        </div>
      )}

      {isMobile && activeMobilePanel === 'tools' && (
        <div className="fixed inset-0 z-40 flex flex-col mobile-slide-up">
          <div className="absolute inset-0 bg-black/60" onClick={() => setActiveMobilePanel('slides')} />
          <div className="relative mt-auto h-[85vh] flex flex-col bg-slate-950 rounded-t-2xl overflow-hidden">
            <div className="flex items-center justify-center pt-2 pb-1 shrink-0"><div className="w-10 h-1 rounded-full bg-slate-700" /></div>
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400" /><span className="font-semibold text-sm">Tools & Studio</span></div>
              <button onClick={() => setActiveMobilePanel('slides')} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 active:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <StudioPanel onAction={(action) => { handleStudioAction(action); setActiveMobilePanel('slides'); }}
                isGenerating={ws.isGenerating} generatingType={ws.generatingType} />
              {ws.flashcards && (
                <div className={activeView === 'flashcards' ? 'border-t border-slate-800 mt-2' : 'hidden'}>
                  <FlashcardsViewer data={ws.flashcards}
                    isGenerating={ws.isGenerating && ws.generatingType === 'flashcards'}
                    onExplainInChat={(card) => { explainFlashcardInChat(card.front, card.back); setActiveMobilePanel('chat'); }}
                    onExplainInVoice={(card) => { explainFlashcardInVoice(card.front, card.back); }}
                    onFeedback={(type) => { console.log('Flashcard feedback:', type); }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isMobile && <MobileNav activePanel={activeMobilePanel} onPanelChange={handleMobilePanelChange} />}

      {/* Floating Components */}
      <FloatingVoiceTutor />
      <SubtitlesBar />
      <ResearchPanel />
      <VisualOverlayContainer />
    </div>
    </>
  );
};

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(() => {
    // Check if API key exists on initial render
    try {
      getApiKey();
      return true;
    } catch {
      return false;
    }
  });

  const handleKeySubmit = useCallback(() => {
    // Force re-render after key is stored
    setHasApiKey(true);
  }, []);

  // Show modal if no API key
  if (!hasApiKey) {
    return <ApiKeyModal onKeySubmit={handleKeySubmit} />;
  }

  const apiKey = getApiKey();
  
  return (
    <AppModeProvider>
      <ViewProvider>
        <TutorProvider apiKey={apiKey}>
          <AutoTutorProvider>
            <WorkspaceProvider>
              <AppShell apiKey={apiKey} />
            </WorkspaceProvider>
          </AutoTutorProvider>
        </TutorProvider>
      </ViewProvider>
    </AppModeProvider>
  );
};

export default App;

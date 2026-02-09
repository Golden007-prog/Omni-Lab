/**
 * Marathon Loop - The Orchestrator
 * Routes user messages to appropriate agents and returns structured OmniResponse
 */

import { Content } from "@google/generative-ai";
import { 
  runScientistAgent, 
  runVisualizerAgent, 
  runTeacherAgent,
  ScientistResult,
  VisualizerResult,
  TeacherResult,
  convertToGeminiHistory
} from "./agents";
import { 
  processFileForInlineData, 
  uploadFileToGemini,
  isWithinInlineLimit,
  readTextFile,
  UploadedFile 
} from "../utils/fileHelpers";
import { getApiKey } from "./geminiConfig";
import { ThoughtLog, SimulationStatus, SimulationResult } from "../types";

// =============================================================================
// OMNI RESPONSE TYPES
// =============================================================================

export type OmniResponseType = 'chat' | 'slides' | 'simulation' | 'error';

/**
 * Unified response structure for multi-modal state handling
 */
export interface OmniResponse {
  type: OmniResponseType;
  content: any;
  audioScript: string;
  metadata?: {
    sourceFileName?: string;
    slideCount?: number;
    hasPlot?: boolean;
    hasCode?: boolean;
  };
}

export interface SlideData {
  id: number;
  title: string;
  bullet_points: string[];
  script: string;
  quiz_question: string;
  answer: string;
}

export interface SlidesContent {
  slides: SlideData[];
  currentSlide: number;
}

export interface SimulationContent {
  imageUrl: string | null;
  code: string | null;
  executionResult: string | null;
  explanation: string;
  chartData?: SimulationResult;
}

export interface ChatContent {
  text: string;
  groundingUrls?: string[];
}

export interface ErrorContent {
  message: string;
  details?: string;
}

export interface ProcessMessageOptions {
  message: string;
  file?: File | null;
  conversationHistory?: Array<{ role: "user" | "model"; text: string }>;
  onThought?: (thought: ThoughtLog) => void;
}

// =============================================================================
// KEYWORD DETECTION
// =============================================================================

// Keywords that trigger the Scientist Agent
const SCIENTIST_KEYWORDS = [
  // Action verbs
  "simulate", "calculate", "compute", "prove", "derive", "verify",
  "plot", "graph", "visualize", "chart", "demonstrate",
  // Mathematical operations
  "integrate", "differentiate", "solve", "evaluate", "optimize",
  // Scientific concepts
  "trajectory", "velocity", "acceleration", "momentum", "force",
  "wave", "frequency", "amplitude", "oscillation",
  "probability", "statistics", "regression", "correlation",
  // Data analysis
  "analyze data", "fit curve", "predict", "model",
  // Physics simulations
  "projectile", "pendulum", "orbit", "gravity", "friction",
  "thermodynamics", "entropy", "kinetic", "potential",
];

/**
 * Check if message contains scientist-triggering keywords
 */
function containsScientistKeywords(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return SCIENTIST_KEYWORDS.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
}

/**
 * Check if message is requesting document visualization/slides
 */
function isVisualizationRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const vizKeywords = [
    "create slides", "make slides", "generate slides",
    "create presentation", "make presentation",
    "summarize document", "analyze document",
    "create flashcards", "make flashcards",
    "extract key points", "outline this",
    "slide deck", "slide-by-slide"
  ];
  return vizKeywords.some(kw => lowerMessage.includes(kw));
}

// =============================================================================
// MAIN ORCHESTRATOR - RETURNS OmniResponse
// =============================================================================

/**
 * Process a user message and route to the appropriate agent
 * Returns a structured OmniResponse for multi-modal state handling
 */
export async function processUserMessage(
  options: ProcessMessageOptions
): Promise<OmniResponse> {
  const { message, file, conversationHistory = [], onThought } = options;

  const logThought = (msg: string, level = 1, status: ThoughtLog["status"] = "info") => {
    onThought?.({
      id: Math.random().toString(36).substr(2, 9),
      level,
      message: msg,
      timestamp: new Date(),
      status,
    });
  };

  try {
    // ==========================================================================
    // STEP 1: Check for file attachment -> Visualizer Agent (Slides)
    // ==========================================================================
    if (file) {
      logThought(`File detected: ${file.name} (${file.type})`, 1);
      logThought("Processing file for Visualizer Agent...", 2);
      
      let vizResult: VisualizerResult;
      
      if (isWithinInlineLimit(file.size)) {
        const processResult = await processFileForInlineData(file);
        
        if (!processResult.success || !processResult.data) {
          return {
            type: "error",
            content: {
              message: "Failed to process file",
              details: processResult.error,
            } as ErrorContent,
            audioScript: "Sorry, I couldn't process that file. Please try a different format.",
          };
        }

        // For text-based files, extract text content
        let textContent: string | undefined;
        if (file.type.startsWith("text/") || file.type === "application/json") {
          textContent = await readTextFile(file);
        }

        logThought("Calling Visualizer Agent to generate slide deck...", 2);
        
        vizResult = await runVisualizerAgent(
          "", 
          file.type,
          textContent || `Analyze and create slides from this document: ${file.name}. ${message}`
        );
      } else {
        logThought("Large file detected. Uploading via File API...", 2);
        
        const apiKey = getApiKey();
        const uploadedFile = await uploadFileToGemini(file, apiKey);
        
        logThought(`File uploaded: ${uploadedFile.uri}`, 2);
        logThought("Calling Visualizer Agent...", 2);

        vizResult = await runVisualizerAgent(
          uploadedFile.uri,
          uploadedFile.mimeType
        );
      }

      logThought("Slides generated successfully!", 3, "success");

      // Get audio script from first slide
      const firstSlide = vizResult.slides[0];
      const audioScript = firstSlide 
        ? `${firstSlide.title}. ${firstSlide.script}` 
        : "The presentation is ready. Let me walk you through it.";

      return {
        type: "slides",
        content: {
          slides: vizResult.slides,
          currentSlide: 0,
        } as SlidesContent,
        audioScript,
        metadata: {
          sourceFileName: file.name,
          slideCount: vizResult.slides.length,
        },
      };
    }

    // ==========================================================================
    // STEP 2: Check for scientist keywords -> Scientist Agent (Simulation)
    // ==========================================================================
    if (containsScientistKeywords(message)) {
      logThought(`Scientific query detected: "${message.slice(0, 50)}..."`, 1);
      logThought("Routing to Scientist Agent with Code Execution...", 2);

      const scientistResult = await runScientistAgent(message);

      logThought("Scientist Agent completed execution", 3, "success");

      // Build audio script from the text response
      const audioScript = scientistResult.textResponse.slice(0, 500) + 
        (scientistResult.textResponse.length > 500 ? "..." : "");

      return {
        type: "simulation",
        content: {
          imageUrl: scientistResult.plotImageUrl,
          code: scientistResult.executableCode,
          executionResult: scientistResult.codeExecutionResult,
          explanation: scientistResult.textResponse,
        } as SimulationContent,
        audioScript: audioScript || "The simulation has completed. Let me explain the results.",
        metadata: {
          hasPlot: !!scientistResult.plotImageUrl,
          hasCode: !!scientistResult.executableCode,
        },
      };
    }

    // ==========================================================================
    // STEP 3: Check for visualization request without file
    // ==========================================================================
    if (isVisualizationRequest(message)) {
      logThought("Presentation request detected but no file attached", 1, "warning");
      
      const responseText = "I'd be happy to create slides or a presentation for you! Please upload a document (PDF, text file, or other supported format) and I'll analyze it to generate educational content with interactive quizzes.";
      
      return {
        type: "chat",
        content: {
          text: responseText,
        } as ChatContent,
        audioScript: responseText,
      };
    }

    // ==========================================================================
    // STEP 4: Default -> Teacher Agent (conversational chat)
    // ==========================================================================
    logThought("Routing to Teacher Agent for conversational response...", 1);

    const geminiHistory = convertToGeminiHistory(conversationHistory);
    const teacherResult = await runTeacherAgent(geminiHistory, message);

    logThought("Teacher Agent responded", 2, "success");

    // Truncate for audio (browser TTS has limits)
    const audioScript = teacherResult.text.slice(0, 800) + 
      (teacherResult.text.length > 800 ? "..." : "");

    return {
      type: "chat",
      content: {
        text: teacherResult.text,
        groundingUrls: teacherResult.groundingUrls,
      } as ChatContent,
      audioScript,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    logThought(`Error: ${errorMessage}`, 4, "error");

    return {
      type: "error",
      content: {
        message: "An error occurred while processing your request.",
        details: errorMessage,
      } as ErrorContent,
      audioScript: "I'm sorry, something went wrong. Please try again.",
    };
  }
}

// =============================================================================
// LEGACY MARATHON AGENT CLASS (for backward compatibility)
// =============================================================================

export { MarathonAgent } from "./marathonLoopLegacy";

// =============================================================================
// HELPER EXPORTS
// =============================================================================

export { 
  runScientistAgent, 
  runVisualizerAgent, 
  runTeacherAgent 
} from "./agents";

export { getApiKey, setApiKey, resetClient } from "./geminiConfig";

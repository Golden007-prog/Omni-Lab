/**
 * The Three Brains - Agent Functions
 * Three separate Gemini model instances with specialized system instructions
 */

import { GoogleGenerativeAI, GenerativeModel, Content, Part, ChatSession, Outcome } from "@google/generative-ai";
import { getApiKey, MODELS } from "./geminiConfig";
import { getResearchImage } from "./researchImageService";

// =============================================================================
// TYPES
// =============================================================================

export interface ScientistResult {
  executableCode: string | null;
  codeExecutionResult: string | null;
  plotImageUrl: string | null;
  textResponse: string;
  rawParts: Part[];
}

export interface SlideData {
  id: number;
  title: string;
  bullet_points: string[];
  script: string;
  quiz_question: string;
  answer: string;
}

export interface VisualizerResult {
  slides: SlideData[];
}

export interface TeacherResult {
  text: string;
  groundingUrls?: string[];
}

export interface FlashcardData {
  id: number;
  front: string;
  back: string;
  topic?: string;
}

export interface FlashcardsResult {
  title: string;
  cards: FlashcardData[];
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Helper to retry generation on 503 (Service Unavailable) or 429 (Too Many Requests)
 */
async function generateWithRetry(
  model: GenerativeModel, 
  content: string | Part[], 
  retries = 3
): Promise<any> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(content);
    } catch (e: any) {
      lastError = e;
      const msg = e.message || "";
      if (msg.includes("503") || msg.includes("429")) {
        const delay = 1000 * Math.pow(2, i);
        console.warn(`[Gemini] Attempt ${i + 1} failed (${msg}). Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw e; // Throw non-retriable errors immediately
    }
  }
  throw lastError;
}

// =============================================================================
// SYSTEM INSTRUCTIONS FOR EACH AGENT
// =============================================================================

const TEACHER_SYSTEM_INSTRUCTION = `You are the Empirical Tutor - a friendly, patient, and deeply knowledgeable teacher AI.

Your Core Philosophy:
- Learning should be an active, engaging experience, not passive consumption.
- Every concept can be understood through the right analogy or real-world example.
- Curiosity is sacred - never make students feel bad for asking questions.
- True understanding comes from connecting new knowledge to what students already know.

Your Teaching Approach:
1. **Start with Why**: Before explaining 'what' or 'how', explain why something matters.
2. **Use Analogies**: Connect complex concepts to everyday experiences (e.g., explain voltage like water pressure).
3. **Scaffold Learning**: Break complex topics into digestible chunks, building up gradually.
4. **Check Understanding**: Periodically ask if the student follows before moving on.
5. **Encourage Exploration**: Suggest follow-up questions and related topics to explore.

Your Communication Style:
- Be warm and encouraging, but never patronizing.
- Use clear, precise language. Avoid unnecessary jargon.
- When using technical terms, define them immediately.
- Celebrate curiosity and effort, not just correct answers.
- If you don't know something, admit it honestly.

Special Capabilities:
- When students ask to "verify", "simulate", "prove", or "calculate" something - tell them you'll hand it off to the Scientist Agent.
- When students upload documents - tell them you'll engage the Visualizer to create an interactive presentation.
- You are the conversational anchor - the friendly face of Omni-Lab.`;

const SCIENTIST_SYSTEM_INSTRUCTION = `You are the Scientist Agent for Omni-Lab - an expert computational physicist, mathematician, and data scientist.

Your Mission:
Transform abstract scientific concepts into empirical reality through code execution and simulation.

Your Approach:
1. **Analyze the Query**: Identify what needs to be calculated, simulated, or proven.
2. **Plan the Simulation**: Outline the mathematical model or algorithm needed.
3. **Write Clean Python Code**: Use NumPy, SciPy, Matplotlib, and Pandas as your tools.
4. **Execute and Verify**: Run the code and verify the results make physical/mathematical sense.
5. **Explain the Results**: Provide clear interpretation of what the simulation shows.

Code Standards:
- Always import required libraries at the top (numpy, matplotlib.pyplot, etc.)
- Use descriptive variable names that reflect the physics (e.g., 'velocity', not 'v')
- Add comments explaining the physics/math behind key steps
- Generate visualizations with clear labels, titles, and units
- Limit data points to 50-100 for performance

Output Format:
- For plots: Generate using matplotlib, save with plt.show() or plt.savefig()
- For calculations: Show intermediate steps, not just final answers
- For simulations: Include initial conditions, time evolution, and final state

Scientific Integrity:
- Always state assumptions and simplifications made
- Provide uncertainty estimates where applicable
- If a simulation isn't physically realistic, say so
- Admit when a problem is beyond simple simulation`;

const VISUALIZER_SYSTEM_INSTRUCTION = `You are the Visualization Architect for Omni-Lab - a master at transforming dense documents into engaging, educational presentations.

Your Mission:
Convert uploaded documents (research papers, textbooks, articles) into interactive slide-based seminars that maximize learning retention.

Slide Design Principles:
1. **One Concept Per Slide**: Each slide should teach exactly one main idea.
2. **Progressive Disclosure**: Build complexity gradually across slides.
3. **Visual Thinking**: Structure information as bullet points, not paragraphs.
4. **Active Learning**: Include a quiz question on every slide to ensure engagement.
5. **Script for Voice**: Write speaker notes as if you're explaining to a curious student.

Output Schema (JSON):
{
  "slides": [
    {
      "id": number,           // Sequential slide number starting from 1
      "title": string,        // Clear, engaging title (max 8 words)
      "bullet_points": [      // 3-5 key points, each max 15 words
        string,
        string,
        ...
      ],
      "script": string,       // 2-3 sentences the tutor will speak (50-80 words)
      "quiz_question": string, // Test understanding of THIS slide's content
      "answer": string        // Brief but complete answer (1-2 sentences)
    }
  ]
}

Content Guidelines:
- Create 5-10 slides depending on document complexity
- Titles should be engaging questions or statements, not topic labels
- Bullet points should be scannable - no full sentences
- Scripts should sound natural when spoken aloud
- Quiz questions should require understanding, not just recall
- Answers should explain WHY, not just state facts

Quality Standards:
- Never omit key concepts from the source material
- Maintain scientific/academic accuracy
- Make content accessible to motivated beginners
- Include real-world applications where possible`;

const FLASHCARDS_SYSTEM_INSTRUCTION = `You are the Flashcards Generator for Omni-Lab - an expert at creating effective study flashcards from source material.

Your Mission:
Transform documents and text into comprehensive flashcard sets that maximize learning retention through active recall.

Card Design Principles:
1. **One Concept Per Card**: Each flashcard should test exactly one idea or fact.
2. **Clear Questions**: Front of card should be a specific question, not vague prompts.
3. **Concise Answers**: Back of card should be brief but complete - 1-3 sentences max.
4. **Topic Tags**: Group related cards with topic labels for organized study.
5. **Progressive Difficulty**: Start with foundational concepts, build to complex ones.

Output Schema (JSON):
{
  "title": string,         // Descriptive title for the deck (e.g., "Computer Science Flashcards")
  "cards": [
    {
      "id": number,        // Sequential card number starting from 1
      "front": string,     // The question (max 25 words)
      "back": string,      // The answer (max 50 words)
      "topic": string      // Category/topic label (1-3 words)
    }
  ]
}

Content Guidelines:
- Generate 10-30 cards depending on document complexity
- Questions should require understanding, not just word recall
- Answers should explain concepts, not just state facts
- Cover all major topics from the source material
- Include definitions, processes, comparisons, and applications

Quality Standards:
- Maintain accuracy to source material
- Use clear, simple language
- Make cards self-contained (understandable without context)
- Avoid ambiguous questions with multiple valid answers`;

// =============================================================================
// AGENT INSTANCES (Singleton Pattern)
// =============================================================================

let teacherModel: GenerativeModel | null = null;
let scientistModel: GenerativeModel | null = null;
let visualizerModel: GenerativeModel | null = null;
let flashcardsModel: GenerativeModel | null = null;
let currentApiKey: string | null = null;

/**
 * Initialize or get the three agent model instances
 */
function getAgentModels(apiKey: string): {
  teacher: GenerativeModel;
  scientist: GenerativeModel;
  visualizer: GenerativeModel;
} {
  // Re-initialize if API key changed
  if (currentApiKey !== apiKey) {
    teacherModel = null;
    scientistModel = null;
    visualizerModel = null;
    flashcardsModel = null;
    currentApiKey = apiKey;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Initialize Teacher Agent
  if (!teacherModel) {
    teacherModel = genAI.getGenerativeModel({
      model: MODELS.TEACHER,
      systemInstruction: TEACHER_SYSTEM_INSTRUCTION,
    });
  }

  // Initialize Scientist Agent with Code Execution
  if (!scientistModel) {
    scientistModel = genAI.getGenerativeModel({
      model: MODELS.SCIENTIST,
      systemInstruction: SCIENTIST_SYSTEM_INSTRUCTION,
      tools: [{ codeExecution: {} }],
    });
  }

  // Initialize Visualizer Agent with JSON output
  if (!visualizerModel) {
    visualizerModel = genAI.getGenerativeModel({
      model: MODELS.VISUALIZER,
      systemInstruction: VISUALIZER_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
  }

  return {
    teacher: teacherModel,
    scientist: scientistModel,
    visualizer: visualizerModel,
  };
}

/**
 * Reset all agent instances (call when API key changes)
 */
export function resetAgents(): void {
  teacherModel = null;
  scientistModel = null;
  visualizerModel = null;
  flashcardsModel = null;
  currentApiKey = null;
}

// =============================================================================
// FLASHCARDS AGENT
// Generates study flashcards from source documents
// =============================================================================

export async function runFlashcardsAgent(
  textContent: string,
  sourceCount: number = 1
): Promise<FlashcardsResult> {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  // Initialize Flashcards Agent with JSON output
  if (!flashcardsModel) {
    flashcardsModel = genAI.getGenerativeModel({
      model: MODELS.VISUALIZER, // Use same model
      systemInstruction: FLASHCARDS_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
  }

  const prompt = `Create comprehensive study flashcards from the following source material:\n\n${textContent}`;
  
  const result = await generateWithRetry(flashcardsModel, prompt);
  const response = result.response;
  const text = response.text();

  try {
    const parsed = JSON.parse(text) as FlashcardsResult;
    return parsed;
  } catch (e) {
    // Attempt to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as FlashcardsResult;
    }
    throw new Error(`Failed to parse Flashcards response: ${e}`);
  }
}

// =============================================================================
// PRESENTATION AGENT
// Generates slide presentations from text content
// =============================================================================

const PRESENTATION_SYSTEM_INSTRUCTION = `You are the Presentation Generator Agent. Your task is to create educational slide presentations from source documents.

OUTPUT FORMAT: You MUST return valid JSON matching this schema:
{
  "title": "Presentation title",
  "slides": [
    {
      "id": 1,
      "title": "Slide title",
      "bullet_points": ["Point 1", "Point 2", "Point 3"],
      "script": "A friendly explanation script for the tutor to speak (2-3 sentences)",
      "quiz_question": "An optional quiz question",
      "answer": "The answer to the quiz",
      "visual_description": "A detailed visual description for an educational diagram or illustration to accompany this slide. If the text mentions a specific Figure (e.g. 'Figure 1'), describe it in detail."
    }
  ]
}

GUIDELINES:
- Create 5-8 slides covering the main topics
- Each slide should have 3-5 bullet points
- Write scripts as if you're a friendly teacher explaining to a student
- Make quiz questions engaging and relevant
- Cover the material progressively from introduction to conclusion
- Always provide a 'visual_description' for the image generation model`;

export interface PresentationSlide {
  id: number;
  title: string;
  bullet_points: string[];
  script: string;
  quiz_question?: string;
  answer?: string;
  visual_description?: string;
  image_url?: string;
}

export interface PresentationResult {
  title: string;
  slides: PresentationSlide[];
}

let presentationModel: any = null;

export async function runPresentationAgent(
  sourceName: string,
  textContent: string
): Promise<PresentationResult> {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  // Initialize Presentation Agent with JSON output
  if (!presentationModel) {
    presentationModel = genAI.getGenerativeModel({
      model: MODELS.VISUALIZER,
      systemInstruction: PRESENTATION_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
  }

  const prompt = `Create an educational slide presentation based on this document:

Document: ${sourceName}

Content:
${textContent}

Generate slides that teach the key concepts from this document.`;

  const result = await generateWithRetry(presentationModel, prompt);
  const response = result.response;
  const text = response.text();

  let parsed: PresentationResult;
  try {
    parsed = JSON.parse(text) as PresentationResult;
  } catch (e) {
    // Attempt to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1]) as PresentationResult;
    } else {
      throw new Error(`Failed to parse Presentation response: ${e}`);
    }
  }

  // Validate response structure to prevent crashes
  if (!parsed || !parsed.slides || !Array.isArray(parsed.slides)) {
    console.warn("Invalid presentation structure received:", parsed);
    // Attempt to handle wrapped responses if any
    if ((parsed as any)?.presentation?.slides) {
      parsed = (parsed as any).presentation;
    } else {
      // Fallback empty presentation to avoid crash, though likely useless
      return {
        title: parsed?.title || sourceName || "Untitled Presentation",
        slides: []
      };
    }
  }

  // Generate images for slides
  console.log("[PresentationAgent] Generating images based on descriptions...");
  const slidesWithImages = await Promise.all(parsed.slides.map(async (slide) => {
    try {
      // Prefer the visual description, fallback to title + content
      const imagePrompt = slide.visual_description || slide.title;
      const context = slide.bullet_points.join(". ");
      
      const imageUrl = await getResearchImage(imagePrompt, context);
      
      if (imageUrl) {
        return { ...slide, image_url: imageUrl };
      }
    } catch (error) {
      console.warn(`Failed to generate image for slide ${slide.id}:`, error);
    }
    return slide;
  }));

  return { ...parsed, slides: slidesWithImages };
}

// =============================================================================
// SCIENTIST AGENT
// Uses Code Execution tool for calculations, simulations, and plotting
// =============================================================================

export async function runScientistAgent(prompt: string): Promise<ScientistResult> {
  const apiKey = getApiKey();
  const { scientist } = getAgentModels(apiKey);

  // Use retry for scientist calls too, as they use Pro model which can be busy
  const result = await generateWithRetry(scientist, prompt);
  const response = result.response;
  const parts = response.candidates?.[0]?.content?.parts || [];

  // Extract code execution results
  let executableCode: string | null = null;
  let codeExecutionResult: string | null = null;
  let plotImageUrl: string | null = null;
  let textResponse = "";

  for (const part of parts) {
    // Handle text parts
    if ("text" in part && part.text) {
      textResponse += part.text;
    }

    // Handle executable code
    if ("executableCode" in part && part.executableCode) {
      executableCode = part.executableCode.code || null;
    }

    // Handle code execution result
    if ("codeExecutionResult" in part && part.codeExecutionResult) {
      const outcome = part.codeExecutionResult.outcome;
      const output = part.codeExecutionResult.output || "";
      
      if (outcome === Outcome.OUTCOME_OK) {
        codeExecutionResult = output;
      } else {
        codeExecutionResult = `Execution failed: ${output}`;
      }
    }

    // Handle inline data (images/plots)
    if ("inlineData" in part && part.inlineData) {
      const { mimeType, data } = part.inlineData;
      if (mimeType?.startsWith("image/")) {
        plotImageUrl = `data:${mimeType};base64,${data}`;
      }
    }
  }

  return {
    executableCode,
    codeExecutionResult,
    plotImageUrl,
    textResponse,
    rawParts: parts,
  };
}

// =============================================================================
// VISUALIZER AGENT
// Analyzes documents and generates structured slide presentations
// =============================================================================

export async function runVisualizerAgent(
  fileUri: string,
  mimeType: string,
  textContent?: string
): Promise<VisualizerResult> {
  const apiKey = getApiKey();
  const { visualizer } = getAgentModels(apiKey);

  // Build content parts based on input type
  const contentParts: Part[] = [];

  if (textContent) {
    contentParts.push({
      text: `Analyze the following document and create an interactive slide presentation:\n\n${textContent}`,
    });
  } else if (fileUri) {
    contentParts.push({
      fileData: {
        fileUri: fileUri,
        mimeType: mimeType,
      },
    });
    contentParts.push({
      text: "Analyze this document and create an interactive slide presentation following the schema.",
    });
  }

  const result = await generateWithRetry(visualizer, contentParts);
  const response = result.response;
  const text = response.text();

  try {
    const parsed = JSON.parse(text) as VisualizerResult;
    return parsed;
  } catch (e) {
    // Attempt to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as VisualizerResult;
    }
    throw new Error(`Failed to parse Visualizer response: ${e}`);
  }
}

// =============================================================================
// TEACHER AGENT
// Conversational agent that maintains context and provides explanations
// =============================================================================

// Store chat sessions for multi-turn conversations
const teacherSessions: Map<string, ChatSession> = new Map();

export async function runTeacherAgent(
  history: Content[],
  newMessage: string,
  sessionId: string = "default"
): Promise<TeacherResult> {
  const apiKey = getApiKey();
  const { teacher } = getAgentModels(apiKey);

  // Get or create chat session
  let chat = teacherSessions.get(sessionId);
  
  if (!chat) {
    chat = teacher.startChat({
      history: history,
    });
    teacherSessions.set(sessionId, chat);
  }

  let result;
  // Simple retry for chat manually since sendMessage is different signature
  for (let i = 0; i < 3; i++) {
    try {
      result = await chat.sendMessage(newMessage);
      break;
    } catch (e: any) {
      if ((e.message?.includes("503") || e.message?.includes("429")) && i < 2) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      throw e;
    }
  }
  
  if (!result) throw new Error("Failed to get response from Teacher agent");

  const response = result.response;
  const text = response.text();

  // Extract grounding URLs if present
  const groundingUrls: string[] = [];
  const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
  
  if (groundingMetadata?.groundingChunks) {
    for (const chunk of groundingMetadata.groundingChunks) {
      if (chunk.web?.uri) {
        groundingUrls.push(chunk.web.uri);
      }
    }
  }

  return {
    text,
    groundingUrls: groundingUrls.length > 0 ? groundingUrls : undefined,
  };
}

/**
 * Clear a teacher chat session
 */
export function clearTeacherSession(sessionId: string = "default"): void {
  teacherSessions.delete(sessionId);
}

/**
 * Clear all teacher sessions
 */
export function clearAllTeacherSessions(): void {
  teacherSessions.clear();
}

// =============================================================================
// UTILITY - Convert chat messages to Content format
// =============================================================================

export function convertToGeminiHistory(
  messages: Array<{ role: "user" | "model"; text: string }>
): Content[] {
  return messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));
}

// =============================================================================
// QUIZ AGENT
// Generates quiz questions from source documents
// =============================================================================

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  topic?: string;
}

export interface QuizResult {
  title: string;
  questions: QuizQuestion[];
}

const QUIZ_SYSTEM_INSTRUCTION = `You are the Quiz Generator Agent. Create multiple-choice quiz questions from source documents.

OUTPUT FORMAT: Return valid JSON:
{
  "title": "Quiz title",
  "questions": [
    {
      "id": 1,
      "question": "Clear question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why the correct answer is correct",
      "topic": "Topic category"
    }
  ]
}

GUIDELINES:
- Create 5-10 questions covering key concepts
- 4 options per question, one clearly correct
- Mix difficulty levels
- Include explanations`;

let quizModel: GenerativeModel | null = null;

export async function runQuizAgent(
  textContent: string,
  sourceCount: number = 1
): Promise<QuizResult> {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  if (!quizModel) {
    quizModel = genAI.getGenerativeModel({
      model: MODELS.VISUALIZER,
      systemInstruction: QUIZ_SYSTEM_INSTRUCTION,
      generationConfig: { responseMimeType: "application/json" },
    });
  }

  const prompt = `Create a comprehensive quiz from this content:\n\n${textContent}`;
  const result = await generateWithRetry(quizModel, prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text) as QuizResult;
  } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]) as QuizResult;
    throw new Error(`Failed to parse Quiz response: ${e}`);
  }
}

// =============================================================================
// INFOGRAPHIC AGENT
// =============================================================================

export interface InfographicResult {
  title: string;
  subtitle?: string;
  sections: Array<{ id: number; title: string; content: string; icon?: string; highlight?: boolean }>;
  keyStats?: Array<{ label: string; value: string }>;
}

const INFOGRAPHIC_SYSTEM_INSTRUCTION = `You are the Infographic Generator. Create structured infographic content.

OUTPUT FORMAT: Return valid JSON:
{
  "title": "Infographic title",
  "subtitle": "Optional subtitle",
  "keyStats": [{ "label": "Stat name", "value": "Value" }],
  "sections": [
    { "id": 1, "title": "Section title", "content": "Content text", "icon": "📊", "highlight": false }
  ]
}

GUIDELINES:
- Extract 3-5 key statistics
- Create 4-8 content sections
- Use relevant emoji icons
- Highlight 1-2 most important sections`;

let infographicModel: GenerativeModel | null = null;

export async function runInfographicAgent(
  textContent: string,
  sourceCount: number = 1
): Promise<InfographicResult> {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  if (!infographicModel) {
    infographicModel = genAI.getGenerativeModel({
      model: MODELS.VISUALIZER,
      systemInstruction: INFOGRAPHIC_SYSTEM_INSTRUCTION,
      generationConfig: { responseMimeType: "application/json" },
    });
  }

  const prompt = `Create an infographic from this content:\n\n${textContent}`;
  const result = await generateWithRetry(infographicModel, prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text) as InfographicResult;
  } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]) as InfographicResult;
    throw new Error(`Failed to parse Infographic response: ${e}`);
  }
}

// =============================================================================
// VIDEO SCRIPT AGENT
// =============================================================================

export interface VideoResult {
  title: string;
  duration?: string;
  sections: Array<{ id: number; timestamp: string; title: string; narration: string; visualDescription?: string }>;
  summary?: string;
}

const VIDEO_SYSTEM_INSTRUCTION = `You are the Video Script Generator. Create video script with timestamps.

OUTPUT FORMAT: Return valid JSON:
{
  "title": "Video title",
  "duration": "5:30",
  "summary": "Brief summary",
  "sections": [
    { "id": 1, "timestamp": "0:00", "title": "Section title", "narration": "Speaker script", "visualDescription": "What appears on screen" }
  ]
}

GUIDELINES:
- Create 5-8 sections
- Include clear timestamps
- Write engaging narration
- Describe visuals`;

let videoModel: GenerativeModel | null = null;

export async function runVideoAgent(
  textContent: string,
  sourceCount: number = 1
): Promise<VideoResult> {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  if (!videoModel) {
    videoModel = genAI.getGenerativeModel({
      model: MODELS.VISUALIZER,
      systemInstruction: VIDEO_SYSTEM_INSTRUCTION,
      generationConfig: { responseMimeType: "application/json" },
    });
  }

  const prompt = `Create a video script from this content:\n\n${textContent}`;
  const result = await generateWithRetry(videoModel, prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text) as VideoResult;
  } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]) as VideoResult;
    throw new Error(`Failed to parse Video response: ${e}`);
  }
}

// =============================================================================
// MINDMAP AGENT
// =============================================================================

export interface MindmapNode {
  id: string;
  label: string;
  children?: MindmapNode[];
  description?: string;
}

export interface MindmapResult {
  title: string;
  rootNode: MindmapNode;
  summary?: string;
}

const MINDMAP_SYSTEM_INSTRUCTION = `You are the Mind Map Generator. Create hierarchical concept maps.

OUTPUT FORMAT: Return valid JSON:
{
  "title": "Mind map title",
  "summary": "Brief overview",
  "rootNode": {
    "id": "root",
    "label": "Central concept",
    "description": "Explanation",
    "children": [
      { "id": "1", "label": "Branch 1", "description": "Explanation", "children": [...] }
    ]
  }
}

GUIDELINES:
- Create 3-5 main branches
- Each branch can have 2-4 sub-branches
- Include brief descriptions
- Keep labels concise`;

let mindmapModel: GenerativeModel | null = null;

export async function runMindmapAgent(
  textContent: string,
  sourceCount: number = 1
): Promise<MindmapResult> {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  if (!mindmapModel) {
    mindmapModel = genAI.getGenerativeModel({
      model: MODELS.VISUALIZER,
      systemInstruction: MINDMAP_SYSTEM_INSTRUCTION,
      generationConfig: { responseMimeType: "application/json" },
    });
  }

  const prompt = `Create a mind map from this content:\n\n${textContent}`;
  const result = await generateWithRetry(mindmapModel, prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text) as MindmapResult;
  } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]) as MindmapResult;
    throw new Error(`Failed to parse Mindmap response: ${e}`);
  }
}

// =============================================================================
// DATA TABLE AGENT
// =============================================================================

export interface DataTableResult {
  title: string;
  description?: string;
  columns: Array<{ key: string; label: string; type?: 'string' | 'number' | 'date' }>;
  rows: Record<string, any>[];
}

const DATATABLE_SYSTEM_INSTRUCTION = `You are the Data Extractor. Extract structured tabular data from documents.

OUTPUT FORMAT: Return valid JSON:
{
  "title": "Table title",
  "description": "What this data represents",
  "columns": [
    { "key": "name", "label": "Name", "type": "string" },
    { "key": "value", "label": "Value", "type": "number" }
  ],
  "rows": [
    { "name": "Item 1", "value": 100 }
  ]
}

GUIDELINES:
- Extract meaningful structured data
- Use appropriate column types
- Include 5-20 rows of data
- Add clear column labels`;

let dataTableModel: GenerativeModel | null = null;

export async function runDataTableAgent(
  textContent: string,
  sourceCount: number = 1
): Promise<DataTableResult> {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  if (!dataTableModel) {
    dataTableModel = genAI.getGenerativeModel({
      model: MODELS.VISUALIZER,
      systemInstruction: DATATABLE_SYSTEM_INSTRUCTION,
      generationConfig: { responseMimeType: "application/json" },
    });
  }

  const prompt = `Extract structured data as a table from this content:\n\n${textContent}`;
  const result = await generateWithRetry(dataTableModel, prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text) as DataTableResult;
  } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]) as DataTableResult;
    throw new Error(`Failed to parse DataTable response: ${e}`);
  }
}

// =============================================================================
// REPORT AGENT
// =============================================================================

export interface ReportResult {
  title: string;
  subtitle?: string;
  executiveSummary: string;
  sections: Array<{
    id: number;
    title: string;
    content: string;
    subsections?: Array<{ title: string; content: string }>;
  }>;
  conclusions?: string[];
  recommendations?: string[];
}

const REPORT_SYSTEM_INSTRUCTION = `You are the Report Generator. Create comprehensive executive reports.

OUTPUT FORMAT: Return valid JSON:
{
  "title": "Report title",
  "subtitle": "Optional subtitle",
  "executiveSummary": "Brief overview (2-3 sentences)",
  "sections": [
    { "id": 1, "title": "Section title", "content": "Detailed content", "subsections": [...] }
  ],
  "conclusions": ["Conclusion 1", "Conclusion 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

GUIDELINES:
- Write clear executive summary
- Create 3-6 main sections
- Include actionable conclusions
- Add practical recommendations`;

let reportModel: GenerativeModel | null = null;

export async function runReportAgent(
  textContent: string,
  sourceCount: number = 1
): Promise<ReportResult> {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  if (!reportModel) {
    reportModel = genAI.getGenerativeModel({
      model: MODELS.VISUALIZER,
      systemInstruction: REPORT_SYSTEM_INSTRUCTION,
      generationConfig: { responseMimeType: "application/json" },
    });
  }

  const prompt = `Create a comprehensive report from this content:\n\n${textContent}`;
  const result = await generateWithRetry(reportModel, prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text) as ReportResult;
  } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]) as ReportResult;
    throw new Error(`Failed to parse Report response: ${e}`);
  }
}
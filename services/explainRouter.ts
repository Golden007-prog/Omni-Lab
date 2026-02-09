/**
 * ExplainRouter
 * Routes "Explain" requests to either chat or voice tutor based on current mode.
 * 
 * Usage:
 *   handleExplain(content) — auto-routes based on mode
 *   explainInChat(content) — always sends to chat (opens panel)
 *   explainInVoice(content) — always sends to voice tutor
 */

import { getMode } from "../contexts/AppModeContext";
import { sendToChat } from "./chatBridge";
import { sendToTutor } from "./tutorBridge";
import { openChatPanel } from "./panelBridge";

/**
 * Build the explanation prompt
 */
function buildPrompt(content: string, context?: string): string {
  if (context) {
    return `Using the study material, explain this clearly:

Context:
${context}

Content to explain:
${content}`;
  }
  return `Explain this clearly and help the student understand:

${content}`;
}

/**
 * Explicitly explain via chat (always opens chat panel)
 */
export function explainInChat(content: string, context?: string): void {
  console.log("[ExplainRouter] Explain in Chat clicked");
  console.log("[ExplainRouter] Opening chat panel");
  
  openChatPanel();
  
  const prompt = buildPrompt(content, context);
  console.log("[ExplainRouter] Sending to chat");
  sendToChat(prompt);
}

/**
 * Explicitly explain via voice tutor
 */
export function explainInVoice(content: string, context?: string): void {
  console.log("[ExplainRouter] Explain in Voice clicked");
  console.log("[ExplainRouter] Sending to tutor");
  
  const prompt = buildPrompt(content, context);
  sendToTutor(prompt);
}

/**
 * Route an explain request to the appropriate handler based on mode.
 * 
 * @param content - The content to explain (flashcard, quiz question, slide, etc.)
 * @param context - Optional additional context (source text, slide info, etc.)
 */
export function handleExplain(content: string, context?: string): void {
  const mode = getMode();
  
  console.log(`[ExplainRouter] Explain clicked, mode: ${mode}`);

  const prompt = buildPrompt(content, context);

  // Route based on mode
  if (mode === "voice") {
    console.log("[ExplainRouter] Routing to tutor (voice mode)");
    sendToTutor(prompt);
  } else {
    console.log("[ExplainRouter] Routing to chat (chat mode)");
    openChatPanel();
    sendToChat(prompt);
  }
}

/**
 * Explain a flashcard (auto-routes based on mode)
 */
export function explainFlashcard(front: string, back: string): void {
  const content = `Flashcard Question: ${front}

Answer: ${back}

Please explain this concept in more detail.`;
  
  handleExplain(content);
}

/**
 * Explain a flashcard in chat (always opens chat)
 */
export function explainFlashcardInChat(front: string, back: string): void {
  const content = `Flashcard Question: ${front}

Answer: ${back}

Please explain this concept in more detail.`;
  
  explainInChat(content);
}

/**
 * Explain a flashcard with voice tutor
 */
export function explainFlashcardInVoice(front: string, back: string): void {
  const content = `Flashcard Question: ${front}

Answer: ${back}

Please explain this concept in more detail.`;
  
  explainInVoice(content);
}

/**
 * Explain a quiz question
 */
export function explainQuiz(question: string, answer: string): void {
  const content = `Quiz Question: ${question}

Correct Answer: ${answer}

Please explain why this is the correct answer.`;
  
  handleExplain(content);
}

/**
 * Explain a slide
 */
export function explainSlide(title: string, bulletPoints: string[], script?: string): void {
  const content = `Slide: ${title}

Key Points:
${bulletPoints.map(bp => `• ${bp}`).join("\n")}

${script ? `Explanation: ${script}` : ""}

Please elaborate on this slide content.`;
  
  handleExplain(content);
}


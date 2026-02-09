/**
 * Content Summarization Service
 * Uses Gemini to create concise educational summaries
 */

import { getApiKey } from "./geminiConfig";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface SummarizedContent {
  summary: string;
  keyPoints: string[];
  teacherScript: string;
}

/**
 * Summarize gathered content for teaching purposes
 * Takes web search snippets and creates a concise educational summary
 */
export async function summarizeForTeaching(
  question: string,
  webSnippets: string[],
  youtubeDescriptions: string[] = []
): Promise<SummarizedContent> {
  console.log("[Summarize] Summarizing content for:", question);

  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenerativeAI(apiKey);

    const model = ai.getGenerativeModel({
      model: "gemini-3-flash-preview",
    });

    const sourceContent = [
      ...webSnippets.map((s, i) => `Web Source ${i + 1}: ${s}`),
      ...youtubeDescriptions.map((d, i) => `Video Source ${i + 1}: ${d}`),
    ].join("\n\n");

    const result = await model.generateContent(
      `You are a teacher helping a student understand a topic. 
      
The student asked: "${question}"

Here is relevant information I found:
${sourceContent}

Create a response in this exact JSON format:
{
  "summary": "<A clear 2-3 sentence summary of the answer>",
  "keyPoints": ["<key point 1>", "<key point 2>", "<key point 3>"],
  "teacherScript": "<A 30-second spoken explanation as if you're a friendly teacher. Start with 'Let me explain...' or 'Great question! Here's what you need to know...' Keep it conversational and educational.>"
}

Only return the JSON, nothing else.`
    );

    const responseText = result.response.text();
    console.log("[Summarize] Raw response:", responseText);

    // Extract JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as SummarizedContent;
      console.log("[Summarize] Summary created successfully");
      return parsed;
    }

    // Fallback
    return {
      summary: responseText.substring(0, 300),
      keyPoints: [responseText.substring(0, 150)],
      teacherScript: `Let me explain what I found about ${question}. ${responseText.substring(0, 200)}`,
    };
  } catch (error) {
    console.error("[Summarize] Error:", error);
    return {
      summary: `I found some information about "${question}" but had trouble processing it.`,
      keyPoints: ["Information could not be fully processed"],
      teacherScript: `I tried to look up information about ${question}, but ran into an issue. Let me try to answer based on what I know.`,
    };
  }
}

/**
 * Detect whether a question is related to the current slide content,
 * is a general concept question, requires external research, or is a request for visualization.
 */
export async function detectQuestionType(
  question: string,
  currentSlideText: string
): Promise<"slide_related" | "general_concept" | "external" | "visual_request"> {
  console.log("[DetectQuestion] Classifying question:", question);

  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenerativeAI(apiKey);

    const model = ai.getGenerativeModel({
      model: "gemini-3-flash-preview",
    });

    const result = await model.generateContent(
      `You are classifying a student's question during a presentation.

Current slide content:
"${currentSlideText}"

Student's question:
"${question}"

Classify this question into exactly one category:
- "slide_related" - The question directly relates to the content on the current slide
- "general_concept" - The question is about a general concept mentioned in the slide that needs more explanation
- "external" - The question is about something not covered in the slide at all and requires external research
- "visual_request" - The user explicitly asks to SEE something visually, e.g., "show me a diagram", "visualize this", "draw a picture", "show a video", "can I see an image of that".

Respond with ONLY one of: slide_related, general_concept, external, visual_request`
    );

    const responseText = result.response.text().trim().toLowerCase();
    console.log("[DetectQuestion] Classification:", responseText);

    if (responseText.includes("visual")) return "visual_request";
    if (responseText.includes("slide_related")) return "slide_related";
    if (responseText.includes("general_concept")) return "general_concept";
    if (responseText.includes("external")) return "external";

    // Default to slide_related if unclear
    return "slide_related";
  } catch (error) {
    console.error("[DetectQuestion] Error:", error);
    return "slide_related";
  }
}

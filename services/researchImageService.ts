import { GoogleGenAI } from "@google/genai";
import { getApiKey } from "./geminiConfig";

/**
 * Generate an educational image/diagram using Gemini 2.5 Flash Image (Nano Banana)
 * @param topic - Main subject or specific visual description
 * @param context - Optional additional context to refine the image
 * @returns Base64 image data URI or null
 */
export async function getResearchImage(
  topic: string,
  context?: string
): Promise<string | null> {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    // Construct a prompt that encourages diagrammatic/educational output
    let prompt = `Create a clean, high-quality educational diagram or illustration about: ${topic}.`;
    if (context) {
      prompt += ` Context: ${context.slice(0, 300)}.`;
    }
    prompt += " Style: Minimalist, academic, clear lines, white background, suitable for a presentation slide.";

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "4:3",
        }
      }
    });

    // Check for inline data in response
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini image generation failed:", error);
    return null;
  }
}

/**
 * Extract context string from a slide for fallback image generation
 */
export function getSlideContext(slide: {
  layout: string;
  title?: string;
  bullets?: string[];
  left?: string[];
  right?: string[];
  text?: string;
}): string {
  const parts: string[] = [];
  
  if (slide.title) parts.push(slide.title);
  if (slide.bullets) parts.push(...slide.bullets);
  if (slide.left) parts.push(...slide.left);
  if (slide.right) parts.push(...slide.right);
  if (slide.text) parts.push(slide.text);
  
  return parts.join(". ").slice(0, 500);
}

/**
 * Clear cache (No-op now as we generate fresh every time, but kept for API compatibility)
 */
export function clearImageCache(): void {
  // No-op
}

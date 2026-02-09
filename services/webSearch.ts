/**
 * Web Search Service
 * Uses Gemini with Google Search grounding to find relevant information
 */

import { getApiKey } from "./geminiConfig";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface WebSearchResult {
  title: string;
  snippet: string;
  link: string;
}

/**
 * Search the web using Gemini with Google Search grounding
 * Returns top results with title, snippet, and link
 */
export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  console.log("[WebSearch] Searching for:", query);

  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenerativeAI(apiKey);

    const model = ai.getGenerativeModel({
      model: "gemini-3-flash-preview",
      tools: [{ googleSearch: {} } as any],
    });

    const result = await model.generateContent(
      `Search the web and provide the top 3 most relevant results for: "${query}"
      
For each result, provide:
1. Title of the page
2. A brief snippet/summary (2-3 sentences)
3. The URL/link

Format your response as JSON array:
[{"title": "...", "snippet": "...", "link": "..."}]

Only return the JSON array, nothing else.`
    );

    const responseText = result.response.text();
    console.log("[WebSearch] Raw response:", responseText);

    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as WebSearchResult[];
      console.log("[WebSearch] Parsed results:", parsed.length);
      return parsed.slice(0, 3);
    }

    // Extract grounding URLs if available
    const groundingMetadata = (result.response as any)?.candidates?.[0]
      ?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      const results: WebSearchResult[] = groundingMetadata.groundingChunks
        .slice(0, 3)
        .map((chunk: any) => ({
          title: chunk.web?.title || "Search Result",
          snippet: chunk.web?.snippet || responseText.substring(0, 150),
          link: chunk.web?.uri || "",
        }));
      console.log("[WebSearch] Grounding results:", results.length);
      return results;
    }

    // Fallback: return the text as a single result
    return [
      {
        title: `Search: ${query}`,
        snippet: responseText.substring(0, 300),
        link: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      },
    ];
  } catch (error) {
    console.error("[WebSearch] Error:", error);
    return [
      {
        title: `Search: ${query}`,
        snippet:
          "Could not perform web search. Please check your connection and try again.",
        link: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      },
    ];
  }
}

/**
 * YouTube Search Service
 * Uses Gemini to find relevant YouTube videos for educational content
 */

import { getApiKey } from "./geminiConfig";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface YouTubeResult {
  videoId: string;
  title: string;
  thumbnail: string;
  description: string;
}

/**
 * Search for relevant YouTube educational videos using Gemini
 * Returns video results with ID, title, thumbnail, and description
 */
export async function searchYouTube(query: string): Promise<YouTubeResult[]> {
  console.log("[YouTubeSearch] Searching for:", query);

  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenerativeAI(apiKey);

    const model = ai.getGenerativeModel({
      model: "gemini-3-flash-preview",
      tools: [{ googleSearch: {} } as any],
    });

    const result = await model.generateContent(
      `Find the best educational YouTube video about: "${query}"
      
Search for real YouTube videos that explain this topic well.

Return EXACTLY this JSON format (array of 1-2 results):
[{
  "videoId": "<the YouTube video ID from the URL>",
  "title": "<video title>",
  "description": "<brief description of what the video covers>"
}]

IMPORTANT: The videoId must be a real YouTube video ID (the part after v= in a YouTube URL).
Only return the JSON array, nothing else.`
    );

    const responseText = result.response.text();
    console.log("[YouTubeSearch] Raw response:", responseText);

    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        videoId: string;
        title: string;
        description: string;
      }>;
      const results: YouTubeResult[] = parsed.slice(0, 2).map((item) => ({
        videoId: item.videoId,
        title: item.title,
        thumbnail: `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`,
        description: item.description,
      }));
      console.log("[YouTubeSearch] Parsed results:", results.length);
      return results;
    }

    return [];
  } catch (error) {
    console.error("[YouTubeSearch] Error:", error);
    return [];
  }
}

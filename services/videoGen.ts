import { GoogleGenAI } from "@google/genai";

/**
 * Generates a short video clip using Google's Veo model.
 * 
 * @param prompt - The visual description of the scene to generate.
 * @param apiKey - The Gemini API key.
 * @returns A URL (object URL) to the generated MP4 video blob.
 */
export async function generateVideoClip(prompt: string, apiKey: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  console.log("[VideoGen] Starting Veo generation for:", prompt.substring(0, 50) + "...");

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '1080p',
      aspectRatio: '16:9'
    }
  });

  // Poll for completion
  while (!operation.done) {
    // Check every 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("[VideoGen] Polling operation status...");
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) {
    throw new Error("No video URI returned from Veo model.");
  }

  console.log("[VideoGen] Generation complete. Fetching video content...");

  // The video URI requires the API key appended to fetch the content
  const response = await fetch(`${videoUri}&key=${apiKey}`);
  
  if (!response.ok) {
    throw new Error(`Failed to download video content: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

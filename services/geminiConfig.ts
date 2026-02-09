/**
 * Gemini AI Configuration
 * Initializes the GoogleGenerativeAI client with API key management
 */

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// Model identifiers - Three Agent Pattern
// Each agent gets its own model instance with specialized system instructions
export const MODELS = {
  SCIENTIST: "gemini-3-pro-preview",  // Code execution enabled - using Pro for complex reasoning
  VISUALIZER: "gemini-3-flash-preview", // JSON output mode
  TEACHER: "gemini-3-flash-preview",    // Conversational with history
} as const;

// API Key Management — only uses localStorage (user must always enter key via modal)
export function getApiKey(): string {
  const storedKey =
    typeof window !== "undefined"
      ? localStorage.getItem("GEMINI_API_KEY")
      : null;

  if (storedKey) {
    return storedKey;
  }

  throw new Error(
    "No API key found. Please enter your Gemini API key.",
  );
}

// Set API Key (for UI input)
export function setApiKey(key: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("GEMINI_API_KEY", key);
  }
}

// Clear stored API Key
export function clearApiKey(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("GEMINI_API_KEY");
  }
}

// Singleton client instance
let clientInstance: GoogleGenerativeAI | null = null;

/**
 * Get or create the GoogleGenerativeAI client instance
 */
export function getClient(apiKey?: string): GoogleGenerativeAI {
  const key = apiKey || getApiKey();

  // Create new instance if none exists or key changed
  if (!clientInstance) {
    clientInstance = new GoogleGenerativeAI(key);
  }

  return clientInstance;
}

/**
 * Reset the client instance (useful when API key changes)
 */
export function resetClient(): void {
  clientInstance = null;
}

/**
 * Get a configured model instance
 */
export function getModel(
  modelName: keyof typeof MODELS,
  apiKey?: string,
): GenerativeModel {
  const client = getClient(apiKey);
  return client.getGenerativeModel({ model: MODELS[modelName] });
}

// Export types for convenience
export type { GoogleGenerativeAI, GenerativeModel };

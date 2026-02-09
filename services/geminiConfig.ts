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

// API Key Management
export function getApiKey(): string {
  // Priority 1: localStorage (for user input via UI)
  const storedKey =
    typeof window !== "undefined"
      ? localStorage.getItem("GEMINI_API_KEY")
      : null;

  if (storedKey) {
    return storedKey;
  }

  // Priority 2: Environment variable
  const meta = import.meta as any;
  const envKey =
    meta.env?.VITE_GEMINI_API_KEY ||
    meta.env?.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY;

  if (envKey) {
    return envKey;
  }

  throw new Error(
    "No API key found. Please set your Gemini API key in localStorage " +
      "(key: 'GEMINI_API_KEY') or as an environment variable.",
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

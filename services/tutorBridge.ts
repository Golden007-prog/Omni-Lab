/**
 * TutorBridge
 * Global bridge that allows any component to send content to the AI tutor
 * for voice explanation.
 * 
 * Usage:
 *   registerTutor(callback) — called by FloatingVoiceTutor on mount
 *   sendToTutor(content) — called by any component to request explanation
 */

type TutorCallback = (content: string) => void;

let tutorCallback: TutorCallback | null = null;

/**
 * Register the tutor's explain handler.
 * Called by FloatingVoiceTutor when it mounts.
 */
export function registerTutor(cb: TutorCallback): void {
  console.log("[TutorBridge] Tutor registered");
  tutorCallback = cb;
}

/**
 * Unregister the tutor handler.
 * Called by FloatingVoiceTutor when it unmounts.
 */
export function unregisterTutor(): void {
  console.log("[TutorBridge] Tutor unregistered");
  tutorCallback = null;
}

/**
 * Send content to the tutor for explanation.
 * Called by any component (flashcards, quiz, slides, etc.)
 */
export function sendToTutor(content: string): void {
  if (tutorCallback) {
    console.log("[TutorBridge] Explain request received:", content.substring(0, 80));
    tutorCallback(content);
  } else {
    console.warn("[TutorBridge] Tutor not ready — cannot explain");
  }
}

/**
 * Check if tutor is available for explanations.
 */
export function isTutorReady(): boolean {
  return tutorCallback !== null;
}

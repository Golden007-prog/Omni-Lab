/**
 * ChatBridge
 * Global bridge that allows any component to send messages to the chat panel.
 * 
 * Usage:
 *   registerChat(callback) — called by TextChat on mount
 *   sendToChat(text) — called by explainRouter or any component
 */

type ChatCallback = (text: string) => void;

let chatCallback: ChatCallback | null = null;

/**
 * Register the chat's incoming message handler.
 * Called by TextChat when it mounts.
 */
export function registerChat(cb: ChatCallback): void {
  console.log("[ChatBridge] Chat registered");
  chatCallback = cb;
}

/**
 * Unregister the chat handler.
 * Called by TextChat when it unmounts.
 */
export function unregisterChat(): void {
  console.log("[ChatBridge] Chat unregistered");
  chatCallback = null;
}

/**
 * Send a message to the chat for explanation.
 * Called by explainRouter or any component.
 */
export function sendToChat(text: string): void {
  if (chatCallback) {
    console.log("[ChatBridge] Routing to chat:", text.substring(0, 80));
    chatCallback(text);
  } else {
    console.warn("[ChatBridge] Chat not ready — cannot send message");
  }
}

/**
 * Check if chat is available.
 */
export function isChatReady(): boolean {
  return chatCallback !== null;
}

/**
 * PanelBridge
 * Controls the right panel state from services/components.
 * Allows explainRouter to open the chat panel automatically.
 */

type PanelType = "chat" | "studio" | "logs";
type PanelCallback = (panel: PanelType) => void;

let panelCallback: PanelCallback | null = null;

/**
 * Register the panel setter from App.tsx
 */
export function registerPanelController(cb: PanelCallback): void {
  console.log("[PanelBridge] Panel controller registered");
  panelCallback = cb;
}

/**
 * Unregister the panel controller
 */
export function unregisterPanelController(): void {
  console.log("[PanelBridge] Panel controller unregistered");
  panelCallback = null;
}

/**
 * Open a specific panel
 */
export function openPanel(panel: PanelType): void {
  if (panelCallback) {
    console.log(`[PanelBridge] Opening panel: ${panel}`);
    panelCallback(panel);
  } else {
    console.warn("[PanelBridge] Panel controller not ready");
  }
}

/**
 * Convenience function to open chat panel
 */
export function openChatPanel(): void {
  openPanel("chat");
}

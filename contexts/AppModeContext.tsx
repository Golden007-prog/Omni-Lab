/**
 * AppModeContext
 * Tracks the current interaction mode: "chat" or "voice"
 * 
 * Used by explainRouter to determine where to send explain requests.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

type AppMode = "chat" | "voice";

interface AppModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

// Global getter for use outside React components
let globalMode: AppMode = "chat";

export function getMode(): AppMode {
  return globalMode;
}

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>("chat");

  const setMode = useCallback((newMode: AppMode) => {
    console.log(`[AppMode] Mode changed: ${globalMode} → ${newMode}`);
    globalMode = newMode;
    setModeState(newMode);
  }, []);

  return (
    <AppModeContext.Provider value={{ mode, setMode }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) {
    throw new Error("useAppMode must be used within AppModeProvider");
  }
  return ctx;
}

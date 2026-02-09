/**
 * ViewContext
 * ────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for the current workspace view.
 *
 * Every component that needs to know or change the active view
 * must go through useView().  No local viewMode / setViewMode
 * states allowed anywhere else in the tree.
 */

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

export type WorkspaceView =
  | "idle"
  | "slides"
  | "simulation"
  | "flashcards"
  | "quiz"
  | "infographic"
  | "mindmap"
  | "data_table"
  | "video"
  | "audio"
  | "report"
  | "live_presentation"
  | "pptx_preview";

interface ViewContextValue {
  activeView: WorkspaceView;
  previousView: WorkspaceView | null;
  setView: (view: WorkspaceView) => void;
  goBack: () => void;
  canGoBack: boolean;
}

const ViewContext = createContext<ViewContextValue | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<WorkspaceView>("idle");
  const [previousView, setPreviousView] = useState<WorkspaceView | null>(null);

  // Use a ref to track the current view so setView never has a stale closure.
  const activeViewRef = useRef(activeView);
  activeViewRef.current = activeView;

  const setView = useCallback((view: WorkspaceView) => {
    // Guard: do nothing if already on this view (prevents loops & flicker).
    if (activeViewRef.current === view) return;

    console.log(`[ViewContext] View changed: ${activeViewRef.current} → ${view}`);
    console.log("ACTIVE VIEW:", view);

    setPreviousView(activeViewRef.current);
    setActiveView(view);
  }, []); // stable — no deps, uses ref internally

  const goBack = useCallback(() => {
    setPreviousView(prev => {
      if (prev && prev !== "idle") {
        console.log(`[ViewContext] Going back to: ${prev}`);
        setActiveView(prev);
      }
      return null;
    });
  }, []);

  const canGoBack = previousView !== null && previousView !== "idle";

  return (
    <ViewContext.Provider value={{ activeView, previousView, setView, goBack, canGoBack }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const ctx = useContext(ViewContext);
  if (!ctx) {
    throw new Error("useView must be used within ViewProvider");
  }
  return ctx;
}

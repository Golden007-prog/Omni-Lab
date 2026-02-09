/**
 * WorkspaceNav
 * Top navigation bar for switching between workspace views.
 * Shows tabs for: Slides, Flashcards, Quiz, Mindmap, Data, and others.
 */

import React from "react";
import { 
  Presentation, 
  BookOpen, 
  HelpCircle, 
  Network, 
  Table,
  ArrowLeft,
  Image as ImageIcon,
  Video,
  Headphones,
  FileText
} from "lucide-react";
import { useView, WorkspaceView } from "../contexts/ViewContext";
import { useWorkspace } from "../contexts/WorkspaceContext";

interface NavItem {
  id: WorkspaceView;
  label: string;
  icon: React.ReactNode;
  checkContent: (ws: any) => boolean;
}

const navItems: NavItem[] = [
  { 
    id: "slides", 
    label: "Slides", 
    icon: <Presentation className="w-4 h-4" />,
    checkContent: (ws) => ws.slides || ws.livePresentation 
  },
  { 
    id: "flashcards", 
    label: "Flashcards", 
    icon: <BookOpen className="w-4 h-4" />,
    checkContent: (ws) => ws.flashcards
  },
  { 
    id: "quiz", 
    label: "Quiz", 
    icon: <HelpCircle className="w-4 h-4" />,
    checkContent: (ws) => ws.quiz
  },
  { 
    id: "mindmap", 
    label: "Mindmap", 
    icon: <Network className="w-4 h-4" />,
    checkContent: (ws) => ws.mindmap
  },
  { 
    id: "infographic", 
    label: "Infographic", 
    icon: <ImageIcon className="w-4 h-4" />,
    checkContent: (ws) => ws.infographic
  },
  { 
    id: "data_table", 
    label: "Data", 
    icon: <Table className="w-4 h-4" />,
    checkContent: (ws) => ws.dataTable
  },
  { 
    id: "video", 
    label: "Video", 
    icon: <Video className="w-4 h-4" />,
    checkContent: (ws) => ws.video && ws.video.title && ws.video.title.includes("Video")
  },
  { 
    id: "audio", 
    label: "Audio", 
    icon: <Headphones className="w-4 h-4" />,
    checkContent: (ws) => ws.video && ws.video.title && ws.video.title.includes("Audio")
  },
  { 
    id: "report", 
    label: "Report", 
    icon: <FileText className="w-4 h-4" />,
    checkContent: (ws) => ws.report
  },
];

interface WorkspaceNavProps {
  /** Only show nav when content is available */
  hasContent?: boolean;
}

const WorkspaceNav: React.FC<WorkspaceNavProps> = ({ hasContent = false }) => {
  const { activeView, setView, goBack, canGoBack } = useView();
  const ws = useWorkspace();

  // Don't show nav if no content is loaded (based on passed prop or internal check)
  if (!hasContent && !ws.hasSources) return null;

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-slate-950 border-b border-slate-800 overflow-x-auto no-scrollbar z-20">
      {/* Back Button */}
      {canGoBack && (
        <button
          onClick={goBack}
          className="flex items-center gap-1 px-2 py-1 mr-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors shrink-0"
          title="Go back"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </button>
      )}

      {/* Nav Items */}
      <div className="flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const hasItemContent = item.checkContent(ws);
          
          if (!hasItemContent && !isActive) return null; // Hide tabs that don't exist yet to keep UI clean

          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? "bg-purple-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * BackToSlidesButton
 * A standalone button to go back to slides view.
 * Use inside flashcards, quiz, etc.
 */
export const BackToSlidesButton: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { setView, activeView } = useView();

  // Don't show if already on slides
  if (activeView === "slides" || activeView === "live_presentation" || activeView === "idle") {
    return null;
  }

  return (
    <button
      onClick={() => setView("slides")}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all ${className}`}
    >
      <ArrowLeft className="w-3 h-3" />
      Back to Slides
    </button>
  );
};

export default WorkspaceNav;

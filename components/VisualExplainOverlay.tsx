import React from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';

export interface VisualOverlayState {
  url: string | null;
  type: 'image' | 'video';
  isGenerating: boolean;
  prompt: string;
}

interface VisualExplainOverlayProps {
  state: VisualOverlayState | null;
  isVisible: boolean;
  onClose: () => void;
}

const VisualExplainOverlay: React.FC<VisualExplainOverlayProps> = ({ state, isVisible, onClose }) => {
  if (!isVisible || !state) return null;

  return (
    <div className="fixed bottom-24 right-5 w-80 md:w-96 aspect-video bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-[1001] animate-in fade-in slide-in-from-bottom-10 duration-500">
      {/* Header / Close button */}
      <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-start z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="px-2 py-1 rounded bg-black/40 backdrop-blur-sm text-[10px] font-mono text-purple-300 border border-purple-500/30 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          AI VISUAL
        </div>
        <button 
          onClick={onClose} 
          className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full text-white/80 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {state.isGenerating ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
          <div className="relative mb-4">
            <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-200">Generating visual...</p>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 px-4">"{state.prompt}"</p>
        </div>
      ) : state.url ? (
        state.type === 'video' ? (
          <video 
            src={state.url} 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-cover" 
          />
        ) : (
          <img 
            src={state.url} 
            alt={state.prompt} 
            className="w-full h-full object-cover" 
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-500 text-xs">
          Visual generation failed
        </div>
      )}
    </div>
  );
};

export default VisualExplainOverlay;

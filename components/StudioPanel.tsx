import React, { useState } from 'react';
import { Headphones, Video, GitFork, FileText, Layers, HelpCircle, Image, Monitor, Presentation, Table, Loader2, Pencil } from 'lucide-react';

// Action types for different studio outputs
export type StudioActionType = 
  | 'audio_overview'
  | 'video_overview'
  | 'mind_map'
  | 'reports'
  | 'flashcards'
  | 'quiz'
  | 'infographic'
  | 'slide_deck'
  | 'pptx_slides'
  | 'data_table';

export interface StudioAction {
  type: StudioActionType;
  prompt: string;
}

interface StudioPanelProps {
  onAction: (action: StudioAction) => void;
  isGenerating?: boolean;
  generatingType?: StudioActionType | null;
}

const StudioPanel: React.FC<StudioPanelProps> = ({ onAction, isGenerating = false, generatingType = null }) => {
  const options: Array<{
    type: StudioActionType;
    icon: React.ReactNode;
    label: string;
    prompt: string;
    color: string;
  }> = [
    {
      type: 'flashcards',
      icon: <Layers className="w-5 h-5" />,
      label: 'Flashcards',
      prompt: 'Create comprehensive study flashcards based on this content.',
      color: 'text-yellow-400'
    },
    {
      type: 'quiz',
      icon: <HelpCircle className="w-5 h-5" />,
      label: 'Quiz',
      prompt: 'Generate a multiple-choice Quiz to test understanding of the material.',
      color: 'text-red-400'
    },
    {
      type: 'infographic',
      icon: <Image className="w-5 h-5" />,
      label: 'Infographic',
      prompt: 'Describe a detailed Infographic explaining the key concepts.',
      color: 'text-pink-400'
    },
    {
      type: 'slide_deck',
      icon: <Monitor className="w-5 h-5" />,
      label: 'Slide deck',
      prompt: 'Create an interactive slide deck covering this topic.',
      color: 'text-cyan-400'
    },
    {
      type: 'pptx_slides',
      icon: <Presentation className="w-5 h-5" />,
      label: 'Generate Presentation',
      prompt: 'Generate a modern presentation from the uploaded document (preview first, then export).',
      color: 'text-purple-300'
    },
    {
      type: 'data_table',
      icon: <Table className="w-5 h-5" />,
      label: 'Data table',
      prompt: 'Extract key data and present as a structured table.',
      color: 'text-orange-400'
    },
  ];

  const additionalOptions = [
    {
      type: 'audio_overview' as StudioActionType,
      icon: <Headphones className="w-5 h-5" />,
      label: 'Audio Overview',
      prompt: 'Generate a podcast-style Audio Overview script.',
      color: 'text-purple-400'
    },
    {
      type: 'video_overview' as StudioActionType,
      icon: <Video className="w-5 h-5" />,
      label: 'Video Overview',
      prompt: 'Create a script for a Video Overview.',
      color: 'text-blue-400'
    },
    {
      type: 'mind_map' as StudioActionType,
      icon: <GitFork className="w-5 h-5" />,
      label: 'Mind Map',
      prompt: 'Create a Mind Map organizing the connections between concepts.',
      color: 'text-green-400'
    },
    {
      type: 'reports' as StudioActionType,
      icon: <FileText className="w-5 h-5" />,
      label: 'Reports',
      prompt: 'Generate a comprehensive executive summary Report.',
      color: 'text-slate-300'
    },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 overflow-y-auto custom-scrollbar">
      <div className="p-4 space-y-4">
        
        {/* Primary Options Row */}
        <div className="grid grid-cols-4 gap-2">
          {options.slice(0, 4).map((opt) => {
            const isActive = isGenerating && generatingType === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => onAction({ type: opt.type, prompt: opt.prompt })}
                disabled={isGenerating}
                className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left group ${
                  isActive 
                    ? 'bg-slate-800 border-yellow-600/50' 
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                } ${isGenerating && !isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`p-1.5 rounded-lg bg-slate-950 border border-slate-800 mb-2 transition-colors ${opt.color}`}>
                  {isActive ? <Loader2 className="w-5 h-5 animate-spin" /> : opt.icon}
                </div>
                <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                  {opt.label}
                </span>
                {/* Edit icon */}
                <Pencil className="w-3 h-3 text-slate-600 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>

        {/* Fifth option (Data table) */}
        <div className="grid grid-cols-4 gap-2">
          {options.slice(4).map((opt) => {
            const isActive = isGenerating && generatingType === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => onAction({ type: opt.type, prompt: opt.prompt })}
                disabled={isGenerating}
                className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left group ${
                  isActive 
                    ? 'bg-slate-800 border-yellow-600/50' 
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                } ${isGenerating && !isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`p-1.5 rounded-lg bg-slate-950 border border-slate-800 mb-2 transition-colors ${opt.color}`}>
                  {isActive ? <Loader2 className="w-5 h-5 animate-spin" /> : opt.icon}
                </div>
                <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Generating Status */}
        {isGenerating && generatingType && (
          <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <div>
              <p className="text-sm font-medium text-white">
                Generating {generatingType.replace('_', ' ')}...
              </p>
              <p className="text-xs text-slate-500">based on your sources</p>
            </div>
          </div>
        )}

        {/* Additional Options */}
        <div className="pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">More Options</p>
          <div className="grid grid-cols-2 gap-2">
            {additionalOptions.map((opt) => {
              const isActive = isGenerating && generatingType === opt.type;
              return (
                <button
                  key={opt.type}
                  onClick={() => onAction({ type: opt.type, prompt: opt.prompt })}
                  disabled={isGenerating}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left group ${
                    isActive 
                      ? 'bg-slate-800 border-yellow-600/50' 
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                  } ${isGenerating && !isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`p-1.5 rounded-lg bg-slate-950 border border-slate-800 transition-colors ${opt.color}`}>
                    {isActive ? <Loader2 className="w-5 h-5 animate-spin" /> : opt.icon}
                  </div>
                  <span className="text-xs font-medium text-slate-300 group-hover:text-white">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
          <p className="text-xs text-slate-500 text-center">
            Select an option to generate study aids from your sources.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudioPanel;

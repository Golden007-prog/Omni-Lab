import React from 'react';
import { ArrowLeft, Loader2, Image as ImageIcon, Download } from 'lucide-react';
import { useView } from '../contexts/ViewContext';

// =============================================================================
// TYPES
// =============================================================================

export interface InfographicSection {
  id: number;
  title: string;
  content: string;
  icon?: string;
  highlight?: boolean;
}

export interface InfographicData {
  title: string;
  subtitle?: string;
  sourceCount: number;
  sections: InfographicSection[];
  keyStats?: Array<{ label: string; value: string }>;
}

interface InfographicViewerProps {
  data: InfographicData;
  isGenerating?: boolean;
  onFeedback?: (type: 'good' | 'bad') => void;
}

// =============================================================================
// INFOGRAPHIC VIEWER COMPONENT
// =============================================================================

const InfographicViewer: React.FC<InfographicViewerProps> = ({ 
  data, 
  isGenerating = false,
  onFeedback 
}) => {
  const { setView } = useView();

  if (isGenerating) {
    return (
      <div className="h-full flex flex-col bg-slate-900">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-purple-400">Studio</span>
            <span>›</span>
            <span>Infographic</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <div>
              <p className="font-medium">Generating infographic...</p>
              <p className="text-sm text-slate-500">based on {data.sourceCount} sources</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data.sections || data.sections.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900 text-slate-400">
        <p>No infographic content available</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <button 
            onClick={() => setView('idle')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-xl font-semibold text-white">{data.title}</h2>
          {data.subtitle && <p className="text-sm text-slate-500">{data.subtitle}</p>}
        </div>
        <button className="p-2 text-slate-400 hover:text-white transition-colors" title="Download">
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Key Stats */}
          {data.keyStats && data.keyStats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {data.keyStats.map((stat, index) => (
                <div 
                  key={index}
                  className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 text-center"
                >
                  <p className="text-2xl font-bold text-purple-400">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Sections */}
          <div className="space-y-4">
            {data.sections.map((section, index) => (
              <div 
                key={section.id || index}
                className={`p-5 rounded-xl border transition-all ${
                  section.highlight 
                    ? 'bg-purple-900/20 border-purple-700/50' 
                    : 'bg-slate-800/50 border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    section.highlight ? 'bg-purple-600' : 'bg-slate-700'
                  }`}>
                    {section.icon ? (
                      <span className="text-lg">{section.icon}</span>
                    ) : (
                      <ImageIcon className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-2 ${
                      section.highlight ? 'text-purple-200' : 'text-white'
                    }`}>
                      {section.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{section.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 p-4 bg-slate-800/30 rounded-lg border border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              Generated from {data.sourceCount} source{data.sourceCount !== 1 ? 's' : ''} • Powered by AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfographicViewer;

import React, { useState } from 'react';
import { ArrowLeft, Loader2, FileText, Download, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { useView } from '../contexts/ViewContext';

// =============================================================================
// TYPES
// =============================================================================

export interface ReportSection {
  id: number;
  title: string;
  content: string;
  subsections?: Array<{ title: string; content: string }>;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  sourceCount: number;
  executiveSummary: string;
  sections: ReportSection[];
  conclusions?: string[];
  recommendations?: string[];
}

interface ReportViewerProps {
  data: ReportData;
  isGenerating?: boolean;
  onFeedback?: (type: 'good' | 'bad') => void;
}

// =============================================================================
// REPORT VIEWER COMPONENT
// =============================================================================

const ReportViewer: React.FC<ReportViewerProps> = ({ 
  data, 
  isGenerating = false,
  onFeedback 
}) => {
  const { setView } = useView();
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  const toggleSection = (id: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  if (isGenerating) {
    return (
      <div className="h-full flex flex-col bg-slate-900">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-purple-400">Studio</span>
            <span>›</span>
            <span>Report</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <div>
              <p className="font-medium">Generating report...</p>
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
        <p>No report content available</p>
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
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-400" />
            {data.title}
          </h2>
          {data.subtitle && <p className="text-sm text-slate-500">{data.subtitle}</p>}
        </div>
        <button 
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* Executive Summary */}
          <div className="mb-8 p-5 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-700/30">
            <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">
              Executive Summary
            </h3>
            <p className="text-slate-200 leading-relaxed">{data.executiveSummary}</p>
          </div>

          {/* Table of Contents */}
          <div className="mb-8 p-4 bg-slate-800/30 rounded-xl border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Contents
            </h3>
            <nav className="space-y-1">
              {data.sections.map((section, index) => (
                <button
                  key={section.id || index}
                  onClick={() => {
                    setExpandedSections(new Set([section.id || index]));
                    document.getElementById(`section-${section.id || index}`)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="block w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {index + 1}. {section.title}
                </button>
              ))}
            </nav>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {data.sections.map((section, index) => {
              const sectionId = section.id || index;
              const isExpanded = expandedSections.has(sectionId);
              
              return (
                <div 
                  key={sectionId}
                  id={`section-${sectionId}`}
                  className="rounded-xl border border-slate-800 overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(sectionId)}
                    className="w-full p-4 bg-slate-800/50 hover:bg-slate-800/70 flex items-center justify-between transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-white">
                      {index + 1}. {section.title}
                    </h3>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="p-5 bg-slate-900/50">
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line">{section.content}</p>
                      
                      {section.subsections && section.subsections.length > 0 && (
                        <div className="mt-4 space-y-4 pl-4 border-l-2 border-slate-700">
                          {section.subsections.map((sub, subIndex) => (
                            <div key={subIndex}>
                              <h4 className="text-sm font-semibold text-purple-400 mb-2">{sub.title}</h4>
                              <p className="text-sm text-slate-400">{sub.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Conclusions */}
          {data.conclusions && data.conclusions.length > 0 && (
            <div className="mt-8 p-5 bg-slate-800/30 rounded-xl border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Key Conclusions
              </h3>
              <ul className="space-y-2">
                {data.conclusions.map((conclusion, index) => (
                  <li key={index} className="flex items-start gap-3 text-slate-300">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    {conclusion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {data.recommendations && data.recommendations.length > 0 && (
            <div className="mt-4 p-5 bg-blue-900/10 rounded-xl border border-blue-800/30">
              <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">
                Recommendations
              </h3>
              <ul className="space-y-2">
                {data.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3 text-slate-300">
                    <span className="text-blue-400 font-semibold">{index + 1}.</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 p-4 bg-slate-800/20 rounded-lg border border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              Report generated from {data.sourceCount} source{data.sourceCount !== 1 ? 's' : ''} • Powered by AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;

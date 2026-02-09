import React, { useRef } from 'react';
import { FileText, Upload, Trash2, Link, HardDrive } from 'lucide-react';
import { SourceFile } from '../types';

interface SourcesPanelProps {
  sources: SourceFile[];
  onAddSource: (file: File) => void;
  onRemoveSource: (id: string) => void;
  isWebSearchEnabled: boolean;
  setIsWebSearchEnabled: (v: boolean) => void;
}

const SourcesPanel: React.FC<SourcesPanelProps> = ({ 
  sources, 
  onAddSource, 
  onRemoveSource,
  isWebSearchEnabled,
  setIsWebSearchEnabled
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onAddSource(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <h2 className="font-semibold text-slate-200 mb-1">Sources</h2>
        <p className="text-xs text-slate-500">Add content for the Teacher to analyze.</p>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* Web Search Toggle */}
        <div 
          onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
          className={`
            p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3
            ${isWebSearchEnabled 
              ? 'bg-blue-900/20 border-blue-500/50' 
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'}
          `}
        >
          <div className={`p-2 rounded-lg ${isWebSearchEnabled ? 'bg-blue-600' : 'bg-slate-800'}`}>
            <Link className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-200">Web Search</div>
            <div className="text-xs text-slate-500">
              {isWebSearchEnabled ? 'Connected to Google Search' : 'Offline'}
            </div>
          </div>
        </div>

        {/* Google Drive (Mock) */}
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900 flex items-center gap-3 opacity-70 cursor-not-allowed" title="Requires OAuth Config">
          <div className="p-2 rounded-lg bg-slate-800">
            <HardDrive className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-200">Google Drive</div>
            <div className="text-xs text-slate-500">Connect account</div>
          </div>
        </div>

        {/* File List */}
        <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Files ({sources.length})</div>
            
            {sources.map(source => (
                <div key={source.id} className="group flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="text-sm text-slate-300 truncate">{source.name}</span>
                    </div>
                    <button 
                        onClick={() => onRemoveSource(source.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
      </div>

      {/* Add Button */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <input 
            type="file" 
            ref={fileInputRef}
            className="hidden"
            accept=".txt,.pdf,.md,.csv" // Supported MIME types for text generation context
            onChange={handleFileChange}
        />
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 border-2 border-dashed border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 hover:bg-slate-900 transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
            <Upload className="w-4 h-4" />
            Upload Source
        </button>
      </div>
    </div>
  );
};

export default SourcesPanel;

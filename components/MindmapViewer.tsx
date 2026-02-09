import React, { useState } from 'react';
import { ArrowLeft, Loader2, ChevronRight, ChevronDown, GitFork, ZoomIn, ZoomOut } from 'lucide-react';
import { useView } from '../contexts/ViewContext';

// =============================================================================
// TYPES
// =============================================================================

export interface MindmapNode {
  id: string;
  label: string;
  children?: MindmapNode[];
  description?: string;
  color?: string;
}

export interface MindmapData {
  title: string;
  sourceCount: number;
  rootNode: MindmapNode;
  summary?: string;
}

interface MindmapViewerProps {
  data: MindmapData;
  isGenerating?: boolean;
  onFeedback?: (type: 'good' | 'bad') => void;
}

// =============================================================================
// MINDMAP NODE COMPONENT
// =============================================================================

const MindmapNodeView: React.FC<{ 
  node: MindmapNode; 
  depth: number;
  onSelect: (node: MindmapNode) => void;
  selectedId: string | null;
}> = ({ node, depth, onSelect, selectedId }) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  const depthColors = [
    'border-purple-500 bg-purple-900/30',
    'border-blue-500 bg-blue-900/30',
    'border-green-500 bg-green-900/30',
    'border-yellow-500 bg-yellow-900/30',
    'border-pink-500 bg-pink-900/30',
  ];
  const colorClass = depthColors[depth % depthColors.length];

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
          isSelected ? 'bg-purple-900/50 ring-2 ring-purple-500' : 'hover:bg-slate-800/50'
        }`}
        onClick={() => onSelect(node)}
      >
        {hasChildren && (
          <button 
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}
        
        <div className={`px-3 py-1.5 rounded-lg border ${colorClass}`}>
          <span className="text-sm font-medium text-white">{node.label}</span>
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="ml-6 pl-4 border-l border-slate-700">
          {node.children!.map((child) => (
            <MindmapNodeView 
              key={child.id} 
              node={child} 
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MINDMAP VIEWER COMPONENT
// =============================================================================

const MindmapViewer: React.FC<MindmapViewerProps> = ({ 
  data, 
  isGenerating = false,
  onFeedback 
}) => {
  const { setView } = useView();
  const [selectedNode, setSelectedNode] = useState<MindmapNode | null>(null);
  const [zoom, setZoom] = useState(1);

  if (isGenerating) {
    return (
      <div className="h-full flex flex-col bg-slate-900">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-purple-400">Studio</span>
            <span>›</span>
            <span>Mind Map</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <div>
              <p className="font-medium">Generating mind map...</p>
              <p className="text-sm text-slate-500">based on {data.sourceCount} sources</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data.rootNode) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900 text-slate-400">
        <p>No mind map content available</p>
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
            <GitFork className="w-5 h-5 text-green-400" />
            {data.title}
          </h2>
          <p className="text-sm text-slate-500">Based on {data.sourceCount} sources</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4 text-slate-400" />
          </button>
          <span className="text-sm text-slate-400 min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Mind Map Tree */}
        <div className="flex-1 overflow-auto p-6">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <MindmapNodeView 
              node={data.rootNode} 
              depth={0}
              onSelect={setSelectedNode}
              selectedId={selectedNode?.id ?? null}
            />
          </div>
        </div>

        {/* Details Panel */}
        {selectedNode && (
          <div className="w-80 border-l border-slate-800 bg-slate-950 p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-3">{selectedNode.label}</h3>
            {selectedNode.description && (
              <p className="text-sm text-slate-300 leading-relaxed mb-4">{selectedNode.description}</p>
            )}
            {selectedNode.children && selectedNode.children.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                  Connected Topics ({selectedNode.children.length})
                </p>
                <div className="space-y-1">
                  {selectedNode.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedNode(child)}
                      className="w-full p-2 text-left text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {data.summary && (
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <p className="text-sm text-slate-400">{data.summary}</p>
        </div>
      )}
    </div>
  );
};

export default MindmapViewer;

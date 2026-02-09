import React, { useEffect, useRef } from 'react';
import { ThoughtLog } from '../types';
import { Terminal, Cpu, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface ThoughtLoggerProps {
  thoughts: ThoughtLog[];
}

const ThoughtLogger: React.FC<ThoughtLoggerProps> = ({ thoughts }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thoughts]);

  const getIcon = (status: ThoughtLog['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Terminal className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 w-80 font-mono text-xs">
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <Cpu className="w-5 h-5 text-purple-400" />
        <h2 className="font-semibold text-slate-200">Thought Signatures</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {thoughts.length === 0 && (
            <div className="text-slate-600 italic text-center mt-10">
                Waiting for simulation requests...
            </div>
        )}
        
        {thoughts.map((thought) => (
          <div 
            key={thought.id} 
            className={`
              relative pl-4 py-1 border-l-2 
              ${thought.status === 'error' ? 'border-red-500/50 bg-red-950/10' : 
                thought.status === 'success' ? 'border-green-500/50 bg-green-950/10' : 
                thought.status === 'warning' ? 'border-yellow-500/50' : 'border-blue-500/50'}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              {getIcon(thought.status)}
              <span className="text-slate-500 text-[10px]">
                {thought.timestamp.toLocaleTimeString()}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                L{thought.level}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {thought.message}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default ThoughtLogger;

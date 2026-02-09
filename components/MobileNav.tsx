import React from 'react';
import { Presentation, MessageSquare, Sparkles, Mic } from 'lucide-react';

export type MobilePanel = 'slides' | 'chat' | 'tools' | 'voice';

interface MobileNavProps {
  activePanel: MobilePanel;
  onPanelChange: (panel: MobilePanel) => void;
}

const navItems: { id: MobilePanel; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'slides', label: 'Slides', Icon: Presentation },
  { id: 'chat', label: 'Chat', Icon: MessageSquare },
  { id: 'tools', label: 'Tools', Icon: Sparkles },
  { id: 'voice', label: 'Voice', Icon: Mic },
];

const MobileNav: React.FC<MobileNavProps> = ({ activePanel, onPanelChange }) => {
  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-slate-950 border-t border-slate-800 flex items-stretch safe-area-bottom">
      {navItems.map(({ id, label, Icon }) => {
        const isActive = activePanel === id;
        return (
          <button
            key={id}
            onClick={() => onPanelChange(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors ${
              isActive
                ? 'text-purple-400 bg-purple-900/20'
                : 'text-slate-500 active:bg-slate-800/60'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
            <span className={`text-[10px] font-medium ${isActive ? 'text-purple-300' : 'text-slate-500'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileNav;

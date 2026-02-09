import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Download, ThumbsUp, ThumbsDown, MessageSquare, Volume2, ArrowLeft, Loader2, ExternalLink } from 'lucide-react';
import { useView } from '../contexts/ViewContext';

// =============================================================================
// TYPES
// =============================================================================

export interface Flashcard {
  id: number;
  front: string;  // Question
  back: string;   // Answer
  topic?: string; // Optional topic/category
}

export interface FlashcardsData {
  title: string;
  sourceCount: number;
  cards: Flashcard[];
}

interface FlashcardsViewerProps {
  data: FlashcardsData;
  isGenerating?: boolean;
  onExplainInChat?: (card: Flashcard) => void;
  onExplainInVoice?: (card: Flashcard) => void;
  onFeedback?: (type: 'good' | 'bad') => void;
}

// =============================================================================
// FLASHCARDS VIEWER COMPONENT
// =============================================================================

const FlashcardsViewer: React.FC<FlashcardsViewerProps> = ({ 
  data, 
  isGenerating = false,
  onExplainInChat,
  onExplainInVoice,
  onFeedback 
}) => {
  const { setView } = useView();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = data.cards[currentIndex];
  const totalCards = data.cards.length;

  // Reset flip when changing cards
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalCards]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(totalCards - 1, prev + 1));
  }, [totalCards]);

  const resetCards = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const progressPercentage = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;

  if (isGenerating) {
    return (
      <div className="h-full flex flex-col bg-slate-900">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-purple-400">Studio</span>
            <span>›</span>
            <span>App</span>
          </div>
        </div>

        {/* Loading State */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <div>
              <p className="font-medium">Generating flashcards...</p>
              <p className="text-sm text-slate-500">based on {data.sourceCount} sources</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900 text-slate-400">
        <p>No flashcards available</p>
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
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <span className="text-purple-400">Studio</span>
            <span>›</span>
            <span>App</span>
          </div>
          <h2 className="text-xl font-semibold text-white">{data.title}</h2>
          <p className="text-sm text-slate-500">Based on {data.sourceCount} sources</p>
        </div>
        <button className="p-2 text-slate-400 hover:text-white transition-colors">
          <ExternalLink className="w-5 h-5" />
        </button>
      </div>

      {/* Instructions */}
      <div className="text-center py-3 text-sm text-slate-500">
        Press 'Space' to flip, '←' / '→' to navigate
      </div>

      {/* Card Container */}
      <div className="flex-1 flex items-center justify-center px-8 relative">
        {/* Left Arrow */}
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="absolute left-8 p-3 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Flashcard */}
        <div 
          className="relative w-full max-w-md aspect-[3/4] cursor-pointer perspective-1000"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Green glow effect */}
          <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-64 h-64 bg-green-500/20 rounded-full blur-3xl pointer-events-none" />
          
          {/* Card flip container */}
          <div 
            className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            style={{ 
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* Front of card (Question) */}
            <div 
              className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700 shadow-2xl p-8 flex flex-col backface-hidden"
              style={{ backfaceVisibility: 'hidden' }}
            >
              {currentCard.topic && (
                <span className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-4">
                  {currentCard.topic}
                </span>
              )}
              <div className="flex-1 flex items-center justify-center">
                <p className="text-2xl text-slate-200 text-center leading-relaxed">
                  {currentCard.front}
                </p>
              </div>
              <button 
                className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(true);
                }}
              >
                See answer
              </button>
            </div>

            {/* Back of card (Answer) */}
            <div 
              className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700 shadow-2xl p-8 flex flex-col backface-hidden rotate-y-180"
              style={{ 
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              {currentCard.topic && (
                <h3 className="text-xl font-semibold text-white mb-4">
                  {currentCard.topic}
                </h3>
              )}
              <div className="flex-1 flex items-center">
                <p className="text-lg text-slate-300 leading-relaxed">
                  {currentCard.back}
                </p>
              </div>
              {/* Dual Explain Buttons */}
              <div className="flex items-center gap-3 mt-2">
                {onExplainInChat && (
                  <button 
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExplainInChat(currentCard);
                    }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Explain in Chat
                  </button>
                )}
                {onExplainInVoice && (
                  <button 
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExplainInVoice(currentCard);
                    }}
                  >
                    <Volume2 className="w-4 h-4" />
                    Explain with Voice
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Arrow */}
        <button
          onClick={goToNext}
          disabled={currentIndex === totalCards - 1}
          className="absolute right-8 p-3 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-8 py-4 flex items-center gap-4">
        <button 
          onClick={resetCards}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          title="Reset"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        
        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <span className="text-sm text-slate-400 min-w-[80px] text-right">
          {currentIndex + 1} / {totalCards} cards
        </span>
        
        <button 
          className="p-2 text-slate-400 hover:text-white transition-colors"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Feedback Buttons */}
      {onFeedback && (
        <div className="px-8 pb-6 flex items-center gap-3">
          <button 
            onClick={() => onFeedback('good')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-sm text-slate-300 transition-all"
          >
            <ThumbsUp className="w-4 h-4" />
            Good content
          </button>
          <button 
            onClick={() => onFeedback('bad')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-sm text-slate-300 transition-all"
          >
            <ThumbsDown className="w-4 h-4" />
            Bad content
          </button>
        </div>
      )}
    </div>
  );
};

export default FlashcardsViewer;

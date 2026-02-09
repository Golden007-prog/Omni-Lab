import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, RotateCcw, Loader2, ArrowLeft, Trophy } from 'lucide-react';
import { useView } from '../contexts/ViewContext';

// =============================================================================
// TYPES
// =============================================================================

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  topic?: string;
}

export interface QuizData {
  title: string;
  sourceCount: number;
  questions: QuizQuestion[];
}

interface QuizViewerProps {
  data: QuizData;
  isGenerating?: boolean;
  onFeedback?: (type: 'good' | 'bad') => void;
}

// =============================================================================
// QUIZ VIEWER COMPONENT
// =============================================================================

const QuizViewer: React.FC<QuizViewerProps> = ({ 
  data, 
  isGenerating = false,
  onFeedback 
}) => {
  const { setView } = useView();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = data.questions[currentIndex];
  const totalQuestions = data.questions.length;
  const progressPercentage = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  // Reset when data changes
  useEffect(() => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setShowResults(false);
  }, [data]);

  const handleAnswerSelect = useCallback((index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
  }, [isAnswered]);

  const handleSubmit = useCallback(() => {
    if (selectedAnswer === null) return;
    setIsAnswered(true);
    if (selectedAnswer === currentQuestion.correctIndex) {
      setScore(prev => prev + 1);
    }
  }, [selectedAnswer, currentQuestion]);

  const handleNext = useCallback(() => {
    if (currentIndex === totalQuestions - 1) {
      setShowResults(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  }, [currentIndex, totalQuestions]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
    setSelectedAnswer(null);
    setIsAnswered(false);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setShowResults(false);
  }, []);

  if (isGenerating) {
    return (
      <div className="h-full flex flex-col bg-slate-900">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-purple-400">Studio</span>
            <span>›</span>
            <span>Quiz</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <div>
              <p className="font-medium">Generating quiz...</p>
              <p className="text-sm text-slate-500">based on {data.sourceCount} sources</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / totalQuestions) * 100);
    return (
      <div className="h-full flex flex-col bg-slate-900">
        <div className="p-4 border-b border-slate-800">
          <button 
            onClick={() => setView('idle')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Workspace
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Trophy className={`w-16 h-16 mb-4 ${percentage >= 70 ? 'text-yellow-400' : percentage >= 50 ? 'text-slate-400' : 'text-slate-600'}`} />
          <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
          <p className="text-xl text-slate-300 mb-6">
            You scored <span className="text-purple-400 font-semibold">{score}</span> out of <span className="text-purple-400 font-semibold">{totalQuestions}</span>
          </p>
          <div className="w-64 h-3 bg-slate-800 rounded-full overflow-hidden mb-6">
            <div 
              className={`h-full transition-all duration-500 ${percentage >= 70 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-slate-400 mb-8">{percentage}% correct</p>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-medium transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900 text-slate-400">
        <p>No quiz questions available</p>
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
          <p className="text-sm text-slate-500">Based on {data.sourceCount} sources</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">Score</p>
          <p className="text-2xl font-bold text-purple-400">{score}/{currentIndex + (isAnswered ? 1 : 0)}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>Question {currentIndex + 1} of {totalQuestions}</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {currentQuestion.topic && (
            <span className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-2 block">
              {currentQuestion.topic}
            </span>
          )}
          <h3 className="text-xl font-medium text-white mb-6">{currentQuestion.question}</h3>
          
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctIndex;
              const showCorrect = isAnswered && isCorrect;
              const showWrong = isAnswered && isSelected && !isCorrect;
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={isAnswered}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                    showCorrect
                      ? 'bg-green-900/30 border-green-600 text-green-200'
                      : showWrong
                      ? 'bg-red-900/30 border-red-600 text-red-200'
                      : isSelected
                      ? 'bg-purple-900/30 border-purple-600 text-purple-200'
                      : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  } ${isAnswered && !showCorrect && !showWrong ? 'opacity-50' : ''}`}
                >
                  <span className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    showCorrect || showWrong ? 'border-current' : isSelected ? 'border-purple-500 bg-purple-500/20' : 'border-slate-600'
                  }`}>
                    {showCorrect ? <CheckCircle2 className="w-5 h-5" /> : 
                     showWrong ? <XCircle className="w-5 h-5" /> : 
                     String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {isAnswered && currentQuestion.explanation && (
            <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <h4 className="text-sm font-semibold text-purple-400 mb-2">Explanation</h4>
              <p className="text-sm text-slate-300">{currentQuestion.explanation}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        
        {!isAnswered ? (
          <button
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {currentIndex === totalQuestions - 1 ? 'See Results' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizViewer;

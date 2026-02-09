import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Play, Pause, Clock, Video, Clapperboard, Sparkles } from 'lucide-react';
import { useView } from '../contexts/ViewContext';
import { generateVideoClip } from '../services/videoGen';

// =============================================================================
// TYPES
// =============================================================================

export interface VideoSection {
  id: number;
  timestamp: string;
  title: string;
  narration: string;
  visualDescription?: string;
}

export interface VideoData {
  title: string;
  duration?: string;
  sourceCount: number;
  sections: VideoSection[];
  summary?: string;
}

interface VideoViewerProps {
  data: VideoData;
  isGenerating?: boolean;
  loading?: boolean;  // Alias for isGenerating
  onFeedback?: (type: 'good' | 'bad') => void;
  onBack?: () => void;
  apiKey: string;
}

// =============================================================================
// VIDEO VIEWER COMPONENT
// =============================================================================

const VideoViewer: React.FC<VideoViewerProps> = ({ 
  data, 
  isGenerating = false,
  loading = false,
  onFeedback,
  onBack,
  apiKey
}) => {
  const { setView } = useView();
  const [activeSection, setActiveSection] = useState(0);
  
  // Video Generation State
  const [videoCache, setVideoCache] = useState<Record<number, string>>({});
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const isLoading = isGenerating || loading;
  const handleBack = onBack || (() => setView('idle'));

  const currentSection = data.sections[activeSection];
  const currentVideoUrl = videoCache[currentSection?.id] || null;

  // Rotating loading messages for long generation times
  const LOADING_MESSAGES = [
    "Imagineering the scene...",
    "Rendering pixels...",
    "Composing the shot...",
    "Lighting the set...",
    "Polishing the frames...",
    "Almost ready..."
  ];

  useEffect(() => {
    if (!isGeneratingVideo) return;
    let i = 0;
    setLoadingMessage(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[i]);
    }, 4000);
    return () => clearInterval(interval);
  }, [isGeneratingVideo]);

  const handleGenerateVideo = async () => {
    if (!currentSection.visualDescription || isGeneratingVideo) return;
    
    setIsGeneratingVideo(true);
    try {
      const url = await generateVideoClip(currentSection.visualDescription, apiKey);
      setVideoCache(prev => ({ ...prev, [currentSection.id]: url }));
    } catch (e) {
      console.error(e);
      alert("Failed to generate video. Please try again.");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-slate-900">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-purple-400">Studio</span>
            <span>›</span>
            <span>Video Script</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <div>
              <p className="font-medium">Generating video script...</p>
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
        <p>No video content available</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-xl font-semibold text-white">{data.title}</h2>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>Based on {data.sourceCount} sources</span>
            {data.duration && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {data.duration}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-blue-400" />
          <span className="text-sm text-slate-400">Video Script</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Timeline Sidebar */}
        <div className="w-64 border-r border-slate-800 overflow-y-auto bg-slate-950">
          <div className="p-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Sections</p>
            <div className="space-y-1">
              {data.sections.map((section, index) => (
                <button
                  key={section.id || index}
                  onClick={() => setActiveSection(index)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    activeSection === index
                      ? 'bg-purple-900/30 border border-purple-700/50'
                      : 'hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-purple-400">{section.timestamp}</span>
                  </div>
                  <p className={`text-sm font-medium truncate ${
                    activeSection === index ? 'text-white' : 'text-slate-300'
                  }`}>
                    {section.title}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {/* Visual Preview / Video Player */}
            <div className="aspect-video bg-slate-950 rounded-xl border border-slate-700 mb-6 flex items-center justify-center overflow-hidden relative shadow-2xl">
              {currentVideoUrl ? (
                <video 
                  src={currentVideoUrl} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-cover"
                />
              ) : isGeneratingVideo ? (
                <div className="text-center p-6 flex flex-col items-center">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 border-4 border-purple-900/50 rounded-full animate-spin border-t-purple-500" />
                    <Sparkles className="w-6 h-6 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <p className="text-purple-300 font-medium animate-pulse">{loadingMessage}</p>
                  <p className="text-xs text-slate-500 mt-2">Generating video with Veo...</p>
                </div>
              ) : (
                <div className="text-center p-6">
                  <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
                    <Clapperboard className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-400 mb-4">No video generated for this section yet.</p>
                  {currentSection.visualDescription && (
                    <button
                      onClick={handleGenerateVideo}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-full text-white font-medium transition-all shadow-lg hover:shadow-purple-900/30"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Video Preview
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Current Section Details */}
            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono text-purple-400 uppercase tracking-wider">
                  {currentSection.timestamp}
                </span>
                <h3 className="text-2xl font-semibold text-white mt-1">{currentSection.title}</h3>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <h4 className="text-sm font-semibold text-purple-400 mb-2">Narration</h4>
                <p className="text-slate-300 leading-relaxed">{currentSection.narration}</p>
              </div>

              {currentSection.visualDescription && (
                <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800">
                  <h4 className="text-sm font-semibold text-blue-400 mb-2">Visual Description</h4>
                  <p className="text-sm text-slate-400">{currentSection.visualDescription}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
          disabled={activeSection === 0}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          Previous Section
        </button>
        <span className="text-sm text-slate-400">
          Section {activeSection + 1} of {data.sections.length}
        </span>
        <button
          onClick={() => setActiveSection(Math.min(data.sections.length - 1, activeSection + 1))}
          disabled={activeSection === data.sections.length - 1}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          Next Section
        </button>
      </div>
    </div>
  );
};

export default VideoViewer;

import React, { useState } from 'react';
import { SimulationResult, SimulationStatus, VisualizationStatus } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from 'recharts';
import { Code, Activity, Loader2, Zap, Presentation, Sparkles, Palette } from 'lucide-react';
import { ThemeName, ThemeConfig, THEMES } from '../utils/presentationThemes';

// =============================================================================
// Component Interfaces
// =============================================================================


interface VisualizerProps {
  result: SimulationResult | null;
  status: SimulationStatus;
  vizStatus: VisualizationStatus;
  hasSources?: boolean;
  onGeneratePresentation?: () => void;
  isGeneratingPresentation?: boolean;
  theme?: ThemeName;
}

// =============================================================================
// Theme Selector Component
// =============================================================================

interface ThemeSelectorProps {
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  position?: 'bottom-right' | 'top-right';
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ 
  currentTheme, 
  onThemeChange,
  position = 'bottom-right'
}) => {
  const positionClasses = position === 'bottom-right' 
    ? 'bottom-4 right-4' 
    : 'top-4 right-4';

  return (
    <div className={`absolute ${positionClasses} z-20 flex items-center gap-2`}>
      <Palette className="w-4 h-4 text-slate-400" />
      <select
        value={currentTheme}
        onChange={(e) => onThemeChange(e.target.value as ThemeName)}
        className="bg-slate-800/90 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg border border-slate-700 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-all shadow-lg"
      >
        {Object.keys(THEMES).map((themeName) => (
          <option key={themeName} value={themeName}>
            {themeName}
          </option>
        ))}
      </select>
    </div>
  );
};

// =============================================================================
// Themed Slide Container Component
// =============================================================================

interface ThemedSlideProps {
  theme: ThemeConfig;
  children: React.ReactNode;
  showThemeSelector?: boolean;
  currentThemeName: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}

const ThemedSlide: React.FC<ThemedSlideProps> = ({
  theme,
  children,
  showThemeSelector = true,
  currentThemeName,
  onThemeChange,
}) => {
  return (
    <div
      className="h-full w-full relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.backgroundFrom}, ${theme.backgroundTo})`,
      }}
    >
      {/* Semi-transparent overlay for text readability */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: theme.overlayColor }}
      />
      
      {/* Content safe area - centered with padding for standard slide layout */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center p-8 md:p-12 lg:p-16">
        <div 
          className="w-full max-w-4xl"
          style={{ color: theme.textColor }}
        >
          {children}
        </div>
      </div>

      {/* Theme Selector */}
      {showThemeSelector && (
        <ThemeSelector
          currentTheme={currentThemeName}
          onThemeChange={onThemeChange}
        />
      )}
    </div>
  );
};

// =============================================================================
// Main Visualizer Component
// =============================================================================

const Visualizer: React.FC<VisualizerProps> = ({ 
  result, 
  status, 
  vizStatus,
  hasSources = false,
  onGeneratePresentation,
  isGeneratingPresentation = false,
  theme: initialTheme = 'Modern Tech'
}) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'code'>('chart');
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(initialTheme);
  
  const themeConfig = THEMES[currentTheme];

  // 1. Scientist is working
  if (status === SimulationStatus.PLANNING || status === SimulationStatus.CODING || status === SimulationStatus.EXECUTING) {
    return (
      <ThemedSlide 
        theme={themeConfig}
        currentThemeName={currentTheme}
        onThemeChange={setCurrentTheme}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <Loader2 
            className="w-16 h-16 animate-spin mb-6" 
            style={{ color: themeConfig.accentColor }}
          />
          <h1 
            className="text-2xl md:text-3xl font-bold mb-4"
            style={{ 
              textShadow: themeConfig.textColor === '#ffffff' ? '0 2px 8px rgba(0,0,0,0.5)' : 'none'
            }}
          >
            Scientist Agent is Working...
          </h1>
          <p className="text-lg opacity-80">
            {status === SimulationStatus.PLANNING && "Analyzing hypothesis..."}
            {status === SimulationStatus.CODING && "Generating Python simulation..."}
            {status === SimulationStatus.EXECUTING && "Running in Sandbox (Marathon Loop)..."}
          </p>
        </div>
      </ThemedSlide>
    );
  }

  // 2. Scientist finished, Visualization Integrator is working
  if (vizStatus === VisualizationStatus.WORKING) {
    return (
      <ThemedSlide 
        theme={themeConfig}
        currentThemeName={currentTheme}
        onThemeChange={setCurrentTheme}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <Activity 
              className="w-16 h-16 animate-bounce" 
              style={{ color: themeConfig.accentColor }}
            />
            <Zap className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
          </div>
          <h1 
            className="text-2xl md:text-3xl font-bold mb-4"
            style={{ 
              textShadow: themeConfig.textColor === '#ffffff' ? '0 2px 8px rgba(0,0,0,0.5)' : 'none'
            }}
          >
            Integrator Processing
          </h1>
          <p className="text-lg opacity-80">Preparing visualization data...</p>
        </div>
      </ThemedSlide>
    );
  }

  // 3. Generating Presentation state - Show VISUALIZER: IDLE indicator
  if (isGeneratingPresentation) {
    return (
      <ThemedSlide 
        theme={themeConfig}
        currentThemeName={currentTheme}
        onThemeChange={setCurrentTheme}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-6">
            <Presentation 
              className="w-20 h-20" 
              style={{ color: themeConfig.accentColor }}
            />
          </div>
          <h1 
            className="text-2xl md:text-3xl font-bold mb-4"
            style={{ 
              textShadow: themeConfig.textColor === '#ffffff' ? '0 2px 8px rgba(0,0,0,0.5)' : 'none'
            }}
          >
            Creating Your Presentation...
          </h1>
          <p className="text-lg opacity-80 max-w-xl">
            Analyzing your documents and generating interactive slides with explanations
          </p>
          <div className="flex items-center gap-3 mt-6">
            <div 
              className="w-3 h-3 rounded-full animate-bounce" 
              style={{ backgroundColor: themeConfig.accentColor, animationDelay: '0ms' }} 
            />
            <div 
              className="w-3 h-3 rounded-full animate-bounce" 
              style={{ backgroundColor: themeConfig.accentColor, animationDelay: '150ms' }} 
            />
            <div 
              className="w-3 h-3 rounded-full animate-bounce" 
              style={{ backgroundColor: themeConfig.accentColor, animationDelay: '300ms' }} 
            />
          </div>
        </div>
      </ThemedSlide>
    );
  }

  // 4. Idle state with Generate Presentation button
  if (!result && status === SimulationStatus.IDLE) {
    return (
      <ThemedSlide 
        theme={themeConfig}
        currentThemeName={currentTheme}
        onThemeChange={setCurrentTheme}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <Activity 
            className="w-20 h-20 mb-6 opacity-40" 
            style={{ color: themeConfig.textColor }}
          />
          <h1 
            className="text-2xl md:text-3xl font-bold mb-4"
            style={{ 
              textShadow: themeConfig.textColor === '#ffffff' ? '0 2px 8px rgba(0,0,0,0.5)' : 'none'
            }}
          >
            Ready for Simulation
          </h1>
          <p className="text-base opacity-80 max-w-lg mb-8">
            Ask the Teacher (Voice Chat) to "Verify" or "Simulate" a scientific concept.
            <br />
            e.g., "Simulate the trajectory of a projectile with drag."
          </p>

          {/* Generate Presentation Button */}
          {hasSources && onGeneratePresentation && (
            <div className="flex flex-col items-center">
              <div 
                className="w-20 h-px mb-6"
                style={{ backgroundColor: themeConfig.accentColor, opacity: 0.5 }}
              />
              <p className="text-xs opacity-60 mb-4 uppercase tracking-wider font-medium">
                Or create from your sources
              </p>
              <button
                onClick={onGeneratePresentation}
                className="group flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-medium text-white shadow-lg shadow-purple-900/30 transition-all hover:shadow-xl hover:shadow-purple-900/40 hover:scale-105"
              >
                <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                  <Presentation className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-semibold">Generate Presentation</span>
                  <span className="block text-xs text-purple-200 opacity-80">Interactive slides with voice tutor</span>
                </div>
                <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              </button>
            </div>
          )}
        </div>
      </ThemedSlide>
    );
  }

  if (!result) return null;

  // 5. Results View with Charts/Code
  return (
    <div className="h-full flex flex-col bg-slate-900 relative">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-400" />
          Live Lab Results
        </h3>
        <div className="flex items-center gap-4">
          {/* Theme Selector inline for results view */}
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-slate-400" />
            <select
              value={currentTheme}
              onChange={(e) => setCurrentTheme(e.target.value as ThemeName)}
              className="bg-slate-900 text-slate-300 text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {Object.keys(THEMES).map((themeName) => (
                <option key={themeName} value={themeName}>
                  {themeName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'chart' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Chart
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'code' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Code
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        {activeTab === 'chart' ? (
          <div className="flex-1 w-full min-h-0 bg-slate-800/50 rounded-xl p-4 border border-slate-700 relative">
            <ResponsiveContainer width="100%" height="100%">
              {result.chartType === 'line' ? (
                <LineChart data={result.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey={result.xAxisKey} stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                    itemStyle={{ color: '#60a5fa' }}
                  />
                  <Line type="monotone" dataKey={result.yAxisKey} stroke={themeConfig.accentColor} strokeWidth={2} dot={false} />
                </LineChart>
              ) : result.chartType === 'bar' ? (
                 <BarChart data={result.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey={result.xAxisKey} stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                    />
                    <Bar dataKey={result.yAxisKey} fill={themeConfig.accentColor} />
                 </BarChart>
              ) : (
                <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey={result.xAxisKey} type="number" stroke="#94a3b8" name={result.xAxisKey} fontSize={12} />
                    <YAxis dataKey={result.yAxisKey} type="number" stroke="#94a3b8" name={result.yAxisKey} fontSize={12} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}/>
                    <Scatter name="Data" data={result.data} fill={themeConfig.accentColor} />
                </ScatterChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex-1 w-full min-h-0 bg-slate-950 rounded-xl p-4 border border-slate-800 overflow-auto custom-scrollbar">
             <div className="flex items-center gap-2 mb-2 text-slate-500 text-xs font-mono">
                <Code className="w-4 h-4" />
                PYTHON SOURCE (GENERATED)
             </div>
             <pre className="font-mono text-sm text-blue-300 leading-relaxed whitespace-pre-wrap">
                {result.code}
             </pre>
          </div>
        )}

        <div className="mt-4 p-4 bg-slate-800/30 rounded-lg border border-slate-800">
            <h4 className="text-sm font-semibold text-purple-400 mb-1">Analysis</h4>
            <p className="text-sm text-slate-300 leading-relaxed">
                {result.explanation}
            </p>
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
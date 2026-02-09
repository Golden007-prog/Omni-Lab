import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audio';

// Tool definition for the "Scientist"
const simulationTool: FunctionDeclaration = {
  name: "run_simulation",
  description: "Runs a scientific simulation using Python to verify a hypothesis. Use this when the user asks to 'prove', 'simulate', 'verify', or 'graph' a physics/math concept.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      hypothesis: { 
        type: Type.STRING, 
        description: "The scientific hypothesis or scenario to simulate (e.g., 'projectile motion with drag', 'pendulum period vs length')." 
      }
    },
    required: ["hypothesis"]
  }
};

// Connection status for UI indicators
export type VoiceStatus = 'disconnected' | 'connecting' | 'listening' | 'speaking' | 'processing';

interface VoiceChatProps {
  apiKey: string;
  onSimulationRequest: (hypothesis: string) => Promise<string>;
  onStatusChange?: (status: VoiceStatus) => void;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ apiKey, onSimulationRequest, onStatusChange }) => {
  const [status, setStatus] = useState<VoiceStatus>('disconnected');
  const [audioLevel, setAudioLevel] = useState(0);

  // Use refs for values accessed in callbacks to avoid stale closures
  const isMutedRef = useRef(false);
  const [isMutedUI, setIsMutedUI] = useState(false);
  const onSimulationRequestRef = useRef(onSimulationRequest);
  
  // Keep the ref updated
  useEffect(() => {
    onSimulationRequestRef.current = onSimulationRequest;
  }, [onSimulationRequest]);

  // Audio Contexts
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Playback Queue
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isPlayingRef = useRef(false);

  // Gemini Live Session
  const sessionRef = useRef<any>(null);
  const statusRef = useRef<VoiceStatus>('disconnected');

  // Update parent when status changes
  const updateStatus = useCallback((newStatus: VoiceStatus) => {
    statusRef.current = newStatus;
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  useEffect(() => {
    return () => {
      stopSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleServerMessage = async (message: LiveServerMessage, session: any) => {
    // 1. Handle Audio Output from the model
    const parts = message.serverContent?.modelTurn?.parts;
    if (parts) {
      for (const part of parts) {
        const audioData = part.inlineData?.data;
        if (audioData && outputContextRef.current) {
          const ctx = outputContextRef.current;
          
          if (!isPlayingRef.current) {
            isPlayingRef.current = true;
            updateStatus('speaking');
          }
          
          nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
          
          try {
            const buffer = await decodeAudioData(base64ToUint8Array(audioData), ctx);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(source);
            source.onended = () => {
              sourcesRef.current.delete(source);
              if (sourcesRef.current.size === 0) {
                isPlayingRef.current = false;
                if (statusRef.current !== 'processing') {
                  updateStatus('listening');
                }
              }
            };
          } catch (e) {
            console.error("Audio decode error", e);
          }
        }
      }
    }

    // 2. Handle turn completion
    if (message.serverContent?.turnComplete) {
      if (statusRef.current !== 'processing') {
        updateStatus('listening');
      }
    }

    // 3. Handle Tool Calls (Scientist Agent)
    const toolCall = message.toolCall;
    if (toolCall) {
      updateStatus('processing');
      
      for (const fc of toolCall.functionCalls) {
        if (fc.name === 'run_simulation') {
          const hypothesis = (fc.args as any).hypothesis;
          console.log('Scientist Agent called with:', hypothesis);
          
          // Execute the Scientist Agent logic
          try {
            const resultText = await onSimulationRequestRef.current(hypothesis);
            
            // Send response back to Live model
            session.sendToolResponse({
              functionResponses: [{
                id: fc.id,
                name: fc.name,
                response: { result: resultText }
              }]
            });
          } catch (err) {
            console.error('Simulation error:', err);
            session.sendToolResponse({
              functionResponses: [{
                id: fc.id,
                name: fc.name,
                response: { result: 'Simulation failed. Please try again.' }
              }]
            });
          }
          
          updateStatus('listening');
        }
      }
    }

    // 4. Handle Interruptions
    if (message.serverContent?.interrupted) {
      sourcesRef.current.forEach(s => s.stop());
      sourcesRef.current.clear();
      nextStartTimeRef.current = 0;
      isPlayingRef.current = false;
      updateStatus('listening');
    }
  };

  const startSession = async () => {
    try {
      updateStatus('connecting');

      // Initialize Audio Contexts (must be after user gesture)
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // Resume audio contexts (required for autoplay policy)
      await inputContextRef.current.resume();
      await outputContextRef.current.resume();

      const ai = new GoogleGenAI({ apiKey });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      // Connect with callbacks (this is the correct API pattern)
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [simulationTool] }],
          systemInstruction: `You are "Omni", the Teacher interface of the Omni-Lab platform.
You are a helpful, conversational tutor who makes learning engaging and fun.

CRITICAL INSTRUCTIONS:
1. If the user asks a general question, explain it verbally with clear, simple language.
2. If the user asks to "PROVE", "SIMULATE", "VISUALIZE", "CALCULATE", or "TEST" a concept, you MUST call the 'run_simulation' tool immediately.
3. Say "Let me ask the Scientist Agent to run a simulation for that." and then call the tool.
4. Wait for the tool result before continuing.
5. When the tool returns, describe what the simulation shows.

Be enthusiastic and encouraging! Use analogies to explain complex concepts.`
        },
        callbacks: {
          onopen: () => {
            console.log('Live session opened');
            updateStatus('listening');
            // Setup audio input once connected
            setupAudioInput(stream, sessionPromise);
          },
          onmessage: (msg: LiveServerMessage) => {
            sessionPromise.then(session => {
              handleServerMessage(msg, session);
            });
          },
          onclose: (event: any) => {
            console.log('Live session closed', event);
            updateStatus('disconnected');
          },
          onerror: (err: any) => {
            console.error('Live session error:', err);
            updateStatus('disconnected');
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error("Failed to start session", e);
      updateStatus('disconnected');
      alert(`Failed to start Gemini Live session: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const setupAudioInput = (stream: MediaStream, sessionPromise: Promise<any>) => {
    if (!inputContextRef.current) return;
    
    const source = inputContextRef.current.createMediaStreamSource(stream);
    const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      // Use ref instead of state to avoid stale closure
      if (isMutedRef.current) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Simple audio level visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
      const level = Math.min(100, (sum / inputData.length) * 500);
      setAudioLevel(level);

      // Send audio to Gemini
      sessionPromise.then(session => {
        try {
          const blob = createPcmBlob(inputData);
          session.sendRealtimeInput({ media: blob });
        } catch (err) {
          // Silently ignore send errors during disconnect
        }
      }).catch(() => {
        // Session not ready yet
      });
    };

    source.connect(processor);
    processor.connect(inputContextRef.current.destination);
    processorRef.current = processor;
  };

  const toggleMute = () => {
    isMutedRef.current = !isMutedRef.current;
    setIsMutedUI(isMutedRef.current);
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => {
        try {
          session.close();
        } catch (e) {
          // Ignore close errors
        }
      }).catch(() => {});
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close().catch(() => {});
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close().catch(() => {});
      outputContextRef.current = null;
    }
    sourcesRef.current.clear();
    updateStatus('disconnected');
  };

  const isStreaming = status !== 'disconnected' && status !== 'connecting';
  const isConnecting = status === 'connecting';

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        {/* Abstract Background Animation */}
        <div className={`absolute inset-0 bg-gradient-to-b from-purple-500/10 to-blue-500/10 transition-opacity duration-1000 ${isStreaming ? 'opacity-100' : 'opacity-0'}`} />
        
        {/* Main Interaction Orb */}
        <div className="relative z-10">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
            isConnecting ? 'bg-slate-700 animate-pulse' :
            status === 'speaking' ? 'bg-gradient-to-tr from-purple-600 to-pink-600 shadow-[0_0_50px_rgba(168,85,247,0.5)]' :
            status === 'processing' ? 'bg-gradient-to-tr from-yellow-600 to-orange-600 shadow-[0_0_50px_rgba(234,179,8,0.5)]' :
            isStreaming ? 'bg-gradient-to-tr from-purple-600 to-blue-600 shadow-[0_0_50px_rgba(124,58,237,0.5)]' : 
            'bg-slate-800'
          }`}>
            {isConnecting ? (
              <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
            ) : isStreaming ? (
              <div className="space-y-1 flex gap-1 items-end h-16">
                {[1,2,3,4,5].map(i => (
                  <div key={i} 
                    className="w-2 bg-white/80 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(20, (status === 'speaking' ? 60 : audioLevel) + Math.random() * 20)}%` }}
                  />
                ))}
              </div>
            ) : (
              <MicOff className="w-10 h-10 text-slate-500" />
            )}
          </div>
          
          {/* Status Ring */}
          {status === 'speaking' && (
            <div className="absolute inset-0 rounded-full border-4 border-purple-400 animate-ping opacity-50" />
          )}
          {status === 'processing' && (
            <div className="absolute inset-0 rounded-full border-4 border-yellow-400 animate-pulse opacity-50" />
          )}
        </div>

        <h2 className="mt-6 text-xl font-semibold text-white z-10">
          {status === 'disconnected' && 'Live Mode'}
          {status === 'connecting' && 'Connecting...'}
          {status === 'listening' && 'Listening...'}
          {status === 'speaking' && 'Speaking...'}
          {status === 'processing' && 'Running Simulation...'}
        </h2>
        <p className="mt-2 text-sm text-slate-400 max-w-xs z-10">
          {status === 'disconnected' && 'Connect for real-time voice interaction.'}
          {status === 'connecting' && 'Setting up audio connection...'}
          {status === 'listening' && 'Speak naturally. I can run simulations.'}
          {status === 'speaking' && 'The tutor is responding...'}
          {status === 'processing' && 'The Scientist Agent is working...'}
        </p>
      </div>

      {/* Controls */}
      <div className="p-6 bg-slate-950 border-t border-slate-800 flex justify-center gap-4 z-20">
        {status === 'disconnected' ? (
          <button 
            onClick={startSession}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium transition-all shadow-lg shadow-blue-900/20 text-sm"
          >
            <Mic className="w-4 h-4" />
            Start Voice
          </button>
        ) : isConnecting ? (
          <button 
            disabled
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-700 text-slate-400 rounded-full font-medium cursor-not-allowed text-sm"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </button>
        ) : (
          <>
            <button 
              onClick={toggleMute}
              className={`p-3 rounded-full transition-all ${isMutedUI ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
            >
              {isMutedUI ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button 
              onClick={stopSession}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-full font-medium transition-all text-sm"
            >
              End
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceChat;

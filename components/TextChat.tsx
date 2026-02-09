import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Send, Bot, User, Loader2, Sparkles, Globe } from 'lucide-react';
import { ChatMessage, SourceFile } from '../types';
import { registerChat, unregisterChat } from '../services/chatBridge';

interface TextChatProps {
  apiKey: string;
  sources: SourceFile[];
  isWebSearchEnabled: boolean;
  onSimulationRequest: (hypothesis: string) => Promise<string>;
  disabled?: boolean;
}

export interface TextChatHandle {
  sendMessage: (text: string) => void;
}

const TextChat = forwardRef<TextChatHandle, TextChatProps>(
  ({ apiKey, sources, isWebSearchEnabled, onSimulationRequest, disabled }, ref) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
        id: 'welcome',
        role: 'model' as any,
        text: "Hello! I am your Empirical Tutor. You can upload documents for me to analyze, ask me to verify scientific concepts through simulation, or use the Studio to generate study aids.",
        timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle incoming explain requests from chatBridge
  const handleIncomingExplain = useCallback((text: string) => {
    console.log("[TextChat] Incoming explain request:", text.substring(0, 80));
    processMessage(text);
  }, [apiKey, sources, isWebSearchEnabled, disabled]);

  // Register with chatBridge on mount
  useEffect(() => {
    registerChat(handleIncomingExplain);
    console.log("[TextChat] Registered with chatBridge");
    
    return () => {
      unregisterChat();
      console.log("[TextChat] Unregistered from chatBridge");
    };
  }, [handleIncomingExplain]);

  const processMessage = async (text: string) => {
    if (!text.trim() || !apiKey || disabled) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user' as any,
      text: text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Prepare Tools
      const tools: any[] = [
        {
             functionDeclarations: [{
                name: "run_simulation",
                description: "Runs a scientific simulation. Call this when asked to 'simulate', 'verify', 'prove', 'graph', or 'plot' a concept.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                    hypothesis: { type: Type.STRING, description: "The scientific hypothesis to simulate." }
                    },
                    required: ["hypothesis"]
                }
             }]
        }
      ];

      if (isWebSearchEnabled) {
          tools.push({ googleSearch: {} });
      }

      // Prepare Content with Sources
      const contents = [];
      const parts: any[] = [{ text: userMsg.text }];
      
      sources.forEach(source => {
        parts.push({
            inlineData: {
                mimeType: source.type,
                data: source.data
            }
        });
      });

      // Simple history reconstruction
      const recentHistory = messages.slice(-4).map(m => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.text }]
      }));

      const systemInstruction = `You are a helpful Teacher. 
      Use the provided sources to answer questions or generate content (like quizzes, summaries, or scripts).
      If the user wants to SEE a concept in action (graph, simulation), call the 'run_simulation' tool.
      Always list sources if you used Google Search.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: [...recentHistory, { role: 'user', parts }],
        config: {
            systemInstruction,
            tools
        }
      });

      // Handle Response
      let responseText = response.text || "";
      const toolCalls = response.functionCalls;
      let toolResultText = "";
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

      if (toolCalls && toolCalls.length > 0) {
        for (const call of toolCalls) {
            if (call.name === 'run_simulation') {
                const hypothesis = (call.args as any).hypothesis;
                setMessages(prev => [...prev, {
                    id: Date.now().toString() + 'tool',
                    role: 'model' as any,
                    text: `Initialising Scientist Agent to verify: "${hypothesis}"...`,
                    timestamp: new Date(),
                    isToolCall: true
                }]);
                
                toolResultText = await onSimulationRequest(hypothesis);
                responseText += `\n\n[Scientist Agent]: ${toolResultText}`;
            }
        }
      }

      const modelMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model' as any,
        text: responseText || "I processed that, but have no text response (possibly only performed an action).",
        timestamp: new Date(),
        groundingUrls: groundingMetadata?.groundingChunks
            ?.map((c: any) => c.web?.uri)
            .filter((u: any) => !!u) as string[]
      };

      setMessages(prev => [...prev, modelMsg]);

    } catch (error: any) {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model' as any,
            text: `Error: ${error.message}. Please try again.`,
            timestamp: new Date()
        }]);
    } finally {
        setIsLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    sendMessage: (text: string) => {
        processMessage(text);
    }
  }));

  const handleSend = () => {
    processMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-purple-600'}`}>
                    {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                </div>
                <div className={`flex flex-col max-w-[85%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`
                        px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
                        ${msg.role === 'user' 
                            ? 'bg-slate-800 text-white rounded-br-none border border-slate-700' 
                            : msg.isToolCall 
                                ? 'bg-slate-900/50 border border-purple-500/30 text-purple-300 italic'
                                : 'bg-slate-950 border border-slate-800 text-slate-300 rounded-bl-none'}
                    `}>
                        {msg.text}
                    </div>
                    {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {msg.groundingUrls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-blue-400 px-2 py-1 rounded-full border border-slate-700 transition-colors">
                                    <Globe className="w-3 h-3" />
                                    {new URL(url).hostname}
                                </a>
                            ))}
                        </div>
                    )}
                    <span className="text-[10px] text-slate-600 px-1">
                        {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
            </div>
        ))}
        {isLoading && (
             <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                </div>
            </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-slate-950 border-t border-slate-800">
        <div className="relative">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={sources.length > 0 ? "Ask a question about the uploaded sources..." : "Message the Empirical Tutor..."}
                className={`w-full bg-slate-900 text-white placeholder-slate-500 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 border border-slate-800 resize-none h-12 max-h-32 ${
                  disabled ? "opacity-60 cursor-not-allowed" : ""
                }`}
            />
            <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim() || disabled}
                className="absolute right-2 top-2 p-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-lg transition-colors"
            >
                <Send className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
});

export default TextChat;

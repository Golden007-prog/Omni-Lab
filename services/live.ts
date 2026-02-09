import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

// Audio helpers
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class LiveClient {
  private ai: GoogleGenAI;
  private audioContext: AudioContext | null = null;
  private inputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private nextStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private sessionPromise: Promise<any> | null = null;
  
  public onTranscriptUpdate: ((text: string, isUser: boolean) => void) | null = null;
  public onStatusChange: ((status: string) => void) | null = null;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect() {
    this.onStatusChange?.('Connecting...');
    
    try {
      // Setup Audio
      // Create contexts only when connecting to avoid keeping them open unnecessarily
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: this.handleOpen.bind(this),
          onmessage: this.handleMessage.bind(this),
          onclose: () => this.onStatusChange?.('Disconnected'),
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            this.onStatusChange?.('Error');
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: "You are a friendly, concise tutor named Omni. You help users verify scientific concepts and learn from their documents."
        }
      };

      // Initialize session using promise pattern
      this.sessionPromise = this.ai.live.connect(config);
      await this.sessionPromise;
    } catch (e) {
      console.error("Failed to connect:", e);
      this.disconnect(); // Clean up resources if connection fails
      throw e;
    }
  }

  private handleOpen() {
    this.onStatusChange?.('Listening');
    if (!this.inputAudioContext || !this.stream) return;

    this.source = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Convert Float32 to Int16 PCM base64
      const l = inputData.length;
      const int16 = new Int16Array(l);
      for (let i = 0; i < l; i++) {
        int16[i] = inputData[i] * 32768;
      }
      
      // Manual encoding
      let binary = '';
      const bytes = new Uint8Array(int16.buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);

      // Use the promise to send data only when ready
      if (this.sessionPromise) {
        this.sessionPromise.then(session => {
          session.sendRealtimeInput({
            media: {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Data
            }
          });
        });
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    // 1. Handle Audio Output
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.audioContext) {
      this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
      
      const audioBytes = base64ToUint8Array(audioData);
      const audioBuffer = await decodeAudioData(audioBytes, this.audioContext, 24000, 1);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.addEventListener('ended', () => this.activeSources.delete(source));
      source.start(this.nextStartTime);
      this.activeSources.add(source);
      
      this.nextStartTime += audioBuffer.duration;
    }

    // 2. Handle Interruption
    if (message.serverContent?.interrupted) {
      this.activeSources.forEach(s => {
        try { s.stop(); } catch (e) { /* ignore if already stopped */ }
      });
      this.activeSources.clear();
      this.nextStartTime = 0;
      this.onStatusChange?.('Interrupted');
      setTimeout(() => this.onStatusChange?.('Listening'), 1000);
    }
  }

  disconnect() {
    // Resolve session usage
    if (this.sessionPromise) {
      this.sessionPromise.then(session => {
         // session cleanup if needed
      }).catch(() => {});
      this.sessionPromise = null;
    }

    // Stop all audio sources
    this.activeSources.forEach(s => {
      try { s.stop(); } catch (e) { /* ignore */ }
    });
    this.activeSources.clear();
    
    // Disconnect audio nodes
    try { this.processor?.disconnect(); } catch (e) {}
    try { this.source?.disconnect(); } catch (e) {}
    
    // Stop microphone stream
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    
    // Close audio contexts safely
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) { console.warn("Error closing audioContext:", e); }
    }
    this.audioContext = null;

    if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
      try { this.inputAudioContext.close(); } catch (e) { console.warn("Error closing inputAudioContext:", e); }
    }
    this.inputAudioContext = null;
    
    this.onStatusChange?.('Idle');
  }
}
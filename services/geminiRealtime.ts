/**
 * Gemini Realtime Voice client
 * Based on the proven live.ts LiveClient pattern.
 * Uses @google/genai SDK Live API with native audio model.
 *
 * Audio playback is handled internally — callers only receive callbacks.
 */
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import { getApiKey } from "./geminiConfig";

// ── Audio helpers ────────────────────────────────────────────────────────────

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
  numChannels: number
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

// ── Types ────────────────────────────────────────────────────────────────────

export type GeminiVoiceHandle = {
  stop: () => void;
  sendText: (text: string) => void;
  muteMic: () => void;
  unmuteMic: () => void;
  isMuted: () => boolean;
  /** Stop all queued/playing audio immediately (for interruptions) */
  clearAudio: () => void;
};

export type VoiceCallbacks = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: unknown) => void;
  /** Called when Gemini sends text (for subtitles) */
  onText?: (text: string) => void;
  /** Called when Gemini completes its turn (finished speaking) */
  onTurnComplete?: () => void;
  /** Called when the API detects user interrupted the model */
  onInterrupted?: () => void;
  /** Called when the tutor starts producing audio */
  onSpeakingStart?: () => void;
  /** Called when all queued audio has finished playing */
  onSpeakingStop?: () => void;
  /** Called when local VAD detects user speech activity */
  onUserActivity?: () => void;
};

// ── System instructions ──────────────────────────────────────────────────────

const DEFAULT_SYSTEM_INSTRUCTION = `You are "Omni", the Empirical Tutor.
Speak clearly and keep answers focused on the current slide explanation or the student's question.
When a slide explanation is provided, explain it in a concise, helpful way.
Be enthusiastic and encouraging! Use analogies to explain complex concepts.`;

const AUTO_EXPLAIN_SYSTEM_INSTRUCTION = `You are "Omni", a friendly and engaging teacher giving a live lecture.
You are explaining slides to a student one at a time.

RULES:
- Explain the slide content clearly and conversationally, like a real teacher in a classroom
- Use analogies and examples to make concepts easy to understand
- Keep each slide explanation to about 30-60 seconds of speaking
- Do NOT say "next slide" or reference slide numbers
- If a student interrupts with a question, answer it helpfully and concisely
- After answering a question, wait for the student to say "continue", "next", or "ok" before resuming
- Be enthusiastic and encouraging
- When given slide content, immediately start explaining it`;

// ── Main entry point ─────────────────────────────────────────────────────────

export async function startGeminiVoice(
  callbacks?: VoiceCallbacks,
  options?: {
    systemInstruction?: string;
    autoExplainMode?: boolean;
  }
): Promise<GeminiVoiceHandle> {
  console.log("[GeminiVoice] Starting... (autoExplainMode:", options?.autoExplainMode, ")");

  // 1. API key (direct — no server round-trip)
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // 2. Audio contexts
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 24000,
  });
  const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 16000,
  });

  // 3. Microphone
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  console.log("[GeminiVoice] Microphone granted");

  // 4. Internal state
  let muted = false;
  let stopped = false;
  let nextStartTime = 0;
  let isSpeaking = false;
  const activeSources = new Set<AudioBufferSourceNode>();

  let processor: ScriptProcessorNode | null = null;
  let micSource: MediaStreamAudioSourceNode | null = null;

  // Determine system instruction
  const systemInstruction =
    options?.systemInstruction ||
    (options?.autoExplainMode
      ? AUTO_EXPLAIN_SYSTEM_INSTRUCTION
      : DEFAULT_SYSTEM_INSTRUCTION);

  console.log("[GeminiVoice] System instruction mode:", options?.autoExplainMode ? "AUTO_EXPLAIN" : "DEFAULT");

  // ── clearAudio — stop all queued/playing audio ─────────────────────────

  const clearAudio = () => {
    console.log("[GeminiVoice] Clearing audio queue, active sources:", activeSources.size);
    activeSources.forEach((s) => {
      try { s.stop(); } catch { /* already stopped */ }
    });
    activeSources.clear();
    nextStartTime = 0;
    if (isSpeaking) {
      isSpeaking = false;
      callbacks?.onSpeakingStop?.();
    }
  };

  // ── Handle incoming messages ───────────────────────────────────────────

  const handleMessage = async (message: LiveServerMessage) => {
    // 1. Handle Interruption (API-level — user spoke over the model)
    if (message.serverContent?.interrupted) {
      console.log("[GeminiVoice] ⚡ Interrupted by user (API-level)");
      clearAudio();
      callbacks?.onInterrupted?.();
      return;
    }

    // 2. Handle turn complete
    if (message.serverContent?.turnComplete) {
      console.log("[GeminiVoice] ✓ Turn complete");
      callbacks?.onTurnComplete?.();
      return;
    }

    // 3. Handle model turn parts (audio + text)
    const parts = message.serverContent?.modelTurn?.parts;
    if (!parts) return;

    for (const part of parts) {
      // Text (for subtitles)
      if (part.text) {
        console.log("[GeminiVoice] 📝 Text chunk:", part.text.substring(0, 80));
        callbacks?.onText?.(part.text);
      }

      // Audio
      const audioData = part.inlineData?.data;
      if (audioData && audioContext) {
        // Mark as speaking on first audio chunk
        if (!isSpeaking) {
          isSpeaking = true;
          console.log("[GeminiVoice] 🔊 Audio received from Gemini");
          console.log("[GeminiVoice] 🔊 Speaking started");
          callbacks?.onSpeakingStart?.();
        }

        try {
          const audioBytes = base64ToUint8Array(audioData);
          const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);

          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);

          nextStartTime = Math.max(nextStartTime, audioContext.currentTime);
          source.start(nextStartTime);
          activeSources.add(source);
          nextStartTime += audioBuffer.duration;

          source.addEventListener("ended", () => {
            activeSources.delete(source);
            // When all audio finished playing, mark as not speaking
            if (activeSources.size === 0 && isSpeaking) {
              isSpeaking = false;
              console.log("[GeminiVoice] 🔇 Speech ended (all audio done)");
              callbacks?.onSpeakingStop?.();
            }
          });
        } catch (err) {
          console.error("[GeminiVoice] Audio decode error:", err);
        }
      }
    }
  };

  // ── Connect to Gemini Live ─────────────────────────────────────────────

  console.log("[GeminiVoice] Connecting to Gemini Live API...");

  const sessionPromise = ai.live.connect({
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    callbacks: {
      onopen: () => {
        console.log("[GeminiVoice] ✓ WebSocket opened");
        callbacks?.onOpen?.();

        // Start streaming mic audio once connected
        if (!inputAudioContext || !stream) return;
        micSource = inputAudioContext.createMediaStreamSource(stream);
        processor = inputAudioContext.createScriptProcessor(4096, 1, 1);

        // Local VAD state
        let lastActivityTime = 0;
        const VAD_THRESHOLD = 0.02; // Threshold for speech detection (0-1)

        processor.onaudioprocess = (e) => {
          if (stopped || muted) return;

          const inputData = e.inputBuffer.getChannelData(0);

          // 1. Local VAD Check
          let sum = 0;
          // Subsample for performance
          for (let i = 0; i < inputData.length; i += 4) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / (inputData.length / 4));

          if (rms > VAD_THRESHOLD) {
            const now = Date.now();
            // Throttle detection to once per 500ms
            if (now - lastActivityTime > 500) {
              lastActivityTime = now;
              callbacks?.onUserActivity?.();
            }
          }

          // 2. Encode and Send
          // Convert Float32 → Int16 PCM → base64
          const l = inputData.length;
          const int16 = new Int16Array(l);
          for (let i = 0; i < l; i++) {
            int16[i] = inputData[i] * 32768;
          }
          let binary = "";
          const bytes = new Uint8Array(int16.buffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Data = btoa(binary);

          // Send via session promise (safe even if session isn't fully ready yet)
          sessionPromise
            .then((session) => {
              session.sendRealtimeInput({
                media: {
                  mimeType: "audio/pcm;rate=16000",
                  data: base64Data,
                },
              });
            })
            .catch(() => {
              /* ignore send errors during disconnect */
            });
        };

        micSource.connect(processor);
        processor.connect(inputAudioContext.destination);
        console.log("[GeminiVoice] 🎙️ Audio streaming started");
      },
      onmessage: handleMessage,
      onclose: () => {
        console.log("[GeminiVoice] WebSocket closed");
        callbacks?.onClose?.();
      },
      onerror: (err: unknown) => {
        console.error("[GeminiVoice] WebSocket error:", err);
        callbacks?.onError?.(err);
      },
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      },
      systemInstruction,
    },
  });

  // Wait for session
  const session = await sessionPromise;
  console.log("[GeminiVoice] ✓ Session ready");

  // ── Handle: stop ───────────────────────────────────────────────────────

  const stop = () => {
    if (stopped) return;
    stopped = true;
    console.log("[GeminiVoice] Stopping...");

    // Stop queued audio
    clearAudio();

    // Disconnect audio nodes
    try { processor?.disconnect(); } catch { /* */ }
    try { micSource?.disconnect(); } catch { /* */ }

    // Stop mic stream
    stream.getTracks().forEach((t) => t.stop());

    // Close audio contexts safely
    if (audioContext.state !== "closed") {
      audioContext.close().catch((e) => console.warn("[GeminiVoice] audioContext close:", e));
    }
    if (inputAudioContext.state !== "closed") {
      inputAudioContext.close().catch((e) => console.warn("[GeminiVoice] inputAudioContext close:", e));
    }

    // Close session
    try { session.close(); } catch { /* */ }

    console.log("[GeminiVoice] ✓ Stopped");
  };

  // ── Handle: sendText ──────────────────────────────────────────────────

  const sendText = (text: string) => {
    if (stopped) {
      console.warn("[GeminiVoice] Cannot sendText — session is stopped");
      return;
    }
    try {
      const preview = text.substring(0, 120) + (text.length > 120 ? "..." : "");
      console.log("[GeminiVoice] 📤 Sending explanation request:", preview);

      // Send as client content turn with proper format for Gemini Live API
      session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      });
      console.log("[GeminiVoice] ✓ Client content sent successfully");
    } catch (err) {
      console.error("[GeminiVoice] sendText error:", err);
    }
  };

  // ── Handle: mic controls ──────────────────────────────────────────────

  const muteMic = () => {
    muted = true;
    console.log("[GeminiVoice] 🔇 Mic muted");
  };
  const unmuteMic = () => {
    muted = false;
    console.log("[GeminiVoice] 🎙️ Mic unmuted");
  };
  const isMicMuted = () => muted;

  return { stop, sendText, muteMic, unmuteMic, isMuted: isMicMuted, clearAudio };
}

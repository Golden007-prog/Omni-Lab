/**
 * Audio Utilities
 * Handles audio encoding/decoding and Text-to-Speech
 */

import { Blob } from '@google/genai';

// =============================================================================
// AUDIO ENCODING/DECODING
// =============================================================================

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: arrayBufferToBase64(int16.buffer),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
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

// =============================================================================
// TEXT-TO-SPEECH (Browser-based fallback)
// =============================================================================

/**
 * Current speech state - for tracking and cancellation
 */
let currentUtterance: SpeechSynthesisUtterance | null = null;
let isSpeaking = false;

/**
 * Speak text using browser's built-in speech synthesis
 * Automatically cancels any previous speech before starting new one
 * 
 * @param text - The text to speak
 * @param options - Optional configuration
 * @returns Promise that resolves when speech ends (or is cancelled)
 */
export function speak(
  text: string,
  options: {
    rate?: number;      // Speed: 0.1 to 10, default 1
    pitch?: number;     // Pitch: 0 to 2, default 1
    volume?: number;    // Volume: 0 to 1, default 1
    voice?: string;     // Voice name to use
    lang?: string;      // Language code, e.g., 'en-US'
  } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check for speech synthesis support
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser');
      resolve();
      return;
    }

    // Cancel any ongoing speech first
    cancelSpeech();

    // Handle empty text
    if (!text || text.trim().length === 0) {
      resolve();
      return;
    }

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;
    isSpeaking = true;

    // Apply options
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;
    utterance.lang = options.lang ?? 'en-US';

    // Set voice if specified
    if (options.voice) {
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => 
        v.name.toLowerCase().includes(options.voice!.toLowerCase())
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    // Event handlers
    utterance.onend = () => {
      isSpeaking = false;
      currentUtterance = null;
      resolve();
    };

    utterance.onerror = (event) => {
      isSpeaking = false;
      currentUtterance = null;
      // Don't reject on 'interrupted' or 'cancelled' - these are expected
      if (event.error === 'interrupted' || event.error === 'canceled') {
        resolve();
      } else {
        console.error('Speech synthesis error:', event.error);
        resolve(); // Still resolve to not break the flow
      }
    };

    // Start speaking
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Cancel any ongoing speech immediately
 */
export function cancelSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isSpeaking = false;
  currentUtterance = null;
}

/**
 * Pause current speech
 */
export function pauseSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.pause();
  }
}

/**
 * Resume paused speech
 */
export function resumeSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.resume();
  }
}

/**
 * Check if currently speaking
 */
export function isCurrentlySpeaking(): boolean {
  return isSpeaking || (typeof window !== 'undefined' && window.speechSynthesis?.speaking);
}

/**
 * Get available voices
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) {
    return [];
  }
  return window.speechSynthesis.getVoices();
}

/**
 * Wait for voices to load (they load async in some browsers)
 */
export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Wait for voices to load
    const handleVoicesChanged = () => {
      voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve(voices);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

    // Timeout fallback
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 1000);
  });
}

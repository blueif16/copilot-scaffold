/**
 * Gemini Live API Voice Client
 * Handles bidirectional audio streaming with Gemini Flash
 */

import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export interface VoiceSessionConfig {
  onAudioResponse: (audioData: string) => void;
  onTextResponse?: (text: string) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export class GeminiVoiceSession {
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private isConnecting = false;
  private isClosed = false;

  constructor(private config: VoiceSessionConfig) {}

  async connect() {
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      console.log("[Gemini Voice] Connection already in progress");
      return false;
    }

    // Don't reconnect if already connected
    if (this.session && !this.isClosed) {
      console.log("[Gemini Voice] Already connected");
      return true;
    }

    this.isConnecting = true;
    this.isClosed = false;

    try {
      // Get ephemeral token from our API route
      const response = await fetch("/api/voice", { method: "POST" });
      const { token } = await response.json();

      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      // Create client with ephemeral token
      const ai = new GoogleGenAI({
        apiKey: token,
        apiVersion: "v1alpha",
      });

      // Connect to Live API
      this.session = await ai.live.connect({
        model: "gemini-live-2.5-flash-preview",
        callbacks: {
          onopen: () => {
            console.log("[Gemini Voice] Session opened");
            this.isClosed = false;
            this.config.onOpen?.();
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleServerMessage(message);
          },
          onerror: (e: ErrorEvent) => {
            console.error("[Gemini Voice] Error:", e.message);
            this.config.onError?.(new Error(e.message));
          },
          onclose: (e: CloseEvent) => {
            console.log("[Gemini Voice] Session closed:", e.reason);
            this.isClosed = true;
            this.session = null;
            this.config.onClose?.();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede", // Friendly voice for kids
              },
            },
          },
        },
      });

      // Initialize Web Audio API for playback
      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
      }

      this.isConnecting = false;
      return true;
    } catch (error) {
      console.error("[Gemini Voice] Connection failed:", error);
      this.isConnecting = false;
      this.isClosed = true;
      this.session = null;
      this.config.onError?.(error as Error);
      return false;
    }
  }

  private handleServerMessage(message: LiveServerMessage) {
    // Extract audio data
    const audioData =
      message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;

    if (audioData) {
      this.config.onAudioResponse(audioData);
      this.playAudio(audioData);
    }

    // Extract text (if any)
    const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
    if (text) {
      this.config.onTextResponse?.(text);
    }
  }

  private async playAudio(base64Audio: string) {
    if (!this.audioContext) return;

    try {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to AudioBuffer
      const audioBuffer = this.audioContext.createBuffer(
        1, // mono
        bytes.length / 2, // 16-bit = 2 bytes per sample
        24000 // 24kHz sample rate
      );

      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(bytes.buffer);

      for (let i = 0; i < channelData.length; i++) {
        // Read 16-bit PCM samples
        channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
      }

      this.audioQueue.push(audioBuffer);

      if (!this.isPlaying) {
        this.playNextInQueue();
      }
    } catch (error) {
      console.error("[Gemini Voice] Audio playback error:", error);
    }
  }

  private playNextInQueue() {
    if (this.audioQueue.length === 0 || !this.audioContext) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const buffer = this.audioQueue.shift()!;
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.playNextInQueue();
    };

    source.start();
  }

  sendText(text: string) {
    if (!this.session || this.isClosed) {
      console.error("[Gemini Voice] Session not connected or closed");
      return;
    }

    try {
      this.session.sendClientContent({
        turns: text,
        turnComplete: true,
      });
    } catch (error) {
      console.error("[Gemini Voice] Error sending text:", error);
      this.isClosed = true;
      this.session = null;
    }
  }

  sendAudio(audioData: string) {
    if (!this.session || this.isClosed) {
      console.error("[Gemini Voice] Session not connected or closed");
      return;
    }

    try {
      this.session.sendRealtimeInput({
        media: {
          data: audioData,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    } catch (error) {
      console.error("[Gemini Voice] Error sending audio:", error);
      this.isClosed = true;
      this.session = null;
    }
  }

  close() {
    try {
      if (this.session && !this.isClosed) {
        this.session.close();
      }
      this.session = null;
      this.isClosed = true;

      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }

      this.audioQueue = [];
      this.isPlaying = false;
    } catch (error) {
      console.error("[Gemini Voice] Error closing session:", error);
      this.session = null;
      this.isClosed = true;
    }
  }

  isSessionActive(): boolean {
    return this.session !== null && !this.isClosed;
  }
}

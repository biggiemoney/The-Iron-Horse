
import { GoogleGenAI, Modality } from "@google/genai";

export class GeminiNarrator {
  private audioContext: AudioContext | null = null;
  private isNarrating = false;
  private lastNarrationTime = 0;
  private readonly THROTTLE_MS = 5000; // Minimum time between narrations to save quota

  constructor() {}

  private async getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  async narrate(text: string) {
    const now = Date.now();
    // Prevent overlapping narrations and excessive quota usage
    if (this.isNarrating || (now - this.lastNarrationTime < this.THROTTLE_MS)) {
      console.log("Narration skipped to preserve API quota.");
      return;
    }

    this.isNarrating = true;
    try {
      // Ensure apiKey is string for the client initialization
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `You are a theatrical 19th-century train conductor. Narrate this game event with energy and railroad flair (keep it very brief): ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      // Safely extract audio data from candidates and check type
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (typeof base64Audio === 'string') {
        await this.playRawAudio(base64Audio);
        this.lastNarrationTime = Date.now();
      }
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes("429")) {
        console.warn("Gemini API Quota reached (429). Silencing conductor temporarily.");
      } else {
        console.error("Narration error:", error);
      }
    } finally {
      this.isNarrating = false;
    }
  }

  private async playRawAudio(base64Data: string) {
    try {
      const ctx = await this.getAudioContext();
      const bytes = this.decode(base64Data);
      const audioBuffer = await this.decodeAudioData(bytes, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  }

  private decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(
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
}

export const narrator = new GeminiNarrator();

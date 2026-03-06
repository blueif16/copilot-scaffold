import { NextRequest } from "next/server";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

// This endpoint creates ephemeral tokens for secure client-side Live API access
// Never expose your API key directly in the browser
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Create ephemeral token for client-side use
    const token = await ai.authTokens.create({
      config: {
        uses: 1, // Single use token
        liveConnectConstraints: {
          model: "gemini-live-2.5-flash-preview",
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
        },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    return new Response(
      JSON.stringify({ token: token.name }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating ephemeral token:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create token" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            text: `Create a high-fidelity, epic basketball jersey and shorts outfit for a game called XBA. Style: Futuristic, professional sports gear. Theme: ${prompt}. Show the full outfit on a mannequin.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    let imageUrl = "";
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const base64EncodeString = part.inlineData.data;
        const mime = part.inlineData.mimeType ?? "image/png";
        imageUrl = `data:${mime};base64,${base64EncodeString}`;
        break;
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
    }

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("Gemini Image Gen Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_API_KEY not set" }, { status: 500 });
  }

  const arrayBuffer = await req.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString("base64");

  const body = {
    config: {
      encoding: "WEBM_OPUS",
      sampleRateHertz: 48000,
      languageCode: "en-US",
    },
    audio: { content: base64Audio },
  };

  const res = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  const transcript =
    data.results
      ?.map((r: any) => r.alternatives?.[0]?.transcript ?? "")
      .join(" ")
      .trim() ?? "";

  return NextResponse.json({ transcript });
}

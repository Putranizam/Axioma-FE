import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { stripMarkdownForTts } from "../../../lib/voice";

const ALLOWED_VOICES = new Set(["id-ID-ArdiNeural", "id-ID-GadisNeural"]);
const MAX_TTS_CHARS = 1500;

function splitTextForFallback(text: string, maxLength = 180): string[] {
  const clean = text.trim();
  if (clean.length <= maxLength) return [clean];

  const sentences = clean.split(/(?<=[.!?,;:\n])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (!sentence) continue;
    if ((current + " " + sentence).trim().length <= maxLength) {
      current = current ? `${current} ${sentence}` : sentence;
    } else {
      if (current) chunks.push(current.trim());
      if (sentence.length <= maxLength) {
        current = sentence;
      } else {
        const words = sentence.split(/\s+/);
        current = "";
        for (const w of words) {
          if ((current + " " + w).trim().length <= maxLength) {
            current = current ? `${current} ${w}` : w;
          } else {
            if (current) chunks.push(current.trim());
            current = w;
          }
        }
      }
    }
  }

  if (current) chunks.push(current.trim());
  return chunks.filter((c) => Boolean(c.trim()));
}

async function synthesizeWithEdgeNeural(
  cleanText: string,
  voiceName: string,
  rate: number
): Promise<Buffer> {
  // Sanitize characters that break SSML XML template
  const ssmlSafeText = cleanText
    .replace(/&/g, " dan ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tts = new MsEdgeTTS({
    connectionTimeoutMs: 8000,
    synthesisTimeoutMs: 18000,
  });

  try {
    await tts.setMetadata(
      voiceName,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    const { audioStream } = tts.toStream(ssmlSafeText, {
      rate: Math.min(1.5, Math.max(0.7, rate)),
      pitch: "+0Hz",
    });

    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const timer = setTimeout(() => {
        reject(new Error("Edge TTS stream timeout"));
      }, 15000);

      audioStream.on("data", (chunk: Buffer | Uint8Array) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      audioStream.on("end", () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });
      audioStream.on("error", (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error("Edge TTS returned empty buffer");
    }

    return audioBuffer;
  } finally {
    try {
      tts.close();
    } catch {}
  }
}

async function synthesizeWithGoogleFallback(cleanText: string): Promise<Buffer> {
  const chunks = splitTextForFallback(cleanText, 180);
  const buffers: Buffer[] = [];

  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=id&client=tw-ob&q=${encodeURIComponent(
      chunk
    )}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!resp.ok) {
      throw new Error(`Fallback TTS HTTP ${resp.status}`);
    }

    const arr = await resp.arrayBuffer();
    if (arr.byteLength > 0) {
      buffers.push(Buffer.from(arr));
    }
  }

  if (buffers.length === 0) {
    throw new Error("Fallback TTS returned empty audio");
  }

  return Buffer.concat(buffers);
}

async function handleTtsRequest(rawText: string, voiceParam?: string, rateParam?: number) {
  const cleanText = stripMarkdownForTts(rawText).slice(0, MAX_TTS_CHARS).trim();
  if (!cleanText) {
    return NextResponse.json(
      { success: false, error: "Teks suara tidak boleh kosong." },
      { status: 400 }
    );
  }

  const chosenVoice =
    voiceParam && ALLOWED_VOICES.has(voiceParam) ? voiceParam : "id-ID-ArdiNeural";
  const rate =
    typeof rateParam === "number" && Number.isFinite(rateParam)
      ? Math.min(1.5, Math.max(0.7, rateParam))
      : 1.05;

  let audioBuffer: Buffer;
  let engineUsed = "edge-neural";

  try {
    audioBuffer = await synthesizeWithEdgeNeural(cleanText, chosenVoice, rate);
  } catch (edgeErr) {
    console.warn("[/api/tts] Edge Neural TTS failed, falling back to Google TTS:", edgeErr);
    try {
      audioBuffer = await synthesizeWithGoogleFallback(cleanText);
      engineUsed = "google-tts";
    } catch (fallbackErr) {
      console.error("[/api/tts] All TTS engines failed:", fallbackErr);
      return NextResponse.json(
        { success: false, error: "Layanan suara sedang tidak tersedia." },
        { status: 502 }
      );
    }
  }

  return new NextResponse(new Uint8Array(audioBuffer), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuffer.length),
      "Cache-Control": "no-store",
      "X-Voice-Engine": engineUsed,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      text?: unknown;
      voice?: unknown;
      rate?: unknown;
    } | null;
    const text = typeof body?.text === "string" ? body.text : "";
    const voice = typeof body?.voice === "string" ? body.voice : undefined;
    const rate = typeof body?.rate === "number" ? body.rate : undefined;
    return await handleTtsRequest(text, voice, rate);
  } catch {
    return NextResponse.json(
      { success: false, error: "Permintaan TTS tidak valid." },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text") || "";
  const voice = searchParams.get("voice") || undefined;
  const rateRaw = searchParams.get("rate");
  const rate = rateRaw ? Number(rateRaw) : undefined;
  return await handleTtsRequest(text, voice, rate);
}

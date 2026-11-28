import { NextRequest, NextResponse } from "next/server";

// Catatan Next.js 16: dengan `cacheComponents: true` di next.config.ts,
// Route Handler GET yang membaca `req.nextUrl.searchParams` otomatis berjalan dinamis
// di Node.js (`ƒ /api/image`) dan SWC melarang ekspor manual `runtime` / `dynamic`.

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

interface CachedImageEntry {
  buffer: Uint8Array;
  contentType: string;
  createdAt: number;
}

const MAX_CACHE_ITEMS = 25;
const CACHE_TTL_MS = 30 * 60 * 1000;
const imageCache = new Map<string, CachedImageEntry>();
const inFlightRequests = new Map<
  string,
  Promise<{ buffer: Uint8Array; contentType: string }>
>();

function detectImageMimeType(bytes: Uint8Array, fallbackMime: string): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return fallbackMime.startsWith("image/") ? fallbackMime : "image/jpeg";
}

function setBoundedCache(key: string, entry: CachedImageEntry): void {
  if (imageCache.has(key)) {
    imageCache.delete(key);
  }
  while (imageCache.size >= MAX_CACHE_ITEMS) {
    const oldestKey = imageCache.keys().next().value;
    if (!oldestKey) break;
    imageCache.delete(oldestKey);
  }
  imageCache.set(key, entry);
}

function createLinkedSignal(
  parentSignal: AbortSignal | undefined,
  timeoutMs: number
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error("Request timeout")), timeoutMs);
  const onParentAbort = () => controller.abort(parentSignal?.reason);

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason);
    } else {
      parentSignal.addEventListener("abort", onParentAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      parentSignal?.removeEventListener("abort", onParentAbort);
    },
  };
}

class UpstreamImageError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

async function fetchImageBinary(
  url: string,
  timeoutMs: number,
  parentSignal?: AbortSignal,
  extraHeaders?: Record<string, string>
): Promise<{ buffer: Uint8Array; contentType: string }> {
  const { signal, cleanup } = createLinkedSignal(parentSignal, timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
        ...extraHeaders,
      },
      redirect: "follow",
      signal,
    });

    if (!res.ok) {
      const errSnippet = await res.text().catch(() => "");
      throw new UpstreamImageError(
        `Upstream HTTP ${res.status}: ${errSnippet.slice(0, 160)}`,
        res.status
      );
    }

    const headerType = (res.headers.get("content-type") || "").toLowerCase();
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (!headerType.startsWith("image/") || bytes.byteLength < 512) {
      throw new UpstreamImageError(
        `Invalid image payload (${headerType || "unknown"}, ${bytes.byteLength} bytes)`,
        502
      );
    }

    return {
      buffer: bytes,
      contentType: detectImageMimeType(bytes, headerType),
    };
  } finally {
    cleanup();
  }
}

async function generateViaAiHorde(
  prompt: string,
  parentSignal?: AbortSignal
): Promise<{ buffer: Uint8Array; contentType: string }> {
  const { signal, cleanup } = createLinkedSignal(parentSignal, 22_000);
  try {
    const submitRes = await fetch("https://aihorde.net/api/v2/generate/async", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.AI_HORDE_API_KEY || "0000000000",
        "Client-Agent": "AxiomaAI:2.5:axioma.my.id",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        prompt,
        params: {
          width: 512,
          height: 512,
          steps: 18,
          n: 1,
        },
        nsfw: false,
        censor_nsfw: true,
      }),
      signal,
    });

    if (!submitRes.ok) {
      throw new UpstreamImageError(`AI Horde submit HTTP ${submitRes.status}`, submitRes.status);
    }

    const submitData = (await submitRes.json()) as { id?: string };
    const jobId = submitData?.id;
    if (!jobId) {
      throw new UpstreamImageError("AI Horde did not return a job ID", 502);
    }

    for (let attempt = 0; attempt < 15; attempt++) {
      if (signal.aborted) throw new UpstreamImageError("Aborted", 499);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (signal.aborted) throw new UpstreamImageError("Aborted", 499);

      const statusRes = await fetch(
        `https://aihorde.net/api/v2/generate/status/${encodeURIComponent(jobId)}`,
        {
          headers: {
            "Client-Agent": "AxiomaAI:2.5:axioma.my.id",
            "User-Agent": USER_AGENT,
          },
          signal,
        }
      );

      if (!statusRes.ok) continue;
      const statusData = (await statusRes.json()) as {
        done?: boolean;
        faulted?: boolean;
        generations?: Array<{ img?: string }>;
      };

      if (statusData.faulted) {
        throw new UpstreamImageError("AI Horde generation faulted", 502);
      }

      const generatedImg = statusData.generations?.[0]?.img;
      if (statusData.done && generatedImg) {
        if (generatedImg.startsWith("http")) {
          return await fetchImageBinary(generatedImg, 10_000, signal);
        }
        const rawB64 = generatedImg.includes(",")
          ? generatedImg.split(",")[1] || ""
          : generatedImg;
        const decoded = Buffer.from(rawB64, "base64");
        if (decoded.byteLength >= 512) {
          const bytes = new Uint8Array(decoded);
          return {
            buffer: bytes,
            contentType: detectImageMimeType(bytes, "image/webp"),
          };
        }
        throw new UpstreamImageError("AI Horde empty base64 image", 502);
      }
    }

    throw new UpstreamImageError("AI Horde polling timeout", 504);
  } finally {
    cleanup();
  }
}

async function generateViaOptionalApis(
  prompt: string,
  width: number,
  height: number,
  seed: string,
  parentSignal?: AbortSignal
): Promise<{ buffer: Uint8Array; contentType: string } | null> {
  // Optional HuggingFace Inference if configured in environment
  const hfToken = (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "").trim();
  if (hfToken) {
    const { signal, cleanup } = createLinkedSignal(parentSignal, 18_000);
    try {
      const res = await fetch(
        "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfToken}`,
            "Content-Type": "application/json",
            Accept: "image/jpeg",
          },
          body: JSON.stringify({ inputs: prompt }),
          signal,
        }
      );
      if (res.ok) {
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (ct.startsWith("image/") && bytes.byteLength >= 512) {
          return { buffer: bytes, contentType: detectImageMimeType(bytes, ct) };
        }
      }
    } catch {
      // Continue cleanly to next engine
    } finally {
      cleanup();
    }
  }

  // Optional Pollinations paid/pollen key if configured in environment
  const pollenKey = (process.env.POLLINATIONS_API_KEY || "").trim();
  if (pollenKey) {
    try {
      const url = `https://gen.pollinations.ai/image/${encodeURIComponent(
        prompt
      )}?width=${width}&height=${height}&seed=${encodeURIComponent(seed)}&model=flux`;
      return await fetchImageBinary(url, 18_000, parentSignal, {
        Authorization: `Bearer ${pollenKey}`,
      });
    } catch {
      // Continue to free engines
    }
  }

  return null;
}

async function resolveImageWithFallback(
  prompt: string,
  seed: string,
  width: number,
  height: number,
  engine: string,
  parentSignal?: AbortSignal
): Promise<{ buffer: Uint8Array; contentType: string }> {
  // 0. Check optional API-keyed generators if present in env
  const optionalResult = await generateViaOptionalApis(
    prompt,
    width,
    height,
    seed,
    parentSignal
  );
  if (optionalResult) return optionalResult;

  const encodedPrompt = encodeURIComponent(prompt);
  let pollinationsRateLimited = false;

  // 1. Engine 1: Pollinations Flux (skipped when client explicitly requests fallback engine)
  if (engine !== "fallback") {
    const engine1Url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${encodeURIComponent(
      seed
    )}&nologo=true&model=flux`;
    try {
      return await fetchImageBinary(engine1Url, 20_000, parentSignal);
    } catch (err) {
      if (err instanceof UpstreamImageError && err.status === 402) {
        pollinationsRateLimited = true;
      }
      console.warn(
        "[/api/image] Engine 1 (Pollinations Flux) failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  // 2. Engine 2a: Pollinations Turbo / Standard (skip if IP already rate-limited 402 by Pollinations)
  if (!pollinationsRateLimited) {
    const fallbackWidth = Math.min(width, 800);
    const fallbackHeight = Math.min(height, 800);
    const engine2Url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${fallbackWidth}&height=${fallbackHeight}&seed=${encodeURIComponent(
      seed
    )}&nologo=true&model=turbo`;
    try {
      return await fetchImageBinary(engine2Url, 15_000, parentSignal);
    } catch (err) {
      console.warn(
        "[/api/image] Engine 2 (Pollinations Turbo) failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  // 3. Engine 3: Distributed Free GPU Engine (AI Horde — zero API key & bypasses Pollinations IP cooldown)
  return await generateViaAiHorde(prompt, parentSignal);
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  try {
    const rawPrompt = (searchParams.get("prompt") || "").trim();
    // Preserve UTF-8 scripts & verbatim quoted text ("..."); strip only control chars and trailing stray parens
    const cleanedPrompt = rawPrompt
      .replace(/[\u0000-\u001f\u007f]+/g, " ")
      .replace(/[)]+$/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 800);

    if (!cleanedPrompt) {
      return NextResponse.json(
        { error: "Parameter prompt wajib diisi." },
        { status: 400 }
      );
    }

    const rawSeed = (searchParams.get("seed") || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
    const seed = rawSeed || String(Math.floor(100_000 + Math.random() * 900_000_000));
    const engine = (searchParams.get("engine") || "auto").toLowerCase();
    const fresh = searchParams.get("fresh") === "1";

    const rawW = Number(searchParams.get("width"));
    const rawH = Number(searchParams.get("height"));
    const width = Number.isFinite(rawW) && rawW >= 256 && rawW <= 1024 ? Math.round(rawW) : 1024;
    const height = Number.isFinite(rawH) && rawH >= 256 && rawH <= 1024 ? Math.round(rawH) : 1024;

    const cacheKey = `${cleanedPrompt}::${seed}::${width}x${height}::${engine}`;

    if (!fresh) {
      const cached = imageCache.get(cacheKey);
      if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
        return new NextResponse(Buffer.from(cached.buffer), {
          status: 200,
          headers: {
            "Content-Type": cached.contentType || "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    let pendingPromise = !fresh ? inFlightRequests.get(cacheKey) : undefined;
    if (!pendingPromise) {
      pendingPromise = resolveImageWithFallback(
        cleanedPrompt,
        seed,
        width,
        height,
        engine,
        req.signal
      )
        .then((result) => {
          setBoundedCache(cacheKey, {
            buffer: result.buffer,
            contentType: result.contentType,
            createdAt: Date.now(),
          });
          return result;
        })
        .finally(() => {
          inFlightRequests.delete(cacheKey);
        });

      inFlightRequests.set(cacheKey, pendingPromise);
    }

    const imageResult = await pendingPromise;

    return new NextResponse(Buffer.from(imageResult.buffer), {
      status: 200,
      headers: {
        "Content-Type": imageResult.contentType || "image/jpeg",
        "Cache-Control": fresh ? "no-store" : "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[/api/image] All visual engines failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Gagal memuat visual: ${err.message}`
            : "Gagal memuat visual saat ini.",
      },
      { status: 502 }
    );
  }
}

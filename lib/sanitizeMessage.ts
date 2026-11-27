export interface RetryPayloadRecord {
  chatId: string;
  sessionId: string;
  content: string;
  regenerate?: boolean;
}

export function sanitizeAxiomaMessageContent(
  raw: string,
  options?: { preserveTrailingSpace?: boolean }
): string {
  if (!raw || typeof raw !== "string") return "";
  let text = raw;

  text = text.replace(/^[^\w\n]*Mengoptimalkan prompt visual[^\n]*\n*/gim, "");
  text = text.replace(/^[^\w\n]*Sedang merender[^\n]*\n*/gim, "");
  text = text.replace(/.*Gemini AI\.\.\..*\n*/gi, "");

  text = text.replace(
    /Berikut adalah hasil gambar berkualitas tinggi yang dihasilkan berdasarkan permintaan Anda:/gi,
    "Berikut visualisasi untuk permintaan Anda:"
  );
  text = text.replace(
    /Berikut visual yang telah disiapkan:/gi,
    "Berikut visualisasi untuk permintaan Anda:"
  );
  text = text.replace(
    /Berikut hasil visualnya:/gi,
    "Berikut visualisasi untuk permintaan Anda:"
  );

  text = text.replace(
    />\s*\*?\*?✨?\s*Prompt yang Disempurnakan[^\n]*\n*(?:>\s*[^\n]*\n*)*/gi,
    ""
  );
  text = text.replace(/>\s*\*?Mesin:[^\n]*\n*/gi, "");
  text = text.replace(/>\s*\*?Status Layanan Google Veo[^\n]*\n*(?:[^\n]*\n*)*/gi, "");
  text = text.replace(/💡\s*\*?Tips:[^\n]*\n*/gi, "");

  text = text.replace(/\n{3,}/g, "\n\n");
  if (options?.preserveTrailingSpace) {
    return text.replace(/^\s+/, "");
  }
  return text.trim();
}

/**
 * Stabilizes partially streamed Markdown so ReactMarkdown never flickers raw syntax tokens
 * (`**`, `` ` ``, or half-opened ```` ``` ```` code fences) while characters are still arriving.
 */
export function stabilizeStreamingMarkdown(text: string, isStreaming: boolean): string {
  if (!isStreaming || !text) return text;

  let out = text;

  // 1. Hide 1–2 trailing backticks at start of a line before the 3rd fence backtick arrives
  out = out.replace(/(^|\n)`{1,2}$/, "$1");

  // 2. Check fenced code blocks (``` or ~~~)
  const fenceRegex = /^ {0,3}(`{3,}|~{3,})/gm;
  let fenceCount = 0;
  let lastFenceIndex = -1;
  let match: RegExpExecArray | null;
  while ((match = fenceRegex.exec(out)) !== null) {
    fenceCount += 1;
    lastFenceIndex = match.index;
  }

  // Inside an unclosed fenced code block:
  if (fenceCount % 2 === 1 && lastFenceIndex >= 0) {
    const afterOpenFence = out.slice(lastFenceIndex);
    // Wait until the opening fence header line (` ```tsx\n `) finishes before mounting CodeBlock
    if (!afterOpenFence.includes("\n")) {
      return out.slice(0, lastFenceIndex);
    }
    return `${out}\n\`\`\``;
  }

  // 3. Outside code fences: inspect only the active trailing paragraph after the last closed fence
  const tailStart = Math.max(
    lastFenceIndex >= 0 ? out.indexOf("\n", lastFenceIndex) + 1 : 0,
    out.lastIndexOf("\n\n") >= 0 ? out.lastIndexOf("\n\n") + 2 : 0
  );
  const head = out.slice(0, tailStart);
  let tail = out.slice(tailStart);

  // Strip incomplete trailing Markdown image syntax (`![alt](url...`) until closing `)` arrives
  tail = tail.replace(/!\[[^\]]*(?:\]\([^)\n]*)?$/, "");

  // Strip bare trailing inline markers (`**`, `*`, `` ` ``) that have zero content after them yet
  tail = tail.replace(/(^|[\s(])(\*{1,2}|`)$/, "$1");

  // Auto-close unclosed single inline code backtick in active paragraph
  const backtickCount = (tail.match(/(?<!`)`(?!`)/g) || []).length;
  if (backtickCount % 2 === 1) {
    return `${head}${tail}\``;
  }

  // Auto-close unclosed bold `**` in active paragraph
  const boldCount = (tail.match(/\*\*/g) || []).length;
  if (boldCount % 2 === 1) {
    return `${head}${tail}**`;
  }

  return `${head}${tail}`;
}

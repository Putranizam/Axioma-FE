export interface RetryPayloadRecord {
  chatId: string;
  sessionId: string;
  content: string;
  regenerate?: boolean;
}

export function sanitizeAxiomaMessageContent(raw: string): string {
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

  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

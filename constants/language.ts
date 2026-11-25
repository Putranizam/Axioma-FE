export type LanguageCode =
  | "auto"
  | "id"
  | "jv-ngoko"
  | "jv-krama"
  | "su"
  | "en"
  | "ja"
  | "ar";

export type ToneStyle = "santai" | "formal" | "kreatif";

export type ThinkingMode = "quick" | "deep" | "critical";

export type AnswerStyle =
  | "ringkas"
  | "detail"
  | "profesional"
  | "akademik"
  | "santai";

export type SocialTarget =
  | "none"
  | "dosen"
  | "atasan"
  | "orang_tua"
  | "klien"
  | "teman";

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  shortLabel: string;
}

export interface ToneOption {
  code: ToneStyle;
  label: string;
}

export interface ThinkingModeOption {
  code: ThinkingMode;
  label: string;
}

export interface AnswerStyleOption {
  code: AnswerStyle;
  label: string;
}

export interface SocialTargetOption {
  code: SocialTarget;
  label: string;
  shortLabel: string;
}

export interface AdaptiveAnswerAction {
  id: "shorten" | "clarify" | "critique" | "breakdown" | "table" | "continue";
  label: string;
  prompt: string;
  taskBreakdownMode?: boolean;
}

export const DEFAULT_LANGUAGE: LanguageCode = "auto";
export const DEFAULT_TONE: ToneStyle = "santai";
export const DEFAULT_THINKING_MODE: ThinkingMode = "quick";
export const DEFAULT_ANSWER_STYLE: AnswerStyle = "santai";
export const DEFAULT_SOCIAL_TARGET: SocialTarget = "none";

export const LANGUAGES: readonly LanguageOption[] = [
  { code: "auto", label: "Otomatis", shortLabel: "Auto" },
  { code: "id", label: "Indonesia", shortLabel: "ID" },
  { code: "jv-ngoko", label: "Jawa Ngoko", shortLabel: "Ngoko" },
  { code: "jv-krama", label: "Jawa Krama", shortLabel: "Krama" },
  { code: "su", label: "Sunda", shortLabel: "Sunda" },
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "ja", label: "Jepang", shortLabel: "JP" },
  { code: "ar", label: "Arab", shortLabel: "AR" },
] as const;

export const TONES: readonly ToneOption[] = [
  { code: "santai", label: "Santai" },
  { code: "formal", label: "Formal" },
  { code: "kreatif", label: "Kreatif" },
] as const;

export const THINKING_MODES: readonly ThinkingModeOption[] = [
  { code: "quick", label: "Cepat" },
  { code: "deep", label: "Mendalam" },
  { code: "critical", label: "Kritis" },
] as const;

export const ANSWER_STYLES: readonly AnswerStyleOption[] = [
  { code: "ringkas", label: "Ringkas" },
  { code: "detail", label: "Detail" },
  { code: "profesional", label: "Profesional" },
  { code: "akademik", label: "Akademik" },
  { code: "santai", label: "Santai" },
] as const;

export const SOCIAL_TARGETS: readonly SocialTargetOption[] = [
  { code: "none", label: "Umum", shortLabel: "Umum" },
  { code: "dosen", label: "Dosen", shortLabel: "Dosen" },
  { code: "atasan", label: "Atasan", shortLabel: "Atasan" },
  { code: "orang_tua", label: "Orang Tua", shortLabel: "Ortu" },
  { code: "klien", label: "Klien", shortLabel: "Klien" },
  { code: "teman", label: "Teman", shortLabel: "Teman" },
] as const;

export const ADAPTIVE_ANSWER_ACTIONS: readonly AdaptiveAnswerAction[] = [
  {
    id: "shorten",
    label: "Perpendek",
    prompt: "Perpendek jawaban sebelumnya menjadi poin-poin inti saja.",
  },
  {
    id: "clarify",
    label: "Perjelas",
    prompt:
      "Jelaskan jawaban sebelumnya dengan bahasa yang lebih sederhana dan beri 1 contoh konkret.",
  },
  {
    id: "critique",
    label: "Uji Celah",
    prompt:
      "Kritisi jawaban/ide sebelumnya: apa asumsi yang belum terbukti dan risiko utamanya?",
  },
  {
    id: "breakdown",
    label: "Pecah Langkah",
    prompt:
      "Pecah pembahasan sebelumnya menjadi langkah-langkah checklist kecil yang berurutan dan bisa langsung dikerjakan.",
    taskBreakdownMode: true,
  },
  {
    id: "table",
    label: "Buat Tabel",
    prompt:
      "Ubah poin-poin penting dari jawaban sebelumnya menjadi tabel perbandingan yang ringkas.",
  },
  {
    id: "continue",
    label: "Lanjutkan",
    prompt:
      "Lanjutkan jawaban sebelumnya tepat dari bagian terakhir tanpa mengulang dari awal.",
  },
] as const;

export function isValidLanguageCode(value: unknown): value is LanguageCode {
  return (
    typeof value === "string" &&
    LANGUAGES.some((item) => item.code === value)
  );
}

export function isValidToneStyle(value: unknown): value is ToneStyle {
  return (
    typeof value === "string" &&
    TONES.some((item) => item.code === value)
  );
}

export function isValidThinkingMode(value: unknown): value is ThinkingMode {
  return (
    typeof value === "string" &&
    THINKING_MODES.some((item) => item.code === value)
  );
}

export function isValidAnswerStyle(value: unknown): value is AnswerStyle {
  return (
    typeof value === "string" &&
    ANSWER_STYLES.some((item) => item.code === value)
  );
}

export function isValidSocialTarget(value: unknown): value is SocialTarget {
  return (
    typeof value === "string" &&
    SOCIAL_TARGETS.some((item) => item.code === value)
  );
}

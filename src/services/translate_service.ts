export type SupportedLanguage = "vi" | "en" | "zh" | "ja" | "ko";

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["vi", "en", "zh", "ja", "ko"];

function normalizeText(text: string): string {
  return text.trim();
}

// Dịch 1 lần và cache theo message payload trước khi lưu vào Firestore.
// Hiện tại dùng bản dịch placeholder an toàn, không gọi API ngoài.
export async function translateOnce(
  text: string,
  lang: SupportedLanguage,
): Promise<string> {
  const normalized = normalizeText(text);
  if (!normalized) return "";
  if (!SUPPORTED_LANGUAGES.includes(lang)) return normalized;

  if (lang === "vi") return normalized;
  return `[${lang.toUpperCase()}] ${normalized}`;
}

export async function buildTranslations(
  text: string,
): Promise<Record<SupportedLanguage, string>> {
  const entries = await Promise.all(
    SUPPORTED_LANGUAGES.map(async (lang) => [lang, await translateOnce(text, lang)] as const),
  );
  return Object.fromEntries(entries) as Record<SupportedLanguage, string>;
}

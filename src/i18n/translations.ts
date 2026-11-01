const cache = new Map<string, Record<string, string>>();

// The app's native literal text is English (CRM targets Indian
// businesses -- English and Hindi are the only two languages actually
// supported; "es"/"pt"/"sw"/"fr" are unimplemented upstream stubs left
// as-is). "en" bypasses the fetch/cache lookup the same way "es" used to,
// since the in-code literal already IS the English text.
export async function loadTranslations(lang: string): Promise<void> {
  if (lang === "en" || cache.has(lang)) return;

  const res = await fetch(`/locales/${lang}.json`);
  if (res.ok) {
    cache.set(lang, (await res.json()) as Record<string, string>);
  }
}

export function getTranslation(key: string, lang: string): string {
  if (lang === "en") return key;
  return cache.get(lang)?.[key] || key;
}

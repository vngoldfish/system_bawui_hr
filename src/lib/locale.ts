export const ALLOWED_LOCALES = ['ja', 'en', 'vi', 'zh', 'th'] as const;
export type AppLocale = (typeof ALLOWED_LOCALES)[number];

export const LOCALE_STORAGE_KEY = 'app_lang';

export function isAllowedLocale(value: string): value is AppLocale {
  return (ALLOWED_LOCALES as readonly string[]).includes(value);
}

type CookieReader = {
  get: (name: string) => { value: string } | undefined;
};

export function resolveInitialLocale(cookieStore: CookieReader): AppLocale {
  const appLang = cookieStore.get('app_lang')?.value;
  if (appLang && isAllowedLocale(appLang)) return appLang;

  const session = cookieStore.get('session_user')?.value;
  if (session) {
    try {
      const parsed = JSON.parse(decodeURIComponent(session)) as { language?: string };
      if (parsed.language && isAllowedLocale(parsed.language)) return parsed.language;
    } catch {
      // ignore malformed cookie
    }
  }

  return 'ja';
}

export function readLocaleFromBrowserCookies(): AppLocale | null {
  if (typeof document === 'undefined') return null;

  const appLang = document.cookie
    .split('; ')
    .find((row) => row.startsWith('app_lang='))
    ?.split('=')[1];
  if (appLang && isAllowedLocale(appLang)) return appLang;

  const session = document.cookie
    .split('; ')
    .find((row) => row.startsWith('session_user='))
    ?.split('=')[1];
  if (!session) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(session)) as { language?: string };
    if (parsed.language && isAllowedLocale(parsed.language)) return parsed.language;
  } catch {
    // ignore malformed cookie
  }

  return null;
}

export function getClientLocaleSnapshot(fallback: AppLocale): AppLocale {
  if (typeof window === 'undefined') return fallback;

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && isAllowedLocale(stored)) return stored;

  return readLocaleFromBrowserCookies() ?? fallback;
}

export function persistClientLocale(locale: AppLocale) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `app_lang=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function localeCookieValue(locale: AppLocale): string {
  return `app_lang=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
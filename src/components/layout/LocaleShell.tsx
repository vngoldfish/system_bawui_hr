import { cookies } from 'next/headers';
import { I18nProvider } from '@/lib/i18n';
import { resolveInitialLocale } from '@/lib/locale';

export default async function LocaleShell({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLocale = resolveInitialLocale(cookieStore);

  return <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>;
}
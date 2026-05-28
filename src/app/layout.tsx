import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HR Management System - 人事管理システム",
  description: "人事管理、勤怠管理、給与計算システム",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get("session_user");
  let initialLocale = "ja";
  if (sessionUserCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(sessionUserCookie.value));
      if (parsed && parsed.language) {
        initialLocale = parsed.language;
      }
    } catch (e) {
      // Ignore
    }
  }

  return (
    <html
      lang={initialLocale}
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-hidden antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden" suppressHydrationWarning>
        <I18nProvider initialLocale={initialLocale}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

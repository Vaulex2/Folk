import type { Metadata } from "next";
import "./globals.css";
import "./flock.css";
import I18nProvider from "@/components/I18nProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import OfflineBanner from "@/components/OfflineBanner";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const m = getMessages(await getLocale());
  return { title: m.meta.title, description: m.meta.description };
}

// Bare shell shared by the app and the login page — the app chrome (nav, top
// bar, actor picker) lives in app/(app)/layout.tsx so /login renders without it.
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = getMessages(locale);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {supabaseUrl && <link rel="preconnect" href={supabaseUrl} />}
      </head>
      <body>
        <ServiceWorkerRegister />
        <I18nProvider locale={locale} messages={messages}>
          <OfflineBanner />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

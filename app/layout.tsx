import type { Metadata } from "next";
import "./globals.css";
import "./flock.css";
import SideNav from "@/components/SideNav";
import TabBar from "@/components/TabBar";
import I18nProvider from "@/components/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import OfflineBanner from "@/components/OfflineBanner";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const m = getMessages(await getLocale());
  return { title: m.meta.title, description: m.meta.description };
}

const FLOCK_NAME = "Fairview Flock";

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
          <div className="app">
            <SideNav flockName={FLOCK_NAME} />
            <main className="main">
              <div className="mtop">
                <span className="brand-mark">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c-2 0-3.2 1.3-3.2 3 0 .5-.5.8-1 .8C6.2 6.8 5 8 5 9.6c0 1 .5 1.7 1.2 2.1-.7.5-1.2 1.3-1.2 2.3C5 16 6.3 17 8 17h8c1.7 0 3-1 3-3 0-1-.5-1.8-1.2-2.3.7-.4 1.2-1.1 1.2-2.1 0-1.6-1.2-2.8-2.8-2.8-.5 0-1-.3-1-.8C15.2 4.3 14 3 12 3Z" /><path d="M9 17v2M15 17v2" /></svg>
                </span>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 19, flex: 1 }}>{FLOCK_NAME}</span>
                <LanguageSwitcher className="input" />
              </div>
              {children}
            </main>
            <TabBar />
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}

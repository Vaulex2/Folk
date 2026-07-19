import SideNav from "@/components/SideNav";
import TabBar from "@/components/TabBar";
import PastureBackdrop from "@/components/PastureBackdrop";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ActorProvider from "@/components/ActorProvider";
import ActorPicker from "@/components/ActorPicker";
import SignOutButton from "@/components/SignOutButton";
import { getActor } from "@/lib/actor/server";
import { FLOCK_NAME } from "@/lib/flockName";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const actor = await getActor();

  return (
    <ActorProvider actor={actor}>
      <div className="app">
        <PastureBackdrop variant="app" />
        <SideNav flockName={FLOCK_NAME} />
        <main className="main">
          <div className="mtop">
            <span className="brand-mark">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c-2 0-3.2 1.3-3.2 3 0 .5-.5.8-1 .8C6.2 6.8 5 8 5 9.6c0 1 .5 1.7 1.2 2.1-.7.5-1.2 1.3-1.2 2.3C5 16 6.3 17 8 17h8c1.7 0 3-1 3-3 0-1-.5-1.8-1.2-2.3.7-.4 1.2-1.1 1.2-2.1 0-1.6-1.2-2.8-2.8-2.8-.5 0-1-.3-1-.8C15.2 4.3 14 3 12 3Z" /><path d="M9 17v2M15 17v2" /></svg>
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 19, flex: 1 }}>{FLOCK_NAME}</span>
            <ActorPicker className="input" />
            <LanguageSwitcher className="input" />
            <SignOutButton />
          </div>
          {children}
        </main>
        <TabBar />
      </div>
    </ActorProvider>
  );
}

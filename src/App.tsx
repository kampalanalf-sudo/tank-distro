import { Headphones, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CloudBadge, NavItems, Sidebar } from "@/components/Sidebar";
import { PlayerBar } from "@/components/PlayerBar";
import { AppProvider, useApp } from "@/lib/store";
import { cx, eatNow } from "@/lib/util";
import { CommunityView } from "@/views/CommunityView";
import { MusicView } from "@/views/MusicView";
import { OnAirView } from "@/views/OnAirView";
import { PodcastsView } from "@/views/PodcastsView";
import { ScheduleView } from "@/views/ScheduleView";
import { SettingsView } from "@/views/SettingsView";
import { StudioView } from "@/views/StudioView";

function EatClock({ className }: { className?: string }) {
  const [now, setNow] = useState(eatNow());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(eatNow()), 1000);
    return () => window.clearInterval(iv);
  }, []);
  return (
    <span className={cx("font-mono text-[11px] text-mist", className)}>
      {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} <span className="text-gold/70">EAT</span>
    </span>
  );
}

function Shell() {
  const s = useApp();
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="min-h-full">
      <Sidebar />

      {/* mobile nav drawer */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-gold/15 bg-surface p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="./brand/iuea-shield.png" alt="" className="size-9" />
                <span className="font-display text-sm font-semibold text-cream">IUEA Community Radio</span>
              </div>
              <button onClick={() => setMobileNav(false)} className="btn-ghost size-9" aria-label="Close menu">
                <X size={16} />
              </button>
            </div>
            <NavItems onPick={() => setMobileNav(false)} />
          </div>
        </div>
      )}

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b border-gold/10 bg-ink/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
            <button onClick={() => setMobileNav(true)} className="btn-ghost size-9 md:hidden" aria-label="Open menu">
              <Menu size={16} />
            </button>
            <img src="./brand/iuea-shield.png" alt="IUEA crest" className="size-8 md:hidden" />
            <div className="hidden md:block">
              <div className="font-display text-lg leading-none font-semibold text-cream">
                IUEA <span className="text-gold">Community Radio</span>
              </div>
              <div className="micro mt-0.5 text-faint">Education · Entertainment · Community</div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <CloudBadge />
              <span className="hidden items-center gap-1.5 text-xs text-mist sm:inline-flex">
                <Headphones size={13} className="text-gold" />
                <span className="font-mono font-semibold text-cream">{s.listeners}</span>
              </span>
              <EatClock className="hidden sm:inline" />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pt-6 pb-32 md:px-6">
          {s.view === "onair" ? <OnAirView /> :
           s.view === "podcasts" ? <PodcastsView /> :
           s.view === "music" ? <MusicView /> :
           s.view === "schedule" ? <ScheduleView /> :
           s.view === "community" ? <CommunityView /> :
           s.view === "studio" ? <StudioView /> :
           <SettingsView />}

          <footer className="mt-10 border-t border-gold/10 pt-5 pb-2 text-center">
            <div className="micro text-faint">IUEA Community Radio · Plot 1112/1121 Kansanga, Ggaba Road, Kampala · Learning to Succeed</div>
          </footer>
        </main>
      </div>

      <PlayerBar />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

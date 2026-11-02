import { Cloud, CloudOff, Download, Plug, Radio } from "lucide-react";
import { useState } from "react";
import { CloudBadge } from "@/components/Sidebar";
import { useApp } from "@/lib/store";
import { Micro, SectionHead } from "@/lib/util";

const ART = [
  { href: "./art/station-cover.png", label: "Station cover", meta: "1600×1600 · podcast feeds" },
  { href: "./art/social-banner.png", label: "Social banner", meta: "1600×900 · X / Facebook / WhatsApp" },
  { href: "./art/show-breakfast.png", label: "Kansanga Breakfast Run", meta: "1000×1000 show art" },
  { href: "./art/show-syllabus.png", label: "The Syllabus", meta: "1000×1000 show art" },
  { href: "./art/show-grooves.png", label: "Ggaba Road Grooves", meta: "1000×1000 show art" },
  { href: "./art/show-night.png", label: "Night Prep", meta: "1000×1000 show art" },
  { href: "./art/show-guild.png", label: "Guild Square", meta: "1000×1000 show art" },
  { href: "./brand/iuea-logo-full.png", label: "IUEA official logo", meta: "transparent PNG · brand source" },
  { href: "./brand/iuea-shield.png", label: "IUEA crest", meta: "transparent PNG · app icon" },
];

export function SettingsView() {
  const s = useApp();
  const [url, setUrl] = useState(s.cloudUrl);
  const [key, setKey] = useState(s.cloudKey);
  const [testMsg, setTestMsg] = useState("");
  const [st, setSt] = useState(s.data.settings);

  return (
    <div>
      <SectionHead kicker="Station control" title="Settings" right={<CloudBadge />} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* profile */}
        <div className="panel p-5">
          <Micro>Your listener profile</Micro>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-mist">Name on the wall</span>
              <input className="input" value={s.profile.name} placeholder="e.g. Aisha (1st Yr CS)" onChange={(e) => s.setProfile({ ...s.profile, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-mist">Community</span>
              <input className="input" value={s.profile.community} placeholder="Hall / faculty / staff unit" onChange={(e) => s.setProfile({ ...s.profile, community: e.target.value })} />
            </label>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-faint">Used for shout-wall posts, requests, poll votes and the live listener heartbeat. Stored on your device; synced only if the cloud is connected.</p>
        </div>

        {/* supabase */}
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <Micro>Shared cloud — Supabase</Micro>
            <CloudBadge />
          </div>
          <div className="mt-3 space-y-3">
            <input className="input font-mono text-xs" placeholder="https://your-project.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} />
            <input className="input font-mono text-xs" placeholder="anon public key" type="password" value={key} onChange={(e) => setKey(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-ghost px-4 py-2 text-xs font-semibold"
                onClick={async () => {
                  const r = await s.testCloud(url, key);
                  setTestMsg(r.message);
                }}
              >
                <Plug size={13} className="text-gold" /> Test connection
              </button>
              <button className="btn-gold px-4 py-2 text-xs" onClick={() => s.configure(url.trim(), key.trim())}>
                <Cloud size={13} /> Connect
              </button>
              <button className="btn-ghost px-4 py-2 text-xs font-semibold" onClick={() => { setUrl(""); setKey(""); s.disconnect(); }}>
                <CloudOff size={13} /> Disconnect
              </button>
            </div>
            {testMsg && <div className="rounded-lg border border-line bg-black/30 px-3 py-2 text-xs text-mist">{testMsg}</div>}
            <p className="text-[11px] leading-relaxed text-faint">
              1 · Create a free project at supabase.com · 2 · In SQL Editor run <code className="rounded bg-black/50 px-1 text-gold-soft">supabase/schema.sql</code> then <code className="rounded bg-black/50 px-1 text-gold-soft">supabase/seed.sql</code> (optional — first connect also auto-seeds) · 3 · Paste URL + anon key here. Every listener, presenter and the studio then share one realtime backend.
            </p>
          </div>
        </div>

        {/* broadcast */}
        <div className="panel p-5">
          <Micro>Broadcast & contacts</Micro>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs text-mist"><Radio size={12} className="text-gold" /> Live stream URL (Icecast / Zeno.fm / Radio.co)</span>
              <input className="input font-mono text-xs" placeholder="https://stream.example.org/iuea.mp3" value={st.streamUrl} onChange={(e) => setSt({ ...st, streamUrl: e.target.value })} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input text-xs" value={st.frequency} onChange={(e) => setSt({ ...st, frequency: e.target.value })} />
              <input className="input text-xs" value={st.whatsapp} onChange={(e) => setSt({ ...st, whatsapp: e.target.value })} />
              <input className="input text-xs" value={st.instagram} onChange={(e) => setSt({ ...st, instagram: e.target.value })} />
              <input className="input text-xs" value={st.email} onChange={(e) => setSt({ ...st, email: e.target.value })} />
            </div>
            <button className="btn-gold px-5 py-2 text-xs" onClick={() => s.saveSettings(st)}>Save station settings</button>
            <p className="text-[11px] leading-relaxed text-faint">Without a stream URL the player transmits the built-in studio demo bed, so the station is never silent during setup.</p>
          </div>
        </div>

        {/* brand kit */}
        <div className="panel p-5">
          <Micro>Brand & artwork kit</Micro>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {ART.map((a) => (
              <a key={a.href} href={a.href} download className="group block">
                <div className="gloss-img aspect-square overflow-hidden rounded-lg border border-gold/20">
                  <img src={a.href} alt={a.label} className="size-full object-cover transition group-hover:scale-105" loading="lazy" />
                </div>
                <div className="mt-1.5 flex items-start gap-1">
                  <Download size={10} className="mt-0.5 shrink-0 text-gold/70" />
                  <div>
                    <div className="text-[10px] leading-tight font-bold text-cream group-hover:text-gold-soft">{a.label}</div>
                    <div className="text-[9px] text-faint">{a.meta}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-faint">
            Brand: IUEA maroon #7A0000, tulip gold #EEAF3D, black. The crest and wordmark are the official marks of International University of East Africa; station artwork composites them over original glossy studio art. Motto: “Learning to Succeed”.
          </p>
        </div>
      </div>
    </div>
  );
}

import type { NowPlaying } from "./types";

/**
 * RadioEngine — one audio pipeline for three sources:
 *  1. `stream`  the station's real broadcast URL (Icecast / Zeno.fm / Radio.co ...)
 *  2. `file`    on-demand podcast episodes & licensed tracks
 *  3. `demo`    a built-in WebAudio studio bed (Afro-soul chords, kick, shaker, bass,
 *               pluck melody) so the station is never silent before a stream exists.
 * Everything routes through one AnalyserNode so the visualizer always tells the truth.
 */
export type EngineMode = "idle" | "stream" | "file" | "demo";

const MIDI = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class RadioEngine {
  mode: EngineMode = "idle";
  playing = false;
  volume = 0.8;
  onState: (() => void) | null = null;

  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private master: GainNode | null = null;
  private el: HTMLAudioElement | null = null;
  private demoTimer: number | null = null;
  private step = 0;
  private nextTime = 0;

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.82;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  levels(out: Uint8Array<ArrayBuffer>): void {
    if (this.analyser && this.playing) this.analyser.getByteFrequencyData(out);
    else out.fill(0);
  }

  async play(np: NowPlaying, streamUrl: string): Promise<void> {
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();
    this.stopDemo();
    this.stopElement();
    const url = np.audioUrl || (np.kind === "live" ? streamUrl.trim() : "");
    if (url) {
      const el = new Audio(url);
      el.loop = np.kind === "live";
      el.volume = 1;
      const src = ctx.createMediaElementSource(el);
      src.connect(this.master!);
      this.el = el;
      try {
        await el.play();
        this.mode = np.kind === "live" ? "stream" : "file";
      } catch {
        // stream unreachable → fall back to the studio demo bed
        this.el = null;
        this.startDemo(ctx);
        this.mode = "demo";
      }
    } else {
      this.startDemo(ctx);
      this.mode = "demo";
    }
    this.playing = true;
    this.onState?.();
  }

  pause(): void {
    this.el?.pause();
    this.stopDemo();
    this.playing = false;
    this.ctx?.suspend().catch(() => undefined);
    this.onState?.();
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  private stopElement(): void {
    if (this.el) {
      this.el.pause();
      this.el.src = "";
      this.el = null;
    }
  }

  private stopDemo(): void {
    if (this.demoTimer !== null) {
      window.clearInterval(this.demoTimer);
      this.demoTimer = null;
    }
  }

  /* ------------------------- built-in studio demo bed ------------------------ */
  private startDemo(ctx: AudioContext): void {
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.08;
    this.demoTimer = window.setInterval(() => this.schedule(ctx), 90);
  }

  private schedule(ctx: AudioContext): void {
    const spb = 60 / 96 / 4; // 96 BPM, 16th notes
    while (this.nextTime < ctx.currentTime + 0.3) {
      this.voice(ctx, this.step, this.nextTime);
      this.nextTime += spb;
      this.step = (this.step + 1) % 64; // 4 bars
    }
  }

  private voice(ctx: AudioContext, step: number, t: number): void {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chords = [
      [57, 60, 64, 67], // Am7
      [53, 57, 60, 64], // Fmaj7
      [48, 55, 60, 64], // C
      [55, 59, 62, 67], // G(add9-ish)
    ];
    if (s === 0) this.pad(ctx, chords[bar], t, 16 * (60 / 96 / 4));
    if (s % 4 === 0) this.kick(ctx, t);
    if (s % 2 === 1) this.shaker(ctx, t, s % 4 === 3 ? 0.16 : 0.09);
    const bassPat = [0, -1, 0, -1, 0, 3, -1, 5, 0, -1, 0, -1, 7, -1, 5, 3];
    if (bassPat[s] >= 0) this.bass(ctx, chords[bar][0] - 12 + bassPat[s], t);
    const pent = [69, 72, 74, 76, 79, 81];
    if (s % 4 === 2 && (step * 7) % 5 !== 0) this.pluck(ctx, pent[(step * 3) % pent.length], t);
  }

  private kick(ctx: AudioContext, t: number): void {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    g.gain.setValueAtTime(0.85, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.3);
  }

  private shaker(ctx: AudioContext, t: number, amp: number): void {
    const len = Math.floor(ctx.sampleRate * 0.07);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6200;
    const g = ctx.createGain();
    g.gain.value = amp;
    src.connect(hp).connect(g).connect(this.master!);
    src.start(t);
  }

  private bass(ctx: AudioContext, midi: number, t: number): void {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = MIDI(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.24, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.4);
  }

  private pad(ctx: AudioContext, notes: number[], t: number, dur: number): void {
    for (const m of notes) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = MIDI(m);
        o.detune.value = det;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 950;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.035, t + 0.5);
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(lp).connect(g).connect(this.master!);
        o.start(t);
        o.stop(t + dur + 0.1);
      }
    }
  }

  private pluck(ctx: AudioContext, midi: number, t: number): void {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = MIDI(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.45);
  }
}

export const engine = new RadioEngine();

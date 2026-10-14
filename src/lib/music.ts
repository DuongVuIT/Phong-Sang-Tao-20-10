/**
 * Nhạc hộp (music box) tự sinh bằng Web Audio – không cần file mp3, không lo bản quyền.
 * Giai điệu ngũ cung nhẹ nhàng + tiếng chuông khi mở lì xì.
 */

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// Giai điệu (MIDI note, độ dài theo phách) – vòng lặp 16 phách
const MELODY: [number, number][] = [
  [76, 1], [79, 1], [81, 1], [84, 1],
  [83, 0.5], [81, 0.5], [79, 1], [76, 2],
  [74, 1], [76, 1], [79, 1], [81, 1],
  [79, 0.5], [76, 0.5], [74, 1], [72, 2],
];
const BASS = [48, 55, 57, 53];

class MusicBox {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wet: GainNode | null = null;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private bar = 0;
  playing = false;

  private ensure() {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
    // echo nhẹ tạo không gian
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.33;
    const fb = ctx.createGain();
    fb.gain.value = 0.35;
    const wet = ctx.createGain();
    wet.gain.value = 0.4;
    wet.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(master);
    this.ctx = ctx;
    this.master = master;
    this.wet = wet;
    return ctx;
  }

  private bell(freq: number, at: number, dur = 1.6, vol = 0.5) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    g.connect(this.master!);
    g.connect(this.wet!);
    for (const [mult, amp, type] of [
      [1, 1, "sine"],
      [2, 0.35, "sine"],
      [3.01, 0.12, "triangle"],
    ] as const) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = type;
      o.frequency.value = freq * mult;
      og.gain.value = amp;
      o.connect(og);
      og.connect(g);
      o.start(at);
      o.stop(at + dur + 0.05);
    }
  }

  private schedule = () => {
    const ctx = this.ctx!;
    const beat = 60 / 92;
    while (this.nextTime < ctx.currentTime + 0.25) {
      const [note, len] = MELODY[this.step];
      this.bell(NOTE(note), this.nextTime, 1.4, 0.38);
      if (this.step % 4 === 0) {
        this.bell(NOTE(BASS[this.bar % BASS.length]), this.nextTime, 2.6, 0.22);
        this.bar++;
      }
      this.nextTime += len * beat;
      this.step = (this.step + 1) % MELODY.length;
    }
  };

  async start() {
    const ctx = this.ensure();
    await ctx.resume();
    if (this.playing) return;
    this.playing = true;
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = window.setInterval(this.schedule, 60);
  }

  stop() {
    this.playing = false;
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
  }

  /** Tiếng "ting ting" lấp lánh khi bao lì xì mở. */
  async sparkle() {
    const ctx = this.ensure();
    await ctx.resume();
    const t = ctx.currentTime;
    [88, 91, 93, 96, 100].forEach((n, i) => this.bell(NOTE(n), t + i * 0.07, 1.2, 0.3));
  }
}

export const music = new MusicBox();

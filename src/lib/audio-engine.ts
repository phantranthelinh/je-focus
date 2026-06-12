import { SOUND_CATALOG } from './sounds';

const FADE_DURATION = 0.3; // seconds

type ChannelState = {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private channels: Map<string, ChannelState> = new Map();
  private loading: Map<string, Promise<AudioBuffer | null>> = new Map();
  private starting: Set<string> = new Set();
  private _masterVolume = 1;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._masterVolume;
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /**
   * Fetch + decode a single sound's buffer on demand. Idempotent and
   * de-duplicated: concurrent calls for the same id share one in-flight
   * request, and an already-decoded buffer resolves immediately. Per-file
   * failures are isolated (resolve to null) so one bad asset can't break others.
   */
  private ensureLoaded(soundId: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(soundId);
    if (cached) return Promise.resolve(cached);

    const inFlight = this.loading.get(soundId);
    if (inFlight) return inFlight;

    const sound = SOUND_CATALOG.find((s) => s.id === soundId);
    if (!sound) return Promise.resolve(null);

    const ctx = this.getCtx();
    const promise = (async () => {
      try {
        const res = await fetch(sound.src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.buffers.set(sound.id, audioBuffer);
        return audioBuffer;
      } catch (err) {
        console.warn(`[audio] failed to load "${sound.id}" (${sound.src}):`, err);
        return null;
      } finally {
        this.loading.delete(sound.id);
      }
    })();

    this.loading.set(soundId, promise);
    return promise;
  }

  /**
   * Warm the buffer cache for all catalog sounds. Call this when the user
   * signals intent to use audio (e.g. opens the mixer) so toggles feel instant —
   * NOT on initial page load (that would pull ~9MB of audio nobody asked for).
   */
  async preload(): Promise<void> {
    await Promise.all(SOUND_CATALOG.map((sound) => this.ensureLoaded(sound.id)));
  }

  isSuspended(): boolean {
    return this.ctx?.state === 'suspended';
  }

  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  isPlaying(soundId: string): boolean {
    // Treat a sound mid-startup as playing so the store sync effect doesn't
    // fire a second play() while its buffer is still being fetched/decoded.
    return this.channels.has(soundId) || this.starting.has(soundId);
  }

  async play(soundId: string, targetVolume = 1): Promise<void> {
    const ctx = this.getCtx();

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    this.starting.add(soundId);
    let buffer: AudioBuffer | null;
    try {
      buffer = await this.ensureLoaded(soundId);
    } finally {
      this.starting.delete(soundId);
    }
    if (!buffer) return;

    // Crossfade: fade out existing source while new one fades in
    const existing = this.channels.get(soundId);
    if (existing) {
      const { source, gainNode } = existing;
      const now = ctx.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0, now + FADE_DURATION);
      setTimeout(() => {
        try { source.stop(); } catch { /* already stopped */ }
      }, FADE_DURATION * 1000);
    }

    const gainNode = ctx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(this.masterGain!);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gainNode);
    source.start(0);

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, targetVolume)), now + FADE_DURATION);

    this.channels.set(soundId, { source, gainNode });
  }

  stop(soundId: string): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const channel = this.channels.get(soundId);
    if (!channel) return;

    const { source, gainNode } = channel;
    const now = ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + FADE_DURATION);
    setTimeout(() => {
      try { source.stop(); } catch { /* already stopped */ }
    }, FADE_DURATION * 1000);

    this.channels.delete(soundId);
  }

  setVolume(soundId: string, volume: number): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const channel = this.channels.get(soundId);
    if (!channel) return;

    const { gainNode } = channel;
    const now = ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, volume)), now + 0.05);
  }

  setMasterVolume(volume: number): void {
    this._masterVolume = Math.max(0, Math.min(1, volume));
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(this._masterVolume, now + 0.05);
  }

  dispose(): void {
    for (const { source } of this.channels.values()) {
      try { source.stop(); } catch { /* ok */ }
    }
    this.channels.clear();
    this.ctx?.close();
    this.ctx = null;
    this.masterGain = null;
  }
}

export const audioEngine = new AudioEngine();

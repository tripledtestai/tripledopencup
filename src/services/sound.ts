// Procedural Web Audio API Sound Engine (BGM & SFX) - 100% Pure JS Synth, Zero External MP3s

class ProceduralSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmPlaying: boolean = false;
  private bgmTimer: number | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private stepIdx: number = 0;

  constructor() {
    const savedMute = localStorage.getItem('tripled_sound_muted');
    if (savedMute === 'true') {
      this.isMuted = true;
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('tripled_sound_muted', String(this.isMuted));
    if (this.isMuted) {
      this.stopBGM();
      this.stopEngineHum();
    } else {
      this.playCoin();
    }
    return this.isMuted;
  }

  // Upbeat Bio-Synth Racing BGM
  public startBGM(): void {
    if (this.isMuted || this.bgmPlaying) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.bgmPlaying = true;
    // Energetic pentatonic arpeggio notes (Hz)
    const melody = [
      220, 261.63, 329.63, 392.0, 440, 392.0, 329.63, 293.66,
      246.94, 293.66, 369.99, 440, 493.88, 440, 369.99, 329.63,
    ];
    const bass = [110, 110, 130.81, 130.81, 146.83, 146.83, 164.81, 130.81];

    const tick = () => {
      if (!this.bgmPlaying || this.isMuted) return;
      const c = this.ensureContext();
      if (!c) return;

      const now = c.currentTime;
      const noteFreq = melody[this.stepIdx % melody.length];
      const bassFreq = bass[Math.floor(this.stepIdx / 2) % bass.length];

      // Lead synth pluck
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(noteFreq, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.17);

      // Sub bass on even steps
      if (this.stepIdx % 2 === 0) {
        const bOsc = c.createOscillator();
        const bGain = c.createGain();
        bOsc.type = 'sawtooth';
        bOsc.frequency.setValueAtTime(bassFreq, now);
        bGain.gain.setValueAtTime(0.025, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        bOsc.connect(bGain);
        bGain.connect(c.destination);
        bOsc.start(now);
        bOsc.stop(now + 0.26);
      }

      this.stepIdx++;
    };

    this.bgmTimer = window.setInterval(tick, 185);
  }

  public stopBGM(): void {
    this.bgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  // Continuous engine hum modulated by speed (0..600)
  public updateEngineHum(speedRatio: number, isBoosting: boolean = false): void {
    if (this.isMuted) {
      this.stopEngineHum();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (!this.engineOsc || !this.engineGain) {
      this.engineOsc = ctx.createOscillator();
      this.engineGain = ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain.gain.value = 0.015;
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(ctx.destination);
      this.engineOsc.start();
    }

    const baseFreq = 50 + Math.min(1.5, Math.max(0, speedRatio)) * 115 + (isBoosting ? 50 : 0);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, ctx.currentTime, 0.05);
    this.engineGain.gain.setTargetAtTime(
      speedRatio > 0.05 ? 0.022 : 0.006,
      ctx.currentTime,
      0.08
    );
  }

  public stopEngineHum(): void {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {
        // ignore
      }
      this.engineOsc = null;
      this.engineGain = null;
    }
  }

  // Countdown beep (3, 2, 1, GO!)
  public playCountdown(isGo: boolean): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
    if (isGo) {
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25);
    }
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.45 : 0.22));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isGo ? 0.46 : 0.24));
  }

  // Coin / Giftcode / Reward chime
  public playCoin(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [987.77, 1318.51].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.1, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.26);
    });
  }

  // Nitro / Rocket Start whoosh
  public playBoost(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.35);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Explosion / Homing Rocket impact
  public playExplosion(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // White noise burst + low sub drop
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  // Banana slip / Mud splash
  public playHazardHit(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.15);
    osc.frequency.linearRampToValueAtTime(420, now + 0.3);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  // Gacha / Victory fanfare
  public playFanfare(isMythic: boolean = false): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = isMythic
      ? [523.25, 659.25, 783.99, 1046.5, 1318.51]
      : [440, 554.37, 659.25, 880];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.11, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.4);
    });
  }
}

export const soundEngine = new ProceduralSoundEngine();

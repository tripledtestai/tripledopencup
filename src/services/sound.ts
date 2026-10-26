// Procedural Web Audio API Sound Engine (BGM & SFX) - 100% Pure JS Synth, Zero External MP3s

class ProceduralSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmPlaying: boolean = false;
  private bgmMode: 'menu' | 'race' = 'menu';
  private bgmTimer: number | null = null;
  private stepIdx: number = 0;

  // Multi-layered Realistic Automotive Engine & Turbo Nodes
  private engineSubOsc: OscillatorNode | null = null;
  private engineMainOsc: OscillatorNode | null = null;
  private engineHarmonicOsc: OscillatorNode | null = null;
  private engineTurboOsc: OscillatorNode | null = null;
  private engineNoiseSource: AudioBufferSourceNode | null = null;

  private engineSubGain: GainNode | null = null;
  private engineMainGain: GainNode | null = null;
  private engineHarmonicGain: GainNode | null = null;
  private engineTurboGain: GainNode | null = null;
  private engineNoiseGain: GainNode | null = null;
  private engineMasterFilter: BiquadFilterNode | null = null;
  private engineNoiseFilter: BiquadFilterNode | null = null;
  private engineMasterGain: GainNode | null = null;

  private lastGear: number = 1;
  private lastSpeedRatio: number = 0;
  private lastShiftTime: number = 0;
  private sharedNoiseBuffer: AudioBuffer | null = null;

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

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.sharedNoiseBuffer && this.sharedNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.sharedNoiseBuffer;
    }
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Blend pink-ish and white noise for rich automotive / explosion texture
      lastOut = (lastOut + 0.08 * white) / 1.08;
      data[i] = white * 0.65 + lastOut * 1.8;
    }
    this.sharedNoiseBuffer = buffer;
    return buffer;
  }

  private makeDistortionCurve(amount: number = 25): Float32Array {
    const nSamples = 256;
    const curve = new Float32Array(nSamples);
    const k = typeof amount === 'number' ? amount : 25;
    for (let i = 0; i < nSamples; i++) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    return curve;
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

  // ============================================================================
  // 130 BPM HIGH-OCTANE FESTIVAL / CYBERPUNK RACING EDM BGM
  // ============================================================================
  public startBGM(mode: 'menu' | 'race' = 'race'): void {
    if (this.isMuted) return;
    if (this.bgmPlaying && this.bgmMode === mode) return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }

    this.bgmPlaying = true;
    this.bgmMode = mode;
    this.stepIdx = 0;

    // 130 BPM => 16th note step is ~115ms
    // Key: A Minor / F Major / C Major / G Major Festival EDM Progression
    // 64-step (4-bar) energetic EDM supersaw lead hook (0 = rest)
    const leadMelody: number[] = [
      // Bar 1 (Am): A4 - C5 - E5 hook
      440.0, 0, 523.25, 440.0, 659.25, 0, 587.33, 523.25,
      440.0, 523.25, 659.25, 0, 783.99, 659.25, 587.33, 523.25,
      // Bar 2 (F): F4 - A4 - C5 - E5
      349.23, 0, 440.0, 349.23, 523.25, 0, 659.25, 523.25,
      440.0, 523.25, 587.33, 0, 659.25, 587.33, 523.25, 440.0,
      // Bar 3 (C): C5 - E5 - G5 festival anthem rise
      523.25, 0, 659.25, 523.25, 783.99, 0, 880.0, 783.99,
      659.25, 783.99, 880.0, 0, 1046.5, 880.0, 783.99, 659.25,
      // Bar 4 (G -> E7 turnaround): G4 - B4 - D5 - G5
      392.0, 0, 493.88, 587.33, 783.99, 0, 783.99, 659.25,
      587.33, 659.25, 783.99, 880.0, 987.77, 880.0, 783.99, 659.25,
    ];

    // Root bass frequencies per bar (Am -> F -> C -> G)
    const barBassRoots = [55.0, 43.65, 65.41, 49.0];
    // Chord stab triads on key syncopated steps (0, 3, 6, 10, 12)
    const barChords: number[][] = [
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
      [261.63, 329.63, 392.0], // C
      [196.0, 246.94, 293.66], // G
    ];

    const isRace = mode === 'race';
    const masterScale = isRace ? 1.0 : 0.65;

    const tick = () => {
      if (!this.bgmPlaying || this.isMuted) return;
      const c = this.ensureContext();
      if (!c) return;

      const now = c.currentTime;
      const step64 = this.stepIdx % 64;
      const step16 = step64 % 16;
      const barIdx = Math.floor(step64 / 16);
      const isBuildupBar = Math.floor(this.stepIdx / 64) % 4 === 3 && barIdx === 3;

      // 1. FOUR-ON-THE-FLOOR EDM KICK DRUM (Every quarter note: step 0, 4, 8, 12)
      // During final half of buildup bar, double-time kick roll!
      const isKickStep =
        step16 % 4 === 0 || (isBuildupBar && step16 >= 8 && step16 % 2 === 0);
      if (isKickStep) {
        const kickOsc = c.createOscillator();
        const kickGain = c.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(155, now);
        kickOsc.frequency.exponentialRampToValueAtTime(48, now + 0.045);
        kickOsc.frequency.exponentialRampToValueAtTime(31, now + 0.19);

        kickGain.gain.setValueAtTime(0.17 * masterScale, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);

        kickOsc.connect(kickGain);
        kickGain.connect(c.destination);
        kickOsc.start(now);
        oscStopSafe(kickOsc, now + 0.22);

        // Punchy top click transient
        const clickOsc = c.createOscillator();
        const clickGain = c.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(920, now);
        clickOsc.frequency.exponentialRampToValueAtTime(120, now + 0.018);
        clickGain.gain.setValueAtTime(0.06 * masterScale, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        clickOsc.connect(clickGain);
        clickGain.connect(c.destination);
        clickOsc.start(now);
        oscStopSafe(clickOsc, now + 0.022);
      }

      // 2. EDM CLAP / SNARE ON BEATS 2 & 4 (Steps 4, 12) + Snare Roll on Buildup
      const isSnareStep =
        step16 === 4 ||
        step16 === 12 ||
        (isBuildupBar && step16 >= 8 && step16 % 1 === 0);
      if (isSnareStep) {
        const snareVol = (isBuildupBar && step16 % 4 !== 4 ? 0.045 : 0.075) * masterScale;
        const noiseSrc = c.createBufferSource();
        noiseSrc.buffer = this.getNoiseBuffer(c);
        const snareFilter = c.createBiquadFilter();
        snareFilter.type = 'bandpass';
        snareFilter.frequency.setValueAtTime(1850, now);
        snareFilter.Q.setValueAtTime(1.2, now);

        const snareGain = c.createGain();
        snareGain.gain.setValueAtTime(snareVol, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        noiseSrc.connect(snareFilter);
        snareFilter.connect(snareGain);
        snareGain.connect(c.destination);
        noiseSrc.start(now);
        noiseSrc.stop(now + 0.15);
      }

      // 3. OFF-BEAT OPEN HI-HAT (Steps 2, 6, 10, 14) & CLOSED 16TH HAT
      if (isRace || step16 % 2 === 0) {
        const isOpenHat = step16 % 4 === 2;
        const hatSrc = c.createBufferSource();
        hatSrc.buffer = this.getNoiseBuffer(c);
        const hatFilter = c.createBiquadFilter();
        hatFilter.type = 'highpass';
        hatFilter.frequency.setValueAtTime(isOpenHat ? 6800 : 8500, now);

        const hatGain = c.createGain();
        const hatPeak = (isOpenHat ? 0.048 : 0.022) * masterScale;
        const hatDur = isOpenHat ? 0.11 : 0.035;
        hatGain.gain.setValueAtTime(hatPeak, now);
        hatGain.gain.exponentialRampToValueAtTime(0.001, now + hatDur);

        hatSrc.connect(hatFilter);
        hatFilter.connect(hatGain);
        hatGain.connect(c.destination);
        hatSrc.start(now);
        hatSrc.stop(now + hatDur + 0.01);
      }

      // 4. SIDECHAIN PUMPING ROLLING ELECTRO BASS
      const bassRoot = barBassRoots[barIdx];
      // Sidechain ducking: duck on kick steps (step16 % 4 === 0), pump hard on off-beats!
      const sidechainEnv = step16 % 4 === 0 ? 0.32 : step16 % 4 === 2 ? 1.0 : 0.78;
      const bassFreq =
        step16 % 4 === 2 ? bassRoot * 2 : step16 === 15 ? bassRoot * 1.5 : bassRoot;

      const bOsc = c.createOscillator();
      const bSub = c.createOscillator();
      const bFilter = c.createBiquadFilter();
      const bGain = c.createGain();

      bOsc.type = 'sawtooth';
      bSub.type = 'square';
      bOsc.frequency.setValueAtTime(bassFreq, now);
      bSub.frequency.setValueAtTime(bassFreq * 0.5, now);

      bFilter.type = 'lowpass';
      bFilter.frequency.setValueAtTime(isOpenHatStep(step16) ? 620 : 380, now);
      bFilter.frequency.exponentialRampToValueAtTime(135, now + 0.1);
      bFilter.Q.setValueAtTime(3.2, now);

      const bassPeak = 0.062 * sidechainEnv * masterScale;
      bGain.gain.setValueAtTime(bassPeak, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      bOsc.connect(bFilter);
      bSub.connect(bFilter);
      bFilter.connect(bGain);
      bGain.connect(c.destination);
      bOsc.start(now);
      bSub.start(now);
      oscStopSafe(bOsc, now + 0.115);
      oscStopSafe(bSub, now + 0.115);

      // 5. EDM SUPERSAW CHORD STABS (On syncopated house hits: 0, 3, 6, 10, 12)
      if (step16 === 0 || step16 === 3 || step16 === 6 || step16 === 10 || step16 === 12) {
        const chord = barChords[barIdx];
        const stabFilter = c.createBiquadFilter();
        const stabGain = c.createGain();
        stabFilter.type = 'lowpass';
        stabFilter.frequency.setValueAtTime(2100, now);
        stabFilter.frequency.exponentialRampToValueAtTime(480, now + 0.14);

        const stabVol = (step16 === 0 ? 0.016 : 0.024) * masterScale;
        stabGain.gain.setValueAtTime(stabVol, now);
        stabGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        stabFilter.connect(stabGain);
        stabGain.connect(c.destination);

        for (const cFreq of chord) {
          const cOsc = c.createOscillator();
          cOsc.type = 'sawtooth';
          cOsc.frequency.setValueAtTime(cFreq, now);
          cOsc.connect(stabFilter);
          cOsc.start(now);
          oscStopSafe(cOsc, now + 0.16);
        }
      }

      // 6. DETUNED SUPERSAW EDM LEAD ANTHEM MELODY
      const noteFreq = leadMelody[step64];
      if (noteFreq > 0) {
        const leadFilter = c.createBiquadFilter();
        const leadGain = c.createGain();

        leadFilter.type = 'lowpass';
        leadFilter.frequency.setValueAtTime(3400, now);
        leadFilter.frequency.exponentialRampToValueAtTime(850, now + 0.16);
        leadFilter.Q.setValueAtTime(1.8, now);

        const leadPeak = 0.036 * masterScale;
        leadGain.gain.setValueAtTime(leadPeak, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

        leadFilter.connect(leadGain);
        leadGain.connect(c.destination);

        // Dual detuned supersaw oscillators for wide festival EDM lead tone
        for (const detuneRatio of [0.995, 1.005]) {
          const lOsc = c.createOscillator();
          lOsc.type = 'sawtooth';
          lOsc.frequency.setValueAtTime(noteFreq * detuneRatio, now);
          lOsc.connect(leadFilter);
          lOsc.start(now);
          oscStopSafe(lOsc, now + 0.18);
        }
      }

      this.stepIdx++;
    };

    // 130 BPM 16th-note step = 115ms
    this.bgmTimer = window.setInterval(tick, 115);
  }

  public stopBGM(): void {
    this.bgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  // ============================================================================
  // REALISTIC MULTI-CYLINDER 6-SPEED AUTOMOTIVE ENGINE & TURBO/NITRO LOOP
  // ============================================================================
  public updateEngineHum(
    speedRatio: number,
    isBoosting: boolean = false
  ): void {
    if (this.isMuted) {
      this.stopEngineHum();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;

    const safeRatio =
      typeof speedRatio === 'number' && Number.isFinite(speedRatio)
        ? Math.max(0, Math.min(1.6, speedRatio))
        : 0;

    // Initialize multi-layered engine graph if not active
    if (
      !this.engineMainOsc ||
      !this.engineSubOsc ||
      !this.engineHarmonicOsc ||
      !this.engineTurboOsc ||
      !this.engineMasterGain ||
      !this.engineMasterFilter
    ) {
      this.stopEngineHum();

      this.engineMasterGain = ctx.createGain();
      this.engineMasterGain.gain.value = 0.01;

      this.engineMasterFilter = ctx.createBiquadFilter();
      this.engineMasterFilter.type = 'lowpass';
      this.engineMasterFilter.frequency.value = 420;
      this.engineMasterFilter.Q.value = 2.4;

      const shaper = ctx.createWaveShaper();
      shaper.curve = this.makeDistortionCurve(18) as Float32Array<ArrayBuffer>;
      shaper.oversample = '2x';

      // 1. Sub-Octave V8/Boxer Cylinder Rumble (0.5x order)
      this.engineSubOsc = ctx.createOscillator();
      this.engineSubGain = ctx.createGain();
      this.engineSubOsc.type = 'triangle';
      this.engineSubOsc.frequency.value = 24;
      this.engineSubGain.gain.value = 0.45;

      // 2. Primary Exhaust Firing Frequency (1.0x order)
      this.engineMainOsc = ctx.createOscillator();
      this.engineMainGain = ctx.createGain();
      this.engineMainOsc.type = 'sawtooth';
      this.engineMainOsc.frequency.value = 48;
      this.engineMainGain.gain.value = 0.38;

      // 3. Secondary Twin-Cam Harmonic Growl (2.0x order)
      this.engineHarmonicOsc = ctx.createOscillator();
      this.engineHarmonicGain = ctx.createGain();
      this.engineHarmonicOsc.type = 'square';
      this.engineHarmonicOsc.frequency.value = 96;
      this.engineHarmonicGain.gain.value = 0.16;

      // 4. Twin-Turbo / Nitro Compressor Spool Whine
      this.engineTurboOsc = ctx.createOscillator();
      this.engineTurboGain = ctx.createGain();
      this.engineTurboOsc.type = 'sine';
      this.engineTurboOsc.frequency.value = 650;
      this.engineTurboGain.gain.value = 0.0;

      // 5. Mechanical Intake & Afterburner Exhaust Rush (Looped Filtered Noise)
      this.engineNoiseSource = ctx.createBufferSource();
      this.engineNoiseSource.buffer = this.getNoiseBuffer(ctx);
      this.engineNoiseSource.loop = true;
      this.engineNoiseFilter = ctx.createBiquadFilter();
      this.engineNoiseFilter.type = 'bandpass';
      this.engineNoiseFilter.frequency.value = 320;
      this.engineNoiseFilter.Q.value = 1.6;
      this.engineNoiseGain = ctx.createGain();
      this.engineNoiseGain.gain.value = 0.08;

      // Connect graph
      this.engineSubOsc.connect(this.engineSubGain);
      this.engineMainOsc.connect(this.engineMainGain);
      this.engineHarmonicOsc.connect(this.engineHarmonicGain);

      this.engineSubGain.connect(shaper);
      this.engineMainGain.connect(shaper);
      this.engineHarmonicGain.connect(shaper);

      shaper.connect(this.engineMasterFilter);
      this.engineMasterFilter.connect(this.engineMasterGain);

      this.engineNoiseSource.connect(this.engineNoiseFilter);
      this.engineNoiseFilter.connect(this.engineNoiseGain);
      this.engineNoiseGain.connect(this.engineMasterGain);

      this.engineTurboOsc.connect(this.engineTurboGain);
      this.engineTurboGain.connect(this.engineMasterGain);

      this.engineMasterGain.connect(ctx.destination);

      this.engineSubOsc.start();
      this.engineMainOsc.start();
      this.engineHarmonicOsc.start();
      this.engineTurboOsc.start();
      this.engineNoiseSource.start();
    }

    // Compute realistic 6-speed gearbox RPM ratio (0.15 idle .. 1.0 redline)
    const gearThresholds = [0.02, 0.22, 0.42, 0.64, 0.86, 1.08];
    let gear = 1;
    let rpmNormalized = 0.16;

    if (safeRatio < 0.02) {
      gear = 1;
      // Subtle idle lope vibration
      const lope = Math.sin(ctx.currentTime * 18) * 0.015;
      rpmNormalized = 0.15 + lope;
    } else {
      for (let g = 0; g < gearThresholds.length; g++) {
        const low = gearThresholds[g];
        const high = gearThresholds[g + 1] ?? 1.45;
        if (safeRatio >= low && safeRatio < high) {
          gear = g + 1;
          const gearProgress = (safeRatio - low) / Math.max(0.1, high - low);
          // Each gear sweeps RPM from ~0.42 (after shift) up to ~0.96 (redline)
          rpmNormalized = (g === 0 ? 0.22 : 0.44) + gearProgress * (g === 0 ? 0.72 : 0.52);
          break;
        }
      }
      if (safeRatio >= 1.08) {
        gear = 6;
        rpmNormalized = Math.min(1.05, 0.58 + (safeRatio - 1.08) * 0.95);
      }
    }

    if (isBoosting) {
      rpmNormalized = Math.min(1.12, rpmNormalized + 0.16);
    }

    const now = Number.isFinite(ctx.currentTime) ? ctx.currentTime : 0;

    // Trigger subtle exhaust pop / turbo blow-off on upshift or sudden throttle lift
    if (gear > this.lastGear && now - this.lastShiftTime > 0.35 && safeRatio > 0.18) {
      this.lastShiftTime = now;
      this.playExhaustShiftPop(ctx, now, isBoosting);
    }
    this.lastGear = gear;
    this.lastSpeedRatio = safeRatio;

    // Map RPM to realistic cylinder firing frequency (34 Hz idle -> 175 Hz redline)
    const firingFreq = Math.max(28, 32 + rpmNormalized * 142);
    const filterCutoff = Math.max(
      180,
      240 + rpmNormalized * 1150 + (isBoosting ? 900 : 0)
    );
    const masterVol =
      safeRatio < 0.02
        ? 0.024
        : Math.min(0.095, 0.042 + safeRatio * 0.032 + (isBoosting ? 0.024 : 0));

    // Turbo & Nitro Afterburner Whine parameters
    const turboFreq = 680 + rpmNormalized * 1450 + (isBoosting ? 750 : 0);
    const turboVol = isBoosting
      ? 0.065
      : safeRatio > 0.45
      ? (safeRatio - 0.45) * 0.028
      : 0.0;

    // Intake / Afterburner Jet Rush noise parameters
    const noiseCutoff = isBoosting ? 1350 : 280 + rpmNormalized * 620;
    const noiseVol = isBoosting ? 0.28 : 0.06 + rpmNormalized * 0.09;

    try {
      this.engineSubOsc.frequency.setTargetAtTime(firingFreq * 0.5, now, 0.035);
      this.engineMainOsc.frequency.setTargetAtTime(firingFreq, now, 0.035);
      this.engineHarmonicOsc.frequency.setTargetAtTime(firingFreq * 2.0, now, 0.035);
      this.engineMasterFilter.frequency.setTargetAtTime(filterCutoff, now, 0.04);
      this.engineMasterGain.gain.setTargetAtTime(masterVol, now, 0.05);

      if (this.engineTurboOsc && this.engineTurboGain) {
        this.engineTurboOsc.frequency.setTargetAtTime(turboFreq, now, 0.05);
        this.engineTurboGain.gain.setTargetAtTime(turboVol, now, 0.06);
      }
      if (this.engineNoiseFilter && this.engineNoiseGain) {
        this.engineNoiseFilter.frequency.setTargetAtTime(noiseCutoff, now, 0.05);
        this.engineNoiseGain.gain.setTargetAtTime(noiseVol, now, 0.06);
      }
    } catch {
      // Ignore potential audio param timing exceptions
    }
  }

  // Subtle exhaust burble & turbo wastegate flutter when shifting gears
  private playExhaustShiftPop(
    ctx: AudioContext,
    now: number,
    isBoosting: boolean
  ): void {
    try {
      // Low exhaust backfire thump
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();
      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(125, now);
      popOsc.frequency.exponentialRampToValueAtTime(38, now + 0.07);
      popGain.gain.setValueAtTime(isBoosting ? 0.09 : 0.05, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      popOsc.connect(popGain);
      popGain.connect(ctx.destination);
      popOsc.start(now);
      oscStopSafe(popOsc, now + 0.08);
    } catch {
      // ignore
    }
  }

  public stopEngineHum(): void {
    const oscs = [
      this.engineSubOsc,
      this.engineMainOsc,
      this.engineHarmonicOsc,
      this.engineTurboOsc,
    ];
    for (const o of oscs) {
      if (o) {
        try {
          o.stop();
          o.disconnect();
        } catch {
          // ignore
        }
      }
    }
    if (this.engineNoiseSource) {
      try {
        this.engineNoiseSource.stop();
        this.engineNoiseSource.disconnect();
      } catch {
        // ignore
      }
    }
    if (this.engineMasterGain) {
      try {
        this.engineMasterGain.disconnect();
      } catch {
        // ignore
      }
    }
    this.engineSubOsc = null;
    this.engineMainOsc = null;
    this.engineHarmonicOsc = null;
    this.engineTurboOsc = null;
    this.engineNoiseSource = null;
    this.engineSubGain = null;
    this.engineMainGain = null;
    this.engineHarmonicGain = null;
    this.engineTurboGain = null;
    this.engineNoiseGain = null;
    this.engineMasterFilter = null;
    this.engineNoiseFilter = null;
    this.engineMasterGain = null;
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
    oscStopSafe(osc, now + (isGo ? 0.46 : 0.24));
  }

  public playCountdownGo(): void {
    this.playCountdown(true);
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
      oscStopSafe(osc, now + idx * 0.07 + 0.26);
    });
  }

  // ============================================================================
  // REALISTIC NITRO (N2O PURGE VALVE + EXHAUST BACKFIRE + JET AFTERBURNER ROAR)
  // ============================================================================
  public playBoost(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const noiseBuf = this.getNoiseBuffer(ctx);

    // 1. N2O Solenoid High-Pressure Gas Purge ("Psssshhht!")
    const purgeSrc = ctx.createBufferSource();
    purgeSrc.buffer = noiseBuf;
    const purgeFilter = ctx.createBiquadFilter();
    purgeFilter.type = 'bandpass';
    purgeFilter.frequency.setValueAtTime(3400, now);
    purgeFilter.frequency.exponentialRampToValueAtTime(1250, now + 0.16);
    purgeFilter.Q.setValueAtTime(2.2, now);

    const purgeGain = ctx.createGain();
    purgeGain.gain.setValueAtTime(0.16, now);
    purgeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    purgeSrc.connect(purgeFilter);
    purgeFilter.connect(purgeGain);
    purgeGain.connect(ctx.destination);
    purgeSrc.start(now);
    purgeSrc.stop(now + 0.18);

    // 2. Exhaust Backfire Ignition Thump ("BOOM-POP!")
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = 'triangle';
    popOsc.frequency.setValueAtTime(165, now + 0.02);
    popOsc.frequency.exponentialRampToValueAtTime(34, now + 0.22);
    popGain.gain.setValueAtTime(0.24, now + 0.02);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    popOsc.connect(popGain);
    popGain.connect(ctx.destination);
    popOsc.start(now + 0.02);
    oscStopSafe(popOsc, now + 0.25);

    // 3. Jet Afterburner Flame Roar (Sweeping Saturated Noise)
    const jetSrc = ctx.createBufferSource();
    jetSrc.buffer = noiseBuf;
    const jetFilter = ctx.createBiquadFilter();
    jetFilter.type = 'lowpass';
    jetFilter.frequency.setValueAtTime(320, now + 0.03);
    jetFilter.frequency.exponentialRampToValueAtTime(1650, now + 0.24);
    jetFilter.frequency.exponentialRampToValueAtTime(480, now + 0.68);
    jetFilter.Q.setValueAtTime(3.0, now + 0.03);

    const jetGain = ctx.createGain();
    jetGain.gain.setValueAtTime(0.01, now + 0.03);
    jetGain.gain.linearRampToValueAtTime(0.18, now + 0.14);
    jetGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    jetSrc.connect(jetFilter);
    jetFilter.connect(jetGain);
    jetGain.connect(ctx.destination);
    jetSrc.start(now + 0.03);
    jetSrc.stop(now + 0.72);

    // 4. Twin-Turbo Compressor Spool Whine
    const turboOsc = ctx.createOscillator();
    const turboGain = ctx.createGain();
    turboOsc.type = 'sine';
    turboOsc.frequency.setValueAtTime(780, now + 0.04);
    turboOsc.frequency.exponentialRampToValueAtTime(2650, now + 0.48);
    turboGain.gain.setValueAtTime(0.005, now + 0.04);
    turboGain.gain.linearRampToValueAtTime(0.042, now + 0.18);
    turboGain.gain.exponentialRampToValueAtTime(0.001, now + 0.56);
    turboOsc.connect(turboGain);
    turboGain.connect(ctx.destination);
    turboOsc.start(now + 0.04);
    oscStopSafe(turboOsc, now + 0.58);
  }

  // Homing Missile Launch Whoosh & Lock-On Tone
  public playMissileLaunch(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const noiseBuf = this.getNoiseBuffer(ctx);

    // High-velocity rocket motor propellant whoosh
    const rocketNoise = ctx.createBufferSource();
    rocketNoise.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(2800, now + 0.38);
    filter.Q.setValueAtTime(1.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    rocketNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    rocketNoise.start(now);
    rocketNoise.stop(now + 0.44);

    // Tactical lock-on launch chirp
    const chirp = ctx.createOscillator();
    const chirpGain = ctx.createGain();
    chirp.type = 'sawtooth';
    chirp.frequency.setValueAtTime(520, now);
    chirp.frequency.exponentialRampToValueAtTime(1480, now + 0.18);
    chirpGain.gain.setValueAtTime(0.07, now);
    chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    chirp.connect(chirpGain);
    chirpGain.connect(ctx.destination);
    chirp.start(now);
    oscStopSafe(chirp, now + 0.22);
  }

  // ============================================================================
  // CINEMATIC MISSILE DETONATION / EXPLOSION (IMPACT CRACK + SUB BOOM + FIREBALL)
  // ============================================================================
  public playExplosion(volumeScale: number = 1.0): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const vol = Math.max(0.15, Math.min(1.2, volumeScale));
    const now = ctx.currentTime;
    const noiseBuf = this.getNoiseBuffer(ctx);

    // 1. Initial Warhead Detonation Metallic Crack / Transient (0.0s -> 0.09s)
    const crackSrc = ctx.createBufferSource();
    crackSrc.buffer = noiseBuf;
    const crackFilter = ctx.createBiquadFilter();
    crackFilter.type = 'bandpass';
    crackFilter.frequency.setValueAtTime(1650, now);
    crackFilter.Q.setValueAtTime(0.9, now);
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.32 * vol, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    crackSrc.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(ctx.destination);
    crackSrc.start(now);
    crackSrc.stop(now + 0.1);

    // 2. Massive Sub-Bass Shockwave Boom (190Hz -> 26Hz pitch drop, 0.0s -> 0.65s)
    const subOsc = ctx.createOscillator();
    const subPunchOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subPunchOsc.type = 'triangle';

    subOsc.frequency.setValueAtTime(190, now);
    subOsc.frequency.exponentialRampToValueAtTime(46, now + 0.12);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.62);

    subPunchOsc.frequency.setValueAtTime(120, now);
    subPunchOsc.frequency.exponentialRampToValueAtTime(32, now + 0.35);

    subGain.gain.setValueAtTime(0.42 * vol, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    subOsc.connect(subGain);
    subPunchOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subPunchOsc.start(now);
    oscStopSafe(subOsc, now + 0.68);
    oscStopSafe(subPunchOsc, now + 0.38);

    // 3. Saturated Fireball Blast Roar (Sweeping Lowpass Noise 2200Hz -> 110Hz, 0.0s -> 0.85s)
    const blastSrc = ctx.createBufferSource();
    blastSrc.buffer = noiseBuf;
    const blastShaper = ctx.createWaveShaper();
    blastShaper.curve = this.makeDistortionCurve(35) as Float32Array<ArrayBuffer>;
    const blastFilter = ctx.createBiquadFilter();
    blastFilter.type = 'lowpass';
    blastFilter.frequency.setValueAtTime(2200, now);
    blastFilter.frequency.exponentialRampToValueAtTime(360, now + 0.25);
    blastFilter.frequency.exponentialRampToValueAtTime(95, now + 0.82);
    blastFilter.Q.setValueAtTime(1.8, now);

    const blastGain = ctx.createGain();
    blastGain.gain.setValueAtTime(0.34 * vol, now);
    blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    blastSrc.connect(blastShaper);
    blastShaper.connect(blastFilter);
    blastFilter.connect(blastGain);
    blastGain.connect(ctx.destination);
    blastSrc.start(now);
    blastSrc.stop(now + 0.88);

    // 4. Secondary Shrapnel & Debris Rumble Tail (0.08s -> 0.72s)
    const tailSrc = ctx.createBufferSource();
    tailSrc.buffer = noiseBuf;
    const tailFilter = ctx.createBiquadFilter();
    tailFilter.type = 'bandpass';
    tailFilter.frequency.setValueAtTime(720, now + 0.08);
    tailFilter.frequency.exponentialRampToValueAtTime(220, now + 0.7);
    tailFilter.Q.setValueAtTime(1.4, now + 0.08);

    const tailGain = ctx.createGain();
    tailGain.gain.setValueAtTime(0.16 * vol, now + 0.08);
    tailGain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);

    tailSrc.connect(tailFilter);
    tailFilter.connect(tailGain);
    tailGain.connect(ctx.destination);
    tailSrc.start(now + 0.08);
    tailSrc.stop(now + 0.75);
  }

  // Banana slip / Mud splash / Obstacle bump
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
    oscStopSafe(osc, now + 0.34);
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
      oscStopSafe(osc, now + idx * 0.09 + 0.4);
    });
  }

  // Genshin Impact Wish Meteor Streak & Celestial Chime
  public playGenshinWishMeteor(rarity: 'blue' | 'purple' | 'gold'): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Celestial Harp Arpeggio (0.0s -> 0.8s)
    const harpNotes =
      rarity === 'gold'
        ? [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98]
        : rarity === 'purple'
        ? [440, 554.37, 659.25, 880, 1108.73]
        : [392.0, 493.88, 587.33, 783.99];

    harpNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t0 = now + idx * 0.11;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.08, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      oscStopSafe(osc, t0 + 0.68);
    });

    // 2. Cosmic Meteor Whoosh Sweep (0.5s -> 1.7s)
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweepOsc.type = 'triangle';
    sweepOsc.frequency.setValueAtTime(220, now + 0.45);
    sweepOsc.frequency.exponentialRampToValueAtTime(
      rarity === 'gold' ? 1760 : rarity === 'purple' ? 1318.5 : 987.77,
      now + 1.65
    );
    sweepGain.gain.setValueAtTime(0.01, now + 0.45);
    sweepGain.gain.linearRampToValueAtTime(0.09, now + 1.15);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 1.85);
    sweepOsc.connect(sweepGain);
    sweepGain.connect(ctx.destination);
    sweepOsc.start(now + 0.45);
    oscStopSafe(sweepOsc, now + 1.9);
  }
}

function isOpenHatStep(step16: number): boolean {
  return step16 % 4 === 2;
}

function oscStopSafe(osc: OscillatorNode, time: number): void {
  try {
    osc.stop(time);
  } catch {
    // ignore
  }
}

export const soundEngine = new ProceduralSoundEngine();

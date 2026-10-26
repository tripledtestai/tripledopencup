import React, { useEffect, useRef } from 'react';
import { drawModularCar, TrailParticlePool } from '../game/carRenderer';
import { ALL_PARTS } from '../game/constants';
import {
  extractGameKeysFromKeyDown,
  extractGameKeysFromKeyUp,
  isTypingInInput,
} from '../game/keyboard';
import { calculateCarClass } from '../game/rules';
import { CarLoadout } from '../game/types';
import { soundEngine } from '../services/sound';

interface ShowroomCanvasProps {
  loadout: CarLoadout;
  username: string;
  active: boolean;
  isNightMode?: boolean;
  carName?: string;
  carTier?: string;
}

interface CyberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  isGold: boolean;
  phase: number;
}

interface CarDustMote {
  angle: number;
  radiusRatio: number;
  heightOffset: number;
  speed: number;
  vy: number;
  size: number;
  alpha: number;
  isGold: boolean;
  phase: number;
}

interface SpeedStreak {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
  isGold: boolean;
}

export const ShowroomCanvas: React.FC<ShowroomCanvasProps> = ({
  loadout,
  username,
  active,
  isNightMode = false,
  carName,
  carTier,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadoutRef = useRef<CarLoadout>(loadout);
  const usernameRef = useRef<string>(username);
  const activeRef = useRef<boolean>(active);
  const isNightRef = useRef<boolean>(isNightMode);
  const carNameRef = useRef<string>(carName || '');
  const carTierRef = useRef<string>(carTier || '');
  const transitionRef = useRef<{
    startMs: number;
    durationMs: number;
    spinBoost: number;
  }>({
    startMs: 0,
    durationMs: 460,
    spinBoost: 0,
  });
  const prevLoadoutKeyRef = useRef<string>(JSON.stringify(loadout));

  useEffect(() => {
    const nextKey = JSON.stringify(loadout);
    if (prevLoadoutKeyRef.current !== nextKey) {
      prevLoadoutKeyRef.current = nextKey;
      transitionRef.current = {
        startMs: performance.now(),
        durationMs: 460,
        spinBoost: 0.65,
      };
    }
    loadoutRef.current = loadout;
  }, [loadout]);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  const wakeUpLoopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    activeRef.current = active;
    if (active && wakeUpLoopRef.current) {
      wakeUpLoopRef.current();
    }
  }, [active]);

  useEffect(() => {
    isNightRef.current = isNightMode;
    if (activeRef.current && wakeUpLoopRef.current) {
      wakeUpLoopRef.current();
    }
  }, [isNightMode]);

  useEffect(() => {
    carNameRef.current = carName || '';
    carTierRef.current = carTier || '';
  }, [carName, carTier]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const showcase = {
      angle: -0.52,
      angularVel: 0.16,
      nitroTimer: 0,
    };

    // Ambient floating background particles
    const particles: CyberParticle[] = Array.from({ length: 36 }, (_, i) => ({
      x: Math.random() * 1920,
      y: Math.random() * 1080,
      vx: (Math.random() - 0.5) * 10,
      vy: -8 - Math.random() * 16,
      size: 1.1 + Math.random() * 2.0,
      alpha: 0.16 + Math.random() * 0.45,
      isGold: i % 4 === 0,
      phase: Math.random() * Math.PI * 2,
    }));

    // Slow-drifting luminous dust motes directly around the car & turntable
    const carDustMotes: CarDustMote[] = Array.from({ length: 22 }, (_, i) => ({
      angle: (i / 22) * Math.PI * 2,
      radiusRatio: 0.25 + Math.random() * 0.68,
      heightOffset: -10 - Math.random() * 135,
      speed: (0.12 + Math.random() * 0.22) * (i % 2 === 0 ? 1 : -1),
      vy: -6 - Math.random() * 10,
      size: 1.5 + Math.random() * 2.6,
      alpha: 0.35 + Math.random() * 0.5,
      isGold: i % 3 === 0,
      phase: Math.random() * Math.PI * 2,
    }));

    // Distant blurred speed track streaks
    const speedStreaks: SpeedStreak[] = Array.from({ length: 16 }, (_, i) => ({
      x: Math.random() * 1920,
      y: 110 + (i / 16) * 290,
      length: 90 + Math.random() * 170,
      speed: 200 + Math.random() * 300,
      alpha: 0.04 + Math.random() * 0.1,
      isGold: i % 3 === 0,
    }));

    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInInput(e.target)) return;
      const mapped = extractGameKeysFromKeyDown(e);
      if (mapped.length === 0) return;
      for (const code of mapped) {
        if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') {
          showcase.nitroTimer = 1.15;
          soundEngine.playBoost();
        }
        keys.add(code);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const mapped = extractGameKeysFromKeyUp(e);
      for (const code of mapped) keys.delete(code);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onBlur = () => keys.clear();
    window.addEventListener('blur', onBlur);

    const trailPool = new TrailParticlePool(180);
    let lastTime = performance.now();
    let animId = 0;
    let isRunning = false;

    // Offscreen cache for static architectural studio background & spotlights
    const bgCacheCanvas = document.createElement('canvas');
    let bgCacheKey = '';

    const ensureStaticBackgroundCache = (night: boolean) => {
      const nextKey = `${width}_${height}_${dpr}_${night ? 'night' : 'day'}`;
      if (bgCacheKey === nextKey && bgCacheCanvas.width > 0) return;
      bgCacheKey = nextKey;
      bgCacheCanvas.width = Math.max(1, Math.floor(width * dpr));
      bgCacheCanvas.height = Math.max(1, Math.floor(height * dpr));
      const bCtx = bgCacheCanvas.getContext('2d');
      if (!bCtx) return;

      bCtx.setTransform(1, 0, 0, 1, 0, 0);
      bCtx.scale(dpr, dpr);

      const cx = width / 2;
      const cy = height * 0.54;
      const horizonY = height * 0.34;

      const bgLinear = bCtx.createLinearGradient(0, 0, 0, height);
      if (night) {
        bgLinear.addColorStop(0, '#02040A');
        bgLinear.addColorStop(0.38, '#060D1E');
        bgLinear.addColorStop(0.7, '#09142B');
        bgLinear.addColorStop(1, '#03060F');
      } else {
        bgLinear.addColorStop(0, '#BAE6FD');
        bgLinear.addColorStop(0.32, '#E0F2FE');
        bgLinear.addColorStop(0.49, '#F8FAFC');
        bgLinear.addColorStop(0.51, '#E2E8F0');
        bgLinear.addColorStop(0.82, '#CBD5E1');
        bgLinear.addColorStop(1, '#94A3B8');
      }
      bCtx.fillStyle = bgLinear;
      bCtx.fillRect(0, 0, width, height);

      if (!night) {
        const sunGlow = bCtx.createRadialGradient(
          cx,
          horizonY * 0.32,
          20,
          cx,
          horizonY * 0.32,
          width * 0.55
        );
        sunGlow.addColorStop(0, 'rgba(254, 249, 195, 0.85)');
        sunGlow.addColorStop(0.38, 'rgba(253, 224, 71, 0.25)');
        sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        bCtx.fillStyle = sunGlow;
        bCtx.fillRect(0, 0, width, height);

        bCtx.save();
        bCtx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        bCtx.lineWidth = 1.5;
        const pillarSpan = Math.max(140, Math.floor(width / 9));
        for (let px = cx % pillarSpan; px < width; px += pillarSpan) {
          bCtx.beginPath();
          bCtx.moveTo(px, 0);
          bCtx.lineTo(px, horizonY);
          bCtx.stroke();
        }
        bCtx.restore();
      } else {
        const ambientCyan = bCtx.createRadialGradient(
          cx,
          cy - 20,
          40,
          cx,
          cy - 20,
          width * 0.58
        );
        ambientCyan.addColorStop(0, 'rgba(0, 240, 255, 0.17)');
        ambientCyan.addColorStop(0.45, 'rgba(14, 165, 233, 0.06)');
        ambientCyan.addColorStop(1, 'rgba(0, 0, 0, 0)');
        bCtx.fillStyle = ambientCyan;
        bCtx.fillRect(0, 0, width, height);

        const ambientGold = bCtx.createRadialGradient(
          cx,
          horizonY,
          10,
          cx,
          horizonY,
          width * 0.44
        );
        ambientGold.addColorStop(0, 'rgba(245, 158, 11, 0.11)');
        ambientGold.addColorStop(0.5, 'rgba(217, 119, 6, 0.04)');
        ambientGold.addColorStop(1, 'rgba(0, 0, 0, 0)');
        bCtx.fillStyle = ambientGold;
        bCtx.fillRect(0, 0, width, height);
      }

      // Horizon glowing separator line
      const horizonLineGrad = bCtx.createLinearGradient(0, horizonY, width, horizonY);
      if (night) {
        horizonLineGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        horizonLineGrad.addColorStop(0.25, 'rgba(56, 189, 248, 0.20)');
        horizonLineGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.30)');
        horizonLineGrad.addColorStop(0.75, 'rgba(56, 189, 248, 0.20)');
        horizonLineGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      } else {
        horizonLineGrad.addColorStop(0, 'rgba(14, 165, 233, 0)');
        horizonLineGrad.addColorStop(0.25, 'rgba(2, 132, 199, 0.35)');
        horizonLineGrad.addColorStop(0.5, 'rgba(217, 119, 6, 0.45)');
        horizonLineGrad.addColorStop(0.75, 'rgba(2, 132, 199, 0.35)');
        horizonLineGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
      }
      bCtx.strokeStyle = horizonLineGrad;
      bCtx.lineWidth = night ? 1.2 : 1.8;
      bCtx.beginPath();
      bCtx.moveTo(0, horizonY);
      bCtx.lineTo(width, horizonY);
      bCtx.stroke();

      // Static radial perspective rays on floor
      bCtx.save();
      bCtx.beginPath();
      bCtx.rect(0, horizonY, width, height - horizonY);
      bCtx.clip();
      bCtx.strokeStyle = night ? 'rgba(56, 189, 248, 0.06)' : 'rgba(15, 23, 42, 0.08)';
      bCtx.lineWidth = 1;
      const numRays = 20;
      for (let i = -numRays; i <= numRays; i++) {
        const bottomX = cx + i * 135;
        bCtx.beginPath();
        bCtx.moveTo(cx + i * 22, horizonY);
        bCtx.lineTo(bottomX, height);
        bCtx.stroke();
      }
      bCtx.restore();
    };

    const loop = (nowMs: number) => {
      if (!activeRef.current) {
        isRunning = false;
        return;
      }
      animId = requestAnimationFrame(loop);
      const dt = Math.min(0.06, (nowMs - lastTime) / 1000);
      lastTime = nowMs;
      const nowSec = nowMs / 1000;

      const night = isNightRef.current;
      ensureStaticBackgroundCache(night);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(bgCacheCanvas, 0, 0);
      ctx.scale(dpr, dpr);

      const cx = width / 2;
      const cy = height * 0.54;
      const horizonY = height * 0.34;

      // Calculate smooth transition factor when switching cars
      const transElapsed = nowMs - transitionRef.current.startMs;
      const transT =
        transitionRef.current.startMs > 0
          ? Math.min(1, Math.max(0, transElapsed / transitionRef.current.durationMs))
          : 1;
      // Ease out cubic
      const transEase = 1 - Math.pow(1 - transT, 3);
      const carFadeAlpha = 0.18 + 0.82 * transEase;
      const carScaleLerp = 0.88 + 0.12 * transEase;

      if (transitionRef.current.spinBoost > 0.001) {
        showcase.angle += transitionRef.current.spinBoost * dt * 4.2;
        transitionRef.current.spinBoost *= Math.pow(0.04, dt);
      }

      // =======================================================================
      // 2. DISTANT BLURRED SPEED TRACK & 3D PERSPECTIVE FLOOR HORIZONTAL LINES
      // =======================================================================
      ctx.save();
      for (const st of speedStreaks) {
        st.x += st.speed * dt;
        if (st.x - st.length > width) {
          st.x = -st.length;
        }
        ctx.strokeStyle = st.isGold
          ? night
            ? `rgba(245, 158, 11, ${st.alpha})`
            : `rgba(217, 119, 6, ${st.alpha * 1.4})`
          : night
          ? `rgba(56, 189, 248, ${st.alpha})`
          : `rgba(2, 132, 199, ${st.alpha * 1.4})`;
        ctx.lineWidth = st.isGold ? 2 : 1.5;
        ctx.beginPath();
        ctx.moveTo(st.x - st.length, st.y);
        ctx.lineTo(st.x, st.y);
        ctx.stroke();
      }

      const gridScroll = (nowSec * 0.25) % 1;
      for (let j = 0; j < 12; j++) {
        const t = (j + gridScroll) / 12;
        const yPos = horizonY + Math.pow(t, 1.95) * (height - horizonY);
        ctx.strokeStyle = night
          ? `rgba(56, 189, 248, ${0.018 + t * 0.075})`
          : `rgba(2, 132, 199, ${0.04 + t * 0.12})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yPos);
        ctx.lineTo(width, yPos);
        ctx.stroke();
      }
      ctx.restore();

      // =======================================================================
      // 3. GIANT WATERMARK (CAR NAME & CLASS TIER) BEHIND PEDESTAL + FAINT TELEMETRY
      // =======================================================================
      const resolvedPart =
        ALL_PARTS.find((p) => p.id === loadoutRef.current.chassis) || ALL_PARTS[0];
      const resolvedClass = calculateCarClass(loadoutRef.current);
      const watermarkName = (carNameRef.current || resolvedPart.name).toUpperCase();
      const watermarkTier = (carTierRef.current || resolvedClass.tier).toUpperCase();

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Very large, low-opacity watermark behind the pedestal
      const tierFontSize = Math.min(150, Math.max(68, Math.floor(width * 0.095)));
      const nameFontSize = Math.min(76, Math.max(32, Math.floor(width * 0.048)));

      ctx.font = `900 ${tierFontSize}px "Chakra Petch", "Be Vietnam Pro", sans-serif`;
      ctx.fillStyle = night
        ? `rgba(250, 204, 21, ${0.048 * carFadeAlpha})`
        : `rgba(15, 23, 42, ${0.055 * carFadeAlpha})`;
      ctx.strokeStyle = night
        ? `rgba(56, 189, 248, ${0.07 * carFadeAlpha})`
        : `rgba(2, 132, 199, ${0.12 * carFadeAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.fillText(`CLASS ${watermarkTier}`, cx, horizonY - tierFontSize * 0.42);
      ctx.strokeText(`CLASS ${watermarkTier}`, cx, horizonY - tierFontSize * 0.42);

      ctx.font = `900 ${nameFontSize}px "Be Vietnam Pro", "Chakra Petch", sans-serif`;
      ctx.fillStyle = night
        ? `rgba(226, 232, 240, ${0.055 * carFadeAlpha})`
        : `rgba(30, 41, 59, ${0.075 * carFadeAlpha})`;
      ctx.fillText(watermarkName, cx, horizonY + nameFontSize * 0.22);

      // Ultra-faint telemetry text positioned away from spotlight beams so they never clash
      ctx.font = '600 9px "Chakra Petch", sans-serif';
      ctx.fillStyle = night ? 'rgba(56, 189, 248, 0.05)' : 'rgba(2, 132, 199, 0.18)';
      ctx.textAlign = 'left';
      ctx.fillText(
        night ? 'SYS_SHOWROOM :: NIGHT_HANGAR' : 'SYS_SHOWROOM :: DAY_ATRIUM',
        cx - 380,
        horizonY - 10
      );
      ctx.textAlign = 'right';
      ctx.fillStyle = night ? 'rgba(245, 158, 11, 0.05)' : 'rgba(217, 119, 6, 0.18)';
      ctx.fillText('AERO_STAGE :: HORIZON', cx + 380, horizonY - 10);
      ctx.restore();

      // =======================================================================
      // 4. CEILING GARAGE SPOTLIGHTS (TOP-DOWN VOLUMETRIC BEAMS)
      // =======================================================================
      ctx.save();
      const centerSpot = ctx.createLinearGradient(cx, 0, cx, cy + 130);
      if (night) {
        centerSpot.addColorStop(0, 'rgba(125, 211, 252, 0.18)');
        centerSpot.addColorStop(0.55, 'rgba(56, 189, 248, 0.065)');
        centerSpot.addColorStop(1, 'rgba(56, 189, 248, 0)');
      } else {
        centerSpot.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
        centerSpot.addColorStop(0.55, 'rgba(254, 240, 138, 0.18)');
        centerSpot.addColorStop(1, 'rgba(255, 255, 255, 0)');
      }
      ctx.fillStyle = centerSpot;
      ctx.beginPath();
      ctx.moveTo(cx - 75, 0);
      ctx.lineTo(cx - 370, cy + 100);
      ctx.lineTo(cx + 370, cy + 100);
      ctx.lineTo(cx + 75, 0);
      ctx.closePath();
      ctx.fill();

      const goldSpot = ctx.createLinearGradient(cx, 0, cx, cy + 90);
      if (night) {
        goldSpot.addColorStop(0, 'rgba(253, 224, 71, 0.09)');
        goldSpot.addColorStop(0.6, 'rgba(245, 158, 11, 0.035)');
        goldSpot.addColorStop(1, 'rgba(245, 158, 11, 0)');
      } else {
        goldSpot.addColorStop(0, 'rgba(253, 224, 71, 0.28)');
        goldSpot.addColorStop(0.6, 'rgba(14, 165, 233, 0.08)');
        goldSpot.addColorStop(1, 'rgba(14, 165, 233, 0)');
      }
      ctx.fillStyle = goldSpot;
      ctx.beginPath();
      ctx.moveTo(cx - 32, 0);
      ctx.lineTo(cx - 220, cy + 65);
      ctx.lineTo(cx + 220, cy + 65);
      ctx.lineTo(cx + 32, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // =======================================================================
      // 5. 1.6X ENLARGED 3D TURNTABLE AT 3/4 CAMERA PITCH (30-35 DEGREES)
      // =======================================================================
      const isNitro = showcase.nitroTimer > 0;
      if (showcase.nitroTimer > 0) showcase.nitroTimer -= dt;

      if (keys.has('KeyA') || keys.has('ArrowLeft')) {
        showcase.angle -= 1.85 * dt;
      } else if (keys.has('KeyD') || keys.has('ArrowRight')) {
        showcase.angle += 1.85 * dt;
      } else {
        showcase.angle += showcase.angularVel * dt;
      }

      // Scale factor responsive to viewport while ~1.6x larger on desktop
      const responsiveScale = Math.min(1, Math.max(0.62, width / 1400));
      const podRx = 288 * responsiveScale; // 180 * 1.6 = 288
      const pitchRatio = 0.54; // sin(32.7°) ≈ 0.54 -> authentic 30-35° 3/4 camera angle
      const podRy = podRx * pitchRatio;
      const podDepth = 28 * responsiveScale;
      const podCenterY = cy + 34 * responsiveScale;

      ctx.save();
      ctx.translate(cx, podCenterY);

      // 5A. Deep Floor Neon Underglow / Studio Contact Shadow Aura
      const underGlow = ctx.createRadialGradient(0, 14, 30, 0, 14, podRx * 1.45);
      if (isNitro) {
        underGlow.addColorStop(0, 'rgba(245, 158, 11, 0.65)');
        underGlow.addColorStop(0.5, 'rgba(0, 240, 255, 0.32)');
        underGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (night) {
        underGlow.addColorStop(0, 'rgba(0, 240, 255, 0.44)');
        underGlow.addColorStop(0.45, 'rgba(14, 165, 233, 0.20)');
        underGlow.addColorStop(0.75, 'rgba(245, 158, 11, 0.08)');
        underGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        underGlow.addColorStop(0, 'rgba(15, 23, 42, 0.32)');
        underGlow.addColorStop(0.5, 'rgba(2, 132, 199, 0.18)');
        underGlow.addColorStop(0.8, 'rgba(245, 158, 11, 0.08)');
        underGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      }
      ctx.fillStyle = underGlow;
      ctx.beginPath();
      ctx.ellipse(0, 16, podRx * 1.42, podRy * 1.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // 5B. Outer Floor Hologram Pulse Ring
      const pulseScale = 1 + ((nowSec * 0.42) % 1) * 0.2;
      const pulseAlpha = (1 - ((nowSec * 0.42) % 1)) * (night ? 0.35 : 0.45);
      ctx.strokeStyle = night
        ? `rgba(56, 189, 248, ${pulseAlpha})`
        : `rgba(2, 132, 199, ${pulseAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 10, podRx * pulseScale, podRy * pulseScale, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 5C. Lower 3D Pedestal Chassis Wall (3D Cylinder Side)
      const sideGrad = ctx.createLinearGradient(-podRx, 0, podRx, 0);
      if (night) {
        sideGrad.addColorStop(0, '#030712');
        sideGrad.addColorStop(0.22, '#0F172A');
        sideGrad.addColorStop(0.5, '#1E293B');
        sideGrad.addColorStop(0.78, '#0F172A');
        sideGrad.addColorStop(1, '#030712');
      } else {
        sideGrad.addColorStop(0, '#475569');
        sideGrad.addColorStop(0.22, '#94A3B8');
        sideGrad.addColorStop(0.5, '#F1F5F9');
        sideGrad.addColorStop(0.78, '#94A3B8');
        sideGrad.addColorStop(1, '#475569');
      }
      ctx.fillStyle = sideGrad;
      ctx.beginPath();
      ctx.ellipse(0, podDepth, podRx, podRy, 0, 0, Math.PI);
      ctx.lineTo(-podRx, 0);
      ctx.ellipse(0, 0, podRx, podRy, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();

      // 3D Pedestal Side Neon LED Strip
      const ledGrad = ctx.createLinearGradient(-podRx, 0, podRx, 0);
      if (night) {
        ledGrad.addColorStop(0, 'rgba(56, 189, 248, 0.2)');
        ledGrad.addColorStop(0.3, '#00F0FF');
        ledGrad.addColorStop(0.5, '#FACC15');
        ledGrad.addColorStop(0.7, '#00F0FF');
        ledGrad.addColorStop(1, 'rgba(56, 189, 248, 0.2)');
      } else {
        ledGrad.addColorStop(0, 'rgba(2, 132, 199, 0.25)');
        ledGrad.addColorStop(0.3, '#0284C7');
        ledGrad.addColorStop(0.5, '#D97706');
        ledGrad.addColorStop(0.7, '#0284C7');
        ledGrad.addColorStop(1, 'rgba(2, 132, 199, 0.25)');
      }
      ctx.strokeStyle = ledGrad;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(
        0,
        podDepth * 0.55,
        podRx * 0.995,
        podRy * 0.995,
        0,
        0.04 * Math.PI,
        0.96 * Math.PI
      );
      ctx.stroke();

      // Bottom Rim Highlight
      ctx.strokeStyle = night ? 'rgba(56, 189, 248, 0.45)' : 'rgba(2, 132, 199, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, podDepth, podRx, podRy, 0, 0, Math.PI);
      ctx.stroke();

      // 5D. Main 3D Showroom Pod Deck Surface (Glossy Reflective Floor)
      const deckGrad = ctx.createRadialGradient(0, -14, 18, 0, 0, podRx);
      if (night) {
        deckGrad.addColorStop(0, '#162A4A');
        deckGrad.addColorStop(0.55, '#091326');
        deckGrad.addColorStop(0.88, '#050A14');
        deckGrad.addColorStop(1, '#0F1E38');
      } else {
        deckGrad.addColorStop(0, '#FFFFFF');
        deckGrad.addColorStop(0.52, '#E2E8F0');
        deckGrad.addColorStop(0.86, '#CBD5E1');
        deckGrad.addColorStop(1, '#94A3B8');
      }
      ctx.fillStyle = deckGrad;
      ctx.strokeStyle = night ? '#38BDF8' : '#0284C7';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, podRx, podRy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 5E. Perspective Rotating Hologram Rings & Energy Arcs on Deck
      ctx.save();
      ctx.scale(1, pitchRatio);

      // Outer segmented energy ring
      ctx.save();
      ctx.rotate(nowSec * 0.32);
      ctx.strokeStyle = night ? 'rgba(56, 189, 248, 0.55)' : 'rgba(2, 132, 199, 0.65)';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([34, 16, 10, 16]);
      ctx.beginPath();
      ctx.arc(0, 0, podRx * 0.89, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Counter-rotating Gold Telemetry Ring
      ctx.save();
      ctx.rotate(-nowSec * 0.45);
      ctx.strokeStyle = night ? 'rgba(245, 158, 11, 0.65)' : 'rgba(217, 119, 6, 0.75)';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([22, 26]);
      ctx.beginPath();
      ctx.arc(0, 0, podRx * 0.76, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Inner Glowing Core Platform Ring
      ctx.strokeStyle = isNitro
        ? 'rgba(250, 204, 21, 0.85)'
        : night
        ? 'rgba(0, 240, 255, 0.75)'
        : 'rgba(2, 132, 199, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, podRx * 0.58, 0, Math.PI * 2);
      ctx.stroke();

      // Orbiting Bright Light Streaks around the car's base
      for (let k = 0; k < 3; k++) {
        const arcStart = nowSec * 1.5 + (k * Math.PI * 2) / 3;
        ctx.strokeStyle =
          k === 0
            ? night
              ? '#FACC15'
              : '#D97706'
            : night
            ? '#00F0FF'
            : '#0284C7';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(0, 0, podRx * 0.67, arcStart, arcStart + 0.45);
        ctx.stroke();
      }

      ctx.restore(); // end perspective scale

      // 5F. Rising 3D Hologram Projection Cylinder around the Center Car
      const holoHeight = 190 * responsiveScale;
      const holoGrad = ctx.createLinearGradient(0, 0, 0, -holoHeight);
      holoGrad.addColorStop(
        0,
        isNitro
          ? 'rgba(245, 158, 11, 0.20)'
          : night
          ? 'rgba(0, 240, 255, 0.16)'
          : 'rgba(14, 165, 233, 0.14)'
      );
      holoGrad.addColorStop(
        0.45,
        night ? 'rgba(56, 189, 248, 0.045)' : 'rgba(254, 240, 138, 0.06)'
      );
      holoGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = holoGrad;
      ctx.beginPath();
      ctx.moveTo(-podRx * 0.76, 0);
      ctx.lineTo(-podRx * 0.9, -holoHeight);
      ctx.lineTo(podRx * 0.9, -holoHeight);
      ctx.lineTo(podRx * 0.76, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore(); // end pod translation

      // =======================================================================
      // 6. TRUE 3D VOLUMETRIC HERO CAR (MULTI-SLICE 3D BODY + 3D CABIN & WING)
      // =======================================================================
      const heroCarScale = 3.85 * responsiveScale * carScaleLerp;
      // Floating 3D bobbing motion
      const hoverBob = Math.sin(nowSec * 2.3) * 4.5 * responsiveScale;
      const carBaseY = cy + 6 * responsiveScale + hoverBob;
      // Natural 3/4 perspective tilt that never squishes the car flat
      const tiltY = 0.84;
      const zScale = heroCarScale * 0.78;
      const cosA = Math.cos(showcase.angle);
      const sinA = Math.sin(showcase.angle);

      // Exact 3D car-space to screen-space projection matching drawModularCar transform
      const projectCar3D = (lx: number, ly: number, lz: number) => {
        const rx = lx * cosA - ly * sinA;
        const ry = lx * sinA + ly * cosA;
        return {
          x: cx + rx * heroCarScale,
          y: carBaseY - lz * zScale + ry * heroCarScale * tiltY,
        };
      };

      // Resolve accent color from current loadout for 3D cabin rails & wing trim
      const chassisKey =
        ALL_PARTS.find((p) => p.id === loadoutRef.current.chassis)?.visualKey || 'kart';
      const paintKey =
        ALL_PARTS.find((p) => p.id === loadoutRef.current.paint)?.visualKey || 'solid_red';
      const spoilerKey =
        ALL_PARTS.find((p) => p.id === loadoutRef.current.spoiler)?.visualKey || 'none';

      const trimAccent =
        paintKey === 'gold24k' || paintKey === 't1_royal'
          ? '#FACC15'
          : paintKey === 'tripled_bark' || chassisKey === 'tripled_elderwood'
          ? '#34D399'
          : paintKey === 'project_neon'
          ? '#EC4899'
          : paintKey === 'pool_aqua'
          ? '#38BDF8'
          : paintKey === 'amethyst'
          ? '#C084FC'
          : '#38BDF8';

      // 6A. Soft Blurred Reflection of the 3D Car on the Glossy Pedestal Deck
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, podCenterY, podRx * 0.95, podRy * 0.95, 0, 0, Math.PI * 2);
      ctx.clip();

      ctx.translate(cx, podCenterY + 24 * responsiveScale - hoverBob * 0.35);
      ctx.scale(1, -tiltY * 0.55);
      ctx.globalAlpha = 0.2 * carFadeAlpha;
      drawModularCar(ctx, loadoutRef.current, {
        x: 0,
        y: 0,
        angle: showcase.angle,
        scale: heroCarScale * 0.95,
        nowSec,
        drifting: false,
        nitroActive: isNitro,
        isPlayer: false,
        showHeadlightBeams: false,
      });
      ctx.restore();

      // 6B. Grounded 3D Pedestal Contact Shadow + Floating Levitation Halo
      ctx.save();
      ctx.translate(cx, podCenterY + 2 * responsiveScale);
      ctx.scale(1, pitchRatio);
      ctx.rotate(showcase.angle);
      const shadowRx = 138 * responsiveScale * carScaleLerp;
      const shadowRy = 78 * responsiveScale * carScaleLerp;
      const carShadow = ctx.createRadialGradient(0, 0, 14, 0, 0, shadowRx * 1.18);
      carShadow.addColorStop(0, `rgba(0, 0, 0, ${0.88 * carFadeAlpha})`);
      carShadow.addColorStop(0.6, `rgba(0, 0, 0, ${0.48 * carFadeAlpha})`);
      carShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = carShadow;
      ctx.beginPath();
      ctx.roundRect(-shadowRx, -shadowRy, shadowRx * 2, shadowRy * 2, 40);
      ctx.fill();

      // Subtle cyan/gold levitation ring directly under the car shadow
      ctx.strokeStyle = isNitro
        ? `rgba(250, 204, 21, ${0.55 * carFadeAlpha})`
        : `rgba(56, 189, 248, ${0.42 * carFadeAlpha})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.ellipse(0, 0, shadowRx * 0.85, shadowRy * 0.85, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 6C. Realtime Nitro Trail Pool
      trailPool.updateAndDraw(ctx, dt);
      if (isNitro) {
        const exhaust3D = projectCar3D(-24, 0, 3.5);
        trailPool.spawnFromCar(
          exhaust3D.x,
          exhaust3D.y,
          showcase.angle,
          145 * responsiveScale,
          true,
          loadoutRef.current.trail,
          nowSec
        );
      }

      // 6D. Multi-Layer Volumetric 3D Car Stack (22 Seamless Z-Slices + 3D Wheels + 3D Cabin + 3D Wing)
      ctx.save();
      ctx.globalAlpha = carFadeAlpha;

      // Step 1: 3D Volumetric Lower Wheel Cylinders (lz = 0 to 3.6) so tires have real 3D height
      if (chassisKey !== 'ufo') {
        const wheelCoords = [
          { lx: 13, ly: -14.2 },
          { lx: 13, ly: 14.2 },
          { lx: -13, ly: -14.2 },
          { lx: -13, ly: 14.2 },
        ];
        for (const wc of wheelCoords) {
          for (let wz = 0; wz <= 3.6; wz += 1.8) {
            const wp = projectCar3D(wc.lx, wc.ly, wz);
            ctx.save();
            ctx.translate(wp.x, wp.y);
            ctx.scale(1, tiltY);
            ctx.rotate(showcase.angle);
            ctx.fillStyle = wz < 1.2 ? '#020617' : '#0F172A';
            ctx.strokeStyle = wz >= 2.6 ? trimAccent : '#1E293B';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(
              -6.8 * heroCarScale,
              -4.0 * heroCarScale,
              13.6 * heroCarScale,
              8.0 * heroCarScale,
              2.5 * heroCarScale
            );
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // Step 2: 2 Volumetric 3D Chassis Extrusion Slices (lz = 2.4 to 5.6) without heavy GPU ctx.filter
      const bodySlices = [
        { lz: 2.4, scale: 1.008, alpha: 0.42 },
        { lz: 5.6, scale: 0.995, alpha: 0.85 },
      ];
      for (const slice of bodySlices) {
        const sliceY = carBaseY - slice.lz * zScale;
        ctx.save();
        ctx.translate(cx, sliceY);
        ctx.scale(1, tiltY);
        ctx.globalAlpha = carFadeAlpha * slice.alpha;
        drawModularCar(ctx, loadoutRef.current, {
          x: 0,
          y: 0,
          angle: showcase.angle,
          scale: heroCarScale * slice.scale,
          nowSec,
          drifting: false,
          nitroActive: false,
          isPlayer: false,
          showHeadlightBeams: false,
        });
        ctx.restore();
      }

      // Step 3: Top Main Deck Pass at lz = 8.0 (Crisp Paint, Decals, Underglow & Headlights)
      const topDeckLz = 8.0;
      ctx.save();
      ctx.translate(cx, carBaseY - topDeckLz * zScale);
      ctx.scale(1, tiltY);
      drawModularCar(ctx, loadoutRef.current, {
        x: 0,
        y: 0,
        angle: showcase.angle,
        scale: heroCarScale * 0.98,
        nowSec,
        drifting: false,
        nitroActive: isNitro,
        isPlayer: true,
        showHeadlightBeams: night,
      });
      ctx.restore();

      // Step 4: 3D Volumetric Front LED Headlights & Rear Tail Light Bar on the Vertical Body Wall
      const drawQuad3D = (
        p1: { x: number; y: number },
        p2: { x: number; y: number },
        p3: { x: number; y: number },
        p4: { x: number; y: number },
        fill: string | CanvasGradient,
        stroke?: string,
        lineWidth = 1.5
      ) => {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      };

      // 3D Rear Taillight Glowing Strip (visible when rear faces camera)
      if (cosA < 0.35) {
        const rl1 = projectCar3D(-24.2, -9.5, 4.2);
        const rl2 = projectCar3D(-24.2, 9.5, 4.2);
        const rl3 = projectCar3D(-23.8, 9.5, 6.6);
        const rl4 = projectCar3D(-23.8, -9.5, 6.6);
        drawQuad3D(
          rl1,
          rl2,
          rl3,
          rl4,
          isNitro ? '#38BDF8' : '#F43F5E',
          '#FECDD3',
          1.2
        );
      }

      // 3D Front Nose Splitter & Glowing LED Headlight Strips (visible when front faces camera)
      if (cosA > -0.35) {
        // Left 3D Headlight
        const hlL1 = projectCar3D(24.2, -9.8, 4.5);
        const hlL2 = projectCar3D(25.2, -4.8, 4.2);
        const hlL3 = projectCar3D(24.6, -4.8, 6.5);
        const hlL4 = projectCar3D(23.6, -9.8, 6.8);
        drawQuad3D(hlL1, hlL2, hlL3, hlL4, '#E0F2FE', '#38BDF8', 1.2);

        // Right 3D Headlight
        const hlR1 = projectCar3D(25.2, 4.8, 4.2);
        const hlR2 = projectCar3D(24.2, 9.8, 4.5);
        const hlR3 = projectCar3D(23.6, 9.8, 6.8);
        const hlR4 = projectCar3D(24.6, 4.8, 6.5);
        drawQuad3D(hlR1, hlR2, hlR3, hlR4, '#E0F2FE', '#38BDF8', 1.2);
      }

      // Step 5: 3D Sculpted Elevated Cockpit / Glass Canopy Dome (lz = 8.0 to 13.2)
      // Gives the car unmistakable 3D height and realistic supercar greenhouse geometry!
      const baseFL = projectCar3D(9.5, -7.8, 8.0);
      const baseFR = projectCar3D(9.5, 7.8, 8.0);
      const baseRL = projectCar3D(-11.5, -8.2, 8.0);
      const baseRR = projectCar3D(-11.5, 8.2, 8.0);

      const roofFL = projectCar3D(2.5, -5.6, 12.8);
      const roofFR = projectCar3D(2.5, 5.6, 12.8);
      const roofRL = projectCar3D(-8.5, -5.8, 12.4);
      const roofRR = projectCar3D(-8.5, 5.8, 12.4);

      // Painter's algorithm sorting for the 4 side faces of the 3D cabin
      const cabinFaces = [
        {
          id: 'front',
          depth: cosA,
          p1: baseFL,
          p2: baseFR,
          p3: roofFR,
          p4: roofFL,
          fill: 'rgba(14, 165, 233, 0.42)',
        },
        {
          id: 'rear',
          depth: -cosA,
          p1: baseRR,
          p2: baseRL,
          p3: roofRL,
          p4: roofRR,
          fill: 'rgba(15, 23, 42, 0.78)',
        },
        {
          id: 'left',
          depth: -sinA,
          p1: baseRL,
          p2: baseFL,
          p3: roofFL,
          p4: roofRL,
          fill: 'rgba(30, 58, 138, 0.52)',
        },
        {
          id: 'right',
          depth: sinA,
          p1: baseFR,
          p2: baseRR,
          p3: roofRR,
          p4: roofFR,
          fill: 'rgba(30, 58, 138, 0.52)',
        },
      ].sort((a, b) => a.depth - b.depth);

      for (const face of cabinFaces) {
        drawQuad3D(face.p1, face.p2, face.p3, face.p4, face.fill, trimAccent, 1.4);

        // Specular diagonal glass reflection on windshield & side windows
        if (face.id === 'front' || face.depth > 0) {
          ctx.save();
          ctx.strokeStyle = 'rgba(224, 242, 254, 0.45)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(
            (face.p1.x * 0.7 + face.p2.x * 0.3),
            (face.p1.y * 0.7 + face.p2.y * 0.3)
          );
          ctx.lineTo(
            (face.p4.x * 0.6 + face.p3.x * 0.4),
            (face.p4.y * 0.6 + face.p3.y * 0.4)
          );
          ctx.stroke();
          ctx.restore();
        }
      }

      // 3D Cabin Roof Top Cap (lz = 12.8)
      const roofGrad = ctx.createLinearGradient(roofFL.x, roofFL.y, roofRR.x, roofRR.y);
      roofGrad.addColorStop(0, '#1E293B');
      roofGrad.addColorStop(0.5, '#0F172A');
      roofGrad.addColorStop(1, '#334155');
      drawQuad3D(roofFL, roofFR, roofRR, roofRL, roofGrad, trimAccent, 1.8);

      // Roof Air Scoop on Top of 3D Cabin
      const scoopF = projectCar3D(1.5, 0, 13.6);
      const scoopL = projectCar3D(-3.5, -2.1, 13.1);
      const scoopR = projectCar3D(-3.5, 2.1, 13.1);
      ctx.beginPath();
      ctx.moveTo(scoopF.x, scoopF.y);
      ctx.lineTo(scoopL.x, scoopL.y);
      ctx.lineTo(scoopR.x, scoopR.y);
      ctx.closePath();
      ctx.fillStyle = trimAccent;
      ctx.fill();

      // Step 6: 3D Elevated Rear Aerodynamic Wing / Spoiler (lz = 8.0 to 14.8)
      if (spoilerKey !== 'none' || chassisKey !== 'kart') {
        const strutLBase = projectCar3D(-19.5, -6.2, 8.0);
        const strutLTop = projectCar3D(-21.5, -6.2, 14.2);
        const strutRBase = projectCar3D(-19.5, 6.2, 8.0);
        const strutRTop = projectCar3D(-21.5, 6.2, 14.2);

        // Vertical 3D Wing Pylons
        ctx.save();
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 4.5 * responsiveScale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(strutLBase.x, strutLBase.y);
        ctx.lineTo(strutLTop.x, strutLTop.y);
        ctx.moveTo(strutRBase.x, strutRBase.y);
        ctx.lineTo(strutRTop.x, strutRTop.y);
        ctx.stroke();

        ctx.strokeStyle = trimAccent;
        ctx.lineWidth = 2 * responsiveScale;
        ctx.beginPath();
        ctx.moveTo(strutLBase.x, strutLBase.y);
        ctx.lineTo(strutLTop.x, strutLTop.y);
        ctx.moveTo(strutRBase.x, strutRBase.y);
        ctx.lineTo(strutRTop.x, strutRTop.y);
        ctx.stroke();
        ctx.restore();

        // Elevated 3D Carbon & Neon Wing Blade at lz = 14.2
        const wingFL = projectCar3D(-18.2, -13.2, 14.2);
        const wingFR = projectCar3D(-18.2, 13.2, 14.2);
        const wingRL = projectCar3D(-24.2, -13.8, 14.8);
        const wingRR = projectCar3D(-24.2, 13.8, 14.8);

        // Wing underside thickness
        const wingBotFL = projectCar3D(-18.2, -13.2, 13.3);
        const wingBotFR = projectCar3D(-18.2, 13.2, 13.3);
        const wingBotRL = projectCar3D(-24.2, -13.8, 13.9);
        const wingBotRR = projectCar3D(-24.2, 13.8, 13.9);
        drawQuad3D(wingBotFL, wingBotFR, wingBotRR, wingBotRL, '#020617', '#1E293B', 1);

        // Main Wing Top Airfoil
        drawQuad3D(wingFL, wingFR, wingRR, wingRL, '#0F172A', trimAccent, 1.8);
      }

      // Transition Hologram Scan Ring on Car Change
      if (transT < 1) {
        ctx.save();
        ctx.translate(cx, carBaseY - 6 * zScale);
        const ringAlpha = (1 - transT) * 0.75;
        ctx.strokeStyle = `rgba(0, 240, 255, ${ringAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(
          0,
          (transT - 0.5) * 90 * responsiveScale,
          podRx * (0.55 + transT * 0.35),
          podRy * (0.55 + transT * 0.35),
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      // 6E. Slow-Drifting Luminous Dust Motes Around the Car & Pedestal (Zero per-frame Gradient Allocation)
      ctx.save();
      for (const dm of carDustMotes) {
        dm.angle += dm.speed * dt;
        dm.heightOffset += dm.vy * dt;
        if (dm.heightOffset < -165 * responsiveScale) {
          dm.heightOffset = 10;
        }
        const orbitRx = podRx * dm.radiusRatio;
        const orbitRy = podRy * dm.radiusRatio;
        const mx = cx + Math.cos(dm.angle) * orbitRx;
        const my = podCenterY + Math.sin(dm.angle) * orbitRy + dm.heightOffset;
        const pulse = 0.5 + 0.5 * Math.sin(nowSec * 2.4 + dm.phase);
        const alpha = dm.alpha * pulse * carFadeAlpha;

        ctx.fillStyle = dm.isGold
          ? `rgba(250, 204, 21, ${(alpha * 0.28).toFixed(2)})`
          : `rgba(56, 189, 248, ${(alpha * 0.28).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(mx, my, dm.size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = dm.isGold
          ? `rgba(254, 240, 138, ${alpha.toFixed(2)})`
          : `rgba(224, 242, 254, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(mx, my, dm.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 6F. Rotating Energy Ribbon in front of Car Base (3D Foreground Overlay)
      ctx.save();
      ctx.translate(cx, podCenterY);
      const frontArcPhase = (nowSec * 1.4) % (Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.42)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(
        0,
        -6,
        podRx * 0.72,
        podRy * 0.72,
        0,
        0.15 * Math.PI,
        0.85 * Math.PI
      );
      ctx.stroke();

      const nodeAngle =
        0.2 * Math.PI + ((Math.sin(frontArcPhase) + 1) * 0.5) * 0.6 * Math.PI;
      const nx = Math.cos(nodeAngle) * podRx * 0.72;
      const ny = Math.sin(nodeAngle) * podRy * 0.72 - 6;
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(nx, ny, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // =======================================================================
      // 7. AMBIENT CYBER ENERGY PARTICLES
      // =======================================================================
      ctx.save();
      for (const p of particles) {
        p.x += p.vx * dt + Math.sin(nowSec * 1.5 + p.phase) * 0.25;
        p.y += p.vy * dt;
        if (p.y < -20) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        const twinkle = 0.55 + 0.45 * Math.sin(nowSec * 3 + p.phase);
        const a = p.alpha * twinkle;
        ctx.fillStyle = p.isGold
          ? `rgba(250, 204, 21, ${a})`
          : `rgba(56, 189, 248, ${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const startLoopIfNeeded = () => {
      if (!activeRef.current || isRunning) return;
      isRunning = true;
      lastTime = performance.now();
      animId = requestAnimationFrame(loop);
    };

    wakeUpLoopRef.current = startLoopIfNeeded;
    startLoopIfNeeded();

    return () => {
      isRunning = false;
      wakeUpLoopRef.current = null;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full block pointer-events-none"
    />
  );
};



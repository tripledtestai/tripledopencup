import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Flame,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { drawModularCar, TrailParticlePool } from '../game/carRenderer';
import {
  extractGameKeysFromKeyDown,
  extractGameKeysFromKeyUp,
  isTypingInInput,
} from '../game/keyboard';
import { calculateTuningPhysics, distanceToSegment } from '../game/rules';
import { CarLoadout, Point2D, TuningLoadout } from '../game/types';
import { soundEngine } from '../services/sound';

interface LiveTuningTrackProps {
  cosmeticLoadout: CarLoadout;
  tuningLoadout: TuningLoadout;
  isPreviewing?: boolean;
  previewPartName?: string | null;
}

interface SkidMarkSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
}

const SURFACE_META: Record<
  'ASPHALT' | 'GRASS' | 'MUD' | 'ICE',
  { label: string; cls: string }
> = {
  ASPHALT: {
    label: 'Đường Nhựa',
    cls: 'bg-slate-900/90 text-slate-200 border-slate-600/80',
  },
  GRASS: {
    label: 'Bãi Cỏ (-Tốc)',
    cls: 'bg-emerald-950/90 text-[#34d399] border-[#34d399]/50',
  },
  MUD: {
    label: 'Bùn Lầy (-Tốc)',
    cls: 'bg-amber-950/90 text-[#fbbf24] border-[#fbbf24]/50',
  },
  ICE: {
    label: 'Băng Trơn (Trượt)',
    cls: 'bg-cyan-950/90 text-[#22d3ee] border-[#22d3ee]/50',
  },
};

export const LiveTuningTrack: React.FC<LiveTuningTrackProps> = ({
  cosmeticLoadout,
  tuningLoadout,
  isPreviewing = false,
  previewPartName = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cosmeticRef = useRef<CarLoadout>(cosmeticLoadout);
  const tuningRef = useRef<TuningLoadout>(tuningLoadout);

  // Cached physics parameters (read directly in animation frame without recomputing)
  const physRef = useRef(
    calculateTuningPhysics(tuningLoadout, {
      baseSpeed: 215,
      baseAccel: 280,
      baseTurn: 3.3,
      baseNitroTime: 2.0,
    })
  );

  // Direct DOM refs for 60FPS telemetry updates (no React re-render per frame)
  const kmhTextRef = useRef<HTMLSpanElement | null>(null);
  const nitroTextRef = useRef<HTMLSpanElement | null>(null);
  const driftBadgeRef = useRef<HTMLSpanElement | null>(null);
  const surfaceBadgeRef = useRef<HTMLSpanElement | null>(null);
  const statusBannerRef = useRef<HTMLDivElement | null>(null);

  const resetTriggerRef = useRef<boolean>(false);
  const nitroTriggerRef = useRef<boolean>(false);
  const stunTestTriggerRef = useRef<'banana' | 'rocket' | null>(null);

  const [showControlsHelp, setShowControlsHelp] = useState<boolean>(false);

  useEffect(() => {
    cosmeticRef.current = cosmeticLoadout;
  }, [cosmeticLoadout]);

  useEffect(() => {
    tuningRef.current = tuningLoadout;
    physRef.current = calculateTuningPhysics(tuningLoadout, {
      baseSpeed: 215,
      baseAccel: 280,
      baseTurn: 3.3,
      baseNitroTime: 2.0,
    });
  }, [tuningLoadout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    let width = canvas.clientWidth || 500;
    let height = canvas.clientHeight || 290;
    let dpr = window.devicePixelRatio || 1;

    // Build closed mini circuit waypoints scaled to canvas with slight 2.5D perspective compression
    const getTrackGeometry = (w: number, h: number) => {
      const cx = w * 0.5;
      const cy = h * 0.52;
      const rx = Math.max(145, w * 0.37);
      const ry = Math.max(76, h * 0.33);

      // 16 waypoints forming a technical circuit with a chicane curve
      const waypoints: Point2D[] = [];
      const count = 16;
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2;
        const indent = i === 12 ? 0.76 : i === 11 || i === 13 ? 0.88 : 1.0;
        waypoints.push({
          x: cx + Math.cos(t) * rx * indent,
          y: cy + Math.sin(t) * ry * indent,
        });
      }

      const roadHalfWidth = 35;
      const mudZone = {
        x: cx - rx * 0.55,
        y: cy + ry * 0.78,
        radius: 26,
      };
      const iceZone = {
        x: cx + rx * 0.62,
        y: cy - ry * 0.72,
        radius: 28,
      };
      const tireBarriers = [
        { x: cx, y: cy - ry * 0.76 + 26, radius: 11 },
        { x: cx + rx * 0.92, y: cy + 8, radius: 11 },
      ];

      return {
        cx,
        cy,
        rx,
        ry,
        waypoints,
        roadHalfWidth,
        mudZone,
        iceZone,
        tireBarriers,
      };
    };

    let currentGeom = getTrackGeometry(width, height);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.clientWidth || 500;
      height = canvas.clientHeight || 290;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      currentGeom = getTrackGeometry(width, height);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const initGeom = currentGeom;
    const car = {
      x: initGeom.waypoints[4].x,
      y: initGeom.waypoints[4].y,
      prevX: initGeom.waypoints[4].x,
      prevY: initGeom.waypoints[4].y,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      speed: 0,
      angularVelocity: 0,
      drifting: false,
      nitroCharge: 100,
      nitroTimer: 0,
      isBoostingNitro: false,
      spinTimer: 0,
      stunTimer: 0,
      mudTimer: 0,
      apexCurveTimer: 0,
      apexBoostTimer: 0,
    };

    const skidMarks: SkidMarkSegment[] = [];
    const keys = new Set<string>();
    const justPressed = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInInput(e.target)) return;
      const mapped = extractGameKeysFromKeyDown(e);
      if (mapped.length === 0) return;

      for (const code of mapped) {
        if (
          code === 'KeyW' ||
          code === 'KeyA' ||
          code === 'KeyS' ||
          code === 'KeyD' ||
          code === 'ArrowUp' ||
          code === 'ArrowDown' ||
          code === 'ArrowLeft' ||
          code === 'ArrowRight' ||
          code === 'Space' ||
          code === 'ShiftLeft' ||
          code === 'ShiftRight'
        ) {
          e.preventDefault();
          if (!keys.has(code)) justPressed.add(code);
          keys.add(code);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const mapped = extractGameKeysFromKeyUp(e);
      for (const code of mapped) {
        keys.delete(code);
      }
    };

    const onBlur = () => {
      keys.clear();
      justPressed.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    const trailPool = new TrailParticlePool(180);
    let lastTime = performance.now();
    let lastRender = 0;
    let hudTimer = 0;
    let animId = 0;

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      if (isHeadless && now - lastRender < 66) return;
      lastRender = now;

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const nowSec = now / 1000;

      const geom = currentGeom;
      const phys = physRef.current;

      if (resetTriggerRef.current) {
        resetTriggerRef.current = false;
        car.x = geom.waypoints[4].x;
        car.y = geom.waypoints[4].y;
        car.prevX = car.x;
        car.prevY = car.y;
        car.vx = 0;
        car.vy = 0;
        car.speed = 0;
        car.angle = Math.PI;
        car.spinTimer = 0;
        car.stunTimer = 0;
        car.apexCurveTimer = 0;
        car.apexBoostTimer = 0;
        car.nitroCharge = 100;
        skidMarks.length = 0;
      }

      const effectiveStunMul =
        phys.stunMultiplier *
        (phys.hasSteelReinforced ? 0.8 : 1.0) *
        (phys.hasTitanArmor ? 0.5 : 1.0);

      if (stunTestTriggerRef.current) {
        const kind = stunTestTriggerRef.current;
        stunTestTriggerRef.current = null;
        if (kind === 'banana') {
          const bananaMul = phys.hasBananaResist ? 0.6 : 1.0;
          car.spinTimer = 1.5 * effectiveStunMul * bananaMul;
          car.speed *= 0.35;
          soundEngine.playHazardHit();
        } else {
          car.stunTimer = 2.0 * effectiveStunMul;
          car.speed = 0;
          car.vx = 0;
          car.vy = 0;
          soundEngine.playExplosion();
        }
      }

      if (car.nitroTimer > 0) car.nitroTimer = Math.max(0, car.nitroTimer - dt);
      if (car.spinTimer > 0) car.spinTimer = Math.max(0, car.spinTimer - dt);
      if (car.stunTimer > 0) car.stunTimer = Math.max(0, car.stunTimer - dt);
      if (car.mudTimer > 0) car.mudTimer = Math.max(0, car.mudTimer - dt);
      if (car.apexBoostTimer > 0)
        car.apexBoostTimer = Math.max(0, car.apexBoostTimer - dt);

      const up = keys.has('KeyW') || keys.has('ArrowUp');
      const down = keys.has('KeyS') || keys.has('ArrowDown');
      const left = keys.has('KeyA') || keys.has('ArrowLeft');
      const right = keys.has('KeyD') || keys.has('ArrowRight');
      const wantsNitro =
        keys.has('Space') ||
        keys.has('ShiftLeft') ||
        keys.has('ShiftRight') ||
        nitroTriggerRef.current;

      if (nitroTriggerRef.current) {
        nitroTriggerRef.current = false;
        car.nitroTimer = phys.nitroDuration * 0.65;
        car.nitroCharge = Math.min(100, car.nitroCharge + 35);
      }

      if (
        (justPressed.has('Space') ||
          justPressed.has('ShiftLeft') ||
          justPressed.has('ShiftRight')) &&
        car.nitroCharge > 15
      ) {
        soundEngine.playBoost();
      }
      justPressed.clear();

      // Determine surface under car
      let minDist = Infinity;
      for (let i = 0; i < geom.waypoints.length; i++) {
        const a = geom.waypoints[i];
        const b = geom.waypoints[(i + 1) % geom.waypoints.length];
        const d = distanceToSegment({ x: car.x, y: car.y }, a, b).distance;
        if (d < minDist) minDist = d;
      }

      const onRoad = minDist <= geom.roadHalfWidth;
      const inMud =
        Math.hypot(car.x - geom.mudZone.x, car.y - geom.mudZone.y) <=
        geom.mudZone.radius;
      const inIce =
        Math.hypot(car.x - geom.iceZone.x, car.y - geom.iceZone.y) <=
        geom.iceZone.radius;

      if (inMud && !phys.hasAtpCore && !phys.hasOffroadPass) {
        car.mudTimer = Math.max(car.mudTimer, 0.25);
      }

      const surface: 'ASPHALT' | 'GRASS' | 'MUD' | 'ICE' = inMud
        ? 'MUD'
        : inIce
        ? 'ICE'
        : onRoad
        ? 'ASPHALT'
        : 'GRASS';

      // Nitro drain / recharge
      const nitroTimeRatio = Math.max(0.5, phys.nitroDuration / 2.0);
      const drainRate = 42 / nitroTimeRatio;

      if (
        wantsNitro &&
        (car.isBoostingNitro ? car.nitroCharge > 0 : car.nitroCharge > 15) &&
        car.stunTimer <= 0 &&
        car.spinTimer <= 0
      ) {
        car.isBoostingNitro = true;
        car.nitroCharge = Math.max(0, car.nitroCharge - drainRate * dt);
      } else {
        car.isBoostingNitro = false;
        const driftRecharge = 28 * (phys.hasCarbonGrip ? 1.25 : 1.0);
        const recharge =
          (car.drifting ? driftRecharge : 12) + (phys.hasEmPulse ? 6 : 0);
        car.nitroCharge = Math.min(100, car.nitroCharge + recharge * dt);
      }

      const hasActiveNitro = car.isBoostingNitro || car.nitroTimer > 0;
      const nitroPowerBoost =
        (1 + (0.20 + Math.max(0, phys.totals.nitro) * 0.0085)) *
        phys.nitroBoostSpeedMultiplier;

      let maxSpeed = phys.maxSpeed;
      if (hasActiveNitro) {
        maxSpeed *= nitroPowerBoost;
      }
      if (car.apexBoostTimer > 0) {
        maxSpeed *= phys.apexExitBoostBonus;
      }

      // Surface speed penalties (offroadPass grants 100% immunity on grass & mud)
      if (car.mudTimer > 0 && !phys.hasAtpCore && !phys.hasOffroadPass) {
        const effectiveMudPenalty =
          0.65 * (1 - phys.terrainPenaltyReduction);
        maxSpeed *= hasActiveNitro
          ? 0.85
          : Math.max(0.25, 1 - effectiveMudPenalty);
      } else if (!onRoad && !phys.hasOffroadPass) {
        const baseGrassPenalty = phys.hasGrassPenalty ? 0.72 : 0.45;
        const effectiveGrassPenalty =
          baseGrassPenalty * (1 - phys.terrainPenaltyReduction);
        maxSpeed *= hasActiveNitro
          ? 0.85
          : Math.max(0.25, 1 - effectiveGrassPenalty);
      }

      let accelInput = 0;
      let steerInput = 0;
      if (up || wantsNitro) accelInput = 1;
      else if (down) accelInput = -1;
      if (left) steerInput -= 1;
      if (right) steerInput += 1;

      // Apex Exit Mini-Boost ("Tâm điểm bám đường"): +8% speed on corner exit
      if (steerInput !== 0 && car.speed > phys.maxSpeed * 0.5) {
        car.apexCurveTimer = Math.min(1.5, car.apexCurveTimer + dt);
      } else {
        if (car.apexCurveTimer >= 0.2 && phys.totals.handling > 0) {
          car.apexBoostTimer = 0.75;
          car.speed = Math.min(maxSpeed * 1.08, car.speed * 1.08);
        }
        car.apexCurveTimer = 0;
      }

      car.prevX = car.x;
      car.prevY = car.y;

      if (
        phys.hasV12Reactor &&
        steerInput === 0 &&
        Math.abs(car.speed) > phys.maxSpeed * 0.8
      ) {
        maxSpeed *= 1.06;
      }

      if (car.stunTimer > 0) {
        car.speed = 0;
        car.vx = 0;
        car.vy = 0;
      } else if (car.spinTimer > 0) {
        car.angle += 12.5 * dt;
        car.speed *= Math.pow(0.25, dt);
      } else {
        const emLaunchMul =
          phys.hasEmPulse && Math.abs(car.speed) < phys.maxSpeed * 0.45
            ? 1.25
            : 1.0;
        const activeAccel =
          (hasActiveNitro
            ? phys.accel * 1.28 * phys.nitroBoostSpeedMultiplier
            : car.apexBoostTimer > 0
            ? phys.accel * 1.18
            : phys.accel) * emLaunchMul;
        if (accelInput > 0) {
          car.speed = Math.min(maxSpeed, car.speed + activeAccel * dt);
        } else if (accelInput < 0) {
          car.speed = Math.max(-105, car.speed - phys.accel * 0.9 * dt);
        } else {
          car.speed *= Math.pow(0.22, dt * phys.momentumDecayScale);
        }

        if (car.speed > maxSpeed) {
          car.speed = Math.max(
            maxSpeed,
            car.speed - 340 * phys.momentumDecayScale * dt
          );
        }

        if (steerInput !== 0 && Math.abs(car.speed) > 30) {
          car.speed *= Math.pow(phys.corneringRetention, dt * 60);
        }

        const effectiveTurnSpeed = hasActiveNitro
          ? phys.turnSpeed * phys.nitroTurnMultiplier
          : phys.turnSpeed;
        const absSpeed = Math.abs(car.speed);
        const speedTurnFactor = absSpeed < 5 ? 0 : Math.min(1.0, absSpeed / 70);
        const dirSign = car.speed >= -5 ? 1 : -1;
        const targetAngVel =
          steerInput * effectiveTurnSpeed * speedTurnFactor * dirSign;
        car.angularVelocity +=
          (targetAngVel - car.angularVelocity) * Math.min(1, 16 * dt);
        if (absSpeed >= 5) {
          car.angle += car.angularVelocity * dt;
        } else {
          car.angularVelocity = 0;
        }
      }

      car.drifting =
        Math.abs(car.speed) > 85 &&
        Math.abs(steerInput) > 0 &&
        car.spinTimer <= 0;

      const isSlipperyIce = inIce && !phys.hasIceImmune;
      const slideMul = car.drifting ? phys.driftGrip : 1.0;
      const nitroInertiaMul = hasActiveNitro ? phys.nitroInertiaGrip : 1.0;
      const effectiveGrip =
        phys.lateralGrip *
        14.0 *
        slideMul *
        nitroInertiaMul *
        (isSlipperyIce ? 0.35 : 1.0);

      const targetVx = Math.cos(car.angle) * car.speed;
      const targetVy = Math.sin(car.angle) * car.speed;
      const gripLerp = Math.min(1, effectiveGrip * dt);
      car.vx += (targetVx - car.vx) * gripLerp;
      car.vy += (targetVy - car.vy) * gripLerp;

      car.x += car.vx * dt;
      car.y += car.vy * dt;

      // Record dual tire skid marks when drifting or spinning
      if ((car.drifting || car.spinTimer > 0) && Math.hypot(car.x - car.prevX, car.y - car.prevY) > 0.8) {
        const perpX = -Math.sin(car.angle) * 6;
        const perpY = Math.cos(car.angle) * 6;
        const backX = -Math.cos(car.angle) * 8;
        const backY = -Math.sin(car.angle) * 8;
        skidMarks.push(
          {
            x1: car.prevX + backX + perpX,
            y1: car.prevY + backY + perpY,
            x2: car.x + backX + perpX,
            y2: car.y + backY + perpY,
            alpha: 0.58,
          },
          {
            x1: car.prevX + backX - perpX,
            y1: car.prevY + backY - perpY,
            x2: car.x + backX - perpX,
            y2: car.y + backY - perpY,
            alpha: 0.58,
          }
        );
        if (skidMarks.length > 220) {
          skidMarks.splice(0, skidMarks.length - 220);
        }
      }

      // Fade skid marks
      for (let i = skidMarks.length - 1; i >= 0; i--) {
        skidMarks[i].alpha -= dt * 0.14;
        if (skidMarks[i].alpha <= 0.02) {
          skidMarks.splice(i, 1);
        }
      }

      // Keep inside canvas bounds
      const margin = 18;
      const wallKeep = phys.isBulldozerWeight
        ? 0.9
        : phys.totals.weight > 0
          ? Math.min(0.85, 0.72 + Math.min(16, phys.totals.weight) * 0.01)
          : 0.25;
      if (car.x < margin) {
        car.x = margin;
        car.vx = Math.abs(car.vx) * (phys.totals.weight > 0 ? 0.35 : 0.65);
        car.speed *= wallKeep;
      } else if (car.x > width - margin) {
        car.x = width - margin;
        car.vx = -Math.abs(car.vx) * (phys.totals.weight > 0 ? 0.35 : 0.65);
        car.speed *= wallKeep;
      }
      if (car.y < margin) {
        car.y = margin;
        car.vy = Math.abs(car.vy) * (phys.totals.weight > 0 ? 0.35 : 0.65);
        car.speed *= wallKeep;
      } else if (car.y > height - margin) {
        car.y = height - margin;
        car.vy = -Math.abs(car.vy) * (phys.totals.weight > 0 ? 0.35 : 0.65);
        car.speed *= wallKeep;
      }

      // Tire barrier collision (Bulldozer Weight >= 6 smashes past without bounce-back)
      for (const tb of geom.tireBarriers) {
        const dx = car.x - tb.x;
        const dy = car.y - tb.y;
        const dist = Math.hypot(dx, dy);
        const minD = tb.radius + 13;
        if (dist < minD && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          car.x = tb.x + nx * minD;
          car.y = tb.y + ny * minD;
          if (phys.isBulldozerWeight) {
            car.speed = Math.max(
              35,
              car.speed * (phys.hasHeavyBulldozer ? 0.95 : 0.9)
            );
            const tx = -ny;
            const ty = nx;
            const dotT = Math.cos(car.angle) * tx + Math.sin(car.angle) * ty;
            const sign = dotT >= 0 ? 1 : -1;
            car.vx = (tx * sign * 0.92 + nx * 0.15) * car.speed;
            car.vy = (ty * sign * 0.92 + ny * 0.15) * car.speed;
          } else if (phys.totals.weight > 0) {
            car.speed = Math.max(25, car.speed * wallKeep);
            const tx = -ny;
            const ty = nx;
            const dotT = Math.cos(car.angle) * tx + Math.sin(car.angle) * ty;
            const sign = dotT >= 0 ? 1 : -1;
            car.vx = (tx * sign * 0.85 + nx * 0.25) * car.speed;
            car.vy = (ty * sign * 0.85 + ny * 0.25) * car.speed;
          } else {
            const retained = Math.abs(car.speed) * 0.2;
            car.vx = nx * 95;
            car.vy = ny * 95;
            car.speed = -retained;
          }
          soundEngine.playHazardHit();
        }
      }

      if (hasActiveNitro || car.drifting) {
        trailPool.spawnFromCar(
          car.x,
          car.y,
          car.angle,
          Math.hypot(car.vx, car.vy),
          hasActiveNitro,
          cosmeticRef.current.trail,
          nowSec
        );
      }

      // Update DOM Telemetry directly at 15Hz without triggering React re-renders
      hudTimer += dt;
      if (hudTimer >= 0.066) {
        hudTimer = 0;
        const rawKmh = Math.round((Math.abs(car.speed) / 215) * 295);
        const nitroVal = Math.round(car.nitroCharge);

        if (kmhTextRef.current) {
          kmhTextRef.current.textContent = String(rawKmh);
        }
        if (nitroTextRef.current) {
          nitroTextRef.current.textContent = `${nitroVal}%`;
        }
        if (driftBadgeRef.current) {
          driftBadgeRef.current.style.display = car.drifting ? 'inline-block' : 'none';
        }
        if (surfaceBadgeRef.current) {
          const meta = SURFACE_META[surface];
          if (meta) {
            surfaceBadgeRef.current.textContent = meta.label;
            surfaceBadgeRef.current.className = `px-1.5 py-0.5 rounded border font-semibold text-[9px] shrink-0 transition-colors ${meta.cls}`;
          }
        }
        if (statusBannerRef.current) {
          const text =
            car.stunTimer > 0
              ? `CHOÁNG TÊN LỬA (${car.stunTimer.toFixed(1)}s)`
              : car.spinTimer > 0
              ? `TRƯỢT CHUỐI (${car.spinTimer.toFixed(1)}s)`
              : '';
          if (text) {
            statusBannerRef.current.textContent = text;
            statusBannerRef.current.style.display = 'block';
          } else {
            statusBannerRef.current.style.display = 'none';
          }
        }
      }

      // =====================================================================
      // RENDER MINI LIVE TEST TRACK (WITH TILTED CAMERA & SKID MARKS)
      // =====================================================================
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // 1. Deep Turf & Cyber Telemetry Grid Base
      const grassGrad = ctx.createRadialGradient(
        geom.cx,
        geom.cy,
        16,
        geom.cx,
        geom.cy,
        Math.max(width, height) * 0.78
      );
      grassGrad.addColorStop(0, '#0f3d28');
      grassGrad.addColorStop(0.65, '#08261a');
      grassGrad.addColorStop(1, '#051512');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, 0, width, height);

      // Perspective horizon grid lines
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.075)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < width; gx += 28) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx + (gx - geom.cx) * 0.14, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += 26) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // 2. Track Kerbs, 3D Banked Shadow & Asphalt Loop
      const drawLoopPath = (yOffset = 0) => {
        ctx.beginPath();
        geom.waypoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y + yOffset);
          else ctx.lineTo(pt.x, pt.y + yOffset);
        });
        ctx.closePath();
      };

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // Subtle 3D elevation shadow under track for tilted camera feel
      ctx.strokeStyle = 'rgba(2, 6, 23, 0.72)';
      ctx.lineWidth = geom.roadHalfWidth * 2 + 12;
      drawLoopPath(6);
      ctx.stroke();

      // Outer Red/White Kerb Border
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = geom.roadHalfWidth * 2 + 8;
      drawLoopPath();
      ctx.stroke();

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = geom.roadHalfWidth * 2 + 8;
      ctx.setLineDash([14, 14]);
      drawLoopPath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Asphalt Surface
      ctx.strokeStyle = '#172236';
      ctx.lineWidth = geom.roadHalfWidth * 2;
      drawLoopPath();
      ctx.stroke();

      // Neon Cyan Inner Edge Guide
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.22)';
      ctx.lineWidth = geom.roadHalfWidth * 2 - 4;
      drawLoopPath();
      ctx.stroke();

      // Center Dashed Racing Line
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([10, 10]);
      drawLoopPath();
      ctx.stroke();
      ctx.setLineDash([]);

      // 2.5 Render Tire Skid Marks on Asphalt
      if (skidMarks.length > 0) {
        ctx.lineWidth = 2.2;
        for (const sk of skidMarks) {
          ctx.strokeStyle = `rgba(9, 13, 22, ${sk.alpha.toFixed(2)})`;
          ctx.beginPath();
          ctx.moveTo(sk.x1, sk.y1);
          ctx.lineTo(sk.x2, sk.y2);
          ctx.stroke();
        }
      }

      // 3. Mud Hazard Puddle
      ctx.save();
      ctx.translate(geom.mudZone.x, geom.mudZone.y);
      ctx.fillStyle = 'rgba(120, 53, 15, 0.88)';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, geom.mudZone.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 9px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VŨNG BÙN', 0, 3);
      ctx.restore();

      // 4. Cryo Ice Zone
      ctx.save();
      ctx.translate(geom.iceZone.x, geom.iceZone.y);
      ctx.fillStyle = 'rgba(34, 211, 238, 0.34)';
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, geom.iceZone.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e0f2fe';
      ctx.font = 'bold 9px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BĂNG TRƠN', 0, 3);
      ctx.restore();

      // 5. Tire Barriers
      for (const tb of geom.tireBarriers) {
        ctx.save();
        ctx.translate(tb.x, tb.y);
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, tb.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 6. Trail Particles & Nitro Exhaust Plume
      trailPool.updateAndDraw(ctx, dt);

      if (hasActiveNitro) {
        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.rotate(car.angle);
        const flameLen = 18 + Math.sin(nowSec * 45) * 6;
        const flameGrad = ctx.createLinearGradient(-12, 0, -12 - flameLen, 0);
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.35, '#22d3ee');
        flameGrad.addColorStop(0.75, '#fbbf24');
        flameGrad.addColorStop(1, 'rgba(248, 113, 113, 0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-12, -4.5);
        ctx.lineTo(-12 - flameLen, 0);
        ctx.lineTo(-12, 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      drawModularCar(ctx, cosmeticRef.current, {
        x: car.x,
        y: car.y,
        angle: car.angle,
        scale: 1.0,
        nowSec,
        drifting: car.drifting,
        nitroActive: hasActiveNitro,
        isPlayer: true,
      });

      ctx.restore();
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return (
    <div
      data-testid="live-tuning-test-track"
      style={{ contain: 'layout paint' }}
      className="relative w-full h-full min-h-[240px] rounded-2xl overflow-hidden border border-[#22d3ee]/35 bg-[#0a1020] shadow-[0_12px_30px_rgba(0,0,0,0.7)] flex flex-col justify-between"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Top Overlay: Consolidated single row (no wrap, no jitter) */}
      <div className="relative z-10 flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-gradient-to-b from-[#0a1020]/95 via-[#0a1020]/75 to-transparent pointer-events-none text-[10px] flex-nowrap overflow-hidden">
        {/* Left: Track title + Status tag + Surface */}
        <div className="flex items-center gap-1.5 min-w-0 shrink flex-nowrap overflow-hidden">
          <span className="font-sci font-black text-[#22d3ee] tracking-wider uppercase text-[9.5px] shrink-0">
            SÂN LÁI THỬ
          </span>
          <span className="text-slate-600 shrink-0">|</span>

          {/* Mode Badge with smooth CSS transition */}
          <span
            className={`px-1.5 py-0.5 rounded font-bold text-[9px] inline-flex items-center gap-1 shrink truncate transition-all duration-200 ${
              isPreviewing && previewPartName
                ? 'bg-[#fbbf24]/20 border border-[#fbbf24]/60 text-[#fbbf24]'
                : 'bg-[#34d399]/15 border border-[#34d399]/50 text-[#34d399]'
            }`}
          >
            {isPreviewing && previewPartName ? (
              <>
                <Eye className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">Thử: {previewPartName}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                <span>Đang lắp</span>
              </>
            )}
          </span>

          <span
            ref={surfaceBadgeRef}
            className={`px-1.5 py-0.5 rounded border font-semibold text-[9px] shrink-0 ${SURFACE_META.ASPHALT.cls}`}
          >
            {SURFACE_META.ASPHALT.label}
          </span>
        </div>

        {/* Right: Telemetry (Speed, Nitro, Drift) */}
        <div className="flex items-center gap-1.5 shrink-0 font-mono-num">
          <span
            ref={driftBadgeRef}
            style={{ display: 'none' }}
            className="px-1.5 py-0.5 rounded bg-[#fbbf24]/20 border border-[#fbbf24] text-[9px] font-sci font-black text-[#fbbf24]"
          >
            DRIFT
          </span>
          <div className="px-2 py-0.5 rounded bg-[#0a1020]/90 border border-[#22d3ee]/40 text-white font-extrabold text-[10.5px] shadow flex items-center gap-1">
            <span ref={kmhTextRef} className="text-[#22d3ee] inline-block min-w-[22px] text-right">
              0
            </span>
            <span className="text-[8px] text-slate-400">KM/H</span>
          </div>
          <div className="px-2 py-0.5 rounded bg-[#0a1020]/90 border border-[#fbbf24]/45 text-[#fbbf24] text-[10.5px] font-extrabold flex items-center gap-1 shadow">
            <Zap className="w-2.5 h-2.5 fill-current" />
            <span ref={nitroTextRef} className="inline-block min-w-[32px] text-right">
              100%
            </span>
          </div>
        </div>
      </div>

      {/* Status Alert Banner when testing Stun / Spin */}
      <div
        ref={statusBannerRef}
        style={{ display: 'none' }}
        className="relative z-10 self-center px-3 py-1 rounded-full bg-rose-950/95 border border-[#f87171] text-rose-100 text-[11px] font-black shadow-lg animate-pulse"
      />

      {/* Bottom Overlay: Controls guide + Action triggers (all h-6) */}
      <div className="relative z-10 flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-gradient-to-t from-[#0a1020]/95 via-[#0a1020]/65 to-transparent">
        {/* Help icon popover for WASD/SPACE */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowControlsHelp((v) => !v)}
            onMouseEnter={() => setShowControlsHelp(true)}
            onMouseLeave={() => setShowControlsHelp(false)}
            title="Hướng dẫn phím điều khiển (WASD & SPACE)"
            aria-label="Hướng dẫn phím điều khiển"
            className="w-6 h-6 rounded-lg bg-[#0f1a33] hover:bg-[#22d3ee]/20 border border-[#22d3ee]/45 text-[#22d3ee] flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22d3ee]"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {showControlsHelp && (
            <div className="absolute bottom-full left-0 mb-2 p-2 rounded-xl bg-[#0a1020]/98 border border-[#22d3ee]/60 shadow-xl backdrop-blur-md z-30 min-w-[210px] space-y-1 text-[11px] text-slate-200 pointer-events-none">
              <div className="text-[10px] font-sci font-bold text-[#22d3ee] uppercase tracking-wider">
                Phím điều khiển lái thử:
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="font-mono-num font-bold text-[#22d3ee]">W/S</span>
                <span>: Ga / Phanh lùi</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="font-mono-num font-bold text-[#22d3ee]">A/D</span>
                <span>: Lái trái / phải</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="font-mono-num font-bold text-[#fbbf24]">SPACE</span>
                <span>: Bơm Nitro / Giữ Drift</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Test Actions: Banana Stun, Nitro Boost, Reset - all h-6 unified height */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              stunTestTriggerRef.current = 'banana';
            }}
            title="Thử hiệu ứng trượt Vỏ Chuối (kiểm tra Cân nặng & Kháng trượt)"
            className="h-6 px-2.5 rounded-lg bg-[#fbbf24]/15 hover:bg-[#fbbf24]/30 border border-[#fbbf24]/50 text-[#fef08a] text-[10px] font-bold cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22d3ee] transition-colors"
          >
            <ShieldAlert className="w-3 h-3 text-[#fbbf24]" />
            <span>Thử Chuối</span>
          </button>
          <button
            type="button"
            onClick={() => {
              nitroTriggerRef.current = true;
              soundEngine.playBoost();
            }}
            title="Kích hoạt thử bình Nitro"
            className="h-6 px-2.5 rounded-lg bg-gradient-to-r from-[#fbbf24] to-[#f87171] hover:brightness-110 text-[#0a1020] text-[10px] font-extrabold cursor-pointer flex items-center gap-1 shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22d3ee] transition-all"
          >
            <Flame className="w-3 h-3" />
            <span>Bơm Nitro</span>
          </button>
          <button
            type="button"
            onClick={() => {
              resetTriggerRef.current = true;
              soundEngine.playCoin();
            }}
            title="Đặt lại vị trí xe"
            aria-label="Đặt lại vị trí xe"
            className="h-6 px-2.5 rounded-lg bg-[#0f1a33] hover:bg-slate-800 border border-slate-600 text-slate-200 text-[10px] font-bold cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22d3ee] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};

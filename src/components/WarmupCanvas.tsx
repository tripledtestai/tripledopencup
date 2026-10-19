import React, { useEffect, useRef, useState } from 'react';
import { ALL_PARTS, TIER_COLORS } from '../game/constants';
import { drawModularCar, TrailParticlePool } from '../game/carRenderer';
import {
  extractGameKeysFromKeyDown,
  extractGameKeysFromKeyUp,
  isTypingInInput,
} from '../game/keyboard';
import { calculateCarClass } from '../game/rules';
import { CarLoadout } from '../game/types';
import { soundEngine } from '../services/sound';

interface WarmupCanvasProps {
  loadout: CarLoadout;
  username: string;
}

type Showroom2DThemeId = 'day_paddock' | 'sakura_park' | 'night_cyber';

const SHOWROOM_2D_THEMES: {
  id: Showroom2DThemeId;
  label: string;
  isNight: boolean;
  floorInner: string;
  floorOuter: string;
  parkColor: string;
  kerbColorA: string;
  kerbColorB: string;
  accentColor: string;
  foliageColors: [string, string, string];
}[] = [
  {
    id: 'day_paddock',
    label: '☀️ Ban Ngày',
    isNight: false,
    floorInner: '#475569',
    floorOuter: '#1E293B',
    parkColor: '#15803D',
    kerbColorA: '#EF4444',
    kerbColorB: '#F8FAFC',
    accentColor: '#F59E0B',
    foliageColors: ['#16A34A', '#22C55E', '#86EFAC'],
  },
  {
    id: 'sakura_park',
    label: '🌸 Công Viên Anh Đào',
    isNight: false,
    floorInner: '#475569',
    floorOuter: '#334155',
    parkColor: '#166534',
    kerbColorA: '#EC4899',
    kerbColorB: '#FCE7F3',
    accentColor: '#F472B6',
    foliageColors: ['#DB2777', '#F472B6', '#FBCFE8'],
  },
  {
    id: 'night_cyber',
    label: '🌙 Buổi Tối (Bật Đèn)',
    isNight: true,
    floorInner: '#1E293B',
    floorOuter: '#050811',
    parkColor: '#062E22',
    kerbColorA: '#06B6D4',
    kerbColorB: '#FEF08A',
    accentColor: '#38BDF8',
    foliageColors: ['#065F46', '#10B981', '#6EE7B7'],
  },
];

export const WarmupCanvas: React.FC<WarmupCanvasProps> = ({
  loadout,
  username,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadoutRef = useRef<CarLoadout>(loadout);
  const usernameRef = useRef<string>(username);

  const [scenicTheme, setScenicTheme] =
    useState<Showroom2DThemeId>('day_paddock');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const scenicThemeRef = useRef<Showroom2DThemeId>(scenicTheme);
  const autoRotateRef = useRef<boolean>(autoRotate);
  const manualNitroTriggerRef = useRef<boolean>(false);

  useEffect(() => {
    loadoutRef.current = loadout;
    usernameRef.current = username;
  }, [loadout, username]);

  useEffect(() => {
    scenicThemeRef.current = scenicTheme;
  }, [scenicTheme]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    let width = canvas.clientWidth || 600;
    let height = canvas.clientHeight || 460;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.clientWidth || 600;
      height = canvas.clientHeight || 460;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const showcase = {
      angle: -0.42,
      nitroTimer: 0,
    };

    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInInput(e.target)) return;
      const mapped = extractGameKeysFromKeyDown(e);
      if (mapped.length === 0) return;

      for (const code of mapped) {
        if (
          code === 'Space' ||
          code === 'ShiftLeft' ||
          code === 'ShiftRight'
        ) {
          e.preventDefault();
          showcase.nitroTimer = 1.1;
          soundEngine.playBoost();
        }
        keys.add(code);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const mapped = extractGameKeysFromKeyUp(e);
      for (const code of mapped) {
        keys.delete(code);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const trailPool = new TrailParticlePool(160);
    let lastTime = performance.now();
    let lastRender = 0;
    let animId = 0;

    const draw2DTopDownTree = (
      c: CanvasRenderingContext2D,
      tx: number,
      ty: number,
      r: number,
      cols: [string, string, string]
    ) => {
      c.save();
      c.translate(tx, ty);
      c.fillStyle = 'rgba(0,0,0,0.28)';
      c.beginPath();
      c.arc(4, 5, r, 0, Math.PI * 2);
      c.fill();

      c.fillStyle = cols[0];
      c.strokeStyle = '#0F172A';
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.fillStyle = cols[1];
      c.beginPath();
      c.arc(-r * 0.12, -r * 0.12, r * 0.72, 0, Math.PI * 2);
      c.fill();

      c.fillStyle = cols[2];
      c.beginPath();
      c.arc(-r * 0.24, -r * 0.24, r * 0.36, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };

    const draw2DTireBarrier = (
      c: CanvasRenderingContext2D,
      tx: number,
      ty: number,
      color: string
    ) => {
      c.save();
      c.translate(tx, ty);
      c.fillStyle = 'rgba(0,0,0,0.32)';
      c.beginPath();
      c.arc(3, 3, 13, 0, Math.PI * 2);
      c.fill();

      c.fillStyle = '#1E293B';
      c.strokeStyle = '#0F172A';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, 0, 12, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.strokeStyle = color;
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(0, 0, 7.5, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    };

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      if (isHeadless && now - lastRender < 66) return;
      lastRender = now;

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const nowSec = now / 1000;

      if (manualNitroTriggerRef.current) {
        manualNitroTriggerRef.current = false;
        showcase.nitroTimer = 1.2;
      }

      const left = keys.has('KeyA') || keys.has('ArrowLeft');
      const right = keys.has('KeyD') || keys.has('ArrowRight');
      const shiftHeld =
        keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Space');

      if (shiftHeld) {
        showcase.nitroTimer = Math.max(showcase.nitroTimer, 0.2);
      } else if (showcase.nitroTimer > 0) {
        showcase.nitroTimer = Math.max(0, showcase.nitroTimer - dt);
      }

      if (left) {
        showcase.angle -= 1.9 * dt;
      } else if (right) {
        showcase.angle += 1.9 * dt;
      } else if (autoRotateRef.current) {
        showcase.angle += 0.45 * dt;
      }

      const themeObj =
        SHOWROOM_2D_THEMES.find((t) => t.id === scenicThemeRef.current) ||
        SHOWROOM_2D_THEMES[0];

      const cx = width * 0.5;
      const cy = height * 0.52;
      const isNitroActive = showcase.nitroTimer > 0;

      if (isNitroActive) {
        trailPool.spawnFromCar(
          cx,
          cy,
          showcase.angle,
          250,
          true,
          loadoutRef.current.trail,
          nowSec
        );
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // 1. 2D Vector Showroom Plaza Floor
      const floorGrad = ctx.createRadialGradient(
        cx,
        cy,
        24,
        cx,
        cy,
        Math.max(width, height) * 0.7
      );
      floorGrad.addColorStop(0, themeObj.floorInner);
      floorGrad.addColorStop(1, themeObj.floorOuter);
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, 0, width, height);

      // Crisp 2D Technical Grid
      ctx.strokeStyle = themeObj.isNight
        ? 'rgba(56, 189, 248, 0.08)'
        : 'rgba(248, 250, 252, 0.09)';
      ctx.lineWidth = 1.2;
      const step = 48;
      for (let gx = (cx % step) - step; gx < width; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = (cy % step) - step; gy < height; gy += step) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // 2. Top & Bottom 2D Park Lawn + Racing Kerbs
      const bandH = 56;
      ctx.fillStyle = themeObj.parkColor;
      ctx.fillRect(0, 0, width, bandH);
      ctx.fillRect(0, height - bandH, width, bandH);

      const kw = 36;
      const kh = 11;
      for (let i = 0; i <= Math.ceil(width / kw); i++) {
        ctx.fillStyle = i % 2 === 0 ? themeObj.kerbColorA : themeObj.kerbColorB;
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.8;
        ctx.fillRect(i * kw, bandH - kh * 0.5, kw, kh);
        ctx.strokeRect(i * kw, bandH - kh * 0.5, kw, kh);
        ctx.fillRect(i * kw, height - bandH - kh * 0.5, kw, kh);
        ctx.strokeRect(i * kw, height - bandH - kh * 0.5, kw, kh);
      }

      // 3. 2D Trees & Tire Stacks
      draw2DTopDownTree(ctx, width * 0.12, bandH * 0.5, 20, themeObj.foliageColors);
      draw2DTopDownTree(ctx, width * 0.88, bandH * 0.5, 20, themeObj.foliageColors);
      draw2DTopDownTree(
        ctx,
        width * 0.12,
        height - bandH * 0.5,
        20,
        themeObj.foliageColors
      );
      draw2DTopDownTree(
        ctx,
        width * 0.88,
        height - bandH * 0.5,
        20,
        themeObj.foliageColors
      );

      draw2DTireBarrier(ctx, cx - 155, cy - 92, themeObj.kerbColorA);
      draw2DTireBarrier(ctx, cx + 155, cy - 92, themeObj.kerbColorA);
      draw2DTireBarrier(ctx, cx - 155, cy + 92, themeObj.accentColor);
      draw2DTireBarrier(ctx, cx + 155, cy + 92, themeObj.accentColor);

      // 4. Center 2D Hydraulic Turntable Pad
      ctx.save();
      ctx.translate(cx, cy);

      ctx.fillStyle = 'rgba(0,0,0,0.36)';
      ctx.beginPath();
      ctx.arc(0, 5, 128, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = themeObj.isNight ? '#0F172A' : '#1E293B';
      ctx.strokeStyle = '#090D16';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 122, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Segmented 2D Bezel
      for (let i = 0; i < 20; i++) {
        const a0 = (i / 20) * Math.PI * 2;
        const a1 = ((i + 0.68) / 20) * Math.PI * 2;
        ctx.strokeStyle =
          i % 2 === 0
            ? isNitroActive
              ? '#F43F5E'
              : themeObj.accentColor
            : themeObj.kerbColorB;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 112, a0, a1);
        ctx.stroke();
      }

      ctx.fillStyle = themeObj.isNight ? '#1E293B' : '#334155';
      ctx.strokeStyle = isNitroActive ? '#F43F5E' : themeObj.accentColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 102, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotating 2D dashed ring
      ctx.save();
      ctx.rotate(nowSec * 0.4);
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 82, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 2D Car Shadow on turntable
      ctx.save();
      ctx.rotate(showcase.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.44)';
      ctx.beginPath();
      ctx.roundRect(-52, -28, 104, 56, 16);
      ctx.fill();
      ctx.restore();

      ctx.restore();

      // 5. Update & draw Nitro exhaust trails if active
      trailPool.updateAndDraw(ctx, dt);

      // 6. Draw 2D Showcase Car (Headlights ON only at night!)
      drawModularCar(ctx, loadoutRef.current, {
        x: cx,
        y: cy,
        angle: showcase.angle,
        scale: 2.15,
        nowSec,
        drifting: false,
        nitroActive: isNitroActive,
        isPlayer: true,
        showHeadlightBeams: themeObj.isNight,
      });

      ctx.restore();
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const chassisPart =
    ALL_PARTS.find((p) => p.id === loadout.chassis) || ALL_PARTS[0];
  const carClassInfo = calculateCarClass(loadout);
  const tierStyle = TIER_COLORS[carClassInfo.tier];

  return (
    <div className="relative w-full h-full min-h-[410px] rounded-2xl overflow-hidden border-2 border-[#7A9A75] bg-[#090D16] flex flex-col justify-between shadow-2xl">
      {/* 2D Car Showcase Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Top 2D Showroom Backdrop Switcher Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-b from-[#090D16]/90 to-transparent">
        <div className="text-xs font-bold text-white">{username}</div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {SHOWROOM_2D_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setScenicTheme(t.id);
                soundEngine.playCoin();
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer border ${
                scenicTheme === t.id
                  ? 'bg-[#F59E0B] text-[#0F172A] border-[#FEF08A] shadow'
                  : 'bg-[#0F172A]/85 text-[#CBD5E1] border-slate-700 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Displayed Car Spec & Interactive Showcase Controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-t from-[#090D16]/95 to-transparent">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            style={{ backgroundColor: tierStyle.bg, color: tierStyle.text }}
            className="px-2 py-0.5 rounded text-[10px] font-black"
          >
            CLASS {carClassInfo.tier}
          </span>
          <span className="text-xs font-black text-white">
            {chassisPart.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
              autoRotate
                ? 'bg-[#1E293B] text-[#38BDF8] border-[#38BDF8]/60'
                : 'bg-[#0F172A] text-[#94A3B8] border-slate-700'
            }`}
          >
            {autoRotate ? '🔄 Xoay 360°' : '⏸️ Dừng'}
          </button>
          <button
            type="button"
            onClick={() => {
              manualNitroTriggerRef.current = true;
              soundEngine.playBoost();
            }}
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#F59E0B] to-[#E11D48] text-white text-[11px] font-black shadow cursor-pointer active:scale-95"
          >
            🔥 Thử Nitro
          </button>
        </div>
      </div>
    </div>
  );
};


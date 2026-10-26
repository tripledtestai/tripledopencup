import React, { useEffect, useRef, useState } from 'react';
import {
  ALL_PARTS,
  DEFAULT_TUNING_LOADOUT,
  EMPTY_TUNING_PRESETS,
  PHYSICS_STAT_DESCRIPTIONS,
  TIER_COLORS,
} from '../game/constants';
import { drawModularCar, TrailParticlePool } from '../game/carRenderer';
import {
  extractGameKeysFromKeyDown,
  extractGameKeysFromKeyUp,
  isTypingInInput,
} from '../game/keyboard';
import {
  calculateCarClass,
  calculateTuningPhysics,
  calculateTuningSummary,
  normalizeTuningPresets,
} from '../game/rules';
import { CarLoadout, TuningLoadout, TuningPreset, TuningStats } from '../game/types';
import { soundEngine } from '../services/sound';
import { Car, Wrench, MoveHorizontal, X } from 'lucide-react';

interface WarmupCanvasProps {
  loadout: CarLoadout;
  tuningLoadout?: TuningLoadout;
  username: string;
  onOpenGarage?: (tab?: 'cosmetics' | 'tuning') => void;
  tuningPresets?: (TuningPreset | null)[];
  activePresetIndex?: number | null;
  onSelectPreset?: (idx: number) => void;
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
    label: 'Ban Ngày',
    isNight: false,
    floorInner: '#334155',
    floorOuter: '#0F172A',
    parkColor: '#15803D',
    kerbColorA: '#EF4444',
    kerbColorB: '#F8FAFC',
    accentColor: '#06B6D4',
    foliageColors: ['#16A34A', '#22C55E', '#86EFAC'],
  },
  {
    id: 'sakura_park',
    label: 'Công Viên',
    isNight: false,
    floorInner: '#334155',
    floorOuter: '#1E293B',
    parkColor: '#166534',
    kerbColorA: '#EC4899',
    kerbColorB: '#FCE7F3',
    accentColor: '#F472B6',
    foliageColors: ['#DB2777', '#F472B6', '#FBCFE8'],
  },
  {
    id: 'night_cyber',
    label: 'Đêm Cyber',
    isNight: true,
    floorInner: '#1E293B',
    floorOuter: '#030712',
    parkColor: '#062E22',
    kerbColorA: '#06B6D4',
    kerbColorB: '#FEF08A',
    accentColor: '#38BDF8',
    foliageColors: ['#065F46', '#10B981', '#6EE7B7'],
  },
];

export const WarmupCanvas: React.FC<WarmupCanvasProps> = ({
  loadout,
  tuningLoadout,
  username,
  onOpenGarage,
  tuningPresets,
  activePresetIndex,
  onSelectPreset,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadoutRef = useRef<CarLoadout>(loadout);
  const usernameRef = useRef<string>(username);

  const [scenicTheme, setScenicTheme] = useState<Showroom2DThemeId>('night_cyber');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const showcaseAngleRef = useRef<number>(-0.42);

  const scenicThemeRef = useRef<Showroom2DThemeId>(scenicTheme);

  useEffect(() => {
    loadoutRef.current = loadout;
    usernameRef.current = username;
  }, [loadout, username]);

  useEffect(() => {
    scenicThemeRef.current = scenicTheme;
  }, [scenicTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.clientWidth || 600;
    let height = canvas.clientHeight || 380;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.clientWidth || 600;
      height = canvas.clientHeight || 380;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const showcase = {
      angle: showcaseAngleRef.current,
      nitroTimer: 0,
    };

    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInInput(e.target)) return;
      const mapped = extractGameKeysFromKeyDown(e);
      if (mapped.length === 0) return;

      for (const code of mapped) {
        if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') {
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

    const trailPool = new TrailParticlePool(120);
    let lastTime = performance.now();
    let animId = 0;

    let bgCanvas: HTMLCanvasElement | null = null;
    let cachedThemeId: string = '';
    let cachedIsLight: boolean = false;

    const renderStaticBackground = () => {
      bgCanvas = document.createElement('canvas');
      bgCanvas.width = Math.floor(width * dpr);
      bgCanvas.height = Math.floor(height * dpr);
      const bgCtx = bgCanvas.getContext('2d');
      if (!bgCtx) return;

      const themeObj =
        SHOWROOM_2D_THEMES.find((t) => t.id === scenicThemeRef.current) ||
        SHOWROOM_2D_THEMES[0];
      cachedThemeId = scenicThemeRef.current;
      const isLightMode = document.documentElement.classList.contains('theme-light');
      cachedIsLight = isLightMode;

      const cx = width * 0.5;
      const cy = height * 0.48;

      bgCtx.save();
      bgCtx.scale(dpr, dpr);

      // Showroom Plaza Floor
      const floorGrad = bgCtx.createRadialGradient(cx, cy, 10, cx, cy, width * 0.7);
      if (isLightMode) {
        floorGrad.addColorStop(0, '#ffffff');
        floorGrad.addColorStop(0.65, '#f1f5f9');
        floorGrad.addColorStop(1, '#e2e8f0');
      } else {
        floorGrad.addColorStop(0, themeObj.floorInner);
        floorGrad.addColorStop(0.7, themeObj.floorOuter);
        floorGrad.addColorStop(1, '#050a14');
      }
      bgCtx.fillStyle = floorGrad;
      bgCtx.fillRect(0, 0, width, height);

      // Grid Lines
      bgCtx.strokeStyle = isLightMode
        ? 'rgba(148, 163, 184, 0.22)'
        : themeObj.isNight
        ? 'rgba(6, 182, 212, 0.08)'
        : 'rgba(255, 255, 255, 0.06)';
      bgCtx.lineWidth = 1;
      for (let x = 0; x < width; x += 32) {
        bgCtx.beginPath();
        bgCtx.moveTo(x, 0);
        bgCtx.lineTo(x, height);
        bgCtx.stroke();
      }
      for (let y = 0; y < height; y += 32) {
        bgCtx.beginPath();
        bgCtx.moveTo(0, y);
        bgCtx.lineTo(width, y);
        bgCtx.stroke();
      }

      // Rotating Turntable Platform Base
      bgCtx.save();
      bgCtx.translate(cx, cy);

      // Base shadow
      bgCtx.fillStyle = isLightMode ? 'rgba(15, 23, 42, 0.12)' : 'rgba(0,0,0,0.5)';
      bgCtx.beginPath();
      bgCtx.arc(0, 10, 115, 0, Math.PI * 2);
      bgCtx.fill();

      // Outer Ring
      bgCtx.fillStyle = isLightMode ? '#ffffff' : '#0F172A';
      bgCtx.strokeStyle = isLightMode ? '#0284c7' : themeObj.accentColor;
      bgCtx.lineWidth = 3;
      bgCtx.beginPath();
      bgCtx.arc(0, 0, 110, 0, Math.PI * 2);
      bgCtx.fill();
      bgCtx.stroke();

      // Inner Turntable Surface
      bgCtx.fillStyle = isLightMode ? '#e2e8f0' : '#1E293B';
      bgCtx.beginPath();
      bgCtx.arc(0, 0, 96, 0, Math.PI * 2);
      bgCtx.fill();

      bgCtx.restore();
      bgCtx.restore();
    };

    const loop = (nowMs: number) => {
      animId = requestAnimationFrame(loop);

      const dt = Math.min((nowMs - lastTime) / 1000, 0.05);
      lastTime = nowMs;
      const nowSec = nowMs / 1000;

      // Mouse drag rotation handling
      if (isDraggingRef.current) {
        showcase.angle = showcaseAngleRef.current;
      } else {
        showcase.angle += dt * 0.35;
        showcaseAngleRef.current = showcase.angle;
      }

      if (showcase.nitroTimer > 0) {
        showcase.nitroTimer = Math.max(0, showcase.nitroTimer - dt);
      }

      const isLightNow = document.documentElement.classList.contains('theme-light');
      if (!bgCanvas || cachedThemeId !== scenicThemeRef.current || cachedIsLight !== isLightNow) {
        renderStaticBackground();
      }

      const themeObj =
        SHOWROOM_2D_THEMES.find((t) => t.id === scenicThemeRef.current) ||
        SHOWROOM_2D_THEMES[0];

      const cx = width * 0.5;
      const cy = height * 0.48;
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

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (bgCanvas) {
        ctx.drawImage(bgCanvas, 0, 0);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Rotating dashed accent ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(nowSec * 0.3);
      ctx.strokeStyle = themeObj.accentColor;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 88, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Car shadow
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(showcase.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.roundRect(-54, -30, 108, 60, 18);
      ctx.fill();
      ctx.restore();

      // Nitro trails
      trailPool.updateAndDraw(ctx, dt);

      // Draw 2D Showcase Car
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

  // Pointer drag listeners for rotation
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    dragStartXRef.current = e.clientX;
    showcaseAngleRef.current += dx * 0.012;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const chassisPart = ALL_PARTS.find((p) => p.id === loadout.chassis) || ALL_PARTS[0];
  const carClassInfo = calculateCarClass(loadout);
  const tierStyle = TIER_COLORS[carClassInfo.tier];

  // 5 Mini Stat Bars & CP Calculation
  const summary = calculateTuningSummary(tuningLoadout || DEFAULT_TUNING_LOADOUT);

  const [activeStatInfo, setActiveStatInfo] = useState<keyof TuningStats | null>(null);

  const statBars: { key: keyof TuningStats; label: string; val: number }[] = [
    { key: 'topSpeed', label: 'Tốc độ', val: summary.bars.topSpeed },
    { key: 'accel', label: 'Gia tốc', val: summary.bars.accel },
    { key: 'handling', label: 'Độ cua', val: summary.bars.handling },
    { key: 'nitro', label: 'Nitro', val: summary.bars.nitro },
    { key: 'weight', label: 'Cân nặng', val: summary.bars.weight },
  ];

  const presetsList = normalizeTuningPresets(tuningPresets);

  return (
    <div
      data-testid="warmup-canvas-container"
      className="warmup-canvas-container relative w-full h-full min-h-[320px] rounded-2xl overflow-hidden border border-[#06B6D4]/40 bg-[#090D16] flex flex-col justify-between shadow-2xl"
    >
      {/* 2D Car Showcase Canvas with Pointer Drag Event Listeners */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`absolute inset-0 w-full h-full block ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      />

      {/* Top Bar: Showroom Theme Switcher & Drag Hint */}
      <div className="relative z-10 flex items-center justify-between gap-2 p-2.5 bg-gradient-to-b from-[#090D16]/95 via-[#090D16]/75 to-transparent pointer-events-none">
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-700/80 text-[10px] text-slate-300 font-bold">
          <MoveHorizontal className="w-3 h-3 text-[#38BDF8]" />
          <span>Kéo chuột để xoay 360°</span>
        </div>

        <div className="flex items-center gap-1 pointer-events-auto">
          {SHOWROOM_2D_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setScenicTheme(t.id);
                soundEngine.playCoin();
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                scenicTheme === t.id
                  ? 'bg-[#06B6D4] text-[#090D16] border-cyan-200 font-black shadow'
                  : 'bg-[#0F172A]/85 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Panel: Car Info + 5 Mini Stat Bars + Actions & Presets */}
      <div className="relative z-10 p-3 bg-gradient-to-t from-[#090D16] via-[#090D16]/95 to-transparent border-t border-slate-800/80 space-y-2">
        {/* Car Name & Class Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              style={{ backgroundColor: tierStyle.bg, color: tierStyle.text }}
              className="px-2 py-0.5 rounded text-[10px] font-black border border-white/20 shadow-sm"
            >
              CLASS {carClassInfo.tier}
            </span>
            <span className="text-xs sm:text-sm font-black text-white truncate">
              {chassisPart.name}
            </span>
          </div>

          <span className="text-[10px] font-mono-num font-bold text-[#38BDF8] bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
            {summary.totalCP}/25 CP
          </span>
        </div>

        {/* 5 Mini Stat Bars with ! Info Trigger */}
        <div className="relative grid grid-cols-5 gap-1.5 pt-0.5">
          {statBars.map((s) => {
            const isInfoOpen = activeStatInfo === s.key;
            return (
              <div key={s.key} className="space-y-0.5">
                <div className="flex items-center justify-between gap-0.5 text-[9px] font-bold text-slate-300">
                  <span className="truncate">{s.label}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <span className="font-mono-num text-[#38BDF8] text-[8.5px]">{s.val}%</span>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveStatInfo((prev) => (prev === s.key ? null : s.key))
                      }
                      title={`Xem ảnh hưởng của ${s.label}`}
                      className={`w-3.5 h-3.5 rounded-full text-[8px] font-black inline-flex items-center justify-center border transition-all cursor-pointer ${
                        isInfoOpen
                          ? 'bg-amber-400 text-slate-950 border-amber-200'
                          : 'bg-slate-800/90 text-amber-300 border-amber-400/50 hover:bg-amber-400 hover:text-slate-950'
                      }`}
                    >
                      !
                    </button>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#06B6D4] to-[#38BDF8] transition-all duration-300"
                    style={{ width: `${s.val}%` }}
                  />
                </div>
              </div>
            );
          })}

          {activeStatInfo && PHYSICS_STAT_DESCRIPTIONS[activeStatInfo] && (
            <div className="absolute bottom-full left-0 right-0 mb-2 z-30 p-2.5 rounded-xl bg-[#060D1E]/95 border border-amber-400/60 shadow-[0_12px_28px_rgba(0,0,0,0.85)] text-[11px] space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-amber-300">
                  ! {PHYSICS_STAT_DESCRIPTIONS[activeStatInfo].title}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveStatInfo(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-slate-200 leading-snug">
                {PHYSICS_STAT_DESCRIPTIONS[activeStatInfo].impact}
              </p>
              <p className="text-[10px] text-cyan-300 font-semibold">
                💡 {PHYSICS_STAT_DESCRIPTIONS[activeStatInfo].tip}
              </p>
            </div>
          )}
        </div>

        {/* Actions Row: [🏎️ Đổi Xe] [🔧 Độ Máy] + Presets Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5">
            {onOpenGarage && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onOpenGarage('cosmetics');
                    soundEngine.playCoin();
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-cyan-500/50 text-[#38BDF8] text-[11px] font-black cursor-pointer flex items-center gap-1 transition-all shadow-sm"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Đổi Xe</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenGarage('tuning');
                    soundEngine.playCoin();
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-cyan-500/50 text-[#38BDF8] text-[11px] font-black cursor-pointer flex items-center gap-1 transition-all shadow-sm"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Độ Máy</span>
                </button>
              </>
            )}
          </div>

          {/* Preset Quick Switch Pills (P1, P2, P3) */}
          {onSelectPreset && (
            <div className="flex items-center gap-1 bg-slate-900/90 px-1.5 py-1 rounded-xl border border-slate-800">
              <span className="text-[9.5px] font-black text-slate-400 mr-0.5 hidden sm:inline">PRESET:</span>
              {[0, 1, 2].map((pIdx) => {
                const p = presetsList[pIdx];
                const isAct = activePresetIndex === pIdx && p !== null;
                return (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => onSelectPreset(pIdx)}
                    title={p ? `${p.name} (${p.totalCP}/25 CP)` : `Preset ${pIdx + 1}: Trống`}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      isAct
                        ? 'bg-[#06B6D4] text-[#090D16] shadow'
                        : p
                        ? 'bg-slate-800 text-cyan-300 hover:text-white border border-slate-700'
                        : 'bg-slate-950 text-slate-600'
                    }`}
                  >
                    P{pIdx + 1}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

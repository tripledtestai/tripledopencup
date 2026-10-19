import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { drawModularCar, TrailParticlePool } from '../game/carRenderer';
import { MAPS } from '../game/constants';
import {
  extractGameKeysFromKeyDown,
  extractGameKeysFromKeyUp,
  isTypingInInput,
} from '../game/keyboard';
import {
  applyCarRescue,
  distanceToSegment,
  isNightMapTheme,
  isPointOnTrack,
  rollRaceItem,
} from '../game/rules';
import { drawRaceTrack } from '../game/trackRenderer';
import {
  BotDifficulty,
  DeployedHazard,
  LobbyConfig,
  RaceItemType,
  RacerState,
  ReplayFrame,
  TrackItemBox,
} from '../game/types';
import { soundEngine } from '../services/sound';

interface RaceCanvasProps {
  lobby: LobbyConfig;
  localPlayerId: string | null;
  isTeacher: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
  onRaceComplete: (finalRacers: RacerState[]) => void;
  onExitRace: () => void;
}

const ITEM_INFO: Record<
  RaceItemType,
  { name: string; icon: string; desc: string }
> = {
  nitro: {
    name: 'Bình Nitro',
    icon: '⚡',
    desc: '+160% tốc độ & đầy Nitro',
  },
  banana: {
    name: 'Vỏ Chuối',
    icon: '🍌',
    desc: 'Trượt xoay 360° (1.5s)',
  },
  mud: {
    name: 'Bẫy Bùn',
    icon: '💩',
    desc: 'Giảm 70% tốc độ (3s)',
  },
  rocket: {
    name: 'Tên Lửa Đuổi',
    icon: '🚀',
    desc: 'Bám mục tiêu · Choáng 2s',
  },
};

const BOT_DIFFICULTY_PROFILES: Record<
  BotDifficulty,
  {
    speedMul: number;
    turnMul: number;
    shortcutChance: number;
    itemRate: number;
    nitroUseThreshold: number;
    rocketStartChance: number;
  }
> = {
  easy: {
    speedMul: 0.78,
    turnMul: 0.78,
    shortcutChance: 0.05,
    itemRate: 0.35,
    nitroUseThreshold: 95,
    rocketStartChance: 0.1,
  },
  medium: {
    speedMul: 0.94,
    turnMul: 0.95,
    shortcutChance: 0.22,
    itemRate: 0.9,
    nitroUseThreshold: 78,
    rocketStartChance: 0.25,
  },
  hard: {
    speedMul: 1.04,
    turnMul: 1.12,
    shortcutChance: 0.45,
    itemRate: 1.5,
    nitroUseThreshold: 58,
    rocketStartChance: 0.5,
  },
  nightmare: {
    speedMul: 1.14,
    turnMul: 1.28,
    shortcutChance: 0.7,
    itemRate: 2.2,
    nitroUseThreshold: 38,
    rocketStartChance: 0.8,
  },
};

/**
 * Realistic Automotive Speedometer, Tachometer, Gear & Shift-Nitro Instrument Cluster
 */
const RealCarSpeedometerCluster: React.FC<{
  speedKmh: number;
  rawSpeed: number;
  nitroCharge: number;
  isBoostingNitro: boolean;
  drifting: boolean;
  onTriggerNitroPress: (active: boolean) => void;
}> = ({
  speedKmh,
  rawSpeed,
  nitroCharge,
  isBoostingNitro,
  drifting,
  onTriggerNitroPress,
}) => {
  // Clamp displayed dial speed to 0..320 km/h
  const maxDialSpeed = 320;
  const clampedSpeed = Math.min(maxDialSpeed, Math.max(0, speedKmh));
  const speedRatio = clampedSpeed / maxDialSpeed;

  // Sweep angle from -210 deg (bottom-left) to +30 deg (bottom-right) => total 240 deg
  const startDeg = -210;
  const sweepDeg = 240;
  const needleDeg = startDeg + speedRatio * sweepDeg;

  // Compute realistic Automotive Gear (R, N, 1, 2, 3, 4, 5, 6) and RPM (1.0 - 8.5 x1000)
  let gear = 'N';
  let rpmRatio = 0.12;
  if (rawSpeed < -5) {
    gear = 'R';
    rpmRatio = Math.min(0.85, Math.abs(rawSpeed) / 140);
  } else if (speedKmh < 3) {
    gear = 'N';
    rpmRatio = 0.12;
  } else if (speedKmh < 45) {
    gear = '1';
    rpmRatio = 0.25 + (speedKmh / 45) * 0.65;
  } else if (speedKmh < 95) {
    gear = '2';
    rpmRatio = 0.32 + ((speedKmh - 45) / 50) * 0.58;
  } else if (speedKmh < 145) {
    gear = '3';
    rpmRatio = 0.36 + ((speedKmh - 95) / 50) * 0.54;
  } else if (speedKmh < 195) {
    gear = '4';
    rpmRatio = 0.4 + ((speedKmh - 145) / 50) * 0.5;
  } else if (speedKmh < 245) {
    gear = '5';
    rpmRatio = 0.45 + ((speedKmh - 195) / 50) * 0.48;
  } else {
    gear = '6';
    rpmRatio = Math.min(0.98, 0.55 + ((speedKmh - 245) / 75) * 0.43);
  }
  if (isBoostingNitro) {
    rpmRatio = Math.min(1, rpmRatio + 0.12);
  }
  const rpmValue = (rpmRatio * 8.0).toFixed(1);

  // Dial geometry
  const cx = 92;
  const cy = 92;
  const rOuter = 78;
  const rTicks = 68;

  const polarToCartesian = (angleDeg: number, radius: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + Math.cos(rad) * radius,
      y: cy + Math.sin(rad) * radius,
    };
  };

  const describeArc = (
    fromDeg: number,
    toDeg: number,
    radius: number
  ): string => {
    const start = polarToCartesian(fromDeg, radius);
    const end = polarToCartesian(toDeg, radius);
    const largeArcFlag = toDeg - fromDeg <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  const majorStepCount = 8; // 0, 40, 80, 120, 160, 200, 240, 280, 320
  const nitroSegments = 12;
  const filledSegments = Math.round((nitroCharge / 100) * nitroSegments);

  return (
    <div className="pointer-events-auto flex items-end gap-3">
      {/* Left Column: NITRO BOOST [SHIFT] Bar + Quick Rescue R */}
      <div className="flex flex-col items-end gap-2">
        {/* Interactive Nitro Tank Bar (Requirement #4) */}
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.currentTarget.blur();
            onTriggerNitroPress(true);
          }}
          onMouseUp={() => onTriggerNitroPress(false)}
          onMouseLeave={() => onTriggerNitroPress(false)}
          onTouchStart={() => onTriggerNitroPress(true)}
          onTouchEnd={() => onTriggerNitroPress(false)}
          title="Giữ phím SHIFT để đốt Nitro tăng tốc!"
          className={`w-56 p-3 rounded-2xl border-2 transition-all cursor-pointer text-left shadow-2xl ${
            isBoostingNitro
              ? 'bg-gradient-to-r from-[#082F49] via-[#0369A1] to-[#1E293B] border-[#38BDF8] shadow-[0_0_26px_rgba(56,189,248,0.75)] scale-[1.02]'
              : 'bg-[#0F172A]/95 border-[#7A9A75] hover:border-[#38BDF8]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-[#38BDF8] text-[#0F172A] font-mono-num text-[10px] font-black">
                SHIFT
              </span>
              <span className="text-xs font-black text-white uppercase tracking-wider">
                ⚡ BÌNH NITRO
              </span>
            </div>
            <span
              className={`font-mono-num text-xs font-black ${
                isBoostingNitro
                  ? 'text-[#38BDF8]'
                  : nitroCharge > 20
                  ? 'text-[#FEF08A]'
                  : 'text-red-400'
              }`}
            >
              {Math.round(nitroCharge)}%
            </span>
          </div>

          {/* 12-Segment Automotive LED Nitro Bar */}
          <div className="grid grid-cols-12 gap-1 h-3.5 p-0.5 rounded-lg bg-[#020617] border border-slate-700">
            {Array.from({ length: nitroSegments }, (_, idx) => {
              const active = idx < filledSegments;
              const segColor = !active
                ? 'bg-slate-800/70'
                : isBoostingNitro
                ? 'bg-gradient-to-t from-[#38BDF8] to-[#E0F2FE] shadow-[0_0_8px_#38BDF8]'
                : idx >= 9
                ? 'bg-gradient-to-t from-[#F59E0B] to-[#FEF08A]'
                : idx >= 5
                ? 'bg-gradient-to-t from-[#0284C7] to-[#38BDF8]'
                : 'bg-gradient-to-t from-[#16A34A] to-[#4ADE80]';
              return (
                <div
                  key={idx}
                  className={`rounded-sm transition-colors ${segColor}`}
                />
              );
            })}
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold">
            <span className="text-[#94A3B8]">
              {isBoostingNitro
                ? '🔥 ĐANG ĐỐT NITRO CỰC ĐẠI!'
                : drifting
                ? '💨 Đang Drift: Sạc Nitro x3!'
                : nitroCharge > 20
                ? 'Giữ [SHIFT] để bứt tốc'
                : 'Cần nạp >20% để bật Nitro'}
            </span>
            <span
              className={`font-bold ${
                isBoostingNitro || nitroCharge > 20
                  ? 'text-[#38BDF8]'
                  : 'text-red-400'
              }`}
            >
              {isBoostingNitro
                ? 'ĐANG ĐỐT'
                : nitroCharge > 20
                ? 'SẴN SÀNG'
                : 'CẦN >20%'}
            </span>
          </div>
        </button>

        {/* Rescue Button [R] */}
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            window.dispatchEvent(
              new KeyboardEvent('keydown', { code: 'KeyR' })
            );
            setTimeout(() => {
              window.dispatchEvent(
                new KeyboardEvent('keyup', { code: 'KeyR' })
              );
            }, 60);
          }}
          className="px-3.5 py-1.5 rounded-xl bg-[#0F172A]/90 hover:bg-[#4A6046] text-[#FDE047] border border-[#7A9A75] text-[11px] font-bold cursor-pointer"
        >
          🛟 Giải Cứu Xe Kẹt [Phím R]
        </button>
      </div>

      {/* Right Column: Real-Life Automotive Circular Speedometer & Tachometer Gauge (Requirement #5) */}
      <div
        data-testid="speedometer-hud"
        className={`relative w-[184px] h-[184px] rounded-full bg-gradient-to-b from-[#0F172A] via-[#090D16] to-[#020617] border-4 shadow-2xl flex items-center justify-center ${
          isBoostingNitro
            ? 'border-[#38BDF8] shadow-[0_0_30px_rgba(56,189,248,0.65)]'
            : 'border-[#475569]'
        }`}
      >
        <svg
          viewBox="0 0 184 184"
          className="w-full h-full overflow-visible"
          role="img"
          aria-label={`Đồng hồ tốc độ ${speedKmh} km/h`}
        >
          <defs>
            <linearGradient id="speedArcGrad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="55%" stopColor="#38BDF8" />
              <stop offset="80%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>

          {/* Outer Background Track Arc (-210 to +30 deg) */}
          <path
            d={describeArc(-210, 30, rOuter)}
            fill="none"
            stroke="#1E293B"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Redline Zone Arc (from +240 km/h to 320 km/h => -30 deg to +30 deg) */}
          <path
            d={describeArc(-30, 30, rOuter)}
            fill="none"
            stroke="rgba(239, 68, 68, 0.4)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Active Speed Glow Arc */}
          {speedRatio > 0.01 && (
            <path
              d={describeArc(-210, needleDeg, rOuter)}
              fill="none"
              stroke="url(#speedArcGrad)"
              strokeWidth="8"
              strokeLinecap="round"
            />
          )}

          {/* Minor & Major Ticks + Numeric Labels (0..320 km/h) */}
          {Array.from({ length: majorStepCount * 2 + 1 }, (_, idx) => {
            const frac = idx / (majorStepCount * 2);
            const deg = startDeg + frac * sweepDeg;
            const isMajor = idx % 2 === 0;
            const speedVal = Math.round(frac * maxDialSpeed);
            const isRedline = speedVal >= 240;

            const outerPt = polarToCartesian(deg, rTicks);
            const innerPt = polarToCartesian(
              deg,
              isMajor ? rTicks - 10 : rTicks - 5
            );
            const labelPt = polarToCartesian(deg, rTicks - 22);

            return (
              <g key={idx}>
                <line
                  x1={outerPt.x}
                  y1={outerPt.y}
                  x2={innerPt.x}
                  y2={innerPt.y}
                  stroke={
                    isRedline
                      ? '#EF4444'
                      : isMajor
                      ? '#F8FAFC'
                      : '#64748B'
                  }
                  strokeWidth={isMajor ? '2.2' : '1.2'}
                />
                {isMajor && (
                  <text
                    x={labelPt.x}
                    y={labelPt.y + 3}
                    textAnchor="middle"
                    fill={isRedline ? '#F87171' : '#CBD5E1'}
                    fontSize="8.5"
                    fontWeight="800"
                    className="font-mono-num"
                  >
                    {speedVal}
                  </text>
                )}
              </g>
            );
          })}

          {/* Rotating Analog Speedometer Needle */}
          <g transform={`rotate(${needleDeg} ${cx} ${cy})`}>
            {/* Needle shadow/glow */}
            <polygon
              points={`${cx - 14},${cy - 2.5} ${cx + 62},${cy} ${cx - 14},${cy + 2.5}`}
              fill={isBoostingNitro ? '#38BDF8' : '#EF4444'}
            />
            <polygon
              points={`${cx - 8},${cy - 1.2} ${cx + 56},${cy} ${cx - 8},${cy + 1.2}`}
              fill="#FEF08A"
            />
          </g>

          {/* Center Pivot Cap */}
          <circle
            cx={cx}
            cy={cy}
            r="11"
            fill="#1E293B"
            stroke="#F59E0B"
            strokeWidth="2.5"
          />
          <circle cx={cx} cy={cy} r="4.5" fill="#F59E0B" />
        </svg>

        {/* Bottom Digital Gear + KM/H + RPM Readout Overlay */}
        <div className="absolute inset-x-0 bottom-3 flex flex-col items-center pointer-events-none">
          {/* Gear Indicator Pill + RPM */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`px-2 py-0.5 rounded font-mono-num text-[11px] font-black border ${
                isBoostingNitro
                  ? 'bg-[#38BDF8] text-[#0F172A] border-[#E0F2FE]'
                  : gear === 'R'
                  ? 'bg-red-600 text-white border-red-300'
                  : 'bg-[#1E293B] text-[#F59E0B] border-[#F59E0B]/60'
              }`}
            >
              GEAR {gear}
            </span>
            <span className="font-mono-num text-[9px] font-bold text-[#94A3B8]">
              {rpmValue}k RPM
            </span>
          </div>

          {/* Digital Speed Readout */}
          <div className="flex items-baseline gap-1 bg-[#020617]/90 px-3 py-0.5 rounded-lg border border-slate-700">
            <span
              className={`font-mono-num text-2xl font-black leading-none ${
                isBoostingNitro
                  ? 'text-[#38BDF8]'
                  : speedKmh >= 240
                  ? 'text-[#F87171]'
                  : 'text-white'
              }`}
            >
              {speedKmh}
            </span>
            <span className="text-[9px] font-black text-[#F59E0B] uppercase">
              KM/H
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RaceCanvas: React.FC<RaceCanvasProps> = ({
  lobby,
  localPlayerId,
  isTeacher,
  isPaused,
  onTogglePause,
  onRaceComplete,
  onExitRace,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const manualNitroHoldRef = useRef<boolean>(false);

  // Low-frequency HUD state (updated at ~8Hz so React never re-renders at 60Hz)
  const [hudState, setHudState] = useState<{
    countdownText: string | null;
    rocketStartBanner: boolean;
    finalLapBanner: boolean;
    speedKmh: number;
    rawSpeed: number;
    nitroCharge: number;
    isBoostingNitro: boolean;
    drifting: boolean;
    lap: number;
    totalLaps: number;
    placement: number;
    totalRacers: number;
    heldItem: RaceItemType | null;
    stuckWarning: boolean;
    wrongWay: boolean;
    finishCountdownSec: number | null;
    inReplayMode: boolean;
    ghostWatermarkOpacity: number;
    top5List: { id: string; username: string; placement: number; lap: number }[];
    incomingRocket: {
      distanceMeters: number;
      direction: 'left' | 'center' | 'right';
    } | null;
    rearThreats: {
      id: string;
      username: string;
      distanceMeters: number;
      laneOffset: number; // -1 (left) .. +1 (right)
    }[];
    killfeed: {
      id: string;
      text: string;
      category: 'rocket' | 'trap' | 'lead' | 'lap';
    }[];
  }>({
    countdownText: '3',
    rocketStartBanner: false,
    finalLapBanner: false,
    speedKmh: 0,
    rawSpeed: 0,
    nitroCharge: 100,
    isBoostingNitro: false,
    drifting: false,
    lap: 1,
    totalLaps: lobby.laps,
    placement: 1,
    totalRacers: lobby.participants.length,
    heldItem: null,
    stuckWarning: false,
    wrongWay: false,
    finishCountdownSec: null,
    inReplayMode: false,
    ghostWatermarkOpacity: 0.35,
    top5List: [],
    incomingRocket: null,
    rearThreats: [],
    killfeed: [],
  });

  // Teacher camera controls
  const [cameraMode, setCameraMode] = useState<
    'player' | 'overview' | 'leader' | 'spectate'
  >(localPlayerId ? 'player' : 'leader');
  const [spectateIdx, setSpectateIdx] = useState(0);

  const cameraModeRef = useRef(cameraMode);
  const spectateIdxRef = useRef(spectateIdx);
  const isPausedRef = useRef(isPaused);
  const supplyDropTriggerRef = useRef(false);
  const forceFinishTriggerRef = useRef(false);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);
  useEffect(() => {
    spectateIdxRef.current = spectateIdx;
  }, [spectateIdx]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    const map =
      MAPS.find((m) => m.id === lobby.mapId) || MAPS[0];
    const diffProfile =
      BOT_DIFFICULTY_PROFILES[lobby.botDifficulty || 'medium'];

    let width = canvas.clientWidth || window.innerWidth;
    let height = canvas.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Initialize all racers on starting grid behind waypoint 0
    const startPt = map.waypoints[0];
    const nextPt = map.waypoints[1];
    const startAngle = Math.atan2(
      nextPt.y - startPt.y,
      nextPt.x - startPt.x
    );
    const perpAngle = startAngle + Math.PI / 2;

    const racers: RacerState[] = lobby.participants.map((p, idx) => {
      const row = Math.floor(idx / 4);
      const col = (idx % 4) - 1.5;
      const backDist = 45 + row * 48;
      const sideDist = col * 38;

      return {
        id: p.id,
        username: p.username,
        isBot: p.isBot,
        isTeacher: p.isTeacher,
        teamId: p.teamId,
        loadout: p.loadout,
        rp: p.rp,
        x:
          startPt.x -
          Math.cos(startAngle) * backDist +
          Math.cos(perpAngle) * sideDist,
        y:
          startPt.y -
          Math.sin(startAngle) * backDist +
          Math.sin(perpAngle) * sideDist,
        vx: 0,
        vy: 0,
        angle: startAngle,
        speed: 0,
        angularVelocity: 0,
        drifting: false,
        lap: 1,
        currentCheckpoint: 0,
        waypointIndex: 1,
        totalProgress: 0,
        finished: false,
        finishTimeMs: 0,
        placement: idx + 1,
        heldItem: null,
        nitroCharge: 100,
        isBoostingNitro: false,
        nitroTimer: 0,
        spinTimer: 0,
        mudTimer: 0,
        stunTimer: 0,
        invulnerableTimer: 0,
        rocketStartTimer: 0,
        stuckTimer: 0,
        wrongWay: false,
        useShortcutThisLap: Math.random() < diffProfile.shortcutChance,
      };
    });

    // Spawn Item Gift Boxes along track segments
    const itemBoxes: TrackItemBox[] = [];
    for (let i = 1; i < map.waypoints.length; i += 3) {
      const wp = map.waypoints[i];
      const next = map.waypoints[(i + 1) % map.waypoints.length];
      const segAngle = Math.atan2(next.y - wp.y, next.x - wp.x);
      const normal = segAngle + Math.PI / 2;
      for (const offset of [-48, 0, 48]) {
        itemBoxes.push({
          id: `box_${i}_${offset}`,
          x: wp.x + Math.cos(normal) * offset,
          y: wp.y + Math.sin(normal) * offset,
          active: true,
          respawnTimer: 0,
        });
      }
    }

    const hazards: DeployedHazard[] = [];
    const trailPool = new TrailParticlePool(500);

    // Screen-Space Dynamic Weather Particles (60 particles per map theme)
    const weatherParticles = Array.from({ length: 60 }, (_, idx) => ({
      x: ((idx * 131 + 17) % 100) / 100 * width,
      y: ((idx * 197 + 31) % 100) / 100 * height,
      speedX:
        map.theme === 'city'
          ? -140 - (idx % 5) * 25
          : map.theme === 'cryo'
          ? -35 + (idx % 7) * 10
          : (idx % 2 === 0 ? 1 : -1) * (15 + (idx % 4) * 6),
      speedY:
        map.theme === 'city'
          ? 520 + (idx % 6) * 45
          : map.theme === 'cryo'
          ? 95 + (idx % 5) * 22
          : map.theme === 'aorta'
          ? -45 - (idx % 4) * 14
          : -18 + (idx % 5) * 8,
      size:
        map.theme === 'city'
          ? 14 + (idx % 4) * 4
          : map.theme === 'cryo'
          ? 2.2 + (idx % 3) * 1.1
          : 2.5 + (idx % 3) * 1.2,
      phase: idx * 0.65,
    }));

    // Live Race Killfeed Queue & Final Lap Banner Timer
    const killfeedQueue: {
      id: string;
      text: string;
      category: 'rocket' | 'trap' | 'lead' | 'lap';
      expiresAt: number;
    }[] = [];
    let currentTop1Id: string | null = racers[0]?.id || null;
    let finalLapBannerTimer = 0;

    const pushKillfeed = (
      text: string,
      category: 'rocket' | 'trap' | 'lead' | 'lap',
      nowSec: number
    ) => {
      killfeedQueue.unshift({
        id: `kf_${nowSec}_${Math.random()}`,
        text,
        category,
        expiresAt: nowSec + 3.8,
      });
      if (killfeedQueue.length > 4) {
        killfeedQueue.length = 4;
      }
    };

    // Replay ring buffer (stores last 3.2 seconds of frames before Top 1 finishes)
    const replayBuffer: ReplayFrame[] = [];
    let isReplayPhase = false;
    let replayTimer = 0;
    let completedCallbackFired = false;

    // Countdown & Race Timers
    let elapsedRaceSec = -3.2; // -3.2 .. 0 is 3..2..1..GO!
    let lastBeepStep = 4;
    let rocketStartArmed = false;
    let rocketStartWindowHit = false;
    let firstFinisherElapsedSec: number | null = null;

    // Camera smoothed state
    const cam = {
      x: startPt.x,
      y: startPt.y,
      zoom: 1.0,
    };

    // Input state (Unikey / Vietnamese IME Telex & VNI resilient)
    const keys = new Set<string>();
    const justPressed = new Set<string>();

    // Blur any active button/input on race mount so browser IME doesn't capture WASD
    if (
      typeof document !== 'undefined' &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInInput(e.target)) return;
      const mapped = extractGameKeysFromKeyDown(e);
      if (mapped.length === 0) return;

      e.preventDefault();
      for (const code of mapped) {
        if (!keys.has(code)) {
          justPressed.add(code);
        }
        keys.add(code);

        if (code === 'Escape' || code === 'KeyP') {
          onTogglePause();
        }

        // Rocket Start timing check: pressing W / ArrowUp right as GO! appears (-0.45s .. +0.35s)
        if (
          (code === 'KeyW' || code === 'ArrowUp') &&
          elapsedRaceSec >= -0.45 &&
          elapsedRaceSec <= 0.35 &&
          !rocketStartArmed
        ) {
          rocketStartArmed = true;
          rocketStartWindowHit = true;
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
      manualNitroHoldRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    soundEngine.startBGM();

    // Helper to use held item
    const useRacerItem = (racer: RacerState) => {
      if (!racer.heldItem) return;
      const item = racer.heldItem;
      racer.heldItem = null;

      if (item === 'nitro') {
        racer.nitroTimer = 2.5;
        racer.nitroCharge = 100;
        if (racer.id === localPlayerId) soundEngine.playBoost();
      } else if (item === 'banana') {
        hazards.push({
          id: `hz_${Date.now()}_${Math.random()}`,
          type: 'banana',
          ownerId: racer.id,
          x: racer.x - Math.cos(racer.angle) * 34,
          y: racer.y - Math.sin(racer.angle) * 34,
          vx: 0,
          vy: 0,
          angle: 0,
          ttl: 25,
        });
      } else if (item === 'mud') {
        hazards.push({
          id: `hz_${Date.now()}_${Math.random()}`,
          type: 'mud',
          ownerId: racer.id,
          x: racer.x - Math.cos(racer.angle) * 44,
          y: racer.y - Math.sin(racer.angle) * 44,
          vx: 0,
          vy: 0,
          angle: 0,
          ttl: 25,
        });
      } else if (item === 'rocket') {
        hazards.push({
          id: `hz_${Date.now()}_${Math.random()}`,
          type: 'rocket',
          ownerId: racer.id,
          x: racer.x + Math.cos(racer.angle) * 32,
          y: racer.y + Math.sin(racer.angle) * 32,
          vx: Math.cos(racer.angle) * 560,
          vy: Math.sin(racer.angle) * 560,
          angle: racer.angle,
          ttl: 6.5,
          waypointTargetIdx: racer.waypointIndex,
        });
        if (racer.id === localPlayerId) soundEngine.playBoost();
      }
    };

    let lastTime = performance.now();
    let lastRenderTime = 0;
    let hudSyncAccum = 0;
    let animId = 0;

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);

      if (isHeadless && now - lastRenderTime < 66) {
        return;
      }
      lastRenderTime = now;

      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const nowSec = now / 1000;

      if (isPausedRef.current) {
        soundEngine.stopEngineHum();
        return;
      }

      // Teacher Supply Drop Action ("🎁 Thả Tiếp Tế")
      if (supplyDropTriggerRef.current) {
        supplyDropTriggerRef.current = false;
        for (let i = 0; i < Math.min(8, racers.length); i++) {
          const r = racers[i];
          const aheadX = r.x + Math.cos(r.angle) * 210 + (Math.random() - 0.5) * 70;
          const aheadY = r.y + Math.sin(r.angle) * 210 + (Math.random() - 0.5) * 70;
          itemBoxes.push({
            id: `supply_${Date.now()}_${i}`,
            x: aheadX,
            y: aheadY,
            active: true,
            respawnTimer: 0,
          });
        }
        soundEngine.playCoin();
      }

      // =========================================================
      // PHASE A: 3-SECOND SLOW-MOTION MINI REPLAY OF TOP 1
      // =========================================================
      if (isReplayPhase) {
        replayTimer += rawDt;
        soundEngine.stopEngineHum();

        if (replayBuffer.length > 0) {
          const progress = Math.min(1, replayTimer / 2.6);
          const frameIdx = Math.min(
            replayBuffer.length - 1,
            Math.floor(progress * replayBuffer.length)
          );
          const frame = replayBuffer[frameIdx];
          const leaderCar =
            frame.cars.find((c) => c.id === frame.leaderId) || frame.cars[0];

          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);

          ctx.fillStyle = map.bgColor;
          ctx.fillRect(0, 0, width, height);

          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.scale(1.35, 1.35);
          ctx.translate(-leaderCar.x, -leaderCar.y);

          drawRaceTrack(ctx, map, itemBoxes, [], nowSec);
          for (const c of frame.cars) {
            if (
              Math.abs(c.x - leaderCar.x) > width &&
              Math.abs(c.y - leaderCar.y) > height
            ) {
              continue;
            }
            drawModularCar(ctx, c.loadout, {
              x: c.x,
              y: c.y,
              angle: c.angle,
              nowSec,
              drifting: c.drifting,
              nitroActive: c.nitroTimer > 0,
              rocketStartActive: c.rocketStartTimer > 0,
              username: c.id === frame.leaderId ? c.username : undefined,
              isPlayer: c.id === frame.leaderId,
              showHeadlightBeams: isNightMapTheme(map.theme),
            });
          }
          ctx.restore();

          // Slow-Mo Cinema Letterbox Bars
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.fillRect(0, 0, width, 64);
          ctx.fillRect(0, height - 64, width, 64);

          ctx.fillStyle = '#F59E0B';
          ctx.font = '800 18px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            `🎥 MINI REPLAY SLOW-MOTION (0.5x): PHA BỨT TỐC VỀ ĐÍCH CỦA TOP 1 — ${leaderCar.username}`,
            width / 2,
            38
          );
          ctx.restore();
        }

        if (replayTimer >= 2.6 && !completedCallbackFired) {
          completedCallbackFired = true;
          soundEngine.stopBGM();
          onRaceComplete(racers);
        }
        return;
      }

      // =========================================================
      // PHASE B: ACTIVE RACE SIMULATION (60 FPS)
      // =========================================================
      elapsedRaceSec += dt;

      // Countdown Beeps (3.. 2.. 1.. GO!)
      if (elapsedRaceSec < 0) {
        const step = Math.ceil(-elapsedRaceSec);
        if (step !== lastBeepStep && step <= 3 && step >= 1) {
          lastBeepStep = step;
          soundEngine.playCountdown(false);
        }
      } else if (lastBeepStep !== 0) {
        lastBeepStep = 0;
        soundEngine.playCountdown(true);
        const localRacer = racers.find((r) => r.id === localPlayerId);
        if (localRacer && rocketStartWindowHit) {
          localRacer.rocketStartTimer = 1.0;
          soundEngine.playBoost();
        }
        for (const r of racers) {
          if (r.isBot && Math.random() < diffProfile.rocketStartChance) {
            r.rocketStartTimer = 1.0;
          }
        }
      }

      const raceStarted = elapsedRaceSec >= 0;

      // Respawn item boxes
      for (const box of itemBoxes) {
        if (!box.active) {
          box.respawnTimer -= dt;
          if (box.respawnTimer <= 0) {
            box.active = true;
          }
        }
      }

      // Update Homing Rockets & Hazards
      for (let i = hazards.length - 1; i >= 0; i--) {
        const hz = hazards[i];
        hz.ttl -= dt;
        if (hz.ttl <= 0) {
          hazards.splice(i, 1);
          continue;
        }

        if (hz.type === 'rocket') {
          let bestTarget: RacerState | null = null;
          let bestDist = 750;
          for (const candidate of racers) {
            if (
              candidate.id === hz.ownerId ||
              candidate.finished ||
              candidate.invulnerableTimer > 0
            ) {
              continue;
            }
            const d = Math.hypot(candidate.x - hz.x, candidate.y - hz.y);
            if (d < bestDist) {
              bestDist = d;
              bestTarget = candidate;
            }
          }

          if (bestTarget) {
            const desiredAngle = Math.atan2(
              bestTarget.y - hz.y,
              bestTarget.x - hz.x
            );
            let diff = desiredAngle - hz.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            hz.angle += Math.sign(diff) * Math.min(Math.abs(diff), 5.5 * dt);
          } else {
            const wpIdx = (hz.waypointTargetIdx || 0) % map.waypoints.length;
            const wp = map.waypoints[wpIdx];
            const distWp = Math.hypot(wp.x - hz.x, wp.y - hz.y);
            if (distWp < 120) {
              hz.waypointTargetIdx = (wpIdx + 1) % map.waypoints.length;
            }
            hz.angle = Math.atan2(wp.y - hz.y, wp.x - hz.x);
          }

          hz.vx = Math.cos(hz.angle) * 600;
          hz.vy = Math.sin(hz.angle) * 600;
          hz.x += hz.vx * dt;
          hz.y += hz.vy * dt;
        }

        // Check collision with racers
        for (const r of racers) {
          if (
            r.id === hz.ownerId ||
            r.finished ||
            r.invulnerableTimer > 0
          ) {
            continue;
          }
          const hitRadius = hz.type === 'mud' ? 42 : 26;
          if (Math.hypot(r.x - hz.x, r.y - hz.y) < hitRadius) {
            const attacker = racers.find((rc) => rc.id === hz.ownerId);
            const attackerName = attacker ? attacker.username : 'Đối thủ';
            if (hz.type === 'banana') {
              r.spinTimer = 1.5;
              r.speed *= 0.25;
              if (r.id === localPlayerId) soundEngine.playHazardHit();
              pushKillfeed(
                `🍌 ${r.username} trượt vỏ chuối của ${attackerName}!`,
                'trap',
                nowSec
              );
              hazards.splice(i, 1);
              break;
            } else if (hz.type === 'mud') {
              if (r.mudTimer <= 0.5) {
                pushKillfeed(
                  `💩 ${r.username} sa lầy bẫy bùn của ${attackerName}!`,
                  'trap',
                  nowSec
                );
              }
              r.mudTimer = 3.0;
              if (r.id === localPlayerId) soundEngine.playHazardHit();
            } else if (hz.type === 'rocket') {
              r.stunTimer = 2.0;
              r.speed = 0;
              r.vx = 0;
              r.vy = 0;
              if (r.id === localPlayerId) soundEngine.playExplosion();
              pushKillfeed(
                `🚀 ${attackerName} bắn trúng tên lửa vào ${r.username}!`,
                'rocket',
                nowSec
              );
              hazards.splice(i, 1);
              break;
            }
          }
        }
      }

      // Step every Racer (Human + AI Bots)
      for (const r of racers) {
        if (r.finished) {
          r.isBoostingNitro = false;
          r.speed *= Math.pow(0.1, dt);
          r.x += Math.cos(r.angle) * r.speed * dt;
          r.y += Math.sin(r.angle) * r.speed * dt;
          continue;
        }

        // Decrement timers
        if (r.nitroTimer > 0) r.nitroTimer = Math.max(0, r.nitroTimer - dt);
        if (r.rocketStartTimer > 0)
          r.rocketStartTimer = Math.max(0, r.rocketStartTimer - dt);
        if (r.spinTimer > 0) r.spinTimer = Math.max(0, r.spinTimer - dt);
        if (r.mudTimer > 0) r.mudTimer = Math.max(0, r.mudTimer - dt);
        if (r.stunTimer > 0) r.stunTimer = Math.max(0, r.stunTimer - dt);
        if (r.invulnerableTimer > 0)
          r.invulnerableTimer = Math.max(0, r.invulnerableTimer - dt);

        if (!raceStarted) continue;

        let accelInput = 0;
        let steerInput = 0;
        let wantsShiftNitro = false;

        if (!r.isBot && r.id === localPlayerId) {
          // Human PC Controls
          const up = keys.has('KeyW') || keys.has('ArrowUp');
          const down = keys.has('KeyS') || keys.has('ArrowDown');
          const left = keys.has('KeyA') || keys.has('ArrowLeft');
          const right = keys.has('KeyD') || keys.has('ArrowRight');
          const shiftHeld =
            keys.has('ShiftLeft') ||
            keys.has('ShiftRight') ||
            manualNitroHoldRef.current;

          if (up || shiftHeld) accelInput = 1;
          else if (down) accelInput = -1;
          if (left) steerInput -= 1;
          if (right) steerInput += 1;

          wantsShiftNitro = shiftHeld;

          if (
            (justPressed.has('ShiftLeft') || justPressed.has('ShiftRight')) &&
            r.nitroCharge > 20 &&
            !r.isBoostingNitro
          ) {
            soundEngine.playBoost();
          }

          if (justPressed.has('Space') && r.heldItem) {
            useRacerItem(r);
          }
          if (justPressed.has('KeyR')) {
            const rescued = applyCarRescue(r, map);
            Object.assign(r, rescued);
            soundEngine.playCoin();
          }
        } else {
          // Intelligent AI Bot Steering & Item Policy scaled by BotDifficulty
          accelInput = 1;
          let targetPt = map.waypoints[r.waypointIndex % map.waypoints.length];

          if (
            r.useShortcutThisLap &&
            r.waypointIndex > map.shortcut.entryWaypointIndex &&
            r.waypointIndex <= map.shortcut.exitWaypointIndex
          ) {
            targetPt = map.shortcut.path[1] || targetPt;
          }

          const distToTarget = Math.hypot(
            targetPt.x - r.x,
            targetPt.y - r.y
          );
          if (distToTarget < 145) {
            r.waypointIndex = (r.waypointIndex + 1) % map.waypoints.length;
          }

          const desiredAngle = Math.atan2(
            targetPt.y - r.y,
            targetPt.x - r.x
          );
          let angleDiff = desiredAngle - r.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          if (angleDiff > 0.07) steerInput = 1;
          else if (angleDiff < -0.07) steerInput = -1;

          // AI Bot uses Shift Nitro on straightaways according to difficulty
          if (
            Math.abs(angleDiff) < 0.2 &&
            r.nitroCharge > Math.max(21, diffProfile.nitroUseThreshold)
          ) {
            wantsShiftNitro = true;
          } else if (
            r.isBoostingNitro &&
            r.nitroCharge > 25 &&
            Math.abs(angleDiff) < 0.3
          ) {
            wantsShiftNitro = true;
          }

          if (r.stuckTimer > 3.0) {
            const rescued = applyCarRescue(r, map);
            Object.assign(r, rescued);
          }

          if (r.heldItem && Math.random() < diffProfile.itemRate * dt) {
            useRacerItem(r);
          }
        }

        // Process Shift Nitro Bar consumption & recharge
        // Requirement #3: Chỉ cho phép bật Nitro khi nạp được hơn 20% (> 20%), tránh spam Nitro!
        const canContinueOrStartNitro = r.isBoostingNitro
          ? r.nitroCharge > 0
          : r.nitroCharge > 20;

        if (
          wantsShiftNitro &&
          canContinueOrStartNitro &&
          r.stunTimer <= 0 &&
          r.spinTimer <= 0
        ) {
          if (!r.isBoostingNitro) {
            // Deduct small initial ignition cost (3.5%) on fresh activation to prevent rapid Shift-tap spamming
            r.nitroCharge = Math.max(0, r.nitroCharge - 3.5);
          }
          r.isBoostingNitro = true;
          r.nitroCharge = Math.max(0, r.nitroCharge - 36 * dt);
          if (r.nitroCharge <= 0) {
            r.isBoostingNitro = false;
          }
        } else {
          r.isBoostingNitro = false;
          // Recharge faster when drifting!
          const rechargeRate = r.drifting ? 28 : 9;
          r.nitroCharge = Math.min(100, r.nitroCharge + rechargeRate * dt);
        }

        // Check surface (Asphalt vs Grass off-road vs Natural Swamp Mud vs Boost Zones)
        const trackCheck = isPointOnTrack({ x: r.x, y: r.y }, map);

        for (const mz of map.naturalMudZones) {
          if (Math.hypot(r.x - mz.x, r.y - mz.y) < mz.radius) {
            r.mudTimer = Math.max(r.mudTimer, 0.35);
          }
        }

        let onBoostPad = false;
        for (const bz of map.boostZones) {
          if (Math.hypot(r.x - bz.x, r.y - bz.y) < bz.radius) {
            onBoostPad = true;
            break;
          }
        }

        // Base fair speed for all cars: 335 px/s (scaled by difficulty for AI Bots)
        let maxSpeed = r.isBot ? 335 * diffProfile.speedMul : 335;
        if (r.nitroTimer > 0 || r.rocketStartTimer > 0) {
          maxSpeed *= 1.6;
        } else if (r.isBoostingNitro) {
          maxSpeed *= 1.38; // Shift Nitro Boost!
        } else if (onBoostPad) {
          maxSpeed *= 1.42;
        }

        if (r.mudTimer > 0) {
          maxSpeed *= 0.3;
        } else if (!trackCheck.onRoad) {
          maxSpeed *= 0.55;
        }

        if (r.stunTimer > 0) {
          r.speed = 0;
          r.vx = 0;
          r.vy = 0;
        } else if (r.spinTimer > 0) {
          r.angle += 12.5 * dt;
          r.speed *= Math.pow(0.25, dt);
        } else {
          const accelRate =
            r.nitroTimer > 0 || r.rocketStartTimer > 0
              ? 640
              : r.isBoostingNitro
              ? 560
              : 395;
          if (accelInput > 0) {
            r.speed = Math.min(maxSpeed, r.speed + accelRate * dt);
          } else if (accelInput < 0) {
            r.speed = Math.max(-140, r.speed - 360 * dt);
          } else {
            r.speed *= Math.pow(0.25, dt);
          }

          if (r.speed > maxSpeed) {
            r.speed = Math.max(maxSpeed, r.speed - 450 * dt);
          }

          const turnStrength = r.isBot
            ? 3.1 * diffProfile.turnMul
            : 3.15;
          const speedFactor = Math.min(1, Math.abs(r.speed) / 95);
          const dirSign = r.speed >= 0 ? 1 : -1;
          r.angle += steerInput * turnStrength * speedFactor * dirSign * dt;
        }

        r.drifting =
          Math.abs(r.speed) > 165 && Math.abs(steerInput) > 0 && r.spinTimer <= 0;

        // Lateral grip
        const baseGrip = map.theme === 'cryo' ? 3.2 : r.drifting ? 5.2 : 10.5;
        const targetVx = Math.cos(r.angle) * r.speed;
        const targetVy = Math.sin(r.angle) * r.speed;
        r.vx += (targetVx - r.vx) * Math.min(1, baseGrip * dt);
        r.vy += (targetVy - r.vy) * Math.min(1, baseGrip * dt);

        r.x += r.vx * dt;
        r.y += r.vy * dt;

        // Tire barrier collision
        for (const tb of map.tireBarriers) {
          const dx = r.x - tb.x;
          const dy = r.y - tb.y;
          const dist = Math.hypot(dx, dy);
          const minDist = tb.radius + 18;
          if (dist < minDist && dist > 0.001) {
            const nx = dx / dist;
            const ny = dy / dist;
            r.x = tb.x + nx * minDist;
            r.y = tb.y + ny * minDist;
            r.vx = nx * 140;
            r.vy = ny * 140;
            r.speed *= -0.35;
            if (r.id === localPlayerId) soundEngine.playHazardHit();
          }
        }

        // Stuck detection (> 3 seconds nearly stationary or far off road)
        if (Math.hypot(r.vx, r.vy) < 25 || !trackCheck.onRoad) {
          r.stuckTimer += dt;
        } else {
          r.stuckTimer = 0;
        }

        // Item Gift Box pickup (+20 Nitro charge bonus!)
        if (!r.heldItem) {
          for (const box of itemBoxes) {
            if (!box.active) continue;
            if (Math.hypot(r.x - box.x, r.y - box.y) < 34) {
              box.active = false;
              box.respawnTimer = 4.5;
              r.heldItem = rollRaceItem(r.placement, racers.length);
              r.nitroCharge = Math.min(100, r.nitroCharge + 20);
              if (r.id === localPlayerId) soundEngine.playCoin();
              break;
            }
          }
        }

        // 10 Hidden Checkpoints & Lap progression
        const nextCpIdx = (r.currentCheckpoint + 1) % map.checkpointIndices.length;
        const nextCpWaypointIdx = map.checkpointIndices[nextCpIdx];
        const cpPt = map.waypoints[nextCpWaypointIdx];

        const distToNextCp = Math.hypot(r.x - cpPt.x, r.y - cpPt.y);
        if (distToNextCp < map.roadWidth * 0.95) {
          if (nextCpIdx === 0 && r.currentCheckpoint >= 7) {
            r.lap += 1;
            r.currentCheckpoint = 0;
            r.nitroCharge = Math.min(100, r.nitroCharge + 25);
            r.useShortcutThisLap = Math.random() < diffProfile.shortcutChance;
            if (r.id === localPlayerId) soundEngine.playCoin();

            // Check Final Lap entry
            if (r.lap === lobby.laps && lobby.laps > 1) {
              if (r.id === localPlayerId || (!localPlayerId && r.placement === 1)) {
                finalLapBannerTimer = 3.2;
                soundEngine.playFanfare(false);
                pushKillfeed(
                  `🔥 ${r.username} bước vào VÒNG ĐUA CUỐI (Final Lap)!`,
                  'lap',
                  nowSec
                );
              }
            }

            if (r.lap > lobby.laps) {
              r.finished = true;
              r.finishTimeMs = Math.round(elapsedRaceSec * 1000);
              pushKillfeed(
                `🏁 ${r.username} đã cán đích hoàn thành chặng đua!`,
                'lap',
                nowSec
              );
              if (firstFinisherElapsedSec === null) {
                firstFinisherElapsedSec = elapsedRaceSec;
              }
            }
          } else if (nextCpIdx > 0) {
            r.currentCheckpoint = nextCpIdx;
          }
        }

        // Check wrong-way indicator against current segment tangent
        const segA = map.waypoints[trackCheck.nearestSegmentIdx];
        const segB =
          map.waypoints[(trackCheck.nearestSegmentIdx + 1) % map.waypoints.length];
        const segAngle = Math.atan2(segB.y - segA.y, segB.x - segA.x);
        const dot =
          Math.cos(r.angle) * Math.cos(segAngle) +
          Math.sin(r.angle) * Math.sin(segAngle);
        r.wrongWay = r.speed > 60 && dot < -0.45;

        // Calculate continuous progress score
        const segProgress = distanceToSegment({ x: r.x, y: r.y }, segA, segB).t;
        r.totalProgress =
          (r.lap - 1) * 100 +
          r.currentCheckpoint * 10 +
          segProgress;

        // Spawn tire/exhaust trail particles ONLY when Nitro is active (Requirement #2)
        const isNitroActive =
          r.nitroTimer > 0 || r.isBoostingNitro || r.rocketStartTimer > 0;
        trailPool.spawnFromCar(
          r.x,
          r.y,
          r.angle,
          Math.hypot(r.vx, r.vy),
          isNitroActive,
          r.loadout.trail,
          nowSec
        );
      }

      if (finalLapBannerTimer > 0) {
        finalLapBannerTimer = Math.max(0, finalLapBannerTimer - dt);
      }

      justPressed.clear();

      // Sort live placements
      const sortedByProgress = [...racers].sort((a, b) => {
        if (a.finished && b.finished) return a.finishTimeMs - b.finishTimeMs;
        if (a.finished) return -1;
        if (b.finished) return 1;
        return b.totalProgress - a.totalProgress;
      });
      sortedByProgress.forEach((r, idx) => {
        r.placement = idx + 1;
      });

      // Check if Top 1 leader changed after race started
      const currentLeader = sortedByProgress[0];
      if (
        raceStarted &&
         elapsedRaceSec > 2.0 &&
        currentLeader &&
        currentLeader.id !== currentTop1Id
      ) {
        currentTop1Id = currentLeader.id;
        pushKillfeed(
          `👑 ${currentLeader.username} vươn lên dẫn đầu Top 1!`,
          'lead',
          nowSec
        );
      }

      // Prune expired Killfeed items
      for (let k = killfeedQueue.length - 1; k >= 0; k--) {
        if (killfeedQueue[k].expiresAt <= nowSec) {
          killfeedQueue.splice(k, 1);
        }
      }

      // Record replay frame while Top 1 hasn't finished yet
      if (firstFinisherElapsedSec === null && currentLeader) {
        replayBuffer.push({
          timestamp: elapsedRaceSec,
          leaderId: currentLeader.id,
          cars: racers.map((rc) => ({
            id: rc.id,
            username: rc.username,
            x: rc.x,
            y: rc.y,
            angle: rc.angle,
            loadout: rc.loadout,
            drifting: rc.drifting,
            nitroTimer: rc.nitroTimer > 0 || rc.isBoostingNitro ? 1 : 0,
            rocketStartTimer: rc.rocketStartTimer,
          })),
        });
        if (replayBuffer.length > 180) {
          replayBuffer.shift();
        }
      }

      // Check 20-second post-finish countdown or all human players finished
      const allFinished = racers.every((r) => r.finished);
      const timeSinceFirstFinish =
        firstFinisherElapsedSec !== null
          ? elapsedRaceSec - firstFinisherElapsedSec
          : 0;

      if (
        (firstFinisherElapsedSec !== null && timeSinceFirstFinish >= 20) ||
        allFinished ||
        forceFinishTriggerRef.current
      ) {
        forceFinishTriggerRef.current = false;
        sortedByProgress.forEach((r, idx) => {
          r.placement = idx + 1;
          if (!r.finished) {
            r.finished = true;
            r.finishTimeMs = Math.round((elapsedRaceSec + idx * 1.5) * 1000);
          }
        });
        isReplayPhase = true;
        replayTimer = 0;
        setHudState((prev) => ({ ...prev, inReplayMode: true }));
        return;
      }

      // Determine Camera Target, Dynamic Nitro Zoom-Out & Engine Shake
      const localPlayer =
        racers.find((r) => r.id === localPlayerId) || sortedByProgress[0];

      if (localPlayer && !isTeacher) {
        soundEngine.updateEngineHum(
          Math.abs(localPlayer.speed) / 335,
          localPlayer.nitroTimer > 0 || localPlayer.isBoostingNitro
        );
      }

      let activeFocusCar = localPlayer;
      if (cameraModeRef.current === 'leader') {
        activeFocusCar = sortedByProgress[0];
      } else if (cameraModeRef.current === 'spectate') {
        activeFocusCar =
          racers[spectateIdxRef.current % racers.length] || sortedByProgress[0];
      }

      const focusIsBoosting = Boolean(
        activeFocusCar &&
          (activeFocusCar.isBoostingNitro ||
            activeFocusCar.nitroTimer > 0 ||
            activeFocusCar.rocketStartTimer > 0)
      );

      if (cameraModeRef.current === 'overview') {
        cam.x += (0 - cam.x) * Math.min(1, 5 * dt);
        cam.y += (-1000 - cam.y) * Math.min(1, 5 * dt);
        cam.zoom += (0.22 - cam.zoom) * Math.min(1, 5 * dt);
      } else if (activeFocusCar) {
        const lookAheadDist = focusIsBoosting ? 148 : 120;
        const lookAheadX =
          activeFocusCar.x + Math.cos(activeFocusCar.angle) * lookAheadDist;
        const lookAheadY =
          activeFocusCar.y + Math.sin(activeFocusCar.angle) * lookAheadDist;
        cam.x += (lookAheadX - cam.x) * Math.min(1, 7.5 * dt);
        cam.y += (lookAheadY - cam.y) * Math.min(1, 7.5 * dt);
        // Dynamic Zoom-out when Nitro is active for thrilling sense of speed
        const targetZoom = focusIsBoosting ? 0.9 : 1.0;
        cam.zoom += (targetZoom - cam.zoom) * Math.min(1, 6 * dt);
      }

      // Micro camera vibration when boosting Nitro
      const shakeX =
        focusIsBoosting && cameraModeRef.current !== 'overview'
          ? Math.sin(nowSec * 62) * 2.2
          : 0;
      const shakeY =
        focusIsBoosting && cameraModeRef.current !== 'overview'
          ? Math.cos(nowSec * 54) * 2.2
          : 0;

      // =========================================================
      // RENDER WORLD TO MAIN CANVAS (HIGH-DPI + VIEWPORT CULLING)
      // =========================================================
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      ctx.fillStyle = map.bgColor;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      drawRaceTrack(ctx, map, itemBoxes, hazards, nowSec);
      trailPool.updateAndDraw(ctx, dt);

      const cullHalfW = (width / cam.zoom) * 0.65 + 160;
      const cullHalfH = (height / cam.zoom) * 0.65 + 160;

      const nightHeadlightsOn = isNightMapTheme(map.theme);

      // Draw Ghost Cars first
      for (const r of racers) {
        if (r.id === localPlayer?.id) continue;
        if (
          Math.abs(r.x - cam.x) > cullHalfW ||
          Math.abs(r.y - cam.y) > cullHalfH
        ) {
          continue;
        }
        ctx.save();
        ctx.globalAlpha = 0.84;
        drawModularCar(ctx, r.loadout, {
          x: r.x,
          y: r.y,
          angle: r.angle,
          nowSec,
          drifting: r.drifting,
          nitroActive: r.nitroTimer > 0 || r.isBoostingNitro,
          rocketStartActive: r.rocketStartTimer > 0,
          invulnerableBlink: r.invulnerableTimer > 0,
          username: r.username,
          teamId: lobby.raceMode === 'team' ? r.teamId : undefined,
          isPlayer: false,
          showHeadlightBeams: nightHeadlightsOn,
        });
        ctx.restore();
      }

      if (localPlayer) {
        drawModularCar(ctx, localPlayer.loadout, {
          x: localPlayer.x,
          y: localPlayer.y,
          angle: localPlayer.angle,
          nowSec,
          drifting: localPlayer.drifting,
          nitroActive: localPlayer.nitroTimer > 0 || localPlayer.isBoostingNitro,
          rocketStartActive: localPlayer.rocketStartTimer > 0,
          invulnerableBlink: localPlayer.invulnerableTimer > 0,
          username: localPlayer.username,
          teamId: lobby.raceMode === 'team' ? localPlayer.teamId : undefined,
          isPlayer: true,
          showHeadlightBeams: nightHeadlightsOn,
        });
      }

      ctx.restore();

      // =========================================================
      // SCREEN-SPACE OVERLAY 1: DYNAMIC MAP WEATHER PARTICLES
      // =========================================================
      ctx.save();
      for (let i = 0; i < weatherParticles.length; i++) {
        const wp = weatherParticles[i];
        wp.x += wp.speedX * dt;
        wp.y += wp.speedY * dt;
        if (map.theme === 'swamp' || map.theme === 'dna') {
          wp.x += Math.sin(nowSec * 2.2 + wp.phase) * 24 * dt;
        }
        if (wp.x < -20) wp.x = width + 20;
        if (wp.x > width + 20) wp.x = -20;
        if (wp.y < -20) wp.y = height + 20;
        if (wp.y > height + 20) wp.y = -20;

        if (map.theme === 'city') {
          // Neon Cyber Rain Streaks
          ctx.strokeStyle =
            i % 3 === 0 ? 'rgba(236, 72, 153, 0.35)' : 'rgba(56, 189, 248, 0.38)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(wp.x, wp.y);
          ctx.lineTo(wp.x - 5, wp.y + wp.size);
          ctx.stroke();
        } else if (map.theme === 'cryo') {
          // Falling Snowflakes
          ctx.fillStyle = 'rgba(224, 242, 254, 0.55)';
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (map.theme === 'swamp') {
          // Glowing Bio-Fireflies
          const pulse = 0.25 + 0.35 * Math.sin(nowSec * 4 + wp.phase);
          ctx.fillStyle =
            i % 2 === 0
              ? `rgba(74, 222, 128, ${pulse.toFixed(2)})`
              : `rgba(250, 204, 21, ${pulse.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, wp.size * 1.15, 0, Math.PI * 2);
          ctx.fill();
        } else if (map.theme === 'dna') {
          // Helix Energy Motes
          ctx.fillStyle =
            i % 2 === 0 ? 'rgba(56, 189, 248, 0.42)' : 'rgba(192, 132, 252, 0.42)';
          ctx.fillRect(wp.x - wp.size, wp.y - wp.size, wp.size * 2, wp.size * 2);
        } else {
          // Aorta Plasma Embers
          ctx.fillStyle =
            i % 2 === 0 ? 'rgba(251, 113, 133, 0.4)' : 'rgba(254, 240, 138, 0.38)';
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // =========================================================
      // SCREEN-SPACE OVERLAY 2: RADIAL SPEED LINES ON NITRO BOOST
      // =========================================================
      if (focusIsBoosting && cameraModeRef.current !== 'overview') {
        ctx.save();
        const centerX = width * 0.5;
        const centerY = height * 0.5;
        const outerRad = Math.hypot(centerX, centerY);
        const innerRad = Math.min(width, height) * 0.34;

        for (let i = 0; i < 28; i++) {
          const rayAngle = (i / 28) * Math.PI * 2 + ((nowSec * 3.5) % 0.22);
          const animShift = ((nowSec * 480 + i * 47) % 140) / 140;
          const rStart = innerRad + animShift * (outerRad - innerRad) * 0.55;
          const rEnd = Math.min(outerRad, rStart + 65 + (i % 3) * 28);

          ctx.strokeStyle =
            i % 3 === 0
              ? 'rgba(56, 189, 248, 0.48)'
              : i % 2 === 0
              ? 'rgba(254, 240, 138, 0.42)'
              : 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = i % 2 === 0 ? 2.2 : 1.4;
          ctx.beginPath();
          ctx.moveTo(
            centerX + Math.cos(rayAngle) * rStart,
            centerY + Math.sin(rayAngle) * rStart
          );
          ctx.lineTo(
            centerX + Math.cos(rayAngle) * rEnd,
            centerY + Math.sin(rayAngle) * rEnd
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore();

      // Render Corner Minimap
      const miniCanvas = minimapRef.current;
      if (miniCanvas) {
        const mCtx = miniCanvas.getContext('2d');
        if (mCtx) {
          mCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
          mCtx.save();
          mCtx.translate(miniCanvas.width / 2, miniCanvas.height * 0.68);
          mCtx.scale(0.025, 0.025);

          mCtx.strokeStyle = '#7A9A75';
          mCtx.lineWidth = 180;
          mCtx.beginPath();
          mCtx.moveTo(map.waypoints[0].x, map.waypoints[0].y);
          for (let i = 1; i < map.waypoints.length; i++) {
            mCtx.lineTo(map.waypoints[i].x, map.waypoints[i].y);
          }
          mCtx.closePath();
          mCtx.stroke();

          for (const r of racers) {
            mCtx.fillStyle =
              r.id === localPlayer?.id ? '#F59E0B' : '#F8FAFC';
            mCtx.beginPath();
            mCtx.arc(
              r.x,
              r.y,
              r.id === localPlayer?.id ? 160 : 95,
              0,
              Math.PI * 2
            );
            mCtx.fill();
          }
          mCtx.restore();
        }
      }

      // Sync throttled HUD state (~8 times per second for responsive speedometer needle & warnings)
      hudSyncAccum += dt;
      if (hudSyncAccum >= 0.11) {
        hudSyncAccum = 0;

        let cdText: string | null = null;
        if (elapsedRaceSec < 0) {
          cdText = String(Math.ceil(-elapsedRaceSec));
        } else if (elapsedRaceSec < 0.85) {
          cdText = 'GO!';
        }

        let watermarkAlpha = 0;
        if (elapsedRaceSec < 12) {
          watermarkAlpha = 0.35;
        } else if (elapsedRaceSec < 15) {
          watermarkAlpha = 0.35 * (1 - (elapsedRaceSec - 12) / 3);
        }

        const focus = localPlayer || sortedByProgress[0];

        // 1. Detect Incoming Homing Rocket Threat targeting or approaching focus car
        let rocketThreat: {
          distanceMeters: number;
          direction: 'left' | 'center' | 'right';
        } | null = null;

        if (focus && !focus.finished) {
          let closestRocketDist = 780;
          for (const hz of hazards) {
            if (hz.type !== 'rocket' || hz.ownerId === focus.id) continue;
            const d = Math.hypot(focus.x - hz.x, focus.y - hz.y);
            if (d < closestRocketDist) {
              closestRocketDist = d;
              const angleToRocket = Math.atan2(hz.y - focus.y, hz.x - focus.x);
              let relAngle = angleToRocket - (focus.angle + Math.PI);
              while (relAngle > Math.PI) relAngle -= Math.PI * 2;
              while (relAngle < -Math.PI) relAngle += Math.PI * 2;
              const dir: 'left' | 'center' | 'right' =
                relAngle < -0.28
                  ? 'left'
                  : relAngle > 0.28
                  ? 'right'
                  : 'center';
              rocketThreat = {
                distanceMeters: Math.max(1, Math.round(d / 8)),
                direction: dir,
              };
            }
          }
        }

        // 2. Detect Nearby Rear Rival Cars Approaching from Behind (< 240px)
        const rearThreats: {
          id: string;
          username: string;
          distanceMeters: number;
          laneOffset: number;
        }[] = [];

        if (focus && !focus.finished) {
          const forwardX = Math.cos(focus.angle);
          const forwardY = Math.sin(focus.angle);
          const rightX = -forwardY;
          const rightY = forwardX;

          for (const other of racers) {
            if (other.id === focus.id || other.finished) continue;
            const dx = other.x - focus.x;
            const dy = other.y - focus.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 250 || dist < 1) continue;

            // Project onto focus car's local axes: negative forwardDot means behind focus car
            const forwardDot = dx * forwardX + dy * forwardY;
            if (forwardDot < 15) {
              const lateralDot = dx * rightX + dy * rightY;
              const laneOffset = Math.max(-1, Math.min(1, lateralDot / 110));
              rearThreats.push({
                id: other.id,
                username: other.username,
                distanceMeters: Math.max(1, Math.round(dist / 8)),
                laneOffset,
              });
            }
          }
          rearThreats.sort((a, b) => a.distanceMeters - b.distanceMeters);
          if (rearThreats.length > 3) rearThreats.length = 3;
        }

        setHudState({
          countdownText: cdText,
          rocketStartBanner:
            (focus?.rocketStartTimer || 0) > 0 && elapsedRaceSec < 1.2,
          finalLapBanner: finalLapBannerTimer > 0,
          speedKmh: Math.round(Math.abs(focus?.speed || 0) * 0.65),
          rawSpeed: focus?.speed || 0,
          nitroCharge: focus?.nitroCharge ?? 100,
          isBoostingNitro: Boolean(
            focus?.isBoostingNitro || (focus?.nitroTimer || 0) > 0
          ),
          drifting: Boolean(focus?.drifting),
          lap: Math.min(lobby.laps, focus?.lap || 1),
          totalLaps: lobby.laps,
          placement: focus?.placement || 1,
          totalRacers: racers.length,
          heldItem: focus?.heldItem || null,
          stuckWarning: (focus?.stuckTimer || 0) >= 3.0,
          wrongWay: Boolean(focus?.wrongWay),
          finishCountdownSec:
            firstFinisherElapsedSec !== null
              ? Math.max(0, Math.ceil(20 - timeSinceFirstFinish))
              : null,
          inReplayMode: isReplayPhase,
          ghostWatermarkOpacity: watermarkAlpha,
          top5List: sortedByProgress.slice(0, 5).map((r) => ({
            id: r.id,
            username: r.username,
            placement: r.placement,
            lap: Math.min(lobby.laps, r.lap),
          })),
          incomingRocket: rocketThreat,
          rearThreats,
          killfeed: killfeedQueue.map((k) => ({
            id: k.id,
            text: k.text,
            category: k.category,
          })),
        });
      }
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      soundEngine.stopEngineHum();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [lobby, localPlayerId, isTeacher, onRaceComplete, onTogglePause]);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#1E261D] select-none">
      {/* Isolated 60 FPS Full-Viewport Canvas */}
      <canvas
        ref={canvasRef}
        data-testid="race-canvas"
        className="w-full h-full block"
      />

      {/* World-Matched Low-Occlusion HUD Wrapper */}
      {!hudState.inReplayMode && (
        <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-4">
          {/* Top Row: Left Telemetry Cluster + Center Finish Timer + Right Teacher/Utility Controls */}
          <div className="flex items-start justify-between gap-4">
            {/* Top-Left Cluster: Placement, Lap, Held Item Slot */}
            <div className="flex items-center gap-3 bg-[#0F172A]/90 border-2 border-[#7A9A75] rounded-2xl px-4 py-2.5 shadow-xl">
              <div className="pr-3 border-r border-[#7A9A75]/40">
                <div className="text-[10px] font-bold text-[#A7C4A0] uppercase">
                  VỊ TRÍ
                </div>
                <div className="font-mono-num text-2xl font-black text-[#F59E0B] leading-none">
                  {hudState.placement}
                  <span className="text-xs text-[#CBD5E1] font-semibold">
                    /{hudState.totalRacers}
                  </span>
                </div>
              </div>

              <div className="pr-3 border-r border-[#7A9A75]/40">
                <div className="text-[10px] font-bold text-[#A7C4A0] uppercase">
                  VÒNG ĐUA
                </div>
                <div className="font-mono-num text-2xl font-black text-white leading-none">
                  {hudState.lap}
                  <span className="text-xs text-[#CBD5E1] font-semibold">
                    /{hudState.totalLaps}
                  </span>
                </div>
              </div>

              {/* Item Slot */}
              <div className="flex items-center gap-2 pl-1">
                <div className="w-11 h-11 rounded-xl bg-[#1E293B] border-2 border-[#F59E0B] flex items-center justify-center text-2xl">
                  {hudState.heldItem ? ITEM_INFO[hudState.heldItem].icon : '🎲'}
                </div>
                <div className="hidden sm:block">
                  <div className="text-[10px] font-bold text-[#FDE047] uppercase">
                    VẬT PHẨM [SPACE]
                  </div>
                  <div className="text-xs font-bold text-white">
                    {hudState.heldItem
                      ? ITEM_INFO[hudState.heldItem].name
                      : 'Chưa có (Ăn hộp quà)'}
                  </div>
                </div>
              </div>
            </div>

            {/* Center Alert Banner: 20s Finish Countdown or Wrong Way */}
            <div className="flex flex-col items-center gap-2">
              {hudState.finishCountdownSec !== null && (
                <div className="px-5 py-2 rounded-xl bg-[#4A6046] border-2 border-[#F59E0B] text-center shadow-2xl">
                  <div className="text-xs font-bold text-[#FEF08A]">
                    🏁 TOP 1 ĐÃ VỀ ĐÍCH! ĐẾM NGƯỢC KẾT THÚC TRẬN:
                  </div>
                  <div className="font-mono-num text-2xl font-black text-white">
                    {hudState.finishCountdownSec} GIÂY
                  </div>
                </div>
              )}

              {hudState.wrongWay && (
                <div className="px-5 py-2 rounded-xl bg-red-900 border-2 border-yellow-400 text-yellow-200 font-black text-sm animate-bounce">
                  ⚠️ ĐANG CHẠY NGƯỢC CHIỀU! BẤM [R] ĐỂ QUAY LẠI ĐÚNG LÀN!
                </div>
              )}

              {hudState.stuckWarning && (
                <div className="px-5 py-2.5 rounded-xl bg-[#F59E0B] text-[#1E261D] font-black text-sm shadow-2xl">
                  🚨 XE ĐANG KẸT HOẶC LỆCH ĐƯỜNG! BẤM PHÍM [R] ĐỂ GIẢI CỨU TỨC THÌ!
                </div>
              )}
            </div>

            {/* Top-Right Cluster: Teacher Powers + Pause / Finish Controls */}
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
              <div className="flex items-center gap-2">
                {isTeacher && (
                  <>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        supplyDropTriggerRef.current = true;
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#FBBF24] text-[#1E261D] font-extrabold text-xs shadow-lg cursor-pointer"
                    >
                      🎁 Thả Tiếp Tế
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        setCameraMode((m) =>
                          m === 'leader'
                            ? 'overview'
                            : m === 'overview'
                            ? 'spectate'
                            : 'leader'
                        );
                      }}
                      className="px-3 py-2 rounded-xl bg-[#4A6046] hover:bg-[#5B7556] text-white border border-[#7A9A75] font-bold text-xs cursor-pointer"
                    >
                      🎥 Camera:{' '}
                      {cameraMode === 'overview'
                        ? 'Toàn Cảnh'
                        : cameraMode === 'leader'
                        ? 'Bám Top 1'
                        : 'Từng Học Sinh'}
                    </button>
                    {cameraMode === 'spectate' && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          setSpectateIdx((i) => i + 1);
                        }}
                        className="px-2.5 py-2 rounded-xl bg-[#1E261D] hover:bg-[#2B3729] text-[#FDE047] border border-[#7A9A75] text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1 leading-none"
                      >
                        <span>HS Tiếp</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] block shrink-0" />
                      </button>
                    )}
                  </>
                )}

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onTogglePause();
                  }}
                  aria-label="Tạm dừng [P]"
                  className="px-3 py-2 rounded-xl bg-[#1E261D] hover:bg-[#2E3B2C] text-white border border-[#7A9A75] text-xs font-bold cursor-pointer"
                >
                  ⏸️ Tạm Dừng [P]
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onExitRace();
                  }}
                  aria-label="Thoát chặng đua (Không cộng Xu)"
                  title="Thoát giữa chừng sẽ không được cộng Xu và không tính xếp hạng"
                  className="px-3 py-2 rounded-xl bg-red-950/90 hover:bg-red-900 text-red-200 border border-red-500/70 text-xs font-bold cursor-pointer"
                >
                  🚪 Thoát (0 Xu)
                </button>
              </div>

              {/* Compact Live Top 5 Standings + Minimap */}
              <div className="flex items-start gap-2 mt-1 pointer-events-none">
                <div className="bg-[#0F172A]/85 border border-[#7A9A75] rounded-xl p-2.5 w-48 text-xs">
                  <div className="font-bold text-[#F59E0B] mb-1 text-[11px]">
                    🏆 DẪN ĐẦU CHẶNG ĐUA
                  </div>
                  {hudState.top5List.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-0.5 font-mono-num"
                    >
                      <span className="truncate max-w-[125px] text-white">
                        #{item.placement} {item.username}
                      </span>
                      <span className="text-[#A7C4A0] text-[10px]">
                        V{item.lap}
                      </span>
                    </div>
                  ))}
                </div>

                <canvas
                  ref={minimapRef}
                  width={130}
                  height={130}
                  className="rounded-xl bg-[#0F172A]/85 border border-[#7A9A75]"
                />
              </div>

              {/* Live Event Killfeed Ticker (Max 4 recent events) */}
              {hudState.killfeed.length > 0 && (
                <div
                  data-testid="race-killfeed"
                  className="flex flex-col items-end gap-1.5 mt-1 w-72 pointer-events-none"
                >
                  {hudState.killfeed.map((ev) => {
                    const borderTone =
                      ev.category === 'rocket'
                        ? 'border-l-4 border-l-[#EF4444] border-[#EF4444]/40 text-red-100'
                        : ev.category === 'lead'
                        ? 'border-l-4 border-l-[#F59E0B] border-[#F59E0B]/40 text-amber-100'
                        : ev.category === 'lap'
                        ? 'border-l-4 border-l-[#38BDF8] border-[#38BDF8]/40 text-sky-100'
                        : 'border-l-4 border-l-[#4ADE80] border-[#4ADE80]/40 text-emerald-100';
                    return (
                      <div
                        key={ev.id}
                        className={`w-full px-3 py-1.5 rounded-lg bg-[#0F172A]/90 border text-[11px] font-bold shadow-lg backdrop-blur-sm ${borderTone}`}
                      >
                        {ev.text}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Center Countdown, Final Lap & Rocket Start Banners */}
          {hudState.countdownText && (
            <div className="self-center my-auto text-center">
              <div className="font-display text-8xl font-black text-[#F59E0B] drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)]">
                {hudState.countdownText}
              </div>
              <div className="mt-2 text-sm font-bold text-[#FEF08A] bg-[#0F172A]/90 px-4 py-1.5 rounded-lg border border-[#7A9A75]">
                ⚡ Giữ [W] đúng nhịp GO! để ROCKET START · Giữ [SHIFT] để ĐỐT NITRO!
              </div>
            </div>
          )}

          {hudState.rocketStartBanner && (
            <div className="self-center px-6 py-2 rounded-xl bg-sky-950/90 border-2 border-sky-400 text-sky-200 font-black text-lg shadow-[0_0_24px_rgba(56,189,248,0.65)]">
              🔥 ROCKET START KÍCH HOẠT! BỨT TỐC LỬA XANH!
            </div>
          )}

          {hudState.finalLapBanner && !hudState.countdownText && (
            <div
              data-testid="final-lap-banner"
              className="self-center my-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-[#0F172A]/95 via-[#7C2D12]/95 to-[#0F172A]/95 border-2 border-[#F59E0B] text-center shadow-[0_0_36px_rgba(245,158,11,0.75)] animate-pulse"
            >
              <div className="text-[11px] font-black tracking-[0.24em] text-[#38BDF8] uppercase">
                NƯỚC RÚT QUYẾT ĐỊNH
              </div>
              <div className="font-display text-3xl sm:text-4xl font-black text-[#FEF08A] tracking-wider uppercase">
                🔥 VÒNG ĐUA CUỐI — FINAL LAP! 🔥
              </div>
            </div>
          )}

          {/* Bottom Row: Left Ghost Watermark + Center Rear Threat Radar + Right Real-Life Automotive Speedometer & Nitro Cluster */}
          <div className="flex items-end justify-between gap-4">
            {hudState.ghostWatermarkOpacity > 0.01 ? (
              <div
                style={{ opacity: hudState.ghostWatermarkOpacity }}
                className="p-3.5 rounded-2xl bg-[#0F172A] border border-[#7A9A75] text-white transition-opacity duration-300"
              >
                <div className="text-xs font-extrabold text-[#F59E0B] mb-1">
                  SƠ ĐỒ PHÍM LÁI XE (Tự ẩn sau 15 giây)
                </div>
                <div className="text-xs font-mono-num space-y-0.5">
                  <div>[W / ⬆]: Tăng tốc · [S / ⬇]: Phanh / Lùi</div>
                  <div>[A D / ⬅ ➡]: Bẻ lái & Drift sạc Nitro</div>
                  <div>[SHIFT]: Đốt Bình Nitro · [SPACE]: Dùng Vật Phẩm · [R]: Giải cứu</div>
                </div>
              </div>
            ) : (
              <div />
            )}

            {/* Center-Bottom Tactical Rear-View Threat Radar: Homing Rocket Lock-On & Rival Proximity Arrows */}
            <div className="flex flex-col items-center gap-2 mb-1 pointer-events-none">
              {hudState.incomingRocket && (
                <div
                  data-testid="rocket-warning-banner"
                  className="px-4 py-2 rounded-xl bg-red-950/95 border-2 border-[#EF4444] text-red-100 shadow-[0_0_28px_rgba(239,68,68,0.85)] animate-bounce flex items-center gap-2.5"
                >
                  <span className="text-xl leading-none">🚀</span>
                  <div className="text-left">
                    <div className="text-[10px] font-black uppercase tracking-wider text-red-300">
                      ⚠️ CẢNH BÁO KHÓA MỤC TIÊU TỪ PHÍA SAU
                    </div>
                    <div className="font-mono-num text-sm font-black text-white inline-flex items-center gap-1.5">
                      <span>TÊN LỬA ĐANG TỚI:</span>
                      <span className="text-[#FEF08A]">
                        {hudState.incomingRocket.distanceMeters}m
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-900/90 border border-red-400/50 text-xs leading-none">
                        {hudState.incomingRocket.direction === 'left' ? (
                          <>
                            <ArrowLeft className="w-3.5 h-3.5 stroke-[2.75] block shrink-0" />
                            <span>Lệch Trái</span>
                          </>
                        ) : hudState.incomingRocket.direction === 'right' ? (
                          <>
                            <span>Lệch Phải</span>
                            <ArrowRight className="w-3.5 h-3.5 stroke-[2.75] block shrink-0" />
                          </>
                        ) : (
                          <>
                            <ArrowDown className="w-3.5 h-3.5 stroke-[2.75] block shrink-0" />
                            <span>Chính Giữa</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {hudState.rearThreats.length > 0 && (
                <div
                  data-testid="rear-proximity-arrows"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F172A]/90 border border-[#F59E0B]/60 shadow-xl"
                >
                  <span className="text-[10px] font-extrabold text-[#F59E0B] uppercase tracking-wider mr-1">
                    ĐỐI THỦ ÁP SÁT:
                  </span>
                  {hudState.rearThreats.map((th) => {
                    const ArrowIcon =
                      th.laneOffset < -0.25
                        ? ArrowDownLeft
                        : th.laneOffset > 0.25
                        ? ArrowDownRight
                        : ArrowDown;
                    return (
                      <div
                        key={th.id}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1E293B] border border-[#F59E0B]/50 text-xs font-mono-num leading-none"
                      >
                        <span className="w-4 h-4 rounded bg-[#0F172A] border border-[#F59E0B]/60 text-[#F59E0B] inline-flex items-center justify-center shrink-0">
                          <ArrowIcon className="w-3 h-3 stroke-[2.75] block shrink-0" />
                        </span>
                        <span className="text-white font-bold truncate max-w-[78px]">
                          {th.username}
                        </span>
                        <span className="text-[#FEF08A] font-black text-[11px]">
                          {th.distanceMeters}m
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Real-Car Automotive Speedometer, Tachometer, Gear & Shift-Nitro HUD (Requirements #4 & #5) */}
            <RealCarSpeedometerCluster
              speedKmh={hudState.speedKmh}
              rawSpeed={hudState.rawSpeed}
              nitroCharge={hudState.nitroCharge}
              isBoostingNitro={hudState.isBoostingNitro}
              drifting={hudState.drifting}
              onTriggerNitroPress={(active) => {
                manualNitroHoldRef.current = active;
                if (active && hudState.nitroCharge > 20 && !hudState.isBoostingNitro) {
                  soundEngine.playBoost();
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Pause Modal (`document.body.dataset.state = 'paused'`) */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-md rounded-2xl bg-[#1E261D] border-2 border-[#7A9A75] p-6 text-center space-y-4 shadow-2xl">
            <h2 className="text-2xl font-extrabold text-white">
              ⏸️ ĐANG TẠM DỪNG CHẶNG ĐUA
            </h2>
            <p className="text-xs text-[#CBD5E1]">
              Chỉ khi hoàn thành toàn bộ vòng đua mới được cộng Xu và công bố bảng xếp hạng.
            </p>
            <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500/50 text-[11px] font-bold text-red-200">
              ⚠️ Nếu ấn Thoát khi đang đua dở sẽ KHÔNG được cộng Xu và KHÔNG tính điểm Rank.
            </div>
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={onTogglePause}
                className="w-full py-3 rounded-xl bg-[#F59E0B] hover:bg-[#FBBF24] text-[#1E261D] font-extrabold text-sm cursor-pointer"
              >
                ▶️ Tiếp Tục Đua (Resume)
              </button>
              <button
                type="button"
                onClick={onExitRace}
                className="w-full py-3 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-100 border border-red-500/60 font-bold text-sm cursor-pointer"
              >
                🚪 Bỏ Cuộc & Thoát Về Phòng Chờ (0 Xu)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

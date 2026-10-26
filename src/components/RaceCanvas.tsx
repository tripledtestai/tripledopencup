import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Camera,
  Gamepad2,
  LifeBuoy,
  LogOut,
  Package,
  Pause,
  Play,
  Settings,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
  Flag,
  Crown,
  Key,
} from 'lucide-react';
import { drawModularCar, TrailParticlePool } from '../game/carRenderer';
import { getKeyBindings } from '../game/keyboard';
import { SettingsModal } from './SettingsModal';
import { MAPS } from '../game/constants';
import {
  extractGameKeysFromKeyDown,
  extractGameKeysFromKeyUp,
  isTypingInInput,
} from '../game/keyboard';
import {
  applyCarRescue,
  buildComputedStats,
  calculateBossRammingDamage,
  calculateTuningPhysics,
  type ComputedTuningPhysics,
  computeMinimapTransform,
  computeRacerTrackProgress,
  distanceToSegment,
  getCampaignLevelByNumber,
  getPlayerTitleById,
  getRaidBossById,
  isCarUnderOverpassBridge,
  isNightMapTheme,
  isPointOnTrack,
  isSynapseGateClosed,
  rollRaceItem,
  updateRacerCheckpointState,
} from '../game/rules';
import {
  drawOverpassOverlay,
  drawRaceTrack,
  getAntibodySpherePosition,
  getPistonState,
  isBiologicalHighTide,
} from '../game/trackRenderer';
import {
  BotDifficulty,
  CampaignLevelConfig,
  DeployedHazard,
  GhostRecordFrame,
  LobbyConfig,
  Point2D,
  RaceItemType,
  RacerState,
  RaidBossConfig,
  ReplayFrame,
  TrackItemBox,
} from '../game/types';
import { dualDB } from '../services/database';
import { soundEngine } from '../services/sound';
import { multiplayerService } from '../services/multiplayer';

interface RaceCanvasProps {
  lobby: LobbyConfig;
  localPlayerId: string | null;
  isTeacher: boolean;
  isPaused: boolean;
  playerPhysicsRef?: React.MutableRefObject<ComputedTuningPhysics>;
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
    speedMul: 0.65,
    turnMul: 0.65,
    shortcutChance: 0.0,
    itemRate: 0.15,
    nitroUseThreshold: 99,
    rocketStartChance: 0.0,
  },
  medium: {
    speedMul: 0.80,
    turnMul: 0.82,
    shortcutChance: 0.20,
    itemRate: 0.60,
    nitroUseThreshold: 80,
    rocketStartChance: 0.15,
  },
  hard: {
    speedMul: 0.92,
    turnMul: 0.95,
    shortcutChance: 0.50,
    itemRate: 1.1,
    nitroUseThreshold: 60,
    rocketStartChance: 0.45,
  },
  nightmare: {
    speedMul: 1.02,
    turnMul: 1.05,
    shortcutChance: 0.80,
    itemRate: 1.6,
    nitroUseThreshold: 40,
    rocketStartChance: 0.70,
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
          className={`w-52 p-3 rounded-xl border-2 transition-all cursor-pointer text-left shadow-2xl ${
            isBoostingNitro
              ? 'bg-gradient-to-r from-[#082F49] via-[#0369A1] to-[#1E293B] border-[#38BDF8] shadow-[0_0_20px_rgba(56,189,248,0.6)] scale-[1.01]'
              : 'bg-[#0F172A]/95 border-slate-700 hover:border-[#38BDF8]'
          } ${nitroCharge >= 99 ? 'animate-pulse ring-1 ring-amber-400' : ''}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-[#38BDF8] text-[#0F172A] font-mono-num text-[10px] font-black">
                <Zap className="w-3 h-3 text-[#38BDF8]" />
              </span>
              <span className="text-xs font-black text-white uppercase tracking-wider">
                BÌNH NITRO
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

          <div className="mt-3 flex items-center justify-center">
            <span className={`text-[13px] font-black uppercase tracking-widest ${nitroCharge >= 100 ? 'text-[#FACC15]' : 'text-white/60'}`}>
              {nitroCharge >= 100 ? 'ĐÃ NẠP XONG' : 'ĐANG NẠP'}
            </span>
          </div>
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
              <stop offset="40%" stopColor="#22C55E" />
              <stop offset="65%" stopColor="#FACC15" />
              <stop offset="85%" stopColor="#F97316" />
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

          {/* Numeric Labels (0, 160, 320) - Requirement #9.3: Only 0/160/320 */}
          {[0, 160, 320].map((speedVal) => {
            const ratio = speedVal / maxDialSpeed;
            const deg = startDeg + ratio * sweepDeg;
            const labelPt = polarToCartesian(deg, rTicks - 22);
            const isRedline = speedVal >= 240;

            return (
              <text
                key={speedVal}
                x={labelPt.x}
                y={labelPt.y + 4}
                textAnchor="middle"
                fill={isRedline ? '#EF4444' : '#FFFFFF'}
                fontSize="14"
                fontWeight="900"
                className="font-display"
              >
                {speedVal}
              </text>
            );
          })}

          {/* Major Ticks */}
          {Array.from({ length: 9 }, (_, idx) => {
            const ratio = idx / 8;
            const deg = startDeg + ratio * sweepDeg;
            const outerPt = polarToCartesian(deg, rTicks);
            const innerPt = polarToCartesian(deg, rTicks - 12);
            const isRedline = idx >= 6;

            return (
              <line
                key={idx}
                x1={outerPt.x}
                y1={outerPt.y}
                x2={innerPt.x}
                y2={innerPt.y}
                stroke={isRedline ? '#EF4444' : '#F8FAFC'}
                strokeWidth="3"
              />
            );
          })}

          {/* Rotating Analog Speedometer Needle */}
          <g transform={`rotate(${needleDeg} ${cx} ${cy})`}>
            {/* Needle shadow/glow */}
            <polygon
              points={`${cx - 20},${cy - 5} ${cx + 76},${cy} ${cx - 20},${cy + 5}`}
              fill={isBoostingNitro ? '#FACC15' : '#EF4444'}
              opacity="0.8"
            />
            <polygon
              points={`${cx - 14},${cy - 3} ${cx + 72},${cy} ${cx - 14},${cy + 3}`}
              fill={isBoostingNitro ? '#FFFFFF' : '#F87171'}
            />
            <circle cx={cx} cy={cy} r="7" fill="#F8FAFC" />
          </g>

          {/* Center Pivot Cap */}
          <circle
            cx={cx}
            cy={cy}
            r="12"
            fill="#0F172A"
            stroke="#FACC15"
            strokeWidth="3"
          />
          <circle cx={cx} cy={cy} r="5" fill="#FACC15" />
        </svg>

        {/* Bottom Digital Speed Readout Overlay - Requirement #9.3: Only Big Speed in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-4">
          <div className="font-mono-num text-6xl font-black text-white tracking-tighter leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)]">
            {Math.round(speedKmh)}
          </div>
          <div className="text-[16px] font-black text-[#FACC15] tracking-[0.3em] mt-1 uppercase">
            KM/H
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
  playerPhysicsRef,
  onTogglePause,
  onRaceComplete,
  onExitRace,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const manualNitroHoldRef = useRef<boolean>(false);
  const [isMuted, setIsMuted] = useState(() => soundEngine.getMuted());
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const elapsedRaceSecRef = useRef<number>(-3.2);

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
    bossHud: {
      active: boolean;
      name: string;
      title: string;
      icon: string;
      hp: number;
      maxHp: number;
      knockdowns: number;
      stunTimer: number;
      shieldActive: boolean;
      phase: 1 | 2;
      skillCooldownSec: number;
      skillReady: boolean;
      skillName: string;
      isEasyBossController: boolean;
    } | null;
    campaignHud: {
      levelNumber: number;
      title: string;
      mode: string;
      modeBanner: string;
      statusText: string;
      timerSec: number | null;
    } | null;
    fps: number;
    pingMs: number;
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
    bossHud: null,
    campaignHud: null,
    fps: 60,
    pingMs: 0,
  });

  // Teacher camera controls
  const [cameraMode, setCameraMode] = useState<
    'player' | 'overview' | 'leader' | 'spectate'
  >(localPlayerId ? 'player' : 'leader');
  const [spectateIdx, setSpectateIdx] = useState(0);

  const cameraModeRef = useRef(cameraMode);
  const spectateIdxRef = useRef(spectateIdx);
  const isPausedRef = useRef(isPaused);
  const onTogglePauseRef = useRef(onTogglePause);
  const onRaceCompleteRef = useRef(onRaceComplete);
  const supplyDropTriggerRef = useRef(false);
  const forceFinishTriggerRef = useRef(false);
  const manualBossSkillTriggerRef = useRef(false);
  const remoteBossDamageQueueRef = useRef<{ damage: number; attackerId: string; attackerName: string }[]>([]);
  const remoteBossSkillQueueRef = useRef<string[]>([]);

  const isHost =
    isTeacher ||
    (lobby.hostId ? localPlayerId === lobby.hostId : !lobby.isFriendGuest);

  const canEndRaceEarly =
    lobby.playModeCategory === 'teacher_cup' ? isTeacher : isHost;

  // Check if current match is Practice AI, Solo Campaign, or an Offline/Single-Human Lobby
  const isSoloOrOffline =
    lobby.playModeCategory === 'practice_ai' ||
    Boolean(lobby.campaignLevel) ||
    lobby.participants.filter((p) => !p.isBot && !p.id.startsWith('bot_')).length <= 1 ||
    !multiplayerService.isConnected();

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
    onTogglePauseRef.current = onTogglePause;
  }, [onTogglePause]);
  useEffect(() => {
    onRaceCompleteRef.current = onRaceComplete;
  }, [onRaceComplete]);

  useEffect(() => {
    const unsubscribeNet = multiplayerService.subscribe((msg) => {
      if (msg.type === 'FORCE_FINISH') {
        forceFinishTriggerRef.current = true;
      } else if (msg.type === 'BOSS_DAMAGE_EVENT') {
        if (msg.attackerId !== localPlayerId) {
          remoteBossDamageQueueRef.current.push({
            damage: msg.damage,
            attackerId: msg.attackerId,
            attackerName: msg.attackerName,
          });
        }
      } else if (msg.type === 'BOSS_SKILL_CAST') {
        remoteBossSkillQueueRef.current.push(msg.bossId);
      }
    });
    return () => {
      unsubscribeNet();
    };
  }, [localPlayerId]);

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
    let dpr = window.devicePixelRatio || 1;
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      if (minimapRef.current) {
        minimapRef.current.width = Math.floor(144 * dpr);
        minimapRef.current.height = Math.floor(116 * dpr);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Principle 1: Client-Authoritative Local Car Physics!
    // Always read the local player's equipped activeTuningLoadout / activePreset directly from local client,
    // NEVER allowing lobby.participants from START_RACE to reset local car physics to default baseStats!
    const localAuth = dualDB.getAuthoritativeLocalTuning(
      localPlayerId,
      isTeacher
    );
    if (playerPhysicsRef) {
      playerPhysicsRef.current = localAuth.physics;
    }

    // Ensure localPlayerId is always present in race participants when not in Teacher spectator mode
    let rawParticipants = [...(lobby.participants || [])];
    if (
      localPlayerId &&
      !rawParticipants.some(
        (pt) => pt.id.toLowerCase() === localPlayerId.toLowerCase()
      )
    ) {
      // Check if we are a guest whose entry has a _guest_ prefix and we weren't assigned yet
      const guestEntry = lobby.isFriendGuest
        ? rawParticipants.find((pt) =>
            pt.id.toLowerCase().startsWith(`${localPlayerId.toLowerCase()}_guest_`)
          )
        : undefined;
      if (!guestEntry) {
        const stuAcc = isTeacher
          ? dualDB.getTeacherProfile()
          : dualDB.getStudent(localPlayerId);
        rawParticipants.push({
          id: localPlayerId,
          username: stuAcc?.username || 'Tay Đua',
          rp: stuAcc?.rp || 0,
          teamId: 1,
          loadout: stuAcc?.loadout || {
            chassis: 'chassis_spark',
            paint: 'paint_cyan',
            decal: 'decal_none',
            wheels: 'wheels_stock',
            spoiler: 'spoiler_none',
            underglow: 'underglow_none',
            trail: 'trail_none',
          },
          tuningLoadout: localAuth.tuningLoadout,
          computedStats: localAuth.computedStats,
          isBot: false,
          isTeacher,
        });
      }
    }

    const isLocalParticipant = (participantId: string): boolean => {
      if (!localPlayerId) return false;
      const lowerP = participantId.toLowerCase();
      const lowerLocal = localPlayerId.toLowerCase();
      if (lowerP === lowerLocal) return true;
      if (
        lobby.isFriendGuest &&
        !rawParticipants.some((pt) => pt.id.toLowerCase() === lowerLocal) &&
        lowerP.startsWith(`${lowerLocal}_guest_`)
      ) {
        return true;
      }
      return false;
    };

    const getRacerPhysics = (r: RacerState): ComputedTuningPhysics => {
      if (!r.isBot && isLocalParticipant(r.id)) {
        return (
          playerPhysicsRef?.current ||
          localAuth.physics ||
          calculateTuningPhysics(
            localAuth.tuningLoadout || localAuth.computedStats,
            335,
            395,
            3.2,
            2.0
          )
        );
      }
      return calculateTuningPhysics(
        r.computedStats || r.tuningLoadout,
        335,
        395,
        3.2,
        2.0
      );
    };

    // Initialize all racers on starting grid behind waypoint 0
    const startPt = map.waypoints[0];
    const nextPt = map.waypoints[1];
    const startAngle = Math.atan2(
      nextPt.y - startPt.y,
      nextPt.x - startPt.x
    );
    const perpAngle = startAngle + Math.PI / 2;

    const deterministicBotRand = (seedKey: string): number => {
      let h = 2166136261;
      for (let i = 0; i < seedKey.length; i++) {
        h ^= seedKey.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return ((h >>> 0) % 10000) / 10000;
    };

    const campaignLevel: CampaignLevelConfig | undefined =
      lobby.playModeCategory === 'solo_campaign' && lobby.campaignLevelNumber
        ? getCampaignLevelByNumber(lobby.campaignLevelNumber)
        : undefined;

    const isRaidBossMode = Boolean(
      lobby.playModeCategory === 'raid_boss' ||
        (lobby.playModeCategory === 'teacher_cup' &&
          (lobby.raidBossModeEnabled || Boolean(lobby.raidBossId)))
    );
    const raidBossDef: RaidBossConfig | undefined = isRaidBossMode
      ? getRaidBossById(lobby.raidBossId || 'tuan_anh')
      : undefined;

    if (isRaidBossMode) {
      // Disallow bot racers in Raid Boss mode; strictly human racers vs the Boss
      rawParticipants = rawParticipants.filter((p) => !p.isBot || p.isBoss);
    }

    const humanParticipantsCount = Math.max(
      1,
      rawParticipants.filter((p) => !p.isBot && !p.isBoss).length
    );
    const bossMaxHp = humanParticipantsCount * 1500;

    // Ensure Boss participant exists in Raid Boss mode
    if (
      isRaidBossMode &&
      raidBossDef &&
      !rawParticipants.some((p) => p.isBoss || p.id.startsWith('raid_boss_'))
    ) {
      rawParticipants.unshift({
        id: `raid_boss_${raidBossDef.id}`,
        username: `${raidBossDef.badgeIcon} ${raidBossDef.name}`,
        rp: 5000,
        teamId: 4,
        loadout: raidBossDef.loadout,
        tuningLoadout: {
          engine: 'eng_v12_reactor',
          tires: 'tire_carbon_grip',
          nitro: 'nit_plasma_tank',
          body: 'cha_titan_armor',
        },
        computedStats: raidBossDef.computedStats,
        isBot: true,
        isBoss: true,
        bossId: raidBossDef.id,
      });
    }

    const racers: RacerState[] = rawParticipants.map((p, idx) => {
      const row = Math.floor(idx / 4);
      const col = (idx % 4) - 1.5;
      const backDist = p.isBoss ? 12 : 45 + row * 48;
      const sideDist = p.isBoss ? 0 : col * 38;
      const isMe = !p.isBot && isLocalParticipant(p.id);
      const stuAcc = isMe
        ? isTeacher
          ? dualDB.getTeacherProfile()
          : localPlayerId
          ? dualDB.getStudent(localPlayerId)
          : null
        : !p.isBot
        ? dualDB.getStudent(p.id)
        : null;

      return {
        id: isMe && localPlayerId ? localPlayerId : p.id,
        username: p.username,
        isBot: p.isBot,
        isTeacher: p.isTeacher,
        teamId: p.teamId,
        loadout: p.loadout,
        tuningLoadout: isMe ? localAuth.tuningLoadout : p.tuningLoadout,
        computedStats: isMe
          ? localAuth.computedStats
          : p.computedStats || buildComputedStats(p.tuningLoadout),
        rp: p.rp,
        equippedTitle: stuAcc?.equippedTitle ?? p.equippedTitle ?? null,
        hasDragonAura: Boolean(stuAcc?.hasDragonAura),
        isBoss: Boolean(p.isBoss),
        bossId: p.bossId,
        scale: p.isBoss && raidBossDef ? raidBossDef.scale : 1,
        bossMaxHp: p.isBoss ? bossMaxHp : undefined,
        bossHp: p.isBoss ? bossMaxHp : undefined,
        bossStunTimer: 0,
        bossShieldActive: false,
        bossPhase: 1,
        bossSkillCooldown: p.isBoss && raidBossDef ? raidBossDef.skillCycleSec : 0,
        bossKnockdowns: 0,
        damageDealt: 0,
        isInfected: false,
        eliminated: false,
        atpCollected: 0,
        cryoSlowTimer: 0,
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
        visitedCheckpointsMask: 1,
        waypointIndex: 1,
        totalProgress: p.isBoss ? 5 : -backDist * 0.1,
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
        useShortcutThisLap:
          deterministicBotRand(`${lobby.roomPin}_${p.id}_sc_lap1`) <
          diffProfile.shortcutChance,
        elevation: startPt.elevation ?? 0,
      };
    });

    // Bio-Infection Campaign Mode: Infect 2 AI bots at the start of the race
    if (campaignLevel?.mode === 'infection') {
      const botRacers = racers.filter((r) => r.isBot && !r.isBoss);
      for (let b = 0; b < Math.min(2, botRacers.length); b++) {
        botRacers[b].isInfected = true;
        botRacers[b].username = `☣️ ${botRacers[b].username}`;
      }
    }

    // Ghost Car Recording & Playback for Time Trial Mode
    const ghostStorageKey = campaignLevel
      ? `tripled_ghost_lv_${campaignLevel.level}`
      : null;
    let savedGhostFrames: GhostRecordFrame[] = [];
    if (campaignLevel?.mode === 'time_trial' && ghostStorageKey) {
      try {
        const rawGhost = localStorage.getItem(ghostStorageKey);
        if (rawGhost) {
          const parsed = JSON.parse(rawGhost);
          if (Array.isArray(parsed)) savedGhostFrames = parsed;
        }
      } catch {}
    }
    const currentRunGhostFrames: GhostRecordFrame[] = [];
    let ghostSampleAccum = 0;

    // ATP Slalom Rush Orbs & Purple Toxin Spheres (`atp_rush`)
    const atpOrbs: {
      id: string;
      x: number;
      y: number;
      active: boolean;
      isToxin: boolean;
      elevation: 0 | 1;
    }[] = [];
    if (campaignLevel?.mode === 'atp_rush') {
      const totalOrbs = (campaignLevel.targetAtpCount || 25) + 18;
      for (let idx = 0; idx < totalOrbs; idx++) {
        const wpIdx = (1 + idx) % map.waypoints.length;
        const wp = map.waypoints[wpIdx];
        const nextWp = map.waypoints[(wpIdx + 1) % map.waypoints.length];
        const segA = Math.atan2(nextWp.y - wp.y, nextWp.x - wp.x);
        const normA = segA + Math.PI / 2;
        const zigSign = idx % 2 === 0 ? 1 : -1;
        const lateralDist = zigSign * Math.min(54, map.roadWidth * 0.26);
        atpOrbs.push({
          id: `atp_orb_${idx}`,
          x: wp.x + Math.cos(normA) * lateralDist,
          y: wp.y + Math.sin(normA) * lateralDist,
          active: true,
          isToxin: false,
          elevation: wp.elevation ?? 0,
        });
        // Add a Purple Toxin Sphere opposite every 2nd orb
        if (idx % 2 === 1) {
          atpOrbs.push({
            id: `toxin_orb_${idx}`,
            x: wp.x - Math.cos(normA) * lateralDist * 0.85,
            y: wp.y - Math.sin(normA) * lateralDist * 0.85,
            active: true,
            isToxin: true,
            elevation: wp.elevation ?? 0,
          });
        }
      }
    }

    let campaignModeTimer =
      campaignLevel?.mode === 'elimination'
        ? campaignLevel.eliminationIntervalSec || 20
        : campaignLevel?.mode === 'infection' || campaignLevel?.mode === 'atp_rush'
        ? campaignLevel.targetTimeSec || 60
        : 0;

    // Boss Visual & Combat State
    let bossCryoWaveVisualTimer = 0;
    let bossLightningVisualTimer = 0;
    let bossShieldRegenTimer = 0;
    const bossRamCooldownByRacer = new Map<string, number>();

    // Spawn Item Gift Boxes along track segments
    const itemBoxes: TrackItemBox[] = [];
    const maxBoxWp = map.isPointToPoint
      ? map.waypoints.length - 1
      : map.waypoints.length;
    for (let i = 1; i < maxBoxWp; i += 3) {
      const wp = map.waypoints[i];
      const next = map.waypoints[(i + 1) % map.waypoints.length];
      const segAngle = Math.atan2(next.y - wp.y, next.x - wp.x);
      const normal = segAngle + Math.PI / 2;
      const spread = Math.min(48, ((wp.width ?? map.roadWidth) * 0.5) * 0.55);
      for (const offset of [-spread, 0, spread]) {
        itemBoxes.push({
          id: `box_${i}_${offset}`,
          x: wp.x + Math.cos(normal) * offset,
          y: wp.y + Math.sin(normal) * offset,
          active: true,
          respawnTimer: 0,
          elevation: wp.elevation ?? 0,
        });
      }
    }

    // Spawn Double Item Gift Boxes in Map 15 Zone 1 Secret Branches (e.g., ATP Dead-End Cave Pocket)
    if (map.secretBranches) {
      for (const br of map.secretBranches) {
        if (br.hasDoubleGiftBox && br.path.length >= 2) {
          const midPt = br.path[1];
          for (const dx of [-36, -12, 12, 36]) {
            for (const dy of [-18, 18]) {
              itemBoxes.push({
                id: `secret_${br.id}_${dx}_${dy}`,
                x: midPt.x + dx,
                y: midPt.y + dy,
                active: true,
                respawnTimer: 0,
                elevation: br.elevation ?? 0,
                isDoubleBox: true,
              });
            }
          }
        }
      }
    }

    const hazards: DeployedHazard[] = [];
    const trailPool = new TrailParticlePool(500);
    const rocketExplosions: {
      x: number;
      y: number;
      timer: number;
      maxTimer: number;
    }[] = [];

    const spawnRocketExplosion = (
      ex: number,
      ey: number,
      isDirectLocalEvent: boolean = false
    ) => {
      rocketExplosions.push({
        x: ex,
        y: ey,
        timer: 0.45,
        maxTimer: 0.45,
      });
      trailPool.spawnExplosion(ex, ey);
      if (isDirectLocalEvent) {
        soundEngine.playExplosion(1.0);
      } else {
        const distToCam = Math.hypot(ex - cam.x, ey - cam.y);
        if (distToCam < 1800) {
          const vol = Math.max(0.28, 1.0 - distToCam / 2000);
          soundEngine.playExplosion(vol);
        }
      }
    };

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
      // Requirement #9.1: Merge identical events
      const existing = killfeedQueue.find(k => k.text === text && (nowSec - (k.expiresAt - 3)) < 1.5);
      if (existing) {
        existing.expiresAt = nowSec + 3.0;
        return;
      }

      killfeedQueue.unshift({
        id: `kf_${nowSec}_${Math.random()}`,
        text,
        category,
        expiresAt: nowSec + 3.0, // Requirement #9.1: 3 seconds
      });
      if (killfeedQueue.length > 2) {
        killfeedQueue.length = 2; // Requirement #9.1: max 2 lines
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
    let resumeSaveAccum = 0;

    // Restore Mid-Race Session if accidental F5 / page reload occurred within 90s (only for standard races)
    try {
      const rawResume = sessionStorage.getItem('tripled_active_race_resume_v1');
      if (rawResume && localPlayerId && !isRaidBossMode && !campaignLevel) {
        const parsedResume = JSON.parse(rawResume);
        if (
          parsedResume &&
          parsedResume.roomPin === lobby.roomPin &&
          parsedResume.mapId === map.id &&
          parsedResume.playerId === localPlayerId &&
          Date.now() - (parsedResume.savedAt || 0) < 90000
        ) {
          elapsedRaceSec = Math.max(0.1, Number(parsedResume.elapsedRaceSec) || 0.1);
          lastBeepStep = 0;
          const myRacer = racers.find((r) => r.id === localPlayerId);
          if (myRacer && parsedResume.racerState) {
            const rs = parsedResume.racerState;
            myRacer.x = rs.x ?? myRacer.x;
            myRacer.y = rs.y ?? myRacer.y;
            myRacer.vx = rs.vx ?? 0;
            myRacer.vy = rs.vy ?? 0;
            myRacer.angle = rs.angle ?? myRacer.angle;
            myRacer.speed = rs.speed ?? 0;
            myRacer.lap = rs.lap ?? 1;
            myRacer.currentCheckpoint = rs.currentCheckpoint ?? 0;
            myRacer.visitedCheckpointsMask = rs.visitedCheckpointsMask ?? 1;
            myRacer.waypointIndex = rs.waypointIndex ?? 1;
            myRacer.totalProgress = rs.totalProgress ?? myRacer.totalProgress;
            myRacer.nitroCharge = rs.nitroCharge ?? 100;
            myRacer.heldItem = rs.heldItem ?? null;
            myRacer.elevation = rs.elevation ?? 0;
            myRacer.invulnerableTimer = 2.0;
          }
        }
      }
    } catch {}

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
          onTogglePauseRef.current();
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

    soundEngine.startBGM('race');

    // Helper to use held item
    const useRacerItem = (racer: RacerState) => {
      if (!racer.heldItem) return;
      const item = racer.heldItem;
      racer.heldItem = null;
      const racerTuning = getRacerPhysics(racer);

      if (item === 'nitro') {
        racer.nitroTimer = racerTuning.giftBoxNitroDuration;
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
          elevation: racer.elevation ?? 0,
        });
        if (racerTuning.passives.includes('trapBoost')) {
          racer.nitroTimer = Math.max(racer.nitroTimer, 0.8);
          if (racer.id === localPlayerId) soundEngine.playBoost();
        }
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
          elevation: racer.elevation ?? 0,
        });
        if (racerTuning.passives.includes('trapBoost')) {
          racer.nitroTimer = Math.max(racer.nitroTimer, 0.8);
          if (racer.id === localPlayerId) soundEngine.playBoost();
        }
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
          elevation: racer.elevation ?? 0,
        });
        if (racer.id === localPlayerId) {
          soundEngine.playMissileLaunch();
        } else if (Math.hypot(racer.x - cam.x, racer.y - cam.y) < 700) {
          soundEngine.playMissileLaunch();
        }
      }

      // Synchronize hazard deployment across P2P network
      if (
        racer.id === localPlayerId &&
        multiplayerService.isConnected() &&
        item !== 'nitro'
      ) {
        multiplayerService.sendItemUsed({
          id: `net_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: item,
          ownerId: racer.id,
          x: racer.x,
          y: racer.y,
          vx: item === 'rocket' ? Math.cos(racer.angle) * 560 : 0,
          vy: item === 'rocket' ? Math.sin(racer.angle) * 560 : 0,
          angle: racer.angle,
          elevation: racer.elevation ?? 0,
        });
      }
    };

    let lastTime = performance.now();
    let lastRenderTime = 0;
    let hudSyncAccum = 0;
    let animId = 0;
    let rollingFps = 60;
    let finishCounter = 0;

    const loop = (now: number, isBgTick: boolean = false) => {
      if (completedCallbackFired) {
        cancelAnimationFrame(animId);
        return;
      }
      if (!isBgTick) {
        animId = requestAnimationFrame(loop);
      }

      if (isHeadless && now - lastRenderTime < 66) {
        return;
      }
      lastRenderTime = now;

      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const nowSec = now / 1000;

      const instantFps = Math.max(1, Math.min(120, Math.round(1 / Math.max(0.001, dt))));
      rollingFps = Math.round(rollingFps * 0.85 + instantFps * 0.15);

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
          const replayZoom = 1.32 + Math.sin(progress * Math.PI * 0.5) * 0.26;
          ctx.scale(replayZoom, replayZoom);
          ctx.translate(-leaderCar.x, -leaderCar.y);

          drawRaceTrack(ctx, map, itemBoxes, [], nowSec);

          // Golden Champion Spotlight under Top 1 Car during Slow-Mo Replay
          ctx.save();
          const spotGrad = ctx.createRadialGradient(
            leaderCar.x,
            leaderCar.y,
            8,
            leaderCar.x,
            leaderCar.y,
            95
          );
          spotGrad.addColorStop(0, 'rgba(250, 204, 21, 0.38)');
          spotGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.16)');
          spotGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = spotGrad;
          ctx.beginPath();
          ctx.arc(leaderCar.x, leaderCar.y, 95, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

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
              nitroActive: c.nitroTimer > 0 || c.id === frame.leaderId,
              rocketStartActive: c.rocketStartTimer > 0,
              username: c.id === frame.leaderId ? c.username : undefined,
              isPlayer: c.id === frame.leaderId,
              showHeadlightBeams: isNightMapTheme(map.theme),
            });
          }
          ctx.restore();

          // Cinematic Radial Vignette & Subtle Broadcast Framing
          const vigGrad = ctx.createRadialGradient(
            width / 2,
            height / 2,
            Math.min(width, height) * 0.28,
            width / 2,
            height / 2,
            Math.max(width, height) * 0.75
          );
          vigGrad.addColorStop(0, 'rgba(6, 11, 25, 0)');
          vigGrad.addColorStop(0.7, 'rgba(6, 11, 25, 0.32)');
          vigGrad.addColorStop(1, 'rgba(5, 8, 20, 0.82)');
          ctx.fillStyle = vigGrad;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }

        if (replayTimer >= 2.6 && !completedCallbackFired) {
          completedCallbackFired = true;
          cancelAnimationFrame(animId);
          clearInterval(bgIntervalId);
          try {
            sessionStorage.removeItem('tripled_active_race_resume_v1');
          } catch {}
          soundEngine.stopEngineHum();
          soundEngine.stopBGM();
          multiplayerService.clearRaceCaches();
          onRaceCompleteRef.current(racers);
          return;
        }
        return;
      }

      // =========================================================
      // PHASE B: ACTIVE RACE SIMULATION (60 FPS)
      // =========================================================
      elapsedRaceSec += dt;
      elapsedRaceSecRef.current = elapsedRaceSec;

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
          if (
            r.isBot &&
            deterministicBotRand(`${lobby.roomPin}_${r.id}_rocket_start`) <
              diffProfile.rocketStartChance
          ) {
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

      // Ingest remote hazards from real-time peers
      const incomingRemoteHazards = multiplayerService.popRemoteHazards();
      for (const rh of incomingRemoteHazards) {
        if (!hazards.some((h) => h.id === rh.id)) {
          hazards.push({
            id: rh.id,
            type: rh.type,
            ownerId: rh.ownerId,
            x: rh.x,
            y: rh.y,
            vx: rh.vx,
            vy: rh.vy,
            angle: rh.angle,
            ttl: rh.type === 'rocket' ? 6.5 : 25,
            waypointTargetIdx: 0,
            elevation: (rh.elevation === 1 ? 1 : 0) as 0 | 1,
          });
        }
      }

      // Ingest synchronized car-to-car collision bumps targeting the local racer
      const incomingBumps = multiplayerService.popRemoteBumps(localPlayerId);
      if (incomingBumps.length > 0 && localPlayerId) {
        const myRacer = racers.find((r) => r.id === localPlayerId);
        if (myRacer && !myRacer.finished && myRacer.invulnerableTimer <= 0) {
          for (const bmp of incomingBumps) {
            myRacer.vx += bmp.vxImpulse;
            myRacer.vy += bmp.vyImpulse;
            myRacer.speed *= bmp.speedScale;
            soundEngine.playHazardHit();
          }
        }
      }

      // Raid Boss Damage Helper & Skill Executor
      const bossCar = isRaidBossMode ? racers.find((r) => r.isBoss) : undefined;
      const isEasyBossHost =
        isRaidBossMode &&
        isTeacher &&
        (lobby.bossControllerMode === 'player_weapon' ||
          lobby.bossControlMode === 'player_weapon') &&
        (lobby.playModeCategory === 'teacher_cup' || Boolean(lobby.teacherCupOpen));

      const applyDamageToBoss = (
        dmg: number,
        attackerId: string,
        attackerName: string,
        isRemoteSync: boolean = false
      ) => {
        if (!bossCar || bossCar.finished) return;
        const clampedDmg = Math.max(10, Math.round(dmg));
        bossCar.bossShieldActive = false;
        bossShieldRegenTimer = 0;

        const attackerRacer = racers.find((rc) => rc.id === attackerId);
        if (attackerRacer && !attackerRacer.isBoss) {
          attackerRacer.damageDealt =
            (attackerRacer.damageDealt || 0) + clampedDmg;
        }

        const currentHp = bossCar.bossHp ?? bossMaxHp;
        const nextHp = Math.max(0, currentHp - clampedDmg);
        bossCar.bossHp = nextHp;

        if (
          raidBossDef?.id === 'minh_dang' &&
          nextHp <= (bossCar.bossMaxHp || bossMaxHp) * 0.5 &&
          bossCar.bossPhase !== 2
        ) {
          bossCar.bossPhase = 2;
          pushKillfeed(
            `👑 ĐẠI BOSS MINH ĐẶNG BƯỚC VÀO PHASE 2 CUỒNG NỘ (+20% TỐC ĐỘ & TRIỆU HỒI BĂNG ĐỘC)!`,
            'lead',
            nowSec
          );
          soundEngine.playFanfare(false);
        }

        if (!isRemoteSync && attackerId === localPlayerId && multiplayerService.isConnected()) {
          multiplayerService.sendBossDamage({
            attackerId,
            attackerName,
            damage: clampedDmg,
            source: 'weapon',
          });
        }

        if (nextHp <= 0) {
          // Boss is killed! Victorious win condition for all players
          bossCar.bossHp = 0;
          bossCar.bossDied = true;
          bossCar.bossKnockdowns = 3;
          bossCar.bossStunTimer = 999;
          bossCar.speed = 0;
          bossCar.vx = 0;
          bossCar.vy = 0;
          bossCar.finished = true;
          bossCar.finishTimeMs = 999999;
          spawnRocketExplosion(bossCar.x, bossCar.y, true);
          soundEngine.playFanfare(true);
          pushKillfeed(
            `💥💥 ${attackerName} ĐÃ TIÊU DIỆT HOÀN TOÀN BOSS ${raidBossDef?.name.toUpperCase()}! TOÀN ĐỘI CHIẾN THẮNG!`,
            'rocket',
            nowSec
          );
          // Mark all human teammates as victorious finishers
          racers.forEach((rc, rIdx) => {
            if (!rc.isBoss) {
              rc.finished = true;
              rc.finishTimeMs = Math.round(elapsedRaceSec * 1000) + rIdx * 100;
            }
          });
          forceFinishTriggerRef.current = true;
        }
      };

      const executeBossSpecialSkill = (isRemoteCast: boolean = false) => {
        if (!bossCar || !raidBossDef || (bossCar.bossStunTimer || 0) > 0) return;
        bossCar.bossSkillCooldown = raidBossDef.skillCycleSec;
        if (!isRemoteCast && isEasyBossHost && multiplayerService.isConnected()) {
          multiplayerService.sendBossSkillCast(
            raidBossDef.id,
            bossCar.x,
            bossCar.y
          );
        }

        if (raidBossDef.id === 'tuan_anh') {
          // Salvo of 3 Homing Missiles + 4 Nitro Fire Trail Hazards
          for (const spreadAngle of [-0.18, 0, 0.18]) {
            const ang = bossCar.angle + spreadAngle;
            hazards.push({
              id: `boss_msl_${Date.now()}_${spreadAngle}`,
              type: 'rocket',
              ownerId: bossCar.id,
              x: bossCar.x + Math.cos(ang) * 42,
              y: bossCar.y + Math.sin(ang) * 42,
              vx: Math.cos(ang) * 620,
              vy: Math.sin(ang) * 620,
              angle: ang,
              ttl: 7.0,
              waypointTargetIdx: bossCar.waypointIndex,
              elevation: bossCar.elevation ?? 0,
              isBossHazard: true,
            });
          }
          for (let f = 1; f <= 4; f++) {
            hazards.push({
              id: `boss_fire_${Date.now()}_${f}`,
              type: 'boss_fire',
              ownerId: bossCar.id,
              x: bossCar.x - Math.cos(bossCar.angle) * (36 * f),
              y: bossCar.y - Math.sin(bossCar.angle) * (36 * f),
              vx: 0,
              vy: 0,
              angle: 0,
              ttl: 12,
              elevation: bossCar.elevation ?? 0,
              isBossHazard: true,
            });
          }
          soundEngine.playMissileLaunch();
          pushKillfeed(
            `🔥 BOSS ĐẶNG TUẤN ANH phóng Chùm 3 Tên Lửa Tầm Nhiệt & Vệt Lửa V12!`,
            'rocket',
            nowSec
          );
        } else if (raidBossDef.id === 'mai_khanh') {
          bossCryoWaveVisualTimer = 1.25;
          for (const r of racers) {
            if (r.isBoss || r.finished || r.invulnerableTimer > 0) continue;
            if (Math.hypot(r.x - bossCar.x, r.y - bossCar.y) <= 340) {
              r.cryoSlowTimer = 2.5;
              r.speed *= 0.5;
              if (r.id === localPlayerId) soundEngine.playHazardHit();
            }
          }
          pushKillfeed(
            `❄️ BOSS ĐẶNG MAI KHÁNH phát Sóng Xung Kích Hàn Băng (Đóng băng 2.5s)!`,
            'trap',
            nowSec
          );
        } else if (raidBossDef.id === 'hanh_dung') {
          const perp = bossCar.angle + Math.PI / 2;
          for (let tIdx = -2; tIdx <= 2; tIdx++) {
            hazards.push({
              id: `boss_tox_${Date.now()}_${tIdx}`,
              type: tIdx % 2 === 0 ? 'boss_toxic' : 'banana',
              ownerId: bossCar.id,
              x:
                bossCar.x -
                Math.cos(bossCar.angle) * 48 +
                Math.cos(perp) * (tIdx * 34),
              y:
                bossCar.y -
                Math.sin(bossCar.angle) * 48 +
                Math.sin(perp) * (tIdx * 34),
              vx: 0,
              vy: 0,
              angle: 0,
              ttl: 20,
              elevation: bossCar.elevation ?? 0,
              isBossHazard: true,
            });
          }
          bossCar.bossShieldActive = true;
          bossShieldRegenTimer = 4.0;
          pushKillfeed(
            `🌸 BOSS TRẦN HẠNH DUNG rải 5 Bẫy Hoa Độc & bật Khiên Sinh Học Hồng Ngọc!`,
            'trap',
            nowSec
          );
        } else if (raidBossDef.id === 'minh_dang') {
          bossLightningVisualTimer = 1.15;
          for (const r of racers) {
            if (r.isBoss || r.finished || r.invulnerableTimer > 0) continue;
            if (Math.hypot(r.x - bossCar.x, r.y - bossCar.y) <= 330) {
              r.stunTimer = Math.max(r.stunTimer, 1.35);
              r.speed *= 0.3;
              if (r.id === localPlayerId) soundEngine.playHazardHit();
            }
          }
          if (bossCar.bossPhase === 2) {
            bossCryoWaveVisualTimer = 1.25;
            const perp = bossCar.angle + Math.PI / 2;
            for (let tIdx = -2; tIdx <= 2; tIdx++) {
              hazards.push({
                id: `boss_md_tox_${Date.now()}_${tIdx}`,
                type: 'boss_toxic',
                ownerId: bossCar.id,
                x:
                  bossCar.x -
                  Math.cos(bossCar.angle) * 52 +
                  Math.cos(perp) * (tIdx * 36),
                y:
                  bossCar.y -
                  Math.sin(bossCar.angle) * 52 +
                  Math.sin(perp) * (tIdx * 36),
                vx: 0,
                vy: 0,
                angle: 0,
                ttl: 18,
                elevation: bossCar.elevation ?? 0,
                isBossHazard: true,
              });
            }
            for (const spreadAngle of [-0.15, 0.15]) {
              const ang = bossCar.angle + spreadAngle;
              hazards.push({
                id: `boss_md_msl_${Date.now()}_${spreadAngle}`,
                type: 'rocket',
                ownerId: bossCar.id,
                x: bossCar.x + Math.cos(ang) * 44,
                y: bossCar.y + Math.sin(ang) * 44,
                vx: Math.cos(ang) * 630,
                vy: Math.sin(ang) * 630,
                angle: ang,
                ttl: 6.5,
                waypointTargetIdx: bossCar.waypointIndex,
                elevation: bossCar.elevation ?? 0,
                isBossHazard: true,
              });
            }
            pushKillfeed(
              `👑 ĐẠI BOSS MINH ĐẶNG (CUỒNG NỘ) triệu hồi Sét ATP + Băng Vũ Trụ + Bẫy Độc!`,
              'rocket',
              nowSec
            );
          } else {
            pushKillfeed(
              `⚡ ĐẠI BOSS MINH ĐẶNG phóng Tia Sét Phân Tử ATP tê liệt xung quanh!`,
              'trap',
              nowSec
            );
          }
          soundEngine.playMissileLaunch();
        }
      };

      // Process remote Boss Damage & Boss Skill events
      while (remoteBossDamageQueueRef.current.length > 0) {
        const ev = remoteBossDamageQueueRef.current.shift()!;
        applyDamageToBoss(ev.damage, ev.attackerId, ev.attackerName, true);
      }
      while (remoteBossSkillQueueRef.current.length > 0) {
        remoteBossSkillQueueRef.current.shift();
        executeBossSpecialSkill(true);
      }

      // Update Boss Timers & Cooldowns
      if (raceStarted && isRaidBossMode && bossCar && raidBossDef) {
        if (bossCryoWaveVisualTimer > 0) {
          bossCryoWaveVisualTimer = Math.max(0, bossCryoWaveVisualTimer - dt);
        }
        if (bossLightningVisualTimer > 0) {
          bossLightningVisualTimer = Math.max(0, bossLightningVisualTimer - dt);
        }
        if ((bossCar.bossStunTimer || 0) > 0) {
          bossCar.bossStunTimer = Math.max(0, (bossCar.bossStunTimer || 0) - dt);
          bossCar.stunTimer = bossCar.bossStunTimer;
        } else {
          if (bossCar.bossShieldActive && bossShieldRegenTimer > 0) {
            bossShieldRegenTimer -= dt;
            if (bossShieldRegenTimer <= 0) {
              bossCar.bossShieldActive = false;
              const maxH = bossCar.bossMaxHp || bossMaxHp;
              bossCar.bossHp = Math.min(
                maxH,
                (bossCar.bossHp || maxH) + Math.round(maxH * 0.05)
              );
              pushKillfeed(
                `🌸 Khiên Sinh Học Hồng Ngọc hồi +5% HP cho Boss Trần Hạnh Dung!`,
                'lead',
                nowSec
              );
            }
          }

          bossCar.bossSkillCooldown = Math.max(
            0,
            (bossCar.bossSkillCooldown ?? raidBossDef.skillCycleSec) - dt
          );

          if ((bossCar.bossSkillCooldown || 0) <= 0) {
            if (
              lobby.bossControllerMode === 'player_weapon' ||
              lobby.bossControllerMode === 'host_manual'
            ) {
              if (
                isEasyBossHost &&
                (manualBossSkillTriggerRef.current || justPressed.has('Space'))
              ) {
                manualBossSkillTriggerRef.current = false;
                executeBossSpecialSkill(false);
              }
            } else {
              executeBossSpecialSkill(false);
            }
          }
        }
      }

      // Update Solo Campaign Special Timers (Elimination / Infection / ATP Rush / Ghost Recording)
      if (raceStarted && campaignLevel) {
        const localRacer = racers.find((r) => r.id === localPlayerId);
        if (campaignLevel.mode === 'time_trial' && localRacer && !localRacer.finished) {
          ghostSampleAccum += dt;
          if (ghostSampleAccum >= 0.1) {
            ghostSampleAccum = 0;
            currentRunGhostFrames.push({
              t: Number(elapsedRaceSec.toFixed(2)),
              x: Math.round(localRacer.x),
              y: Math.round(localRacer.y),
              angle: Number(localRacer.angle.toFixed(3)),
              elevation: (localRacer.elevation === 1 ? 1 : 0) as 0 | 1,
            });
          }
        } else if (campaignLevel.mode === 'elimination') {
          campaignModeTimer -= dt;
          if (campaignModeTimer <= 0) {
            campaignModeTimer = campaignLevel.eliminationIntervalSec || 20;
            const activeAlive = racers
              .filter((r) => !r.eliminated && !r.finished)
              .sort((a, b) => b.totalProgress - a.totalProgress);
            if (activeAlive.length > 1) {
              const victim = activeAlive[activeAlive.length - 1];
              victim.eliminated = true;
              victim.finished = true;
              victim.finishTimeMs = 999999;
              spawnRocketExplosion(victim.x, victim.y, victim.id === localPlayerId);
              pushKillfeed(
                `💀 SINH TỒN: ${victim.username} đứng cuối bảng đã phát nổ bị loại!`,
                'rocket',
                nowSec
              );
              if (victim.id === localPlayerId || activeAlive.length - 1 <= 1) {
                if (activeAlive.length - 1 === 1 && activeAlive[0].id === localPlayerId) {
                  activeAlive[0].finished = true;
                  activeAlive[0].finishTimeMs = Math.round(elapsedRaceSec * 1000);
                }
                forceFinishTriggerRef.current = true;
              }
            }
          }
        } else if (campaignLevel.mode === 'infection') {
          campaignModeTimer -= dt;
          if (localRacer && localRacer.isInfected) {
            localRacer.finished = true;
            localRacer.finishTimeMs = 999999;
            forceFinishTriggerRef.current = true;
          } else if (campaignModeTimer <= 0 && localRacer) {
            localRacer.finished = true;
            localRacer.finishTimeMs = Math.round(elapsedRaceSec * 1000);
            localRacer.totalProgress += 50000;
            pushKillfeed(
              `☣️ SỐNG SÓT THÀNH CÔNG! Bạn đã vượt qua Đại Dịch Thực Khuẩn Thể!`,
              'lead',
              nowSec
            );
            forceFinishTriggerRef.current = true;
          }
        } else if (campaignLevel.mode === 'atp_rush' && localRacer) {
          campaignModeTimer -= dt;
          for (const orb of atpOrbs) {
            if (!orb.active || (orb.elevation ?? 0) !== (localRacer.elevation ?? 0)) continue;
            if (Math.hypot(localRacer.x - orb.x, localRacer.y - orb.y) < 38) {
              orb.active = false;
              if (orb.isToxin) {
                localRacer.spinTimer = 1.15;
                localRacer.speed *= 0.35;
                soundEngine.playHazardHit();
                pushKillfeed(`☠️ Chạm phải Độc Tố Tím (-Tốc độ)!`, 'trap', nowSec);
              } else {
                localRacer.atpCollected = (localRacer.atpCollected || 0) + 1;
                localRacer.nitroCharge = Math.min(100, localRacer.nitroCharge + 16);
                soundEngine.playCoin();
                if ((localRacer.atpCollected || 0) >= (campaignLevel.targetAtpCount || 25)) {
                  localRacer.finished = true;
                  localRacer.finishTimeMs = Math.round(elapsedRaceSec * 1000);
                  localRacer.totalProgress += 50000;
                  pushKillfeed(
                    `🎯 THU THẬP ĐỦ ${localRacer.atpCollected} PHÂN TỬ ATP! CHIẾN THẮNG!`,
                    'lead',
                    nowSec
                  );
                  forceFinishTriggerRef.current = true;
                  break;
                }
              }
            }
          }
          if (campaignModeTimer <= 0 && !localRacer.finished) {
            localRacer.finished = true;
            localRacer.finishTimeMs = 999999;
            forceFinishTriggerRef.current = true;
          }
        }
      }

      // Update Homing Rockets & Hazards
      for (let i = hazards.length - 1; i >= 0; i--) {
        const hz = hazards[i];
        hz.ttl -= dt;
        if (hz.ttl <= 0) {
          if (hz.type === 'rocket') {
            spawnRocketExplosion(hz.x, hz.y, hz.ownerId === localPlayerId);
          }
          hazards.splice(i, 1);
          continue;
        }

        if (hz.type === 'rocket') {
          let bestTarget: RacerState | null = null;
          let bestDist = 850;
          // In Raid Boss mode, all players are on 1 team: player rockets EXCLUSIVELY target the Boss!
          if (isRaidBossMode && hz.ownerId !== bossCar?.id) {
            if (bossCar && !bossCar.finished) {
              bestTarget = bossCar;
            }
          } else {
            for (const candidate of racers) {
              if (
                candidate.id === hz.ownerId ||
                candidate.finished ||
                candidate.invulnerableTimer > 0 ||
                (candidate.elevation ?? 0) !== (hz.elevation ?? 0)
              ) {
                continue;
              }
              const d = Math.hypot(candidate.x - hz.x, candidate.y - hz.y);
              if (d < bestDist) {
                bestDist = d;
                bestTarget = candidate;
              }
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
              hz.elevation = map.waypoints[hz.waypointTargetIdx]?.elevation ?? hz.elevation ?? 0;
            }
            hz.angle = Math.atan2(wp.y - hz.y, wp.x - hz.x);
          }

          hz.vx = Math.cos(hz.angle) * 600;
          hz.vy = Math.sin(hz.angle) * 600;
          hz.x += hz.vx * dt;
          hz.y += hz.vy * dt;

          // Check if rocket collides with any tire barrier
          let hitBarrier = false;
          for (const tb of map.tireBarriers) {
            if (Math.hypot(hz.x - tb.x, hz.y - tb.y) < tb.radius + 10) {
              spawnRocketExplosion(hz.x, hz.y, hz.ownerId === localPlayerId);
              hazards.splice(i, 1);
              hitBarrier = true;
              break;
            }
          }
          if (hitBarrier) continue;
        }

        // Check collision with racers on the same elevation level
        for (const r of racers) {
          if (
            r.id === hz.ownerId ||
            r.finished ||
            r.invulnerableTimer > 0 ||
            (r.elevation ?? 0) !== (hz.elevation ?? 0)
          ) {
            continue;
          }
          // Friendly fire disabled in Raid Boss mode: human player weapons ONLY hit the Boss, never teammates!
          if (isRaidBossMode && hz.ownerId !== bossCar?.id && !r.isBoss) {
            continue;
          }
          const hitRadius = r.isBoss ? 48 : hz.type === 'mud' ? 42 : 28;
          if (Math.hypot(r.x - hz.x, r.y - hz.y) < hitRadius) {
            const attacker = racers.find((rc) => rc.id === hz.ownerId);
            const attackerName = attacker ? attacker.username : 'Đối thủ';

            // Student Weapon Hit on RAID BOSS (-150 HP!)
            if (r.isBoss && hz.ownerId !== r.id) {
              applyDamageToBoss(150, hz.ownerId, attackerName);
              spawnRocketExplosion(
                (hz.x + r.x) * 0.5,
                (hz.y + r.y) * 0.5,
                hz.ownerId === localPlayerId
              );
              pushKillfeed(
                `🎯 ${attackerName} bắn trúng BOSS (-150 HP)!`,
                'rocket',
                nowSec
              );
              hazards.splice(i, 1);
              break;
            }

            const victimPhys = getRacerPhysics(r);
            if (hz.type === 'banana' || hz.type === 'boss_toxic' || hz.type === 'boss_fire') {
              let spinDuration = (hz.type === 'boss_toxic' ? 1.8 : 1.5) * victimPhys.stunMultiplier;
              if (victimPhys.passives.includes('titanArmor')) {
                spinDuration *= 0.5;
              } else if (victimPhys.passives.includes('bananaResist')) {
                spinDuration *= 0.6;
              }
              if (victimPhys.passives.includes('steelReinforced')) {
                spinDuration *= 0.8;
              }
              r.spinTimer = spinDuration;
              r.speed *= 0.25;
              if (r.id === localPlayerId) soundEngine.playHazardHit();
              pushKillfeed(
                hz.type === 'boss_toxic'
                  ? `🌸 ${r.username} trúng Bẫy Hoa Độc của Boss!`
                  : hz.type === 'boss_fire'
                  ? `🔥 ${r.username} cháy lốp bởi Vệt Lửa Nitro của Boss!`
                  : `🍌 ${r.username} trượt vỏ chuối của ${attackerName}!`,
                'trap',
                nowSec
              );
              hazards.splice(i, 1);
              break;
            } else if (hz.type === 'mud') {
              if (!victimPhys.passives.includes('atpCore')) {
                const isNitroActiveNow =
                  r.isBoostingNitro || r.nitroTimer > 0 || r.rocketStartTimer > 0;
                if (r.mudTimer <= 0.4) {
                  if (r.id === localPlayerId) soundEngine.playHazardHit();
                  pushKillfeed(
                    `💩 ${r.username} sa lầy bẫy bùn của ${attackerName}!`,
                    'trap',
                    nowSec
                  );
                }
                const baseMudTime = isNitroActiveNow ? 0.65 : 2.6;
                const effectiveMudTime = victimPhys.passives.includes('offroadPass')
                  ? baseMudTime * 0.4
                  : baseMudTime;
                r.mudTimer = Math.max(r.mudTimer, effectiveMudTime);
              }
            } else if (hz.type === 'rocket') {
              let rocketStun = 2.0 * victimPhys.stunMultiplier;
              if (victimPhys.passives.includes('titanArmor')) {
                rocketStun *= 0.5;
              }
              if (victimPhys.passives.includes('steelReinforced')) {
                rocketStun *= 0.8;
              }
              r.stunTimer = rocketStun;
              r.speed = 0;
              r.vx = 0;
              r.vy = 0;
              spawnRocketExplosion(
                (hz.x + r.x) * 0.5,
                (hz.y + r.y) * 0.5,
                r.id === localPlayerId || hz.ownerId === localPlayerId
              );
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
          if (!r.isBot && r.id === localPlayerId) {
            multiplayerService.sendPosition(r, 150);
          }
          continue;
        }

        // Decrement timers
        if (r.nitroTimer > 0) r.nitroTimer = Math.max(0, r.nitroTimer - dt);
        if (r.rocketStartTimer > 0)
          r.rocketStartTimer = Math.max(0, r.rocketStartTimer - dt);
        if (r.spinTimer > 0) r.spinTimer = Math.max(0, r.spinTimer - dt);
        if (r.mudTimer > 0) r.mudTimer = Math.max(0, r.mudTimer - dt);
        if (r.stunTimer > 0) r.stunTimer = Math.max(0, r.stunTimer - dt);
        if ((r.cryoSlowTimer || 0) > 0)
          r.cryoSlowTimer = Math.max(0, (r.cryoSlowTimer || 0) - dt);
        if (r.invulnerableTimer > 0)
          r.invulnerableTimer = Math.max(0, r.invulnerableTimer - dt);
        if ((r.glassFallCooldown || 0) > 0)
          r.glassFallCooldown = Math.max(0, (r.glassFallCooldown || 0) - dt);
        if ((r.bumperHitCooldown || 0) > 0)
          r.bumperHitCooldown = Math.max(0, (r.bumperHitCooldown || 0) - dt);

        if (!raceStarted) {
          if (!r.isBot && r.id === localPlayerId) {
            multiplayerService.sendPosition(r, 50);
          }
          continue;
        }

        let accelInput = 0;
        let steerInput = 0;
        let wantsShiftNitro = false;

        if (!r.isBot && r.id === localPlayerId) {
          // Human PC Controls with Custom Keybindings
          const bindings = getKeyBindings();
          const up = bindings.forward.some((k) => keys.has(k));
          const down = bindings.reverse.some((k) => keys.has(k));
          const left = bindings.steerLeft.some((k) => keys.has(k));
          const right = bindings.steerRight.some((k) => keys.has(k));
          const shiftHeld =
            bindings.nitro.some((k) => keys.has(k)) ||
            manualNitroHoldRef.current;

          if (up || shiftHeld) accelInput = 1;
          else if (down) accelInput = -1;
          if (left) steerInput -= 1;
          if (right) steerInput += 1;

          wantsShiftNitro = shiftHeld;

          const nitroJustPressed = bindings.nitro.some((k) => justPressed.has(k));
          const nitroMinThreshold = r.mudTimer > 0 ? 10 : 20;
          if (
            nitroJustPressed &&
            r.nitroCharge > nitroMinThreshold &&
            !r.isBoostingNitro
          ) {
            soundEngine.playBoost();
          }

          if (bindings.useItem.some((k) => justPressed.has(k)) && r.heldItem) {
            useRacerItem(r);
          }
          if (bindings.rescue.some((k) => justPressed.has(k))) {
            const rescued = applyCarRescue(r, map);
            Object.assign(r, rescued);
            soundEngine.playCoin();
          }
        } else if (!r.isBot) {
          // REMOTE HUMAN RACER: Client-Authoritative Dead-Reckoning Extrapolation & Exponential Smoothing
          const remotePos = multiplayerService.getRemoteRacer(r.id);
          if (remotePos) {
            if (remotePos.computedStats) {
              r.computedStats = remotePos.computedStats;
            }
            const packetAgeSec = remotePos.timestamp
              ? Math.min(
                  0.16,
                  Math.max(0, (Date.now() - remotePos.timestamp) / 1000)
                )
              : dt * 0.5;
            const lookaheadSec = Math.min(0.11, packetAgeSec * 0.65 + dt * 0.5);
            const targetX = remotePos.x + remotePos.vx * lookaheadSec;
            const targetY = remotePos.y + remotePos.vy * lookaheadSec;

            const distError = Math.hypot(targetX - r.x, targetY - r.y);
            if (distError > 420) {
              // Snap immediately on large discontinuity (e.g. Rescue 'R' or Portal teleport)
              r.x = remotePos.x;
              r.y = remotePos.y;
              r.angle = remotePos.angle;
            } else {
              const posBlend = 1 - Math.exp(-20 * dt);
              const angleBlend = 1 - Math.exp(-24 * dt);
              r.x += (targetX - r.x) * posBlend;
              r.y += (targetY - r.y) * posBlend;

              let angleDiff = remotePos.angle - r.angle;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              r.angle += angleDiff * angleBlend;
            }

            r.vx = remotePos.vx;
            r.vy = remotePos.vy;
            r.speed = remotePos.speed;
            r.drifting = remotePos.drifting;
            r.isBoostingNitro =
              remotePos.isBoostingNitro || Boolean(remotePos.isNitroActive);
            r.nitroCharge = remotePos.nitroCharge;
            r.lap = remotePos.lap;
            r.waypointIndex = remotePos.waypointIndex;
            r.currentCheckpoint = remotePos.currentCheckpoint;

            // Align countdown clock if remote host is ahead so both players cross GO! simultaneously
            if (
              typeof remotePos.elapsedRaceSec === 'number' &&
              elapsedRaceSec < 0.5 &&
              remotePos.elapsedRaceSec > elapsedRaceSec &&
              remotePos.elapsedRaceSec - elapsedRaceSec < 3.5
            ) {
              elapsedRaceSec = remotePos.elapsedRaceSec;
              elapsedRaceSecRef.current = elapsedRaceSec;
            }

            const justFinishedRemotely = remotePos.finished && !r.finished;
            r.finished = remotePos.finished;
            if (justFinishedRemotely) {
              finishCounter++;
              r.finishOrder = finishCounter;
              const localRacer = racers.find((rc) => rc.id === localPlayerId);
              let resolvedFinishMs =
                remotePos.finishTimeMs > 0
                  ? remotePos.finishTimeMs
                  : Math.max(100, Math.round(elapsedRaceSec * 1000));
              // If local player already finished BEFORE this remote racer crossed the line,
              // ensure remote racer's finishTimeMs is strictly greater than local player's finishTimeMs!
              if (
                localRacer &&
                localRacer.finished &&
                localRacer.finishTimeMs > 0 &&
                (localRacer.finishOrder || 0) < r.finishOrder
              ) {
                resolvedFinishMs = Math.max(
                  resolvedFinishMs,
                  localRacer.finishTimeMs + 45
                );
              }
              r.finishTimeMs = resolvedFinishMs;
            } else if (!r.finished) {
              r.finishTimeMs = remotePos.finishTimeMs;
            }

            r.placement = remotePos.placement;
            if (remotePos.elevation !== undefined) {
              r.elevation = (remotePos.elevation === 1 ? 1 : 0) as 0 | 1;
            }
            r.totalProgress =
              typeof remotePos.totalProgress === 'number' &&
              Number.isFinite(remotePos.totalProgress)
                ? Math.max(
                    remotePos.totalProgress,
                    computeRacerTrackProgress(r, map).totalProgress
                  )
                : computeRacerTrackProgress(r, map).totalProgress;

            if (justFinishedRemotely) {
              if (firstFinisherElapsedSec === null) {
                firstFinisherElapsedSec = elapsedRaceSec;
              }
              pushKillfeed(
                `🏁 ${r.username} đã cán đích hoàn thành chặng đua!`,
                'lap',
                nowSec
              );
            }

            // Spawn tire/exhaust trail particles for remote player
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
          } else {
            // No position yet: Stand still at starting grid, DO NOT MOVE
            r.speed = 0;
            r.vx = 0;
            r.vy = 0;
          }
          continue; // Skip AI Bot steering completely for human players!
        } else {
          // Intelligent AI Bot Steering & Smart Track Recovery (r.isBot === true)
          accelInput = 1;
          if (r.shortcutStepIndex === undefined) r.shortcutStepIndex = 0;
          if (r.isNavigatingShortcut === undefined) r.isNavigatingShortcut = false;

          const currentTrackCheck = isPointOnTrack(
            { x: r.x, y: r.y },
            map,
            r.elevation,
            r.angle
          );

          // Check if Bot should enter the shortcut path (on Map 15 Zone 2, only enter stone shortcut during Low Tide!)
          const canBotTakeShortcutNow =
            map.theme === 'unknown_cell' && map.tidalZones?.[0]
              ? !isBiologicalHighTide(nowSec, map.tidalZones[0].periodSec ?? 5)
              : true;

          if (
            !r.isNavigatingShortcut &&
            r.useShortcutThisLap &&
            canBotTakeShortcutNow &&
            map.shortcut &&
            map.shortcut.path.length > 0
          ) {
            const entryPt = map.shortcut.path[0];
            const distToEntry = Math.hypot(entryPt.x - r.x, entryPt.y - r.y);
            const nearEntryWp =
              r.waypointIndex === map.shortcut.entryWaypointIndex ||
              (r.waypointIndex >= map.shortcut.entryWaypointIndex - 1 &&
                r.waypointIndex <= map.shortcut.entryWaypointIndex + 1 &&
                distToEntry < 320);

            if (nearEntryWp) {
              r.isNavigatingShortcut = true;
              r.shortcutStepIndex = 0;
            }
          }

          let targetPt: Point2D;

          if (r.isBoss) {
            r.isNavigatingShortcut = false;
            r.useShortcutThisLap = false;
          }

          if (r.isNavigatingShortcut && map.shortcut && map.shortcut.path.length > 0 && !r.isBoss) {
            const scPath = map.shortcut.path;
            const currentStep = Math.min(r.shortcutStepIndex, scPath.length - 1);
            targetPt = scPath[currentStep];

            const distToScNode = Math.hypot(targetPt.x - r.x, targetPt.y - r.y);
            if (distToScNode < 180) {
              if (currentStep < scPath.length - 1) {
                // Move towards next node along shortcut
                r.shortcutStepIndex = currentStep + 1;
                targetPt = scPath[r.shortcutStepIndex];
              } else {
                // Reached shortcut EXIT! Transition cleanly back to main track
                r.isNavigatingShortcut = false;
                r.useShortcutThisLap = false; // Finished shortcut for this lap
                r.shortcutStepIndex = 0;
                // Target next waypoint immediately following the shortcut exit waypoint
                r.waypointIndex =
                  (map.shortcut.exitWaypointIndex + 1) % map.waypoints.length;
                targetPt = map.waypoints[r.waypointIndex];

                // Credit bypassed checkpoints along the shortcut if bot legitimately entered it
                for (let c = 0; c < map.checkpointIndices.length; c++) {
                  const cpWp = map.checkpointIndices[c];
                  if (
                    cpWp >= map.shortcut.entryWaypointIndex &&
                    cpWp <= map.shortcut.exitWaypointIndex &&
                    c === r.currentCheckpoint + 1
                  ) {
                    r.currentCheckpoint = c;
                    r.visitedCheckpointsMask = (r.visitedCheckpointsMask ?? 1) | (1 << c);
                  }
                }
              }
            }
          } else {
            r.shortcutStepIndex = 0;
            r.isNavigatingShortcut = false;

            // Off-road recovery: only nudge waypointIndex forward along track, never backwards!
            if (!currentTrackCheck.onRoad && r.stuckTimer > 0.6) {
              const segIdx = currentTrackCheck.nearestSegmentIdx;
              const forwardDiff =
                (segIdx - r.waypointIndex + map.waypoints.length) %
                map.waypoints.length;
              if (forwardDiff > 0 && forwardDiff <= 4) {
                r.waypointIndex = map.isPointToPoint
                  ? Math.min(map.waypoints.length - 1, segIdx + 1)
                  : (segIdx + 1) % map.waypoints.length;
              }
            }

            targetPt = map.waypoints[r.waypointIndex % map.waypoints.length];
            const distToTarget = Math.hypot(targetPt.x - r.x, targetPt.y - r.y);
            const advanceDist = r.isBoss ? 260 : 190;
            if (distToTarget < advanceDist) {
              r.waypointIndex = map.isPointToPoint
                ? Math.min(map.waypoints.length - 1, r.waypointIndex + 1)
                : (r.waypointIndex + 1) % map.waypoints.length;
              targetPt = map.waypoints[r.waypointIndex % map.waypoints.length];
            }
          }

          const desiredAngle = Math.atan2(targetPt.y - r.y, targetPt.x - r.x);
          let angleDiff = desiredAngle - r.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          if (angleDiff > 0.05) steerInput = 1;
          else if (angleDiff < -0.05) steerInput = -1;

          if (Math.abs(angleDiff) > 0.65) {
            accelInput = -0.1;
          } else if (Math.abs(angleDiff) > 0.38) {
            accelInput = 0.6;
          }

          if (r.mudTimer > 0 && r.heldItem === 'nitro') {
            useRacerItem(r);
          }

          if (
            (r.mudTimer > 0 && r.nitroCharge > 12) ||
            (Math.abs(angleDiff) < 0.22 &&
              r.nitroCharge > Math.max(21, diffProfile.nitroUseThreshold))
          ) {
            wantsShiftNitro = true;
          } else if (
            r.isBoostingNitro &&
            r.nitroCharge > (r.mudTimer > 0 ? 5 : 20) &&
            Math.abs(angleDiff) < 0.35
          ) {
            wantsShiftNitro = true;
          }

          // Stuck recovery for Bot
          if (r.stuckTimer > 1.0) {
            if (
              r.isNavigatingShortcut &&
              map.shortcut &&
              map.shortcut.path.length > 0
            ) {
              const scPath = map.shortcut.path;
              const step = Math.min(r.shortcutStepIndex, scPath.length - 1);
              const node = scPath[step];
              const nextNode = scPath[Math.min(step + 1, scPath.length - 1)];
              r.x = node.x;
              r.y = node.y;
              const forwardAngle =
                step < scPath.length - 1
                  ? Math.atan2(nextNode.y - node.y, nextNode.x - node.x)
                  : Math.atan2(
                      map.waypoints[
                        (map.shortcut.exitWaypointIndex + 1) %
                          map.waypoints.length
                      ].y - node.y,
                      map.waypoints[
                        (map.shortcut.exitWaypointIndex + 1) %
                          map.waypoints.length
                      ].x - node.x
                    );
              r.angle = forwardAngle;
              r.vx = Math.cos(forwardAngle) * 140;
              r.vy = Math.sin(forwardAngle) * 140;
              r.speed = 140;
              r.stuckTimer = 0;
            } else if (!currentTrackCheck.onRoad || r.stuckTimer > 0.8) {
              const rescued = applyCarRescue(r, map);
              Object.assign(r, rescued);
              const fwdSpeed = r.isBoss ? 240 : 130;
              r.speed = fwdSpeed;
              r.vx = Math.cos(rescued.angle) * fwdSpeed;
              r.vy = Math.sin(rescued.angle) * fwdSpeed;
              r.stuckTimer = 0;
            }
          }

          if (r.heldItem && Math.random() < diffProfile.itemRate * dt) {
            useRacerItem(r);
          }
        }

        // Compute Rebalanced 60 FPS Performance Tuning Physics for this racer
        // Principle 1: Local player uses Client-Authoritative playerPhysicsRef / localAuth!
        const tuningPhys = getRacerPhysics(r);
        const nitroPowerBonus = Math.max(
          0.75,
          1 + tuningPhys.summary.totalNitro * 0.008
        );
        const nitroDurationScale = Math.max(
          0.5,
          tuningPhys.nitroDuration / 2.0
        );

        // Process Shift Nitro Bar consumption & recharge (Base duration reduced by 20%)
        // Allow lower activation threshold (>10%) when in mud so player can easily burn Nitro to escape mud!
        const minStartCharge = r.mudTimer > 0 ? 10 : 20;
        const canContinueOrStartNitro = r.isBoostingNitro
          ? r.nitroCharge > 0
          : r.nitroCharge > minStartCharge;

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
          r.nitroCharge = Math.max(
            0,
            r.nitroCharge - (45 / nitroDurationScale) * dt
          );
          if (r.nitroCharge <= 0) {
            r.isBoostingNitro = false;
          }
        } else {
          r.isBoostingNitro = false;
          // Recharge faster when drifting! (carbonGrip: +25% drift recharge, emPulse: +6%/s auto recharge)
          const driftRecharge = 28 * (tuningPhys.hasCarbonGrip ? 1.25 : 1.0);
          const rechargeRate =
            (r.drifting ? driftRecharge : 9) + (tuningPhys.hasEmPulse ? 6 : 0);
          r.nitroCharge = Math.min(100, r.nitroCharge + rechargeRate * dt);
        }

        // Check surface & 2-level elevation (Asphalt vs Grass off-road vs Zero-G Glass Bridge vs Overpass)
        const trackCheck = isPointOnTrack(
          { x: r.x, y: r.y },
          map,
          r.elevation,
          r.angle
        );
        r.elevation = trackCheck.elevation;

        // Decrement Jump Pad airborne timer, Laser Gate hit cooldown, and Apex Exit Mini-Boost timer
        if ((r.jumpTimer || 0) > 0) {
          r.jumpTimer = Math.max(0, (r.jumpTimer || 0) - dt);
        }
        if ((r.laserHitCooldown || 0) > 0) {
          r.laserHitCooldown = Math.max(0, (r.laserHitCooldown || 0) - dt);
        }
        if ((r.apexBoostTimer || 0) > 0) {
          r.apexBoostTimer = Math.max(0, (r.apexBoostTimer || 0) - dt);
        }
        const isAirborne = (r.jumpTimer || 0) > 0;

        // Map 11 Zero-G Glass Bridge Fall Penalty (`noGuardrail: true`):
        // Driving off a guardrail-free glass bridge into deep space penalizes 1.5s and rescues back onto track!
        if (
          !isAirborne &&
          !trackCheck.onRoad &&
          trackCheck.noGuardrail &&
          (r.glassFallCooldown || 0) <= 0
        ) {
          const rescued = applyCarRescue(r, map);
          Object.assign(r, rescued);
          r.stunTimer = Math.max(r.stunTimer, 1.5);
          r.glassFallCooldown = 2.2;
          r.stuckTimer = 0;
          if (r.id === localPlayerId) {
            soundEngine.playHazardHit();
            pushKillfeed(
              `🌌 ${r.username} trượt khỏi Cầu Kính Không Trọng Lực (-1.5s)!`,
              'trap',
              nowSec
            );
          }
          continue;
        }

        // Overpass Bridge Physical Guardrail (`r.elevation === 1` and `!trackCheck.noGuardrail`):
        // Keep cars on Level 1 inside the bridge deck so they never float into mid-air off the bridge sides
        if (
          (r.elevation ?? 0) === 1 &&
          !trackCheck.noGuardrail &&
          !trackCheck.onRoad
        ) {
          const segA = map.waypoints[trackCheck.nearestSegmentIdx];
          const segB =
            map.waypoints[
              (trackCheck.nearestSegmentIdx + 1) % map.waypoints.length
            ];
          if (segA && segB) {
            const proj = distanceToSegment({ x: r.x, y: r.y }, segA, segB);
            const maxBridgeHalfW =
              ((segA.width ?? map.roadWidth) * (1 - proj.t) +
                (segB.width ?? map.roadWidth) * proj.t) *
              0.46;
            const dx = r.x - proj.projX;
            const dy = r.y - proj.projY;
            const dist = Math.hypot(dx, dy);
            if (dist > maxBridgeHalfW && dist > 0.001) {
              r.x = proj.projX + (dx / dist) * maxBridgeHalfW;
              r.y = proj.projY + (dy / dist) * maxBridgeHalfW;
              r.speed *= 0.88;
              r.vx = Math.cos(r.angle) * r.speed;
              r.vy = Math.sin(r.angle) * r.speed;
            }
          }
        }

        if (!trackCheck.onRoad) {
          r.stuckTimer = (r.stuckTimer || 0) + dt;
          if (r.isBot && r.stuckTimer > 1.0) {
            const rescued = applyCarRescue(r, map);
            Object.assign(r, rescued);
            r.stuckTimer = 0;
          }
        } else {
          r.stuckTimer = Math.max(0, (r.stuckTimer || 0) - dt * 2);
        }

        if (
          !isAirborne &&
          !tuningPhys.passives.includes('atpCore') &&
          !tuningPhys.passives.includes('offroadPass')
        ) {
          for (const mz of map.naturalMudZones) {
            if ((mz.elevation ?? 0) !== (r.elevation ?? 0)) continue;
            if (Math.hypot(r.x - mz.x, r.y - mz.y) < mz.radius * 1.05) {
              r.mudTimer = Math.max(r.mudTimer, 0.45);
            }
          }
        }

        // Dynamic Hazard 1: Jump Pads & Chasm Segments (Aligned oriented bounding box check)
        let onJumpPad = false;
        if (map.jumpPads) {
          for (const jp of map.jumpPads) {
            if ((jp.elevation ?? 0) !== (r.elevation ?? 0)) continue;
            const dx = r.x - jp.x;
            const dy = r.y - jp.y;
            const cosA = Math.cos(-jp.angle);
            const sinA = Math.sin(-jp.angle);
            const localX = dx * cosA - dy * sinA;
            const localY = dx * sinA + dy * cosA;
            const padHalfLen = jp.radius * 0.78;
            const padHalfSpan = Math.max(74, jp.radius * 0.92);
            if (Math.abs(localX) <= padHalfLen && Math.abs(localY) <= padHalfSpan) {
              onJumpPad = true;
              r.jumpTimer = 1.05;
              r.invulnerableTimer = Math.max(r.invulnerableTimer, 1.05);
              r.angularVelocity =
                (r.angularVelocity || 0) * (1 - 0.65 * tuningPhys.jumpPadStability);
              if (r.id === localPlayerId && (r.jumpTimer || 0) > 0.95) {
                soundEngine.playBoost();
              }
              break;
            }
          }
        }

        // Chasm Hazard Check: If car drives into a chasm without jumping via a Jump Pad, stun & rescue!
        if (
          !isAirborne &&
          !onJumpPad &&
          map.chasmSegments &&
          (r.glassFallCooldown || 0) <= 0
        ) {
          let fellInChasm = false;
          for (const ch of map.chasmSegments) {
            const dx = r.x - ch.x;
            const dy = r.y - ch.y;
            const cosA = Math.cos(-ch.angle);
            const sinA = Math.sin(-ch.angle);
            const localX = dx * cosA - dy * sinA;
            const localY = dx * sinA + dy * cosA;
            const chasmHalfSpan = Math.min(map.roadWidth * 0.46, ch.radius * 1.15);
            if (Math.abs(localX) < 52 && Math.abs(localY) < chasmHalfSpan) {
              fellInChasm = true;
              break;
            }
          }
          if (fellInChasm) {
            const rescued = applyCarRescue(r, map);
            Object.assign(r, rescued);
            r.stunTimer = Math.max(r.stunTimer, 1.2);
            r.glassFallCooldown = 2.0;
            r.stuckTimer = 0;
            if (r.id === localPlayerId) {
              soundEngine.playHazardHit();
              pushKillfeed(
                `🕳️ ${r.username} rơi xuống Khe Vực Sâu (-1.2s)!`,
                'trap',
                nowSec
              );
            }
            continue;
          }
        }

        // Dynamic Hazard 2: Chloroplast Solar Photosynthesis Zones (Map 8)
        if (map.solarZones && map.solarZones.length > 0) {
          let inSolar = false;
          for (const sz of map.solarZones) {
            if (Math.hypot(r.x - sz.x, r.y - sz.y) < sz.radius * 1.08) {
              inSolar = true;
              break;
            }
          }
          if (inSolar) {
            r.solarExposureTimer = (r.solarExposureTimer || 0) + dt * 1.4;
            if (r.solarExposureTimer >= 0.85) {
              r.solarExposureTimer = 0;
              if (!r.heldItem) {
                r.heldItem = 'nitro';
              }
              r.nitroCharge = 100;
              r.nitroTimer = Math.max(r.nitroTimer, 1.45);
              if (r.id === localPlayerId) {
                soundEngine.playCoin();
              }
            }
          } else if ((r.solarExposureTimer || 0) > 0) {
            r.solarExposureTimer = Math.max(
              0,
              (r.solarExposureTimer || 0) - dt * 0.35
            );
          }
        }

        // Dynamic Hazard 3: Gastric Acid Pools (Map 7 & Map 9)
        let inAcidPool = false;
        if (!isAirborne && map.acidZones) {
          for (const az of map.acidZones) {
            if (Math.hypot(r.x - az.x, r.y - az.y) < az.radius * 1.05) {
              inAcidPool = true;
              break;
            }
          }
        }

        const hasActiveNitro =
          r.nitroTimer > 0 || r.rocketStartTimer > 0 || r.isBoostingNitro;

        // When using Nitro in a mud puddle, burn off mud effect 3.5x faster!
        if (r.mudTimer > 0 && hasActiveNitro) {
          r.mudTimer = Math.max(0, r.mudTimer - dt * 2.5);
        }

        let onBoostPad = false;
        for (const bz of map.boostZones) {
          if ((bz.elevation ?? 0) !== (r.elevation ?? 0)) continue;
          if (Math.hypot(r.x - bz.x, r.y - bz.y) < bz.radius * 1.08) {
            onBoostPad = true;
            break;
          }
        }

        // Corner King Mechanism: "Tâm điểm bám đường" (Apex Grip & +8% Exit Mini-Boost)
        if (
          steerInput !== 0 &&
          Math.abs(r.speed) > 105 &&
          trackCheck.onRoad &&
          r.spinTimer <= 0 &&
          r.stunTimer <= 0
        ) {
          r.apexCurveTimer = Math.min(2.0, (r.apexCurveTimer || 0) + dt);
        } else {
          if (
            (r.apexCurveTimer || 0) >= 0.28 &&
            steerInput === 0 &&
            tuningPhys.apexExitBoostBonus > 1.0
          ) {
            r.apexBoostTimer = 0.85; // Trigger +8% speed Mini-Boost on corner exit!
          }
          r.apexCurveTimer = Math.max(0, (r.apexCurveTimer || 0) - dt * 3);
        }

        // Rebalanced Top Speed & Nitro Power:
        // maxSpeed = baseSpeed * (1 + totalTopSpeed * 0.01)
        let maxSpeed = r.isBoss
          ? Math.min(
              300,
              tuningPhys.maxSpeed *
                (raidBossDef?.id === 'minh_dang' && r.bossPhase === 2
                  ? 1.08
                  : 0.95)
            )
          : r.isInfected
          ? tuningPhys.maxSpeed * 1.06
          : r.isBot
          ? tuningPhys.maxSpeed * diffProfile.speedMul
          : tuningPhys.maxSpeed;
        if (r.isBoss && maxSpeed > 310) {
          maxSpeed = 310;
        }
        if ((r.cryoSlowTimer || 0) > 0) {
          maxSpeed *= 0.5;
        }
        if (r.nitroTimer > 0 || r.rocketStartTimer > 0) {
          maxSpeed *=
            1.35 * nitroPowerBonus * tuningPhys.nitroBoostSpeedMultiplier;
        } else if (r.isBoostingNitro) {
          maxSpeed *=
            1.22 * nitroPowerBonus * tuningPhys.nitroBoostSpeedMultiplier;
        } else if (onBoostPad || onJumpPad || isAirborne) {
          maxSpeed *= 1.34;
          if (onBoostPad && r.speed < maxSpeed) {
            r.speed = Math.min(maxSpeed, r.speed + 420 * dt);
          }
        }
        if (
          tuningPhys.hasV12Reactor &&
          steerInput === 0 &&
          Math.abs(r.speed) > tuningPhys.maxSpeed * 0.8
        ) {
          maxSpeed *= 1.06;
        }

        // Apply +8% Apex Exit Mini-Boost for Corner King builds
        if ((r.apexBoostTimer || 0) > 0) {
          maxSpeed *= tuningPhys.apexExitBoostBonus;
        }

        // Map 12: mARN Conveyor Belts (Left half of road +35% speed, Right half -35% speed)
        let onConveyorBelt = trackCheck.surfaceType === 'conveyor';
        if (!onConveyorBelt && map.conveyorBelts) {
          for (const cb of map.conveyorBelts) {
            if (
              trackCheck.nearestSegmentIdx >= cb.startIdx &&
              trackCheck.nearestSegmentIdx < cb.endIdx
            ) {
              onConveyorBelt = true;
              break;
            }
          }
        }
        if (trackCheck.onRoad && onConveyorBelt && map.conveyorBelts) {
          if (trackCheck.lateralSide < -0.04) {
            maxSpeed *= 1.35;
            r.speed = Math.min(maxSpeed, r.speed + 240 * dt);
          } else if (trackCheck.lateralSide > 0.04) {
            maxSpeed *= 0.62;
            r.speed *= Math.pow(0.32, dt);
          }
        }

        // Map 13: Cochlea Banked Acoustic Bowl (+10% speed retention in banked spiral curves)
        if (
          trackCheck.onRoad &&
          trackCheck.surfaceType === 'acoustic_bowl' &&
          (r.elevation ?? 0) === 0
        ) {
          maxSpeed *= 1.08;
        }

        // Map 15 Zone 2: Biological Tide on Ancient Submerged Stone Shortcut
        if (trackCheck.onShortcut && map.tidalZones && map.tidalZones.length > 0) {
          const tz = map.tidalZones[0];
          if (isBiologicalHighTide(nowSec, tz.periodSec ?? 5)) {
            const slowMul = tz.highTideSlowMultiplier ?? 0.4;
            const penalty = (1 - slowMul) * (1 - tuningPhys.terrainPenaltyReduction * 0.5);
            maxSpeed *= Math.max(0.4, 1 - penalty);
            if (!hasActiveNitro) {
              r.speed *= Math.pow(0.28, dt);
            }
          }
        }

        if (onJumpPad) {
          r.speed = Math.max(r.speed, maxSpeed);
        }

        // Apply Gastric Acid Pool 65% speed penalty + immediate corrosive drag
        if (inAcidPool && !tuningPhys.passives.includes('atpCore')) {
          const baseAcidPenalty = tuningPhys.passives.includes('offroadPass')
            ? 0.0
            : 0.65;
          const effectiveAcidPenalty =
            baseAcidPenalty * (1 - tuningPhys.terrainPenaltyReduction);
          maxSpeed *= Math.max(0.35, 1 - effectiveAcidPenalty);
          if (!hasActiveNitro && effectiveAcidPenalty > 0.1) {
            r.speed *= Math.pow(0.22, dt);
          }
        }

        // Off-road & Mud Bulldozer + immediate viscous mud drag
        if (
          !isAirborne &&
          r.mudTimer > 0 &&
          !tuningPhys.passives.includes('atpCore') &&
          !tuningPhys.passives.includes('offroadPass')
        ) {
          if (hasActiveNitro) {
            maxSpeed *= 0.85;
          } else {
            const effectiveMudPenalty =
              0.7 * (1 - tuningPhys.terrainPenaltyReduction);
            maxSpeed *= Math.max(0.25, 1 - effectiveMudPenalty);
            r.speed *= Math.pow(0.24, dt);
          }
        } else if (
          !isAirborne &&
          !trackCheck.onRoad &&
          !tuningPhys.passives.includes('offroadPass')
        ) {
          if (hasActiveNitro) {
            maxSpeed *= 0.85;
          } else {
            let baseGrassPenalty = 0.45;
            if (tuningPhys.passives.includes('grassPenalty')) {
              baseGrassPenalty = 0.72; // Lốp F1 đi vào cỏ bị chậm gấp đôi
            }
            const effectiveGrassPenalty =
              baseGrassPenalty * (1 - tuningPhys.terrainPenaltyReduction);
            maxSpeed *= Math.max(0.25, 1 - effectiveGrassPenalty);
          }
        }

        if (r.stunTimer > 0) {
          r.speed = 0;
          r.vx = 0;
          r.vy = 0;
        } else if (r.spinTimer > 0) {
          r.angle += 12.5 * dt;
          r.speed *= Math.pow(0.25, dt);
        } else {
          const accelScale = tuningPhys.accel / 395;
          const apexAccelMul = (r.apexBoostTimer || 0) > 0 ? 1.12 : 1.0;
          const emLaunchMul =
            tuningPhys.hasEmPulse &&
            Math.abs(r.speed) < tuningPhys.maxSpeed * 0.45
              ? 1.25
              : 1.0;
          const accelRate =
            (r.nitroTimer > 0 || r.rocketStartTimer > 0
              ? 520 * nitroPowerBonus * tuningPhys.nitroBoostSpeedMultiplier
              : r.isBoostingNitro
                ? 475 * nitroPowerBonus * tuningPhys.nitroBoostSpeedMultiplier
                : 395) *
            accelScale *
            apexAccelMul *
            emLaunchMul;
          if (accelInput > 0) {
            r.speed = Math.min(maxSpeed, r.speed + accelRate * dt);
          } else if (accelInput < 0) {
            r.speed = Math.max(-140, r.speed - 360 * accelScale * dt);
          } else {
            // Momentum retention when coasting (Heavy cars decelerate slower)
            r.speed *= Math.pow(0.25, dt * tuningPhys.momentumDecayScale);
          }

          if (r.speed > maxSpeed) {
            // Momentum retention right after Nitro ends (Heavy cars hold top speed longer)
            r.speed = Math.max(
              maxSpeed,
              r.speed - 450 * tuningPhys.momentumDecayScale * dt
            );
          }

          // Cornering Drag: Cornering Drag = 0 (corneringRetention = 1.0) when totalHandling >= 8
          // Map 13 Banked Acoustic Bowl reduces cornering drag significantly!
          const effectiveCornerRetention =
            trackCheck.surfaceType === 'acoustic_bowl'
              ? Math.min(1.0, tuningPhys.corneringRetention + 0.008)
              : tuningPhys.corneringRetention;
          if (
            steerInput !== 0 &&
            Math.abs(r.speed) > 40 &&
            effectiveCornerRetention < 1.0
          ) {
            const steerDragPower = r.isBot ? dt * 35 : dt * 60;
            r.speed *= Math.pow(effectiveCornerRetention, steerDragPower);
          }

          // Turn Speed with Steering Inertia on Nitro (low handling severely limits steering while Nitro is active)
          const rawTurnStrength = r.isBot
            ? tuningPhys.turnSpeed * diffProfile.turnMul
            : tuningPhys.turnSpeed;
          const effectiveTurnStrength = hasActiveNitro
            ? rawTurnStrength * tuningPhys.nitroTurnMultiplier
            : rawTurnStrength;
          const absSpeed = Math.abs(r.speed);
          const speedTurnFactor =
            absSpeed < 6 ? 0 : Math.min(1.0, absSpeed / 90);
          const dirSign = r.speed >= -5 ? 1 : -1;

          const targetAngularVel =
            steerInput * effectiveTurnStrength * speedTurnFactor * dirSign;
          const angularResponsiveness = isAirborne
            ? 10 * tuningPhys.jumpPadStability
            : hasActiveNitro
            ? 14 * tuningPhys.nitroInertiaGrip
            : 18;
          r.angularVelocity =
            (r.angularVelocity || 0) +
            (targetAngularVel - (r.angularVelocity || 0)) *
              Math.min(1, angularResponsiveness * dt);
          if (absSpeed >= 6) {
            r.angle += r.angularVelocity * dt;
          } else {
            r.angularVelocity = 0;
          }
        }

        r.drifting =
          Math.abs(r.speed) > 140 &&
          Math.abs(steerInput) > 0 &&
          r.spinTimer <= 0;

        // Lateral Grip: lateralGrip = clamp(0.70 + (totalHandling * 0.015), 0.60, 0.99)
        // Low-handling cars blasting Nitro suffer severe inertia understeer ("trượt như trên băng")
        const isInCryoBiome =
          map.theme === 'cryo' ||
          (r.cryoSlowTimer || 0) > 0 ||
          (map.theme === 'bioworld' &&
            trackCheck.nearestSegmentIdx >= 30 &&
            trackCheck.nearestSegmentIdx <= 39);
        const isCryoSlippery =
          isInCryoBiome &&
          (!tuningPhys.passives.includes('iceImmune') || (r.cryoSlowTimer || 0) > 0);
        const cornerSlideMultiplier = r.drifting ? 0.65 : 1.0;
        const nitroSlideFactor = hasActiveNitro
          ? tuningPhys.nitroInertiaGrip
          : 1.0;
        const effectiveLateralGrip =
          tuningPhys.lateralGrip *
          14.0 *
          cornerSlideMultiplier *
          nitroSlideFactor *
          (isCryoSlippery ? 0.38 : 1.0);
        const targetVx = Math.cos(r.angle) * r.speed;
        const targetVy = Math.sin(r.angle) * r.speed;
        const gripLerp = Math.min(1, effectiveLateralGrip * dt);
        r.vx += (targetVx - r.vx) * gripLerp;
        r.vy += (targetVy - r.vy) * gripLerp;

        // Dynamic Hazard 4: Peristaltic Crosswind Fans (Map 7 & Map 9)
        // Pushes light cars sideways toward the wall; Heavy cars resist strongly
        if (!isAirborne && map.crosswindZones) {
          const totalWeight = tuningPhys.totals.weight;
          const baseWindFactor =
            totalWeight <= 0
              ? Math.min(2.1, 1.45 - totalWeight * 0.09)
              : Math.max(0.12, 1.0 - totalWeight * 0.085);
          const windResistanceFactor =
            baseWindFactor * (tuningPhys.hasCarbonGrip ? 0.55 : 1.0);
          for (const cw of map.crosswindZones) {
            if (Math.hypot(r.x - cw.x, r.y - cw.y) < cw.radius * 1.1) {
              const windAccel = cw.strength * 1.45 * windResistanceFactor;
              r.vx += Math.cos(cw.forceAngle) * windAccel * dt;
              r.vy += Math.sin(cw.forceAngle) * windAccel * dt;
            }
          }
        }

        // Dynamic Hydraulic / tARN Pistons (2-second cycle lateral slam blockers)
        if (!isAirborne && map.tarnPistons) {
          for (const ps of map.tarnPistons) {
            const pState = getPistonState(ps, nowSec);
            if (!pState.isDangerous) continue;
            const segCheck = distanceToSegment(
              { x: r.x, y: r.y },
              pState.rodStart,
              pState.rodEnd
            );
            if (segCheck.distance < pState.halfThickness + 16) {
              const pushScale = tuningPhys.isBulldozerWeight ? 0.45 : 1.0;
              const force = (ps.pushForce ?? 580) * 1.45;
              const pushX = Math.cos(ps.angle);
              const pushY = Math.sin(ps.angle);
              r.x += pushX * 26 * pushScale;
              r.y += pushY * 26 * pushScale;
              r.vx = pushX * force * 0.48 * pushScale;
              r.vy = pushY * force * 0.48 * pushScale;
              r.speed *= tuningPhys.isBulldozerWeight ? 0.72 : 0.35;
              if (r.id === localPlayerId && (r.bumperHitCooldown || 0) <= 0) {
                r.bumperHitCooldown = 0.4;
                soundEngine.playHazardHit();
              }
              break;
            }
          }
        }

        // Guard against any non-finite velocity/position before integrating
        if (!Number.isFinite(r.vx)) r.vx = 0;
        if (!Number.isFinite(r.vy)) r.vy = 0;
        if (!Number.isFinite(r.speed)) r.speed = 0;
        if (!Number.isFinite(r.angle)) r.angle = 0;

        r.x += r.vx * dt;
        r.y += r.vy * dt;

        // Map 14: Elastic Lysosome Pinball Bumpers & Rolling Antibody Spheres (540px Macrophage Belly Arena)
        // Boss is immune to all bounce hazards and obstacles to prevent getting stuck
        if (!r.isBoss && !isAirborne && (r.elevation ?? 0) === 0) {
          if (map.pinballBumpers) {
            for (const pb of map.pinballBumpers) {
              const dx = r.x - pb.x;
              const dy = r.y - pb.y;
              const dist = Math.hypot(dx, dy);
              const minDist = pb.radius + 18;
              if (dist < minDist && dist > 0.001) {
                const nx = dx / dist;
                const ny = dy / dist;
                r.x = pb.x + nx * (minDist + 4);
                r.y = pb.y + ny * (minDist + 4);
                const bounceMul = pb.restitution ?? 1.45;
                const bounceSpeed = Math.max(260, Math.abs(r.speed) * bounceMul);
                r.vx = nx * bounceSpeed;
                r.vy = ny * bounceSpeed;
                r.speed = Math.min(tuningPhys.maxSpeed * 1.25, bounceSpeed * 0.85);
                if (r.id === localPlayerId && (r.bumperHitCooldown || 0) <= 0) {
                  r.bumperHitCooldown = 0.22;
                  soundEngine.playCoin();
                }
                break;
              }
            }
          }

          if (map.antibodySpheres) {
            for (const ab of map.antibodySpheres) {
              const pos = getAntibodySpherePosition(ab, nowSec);
              const dx = r.x - pos.x;
              const dy = r.y - pos.y;
              const dist = Math.hypot(dx, dy);
              const minDist = ab.radius + 18;
              if (dist < minDist && dist > 0.001) {
                const nx = dx / dist;
                const ny = dy / dist;
                r.x = pos.x + nx * (minDist + 4);
                r.y = pos.y + ny * (minDist + 4);
                r.vx = nx * 310;
                r.vy = ny * 310;
                if (r.id === localPlayerId && (r.bumperHitCooldown || 0) <= 0) {
                  r.bumperHitCooldown = 0.25;
                  soundEngine.playHazardHit();
                }
                break;
              }
            }
          }
        }

        // Dynamic Hazard 5: Synapse Laser Gates (Map 6 & Map 9)
        // 3s Open (Green) - 2s Closed (Red). Passing while Closed stuns for 1.5s and bounces car backward
        if (
          !r.isBoss &&
          !isAirborne &&
          r.invulnerableTimer <= 0 &&
          (r.laserHitCooldown || 0) <= 0 &&
          map.synapseGates
        ) {
          for (const gate of map.synapseGates) {
            if (!isSynapseGateClosed(nowSec, gate.phaseOffset)) continue;
            const halfW = gate.width * 0.5;
            const perpAngle = gate.angle + Math.PI / 2;
            const p1 = {
              x: gate.x + Math.cos(perpAngle) * halfW,
              y: gate.y + Math.sin(perpAngle) * halfW,
            };
            const p2 = {
              x: gate.x - Math.cos(perpAngle) * halfW,
              y: gate.y - Math.sin(perpAngle) * halfW,
            };
            const segDist = distanceToSegment({ x: r.x, y: r.y }, p1, p2).distance;
            if (segDist < 22) {
              r.stunTimer = Math.max(
                r.stunTimer,
                1.5 * tuningPhys.stunMultiplier
              );
              r.laserHitCooldown = 1.8;
              // Bounce backward opposite to current heading
              const bounceX = -Math.cos(r.angle);
              const bounceY = -Math.sin(r.angle);
              r.x += bounceX * 28;
              r.y += bounceY * 28;
              r.vx = bounceX * 165;
              r.vy = bounceY * 165;
              r.speed = -150;
              if (r.id === localPlayerId) {
                soundEngine.playHazardHit();
              }
              break;
            }
          }
        }

        // Bulldozer Tire Barrier / Obstacle Collision:
        // Cars with totalWeight >= 6 (or titanArmor) smash/slide right past roadside tire barriers without bouncing back or getting stunned!
        // Boss is immune to barrier snagging
        if (!r.isBoss && !isAirborne) {
          for (const tb of map.tireBarriers) {
            if ((tb.elevation ?? 0) !== (r.elevation ?? 0)) continue;
            const dx = r.x - tb.x;
            const dy = r.y - tb.y;
            const dist = Math.hypot(dx, dy);
            const minDist = tb.radius + 18;
            if (dist < minDist && dist > 0.001) {
              const nx = dx / dist;
              const ny = dy / dist;
              r.x = tb.x + nx * minDist;
              r.y = tb.y + ny * minDist;

              const totalWeight = tuningPhys.totals.weight;
              if (tuningPhys.isBulldozerWeight) {
                // Tank Bulldozer (totalWeight >= 6, titanArmor, or heavyBulldozer): smashes past barrier keeping 88-95% speed!
                const keepRatio = tuningPhys.hasHeavyBulldozer
                  ? 0.95
                  : Math.min(0.92, 0.85 + Math.max(0, totalWeight) * 0.005);
                r.speed = Math.max(60, r.speed * keepRatio);
                const tx = -ny;
                const ty = nx;
                const dotTangent =
                  Math.cos(r.angle) * tx + Math.sin(r.angle) * ty;
                const sign = dotTangent >= 0 ? 1 : -1;
                r.vx = (tx * sign * 0.92 + nx * 0.15) * r.speed;
                r.vy = (ty * sign * 0.92 + ny * 0.15) * r.speed;
              } else if (totalWeight > 0) {
                // Medium-heavy car (1..5 weight): loses ~25% speed and slides along tangent
                const keepRatio = Math.min(0.8, 0.68 + totalWeight * 0.02);
                r.speed = Math.max(40, r.speed * keepRatio);
                const tx = -ny;
                const ty = nx;
                const dotTangent =
                  Math.cos(r.angle) * tx + Math.sin(r.angle) * ty;
                const sign = dotTangent >= 0 ? 1 : -1;
                r.vx = (tx * sign * 0.85 + nx * 0.25) * r.speed;
                r.vy = (ty * sign * 0.85 + ny * 0.25) * r.speed;
              } else {
                // Light car (totalWeight <= 0): bounces back strongly and loses 80%+ of current speed
                const bounceScale = Math.min(210, 145 + Math.abs(totalWeight) * 12);
                const retainedMag = Math.abs(r.speed) * 0.18;
                r.vx = nx * bounceScale;
                r.vy = ny * bounceScale;
                r.speed = -retainedMag;
              }
              if (r.id === localPlayerId) soundEngine.playHazardHit();
            }
          }
        }

        // Track peak speed (km/h) and drift initiations for Podium Telemetry
        const liveKmh = Math.round(Math.abs(r.speed || 0) * 0.65);
        if (!r.maxSpeedKmh || liveKmh > r.maxSpeedKmh) {
          r.maxSpeedKmh = liveKmh;
        }
        if (r.drifting && !r._wasDrifting) {
          r.driftCount = (r.driftCount || 0) + 1;
        }
        r._wasDrifting = r.drifting;

        // Stuck detection (> 3 seconds nearly stationary or far off road)
        if (Math.hypot(r.vx, r.vy) < 25 || !trackCheck.onRoad) {
          r.stuckTimer += dt;
        } else {
          r.stuckTimer = 0;
        }

        // Boss obstacle & off-road failsafe: immediately recover Boss to road if stuck for > 0.35s
        if (r.isBoss && (r.stuckTimer > 0.35 || (!trackCheck.onRoad && r.stuckTimer > 0.2))) {
          const rescued = applyCarRescue(r, map);
          Object.assign(r, rescued);
          r.speed = 220;
          r.vx = Math.cos(rescued.angle) * 220;
          r.vy = Math.sin(rescued.angle) * 220;
          r.stuckTimer = 0;
        }

        // Item Gift Box pickup (+20 Nitro charge bonus!) on same elevation
        if (!r.heldItem) {
          for (const box of itemBoxes) {
            if (!box.active || (box.elevation ?? 0) !== (r.elevation ?? 0)) continue;
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

        // Sequential 10-Checkpoint Verification & Continuous Road-Spline Progress (Supports Closed Loop & Map 15 Point-To-Point)
        const cpResult = updateRacerCheckpointState(
          r,
          map,
          trackCheck.onShortcut,
          trackCheck.onSecretBranch
        );

        if (cpResult.lapCompleted) {
          r.waypointIndex = 1;
          r.nitroCharge = Math.min(100, r.nitroCharge + 25);
          r.useShortcutThisLap =
            deterministicBotRand(`${lobby.roomPin}_${r.id}_sc_lap${r.lap}`) <
            diffProfile.shortcutChance;
          r.isNavigatingShortcut = false;
          r.shortcutStepIndex = 0;
          if (r.id === localPlayerId) soundEngine.playCoin();

          if (map.isPointToPoint) {
            if (r.lap > lobby.laps) {
              if (isRaidBossMode && bossCar && (bossCar.bossHp ?? 1) > 0) {
                if (r.isBoss) {
                  bossCar.finished = true;
                  bossCar.finishTimeMs = Math.round(elapsedRaceSec * 1000);
                  firstFinisherElapsedSec = elapsedRaceSec;
                  pushKillfeed(
                    `💀 BOSS ĐÃ VỀ ĐÍCH TRƯỚC! NHIỆM VỤ SĂN TRÙM THẤT BẠI!`,
                    'lead',
                    nowSec
                  );
                  forceFinishTriggerRef.current = true;
                } else {
                  // Human racer crossed line while boss is alive: only won when boss dies!
                  r.lap = lobby.laps;
                  if (r.id === localPlayerId) soundEngine.playHazardHit();
                  pushKillfeed(
                    `⚠ BOSS VẪN CÒN SỐNG! PHẢI TIÊU DIỆT BOSS ĐỂ CHIẾN THẮNG!`,
                    'trap',
                    nowSec
                  );
                }
              } else {
                const justFinished = !r.finished;
                r.finished = true;
                let myFinishMs = Math.max(100, Math.round(elapsedRaceSec * 1000));
                if (justFinished && !r.finishOrder) {
                  finishCounter++;
                  r.finishOrder = finishCounter;
                  const maxFinishedBeforeMeMs = racers.reduce(
                    (maxMs, other) =>
                      other.id !== r.id &&
                      other.finished &&
                      (other.finishOrder || 999) < r.finishOrder!
                        ? Math.max(maxMs, other.finishTimeMs || 0)
                        : maxMs,
                    0
                  );
                  if (maxFinishedBeforeMeMs > 0) {
                    myFinishMs = Math.max(myFinishMs, maxFinishedBeforeMeMs + 45);
                  }
                }
                r.finishTimeMs = myFinishMs;
                if (!r.isBot && r.id === localPlayerId) {
                  multiplayerService.sendPosition(r, 0, elapsedRaceSec);
                }
                pushKillfeed(
                  `🏁 ${r.username} đã xuyên qua Cổng Nam Cực về đích!`,
                  'lap',
                  nowSec
                );
                if (firstFinisherElapsedSec === null) {
                  firstFinisherElapsedSec = elapsedRaceSec;
                }
              }
            } else {
              // Multi-lap Point-to-Point: Teleport through Cytoplasmic Portal back to North Pole Start!
              const p0 = map.waypoints[0];
              const p1 = map.waypoints[1];
              const portalAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
              r.x = p0.x;
              r.y = p0.y;
              r.angle = portalAngle;
              r.vx = Math.cos(portalAngle) * r.speed;
              r.vy = Math.sin(portalAngle) * r.speed;
              r.elevation = p0.elevation ?? 0;
              r.invulnerableTimer = 1.5;
              r.totalProgress = computeRacerTrackProgress(r, map).totalProgress;

              if (r.lap === lobby.laps && lobby.laps > 1) {
                if (
                  r.id === localPlayerId ||
                  (!localPlayerId && r.placement === 1)
                ) {
                  finalLapBannerTimer = 3.2;
                  soundEngine.playFanfare(false);
                  pushKillfeed(
                    `🌀 ${r.username} dịch chuyển về Bắc Cực bước vào CHẶNG CUỐI!`,
                    'lap',
                    nowSec
                  );
                }
              }
            }
          } else {
            // Check Final Lap entry
            if (r.lap === lobby.laps && lobby.laps > 1) {
              if (
                r.id === localPlayerId ||
                (!localPlayerId && r.placement === 1)
              ) {
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
              if (isRaidBossMode && bossCar && (bossCar.bossHp ?? 1) > 0) {
                if (r.isBoss) {
                  bossCar.finished = true;
                  bossCar.finishTimeMs = Math.round(elapsedRaceSec * 1000);
                  firstFinisherElapsedSec = elapsedRaceSec;
                  pushKillfeed(
                    `💀 BOSS ĐÃ VỀ ĐÍCH TRƯỚC! NHIỆM VỤ SĂN TRÙM THẤT BẠI!`,
                    'lead',
                    nowSec
                  );
                  forceFinishTriggerRef.current = true;
                } else {
                  // Human racer crossed line while boss is alive: only won when boss dies!
                  r.lap = lobby.laps;
                  if (r.id === localPlayerId) soundEngine.playHazardHit();
                  pushKillfeed(
                    `⚠ BOSS VẪN CÒN SỐNG! PHẢI TIÊU DIỆT BOSS ĐỂ CHIẾN THẮNG!`,
                    'trap',
                    nowSec
                  );
                }
              } else {
                const justFinished = !r.finished;
                r.finished = true;
                let myFinishMs = Math.max(100, Math.round(elapsedRaceSec * 1000));
                if (justFinished && !r.finishOrder) {
                  finishCounter++;
                  r.finishOrder = finishCounter;
                  const maxFinishedBeforeMeMs = racers.reduce(
                    (maxMs, other) =>
                      other.id !== r.id &&
                      other.finished &&
                      (other.finishOrder || 999) < r.finishOrder!
                        ? Math.max(maxMs, other.finishTimeMs || 0)
                        : maxMs,
                    0
                  );
                  if (maxFinishedBeforeMeMs > 0) {
                    myFinishMs = Math.max(myFinishMs, maxFinishedBeforeMeMs + 45);
                  }
                }
                r.finishTimeMs = myFinishMs;
                if (!r.isBot && r.id === localPlayerId) {
                  multiplayerService.sendPosition(r, 0, elapsedRaceSec);
                }
                pushKillfeed(
                  `🏁 ${r.username} đã cán đích hoàn thành chặng đua!`,
                  'lap',
                  nowSec
                );
                if (firstFinisherElapsedSec === null) {
                  firstFinisherElapsedSec = elapsedRaceSec;
                }
              }
            }
          }
        }

        const segA = map.waypoints[cpResult.activeSegmentIdx] || map.waypoints[0];
        const segB =
          map.waypoints[(cpResult.activeSegmentIdx + 1) % map.waypoints.length] ||
          map.waypoints[0];

        // Check wrong-way indicator against current constrained segment tangent
        if (trackCheck.onShortcut && map.shortcut && map.shortcut.path.length >= 2) {
          const sc = map.shortcut.path;
          const scEnd = sc[sc.length - 1];
          const scStart = sc[0];
          const scAngle = Math.atan2(scEnd.y - scStart.y, scEnd.x - scStart.x);
          const dot =
            Math.cos(r.angle) * Math.cos(scAngle) +
            Math.sin(r.angle) * Math.sin(scAngle);
          r.wrongWay = r.speed > 60 && dot < -0.45;
        } else {
          const segAngle = Math.atan2(segB.y - segA.y, segB.x - segA.x);
          const dot =
            Math.cos(r.angle) * Math.cos(segAngle) +
            Math.sin(r.angle) * Math.sin(segAngle);
          r.wrongWay = r.speed > 60 && dot < -0.45;
        }

        // Principle 3: Broadcast local player's authoritative (x, y, vx, vy, angle, speed, isNitroActive) every ~50ms (20Hz)
        if (!r.isBot && r.id === localPlayerId) {
          multiplayerService.sendPosition(r, 50, elapsedRaceSec);
        }

        const particleCullW = (width / cam.zoom) * 0.65 + 160;
        const particleCullH = (height / cam.zoom) * 0.65 + 160;

        // Spawn tire/exhaust trail particles ONLY when Nitro is active and car is near viewport
        const isNitroActive =
          r.nitroTimer > 0 || r.isBoostingNitro || r.rocketStartTimer > 0;
        if (
          isNitroActive &&
          Math.abs(r.x - cam.x) < particleCullW + 100 &&
          Math.abs(r.y - cam.y) < particleCullH + 100
        ) {
          trailPool.spawnFromCar(
            r.x,
            r.y,
            r.angle,
            Math.hypot(r.vx, r.vy),
            true,
            r.loadout.trail,
            nowSec
          );
        }
      }

      // =========================================================
      // CAR-TO-CAR MASS COLLISION PHYSICS ("XE TĂNG" HÚC VĂNG ĐỐI THỦ)
      // Only cars on the SAME elevation level (`elevation: 0` vs `elevation: 1`) collide!
      // =========================================================
      if (raceStarted && elapsedRaceSec > 0.6) {
        const collisionRadius = 28;
        for (let i = 0; i < racers.length; i++) {
          const a = racers[i];
          if (a.finished || a.invulnerableTimer > 0 || (a.jumpTimer || 0) > 0) continue;
          const physA = getRacerPhysics(a);
          const weightA = physA.totals.weight;

          for (let j = i + 1; j < racers.length; j++) {
            const b = racers[j];
            if (
              b.finished ||
              b.invulnerableTimer > 0 ||
              (b.jumpTimer || 0) > 0 ||
              (a.elevation ?? 0) !== (b.elevation ?? 0)
            ) {
              continue;
            }
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            if (Math.abs(dx) > 60 || Math.abs(dy) > 60) continue;
            const physB = getRacerPhysics(b);
            const weightB = physB.totals.weight;
            const dist = Math.hypot(dx, dy);
            const pairRadius = a.isBoss || b.isBoss ? 44 : collisionRadius;
            if (dist > 0.001 && dist < pairRadius) {
              // Bio-Infection Mode: Infected car spreads virus on contact!
              if (campaignLevel?.mode === 'infection' && (a.isInfected !== b.isInfected)) {
                const newlyInfected = a.isInfected ? b : a;
                newlyInfected.isInfected = true;
                if (!newlyInfected.username.startsWith('☣️')) {
                  newlyInfected.username = `☣️ ${newlyInfected.username}`;
                }
                pushKillfeed(
                  `☣️ ${newlyInfected.username} đã bị lây nhiễm Thực Khuẩn Thể!`,
                  'trap',
                  nowSec
                );
                if (newlyInfected.id === localPlayerId) {
                  soundEngine.playHazardHit();
                }
              }

              // Raid Boss Mode: Student Ramming Attack on Boss (100 - 250 HP!)
              if (isRaidBossMode && (a.isBoss !== b.isBoss)) {
                const studentCar = a.isBoss ? b : a;
                const theBoss = a.isBoss ? a : b;
                const studentPhys = a.isBoss ? physB : physA;
                const studentNitro =
                  studentCar.isBoostingNitro ||
                  studentCar.nitroTimer > 0 ||
                  studentCar.rocketStartTimer > 0;
                const lastRamAt = bossRamCooldownByRacer.get(studentCar.id) || 0;
                if (
                  nowSec - lastRamAt >= 0.85 &&
                  (studentNitro || studentPhys.totals.weight >= 1 || Math.abs(studentCar.speed) > 220)
                ) {
                  bossRamCooldownByRacer.set(studentCar.id, nowSec);
                  const ramDmg = calculateBossRammingDamage(
                    studentPhys.totals.weight,
                    studentNitro
                  );
                  applyDamageToBoss(ramDmg, studentCar.id, studentCar.username);
                  spawnRocketExplosion(
                    (studentCar.x + theBoss.x) * 0.5,
                    (studentCar.y + theBoss.y) * 0.5,
                    studentCar.id === localPlayerId
                  );
                  pushKillfeed(
                    `💥 ${studentCar.username} HÚC TRỰC DIỆN BOSS (-${ramDmg} HP)!`,
                    'rocket',
                    nowSec
                  );
                }
              }

              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = pairRadius - dist;

              const weightDiff = weightA - weightB;
              if (Math.abs(weightDiff) >= 3) {
                // Heavier car ("Tank") knocks lighter car away while retaining ~90% of its own speed & heading!
                const heavy = weightDiff > 0 ? a : b;
                const light = weightDiff > 0 ? b : a;
                const physHeavy = weightDiff > 0 ? physA : physB;
                const physLight = weightDiff > 0 ? physB : physA;
                const dirSign = weightDiff > 0 ? 1 : -1;
                const absDiff = Math.min(24, Math.abs(weightDiff));
                const knockImpulse =
                  (95 + absDiff * 11) *
                  (physHeavy.hasHeavyBulldozer ? 1.4 : 1.0) *
                  (physLight.hasCarbonGrip ? 0.5 : 1.0);

                // Separate positions mostly pushing the lighter car
                heavy.x -= nx * dirSign * overlap * 0.15;
                heavy.y -= ny * dirSign * overlap * 0.15;
                light.x += nx * dirSign * overlap * 0.85;
                light.y += ny * dirSign * overlap * 0.85;

                // Heavier car retains ~90% speed
                heavy.speed *= 0.9;
                heavy.vx = Math.cos(heavy.angle) * heavy.speed;
                heavy.vy = Math.sin(heavy.angle) * heavy.speed;

                // Lighter car gets knocked sideways/away and loses speed
                const lightSpeedScale = Math.max(0.45, 0.72 - absDiff * 0.015);
                light.speed *= lightSpeedScale;
                const impVx = nx * dirSign * knockImpulse;
                const impVy = ny * dirSign * knockImpulse;
                light.vx += impVx;
                light.vy += impVy;

                if (
                  heavy.id === localPlayerId &&
                  !light.isBot &&
                  multiplayerService.isConnected()
                ) {
                  multiplayerService.sendCollisionBump({
                    targetId: light.id,
                    attackerId: heavy.id,
                    attackerName: heavy.username,
                    vxImpulse: impVx,
                    vyImpulse: impVy,
                    speedScale: lightSpeedScale,
                  });
                }
              } else {
                // Equal-weight bump
                a.x -= nx * overlap * 0.5;
                a.y -= ny * overlap * 0.5;
                b.x += nx * overlap * 0.5;
                b.y += ny * overlap * 0.5;
                a.vx -= nx * 45;
                a.vy -= ny * 45;
                b.vx += nx * 45;
                b.vy += ny * 45;

                if (
                  (a.id === localPlayerId || b.id === localPlayerId) &&
                  multiplayerService.isConnected()
                ) {
                  const other = a.id === localPlayerId ? b : a;
                  const sign = a.id === localPlayerId ? 1 : -1;
                  if (!other.isBot) {
                    multiplayerService.sendCollisionBump({
                      targetId: other.id,
                      attackerId: localPlayerId!,
                      attackerName:
                        (a.id === localPlayerId ? a : b).username,
                      vxImpulse: nx * 45 * sign,
                      vyImpulse: ny * 45 * sign,
                      speedScale: 0.92,
                    });
                  }
                }
              }
            }
          }
        }
      }

      if (finalLapBannerTimer > 0) {
        finalLapBannerTimer = Math.max(0, finalLapBannerTimer - dt);
      }

      justPressed.clear();

      // Sort live placements
      const sortedByProgress = [...racers].sort((a, b) => {
        if (a.finished && b.finished) {
          if (a.finishOrder && b.finishOrder && a.finishOrder !== b.finishOrder) {
            return a.finishOrder - b.finishOrder;
          }
          return a.finishTimeMs - b.finishTimeMs;
        }
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

      // Check 60-second (1 minute) post-finish countdown, all players finished, or Teacher finish signal
      const allFinished = racers.every((r) => r.finished);
      const timeSinceFirstFinish =
        firstFinisherElapsedSec !== null
          ? elapsedRaceSec - firstFinisherElapsedSec
          : 0;

      if (
        (firstFinisherElapsedSec !== null && timeSinceFirstFinish >= 60) ||
        allFinished ||
        forceFinishTriggerRef.current
      ) {
        forceFinishTriggerRef.current = false;
        // Save Ghost Car recording if in Time Trial mode and localPlayer completed the run
        if (
          campaignLevel?.mode === 'time_trial' &&
          ghostStorageKey &&
          currentRunGhostFrames.length > 10
        ) {
          try {
            localStorage.setItem(
              ghostStorageKey,
              JSON.stringify(currentRunGhostFrames.slice(0, 1200))
            );
          } catch {}
        }
        sortedByProgress.forEach((r, idx) => {
          r.placement = idx + 1;
          if (!r.finished) {
            r.finished = true;
            r.finishTimeMs = Math.round((elapsedRaceSec + idx * 1.5) * 1000);
          }
        });
        isReplayPhase = true;
        replayTimer = 0;
        setHudState((prev) => ({
          ...prev,
          inReplayMode: true,
          top5List: sortedByProgress.slice(0, 5).map((r) => ({
            id: r.id,
            username: r.username,
            placement: r.placement,
            lap: Math.min(lobby.laps, r.lap),
          })),
        }));
        return;
      }

      // Determine Camera Target, Dynamic Nitro Zoom-Out & Engine Shake
      const localPlayer =
        racers.find((r) => r.id === localPlayerId) || sortedByProgress[0];

      if (localPlayer && !isTeacher) {
        const rawSpeed = typeof localPlayer.speed === 'number' && Number.isFinite(localPlayer.speed) ? localPlayer.speed : 0;
        soundEngine.updateEngineHum(
          Math.abs(rawSpeed) / 335,
          Boolean(localPlayer.nitroTimer > 0 || localPlayer.isBoostingNitro)
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
      // RENDER WORLD TO MAIN CANVAS (HIGH-DPI + 2-LEVEL OVERPASS)
      // =========================================================
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = map.bgColor;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(
        Math.floor(width / 2 + shakeX),
        Math.floor(height / 2 + shakeY)
      );
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-Math.floor(cam.x), -Math.floor(cam.y));

      // PASS 1: Ground & Level 0 Track + Level 0 Hazards & Item Boxes
      drawRaceTrack(ctx, map, itemBoxes, hazards, nowSec);
      trailPool.updateAndDraw(ctx, dt);

      // Update & Draw Light Rocket Explosion Effects
      for (let eIdx = rocketExplosions.length - 1; eIdx >= 0; eIdx--) {
        const exp = rocketExplosions[eIdx];
        exp.timer -= dt;
        if (exp.timer <= 0) {
          rocketExplosions.splice(eIdx, 1);
          continue;
        }
        const progress = 1 - exp.timer / exp.maxTimer;
        const alpha = Math.max(0, 1 - progress);
        const ringRadius = 10 + progress * 44;

        ctx.save();
        // Soft outer shockwave ring
        ctx.strokeStyle = `rgba(251, 146, 60, ${(alpha * 0.85).toFixed(2)})`;
        ctx.lineWidth = Math.max(1, 3.2 * alpha);
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Warm orange-red glow halo
        ctx.fillStyle = `rgba(239, 68, 68, ${(alpha * 0.38).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, 26 * (1 - progress * 0.3), 0, Math.PI * 2);
        ctx.fill();

        // Bright core flash
        ctx.fillStyle = `rgba(254, 240, 138, ${(alpha * 0.78).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, 14 * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();

        // 8 light radial spark lines
        ctx.strokeStyle = `rgba(254, 240, 138, ${(alpha * 0.9).toFixed(2)})`;
        ctx.lineWidth = 1.6;
        for (let s = 0; s < 8; s++) {
          const sAngle = (s / 8) * Math.PI * 2 + progress * 0.4;
          const rIn = 8 + progress * 22;
          const rOut = rIn + 8 * alpha;
          ctx.beginPath();
          ctx.moveTo(
            exp.x + Math.cos(sAngle) * rIn,
            exp.y + Math.sin(sAngle) * rIn
          );
          ctx.lineTo(
            exp.x + Math.cos(sAngle) * rOut,
            exp.y + Math.sin(sAngle) * rOut
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      const cullHalfW = (width / cam.zoom) * 0.65 + 160;
      const cullHalfH = (height / cam.zoom) * 0.65 + 160;

      const nightHeadlightsOn = isNightMapTheme(map.theme);

      // Draw ATP Slalom Orbs & Purple Toxin Spheres (`atp_rush`)
      if (campaignLevel?.mode === 'atp_rush' && atpOrbs.length > 0) {
        for (const orb of atpOrbs) {
          if (!orb.active) continue;
          ctx.save();
          ctx.translate(orb.x, orb.y);
          const pulse = 1 + Math.sin(nowSec * 6 + orb.x * 0.05) * 0.14;
          ctx.scale(pulse, pulse);
          if (orb.isToxin) {
            ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#9333EA';
            ctx.strokeStyle = '#F0ABFC';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 10px "Orbitron", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('☠', 0, 0);
          } else {
            ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FACC15';
            ctx.strokeStyle = '#FEF08A';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#090D16';
            ctx.font = '900 8px "Orbitron", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('ATP', 0, 0);
          }
          ctx.restore();
        }
      }

      // Draw Boss Cryo-Nova & ATP Lightning Visual Shockwaves
      if (isRaidBossMode && bossCar) {
        if (bossCryoWaveVisualTimer > 0) {
          const prog = 1 - bossCryoWaveVisualTimer / 1.25;
          const rad = 40 + prog * 310;
          ctx.save();
          ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - prog).toFixed(2)})`;
          ctx.fillStyle = `rgba(125, 211, 252, ${((1 - prog) * 0.25).toFixed(2)})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(bossCar.x, bossCar.y, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        if (bossLightningVisualTimer > 0) {
          const prog = 1 - bossLightningVisualTimer / 1.15;
          ctx.save();
          ctx.strokeStyle = `rgba(250, 204, 21, ${(1 - prog).toFixed(2)})`;
          ctx.lineWidth = 3.5;
          for (let b = 0; b < 8; b++) {
            const a = (b / 8) * Math.PI * 2 + nowSec * 6;
            ctx.beginPath();
            ctx.moveTo(bossCar.x, bossCar.y);
            ctx.lineTo(
              bossCar.x + Math.cos(a) * 160,
              bossCar.y + Math.sin(a + 0.15) * 160
            );
            ctx.lineTo(
              bossCar.x + Math.cos(a) * 320,
              bossCar.y + Math.sin(a) * 320
            );
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      const drawCarsAtElevation = (targetElevation: number) => {
        const isUpperLayer = targetElevation === 1;

        // Draw Recorded Ghost Car (`alpha = 0.45`) in Time Trial mode
        if (
          campaignLevel?.mode === 'time_trial' &&
          savedGhostFrames.length > 0 &&
          elapsedRaceSec >= 0 &&
          localPlayer
        ) {
          const gIdx = Math.min(
            savedGhostFrames.length - 1,
            Math.max(0, Math.floor(elapsedRaceSec * 10))
          );
          const gf = savedGhostFrames[gIdx];
          if (gf && (gf.elevation ?? 0) === targetElevation) {
            drawModularCar(ctx, localPlayer.loadout, {
              x: gf.x,
              y: gf.y,
              angle: gf.angle,
              nowSec,
              alpha: 0.45,
              username: '👻 BÓNG MA KỶ LỤC',
              isPlayer: false,
            });
          }
        }

        // Draw Rival/Ghost/Boss Cars at targetElevation
        for (const r of racers) {
          if (r.id === localPlayer?.id || r.eliminated) continue;
          if ((r.elevation ?? 0) !== targetElevation) continue;
          if (
            Math.abs(r.x - cam.x) > cullHalfW ||
            Math.abs(r.y - cam.y) > cullHalfH
          ) {
            continue;
          }
          const isRemoteHuman = Boolean(multiplayerService.getRemoteRacer(r.id));
          const rTitleDef = getPlayerTitleById(r.equippedTitle);
          ctx.save();
          if (isUpperLayer) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.beginPath();
            ctx.ellipse(r.x + 10, r.y + 14, 24, 15, r.angle, 0, Math.PI * 2);
            ctx.fill();
            ctx.translate(r.x, r.y);
            ctx.scale(1.08, 1.08);
            ctx.translate(-r.x, -r.y);
          }
          ctx.globalAlpha = r.isBoss || isRemoteHuman ? 1.0 : 0.88;
          drawModularCar(ctx, r.loadout, {
            x: r.x,
            y: r.y,
            angle: r.angle,
            scale: r.scale || 1,
            nowSec,
            drifting: r.drifting,
            nitroActive: r.nitroTimer > 0 || r.isBoostingNitro,
            rocketStartActive: r.rocketStartTimer > 0,
            invulnerableBlink: r.invulnerableTimer > 0,
            username: isRemoteHuman ? `🟢 ${r.username}` : r.username,
            teamId: lobby.raceMode === 'team' ? r.teamId : undefined,
            isPlayer: isRemoteHuman || r.isBoss,
            showHeadlightBeams: nightHeadlightsOn,
            equippedTitle: r.equippedTitle || null,
            hasDragonAura: r.hasDragonAura,
            isBoss: r.isBoss,
            bossId: r.bossId,
            bossPhase: r.bossPhase,
            bossShieldActive: r.bossShieldActive,
            bossStunTimer: r.bossStunTimer,
            isInfected: r.isInfected,
            cryoSlowTimer: r.cryoSlowTimer,
          });
          ctx.restore();
        }

        // Draw Local Player Car if at targetElevation
        if (localPlayer && (localPlayer.elevation ?? 0) === targetElevation) {
          const localTitleDef = getPlayerTitleById(localPlayer.equippedTitle);
          ctx.save();
          if (isUpperLayer) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
            ctx.beginPath();
            ctx.ellipse(
              localPlayer.x + 11,
              localPlayer.y + 15,
              26,
              16,
              localPlayer.angle,
              0,
              Math.PI * 2
            );
            ctx.fill();
            ctx.translate(localPlayer.x, localPlayer.y);
            ctx.scale(1.09, 1.09);
            ctx.translate(-localPlayer.x, -localPlayer.y);
          }

          ctx.fillStyle = isUpperLayer
            ? 'rgba(56, 189, 248, 0.22)'
            : 'rgba(250, 204, 21, 0.12)';
          ctx.beginPath();
          ctx.arc(localPlayer.x, localPlayer.y, 19, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = isUpperLayer
            ? 'rgba(250, 204, 21, 0.75)'
            : 'rgba(250, 204, 21, 0.35)';
          ctx.lineWidth = isUpperLayer ? 2.4 : 1.8;
          ctx.beginPath();
          ctx.arc(localPlayer.x, localPlayer.y, 19, 0, Math.PI * 2);
          ctx.stroke();

          drawModularCar(ctx, localPlayer.loadout, {
            x: localPlayer.x,
            y: localPlayer.y,
            angle: localPlayer.angle,
            scale: localPlayer.scale || 1,
            nowSec,
            drifting: localPlayer.drifting,
            nitroActive: localPlayer.nitroTimer > 0 || localPlayer.isBoostingNitro,
            rocketStartActive: localPlayer.rocketStartTimer > 0,
            invulnerableBlink: localPlayer.invulnerableTimer > 0,
            username: localPlayer.username,
            teamId: lobby.raceMode === 'team' ? localPlayer.teamId : undefined,
            isPlayer: true,
            isLocalPlayer: true,
            showHeadlightBeams: nightHeadlightsOn,
            equippedTitle: localPlayer.equippedTitle || null,
            hasDragonAura: localPlayer.hasDragonAura,
            isInfected: localPlayer.isInfected,
            cryoSlowTimer: localPlayer.cryoSlowTimer,
          });
          ctx.restore();

          // World-space floating status hint when Local Player is in mud (zero DOM layout shift)
          if (localPlayer.mudTimer > 0) {
            const isPoweringThrough =
              localPlayer.isBoostingNitro ||
              localPlayer.nitroTimer > 0 ||
              localPlayer.rocketStartTimer > 0;
            ctx.save();
            ctx.font = '900 10px "Plus Jakarta Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const badgeText = isPoweringThrough
              ? '⚡ NITRO VƯỢT BÙN'
              : 'GIỮ [SHIFT] VƯỢT BÙN';
            const textW = ctx.measureText(badgeText).width + 14;
            const bx = localPlayer.x - textW / 2;
            const by = localPlayer.y - 48;
            ctx.fillStyle = isPoweringThrough
              ? 'rgba(8, 47, 73, 0.9)'
              : 'rgba(69, 26, 3, 0.9)';
            ctx.strokeStyle = isPoweringThrough ? '#38BDF8' : '#F59E0B';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(bx, by - 9, textW, 18, 5);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = isPoweringThrough ? '#7DD3FC' : '#FEF08A';
            ctx.fillText(badgeText, localPlayer.x, by);
            ctx.restore();
          }
        }
      };

      // Draw Level 0 Cars (Underpass / Ground Level)
      drawCarsAtElevation(0);

      // PASS 2: Overpass Bridges (`elevation: 1`) with 3D Girders, Support Pillars & Drop Shadow
      drawOverpassOverlay(ctx, map, itemBoxes, hazards, nowSec);

      // PASS 2.5: Underpass X-Ray Hologram Silhouette for Level 0 Cars currently underneath a Bridge!
      // Proves the car is physically UNDER the bridge (covered by Pass 2 deck) while keeping steering 100% visible!
      for (const r of racers) {
        if ((r.elevation ?? 0) !== 0) continue;
        if (
          Math.abs(r.x - cam.x) > cullHalfW ||
          Math.abs(r.y - cam.y) > cullHalfH
        ) {
          continue;
        }
        if (!isCarUnderOverpassBridge({ x: r.x, y: r.y }, r.elevation, map)) {
          continue;
        }
        const isLocal = r.id === localPlayer?.id;
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.angle);

        // Dashed Cyan/Yellow X-Ray Chassis Hologram Contour
        ctx.fillStyle = isLocal
          ? 'rgba(56, 189, 248, 0.28)'
          : 'rgba(148, 163, 184, 0.22)';
        ctx.strokeStyle = isLocal ? '#38BDF8' : '#94A3B8';
        ctx.lineWidth = isLocal ? 2.5 : 1.8;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.roundRect(-22, -12, 44, 24, 6);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // Forward heading chevron inside the X-Ray silhouette
        ctx.strokeStyle = isLocal ? '#FEF08A' : '#E2E8F0';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-4, -7);
        ctx.lineTo(10, 0);
        ctx.lineTo(-4, 7);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Level 1 Cars (On top of Overpass Bridges)
      drawCarsAtElevation(1);

      ctx.restore();

      // =========================================================
      // SCREEN-SPACE OVERLAY 0.5: MAP 15 ZONE 3 LIGHT FOG OF WAR
      // Soft bioluminescent mist when driving through the Villi Forest (500 <= y <= 2200),
      // kept subtle so the road markings and directional arrows remain 100% clear.
      // =========================================================
      if (
        map.fogOfWar &&
        activeFocusCar &&
        cameraModeRef.current !== 'overview' &&
        activeFocusCar.y >= 500 &&
        activeFocusCar.y <= 2200
      ) {
        const fogStrength =
          activeFocusCar.y < 800
            ? (activeFocusCar.y - 500) / 300
            : activeFocusCar.y > 1900
            ? (2200 - activeFocusCar.y) / 300
            : 1.0;
        ctx.save();
        const fogGrad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.5,
          210,
          width * 0.5,
          height * 0.5,
          Math.max(width, height) * 0.68
        );
        fogGrad.addColorStop(0, 'rgba(3, 18, 28, 0)');
        fogGrad.addColorStop(
          0.6,
          `rgba(6, 40, 52, ${(0.18 * fogStrength).toFixed(2)})`
        );
        fogGrad.addColorStop(
          1,
          `rgba(2, 16, 25, ${(0.38 * fogStrength).toFixed(2)})`
        );
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

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

      // Render Corner Minimap (Auto-scaling for Map 1 -> Map 15, including variable width, 2-level overpasses & Point-to-Point)
      const miniCanvas = minimapRef.current;
      if (miniCanvas) {
        const mCtx = miniCanvas.getContext('2d');
        if (mCtx) {
          mCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
          const miniTf = computeMinimapTransform(
            map,
            miniCanvas.width,
            miniCanvas.height,
            10 * dpr
          );
          mCtx.save();
          mCtx.translate(miniCanvas.width / 2, miniCanvas.height / 2);
          mCtx.scale(miniTf.scale, miniTf.scale);
          mCtx.translate(-miniTf.centerX, -miniTf.centerY);

          // Draw Secret Branches on Minimap if present
          if (map.secretBranches) {
            for (const br of map.secretBranches) {
              if (br.path.length < 2) continue;
              mCtx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
              mCtx.lineWidth = Math.max(br.width * 0.6, 3 / miniTf.scale);
              mCtx.beginPath();
              mCtx.moveTo(br.path[0].x, br.path[0].y);
              for (let i = 1; i < br.path.length; i++) {
                mCtx.lineTo(br.path[i].x, br.path[i].y);
              }
              mCtx.stroke();
            }
          }

          // Draw Shortcut / Split-Path on Minimap if present
          if (map.shortcut && map.shortcut.path.length >= 2) {
            mCtx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
            mCtx.lineWidth = Math.max(map.roadWidth * 0.5, 3.5 / miniTf.scale);
            mCtx.beginPath();
            mCtx.moveTo(map.shortcut.path[0].x, map.shortcut.path[0].y);
            for (let i = 1; i < map.shortcut.path.length; i++) {
              mCtx.lineTo(map.shortcut.path[i].x, map.shortcut.path[i].y);
            }
            mCtx.stroke();
          }

          mCtx.lineCap = 'round';
          mCtx.lineJoin = map.theme === 'ribosome' ? 'miter' : 'round';
          const segCount = map.isPointToPoint
            ? Math.max(0, map.waypoints.length - 1)
            : map.waypoints.length;

          // Pass 1: Level 0 segments on Minimap
          for (let i = 0; i < segCount; i++) {
            const a = map.waypoints[i];
            const b = map.waypoints[(i + 1) % map.waypoints.length];
            const isOverpass = (a.elevation ?? 0) === 1 && (b.elevation ?? 0) === 1;
            if (isOverpass) continue;
            const segW = ((a.width ?? map.roadWidth) + (b.width ?? map.roadWidth)) * 0.5;
            mCtx.strokeStyle = '#7A9A75';
            mCtx.lineWidth = Math.max(segW * 0.65, 5 / miniTf.scale);
            mCtx.beginPath();
            mCtx.moveTo(a.x, a.y);
            mCtx.lineTo(b.x, b.y);
            mCtx.stroke();
          }

          // Pass 2: Level 1 Overpass segments on Minimap (brighter cyan/gold highlight)
          for (let i = 0; i < segCount; i++) {
            const a = map.waypoints[i];
            const b = map.waypoints[(i + 1) % map.waypoints.length];
            const isOverpass = (a.elevation ?? 0) === 1 && (b.elevation ?? 0) === 1;
            if (!isOverpass) continue;
            const segW = ((a.width ?? map.roadWidth) + (b.width ?? map.roadWidth)) * 0.5;
            mCtx.strokeStyle = '#38BDF8';
            mCtx.lineWidth = Math.max(segW * 0.65, 5.5 / miniTf.scale);
            mCtx.beginPath();
            mCtx.moveTo(a.x, a.y);
            mCtx.lineTo(b.x, b.y);
            mCtx.stroke();
          }

          const localDotR = (5.2 * dpr) / miniTf.scale;
          const botDotR = (3.4 * dpr) / miniTf.scale;
          for (const r of racers) {
            const isLocal = r.id === localPlayer?.id;
            mCtx.fillStyle = isLocal ? '#FACC15' : '#E2E8F0';

            mCtx.save();
            mCtx.translate(r.x, r.y);

            // Draw dot
            mCtx.beginPath();
            mCtx.arc(0, 0, isLocal ? localDotR : botDotR, 0, Math.PI * 2);
            mCtx.fill();

            // Draw orientation arrow for all cars
            mCtx.rotate(r.angle);
            mCtx.fillStyle = isLocal ? '#FFFFFF' : '#94A3B8';
            const arrowTip = isLocal ? 11 / miniTf.scale : 6.5 / miniTf.scale;
            const arrowBase = isLocal ? 4 / miniTf.scale : 2.5 / miniTf.scale;
            const arrowWing = isLocal ? 3.6 / miniTf.scale : 2.2 / miniTf.scale;
            mCtx.beginPath();
            mCtx.moveTo(arrowTip, 0);
            mCtx.lineTo(arrowBase, -arrowWing);
            mCtx.lineTo(arrowBase, arrowWing);
            mCtx.closePath();
            mCtx.fill();

            mCtx.restore();
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
        if (elapsedRaceSec < 5) {
          watermarkAlpha = 1.0;
        } else if (elapsedRaceSec < 6.5) {
          watermarkAlpha = 1.0 * (1 - (elapsedRaceSec - 5) / 1.5);
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
              ? Math.max(0, Math.ceil(60 - timeSinceFirstFinish))
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
          bossHud:
            isRaidBossMode && bossCar && raidBossDef
              ? {
                  active: true,
                  name: raidBossDef.name,
                  title: raidBossDef.title,
                  icon: raidBossDef.badgeIcon,
                  hp: Math.max(0, Math.round(bossCar.bossHp ?? bossMaxHp)),
                  maxHp: bossCar.bossMaxHp || bossMaxHp,
                  knockdowns: bossCar.bossKnockdowns || 0,
                  stunTimer: Number((bossCar.bossStunTimer || 0).toFixed(1)),
                  shieldActive: Boolean(bossCar.bossShieldActive),
                  phase: bossCar.bossPhase || 1,
                  skillCooldownSec: Math.ceil(bossCar.bossSkillCooldown || 0),
                  skillReady: (bossCar.bossSkillCooldown || 0) <= 0 && (bossCar.bossStunTimer || 0) <= 0,
                  skillName: raidBossDef.skillName,
                  isEasyBossController: isEasyBossHost,
                }
              : null,
          campaignHud: campaignLevel
            ? {
                levelNumber: campaignLevel.level,
                title: campaignLevel.title,
                mode: campaignLevel.mode,
                modeBanner:
                  campaignLevel.mode === 'classic'
                    ? '🏁 ĐUA CỔ ĐIỂN'
                    : campaignLevel.mode === 'time_trial'
                    ? '⏱️ TÍNH GIỜ & BÓNG MA'
                    : campaignLevel.mode === 'atp_rush'
                    ? '🎯 THU THẬP ATP'
                    : campaignLevel.mode === 'elimination'
                    ? '💀 VÒNG ĐUA SINH TỒN'
                    : '☣️ ĐẠI DỊCH THỰC KHUẨN THỂ',
                statusText:
                  campaignLevel.mode === 'time_trial'
                    ? `Mục tiêu: ≤ ${campaignLevel.targetTimeSec}s (${Math.max(0, elapsedRaceSec).toFixed(1)}s)`
                    : campaignLevel.mode === 'atp_rush'
                    ? `ATP: ${focus?.atpCollected || 0}/${campaignLevel.targetAtpCount || 25} hạt`
                    : campaignLevel.mode === 'elimination'
                    ? `Loại xe cuối sau: ${Math.max(0, Math.ceil(campaignModeTimer))}s`
                    : campaignLevel.mode === 'infection'
                    ? `Sống sót còn: ${Math.max(0, Math.ceil(campaignModeTimer))}s`
                    : `Mục tiêu: Về đích Top 1 - 3`,
                timerSec:
                  campaignLevel.mode === 'elimination' ||
                  campaignLevel.mode === 'infection' ||
                  campaignLevel.mode === 'atp_rush'
                    ? Math.max(0, Math.ceil(campaignModeTimer))
                    : null,
              }
            : null,
          fps: rollingFps,
          pingMs: multiplayerService.getPingMs(),
        });
        // Save mid-race checkpoint snapshot every ~0.55s so accidental F5 reload can resume seamlessly
        resumeSaveAccum += 0.11;
        if (resumeSaveAccum >= 0.55 && localPlayer && !localPlayer.finished && !isReplayPhase) {
          resumeSaveAccum = 0;
          try {
            sessionStorage.setItem(
              'tripled_active_race_resume_v1',
              JSON.stringify({
                savedAt: Date.now(),
                roomPin: lobby.roomPin,
                mapId: map.id,
                playerId: localPlayer.id,
                lobbySnapshot: lobby,
                elapsedRaceSec,
                racerState: {
                  x: localPlayer.x,
                  y: localPlayer.y,
                  vx: localPlayer.vx,
                  vy: localPlayer.vy,
                  angle: localPlayer.angle,
                  speed: localPlayer.speed,
                  lap: localPlayer.lap,
                  currentCheckpoint: localPlayer.currentCheckpoint,
                  visitedCheckpointsMask: localPlayer.visitedCheckpointsMask,
                  waypointIndex: localPlayer.waypointIndex,
                  totalProgress: localPlayer.totalProgress,
                  nitroCharge: localPlayer.nitroCharge,
                  heldItem: localPlayer.heldItem,
                  elevation: localPlayer.elevation ?? 0,
                },
              })
            );
          } catch {}
        }
      }
    };

    animId = requestAnimationFrame(loop);

    // Background Tab Ticker: when tab is minimized/hidden, browsers pause requestAnimationFrame.
    // This 16Hz background ticker keeps race clock, bot physics, and position sync alive without queuing duplicate RAF callbacks!
    const bgIntervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        loop(performance.now(), true);
      }
    }, 62);

    // Screen Wake Lock: keep phone/tablet/laptop screen from dimming or sleeping during active race
    let wakeLockSentinel: any = null;
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      (navigator as any).wakeLock
        .request('screen')
        .then((s: any) => {
          wakeLockSentinel = s;
        })
        .catch(() => {});
    }

    // Clean up race session immediately on page close or reload (treat as match exit)
    const onBeforeUnload = () => {
      try {
        sessionStorage.removeItem('tripled_active_race_resume_v1');
        multiplayerService.leaveRoom(localPlayerId || undefined);
      } catch {}
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      completedCallbackFired = true;
      cancelAnimationFrame(animId);
      clearInterval(bgIntervalId);
      if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') {
        wakeLockSentinel.release().catch(() => {});
      }
      soundEngine.stopEngineHum();
      soundEngine.stopBGM();
      multiplayerService.clearRaceCaches();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    localPlayerId,
    isTeacher,
    lobby.playModeCategory,
    lobby.raidBossModeEnabled,
    lobby.raidBossId,
    lobby.campaignLevelNumber,
    lobby.mapId,
    lobby.roomPin,
  ]);

  return (
    <div
      data-testid="race-canvas-root"
      className="race-canvas-root fixed inset-0 w-screen h-screen overflow-hidden bg-[#1E261D] select-none"
    >
      {/* Isolated 60 FPS Full-Viewport Canvas */}
      <canvas
        ref={canvasRef}
        data-testid="race-canvas"
        className="w-full h-full block"
      />

      {/* World-Matched Low-Occlusion HUD Wrapper */}
      {!hudState.inReplayMode && (
        <div className="in-race-hud fixed inset-0 pointer-events-none flex flex-col justify-between p-4">
          {/* Top Row: Left Telemetry Cluster + Center Finish Timer + Right Teacher/Utility Controls */}
          <div className="flex items-start justify-between gap-4">
            {/* Top-Left Cluster: Placement, Lap, Held Item Slot (Compact) */}
            <div className="flex items-center gap-3.5 bg-[#020617]/90 border border-slate-800 rounded-2xl px-4 py-2 shadow-xl backdrop-blur-md">
              <div className="pr-3.5 border-r border-slate-800">
                <div className="text-[10px] font-black text-[#FACC15] uppercase tracking-[0.18em] mb-0.5">
                  VỊ TRÍ
                </div>
                <div className="font-mono-num text-4xl font-black text-white leading-none">
                  {hudState.placement}
                  <span className="text-sm text-slate-400 font-bold ml-1 opacity-70">
                    /{hudState.totalRacers}
                  </span>
                </div>
              </div>

              <div className="pr-3.5 border-r border-slate-800">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] mb-0.5">
                  VÒNG ĐUA
                </div>
                <div className="font-mono-num text-2xl font-black text-white leading-none">
                  {hudState.lap}
                  <span className="text-xs text-slate-400 font-bold ml-1 opacity-70">
                    /{hudState.totalLaps}
                  </span>
                </div>
              </div>

              {/* Item Slot */}
              <div className="flex flex-col items-center gap-0.5 pl-0.5">
                <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-[#F59E0B] flex items-center justify-center text-xl shadow-[0_0_14px_rgba(245,158,11,0.2)]">
                  {hudState.heldItem ? ITEM_INFO[hudState.heldItem].icon : '🎲'}
                </div>
                <div className="text-[8px] font-black text-[#FACC15] uppercase tracking-wider opacity-80">
                  [SPACE]
                </div>
              </div>

              {multiplayerService.isConnected() && (
                <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-[10px] font-black shrink-0 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  P2P
                </div>
              )}
            </div>

            {/* Center Alert Banner: Boss HP Bar, Campaign Mode Status, 60s Finish Countdown or Wrong Way */}
            <div className="flex flex-col items-center gap-2 max-w-xl w-full">
              {hudState.bossHud && (
                <div
                  data-testid="raid-boss-hp-hud"
                  className="w-full max-w-lg px-4 py-2.5 rounded-2xl bg-[#050814]/92 border-2 border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.4)] backdrop-blur-md pointer-events-auto"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base">{hudState.bossHud.icon}</span>
                      <span className="font-sci font-black text-xs sm:text-sm text-white truncate">
                        {hudState.bossHud.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-400/50 text-[9px] font-black text-rose-300 uppercase shrink-0">
                        {hudState.bossHud.phase === 2 ? '🔥 PHASE 2 CUỒNG NỘ' : hudState.bossHud.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[10px] font-mono-num font-black text-[#FACC15]">
                        Sập nguồn: {hudState.bossHud.knockdowns}/3
                      </span>
                      <span className="font-mono-num text-xs font-black text-rose-200">
                        {hudState.bossHud.hp.toLocaleString()} / {hudState.bossHud.maxHp.toLocaleString()} HP
                      </span>
                    </div>
                  </div>

                  {/* HP Progress Bar */}
                  <div className="relative w-full h-3.5 rounded-full bg-slate-950 border border-rose-500/40 overflow-hidden p-0.5">
                    <div
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, (hudState.bossHud.hp / Math.max(1, hudState.bossHud.maxHp)) * 100)
                        )}%`,
                      }}
                      className={`h-full rounded-full transition-all duration-200 ${
                        hudState.bossHud.stunTimer > 0
                          ? 'bg-gradient-to-r from-cyan-400 to-sky-500 animate-pulse'
                          : hudState.bossHud.shieldActive
                          ? 'bg-gradient-to-r from-pink-500 via-fuchsia-400 to-rose-400'
                          : 'bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400'
                      }`}
                    />
                  </div>

                  {/* Boss Status & Easy Boss Weapon Controller Button */}
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] font-bold">
                    {hudState.bossHud.stunTimer > 0 ? (
                      <span className="text-cyan-300 font-black animate-bounce">
                        ⚡ BOSS ĐANG SẬP NGUỒN ({hudState.bossHud.stunTimer}s) — HÃY PHÓNG VƯỢT QUA!
                      </span>
                    ) : hudState.bossHud.shieldActive ? (
                      <span className="text-pink-300 font-black">
                        🌸 KHIÊN HỒNG NGỌC ĐANG BẬT — BẮN TRÚNG ĐỂ PHÁ HỒI MÁU!
                      </span>
                    ) : (
                      <span className="text-slate-300">
                        💥 Nhặt Vũ Khí (-150 HP) hoặc Húc Boss (-250 HP) · <b className="text-amber-300">Chỉ Thắng Khi Boss Chết!</b>
                      </span>
                    )}

                    {hudState.bossHud.isEasyBossController && (
                      <button
                        type="button"
                        onClick={() => {
                          manualBossSkillTriggerRef.current = true;
                        }}
                        disabled={!hudState.bossHud.skillReady}
                        className={`px-2.5 py-1 rounded-lg font-sci font-black text-[10px] uppercase tracking-wider cursor-pointer transition-all shrink-0 ${
                          hudState.bossHud.skillReady
                            ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                        }`}
                      >
                        {hudState.bossHud.skillReady
                          ? `⚡ XẢ CHIÊU BOSS [SPACE]`
                          : `Hồi chiêu: ${hudState.bossHud.skillCooldownSec}s`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {hudState.campaignHud && (
                <div
                  data-testid="solo-campaign-hud"
                  className="px-4 py-1.5 rounded-2xl bg-[#050814]/90 border border-amber-400/50 shadow-xl backdrop-blur-md flex items-center gap-3"
                >
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-[10px] font-sci font-black text-[#FACC15]">
                    CẤP {hudState.campaignHud.levelNumber} • {hudState.campaignHud.modeBanner}
                  </span>
                  <span className="text-xs font-extrabold text-white">
                    {hudState.campaignHud.statusText}
                  </span>
                </div>
              )}

              {hudState.finishCountdownSec !== null && (
                <div className="px-5 py-2.5 rounded-xl bg-slate-900/95 border-2 border-[#F59E0B] text-center shadow-2xl backdrop-blur-md flex flex-col items-center gap-1.5 pointer-events-auto">
                  <div className="text-xs font-bold text-[#FEF08A] flex items-center gap-1.5">
                    <Flag className="w-4 h-4 text-[#FACC15]" />
                    <span>TOP 1 ĐÃ VỀ ĐÍCH! ĐẾM NGƯỢC KẾT THÚC (60 GIÂY):</span>
                  </div>
                  <div className="font-mono-num text-2xl font-black text-white">
                    {hudState.finishCountdownSec} GIÂY
                  </div>
                  {isSoloOrOffline && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        forceFinishTriggerRef.current = true;
                      }}
                      className="mt-1 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg cursor-pointer flex items-center gap-2 uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 border border-amber-300"
                      title="Kết thúc và xem bảng tổng kết xếp hạng ngay lập tức mà không cần đợi 60 giây"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>⚡ Tổng Kết Kết Quả Ngay</span>
                    </button>
                  )}
                </div>
              )}

              {(hudState.wrongWay || hudState.stuckWarning) && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md border text-[11px] font-bold tracking-wide shadow-lg ${
                    hudState.wrongWay
                      ? 'bg-red-950/85 border-red-400/60 text-red-200'
                      : 'bg-slate-900/85 border-amber-400/60 text-amber-200'
                  }`}
                >
                  <span>{hudState.wrongWay ? '↺ Ngược chiều' : '⚠ Lệch đường'}</span>
                  <span className="opacity-50">·</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-white font-black text-[10px] leading-none">
                    R
                  </kbd>
                  <span>đặt lại</span>
                </div>
              )}
            </div>

            {/* Top-Right Cluster: Live FPS + Ping HUD + Teacher Powers + Pause / Finish Controls */}
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
              <div className="flex items-center gap-2">
                {/* Real-time FPS & Network Latency (ms) HUD Widget */}
                <div
                  data-testid="live-fps-ping-hud"
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#020617]/90 border border-slate-700/80 shadow-xl backdrop-blur-md text-[11px] font-mono-num font-bold text-slate-300"
                  title="Tốc độ khung hình (FPS) & Trạng thái mạng (Ping ms)"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        hudState.fps >= 50
                          ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                          : hudState.fps >= 30
                          ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                          : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                      } animate-pulse`}
                    />
                    <span className="text-white font-black">{hudState.fps || 60}</span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest">
                      FPS
                    </span>
                  </div>
                  <span className="text-slate-700 font-normal">|</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        hudState.pingMs <= 60
                          ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                          : hudState.pingMs <= 120
                          ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                          : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                      }`}
                    />
                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">
                      {multiplayerService.isConnected() ? 'NET' : 'PING'}
                    </span>
                    <span className="text-white font-black">{hudState.pingMs || 14}</span>
                    <span className="text-[9px] text-slate-400 lowercase tracking-wider">
                      ms
                    </span>
                  </div>
                </div>

                {isTeacher && (
                  <>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        forceFinishTriggerRef.current = true;
                        multiplayerService.broadcast({ type: 'FORCE_FINISH' });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-300/40 font-black text-[11px] shadow-lg cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                      title="Kết thúc chặng đua ngay lập tức cho toàn bộ phòng đấu"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Kết Thúc Đua</span>
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        supplyDropTriggerRef.current = true;
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#F59E0B] hover:bg-[#FBBF24] text-[#1E261D] font-black text-[11px] shadow-lg cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Tiếp Tế</span>
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
                      className="px-2.5 py-1.5 rounded-lg bg-[#4A6046] hover:bg-[#5B7556] text-white border border-white/10 font-black text-[11px] cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>
                        {cameraMode === 'overview'
                          ? 'Toàn Cảnh'
                          : cameraMode === 'leader'
                          ? 'Top 1'
                          : 'Học Sinh'}
                      </span>
                    </button>
                    {cameraMode === 'spectate' && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          setSpectateIdx((i) => i + 1);
                        }}
                        className="px-2 py-1.5 rounded-lg bg-[#1E261D] hover:bg-[#2B3729] text-[#FDE047] border border-white/10 text-[11px] font-black cursor-pointer inline-flex items-center justify-center gap-1 leading-none uppercase tracking-wider"
                      >
                        <span>HS Tiếp</span>
                        <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    )}
                  </>
                )}

                {isSoloOrOffline && !isTeacher && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      forceFinishTriggerRef.current = true;
                    }}
                    className={`px-2.5 py-1.5 rounded-lg font-black text-[11px] shadow-lg cursor-pointer flex items-center gap-1.5 uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 ${
                      hudState.finishCountdownSec !== null
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 animate-pulse border border-amber-300'
                        : 'bg-emerald-700 hover:bg-emerald-600 text-emerald-100 border border-emerald-400/40'
                    }`}
                    title={
                      hudState.finishCountdownSec !== null
                        ? 'Tổng kết kết quả ngay lập tức thay vì đợi 60 giây'
                        : 'Kết thúc sớm chặng đua và xem bảng tổng kết xếp hạng'
                    }
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>{hudState.finishCountdownSec !== null ? '⚡ Tổng Kết Ngay' : 'Kết Thúc Sớm'}</span>
                  </button>
                )}

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onTogglePause();
                  }}
                  aria-label="Tạm dừng"
                  className="px-2.5 py-1.5 rounded-lg bg-[#0F172A]/90 hover:bg-[#1E293B] text-slate-100 border border-white/15 text-[11px] font-black cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shadow-md backdrop-blur-md transition-colors"
                >
                  <Pause className="w-3 h-3 text-amber-400" />
                  <span>Tạm Dừng</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onExitRace();
                  }}
                  aria-label="Thoát"
                  className="px-3 py-1.5 rounded-lg bg-red-950/90 hover:bg-red-900 text-red-200 border border-red-500/40 text-[11px] font-black cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shadow-md backdrop-blur-md transition-colors"
                >
                  <LogOut className="w-3 h-3 text-red-300" />
                  <span>Thoát</span>
                </button>
              </div>

              {/* Ultra-Compact Live Top 5 Standings (BXH) + Minimap (Radar) */}
              <div className="flex items-start gap-1.5 mt-0.5 pointer-events-none">
                <div className="bg-[#050B18]/90 border border-white/15 rounded-lg px-2.5 py-1.5 w-36 shadow-xl backdrop-blur-md">
                  <div className="font-black text-slate-300 mb-1 text-[9px] uppercase tracking-wider flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>BXH Top 5</span>
                  </div>
                  {hudState.top5List.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-0.5 border-b border-white/[0.06] last:border-0"
                    >
                      <span className="truncate max-w-[96px] text-slate-100 font-bold text-[11px] leading-tight">
                        {item.placement}. {item.username}
                      </span>
                      <span className="text-amber-400/90 font-black text-[9px] uppercase shrink-0 ml-1 font-mono-num">
                        L{item.lap}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="relative p-1 rounded-lg bg-[#050B18]/90 border border-white/15 shadow-xl backdrop-blur-md">
                  <canvas
                    ref={minimapRef}
                    width={144}
                    height={116}
                    className="w-[144px] h-[116px] rounded-md opacity-95 block"
                  />
                  <div className="absolute top-1.5 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 border border-white/15">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[8px] font-black text-slate-200 uppercase tracking-wider">
                      Map
                    </span>
                  </div>
                </div>
              </div>

              {/* Compact Live Event Killfeed Ticker (Max 2 recent events) */}
              {hudState.killfeed.length > 0 && (
                <div
                  data-testid="race-killfeed"
                  className="flex flex-col items-end gap-1 mt-1 max-w-[235px] pointer-events-none"
                >
                  {hudState.killfeed.slice(0, 2).map((ev) => {
                    return (
                      <div
                        key={ev.id}
                        className="px-2.5 py-1 rounded-md bg-[#050B18]/90 backdrop-blur-md border border-white/15 text-[10px] font-bold text-slate-100 shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-right-4 duration-300 leading-tight"
                      >
                        <span
                          className={`w-1.5 h-2.5 rounded-full shrink-0 ${
                            ev.category === 'rocket' ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
                          }`}
                        />
                        <span className="truncate max-w-[205px]">{ev.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Center Countdown, Final Lap & Rocket Start Banners */}
          {hudState.countdownText && (
            <div 
              className={`self-center ${hudState.countdownText === 'GO!' ? 'mt-[25vh]' : 'my-auto'} text-center transition-opacity duration-700`}
              style={{ opacity: (hudState.countdownText === 'GO!' && elapsedRaceSecRef.current > 0.7) ? 0 : 1 }}
            >
              <div className={`font-display font-black text-[#FACC15] drop-shadow-[0_8px_20px_rgba(0,0,0,1)] ${hudState.countdownText === 'GO!' ? 'text-5xl' : 'text-8xl'}`}>
                {hudState.countdownText}
              </div>
            </div>
          )}

          {/* Rocket Start Hint: only show during 3..2..1, hide once race starts */}
          {elapsedRaceSecRef.current < 0 && (
            <div className="fixed bottom-[18vh] left-1/2 -translate-x-1/2 text-[11px] font-black text-amber-200 bg-slate-950/40 backdrop-blur-xl px-6 py-2 rounded-full border border-white/5 shadow-2xl animate-pulse uppercase tracking-[0.2em] pointer-events-none z-30">
              ⚡ Rocket Start: Nhấn [W] khi GO!
            </div>
          )}

          {hudState.rocketStartBanner && (
            <div className="self-center px-8 py-3 rounded-full bg-sky-900/40 backdrop-blur-xl border border-sky-400/30 text-sky-300 font-black text-xl shadow-[0_0_40px_rgba(56,189,248,0.2)] uppercase tracking-[0.25em] animate-bounce">
              ⚡ ROCKET START
            </div>
          )}

          {hudState.finalLapBanner && !hudState.countdownText && (
            <div
              data-testid="final-lap-banner"
              className="self-center my-auto px-12 py-4 rounded-full bg-red-900/40 backdrop-blur-2xl border border-red-500/30 text-center shadow-[0_0_60px_rgba(239,68,68,0.2)] animate-pulse"
            >
              <div className="font-display text-3xl font-black text-red-100 tracking-[0.3em] uppercase">
                VÒNG CUỐI
              </div>
            </div>
          )}

          {/* Bottom Row: Left Ghost Watermark + Center Rear Threat Radar + Right Real-Life Automotive Speedometer & Nitro Cluster */}
          <div className="flex items-end justify-end gap-4 w-full">
            {hudState.ghostWatermarkOpacity > 0.01 ? (
              <div
                style={{ opacity: hudState.ghostWatermarkOpacity }}
                className="fixed bottom-0 left-0 p-5 pt-4 bg-[#050B18]/95 border-r border-t border-slate-700/80 text-white transition-opacity duration-300 shadow-2xl z-20 rounded-tr-3xl backdrop-blur-md"
              >
                <div className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.25em]">
                  ĐIỀU KHIỂN
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <kbd className="w-7 h-7 rounded bg-slate-800 text-amber-300 border border-slate-600 border-b-2 border-b-slate-950 flex items-center justify-center font-black text-xs shadow">W</kbd>
                      <kbd className="w-7 h-7 rounded bg-slate-800 text-amber-300 border border-slate-600 border-b-2 border-b-slate-950 flex items-center justify-center font-black text-xs shadow">S</kbd>
                    </div>
                    <span className="text-[12px] font-bold text-slate-200">Tiến / Lùi & Phanh</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <kbd className="w-7 h-7 rounded bg-slate-800 text-amber-300 border border-slate-600 border-b-2 border-b-slate-950 flex items-center justify-center font-black text-xs shadow">A</kbd>
                      <kbd className="w-7 h-7 rounded bg-slate-800 text-amber-300 border border-slate-600 border-b-2 border-b-slate-950 flex items-center justify-center font-black text-xs shadow">D</kbd>
                    </div>
                    <span className="text-[12px] font-bold text-slate-200">Bẻ lái & Drift sạc Nitro</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 h-7 rounded bg-slate-800 text-sky-300 border border-slate-600 border-b-2 border-b-slate-950 flex items-center justify-center font-black text-[10px] shadow">SHIFT</kbd>
                    <span className="text-[12px] font-bold text-slate-200">Kích hoạt Nitro</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-4 h-7 rounded bg-slate-800 text-amber-300 border border-slate-600 border-b-2 border-b-slate-950 flex items-center justify-center font-black text-[10px] shadow">SPACE</kbd>
                    <span className="text-[12px] font-bold text-slate-200">Dùng Vật Phẩm</span>
                  </div>
                </div>
              </div>
            ) : (
              <div />
            )}

            {/* Tactical Warning Layer (Top Center) */}
            <div className="fixed top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none z-40">
              {hudState.incomingRocket && (
                <div
                  data-testid="rocket-warning-banner"
                  className="px-5 py-2.5 rounded-2xl bg-black/90 border border-red-500/80 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-bounce flex items-center gap-3 scale-75"
                >
                  <span className="text-xl">🚀</span>
                  <div className="text-left">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1 text-red-400">
                      TÊN LỬA ĐANG TỚI
                    </div>
                    <div className="font-mono-num text-base font-black flex items-center gap-2">
                      <span>{hudState.incomingRocket.distanceMeters}m</span>
                      {hudState.incomingRocket.direction === 'left' ? (
                        <ArrowLeft className="w-4 h-4 stroke-[4]" />
                      ) : hudState.incomingRocket.direction === 'right' ? (
                        <ArrowRight className="w-4 h-4 stroke-[4]" />
                      ) : (
                        <ArrowDown className="w-4 h-4 stroke-[4]" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {hudState.rearThreats.length > 0 && (
                <div
                  data-testid="rear-proximity-arrows"
                  className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-black/90 border border-slate-800 shadow-2xl backdrop-blur-md scale-90"
                >
                  {hudState.rearThreats.slice(0, 1).map((th) => (
                    <div
                      key={th.id}
                      className="inline-flex items-center gap-2 text-red-500"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="font-black text-xs uppercase">ĐỐI THỦ ÁP SÁT</span>
                      <span className="text-white font-mono-num text-xs">{th.distanceMeters}m</span>
                    </div>
                  ))}
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

      {/* Luxury Esports Broadcast Slow-Motion Replay Overlay */}
      {hudState.inReplayMode && (
        <div
          className="fixed inset-0 z-[55] pointer-events-none select-none flex flex-col justify-between overflow-hidden animate-in fade-in duration-300"
          style={{ fontFamily: "'Rajdhani', 'Be Vietnam Pro', sans-serif" }}
        >
          {/* Top Broadcast Header Bar */}
          <div className="relative w-full bg-gradient-to-b from-[#040711]/95 via-[#090F24]/88 to-transparent pt-3 pb-7 px-4 sm:px-8 border-b border-amber-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.85)]">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
              {/* Left: Live Replay Camera Indicator */}
              <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-slate-950/90 border border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.25)]">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-5" />
                <span
                  className="text-[11px] sm:text-xs font-black tracking-[0.2em] text-rose-400 uppercase"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}
                >
                  REPLAY • 0.5X SLOW-MO
                </span>
              </div>

              {/* Center: Grand Finish Championship Title */}
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-2">
                  <span className="h-[1px] w-6 sm:w-12 bg-gradient-to-r from-transparent to-amber-400" />
                  <span
                    className="text-[10px] sm:text-xs font-black uppercase tracking-[0.28em] text-amber-300"
                    style={{ fontFamily: "'Orbitron', 'Be Vietnam Pro', sans-serif" }}
                  >
                    KHOẢNH KHẮC VỀ ĐÍCH HOÀNG KIM
                  </span>
                  <span className="h-[1px] w-6 sm:w-12 bg-gradient-to-l from-transparent to-amber-400" />
                </div>
                <h2
                  className="mt-0.5 text-lg sm:text-2xl md:text-3xl font-black uppercase tracking-wider bg-gradient-to-r from-amber-200 via-yellow-400 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_2px_18px_rgba(245,158,11,0.55)]"
                  style={{ fontFamily: "'Orbitron', 'Be Vietnam Pro', sans-serif" }}
                >
                  👑 TOP 1 VÔ ĐỊCH: {hudState.top5List[0]?.username || 'NHÀ VÔ ĐỊCH'}
                </h2>
              </div>

              {/* Right: Finish Telemetry Pill */}
              <div className="hidden sm:flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-950/85 border border-cyan-400/40 text-cyan-300 text-xs font-black tracking-widest uppercase">
                <span>🏁 TRIPLE D OPEN CUP</span>
              </div>
            </div>
          </div>

          {/* Center Viewfinder Corner Brackets */}
          <div className="relative flex-1 mx-6 sm:mx-14 my-2 pointer-events-none">
            <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-amber-400/60 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-amber-400/60 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-amber-400/60 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-amber-400/60 rounded-br-lg" />
          </div>

          {/* Bottom Broadcast Letterbox Bar with Progress Line */}
          <div className="relative w-full bg-gradient-to-t from-[#040711]/95 via-[#090F24]/85 to-transparent pt-6 pb-3.5 px-6 border-t border-amber-500/25">
            <div className="max-w-4xl mx-auto flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-bold tracking-widest uppercase text-slate-300">
                <span className="text-amber-300 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  PHA BỨT TỐC CÁN ĐÍCH • CAMERA GÓC CẬN CẢNH
                </span>
                <span className="text-cyan-300 font-mono">ĐANG TỔNG HỢP BỤC PODIUM...</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800/90 overflow-hidden p-[1px] border border-slate-700/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-cyan-400 shadow-[0_0_12px_rgba(250,204,21,0.8)]"
                  style={{
                    width: '100%',
                    animation: 'replayProgressFill 2.6s linear forwards',
                  }}
                />
              </div>
            </div>
          </div>
          <style>{`
            @keyframes replayProgressFill {
              0% { width: 0%; }
              100% { width: 100%; }
            }
          `}</style>
        </div>
      )}

      {/* Redesigned High-Performance Racing Pause Modal Overlay */}
      {isPaused && (
        <div className={`fixed inset-0 z-[60] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 pointer-events-auto select-none animate-in fade-in duration-300 ${showSettingsModal ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="relative w-full max-w-sm overflow-hidden rounded-[1.5rem] bg-[#0F172A] border-2 border-slate-700 shadow-[0_40px_100px_rgba(0,0,0,0.9)]">
            {/* Animated Background Accents */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent" />
            
            <div className="p-8 sm:p-10 space-y-8 text-center">
              {/* Header */}
              <div className="space-y-1">
                <h2 className="text-6xl font-black tracking-tighter text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                  PAUSED
                </h2>
                <div className="text-[10px] font-black tracking-[0.3em] text-[#FACC15] uppercase">
                  Chặng Đua Tạm Dừng
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-6">
                <button
                  type="button"
                  onClick={onTogglePause}
                  className="group relative w-full py-4.5 bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0F172A] font-black text-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-[0_8px_25px_rgba(245,158,11,0.4)] rounded-xl"
                >
                  <Play className="w-6 h-6 fill-current" />
                  <span>TIẾP TỤC ĐUA</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playCoin();
                    setShowSettingsModal(true);
                  }}
                  className="w-full py-4 bg-[#1E293B] hover:bg-[#2D3A4F] border border-slate-700 text-white font-bold text-base flex items-center justify-center gap-3 transition-all cursor-pointer rounded-xl"
                >
                  <Settings className="w-5 h-5 text-[#FACC15]" />
                  <span>CÀI ĐẶT PHÍM</span>
                </button>

                {canEndRaceEarly && (
                  <button
                    type="button"
                    onClick={() => {
                      onTogglePause();
                      forceFinishTriggerRef.current = true;
                    }}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base flex items-center justify-center gap-3 transition-all cursor-pointer rounded-xl shadow-[0_8px_25px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-95"
                  >
                    <Flag className="w-5 h-5 text-white" />
                    <span>KẾT THÚC SỚM & TỔNG KẾT</span>
                  </button>
                )}

                <div className="pt-6 border-t border-slate-800">
                  {!showExitConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowExitConfirm(true)}
                      className="w-full py-3 text-slate-500 hover:text-red-400 font-black text-[12px] uppercase tracking-[0.2em] transition-colors cursor-pointer border border-transparent hover:border-red-900/30 rounded-lg"
                    >
                      THOÁT CHẶNG ĐUA (0 XU)
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2">
                      <div className="text-[11px] font-black text-red-400 uppercase tracking-widest">Bạn chắc chắn muốn thoát?</div>
                      <div className="flex gap-2">
                        <button
                          onClick={onExitRace}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-lg cursor-pointer shadow-lg"
                        >
                          XÁC NHẬN THOÁT
                        </button>
                        <button
                          onClick={() => setShowExitConfirm(false)}
                          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg cursor-pointer"
                        >
                          HỦY
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hint */}
              <div className="text-[9px] text-slate-600 font-bold uppercase tracking-widest pt-2">
                Nhấn [P] hoặc [ESC] để quay lại
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <SettingsModal
            onClose={() => setShowSettingsModal(false)}
            isTeacher={isTeacher}
          />
        </div>
      )}
    </div>
  );
};

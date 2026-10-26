import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Camera,
  Car,
  Check,
  ChevronDown,
  Coins,
  Compass,
  Cpu,
  Disc,
  Eye,
  Flame,
  Gauge,
  HelpCircle,
  Layers,
  Lock,
  Palette,
  RotateCcw,
  Save,
  Search,
  Shield,
  Sparkles,
  Sun,
  SunMedium,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  ALL_PARTS,
  ALL_TUNING_PARTS,
  DEFAULT_TUNING_LOADOUT,
  EMPTY_TUNING_PRESETS,
  PHYSICS_STAT_DESCRIPTIONS,
  SLOT_LABELS,
  SUGGESTED_PLAYSTYLE_PRESETS,
  type SuggestedPlaystylePreset,
  TUNING_SLOT_LABELS,
} from '../game/constants';
import { drawModularCar } from '../game/carRenderer';
import { isTypingInInput } from '../game/keyboard';
import {
  calculateCarClass,
  calculateTuningPhysics,
  calculateTuningSummary,
  normalizeTuningPresets,
} from '../game/rules';
import {
  CarLoadout,
  MAX_TUNING_CP,
  PartItem,
  PartSlot,
  StudentAccount,
  TuningLoadout,
  TuningPartItem,
  TuningPreset,
  TuningSlot,
} from '../game/types';
import { soundEngine } from '../services/sound';
import { LiveTuningTrack } from './LiveTuningTrack';
import { PartThumbnail, RANK_AURA_PALETTE } from './PartThumbnail';

type TuningTier = TuningPartItem['tier'];

const SLOT_VECTOR_ICONS: Record<PartSlot, React.FC<{ className?: string }>> = {
  chassis: Car,
  paint: Palette,
  decal: Layers,
  wheels: Disc,
  spoiler: Wind,
  underglow: Sun,
  trail: Flame,
};

type StageBackdrop = 'cyberpunk' | 'showroom' | 'night_circuit';

const BACKDROP_META: Record<
  StageBackdrop,
  { label: string; sub: string; Icon: React.FC<{ className?: string }> }
> = {
  cyberpunk: {
    label: 'Cyberpunk Neon',
    sub: 'Lưới ánh sáng & hào quang số',
    Icon: Sparkles,
  },
  showroom: {
    label: 'Showroom Đẳng Cấp',
    sub: 'Ánh sáng studio tối giản & sàn phản chiếu',
    Icon: SunMedium,
  },
  night_circuit: {
    label: 'Đường Đua Đêm',
    sub: 'Mặt đường đua midnight & vạch đích',
    Icon: Compass,
  },
};

const CAMERA_PRESETS = [
  { label: '3/4 Nghiêng', angle: -0.38 },
  { label: 'Cạnh Ngang', angle: Math.PI / 2 },
  { label: 'Chính Diện', angle: 0 },
  { label: 'Phía Sau', angle: Math.PI },
];

const STAGE_TIER_PALETTES: Record<
  PartItem['tier'],
  {
    bgGradient: string;
    borderColor: string;
    glowColor: string;
    podiumRing: string;
    spotlightColor: string;
    dustColor: string;
  }
> = {
  SSS: {
    bgGradient:
      'radial-gradient(circle at 50% 38%, #451b03 0%, #260f02 45%, #0f0601 100%)',
    borderColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    podiumRing: '#fbbf24',
    spotlightColor: 'rgba(251, 191, 36, 0.32)',
    dustColor: '#fef08a',
  },
  SS: {
    bgGradient:
      'radial-gradient(circle at 50% 38%, #3f0828 0%, #230416 45%, #0e0109 100%)',
    borderColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    podiumRing: '#f472b6',
    spotlightColor: 'rgba(244, 114, 182, 0.32)',
    dustColor: '#fbcfe8',
  },
  S: {
    bgGradient:
      'radial-gradient(circle at 50% 38%, #3d2003 0%, #201001 45%, #0d0600 100%)',
    borderColor: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.45)',
    podiumRing: '#facc15',
    spotlightColor: 'rgba(250, 204, 21, 0.30)',
    dustColor: '#fef08a',
  },
  A: {
    bgGradient:
      'radial-gradient(circle at 50% 38%, #2e084c 0%, #19042b 45%, #0c0215 100%)',
    borderColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    podiumRing: '#c084fc',
    spotlightColor: 'rgba(192, 132, 252, 0.30)',
    dustColor: '#e9d5ff',
  },
  B: {
    bgGradient:
      'radial-gradient(circle at 50% 38%, #04243b 0%, #021422 45%, #010a11 100%)',
    borderColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.42)',
    podiumRing: '#38bdf8',
    spotlightColor: 'rgba(56, 189, 248, 0.28)',
    dustColor: '#bae6fd',
  },
  C: {
    bgGradient:
      'radial-gradient(circle at 50% 38%, #032b21 0%, #021611 45%, #010a08 100%)',
    borderColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.42)',
    podiumRing: '#34d399',
    spotlightColor: 'rgba(52, 211, 153, 0.28)',
    dustColor: '#a7f3d0',
  },
  D: {
    bgGradient:
      'radial-gradient(circle at 50% 38%, #0f172a 0%, #090d18 45%, #05070c 100%)',
    borderColor: '#64748b',
    glowColor: 'rgba(148, 163, 184, 0.35)',
    podiumRing: '#94a3b8',
    spotlightColor: 'rgba(148, 163, 184, 0.24)',
    dustColor: '#cbd5e1',
  },
};

const TUNING_SLOT_ICONS: Record<TuningSlot, React.FC<{ className?: string }>> = {
  engine: Cpu,
  tires: Disc,
  body: Shield,
  nitro: Zap,
};

const TUNING_SLOTS_ORDER: TuningSlot[] = ['engine', 'tires', 'body', 'nitro'];

// Requirement #1 & #3: Distinct Visual Hierarchy per Tuning Tier (D gray, C green, B blue, A purple, S gold/amber)
const TUNING_TIER_VISUALS: Record<
  TuningTier,
  {
    color: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    cardBg: string;
    cardBorder: string;
    hoverShadow: string;
    passiveBg: string;
    passiveBorder: string;
    passiveText: string;
    label: string;
  }
> = {
  D: {
    color: '#94a3b8',
    badgeBg: 'rgba(148, 163, 184, 0.16)',
    badgeText: '#cbd5e1',
    badgeBorder: 'rgba(148, 163, 184, 0.45)',
    cardBg: 'linear-gradient(155deg, rgba(15, 23, 42, 0.92), rgba(10, 16, 32, 0.95))',
    cardBorder: 'rgba(148, 163, 184, 0.28)',
    hoverShadow: '0 10px 26px rgba(0, 0, 0, 0.65), 0 0 14px rgba(148, 163, 184, 0.22)',
    passiveBg: 'rgba(30, 41, 59, 0.65)',
    passiveBorder: 'rgba(148, 163, 184, 0.4)',
    passiveText: '#e2e8f0',
    label: 'Cơ Bản',
  },
  C: {
    color: '#34d399',
    badgeBg: 'rgba(52, 211, 153, 0.16)',
    badgeText: '#6ee7b7',
    badgeBorder: 'rgba(52, 211, 153, 0.5)',
    cardBg: 'linear-gradient(155deg, rgba(6, 42, 36, 0.55), rgba(10, 16, 32, 0.95))',
    cardBorder: 'rgba(52, 211, 153, 0.35)',
    hoverShadow: '0 10px 28px rgba(0, 0, 0, 0.7), 0 0 18px rgba(52, 211, 153, 0.28)',
    passiveBg: 'rgba(6, 78, 59, 0.45)',
    passiveBorder: 'rgba(52, 211, 153, 0.45)',
    passiveText: '#a7f3d0',
    label: 'Phổ Thông',
  },
  B: {
    color: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.18)',
    badgeText: '#7dd3fc',
    badgeBorder: 'rgba(56, 189, 248, 0.55)',
    cardBg: 'linear-gradient(155deg, rgba(12, 38, 72, 0.65), rgba(10, 16, 32, 0.95))',
    cardBorder: 'rgba(56, 189, 248, 0.42)',
    hoverShadow: '0 12px 30px rgba(0, 0, 0, 0.75), 0 0 20px rgba(56, 189, 248, 0.34)',
    passiveBg: 'rgba(12, 74, 110, 0.45)',
    passiveBorder: 'rgba(56, 189, 248, 0.5)',
    passiveText: '#bae6fd',
    label: 'Cao Cấp',
  },
  A: {
    color: '#a78bfa',
    badgeBg: 'rgba(167, 139, 250, 0.2)',
    badgeText: '#ddd6fe',
    badgeBorder: 'rgba(167, 139, 250, 0.65)',
    cardBg: 'linear-gradient(155deg, rgba(46, 22, 84, 0.62), rgba(13, 20, 40, 0.96))',
    cardBorder: 'rgba(167, 139, 250, 0.52)',
    hoverShadow: '0 14px 32px rgba(0, 0, 0, 0.8), 0 0 24px rgba(167, 139, 250, 0.42)',
    passiveBg: 'rgba(76, 29, 149, 0.42)',
    passiveBorder: 'rgba(167, 139, 250, 0.6)',
    passiveText: '#ede9fe',
    label: 'Tinh Anh',
  },
  S: {
    color: '#fbbf24',
    badgeBg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.28), rgba(245, 158, 11, 0.18))',
    badgeText: '#fef08a',
    badgeBorder: 'rgba(251, 191, 36, 0.8)',
    cardBg: 'linear-gradient(155deg, rgba(66, 36, 8, 0.66), rgba(15, 24, 46, 0.96))',
    cardBorder: 'rgba(251, 191, 36, 0.65)',
    hoverShadow: '0 14px 36px rgba(0, 0, 0, 0.85), 0 0 28px rgba(251, 191, 36, 0.48)',
    passiveBg: 'rgba(120, 53, 15, 0.48)',
    passiveBorder: 'rgba(251, 191, 36, 0.65)',
    passiveText: '#fef08a',
    label: 'Tối Thượng',
  },
};

const STAT_META: Record<
  'topSpeed' | 'accel' | 'handling' | 'nitro' | 'weight',
  {
    shortLabel: string;
    fullLabel: string;
    color: string;
    barGradient: string;
    Icon: React.FC<{ className?: string }>;
  }
> = {
  topSpeed: {
    shortLabel: 'Tốc độ',
    fullLabel: 'Tốc độ tối đa',
    color: '#22d3ee',
    barGradient: 'from-[#0891b2] to-[#22d3ee]',
    Icon: Gauge,
  },
  accel: {
    shortLabel: 'Gia tốc',
    fullLabel: 'Gia tốc bứt phá',
    color: '#fbbf24',
    barGradient: 'from-[#d97706] to-[#fbbf24]',
    Icon: Zap,
  },
  handling: {
    shortLabel: 'Độ cua',
    fullLabel: 'Khả năng cua / Grip',
    color: '#34d399',
    barGradient: 'from-[#059669] to-[#34d399]',
    Icon: Compass,
  },
  nitro: {
    shortLabel: 'Nitro',
    fullLabel: 'Hiệu suất Nitro',
    color: '#a78bfa',
    barGradient: 'from-[#7c3aed] to-[#a78bfa]',
    Icon: Flame,
  },
  weight: {
    shortLabel: 'Cân nặng',
    fullLabel: 'Cân nặng & Giáp',
    color: '#38bdf8',
    barGradient: 'from-[#0284c7] to-[#38bdf8]',
    Icon: Shield,
  },
};

const AnimatedStatRow: React.FC<{
  statKey: 'topSpeed' | 'accel' | 'handling' | 'nitro' | 'weight';
  shortAxis: string;
  label: string;
  desc: string;
  baseRaw: number;
  currRaw: number;
  baseBar: number;
  currBar: number;
  isActiveInfo?: boolean;
  onSelectInfo?: (key: 'topSpeed' | 'accel' | 'handling' | 'nitro' | 'weight') => void;
  onHoverInfo?: (key: 'topSpeed' | 'accel' | 'handling' | 'nitro' | 'weight' | null) => void;
}> = ({
  statKey,
  shortAxis,
  label,
  desc,
  baseRaw,
  currRaw,
  baseBar,
  currBar,
  isActiveInfo = false,
  onSelectInfo,
  onHoverInfo,
}) => {
  const meta = STAT_META[statKey];
  const statHelp = PHYSICS_STAT_DESCRIPTIONS[statKey];
  const BarIcon = meta.Icon;
  const rawDelta = currRaw - baseRaw;

  // Number tween (~200ms) to eliminate abrupt jumping
  const [displayVal, setDisplayVal] = useState<number>(currBar);
  const animRef = useRef<number>(0);
  const startValRef = useRef<number>(currBar);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const fromVal = displayVal;
    const toVal = currBar;
    if (fromVal === toVal) return;

    startValRef.current = fromVal;
    startTimeRef.current = performance.now();
    const duration = 200;

    const step = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(fromVal + (toVal - fromVal) * ease);
      setDisplayVal(val);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      }
    };

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [currBar]);

  const minFill = Math.min(baseBar, currBar);
  const deltaWidth = Math.abs(currBar - baseBar);
  const isGain = currBar >= baseBar;

  return (
    <div
      title={`${label}: ${desc} (Gốc: ${baseRaw >= 0 ? `+${baseRaw}` : baseRaw})`}
      className="flex items-center gap-1.5 h-7 text-xs select-none cursor-default"
      style={{ contain: 'layout paint' }}
    >
      {/* Name & Icon */}
      <div className="w-20 sm:w-22 flex items-center gap-1.5 shrink-0 min-w-0">
        <span style={{ color: meta.color }} className="shrink-0">
          <BarIcon className="w-3.5 h-3.5" />
        </span>
        <span className="font-bold text-slate-200 text-[11px] truncate">
          {shortAxis}
        </span>
      </div>

      {/* Continuous Progress Bar with width transition 0.25s ease */}
      <div className="relative flex-1 h-2 rounded-full bg-[#050811] border border-slate-800 overflow-hidden">
        {/* Base fill */}
        <div
          style={{
            width: `${minFill}%`,
            transition: 'width 0.25s ease',
          }}
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${meta.barGradient}`}
        />
        {/* Delta overlay - always mounted to prevent layout jumps & flash */}
        <div
          style={{
            left: `${minFill}%`,
            width: `${deltaWidth}%`,
            opacity: deltaWidth > 0 ? 1 : 0,
            transition: 'left 0.25s ease, width 0.25s ease, opacity 0.2s ease',
          }}
          className={`absolute inset-y-0 ${
            isGain ? 'bg-[#34d399]' : 'bg-[#f87171]'
          }`}
        />
      </div>

      {/* Tabular numbers with fixed width */}
      <div className="w-11 text-right shrink-0 font-mono-num tabular-nums">
        <span
          style={{ color: meta.color }}
          className="text-[11px] font-extrabold"
        >
          {displayVal}
        </span>
        <span className="text-[9px] text-slate-500 font-normal">/100</span>
      </div>

      {/* Delta chip - always occupies fixed width with opacity: 0 when delta is 0 */}
      <div className="w-10 text-right shrink-0">
        <span
          className={`px-1 py-0.2 rounded text-[9.5px] font-extrabold font-mono-num tabular-nums inline-block transition-opacity duration-200 ${
            rawDelta !== 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } ${
            rawDelta > 0
              ? 'bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/40'
              : 'bg-[#f87171]/20 text-[#f87171] border border-[#f87171]/40'
          }`}
        >
          {rawDelta > 0 ? `▲+${rawDelta}` : `▼${rawDelta}`}
        </span>
      </div>

      {/* Exclamation mark (!) button at the end of each physics stat to view its impact */}
      <button
        type="button"
        data-testid={`stat-info-btn-${statKey}`}
        aria-label={`Xem thông tin ảnh hưởng của ${label}`}
        title={`${statHelp.title}: ${statHelp.impact}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectInfo?.(statKey);
        }}
        onMouseEnter={() => onHoverInfo?.(statKey)}
        onMouseLeave={() => onHoverInfo?.(null)}
        className={`w-5 h-5 rounded-full font-mono-num text-[11px] font-black leading-none inline-flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
          isActiveInfo
            ? 'bg-[#fbbf24] text-[#0a1020] border-white shadow-[0_0_10px_rgba(251,191,36,0.6)] scale-105'
            : 'bg-[#0f1a33] hover:bg-[#22d3ee]/20 text-[#22d3ee] hover:text-white border-[#22d3ee]/45 hover:border-[#22d3ee]'
        }`}
      >
        !
      </button>
    </div>
  );
};

interface GarageModalProps {
  student: StudentAccount;
  isTeacher?: boolean;
  initialTab?: 'cosmetics' | 'tuning';
  onUpdateStudent: (updated: StudentAccount) => void;
  onOpenGacha?: () => void;
  onClose: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  student,
  isTeacher = false,
  initialTab = 'cosmetics',
  onUpdateStudent,
  onclose: _unused,
  onClose,
}: GarageModalProps & { onclose?: () => void }) => {
  // Top-level Garage Tab: 1. Cosmetics ("Xưởng Ngoại Hình") vs 2. Performance Tuning ("Xưởng Độ Máy - 25 CP")
  const [garageTab, setGarageTab] = useState<'cosmetics' | 'tuning'>(initialTab);

  // =========================================================================
  // TAB 1 STATE: XƯỞNG NGOẠI HÌNH (COSMETICS - 7 SLOTS)
  // =========================================================================
  const [activeSlot, setActiveSlot] = useState<PartSlot>('chassis');
  const [slotDropdownOpen, setSlotDropdownOpen] = useState(false);
  const [tierFilter, setTierFilter] = useState<'ALL' | 'SHOP' | 'GACHA'>('ALL');
  const [previewLoadout, setPreviewLoadout] = useState<CarLoadout>(
    student.loadout
  );
  const [hoveredItem, setHoveredItem] = useState<PartItem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Showcase Stage State & Controls (Left Half Redesign)
  const [stageBackdrop, setStageBackdrop] =
    useState<StageBackdrop>('cyberpunk');
  const [cameraPresetIndex, setCameraPresetIndex] = useState<number>(0);
  const [showCosmeticTooltip, setShowCosmeticTooltip] = useState<boolean>(false);
  const [isDraggingCar, setIsDraggingCar] = useState<boolean>(false);

  const carRotationRef = useRef<number>(-0.38);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartAngleRef = useRef<number>(-0.38);
  const pauseAutoRotateUntilRef = useRef<number>(0);

  // Ambient floating glowing dust motes
  const dustParticlesRef = useRef<
    {
      x: number;
      y: number;
      r: number;
      alpha: number;
      speed: number;
      drift: number;
      phase: number;
    }[]
  >(
    Array.from({ length: 32 }, () => ({
      x: Math.random() * 520,
      y: Math.random() * 480,
      r: 0.8 + Math.random() * 1.8,
      alpha: 0.25 + Math.random() * 0.55,
      speed: 0.22 + Math.random() * 0.45,
      drift: (Math.random() - 0.5) * 0.3,
      phase: Math.random() * Math.PI * 2,
    }))
  );

  // Drag handlers for 360-degree manual car rotation
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartAngleRef.current = carRotationRef.current;
    setIsDraggingCar(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartXRef.current;
    carRotationRef.current = dragStartAngleRef.current + deltaX * 0.012;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDraggingCar(false);
      // Pause auto-rotation for 3 seconds after dragging
      pauseAutoRotateUntilRef.current = Date.now() + 3000;
    }
  };

  const handleCycleCameraPreset = () => {
    const nextIdx = (cameraPresetIndex + 1) % CAMERA_PRESETS.length;
    setCameraPresetIndex(nextIdx);
    carRotationRef.current = CAMERA_PRESETS[nextIdx].angle;
    pauseAutoRotateUntilRef.current = Date.now() + 4000;
    soundEngine.playCoin();
  };

  const handleCycleBackdrop = () => {
    const list: StageBackdrop[] = ['cyberpunk', 'showroom', 'night_circuit'];
    const curIdx = list.indexOf(stageBackdrop);
    const next = list[(curIdx + 1) % list.length];
    setStageBackdrop(next);
    soundEngine.playCoin();
  };

  // =========================================================================
  // TAB 2 STATE: XƯỞNG ĐỘ MÁY (PERFORMANCE TUNING - 25 CP, 2 SAVED PRESETS + PLAYSTYLE SUGGESTIONS)
  // =========================================================================
  const [activeTuningSlot, setActiveTuningSlot] =
    useState<TuningSlot>('engine');
  const [draftTuningLoadout, setDraftTuningLoadout] = useState<TuningLoadout>(
    () => student.tuningLoadout || { ...DEFAULT_TUNING_LOADOUT }
  );
  const [hoveredTuningPart, setHoveredTuningPart] =
    useState<TuningPartItem | null>(null);
  const [selectedPresetSlot, setSelectedPresetSlot] = useState<number>(() =>
    Math.min(2, Math.max(0, student.activePresetIndex ?? 0))
  );
  const [showSavePresetForm, setShowSavePresetForm] = useState<boolean>(false);
  const [presetNameInput, setPresetNameInput] = useState<string>('');
  const [showSuggestedPresetsMenu, setShowSuggestedPresetsMenu] =
    useState<boolean>(false);
  const [hoveredSuggestedPreset, setHoveredSuggestedPreset] =
    useState<SuggestedPlaystylePreset | null>(null);
  const [pinnedStatInfoKey, setPinnedStatInfoKey] = useState<
    'topSpeed' | 'accel' | 'handling' | 'nitro' | 'weight' | null
  >(null);
  const [hoveredStatInfoKey, setHoveredStatInfoKey] = useState<
    'topSpeed' | 'accel' | 'handling' | 'nitro' | 'weight' | null
  >(null);
  const activeStatInfoKey = hoveredStatInfoKey || pinnedStatInfoKey;
  const [tuningFeedback, setTuningFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  // Requirement #8: Filter, Sort, and Search for Tuning Parts
  const [tuningTierFilter, setTuningTierFilter] = useState<'ALL' | TuningTier>(
    'ALL'
  );
  const [tuningSortBy, setTuningSortBy] = useState<
    'tier_default' | 'cp_asc' | 'cp_desc' | 'power_desc'
  >('tier_default');
  const [tuningSearchQuery, setTuningSearchQuery] = useState<string>('');
  const [recentlyEquippedPartId, setRecentlyEquippedPartId] = useState<
    string | null
  >(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);

  // Requirement #2: Auto-dismiss tuning feedback toast after 2 seconds
  useEffect(() => {
    if (!tuningFeedback) return;
    const timer = window.setTimeout(() => {
      setTuningFeedback(null);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [tuningFeedback]);

  useEffect(() => {
    setPreviewLoadout(student.loadout);
  }, [student.loadout]);

  useEffect(() => {
    if (student.tuningLoadout) {
      setDraftTuningLoadout(student.tuningLoadout);
    }
  }, [student.tuningLoadout]);

  // Ensure presets array always has 3 normalized slots even after Firebase sync
  const tuningPresets: (TuningPreset | null)[] = useMemo(
    () => normalizeTuningPresets(student.tuningPresets, student.id),
    [student.tuningPresets, student.id]
  );

  const effectiveLoadout: CarLoadout = useMemo(
    () =>
      hoveredItem
        ? {
            ...previewLoadout,
            [hoveredItem.slot]: hoveredItem.id,
          }
        : previewLoadout,
    [hoveredItem, previewLoadout]
  );
  const carPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageStateRef = useRef({
    effectiveLoadout,
    hoveredItem,
    stageBackdrop,
    activeSlot,
    previewLoadout,
    studentLoadout: student.loadout,
  });
  stageStateRef.current = {
    effectiveLoadout,
    hoveredItem,
    stageBackdrop,
    activeSlot,
    previewLoadout,
    studentLoadout: student.loadout,
  };

  // Render dynamic 60FPS Showcase Stage when in Cosmetics tab without restarting loop on hover/click
  useEffect(() => {
    if (garageTab !== 'cosmetics') return;
    const canvas = carPreviewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let cachedW = Math.max(340, Math.floor(canvas.clientWidth || 480));
    let cachedH = Math.max(280, Math.floor(canvas.clientHeight || 420));
    const updateDims = () => {
      if (!canvas) return;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (cw > 0 && ch > 0) {
        cachedW = Math.max(340, Math.floor(cw));
        cachedH = Math.max(280, Math.floor(ch));
      }
    };
    updateDims();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateDims);
      ro.observe(canvas);
    }

    const renderStage = () => {
      if (!canvas || !ctx) return;
      const {
        effectiveLoadout: curEffectiveLoadout,
        hoveredItem: curHoveredItem,
        stageBackdrop: curStageBackdrop,
        activeSlot: curActiveSlot,
        previewLoadout: curPreviewLoadout,
        studentLoadout: curStudentLoadout,
      } = stageStateRef.current;

      const w = cachedW;
      const h = cachedH;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.floor(w * dpr);
      const targetH = Math.floor(h * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const nowSec = performance.now() / 1000;

      // Auto-rotation: slowly spins when not dragging and not paused by user interaction
      if (
        !prefersReduced &&
        !isDraggingRef.current &&
        Date.now() > pauseAutoRotateUntilRef.current
      ) {
        carRotationRef.current += 0.007;
        if (carRotationRef.current > Math.PI * 2) {
          carRotationRef.current -= Math.PI * 2;
        }
      }

      const currentRotation = carRotationRef.current;
      const cx = w * 0.5;
      const cy = h * 0.51;
      const podY = cy + 50;

      // Active display item & tier styling for the stage
      const activeDisplay =
        curHoveredItem ||
        ALL_PARTS.find((p) => p.id === curPreviewLoadout[curActiveSlot]) ||
        ALL_PARTS.find((p) => p.id === curStudentLoadout[curActiveSlot]) ||
        ALL_PARTS[0];
      const tier = activeDisplay?.tier || 'D';
      const tierTheme =
        STAGE_TIER_PALETTES[tier] || STAGE_TIER_PALETTES.D;

      // 1. Dynamic Tier Background Gradient (Adapts to Light Mode unless 'night_circuit' is chosen)
      const isLightStage =
        curStageBackdrop !== 'night_circuit' &&
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('theme-light');

      ctx.fillStyle = isLightStage ? '#E2E8F0' : '#050913';
      ctx.fillRect(0, 0, w, h);

      const bgRadial = ctx.createRadialGradient(
        cx,
        cy * 0.8,
        15,
        cx,
        cy,
        Math.max(w, h) * 0.78
      );
      if (isLightStage) {
        bgRadial.addColorStop(0, '#FFFFFF');
        bgRadial.addColorStop(0.55, '#F1F5F9');
        bgRadial.addColorStop(1, '#CBD5E1');
      } else if (tier === 'SSS') {
        bgRadial.addColorStop(0, '#421a02');
        bgRadial.addColorStop(0.5, '#1e0c01');
        bgRadial.addColorStop(1, '#080400');
      } else if (tier === 'SS') {
        bgRadial.addColorStop(0, '#3d0827');
        bgRadial.addColorStop(0.5, '#200414');
        bgRadial.addColorStop(1, '#090106');
      } else if (tier === 'S') {
        bgRadial.addColorStop(0, '#3a2003');
        bgRadial.addColorStop(0.5, '#1d1002');
        bgRadial.addColorStop(1, '#090400');
      } else if (tier === 'A') {
        bgRadial.addColorStop(0, '#2d084a');
        bgRadial.addColorStop(0.5, '#170427');
        bgRadial.addColorStop(1, '#0a0212');
      } else {
        bgRadial.addColorStop(0, '#042238');
        bgRadial.addColorStop(0.5, '#021220');
        bgRadial.addColorStop(1, '#02070e');
      }
      ctx.fillStyle = bgRadial;
      ctx.fillRect(0, 0, w, h);

      // 2. Backdrop Environment Elements
      if (curStageBackdrop === 'cyberpunk') {
        // Perspective neon grid on floor
        ctx.save();
        ctx.strokeStyle = isLightStage
          ? 'rgba(2, 132, 199, 0.22)'
          : `${tierTheme.podiumRing}26`;
        ctx.lineWidth = 1;
        const gridStartY = podY - 18;
        for (let gy = gridStartY; gy < h + 20; gy += 18) {
          const progress = (gy - gridStartY) / (h - gridStartY);
          ctx.globalAlpha = 0.12 + progress * 0.3;
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(w, gy);
          ctx.stroke();
        }
        for (let gx = -120; gx <= w + 120; gx += 46) {
          ctx.globalAlpha = 0.16;
          ctx.beginPath();
          ctx.moveTo(cx + (gx - cx) * 0.14, gridStartY);
          ctx.lineTo(gx, h);
          ctx.stroke();
        }
        ctx.restore();
      } else if (curStageBackdrop === 'showroom') {
        // Luxury showroom floor reflection zone
        const floorGrad = ctx.createLinearGradient(0, podY - 12, 0, h);
        floorGrad.addColorStop(
          0,
          isLightStage ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.07)'
        );
        floorGrad.addColorStop(
          1,
          isLightStage ? 'rgba(148, 163, 184, 0.45)' : 'rgba(0, 0, 0, 0.88)'
        );
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, podY - 12, w, h - podY + 12);
      } else if (curStageBackdrop === 'night_circuit') {
        // Midnight race track asphalt & rumble curbs
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.fillRect(0, podY, w, h - podY);
        const curbY = h - 14;
        const curbW = 26;
        for (let curbX = 0; curbX < w; curbX += curbW) {
          ctx.fillStyle =
            Math.floor(curbX / curbW) % 2 === 0 ? '#ef4444' : '#f8fafc';
          ctx.globalAlpha = 0.5;
          ctx.fillRect(curbX, curbY, curbW, 14);
        }
        ctx.restore();
      }

      // 3. Overhead Spotlight Beam (cone of light from ceiling)
      const spotGrad = ctx.createLinearGradient(cx, 0, cx, podY + 55);
      spotGrad.addColorStop(0, tierTheme.spotlightColor);
      spotGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.04)');
      spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.moveTo(cx - 38, 0);
      ctx.lineTo(cx - 185, podY + 55);
      ctx.lineTo(cx + 185, podY + 55);
      ctx.lineTo(cx + 38, 0);
      ctx.closePath();
      ctx.fill();

      // 4. Ambient Floating Dust Motes (glowing particles drifting slowly upwards)
      ctx.save();
      for (const p of dustParticlesRef.current) {
        if (!prefersReduced) {
          p.y -= p.speed;
          p.x += Math.sin(nowSec * 1.2 + p.phase) * 0.25;
          if (p.y < 0) {
            p.y = h;
            p.x = Math.random() * w;
          }
        }
        ctx.fillStyle = tierTheme.dustColor;
        ctx.globalAlpha =
          p.alpha * (0.6 + 0.4 * Math.sin(nowSec * 2.2 + p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 5. Illuminated Circular Podium
      const podRx = Math.min(w * 0.42, 175);
      const podRy = podRx * 0.36;

      // Radiant halo glow under podium
      const haloGrad = ctx.createRadialGradient(
        cx,
        podY + 4,
        8,
        cx,
        podY + 4,
        podRx * 1.35
      );
      haloGrad.addColorStop(0, tierTheme.glowColor);
      haloGrad.addColorStop(0.7, `${tierTheme.borderColor}15`);
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.ellipse(cx, podY + 4, podRx * 1.35, podRy * 1.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Podium Base Cylinder
      ctx.fillStyle = isLightStage ? '#94A3B8' : '#080d1a';
      ctx.beginPath();
      ctx.ellipse(cx, podY + 12, podRx, podRy, 0, 0, Math.PI * 2);
      ctx.fill();

      // Podium Top Surface
      const topGrad = ctx.createRadialGradient(
        cx,
        podY - 6,
        8,
        cx,
        podY,
        podRx
      );
      if (isLightStage) {
        topGrad.addColorStop(0, '#FFFFFF');
        topGrad.addColorStop(0.8, '#E2E8F0');
        topGrad.addColorStop(1, '#CBD5E1');
      } else {
        topGrad.addColorStop(0, '#101a2e');
        topGrad.addColorStop(0.85, '#080e1c');
        topGrad.addColorStop(1, '#050912');
      }
      ctx.fillStyle = topGrad;
      ctx.strokeStyle = tierTheme.borderColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx, podY, podRx, podRy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Concentric Neon Ring on Podium
      ctx.save();
      ctx.translate(cx, podY);
      ctx.scale(1, podRy / podRx);
      ctx.strokeStyle = tierTheme.podiumRing;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, podRx * 0.78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 6. Subtle Floor Reflection of the Car
      // Scale car ~1.6x compared to base 2.5 => ~4.0
      const carScale = Math.min(4.0, Math.max(2.8, (w / 420) * 3.8));
      ctx.save();
      ctx.translate(cx, podY + 22);
      ctx.scale(1, -0.28);
      ctx.globalAlpha = 0.22;
      drawModularCar(ctx, curEffectiveLoadout, {
        x: 0,
        y: 0,
        angle: currentRotation,
        scale: carScale,
        nowSec,
        nitroActive: false,
      });
      ctx.restore();

      // 7. Main Car - scaled ~1.6x, resting on illuminated podium
      drawModularCar(ctx, curEffectiveLoadout, {
        x: cx,
        y: cy - 12,
        angle: currentRotation,
        scale: carScale,
        nowSec,
        nitroActive: true,
        showHeadlightBeams: true,
      });

      ctx.restore();
      animId = requestAnimationFrame(renderStage);
    };

    animId = requestAnimationFrame(renderStage);
    return () => {
      cancelAnimationFrame(animId);
      ro?.disconnect();
    };
  }, [garageTab]);

  const slotItems = useMemo(() => {
    const TIER_ORDER: Record<string, number> = {
      SSS: 7,
      SS: 6,
      S: 5,
      A: 4,
      B: 3,
      C: 2,
      D: 1,
    };
    return ALL_PARTS.filter((p) => {
      if (p.slot !== activeSlot) return false;
      if (tierFilter === 'SHOP') return !p.gachaOnly;
      if (tierFilter === 'GACHA') return p.gachaOnly;
      return true;
    }).sort((a, b) => {
      const rA = TIER_ORDER[a.tier] || 0;
      const rB = TIER_ORDER[b.tier] || 0;
      if (rA !== rB) return rB - rA;
      return a.name.localeCompare(b.name);
    });
  }, [activeSlot, tierFilter]);

  const syncCosmeticToActivePreset = (nextCosmeticLoadout: CarLoadout): (TuningPreset | null)[] => {
    const nextPresets: (TuningPreset | null)[] = [...tuningPresets];
    const currentPreset = nextPresets[selectedPresetSlot];
    if (currentPreset) {
      nextPresets[selectedPresetSlot] = {
        ...currentPreset,
        carLoadout: { ...nextCosmeticLoadout },
        updatedAt: Date.now(),
      };
      try {
        localStorage.setItem(
          `tripled_tuning_presets_${student.id}`,
          JSON.stringify(nextPresets)
        );
      } catch {}
    }
    return nextPresets;
  };

  const handleSelectOrBuy = (item: PartItem) => {
    const isOwned = student.ownedParts.includes(item.id);
    if (isOwned) {
      const nextLoadout: CarLoadout = {
        ...student.loadout,
        [item.slot]: item.id,
      };
      const nextPresets = syncCosmeticToActivePreset(nextLoadout);
      setPreviewLoadout(nextLoadout);
      onUpdateStudent({
        ...student,
        loadout: nextLoadout,
        tuningPresets: nextPresets,
      });
      soundEngine.playCoin();
      setFeedback(`✓ Đã lắp đặt ngoại hình: ${item.name}`);
      return;
    }

    if (item.gachaOnly) {
      setPreviewLoadout({
        ...previewLoadout,
        [item.slot]: item.id,
      });
      setFeedback(
        item.id.includes('_tripled_a')
          ? `🔒 Skin sự kiện độc quyền! Nhập đúng mã Giftcode để mở khóa.`
          : `🎰 Quay thưởng "${item.name}" tại Vòng Quay Gacha`
      );
      return;
    }

    if (student.coins < item.price) {
      setPreviewLoadout({
        ...previewLoadout,
        [item.slot]: item.id,
      });
      setFeedback(`⚠️ Thiếu Xu (Cần ${item.price} Xu)`);
      return;
    }

    const nextOwned = [...student.ownedParts, item.id];
    const nextLoadout: CarLoadout = {
      ...student.loadout,
      [item.slot]: item.id,
    };
    const nextPresets = syncCosmeticToActivePreset(nextLoadout);
    setPreviewLoadout(nextLoadout);
    onUpdateStudent({
      ...student,
      coins: student.coins - item.price,
      ownedParts: nextOwned,
      loadout: nextLoadout,
      tuningPresets: nextPresets,
    });
    soundEngine.playFanfare(
      item.tier === 'S' || item.tier === 'SS' || item.tier === 'SSS'
    );
    setFeedback(`🎉 Đã mở khóa & gắn: ${item.name}`);
  };

  const getSetKey = (itemId: string): string => {
    const parts = itemId.split('_');
    return parts.slice(1).join('_');
  };

  const handleEquipFullSet = (item: PartItem) => {
    const setKey = getSetKey(item.id);
    if (!setKey) return;

    const setParts = ALL_PARTS.filter((p) => getSetKey(p.id) === setKey);
    const ownedSetParts = setParts.filter((p) =>
      student.ownedParts.includes(p.id)
    );

    if (ownedSetParts.length === 0) {
      setFeedback(`⚠️ Chưa sở hữu món nào thuộc Set này!`);
      soundEngine.playCoin();
      return;
    }

    const nextLoadout: CarLoadout = { ...student.loadout };
    ownedSetParts.forEach((p) => {
      nextLoadout[p.slot] = p.id;
    });

    const nextPresets = syncCosmeticToActivePreset(nextLoadout);
    setPreviewLoadout(nextLoadout);
    onUpdateStudent({
      ...student,
      loadout: nextLoadout,
      tuningPresets: nextPresets,
    });
    soundEngine.playCoin();
    setFeedback(
      `⚡ Đã trang bị ${ownedSetParts.length}/${setParts.length} món thuộc Set!`
    );
  };

  // =========================================================================
  // TAB 2 HANDLERS: PERFORMANCE TUNING (25 CP BUDGET, 2 SAVED PRESETS & SUGGESTED BUILDS)
  // =========================================================================
  const baseTuningSummary = calculateTuningSummary(draftTuningLoadout);
  const effectiveTuningLoadout: TuningLoadout = hoveredSuggestedPreset
    ? { ...hoveredSuggestedPreset.loadout }
    : hoveredTuningPart
    ? {
        ...draftTuningLoadout,
        [hoveredTuningPart.slot]: hoveredTuningPart.id,
      }
    : draftTuningLoadout;
  const previewTuningSummary = calculateTuningSummary(effectiveTuningLoadout);
  const previewPhysics = calculateTuningPhysics(effectiveTuningLoadout);

  const handleApplySuggestedPreset = (preset: SuggestedPlaystylePreset) => {
    const nextDraft: TuningLoadout = { ...preset.loadout };
    setDraftTuningLoadout(nextDraft);
    setHoveredSuggestedPreset(null);
    setHoveredTuningPart(null);
    setShowSuggestedPresetsMenu(false);
    setShowSavePresetForm(false);

    onUpdateStudent({
      ...student,
      tuningLoadout: nextDraft,
      tuningPresets,
    });
    soundEngine.playFanfare(false);
    setTuningFeedback({
      ok: true,
      text: `⚡ Đã áp dụng gợi ý "${preset.name}" (${preset.totalCP}/${MAX_TUNING_CP} CP — ${preset.styleTag})! Bấm nút Lưu nếu muốn lưu vào Preset 1 hoặc 2.`,
    });
  };

  const handleSelectTuningPart = (part: TuningPartItem) => {
    const isAlreadyEquipped = draftTuningLoadout[part.slot] === part.id;
    if (isAlreadyEquipped) {
      soundEngine.playCoin();
      return;
    }

    const wouldTotalCP =
      baseTuningSummary.totalCP -
      baseTuningSummary.parts[part.slot].cp +
      part.cp;

    // Requirement #4: When clicking a part that exceeds remaining CP budget, block equip & show clear feedback
    if (wouldTotalCP > MAX_TUNING_CP) {
      soundEngine.playHazardHit();
      const overBy = wouldTotalCP - MAX_TUNING_CP;
      setTuningFeedback({
        ok: false,
        text: `⚠️ Không đủ ngân sách CP! Lắp "${part.name}" (${part.cp} CP) sẽ thành ${wouldTotalCP}/${MAX_TUNING_CP} CP (Vượt ${overBy} CP). Hãy hạ cấp linh kiện ở nhánh khác trước.`,
      });
      return;
    }

    const nextDraft: TuningLoadout = {
      ...draftTuningLoadout,
      [part.slot]: part.id,
    };
    setDraftTuningLoadout(nextDraft);
    setRecentlyEquippedPartId(part.id);
    window.setTimeout(() => {
      setRecentlyEquippedPartId((prev) => (prev === part.id ? null : prev));
    }, 520);

    // Automatically update the currently selected preset slot if it exists (or initialize slot 0 if none exists yet)
    const nextPresets: (TuningPreset | null)[] = [...tuningPresets];
    const activeSlotPreset = nextPresets[selectedPresetSlot];
    if (activeSlotPreset) {
      nextPresets[selectedPresetSlot] = {
        ...activeSlotPreset,
        loadout: { ...nextDraft },
        carLoadout: { ...previewLoadout },
        totalCP: wouldTotalCP,
        updatedAt: Date.now(),
      };
      try {
        localStorage.setItem(
          `tripled_tuning_presets_${student.id}`,
          JSON.stringify(nextPresets)
        );
      } catch {}
    }

    onUpdateStudent({
      ...student,
      tuningLoadout: nextDraft,
      tuningPresets: nextPresets,
      activePresetIndex: activeSlotPreset ? selectedPresetSlot : student.activePresetIndex,
    });
    soundEngine.playCoin();
    setTuningFeedback({
      ok: true,
      text: activeSlotPreset
        ? `✓ Đã lắp [${part.name}] (${wouldTotalCP}/${MAX_TUNING_CP} CP) & tự động cập nhật vào Preset ${selectedPresetSlot + 1}!`
        : `✓ Đã lắp [${part.name}] (${wouldTotalCP}/${MAX_TUNING_CP} CP) — Lái thử trực tiếp ở sân bên phải!`,
    });
  };

  const handleClickPresetSlot = (slotIdx: number) => {
    setSelectedPresetSlot(slotIdx);
    const existing = tuningPresets[slotIdx];
    if (existing && existing.loadout) {
      const nextTuning: TuningLoadout = { ...existing.loadout };
      const nextCarLoadout: CarLoadout = existing.carLoadout
        ? { ...existing.carLoadout }
        : { ...student.loadout };
      setDraftTuningLoadout(nextTuning);
      setPreviewLoadout(nextCarLoadout);
      setHoveredTuningPart(null);
      setHoveredItem(null);
      onUpdateStudent({
        ...student,
        loadout: nextCarLoadout,
        tuningLoadout: nextTuning,
        tuningPresets,
        activePresetIndex: slotIdx,
      });
      setPresetNameInput(existing.name);
      setShowSavePresetForm(false);
      soundEngine.playCoin();
      setTuningFeedback({
        ok: true,
        text: `⚡ Đã nạp Preset ${slotIdx + 1}: "${existing.name}" (${existing.totalCP}/${MAX_TUNING_CP} CP) — Xe đã được trang bị sẵn!`,
      });
    } else {
      // Immediately save current car & tuning into this empty slot so clicking it works right away
      const defaultName = `Cấu Hình #${slotIdx + 1}`;
      const newPreset: TuningPreset = {
        id: slotIdx,
        name: defaultName,
        loadout: { ...draftTuningLoadout },
        carLoadout: { ...previewLoadout },
        totalCP: baseTuningSummary.totalCP,
        updatedAt: Date.now(),
      };
      const nextPresets: (TuningPreset | null)[] = [...tuningPresets];
      nextPresets[slotIdx] = newPreset;
      try {
        localStorage.setItem(
          `tripled_tuning_presets_${student.id}`,
          JSON.stringify(nextPresets)
        );
      } catch {}
      onUpdateStudent({
        ...student,
        loadout: { ...previewLoadout },
        tuningLoadout: { ...draftTuningLoadout },
        tuningPresets: nextPresets,
        activePresetIndex: slotIdx,
      });
      setPresetNameInput(defaultName);
      setShowSavePresetForm(true);
      soundEngine.playCoin();
      setTuningFeedback({
        ok: true,
        text: `💾 Đã tạo & kích hoạt Preset ${slotIdx + 1} (${newPreset.totalCP}/${MAX_TUNING_CP} CP)! Bạn có thể đổi tên hoặc lắp đồ riêng cho Preset này.`,
      });
    }
  };

  // Requirement #4: Keyboard shortcuts 1-4 for Tuning Slot Tabs, Q/E for Presets, ESC to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInInput(e.target)) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (garageTab !== 'tuning') return;

      if (e.key === '1') {
        setActiveTuningSlot('engine');
        soundEngine.playCoin();
      } else if (e.key === '2') {
        setActiveTuningSlot('tires');
        soundEngine.playCoin();
      } else if (e.key === '3') {
        setActiveTuningSlot('body');
        soundEngine.playCoin();
      } else if (e.key === '4') {
        setActiveTuningSlot('nitro');
        soundEngine.playCoin();
      } else if (e.key === 'q' || e.key === 'Q') {
        const prevSlot = (selectedPresetSlot + 2) % 3;
        handleClickPresetSlot(prevSlot);
      } else if (e.key === 'e' || e.key === 'E') {
        const nextSlot = (selectedPresetSlot + 1) % 3;
        handleClickPresetSlot(nextSlot);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleSaveToPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseTuningSummary.isValidCP) {
      soundEngine.playHazardHit();
      setTuningFeedback({
        ok: false,
        text: `⚠️ Không thể lưu! Tổng điểm CP hiện tại là ${baseTuningSummary.totalCP}/${MAX_TUNING_CP} CP (Vượt quá giới hạn ${MAX_TUNING_CP} CP).`,
      });
      return;
    }

    const targetIdx = selectedPresetSlot;
    const cleanName =
      presetNameInput.trim() ||
      tuningPresets[targetIdx]?.name ||
      `Cấu Hình #${targetIdx + 1}`;

    const newPreset: TuningPreset = {
      id: targetIdx,
      name: cleanName.slice(0, 24),
      loadout: { ...draftTuningLoadout },
      carLoadout: { ...previewLoadout },
      totalCP: baseTuningSummary.totalCP,
      updatedAt: Date.now(),
    };

    const nextPresets: (TuningPreset | null)[] = [...tuningPresets];
    nextPresets[targetIdx] = newPreset;

    try {
      localStorage.setItem(
        `tripled_tuning_presets_${student.id}`,
        JSON.stringify(nextPresets)
      );
    } catch {
      // ignore storage errors
    }

    onUpdateStudent({
      ...student,
      loadout: { ...previewLoadout },
      tuningLoadout: { ...draftTuningLoadout },
      tuningPresets: nextPresets,
      activePresetIndex: targetIdx,
    });

    setShowSavePresetForm(false);
    soundEngine.playFanfare(false);
    setTuningFeedback({
      ok: true,
      text: `💾 Đã lưu "${newPreset.name}" (${newPreset.totalCP}/${MAX_TUNING_CP} CP) vào Preset ${targetIdx + 1}!`,
    });
  };

  const previewClassInfo = calculateCarClass(effectiveLoadout);
  const previewAura = RANK_AURA_PALETTE[previewClassInfo.tier];
  const activeChassisItem = ALL_PARTS.find(
    (p) => p.id === effectiveLoadout.chassis
  );
  const isModifiedPreview =
    JSON.stringify(previewLoadout) !== JSON.stringify(student.loadout);

  // 5 Horizontal Progress Bars (0 to 100) for Performance Tuning
  const tuningStatBars: {
    key: keyof typeof baseTuningSummary.totals;
    label: string;
    shortAxis: string;
    desc: string;
    baseRaw: number;
    currRaw: number;
    baseBar: number;
    currBar: number;
  }[] = [
    {
      key: 'topSpeed',
      label: 'Tốc độ tối đa',
      shortAxis: 'Tốc độ',
      desc: `${Math.round((previewPhysics.maxSpeed / 335) * 295)} KM/H`,
      baseRaw: baseTuningSummary.totals.topSpeed,
      currRaw: previewTuningSummary.totals.topSpeed,
      baseBar: baseTuningSummary.bars.topSpeed,
      currBar: previewTuningSummary.bars.topSpeed,
    },
    {
      key: 'accel',
      label: 'Gia tốc',
      shortAxis: 'Gia tốc',
      desc: 'Độ bốc xuất phát',
      baseRaw: baseTuningSummary.totals.accel,
      currRaw: previewTuningSummary.totals.accel,
      baseBar: baseTuningSummary.bars.accel,
      currBar: previewTuningSummary.bars.accel,
    },
    {
      key: 'handling',
      label: 'Khả năng cua / Grip',
      shortAxis: 'Độ cua',
      desc: `${Math.round(previewPhysics.driftGrip * 100)}% Bám cua`,
      baseRaw: baseTuningSummary.totals.handling,
      currRaw: previewTuningSummary.totals.handling,
      baseBar: baseTuningSummary.bars.handling,
      currBar: previewTuningSummary.bars.handling,
    },
    {
      key: 'nitro',
      label: 'Hiệu suất Nitro',
      shortAxis: 'Nitro',
      desc: `${previewPhysics.nitroDuration.toFixed(2)}s Đốt`,
      baseRaw: baseTuningSummary.totals.nitro,
      currRaw: previewTuningSummary.totals.nitro,
      baseBar: baseTuningSummary.bars.nitro,
      currBar: previewTuningSummary.bars.nitro,
    },
    {
      key: 'weight',
      label: 'Cân nặng',
      shortAxis: 'Cân nặng',
      desc: `x${previewPhysics.stunMultiplier.toFixed(2)} Choáng`,
      baseRaw: baseTuningSummary.totals.weight,
      currRaw: previewTuningSummary.totals.weight,
      baseBar: baseTuningSummary.bars.weight,
      currBar: previewTuningSummary.bars.weight,
    },
  ];

  // Filter & Sort the 8 parts in the active tuning slot
  const filteredGroupParts = useMemo(() => {
    const q = tuningSearchQuery.trim().toLowerCase();
    return ALL_TUNING_PARTS.filter((p) => {
      if (p.slot !== activeTuningSlot) return false;
      if (tuningTierFilter !== 'ALL' && p.tier !== tuningTierFilter) {
        return false;
      }
      if (q) {
        const hay = `${p.name} ${p.passiveLabel || ''} ${p.passiveDesc || ''} hạng ${p.tier}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (tuningSortBy === 'cp_asc') return a.cp - b.cp;
      if (tuningSortBy === 'cp_desc') return b.cp - a.cp;
      if (tuningSortBy === 'power_desc') {
        const sumA =
          a.stats.topSpeed +
          a.stats.accel +
          a.stats.handling +
          a.stats.nitro +
          a.stats.weight;
        const sumB =
          b.stats.topSpeed +
          b.stats.accel +
          b.stats.handling +
          b.stats.nitro +
          b.stats.weight;
        return sumB - sumA;
      }
      return 0;
    });
  }, [activeTuningSlot, tuningTierFilter, tuningSearchQuery, tuningSortBy]);

  const baseCP = baseTuningSummary.totalCP;
  const previewCP = previewTuningSummary.totalCP;
  const isOverBudgetPreview = previewCP > MAX_TUNING_CP;
  const isNearLimit = previewCP >= 22 && previewCP <= MAX_TUNING_CP;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-1.5 sm:p-3 select-none overflow-hidden">
      {/* Blurred Background Overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#050811]/85 backdrop-blur-2xl"
      />

      {/* Main Garage Modal Container (Responsive 1280px -> 1920px, stacks on tablet) */}
      <div className="relative z-10 w-[1380px] max-w-[98vw] h-[820px] max-h-[96vh] shrink-0 flex flex-col rounded-2xl backdrop-blur-2xl bg-gradient-to-b from-[#0a1020]/98 via-[#0f1a33]/96 to-[#0a1020]/98 border border-[#22d3ee]/45 shadow-[0_28px_90px_rgba(0,0,0,0.95),0_0_40px_rgba(34,211,238,0.14)] overflow-hidden">
        {/* Corner HUD Brackets */}
        <span className="pointer-events-none absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-[#22d3ee] z-20" />
        <span className="pointer-events-none absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-[#fbbf24] z-20" />
        <span className="pointer-events-none absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-[#22d3ee] z-20" />
        <span className="pointer-events-none absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-[#fbbf24] z-20" />

        {/* ================================================================= */}
        {/* 1. BALANCED HEADER TOP BAR (Requirement #10)                      */}
        {/* ================================================================= */}
        <div className="relative flex flex-wrap items-center justify-between gap-4 px-5 sm:px-6 py-3 bg-gradient-to-r from-[#0a1020] via-[#0f1a33] to-[#0a1020] border-b border-[#22d3ee]/30 shrink-0">
          {/* Left: Brand Title & Subtitle */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#22d3ee] via-[#0284c7] to-[#fbbf24] p-0.5 shadow-[0_0_16px_rgba(34,211,238,0.4)] shrink-0">
              <div className="w-full h-full bg-[#0a1020] rounded-[10px] flex items-center justify-center">
                <Wrench className="w-5 h-5 text-[#22d3ee]" />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-black text-base sm:text-xl tracking-wide uppercase bg-gradient-to-r from-[#38bdf8] via-[#22d3ee] to-[#f59e0b] bg-clip-text text-transparent truncate">
                GARA CHIẾN XA TRIPLE D
              </h2>
            </div>
          </div>

          {/* Center: 2 Independent Workshop Tabs */}
          <div className="flex items-center gap-2 bg-[#060b16] p-1.5 rounded-xl border border-[#22d3ee]/35 shadow-inner">
            <button
              type="button"
              data-testid="garage-tab-cosmetics"
              onClick={() => {
                setGarageTab('cosmetics');
                soundEngine.playCoin();
              }}
              className={`px-4 py-2 rounded-lg font-sci text-xs sm:text-[13px] font-extrabold tracking-wide transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee] ${
                garageTab === 'cosmetics'
                  ? 'bg-gradient-to-r from-[#22d3ee] to-[#0284c7] text-[#0a1020] shadow-[0_0_18px_rgba(34,211,238,0.45)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Palette className="w-4 h-4 shrink-0" />
              <span>Xưởng Ngoại Hình</span>
            </button>

            <button
              type="button"
              data-testid="garage-tab-tuning"
              onClick={() => {
                setGarageTab('tuning');
                soundEngine.playCoin();
              }}
              className={`px-4 py-2 rounded-lg font-sci text-xs sm:text-[13px] font-extrabold tracking-wide transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24] ${
                garageTab === 'tuning'
                  ? 'bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-[#34d399] text-[#0a1020] shadow-[0_0_18px_rgba(251,191,36,0.45)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Wrench className="w-4 h-4 shrink-0" />
              <span>Xưởng Độ Máy</span>
            </button>
          </div>

          {/* Right: Coin Counter & Close Button */}
          <div className="flex items-center gap-3">
            <div
              title="Số Xu Hiện Có"
              className="px-3.5 py-2 rounded-xl bg-[#060b16] border border-[#fbbf24]/50 font-mono-num text-xs sm:text-sm font-extrabold text-[#fef08a] flex items-center gap-2 shadow-[0_0_14px_rgba(251,191,36,0.15)]"
            >
              <Coins className="w-4 h-4 text-[#fbbf24] shrink-0" />
              <span>{student.coins.toLocaleString()}</span>
              <span className="text-[10px] font-sci text-amber-300/80 uppercase">
                Xu
              </span>
            </div>

            {isTeacher && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStudent({
                    ...student,
                    coins: student.coins + 1000,
                  });
                  soundEngine.playCoin();
                  setFeedback('⚡ +1,000 Xu');
                }}
                className="px-2.5 py-2 rounded-xl bg-[#fbbf24] hover:brightness-110 text-[#0a1020] font-mono-num font-black text-xs shadow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                +1K
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng Gara"
              title="Đóng Gara (ESC)"
              className="w-10 h-10 p-0 leading-none rounded-xl bg-[#0f1a33] hover:bg-rose-950/80 text-slate-200 hover:text-rose-200 border border-[#22d3ee]/35 hover:border-[#f87171] inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee]"
            >
              <X className="w-5 h-5 stroke-[2.5] block shrink-0" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* ================================================================= */}
        {/* TAB 1 CONTENT: 🎨 XƯỞNG NGOẠI HÌNH (COSMETICS - 7 BỘ PHẬN)        */}
        {/* ================================================================= */}
        {garageTab === 'cosmetics' ? (
          <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-3.5 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* =============================================================== */}
            {/* LEFT 5 COLS: SÂN KHẤU TRƯNG BÀY CHIẾN XA (SHOWCASE STAGE)       */}
            {/* =============================================================== */}
            {(() => {
              const displayItem =
                hoveredItem ||
                ALL_PARTS.find((p) => p.id === previewLoadout[activeSlot]) ||
                ALL_PARTS.find((p) => p.id === student.loadout[activeSlot]) ||
                activeChassisItem ||
                ALL_PARTS[0];
              const displayTier = displayItem?.tier || 'D';
              const displayAura =
                RANK_AURA_PALETTE[displayTier] || RANK_AURA_PALETTE.D;
              const displayTierTheme =
                STAGE_TIER_PALETTES[displayTier] || STAGE_TIER_PALETTES.D;
              const displaySlotMeta = SLOT_LABELS.find(
                (s) => s.slot === (displayItem?.slot || activeSlot)
              );
              const isDisplayItemOwned = displayItem
                ? student.ownedParts.includes(displayItem.id)
                : true;
              const isDisplayItemEquipped = displayItem
                ? student.loadout[displayItem.slot] === displayItem.id
                : true;

              return (
                <div
                  style={{
                    borderColor: displayTierTheme.borderColor,
                    boxShadow: `0 16px 40px rgba(0,0,0,0.85), 0 0 24px ${displayTierTheme.glowColor}`,
                  }}
                  className="lg:col-span-5 flex flex-col h-full min-h-[420px] relative rounded-2xl border overflow-hidden backdrop-blur-2xl transition-all duration-300"
                >
                  {/* Canvas Car Stage (~80%+ of column height, car 1.6x larger) */}
                  <div className="relative w-full flex-1 h-full min-h-0 flex items-center justify-center">
                    <canvas
                      ref={carPreviewCanvasRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      className="w-full h-full block touch-none select-none cursor-grab active:cursor-grabbing"
                    />

                    {/* Middle Drag Hint Instruction */}
                    <div
                      className={`pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-[10px] font-medium text-slate-300 flex items-center gap-1.5 transition-all duration-200 z-20 ${
                        isDraggingCar
                          ? 'opacity-95 scale-105 border-cyan-400/50 text-cyan-200'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span>
                        {isDraggingCar
                          ? 'Đang xoay 360°...'
                          : 'Kéo chuột để xoay xe 360°'}
                      </span>
                    </div>

                    {/* Mini Toolbar at Top-Right of Showcase Stage */}
                    <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 backdrop-blur-xl bg-[#0a1020]/85 p-1 rounded-xl border border-white/15 shadow-lg">
                      {/* 1. Toggle Camera Angle */}
                      <button
                        type="button"
                        onClick={handleCycleCameraPreset}
                        title={`Góc nhìn: ${CAMERA_PRESETS[cameraPresetIndex].label} (Bấm để đổi góc)`}
                        className="px-2.5 py-1.5 rounded-lg bg-[#0f1a33]/90 hover:bg-[#1e293b] border border-white/15 text-xs font-sci font-bold text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden sm:inline text-[10.5px]">
                          {CAMERA_PRESETS[cameraPresetIndex].label}
                        </span>
                      </button>

                      {/* 2. Toggle Stage Backdrop */}
                      <button
                        type="button"
                        onClick={handleCycleBackdrop}
                        title={`Phông nền: ${BACKDROP_META[stageBackdrop].label} (Bấm để đổi nền)`}
                        className="px-2.5 py-1.5 rounded-lg bg-[#0f1a33]/90 hover:bg-[#1e293b] border border-white/15 text-xs font-sci font-bold text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <SunMedium className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline text-[10.5px]">
                          {BACKDROP_META[stageBackdrop].label}
                        </span>
                      </button>

                      {/* 3. Help "?" Tooltip Button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setShowCosmeticTooltip((prev) => !prev)
                          }
                          title="Thông tin về Ngoại Hình & Độ Máy"
                          className="p-1.5 rounded-lg bg-[#0f1a33]/90 hover:bg-[#1e293b] border border-white/15 text-cyan-300 hover:text-cyan-200 cursor-pointer transition-colors"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>

                        {showCosmeticTooltip && (
                          <>
                            <div
                              onClick={() => setShowCosmeticTooltip(false)}
                              className="fixed inset-0 z-40"
                            />
                            <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 p-3.5 rounded-2xl bg-[#0a1020]/98 backdrop-blur-2xl border border-cyan-400/50 shadow-2xl z-50 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <span className="font-sci font-bold text-xs text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Quy tắc Xưởng Ngoại Hình
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowCosmeticTooltip(false)
                                  }
                                  className="text-slate-400 hover:text-white cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                Ngoại hình chỉ thay đổi diện mạo,{' '}
                                <strong className="text-amber-300 font-bold">
                                  không cộng chỉ số
                                </strong>
                                . Để độ động cơ, lốp, khung gầm, Nitro hãy sang{' '}
                                <span className="text-emerald-400 font-bold">
                                  Xưởng Độ Máy (25 CP)
                                </span>
                                .
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setGarageTab('tuning');
                                  setShowCosmeticTooltip(false);
                                  soundEngine.playCoin();
                                }}
                                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:brightness-110 text-slate-950 font-sci font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                                <span>ĐẾN XƯỞNG ĐỘ MÁY (25 CP) →</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Feedback Toast Notification */}
                    {feedback && (
                      <div className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-xl bg-[#0a1020]/95 backdrop-blur-xl border border-cyan-400/70 text-xs font-bold text-cyan-200 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                        {feedback}
                      </div>
                    )}

                    {/* Frosted Glassmorphism Strip at Footer of Preview Stage */}
                    <div className="absolute bottom-3 inset-x-3 backdrop-blur-xl bg-[#0a1020]/85 border border-white/15 rounded-2xl p-3 sm:px-4 sm:py-3 shadow-[0_12px_36px_rgba(0,0,0,0.7)] flex items-center justify-between gap-3 pointer-events-auto z-20">
                      {/* Left/Center: Large Skin Name + Tier Badge + Slot Sub-label */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-black text-white tracking-wide truncate max-w-[200px] sm:max-w-[260px]">
                            {displayItem?.name || 'Chiến Xa Mặc Định'}
                          </h3>
                          <span
                            style={{
                              background: displayAura.badgeBg,
                              color: displayAura.badgeText,
                              borderColor: displayAura.badgeBorder,
                              boxShadow: `0 0 10px ${displayAura.glowCss}`,
                            }}
                            className="px-2 py-0.5 rounded-md border font-sci font-black text-[10px] tracking-wider shrink-0"
                          >
                            HẠNG {displayTier}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
                          Bộ phận:{' '}
                          <span className="text-cyan-300 font-bold">
                            {displaySlotMeta?.label.replace(/^\d+\.\s*/, '') ||
                              'Ngoại hình'}
                          </span>
                        </div>
                      </div>

                      {/* Right: Status Badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        {hoveredItem ? (
                          <>
                            <span className="px-2.5 py-1 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-200 text-[10px] font-sci font-black tracking-wider animate-pulse flex items-center gap-1 shadow-sm">
                              <Eye className="w-3 h-3" />
                              <span>XEM TRƯỚC</span>
                            </span>
                            {!isDisplayItemOwned && (
                              <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 border border-rose-400/80 text-rose-200 text-[10px] font-sci font-bold flex items-center gap-1 shadow-sm">
                                <Lock className="w-3 h-3" />
                                <span>Chưa sở hữu</span>
                              </span>
                            )}
                          </>
                        ) : isDisplayItemEquipped ? (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/80 text-emerald-300 text-[10px] font-sci font-black tracking-wider flex items-center gap-1 shadow-sm">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>ĐANG TRANG BỊ</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-blue-500/20 border border-blue-400/80 text-blue-200 text-[10px] font-sci font-bold shadow-sm">
                            ĐÃ LƯU
                          </span>
                        )}

                        {isModifiedPreview && !hoveredItem && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewLoadout(student.loadout);
                              setFeedback(null);
                            }}
                            title="Quay lại bộ đang trang bị trên xe"
                            className="px-2 py-1 rounded-xl bg-[#0f1a33] hover:bg-[#1e293b] border border-cyan-400/40 text-[10px] font-sci font-bold text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span className="hidden sm:inline">
                              Về Đang Lắp
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* =============================================================== */}
            {/* RIGHT 7 COLS: 7 COSMETIC SLOTS DROPDOWN + ITEM GRID             */}
            {/* =============================================================== */}
            <div className="lg:col-span-7 flex flex-col h-full min-h-0 space-y-3 overflow-hidden">
              {(() => {
                const currentSlotMeta =
                  SLOT_LABELS.find((s) => s.slot === activeSlot) ||
                  SLOT_LABELS[0];
                const ActiveSlotIcon = SLOT_VECTOR_ICONS[activeSlot] || Car;
                const activeEqId = previewLoadout[activeSlot];
                const activeEqItem = ALL_PARTS.find((p) => p.id === activeEqId);
                const activeEqTier = activeEqItem?.tier || 'D';
                const activeRarityAura = RANK_AURA_PALETTE[activeEqTier];
                const slotAll = ALL_PARTS.filter((p) => p.slot === activeSlot);
                const slotOwned = slotAll.filter((p) =>
                  student.ownedParts.includes(p.id)
                );

                return (
                  <div className="relative z-30 flex items-center justify-between gap-2 backdrop-blur-2xl bg-[#0a1020]/90 px-3 py-1.5 rounded-xl border border-[#22d3ee]/35 shrink-0">
                    <div className="relative flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => setSlotDropdownOpen((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#0f1a33] to-[#0a1020] hover:border-[#22d3ee] border border-[#22d3ee]/55 flex items-center gap-2 cursor-pointer transition-all shrink-0"
                      >
                        <div className="w-6 h-6 rounded-md bg-[#22d3ee]/20 border border-[#22d3ee]/60 flex items-center justify-center text-[#22d3ee] shrink-0">
                          <ActiveSlotIcon className="w-3.5 h-3.5 stroke-[2.4]" />
                        </div>

                        <div className="text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-sci font-bold text-[#67e8f9] uppercase tracking-wider">
                              {currentSlotMeta.label.replace(/^\d+\.\s*/, '')} ({slotOwned.length}/
                              {slotAll.length})
                            </span>
                            <span
                              style={{
                                background: activeRarityAura.badgeBg,
                                color: activeRarityAura.badgeText,
                                borderColor: activeRarityAura.badgeBorder,
                              }}
                              className="px-1 py-0.2 rounded border font-sci font-black text-[8.5px] leading-tight"
                            >
                              {activeEqTier}
                            </span>
                          </div>
                          <div className="text-[11.5px] font-extrabold text-white truncate max-w-[120px] sm:max-w-[160px]">
                            {activeEqItem?.name || 'Mặc định'}
                          </div>
                        </div>

                        <ChevronDown
                          className={`w-3.5 h-3.5 text-[#22d3ee] transition-transform duration-200 shrink-0 ${
                            slotDropdownOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Transferred "92/104 món" badge next to slot dropdown */}
                      <div
                        title="Tổng số món đã sở hữu trong bộ sưu tập"
                        className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-lg bg-[#060b16] border border-[#22d3ee]/35 text-[10.5px] font-sci font-bold text-cyan-300 shadow-inner shrink-0"
                      >
                        <Layers className="w-3 h-3 text-[#22d3ee]" />
                        <span>
                          {student.ownedParts.length}/{ALL_PARTS.length}
                        </span>
                        <span className="text-[9.5px] text-slate-400">món</span>
                      </div>

                      {slotDropdownOpen && (
                        <>
                          <div
                            onClick={() => setSlotDropdownOpen(false)}
                            className="fixed inset-0 z-40"
                          />
                          <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 rounded-2xl bg-[#0a1020]/98 backdrop-blur-2xl border border-[#22d3ee]/50 shadow-2xl p-1.5 z-50 space-y-1">
                            {SLOT_LABELS.map((sl) => {
                              const eqId = previewLoadout[sl.slot];
                              const eqItem = ALL_PARTS.find(
                                (p) => p.id === eqId
                              );
                              const eqTier = eqItem?.tier || 'D';
                              const rarityAura = RANK_AURA_PALETTE[eqTier];
                              const isSelected = activeSlot === sl.slot;
                              const SlotIcon =
                                SLOT_VECTOR_ICONS[sl.slot] || Car;
                              const sAll = ALL_PARTS.filter(
                                (p) => p.slot === sl.slot
                              ).length;
                              const sOwned = ALL_PARTS.filter(
                                (p) =>
                                  p.slot === sl.slot &&
                                  student.ownedParts.includes(p.id)
                              ).length;

                              return (
                                <button
                                  key={sl.slot}
                                  type="button"
                                  data-testid={`garage-slot-btn-${sl.slot}`}
                                  onClick={() => {
                                    setActiveSlot(sl.slot);
                                    setSlotDropdownOpen(false);
                                    setFeedback(null);
                                    soundEngine.playCoin();
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-xl border flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? 'border-[#22d3ee] bg-[#0f1a33] text-white'
                                      : 'border-transparent hover:border-[#22d3ee]/35 hover:bg-white/5 text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${
                                        isSelected
                                          ? 'bg-[#22d3ee]/20 border-[#22d3ee] text-[#22d3ee]'
                                          : 'bg-[#0a1020] border-slate-700 text-slate-400'
                                      }`}
                                    >
                                      <SlotIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-extrabold leading-tight truncate">
                                        {sl.label.replace(/^\d+\.\s*/, '')}
                                      </div>
                                      <div className="text-[9.5px] text-slate-400 truncate">
                                        {eqItem?.name || 'Mặc định'} ({sOwned}/
                                        {sAll})
                                      </div>
                                    </div>
                                  </div>

                                  <span
                                    style={{
                                      background: rarityAura.badgeBg,
                                      color: rarityAura.badgeText,
                                      borderColor: rarityAura.badgeBorder,
                                    }}
                                    className="px-2 py-0.5 rounded-md border font-sci font-black text-[9px] shrink-0"
                                  >
                                    {eqTier}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 bg-[#060b16] p-0.5 rounded-lg border border-[#22d3ee]/25 shrink-0">
                      {(
                        [
                          { id: 'ALL', label: 'Tất Cả' },
                          { id: 'SHOP', label: 'Mua Xu' },
                          { id: 'GACHA', label: 'Hiếm & Gacha' },
                        ] as const
                      ).map((f) => {
                        const active = tierFilter === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setTierFilter(f.id)}
                            className={`px-2.5 py-1 rounded-md text-[10.5px] font-sci font-bold transition-all cursor-pointer whitespace-nowrap ${
                              active
                                ? 'bg-gradient-to-r from-[#22d3ee] to-[#0284c7] text-[#0a1020] shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Scrollable Grid of Cosmetic Cards */}
              <div className="flex-1 h-full min-h-0 overflow-y-auto garage-scroll pr-1.5 bg-[#0a1020]/75 p-3 rounded-2xl border border-[#22d3ee]/20 grid grid-cols-2 sm:grid-cols-3 gap-3.5 content-start">
                {slotItems.map((item) => {
                  const isOwned = student.ownedParts.includes(item.id);
                  const isEquipped = student.loadout[item.slot] === item.id;
                  const isPreviewing = previewLoadout[item.slot] === item.id;
                  const aura =
                    RANK_AURA_PALETTE[item.tier] || RANK_AURA_PALETTE.D;
                  const isFreeTripleDCodePart = item.id.includes('_tripled_a');

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectOrBuy(item)}
                      onMouseEnter={() => setHoveredItem(item)}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={{
                        borderColor: isEquipped
                          ? '#34d399'
                          : isPreviewing
                          ? '#22d3ee'
                          : aura.badgeBorder,
                        boxShadow: isEquipped
                          ? '0 10px 28px rgba(0,0,0,0.7), 0 0 20px rgba(52, 211, 153, 0.35)'
                          : `0 10px 28px rgba(0,0,0,0.65), 0 0 18px ${aura.glowCss}`,
                      }}
                      className="group relative h-[226px] rounded-2xl backdrop-blur-xl bg-gradient-to-b from-[#0f1a33]/90 via-[#0a1020]/95 to-[#060b16] border flex flex-col justify-between overflow-hidden transition-all duration-200 hover:-translate-y-1 cursor-pointer"
                    >
                      <div
                        style={{
                          background: `radial-gradient(circle at 50% 42%, ${aura.core}, transparent 70%)`,
                        }}
                        className="pointer-events-none absolute inset-0 opacity-75 group-hover:opacity-100 transition-opacity"
                      />

                      <div className="relative z-10 w-full flex items-center justify-between px-3 pt-2.5">
                        <span
                          style={{
                            background: aura.badgeBg,
                            color: aura.badgeText,
                            borderColor: aura.badgeBorder,
                          }}
                          className="px-2.5 py-0.5 rounded-md border font-sci text-[10.5px] font-black tracking-wider"
                        >
                          Hạng {item.tier}
                        </span>

                        {isOwned && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEquipFullSet(item);
                            }}
                            title="Trang bị tất cả món đã sở hữu trong Set này"
                            className="px-2 py-0.5 rounded-md bg-[#0284c7]/90 hover:bg-[#22d3ee] hover:text-[#0a1020] border border-cyan-300/80 text-white font-sci text-[9.5px] font-extrabold shadow-lg flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Layers className="w-3 h-3" />
                            <span>MẶC SET</span>
                          </button>
                        )}
                      </div>

                      <div
                        className={`relative z-10 mx-auto my-1 rounded-xl overflow-hidden border border-white/15 shadow-[0_6px_18px_rgba(0,0,0,0.6)] group-hover:scale-[1.03] transition-transform ${
                          !isOwned ? 'opacity-80 grayscale-[30%]' : ''
                        }`}
                      >
                        <PartThumbnail
                          item={item}
                          baseLoadout={student.loadout}
                          width={172}
                          height={94}
                        />
                        {isEquipped && (
                          <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-[#34d399] text-[#0a1020] font-sci text-[8.5px] font-black">
                            ĐANG LẮP
                          </span>
                        )}
                        {!isOwned && isFreeTripleDCodePart && (
                          <span className="absolute bottom-1 inset-x-1.5 px-1.5 py-0.5 rounded bg-[#042f2e]/95 border border-[#34d399]/70 text-[#6ee7b7] font-sci text-[8.5px] font-bold text-center">
                            QUÀ SỰ KIỆN TRIPLED
                          </span>
                        )}
                      </div>

                      <div
                        className={`relative z-10 text-xs font-extrabold text-white group-hover:text-[#67e8f9] transition-colors text-center px-2.5 line-clamp-1 ${
                          !isOwned ? 'opacity-80' : ''
                        }`}
                      >
                        {item.name}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectOrBuy(item);
                        }}
                        className={`relative z-10 w-full py-2 px-3 font-sci text-[11px] font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 border-t ${
                          isEquipped
                            ? 'bg-gradient-to-r from-[#059669] via-[#10b981] to-[#34d399] text-[#0a1020] border-emerald-300'
                            : isOwned
                            ? 'bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#22d3ee] hover:brightness-110 text-[#0a1020] border-cyan-300'
                            : isFreeTripleDCodePart
                            ? 'bg-gradient-to-r from-[#059669] to-[#10b981] hover:brightness-110 text-white border-emerald-400/60'
                            : item.gachaOnly
                            ? 'bg-gradient-to-r from-[#7e22ce] via-[#a855f7] to-[#ec4899] hover:brightness-110 text-white border-purple-300/60'
                            : 'bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24] hover:brightness-110 text-[#0a1020] border-amber-200'
                        }`}
                      >
                        {isEquipped ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>ĐANG TRANG BỊ</span>
                          </>
                        ) : isOwned ? (
                          <>
                            <Zap className="w-3.5 h-3.5 stroke-[2.5] fill-current" />
                            <span>TRANG BỊ</span>
                          </>
                        ) : isFreeTripleDCodePart ? (
                          <span>NHẬP GIFTCODE</span>
                        ) : item.gachaOnly ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>GACHA</span>
                          </>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <span>MUA NGAY</span>
                            <span>·</span>
                            <Coins className="w-3.5 h-3.5" />
                            <span>{item.price}</span>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* TAB 2 CONTENT: 🔧 XƯỞNG ĐỘ MÁY (PERFORMANCE TUNING - 25 CP)       */
          /* ================================================================= */
          <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* =============================================================== */}
            {/* LEFT 7 COLS: 25 CP SEGMENTED BAR + PRESETS + 4 TABS + PARTS     */}
            {/* =============================================================== */}
            <div className="lg:col-span-7 flex flex-col h-full min-h-0 space-y-2 overflow-hidden">
              {/* 1. Requirement #1: Combined 1-Row CP Segmented Bar & 3 Circular Presets + Save Icon */}
              <div className="px-3 py-2 rounded-xl bg-[#0a1020]/95 border border-[#22d3ee]/30 shrink-0 shadow-[0_6px_20px_rgba(0,0,0,0.5)] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  {/* Left: CP Counter & 25-Cell Segmented Bar */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      data-testid="tuning-cp-counter"
                      className={`px-2.5 py-1 rounded-lg border font-mono-num text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-colors ${
                        isOverBudgetPreview
                          ? 'bg-rose-950/90 border-[#f87171] text-[#f87171] shadow-[0_0_12px_rgba(248,113,113,0.4)]'
                          : isNearLimit
                          ? 'bg-amber-950/60 border-[#fbbf24]/70 text-[#fbbf24]'
                          : 'bg-[#0f1a33] border-[#22d3ee]/50 text-[#34d399]'
                      }`}
                    >
                      <span className="font-sci text-[10px] text-slate-400 uppercase tracking-wider mr-0.5">
                        CP
                      </span>
                      <span>{previewCP}</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-slate-200">{MAX_TUNING_CP}</span>
                      {hoveredTuningPart && previewCP !== baseCP && (
                        <span
                          className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                            previewCP > baseCP
                              ? isOverBudgetPreview
                                ? 'bg-[#f87171]/25 text-[#f87171]'
                                : 'bg-[#fbbf24]/25 text-[#fbbf24]'
                              : 'bg-[#34d399]/25 text-[#34d399]'
                          }`}
                        >
                          {previewCP > baseCP
                            ? `+${previewCP - baseCP}`
                            : `${previewCP - baseCP}`}
                        </span>
                      )}
                    </div>

                    {/* 25 Segmented Cells */}
                    <div
                      role="progressbar"
                      aria-valuenow={previewCP}
                      aria-valuemin={0}
                      aria-valuemax={MAX_TUNING_CP}
                      aria-label="Thanh ngân sách 25 CP"
                      className="grid gap-0.5 p-1 rounded-lg bg-[#050811] border border-slate-800 flex-1 max-w-[280px]"
                      style={{
                        gridTemplateColumns: 'repeat(25, minmax(0, 1fr))',
                      }}
                    >
                      {Array.from({ length: MAX_TUNING_CP }, (_, idx) => {
                        const cellNum = idx + 1;
                        const isEquippedCell = cellNum <= baseCP;
                        const isAddedPreviewCell =
                          hoveredTuningPart &&
                          cellNum > baseCP &&
                          cellNum <= previewCP;
                        const isRemovedPreviewCell =
                          hoveredTuningPart &&
                          cellNum > previewCP &&
                          cellNum <= baseCP;

                        const isLightUi =
                          typeof document !== 'undefined' &&
                          document.documentElement.classList.contains('theme-light');
                        let cellStyle = isLightUi
                          ? 'bg-slate-300 border-slate-400/80'
                          : 'bg-slate-900/90 border-slate-800';
                        if (isOverBudgetPreview && cellNum <= previewCP) {
                          cellStyle =
                            'bg-[#f87171] border-rose-300 shadow-[0_0_6px_#f87171]';
                        } else if (isAddedPreviewCell) {
                          cellStyle =
                            'bg-[#fbbf24] border-amber-200 shadow-[0_0_6px_#fbbf24]';
                        } else if (isRemovedPreviewCell) {
                          cellStyle =
                            'bg-[#34d399]/35 border-[#34d399] border-dashed';
                        } else if (isEquippedCell) {
                          cellStyle =
                            baseCP >= 23
                              ? 'bg-gradient-to-t from-[#d97706] to-[#fbbf24] border-amber-300/80'
                              : 'bg-gradient-to-t from-[#0284c7] to-[#22d3ee] border-cyan-300/80';
                        }

                        return (
                          <div
                            key={cellNum}
                            title={`${cellNum}/${MAX_TUNING_CP} CP`}
                            className={`h-2 rounded-[2px] border transition-all duration-150 ${cellStyle}`}
                          />
                        );
                      })}
                    </div>

                    {/* Over limit warning indicator */}
                    {!baseTuningSummary.isValidCP && (
                      <span
                        data-testid="tuning-cp-overlimit-warning"
                        className="px-2 py-0.5 rounded bg-rose-950/90 border border-[#f87171] text-rose-200 text-[10px] font-bold flex items-center gap-1 shrink-0"
                      >
                        <AlertTriangle className="w-3 h-3 text-[#f87171]" />
                        <span className="hidden sm:inline">
                          Vượt {baseTuningSummary.totalCP - MAX_TUNING_CP} CP
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Right: 3 Circular User Presets (1/2/3) + Save Button + Suggested Playstyle Presets Menu */}
                  <div className="relative flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-sci font-bold text-slate-400 uppercase tracking-wider hidden sm:inline mr-0.5">
                      Preset:
                    </span>
                    {[0, 1, 2].map((idx) => {
                      const preset = tuningPresets[idx];
                      const isSelected = selectedPresetSlot === idx;
                      const hasData = preset !== null;

                      return (
                        <button
                          key={idx}
                          type="button"
                          data-testid={`tuning-preset-btn-${idx + 1}`}
                          onClick={() => handleClickPresetSlot(idx)}
                          title={
                            preset
                              ? `Nạp Preset ${idx + 1}: ${preset.name} (${preset.totalCP}/25 CP) — Phím tắt Q/E`
                              : `Preset ${idx + 1} đang trống — Nhấn để chọn & lưu`
                          }
                          className={`relative w-7 h-7 rounded-full flex items-center justify-center font-mono-num font-black text-xs border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee] ${
                            isSelected
                              ? 'bg-[#22d3ee] text-[#0a1020] border-white shadow-[0_0_12px_rgba(34,211,238,0.5)] scale-105'
                              : 'bg-[#0f1a33] text-slate-300 border-slate-700 hover:border-[#22d3ee]/60 hover:text-white'
                          }`}
                        >
                          <span>{idx + 1}</span>
                          {/* Indicator dot if preset has saved data */}
                          {hasData && (
                            <span
                              className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0a1020] ${
                                isSelected ? 'bg-[#fbbf24]' : 'bg-[#34d399]'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}

                    {/* Compact Icon Save Button */}
                    <button
                      type="button"
                      data-testid="tuning-open-save-preset-btn"
                      disabled={!baseTuningSummary.isValidCP}
                      onClick={() => {
                        const currPreset = tuningPresets[selectedPresetSlot];
                        setPresetNameInput(
                          currPreset?.name ||
                            `Cấu hình #${selectedPresetSlot + 1}`
                        );
                        setShowSuggestedPresetsMenu(false);
                        setShowSavePresetForm((v) => !v);
                        soundEngine.playCoin();
                      }}
                      title={`Lưu cấu hình hiện tại vào Preset ${selectedPresetSlot + 1}`}
                      aria-label="Lưu vào Preset"
                      className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        baseTuningSummary.isValidCP
                          ? 'bg-[#fbbf24]/20 hover:bg-[#fbbf24] text-[#fbbf24] hover:text-[#0a1020] border-[#fbbf24]/60 cursor-pointer shadow-sm'
                          : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>

                    {/* Suggested Playstyle Presets Button (Replaces Preset 3 next to Save button) */}
                    <button
                      type="button"
                      data-testid="tuning-suggested-presets-btn"
                      onClick={() => {
                        setShowSavePresetForm(false);
                        setShowSuggestedPresetsMenu((v) => !v);
                        soundEngine.playCoin();
                      }}
                      title="Preset gợi ý dựng sẵn theo từng phong cách chơi"
                      className={`px-2.5 h-7 rounded-lg border font-sci text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee] ${
                        showSuggestedPresetsMenu
                          ? 'bg-gradient-to-r from-[#22d3ee] to-[#34d399] text-[#0a1020] border-white shadow-[0_0_14px_rgba(34,211,238,0.45)]'
                          : 'bg-[#0f1a33] hover:bg-[#162647] text-[#67e8f9] border-[#22d3ee]/50 hover:border-[#22d3ee]'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>Gợi ý</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          showSuggestedPresetsMenu ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu of Suggested Playstyle Presets */}
                    {showSuggestedPresetsMenu && (
                      <>
                        <div
                          onClick={() => {
                            setShowSuggestedPresetsMenu(false);
                            setHoveredSuggestedPreset(null);
                          }}
                          className="fixed inset-0 z-30"
                        />
                        <div
                          data-testid="tuning-suggested-presets-menu"
                          className="absolute right-0 top-full mt-2 z-40 w-[320px] sm:w-[360px] max-h-[410px] overflow-y-auto garage-scroll p-2.5 rounded-2xl bg-[#070d1b]/98 border border-[#22d3ee]/55 shadow-[0_20px_50px_rgba(0,0,0,0.92),0_0_28px_rgba(34,211,238,0.22)] space-y-1.5"
                        >
                          <div className="flex items-center justify-between px-1.5 pb-1.5 border-b border-slate-800">
                            <div>
                              <div className="text-[11px] font-sci font-black text-[#67e8f9] uppercase tracking-wider">
                                Preset Gợi Ý Theo Phong Cách Chơi
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Rê chuột để xem thử chỉ số · Nhấn để lắp ngay
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowSuggestedPresetsMenu(false);
                                setHoveredSuggestedPreset(null);
                              }}
                              className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {SUGGESTED_PLAYSTYLE_PRESETS.map((sug) => {
                            const isCurrentMatch =
                              draftTuningLoadout.engine === sug.loadout.engine &&
                              draftTuningLoadout.tires === sug.loadout.tires &&
                              draftTuningLoadout.body === sug.loadout.body &&
                              draftTuningLoadout.nitro === sug.loadout.nitro;

                            return (
                              <button
                                key={sug.id}
                                type="button"
                                data-testid={`suggested-preset-item-${sug.id}`}
                                onMouseEnter={() => setHoveredSuggestedPreset(sug)}
                                onMouseLeave={() => setHoveredSuggestedPreset(null)}
                                onClick={() => handleApplySuggestedPreset(sug)}
                                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                                  isCurrentMatch
                                    ? 'bg-emerald-950/50 border-[#34d399] shadow-[0_0_12px_rgba(52,211,153,0.25)]'
                                    : 'bg-[#0c162c]/90 hover:bg-[#132342] border-slate-800 hover:border-[#22d3ee]/60'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-xs font-extrabold text-white truncate">
                                      {sug.name}
                                    </span>
                                    <span className="text-[10px] text-[#fbbf24] font-semibold truncate">
                                      · {sug.styleTag}
                                    </span>
                                  </div>
                                  <span className="px-1.5 py-0.5 rounded bg-[#060b16] border border-[#22d3ee]/40 font-mono-num text-[10px] font-bold text-[#67e8f9] shrink-0">
                                    {sug.totalCP}/{MAX_TUNING_CP} CP
                                  </span>
                                </div>
                                <div className="text-[10.5px] text-slate-300 leading-snug">
                                  {sug.description}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Inline Save Preset Naming Form (Compact) */}
                {showSavePresetForm && (
                  <form
                    onSubmit={handleSaveToPreset}
                    className="p-2 rounded-xl bg-[#060b16] border border-[#fbbf24]/50 flex flex-wrap items-center gap-2"
                  >
                    <span className="text-[11px] font-bold text-[#fef08a] shrink-0">
                      Lưu Preset {selectedPresetSlot + 1}:
                    </span>
                    <input
                      type="text"
                      data-testid="tuning-preset-name-input"
                      maxLength={24}
                      placeholder="Đặt tên (VD: Tốc độ, Drift, v.v.)..."
                      value={presetNameInput}
                      onChange={(e) => setPresetNameInput(e.target.value)}
                      className="flex-1 min-w-[140px] px-2.5 py-1 rounded-lg bg-[#0f1a33] border border-[#22d3ee]/40 text-xs text-white focus:outline-none focus:border-[#fbbf24]"
                    />
                    <button
                      type="submit"
                      data-testid="tuning-confirm-save-preset-btn"
                      disabled={!baseTuningSummary.isValidCP}
                      className="px-3 py-1 rounded-lg bg-[#34d399] hover:brightness-110 disabled:opacity-40 text-[#0a1020] font-sci text-[11px] font-black cursor-pointer"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSavePresetForm(false)}
                      className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] cursor-pointer"
                    >
                      Đóng
                    </button>
                  </form>
                )}
              </div>

              {/* 2. Requirement #4: 4 Tuning Slot Tabs (Icon + Name + Tier/CP badge, no secondary description) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
                {TUNING_SLOT_LABELS.map((grp, idx) => {
                  const isSel = activeTuningSlot === grp.slot;
                  const eqPart = baseTuningSummary.parts[grp.slot];
                  const tVis = TUNING_TIER_VISUALS[eqPart.tier];
                  const GrpIcon = TUNING_SLOT_ICONS[grp.slot];
                  const isLightUi =
                    typeof document !== 'undefined' &&
                    document.documentElement.classList.contains('theme-light');
                  const lightBadgeMap: Record<
                    TuningTier,
                    { bg: string; text: string; border: string }
                  > = {
                    D: { bg: '#e2e8f0', text: '#1e293b', border: '#94a3b8' },
                    C: { bg: '#d1fae5', text: '#065f46', border: '#34d399' },
                    B: { bg: '#e0f2fe', text: '#075985', border: '#38bdf8' },
                    A: { bg: '#ede9fe', text: '#5b21b6', border: '#a78bfa' },
                    S: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
                  };
                  const lb = lightBadgeMap[eqPart.tier];

                  return (
                    <button
                      key={grp.slot}
                      type="button"
                      data-testid={`tuning-slot-tab-${grp.slot}`}
                      onClick={() => {
                        setActiveTuningSlot(grp.slot);
                        soundEngine.playCoin();
                      }}
                      title={`${grp.label}: ${eqPart.name} (${eqPart.tier}-${eqPart.cp}CP) — Phím ${idx + 1}`}
                      className={`px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee] ${
                        isSel
                          ? 'bg-gradient-to-r from-[#0f1a33] to-[#132448] border-[#22d3ee] shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                          : 'bg-[#0a1020]/90 border-slate-800 hover:border-[#22d3ee]/40'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center border shrink-0 ${
                            isSel
                              ? 'bg-[#22d3ee]/20 border-[#22d3ee] text-[#22d3ee]'
                              : 'bg-[#060b16] border-slate-700 text-slate-400'
                          }`}
                        >
                          <GrpIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-sci font-extrabold text-white truncate">
                          {grp.shortLabel}
                        </span>
                      </div>
                      <span
                        style={{
                          background: isLightUi ? lb.bg : tVis.badgeBg,
                          color: isLightUi ? lb.text : tVis.badgeText,
                          borderColor: isLightUi ? lb.border : tVis.badgeBorder,
                        }}
                        className="px-1.5 py-0.5 rounded border font-mono-num text-[10px] font-extrabold shrink-0"
                      >
                        {eqPart.tier}·{eqPart.cp}CP
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 3. Requirement #5: Compact 1-Row Toolbar: Tier Dropdown, Expandable Search, Sort Dropdown */}
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#0a1020]/90 border border-[#22d3ee]/20 shrink-0 text-xs">
                {/* Left: Tier Dropdown */}
                <div className="flex items-center gap-1.5">
                  <select
                    aria-label="Lọc theo hạng linh kiện"
                    value={tuningTierFilter}
                    onChange={(e) =>
                      setTuningTierFilter(e.target.value as 'ALL' | TuningTier)
                    }
                    className="px-2 py-1 rounded-lg bg-[#060b16] border border-slate-700 focus:border-[#22d3ee] text-[11px] font-sci font-bold text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả hạng</option>
                    <option value="D">Hạng D (Cơ Bản)</option>
                    <option value="C">Hạng C (Phổ Thông)</option>
                    <option value="B">Hạng B (Cao Cấp)</option>
                    <option value="A">Hạng A (Tinh Anh)</option>
                    <option value="S">Hạng S (Tối Thượng)</option>
                  </select>
                </div>

                {/* Right: Expandable Search + Sort Dropdown */}
                <div className="flex items-center gap-2">
                  {/* Expandable Search Input / Icon */}
                  <div className="relative flex items-center">
                    {isSearchExpanded || tuningSearchQuery ? (
                      <div className="relative flex items-center">
                        <Search className="pointer-events-none w-3.5 h-3.5 text-slate-400 absolute left-2" />
                        <input
                          type="text"
                          autoFocus={isSearchExpanded && !tuningSearchQuery}
                          value={tuningSearchQuery}
                          onChange={(e) => setTuningSearchQuery(e.target.value)}
                          onBlur={() => {
                            if (!tuningSearchQuery) setIsSearchExpanded(false);
                          }}
                          placeholder="Tìm tên, nội tại..."
                          className="w-36 sm:w-44 pl-7 pr-6 py-1 rounded-lg bg-[#060b16] border border-[#22d3ee]/50 text-[11px] text-white placeholder:text-slate-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setTuningSearchQuery('');
                            setIsSearchExpanded(false);
                          }}
                          className="absolute right-1.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsSearchExpanded(true)}
                        title="Tìm kiếm linh kiện"
                        aria-label="Tìm kiếm linh kiện"
                        className="p-1.5 rounded-lg bg-[#060b16] hover:bg-[#0f1a33] border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative flex items-center">
                    <select
                      aria-label="Sắp xếp linh kiện"
                      value={tuningSortBy}
                      onChange={(e) =>
                        setTuningSortBy(
                          e.target.value as
                            | 'tier_default'
                            | 'cp_asc'
                            | 'cp_desc'
                            | 'power_desc'
                        )
                      }
                      className="px-2 py-1 rounded-lg bg-[#060b16] border border-slate-700 focus:border-[#22d3ee] text-[11px] font-bold text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="tier_default">Hạng D → S</option>
                      <option value="cp_asc">CP: Thấp → Cao</option>
                      <option value="cp_desc">CP: Cao → Thấp</option>
                      <option value="power_desc">Chỉ số cao</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Requirements #6 & #10: Scrollable List of Parts (takes >= 55% of left column height) */}
              <div className="flex-1 min-h-0 overflow-y-auto garage-scroll pr-1 bg-[#060b16]/85 p-2.5 rounded-2xl border border-[#22d3ee]/20 grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
                {filteredGroupParts.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-xs text-slate-400 space-y-2">
                    <div>Không tìm thấy linh kiện phù hợp bộ lọc.</div>
                    <button
                      type="button"
                      onClick={() => {
                        setTuningTierFilter('ALL');
                        setTuningSearchQuery('');
                      }}
                      className="px-3 py-1 rounded-lg bg-[#0f1a33] border border-[#22d3ee]/40 text-[#22d3ee] font-bold cursor-pointer"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                ) : (
                  filteredGroupParts.map((part) => {
                    const isEquipped =
                      draftTuningLoadout[part.slot] === part.id;
                    const tVis = TUNING_TIER_VISUALS[part.tier];
                    const wouldTotalCP =
                      baseTuningSummary.totalCP -
                      baseTuningSummary.parts[part.slot].cp +
                      part.cp;
                    const isOverBudgetIfPicked =
                      !isEquipped && wouldTotalCP > MAX_TUNING_CP;
                    const overByCP = Math.max(0, wouldTotalCP - MAX_TUNING_CP);
                    const isFlashing = recentlyEquippedPartId === part.id;

                    const statItems: {
                      key: keyof typeof STAT_META;
                      val: number;
                    }[] = (
                      [
                        { key: 'topSpeed', val: part.stats.topSpeed },
                        { key: 'accel', val: part.stats.accel },
                        { key: 'handling', val: part.stats.handling },
                        { key: 'nitro', val: part.stats.nitro },
                        { key: 'weight', val: part.stats.weight },
                      ] as const
                    ).filter((s) => s.val !== 0);

                    const isLightUi =
                      typeof document !== 'undefined' &&
                      document.documentElement.classList.contains('theme-light');

                    const lightTierStyles: Record<
                      TuningTier,
                      {
                        cardBg: string;
                        badgeBg: string;
                        badgeText: string;
                        badgeBorder: string;
                        passiveBg: string;
                        passiveBorder: string;
                        passiveText: string;
                      }
                    > = {
                      D: {
                        cardBg: 'linear-gradient(155deg, #ffffff, #f1f5f9)',
                        badgeBg: '#e2e8f0',
                        badgeText: '#1e293b',
                        badgeBorder: '#94a3b8',
                        passiveBg: '#f1f5f9',
                        passiveBorder: '#cbd5e1',
                        passiveText: '#334155',
                      },
                      C: {
                        cardBg: 'linear-gradient(155deg, #ffffff, #ecfdf5)',
                        badgeBg: '#d1fae5',
                        badgeText: '#065f46',
                        badgeBorder: '#34d399',
                        passiveBg: '#ecfdf5',
                        passiveBorder: '#6ee7b7',
                        passiveText: '#065f46',
                      },
                      B: {
                        cardBg: 'linear-gradient(155deg, #ffffff, #f0f9ff)',
                        badgeBg: '#e0f2fe',
                        badgeText: '#075985',
                        badgeBorder: '#38bdf8',
                        passiveBg: '#f0f9ff',
                        passiveBorder: '#7dd3fc',
                        passiveText: '#0c4a6e',
                      },
                      A: {
                        cardBg: 'linear-gradient(155deg, #ffffff, #f5f3ff)',
                        badgeBg: '#ede9fe',
                        badgeText: '#5b21b6',
                        badgeBorder: '#a78bfa',
                        passiveBg: '#f5f3ff',
                        passiveBorder: '#c4b5fd',
                        passiveText: '#4c1d95',
                      },
                      S: {
                        cardBg: 'linear-gradient(155deg, #ffffff, #fffbeb)',
                        badgeBg: '#fef3c7',
                        badgeText: '#92400e',
                        badgeBorder: '#f59e0b',
                        passiveBg: '#fffbeb',
                        passiveBorder: '#fcd34d',
                        passiveText: '#78350f',
                      },
                    };
                    const ltVis = lightTierStyles[part.tier];

                    return (
                      <div
                        key={part.id}
                        data-testid={`tuning-part-card-${part.id}`}
                        tabIndex={0}
                        role="button"
                        aria-disabled={isOverBudgetIfPicked}
                        title={
                          isOverBudgetIfPicked
                            ? `Không đủ CP! Cần giảm ${overByCP} CP ở bộ phận khác trước khi lắp ${part.name} (Tổng: ${wouldTotalCP}/${MAX_TUNING_CP} CP).`
                            : `Nhấn để lắp ${part.name} (Hạng ${part.tier} · ${part.cp} CP)`
                        }
                        onClick={() => handleSelectTuningPart(part)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectTuningPart(part);
                          }
                        }}
                        onMouseEnter={() => setHoveredTuningPart(part)}
                        onMouseLeave={() => setHoveredTuningPart(null)}
                        style={{
                          background: isEquipped
                            ? isLightUi
                              ? 'linear-gradient(155deg, #d1fae5, #ecfdf5)'
                              : 'linear-gradient(155deg, rgba(6, 78, 59, 0.45), rgba(10, 16, 32, 0.96))'
                            : isOverBudgetIfPicked
                            ? isLightUi
                              ? 'linear-gradient(155deg, #ffe4e6, #fff1f2)'
                              : 'linear-gradient(155deg, rgba(45, 14, 24, 0.35), rgba(10, 16, 32, 0.95))'
                            : isLightUi
                            ? ltVis.cardBg
                            : tVis.cardBg,
                          borderColor: isEquipped
                            ? '#10b981'
                            : isOverBudgetIfPicked
                            ? 'rgba(244, 63, 94, 0.55)'
                            : isLightUi
                            ? ltVis.badgeBorder
                            : tVis.cardBorder,
                        }}
                        className={`group relative p-2.5 rounded-xl border transition-all duration-150 flex flex-col justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee] ${
                          isFlashing ? 'animate-equip-flash' : ''
                        } ${
                          isOverBudgetIfPicked
                            ? 'opacity-70 cursor-not-allowed'
                            : 'cursor-pointer hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="space-y-1.5">
                          {/* ZONE 1: Combined Tier & CP Badge + Equip Status */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              style={{
                                background: isLightUi ? ltVis.badgeBg : tVis.badgeBg,
                                color: isLightUi ? ltVis.badgeText : tVis.badgeText,
                                borderColor: isLightUi ? ltVis.badgeBorder : tVis.badgeBorder,
                              }}
                              className="px-2 py-0.5 rounded-md border font-sci text-[10.5px] font-black tracking-wide shrink-0"
                            >
                              Hạng {part.tier} · {part.cp} CP
                            </span>

                            {isEquipped ? (
                              <span className="px-2 py-0.5 rounded-md bg-[#34d399] text-[#0a1020] font-sci text-[9.5px] font-black flex items-center gap-1 shadow-xs">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>ĐANG LẮP</span>
                              </span>
                            ) : isOverBudgetIfPicked ? (
                              <span className="px-1.5 py-0.5 rounded-md bg-rose-950/80 border border-[#f87171]/60 text-[#f87171] font-sci text-[9.5px] font-bold flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Thiếu CP</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono-num font-bold text-slate-400">
                                Tổng: {wouldTotalCP}/{MAX_TUNING_CP}
                              </span>
                            )}
                          </div>

                          {/* ZONE 2: Part Name */}
                          <div className="text-xs sm:text-[13px] font-extrabold text-white group-hover:text-[#67e8f9] transition-colors truncate">
                            {part.name}
                          </div>

                          {/* ZONE 3: Simplified Stat Chips (Name + Arrow + Number, no extra icon) */}
                          <div className="flex flex-wrap gap-1">
                            {statItems.map((st) => {
                              const meta = STAT_META[st.key];
                              const isPositive = st.val > 0;
                              return (
                                <span
                                  key={st.key}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-0.5 ${
                                    isPositive
                                      ? isLightUi
                                        ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                                        : 'bg-[#34d399]/15 border-[#34d399]/40 text-[#34d399]'
                                      : isLightUi
                                      ? 'bg-rose-100 border-rose-400 text-rose-800'
                                      : 'bg-[#f87171]/15 border-[#f87171]/40 text-[#f87171]'
                                  }`}
                                >
                                  <span>{meta.shortLabel}</span>
                                  <span className="font-mono-num font-extrabold">
                                    {isPositive
                                      ? `▲ +${st.val}`
                                      : `▼ ${st.val}`}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* ZONE 4: Compact Passive / Penalty Box (ONLY when part has a genuine passiveId) */}
                        {part.passiveId && part.passiveDesc && (
                          <div
                            style={
                              part.isPenalty
                                ? undefined
                                : {
                                    backgroundColor: isLightUi
                                      ? ltVis.passiveBg
                                      : tVis.passiveBg,
                                    borderColor: isLightUi
                                      ? ltVis.passiveBorder
                                      : tVis.passiveBorder,
                                    color: isLightUi
                                      ? ltVis.passiveText
                                      : tVis.passiveText,
                                  }
                            }
                            className={`p-1.5 rounded-lg border text-[10px] leading-tight flex items-start gap-1 ${
                              part.isPenalty
                                ? 'bg-rose-950/60 border-[#f87171]/40 text-rose-200'
                                : ''
                            }`}
                          >
                            {part.isPenalty ? (
                              <AlertTriangle className="w-3 h-3 text-[#f87171] shrink-0 mt-0.5" />
                            ) : (
                              <Sparkles
                                style={{ color: isLightUi ? ltVis.badgeText : tVis.color }}
                                className="w-3 h-3 shrink-0 mt-0.5"
                              />
                            )}
                            <div className="truncate">
                              <strong className="font-extrabold mr-1">
                                {part.passiveLabel || 'Nội tại'}:
                              </strong>
                              <span>{part.passiveDesc}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* =============================================================== */}
            {/* RIGHT 5 COLS: 5 SINGLE-LINE STAT BARS + EXPANDED TEST TRACK     */}
            {/* =============================================================== */}
            <div className="lg:col-span-5 flex flex-col h-full min-h-0 space-y-2 overflow-hidden">
              {/* 1. 5 Physics Stat Bars with ! Info Triggers & Smooth Tweening */}
              <div
                style={{ contain: 'layout' }}
                className="relative min-h-[174px] px-3 py-2 rounded-xl bg-[#0a1020]/95 border border-[#22d3ee]/30 flex flex-col justify-between shrink-0 shadow-[0_6px_20px_rgba(0,0,0,0.5)]"
              >
                <div className="flex items-center justify-between gap-2 h-5">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-[#22d3ee]" />
                    <span className="text-[10.5px] font-sci font-black text-white uppercase tracking-wider">
                      5 CHỈ SỐ VẬT LÝ
                    </span>
                    <span className="text-[9.5px] text-slate-400 hidden sm:inline">
                      (Nhấn ! để xem tác dụng)
                    </span>
                  </div>

                  <div className="h-5 flex items-center">
                    <span
                      className={`px-2 py-0.5 rounded-md bg-[#fbbf24]/15 border border-[#fbbf24]/50 text-[10px] font-bold text-[#fef08a] truncate max-w-[190px] transition-opacity duration-200 ${
                        hoveredSuggestedPreset || hoveredTuningPart
                          ? 'opacity-100'
                          : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      Thử:{' '}
                      {hoveredSuggestedPreset
                        ? hoveredSuggestedPreset.name
                        : hoveredTuningPart?.name}
                    </span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  {tuningStatBars.map((bar) => (
                    <AnimatedStatRow
                      key={bar.key}
                      statKey={bar.key}
                      shortAxis={bar.shortAxis}
                      label={bar.label}
                      desc={bar.desc}
                      baseRaw={bar.baseRaw}
                      currRaw={bar.currRaw}
                      baseBar={bar.baseBar}
                      currBar={bar.currBar}
                      isActiveInfo={activeStatInfoKey === bar.key}
                      onSelectInfo={(key) =>
                        setPinnedStatInfoKey((prev) =>
                          prev === key ? null : key
                        )
                      }
                      onHoverInfo={(key) => setHoveredStatInfoKey(key)}
                    />
                  ))}
                </div>

                {/* Floating Stat Impact Info Card when hovering or clicking ! */}
                {activeStatInfoKey && (
                  <div
                    data-testid={`stat-info-popover-${activeStatInfoKey}`}
                    className="mt-1.5 p-2.5 rounded-xl bg-[#060c18]/98 border border-[#fbbf24]/60 shadow-[0_12px_30px_rgba(0,0,0,0.85)] text-xs space-y-1 z-30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-sci font-black text-[#fef08a] text-[11px]">
                        ! {PHYSICS_STAT_DESCRIPTIONS[activeStatInfoKey].title}
                      </span>
                      {pinnedStatInfoKey && (
                        <button
                          type="button"
                          onClick={() => setPinnedStatInfoKey(null)}
                          className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                        >
                          Đóng ✕
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-200 leading-snug">
                      {PHYSICS_STAT_DESCRIPTIONS[activeStatInfoKey].impact}
                    </p>
                    <p className="text-[10.5px] text-[#67e8f9] leading-snug">
                      💡 {PHYSICS_STAT_DESCRIPTIONS[activeStatInfoKey].tip}
                    </p>
                  </div>
                )}
              </div>

              {/* 2. Expanded Live Tuning Test Track Canvas (60 FPS) */}
              <div
                style={{ contain: 'layout paint' }}
                className="flex-1 min-h-0 flex flex-col"
              >
                <LiveTuningTrack
                  cosmeticLoadout={student.loadout}
                  tuningLoadout={effectiveTuningLoadout}
                  isPreviewing={Boolean(hoveredTuningPart)}
                  previewPartName={hoveredTuningPart?.name || null}
                />
              </div>
            </div>
          </div>
        )}

        {/* Requirement #2: Floating corner toast auto-dismisses after 2s */}
        {tuningFeedback && (
          <div
            role="status"
            className={`fixed bottom-5 right-5 z-50 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xl border transition-all pointer-events-auto ${
              tuningFeedback.ok
                ? 'bg-[#06241a]/95 border-[#34d399]/70 text-[#a7f3d0] shadow-[0_4px_20px_rgba(52,211,153,0.3)]'
                : 'bg-[#2d0e18]/95 border-[#f87171]/70 text-rose-200 shadow-[0_4px_20px_rgba(248,113,113,0.3)]'
            }`}
          >
            <span>{tuningFeedback.text}</span>
            <button
              type="button"
              onClick={() => setTuningFeedback(null)}
              className="ml-1 opacity-70 hover:opacity-100 cursor-pointer"
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

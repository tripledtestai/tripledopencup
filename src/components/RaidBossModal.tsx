import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  Key,
  MapPin,
  Moon,
  Settings,
  Shuffle,
  Sun,
  Swords,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  ALL_PARTS,
  DEFAULT_TUNING_LOADOUT,
  MAPS,
  PHYSICS_STAT_DESCRIPTIONS,
  PLAYER_TITLES,
  RAID_BOSSES,
  TIER_COLORS,
} from '../game/constants';
import { drawModularCar } from '../game/carRenderer';
import {
  buildComputedStats,
  calculateCarClass,
  calculateTuningSummary,
  isNightMapTheme,
  normalizeTuningPresets,
} from '../game/rules';
import {
  RaidBossConfig,
  RaidBossId,
  StudentAccount,
  TuningLoadout,
  TuningPreset,
  TuningStats,
} from '../game/types';
import { soundEngine } from '../services/sound';
import { MapPreviewCanvas } from './MapPreviewCanvas';

interface RaidBossModalProps {
  student: StudentAccount;
  isTeacher?: boolean;
  onUpdateStudent: (next: StudentAccount) => void;
  onStartSoloRaid: (params: {
    bossId: RaidBossId;
    mapId: string;
    laps: number;
    bossControlMode: 'ai' | 'player_weapon';
  }) => void;
  onCreateCoopRaidRoom: (params: {
    bossId: RaidBossId;
    mapId: string;
    laps: number;
    bossControlMode: 'ai' | 'player_weapon';
    isTeacherMassRaid?: boolean;
  }) => void;
  onJoinCoopRaidByPin: (pin: string) => void;
  onOpenGarageTuning: () => void;
  onClose: () => void;
}

const BOSS_SHORT_EFFECTS: Record<RaidBossId, [string, string]> = {
  tuan_anh: [
    'Tốc độ đường thẳng cực đại, mỗi 9s khóa mục tiêu bắn Chùm 3 Tên Lửa Tầm Nhiệt.',
    'Rải Vệt Lửa Nitro phía sau đuôi xe gây cháy động cơ xe bám đuôi.',
  ],
  mai_khanh: [
    'Mỗi 10s phóng Sóng Xung Kích Hàn Băng đóng băng tay lái xe xung quanh.',
    'Tạo vùng tuyết trơn trượt làm giảm tốc độ và độ bám đường của đối thủ.',
  ],
  hanh_dung: [
    'Mỗi 8s rải Bẫy Hoa Độc Sinh Học làm nhiễu loạn hệ thống lái.',
    'Kích hoạt Khiên Sinh Học Hồng Ngọc hấp thụ sát thương trong thời gian ngắn.',
  ],
  minh_dang: [
    'Mỗi 7s giáng Tia Sét Phân Tử ATP diện rộng làm tê liệt hệ thống điện.',
    'Kích hoạt Cuồng Nộ Hoàng Kim (2 Phase) tăng vọt tốc độ và lực húc.',
  ],
};

export const RaidBossModal: React.FC<RaidBossModalProps> = ({
  student,
  isTeacher = false,
  onUpdateStudent,
  onStartSoloRaid,
  onCreateCoopRaidRoom,
  onJoinCoopRaidByPin,
  onOpenGarageTuning,
  onClose,
}) => {
  const [selectedBossId, setSelectedBossId] = useState<RaidBossId>('tuan_anh');
  const selectedBoss: RaidBossConfig = useMemo(
    () => RAID_BOSSES.find((b) => b.id === selectedBossId) || RAID_BOSSES[0],
    [selectedBossId]
  );

  const [selectedMapId, setSelectedMapId] = useState<string>(
    RAID_BOSSES[0].recommendedMapId
  );
  const [laps, setLaps] = useState<number>(3);
  const [bossControlMode, setBossControlMode] = useState<
    'ai' | 'player_weapon'
  >('ai');
  const [joinPinInput, setJoinPinInput] = useState<string>('');
  const [showTrackModal, setShowTrackModal] = useState<boolean>(false);
  const [activeStatInfo, setActiveStatInfo] = useState<keyof TuningStats | null>(
    null
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleSelectBoss = (boss: RaidBossConfig) => {
    soundEngine.playCoin();
    setSelectedBossId(boss.id);
    setSelectedMapId(boss.recommendedMapId);
  };

  // High-DPI 60 FPS Cyber Turntable Boss Showcase Canvas (NO ugly oversized nameplate!)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const startMs = performance.now();

    // Floating cyber particles
    const particles = Array.from({ length: 18 }, (_, i) => ({
      x: ((i * 53) % 100) / 100,
      y: ((i * 29) % 100) / 100,
      size: 1.5 + (i % 3) * 0.9,
      speedY: 0.08 + (i % 4) * 0.03,
      phase: i * 0.7,
    }));

    const render = (nowMs: number) => {
      const nowSec = (nowMs - startMs) / 1000;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(260, canvas.clientWidth || 480);
      const cssH = Math.max(120, canvas.clientHeight || 165);
      if (
        canvas.width !== Math.floor(cssW * dpr) ||
        canvas.height !== Math.floor(cssH * dpr)
      ) {
        canvas.width = Math.floor(cssW * dpr);
        canvas.height = Math.floor(cssH * dpr);
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const cx = cssW * 0.5;
      const cy = cssH * 0.54;

      const isLightMode = document.documentElement.classList.contains('theme-light');

      // 1. Deep Cyber Navy Background + Element Radial Glow
      ctx.fillStyle = isLightMode ? '#ffffff' : '#060a14';
      ctx.fillRect(0, 0, cssW, cssH);

      const bgGrad = ctx.createRadialGradient(
        cx,
        cy,
        8,
        cx,
        cy,
        Math.max(cssW, cssH) * 0.62
      );
      bgGrad.addColorStop(0, selectedBoss.glowColor);
      bgGrad.addColorStop(0.5, isLightMode ? 'rgba(241, 245, 249, 0.88)' : 'rgba(10, 15, 28, 0.88)');
      bgGrad.addColorStop(1, isLightMode ? '#e2e8f0' : '#060a14');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, cssW, cssH);

      // 2. Subtle Cyber Grid
      ctx.strokeStyle = isLightMode ? 'rgba(148, 163, 184, 0.22)' : 'rgba(56, 189, 248, 0.07)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < cssW; gx += 28) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, cssH);
        ctx.stroke();
      }
      for (let gy = 0; gy < cssH; gy += 28) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(cssW, gy);
        ctx.stroke();
      }

      // 3. Floating Element Particles
      for (const p of particles) {
        const py = ((p.y - nowSec * p.speedY) % 1 + 1) % 1;
        const px = p.x + Math.sin(nowSec * 1.4 + p.phase) * 0.025;
        const alpha = 0.25 + 0.55 * Math.sin(py * Math.PI);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = selectedBoss.accentColor;
        ctx.shadowColor = selectedBoss.accentColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(px * cssW, py * cssH, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 4. Cyber Turntable Rings (matching WarmupCanvas style)
      const ringRadius = Math.min(cssW * 0.24, cssH * 0.42, 68);
      ctx.save();
      ctx.translate(cx, cy);

      // Outer glowing ring
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = selectedBoss.accentColor;
      ctx.shadowColor = selectedBoss.accentColor;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner rotating dashed ring
      ctx.shadowBlur = 0;
      ctx.rotate(nowSec * 0.45);
      ctx.strokeStyle = selectedBoss.accentColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([10, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 5. Draw Boss Car cleanly on turntable (NO username parameter so no giant floating banner covers the car!)
      drawModularCar(ctx, selectedBoss.loadout, {
        x: cx,
        y: cy,
        angle: nowSec * 0.55,
        scale: 1.55,
        nowSec,
        nitroActive: true,
        showHeadlightBeams: true,
        isBoss: true,
        bossId: selectedBoss.id,
        bossPhase: selectedBoss.id === 'minh_dang' ? 2 : 1,
        bossShieldActive: selectedBoss.id === 'hanh_dung',
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [selectedBoss]);

  const tuningPresets = useMemo(
    () => normalizeTuningPresets(student.tuningPresets, student.id),
    [student.tuningPresets, student.id]
  );

  const activePresetIdx =
    typeof student.activePresetIndex === 'number' &&
    student.activePresetIndex >= 0 &&
    student.activePresetIndex < 3
      ? student.activePresetIndex
      : 0;

  const currentTuningLoadout: TuningLoadout =
    student.tuningLoadout || DEFAULT_TUNING_LOADOUT;
  const currentTuningSummary = useMemo(
    () => calculateTuningSummary(currentTuningLoadout),
    [currentTuningLoadout]
  );

  const chassisPart =
    ALL_PARTS.find((p) => p.id === student.loadout.chassis) || ALL_PARTS[0];
  const carClassInfo = calculateCarClass(student.loadout);
  const tierStyle = TIER_COLORS[carClassInfo.tier];

  const statBars: { key: keyof TuningStats; label: string; val: number }[] = [
    { key: 'topSpeed', label: 'Tốc độ', val: currentTuningSummary.bars.topSpeed },
    { key: 'accel', label: 'Gia tốc', val: currentTuningSummary.bars.accel },
    { key: 'handling', label: 'Độ cua', val: currentTuningSummary.bars.handling },
    { key: 'nitro', label: 'Nitro', val: currentTuningSummary.bars.nitro },
    { key: 'weight', label: 'Cân nặng', val: currentTuningSummary.bars.weight },
  ];

  const handleSelectPreset = (slotIdx: number) => {
    soundEngine.playCoin();
    const existing = tuningPresets[slotIdx];
    if (existing && existing.loadout) {
      const nextCarLoadout = existing.carLoadout
        ? { ...existing.carLoadout }
        : { ...student.loadout };
      const nextTuning = { ...existing.loadout };
      onUpdateStudent({
        ...student,
        loadout: nextCarLoadout,
        tuningLoadout: nextTuning,
        computedStats: buildComputedStats(nextTuning),
        tuningPresets,
        activePresetIndex: slotIdx,
      });
    } else {
      const newPreset: TuningPreset = {
        id: slotIdx,
        name: `Preset ${slotIdx + 1}`,
        loadout: { ...currentTuningLoadout },
        carLoadout: { ...student.loadout },
        totalCP: currentTuningSummary.totalCP,
        updatedAt: Date.now(),
      };
      const nextPresets = [...tuningPresets];
      nextPresets[slotIdx] = newPreset;
      try {
        localStorage.setItem(
          `tripled_tuning_presets_${student.id}`,
          JSON.stringify(nextPresets)
        );
      } catch {}
      onUpdateStudent({
        ...student,
        tuningPresets: nextPresets,
        activePresetIndex: slotIdx,
        computedStats: buildComputedStats(currentTuningLoadout),
      });
    }
  };

  const defeatedList = student.defeatedBosses || [];
  const isBossDefeated = defeatedList.includes(selectedBoss.id);
  const rewardTitle = PLAYER_TITLES.find(
    (t) => t.id === selectedBoss.rewardTitleId
  );

  const selectedMapObj =
    MAPS.find((m) => m.id === selectedMapId) || MAPS[0];
  const isCurrentMapNight = isNightMapTheme(selectedMapObj.theme);
  const bossSkillLines =
    BOSS_SHORT_EFFECTS[selectedBoss.id] || BOSS_SHORT_EFFECTS.tuan_anh;

  const handleRandomMap = () => {
    const others = MAPS.filter((m) => m.id !== selectedMapId);
    const pick = others[Math.floor(Math.random() * others.length)] || MAPS[0];
    setSelectedMapId(pick.id);
    soundEngine.playCoin();
  };

  return (
    <div
      data-testid="raid-boss-modal"
      className="fixed inset-0 z-50 bg-[#060911] text-white p-2 sm:p-4 md:p-6 flex flex-col justify-center items-center select-none overflow-hidden"
    >
      {/* Top Red/Orange Ambient Glow for Boss Raid */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-35">
        <div className="absolute -top-36 left-1/4 w-[560px] h-[420px] rounded-full bg-gradient-to-br from-rose-600/70 to-amber-500/50 blur-[150px]" />
        <div className="absolute bottom-0 right-1/5 w-[480px] h-[480px] rounded-full bg-[#F59E0B]/30 blur-[150px]" />
      </div>

      {/* Main Frame matching LobbyView: Navy #0a0f1c, ~28px radius, subtle glowing border */}
      <div className="relative z-10 w-[94vw] max-w-7xl h-[86vh] min-h-[600px] max-h-[860px] my-auto flex flex-col space-y-3 p-3.5 md:p-5 rounded-[28px] bg-[#0a0f1c]/95 border border-rose-500/30 shadow-[0_24px_80px_rgba(0,0,0,0.92),0_0_40px_rgba(244,63,94,0.1)] overflow-hidden">
        {/* ================================================================= */}
        {/* 1. COMPACT TOP HEADER BAR (PILL CHIPS)                            */}
        {/* ================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 rounded-2xl bg-[#090D16] border border-slate-800 shadow-md shrink-0">
          {/* Left: Back Button + Mode Chip with Mini Progress Bar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              title="Quay lại sảnh chính"
              className="px-2.5 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs cursor-pointer inline-flex items-center gap-1 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="hidden sm:inline">Sảnh</span>
            </button>

            <div className="flex items-center gap-2 bg-[#0F172A] px-2.5 py-1 rounded-xl border border-slate-800">
              <span className="text-xs font-black text-rose-400 flex items-center gap-1">
                <span>🔥</span>
                <span>Săn Trùm</span>
              </span>
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-700/80">
                <span className="text-[11px] font-mono-num font-bold text-amber-300">
                  {defeatedList.length}/4 Đã hạ
                </span>
                <div className="w-10 h-1.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500"
                    style={{ width: `${(defeatedList.length / 4) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Center: Unified PIN Co-op Input-Group + Compact AI Toggle Switch */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (joinPinInput.trim().length >= 4) {
                  soundEngine.playCoin();
                  onJoinCoopRaidByPin(joinPinInput.trim());
                }
              }}
              className="inline-flex items-center rounded-xl bg-[#040814] border border-cyan-500/40 focus-within:border-[#38BDF8] overflow-hidden shadow-inner"
            >
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={joinPinInput}
                onChange={(e) =>
                  setJoinPinInput(e.target.value.replace(/\D/g, ''))
                }
                placeholder="Nhập PIN Co-op..."
                className="w-28 px-2.5 py-1 bg-transparent font-mono-num text-xs font-bold text-[#38BDF8] placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-[#06B6D4] hover:bg-[#38BDF8] text-[#090D16] font-black text-xs cursor-pointer shrink-0 transition-colors flex items-center gap-1"
              >
                <Key className="w-3 h-3" />
                <span>Vào Phòng</span>
              </button>
            </form>

            {/* Compact Toggle Switch for AI Boss Control */}
            <div className="flex items-center gap-1.5 bg-[#0F172A] px-2.5 py-1 rounded-xl border border-slate-800">
              <button
                type="button"
                data-testid="boss-control-ai-btn"
                onClick={() => {
                  soundEngine.playCoin();
                  if (isTeacher) {
                    setBossControlMode((prev) =>
                      prev === 'ai' ? 'player_weapon' : 'ai'
                    );
                  } else {
                    setBossControlMode('ai');
                  }
                }}
                title={
                  isTeacher
                    ? 'Bấm để chuyển đổi: AI Tự Động hoặc Giáo Viên Chỉ Huy Vũ Khí (SPACE)'
                    : 'AI tự động điều khiển Boss và xả chiêu theo chu kỳ'
                }
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <div
                  className={`w-7 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                    bossControlMode === 'ai'
                      ? 'bg-emerald-500/30 border border-emerald-400/70 justify-end'
                      : 'bg-amber-500/30 border border-amber-400/70 justify-start'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shadow transition-transform ${
                      bossControlMode === 'ai'
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] font-bold ${
                    bossControlMode === 'ai'
                      ? 'text-emerald-300'
                      : 'text-amber-300'
                  }`}
                >
                  {bossControlMode === 'ai'
                    ? 'AI Tự Động'
                    : 'Chỉ Huy Boss (SPACE)'}
                </span>
              </button>
              {isTeacher && (
                <button
                  type="button"
                  data-testid="boss-control-weapon-btn"
                  onClick={() => {
                    soundEngine.playCoin();
                    setBossControlMode('player_weapon');
                  }}
                  className="sr-only"
                >
                  Chỉ Huy Vũ Khí Boss
                </button>
              )}
            </div>
          </div>

          {/* Right: Secondary Co-op Button + Primary Solo Raid CTA */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="create-coop-raid-room-btn"
              onClick={() => {
                soundEngine.playCoin();
                onCreateCoopRaidRoom({
                  bossId: selectedBoss.id,
                  mapId: selectedMapId,
                  laps,
                  bossControlMode,
                  isTeacherMassRaid: isTeacher,
                });
              }}
              className="px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#38BDF8] border border-cyan-500/50 font-black text-xs cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isTeacher ? 'Mở Giải Săn Boss' : 'Tạo Phòng Co-op'}</span>
            </button>

            <button
              type="button"
              data-testid="start-solo-raid-btn"
              onClick={() => {
                soundEngine.playCountdownGo();
                onStartSoloRaid({
                  bossId: selectedBoss.id,
                  mapId: selectedMapId,
                  laps,
                  bossControlMode,
                });
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#F59E0B] hover:brightness-110 text-[#090D16] font-black text-xs sm:text-sm tracking-wide uppercase shadow-[0_0_20px_rgba(245,158,11,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Swords className="w-4 h-4" />
              <span>ĐÁNH SOLO</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. MAIN 2-COLUMN CONTENT (6 COLS LEFT + 6 COLS RIGHT)             */}
        {/* ================================================================= */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch overflow-hidden">
          {/* LEFT COLUMN: TRACK & LAPS CARD + 4 BOSS CARDS */}
          <div className="lg:col-span-6 flex flex-col h-full min-h-0 space-y-3">
            {/* Separate Track + Laps Card (Matches LobbyView Track Card + Segmented Laps) */}
            <div className="w-full px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] border border-[#06B6D4]/50 flex flex-wrap items-center justify-between gap-2.5 shadow-md shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-xl bg-[#090D16] border border-[#06B6D4]/60 flex items-center justify-center shrink-0 text-[#38BDF8]">
                  <MapPin className="w-4 h-4 text-[#38BDF8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                    <span className="truncate">{selectedMapObj.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-black shrink-0 flex items-center gap-1 ${
                        isCurrentMapNight
                          ? 'bg-sky-950 text-[#38BDF8] border border-sky-400/40'
                          : 'bg-amber-950 text-[#FEF08A] border border-amber-400/40'
                      }`}
                    >
                      {isCurrentMapNight ? (
                        <>
                          <Moon className="w-2.5 h-2.5 text-[#38BDF8]" />
                          <span>ĐÊM</span>
                        </>
                      ) : (
                        <>
                          <Sun className="w-2.5 h-2.5 text-[#FEF08A]" />
                          <span>NGÀY</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="text-[10.5px] font-mono-num text-slate-300 mt-0.5 flex items-center gap-2">
                    <span className="text-[#38BDF8] font-bold">
                      {laps} Vòng
                    </span>
                    <span>·</span>
                    <span className="text-[#FEF08A] font-bold">
                      Thưởng: +60 Xu Raid
                    </span>
                  </div>
                </div>
              </div>

              {/* Right side of Track Card: Segmented Laps Control + Đổi Map Button */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-[#090D16] p-0.5 rounded-xl border border-slate-800">
                  {[2, 3, 4, 5].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => {
                        soundEngine.playCoin();
                        setLaps(l);
                      }}
                      className={`px-2 py-1 rounded-lg font-mono-num text-[11px] font-black transition-all cursor-pointer ${
                        laps === l
                          ? 'bg-[#06B6D4] text-[#090D16] shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {l}V
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playCoin();
                    setShowTrackModal(true);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#06B6D4] hover:bg-[#38BDF8] text-[#090D16] text-xs font-black shrink-0 flex items-center gap-1 transition-colors shadow cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Đổi Map</span>
                </button>
              </div>
            </div>

            {/* 4 Boss Cards Panel (Zero Horizontal Scroll, No Clipped HP Badge) */}
            <div className="p-3.5 rounded-2xl bg-[#0F172A]/95 border border-slate-700/80 flex-1 flex flex-col min-h-0 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔥</span>
                    <span>Tứ Đại Boss TripleD</span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#090D16] border border-rose-500/50 font-mono-num text-xs font-black text-rose-400">
                      4
                    </span>
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-300">
                  Cùng 1 Phe · Kích thước x1.5 – x1.6
                </span>
              </div>

              <div className="flex-1 min-h-0 grid grid-rows-4 gap-2 overflow-y-auto overflow-x-hidden pr-0.5 custom-scrollbar">
                {RAID_BOSSES.map((boss) => {
                  const isSelected = boss.id === selectedBoss.id;
                  const defeated = defeatedList.includes(boss.id);
                  const tDef = PLAYER_TITLES.find(
                    (t) => t.id === boss.rewardTitleId
                  );

                  return (
                    <button
                      key={boss.id}
                      type="button"
                      data-testid={`select-raid-boss-${boss.id}`}
                      onClick={() => handleSelectBoss(boss)}
                      style={{
                        borderColor: isSelected
                          ? boss.accentColor
                          : 'rgba(51, 65, 85, 0.8)',
                        boxShadow: isSelected
                          ? `0 0 18px ${boss.glowColor}`
                          : undefined,
                      }}
                      className={`w-full min-w-0 px-3 py-2 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex items-center justify-between gap-2.5 overflow-hidden ${
                        isSelected ? 'bg-[#0F172A]' : 'bg-[#090D16]'
                      }`}
                    >
                      {/* Left: Round Glowing Element Icon + Boss Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          style={{
                            borderColor: boss.accentColor,
                            backgroundColor: `${boss.accentColor}24`,
                            boxShadow: `0 0 14px ${boss.glowColor}`,
                          }}
                          className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg shrink-0"
                        >
                          {boss.badgeIcon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              style={{ color: boss.accentColor }}
                              className="font-sci text-xs sm:text-sm font-black uppercase truncate"
                            >
                              BOSS {boss.order}: {boss.name}
                            </span>
                            <span className="text-[10.5px] font-bold text-slate-300 shrink-0">
                              · {boss.gender} · x{boss.scale}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-300 truncate mt-0.5">
                            <span className="font-bold text-white">
                              Chiêu ({boss.skillCycleSec}s):
                            </span>{' '}
                            {boss.skillName}
                          </div>

                          {tDef && (
                            <div className="mt-1 flex items-center">
                              <span
                                style={{
                                  color: tDef.color,
                                  borderColor: `${tDef.color}55`,
                                  backgroundColor: `${tDef.color}15`,
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md border text-[10px] font-extrabold truncate max-w-full"
                              >
                                <span>🎁</span>
                                <span className="truncate">{tDef.badgeText}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Non-clipped HP Badge + Status */}
                      <div className="shrink-0 flex flex-col items-end justify-center gap-1 pl-1">
                        <span className="whitespace-nowrap font-mono-num text-[10.5px] font-black text-rose-200 bg-rose-950/90 border border-rose-500/50 px-2 py-0.5 rounded-lg shadow-sm">
                          {boss.hpPerPlayer} HP/người
                        </span>
                        {defeated ? (
                          <span className="whitespace-nowrap text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>Đã hạ</span>
                          </span>
                        ) : (
                          <span className="whitespace-nowrap text-[10px] font-mono-num font-bold text-[#FEF08A]">
                            +60 Xu Raid
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CYBER BOSS SHOWCASE PANEL + COMPACT CAR STATS & P1/P2/P3 */}
          <div className="lg:col-span-6 flex flex-col h-full min-h-0">
            <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[#06B6D4]/40 bg-[#090D16] flex flex-col justify-between shadow-2xl">
              {/* Top Section: Boss Showcase Stage */}
              <div className="flex-1 min-h-0 flex flex-col justify-between p-3.5 space-y-2.5 overflow-y-auto custom-scrollbar">
                {/* Boss Showcase Header */}
                <div className="flex items-start justify-between gap-2 shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          borderColor: selectedBoss.accentColor,
                          backgroundColor: `${selectedBoss.accentColor}25`,
                        }}
                        className="w-7 h-7 rounded-full border flex items-center justify-center text-sm shrink-0"
                      >
                        {selectedBoss.badgeIcon}
                      </span>
                      <h3
                        style={{ color: selectedBoss.accentColor }}
                        className="font-sci text-sm sm:text-base font-black uppercase tracking-wide truncate"
                      >
                        {selectedBoss.name}
                      </h3>
                    </div>
                    <div className="text-xs font-bold text-slate-300 mt-0.5 truncate">
                      &ldquo;{selectedBoss.title}&rdquo; · {selectedBoss.hpPerPlayer}{' '}
                      HP/người
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-lg bg-[#0F172A] border border-amber-400/50 font-mono-num text-[11px] font-black text-[#FEF08A]">
                      Chiêu: {selectedBoss.skillCycleSec}s
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#0F172A] border border-rose-500/50 font-mono-num text-[11px] font-black text-rose-300">
                      Xe SSS x{selectedBoss.scale}
                    </span>
                  </div>
                </div>

                {/* Cyber Turntable Boss Showcase Canvas */}
                <div
                  style={{ borderColor: `${selectedBoss.accentColor}55` }}
                  className="relative flex-1 min-h-[125px] rounded-2xl overflow-hidden border bg-[#060a14] flex items-center justify-center shadow-inner"
                >
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full block"
                  />
                  {/* Element Badge Chip top-left */}
                  <div className="absolute top-2 left-2.5 px-2.5 py-0.5 rounded-lg bg-slate-950/85 border border-slate-700/80 text-[10px] font-bold text-slate-200 flex items-center gap-1">
                    <span>{selectedBoss.badgeIcon}</span>
                    <span>Hệ {selectedBoss.title}</span>
                  </div>
                </div>

                {/* 3 Short Icon + Text Skill Lines + 3 Stat-Chips */}
                <div className="p-2.5 rounded-xl bg-[#0F172A]/90 border border-slate-800 space-y-2 shrink-0">
                  <div className="space-y-1 text-xs text-slate-200">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0">🔥</span>
                      <span className="truncate">
                        <b className="text-[#FEF08A]">Chiêu cuối:</b>{' '}
                        {selectedBoss.skillName} (Chu kỳ {selectedBoss.skillCycleSec}s)
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="shrink-0">⚡</span>
                      <span className="line-clamp-1 text-slate-300">
                        <b className="text-cyan-300">Cơ chế:</b> {bossSkillLines[0]}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="shrink-0">🛡️</span>
                      <span className="line-clamp-1 text-slate-300">
                        <b className="text-rose-300">Đặc tính:</b> {bossSkillLines[1]}
                      </span>
                    </div>
                  </div>

                  {/* 3 Stat-Chips */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800/80">
                    <div className="px-2 py-1 rounded-lg bg-[#090D16] border border-rose-500/40 text-center">
                      <div className="text-[10px] text-slate-400 font-semibold">
                        🚀 Tên lửa
                      </div>
                      <div className="font-mono-num text-[11px] font-black text-rose-300">
                        -150 HP
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-[#090D16] border border-amber-500/40 text-center">
                      <div className="text-[10px] text-slate-400 font-semibold">
                        💥 Húc trực diện
                      </div>
                      <div className="font-mono-num text-[11px] font-black text-[#FEF08A]">
                        -100..250 HP
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-[#090D16] border border-cyan-500/40 text-center">
                      <div className="text-[10px] text-slate-400 font-semibold">
                        ⚡ Phá giáp
                      </div>
                      <div className="font-mono-num text-[11px] font-black text-[#38BDF8]">
                        Sập nguồn 6s
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compact Reward Banner */}
                {rewardTitle && (
                  <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-950/60 via-[#0F172A] to-amber-950/60 border border-amber-400/40 flex items-center justify-between gap-2 shrink-0">
                    <div className="text-xs truncate flex items-center gap-1.5">
                      <span>🎁</span>
                      <span className="text-slate-300 font-semibold">
                        Thưởng Hạ Trùm:
                      </span>
                      <span
                        style={{ color: rewardTitle.color }}
                        className="font-black truncate"
                      >
                        {rewardTitle.badgeText}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-[10.5px] font-mono-num font-black text-[#34D399] shrink-0">
                      {isBossDefeated ? '✓ ĐÃ HẠ · +60 XU' : '+60 XU RAID'}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Panel: Compact Car Stats + [Độ Máy] + PRESET P1/P2/P3 (Identical to WarmupCanvas) */}
              <div className="relative z-10 p-3 bg-[#090D16] border-t border-slate-800/90 space-y-2 shrink-0">
                {/* Car Name & Class Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      style={{
                        backgroundColor: tierStyle.bg,
                        color: tierStyle.text,
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-black border border-white/20 shadow-sm shrink-0"
                    >
                      CLASS {carClassInfo.tier}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-white truncate">
                      {chassisPart.name}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono-num font-bold text-[#38BDF8] bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40 shrink-0">
                    {currentTuningSummary.totalCP}/25 CP
                  </span>
                </div>

                {/* 5 Mini Stat Bars */}
                <div className="relative grid grid-cols-5 gap-1.5 pt-0.5">
                  {statBars.map((s) => {
                    const isInfoOpen = activeStatInfo === s.key;
                    return (
                      <div key={s.key} className="space-y-0.5">
                        <div className="flex items-center justify-between gap-0.5 text-[9px] font-bold text-slate-300">
                          <span className="truncate">{s.label}</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <span className="font-mono-num text-[#38BDF8] text-[8.5px]">
                              {s.val}%
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setActiveStatInfo((prev) =>
                                  prev === s.key ? null : s.key
                                )
                              }
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
                    </div>
                  )}
                </div>

                {/* Actions Row: [🔧 Mở Xưởng Độ Máy] + Compact PRESET P1 / P2 / P3 */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={onOpenGarageTuning}
                    className="px-2.5 py-1 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-cyan-500/50 text-[#38BDF8] text-[11px] font-black cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Mở Xưởng Độ Máy</span>
                  </button>

                  <div className="flex items-center gap-1 bg-slate-900/90 px-1.5 py-1 rounded-xl border border-slate-800">
                    <span className="text-[9.5px] font-black text-slate-400 mr-0.5">
                      PRESET:
                    </span>
                    {[0, 1, 2].map((slotIdx) => {
                      const preset = tuningPresets[slotIdx];
                      const isAct = activePresetIdx === slotIdx;
                      return (
                        <button
                          key={slotIdx}
                          type="button"
                          data-testid={`raid-quick-preset-${slotIdx + 1}`}
                          onClick={() => handleSelectPreset(slotIdx)}
                          title={
                            preset
                              ? `${preset.name} (${preset.totalCP}/25 CP)`
                              : `Preset ${slotIdx + 1}`
                          }
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            isAct
                              ? 'bg-[#06B6D4] text-[#090D16] shadow'
                              : 'bg-slate-800 text-cyan-300 hover:text-white border border-slate-700'
                          }`}
                        >
                          P{slotIdx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TRACK SELECTION POPUP MODAL (Matches LobbyView Track Modal)       */}
        {/* ================================================================= */}
        {showTrackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 select-none">
            <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto custom-scrollbar rounded-3xl bg-[#0B1120] border-2 border-[#06B6D4] p-4 sm:p-5 space-y-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4]/50 flex items-center justify-center">
                    <Compass className="w-4 h-4 text-[#38BDF8]" />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                    Chọn Đường Đua Săn Trùm ({MAPS.length} Maps)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRandomMap}
                    className="px-2.5 py-1.5 rounded-xl bg-[#090D16] hover:bg-[#06B6D4]/20 border border-slate-700 text-[#38BDF8] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Ngẫu Nhiên</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTrackModal(false)}
                    className="w-8 h-8 rounded-xl bg-[#090D16] hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer border border-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-[#06B6D4]/40 bg-[#060D1A]">
                <MapPreviewCanvas
                  map={selectedMapObj}
                  width={620}
                  height={185}
                  className="w-full h-44 block"
                  animatedPaceCar={true}
                  showHazards={true}
                  cyberStyle={true}
                />
                <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-cyan-500/40 text-xs font-black text-white">
                  {selectedMapObj.name}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {MAPS.map((m, idx) => {
                  const isSel = selectedMapId === m.id;
                  const cleanName = m.name.replace(/^Map \d+ – /, '');
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playCoin();
                        setSelectedMapId(m.id);
                      }}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        isSel
                          ? 'bg-[#06B6D4]/20 border-[#38BDF8] text-white shadow'
                          : 'bg-[#090D16] border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono-num font-black">
                        <span
                          className={
                            isSel ? 'text-[#38BDF8]' : 'text-slate-400'
                          }
                        >
                          MAP {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                        {m.shortcut && (
                          <Zap className="w-2.5 h-2.5 text-amber-400 fill-current" />
                        )}
                      </div>
                      <div className="text-[11px] font-bold truncate mt-1">
                        {cleanName}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowTrackModal(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#F59E0B] text-[#090D16] font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg"
              >
                Xác Nhận Đường Đua
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

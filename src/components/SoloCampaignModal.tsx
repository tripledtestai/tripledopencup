import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Compass,
  Flag,
  Lock,
  Play,
  Star,
  Trophy,
  Wrench,
  X,
} from 'lucide-react';
import {
  ALL_PARTS,
  DEFAULT_TUNING_LOADOUT,
  MAPS,
  PHYSICS_STAT_DESCRIPTIONS,
  PLAYER_TITLES,
  SOLO_CAMPAIGN_CHAPTERS,
  SOLO_CAMPAIGN_LEVELS,
  TIER_COLORS,
} from '../game/constants';
import {
  buildComputedStats,
  calculateCarClass,
  calculateTuningSummary,
  getCampaignStarCoins,
  normalizeTuningPresets,
} from '../game/rules';
import {
  CampaignLevelConfig,
  StudentAccount,
  TuningLoadout,
  TuningPreset,
  TuningStats,
} from '../game/types';
import { soundEngine } from '../services/sound';
import { MapPreviewCanvas } from './MapPreviewCanvas';

interface SoloCampaignModalProps {
  student: StudentAccount;
  onUpdateStudent: (next: StudentAccount) => void;
  onStartCampaignLevel: (levelConfig: CampaignLevelConfig) => void;
  onOpenGarageTuning: () => void;
  onClose: () => void;
}

export const SoloCampaignModal: React.FC<SoloCampaignModalProps> = ({
  student,
  onUpdateStudent,
  onStartCampaignLevel,
  onOpenGarageTuning,
  onClose,
}) => {
  const progressMap = student.campaignProgress || {};

  const isLevelUnlocked = (lvl: number) => {
    if (lvl === 1) return true;
    const prev = progressMap[lvl - 1];
    return Boolean(prev?.cleared || (prev?.stars || 0) >= 1);
  };

  const highestUnlockedLevel = useMemo(() => {
    let maxLvl = 1;
    for (let i = 1; i <= 50; i++) {
      const prev = progressMap[i];
      if (prev?.cleared || (prev?.stars || 0) >= 1) {
        maxLvl = Math.min(50, i + 1);
      }
    }
    return maxLvl;
  }, [progressMap]);

  const [selectedChapter, setSelectedChapter] = useState<number>(() =>
    Math.ceil(highestUnlockedLevel / 10)
  );
  const [selectedLevelNum, setSelectedLevelNum] = useState<number>(
    () => highestUnlockedLevel
  );
  const [activeStatInfo, setActiveStatInfo] = useState<keyof TuningStats | null>(
    null
  );

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

  const chapterLevels = useMemo(
    () =>
      SOLO_CAMPAIGN_LEVELS.filter((lvl) => lvl.chapter === selectedChapter),
    [selectedChapter]
  );

  const selectedLevel = useMemo(
    () =>
      SOLO_CAMPAIGN_LEVELS.find((l) => l.level === selectedLevelNum) ||
      SOLO_CAMPAIGN_LEVELS[0],
    [selectedLevelNum]
  );

  const selectedMap = useMemo(
    () => MAPS.find((m) => m.id === selectedLevel.mapId) || MAPS[0],
    [selectedLevel]
  );

  const totalStarsEarned = useMemo(() => {
    let sum = 0;
    for (let i = 1; i <= 50; i++) {
      sum += progressMap[i]?.stars || 0;
    }
    return sum;
  }, [progressMap]);

  const totalLevelsCleared = useMemo(() => {
    let count = 0;
    for (let i = 1; i <= 50; i++) {
      if (progressMap[i]?.cleared) count++;
    }
    return count;
  }, [progressMap]);

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

  const selectedLvlProgress = progressMap[selectedLevel.level];
  const isSelectedCleared = Boolean(selectedLvlProgress?.cleared);
  const isSelectedUnlocked = isLevelUnlocked(selectedLevel.level);
  const milestoneTitle = selectedLevel.unlocksTitleId
    ? PLAYER_TITLES.find((t) => t.id === selectedLevel.unlocksTitleId)
    : null;

  const getModeShortBadge = (mode: CampaignLevelConfig['mode']) => {
    switch (mode) {
      case 'classic':
        return {
          label: 'Đua Cổ Điển',
          bg: 'rgba(16, 185, 129, 0.16)',
          border: 'rgba(52, 211, 153, 0.45)',
          text: '#34D399',
        };
      case 'time_trial':
        return {
          label: 'Bóng Ma Ghost',
          bg: 'rgba(56, 189, 248, 0.16)',
          border: 'rgba(56, 189, 248, 0.45)',
          text: '#38BDF8',
        };
      case 'atp_rush':
        return {
          label: 'Săn Hạt ATP',
          bg: 'rgba(245, 158, 11, 0.16)',
          border: 'rgba(251, 191, 36, 0.45)',
          text: '#FBBF24',
        };
      case 'elimination':
        return {
          label: 'Sinh Tồn 20s',
          bg: 'rgba(244, 63, 94, 0.16)',
          border: 'rgba(251, 113, 133, 0.45)',
          text: '#FB7185',
        };
      default:
        return {
          label: 'Đại Dịch Virus',
          bg: 'rgba(168, 85, 247, 0.16)',
          border: 'rgba(192, 132, 252, 0.45)',
          text: '#C084FC',
        };
    }
  };

  return (
    <div
      data-testid="solo-campaign-modal"
      className="fixed inset-0 z-50 bg-[#060911] text-white p-2 sm:p-4 md:p-6 flex flex-col justify-center items-center select-none overflow-hidden"
    >
      {/* Top Teal/Cyan Ambient Glow for Solo Campaign */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-35">
        <div className="absolute -top-36 left-1/4 w-[560px] h-[420px] rounded-full bg-gradient-to-br from-[#06B6D4]/70 to-emerald-500/50 blur-[150px]" />
        <div className="absolute bottom-0 right-1/5 w-[480px] h-[480px] rounded-full bg-[#38BDF8]/25 blur-[150px]" />
      </div>

      {/* Main Frame matching LobbyView: Navy #0a0f1c, ~28px radius, subtle glowing border */}
      <div className="relative z-10 w-[94vw] max-w-7xl h-[86vh] min-h-[600px] max-h-[860px] my-auto flex flex-col space-y-2.5 p-3.5 md:p-5 rounded-[28px] bg-[#0a0f1c]/95 border border-cyan-500/35 shadow-[0_24px_80px_rgba(0,0,0,0.92),0_0_40px_rgba(6,182,212,0.1)] overflow-hidden">
        {/* ================================================================= */}
        {/* 1. COMPACT TOP HEADER BAR (PILL CHIPS)                            */}
        {/* ================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 rounded-2xl bg-[#090D16] border border-slate-800 shadow-md shrink-0">
          {/* Left: Back Button & Mode Chip */}
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
              <span className="text-xs font-black text-[#34D399] flex items-center gap-1.5">
                <span>🗺️</span>
                <span>Chiến Dịch Solo</span>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-mono-num font-bold text-[#38BDF8]">
                {totalLevelsCleared}/50 Màn
              </span>
            </div>
          </div>

          {/* Center: Total Stars Progress Chip + Mode Info Chip */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-[#0F172A] border border-amber-400/40 flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="font-mono-num text-xs font-black text-[#FEF08A]">
                {totalStarsEarned} / 150 SAO
              </span>
              <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/70 hidden sm:block">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-500"
                  style={{ width: `${(totalStarsEarned / 150) * 100}%` }}
                />
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0F172A] border border-slate-800 text-xs text-slate-300 font-semibold">
              <Flag className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>5 Chương · 5 Chế độ xoay vòng</span>
            </div>
          </div>

          {/* Right: Secondary Garage Button + Primary Launch CTA */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenGarageTuning}
              className="px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#38BDF8] border border-cyan-500/50 font-black text-xs cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Độ Máy</span>
            </button>

            {isSelectedUnlocked ? (
              <button
                type="button"
                data-testid="start-campaign-level-btn"
                onClick={() => {
                  soundEngine.playCountdownGo();
                  onStartCampaignLevel(selectedLevel);
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#F59E0B] hover:brightness-110 text-[#090D16] font-black text-xs tracking-wide uppercase shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-[145px] shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>ĐUA CẤP {selectedLevel.level}</span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="start-campaign-level-btn-locked"
                disabled
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-not-allowed opacity-80 min-w-[145px] shrink-0"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cần qua Màn {selectedLevel.level - 1}</span>
              </button>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. 5 CHAPTER TABS WITH MINI STAR PROGRESS BAR                     */}
        {/* ================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0">
          {SOLO_CAMPAIGN_CHAPTERS.map((chap) => {
            const isSelected = selectedChapter === chap.chapter;
            const [startLvl, endLvl] = chap.levelRange;
            const isChapUnlocked = isLevelUnlocked(startLvl);
            let chapCleared = 0;
            let chapStars = 0;
            for (let l = startLvl; l <= endLvl; l++) {
              if (progressMap[l]?.cleared) chapCleared++;
              chapStars += progressMap[l]?.stars || 0;
            }
            return (
              <button
                key={chap.chapter}
                type="button"
                data-testid={`campaign-chapter-tab-${chap.chapter}`}
                onClick={() => {
                  soundEngine.playCoin();
                  setSelectedChapter(chap.chapter);
                  setSelectedLevelNum(startLvl);
                }}
                style={{
                  borderColor: isSelected
                    ? chap.accentColor
                    : 'rgba(51, 65, 85, 0.7)',
                  boxShadow: isSelected
                    ? `0 0 18px ${chap.accentColor}38`
                    : undefined,
                }}
                className={`px-3 py-2 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#0F172A]'
                    : !isChapUnlocked
                    ? 'bg-[#090D16]/60 opacity-60 hover:opacity-85'
                    : 'bg-[#090D16] hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    style={{ color: isSelected ? chap.accentColor : '#F8FAFC' }}
                    className="font-sci text-[11px] font-black uppercase tracking-wider flex items-center gap-1"
                  >
                    <span>{chap.badgeIcon}</span>
                    <span>Chương {chap.chapter}</span>
                    {!isChapUnlocked && (
                      <Lock className="w-3 h-3 text-slate-400" />
                    )}
                  </span>
                  <span className="font-mono-num text-[10px] font-bold text-[#FEF08A]">
                    ★ {chapStars}/30
                  </span>
                </div>

                <div className="text-[11px] font-bold truncate mt-0.5 text-slate-200">
                  {chap.name.replace(/^Chương\s+\d+:\s*/, '')}
                </div>

                {/* Mini Progress Bar + Level Count */}
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/70">
                    <div
                      style={{
                        width: `${(chapStars / 30) * 100}%`,
                        backgroundColor: chap.accentColor,
                      }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                  <span className="font-mono-num text-[10px] font-bold text-[#34D399] shrink-0">
                    {chapCleared}/10
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* 3. MAIN 2-COLUMN CONTENT (7 COLS LEFT + 5 COLS RIGHT)             */}
        {/* ================================================================= */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch overflow-hidden">
          {/* LEFT 7 COLS: 10 LEVEL CARDS WITH CAMPAIGN PROGRESS PATH + COMPACT LEGEND */}
          <div className="lg:col-span-7 p-3.5 rounded-2xl bg-[#0F172A]/95 border border-slate-700/80 flex flex-col justify-between min-h-0 shadow-lg space-y-2.5 overflow-hidden">
            {/* Chapter Title Bar */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800 shrink-0">
              <div className="min-w-0">
                <h3 className="font-sci text-xs sm:text-sm font-black uppercase tracking-wider text-[#38BDF8] truncate">
                  {SOLO_CAMPAIGN_CHAPTERS[selectedChapter - 1]?.name}
                </h3>
                <p className="text-[11px] text-slate-300 truncate">
                  {SOLO_CAMPAIGN_CHAPTERS[selectedChapter - 1]?.subtitle}
                </p>
              </div>
              <span className="text-[11px] text-slate-300 font-semibold hidden sm:inline shrink-0">
                Đạt ≥ 1 Sao để mở khóa màn tiếp theo
              </span>
            </div>

            {/* 10 Level Nodes Grid with Campaign Progress Path Connecting Lines */}
            <div className="relative flex-1 min-h-0 flex flex-col justify-center overflow-y-auto overflow-x-hidden pr-0.5 custom-scrollbar">
              {/* Subtle Horizontal Campaign Path Connector Lines behind Row 1 and Row 2 (Desktop) */}
              <div className="hidden sm:block pointer-events-none absolute left-8 right-8 top-[24%] h-0.5 bg-gradient-to-r from-[#06B6D4]/50 via-slate-700/70 to-slate-800 z-0" />
              <div className="hidden sm:block pointer-events-none absolute left-8 right-8 top-[74%] h-0.5 bg-gradient-to-r from-slate-700/70 via-slate-700/70 to-amber-500/40 z-0" />

              <div className="relative z-10 flex-1 min-h-0 grid grid-cols-2 sm:grid-cols-5 sm:grid-rows-2 gap-2.5">
                {chapterLevels.map((lvl) => {
                  const prog = progressMap[lvl.level];
                  const isCleared = Boolean(prog?.cleared);
                  const isUnlocked = isLevelUnlocked(lvl.level);
                  const stars = prog?.stars || 0;
                  const isSelected = selectedLevel.level === lvl.level;
                  const isMilestone = lvl.level % 10 === 0;
                  const modeBadge = getModeShortBadge(lvl.mode);
                  const cleanTitle = lvl.title.replace(/^Cấp\s+\d+:\s*/, '');

                  return (
                    <button
                      key={lvl.level}
                      type="button"
                      data-testid={`campaign-level-node-${lvl.level}`}
                      onClick={() => {
                        if (!isUnlocked) {
                          soundEngine.playHazardHit();
                        } else {
                          soundEngine.playCoin();
                        }
                        setSelectedLevelNum(lvl.level);
                      }}
                      style={{
                        borderColor: isSelected
                          ? lvl.modeColor
                          : !isUnlocked
                          ? 'rgba(51, 65, 85, 0.55)'
                          : isMilestone
                          ? '#FACC15'
                          : isCleared
                          ? '#10B981'
                          : 'rgba(71, 85, 105, 0.85)',
                        boxShadow: isSelected
                          ? `0 0 18px ${lvl.modeColor}45`
                          : undefined,
                      }}
                      className={`p-2.5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[116px] overflow-hidden ${
                        isSelected
                          ? 'bg-[#0F172A]'
                          : !isUnlocked
                          ? 'bg-[#090D16]/70 opacity-75 hover:opacity-95'
                          : 'bg-[#090D16] hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Top Row: LV Number + Mode Icon (NO duplicate lock icon here!) */}
                      <div className="flex items-center justify-between gap-1">
                        <span
                          style={{
                            color: isUnlocked ? lvl.modeColor : '#94A3B8',
                          }}
                          className="font-sci text-xs font-black tracking-wide flex items-center gap-1"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCleared
                                ? 'bg-emerald-400'
                                : isUnlocked
                                ? 'bg-cyan-400 animate-pulse'
                                : 'bg-slate-600'
                            }`}
                          />
                          <span>LV.{lvl.level}</span>
                        </span>

                        <span className="text-sm" title={lvl.modeLabel}>
                          {lvl.modeIcon}
                        </span>
                      </div>

                      {/* Middle: Distinct Colored Mode Badge + 2-Line Map Title (line-clamp-2 so NEVER cut off!) */}
                      <div className="my-1 space-y-1">
                        <span
                          style={{
                            backgroundColor: modeBadge.bg,
                            borderColor: modeBadge.border,
                            color: isUnlocked ? modeBadge.text : '#94A3B8',
                          }}
                          className="inline-block px-1.5 py-0.2 rounded border text-[9px] font-black uppercase tracking-tight"
                        >
                          {modeBadge.label}
                        </span>

                        <div
                          className={`text-[11.5px] font-bold leading-snug line-clamp-2 ${
                            isUnlocked ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {cleanTitle}
                        </div>
                      </div>

                      {/* Bottom Row: Stars + Single Lock State OR Coin Reward */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                        {isUnlocked ? (
                          <>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= stars
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-slate-700'
                                  }`}
                                />
                              ))}
                            </div>
                            {isCleared ? (
                              <span className="text-[10px] font-bold text-[#34D399] flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Đã qua</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono-num font-extrabold text-[#FEF08A] flex items-center gap-0.5">
                                <span>+{lvl.firstClearCoins}</span>
                                <Coins className="w-3 h-3" />
                              </span>
                            )}
                          </>
                        ) : (
                          <div className="w-full flex items-center justify-between text-[9.5px] font-bold text-amber-300/90">
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <Lock className="w-3 h-3 text-amber-400" />
                              <span>Khóa</span>
                            </span>
                            <span>Vượt Màn {lvl.level - 1}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compact Mode Legend Chips Bar at Bottom */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 shrink-0">
              <span className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/35 text-[10px] font-bold text-[#34D399]">
                🏁 1,4,7: Đua Cổ Điển
              </span>
              <span className="px-2 py-1 rounded-lg bg-sky-950/60 border border-sky-500/35 text-[10px] font-bold text-[#38BDF8]">
                ⏱️ 2,6: Bóng Ma Ghost
              </span>
              <span className="px-2 py-1 rounded-lg bg-amber-950/60 border border-amber-500/35 text-[10px] font-bold text-[#FEF08A]">
                🎯 3,8: Săn Hạt ATP
              </span>
              <span className="px-2 py-1 rounded-lg bg-rose-950/60 border border-rose-500/35 text-[10px] font-bold text-rose-300">
                💀 5,9: Sinh Tồn 20s
              </span>
              <span className="px-2 py-1 rounded-lg bg-purple-950/60 border border-purple-500/35 text-[10px] font-bold text-purple-300">
                ☣️ 10..50: Đại Dịch Virus
              </span>
            </div>
          </div>

          {/* RIGHT 5 COLS: CYBER TRACK PREVIEW + 3-STAR GOALS + COMPACT CAR STATS & P1/P2/P3 */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-0">
            <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[#06B6D4]/40 bg-[#090D16] flex flex-col justify-between shadow-2xl">
              {/* Top & Middle Section */}
              <div className="flex-1 min-h-0 flex flex-col justify-between p-3.5 space-y-2.5 overflow-y-auto custom-scrollbar">
                {/* Level Title & Mode Info */}
                <div className="flex items-start justify-between gap-2 shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span>{selectedLevel.modeIcon}</span>
                      <span
                        style={{ color: selectedLevel.modeColor }}
                        className="font-sci text-[11px] font-black uppercase tracking-wider"
                      >
                        {selectedLevel.modeLabel}
                      </span>
                    </div>
                    <h4 className="font-sci text-sm sm:text-base font-black text-white truncate mt-0.5">
                      {selectedLevel.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-lg bg-[#0F172A] border border-cyan-500/40 font-mono-num text-[11px] font-black text-[#38BDF8]">
                      {selectedLevel.laps} VÒNG
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#0F172A] border border-slate-700 font-mono-num text-[10.5px] font-bold text-slate-300 uppercase">
                      AI {selectedLevel.botDifficulty}
                    </span>
                  </div>
                </div>

                {/* Neon Cyber Track Map Preview */}
                <div className="relative flex-1 min-h-[125px] rounded-2xl overflow-hidden border border-[#06B6D4]/40 bg-[#040812] flex items-center justify-center shadow-inner">
                  <MapPreviewCanvas
                    map={selectedMap}
                    width={440}
                    height={145}
                    className="w-full h-full object-contain"
                    cyberStyle={true}
                    animatedPaceCar={true}
                    showHazards={true}
                  />
                  {/* Map Name Chip bottom-left */}
                  <div className="absolute bottom-2 left-2.5 px-2.5 py-0.5 rounded-lg bg-slate-950/90 border border-cyan-500/40 text-[10.5px] text-cyan-200 font-bold shadow">
                    {selectedMap.name}
                  </div>
                  {selectedLvlProgress?.bestTimeMs ? (
                    <div className="absolute top-2 right-2.5 px-2.5 py-0.5 rounded-lg bg-sky-950/90 border border-sky-400/50 text-[10.5px] font-mono-num text-[#38BDF8] font-bold">
                      👻 Kỷ lục:{' '}
                      {(selectedLvlProgress.bestTimeMs / 1000).toFixed(2)}s
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2.5 px-2 py-0.5 rounded-lg bg-slate-950/85 border border-slate-700 text-[10px] font-bold text-slate-300">
                      {isSelectedCleared ? '✓ Đã hoàn thành' : 'Chưa vượt qua'}
                    </div>
                  )}
                </div>

                {/* Mission Objective & 3-Star Milestone Cards */}
                <div className="p-2.5 rounded-xl bg-[#0F172A]/90 border border-slate-800 space-y-2 shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-sci font-bold uppercase text-[#38BDF8] flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      <span>Nhiệm Vụ & Mốc Thưởng Sao:</span>
                    </span>
                    {milestoneTitle && (
                      <span
                        style={{ color: milestoneTitle.color }}
                        className="text-[10px] font-black flex items-center gap-1 truncate"
                      >
                        <Trophy className="w-3 h-3 shrink-0" />
                        <span>{milestoneTitle.badgeText}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-200 leading-snug line-clamp-2">
                    {selectedLevel.subtitle}
                  </p>

                  {(() => {
                    const t3 = selectedLevel.targetTimeSec;
                    const t2 =
                      selectedLevel.targetTime2StarSec ?? Math.round(t3 * 1.15);
                    const t1 =
                      selectedLevel.targetTime1StarSec ?? Math.round(t3 * 1.3);
                    const c3 = getCampaignStarCoins(selectedLevel, 3);
                    const c2 = getCampaignStarCoins(selectedLevel, 2);
                    const c1 = getCampaignStarCoins(selectedLevel, 1);

                    const goal1 =
                      selectedLevel.mode === 'time_trial' ||
                      selectedLevel.mode === 'atp_rush'
                        ? `≤ ${t1}s`
                        : selectedLevel.mode === 'infection'
                        ? `Sống ${t3}s`
                        : 'Top 3';
                    const goal2 =
                      selectedLevel.mode === 'time_trial' ||
                      selectedLevel.mode === 'atp_rush'
                        ? `≤ ${t2}s`
                        : selectedLevel.mode === 'infection'
                        ? `Sống + Hạng 2`
                        : 'Top 2';
                    const goal3 =
                      selectedLevel.mode === 'time_trial' ||
                      selectedLevel.mode === 'atp_rush'
                        ? `≤ ${t3}s`
                        : selectedLevel.mode === 'infection'
                        ? `Sống + Hạng 1`
                        : 'Top 1';

                    return (
                      <div className="grid grid-cols-3 gap-2 pt-0.5">
                        {/* 1 Star Box */}
                        <div className="p-2 rounded-xl bg-[#090D16] border border-emerald-500/45 text-center space-y-0.5">
                          <div className="flex items-center justify-center gap-0.5 text-[10.5px] font-black text-[#FEF08A]">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span>1 SAO</span>
                          </div>
                          <div className="font-mono-num text-xs font-black text-white">
                            {goal1}
                          </div>
                          <div className="text-[10px] font-mono-num font-bold text-[#34D399]">
                            +{c1} Xu · Mở màn
                          </div>
                        </div>

                        {/* 2 Stars Box */}
                        <div className="p-2 rounded-xl bg-[#090D16] border border-sky-500/45 text-center space-y-0.5">
                          <div className="flex items-center justify-center gap-0.5 text-[10.5px] font-black text-[#FEF08A]">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span>2 SAO</span>
                          </div>
                          <div className="font-mono-num text-xs font-black text-white">
                            {goal2}
                          </div>
                          <div className="text-[10px] font-mono-num font-bold text-[#38BDF8]">
                            +{c2} Xu
                          </div>
                        </div>

                        {/* 3 Stars Box */}
                        <div className="p-2 rounded-xl bg-[#090D16] border border-amber-400/60 text-center space-y-0.5 shadow-[0_0_12px_rgba(245,158,11,0.12)]">
                          <div className="flex items-center justify-center gap-0.5 text-[10.5px] font-black text-[#FEF08A]">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span>3 SAO</span>
                          </div>
                          <div className="font-mono-num text-xs font-black text-white">
                            {goal3}
                          </div>
                          <div className="text-[10px] font-mono-num font-bold text-[#FEF08A]">
                            +{c3} Xu (Max)
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
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
                          data-testid={`campaign-quick-preset-${slotIdx + 1}`}
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
      </div>
    </div>
  );
};

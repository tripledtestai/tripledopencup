import React from 'react';
import { Award, Check, Crown, Flame, Lock, Sparkles, X } from 'lucide-react';
import { PLAYER_TITLES } from '../game/constants';
import { PlayerTitleDefinition, StudentAccount } from '../game/types';
import { soundEngine } from '../services/sound';

interface TitlesModalProps {
  student: StudentAccount;
  onUpdateStudent: (next: StudentAccount) => void;
  onClose: () => void;
}

export const TitlesModal: React.FC<TitlesModalProps> = ({
  student,
  onUpdateStudent,
  onClose,
}) => {
  // Compute unlocked titles from student.unlockedTitles + automatic check against campaignProgress & defeatedBosses
  const unlockedSet = new Set<string>(student.unlockedTitles || []);
  const progress = student.campaignProgress || {};
  if (progress[10]?.cleared) unlockedSet.add('title_camp_10');
  if (progress[20]?.cleared) unlockedSet.add('title_camp_20');
  if (progress[30]?.cleared) unlockedSet.add('title_camp_30');
  if (progress[40]?.cleared) unlockedSet.add('title_camp_40');
  if (progress[50]?.cleared) unlockedSet.add('title_camp_50');

  const defeated = student.defeatedBosses || [];
  if (defeated.includes('tuan_anh')) unlockedSet.add('title_boss_tuan_anh');
  if (defeated.includes('mai_khanh')) unlockedSet.add('title_boss_mai_khanh');
  if (defeated.includes('hanh_dung')) unlockedSet.add('title_boss_hanh_dung');
  if (defeated.includes('minh_dang')) unlockedSet.add('title_boss_minh_dang');

  const equippedTitleId = student.equippedTitle || null;

  const handleEquipTitle = (title: PlayerTitleDefinition) => {
    if (!unlockedSet.has(title.id)) {
      soundEngine.playHazardHit();
      return;
    }
    soundEngine.playCoin();
    const nextEquipped = equippedTitleId === title.id ? null : title.id;
    onUpdateStudent({
      ...student,
      unlockedTitles: Array.from(unlockedSet),
      equippedTitle: nextEquipped,
      hasDragonAura:
        Boolean(student.hasDragonAura) ||
        unlockedSet.has('title_boss_minh_dang'),
    });
  };

  const campaignTitles = PLAYER_TITLES.filter((t) => t.category === 'campaign');
  const bossTitles = PLAYER_TITLES.filter((t) => t.category === 'raid_boss');

  const renderTitleCard = (t: PlayerTitleDefinition) => {
    const isUnlocked = unlockedSet.has(t.id);
    const isEquipped = equippedTitleId === t.id;

    return (
      <div
        key={t.id}
        data-testid={`title-card-${t.id}`}
        onClick={() => isUnlocked && handleEquipTitle(t)}
        style={{
          borderColor: isEquipped
            ? '#34D399'
            : isUnlocked
            ? t.borderColor
            : 'rgba(51, 65, 85, 0.7)',
          boxShadow: isEquipped
            ? `0 0 22px ${t.glowColor}`
            : isUnlocked
            ? `0 0 12px ${t.glowColor}`
            : undefined,
        }}
        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
          isUnlocked
            ? 'bg-slate-900/90 hover:bg-slate-800/90 cursor-pointer'
            : 'bg-slate-950/60 opacity-75'
        }`}
      >
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              style={{
                background: t.bgGradient,
                color: t.color,
                borderColor: t.borderColor,
                boxShadow: isUnlocked ? `0 0 12px ${t.glowColor}` : undefined,
              }}
              className="px-3 py-1 rounded-lg border font-sci text-xs font-black tracking-wide inline-flex items-center gap-1.5"
            >
              <span>{t.badgeText}</span>
            </span>
            {t.grantsDragonAura && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 font-sci text-[9.5px] font-bold">
                + HÀO QUANG RỒNG 24K GẦM XE
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {t.unlockRequirementText}
          </p>
        </div>

        <div className="shrink-0">
          {isEquipped ? (
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-sci text-[10.5px] font-black uppercase flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>ĐANG ĐEO</span>
            </button>
          ) : isUnlocked ? (
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-400/60 text-cyan-300 font-sci text-[10.5px] font-black uppercase cursor-pointer transition-colors"
            >
              TRANG BỊ
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 font-sci text-[10px] font-bold flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>CHƯA MỞ</span>
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      data-testid="titles-modal"
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-[#0d162c] via-[#091020] to-[#050912] border border-amber-400/40 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#0b1326] border-b border-amber-400/25 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-xl">
              👑
            </div>
            <div>
              <h2 className="font-sci text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Kho Danh Hiệu Cá Nhân (Equippable Titles)
              </h2>
              <p className="text-xs text-slate-400">
                Danh hiệu được chọn sẽ tỏa sáng cạnh tên bạn ở Thẻ Căn Cước,
                Phòng Chờ, Trên Nóc Xe & Bảng Xếp Hạng!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-slate-900 border border-amber-400/35 font-mono-num text-xs font-black text-amber-300">
              Đã mở: {unlockedSet.size} / 9
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer"
              aria-label="Đóng Kho Danh Hiệu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Column 1: 5 Campaign Milestone Titles */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <Award className="w-4 h-4 text-emerald-400" />
              <h3 className="font-sci text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-300">
                5 Danh Hiệu Cột Mốc Chiến Dịch Solo (Lv 10 – 50)
              </h3>
            </div>
            {campaignTitles.map(renderTitleCard)}
          </div>

          {/* Column 2: 4 Raid Boss Exclusive Titles */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <Flame className="w-4 h-4 text-rose-400" />
              <h3 className="font-sci text-xs sm:text-sm font-black uppercase tracking-wider text-rose-300">
                4 Danh Hiệu Độc Quyền Săn Trùm (Tứ Đại Boss)
              </h3>
            </div>
            {bossTitles.map(renderTitleCard)}
          </div>
        </div>
      </div>
    </div>
  );
};

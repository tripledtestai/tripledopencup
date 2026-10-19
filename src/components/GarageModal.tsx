import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Sparkles, Star, X } from 'lucide-react';
import { ALL_PARTS, SLOT_LABELS, TIER_COLORS } from '../game/constants';
import { drawModularCar } from '../game/carRenderer';
import { calculateCarClass } from '../game/rules';
import { CarLoadout, PartItem, PartSlot, StudentAccount } from '../game/types';
import { soundEngine } from '../services/sound';
import { PartThumbnail } from './PartThumbnail';

const StarRow: React.FC<{ count: number; total?: number }> = ({
  count,
  total = 5,
}) => (
  <span className="inline-flex items-center gap-0.5 text-[#FACC15]">
    {Array.from({ length: total }).map((_, i) => (
      <Star
        key={i}
        className={`w-2.5 h-2.5 ${
          i < count ? 'fill-[#FACC15] text-[#FACC15]' : 'text-[#64748B]'
        }`}
      />
    ))}
  </span>
);

interface GarageModalProps {
  student: StudentAccount;
  isTeacher?: boolean;
  onUpdateStudent: (updated: StudentAccount) => void;
  onOpenGacha: () => void;
  onClose: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  student,
  isTeacher = false,
  onUpdateStudent,
  onOpenGacha,
  onClose,
}) => {
  const [activeSlot, setActiveSlot] = useState<PartSlot>('chassis');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'SHOP' | 'GACHA'>('ALL');
  const [previewLoadout, setPreviewLoadout] = useState<CarLoadout>(
    student.loadout
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setPreviewLoadout(student.loadout);
  }, [student.loadout]);

  // High-DPI Live Spinning Turntable Preview of the Car
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 240;
    const h = 186;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    let animId = 0;
    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      const nowSec = now / 1000;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const bgGrad = ctx.createRadialGradient(
        w * 0.5,
        h * 0.5,
        10,
        w * 0.5,
        h * 0.5,
        130
      );
      bgGrad.addColorStop(0, '#2B4228');
      bgGrad.addColorStop(0.6, '#172216');
      bgGrad.addColorStop(1, '#0F1710');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(nowSec * 0.4);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 70, 0, Math.PI * 2);
      ctx.stroke();

      ctx.rotate(-nowSec * 0.8);
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.45)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, 56, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      drawModularCar(ctx, previewLoadout, {
        x: w / 2,
        y: h / 2,
        angle: nowSec * 0.85,
        scale: 2.1,
        nowSec,
        drifting: true,
        nitroActive: true,
      });

      ctx.restore();
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [previewLoadout]);

  const slotItems = ALL_PARTS.filter((p) => {
    if (p.slot !== activeSlot) return false;
    if (tierFilter === 'SHOP') return !p.gachaOnly;
    if (tierFilter === 'GACHA') return p.gachaOnly;
    return true;
  });

  const handleSelectOrBuy = (item: PartItem) => {
    const isOwned = student.ownedParts.includes(item.id);
    if (isOwned) {
      const nextLoadout: CarLoadout = {
        ...student.loadout,
        [item.slot]: item.id,
      };
      setPreviewLoadout(nextLoadout);
      onUpdateStudent({
        ...student,
        loadout: nextLoadout,
      });
      soundEngine.playCoin();
      setFeedback(`✓ Đã gắn: ${item.name}`);
      return;
    }

    if (item.gachaOnly) {
      setPreviewLoadout({
        ...previewLoadout,
        [item.slot]: item.id,
      });
      setFeedback(`🎁 Săn "${item.name}" tại Vòng Quay Gacha`);
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
    setPreviewLoadout(nextLoadout);
    onUpdateStudent({
      ...student,
      coins: student.coins - item.price,
      ownedParts: nextOwned,
      loadout: nextLoadout,
    });
    soundEngine.playFanfare(item.tier === 'S' || item.tier === 'SS');
    setFeedback(`🎉 Đã mua & gắn: ${item.name}`);
  };

  const previewClassInfo = calculateCarClass(previewLoadout);
  const previewClassStyle = TIER_COLORS[previewClassInfo.tier];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-3 sm:p-4 select-none">
      <div className="w-[1024px] max-w-[96vw] h-[660px] max-h-[92vh] shrink-0 flex flex-col rounded-3xl bg-[#1E261D] border-2 border-[#F59E0B] shadow-2xl overflow-hidden">
        {/* Compact Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-5 py-3 bg-gradient-to-r from-[#273824] via-[#4A6046] to-[#273824] border-b-2 border-[#7A9A75] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1E261D] border-2 border-[#F59E0B] flex items-center justify-center text-lg shadow shrink-0">
              🛠️
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-black text-white tracking-wide">
                XƯỞNG ĐỘ XE
              </h2>
              <span className="px-2 py-0.5 rounded-lg bg-[#1E261D]/90 border border-[#7A9A75] text-[11px] font-mono-num font-bold text-[#FEF08A]">
                {student.ownedParts.length}/{ALL_PARTS.length} Món
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3.5 py-1.5 rounded-xl bg-[#1E261D] border-2 border-[#F59E0B] font-mono-num text-xs sm:text-sm font-black text-[#F59E0B] flex items-center gap-1.5">
              <span>🪙</span>
              <span>{student.coins.toLocaleString()}</span>
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
                  setFeedback('⚡ +1,000');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-[#22C55E] hover:bg-[#4ADE80] text-[#0F172A] font-black text-xs shadow cursor-pointer"
              >
                +1K
              </button>
            )}
            <button
              type="button"
              onClick={onOpenGacha}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:brightness-110 text-[#1E261D] font-black text-xs shadow-lg cursor-pointer inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#1E261D]" />
              <span>Vòng Quay Skin</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng Xưởng Độ Xe"
              title="Đóng"
              className="w-8 h-8 p-0 leading-none rounded-xl bg-[#1E261D] text-white border border-[#7A9A75] hover:bg-[#2E3B2C] inline-flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 stroke-[2.75] block shrink-0" />
            </button>
          </div>
        </div>

        {/* Main Content: Fixed-Height Left Turntable + Right Dropdown & Dense Grid */}
        <div className="flex-1 min-h-0 overflow-hidden p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 4 Cols: 360 Turntable + Compact 7-Slot Equipped List */}
          <div className="lg:col-span-4 flex flex-col justify-between h-full min-h-0 bg-[#151D14] p-3.5 rounded-2xl border border-[#7A9A75]/70 space-y-2 overflow-hidden">
            <div className="flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-xs font-extrabold text-[#FEF08A] uppercase">
                  🔄 Bàn Xoay 360°
                </span>
                <span
                  style={{
                    backgroundColor: previewClassStyle.bg,
                    color: previewClassStyle.text,
                  }}
                  className="px-2 py-0.5 rounded-md text-[11px] font-black shadow"
                >
                  CLASS {previewClassInfo.tier} ({previewClassInfo.averageScore.toFixed(1)})
                </span>
              </div>

              <div className="relative">
                <canvas
                  ref={previewCanvasRef}
                  style={{ width: '240px', height: '186px' }}
                  className="rounded-xl border border-[#7A9A75] shadow-inner block"
                />
                {feedback && (
                  <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-lg bg-[#1E261D]/95 border border-[#F59E0B] text-[11px] text-[#FEF08A] font-bold text-center truncate shadow-lg">
                    {feedback}
                  </div>
                )}
              </div>
            </div>

            {/* Compact Single-Line Equipped List (Click to jump to slot) */}
            <div className="space-y-1">
              {SLOT_LABELS.map((sl) => {
                const eqId = previewLoadout[sl.slot];
                const eqItem = ALL_PARTS.find((p) => p.id === eqId);
                const tColor = eqItem
                  ? TIER_COLORS[eqItem.tier]
                  : TIER_COLORS.D;
                const isSelected = activeSlot === sl.slot;
                return (
                  <button
                    key={sl.slot}
                    type="button"
                    onClick={() => {
                      setActiveSlot(sl.slot);
                      setFeedback(null);
                      soundEngine.playCoin();
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg bg-[#1E261D] border flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#F59E0B] bg-[#263324]'
                        : 'border-[#7A9A75]/35 hover:border-[#7A9A75]'
                    }`}
                  >
                    <span className="text-[11px] text-[#A7C4A0] font-semibold shrink-0">
                      {sl.icon} {sl.label.replace(/^\d+\.\s*/, '')}
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-bold text-white truncate">
                        {eqItem?.name || 'Mặc định'}
                      </span>
                      {eqItem && (
                        <span
                          style={{
                            backgroundColor: tColor.bg,
                            color: tColor.text,
                          }}
                          className="px-1.5 py-0.2 rounded font-black text-[9px] shrink-0"
                        >
                          {eqItem.tier}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 8 Cols: Dropdown Part Selector Toolbar + Dense Part Cards Grid */}
          <div className="lg:col-span-8 flex flex-col h-full min-h-0 space-y-3 overflow-hidden">
            {/* Compact Dropdown Bar for Choosing Part Slot & Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#151D14] px-3.5 py-2.5 rounded-2xl border border-[#7A9A75]/70 shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <label
                  htmlFor="garage-part-slot-select"
                  className="text-xs font-extrabold text-[#FEF08A] whitespace-nowrap"
                >
                  Bộ phận:
                </label>
                <div className="relative flex-1">
                  <select
                    id="garage-part-slot-select"
                    data-testid="garage-slot-select"
                    aria-label="Chọn bộ phận độ xe"
                    value={activeSlot}
                    onChange={(e) => {
                      setActiveSlot(e.target.value as PartSlot);
                      setFeedback(null);
                      soundEngine.playCoin();
                    }}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl bg-[#273824] hover:bg-[#31452D] border-2 border-[#F59E0B] text-white text-xs sm:text-sm font-black cursor-pointer focus:outline-none"
                  >
                    {SLOT_LABELS.map((s) => {
                      const slotAll = ALL_PARTS.filter((p) => p.slot === s.slot);
                      const slotOwned = slotAll.filter((p) =>
                        student.ownedParts.includes(p.id)
                      );
                      return (
                        <option
                          key={s.slot}
                          value={s.slot}
                          className="bg-[#1E261D] text-white font-bold"
                        >
                          {s.icon} {s.label} ({slotOwned.length}/{slotAll.length})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FEF08A]" />
                </div>
              </div>

              {/* Quick Filter Pills: Tất Cả / Mua Xu (D-S) / Gacha (S-SSS) */}
              <div className="flex items-center gap-1 bg-[#1E261D] p-1 rounded-xl border border-[#7A9A75]/40 shrink-0">
                {(
                  [
                    { id: 'ALL', label: 'Tất Cả' },
                    { id: 'SHOP', label: '🪙 Mua Xu (D–S)' },
                    { id: 'GACHA', label: '🎰 Gacha (S–SSS)' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTierFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer ${
                      tierFilter === f.id
                        ? 'bg-[#F59E0B] text-[#1E261D]'
                        : 'text-[#CBD5E1] hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Dense Grid of Part Cards (Fixed flex-1 scroll container) */}
            <div className="flex-1 h-full min-h-0 overflow-y-auto pr-1 bg-[#151D14]/60 p-3 rounded-2xl border border-[#7A9A75]/40 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
              {slotItems.map((item) => {
                const isOwned = student.ownedParts.includes(item.id);
                const isEquipped = student.loadout[item.slot] === item.id;
                const isPreviewing = previewLoadout[item.slot] === item.id;
                const tierStyle = TIER_COLORS[item.tier];

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectOrBuy(item)}
                    style={{
                      borderColor: isEquipped
                        ? '#4ADE80'
                        : isPreviewing
                        ? '#F59E0B'
                        : tierStyle.border,
                    }}
                    className="group relative h-[212px] rounded-2xl bg-[#161F15] hover:bg-[#1F2C1E] border-2 p-2.5 flex flex-col items-center justify-between transition-all hover:-translate-y-0.5 shadow-lg cursor-pointer"
                  >
                    {/* Top Badges: Tier + Star Rating */}
                    <div className="w-full flex items-center justify-between mb-1.5">
                      <span
                        style={{
                          backgroundColor: tierStyle.bg,
                          color: tierStyle.text,
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider shadow"
                      >
                        BẬC {item.tier}
                      </span>

                      <StarRow
                        count={
                          item.tier === 'SSS'
                            ? 5
                            : item.tier === 'SS'
                            ? 4
                            : item.tier === 'S'
                            ? 3
                            : item.tier === 'A'
                            ? 2
                            : 1
                        }
                      />
                    </div>

                    {/* Graphic Illustration Thumbnail of the Part */}
                    <div className="relative rounded-xl overflow-hidden border border-[#7A9A75]/50 shadow-inner">
                      <PartThumbnail
                        item={item}
                        baseLoadout={student.loadout}
                        width={160}
                        height={92}
                      />
                      {isEquipped && (
                        <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-[#22C55E] text-[#0F172A] text-[9px] font-black shadow">
                          ĐANG DÙNG
                        </span>
                      )}
                    </div>

                    {/* Item Name */}
                    <div className="text-xs font-extrabold text-white text-center mt-2 mb-1.5 line-clamp-1 w-full px-1">
                      {item.name}
                    </div>

                    {/* Bottom Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectOrBuy(item);
                      }}
                      className={`w-full py-1.5 rounded-xl text-[11px] font-black transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                        isEquipped
                          ? 'bg-[#22C55E] text-[#0F172A]'
                          : isOwned
                          ? 'bg-[#4A6046] hover:bg-[#5E7A59] text-white border border-[#7A9A75]'
                          : item.gachaOnly
                          ? 'bg-gradient-to-r from-[#7C3AED] to-[#C026D3] text-white'
                          : 'bg-[#F59E0B] hover:bg-[#FBBF24] text-[#1E261D]'
                      }`}
                    >
                      {isEquipped ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>ĐANG DÙNG</span>
                        </>
                      ) : isOwned ? (
                        'GẮN LÊN XE'
                      ) : item.gachaOnly ? (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>VÒNG QUAY</span>
                        </>
                      ) : (
                        `🪙 ${item.price} XU`
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

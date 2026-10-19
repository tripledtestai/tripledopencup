import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import {
  ALL_PARTS,
  GACHA_PITY_THRESHOLD,
  SLOT_LABELS,
  TIER_COLORS,
} from '../game/constants';
import { drawModularCar } from '../game/carRenderer';
import { spinGachaPool } from '../game/rules';
import { CarLoadout, PartItem, StudentAccount } from '../game/types';
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
        className={`w-3 h-3 ${
          i < count ? 'fill-[#FACC15] text-[#FACC15]' : 'text-[#64748B]'
        }`}
      />
    ))}
  </span>
);

interface GachaModalProps {
  student: StudentAccount;
  isTeacher?: boolean;
  onUpdateStudent: (updated: StudentAccount) => void;
  onClose: () => void;
  onOpenGarage?: () => void;
}

const GACHA_SINGLE_COST = 50;
const GACHA_FIVE_COST = 225;

interface WishBannerConfig {
  id: 'banner_project' | 'banner_poolparty' | 'banner_t1';
  tabBadge: string;
  ribbon: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  accentColor: string;
  secondaryColor: string;
  ribbonBg: string;
  cardGrad: string;
  featuredName: string;
  featuredTitle: string;
  featuredLoadout: CarLoadout;
  rateUpIds: string[];
}

export const WISH_BANNERS: WishBannerConfig[] = [
  {
    id: 'banner_project',
    tabBadge: 'SIÊU PHẨM',
    ribbon: 'Skin Công Nghệ Cyber',
    titleLine1: 'SIÊU PHẨM:',
    titleLine2: 'Kỷ Nguyên Cyber',
    subtitle: 'Bộ Chiến Cơ Hologram & Giáp Quang Học',
    accentColor: '#EC4899',
    secondaryColor: '#06B6D4',
    ribbonBg: 'from-[#be185d] via-[#6d28d9] to-[#0891b2]',
    cardGrad: 'from-[#0F172A] via-[#2E1065] to-[#083344]',
    featuredName: 'SIÊU PHẨM: Cyber-Vayne',
    featuredTitle: 'Chiến Cơ Hologram Bậc SSS',
    featuredLoadout: {
      chassis: 'chassis_project',
      paint: 'paint_project',
      decal: 'decal_project',
      wheels: 'wheels_project',
      spoiler: 'spoiler_project',
      underglow: 'underglow_project',
      trail: 'trail_project',
    },
    rateUpIds: [
      'chassis_project',
      'spoiler_project',
      'paint_project',
      'wheels_project',
      'underglow_project',
      'trail_project',
      'decal_project',
    ],
  },
  {
    id: 'banner_poolparty',
    tabBadge: 'TIỆC BÃI BIỂN',
    ribbon: 'Skin Mùa Hè Sôi Động',
    titleLine1: 'Tiệc Bãi Biển',
    titleLine2: 'Sóng Nhiệt Đới',
    subtitle: 'Bộ Thủy Phi Cơ Cá Mập & Phao Cứu Sinh',
    accentColor: '#0284C7',
    secondaryColor: '#F59E0B',
    ribbonBg: 'from-[#0284C7] via-[#06B6D4] to-[#F59E0B]',
    cardGrad: 'from-[#082F49] via-[#0369A1] to-[#0F766E]',
    featuredName: 'Cá Mập Tiệc Bể Bơi',
    featuredTitle: 'Thủy Phi Cơ Đại Bác Bậc SSS',
    featuredLoadout: {
      chassis: 'chassis_poolparty',
      paint: 'paint_poolparty',
      decal: 'decal_poolparty',
      wheels: 'wheels_poolparty',
      spoiler: 'spoiler_poolparty',
      underglow: 'underglow_poolparty',
      trail: 'trail_poolparty',
    },
    rateUpIds: [
      'chassis_poolparty',
      'trail_poolparty',
      'paint_poolparty',
      'wheels_poolparty',
      'spoiler_poolparty',
      'underglow_poolparty',
      'decal_poolparty',
    ],
  },
  {
    id: 'banner_t1',
    tabBadge: 'T1 VÔ ĐỊCH',
    ribbon: 'Skin Vô Địch Thế Giới',
    titleLine1: 'Huyền Thoại T1',
    titleLine2: 'Quỷ Vương Bất Tử',
    subtitle: 'Bộ Thần Xa T1 Đỏ Hoàng Gia & 5 Sao',
    accentColor: '#E11D48',
    secondaryColor: '#FACC15',
    ribbonBg: 'from-[#991B1B] via-[#E11D48] to-[#CA8A04]',
    cardGrad: 'from-[#450A0A] via-[#7F1D1D] to-[#1C1917]',
    featuredName: 'Thần Xa T1 Quỷ Vương',
    featuredTitle: 'Hào Quang 5 Sao Vô Địch SSS',
    featuredLoadout: {
      chassis: 'chassis_t1',
      paint: 'paint_t1',
      decal: 'decal_t1',
      wheels: 'wheels_t1',
      spoiler: 'spoiler_t1',
      underglow: 'underglow_t1',
      trail: 'trail_t1',
    },
    rateUpIds: [
      'chassis_t1',
      'spoiler_t1',
      'decal_t1',
      'underglow_t1',
      'paint_t1',
      'wheels_t1',
      'trail_t1',
    ],
  },
];

export const GachaModal: React.FC<GachaModalProps> = ({
  student,
  isTeacher = false,
  onUpdateStudent,
  onClose,
  onOpenGarage,
}) => {
  const [bannerIdx, setBannerIdx] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wonItems, setWonItems] = useState<PartItem[]>([]);
  const [wasPityHit, setWasPityHit] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPoolModal, setShowPoolModal] = useState(false);

  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeBanner = WISH_BANNERS[bannerIdx];

  const unownedParts = ALL_PARTS.filter(
    (p) => !student.ownedParts.includes(p.id)
  );
  const pityCount = student.gachaPity || 0;

  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 520;
    const h = 340;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    let animId = 0;
    const render = (nowMs: number) => {
      animId = requestAnimationFrame(render);
      const nowSec = nowMs / 1000;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.48;
      const cy = h * 0.46;

      const haloGrad = ctx.createRadialGradient(cx, cy, 12, cx, cy, 165);
      haloGrad.addColorStop(0, `${activeBanner.secondaryColor}CC`);
      haloGrad.addColorStop(0.48, `${activeBanner.accentColor}66`);
      haloGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 165, 0, Math.PI * 2);
      ctx.fill();

      if (activeBanner.id === 'banner_project') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(nowSec * 0.35);
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const hx = Math.cos(a) * 124;
          const hy = Math.sin(a) * 124;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.rotate(-nowSec * 0.65);
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
          const tx = Math.cos(a) * 108;
          const ty = Math.sin(a) * 108;
          if (i === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      } else if (activeBanner.id === 'banner_poolparty') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)';
        ctx.lineWidth = 2;
        ctx.setLineDash([14, 8]);
        ctx.rotate(nowSec * 0.25);
        ctx.beginPath();
        ctx.arc(0, 0, 125, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, 98, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        for (let i = 0; i < 8; i++) {
          const a = nowSec * 0.9 + (i * Math.PI) / 4;
          const bx = cx + Math.cos(a) * (105 + (i % 3) * 16);
          const by = cy + Math.sin(a * 1.3) * 85;
          ctx.fillStyle =
            i % 2 === 0
              ? 'rgba(125, 211, 252, 0.55)'
              : 'rgba(253, 224, 71, 0.55)';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(bx, by, 7 + (i % 3) * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 124, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(254, 240, 138, 0.55)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + nowSec * 0.25;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 88, Math.sin(a) * 88);
          ctx.lineTo(Math.cos(a) * 138, Math.sin(a) * 138);
          ctx.stroke();
        }

        for (let i = 0; i < 5; i++) {
          const a =
            -Math.PI / 2 + (i - 2) * 0.34 + Math.sin(nowSec * 1.5) * 0.05;
          const sx = Math.cos(a) * 128;
          const sy = Math.sin(a) * 128;
          ctx.fillStyle = '#FEF08A';
          ctx.beginPath();
          for (let p = 0; p < 10; p++) {
            const r = p % 2 === 0 ? 11 : 5;
            const pa = (p * Math.PI) / 5 - Math.PI / 2;
            const px = sx + Math.cos(pa) * r;
            const py = sy + Math.sin(pa) * r;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      drawModularCar(ctx, activeBanner.featuredLoadout, {
        x: cx,
        y: cy,
        angle: -0.42 + Math.sin(nowSec * 1.4) * 0.14,
        scale: 2.85,
        nowSec,
        drifting: true,
        nitroActive: true,
      });

      ctx.restore();
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeBanner]);

  const executeSpins = (count: number, totalCost: number) => {
    setErrorMsg(null);
    if (unownedParts.length === 0) {
      setErrorMsg('Đã sở hữu 100% vật phẩm!');
      return;
    }
    if (student.coins < totalCost) {
      setErrorMsg(`Thiếu Xu! Cần ${totalCost} Xu (Hiện có ${student.coins} Xu).`);
      return;
    }

    setSpinning(true);
    setWonItems([]);
    soundEngine.playCoin();

    setTimeout(() => {
      let currentOwned = [...student.ownedParts];
      let currentPityVal = student.gachaPity || 0;
      let hitPityAny = false;
      const pulled: PartItem[] = [];

      const actualCount = Math.min(count, unownedParts.length);
      for (let i = 0; i < actualCount; i++) {
        const res = spinGachaPool(
          currentOwned,
          currentPityVal,
          Math.random,
          activeBanner.rateUpIds
        );
        if (res.item) {
          pulled.push(res.item);
          currentOwned.push(res.item.id);
          currentPityVal = res.newPity;
          if (res.isPityTriggered) hitPityAny = true;
        }
      }

      setSpinning(false);
      setWonItems(pulled);
      setWasPityHit(hitPityAny);

      const hasMythic = pulled.some(
        (it) => it.tier === 'SS' || it.tier === 'SSS'
      );
      soundEngine.playFanfare(hasMythic);

      const actualCharged =
        actualCount === count ? totalCost : actualCount * GACHA_SINGLE_COST;
      onUpdateStudent({
        ...student,
        coins: student.coins - actualCharged,
        ownedParts: currentOwned,
        gachaPity: currentPityVal,
      });
    }, 550);
  };

  const handleEquipItem = (item: PartItem) => {
    onUpdateStudent({
      ...student,
      loadout: {
        ...student.loadout,
        [item.slot]: item.id,
      },
    });
    soundEngine.playCoin();
  };

  const handleEquipBannerOwnedSet = () => {
    const nextLoadout = { ...student.loadout };
    for (const partId of activeBanner.rateUpIds) {
      if (student.ownedParts.includes(partId)) {
        const part = ALL_PARTS.find((p) => p.id === partId);
        if (part) {
          nextLoadout[part.slot] = part.id;
        }
      }
    }
    onUpdateStudent({
      ...student,
      loadout: nextLoadout,
    });
    soundEngine.playFanfare(false);
  };

  const rateUpParts = activeBanner.rateUpIds
    .map((id) => ALL_PARTS.find((p) => p.id === id))
    .filter((p): p is PartItem => Boolean(p));

  const ownedInBannerCount = rateUpParts.filter((p) =>
    student.ownedParts.includes(p.id)
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#1E261D] text-white p-4 md:p-5 overflow-hidden select-none">
      {/* Celestial Starlight Background Accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#38BDF8]/30 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-[#F59E0B]/25 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-[#EC4899]/25 blur-3xl" />
      </div>

      {/* ===================================================================== */}
      {/* TOP BAR (Title on Left + Pity, Coin [Icon Only], Close X on Right)    */}
      {/* ===================================================================== */}
      <div className="relative z-10 flex items-center justify-between gap-3 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B] flex items-center justify-center text-[#FEF08A] shadow shrink-0">
            <Sparkles className="w-4 h-4 text-[#FEF08A]" />
          </div>
          <div className="text-base sm:text-lg font-black tracking-wide text-[#FEF08A]">
            VÒNG QUAY SKIN
          </div>
        </div>

        {/* Top-Right: Pity Pill + Coin Badge (Icon Only, No "Xu") + Close X Button */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-[#0F172A]/90 border border-[#7A9A75] flex items-center gap-1.5 text-xs font-mono-num font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="text-[#38BDF8]">Pity:</span>
            <span className="text-[#FEF08A]">
              {pityCount}/{GACHA_PITY_THRESHOLD}
            </span>
          </div>

          <div
            title="Số Xu Hiện Có"
            className="px-3.5 py-1.5 rounded-xl bg-[#0F172A]/90 border border-[#F59E0B] flex items-center gap-1.5 text-xs sm:text-sm font-mono-num font-extrabold text-[#FEF08A]"
          >
            <span className="text-base leading-none">🪙</span>
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
              }}
              className="px-2.5 py-1.5 rounded-xl bg-[#22C55E] hover:bg-[#4ADE80] text-[#0F172A] font-black text-xs shadow cursor-pointer"
            >
              +1K
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Vòng Quay Gacha"
            title="Đóng"
            className="w-9 h-9 p-0 leading-none rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-slate-600 text-white flex items-center justify-center shadow-lg cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 stroke-[3] block shrink-0" />
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CENTER HERO WISH BANNER CARD (FIXED HEIGHT h-[385px])                 */}
      {/* ===================================================================== */}
      <div className="relative z-10 max-w-7xl w-full mx-auto my-auto flex items-center gap-3">
        {/* Left Carousel Arrow */}
        <button
          type="button"
          aria-label="Banner trước"
          onClick={() =>
            setBannerIdx(
              (i) => (i - 1 + WISH_BANNERS.length) % WISH_BANNERS.length
            )
          }
          className="hidden sm:flex w-11 h-11 p-0 leading-none rounded-full bg-white/15 hover:bg-white/30 border border-white/40 items-center justify-center text-white shrink-0 cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.75] block shrink-0" />
        </button>

        {/* Main Showcase Card (Fixed 385px height) */}
        <div
          data-testid="gacha-banner-card"
          className="relative flex-1 rounded-3xl border-4 border-[#FEF08A]/90 bg-gradient-to-r from-[#F8FAFC] via-[#EEF2FF] to-[#1E1B4B] text-[#0F172A] shadow-[0_20px_60px_rgba(0,0,0,0.65)] overflow-hidden h-[385px] grid grid-cols-1 lg:grid-cols-12"
        >
          {/* Top-Left Ribbon Tag */}
          <div
            className={`absolute top-3 left-0 z-20 px-3.5 py-1 rounded-r-full bg-gradient-to-r ${activeBanner.ribbonBg} text-white text-xs font-extrabold tracking-wide shadow-md flex items-center gap-1.5`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FEF08A] shrink-0" />
            <span>{activeBanner.ribbon}</span>
          </div>

          {/* LEFT 6 COLS: Title, Subtitle, Pity Pill & 6 Wide Rate-Up Parts */}
          <div className="lg:col-span-6 h-full p-5 pt-11 flex flex-col justify-between relative z-10 bg-gradient-to-r from-[#F8FAFC] via-[#F1F5F9]/95 to-transparent overflow-hidden">
            <div className="space-y-1.5">
              <div className="leading-tight flex items-baseline gap-2 flex-wrap">
                <span className="font-display text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                  {activeBanner.titleLine1}
                </span>
                <span
                  style={{ color: activeBanner.accentColor }}
                  className="font-display text-xl sm:text-2xl font-black tracking-tight"
                >
                  {activeBanner.titleLine2}
                </span>
              </div>

              <div className="text-xs font-bold text-[#334155]">
                {activeBanner.subtitle}
              </div>

              {/* Rate-Up & Pity Pill */}
              <div
                style={{ backgroundColor: activeBanner.accentColor }}
                className="inline-flex px-3 py-1 rounded-xl text-white text-[11px] font-extrabold shadow items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-[#FEF08A] shrink-0" />
                <span>
                  Tăng tỉ lệ rơi · Bảo hiểm {GACHA_PITY_THRESHOLD} lượt nổ SS/SSS
                </span>
              </div>
            </div>

            {/* Illustrated Rate-Up Mini Cards (3x2 Grid with wide thumbnails) */}
            <div>
              <div className="flex items-center justify-between mb-1.5 h-5">
                <span className="text-[11px] font-extrabold text-[#334155] uppercase tracking-wider">
                  Bộ {activeBanner.tabBadge} ({ownedInBannerCount}/
                  {rateUpParts.length})
                </span>
                {ownedInBannerCount > 0 && (
                  <button
                    type="button"
                    onClick={handleEquipBannerOwnedSet}
                    className="px-2 py-0.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-[#FEF08A] text-[10px] font-black cursor-pointer shrink-0"
                  >
                    ⚡ Trang Bị Bộ
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {rateUpParts.slice(0, 6).map((part) => {
                  const owned = student.ownedParts.includes(part.id);
                  return (
                    <div
                      key={part.id}
                      onClick={() => owned && handleEquipItem(part)}
                      className={`relative rounded-xl overflow-hidden border-2 bg-[#0F172A] p-1 text-center shadow h-[90px] flex flex-col justify-between ${
                        owned
                          ? 'border-[#4ADE80] cursor-pointer hover:brightness-110'
                          : 'border-[#F59E0B]'
                      }`}
                    >
                      <span className="absolute top-1 right-1 z-10 px-1 py-0.2 rounded bg-[#F59E0B] text-[#0F172A] text-[8px] font-black leading-none">
                        {part.tier}
                      </span>
                      <PartThumbnail
                        item={part}
                        baseLoadout={activeBanner.featuredLoadout}
                        width={112}
                        height={50}
                        className="mx-auto shrink-0"
                      />
                      <div className="text-[10px] font-extrabold text-white truncate px-0.5">
                        {part.name}
                      </div>
                      <div className="text-[9px] font-bold text-[#FEF08A] flex items-center justify-center gap-0.5 leading-none">
                        {owned ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-[#4ADE80]" />
                            <span className="text-[#4ADE80]">Đã Mở</span>
                          </>
                        ) : (
                          'UP!'
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT 6 COLS: Fixed-Size Animated Visual Showcase + Nameplate */}
          <div
            className={`lg:col-span-6 h-full relative flex items-center justify-center bg-gradient-to-br ${activeBanner.cardGrad} p-4 overflow-hidden`}
          >
            <canvas
              ref={heroCanvasRef}
              style={{ width: '500px', height: '320px' }}
              className="max-w-full h-auto block"
            />

            {/* Featured Skin Vehicle Nameplate Overlay */}
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3 pointer-events-none">
              <div className="min-w-[280px] max-w-[360px] bg-[#0F172A]/90 border-2 border-[#F59E0B] rounded-2xl px-3.5 py-2 shadow-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#F59E0B] text-[#0F172A] text-[10px] font-black">
                    {activeBanner.tabBadge} · SSS
                  </span>
                  <StarRow count={5} />
                </div>
                <div className="text-base font-black text-white mt-0.5">
                  {activeBanner.featuredName}
                </div>
                <div className="text-[11px] font-semibold text-[#FEF08A]">
                  {activeBanner.featuredTitle}
                </div>
              </div>

              <div className="bg-[#0F172A]/90 border border-[#7A9A75] rounded-xl px-3 py-1.5 text-right shrink-0">
                <div className="text-[9px] text-[#A7C4A0] font-bold uppercase">
                  Còn Lại
                </div>
                <div className="font-mono-num text-xs font-black text-[#4ADE80]">
                  {unownedParts.length}/{ALL_PARTS.length} Món
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Carousel Arrow */}
        <button
          type="button"
          aria-label="Banner tiếp theo"
          onClick={() => setBannerIdx((i) => (i + 1) % WISH_BANNERS.length)}
          className="hidden sm:flex w-11 h-11 p-0 leading-none rounded-full bg-white/15 hover:bg-white/30 border border-white/40 items-center justify-center text-white shrink-0 cursor-pointer transition-colors"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.75] block shrink-0" />
        </button>
      </div>

      {/* ===================================================================== */}
      {/* BANNER SELECTION TABS PLACED DIRECTLY BELOW THE BANNER CARD           */}
      {/* ===================================================================== */}
      <div className="relative z-10 flex items-center justify-center gap-3 flex-wrap max-w-7xl w-full mx-auto my-1">
        {WISH_BANNERS.map((b, idx) => {
          const isSelected = idx === bannerIdx;
          const mainItem =
            ALL_PARTS.find((p) => p.id === b.rateUpIds[0]) || ALL_PARTS[4];
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setBannerIdx(idx);
                setWonItems([]);
                soundEngine.playCoin();
              }}
              className={`w-[220px] h-[58px] shrink-0 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer flex items-center gap-2 p-1 pr-3 ${
                isSelected
                  ? 'border-[#FEF08A] bg-[#F59E0B]/25 shadow-[0_0_20px_rgba(245,158,11,0.55)] scale-105'
                  : 'border-[#64748B]/70 bg-[#0F172A]/90 opacity-80 hover:opacity-100 hover:border-slate-400'
              }`}
            >
              <PartThumbnail
                item={mainItem}
                baseLoadout={b.featuredLoadout}
                width={84}
                height={50}
                className="shrink-0 rounded-xl"
              />
              <div className="text-left min-w-0 flex-1">
                <div className="text-xs font-black text-white whitespace-nowrap">
                  {b.tabBadge}
                </div>
                <div className="text-[10px] font-bold text-[#FEF08A] flex items-center gap-1 mt-0.5">
                  <StarRow count={5} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="relative z-20 self-center px-5 py-2 rounded-xl bg-red-950/95 border-2 border-red-400 text-xs font-bold text-red-100 shadow-xl">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* ===================================================================== */}
      {/* BOTTOM BAR (Left Utility Buttons + Right Wish x1 & x5)                */}
      {/* ===================================================================== */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          {onOpenGarage && (
            <button
              type="button"
              onClick={onOpenGarage}
              className="px-4 py-2.5 rounded-xl bg-[#E2E8F0] hover:bg-white text-[#1E293B] font-extrabold text-xs shadow-md cursor-pointer"
            >
              🛠️ Xưởng Độ Xe
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPoolModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#E2E8F0] hover:bg-white text-[#1E293B] font-extrabold text-xs shadow-md cursor-pointer"
          >
            📦 Kho Skin ({unownedParts.length} Chưa Mở)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={spinning || unownedParts.length === 0}
            onClick={() => executeSpins(1, GACHA_SINGLE_COST)}
            className="min-w-[170px] px-5 py-2 rounded-2xl bg-gradient-to-b from-[#FFFBEB] to-[#FDE68A] hover:from-white hover:to-[#FCD34D] text-[#1E293B] border-2 border-[#D97706] shadow-xl transition-transform active:scale-95 disabled:opacity-50 cursor-pointer text-center"
          >
            <div className="text-sm font-black tracking-wide flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#D97706]" />
              <span>Quay ×1</span>
            </div>
            <div className="text-xs font-mono-num font-extrabold text-[#B45309]">
              🪙 {GACHA_SINGLE_COST} Xu
            </div>
          </button>

          <button
            type="button"
            disabled={spinning || unownedParts.length === 0}
            onClick={() => executeSpins(5, GACHA_FIVE_COST)}
            className="min-w-[190px] px-5 py-2 rounded-2xl bg-gradient-to-b from-[#FEF08A] via-[#F59E0B] to-[#D97706] hover:brightness-110 text-[#0F172A] border-2 border-[#FFFBEB] shadow-xl transition-transform active:scale-95 disabled:opacity-50 cursor-pointer text-center"
          >
            <div className="text-sm font-black tracking-wide flex items-center justify-center gap-1.5">
              <Star className="w-4 h-4 fill-[#0F172A] text-[#0F172A]" />
              <span>Quay ×5 (-10%)</span>
            </div>
            <div className="text-xs font-mono-num font-black text-[#1E293B]">
              🪙 {GACHA_FIVE_COST} Xu
            </div>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* WISH METEOR REVEAL OVERLAY WHEN ITEMS ARE PULLED                      */}
      {/* ===================================================================== */}
      {wonItems.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-4xl rounded-3xl bg-gradient-to-b from-[#1E1B4B] via-[#1E261D] to-[#0F172A] border-2 border-[#FEF08A] p-6 shadow-2xl space-y-5 text-center">
            <div>
              <div className="text-xs font-extrabold text-[#FEF08A] uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FEF08A]" />
                <span>
                  {wasPityHit
                    ? 'NỔ BẢO HIỂM PITY SS/SSS!'
                    : `KẾT QUẢ QUAY ${activeBanner.tabBadge}`}
                </span>
                <Sparkles className="w-4 h-4 text-[#FEF08A]" />
              </div>
              <h3 className="text-xl font-black text-white mt-1">
                Vật Phẩm Mới Nhận Được
              </h3>
            </div>

            <div
              className={`grid gap-4 justify-center ${
                wonItems.length === 1
                  ? 'grid-cols-1 max-w-xs mx-auto'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
              }`}
            >
              {wonItems.map((item) => {
                const tColor = TIER_COLORS[item.tier];
                const slotLabel =
                  SLOT_LABELS.find((s) => s.slot === item.slot)?.label ||
                  item.slot;
                const isEquipped = student.loadout[item.slot] === item.id;
                return (
                  <div
                    key={item.id}
                    style={{ borderColor: tColor.border }}
                    className="rounded-2xl bg-[#0F172A] border-2 p-3 flex flex-col items-center justify-between shadow-xl"
                  >
                    <div className="w-full flex items-center justify-between text-[10px] font-black mb-1">
                      <span className="text-[#CBD5E1] truncate">
                        {slotLabel.replace(/^\d+\.\s*/, '')}
                      </span>
                      <span
                        style={{
                          backgroundColor: tColor.bg,
                          color: tColor.text,
                        }}
                        className="px-2 py-0.5 rounded shrink-0"
                      >
                        {item.tier}
                      </span>
                    </div>

                    <PartThumbnail
                      item={item}
                      baseLoadout={student.loadout}
                      width={130}
                      height={90}
                      animated={wonItems.length === 1}
                    />

                    <div className="my-2 flex flex-col items-center gap-1">
                      <div className="text-xs font-extrabold text-white line-clamp-1">
                        {item.name}
                      </div>
                      <StarRow
                        count={
                          item.tier === 'SSS'
                            ? 5
                            : item.tier === 'SS'
                            ? 4
                            : 3
                        }
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEquipItem(item)}
                      className={`w-full py-1.5 rounded-xl font-extrabold text-xs cursor-pointer flex items-center justify-center gap-1 ${
                        isEquipped
                          ? 'bg-[#22C55E] text-[#0F172A]'
                          : 'bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0F172A]'
                      }`}
                    >
                      {isEquipped ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Đang Dùng</span>
                        </>
                      ) : (
                        'Trang Bị'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setWonItems([])}
                className="px-8 py-2.5 rounded-xl bg-[#FEF08A] hover:bg-white text-[#0F172A] font-black text-sm shadow-lg cursor-pointer"
              >
                Xác Nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISUAL POOL GALLERY MODAL                                             */}
      {/* ===================================================================== */}
      {showPoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-5xl max-h-[85vh] flex flex-col rounded-3xl bg-[#1E261D] border-2 border-[#7A9A75] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-3.5 bg-[#4A6046] border-b border-[#7A9A75]">
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                📦 Kho Skin & Phụ Tùng ({student.ownedParts.length}/
                {ALL_PARTS.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowPoolModal(false)}
                aria-label="Đóng Kho Skin"
                title="Đóng"
                className="w-8 h-8 p-0 leading-none rounded-xl bg-[#1E261D] text-white border border-[#7A9A75] hover:bg-[#2E3B2C] inline-flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.75] block shrink-0" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {ALL_PARTS.map((part) => {
                const owned = student.ownedParts.includes(part.id);
                const tColor = TIER_COLORS[part.tier];
                return (
                  <div
                    key={part.id}
                    style={{ borderColor: owned ? '#4ADE80' : tColor.border }}
                    className={`rounded-2xl bg-[#141A13] border p-2.5 flex flex-col items-center text-center ${
                      owned ? 'opacity-100' : 'opacity-85'
                    }`}
                  >
                    <PartThumbnail item={part} width={110} height={72} />
                    <div className="text-xs font-extrabold text-white mt-1.5 truncate w-full">
                      {part.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        style={{
                          backgroundColor: tColor.bg,
                          color: tColor.text,
                        }}
                        className="px-1.5 py-0.5 rounded text-[10px] font-black"
                      >
                        {part.tier}
                      </span>
                      <span
                        className={`text-[10px] font-bold flex items-center gap-0.5 ${
                          owned ? 'text-[#4ADE80]' : 'text-[#FDE047]'
                        }`}
                      >
                        {owned ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Đã Có</span>
                          </>
                        ) : (
                          'Chưa Mở'
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

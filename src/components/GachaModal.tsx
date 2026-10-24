import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Gift,
  Package,
  Sparkles,
  Star,
  Wrench,
  X,
  FastForward,
  Coins,
} from 'lucide-react';
import {
  ALL_PARTS,
  GACHA_PITY_THRESHOLD,
  SLOT_LABELS,
  TIER_COLORS,
} from '../game/constants';
import { drawModularCar } from '../game/carRenderer';
import { getPartCoinValue, spinGachaPool } from '../game/rules';
import { CarLoadout, PartItem, PartTier, StudentAccount } from '../game/types';
import { dualDB } from '../services/database';
import { soundEngine } from '../services/sound';
import { PartThumbnail, RANK_AURA_PALETTE } from './PartThumbnail';

interface GachaModalProps {
  student: StudentAccount;
  isTeacher?: boolean;
  onUpdateStudent: (updated: StudentAccount) => void;
  onClose: () => void;
  onOpenGarage?: () => void;
}

const GACHA_SINGLE_COST = 50;
const GACHA_FIVE_COST = 225;

export interface WishBannerConfig {
  id: 'banner_tripled' | 'banner_project' | 'banner_poolparty' | 'banner_t1';
  tabBadge: string;
  bannerCategory: string;
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
  emblemImg?: string;
  genshinElement?: string;
}

export const WISH_BANNERS: WishBannerConfig[] = [
  {
    id: 'banner_tripled',
    tabBadge: 'THẦN RỪNG TRIPLED',
    bannerCategory: 'CỔ THỤ ELDERWOOD · SSS',
    ribbon: 'Sự Kiện Rút Thưởng · Dòng Skin Elderwood',
    titleLine1: 'Khế Ước Cổ Thụ:',
    titleLine2: 'Thần Rừng TripleD',
    subtitle: 'Chiến Xa Lồng Ngực Sinh Học, Sừng Linh Thú & Tinh Linh Đom Đóm',
    accentColor: '#10B981',
    secondaryColor: '#FACC15',
    ribbonBg: 'from-[#065F46] via-[#059669] to-[#CA8A04]',
    cardGrad: 'from-[#071710] via-[#112A1E] to-[#1A1C13]',
    featuredName: 'Thần Rừng TripleD: Cổ Thụ',
    featuredTitle: 'Thần Xa Elderwood Sinh Học Bậc SSS',
    emblemImg: '/assets/aistudio/image_68b0c21f.png',
    featuredLoadout: {
      chassis: 'chassis_tripled',
      paint: 'paint_tripled',
      decal: 'decal_tripled',
      wheels: 'wheels_tripled',
      spoiler: 'spoiler_tripled',
      underglow: 'underglow_tripled',
      trail: 'trail_tripled',
    },
    rateUpIds: [
      'chassis_tripled',
      'spoiler_tripled',
      'decal_tripled',
      'underglow_tripled',
      'paint_tripled',
      'wheels_tripled',
      'trail_tripled',
    ],
  },
  {
    id: 'banner_project',
    tabBadge: 'SIÊU PHẨM CYBER',
    bannerCategory: 'QUANG NĂNG HEXTECH · SSS',
    ribbon: 'Sự Kiện Rút Thưởng · Dòng Skin Cyberpunk',
    titleLine1: 'SIÊU PHẨM:',
    titleLine2: 'Kỷ Nguyên Cyber',
    subtitle: 'Bộ Chiến Cơ Hologram & Giáp Quang Học Bậc SSS',
    accentColor: '#EC4899',
    secondaryColor: '#06B6D4',
    ribbonBg: 'from-[#be185d] via-[#6d28d9] to-[#0891b2]',
    cardGrad: 'from-[#0F172A] via-[#1E1B4B] to-[#0D1527]',
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
    bannerCategory: 'THỦY TRIỀU NHIỆT ĐỚI · SSS',
    ribbon: 'Sự Kiện Rút Thưởng · Dòng Skin Mùa Hè',
    titleLine1: 'Tiệc Bãi Biển:',
    titleLine2: 'Sóng Nhiệt Đới',
    subtitle: 'Bộ Thủy Phi Cơ Cá Mập & Phao Cứu Sinh',
    accentColor: '#0284C7',
    secondaryColor: '#F59E0B',
    ribbonBg: 'from-[#0284C7] via-[#06B6D4] to-[#F59E0B]',
    cardGrad: 'from-[#032B45] via-[#075985] to-[#0B132B]',
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
    bannerCategory: 'HOÀNG KIM ĐẾ VƯƠNG · SSS',
    ribbon: 'Sự Kiện Rút Thưởng · Skin Vô Địch Thế Giới',
    titleLine1: 'Huyền Thoại T1:',
    titleLine2: 'Quỷ Vương Bất Tử',
    subtitle: 'Bộ Thần Xa T1 Đỏ Hoàng Gia & 5 Sao Vô Địch',
    accentColor: '#E11D48',
    secondaryColor: '#FACC15',
    ribbonBg: 'from-[#991B1B] via-[#E11D48] to-[#CA8A04]',
    cardGrad: 'from-[#3B0707] via-[#7F1D1D] to-[#120B0B]',
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

export interface PulledGachaEntry {
  item: PartItem;
  isDuplicate: boolean;
  refundCoins: number;
}

interface WishMeteorState {
  active: boolean;
  startTimeMs: number;
  durationMs: number;
  rarity: 'blue' | 'purple' | 'gold';
  highestTier: PartTier;
  pullCount: number;
  pendingItems: PulledGachaEntry[];
  pendingPityHit: boolean;
}

const TIER_ORDER_RANK: Record<PartTier, number> = {
  D: 1,
  C: 2,
  B: 3,
  A: 4,
  S: 5,
  SS: 6,
  SSS: 7,
};

const TIER_METEOR_THEME: Record<
  PartTier,
  {
    core: string;
    mid: string;
    outer: string;
    secondary: string;
    nebulaInner: string;
    nebulaOuter: string;
    flashRgba: string;
    label: string;
    subLabel: string;
    rayCount: number;
    ringCount: number;
    sparkCount: number;
    hasLightning: boolean;
    hasPortal: boolean;
  }
> = {
  D: {
    core: '#FFFFFF',
    mid: '#CBD5E1',
    outer: '#64748B',
    secondary: '#94A3B8',
    nebulaInner: 'rgba(148, 163, 184, 0.22)',
    nebulaOuter: 'rgba(30, 41, 59, 0.45)',
    flashRgba: '226, 232, 240',
    label: 'BẬC D · SAO BĂNG BẠC',
    subLabel: 'KHỞI NGUYÊN CƠ KHÍ',
    rayCount: 4,
    ringCount: 1,
    sparkCount: 24,
    hasLightning: false,
    hasPortal: false,
  },
  C: {
    core: '#FFFFFF',
    mid: '#6EE7B7',
    outer: '#10B981',
    secondary: '#34D399',
    nebulaInner: 'rgba(16, 185, 129, 0.28)',
    nebulaOuter: 'rgba(6, 78, 59, 0.5)',
    flashRgba: '209, 250, 229',
    label: 'BẬC C · TINH THẠCH LỤC BẢO',
    subLabel: 'NĂNG LƯỢNG SINH HỌC',
    rayCount: 6,
    ringCount: 1,
    sparkCount: 34,
    hasLightning: false,
    hasPortal: false,
  },
  B: {
    core: '#FFFFFF',
    mid: '#7DD3FC',
    outer: '#0284C7',
    secondary: '#38BDF8',
    nebulaInner: 'rgba(56, 189, 248, 0.34)',
    nebulaOuter: 'rgba(12, 74, 110, 0.55)',
    flashRgba: '224, 242, 254',
    label: 'BẬC B · LƯU TINH LAM NGỌC',
    subLabel: 'XUNG LỰC QUANG HỌC',
    rayCount: 8,
    ringCount: 2,
    sparkCount: 46,
    hasLightning: false,
    hasPortal: true,
  },
  A: {
    core: '#FFFFFF',
    mid: '#E879F9',
    outer: '#9333EA',
    secondary: '#C084FC',
    nebulaInner: 'rgba(192, 132, 252, 0.4)',
    nebulaOuter: 'rgba(88, 28, 135, 0.6)',
    flashRgba: '250, 232, 255',
    label: 'BẬC A · TINH VÂN TỬ TINH',
    subLabel: 'MA TRẬN HUYỀN BÍ',
    rayCount: 10,
    ringCount: 2,
    sparkCount: 60,
    hasLightning: true,
    hasPortal: true,
  },
  S: {
    core: '#FFFFFF',
    mid: '#FDE047',
    outer: '#D97706',
    secondary: '#F59E0B',
    nebulaInner: 'rgba(250, 204, 21, 0.45)',
    nebulaOuter: 'rgba(146, 64, 14, 0.62)',
    flashRgba: '254, 249, 195',
    label: 'BẬC S · HÀO QUANG HOÀNG KIM',
    subLabel: 'THÁNH VẬT SIÊU CẤP',
    rayCount: 12,
    ringCount: 3,
    sparkCount: 78,
    hasLightning: true,
    hasPortal: true,
  },
  SS: {
    core: '#FFFFFF',
    mid: '#F472B6',
    outer: '#DB2777',
    secondary: '#A855F7',
    nebulaInner: 'rgba(244, 114, 182, 0.52)',
    nebulaOuter: 'rgba(131, 24, 67, 0.68)',
    flashRgba: '255, 228, 230',
    label: 'BẬC SS · CỰC QUANG HUYẾT NGUYỆT',
    subLabel: 'BẢO VẬT CỰC HIẾM',
    rayCount: 14,
    ringCount: 3,
    sparkCount: 96,
    hasLightning: true,
    hasPortal: true,
  },
  SSS: {
    core: '#FFFFFF',
    mid: '#FEF08A',
    outer: '#F59E0B',
    secondary: '#EF4444',
    nebulaInner: 'rgba(250, 204, 21, 0.62)',
    nebulaOuter: 'rgba(185, 28, 28, 0.68)',
    flashRgba: '254, 249, 195',
    label: 'BẬC SSS · THÁNH QUANG THẦN THOẠI',
    subLabel: 'TUYỆT TÁC TỐI THƯỢNG',
    rayCount: 18,
    ringCount: 4,
    sparkCount: 120,
    hasLightning: true,
    hasPortal: true,
  },
};

export const GachaModal: React.FC<GachaModalProps> = ({
  student,
  isTeacher = false,
  onUpdateStudent,
  onClose,
  onOpenGarage,
}) => {
  const [bannerIdx, setBannerIdx] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wishMeteor, setWishMeteor] = useState<WishMeteorState | null>(null);
  const [wonItems, setWonItems] = useState<PulledGachaEntry[]>([]);
  const [wasPityHit, setWasPityHit] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [poolOwnershipFilter, setPoolOwnershipFilter] = useState<'ALL' | 'OWNED' | 'UNOWNED'>('ALL');
  const [poolRankFilter, setPoolRankFilter] = useState<string>('ALL');
  const [poolSlotFilter, setPoolSlotFilter] = useState<string>('ALL');
  const [emblemLoadError, setEmblemLoadError] = useState(false);

  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const meteorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeBanner = WISH_BANNERS[bannerIdx];

  const unownedParts = ALL_PARTS.filter(
    (p) => !student.ownedParts.includes(p.id)
  );
  const pityCount = student.gachaPity || 0;
  const hasFreeTripleDSkin = student.ownedParts.includes('chassis_tripled_a');

  // Auto-dismiss floating notifications so they fade cleanly
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 3200);
    return () => clearTimeout(t);
  }, [errorMsg]);

  useEffect(() => {
    if (!codeMsg) return;
    const t = setTimeout(() => setCodeMsg(null), 3200);
    return () => clearTimeout(t);
  }, [codeMsg]);

  // =========================================================================
  // 1. GENSHIN IMPACT CELESTIAL CONSTELLATION BACKGROUND CANVAS
  // =========================================================================
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Pre-generate cosmic stars & floating Genshin stardust motes
    const stars = Array.from({ length: 75 }).map((_, i) => ({
      x: ((i * 137.5) % 100) / 100,
      y: ((i * 73.1) % 100) / 100,
      r: 0.8 + (i % 3) * 0.9,
      phase: i * 0.7,
      speed: 0.008 + (i % 4) * 0.004,
    }));

    const renderBg = (nowMs: number) => {
      animId = requestAnimationFrame(renderBg);
      const nowSec = nowMs / 1000;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Rotating Genshin Astrolabe / Constellation Ring in background
      ctx.save();
      ctx.translate(w * 0.5, h * 0.5);
      ctx.rotate(nowSec * 0.04);
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(w, h) * 0.44, 0, Math.PI * 2);
      ctx.stroke();

      ctx.setLineDash([12, 18]);
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.12)';
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(w, h) * 0.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Twinkling 4-point Genshin stars & drifting stardust
      for (const st of stars) {
        const sx = st.x * w;
        const sy = ((st.y - nowSec * st.speed + 10) % 1) * h;
        const alpha = 0.25 + 0.55 * Math.abs(Math.sin(nowSec * 1.8 + st.phase));
        ctx.fillStyle = `rgba(254, 240, 138, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    animId = requestAnimationFrame(renderBg);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // =========================================================================
  // 2. HERO VEHICLE & ELEMENTAL ELDERWOOD / GENSHIN RUNES SHOWCASE CANVAS
  // =========================================================================
  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 620;
    const h = 420;
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

      const cx = w * 0.5;
      const cy = h * 0.46;

      // Genshin Wish Sunburst / Elemental Pedestal Aura
      const haloGrad = ctx.createRadialGradient(cx, cy, 12, cx, cy, 185);
      haloGrad.addColorStop(0, `${activeBanner.secondaryColor}AA`);
      haloGrad.addColorStop(0.45, `${activeBanner.accentColor}55`);
      haloGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 185, 0, Math.PI * 2);
      ctx.fill();

      // Outer Genshin Wish Golden Astrolabe Filigree
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(nowSec * 0.15);
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 152, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 144, Math.sin(a) * 144);
        ctx.lineTo(Math.cos(a) * 158, Math.sin(a) * 158);
        ctx.stroke();
      }
      ctx.restore();

      if (activeBanner.id === 'banner_tripled') {
        // ELDERWOOD TRIPLED: Enchanted Forest Roots, Anatomical Ribcage Halo & Glowing Fireflies
        ctx.save();
        ctx.translate(cx, cy);

        // Rotating Elderwood Rune Ring
        ctx.rotate(nowSec * 0.28);
        ctx.strokeStyle = '#34D399';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([16, 8, 4, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, 130, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Counter-rotating Golden Autumn Leaf Ring
        ctx.rotate(-nowSec * 0.55);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const rx = Math.cos(a) * 108;
          const ry = Math.sin(a) * 108;
          if (i === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Floating Elderwood Bioluminescent Fireflies & Spores
        for (let i = 0; i < 12; i++) {
          const a = nowSec * 0.75 + (i * Math.PI) / 6;
          const dist = 95 + (i % 4) * 18 + Math.sin(nowSec * 2 + i) * 8;
          const fx = cx + Math.cos(a) * dist;
          const fy = cy + Math.sin(a * 1.2) * (dist * 0.75);
          ctx.fillStyle = i % 2 === 0 ? '#6EE7B7' : '#FEF08A';
          ctx.shadowColor = i % 2 === 0 ? '#10B981' : '#FACC15';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(fx, fy, 3.2 + (i % 3) * 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      } else if (activeBanner.id === 'banner_project') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(nowSec * 0.35);
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 2;
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
        ctx.lineWidth = 2.2;
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
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([14, 8]);
        ctx.rotate(nowSec * 0.25);
        ctx.beginPath();
        ctx.arc(0, 0, 125, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 2;
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

        ctx.strokeStyle = 'rgba(254, 240, 138, 0.5)';
        ctx.lineWidth = 1.8;
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
        scale: 2.95,
        nowSec,
        drifting: true,
        nitroActive: true,
      });

      ctx.restore();
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeBanner]);

  // =========================================================================
  // 3. LUXURY MULTI-STAGE GACHA SUMMONING CUTSCENE (TAILORED TO ALL 7 TIERS)
  // =========================================================================
  useEffect(() => {
    if (!wishMeteor || !wishMeteor.active) return;
    const canvas = meteorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const theme =
      TIER_METEOR_THEME[wishMeteor.highestTier] || TIER_METEOR_THEME.B;
    const tierScore = TIER_ORDER_RANK[wishMeteor.highestTier] || 3;

    let animId = 0;

    const finishMeteorCutscene = () => {
      setSpinning(false);
      setWonItems(wishMeteor.pendingItems);
      setWasPityHit(wishMeteor.pendingPityHit);
      const hasMythic = wishMeteor.pendingItems.some(
        (entry) => entry.item.tier === 'SS' || entry.item.tier === 'SSS'
      );
      soundEngine.playFanfare(hasMythic);
      setWishMeteor(null);
    };

    // Helper: quadratic Bezier point along curved celestial arc
    const getArcPoint = (t: number, offsetPerp = 0) => {
      const p0x = w * 0.88;
      const p0y = h * 0.12;
      const p1x = w * 0.42;
      const p1y = h * 0.18;
      const p2x = w * 0.26;
      const p2y = h * 0.72;

      const inv = 1 - t;
      const x = inv * inv * p0x + 2 * inv * t * p1x + t * t * p2x;
      const y = inv * inv * p0y + 2 * inv * t * p1y + t * t * p2y;

      return {
        x: x + offsetPerp * 0.65,
        y: y + offsetPerp * 0.75,
      };
    };

    const drawMeteor = (nowMs: number) => {
      const elapsed = nowMs - wishMeteor.startTimeMs;
      const progress = Math.min(1, Math.max(0, elapsed / wishMeteor.durationMs));
      const nowSec = nowMs / 1000;

      if (progress >= 1) {
        finishMeteorCutscene();
        return;
      }

      animId = requestAnimationFrame(drawMeteor);

      const isAwakened = progress >= 0.24;
      const activeMid = isAwakened ? theme.mid : '#BAE6FD';
      const activeOuter = isAwakened ? theme.outer : '#0284C7';
      const activeSec = isAwakened ? theme.secondary : '#38BDF8';

      // 1. Deep Velvet Cosmos & Dynamic Tier Nebula Backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, w, h);
      skyGrad.addColorStop(0, '#02040A');
      skyGrad.addColorStop(0.45, '#070D1D');
      skyGrad.addColorStop(0.85, '#0F172A');
      skyGrad.addColorStop(1, '#03060E');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Ambient Tier-Colored Nebula Clouds
      const nebX = w * (0.65 - progress * 0.35);
      const nebY = h * (0.25 + progress * 0.35);
      const nebRadius = Math.max(w, h) * (isAwakened ? 0.58 : 0.38);
      const nebGrad = ctx.createRadialGradient(
        nebX,
        nebY,
        10,
        nebX,
        nebY,
        nebRadius
      );
      nebGrad.addColorStop(
        0,
        isAwakened ? theme.nebulaInner : 'rgba(56, 189, 248, 0.22)'
      );
      nebGrad.addColorStop(
        0.5,
        isAwakened ? theme.nebulaOuter : 'rgba(15, 23, 42, 0.3)'
      );
      nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = nebGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Twinkling Celestial Starfield & Warp Speed Lines
      ctx.save();
      for (let i = 0; i < 55; i++) {
        const sx = (((i * 173.3) % 100) / 100) * w;
        const sy = (((i * 97.1) % 100) / 100) * h;
        const twinkle = 0.2 + 0.7 * Math.abs(Math.sin(nowSec * 3.5 + i));
        ctx.fillStyle = i % 3 === 0 ? activeMid : '#FFFFFF';
        ctx.globalAlpha = twinkle * 0.75;
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 3) * 0.8 + 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Warp streaks along diagonal
        if (i % 2 === 0) {
          const streakX = (((i * 197) / 100 + progress * 0.55) % 1) * w;
          const streakY = (((i * 89) / 100 - progress * 0.35 + 1) % 1) * h;
          ctx.strokeStyle = i % 4 === 0 ? activeMid : 'rgba(226, 232, 240, 0.25)';
          ctx.globalAlpha = 0.32;
          ctx.lineWidth = i % 4 === 0 ? 1.8 : 1;
          ctx.beginPath();
          ctx.moveTo(streakX, streakY);
          ctx.lineTo(streakX + 42, streakY - 28);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 3. Upper-Right Dimensional Summoning Portal (Gate of Babylon / Genshin Astral Rift)
      if (theme.hasPortal && progress < 0.65) {
        const portalAlpha = Math.max(0, 1 - progress / 0.65);
        const px = w * 0.88;
        const py = h * 0.12;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-0.62);
        ctx.scale(1, 0.52);
        ctx.globalAlpha = portalAlpha;

        const portalGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, 135);
        portalGlow.addColorStop(0, '#FFFFFF');
        portalGlow.addColorStop(0.35, activeMid);
        portalGlow.addColorStop(0.7, activeOuter);
        portalGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = portalGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 135, 0, Math.PI * 2);
        ctx.fill();

        for (let r = 0; r < theme.ringCount; r++) {
          ctx.save();
          ctx.rotate(nowSec * (r % 2 === 0 ? 1.4 : -1.1) + r);
          ctx.strokeStyle = r === 0 ? '#FFFFFF' : activeMid;
          ctx.lineWidth = 2 - r * 0.3;
          ctx.setLineDash(r % 2 === 1 ? [10, 8] : []);
          ctx.beginPath();
          ctx.arc(0, 0, 52 + r * 26, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }

      // 4. Target 3D Sacred Astrolabe Altar at Impact Zone (appears as comet approaches)
      const destPt = getArcPoint(1);
      if (progress > 0.22) {
        const altarAlpha = Math.min(1, (progress - 0.22) / 0.35);
        ctx.save();
        ctx.translate(destPt.x, destPt.y);
        ctx.scale(1, 0.44);
        ctx.globalAlpha = altarAlpha * 0.85;

        const altarRadius = 85 + tierScore * 16;
        for (let r = 0; r < theme.ringCount; r++) {
          ctx.save();
          ctx.rotate(nowSec * (r % 2 === 0 ? 1.2 : -1.5));
          ctx.strokeStyle = r === 0 ? activeMid : activeSec;
          ctx.lineWidth = 2.2;
          ctx.setLineDash(r % 2 === 0 ? [14, 8] : []);
          ctx.beginPath();
          ctx.arc(0, 0, altarRadius - r * 22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }

      // 5. Curved Bezier Comet Trajectory & Companion Retinue
      const flightT = Math.min(1, progress / 0.8);
      const easedT = 1 - Math.pow(1 - flightT, 2.25);
      const headPt = getArcPoint(easedT);
      const mx = headPt.x;
      const my = headPt.y;

      // Companion Retinue Stars spiraling along the curved path
      const companionCount =
        wishMeteor.pullCount > 1 ? 5 : Math.min(4, Math.max(1, tierScore - 2));
      for (let c = 0; c < companionCount; c++) {
        const lag = 0.045 + c * 0.038;
        const ct = Math.max(0, Math.min(1, (progress - lag) / 0.8));
        if (ct <= 0) continue;
        const ce = 1 - Math.pow(1 - ct, 2.25);
        const waveOffset =
          Math.sin(ce * Math.PI * 3.5 + c * 1.6) * (26 + c * 10);
        const cpt = getArcPoint(ce, waveOffset);

        ctx.save();
        ctx.strokeStyle = c % 2 === 0 ? activeMid : activeSec;
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(cpt.x, cpt.y);
        const tailPrev = getArcPoint(Math.max(0, ce - 0.12), waveOffset * 0.7);
        ctx.lineTo(tailPrev.x, tailPrev.y);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(cpt.x, cpt.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 6. Multi-Layered Braided Ribbon Tail along Bezier Curve
      const ribbonSegments = 22;
      const tailSpanT = 0.34;
      for (let strand = 0; strand < (tierScore >= 5 ? 3 : 2); strand++) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let s = 0; s < ribbonSegments; s++) {
          const frac0 = s / ribbonSegments;
          const frac1 = (s + 1) / ribbonSegments;
          const t0 = Math.max(0, easedT - frac0 * tailSpanT);
          const t1 = Math.max(0, easedT - frac1 * tailSpanT);
          if (t0 <= t1) continue;

          const braidWave0 =
            strand === 0
              ? 0
              : Math.sin(frac0 * Math.PI * 4 + nowSec * 10 + strand * 2.1) *
                (14 * frac0);
          const braidWave1 =
            strand === 0
              ? 0
              : Math.sin(frac1 * Math.PI * 4 + nowSec * 10 + strand * 2.1) *
                (14 * frac1);

          const pt0 = getArcPoint(t0, braidWave0);
          const pt1 = getArcPoint(t1, braidWave1);

          const alpha = (1 - frac0) * (strand === 0 ? 0.95 : 0.65);
          ctx.strokeStyle =
            strand === 0
              ? frac0 < 0.2
                ? '#FFFFFF'
                : activeMid
              : strand === 1
              ? activeOuter
              : activeSec;
          ctx.globalAlpha = alpha;
          ctx.lineWidth =
            (strand === 0 ? (isAwakened ? 20 : 12) : 7) * (1 - frac0 * 0.82);

          ctx.beginPath();
          ctx.moveTo(pt0.x, pt0.y);
          ctx.lineTo(pt1.x, pt1.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 7. Sparkling Stardust & Crystal Shards Wake Behind the Comet
      ctx.save();
      for (let sp = 0; sp < theme.sparkCount; sp++) {
        const spFrac = ((sp * 37) % 100) / 100;
        const spT = Math.max(0, easedT - spFrac * 0.38);
        if (spT <= 0) continue;
        const spread =
          Math.sin(sp * 2.7 + nowSec * 5) * (12 + spFrac * (28 + tierScore * 5));
        const spPt = getArcPoint(spT, spread);
        const spSize = (1 - spFrac) * (sp % 4 === 0 ? 4.2 : 2.4);

        ctx.fillStyle =
          sp % 3 === 0 ? '#FFFFFF' : sp % 3 === 1 ? activeMid : activeSec;
        ctx.globalAlpha = (1 - spFrac) * 0.85;
        ctx.translate(spPt.x, spPt.y);
        ctx.rotate(nowSec * 3 + sp);
        ctx.beginPath();
        // Diamond crystal particle
        ctx.moveTo(0, -spSize * 1.4);
        ctx.lineTo(spSize, 0);
        ctx.lineTo(0, spSize * 1.4);
        ctx.lineTo(-spSize, 0);
        ctx.closePath();
        ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.restore();

      // 8. Volumetric Rotating God-Rays around Awakened Comet Core
      if (isAwakened) {
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(nowSec * 0.65);
        const rayLen = 90 + tierScore * 22;
        for (let r = 0; r < theme.rayCount; r++) {
          ctx.rotate((Math.PI * 2) / theme.rayCount);
          const rayGrad = ctx.createLinearGradient(0, 0, rayLen, 0);
          rayGrad.addColorStop(0, activeMid);
          rayGrad.addColorStop(0.5, activeOuter);
          rayGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = rayGrad;
          ctx.globalAlpha = r % 2 === 0 ? 0.42 : 0.2;
          ctx.beginPath();
          ctx.moveTo(0, -2);
          ctx.lineTo(rayLen, -7);
          ctx.lineTo(rayLen, 7);
          ctx.lineTo(0, 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // 9. Glowing Comet Head Halo & Multi-Ring Astrolabe Core
      const headRadius = isAwakened ? 95 + tierScore * 12 : 68;
      const headGlow = ctx.createRadialGradient(mx, my, 4, mx, my, headRadius);
      headGlow.addColorStop(0, '#FFFFFF');
      headGlow.addColorStop(0.28, activeMid);
      headGlow.addColorStop(0.65, activeOuter);
      headGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = headGlow;
      ctx.beginPath();
      ctx.arc(mx, my, headRadius, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Sacred Geometric Ring around Comet Core
      if (isAwakened && tierScore >= 4) {
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(-nowSec * 2.2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, 34 + tierScore * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 8-Point Celestial Starburst Flare at Comet Nucleus
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(progress * Math.PI * 3.5);
      const primaryArm = isAwakened ? 78 + tierScore * 8 : 52;
      ctx.fillStyle = '#FFFFFF';
      for (let arm = 0; arm < 2; arm++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, 0, primaryArm, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = activeMid;
      for (let arm = 0; arm < 2; arm++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, 0, primaryArm * 0.62, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 10. Crackling Energy Lightning Arcs for High Tiers (A / S / SS / SSS)
      if (isAwakened && theme.hasLightning) {
        ctx.save();
        ctx.translate(mx, my);
        const boltCount = tierScore >= 6 ? 5 : 3;
        for (let b = 0; b < boltCount; b++) {
          const baseAng = (b / boltCount) * Math.PI * 2 + nowSec * 6;
          ctx.strokeStyle = b % 2 === 0 ? '#FFFFFF' : activeMid;
          ctx.lineWidth = 1.8;
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          let bx = 0;
          let by = 0;
          ctx.moveTo(bx, by);
          for (let seg = 1; seg <= 4; seg++) {
            const dist = seg * (14 + tierScore * 2.5);
            const jitter = Math.sin(nowSec * 28 + b * 7 + seg * 3) * 0.35;
            bx = Math.cos(baseAng + jitter) * dist;
            by = Math.sin(baseAng + jitter) * dist;
            ctx.lineTo(bx, by);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // 11. Dual Expanding Rarity Awakening Shockwaves (progress 0.24 -> 0.78)
      if (progress > 0.24 && progress < 0.78) {
        const ringP = (progress - 0.24) / 0.54;
        ctx.save();
        ctx.strokeStyle = activeMid;
        ctx.globalAlpha = Math.max(0, 1 - ringP);
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(mx, my, 24 + ringP * (220 + tierScore * 25), 0, Math.PI * 2);
        ctx.stroke();

        if (tierScore >= 5) {
          ctx.strokeStyle = activeSec;
          ctx.globalAlpha = Math.max(0, (1 - ringP) * 0.75);
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(mx, my, 12 + ringP * (150 + tierScore * 20), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 12. Impact Pillar of Light at progress >= 0.72
      if (progress > 0.72) {
        const pillarP = Math.min(1, (progress - 0.72) / 0.22);
        const pillarW = (65 + tierScore * 18) * pillarP;
        const pillarGrad = ctx.createLinearGradient(
          mx - pillarW,
          0,
          mx + pillarW,
          0
        );
        pillarGrad.addColorStop(0, 'rgba(0,0,0,0)');
        pillarGrad.addColorStop(0.3, activeOuter);
        pillarGrad.addColorStop(0.5, '#FFFFFF');
        pillarGrad.addColorStop(0.7, activeMid);
        pillarGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.save();
        ctx.globalAlpha = pillarP * 0.85;
        ctx.fillStyle = pillarGrad;
        ctx.fillRect(mx - pillarW, 0, pillarW * 2, h);
        ctx.restore();
      }

      // 13. Luxury Ornate Bottom Rarity Awakening HUD Plaque
      if (isAwakened) {
        const bw = 390;
        const bh = 54;
        const bx = w * 0.5 - bw / 2;
        const by = h - 78;

        ctx.save();
        ctx.fillStyle = 'rgba(5, 10, 22, 0.86)';
        ctx.strokeStyle = activeMid;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 14);
        ctx.fill();
        ctx.stroke();

        ctx.font = '800 10px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText(theme.subLabel, w * 0.5, by + 20);

        ctx.font = '900 14px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = activeMid;
        ctx.fillText(theme.label, w * 0.5, by + 40);
        ctx.restore();
      }

      // 14. Final Supernova Prismatic Flash (progress 0.8 -> 1.0)
      if (progress > 0.8) {
        const flashAlpha = Math.min(1, (progress - 0.8) / 0.19);
        ctx.fillStyle = `rgba(${theme.flashRgba}, ${flashAlpha})`;
        ctx.fillRect(0, 0, w, h);
      }
    };

    animId = requestAnimationFrame(drawMeteor);
    return () => cancelAnimationFrame(animId);
  }, [wishMeteor]);

  const executeSpins = (count: number, totalCost: number) => {
    setErrorMsg(null);
    setCodeMsg(null);
    if (student.coins < totalCost) {
      setErrorMsg(
        `Thiếu Xu! Cần ${totalCost} Xu (Hiện có ${student.coins} Xu).`
      );
      return;
    }

    setSpinning(true);
    setWonItems([]);

    const currentOwned = [...student.ownedParts];
    let currentPityVal = student.gachaPity || 0;
    let hitPityAny = false;
    let totalRefundCoins = 0;
    const pulled: PulledGachaEntry[] = [];

    for (let i = 0; i < count; i++) {
      const res = spinGachaPool(
        currentOwned,
        currentPityVal,
        Math.random,
        activeBanner.rateUpIds
      );
      if (res.item) {
        pulled.push({
          item: res.item,
          isDuplicate: res.isDuplicate,
          refundCoins: res.refundCoins,
        });
        if (res.isDuplicate) {
          totalRefundCoins += res.refundCoins;
        } else {
          currentOwned.push(res.item.id);
        }
        currentPityVal = res.newPity;
        if (res.isPityTriggered) hitPityAny = true;
      }
    }

    onUpdateStudent({
      ...student,
      coins: student.coins - totalCost + totalRefundCoins,
      ownedParts: currentOwned,
      gachaPity: currentPityVal,
    });

    // Determine exact highest tier pulled (D -> SSS) and sound rarity
    const highestTier: PartTier = pulled.reduce<PartTier>((best, cur) => {
      return TIER_ORDER_RANK[cur.item.tier] > TIER_ORDER_RANK[best]
        ? cur.item.tier
        : best;
    }, pulled[0]?.item.tier || 'D');

    const hasGold =
      highestTier === 'SSS' || highestTier === 'SS' || highestTier === 'S';
    const hasPurple = highestTier === 'A' || highestTier === 'B';
    const rarity: 'blue' | 'purple' | 'gold' = hasGold
      ? 'gold'
      : hasPurple
      ? 'purple'
      : 'blue';

    soundEngine.playGenshinWishMeteor(rarity);

    setWishMeteor({
      active: true,
      startTimeMs: performance.now(),
      durationMs: 2250,
      rarity,
      highestTier,
      pullCount: pulled.length,
      pendingItems: pulled,
      pendingPityHit: hitPityAny,
    });
  };

  const handleSkipWishMeteor = () => {
    if (!wishMeteor) return;
    const items = wishMeteor.pendingItems;
    const pityHit = wishMeteor.pendingPityHit;
    setWishMeteor(null);
    setSpinning(false);
    setWonItems(items);
    setWasPityHit(pityHit);
    const hasMythic = items.some(
      (entry) => entry.item.tier === 'SS' || entry.item.tier === 'SSS'
    );
    soundEngine.playFanfare(hasMythic);
  };

  const handleClaimTripleDCode = () => {
    setErrorMsg(null);
    const res = dualDB.redeemGiftcode(student.email, 'TRIPLED');
    setCodeMsg({ ok: res.ok, text: res.message });
    if (res.ok) {
      soundEngine.playFanfare(true);
      const updated = dualDB.getStudent(student.email);
      if (updated) {
        onUpdateStudent(updated);
      }
    } else {
      soundEngine.playHazardHit();
    }
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
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#070B14] text-white p-3 sm:p-5 overflow-hidden select-none">
      {/* ABSOLUTE TOP-RIGHT CORNER CLOSE BUTTON */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng Vòng Quay Gacha"
        title="Đóng (ESC)"
        className="absolute top-3 right-3 sm:top-5 sm:right-6 z-50 w-10 h-10 rounded-full bg-[#0F172A]/90 hover:bg-rose-600 hover:text-white border-2 border-[#FACC15]/70 text-[#FEF9C3] flex items-center justify-center shadow-[0_0_24px_rgba(0,0,0,0.85)] cursor-pointer transition-all hover:scale-110 active:scale-95"
      >
        <X className="w-5 h-5 stroke-[2.75]" />
      </button>

      {/* Genshin Celestial Constellation & Stardust Canvas */}
      <canvas
        ref={bgCanvasRef}
        className="pointer-events-none fixed inset-0 z-0 opacity-90"
      />

      {/* Dynamic Elemental Nebula Glow */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-35">
        <div
          style={{ backgroundColor: activeBanner.accentColor }}
          className="absolute -top-32 left-1/4 w-[540px] h-[540px] rounded-full blur-[150px] transition-all duration-700"
        />
        <div
          style={{ backgroundColor: activeBanner.secondaryColor }}
          className="absolute bottom-0 right-10 w-[480px] h-[480px] rounded-full blur-[150px] transition-all duration-700"
        />
      </div>

      {/* ===================================================================== */}
      {/* TOP BAR: EVENT GACHA HEADER + BANNER TABS + PRIMOGEM/COIN BAR         */}
      {/* ===================================================================== */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 max-w-7xl w-full mx-auto pr-12 sm:pr-16">
        {/* Left: Gacha Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#D97706] via-[#FACC15] to-[#FEF9C3] p-0.5 shadow-[0_0_24px_rgba(250,204,21,0.5)]">
            <div className="w-full h-full bg-[#0F172A] rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#FEF08A]" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black tracking-wide text-[#FEF9C3] flex items-center gap-2">
              <span>VÒNG QUAY CHIẾN CƠ</span>
            </div>
            <div className="text-[11px] text-slate-300 font-medium hidden sm:block">
              Săn Thần Xa SSS & Bộ Trang Phục Giới Hạn
            </div>
          </div>
        </div>

        {/* Center: Event Wish Banner Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0F172A]/90 border border-[#FACC15]/40 shadow-[0_8px_30px_rgba(0,0,0,0.65)] overflow-x-auto max-w-full">
          {WISH_BANNERS.map((b, idx) => {
            const isSelected = idx === bannerIdx;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBannerIdx(idx);
                  setWonItems([]);
                  setCodeMsg(null);
                  soundEngine.playCoin();
                }}
                className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#FEF08A] via-[#FACC15] to-[#F59E0B] text-[#0F172A] shadow-[0_0_18px_rgba(250,204,21,0.55)] scale-105'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    isSelected
                      ? 'fill-[#0F172A] text-[#0F172A]'
                      : 'text-[#FACC15]'
                  }`}
                />
                <span>{b.tabBadge}</span>
              </button>
            );
          })}
        </div>

        {/* Right Actions: Pity Counter & Coin Balance */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-[#0F172A]/95 border border-[#FACC15]/40 flex items-center gap-1.5 text-xs font-mono-num font-bold shadow">
            <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="text-slate-300">Bảo Hiểm:</span>
            <span className="text-[#FEF08A] font-black">
              {pityCount}/{GACHA_PITY_THRESHOLD}
            </span>
          </div>

          <div
            title="Số Xu Hiện Có"
            className="px-3.5 py-1.5 rounded-full bg-[#0F172A]/95 border border-[#FACC15]/80 flex items-center gap-1.5 text-xs sm:text-sm font-mono-num font-black text-[#FEF08A] shadow"
          >
            <Coins className="w-4.5 h-4.5 text-[#FACC15]" />
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
              className="px-2.5 py-1.5 rounded-full bg-[#22C55E] hover:bg-[#4ADE80] text-[#0F172A] font-black text-xs shadow cursor-pointer"
            >
              +1K
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CENTER GENSHIN EVENT WISH SHOWCASE STAGE                              */}
      {/* ===================================================================== */}
      <div className="relative z-10 max-w-7xl w-full mx-auto my-auto flex items-center gap-3">
        {/* Carousel Arrow Left */}
        <button
          type="button"
          aria-label="Banner trước"
          onClick={() =>
            setBannerIdx(
              (i) => (i - 1 + WISH_BANNERS.length) % WISH_BANNERS.length
            )
          }
          className="hidden sm:flex w-11 h-11 rounded-full bg-[#0F172A]/90 hover:bg-[#1E293B] border border-[#FACC15]/60 items-center justify-center text-[#FEF08A] shrink-0 cursor-pointer transition-all shadow-xl"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Ornate Genshin Impact Wish Frame */}
        <div
          data-testid="gacha-banner-card"
          className={`relative flex-1 rounded-3xl border-2 border-[#FDE047]/65 bg-gradient-to-r ${activeBanner.cardGrad} text-white shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden min-h-[465px] sm:min-h-[505px] grid grid-cols-1 lg:grid-cols-12`}
        >
          {/* Decorative Genshin Corner Gold Accents */}
          <div className="pointer-events-none absolute inset-2 rounded-2xl border border-[#FEF08A]/20 z-20" />

          {/* Top-Left Genshin Event Wish Ribbon */}
          <div
            className={`absolute top-4 left-0 z-30 px-4 py-1.5 rounded-r-full bg-gradient-to-r ${activeBanner.ribbonBg} text-white text-xs font-black tracking-wide shadow-lg flex items-center gap-1.5 border-y border-r border-[#FEF08A]/60`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FEF08A]" />
            <span>{activeBanner.ribbon}</span>
          </div>

          {/* LEFT 6 COLS: Genshin Typography, Free TripleD Code Banner & Rate-Up Grid */}
          <div className="lg:col-span-6 h-full p-5 sm:p-6 pt-13 sm:pt-14 flex flex-col justify-between relative z-10 bg-gradient-to-r from-black/55 via-black/35 to-transparent backdrop-blur-[2px]">
            <div className="space-y-2">
              <div className="text-[11px] font-extrabold tracking-widest uppercase text-[#FEF08A]">
                {activeBanner.genshinElement}
              </div>

              <div className="leading-tight flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                  {activeBanner.titleLine1}
                </span>
                <span
                  style={{ color: activeBanner.accentColor }}
                  className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
                >
                  {activeBanner.titleLine2}
                </span>
              </div>

              <div className="text-xs sm:text-sm font-semibold text-slate-200">
                {activeBanner.subtitle}
              </div>

              {/* Genshin Rate-Up Guarantee Notice */}
              <div className="text-xs font-bold text-[#FEF08A] flex items-center gap-1.5 pt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FACC15] shrink-0" />
                <span>
                  Tăng tỷ lệ rơi vật phẩm bộ {activeBanner.tabBadge} · Bảo hiểm{' '}
                  {GACHA_PITY_THRESHOLD} lượt chắc chắn nhận SS/SSS
                </span>
              </div>
            </div>

            {/* Rate-Up Item Grid (6 Mini Cards) */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#FEF9C3] uppercase tracking-wider">
                  Vật Phẩm Tăng Tỷ Lệ UP! ({ownedInBannerCount}/
                  {rateUpParts.length})
                </span>
                {ownedInBannerCount > 0 && (
                  <button
                    type="button"
                    onClick={handleEquipBannerOwnedSet}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#FEF08A] to-[#F59E0B] hover:brightness-110 text-[#0F172A] text-xs font-black cursor-pointer shadow transition-transform active:scale-95"
                  >
                    ⚡ Trang Bị Bộ Này
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
                      className={`relative rounded-xl border p-2 bg-[#0B1120]/85 backdrop-blur text-center shadow flex flex-col justify-between h-[94px] transition-all ${
                        owned
                          ? 'border-[#4ADE80] cursor-pointer hover:border-emerald-300'
                          : 'border-[#FACC15]/35 hover:border-[#FACC15]'
                      }`}
                    >
                      <span
                        className={`absolute top-1 right-1 z-10 px-1.5 py-0.2 rounded text-[9px] font-black leading-none ${
                          part.tier === 'SSS'
                            ? 'bg-rose-500 text-white'
                            : part.tier === 'SS'
                            ? 'bg-amber-400 text-slate-900'
                            : 'bg-sky-400 text-slate-900'
                        }`}
                      >
                        {part.tier}
                      </span>

                      <PartThumbnail
                        item={part}
                        baseLoadout={activeBanner.featuredLoadout}
                        width={108}
                        height={48}
                        className="mx-auto shrink-0"
                      />

                      <div className="text-[10px] font-bold text-slate-100 truncate px-0.5">
                        {part.name}
                      </div>

                      <div className="text-[9px] font-extrabold flex items-center justify-center gap-0.5 leading-none">
                        {owned ? (
                          <span className="text-[#4ADE80] flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Đã Sở Hữu
                          </span>
                        ) : (
                          <span className="text-[#FDE047]">★ RATE UP!</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT 6 COLS: Dynamic Render Canvas, Uploaded TripleD Emblem Crest & Genshin Nameplate */}
          <div className="lg:col-span-6 h-full relative flex items-center justify-center p-4 sm:p-6 min-h-[280px]">
            {/* Uploaded TripleD Botanical Ribcage Emblem Watermark & Badge on TripleD Banner */}
            {activeBanner.emblemImg && !emblemLoadError && (
              <div className="absolute top-4 right-5 z-20 flex items-center gap-2.5 bg-[#EAE6DF]/95 border-2 border-[#34D399] rounded-2xl p-1.5 pr-3 shadow-[0_10px_30px_rgba(16,185,129,0.4)]">
                <img
                  src={activeBanner.emblemImg}
                  alt="Biểu tượng TripleD Cổ Thụ"
                  referrerPolicy="no-referrer"
                  onError={() => setEmblemLoadError(true)}
                  className="w-12 h-12 rounded-xl object-contain bg-[#EAE6DF]"
                />
                <div className="text-left">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#273824]">
                    ẤN KÝ NGUYÊN BẢN
                  </div>
                  <div className="text-xs font-black text-[#065F46]">
                    TRIPLE D ELDERWOOD
                  </div>
                </div>
              </div>
            )}

            <canvas
              ref={heroCanvasRef}
              className="w-full max-w-[500px] h-[320px] sm:h-[360px] object-contain block"
            />

            {/* Genshin Impact Style Slanted Character/Vehicle Nameplate */}
            <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-3 pointer-events-none">
              <div className="bg-[#0B1120]/95 backdrop-blur-md border-2 border-[#FACC15] rounded-2xl px-4 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.85)] min-w-[250px]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-gradient-to-r from-[#FACC15] to-[#F59E0B] text-[#0F172A] text-[10px] font-black uppercase">
                    UP! · {activeBanner.tabBadge}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[#FACC15] text-[10px] font-sci font-black">
                    SSS
                  </span>
                </div>
                <div className="text-sm sm:text-base font-black text-white mt-1 truncate">
                  {activeBanner.featuredName}
                </div>
                <div className="text-xs font-bold text-[#FEF08A] truncate">
                  {activeBanner.featuredTitle}
                </div>
              </div>

              <div className="bg-[#0B1120]/95 backdrop-blur-md border border-[#FACC15]/50 rounded-xl px-3 py-1.5 text-right shrink-0 hidden sm:block">
                <div className="text-[9px] text-slate-300 font-bold uppercase">
                  Kho Báu Còn Lại
                </div>
                <div className="font-mono-num text-xs font-black text-[#4ADE80]">
                  {unownedParts.length}/{ALL_PARTS.length} Món
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Arrow Right */}
        <button
          type="button"
          aria-label="Banner tiếp theo"
          onClick={() => setBannerIdx((i) => (i + 1) % WISH_BANNERS.length)}
          className="hidden sm:flex w-11 h-11 rounded-full bg-[#0F172A]/90 hover:bg-[#1E293B] border border-[#FACC15]/60 items-center justify-center text-[#FEF08A] shrink-0 cursor-pointer transition-all shadow-xl"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Floating Non-Intrusive Toast Notification (Never shifts or displaces the banner layout) */}
      {(errorMsg || codeMsg) && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-md w-max px-6 py-2.5 rounded-full flex items-center justify-center transition-all animate-bounce">
          {errorMsg && (
            <div className="px-5 py-2.5 rounded-full bg-rose-950/98 border-2 border-rose-500 text-xs sm:text-sm font-black text-rose-100 shadow-[0_12px_40px_rgba(244,63,94,0.5)]">
              ⚠️ {errorMsg}
            </div>
          )}
          {!errorMsg && codeMsg && (
            <div
              className={`px-5 py-2.5 rounded-full border-2 text-xs sm:text-sm font-black shadow-[0_12px_40px_rgba(0,0,0,0.85)] ${
                codeMsg.ok
                  ? 'bg-emerald-950/98 border-emerald-400 text-emerald-100'
                  : 'bg-rose-950/98 border-rose-500 text-rose-100'
              }`}
            >
              {codeMsg.text}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* BOTTOM GENSHIN WISH ACTION BAR                                        */}
      {/* ===================================================================== */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 max-w-7xl w-full mx-auto">
        {/* Left Genshin Utility Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenGarage && (
            <button
              type="button"
              onClick={onOpenGarage}
              className="px-4 py-2.5 rounded-full bg-[#EAE6DF] hover:bg-white text-[#1E293B] border-2 border-[#D97706] font-extrabold text-xs shadow-lg cursor-pointer inline-flex items-center gap-1.5 transition-all"
            >
              <Wrench className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Xưởng Độ Xe</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPoolModal(true)}
            className="px-4 py-2.5 rounded-full bg-[#162032]/95 hover:bg-[#1E293B] border border-[#FACC15]/50 text-[#FEF9C3] font-bold text-xs shadow-lg cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          >
            <Package className="w-3.5 h-3.5 text-[#FACC15]" />
            <span>Chi Tiết Kho Skin ({unownedParts.length} Chưa Mở)</span>
          </button>
        </div>

        {/* Right Iconic Genshin Cream-Gold Wish Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={spinning}
            onClick={() => executeSpins(1, GACHA_SINGLE_COST)}
            className="min-w-[168px] px-5 py-2 rounded-full bg-gradient-to-b from-[#FAF8F5] to-[#E5E0D5] hover:brightness-105 text-[#3B4254] border-2 border-[#D4AF37] shadow-[0_6px_24px_rgba(0,0,0,0.65)] transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-center"
          >
            <div className="text-xs font-black flex items-center justify-center gap-1.5 text-[#2E3545]">
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Quay ×1</span>
            </div>
            <div className="text-xs font-mono-num font-black text-[#B45309] mt-0.5 flex items-center justify-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              <span>{GACHA_SINGLE_COST}</span>
            </div>
          </button>

          <button
            type="button"
            disabled={spinning}
            onClick={() => executeSpins(5, GACHA_FIVE_COST)}
            className="min-w-[190px] px-6 py-2 rounded-full bg-gradient-to-b from-[#FEF9C3] via-[#FDE047] to-[#F59E0B] hover:brightness-105 text-[#1E293B] border-2 border-[#FFFBEB] shadow-[0_0_28px_rgba(250,204,21,0.55)] transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-center"
          >
            <div className="text-xs font-black tracking-wide flex items-center justify-center gap-1.5 text-[#0F172A]">
              <Star className="w-3.5 h-3.5 fill-[#0F172A] text-[#0F172A]" />
              <span>Quay ×5 (-10%)</span>
            </div>
            <div className="text-xs font-mono-num font-black text-[#0F172A] mt-0.5 flex items-center justify-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              <span>{GACHA_FIVE_COST}</span>
            </div>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* GENSHIN IMPACT FULL-SCREEN SHOOTING STAR WISH CUTSCENE OVERLAY        */}
      {/* ===================================================================== */}
      {wishMeteor && wishMeteor.active && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
          <canvas ref={meteorCanvasRef} className="w-full h-full block" />
          <button
            type="button"
            onClick={handleSkipWishMeteor}
            className="absolute top-6 right-6 px-4 py-2 rounded-full bg-black/60 hover:bg-black/85 border border-[#FACC15]/60 text-[#FEF08A] text-xs font-black tracking-wider uppercase flex items-center gap-1.5 cursor-pointer shadow-2xl transition-all"
          >
            <span>Bỏ Qua</span>
            <FastForward className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* GENSHIN IMPACT SPLASH REVEAL WIN OVERLAY MODAL                        */}
      {/* ===================================================================== */}
      {wonItems.length > 0 &&
        (() => {
          const highestWonTier: PartTier = wonItems.reduce<PartTier>(
            (best, cur) =>
              TIER_ORDER_RANK[cur.item.tier] > TIER_ORDER_RANK[best]
                ? cur.item.tier
                : best,
            wonItems[0]?.item.tier || 'D'
          );
          const stageAura =
            RANK_AURA_PALETTE[highestWonTier] || RANK_AURA_PALETTE.B;
          const stageTheme =
            TIER_METEOR_THEME[highestWonTier] || TIER_METEOR_THEME.B;
          const totalRefunded = wonItems.reduce(
            (sum, entry) => sum + (entry.isDuplicate ? entry.refundCoins : 0),
            0
          );
          const duplicateCount = wonItems.filter((e) => e.isDuplicate).length;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#03060E]/92 backdrop-blur-xl p-4 animate-in fade-in">
              <div
                style={{
                  borderColor: stageAura.badgeBorder,
                  boxShadow: `0 25px 90px rgba(0,0,0,0.92), 0 0 65px ${stageAura.glowCss}`,
                }}
                className="w-full max-w-4xl rounded-3xl bg-gradient-to-b from-[#0D1628]/95 via-[#091020]/98 to-[#050914] border-2 p-6 space-y-5 text-center relative overflow-hidden"
              >
                {/* Ambient Tier Radial Aura behind Reveal Stage */}
                <div
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${stageAura.core}, transparent 68%)`,
                  }}
                  className="pointer-events-none absolute inset-0 opacity-85"
                />

                <div className="relative z-10 space-y-2">
                  <div
                    style={{ color: stageTheme.mid }}
                    className="text-xs font-sci font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {wasPityHit
                        ? `★ BẢO HIỂM PITY · ${stageTheme.label} ★`
                        : stageTheme.label}
                    </span>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    Kết Quả Triệu Hồi
                  </h3>
                  {totalRefunded > 0 && (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/60 text-amber-200 text-xs sm:text-sm font-black shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                      <Coins className="w-4 h-4" />
                      <span>
                        Trùng {duplicateCount} skin · Đền bù{' '}
                        <span className="text-[#FEF08A] font-mono-num">
                          +{totalRefunded.toLocaleString()}
                        </span>{' '}
                        vào ví!
                      </span>
                    </div>
                  )}
                </div>

                <div
                  className={`relative z-10 grid gap-3.5 justify-center ${
                    wonItems.length === 1
                      ? 'grid-cols-1 max-w-xs mx-auto'
                      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
                  }`}
                >
                  {wonItems.map((entry, idx) => {
                    const { item, isDuplicate, refundCoins } = entry;
                    const cardAura =
                      RANK_AURA_PALETTE[item.tier] || RANK_AURA_PALETTE.D;
                    const isEquipped = student.loadout[item.slot] === item.id;
                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        style={{
                          borderColor: cardAura.badgeBorder,
                          boxShadow: `0 12px 32px rgba(0,0,0,0.75), 0 0 22px ${cardAura.glowCss}`,
                        }}
                        className="rounded-2xl bg-gradient-to-b from-[#131F38]/95 via-[#0B1324]/95 to-[#060B16] border-2 p-3 flex flex-col items-center justify-between relative overflow-hidden group"
                      >
                        <div
                          style={{
                            background: `radial-gradient(circle at 50% 42%, ${cardAura.core}, transparent 72%)`,
                          }}
                          className="pointer-events-none absolute inset-0 opacity-80"
                        />

                        <div className="relative z-10 w-full flex items-center justify-between gap-1 mb-1.5">
                          <span
                            style={{
                              background: cardAura.badgeBg,
                              color: cardAura.badgeText,
                              borderColor: cardAura.badgeBorder,
                              boxShadow: `0 0 12px ${cardAura.glowCss}`,
                            }}
                            className="px-2.5 py-0.5 rounded-md border font-sci text-[10.5px] font-black tracking-wider"
                          >
                            {item.tier}
                          </span>
                          {isDuplicate ? (
                            <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-amber-500/25 border border-amber-400/70 text-[#FEF08A] inline-flex items-center gap-1">
                              TRÙNG · +{refundCoins} <Coins className="w-3 h-3 inline" />
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-emerald-500/25 border border-emerald-400/70 text-emerald-300">
                              MỚI!
                            </span>
                          )}
                        </div>

                        <div className="relative z-10 rounded-xl overflow-hidden border border-white/15 shadow-lg">
                          <PartThumbnail
                            item={item}
                            baseLoadout={student.loadout}
                            width={145}
                            height={90}
                            animated={true}
                          />
                        </div>

                        <div className="relative z-10 mt-2 mb-1.5 text-xs font-extrabold text-white line-clamp-1 px-1">
                          {item.name}
                        </div>

                        {isDuplicate && (
                          <div className="relative z-10 mb-2 w-full py-1 px-2 rounded-lg bg-amber-500/15 border border-amber-400/40 text-[10.5px] font-mono-num font-black text-[#FEF08A]">
                            Đền bù +{refundCoins.toLocaleString()} Xu
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleEquipItem(item)}
                          className={`relative z-10 w-full py-1.5 rounded-xl font-extrabold text-xs cursor-pointer flex items-center justify-center gap-1 transition-all ${
                            isEquipped
                              ? 'bg-[#22C55E] text-[#0F172A]'
                              : 'bg-gradient-to-r from-[#FEF08A] via-[#FACC15] to-[#F59E0B] hover:brightness-110 text-[#0F172A] shadow-[0_0_14px_rgba(250,204,21,0.35)]'
                          }`}
                        >
                          {isEquipped ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Đang Dùng</span>
                            </>
                          ) : (
                            'Trang Bị Ngay'
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="relative z-10 pt-2">
                  <button
                    type="button"
                    onClick={() => setWonItems([])}
                    className="px-9 py-2.5 rounded-full bg-gradient-to-r from-[#FEF08A] via-[#FACC15] to-[#F59E0B] hover:brightness-110 text-[#0F172A] font-black text-sm shadow-[0_0_24px_rgba(250,204,21,0.45)] cursor-pointer transition-transform active:scale-95"
                  >
                    Xác Nhận
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ===================================================================== */}
      {/* POOL GALLERY MODAL                                                    */}
      {/* ===================================================================== */}
      {showPoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in">
          <div className="w-full max-w-5xl h-[85vh] max-h-[720px] min-h-[480px] flex flex-col rounded-3xl bg-[#0B132B] border border-[#FACC15]/60 overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex flex-col gap-3 px-5 py-4 bg-[#121B35] border-b border-slate-800 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 font-sci">
                    <Package className="w-5 h-5 text-[#FACC15]" />
                    <span>Kho Skin & Phụ Tùng</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#1E293B] border border-cyan-400/30 font-mono-num text-xs font-bold text-[#38BDF8]">
                    {student.ownedParts.length} / {ALL_PARTS.length} Đã Mở
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPoolModal(false)}
                  aria-label="Đóng Kho Skin"
                  className="w-8 h-8 rounded-xl bg-[#0B132B] hover:bg-rose-900/60 text-slate-300 border border-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Action Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80 text-xs">
                {/* Ownership Filter */}
                <div className="flex items-center gap-1 bg-[#060B18] p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPoolOwnershipFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-sci font-bold text-[11px] transition-all cursor-pointer ${
                      poolOwnershipFilter === 'ALL'
                        ? 'bg-[#0284C7] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tất Cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setPoolOwnershipFilter('OWNED')}
                    className={`px-2.5 py-1 rounded-lg font-sci font-bold text-[11px] transition-all cursor-pointer ${
                      poolOwnershipFilter === 'OWNED'
                        ? 'bg-[#16A34A] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Đã Có
                  </button>
                  <button
                    type="button"
                    onClick={() => setPoolOwnershipFilter('UNOWNED')}
                    className={`px-2.5 py-1 rounded-lg font-sci font-bold text-[11px] transition-all cursor-pointer ${
                      poolOwnershipFilter === 'UNOWNED'
                        ? 'bg-[#D97706] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Chưa Mở
                  </button>
                </div>

                {/* Rank Tier Filter */}
                <div className="flex items-center gap-1 bg-[#060B18] p-1 rounded-xl border border-slate-800 overflow-x-auto">
                  {['ALL', 'SSS', 'SS', 'S', 'A', 'B', 'C', 'D'].map((rk) => (
                    <button
                      key={rk}
                      type="button"
                      onClick={() => setPoolRankFilter(rk)}
                      className={`px-2 py-0.5 rounded-md font-sci font-extrabold text-[10.5px] transition-all cursor-pointer whitespace-nowrap ${
                        poolRankFilter === rk
                          ? 'bg-[#F59E0B] text-[#050811] shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {rk === 'ALL' ? 'Tất Cả Rank' : rk}
                    </button>
                  ))}
                </div>

                {/* Slot Category Filter */}
                <div className="flex items-center gap-1 bg-[#060B18] p-1 rounded-xl border border-slate-800 overflow-x-auto">
                  {[
                    { id: 'ALL', label: 'Tất Cả Vị Trí' },
                    { id: 'chassis', label: 'Khung Thân' },
                    { id: 'paint', label: 'Màu Sơn' },
                    { id: 'decal', label: 'Họa Tiết' },
                    { id: 'wheels', label: 'Bánh Xe' },
                    { id: 'spoiler', label: 'Cánh Gió' },
                    { id: 'underglow', label: 'Đèn Gầm' },
                    { id: 'trail', label: 'Vệt Khói' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setPoolSlotFilter(s.id)}
                      className={`px-2 py-0.5 rounded-md font-sci font-bold text-[10.5px] transition-all cursor-pointer whitespace-nowrap ${
                        poolSlotFilter === s.id
                          ? 'bg-[#38BDF8] text-[#030712] shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5 content-start">
              {(() => {
                const TIER_ORDER: Record<string, number> = {
                  SSS: 7,
                  SS: 6,
                  S: 5,
                  A: 4,
                  B: 3,
                  C: 2,
                  D: 1,
                };
                let poolList = [...ALL_PARTS].sort((a, b) => {
                  const rA = TIER_ORDER[a.tier] || 0;
                  const rB = TIER_ORDER[b.tier] || 0;
                  if (rA !== rB) return rB - rA; // Rank cao hơn xếp trước (SSS -> D)
                  return a.name.localeCompare(b.name);
                });

                // Apply Filters
                if (poolOwnershipFilter === 'OWNED') {
                  poolList = poolList.filter((p) => student.ownedParts.includes(p.id));
                } else if (poolOwnershipFilter === 'UNOWNED') {
                  poolList = poolList.filter((p) => !student.ownedParts.includes(p.id));
                }

                if (poolRankFilter !== 'ALL') {
                  poolList = poolList.filter((p) => p.tier === poolRankFilter);
                }

                if (poolSlotFilter !== 'ALL') {
                  poolList = poolList.filter((p) => p.slot === poolSlotFilter);
                }

                if (poolList.length === 0) {
                  return (
                    <div className="col-span-full py-12 text-center text-slate-400 font-bold">
                      Không tìm thấy phụ tùng phù hợp với bộ lọc hiện tại.
                    </div>
                  );
                }

                return poolList.map((part) => {
                  const owned = student.ownedParts.includes(part.id);
                  const tColor = TIER_COLORS[part.tier];
                  const coinVal = getPartCoinValue(part);

                  return (
                    <div
                      key={part.id}
                      style={{
                        borderColor: owned ? '#4ADE80' : 'rgba(255,255,255,0.12)',
                      }}
                      className={`relative rounded-2xl border p-2.5 flex flex-col items-center text-center transition-all ${
                        owned
                          ? 'bg-[#162238] shadow-[0_4px_16px_rgba(74,222,128,0.15)] border-emerald-400/80'
                          : 'bg-[#0E172A]/90 border-slate-800'
                      }`}
                    >
                      {/* Top Corner Status Badge */}
                      <span
                        className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider border ${
                          owned
                            ? 'bg-[#16A34A]/90 text-white border-emerald-300'
                            : 'bg-slate-900/90 text-slate-400 border-slate-700'
                        }`}
                      >
                        {owned ? 'ĐÃ CÓ' : 'CHƯA MỞ'}
                      </span>

                      {/* Part Thumbnail (Always fully visible!) */}
                      <div className={`mt-1.5 transition-all ${!owned ? 'opacity-75 grayscale-[30%]' : ''}`}>
                        <PartThumbnail item={part} width={110} height={70} />
                      </div>

                      {/* Name */}
                      <div className={`text-xs font-extrabold mt-1.5 truncate w-full ${owned ? 'text-white' : 'text-slate-300'}`}>
                        {part.name}
                      </div>

                      {/* Tier Badge & Status */}
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
                      </div>

                      {/* Coin Value Refund */}
                      <div className="text-[10px] font-mono-num font-bold text-amber-300 mt-1 flex items-center justify-center gap-1">
                        <span>Đền bù:</span>
                        <Coins className="w-3 h-3" />
                        <span>+{coinVal}</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

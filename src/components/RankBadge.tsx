import React from 'react';
import { GraduationCap } from 'lucide-react';
import { getRankByRP } from '../game/rules';
import { RankDefinition, RankTierId } from '../game/types';

interface RankCrestProps {
  tierId?: RankTierId;
  rp?: number;
  size?: number;
  className?: string;
}

interface TierPalette {
  shieldGradTop: string;
  shieldGradMid: string;
  shieldGradBot: string;
  rimColor: string;
  rimHighlight: string;
  wingGradOuter: string;
  wingGradInner: string;
  gemTop: string;
  gemMid: string;
  gemBot: string;
  crownColor: string;
  glow: string;
  hasUpperWings: boolean;
  hasCrown: boolean;
  stars: number;
}

const TIER_PALETTES: Record<RankTierId, TierPalette> = {
  bronze: {
    shieldGradTop: '#D97706',
    shieldGradMid: '#92400E',
    shieldGradBot: '#78350F',
    rimColor: '#F59E0B',
    rimHighlight: '#FEF3C7',
    wingGradOuter: '#78350F',
    wingGradInner: '#B45309',
    gemTop: '#FDE68A',
    gemMid: '#F59E0B',
    gemBot: '#B45309',
    crownColor: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.25)',
    hasUpperWings: false,
    hasCrown: false,
    stars: 1,
  },
  silver: {
    shieldGradTop: '#F1F5F9',
    shieldGradMid: '#94A3B8',
    shieldGradBot: '#475569',
    rimColor: '#E2E8F0',
    rimHighlight: '#FFFFFF',
    wingGradOuter: '#475569',
    wingGradInner: '#CBD5E1',
    gemTop: '#E0F2FE',
    gemMid: '#38BDF8',
    gemBot: '#0284C7',
    crownColor: '#E2E8F0',
    glow: 'rgba(56, 189, 248, 0.25)',
    hasUpperWings: false,
    hasCrown: false,
    stars: 1,
  },
  gold: {
    shieldGradTop: '#FEF08A',
    shieldGradMid: '#EAB308',
    shieldGradBot: '#A16207',
    rimColor: '#FACC15',
    rimHighlight: '#FFFFFF',
    wingGradOuter: '#A16207',
    wingGradInner: '#FDE047',
    gemTop: '#BBF7D0',
    gemMid: '#22C55E',
    gemBot: '#15803D',
    crownColor: '#FDE047',
    glow: 'rgba(250, 204, 21, 0.3)',
    hasUpperWings: true,
    hasCrown: false,
    stars: 2,
  },
  platinum: {
    shieldGradTop: '#CCFBF1',
    shieldGradMid: '#14B8A6',
    shieldGradBot: '#0F766E',
    rimColor: '#5EEAD4',
    rimHighlight: '#FFFFFF',
    wingGradOuter: '#115E59',
    wingGradInner: '#2DD4BF',
    gemTop: '#ECFEFF',
    gemMid: '#06B6D4',
    gemBot: '#0891B2',
    crownColor: '#5EEAD4',
    glow: 'rgba(45, 212, 191, 0.3)',
    hasUpperWings: true,
    hasCrown: true,
    stars: 2,
  },
  diamond: {
    shieldGradTop: '#E0F2FE',
    shieldGradMid: '#38BDF8',
    shieldGradBot: '#1D4ED8',
    rimColor: '#7DD3FC',
    rimHighlight: '#FFFFFF',
    wingGradOuter: '#1E3A8A',
    wingGradInner: '#60A5FA',
    gemTop: '#FFFFFF',
    gemMid: '#818CF8',
    gemBot: '#4338CA',
    crownColor: '#BAE6FD',
    glow: 'rgba(56, 189, 248, 0.35)',
    hasUpperWings: true,
    hasCrown: true,
    stars: 3,
  },
  veteran: {
    shieldGradTop: '#F5D0FE',
    shieldGradMid: '#A855F7',
    shieldGradBot: '#581C87',
    rimColor: '#FDE047',
    rimHighlight: '#FFFFFF',
    wingGradOuter: '#4A044E',
    wingGradInner: '#C084FC',
    gemTop: '#FFE4E6',
    gemMid: '#F43F5E',
    gemBot: '#BE123C',
    crownColor: '#FACC15',
    glow: 'rgba(192, 132, 252, 0.35)',
    hasUpperWings: true,
    hasCrown: true,
    stars: 3,
  },
  master: {
    shieldGradTop: '#FEF08A',
    shieldGradMid: '#E11D48',
    shieldGradBot: '#881337',
    rimColor: '#FACC15',
    rimHighlight: '#FFFFFF',
    wingGradOuter: '#991B1B',
    wingGradInner: '#FB7185',
    gemTop: '#FEF08A',
    gemMid: '#F59E0B',
    gemBot: '#B45309',
    crownColor: '#FDE047',
    glow: 'rgba(244, 63, 94, 0.4)',
    hasUpperWings: true,
    hasCrown: true,
    stars: 4,
  },
};

/**
 * Pristine, vector-perfect, modern Esports Rank Insignia.
 * Centered within safe bounds in a 100x100 viewBox with no blurry drop-shadow bleed or clipped strokes.
 */
export const RankCrest: React.FC<RankCrestProps> = ({
  tierId,
  rp = 0,
  size = 40,
  className = '',
}) => {
  const resolvedTier: RankTierId = tierId || getRankByRP(rp).id;
  const p = TIER_PALETTES[resolvedTier] || TIER_PALETTES.bronze;
  const reactId = React.useId().replace(/[:]/g, '_');
  const uid = `rk_${resolvedTier}_${reactId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`shrink-0 select-none ${className}`}
      aria-label={`Biểu tượng Rank ${resolvedTier}`}
    >
      <defs>
        {/* Shield Gradient */}
        <linearGradient id={`${uid}_shield`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.shieldGradTop} />
          <stop offset="50%" stopColor={p.shieldGradMid} />
          <stop offset="100%" stopColor={p.shieldGradBot} />
        </linearGradient>

        {/* Wing Left Gradient */}
        <linearGradient id={`${uid}_wing_l`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.wingGradInner} />
          <stop offset="100%" stopColor={p.wingGradOuter} />
        </linearGradient>

        {/* Wing Right Gradient */}
        <linearGradient id={`${uid}_wing_r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.wingGradInner} />
          <stop offset="100%" stopColor={p.wingGradOuter} />
        </linearGradient>

        {/* Faceted Crystal Gem Radial Gradient */}
        <radialGradient id={`${uid}_gem`} cx="45%" cy="38%" r="60%">
          <stop offset="0%" stopColor={p.gemTop} />
          <stop offset="55%" stopColor={p.gemMid} />
          <stop offset="100%" stopColor={p.gemBot} />
        </radialGradient>

        {/* Metallic Bevel Highlights */}
        <linearGradient id={`${uid}_rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.rimHighlight} />
          <stop offset="60%" stopColor={p.rimColor} />
          <stop offset="100%" stopColor={p.shieldGradBot} />
        </linearGradient>
      </defs>

      {/* 1. EMBLEM WINGS (Behind shield, clean smooth curved silhouettes without disjointed spikes) */}
      <g>
        {/* Upper Wings (Gold+) */}
        {p.hasUpperWings && (
          <g>
            <path
              d="M 34 32 C 28 22 20 16 15 15 C 16 22 22 30 28 38 Z"
              fill={`url(#${uid}_wing_l)`}
              stroke={p.rimColor}
              strokeWidth="0.8"
            />
            <path
              d="M 66 32 C 72 22 80 16 85 15 C 84 22 78 30 72 38 Z"
              fill={`url(#${uid}_wing_r)`}
              stroke={p.rimColor}
              strokeWidth="0.8"
            />
          </g>
        )}

        {/* Primary Heraldic Wings */}
        <path
          d="M 30 38 C 18 34 11 38 12 44 C 15 50 22 55 27 60 C 20 62 15 67 17 71 C 24 71 30 67 34 62 Z"
          fill={`url(#${uid}_wing_l)`}
          stroke={p.rimColor}
          strokeWidth="0.8"
        />
        <path
          d="M 70 38 C 82 34 89 38 88 44 C 85 50 78 55 73 60 C 80 62 85 67 83 71 C 76 71 70 67 66 62 Z"
          fill={`url(#${uid}_wing_r)`}
          stroke={p.rimColor}
          strokeWidth="0.8"
        />

        {/* Bottom Tail */}
        <polygon
          points="44,72 50,86 56,72"
          fill={p.wingGradOuter}
          stroke={p.rimColor}
          strokeWidth="0.8"
        />
      </g>

      {/* 2. MAIN HERALDIC SHIELD (Clean continuous curves with sharp metallic rim) */}
      <path
        d="M 50 18 C 64 18 73 24 73 40 C 73 61 58 73 50 81 C 42 73 27 61 27 40 C 27 24 36 18 50 18 Z"
        fill={`url(#${uid}_shield)`}
        stroke={`url(#${uid}_rim)`}
        strokeWidth="2"
      />

      {/* 3. INNER BEVEL ACCENT */}
      <path
        d="M 50 23 C 61 23 68 28 68 39 C 68 56 56 67 50 74 C 44 67 32 56 32 39 C 32 28 39 23 50 23 Z"
        fill="none"
        stroke={p.rimHighlight}
        strokeWidth="0.75"
        opacity="0.5"
      />

      {/* 4. SOVEREIGN CROWN (Platinum, Diamond, Veteran, Master) */}
      {p.hasCrown && (
        <path
          d="M 36 21 L 40 11 L 45 16 L 50 9 L 55 16 L 60 11 L 64 21 Z"
          fill={p.crownColor}
          stroke={p.rimHighlight}
          strokeWidth="0.8"
        />
      )}

      {/* 5. CENTER FACETED POWER CRYSTAL GEM */}
      <polygon
        points="50,32 61,46 50,62 39,46"
        fill={`url(#${uid}_gem)`}
        stroke={p.rimHighlight}
        strokeWidth="1.2"
      />

      {/* Crystal Facets Specular Light Lines */}
      <line
        x1="50"
        y1="32"
        x2="50"
        y2="62"
        stroke={p.rimHighlight}
        strokeWidth="0.6"
        opacity="0.8"
      />
      <line
        x1="39"
        y1="46"
        x2="61"
        y2="46"
        stroke={p.rimHighlight}
        strokeWidth="0.6"
        opacity="0.8"
      />

      {/* Top Specular Glint */}
      <polygon
        points="50,33 55,43 50,45 45,43"
        fill="#FFFFFF"
        opacity="0.65"
      />

      {/* 6. TIER STARS (Clean crisp dots inside safe area) */}
      {Array.from({ length: p.stars }, (_, idx) => {
        const spacing = 7;
        const offset = (idx - (p.stars - 1) / 2) * spacing;
        const cx = 50 + offset;
        return (
          <circle
            key={idx}
            cx={cx}
            cy="71"
            r="1.8"
            fill={p.crownColor}
            stroke="#040814"
            strokeWidth="0.5"
          />
        );
      })}
    </svg>
  );
};

interface RankAvatarFrameProps {
  username: string;
  rp: number;
  size?: 'sm' | 'md' | 'lg';
  isTeacher?: boolean;
  onClick?: () => void;
}

/**
 * Ornate Rank Avatar Border Frame inspired by modern esports profile borders.
 * Displays racer's initial with a smooth metallic halo, crisp rank trim, and pristine RankCrest badge.
 */
export const RankAvatarFrame: React.FC<RankAvatarFrameProps> = ({
  username,
  rp,
  size = 'md',
  isTeacher = false,
  onClick,
}) => {
  const rank: RankDefinition = getRankByRP(rp);
  const initials =
    username
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('') || 'TD';

  const dim = size === 'lg' ? 84 : size === 'md' ? 64 : 46;
  const p = TIER_PALETTES[rank.id] || TIER_PALETTES.bronze;
  const reactId = React.useId().replace(/[:]/g, '_');
  const uid = `av_${rank.id}_${size}_${reactId}`;

  return (
    <div
      onClick={onClick}
      title={`Bậc Rank: ${rank.name} (${rp} RP)`}
      style={{
        width: dim,
        height: dim,
      }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''
      }`}
    >
      {/* Inner Avatar Core */}
      <div
        style={{
          width: dim * 0.76,
          height: dim * 0.76,
        }}
        className="rounded-full bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#020617] flex items-center justify-center font-display font-black text-white overflow-hidden shadow-inner border border-white/10"
      >
        <span
          className={
            size === 'lg'
              ? 'text-base font-black'
              : size === 'md'
              ? 'text-xs font-black'
              : 'text-[10px] font-bold'
          }
          style={{ color: rank.color }}
        >
          {isTeacher ? <GraduationCap className="w-5 h-5 text-amber-300" /> : initials}
        </span>
      </div>

      {/* Sleek Minimalist Metallic Rank Ring */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={p.rimHighlight} />
            <stop offset="50%" stopColor={p.rimColor} />
            <stop offset="100%" stopColor={p.shieldGradBot} />
          </linearGradient>
        </defs>

        {/* Clean Outer Accent Halo */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke={p.rimColor}
          strokeWidth="1.2"
          opacity="0.35"
        />

        {/* Primary Metallic Rank Ring */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={`url(#${uid})`}
          strokeWidth="3.2"
        />

        {/* Inner Highlight Ring */}
        <circle
          cx="50"
          cy="50"
          r="37"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.6"
          opacity="0.3"
        />

        {/* Top Minimalist Crown / Gem Marker */}
        <circle
          cx="50"
          cy="10"
          r="2.8"
          fill={p.crownColor}
          stroke="#FFFFFF"
          strokeWidth="0.8"
        />

        {/* Bottom Accent Notch */}
        <polygon
          points="50,91 46,86 54,86"
          fill={p.rimColor}
          stroke="#FFFFFF"
          strokeWidth="0.5"
        />
      </svg>

      {/* Corner Rank Badge Emblem */}
      <div
        style={{
          borderColor: p.rimColor,
          boxShadow: '0 2px 5px rgba(0,0,0,0.8)',
        }}
        className="absolute -bottom-1 -right-1 rounded-full bg-[#030712] border p-0.5 flex items-center justify-center pointer-events-none"
        title={`Huy hiệu bậc ${rank.name}`}
      >
        <RankCrest
          tierId={rank.id}
          size={size === 'lg' ? 24 : size === 'md' ? 19 : 14}
        />
      </div>
    </div>
  );
};

/**
 * Renders the clean, unclipped Rank Crest directly onto an HTML5 2D Canvas.
 */
export function drawRankCrestOnCanvas(
  ctx: CanvasRenderingContext2D,
  tierId: RankTierId,
  cx: number,
  cy: number,
  size: number = 22
): void {
  const p = TIER_PALETTES[tierId] || TIER_PALETTES.bronze;
  const scale = size / 100;

  const drawPoly = (pts: [number, number][]) => {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]);
      else ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
  };

  ctx.save();
  ctx.translate(cx - size * 0.5, cy - size * 0.5);
  ctx.scale(scale, scale);

  // Wing gradients
  const wingGradL = ctx.createLinearGradient(35, 35, 12, 65);
  wingGradL.addColorStop(0, p.wingGradInner);
  wingGradL.addColorStop(1, p.wingGradOuter);

  const wingGradR = ctx.createLinearGradient(65, 35, 88, 65);
  wingGradR.addColorStop(0, p.wingGradInner);
  wingGradR.addColorStop(1, p.wingGradOuter);

  // Upper Wings (Gold+)
  if (p.hasUpperWings) {
    ctx.fillStyle = wingGradL;
    ctx.strokeStyle = p.rimColor;
    ctx.lineWidth = 0.8;
    drawPoly([[34, 32], [15, 15], [28, 38]]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = wingGradR;
    drawPoly([[66, 32], [85, 15], [72, 38]]);
    ctx.fill();
    ctx.stroke();
  }

  // Primary Lateral Wings
  ctx.fillStyle = wingGradL;
  ctx.strokeStyle = p.rimColor;
  ctx.lineWidth = 0.8;
  drawPoly([[30, 38], [12, 44], [27, 60], [17, 71], [34, 62]]);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = wingGradR;
  drawPoly([[70, 38], [88, 44], [73, 60], [83, 71], [66, 62]]);
  ctx.fill();
  ctx.stroke();

  // Bottom Tail
  ctx.fillStyle = p.wingGradOuter;
  ctx.strokeStyle = p.rimColor;
  ctx.lineWidth = 0.8;
  drawPoly([[44, 72], [50, 86], [56, 72]]);
  ctx.fill();
  ctx.stroke();

  // Main Shield
  const shieldGrad = ctx.createLinearGradient(50, 18, 50, 81);
  shieldGrad.addColorStop(0, p.shieldGradTop);
  shieldGrad.addColorStop(0.5, p.shieldGradMid);
  shieldGrad.addColorStop(1, p.shieldGradBot);

  ctx.beginPath();
  ctx.moveTo(50, 18);
  ctx.bezierCurveTo(64, 18, 73, 24, 73, 40);
  ctx.bezierCurveTo(73, 61, 58, 73, 50, 81);
  ctx.bezierCurveTo(42, 73, 27, 61, 27, 40);
  ctx.bezierCurveTo(27, 24, 36, 18, 50, 18);
  ctx.closePath();
  ctx.fillStyle = shieldGrad;
  ctx.fill();
  ctx.strokeStyle = p.rimHighlight;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Crown
  if (p.hasCrown) {
    ctx.fillStyle = p.crownColor;
    ctx.strokeStyle = p.rimHighlight;
    ctx.lineWidth = 0.8;
    drawPoly([[36, 21], [40, 11], [45, 16], [50, 9], [55, 16], [60, 11], [64, 21]]);
    ctx.fill();
    ctx.stroke();
  }

  // Gem
  const gemGrad = ctx.createRadialGradient(48, 44, 1, 50, 46, 14);
  gemGrad.addColorStop(0, p.gemTop);
  gemGrad.addColorStop(0.5, p.gemMid);
  gemGrad.addColorStop(1, p.gemBot);

  ctx.fillStyle = gemGrad;
  ctx.strokeStyle = p.rimHighlight;
  ctx.lineWidth = 1.2;
  drawPoly([[50, 32], [61, 46], [50, 62], [39, 46]]);
  ctx.fill();
  ctx.stroke();

  // Gem glint
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  drawPoly([[50, 33], [55, 43], [50, 45], [45, 43]]);
  ctx.fill();

  ctx.restore();
}

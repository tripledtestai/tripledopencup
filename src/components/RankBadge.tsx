import React from 'react';
import { getRankByRP } from '../game/rules';
import { RankDefinition, RankTierId } from '../game/types';

interface RankCrestProps {
  tierId?: RankTierId;
  rp?: number;
  size?: number;
  className?: string;
}

/**
 * High-detail metallic & crystalline Rank Crest inspired by Arena of Valor / League of Legends
 * Supports all 7 tiers: bronze, silver, gold, platinum, diamond, veteran, master
 */
export const RankCrest: React.FC<RankCrestProps> = ({
  tierId,
  rp = 0,
  size = 44,
  className = '',
}) => {
  const resolvedTier: RankTierId = tierId || getRankByRP(rp).id;

  const palettes: Record<
    RankTierId,
    {
      wingOuter: string;
      wingInner: string;
      shieldTop: string;
      shieldBot: string;
      rim: string;
      gem: string;
      gemCore: string;
      crown: string;
      glow: string;
      wingComplexity: 1 | 2 | 3 | 4;
      hasCrown: boolean;
      stars: number;
    }
  > = {
    bronze: {
      wingOuter: '#78350F',
      wingInner: '#B45309',
      shieldTop: '#92400E',
      shieldBot: '#451A03',
      rim: '#F59E0B',
      gem: '#D97706',
      gemCore: '#FDE68A',
      crown: '#B45309',
      glow: 'rgba(217, 119, 6, 0.35)',
      wingComplexity: 1,
      hasCrown: false,
      stars: 1,
    },
    silver: {
      wingOuter: '#475569',
      wingInner: '#94A3B8',
      shieldTop: '#CBD5E1',
      shieldBot: '#334155',
      rim: '#F8FAFC',
      gem: '#38BDF8',
      gemCore: '#E0F2FE',
      crown: '#94A3B8',
      glow: 'rgba(148, 163, 184, 0.4)',
      wingComplexity: 1,
      hasCrown: false,
      stars: 1,
    },
    gold: {
      wingOuter: '#B45309',
      wingInner: '#FACC15',
      shieldTop: '#FEF08A',
      shieldBot: '#A16207',
      rim: '#FEF9C3',
      gem: '#10B981',
      gemCore: '#A7F3D0',
      crown: '#FACC15',
      glow: 'rgba(250, 204, 21, 0.5)',
      wingComplexity: 2,
      hasCrown: false,
      stars: 2,
    },
    platinum: {
      wingOuter: '#065F46',
      wingInner: '#2DD4BF',
      shieldTop: '#99F6E4',
      shieldBot: '#0F766E',
      rim: '#CCFBF1',
      gem: '#06B6D4',
      gemCore: '#ECFEFF',
      crown: '#34D399',
      glow: 'rgba(45, 212, 191, 0.55)',
      wingComplexity: 2,
      hasCrown: true,
      stars: 2,
    },
    diamond: {
      wingOuter: '#1E3A8A',
      wingInner: '#38BDF8',
      shieldTop: '#BAE6FD',
      shieldBot: '#0369A1',
      rim: '#E0F2FE',
      gem: '#818CF8',
      gemCore: '#FFFFFF',
      crown: '#7DD3FC',
      glow: 'rgba(56, 189, 248, 0.65)',
      wingComplexity: 3,
      hasCrown: true,
      stars: 3,
    },
    veteran: {
      wingOuter: '#581C87',
      wingInner: '#C084FC',
      shieldTop: '#F3E8FF',
      shieldBot: '#6B21A8',
      rim: '#FDE047',
      gem: '#F43F5E',
      gemCore: '#FFE4E6',
      crown: '#FACC15',
      glow: 'rgba(192, 132, 252, 0.7)',
      wingComplexity: 3,
      hasCrown: true,
      stars: 3,
    },
    master: {
      wingOuter: '#991B1B',
      wingInner: '#F59E0B',
      shieldTop: '#FEF08A',
      shieldBot: '#BE123C',
      rim: '#FFFFFF',
      gem: '#E11D48',
      gemCore: '#FEF08A',
      crown: '#FDE047',
      glow: 'rgba(244, 63, 94, 0.85)',
      wingComplexity: 4,
      hasCrown: true,
      stars: 4,
    },
  };

  const p = palettes[resolvedTier];
  const uid = `rk_${resolvedTier}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`shrink-0 select-none ${className}`}
      style={{ filter: `drop-shadow(0 2px 6px ${p.glow})` }}
      aria-label={`Biểu tượng Rank ${resolvedTier}`}
    >
      <defs>
        <linearGradient id={`${uid}_shield`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.shieldTop} />
          <stop offset="100%" stopColor={p.shieldBot} />
        </linearGradient>
        <linearGradient id={`${uid}_wing`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.wingInner} />
          <stop offset="100%" stopColor={p.wingOuter} />
        </linearGradient>
        <radialGradient id={`${uid}_gem`} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor={p.gemCore} />
          <stop offset="55%" stopColor={p.gem} />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
      </defs>

      {/* Radiant Halo Backplate for Diamond / Veteran / Master */}
      {p.wingComplexity >= 3 && (
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={p.rim}
          strokeWidth="1.5"
          strokeDasharray="5 4"
          opacity="0.55"
        />
      )}

      {/* Upper Swept Wings (Tier 2+) */}
      {p.wingComplexity >= 2 && (
        <g fill={`url(#${uid}_wing)`} stroke={p.rim} strokeWidth="1.2">
          {/* Left High Wing */}
          <path d="M 32 42 L 6 20 L 14 38 L 4 36 L 22 52 Z" />
          {/* Right High Wing */}
          <path d="M 68 42 L 94 20 L 86 38 L 96 36 L 78 52 Z" />
        </g>
      )}

      {/* Supreme Valkyrie / Dragon Plumes for Master & Veteran */}
      {p.wingComplexity >= 4 && (
        <g fill={p.crown} stroke="#FFFFFF" strokeWidth="1">
          <path d="M 28 32 L 8 8 L 22 24 L 16 10 L 36 28 Z" />
          <path d="M 72 32 L 92 8 L 78 24 L 84 10 L 64 28 Z" />
        </g>
      )}

      {/* Primary Lateral Armor Wings (All Tiers) */}
      <g fill={`url(#${uid}_wing)`} stroke={p.rim} strokeWidth="1.5">
        <path d="M 34 48 L 10 42 L 18 56 L 12 64 L 36 66 Z" />
        <path d="M 66 48 L 90 42 L 82 56 L 88 64 L 64 66 Z" />
      </g>

      {/* Bottom Tail Crest */}
      <polygon
        points="38,68 50,94 62,68"
        fill={p.wingOuter}
        stroke={p.rim}
        strokeWidth="1.5"
      />

      {/* Sovereign Crown on Top (Platinum / Diamond / Veteran / Master) */}
      {p.hasCrown && (
        <polygon
          points="32,28 36,12 44,21 50,7 56,21 64,12 68,28"
          fill={p.crown}
          stroke={p.rim}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}

      {/* Main Hexagonal / Paladin Shield */}
      <polygon
        points="50,18 74,30 70,64 50,84 30,64 26,30"
        fill={`url(#${uid}_shield)`}
        stroke={p.rim}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />

      {/* Inner Armor Bevel */}
      <polygon
        points="50,25 67,34 64,60 50,76 36,60 33,34"
        fill="#0F172A"
        fillOpacity="0.55"
        stroke={p.wingInner}
        strokeWidth="1.3"
      />

      {/* Center Faceted Power Gem */}
      <polygon
        points="50,33 61,48 50,65 39,48"
        fill={`url(#${uid}_gem)`}
        stroke={p.rim}
        strokeWidth="1.8"
      />

      {/* Center Gem Specular Shine */}
      <polygon
        points="50,35 56,46 50,49 44,46"
        fill="#FFFFFF"
        fillOpacity="0.55"
      />

      {/* Tier Stars at Bottom Ribbon */}
      {Array.from({ length: p.stars }, (_, idx) => {
        const offset = (idx - (p.stars - 1) / 2) * 9;
        const cx = 50 + offset;
        return (
          <circle
            key={idx}
            cx={cx}
            cy="75"
            r="2.6"
            fill={p.crown}
            stroke="#0F172A"
            strokeWidth="0.8"
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
 * Ornate Rank Avatar Border Frame inspired by League of Legends / Arena of Valor profile borders.
 * Wraps the racer's avatar/call-sign with tiered metallic armor borders, shoulder wings, top crown, and rank jewel.
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

  const dim = size === 'lg' ? 76 : size === 'md' ? 60 : 42;
  const uid = `av_${rank.id}_${size}`;

  const frameStyles: Record<
    RankTierId,
    {
      outerA: string;
      outerB: string;
      accent: string;
      glow: string;
      wingSpan: boolean;
      crown: boolean;
    }
  > = {
    bronze: {
      outerA: '#B45309',
      outerB: '#451A03',
      accent: '#F59E0B',
      glow: 'rgba(180, 83, 9, 0.35)',
      wingSpan: false,
      crown: false,
    },
    silver: {
      outerA: '#E2E8F0',
      outerB: '#334155',
      accent: '#38BDF8',
      glow: 'rgba(148, 163, 184, 0.4)',
      wingSpan: false,
      crown: false,
    },
    gold: {
      outerA: '#FEF08A',
      outerB: '#A16207',
      accent: '#10B981',
      glow: 'rgba(250, 204, 21, 0.5)',
      wingSpan: true,
      crown: false,
    },
    platinum: {
      outerA: '#5EEAD4',
      outerB: '#115E59',
      accent: '#38BDF8',
      glow: 'rgba(45, 212, 191, 0.55)',
      wingSpan: true,
      crown: true,
    },
    diamond: {
      outerA: '#BAE6FD',
      outerB: '#1E3A8A',
      accent: '#818CF8',
      glow: 'rgba(56, 189, 248, 0.65)',
      wingSpan: true,
      crown: true,
    },
    veteran: {
      outerA: '#E9D5FF',
      outerB: '#581C87',
      accent: '#FACC15',
      glow: 'rgba(192, 132, 252, 0.7)',
      wingSpan: true,
      crown: true,
    },
    master: {
      outerA: '#FEF08A',
      outerB: '#991B1B',
      accent: '#F43F5E',
      glow: 'rgba(244, 63, 94, 0.85)',
      wingSpan: true,
      crown: true,
    },
  };

  const st = frameStyles[rank.id];

  return (
    <div
      onClick={onClick}
      title={`Bậc Rank: ${rank.name} (${rp} RP)`}
      style={{
        width: dim,
        height: dim,
        filter: `drop-shadow(0 0 6px ${st.glow})`,
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
        className="rounded-full bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#020617] flex items-center justify-center font-display font-black text-white overflow-hidden shadow-inner"
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
          {isTeacher ? '🎓' : initials}
        </span>
      </div>

      {/* Sleek Minimalist Rank Ring & Subtle Accent Studs */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={st.outerA} />
            <stop offset="100%" stopColor={st.outerB} />
          </linearGradient>
        </defs>

        {/* Clean Outer Accent Halo */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={st.outerA}
          strokeWidth="1.2"
          opacity="0.45"
        />

        {/* Primary Metallic Rank Ring */}
        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke={`url(#${uid})`}
          strokeWidth="4"
        />

        {/* Inner Highlight Ring */}
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.8"
          opacity="0.35"
        />

        {/* Top Minimalist Crown / Gem Marker */}
        <circle
          cx="50"
          cy="9"
          r="3.5"
          fill={st.accent}
          stroke="#FFFFFF"
          strokeWidth="1"
        />

        {/* Bottom Minimalist Crest Marker */}
        <polygon
          points="50,94 45,88 55,88"
          fill={st.accent}
          stroke="#FFFFFF"
          strokeWidth="0.8"
        />
      </svg>
    </div>
  );
};

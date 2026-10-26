import React, { useEffect, useRef } from 'react';
import { DEFAULT_LOADOUT } from '../game/constants';
import { drawModularCar } from '../game/carRenderer';
import { CarLoadout, PartItem, PartTier } from '../game/types';

interface PartThumbnailProps {
  item: PartItem;
  baseLoadout?: CarLoadout;
  width?: number;
  height?: number;
  animated?: boolean;
  className?: string;
}

// Rank-specific Aura & Pedestal palette as requested:
// C - Xanh lá, B - Xanh dương, A - Tím, S - Cam Vàng, SS - Hồng Đỏ/Tím, SSS - Vàng kim/Đỏ
export const RANK_AURA_PALETTE: Record<
  PartTier,
  {
    core: string;
    mid: string;
    outer: string;
    ring: string;
    beam: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    glowCss: string;
  }
> = {
  D: {
    core: 'rgba(148, 163, 184, 0.42)',
    mid: 'rgba(71, 85, 105, 0.22)',
    outer: 'rgba(6, 11, 22, 0.92)',
    ring: '#94A3B8',
    beam: 'rgba(148, 163, 184, 0.16)',
    badgeBg: 'linear-gradient(135deg, #334155, #1E293B)',
    badgeBorder: '#94A3B8',
    badgeText: '#F1F5F9',
    glowCss: 'rgba(148, 163, 184, 0.35)',
  },
  C: {
    core: 'rgba(16, 185, 129, 0.58)',
    mid: 'rgba(5, 150, 105, 0.28)',
    outer: 'rgba(4, 15, 18, 0.94)',
    ring: '#34D399',
    beam: 'rgba(52, 211, 153, 0.24)',
    badgeBg: 'linear-gradient(135deg, #059669, #10B981)',
    badgeBorder: '#6EE7B7',
    badgeText: '#ECFDF5',
    glowCss: 'rgba(16, 185, 129, 0.55)',
  },
  B: {
    core: 'rgba(14, 165, 233, 0.62)',
    mid: 'rgba(2, 132, 199, 0.30)',
    outer: 'rgba(5, 12, 26, 0.94)',
    ring: '#38BDF8',
    beam: 'rgba(56, 189, 248, 0.26)',
    badgeBg: 'linear-gradient(135deg, #0284C7, #38BDF8)',
    badgeBorder: '#7DD3FC',
    badgeText: '#030712',
    glowCss: 'rgba(56, 189, 248, 0.6)',
  },
  A: {
    core: 'rgba(168, 85, 247, 0.65)',
    mid: 'rgba(126, 34, 206, 0.32)',
    outer: 'rgba(12, 7, 26, 0.94)',
    ring: '#C084FC',
    beam: 'rgba(192, 132, 252, 0.28)',
    badgeBg: 'linear-gradient(135deg, #7E22CE, #A855F7)',
    badgeBorder: '#E9D5FF',
    badgeText: '#FAF5FF',
    glowCss: 'rgba(168, 85, 247, 0.65)',
  },
  S: {
    core: 'rgba(245, 158, 11, 0.68)',
    mid: 'rgba(180, 83, 9, 0.34)',
    outer: 'rgba(18, 10, 5, 0.94)',
    ring: '#FACC15',
    beam: 'rgba(250, 204, 21, 0.30)',
    badgeBg: 'linear-gradient(135deg, #D97706, #FACC15)',
    badgeBorder: '#FEF08A',
    badgeText: '#090D16',
    glowCss: 'rgba(245, 158, 11, 0.68)',
  },
  SS: {
    core: 'rgba(236, 72, 153, 0.68)',
    mid: 'rgba(168, 85, 247, 0.35)',
    outer: 'rgba(18, 6, 20, 0.94)',
    ring: '#F472B6',
    beam: 'rgba(244, 114, 182, 0.30)',
    badgeBg: 'linear-gradient(135deg, #DB2777, #9333EA)',
    badgeBorder: '#FBCFE8',
    badgeText: '#FFF1F2',
    glowCss: 'rgba(236, 72, 153, 0.68)',
  },
  SSS: {
    core: 'rgba(250, 204, 21, 0.78)',
    mid: 'rgba(239, 68, 68, 0.45)',
    outer: 'rgba(22, 6, 8, 0.94)',
    ring: '#FDE047',
    beam: 'rgba(250, 204, 21, 0.36)',
    badgeBg: 'linear-gradient(135deg, #EF4444, #F59E0B, #FACC15)',
    badgeBorder: '#FEF08A',
    badgeText: '#090D16',
    glowCss: 'rgba(245, 158, 11, 0.8)',
  },
};

// Offscreen Canvas Cache to eliminate re-render lag across Garage and Gacha grids
const thumbnailCache = new Map<string, HTMLCanvasElement>();

const PartThumbnailComponent: React.FC<PartThumbnailProps> = ({
  item,
  baseLoadout = DEFAULT_LOADOUT,
  width = 120,
  height = 84,
  animated = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.floor(width * dpr);
    const targetH = Math.floor(height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const cacheKey = `${item.id}_${width}_${height}_${dpr}_${animated ? 'anim' : 'static'}`;

    // Fast path: if static thumbnail is already cached in memory, draw from cache instantly (0.01ms)!
    if (!animated && thumbnailCache.has(cacheKey)) {
      const cachedCanvas = thumbnailCache.get(cacheKey)!;
      ctx.drawImage(cachedCanvas, 0, 0);
      return;
    }

    const aura = RANK_AURA_PALETTE[item.tier] || RANK_AURA_PALETTE.D;
    
    // Clean neutral baseline: NO external skins attached!
    const neutralBase: CarLoadout = {
      chassis: 'chassis_coupe',
      paint: 'paint_titanium',
      decal: 'decal_none',
      wheels: 'wheels_standard',
      spoiler: 'spoiler_none',
      underglow: 'underglow_none',
      trail: 'trail_standard',
    };

    let previewLoadout: CarLoadout;

    if (item.slot === 'chassis') {
      previewLoadout = {
        ...neutralBase,
        chassis: item.id,
        wheels:
          item.id === 'chassis_buggy'
            ? 'wheels_offroad'
            : item.id === 'chassis_f1'
            ? 'wheels_redsport'
            : 'wheels_standard',
        paint:
          item.id === 'chassis_f1'
            ? 'paint_titanium'
            : item.id.includes('tripled_elderwood')
            ? 'paint_tripled_sage'
            : item.id.includes('tripled')
            ? 'paint_tripled'
            : 'paint_solid_red',
        spoiler: 'spoiler_none',
        decal: 'decal_none',
        underglow: 'underglow_none',
        trail: 'trail_standard',
      };
    } else if (item.slot === 'paint') {
      previewLoadout = {
        ...neutralBase,
        paint: item.id,
        spoiler: 'spoiler_none',
        decal: 'decal_none',
        underglow: 'underglow_none',
      };
    } else if (item.slot === 'decal') {
      previewLoadout = {
        ...neutralBase,
        paint: 'paint_titanium',
        decal: item.id,
        spoiler: 'spoiler_none',
        underglow: 'underglow_none',
      };
    } else if (item.slot === 'wheels') {
      previewLoadout = {
        ...neutralBase,
        wheels: item.id,
        spoiler: 'spoiler_none',
        decal: 'decal_none',
        underglow: 'underglow_none',
      };
    } else if (item.slot === 'spoiler') {
      previewLoadout = {
        ...neutralBase,
        spoiler: item.id,
        decal: 'decal_none',
        underglow: 'underglow_none',
      };
    } else if (item.slot === 'underglow') {
      previewLoadout = {
        ...neutralBase,
        paint: 'paint_carbon',
        underglow: item.id,
        spoiler: 'spoiler_none',
        decal: 'decal_none',
      };
    } else if (item.slot === 'trail') {
      previewLoadout = {
        ...neutralBase,
        trail: item.id,
        spoiler: 'spoiler_none',
        decal: 'decal_none',
        underglow: 'underglow_none',
      };
    } else {
      previewLoadout = {
        ...neutralBase,
        [item.slot]: item.id,
      };
    }

    let animId = 0;

    const renderToCtx = (targetCtx: CanvasRenderingContext2D, nowMs: number) => {
      const nowSec = nowMs / 1000;
      targetCtx.save();
      targetCtx.setTransform(1, 0, 0, 1, 0, 0);
      targetCtx.scale(dpr, dpr);

      const cx = width * 0.5;
      const cy = height * 0.55;

      // 1. Vibrant Rank-Based Radial Aura Backdrop
      const grad = targetCtx.createRadialGradient(
        cx,
        cy - 4,
        4,
        cx,
        cy,
        Math.max(width, height) * 0.72
      );
      grad.addColorStop(0, aura.core);
      grad.addColorStop(0.52, aura.mid);
      grad.addColorStop(1, aura.outer);
      targetCtx.fillStyle = grad;
      targetCtx.fillRect(0, 0, width, height);

      // 2. Top-Down Spotlight Cone & Hologram Grid Lines
      const spotGrad = targetCtx.createLinearGradient(cx, 0, cx, height);
      spotGrad.addColorStop(0, aura.beam);
      spotGrad.addColorStop(0.75, 'rgba(0,0,0,0)');
      targetCtx.fillStyle = spotGrad;
      targetCtx.beginPath();
      targetCtx.moveTo(cx - width * 0.18, 0);
      targetCtx.lineTo(cx - width * 0.46, height);
      targetCtx.lineTo(cx + width * 0.46, height);
      targetCtx.lineTo(cx + width * 0.18, 0);
      targetCtx.closePath();
      targetCtx.fill();

      // 3. 3D Glowing Showroom Pedestal under the Car
      const pedRx = Math.min(width * 0.39, 64);
      const pedRy = Math.min(height * 0.23, 21);
      const pedY = height * 0.67;

      // Pedestal floor glow
      const floorHalo = targetCtx.createRadialGradient(cx, pedY + 2, 2, cx, pedY + 2, pedRx * 1.35);
      floorHalo.addColorStop(0, aura.core);
      floorHalo.addColorStop(1, 'rgba(0,0,0,0)');
      targetCtx.fillStyle = floorHalo;
      targetCtx.beginPath();
      targetCtx.ellipse(cx, pedY + 3, pedRx * 1.3, pedRy * 1.35, 0, 0, Math.PI * 2);
      targetCtx.fill();

      // Pedestal 3D metallic rim
      targetCtx.fillStyle = '#070D19';
      targetCtx.strokeStyle = aura.ring;
      targetCtx.lineWidth = 1.6;
      targetCtx.beginPath();
      targetCtx.ellipse(cx, pedY, pedRx, pedRy, 0, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.stroke();

      // Inner dashed hologram ring on pedestal
      targetCtx.save();
      targetCtx.translate(cx, pedY);
      targetCtx.scale(1, pedRy / pedRx);
      targetCtx.rotate(animated ? nowSec * 0.6 : 0.35);
      targetCtx.strokeStyle = aura.ring;
      targetCtx.globalAlpha = 0.65;
      targetCtx.lineWidth = 1.2;
      targetCtx.setLineDash([8, 5]);
      targetCtx.beginPath();
      targetCtx.arc(0, 0, pedRx * 0.74, 0, Math.PI * 2);
      targetCtx.stroke();
      targetCtx.restore();

      // 4. If trail slot, draw illustrative trail particles behind the car
      if (item.slot === 'trail') {
        const trailColors =
          item.visualKey === 'tripled_wisps'
            ? ['#34D399', '#FEF08A', '#6EE7B7', '#10B981']
            : item.visualKey === 'project_glitch'
            ? ['#06B6D4', '#EC4899', '#A855F7']
            : item.visualKey === 'pool_bubbles'
            ? ['#38BDF8', '#E0F2FE', '#FDE047', '#FB7185']
            : item.visualKey === 't1_flames'
            ? ['#E11D48', '#FACC15', '#FEF08A']
            : item.visualKey === 'rainbow'
            ? ['#EF4444', '#F59E0B', '#22C55E', '#38BDF8', '#A855F7']
            : item.visualKey === 'purpleplasma'
            ? ['#A855F7', '#EC4899', '#E879F9']
            : item.visualKey === 'sparks' || item.visualKey === 'lightning'
            ? ['#FACC15', '#FEF08A', '#F59E0B']
            : item.visualKey === 'bluesmoke'
            ? ['#38BDF8', '#BAE6FD', '#0284C7']
            : item.visualKey === 'dust'
            ? ['#D97706', '#FDE68A', '#B45309']
            : item.visualKey === 'bubbles' || item.visualKey === 'spores'
            ? ['#4ADE80', '#86EFAC']
            : item.visualKey === 'flame' || item.visualKey === 'redfire'
            ? ['#EF4444', '#F97316', '#FACC15']
            : ['#E2E8F0', '#94A3B8'];
        for (let i = 0; i < 7; i++) {
          targetCtx.fillStyle = trailColors[i % trailColors.length];
          targetCtx.beginPath();
          targetCtx.arc(
            width * 0.24 - i * 5,
            height * 0.52 + (i % 2 === 0 ? -5 : 5),
            4.5 - i * 0.4,
            0,
            Math.PI * 2
          );
          targetCtx.fill();
        }
      }

      // 5. Render crisp car illustration poised on the 3D pedestal
      const carScale = Math.min(
        width / (item.slot === 'trail' ? 112 : 100),
        height / 62
      );
      drawModularCar(targetCtx, previewLoadout, {
        x: width * (item.slot === 'trail' ? 0.55 : 0.5),
        y: height * 0.5,
        angle: animated ? nowSec * 0.75 : -0.32,
        scale: carScale,
        nowSec: animated ? nowSec : 1.5,
        nitroActive: item.tier === 'SS' || item.tier === 'SSS',
      });

      targetCtx.restore();
    };

    if (animated) {
      const loop = (now: number) => {
        renderToCtx(ctx, now);
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(animId);
    } else {
      // Render to offscreen canvas first, store in cache, then copy to main canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = Math.floor(width * dpr);
      offscreen.height = Math.floor(height * dpr);
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        renderToCtx(offCtx, 1500);
        thumbnailCache.set(cacheKey, offscreen);
        ctx.drawImage(offscreen, 0, 0);
      } else {
        renderToCtx(ctx, 1500);
      }
    }
  }, [item.id, item.slot, item.tier, item.visualKey, width, height, animated]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`block rounded-xl ${className}`}
    />
  );
};

export const PartThumbnail = React.memo(
  PartThumbnailComponent,
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.animated === next.animated &&
    prev.className === next.className
);


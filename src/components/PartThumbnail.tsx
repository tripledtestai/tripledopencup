import React, { useEffect, useRef } from 'react';
import { DEFAULT_LOADOUT, TIER_COLORS } from '../game/constants';
import { drawModularCar } from '../game/carRenderer';
import { CarLoadout, PartItem } from '../game/types';

interface PartThumbnailProps {
  item: PartItem;
  baseLoadout?: CarLoadout;
  width?: number;
  height?: number;
  animated?: boolean;
  className?: string;
}

export const PartThumbnail: React.FC<PartThumbnailProps> = ({
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
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const tierStyle = TIER_COLORS[item.tier];
    const previewLoadout: CarLoadout = {
      ...baseLoadout,
      [item.slot]: item.id,
    };
    // Match themed base chassis/paint when previewing a themed skin part
    if (item.id.includes('_project')) {
      if (item.slot !== 'chassis') previewLoadout.chassis = 'chassis_project';
      if (item.slot !== 'paint') previewLoadout.paint = 'paint_project';
    } else if (item.id.includes('_poolparty')) {
      if (item.slot !== 'chassis') previewLoadout.chassis = 'chassis_poolparty';
      if (item.slot !== 'paint') previewLoadout.paint = 'paint_poolparty';
    } else if (item.id.includes('_t1')) {
      if (item.slot !== 'chassis') previewLoadout.chassis = 'chassis_t1';
      if (item.slot !== 'paint') previewLoadout.paint = 'paint_t1';
    } else if (
      item.slot !== 'chassis' &&
      previewLoadout.chassis === 'chassis_kart'
    ) {
      previewLoadout.chassis = 'chassis_coupe';
    }

    let animId = 0;

    const drawFrame = (nowMs: number) => {
      const nowSec = nowMs / 1000;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Radiant Tier Backdrop
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        6,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.7
      );
      if (item.tier === 'SSS') {
        grad.addColorStop(0, '#7F1D1D');
        grad.addColorStop(0.55, '#450A0A');
        grad.addColorStop(1, '#111827');
      } else if (item.tier === 'SS') {
        grad.addColorStop(0, '#581C87');
        grad.addColorStop(0.55, '#3B0764');
        grad.addColorStop(1, '#111827');
      } else if (item.tier === 'S') {
        grad.addColorStop(0, '#78350F');
        grad.addColorStop(0.55, '#451A03');
        grad.addColorStop(1, '#111827');
      } else if (item.tier === 'A') {
        grad.addColorStop(0, '#0C4A6E');
        grad.addColorStop(0.6, '#082F49');
        grad.addColorStop(1, '#0F172A');
      } else {
        grad.addColorStop(0, '#1E3A2F');
        grad.addColorStop(1, '#0F1C15');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Ornamental Pedestal / Sunburst Rays
      ctx.save();
      ctx.translate(width * 0.5, height * 0.54);
      ctx.strokeStyle = tierStyle.border;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + (animated ? nowSec * 0.3 : 0.2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * width * 0.6, Math.sin(a) * width * 0.6);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(width, height) * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // If trail slot, draw illustrative trail particles behind the car
      if (item.slot === 'trail') {
        const trailColors =
          item.visualKey === 'project_glitch'
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
          ctx.fillStyle = trailColors[i % trailColors.length];
          ctx.beginPath();
          ctx.arc(
            width * 0.24 - i * 5,
            height * 0.55 + (i % 2 === 0 ? -5 : 5),
            4.5 - i * 0.4,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }

      // Render crisp car illustration with full horizontal clearance (never clipped)
      const carScale = Math.min(
        width / (item.slot === 'trail' ? 116 : 106),
        height / 66
      );
      drawModularCar(ctx, previewLoadout, {
        x: width * (item.slot === 'trail' ? 0.55 : 0.5),
        y: height * 0.54,
        angle: animated ? nowSec * 0.75 : -0.32,
        scale: carScale,
        nowSec: animated ? nowSec : 1.5,
        nitroActive: item.tier === 'SS' || item.tier === 'SSS',
      });

      ctx.restore();
    };

    if (animated) {
      const loop = (now: number) => {
        drawFrame(now);
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(animId);
    } else {
      drawFrame(1500);
    }
  }, [item, baseLoadout, width, height, animated]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`block rounded-xl ${className}`}
    />
  );
};

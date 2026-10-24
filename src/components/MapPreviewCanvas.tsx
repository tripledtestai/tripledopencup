import React, { useEffect, useRef } from 'react';
import { computeMinimapTransform, isNightMapTheme } from '../game/rules';
import { MapDefinition } from '../game/types';

interface MapPreviewCanvasProps {
  map: MapDefinition;
  width?: number;
  height?: number;
  className?: string;
  showHazards?: boolean;
  animatedPaceCar?: boolean;
}

export const MapPreviewCanvas: React.FC<MapPreviewCanvasProps> = ({
  map,
  width = 560,
  height = 200,
  className = '',
  showHazards = true,
  animatedPaceCar = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = Math.max(80, Math.floor(canvas.clientWidth || width));
    let h = Math.max(60, Math.floor(canvas.clientHeight || height));

    const syncCanvasSize = () => {
      if (!canvas) return;
      const nw = Math.max(80, Math.floor(canvas.clientWidth || width));
      const nh = Math.max(60, Math.floor(canvas.clientHeight || height));
      w = nw;
      h = nh;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
    };

    syncCanvasSize();

    let resizeRafId = 0;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        syncCanvasSize();
        if (!animatedPaceCar) {
          drawFrame(performance.now());
        }
      });
    });
    resizeObserver.observe(canvas);

    const isNight = isNightMapTheme(map.theme);

    const drawFrame = (timeMs: number) => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // 1. Background terrain gradient
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
      bgGrad.addColorStop(0, map.bgColor || (isNight ? '#0b162c' : '#142918'));
      bgGrad.addColorStop(0.7, isNight ? '#060d1b' : '#0a170d');
      bgGrad.addColorStop(1, '#02050a');

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle atmospheric grid
      ctx.save();
      ctx.strokeStyle = isNight ? 'rgba(56, 189, 248, 0.05)' : 'rgba(34, 197, 94, 0.04)';
      ctx.lineWidth = 1;
      const step = 28;
      for (let gx = 0; gx < w; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += step) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }
      ctx.restore();

      // Transform for track coordinates
      const tf = computeMinimapTransform(map, w, h, 18);

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(tf.scale, tf.scale);
      ctx.translate(-tf.centerX, -tf.centerY);

      // 2. Shortcut Path & Secret Branches (if available) - Golden / Teal Glowing Dashes
      if (map.shortcut?.path && map.shortcut.path.length >= 2) {
        ctx.save();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
        ctx.lineWidth = Math.max(map.roadWidth * 0.45, 3.5 / tf.scale);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([12 / tf.scale, 8 / tf.scale]);
        ctx.beginPath();
        ctx.moveTo(map.shortcut.path[0].x, map.shortcut.path[0].y);
        for (let i = 1; i < map.shortcut.path.length; i++) {
          ctx.lineTo(map.shortcut.path[i].x, map.shortcut.path[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      if (map.secretBranches) {
        for (const br of map.secretBranches) {
          if (br.path.length < 2) continue;
          ctx.save();
          ctx.strokeStyle = br.elevation === 1 ? 'rgba(56, 189, 248, 0.9)' : 'rgba(168, 85, 247, 0.85)';
          ctx.lineWidth = Math.max(br.width * 0.65, 3.2 / tf.scale);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.setLineDash([10 / tf.scale, 7 / tf.scale]);
          ctx.beginPath();
          ctx.moveTo(br.path[0].x, br.path[0].y);
          for (let i = 1; i < br.path.length; i++) {
            ctx.lineTo(br.path[i].x, br.path[i].y);
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      const pts = map.waypoints;
      const segCount = map.isPointToPoint ? Math.max(1, pts.length - 1) : pts.length;

      // Helper to render segments of a specific elevation (0 = ground/underpass, 1 = overpass bridge)
      const renderElevationLayer = (targetElev: 0 | 1) => {
        for (let i = 0; i < segCount; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          const segElev: 0 | 1 = (a.elevation === 1 && b.elevation === 1) ? 1 : 0;
          if (segElev !== targetElev) continue;

          const segW = ((a.width ?? map.roadWidth) + (b.width ?? map.roadWidth)) * 0.5;
          const isSharp = a.cornerType === 'sharp' || b.cornerType === 'sharp';

          ctx.save();
          ctx.lineCap = isSharp ? 'square' : 'round';
          ctx.lineJoin = isSharp ? 'miter' : 'round';

          // Shadow (deeper drop shadow for elevation 1 overpasses)
          ctx.strokeStyle = targetElev === 1 ? 'rgba(0, 0, 0, 0.82)' : 'rgba(0, 0, 0, 0.6)';
          if (targetElev === 1) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
            ctx.shadowBlur = 12;
          }
          ctx.lineWidth = Math.max(segW * 0.96, 9 / tf.scale);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y + (targetElev === 1 ? 10 : 5) / tf.scale);
          ctx.lineTo(b.x, b.y + (targetElev === 1 ? 10 : 5) / tf.scale);
          ctx.stroke();

          // Border / Bridge Rail
          ctx.shadowBlur = 0;
          ctx.strokeStyle =
            targetElev === 1
              ? '#fde047'
              : a.noGuardrail
              ? '#f472b6'
              : map.roadBorderColor || '#38BDF8';
          ctx.lineWidth = Math.max(segW * 0.88, 8 / tf.scale);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          // Main Road Surface
          ctx.strokeStyle =
            a.surfaceType === 'glass' || a.surfaceType === 'glass_tunnel'
              ? '#1e3a5f'
              : map.roadColor || '#333942';
          ctx.lineWidth = Math.max(segW * 0.74, 6 / tf.scale);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          // Centerline (skip on wide open Macrophage arena)
          if (a.surfaceType !== 'arena') {
            ctx.strokeStyle =
              targetElev === 1
                ? 'rgba(253, 224, 71, 0.65)'
                : 'rgba(255, 255, 255, 0.38)';
            ctx.lineWidth = Math.max(1.3 / tf.scale, 1.0);
            ctx.setLineDash([10 / tf.scale, 10 / tf.scale]);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }

          ctx.restore();
        }
      };

      // Pass 1: Ground / Underpass (elevation 0)
      renderElevationLayer(0);
      // Pass 2: Overpass Bridges (elevation 1)
      renderElevationLayer(1);

      // 7. Hazards & Boost Zones Preview
      if (showHazards) {
        if (map.boostZones) {
          for (const b of map.boostZones) {
            ctx.save();
            ctx.fillStyle = '#22d3ee';
            ctx.shadowColor = '#22d3ee';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(b.x, b.y, Math.max(b.radius * 0.45, 5 / tf.scale), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        if (map.pinballBumpers) {
          for (const pb of map.pinballBumpers) {
            ctx.save();
            ctx.fillStyle = pb.color || '#fb7185';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1.5 / tf.scale, 1);
            ctx.beginPath();
            ctx.arc(pb.x, pb.y, Math.max(pb.radius * 0.75, 4 / tf.scale), 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }

        if (map.tarnPistons) {
          for (const tp of map.tarnPistons) {
            ctx.save();
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, Math.max(tp.radius * 0.55, 4.5 / tf.scale), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        if (map.naturalMudZones) {
          for (const m of map.naturalMudZones) {
            ctx.save();
            ctx.fillStyle = 'rgba(120, 53, 15, 0.75)';
            ctx.beginPath();
            ctx.arc(m.x, m.y, Math.max(m.radius * 0.6, 6 / tf.scale), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        if (map.acidZones) {
          for (const az of map.acidZones) {
            ctx.save();
            ctx.fillStyle = 'rgba(132, 204, 22, 0.65)';
            ctx.beginPath();
            ctx.arc(az.x, az.y, Math.max(az.radius * 0.6, 6 / tf.scale), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        if (map.synapseGates) {
          for (const sg of map.synapseGates) {
            ctx.save();
            ctx.strokeStyle = '#c084fc';
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 8;
            ctx.lineWidth = Math.max(4 / tf.scale, 2);
            ctx.beginPath();
            const perpX = Math.cos(sg.angle + Math.PI / 2) * (sg.width * 0.5);
            const perpY = Math.sin(sg.angle + Math.PI / 2) * (sg.width * 0.5);
            ctx.moveTo(sg.x - perpX, sg.y - perpY);
            ctx.lineTo(sg.x + perpX, sg.y + perpY);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // 8. Start / Finish Line Checkered Bar at waypoint 0 (and South Pole Portal for Map 15)
      const startWp = map.waypoints[0];
      const nextWp = map.waypoints[1] || map.waypoints[0];
      const trackAngle = Math.atan2(nextWp.y - startWp.y, nextWp.x - startWp.x);

      ctx.save();
      ctx.translate(startWp.x, startWp.y);
      ctx.rotate(trackAngle + Math.PI / 2);
      const finishBarW = Math.max((startWp.width ?? map.roadWidth) * 0.78, 8 / tf.scale);
      const finishBarH = Math.max(8 / tf.scale, 4);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-finishBarW / 2, -finishBarH / 2, finishBarW, finishBarH);
      ctx.fillStyle = '#0f172a';
      const cellW = finishBarW / 6;
      for (let c = 0; c < 6; c += 2) {
        ctx.fillRect(-finishBarW / 2 + c * cellW, -finishBarH / 2, cellW, finishBarH / 2);
        ctx.fillRect(-finishBarW / 2 + (c + 1) * cellW, 0, cellW, finishBarH / 2);
      }
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1 / tf.scale;
      ctx.strokeRect(-finishBarW / 2, -finishBarH / 2, finishBarW, finishBarH);
      ctx.restore();

      if (map.isPointToPoint && map.waypoints.length >= 2) {
        const endWp = map.waypoints[map.waypoints.length - 1];
        ctx.save();
        ctx.translate(endWp.x, endWp.y);
        ctx.fillStyle = 'rgba(45, 212, 191, 0.35)';
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 2.5 / tf.scale;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(110, 9 / tf.scale), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 9. Animated Pace Car Dot
      if (animatedPaceCar && map.waypoints.length >= 3) {
        const totalSegs = map.isPointToPoint ? map.waypoints.length - 1 : map.waypoints.length;
        const progress = (timeMs / 4500) % 1;
        const floatIdx = progress * totalSegs;
        const idxA = Math.min(totalSegs - 1, Math.floor(floatIdx));
        const idxB = (idxA + 1) % map.waypoints.length;
        const subT = floatIdx - idxA;

        const pA = map.waypoints[idxA];
        const pB = map.waypoints[idxB];
        const carX = pA.x + (pB.x - pA.x) * subT;
        const carY = pA.y + (pB.y - pA.y) * subT;
        const carAngle = Math.atan2(pB.y - pA.y, pB.x - pA.x);

        ctx.save();
        ctx.translate(carX, carY);

        ctx.fillStyle = 'rgba(250, 204, 21, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, 10 / tf.scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, 5 / tf.scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(carAngle);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(8.5 / tf.scale, 0);
        ctx.lineTo(2.5 / tf.scale, -2.5 / tf.scale);
        ctx.lineTo(2.5 / tf.scale, 2.5 / tf.scale);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
      ctx.restore();

      if (animatedPaceCar) {
        animId = requestAnimationFrame(drawFrame);
      }
    };

    if (animatedPaceCar) {
      animId = requestAnimationFrame(drawFrame);
    } else {
      drawFrame(0);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      resizeObserver.disconnect();
    };
  }, [map, width, height, showHazards, animatedPaceCar]);

  return (
    <canvas
      ref={canvasRef}
      className={`block select-none pointer-events-none ${className}`}
    />
  );
};

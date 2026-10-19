import React, { useEffect, useRef } from 'react';
import { drawModularCar, TrailParticlePool } from '../game/carRenderer';
import {
  extractGameKeysFromKeyDown,
  extractGameKeysFromKeyUp,
  isTypingInInput,
} from '../game/keyboard';
import { CarLoadout } from '../game/types';
import { soundEngine } from '../services/sound';

interface ShowroomCanvasProps {
  loadout: CarLoadout;
  username: string;
  active: boolean;
  isNightMode?: boolean;
}

export const ShowroomCanvas: React.FC<ShowroomCanvasProps> = ({
  loadout,
  username,
  active,
  isNightMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadoutRef = useRef<CarLoadout>(loadout);
  const usernameRef = useRef<string>(username);
  const activeRef = useRef<boolean>(active);
  const isNightRef = useRef<boolean>(isNightMode);

  useEffect(() => {
    loadoutRef.current = loadout;
  }, [loadout]);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    isNightRef.current = isNightMode;
  }, [isNightMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    let width = canvas.clientWidth || window.innerWidth || 1280;
    let height = canvas.clientHeight || window.innerHeight || 720;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.clientWidth || window.innerWidth || 1280;
      height = canvas.clientHeight || window.innerHeight || 720;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // 2D Top-Down / Stylized Vector Pit-Stop Props helper
    const draw2DTreeTopDown = (
      c: CanvasRenderingContext2D,
      tx: number,
      ty: number,
      radius: number,
      night: boolean
    ) => {
      c.save();
      c.translate(tx, ty);
      // Crisp 2D drop shadow
      c.fillStyle = 'rgba(0, 0, 0, 0.28)';
      c.beginPath();
      c.arc(5, 6, radius, 0, Math.PI * 2);
      c.fill();

      // Outer foliage ring with bold 2D outline matching car art
      c.fillStyle = night ? '#064E3B' : '#16A34A';
      c.strokeStyle = night ? '#022C22' : '#14532D';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, radius, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Mid foliage layer
      c.fillStyle = night ? '#047857' : '#22C55E';
      c.beginPath();
      c.arc(-radius * 0.12, -radius * 0.12, radius * 0.72, 0, Math.PI * 2);
      c.fill();

      // Highlight crown
      c.fillStyle = night ? '#10B981' : '#86EFAC';
      c.beginPath();
      c.arc(-radius * 0.24, -radius * 0.24, radius * 0.36, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };

    const draw2DTireStack = (
      c: CanvasRenderingContext2D,
      tx: number,
      ty: number,
      ringColor: string
    ) => {
      c.save();
      c.translate(tx, ty);
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.beginPath();
      c.arc(3, 4, 16, 0, Math.PI * 2);
      c.fill();

      c.fillStyle = '#1E293B';
      c.strokeStyle = '#0F172A';
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(0, 0, 15, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.strokeStyle = ringColor;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, 9.5, 0, Math.PI * 2);
      c.stroke();

      c.fillStyle = '#090D16';
      c.beginPath();
      c.arc(0, 0, 5, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };

    const showcase = {
      angle: -0.35,
      autoRotate: true,
      nitroTimer: 0,
    };

    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (isTypingInInput(e.target)) return;
      const mapped = extractGameKeysFromKeyDown(e);
      if (mapped.length === 0) return;

      for (const code of mapped) {
        if (
          code === 'Space' ||
          code === 'ShiftLeft' ||
          code === 'ShiftRight'
        ) {
          e.preventDefault();
          if (!keys.has('ShiftLeft') && !keys.has('ShiftRight')) {
            soundEngine.playBoost();
          }
          showcase.nitroTimer = 1.0;
        }
        keys.add(code);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const mapped = extractGameKeysFromKeyUp(e);
      for (const code of mapped) {
        keys.delete(code);
      }
    };
    const onBlur = () => {
      keys.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    const trailPool = new TrailParticlePool(180);
    let lastTime = performance.now();
    let lastRenderTime = 0;
    let animId = 0;

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);

      if (isHeadless && now - lastRenderTime < 66) {
        return;
      }
      lastRenderTime = now;

      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const nowSec = now / 1000;

      const left = keys.has('KeyA') || keys.has('ArrowLeft');
      const right = keys.has('KeyD') || keys.has('ArrowRight');
      const shiftHeld =
        keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Space');

      if (shiftHeld) {
        showcase.nitroTimer = Math.max(showcase.nitroTimer, 0.2);
      } else if (showcase.nitroTimer > 0) {
        showcase.nitroTimer = Math.max(0, showcase.nitroTimer - dt);
      }

      if (left) {
        showcase.angle -= 1.8 * dt;
      } else if (right) {
        showcase.angle += 1.8 * dt;
      } else if (showcase.autoRotate) {
        showcase.angle += 0.38 * dt;
      }

      const cx = width * 0.5;
      const cy = height * 0.52;
      const isNitroActive = showcase.nitroTimer > 0;
      const night = isNightRef.current;

      if (isNitroActive) {
        trailPool.spawnFromCar(
          cx,
          cy,
          showcase.angle,
          260,
          true,
          loadoutRef.current.trail,
          nowSec
        );
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // ====================================================================
      // 1. 2D VECTOR RACING PLAZA & PIT-LANE FLOOR (Matches 2D Car Aesthetic)
      // ====================================================================
      const bgGrad = ctx.createRadialGradient(
        cx,
        cy,
        40,
        cx,
        cy,
        Math.max(width, height) * 0.72
      );
      if (night) {
        bgGrad.addColorStop(0, '#1E293B');
        bgGrad.addColorStop(0.55, '#0F172A');
        bgGrad.addColorStop(1, '#050811');
      } else {
        // Daytime sunlit 2D paddock & asphalt apron
        bgGrad.addColorStop(0, '#475569');
        bgGrad.addColorStop(0.58, '#334155');
        bgGrad.addColorStop(1, '#1E293B');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Clean 2D Vector Blueprint Grid on the Showroom Floor
      ctx.strokeStyle = night
        ? 'rgba(56, 189, 248, 0.08)'
        : 'rgba(248, 250, 252, 0.09)';
      ctx.lineWidth = 1.5;
      const gridStep = 64;
      for (let gx = (cx % gridStep) - gridStep; gx < width; gx += gridStep) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = (cy % gridStep) - gridStep; gy < height; gy += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // 2. Top & Bottom 2D Park Borders + Red/White Racing Kerbs
      const parkBandH = Math.max(76, height * 0.13);
      ctx.fillStyle = night ? '#062E22' : '#15803D';
      ctx.fillRect(0, 0, width, parkBandH);
      ctx.fillRect(0, height - parkBandH, width, parkBandH);

      // 2D Cel-Shaded Red & White / Gold Racing Kerbs along the pit lane edges
      const kerbW = 44;
      const kerbH = 14;
      const kerbCount = Math.ceil(width / kerbW) + 1;
      for (let i = 0; i < kerbCount; i++) {
        const kx = i * kerbW;
        ctx.fillStyle =
          i % 2 === 0
            ? night
              ? '#E11D48'
              : '#EF4444'
            : night
            ? '#FEF08A'
            : '#F8FAFC';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.fillRect(kx, parkBandH - kerbH * 0.5, kerbW, kerbH);
        ctx.strokeRect(kx, parkBandH - kerbH * 0.5, kerbW, kerbH);

        ctx.fillRect(kx, height - parkBandH - kerbH * 0.5, kerbW, kerbH);
        ctx.strokeRect(kx, height - parkBandH - kerbH * 0.5, kerbW, kerbH);
      }

      // 3. 2D Vector Speed Chevrons on Left & Right Pit Lane Apron
      ctx.save();
      for (let side of [-1, 1]) {
        for (let i = 1; i <= 3; i++) {
          const ax = cx + side * (210 + i * 70);
          const pulse =
            0.18 + 0.12 * Math.sin(nowSec * 3.2 - i * 0.7);
          ctx.strokeStyle = night
            ? `rgba(56, 189, 248, ${pulse.toFixed(2)})`
            : `rgba(254, 240, 138, ${(pulse + 0.08).toFixed(2)})`;
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(ax + side * 22, cy - 42);
          ctx.lineTo(ax - side * 14, cy);
          ctx.lineTo(ax + side * 22, cy + 42);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 4. Crisp 2D Trees & Tire Stacks framing the Showroom Plaza
      draw2DTreeTopDown(ctx, width * 0.14, parkBandH * 0.52, 28, night);
      draw2DTreeTopDown(ctx, width * 0.24, parkBandH * 0.45, 22, night);
      draw2DTreeTopDown(ctx, width * 0.76, parkBandH * 0.45, 22, night);
      draw2DTreeTopDown(ctx, width * 0.86, parkBandH * 0.52, 28, night);

      draw2DTreeTopDown(ctx, width * 0.16, height - parkBandH * 0.5, 26, night);
      draw2DTreeTopDown(ctx, width * 0.84, height - parkBandH * 0.5, 26, night);

      // Corner 2D Racing Tire Barriers
      draw2DTireStack(ctx, cx - 220, cy - 125, '#EF4444');
      draw2DTireStack(ctx, cx - 192, cy - 138, '#F8FAFC');
      draw2DTireStack(ctx, cx + 220, cy - 125, '#EF4444');
      draw2DTireStack(ctx, cx + 192, cy - 138, '#F8FAFC');
      draw2DTireStack(ctx, cx - 220, cy + 125, '#F59E0B');
      draw2DTireStack(ctx, cx + 220, cy + 125, '#F59E0B');

      // ====================================================================
      // 5. CENTER 2D VECTOR HYDRAULIC SHOWCASE TURNTABLE PAD
      // ====================================================================
      ctx.save();
      ctx.translate(cx, cy);

      // Outer 2D Turntable Base Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.arc(0, 6, 166, 0, Math.PI * 2);
      ctx.fill();

      // Outer Metallic Ring with Bold 2D Vector Stroke
      ctx.fillStyle = night ? '#0F172A' : '#1E293B';
      ctx.strokeStyle = '#090D16';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 160, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 2D Checkered / Segmented Racing Bezel around the Turntable
      const segs = 24;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 0.7) / segs) * Math.PI * 2;
        ctx.strokeStyle =
          i % 2 === 0
            ? isNitroActive
              ? '#F43F5E'
              : '#F59E0B'
            : night
            ? '#38BDF8'
            : '#E2E8F0';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, 148, a0, a1);
        ctx.stroke();
      }

      // Inner 2D Showcase Platform Deck
      const deckGrad = ctx.createRadialGradient(0, 0, 14, 0, 0, 138);
      if (night) {
        deckGrad.addColorStop(0, '#1E293B');
        deckGrad.addColorStop(0.7, '#0F172A');
        deckGrad.addColorStop(1, '#020617');
      } else {
        deckGrad.addColorStop(0, '#475569');
        deckGrad.addColorStop(0.7, '#334155');
        deckGrad.addColorStop(1, '#1E293B');
      }
      ctx.fillStyle = deckGrad;
      ctx.strokeStyle = isNitroActive ? '#F43F5E' : '#F59E0B';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 138, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotating 2D Tech Reticle Ring inside the Turntable
      ctx.save();
      ctx.rotate(nowSec * 0.35);
      ctx.strokeStyle = night
        ? 'rgba(56, 189, 248, 0.55)'
        : 'rgba(254, 240, 138, 0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([16, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, 112, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Twin 2D Racing Stripes across the turntable aligned with the car
      ctx.save();
      ctx.rotate(showcase.angle);
      ctx.fillStyle = night
        ? 'rgba(56, 189, 248, 0.12)'
        : 'rgba(254, 240, 138, 0.14)';
      ctx.fillRect(-126, -18, 252, 10);
      ctx.fillRect(-126, 8, 252, 10);

      // Crisp 2D Car Drop Shadow on the turntable
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.roundRect(-58, -32, 116, 64, 18);
      ctx.fill();
      ctx.restore();

      ctx.restore();

      // 6. Update & draw Nitro exhaust trails if active
      trailPool.updateAndDraw(ctx, dt);

      // 7. Draw Showcase Car in 2D (Headlights ONLY on in Night mode!)
      drawModularCar(ctx, loadoutRef.current, {
        x: cx,
        y: cy,
        angle: showcase.angle,
        scale: 2.35,
        nowSec,
        drifting: false,
        nitroActive: isNitroActive,
        isPlayer: true,
        showHeadlightBeams: night,
      });

      ctx.restore();
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="showroom-canvas"
      className="fixed inset-0 w-full h-full block pointer-events-none"
    />
  );
};


import { ALL_PARTS } from './constants';
import { CarLoadout } from './types';

export interface TrailParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
  type: 'skid' | 'smoke' | 'fire' | 'spore' | 'rainbow' | 'cyber' | 'bubble';
}

export class TrailParticlePool {
  private pool: TrailParticle[] = [];
  private cursor: number = 0;

  constructor(capacity: number = 450) {
    for (let i = 0; i < capacity; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 4,
        alpha: 0,
        decay: 1,
        color: '#000',
        type: 'skid',
      });
    }
  }

  public spawnFromCar(
    x: number,
    y: number,
    angle: number,
    speed: number,
    nitroActive: boolean,
    trailPartId: string,
    nowSec: number
  ): void {
    // Requirement #2: Vệt bánh và khói xả chỉ xuất hiện khi kích hoạt Nitro
    if (!nitroActive || speed < 10) return;
    const visual =
      ALL_PARTS.find((p) => p.id === trailPartId)?.visualKey || 'black';

    // Rear wheel offsets in local car space (car faces +X) — tighter & smaller
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rearOffsets = [
      { lx: -16, ly: -9.5 },
      { lx: -16, ly: 9.5 },
    ];

    for (const off of rearOffsets) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.pool.length;

      p.active = true;
      p.x = x + off.lx * cos - off.ly * sin;
      p.y = y + off.lx * sin + off.ly * cos;

      if (visual === 'black') {
        p.vx = -cos * 8 + (Math.random() - 0.5) * 4;
        p.vy = -sin * 8 + (Math.random() - 0.5) * 4;
        p.size = 2.3;
        p.alpha = 0.55;
        p.decay = 0.65;
        p.color = '#111827';
        p.type = 'skid';
      } else if (visual === 'dust') {
        p.vx = -cos * 16 + (Math.random() - 0.5) * 10;
        p.vy = -sin * 16 + (Math.random() - 0.5) * 10;
        p.size = 3.2;
        p.alpha = 0.55;
        p.decay = 1.1;
        p.color = Math.random() > 0.4 ? '#D97706' : '#FDE68A';
        p.type = 'smoke';
      } else if (visual === 'whitesmoke') {
        p.vx = -cos * 18 + (Math.random() - 0.5) * 9;
        p.vy = -sin * 18 + (Math.random() - 0.5) * 9;
        p.size = 3.8;
        p.alpha = 0.52;
        p.decay = 1.25;
        p.color = '#E2E8F0';
        p.type = 'smoke';
      } else if (visual === 'bluesmoke') {
        p.vx = -cos * 20 + (Math.random() - 0.5) * 10;
        p.vy = -sin * 20 + (Math.random() - 0.5) * 10;
        p.size = 3.7;
        p.alpha = 0.58;
        p.decay = 1.3;
        p.color = Math.random() > 0.4 ? '#38BDF8' : '#BAE6FD';
        p.type = 'smoke';
      } else if (visual === 'sparks') {
        p.vx = -cos * 36 + (Math.random() - 0.5) * 18;
        p.vy = -sin * 36 + (Math.random() - 0.5) * 18;
        p.size = 2.4;
        p.alpha = 0.85;
        p.decay = 1.9;
        p.color = Math.random() > 0.35 ? '#FACC15' : '#FEF08A';
        p.type = 'fire';
      } else if (visual === 'redfire') {
        p.vx = -cos * 42 + (Math.random() - 0.5) * 14;
        p.vy = -sin * 42 + (Math.random() - 0.5) * 14;
        p.size = 3.6;
        p.alpha = 0.78;
        p.decay = 1.85;
        p.color = Math.random() > 0.4 ? '#EF4444' : '#F59E0B';
        p.type = 'fire';
      } else if (visual === 'purpleplasma') {
        p.vx = -cos * 44 + (Math.random() - 0.5) * 14;
        p.vy = -sin * 44 + (Math.random() - 0.5) * 14;
        p.size = 3.5;
        p.alpha = 0.82;
        p.decay = 1.8;
        p.color = Math.random() > 0.45 ? '#A855F7' : '#EC4899';
        p.type = 'fire';
      } else if (visual === 'project_glitch') {
        p.vx = -cos * 32 + (Math.random() - 0.5) * 16;
        p.vy = -sin * 32 + (Math.random() - 0.5) * 16;
        p.size = 2.7 + Math.random() * 1.4;
        p.alpha = 0.82;
        p.decay = 1.55;
        p.color =
          Math.random() > 0.5
            ? '#06B6D4'
            : Math.random() > 0.5
            ? '#EC4899'
            : '#A855F7';
        p.type = 'cyber';
      } else if (visual === 'pool_bubbles') {
        p.vx = -cos * 20 + (Math.random() - 0.5) * 18;
        p.vy = -sin * 20 + (Math.random() - 0.5) * 18;
        p.size = 2.6 + Math.random() * 2.0;
        p.alpha = 0.8;
        p.decay = 1.15;
        p.color =
          Math.random() > 0.45
            ? '#38BDF8'
            : Math.random() > 0.5
            ? '#7DD3FC'
            : '#FDE047';
        p.type = 'bubble';
      } else if (visual === 't1_flames') {
        p.vx = -cos * 45 + (Math.random() - 0.5) * 14;
        p.vy = -sin * 45 + (Math.random() - 0.5) * 14;
        p.size = 3.8;
        p.alpha = 0.85;
        p.decay = 1.65;
        p.color =
          Math.random() > 0.45
            ? '#E11D48'
            : Math.random() > 0.3
            ? '#FACC15'
            : '#FEF08A';
        p.type = 'fire';
      } else if (visual === 'spores') {
        p.vx = -cos * 15 + (Math.random() - 0.5) * 18;
        p.vy = -sin * 15 + (Math.random() - 0.5) * 18;
        p.size = 2.6 + Math.random() * 1.8;
        p.alpha = 0.78;
        p.decay = 1.15;
        p.color = Math.random() > 0.5 ? '#4ADE80' : '#A3E635';
        p.type = 'spore';
      } else if (visual === 'rainbow') {
        const hue = Math.floor((nowSec * 260 + this.cursor * 8) % 360);
        p.vx = -cos * 8;
        p.vy = -sin * 8;
        p.size = 3.4;
        p.alpha = 0.78;
        p.decay = 1.2;
        p.color = `hsl(${hue}, 95%, 60%)`;
        p.type = 'rainbow';
      }
    }
  }

  public updateAndDraw(ctx: CanvasRenderingContext2D, dt: number): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.type === 'smoke') {
        p.size += 4.2 * dt;
      }
      if (p.alpha <= 0.01) {
        p.active = false;
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      if (p.type === 'cyber') {
        // Digital square pixel / holographic cube
        ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        ctx.strokeStyle = '#F8FAFC';
        ctx.lineWidth = 0.7;
        ctx.strokeRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.type === 'spore' || p.type === 'bubble') {
          ctx.strokeStyle = p.type === 'bubble' ? '#FFFFFF' : '#ECFCCB';
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
}

function getVisualKey(partId: string, fallback: string): string {
  const found = ALL_PARTS.find((p) => p.id === partId);
  return found ? found.visualKey : fallback;
}

function drawMiniStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  color: string
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a complete 7-slot modular top-down racing car facing +X (angle 0) centered at (0,0)
 */
export function drawModularCar(
  ctx: CanvasRenderingContext2D,
  loadout: CarLoadout,
  options: {
    x: number;
    y: number;
    angle: number;
    scale?: number;
    nowSec: number;
    drifting?: boolean;
    nitroActive?: boolean;
    rocketStartActive?: boolean;
    invulnerableBlink?: boolean;
    username?: string;
    teamId?: number;
    isPlayer?: boolean;
    showHeadlightBeams?: boolean;
  }
): void {
  const {
    x,
    y,
    angle,
    scale = 1,
    nowSec,
    nitroActive = false,
    rocketStartActive = false,
    invulnerableBlink = false,
    username,
    teamId,
    isPlayer = false,
    showHeadlightBeams = false,
  } = options;

  if (invulnerableBlink && Math.floor(nowSec * 14) % 2 === 0) {
    return;
  }

  const chassisKey = getVisualKey(loadout.chassis, 'kart');
  const paintKey = getVisualKey(loadout.paint, 'solid_red');
  const decalKey = getVisualKey(loadout.decal, 'none');
  const wheelsKey = getVisualKey(loadout.wheels, 'standard');
  const spoilerKey = getVisualKey(loadout.spoiler, 'none');
  const underglowKey = getVisualKey(loadout.underglow, 'none');

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Rotate car to face direction
  ctx.save();
  ctx.rotate(angle);

  // =========================================================
  // LAYER 0: VOLUMETRIC DUAL HEADLIGHT BEAMS ON ROAD
  // =========================================================
  if (showHeadlightBeams) {
    ctx.save();
    const beamLen = isPlayer ? 115 : 85;
    const beamGrad = ctx.createLinearGradient(20, 0, 20 + beamLen, 0);
    if (nitroActive || rocketStartActive) {
      beamGrad.addColorStop(0, 'rgba(186, 230, 253, 0.42)');
      beamGrad.addColorStop(0.45, 'rgba(56, 189, 248, 0.16)');
      beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    } else {
      beamGrad.addColorStop(0, isPlayer ? 'rgba(254, 249, 195, 0.36)' : 'rgba(254, 249, 195, 0.22)');
      beamGrad.addColorStop(0.5, isPlayer ? 'rgba(254, 240, 138, 0.14)' : 'rgba(254, 240, 138, 0.08)');
      beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    }
    ctx.fillStyle = beamGrad;

    // Left headlight cone
    ctx.beginPath();
    ctx.moveTo(20, -9);
    ctx.lineTo(20 + beamLen, -34);
    ctx.lineTo(20 + beamLen, 3);
    ctx.lineTo(20, -5);
    ctx.closePath();
    ctx.fill();

    // Right headlight cone
    ctx.beginPath();
    ctx.moveTo(20, 5);
    ctx.lineTo(20 + beamLen, -3);
    ctx.lineTo(20 + beamLen, 34);
    ctx.lineTo(20, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // =========================================================
  // LAYER 1 (SLOT 6): ĐÈN GẦM & HÀO QUANG (UNDERGLOW & AURA)
  // =========================================================
  if (underglowKey !== 'none') {
    ctx.save();
    if (underglowKey === 'warmamber') {
      const grad = ctx.createRadialGradient(0, 0, 6, 0, 0, 32);
      grad.addColorStop(0, 'rgba(251, 191, 36, 0.7)');
      grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 32, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (underglowKey === 'cyansonic') {
      const grad = ctx.createRadialGradient(0, 0, 6, 0, 0, 34);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.78)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 23, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (underglowKey === 'neongreen') {
      const grad = ctx.createRadialGradient(0, 0, 6, 0, 0, 34);
      grad.addColorStop(0, 'rgba(74, 222, 128, 0.75)');
      grad.addColorStop(1, 'rgba(74, 222, 128, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (underglowKey === 'crimson') {
      const grad = ctx.createRadialGradient(0, 0, 6, 0, 0, 35);
      grad.addColorStop(0, 'rgba(244, 63, 94, 0.8)');
      grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 35, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (underglowKey === 'neonpurple') {
      const grad = ctx.createRadialGradient(0, 0, 6, 0, 0, 35);
      grad.addColorStop(0, 'rgba(192, 132, 252, 0.8)');
      grad.addColorStop(0.5, 'rgba(244, 63, 94, 0.45)');
      grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 35, 25, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (underglowKey === 'dualpulse') {
      const grad = ctx.createRadialGradient(0, 0, 6, 0, 0, 36);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.72)');
      grad.addColorStop(0.6, 'rgba(250, 204, 21, 0.45)');
      grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 32, 21, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (underglowKey === 'project_matrix') {
      // SIÊU PHẨM (PROJECT) Holographic Hexagon & Neon Cyber Ring
      const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, 36);
      grad.addColorStop(0, 'rgba(236, 72, 153, 0.65)');
      grad.addColorStop(0.6, 'rgba(6, 182, 212, 0.45)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 26, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = nowSec * 2.5 + (i * Math.PI) / 3;
        const hx = Math.cos(a) * 32;
        const hy = Math.sin(a) * 22;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (underglowKey === 'pool_splash') {
      // Pool Party Ocean Wave Ring & Orbiting Water Bubbles
      const grad = ctx.createRadialGradient(0, 0, 6, 0, 0, 36);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.72)');
      grad.addColorStop(0.65, 'rgba(6, 182, 212, 0.4)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 25, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#BAE6FD';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.ellipse(0, 0, 33, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = 0; i < 4; i++) {
        const a = nowSec * 3.8 + (i * Math.PI) / 2;
        const bx = Math.cos(a) * 33;
        const by = Math.sin(a) * 22;
        ctx.fillStyle = i % 2 === 0 ? '#E0F2FE' : '#FDE047';
        ctx.beginPath();
        ctx.arc(bx, by, 3.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (underglowKey === 't1_stars') {
      // T1 Worlds Championship Crimson-Gold Aura + 5 Orbiting Championship Stars
      const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, 38);
      grad.addColorStop(0, 'rgba(225, 29, 72, 0.75)');
      grad.addColorStop(0.6, 'rgba(250, 204, 21, 0.45)');
      grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 38, 26, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 35, 23, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 5 T1 Worlds Trophy Stars
      for (let i = 0; i < 5; i++) {
        const a = nowSec * 3.6 + (i * Math.PI * 2) / 5;
        const sx = Math.cos(a) * 35;
        const sy = Math.sin(a) * 23;
        drawMiniStar(ctx, sx, sy, 4.8, 2.2, '#FEF08A');
      }
    } else if (underglowKey === 'lightning') {
      // Electric field aura + jagged bolts
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = nowSec * 6 + (i * Math.PI) / 3;
        const r1 = 22;
        const r2 = 30 + Math.sin(nowSec * 25 + i) * 5;
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.75);
        ctx.lineTo(
          Math.cos(a + 0.25) * r2,
          Math.sin(a + 0.25) * r2 * 0.75
        );
      }
      ctx.stroke();
    } else if (underglowKey === 'atp') {
      // Orbiting ATP molecules
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = nowSec * 4.5 + (i * Math.PI) / 2;
        const ox = Math.cos(a) * 34;
        const oy = Math.sin(a) * 22;
        ctx.fillStyle = i % 2 === 0 ? '#FACC15' : '#4ADE80';
        ctx.beginPath();
        ctx.arc(ox, oy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Nitro / Rocket Start Jet Flame behind car (compact & sleek)
  if (nitroActive || rocketStartActive) {
    ctx.save();
    const flameLen = 16 + Math.sin(nowSec * 45) * 4.5;
    ctx.fillStyle = rocketStartActive ? '#38BDF8' : '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(-22, -4.8);
    ctx.lineTo(-22 - flameLen, 0);
    ctx.lineTo(-22, 4.8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.moveTo(-22, -2.4);
    ctx.lineTo(-22 - flameLen * 0.58, 0);
    ctx.lineTo(-22, 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // =========================================================
  // LAYER 2 (SLOT 4): BÁNH XE (WHEELS)
  // =========================================================
  if (chassisKey !== 'ufo') {
    const wheelPositions = [
      { wx: 13, wy: -14 },
      { wx: 13, wy: 14 },
      { wx: -13, wy: -14 },
      { wx: -13, wy: 14 },
    ];

    for (const wp of wheelPositions) {
      ctx.save();
      ctx.translate(wp.wx, wp.wy);

      // Base tire
      ctx.fillStyle =
        wheelsKey === 'blueenergy'
          ? '#0284C7'
          : wheelsKey === 'hellfire'
          ? '#991B1B'
          : wheelsKey === 'project_hex'
          ? '#1E1B4B'
          : wheelsKey === 'pool_float'
          ? '#EF4444'
          : wheelsKey === 't1_gold'
          ? '#7F1D1D'
          : wheelsKey === 'turboprop'
          ? '#3B0764'
          : '#111827';
      ctx.beginPath();
      ctx.roundRect(-6.5, -3.8, 13, 7.6, 2);
      ctx.fill();

      // Wheel rim / accent
      if (wheelsKey === 'offroad') {
        ctx.fillStyle = '#475569';
        ctx.fillRect(-5.5, -4.2, 3, 8.4);
        ctx.fillRect(2.5, -4.2, 3, 8.4);
      } else if (wheelsKey === 'whitewall') {
        ctx.strokeStyle = '#F8FAFC';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(-4.5, -2.5, 9, 5);
      } else if (wheelsKey === 'goldrim') {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(-4.8, -2.5, 9.6, 5);
      } else if (wheelsKey === 'redsport') {
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(-5, -2.6, 10, 5.2);
      } else if (wheelsKey === 'cybercyan') {
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(-5, -2.6, 10, 5.2);
      } else if (wheelsKey === 'turboprop') {
        ctx.strokeStyle = '#C084FC';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(-5, -2.6, 10, 5.2);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(-2, -1.4, 4, 2.8);
      } else if (wheelsKey === 'project_hex') {
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(-5.2, -2.6, 10.4, 5.2);
        ctx.fillStyle = '#EC4899';
        ctx.fillRect(-2.5, -1.5, 5, 3);
      } else if (wheelsKey === 'pool_float') {
        // Red & White Pool Party lifebuoy stripes
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-2.2, -3.8, 4.4, 7.6);
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 1;
        ctx.strokeRect(-6, -3.4, 12, 6.8);
      } else if (wheelsKey === 't1_gold') {
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2;
        ctx.strokeRect(-5.2, -2.6, 10.4, 5.2);
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(-2, -1.5, 4, 3);
      } else if (wheelsKey === 'blueenergy') {
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(-4.5, -2, 9, 4);
      } else if (wheelsKey === 'hellfire') {
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(-5, -2.2, 10, 4.4);
      }
      ctx.restore();
    }
  }

  // =========================================================
  // LAYER 3 (SLOT 2 + SLOT 1): MÀU SƠN & KHUNG THÂN XE
  // =========================================================
  let bodyFill: string | CanvasGradient = '#EF4444';
  if (paintKey === 'solid_red') {
    bodyFill = '#EF4444';
  } else if (paintKey === 'cobalt') {
    bodyFill = '#2563EB';
  } else if (paintKey === 'metallic') {
    const g = ctx.createLinearGradient(-22, -14, 22, 14);
    g.addColorStop(0, '#059669');
    g.addColorStop(0.5, '#6EE7B7');
    g.addColorStop(1, '#065F46');
    bodyFill = g;
  } else if (paintKey === 'sunset') {
    const g = ctx.createLinearGradient(-24, 0, 24, 0);
    g.addColorStop(0, '#EA580C');
    g.addColorStop(0.5, '#F97316');
    g.addColorStop(1, '#FACC15');
    bodyFill = g;
  } else if (paintKey === 'carbon') {
    bodyFill = '#1F2937';
  } else if (paintKey === 'titanium') {
    const g = ctx.createLinearGradient(-22, -14, 22, 14);
    g.addColorStop(0, '#475569');
    g.addColorStop(0.5, '#E2E8F0');
    g.addColorStop(1, '#334155');
    bodyFill = g;
  } else if (paintKey === 'gradient') {
    const g = ctx.createLinearGradient(-24, 0, 24, 0);
    g.addColorStop(0, '#16A34A');
    g.addColorStop(1, '#F59E0B');
    bodyFill = g;
  } else if (paintKey === 'amethyst') {
    const g = ctx.createLinearGradient(-24, -12, 24, 12);
    g.addColorStop(0, '#581C87');
    g.addColorStop(0.55, '#A855F7');
    g.addColorStop(1, '#EC4899');
    bodyFill = g;
  } else if (paintKey === 'gold24k') {
    const g = ctx.createLinearGradient(-24, -14, 24, 14);
    g.addColorStop(0, '#CA8A04');
    g.addColorStop(0.45, '#FEF08A');
    g.addColorStop(0.55, '#FACC15');
    g.addColorStop(1, '#A16207');
    bodyFill = g;
  } else if (paintKey === 'project_neon') {
    const g = ctx.createLinearGradient(-25, -14, 25, 14);
    g.addColorStop(0, '#0F172A');
    g.addColorStop(0.45, '#6D28D9');
    g.addColorStop(0.8, '#EC4899');
    g.addColorStop(1, '#06B6D4');
    bodyFill = g;
  } else if (paintKey === 'pool_aqua') {
    const g = ctx.createLinearGradient(-25, -12, 25, 12);
    g.addColorStop(0, '#0284C7');
    g.addColorStop(0.5, '#38BDF8');
    g.addColorStop(0.85, '#FDE047');
    g.addColorStop(1, '#FB7185');
    bodyFill = g;
  } else if (paintKey === 't1_royal') {
    const g = ctx.createLinearGradient(-25, -14, 25, 14);
    g.addColorStop(0, '#7F1D1D');
    g.addColorStop(0.45, '#E11D48');
    g.addColorStop(0.78, '#F8FAFC');
    g.addColorStop(1, '#FACC15');
    bodyFill = g;
  } else if (paintKey === 'chroma') {
    const hue = Math.floor((nowSec * 120) % 360);
    bodyFill = `hsl(${hue}, 90%, 55%)`;
  } else if (paintKey === 'radioactive') {
    bodyFill = '#84CC16';
  }

  ctx.fillStyle = bodyFill;
  ctx.strokeStyle =
    paintKey === 'radioactive'
      ? '#ECFCCB'
      : paintKey === 'gold24k' || paintKey === 't1_royal'
      ? '#FEF08A'
      : paintKey === 'project_neon'
      ? '#06B6D4'
      : paintKey === 'pool_aqua'
      ? '#FDE047'
      : paintKey === 'amethyst'
      ? '#F472B6'
      : '#0F172A';
  ctx.lineWidth = 2;

  // Draw Chassis Silhouette
  ctx.beginPath();
  if (chassisKey === 'kart') {
    ctx.roundRect(-21, -11, 42, 22, 6);
  } else if (chassisKey === 'buggy') {
    // Off-road desert buggy with tapered roll-cage nose
    ctx.moveTo(-22, -12);
    ctx.lineTo(4, -12);
    ctx.lineTo(23, -7);
    ctx.lineTo(23, 7);
    ctx.lineTo(4, 12);
    ctx.lineTo(-22, 12);
    ctx.closePath();
  } else if (chassisKey === 'coupe') {
    ctx.moveTo(-23, -12);
    ctx.lineTo(14, -12);
    ctx.quadraticCurveTo(25, -10, 25, 0);
    ctx.quadraticCurveTo(25, 10, 14, 12);
    ctx.lineTo(-23, 12);
    ctx.closePath();
  } else if (chassisKey === 'roadster') {
    // Curvy open-top roadster
    ctx.moveTo(-23, -10);
    ctx.quadraticCurveTo(-5, -14, 16, -11);
    ctx.quadraticCurveTo(26, -7, 26, 0);
    ctx.quadraticCurveTo(26, 7, 16, 11);
    ctx.quadraticCurveTo(-5, 14, -23, 10);
    ctx.closePath();
  } else if (chassisKey === 'f1') {
    // Sleek open-wheel F1 arrow body
    ctx.moveTo(-24, -6);
    ctx.lineTo(-6, -10);
    ctx.lineTo(10, -6);
    ctx.lineTo(27, -2);
    ctx.lineTo(27, 2);
    ctx.lineTo(10, 6);
    ctx.lineTo(-6, 10);
    ctx.lineTo(-24, 6);
    ctx.closePath();
  } else if (chassisKey === 'muscle') {
    // Wide American Muscle car with squared hood
    ctx.roundRect(-24, -13, 49, 26, 4);
  } else if (chassisKey === 'armored') {
    // Heavy angular military hull
    ctx.moveTo(-24, -14);
    ctx.lineTo(16, -14);
    ctx.lineTo(25, -8);
    ctx.lineTo(25, 8);
    ctx.lineTo(16, 14);
    ctx.lineTo(-24, 14);
    ctx.closePath();
  } else if (chassisKey === 'hypergt') {
    // Aero GT Supercar with sculpted side intakes
    ctx.moveTo(-25, -12);
    ctx.lineTo(-8, -14);
    ctx.lineTo(2, -10);
    ctx.lineTo(16, -12);
    ctx.lineTo(27, -4);
    ctx.lineTo(27, 4);
    ctx.lineTo(16, 12);
    ctx.lineTo(2, 10);
    ctx.lineTo(-8, 14);
    ctx.lineTo(-25, 12);
    ctx.closePath();
  } else if (chassisKey === 'project_cyber') {
    // SIÊU PHẨM: Cyber-Vayne angular stealth interceptor
    ctx.moveTo(-25, -9);
    ctx.lineTo(-8, -14);
    ctx.lineTo(15, -11);
    ctx.lineTo(28, -3);
    ctx.lineTo(23, 0);
    ctx.lineTo(28, 3);
    ctx.lineTo(15, 11);
    ctx.lineTo(-8, 14);
    ctx.lineTo(-25, 9);
    ctx.closePath();
  } else if (chassisKey === 'pool_shark') {
    // Pool Party Hydro-Shark Surf Cruiser with side fins
    ctx.moveTo(-24, -10);
    ctx.lineTo(-4, -12);
    ctx.lineTo(-1, -17); // Left shark fin
    ctx.lineTo(7, -12);
    ctx.quadraticCurveTo(26, -9, 28, 0);
    ctx.quadraticCurveTo(26, 9, 7, 12);
    ctx.lineTo(-1, 17); // Right shark fin
    ctx.lineTo(-4, 12);
    ctx.lineTo(-24, 10);
    ctx.closePath();
  } else if (chassisKey === 't1_champion') {
    // T1 Worlds Demon King Hypercar with Royal Crown Twin-Prong Nose
    ctx.moveTo(-25, -12);
    ctx.lineTo(-5, -14);
    ctx.lineTo(14, -12);
    ctx.lineTo(28, -6);
    ctx.lineTo(22, -2);
    ctx.lineTo(29, 0); // Center Demon King crown spear
    ctx.lineTo(22, 2);
    ctx.lineTo(28, 6);
    ctx.lineTo(14, 12);
    ctx.lineTo(-5, 14);
    ctx.lineTo(-25, 12);
    ctx.closePath();
  } else if (chassisKey === 'biopod') {
    // Organic teardrop bio-cruiser
    ctx.ellipse(0, 0, 25, 13, 0, 0, Math.PI * 2);
  } else if (chassisKey === 'ufo') {
    // Circular hovering UFO saucer
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
  } else if (chassisKey === 'dragon') {
    // Cyber Dragon hypercar with fierce nose prongs
    ctx.moveTo(-25, -12);
    ctx.lineTo(8, -13);
    ctx.lineTo(28, -6);
    ctx.lineTo(21, 0);
    ctx.lineTo(28, 6);
    ctx.lineTo(8, 13);
    ctx.lineTo(-25, 12);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();

  // =========================================================
  // LAYER 4 (SLOT 3): HỌA TIẾT THÂN XE (DECAL)
  // =========================================================
  if (decalKey === 'number88') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(12, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 7px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('88', 12, 0.5);
  } else if (decalKey === 'stripes') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(-19, -4.5, 38, 2.5);
    ctx.fillRect(-19, 2, 38, 2.5);
  } else if (decalKey === 'checkered') {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#0F172A';
      ctx.fillRect(-16 + i * 5.5, -10, 5.5, 3.5);
      ctx.fillStyle = i % 2 === 1 ? '#FFFFFF' : '#0F172A';
      ctx.fillRect(-16 + i * 5.5, 6.5, 5.5, 3.5);
    }
  } else if (decalKey === 'flames') {
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(4, -9);
    ctx.lineTo(8, -3);
    ctx.lineTo(-8, -6);
    ctx.lineTo(0, 0);
    ctx.lineTo(-8, 6);
    ctx.lineTo(8, 3);
    ctx.lineTo(4, 9);
    ctx.closePath();
    ctx.fill();
  } else if (decalKey === 'camo') {
    ctx.fillStyle = 'rgba(20, 83, 45, 0.75)';
    ctx.beginPath();
    ctx.arc(-12, -5, 5, 0, Math.PI * 2);
    ctx.arc(10, 6, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(163, 230, 53, 0.65)';
    ctx.beginPath();
    ctx.arc(-10, 6, 4.2, 0, Math.PI * 2);
    ctx.arc(13, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (decalKey === 'lightning') {
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(16, -6);
    ctx.lineTo(2, -1);
    ctx.lineTo(6, 3);
    ctx.lineTo(-14, 7);
    ctx.stroke();
  } else if (decalKey === 'sharkteeth') {
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 4; i++) {
      const tx = 8 + i * 3.5;
      ctx.beginPath();
      ctx.moveTo(tx, -9);
      ctx.lineTo(tx + 2, -4);
      ctx.lineTo(tx + 3.5, -9);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(tx, 9);
      ctx.lineTo(tx + 2, 4);
      ctx.lineTo(tx + 3.5, 9);
      ctx.closePath();
      ctx.fill();
    }
  } else if (decalKey === 'project_crest') {
    // Glowing Neon Triangle & Circuit Lines (SIÊU PHẨM: PROJECT)
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(7, -7);
    ctx.lineTo(7, 7);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = '#EC4899';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-18, -6);
    ctx.lineTo(-6, -6);
    ctx.moveTo(-18, 6);
    ctx.lineTo(-6, 6);
    ctx.stroke();
  } else if (decalKey === 'pool_tropical') {
    // Pool Party Surf Stripe & Hibiscus Starfish
    ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
    ctx.fillRect(-18, -2, 34, 4);
    drawMiniStar(ctx, 13, 0, 5.5, 2.5, '#FB7185');
  } else if (decalKey === 't1_crest') {
    // T1 Winged Crest & Golden Championship Stripes
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(16, -8);
    ctx.moveTo(6, 0);
    ctx.lineTo(16, 8);
    ctx.moveTo(10, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
    drawMiniStar(ctx, 14, 0, 4.5, 2, '#FACC15');
  } else if (decalKey === 'cells') {
    ctx.strokeStyle = 'rgba(163, 230, 53, 0.9)';
    ctx.lineWidth = 1.4;
    for (const cx of [-10, 0, 10]) {
      ctx.beginPath();
      ctx.arc(cx, 0, 5.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (decalKey === 'dna') {
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let dx = -16; dx <= 16; dx += 4) {
      const dy = Math.sin(dx * 0.35 + nowSec * 8) * 6;
      if (dx === -16) ctx.moveTo(dx, dy);
      else ctx.lineTo(dx, dy);
    }
    ctx.stroke();
    ctx.strokeStyle = '#F43F5E';
    ctx.beginPath();
    for (let dx = -16; dx <= 16; dx += 4) {
      const dy = -Math.sin(dx * 0.35 + nowSec * 8) * 6;
      if (dx === -16) ctx.moveTo(dx, dy);
      else ctx.lineTo(dx, dy);
    }
    ctx.stroke();
  }

  // Windshield / Cockpit dome
  ctx.fillStyle =
    chassisKey === 'project_cyber'
      ? 'rgba(236, 72, 153, 0.88)'
      : chassisKey === 'pool_shark'
      ? 'rgba(14, 165, 233, 0.85)'
      : chassisKey === 't1_champion'
      ? 'rgba(250, 204, 21, 0.88)'
      : chassisKey === 'biopod' || chassisKey === 'ufo'
      ? 'rgba(56, 189, 248, 0.75)'
      : 'rgba(15, 23, 42, 0.82)';
  ctx.beginPath();
  if (chassisKey === 'ufo') {
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
  } else if (chassisKey === 'project_cyber') {
    // V-shaped Holographic PROJECT Visor
    ctx.moveTo(10, 0);
    ctx.lineTo(-4, -8);
    ctx.lineTo(-8, -5);
    ctx.lineTo(2, 0);
    ctx.lineTo(-8, 5);
    ctx.lineTo(-4, 8);
    ctx.closePath();
  } else {
    ctx.roundRect(-6, -7, 14, 14, 4);
  }
  ctx.fill();

  // =========================================================
  // LAYER 5 (SLOT 5): CÁNH GIÓ & NÓC XE (SPOILER / ROOF)
  // =========================================================
  if (spoilerKey === 'antenna') {
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.lineTo(-27, -14);
    ctx.stroke();
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(-27, -14, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (spoilerKey === 'mini') {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-23, -10, 4, 20);
  } else if (spoilerKey === 'gtwing') {
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-21, -13);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-21, 13);
    ctx.lineTo(-17, 13);
    ctx.lineTo(-21, 0);
    ctx.lineTo(-17, -13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (spoilerKey === 'f1carbon') {
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.2;
    ctx.fillRect(-26, -14, 6, 28);
    ctx.strokeRect(-26, -14, 6, 28);
  } else if (spoilerKey === 'roofscoop') {
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.4;
    ctx.fillRect(-4, -4.5, 9, 9);
    ctx.strokeRect(-4, -4.5, 9, 9);
  } else if (spoilerKey === 'police') {
    const isRedPhase = Math.floor(nowSec * 10) % 2 === 0;
    ctx.fillStyle = isRedPhase ? '#EF4444' : '#3B82F6';
    ctx.fillRect(-3, -9, 5, 8.5);
    ctx.fillStyle = isRedPhase ? '#3B82F6' : '#EF4444';
    ctx.fillRect(-3, 0.5, 5, 8.5);
  } else if (spoilerKey === 'lasercannon') {
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-1, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(2, -1.8, 10, 3.6);
  } else if (spoilerKey === 'project_wings') {
    // Dual Cyber-Katana Laser Wings (SIÊU PHẨM: PROJECT)
    ctx.fillStyle = 'rgba(236, 72, 153, 0.85)';
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, -11);
    ctx.lineTo(-24, -24);
    ctx.lineTo(-16, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-6, 11);
    ctx.lineTo(-24, 24);
    ctx.lineTo(-16, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (spoilerKey === 'pool_blaster') {
    // Twin Super-Soaker Water Blasters (Pool Party)
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 1.4;
    ctx.fillRect(-26, -11, 10, 5.5);
    ctx.strokeRect(-26, -11, 10, 5.5);
    ctx.fillRect(-26, 5.5, 10, 5.5);
    ctx.strokeRect(-26, 5.5, 10, 5.5);
    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.arc(-27, -8.2, 2.8, 0, Math.PI * 2);
    ctx.arc(-27, 8.2, 2.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (spoilerKey === 't1_wings') {
    // T1 Worlds Demon King Golden & Crimson Feathered Wings
    ctx.fillStyle = '#E11D48';
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-5, -11);
    ctx.lineTo(-22, -25);
    ctx.lineTo(-14, -16);
    ctx.lineTo(-25, -16);
    ctx.lineTo(-12, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-5, 11);
    ctx.lineTo(-22, 25);
    ctx.lineTo(-14, 16);
    ctx.lineTo(-25, 16);
    ctx.lineTo(-12, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (spoilerKey === 'twinjet') {
    ctx.fillStyle = '#475569';
    ctx.fillRect(-26, -10, 8, 6);
    ctx.fillRect(-26, 4, 8, 6);
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(-27, -7, 3, 0, Math.PI * 2);
    ctx.arc(-27, 7, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (spoilerKey === 'biowings') {
    ctx.fillStyle = 'rgba(74, 222, 128, 0.75)';
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 1.5;
    // Left & right glowing bio-energy wings
    ctx.beginPath();
    ctx.moveTo(-4, -11);
    ctx.lineTo(-18, -24);
    ctx.lineTo(-10, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-4, 11);
    ctx.lineTo(-18, 24);
    ctx.lineTo(-10, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Headlight bulbs: only lit at night (showHeadlightBeams === true); unlit glass lens during daytime
  if (showHeadlightBeams) {
    ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
    ctx.fillRect(21, -9, 3, 4);
    ctx.fillRect(21, 5, 3, 4);
  } else {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.fillRect(21, -9, 2.5, 4);
    ctx.fillRect(21, 5, 2.5, 4);
  }

  ctx.restore(); // End rotated car coordinates

  // Player / Bot Nameplate above car (Requirement #3: Compact, smaller font size)
  if (username) {
    ctx.save();
    ctx.font = isPlayer
      ? '700 9.5px "Plus Jakarta Sans", sans-serif'
      : '600 8.5px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const teamColors: Record<number, string> = {
      1: '#EF4444',
      2: '#3B82F6',
      3: '#FACC15',
      4: '#A855F7',
    };
    const labelColor =
      teamId && teamColors[teamId]
        ? teamColors[teamId]
        : isPlayer
        ? '#F59E0B'
        : '#E2E8F0';

    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    const textWidth = ctx.measureText(username).width + 8;
    ctx.beginPath();
    ctx.roundRect(-textWidth / 2, -31, textWidth, 13, 3.5);
    ctx.fill();

    ctx.fillStyle = labelColor;
    ctx.fillText(username, 0, -21.5);
    ctx.restore();
  }

  ctx.restore();
}

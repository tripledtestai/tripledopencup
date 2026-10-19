import { isPointOnTrack } from './rules';
import {
  DeployedHazard,
  MapDefinition,
  TrackItemBox,
} from './types';

interface MountainItem {
  x: number;
  y: number;
  radius: number;
}

interface HouseItem {
  x: number;
  y: number;
  angle: number;
  roofColor: string;
  scale: number;
}

interface TreeItem {
  x: number;
  y: number;
  radius: number;
  style: 'emerald' | 'sakura' | 'pine' | 'gold';
}

interface PrecomputedMapScenery {
  mapId: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  mountains: MountainItem[];
  houses: HouseItem[];
  trees: TreeItem[];
}

const sceneryCache = new Map<string, PrecomputedMapScenery>();

// Deterministic pseudo-random generator for scenery placement
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function drawMountain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  theme: MapDefinition['theme']
) {
  ctx.save();
  ctx.translate(x, y);

  const baseColor =
    theme === 'cryo'
      ? '#334155'
      : theme === 'aorta'
      ? '#4C1D95'
      : theme === 'swamp'
      ? '#365314'
      : '#1E293B';
  const ridgeColor =
    theme === 'cryo'
      ? '#64748B'
      : theme === 'aorta'
      ? '#6D28D9'
      : theme === 'swamp'
      ? '#4D7C0F'
      : '#334155';
  const snowColor =
    theme === 'cryo'
      ? '#E0F2FE'
      : theme === 'aorta'
      ? '#FDA4AF'
      : '#F1F5F9';

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(8, 12, radius * 1.05, radius * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outer polygonal mountain base
  const sides = 8;
  ctx.fillStyle = baseColor;
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const r = radius * (i % 2 === 0 ? 1.0 : 0.84);
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Middle ridge
  ctx.fillStyle = ridgeColor;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + 0.25;
    const r = radius * (i % 2 === 0 ? 0.68 : 0.54);
    const px = Math.cos(a) * r - 4;
    const py = Math.sin(a) * r - 4;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Snow / Crystal Peak
  ctx.fillStyle = snowColor;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = radius * (i % 2 === 0 ? 0.34 : 0.22);
    const px = Math.cos(a) * r - 6;
    const py = Math.sin(a) * r - 6;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawHouse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  roofColor: string,
  scale: number = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(-30, -20, 68, 50);

  // Building base / walls
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-32, -24, 64, 48, 5);
  ctx.fill();
  ctx.stroke();

  // Pitched Roof (Left & Right slopes)
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.roundRect(-36, -28, 72, 56, 6);
  ctx.fill();
  ctx.stroke();

  // Roof ridge highlight
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(-34, -26, 68, 22);

  // Roof center line
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-34, 0);
  ctx.lineTo(34, 0);
  ctx.stroke();

  // Glowing windows on front porch
  ctx.fillStyle = '#FDE047';
  ctx.fillRect(-22, 20, 12, 6);
  ctx.fillRect(10, 20, 12, 6);

  ctx.restore();
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: 'emerald' | 'sakura' | 'pine' | 'gold'
) {
  ctx.save();
  ctx.translate(x, y);

  // Tree shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.arc(5, 6, radius, 0, Math.PI * 2);
  ctx.fill();

  const colors = {
    emerald: ['#15803D', '#22C55E', '#86EFAC'],
    sakura: ['#BE185D', '#F472B6', '#FBCFE8'],
    pine: ['#065F46', '#10B981', '#6EE7B7'],
    gold: ['#B45309', '#F59E0B', '#FEF08A'],
  }[style];

  // Outer canopy
  ctx.fillStyle = colors[0];
  ctx.strokeStyle = '#052E16';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Mid foliage clusters
  ctx.fillStyle = colors[1];
  ctx.beginPath();
  ctx.arc(-radius * 0.22, -radius * 0.2, radius * 0.58, 0, Math.PI * 2);
  ctx.arc(radius * 0.26, radius * 0.14, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Top highlight
  ctx.fillStyle = colors[2];
  ctx.beginPath();
  ctx.arc(-radius * 0.25, -radius * 0.25, radius * 0.26, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function getPrecomputedScenery(map: MapDefinition): PrecomputedMapScenery {
  const existing = sceneryCache.get(map.id);
  if (existing) return existing;

  let wpMinX = Infinity;
  let wpMaxX = -Infinity;
  let wpMinY = Infinity;
  let wpMaxY = -Infinity;
  for (const pt of map.waypoints) {
    if (pt.x < wpMinX) wpMinX = pt.x;
    if (pt.x > wpMaxX) wpMaxX = pt.x;
    if (pt.y < wpMinY) wpMinY = pt.y;
    if (pt.y > wpMaxY) wpMaxY = pt.y;
  }

  const margin = 1200;
  const minX = Math.floor(wpMinX - margin);
  const maxX = Math.ceil(wpMaxX + margin);
  const minY = Math.floor(wpMinY - margin);
  const maxY = Math.ceil(wpMaxY + margin);

  const isSafeForScenery = (px: number, py: number, clearance: number) => {
    const check = isPointOnTrack({ x: px, y: py }, map);
    return check.minDistance > map.roadWidth * 0.5 + clearance;
  };

  let seed = 0;
  for (let i = 0; i < map.id.length; i++) {
    seed += map.id.charCodeAt(i) * (i + 17);
  }
  const rng = seededRandom(seed);

  const mountains: MountainItem[] = [];
  const houses: HouseItem[] = [];
  const trees: TreeItem[] = [];

  // 1. Trackside Mountains along all segments
  for (let i = 0; i < map.waypoints.length; i++) {
    const wp = map.waypoints[i];
    const next = map.waypoints[(i + 1) % map.waypoints.length];
    const segAngle = Math.atan2(next.y - wp.y, next.x - wp.x);
    const normal = segAngle + Math.PI / 2;
    for (const side of [-1, 1]) {
      const dist = map.roadWidth * 0.5 + 210 + rng() * 90;
      const mx = (wp.x + next.x) * 0.5 + Math.cos(normal) * side * dist;
      const my = (wp.y + next.y) * 0.5 + Math.sin(normal) * side * dist;
      const mRadius = 68 + rng() * 48;
      if (isSafeForScenery(mx, my, mRadius + 30)) {
        mountains.push({ x: mx, y: my, radius: mRadius });
      }
    }
  }

  // Scattered distant mountains across the full map bounds
  for (let i = 0; i < 45; i++) {
    const mx = (wpMinX - 650) + rng() * (wpMaxX - wpMinX + 1300);
    const my = (wpMinY - 650) + rng() * (wpMaxY - wpMinY + 1300);
    const mRadius = 75 + rng() * 65;
    if (isSafeForScenery(mx, my, mRadius + 45)) {
      mountains.push({ x: mx, y: my, radius: mRadius });
    }
  }

  // 2. Trackside Houses & Lush Trees along every segment
  const roofPalette = ['#DC2626', '#2563EB', '#D97706', '#059669', '#7C3AED'];
  const treeStyles: ('emerald' | 'sakura' | 'pine' | 'gold')[] = [
    'emerald',
    'pine',
    'sakura',
    'gold',
  ];

  const pts = map.waypoints;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLen = Math.hypot(dx, dy);
    const segAngle = Math.atan2(dy, dx);
    const normal = segAngle + Math.PI / 2;

    const houseSteps = Math.max(1, Math.floor(segLen / 220));
    for (let s = 0; s < houseSteps; s++) {
      const t = (s + 0.35) / houseSteps;
      const basePx = a.x + dx * t;
      const basePy = a.y + dy * t;
      for (const side of [-1, 1]) {
        if (rng() < 0.65) {
          const offset = map.roadWidth * 0.5 + 75 + rng() * 55;
          const hx = basePx + Math.cos(normal) * side * offset;
          const hy = basePy + Math.sin(normal) * side * offset;
          if (isSafeForScenery(hx, hy, 52)) {
            const roofColor =
              roofPalette[Math.floor(rng() * roofPalette.length)];
            const houseAngle = segAngle + (side === 1 ? Math.PI : 0);
            houses.push({
              x: hx,
              y: hy,
              angle: houseAngle,
              roofColor,
              scale: 0.9 + rng() * 0.25,
            });
          }
        }
      }
    }

    const treeSteps = Math.max(2, Math.floor(segLen / 95));
    for (let s = 0; s < treeSteps; s++) {
      const t = (s + 0.15 + rng() * 0.5) / treeSteps;
      const basePx = a.x + dx * t;
      const basePy = a.y + dy * t;
      for (const side of [-1, 1]) {
        const offset = map.roadWidth * 0.5 + 42 + rng() * 115;
        const tx = basePx + Math.cos(normal) * side * offset;
        const ty = basePy + Math.sin(normal) * side * offset;
        const tr = 18 + rng() * 14;
        if (isSafeForScenery(tx, ty, tr + 18)) {
          const style = treeStyles[Math.floor(rng() * treeStyles.length)];
          trees.push({ x: tx, y: ty, radius: tr, style });
        }
      }
    }
  }

  // Scattered forest trees across the full map bounds
  for (let i = 0; i < 150; i++) {
    const tx = (wpMinX - 550) + rng() * (wpMaxX - wpMinX + 1100);
    const ty = (wpMinY - 550) + rng() * (wpMaxY - wpMinY + 1100);
    const tr = 18 + rng() * 18;
    if (isSafeForScenery(tx, ty, tr + 24)) {
      const style = treeStyles[Math.floor(rng() * treeStyles.length)];
      trees.push({ x: tx, y: ty, radius: tr, style });
    }
  }

  const built: PrecomputedMapScenery = {
    mapId: map.id,
    minX,
    maxX,
    minY,
    maxY,
    mountains,
    houses,
    trees,
  };
  sceneryCache.set(map.id, built);
  return built;
}

/**
 * Renders the complete 2D race track across the entire world coordinate space
 * without any offscreen canvas clipping.
 */
export function drawRaceTrack(
  ctx: CanvasRenderingContext2D,
  map: MapDefinition,
  itemBoxes: TrackItemBox[],
  hazards: DeployedHazard[],
  nowSec: number
): void {
  const scenery = getPrecomputedScenery(map);
  const { minX, maxX, minY, maxY } = scenery;

  ctx.save();

  // 1. Rich Background Terrain & Grid covering the entire world bounds
  ctx.fillStyle = map.bgColor;
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let gx = minX; gx <= maxX; gx += 120) {
    ctx.moveTo(gx, minY);
    ctx.lineTo(gx, maxY);
  }
  for (let gy = minY; gy <= maxY; gy += 120) {
    ctx.moveTo(minX, gy);
    ctx.lineTo(maxX, gy);
  }
  ctx.stroke();

  // 2. Distant & Trackside Mountains
  for (const m of scenery.mountains) {
    drawMountain(ctx, m.x, m.y, m.radius, map.theme);
  }

  // 3. Track Roadway & Shortcut
  const pts = map.waypoints;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Shortcut Path
  if (map.shortcut && map.shortcut.path.length >= 2) {
    const sc = map.shortcut.path;
    ctx.strokeStyle = map.kerbColors[1];
    ctx.lineWidth = map.roadWidth * 0.56;
    ctx.beginPath();
    ctx.moveTo(sc[0].x, sc[0].y);
    for (let i = 1; i < sc.length; i++) {
      ctx.lineTo(sc[i].x, sc[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = map.roadColor;
    ctx.lineWidth = map.roadWidth * 0.48;
    ctx.stroke();

    ctx.save();
    ctx.setLineDash([18, 18]);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // Main Track Outer Border & Kerbs
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();

  ctx.strokeStyle = map.roadBorderColor;
  ctx.lineWidth = map.roadWidth + 28;
  ctx.stroke();

  ctx.save();
  ctx.setLineDash([28, 28]);
  ctx.strokeStyle = map.kerbColors[0];
  ctx.lineWidth = map.roadWidth + 22;
  ctx.stroke();
  ctx.lineDashOffset = 28;
  ctx.strokeStyle = map.kerbColors[1];
  ctx.stroke();
  ctx.restore();

  // Main Asphalt Surface
  ctx.strokeStyle = map.roadColor;
  ctx.lineWidth = map.roadWidth;
  ctx.stroke();

  // Center Dashed Line
  ctx.save();
  ctx.setLineDash([34, 34]);
  ctx.strokeStyle =
    map.theme === 'aorta'
      ? 'rgba(251, 113, 133, 0.5)'
      : map.theme === 'cryo'
      ? 'rgba(186, 230, 253, 0.6)'
      : 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Wooden Bridge Segment (if present)
  if (map.bridgeSegment) {
    const a = pts[map.bridgeSegment.startIdx];
    const b = pts[map.bridgeSegment.endIdx];
    if (a && b) {
      ctx.save();
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 340;
      ctx.beginPath();
      ctx.moveTo((a.x + b.x) / 2, a.y - 260);
      ctx.lineTo((a.x + b.x) / 2, b.y + 260);
      ctx.stroke();

      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = map.roadWidth * 0.68;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      ctx.strokeStyle = '#B45309';
      ctx.setLineDash([12, 8]);
      ctx.lineWidth = map.roadWidth * 0.62;
      ctx.stroke();
      ctx.restore();
    }
  }

  // Natural Mud Zones
  for (const mz of map.naturalMudZones) {
    ctx.save();
    ctx.fillStyle = 'rgba(69, 26, 3, 0.85)';
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(mz.x, mz.y, mz.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#92400E';
    ctx.beginPath();
    ctx.arc(mz.x - 18, mz.y - 12, mz.radius * 0.3, 0, Math.PI * 2);
    ctx.arc(mz.x + 22, mz.y + 15, mz.radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Start / Finish Line & Arch Banner
  const startPt = pts[0];
  const nextPt = pts[1];
  const startAngle = Math.atan2(nextPt.y - startPt.y, nextPt.x - startPt.x);

  ctx.save();
  ctx.translate(startPt.x, startPt.y);
  ctx.rotate(startAngle);

  const halfRoad = map.roadWidth * 0.48;
  const rows = 2;
  const cols = 12;
  const cellW = 14;
  const cellH = (halfRoad * 2) / cols;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#FFFFFF' : '#0F172A';
      ctx.fillRect(-cellW + r * cellW, -halfRoad + c * cellH, cellW, cellH);
    }
  }

  ctx.save();
  ctx.rotate(-Math.PI / 2);
  ctx.font = '900 20px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#F59E0B';
  ctx.textAlign = 'center';
  ctx.fillText('TRIPLE D OPEN CUP', 0, -26);
  ctx.restore();
  ctx.restore();

  // 4. Trackside Houses & Lush Trees
  for (const h of scenery.houses) {
    drawHouse(ctx, h.x, h.y, h.angle, h.roofColor, h.scale);
  }
  for (const t of scenery.trees) {
    drawTree(ctx, t.x, t.y, t.radius, t.style);
  }

  // 5. Tire Barriers
  for (const tb of map.tireBarriers) {
    ctx.save();
    ctx.translate(tb.x, tb.y);
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, tb.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(0, 0, tb.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 6. Dynamic Boost Zones (Animated Chevrons)
  for (const bz of map.boostZones) {
    ctx.save();
    ctx.translate(bz.x, bz.y);
    ctx.rotate(bz.angle);

    ctx.fillStyle =
      map.theme === 'aorta'
        ? 'rgba(244, 63, 94, 0.45)'
        : 'rgba(56, 189, 248, 0.38)';
    ctx.beginPath();
    ctx.roundRect(-bz.radius, -40, bz.radius * 2, 80, 12);
    ctx.fill();

    for (let c = -1; c <= 1; c++) {
      const shift = ((nowSec * 90) % 30) - 15;
      const cx = c * 32 + shift;
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - 12, -22);
      ctx.lineTo(cx + 10, 0);
      ctx.lineTo(cx - 12, 22);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 7. Dynamic Item Gift Boxes
  for (const box of itemBoxes) {
    if (!box.active) continue;
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.rotate(nowSec * 2.2);

    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-14, -14, 28, 28, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#EF4444';
    ctx.fillRect(-14, -3, 28, 6);
    ctx.fillRect(-3, -14, 6, 28);

    ctx.rotate(-nowSec * 2.2);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 15px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, 1);
    ctx.restore();
  }

  // 8. Active Deployed Hazards
  for (const hz of hazards) {
    ctx.save();
    ctx.translate(hz.x, hz.y);
    if (hz.type === 'banana') {
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#A16207';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0.2, Math.PI - 0.2);
      ctx.lineTo(0, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (hz.type === 'mud') {
      ctx.fillStyle = 'rgba(87, 39, 12, 0.9)';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (hz.type === 'rocket') {
      ctx.rotate(hz.angle);
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(-14, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

import { isPointOnTrack, isSynapseGateClosed } from './rules';
import {
  DeployedHazard,
  MapDefinition,
  Point2D,
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
  style: 'emerald' | 'sakura' | 'pine' | 'gold' | 'thylakoid' | 'neuron';
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

interface BakedTile {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
}

interface BakedTrackLayer {
  tiles: BakedTile[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  worldW: number;
  worldH: number;
}

const sceneryCache = new Map<string, PrecomputedMapScenery>();
const bakedTrackCache = new Map<string, BakedTrackLayer>();

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
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  theme: MapDefinition['theme']
) {
  ctx.save();
  ctx.translate(x, y);

  const baseColor =
    theme === 'cryo'
      ? '#1E293B'
      : theme === 'aorta' || theme === 'gastric' || theme === 'macrophage'
      ? '#2D0B28'
      : theme === 'synapse' || theme === 'polypeptide' || theme === 'cochlea'
      ? '#1A103C'
      : theme === 'chloroplast' || theme === 'ribosome' || theme === 'unknown_cell'
      ? '#043927'
      : '#0F172A';
  const ridgeColor =
    theme === 'cryo'
      ? '#334155'
      : theme === 'aorta' || theme === 'gastric' || theme === 'macrophage'
      ? '#4A0E2E'
      : theme === 'synapse' || theme === 'polypeptide' || theme === 'cochlea'
      ? '#2E1A68'
      : theme === 'chloroplast' || theme === 'ribosome' || theme === 'unknown_cell'
      ? '#065F46'
      : '#1E293B';
  const snowColor =
    theme === 'cryo'
      ? '#94A3B8'
      : theme === 'aorta' || theme === 'macrophage'
      ? '#F43F5E'
      : theme === 'gastric'
      ? '#84CC16'
      : theme === 'synapse' || theme === 'cochlea' || theme === 'unknown_cell'
      ? '#00F5D4'
      : theme === 'polypeptide'
      ? '#F472B6'
      : theme === 'chloroplast' || theme === 'ribosome'
      ? '#FACC15'
      : '#64748B';

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

  // Peak highlight
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
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
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

  // Pitched Roof
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
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: TreeItem['style']
) {
  ctx.save();
  ctx.translate(x, y);

  if (style === 'thylakoid') {
    // Golden-glowing Thylakoid Granum Stacks
    ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.45, 0, Math.PI * 2);
    ctx.fill();

    for (let disk = 2; disk >= 0; disk--) {
      const offsetY = -disk * 5;
      const diskRad = radius * (1 - disk * 0.14);
      ctx.fillStyle = disk === 2 ? '#10B981' : '#059669';
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, offsetY, diskRad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(0, -10, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (style === 'neuron') {
    // Glowing Neural Soma / Ganglion Node
    ctx.fillStyle = 'rgba(0, 245, 212, 0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00F5D4';
    ctx.lineWidth = 2;
    for (let d = 0; d < 5; d++) {
      const a = (d / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * radius * 1.4, Math.sin(a) * radius * 1.4);
      ctx.stroke();
    }

    ctx.fillStyle = '#1E1B4B';
    ctx.strokeStyle = '#00F5D4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00F5D4';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Standard Tree shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.arc(5, 6, radius, 0, Math.PI * 2);
  ctx.fill();

  const colors = {
    emerald: ['#052E16', '#14532D', '#166534'],
    sakura: ['#4C0519', '#881337', '#BE123C'],
    pine: ['#022C22', '#064E3B', '#065F46'],
    gold: ['#451A03', '#78350F', '#92400E'],
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
  if (map.secretBranches) {
    for (const br of map.secretBranches) {
      for (const pt of br.path) {
        if (pt.x < wpMinX) wpMinX = pt.x;
        if (pt.x > wpMaxX) wpMaxX = pt.x;
        if (pt.y < wpMinY) wpMinY = pt.y;
        if (pt.y > wpMaxY) wpMaxY = pt.y;
      }
    }
  }

  const margin = 1200;
  const minX = Math.floor(wpMinX - margin);
  const maxX = Math.ceil(wpMaxX + margin);
  const minY = Math.floor(wpMinY - margin);
  const maxY = Math.ceil(wpMaxY + margin);

  const isSafeForScenery = (px: number, py: number, clearance: number) => {
    const check = isPointOnTrack({ x: px, y: py }, map);
    return check.minDistance > check.roadHalfWidth + clearance;
  };

  let seed = 0;
  for (let i = 0; i < map.id.length; i++) {
    seed += map.id.charCodeAt(i) * (i + 17);
  }
  const rng = seededRandom(seed);

  const mountains: MountainItem[] = [];
  const houses: HouseItem[] = [];
  const trees: TreeItem[] = [];

  const segCount = map.isPointToPoint
    ? Math.max(0, map.waypoints.length - 1)
    : map.waypoints.length;

  // 1. Trackside Mountains along all segments
  for (let i = 0; i < segCount; i++) {
    const wp = map.waypoints[i];
    const next = map.waypoints[(i + 1) % map.waypoints.length];
    const segW = Math.max(wp.width ?? map.roadWidth, next.width ?? map.roadWidth);
    const segAngle = Math.atan2(next.y - wp.y, next.x - wp.x);
    const normal = segAngle + Math.PI / 2;
    for (const side of [-1, 1]) {
      const dist = segW * 0.5 + 340 + rng() * 120;
      const mx = (wp.x + next.x) * 0.5 + Math.cos(normal) * side * dist;
      const my = (wp.y + next.y) * 0.5 + Math.sin(normal) * side * dist;
      const mRadius = 68 + rng() * 48;
      if (isSafeForScenery(mx, my, 150)) {
        mountains.push({ x: mx, y: my, radius: mRadius });
      }
    }
  }

  for (let i = 0; i < 15; i++) {
    const mx = wpMinX - 650 + rng() * (wpMaxX - wpMinX + 1300);
    const my = wpMinY - 650 + rng() * (wpMaxY - wpMinY + 1300);
    const mRadius = 75 + rng() * 65;
    if (isSafeForScenery(mx, my, 150)) {
      mountains.push({ x: mx, y: my, radius: mRadius });
    }
  }

  // 2. Trackside Houses & Theme-Specific Flora/Organelles
  const roofPalette = ['#DC2626', '#2563EB', '#D97706', '#059669', '#7C3AED'];
  const defaultTreeStyles: TreeItem['style'][] = [
    'emerald',
    'pine',
    'sakura',
    'gold',
  ];

  const pickTreeStyle = (): TreeItem['style'] => {
    if (map.theme === 'chloroplast' || map.theme === 'ribosome') return 'thylakoid';
    if (
      map.theme === 'synapse' ||
      map.theme === 'polypeptide' ||
      map.theme === 'cochlea' ||
      map.theme === 'unknown_cell'
    ) {
      return 'neuron';
    }
    return defaultTreeStyles[Math.floor(rng() * defaultTreeStyles.length)];
  };

  const isCellularTheme =
    map.theme === 'synapse' ||
    map.theme === 'gastric' ||
    map.theme === 'polypeptide' ||
    map.theme === 'ribosome' ||
    map.theme === 'cochlea' ||
    map.theme === 'macrophage' ||
    map.theme === 'unknown_cell';

  const pts = map.waypoints;
  for (let i = 0; i < segCount; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const segW = Math.max(a.width ?? map.roadWidth, b.width ?? map.roadWidth);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLen = Math.hypot(dx, dy);
    const segAngle = Math.atan2(dy, dx);
    const normal = segAngle + Math.PI / 2;

    if (!isCellularTheme) {
      const houseSteps = Math.max(1, Math.floor(segLen / 240));
      for (let s = 0; s < houseSteps; s++) {
        const t = (s + 0.35) / houseSteps;
        const basePx = a.x + dx * t;
        const basePy = a.y + dy * t;
        for (const side of [-1, 1]) {
          if (rng() < 0.18) {
            const offset = segW * 0.5 + 160 + rng() * 70;
            const hx = basePx + Math.cos(normal) * side * offset;
            const hy = basePy + Math.sin(normal) * side * offset;
            if (isSafeForScenery(hx, hy, 150)) {
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
    }

    const treeSteps = Math.max(2, Math.floor(segLen / 140));
    for (let s = 0; s < treeSteps; s++) {
      const t = (s + 0.15 + rng() * 0.5) / treeSteps;
      const basePx = a.x + dx * t;
      const basePy = a.y + dy * t;
      for (const side of [-1, 1]) {
        const offset = segW * 0.5 + 145 + rng() * 130;
        const tx = basePx + Math.cos(normal) * side * offset;
        const ty = basePy + Math.sin(normal) * side * offset;
        const tr = 18 + rng() * 14;
        if (isSafeForScenery(tx, ty, 140)) {
          trees.push({ x: tx, y: ty, radius: tr, style: pickTreeStyle() });
        }
      }
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
 * Pre-renders static terrain & background scenery at 1:1 actual map dimensions
 * using 2048x2048 unscaled tiles (NEVER downscaling below 1.0x even on giant Map 9 & Map 10),
 * while road lines, kerbs, dashed markings, tire barriers, and runway numbers are rendered
 * at native High-DPI vector resolution.
 */
function getBakedStaticTrack(map: MapDefinition): BakedTrackLayer {
  const existing = bakedTrackCache.get(map.id);
  if (existing) return existing;

  // Evict oldest baked map tiles if cache has >= 2 maps to prevent ~200MB OffscreenCanvas VRAM accumulation across multiple races
  while (bakedTrackCache.size >= 2) {
    const oldestKey = bakedTrackCache.keys().next().value;
    if (!oldestKey) break;
    const oldLayer = bakedTrackCache.get(oldestKey);
    if (oldLayer) {
      for (const tile of oldLayer.tiles) {
        try {
          tile.canvas.width = 0;
          tile.canvas.height = 0;
        } catch {}
      }
    }
    bakedTrackCache.delete(oldestKey);
  }

  const scenery = getPrecomputedScenery(map);
  const { minX, maxX, minY, maxY } = scenery;
  const worldW = maxX - minX;
  const worldH = maxY - minY;

  const TILE_SIZE = 2048;
  const tiles: BakedTile[] = [];

  for (let ty = minY; ty < maxY; ty += TILE_SIZE) {
    for (let tx = minX; tx < maxX; tx += TILE_SIZE) {
      const tileW = Math.min(TILE_SIZE, maxX - tx);
      const tileH = Math.min(TILE_SIZE, maxY - ty);
      const pixelW = Math.max(1, Math.floor(tileW));
      const pixelH = Math.max(1, Math.floor(tileH));

      let offCanvas: OffscreenCanvas | HTMLCanvasElement;
      if (typeof OffscreenCanvas !== 'undefined') {
        offCanvas = new OffscreenCanvas(pixelW, pixelH);
      } else {
        const el = document.createElement('canvas');
        el.width = pixelW;
        el.height = pixelH;
        offCanvas = el;
      }

      const tCtx = offCanvas.getContext('2d') as
        | CanvasRenderingContext2D
        | OffscreenCanvasRenderingContext2D
        | null;

      if (tCtx) {
        tCtx.save();
        tCtx.imageSmoothingEnabled = false;
        tCtx.translate(-Math.floor(tx), -Math.floor(ty));

        // 1. Background Terrain & Crisp Grid at 1:1 actual map scale
        tCtx.fillStyle = map.bgColor;
        tCtx.fillRect(Math.floor(tx), Math.floor(ty), pixelW, pixelH);

        tCtx.strokeStyle =
          map.theme === 'synapse' || map.theme === 'cochlea' || map.theme === 'unknown_cell'
            ? 'rgba(0, 245, 212, 0.06)'
            : map.theme === 'polypeptide'
            ? 'rgba(244, 114, 182, 0.06)'
            : map.theme === 'chloroplast' || map.theme === 'ribosome'
            ? 'rgba(250, 204, 21, 0.05)'
            : map.theme === 'macrophage'
            ? 'rgba(251, 113, 133, 0.06)'
            : 'rgba(255, 255, 255, 0.04)';
        tCtx.lineWidth = 2;
        tCtx.beginPath();
        const startGx = minX + Math.floor((tx - minX) / 120) * 120;
        const startGy = minY + Math.floor((ty - minY) / 120) * 120;
        for (let gx = startGx; gx <= tx + tileW; gx += 120) {
          tCtx.moveTo(Math.floor(gx), Math.floor(ty));
          tCtx.lineTo(Math.floor(gx), Math.floor(ty + tileH));
        }
        for (let gy = startGy; gy <= ty + tileH; gy += 120) {
          tCtx.moveTo(Math.floor(tx), Math.floor(gy));
          tCtx.lineTo(Math.floor(tx + tileW), Math.floor(gy));
        }
        tCtx.stroke();

        // 2. Distant & Trackside Mountains intersecting this 1:1 tile
        for (const m of scenery.mountains) {
          if (
            m.x + m.radius * 1.3 >= tx &&
            m.x - m.radius * 1.3 <= tx + tileW &&
            m.y + m.radius * 1.3 >= ty &&
            m.y - m.radius * 1.3 <= ty + tileH
          ) {
            drawMountain(tCtx, Math.floor(m.x), Math.floor(m.y), m.radius, map.theme);
          }
        }

        tCtx.restore();
      }

      tiles.push({
        canvas: offCanvas,
        worldX: Math.floor(tx),
        worldY: Math.floor(ty),
        width: pixelW,
        height: pixelH,
      });
    }
  }

  const layer: BakedTrackLayer = {
    tiles,
    minX,
    minY,
    maxX,
    maxY,
    worldW,
    worldH,
  };
  bakedTrackCache.set(map.id, layer);
  return layer;
}

/**
 * Renders a crisp, standardized directional double-chevron (`❯❯`) on the road surface
 * at (x, y) aligned with the road curve tangent `angle`.
 */
function drawSingleRoadChevron(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  halfSpan: number,
  color: string,
  alpha: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = Math.max(3, Math.min(5, halfSpan * 0.22));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const len = Math.max(10, Math.min(18, halfSpan * 0.68));
  for (const offset of [-8, 8]) {
    ctx.beginPath();
    ctx.moveTo(offset - len * 0.6, -halfSpan);
    ctx.lineTo(offset + len * 0.5, 0);
    ctx.lineTo(offset - len * 0.6, halfSpan);
    ctx.stroke();
  }
  ctx.restore();
}

interface RibbonSample {
  x: number;
  y: number;
  tx: number;
  ty: number;
  nx: number;
  ny: number;
  halfWidth: number;
  elevation: number;
  rampDir: -1 | 0 | 1; // +1 = up-ramp (0->1), -1 = down-ramp (1->0), 0 = flat
  noGuardrail: boolean;
  surfaceType: string;
  segIndex: number;
  arcDist: number;
}

/**
 * Returns a single, uniform, clean dark racing asphalt color per map so the driving lane
 * is never cluttered with distracting multi-color patches, while keeping theme atmosphere
 * on the trackside scenery and borders.
 */
function getUniformRoadAsphaltColor(map: MapDefinition): string {
  switch (map.theme) {
    case 'city':
    case 'airport':
      return '#262C36';
    case 'aorta':
    case 'gastric':
    case 'macrophage':
      return '#331824';
    case 'swamp':
    case 'chloroplast':
      return '#1D2D27';
    case 'cryo':
    case 'dna':
    case 'cochlea':
    case 'unknown_cell':
      return '#182A3E';
    case 'synapse':
    case 'polypeptide':
    case 'ribosome':
    case 'bioworld':
    default:
      return '#1C2539';
  }
}

/**
 * Linearly interpolates two `#RRGGBB` hex colors by `t` in `[0, 1]`.
 */
function lerpHexColor(hexA: string, hexB: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0.001) return hexA;
  if (clamped >= 0.999) return hexB;
  const parse = (h: string) => {
    const clean = h.replace('#', '');
    const n = parseInt(clean, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(hexA);
  const [r2, g2, b2] = parse(hexB);
  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const b = Math.round(b1 + (b2 - b1) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Builds a C1-continuous filleted sample chain across the ENTIRE track (including ramp-to-bridge
 * and ground-to-ramp vertices) so that:
 * - Every corner is smoothly rounded with a Quadratic Bezier fillet.
 * - Up-ramps (`0 -> 1`), Overpass Bridges (`1 -> 1`), and Down-ramps (`1 -> 0`) share the exact
 *   same filleted centerline and continuous `elevation` in `[0, 1]`, eliminating any disconnect at joints.
 */
function buildFullTrackFilletedSamples(map: MapDefinition): RibbonSample[] {
  const pts = map.waypoints;
  const isClosedLoop = !map.isPointToPoint;
  const nSegs = isClosedLoop ? pts.length : Math.max(0, pts.length - 1);
  if (nSegs === 0) return [];

  const vCount = isClosedLoop ? nSegs : nSegs + 1;
  const getEffectiveHalfWidth = (
    ptIdx: number,
    segIdxForBottleneck?: number
  ): number => {
    const p = pts[ptIdx];
    let w = p.width ?? map.roadWidth;
    if (segIdxForBottleneck !== undefined && map.bottleneckSegments) {
      for (const bn of map.bottleneckSegments) {
        if (
          segIdxForBottleneck >= bn.startIdx &&
          segIdxForBottleneck <= bn.endIdx
        ) {
          w = map.roadWidth * 0.72;
          break;
        }
      }
    }
    return w * 0.5;
  };

  interface SegInfo {
    segIdx: number;
    aIdx: number;
    bIdx: number;
    ax: number;
    ay: number;
    bx: number;
    by: number;
    ux: number;
    uy: number;
    len: number;
    wA: number;
    wB: number;
    elevA: number;
    elevB: number;
    rampDir: -1 | 0 | 1;
    noGuardrail: boolean;
    surfaceType: string;
  }

  const segInfos: SegInfo[] = [];
  for (let k = 0; k < nSegs; k++) {
    const aIdx = k;
    const bIdx = (k + 1) % pts.length;
    const a = pts[aIdx];
    const b = pts[bIdx];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const elevA = a.elevation ?? 0;
    const elevB = b.elevation ?? 0;
    const rampDir: -1 | 0 | 1 =
      elevB > elevA ? 1 : elevB < elevA ? -1 : 0;
    segInfos.push({
      segIdx: k,
      aIdx,
      bIdx,
      ax: a.x,
      ay: a.y,
      bx: b.x,
      by: b.y,
      ux: dx / len,
      uy: dy / len,
      len,
      wA: getEffectiveHalfWidth(aIdx, k),
      wB: getEffectiveHalfWidth(bIdx, k),
      elevA,
      elevB,
      rampDir,
      noGuardrail: Boolean(a.noGuardrail && b.noGuardrail),
      surfaceType: a.surfaceType || 'asphalt',
    });
  }

  // Compute fillet trim distance at every interior vertex (including ramp transitions!)
  const trimAtVertex = new Array<number>(vCount).fill(0);
  for (let k = 0; k < vCount; k++) {
    const isInterior = isClosedLoop || (k > 0 && k < vCount - 1);
    if (!isInterior) continue;
    const prevSeg = segInfos[(k - 1 + nSegs) % nSegs];
    const nextSeg = segInfos[k % nSegs];
    const dot = prevSeg.ux * nextSeg.ux + prevSeg.uy * nextSeg.uy;
    if (dot > 0.995) {
      trimAtVertex[k] = 0;
      continue;
    }
    const avgHalfW = (prevSeg.wB + nextSeg.wA) * 0.5;
    const desiredTrim = Math.max(70, Math.min(180, avgHalfW * 0.8));
    trimAtVertex[k] = Math.min(
      desiredTrim,
      prevSeg.len * 0.34,
      nextSeg.len * 0.34
    );
  }

  const rawSamples: Omit<RibbonSample, 'arcDist'>[] = [];
  const pushSample = (s: Omit<RibbonSample, 'arcDist'>) => {
    if (rawSamples.length > 0) {
      const prev = rawSamples[rawSamples.length - 1];
      if (Math.hypot(s.x - prev.x, s.y - prev.y) < 1.5) return;
    }
    rawSamples.push(s);
  };

  for (let k = 0; k < nSegs; k++) {
    const seg = segInfos[k];
    const trimStart = trimAtVertex[k];
    const trimEnd = trimAtVertex[isClosedLoop ? (k + 1) % vCount : k + 1];

    // 1. Straight portion of segment k
    const sStart = trimStart;
    const sEnd = Math.max(sStart, seg.len - trimEnd);
    const straightLen = sEnd - sStart;
    const straightSteps = Math.max(4, Math.ceil(straightLen / 32));

    for (let st = 0; st <= straightSteps; st++) {
      const distAlongSeg = sStart + (straightLen * st) / straightSteps;
      const tSeg = distAlongSeg / seg.len;
      const px = seg.ax + seg.ux * distAlongSeg;
      const py = seg.ay + seg.uy * distAlongSeg;
      const hw = seg.wA + (seg.wB - seg.wA) * tSeg;
      // Smooth hermite-eased elevation along ramps so the slope transitions gently at both ends
      const smoothT = tSeg * tSeg * (3 - 2 * tSeg);
      const elev = seg.elevA + (seg.elevB - seg.elevA) * smoothT;
      pushSample({
        x: px,
        y: py,
        tx: seg.ux,
        ty: seg.uy,
        nx: -seg.uy,
        ny: seg.ux,
        halfWidth: hw,
        elevation: elev,
        rampDir: seg.rampDir,
        noGuardrail: seg.noGuardrail,
        surfaceType: seg.surfaceType,
        segIndex: seg.segIdx,
      });
    }

    // 2. Quadratic Bezier Corner Fillet at vertex k+1
    const nextVertexIdx = isClosedLoop ? (k + 1) % vCount : k + 1;
    const trimCorner = trimAtVertex[nextVertexIdx];
    if (trimCorner > 1) {
      const nextSeg = segInfos[(k + 1) % nSegs];
      const p0x = seg.bx - seg.ux * trimCorner;
      const p0y = seg.by - seg.uy * trimCorner;
      const p1x = seg.bx;
      const p1y = seg.by;
      const p2x = nextSeg.ax + nextSeg.ux * trimCorner;
      const p2y = nextSeg.ay + nextSeg.uy * trimCorner;

      const t0 = (seg.len - trimCorner) / seg.len;
      const t2 = trimCorner / nextSeg.len;
      const w0 = seg.wA + (seg.wB - seg.wA) * t0;
      const w2 = nextSeg.wA + (nextSeg.wB - nextSeg.wA) * t2;
      const s0 = t0 * t0 * (3 - 2 * t0);
      const s2 = t2 * t2 * (3 - 2 * t2);
      const e0 = seg.elevA + (seg.elevB - seg.elevA) * s0;
      const e2 = nextSeg.elevA + (nextSeg.elevB - nextSeg.elevA) * s2;

      const filletSteps = 12;
      for (let f = 1; f <= filletSteps; f++) {
        const t = f / filletSteps;
        const inv = 1 - t;
        const bx = inv * inv * p0x + 2 * inv * t * p1x + t * t * p2x;
        const by = inv * inv * p0y + 2 * inv * t * p1y + t * t * p2y;

        const dxdt = 2 * inv * (p1x - p0x) + 2 * t * (p2x - p1x);
        const dydt = 2 * inv * (p1y - p0y) + 2 * t * (p2y - p1y);
        const dLen = Math.max(1e-4, Math.hypot(dxdt, dydt));
        const tx = dxdt / dLen;
        const ty = dydt / dLen;

        pushSample({
          x: bx,
          y: by,
          tx,
          ty,
          nx: -ty,
          ny: tx,
          halfWidth: w0 + (w2 - w0) * t,
          elevation: e0 + (e2 - e0) * t,
          rampDir:
            t < 0.5
              ? seg.rampDir
              : nextSeg.rampDir,
          noGuardrail: t < 0.5 ? seg.noGuardrail : nextSeg.noGuardrail,
          surfaceType: t < 0.5 ? seg.surfaceType : nextSeg.surfaceType,
          segIndex: t < 0.5 ? seg.segIdx : nextSeg.segIdx,
        });
      }
    }
  }

  const samples: RibbonSample[] = [];
  let accDist = 0;
  for (let i = 0; i < rawSamples.length; i++) {
    if (i > 0) {
      accDist += Math.hypot(
        rawSamples[i].x - rawSamples[i - 1].x,
        rawSamples[i].y - rawSamples[i - 1].y
      );
    }
    samples.push({ ...rawSamples[i], arcDist: accDist });
  }
  return samples;
}

/**
 * Builds a filleted `RibbonSample[]` chain for an auxiliary path (Shortcut or Secret Branch)
 * so it can participate in the exact same 5-pass CSG Concentric Capsule Sweep as the main road,
 * creating 100% seamless Y-junctions without any border or kerb cutting across the entrance/exit.
 */
function buildAuxiliaryFilletedSamples(
  pts: Point2D[],
  halfWidth: number,
  surfaceType: string = 'asphalt'
): RibbonSample[] {
  if (pts.length < 2) return [];
  const nSegs = pts.length - 1;
  const segs: {
    ax: number;
    ay: number;
    bx: number;
    by: number;
    ux: number;
    uy: number;
    len: number;
  }[] = [];

  for (let i = 0; i < nSegs; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    segs.push({
      ax: a.x,
      ay: a.y,
      bx: b.x,
      by: b.y,
      ux: dx / len,
      uy: dy / len,
      len,
    });
  }

  const trim = new Array<number>(pts.length).fill(0);
  for (let k = 1; k < pts.length - 1; k++) {
    const prev = segs[k - 1];
    const next = segs[k];
    const dot = prev.ux * next.ux + prev.uy * next.uy;
    if (dot > 0.995) continue;
    trim[k] = Math.min(halfWidth * 0.75, prev.len * 0.34, next.len * 0.34);
  }

  const raw: Omit<RibbonSample, 'arcDist'>[] = [];
  const push = (s: Omit<RibbonSample, 'arcDist'>) => {
    if (raw.length > 0) {
      const p = raw[raw.length - 1];
      if (Math.hypot(s.x - p.x, s.y - p.y) < 1.5) return;
    }
    raw.push(s);
  };

  for (let k = 0; k < nSegs; k++) {
    const seg = segs[k];
    const sStart = trim[k];
    const sEnd = Math.max(sStart, seg.len - trim[k + 1]);
    const sLen = sEnd - sStart;
    const steps = Math.max(2, Math.ceil(sLen / 35));
    for (let st = 0; st <= steps; st++) {
      const d = sStart + (sLen * st) / steps;
      push({
        x: seg.ax + seg.ux * d,
        y: seg.ay + seg.uy * d,
        tx: seg.ux,
        ty: seg.uy,
        nx: -seg.uy,
        ny: seg.ux,
        halfWidth,
        elevation: 0,
        rampDir: 0,
        noGuardrail: false,
        surfaceType,
        segIndex: 0,
      });
    }
    const tc = trim[k + 1];
    if (tc > 1 && k + 1 < nSegs) {
      const next = segs[k + 1];
      const p0x = seg.bx - seg.ux * tc;
      const p0y = seg.by - seg.uy * tc;
      const p1x = seg.bx;
      const p1y = seg.by;
      const p2x = next.ax + next.ux * tc;
      const p2y = next.ay + next.uy * tc;
      for (let f = 1; f <= 8; f++) {
        const t = f / 8;
        const inv = 1 - t;
        const bx = inv * inv * p0x + 2 * inv * t * p1x + t * t * p2x;
        const by = inv * inv * p0y + 2 * inv * t * p1y + t * t * p2y;
        const dxdt = 2 * inv * (p1x - p0x) + 2 * t * (p2x - p1x);
        const dydt = 2 * inv * (p1y - p0y) + 2 * t * (p2y - p1y);
        const dLen = Math.max(1e-4, Math.hypot(dxdt, dydt));
        const tx = dxdt / dLen;
        const ty = dydt / dLen;
        push({
          x: bx,
          y: by,
          tx,
          ty,
          nx: -ty,
          ny: tx,
          halfWidth,
          elevation: 0,
          rampDir: 0,
          noGuardrail: false,
          surfaceType,
          segIndex: 0,
        });
      }
    }
  }

  const out: RibbonSample[] = [];
  let dist = 0;
  for (let i = 0; i < raw.length; i++) {
    if (i > 0) {
      dist += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
    }
    out.push({ ...raw[i], arcDist: dist });
  }
  return out;
}

/**
 * Extracts contiguous sub-chains from the full-track filleted samples that match `predicate`.
 */
function extractElevationSampleChains(
  fullSamples: RibbonSample[],
  isClosedTrack: boolean,
  predicate: (s: RibbonSample) => boolean
): { samples: RibbonSample[]; isClosedLoop: boolean }[] {
  if (fullSamples.length < 2) return [];
  const flags = fullSamples.map(predicate);
  if (flags.every(Boolean)) {
    return [{ samples: fullSamples, isClosedLoop: isClosedTrack }];
  }
  if (!flags.some(Boolean)) return [];

  const n = fullSamples.length;
  const chains: { samples: RibbonSample[]; isClosedLoop: boolean }[] = [];
  const visited = new Array<boolean>(n).fill(false);

  for (let i = 0; i < n; i++) {
    if (!flags[i] || visited[i]) continue;
    let start = i;
    if (isClosedTrack) {
      while (true) {
        const prev = (start - 1 + n) % n;
        if (flags[prev] && !visited[prev] && prev !== i) {
          start = prev;
        } else {
          break;
        }
      }
    }

    const sub: RibbonSample[] = [];
    let curr = start;
    while (flags[curr] && !visited[curr]) {
      visited[curr] = true;
      sub.push(fullSamples[curr]);
      const next = curr + 1;
      if (!isClosedTrack) {
        if (next >= n) break;
        curr = next;
      } else {
        curr = next % n;
      }
    }

    if (sub.length >= 2) {
      // Re-index cumulative arcDist for this sub-chain
      let d = 0;
      const normalized: RibbonSample[] = [];
      for (let k = 0; k < sub.length; k++) {
        if (k > 0) {
          d += Math.hypot(sub[k].x - sub[k - 1].x, sub[k].y - sub[k - 1].y);
        }
        normalized.push({ ...sub[k], arcDist: d });
      }
      chains.push({ samples: normalized, isClosedLoop: false });
    }
  }

  return chains;
}

/**
 * Sweeps a concentric ribbon along `samples` using a single constant `color` and `lineJoin = 'round'`
 * at all interior vertices.
 * - Uses `lineCap = 'butt'` on main-track chains and internal width transitions so NO circular arc
 *   ("vòng vòng cung") can EVER appear across the road or ramp!
 * - Inner corners (even 180° hairpin star tips on Map 11) never produce white lane-line spikes
 *   because Pass E (`uniformAsphalt`) completely erases the interior of Pass D (`#F1F5F9`).
 */
function sweepConcentricRibbon(
  ctx: CanvasRenderingContext2D,
  samples: RibbonSample[],
  isClosedLoop: boolean,
  radiusOffset: (s: RibbonSample) => number,
  color: string,
  options?: {
    dash?: number[];
    dashOffset?: number;
    endCap?: CanvasLineCap;
  }
): void {
  if (samples.length < 2) return;
  const dash = options?.dash;
  const dashOffset = options?.dashOffset ?? 0;
  const endCap = options?.endCap ?? 'butt';

  ctx.save();

  if (dash && dash.length > 0) {
    // For dashed kerb / line patterns: stroke segment-by-segment with local width
    ctx.strokeStyle = color;
    ctx.lineJoin = 'round';
    ctx.setLineDash(dash);
    ctx.lineDashOffset = dashOffset;
    ctx.lineCap = 'butt';

    const count = isClosedLoop ? samples.length : samples.length - 1;
    for (let i = 0; i < count; i++) {
      const s1 = samples[i];
      const s2 = samples[(i + 1) % samples.length];
      const r1 = Math.max(2, s1.halfWidth + radiusOffset(s1));
      const r2 = Math.max(2, s2.halfWidth + radiusOffset(s2));
      const avgW = r1 + r2;

      ctx.lineWidth = avgW;
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();
    }
  } else {
    // Solid fill 2D polygon ribbon: guarantees 100% smooth variable-width transitions
    // along curves, corners, and width changes with zero steps or broken kerbs!
    ctx.fillStyle = color;
    ctx.beginPath();

    const n = samples.length;
    // Left boundary (0 -> n-1)
    for (let i = 0; i < n; i++) {
      const s = samples[i];
      const r = Math.max(2, s.halfWidth + radiusOffset(s));
      const lx = s.x + s.nx * r;
      const ly = s.y + s.ny * r;
      if (i === 0) ctx.moveTo(lx, ly);
      else ctx.lineTo(lx, ly);
    }

    if (isClosedLoop) {
      const s0 = samples[0];
      const r0 = Math.max(2, s0.halfWidth + radiusOffset(s0));
      ctx.lineTo(s0.x + s0.nx * r0, s0.y + s0.ny * r0);
    } else if (endCap === 'round') {
      const last = samples[n - 1];
      const rLast = Math.max(2, last.halfWidth + radiusOffset(last));
      ctx.arc(
        last.x,
        last.y,
        rLast,
        Math.atan2(last.ny, last.nx),
        Math.atan2(-last.ny, -last.nx)
      );
    }

    // Right boundary in reverse (n-1 -> 0)
    for (let i = n - 1; i >= 0; i--) {
      const s = samples[i];
      const r = Math.max(2, s.halfWidth + radiusOffset(s));
      const rx = s.x - s.nx * r;
      const ry = s.y - s.ny * r;
      ctx.lineTo(rx, ry);
    }

    if (isClosedLoop) {
      const s0 = samples[0];
      const r0 = Math.max(2, s0.halfWidth + radiusOffset(s0));
      ctx.lineTo(s0.x - s0.nx * r0, s0.y - s0.ny * r0);
    } else if (endCap === 'round') {
      const first = samples[0];
      const rFirst = Math.max(2, first.halfWidth + radiusOffset(first));
      ctx.arc(
        first.x,
        first.y,
        rFirst,
        Math.atan2(-first.ny, -first.nx),
        Math.atan2(first.ny, first.nx)
      );
    }

    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Strokes a continuous polyline through `pts`.
 */
function strokeContinuousPolyline(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  isClosedLoop: boolean
): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  if (isClosedLoop) {
    ctx.closePath();
  }
  ctx.stroke();
}

/**
 * Draws standardized tangent-aligned directional arrows (`❯❯`) at uniform arc-length intervals
 * along a filleted `RibbonSample[]` chain.
 */
function drawChainDirectionalArrows(
  ctx: CanvasRenderingContext2D,
  map: MapDefinition,
  samples: RibbonSample[],
  nowSec: number
): void {
  if (samples.length < 2) return;
  const totalLen = samples[samples.length - 1].arcDist;
  if (totalLen < 80) return;

  const spacing = 240;
  let nextDist = 110;
  let sampleIdx = 0;

  while (nextDist < totalLen - 60) {
    while (
      sampleIdx < samples.length - 2 &&
      samples[sampleIdx + 1].arcDist < nextDist
    ) {
      sampleIdx++;
    }
    const a = samples[sampleIdx];
    const b = samples[sampleIdx + 1];
    const segStep = Math.max(1e-4, b.arcDist - a.arcDist);
    const t = Math.max(0, Math.min(1, (nextDist - a.arcDist) / segStep));

    const px = a.x + (b.x - a.x) * t;
    const py = a.y + (b.y - a.y) * t;
    const tx = a.tx + (b.tx - a.tx) * t;
    const ty = a.ty + (b.ty - a.ty) * t;
    const hw = a.halfWidth + (b.halfWidth - a.halfWidth) * t;
    const elev = a.elevation + (b.elevation - a.elevation) * t;
    const angle = Math.atan2(ty, tx);
    const wave = 0.5 + 0.5 * Math.sin(nowSec * 5.0 - nextDist * 0.012);

    const arrowColor =
      a.rampDir === 1
        ? '#FACC15'
        : a.rampDir === -1
        ? '#38BDF8'
        : elev > 0.5
        ? '#FEF08A'
        : map.theme === 'synapse' ||
          map.theme === 'cochlea' ||
          map.theme === 'unknown_cell'
        ? '#5EEAD4'
        : map.theme === 'chloroplast' || map.theme === 'ribosome'
        ? '#FDE047'
        : '#38BDF8';
    const chevronSpan = Math.max(14, Math.min(28, hw * 0.24));
    drawSingleRoadChevron(
      ctx,
      px,
      py,
      angle,
      chevronSpan,
      arrowColor,
      0.42 + 0.34 * wave
    );

    nextDist += spacing;
  }
}

function drawAuxiliaryBranchArrows(
  ctx: CanvasRenderingContext2D,
  map: MapDefinition
): void {
  if (map.shortcut && map.shortcut.path.length >= 2) {
    const sc = map.shortcut.path;
    for (let i = 0; i < sc.length - 1; i++) {
      const a = sc[i];
      const b = sc[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 60) continue;
      const angle = Math.atan2(dy, dx);
      const steps = Math.max(1, Math.floor(len / 260));
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        drawSingleRoadChevron(
          ctx,
          a.x + dx * t,
          a.y + dy * t,
          angle,
          15,
          '#FBBF24',
          0.6
        );
      }
    }
  }

  if (map.secretBranches) {
    for (const br of map.secretBranches) {
      const bPts = br.path;
      for (let i = 0; i < bPts.length - 1; i++) {
        const a = bPts[i];
        const b = bPts[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len < 60) continue;
        const angle = Math.atan2(dy, dx);
        const steps = Math.max(1, Math.floor(len / 260));
        for (let s = 0; s < steps; s++) {
          const t = (s + 0.5) / steps;
          drawSingleRoadChevron(
            ctx,
            a.x + dx * t,
            a.y + dy * t,
            angle,
            14,
            '#38BDF8',
            0.6
          );
        }
      }
    }
  }
}

function findSegmentIntersection(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D
): Point2D | null {
  const s1x = p2.x - p1.x;
  const s1y = p2.y - p1.y;
  const s2x = p4.x - p3.x;
  const s2y = p4.y - p3.y;
  const denom = -s2x * s1y + s1x * s2y;
  if (Math.abs(denom) < 1e-5) return null;
  const s = (-s1y * (p1.x - p3.x) + s1x * (p1.y - p3.y)) / denom;
  const t = (s2x * (p1.y - p3.y) - s2y * (p1.x - p3.x)) / denom;
  if (s >= 0.02 && s <= 0.98 && t >= 0.02 && t <= 0.98) {
    return {
      x: p1.x + t * s1x,
      y: p1.y + t * s1y,
    };
  }
  return null;
}

/**
 * Renders the 2.5D vertical concrete retaining wall and support columns beneath elevated ramps
 * and overpass bridges (`s.elevation > 0.01`).
 * Because height projects vertically downward (`+Y` = `s.elevation * 26px`), Up-Ramps visibly
 * rise up on a growing concrete wedge and Down-Ramps visibly taper back down to the ground!
 */
function drawRealistic3DSubstructure(
  ctx: CanvasRenderingContext2D,
  samples: RibbonSample[],
  isClosedLoop: boolean,
  castDropShadow: boolean
): void {
  if (samples.length < 2) return;
  const totalSegs = isClosedLoop ? samples.length : samples.length - 1;

  ctx.save();
  if (castDropShadow) {
    ctx.shadowBlur = 22;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 16;
  }

  for (let i = 0; i < totalSegs; i++) {
    const a = samples[i];
    const b = samples[(i + 1) % samples.length];
    if (a.elevation <= 0.01 && b.elevation <= 0.01) continue;

    const rA = a.halfWidth + 15;
    const rB = b.halfWidth + 15;
    const dropA = a.elevation * 26;
    const dropB = b.elevation * 26;

    // Pick the outer side that faces downward on screen (or draw both outer skirts)
    for (const side of [-1, 1] as const) {
      const axTop = a.x + a.nx * side * rA;
      const ayTop = a.y + a.ny * side * rA;
      const bxTop = b.x + b.nx * side * rB;
      const byTop = b.y + b.ny * side * rB;

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.moveTo(axTop, ayTop);
      ctx.lineTo(bxTop, byTop);
      ctx.lineTo(bxTop, byTop + dropB);
      ctx.lineTo(axTop, ayTop + dropA);
      ctx.closePath();
      ctx.fill();

      // Concrete ledge highlight & vertical bridge support columns along the visible side wall
      if (dropA > 4 || dropB > 4) {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(axTop, ayTop + dropA);
        ctx.lineTo(bxTop, byTop + dropB);
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  // Draw vertical concrete support columns spaced every ~95px along the lower edge of ramps & bridges
  let lastPillarDist = -999;
  ctx.save();
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.elevation < 0.18) continue;
    if (s.arcDist - lastPillarDist < 95) continue;
    lastPillarDist = s.arcDist;

    const r = s.halfWidth + 13;
    const drop = s.elevation * 26;
    // Choose the side of the road with larger screen Y (lower on screen)
    const side = s.ny >= 0 ? 1 : -1;
    const px = s.x + s.nx * side * r;
    const py = s.y + s.ny * side * r;

    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.fillRect(px - 5, py, 10, drop);
    ctx.strokeRect(px - 5, py, 10, drop);
  }
  ctx.restore();
}

/**
 * Renders smooth linear slope shading and metallic side bridge guardrails on ramps and bridges
 * without any circular arcs or clutter on the lane.
 */
function drawSeamlessRampAndBridgeRails(
  ctx: CanvasRenderingContext2D,
  map: MapDefinition,
  samples: RibbonSample[],
  isOverpassLayer: boolean
): void {
  if (samples.length < 2) return;

  // 1. Linear slope shading along straight ramp segments (Pass 1)
  if (!isOverpassLayer) {
    const pts = map.waypoints;
    const segCount = map.isPointToPoint
      ? Math.max(0, pts.length - 1)
      : pts.length;
    for (let i = 0; i < segCount; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const elevA = a.elevation ?? 0;
      const elevB = b.elevation ?? 0;
      if (elevA === elevB) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;
      const nx = -dy / len;
      const ny = dx / len;
      const wA = (a.width ?? map.roadWidth) * 0.5 - 9;
      const wB = (b.width ?? map.roadWidth) * 0.5 - 9;
      const isUpRamp = elevB > elevA;

      ctx.save();
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      if (isUpRamp) {
        grad.addColorStop(0, 'rgba(2, 6, 23, 0.22)');
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.04)');
        grad.addColorStop(1, 'rgba(186, 230, 253, 0.14)');
      } else {
        grad.addColorStop(0, 'rgba(186, 230, 253, 0.14)');
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.04)');
        grad.addColorStop(1, 'rgba(2, 6, 23, 0.22)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(a.x + nx * wA, a.y + ny * wA);
      ctx.lineTo(b.x + nx * wB, b.y + ny * wB);
      ctx.lineTo(b.x - nx * wB, b.y - ny * wB);
      ctx.lineTo(a.x - nx * wA, a.y - ny * wA);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // 2. Continuous Metallic Bridge & Ramp Outer Guardrails along both sides where `s.elevation > 0.08`
  const elevatedSubChains = extractElevationSampleChains(
    samples,
    false,
    (s) => s.elevation > 0.08 && !s.noGuardrail
  );

  for (const sub of elevatedSubChains) {
    for (const side of [-1, 1] as const) {
      const railPts: Point2D[] = [];
      for (const s of sub.samples) {
        const r = s.halfWidth + 12.5;
        railPts.push({
          x: s.x + s.nx * side * r,
          y: s.y + s.ny * side * r,
        });
      }
      if (railPts.length < 2) continue;

      ctx.save();
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 6;
      strokeContinuousPolyline(ctx, railPts, false);

      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.8;
      strokeContinuousPolyline(ctx, railPts, false);
      ctx.restore();
    }
  }
}

/**
 * CSG Concentric Capsule Sweep Renderer for ALL 15 Maps (Map 1 -> Map 15):
 * - Pass 1 (`!isOverpassLayer`) renders the ENTIRE track loop (`fullSamples`) + Shortcuts + Secret Branches
 *   with 100% uniform, constant colors per CSG pass, completely eliminating any circular cap rings
 *   ("vòng vòng cung") or color breaks on ramps!
 * - Pass 2 (`isOverpassLayer`) renders ONLY the elevated Bridge Deck (`s.elevation >= 0.88`) using the
 *   EXACT same road asphalt, kerb, and white edge line colors with `lineCap = 'butt'`, so it occludes
 *   Level 0 underpass cars while blending 100% invisibly into the ramps at both ends!
 */
interface CachedTrackSplines {
  fullSamples: RibbonSample[];
  overpassChains: { samples: RibbonSample[]; isClosedLoop: boolean }[];
  auxChains: {
    samples: RibbonSample[];
    isClosedLoop: boolean;
    borderColor: string;
    kerbColorA: string;
    kerbColorB: string;
    edgeColor: string;
    centerDashColor: string;
  }[];
}

const trackSplineCache = new Map<string, CachedTrackSplines>();

function getCachedTrackSplines(map: MapDefinition): CachedTrackSplines {
  const existing = trackSplineCache.get(map.id);
  if (existing) return existing;

  const isClosedTrack = !map.isPointToPoint;
  const fullSamples = buildFullTrackFilletedSamples(map);
  const overpassChains =
    fullSamples.length >= 2
      ? extractElevationSampleChains(
          fullSamples,
          isClosedTrack,
          (s) => s.elevation >= 0.88
        )
      : [];

  const auxChains: CachedTrackSplines['auxChains'] = [];
  if (map.shortcut && map.shortcut.path.length >= 2) {
    const scWidthRatio = map.shortcut.widthRatio || 0.56;
    const scHalfW = map.roadWidth * scWidthRatio * 0.5;
    const scSamples = buildAuxiliaryFilletedSamples(
      map.shortcut.path,
      scHalfW,
      'shortcut'
    );
    if (scSamples.length >= 2) {
      auxChains.push({
        samples: scSamples,
        isClosedLoop: false,
        borderColor: '#020617',
        kerbColorA: map.kerbColors[0],
        kerbColorB: map.kerbColors[1],
        edgeColor: '#F1F5F9',
        centerDashColor: '#FBBF24',
      });
    }
  }

  if (map.secretBranches && map.secretBranches.length > 0) {
    for (const br of map.secretBranches) {
      if (br.path.length < 2) continue;
      const brSamples = buildAuxiliaryFilletedSamples(
        br.path,
        br.width * 0.5,
        br.surfaceType
      );
      if (brSamples.length >= 2) {
        const isWaterfall = br.surfaceType === 'waterfall_bridge';
        auxChains.push({
          samples: brSamples,
          isClosedLoop: false,
          borderColor: '#020617',
          kerbColorA: isWaterfall ? '#F59E0B' : map.kerbColors[0],
          kerbColorB: isWaterfall ? '#0F172A' : map.kerbColors[1],
          edgeColor: isWaterfall ? '#FEF08A' : '#F1F5F9',
          centerDashColor: isWaterfall
            ? '#FEF08A'
            : 'rgba(255, 255, 255, 0.78)',
        });
      }
    }
  }

  const built: CachedTrackSplines = {
    fullSamples,
    overpassChains,
    auxChains,
  };
  trackSplineCache.set(map.id, built);
  return built;
}

function renderVariableTrackElevationLayer(
  ctx: CanvasRenderingContext2D,
  map: MapDefinition,
  nowSec: number,
  isOverpassLayer: boolean
): void {
  const pts = map.waypoints;
  const isClosedTrack = !map.isPointToPoint;
  const cachedSplines = getCachedTrackSplines(map);
  const fullSamples = cachedSplines.fullSamples;
  if (fullSamples.length < 2) return;

  // Pass 1 renders the entire track loop seamlessly.
  // Pass 2 renders ONLY the elevated bridge spans (s.elevation >= 0.88) on top of Level 0 cars.
  const mainChains = isOverpassLayer
    ? cachedSplines.overpassChains
    : [{ samples: fullSamples, isClosedLoop: isClosedTrack }];

  if (mainChains.length === 0) return;

  // Include Shortcuts and Secret Branches in Pass 1's CSG union so their entrances/exits merge seamlessly!
  const auxChains = isOverpassLayer ? [] : cachedSplines.auxChains;

  const uniformAsphalt = getUniformRoadAsphaltColor(map);
  const borderColor = map.theme === 'synapse' ? '#00F5D4' : '#020617';

  ctx.save();

  // =========================================================================
  // PASS 0: REALISTIC 2.5D CONCRETE RETAINING WALL, SUPPORT PILLARS & SHADOW
  // =========================================================================
  for (const chain of mainChains) {
    drawRealistic3DSubstructure(
      ctx,
      chain.samples,
      chain.isClosedLoop,
      isOverpassLayer
    );
  }

  // =========================================================================
  // PASS A: OUTER GUARDRAIL BORDER (CSG Layer 1 - Widest)
  // =========================================================================
  for (const aux of auxChains) {
    sweepConcentricRibbon(
      ctx,
      aux.samples,
      aux.isClosedLoop,
      () => 14,
      aux.borderColor,
      { endCap: 'round' }
    );
  }
  for (const chain of mainChains) {
    sweepConcentricRibbon(
      ctx,
      chain.samples,
      chain.isClosedLoop,
      (s) => (s.noGuardrail && s.elevation < 0.5 ? 8 : 15),
      borderColor,
      { endCap: 'butt' }
    );
  }

  // =========================================================================
  // PASS B: ALTERNATING RACING KERB STRIPS (CSG Layer 2)
  // =========================================================================
  for (const aux of auxChains) {
    sweepConcentricRibbon(
      ctx,
      aux.samples,
      aux.isClosedLoop,
      () => 9,
      aux.kerbColorA,
      { endCap: 'round' }
    );
    sweepConcentricRibbon(
      ctx,
      aux.samples,
      aux.isClosedLoop,
      () => 9,
      aux.kerbColorB,
      { dash: [26, 26], endCap: 'butt' }
    );
  }
  for (const chain of mainChains) {
    sweepConcentricRibbon(
      ctx,
      chain.samples,
      chain.isClosedLoop,
      (s) => (s.noGuardrail && s.elevation < 0.5 ? 4 : 9),
      map.kerbColors[0],
      { endCap: 'butt' }
    );
    sweepConcentricRibbon(
      ctx,
      chain.samples,
      chain.isClosedLoop,
      (s) => (s.noGuardrail && s.elevation < 0.5 ? 4 : 9),
      map.kerbColors[1],
      { dash: [28, 28], endCap: 'butt' }
    );
  }

  // =========================================================================
  // PASS C: OUTER ASPHALT SHOULDER RIM (CSG Layer 3 - Carves Kerb to Outer Edge)
  // =========================================================================
  for (const aux of auxChains) {
    sweepConcentricRibbon(
      ctx,
      aux.samples,
      aux.isClosedLoop,
      () => 0,
      uniformAsphalt,
      { endCap: 'round' }
    );
  }
  for (const chain of mainChains) {
    sweepConcentricRibbon(
      ctx,
      chain.samples,
      chain.isClosedLoop,
      () => 0,
      uniformAsphalt,
      { endCap: 'butt' }
    );
  }
  // Smoothly erase main track kerbs across junction openings
  for (const aux of auxChains) {
    if (aux.samples.length >= 2) {
      const sStart = aux.samples[0];
      const sEnd = aux.samples[aux.samples.length - 1];
      ctx.fillStyle = uniformAsphalt;
      ctx.beginPath();
      ctx.arc(sStart.x, sStart.y, sStart.halfWidth + 24, 0, Math.PI * 2);
      ctx.arc(sEnd.x, sEnd.y, sEnd.halfWidth + 24, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // =========================================================================
  // PASS D: WHITE LANE EDGE SHELL (CSG Layer 4 - `halfWidth - 5`)
  // =========================================================================
  for (const aux of auxChains) {
    sweepConcentricRibbon(
      ctx,
      aux.samples,
      aux.isClosedLoop,
      () => -5,
      aux.edgeColor,
      { endCap: 'round' }
    );
  }
  for (const chain of mainChains) {
    sweepConcentricRibbon(
      ctx,
      chain.samples,
      chain.isClosedLoop,
      () => -5,
      '#F1F5F9',
      { endCap: 'butt' }
    );
  }

  // =========================================================================
  // PASS E: INNER ASPHALT CORE (CSG Layer 5 - `halfWidth - 8.5`)
  // Completely erases the interior of Pass D so white lane edge lines are a crisp 3.5px
  // border that NEVER spikes across hairpin corners and automatically opens at Shortcut forks!
  // =========================================================================
  for (const aux of auxChains) {
    sweepConcentricRibbon(
      ctx,
      aux.samples,
      aux.isClosedLoop,
      () => -8.5,
      uniformAsphalt,
      { endCap: 'round' }
    );
  }
  for (const chain of mainChains) {
    sweepConcentricRibbon(
      ctx,
      chain.samples,
      chain.isClosedLoop,
      () => -8.5,
      uniformAsphalt,
      { endCap: 'butt' }
    );
  }
  // Smoothly open white lane edges across junction entrances and exits
  for (const aux of auxChains) {
    if (aux.samples.length >= 2) {
      const sStart = aux.samples[0];
      const sEnd = aux.samples[aux.samples.length - 1];
      ctx.fillStyle = uniformAsphalt;
      ctx.beginPath();
      ctx.arc(sStart.x, sStart.y, sStart.halfWidth + 18, 0, Math.PI * 2);
      ctx.arc(sEnd.x, sEnd.y, sEnd.halfWidth + 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // =========================================================================
  // PASS F: RAMP LINEAR SHADING, BRIDGE GUARDRAILS, CENTER DASHED LINE & ARROWS
  // =========================================================================
  for (const aux of auxChains) {
    ctx.save();
    ctx.setLineDash([22, 18]);
    ctx.strokeStyle = aux.centerDashColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    strokeContinuousPolyline(ctx, aux.samples, aux.isClosedLoop);
    ctx.restore();
  }

  for (const chain of mainChains) {
    drawSeamlessRampAndBridgeRails(
      ctx,
      map,
      chain.samples,
      isOverpassLayer
    );

    // Center dashed line
    ctx.save();
    ctx.setLineDash([32, 26]);
    ctx.strokeStyle =
      map.theme === 'airport'
        ? 'rgba(250, 204, 21, 0.85)'
        : 'rgba(255, 255, 255, 0.82)';
    ctx.lineWidth = map.theme === 'airport' ? 5.5 : 4;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    strokeContinuousPolyline(ctx, chain.samples, chain.isClosedLoop);
    ctx.restore();

    // Subtle expansion joints on Overpass Bridges (`s.elevation > 0.92`)
    if (isOverpassLayer) {
      let lastJointDist = 0;
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const s of chain.samples) {
        if (s.elevation > 0.92 && s.arcDist - lastJointDist >= 115) {
          lastJointDist = s.arcDist;
          const hw = s.halfWidth - 9;
          ctx.moveTo(s.x + s.nx * hw, s.y + s.ny * hw);
          ctx.lineTo(s.x - s.nx * hw, s.y - s.ny * hw);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // Standard tangent-aligned directional arrows
    drawChainDirectionalArrows(ctx, map, chain.samples, nowSec);
  }

  // Underpass Tunnel Shadow on Ground Layer (`!isOverpassLayer`) where a Bridge (`1 -> 1`) crosses overhead
  if (!isOverpassLayer) {
    const segCount = isClosedTrack ? pts.length : Math.max(0, pts.length - 1);
    const bridgeSegs: number[] = [];
    for (let i = 0; i < segCount; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a.elevation ?? 0) === 1 && (b.elevation ?? 0) === 1) {
        bridgeSegs.push(i);
      }
    }

    if (bridgeSegs.length > 0) {
      for (let i = 0; i < segCount; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if ((a.elevation ?? 0) !== 0 || (b.elevation ?? 0) !== 0) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len < 1) continue;
        const angle = Math.atan2(dy, dx);
        const wA = (a.width ?? map.roadWidth) * 0.5;
        const wB = (b.width ?? map.roadWidth) * 0.5;

        for (const bIdx of bridgeSegs) {
          const c = pts[bIdx];
          const d = pts[(bIdx + 1) % pts.length];
          const hit = findSegmentIntersection(a, b, c, d);
          if (!hit) continue;

          const tHit = Math.hypot(hit.x - a.x, hit.y - a.y) / len;
          const wGround = wA + (wB - wA) * tHit;
          const wBridge =
            ((c.width ?? map.roadWidth) + (d.width ?? map.roadWidth)) * 0.25 +
            40;

          ctx.save();
          ctx.translate(hit.x, hit.y);
          ctx.rotate(angle);

          const shadowGrad = ctx.createLinearGradient(
            -wBridge * 1.3,
            0,
            wBridge * 1.3,
            0
          );
          shadowGrad.addColorStop(0, 'rgba(2, 6, 23, 0)');
          shadowGrad.addColorStop(0.25, 'rgba(2, 6, 23, 0.72)');
          shadowGrad.addColorStop(0.75, 'rgba(2, 6, 23, 0.72)');
          shadowGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
          ctx.fillStyle = shadowGrad;
          ctx.fillRect(-wBridge * 1.3, -wGround, wBridge * 2.6, wGround * 2);
          ctx.restore();
        }
      }
    }

    drawAuxiliaryBranchArrows(ctx, map);
  }

  ctx.restore();
}

/**
 * 2.5D Background Parallax Layer for Maps 11–15:
 * Subtle trackside bio-nebulae below the road (kept away from road lanes).
 */
function drawParallaxBackgroundLayer(
  ctx: CanvasRenderingContext2D,
  map: MapDefinition,
  scenery: PrecomputedMapScenery,
  nowSec: number
): void {
  if (
    map.theme !== 'polypeptide' &&
    map.theme !== 'ribosome' &&
    map.theme !== 'cochlea' &&
    map.theme !== 'macrophage' &&
    map.theme !== 'unknown_cell'
  ) {
    return;
  }

  ctx.save();
  const cx = (scenery.minX + scenery.maxX) * 0.5;
  const cy = (scenery.minY + scenery.maxY) * 0.5;

  for (let i = 0; i < 18; i++) {
    const angle = i * 2.39996 + nowSec * 0.06 * (i % 2 === 0 ? 1 : -1);
    const dist = 650 + ((i * 173) % 2100);
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const rad = 22 + (i % 4) * 10;

    if (map.theme === 'unknown_cell' && py > 2200) {
      ctx.save();
      ctx.translate(px * 0.35, py);
      ctx.rotate(nowSec * 0.25 + i);
      ctx.strokeStyle =
        i % 2 === 0 ? 'rgba(56, 189, 248, 0.16)' : 'rgba(232, 121, 249, 0.16)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-36, -48);
      ctx.lineTo(36, 48);
      ctx.moveTo(36, -48);
      ctx.lineTo(-36, 48);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle =
        map.theme === 'polypeptide'
          ? 'rgba(244, 114, 182, 0.05)'
          : map.theme === 'ribosome'
          ? 'rgba(16, 185, 129, 0.05)'
          : map.theme === 'macrophage'
          ? 'rgba(244, 63, 94, 0.05)'
          : 'rgba(45, 212, 191, 0.05)';
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Renders the crisp High-DPI road geometry, kerbs, lane markings, directional arrows, runway numbers,
 * start/finish banner, trackside flora, and chicane barriers directly on the High-DPI context.
 */
function drawCrispTrackVectors(
  ctx: CanvasRenderingContext2D,
  map: MapDefinition,
  scenery: PrecomputedMapScenery,
  nowSec: number
): void {
  const pts = map.waypoints;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. 2.5D Background Parallax Layer
  drawParallaxBackgroundLayer(ctx, map, scenery, nowSec);

  // 2. Render ALL Maps (Maps 1–15) + Shortcuts + Secret Branches using the Unified CSG Concentric Capsule Sweep!
  renderVariableTrackElevationLayer(ctx, map, nowSec, false);

  // Map 10 Special Static Feature: Airport Runway Threshold Stripes & Runway Numbers ("09L" / "27R")
  if (map.theme === 'airport') {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const mark of [
      { x: -2000, y: 0, label: '09L', rot: Math.PI / 2 },
      { x: 4200, y: 0, label: '27R', rot: -Math.PI / 2 },
      { x: 4200, y: -1240, label: '09R', rot: -Math.PI / 2 },
      { x: -2000, y: -1240, label: '27L', rot: Math.PI / 2 },
    ]) {
      ctx.save();
      ctx.translate(Math.floor(mark.x), Math.floor(mark.y));
      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
      for (let b = -160; b <= 160; b += 40) {
        ctx.fillRect(-45, b - 10, 90, 20);
      }
      ctx.rotate(mark.rot);
      ctx.font = '900 44px "Be Vietnam Pro", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(248, 250, 252, 0.78)';
      ctx.fillText(mark.label, 0, -75);
      ctx.restore();
    }
    ctx.restore();
  }

  // Chasm Segments (for Map 8 Chloroplast & Map 10 Airport Jump Pads)
  if (map.chasmSegments) {
    for (const ch of map.chasmSegments) {
      ctx.save();
      ctx.translate(Math.floor(ch.x), Math.floor(ch.y));
      ctx.rotate(ch.angle);
      ctx.fillStyle = '#020617';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(-55, -map.roadWidth * 0.48, 110, map.roadWidth * 0.96, 12);
      ctx.fill();
      ctx.stroke();

      // Hazard warning stripes along chasm edges (no text)
      ctx.fillStyle = '#EF4444';
      for (let s = -3; s <= 3; s++) {
        ctx.fillRect(-52, s * 28 - 6, 8, 12);
        ctx.fillRect(44, s * 28 - 6, 8, 12);
      }
      ctx.restore();
    }
  }

  // Wooden Bridge Segment (Map 3)
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
      ctx.lineWidth = map.roadWidth * 0.74;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      ctx.strokeStyle = '#B45309';
      ctx.setLineDash([12, 8]);
      ctx.lineWidth = map.roadWidth * 0.68;
      ctx.stroke();
      ctx.restore();
    }
  }

  // Natural Mud Zones (Organic mud puddles with bubbling ripples, no text labels)
  for (let mIdx = 0; mIdx < map.naturalMudZones.length; mIdx++) {
    const mz = map.naturalMudZones[mIdx];
    ctx.save();
    ctx.translate(mz.x, mz.y);
    ctx.fillStyle = 'rgba(69, 26, 3, 0.9)';
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(
      -mz.radius,
      -mz.radius * 0.72,
      mz.radius * 2,
      mz.radius * 1.44,
      28
    );
    ctx.fill();
    ctx.stroke();

    // Inner dark mud pools & animated bubbles
    ctx.fillStyle = 'rgba(41, 15, 2, 0.65)';
    ctx.beginPath();
    ctx.ellipse(-mz.radius * 0.25, -4, mz.radius * 0.45, mz.radius * 0.3, 0.2, 0, Math.PI * 2);
    ctx.ellipse(mz.radius * 0.28, 6, mz.radius * 0.38, mz.radius * 0.26, -0.3, 0, Math.PI * 2);
    ctx.fill();

    const bubbleR = 3 + 2.5 * (0.5 + 0.5 * Math.sin(nowSec * 4 + mIdx));
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(-mz.radius * 0.22, -2, bubbleR, 0, Math.PI * 2);
    ctx.moveTo(mz.radius * 0.25 + bubbleR * 0.8, 5);
    ctx.arc(mz.radius * 0.25, 5, bubbleR * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Start / Finish Line & Checkered Banner
  const startPt = pts[0];
  const nextPt = pts[1];
  const startAngle = Math.atan2(nextPt.y - startPt.y, nextPt.x - startPt.x);

  ctx.save();
  ctx.translate(Math.floor(startPt.x), Math.floor(startPt.y));
  ctx.rotate(startAngle);

  const halfRoad = (startPt.width ?? map.roadWidth) * 0.48;
  const rows = 2;
  const cols = 12;
  const cellW = 14;
  const cellH = (halfRoad * 2) / cols;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#FFFFFF' : '#0F172A';
      ctx.fillRect(
        Math.floor(-cellW + r * cellW),
        Math.floor(-halfRoad + c * cellH),
        cellW,
        Math.ceil(cellH)
      );
    }
  }

  ctx.save();
  ctx.rotate(-Math.PI / 2);
  ctx.font = '800 13px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = 'rgba(250, 204, 21, 0.75)';
  ctx.textAlign = 'center';
  ctx.fillText('TRIPLE D OPEN CUP', 0, -22);
  ctx.restore();
  ctx.restore();

  // Map 15 Point-To-Point South Pole Finish Gate Arch
  if (map.isPointToPoint && pts.length >= 2) {
    const endPt = pts[pts.length - 1];
    const prevPt = pts[pts.length - 2];
    const finishAngle = Math.atan2(endPt.y - prevPt.y, endPt.x - prevPt.x);
    const finishHalfW = (endPt.width ?? map.roadWidth) * 0.48;

    ctx.save();
    ctx.translate(endPt.x, endPt.y);
    ctx.rotate(finishAngle);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 12; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#00F5D4' : '#0F172A';
        ctx.fillRect(
          -14 + r * 14,
          -finishHalfW + (c * (finishHalfW * 2)) / 12,
          14,
          (finishHalfW * 2) / 12
        );
      }
    }
    ctx.restore();
  }

  // 5. Trackside Houses & Theme Flora/Organelles
  for (const h of scenery.houses) {
    drawHouse(ctx, Math.floor(h.x), Math.floor(h.y), h.angle, h.roofColor, h.scale);
  }
  for (const t of scenery.trees) {
    drawTree(ctx, Math.floor(t.x), Math.floor(t.y), t.radius, t.style);
  }

  // 6. Red/White Striped Rectangular Racing Chicane Barriers (Level 0)
  for (const tb of map.tireBarriers) {
    if ((tb.elevation ?? 0) === 1) continue;
    ctx.save();
    ctx.translate(Math.floor(tb.x), Math.floor(tb.y));
    const bw = Math.max(24, tb.radius * 0.95);
    const bh = Math.max(38, tb.radius * 1.6);

    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, 6);
    ctx.fill();
    ctx.stroke();

    const stripes = 4;
    const sh = (bh - 6) / stripes;
    for (let s = 0; s < stripes; s++) {
      ctx.fillStyle = s % 2 === 0 ? '#EF4444' : '#F8FAFC';
      ctx.fillRect(-bw * 0.5 + 3, -bh * 0.5 + 3 + s * sh, bw - 6, sh);
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Helper to compute dynamic Antibody Sphere position in Map 14 (and other maps)
 */
export function getAntibodySpherePosition(
  ab: NonNullable<MapDefinition['antibodySpheres']>[0],
  nowSec: number
): { x: number; y: number } {
  const phase = ab.phase ?? 0;
  const rx = ab.orbitRadiusX ?? 360;
  const ry = ab.orbitRadiusY ?? 200;
  const angle = phase + nowSec * (ab.speed ?? 1.2);
  return {
    x: ab.centerX + Math.cos(angle) * rx,
    y: ab.centerY + Math.sin(angle) * ry,
  };
}

/**
 * Helper to compute exact tARN / Hydraulic Piston extension state & collision segment
 * so visual rendering and physical collision in RaceCanvas are 100% synchronized.
 */
export function getPistonState(
  ps: NonNullable<MapDefinition['tarnPistons']>[0],
  nowSec: number
): {
  extension: number;
  isDangerous: boolean;
  reach: number;
  rodStart: { x: number; y: number };
  rodEnd: { x: number; y: number };
  halfThickness: number;
} {
  const cycleSec = 2.0;
  const cycle = ((nowSec + (ps.phaseOffset ?? 0)) % cycleSec) / cycleSec;
  const extension = cycle < 0.48 ? Math.sin((cycle / 0.48) * Math.PI) : 0;
  const maxReach = (ps.radius ?? 110) * 1.25;
  const reach = 28 + extension * maxReach;
  const cosA = Math.cos(ps.angle);
  const sinA = Math.sin(ps.angle);
  const startOffset = -72;
  const endOffset = startOffset + reach;
  return {
    extension,
    isDangerous: extension > 0.22,
    reach,
    rodStart: {
      x: ps.x + cosA * startOffset,
      y: ps.y + sinA * startOffset,
    },
    rodEnd: {
      x: ps.x + cosA * endOffset,
      y: ps.y + sinA * endOffset,
    },
    halfThickness: 28,
  };
}

/**
 * Helper to check if Map 15 Zone 2 Biological Tide is currently High Tide (submerging the stone shortcut)
 */
export function isBiologicalHighTide(nowSec: number, cycleSeconds: number = 6): boolean {
  const period = cycleSeconds > 0 ? cycleSeconds : 6;
  return (nowSec % period) >= period * 0.5;
}

/**
 * Blits the 1:1 pre-baked terrain tiles with integer Math.floor coordinates and
 * imageSmoothingEnabled = false, then renders crisp High-DPI road vectors, markings,
 * chicane barriers, runway numbers, and dynamic animated map hazards (Level 0).
 */
export function drawRaceTrack(
  ctx: CanvasRenderingContext2D,
  map: MapDefinition,
  itemBoxes: TrackItemBox[],
  hazards: DeployedHazard[],
  nowSec: number
): void {
  const baked = getBakedStaticTrack(map);
  const scenery = getPrecomputedScenery(map);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 1. Blit 1:1 unscaled terrain tiles using integer Math.floor coordinates
  for (const tile of baked.tiles) {
    ctx.drawImage(
      tile.canvas as CanvasImageSource,
      0,
      0,
      Math.floor(tile.width),
      Math.floor(tile.height),
      Math.floor(tile.worldX),
      Math.floor(tile.worldY),
      Math.floor(tile.width),
      Math.floor(tile.height)
    );
  }

  // 1.5. Draw crisp High-DPI road markings, kerbs, runway numbers ("09L"/"27R"), and chicane barriers
  drawCrispTrackVectors(ctx, map, scenery, nowSec);

  // 1.6. Map 12: Dynamic mARN Conveyor Belts (Left half Green +35% speed, Right half Red -35% speed)
  if (map.conveyorBelts) {
    for (const cb of map.conveyorBelts) {
      for (let segIdx = cb.startIdx; segIdx < cb.endIdx; segIdx++) {
        const a = map.waypoints[segIdx];
        const b = map.waypoints[(segIdx + 1) % map.waypoints.length];
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len < 1) continue;
        const angle = Math.atan2(dy, dx);
        const halfW = ((a.width ?? map.roadWidth) * 0.5) * 0.42;

        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(angle);

        ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
        ctx.fillRect(35, -halfW * 2 - 4, Math.max(20, len - 70), halfW * 1.8);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
        ctx.fillRect(35, 4, Math.max(20, len - 70), halfW * 1.8);

        const stepCount = Math.max(3, Math.floor(len / 110));
        const shift = (nowSec * 140) % 110;
        for (let s = 0; s < stepCount; s++) {
          const fx = 50 + ((s * 110 + shift) % Math.max(110, len - 100));
          ctx.strokeStyle = '#34D399';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(fx - 10, -halfW - 12);
          ctx.lineTo(fx + 9, -halfW);
          ctx.lineTo(fx - 10, -halfW + 12);
          ctx.stroke();

          const rx = 50 + ((s * 110 + (110 - shift)) % Math.max(110, len - 100));
          ctx.strokeStyle = '#F87171';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(rx + 10, halfW - 12);
          ctx.lineTo(rx - 9, halfW);
          ctx.lineTo(rx + 10, halfW + 12);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  // 1.7. Dynamic Hydraulic / tARN Pistons (2-second cycle lateral slam blockers)
  if (map.tarnPistons) {
    for (const ps of map.tarnPistons) {
      const pState = getPistonState(ps, nowSec);
      const { extension, reach } = pState;
      const maxReach = 28 + (ps.radius ?? 110) * 1.25;

      ctx.save();
      ctx.translate(ps.x, ps.y);
      ctx.rotate(ps.angle);

      // Dashed red-amber danger sweep zone on the road
      ctx.save();
      ctx.fillStyle =
        extension > 0.22
          ? 'rgba(239, 68, 68, 0.22)'
          : 'rgba(245, 158, 11, 0.12)';
      ctx.strokeStyle =
        extension > 0.22
          ? 'rgba(239, 68, 68, 0.65)'
          : 'rgba(250, 204, 21, 0.35)';
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-72, -30, maxReach, 60, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Piston housing & hydraulic rod
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-104, -34, 36, 68, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = extension > 0.22 ? '#EF4444' : '#F59E0B';
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-72, -28, reach, 56, 8);
      ctx.fill();
      ctx.stroke();

      // Mechanical hazard chevrons on piston head
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-72 + reach - 20, -15);
      ctx.lineTo(-72 + reach - 8, 0);
      ctx.lineTo(-72 + reach - 20, 15);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 1.8. Map 14: Glowing Elastic Lysosome Pinball Bumpers & Rolling Antibody Spheres (no text)
  if (map.pinballBumpers) {
    for (let i = 0; i < map.pinballBumpers.length; i++) {
      const pb = map.pinballBumpers[i];
      const pulse = 1 + 0.06 * Math.sin(nowSec * 6 + i);
      ctx.save();
      ctx.translate(pb.x, pb.y);

      ctx.fillStyle = pb.color;
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, pb.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner concentric shockwave ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, pb.radius * 0.52 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(0, 0, pb.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  if (map.antibodySpheres) {
    for (const ab of map.antibodySpheres) {
      const pos = getAntibodySpherePosition(ab, nowSec);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(nowSec * 3);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, ab.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, ab.radius * 0.5);
      ctx.lineTo(0, 0);
      ctx.lineTo(-ab.radius * 0.45, -ab.radius * 0.45);
      ctx.moveTo(0, 0);
      ctx.lineTo(ab.radius * 0.45, -ab.radius * 0.45);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 1.9. Map 15 Zone 2: Biological Tide Water Overlay strictly inside the Shortcut interior (never cuts main road!)
  if (map.tidalZones && map.shortcut && map.shortcut.path.length >= 3) {
    const sc = map.shortcut.path;
    const scWidth = map.roadWidth * (map.shortcut.widthRatio || 0.65) - 18;
    for (const tz of map.tidalZones) {
      const period = tz.periodSec || 6.0;
      const highTide = isBiologicalHighTide(nowSec, period);
      const tideWave = 0.5 + 0.5 * Math.sin((nowSec * Math.PI * 2) / period);

      // Start 22% into first shortcut segment and end 78% into last shortcut segment so the main road is untouched
      const pStart = {
        x: sc[0].x + (sc[1].x - sc[0].x) * 0.25,
        y: sc[0].y + (sc[1].y - sc[0].y) * 0.25,
      };
      const lastIdx = sc.length - 1;
      const pEnd = {
        x: sc[lastIdx - 1].x + (sc[lastIdx].x - sc[lastIdx - 1].x) * 0.75,
        y: sc[lastIdx - 1].y + (sc[lastIdx].y - sc[lastIdx - 1].y) * 0.75,
      };

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = highTide
        ? `rgba(6, 182, 212, ${(0.42 + 0.18 * tideWave).toFixed(2)})`
        : 'rgba(6, 182, 212, 0.1)';
      ctx.lineWidth = Math.max(24, scWidth);
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      for (let i = 1; i < lastIdx; i++) {
        ctx.lineTo(sc[i].x, sc[i].y);
      }
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2. Dynamic Bubbling Gastric Acid Pools (Map 7 & Map 9, no text labels)
  if (map.acidZones) {
    for (let idx = 0; idx < map.acidZones.length; idx++) {
      const az = map.acidZones[idx];
      ctx.save();
      ctx.translate(az.x, az.y);

      const pulse = 1 + 0.04 * Math.sin(nowSec * 3.5 + idx);
      ctx.fillStyle = 'rgba(132, 204, 22, 0.72)';
      ctx.strokeStyle = '#BEF264';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(
        -az.radius * pulse,
        -az.radius * 0.72 * pulse,
        az.radius * 2 * pulse,
        az.radius * 1.44 * pulse,
        32
      );
      ctx.fill();
      ctx.stroke();

      // Animated acid bubble rings
      const bPulse = (nowSec * 2.2 + idx * 0.7) % 1;
      ctx.strokeStyle = `rgba(236, 252, 203, ${(0.85 * (1 - bPulse)).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-az.radius * 0.25, -4, 5 + bPulse * 14, 0, Math.PI * 2);
      ctx.moveTo(az.radius * 0.25 + (4 + bPulse * 10), 6);
      ctx.arc(az.radius * 0.25, 6, 4 + bPulse * 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 3. Dynamic Peristaltic Crosswind Streams (Map 7 & Map 9)
  if (map.crosswindZones) {
    for (let idx = 0; idx < map.crosswindZones.length; idx++) {
      const cw = map.crosswindZones[idx];
      ctx.save();
      ctx.translate(cw.x, cw.y);
      ctx.rotate(cw.forceAngle);

      ctx.strokeStyle = 'rgba(125, 211, 252, 0.8)';
      ctx.lineWidth = 3;
      for (let line = -2; line <= 2; line++) {
        const yOff = line * (cw.radius * 0.28);
        const travel =
          ((nowSec * 240 + line * 37) % (cw.radius * 1.5)) - cw.radius * 0.75;
        ctx.beginPath();
        ctx.moveTo(travel - 28, yOff);
        ctx.lineTo(travel + 28, yOff);
        ctx.lineTo(travel + 16, yOff - 7);
        ctx.moveTo(travel + 28, yOff);
        ctx.lineTo(travel + 16, yOff + 7);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 4. Dynamic Chloroplast Solar Photosynthesis Pads (Map 8, no text labels)
  if (map.solarZones) {
    for (let idx = 0; idx < map.solarZones.length; idx++) {
      const sz = map.solarZones[idx];
      ctx.save();
      ctx.translate(sz.x, sz.y);

      const glowPulse = 0.26 + 0.12 * Math.sin(nowSec * 4 + idx);
      ctx.fillStyle = `rgba(250, 204, 21, ${glowPulse.toFixed(2)})`;
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-sz.radius * 0.75, -56, sz.radius * 1.5, 112, 16);
      ctx.fill();
      ctx.stroke();

      // Golden solar cell grid lines & central sun emblem
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let gx = -sz.radius * 0.45; gx <= sz.radius * 0.45; gx += sz.radius * 0.3) {
        ctx.moveTo(gx, -52);
        ctx.lineTo(gx, 52);
      }
      ctx.moveTo(-sz.radius * 0.72, 0);
      ctx.lineTo(sz.radius * 0.72, 0);
      ctx.stroke();

      ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
      ctx.beginPath();
      ctx.arc(0, 0, 14 + 3 * Math.sin(nowSec * 5 + idx), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 5. Dynamic Spring Jump Pads (Spanning nicely across the road before chasms)
  if (map.jumpPads) {
    for (const jp of map.jumpPads) {
      ctx.save();
      ctx.translate(jp.x, jp.y);
      ctx.rotate(jp.angle);

      const padHalfSpan = Math.max(68, jp.radius * 0.85);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.55)';
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-jp.radius * 0.65, -padHalfSpan, jp.radius * 1.3, padHalfSpan * 2, 14);
      ctx.fill();
      ctx.stroke();

      for (let c = -1; c <= 1; c++) {
        const shift = ((nowSec * 120) % 28) - 14;
        const cx = c * 26 + shift;
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cx - 12, -padHalfSpan * 0.6);
        ctx.lineTo(cx + 12, 0);
        ctx.lineTo(cx - 12, padHalfSpan * 0.6);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 6. Dynamic Synapse Laser Gates (3s Open Green - 2s Closed Red, Map 6 & Map 9)
  if (map.synapseGates) {
    for (const gate of map.synapseGates) {
      const closed = isSynapseGateClosed(nowSec, gate.phaseOffset);
      const halfW = gate.width * 0.5;

      ctx.save();
      ctx.translate(gate.x, gate.y);
      ctx.rotate(gate.angle);

      const pylonColor = closed ? '#EF4444' : '#00F5D4';
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = pylonColor;
        ctx.lineWidth = 3;
        ctx.fillRect(-10, side * halfW - 10, 20, 20);
        ctx.strokeRect(-10, side * halfW - 10, 20, 20);
      }

      if (closed) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.moveTo(0, -halfW + 12);
        ctx.lineTo(0, halfW - 12);
        ctx.stroke();

        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, -halfW + 12);
        ctx.lineTo(0, halfW - 12);
        ctx.stroke();

        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const steps = 8;
        for (let s = 0; s <= steps; s++) {
          const py = -halfW + 14 + ((halfW * 2 - 28) * s) / steps;
          const jitter =
            s === 0 || s === steps
              ? 0
              : Math.sin(nowSec * 45 + s * 2.1) * 6;
          if (s === 0) ctx.moveTo(jitter, py);
          else ctx.lineTo(jitter, py);
        }
        ctx.stroke();
      } else {
        ctx.save();
        ctx.setLineDash([10, 14]);
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.45)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, -halfW + 14);
        ctx.lineTo(0, halfW - 14);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }
  }

  // 7. Dynamic Airport Runway Blinking Edge Strobe Lights (Map 10)
  if (map.theme === 'airport') {
    ctx.save();
    const strobeIdx = Math.floor(nowSec * 8) % 12;
    for (let i = 0; i < 12; i++) {
      const lx = -2200 + i * 600;
      const isLit = i === strobeIdx || (i + 6) % 12 === strobeIdx;
      for (const rowY of [0, -1240]) {
        for (const side of [-1, 1]) {
          const ly = rowY + side * (map.roadWidth * 0.5 + 14);
          ctx.fillStyle = isLit ? '#38BDF8' : '#F59E0B';
          ctx.beginPath();
          ctx.arc(lx, ly, isLit ? 8 : 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  // 8. Dynamic Boost Zones (Animated Chevrons, Level 0)
  for (const bz of map.boostZones) {
    if ((bz.elevation ?? 0) === 1) continue;
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

  // 9. Dynamic Item Gift Boxes (Level 0)
  for (const box of itemBoxes) {
    if (!box.active || (box.elevation ?? 0) === 1) continue;
    drawGiftBoxItem(ctx, box, nowSec);
  }

  // 10. Active Deployed Hazards (Level 0)
  for (const hz of hazards) {
    if ((hz.elevation ?? 0) === 1) continue;
    drawDeployedHazardItem(ctx, hz);
  }

  ctx.restore();
}

function drawGiftBoxItem(
  ctx: CanvasRenderingContext2D,
  box: TrackItemBox,
  nowSec: number
): void {
  ctx.save();
  const floatOffset = Math.sin(nowSec * 3.5) * 6;
  ctx.translate(box.x, box.y + floatOffset);
  ctx.rotate(nowSec * 1.5);

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

  ctx.rotate(-nowSec * 1.5);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 15px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 0, 1);
  ctx.restore();
}

function drawDeployedHazardItem(
  ctx: CanvasRenderingContext2D,
  hz: DeployedHazard
): void {
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

/**
 * Pass 2 Overpass Renderer (`elevation: 1`):
 * Drawn AFTER `elevation: 0` cars so that cars driving underneath an overpass
 * are visually occluded by the bridge deck + drop shadow (`ctx.shadowBlur = 25`),
 * while cars on `elevation: 1` are drawn on top of this bridge deck.
 */
export function drawOverpassOverlay(
  ctx: CanvasRenderingContext2D,
  map: MapDefinition,
  itemBoxes: TrackItemBox[],
  hazards: DeployedHazard[],
  nowSec: number
): void {
  const pts = map.waypoints;

  ctx.save();
  renderVariableTrackElevationLayer(ctx, map, nowSec, true);

  // Draw Level 1 Boost Zones, Tire Barriers, Item Boxes & Hazards on top of the Overpass Bridge Deck
  for (const bz of map.boostZones) {
    if ((bz.elevation ?? 0) !== 1) continue;
    ctx.save();
    ctx.translate(bz.x, bz.y);
    ctx.rotate(bz.angle);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.42)';
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
  for (const tb of map.tireBarriers) {
    if ((tb.elevation ?? 0) !== 1) continue;
    ctx.save();
    ctx.translate(Math.floor(tb.x), Math.floor(tb.y));
    const bw = Math.max(24, tb.radius * 0.95);
    const bh = Math.max(38, tb.radius * 1.6);
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, 6);
    ctx.fill();
    ctx.stroke();
    const stripes = 4;
    const sh = (bh - 6) / stripes;
    for (let s = 0; s < stripes; s++) {
      ctx.fillStyle = s % 2 === 0 ? '#EF4444' : '#F8FAFC';
      ctx.fillRect(-bw * 0.5 + 3, -bh * 0.5 + 3 + s * sh, bw - 6, sh);
    }
    ctx.restore();
  }
  for (const box of itemBoxes) {
    if (!box.active || (box.elevation ?? 0) !== 1) continue;
    drawGiftBoxItem(ctx, box, nowSec);
  }
  for (const hz of hazards) {
    if ((hz.elevation ?? 0) !== 1) continue;
    drawDeployedHazardItem(ctx, hz);
  }

  // Map 15 Zone 4: Sub-Nuclear Glass Tunnel Translucent Canopy Arch
  if (map.glassTunnelSegments) {
    for (const gt of map.glassTunnelSegments) {
      for (let idx = gt.startIdx; idx < gt.endIdx && idx < pts.length - 1; idx++) {
        const a = pts[idx];
        const b = pts[idx + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len < 1) continue;
        const nx = -dy / len;
        const ny = dx / len;
        const wA = (a.width ?? map.roadWidth) * 0.5;
        const wB = (b.width ?? map.roadWidth) * 0.5;

        ctx.save();
        ctx.fillStyle = 'rgba(103, 232, 249, 0.12)';
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.65)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(a.x + nx * wA, a.y + ny * wA);
        ctx.lineTo(b.x + nx * wB, b.y + ny * wB);
        ctx.lineTo(b.x - nx * wB, b.y - ny * wB);
        ctx.lineTo(a.x - nx * wA, a.y - ny * wA);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Curved Glass Rib Arches
        const ribCount = Math.max(3, Math.floor(len / 140));
        ctx.strokeStyle = 'rgba(165, 243, 252, 0.45)';
        ctx.lineWidth = 2.5;
        for (let r = 0; r <= ribCount; r++) {
          const t = r / ribCount;
          const rx = a.x + dx * t;
          const ry = a.y + dy * t;
          const hw = wA + (wB - wA) * t;
          ctx.beginPath();
          ctx.moveTo(rx + nx * hw, ry + ny * hw);
          ctx.lineTo(rx - nx * hw, ry - ny * hw);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  ctx.restore();
}


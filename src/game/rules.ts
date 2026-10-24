import {
  ALL_PARTS,
  ALL_TUNING_PARTS,
  DEFAULT_TUNING_LOADOUT,
  GACHA_PITY_THRESHOLD,
  RANK_TIERS,
} from './constants.ts';
import {
  MAX_TUNING_CP,
  type BotDifficulty,
  type CarLoadout,
  type ComputedTuningStats,
  type MapDefinition,
  type PartItem,
  type PartSlot,
  type PartTier,
  type PlayModeCategory,
  type Point2D,
  type RaceItemType,
  type RacerState,
  type RankDefinition,
  type TournamentRewardConfig,
  type TrackSurfaceType,
  type TuningLoadout,
  type TuningPartItem,
  type TuningPassiveId,
  type TuningPreset,
  type TuningSlot,
  type TuningStats,
} from './types.ts';

/**
 * Validates student Gmail format (must end with @gmail.com and have non-empty local part)
 */
export function isValidGmail(email: string): boolean {
  const clean = email.trim().toLowerCase();
  return /^[a-z0-9._%+-]+@gmail\.com$/.test(clean);
}

/**
 * Validates 4-digit PIN
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin.trim());
}

/**
 * Returns the RankDefinition for a given RP score
 */
export function getRankByRP(rp: number): RankDefinition {
  const clamped = Math.max(0, Math.floor(rp));
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (clamped >= RANK_TIERS[i].minRP) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

/**
 * Calculates RP change after a race based on placement, current RP, and playMode:
 * IMPORTANT (Requirement #2): Only matches in the official Teacher-hosted tournament ('teacher_cup')
 * count toward Ranked Points (RP). Practice AI and Friends PvP award 0 RP.
 */
export function calculateRPDelta(
  placement: number,
  totalRacers: number,
  currentRP: number,
  playMode: PlayModeCategory = 'teacher_cup'
): number {
  if (playMode !== 'teacher_cup') {
    return 0;
  }
  if (placement === 1) return 30;
  if (placement === 2 || placement === 3) return 20;
  if (placement >= 4 && placement <= 10 && placement <= Math.ceil(totalRacers / 2)) {
    return 10;
  }
  const half = Math.ceil(totalRacers / 2);
  if (placement <= half) {
    return placement <= 10 ? 10 : 5;
  }
  // Lower half
  const rank = getRankByRP(currentRP);
  if (rank.id === 'bronze') {
    return 0; // Rank Đồng không trừ điểm
  }
  return -5;
}

export const DIFFICULTY_COIN_MULTIPLIERS: Record<BotDifficulty, number> = {
  easy: 0.75,
  medium: 1.0,
  hard: 1.35,
  nightmare: 1.8,
};

/**
 * Lap multiplier: 3 laps = 1.0x baseline, 1 lap = 0.6x, 5 laps = 1.4x, 10 laps = 2.4x
 */
export function getLapCoinMultiplier(laps: number): number {
  const clamped = Math.max(1, Math.min(20, Math.floor(laps || 3)));
  return Number((0.4 + clamped * 0.2).toFixed(2));
}

/**
 * Determines whether headlights should turn on (Night / Dark environments only; Daytime = false)
 */
export function isNightMapTheme(theme: string): boolean {
  return (
    theme === 'dna' ||
    theme === 'cryo' ||
    theme === 'aorta' ||
    theme === 'synapse' ||
    theme === 'gastric' ||
    theme === 'airport' ||
    theme === 'polypeptide' ||
    theme === 'ribosome' ||
    theme === 'cochlea' ||
    theme === 'macrophage' ||
    theme === 'unknown_cell' ||
    theme === 'night'
  );
}

/**
 * Calculates Coin reward after a race, scaled by Bot Difficulty and Laps per match:
 * - Student Practice vs AI ('practice_ai'): Scaled by DIFFICULTY_COIN_MULTIPLIERS[botDifficulty] * getLapCoinMultiplier(laps)
 * - Student Friends Room ('friends_pvp'): Scaled by DIFFICULTY_COIN_MULTIPLIERS[botDifficulty] * getLapCoinMultiplier(laps)
 * - Teacher Official Tournament ('teacher_cup'): Scaled by laps relative to 5-lap standard
 */
export function calculateCoinReward(
  placement: number,
  isTeamWin: boolean = false,
  playMode?: PlayModeCategory,
  teacherRewards?: TournamentRewardConfig,
  botDifficulty: BotDifficulty = 'medium',
  laps: number = 3
): number {
  const diffMul = DIFFICULTY_COIN_MULTIPLIERS[botDifficulty] ?? 1.0;
  const lapMul = getLapCoinMultiplier(laps);

  if (playMode === 'practice_ai') {
    let base = 3;
    if (placement === 1) base = 12;
    else if (placement === 2) base = 9;
    else if (placement === 3) base = 7;
    else if (placement <= 10) base = 5;
    const raw = (base + (isTeamWin ? 5 : 0)) * diffMul * lapMul;
    return Math.max(1, Math.round(raw));
  }

  if (playMode === 'friends_pvp') {
    let base = 4;
    if (placement === 1) base = 18;
    else if (placement === 2) base = 14;
    else if (placement === 3) base = 10;
    else if (placement <= 10) base = 7;
    const raw = (base + (isTeamWin ? 8 : 0)) * diffMul * lapMul;
    return Math.max(1, Math.round(raw));
  }

  if (playMode === 'teacher_cup' && teacherRewards) {
    let base = teacherRewards.finishCoins;
    if (placement === 1) base = teacherRewards.top1Coins;
    else if (placement === 2) base = teacherRewards.top2Coins;
    else if (placement === 3) base = teacherRewards.top3Coins;
    else if (placement <= 10) base = teacherRewards.top10Coins;
    const teacherLapScale = Math.max(0.4, (laps || 5) / 5);
    const raw =
      (base + (isTeamWin ? teacherRewards.teamWinBonusCoins : 0)) *
      teacherLapScale;
    return Math.max(1, Math.round(raw));
  }

  let base = 5;
  if (placement === 1) base = 30;
  else if (placement === 2) base = 25;
  else if (placement === 3) base = 20;
  else if (placement === 4 || placement === 5) base = 15;
  else if (placement >= 6 && placement <= 10) base = 10;

  return Math.max(1, Math.round((base + (isTeamWin ? 15 : 0)) * diffMul * lapMul));
}

/**
 * Returns the coin compensation value of a part when pulled as a duplicate in Gacha.
 * Set to 20% of the item's price (or tier base value for starter items).
 */
export function getPartCoinValue(item: PartItem): number {
  const tierFallback: Record<PartTier, number> = {
    D: 15,
    C: 35,
    B: 75,
    A: 120,
    S: 180,
    SS: 250,
    SSS: 350,
  };
  const baseValue = item.price > 0 ? item.price : tierFallback[item.tier] || 20;
  return Math.max(1, Math.round(baseValue * 0.2));
}

/**
 * Gacha Spin Logic (50 Xu / spin):
 * - Stricter high-tier rates: D & C (60%), B & A (28%), S (9%), SS (2.5%), SSS (0.5%)
 * - Full Pool with Duplicate Compensation: Can roll any item in ALL_PARTS.
 *   If the rolled item is already in ownedParts, isDuplicate = true and refundCoins = getPartCoinValue(item).
 * - Pity System (GACHA_PITY_THRESHOLD = 20):
 *   If gachaPity >= 19 (i.e. 19 pulls without SS/SSS, this is the 20th pull),
 *   100% guaranteed to pull an SS or SSS item.
 *   Resets pity to 0 whenever an SS or SSS item is pulled; otherwise increments pity by 1.
 */
export function spinGachaPool(
  ownedParts: string[],
  currentPity: number,
  rng: () => number = Math.random,
  rateUpIds?: string[]
): {
  item: PartItem | null;
  newPity: number;
  isPityTriggered: boolean;
  isDuplicate: boolean;
  refundCoins: number;
} {
  if (ALL_PARTS.length === 0) {
    return {
      item: null,
      newPity: currentPity,
      isPityTriggered: false,
      isDuplicate: false,
      refundCoins: 0,
    };
  }

  const pityLimit = GACHA_PITY_THRESHOLD - 1; // 19 -> 20th spin triggers Pity
  const allMythic = ALL_PARTS.filter(
    (p) => p.tier === 'SS' || p.tier === 'SSS'
  );
  const rateUpPool =
    rateUpIds && rateUpIds.length > 0
      ? ALL_PARTS.filter((p) => rateUpIds.includes(p.id))
      : [];
  const rateUpMythic = rateUpPool.filter(
    (p) => p.tier === 'SS' || p.tier === 'SSS'
  );

  // Check Pity System (19 consecutive non-SS/SSS means 20th pull is guaranteed SS/SSS)
  if (currentPity >= pityLimit && allMythic.length > 0) {
    const baseMythicPool =
      rateUpMythic.length > 0 ? rateUpMythic : allMythic;
    const sssPool = baseMythicPool.filter((p) => p.tier === 'SSS');
    const ssPool = baseMythicPool.filter((p) => p.tier === 'SS');
    let chosenPool = baseMythicPool;
    if (sssPool.length > 0 && ssPool.length > 0) {
      chosenPool = rng() < 0.25 ? sssPool : ssPool;
    }
    const idx = Math.floor(rng() * chosenPool.length);
    const item = chosenPool[Math.min(idx, chosenPool.length - 1)];
    const isDuplicate = ownedParts.includes(item.id);
    return {
      item,
      newPity: 0,
      isPityTriggered: true,
      isDuplicate,
      refundCoins: isDuplicate ? getPartCoinValue(item) : 0,
    };
  }

  // Weighted roll across buckets:
  // Bucket 1: D & C (60% -> 0.00 .. 0.60)
  // Bucket 2: B & A (28% -> 0.60 .. 0.88)
  // Bucket 3: S     (9%  -> 0.88 .. 0.97)
  // Bucket 4: SS    (2.5% -> 0.97 .. 0.995)
  // Bucket 5: SSS   (0.5% -> 0.995 .. 1.00)
  const roll = rng();
  const bucketDC = ALL_PARTS.filter((p) => p.tier === 'D' || p.tier === 'C');
  const bucketBA = ALL_PARTS.filter((p) => p.tier === 'B' || p.tier === 'A');
  const bucketS = ALL_PARTS.filter((p) => p.tier === 'S');
  const bucketSS = ALL_PARTS.filter((p) => p.tier === 'SS');
  const bucketSSS = ALL_PARTS.filter((p) => p.tier === 'SSS');

  let targetBucket: PartItem[] = [];
  if (roll < 0.60) targetBucket = bucketDC;
  else if (roll < 0.88) targetBucket = bucketBA;
  else if (roll < 0.97) targetBucket = bucketS;
  else if (roll < 0.995) targetBucket = bucketSS;
  else targetBucket = bucketSSS;

  // If rolling into a bucket that contains active Banner Rate-Up skins, give rate-up priority (50% chance)
  if (rateUpPool.length > 0 && targetBucket.length > 0) {
    const rateUpInBucket = targetBucket.filter((p) => rateUpIds?.includes(p.id));
    if (rateUpInBucket.length > 0 && rng() < 0.55) {
      targetBucket = rateUpInBucket;
    }
  }

  if (targetBucket.length === 0) {
    targetBucket = ALL_PARTS;
  }

  const pickIdx = Math.floor(rng() * targetBucket.length);
  const picked = targetBucket[Math.min(pickIdx, targetBucket.length - 1)];
  const isMythic = picked.tier === 'SS' || picked.tier === 'SSS';
  const isDuplicate = ownedParts.includes(picked.id);

  return {
    item: picked,
    newPity: isMythic ? 0 : Math.min(pityLimit, currentPity + 1),
    isPityTriggered: false,
    isDuplicate,
    refundCoins: isDuplicate ? getPartCoinValue(picked) : 0,
  };
}

/**
 * Rolls one of the 4 items when picking up a gift box:
 * - Bottom half of the race standings gets +15% weight towards Nitro & Homing Rocket
 * - Leaders can still roll any of the 4 items normally
 */
export function rollRaceItem(
  placement: number,
  totalRacers: number,
  rng: () => number = Math.random
): RaceItemType {
  const isBottomHalf = placement > Math.ceil(totalRacers / 2);
  const r = rng();

  if (isBottomHalf) {
    // Bottom half: Nitro (32.5%), Rocket (32.5%), Banana (17.5%), Mud (17.5%) -> +15% combined boost to Nitro/Rocket over 50% baseline
    if (r < 0.325) return 'nitro';
    if (r < 0.65) return 'rocket';
    if (r < 0.825) return 'banana';
    return 'mud';
  } else {
    // Upper half / leaders: Equal 25% chance for all 4 items
    if (r < 0.25) return 'nitro';
    if (r < 0.50) return 'rocket';
    if (r < 0.75) return 'banana';
    return 'mud';
  }
}

/**
 * Auto-balances participants into N teams (2, 3, or 4) using snake-draft order sorted by RP descending
 */
export function balanceTeamsByRP<T extends { id: string; rp: number }>(
  players: T[],
  teamCount: 2 | 3 | 4
): (T & { teamId: number })[] {
  const sorted = [...players].sort((a, b) => b.rp - a.rp);
  return sorted.map((player, index) => {
    const cycle = Math.floor(index / teamCount);
    const posInCycle = index % teamCount;
    const teamId =
      cycle % 2 === 0 ? posInCycle + 1 : teamCount - posInCycle;
    return {
      ...player,
      teamId,
    };
  });
}

/**
 * Distance from point P to segment AB
 */
export function distanceToSegment(p: Point2D, a: Point2D, b: Point2D): {
  distance: number;
  projX: number;
  projY: number;
  t: number;
} {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const dist = Math.hypot(p.x - a.x, p.y - a.y);
    return { distance: dist, projX: a.x, projY: a.y, t: 0 };
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return {
    distance: Math.hypot(p.x - projX, p.y - projY),
    projX,
    projY,
    t,
  };
}

/**
 * Evaluates whether a car is on the asphalt road (main loop, shortcut, or secret branches),
 * supporting per-waypoint Variable Track Width, 2-Level Overpasses (elevation 0 vs 1),
 * Zero-G Glass Bridges (noGuardrail), and Point-to-Point maps.
 */
export function isPointOnTrack(
  p: Point2D,
  map: MapDefinition,
  preferredElevation?: 0 | 1,
  carAngle?: number
): {
  onRoad: boolean;
  onShortcut: boolean;
  onSecretBranch: boolean;
  minDistance: number;
  nearestSegmentIdx: number;
  nearestPoint: Point2D;
  effectiveHalfWidth: number;
  roadHalfWidth: number;
  elevation: 0 | 1;
  noGuardrail: boolean;
  surfaceType: TrackSurfaceType;
  lateralSide: number; // < 0 = left half of road, > 0 = right half of road
} {
  let bestScore = Infinity;
  let minDistance = Infinity;
  let nearestSegmentIdx = 0;
  let nearestPoint: Point2D = { x: map.waypoints[0].x, y: map.waypoints[0].y };
  let onShortcut = false;
  let onSecretBranch = false;
  let effectiveHalfWidth = map.roadWidth * 0.5;
  let matchedElevation: 0 | 1 = map.waypoints[0]?.elevation ?? 0;
  let matchedNoGuardrail = false;
  let matchedSurface: TrackSurfaceType = map.waypoints[0]?.surfaceType || 'asphalt';
  let lateralSide = 0;

  const pts = map.waypoints;
  const segCount = map.isPointToPoint ? Math.max(1, pts.length - 1) : pts.length;

  // Pre-check whether the car is physically within the deck corridor of any `1 -> 1` overpass bridge
  // or any `0 -> 0` ground road. A car with `preferredElevation === 1` can ONLY stay locked to
  // elevation 1 while it is physically on a `1 -> 1` bridge deck (or the top portal of a ramp).
  let isPhysicallyOnBridgeDeck = false;
  let isPhysicallyOnGroundRoad = false;
  for (let i = 0; i < segCount; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const elevA: 0 | 1 = a.elevation ?? 0;
    const elevB: 0 | 1 = b.elevation ?? 0;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    const rawT = lenSq > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq : 0;
    const res = distanceToSegment(p, a, b);
    const wA = a.width ?? map.roadWidth;
    const wB = b.width ?? map.roadWidth;
    const segHalfW = (wA + (wB - wA) * res.t) * 0.5;

    if (elevA === 1 && elevB === 1) {
      if (res.distance <= segHalfW * 1.18 && rawT >= -0.05 && rawT <= 1.05) {
        isPhysicallyOnBridgeDeck = true;
      }
    } else if (elevA === 0 && elevB === 0) {
      if (res.distance <= segHalfW * 1.25 && rawT >= -0.08 && rawT <= 1.08) {
        isPhysicallyOnGroundRoad = true;
      }
    }
  }

  for (let i = 0; i < segCount; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const res = distanceToSegment(p, a, b);

    // Smoothly interpolate road width between waypoint A and waypoint B
    const wA = a.width ?? map.roadWidth;
    const wB = b.width ?? map.roadWidth;
    let segHalfWidth = (wA + (wB - wA) * res.t) * 0.5;

    if (
      map.bridgeSegment &&
      i >= map.bridgeSegment.startIdx &&
      i <= map.bridgeSegment.endIdx &&
      a.width === undefined
    ) {
      segHalfWidth = map.roadWidth * 0.36;
    }
    if (map.bottleneckSegments && a.width === undefined) {
      for (const bn of map.bottleneckSegments) {
        if (i >= bn.startIdx && i <= bn.endIdx) {
          segHalfWidth = map.roadWidth * 0.34;
          break;
        }
      }
    }

    const elevA: 0 | 1 = a.elevation ?? 0;
    const elevB: 0 | 1 = b.elevation ?? 0;
    const isTransitionSeg = elevA !== elevB;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    const len = Math.sqrt(lenSq);
    const rawT = lenSq > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq : 0;
    const segAngle = Math.atan2(dy, dx);
    const alignCos =
      carAngle !== undefined && Number.isFinite(carAngle)
        ? Math.abs(Math.cos(carAngle - segAngle))
        : 1.0;

    // Strict Ramp & Overpass Elevation Rule:
    // - A car at preferredElevation === 0 can ONLY transition to elevation 1 by driving ON THE ROAD
    //   (res.distance <= segHalfWidth * 1.02) along an Up-Ramp (0 -> 1, res.t >= 0.18).
    //   It can NEVER jump from off-road grass onto a Level 1 bridge or ramp!
    // - On exit down-ramps (1 -> 0), switch to elevation 0 once past the top threshold (res.t >= 0.18).
    const isWithinRampCorridor =
      res.distance <= segHalfWidth * 1.02 && rawT >= -0.05 && rawT <= 1.05;
    let segElev: 0 | 1 = 0;
    if (elevA === 1 && elevB === 1) {
      // Pure Bridge segment (1 -> 1): only cars ALREADY on elevation 1 (or when preferredElevation is undefined) can be on elevation 1
      segElev = preferredElevation === 0 ? 0 : 1;
    } else if (isTransitionSeg) {
      if (elevB === 1) {
        // Up-Ramp (0 -> 1): switch to Level 1 early on the ramp (t >= 0.18) so the car is never covered by Pass 2
        segElev =
          isWithinRampCorridor &&
          (res.t >= 0.18 || (preferredElevation === 1 && res.t >= 0.05))
            ? 1
            : 0;
      } else {
        // Down-Ramp (1 -> 0): stay on Level 1 across the top joint (t < 0.18), then transition to Level 0
        segElev =
          preferredElevation === 1 && isWithinRampCorridor && res.t < 0.18
            ? 1
            : 0;
      }
    }

    let score = res.distance;

    // Longitudinal overshoot penalty when the car has already passed the start/end of this segment
    // so the adjacent segment the car is actually inside (0 <= rawT <= 1) wins cleanly at junctions
    if (rawT < 0) {
      score += Math.min(180, -rawT * len * 0.35);
    } else if (rawT > 1) {
      score += Math.min(180, (rawT - 1) * len * 0.35);
    }

    // Directional alignment preference so at intersections the segment matching the car's heading wins
    if (carAngle !== undefined && Number.isFinite(carAngle)) {
      score += (1 - alignCos) * 90;
    }

    // 2-Level Overpass / Underpass Disambiguation:
    // - Pure Bridge segments (1 -> 1) can NEVER be selected by a car currently at preferredElevation === 0
    //   (prevents cars on Level 0 or off-road grass from ever snapping up onto an overhead bridge!).
    // - Pure Ground segments (0 -> 0) are penalized when a car at preferredElevation === 1 is physically on a bridge deck.
    if (elevA === 1 && elevB === 1) {
      if (preferredElevation === 0 || !isPhysicallyOnBridgeDeck) {
        score += 1200;
      }
    } else if (elevA === 0 && elevB === 0) {
      if (preferredElevation === 1 && isPhysicallyOnBridgeDeck) {
        score += 650;
      }
    } else if (isTransitionSeg) {
      if (
        carAngle !== undefined &&
        alignCos < 0.45 &&
        preferredElevation !== undefined &&
        segElev !== preferredElevation
      ) {
        score += 320;
      }
    }

    if (score < bestScore) {
      bestScore = score;
      minDistance = res.distance;
      nearestSegmentIdx = i;
      nearestPoint = { x: res.projX, y: res.projY };
      onShortcut = false;
      onSecretBranch = false;
      effectiveHalfWidth = segHalfWidth;
      matchedElevation = segElev;
      matchedNoGuardrail = Boolean(a.noGuardrail && b.noGuardrail);
      matchedSurface = a.surfaceType || b.surfaceType || 'asphalt';

      // Signed lateral side relative to segment direction AB
      const cross = dx * (p.y - res.projY) - dy * (p.x - res.projX);
      lateralSide = cross < 0 ? -1 : 1;
    }
  }

  // Check main shortcut segments
  const sc = map.shortcut?.path || [];
  const shortcutHalfRatio = map.shortcut?.widthRatio
    ? map.shortcut.widthRatio * 0.5
    : 0.38;
  for (let i = 0; i < sc.length - 1; i++) {
    const a = sc[i];
    const b = sc[i + 1];
    const res = distanceToSegment(p, a, b);
    const segHalfW = a.width
      ? ((a.width + ((b.width ?? a.width) - a.width) * res.t) * 0.5)
      : map.roadWidth * shortcutHalfRatio;
    const segElev: 0 | 1 = a.elevation ?? b.elevation ?? 0;
    // Slight +12 bias so main road wins at shared entry/exit junction points
    let score = res.distance + 12;
    if (
      preferredElevation === 1 &&
      isPhysicallyOnBridgeDeck &&
      segElev === 0
    ) {
      score += 450;
    }
    if (score < bestScore && res.distance <= segHalfW * 1.15) {
      bestScore = score;
      minDistance = res.distance;
      nearestPoint = { x: res.projX, y: res.projY };
      onShortcut = true;
      onSecretBranch = false;
      effectiveHalfWidth = segHalfW;
      matchedElevation = segElev;
      matchedNoGuardrail = Boolean(a.noGuardrail && b.noGuardrail);
      matchedSurface = a.surfaceType || b.surfaceType || 'asphalt';
      nearestSegmentIdx =
        i === 0
          ? map.shortcut.entryWaypointIndex
          : i >= sc.length - 2
          ? map.shortcut.exitWaypointIndex
          : Math.floor(
              (map.shortcut.entryWaypointIndex + map.shortcut.exitWaypointIndex) / 2
            );
    }
  }

  // Check secret branches (e.g. Map 15 Cave 3-way split & Waterfall Suspension Bridge)
  if (map.secretBranches) {
    for (const branch of map.secretBranches) {
      const bPts = branch.path;
      for (let i = 0; i < bPts.length - 1; i++) {
        const a = bPts[i];
        const b = bPts[i + 1];
        const res = distanceToSegment(p, a, b);
        const segHalfW = (a.width ?? branch.width) * 0.5;
        const segElev: 0 | 1 = a.elevation ?? branch.elevation ?? 0;
        // Add +18 bias so when driving on the main cave road, main road always takes priority
        let score = res.distance + 18;
        if (
          preferredElevation === 1 &&
          isPhysicallyOnBridgeDeck &&
          segElev === 0 &&
          i > 0 &&
          i < bPts.length - 2
        ) {
          score += 450;
        }
        if (score < bestScore && res.distance <= segHalfW * 1.15) {
          bestScore = score;
          minDistance = res.distance;
          nearestPoint = { x: res.projX, y: res.projY };
          onShortcut = false;
          onSecretBranch = true;
          effectiveHalfWidth = segHalfW;
          matchedElevation = segElev;
          matchedNoGuardrail = Boolean(a.noGuardrail && b.noGuardrail);
          matchedSurface = a.surfaceType || 'cave';
          nearestSegmentIdx =
            i === 0
              ? branch.entryWaypointIndex
              : i >= bPts.length - 2
              ? branch.exitWaypointIndex
              : Math.floor((branch.entryWaypointIndex + branch.exitWaypointIndex) / 2);
        }
      }
    }
  }

  // Hard geometric safety invariant:
  // 1. A car at preferredElevation === 0 can NEVER jump onto elevation 1 unless it is on-road inside an Up-Ramp.
  // 2. A car at elevation 1 that goes outside the road width of a bridge/ramp drops to elevation 0.
  if (
    matchedElevation === 1 &&
    ((!isPhysicallyOnBridgeDeck && minDistance > effectiveHalfWidth * 1.02) ||
      (preferredElevation === 0 && minDistance > effectiveHalfWidth * 1.02))
  ) {
    matchedElevation = 0;
  }

  return {
    onRoad: minDistance <= effectiveHalfWidth,
    onShortcut,
    onSecretBranch,
    minDistance,
    nearestSegmentIdx,
    nearestPoint,
    effectiveHalfWidth,
    roadHalfWidth: effectiveHalfWidth,
    elevation: matchedElevation,
    noGuardrail: matchedNoGuardrail,
    surfaceType: matchedSurface,
    lateralSide,
  };
}

/**
 * Returns true if a car at `elevation: 0` (underpass) is currently positioned
 * directly underneath an `elevation: 1` overpass bridge deck so an X-Ray outline
 * and underpass status badge can be rendered on top of the bridge.
 */
export function isCarUnderOverpassBridge(
  p: Point2D,
  carElevation: number | undefined,
  map: MapDefinition
): boolean {
  if ((carElevation ?? 0) !== 0) return false;
  const pts = map.waypoints;
  const segCount = map.isPointToPoint ? Math.max(0, pts.length - 1) : pts.length;
  for (let i = 0; i < segCount; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if ((a.elevation ?? 0) !== 1 || (b.elevation ?? 0) !== 1) continue;
    const res = distanceToSegment(p, a, b);
    const wA = a.width ?? map.roadWidth;
    const wB = b.width ?? map.roadWidth;
    const bridgeHalfW = (wA + (wB - wA) * res.t) * 0.5 + 26;
    if (res.distance <= bridgeHalfW) {
      return true;
    }
  }
  return false;
}

/**
 * Formats the final leaderboard into a clean clipboard string:
 * "Hạng - Tên Học Sinh - Xu Nhận Được"
 */
export function formatLeaderboardClipboard(
  standings: { placement: number; username: string; coinsEarned: number }[]
): string {
  const header = 'BẢNG XẾP HẠNG TRIPLE D OPEN CUP\nHạng - Tên Học Sinh - Xu Nhận Được';
  const rows = standings.map(
    (s) => `Hạng ${s.placement} - ${s.username} - +${s.coinsEarned} Xu`
  );
  return [header, ...rows].join('\n');
}

interface TrackArcTable {
  segCount: number;
  segLengths: number[];
  cumLengths: number[];
  totalLength: number;
}

const trackArcTableCache = new Map<string, TrackArcTable>();

function getTrackArcTable(map: MapDefinition): TrackArcTable {
  const cached = trackArcTableCache.get(map.id);
  const pts = map.waypoints;
  const segCount = map.isPointToPoint ? Math.max(1, pts.length - 1) : pts.length;
  if (cached && cached.segCount === segCount) {
    return cached;
  }
  const segLengths: number[] = new Array(segCount);
  const cumLengths: number[] = new Array(segCount + 1);
  cumLengths[0] = 0;
  for (let i = 0; i < segCount; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const len = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    segLengths[i] = len;
    cumLengths[i + 1] = cumLengths[i] + len;
  }
  const table: TrackArcTable = {
    segCount,
    segLengths,
    cumLengths,
    totalLength: Math.max(1, cumLengths[segCount]),
  };
  trackArcTableCache.set(map.id, table);
  return table;
}

/**
 * Computes fractional arc-length progress [0..1] and minimum distance along an arbitrary polyline
 * (used for shortcuts and secret branches).
 */
function projectOntoPolyline(
  p: Point2D,
  path: Point2D[]
): { fraction: number; minDistance: number; projX: number; projY: number } {
  if (path.length < 2) {
    return { fraction: 0, minDistance: Infinity, projX: p.x, projY: p.y };
  }
  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const len = Math.max(1, Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y));
    segLengths.push(len);
    totalLen += len;
  }
  let bestDist = Infinity;
  let bestCumDist = 0;
  let bestProjX = path[0].x;
  let bestProjY = path[0].y;
  let runningCum = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const res = distanceToSegment(p, path[i], path[i + 1]);
    if (res.distance < bestDist) {
      bestDist = res.distance;
      bestCumDist = runningCum + res.t * segLengths[i];
      bestProjX = res.projX;
      bestProjY = res.projY;
    }
    runningCum += segLengths[i];
  }
  return {
    fraction: totalLen > 0 ? Math.max(0, Math.min(1, bestCumDist / totalLen)) : 0,
    minDistance: bestDist,
    projX: bestProjX,
    projY: bestProjY,
  };
}

/**
 * Rescues a stuck or fallen car directly onto the nearest road segment on the SAME elevation level
 * within the racer's current checkpoint window, with 1.5s invulnerability.
 * NEVER advances `currentCheckpoint` or `lap`, and NEVER wraps a car at the start line (`cp = 0`)
 * onto the final segments (`segCount - 1`) of the lap!
 */
export function applyCarRescue(
  racer: RacerState,
  map: MapDefinition
): RacerState {
  const pts = map.waypoints;
  const segCount = map.isPointToPoint ? Math.max(1, pts.length - 1) : pts.length;
  const currentElev: 0 | 1 = racer.elevation ?? 0;
  const cpCount = map.checkpointIndices.length;
  const cp = Math.max(0, Math.min(cpCount - 1, racer.currentCheckpoint ?? 0));
  const cpStartSeg = map.checkpointIndices[cp] ?? 0;
  const nextCp = (cp + 1) % cpCount;
  const cpEndSeg =
    nextCp === 0
      ? segCount - 1
      : Math.max(cpStartSeg, map.checkpointIndices[nextCp] ?? segCount - 1);

  // Constrain ground-level rescue to the racer's active checkpoint window so:
  // 1) A racer starting behind the start line (cp === 0) NEVER snaps to the final segment (segCount - 1).
  // 2) A racer knocked off-road near an intersection NEVER jumps to a later or earlier loop of the track.
  const winStart = cp === 0 ? 0 : Math.max(0, cpStartSeg - 1);
  const winEnd = Math.min(segCount - 1, cpEndSeg);

  let bestSegIdx = cpStartSeg;
  let bestProjX = pts[bestSegIdx]?.x ?? pts[0].x;
  let bestProjY = pts[bestSegIdx]?.y ?? pts[0].y;
  let bestElev: 0 | 1 = currentElev;

  if (Number.isFinite(racer.x) && Number.isFinite(racer.y)) {
    let bestRescueScore = Infinity;
    for (let i = 0; i < segCount; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const res = distanceToSegment({ x: racer.x, y: racer.y }, a, b);
      const isBridgeSeg = (a.elevation ?? 0) === 1 && (b.elevation ?? 0) === 1;
      const segElev: 0 | 1 = isBridgeSeg ? 1 : 0;

      // Never switch elevation levels during [R] rescue!
      const elevPenalty = segElev !== currentElev ? 2500 : 0;

      let progressPenalty = 0;
      if (currentElev === 0) {
        if (i < winStart) {
          progressPenalty = (winStart - i) * 140 + 600;
        } else if (i > winEnd) {
          progressPenalty = (i - winEnd) * 140 + 600;
        }
        // Extra guard at the start of a lap (cp === 0): forbid snapping to the final segments before the finish line
        if (cp === 0 && i >= Math.max(winEnd + 1, segCount - 4)) {
          progressPenalty += 5000;
        }
      }

      const rescueScore = res.distance + elevPenalty + progressPenalty;
      if (rescueScore < bestRescueScore) {
        bestRescueScore = rescueScore;
        bestSegIdx = i;
        bestProjX = res.projX;
        bestProjY = res.projY;
        bestElev = segElev;
      }
    }
  }

  const wp = pts[bestSegIdx] || pts[0];
  const nextWpIdx = map.isPointToPoint
    ? Math.min(pts.length - 1, bestSegIdx + 1)
    : (bestSegIdx + 1) % pts.length;
  const nextWp = pts[nextWpIdx] || wp;
  const angle = Math.atan2(nextWp.y - wp.y, nextWp.x - wp.x);

  // Give bots a slight lateral offset on rescue so multiple rescued bots never stack on one point
  let lateralOffset = 0;
  if (racer.isBot) {
    let hash = 0;
    for (let i = 0; i < racer.id.length; i++) {
      hash = (hash * 31 + racer.id.charCodeAt(i)) | 0;
    }
    lateralOffset = ((Math.abs(hash) % 5) - 2) * 18;
  }
  const perpAngle = angle + Math.PI / 2;

  return {
    ...racer,
    x: bestProjX + Math.cos(perpAngle) * lateralOffset,
    y: bestProjY + Math.sin(perpAngle) * lateralOffset,
    vx: 0,
    vy: 0,
    speed: 0,
    angle,
    angularVelocity: 0,
    elevation: bestElev,
    waypointIndex: nextWpIdx,
    // Never advance currentCheckpoint or visitedCheckpointsMask on [R] rescue!
    currentCheckpoint: cp,
    visitedCheckpointsMask:
      racer.visitedCheckpointsMask ?? ((1 << (cp + 1)) - 1),
    useShortcutThisLap: false,
    isNavigatingShortcut: false,
    invulnerableTimer: 1.5,
    stuckTimer: 0,
    spinTimer: 0,
    stunTimer: 0,
    wrongWay: false,
  };
}

/**
 * Calculates a racer's true continuous progress along the map's road spline (arc-length parameterization),
 * constrained to the racer's sequential checkpoint window so that:
 * 1) Leaderboard ranking is 100% based on actual road distance driven along the map, NEVER Euclidean ("đường chim bay") distance.
 * 2) Cars on later segments within the same checkpoint always rank ahead of cars on earlier segments.
 * 3) Cars on the starting grid behind `waypoints[0]` have smooth negative `trackDist` (-189px .. -45px -> 0px -> +totalLength).
 * 4) Cars on shortcuts or secret branches have their progress smoothly interpolated between entry and exit waypoints.
 */
export function computeRacerTrackProgress(
  racer: Pick<
    RacerState,
    | 'x'
    | 'y'
    | 'lap'
    | 'currentCheckpoint'
    | 'elevation'
    | 'isNavigatingShortcut'
  >,
  map: MapDefinition
): {
  totalProgress: number;
  lapFraction: number;
  trackDist: number;
  totalLength: number;
  activeSegmentIdx: number;
  segmentT: number;
  minRoadDist: number;
  onShortcut: boolean;
  onSecretBranch: boolean;
} {
  const pts = map.waypoints;
  const arc = getTrackArcTable(map);
  const segCount = arc.segCount;
  const cpCount = map.checkpointIndices.length;
  const cp = Math.max(0, Math.min(cpCount - 1, racer.currentCheckpoint ?? 0));
  const cpStartSeg = map.checkpointIndices[cp] ?? 0;
  const nextCp = (cp + 1) % cpCount;
  const cpEndSeg =
    nextCp === 0
      ? segCount - 1
      : Math.max(cpStartSeg, map.checkpointIndices[nextCp] ?? segCount - 1);

  const p = { x: racer.x, y: racer.y };

  // Special handling for the starting grid just behind `waypoints[0]` when `cp === 0`:
  // Measure signed longitudinal projection along segment 0 (`waypoints[0] -> waypoints[1]`).
  if (cp === 0 && pts.length >= 2) {
    const p0 = pts[0];
    const p1 = pts[1];
    const dx0 = p1.x - p0.x;
    const dy0 = p1.y - p0.y;
    const len0 = Math.max(1, Math.hypot(dx0, dy0));
    const startProj = ((p.x - p0.x) * dx0 + (p.y - p0.y) * dy0) / len0;
    const lateralDist = Math.abs((p.x - p0.x) * -dy0 + (p.y - p0.y) * dx0) / len0;
    if (startProj < 0 && startProj >= -420 && lateralDist <= map.roadWidth * 1.4) {
      const lapFraction = startProj / arc.totalLength;
      return {
        totalProgress: (racer.lap - 1) * 1000 + lapFraction * 1000,
        lapFraction,
        trackDist: startProj,
        totalLength: arc.totalLength,
        activeSegmentIdx: 0,
        segmentT: 0,
        minRoadDist: lateralDist,
        onShortcut: false,
        onSecretBranch: false,
      };
    }
  }

  // Constrain main-track segment search to [winStart, winEnd] around the racer's current checkpoint
  const winStart = cp === 0 ? 0 : Math.max(0, cpStartSeg - 1);
  const winEnd = Math.min(segCount - 1, cpEndSeg + 1);

  let bestSegIdx = cpStartSeg;
  let bestSegT = 0;
  let bestScore = Infinity;
  let bestDist = Infinity;

  for (let i = winStart; i <= winEnd; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const res = distanceToSegment(p, a, b);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    const rawT = lenSq > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq : 0;

    let score = res.distance;
    if (rawT < 0) {
      score += Math.min(160, -rawT * arc.segLengths[i] * 0.35);
    } else if (rawT > 1) {
      score += Math.min(160, (rawT - 1) * arc.segLengths[i] * 0.35);
    }

    const isBridgeSeg = (a.elevation ?? 0) === 1 && (b.elevation ?? 0) === 1;
    if (racer.elevation !== undefined && (isBridgeSeg ? 1 : 0) !== racer.elevation) {
      score += 450;
    }

    if (score < bestScore) {
      bestScore = score;
      bestDist = res.distance;
      bestSegIdx = i;
      bestSegT = res.t;
    }
  }

  let trackDist = arc.cumLengths[bestSegIdx] + bestSegT * arc.segLengths[bestSegIdx];
  let onShortcut = false;
  let onSecretBranch = false;

  // Check if racer is legitimately inside the shortcut corridor (only when cp is within the shortcut's checkpoint range)
  if (map.shortcut && map.shortcut.path.length >= 2) {
    const entryWp = map.shortcut.entryWaypointIndex;
    const exitWp = map.shortcut.exitWaypointIndex;
    if (cpStartSeg >= Math.max(0, entryWp - 2) && cpStartSeg <= exitWp + 1) {
      const scProj = projectOntoPolyline(p, map.shortcut.path);
      const scHalfW =
        map.roadWidth * (map.shortcut.widthRatio ? map.shortcut.widthRatio * 0.5 : 0.42);
      if (
        scProj.minDistance <= scHalfW * 1.2 &&
        (racer.isNavigatingShortcut || scProj.minDistance + 10 < bestDist)
      ) {
        const entryDist = arc.cumLengths[Math.min(segCount, entryWp)];
        const exitDist = arc.cumLengths[Math.min(segCount, exitWp)];
        trackDist = entryDist + scProj.fraction * Math.max(1, exitDist - entryDist);
        bestDist = scProj.minDistance;
        onShortcut = true;
      }
    }
  }

  // Check secret branches (Map 15)
  if (!onShortcut && map.secretBranches) {
    for (const branch of map.secretBranches) {
      if (branch.path.length < 2) continue;
      const entryWp = branch.entryWaypointIndex;
      const exitWp = branch.exitWaypointIndex;
      if (cpStartSeg >= Math.max(0, entryWp - 2) && cpStartSeg <= exitWp + 1) {
        const brProj = projectOntoPolyline(p, branch.path);
        const brHalfW = branch.width * 0.5;
        if (brProj.minDistance <= brHalfW * 1.2 && brProj.minDistance + 14 < bestDist) {
          const entryDist = arc.cumLengths[Math.min(segCount, entryWp)];
          const exitDist = arc.cumLengths[Math.min(segCount, exitWp)];
          trackDist = entryDist + brProj.fraction * Math.max(1, exitDist - entryDist);
          bestDist = brProj.minDistance;
          onSecretBranch = true;
          break;
        }
      }
    }
  }

  const lapFraction = Math.max(-0.08, Math.min(0.9999, trackDist / arc.totalLength));
  const totalProgress = (racer.lap - 1) * 1000 + lapFraction * 1000;

  return {
    totalProgress,
    lapFraction,
    trackDist,
    totalLength: arc.totalLength,
    activeSegmentIdx: bestSegIdx,
    segmentT: bestSegT,
    minRoadDist: bestDist,
    onShortcut,
    onSecretBranch,
  };
}

/**
 * Enforces strict sequential checkpoint progression (`0 -> 1 -> 2 -> ... -> M - 1`)
 * and verifies that ALL checkpoints on the track (`visitedCheckpointsMask === (1 << M) - 1`)
 * have been passed before counting a completed lap!
 */
export function updateRacerCheckpointState(
  racer: RacerState,
  map: MapDefinition,
  onShortcutNow = false,
  onSecretBranchNow = false
): {
  lapCompleted: boolean;
  checkpointAdvanced: boolean;
  totalProgress: number;
  activeSegmentIdx: number;
} {
  const cpCount = map.checkpointIndices.length;
  const allCheckpointsMask = (1 << cpCount) - 1;
  const arc = getTrackArcTable(map);

  // Ensure visitedCheckpointsMask is initialized consistently with currentCheckpoint
  if (racer.visitedCheckpointsMask === undefined || racer.visitedCheckpointsMask === 0) {
    const safeCp = Math.max(0, Math.min(cpCount - 1, racer.currentCheckpoint || 0));
    racer.visitedCheckpointsMask = (1 << (safeCp + 1)) - 1;
  }

  let checkpointAdvanced = false;
  let lapCompleted = false;

  // 1. Progressive Shortcut Checkpoint Credit (ONLY if racer has already reached the checkpoint before shortcut entry!)
  if (map.shortcut && map.shortcut.path.length >= 2) {
    const entryWp = map.shortcut.entryWaypointIndex;
    const exitWp = map.shortcut.exitWaypointIndex;
    let entryCp = 0;
    for (let c = 0; c < cpCount; c++) {
      if (map.checkpointIndices[c] <= entryWp) {
        entryCp = c;
      }
    }
    const requiredEntryMask = (1 << (entryCp + 1)) - 1;
    const hasPassedShortcutEntry =
      racer.currentCheckpoint >= entryCp &&
      (racer.visitedCheckpointsMask & requiredEntryMask) === requiredEntryMask;

    if (hasPassedShortcutEntry) {
      const scExit = map.shortcut.path[map.shortcut.path.length - 1];
      const distToScExit = Math.hypot(racer.x - scExit.x, racer.y - scExit.y);
      const scProj = projectOntoPolyline({ x: racer.x, y: racer.y }, map.shortcut.path);
      const isActivelyOnShortcut =
        onShortcutNow ||
        Boolean(racer.isNavigatingShortcut) ||
        distToScExit < map.roadWidth * 0.95;

      if (isActivelyOnShortcut) {
        const entryDist = arc.cumLengths[Math.min(arc.segCount, entryWp)];
        const exitDist = arc.cumLengths[Math.min(arc.segCount, exitWp)];
        const currentScTrackDist =
          distToScExit < map.roadWidth * 0.95
            ? exitDist
            : entryDist + scProj.fraction * Math.max(1, exitDist - entryDist);

        for (let c = entryCp + 1; c < cpCount; c++) {
          const cpWp = map.checkpointIndices[c];
          if (cpWp >= entryWp && cpWp <= exitWp) {
            const cpDist = arc.cumLengths[Math.min(arc.segCount, cpWp)];
            if (currentScTrackDist >= cpDist - 40 && c === racer.currentCheckpoint + 1) {
              racer.currentCheckpoint = c;
              racer.visitedCheckpointsMask |= 1 << c;
              checkpointAdvanced = true;
            }
          }
        }
      }
    }
  }

  // 2. Progressive Secret Branch Checkpoint Credit (Map 15)
  if (map.secretBranches) {
    for (const branch of map.secretBranches) {
      if (branch.path.length < 2) continue;
      const entryWp = branch.entryWaypointIndex;
      const exitWp = branch.exitWaypointIndex;
      let entryCp = 0;
      for (let c = 0; c < cpCount; c++) {
        if (map.checkpointIndices[c] <= entryWp) {
          entryCp = c;
        }
      }
      const requiredEntryMask = (1 << (entryCp + 1)) - 1;
      const hasPassedEntry =
        racer.currentCheckpoint >= entryCp &&
        (racer.visitedCheckpointsMask & requiredEntryMask) === requiredEntryMask;

      if (hasPassedEntry) {
        const brExit = branch.path[branch.path.length - 1];
        const distToBrExit = Math.hypot(racer.x - brExit.x, racer.y - brExit.y);
        const brProj = projectOntoPolyline({ x: racer.x, y: racer.y }, branch.path);
        if (onSecretBranchNow || distToBrExit < branch.width * 1.1) {
          const entryDist = arc.cumLengths[Math.min(arc.segCount, entryWp)];
          const exitDist = arc.cumLengths[Math.min(arc.segCount, exitWp)];
          const currentBrTrackDist =
            distToBrExit < branch.width * 1.1
              ? exitDist
              : entryDist + brProj.fraction * Math.max(1, exitDist - entryDist);

          for (let c = entryCp + 1; c < cpCount; c++) {
            const cpWp = map.checkpointIndices[c];
            if (cpWp >= entryWp && cpWp <= exitWp) {
              const cpDist = arc.cumLengths[Math.min(arc.segCount, cpWp)];
              if (currentBrTrackDist >= cpDist - 40 && c === racer.currentCheckpoint + 1) {
                racer.currentCheckpoint = c;
                racer.visitedCheckpointsMask |= 1 << c;
                checkpointAdvanced = true;
              }
            }
          }
        }
      }
    }
  }

  // 3. Sequential Main-Track Checkpoint & Full-Lap Verification
  const prog = computeRacerTrackProgress(racer, map);

  if (map.isPointToPoint) {
    const nextCpIdx = Math.min(cpCount - 1, racer.currentCheckpoint + 1);
    const nextCpWpIdx = map.checkpointIndices[nextCpIdx];
    const cpPt = map.waypoints[nextCpWpIdx];
    const cpRadius = Math.max(map.roadWidth, cpPt.width ?? map.roadWidth) * 1.15;
    const distToCp = Math.hypot(racer.x - cpPt.x, racer.y - cpPt.y);
    const reachedBySpline =
      nextCpIdx < cpCount - 1 &&
      prog.minRoadDist <= Math.max(map.roadWidth, cpPt.width ?? map.roadWidth) * 0.95 &&
      prog.activeSegmentIdx >= nextCpWpIdx &&
      prog.activeSegmentIdx <= nextCpWpIdx + 2;

    if (distToCp < cpRadius || reachedBySpline) {
      const preFinishMask = (1 << (cpCount - 1)) - 1;
      if (
        nextCpIdx === cpCount - 1 &&
        racer.currentCheckpoint === cpCount - 2 &&
        (racer.visitedCheckpointsMask & preFinishMask) === preFinishMask
      ) {
        racer.lap += 1;
        racer.currentCheckpoint = 0;
        racer.visitedCheckpointsMask = 1;
        lapCompleted = true;
      } else if (nextCpIdx === racer.currentCheckpoint + 1 && nextCpIdx < cpCount - 1) {
        racer.currentCheckpoint = nextCpIdx;
        racer.visitedCheckpointsMask |= 1 << nextCpIdx;
        checkpointAdvanced = true;
      }
    }
  } else {
    const nextCpIdx = (racer.currentCheckpoint + 1) % cpCount;
    const nextCpWpIdx = map.checkpointIndices[nextCpIdx];
    const cpPt = map.waypoints[nextCpWpIdx];
    const cpRadius = Math.max(map.roadWidth, cpPt.width ?? map.roadWidth) * 1.05;
    const distToNextCp = Math.hypot(racer.x - cpPt.x, racer.y - cpPt.y);

    if (nextCpIdx > 0) {
      // Intermediate checkpoint (1 .. cpCount - 1): must be visited in strict sequence
      const reachedBySpline =
        prog.minRoadDist <= Math.max(map.roadWidth, cpPt.width ?? map.roadWidth) * 0.95 &&
        prog.activeSegmentIdx >= nextCpWpIdx &&
        prog.activeSegmentIdx <= nextCpWpIdx + 1 &&
        prog.trackDist >= arc.cumLengths[nextCpWpIdx] - 25;

      if (distToNextCp < cpRadius || reachedBySpline) {
        racer.currentCheckpoint = nextCpIdx;
        racer.visitedCheckpointsMask |= 1 << nextCpIdx;
        checkpointAdvanced = true;
      }
    } else {
      // Finish Line (`nextCpIdx === 0` at `waypoints[0]`):
      // Require that the racer is on the final checkpoint (`cpCount - 1`), has visited ALL checkpoints `0..cpCount-1`
      // in sequence during this lap, and has physically reached the Start/Finish line!
      const hasVisitedAllCheckpoints =
        racer.currentCheckpoint === cpCount - 1 &&
        (racer.visitedCheckpointsMask & allCheckpointsMask) === allCheckpointsMask;

      if (hasVisitedAllCheckpoints) {
        const p0 = map.waypoints[0];
        const p1 = map.waypoints[1];
        const dx0 = p1.x - p0.x;
        const dy0 = p1.y - p0.y;
        const len0 = Math.max(1, Math.hypot(dx0, dy0));
        const forwardProj = ((racer.x - p0.x) * dx0 + (racer.y - p0.y) * dy0) / len0;

        if (distToNextCp < cpRadius && forwardProj >= -22) {
          racer.lap += 1;
          racer.currentCheckpoint = 0;
          racer.visitedCheckpointsMask = 1;
          lapCompleted = true;
        }
      }
    }
  }

  const finalProg = computeRacerTrackProgress(racer, map);
  racer.totalProgress = finalProg.totalProgress;

  return {
    lapCompleted,
    checkpointAdvanced,
    totalProgress: finalProg.totalProgress,
    activeSegmentIdx: finalProg.activeSegmentIdx,
  };
}

export const RENAME_COST_COINS = 50;
export const NITRO_MIN_ACTIVATE_PCT = 20;

const ORDERED_PART_TIERS: PartTier[] = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
const TIER_SCORE_MAP: Record<PartTier, number> = {
  D: 1,
  C: 2,
  B: 3,
  A: 4,
  S: 5,
  SS: 6,
  SSS: 7,
};

const ALL_SLOTS: PartSlot[] = [
  'chassis',
  'paint',
  'decal',
  'wheels',
  'spoiler',
  'underglow',
  'trail',
];

/**
 * Requirement #4: Calculates the overall Class tier of a car based on the average
 * tier score of all 7 equipped parts in its CarLoadout.
 */
export function calculateCarClass(loadout: CarLoadout): {
  tier: PartTier;
  averageScore: number;
  totalPoints: number;
} {
  let totalPoints = 0;
  for (const slot of ALL_SLOTS) {
    const partId = loadout[slot];
    const part = ALL_PARTS.find((p) => p.id === partId);
    const partTier: PartTier = part ? part.tier : 'D';
    totalPoints += TIER_SCORE_MAP[partTier] ?? 1;
  }

  const averageScore = totalPoints / ALL_SLOTS.length;
  const idx = Math.max(
    0,
    Math.min(ORDERED_PART_TIERS.length - 1, Math.round(averageScore) - 1)
  );

  return {
    tier: ORDERED_PART_TIERS[idx],
    averageScore,
    totalPoints,
  };
}

const ALL_TUNING_SLOTS: TuningSlot[] = ['engine', 'tires', 'body', 'nitro'];

function clampNumber(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Maps a raw tuning stat total into a 0..100 horizontal progress bar value
 */
export function statToProgressBar(statTotal: number): number {
  return clampNumber(Math.round(35 + statTotal * 3.5), 5, 100);
}

/**
 * Calculates total CP, 5 stat totals, 0..100 horizontal progress bar values, and active passives
 * for a 4-part Performance Tuning loadout.
 */
export function calculateTuningSummary(loadout?: Partial<TuningLoadout>): {
  totalCP: number;
  maxCP: number;
  isValid: boolean;
  isValidCP: boolean;
  isComplete: boolean;
  totals: TuningStats;
  totalTopSpeed: number;
  totalAccel: number;
  totalHandling: number;
  totalNitro: number;
  totalWeight: number;
  bars: TuningStats;
  passives: TuningPassiveId[];
  parts: Record<TuningSlot, TuningPartItem>;
} {
  const effectiveLoadout: TuningLoadout = {
    engine: loadout?.engine || DEFAULT_TUNING_LOADOUT.engine,
    tires: loadout?.tires || DEFAULT_TUNING_LOADOUT.tires,
    body: loadout?.body || DEFAULT_TUNING_LOADOUT.body,
    nitro: loadout?.nitro || DEFAULT_TUNING_LOADOUT.nitro,
  };

  let totalCP = 0;
  let isComplete = true;
  const totals: TuningStats = {
    topSpeed: 0,
    accel: 0,
    handling: 0,
    nitro: 0,
    weight: 0,
  };
  const passives: TuningPassiveId[] = [];
  const parts = {} as Record<TuningSlot, TuningPartItem>;

  for (const slot of ALL_TUNING_SLOTS) {
    const partId = effectiveLoadout[slot];
    const found =
      ALL_TUNING_PARTS.find((p) => p.id === partId && p.slot === slot) ||
      ALL_TUNING_PARTS.find((p) => p.slot === slot)!;
    if (!ALL_TUNING_PARTS.some((p) => p.id === partId && p.slot === slot)) {
      isComplete = false;
    }
    parts[slot] = found;
    totalCP += found.cp;
    totals.topSpeed += found.stats.topSpeed;
    totals.accel += found.stats.accel;
    totals.handling += found.stats.handling;
    totals.nitro += found.stats.nitro;
    totals.weight += found.stats.weight;
    if (found.passiveId) {
      passives.push(found.passiveId);
    }
  }

  const bars: TuningStats = {
    topSpeed: statToProgressBar(totals.topSpeed),
    accel: statToProgressBar(totals.accel),
    handling: statToProgressBar(totals.handling),
    nitro: statToProgressBar(totals.nitro),
    weight: statToProgressBar(totals.weight),
  };

  const isValid = isComplete && totalCP <= MAX_TUNING_CP;

  return {
    totalCP,
    maxCP: MAX_TUNING_CP,
    isValid,
    isValidCP: isValid,
    isComplete,
    totals,
    totalTopSpeed: totals.topSpeed,
    totalAccel: totals.accel,
    totalHandling: totals.handling,
    totalNitro: totals.nitro,
    totalWeight: totals.weight,
    bars,
    passives,
    parts,
  };
}

export interface ComputedTuningPhysics {
  maxSpeed: number;
  accel: number;
  turnSpeed: number;
  driftGrip: number;
  lateralGrip: number;
  corneringRetention: number;
  apexExitBoostBonus: number;
  nitroTurnMultiplier: number;
  nitroInertiaGrip: number;
  nitroDuration: number;
  giftBoxNitroDuration: number;
  nitroBoostSpeedMultiplier: number;
  weight: number;
  isBulldozerWeight: boolean;
  jumpPadStability: number;
  computedStats: ComputedTuningStats;
  stunMultiplier: number;
  terrainPenaltyReduction: number;
  wallSpeedRetention: number;
  momentumDecayScale: number;
  totals: TuningStats;
  summary: ReturnType<typeof calculateTuningSummary>;
  passives: TuningPassiveId[];
  totalCP: number;
  isValidCP: boolean;
  hasOffroadPass: boolean;
  hasGrassPenalty: boolean;
  hasIceImmune: boolean;
  hasSteelReinforced: boolean;
  hasBananaResist: boolean;
  hasTitanArmor: boolean;
  hasTrapBoost: boolean;
  hasAtpCore: boolean;
  hasOverdriveCore: boolean;
  hasV12Reactor: boolean;
  hasEmPulse: boolean;
  hasMaglevFloat: boolean;
  hasCarbonGrip: boolean;
  hasHeavyBulldozer: boolean;
}

/**
 * Computes the rebalanced 60 FPS physics parameters from a TuningLoadout:
 * 1. Nerf Top Speed & Nitro:
 *    + maxSpeed = baseSpeed * (1 + (totalTopSpeed * 0.01))
 *    + Steering Inertia on Nitro: low handling suffers severe understeer & ice-like inertia slide when Nitro is active
 * 2. Buff Handling (Corner King):
 *    + lateralGrip = clamp(0.70 + (totalHandling * 0.015), 0.60, 0.99)
 *    + Cornering Drag = 0 (corneringRetention = 1.0) when totalHandling >= 8, plus +8% Apex Exit Mini-Boost
 * 3. Highlight Weight (Tank Physics):
 *    + Car-to-Car Collision Mass dominance & 90% speed retention for heavier car
 *    + Bulldozer Tire/Obstacle Smash when totalWeight >= 6 (or titanArmor)
 *    + Jump Pad Gravity Stability for heavy builds
 */
export function isComputedTuningStats(
  input: unknown
): input is ComputedTuningStats {
  return (
    typeof input === 'object' &&
    input !== null &&
    'topSpeedBonus' in input &&
    typeof (input as ComputedTuningStats).topSpeedBonus === 'number'
  );
}

/**
 * Computes the rebalanced 60 FPS physics parameters from either a TuningLoadout
 * OR a synced ComputedTuningStats (which hides part names for privacy).
 */
export function calculateTuningPhysics(
  loadoutOrStats?: Partial<TuningLoadout> | ComputedTuningStats | null,
  baseSpeedOrParams?:
    | number
    | {
        baseSpeed?: number;
        baseAccel?: number;
        baseTurn?: number;
        baseNitroTime?: number;
      },
  baseAccelArg?: number,
  baseTurnArg?: number,
  baseNitroTimeArg?: number
): ComputedTuningPhysics {
  let summary: ReturnType<typeof calculateTuningSummary>;
  let totals: TuningStats;
  let passives: TuningPassiveId[];
  let totalCP: number;
  let isValidCP: boolean;

  if (isComputedTuningStats(loadoutOrStats)) {
    totals = {
      topSpeed: loadoutOrStats.topSpeedBonus || 0,
      accel: loadoutOrStats.accelBonus || 0,
      handling: loadoutOrStats.handlingBonus || 0,
      nitro: loadoutOrStats.nitroBonus || 0,
      weight: loadoutOrStats.weightBonus ?? loadoutOrStats.weight ?? 0,
    };
    passives = Array.isArray(loadoutOrStats.passives)
      ? [...loadoutOrStats.passives]
      : [];
    const baseSummary = calculateTuningSummary(undefined);
    totalCP = baseSummary.totalCP;
    isValidCP = true;
    summary = {
      ...baseSummary,
      totals,
      totalTopSpeed: totals.topSpeed,
      totalAccel: totals.accel,
      totalHandling: totals.handling,
      totalNitro: totals.nitro,
      totalWeight: totals.weight,
      bars: {
        topSpeed: statToProgressBar(totals.topSpeed),
        accel: statToProgressBar(totals.accel),
        handling: statToProgressBar(totals.handling),
        nitro: statToProgressBar(totals.nitro),
        weight: statToProgressBar(totals.weight),
      },
      passives,
    };
  } else {
    summary = calculateTuningSummary(loadoutOrStats || undefined);
    totals = summary.totals;
    passives = summary.passives;
    totalCP = summary.totalCP;
    isValidCP = summary.isValidCP;
  }

  const isObj =
    typeof baseSpeedOrParams === 'object' && baseSpeedOrParams !== null;
  const baseSpeed = isObj
    ? (baseSpeedOrParams.baseSpeed ?? 335)
    : (baseSpeedOrParams ?? 335);
  const baseAccel = isObj
    ? (baseSpeedOrParams.baseAccel ?? 395)
    : (baseAccelArg ?? 395);
  const baseTurn = isObj
    ? (baseSpeedOrParams.baseTurn ?? 3.2)
    : (baseTurnArg ?? 3.2);
  // Base Nitro time reduced by 20% (default 2.0s instead of 2.5s)
  const rawBaseNitroTime = isObj
    ? (baseSpeedOrParams.baseNitroTime ?? 2.0)
    : (baseNitroTimeArg ?? 2.0);

  const hasAtpCore = passives.includes('atpCore');
  const hasOverdriveCore = passives.includes('overdriveCore');
  const hasTitanArmor = passives.includes('titanArmor');
  const hasV12Reactor = passives.includes('v12Reactor');
  const hasEmPulse = passives.includes('emPulse');
  const hasMaglevFloat = passives.includes('maglevFloat');
  const hasCarbonGrip = passives.includes('carbonGrip');
  const hasHeavyBulldozer = passives.includes('heavyBulldozer');

  // 1. Nerf Top Speed & Standardized Acceleration
  const maxSpeed = baseSpeed * (1 + totals.topSpeed * 0.01);
  const accel =
    baseAccel *
    (1 + totals.accel * 0.035) *
    clampNumber(1 - totals.weight * 0.004, 0.85, 1.15);

  // 2. Buff Handling (Corner King): lateralGrip = clamp(0.70 + (totalHandling * 0.015), 0.60, 0.99)
  const turnSpeed = baseTurn * clampNumber(1 + totals.handling * 0.035, 0.45, 1.65);
  const driftGrip = clampNumber(0.85 + totals.handling * 0.008, 0.72, 0.99);
  const lateralGrip = clampNumber(0.70 + totals.handling * 0.015, 0.60, 0.99);
  const corneringRetention =
    totals.handling >= 8
      ? 1.0
      : clampNumber(0.968 + totals.handling * 0.004, 0.935, 1.0);
  const apexExitBoostBonus = hasMaglevFloat
    ? 1.12
    : totals.handling >= 6
    ? 1.08
    : 1.0;

  // 3. Nitro Steering Inertia, Duration (+20% for atpCore on manual Nitro bar ONLY), and Overdrive +20% Nitro Speed
  const nitroTurnMultiplier = clampNumber(
    0.42 + totals.handling * 0.02,
    0.16,
    0.68
  );
  const nitroInertiaGrip = clampNumber(
    0.52 + totals.handling * 0.032,
    0.18,
    0.92
  );
  const giftBoxNitroDuration =
    rawBaseNitroTime * clampNumber(1 + totals.nitro * 0.035, 0.6, 2.2);
  const nitroDuration = giftBoxNitroDuration * (hasAtpCore ? 1.2 : 1.0);
  const nitroBoostSpeedMultiplier = hasOverdriveCore ? 1.2 : 1.0;

  // 4. Weight Advantages (Bulldozer >= 6, Stun Resist, Off-road Bulldozer, Wall Impact Retention, Jump Pad Stability)
  const isBulldozerWeight =
    totals.weight >= 6 || hasTitanArmor || hasHeavyBulldozer;
  const jumpPadStability = clampNumber(
    0.55 + Math.max(0, totals.weight) * 0.045,
    0.45,
    1.0
  );
  const stunMultiplier = clampNumber(1 - totals.weight * 0.045, 0.25, 1.4);
  const baseTerrainReduction = clampNumber(
    Math.max(0, totals.weight) * 0.04,
    0,
    0.65
  );
  const terrainPenaltyReduction = hasMaglevFloat
    ? Math.max(0.5, baseTerrainReduction)
    : baseTerrainReduction;
  const wallSpeedRetention = hasHeavyBulldozer
    ? 0.95
    : isBulldozerWeight
    ? 0.88
    : totals.weight <= 0
    ? 0.2
    : clampNumber(0.2 + totals.weight * 0.06, 0.2, 0.85);
  const momentumDecayScale = clampNumber(
    1 / (1 + Math.max(0, totals.weight) * 0.075),
    0.4,
    1.2
  );

  const computedStats: ComputedTuningStats = {
    topSpeedBonus: totals.topSpeed,
    accelBonus: totals.accel,
    handlingBonus: totals.handling,
    nitroBonus: totals.nitro,
    weightBonus: totals.weight,
    passives: [...passives],
    maxSpeed: Number(maxSpeed.toFixed(2)),
    accel: Number(accel.toFixed(2)),
    turnSpeed: Number(turnSpeed.toFixed(3)),
    driftGrip: Number(driftGrip.toFixed(3)),
    nitroDuration: Number(nitroDuration.toFixed(3)),
    weight: totals.weight,
  };

  return {
    maxSpeed,
    accel,
    turnSpeed,
    driftGrip,
    lateralGrip,
    corneringRetention,
    apexExitBoostBonus,
    nitroTurnMultiplier,
    nitroInertiaGrip,
    nitroDuration,
    giftBoxNitroDuration,
    nitroBoostSpeedMultiplier,
    weight: totals.weight,
    isBulldozerWeight,
    jumpPadStability,
    computedStats,
    stunMultiplier,
    terrainPenaltyReduction,
    wallSpeedRetention,
    momentumDecayScale,
    totals,
    summary,
    passives,
    totalCP,
    isValidCP,
    hasOffroadPass: passives.includes('offroadPass'),
    hasGrassPenalty: passives.includes('grassPenalty'),
    hasIceImmune: passives.includes('iceImmune'),
    hasSteelReinforced: passives.includes('steelReinforced'),
    hasBananaResist: passives.includes('bananaResist'),
    hasTitanArmor,
    hasTrapBoost: passives.includes('trapBoost'),
    hasAtpCore,
    hasOverdriveCore,
    hasV12Reactor,
    hasEmPulse,
    hasMaglevFloat,
    hasCarbonGrip,
    hasHeavyBulldozer,
  };
}

/**
 * Builds the network-safe ComputedTuningStats object from a TuningLoadout or existing ComputedTuningStats.
 * Only exposes aggregated bonus numbers and passives (NEVER part names/IDs) to protect secret builds!
 */
export function buildComputedStats(
  loadoutOrStats?: Partial<TuningLoadout> | ComputedTuningStats | null
): ComputedTuningStats {
  return calculateTuningPhysics(loadoutOrStats, 335, 395, 3.2, 2.0).computedStats;
}

/**
 * Generates a valid <= 25 CP tuning loadout for AI Bots
 */
export function generateBotTuningLoadout(seedIdx: number): TuningLoadout {
  const validCombos: TuningLoadout[] = [
    {
      engine: 'eng_b_v6',
      tires: 'tire_b_semislick',
      body: 'body_b_alloy',
      nitro: 'nitro_b_twinbio',
    }, // 5+5+5+5 = 20 CP <= 25 CP
    {
      engine: 'eng_a_twinturbo',
      tires: 'tire_b_offroad',
      body: 'body_c_poly',
      nitro: 'nitro_c_injector',
    }, // 7+5+4+4 = 20 CP <= 25 CP
    {
      engine: 'eng_s_v12_nuclear',
      tires: 'tire_c_street',
      body: 'body_c_poly',
      nitro: 'nitro_c_injector',
    }, // 9+3+4+4 = 20 CP <= 25 CP
    {
      engine: 'eng_c_mini_ev',
      tires: 'tire_a_f1',
      body: 'body_b_alloy',
      nitro: 'nitro_c_injector',
    }, // 4+7+5+4 = 20 CP <= 25 CP
    {
      engine: 'eng_b_v6',
      tires: 'tire_c_street',
      body: 'body_c_steel',
      nitro: 'nitro_s_atp',
    }, // 5+3+3+9 = 20 CP <= 25 CP
    {
      engine: 'eng_s_v12_nuclear',
      tires: 'tire_a_f1',
      body: 'body_a_carbon',
      nitro: 'nitro_d_mini',
    }, // 9+7+7+2 = 25 CP
  ];
  return validCombos[Math.abs(seedIdx) % validCombos.length];
}

/**
 * Checks whether a Synapse Laser Gate is currently CLOSED (Red Laser active).
 * Cycle: 3.0 seconds Open (Green) -> 2.0 seconds Closed (Red) => 5.0s period.
 */
export function isSynapseGateClosed(
  nowSec: number,
  phaseOffset: number = 0
): boolean {
  const cycle = (((nowSec + phaseOffset) % 5.0) + 5.0) % 5.0;
  return cycle >= 3.0;
}

/**
 * Computes auto-scaling bounding box & transform for the bottom-right Minimap
 * so standard tracks, Map 9 (3x Bio-World), and Map 10 (Airport Drag Strip) fit cleanly.
 */
export function computeMinimapTransform(
  map: MapDefinition,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 16
): {
  scale: number;
  centerX: number;
  centerY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const pt of map.waypoints) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }
  if (map.shortcut?.path) {
    for (const pt of map.shortcut.path) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
  }
  if (map.secretBranches) {
    for (const br of map.secretBranches) {
      for (const pt of br.path) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
    }
  }

  const margin = map.roadWidth * 0.85;
  minX -= margin;
  maxX += margin;
  minY -= margin;
  maxY += margin;

  const worldW = Math.max(200, maxX - minX);
  const worldH = Math.max(200, maxY - minY);
  const availW = Math.max(24, canvasWidth - padding * 2);
  const availH = Math.max(24, canvasHeight - padding * 2);

  const scale = Math.min(availW / worldW, availH / worldH);
  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;

  return {
    scale,
    centerX,
    centerY,
    minX,
    maxX,
    minY,
    maxY,
  };
}

/**
 * Normalizes tuningPresets from Firebase (which may strip nulls or convert sparse arrays into objects)
 * or localStorage into a guaranteed 2-slot array [slot0, slot1].
 */
export function normalizeTuningPresets(
  raw: unknown,
  studentId?: string
): (TuningPreset | null)[] {
  const result: (TuningPreset | null)[] = [null, null];

  const extractFromSource = (source: unknown) => {
    if (!source || typeof source !== 'object') return;
    if (Array.isArray(source)) {
      for (let i = 0; i < 2; i++) {
        const item = source[i];
        if (item && typeof item === 'object' && 'loadout' in item && item.loadout) {
          const slotIdx = typeof item.id === 'number' && item.id >= 0 && item.id < 2 ? item.id : i;
          result[slotIdx] = item as TuningPreset;
        }
      }
    } else {
      const obj = source as Record<string, unknown>;
      for (const [k, val] of Object.entries(obj)) {
        if (val && typeof val === 'object' && 'loadout' in val && (val as TuningPreset).loadout) {
          const parsedKey = parseInt(k, 10);
          const item = val as TuningPreset;
          const slotIdx =
            !Number.isNaN(parsedKey) && parsedKey >= 0 && parsedKey < 2
              ? parsedKey
              : typeof item.id === 'number' && item.id >= 0 && item.id < 2
              ? item.id
              : -1;
          if (slotIdx >= 0 && slotIdx < 2) {
            result[slotIdx] = item;
          }
        }
      }
    }
  };

  extractFromSource(raw);

  // Also merge from localStorage backup if any slot is still null and studentId is provided
  if (studentId && typeof window !== 'undefined') {
    try {
      const savedLocal = localStorage.getItem(`tripled_tuning_presets_${studentId}`);
      if (savedLocal) {
        const parsedLocal = JSON.parse(savedLocal);
        const fallback: (TuningPreset | null)[] = [null, null];
        if (Array.isArray(parsedLocal)) {
          for (let i = 0; i < 2; i++) {
            const it = parsedLocal[i];
            if (it && typeof it === 'object' && 'loadout' in it) {
              fallback[i] = it as TuningPreset;
            }
          }
        }
        for (let i = 0; i < 2; i++) {
          if (!result[i] && fallback[i]) {
            result[i] = fallback[i];
          }
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  return result;
}





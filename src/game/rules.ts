import {
  ALL_PARTS,
  GACHA_PITY_THRESHOLD,
  RANK_TIERS,
} from './constants.ts';
import type {
  BotDifficulty,
  CarLoadout,
  MapDefinition,
  PartItem,
  PartSlot,
  PartTier,
  PlayModeCategory,
  Point2D,
  RaceItemType,
  RacerState,
  RankDefinition,
  TournamentRewardConfig,
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
 * Gacha Spin Logic (50 Xu / spin):
 * - Stricter high-tier rates: D & C (60%), B & A (32%), S & SS (7%), SSS (1%)
 * - Knock-out Pool: Only selects items NOT in ownedParts
 * - Harder Pity System (GACHA_PITY_THRESHOLD = 20):
 *   If gachaPity >= 19 (i.e. 19 pulls without SS/SSS, this is the 20th pull),
 *   100% guaranteed to pull an unowned SS or SSS item (if any remain in pool).
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
} {
  const unowned = ALL_PARTS.filter((p) => !ownedParts.includes(p.id));
  if (unowned.length === 0) {
    return { item: null, newPity: currentPity, isPityTriggered: false };
  }

  const pityLimit = GACHA_PITY_THRESHOLD - 1; // 19 -> 20th spin triggers Pity
  const unownedMythic = unowned.filter(
    (p) => p.tier === 'SS' || p.tier === 'SSS'
  );
  const unownedRateUp =
    rateUpIds && rateUpIds.length > 0
      ? unowned.filter((p) => rateUpIds.includes(p.id))
      : [];
  const unownedRateUpMythic = unownedRateUp.filter(
    (p) => p.tier === 'SS' || p.tier === 'SSS'
  );

  // Check Pity System (19 consecutive non-SS/SSS means 20th pull is guaranteed SS/SSS)
  if (currentPity >= pityLimit && unownedMythic.length > 0) {
    const baseMythicPool =
      unownedRateUpMythic.length > 0 ? unownedRateUpMythic : unownedMythic;
    const sssPool = baseMythicPool.filter((p) => p.tier === 'SSS');
    const ssPool = baseMythicPool.filter((p) => p.tier === 'SS');
    let chosenPool = baseMythicPool;
    if (sssPool.length > 0 && ssPool.length > 0) {
      chosenPool = rng() < 0.25 ? sssPool : ssPool;
    }
    const idx = Math.floor(rng() * chosenPool.length);
    const item = chosenPool[Math.min(idx, chosenPool.length - 1)];
    return { item, newPity: 0, isPityTriggered: true };
  }

  // Harder weighted roll across buckets:
  // Bucket 1: D & C (60% -> 0.00 .. 0.60)
  // Bucket 2: B & A (28% -> 0.60 .. 0.88)
  // Bucket 3: S     (9%  -> 0.88 .. 0.97)
  // Bucket 4: SS    (2.5% -> 0.97 .. 0.995)
  // Bucket 5: SSS   (0.5% -> 0.995 .. 1.00)
  const roll = rng();
  const bucketDC = unowned.filter((p) => p.tier === 'D' || p.tier === 'C');
  const bucketBA = unowned.filter((p) => p.tier === 'B' || p.tier === 'A');
  const bucketS = unowned.filter((p) => p.tier === 'S');
  const bucketSS = unowned.filter((p) => p.tier === 'SS');
  const bucketSSS = unowned.filter((p) => p.tier === 'SSS');

  let targetBucket: PartItem[] = [];
  if (roll < 0.60) targetBucket = bucketDC;
  else if (roll < 0.88) targetBucket = bucketBA;
  else if (roll < 0.97) targetBucket = bucketS;
  else if (roll < 0.995) targetBucket = bucketSS;
  else targetBucket = bucketSSS;

  // If rolling into a bucket that contains active Banner Rate-Up skins, prioritize them
  if (unownedRateUp.length > 0 && targetBucket.length > 0) {
    const rateUpInBucket = targetBucket.filter((p) => rateUpIds?.includes(p.id));
    if (rateUpInBucket.length > 0) {
      targetBucket = rateUpInBucket;
    }
  }

  // Knock-out fallback if chosen tier bucket is already exhausted (lowest tier first!)
  if (targetBucket.length === 0) {
    const fallbackOrder = [
      bucketDC,
      bucketBA,
      bucketS,
      bucketSS,
      bucketSSS,
      unownedRateUp,
    ];
    for (const b of fallbackOrder) {
      if (b.length > 0) {
        targetBucket = b;
        break;
      }
    }
  }

  const pickIdx = Math.floor(rng() * targetBucket.length);
  const picked = targetBucket[Math.min(pickIdx, targetBucket.length - 1)];
  const isMythic = picked.tier === 'SS' || picked.tier === 'SSS';

  return {
    item: picked,
    newPity: isMythic ? 0 : Math.min(pityLimit, currentPity + 1),
    isPityTriggered: false,
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
 * Evaluates whether a car is on the asphalt road (main loop or shortcut)
 */
export function isPointOnTrack(
  p: Point2D,
  map: MapDefinition
): { onRoad: boolean; minDistance: number; nearestSegmentIdx: number } {
  let minDistance = Infinity;
  let nearestSegmentIdx = 0;
  const pts = map.waypoints;

  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const res = distanceToSegment(p, a, b);
    if (res.distance < minDistance) {
      minDistance = res.distance;
      nearestSegmentIdx = i;
    }
  }

  // Also check shortcut segments
  const sc = map.shortcut.path;
  for (let i = 0; i < sc.length - 1; i++) {
    const res = distanceToSegment(p, sc[i], sc[i + 1]);
    if (res.distance < minDistance) {
      minDistance = res.distance;
    }
  }

  // Bridge segment is narrower (70% width)
  let effectiveHalfWidth = map.roadWidth * 0.5;
  if (
    map.bridgeSegment &&
    nearestSegmentIdx >= map.bridgeSegment.startIdx &&
    nearestSegmentIdx <= map.bridgeSegment.endIdx
  ) {
    effectiveHalfWidth = map.roadWidth * 0.36;
  }

  return {
    onRoad: minDistance <= effectiveHalfWidth,
    minDistance,
    nearestSegmentIdx,
  };
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

/**
 * Rescues a stuck car to the center of the road at its last passed checkpoint with 1.5s invulnerability
 */
export function applyCarRescue(
  racer: RacerState,
  map: MapDefinition
): RacerState {
  const cpIdx = map.checkpointIndices[racer.currentCheckpoint] ?? 0;
  const wp = map.waypoints[cpIdx];
  const nextWp = map.waypoints[(cpIdx + 1) % map.waypoints.length];
  const angle = Math.atan2(nextWp.y - wp.y, nextWp.x - wp.x);

  return {
    ...racer,
    x: wp.x,
    y: wp.y,
    vx: 0,
    vy: 0,
    speed: 0,
    angle,
    angularVelocity: 0,
    invulnerableTimer: 1.5,
    stuckTimer: 0,
    spinTimer: 0,
    stunTimer: 0,
    wrongWay: false,
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


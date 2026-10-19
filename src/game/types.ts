export type PartTier = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export type PartSlot =
  | 'chassis'
  | 'paint'
  | 'decal'
  | 'wheels'
  | 'spoiler'
  | 'underglow'
  | 'trail';

export interface PartItem {
  id: string;
  slot: PartSlot;
  name: string;
  tier: PartTier;
  price: number; // 0 for starter D items; if gachaOnly is true, cannot buy with coins in shop
  gachaOnly: boolean;
  description: string;
  visualKey: string;
}

export type CarLoadout = Record<PartSlot, string>;

export interface MatchRecord {
  id: string;
  timestamp: number;
  mapId: string;
  mapName: string;
  mode: 'solo' | 'team';
  placement: number;
  totalRacers: number;
  coinsEarned: number;
  rpDelta: number;
  finishTimeMs: number;
  teamId?: number;
  teamWon?: boolean;
}

export interface StudentAccount {
  id: string; // normalized email
  username: string;
  email: string;
  pin: string; // 4 digits
  coins: number;
  rp: number;
  totalMatches: number;
  top1Count: number;
  ownedParts: string[]; // array of PartItem.id
  loadout: CarLoadout;
  gachaPity: number; // 0..9, on 9 next spin is guaranteed SS or SSS
  usedGiftcodes: string[];
  matchHistory: MatchRecord[];
  lastActive: number;
}

export interface Giftcode {
  code: string;
  coins: number;
  maxUses: number;
  usedBy: string[]; // emails
  createdAt: number;
}

export type RankTierId =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'veteran'
  | 'master'
  | string;

export interface RankDefinition {
  id: RankTierId;
  name: string;
  minRP: number;
  maxRP: number | null;
  color: string;
  borderColor: string;
  badgeIcon: string;
  glow?: boolean;
}

export type RaceItemType = 'nitro' | 'banana' | 'mud' | 'rocket';

export interface Point2D {
  x: number;
  y: number;
}

export interface BoostZone {
  x: number;
  y: number;
  radius: number;
  angle: number;
}

export interface MudHazardZone {
  x: number;
  y: number;
  radius: number;
}

export interface TireBarrier {
  x: number;
  y: number;
  radius: number;
}

export interface MapDefinition {
  id: string;
  name: string;
  subtitle: string;
  theme: 'city' | 'aorta' | 'swamp' | 'dna' | 'cryo';
  description: string;
  roadWidth: number;
  friction: number; // 1.0 normal, lower for cryo-lab ice
  bgColor: string;
  roadColor: string;
  roadBorderColor: string;
  kerbColors: [string, string];
  // Main loop waypoints (closed loop of 20+ points forming a long ~60-80s track)
  waypoints: Point2D[];
  // 10 hidden checkpoints indices along waypoints
  checkpointIndices: number[];
  // Shortcut path (connects from waypoint index A to waypoint index B with obstacles)
  shortcut: {
    entryWaypointIndex: number;
    exitWaypointIndex: number;
    path: Point2D[];
    label: string;
  };
  boostZones: BoostZone[];
  naturalMudZones: MudHazardZone[];
  tireBarriers: TireBarrier[];
  bridgeSegment?: { startIdx: number; endIdx: number };
}

export interface RacerState {
  id: string;
  username: string;
  isBot: boolean;
  isTeacher?: boolean;
  teamId?: number; // 1, 2, 3, 4
  loadout: CarLoadout;
  rp: number;
  // Physics
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  angularVelocity: number;
  drifting: boolean;
  // Progress
  lap: number; // 1..totalLaps, >totalLaps when finished
  currentCheckpoint: number; // 0..9
  waypointIndex: number; // for AI navigation & accurate placement
  totalProgress: number; // continuous score for live ranking
  finished: boolean;
  finishTimeMs: number;
  placement: number;
  // Status effects & items
  heldItem: RaceItemType | null;
  nitroCharge: number; // 0..100 rechargeable Nitro bar (used with Shift)
  isBoostingNitro: boolean; // true while holding Shift with nitroCharge > 0
  nitroTimer: number; // >0 means 160% speed from Nitro item box
  spinTimer: number; // >0 means banana 360 spin (1.5s)
  mudTimer: number; // >0 means mud slow 70% (3s)
  stunTimer: number; // >0 means rocket explosion stop (2s)
  invulnerableTimer: number; // >0 means R-rescue blink (1.5s)
  rocketStartTimer: number; // >0 means blue flame rocket start (1s)
  stuckTimer: number; // >3s shows press R prompt
  wrongWay: boolean;
  useShortcutThisLap?: boolean;
}

export interface TrackItemBox {
  id: string;
  x: number;
  y: number;
  active: boolean;
  respawnTimer: number;
}

export interface DeployedHazard {
  id: string;
  type: 'banana' | 'mud' | 'rocket';
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  ttl: number;
  waypointTargetIdx?: number;
}

export interface ReplaySnapshotCar {
  id: string;
  username: string;
  x: number;
  y: number;
  angle: number;
  loadout: CarLoadout;
  drifting: boolean;
  nitroTimer: number;
  rocketStartTimer: number;
}

export interface ReplayFrame {
  timestamp: number;
  leaderId: string;
  cars: ReplaySnapshotCar[];
}

export type PlayModeCategory = 'practice_ai' | 'friends_pvp' | 'teacher_cup';

export type BotDifficulty = 'easy' | 'medium' | 'hard' | 'nightmare';

export interface TournamentRewardConfig {
  top1Coins: number;
  top2Coins: number;
  top3Coins: number;
  top10Coins: number;
  finishCoins: number;
  teamWinBonusCoins: number;
}

export interface LobbyConfig {
  roomPin: string;
  friendRoomPin?: string;
  friendHostName?: string;
  playModeCategory?: PlayModeCategory;
  botDifficulty?: BotDifficulty;
  teacherCupOpen?: boolean;
  tournamentTitle?: string;
  teacherRewards?: TournamentRewardConfig;
  hostMode: 'spectator' | 'play';
  raceMode: 'solo' | 'team';
  teamCount: 2 | 3 | 4;
  mapId: string;
  laps: number;
  botCount: number;
  status: 'waiting' | 'racing' | 'finished';
  participants: {
    id: string;
    username: string;
    rp: number;
    teamId: number;
    loadout: CarLoadout;
    isBot: boolean;
    isTeacher?: boolean;
  }[];
}



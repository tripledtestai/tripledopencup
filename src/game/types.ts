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

export type TuningSlot = 'engine' | 'tires' | 'body' | 'nitro';

export type TuningPassiveId =
  | 'offroadPass'
  | 'grassPenalty'
  | 'iceImmune'
  | 'steelReinforced'
  | 'bananaResist'
  | 'titanArmor'
  | 'trapBoost'
  | 'atpCore'
  | 'overdriveCore'
  | 'v12Reactor'
  | 'emPulse'
  | 'maglevFloat'
  | 'carbonGrip'
  | 'heavyBulldozer';

export interface TuningStats {
  topSpeed: number;
  accel: number;
  handling: number;
  nitro: number;
  weight: number;
}

export interface TuningPartItem {
  id: string;
  slot: TuningSlot;
  name: string;
  tier: 'D' | 'C' | 'B' | 'A' | 'S';
  cp: number;
  stats: TuningStats;
  passiveId?: TuningPassiveId;
  passiveLabel?: string;
  passiveDesc?: string;
  isPenalty?: boolean;
}

export type TuningLoadout = Record<TuningSlot, string>;

export interface ComputedTuningStats {
  topSpeedBonus: number;
  accelBonus: number;
  handlingBonus: number;
  nitroBonus: number;
  weightBonus: number;
  passives: TuningPassiveId[];
  maxSpeed: number;
  accel: number;
  turnSpeed: number;
  driftGrip: number;
  nitroDuration: number;
  weight: number;
}

export interface TuningPreset {
  id: number; // 0, 1, 2 for Preset 1, 2, 3
  name: string;
  loadout: TuningLoadout;
  carLoadout?: CarLoadout;
  totalCP: number;
  updatedAt: number;
}

export const MAX_TUNING_CP = 25;

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
  tuningLoadout?: TuningLoadout;
  computedStats?: ComputedTuningStats;
  tuningPresets?: (TuningPreset | null)[];
  activePresetIndex?: number | null;
  gachaPity: number; // 0..9, on 9 next spin is guaranteed SS or SSS
  usedGiftcodes: string[];
  matchHistory: MatchRecord[];
  lastActive: number;
  banned?: boolean;
  banReason?: string;
}

export interface Giftcode {
  code: string;
  coins: number;
  maxUses: number;
  usedBy: string[]; // emails
  createdAt: number;
  rewardParts?: string[]; // optional free skins/parts unlocked when redeeming code
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

export type TrackSurfaceType =
  | 'asphalt'
  | 'glass'
  | 'conveyor'
  | 'acoustic_bowl'
  | 'arena'
  | 'cave'
  | 'swamp_tide'
  | 'villi'
  | 'glass_tunnel';

export interface Point2D {
  x: number;
  y: number;
  width?: number; // Variable track width (100px to 550px)
  cornerType?: 'sharp' | 'curve' | 'hairpin';
  elevation?: 0 | 1; // 0 = Ground / Underpass, 1 = Overpass / Bridge
  surfaceType?: TrackSurfaceType;
  noGuardrail?: boolean; // True on Zero-G glass bridges where falling off edge triggers rescue
}

export interface BoostZone {
  x: number;
  y: number;
  radius: number;
  angle: number;
  elevation?: 0 | 1;
}

export interface MudHazardZone {
  x: number;
  y: number;
  radius: number;
  elevation?: 0 | 1;
}

export interface TireBarrier {
  x: number;
  y: number;
  radius: number;
  elevation?: 0 | 1;
}

export type MapTheme =
  | 'city'
  | 'aorta'
  | 'swamp'
  | 'dna'
  | 'cryo'
  | 'synapse'
  | 'gastric'
  | 'chloroplast'
  | 'bioworld'
  | 'airport'
  | 'polypeptide'
  | 'ribosome'
  | 'cochlea'
  | 'macrophage'
  | 'unknown_cell';

export interface SynapseLaserGate {
  x: number;
  y: number;
  angle: number; // Road direction angle; laser spans perpendicular (angle + PI/2)
  width: number;
  phaseOffset: number; // Offset in seconds within the 5s cycle (3s Open Green, 2s Closed Red)
}

export interface AcidZone {
  x: number;
  y: number;
  radius: number;
}

export interface CrosswindZone {
  x: number;
  y: number;
  radius: number;
  forceAngle: number; // Direction of lateral push in radians
  strength: number; // Base lateral push acceleration
}

export interface JumpPadZone {
  x: number;
  y: number;
  radius: number;
  angle: number;
  elevation?: 0 | 1;
}

export interface SolarZone {
  x: number;
  y: number;
  radius: number;
}

export interface BiomeSegment {
  startIdx: number;
  endIdx: number;
  theme: 'city' | 'aorta' | 'swamp' | 'gastric' | 'dna' | 'synapse' | 'cryo';
  roadColor: string;
  kerbColors: [string, string];
  label: string;
}

export interface ConveyorBeltSegment {
  startIdx: number;
  endIdx: number;
  boostMultiplier: number; // e.g., 1.35 (+35% speed on left half)
  dragMultiplier: number; // e.g., 0.65 (-35% speed on right half)
}

export interface TarnPistonHazard {
  x: number;
  y: number;
  angle: number; // Direction of lateral piston push
  pushForce: number;
  radius: number;
  phaseOffset: number; // 2-second cycle offset
}

export interface PinballBumperHazard {
  x: number;
  y: number;
  radius: number;
  color: string;
  restitution: number; // Elastic bounce multiplier
  label?: string;
}

export interface AntibodySphereHazard {
  centerX: number;
  centerY: number;
  orbitRadiusX: number;
  orbitRadiusY: number;
  radius: number;
  speed: number;
  phase: number;
}

export interface TidalZoneConfig {
  startIdx: number;
  endIdx: number;
  periodSec: number; // e.g. 6.0s cycle (3s low tide, 3s high tide)
  highTideSlowMultiplier: number; // e.g. 0.40 (slows by 60% when submerged)
}

export interface SecretBranchPath {
  id: string;
  entryWaypointIndex: number;
  exitWaypointIndex: number;
  path: Point2D[];
  width: number;
  elevation?: 0 | 1;
  surfaceType?: string;
  hasDoubleGiftBox?: boolean;
  isTidalStonePath?: boolean;
  label: string;
}

export interface MapDefinition {
  id: string;
  name: string;
  subtitle: string;
  theme: MapTheme;
  description: string;
  roadWidth: number;
  friction: number; // 1.0 normal, lower for cryo-lab ice
  bgColor: string;
  roadColor: string;
  roadBorderColor: string;
  kerbColors: [string, string];
  // Main loop or point-to-point waypoints
  waypoints: Point2D[];
  // 10 hidden checkpoints indices along waypoints
  checkpointIndices: number[];
  // Shortcut path (connects from waypoint index A to waypoint index B with obstacles)
  shortcut: {
    entryWaypointIndex: number;
    exitWaypointIndex: number;
    path: Point2D[];
    label: string;
    widthRatio?: number;
  };
  boostZones: BoostZone[];
  naturalMudZones: MudHazardZone[];
  tireBarriers: TireBarrier[];
  bridgeSegment?: { startIdx: number; endIdx: number };
  // Dynamic Map Hazards & Biome Extensions (Maps 6 -> 15)
  bottleneckSegments?: { startIdx: number; endIdx: number }[];
  synapseGates?: SynapseLaserGate[];
  acidZones?: AcidZone[];
  crosswindZones?: CrosswindZone[];
  jumpPads?: JumpPadZone[];
  solarZones?: SolarZone[];
  biomeSegments?: BiomeSegment[];
  chasmSegments?: { x: number; y: number; radius: number; angle: number }[];
  // Maps 11 -> 15 Unique 2.5D & Geometric Extensions
  conveyorBelts?: ConveyorBeltSegment[];
  tarnPistons?: TarnPistonHazard[];
  pinballBumpers?: PinballBumperHazard[];
  antibodySpheres?: AntibodySphereHazard[];
  tidalZones?: TidalZoneConfig[];
  secretBranches?: SecretBranchPath[];
  isPointToPoint?: boolean; // Map 15: 1-Way North-to-South expedition
  fogOfWar?: { startIdx: number; endIdx: number; visionRadius: number };
  glassTunnelSegments?: { startIdx: number; endIdx: number }[];
}

export interface RacerState {
  id: string;
  username: string;
  isBot: boolean;
  isTeacher?: boolean;
  teamId?: number; // 1, 2, 3, 4
  loadout: CarLoadout;
  tuningLoadout?: TuningLoadout;
  computedStats?: ComputedTuningStats;
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
  elevation?: 0 | 1; // Current vertical layer (0 = underpass/ground, 1 = overpass bridge)
  // Progress
  lap: number; // 1..totalLaps, >totalLaps when finished
  currentCheckpoint: number; // 0..9
  visitedCheckpointsMask?: number; // Bitmask of sequentially visited checkpoints in current lap
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
  isNavigatingShortcut?: boolean;
  shortcutStepIndex?: number;
  jumpTimer?: number; // >0 means airborne from Jump Pad
  solarExposureTimer?: number; // accumulates time on Solar Zones (1.0s -> free Nitro)
  laserHitCooldown?: number; // cooldown after hitting a closed Synapse Laser Gate
  apexCurveTimer?: number; // accumulates time holding corner steering (A/D) for Apex Exit Mini-Boost
  apexBoostTimer?: number; // >0 means +8% speed Mini-Boost on corner exit
  glassFallCooldown?: number; // cooldown after falling off Map 11 Zero-G glass bridge
  bumperHitCooldown?: number; // cooldown for Map 14 Pinball Lysosome bumper sound/impulse
  maxSpeedKmh?: number; // peak speed in km/h recorded during the race
  driftCount?: number; // number of drift initiations during the race
  _wasDrifting?: boolean; // internal edge detector for driftCount
}

export interface TrackItemBox {
  id: string;
  x: number;
  y: number;
  active: boolean;
  respawnTimer: number;
  elevation?: 0 | 1;
  isDoubleBox?: boolean;
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
  elevation?: 0 | 1;
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

export type PlayModeCategory =
  | 'practice_ai'
  | 'friends_pvp'
  | 'teacher_cup'
  | 'quick_match';

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
  isAutoMatchmaking?: boolean;
  isFriendGuest?: boolean;
  participants: {
    id: string;
    username: string;
    rp: number;
    teamId: number;
    loadout: CarLoadout;
    tuningLoadout?: TuningLoadout;
    computedStats?: ComputedTuningStats;
    isBot: boolean;
    isTeacher?: boolean;
  }[];
}

export interface GameSaveCheckpoint {
  id: string;
  label: string;
  createdAt: number;
  studentCount: number;
  students: Record<string, StudentAccount>;
  teacherProfile: StudentAccount;
  giftcodes: Record<string, Giftcode>;
}

export interface MatchmakingRoomEntry {
  roomPin: string;
  hostId: string;
  hostName: string;
  hostRp: number;
  mapId: string;
  participantsCount: number;
  maxPlayers: number;
  status: 'waiting' | 'starting' | 'racing';
  createdAt: number;
  updatedAt: number;
}

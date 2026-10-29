import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  update,
  onValue,
  Database,
  Unsubscribe,
} from 'firebase/database';
import {
  ALL_PARTS,
  DEFAULT_LOADOUT,
  DEFAULT_TUNING_LOADOUT,
  EMPTY_TUNING_PRESETS,
  INITIAL_GIFTCODES,
  MAPS,
  STARTER_OWNED_PARTS,
} from '../game/constants';
import {
  buildComputedStats,
  calculateTuningPhysics,
  normalizeTuningPresets,
  type ComputedTuningPhysics,
} from '../game/rules';
import {
  CarLoadout,
  ComputedTuningStats,
  GameSaveCheckpoint,
  Giftcode,
  LobbyConfig,
  MatchRecord,
  MatchmakingRoomEntry,
  PartSlot,
  StudentAccount,
  TuningLoadout,
} from '../game/types';

const STORAGE_KEYS = {
  STUDENTS: 'tripled_students_v1',
  TEACHER: 'tripled_teacher_profile_v1',
  GIFTCODES: 'tripled_giftcodes_v1',
  LOBBY: 'tripled_lobby_v1',
  CURRENT_USER: 'tripled_saved_student_v1',
  FIREBASE_CFG: 'tripled_firebase_config_v1',
  CHECKPOINTS: 'tripled_save_checkpoints_v1',
  ACTIVE_COMPUTED_STATS: 'tripled_active_computed_stats_v1',
};

export interface FirebaseConfigInput {
  apiKey: string;
  authDomain?: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

function encodeFirebaseKey(key: string): string {
  return key.replace(/\./g, '_dot_').replace(/#/g, '_hash_').replace(/\$/g, '_dollar_').replace(/\[/g, '_lbr_').replace(/\]/g, '_rbr_').replace(/\//g, '_slash_');
}

function decodeFirebaseKey(key: string): string {
  return key.replace(/_dot_/g, '.').replace(/_hash_/g, '#').replace(/_dollar_/g, '$').replace(/_lbr_/g, '[').replace(/_rbr_/g, ']').replace(/_slash_/g, '/');
}

export function sanitizeForFirebase<T>(val: T): T {
  if (val === undefined) {
    return null as unknown as T;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirebase(item)) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(val as Record<string, any>)) {
    if (v !== undefined) {
      clean[k] = sanitizeForFirebase(v);
    }
  }
  return clean as T;
}

function sanitizeStudentsForFirebase(
  students: Record<string, StudentAccount>
): Record<string, StudentAccount> {
  const result: Record<string, StudentAccount> = {};
  for (const [k, v] of Object.entries(students)) {
    result[encodeFirebaseKey(k)] = v;
  }
  return result;
}

function desanitizeStudentsFromFirebase(
  data: Record<string, StudentAccount>
): Record<string, StudentAccount> {
  const result: Record<string, StudentAccount> = {};
  for (const [k, v] of Object.entries(data)) {
    const decodedKey = decodeFirebaseKey(k);
    result[decodedKey] = {
      ...v,
      tuningPresets: normalizeTuningPresets(v?.tuningPresets, decodedKey),
    };
  }
  return result;
}

type SyncListener = () => void;

class DualDatabaseService {
  private students: Record<string, StudentAccount> = {};
  private teacherProfile: StudentAccount;
  private giftcodes: Record<string, Giftcode> = {};
  private lobby: LobbyConfig;
  private checkpoints: GameSaveCheckpoint[] = [];
  private listeners: Set<SyncListener> = new Set();
  private channel: BroadcastChannel | null = null;

  // Firebase Realtime Database state
  private fbApp: FirebaseApp | null = null;
  private fbDb: Database | null = null;
  private fbUnsubscribes: Unsubscribe[] = [];
  private fbConnected: boolean = false;
  private fbError: string | null = null;
  private matchmakingListeners: Set<(rooms: Record<string, MatchmakingRoomEntry>) => void> = new Set();
  private pendingMatchmakingRegistrations: Map<string, MatchmakingRoomEntry> = new Map();
  private fbMatchmakingUnsub: (() => void) | null = null;
  private lastMatchmakingSnapshot: Record<string, MatchmakingRoomEntry> = {};

  constructor() {
    this.lobby = this.createDefaultLobby();
    this.teacherProfile = this.createDefaultTeacherProfile();
    this.loadFromLocalStorage(true);

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('tripled_open_cup_sync');
      this.channel.onmessage = (evt) => {
        if (evt?.data?.target === 'lobby') return;
        this.loadFromLocalStorage(false);
        this.notify();
      };
    }

    // Attempt auto-reconnect if firebaseConfig was saved previously or provided via Vercel env
    const savedFb = localStorage.getItem(STORAGE_KEYS.FIREBASE_CFG);
    if (savedFb) {
      try {
        const parsed = JSON.parse(savedFb);
        if (parsed && parsed.databaseURL) {
          this.connectFirebase(parsed, false);
        }
      } catch {
        // ignore malformed saved config
      }
    } else {
      const databaseURL =
        (typeof import.meta !== 'undefined' &&
          import.meta.env?.VITE_FIREBASE_DATABASE_URL) ||
        'https://tripledopencup-default-rtdb.asia-southeast1.firebasedatabase.app';
      const apiKey =
        (typeof import.meta !== 'undefined' &&
          import.meta.env?.VITE_FIREBASE_API_KEY) ||
        'AIzaSyC1g5qlsTs2wS1xstR39ynKOx5yuY-Bhkc';
      const projectId =
        (typeof import.meta !== 'undefined' &&
          import.meta.env?.VITE_FIREBASE_PROJECT_ID) ||
        'tripledopencup';
      const authDomain =
        (typeof import.meta !== 'undefined' &&
          import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) ||
        'tripledopencup.firebaseapp.com';

      if (databaseURL) {
        const envConfig: FirebaseConfigInput = {
          apiKey,
          databaseURL,
          projectId,
          authDomain,
        };
        this.connectFirebase(envConfig, false);
      }
    }
  }

  private createDefaultTeacherProfile(): StudentAccount {
    return {
      id: 'teacher_host',
      username: 'Thầy/Cô TripleD',
      email: 'giaovien@gmail.com',
      pin: '8888',
      coins: 1500,
      rp: 750,
      totalMatches: 15,
      top1Count: 9,
      ownedParts: [
        ...STARTER_OWNED_PARTS,
        'chassis_dragon',
        'paint_gold24k',
        'decal_dna',
        'wheels_hellfire',
        'spoiler_police',
        'underglow_atp',
        'trail_rainbow',
      ],
      loadout: {
        chassis: 'chassis_dragon',
        paint: 'paint_gold24k',
        decal: 'decal_dna',
        wheels: 'wheels_hellfire',
        spoiler: 'spoiler_police',
        underglow: 'underglow_atp',
        trail: 'trail_rainbow',
      },
      tuningLoadout: { ...DEFAULT_TUNING_LOADOUT },
      tuningPresets: [...EMPTY_TUNING_PRESETS],
      activePresetIndex: null,
      gachaPity: 0,
      usedGiftcodes: [],
      matchHistory: [],
      lastActive: Date.now(),
    };
  }

  private createDefaultLobby(): LobbyConfig {
    const randomPin = String(Math.floor(100000 + Math.random() * 900000));
    return {
      roomPin: randomPin,
      friendRoomPin: randomPin,
      friendHostName: 'Phòng Bạn Bè',
      playModeCategory: 'practice_ai',
      botDifficulty: 'medium',
      teacherCupOpen: true,
      tournamentTitle: 'GIẢI ĐẤU TRIPLE D OPEN CUP',
      teacherRewards: {
        top1Coins: 100,
        top2Coins: 70,
        top3Coins: 50,
        top10Coins: 30,
        finishCoins: 15,
        teamWinBonusCoins: 30,
      },
      hostMode: 'play',
      raceMode: 'solo',
      teamCount: 2,
      mapId: MAPS[0].id,
      laps: 5,
      botCount: 0,
      status: 'waiting',
      participants: [],
    };
  }

  private loadFromLocalStorage(isInitialBoot: boolean = false): void {
    try {
      const rawStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (rawStudents) {
        const parsed = JSON.parse(rawStudents);
        const cleaned: Record<string, StudentAccount> = {};
        let hadLegacy = false;
        for (const [k, v] of Object.entries(parsed)) {
          if (
            k !== 'hoangnam@gmail.com' &&
            k !== 'khanhlinh@gmail.com' &&
            k !== 'duckhiem@gmail.com' &&
            k !== 'minhthu@gmail.com' &&
            k !== 'quanghuy@gmail.com'
          ) {
            const stu = v as StudentAccount;
            cleaned[k] = {
              ...stu,
              tuningPresets: normalizeTuningPresets(stu.tuningPresets, k),
            };
          } else {
            hadLegacy = true;
          }
        }
        this.students = cleaned;
        if (hadLegacy) {
          localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(this.students));
        }
      } else {
        this.students = {};
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(this.students));
      }

      const rawTeacher = localStorage.getItem(STORAGE_KEYS.TEACHER);
      if (rawTeacher) {
        const parsedTeacher = JSON.parse(rawTeacher);
        this.teacherProfile = {
          ...this.createDefaultTeacherProfile(),
          ...parsedTeacher,
          tuningPresets: normalizeTuningPresets(
            parsedTeacher?.tuningPresets,
            'teacher_host'
          ),
        };
      } else {
        localStorage.setItem(
          STORAGE_KEYS.TEACHER,
          JSON.stringify(this.teacherProfile)
        );
      }

      const rawCodes = localStorage.getItem(STORAGE_KEYS.GIFTCODES);
      if (rawCodes) {
        const parsedCodes = JSON.parse(rawCodes);
        let codesModified = false;
        for (const c of INITIAL_GIFTCODES) {
          if (!parsedCodes[c.code]) {
            parsedCodes[c.code] = c;
            codesModified = true;
          } else if (c.rewardParts && !parsedCodes[c.code].rewardParts) {
            parsedCodes[c.code].rewardParts = c.rewardParts;
            codesModified = true;
          }
        }
        this.giftcodes = parsedCodes;
        if (codesModified) {
          localStorage.setItem(
            STORAGE_KEYS.GIFTCODES,
            JSON.stringify(this.giftcodes)
          );
        }
      } else {
        const initialCodes: Record<string, Giftcode> = {};
        for (const c of INITIAL_GIFTCODES) {
          initialCodes[c.code] = c;
        }
        this.giftcodes = initialCodes;
        localStorage.setItem(
          STORAGE_KEYS.GIFTCODES,
          JSON.stringify(this.giftcodes)
        );
      }

      if (isInitialBoot) {
        const rawLobby =
          (typeof sessionStorage !== 'undefined' &&
            sessionStorage.getItem(STORAGE_KEYS.LOBBY)) ||
          localStorage.getItem(STORAGE_KEYS.LOBBY);
        if (rawLobby) {
          const parsedLobby = JSON.parse(rawLobby);
          this.lobby = {
            ...this.createDefaultLobby(),
            ...parsedLobby,
            // Always reset participants to empty and status to waiting on fresh tab boot
            isFriendGuest: false,
            assignedGuestId: undefined,
            participants: [],
            botCount: 0,
            status: 'waiting',
          };
        } else {
          try {
            sessionStorage.setItem(STORAGE_KEYS.LOBBY, JSON.stringify(this.lobby));
          } catch {}
          localStorage.setItem(STORAGE_KEYS.LOBBY, JSON.stringify(this.lobby));
        }
      }

      const rawCheckpoints = localStorage.getItem(STORAGE_KEYS.CHECKPOINTS);
      if (rawCheckpoints) {
        const parsedCp = JSON.parse(rawCheckpoints);
        if (Array.isArray(parsedCp)) {
          this.checkpoints = parsedCp;
        }
      }
      if (this.checkpoints.length === 0) {
        const initialCp: GameSaveCheckpoint = {
          id: `cp_init_${Date.now()}`,
          label: 'Mốc lưu tự động (Mặc định)',
          createdAt: Date.now(),
          studentCount: Object.keys(this.students).length,
          students: JSON.parse(JSON.stringify(this.students)),
          teacherProfile: JSON.parse(JSON.stringify(this.teacherProfile)),
          giftcodes: JSON.parse(JSON.stringify(this.giftcodes)),
        };
        this.checkpoints = [initialCp];
        localStorage.setItem(
          STORAGE_KEYS.CHECKPOINTS,
          JSON.stringify(this.checkpoints)
        );
      }
    } catch {
      // Fallback to in-memory defaults
    }
  }

  private syncStudentToCloud(email: string, remove: boolean = false): void {
    if (!this.fbDb || !this.fbConnected) return;
    const cleanEmail = email.trim().toLowerCase();
    const encodedKey = encodeFirebaseKey(cleanEmail);
    const studentNodeRef = ref(this.fbDb, `tripled/students/${encodedKey}`);
    if (remove) {
      set(studentNodeRef, null).catch(() => {});
    } else if (this.students[cleanEmail]) {
      set(studentNodeRef, sanitizeForFirebase(this.students[cleanEmail])).catch(() => {});
    }
  }

  private syncGiftcodeToCloud(code: string, remove: boolean = false): void {
    if (!this.fbDb || !this.fbConnected) return;
    const cleanCode = code.trim().toUpperCase();
    const encodedKey = encodeFirebaseKey(cleanCode);
    const giftNodeRef = ref(this.fbDb, `tripled/giftcodes/${encodedKey}`);
    if (remove) {
      set(giftNodeRef, null).catch(() => {});
    } else if (this.giftcodes[cleanCode]) {
      set(giftNodeRef, sanitizeForFirebase(this.giftcodes[cleanCode])).catch(() => {});
    }
  }

  private persistAndSync(
    target:
      | 'students'
      | 'teacher'
      | 'giftcodes'
      | 'lobby'
      | 'checkpoints'
      | 'all' = 'all',
    syncFullTreeToCloud: boolean = false
  ): void {
    try {
      if (target === 'students' || target === 'all') {
        localStorage.setItem(
          STORAGE_KEYS.STUDENTS,
          JSON.stringify(this.students)
        );
        if (syncFullTreeToCloud && this.fbDb && this.fbConnected) {
          const safeStudents = sanitizeForFirebase(sanitizeStudentsForFirebase(this.students));
          set(ref(this.fbDb, 'tripled/students'), safeStudents).catch(() => {});
        }
      }
      if (target === 'teacher' || target === 'all') {
        localStorage.setItem(
          STORAGE_KEYS.TEACHER,
          JSON.stringify(this.teacherProfile)
        );
        if (this.fbDb && this.fbConnected) {
          set(ref(this.fbDb, 'tripled/teacher'), sanitizeForFirebase(this.teacherProfile)).catch(
            () => {}
          );
        }
      }
      if (target === 'giftcodes' || target === 'all') {
        localStorage.setItem(
          STORAGE_KEYS.GIFTCODES,
          JSON.stringify(this.giftcodes)
        );
        if (syncFullTreeToCloud && this.fbDb && this.fbConnected) {
          set(ref(this.fbDb, 'tripled/giftcodes'), sanitizeForFirebase(this.giftcodes)).catch(
            () => {}
          );
        }
      }
      if (target === 'lobby' || target === 'all') {
        try {
          sessionStorage.setItem(STORAGE_KEYS.LOBBY, JSON.stringify(this.lobby));
        } catch {}
        if (!this.lobby.isFriendGuest) {
          localStorage.setItem(STORAGE_KEYS.LOBBY, JSON.stringify(this.lobby));
        }
      }
      if (target === 'checkpoints' || target === 'all') {
        localStorage.setItem(
          STORAGE_KEYS.CHECKPOINTS,
          JSON.stringify(this.checkpoints)
        );
      }
      if (target !== 'lobby') {
        this.channel?.postMessage({ type: 'SYNC', target });
      }
    } catch {
      // ignore quota errors
    }
    this.notify();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  // Firebase Realtime Database Connection
  public async connectFirebase(
    config: FirebaseConfigInput,
    pushInitialIfEmpty: boolean = true
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      this.disconnectFirebase(false);
      const existing = getApps();
      for (const app of existing) {
        if (app.name === 'tripled-rtdb') {
          await deleteApp(app);
        }
      }
      this.fbApp = initializeApp(config, 'tripled-rtdb');
      this.fbDb = getDatabase(this.fbApp);
      this.fbConnected = true;
      this.fbError = null;
      localStorage.setItem(STORAGE_KEYS.FIREBASE_CFG, JSON.stringify(config));

      const studentsRef = ref(this.fbDb, 'tripled/students');
      const giftcodesRef = ref(this.fbDb, 'tripled/giftcodes');
      // Realtime Database listeners: Sync accounts and giftcodes with timestamp conflict protection
      const u1 = onValue(
        studentsRef,
        (snap) => {
          const val = snap.val();
          if (val) {
            const incoming = desanitizeStudentsFromFirebase(val);
            const now = Date.now();
            const merged: Record<string, StudentAccount> = {};
            for (const [emailKey, remoteAcc] of Object.entries(incoming)) {
              const localAcc = this.students[emailKey];
              // Preserve local state if it was updated within the last 1.5s and is newer than incoming snapshot
              if (
                localAcc &&
                (localAcc.lastActive || 0) > (remoteAcc.lastActive || 0) &&
                now - (localAcc.lastActive || 0) < 1500
              ) {
                merged[emailKey] = localAcc;
              } else {
                merged[emailKey] = remoteAcc;
              }
            }
            this.students = merged;
            localStorage.setItem(
              STORAGE_KEYS.STUDENTS,
              JSON.stringify(this.students)
            );
            this.notify();
          } else if (pushInitialIfEmpty) {
            const safeStudents = sanitizeStudentsForFirebase(this.students);
            set(studentsRef, safeStudents).catch(() => {});
          }
        },
        (err) => {
          this.fbError = err.message;
          this.notify();
        }
      );

      const u2 = onValue(giftcodesRef, (snap) => {
        const val = snap.val();
        if (val) {
          for (const c of INITIAL_GIFTCODES) {
            if (!val[c.code]) {
              val[c.code] = c;
            } else if (c.rewardParts && !val[c.code].rewardParts) {
              val[c.code].rewardParts = c.rewardParts;
            }
          }
          this.giftcodes = val;
          localStorage.setItem(
            STORAGE_KEYS.GIFTCODES,
            JSON.stringify(this.giftcodes)
          );
          this.notify();
        } else if (pushInitialIfEmpty) {
          set(giftcodesRef, this.giftcodes).catch(() => {});
        }
      });

      this.fbUnsubscribes = [u1, u2];
      this.attachMatchmakingListenerIfReady();
      this.notify();
      return { ok: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Lỗi kết nối Firebase';
      this.fbConnected = false;
      this.fbError = msg;
      this.notify();
      return { ok: false, error: msg };
    }
  }

  public disconnectFirebase(clearSaved: boolean = true): void {
    if (this.fbMatchmakingUnsub) {
      this.fbMatchmakingUnsub();
      this.fbMatchmakingUnsub = null;
    }
    this.fbUnsubscribes.forEach((u) => u());
    this.fbUnsubscribes = [];
    this.fbConnected = false;
    this.fbDb = null;
    if (clearSaved) {
      localStorage.removeItem(STORAGE_KEYS.FIREBASE_CFG);
    }
    this.notify();
  }

  public getFirebaseStatus(): {
    connected: boolean;
    error: string | null;
    savedConfig: string;
  } {
    return {
      connected: this.fbConnected,
      error: this.fbError,
      savedConfig: localStorage.getItem(STORAGE_KEYS.FIREBASE_CFG) || '',
    };
  }

  // Real-time Room Sync (Triple Transport: WebRTC P2P + BroadcastChannel + Firebase RTDB)
  public syncRoomState(roomPin: string, roomData: any): void {
    if (this.fbDb && this.fbConnected && roomPin && roomData) {
      const safeData = sanitizeForFirebase(roomData);
      update(ref(this.fbDb, `tripled/rooms/${roomPin}`), safeData).catch(
        () => {}
      );
    }
  }

  public listenRoomState(
    roomPin: string,
    onUpdate: (data: any) => void
  ): () => void {
    if (this.fbDb && this.fbConnected && roomPin) {
      const roomRef = ref(this.fbDb, `tripled/rooms/${roomPin}`);
      return onValue(roomRef, (snap) => {
        const val = snap.val();
        if (val) {
          onUpdate(val);
        }
      });
    }
    return () => {};
  }

  public removeRoomState(roomPin: string): void {
    if (this.fbDb && this.fbConnected && roomPin) {
      set(ref(this.fbDb, `tripled/rooms/${roomPin}`), null).catch(() => {});
      set(ref(this.fbDb, `rooms/${roomPin}`), null).catch(() => {});
    }
  }

  /**
   * Clears stale racer positions and hazards in Firebase RTDB before starting a new race
   * or returning to the lobby so old `finished: true` states never trigger the 60s timer on Lap 1!
   */
  public clearRoomRaceData(roomPin: string): void {
    if (this.fbDb && this.fbConnected && roomPin) {
      set(ref(this.fbDb, `tripled/rooms/${roomPin}/racers`), null).catch(() => {});
      set(ref(this.fbDb, `tripled/rooms/${roomPin}/hazards`), null).catch(() => {});
    }
  }

  /**
   * Resets a room's state in Firebase RTDB back to 'waiting' after a race finishes or on "Đua Tiếp",
   * preventing guests from immediately re-launching into a finished race.
   */
  public resetRoomForNextRace(
    roomPin: string,
    isHost: boolean = false,
    updatedLobby?: LobbyConfig
  ): void {
    if (!roomPin) return;
    this.clearRoomRaceData(roomPin);
    if (this.fbDb && this.fbConnected) {
      const patch: Record<string, any> = {
        status: 'waiting',
        updatedAt: Date.now(),
      };
      if (isHost && updatedLobby) {
        const networkParticipants = (updatedLobby.participants || []).map((p) => ({
          ...p,
          tuningLoadout: p.isBot ? p.tuningLoadout : undefined,
        }));
        patch.lobby = sanitizeForFirebase({
          ...updatedLobby,
          status: 'waiting',
          participants: networkParticipants,
        });
      }
      update(ref(this.fbDb, `tripled/rooms/${roomPin}`), patch).catch(() => {});
      if (isHost) {
        set(ref(this.fbDb, `tripled/rooms/${roomPin}/events`), null).catch(() => {});
      }
    }
  }

  /**
   * Shared Room Roster Presence in Firebase RTDB (`tripled/rooms/${roomPin}/roster/${playerId}`).
   * Ensures that when >5 players join concurrently, no participant is ever dropped due to race conditions!
   */
  public syncParticipantToRoomRoster(
    roomPin: string,
    participant: LobbyConfig['participants'][0]
  ): void {
    if (this.fbDb && this.fbConnected && roomPin && participant?.id) {
      const safeKey = encodeFirebaseKey(participant.id.toLowerCase());
      const safeEntry = sanitizeForFirebase({
        ...participant,
        tuningLoadout: participant.isBot ? participant.tuningLoadout : undefined,
        updatedAt: Date.now(),
      });
      set(
        ref(this.fbDb, `tripled/rooms/${roomPin}/roster/${safeKey}`),
        safeEntry
      ).catch(() => {});
    }
  }

  public removeParticipantFromRoomRoster(
    roomPin: string,
    playerId: string
  ): void {
    if (this.fbDb && this.fbConnected && roomPin && playerId) {
      const safeKey = encodeFirebaseKey(playerId.toLowerCase());
      set(
        ref(this.fbDb, `tripled/rooms/${roomPin}/roster/${safeKey}`),
        null
      ).catch(() => {});
    }
  }

  public clearRoomRoster(roomPin: string): void {
    if (this.fbDb && this.fbConnected && roomPin) {
      set(ref(this.fbDb, `tripled/rooms/${roomPin}/roster`), null).catch(() => {});
    }
  }

  public listenRoomRoster(
    roomPin: string,
    onRoster: (roster: LobbyConfig['participants']) => void
  ): () => void {
    if (this.fbDb && this.fbConnected && roomPin) {
      const rosterRef = ref(this.fbDb, `tripled/rooms/${roomPin}/roster`);
      return onValue(rosterRef, (snap) => {
        const val = snap.val();
        if (!val || typeof val !== 'object') {
          onRoster([]);
          return;
        }
        const list: LobbyConfig['participants'] = [];
        for (const [, p] of Object.entries(val) as [string, any][]) {
          if (p && typeof p === 'object' && p.id && p.username) {
            list.push(p as LobbyConfig['participants'][0]);
          }
        }
        onRoster(list);
      });
    }
    return () => {};
  }

  // Real-time Online Auto-Matchmaking Registry
  private attachMatchmakingListenerIfReady() {
    if (!this.fbDb || !this.fbConnected) return;

    // Push buffered room registrations immediately upon connection
    if (this.pendingMatchmakingRegistrations.size > 0) {
      this.pendingMatchmakingRegistrations.forEach((entry) => {
        const safeEntry = sanitizeForFirebase(entry);
        set(ref(this.fbDb!, `tripled/matchmaking/${entry.roomPin}`), safeEntry).catch(() => {});
      });
    }

    if (this.matchmakingListeners.size === 0 || this.fbMatchmakingUnsub) return;

    const matchRef = ref(this.fbDb, 'tripled/matchmaking');
    this.fbMatchmakingUnsub = onValue(matchRef, (snap) => {
      const val = snap.val();
      const rooms =
        val && typeof val === 'object'
          ? (val as Record<string, MatchmakingRoomEntry>)
          : {};
      this.lastMatchmakingSnapshot = rooms;
      this.matchmakingListeners.forEach((fn) => fn(rooms));
    });
  }

  public registerMatchmakingRoom(entry: MatchmakingRoomEntry): void {
    if (!entry || !entry.roomPin) return;
    this.pendingMatchmakingRegistrations.set(entry.roomPin, entry);
    if (this.fbDb && this.fbConnected) {
      const safeEntry = sanitizeForFirebase(entry);
      set(ref(this.fbDb, `tripled/matchmaking/${entry.roomPin}`), safeEntry).catch(() => {});
    }
  }

  public updateMatchmakingRoom(
    roomPin: string,
    patch: Partial<MatchmakingRoomEntry>
  ): void {
    if (!roomPin) return;
    const existing = this.pendingMatchmakingRegistrations.get(roomPin);
    if (existing) {
      this.pendingMatchmakingRegistrations.set(roomPin, {
        ...existing,
        ...patch,
        updatedAt: Date.now(),
      });
    }
    if (this.fbDb && this.fbConnected) {
      const safePatch = sanitizeForFirebase({
        ...patch,
        updatedAt: Date.now(),
      });
      update(ref(this.fbDb, `tripled/matchmaking/${roomPin}`), safePatch).catch(() => {});
    }
  }

  public removeMatchmakingRoom(roomPin: string): void {
    if (!roomPin) return;
    this.pendingMatchmakingRegistrations.delete(roomPin);
    if (this.fbDb && this.fbConnected) {
      set(ref(this.fbDb, `tripled/matchmaking/${roomPin}`), null).catch(() => {});
    }
  }

  public listenMatchmakingRooms(
    onRoomsUpdate: (rooms: Record<string, MatchmakingRoomEntry>) => void
  ): () => void {
    this.matchmakingListeners.add(onRoomsUpdate);
    if (Object.keys(this.lastMatchmakingSnapshot).length > 0) {
      onRoomsUpdate(this.lastMatchmakingSnapshot);
    }
    this.attachMatchmakingListenerIfReady();

    return () => {
      this.matchmakingListeners.delete(onRoomsUpdate);
      if (this.matchmakingListeners.size === 0 && this.fbMatchmakingUnsub) {
        this.fbMatchmakingUnsub();
        this.fbMatchmakingUnsub = null;
      }
    };
  }

  public pushRoomNetEvent(roomPin: string, eventId: string, msg: any): void {
    if (this.fbDb && this.fbConnected && roomPin && eventId) {
      const safeEventKey = encodeFirebaseKey(eventId);
      const safePayload = sanitizeForFirebase({
        ...msg,
        _eventId: eventId,
        _ts: Date.now(),
      });
      set(ref(this.fbDb, `tripled/rooms/${roomPin}/events/${safeEventKey}`), safePayload).catch(() => {});
    }
  }

  public listenRoomNetEvents(
    roomPin: string,
    onEvent: (eventId: string, msg: any) => void
  ): () => void {
    if (this.fbDb && this.fbConnected && roomPin) {
      const eventsRef = ref(this.fbDb, `tripled/rooms/${roomPin}/events`);
      const seenKeys = new Set<string>();
      let isFirstSnapshot = true;
      const initialCutoff = Date.now() - 12000;

      return onValue(eventsRef, (snap) => {
        const val = snap.val();
        if (!val || typeof val !== 'object') {
          isFirstSnapshot = false;
          return;
        }
        const entries = Object.entries(val) as [string, any][];
        entries.sort((a, b) => (a[1]?._ts || 0) - (b[1]?._ts || 0));

        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          for (const [k, evt] of entries) {
            seenKeys.add(k);
            if (!evt || typeof evt !== 'object') continue;
            const ts = typeof evt._ts === 'number' ? evt._ts : 0;
            // Process recent control events from initial snapshot
            if (ts >= initialCutoff) {
              onEvent(evt._eventId || decodeFirebaseKey(k), evt);
            }
          }
          return;
        }

        // Subsequent real-time updates: process any unseen key immediately (immune to clock skew!)
        for (const [k, evt] of entries) {
          if (seenKeys.has(k)) continue;
          seenKeys.add(k);
          if (!evt || typeof evt !== 'object') continue;
          onEvent(evt._eventId || decodeFirebaseKey(k), evt);
        }
      });
    }
    return () => {};
  }

  public syncRacerPositionToCloud(
    roomPin: string,
    racerId: string,
    posData: any
  ): void {
    if (this.fbDb && this.fbConnected && roomPin && racerId) {
      const safeKey = encodeFirebaseKey(racerId.toLowerCase());
      const safeData = sanitizeForFirebase(posData);
      set(
        ref(this.fbDb, `tripled/rooms/${roomPin}/racers/${safeKey}`),
        safeData
      ).catch(() => {});
    }
  }

  public listenRoomRacersFromCloud(
    roomPin: string,
    onRacers: (racersMap: Record<string, any>) => void
  ): () => void {
    if (this.fbDb && this.fbConnected && roomPin) {
      const racersRef = ref(this.fbDb, `tripled/rooms/${roomPin}/racers`);
      let pendingVal: Record<string, any> | null = null;
      let rafId: number | null = null;

      const unsubscribe = onValue(racersRef, (snap) => {
        const val = snap.val();
        if (!val || typeof val !== 'object') return;
        pendingVal = val;
        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            if (!pendingVal) return;
            const decoded: Record<string, any> = {};
            for (const [k, v] of Object.entries(pendingVal)) {
              if (v && typeof v === 'object') {
                decoded[decodeFirebaseKey(k)] = v;
              }
            }
            pendingVal = null;
            onRacers(decoded);
          });
        }
      });

      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        unsubscribe();
      };
    }
    return () => {};
  }

  public pushRoomHazardToCloud(roomPin: string, hazard: any): void {
    if (this.fbDb && this.fbConnected && roomPin && hazard?.id) {
      const safeKey = encodeFirebaseKey(hazard.id);
      const safeHazard = sanitizeForFirebase({
        ...hazard,
        _ts: Date.now(),
      });
      set(ref(this.fbDb, `tripled/rooms/${roomPin}/hazards/${safeKey}`), safeHazard).catch(() => {});
    }
  }

  public listenRoomHazardsFromCloud(
    roomPin: string,
    onHazards: (hazards: any[]) => void
  ): () => void {
    if (this.fbDb && this.fbConnected && roomPin) {
      const hazardsRef = ref(this.fbDb, `tripled/rooms/${roomPin}/hazards`);
      const seenKeys = new Set<string>();
      let isFirstSnapshot = true;
      const initialCutoff = Date.now() - 5000;
      return onValue(hazardsRef, (snap) => {
        const val = snap.val();
        if (!val || typeof val !== 'object') {
          isFirstSnapshot = false;
          return;
        }
        const list: any[] = [];
        for (const [k, v] of Object.entries(val) as [string, any][]) {
          if (seenKeys.has(k)) continue;
          seenKeys.add(k);
          if (!v || typeof v !== 'object') continue;
          if (isFirstSnapshot && (v._ts || 0) < initialCutoff) continue;
          list.push(v);
        }
        isFirstSnapshot = false;
        if (list.length > 0) {
          onHazards(list);
        }
      });
    }
    return () => {};
  }

  /**
   * Syncs a player's aggregated ComputedTuningStats (WITHOUT exposing individual part names/IDs)
   * to Firebase (`rooms/{roomPin}/players/{playerId}/computedStats`), localStorage, and active lobby state.
   */
  public syncPlayerComputedStatsToRoom(
    roomPin: string | null | undefined,
    playerId: string,
    statsInput: ComputedTuningStats | Partial<TuningLoadout> | null | undefined
  ): ComputedTuningStats {
    const computed = buildComputedStats(statsInput);
    const safeComputedStats: ComputedTuningStats = {
      topSpeedBonus: computed.topSpeedBonus,
      accelBonus: computed.accelBonus,
      handlingBonus: computed.handlingBonus,
      nitroBonus: computed.nitroBonus,
      weightBonus: computed.weightBonus,
      passives: [...(computed.passives || [])],
      maxSpeed: computed.maxSpeed,
      accel: computed.accel,
      turnSpeed: computed.turnSpeed,
      driftGrip: computed.driftGrip,
      nitroDuration: computed.nitroDuration,
      weight: computed.weight,
    };

    try {
      localStorage.setItem(
        STORAGE_KEYS.ACTIVE_COMPUTED_STATS,
        JSON.stringify(safeComputedStats)
      );
      localStorage.setItem(
        `tripled_computed_stats_${playerId.toLowerCase()}`,
        JSON.stringify(safeComputedStats)
      );
      if (roomPin) {
        localStorage.setItem(
          `tripled_room_stats_${roomPin}_${playerId.toLowerCase()}`,
          JSON.stringify(safeComputedStats)
        );
      }
    } catch {
      // ignore storage quota errors
    }

    // Update participant in active lobby if present
    if (this.lobby && Array.isArray(this.lobby.participants)) {
      let changed = false;
      this.lobby.participants = this.lobby.participants.map((p) => {
        if (p.id.toLowerCase() === playerId.toLowerCase()) {
          changed = true;
          return {
            ...p,
            computedStats: safeComputedStats,
          };
        }
        return p;
      });
      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEYS.LOBBY, JSON.stringify(this.lobby));
        } catch {}
      }
    }

    // Push to Firebase Realtime Database at rooms/{roomPin}/players/{playerId}/computedStats
    if (this.fbDb && this.fbConnected && roomPin && playerId) {
      const safePlayerKey = encodeFirebaseKey(playerId.toLowerCase());
      set(
        ref(
          this.fbDb,
          `rooms/${roomPin}/players/${safePlayerKey}/computedStats`
        ),
        safeComputedStats
      ).catch(() => {});
      set(
        ref(
          this.fbDb,
          `tripled/rooms/${roomPin}/players/${safePlayerKey}/computedStats`
        ),
        safeComputedStats
      ).catch(() => {});
    }

    return safeComputedStats;
  }

  /**
   * Listens to `rooms/{roomPin}/players` in Firebase Realtime DB so all peers in the room
   * receive real-time `computedStats` updates when someone joins or switches Presets in Lobby.
   */
  public listenRoomPlayersComputedStats(
    roomPin: string,
    onStatsMap: (map: Record<string, ComputedTuningStats>) => void
  ): () => void {
    if (this.fbDb && this.fbConnected && roomPin) {
      const playersRef = ref(this.fbDb, `rooms/${roomPin}/players`);
      return onValue(playersRef, (snap) => {
        const val = snap.val();
        if (!val || typeof val !== 'object') return;
        const result: Record<string, ComputedTuningStats> = {};
        for (const [encodedId, pNode] of Object.entries(val)) {
          const decodedId = decodeFirebaseKey(encodedId);
          if (pNode && typeof pNode === 'object' && 'computedStats' in pNode) {
            result[decodedId] = (pNode as { computedStats: ComputedTuningStats })
              .computedStats;
          }
        }
        onStatsMap(result);
      });
    }
    return () => {};
  }

  /**
   * Client-Authoritative helper: Reads the local client's active equipped TuningLoadout / Preset
   * directly from the local account and localStorage, NEVER allowing a remote lobby reset to baseStats.
   */
  public getAuthoritativeLocalTuning(
    playerId: string | null,
    isTeacher: boolean = false
  ): {
    tuningLoadout: TuningLoadout;
    computedStats: ComputedTuningStats;
    physics: ComputedTuningPhysics;
  } {
    const account = isTeacher
      ? this.teacherProfile
      : playerId
      ? this.getStudent(playerId)
      : null;

    let activeLoadout: TuningLoadout = { ...DEFAULT_TUNING_LOADOUT };

    if (account) {
      const normalizedPresets = normalizeTuningPresets(
        account.tuningPresets,
        account.id
      );
      const presetIdx = account.activePresetIndex;
      const activePreset =
        typeof presetIdx === 'number' &&
        presetIdx >= 0 &&
        presetIdx < 3 &&
        normalizedPresets[presetIdx]
          ? normalizedPresets[presetIdx]
          : null;

      if (activePreset && activePreset.loadout) {
        activeLoadout = { ...activePreset.loadout };
      } else if (account.tuningLoadout) {
        activeLoadout = { ...account.tuningLoadout };
      }
    }

    const physics = calculateTuningPhysics(activeLoadout, 335, 395, 3.2, 2.0);
    const computedStats = buildComputedStats(activeLoadout);

    return {
      tuningLoadout: activeLoadout,
      computedStats,
      physics,
    };
  }

  // Student Account Management
  public getSavedCredentials(): {
    username: string;
    email: string;
    pin: string;
  } | null {
    try {
      const sessionRaw =
        typeof sessionStorage !== 'undefined'
          ? sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER)
          : null;
      if (sessionRaw) {
        return JSON.parse(sessionRaw);
      }
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public clearSavedCredentials(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch {}
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  public loginStudent(
    email: string,
    pin: string
  ): { ok: boolean; account?: StudentAccount; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim();

    const existing = this.students[cleanEmail];
    if (!existing) {
      return {
        ok: false,
        error:
          'Tài khoản Gmail này chưa được đăng ký! Vui lòng chọn mục "📝 ĐĂNG KÝ MỚI" để tạo tài khoản.',
      };
    }

    if (existing.banned) {
      return {
        ok: false,
        error:
          '🚫 Tài khoản của bạn đã bị Giáo viên khóa (BAN)! Vui lòng liên hệ Giáo viên để được mở khóa.',
      };
    }

    if (existing.pin !== cleanPin) {
      return {
        ok: false,
        error:
          'Sai mã PIN 4 chữ số! Nếu quên PIN, hãy nhờ Giáo viên xem giúp trong Bảng Quản Trị.',
      };
    }

    const normalizedPresets = normalizeTuningPresets(
      existing.tuningPresets,
      cleanEmail
    );
    const activePreset =
      typeof existing.activePresetIndex === 'number' &&
      normalizedPresets[existing.activePresetIndex]
        ? normalizedPresets[existing.activePresetIndex]
        : null;
    const effectiveTuning =
      activePreset?.loadout ||
      existing.tuningLoadout || { ...DEFAULT_TUNING_LOADOUT };
    const computedStats = buildComputedStats(effectiveTuning);

    existing.lastActive = Date.now();
    this.students[cleanEmail] = {
      ...existing,
      ownedParts: existing.ownedParts || [...STARTER_OWNED_PARTS],
      loadout:
        activePreset?.carLoadout || existing.loadout || { ...DEFAULT_LOADOUT },
      tuningLoadout: effectiveTuning,
      computedStats,
      tuningPresets: normalizedPresets,
      activePresetIndex: existing.activePresetIndex ?? null,
      usedGiftcodes: existing.usedGiftcodes || [],
      matchHistory: existing.matchHistory || [],
    };
    const credJson = JSON.stringify({
      username: existing.username,
      email: cleanEmail,
      pin: cleanPin,
    });
    try {
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, credJson);
    } catch {}
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, credJson);
    localStorage.setItem(
      STORAGE_KEYS.ACTIVE_COMPUTED_STATS,
      JSON.stringify(computedStats)
    );
    this.syncStudentToCloud(cleanEmail);
    this.persistAndSync('students');
    return { ok: true, account: this.students[cleanEmail] };
  }

  public registerStudent(
    username: string,
    email: string,
    pin: string
  ): { ok: boolean; account?: StudentAccount; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim();
    const cleanName = username.trim();

    if (this.students[cleanEmail]) {
      if (this.students[cleanEmail].banned) {
        return {
          ok: false,
          error:
            '🚫 Tài khoản Gmail này đã bị khóa (BAN) bởi Giáo viên!',
        };
      }
      return {
        ok: false,
        error:
          'Tài khoản Gmail này đã được đăng ký trước đó! Vui lòng chuyển sang mục "🔑 ĐĂNG NHẬP".',
      };
    }

    const initialTuning = { ...DEFAULT_TUNING_LOADOUT };
    const computedStats = buildComputedStats(initialTuning);

    const newAccount: StudentAccount = {
      id: cleanEmail,
      username: cleanName,
      email: cleanEmail,
      pin: cleanPin,
      coins: 100,
      rp: 20,
      totalMatches: 0,
      top1Count: 0,
      ownedParts: [...STARTER_OWNED_PARTS],
      loadout: { ...DEFAULT_LOADOUT },
      tuningLoadout: initialTuning,
      computedStats,
      tuningPresets: [...EMPTY_TUNING_PRESETS],
      activePresetIndex: null,
      gachaPity: 0,
      usedGiftcodes: [],
      matchHistory: [],
      lastActive: Date.now(),
    };

    this.students[cleanEmail] = newAccount;
    const credJson = JSON.stringify({
      username: cleanName,
      email: cleanEmail,
      pin: cleanPin,
    });
    try {
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, credJson);
    } catch {}
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, credJson);
    localStorage.setItem(
      STORAGE_KEYS.ACTIVE_COMPUTED_STATS,
      JSON.stringify(computedStats)
    );
    this.syncStudentToCloud(cleanEmail);
    this.persistAndSync('students');
    return { ok: true, account: newAccount };
  }

  public loginOrRegisterStudent(
    username: string,
    email: string,
    pin: string
  ): { ok: boolean; account?: StudentAccount; error?: string; isNew?: boolean } {
    const cleanEmail = email.trim().toLowerCase();
    if (this.students[cleanEmail]) {
      const res = this.loginStudent(email, pin);
      return { ...res, isNew: false };
    }
    const res = this.registerStudent(username, email, pin);
    return { ...res, isNew: true };
  }

  public getStudent(email: string): StudentAccount | null {
    const lower = email.toLowerCase();
    if (this.students[lower]) return this.students[lower];
    const baseEmail = lower.split('_guest_')[0];
    return this.students[baseEmail] || null;
  }

  public getAllStudents(): StudentAccount[] {
    return Object.values(this.students).sort((a, b) => b.rp - a.rp);
  }

  public updateStudent(account: StudentAccount): void {
    const normalizedPresets = normalizeTuningPresets(
      account.tuningPresets ?? this.students[account.id]?.tuningPresets,
      account.id
    );
    const effectiveTuning =
      account.tuningLoadout ||
      this.students[account.id]?.tuningLoadout || {
        ...DEFAULT_TUNING_LOADOUT,
      };
    const computedStats = buildComputedStats(effectiveTuning);
    this.students[account.id] = {
      ...account,
      tuningPresets: normalizedPresets,
      tuningLoadout: effectiveTuning,
      computedStats,
      lastActive: Date.now(),
    };
    try {
      localStorage.setItem(
        `tripled_tuning_presets_${account.id}`,
        JSON.stringify(normalizedPresets)
      );
      localStorage.setItem(
        STORAGE_KEYS.ACTIVE_COMPUTED_STATS,
        JSON.stringify(computedStats)
      );
      localStorage.setItem(
        `tripled_computed_stats_${account.id.toLowerCase()}`,
        JSON.stringify(computedStats)
      );
    } catch {}
    this.syncStudentToCloud(account.id);
    this.persistAndSync('students');
  }

  public recordMatchResult(
    email: string,
    record: MatchRecord
  ): StudentAccount | null {
    const acc = this.students[email.toLowerCase()];
    if (!acc) return null;

    acc.coins = Math.max(0, acc.coins + record.coinsEarned);
    acc.rp = Math.max(0, acc.rp + record.rpDelta);
    acc.totalMatches = (acc.totalMatches || 0) + 1;
    if (record.placement === 1) {
      acc.top1Count = (acc.top1Count || 0) + 1;
    }
    const history = acc.matchHistory || [];
    acc.matchHistory = [record, ...history].slice(0, 30);
    acc.lastActive = Date.now();

    this.students[acc.id] = acc;
    this.syncStudentToCloud(acc.id);
    this.persistAndSync('students');
    return acc;
  }

  // Giftcode Operations
  public getAllGiftcodes(): Giftcode[] {
    return Object.values(this.giftcodes).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }

  public createGiftcode(code: string, coins: number, maxUses: number): {
    ok: boolean;
    error?: string;
  } {
    const clean = code.trim().toUpperCase();
    if (!clean) return { ok: false, error: 'Vui lòng nhập mã Giftcode.' };
    this.giftcodes[clean] = {
      code: clean,
      coins: Math.max(1, Math.floor(coins)),
      maxUses: Math.max(1, Math.floor(maxUses)),
      usedBy: [],
      createdAt: Date.now(),
    };
    this.syncGiftcodeToCloud(clean);
    this.persistAndSync('giftcodes');
    return { ok: true };
  }

  public deleteGiftcode(code: string): void {
    delete this.giftcodes[code];
    this.syncGiftcodeToCloud(code, true);
    this.persistAndSync('giftcodes');
  }

  public redeemGiftcode(
    email: string,
    rawCode: string
  ): { ok: boolean; coinsAdded?: number; message: string } {
    const code = rawCode.trim().toUpperCase();
    const student = this.students[email.toLowerCase()];
    if (!student) {
      return { ok: false, message: 'Không tìm thấy tài khoản học sinh.' };
    }
    const gift = this.giftcodes[code];
    if (!gift) {
      return { ok: false, message: 'Mã Giftcode không tồn tại hoặc đã hết hạn!' };
    }
    const usedBy = gift.usedBy || [];
    if (usedBy.includes(student.id) || (student.usedGiftcodes || []).includes(code)) {
      return { ok: false, message: 'Bạn đã sử dụng mã Giftcode này rồi!' };
    }
    if (usedBy.length >= gift.maxUses) {
      return { ok: false, message: 'Mã Giftcode này đã hết lượt nhập!' };
    }

    gift.usedBy = [...usedBy, student.id];
    student.coins += gift.coins;
    student.usedGiftcodes = [...(student.usedGiftcodes || []), code];

    const rewardParts =
      gift.rewardParts ||
      (code === 'TRIPLED'
        ? ['chassis_tripled_a', 'paint_tripled_a', 'decal_tripled_a']
        : []);

    if (rewardParts.length > 0) {
      const nextOwned = new Set(student.ownedParts || [...STARTER_OWNED_PARTS]);
      rewardParts.forEach((pid) => nextOwned.add(pid));
      student.ownedParts = Array.from(nextOwned);

      const nextLoadout = { ...(student.loadout || DEFAULT_LOADOUT) };
      if (rewardParts.includes('chassis_tripled_a')) {
        nextLoadout.chassis = 'chassis_tripled_a';
      }
      if (rewardParts.includes('paint_tripled_a')) {
        nextLoadout.paint = 'paint_tripled_a';
      }
      if (rewardParts.includes('decal_tripled_a')) {
        nextLoadout.decal = 'decal_tripled_a';
      }
      student.loadout = nextLoadout;
    }

    this.giftcodes[code] = gift;
    this.students[student.id] = student;
    this.syncGiftcodeToCloud(code);
    this.syncStudentToCloud(student.id);
    this.persistAndSync('all');

    if (rewardParts.length > 0) {
      return {
        ok: true,
        coinsAdded: gift.coins,
        message: `Nhập mã ${code} thành công! Nhận miễn phí Skin Chiến Xa Học Viện TripleD (Bậc A) + ${gift.coins} Xu và đã trang bị lên xe!`,
      };
    }

    return {
      ok: true,
      coinsAdded: gift.coins,
      message: `Nhập mã ${code} thành công! Nhận ngay +${gift.coins} Xu TripleD!`,
    };
  }

  // Admin Operations
  public adjustStudentStats(
    email: string,
    coinDelta: number,
    rpDelta: number
  ): void {
    const acc = this.students[email.toLowerCase()];
    if (!acc) return;
    acc.coins = Math.max(0, acc.coins + coinDelta);
    acc.rp = Math.max(0, acc.rp + rpDelta);
    this.students[acc.id] = acc;
    this.syncStudentToCloud(acc.id);
    this.persistAndSync('students');
  }

  public toggleBanStudent(email: string): StudentAccount | null {
    const cleanEmail = email.trim().toLowerCase();
    const acc = this.students[cleanEmail];
    if (!acc) return null;
    const nextBanned = !acc.banned;
    const updated: StudentAccount = {
      ...acc,
      banned: nextBanned,
      lastActive: Date.now(),
    };
    this.students[cleanEmail] = updated;
    this.syncStudentToCloud(cleanEmail);

    if (nextBanned) {
      this.lobby.participants = (this.lobby.participants || []).filter(
        (p) => p.id !== cleanEmail
      );
      const saved = this.getSavedCredentials();
      if (saved && saved.email.toLowerCase() === cleanEmail) {
        this.clearSavedCredentials();
      }
      this.persistAndSync('all');
    } else {
      this.persistAndSync('students');
    }
    return updated;
  }

  public deleteStudent(email: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    if (!this.students[cleanEmail]) return false;
    delete this.students[cleanEmail];
    this.syncStudentToCloud(cleanEmail, true);

    this.lobby.participants = (this.lobby.participants || []).filter(
      (p) => p.id !== cleanEmail
    );
    const saved = this.getSavedCredentials();
    if (saved && saved.email.toLowerCase() === cleanEmail) {
      this.clearSavedCredentials();
    }
    this.persistAndSync('all');
    return true;
  }

  /**
   * Teacher Admin Feature: Remove a specific skin/part or reset ALL non-starter skins of a student.
   * Automatically resets any equipped slot referencing the removed skin back to DEFAULT_LOADOUT.
   */
  public removeStudentSkin(
    email: string,
    partId: string | 'ALL'
  ): { ok: boolean; message: string; student?: StudentAccount } {
    const cleanEmail = email.trim().toLowerCase();
    const acc = this.students[cleanEmail];
    if (!acc) {
      return {
        ok: false,
        message: 'Không tìm thấy tài khoản học sinh này!',
      };
    }

    const slots: PartSlot[] = [
      'chassis',
      'paint',
      'decal',
      'wheels',
      'spoiler',
      'underglow',
      'trail',
    ];

    if (partId === 'ALL') {
      const nextOwned = [...STARTER_OWNED_PARTS];
      const nextLoadout: CarLoadout = { ...DEFAULT_LOADOUT };
      const nextPresets = normalizeTuningPresets(acc.tuningPresets, cleanEmail).map(
        (pr) => (pr ? { ...pr, carLoadout: { ...DEFAULT_LOADOUT } } : null)
      );

      const updated: StudentAccount = {
        ...acc,
        ownedParts: nextOwned,
        loadout: nextLoadout,
        tuningPresets: nextPresets,
        lastActive: Date.now(),
      };
      this.students[cleanEmail] = updated;
      this.syncStudentToCloud(cleanEmail);

      this.lobby.participants = (this.lobby.participants || []).map((p) =>
        p.id.toLowerCase() === cleanEmail ? { ...p, loadout: nextLoadout } : p
      );
      this.persistAndSync('all');
      return {
        ok: true,
        student: updated,
        message: `Đã xóa toàn bộ skin mở khóa của "${acc.username}" và đưa ngoại hình xe về mặc định!`,
      };
    }

    if (STARTER_OWNED_PARTS.includes(partId)) {
      return {
        ok: false,
        message: 'Không thể xóa trang bị mặc định cơ bản của hệ thống!',
      };
    }

    const partInfo = ALL_PARTS.find((p) => p.id === partId);
    const currentOwned = Array.isArray(acc.ownedParts)
      ? acc.ownedParts
      : [...STARTER_OWNED_PARTS];

    if (!currentOwned.includes(partId)) {
      return {
        ok: false,
        message: 'Học sinh này hiện không sở hữu skin/phụ kiện này!',
      };
    }

    const nextOwned = Array.from(
      new Set([
        ...STARTER_OWNED_PARTS,
        ...currentOwned.filter((id) => id !== partId),
      ])
    );

    const nextLoadout: CarLoadout = { ...(acc.loadout || DEFAULT_LOADOUT) };
    for (const s of slots) {
      if (nextLoadout[s] === partId || !nextOwned.includes(nextLoadout[s])) {
        nextLoadout[s] = DEFAULT_LOADOUT[s];
      }
    }

    const nextPresets = normalizeTuningPresets(acc.tuningPresets, cleanEmail).map(
      (pr) => {
        if (!pr || !pr.carLoadout) return pr;
        const cl: CarLoadout = { ...pr.carLoadout };
        for (const s of slots) {
          if (cl[s] === partId || !nextOwned.includes(cl[s])) {
            cl[s] = DEFAULT_LOADOUT[s];
          }
        }
        return { ...pr, carLoadout: cl };
      }
    );

    const updated: StudentAccount = {
      ...acc,
      ownedParts: nextOwned,
      loadout: nextLoadout,
      tuningPresets: nextPresets,
      lastActive: Date.now(),
    };

    this.students[cleanEmail] = updated;
    this.syncStudentToCloud(cleanEmail);

    this.lobby.participants = (this.lobby.participants || []).map((p) =>
      p.id.toLowerCase() === cleanEmail ? { ...p, loadout: nextLoadout } : p
    );
    this.persistAndSync('all');

    return {
      ok: true,
      student: updated,
      message: `Đã xóa skin "${partInfo?.name || partId}" khỏi tài khoản "${acc.username}"!`,
    };
  }

  // Game Save Checkpoints (Điểm Mốc Lưu Game)
  public getCheckpoints(): GameSaveCheckpoint[] {
    return [...this.checkpoints].sort((a, b) => b.createdAt - a.createdAt);
  }

  public createCheckpoint(label?: string): GameSaveCheckpoint {
    const cleanLabel =
      (label || '').trim() ||
      `Mốc lưu ${new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })}`;
    const cp: GameSaveCheckpoint = {
      id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: cleanLabel,
      createdAt: Date.now(),
      studentCount: Object.keys(this.students).length,
      students: JSON.parse(JSON.stringify(this.students)),
      teacherProfile: JSON.parse(JSON.stringify(this.teacherProfile)),
      giftcodes: JSON.parse(JSON.stringify(this.giftcodes)),
    };
    this.checkpoints = [cp, ...this.checkpoints].slice(0, 20);
    this.persistAndSync('checkpoints');
    return cp;
  }

  public restoreCheckpoint(checkpointId: string): {
    ok: boolean;
    message: string;
  } {
    const cp = this.checkpoints.find((c) => c.id === checkpointId);
    if (!cp) {
      return { ok: false, message: 'Không tìm thấy điểm mốc lưu game này!' };
    }
    this.students = JSON.parse(JSON.stringify(cp.students || {}));
    if (cp.teacherProfile) {
      this.teacherProfile = JSON.parse(JSON.stringify(cp.teacherProfile));
    }
    if (cp.giftcodes) {
      this.giftcodes = JSON.parse(JSON.stringify(cp.giftcodes));
    }
    this.persistAndSync('all', true);
    return {
      ok: true,
      message: `Đã khôi phục thành công về điểm mốc "${cp.label}" (${Object.keys(this.students).length} tài khoản học sinh)!`,
    };
  }

  public deleteCheckpoint(checkpointId: string): void {
    this.checkpoints = this.checkpoints.filter((c) => c.id !== checkpointId);
    this.persistAndSync('checkpoints');
  }

  public exportCheckpointJSON(checkpointId?: string): string {
    const target = checkpointId
      ? this.checkpoints.find((c) => c.id === checkpointId)
      : {
          id: `cp_export_${Date.now()}`,
          label: `Bản lưu đầy đủ (${new Date().toLocaleString('vi-VN')})`,
          createdAt: Date.now(),
          studentCount: Object.keys(this.students).length,
          students: this.students,
          teacherProfile: this.teacherProfile,
          giftcodes: this.giftcodes,
        };
    return JSON.stringify(target, null, 2);
  }

  public importCheckpointJSON(rawJson: string): {
    ok: boolean;
    message: string;
  } {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed || typeof parsed.students !== 'object') {
        return {
          ok: false,
          message: 'File điểm mốc lưu game không hợp lệ!',
        };
      }
      const importedCp: GameSaveCheckpoint = {
        id: `cp_import_${Date.now()}`,
        label: parsed.label || `Mốc nhập file (${new Date().toLocaleTimeString('vi-VN')})`,
        createdAt: parsed.createdAt || Date.now(),
        studentCount: Object.keys(parsed.students).length,
        students: parsed.students,
        teacherProfile: parsed.teacherProfile || this.teacherProfile,
        giftcodes: parsed.giftcodes || this.giftcodes,
      };
      this.checkpoints = [importedCp, ...this.checkpoints].slice(0, 20);
      this.students = JSON.parse(JSON.stringify(importedCp.students));
      this.teacherProfile = JSON.parse(
        JSON.stringify(importedCp.teacherProfile)
      );
      this.giftcodes = JSON.parse(JSON.stringify(importedCp.giftcodes));
      this.persistAndSync('all', true);
      return {
        ok: true,
        message: `Đã nạp và khôi phục điểm mốc "${importedCp.label}" thành công!`,
      };
    } catch {
      return {
        ok: false,
        message: 'Không thể đọc file JSON điểm mốc lưu game!',
      };
    }
  }

  public resetNewSeason(): void {
    for (const key of Object.keys(this.students)) {
      this.students[key] = {
        ...this.students[key],
        rp: 0,
        totalMatches: 0,
        top1Count: 0,
      };
    }
    this.persistAndSync('students', true);
  }

  // Teacher Profile Operations (Custom Display Name, Car Loadout, Shop & Self-Add Coins)
  public getTeacherProfile(): StudentAccount {
    return this.teacherProfile;
  }

  public updateTeacherProfile(updated: Partial<StudentAccount>): StudentAccount {
    const normalizedPresets = normalizeTuningPresets(
      updated.tuningPresets ?? this.teacherProfile.tuningPresets,
      'teacher_host'
    );
    const mergedTuning =
      updated.tuningLoadout ||
      this.teacherProfile.tuningLoadout || {
        ...DEFAULT_TUNING_LOADOUT,
      };
    const computedStats = buildComputedStats(mergedTuning);
    this.teacherProfile = {
      ...this.teacherProfile,
      ...updated,
      tuningPresets: normalizedPresets,
      tuningLoadout: mergedTuning,
      computedStats,
      id: 'teacher_host',
      lastActive: Date.now(),
    };
    try {
      localStorage.setItem(
        'tripled_tuning_presets_teacher_host',
        JSON.stringify(normalizedPresets)
      );
      localStorage.setItem(
        STORAGE_KEYS.ACTIVE_COMPUTED_STATS,
        JSON.stringify(computedStats)
      );
      localStorage.setItem(
        'tripled_computed_stats_teacher_host',
        JSON.stringify(computedStats)
      );
    } catch {}
    this.persistAndSync('teacher');
    return this.teacherProfile;
  }

  public addTeacherCoins(amount: number): StudentAccount {
    const cleanAmount = Math.floor(amount);
    this.teacherProfile = {
      ...this.teacherProfile,
      coins: Math.max(0, this.teacherProfile.coins + cleanAmount),
      lastActive: Date.now(),
    };
    this.persistAndSync('teacher');
    return this.teacherProfile;
  }

  /**
   * Requirement #2: Rename profile display name for 50 Coins
   */
  public renameAccount(
    isTeacher: boolean,
    emailOrId: string,
    newUsername: string,
    cost: number = 50
  ): { ok: boolean; account?: StudentAccount; message: string } {
    const cleanName = newUsername.trim();
    if (cleanName.length < 2 || cleanName.length > 24) {
      return {
        ok: false,
        message: 'Tên hiển thị phải từ 2 đến 24 ký tự!',
      };
    }

    if (isTeacher) {
      if (cleanName === this.teacherProfile.username) {
        return {
          ok: false,
          message: 'Tên mới trùng với tên hiển thị hiện tại!',
        };
      }
      if (this.teacherProfile.coins < cost) {
        return {
          ok: false,
          message: `Không đủ Xu! Cần ${cost} Xu để đổi tên (Hiện có ${this.teacherProfile.coins} Xu).`,
        };
      }
      this.teacherProfile = {
        ...this.teacherProfile,
        username: cleanName,
        coins: this.teacherProfile.coins - cost,
        lastActive: Date.now(),
      };
      this.lobby.participants = (this.lobby.participants || []).map((p) =>
        p.id === 'teacher_host' ? { ...p, username: cleanName } : p
      );
      this.persistAndSync('all');
      return {
        ok: true,
        account: this.teacherProfile,
        message: `Đã đổi tên thành "${cleanName}" (-${cost} Xu)!`,
      };
    }

    const cleanEmail = emailOrId.trim().toLowerCase();
    const student = this.students[cleanEmail];
    if (!student) {
      return {
        ok: false,
        message: 'Không tìm thấy hồ sơ học sinh!',
      };
    }
    if (cleanName === student.username) {
      return {
        ok: false,
        message: 'Tên mới trùng với tên hiển thị hiện tại!',
      };
    }
    if (student.coins < cost) {
      return {
        ok: false,
        message: `Không đủ Xu! Cần ${cost} Xu để đổi tên (Hiện có ${student.coins} Xu).`,
      };
    }

    const updatedStudent: StudentAccount = {
      ...student,
      username: cleanName,
      coins: student.coins - cost,
      lastActive: Date.now(),
    };
    this.students[cleanEmail] = updatedStudent;
    this.syncStudentToCloud(cleanEmail);

    const saved = this.getSavedCredentials();
    if (saved && saved.email.toLowerCase() === cleanEmail) {
      const updatedCred = JSON.stringify({
        ...saved,
        username: cleanName,
      });
      try {
        sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, updatedCred);
      } catch {}
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, updatedCred);
    }

    // Update lobby participants if present
    this.lobby.participants = (this.lobby.participants || []).map((p) =>
      p.id === cleanEmail ? { ...p, username: cleanName } : p
    );

    this.persistAndSync('all');
    return {
      ok: true,
      account: updatedStudent,
      message: `Đã đổi tên thành "${cleanName}" (-${cost} Xu)!`,
    };
  }

  // Lobby Operations
  public getLobby(): LobbyConfig {
    return this.lobby;
  }

  public updateLobby(partial: Partial<LobbyConfig>): LobbyConfig {
    this.lobby = {
      ...this.lobby,
      ...partial,
    };
    this.persistAndSync('lobby');
    return this.lobby;
  }

  public generateNewRoomPin(): string {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    this.updateLobby({ roomPin: pin, status: 'waiting' });
    return pin;
  }

  public generateNewFriendRoomPin(hostName?: string): string {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    this.updateLobby({
      friendRoomPin: pin,
      friendHostName: hostName || this.lobby.friendHostName || 'Phòng Bạn Bè',
      status: 'waiting',
    });
    return pin;
  }
}

export const dualDB = new DualDatabaseService();


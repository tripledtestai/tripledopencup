import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  onValue,
  Database,
  Unsubscribe,
} from 'firebase/database';
import {
  DEFAULT_LOADOUT,
  INITIAL_DEMO_STUDENTS,
  INITIAL_GIFTCODES,
  MAPS,
  STARTER_OWNED_PARTS,
} from '../game/constants';
import {
  Giftcode,
  LobbyConfig,
  MatchRecord,
  StudentAccount,
} from '../game/types';

const STORAGE_KEYS = {
  STUDENTS: 'tripled_students_v1',
  TEACHER: 'tripled_teacher_profile_v1',
  GIFTCODES: 'tripled_giftcodes_v1',
  LOBBY: 'tripled_lobby_v1',
  CURRENT_USER: 'tripled_saved_student_v1',
  FIREBASE_CFG: 'tripled_firebase_config_v1',
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

type SyncListener = () => void;

class DualDatabaseService {
  private students: Record<string, StudentAccount> = {};
  private teacherProfile: StudentAccount;
  private giftcodes: Record<string, Giftcode> = {};
  private lobby: LobbyConfig;
  private listeners: Set<SyncListener> = new Set();
  private channel: BroadcastChannel | null = null;

  // Firebase Realtime Database state
  private fbApp: FirebaseApp | null = null;
  private fbDb: Database | null = null;
  private fbUnsubscribes: Unsubscribe[] = [];
  private fbConnected: boolean = false;
  private fbError: string | null = null;

  constructor() {
    this.lobby = this.createDefaultLobby();
    this.teacherProfile = this.createDefaultTeacherProfile();
    this.loadFromLocalStorage();

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('tripled_open_cup_sync');
      this.channel.onmessage = () => {
        this.loadFromLocalStorage();
        this.notify();
      };
    }

    // Attempt auto-reconnect if firebaseConfig was saved previously
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
      gachaPity: 0,
      usedGiftcodes: [],
      matchHistory: [],
      lastActive: Date.now(),
    };
  }

  private createDefaultLobby(): LobbyConfig {
    return {
      roomPin: '886688',
      friendRoomPin: '668899',
      friendHostName: 'Hoàng Nam 12A1',
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
      botCount: 15,
      status: 'waiting',
      participants: [],
    };
  }

  private loadFromLocalStorage(): void {
    try {
      const rawStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (rawStudents) {
        this.students = JSON.parse(rawStudents);
      } else {
        const initial: Record<string, StudentAccount> = {};
        for (const s of INITIAL_DEMO_STUDENTS) {
          initial[s.id] = s;
        }
        this.students = initial;
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(this.students));
      }

      const rawTeacher = localStorage.getItem(STORAGE_KEYS.TEACHER);
      if (rawTeacher) {
        this.teacherProfile = {
          ...this.createDefaultTeacherProfile(),
          ...JSON.parse(rawTeacher),
        };
      } else {
        localStorage.setItem(
          STORAGE_KEYS.TEACHER,
          JSON.stringify(this.teacherProfile)
        );
      }

      const rawCodes = localStorage.getItem(STORAGE_KEYS.GIFTCODES);
      if (rawCodes) {
        this.giftcodes = JSON.parse(rawCodes);
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

      const rawLobby = localStorage.getItem(STORAGE_KEYS.LOBBY);
      if (rawLobby) {
        this.lobby = {
          ...this.createDefaultLobby(),
          ...JSON.parse(rawLobby),
        };
      } else {
        localStorage.setItem(STORAGE_KEYS.LOBBY, JSON.stringify(this.lobby));
      }
    } catch {
      // Fallback to in-memory defaults
    }
  }

  private persistAndSync(
    target: 'students' | 'teacher' | 'giftcodes' | 'lobby' | 'all' = 'all'
  ): void {
    try {
      if (target === 'students' || target === 'all') {
        localStorage.setItem(
          STORAGE_KEYS.STUDENTS,
          JSON.stringify(this.students)
        );
        if (this.fbDb && this.fbConnected) {
          set(ref(this.fbDb, 'tripled/students'), this.students).catch(() => {});
        }
      }
      if (target === 'teacher' || target === 'all') {
        localStorage.setItem(
          STORAGE_KEYS.TEACHER,
          JSON.stringify(this.teacherProfile)
        );
        if (this.fbDb && this.fbConnected) {
          set(ref(this.fbDb, 'tripled/teacher'), this.teacherProfile).catch(
            () => {}
          );
        }
      }
      if (target === 'giftcodes' || target === 'all') {
        localStorage.setItem(
          STORAGE_KEYS.GIFTCODES,
          JSON.stringify(this.giftcodes)
        );
        if (this.fbDb && this.fbConnected) {
          set(ref(this.fbDb, 'tripled/giftcodes'), this.giftcodes).catch(
            () => {}
          );
        }
      }
      if (target === 'lobby' || target === 'all') {
        localStorage.setItem(STORAGE_KEYS.LOBBY, JSON.stringify(this.lobby));
        if (this.fbDb && this.fbConnected) {
          set(ref(this.fbDb, 'tripled/lobby'), this.lobby).catch(() => {});
        }
      }
      this.channel?.postMessage({ type: 'SYNC', target });
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
      const lobbyRef = ref(this.fbDb, 'tripled/lobby');

      const u1 = onValue(
        studentsRef,
        (snap) => {
          const val = snap.val();
          if (val) {
            this.students = val;
            localStorage.setItem(
              STORAGE_KEYS.STUDENTS,
              JSON.stringify(this.students)
            );
            this.notify();
          } else if (pushInitialIfEmpty) {
            set(studentsRef, this.students).catch(() => {});
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

      const u3 = onValue(lobbyRef, (snap) => {
        const val = snap.val();
        if (val) {
          this.lobby = {
            ...val,
            participants: val.participants || [],
          };
          localStorage.setItem(STORAGE_KEYS.LOBBY, JSON.stringify(this.lobby));
          this.notify();
        } else if (pushInitialIfEmpty) {
          set(lobbyRef, this.lobby).catch(() => {});
        }
      });

      this.fbUnsubscribes = [u1, u2, u3];
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

  // Student Account Management
  public getSavedCredentials(): {
    username: string;
    email: string;
    pin: string;
  } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public clearSavedCredentials(): void {
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

    if (existing.pin !== cleanPin) {
      return {
        ok: false,
        error:
          'Sai mã PIN 4 chữ số! Nếu quên PIN, hãy nhờ Giáo viên xem giúp trong Bảng Quản Trị.',
      };
    }

    existing.lastActive = Date.now();
    this.students[cleanEmail] = {
      ...existing,
      ownedParts: existing.ownedParts || [...STARTER_OWNED_PARTS],
      loadout: existing.loadout || { ...DEFAULT_LOADOUT },
      usedGiftcodes: existing.usedGiftcodes || [],
      matchHistory: existing.matchHistory || [],
    };
    localStorage.setItem(
      STORAGE_KEYS.CURRENT_USER,
      JSON.stringify({
        username: existing.username,
        email: cleanEmail,
        pin: cleanPin,
      })
    );
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
      return {
        ok: false,
        error:
          'Tài khoản Gmail này đã được đăng ký trước đó! Vui lòng chuyển sang mục "🔑 ĐĂNG NHẬP".',
      };
    }

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
      gachaPity: 0,
      usedGiftcodes: [],
      matchHistory: [],
      lastActive: Date.now(),
    };

    this.students[cleanEmail] = newAccount;
    localStorage.setItem(
      STORAGE_KEYS.CURRENT_USER,
      JSON.stringify({
        username: cleanName,
        email: cleanEmail,
        pin: cleanPin,
      })
    );
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
    return this.students[email.toLowerCase()] || null;
  }

  public getAllStudents(): StudentAccount[] {
    return Object.values(this.students).sort((a, b) => b.rp - a.rp);
  }

  public updateStudent(account: StudentAccount): void {
    this.students[account.id] = {
      ...account,
      lastActive: Date.now(),
    };
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
    this.persistAndSync('giftcodes');
    return { ok: true };
  }

  public deleteGiftcode(code: string): void {
    delete this.giftcodes[code];
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
    this.giftcodes[code] = gift;
    this.students[student.id] = student;
    this.persistAndSync('all');

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
    this.persistAndSync('students');
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
    this.persistAndSync('students');
  }

  // Teacher Profile Operations (Custom Display Name, Car Loadout, Shop & Self-Add Coins)
  public getTeacherProfile(): StudentAccount {
    return this.teacherProfile;
  }

  public updateTeacherProfile(updated: Partial<StudentAccount>): StudentAccount {
    this.teacherProfile = {
      ...this.teacherProfile,
      ...updated,
      id: 'teacher_host',
      lastActive: Date.now(),
    };
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

    // Update saved credentials in localStorage if matching
    const saved = this.getSavedCredentials();
    if (saved && saved.email.toLowerCase() === cleanEmail) {
      localStorage.setItem(
        STORAGE_KEYS.CURRENT_USER,
        JSON.stringify({
          ...saved,
          username: cleanName,
        })
      );
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


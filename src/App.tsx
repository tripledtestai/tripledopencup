import React, { useEffect, useRef, useState } from 'react';
import {
  Car,
  ChevronRight,
  Clock,
  Coins,
  Database,
  Gift,
  History,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Zap,
  Crown,
  Eye,
  EyeOff,
  Flag,
  Flame,
  Key,
  Loader2,
  Lock,
  Mail,
  Map as MapIcon,
  User,
  UserPlus,
} from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { AdminPanel } from './components/AdminPanel';
import { AutoMatchmakingModal } from './components/AutoMatchmakingModal';
import { FirebaseModal } from './components/FirebaseModal';
import { GachaModal } from './components/GachaModal';
import { GarageModal } from './components/GarageModal';
import { LobbyView } from './components/LobbyView';
import {
  buildFinalResults,
  FinalRacerResult,
  PodiumStage,
} from './components/PodiumStage';
import { PartThumbnail } from './components/PartThumbnail';
import { RaceCanvas } from './components/RaceCanvas';
import { RaidBossModal } from './components/RaidBossModal';
import { RankAvatarFrame, RankCrest } from './components/RankBadge';
import { ShowroomCanvas } from './components/ShowroomCanvas';
import { SoloCampaignModal } from './components/SoloCampaignModal';
import {
  TeacherNavHeader,
  TeacherWorkspaceTab,
} from './components/TeacherNavHeader';
import { TitlesModal } from './components/TitlesModal';
import {
  ALL_PARTS,
  BOT_NAMES,
  DEFAULT_ADMIN_PASSWORD,
  MAPS,
  RANK_TIERS,
  TIER_COLORS,
} from './game/constants';
import {
  calculateCarClass,
  calculateTuningPhysics,
  calculateTuningSummary,
  type ComputedTuningPhysics,
  evaluateCampaignResult,
  getCampaignLevelByNumber,
  getCampaignStarCoins,
  getPlayerTitleById,
  getRaidBossById,
  getRankByRP,
  isValidGmail,
  isValidPin,
  RENAME_COST_COINS,
} from './game/rules';
import {
  CarLoadout,
  LobbyConfig,
  RacerState,
  StudentAccount,
  TuningStats,
} from './game/types';
import { dualDB } from './services/database';
import { multiplayerService } from './services/multiplayer';
import { soundEngine } from './services/sound';

type AppScreen =
  | 'login'
  | 'menu'
  | 'lobby'
  | 'racing'
  | 'podium'
  | 'admin';

type DockTab =
  | 'home'
  | 'campaign'
  | 'raid_boss'
  | 'garage'
  | 'gacha'
  | 'leaderboard'
  | 'history';

const EventCountdownText: React.FC = React.memo(() => {
  const [sec, setSec] = useState(2 * 3600 + 45 * 60 + 18);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSec((prev) => (prev > 0 ? prev - 1 : 2 * 3600 + 45 * 60 + 18));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);
  const cdHours = String(Math.floor(sec / 3600)).padStart(2, '0');
  const cdMins = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const cdSecs = String(sec % 60).padStart(2, '0');
  return <>{`${cdHours}:${cdMins}:${cdSecs}`}</>;
});

export default function App() {
  // Sync state with DualDB
  const [students, setStudents] = useState<StudentAccount[]>(() =>
    dualDB.getAllStudents()
  );
  const [teacherProfile, setTeacherProfile] = useState<StudentAccount>(() =>
    dualDB.getTeacherProfile()
  );
  const [giftcodes, setGiftcodes] = useState(() => dualDB.getAllGiftcodes());
  const [lobby, setLobby] = useState<LobbyConfig>(() => dualDB.getLobby());
  const [fbConnected, setFbConnected] = useState(
    () => dualDB.getFirebaseStatus().connected
  );

  // Login / Register Form Inputs
  const savedCreds = dualDB.getSavedCredentials();

  // Navigation & Auth State (Auto-restore session if saved)
  const [screen, setScreen] = useState<AppScreen>(() =>
    savedCreds?.email ? 'menu' : 'login'
  );
  const [loginTab, setLoginTab] = useState<'student' | 'teacher'>('student');
  const [studentAuthMode, setStudentAuthMode] = useState<'login' | 'register'>(
    'login'
  );
  const [currentStudentEmail, setCurrentStudentEmail] = useState<string | null>(
    () => savedCreds?.email || null
  );
  const [isTeacher, setIsTeacher] = useState(false);
  const [usernameInput, setUsernameInput] = useState(
    savedCreds?.username || ''
  );
  const [emailInput, setEmailInput] = useState(savedCreds?.email || '');
  const [pinInput, setPinInput] = useState(savedCreds?.pin || '');
  const [teacherNameInput, setTeacherNameInput] = useState(
    () => dualDB.getTeacherProfile().username
  );
  const [teacherPassInput, setTeacherPassInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [showTeacherPass, setShowTeacherPass] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  // Main Menu Dock & Widgets
  const [dockTab, setDockTab] = useState<DockTab>('home');
  const [garageInitialTab, setGarageInitialTab] = useState<'cosmetics' | 'tuning'>('cosmetics');
  const [showroomNightMode, setShowroomNightMode] = useState(() => {
    try {
      const saved = localStorage.getItem('tripled_theme_night_v1');
      if (saved === null) return true; // Canonical dark esports mode by default
      return saved === '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    // In-game racing screen and telemetry must ALWAYS be in high-contrast dark cockpit mode
    const shouldBeLight = !showroomNightMode && screen !== 'racing';
    document.documentElement.classList.toggle('theme-light', shouldBeLight);
    try {
      localStorage.setItem('tripled_theme_night_v1', showroomNightMode ? '1' : '0');
    } catch {}
  }, [showroomNightMode, screen]);

  useEffect(() => {
    const onCustomTheme = (e: Event) => {
      const detail = (e as CustomEvent<{ isNight?: boolean }>).detail;
      if (detail && typeof detail.isNight === 'boolean') {
        setShowroomNightMode(detail.isNight);
      }
    };
    window.addEventListener('tripled-theme-change', onCustomTheme);
    return () => window.removeEventListener('tripled-theme-change', onCustomTheme);
  }, []);
  const [showroomPreset, setShowroomPreset] = useState<
    'player' | 'gold' | 'elderwood' | 'chroma' | 'tripled_a'
  >('player');
  const [showGiftcodeDropdown, setShowGiftcodeDropdown] = useState(false);
  const [giftcodeInput, setGiftcodeInput] = useState('');
  const [giftcodeFeedback, setGiftcodeFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [showRankGuideModal, setShowRankGuideModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTitlesModal, setShowTitlesModal] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [renameFeedback, setRenameFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [showPlayModeModal, setShowPlayModeModal] = useState(false);
  const [showMatchmakingModal, setShowMatchmakingModal] = useState(false);
  const [soundMuted, setSoundMuted] = useState(() => soundEngine.getMuted());
  const [mobileHudDrawer, setMobileHudDrawer] = useState<'left' | 'right' | null>(null);

  // Racing & Podium State
  const [isRacePaused, setIsRacePaused] = useState(false);
  const [podiumData, setPodiumData] = useState<{
    results: FinalRacerResult[];
    winningTeamId: number | null;
    mapName: string;
    campaignSummary?: {
      levelNumber: number;
      title: string;
      passed: boolean;
      stars: 0 | 1 | 2 | 3;
      firstClearCoins: number;
      unlockedTitleName?: string;
    } | null;
    raidSummary?: {
      bossName: string;
      bossIcon: string;
      teamWon: boolean;
      knockdowns: number;
      unlockedTitleName?: string;
    } | null;
  } | null>(null);

  // Subscribe to DualDB updates
  useEffect(() => {
    return dualDB.subscribe(() => {
      setStudents(dualDB.getAllStudents());
      setTeacherProfile(dualDB.getTeacherProfile());
      setGiftcodes(dualDB.getAllGiftcodes());
      setLobby(dualDB.getLobby());
      setFbConnected(dualDB.getFirebaseStatus().connected);
    });
  }, []);

  // Support ?autostart=1 to boot straight into playing for quick verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const demo = dualDB.loginOrRegisterStudent(
        'Hoàng Nam 12A1',
        'hoangnam@gmail.com',
        '1234'
      );
      if (demo.ok && demo.account) {
        setCurrentStudentEmail(demo.account.email);
        const autoLobby = dualDB.updateLobby({
          status: 'racing',
          participants: [
            {
              id: demo.account.id,
              username: demo.account.username,
              rp: demo.account.rp,
              teamId: 1,
              loadout: demo.account.loadout,
              isBot: false,
            },
            ...dualDB
              .getAllStudents()
              .filter((s) => s.id !== demo.account!.id)
              .map((s, idx) => ({
                id: s.id,
                username: s.username,
                rp: s.rp,
                teamId: (idx % 2) + 1,
                loadout: s.loadout,
                isBot: true,
              })),
          ],
        });
        setLobby(autoLobby);
        setScreen('racing');
        return;
      }
    }
    // Treat reload or close during race as match exit — never attempt to resume or reconnect
    try {
      sessionStorage.removeItem('tripled_active_race_resume_v1');
    } catch {}
  }, []);

  // Mirror state to document.body.dataset.state per game shell contract
  useEffect(() => {
    if (screen === 'racing') {
      document.body.dataset.state = isRacePaused ? 'paused' : 'playing';
    } else if (screen === 'podium') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'title';
    }
  }, [screen, isRacePaused]);

  const currentStudent = currentStudentEmail
    ? students.find((s) => s.id === currentStudentEmail.toLowerCase()) ||
      dualDB.getStudent(currentStudentEmail)
    : null;

  // Authoritative Local Physics Reference shared across Garage, Lobby Preset Switch, and RaceCanvas
  const activeLocalTuning = isTeacher
    ? teacherProfile.tuningLoadout
    : currentStudent?.tuningLoadout;
  const playerPhysicsRef = useRef<ComputedTuningPhysics>(
    calculateTuningPhysics(activeLocalTuning)
  );
  playerPhysicsRef.current = calculateTuningPhysics(activeLocalTuning);

  // Enforce live Ban / Delete if a logged-in student account is banned or removed by Teacher
  useEffect(() => {
    if (!currentStudentEmail || isTeacher) return;
    const acc = dualDB.getStudent(currentStudentEmail);
    if (!acc) {
      setCurrentStudentEmail(null);
      setScreen('login');
      setLoginError(
        'Tài khoản của bạn đã bị Giáo viên xóa khỏi hệ thống!'
      );
    } else if (acc.banned) {
      setCurrentStudentEmail(null);
      setScreen('login');
      setLoginError(
        '🚫 Tài khoản của bạn đã bị Giáo viên khóa (BAN)!'
      );
    }
  }, [students, currentStudentEmail, isTeacher]);

  // 4-Box PIN Input Helpers
  const handlePinDigitChange = (idx: number, rawVal: string) => {
    const digitsOnly = rawVal.replace(/\D/g, '');
    if (!digitsOnly) {
      const arr = [
        pinInput[0] || '',
        pinInput[1] || '',
        pinInput[2] || '',
        pinInput[3] || '',
      ];
      arr[idx] = '';
      setPinInput(arr.join(''));
      return;
    }
    if (digitsOnly.length > 1) {
      const sliced = digitsOnly.slice(0, 4);
      setPinInput(sliced);
      const nextFocus = Math.min(3, sliced.length);
      pinInputRefs.current[nextFocus]?.focus();
      return;
    }
    const digit = digitsOnly[digitsOnly.length - 1];
    const arr = [
      pinInput[0] || '',
      pinInput[1] || '',
      pinInput[2] || '',
      pinInput[3] || '',
    ];
    arr[idx] = digit;
    setPinInput(arr.join(''));
    if (idx < 3 && digit) {
      pinInputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePinKeyDown = (
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace') {
      if (!pinInput[idx] && idx > 0) {
        e.preventDefault();
        const arr = [
          pinInput[0] || '',
          pinInput[1] || '',
          pinInput[2] || '',
          pinInput[3] || '',
        ];
        arr[idx - 1] = '';
        setPinInput(arr.join(''));
        pinInputRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      pinInputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 3) {
      e.preventDefault();
      pinInputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 4);
    if (pasted) {
      e.preventDefault();
      setPinInput(pasted);
      const nextIdx = Math.min(3, Math.max(0, pasted.length - 1));
      pinInputRefs.current[nextIdx]?.focus();
    }
  };

  // Student Login / Register Submit Handler
  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setLoginError(null);

    if (!isValidGmail(emailInput)) {
      setLoginError(
        'Email phải đúng định dạng @gmail.com (Ví dụ: hocsinh12a@gmail.com)!'
      );
      return;
    }
    if (!isValidPin(pinInput)) {
      setLoginError('Mã PIN phải gồm đúng 4 chữ số (Ví dụ: 1234)!');
      return;
    }

    if (studentAuthMode === 'register') {
      if (!usernameInput.trim()) {
        setLoginError('Vui lòng nhập Tên hiển thị (Username) của bạn!');
        return;
      }
      const res = dualDB.registerStudent(usernameInput, emailInput, pinInput);
      if (!res.ok || !res.account) {
        setLoginError(res.error || 'Không thể đăng ký tài khoản.');
        return;
      }
      const registeredEmail = res.account.email;
      setIsLoggingIn(true);
      soundEngine.playFanfare(false);
      window.setTimeout(() => {
        setIsLoggingIn(false);
        setCurrentStudentEmail(registeredEmail);
        setIsTeacher(false);
        setScreen('menu');
        setDockTab('home');
        soundEngine.startBGM('menu');
      }, 280);
      return;
    }

    // Login Mode
    const res = dualDB.loginStudent(emailInput, pinInput);
    if (!res.ok || !res.account) {
      setLoginError(res.error || 'Không thể đăng nhập.');
      return;
    }

    const loggedInEmail = res.account.email;
    setIsLoggingIn(true);
    soundEngine.playCoin();
    window.setTimeout(() => {
      setIsLoggingIn(false);
      setCurrentStudentEmail(loggedInEmail);
      setIsTeacher(false);
      setScreen('menu');
      setDockTab('home');
      soundEngine.startBGM('menu');
    }, 280);
  };

  // Teacher Referee Login Handler
  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setLoginError(null);
    if (teacherPassInput.trim() !== DEFAULT_ADMIN_PASSWORD) {
      setLoginError(
        'Sai mật khẩu quản trị Giáo Viên! Vui lòng kiểm tra lại mật khẩu bảo mật.'
      );
      return;
    }
    if (teacherNameInput.trim()) {
      dualDB.updateTeacherProfile({ username: teacherNameInput.trim() });
    }
    dualDB.updateLobby({
      playModeCategory: 'teacher_cup',
      botCount: 0,
    });
    setIsLoggingIn(true);
    soundEngine.playFanfare(false);
    window.setTimeout(() => {
      setIsLoggingIn(false);
      setIsTeacher(true);
      setCurrentStudentEmail(null);
      setScreen('admin');
      soundEngine.startBGM('menu');
    }, 280);
  };

  const handleSelectTeacherTab = (tab: TeacherWorkspaceTab) => {
    if (tab === 'menu') {
      setDockTab('home');
    }
    setScreen(tab);
  };

  const handleLogoutTeacher = () => {
    setIsTeacher(false);
    setScreen('login');
  };

  // Redeem Giftcode Handler
  const handleRedeemGiftcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;
    const res = dualDB.redeemGiftcode(currentStudent.email, giftcodeInput);
    setGiftcodeFeedback({ ok: res.ok, text: res.message });
    if (res.ok) {
      soundEngine.playFanfare(false);
      setGiftcodeInput('');
    }
  };

  // Race Complete Handler -> Record rewards & open Podium Top 3
  const handleRaceComplete = (finalRacers: RacerState[]) => {
    const mapObj = MAPS.find((m) => m.id === lobby.mapId) || MAPS[0];
    const { results, winningTeamId } = buildFinalResults(
      finalRacers,
      lobby.raceMode,
      lobby.teamCount,
      lobby.playModeCategory,
      lobby.teacherRewards,
      lobby.botDifficulty || 'medium',
      lobby.laps || 3
    );

    let campaignSummary: {
      levelNumber: number;
      title: string;
      passed: boolean;
      stars: 0 | 1 | 2 | 3;
      firstClearCoins: number;
      unlockedTitleName?: string;
    } | null = null;

    let raidSummary: {
      bossName: string;
      bossIcon: string;
      teamWon: boolean;
      knockdowns: number;
      unlockedTitleName?: string;
    } | null = null;

    const effectiveStudentId =
      lobby.isFriendGuest && lobby.assignedGuestId
        ? lobby.assignedGuestId
        : isTeacher
        ? 'teacher_host'
        : currentStudent?.id;

    // 1. Evaluate Solo Campaign Level Progress & First-Clear Economy
    if (lobby.playModeCategory === 'solo_campaign' && lobby.campaignLevelNumber) {
      const levelCfg = getCampaignLevelByNumber(lobby.campaignLevelNumber);
      const localFinalRacer = finalRacers.find(
        (fr) =>
          effectiveStudentId &&
          fr.id.toLowerCase() === effectiveStudentId.toLowerCase()
      );
      const localResult = results.find(
        (rs) =>
          effectiveStudentId &&
          rs.id.toLowerCase() === effectiveStudentId.toLowerCase()
      );

      if (levelCfg && localFinalRacer && localResult) {
        const evalRes = evaluateCampaignResult(levelCfg, {
          placement: localResult.placement,
          finishTimeMs:
            localResult.finishTimeMs > 0 ? localResult.finishTimeMs : 999000,
          atpCollected: localFinalRacer.atpCollected || 0,
          survivedInfection: !localFinalRacer.isInfected,
          eliminated: Boolean(localFinalRacer.eliminated),
        });

        const acc = isTeacher ? dualDB.getTeacherProfile() : currentStudent;
        const prevProg = acc?.campaignProgress?.[levelCfg.level];
        const prevStars = prevProg?.stars || 0;
        const prevCoinsClaimed = getCampaignStarCoins(levelCfg, prevStars);
        const newCoinsClaimed = getCampaignStarCoins(levelCfg, evalRes.stars);
        const deltaCoins = Math.max(0, newCoinsClaimed - prevCoinsClaimed);
        const earnedCoins = evalRes.cleared
          ? deltaCoins > 0
            ? deltaCoins
            : 5
          : 0;
        localResult.coinsEarned = earnedCoins;

        let unlockedTitleName: string | undefined;
        if (evalRes.cleared && acc) {
          const nextCampaignProg = {
            ...(acc.campaignProgress || {}),
            [levelCfg.level]: {
              cleared: true,
              stars: Math.max(prevProg?.stars || 0, evalRes.stars),
              bestTimeMs:
                prevProg?.bestTimeMs && prevProg.bestTimeMs > 0
                  ? Math.min(prevProg.bestTimeMs, localResult.finishTimeMs)
                  : localResult.finishTimeMs,
              updatedAt: Date.now(),
            },
          };
          const nextTitles = [...(acc.unlockedTitles || [])];
          if (
            levelCfg.unlocksTitleId &&
            !nextTitles.includes(levelCfg.unlocksTitleId)
          ) {
            nextTitles.push(levelCfg.unlocksTitleId);
            unlockedTitleName = getPlayerTitleById(levelCfg.unlocksTitleId)?.label;
          }
          const updatedAcc: StudentAccount = {
            ...acc,
            campaignProgress: nextCampaignProg,
            unlockedTitles: nextTitles,
            equippedTitle: acc.equippedTitle || levelCfg.unlocksTitleId || null,
          };
          if (isTeacher) {
            dualDB.updateTeacherProfile(updatedAcc);
          } else {
            dualDB.updateStudent(updatedAcc);
          }
        }

        campaignSummary = {
          levelNumber: levelCfg.level,
          title: levelCfg.title,
          passed: evalRes.cleared,
          stars: (evalRes.stars as 0 | 1 | 2 | 3),
          firstClearCoins: earnedCoins,
          unlockedTitleName,
        };
      }
    }

    // 2. Evaluate Raid Boss Outcome & Exclusive Boss Rewards (Only won when Boss dies)
    const isRaidBossMode = Boolean(
      lobby.playModeCategory === 'raid_boss' ||
        (lobby.playModeCategory === 'teacher_cup' &&
          (lobby.raidBossModeEnabled || Boolean(lobby.raidBossId)))
    );
    if (isRaidBossMode) {
      const raidBossDef = getRaidBossById(lobby.raidBossId || 'tuan_anh');
      const bossFinal = finalRacers.find((r) => r.isBoss);
      const bossRes = results.find((r) => r.isBoss);
      const studentResults = results.filter((r) => !r.isBoss);
      const knockdowns = bossFinal?.bossKnockdowns || 0;
      // Strictly won ONLY when Boss died (HP <= 0 or 3 knockdowns)
      const bossDied =
        (bossFinal?.bossHp !== undefined && bossFinal.bossHp <= 0) ||
        knockdowns >= 3 ||
        (bossFinal?.finished && bossFinal.speed === 0);
      const teamWon = Boolean(bossDied);

      let unlockedTitleName: string | undefined;
      for (const sr of studentResults) {
        sr.coinsEarned = teamWon ? 50 : 15;
      }

      const acc = isTeacher ? dualDB.getTeacherProfile() : currentStudent;
      if (teamWon && acc) {
        const nextTitles = [...(acc.unlockedTitles || [])];
        if (!nextTitles.includes(raidBossDef.rewardTitleId)) {
          nextTitles.push(raidBossDef.rewardTitleId);
          unlockedTitleName = getPlayerTitleById(raidBossDef.rewardTitleId)?.label;
        }
        const nextDefeatedBosses = [...(acc.defeatedBosses || [])];
        if (!nextDefeatedBosses.includes(raidBossDef.id)) {
          nextDefeatedBosses.push(raidBossDef.id);
        }
        const updatedAcc: StudentAccount = {
          ...acc,
          unlockedTitles: nextTitles,
          defeatedBosses: nextDefeatedBosses,
          equippedTitle: acc.equippedTitle || raidBossDef.rewardTitleId,
          hasDragonAura:
            acc.hasDragonAura || raidBossDef.id === 'minh_dang',
        };
        if (isTeacher) {
          dualDB.updateTeacherProfile(updatedAcc);
        } else {
          dualDB.updateStudent(updatedAcc);
        }
      }

      raidSummary = {
        bossName: `${raidBossDef.name} — ${raidBossDef.title}`,
        bossIcon: raidBossDef.badgeIcon,
        teamWon,
        knockdowns,
        unlockedTitleName,
      };
    }

    // Record coins, RP, and match history ONLY for the local authoritative account
    for (const r of results) {
      if (isTeacher && r.id === 'teacher_host') {
        const tp = dualDB.getTeacherProfile();
        dualDB.updateTeacherProfile({
          coins: Math.max(0, tp.coins + r.coinsEarned),
          rp: Math.max(0, tp.rp + r.rpDelta),
          totalMatches: tp.totalMatches + 1,
          top1Count: tp.top1Count + (r.placement === 1 ? 1 : 0),
          matchHistory: [
            {
              id: `match_${Date.now()}_teacher`,
              timestamp: Date.now(),
              mapId: mapObj.id,
              mapName: mapObj.name,
              mode: lobby.raceMode,
              placement: r.placement,
              totalRacers: results.length,
              coinsEarned: r.coinsEarned,
              rpDelta: r.rpDelta,
              finishTimeMs: r.finishTimeMs,
              teamId: r.teamId,
              teamWon: r.teamWon,
            },
            ...(tp.matchHistory || []),
          ].slice(0, 30),
        });
        continue;
      }

      if (
        !isTeacher &&
        currentStudent &&
        effectiveStudentId &&
        r.id.toLowerCase() === effectiveStudentId.toLowerCase()
      ) {
        dualDB.recordMatchResult(currentStudent.email, {
          id: `match_${Date.now()}_${currentStudent.id}`,
          timestamp: Date.now(),
          mapId: mapObj.id,
          mapName: mapObj.name,
          mode: lobby.raceMode,
          placement: r.placement,
          totalRacers: results.length,
          coinsEarned: r.coinsEarned,
          rpDelta: r.rpDelta,
          finishTimeMs: r.finishTimeMs,
          teamId: r.teamId,
          teamWon: r.teamWon,
        });
      }
    }

    dualDB.updateLobby({ status: 'finished' });
    setPodiumData({
      results,
      winningTeamId,
      mapName: mapObj.name,
      campaignSummary,
      raidSummary,
    });
    setScreen('podium');
  };

  const activeLocalPlayerId = isTeacher
    ? lobby.playModeCategory === 'teacher_cup' &&
      lobby.hostMode === 'spectator'
      ? null
      : 'teacher_host'
    : lobby.isFriendGuest && lobby.assignedGuestId
    ? lobby.assignedGuestId
    : currentStudent?.id || null;

  // ============================================================================
  // RENDER 1: ACTIVE RACE SCREEN
  // ============================================================================
  if (screen === 'racing') {
    return (
      <RaceCanvas
        lobby={lobby}
        localPlayerId={activeLocalPlayerId}
        isTeacher={isTeacher}
        isPaused={isRacePaused}
        playerPhysicsRef={playerPhysicsRef}
        onTogglePause={() => setIsRacePaused((p) => !p)}
        onRaceComplete={handleRaceComplete}
        onExitRace={() => {
          try {
            sessionStorage.removeItem('tripled_active_race_resume_v1');
          } catch {}
          setIsRacePaused(false);
          setPodiumData(null);
          multiplayerService.clearRaceCaches();
          setScreen(
            lobby.playModeCategory === 'solo_campaign' ||
              lobby.playModeCategory === 'raid_boss'
              ? 'menu'
              : 'lobby'
          );
        }}
      />
    );
  }

  // ============================================================================
  // RENDER 2: PODIUM TOP 3 & FINAL STANDINGS SCREEN
  // ============================================================================
  if (screen === 'podium' && podiumData) {
    return (
      <PodiumStage
        results={podiumData.results}
        raceMode={lobby.raceMode}
        teamCount={lobby.teamCount}
        winningTeamId={podiumData.winningTeamId}
        mapName={podiumData.mapName}
        playMode={lobby.playModeCategory}
        localPlayerId={activeLocalPlayerId}
        campaignSummary={podiumData.campaignSummary}
        raidSummary={podiumData.raidSummary}
        onPlayAgainLobby={() => {
          setPodiumData(null);
          multiplayerService.clearRaceCaches();
          const updated = dualDB.updateLobby({ status: 'waiting' });
          setLobby(updated);
          setScreen(
            lobby.playModeCategory === 'solo_campaign'
              ? 'menu'
              : 'lobby'
          );
        }}
        onBackToMainMenu={() => {
          setPodiumData(null);
          multiplayerService.clearRaceCaches();
          const updated = dualDB.updateLobby({ status: 'waiting' });
          setLobby(updated);
          setScreen(isTeacher ? 'admin' : 'menu');
        }}
      />
    );
  }

  // ============================================================================
  // RENDER 3: TEACHER SECTION 1 — QUẢN TRỊ LỚP HỌC (ADMIN PANEL)
  // ============================================================================
  if (screen === 'admin') {
    return (
      <>
        <AdminPanel
          students={students}
          giftcodes={giftcodes}
          teacherProfile={teacherProfile}
          lobby={lobby}
          fbConnected={fbConnected}
          isNightMode={showroomNightMode}
          onToggleNightMode={() => setShowroomNightMode((v) => !v)}
          onSelectTeacherTab={handleSelectTeacherTab}
          onOpenFirebaseModal={() => setShowFirebaseModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onLogout={handleLogoutTeacher}
        />
        {showFirebaseModal && (
          <FirebaseModal onClose={() => setShowFirebaseModal(false)} />
        )}
        {showSettingsModal && (
          <SettingsModal
            onClose={() => setShowSettingsModal(false)}
            isTeacher={isTeacher}
          />
        )}
      </>
    );
  }

  // ============================================================================
  // RENDER 4: LOBBY & MINI WARM-UP TRACK (STUDENT LOBBY OR TEACHER SECTION 2)
  // ============================================================================
  if (screen === 'lobby') {
    return (
      <>
        <LobbyView
          lobby={lobby}
          currentStudent={currentStudent}
          teacherProfile={teacherProfile}
          isTeacher={isTeacher}
          fbConnected={fbConnected}
          isNightMode={showroomNightMode}
          onToggleNightMode={() => setShowroomNightMode((v) => !v)}
          allStudents={students}
          playerPhysicsRef={playerPhysicsRef}
          onStartRace={(updatedLobby) => {
            setLobby(updatedLobby);
            setIsRacePaused(false);
            setScreen('racing');
          }}
          onBackToMenu={() => setScreen(isTeacher ? 'admin' : 'menu')}
          onOpenGarage={(tab = 'cosmetics') => {
            setGarageInitialTab(tab);
            setDockTab('garage');
            setScreen('menu');
          }}
          onSelectTeacherTab={isTeacher ? handleSelectTeacherTab : undefined}
          onOpenFirebaseModal={() => setShowFirebaseModal(true)}
          onOpenMatchmaking={() => setShowMatchmakingModal(true)}
          onLogout={handleLogoutTeacher}
        />
        {showFirebaseModal && (
          <FirebaseModal onClose={() => setShowFirebaseModal(false)} />
        )}
        {showMatchmakingModal && (
          <AutoMatchmakingModal
            currentStudent={isTeacher ? teacherProfile : currentStudent!}
            isTeacher={isTeacher}
            isNightMode={showroomNightMode}
            onClose={() => setShowMatchmakingModal(false)}
            onEnterLobby={(roomPin, isHost, customConfig) => {
              setShowMatchmakingModal(false);
              const updated = dualDB.updateLobby({
                playModeCategory: 'friends_pvp',
                friendRoomPin: roomPin,
                isFriendGuest: !isHost,
                assignedGuestId: undefined,
                status: 'waiting',
                participants: [],
                ...(customConfig || {}),
              });
              setLobby(updated);
              setScreen('lobby');
            }}
            onLaunchRace={(finalLobby) => {
              setShowMatchmakingModal(false);
              setLobby(finalLobby);
              setIsRacePaused(false);
              setScreen('racing');
            }}
          />
        )}
      </>
    );
  }

  // ============================================================================
  // RENDER 5: STREAMLINED LOGIN PORTAL (Upgraded Racing Glassmorphism & Dynamic Track)
  // ============================================================================
  if (screen === 'login' || (!currentStudent && !isTeacher)) {
    const floatingParticles = [
      { left: '8%', bottom: '12%', size: 'w-2 h-2', delay: '0s', duration: '5.2s', color: 'bg-[#F59E0B]' },
      { left: '18%', bottom: '24%', size: 'w-1.5 h-1.5', delay: '1.1s', duration: '6.1s', color: 'bg-[#FEF08A]' },
      { left: '29%', bottom: '8%', size: 'w-2.5 h-2.5', delay: '2.3s', duration: '5.8s', color: 'bg-[#A855F7]' },
      { left: '44%', bottom: '16%', size: 'w-1.5 h-1.5', delay: '0.7s', duration: '4.9s', color: 'bg-[#F59E0B]' },
      { left: '62%', bottom: '10%', size: 'w-2 h-2', delay: '1.8s', duration: '6.4s', color: 'bg-[#FB7185]' },
      { left: '75%', bottom: '22%', size: 'w-1.5 h-1.5', delay: '0.4s', duration: '5.5s', color: 'bg-[#FEF08A]' },
      { left: '86%', bottom: '14%', size: 'w-2.5 h-2.5', delay: '2.7s', duration: '6.0s', color: 'bg-[#F59E0B]' },
      { left: '93%', bottom: '28%', size: 'w-1.5 h-1.5', delay: '1.5s', duration: '5.1s', color: 'bg-[#A855F7]' },
    ];

    const speedLines = [
      { top: '14%', width: 'w-44 sm:w-64', delay: '0s', duration: '2.4s', color: 'from-transparent via-[#F59E0B]/45 to-transparent' },
      { top: '28%', width: 'w-56 sm:w-80', delay: '0.9s', duration: '2.8s', color: 'from-transparent via-[#A855F7]/40 to-transparent' },
      { top: '46%', width: 'w-40 sm:w-60', delay: '1.6s', duration: '2.2s', color: 'from-transparent via-[#FEF08A]/35 to-transparent' },
      { top: '68%', width: 'w-64 sm:w-96', delay: '0.4s', duration: '2.5s', color: 'from-transparent via-[#F59E0B]/50 to-transparent' },
      { top: '82%', width: 'w-48 sm:w-72', delay: '1.3s', duration: '2.7s', color: 'from-transparent via-[#FB7185]/35 to-transparent' },
    ];

    return (
      <div className="relative min-h-screen w-full bg-gradient-to-br from-[#050816] via-[#0B132B] to-[#1D0B38] text-white flex flex-col justify-between px-3.5 py-3 sm:px-6 sm:py-5 overflow-x-hidden overflow-y-auto font-gaming">
        {/* Background Live Showroom Preview */}
        <ShowroomCanvas
          loadout={
            students[0]?.loadout || {
              chassis: 'chassis_dragon',
              paint: 'paint_gold24k',
              decal: 'decal_dna',
              wheels: 'wheels_hellfire',
              spoiler: 'spoiler_biowings',
              underglow: 'underglow_atp',
              trail: 'trail_rainbow',
            }
          }
          username="TRIPLE D CHAMPION"
          active={false}
          isNightMode={showroomNightMode}
        />

        {/* Deep Navy-to-Purple or Crisp Daylight Atmospheric Racing Gradient & Vignette */}
        <div
          className={`pointer-events-none fixed inset-0 transition-colors duration-300 ${
            showroomNightMode
              ? 'bg-gradient-to-b from-[#050816]/85 via-[#0B132B]/60 to-[#1A0B32]/90'
              : 'bg-gradient-to-b from-[#F8FAFC]/82 via-[#EFF6FF]/65 to-[#E2E8F0]/90'
          }`}
        />
        <div
          className={`pointer-events-none fixed inset-0 ${
            showroomNightMode
              ? 'bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.16),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(147,51,234,0.22),transparent_65%)]'
              : 'bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.18),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(14,165,233,0.16),transparent_65%)]'
          }`}
        />

        {/* 3D Perspective Racing Track Floor Grid & Animated Neon Lanes */}
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 h-[56vh] overflow-hidden opacity-75"
          style={{ perspective: '420px' }}
        >
          <div
            className="w-[160%] -left-[30%] h-[140%] absolute bottom-0 animate-track-grid"
            style={{
              transform: 'rotateX(68deg) translateY(12%)',
              transformOrigin: 'bottom center',
              maskImage: 'linear-gradient(to top, rgba(0,0,0,0.95) 15%, transparent 92%)',
              WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.95) 15%, transparent 92%)',
            }}
          />
          {/* Perspective SVG Highway Lane Lines */}
          <svg
            viewBox="0 0 1200 400"
            preserveAspectRatio="none"
            className="w-full h-full absolute inset-0"
          >
            <defs>
              <linearGradient id="loginRoadSurface" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={showroomNightMode ? '#090F24' : '#E2E8F0'}
                  stopOpacity="0"
                />
                <stop
                  offset="35%"
                  stopColor={showroomNightMode ? '#0D1530' : '#CBD5E1'}
                  stopOpacity="0.55"
                />
                <stop
                  offset="100%"
                  stopColor={showroomNightMode ? '#050814' : '#94A3B8'}
                  stopOpacity={showroomNightMode ? '0.9' : '0.65'}
                />
              </linearGradient>
              <linearGradient id="loginCurbGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
                <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#FB7185" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="loginLaneGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
                <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.75" />
                <stop
                  offset="100%"
                  stopColor={showroomNightMode ? '#FEF08A' : '#D97706'}
                  stopOpacity="0.95"
                />
              </linearGradient>
            </defs>
            {/* Perspective Road Polygon */}
            <polygon
              points="520,20 680,20 1160,400 40,400"
              fill="url(#loginRoadSurface)"
            />
            {/* Outer Neon Racing Curbs */}
            <line
              x1="520"
              y1="20"
              x2="40"
              y2="400"
              stroke="url(#loginCurbGlow)"
              strokeWidth="4"
            />
            <line
              x1="680"
              y1="20"
              x2="1160"
              y2="400"
              stroke="url(#loginCurbGlow)"
              strokeWidth="4"
            />
            {/* Animated Dashed Racing Lanes */}
            <line
              x1="573"
              y1="20"
              x2="413"
              y2="400"
              stroke="url(#loginLaneGlow)"
              strokeWidth="2.5"
              className="animate-lane-dash"
            />
            <line
              x1="600"
              y1="20"
              x2="600"
              y2="400"
              stroke="url(#loginLaneGlow)"
              strokeWidth="3"
              className="animate-lane-dash"
            />
            <line
              x1="627"
              y1="20"
              x2="787"
              y2="400"
              stroke="url(#loginLaneGlow)"
              strokeWidth="2.5"
              className="animate-lane-dash"
            />
          </svg>
        </div>

        {/* Dynamic Moving Speed Lines */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          {speedLines.map((line, i) => (
            <div
              key={i}
              style={{
                top: line.top,
                animationDelay: line.delay,
                animationDuration: line.duration,
              }}
              className={`absolute left-0 h-[2px] ${line.width} bg-gradient-to-r ${line.color} animate-speed-line rounded-full blur-[0.3px]`}
            />
          ))}
        </div>

        {/* Floating Glowing Racing Particles */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          {floatingParticles.map((pt, i) => (
            <span
              key={i}
              style={{
                left: pt.left,
                bottom: pt.bottom,
                animationDelay: pt.delay,
                animationDuration: pt.duration,
              }}
              className={`absolute rounded-full ${pt.size} ${pt.color} shadow-[0_0_12px_rgba(245,158,11,0.9)] animate-particle-float`}
            />
          ))}
        </div>

        {/* Top Bar Utility */}
        <header className="relative z-10 flex items-center justify-between gap-3 max-w-5xl w-full mx-auto">
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-[#0B1326]/80 backdrop-blur-md border border-[#F59E0B]/60 shadow-[0_0_18px_rgba(245,158,11,0.2)] text-xs font-black text-[#FEF08A] tracking-wider whitespace-nowrap shrink-0 flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-[#F59E0B] drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
              <span>TRIPLE D OPEN CUP</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="login-theme-toggle-btn"
              onClick={() => {
                setShowroomNightMode((v) => !v);
                soundEngine.playCoin();
              }}
              aria-label={
                showroomNightMode
                  ? 'Chế Độ Tối — Nhấn để chuyển sang Chế Độ Sáng'
                  : 'Chế Độ Sáng — Nhấn để chuyển sang Chế Độ Tối'
              }
              title={
                showroomNightMode
                  ? 'Chế Độ Tối — Đổi sang Chế Độ Sáng'
                  : 'Chế Độ Sáng — Đổi sang Chế Độ Tối'
              }
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl backdrop-blur-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                showroomNightMode
                  ? 'bg-[#0B1326]/85 border-indigo-400/60 text-indigo-300 shadow-[0_0_16px_rgba(99,102,241,0.25)] hover:bg-[#131F3A]'
                  : 'bg-amber-50/95 border-amber-400 text-amber-500 shadow-[0_6px_18px_rgba(245,158,11,0.22)] hover:bg-white'
              }`}
            >
              {showroomNightMode ? (
                <Moon className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <Sun className="w-5 h-5 stroke-[2.2]" />
              )}
            </button>
            <button
              type="button"
              data-testid="login-sound-toggle-btn"
              onClick={() => setSoundMuted(soundEngine.toggleMute())}
              aria-label={soundMuted ? 'Âm Thanh: Tắt (Nhấn để bật)' : 'Âm Thanh: Bật (Nhấn để tắt)'}
              title={soundMuted ? 'Âm Thanh: Tắt' : 'Âm Thanh: Bật'}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl backdrop-blur-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                soundMuted
                  ? 'bg-[#0B1326]/80 border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-500'
                  : 'bg-[#0B1326]/85 border-[#F59E0B]/60 text-[#FACC15] shadow-[0_0_16px_rgba(245,158,11,0.25)] hover:bg-[#131F3A]'
              }`}
            >
              {soundMuted ? (
                <VolumeX className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <Volume2 className="w-5 h-5 stroke-[2.2]" />
              )}
            </button>
          </div>
        </header>

        {/* Center Glassmorphic Login / Registration Card */}
        <main className="relative z-10 max-w-[448px] w-full mx-auto my-auto py-3">
          <div className="animate-login-card relative rounded-[28px] bg-[#0B1326]/78 backdrop-blur-2xl border border-[#F59E0B]/60 shadow-[0_28px_80px_rgba(0,0,0,0.88),0_0_38px_rgba(245,158,11,0.22),inset_0_1px_1px_rgba(255,255,255,0.14)] overflow-hidden">
            {/* Top Neon Rim Glow Bar */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#FACC15] to-transparent opacity-90" />

            {/* Compact Brand Header with Shine & Racing Emblem */}
            <div className="relative px-5 sm:px-7 pt-5 pb-4 bg-gradient-to-b from-[#1E293B]/75 via-[#0F172A]/60 to-transparent border-b border-amber-500/20 text-center overflow-hidden">
              {/* Subtle Shimmer Sweep across Header */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-hud-shimmer" />
              </div>

              {/* Dual Racing / Trophy Crest */}
              <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/35 mb-2 shadow-[0_0_16px_rgba(245,158,11,0.2)]">
                <Trophy className="w-4 h-4 text-[#FACC15] drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
                <span className="w-1 h-1 rounded-full bg-[#F59E0B]" />
                <Car className="w-4 h-4 text-[#FB7185] drop-shadow-[0_0_6px_rgba(251,113,133,0.8)]" />
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#FEF08A] via-[#F59E0B] to-[#FB7185] animate-title-shine drop-shadow-[0_2px_14px_rgba(245,158,11,0.28)]">
                TRIPLE D OPEN CUP
              </h1>
              <p className="text-[11px] font-bold tracking-[0.22em] text-[#CBD5E1] uppercase mt-1">
                Đấu Trường Đua Xe Tốc Độ Cao
              </p>
            </div>

            {/* Level 1 Role Switcher Tabs: Student vs Teacher (Smooth Sliding Pill) */}
            <div className="px-5 sm:px-6 pt-4">
              <div className="relative grid grid-cols-2 bg-[#040814]/90 p-1.5 rounded-2xl border border-slate-800/90 shadow-inner">
                {/* Sliding Active Indicator */}
                <div
                  className={`pointer-events-none absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#FB923C] to-[#D97706] shadow-[0_4px_18px_rgba(245,158,11,0.45)] transition-transform duration-300 ease-out ${
                    loginTab === 'teacher' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setLoginTab('student');
                    setLoginError(null);
                  }}
                  className={`relative z-10 py-2.5 px-2.5 rounded-xl font-extrabold text-xs sm:text-[13px] transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    loginTab === 'student'
                      ? 'text-[#090D16]'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5 shrink-0" />
                  <span>TAY ĐUA HỌC SINH</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginTab('teacher');
                    setLoginError(null);
                  }}
                  className={`relative z-10 py-2.5 px-2.5 rounded-xl font-extrabold text-xs sm:text-[13px] transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    loginTab === 'teacher'
                      ? 'text-[#090D16]'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 shrink-0" />
                  <span>GIÁO VIÊN QUẢN TRỊ</span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="px-5 sm:px-6 pt-3.5 pb-6">
              {loginTab === 'student' ? (
                <form onSubmit={handleStudentSubmit} className="space-y-4">
                  {/* Level 2 Sub-Menu Switcher: Login vs Register (Smooth Sliding Sub-Tab) */}
                  <div className="relative grid grid-cols-2 p-1 rounded-xl bg-[#050A18]/80 border border-slate-800/80">
                    <div
                      className={`pointer-events-none absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-[#16223B] border border-[#F59E0B]/70 shadow-[0_0_12px_rgba(245,158,11,0.22)] transition-transform duration-300 ease-out ${
                        studentAuthMode === 'register'
                          ? 'translate-x-[calc(100%+4px)]'
                          : 'translate-x-0'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setStudentAuthMode('login');
                        setLoginError(null);
                      }}
                      className={`relative z-10 py-1.5 px-3 rounded-lg font-extrabold text-xs transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                        studentAuthMode === 'login'
                          ? 'text-[#FEF08A]'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <Key className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                      <span>ĐĂNG NHẬP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentAuthMode('register');
                        setLoginError(null);
                      }}
                      className={`relative z-10 py-1.5 px-3 rounded-lg font-extrabold text-xs transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                        studentAuthMode === 'register'
                          ? 'text-[#FEF08A]'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                      <span>📝 ĐĂNG KÝ MỚI</span>
                    </button>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-3.5">
                    {studentAuthMode === 'register' && (
                      <div>
                        <label
                          htmlFor="student-username"
                          className="block text-xs font-bold text-[#CBD5E1] mb-1.5"
                        >
                          Tên Hiển Thị Tay Đua
                        </label>
                        <div className="relative group">
                          <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#F59E0B] transition-colors" />
                          <input
                            id="student-username"
                            type="text"
                            required
                            placeholder="VD: Minh Anh 12A1"
                            value={usernameInput}
                            onChange={(e) => setUsernameInput(e.target.value)}
                            className="w-full h-11 sm:h-12 pl-10 pr-3.5 rounded-xl bg-[#040814]/90 border border-slate-700/90 text-white text-sm font-medium placeholder:text-slate-500 transition-all focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/25 focus:shadow-[0_0_18px_rgba(245,158,11,0.25)]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Gmail Input with Inner Icon */}
                    <div>
                      <label
                        htmlFor="student-gmail"
                        className="block text-xs font-bold text-[#CBD5E1] mb-1.5"
                      >
                        Gmail (@gmail.com)
                      </label>
                      <div className="relative group">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#F59E0B] transition-colors" />
                        <input
                          id="student-gmail"
                          type="email"
                          required
                          placeholder="hocsinh@gmail.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="w-full h-11 sm:h-12 pl-10 pr-3.5 rounded-xl bg-[#040814]/90 border border-slate-700/90 text-white text-sm font-mono-num placeholder:text-slate-500 transition-all focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/25 focus:shadow-[0_0_18px_rgba(245,158,11,0.25)]"
                        />
                      </div>
                    </div>

                    {/* 4-Digit Separate PIN Boxes + Show/Hide Toggle */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="student-pin"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#CBD5E1]"
                        >
                          <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
                          <span>Mã PIN (4 Số)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPin((v) => !v)}
                          aria-label={showPin ? 'Ẩn mã PIN' : 'Hiện mã PIN'}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300/90 hover:text-amber-200 transition-colors cursor-pointer"
                        >
                          {showPin ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Ẩn PIN</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Hiện PIN</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                        {[0, 1, 2, 3].map((idx) => {
                          const digitVal = pinInput[idx] || '';
                          return (
                            <input
                              key={idx}
                              id={idx === 0 ? 'student-pin' : `student-pin-${idx}`}
                              ref={(el) => {
                                pinInputRefs.current[idx] = el;
                              }}
                              type={showPin ? 'text' : 'password'}
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={4}
                              required={idx === 0 && pinInput.length === 0}
                              placeholder="•"
                              value={digitVal}
                              onChange={(e) =>
                                handlePinDigitChange(idx, e.target.value)
                              }
                              onKeyDown={(e) => handlePinKeyDown(idx, e)}
                              onPaste={handlePinPaste}
                              onFocus={(e) => e.target.select()}
                              aria-label={`Chữ số PIN thứ ${idx + 1}`}
                              className={`w-full h-11 sm:h-12 rounded-xl bg-[#040814]/95 border text-center text-lg sm:text-xl font-mono-num font-black tracking-widest placeholder:text-slate-600 transition-all focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/30 focus:shadow-[0_0_18px_rgba(245,158,11,0.3)] ${
                                digitVal
                                  ? 'border-[#F59E0B]/75 text-[#FDE047] shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                                  : 'border-slate-700/90 text-white'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {loginError && (
                      <div className="p-2.5 rounded-xl bg-red-950/90 border border-red-400/90 text-xs text-red-100 font-semibold shadow-[0_0_16px_rgba(239,68,68,0.25)]">
                        {loginError}
                      </div>
                    )}
                  </div>

                  {/* Submit CTA with Hover Scale, Light Sweep & Loading State */}
                  <button
                    type="submit"
                    data-start="true"
                    disabled={isLoggingIn}
                    className="group relative w-full h-12 sm:h-13 rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#FB923C] to-[#D97706] text-[#090D16] font-black text-sm sm:text-base tracking-wide shadow-[0_10px_28px_rgba(245,158,11,0.4)] hover:shadow-[0_14px_34px_rgba(245,158,11,0.6)] hover:scale-[1.015] active:scale-[0.985] transition-all duration-200 cursor-pointer overflow-hidden flex items-center justify-center gap-2 disabled:opacity-80 disabled:cursor-wait"
                  >
                    {/* Sweeping Light Beam Effect */}
                    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                      <span className="block w-1/3 h-full bg-gradient-to-r from-transparent via-white/45 to-transparent animate-hud-shimmer" />
                    </span>

                    {isLoggingIn ? (
                      <>
                        <Loader2 className="relative z-10 w-5 h-5 animate-spin text-[#090D16]" />
                        <span className="relative z-10">
                          ĐANG KẾT NỐI SẢNH ĐUA...
                        </span>
                      </>
                    ) : (
                      <span className="relative z-10">
                        {studentAuthMode === 'login'
                          ? '🔑 ĐĂNG NHẬP VÀO SẢNH ĐUA'
                          : '📝 ĐĂNG KÝ & NHẬN 100 XU'}
                      </span>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleTeacherLogin} className="space-y-3.5 pt-1">
                  <div>
                    <label
                      htmlFor="teacher-display-name"
                      className="block text-xs font-bold text-[#CBD5E1] mb-1.5"
                    >
                      Tên Hiển Thị Giáo Viên (Tùy Chọn)
                    </label>
                    <div className="relative group">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#F59E0B] transition-colors" />
                      <input
                        id="teacher-display-name"
                        type="text"
                        placeholder="VD: Thầy/Cô TripleD"
                        value={teacherNameInput}
                        onChange={(e) => setTeacherNameInput(e.target.value)}
                        className="w-full h-11 sm:h-12 pl-10 pr-3.5 rounded-xl bg-[#040814]/90 border border-slate-700/90 text-white text-sm font-bold placeholder:text-slate-500 transition-all focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/25 focus:shadow-[0_0_18px_rgba(245,158,11,0.25)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="teacher-password"
                      className="block text-xs font-bold text-[#CBD5E1] mb-1.5"
                    >
                      Mật Khẩu Quản Trị Giáo Viên
                    </label>
                    <div className="relative group">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#F59E0B] transition-colors" />
                      <input
                        id="teacher-password"
                        type={showTeacherPass ? 'text' : 'password'}
                        required
                        autoComplete="off"
                        placeholder="Nhập mật khẩu bảo mật Giáo Viên..."
                        value={teacherPassInput}
                        onChange={(e) => setTeacherPassInput(e.target.value)}
                        className="w-full h-11 sm:h-12 pl-10 pr-10 rounded-xl bg-[#040814]/90 border border-slate-700/90 text-white text-sm font-mono-num placeholder:text-slate-500 transition-all focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/25 focus:shadow-[0_0_18px_rgba(245,158,11,0.25)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTeacherPass((v) => !v)}
                        aria-label={showTeacherPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#FACC15] transition-colors cursor-pointer"
                      >
                        {showTeacherPass ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div className="p-2.5 rounded-xl bg-red-950/90 border border-red-400/90 text-xs text-red-100 font-semibold shadow-[0_0_16px_rgba(239,68,68,0.25)]">
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="group relative w-full h-12 sm:h-13 rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#FB923C] to-[#D97706] text-[#090D16] font-black text-sm sm:text-base tracking-wide shadow-[0_10px_28px_rgba(245,158,11,0.4)] hover:shadow-[0_14px_34px_rgba(245,158,11,0.6)] hover:scale-[1.015] active:scale-[0.985] transition-all duration-200 cursor-pointer overflow-hidden flex items-center justify-center gap-2 disabled:opacity-80 disabled:cursor-wait"
                  >
                    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                      <span className="block w-1/3 h-full bg-gradient-to-r from-transparent via-white/45 to-transparent animate-hud-shimmer" />
                    </span>
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="relative z-10 w-5 h-5 animate-spin text-[#090D16]" />
                        <span className="relative z-10">
                          ĐANG XÁC THỰC QUẢN TRỊ...
                        </span>
                      </>
                    ) : (
                      <span className="relative z-10">
                        🎓 ĐĂNG NHẬP HỆ THỐNG GIÁO VIÊN
                      </span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </main>

        {/* Bottom Footer: Gaming Keycaps Control Bar */}
        <footer className="relative z-10 max-w-4xl w-full mx-auto pt-1 pb-0.5">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-3.5 py-2 rounded-2xl bg-[#090F22]/75 backdrop-blur-md border border-slate-800/80 text-[11px] sm:text-xs text-[#CBD5E1]">
            <div className="inline-flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded-md bg-[#162038] border border-amber-400/40 border-b-2 border-b-amber-500/70 font-mono-num text-[10px] sm:text-[11px] font-bold text-[#FEF08A] shadow-sm">
                WASD
              </kbd>
              <span className="text-slate-500">/</span>
              <kbd className="px-2 py-0.5 rounded-md bg-[#162038] border border-amber-400/40 border-b-2 border-b-amber-500/70 font-mono-num text-[10px] sm:text-[11px] font-bold text-[#FEF08A] shadow-sm">
                Mũi Tên
              </kbd>
              <span className="text-slate-300 font-semibold">: Lái & Drift</span>
            </div>

            <span className="hidden sm:inline text-slate-600">·</span>

            <div className="inline-flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded-md bg-[#162038] border border-amber-400/40 border-b-2 border-b-amber-500/70 font-mono-num text-[10px] sm:text-[11px] font-bold text-[#FEF08A] shadow-sm">
                Shift
              </kbd>
              <span className="text-slate-300 font-semibold">: Đốt Bình Nitro</span>
            </div>

            <span className="hidden sm:inline text-slate-600">·</span>

            <div className="inline-flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded-md bg-[#162038] border border-amber-400/40 border-b-2 border-b-amber-500/70 font-mono-num text-[10px] sm:text-[11px] font-bold text-[#FEF08A] shadow-sm">
                Space
              </kbd>
              <span className="text-slate-300 font-semibold">: Dùng Vật Phẩm</span>
            </div>

            <span className="hidden sm:inline text-slate-600">·</span>

            <div className="inline-flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded-md bg-[#162038] border border-amber-400/40 border-b-2 border-b-amber-500/70 font-mono-num text-[10px] sm:text-[11px] font-bold text-[#FEF08A] shadow-sm">
                Phím R
              </kbd>
              <span className="text-slate-300 font-semibold">: Giải Cứu Xe Kẹt</span>
            </div>
          </div>
        </footer>

        {showFirebaseModal && (
          <FirebaseModal onClose={() => setShowFirebaseModal(false)} />
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER 6: ASPHALT-INSPIRED MAIN RACING SYNDICATE LOBBY (Requirement #3)
  // ============================================================================
  const activeProfile = isTeacher ? teacherProfile : currentStudent!;
  const activeRank = getRankByRP(activeProfile.rp);

  const presetLoadouts: Record<
    'player' | 'gold' | 'elderwood' | 'chroma' | 'tripled_a',
    CarLoadout
  > = {
    player: activeProfile.loadout,
    gold: {
      chassis: 'chassis_f1',
      paint: 'paint_gold24k',
      decal: 'decal_none',
      wheels: 'wheels_goldrim',
      spoiler: 'spoiler_none',
      underglow: 'underglow_none',
      trail: 'trail_black',
    },
    elderwood: {
      chassis: 'chassis_tripled',
      paint: 'paint_tripled',
      decal: 'decal_tripled',
      wheels: 'wheels_tripled',
      spoiler: 'spoiler_tripled',
      underglow: 'underglow_tripled',
      trail: 'trail_tripled',
    },
    chroma: {
      chassis: 'chassis_hypergt',
      paint: 'paint_chroma',
      decal: 'decal_none',
      wheels: 'wheels_blueenergy',
      spoiler: 'spoiler_twinjet',
      underglow: 'underglow_lightning',
      trail: 'trail_rainbow',
    },
    tripled_a: {
      chassis: 'chassis_tripled_a',
      paint: 'paint_tripled_a',
      decal: 'decal_tripled_a',
      wheels: 'wheels_tripled_a',
      spoiler: 'spoiler_tripled_a',
      underglow: 'underglow_tripled_a',
      trail: 'trail_tripled_a',
    },
  };

  const displayedLoadout = presetLoadouts[showroomPreset] || activeProfile.loadout;
  const displayedChassisPart =
    ALL_PARTS.find((p) => p.id === displayedLoadout.chassis) || ALL_PARTS[0];
  const displayedCarClass = calculateCarClass(displayedLoadout);

  const currentChassisPart =
    ALL_PARTS.find((p) => p.id === activeProfile.loadout.chassis) ||
    ALL_PARTS[0];
  const activeCarClass = calculateCarClass(activeProfile.loadout);
  const activeCarClassStyle = TIER_COLORS[activeCarClass.tier];
  const computedPI = Math.min(
    999,
    Math.round(500 + (activeCarClass.averageScore / 7) * 499)
  );
  const activeTuningSummary = calculateTuningSummary(
    activeProfile.tuningLoadout
  );
  const activeTuningPreset =
    activeProfile.activePresetIndex !== null &&
    activeProfile.activePresetIndex !== undefined &&
    activeProfile.tuningPresets?.[activeProfile.activePresetIndex]
      ? activeProfile.tuningPresets[activeProfile.activePresetIndex]
      : null;
  const activeTuningBars: {
    key: keyof TuningStats;
    label: string;
    val: number;
    raw: number;
  }[] = [
    {
      key: 'topSpeed',
      label: 'Tốc độ',
      val: activeTuningSummary.bars.topSpeed,
      raw: activeTuningSummary.totals.topSpeed,
    },
    {
      key: 'accel',
      label: 'Gia tốc',
      val: activeTuningSummary.bars.accel,
      raw: activeTuningSummary.totals.accel,
    },
    {
      key: 'handling',
      label: 'Độ cua',
      val: activeTuningSummary.bars.handling,
      raw: activeTuningSummary.totals.handling,
    },
    {
      key: 'nitro',
      label: 'Nitro',
      val: activeTuningSummary.bars.nitro,
      raw: activeTuningSummary.totals.nitro,
    },
    {
      key: 'weight',
      label: 'Cân nặng',
      val: activeTuningSummary.bars.weight,
      raw: activeTuningSummary.totals.weight,
    },
  ];

  // Rank progression math for Personal Achievement HUD block
  const currentRankIndex = RANK_TIERS.findIndex((r) => r.id === activeRank.id);
  const nextRank =
    currentRankIndex >= 0 && currentRankIndex < RANK_TIERS.length - 1
      ? RANK_TIERS[currentRankIndex + 1]
      : null;
  const nextRankTargetRP = nextRank ? nextRank.minRP : activeProfile.rp;
  const rpRemainingToNext = nextRank
    ? Math.max(0, nextRankTargetRP - activeProfile.rp)
    : 0;
  const rpProgressPercent = nextRank
    ? Math.min(
        100,
        Math.max(
          8,
          Math.round(
            ((activeProfile.rp - activeRank.minRP) /
              Math.max(1, nextRank.minRP - activeRank.minRP)) *
              100
          )
        )
      )
    : 100;

  const handleOpenProfileModal = () => {
    setRenameInput(activeProfile.username);
    setRenameFeedback(null);
    setShowProfileModal(true);
    soundEngine.playCoin();
  };

  const handleSubmitRename = (e: React.FormEvent) => {
    e.preventDefault();
    const res = dualDB.renameAccount(
      isTeacher,
      activeProfile.email || activeProfile.id,
      renameInput,
      RENAME_COST_COINS
    );
    if (res.ok) {
      soundEngine.playFanfare(false);
      setRenameFeedback({ ok: true, text: res.message });
    } else {
      soundEngine.playHazardHit();
      setRenameFeedback({ ok: false, text: res.message });
    }
  };

  const isShowroomActive =
    dockTab === 'home' &&
    !showPlayModeModal &&
    !showMatchmakingModal &&
    !showTitlesModal &&
    !showRankGuideModal &&
    !showSettingsModal &&
    !showProfileModal &&
    !showFirebaseModal &&
    !showGiftcodeDropdown &&
    !mobileHudDrawer;

  return (
    <div
      data-testid="home-garage-root"
      data-theme={showroomNightMode ? 'dark' : 'light'}
      className={`relative w-screen h-screen overflow-hidden select-none transition-colors duration-300 ${
        showroomNightMode
          ? 'bg-[#050811] text-white'
          : 'bg-[#E2E8F0] text-slate-900'
      }`}
    >
      {/* Center Interactive 3D Hologram Showroom Canvas */}
      <ShowroomCanvas
        loadout={displayedLoadout}
        username={activeProfile.username}
        active={isShowroomActive}
        isNightMode={showroomNightMode}
        carName={displayedChassisPart.name}
        carTier={displayedCarClass.tier}
      />

      {/* Full-Viewport Sci-Fi Glassmorphism HUD Overlay Frame (Compact & Centered) */}
      <div className="fixed inset-0 pointer-events-none flex flex-col justify-between max-w-[1540px] mx-auto w-full px-4 sm:px-7 py-3 sm:py-4">
        {/* If Teacher is in Section 3 (Menu Xe & Shop): Show the 3-Section Teacher Navigation Bar at top */}
        {isTeacher && (
          <div className="pointer-events-auto mb-2">
            <TeacherNavHeader
              activeTab="menu"
              teacherProfile={teacherProfile}
              fbConnected={fbConnected}
              isNightMode={showroomNightMode}
              onToggleNightMode={() => setShowroomNightMode((v) => !v)}
              onSelectTab={handleSelectTeacherTab}
              onOpenFirebaseModal={() => setShowFirebaseModal(true)}
              onOpenSettings={() => setShowSettingsModal(true)}
              onLogout={handleLogoutTeacher}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* TOP SCI-FI GLASSMORPHISM TELEMETRY HEADER BAR                     */}
        {/* ================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* TOP-LEFT: Racer Profile Glassmorphic HUD Pod */}
          <div
            data-testid="open-profile-rename-btn"
            onClick={handleOpenProfileModal}
            title="Nhấn để xem Hồ Sơ Tay Đua & Đổi Tên"
            className={`pointer-events-auto group relative overflow-hidden cursor-pointer hud-clip-card backdrop-blur-md px-3.5 py-2 border transition-all flex items-center gap-3.5 min-w-[240px] sm:min-w-[275px] max-w-full ${
              showroomNightMode
                ? 'bg-[#060D1E]/55 hover:bg-[#0B1730]/70 border-cyan-400/40 hover:border-cyan-300/75 shadow-[0_10px_30px_rgba(0,0,0,0.55),0_0_18px_rgba(56,189,248,0.12)]'
                : 'bg-white/85 hover:bg-white/95 border-sky-500/45 hover:border-sky-600 shadow-[0_10px_28px_rgba(15,23,42,0.14),0_0_16px_rgba(14,165,233,0.12)]'
            }`}
          >
            {/* Sci-Fi HUD Corner Brackets */}
            <span
              className={`pointer-events-none absolute top-0.5 left-0.5 w-2.5 h-2.5 border-t border-l ${
                showroomNightMode ? 'border-[#38BDF8]' : 'border-sky-600'
              }`}
            />
            <span
              className={`pointer-events-none absolute bottom-0.5 right-0.5 w-2.5 h-2.5 border-b border-r ${
                showroomNightMode ? 'border-[#F59E0B]' : 'border-amber-600'
              }`}
            />

            <RankAvatarFrame
              username={activeProfile.username}
              rp={activeProfile.rp}
              size="md"
              isTeacher={isTeacher}
            />

            <div className="flex flex-col justify-center min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-sci font-bold uppercase tracking-wider shrink-0 border ${
                    showroomNightMode
                      ? 'bg-amber-500/15 border-amber-400/40 text-[#FACC15]'
                      : 'bg-amber-500/20 border-amber-500/50 text-amber-800'
                  }`}
                >
                  TAY ĐUA
                </span>
                <span
                  data-testid="player-name-titles-trigger"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playCoin();
                    setShowTitlesModal(true);
                  }}
                  title="Nhấn trực tiếp vào tên để mở Kho Danh Hiệu Cá Nhân (9 Danh Hiệu)"
                  className={`text-sm sm:text-base font-extrabold tracking-wide leading-none transition-colors truncate underline decoration-dotted underline-offset-4 ${
                    showroomNightMode
                      ? 'text-white hover:text-[#FACC15]'
                      : 'text-slate-900 hover:text-amber-600'
                  }`}
                >
                  {activeProfile.username}
                </span>
                {(() => {
                  const eqTitle = getPlayerTitleById(activeProfile.equippedTitle);
                  return eqTitle ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        soundEngine.playCoin();
                        setShowTitlesModal(true);
                      }}
                      title="Đổi Danh Hiệu Cá Nhân"
                      style={{
                        color: eqTitle.color,
                        borderColor: `${eqTitle.color}66`,
                        boxShadow: `0 0 10px ${eqTitle.glowColor}`,
                      }}
                      className="px-1.5 py-0.5 rounded-md bg-slate-950/90 border text-[9px] font-sci font-black uppercase tracking-wider shrink-0 inline-flex items-center gap-1"
                    >
                      <span>{eqTitle.icon}</span>
                      <span>{eqTitle.label}</span>
                    </span>
                  ) : (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        soundEngine.playCoin();
                        setShowTitlesModal(true);
                      }}
                      className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/35 text-[9px] font-sci font-bold text-cyan-300 hover:bg-cyan-500/25 shrink-0"
                    >
                      + Danh Hiệu
                    </span>
                  );
                })()}
              </div>

              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRankGuideModal(true);
                }}
                title="Xem 7 Bậc Rank"
                className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] hover:opacity-90 leading-none whitespace-nowrap"
              >
                <RankCrest tierId={activeRank.id} size={18} />
                <span
                  style={{ color: showroomNightMode ? activeRank.color : '#0F172A' }}
                  className="font-bold text-[13px]"
                >
                  {activeRank.name}
                </span>
                <span className="text-slate-400">·</span>
                <span
                  className={`font-mono-num font-bold text-[13px] ${
                    showroomNightMode ? 'text-[#38BDF8]' : 'text-sky-600'
                  }`}
                >
                  {activeProfile.rp} RP
                </span>
              </div>
            </div>

            {/* Subtle Digital Waveform Indicator */}
            <div className="hidden sm:flex items-end gap-0.5 h-4 pl-1 opacity-70">
              <span
                className={`w-0.5 h-2 animate-hud-wave ${
                  showroomNightMode ? 'bg-[#38BDF8]' : 'bg-sky-600'
                }`}
              />
              <span
                className={`w-0.5 h-3.5 animate-hud-wave ${
                  showroomNightMode ? 'bg-[#38BDF8]' : 'bg-sky-600'
                }`}
                style={{ animationDelay: '0.2s' }}
              />
              <span
                className={`w-0.5 h-2.5 animate-hud-wave ${
                  showroomNightMode ? 'bg-[#F59E0B]' : 'bg-amber-500'
                }`}
                style={{ animationDelay: '0.4s' }}
              />
              <span
                className={`w-0.5 h-4 animate-hud-wave ${
                  showroomNightMode ? 'bg-[#38BDF8]' : 'bg-sky-600'
                }`}
                style={{ animationDelay: '0.1s' }}
              />
            </div>
          </div>

          {/* TOP-RIGHT: Unified Glassmorphic Telemetry Cluster (Coins, Day/Night, Giftcode, Sound, Settings, Logout) */}
          <div className="pointer-events-auto relative flex flex-col items-end">
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Credits / Coin Counter Pod */}
              <div
                className={`relative h-11 sm:h-12 flex items-center gap-2.5 px-3.5 hud-clip-btn backdrop-blur-md border transition-all ${
                  showroomNightMode
                    ? 'bg-[#060D1E]/55 border-amber-400/45 shadow-[0_8px_24px_rgba(0,0,0,0.55),0_0_14px_rgba(245,158,11,0.14)]'
                    : 'bg-white/85 border-amber-500/55 shadow-[0_8px_22px_rgba(15,23,42,0.12)]'
                }`}
              >
                <span className="pointer-events-none absolute top-0.5 left-0.5 w-2 h-2 border-t border-l border-[#F59E0B]/80" />
                <span className="pointer-events-none absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r border-[#38BDF8]/80" />
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                    showroomNightMode
                      ? 'bg-amber-500/15 border-amber-400/40'
                      : 'bg-amber-100 border-amber-400'
                  }`}
                >
                  <Coins
                    className={`w-4.5 h-4.5 ${
                      showroomNightMode ? 'text-[#FACC15]' : 'text-amber-600'
                    }`}
                  />
                </div>
                <div>
                  <div
                    className={`text-[10px] font-sci font-semibold uppercase tracking-wider leading-none ${
                      showroomNightMode ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    CREDITS
                  </div>
                  <div
                    className={`font-mono-num text-sm sm:text-base font-extrabold leading-tight ${
                      showroomNightMode ? 'text-[#FEF08A]' : 'text-amber-700'
                    }`}
                  >
                    {activeProfile.coins.toLocaleString()}
                  </div>
                </div>
                {isTeacher && (
                  <button
                    type="button"
                    onClick={() => {
                      dualDB.addTeacherCoins(1000);
                      soundEngine.playCoin();
                    }}
                    title="Cộng +1,000 (Quyền Giáo Viên)"
                    className="ml-1 px-2 py-1 rounded-lg bg-[#F59E0B] hover:bg-[#FACC15] text-[#050811] font-sci text-[10px] font-black cursor-pointer shadow"
                  >
                    +1K
                  </button>
                )}
              </div>

              {/* Distinct Day / Night Showroom Mode Switcher Icon Button */}
              <button
                type="button"
                data-testid="toggle-showroom-time-btn"
                onClick={() => {
                  setShowroomNightMode((v) => !v);
                  soundEngine.playCoin();
                }}
                aria-label={
                  showroomNightMode
                    ? 'Đang ở Chế Độ Tối (Ban Đêm) — Nhấn để chuyển sang Chế Độ Sáng (Ban Ngày)'
                    : 'Đang ở Chế Độ Sáng (Ban Ngày) — Nhấn để chuyển sang Chế Độ Tối (Ban Đêm)'
                }
                title={
                  showroomNightMode
                    ? 'Chế Độ Tối (Night Hangar) — Đổi sang Chế Độ Sáng'
                    : 'Chế Độ Sáng (Day Studio) — Đổi sang Chế Độ Tối'
                }
                className={`w-11 h-11 sm:w-12 sm:h-12 p-0 leading-none rounded-xl backdrop-blur-xl border inline-flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                  showroomNightMode
                    ? 'bg-[#060D1E]/80 hover:bg-[#0F1E38]/90 border-indigo-400/60 text-indigo-300 shadow-[0_8px_24px_rgba(0,0,0,0.6),0_0_16px_rgba(99,102,241,0.25)]'
                    : 'bg-amber-50/95 hover:bg-white border-amber-400 text-amber-500 shadow-[0_8px_20px_rgba(245,158,11,0.22)]'
                }`}
              >
                {showroomNightMode ? (
                  <Moon className="w-5 h-5 stroke-[2.2] block shrink-0" />
                ) : (
                  <Sun className="w-5 h-5 stroke-[2.2] block shrink-0" />
                )}
              </button>

              {/* Giftcode Icon-Only Button */}
              {!isTeacher && (
                <button
                  type="button"
                  data-testid="toggle-giftcode-btn"
                  onClick={() => {
                    setShowGiftcodeDropdown((v) => !v);
                    setGiftcodeFeedback(null);
                  }}
                  aria-label="Nhập Giftcode nhận quà"
                  title="Nhập Giftcode"
                  className={`w-11 h-11 sm:w-12 sm:h-12 p-0 leading-none rounded-xl backdrop-blur-xl border inline-flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                    showroomNightMode
                      ? showGiftcodeDropdown
                        ? 'bg-amber-500/20 border-amber-400 text-[#FEF08A] shadow-[0_0_18px_rgba(245,158,11,0.3)]'
                        : 'bg-[#060D1E]/70 hover:bg-[#0F1E38]/85 border-amber-400/40 text-[#FACC15] hover:border-amber-300 shadow-[0_8px_24px_rgba(0,0,0,0.55)]'
                      : showGiftcodeDropdown
                      ? 'bg-amber-100 border-amber-500 text-amber-700 shadow-md'
                      : 'bg-white/85 hover:bg-white border-amber-400/70 text-amber-600 shadow-[0_8px_20px_rgba(15,23,42,0.1)]'
                  }`}
                >
                  <Gift className="w-5 h-5 stroke-[2.2] block shrink-0" />
                </button>
              )}

              {/* Sound Mute / Unmute Icon Button */}
              <button
                type="button"
                onClick={() => setSoundMuted(soundEngine.toggleMute())}
                aria-label={soundMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                title={soundMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                className={`w-11 h-11 sm:w-12 sm:h-12 p-0 leading-none rounded-xl backdrop-blur-xl border inline-flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                  showroomNightMode
                    ? soundMuted
                      ? 'bg-[#060D1E]/70 border-amber-500/45 text-amber-300/80 shadow-[0_8px_24px_rgba(0,0,0,0.55)]'
                      : 'bg-[#060D1E]/70 hover:bg-[#0F1E38]/85 border-cyan-400/30 text-slate-200 hover:text-[#38BDF8] hover:border-cyan-400/60 shadow-[0_8px_24px_rgba(0,0,0,0.55)]'
                    : soundMuted
                    ? 'bg-white/85 border-amber-400 text-amber-600 shadow-[0_8px_20px_rgba(15,23,42,0.1)]'
                    : 'bg-white/85 hover:bg-white border-slate-300 text-slate-700 hover:text-sky-600 hover:border-sky-400 shadow-[0_8px_20px_rgba(15,23,42,0.1)]'
                }`}
              >
                {soundMuted ? (
                  <VolumeX className="w-5 h-5 stroke-[2.2] block shrink-0" />
                ) : (
                  <Volume2 className="w-5 h-5 stroke-[2.2] block shrink-0" />
                )}
              </button>

              {/* Settings Button (Placed right next to Logout, icon-only) */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playCoin();
                  setShowSettingsModal(true);
                }}
                aria-label="Cài đặt phím bấm & âm thanh"
                title="Cài đặt phím bấm di chuyển & âm thanh"
                className={`w-11 h-11 sm:w-12 sm:h-12 p-0 leading-none rounded-xl backdrop-blur-xl border inline-flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                  showroomNightMode
                    ? 'bg-[#060D1E]/70 hover:bg-[#0F1E38]/85 border-cyan-400/35 hover:border-cyan-300 text-[#38BDF8] shadow-[0_8px_24px_rgba(0,0,0,0.55)]'
                    : 'bg-white/85 hover:bg-white border-sky-400/60 hover:border-sky-500 text-sky-600 shadow-[0_8px_20px_rgba(15,23,42,0.1)]'
                }`}
              >
                <Settings className="w-5 h-5 stroke-[2.2] block shrink-0" />
              </button>

              {!isTeacher && (
                <button
                  type="button"
                  onClick={() => setScreen('login')}
                  aria-label="Đổi tài khoản"
                  title="Đăng xuất"
                  className={`w-11 h-11 sm:w-12 sm:h-12 p-0 leading-none rounded-xl backdrop-blur-xl border inline-flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                    showroomNightMode
                      ? 'bg-[#060D1E]/70 hover:bg-slate-800/90 border-slate-700/80 hover:border-amber-400/50 text-slate-300 hover:text-amber-200 shadow-[0_8px_24px_rgba(0,0,0,0.55)]'
                      : 'bg-white/85 hover:bg-rose-50 border-slate-300 hover:border-rose-400 text-slate-700 hover:text-rose-600 shadow-[0_8px_20px_rgba(15,23,42,0.1)]'
                  }`}
                >
                  <LogOut className="w-5 h-5 stroke-[2.2] block shrink-0" />
                </button>
              )}
            </div>

            {/* Floating Dropdown Giftcode Popover (Absolute — never shifts layout) */}
            {!isTeacher && showGiftcodeDropdown && (
              <div className="absolute top-full right-0 mt-2 z-50 w-76 sm:w-84 p-3.5 rounded-2xl backdrop-blur-2xl bg-[#060D1E]/95 border border-cyan-400/45 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(56,189,248,0.2)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src="/assets/aistudio/image_68b0c21f.png"
                      alt="TripleD"
                      className="w-5 h-5 rounded object-cover border border-cyan-400/60"
                    />
                    <span className="text-xs font-sci font-bold text-white uppercase tracking-wider">
                      NHẬP GIFTCODE NHẬN QUÀ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGiftcodeDropdown(false)}
                    aria-label="Đóng hộp Giftcode"
                    title="Đóng"
                    className="w-6 h-6 p-0 leading-none rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-slate-300 hover:text-white inline-flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5] block shrink-0" />
                  </button>
                </div>
                <form onSubmit={handleRedeemGiftcode} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nhập mã giftcode..."
                    value={giftcodeInput}
                    onChange={(e) =>
                      setGiftcodeInput(e.target.value.toUpperCase())
                    }
                    className="flex-1 px-3 py-2 rounded-xl bg-[#030712] border border-cyan-500/40 font-sci text-xs font-bold text-white uppercase focus:outline-none focus:border-[#38BDF8]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:brightness-110 text-[#040814] font-sci font-black text-xs cursor-pointer shadow-lg"
                  >
                    NHẬN QUÀ
                  </button>
                </form>
                {giftcodeFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-bold border ${
                      giftcodeFeedback.ok
                        ? 'bg-cyan-950/90 border-cyan-400/50 text-[#7DD3FC]'
                        : 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                    }`}
                  >
                    {giftcodeFeedback.text}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* CENTER OVERLAY PANELS FOR LEADERBOARD OR MATCH HISTORY            */}
        {/* ================================================================= */}
        {dockTab === 'leaderboard' && (
          <div className="pointer-events-auto self-center w-full max-w-4xl max-h-[72vh] flex flex-col rounded-3xl backdrop-blur-2xl bg-[#060D1E]/90 border border-cyan-400/40 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(56,189,248,0.15)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0B1730] via-[#060D1E] to-[#0B1730] border-b border-cyan-500/25">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-[#FACC15]" />
                <h2 className="text-base sm:text-lg font-sci font-black text-white tracking-wider">
                  BẢNG XẾP HẠNG TAY ĐUA XUẤT SẮC
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDockTab('home')}
                aria-label="Đóng Bảng Xếp Hạng"
                title="Đóng"
                className="w-9 h-9 p-0 leading-none rounded-xl bg-[#030712] hover:bg-[#1E293B] text-white border border-cyan-500/30 cursor-pointer inline-flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.75] block shrink-0" />
              </button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-5 gap-3.5 overflow-hidden">
              {/* COMPACT FIXED TOP 3 PODIUM HIGHLIGHT CARDS */}
              {students.length >= 3 && (
                <div className="grid grid-cols-3 gap-2.5 shrink-0">
                  {/* #2 Silver Runner-Up */}
                  <div className="rounded-xl bg-[#091326]/95 border border-cyan-400/30 px-3 py-2 flex items-center gap-2.5 shadow-md min-w-0">
                    <RankAvatarFrame
                      username={students[1]?.username || 'Tay Đua'}
                      rp={students[1]?.rp || 0}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-[#7DD3FC] font-sci font-bold text-[9px] leading-none shrink-0">
                          HẠNG #2
                        </span>
                        <span className="font-sci font-bold text-[11px] text-[#38BDF8] truncate">
                          {students[1]?.rp} RP
                        </span>
                      </div>
                      <div className="font-extrabold text-xs text-white truncate mt-1">
                        {students[1]?.username}
                      </div>
                    </div>
                  </div>

                  {/* #1 Gold Champion */}
                  <div className="rounded-xl bg-gradient-to-r from-[#3B2106]/95 via-[#172554]/90 to-[#091326] border border-[#F59E0B] px-3 py-2 flex items-center gap-2.5 shadow-[0_0_20px_rgba(245,158,11,0.22)] min-w-0">
                    <RankAvatarFrame
                      username={students[0]?.username || 'Quán Quân'}
                      rp={students[0]?.rp || 0}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-[#F59E0B] text-[#050811] font-sci font-black text-[9px] leading-none shadow shrink-0">
                          QUÁN QUÂN #1
                        </span>
                        <span className="font-sci font-black text-xs text-[#38BDF8] truncate">
                          {students[0]?.rp} RP
                        </span>
                      </div>
                      <div className="font-black text-xs sm:text-sm text-[#FEF08A] truncate mt-1">
                        {students[0]?.username}
                      </div>
                    </div>
                  </div>

                  {/* #3 Bronze Podium */}
                  <div className="rounded-xl bg-[#091326]/95 border border-amber-500/35 px-3 py-2 flex items-center gap-2.5 shadow-md min-w-0">
                    <RankAvatarFrame
                      username={students[2]?.username || 'Tay Đua'}
                      rp={students[2]?.rp || 0}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[#FDE047] font-sci font-bold text-[9px] leading-none shrink-0">
                          HẠNG #3
                        </span>
                        <span className="font-sci font-bold text-[11px] text-[#F59E0B] truncate">
                          {students[2]?.rp} RP
                        </span>
                      </div>
                      <div className="font-extrabold text-xs text-white truncate mt-1">
                        {students[2]?.username}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCROLLABLE HIGH-TECH RANKED TABLE */}
              <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl bg-[#030712]/80 border border-cyan-500/20">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead className="sticky top-0 z-10 bg-[#091326] shadow-xs">
                    <tr className="border-b border-cyan-500/20 text-[10px] font-sci font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Thứ Hạng</th>
                      <th className="py-3 px-4">Tay Đua</th>
                      <th className="py-3 px-4">Bậc Rank</th>
                      <th className="py-3 px-4">Điểm RP</th>
                      <th className="py-3 px-4">Thành Tích</th>
                      <th className="py-3 px-4 text-right">Kho Xe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-medium">
                    {students.map((st, idx) => {
                      const rnk = getRankByRP(st.rp);
                      const isMe = !isTeacher && st.id === activeProfile.id;
                      return (
                        <tr
                          key={st.id}
                          className={
                            isMe
                              ? 'bg-cyan-950/40 font-bold'
                              : 'hover:bg-[#0B1730]/60 transition-colors'
                          }
                        >
                          <td className="py-3 px-4 font-sci font-bold text-xs text-[#FACC15]">
                            #{idx + 1}
                          </td>
                          <td className="py-3 px-4 text-white">
                            <div className="flex items-center gap-3">
                              <RankAvatarFrame
                                username={st.username}
                                rp={st.rp}
                                size="sm"
                              />
                              <span className="font-extrabold">
                                {st.username} {isMe && <span className="text-[#38BDF8] font-bold ml-1">(Bạn)</span>}
                              </span>
                              {st.equippedTitle && (() => {
                                const stTitle = getPlayerTitleById(st.equippedTitle);
                                return stTitle ? (
                                  <span
                                    style={{
                                      color: stTitle.color,
                                      borderColor: `${stTitle.color}66`,
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-slate-950/90 border text-[9px] font-sci font-black shrink-0"
                                  >
                                    {stTitle.icon} {stTitle.label}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </td>
                          <td
                            className="py-3 px-4 text-xs font-bold"
                            style={{ color: rnk.color }}
                          >
                            <div className="inline-flex items-center gap-2">
                              <RankCrest tierId={rnk.id} size={26} />
                              <span>{rnk.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-sci text-[#38BDF8] font-bold">
                            {st.rp} RP
                          </td>
                          <td className="py-3 px-4 font-mono-num text-xs text-slate-300">
                            {st.totalMatches} Trận · <span className="text-[#FACC15] font-bold">{st.top1Count} Win</span>
                          </td>
                          <td className="py-3 px-4 text-right font-sci text-xs text-[#7DD3FC] font-bold">
                            {st.ownedParts.length} món
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {dockTab === 'history' && (
          <div className="pointer-events-auto self-center w-full max-w-4xl max-h-[72vh] flex flex-col rounded-3xl backdrop-blur-2xl bg-[#060D1E]/90 border border-cyan-400/40 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(56,189,248,0.15)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0B1730] via-[#060D1E] to-[#0B1730] border-b border-cyan-500/25">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-[#38BDF8]" />
                <h2 className="text-base sm:text-lg font-sci font-black text-white tracking-wider">
                  LỊCH SỬ THI ĐẤU — {activeProfile.username.toUpperCase()}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDockTab('home')}
                aria-label="Đóng Lịch Sử Thi Đấu"
                title="Đóng"
                className="w-9 h-9 p-0 leading-none rounded-xl bg-[#030712] hover:bg-[#1E293B] text-white border border-cyan-500/30 cursor-pointer inline-flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.75] block shrink-0" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* SUMMARY STATS HEADER CARD */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[#030712]/85 border border-cyan-500/20 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Tổng Số Trận</div>
                  <div className="text-base font-sci font-black text-white">{activeProfile.totalMatches}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Tỉ Lệ Vô Địch</div>
                  <div className="text-base font-sci font-black text-[#FACC15]">
                    {activeProfile.totalMatches > 0
                      ? Math.round((activeProfile.top1Count / activeProfile.totalMatches) * 100)
                      : 0}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Điểm Rank RP</div>
                  <div className="text-base font-sci font-black text-[#38BDF8]">{activeProfile.rp} RP</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Tổng Xu Tích Lũy</div>
                  <div className="text-base font-sci font-black text-[#F59E0B]">{activeProfile.coins} Xu</div>
                </div>
              </div>

              {/* MATCH LIST CARDS */}
              {(activeProfile.matchHistory || []).length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400">
                  Chưa ghi nhận chặng đua nào. Hãy vào "Chơi Ngay" để bắt đầu!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeProfile.matchHistory.map((m) => {
                    const isTop3 = m.placement <= 3;
                    return (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs transition-all ${
                          m.placement === 1
                            ? 'bg-gradient-to-r from-[#3B2106]/60 via-[#0B1730] to-[#060D1E] border-[#F59E0B]/70'
                            : isTop3
                            ? 'bg-[#0B1730]/85 border-cyan-400/35'
                            : 'bg-[#060D1E]/85 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-xl font-sci font-black text-xs ${
                              m.placement === 1
                                ? 'bg-[#F59E0B] text-[#050811]'
                                : m.placement === 2
                                ? 'bg-cyan-400 text-[#050811]'
                                : m.placement === 3
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            HẠNG #{m.placement}/{m.totalRacers}
                          </span>

                          <div>
                            <div className="font-extrabold text-sm text-white flex items-center gap-2">
                              <span>{m.mapName}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                · {m.mode === 'team' ? 'Đồng Đội' : 'Đơn Cá Nhân'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {new Date(m.timestamp).toLocaleDateString('vi-VN')} · {new Date(m.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 font-sci text-xs">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-bold ${
                              m.rpDelta > 0
                                ? 'bg-cyan-950/80 text-[#38BDF8] border border-cyan-400/35'
                                : m.rpDelta < 0
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/35'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {m.rpDelta > 0 ? `+${m.rpDelta} RP` : `${m.rpDelta} RP`}
                          </span>

                          <span className="px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-400/35 font-bold text-[#FEF08A]">
                            +{m.coinsEarned} Xu
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SCI-FI COMBAT HUD LEFT & RIGHT COLUMNS + MOBILE DRAWER TOGGLES    */}
        {/* ================================================================= */}
        {dockTab === 'home' && (
          <>
            {/* Mobile / Tablet Quick Drawer Toggle Buttons (< lg) */}
            <div className="flex lg:hidden items-center justify-between w-full my-auto pointer-events-none">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playCoin();
                  setMobileHudDrawer((prev) => (prev === 'left' ? null : 'left'));
                }}
                className={`pointer-events-auto hud-clip-btn backdrop-blur-md border px-3 py-2 text-[13px] font-sci font-bold flex items-center gap-1.5 cursor-pointer ${
                  showroomNightMode
                    ? 'bg-[#060D1E]/65 border-cyan-400/55 text-cyan-200 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                    : 'bg-white/90 border-sky-500/60 text-sky-800 shadow-[0_8px_20px_rgba(15,23,42,0.15)]'
                }`}
              >
                <Wrench className={`w-4 h-4 ${showroomNightMode ? 'text-[#38BDF8]' : 'text-sky-600'}`} />
                <span>Xe & Sự Kiện</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playCoin();
                  setMobileHudDrawer((prev) => (prev === 'right' ? null : 'right'));
                }}
                className={`pointer-events-auto hud-clip-btn backdrop-blur-md border px-3 py-2 text-[13px] font-sci font-bold flex items-center gap-1.5 cursor-pointer ${
                  showroomNightMode
                    ? 'bg-[#060D1E]/65 border-amber-400/55 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'bg-white/90 border-amber-500/60 text-amber-800 shadow-[0_8px_20px_rgba(15,23,42,0.15)]'
                }`}
              >
                <Trophy className={`w-4 h-4 ${showroomNightMode ? 'text-[#FACC15]' : 'text-amber-600'}`} />
                <span>Giải Đấu & Hạng</span>
              </button>
            </div>

            {/* Mobile HUD Drawer Overlay (< lg) */}
            {mobileHudDrawer && (
              <div
                onClick={() => setMobileHudDrawer(null)}
                className="fixed inset-0 z-40 lg:hidden bg-black/55 backdrop-blur-xs pointer-events-auto flex items-center"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`w-[300px] max-w-[88vw] p-3 space-y-3 ${
                    mobileHudDrawer === 'left' ? 'mr-auto ml-3' : 'ml-auto mr-3'
                  }`}
                >
                  {mobileHudDrawer === 'left' ? (
                    <div
                      className={`relative hud-clip-card backdrop-blur-md border p-3.5 space-y-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.75)] ${
                        showroomNightMode
                          ? 'bg-[#060D1E]/90 border-cyan-400/50 text-white'
                          : 'bg-white/95 border-sky-500/60 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[13px] font-sci font-bold ${
                              showroomNightMode ? 'text-cyan-200' : 'text-sky-700'
                            }`}
                          >
                            // XE ĐANG DÙNG
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-mono-num font-bold ${
                              showroomNightMode
                                ? 'bg-cyan-500/15 border-cyan-400/40 text-[#38BDF8]'
                                : 'bg-sky-100 border-sky-400 text-sky-700'
                            }`}
                          >
                            {activeTuningSummary.totalCP}/{activeTuningSummary.maxCP} CP
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMobileHudDrawer(null)}
                          className={`cursor-pointer ${
                            showroomNightMode ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div
                            className={`text-sm font-bold truncate ${
                              showroomNightMode ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {currentChassisPart.name}
                          </div>
                          {activeTuningPreset && (
                            <div
                              className={`text-[10px] font-semibold truncate ${
                                showroomNightMode ? 'text-amber-300' : 'text-amber-700'
                              }`}
                            >
                              ⚡ Preset: {activeTuningPreset.name}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            backgroundColor: activeCarClassStyle.bg,
                            color: activeCarClassStyle.text,
                          }}
                          className="px-2 py-0.5 rounded text-xs font-sci font-black shrink-0"
                        >
                          {activeCarClass.tier}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {activeTuningBars.map((st) => (
                          <div key={st.key} className="flex items-center gap-1.5">
                            <span
                              className={`w-[64px] text-[12px] font-medium shrink-0 ${
                                showroomNightMode ? 'text-slate-200' : 'text-slate-700'
                              }`}
                            >
                              {st.label}
                            </span>
                            <div
                              className={`relative flex-1 h-2 rounded-sm overflow-hidden border ${
                                showroomNightMode
                                  ? 'bg-slate-900/90 border-slate-700/70'
                                  : 'bg-slate-200 border-slate-300'
                              }`}
                            >
                              <div
                                style={{ width: `${st.val}%` }}
                                className="h-full bg-gradient-to-r from-[#0284C7] to-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.8)] transition-all duration-300"
                              />
                            </div>
                            <span
                              className={`w-10 text-right text-[11px] font-mono-num font-bold shrink-0 ${
                                showroomNightMode ? 'text-cyan-200' : 'text-sky-700'
                              }`}
                            >
                              {st.val}/100
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileHudDrawer(null);
                          setGarageInitialTab('tuning');
                          setDockTab('garage');
                        }}
                        className={`w-full py-2 px-3 hud-clip-btn border text-[13px] font-bold cursor-pointer flex items-center justify-center gap-1.5 ${
                          showroomNightMode
                            ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
                            : 'bg-sky-600 text-white border-sky-700'
                        }`}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Độ Xe</span>
                      </button>

                      <div className="h-px bg-gradient-to-r from-amber-400/50 via-amber-400/20 to-transparent" />

                      <div
                        onClick={() => {
                          setMobileHudDrawer(null);
                          setDockTab('gacha');
                        }}
                        className="space-y-2 cursor-pointer"
                      >
                        <div
                          className={`flex items-center justify-between text-[13px] font-sci font-bold ${
                            showroomNightMode ? 'text-amber-300' : 'text-amber-700'
                          }`}
                        >
                          <span>// SỰ KIỆN GIỚI HẠN</span>
                          <span
                            className={`font-mono-num text-xs flex items-center gap-1 ${
                              showroomNightMode ? 'text-amber-200' : 'text-amber-800'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <EventCountdownText />
                          </span>
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            showroomNightMode ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          Thần Rừng TripleD (SSS)
                        </div>
                        <div
                          className={`w-full py-2 px-3 hud-clip-btn border text-[13px] font-bold text-center flex items-center justify-center gap-1.5 ${
                            showroomNightMode
                              ? 'bg-amber-500/15 border-amber-400/50 text-[#FEF08A]'
                              : 'bg-amber-500 text-slate-950 border-amber-600'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Cầu Nguyện</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`relative hud-clip-card backdrop-blur-md border p-3.5 space-y-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.75)] ${
                        showroomNightMode
                          ? 'bg-[#060D1E]/90 border-cyan-400/50 text-white'
                          : 'bg-white/95 border-sky-500/60 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[13px] font-sci font-bold ${
                            showroomNightMode ? 'text-amber-300' : 'text-amber-700'
                          }`}
                        >
                          // ĐẤU TRỰC TUYẾN
                        </span>
                        <button
                          type="button"
                          onClick={() => setMobileHudDrawer(null)}
                          className={`cursor-pointer ${
                            showroomNightMode ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-bold ${
                            showroomNightMode ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          Giải Đấu Lớp
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded border font-mono-num text-[13px] font-bold inline-flex items-center gap-1 ${
                            showroomNightMode
                              ? 'bg-amber-500/20 border-amber-400/45 text-[#FACC15]'
                              : 'bg-amber-100 border-amber-400 text-amber-800'
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5" />+{lobby.teacherRewards?.top1Coins || 100}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileHudDrawer(null);
                          dualDB.updateLobby({ playModeCategory: 'teacher_cup', botCount: 0 });
                          setScreen('lobby');
                        }}
                        className={`w-full py-2 px-3 hud-clip-btn border text-[13px] font-bold cursor-pointer flex items-center justify-center gap-1.5 ${
                          showroomNightMode
                            ? 'bg-transparent hover:bg-amber-400/10 border-amber-400/70 text-[#FACC15]'
                            : 'bg-amber-500 text-slate-950 border-amber-600'
                        }`}
                      >
                        <Car className="w-3.5 h-3.5" />
                        <span>{isTeacher ? 'Mở Phòng Đấu' : 'Vào Sảnh Đấu'}</span>
                      </button>

                      <div className="h-px bg-gradient-to-r from-cyan-400/50 via-cyan-400/20 to-transparent" />

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[13px] font-sci font-bold ${
                              showroomNightMode ? 'text-cyan-200' : 'text-sky-700'
                            }`}
                          >
                            // THÀNH TÍCH CÁ NHÂN
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded border text-[13px] font-mono-num font-bold inline-flex items-center gap-1 ${
                              showroomNightMode
                                ? 'bg-cyan-500/20 border-cyan-400/45 text-[#38BDF8]'
                                : 'bg-sky-100 border-sky-400 text-sky-700'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            {activeProfile.rp} RP
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div
                            className={`py-1.5 px-2 border ${
                              showroomNightMode
                                ? 'bg-white/5 border-white/10'
                                : 'bg-slate-100 border-slate-300'
                            }`}
                          >
                            <div
                              className={`text-[13px] ${
                                showroomNightMode ? 'text-slate-200' : 'text-slate-600'
                              }`}
                            >
                              Hạng
                            </div>
                            <div className="flex items-center justify-center gap-1.5 mt-0.5">
                              <RankCrest tierId={activeRank.id} size={20} />
                              <span
                                className={`text-sm font-bold truncate ${
                                  showroomNightMode ? 'text-[#FACC15]' : 'text-amber-700'
                                }`}
                              >
                                {activeRank.name}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`py-1.5 px-2 border ${
                              showroomNightMode
                                ? 'bg-white/5 border-white/10'
                                : 'bg-slate-100 border-slate-300'
                            }`}
                          >
                            <div
                              className={`text-[13px] ${
                                showroomNightMode ? 'text-slate-200' : 'text-slate-600'
                              }`}
                            >
                              Thắng / Trận
                            </div>
                            <div
                              className={`text-sm font-mono-num font-bold ${
                                showroomNightMode ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {activeProfile.top1Count} / {activeProfile.totalMatches}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileHudDrawer(null);
                            setDockTab('leaderboard');
                          }}
                          className={`w-full pt-1 text-[13px] font-semibold underline-offset-4 hover:underline flex items-center justify-center gap-1 cursor-pointer ${
                            showroomNightMode
                              ? 'text-cyan-300 hover:text-white'
                              : 'text-sky-700 hover:text-sky-900'
                          }`}
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          <span>Xem Bảng Xếp Hạng</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DESKTOP SCI-FI HUD LEFT & RIGHT COLUMNS (>= lg) */}
            <div className="hidden lg:flex items-center justify-between gap-6 my-auto px-3 xl:px-6">
              {/* LEFT COLUMN: MERGED "XE ĐANG DÙNG" + "SỰ KIỆN GIỚI HẠN" */}
              <div className="pointer-events-auto w-[250px] xl:w-[286px] space-y-3">
                {/* 1. Block: XE ĐANG DÙNG (Chamfered Sci-Fi Glass HUD) */}
                <div
                  className={`relative hud-clip-card backdrop-blur-md border p-3.5 hover:-translate-y-0.5 transition-all duration-200 space-y-2.5 ${
                    showroomNightMode
                      ? 'bg-[#060D1E]/52 hover:bg-[#081229]/65 border-cyan-400/45 hover:border-cyan-300/90 shadow-[0_10px_28px_rgba(0,0,0,0.45),0_0_16px_rgba(56,189,248,0.1)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_22px_rgba(56,189,248,0.28)]'
                      : 'bg-white/85 hover:bg-white/95 border-sky-500/50 hover:border-sky-600 shadow-[0_12px_30px_rgba(15,23,42,0.14),0_0_16px_rgba(14,165,233,0.1)]'
                  }`}
                >
                  {/*Glowing Combat HUD Corner Brackets*/}
                  <span
                    className={`pointer-events-none absolute top-0.5 left-0.5 w-3 h-3 border-t-2 border-l-2 ${
                      showroomNightMode
                        ? 'border-[#38BDF8] drop-shadow-[0_0_6px_#38BDF8]'
                        : 'border-sky-600'
                    }`}
                  />
                  <span
                    className={`pointer-events-none absolute bottom-0.5 right-0.5 w-3 h-3 border-b-2 border-r-2 ${
                      showroomNightMode
                        ? 'border-[#38BDF8] drop-shadow-[0_0_6px_#38BDF8]'
                        : 'border-sky-600'
                    }`}
                  />

                  {/* Section Header Line */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[13px] font-sci font-bold tracking-wider shrink-0 ${
                        showroomNightMode ? 'text-cyan-200' : 'text-sky-700'
                      }`}
                    >
                      // XE ĐANG DÙNG
                    </span>
                    <div
                      className={`h-px flex-1 bg-gradient-to-r to-transparent ${
                        showroomNightMode
                          ? 'from-[#38BDF8]/80 via-[#38BDF8]/25 shadow-[0_0_6px_#38BDF8]'
                          : 'from-sky-500/70 via-sky-500/20'
                      }`}
                    />
                    <span
                      data-testid="lobby-car-cp-badge"
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-mono-num font-bold shrink-0 ${
                        showroomNightMode
                          ? 'bg-cyan-500/15 border-cyan-400/40 text-[#38BDF8]'
                          : 'bg-sky-100 border-sky-400 text-sky-700'
                      }`}
                    >
                      {activeTuningSummary.totalCP}/{activeTuningSummary.maxCP} CP
                    </span>
                  </div>

                  {/* Car Name & Class Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div
                        className={`text-sm xl:text-[15px] font-extrabold truncate ${
                          showroomNightMode ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {currentChassisPart.name}
                      </div>
                      {activeTuningPreset && (
                        <div
                          className={`text-[10px] font-semibold truncate mt-0.5 ${
                            showroomNightMode ? 'text-amber-300' : 'text-amber-700'
                          }`}
                        >
                          ⚡ Preset: {activeTuningPreset.name}
                        </div>
                      )}
                    </div>
                    <span
                      data-testid="car-class-badge"
                      style={{
                        backgroundColor: activeCarClassStyle.bg,
                        color: activeCarClassStyle.text,
                      }}
                      className="px-2 py-0.5 rounded text-xs font-sci font-black shrink-0 border border-white/15"
                    >
                      {activeCarClass.tier}
                    </span>
                  </div>

                  {/* 5 Performance Tuning Horizontal Progress Bars (0-100) */}
                  <div
                    data-testid="home-tuning-stat-bars"
                    className="space-y-1.5 animate-hud-bar"
                  >
                    {activeTuningBars.map((st) => (
                      <div key={st.key} className="flex items-center gap-1.5">
                        <span
                          className={`w-[64px] text-[12px] xl:text-[13px] font-medium shrink-0 ${
                            showroomNightMode ? 'text-slate-200' : 'text-slate-700'
                          }`}
                        >
                          {st.label}
                        </span>
                        <div
                          className={`relative flex-1 h-2 rounded-sm overflow-hidden border ${
                            showroomNightMode
                              ? 'bg-slate-900/90 border-slate-700/75'
                              : 'bg-slate-200 border-slate-300'
                          }`}
                        >
                          <div
                            style={{ width: `${st.val}%` }}
                            className="h-full bg-gradient-to-r from-[#0284C7] to-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.75)] transition-all duration-300"
                          />
                          <div className="pointer-events-none absolute inset-0 grid grid-cols-10">
                            {Array.from({ length: 10 }, (_, idx) => (
                              <span
                                key={idx}
                                className={`border-r last:border-r-0 ${
                                  showroomNightMode
                                    ? 'border-[#060D1E]/75'
                                    : 'border-white/70'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span
                          className={`w-10 text-right text-[11px] xl:text-[12px] font-mono-num font-bold shrink-0 ${
                            showroomNightMode ? 'text-cyan-200' : 'text-sky-700'
                          }`}
                        >
                          {st.val}/100
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    data-testid="home-open-tuning-btn"
                    onClick={() => {
                      soundEngine.playCoin();
                      setGarageInitialTab('tuning');
                      setDockTab('garage');
                    }}
                    className={`w-full py-1.5 px-3 hud-clip-btn border text-[13px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                      showroomNightMode
                        ? 'bg-cyan-500/12 hover:bg-cyan-500/25 border-cyan-400/50 hover:border-cyan-300 text-cyan-200 hover:text-white'
                        : 'bg-sky-600 hover:bg-sky-500 border-sky-700 text-white shadow-sm'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Độ Xe</span>
                  </button>
                </div>

                {/* 2. Block: SỰ KIỆN GIỚI HẠN (Gold Neon Border + Live Countdown) */}
                <div
                  onClick={() => {
                    soundEngine.playCoin();
                    setDockTab('gacha');
                  }}
                  className={`relative hud-clip-card backdrop-blur-md border p-3.5 hover:-translate-y-0.5 cursor-pointer transition-all duration-200 space-y-2.5 group ${
                    showroomNightMode
                      ? 'bg-[#060D1E]/52 hover:bg-[#0B172E]/65 border-amber-400/55 hover:border-amber-300 shadow-[0_10px_28px_rgba(0,0,0,0.45),0_0_16px_rgba(245,158,11,0.12)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_24px_rgba(245,158,11,0.3)]'
                      : 'bg-white/85 hover:bg-white/95 border-amber-500/60 hover:border-amber-600 shadow-[0_12px_30px_rgba(15,23,42,0.14),0_0_16px_rgba(245,158,11,0.12)]'
                  }`}
                >
                  {/* Glowing Combat HUD Corner Brackets (Gold) */}
                  <span
                    className={`pointer-events-none absolute top-0.5 left-0.5 w-3 h-3 border-t-2 border-l-2 ${
                      showroomNightMode
                        ? 'border-[#FACC15] drop-shadow-[0_0_6px_#FACC15]'
                        : 'border-amber-600'
                    }`}
                  />
                  <span
                    className={`pointer-events-none absolute bottom-0.5 right-0.5 w-3 h-3 border-b-2 border-r-2 ${
                      showroomNightMode
                        ? 'border-[#FACC15] drop-shadow-[0_0_6px_#FACC15]'
                        : 'border-amber-600'
                    }`}
                  />

                  {/* Section Header Line + Live Countdown */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`text-[13px] font-sci font-bold tracking-wider shrink-0 ${
                        showroomNightMode ? 'text-amber-300' : 'text-amber-700'
                      }`}
                    >
                      // SỰ KIỆN GIỚI HẠN
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[11px] font-mono-num font-bold inline-flex items-center gap-1 shrink-0 ${
                        showroomNightMode
                          ? 'bg-amber-500/15 border-amber-400/35 text-[#FEF08A]'
                          : 'bg-amber-100 border-amber-400 text-amber-800'
                      }`}
                    >
                      <Clock
                        className={`w-3 h-3 ${
                          showroomNightMode ? 'text-[#FACC15]' : 'text-amber-600'
                        }`}
                      />
                      <EventCountdownText />
                    </span>
                  </div>
                  <div
                    className={`h-px w-full bg-gradient-to-r to-transparent ${
                      showroomNightMode
                        ? 'from-[#FACC15]/80 via-[#FACC15]/25 shadow-[0_0_6px_#FACC15]'
                        : 'from-amber-500/70 via-amber-500/20'
                    }`}
                  />

                  <div className="flex items-center gap-2.5">
                    <img
                      src="/assets/aistudio/image_68b0c21f.png"
                      alt="TripleD Elderwood"
                      className="w-10 h-10 rounded-lg object-cover border border-amber-400/50 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-sm font-extrabold truncate ${
                            showroomNightMode ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          Thần Rừng TripleD
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-sci font-black shrink-0 ${
                            showroomNightMode
                              ? 'bg-amber-500/25 border-amber-400/45 text-[#FACC15]'
                              : 'bg-amber-100 border-amber-500 text-amber-800'
                          }`}
                        >
                          SSS
                        </span>
                      </div>
                      <div
                        className={`text-[13px] truncate ${
                          showroomNightMode ? 'text-slate-200' : 'text-slate-600'
                        }`}
                      >
                        Cầu Nguyện nhận siêu xe
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-full py-1.5 px-3 hud-clip-btn border text-[13px] font-bold text-center transition-all flex items-center justify-center gap-1.5 ${
                      showroomNightMode
                        ? 'bg-amber-500/15 group-hover:bg-amber-500/25 border-amber-400/50 text-[#FEF08A]'
                        : 'bg-amber-500 group-hover:bg-amber-400 border-amber-600 text-slate-950 shadow-sm'
                    }`}
                  >
                    <Sparkles
                      className={`w-3.5 h-3.5 ${
                        showroomNightMode ? 'text-[#FACC15]' : 'text-slate-950'
                      }`}
                    />
                    <span>Cầu Nguyện</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: MERGED "ĐẤU TRỰC TUYẾN" + "THÀNH TÍCH CÁ NHÂN" */}
              <div className="pointer-events-auto w-[250px] xl:w-[286px] space-y-3">
                {/* 3. Block: ĐẤU TRỰC TUYẾN (Gold Neon Border + Outline Secondary CTA) */}
                <div
                  onClick={() => {
                    soundEngine.playFanfare(false);
                    const freshPin = isTeacher
                      ? dualDB.generateNewRoomPin()
                      : lobby.roomPin || dualDB.generateNewRoomPin();
                    multiplayerService.disconnect();
                    dualDB.updateLobby({
                      playModeCategory: 'teacher_cup',
                      roomPin: freshPin,
                      participants: [],
                      botCount: 0,
                      isFriendGuest: false,
                      status: 'waiting',
                    });
                    setScreen('lobby');
                  }}
                  className={`relative hud-clip-card backdrop-blur-md border p-3.5 hover:-translate-y-0.5 cursor-pointer transition-all duration-200 space-y-2.5 group ${
                    showroomNightMode
                      ? 'bg-[#060D1E]/52 hover:bg-[#0B172E]/65 border-amber-400/55 hover:border-amber-300 shadow-[0_10px_28px_rgba(0,0,0,0.45),0_0_16px_rgba(245,158,11,0.12)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_24px_rgba(245,158,11,0.3)]'
                      : 'bg-white/85 hover:bg-white/95 border-amber-500/60 hover:border-amber-600 shadow-[0_12px_30px_rgba(15,23,42,0.14),0_0_16px_rgba(245,158,11,0.12)]'
                  }`}
                >
                  {/* Glowing Combat HUD Corner Brackets (Gold) */}
                  <span
                    className={`pointer-events-none absolute top-0.5 left-0.5 w-3 h-3 border-t-2 border-l-2 ${
                      showroomNightMode
                        ? 'border-[#FACC15] drop-shadow-[0_0_6px_#FACC15]'
                        : 'border-amber-600'
                    }`}
                  />
                  <span
                    className={`pointer-events-none absolute bottom-0.5 right-0.5 w-3 h-3 border-b-2 border-r-2 ${
                      showroomNightMode
                        ? 'border-[#FACC15] drop-shadow-[0_0_6px_#FACC15]'
                        : 'border-amber-600'
                    }`}
                  />

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[13px] font-sci font-bold tracking-wider shrink-0 ${
                        showroomNightMode ? 'text-amber-300' : 'text-amber-700'
                      }`}
                    >
                      // ĐẤU TRỰC TUYẾN
                    </span>
                    <div
                      className={`h-px flex-1 bg-gradient-to-r to-transparent ${
                        showroomNightMode
                          ? 'from-[#FACC15]/80 via-[#FACC15]/25 shadow-[0_0_6px_#FACC15]'
                          : 'from-amber-500/70 via-amber-500/20'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`text-sm xl:text-[15px] font-extrabold ${
                        showroomNightMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      Giải Đấu Lớp
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-md border font-mono-num text-[13px] font-bold inline-flex items-center gap-1 shrink-0 ${
                        showroomNightMode
                          ? 'bg-amber-500/20 border-amber-400/50 text-[#FACC15] shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'bg-amber-100 border-amber-400 text-amber-800'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>+{lobby.teacherRewards?.top1Coins || 100}</span>
                    </span>
                  </div>

                  {/* Secondary Action Button */}
                  <div
                    className={`w-full py-1.5 px-3 hud-clip-btn border text-[13px] font-bold text-center transition-all flex items-center justify-center gap-1.5 ${
                      showroomNightMode
                        ? 'bg-transparent group-hover:bg-amber-400/12 border-amber-400/75 group-hover:border-amber-300 text-[#FACC15] group-hover:text-[#FEF08A]'
                        : 'bg-amber-50 group-hover:bg-amber-100 border-amber-500 text-amber-800'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>{isTeacher ? 'Mở Phòng Đấu' : 'Vào Sảnh Đấu'}</span>
                  </div>
                </div>

                {/* 4. Block: THÀNH TÍCH CÁ NHÂN (Cyan Neon Border + Rank Progress + Link CTA) */}
                <div
                  onClick={() => {
                    soundEngine.playCoin();
                    setDockTab('leaderboard');
                  }}
                  className={`relative hud-clip-card backdrop-blur-md border p-3.5 hover:-translate-y-0.5 cursor-pointer transition-all duration-200 space-y-2.5 group ${
                    showroomNightMode
                      ? 'bg-[#060D1E]/52 hover:bg-[#081229]/65 border-cyan-400/45 hover:border-cyan-300/90 shadow-[0_10px_28px_rgba(0,0,0,0.45),0_0_16px_rgba(56,189,248,0.1)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_22px_rgba(56,189,248,0.28)]'
                      : 'bg-white/85 hover:bg-white/95 border-sky-500/50 hover:border-sky-600 shadow-[0_12px_30px_rgba(15,23,42,0.14),0_0_16px_rgba(14,165,233,0.1)]'
                  }`}
                >
                  {/* Glowing Combat HUD Corner Brackets (Cyan) */}
                  <span
                    className={`pointer-events-none absolute top-0.5 left-0.5 w-3 h-3 border-t-2 border-l-2 ${
                      showroomNightMode
                        ? 'border-[#38BDF8] drop-shadow-[0_0_6px_#38BDF8]'
                        : 'border-sky-600'
                    }`}
                  />
                  <span
                    className={`pointer-events-none absolute bottom-0.5 right-0.5 w-3 h-3 border-b-2 border-r-2 ${
                      showroomNightMode
                        ? 'border-[#38BDF8] drop-shadow-[0_0_6px_#38BDF8]'
                        : 'border-sky-600'
                    }`}
                  />

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[13px] font-sci font-bold tracking-wider shrink-0 ${
                        showroomNightMode ? 'text-cyan-200' : 'text-sky-700'
                      }`}
                    >
                      // THÀNH TÍCH CÁ NHÂN
                    </span>
                    <div
                      className={`h-px flex-1 bg-gradient-to-r to-transparent ${
                        showroomNightMode
                          ? 'from-[#38BDF8]/80 via-[#38BDF8]/25 shadow-[0_0_6px_#38BDF8]'
                          : 'from-sky-500/70 via-sky-500/20'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`text-sm xl:text-[15px] font-extrabold ${
                        showroomNightMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      Bảng Xếp Hạng
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-md border text-[13px] font-mono-num font-bold inline-flex items-center gap-1 shrink-0 ${
                        showroomNightMode
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                          : 'bg-sky-100 border-sky-400 text-sky-700'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{activeProfile.rp} RP</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div
                      className={`py-1.5 px-2 border ${
                        showroomNightMode
                          ? 'bg-[#091428]/60 border-cyan-400/20'
                          : 'bg-slate-100/90 border-slate-300'
                      }`}
                    >
                      <div
                        className={`text-[13px] font-medium ${
                          showroomNightMode ? 'text-slate-200' : 'text-slate-600'
                        }`}
                      >
                        Hạng
                      </div>
                      <div className="flex items-center justify-center gap-1.5 mt-0.5">
                        <RankCrest tierId={activeRank.id} size={20} />
                        <span
                          className={`text-xs xl:text-sm font-bold truncate ${
                            showroomNightMode ? 'text-[#FACC15]' : 'text-amber-700'
                          }`}
                        >
                          {activeRank.name}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`py-1.5 px-2 border ${
                        showroomNightMode
                          ? 'bg-[#091428]/60 border-cyan-400/20'
                          : 'bg-slate-100/90 border-slate-300'
                      }`}
                    >
                      <div
                        className={`text-[13px] font-medium ${
                          showroomNightMode ? 'text-slate-200' : 'text-slate-600'
                        }`}
                      >
                        Thắng / Trận
                      </div>
                      <div
                        className={`text-xs xl:text-sm font-mono-num font-bold mt-0.5 ${
                          showroomNightMode ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {activeProfile.top1Count} / {activeProfile.totalMatches}
                      </div>
                    </div>
                  </div>

                  {/* Next Rank Progress Bar & Motivation Label */}
                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span
                        className={`font-medium truncate ${
                          showroomNightMode ? 'text-slate-200' : 'text-slate-600'
                        }`}
                      >
                        {nextRank
                          ? `Còn ${rpRemainingToNext} RP để lên ${nextRank.name}`
                          : 'Đã đạt bậc tối đa'}
                      </span>
                      <span
                        className={`font-mono-num font-bold shrink-0 ml-1 ${
                          showroomNightMode ? 'text-cyan-200' : 'text-sky-700'
                        }`}
                      >
                        {activeProfile.rp}/{nextRankTargetRP} RP
                      </span>
                    </div>
                    <div
                      className={`w-full h-1.5 overflow-hidden ${
                        showroomNightMode ? 'bg-slate-800/90' : 'bg-slate-200'
                      }`}
                    >
                      <div
                        style={{ width: `${rpProgressPercent}%` }}
                        className="h-full bg-gradient-to-r from-[#38BDF8] to-[#FACC15] shadow-[0_0_8px_rgba(56,189,248,0.8)] transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Lightweight Link-Style Tertiary Action */}
                  <div
                    className={`w-full pt-0.5 text-[13px] font-semibold text-center transition-colors flex items-center justify-center gap-1 underline-offset-4 group-hover:underline ${
                      showroomNightMode
                        ? 'text-cyan-300 group-hover:text-white'
                        : 'text-sky-700 group-hover:text-sky-900'
                    }`}
                  >
                    <Trophy
                      className={`w-3.5 h-3.5 ${
                        showroomNightMode ? 'text-[#38BDF8]' : 'text-sky-600'
                      }`}
                    />
                    <span>Xem Bảng Xếp Hạng</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ================================================================= */}
        {/* BOTTOM BAR: DOCK WITH TOOLTIPS + KEYCAP HINTS + PRIMARY PLAY CTA  */}
        {/* ================================================================= */}
        <div className="flex flex-wrap items-end justify-between gap-3 mt-auto">
          {/* Bottom-Left: Sleek Floating Glassmorphic Navigation Dock with Hover Tooltips & Active Label */}
          <div
            className={`pointer-events-auto relative flex items-center gap-1.5 backdrop-blur-md border hud-clip-card px-2 py-1.5 transition-all ${
              showroomNightMode
                ? 'bg-[#050C1A]/65 border-cyan-400/40 shadow-[0_14px_34px_rgba(0,0,0,0.75),0_0_20px_rgba(56,189,248,0.14)]'
                : 'bg-white/85 border-sky-500/50 shadow-[0_12px_30px_rgba(15,23,42,0.14)]'
            }`}
          >
            <span
              className={`pointer-events-none absolute top-0.5 left-0.5 w-2.5 h-2.5 border-t border-l ${
                showroomNightMode ? 'border-[#38BDF8]' : 'border-sky-600'
              }`}
            />
            <span
              className={`pointer-events-none absolute bottom-0.5 right-0.5 w-2.5 h-2.5 border-b border-r ${
                showroomNightMode ? 'border-[#F59E0B]' : 'border-amber-600'
              }`}
            />
            {(
              [
                { id: 'home', label: 'Sảnh Xe', shortLabel: 'Garage', Icon: Car },
                { id: 'garage', label: 'Xưởng Độ Xe', shortLabel: 'Độ xe', Icon: Wrench },
                { id: 'gacha', label: 'Cầu Nguyện', shortLabel: 'Sự kiện', Icon: Sparkles },
                { id: 'leaderboard', label: 'Bảng Xếp Hạng', shortLabel: 'Xếp hạng', Icon: Trophy },
                { id: 'history', label: 'Lịch Sử Thi Đấu', shortLabel: 'Lịch sử', Icon: History },
              ] as const
            ).map(({ id, label, shortLabel, Icon }) => {
              const active = dockTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`dock-btn-${id}`}
                  aria-label={label}
                  title={`${shortLabel} (${label})`}
                  onClick={() => {
                    setDockTab(id);
                    soundEngine.playCoin();
                  }}
                  className={`relative px-2.5 h-12 sm:h-13 leading-none rounded-lg inline-flex flex-col items-center justify-center gap-0.5 transition-all shrink-0 cursor-pointer group ${
                    active
                      ? showroomNightMode
                        ? 'min-w-[62px] bg-gradient-to-b from-cyan-400/25 via-sky-500/15 to-[#061226] text-[#38BDF8] border border-cyan-300/80 shadow-[0_0_18px_rgba(56,189,248,0.4)] -translate-y-0.5'
                        : 'min-w-[62px] bg-gradient-to-b from-sky-500 to-sky-600 text-white border border-sky-700 shadow-[0_4px_14px_rgba(2,132,199,0.35)] -translate-y-0.5'
                      : showroomNightMode
                      ? 'w-11 sm:w-12 bg-[#091326]/55 text-slate-300 hover:text-cyan-200 hover:bg-[#0F1E38]/80 border border-transparent hover:border-cyan-400/40'
                      : 'w-11 sm:w-12 bg-slate-100/90 text-slate-600 hover:text-sky-700 hover:bg-sky-50 border border-slate-200/80 hover:border-sky-400'
                  }`}
                >
                  {/* Hover Tooltip */}
                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#050C1A]/95 border border-cyan-400/50 text-[11px] font-sci font-bold text-cyan-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-30">
                    {shortLabel}
                  </span>

                  <Icon className="w-5 h-5 stroke-[2.2] block shrink-0 transition-transform group-hover:scale-110" />
                  {active && (
                    <span
                      className={`text-[10px] font-sci font-bold tracking-tight whitespace-nowrap leading-none ${
                        showroomNightMode ? 'text-cyan-100' : 'text-white'
                      }`}
                    >
                      {shortLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Center-Bottom: Separated "XE CỦA BẠN" Tab + Preset Switcher + Keycap Hints */}
          {dockTab === 'home' && (
            <div className="pointer-events-auto hidden xl:flex flex-col items-center gap-1.5">
              {/* Interactive Showcase Model Carousel with Separated "XE CỦA BẠN" */}
              <div
                className={`flex items-center gap-1.5 p-1 hud-clip-btn backdrop-blur-md border ${
                  showroomNightMode
                    ? 'bg-[#050C1A]/65 border-cyan-400/35 shadow-[0_10px_28px_rgba(0,0,0,0.65)]'
                    : 'bg-white/85 border-sky-500/45 shadow-[0_10px_24px_rgba(15,23,42,0.12)]'
                }`}
              >
                {/* Group 1: XE CỦA BẠN */}
                <button
                  type="button"
                  onClick={() => {
                    setShowroomPreset('player');
                    soundEngine.playCoin();
                  }}
                  className={`px-3 py-1 rounded font-sci text-[11px] font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    showroomPreset === 'player'
                      ? 'bg-gradient-to-r from-[#38BDF8] to-[#0284C7] text-[#030712] shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                      : showroomNightMode
                      ? 'text-cyan-200 hover:text-white bg-cyan-500/10 border border-cyan-400/30'
                      : 'text-sky-700 hover:text-sky-900 bg-sky-50 border border-sky-300'
                  }`}
                >
                  XE CỦA BẠN
                </button>

                {/* Visual Divider Separating Player Car from Showcase Presets */}
                <div
                  className={`w-px h-5 mx-0.5 ${
                    showroomNightMode ? 'bg-cyan-400/40' : 'bg-slate-300'
                  }`}
                />

                {/* Group 2: Showroom Preset Cars */}
                {(
                  [
                    { id: 'gold', label: 'LEGENDARY GOLD' },
                    { id: 'elderwood', label: 'ELDERWOOD SSS' },
                    { id: 'chroma', label: 'HYPER CHROMA' },
                    { id: 'tripled_a', label: 'TRIPLED A' },
                  ] as const
                ).map((item) => {
                  const isSel = showroomPreset === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setShowroomPreset(item.id);
                        soundEngine.playCoin();
                      }}
                      className={`px-2.5 py-1 rounded font-sci text-[11px] font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                        isSel
                          ? 'bg-gradient-to-r from-[#FACC15] to-[#F59E0B] text-[#030712] shadow-[0_0_12px_rgba(250,204,21,0.5)]'
                          : showroomNightMode
                          ? 'text-slate-300 hover:text-white hover:bg-white/10'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Keycap-Styled Controls Hint */}
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded backdrop-blur-md border text-[11px] font-sci ${
                  showroomNightMode
                    ? 'bg-[#050C1A]/60 border-cyan-500/25 text-slate-200'
                    : 'bg-white/85 border-slate-300 text-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-1">
                  <kbd
                    className={`px-1.5 py-0.5 rounded border font-mono-num font-bold text-[10px] ${
                      showroomNightMode
                        ? 'bg-[#0B1730] border-cyan-400/55 text-[#38BDF8] shadow-[inset_0_-2px_0_rgba(0,0,0,0.65)]'
                        : 'bg-sky-50 border-sky-400 text-sky-700'
                    }`}
                  >
                    A
                  </kbd>
                  <kbd
                    className={`px-1.5 py-0.5 rounded border font-mono-num font-bold text-[10px] ${
                      showroomNightMode
                        ? 'bg-[#0B1730] border-cyan-400/55 text-[#38BDF8] shadow-[inset_0_-2px_0_rgba(0,0,0,0.65)]'
                        : 'bg-sky-50 border-sky-400 text-sky-700'
                    }`}
                  >
                    D
                  </kbd>
                </div>
                <span>XOAY BỆ 3D</span>
                <span className="text-slate-400">·</span>
                <div className="flex items-center gap-1">
                  <kbd
                    className={`px-1.5 py-0.5 rounded border font-mono-num font-bold text-[10px] ${
                      showroomNightMode
                        ? 'bg-[#0B1730] border-amber-400/55 text-[#FACC15] shadow-[inset_0_-2px_0_rgba(0,0,0,0.65)]'
                        : 'bg-amber-50 border-amber-400 text-amber-700'
                    }`}
                  >
                    SPACE
                  </kbd>
                  <kbd
                    className={`px-1.5 py-0.5 rounded border font-mono-num font-bold text-[10px] ${
                      showroomNightMode
                        ? 'bg-[#0B1730] border-amber-400/55 text-[#FACC15] shadow-[inset_0_-2px_0_rgba(0,0,0,0.65)]'
                        : 'bg-amber-50 border-amber-400 text-amber-700'
                    }`}
                  >
                    SHIFT
                  </kbd>
                </div>
                <span>KÍCH HOẠT NITRO</span>
              </div>
            </div>
          )}

          {/* Bottom-Right: Quick Match + Single Primary "CHƠI NGAY" Action Button */}
          <div className="pointer-events-auto flex items-center ml-auto sm:ml-0">
            {/* Quick Match Action Button */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playFanfare(false);
                setShowMatchmakingModal(true);
              }}
              className={`mr-2 sm:mr-3 px-3.5 py-2.5 sm:px-5 sm:py-3 hud-clip-card border-2 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer flex items-center gap-2.5 group ${
                showroomNightMode
                  ? 'bg-gradient-to-r from-[#0C4A6E]/90 via-[#0369A1]/85 to-[#0284C7]/90 hover:from-[#0284C7] hover:to-[#38BDF8] text-cyan-100 hover:text-[#040814] border-cyan-400/70 hover:border-cyan-300 shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_28px_rgba(56,189,248,0.55)]'
                  : 'bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-600 hover:from-sky-700 hover:to-cyan-600 text-white border-sky-400/90 hover:border-sky-300 shadow-[0_8px_22px_rgba(2,132,199,0.42)] hover:shadow-[0_10px_28px_rgba(2,132,199,0.55)]'
              }`}
              title="Tìm đối thủ tự động và ghép trận ngay"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm shrink-0 ${
                  showroomNightMode
                    ? 'bg-[#040814]/80 text-[#38BDF8] group-hover:text-[#FACC15]'
                    : 'bg-white/20 text-[#FEF08A] group-hover:text-white border border-white/35'
                }`}
              >
                <Zap className="w-4 h-4 fill-current animate-pulse" />
              </div>
              <div className="text-left hidden sm:block">
                <div
                  className={`text-[9px] font-sci font-bold uppercase tracking-widest leading-none ${
                    showroomNightMode ? 'text-cyan-300/85' : 'text-sky-100'
                  }`}
                >
                  ONLINE RADAR
                </div>
                <div
                  className={`font-sci font-black text-sm tracking-wider uppercase leading-tight ${
                    showroomNightMode
                      ? 'text-cyan-100 group-hover:text-white'
                      : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]'
                  }`}
                >
                  GHÉP NHANH
                </div>
              </div>
              <span
                className={`sm:hidden font-sci font-black text-xs ${
                  showroomNightMode
                    ? 'text-cyan-100'
                    : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]'
                }`}
              >
                GHÉP NHANH
              </span>
            </button>

            <button
              type="button"
              data-start="true"
              onClick={() => {
                soundEngine.playFanfare(false);
                setShowPlayModeModal(true);
              }}
              className="group relative overflow-hidden px-7 py-3 sm:px-9 sm:py-3.5 hud-clip-card bg-gradient-to-r from-[#F59E0B] via-[#FACC15] to-[#38BDF8] text-[#040814] animate-cta-pulse hover:scale-[1.03] active:scale-[0.97] transition-all duration-150 cursor-pointer border-2 border-[#FEF08A] flex items-center gap-3.5"
            >
              {/* Continuous Shimmer Light Beam Effect */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="animate-hud-shimmer w-1/2 h-full bg-gradient-to-r from-transparent via-white/70 to-transparent" />
              </div>

              {/* HUD Corner Accents inside CTA */}
              <span className="pointer-events-none absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#040814]/70" />
              <span className="pointer-events-none absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#040814]/70" />

              {/* Vector Racing Ignition Icon */}
              <div className="relative z-10 w-10 h-10 rounded-lg bg-[#040814] text-[#FACC15] flex items-center justify-center shadow-inner group-hover:text-[#38BDF8] transition-colors">
                <Zap className="w-5 h-5 stroke-[2.6] fill-current" />
              </div>

              <div className="relative z-10 text-left">
                <div className="text-[10px] font-sci font-black text-[#040814]/80 uppercase tracking-widest leading-none">
                  TRIPLE D IGNITION
                </div>
                <div className="font-sci font-black text-lg sm:text-2xl tracking-wider uppercase leading-tight text-[#040814]">
                  CHƠI NGAY
                </div>
              </div>

              <ChevronRight className="relative z-10 w-6 h-6 stroke-[3.2] text-[#040814] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SCI-FI GLASSMORPHISM PLAY MODE SELECTION MODAL (2-GROUP ARCHITECTURE) */}
      {/* ===================================================================== */}
      {showPlayModeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xl">
          <div
            className={`relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl p-5 sm:p-6 space-y-5 transition-colors duration-200 ${
              showroomNightMode
                ? 'bg-[#060D1E]/95 border border-cyan-400/45 shadow-[0_24px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(56,189,248,0.2)] text-white'
                : 'bg-white/98 border border-sky-500/60 shadow-[0_24px_80px_rgba(15,23,42,0.22),0_0_30px_rgba(14,165,233,0.15)] text-slate-900'
            }`}
          >
            <span
              className={`pointer-events-none absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 rounded-tl ${
                showroomNightMode ? 'border-[#38BDF8]' : 'border-sky-600'
              }`}
            />
            <span
              className={`pointer-events-none absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 rounded-br ${
                showroomNightMode ? 'border-[#F59E0B]' : 'border-amber-600'
              }`}
            />

            {/* Modal Header */}
            <div
              className={`flex items-center justify-between border-b pb-3.5 ${
                showroomNightMode ? 'border-cyan-500/20' : 'border-slate-200'
              }`}
            >
              <div>
                <div
                  className={`text-xs font-medium tracking-wide ${
                    showroomNightMode ? 'text-[#38BDF8]' : 'text-sky-700'
                  }`}
                >
                  Đấu Trường Triple D · Hệ Thống Sảnh Đua
                </div>
                <h3
                  className={`text-xl sm:text-2xl font-sci font-black tracking-wide flex items-center gap-2 mt-0.5 ${
                    showroomNightMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  <span>CHỌN SẢNH ĐUA & CHẾ ĐỘ THI ĐẤU</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPlayModeModal(false)}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
                  showroomNightMode
                    ? 'bg-[#0B1730] hover:bg-cyan-500/20 border-cyan-400/30 text-slate-300 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900'
                }`}
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* =============================================================== */}
            {/* NHÓM 1: ĐẤU TRƯỜNG TRỰC TUYẾN (CHƠI NHIỀU NGƯỜI)                 */}
            {/* =============================================================== */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`font-sci font-black text-sm sm:text-base tracking-wide ${
                      showroomNightMode ? 'text-cyan-300' : 'text-sky-800'
                    }`}
                  >
                    01. Đấu Trường Trực Tuyến (Nhiều Người Chơi)
                  </span>
                  <span
                    className={`hidden sm:inline text-xs ${
                      showroomNightMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    · Đua thời gian thực cùng bạn bè và lớp học
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1A: Ghép Trận & Phòng Bạn Bè Online (Public / Private) */}
                <div
                  data-testid="playmode-online-matchmaking-btn"
                  onClick={() => {
                    soundEngine.playFanfare(false);
                    setShowPlayModeModal(false);
                    setShowMatchmakingModal(true);
                  }}
                  className={`relative overflow-hidden p-4 rounded-2xl border-2 hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
                    showroomNightMode
                      ? 'bg-gradient-to-b from-[#16274D]/95 via-[#09152B] to-[#040814] border-[#38BDF8] hover:border-[#FACC15] shadow-[0_0_24px_rgba(56,189,248,0.25)]'
                      : 'bg-gradient-to-b from-sky-50 via-white to-sky-100/40 border-sky-500 hover:border-amber-500 shadow-md'
                  }`}
                >
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-semibold ${
                          showroomNightMode ? 'text-cyan-300' : 'text-sky-700'
                        }`}
                      >
                        Quét Nhanh · Phòng Công Khai / Riêng Tư
                      </span>
                      <Zap className="w-5 h-5 text-[#38BDF8] shrink-0" />
                    </div>
                    <div
                      className={`font-sci font-black text-base transition-colors ${
                        showroomNightMode
                          ? 'text-white group-hover:text-[#38BDF8]'
                          : 'text-sky-950 group-hover:text-sky-700'
                      }`}
                    >
                      GHÉP TRẬN & PHÒNG BẠN BÈ
                    </div>
                    <p
                      className={`text-xs leading-relaxed ${
                        showroomNightMode ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      Tự động quét phòng công khai trên Radar, tạo phòng riêng tư cho bạn bè hoặc nhập mã PIN 6 số để vào ngay.
                    </p>
                  </div>
                  <div className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#38BDF8] text-[#040814] font-sci font-black text-xs text-center border border-cyan-300 shadow group-hover:from-[#F59E0B] group-hover:to-[#FACC15] transition-all flex items-center justify-center gap-1.5 relative z-10 whitespace-nowrap">
                    <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                    <span>TÌM TRẬN / MỞ PHÒNG →</span>
                  </div>
                </div>

                {/* 1B: Giải Đấu Lớp (Cúp Giáo Viên) */}
                <div
                  data-testid="playmode-teacher-cup-btn"
                  onClick={() => {
                    soundEngine.playFanfare(false);
                    const freshPin = isTeacher
                      ? dualDB.generateNewRoomPin()
                      : lobby.roomPin || dualDB.generateNewRoomPin();
                    multiplayerService.disconnect();
                    dualDB.updateLobby({
                      playModeCategory: 'teacher_cup',
                      roomPin: freshPin,
                      participants: [],
                      botCount: 0,
                      isFriendGuest: false,
                      raidBossId: undefined,
                      raidBossModeEnabled: false,
                      bossControlMode: undefined,
                      bossControllerMode: undefined,
                      campaignLevel: undefined,
                      campaignLevelNumber: undefined,
                      status: 'waiting',
                    });
                    setShowPlayModeModal(false);
                    setScreen('lobby');
                  }}
                  className={`relative overflow-hidden p-4 rounded-2xl border-2 hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
                    showroomNightMode
                      ? 'bg-gradient-to-b from-[#3B2106]/90 via-[#071124] to-[#040814] border-[#F59E0B]/75 hover:border-[#FDE047] shadow-[0_0_24px_rgba(245,158,11,0.22)]'
                      : 'bg-gradient-to-b from-amber-50/80 via-white to-slate-50 border-amber-500 hover:border-amber-600 shadow-md'
                  }`}
                >
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-semibold ${
                          showroomNightMode ? 'text-amber-300' : 'text-amber-800'
                        }`}
                      >
                        Đấu Trường Xếp Hạng · Tích Điểm RP
                      </span>
                      <Trophy className="w-5 h-5 text-[#FACC15] shrink-0" />
                    </div>
                    <div
                      className={`font-sci font-black text-base transition-colors ${
                        showroomNightMode
                          ? 'text-[#FEF08A] group-hover:text-white'
                          : 'text-amber-950 group-hover:text-amber-700'
                      }`}
                    >
                      GIẢI ĐẤU LỚP (CÚP GV)
                    </div>
                    <p
                      className={`text-xs leading-relaxed ${
                        showroomNightMode ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      Giải đấu chính thức tranh Cúp Giáo Viên, tính điểm Bảng Xếp Hạng 7 Bậc Rank & nhận thưởng Xu lớn.
                    </p>
                  </div>
                  <div
                    className={`py-2.5 px-3 rounded-xl font-sci font-black text-xs text-center border transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      showroomNightMode
                        ? 'bg-gradient-to-r from-[#D97706] to-[#FACC15] text-[#040814] border-amber-300 shadow group-hover:brightness-110'
                        : 'bg-amber-500 text-slate-950 border-amber-600 group-hover:bg-amber-400'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5 shrink-0" />
                    <span>{isTeacher ? 'MỞ SẢNH GIẢI ĐẤU →' : 'VÀO GIẢI ĐẤU →'}</span>
                  </div>
                </div>

                {/* 1C: Săn Trùm (Tứ Đại Boss) */}
                <div
                  data-testid="playmode-raid-boss-btn"
                  onClick={() => {
                    soundEngine.playFanfare(false);
                    setShowPlayModeModal(false);
                    setDockTab('raid_boss');
                  }}
                  className={`relative overflow-hidden p-4 rounded-2xl border-2 hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
                    showroomNightMode
                      ? 'bg-gradient-to-b from-[#3B0A1E]/95 via-[#18081C] to-[#040814] border-rose-500/80 hover:border-[#FACC15] shadow-[0_0_24px_rgba(244,63,94,0.25)]'
                      : 'bg-gradient-to-b from-rose-50 via-white to-rose-100/40 border-rose-500 hover:border-amber-500 shadow-md'
                  }`}
                >
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-semibold ${
                          showroomNightMode ? 'text-rose-300' : 'text-rose-800'
                        }`}
                      >
                        Phối Hợp Tổ Đội & Đơn Đấu · 4 Trùm
                      </span>
                      <Flame className="w-5 h-5 text-rose-400 shrink-0" />
                    </div>
                    <div
                      className={`font-sci font-black text-base transition-colors ${
                        showroomNightMode
                          ? 'text-rose-200 group-hover:text-white'
                          : 'text-rose-950 group-hover:text-rose-700'
                      }`}
                    >
                      ĐẤU TRƯỜNG SĂN TRÙM
                    </div>
                    <p
                      className={`text-xs leading-relaxed ${
                        showroomNightMode ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      Lập đội Co-op cùng bạn bè hoặc đánh đơn bắn sập nguồn Tứ Đại Boss (Tuấn Anh, Mai Khánh, Hạnh Dung, Minh Đặng).
                    </p>
                  </div>
                  <div
                    className={`py-2.5 px-3 rounded-xl font-sci font-black text-xs text-center border transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      showroomNightMode
                        ? 'bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 text-white border-rose-400/60 shadow group-hover:brightness-110'
                        : 'bg-rose-600 text-white border-rose-700 group-hover:bg-rose-700'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 shrink-0" />
                    <span>VÀO ĐẤU TRƯỜNG BOSS →</span>
                  </div>
                </div>
              </div>
            </div>

            {/* =============================================================== */}
            {/* NHÓM 2: CHẾ ĐỘ ĐƠN (CHINH PHỤC CÁ NHÂN)                         */}
            {/* =============================================================== */}
            <div
              className={`space-y-3 pt-3 border-t ${
                showroomNightMode ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`font-sci font-black text-sm sm:text-base tracking-wide ${
                      showroomNightMode ? 'text-emerald-300' : 'text-emerald-800'
                    }`}
                  >
                    02. Chinh Phục Cá Nhân (Chơi Đơn)
                  </span>
                  <span
                    className={`hidden sm:inline text-xs ${
                      showroomNightMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    · Luyện kỹ năng với AI và vượt 50 màn chơi chiến dịch
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 2A: Đua Với Máy (AI) */}
                <div
                  onClick={() => {
                    soundEngine.playCoin();
                    multiplayerService.disconnect();
                    dualDB.updateLobby({
                      playModeCategory: 'practice_ai',
                      hostMode: isTeacher ? 'play' : lobby.hostMode,
                      participants: [],
                      botCount: lobby.botCount === 0 ? 15 : lobby.botCount,
                      raidBossId: undefined,
                      raidBossModeEnabled: false,
                      bossControlMode: undefined,
                      bossControllerMode: undefined,
                      campaignLevel: undefined,
                      campaignLevelNumber: undefined,
                      status: 'waiting',
                    });
                    setShowPlayModeModal(false);
                    setScreen('lobby');
                  }}
                  className={`p-4 rounded-2xl border-2 hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
                    showroomNightMode
                      ? 'bg-gradient-to-b from-[#0B1E38]/90 via-[#071124] to-[#040814] border-cyan-400/50 hover:border-cyan-300 shadow-xl'
                      : 'bg-gradient-to-b from-cyan-50/70 via-white to-slate-50 border-cyan-400 hover:border-cyan-600 shadow-sm'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-semibold ${
                          showroomNightMode ? 'text-cyan-300' : 'text-cyan-800'
                        }`}
                      >
                        Tùy Chỉnh 1 – 50 Xe · 3 Cấp Độ Khó
                      </span>
                      <Car className="w-5 h-5 text-[#38BDF8] shrink-0" />
                    </div>
                    <div
                      className={`font-sci font-black text-base transition-colors ${
                        showroomNightMode
                          ? 'text-[#38BDF8] group-hover:text-white'
                          : 'text-cyan-950 group-hover:text-cyan-700'
                      }`}
                    >
                      ĐUA VỚI MÁY (AI)
                    </div>
                    <p
                      className={`text-xs leading-relaxed ${
                        showroomNightMode ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      Luyện tập kỹ năng lái và thử nghiệm cấu hình độ máy trên 15 bản đồ với dàn đối thủ AI tùy chỉnh số lượng & nhận thưởng Xu.
                    </p>
                  </div>
                  <div
                    className={`py-2.5 px-3 rounded-xl font-sci font-black text-xs text-center border transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      showroomNightMode
                        ? 'bg-[#0B1E38] text-[#38BDF8] border-cyan-400/40 group-hover:bg-[#38BDF8] group-hover:text-[#040814]'
                        : 'bg-cyan-100 text-cyan-900 border-cyan-300 group-hover:bg-cyan-600 group-hover:text-white'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5 shrink-0" />
                    <span>VÀO SẢNH ĐUA AI →</span>
                  </div>
                </div>

                {/* 2B: Chiến Dịch Solo (50 Cấp) */}
                <div
                  data-testid="playmode-campaign-btn"
                  onClick={() => {
                    soundEngine.playFanfare(false);
                    setShowPlayModeModal(false);
                    setDockTab('campaign');
                  }}
                  className={`relative overflow-hidden p-4 rounded-2xl border-2 hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
                    showroomNightMode
                      ? 'bg-gradient-to-b from-[#062C24]/95 via-[#071522] to-[#040814] border-emerald-400/75 hover:border-[#FACC15] shadow-[0_0_22px_rgba(16,185,129,0.22)]'
                      : 'bg-gradient-to-b from-emerald-50 via-white to-emerald-100/40 border-emerald-500 hover:border-amber-500 shadow-md'
                  }`}
                >
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-semibold ${
                          showroomNightMode ? 'text-emerald-300' : 'text-emerald-800'
                        }`}
                      >
                        5 Chương Sinh Học · 50 Cấp Độ
                      </span>
                      <MapIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                    </div>
                    <div
                      className={`font-sci font-black text-base transition-colors ${
                        showroomNightMode
                          ? 'text-emerald-300 group-hover:text-white'
                          : 'text-emerald-950 group-hover:text-emerald-700'
                      }`}
                    >
                      CHIẾN DỊCH SOLO (50 CẤP)
                    </div>
                    <p
                      className={`text-xs leading-relaxed ${
                        showroomNightMode ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      Vượt qua 50 màn chơi chuyên biệt (Đua Cổ Điển, Bóng Ma, Thu Thập ATP, Sinh Tồn, Đại Dịch) nhận Xu & mở khóa 5 Danh Hiệu.
                    </p>
                  </div>
                  <div
                    className={`py-2.5 px-3 rounded-xl font-sci font-black text-xs text-center border transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      showroomNightMode
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-[#040814] border-emerald-300 shadow group-hover:from-[#F59E0B] group-hover:to-[#FACC15]'
                        : 'bg-emerald-500 text-white border-emerald-600 group-hover:bg-emerald-600'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>MỞ BẢN ĐỒ 50 CẤP →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Solo Campaign (50 Levels), Raid Boss, Personal Titles, Garage, Gacha, 7-Rank Guide, and Firebase Config */}
      {dockTab === 'campaign' && (
        <SoloCampaignModal
          student={activeProfile}
          onUpdateStudent={(updated) =>
            isTeacher
              ? dualDB.updateTeacherProfile(updated)
              : dualDB.updateStudent(updated)
          }
          onOpenGarageTuning={() => {
            setGarageInitialTab('tuning');
            setDockTab('garage');
          }}
          onClose={() => setDockTab('home')}
          onStartCampaignLevel={(levelConfig) => {
            const neededBotCount = Math.max(1, levelConfig.botCount || 5);
            const otherStudents = students.filter((s) => s.id !== activeProfile.id);
            const botRacers = Array.from({ length: neededBotCount }).map((_, idx) => {
              const studentFallback = otherStudents[idx % Math.max(1, otherStudents.length)];
              const botName = BOT_NAMES[idx % BOT_NAMES.length] || `Bot ${idx + 1}`;
              const botUsername = `[AI] ${botName}`;

              return {
                id: `camp_bot_${idx}_${Date.now()}`,
                username: botUsername,
                rp: studentFallback ? studentFallback.rp : 1000 + idx * 40,
                teamId: (idx % 2) + 1,
                loadout: studentFallback ? studentFallback.loadout : activeProfile.loadout,
                tuningLoadout: studentFallback ? studentFallback.tuningLoadout : activeProfile.tuningLoadout,
                isBot: true,
              };
            });
            const campLobby = dualDB.updateLobby({
              playModeCategory: 'solo_campaign',
              campaignLevelNumber: levelConfig.level,
              campaignLevel: levelConfig.level,
              campaignMode: levelConfig.mode,
              campaignModeType: levelConfig.mode,
              raidBossModeEnabled: false,
              mapId: levelConfig.mapId,
              laps: levelConfig.laps,
              botDifficulty: levelConfig.botDifficulty,
              botCount: levelConfig.botCount,
              raceMode: 'solo',
              status: 'racing',
              participants: [
                {
                  id: isTeacher ? 'teacher_host' : activeProfile.id,
                  username: activeProfile.username,
                  rp: activeProfile.rp,
                  teamId: 1,
                  loadout: activeProfile.loadout,
                  tuningLoadout: activeProfile.tuningLoadout,
                  equippedTitle: activeProfile.equippedTitle,
                  hasDragonAura: activeProfile.hasDragonAura,
                  isBot: false,
                  isTeacher,
                },
                ...botRacers,
              ],
            });
            setLobby(campLobby);
            setDockTab('home');
            setIsRacePaused(false);
            setScreen('racing');
          }}
        />
      )}

      {dockTab === 'raid_boss' && (
        <RaidBossModal
          student={activeProfile}
          isTeacher={isTeacher}
          onUpdateStudent={(updated) =>
            isTeacher
              ? dualDB.updateTeacherProfile(updated)
              : dualDB.updateStudent(updated)
          }
          onOpenGarageTuning={() => {
            setGarageInitialTab('tuning');
            setDockTab('garage');
          }}
          onClose={() => setDockTab('home')}
          onStartSoloRaid={({ bossId, mapId, laps }) => {
            // Strictly Solo 1v1 against Boss (0 Bot allies, bossControlMode locked to AI)
            const raidLobby = dualDB.updateLobby({
              playModeCategory: 'raid_boss',
              raidBossModeEnabled: true,
              raidBossId: bossId,
              bossControllerMode: 'ai',
              mapId,
              laps,
              botDifficulty: 'hard',
              botCount: 0,
              raceMode: 'solo',
              status: 'racing',
              participants: [
                {
                  id: isTeacher ? 'teacher_host' : activeProfile.id,
                  username: activeProfile.username,
                  rp: activeProfile.rp,
                  teamId: 1,
                  loadout: activeProfile.loadout,
                  tuningLoadout: activeProfile.tuningLoadout,
                  equippedTitle: activeProfile.equippedTitle,
                  hasDragonAura: activeProfile.hasDragonAura,
                  isBot: false,
                  isTeacher,
                },
              ],
            });
            setLobby(raidLobby);
            setDockTab('home');
            setIsRacePaused(false);
            setScreen('racing');
          }}
          onCreateCoopRaidRoom={({
            bossId,
            mapId,
            laps,
            bossControlMode,
            isTeacherMassRaid,
          }) => {
            const freshPin = isTeacherMassRaid
              ? dualDB.generateNewRoomPin()
              : dualDB.generateNewFriendRoomPin(activeProfile.username);
            multiplayerService.disconnect();
            // Boss weapon commander is ONLY allowed when teacher is organizing a tournament for students
            const effectiveBossControl =
              isTeacher && isTeacherMassRaid && bossControlMode === 'player_weapon'
                ? 'player_weapon'
                : 'ai';
            const updated = dualDB.updateLobby({
              playModeCategory: isTeacherMassRaid ? 'teacher_cup' : 'raid_boss',
              raidBossModeEnabled: true,
              raidBossId: bossId,
              bossControllerMode: effectiveBossControl,
              roomPin: freshPin,
              friendRoomPin: freshPin,
              isFriendGuest: false,
              assignedGuestId: undefined,
              mapId,
              laps,
              participants: [],
              botCount: 0, // No bots in Raid Boss mode!
              status: 'waiting',
            });
            setLobby(updated);
            setDockTab('home');
            setScreen('lobby');
          }}
          onJoinCoopRaidByPin={(roomPin) => {
            multiplayerService.disconnect();
            const updated = dualDB.updateLobby({
              playModeCategory: 'raid_boss',
              raidBossModeEnabled: true,
              roomPin: roomPin,
              friendRoomPin: roomPin,
              isFriendGuest: true,
              assignedGuestId: undefined,
              participants: [],
              status: 'waiting',
            });
            setLobby(updated);
            setDockTab('home');
            setScreen('lobby');
          }}
        />
      )}

      {showTitlesModal && (
        <TitlesModal
          student={activeProfile}
          onUpdateStudent={(updated) =>
            isTeacher
              ? dualDB.updateTeacherProfile(updated)
              : dualDB.updateStudent(updated)
          }
          onClose={() => setShowTitlesModal(false)}
        />
      )}

      {dockTab === 'garage' && (
        <GarageModal
          student={activeProfile}
          isTeacher={isTeacher}
          initialTab={garageInitialTab}
          onUpdateStudent={(updated) =>
            isTeacher
              ? dualDB.updateTeacherProfile(updated)
              : dualDB.updateStudent(updated)
          }
          onOpenGacha={() => setDockTab('gacha')}
          onClose={() => setDockTab('home')}
        />
      )}

      {dockTab === 'gacha' && (
        <GachaModal
          student={activeProfile}
          isTeacher={isTeacher}
          onUpdateStudent={(updated) =>
            isTeacher
              ? dualDB.updateTeacherProfile(updated)
              : dualDB.updateStudent(updated)
          }
          onOpenGarage={() => setDockTab('garage')}
          onClose={() => setDockTab('home')}
        />
      )}

      {showRankGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xl animate-in fade-in duration-200 select-none">
          <div
            className={`relative w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-3.5 border-2 transition-all shadow-2xl ${
              showroomNightMode
                ? 'bg-[#060D1E]/95 border-cyan-400/50 shadow-[0_24px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(56,189,248,0.2)] text-white'
                : 'bg-white/98 border-amber-500/60 shadow-[0_24px_80px_rgba(15,23,42,0.2)] text-slate-900'
            }`}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between border-b pb-3 ${
                showroomNightMode ? 'border-cyan-500/25' : 'border-slate-200'
              }`}
            >
              <div>
                <div
                  className={`text-[10px] font-sci font-bold uppercase tracking-widest ${
                    showroomNightMode ? 'text-[#38BDF8]' : 'text-sky-700'
                  }`}
                >
                  HỆ THỐNG XẾP HẠNG // ARENA RANK TIERS
                </div>
                <h3
                  className={`text-base sm:text-lg font-sci font-black tracking-wide mt-0.5 flex items-center gap-2 ${
                    showroomNightMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  <Trophy className="w-5 h-5 text-[#FACC15]" />
                  <span>7 BẬC RANK HUYỀN THOẠI</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRankGuideModal(false)}
                aria-label="Đóng Bảng 7 Bậc Rank"
                title="Đóng"
                className={`w-8 h-8 p-0 leading-none rounded-xl border cursor-pointer inline-flex items-center justify-center shrink-0 transition-colors ${
                  showroomNightMode
                    ? 'bg-[#0B1730] hover:bg-cyan-500/20 text-slate-300 hover:text-white border-cyan-400/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                <X className="w-4 h-4 stroke-[2.75] block shrink-0" />
              </button>
            </div>

            {/* 7 Rank Items */}
            <div className="space-y-1.5 text-xs max-h-[58vh] overflow-y-auto pr-1">
              {RANK_TIERS.map((rt, i) => {
                const isCurrent = activeRank.id === rt.id;
                return (
                  <div
                    key={rt.id}
                    style={{
                      borderColor: isCurrent ? rt.color : undefined,
                      boxShadow: isCurrent ? `0 0 14px ${rt.color}45` : undefined,
                    }}
                    className={`flex items-center justify-between py-2 px-3 rounded-2xl border transition-all ${
                      isCurrent
                        ? showroomNightMode
                          ? 'bg-gradient-to-r from-[#0B1730] via-[#0E2042] to-[#0B1730] border-2 shadow-lg'
                          : 'bg-amber-50/90 border-2 border-amber-500 shadow-md'
                        : showroomNightMode
                        ? 'bg-[#091428]/70 hover:bg-[#0D1E3A] border-slate-700/60'
                        : 'bg-slate-50/80 hover:bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="shrink-0">
                        <RankCrest tierId={rt.id} size={30} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            style={{ color: rt.color }}
                            className="font-extrabold text-xs sm:text-sm font-sci tracking-wide"
                          >
                            {i + 1}. {rt.name}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm animate-pulse">
                              BẬC CỦA BẠN
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[10px] ${
                            showroomNightMode ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {rt.id === 'master' ? 'Đấu sĩ đỉnh cao không giới hạn' : 'Tích lũy điểm RP qua các chặng'}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{ color: rt.color }}
                      className="font-mono-num font-black text-xs sm:text-sm shrink-0 ml-2"
                    >
                      {rt.maxRP ? `${rt.minRP} – ${rt.maxRP} RP` : `${rt.minRP}+ RP`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Tournament Reward Rule - Clean, compact & aligned */}
            <div
              className={`p-2.5 rounded-2xl border space-y-1.5 ${
                showroomNightMode
                  ? 'bg-[#091428]/90 border-amber-400/40 text-white'
                  : 'bg-amber-50/95 border-amber-300 text-slate-900 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-sci font-bold">
                <span className="flex items-center gap-1.5 text-amber-400 uppercase tracking-wider">
                  <Trophy className="w-3.5 h-3.5 text-[#FACC15]" />
                  <span>Điểm Thưởng Giải Đấu</span>
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    showroomNightMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Cộng trực tiếp vào Rank
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div
                  className={`py-1.5 px-1 rounded-xl border ${
                    showroomNightMode
                      ? 'bg-amber-500/15 border-amber-400/40'
                      : 'bg-amber-100/80 border-amber-400'
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold ${
                      showroomNightMode ? 'text-amber-200' : 'text-amber-900'
                    }`}
                  >
                    Top 1
                  </div>
                  <div className="font-mono-num font-black text-xs sm:text-sm text-[#FACC15]">
                    +30 RP
                  </div>
                </div>

                <div
                  className={`py-1.5 px-1 rounded-xl border ${
                    showroomNightMode
                      ? 'bg-sky-500/15 border-sky-400/40'
                      : 'bg-sky-100/80 border-sky-400'
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold ${
                      showroomNightMode ? 'text-sky-200' : 'text-sky-900'
                    }`}
                  >
                    Top 2 – 3
                  </div>
                  <div className="font-mono-num font-black text-xs sm:text-sm text-[#38BDF8]">
                    +20 RP
                  </div>
                </div>

                <div
                  className={`py-1.5 px-1 rounded-xl border ${
                    showroomNightMode
                      ? 'bg-slate-800/80 border-slate-700'
                      : 'bg-slate-100 border-slate-300'
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold ${
                      showroomNightMode ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Top 4 – 10
                  </div>
                  <div
                    className={`font-mono-num font-black text-xs sm:text-sm ${
                      showroomNightMode ? 'text-slate-200' : 'text-slate-900'
                    }`}
                  >
                    +10 RP
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          isTeacher={isTeacher}
        />
      )}

      {showProfileModal && (
        <div
          data-testid="profile-rename-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl select-none animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-[#060D1E]/95 border border-cyan-400/50 p-6 space-y-5 shadow-[0_24px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(56,189,248,0.2)] text-white">
            {/* Glowing Combat HUD Corner Brackets */}
            <span className="pointer-events-none absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-[#38BDF8] rounded-tl" />
            <span className="pointer-events-none absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-[#F59E0B] rounded-br" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-cyan-500/25 pb-3.5">
              <div>
                <div className="text-[10px] font-sci font-bold text-[#38BDF8] uppercase tracking-widest">
                  THÔNG TIN TAY ĐUA // IDENTITY
                </div>
                <h3 className="text-lg sm:text-xl font-sci font-black text-white tracking-wide mt-0.5">
                  HỒ SƠ & ĐỔI TÊN TAY ĐUA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                aria-label="Đóng Hồ Sơ Tay Đua"
                title="Đóng"
                className="w-9 h-9 p-0 leading-none rounded-xl bg-[#0B1730] hover:bg-cyan-500/20 border border-cyan-400/30 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.75] block shrink-0" />
              </button>
            </div>

            {/* Profile Identity Summary */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#0B1730]/85 border border-cyan-500/30 shadow-lg">
              <RankAvatarFrame
                username={activeProfile.username}
                rp={activeProfile.rp}
                size="lg"
                isTeacher={isTeacher}
              />
              <div className="space-y-1 flex-1 min-w-0">
                <div className="text-base font-extrabold text-white truncate">
                  {activeProfile.username}
                </div>
                <div className="text-xs font-mono-num text-[#94A3B8] truncate">
                  {activeProfile.email}
                </div>
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <span
                    style={{
                      backgroundColor: activeCarClassStyle.bg,
                      color: activeCarClassStyle.text,
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-sci font-black border border-white/15"
                  >
                    CLASS {activeCarClass.tier}
                  </span>
                  <span className="font-mono-num text-xs font-black text-[#FEF08A] inline-flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-[#FACC15]" />
                    <span>{activeProfile.coins.toLocaleString()}</span>
                  </span>
                  <span className="font-mono-num text-xs font-bold text-[#94A3B8]">
                    · {activeProfile.totalMatches} Trận ({activeProfile.top1Count} Win)
                  </span>
                </div>
              </div>
            </div>

            {/* Rename Form (50 Coins) */}
            <form onSubmit={handleSubmitRename} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="profile-rename-input"
                    className="text-xs font-sci font-bold text-cyan-200 uppercase tracking-wider"
                  >
                    // Đổi Tên Hiển Thị
                  </label>
                  <span className="font-mono-num text-xs font-black text-[#FACC15] bg-amber-500/15 px-2 py-0.5 rounded border border-amber-400/40">
                    Phí: {RENAME_COST_COINS} Xu
                  </span>
                </div>
                <input
                  id="profile-rename-input"
                  type="text"
                  required
                  minLength={2}
                  maxLength={24}
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  placeholder="Nhập tên mới (2 - 24 ký tự)..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-cyan-500/40 focus:border-[#38BDF8] text-white text-sm font-bold focus:outline-none transition-colors"
                />
              </div>

              {renameFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold border ${
                    renameFeedback.ok
                      ? 'bg-cyan-950/90 border-cyan-400/60 text-[#7DD3FC]'
                      : 'bg-rose-950/90 border-rose-500/60 text-rose-200'
                  }`}
                >
                  {renameFeedback.text}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#38BDF8] via-[#0284C7] to-[#38BDF8] hover:brightness-110 text-[#040814] font-sci font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Xác Nhận Đổi Tên (-{RENAME_COST_COINS} Xu)</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {showFirebaseModal && (
        <FirebaseModal onClose={() => setShowFirebaseModal(false)} />
      )}

      {showMatchmakingModal && (
        <AutoMatchmakingModal
          currentStudent={activeProfile}
          isTeacher={isTeacher}
          isNightMode={showroomNightMode}
          onClose={() => setShowMatchmakingModal(false)}
          onEnterLobby={(roomPin, isHost, customConfig) => {
            setShowMatchmakingModal(false);
            const updated = dualDB.updateLobby({
              playModeCategory: 'friends_pvp',
              friendRoomPin: roomPin,
              isFriendGuest: !isHost,
              raidBossId: undefined,
              raidBossModeEnabled: false,
              bossControlMode: undefined,
              bossControllerMode: undefined,
              campaignLevel: undefined,
              campaignLevelNumber: undefined,
              status: 'waiting',
              participants: [],
              ...(customConfig || {}),
            });
            setLobby(updated);
            setScreen('lobby');
          }}
          onLaunchRace={(finalLobby) => {
            setShowMatchmakingModal(false);
            setLobby(finalLobby);
            setIsRacePaused(false);
            setScreen('racing');
          }}
        />
      )}
    </div>
  );
}


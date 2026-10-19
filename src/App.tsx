import React, { useEffect, useState } from 'react';
import {
  Car,
  ChevronRight,
  Database,
  Gift,
  History,
  LogOut,
  Moon,
  Sparkles,
  Sun,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from 'lucide-react';
import { AdminPanel } from './components/AdminPanel';
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
import { RankAvatarFrame, RankCrest } from './components/RankBadge';
import { ShowroomCanvas } from './components/ShowroomCanvas';
import {
  TeacherNavHeader,
  TeacherWorkspaceTab,
} from './components/TeacherNavHeader';
import {
  ALL_PARTS,
  DEFAULT_ADMIN_PASSWORD,
  MAPS,
  RANK_TIERS,
  TIER_COLORS,
} from './game/constants';
import {
  calculateCarClass,
  getRankByRP,
  isValidGmail,
  isValidPin,
  RENAME_COST_COINS,
} from './game/rules';
import {
  LobbyConfig,
  RacerState,
  StudentAccount,
} from './game/types';
import { dualDB } from './services/database';
import { soundEngine } from './services/sound';

type AppScreen =
  | 'login'
  | 'menu'
  | 'lobby'
  | 'racing'
  | 'podium'
  | 'admin';

type DockTab = 'home' | 'garage' | 'gacha' | 'leaderboard' | 'history';

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

  // Navigation & Auth State
  const [screen, setScreen] = useState<AppScreen>('login');
  const [loginTab, setLoginTab] = useState<'student' | 'teacher'>('student');
  const [studentAuthMode, setStudentAuthMode] = useState<'login' | 'register'>(
    'login'
  );
  const [currentStudentEmail, setCurrentStudentEmail] = useState<string | null>(
    null
  );
  const [isTeacher, setIsTeacher] = useState(false);

  // Login / Register Form Inputs
  const savedCreds = dualDB.getSavedCredentials();
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

  // Main Menu Dock & Widgets
  const [dockTab, setDockTab] = useState<DockTab>('home');
  const [showroomNightMode, setShowroomNightMode] = useState(false);
  const [showGiftcodeDropdown, setShowGiftcodeDropdown] = useState(false);
  const [giftcodeInput, setGiftcodeInput] = useState('');
  const [giftcodeFeedback, setGiftcodeFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [showRankGuideModal, setShowRankGuideModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [renameFeedback, setRenameFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [soundMuted, setSoundMuted] = useState(() => soundEngine.getMuted());

  // Racing & Podium State
  const [isRacePaused, setIsRacePaused] = useState(false);
  const [podiumData, setPodiumData] = useState<{
    results: FinalRacerResult[];
    winningTeamId: number | null;
    mapName: string;
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
      }
    }
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

  // Student Login / Register Submit Handler
  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      setCurrentStudentEmail(res.account.email);
      setIsTeacher(false);
      setScreen('menu');
      setDockTab('home');
      soundEngine.playFanfare(false);
      soundEngine.startBGM();
      return;
    }

    // Login Mode
    const res = dualDB.loginStudent(emailInput, pinInput);
    if (!res.ok || !res.account) {
      setLoginError(res.error || 'Không thể đăng nhập.');
      return;
    }

    setCurrentStudentEmail(res.account.email);
    setIsTeacher(false);
    setScreen('menu');
    setDockTab('home');
    soundEngine.playCoin();
    soundEngine.startBGM();
  };

  // Teacher Referee Login Handler
  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
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
    setIsTeacher(true);
    setCurrentStudentEmail(null);
    setScreen('admin');
    soundEngine.playFanfare(false);
    soundEngine.startBGM();
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

    // Record coins, RP, and match history for any registered student in the race
    for (const r of results) {
      if (r.id === 'teacher_host') {
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

      const existingStudent = dualDB.getStudent(r.id);
      if (existingStudent) {
        dualDB.recordMatchResult(existingStudent.email, {
          id: `match_${Date.now()}_${r.id}`,
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
    });
    setScreen('podium');
  };

  // ============================================================================
  // RENDER 1: ACTIVE RACE SCREEN
  // ============================================================================
  if (screen === 'racing') {
    return (
      <RaceCanvas
        lobby={lobby}
        localPlayerId={
          isTeacher
            ? lobby.playModeCategory === 'teacher_cup' &&
              lobby.hostMode === 'spectator'
              ? null
              : 'teacher_host'
            : currentStudent?.id || null
        }
        isTeacher={isTeacher}
        isPaused={isRacePaused}
        onTogglePause={() => setIsRacePaused((p) => !p)}
        onRaceComplete={handleRaceComplete}
        onExitRace={() => {
          setIsRacePaused(false);
          setScreen('lobby');
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
        onPlayAgainLobby={() => setScreen('lobby')}
        onBackToMainMenu={() => setScreen(isTeacher ? 'admin' : 'menu')}
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
          fbConnected={fbConnected}
          onSelectTeacherTab={handleSelectTeacherTab}
          onOpenFirebaseModal={() => setShowFirebaseModal(true)}
          onLogout={handleLogoutTeacher}
        />
        {showFirebaseModal && (
          <FirebaseModal onClose={() => setShowFirebaseModal(false)} />
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
          allStudents={students}
          onStartRace={(updatedLobby) => {
            setLobby(updatedLobby);
            setIsRacePaused(false);
            setScreen('racing');
          }}
          onBackToMenu={() => setScreen(isTeacher ? 'admin' : 'menu')}
          onSelectTeacherTab={isTeacher ? handleSelectTeacherTab : undefined}
          onOpenFirebaseModal={() => setShowFirebaseModal(true)}
          onLogout={handleLogoutTeacher}
        />
        {showFirebaseModal && (
          <FirebaseModal onClose={() => setShowFirebaseModal(false)} />
        )}
      </>
    );
  }

  // ============================================================================
  // RENDER 5: STREAMLINED LOGIN PORTAL (Requirement #5: Tinh gọn, bỏ giới thiệu & mẫu)
  // ============================================================================
  if (screen === 'login' || (!currentStudent && !isTeacher)) {
    return (
      <div className="relative min-h-screen w-full bg-[#090D16] text-white flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
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
        />

        {/* Subtle Dark Racing Vignette */}
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[#090D16]/75 via-[#090D16]/45 to-[#090D16]/85" />

        {/* Top Bar Utility */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 max-w-5xl w-full mx-auto">
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-[#0F172A]/90 border border-[#F59E0B]/70 text-xs font-black text-[#FEF08A] tracking-wider whitespace-nowrap shrink-0">
              🏆 TRIPLE D OPEN CUP
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFirebaseModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#0F172A]/90 hover:bg-[#1E293B] border border-slate-600 text-xs font-bold text-[#FEF08A] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {fbConnected
                ? '🟢 Firebase: Đã Kết Nối'
                : '🔥 Cấu Hình Firebase'}
            </button>
            <button
              type="button"
              onClick={() => setSoundMuted(soundEngine.toggleMute())}
              className="px-3.5 py-1.5 rounded-xl bg-[#0F172A]/90 border border-slate-600 text-xs font-bold text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              {soundMuted ? '🔇 Âm Thanh: Tắt' : '🔊 Âm Thanh: Bật'}
            </button>
          </div>
        </div>

        {/* Center Compact Login / Registration Card */}
        <div className="relative z-10 max-w-md w-full mx-auto my-auto py-2">
          <div className="rounded-3xl bg-[#0F172A]/95 border-2 border-[#F59E0B]/80 shadow-[0_24px_64px_rgba(0,0,0,0.85)] overflow-hidden">
            {/* Compact Brand Header */}
            <div className="px-6 pt-5 pb-4 bg-gradient-to-b from-[#1E293B] to-[#0F172A] border-b border-slate-700/80 text-center">
              <h1 className="font-display text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#FEF08A] via-[#F59E0B] to-[#FB7185]">
                TRIPLE D OPEN CUP
              </h1>
              <p className="text-[11px] font-bold tracking-[0.22em] text-[#94A3B8] uppercase mt-0.5">
                Đấu Trường Đua Xe Tốc Độ Cao
              </p>
            </div>

            {/* Top Role Switcher Tabs: Student vs Teacher */}
            <div className="grid grid-cols-2 bg-[#020617] p-1.5 gap-1.5 border-b border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setLoginTab('student');
                  setLoginError(null);
                }}
                className={`py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-colors cursor-pointer ${
                  loginTab === 'student'
                    ? 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#0F172A] shadow-md'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                🏎️ TAY ĐUA HỌC SINH
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginTab('teacher');
                  setLoginError(null);
                }}
                className={`py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-colors cursor-pointer ${
                  loginTab === 'teacher'
                    ? 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#0F172A] shadow-md'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                🎓 GIÁO VIÊN QUẢN TRỊ
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {loginTab === 'student' ? (
                <form onSubmit={handleStudentSubmit} className="space-y-4">
                  {/* Login vs Register Sub-Menu Switcher */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#020617] border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setStudentAuthMode('login');
                        setLoginError(null);
                      }}
                      className={`py-2 px-3 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
                        studentAuthMode === 'login'
                          ? 'bg-[#1E293B] text-[#FEF08A] border border-[#F59E0B]'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      🔑 ĐĂNG NHẬP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentAuthMode('register');
                        setLoginError(null);
                      }}
                      className={`py-2 px-3 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
                        studentAuthMode === 'register'
                          ? 'bg-[#1E293B] text-[#FEF08A] border border-[#F59E0B]'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      📝 ĐĂNG KÝ MỚI
                    </button>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-3">
                    {studentAuthMode === 'register' && (
                      <div>
                        <label
                          htmlFor="student-username"
                          className="block text-xs font-bold text-[#CBD5E1] mb-1"
                        >
                          Tên Hiển Thị Tay Đua
                        </label>
                        <input
                          id="student-username"
                          type="text"
                          required
                          placeholder="VD: Minh Anh 12A1"
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#020617] border border-slate-700 text-white text-sm focus:outline-none focus:border-[#F59E0B]"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="student-gmail"
                          className="block text-xs font-bold text-[#CBD5E1] mb-1"
                        >
                          Gmail (@gmail.com)
                        </label>
                        <input
                          id="student-gmail"
                          type="email"
                          required
                          placeholder="hocsinh@gmail.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#020617] border border-slate-700 text-white text-sm font-mono-num focus:outline-none focus:border-[#F59E0B]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="student-pin"
                          className="block text-xs font-bold text-[#CBD5E1] mb-1"
                        >
                          Mã PIN (4 Số)
                        </label>
                        <input
                          id="student-pin"
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          required
                          placeholder="1234"
                          value={pinInput}
                          onChange={(e) =>
                            setPinInput(e.target.value.replace(/\D/g, ''))
                          }
                          className="w-full px-3 py-2.5 rounded-xl bg-[#020617] border border-slate-700 text-[#FDE047] text-center text-base font-mono-num font-bold tracking-widest focus:outline-none focus:border-[#F59E0B]"
                        />
                      </div>
                    </div>

                    {loginError && (
                      <div className="p-2.5 rounded-xl bg-red-950/90 border border-red-400 text-xs text-red-100 font-semibold">
                        {loginError}
                      </div>
                    )}
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    data-start="true"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:brightness-110 text-[#0F172A] font-black text-sm sm:text-base shadow-xl transition-transform active:scale-[0.99] cursor-pointer"
                  >
                    {studentAuthMode === 'login'
                      ? '🔑 ĐĂNG NHẬP VÀO SẢNH ĐUA'
                      : '📝 ĐĂNG KÝ & NHẬN 100 XU'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleTeacherLogin} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="teacher-display-name"
                      className="block text-xs font-bold text-[#CBD5E1] mb-1"
                    >
                      Tên Hiển Thị Giáo Viên (Tùy Chọn)
                    </label>
                    <input
                      id="teacher-display-name"
                      type="text"
                      placeholder="VD: Thầy/Cô TripleD"
                      value={teacherNameInput}
                      onChange={(e) => setTeacherNameInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#020617] border border-slate-700 text-white text-sm font-bold focus:outline-none focus:border-[#F59E0B]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="teacher-password"
                      className="block text-xs font-bold text-[#CBD5E1] mb-1"
                    >
                      Mật Khẩu Quản Trị Giáo Viên
                    </label>
                    <input
                      id="teacher-password"
                      type="password"
                      required
                      autoComplete="off"
                      placeholder="Nhập mật khẩu bảo mật Giáo Viên..."
                      value={teacherPassInput}
                      onChange={(e) => setTeacherPassInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#020617] border border-slate-700 text-white text-sm font-mono-num focus:outline-none focus:border-[#F59E0B]"
                    />
                  </div>

                  {loginError && (
                    <div className="p-2.5 rounded-xl bg-red-950/90 border border-red-400 text-xs text-red-100 font-semibold">
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:brightness-110 text-[#0F172A] font-black text-sm sm:text-base shadow-xl cursor-pointer"
                  >
                    🎓 ĐĂNG NHẬP HỆ THỐNG GIÁO VIÊN
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Single Flat Control Hint Line */}
        <div className="relative z-10 text-center text-xs font-mono-num text-[#94A3B8]">
          WASD / Mũi Tên: Lái & Drift · Shift: Đốt Bình Nitro · Space: Dùng Vật Phẩm · Phím R: Giải Cứu Xe Kẹt
        </div>

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
  const currentChassisPart =
    ALL_PARTS.find((p) => p.id === activeProfile.loadout.chassis) ||
    ALL_PARTS[0];
  const activeCarClass = calculateCarClass(activeProfile.loadout);
  const activeCarClassStyle = TIER_COLORS[activeCarClass.tier];

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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090D16] text-white select-none">
      {/* Center Interactive Test Drive Showroom Canvas (WASD live driving!) */}
      <ShowroomCanvas
        loadout={activeProfile.loadout}
        username={activeProfile.username}
        active={dockTab === 'home'}
        isNightMode={showroomNightMode}
      />

      {/* Full-Viewport Asphalt Syndicate HUD Overlay Frame */}
      <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-3.5 md:p-5">
        {/* If Teacher is in Section 3 (Menu Xe & Shop): Show the 3-Section Teacher Navigation Bar at top */}
        {isTeacher && (
          <div className="pointer-events-auto mb-2">
            <TeacherNavHeader
              activeTab="menu"
              teacherProfile={teacherProfile}
              fbConnected={fbConnected}
              onSelectTab={handleSelectTeacherTab}
              onOpenFirebaseModal={() => setShowFirebaseModal(true)}
              onLogout={handleLogoutTeacher}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* TOP ASPHALT TELEMETRY HEADER BAR                                  */}
        {/* ================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* TOP-LEFT: Ultra-Minimalist Racer Pod (Click to open Profile & Rename) */}
          <div
            data-testid="open-profile-rename-btn"
            onClick={handleOpenProfileModal}
            title="Nhấn để xem Hồ Sơ Tay Đua & Đổi Tên"
            className="pointer-events-auto group cursor-pointer rounded-full bg-[#0F172A]/90 hover:bg-[#1E293B]/95 pl-1.5 pr-3.5 py-1 shadow-lg border border-slate-700/80 hover:border-[#F59E0B]/80 transition-all flex items-center gap-2"
          >
            <RankAvatarFrame
              username={activeProfile.username}
              rp={activeProfile.rp}
              size="sm"
              isTeacher={isTeacher}
            />

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-white tracking-wide leading-none group-hover:text-[#FEF08A] transition-colors">
                  {activeProfile.username}
                </span>
              </div>

              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRankGuideModal(true);
                }}
                title="Xem 7 Bậc Rank"
                className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold hover:opacity-90 leading-none"
              >
                <RankCrest tierId={activeRank.id} size={14} />
                <span style={{ color: activeRank.color }} className="font-extrabold">
                  {activeRank.name.split(' ')[0]}
                </span>
                <span className="text-slate-500">·</span>
                <span className="font-mono-num text-[#4ADE80] font-bold">
                  {activeProfile.rp} RP
                </span>
              </div>
            </div>
          </div>

          {/* TOP-RIGHT: Compact Coin Badge + Icon-Only Action Buttons (Day/Night, Giftcode, Sound, DB, Logout) */}
          <div className="pointer-events-auto relative flex flex-col items-end">
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Compact Coin Counter (Icon only, no 'Xu' text) */}
              <div className="h-10 flex items-center gap-1.5 px-3.5 rounded-xl bg-[#0F172A]/95 border-2 border-[#F59E0B] shadow-xl">
                <span className="text-base leading-none">🪙</span>
                <div className="font-mono-num text-xs sm:text-sm font-black text-[#FEF08A] leading-none">
                  {activeProfile.coins.toLocaleString()}
                </div>
                {isTeacher && (
                  <button
                    type="button"
                    onClick={() => {
                      dualDB.addTeacherCoins(1000);
                      soundEngine.playCoin();
                    }}
                    title="Cộng +1,000 (Quyền Giáo Viên)"
                    className="ml-1 px-2 py-1 rounded-lg bg-[#22C55E] hover:bg-[#4ADE80] text-[#0F172A] font-mono-num text-[11px] font-black cursor-pointer"
                  >
                    +1K
                  </button>
                )}
              </div>

              {/* Day / Night Showroom Toggle Icon Button */}
              <button
                type="button"
                data-testid="toggle-showroom-time-btn"
                onClick={() => {
                  setShowroomNightMode((v) => !v);
                  soundEngine.playCoin();
                }}
                aria-label={
                  showroomNightMode
                    ? 'Đang ở Ban Đêm (Đèn pha BẬT) — Nhấn để chuyển sang Ban Ngày'
                    : 'Đang ở Ban Ngày (Đèn pha TẮT) — Nhấn để chuyển sang Ban Đêm'
                }
                title={
                  showroomNightMode
                    ? 'Ban Đêm (Đèn pha BẬT) — Đổi sang Ban Ngày'
                    : 'Ban Ngày (Đèn pha TẮT) — Đổi sang Ban Đêm'
                }
                className={`w-10 h-10 p-0 leading-none rounded-xl bg-[#0F172A]/95 hover:bg-[#1E293B] border-2 inline-flex items-center justify-center shadow-lg cursor-pointer transition-colors shrink-0 ${
                  showroomNightMode
                    ? 'border-[#F59E0B] text-[#FEF08A]'
                    : 'border-amber-400/80 text-amber-300'
                }`}
              >
                {showroomNightMode ? (
                  <Moon className="w-5 h-5 stroke-[2.25] block shrink-0" />
                ) : (
                  <Sun className="w-5 h-5 stroke-[2.25] block shrink-0" />
                )}
              </button>

              {/* Giftcode Gift Box Icon Button */}
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
                  className={`w-10 h-10 p-0 leading-none rounded-xl bg-[#0F172A]/95 hover:bg-[#1E293B] border-2 inline-flex items-center justify-center shadow-lg cursor-pointer transition-colors shrink-0 ${
                    showGiftcodeDropdown
                      ? 'border-[#FEF08A] text-[#FEF08A] bg-[#1E293B]'
                      : 'border-[#38BDF8] text-[#38BDF8]'
                  }`}
                >
                  <Gift className="w-5 h-5 stroke-[2.25] block shrink-0" />
                </button>
              )}

              {/* Sound Mute / Unmute Icon Button */}
              <button
                type="button"
                onClick={() => setSoundMuted(soundEngine.toggleMute())}
                aria-label={soundMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                title={soundMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                className={`w-10 h-10 p-0 leading-none rounded-xl bg-[#0F172A]/95 hover:bg-[#1E293B] border inline-flex items-center justify-center shadow-lg cursor-pointer transition-colors shrink-0 ${
                  soundMuted
                    ? 'border-red-500/60 text-red-300'
                    : 'border-slate-600 text-white'
                }`}
              >
                {soundMuted ? (
                  <VolumeX className="w-5 h-5 stroke-[2.25] block shrink-0" />
                ) : (
                  <Volume2 className="w-5 h-5 stroke-[2.25] block shrink-0" />
                )}
              </button>

              {!isTeacher && (
                <>
                  {/* Dual-DB / Cloud Connection Icon Button */}
                  <button
                    type="button"
                    onClick={() => setShowFirebaseModal(true)}
                    aria-label="Cấu hình cơ sở dữ liệu Dual-DB"
                    title={
                      fbConnected
                        ? 'Đã kết nối Firebase Cloud'
                        : 'Cấu hình Dual-DB'
                    }
                    className={`relative w-10 h-10 p-0 leading-none rounded-xl bg-[#0F172A]/95 hover:bg-[#1E293B] border inline-flex items-center justify-center shadow-lg cursor-pointer transition-colors shrink-0 ${
                      fbConnected
                        ? 'border-emerald-500/70 text-emerald-400'
                        : 'border-slate-700 text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    <Database className="w-5 h-5 stroke-[2.25] block shrink-0" />
                    {fbConnected && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </button>

                  {/* Switch Account / Logout Icon Button */}
                  <button
                    type="button"
                    onClick={() => setScreen('login')}
                    aria-label="Đổi tài khoản"
                    title="Đăng xuất"
                    className="w-10 h-10 p-0 leading-none rounded-xl bg-[#0F172A]/95 hover:bg-red-950/80 border border-slate-700 hover:border-red-500/60 text-[#CBD5E1] hover:text-red-200 inline-flex items-center justify-center shadow-lg cursor-pointer transition-colors shrink-0"
                  >
                    <LogOut className="w-5 h-5 stroke-[2.25] block shrink-0" />
                  </button>
                </>
              )}
            </div>

            {/* Floating Dropdown Giftcode Popover (Absolute — never pushes layout down) */}
            {!isTeacher && showGiftcodeDropdown && (
              <div className="absolute top-full right-0 mt-2 z-50 w-76 p-3.5 rounded-2xl bg-[#0F172A]/98 border-2 border-[#38BDF8] shadow-[0_16px_40px_rgba(0,0,0,0.85)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-white">
                    🎁 Giftcode
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGiftcodeDropdown(false)}
                    aria-label="Đóng hộp Giftcode"
                    title="Đóng"
                    className="w-6 h-6 p-0 leading-none rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1] hover:text-white inline-flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5] block shrink-0" />
                  </button>
                </div>
                <form onSubmit={handleRedeemGiftcode} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="VD: TRIPLED2026"
                    value={giftcodeInput}
                    onChange={(e) =>
                      setGiftcodeInput(e.target.value.toUpperCase())
                    }
                    className="flex-1 px-3 py-2 rounded-lg bg-[#020617] border border-slate-700 font-mono-num text-xs text-white uppercase"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-lg bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0F172A] font-extrabold text-xs cursor-pointer"
                  >
                    Nhận
                  </button>
                </form>
                <div className="text-[11px] text-[#94A3B8]">
                  Mã:{' '}
                  <span className="font-mono-num text-[#FDE047] font-bold">
                    TRIPLED2026
                  </span>
                  ,{' '}
                  <span className="font-mono-num text-[#FDE047] font-bold">
                    BIO100
                  </span>
                </div>
                {giftcodeFeedback && (
                  <div
                    className={`p-2 rounded-lg text-xs font-bold ${
                      giftcodeFeedback.ok
                        ? 'bg-[#020617] text-[#4ADE80]'
                        : 'bg-red-950 text-red-200'
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
        {/* CENTER OVERLAY PANELS FOR LEADERBOARD OR MATCH HISTORY TABS       */}
        {/* ================================================================= */}
        {dockTab === 'leaderboard' && (
          <div className="pointer-events-auto self-center w-full max-w-4xl max-h-[64vh] flex flex-col rounded-2xl bg-[#0F172A]/95 border-2 border-[#F59E0B] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-[#1E293B] to-[#0F172A] border-b border-slate-700">
              <h2 className="text-lg font-extrabold text-white">
                🏆 BẢNG XẾP HẠNG RANK
              </h2>
              <button
                type="button"
                onClick={() => setDockTab('home')}
                aria-label="Đóng Bảng Xếp Hạng"
                title="Đóng"
                className="w-9 h-9 p-0 leading-none rounded-xl bg-[#020617] hover:bg-[#1E293B] text-white border border-slate-700 cursor-pointer inline-flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.75] block shrink-0" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-[#94A3B8]">
                    <th className="py-2.5 px-3">Hạng</th>
                    <th className="py-2.5 px-3">Tay Đua</th>
                    <th className="py-2.5 px-3">Bậc Rank</th>
                    <th className="py-2.5 px-3">Điểm RP</th>
                    <th className="py-2.5 px-3">Trận / Top 1</th>
                    <th className="py-2.5 px-3 text-right">Sở Hữu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {students.map((st, idx) => {
                    const rnk = getRankByRP(st.rp);
                    const isMe = !isTeacher && st.id === activeProfile.id;
                    return (
                      <tr
                        key={st.id}
                        className={
                          isMe
                            ? 'bg-[#1E293B] font-bold'
                            : 'hover:bg-[#1E293B]/50'
                        }
                      >
                        <td className="py-2.5 px-3 font-mono-num font-black text-[#F59E0B]">
                          #{idx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-white">
                          <div className="flex items-center gap-2.5">
                            <RankAvatarFrame
                              username={st.username}
                              rp={st.rp}
                              size="sm"
                            />
                            <span>
                              {st.username} {isMe && '(Bạn)'}
                            </span>
                          </div>
                        </td>
                        <td
                          className="py-2.5 px-3 text-xs font-bold"
                          style={{ color: rnk.color }}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            <RankCrest tierId={rnk.id} size={26} />
                            <span>{rnk.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono-num text-[#4ADE80] font-bold">
                          {st.rp} RP
                        </td>
                        <td className="py-2.5 px-3 font-mono-num text-xs text-[#CBD5E1]">
                          {st.totalMatches} · {st.top1Count} Top 1
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-num text-xs text-[#FDE047]">
                          {st.ownedParts.length} món
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {dockTab === 'history' && (
          <div className="pointer-events-auto self-center w-full max-w-4xl max-h-[64vh] flex flex-col rounded-2xl bg-[#0F172A]/95 border-2 border-[#38BDF8] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-[#1E293B] to-[#0F172A] border-b border-slate-700">
              <h2 className="text-lg font-extrabold text-white">
                📜 LỊCH SỬ ({activeProfile.username})
              </h2>
              <button
                type="button"
                onClick={() => setDockTab('home')}
                aria-label="Đóng Lịch Sử Thi Đấu"
                title="Đóng"
                className="w-9 h-9 p-0 leading-none rounded-xl bg-[#020617] hover:bg-[#1E293B] text-white border border-slate-700 cursor-pointer inline-flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.75] block shrink-0" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              {(activeProfile.matchHistory || []).length === 0 ? (
                <div className="text-center py-12 text-sm text-[#94A3B8]">
                  Chưa có chặng đua nào.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeProfile.matchHistory.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl bg-[#1E293B]/80 border border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-mono-num font-black text-base text-[#F59E0B] mr-3">
                          Hạng #{m.placement}/{m.totalRacers}
                        </span>
                        <span className="font-bold text-white">
                          {m.mapName}
                        </span>
                        <span className="text-[#94A3B8] ml-2">
                          ({m.mode === 'team' ? 'Đồng Đội' : 'Cá Nhân'})
                        </span>
                      </div>
                      <div className="flex items-center gap-4 font-mono-num">
                        <span
                          className={
                            m.rpDelta > 0
                              ? 'text-[#4ADE80] font-bold'
                              : m.rpDelta < 0
                              ? 'text-red-400 font-bold'
                              : 'text-[#94A3B8]'
                          }
                        >
                          {m.rpDelta > 0
                            ? `+${m.rpDelta} RP`
                            : m.rpDelta < 0
                            ? `${m.rpDelta} RP`
                            : '0 RP'}
                        </span>
                        <span className="text-[#F59E0B] font-bold">
                          +{m.coinsEarned} Xu
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ASPHALT LEFT & RIGHT HUD SHOWCASE PANELS (When dockTab === 'home')*/}
        {/* ================================================================= */}
        {dockTab === 'home' && (
          <div className="hidden md:flex items-center justify-between gap-4 my-auto">
            {/* LEFT ASPHALT TELEMETRY & SKIN BANNER POD */}
            <div className="pointer-events-auto w-60 space-y-3">
              {/* Machine Performance Card (Car Class from average of 7 parts) */}
              <div className="rounded-2xl bg-[#0F172A]/90 border-l-4 border-l-[#38BDF8] border border-slate-700/80 p-3 shadow-2xl space-y-2">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-black text-white truncate">
                    {currentChassisPart.name}
                  </span>
                  <span
                    data-testid="car-class-badge"
                    style={{
                      backgroundColor: activeCarClassStyle.bg,
                      color: activeCarClassStyle.text,
                    }}
                    title={`TB 7 Món: ${activeCarClass.averageScore.toFixed(1)}/7.0`}
                    className="px-2 py-0.5 rounded text-[10px] font-black shrink-0"
                  >
                    CLASS {activeCarClass.tier}
                  </span>
                </div>

                {/* 4 Asphalt Telemetry Stat Bars */}
                <div className="space-y-1.5 text-[10px] font-mono-num">
                  {[
                    { label: 'TOP SPEED', val: '335 KM/H', pct: '88%', col: 'bg-[#38BDF8]' },
                    { label: 'ACCELERATION', val: '84.5', pct: '84%', col: 'bg-[#4ADE80]' },
                    { label: 'HANDLING', val: '91.0', pct: '91%', col: 'bg-[#F59E0B]' },
                    { label: 'NITRO PULSE', val: '100%', pct: '95%', col: 'bg-[#EC4899]' },
                  ].map((st) => (
                    <div key={st.label}>
                      <div className="flex justify-between text-[#94A3B8] font-bold">
                        <span>{st.label}</span>
                        <span className="text-white">{st.val}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden mt-0.5">
                        <div
                          style={{ width: st.pct }}
                          className={`h-full ${st.col}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playCoin();
                    setDockTab('garage');
                  }}
                  className="w-full py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#38BDF8]/60 text-[#38BDF8] font-black text-xs cursor-pointer transition-colors"
                >
                  🛠️ XƯỞNG ĐỘ XE
                </button>
              </div>

              {/* Skin Syndicate Gacha Banner Card */}
              <div
                onClick={() => {
                  soundEngine.playCoin();
                  setDockTab('gacha');
                }}
                className="rounded-2xl bg-gradient-to-b from-[#311042]/95 via-[#0F172A]/95 to-[#090D16]/95 border-2 border-[#EC4899] p-3 shadow-2xl cursor-pointer hover:scale-[1.03] transition-transform space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#EC4899] text-white text-[10px] font-black">
                    🎰 VÒNG QUAY SKIN
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#F59E0B] text-[#0F172A] text-[10px] font-black">
                    S+ / SS / S
                  </span>
                </div>
                <PartThumbnail
                  item={
                    ALL_PARTS.find((p) => p.id === 'chassis_t1') || ALL_PARTS[4]
                  }
                  width={210}
                  height={80}
                  className="mx-auto border border-[#F59E0B]/50"
                />
                <div className="py-1.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] text-white font-black text-xs text-center">
                  ✨ Mở Vòng Quay
                </div>
              </div>
            </div>

            {/* RIGHT ASPHALT GRAND PRIX RANKED TOURNAMENT CARD */}
            <div
              onClick={() => {
                soundEngine.playFanfare(false);
                dualDB.updateLobby({
                  playModeCategory: 'teacher_cup',
                  botCount: 0,
                });
                setScreen('lobby');
              }}
              className="pointer-events-auto w-60 rounded-2xl bg-gradient-to-b from-[#450A0A]/95 via-[#0F172A]/95 to-[#090D16]/95 border-2 border-[#F59E0B] p-3 shadow-2xl cursor-pointer hover:scale-[1.03] transition-transform space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#F59E0B] text-[#0F172A] text-[10px] font-black">
                  🏆 GIẢI ĐẤU GV
                </span>
                <span className="text-[#4ADE80] text-[10px] font-extrabold">
                  +{lobby.teacherRewards?.top1Coins || 100} Xu · +RP
                </span>
              </div>
              <PartThumbnail
                item={
                  ALL_PARTS.find((p) => p.id === 'paint_gold24k') ||
                  ALL_PARTS[11]
                }
                width={210}
                height={84}
                className="mx-auto border border-[#F59E0B]/60"
              />
              <div className="py-2 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#0F172A] font-black text-xs text-center shadow-lg">
                🏁 {isTeacher ? 'MỞ GIẢI ĐẤU' : 'VÀO GIẢI ĐẤU'}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* BOTTOM BAR: BOTTOM-LEFT ICON DOCK & BOTTOM-RIGHT RACE BUTTONS     */}
        {/* ================================================================= */}
        <div className="flex flex-wrap items-end justify-between gap-3 mt-auto">
          {/* Bottom-Left: Compact Icon Dock (Sảnh Xe, Xưởng Độ Xe, Vòng Quay Skin, Bảng Rank, Lịch Sử) */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-[#0F172A]/95 border border-slate-700/90 rounded-2xl p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.85)]">
            {(
              [
                { id: 'home', label: 'Sảnh Xe', Icon: Car },
                { id: 'garage', label: 'Xưởng Độ Xe', Icon: Wrench },
                { id: 'gacha', label: 'Vòng Quay Skin', Icon: Sparkles },
                { id: 'leaderboard', label: 'Bảng Rank', Icon: Trophy },
                { id: 'history', label: 'Lịch Sử', Icon: History },
              ] as const
            ).map(({ id, label, Icon }) => {
              const active = dockTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`dock-btn-${id}`}
                  aria-label={label}
                  title={label}
                  onClick={() => {
                    setDockTab(id);
                    soundEngine.playCoin();
                  }}
                  className={`w-11 h-11 p-0 leading-none rounded-xl inline-flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    active
                      ? 'bg-gradient-to-br from-[#E11D48] to-[#BE123C] text-white border border-rose-300 shadow-[0_0_16px_rgba(225,29,72,0.55)] scale-105'
                      : 'bg-[#1E293B]/85 text-[#CBD5E1] hover:text-white hover:bg-[#334155] border border-slate-700/70'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2.25] block shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Bottom-Right: 3 Streamlined Asphalt-Style Race Launch Buttons */}
          <div className="pointer-events-auto flex items-center gap-2 flex-wrap bg-[#0F172A]/95 border border-slate-700/90 rounded-2xl p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.85)]">
            {/* Mode 1: Career AI Practice */}
            <button
              type="button"
              data-start="true"
              onClick={() => {
                soundEngine.playCoin();
                dualDB.updateLobby({
                  playModeCategory: 'practice_ai',
                  hostMode: isTeacher ? 'play' : lobby.hostMode,
                  botCount: lobby.botCount === 0 ? 15 : lobby.botCount,
                });
                setScreen('lobby');
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#0F172A] hover:brightness-125 text-[#4ADE80] border-2 border-[#4ADE80] shadow-lg transition-transform active:scale-95 text-xs font-black cursor-pointer"
            >
              🤖 ĐUA VỚI MÁY
            </button>

            {/* Mode 2: Club Friends PvP */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playCoin();
                dualDB.updateLobby({
                  playModeCategory: 'friends_pvp',
                  hostMode: isTeacher ? 'play' : lobby.hostMode,
                  botCount: 0,
                });
                setScreen('lobby');
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0C4A6E] to-[#0F172A] hover:brightness-125 text-[#38BDF8] border-2 border-[#38BDF8] shadow-lg transition-transform active:scale-95 text-xs font-black cursor-pointer"
            >
              👥 ĐUA BẠN BÈ
            </button>

            {/* Mode 3: Official Teacher Grand Prix */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playFanfare(false);
                dualDB.updateLobby({
                  playModeCategory: 'teacher_cup',
                  botCount: 0,
                });
                setScreen('lobby');
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#E11D48] to-[#D97706] hover:brightness-110 text-[#FEF08A] border-2 border-[#FEF08A] shadow-[0_0_22px_rgba(245,158,11,0.5)] transition-transform active:scale-95 text-xs sm:text-sm font-black uppercase tracking-wide cursor-pointer"
            >
              🏆 {isTeacher ? 'TẠO GIẢI ĐẤU' : 'GIẢI ĐẤU GIÁO VIÊN'}
            </button>
          </div>
        </div>
      </div>

      {/* Modals for Garage, Gacha, 7-Rank Guide, and Firebase Config */}
      {dockTab === 'garage' && (
        <GarageModal
          student={activeProfile}
          isTeacher={isTeacher}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0F172A] border-2 border-[#F59E0B] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-lg font-extrabold text-white">
                🏅 7 Bậc Rank
              </h3>
              <button
                type="button"
                onClick={() => setShowRankGuideModal(false)}
                aria-label="Đóng Bảng 7 Bậc Rank"
                title="Đóng"
                className="w-9 h-9 p-0 leading-none rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white border border-slate-600 cursor-pointer inline-flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.75] block shrink-0" />
              </button>
            </div>
            <div className="space-y-2 text-xs max-h-[50vh] overflow-y-auto pr-1">
              {RANK_TIERS.map((rt, i) => (
                <div
                  key={rt.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#1E293B] border border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <RankCrest tierId={rt.id} size={36} />
                    <span style={{ color: rt.color }} className="font-extrabold text-sm">
                      {i + 1}. {rt.name}
                    </span>
                  </div>
                  <span className="font-mono-num text-white font-semibold">
                    {rt.maxRP ? `${rt.minRP} – ${rt.maxRP} RP` : `${rt.minRP}+ RP`}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl bg-[#1E293B] border border-[#F59E0B]/60 text-xs text-[#E2E8F0]">
              Top 1: +30 RP · Top 2–3: +20 RP · Top 4–10: +10 RP (Chỉ tính trong Giải Đấu Giáo Viên).
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div
          data-testid="profile-rename-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#0F172A] border-2 border-[#F59E0B] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-lg font-extrabold text-white">
                👤 Hồ Sơ & Đổi Tên
              </h3>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                aria-label="Đóng Hồ Sơ Tay Đua"
                title="Đóng"
                className="w-9 h-9 p-0 leading-none rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white border border-slate-600 cursor-pointer inline-flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.75] block shrink-0" />
              </button>
            </div>

            {/* Profile Identity Summary */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#1E293B]/90 border border-slate-700">
              <RankAvatarFrame
                username={activeProfile.username}
                rp={activeProfile.rp}
                size="lg"
                isTeacher={isTeacher}
              />
              <div className="space-y-1 flex-1 min-w-0">
                <div className="text-base font-black text-white truncate">
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
                    className="px-2 py-0.5 rounded text-[10px] font-black"
                  >
                    CLASS {activeCarClass.tier}
                  </span>
                  <span className="font-mono-num text-xs font-black text-[#FEF08A]">
                    🪙 {activeProfile.coins.toLocaleString()} Xu
                  </span>
                  <span className="font-mono-num text-xs font-bold text-[#94A3B8]">
                    · {activeProfile.totalMatches} Trận ({activeProfile.top1Count} Top 1)
                  </span>
                </div>
              </div>
            </div>

            {/* Rename Form (50 Coins) */}
            <form onSubmit={handleSubmitRename} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="profile-rename-input"
                    className="text-xs font-bold text-[#FEF08A]"
                  >
                    ✏️ Đổi Tên Hiển Thị:
                  </label>
                  <span className="font-mono-num text-xs font-black text-[#F59E0B]">
                    {RENAME_COST_COINS} Xu
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#020617] border border-slate-600 focus:border-[#F59E0B] text-white text-sm font-bold focus:outline-none"
                />
              </div>

              {renameFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold border ${
                    renameFeedback.ok
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                      : 'bg-red-950/90 border-red-400 text-red-200'
                  }`}
                >
                  {renameFeedback.text}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:brightness-110 text-[#0F172A] font-black text-sm shadow-xl cursor-pointer"
              >
                ✏️ Xác Nhận Đổi Tên (-{RENAME_COST_COINS} Xu)
              </button>
            </form>
          </div>
        </div>
      )}

      {showFirebaseModal && (
        <FirebaseModal onClose={() => setShowFirebaseModal(false)} />
      )}
    </div>
  );
}


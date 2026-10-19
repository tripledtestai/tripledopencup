import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  ALL_PARTS,
  BOT_NAMES,
  DEFAULT_LOADOUT,
  MAPS,
} from '../game/constants';
import {
  balanceTeamsByRP,
  calculateCoinReward,
  DIFFICULTY_COIN_MULTIPLIERS,
  getLapCoinMultiplier,
  getRankByRP,
  isNightMapTheme,
} from '../game/rules';
import {
  BotDifficulty,
  CarLoadout,
  LobbyConfig,
  PlayModeCategory,
  StudentAccount,
  TournamentRewardConfig,
} from '../game/types';
import { dualDB } from '../services/database';
import { soundEngine } from '../services/sound';
import { RankAvatarFrame, RankCrest } from './RankBadge';
import { TeacherNavHeader, TeacherWorkspaceTab } from './TeacherNavHeader';
import { WarmupCanvas } from './WarmupCanvas';

interface LobbyViewProps {
  lobby: LobbyConfig;
  currentStudent: StudentAccount | null;
  teacherProfile: StudentAccount;
  isTeacher: boolean;
  fbConnected: boolean;
  allStudents: StudentAccount[];
  onStartRace: (finalLobby: LobbyConfig) => void;
  onBackToMenu: () => void;
  onSelectTeacherTab?: (tab: TeacherWorkspaceTab) => void;
  onOpenFirebaseModal?: () => void;
  onLogout?: () => void;
}

const DEFAULT_TEACHER_REWARDS: TournamentRewardConfig = {
  top1Coins: 100,
  top2Coins: 70,
  top3Coins: 50,
  top10Coins: 30,
  finishCoins: 15,
  teamWinBonusCoins: 30,
};

const BOT_DIFFICULTY_OPTIONS: {
  id: BotDifficulty;
  label: string;
  badge: string;
  desc: string;
}[] = [
  {
    id: 'easy',
    label: '🟢 Dễ',
    badge: 'x0.75 Xu',
    desc: 'Tốc độ vừa phải',
  },
  {
    id: 'medium',
    label: '🟡 Vừa',
    badge: 'x1.0 Xu',
    desc: 'Cân bằng tiêu chuẩn',
  },
  {
    id: 'hard',
    label: '🟠 Khó',
    badge: 'x1.35 Xu',
    desc: 'Ôm cua gắt & đi tắt',
  },
  {
    id: 'nightmare',
    label: '🔴 Ác Mộng',
    badge: 'x1.8 Xu',
    desc: 'Đốt Nitro tối đa',
  },
];

function generateBotLoadout(seedIdx: number): CarLoadout {
  const pickSlot = (slot: keyof CarLoadout) => {
    const pool = ALL_PARTS.filter((p) => p.slot === slot);
    return pool[seedIdx % pool.length]?.id || DEFAULT_LOADOUT[slot];
  };
  return {
    chassis: pickSlot('chassis'),
    paint: pickSlot('paint'),
    decal: pickSlot('decal'),
    wheels: pickSlot('wheels'),
    spoiler: pickSlot('spoiler'),
    underglow: pickSlot('underglow'),
    trail: pickSlot('trail'),
  };
}

/**
 * Illustrated SVG Banner Artwork for each Play Mode Card
 */
const ModeBannerArt: React.FC<{ mode: PlayModeCategory; active: boolean }> = ({
  mode,
  active,
}) => {
  if (mode === 'practice_ai') {
    return (
      <svg
        viewBox="0 0 360 96"
        className="w-full h-24 rounded-xl overflow-hidden block border border-[#4ADE80]/40"
        role="img"
        aria-label="Banner Đua Với Máy AI"
      >
        <defs>
          <linearGradient id="bgAi" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0F291E" />
            <stop offset="55%" stopColor="#14532D" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>
        </defs>
        <rect width="360" height="96" fill="url(#bgAi)" />
        {/* Perspective Cyber Grid Lines */}
        <path
          d="M0 72 H360 M0 86 H360 M60 56 L10 96 M140 56 L110 96 M220 56 L250 96 M300 56 L350 96"
          stroke="rgba(74,222,128,0.22)"
          strokeWidth="1.5"
        />
        {/* Speed streaks */}
        <rect x="18" y="22" width="76" height="3" rx="1.5" fill="#4ADE80" opacity="0.5" />
        <rect x="42" y="38" width="52" height="2.5" rx="1.2" fill="#A7F3D0" opacity="0.4" />
        {/* AI Target HUD Ring */}
        <circle
          cx="288"
          cy="48"
          r="30"
          fill="rgba(16,185,129,0.15)"
          stroke="#4ADE80"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        <circle cx="288" cy="48" r="18" fill="none" stroke="#A7F3D0" strokeWidth="1.2" />
        {/* Top-down Racing Car Silhouette + AI Bot Drone */}
        <g transform="translate(155, 48)">
          {/* Nitro Flame */}
          <polygon points="-52,-6 -78,0 -52,6" fill="#38BDF8" />
          <polygon points="-48,-3 -66,0 -48,3" fill="#FEF08A" />
          {/* Wheels */}
          <rect x="-32" y="-22" width="16" height="6" rx="2" fill="#0F172A" />
          <rect x="14" y="-22" width="16" height="6" rx="2" fill="#0F172A" />
          <rect x="-32" y="16" width="16" height="6" rx="2" fill="#0F172A" />
          <rect x="14" y="16" width="16" height="6" rx="2" fill="#0F172A" />
          {/* Car Body */}
          <rect
            x="-42"
            y="-16"
            width="84"
            height="32"
            rx="10"
            fill="#22C55E"
            stroke="#FEF08A"
            strokeWidth="2"
          />
          <rect x="-12" y="-10" width="28" height="20" rx="5" fill="#0F172A" />
          <path d="M-36 -12 V12" stroke="#FEF08A" strokeWidth="3" />
        </g>
        {/* AI Bot Icon in HUD Ring */}
        <rect
          x="274"
          y="36"
          width="28"
          height="24"
          rx="6"
          fill="#0F172A"
          stroke="#4ADE80"
          strokeWidth="2"
        />
        <circle cx="283" cy="48" r="3" fill="#4ADE80" />
        <circle cx="293" cy="48" r="3" fill="#4ADE80" />
        {active && (
          <rect
            x="2"
            y="2"
            width="356"
            height="92"
            rx="10"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="3"
          />
        )}
      </svg>
    );
  }

  if (mode === 'friends_pvp') {
    return (
      <svg
        viewBox="0 0 360 96"
        className="w-full h-24 rounded-xl overflow-hidden block border border-[#38BDF8]/40"
        role="img"
        aria-label="Banner Đua Cùng Bạn Bè"
      >
        <defs>
          <linearGradient id="bgPvp" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="50%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#0369A1" />
          </linearGradient>
        </defs>
        <rect width="360" height="96" fill="url(#bgPvp)" />
        {/* Diagonal Duel Split */}
        <polygon points="165,0 205,0 175,96 135,96" fill="rgba(56,189,248,0.18)" />
        {/* Left Car (Cyan Player) */}
        <g transform="translate(95, 34) rotate(6)">
          <polygon points="-38,-5 -58,0 -38,5" fill="#F59E0B" />
          <rect
            x="-34"
            y="-13"
            width="68"
            height="26"
            rx="8"
            fill="#38BDF8"
            stroke="#E0F2FE"
            strokeWidth="2"
          />
          <rect x="-8" y="-8" width="22" height="16" rx="4" fill="#0F172A" />
        </g>
        {/* Right Car (Gold Friend) */}
        <g transform="translate(248, 62) rotate(-6)">
          <polygon points="-38,-5 -58,0 -38,5" fill="#38BDF8" />
          <rect
            x="-34"
            y="-13"
            width="68"
            height="26"
            rx="8"
            fill="#F59E0B"
            stroke="#FEF08A"
            strokeWidth="2"
          />
          <rect x="-8" y="-8" width="22" height="16" rx="4" fill="#0F172A" />
        </g>
        {/* Center VS Medallion */}
        <circle
          cx="172"
          cy="48"
          r="20"
          fill="#0F172A"
          stroke="#38BDF8"
          strokeWidth="2.5"
        />
        <text
          x="172"
          y="53"
          textAnchor="middle"
          fill="#FEF08A"
          fontSize="13"
          fontWeight="900"
        >
          VS
        </text>
        {active && (
          <rect
            x="2"
            y="2"
            width="356"
            height="92"
            rx="10"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="3"
          />
        )}
      </svg>
    );
  }

  // teacher_cup
  return (
    <svg
      viewBox="0 0 360 96"
      className="w-full h-24 rounded-xl overflow-hidden block border border-[#F59E0B]/60"
      role="img"
      aria-label="Banner Giải Đấu Giáo Viên Host"
    >
      <defs>
        <linearGradient id="bgCup" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#451A03" />
          <stop offset="50%" stopColor="#78350F" />
          <stop offset="100%" stopColor="#1E261D" />
        </linearGradient>
      </defs>
      <rect width="360" height="96" fill="url(#bgCup)" />
      {/* Golden Stadium Sunburst Rays */}
      <polygon points="180,48 90,0 130,0" fill="rgba(254,240,138,0.12)" />
      <polygon points="180,48 230,0 270,0" fill="rgba(254,240,138,0.12)" />
      <polygon points="180,48 20,96 70,96" fill="rgba(254,240,138,0.10)" />
      <polygon points="180,48 290,96 340,96" fill="rgba(254,240,138,0.10)" />
      {/* Left & Right Speed Wings */}
      <path
        d="M36 34 H122 L110 44 H52 Z M54 52 H118 L108 60 H70 Z"
        fill="#F59E0B"
        opacity="0.75"
      />
      <path
        d="M324 34 H238 L250 44 H308 Z M306 52 H242 L252 60 H290 Z"
        fill="#F59E0B"
        opacity="0.75"
      />
      {/* Center Championship Trophy Medallion */}
      <circle
        cx="180"
        cy="48"
        r="30"
        fill="#1E261D"
        stroke="#FEF08A"
        strokeWidth="2.5"
      />
      {/* Trophy Cup Silhouette */}
      <path
        d="M168 32 H192 V44 C192 52 186 56 180 56 C174 56 168 52 168 44 Z"
        fill="#F59E0B"
        stroke="#FEF08A"
        strokeWidth="1.5"
      />
      <rect x="176" y="56" width="8" height="7" fill="#FEF08A" />
      <rect x="170" y="63" width="20" height="4" rx="2" fill="#F59E0B" />
      {active && (
        <rect
          x="2"
          y="2"
          width="356"
          height="92"
          rx="10"
          fill="none"
          stroke="#FEF08A"
          strokeWidth="3"
        />
      )}
    </svg>
  );
};

export const LobbyView: React.FC<LobbyViewProps> = ({
  lobby,
  currentStudent,
  teacherProfile,
  isTeacher,
  fbConnected,
  allStudents,
  onStartRace,
  onBackToMenu,
  onSelectTeacherTab,
  onOpenFirebaseModal,
  onLogout,
}) => {
  const activeMode: PlayModeCategory =
    lobby.playModeCategory || (isTeacher ? 'teacher_cup' : 'practice_ai');
  const teacherRewards: TournamentRewardConfig =
    lobby.teacherRewards || DEFAULT_TEACHER_REWARDS;
  const botDifficulty: BotDifficulty = lobby.botDifficulty || 'medium';

  // Student Join Teacher Room Code state (Requirement #1: Student must enter Teacher room code)
  const [teacherPinInput, setTeacherPinInput] = useState('');
  const [joinedTeacherPin, setJoinedTeacherPin] = useState<string | null>(null);
  const [teacherPinError, setTeacherPinError] = useState<string | null>(null);

  // Student Friends Room Create / Join state (Requirement #2)
  const [friendSubTab, setFriendSubTab] = useState<'create' | 'join'>('create');
  const [friendPinInput, setFriendPinInput] = useState('');
  const [joinedFriendPin, setJoinedFriendPin] = useState<string | null>(null);
  const [friendRoomFeedback, setFriendRoomFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const isStudentJoinedTeacherRoom =
    isTeacher || joinedTeacherPin === lobby.roomPin;

  const buildActiveRoster = (
    botCountOverride?: number,
    hostModeOverride?: 'spectator' | 'play',
    teamCountOverride?: 2 | 3 | 4,
    modeOverride?: PlayModeCategory
  ) => {
    const mCat = modeOverride !== undefined ? modeOverride : activeMode;
    const defaultBots =
      mCat === 'teacher_cup' ? 0 : mCat === 'friends_pvp' ? 0 : 15;
    const bCount =
      botCountOverride !== undefined
        ? botCountOverride
        : lobby.botCount !== undefined
        ? lobby.botCount
        : defaultBots;
    const hMode =
      hostModeOverride !== undefined ? hostModeOverride : lobby.hostMode;
    const tCount =
      teamCountOverride !== undefined ? teamCountOverride : lobby.teamCount;

    const list: LobbyConfig['participants'] = [];

    if (currentStudent && !isTeacher) {
      list.push({
        id: currentStudent.id,
        username: currentStudent.username,
        rp: currentStudent.rp,
        teamId: 1,
        loadout: currentStudent.loadout,
        isBot: false,
      });
    }

    // Teacher participates as racer in Practice AI & Friends PvP, or when hostMode === 'play' in Teacher Cup
    if (isTeacher && (hMode === 'play' || mCat !== 'teacher_cup')) {
      list.push({
        id: 'teacher_host',
        username: teacherProfile.username || 'Thầy/Cô TripleD',
        rp: teacherProfile.rp || 750,
        teamId: 1,
        loadout: teacherProfile.loadout || DEFAULT_LOADOUT,
        isBot: false,
        isTeacher: true,
      });
    }

    // Include registered class students in 'friends_pvp' and 'teacher_cup' modes
    if (mCat !== 'practice_ai') {
      for (const s of allStudents) {
        if (list.some((p) => p.id === s.id)) continue;
        if (list.length >= 50) break;
        list.push({
          id: s.id,
          username: s.username,
          rp: s.rp,
          teamId: (list.length % tCount) + 1,
          loadout: s.loadout,
          isBot: true,
        });
      }
    }

    // Teacher-hosted tournaments NEVER have AI Bots; Friends mode can have 0 Bots!
    const effectiveBotCount = mCat === 'teacher_cup' ? 0 : Math.max(0, bCount);
    for (let i = 0; i < effectiveBotCount; i++) {
      if (list.length >= 50) break;
      const botName = BOT_NAMES[i % BOT_NAMES.length];
      list.push({
        id: `bot_${i + 1}`,
        username: `🤖 ${botName}`,
        rp: 60 + ((i * 37) % 620),
        teamId: (list.length % tCount) + 1,
        loadout: generateBotLoadout(i + 2),
        isBot: true,
      });
    }

    return list;
  };

  const activeParticipants = buildActiveRoster();

  const handleSelectModeCategory = (mode: PlayModeCategory) => {
    const nextBotCount =
      mode === 'teacher_cup'
        ? 0
        : mode === 'friends_pvp'
        ? lobby.botCount === 15
          ? 0
          : lobby.botCount
        : lobby.botCount === 0
        ? 15
        : lobby.botCount;
    const nextHostMode =
      isTeacher && mode !== 'teacher_cup' ? 'play' : lobby.hostMode;
    dualDB.updateLobby({
      playModeCategory: mode,
      hostMode: nextHostMode,
      botCount: nextBotCount,
      participants: buildActiveRoster(
        nextBotCount,
        nextHostMode,
        lobby.teamCount,
        mode
      ),
    });
    soundEngine.playCoin();
  };

  const handleUpdateTeacherReward = (
    key: keyof TournamentRewardConfig,
    val: number
  ) => {
    const next: TournamentRewardConfig = {
      ...teacherRewards,
      [key]: Math.max(0, Math.min(5000, Math.floor(val))),
    };
    dualDB.updateLobby({ teacherRewards: next });
  };

  const handleApplyRewardPreset = (multiplier: number) => {
    dualDB.updateLobby({
      teacherRewards: {
        top1Coins: 100 * multiplier,
        top2Coins: 70 * multiplier,
        top3Coins: 50 * multiplier,
        top10Coins: 30 * multiplier,
        finishCoins: 15 * multiplier,
        teamWinBonusCoins: 30 * multiplier,
      },
    });
    soundEngine.playCoin();
  };

  const handleRandomMap = () => {
    const otherMaps = MAPS.filter((m) => m.id !== lobby.mapId);
    const pick =
      otherMaps[Math.floor(Math.random() * otherMaps.length)] || MAPS[0];
    dualDB.updateLobby({ mapId: pick.id });
    soundEngine.playCoin();
  };

  const handleSetBots = (count: number) => {
    const nextRoster = buildActiveRoster(count);
    dualDB.updateLobby({
      botCount: count,
      participants: nextRoster,
    });
    soundEngine.playCoin();
  };

  const handleSetBotDifficulty = (diff: BotDifficulty) => {
    dualDB.updateLobby({ botDifficulty: diff });
    soundEngine.playCoin();
  };

  const handleAutoBalanceTeams = () => {
    const baseRoster = buildActiveRoster();
    const balanced = balanceTeamsByRP(baseRoster, lobby.teamCount);
    dualDB.updateLobby({ participants: balanced });
    soundEngine.playFanfare(false);
  };

  const handleSelectMyTeam = (teamId: number) => {
    const myId = isTeacher ? 'teacher_host' : currentStudent?.id;
    if (!myId) return;
    const baseRoster = buildActiveRoster();
    const updated = baseRoster.map((p) =>
      p.id === myId ? { ...p, teamId } : p
    );
    dualDB.updateLobby({ participants: updated });
    soundEngine.playCoin();
  };

  const handleStudentJoinTeacherRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherPinError(null);
    const cleaned = teacherPinInput.trim();
    if (cleaned !== lobby.roomPin) {
      setTeacherPinError(
        `Mã phòng "${cleaned || '...'}" không khớp với phòng Giải Đấu Giáo Viên đang mở!`
      );
      return;
    }
    setJoinedTeacherPin(cleaned);
    soundEngine.playFanfare(false);
  };

  const handleCreateNewFriendRoom = () => {
    const newPin = dualDB.generateNewFriendRoomPin(
      currentStudent?.username || 'Bạn Bè TripleD'
    );
    setJoinedFriendPin(newPin);
    setFriendRoomFeedback({
      ok: true,
      text: `Đã tạo phòng bạn bè mới thành công! Mã phòng của bạn là: ${newPin}`,
    });
    soundEngine.playFanfare(false);
  };

  const handleJoinFriendRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = friendPinInput.trim();
    const targetPin = lobby.friendRoomPin || '668899';
    if (cleaned.length < 4) {
      setFriendRoomFeedback({
        ok: false,
        text: 'Vui lòng nhập mã phòng bạn bè hợp lệ (6 chữ số)!',
      });
      return;
    }
    if (cleaned !== targetPin) {
      // Allow joining or syncing to the entered friend code
      dualDB.updateLobby({
        friendRoomPin: cleaned,
      });
    }
    setJoinedFriendPin(cleaned);
    setFriendRoomFeedback({
      ok: true,
      text: `Đã tham gia Phòng Bạn Bè #${cleaned} thành công! Sẵn sàng xuất phát!`,
    });
    soundEngine.playFanfare(false);
  };

  const handleLaunchRace = () => {
    // If student is in Teacher Cup mode, they must have entered the Teacher's room code first
    if (!isTeacher && activeMode === 'teacher_cup' && !isStudentJoinedTeacherRoom) {
      return;
    }

    const finalRoster = buildActiveRoster(
      lobby.botCount,
      lobby.hostMode,
      lobby.teamCount,
      activeMode
    );
    if (lobby.participants.length === finalRoster.length) {
      for (let i = 0; i < finalRoster.length; i++) {
        finalRoster[i].teamId = lobby.participants[i].teamId;
      }
    }
    const nextLobby: LobbyConfig = {
      ...lobby,
      playModeCategory: activeMode,
      botDifficulty,
      teacherRewards,
      status: 'racing',
      participants: finalRoster,
    };
    dualDB.updateLobby(nextLobby);
    onStartRace(nextLobby);
  };

  const teamColors: Record<number, { label: string; badge: string }> = {
    1: { label: 'Đội 1 (Đỏ)', badge: 'text-red-400 border-red-500/50' },
    2: { label: 'Đội 2 (Xanh)', badge: 'text-sky-400 border-sky-500/50' },
    3: { label: 'Đội 3 (Vàng)', badge: 'text-yellow-300 border-yellow-500/50' },
    4: { label: 'Đội 4 (Tím)', badge: 'text-purple-300 border-purple-500/50' },
  };

  const currentMapObj = MAPS.find((m) => m.id === lobby.mapId) || MAPS[0];
  const isCurrentMapNight = isNightMapTheme(currentMapObj.theme);
  const canLaunchCurrentMode =
    isTeacher || activeMode !== 'teacher_cup' || isStudentJoinedTeacherRoom;

  // Dynamic Top 1, Top 2, Top 3 Coin Rewards scaled by Difficulty & Laps
  const practiceTop1Coins = calculateCoinReward(
    1,
    false,
    'practice_ai',
    teacherRewards,
    botDifficulty,
    lobby.laps
  );
  const friendsTop1Coins = calculateCoinReward(
    1,
    false,
    'friends_pvp',
    teacherRewards,
    botDifficulty,
    lobby.laps
  );
  const teacherTop1Coins = calculateCoinReward(
    1,
    false,
    'teacher_cup',
    teacherRewards,
    botDifficulty,
    lobby.laps
  );
  const activeTop1Coins = calculateCoinReward(
    1,
    false,
    activeMode,
    teacherRewards,
    botDifficulty,
    lobby.laps
  );
  const activeTop2Coins = calculateCoinReward(
    2,
    false,
    activeMode,
    teacherRewards,
    botDifficulty,
    lobby.laps
  );
  const activeTop3Coins = calculateCoinReward(
    3,
    false,
    activeMode,
    teacherRewards,
    botDifficulty,
    lobby.laps
  );

  return (
    <div className="min-h-screen bg-[#1E261D] text-white p-4 md:p-6 flex flex-col select-none">
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col space-y-4">
        {/* If Teacher: Render the Unified 3-Section Teacher Navigation Bar */}
        {isTeacher && onSelectTeacherTab && onOpenFirebaseModal && onLogout && (
          <TeacherNavHeader
            activeTab="lobby"
            teacherProfile={teacherProfile}
            fbConnected={fbConnected}
            onSelectTab={onSelectTeacherTab}
            onOpenFirebaseModal={onOpenFirebaseModal}
            onLogout={onLogout}
          />
        )}

        {/* ================================================================= */}
        {/* COMPACT TOP BAR                                                   */}
        {/* ================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#283825] via-[#4A6046] to-[#283825] border-2 border-[#7A9A75] shadow-xl">
          <div className="flex items-center gap-3">
            {isTeacher || activeMode === 'teacher_cup' ? (
              <div className="px-3.5 py-1 rounded-xl bg-[#1E261D] border-2 border-[#F59E0B] text-center">
                <div className="text-[9px] font-bold text-[#A7C4A0] uppercase">
                  MÃ PHÒNG GV
                </div>
                <div className="font-mono-num text-lg font-black text-[#F59E0B] tracking-widest">
                  {isTeacher || isStudentJoinedTeacherRoom
                    ? lobby.roomPin
                    : '••••••'}
                </div>
              </div>
            ) : activeMode === 'friends_pvp' ? (
              <div className="px-3.5 py-1 rounded-xl bg-[#1E261D] border-2 border-[#38BDF8] text-center">
                <div className="text-[9px] font-bold text-[#7DD3FC] uppercase">
                  MÃ PHÒNG
                </div>
                <div className="font-mono-num text-lg font-black text-[#38BDF8] tracking-widest">
                  {lobby.friendRoomPin || '668899'}
                </div>
              </div>
            ) : null}

            <h1 className="text-lg md:text-xl font-black text-white tracking-wide">
              {isTeacher ? '🏟️ PHÒNG GIẢI ĐẤU' : '🏁 CHỌN CHẾ ĐỘ ĐUA'}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {isTeacher && (
              <button
                type="button"
                onClick={() => {
                  dualDB.generateNewRoomPin();
                  soundEngine.playCoin();
                }}
                className="px-3.5 py-2 rounded-xl bg-[#1E261D] hover:bg-[#2B3729] text-[#FEF08A] border border-[#F59E0B] font-bold text-xs cursor-pointer"
              >
                🔄 Đổi Mã
              </button>
            )}
            {!isTeacher && (
              <button
                type="button"
                onClick={onBackToMenu}
                className="px-4 py-2 rounded-xl bg-[#1E261D] hover:bg-[#2B3729] text-white border border-[#7A9A75] font-bold text-xs cursor-pointer inline-flex items-center justify-center gap-1.5 leading-none"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5] block shrink-0" />
                <span>Sảnh Chính</span>
              </button>
            )}

            {canLaunchCurrentMode && (
              <button
                type="button"
                data-start="true"
                onClick={handleLaunchRace}
                className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#FBBF24] text-[#1E261D] border-2 border-[#FEF08A] font-black text-sm shadow-xl cursor-pointer"
              >
                🏁 BẮT ĐẦU ({activeParticipants.length} XE)
              </button>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* SIMPLIFIED 3 VISUAL BANNER MODE CARDS (Shown for Student & Teacher)*/}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Banner Card 1: Practice vs AI Bots */}
          <button
            type="button"
            onClick={() => handleSelectModeCategory('practice_ai')}
            className={`group text-left p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              activeMode === 'practice_ai'
                ? 'bg-[#253924] border-[#4ADE80] shadow-[0_0_20px_rgba(74,222,128,0.3)] scale-[1.01]'
                : 'bg-[#1D271C] border-[#7A9A75]/40 opacity-80 hover:opacity-100'
            }`}
          >
            <ModeBannerArt
              mode="practice_ai"
              active={activeMode === 'practice_ai'}
            />
            <div className="mt-2 px-1 flex items-center justify-between gap-2">
              <div className="text-sm font-black text-white">
                🤖 ĐUA VỚI MÁY
              </div>
              <span
                data-testid="practice-top1-coins"
                className="px-2.5 py-1 rounded-lg bg-[#1E261D] border border-[#4ADE80] font-mono-num text-xs font-extrabold text-[#4ADE80] shrink-0"
              >
                🥇 +{practiceTop1Coins} Xu
              </span>
            </div>
          </button>

          {/* Banner Card 2: Friends PvP */}
          <button
            type="button"
            onClick={() => handleSelectModeCategory('friends_pvp')}
            className={`group text-left p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              activeMode === 'friends_pvp'
                ? 'bg-[#1B2E4B] border-[#38BDF8] shadow-[0_0_20px_rgba(56,189,248,0.3)] scale-[1.01]'
                : 'bg-[#1D271C] border-[#7A9A75]/40 opacity-80 hover:opacity-100'
            }`}
          >
            <ModeBannerArt
              mode="friends_pvp"
              active={activeMode === 'friends_pvp'}
            />
            <div className="mt-2 px-1 flex items-center justify-between gap-2">
              <div className="text-sm font-black text-white">
                👥 ĐUA BẠN BÈ
              </div>
              <span
                data-testid="friends-top1-coins"
                className="px-2.5 py-1 rounded-lg bg-[#1E261D] border border-[#38BDF8] font-mono-num text-xs font-extrabold text-[#38BDF8] shrink-0"
              >
                🥇 +{friendsTop1Coins} Xu
              </span>
            </div>
          </button>

          {/* Banner Card 3: Teacher-Hosted Official Tournament */}
          <button
            type="button"
            onClick={() => handleSelectModeCategory('teacher_cup')}
            className={`group text-left p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              activeMode === 'teacher_cup'
                ? 'bg-[#3B230A] border-[#F59E0B] shadow-[0_0_22px_rgba(245,158,11,0.4)] scale-[1.01]'
                : 'bg-[#1D271C] border-[#7A9A75]/40 opacity-80 hover:opacity-100'
            }`}
          >
            <ModeBannerArt
              mode="teacher_cup"
              active={activeMode === 'teacher_cup'}
            />
            <div className="mt-2 px-1 flex items-center justify-between gap-2">
              <div className="text-sm font-black text-[#FEF08A]">
                🏆 GIẢI ĐẤU GIÁO VIÊN
              </div>
              <span
                data-testid="teacher-top1-coins"
                className="px-2.5 py-1 rounded-lg bg-[#1E261D] border border-[#F59E0B] font-mono-num text-xs font-black text-[#F59E0B] shrink-0"
              >
                👑 +{teacherTop1Coins} Xu · +RP
              </span>
            </div>
          </button>
        </div>

        {/* ================================================================= */}
        {/* MAIN SPLIT: LEFT = MODE-SPECIFIC PANEL, RIGHT = 2D CAR SHOWROOM    */}
        {/* ================================================================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT HALF (6 cols) */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            {!isTeacher && activeMode === 'teacher_cup' ? (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                {!isStudentJoinedTeacherRoom ? (
                  <div className="p-5 rounded-2xl bg-gradient-to-b from-[#3B230A] to-[#222D21] border-2 border-[#F59E0B] shadow-2xl space-y-3.5 my-auto">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1E261D] border-2 border-[#F59E0B] flex items-center justify-center text-xl shrink-0">
                        🔑
                      </div>
                      <h2 className="text-base font-black text-[#FEF08A] uppercase">
                        Nhập Mã Phòng Giải Đấu
                      </h2>
                    </div>

                    <form
                      onSubmit={handleStudentJoinTeacherRoom}
                      className="space-y-3"
                    >
                      <div className="flex gap-2.5">
                        <input
                          id="student-teacher-room-pin"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          required
                          placeholder="Mã 6 số (VD: 886688)"
                          value={teacherPinInput}
                          onChange={(e) =>
                            setTeacherPinInput(
                              e.target.value.replace(/\D/g, '')
                            )
                          }
                          className="flex-1 px-4 py-2.5 rounded-xl bg-[#1E261D] border-2 border-[#F59E0B] font-mono-num text-xl font-black text-[#FEF08A] text-center tracking-[0.3em] focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#FBBF24] text-[#1E261D] font-black text-sm shadow-xl cursor-pointer shrink-0"
                        >
                          🔑 VÀO PHÒNG
                        </button>
                      </div>

                      {teacherPinError && (
                        <div className="p-2.5 rounded-xl bg-red-950/90 border border-red-400 text-xs text-red-100 font-bold">
                          {teacherPinError}
                        </div>
                      )}

                      <div className="p-2.5 rounded-xl bg-[#1E261D]/90 border border-[#7A9A75]/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-[#CBD5E1]">
                          Mã phòng:{' '}
                          <strong className="font-mono-num text-[#FEF08A]">
                            {lobby.roomPin}
                          </strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTeacherPinInput(lobby.roomPin);
                            setJoinedTeacherPin(lobby.roomPin);
                            setTeacherPinError(null);
                            soundEngine.playFanfare(false);
                          }}
                          className="px-3 py-1 rounded-lg bg-[#4A6046] hover:bg-[#5E7A59] border border-[#F59E0B] text-[#FEF08A] font-bold cursor-pointer"
                        >
                          ⚡ Vào Ngay ({lobby.roomPin})
                        </button>
                      </div>
                    </form>

                    {/* Prize Summary */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#F59E0B]/30 text-center">
                      <div className="p-2 rounded-xl bg-[#1E261D]/80 border border-[#F59E0B]/40">
                        <div className="text-[10px] text-[#A7C4A0] font-bold">
                          🥇 Top 1
                        </div>
                        <div className="font-mono-num text-sm font-black text-[#F59E0B]">
                          +{teacherRewards.top1Coins} Xu
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-[#1E261D]/80 border border-[#7A9A75]/40">
                        <div className="text-[10px] text-[#A7C4A0] font-bold">
                          🥈 Top 2
                        </div>
                        <div className="font-mono-num text-sm font-black text-white">
                          +{teacherRewards.top2Coins} Xu
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-[#1E261D]/80 border border-[#7A9A75]/40">
                        <div className="text-[10px] text-[#A7C4A0] font-bold">
                          🥉 Top 3
                        </div>
                        <div className="font-mono-num text-sm font-black text-[#FDE047]">
                          +{teacherRewards.top3Coins} Xu
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Student has entered the valid Teacher Room PIN! Show read-only room info + roster */
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-[#3B230A] to-[#273325] border-2 border-[#F59E0B] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F59E0B]/40 pb-2.5">
                      <div>
                        <span className="px-2 py-0.5 rounded-full bg-[#4ADE80] text-[#0F172A] text-[10px] font-black uppercase">
                          ✅ PHÒNG #{lobby.roomPin}
                        </span>
                        <h2 className="text-sm font-black text-[#FEF08A] mt-1">
                          🏆 {lobby.tournamentTitle || 'GIẢI ĐẤU GIÁO VIÊN'}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setJoinedTeacherPin(null);
                          setTeacherPinInput('');
                        }}
                        className="px-3 py-1 rounded-lg bg-[#1E261D] border border-[#7A9A75] text-xs font-bold text-[#CBD5E1] cursor-pointer"
                      >
                        Đổi Phòng
                      </button>
                    </div>

                    {/* Read-only Tournament Summary (Set by Teacher) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-[#1E261D] border border-[#7A9A75]/60">
                        <div className="text-[10px] text-[#A7C4A0] font-bold">
                          Bản Đồ
                        </div>
                        <div className="text-xs font-extrabold text-white truncate mt-0.5">
                          {currentMapObj.name}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-[#1E261D] border border-[#7A9A75]/60">
                        <div className="text-[10px] text-[#A7C4A0] font-bold">
                          Thể Thức
                        </div>
                        <div className="text-xs font-extrabold text-[#FEF08A] mt-0.5">
                          {lobby.raceMode === 'team'
                            ? `${lobby.teamCount} Đội`
                            : 'Cá Nhân'}{' '}
                          · {lobby.laps}V
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-[#1E261D] border border-[#7A9A75]/60">
                        <div className="text-[10px] text-[#A7C4A0] font-bold">
                          Bot
                        </div>
                        <div className="text-xs font-extrabold text-[#4ADE80] mt-0.5">
                          🚫 0 Bot
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-[#1E261D] border border-[#F59E0B]">
                        <div className="text-[10px] text-[#FEF08A] font-bold">
                          Top 1
                        </div>
                        <div className="font-mono-num text-xs font-black text-[#F59E0B] mt-0.5">
                          👑 +{teacherRewards.top1Coins} Xu
                        </div>
                      </div>
                    </div>

                    {lobby.raceMode === 'team' && (
                      <div className="flex items-center gap-2 text-xs pt-1">
                        <span className="text-[#FEF08A] font-bold">Đội:</span>
                        {Array.from(
                          { length: lobby.teamCount },
                          (_, i) => i + 1
                        ).map((tid) => (
                          <button
                            key={tid}
                            type="button"
                            onClick={() => handleSelectMyTeam(tid)}
                            className="px-3 py-1 rounded-lg bg-[#1E261D] hover:bg-[#4A6046] border border-[#F59E0B] text-xs font-bold cursor-pointer"
                          >
                            Đội {tid}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Roster List for Student in Teacher Cup */}
                <div className="p-3.5 rounded-2xl bg-[#273325] border border-[#7A9A75] flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs sm:text-sm font-bold text-white">
                      🏎️ Tay Đua ({activeParticipants.length})
                    </h3>
                    <span className="text-xs text-[#4ADE80] font-bold">
                      🚫 0 Bot
                    </span>
                  </div>
                  <div className="max-h-[175px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                    {activeParticipants.map((p, idx) => {
                      const rnk = getRankByRP(p.rp);
                      return (
                        <div
                          key={p.id}
                          className="p-2 rounded-lg bg-[#1E261D] border border-[#7A9A75]/50 flex items-center justify-between text-xs"
                        >
                          <div className="truncate pr-2">
                            <span className="font-mono-num text-[#A7C4A0] mr-1.5">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-white">
                              {p.isTeacher ? `🎓 ${p.username}` : p.username}
                            </span>
                          </div>
                          <span
                            style={{ color: rnk.color }}
                            className="font-mono-num text-[11px] font-bold shrink-0"
                          >
                            {rnk.badgeIcon} {p.rp}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* ============================================================= */
              /* CASE 2: TEACHER HOST OR STUDENT IN PRACTICE_AI / FRIENDS_PVP  */
              /* ============================================================= */
              <>
                {/* TEACHER PRIZE CONFIGURER (Shown when Teacher is in teacher_cup mode) */}
                {isTeacher && activeMode === 'teacher_cup' && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#3B230A] to-[#273325] border-2 border-[#F59E0B] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-xs sm:text-sm font-black text-[#FEF08A] uppercase">
                        👑 Quỹ Thưởng Giải Đấu
                      </h2>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApplyRewardPreset(1)}
                          className="px-2.5 py-1 rounded-lg bg-[#1E261D] border border-[#F59E0B] text-[11px] font-bold text-[#FEF08A] cursor-pointer"
                        >
                          Chuẩn (100 Xu)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyRewardPreset(3)}
                          className="px-2.5 py-1 rounded-lg bg-[#F59E0B] text-[#1E261D] text-[11px] font-black cursor-pointer"
                        >
                          x3 (300 Xu)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                      {(
                        [
                          { key: 'top1Coins', label: '🥇 Top 1' },
                          { key: 'top2Coins', label: '🥈 Top 2' },
                          { key: 'top3Coins', label: '🥉 Top 3' },
                          { key: 'top10Coins', label: '🏅 Top 4–10' },
                          { key: 'finishCoins', label: '🏁 Về Đích' },
                          { key: 'teamWinBonusCoins', label: '🚩 Đội Thắng' },
                        ] as const
                      ).map((item) => (
                        <div
                          key={item.key}
                          className="p-1.5 rounded-xl bg-[#1E261D] border border-[#7A9A75]"
                        >
                          <div className="text-[10px] font-bold text-[#A7C4A0]">
                            {item.label}
                          </div>
                          <input
                            type="number"
                            min={5}
                            max={5000}
                            value={teacherRewards[item.key]}
                            onChange={(e) =>
                              handleUpdateTeacherReward(
                                item.key,
                                Number(e.target.value)
                              )
                            }
                            className="w-full mt-1 px-1 py-0.5 rounded bg-[#273325] border border-[#F59E0B] font-mono-num text-xs font-black text-[#F59E0B] text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FRIENDS ROOM CREATE / JOIN PANEL (Available for both Student & Teacher in friends_pvp) */}
                {activeMode === 'friends_pvp' && (
                  <div className="p-3.5 rounded-2xl bg-[#1B2E4B]/90 border-2 border-[#38BDF8] space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0F172A] border border-[#38BDF8]/40">
                      <button
                        type="button"
                        onClick={() => {
                          setFriendSubTab('create');
                          setFriendRoomFeedback(null);
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          friendSubTab === 'create'
                            ? 'bg-[#38BDF8] text-[#0F172A] shadow'
                            : 'text-[#BAE6FD] hover:text-white'
                        }`}
                      >
                        ➕ TẠO PHÒNG
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFriendSubTab('join');
                          setFriendRoomFeedback(null);
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          friendSubTab === 'join'
                            ? 'bg-[#38BDF8] text-[#0F172A] shadow'
                            : 'text-[#BAE6FD] hover:text-white'
                        }`}
                      >
                        🔑 VÀO PHÒNG
                      </button>
                    </div>

                    {friendSubTab === 'create' ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0F172A]/80 p-2.5 rounded-xl border border-[#38BDF8]/50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#BAE6FD] font-semibold">
                            Mã Phòng:
                          </span>
                          <span className="font-mono-num text-base font-black text-[#FEF08A] tracking-widest">
                            #{lobby.friendRoomPin || '668899'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCreateNewFriendRoom}
                          className="px-3 py-1.5 rounded-xl bg-[#38BDF8] hover:bg-[#7DD3FC] text-[#0F172A] font-black text-xs cursor-pointer"
                        >
                          🔄 Đổi Mã
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={handleJoinFriendRoom}
                        className="space-y-2 bg-[#0F172A]/80 p-2.5 rounded-xl border border-[#38BDF8]/50"
                      >
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            required
                            placeholder="Nhập mã 6 số (VD: 668899)"
                            value={friendPinInput}
                            onChange={(e) =>
                              setFriendPinInput(
                                e.target.value.replace(/\D/g, '')
                              )
                            }
                            className="flex-1 px-3 py-1.5 rounded-xl bg-[#1E261D] border border-[#38BDF8] font-mono-num text-sm font-black text-white text-center tracking-widest"
                          />
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-xl bg-[#38BDF8] hover:bg-[#7DD3FC] text-[#0F172A] font-black text-xs cursor-pointer"
                          >
                            🔑 Vào
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#BAE6FD]">
                          <span>
                            Mã hiện tại:{' '}
                            <strong className="font-mono-num text-[#FEF08A]">
                              {lobby.friendRoomPin || '668899'}
                            </strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const code = lobby.friendRoomPin || '668899';
                              setFriendPinInput(code);
                              setJoinedFriendPin(code);
                              setFriendRoomFeedback({
                                ok: true,
                                text: `Đã vào phòng #${code}!`,
                              });
                              soundEngine.playCoin();
                            }}
                            className="underline text-[#FEF08A] font-bold cursor-pointer"
                          >
                            Điền #{lobby.friendRoomPin || '668899'}
                          </button>
                        </div>
                      </form>
                    )}

                    {friendRoomFeedback && (
                      <div
                        className={`p-2 rounded-lg text-xs font-bold ${
                          friendRoomFeedback.ok
                            ? 'bg-[#1E261D] text-[#4ADE80]'
                            : 'bg-red-950 text-red-200'
                        }`}
                      >
                        {friendRoomFeedback.text}
                      </div>
                    )}
                  </div>
                )}

                {/* SIMPLIFIED MATCH SETUP PANEL */}
                <div className="p-3.5 rounded-2xl bg-[#273325] border border-[#7A9A75] space-y-2.5">
                  {/* Teacher Role Mode & Custom Display Name */}
                  {isTeacher && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2 rounded-xl bg-[#1E261D] border border-[#7A9A75]/60">
                      <div>
                        <label className="block text-[11px] font-bold text-[#A7C4A0] mb-1">
                          Tên Giáo Viên:
                        </label>
                        <input
                          type="text"
                          value={teacherProfile.username}
                          onChange={(e) =>
                            dualDB.updateTeacherProfile({
                              username: e.target.value,
                            })
                          }
                          placeholder="Tên Giáo Viên..."
                          className="w-full px-3 py-1 rounded-lg bg-[#273325] border border-[#F59E0B] text-xs font-bold text-white"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-[#A7C4A0] mb-1">
                          Vai Trò:
                        </div>
                        <div className="flex items-center gap-1.5">
                          {activeMode === 'teacher_cup' && (
                            <button
                              type="button"
                              onClick={() =>
                                dualDB.updateLobby({
                                  hostMode: 'spectator',
                                  participants: buildActiveRoster(
                                    0,
                                    'spectator'
                                  ),
                                })
                              }
                              className={`flex-1 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                lobby.hostMode === 'spectator'
                                  ? 'bg-[#F59E0B] text-[#1E261D]'
                                  : 'bg-[#2C392A] text-white'
                              }`}
                            >
                              👁️ Quan Sát
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              dualDB.updateLobby({
                                hostMode: 'play',
                                participants: buildActiveRoster(
                                  lobby.botCount,
                                  'play'
                                ),
                              })
                            }
                            className={`flex-1 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                              lobby.hostMode === 'play' ||
                              activeMode !== 'teacher_cup'
                                ? 'bg-[#F59E0B] text-[#1E261D]'
                                : 'bg-[#2C392A] text-white'
                            }`}
                          >
                            🏎️ Lái Đua
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Map + Laps Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    <div className="sm:col-span-7 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#CBD5E1] flex items-center gap-1.5">
                          <span>🗺️ Bản Đồ:</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                              isCurrentMapNight
                                ? 'bg-sky-950 text-[#38BDF8] border border-sky-500/40'
                                : 'bg-amber-950 text-[#FEF08A] border border-amber-500/40'
                            }`}
                          >
                            {isCurrentMapNight ? '🌙 Đêm' : '☀️ Ngày'}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={handleRandomMap}
                          className="text-[11px] font-bold text-[#FEF08A] underline cursor-pointer"
                        >
                          🎲 Ngẫu nhiên
                        </button>
                      </div>
                      <select
                        aria-label="Chọn Bản Đồ Thi Đấu"
                        value={lobby.mapId}
                        onChange={(e) =>
                          dualDB.updateLobby({ mapId: e.target.value })
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-[#1E261D] border border-[#7A9A75] text-xs sm:text-sm font-bold text-white"
                      >
                        {MAPS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-5 p-2 rounded-xl bg-[#1E261D] border border-[#7A9A75]/50">
                      <div className="flex items-center justify-between text-xs font-bold text-[#CBD5E1] mb-1">
                        <span>🔄 Số Vòng:</span>
                        <span className="font-mono-num text-[#F59E0B]">
                          {lobby.laps} Vòng (x{getLapCoinMultiplier(lobby.laps)})
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="Số Vòng Đua"
                        min={1}
                        max={10}
                        value={lobby.laps}
                        onChange={(e) =>
                          dualDB.updateLobby({ laps: Number(e.target.value) })
                        }
                        className="w-full accent-[#F59E0B] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Live Scaled Coin Reward Preview Strip (Difficulty x Laps) */}
                  <div
                    data-testid="live-coin-reward-strip"
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#1E261D] border border-[#F59E0B]/50 text-xs"
                  >
                    <span className="font-bold text-[#CBD5E1]">
                      🪙 Thưởng Xu:
                    </span>
                    <div className="flex items-center gap-3 font-mono-num font-black">
                      <span className="text-[#F59E0B]">
                        🥇 +{activeTop1Coins} Xu
                      </span>
                      <span className="text-white">
                        🥈 +{activeTop2Coins} Xu
                      </span>
                      <span className="text-[#FDE047]">
                        🥉 +{activeTop3Coins} Xu
                      </span>
                    </div>
                  </div>

                  {/* Solo vs Team */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-[#1E261D] border border-[#7A9A75]/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#CBD5E1]">
                        Thể Thức:
                      </span>
                      <button
                        type="button"
                        onClick={() => dualDB.updateLobby({ raceMode: 'solo' })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          lobby.raceMode === 'solo'
                            ? 'bg-[#F59E0B] text-[#1E261D]'
                            : 'bg-[#2C392A] text-white'
                        }`}
                      >
                        👤 Cá Nhân
                      </button>
                      <button
                        type="button"
                        onClick={() => dualDB.updateLobby({ raceMode: 'team' })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          lobby.raceMode === 'team'
                            ? 'bg-[#F59E0B] text-[#1E261D]'
                            : 'bg-[#2C392A] text-white'
                        }`}
                      >
                        🚩 Đồng Đội
                      </button>
                    </div>

                    {lobby.raceMode === 'team' && (
                      <div className="flex items-center gap-1.5">
                        {([2, 3, 4] as const).map((tc) => (
                          <button
                            key={tc}
                            type="button"
                            onClick={() =>
                              dualDB.updateLobby({
                                teamCount: tc,
                                participants: buildActiveRoster(
                                  lobby.botCount,
                                  lobby.hostMode,
                                  tc
                                ),
                              })
                            }
                            className={`px-2 py-1 rounded text-xs font-bold cursor-pointer ${
                              lobby.teamCount === tc
                                ? 'bg-[#F59E0B] text-[#1E261D]'
                                : 'bg-[#2C392A] text-white'
                            }`}
                          >
                            {tc} Đội
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={handleAutoBalanceTeams}
                          className="px-2.5 py-1 rounded bg-[#4A6046] text-[#FEF08A] text-xs font-bold cursor-pointer"
                        >
                          ⚖️ Chia Đội
                        </button>
                      </div>
                    )}
                  </div>

                  {/* AI Bots Count Selector */}
                  {activeMode === 'teacher_cup' ? (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#1E261D] border border-[#4ADE80]/60 text-xs">
                      <span className="font-bold text-[#4ADE80]">
                        🚫 Không Có AI Bot (100% Người Thật)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-[#1E261D] border border-[#7A9A75]/50">
                        <span className="text-xs font-bold text-[#CBD5E1]">
                          🤖 Số Bot:
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(activeMode === 'friends_pvp'
                            ? [0, 5, 10, 15, 25]
                            : [5, 10, 15, 25, 40]
                          ).map((cnt) => (
                            <button
                              key={cnt}
                              type="button"
                              onClick={() => handleSetBots(cnt)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono-num font-bold cursor-pointer ${
                                lobby.botCount === cnt
                                  ? 'bg-[#F59E0B] text-[#1E261D]'
                                  : 'bg-[#2C392A] text-white hover:bg-[#4A6046]'
                              }`}
                            >
                              {cnt === 0 ? '🚫 0 Bot' : `+${cnt} Bots`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* AI Bot Difficulty Selector */}
                      {lobby.botCount > 0 && (
                        <div className="p-2 rounded-xl bg-[#1E261D] border border-[#7A9A75]/50 space-y-1.5">
                          <div className="text-xs font-bold text-[#CBD5E1]">
                            ⚡ Độ Khó Bot:
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {BOT_DIFFICULTY_OPTIONS.map((opt) => {
                              const active = botDifficulty === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => handleSetBotDifficulty(opt.id)}
                                  className={`py-1.5 px-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
                                    active
                                      ? 'bg-[#F59E0B] text-[#1E261D] border-[#FEF08A] shadow'
                                      : 'bg-[#273325] text-white border-[#7A9A75]/40 hover:border-[#F59E0B]'
                                  }`}
                                >
                                  <div>{opt.label}</div>
                                  <div
                                    className={`text-[10px] font-semibold ${
                                      active
                                        ? 'text-[#1E261D]/80'
                                        : 'text-[#A7C4A0]'
                                    }`}
                                  >
                                    {opt.badge}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Roster List */}
                <div className="p-3 rounded-2xl bg-[#273325] border border-[#7A9A75] flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs sm:text-sm font-bold text-white">
                      🏎️ Danh Sách ({activeParticipants.length} Xe)
                    </h3>
                  </div>

                  <div className="max-h-[135px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                    {activeParticipants.map((p, idx) => {
                      const rnk = getRankByRP(p.rp);
                      const tInfo = teamColors[p.teamId || 1];
                      return (
                        <div
                          key={p.id}
                          className="p-2 rounded-lg bg-[#1E261D] border border-[#7A9A75]/50 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <RankAvatarFrame
                              username={p.username}
                              rp={p.rp}
                              size="sm"
                              isTeacher={p.isTeacher}
                            />
                            <div className="truncate">
                              <span className="font-mono-num text-[#A7C4A0] mr-1">
                                #{idx + 1}
                              </span>
                              <span className="font-bold text-white">
                                {p.username}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {lobby.raceMode === 'team' && (
                              <span
                                className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${tInfo?.badge}`}
                              >
                                Đội {p.teamId}
                              </span>
                            )}
                            <span
                              style={{ color: rnk.color }}
                              className="font-mono-num text-[11px] font-bold inline-flex items-center gap-1"
                            >
                              <RankCrest tierId={rnk.id} size={20} />
                              <span>{p.rp}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT HALF (6 cols): Interactive Warm-up Mini Track */}
          <div className="lg:col-span-6 flex flex-col">
            <WarmupCanvas
              loadout={
                isTeacher
                  ? teacherProfile.loadout
                  : currentStudent?.loadout || DEFAULT_LOADOUT
              }
              username={
                isTeacher
                  ? teacherProfile.username
                  : currentStudent?.username || 'Tay Đua TripleD'
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

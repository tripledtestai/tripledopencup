import React, { useEffect, useState } from 'react';
import {
  Car,
  Clock,
  Compass,
  Crown,
  Globe,
  Key,
  Loader2,
  Lock,
  Play,
  RotateCw,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { MAPS } from '../game/constants';
import { getRankByRP } from '../game/rules';
import {
  LobbyConfig,
  MatchmakingRoomEntry,
  StudentAccount,
} from '../game/types';
import { dualDB } from '../services/database';
import { multiplayerService } from '../services/multiplayer';
import { soundEngine } from '../services/sound';
import { RankCrest } from './RankBadge';

export interface AutoMatchmakingModalProps {
  player?: StudentAccount;
  currentStudent?: StudentAccount;
  isTeacher?: boolean;
  isNightMode?: boolean;
  onClose: () => void;
  onEnterLobby?: (
    roomPin: string,
    isHost: boolean,
    customConfig?: Partial<LobbyConfig>
  ) => void;
  onLaunchRace: (finalLobby: LobbyConfig) => void;
}

export const AutoMatchmakingModal: React.FC<AutoMatchmakingModalProps> = ({
  player,
  currentStudent,
  isTeacher = false,
  isNightMode,
  onClose,
  onEnterLobby,
  onLaunchRace,
}) => {
  const activePlayer = (currentStudent || player)!;
  const [activeTab, setActiveTab] = useState<'scan' | 'host'>('scan');

  // SCAN & PIN JOIN STATE
  const [elapsedSec, setElapsedSec] = useState(0);
  const [discoveredRooms, setDiscoveredRooms] = useState<MatchmakingRoomEntry[]>([]);
  const [isJoiningPin, setIsJoiningPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // HOST CREATION VISIBILITY STATE: Public (discoverable on radar) vs Private (PIN only)
  const [roomVisibility, setRoomVisibility] = useState<'public' | 'private'>('public');

  // Synchronize Dark / Light Mode state seamlessly with app-wide theme
  const [isNight, setIsNight] = useState<boolean>(() => {
    if (typeof isNightMode === 'boolean') return isNightMode;
    try {
      return !document.documentElement.classList.contains('theme-light');
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (typeof isNightMode === 'boolean') {
      setIsNight(isNightMode);
    }
  }, [isNightMode]);

  useEffect(() => {
    const syncTheme = () => {
      const isLight = document.documentElement.classList.contains('theme-light');
      setIsNight(!isLight);
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  // SCAN MODE: Elapsed timer and real-time PUBLIC room discovery
  useEffect(() => {
    if (activeTab !== 'scan') return;

    setElapsedSec(0);
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);

    // BroadcastChannel query
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('tripled_auto_matchmaking_v1');
      bc.postMessage({ type: 'QM_QUERY_OPEN' });
      bc.onmessage = (e) => {
        const data = e.data;
        if (
          data &&
          data.type === 'QM_ROOM_ANNOUNCE' &&
          data.roomPin &&
          !data.isPrivateRoom
        ) {
          const mySessionId = multiplayerService.clientSessionId;
          const isMyOwnSession = data.hostSessionId
            ? data.hostSessionId === mySessionId
            : data.hostId === activePlayer.id;
          if (data.status === 'waiting' && !isMyOwnSession) {
            setDiscoveredRooms((prev) => {
              const exists = prev.some((r) => r.roomPin === data.roomPin);
              if (exists) {
                return prev.map((r) =>
                  r.roomPin === data.roomPin
                    ? { ...r, participantsCount: data.participantsCount }
                    : r
                );
              }
              soundEngine.playCoin();
              return [
                ...prev,
                {
                  roomPin: data.roomPin,
                  hostId: data.hostId,
                  hostName: data.hostName,
                  hostRp: data.hostRp || 0,
                  mapId: data.mapId || MAPS[0].id,
                  participantsCount: data.participantsCount || 1,
                  maxPlayers: data.maxPlayers || 8,
                  isPrivateRoom: false,
                  status: 'waiting',
                  createdAt: data.createdAt || Date.now(),
                  updatedAt: Date.now(),
                },
              ];
            });
          }
        }
      };
    } catch {}

    // Listen to Firebase RTDB matchmaking registry (only Public rooms!)
    const unsubFb = dualDB.listenMatchmakingRooms((rooms) => {
      const now = Date.now();
      const mySessionId = multiplayerService.clientSessionId;
      const list = Object.values(rooms || {}).filter((r) => {
        if (!r || !r.roomPin || r.status !== 'waiting') return false;
        if (r.isPrivateRoom) return false;
        if (r.participantsCount >= (r.maxPlayers || 8)) return false;
        const roomTs = r.updatedAt || r.createdAt || now;
        if (Math.abs(now - roomTs) >= 1800000) return false;
        if (r.hostSessionId && r.hostSessionId === mySessionId) return false;
        if (
          !r.hostSessionId &&
          r.hostId?.toLowerCase() === (activePlayer.id || '').toLowerCase()
        )
          return false;
        return true;
      });
      setDiscoveredRooms(list);
    });

    return () => {
      clearInterval(timer);
      unsubFb();
      bc?.close();
    };
  }, [activeTab, activePlayer.id]);

  // Handler: Join an existing waiting room discovered by radar
  const handleJoinRoom = (room: MatchmakingRoomEntry) => {
    soundEngine.playFanfare(false);
    setIsJoiningPin(room.roomPin);

    if (onEnterLobby) {
      onEnterLobby(room.roomPin, false, {
        mapId: room.mapId,
        playModeCategory: 'friends_pvp',
        friendRoomPin: room.roomPin,
        isFriendGuest: true,
        isPrivateRoom: Boolean(room.isPrivateRoom),
        status: 'waiting',
      });
    } else {
      onLaunchRace({
        roomPin: room.roomPin,
        playModeCategory: 'friends_pvp',
        friendRoomPin: room.roomPin,
        mapId: room.mapId,
        laps: 3,
        hostMode: 'play',
        raceMode: 'solo',
        teamCount: 2,
        botCount: 0,
        status: 'racing',
        participants: [
          {
            id: activePlayer.id,
            username: activePlayer.username,
            rp: activePlayer.rp,
            teamId: 1,
            loadout: activePlayer.loadout,
            isBot: false,
          },
        ],
      });
    }
  };

  // Handler: Join room directly by 6-digit PIN (works for both Public and Private rooms)
  const handleJoinByPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pinInput.trim().replace(/\D/g, '');
    if (cleaned.length < 4) {
      setPinError('Vui lòng nhập mã phòng hợp lệ (4 – 6 chữ số).');
      soundEngine.playHazardHit();
      return;
    }
    setPinError(null);
    soundEngine.playFanfare(false);
    setIsJoiningPin(cleaned);

    if (onEnterLobby) {
      onEnterLobby(cleaned, false, {
        playModeCategory: 'friends_pvp',
        friendRoomPin: cleaned,
        isFriendGuest: true,
        raidBossId: undefined,
        raidBossModeEnabled: false,
        bossControlMode: undefined,
        bossControllerMode: undefined,
        campaignLevel: undefined,
        campaignLevelNumber: undefined,
        status: 'waiting',
      });
    }
  };

  // Handler: Create room (Public or Private) and open lobby immediately
  const handleCreateRoomAndOpenLobby = () => {
    soundEngine.playFanfare(true);
    const isPrivate = roomVisibility === 'private';
    const newPin = dualDB.generateNewFriendRoomPin(
      isTeacher
        ? 'Thầy/Cô TripleD'
        : activePlayer.username || 'Bạn Bè TripleD'
    );

    const initialConfig: Partial<LobbyConfig> = {
      playModeCategory: 'friends_pvp',
      friendRoomPin: newPin,
      mapId: MAPS[0].id,
      laps: 3,
      raceMode: 'solo',
      teamCount: 2,
      botCount: 0,
      hostMode: 'play',
      isFriendGuest: false,
      isPrivateRoom: isPrivate,
      raidBossId: undefined,
      raidBossModeEnabled: false,
      bossControlMode: undefined,
      bossControllerMode: undefined,
      campaignLevel: undefined,
      campaignLevelNumber: undefined,
      status: 'waiting',
    };

    if (!isPrivate) {
      // Public room: Register in Firebase & announce on BroadcastChannel so radar scans discover it
      dualDB.registerMatchmakingRoom({
        roomPin: newPin,
        hostId: isTeacher ? 'teacher_host' : activePlayer.id || 'host',
        hostSessionId: multiplayerService.clientSessionId,
        hostName: isTeacher
          ? 'Thầy/Cô TripleD'
          : activePlayer.username || 'Chủ Phòng',
        hostRp: isTeacher ? 750 : activePlayer.rp || 0,
        mapId: MAPS[0].id,
        participantsCount: 1,
        maxPlayers: 8,
        isPrivateRoom: false,
        status: 'waiting',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      try {
        const bc = new BroadcastChannel('tripled_auto_matchmaking_v1');
        bc.postMessage({
          type: 'QM_ROOM_ANNOUNCE',
          roomPin: newPin,
          hostId: isTeacher ? 'teacher_host' : activePlayer.id,
          hostSessionId: multiplayerService.clientSessionId,
          hostName: isTeacher ? 'Thầy/Cô TripleD' : activePlayer.username,
          hostRp: isTeacher ? 750 : activePlayer.rp,
          mapId: MAPS[0].id,
          participantsCount: 1,
          maxPlayers: 8,
          isPrivateRoom: false,
          status: 'waiting',
          createdAt: Date.now(),
        });
        bc.close();
      } catch {}
    } else {
      // Ensure private room is not listed on public matchmaking radar
      dualDB.removeMatchmakingRoom(newPin);
    }

    if (onEnterLobby) {
      onEnterLobby(newPin, true, initialConfig);
    } else {
      onLaunchRace({
        roomPin: newPin,
        friendRoomPin: newPin,
        playModeCategory: 'friends_pvp',
        isPrivateRoom: isPrivate,
        mapId: MAPS[0].id,
        laps: 3,
        hostMode: 'play',
        raceMode: 'solo',
        teamCount: 2,
        botCount: 0,
        status: 'waiting',
        participants: [
          {
            id: isTeacher ? 'teacher_host' : activePlayer.id,
            username: isTeacher ? 'Thầy/Cô TripleD' : activePlayer.username,
            rp: activePlayer.rp || 0,
            teamId: 1,
            loadout: activePlayer.loadout,
            isBot: false,
            isTeacher,
          },
        ],
      });
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      data-testid="auto-matchmaking-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-2xl select-none animate-in fade-in duration-200 bg-black/80"
    >
      <div
        className={`relative w-full max-w-[640px] h-[560px] max-h-[92vh] rounded-3xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden transition-colors duration-200 ${
          isNight
            ? 'bg-[#060D1E]/95 border-2 border-cyan-400/50 shadow-[0_24px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(56,189,248,0.22)] text-white'
            : 'bg-white/98 border-2 border-sky-500/70 shadow-[0_24px_80px_rgba(15,23,42,0.22),0_0_40px_rgba(14,165,233,0.18)] text-slate-900'
        }`}
      >
        {/* Subtle Corner Accent Frames */}
        <span
          className={`pointer-events-none absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 rounded-tl ${
            isNight ? 'border-[#38BDF8]' : 'border-sky-600'
          }`}
        />
        <span
          className={`pointer-events-none absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 rounded-tr ${
            isNight ? 'border-[#38BDF8]' : 'border-sky-600'
          }`}
        />
        <span
          className={`pointer-events-none absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 rounded-bl ${
            isNight ? 'border-[#F59E0B]' : 'border-amber-600'
          }`}
        />
        <span
          className={`pointer-events-none absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 rounded-br ${
            isNight ? 'border-[#F59E0B]' : 'border-amber-600'
          }`}
        />

        {/* ================================================================= */}
        {/* 1. HEADER                                                         */}
        {/* ================================================================= */}
        <div
          className={`relative z-10 shrink-0 flex items-center justify-between border-b pb-3 ${
            isNight ? 'border-cyan-500/25' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 ${
                isNight
                  ? 'bg-cyan-500/15 border border-cyan-400/50 text-[#38BDF8]'
                  : 'bg-sky-100 border border-sky-400 text-sky-600'
              }`}
            >
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div
                className={`text-[11px] font-medium tracking-wide ${
                  isNight ? 'text-[#38BDF8]' : 'text-sky-700'
                }`}
              >
                Đấu Trường Trực Tuyến · Ghép Trận & Phòng Bạn Bè
              </div>
              <h2
                className={`text-lg sm:text-xl font-sci font-black tracking-wide mt-0.5 leading-none ${
                  isNight ? 'text-white' : 'text-slate-900'
                }`}
              >
                SẢNH ĐUA ONLINE & GHÉP NHANH
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playCoin();
              onClose();
            }}
            title="Đóng cửa sổ"
            className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
              isNight
                ? 'bg-[#0B1730] hover:bg-rose-500/20 border-slate-700 hover:border-rose-400/60 text-slate-300 hover:text-white'
                : 'bg-slate-100 hover:bg-rose-50 border-slate-300 hover:border-rose-400 text-slate-700 hover:text-rose-600 shadow-sm'
            }`}
          >
            <X className="w-4.5 h-4.5 stroke-[2.5]" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* 2. DUAL MODE SWITCHER                                             */}
        {/* ================================================================= */}
        <div
          className={`relative z-10 shrink-0 grid grid-cols-2 gap-2 p-1 my-3 rounded-2xl border transition-colors ${
            isNight
              ? 'bg-[#030712]/80 border-cyan-500/30'
              : 'bg-slate-100/90 border-slate-300'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              soundEngine.playCoin();
              setActiveTab('scan');
            }}
            className={`py-2 px-3 rounded-xl font-sci text-xs font-black tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'scan'
                ? isNight
                  ? 'bg-gradient-to-r from-[#0284C7] to-[#38BDF8] text-[#050811] shadow-[0_0_15px_rgba(56,189,248,0.45)]'
                  : 'bg-sky-600 text-white shadow-md'
                : isNight
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <RotateCw
              className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'scan' ? 'animate-spin' : ''}`}
            />
            <span>Quét Phòng & Nhập Mã</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playCoin();
              setActiveTab('host');
            }}
            className={`py-2 px-3 rounded-xl font-sci text-xs font-black tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'host'
                ? isNight
                  ? 'bg-gradient-to-r from-[#D97706] to-[#FACC15] text-[#050811] shadow-[0_0_15px_rgba(245,158,11,0.45)]'
                  : 'bg-amber-500 text-slate-950 shadow-md'
                : isNight
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Tạo Phòng Đua Mới</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* 3. MAIN BODY CONTAINER (Fixed flex-1 height for zero layout shift) */}
        {/* ================================================================= */}
        {activeTab === 'scan' ? (
          <div className="relative z-10 flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
            {/* Direct Room PIN Entry Bar (for Private or Friend Rooms) */}
            <form
              onSubmit={handleJoinByPinSubmit}
              className={`shrink-0 p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                isNight
                  ? 'bg-[#091428]/90 border-cyan-500/35'
                  : 'bg-slate-50 border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isNight
                      ? 'bg-amber-500/15 border border-amber-400/40 text-amber-300'
                      : 'bg-amber-100 border border-amber-400 text-amber-800'
                  }`}
                >
                  <Key className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-xs font-bold leading-tight ${
                      isNight ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Vào Phòng Bằng Mã PIN
                  </div>
                  <div
                    className={`text-[11px] truncate ${
                      pinError
                        ? 'text-rose-400 font-semibold'
                        : isNight
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    {pinError || 'Dành cho phòng riêng tư (Private) hoặc mã bạn bè gửi'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Nhập mã 6 số..."
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/\D/g, ''));
                    if (pinError) setPinError(null);
                  }}
                  className={`w-32 sm:w-36 px-3 py-1.5 rounded-xl border font-mono-num text-xs font-bold focus:outline-none ${
                    pinError
                      ? 'border-rose-400 bg-rose-500/10 text-white'
                      : isNight
                      ? 'bg-[#050A18] border-cyan-400/50 text-white placeholder:text-slate-500 focus:border-cyan-300'
                      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-sky-500'
                  }`}
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D97706] to-[#FACC15] hover:brightness-110 text-slate-950 font-sci font-black text-xs cursor-pointer shadow-sm whitespace-nowrap shrink-0 transition-all"
                >
                  Vào Phòng →
                </button>
              </div>
            </form>

            {/* Compact Radar Scanner Banner */}
            <div
              className={`shrink-0 flex items-center justify-between gap-4 px-4 py-2.5 rounded-2xl border ${
                isNight
                  ? 'border-cyan-500/25 bg-[#050A18]/50'
                  : 'border-sky-200 bg-sky-50/70'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`relative w-12 h-12 rounded-full border flex items-center justify-center overflow-hidden shrink-0 ${
                    isNight
                      ? 'border-cyan-400/40 bg-[#050A18]'
                      : 'border-sky-400/60 bg-white'
                  }`}
                >
                  <div
                    className="absolute inset-0 rounded-full animate-spin"
                    style={{
                      animationDuration: '2.5s',
                      background: isNight
                        ? 'conic-gradient(from 0deg, rgba(56,189,248,0.55) 0deg, rgba(56,189,248,0.1) 45deg, transparent 90deg, transparent 360deg)'
                        : 'conic-gradient(from 0deg, rgba(14,165,233,0.6) 0deg, rgba(14,165,233,0.15) 45deg, transparent 90deg, transparent 360deg)',
                    }}
                  />
                  <div
                    className={`relative z-10 w-6 h-6 rounded-lg flex items-center justify-center ${
                      isNight
                        ? 'bg-[#09152C] border border-[#38BDF8] text-[#38BDF8]'
                        : 'bg-white border border-sky-500 text-sky-600'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                    <span
                      className={`text-xs sm:text-sm font-sci font-bold truncate ${
                        isNight ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {discoveredRooms.length > 0
                        ? `Tìm thấy ${discoveredRooms.length} phòng công khai đang chờ`
                        : 'Đang dò sóng tìm phòng công khai...'}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-0.5 truncate ${
                      isNight ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    Phòng công khai hiển thị tự động · Phòng riêng tư chỉ vào bằng mã PIN
                  </p>
                </div>
              </div>

              <div
                className={`font-mono-num text-base sm:text-lg font-black shrink-0 flex items-center gap-1.5 ${
                  isNight ? 'text-[#38BDF8]' : 'text-sky-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(elapsedSec)}</span>
              </div>
            </div>

            {/* Discovered Public Rooms List */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="shrink-0 flex items-center justify-between text-xs font-sci font-bold mb-2">
                <span
                  className={`tracking-wide flex items-center gap-1.5 ${
                    isNight ? 'text-cyan-200' : 'text-sky-800'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Danh Sách Phòng Công Khai ({discoveredRooms.length})</span>
                </span>
                {discoveredRooms.length > 0 && (
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    Sẵn sàng tham gia
                  </span>
                )}
              </div>

              <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
                {discoveredRooms.length === 0 ? (
                  <div
                    className={`h-full min-h-[110px] px-4 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center space-y-2.5 ${
                      isNight
                        ? 'border-slate-800 bg-[#050A18]/60 text-slate-400'
                        : 'border-slate-300 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <div className="text-xs font-semibold">
                      Hiện chưa có phòng công khai nào đang mở chờ người chơi.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playCoin();
                        setActiveTab('host');
                      }}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#D97706] to-[#FACC15] text-[#050811] font-sci font-black text-xs cursor-pointer shadow-md hover:brightness-110 flex items-center gap-1.5 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Tạo Phòng Đua Mới Ngay →</span>
                    </button>
                  </div>
                ) : (
                  discoveredRooms.map((room) => {
                    const roomMap =
                      MAPS.find((m) => m.id === room.mapId) || MAPS[0];
                    const rnk = getRankByRP(room.hostRp || 0);
                    const isJoining = isJoiningPin === room.roomPin;

                    return (
                      <div
                        key={room.roomPin}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 shadow-sm transition-colors ${
                          isNight
                            ? 'bg-[#09152C]/90 hover:bg-[#0D1E3A] border-cyan-400/40 hover:border-cyan-300'
                            : 'bg-white hover:bg-sky-50 border-sky-300 hover:border-sky-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <RankCrest tierId={rnk.id} size={30} />
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`font-extrabold text-xs sm:text-sm truncate flex items-center gap-2 leading-tight ${
                                isNight ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              <span className="truncate">{room.hostName}</span>
                              <span className="font-mono-num text-[11px] text-amber-400 font-bold">
                                #{room.roomPin}
                              </span>
                            </div>
                            <div
                              className={`flex items-center gap-1.5 text-[11px] mt-0.5 truncate ${
                                isNight ? 'text-slate-300' : 'text-slate-600'
                              }`}
                            >
                              <span style={{ color: rnk.color }} className="font-bold">
                                {rnk.name}
                              </span>
                              <span>·</span>
                              <span className="truncate font-medium text-cyan-300">
                                {roomMap.name}
                              </span>
                              <span>·</span>
                              <span className="font-mono-num font-bold text-amber-400">
                                {room.participantsCount}/{room.maxPlayers || 8} xe
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isJoining}
                          onClick={() => handleJoinRoom(room)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#38BDF8] hover:brightness-110 text-[#050811] font-sci font-black text-xs cursor-pointer shadow-md shrink-0 flex items-center gap-1.5 transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                          {isJoining ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang vào...</span>
                            </>
                          ) : (
                            <span>Vào Sảnh →</span>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          /* =============================================================== */
          /* MODE 2: TẠO PHÒNG ĐUA MỚI (Tùy chọn Công Khai hoặc Riêng Tư)     */
          /* =============================================================== */
          <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-between py-1 px-1 overflow-hidden">
            <div className="text-center space-y-1 max-w-md shrink-0">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/50 text-amber-400">
                <Crown className="w-5 h-5" />
              </div>
              <h3
                className={`text-sm sm:text-base font-sci font-black tracking-wide ${
                  isNight ? 'text-white' : 'text-slate-900'
                }`}
              >
                Thiết Lập Quyền Riêng Tư Phòng Đua
              </h3>
              <p
                className={`text-xs leading-snug ${
                  isNight ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Chọn chế độ phòng trước khi mở sảnh. Bản đồ, số vòng đua và Bot AI được tùy chỉnh trực tiếp bên trong sảnh.
              </p>
            </div>

            {/* Public vs Private Selector Cards */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playCoin();
                  setRoomVisibility('public');
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-colors cursor-pointer flex flex-col justify-between space-y-2 ${
                  roomVisibility === 'public'
                    ? isNight
                      ? 'bg-[#091832] border-[#38BDF8] shadow-[0_0_24px_rgba(56,189,248,0.25)]'
                      : 'bg-sky-50 border-sky-500 shadow-md'
                    : isNight
                    ? 'bg-[#050A18]/80 border-slate-800 hover:border-slate-700 opacity-80'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                      <Globe className="w-4 h-4" />
                    </div>
                    <span
                      className={`font-sci font-black text-sm ${
                        isNight ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      Phòng Công Khai
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold ${
                      roomVisibility === 'public'
                        ? 'text-cyan-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {roomVisibility === 'public' ? 'Đang chọn' : 'Chọn'}
                  </span>
                </div>
                <p
                  className={`text-xs leading-relaxed ${
                    isNight ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  Hiển thị trực tiếp trên Radar Ghép Nhanh để mọi người chơi online đều có thể quét thấy và vào đua cùng.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playCoin();
                  setRoomVisibility('private');
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-colors cursor-pointer flex flex-col justify-between space-y-2 ${
                  roomVisibility === 'private'
                    ? isNight
                      ? 'bg-[#1F1406] border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
                      : 'bg-amber-50 border-amber-500 shadow-md'
                    : isNight
                    ? 'bg-[#050A18]/80 border-slate-800 hover:border-slate-700 opacity-80'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                      <Lock className="w-4 h-4" />
                    </div>
                    <span
                      className={`font-sci font-black text-sm ${
                        isNight ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      Phòng Riêng Tư
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold ${
                      roomVisibility === 'private'
                        ? 'text-amber-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {roomVisibility === 'private' ? 'Đang chọn' : 'Chọn'}
                  </span>
                </div>
                <p
                  className={`text-xs leading-relaxed ${
                    isNight ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  Ẩn hoàn toàn khỏi Radar quét tự động. Chỉ những bạn bè có đúng Mã Phòng 6 số mới có thể tham gia.
                </p>
              </button>
            </div>

            {/* Summary metadata line */}
            <div
              className={`shrink-0 flex flex-wrap items-center justify-center gap-2 text-xs ${
                isNight ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>15 Bản đồ sinh học</span>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Tùy chỉnh 1 – 5 vòng</span>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>Đua đơn hoặc chia đội</span>
              </span>
            </div>

            {/* Action Button */}
            <div className="w-full max-w-md shrink-0">
              <button
                type="button"
                onClick={handleCreateRoomAndOpenLobby}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#FACC15] hover:brightness-110 text-slate-950 font-sci font-black text-sm tracking-wider cursor-pointer shadow-[0_0_28px_rgba(245,158,11,0.45)] transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {roomVisibility === 'private'
                    ? 'TẠO PHÒNG RIÊNG TƯ & LẤY MÃ PIN →'
                    : 'TẠO PHÒNG CÔNG KHAI & MỞ SẢNH →'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 4. FOOTER ACTIONS                                                 */}
        {/* ================================================================= */}
        <div
          className={`relative z-10 shrink-0 flex items-center justify-between pt-3 mt-2 border-t ${
            isNight ? 'border-cyan-500/20' : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              soundEngine.playCoin();
              onClose();
            }}
            className={`h-9 px-4 rounded-xl font-sci font-bold text-xs cursor-pointer transition-all border ${
              isNight
                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-600'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-sm'
            }`}
          >
            Đóng
          </button>

          {activeTab === 'scan' ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playCoin();
                setActiveTab('host');
              }}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#D97706] to-[#FACC15] hover:brightness-110 text-[#050811] font-sci font-black text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tạo Phòng Đua Mới →</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.playCoin();
                setActiveTab('scan');
              }}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#38BDF8] hover:brightness-110 text-[#050811] font-sci font-black text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Quay Lại Quét Phòng & Nhập Mã</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


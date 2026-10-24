import React, { useEffect, useState } from 'react';
import {
  Car,
  Clock,
  Compass,
  Crown,
  Loader2,
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

  // SCAN MODE STATE
  const [elapsedSec, setElapsedSec] = useState(0);
  const [discoveredRooms, setDiscoveredRooms] = useState<MatchmakingRoomEntry[]>([]);
  const [isJoiningPin, setIsJoiningPin] = useState<string | null>(null);

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

  // SCAN MODE: Elapsed timer and real-time room discovery
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
        if (data && data.type === 'QM_ROOM_ANNOUNCE' && data.roomPin) {
          if (data.status === 'waiting' && data.hostId !== activePlayer.id) {
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

    // Listen to Firebase RTDB matchmaking registry
    const unsubFb = dualDB.listenMatchmakingRooms((rooms) => {
      const now = Date.now();
      const list = Object.values(rooms || {}).filter((r) => {
        return (
          r &&
          r.roomPin &&
          r.status === 'waiting' &&
          r.hostId?.toLowerCase() !== (activePlayer.id || '').toLowerCase() &&
          r.participantsCount < (r.maxPlayers || 8) &&
          now - (r.updatedAt || r.createdAt || 0) < 60000
        );
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

  // Handler: Create room and open lobby immediately (adjustments happen inside lobby)
  const handleCreateRoomAndOpenLobby = () => {
    soundEngine.playFanfare(true);
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
      status: 'waiting',
    };

    // Register room in Firebase & announce so radar scans discover it
    dualDB.registerMatchmakingRoom({
      roomPin: newPin,
      hostId: isTeacher ? 'teacher_host' : activePlayer.id || 'host',
      hostName: isTeacher ? 'Thầy/Cô TripleD' : activePlayer.username || 'Chủ Phòng',
      hostRp: isTeacher ? 750 : activePlayer.rp || 0,
      mapId: MAPS[0].id,
      participantsCount: 1,
      maxPlayers: 8,
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
        hostName: isTeacher ? 'Thầy/Cô TripleD' : activePlayer.username,
        hostRp: isTeacher ? 750 : activePlayer.rp,
        mapId: MAPS[0].id,
        participantsCount: 1,
        maxPlayers: 8,
        status: 'waiting',
        createdAt: Date.now(),
      });
      bc.close();
    } catch {}

    if (onEnterLobby) {
      onEnterLobby(newPin, true, initialConfig);
    } else {
      onLaunchRace({
        roomPin: newPin,
        friendRoomPin: newPin,
        playModeCategory: 'friends_pvp',
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
        className={`relative w-full max-w-[620px] rounded-3xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden transition-colors duration-200 ${
          isNight
            ? 'bg-[#060D1E]/95 border-2 border-cyan-400/50 shadow-[0_24px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(56,189,248,0.22)] text-white'
            : 'bg-white/98 border-2 border-sky-500/70 shadow-[0_24px_80px_rgba(15,23,42,0.22),0_0_40px_rgba(14,165,233,0.18)] text-slate-900'
        }`}
      >
        {/* Glowing HUD Corner Brackets */}
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
        {/* 1. HEADER (h-[50px] shrink-0)                                     */}
        {/* ================================================================= */}
        <div
          className={`relative z-10 h-[50px] shrink-0 flex items-center justify-between border-b pb-2.5 ${
            isNight ? 'border-cyan-500/25' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md shrink-0 ${
                isNight
                  ? 'bg-cyan-500/15 border border-cyan-400/50 text-[#38BDF8] shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                  : 'bg-sky-100 border border-sky-400 text-sky-600'
              }`}
            >
              <Zap className="w-4.5 h-4.5 fill-current" />
            </div>
            <div>
              <div
                className={`text-[9px] font-sci font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                  isNight ? 'text-[#38BDF8]' : 'text-sky-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>ONLINE MATCHMAKING // RADAR ARENA</span>
              </div>
              <h2
                className={`text-lg sm:text-xl font-sci font-black tracking-wide uppercase mt-0.5 leading-none ${
                  isNight ? 'text-white' : 'text-slate-900'
                }`}
              >
                RADAR GHÉP TRẬN ONLINE
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playCoin();
              onClose();
            }}
            title="Đóng radar"
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
        {/* 2. DUAL MODE SWITCHER (h-[44px] shrink-0)                         */}
        {/* ================================================================= */}
        <div
          className={`relative z-10 h-[44px] shrink-0 grid grid-cols-2 gap-2 p-1 my-3 rounded-2xl border transition-colors ${
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
            className={`py-1.5 px-3 rounded-xl font-sci text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
              activeTab === 'scan'
                ? isNight
                  ? 'bg-gradient-to-r from-[#0284C7] to-[#38BDF8] text-[#050811] shadow-[0_0_15px_rgba(56,189,248,0.5)]'
                  : 'bg-sky-600 text-white shadow-md'
                : isNight
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${activeTab === 'scan' ? 'animate-spin' : ''}`}
            />
            <span>1. TỰ QUÉT PHÒNG SẴN CÓ</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playCoin();
              setActiveTab('host');
            }}
            className={`py-1.5 px-3 rounded-xl font-sci text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
              activeTab === 'host'
                ? isNight
                  ? 'bg-gradient-to-r from-[#D97706] to-[#FACC15] text-[#050811] shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                  : 'bg-amber-500 text-slate-950 shadow-md'
                : isNight
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>2. TẠO PHÒNG CHỜ MỚI</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* 3. MAIN BODY CONTAINER                                            */}
        {/* ================================================================= */}
        {activeTab === 'scan' ? (
          /* =============================================================== */
          /* MODE 1: TỰ QUÉT PHÒNG SẴN CÓ                                     */
          /* NO MAP DISPLAYED (Quét vào bất cứ phòng nào chứ không hiện map)   */
          /* =============================================================== */
          <div className="relative z-10 flex flex-col justify-between py-2 space-y-3 min-h-[360px]">
            {/* Holographic Radar Scanner */}
            <div className="flex flex-col items-center justify-center space-y-2 py-2">
              <div
                className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border flex items-center justify-center overflow-hidden shrink-0 ${
                  isNight
                    ? 'border-cyan-400/35 bg-[#050A18]/90 shadow-[inset_0_0_30px_rgba(56,189,248,0.18)]'
                    : 'border-sky-400/60 bg-sky-50/95 shadow-[inset_0_0_30px_rgba(14,165,233,0.15)]'
                }`}
              >
                {/* Sonar Rings */}
                <div
                  className={`absolute inset-2.5 rounded-full border ${
                    isNight ? 'border-cyan-400/20' : 'border-sky-400/35'
                  }`}
                />
                <div
                  className={`absolute inset-6 rounded-full border ${
                    isNight ? 'border-cyan-400/25' : 'border-sky-400/40'
                  }`}
                />
                <div
                  className={`absolute inset-10 rounded-full border ${
                    isNight ? 'border-cyan-400/30' : 'border-sky-400/45'
                  }`}
                />
                <div
                  className={`absolute inset-x-0 top-1/2 h-px ${
                    isNight ? 'bg-cyan-400/20' : 'bg-sky-400/35'
                  }`}
                />
                <div
                  className={`absolute inset-y-0 left-1/2 w-px ${
                    isNight ? 'bg-cyan-400/20' : 'bg-sky-400/35'
                  }`}
                />

                {/* Sweep Beam */}
                <div
                  className="absolute inset-0 rounded-full animate-spin"
                  style={{
                    animationDuration: '2.5s',
                    background: isNight
                      ? 'conic-gradient(from 0deg, rgba(56,189,248,0.55) 0deg, rgba(56,189,248,0.1) 45deg, transparent 90deg, transparent 360deg)'
                      : 'conic-gradient(from 0deg, rgba(14,165,233,0.6) 0deg, rgba(14,165,233,0.15) 45deg, transparent 90deg, transparent 360deg)',
                  }}
                />

                {/* Center Icon */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                    isNight
                      ? 'bg-[#09152C] border-2 border-[#38BDF8] text-[#38BDF8] shadow-[0_0_20px_rgba(56,189,248,0.6)]'
                      : 'bg-white border-2 border-sky-500 text-sky-600 shadow-[0_0_16px_rgba(14,165,233,0.35)]'
                  }`}
                >
                  <Car className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>

              {/* Status & Timer */}
              <div className="text-center space-y-1">
                <div
                  className={`font-mono-num text-xl sm:text-2xl font-black tracking-wider flex items-center justify-center gap-2 leading-none ${
                    isNight ? 'text-[#38BDF8]' : 'text-sky-700'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>{formatTimer(elapsedSec)}</span>
                </div>
                <div
                  className={`text-xs sm:text-sm font-sci font-bold tracking-wide flex items-center justify-center gap-1.5 ${
                    isNight ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                  <span>
                    {discoveredRooms.length > 0
                      ? `Phát hiện ${discoveredRooms.length} phòng đang chờ đối thủ!`
                      : 'Đang quét sóng radar tìm các phòng có sẵn...'}
                  </span>
                </div>
                <p
                  className={`text-[11px] ${
                    isNight ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Tự quét và vào ngay sảnh phòng bạn bè mà không cần nhập mã PIN
                </p>
              </div>
            </div>

            {/* Discovered Rooms List or Empty State */}
            <div className="flex flex-col min-h-0 border-t pt-2 border-cyan-500/20">
              <div className="flex items-center justify-between text-xs font-sci font-bold mb-1.5">
                <span
                  className={`uppercase tracking-wider flex items-center gap-1.5 ${
                    isNight ? 'text-cyan-200' : 'text-sky-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>CÁC PHÒNG CHỜ ĐANG MỞ ({discoveredRooms.length})</span>
                </span>
                {discoveredRooms.length > 0 && (
                  <span className="text-[10px] text-emerald-400 font-bold animate-pulse">
                    🟢 SẴN SÀNG VÀO SẢNH
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                {discoveredRooms.length === 0 ? (
                  <div
                    className={`py-6 px-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center space-y-2 ${
                      isNight
                        ? 'border-slate-800 bg-[#050A18]/60 text-slate-400'
                        : 'border-slate-300 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                      <span>Chưa có phòng nào đang mở sẵn lúc này...</span>
                    </div>
                    <p className="text-[11px] max-w-sm">
                      Bạn có thể giữ sóng quét hoặc bấm Tạo phòng mới để người khác quét thấy bạn!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playCoin();
                        setActiveTab('host');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D97706] to-[#FACC15] text-[#050811] font-sci font-black text-xs uppercase tracking-wider cursor-pointer shadow-md hover:brightness-110 flex items-center gap-1.5 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>TẠO PHÒNG CHỜ MỚI NGAY →</span>
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
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 shadow-md transition-all ${
                          isNight
                            ? 'bg-[#09152C]/90 hover:bg-[#0D1E3A] border-cyan-400/40 hover:border-cyan-300'
                            : 'bg-white hover:bg-sky-50 border-sky-300 hover:border-sky-500 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <RankCrest tierId={rnk.id} size={30} />
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`font-extrabold text-xs sm:text-sm truncate flex items-center gap-1.5 leading-tight ${
                                isNight ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              <span className="truncate">{room.hostName}</span>
                              <span className="font-mono-num text-[11px] text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/30">
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
                                🗺️ {roomMap.name}
                              </span>
                              <span>·</span>
                              <span className="font-mono-num font-bold text-amber-400">
                                {room.participantsCount}/{room.maxPlayers || 8} tay đua
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isJoining}
                          onClick={() => handleJoinRoom(room)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#38BDF8] hover:brightness-110 text-[#050811] font-sci font-black text-xs uppercase tracking-wider cursor-pointer shadow-md shrink-0 flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          {isJoining ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>ĐANG VÀO...</span>
                            </>
                          ) : (
                            <>
                              <span>VÀO PHÒNG</span>
                              <span>→</span>
                            </>
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
          /* MODE 2: TẠO PHÒNG CHỜ MỚI (Tối giản: 1 Nút tạo phòng mở sảnh)   */
          /* Các thiết lập (map, laps, bot, v.v.) điều chỉnh trong sảnh!       */
          /* =============================================================== */
          <div className="relative z-10 flex flex-col items-center justify-center text-center py-6 px-4 space-y-5 min-h-[360px]">
            {/* Host Icon with Ambient Glow */}
            <div className="relative">
              <div
                className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl border-2 transition-transform hover:scale-105 ${
                  isNight
                    ? 'bg-gradient-to-br from-[#1C1304] to-[#0A0701] border-amber-400 text-amber-400 shadow-[0_0_35px_rgba(250,204,21,0.35)]'
                    : 'bg-amber-50 border-amber-500 text-amber-600 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                }`}
              >
                <Crown className="w-10 h-10 stroke-[2.2]" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Explanatory Heading */}
            <div className="space-y-1.5 max-w-md">
              <h3
                className={`text-lg sm:text-xl font-sci font-black uppercase tracking-wide ${
                  isNight ? 'text-white' : 'text-slate-900'
                }`}
              >
                KHỞI TẠO PHÒNG CHỜ MỚI
              </h3>
              <p
                className={`text-xs sm:text-sm leading-relaxed ${
                  isNight ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Hệ thống sẽ cấp ngay một mã phòng ID trực tuyến. Bạn có thể tự do chọn bản đồ, số vòng đua, thêm bot AI và chia đội ngay bên trong sảnh phòng!
              </p>
            </div>

            {/* In-Lobby Capabilities Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg text-[11px]">
              <span
                className={`px-3 py-1 rounded-xl border font-bold flex items-center gap-1.5 ${
                  isNight
                    ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                    : 'bg-sky-50 border-sky-300 text-sky-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Chọn 15 bản đồ trong sảnh</span>
              </span>
              <span
                className={`px-3 py-1 rounded-xl border font-bold flex items-center gap-1.5 ${
                  isNight
                    ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                    : 'bg-amber-50 border-amber-300 text-amber-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Chỉnh 1 – 5 vòng đua</span>
              </span>
              <span
                className={`px-3 py-1 rounded-xl border font-bold flex items-center gap-1.5 ${
                  isNight
                    ? 'bg-purple-500/15 border-purple-400/40 text-purple-300'
                    : 'bg-purple-50 border-purple-300 text-purple-800'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>Thêm Bot AI hoặc mời bạn</span>
              </span>
            </div>

            {/* Single Big Action Button */}
            <div className="pt-2 w-full max-w-sm">
              <button
                type="button"
                onClick={handleCreateRoomAndOpenLobby}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#FACC15] hover:brightness-110 text-slate-950 font-sci font-black text-sm uppercase tracking-wider cursor-pointer shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>TẠO PHÒNG & MỞ SẢNH ĐẤU →</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 4. FOOTER ACTIONS (h-[48px] shrink-0)                             */}
        {/* ================================================================= */}
        <div
          className={`relative z-10 h-[48px] shrink-0 flex items-center justify-between pt-2 border-t ${
            isNight ? 'border-cyan-500/20' : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              soundEngine.playCoin();
              onClose();
            }}
            className={`h-9 px-3.5 rounded-xl font-sci font-bold text-xs uppercase tracking-wider cursor-pointer transition-all border ${
              isNight
                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-600'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-sm'
            }`}
          >
            ĐÓNG
          </button>

          {activeTab === 'scan' ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playCoin();
                setActiveTab('host');
              }}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#D97706] to-[#FACC15] hover:brightness-110 text-[#050811] font-sci font-black text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>CHUYỂN SANG TẠO PHÒNG →</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.playCoin();
                setActiveTab('scan');
              }}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#38BDF8] hover:brightness-110 text-[#050811] font-sci font-black text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>QUAY LẠI TỰ QUÉT SÓNG</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

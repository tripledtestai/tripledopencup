import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  X,
  Settings,
  LogOut,
  Bot,
  Play,
  Users,
  Trophy,
  Key,
  RefreshCw,
  Compass,
  MapPin,
  Moon,
  Sun,
  Sparkles,
  Flag,
  Zap,
  Trash2,
  Shuffle,
  Car,
  Plus,
  Crown,
  Shield,
  Coins,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { MapPreviewCanvas } from './MapPreviewCanvas';
import {
  ALL_PARTS,
  BOT_NAMES,
  DEFAULT_LOADOUT,
  DEFAULT_TUNING_LOADOUT,
  EMPTY_TUNING_PRESETS,
  MAPS,
  TIER_COLORS,
} from '../game/constants';
import {
  balanceTeamsByRP,
  buildComputedStats,
  calculateCarClass,
  calculateCoinReward,
  calculateTuningPhysics,
  type ComputedTuningPhysics,
  DIFFICULTY_COIN_MULTIPLIERS,
  generateBotTuningLoadout,
  getLapCoinMultiplier,
  getRankByRP,
  isNightMapTheme,
  normalizeTuningPresets,
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
import { multiplayerService } from '../services/multiplayer';
import { soundEngine } from '../services/sound';
import { RankAvatarFrame, RankCrest } from './RankBadge';
import { TeacherNavHeader, TeacherWorkspaceTab } from './TeacherNavHeader';
import { WarmupCanvas } from './WarmupCanvas';
import { SettingsModal } from './SettingsModal';

const THEME_ACCENTS: Record<string, { border: string; text: string; label: string; dot: string }> = {
  city: { border: 'border-sky-500/50', text: 'text-sky-400', label: 'ĐÔ THỊ', dot: 'bg-sky-400' },
  aorta: { border: 'border-rose-500/50', text: 'text-rose-400', label: 'MẠCH MÁU', dot: 'bg-rose-500' },
  swamp: { border: 'border-emerald-500/50', text: 'text-emerald-400', label: 'RỪNG RẬM', dot: 'bg-emerald-400' },
  dna: { border: 'border-indigo-500/50', text: 'text-indigo-400', label: 'XOẮN ADN', dot: 'bg-indigo-400' },
  cryo: { border: 'border-cyan-400/50', text: 'text-cyan-300', label: 'ĐÔNG LẠNH', dot: 'bg-cyan-400' },
  synapse: { border: 'border-purple-500/50', text: 'text-purple-400', label: 'NƠ-RON', dot: 'bg-purple-400' },
  gastric: { border: 'border-amber-500/50', text: 'text-amber-400', label: 'DẠ DÀY', dot: 'bg-amber-400' },
  chloroplast: { border: 'border-lime-500/50', text: 'text-lime-400', label: 'LỤC LẠP', dot: 'bg-lime-400' },
  bioworld: { border: 'border-teal-500/50', text: 'text-teal-400', label: 'BIO-WORLD', dot: 'bg-teal-400' },
  airport: { border: 'border-orange-500/50', text: 'text-orange-400', label: 'SÂN BAY', dot: 'bg-orange-400' },
  polypeptide: { border: 'border-pink-500/50', text: 'text-pink-400', label: 'POLYPEPTIDE', dot: 'bg-pink-400' },
  ribosome: { border: 'border-emerald-500/50', text: 'text-emerald-300', label: 'RIBOSOME', dot: 'bg-emerald-400' },
  cochlea: { border: 'border-cyan-500/50', text: 'text-cyan-300', label: 'ỐC TAI', dot: 'bg-cyan-400' },
  macrophage: { border: 'border-rose-500/50', text: 'text-rose-300', label: 'ĐẠI THỰC BÀO', dot: 'bg-rose-400' },
  unknown_cell: { border: 'border-teal-400/50', text: 'text-teal-300', label: 'VI SINH 1 CHIỀU', dot: 'bg-teal-400' },
};

interface LobbyViewProps {
  lobby: LobbyConfig;
  currentStudent: StudentAccount | null;
  teacherProfile: StudentAccount;
  isTeacher: boolean;
  fbConnected: boolean;
  allStudents: StudentAccount[];
  playerPhysicsRef?: React.MutableRefObject<ComputedTuningPhysics>;
  onStartRace: (finalLobby: LobbyConfig) => void;
  onBackToMenu: () => void;
  onOpenGarage?: (tab?: 'cosmetics' | 'tuning') => void;
  onSelectTeacherTab?: (tab: TeacherWorkspaceTab) => void;
  onOpenFirebaseModal?: () => void;
  onOpenMatchmaking?: () => void;
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

export const LobbyView: React.FC<LobbyViewProps> = ({
  lobby,
  currentStudent,
  teacherProfile,
  isTeacher,
  fbConnected,
  allStudents: _allStudents,
  playerPhysicsRef,
  onStartRace,
  onBackToMenu,
  onOpenGarage,
  onSelectTeacherTab,
  onOpenFirebaseModal,
  onOpenMatchmaking,
  onLogout,
}) => {
  const activeMode: PlayModeCategory =
    lobby.playModeCategory || (isTeacher ? 'teacher_cup' : 'practice_ai');
  const teacherRewards: TournamentRewardConfig =
    lobby.teacherRewards || DEFAULT_TEACHER_REWARDS;
  const botDifficulty: BotDifficulty = lobby.botDifficulty || 'medium';

  const fallbackPhysicsRef = React.useRef<ComputedTuningPhysics>(
    dualDB.getAuthoritativeLocalTuning(
      isTeacher ? 'teacher_host' : currentStudent?.id || null,
      isTeacher
    ).physics
  );
  const activePhysicsRef = playerPhysicsRef || fallbackPhysicsRef;

  // Keep activePhysicsRef synced with local player's authoritative equipped tuning
  React.useEffect(() => {
    const auth = dualDB.getAuthoritativeLocalTuning(
      isTeacher ? 'teacher_host' : currentStudent?.id || null,
      isTeacher
    );
    activePhysicsRef.current = auth.physics;
  }, [
    isTeacher,
    currentStudent?.id,
    currentStudent?.tuningLoadout,
    currentStudent?.activePresetIndex,
    teacherProfile.tuningLoadout,
    teacherProfile.activePresetIndex,
    activePhysicsRef,
  ]);

  // Student Join Teacher Room Code state (Requirement #1: Student must enter Teacher room code)
  const [teacherPinInput, setTeacherPinInput] = useState('');
  const [joinedTeacherPin, setJoinedTeacherPin] = useState<string | null>(null);
  const [teacherPinError, setTeacherPinError] = useState<string | null>(null);

  // Student Friends Room Create / Join state (Requirement #2)
  const [_friendSubTab, _setFriendSubTab] = useState<'create' | 'join'>('create');
  const [friendPinInput, setFriendPinInput] = useState('');
  const [joinedFriendPin, setJoinedFriendPin] = useState<string | null>(() => {
    return lobby.isFriendGuest && lobby.friendRoomPin ? lobby.friendRoomPin : null;
  });
  const [friendRoomFeedback, setFriendRoomFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  React.useEffect(() => {
    if (lobby.isFriendGuest && lobby.friendRoomPin && joinedFriendPin !== lobby.friendRoomPin) {
      setJoinedFriendPin(lobby.friendRoomPin);
    }
  }, [lobby.isFriendGuest, lobby.friendRoomPin, joinedFriendPin]);

  React.useEffect(() => {
    if (!friendRoomFeedback) return;
    const timer = setTimeout(() => {
      setFriendRoomFeedback(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [friendRoomFeedback]);

  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showBotModal, setShowBotModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [netStatus, setNetStatus] = useState(multiplayerService.getStatus());

  const activeRoomPin =
    activeMode === 'teacher_cup'
      ? joinedTeacherPin || lobby.roomPin
      : activeMode === 'friends_pvp'
      ? joinedFriendPin || lobby.friendRoomPin
      : null;

  const stateRef = React.useRef({
    lobby,
    currentStudent,
    teacherProfile,
    isTeacher,
    activeMode,
    activeRoomPin,
    joinedFriendPin,
    joinedTeacherPin,
  });
  React.useEffect(() => {
    stateRef.current = {
      lobby,
      currentStudent,
      teacherProfile,
      isTeacher,
      activeMode,
      activeRoomPin,
      joinedFriendPin,
      joinedTeacherPin,
    };
  }, [
    lobby,
    currentStudent,
    teacherProfile,
    isTeacher,
    activeMode,
    activeRoomPin,
    joinedFriendPin,
    joinedTeacherPin,
  ]);

  // Clean disconnect on tab close, reload, or navigation away
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      const {
        currentStudent: curStudent,
        isTeacher: curIsTeacher,
        activeMode: curMode,
        joinedFriendPin: curJoinedFriendPin,
        activeRoomPin: curActiveRoomPin,
      } = stateRef.current;

      const curIsHost =
        curMode === 'teacher_cup'
          ? curIsTeacher
          : curMode === 'friends_pvp'
          ? !curJoinedFriendPin
          : true;

      const myId = curIsTeacher ? 'teacher_host' : curStudent?.id;

      if (curIsHost && curActiveRoomPin) {
        dualDB.removeMatchmakingRoom(curActiveRoomPin);
        dualDB.removeRoomState(curActiveRoomPin);
      }
      multiplayerService.leaveRoom(myId, curIsHost);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, []);

  // Listen to Firebase room players' computedStats (`rooms/{roomPin}/players/{playerId}/computedStats`)
  React.useEffect(() => {
    if (!activeRoomPin || activeMode === 'practice_ai') return;
    return dualDB.listenRoomPlayersComputedStats(activeRoomPin, (statsMap) => {
      const curLobby = stateRef.current.lobby;
      if (!curLobby.participants || curLobby.participants.length === 0) return;
      let changed = false;
      const nextParticipants = curLobby.participants.map((p) => {
        const remoteStats = statsMap[p.id.toLowerCase()] || statsMap[p.id];
        if (
          remoteStats &&
          JSON.stringify(p.computedStats) !== JSON.stringify(remoteStats)
        ) {
          changed = true;
          return {
            ...p,
            computedStats: remoteStats,
          };
        }
        return p;
      });
      if (changed) {
        dualDB.updateLobby({ participants: nextParticipants });
      }
    });
  }, [activeRoomPin, activeMode, fbConnected]);

  React.useEffect(() => {
    const unsubStatus = multiplayerService.subscribeStatus((st) => {
      setNetStatus(st);
    });

    const unsubMsg = multiplayerService.subscribe((msg, conn) => {
      const {
        lobby: curLobby,
        currentStudent: curStudent,
        teacherProfile: curTeacher,
        isTeacher: curIsTeacher,
        activeMode: curMode,
        joinedFriendPin: curJoinedFriendPin,
      } = stateRef.current;

      const curIsHost =
        curMode === 'teacher_cup'
          ? curIsTeacher
          : curMode === 'friends_pvp'
          ? !curJoinedFriendPin
          : true;

      if (msg.type === 'JOIN_REQUEST') {
        if (!curIsHost) return;
        const guestRaw = msg.student;
        const hostAuth = dualDB.getAuthoritativeLocalTuning(
          curIsTeacher ? 'teacher_host' : curStudent?.id || null,
          curIsTeacher
        );
        const hostParticipant: LobbyConfig['participants'][0] = curIsTeacher
          ? {
              id: 'teacher_host',
              username: curTeacher.username || 'Thầy/Cô TripleD',
              rp: curTeacher.rp || 750,
              teamId: 1,
              loadout: curTeacher.loadout || DEFAULT_LOADOUT,
              tuningLoadout: hostAuth.tuningLoadout,
              computedStats: hostAuth.computedStats,
              isBot: false,
              isTeacher: true,
            }
          : {
              id: curStudent?.id || 'host',
              username: curStudent?.username || 'Chủ Phòng',
              rp: curStudent?.rp || 0,
              teamId: 1,
              loadout: curStudent?.loadout || DEFAULT_LOADOUT,
              tuningLoadout: hostAuth.tuningLoadout,
              computedStats: hostAuth.computedStats,
              isBot: false,
            };

        // Guarantee guest has unique ID even if testing on same account/device
        const guestId =
          guestRaw.id === hostParticipant.id
            ? `${guestRaw.id}_guest_${conn?.peer?.slice(-4) || Date.now()}`
            : guestRaw.id;

        const guestComputedStats =
          msg.computedStats ||
          guestRaw.computedStats ||
          buildComputedStats(guestRaw.tuningLoadout);

        const guestParticipant: LobbyConfig['participants'][0] = {
          id: guestId,
          username: guestRaw.username,
          rp: guestRaw.rp,
          teamId: (curLobby.participants.length % curLobby.teamCount) + 1,
          loadout: guestRaw.loadout,
          computedStats: guestComputedStats,
          isBot: false,
        };

        const currentRoster = curLobby.participants;
        const rosterWithHost = currentRoster.some(
          (p) => p.id === hostParticipant.id
        )
          ? currentRoster.map((p) =>
              p.id === hostParticipant.id
                ? {
                    ...p,
                    tuningLoadout: hostAuth.tuningLoadout,
                    computedStats: hostAuth.computedStats,
                  }
                : p
            )
          : [hostParticipant, ...currentRoster];

        const exists = rosterWithHost.some((p) => p.id === guestParticipant.id);
        const updatedRoster = exists
          ? rosterWithHost.map((p) =>
              p.id === guestParticipant.id
                ? {
                    ...p,
                    username: guestParticipant.username,
                    rp: guestParticipant.rp,
                    loadout: guestParticipant.loadout,
                    computedStats: guestComputedStats,
                  }
                : p
            )
          : [...rosterWithHost, guestParticipant];

        const nextLobby = { ...curLobby, participants: updatedRoster };
        dualDB.updateLobby(nextLobby);

        // Strip secret part IDs (`tuningLoadout`) before broadcasting roster to peers
        const networkParticipants = updatedRoster.map((p) => ({
          ...p,
          tuningLoadout: p.isBot ? p.tuningLoadout : undefined,
        }));
        multiplayerService.broadcast({
          type: 'JOIN_ACCEPTED',
          lobby: { ...nextLobby, participants: networkParticipants },
          participants: networkParticipants,
        });
        setFriendRoomFeedback({
          ok: true,
          text: `🎉 ${guestRaw.username} vừa vào phòng! Đã đồng bộ chỉ số xe Online.`,
        });
        soundEngine.playFanfare(false);
      } else if (msg.type === 'JOIN_ACCEPTED') {
        if (curIsHost) return;
        const myId = curIsTeacher ? 'teacher_host' : curStudent?.id;
        const myAuth = dualDB.getAuthoritativeLocalTuning(
          myId || null,
          curIsTeacher
        );
        activePhysicsRef.current = myAuth.physics;

        // Preserve local player's authoritative tuningLoadout & computedStats
        const mergedParticipants = (msg.participants || []).map((p) =>
          myId && p.id.toLowerCase() === myId.toLowerCase()
            ? {
                ...p,
                tuningLoadout: myAuth.tuningLoadout,
                computedStats: myAuth.computedStats,
              }
            : p
        );

        dualDB.updateLobby({
          ...msg.lobby,
          participants: mergedParticipants,
        });
        if (curMode === 'teacher_cup') {
          setJoinedTeacherPin(msg.lobby.roomPin);
          setTeacherPinError(null);
        }
        setFriendRoomFeedback({
          ok: true,
          text: `🎉 Đã vào phòng thành công! Sẵn sàng xuất phát cùng chủ phòng.`,
        });
        soundEngine.playFanfare(false);
      } else if (msg.type === 'LOBBY_UPDATE') {
        if (curIsHost) return;
        const myId = curIsTeacher ? 'teacher_host' : curStudent?.id;
        const myAuth = dualDB.getAuthoritativeLocalTuning(
          myId || null,
          curIsTeacher
        );
        const nextLobbyPatch = { ...msg.lobby };
        if (Array.isArray(nextLobbyPatch.participants)) {
          nextLobbyPatch.participants = nextLobbyPatch.participants.map((p) =>
            myId && p.id.toLowerCase() === myId.toLowerCase()
              ? {
                  ...p,
                  tuningLoadout: myAuth.tuningLoadout,
                  computedStats: myAuth.computedStats,
                }
              : p
          );
        }
        dualDB.updateLobby(nextLobbyPatch);
      } else if (msg.type === 'PLAYER_STATS_UPDATE') {
        const targetId = msg.playerId.toLowerCase();
        const updatedRoster = curLobby.participants.map((p) =>
          p.id.toLowerCase() === targetId
            ? {
                ...p,
                computedStats: msg.computedStats,
              }
            : p
        );
        dualDB.updateLobby({ participants: updatedRoster });
      } else if (
        msg.type === 'HOST_LEFT' ||
        (msg.type === 'LEAVE_ROOM' && msg.isHost)
      ) {
        if (!curIsHost) {
          multiplayerService.disconnect();
          setJoinedFriendPin(null);
          setJoinedTeacherPin(null);
          setFriendRoomFeedback({
            ok: false,
            text: '🚪 Chủ phòng đã rời và giải tán phòng đua!',
          });
          soundEngine.playHazardHit();
          dualDB.updateLobby({ participants: [] });
        }
      } else if (msg.type === 'LEAVE_ROOM') {
        const leaveId = msg.participantId?.toLowerCase();
        const currentRoster = curLobby.participants;
        const leavingPlayer = currentRoster.find(
          (p) =>
            leaveId &&
            (p.id.toLowerCase() === leaveId ||
              p.id.toLowerCase().startsWith(`${leaveId}_guest_`))
        );
        const updatedRoster = leaveId
          ? currentRoster.filter(
              (p) =>
                p.id.toLowerCase() !== leaveId &&
                !p.id.toLowerCase().startsWith(`${leaveId}_guest_`)
            )
          : currentRoster;
        const nextLobby = { ...curLobby, participants: updatedRoster };
        dualDB.updateLobby(nextLobby);
        const leavingName = leavingPlayer?.username || 'Một người chơi';
        setFriendRoomFeedback({
          ok: true,
          text: `👋 ${leavingName} đã rời khỏi phòng.`,
        });

        if (curIsHost) {
          const networkParticipants = updatedRoster.map((p) => ({
            ...p,
            tuningLoadout: p.isBot ? p.tuningLoadout : undefined,
          }));
          multiplayerService.broadcast({
            type: 'LOBBY_UPDATE',
            lobby: { participants: networkParticipants },
          });

          const activePin = curLobby.friendRoomPin || curLobby.roomPin;
          if (activePin) {
            dualDB.updateMatchmakingRoom(activePin, {
              participantsCount: Math.max(
                1,
                updatedRoster.filter((p) => !p.isBot).length
              ),
            });
          }
        }
      } else if (msg.type === 'KICK_PLAYER') {
        const myId = curIsTeacher ? 'teacher_host' : curStudent?.id;
        if (
          myId &&
          (msg.playerId.toLowerCase() === myId.toLowerCase() ||
            msg.playerId.toLowerCase().startsWith(`${myId.toLowerCase()}_guest_`))
        ) {
          multiplayerService.disconnect();
          setJoinedFriendPin(null);
          setJoinedTeacherPin(null);
          setFriendRoomFeedback({
            ok: false,
            text: '🚫 Bạn đã bị chủ phòng mời ra khỏi phòng đua!',
          });
          dualDB.updateLobby({ participants: [] });
        } else {
          const currentRoster = curLobby.participants;
          const updatedRoster = currentRoster.filter((p) => p.id !== msg.playerId);
          dualDB.updateLobby({ participants: updatedRoster });
        }
      } else if (msg.type === 'START_RACE') {
        // Principle 1: Client-Authoritative Local Car Physics!
        // NEVER let START_RACE from Host reset local player's tuningLoadout or computedStats to baseStats!
        const myId = curIsTeacher ? 'teacher_host' : curStudent?.id;
        const myAuth = dualDB.getAuthoritativeLocalTuning(
          myId || null,
          curIsTeacher
        );
        activePhysicsRef.current = myAuth.physics;

        const safeParticipants = (msg.lobby.participants || []).map((p) => {
          if (
            myId &&
            (p.id.toLowerCase() === myId.toLowerCase() ||
              p.id.toLowerCase().startsWith(`${myId.toLowerCase()}_guest_`))
          ) {
            return {
              ...p,
              tuningLoadout: myAuth.tuningLoadout,
              computedStats: myAuth.computedStats,
            };
          }
          // Preserve any latest computedStats we received in curLobby
          const existingPeer = curLobby.participants.find(
            (cp) => cp.id.toLowerCase() === p.id.toLowerCase()
          );
          return {
            ...p,
            computedStats:
              p.computedStats ||
              existingPeer?.computedStats ||
              buildComputedStats(p.tuningLoadout),
          };
        });

        const clientAuthoritativeLobby: LobbyConfig = {
          ...msg.lobby,
          participants: safeParticipants,
        };
        soundEngine.playFanfare(true);
        dualDB.updateLobby(clientAuthoritativeLobby);
        onStartRace(clientAuthoritativeLobby);
      }
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, [onStartRace, activePhysicsRef]);

  const getHostAccount = (): StudentAccount | null => {
    const auth = dualDB.getAuthoritativeLocalTuning(
      isTeacher ? 'teacher_host' : currentStudent?.id || null,
      isTeacher
    );
    if (isTeacher) {
      return {
        id: 'teacher_host',
        username: teacherProfile.username || 'Thầy/Cô TripleD',
        email: 'teacher@tripled.edu.vn',
        pin: '9999',
        rp: teacherProfile.rp || 750,
        coins: 99999,
        ownedParts: [],
        loadout: teacherProfile.loadout || DEFAULT_LOADOUT,
        tuningLoadout: auth.tuningLoadout,
        computedStats: auth.computedStats,
        lastActive: Date.now(),
        usedGiftcodes: [],
        matchHistory: [],
        totalMatches: 0,
        top1Count: 0,
        gachaPity: 0,
      };
    }
    if (!currentStudent) return null;
    return {
      ...currentStudent,
      tuningLoadout: auth.tuningLoadout,
      computedStats: auth.computedStats,
    };
  };

  // Auto-host room when in friends_pvp (for anyone) or teacher_cup (ONLY for Teacher) with a fresh unique PIN
  React.useEffect(() => {
    if (activeMode === 'friends_pvp') {
      if (joinedFriendPin) {
        // Guest joining: connect to host
        multiplayerService.joinRoom(joinedFriendPin, getHostAccount());
      } else {
        // Host: create and announce room
        const pin =
          lobby.friendRoomPin ||
          dualDB.generateNewFriendRoomPin(
            currentStudent?.username || 'Bạn Bè TripleD'
          );
        multiplayerService.hostRoom(pin, getHostAccount());

        // Register room in matchmaking so radar scan discovers it!
        const hostAcc = getHostAccount();
        dualDB.registerMatchmakingRoom({
          roomPin: pin,
          hostId: hostAcc?.id || 'host',
          hostName: hostAcc?.username || 'Chủ Phòng',
          hostRp: hostAcc?.rp || 0,
          mapId: lobby.mapId,
          participantsCount: Math.max(
            1,
            (lobby.participants || []).filter((p) => !p.isBot).length
          ),
          maxPlayers: lobby.raceMode === 'team' ? lobby.teamCount * 4 : 8,
          status: 'waiting',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    } else if (activeMode === 'teacher_cup' && isTeacher) {
      const pin = lobby.roomPin || dualDB.generateNewRoomPin();
      multiplayerService.hostRoom(pin, getHostAccount());
    }
  }, [
    activeMode,
    joinedFriendPin,
    isTeacher,
    currentStudent?.id,
    teacherProfile.id,
  ]);

  // Sync matchmaking entry status for open friend room
  React.useEffect(() => {
    if (activeMode !== 'friends_pvp' || joinedFriendPin || !activeRoomPin) return;
    dualDB.updateMatchmakingRoom(activeRoomPin, {
      mapId: lobby.mapId,
      participantsCount: Math.max(
        1,
        (lobby.participants || []).filter((p) => !p.isBot).length
      ),
      status: lobby.status === 'racing' ? 'racing' : 'waiting',
    });
  }, [
    activeMode,
    joinedFriendPin,
    activeRoomPin,
    lobby.mapId,
    lobby.participants,
    lobby.status,
  ]);

  // Clean up matchmaking room when leaving
  React.useEffect(() => {
    return () => {
      if (activeMode === 'friends_pvp' && !joinedFriendPin && activeRoomPin) {
        dualDB.removeMatchmakingRoom(activeRoomPin);
      }
    };
  }, [activeMode, joinedFriendPin, activeRoomPin]);

  const [manualBots, setManualBots] = useState<LobbyConfig['participants']>([]);

  const handleAddManualBot = (count: number = 1) => {
    setManualBots((prev) => {
      if (prev.length >= 49) return prev;
      const added: LobbyConfig['participants'] = [];
      for (let c = 0; c < count; c++) {
        const idx = prev.length + c;
        if (idx >= 49) break;
        const botName = BOT_NAMES[idx % BOT_NAMES.length] || `Bot ${idx + 1}`;
        const botTuning = generateBotTuningLoadout(idx + 2);
        added.push({
          id: `manual_bot_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          username: `🤖 ${botName}`,
          rp: 140 + ((idx * 83) % 480),
          teamId: 1,
          loadout: generateBotLoadout(idx + 2),
          tuningLoadout: botTuning,
          computedStats: buildComputedStats(botTuning),
          isBot: true,
        });
      }
      return [...prev, ...added];
    });
    soundEngine.playCoin();
  };

  const handleRemoveManualBot = (botId: string) => {
    setManualBots((prev) => prev.filter((b) => b.id !== botId));
    soundEngine.playCoin();
  };

  const handleKickPlayer = (targetId: string) => {
    if (manualBots.some((b) => b.id === targetId)) {
      handleRemoveManualBot(targetId);
      return;
    }
    const kicked = lobby.participants.find((p) => p.id === targetId);
    multiplayerService.broadcast({
      type: 'KICK_PLAYER',
      playerId: targetId,
    });
    const updated = (lobby.participants || []).filter((p) => p.id !== targetId);
    dualDB.updateLobby({ participants: updated });
    setFriendRoomFeedback({
      ok: true,
      text: `🚫 Đã mời ${kicked?.username || 'tay đua'} ra khỏi phòng.`,
    });
    soundEngine.playCoin();
  };

  const handleClearManualBots = () => {
    setManualBots([]);
    soundEngine.playCoin();
  };

  const buildActiveRoster = (
    botCountOverride?: number,
    hostModeOverride?: 'spectator' | 'play',
    teamCountOverride?: 2 | 3 | 4,
    modeOverride?: PlayModeCategory
  ) => {
    const mCat = modeOverride !== undefined ? modeOverride : activeMode;
    const hMode =
      hostModeOverride !== undefined ? hostModeOverride : lobby.hostMode;

    const list: LobbyConfig['participants'] = [];
    const localAuth = dualDB.getAuthoritativeLocalTuning(
      isTeacher ? 'teacher_host' : currentStudent?.id || null,
      isTeacher
    );

    // Real local student (Client-Authoritative tuningLoadout & computedStats)
    if (currentStudent && !isTeacher) {
      list.push({
        id: currentStudent.id,
        username: currentStudent.username,
        rp: currentStudent.rp,
        teamId: 1,
        loadout: currentStudent.loadout,
        tuningLoadout: localAuth.tuningLoadout,
        computedStats: localAuth.computedStats,
        isBot: false,
      });
    }

    // Real teacher host (Client-Authoritative tuningLoadout & computedStats)
    if (isTeacher && (hMode === 'play' || mCat !== 'teacher_cup')) {
      list.push({
        id: 'teacher_host',
        username: teacherProfile.username || 'Thầy/Cô TripleD',
        rp: teacherProfile.rp || 750,
        teamId: 1,
        loadout: teacherProfile.loadout || DEFAULT_LOADOUT,
        tuningLoadout: localAuth.tuningLoadout,
        computedStats: localAuth.computedStats,
        isBot: false,
        isTeacher: true,
      });
    }

    // Real connected participants: ONLY included if in active multiplayer room and actually connected
    if (mCat === 'friends_pvp') {
      const isOnlineGuest = Boolean(joinedFriendPin);
      if (
        (isOnlineGuest && netStatus.connected) ||
        (!isOnlineGuest && netStatus.peerCount > 0)
      ) {
        for (const p of lobby.participants) {
          if (!list.some((existing) => existing.id === p.id) && !p.isBot) {
            const dbStudent = dualDB.getStudent(p.id);
            list.push({
              ...p,
              computedStats:
                p.computedStats ||
                dbStudent?.computedStats ||
                buildComputedStats(p.tuningLoadout || dbStudent?.tuningLoadout),
              isBot: false,
            });
          }
        }
      }
    } else if (mCat === 'teacher_cup') {
      const isOnlineGuest = Boolean(joinedTeacherPin);
      if (
        (isOnlineGuest && netStatus.connected) ||
        (isTeacher && netStatus.peerCount > 0)
      ) {
        for (const p of lobby.participants) {
          if (!list.some((existing) => existing.id === p.id) && !p.isBot) {
            const dbStudent = dualDB.getStudent(p.id);
            list.push({
              ...p,
              computedStats:
                p.computedStats ||
                dbStudent?.computedStats ||
                buildComputedStats(p.tuningLoadout || dbStudent?.tuningLoadout),
              isBot: false,
            });
          }
        }
      }
    }
    // In practice_ai: Pure solo mode, NEVER add other remote players!

    // Manual bots (ONLY when explicitly created by user)
    for (const bot of manualBots) {
      if (!list.some((existing) => existing.id === bot.id)) {
        list.push(bot);
      }
    }

    return list;
  };

  const activeParticipants = buildActiveRoster();

  const handleSelectModeCategory = (mode: PlayModeCategory) => {
    const nextHostMode =
      isTeacher && mode !== 'teacher_cup' ? 'play' : lobby.hostMode;
    setManualBots([]); // Reset manual bots when switching mode
    dualDB.updateLobby({
      playModeCategory: mode,
      hostMode: nextHostMode,
      botCount: 0,
      participants: [],
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

  const handleStudentJoinTeacherRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherPinError(null);
    const cleaned = teacherPinInput.trim();
    if (cleaned.length < 4) {
      setTeacherPinError('Vui lòng nhập mã ID phòng Giải Đấu hợp lệ (4-6 chữ số)!');
      return;
    }

    setTeacherPinError(null);
    setFriendRoomFeedback({
      ok: true,
      text: `Đang kết nối P2P tới phòng Giải Đấu TripleD #${cleaned}...`,
    });

    const ok = await multiplayerService.joinRoom(cleaned, getHostAccount());
    if (ok) {
      setJoinedTeacherPin(cleaned);
      dualDB.updateLobby({ roomPin: cleaned });
      setTeacherPinError(null);
      setFriendRoomFeedback({
        ok: true,
        text: `🟢 Đã kết nối vào phòng Giải Đấu #${cleaned}! Chờ chủ phòng bắt đầu...`,
      });
      soundEngine.playFanfare(false);
    } else {
      setTeacherPinError(
        `Không thể kết nối tới phòng Giải Đấu #${cleaned}. Hãy chắc chắn chủ phòng đã tạo mã này!`
      );
    }
  };

  const handleCreateNewTournamentRoom = async () => {
    if (!isTeacher) {
      setTeacherPinError('Chỉ Giáo Viên mới có quyền tạo hoặc đổi ID phòng Giải Đấu!');
      return;
    }
    multiplayerService.disconnect();
    const newPin = dualDB.generateNewRoomPin();
    setJoinedTeacherPin(null);
    setTeacherPinError(null);
    setManualBots([]);
    dualDB.updateLobby({
      roomPin: newPin,
      participants: [],
      botCount: 0,
      status: 'waiting',
    });
    setFriendRoomFeedback({
      ok: true,
      text: `Đang khởi tạo phòng Giải Đấu TripleD Online #${newPin}...`,
    });
    await multiplayerService.hostRoom(newPin, getHostAccount());
    setFriendRoomFeedback({
      ok: true,
      text: `🟢 Đã tạo phòng Giải Đấu TripleD Online! Mã ID Phòng: #${newPin}. Hãy gửi mã này cho học sinh để báo danh!`,
    });
    soundEngine.playFanfare(false);
  };

  const handleCreateNewFriendRoom = async () => {
    if (activeRoomPin) {
      dualDB.removeMatchmakingRoom(activeRoomPin);
      dualDB.removeRoomState(activeRoomPin);
    }
    multiplayerService.disconnect();
    const newPin = dualDB.generateNewFriendRoomPin(
      isTeacher
        ? teacherProfile.username
        : currentStudent?.username || 'Bạn Bè TripleD'
    );
    setJoinedFriendPin(null);
    setManualBots([]);
    dualDB.updateLobby({
      friendRoomPin: newPin,
      isFriendGuest: false,
      participants: [],
      botCount: 0,
      status: 'waiting',
    });
    setFriendRoomFeedback({
      ok: true,
      text: `Đang tạo phòng P2P Online #${newPin}...`,
    });
    await multiplayerService.hostRoom(newPin, getHostAccount());
    setFriendRoomFeedback({
      ok: true,
      text: `🟢 Đã mở phòng P2P Online! Mã ID Phòng: #${newPin}. Gửi mã này cho bạn bè để cùng đua!`,
    });
    soundEngine.playFanfare(false);
  };

  const handleJoinFriendRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = friendPinInput.trim();
    if (cleaned.length < 4) {
      setFriendRoomFeedback({
        ok: false,
        text: 'Vui lòng nhập mã phòng bạn bè hợp lệ (4-6 chữ số)!',
      });
      return;
    }
    setFriendRoomFeedback({
      ok: true,
      text: `Đang kết nối P2P tới phòng #${cleaned}...`,
    });
    const ok = await multiplayerService.joinRoom(cleaned, getHostAccount());
    if (ok) {
      setJoinedFriendPin(cleaned);
      dualDB.updateLobby({ friendRoomPin: cleaned });
      setFriendRoomFeedback({
        ok: true,
        text: `🟢 Đã kết nối tới phòng #${cleaned}! Chờ chủ phòng bắt đầu...`,
      });
      soundEngine.playFanfare(false);
    } else {
      setFriendRoomFeedback({
        ok: false,
        text: `Không thể kết nối phòng #${cleaned}. Hãy chắc chắn bạn bè của bạn đã tạo phòng này!`,
      });
    }
  };

  const handleLeaveRoom = () => {
    const myId = isTeacher ? 'teacher_host' : currentStudent?.id;
    if (isHost) {
      if (activeRoomPin) {
        dualDB.removeMatchmakingRoom(activeRoomPin);
        dualDB.removeRoomState(activeRoomPin);
      }
      multiplayerService.leaveRoom(myId, true);
    } else {
      multiplayerService.leaveRoom(myId, false);
    }
    setJoinedFriendPin(null);
    setJoinedTeacherPin(null);
    setFriendPinInput('');
    setTeacherPinInput('');
    setManualBots([]);
    setFriendRoomFeedback({ ok: true, text: 'Đã rời phòng đua.' });
    setTeacherPinError(null);
    const newPin = String(Math.floor(100000 + Math.random() * 900000));
    if (activeMode === 'teacher_cup') {
      dualDB.updateLobby({
        roomPin: newPin,
        participants: [],
        botCount: 0,
        status: 'waiting',
      });
    } else {
      dualDB.updateLobby({
        friendRoomPin: newPin,
        isFriendGuest: false,
        participants: [],
        botCount: 0,
        status: 'waiting',
      });
    }
    soundEngine.playCoin();
  };

  const handleExitLobby = React.useCallback(() => {
    const {
      currentStudent: curStudent,
      isTeacher: curIsTeacher,
      activeMode: curMode,
      joinedFriendPin: curJoinedFriendPin,
      activeRoomPin: curActiveRoomPin,
    } = stateRef.current;

    const curIsHost =
      curMode === 'teacher_cup'
        ? curIsTeacher
        : curMode === 'friends_pvp'
        ? !curJoinedFriendPin
        : true;

    const myId = curIsTeacher ? 'teacher_host' : curStudent?.id;

    if (curIsHost) {
      if (curActiveRoomPin) {
        dualDB.removeMatchmakingRoom(curActiveRoomPin);
        dualDB.removeRoomState(curActiveRoomPin);
      }
      multiplayerService.leaveRoom(myId, true);
    } else {
      multiplayerService.leaveRoom(myId, false);
    }

    setJoinedFriendPin(null);
    setJoinedTeacherPin(null);
    soundEngine.playCoin();
    onBackToMenu();
  }, [onBackToMenu]);

  // Only Teacher is host in TripleD Tournament; in Friends PvP whoever created the room is host
  const isHost =
    activeMode === 'teacher_cup'
      ? isTeacher
      : activeMode === 'friends_pvp'
      ? !joinedFriendPin || netStatus.isHost
      : true;

  const handleLaunchRace = () => {
    if (!isHost) return;
    if (activeMode === 'teacher_cup' && !isTeacher) return;

    const myId = isTeacher ? 'teacher_host' : currentStudent?.id || null;
    const localAuth = dualDB.getAuthoritativeLocalTuning(myId, isTeacher);
    activePhysicsRef.current = localAuth.physics;

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

    if (multiplayerService.isConnected()) {
      // Broadcast START_RACE with computedStats (omitting human tuningLoadout part names for privacy)
      const networkSafeLobby: LobbyConfig = {
        ...nextLobby,
        participants: finalRoster.map((p) => ({
          ...p,
          tuningLoadout: p.isBot ? p.tuningLoadout : undefined,
          computedStats:
            p.computedStats || buildComputedStats(p.tuningLoadout),
        })),
      };
      multiplayerService.broadcast({
        type: 'START_RACE',
        lobby: networkSafeLobby,
      });
    }

    dualDB.updateLobby(nextLobby);
    onStartRace(nextLobby);
  };

  const currentMapObj = MAPS.find((m) => m.id === lobby.mapId) || MAPS[0];
  const isCurrentMapNight = isNightMapTheme(currentMapObj.theme);

  const activeTop1Coins = calculateCoinReward(
    1,
    false,
    activeMode,
    teacherRewards,
    botDifficulty,
    lobby.laps
  );

  const handleSelectPreset = (idx: number) => {
    const myAcc = isTeacher ? teacherProfile : currentStudent;
    if (!myAcc) return;
    const presets = normalizeTuningPresets(
      myAcc.tuningPresets,
      isTeacher ? 'teacher_host' : myAcc.id
    );
    const p = presets[idx];
    if (!p || !p.loadout) {
      setFriendRoomFeedback({
        ok: false,
        text: `⚠️ Preset ${idx + 1} đang Trống! Hãy bấm 🔧 Độ Máy để cấu hình.`,
      });
      soundEngine.playHazardHit();
      return;
    }
    const myId = isTeacher ? 'teacher_host' : myAcc.id;
    const nextCarLoadout = p.carLoadout
      ? { ...p.carLoadout }
      : { ...myAcc.loadout };
    const nextPhysics = calculateTuningPhysics(p.loadout, 335, 395, 3.2, 2.0);
    const nextComputedStats = buildComputedStats(p.loadout);

    activePhysicsRef.current = nextPhysics;

    if (isTeacher) {
      dualDB.updateTeacherProfile({
        loadout: nextCarLoadout,
        tuningLoadout: p.loadout,
        tuningPresets: presets,
        computedStats: nextComputedStats,
        activePresetIndex: idx,
      });
    } else {
      dualDB.updateStudent({
        ...myAcc,
        loadout: nextCarLoadout,
        tuningLoadout: p.loadout,
        tuningPresets: presets,
        computedStats: nextComputedStats,
        activePresetIndex: idx,
      });
    }

    multiplayerService.sendComputedStatsUpdate(myId, nextComputedStats, p.name);

    const updatedLobbyParticipants = (lobby.participants || []).map((participant) =>
      participant.id.toLowerCase() === myId.toLowerCase()
        ? {
            ...participant,
            loadout: nextCarLoadout,
            tuningLoadout: p.loadout,
            computedStats: nextComputedStats,
          }
        : participant
    );
    dualDB.updateLobby({ participants: updatedLobbyParticipants });

    setFriendRoomFeedback({
      ok: true,
      text: `⚡ Đã trang bị cấu hình "${p.name}" (${p.totalCP}/25 CP) — Sẵn sàng xuất phát!`,
    });
    soundEngine.playCoin();
  };

  return (
    <div className="relative min-h-screen bg-[#060911] text-white p-2 sm:p-4 md:p-6 flex flex-col justify-center items-center select-none overflow-hidden">
      {/* Forza Horizon 6 & Asphalt 9 Ambient Stadium Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-35">
        <div className="absolute -top-32 left-1/5 w-[520px] h-[520px] rounded-full bg-[#06B6D4] blur-[150px]" />
        <div className="absolute bottom-0 right-1/5 w-[500px] h-[500px] rounded-full bg-[#F59E0B] blur-[150px]" />
      </div>

      <div className="relative z-10 w-[94vw] max-w-7xl h-[84vh] min-h-[590px] max-h-[840px] my-auto flex flex-col space-y-3 p-4 md:p-5 rounded-3xl bg-[#0B1120]/95 border-2 border-[#06B6D4]/60 shadow-[0_24px_80px_rgba(0,0,0,0.92)] overflow-hidden">
        {/* If Teacher: Render the Unified Teacher Navigation Bar */}
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
        {/* COMPACT TOP HEADER: BACK, MODE & CAR COUNT, SETTINGS & START      */}
        {/* ================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 rounded-2xl bg-[#090D16] border border-slate-800 shadow-md shrink-0">
          {/* Left: Navigation & Mode Indicator with Car Count */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExitLobby}
              title={isTeacher ? 'Quay lại quản trị' : 'Quay lại sảnh chính'}
              className="px-2.5 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs cursor-pointer inline-flex items-center gap-1 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="hidden sm:inline">{isTeacher ? 'Quản Trị' : 'Sảnh'}</span>
            </button>

            {/* Mode Title with Vehicle Count Badge */}
            <div className="flex items-center gap-2 bg-[#0F172A] px-2.5 py-1 rounded-xl border border-slate-800">
              {activeMode === 'practice_ai' && (
                <span className="text-xs font-black text-[#38BDF8] flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Solo AI</span>
                </span>
              )}
              {activeMode === 'friends_pvp' && (
                <span className="text-xs font-black text-[#38BDF8] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Bạn Bè P2P</span>
                </span>
              )}
              {activeMode === 'teacher_cup' && (
                <span className="text-xs font-black text-[#FEF08A] flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-[#FEF08A]" />
                  <span>Giải Đấu</span>
                </span>
              )}

              <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-mono-num font-bold text-[#38BDF8]">
                {activeParticipants.length} Xe
              </span>
            </div>
          </div>

          {/* Center: Online Room Controls (Compact) */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeMode === 'friends_pvp' &&
              (joinedFriendPin ? (
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>#{joinedFriendPin}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCreateNewFriendRoom}
                    title="Tạo ID phòng mới"
                    className="p-1.5 rounded-lg bg-[#090D16] hover:bg-[#1E293B] border border-[#06B6D4] text-[#38BDF8] text-xs font-bold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#38BDF8]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleLeaveRoom}
                    title="Rời phòng"
                    className="px-2 py-1 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/60 text-rose-200 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1 bg-[#090D16] px-2.5 py-1 rounded-xl border border-[#06B6D4]/50 text-xs">
                    <span className="text-slate-400 font-medium">ID:</span>
                    <span className="font-mono-num font-black text-[#FEF08A]">
                      #{lobby.friendRoomPin || '668899'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCreateNewFriendRoom}
                      title="Tạo ID mới"
                      className="ml-1 text-[#38BDF8] hover:text-white cursor-pointer font-bold p-0.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>

                  <form onSubmit={handleJoinFriendRoom} className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Nhập ID..."
                      value={friendPinInput}
                      onChange={(e) => setFriendPinInput(e.target.value.replace(/\D/g, ''))}
                      className="w-20 px-2 py-1 rounded-xl bg-[#090D16] border border-[#38BDF8]/60 font-mono-num text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-[#38BDF8]"
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 rounded-xl bg-[#06B6D4] hover:bg-[#38BDF8] text-[#090D16] font-black text-xs cursor-pointer shrink-0 transition-colors"
                    >
                      Vào
                    </button>
                  </form>
                </div>
              ))}

            {activeMode === 'teacher_cup' &&
              (isTeacher ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-[#090D16] px-2.5 py-1 rounded-xl border border-[#F59E0B]/50 text-xs">
                    <Crown className="w-3.5 h-3.5 text-[#FEF08A]" />
                    <span className="font-mono-num font-black text-[#FEF08A]">
                      #{lobby.roomPin || '889900'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCreateNewTournamentRoom}
                      title="Tạo ID phòng mới"
                      className="ml-1 text-[#FEF08A] hover:text-white cursor-pointer font-bold p-0.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : joinedTeacherPin ? (
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>#{joinedTeacherPin}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleLeaveRoom}
                    title="Rời phòng"
                    className="px-2 py-1 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/60 text-rose-200 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleStudentJoinTeacherRoom} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    placeholder="Mã 6 số từ Thầy/Cô..."
                    value={teacherPinInput}
                    onChange={(e) => setTeacherPinInput(e.target.value.replace(/\D/g, ''))}
                    className="w-28 px-2.5 py-1 rounded-xl bg-[#090D16] border border-[#F59E0B]/60 font-mono-num text-xs font-bold text-[#FEF08A] placeholder:text-slate-500 focus:outline-none focus:border-[#F59E0B]"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-xl bg-[#F59E0B] hover:bg-[#FBBF24] text-[#090D16] font-black text-xs cursor-pointer shrink-0 transition-colors shadow flex items-center gap-1"
                  >
                    <Key className="w-3 h-3" />
                    <span>Báo Danh</span>
                  </button>
                </form>
              ))}

            {onOpenMatchmaking && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playFanfare(false);
                  onOpenMatchmaking();
                }}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 via-[#38BDF8] to-cyan-400 hover:brightness-110 text-[#040814] text-xs font-sci font-black cursor-pointer inline-flex items-center gap-1.5 shadow-[0_0_14px_rgba(56,189,248,0.35)] transition-all animate-pulse"
                title="Tự động tìm đối thủ hoặc mở phòng ghép nhanh"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>⚡ GHÉP NHANH</span>
              </button>
            )}
          </div>

          {/* Right: Settings Icon & Start Race Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playCoin();
                setShowSettingsModal(true);
              }}
              title="Cài đặt phím & âm thanh"
              className="p-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#38BDF8] border border-slate-700 font-bold text-xs cursor-pointer transition-all shadow-sm"
            >
              <Settings className="w-4 h-4 text-[#38BDF8]" />
            </button>

            {!isHost ? (
              <span className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-amber-400/50 text-[#FEF08A] text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Chờ Host...</span>
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#34D399] px-2 py-1 bg-[#090D16] rounded-xl border border-emerald-500/40 hidden sm:flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Sẵn Sàng</span>
                </span>

                <button
                  type="button"
                  data-start="true"
                  onClick={handleLaunchRace}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#F59E0B] hover:brightness-110 text-[#090D16] font-black text-xs sm:text-sm tracking-wide uppercase shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>BẮT ĐẦU</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* FLOATING FEEDBACK TOAST (OVERLAY - NO LAYOUT SHIFT) */}
        {friendRoomFeedback && (
          <div
            className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-md w-[92vw] px-4 py-2.5 rounded-2xl text-xs font-bold shadow-[0_12px_36px_rgba(0,0,0,0.85)] backdrop-blur-xl flex items-center justify-between gap-3 border ${
              friendRoomFeedback.ok
                ? 'bg-[#061226]/95 border-cyan-400/70 text-cyan-200'
                : 'bg-[#1C080E]/95 border-rose-500/70 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {friendRoomFeedback.ok ? (
                <CheckCircle2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="truncate">{friendRoomFeedback.text.replace(/^[🟢⚠️⚡]\s*/, '')}</span>
            </div>
            <button
              type="button"
              onClick={() => setFriendRoomFeedback(null)}
              className="text-xs font-bold opacity-70 hover:opacity-100 p-0.5 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {teacherPinError && activeMode === 'teacher_cup' && (
          <div className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-950/90 border border-rose-500/50 text-rose-200 flex items-center justify-between">
            <span>{teacherPinError}</span>
            <button
              type="button"
              onClick={() => setTeacherPinError(null)}
              className="text-xs font-bold opacity-70 hover:opacity-100 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* MAIN 2-COLUMN STAGING VIEW: TRACK & STARTING GRID + WARMUP TRACK  */}
        {/* ================================================================= */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch overflow-hidden">
          {/* LEFT COLUMN: ASPHALT 9 CIRCUIT CARD + STARTING GRID ROSTER */}
          <div className="lg:col-span-6 flex flex-col h-full min-h-0 space-y-3">
            {/* CLEAN & COMPACT TRACK SELECTION BANNER BUTTON */}
            <button
              type="button"
              onClick={() => {
                if (isHost) setShowTrackModal(true);
              }}
              disabled={!isHost}
              className={`w-full px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] border border-[#06B6D4]/50 flex items-center justify-between text-left transition-all shadow-md group ${
                isHost
                  ? 'hover:border-[#38BDF8] cursor-pointer'
                  : 'opacity-90 cursor-default'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#090D16] border border-[#06B6D4]/60 flex items-center justify-center shrink-0 text-[#38BDF8] group-hover:scale-105 group-hover:border-[#38BDF8] transition-all">
                  <MapPin className="w-4 h-4 text-[#38BDF8]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-white flex items-center gap-2 flex-wrap">
                    <span className="truncate">{currentMapObj.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-black flex items-center gap-1 ${
                        isCurrentMapNight
                          ? 'bg-sky-950 text-[#38BDF8] border border-sky-400/40'
                          : 'bg-amber-950 text-[#FEF08A] border border-amber-400/40'
                      }`}
                    >
                      {isCurrentMapNight ? (
                        <>
                          <Moon className="w-2.5 h-2.5 text-[#38BDF8]" />
                          <span>ĐÊM</span>
                        </>
                      ) : (
                        <>
                          <Sun className="w-2.5 h-2.5 text-[#FEF08A]" />
                          <span>NGÀY</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="text-[10.5px] font-mono-num text-slate-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[#38BDF8] font-bold">
                      {lobby.laps} Vòng
                    </span>
                    <span>·</span>
                    <span className="text-[#FEF08A] font-bold flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      <span>Top 1: +{activeTop1Coins}</span>
                    </span>
                  </div>
                </div>
              </div>

              {isHost ? (
                <span className="px-2.5 py-1.5 rounded-xl bg-[#06B6D4] group-hover:bg-[#38BDF8] text-[#090D16] text-xs font-black shrink-0 flex items-center gap-1 transition-colors shadow">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Đổi Map</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl bg-[#090D16] border border-slate-700 text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-slate-400" />
                  <span>Chỉ Host</span>
                </span>
              )}
            </button>

            {/* ASPHALT 9 / F1 STARTING GRID RACER ROSTER */}
            <div className="p-3.5 rounded-2xl bg-[#0F172A]/95 border border-slate-700/80 flex-1 flex flex-col min-h-0 shadow-lg">
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Flag className="w-4 h-4 text-[#06B6D4]" />
                    <span>Vạch Xuất Phát</span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#090D16] border border-[#06B6D4]/50 font-mono-num text-xs font-black text-[#38BDF8]">
                      {activeParticipants.length}
                    </span>
                  </span>
                  {manualBots.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono-num font-bold flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      <span>{manualBots.length} AI</span>
                    </span>
                  )}
                </div>

                {isHost ? (
                  <button
                    type="button"
                    onClick={() => setShowBotModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:brightness-110 text-[#090D16] text-xs font-black cursor-pointer inline-flex items-center gap-1.5 transition-all shadow"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Thêm Bot AI</span>
                    {manualBots.length > 0 && (
                      <span>({manualBots.length})</span>
                    )}
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-slate-400 px-2 py-1 bg-[#090D16] rounded-lg border border-slate-800 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-slate-400" />
                    <span>Host quản lý Bot</span>
                  </span>
                )}
              </div>

              {/* Starting Grid Items */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1.5 custom-scrollbar">
                {activeParticipants.map((p, idx) => {
                  const rnk = getRankByRP(p.rp);
                  const cClass = calculateCarClass(p.loadout);
                  const cStyle = TIER_COLORS[cClass.tier];
                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-xl flex items-center justify-between text-xs transition-all ${
                        !p.isBot
                          ? 'bg-gradient-to-r from-[#16233A] to-[#0F172A] border border-[#06B6D4]/70 shadow'
                          : 'bg-[#090D16]/90 border border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <span
                          className={`font-mono-num text-[11px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                            idx === 0
                              ? 'bg-[#F59E0B] text-[#090D16]'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          P{idx + 1}
                        </span>
                        <RankAvatarFrame
                          username={p.username}
                          rp={p.rp}
                          size="sm"
                          isTeacher={p.isTeacher}
                        />
                        <div className="truncate flex items-center gap-2">
                          <span
                            className={`font-extrabold truncate text-xs sm:text-sm ${
                              !p.isBot ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            {p.username}
                          </span>
                          <span
                            style={{
                              backgroundColor: cStyle.bg,
                              color: cStyle.text,
                            }}
                            className="px-1.5 py-0.2 rounded text-[9px] font-black shrink-0"
                          >
                            CLASS {cClass.tier}
                          </span>
                          {!p.isBot && (
                            <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/60 text-cyan-300 text-[10px] font-bold shrink-0">
                              {p.id === currentStudent?.id ? 'Bạn' : 'Tay Đua'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          style={{ color: rnk.color }}
                          className="font-mono-num text-xs font-bold inline-flex items-center gap-1"
                        >
                          <RankCrest tierId={rnk.id} size={16} />
                          <span>{p.rp}</span>
                        </span>

                        {isHost && (
                          (() => {
                            const myId = isTeacher ? 'teacher_host' : currentStudent?.id;
                            const isSelf =
                              myId &&
                              (p.id.toLowerCase() === myId.toLowerCase() ||
                                p.id.toLowerCase().startsWith(`${myId.toLowerCase()}_guest_`));
                            if (isSelf) return null;
                            return (
                              <button
                                type="button"
                                onClick={() => handleKickPlayer(p.id)}
                                title={`Kick ${p.username} khỏi phòng`}
                                className="px-2 py-1 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-500/60 text-rose-300 font-extrabold text-[10.5px] cursor-pointer inline-flex items-center gap-1 transition-all shrink-0 shadow-sm"
                              >
                                <X className="w-3.5 h-3.5 text-rose-400" />
                                <span className="hidden sm:inline">Kick</span>
                              </button>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  );
                })}

                {activeParticipants.length === 1 && (
                  <div className="p-4 rounded-xl bg-[#090D16]/85 border border-dashed border-slate-700 text-center space-y-2.5 mt-2">
                    <div className="flex justify-center">
                      <Car className="w-8 h-8 text-[#06B6D4]/60" />
                    </div>
                    <div className="text-xs font-bold text-slate-300">
                      {activeMode === 'friends_pvp'
                        ? isHost
                          ? 'Gửi Mã Phòng phía trên cho bạn bè để lập đội đua P2P, hoặc thêm Bot AI để khởi động!'
                          : 'Đã kết nối phòng bạn bè. Chờ chủ phòng phát lệnh xuất phát...'
                        : activeMode === 'teacher_cup'
                        ? isTeacher
                          ? 'Đã mở phòng Giải Đấu. Gửi Mã ID Phòng cho học sinh nhập vào để báo danh, hoặc thêm Bot AI để đua thử!'
                          : joinedTeacherPin
                          ? 'Đã báo danh vào phòng Giải Đấu của Thầy/Cô. Chờ Giáo Viên phát lệnh xuất phát...'
                          : 'Chỉ Giáo Viên mới được tạo phòng Giải Đấu. Hãy nhập Mã ID 6 số từ Giáo Viên phía trên để vào vạch xuất phát!'
                        : 'Bạn đang ở chế độ Solo AI. Bấm nút dưới để gọi dàn siêu xe AI vào đường đua!'}
                    </div>
                    {isHost && (
                      <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleAddManualBot(3)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#06B6D4] text-[#38BDF8] font-black text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>+3 Bot Đua Nhanh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddManualBot(7)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#090D16] font-black text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>+7 Bot Đua Đội Hình</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: INTERACTIVE WARM-UP CANVAS */}
          <div className="lg:col-span-6 flex flex-col h-full min-h-0">
            <WarmupCanvas
              loadout={
                isTeacher
                  ? teacherProfile.loadout
                  : currentStudent?.loadout || DEFAULT_LOADOUT
              }
              tuningLoadout={
                isTeacher
                  ? teacherProfile.tuningLoadout
                  : currentStudent?.tuningLoadout || DEFAULT_TUNING_LOADOUT
              }
              username={
                isTeacher
                  ? teacherProfile.username
                  : currentStudent?.username || 'Tay Đua TripleD'
              }
              onOpenGarage={onOpenGarage}
              tuningPresets={
                (isTeacher ? teacherProfile : currentStudent)?.tuningPresets
              }
              activePresetIndex={
                (isTeacher ? teacherProfile : currentStudent)?.activePresetIndex
              }
              onSelectPreset={handleSelectPreset}
            />
          </div>
        </div>

        {/* ================================================================= */}
        {/* MODAL 1: TRACK SETTINGS POPUP (Host only)                        */}
        {/* ================================================================= */}
        {showTrackModal && isHost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 select-none animate-in fade-in duration-200">
            <div className="w-full max-w-2xl max-h-[94vh] overflow-y-auto custom-scrollbar rounded-3xl bg-[#0B1120] border-2 border-[#06B6D4] p-4 sm:p-5 space-y-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4]/50 flex items-center justify-center">
                    <Compass className="w-4 h-4 text-[#38BDF8]" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white tracking-wide uppercase flex items-center gap-2">
                      <span>Chọn Đường Đua & Thể Thức</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#06B6D4]/20 border border-[#06B6D4]/40 text-[#38BDF8] font-bold">
                        {MAPS.length} MAPS
                      </span>
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRandomMap}
                    className="px-2.5 py-1.5 rounded-xl bg-[#090D16] hover:bg-[#06B6D4]/20 border border-slate-700 hover:border-[#38BDF8] text-[#38BDF8] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Ngẫu Nhiên</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTrackModal(false)}
                    className="w-8 h-8 rounded-xl bg-[#090D16] hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors border border-slate-800"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* HERO MAP PREVIEW SHOWCASE (Single canvas, 60 FPS buttery smooth, NO lag) */}
              <div className="relative rounded-2xl overflow-hidden border border-[#06B6D4]/40 bg-[#060D1A] shadow-[0_8px_30px_rgba(0,0,0,0.7)]">
                <MapPreviewCanvas
                  map={currentMapObj}
                  width={620}
                  height={195}
                  className="w-full h-44 sm:h-52 block"
                  animatedPaceCar={true}
                  showHazards={true}
                />

                {/* Top overlay badges */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border text-[10px] font-black uppercase tracking-wider ${
                      THEME_ACCENTS[currentMapObj.theme]?.border || 'border-sky-500/50'
                    } ${THEME_ACCENTS[currentMapObj.theme]?.text || 'text-sky-400'}`}>
                      {THEME_ACCENTS[currentMapObj.theme]?.label || currentMapObj.theme.toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 backdrop-blur-md ${
                        isCurrentMapNight
                          ? 'bg-sky-950/85 text-[#38BDF8] border border-sky-400/40'
                          : 'bg-amber-950/85 text-[#FEF08A] border border-amber-400/40'
                      }`}
                    >
                      {isCurrentMapNight ? (
                        <>
                          <Moon className="w-3 h-3 text-[#38BDF8]" />
                          <span>ĐÊM</span>
                        </>
                      ) : (
                        <>
                          <Sun className="w-3 h-3 text-[#FEF08A]" />
                          <span>NGÀY</span>
                        </>
                      )}
                    </span>
                    {currentMapObj.shortcut && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-950/85 backdrop-blur-md border border-amber-400/60 text-[#FDE047] text-[10px] font-bold flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 fill-current text-[#FDE047]" />
                        <span>Có Lối Tắt</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-slate-700/80 text-slate-300 font-mono-num text-[10px] font-bold">
                      {currentMapObj.waypoints.length} Checkpoints
                    </span>
                  </div>
                </div>

                {/* Bottom glassmorphism info bar */}
                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/95 via-black/75 to-transparent pointer-events-none">
                  <div className="text-sm sm:text-base font-black text-white truncate flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#06B6D4] text-[#090D16] text-[10px] font-mono-num font-black">
                      #{MAPS.findIndex((m) => m.id === lobby.mapId) + 1}
                    </span>
                    <span>{currentMapObj.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 truncate mt-0.5">
                    {currentMapObj.subtitle || currentMapObj.description}
                  </div>
                </div>
              </div>

              {/* 10 TRACK SELECTOR CARDS (Compact, Lightweight, Instant, NO Laggy Canvases) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-0.5">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#06B6D4]" />
                    <span>Chọn Nhanh Bản Đồ:</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Bấm để xem trước đường đua
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {MAPS.map((m, idx) => {
                    const isSelected = lobby.mapId === m.id;
                    const accent = THEME_ACCENTS[m.theme] || THEME_ACCENTS.city;
                    const isNight = isNightMapTheme(m.theme);
                    const cleanName = m.name.replace(/^Map \d+ – /, '');
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => dualDB.updateLobby({ mapId: m.id })}
                        className={`group relative p-2 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                          isSelected
                            ? 'bg-gradient-to-br from-[#06B6D4]/20 via-[#0B1528] to-[#0F172A] border-[#38BDF8] shadow-[0_0_14px_rgba(6,182,212,0.4)] ring-1 ring-[#38BDF8] scale-[1.01]'
                            : 'bg-[#090D16]/90 border-slate-800/90 hover:border-slate-600 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 w-full">
                          <span
                            className={`font-mono-num text-[10px] font-black px-1.5 py-0.5 rounded leading-none ${
                              isSelected
                                ? 'bg-[#38BDF8] text-[#090D16]'
                                : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                            }`}
                          >
                            MAP {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isNight ? (
                              <Moon className="w-2.5 h-2.5 text-sky-400" />
                            ) : (
                              <Sun className="w-2.5 h-2.5 text-amber-400" />
                            )}
                            {m.shortcut && (
                              <Zap className="w-2.5 h-2.5 text-amber-400 fill-current" />
                            )}
                            {isSelected && (
                              <span className="w-3.5 h-3.5 rounded-full bg-[#38BDF8] text-[#090D16] flex items-center justify-center font-black text-[9px] shadow">
                                ✓
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-1.5 min-w-0">
                          <div
                            className={`text-[11px] font-black truncate leading-tight ${
                              isSelected
                                ? 'text-white'
                                : 'text-slate-200 group-hover:text-white'
                            }`}
                          >
                            {cleanName}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
                            <span
                              className={`text-[9.5px] truncate font-semibold uppercase ${
                                isSelected ? 'text-cyan-300' : 'text-slate-400'
                              }`}
                            >
                              {accent.label}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Keep native select dropdown synced for testid compatibility (hidden visually) */}
                <select
                  data-testid="lobby-map-select"
                  value={lobby.mapId}
                  onChange={(e) =>
                    dualDB.updateLobby({ mapId: e.target.value })
                  }
                  className="sr-only"
                  aria-label="Chọn bản đồ"
                >
                  {MAPS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* RACE SETTINGS: Laps & Top 1 Reward in single consolidated bar */}
              <div className="p-2.5 rounded-2xl bg-[#090D16]/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-bold text-xs shrink-0">
                    Số Vòng:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[1, 3, 5, 10].map((lap) => (
                      <button
                        key={lap}
                        type="button"
                        onClick={() => dualDB.updateLobby({ laps: lap })}
                        className={`px-3 py-1.5 rounded-xl font-mono-num text-xs font-black transition-all cursor-pointer ${
                          lobby.laps === lap
                            ? 'bg-[#06B6D4] text-[#090D16] shadow-md border border-cyan-200'
                            : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        {lap} Vòng
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 shrink-0">
                  <Coins className="w-4 h-4 text-[#FEF08A]" />
                  <span className="text-slate-300 text-xs font-medium">Thưởng Top 1:</span>
                  <span className="font-mono-num font-black text-sm text-[#FEF08A]">
                    +{activeTop1Coins} Xu
                  </span>
                </div>
              </div>

              {/* Confirm Button */}
              <button
                type="button"
                onClick={() => setShowTrackModal(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#F59E0B] hover:brightness-110 text-[#090D16] font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg transition-all"
              >
                Xác Nhận Đường Đua
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL 2: BOT CONFIGURATION POPUP (Host only)                     */}
        {/* ================================================================= */}
        {showBotModal && isHost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl bg-[#0F172A] border-2 border-[#F59E0B] p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[#FEF08A]" />
                  <span>Tùy Chỉnh Đội Hình AI Bot</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBotModal(false)}
                  className="w-8 h-8 rounded-xl bg-[#090D16] hover:bg-[#1E293B] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#090D16] border border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-300">Số Bot AI Trong Sảnh:</span>
                <span className="font-mono-num font-black text-sm text-[#FEF08A]">
                  {manualBots.length} Bot
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300">
                  Thêm Nhanh Bot AI:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 5, 10, 20].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => handleAddManualBot(cnt)}
                      disabled={manualBots.length + cnt > 49}
                      className="py-2 rounded-xl bg-[#06B6D4] hover:bg-[#38BDF8] disabled:opacity-40 text-[#090D16] font-black text-xs cursor-pointer shadow-md transition-all"
                    >
                      +{cnt} Bot
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300">
                  Trình Độ Lái Của AI:
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {BOT_DIFFICULTY_OPTIONS.map((diff) => (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => handleSetBotDifficulty(diff.id)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                        botDifficulty === diff.id
                          ? 'bg-[#F59E0B] text-[#090D16] font-black shadow-md border border-[#FEF08A]'
                          : 'bg-[#090D16] text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {diff.label.split(' ')[1] || diff.label}
                    </button>
                  ))}
                </div>
              </div>

              {manualBots.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearManualBots}
                  className="w-full py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-bold text-xs cursor-pointer transition-all"
                >
                  🗑️ Xóa Tất Cả Bot AI
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowBotModal(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-[#090D16] font-black text-xs cursor-pointer shadow-md transition-all"
              >
                Xong
              </button>
            </div>
          </div>
        )}

        {showSettingsModal && (
          <SettingsModal
            onClose={() => setShowSettingsModal(false)}
            isTeacher={isTeacher}
          />
        )}
      </div>
    </div>
  );
};


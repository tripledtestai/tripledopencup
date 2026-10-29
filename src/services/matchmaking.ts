// Real-time Online Auto-Matchmaking Service (Dual Transport: Firebase RTDB + BroadcastChannel + P2P)

import { MAPS } from '../game/constants';
import { buildComputedStats, generateBotTuningLoadout } from '../game/rules';
import {
  CarLoadout,
  LobbyConfig,
  MatchmakingRoomEntry,
  StudentAccount,
} from '../game/types';
import { dualDB } from './database';
import { multiplayerService } from './multiplayer';
import { soundEngine } from './sound';

export type MatchmakingStatus =
  | 'idle'
  | 'searching'
  | 'hosting'
  | 'joining'
  | 'matched'
  | 'starting';

export type RadarMatchMode = 'scan' | 'host';

export interface MatchedPlayerInfo {
  id: string;
  username: string;
  rp: number;
  loadout: CarLoadout;
  isBot?: boolean;
  isHost?: boolean;
}

export interface MatchmakingState {
  radarMode: RadarMatchMode;
  status: MatchmakingStatus;
  elapsedSec: number;
  countdownSec: number | null;
  roomPin: string | null;
  mapId: string;
  isHost: boolean;
  statusMessage: string;
  matchedPlayers: MatchedPlayerInfo[];
  maxPlayers: number;
  discoveredRooms: MatchmakingRoomEntry[];
  error?: string | null;
}

type StateListener = (state: MatchmakingState) => void;
type LaunchCallback = (finalLobby: LobbyConfig) => void;

class MatchmakingService {
  private state: MatchmakingState = {
    radarMode: 'scan',
    status: 'idle',
    elapsedSec: 0,
    countdownSec: null,
    roomPin: null,
    mapId: MAPS[0].id,
    isHost: false,
    statusMessage: '',
    matchedPlayers: [],
    maxPlayers: 12,
    discoveredRooms: [],
    error: null,
  };

  private listeners: Set<StateListener> = new Set();
  private onLaunchCallback: LaunchCallback | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private bc: BroadcastChannel | null = null;
  private unsubNetMsg: (() => void) | null = null;
  private unsubCloudRooms: (() => void) | null = null;
  private activePlayer: StudentAccount | null = null;
  private isTeacherPlayer: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.bc = new BroadcastChannel('tripled_auto_matchmaking_v1');
        this.bc.onmessage = (e) => {
          this.handleBroadcastMessage(e.data);
        };
      } catch {}
    }
  }

  public getState(): MatchmakingState {
    return { ...this.state };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private updateState(patch: Partial<MatchmakingState>) {
    this.state = {
      ...this.state,
      ...patch,
    };
    this.listeners.forEach((fn) => fn(this.getState()));
  }

  private handleBroadcastMessage(data: any) {
    if (!data || !data.type) return;

    if (data.type === 'QM_QUERY_OPEN' && this.state.isHost && this.state.status === 'hosting') {
      if (this.state.matchedPlayers.length < this.state.maxPlayers && this.state.roomPin) {
        this.bc?.postMessage({
          type: 'QM_ROOM_ANNOUNCE',
          roomPin: this.state.roomPin,
          hostId: this.activePlayer?.id || 'host',
          hostName: this.activePlayer?.username || 'Chủ Phòng',
          hostRp: this.activePlayer?.rp || 0,
          mapId: this.state.mapId,
          participantsCount: this.state.matchedPlayers.length,
          maxPlayers: this.state.maxPlayers,
          status: 'waiting',
          createdAt: Date.now(),
        });
      }
    } else if (data.type === 'QM_ROOM_ANNOUNCE' && this.state.radarMode === 'scan') {
      if (data.roomPin && data.status === 'waiting' && data.participantsCount < data.maxPlayers) {
        const entry: MatchmakingRoomEntry = {
          roomPin: data.roomPin,
          hostId: data.hostId,
          hostName: data.hostName,
          hostRp: data.hostRp,
          mapId: data.mapId,
          participantsCount: data.participantsCount,
          maxPlayers: data.maxPlayers,
          status: 'waiting',
          createdAt: data.createdAt,
          updatedAt: Date.now(),
        };
        this.handleDiscoveredRoom(entry);
      }
    }
  }

  private handleDiscoveredRoom(entry: MatchmakingRoomEntry) {
    const list = [...this.state.discoveredRooms];
    const idx = list.findIndex((r) => r.roomPin === entry.roomPin);
    if (idx >= 0) {
      list[idx] = entry;
    } else {
      list.push(entry);
      soundEngine.playCoin();
    }
    this.updateState({
      discoveredRooms: list,
      statusMessage: `Phát hiện ${list.length} phòng đang mở!`,
    });
  }

  /**
   * MODE 1: TỰ QUÉT PHÒNG SẴN CÓ
   * Scans continuously for available rooms created by other players.
   * Auto-joins the best room, or presents discovered rooms list.
   */
  public async startScanMode(
    player: StudentAccount,
    isTeacher: boolean = false,
    onLaunch: LaunchCallback,
    autoJoin: boolean = true
  ) {
    this.cancelMatchmaking(false);

    this.activePlayer = player;
    this.isTeacherPlayer = isTeacher;
    this.onLaunchCallback = onLaunch;

    this.updateState({
      radarMode: 'scan',
      status: 'searching',
      elapsedSec: 0,
      countdownSec: null,
      roomPin: null,
      isHost: false,
      statusMessage: 'Đang quét sóng radar tìm các phòng có sẵn...',
      matchedPlayers: [
        {
          id: isTeacher ? 'teacher_host' : player.id,
          username: player.username,
          rp: player.rp,
          loadout: player.loadout,
          isHost: false,
        },
      ],
      discoveredRooms: [],
      error: null,
    });

    this.timerInterval = setInterval(() => {
      this.updateState({ elapsedSec: this.state.elapsedSec + 1 });
      this.bc?.postMessage({ type: 'QM_QUERY_OPEN' });
    }, 1000);

    // Initial query via BroadcastChannel
    this.bc?.postMessage({ type: 'QM_QUERY_OPEN' });

    // Listen to Firebase RTDB rooms continuously in scan mode
    this.unsubCloudRooms = dualDB.listenMatchmakingRooms((rooms) => {
      if (this.state.radarMode !== 'scan' || this.state.status === 'matched') return;
      const now = Date.now();
      const mySessionId = multiplayerService.clientSessionId;
      const available = Object.values(rooms).filter((r) => {
        if (!r || !r.roomPin || r.status !== 'waiting' || r.isPrivateRoom) return false;
        if (r.participantsCount >= (r.maxPlayers || 8)) return false;
        const roomTs = r.updatedAt || r.createdAt || now;
        if (Math.abs(now - roomTs) >= 1800000) return false;
        // Do not discover our own room hosted in the exact same browser session
        if (r.hostSessionId && r.hostSessionId === mySessionId) return false;
        if (!r.hostSessionId && r.hostId && r.hostId.toLowerCase() === (player.id || '').toLowerCase()) return false;
        return true;
      });

      this.updateState({ discoveredRooms: available });

      // Auto-join the first available open room if autoJoin is true and not yet joined
      if (autoJoin && available.length > 0 && this.state.status === 'searching') {
        available.sort((a, b) => b.participantsCount - a.participantsCount);
        this.joinFoundRoom(available[0], player);
      }
    });
  }

  /**
   * MODE 2: TẠO PHÒNG CHỜ MỚI
   * Creates room, generates Room PIN, and waits for racers to join.
   */
  public async startHostMode(
    player: StudentAccount,
    isTeacher: boolean = false,
    onLaunch: LaunchCallback,
    options?: { mapId?: string; maxPlayers?: number }
  ) {
    this.cancelMatchmaking(false);

    this.activePlayer = player;
    this.isTeacherPlayer = isTeacher;
    this.onLaunchCallback = onLaunch;

    const chosenMapId = options?.mapId || MAPS[Math.floor(Math.random() * Math.min(6, MAPS.length))].id;
    const maxPlayers = options?.maxPlayers || 12;

    this.updateState({
      radarMode: 'host',
      maxPlayers,
      elapsedSec: 0,
      countdownSec: null,
      discoveredRooms: [],
      error: null,
    });

    this.timerInterval = setInterval(() => {
      this.updateState({ elapsedSec: this.state.elapsedSec + 1 });
    }, 1000);

    await this.hostNewQuickMatchRoom(player, isTeacher, chosenMapId, maxPlayers);
  }

  /**
   * Quick match entry point (defaults to scan mode or resumes previous mode)
   */
  public async startQuickMatch(
    player: StudentAccount,
    isTeacher: boolean = false,
    onLaunch: LaunchCallback,
    options?: { mapId?: string; maxPlayers?: number; initialMode?: RadarMatchMode }
  ) {
    if (options?.initialMode === 'host') {
      return this.startHostMode(player, isTeacher, onLaunch, options);
    }
    return this.startScanMode(player, isTeacher, onLaunch, true);
  }

  public async joinDiscoveredRoom(room: MatchmakingRoomEntry) {
    if (!this.activePlayer) return;
    await this.joinFoundRoom(room, this.activePlayer);
  }

  private async queryFirebaseOpenRoom(myId: string): Promise<MatchmakingRoomEntry | null> {
    return new Promise((resolve) => {
      let resolved = false;
      const unsub = dualDB.listenMatchmakingRooms((rooms) => {
        if (resolved) return;
        unsub();
        resolved = true;
        const now = Date.now();
        const mySessionId = multiplayerService.clientSessionId;
        const available = Object.values(rooms).filter((r) => {
          if (!r || !r.roomPin || r.status !== 'waiting') return false;
          if (r.participantsCount >= (r.maxPlayers || 12)) return false;
          if (now - (r.updatedAt || r.createdAt || 0) >= 45000) return false;
          if (r.hostSessionId && r.hostSessionId === mySessionId) return false;
          if (!r.hostSessionId && r.hostId && r.hostId.toLowerCase() === myId.toLowerCase()) return false;
          return true;
        });
        if (available.length > 0) {
          // Pick room with highest participants first for faster full lobby
          available.sort((a, b) => b.participantsCount - a.participantsCount);
          resolve(available[0]);
        } else {
          resolve(null);
        }
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsub();
          resolve(null);
        }
      }, 550);
    });
  }

  private async joinFoundRoom(room: MatchmakingRoomEntry, player: StudentAccount) {
    this.updateState({
      status: 'joining',
      roomPin: room.roomPin,
      mapId: room.mapId,
      isHost: false,
      statusMessage: `Đã tìm thấy phòng #${room.roomPin}! Đang kết nối...`,
    });

    this.setupMultiplayerListener();

    const ok = await multiplayerService.joinRoom(room.roomPin, player);
    if (!ok && this.state.status === 'joining') {
      // Room was full or failed to connect, fall back to hosting immediately
      this.hostNewQuickMatchRoom(
        player,
        this.isTeacherPlayer,
        this.state.mapId,
        this.state.maxPlayers
      );
      return;
    }

    this.updateState({
      status: 'matched',
      statusMessage: `Đã vào phòng #${room.roomPin}! Chờ chủ phòng bắt đầu...`,
    });
    soundEngine.playFanfare(false);
  }

  private async hostNewQuickMatchRoom(
    player: StudentAccount,
    isTeacher: boolean,
    mapId: string,
    maxPlayers: number
  ) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const hostId = isTeacher ? 'teacher_host' : player.id;

    const myPlayerInfo: MatchedPlayerInfo = {
      id: hostId,
      username: player.username,
      rp: player.rp,
      loadout: player.loadout,
      isHost: true,
    };

    this.updateState({
      status: 'hosting',
      roomPin: pin,
      mapId,
      isHost: true,
      statusMessage: `Đang chờ đối thủ vào phòng ghép #${pin}... (1/${maxPlayers})`,
      matchedPlayers: [myPlayerInfo],
    });

    const entry: MatchmakingRoomEntry = {
      roomPin: pin,
      hostId,
      hostName: player.username,
      hostRp: player.rp,
      hostSessionId: multiplayerService.clientSessionId,
      mapId,
      participantsCount: 1,
      maxPlayers,
      status: 'waiting',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Register room in Firebase
    dualDB.registerMatchmakingRoom(entry);

    // Host room in multiplayer service
    this.setupMultiplayerListener();
    await multiplayerService.hostRoom(pin, player);

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (this.state.isHost && this.state.roomPin) {
        dualDB.updateMatchmakingRoom(this.state.roomPin, {
          participantsCount: this.state.matchedPlayers.length,
          updatedAt: Date.now(),
        });
      }
    }, 2500);
  }

  private setupMultiplayerListener() {
    this.unsubNetMsg?.();
    this.unsubNetMsg = multiplayerService.subscribe((msg) => {
      if (msg.type === 'JOIN_REQUEST' && this.state.isHost && this.state.roomPin) {
        const guest = msg.student;
        if (guest && guest.id) {
          this.addOrUpdateMatchedPlayer({
            id: guest.id,
            username: guest.username,
            rp: guest.rp,
            loadout: guest.loadout,
            isBot: false,
            isHost: false,
          });
          const participants: LobbyConfig['participants'] = this.state.matchedPlayers.map(
            (p, idx) => ({
              id: p.id,
              username: p.username,
              rp: p.rp,
              teamId: (idx % 2) + 1,
              loadout: p.loadout,
              isBot: Boolean(p.isBot),
              isTeacher: p.id === 'teacher_host',
            })
          );
          const currentLobby: LobbyConfig = {
            roomPin: this.state.roomPin,
            friendRoomPin: this.state.roomPin,
            playModeCategory: 'friends_pvp',
            hostMode: 'play',
            raceMode: 'solo',
            teamCount: 2,
            mapId: this.state.mapId,
            laps: 3,
            botCount: 0,
            status: 'waiting',
            isAutoMatchmaking: true,
            participants,
          };
          multiplayerService.broadcast({
            type: 'JOIN_ACCEPTED',
            lobby: currentLobby,
            participants,
            assignedGuestId: guest.id,
            senderSessionId: msg._senderSessionId,
          });
          dualDB.syncRoomState(this.state.roomPin, {
            status: 'waiting',
            lobby: currentLobby,
            updatedAt: Date.now(),
          });
        }
      } else if (msg.type === 'JOIN_ACCEPTED' || msg.type === 'LOBBY_UPDATE') {
        const incomingMapId = msg.lobby?.mapId;
        if (incomingMapId && incomingMapId !== this.state.mapId) {
          this.updateState({ mapId: incomingMapId });
        }
        const participants = msg.type === 'JOIN_ACCEPTED' ? msg.participants : msg.lobby.participants;
        if (Array.isArray(participants)) {
          this.syncRosterFromParticipants(participants);
        }
      } else if (msg.type === 'PARTICIPANT_JOINED') {
        const p = msg.participant;
        this.addOrUpdateMatchedPlayer({
          id: p.id,
          username: p.username,
          rp: p.rp,
          loadout: p.loadout,
          isBot: p.isBot,
        });
      } else if (msg.type === 'START_RACE') {
        this.handleStartRaceFromNetwork(msg.lobby);
      }
    });
  }

  private syncRosterFromParticipants(participants: LobbyConfig['participants']) {
    const list: MatchedPlayerInfo[] = participants.map((p, idx) => ({
      id: p.id,
      username: p.username,
      rp: p.rp,
      loadout: p.loadout,
      isBot: p.isBot,
      isHost: idx === 0,
    }));

    const prevCount = this.state.matchedPlayers.length;
    const nextCount = list.length;

    this.updateState({
      matchedPlayers: list,
      status: nextCount >= 2 ? 'matched' : this.state.status,
      statusMessage:
        nextCount >= 2
          ? `Đã ghép được ${nextCount}/${this.state.maxPlayers} tay đua!`
          : this.state.statusMessage,
    });

    if (nextCount > prevCount) {
      soundEngine.playFanfare(false);
    }

    // If we're host and have at least 2 players, give a 12s window (and reset to 8s when new players join) so 6+ players joining together all make it into the same match!
    if (this.state.isHost && nextCount >= 2) {
      if (nextCount >= this.state.maxPlayers) {
        this.startCountdown(3);
      } else if (this.state.countdownSec === null || nextCount > prevCount) {
        this.startCountdown(12);
      }
    }
  }

  private addOrUpdateMatchedPlayer(info: MatchedPlayerInfo) {
    const current = [...this.state.matchedPlayers];
    const idx = current.findIndex((p) => p.id.toLowerCase() === info.id.toLowerCase());
    const isNew = idx < 0;
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...info };
    } else {
      current.push(info);
      soundEngine.playFanfare(false);
    }

    this.updateState({
      matchedPlayers: current,
      status: current.length >= 2 ? 'matched' : this.state.status,
      statusMessage:
        current.length >= 2
          ? `Đã ghép được ${current.length}/${this.state.maxPlayers} tay đua!`
          : this.state.statusMessage,
    });

    if (this.state.isHost && current.length >= 2) {
      if (current.length >= this.state.maxPlayers) {
        this.startCountdown(3);
      } else if (this.state.countdownSec === null || isNew) {
        this.startCountdown(12);
      }
    }
  }

  private startCountdown(seconds: number = 5) {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.updateState({ countdownSec: seconds });

    this.countdownInterval = setInterval(() => {
      const cur = this.state.countdownSec;
      if (cur === null || cur <= 1) {
        clearInterval(this.countdownInterval!);
        this.countdownInterval = null;
        this.updateState({ countdownSec: 0 });
        if (this.state.isHost) {
          this.launchMatch();
        }
      } else {
        soundEngine.playCountdown(false);
        this.updateState({ countdownSec: cur - 1 });
      }
    }, 1000);
  }

  /**
   * Host launches the match immediately
   */
  public launchMatch() {
    if (!this.state.isHost || !this.activePlayer) return;
    this.updateState({ status: 'starting', statusMessage: '🚀 Đang xuất phát vào đường đua!' });

    if (this.state.roomPin) {
      dualDB.updateMatchmakingRoom(this.state.roomPin, { status: 'racing' });
    }

    const hostAuth = dualDB.getAuthoritativeLocalTuning(
      this.isTeacherPlayer ? 'teacher_host' : this.activePlayer.id,
      this.isTeacherPlayer
    );

    const finalRoster: LobbyConfig['participants'] = this.state.matchedPlayers.map((p, idx) => {
      const isMe = p.id === (this.isTeacherPlayer ? 'teacher_host' : this.activePlayer!.id);
      const botTuning = p.isBot ? generateBotTuningLoadout(idx) : undefined;
      const partTuning = isMe ? hostAuth.tuningLoadout : botTuning;
      const partComputed = isMe ? hostAuth.computedStats : (botTuning ? buildComputedStats(botTuning) : undefined);
      const participant: any = {
        id: p.id,
        username: p.username,
        rp: p.rp,
        teamId: (idx % 2) + 1,
        loadout: p.loadout,
        isBot: Boolean(p.isBot),
        isTeacher: p.id === 'teacher_host',
      };
      if (partTuning) participant.tuningLoadout = partTuning;
      if (partComputed) participant.computedStats = partComputed;
      return participant;
    });

    const raceSessionId = `race_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const activePin = this.state.roomPin || 'quick_match';
    dualDB.clearRoomRaceData(activePin);
    multiplayerService.clearRaceCaches();

    const finalLobby: LobbyConfig = {
      roomPin: activePin,
      friendRoomPin: activePin,
      playModeCategory: 'friends_pvp',
      hostMode: 'play',
      raceMode: 'solo',
      teamCount: 2,
      mapId: this.state.mapId,
      laps: 3,
      botCount: 0,
      status: 'racing',
      raceSessionId,
      isAutoMatchmaking: true,
      isFriendGuest: false,
      participants: finalRoster,
    };

    multiplayerService.broadcast({
      type: 'START_RACE',
      lobby: finalLobby,
    });

    if (this.state.roomPin) {
      dualDB.syncRoomState(this.state.roomPin, {
        status: 'racing',
        raceSessionId,
        lobby: finalLobby,
        updatedAt: Date.now(),
      });
    }

    dualDB.updateLobby(finalLobby);
    soundEngine.playFanfare(true);

    if (this.onLaunchCallback) {
      this.onLaunchCallback(finalLobby);
    }
  }

  /**
   * Backfill remaining slots with AI Bots if player doesn't want to wait
   */
  public fillWithBotsAndStart() {
    if (!this.state.isHost || !this.activePlayer) return;

    const needed = Math.max(1, 4 - this.state.matchedPlayers.length);
    const botNames = ['Cyber-Viper', 'Nova-Blast', 'Phantom-Speed', 'Zenith-Apex', 'Shadow-Drift'];

    const newBots: MatchedPlayerInfo[] = [];
    for (let i = 0; i < needed; i++) {
      const botName = botNames[i % botNames.length];
      newBots.push({
        id: `qm_bot_${Date.now()}_${i}`,
        username: `🤖 ${botName}`,
        rp: 180 + i * 90,
        loadout: {
          chassis: 'chassis_gt',
          paint: 'paint_gold24k',
          decal: 'decal_flame',
          wheels: 'wheels_hellfire',
          spoiler: 'spoiler_biowings',
          underglow: 'underglow_atp',
          trail: 'trail_nitro',
        },
        isBot: true,
      });
    }

    const merged = [...this.state.matchedPlayers, ...newBots];
    this.updateState({ matchedPlayers: merged });
    this.launchMatch();
  }

  private handleStartRaceFromNetwork(lobby: LobbyConfig) {
    this.updateState({ status: 'starting', statusMessage: '🚀 Trận đấu đã bắt đầu!' });
    soundEngine.playFanfare(true);
    if (this.onLaunchCallback) {
      this.onLaunchCallback(lobby);
    }
  }

  /**
   * Cancel and clean up
   */
  public cancelMatchmaking(notify: boolean = true) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.searchTimeout) clearTimeout(this.searchTimeout);

    this.timerInterval = null;
    this.countdownInterval = null;
    this.heartbeatInterval = null;
    this.searchTimeout = null;

    if (this.state.isHost && this.state.roomPin) {
      dualDB.removeMatchmakingRoom(this.state.roomPin);
    }

    this.unsubNetMsg?.();
    this.unsubCloudRooms?.();
    this.unsubNetMsg = null;
    this.unsubCloudRooms = null;

    if (this.state.status !== 'idle') {
      multiplayerService.disconnect();
    }

    if (notify) {
      this.updateState({
        status: 'idle',
        elapsedSec: 0,
        countdownSec: null,
        roomPin: null,
        isHost: false,
        statusMessage: '',
        matchedPlayers: [],
        error: null,
      });
    }
  }
}

export const matchmakingService = new MatchmakingService();

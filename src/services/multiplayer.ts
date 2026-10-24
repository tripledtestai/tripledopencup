import Peer, { DataConnection } from 'peerjs';
import { buildComputedStats } from '../game/rules';
import {
  ComputedTuningStats,
  LobbyConfig,
  RacerState,
  StudentAccount,
} from '../game/types';
import { dualDB } from './database';

export interface RemoteRacerUpdate {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  drifting: boolean;
  isBoostingNitro: boolean;
  isNitroActive?: boolean;
  nitroCharge: number;
  lap: number;
  waypointIndex: number;
  currentCheckpoint: number;
  totalProgress: number;
  finished: boolean;
  finishTimeMs: number;
  placement: number;
  elevation?: number;
  computedStats?: ComputedTuningStats;
  timestamp?: number;
}

export interface NetworkHazardMessage {
  id: string;
  type: 'banana' | 'mud' | 'rocket';
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  elevation?: number;
}

export interface NetworkCollisionBump {
  id: string;
  targetId: string;
  attackerId: string;
  attackerName: string;
  vxImpulse: number;
  vyImpulse: number;
  speedScale: number;
}

export type NetworkMessage = (
  | {
      type: 'JOIN_REQUEST';
      student: StudentAccount;
      computedStats?: ComputedTuningStats;
    }
  | {
      type: 'JOIN_ACCEPTED';
      lobby: LobbyConfig;
      participants: LobbyConfig['participants'];
    }
  | { type: 'PARTICIPANT_JOINED'; participant: LobbyConfig['participants'][0] }
  | {
      type: 'PLAYER_STATS_UPDATE';
      playerId: string;
      computedStats: ComputedTuningStats;
      presetName?: string;
    }
  | { type: 'LEAVE_ROOM'; participantId?: string }
  | { type: 'KICK_PLAYER'; playerId: string; reason?: string }
  | { type: 'LOBBY_UPDATE'; lobby: Partial<LobbyConfig> }
  | { type: 'START_RACE'; lobby: LobbyConfig }
  | { type: 'FORCE_FINISH' }
  | { type: 'RACER_POSITION'; data: RemoteRacerUpdate }
  | { type: 'USE_ITEM'; hazard: NetworkHazardMessage }
  | { type: 'CAR_BUMP'; bump: NetworkCollisionBump }
  | { type: 'PING' }
  | { type: 'PONG' }
) & {
  _msgId?: string;
};

type MessageCallback = (msg: NetworkMessage, conn?: DataConnection) => void;
type ConnectionStatusCallback = (status: {
  connected: boolean;
  isHost: boolean;
  peerCount: number;
  roomPin: string | null;
  error?: string | null;
}) => void;

const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.services.mozilla.com' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      { urls: 'stun:stun.relay.metered.ca:80' },
      {
        urls: 'turn:standard.relay.metered.ca:80',
        username: 'e8dd65b92aad6a38f8629211',
        credential: 'tK35kR9vP9oW6v7M',
      },
      {
        urls: 'turn:standard.relay.metered.ca:443?transport=tcp',
        username: 'e8dd65b92aad6a38f8629211',
        credential: 'tK35kR9vP9oW6v7M',
      },
    ],
  },
};

class MultiplayerService {
  private peer: Peer | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private cloudUnsubscribes: (() => void)[] = [];
  private connections: Map<string, DataConnection> = new Map();
  private hostConnection: DataConnection | null = null;
  private isHost: boolean = false;
  private currentRoomPin: string | null = null;
  private messageListeners: Set<MessageCallback> = new Set();
  private statusListeners: Set<ConnectionStatusCallback> = new Set();
  private lastSentTime: number = 0;
  private lastCloudPosSentTime: number = 0;
  private lastBumpSentByTarget: Map<string, number> = new Map();
  private lastSentFinishedByRacer: Map<string, boolean> = new Map();
  private latestRemoteRacers: Map<string, RemoteRacerUpdate> = new Map();
  private latestRemoteHazards: NetworkHazardMessage[] = [];
  private latestRemoteBumps: NetworkCollisionBump[] = [];
  private processedHazardIds: Set<string> = new Set();
  private processedMsgIds: Set<string> = new Set();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private bcConnected: boolean = false;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.broadcast({ type: 'PING' });
      }
    }, 2500);
  }

  private markAndCheckDuplicateMsg(msg: NetworkMessage): boolean {
    if (
      msg.type === 'PING' ||
      msg.type === 'PONG' ||
      msg.type === 'RACER_POSITION'
    ) {
      return false;
    }
    if (!msg._msgId) return false;
    if (this.processedMsgIds.has(msg._msgId)) {
      return true;
    }
    this.processedMsgIds.add(msg._msgId);
    if (this.processedMsgIds.size > 600) {
      const firstKey = this.processedMsgIds.values().next().value;
      if (firstKey) this.processedMsgIds.delete(firstKey);
    }
    return false;
  }

  private ingestRemotePosition(data: RemoteRacerUpdate) {
    if (!data || !data.id) return;
    const prev = this.latestRemoteRacers.get(data.id);
    if (
      prev &&
      prev.timestamp &&
      data.timestamp &&
      data.timestamp < prev.timestamp &&
      !data.finished
    ) {
      return;
    }
    this.latestRemoteRacers.set(data.id, {
      ...data,
      timestamp: data.timestamp || Date.now(),
    });
  }

  private setupCloudRoomSync(roomPin: string, onJoinAccepted?: () => void) {
    this.cloudUnsubscribes.forEach((u) => u());
    this.cloudUnsubscribes = [];

    const unsubEvents = dualDB.listenRoomNetEvents(roomPin, (eventId, rawEvt) => {
      if (!rawEvt || !rawEvt.type) return;
      const msg = { ...rawEvt, _msgId: eventId } as NetworkMessage;
      if (this.markAndCheckDuplicateMsg(msg)) return;

      if (msg.type === 'JOIN_REQUEST') {
        this.bcConnected = true;
        this.notifyStatus(null);
      } else if (msg.type === 'JOIN_ACCEPTED') {
        this.bcConnected = true;
        this.notifyStatus(null);
        onJoinAccepted?.();
      } else if (msg.type === 'CAR_BUMP') {
        if (!this.processedHazardIds.has(msg.bump.id)) {
          this.processedHazardIds.add(msg.bump.id);
          this.latestRemoteBumps.push(msg.bump);
        }
      }

      this.messageListeners.forEach((fn) => fn(msg));
    });

    const unsubRacers = dualDB.listenRoomRacersFromCloud(roomPin, (racersMap) => {
      for (const posData of Object.values(racersMap)) {
        if (posData && typeof posData === 'object' && posData.id) {
          this.ingestRemotePosition(posData as RemoteRacerUpdate);
        }
      }
    });

    const unsubHazards = dualDB.listenRoomHazardsFromCloud(
      roomPin,
      (hazardsList) => {
        for (const hz of hazardsList) {
          if (hz && hz.id && !this.processedHazardIds.has(hz.id)) {
            this.processedHazardIds.add(hz.id);
            this.latestRemoteHazards.push({
              id: hz.id,
              type: hz.type,
              ownerId: hz.ownerId,
              x: hz.x,
              y: hz.y,
              vx: hz.vx,
              vy: hz.vy,
              angle: hz.angle,
              elevation: hz.elevation,
            });
          }
        }
      }
    );

    this.cloudUnsubscribes = [unsubEvents, unsubRacers, unsubHazards];
  }

  public getStatus() {
    const fbConnected = dualDB.getFirebaseStatus().connected;
    return {
      connected:
        this.bcConnected ||
        (Boolean(this.currentRoomPin) && fbConnected) ||
        this.connections.size > 0 ||
        (this.hostConnection !== null && this.hostConnection.open),
      isHost: this.isHost,
      peerCount: this.isHost
        ? Math.max(this.connections.size, this.bcConnected || fbConnected ? 1 : 0)
        : this.hostConnection?.open || this.bcConnected || fbConnected
        ? 1
        : 0,
      roomPin: this.currentRoomPin,
    };
  }

  public subscribe(cb: MessageCallback): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  public subscribeStatus(cb: ConnectionStatusCallback): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private notifyStatus(error?: string | null) {
    const status = {
      ...this.getStatus(),
      error,
    };
    this.statusListeners.forEach((fn) => fn(status));
  }

  private formatPeerId(pin: string): string {
    const cleaned = pin.replace(/[^a-zA-Z0-9]/g, '');
    return `tripled-cup-${cleaned}`;
  }

  /**
   * Host a room with a 6-digit room PIN (Triple Transport: BroadcastChannel + WebRTC P2P + Firebase RTDB)
   */
  public async hostRoom(
    roomPin: string,
    hostStudent: StudentAccount | null
  ): Promise<boolean> {
    this.disconnect();
    this.isHost = true;
    this.currentRoomPin = roomPin;

    if (hostStudent) {
      const hostStats = buildComputedStats(
        hostStudent.tuningLoadout || hostStudent.computedStats
      );
      dualDB.syncPlayerComputedStatsToRoom(roomPin, hostStudent.id, hostStats);
    }

    // 1. Setup Firebase RTDB Cloud Sync channel for strict NAT/firewall resilience
    this.setupCloudRoomSync(roomPin);

    // 2. Setup instant BroadcastChannel for local/LAN multi-tab tournaments
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(`tripled_cup_net_${roomPin}`);
        this.broadcastChannel.onmessage = (event) => {
          const msg = event.data as NetworkMessage;
          if (!msg || !msg.type) return;

          if (msg.type === 'PING') {
            try {
              this.broadcastChannel?.postMessage({ type: 'PONG' });
            } catch {}
            return;
          }

          if (msg.type === 'PONG') {
            this.bcConnected = true;
            this.notifyStatus(null);
            return;
          }

          if (this.markAndCheckDuplicateMsg(msg)) return;

          if (msg.type === 'JOIN_REQUEST') {
            this.bcConnected = true;
            this.notifyStatus(null);
          }

          if (msg.type === 'RACER_POSITION') {
            this.ingestRemotePosition(msg.data);
          } else if (msg.type === 'USE_ITEM') {
            if (!this.processedHazardIds.has(msg.hazard.id)) {
              this.processedHazardIds.add(msg.hazard.id);
              this.latestRemoteHazards.push(msg.hazard);
            }
          } else if (msg.type === 'CAR_BUMP') {
            if (!this.processedHazardIds.has(msg.bump.id)) {
              this.processedHazardIds.add(msg.bump.id);
              this.latestRemoteBumps.push(msg.bump);
            }
          }

          this.messageListeners.forEach((fn) => fn(msg));
        };
        this.bcConnected = true;
      } catch (e) {
        console.warn('BroadcastChannel host error', e);
      }
    }

    const peerId = this.formatPeerId(roomPin);

    return new Promise((resolve) => {
      try {
        const peer = new Peer(peerId, PEER_CONFIG);
        this.peer = peer;

        peer.on('open', () => {
          this.notifyStatus(null);
          resolve(true);
        });

        peer.on('connection', (conn) => {
          this.setupConnection(conn, true);
        });

        peer.on('error', (err) => {
          // If PeerJS Cloud ID is taken or blocked, BroadcastChannel & Firebase RTDB still work
          if (this.broadcastChannel || dualDB.getFirebaseStatus().connected) {
            this.notifyStatus(null);
            resolve(true);
          } else {
            this.notifyStatus(err.message || 'Mã phòng bận, hãy bấm Đổi mã!');
            resolve(false);
          }
        });
      } catch (err: any) {
        if (this.broadcastChannel || dualDB.getFirebaseStatus().connected) {
          this.notifyStatus(null);
          resolve(true);
        } else {
          this.notifyStatus(err?.message || 'Không thể khởi tạo P2P');
          resolve(false);
        }
      }
    });
  }

  /**
   * Join an existing room via 6-digit room PIN (Triple Transport: BroadcastChannel + WebRTC P2P + Firebase RTDB)
   */
  public async joinRoom(
    roomPin: string,
    guestStudent: StudentAccount | null
  ): Promise<boolean> {
    this.disconnect();
    this.isHost = false;
    this.currentRoomPin = roomPin;

    const guestComputedStats = guestStudent
      ? dualDB.syncPlayerComputedStatsToRoom(
          roomPin,
          guestStudent.id,
          guestStudent.tuningLoadout || guestStudent.computedStats
        )
      : undefined;

    // Strip specific part IDs (`tuningLoadout`) from network payload to keep secret builds private
    let networkSafeGuest: StudentAccount | null = null;
    if (guestStudent) {
      const copy: any = { ...guestStudent };
      delete copy.tuningLoadout;
      if (guestComputedStats) {
        copy.computedStats = guestComputedStats;
      } else {
        delete copy.computedStats;
      }
      networkSafeGuest = copy;
    }

    let hasResolved = false;
    let resolvePromise: (val: boolean) => void = () => {};

    // 1. Setup Firebase RTDB Cloud Sync channel so guests behind symmetric NAT still join & race seamlessly
    this.setupCloudRoomSync(roomPin, () => {
      if (!hasResolved) {
        hasResolved = true;
        resolvePromise(true);
      }
    });

    if (networkSafeGuest && dualDB.getFirebaseStatus().connected) {
      const joinEventId = `join_${networkSafeGuest.id}_${Date.now()}`;
      this.processedMsgIds.add(joinEventId);
      const joinPayload: any = {
        type: 'JOIN_REQUEST',
        student: networkSafeGuest,
        _msgId: joinEventId,
      };
      if (guestComputedStats) {
        joinPayload.computedStats = guestComputedStats;
      }
      dualDB.pushRoomNetEvent(roomPin, joinEventId, joinPayload);
    }

    // 2. Setup instant BroadcastChannel for local/LAN multi-tab tournaments
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(`tripled_cup_net_${roomPin}`);
        this.broadcastChannel.onmessage = (event) => {
          const msg = event.data as NetworkMessage;
          if (!msg || !msg.type) return;

          if (this.markAndCheckDuplicateMsg(msg)) return;

          if (msg.type === 'JOIN_ACCEPTED') {
            this.bcConnected = true;
            this.notifyStatus(null);
            if (!hasResolved) {
              hasResolved = true;
              resolvePromise(true);
            }
          }

          if (msg.type === 'RACER_POSITION') {
            this.ingestRemotePosition(msg.data);
          } else if (msg.type === 'USE_ITEM') {
            if (!this.processedHazardIds.has(msg.hazard.id)) {
              this.processedHazardIds.add(msg.hazard.id);
              this.latestRemoteHazards.push(msg.hazard);
            }
          } else if (msg.type === 'CAR_BUMP') {
            if (!this.processedHazardIds.has(msg.bump.id)) {
              this.processedHazardIds.add(msg.bump.id);
              this.latestRemoteBumps.push(msg.bump);
            }
          }

          this.messageListeners.forEach((fn) => fn(msg));
        };

        // Send JOIN_REQUEST immediately and retry briefly
        const sendBcJoin = () => {
          if (networkSafeGuest && this.broadcastChannel) {
            try {
              const bcId = `bcjoin_${networkSafeGuest.id}_${Date.now()}`;
              this.processedMsgIds.add(bcId);
              this.broadcastChannel.postMessage({
                type: 'JOIN_REQUEST',
                student: networkSafeGuest,
                computedStats: guestComputedStats,
                _msgId: bcId,
              });
            } catch {}
          }
        };

        sendBcJoin();
        const retry1 = setTimeout(sendBcJoin, 300);
        const retry2 = setTimeout(sendBcJoin, 800);
        setTimeout(() => {
          clearTimeout(retry1);
          clearTimeout(retry2);
        }, 1200);
      } catch (e) {
        console.warn('BroadcastChannel join error', e);
      }
    }

    return new Promise((resolve) => {
      resolvePromise = resolve;
      const hostPeerId = this.formatPeerId(roomPin);

      try {
        const myGuestId = `guest-${Math.random().toString(36).substring(2, 9)}`;
        const peer = new Peer(myGuestId, PEER_CONFIG);

        this.peer = peer;

        peer.on('open', () => {
          const conn = peer.connect(hostPeerId, {
            reliable: true,
          });

          this.hostConnection = conn;
          this.setupConnection(conn, false);

          conn.on('open', () => {
            if (networkSafeGuest) {
              const p2pJoinId = `p2pjoin_${networkSafeGuest.id}_${Date.now()}`;
              this.processedMsgIds.add(p2pJoinId);
              conn.send({
                type: 'JOIN_REQUEST',
                student: networkSafeGuest,
                computedStats: guestComputedStats,
                _msgId: p2pJoinId,
              });
            }
            this.notifyStatus(null);
            if (!hasResolved) {
              hasResolved = true;
              resolve(true);
            }
          });

          conn.on('error', (err) => {
            if (this.bcConnected || dualDB.getFirebaseStatus().connected) {
              if (!hasResolved) {
                hasResolved = true;
                resolve(true);
              }
              return;
            }
            this.notifyStatus(err.message || 'Không thể kết nối tới chủ phòng');
            if (!hasResolved) {
              hasResolved = true;
              resolve(false);
            }
          });
        });

        peer.on('error', (err) => {
          if (this.bcConnected || dualDB.getFirebaseStatus().connected) {
            if (!hasResolved) {
              hasResolved = true;
              resolve(true);
            }
            return;
          }
          this.notifyStatus(err.message || 'Không tìm thấy phòng!');
          if (!hasResolved) {
            hasResolved = true;
            resolve(false);
          }
        });

        // Timeout fallback after 6 seconds
        setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            if (this.bcConnected || dualDB.getFirebaseStatus().connected) {
              resolve(true);
            } else {
              this.notifyStatus(
                'Hết thời gian chờ kết nối. Hãy kiểm tra lại mã phòng!'
              );
              resolve(false);
            }
          }
        }, 6000);
      } catch (err: any) {
        if (this.bcConnected || dualDB.getFirebaseStatus().connected) {
          if (!hasResolved) {
            hasResolved = true;
            resolve(true);
          }
        } else {
          this.notifyStatus(err?.message || 'Lỗi kết nối P2P');
          resolve(false);
        }
      }
    });
  }

  private setupConnection(conn: DataConnection, isIncoming: boolean) {
    if (isIncoming) {
      this.connections.set(conn.peer, conn);
    }

    conn.on('open', () => {
      this.notifyStatus(null);
    });

    conn.on('data', (data: any) => {
      const msg = data as NetworkMessage;
      if (!msg || !msg.type) return;

      if (msg.type === 'PING') {
        if (conn.open) {
          try {
            conn.send({ type: 'PONG' });
          } catch {}
        }
        return;
      }

      if (msg.type === 'PONG') {
        return;
      }

      if (this.markAndCheckDuplicateMsg(msg)) return;

      if (msg.type === 'RACER_POSITION') {
        this.ingestRemotePosition(msg.data);
      } else if (msg.type === 'USE_ITEM') {
        if (!this.processedHazardIds.has(msg.hazard.id)) {
          this.processedHazardIds.add(msg.hazard.id);
          this.latestRemoteHazards.push(msg.hazard);
        }
      } else if (msg.type === 'CAR_BUMP') {
        if (!this.processedHazardIds.has(msg.bump.id)) {
          this.processedHazardIds.add(msg.bump.id);
          this.latestRemoteBumps.push(msg.bump);
        }
      }

      // If host, forward position, item, bump, stats, and kick messages to other connected guests
      if (this.isHost) {
        if (
          msg.type === 'RACER_POSITION' ||
          msg.type === 'USE_ITEM' ||
          msg.type === 'CAR_BUMP' ||
          msg.type === 'PLAYER_STATS_UPDATE' ||
          msg.type === 'KICK_PLAYER' ||
          msg.type === 'FORCE_FINISH'
        ) {
          this.broadcastExcept(msg, conn.peer);
        }
      }

      this.messageListeners.forEach((fn) => fn(msg, conn));
    });

    conn.on('close', () => {
      if (isIncoming) {
        this.connections.delete(conn.peer);
      } else {
        this.hostConnection = null;
      }
      this.notifyStatus();
    });

    conn.on('error', () => {
      if (isIncoming) {
        this.connections.delete(conn.peer);
      } else {
        this.hostConnection = null;
      }
      this.notifyStatus('Mất kết nối với người chơi.');
    });
  }

  public broadcast(msg: NetworkMessage) {
    const isControlMsg =
      msg.type !== 'PING' &&
      msg.type !== 'PONG' &&
      msg.type !== 'RACER_POSITION' &&
      msg.type !== 'USE_ITEM';

    const enrichedMsg: NetworkMessage =
      isControlMsg && !msg._msgId
        ? {
            ...msg,
            _msgId: `evt_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 8)}`,
          }
        : msg;

    if (enrichedMsg._msgId) {
      this.processedMsgIds.add(enrichedMsg._msgId);
    }

    // 1. Send on BroadcastChannel for instant local tab and LAN sync
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(enrichedMsg);
      } catch {}
    }

    // 2. Send on WebRTC peer connections
    if (this.isHost) {
      this.connections.forEach((conn) => {
        if (conn.open) {
          try {
            conn.send(enrichedMsg);
          } catch {}
        }
      });
    } else if (this.hostConnection && this.hostConnection.open) {
      try {
        this.hostConnection.send(enrichedMsg);
      } catch {}
    }

    // 3. Send control events on Firebase RTDB Cloud channel so NAT-blocked peers stay 100% synced
    if (isControlMsg && this.currentRoomPin && enrichedMsg._msgId) {
      dualDB.pushRoomNetEvent(
        this.currentRoomPin,
        enrichedMsg._msgId,
        enrichedMsg
      );
    }
  }

  public broadcastExcept(msg: NetworkMessage, skipPeerId: string) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch {}
    }

    this.connections.forEach((conn, peerId) => {
      if (peerId !== skipPeerId && conn.open) {
        try {
          conn.send(msg);
        } catch {}
      }
    });
  }

  /**
   * Broadcasts updated ComputedTuningStats (e.g. when switching Presets in Lobby)
   * over P2P and syncs to Firebase `rooms/{roomPin}/players/{playerId}/computedStats`.
   */
  public sendComputedStatsUpdate(
    playerId: string,
    statsInput: ComputedTuningStats,
    presetName?: string
  ): ComputedTuningStats {
    const safeStats = dualDB.syncPlayerComputedStatsToRoom(
      this.currentRoomPin,
      playerId,
      statsInput
    );
    this.broadcast({
      type: 'PLAYER_STATS_UPDATE',
      playerId,
      computedStats: safeStats,
      presetName,
    });
    return safeStats;
  }

  /**
   * Sends local player real-time position & velocity without any speed clamping (default 50ms / 20Hz).
   * Guarantees immediate delivery when `racer.finished` transitions to true.
   */
  public sendPosition(racer: RacerState, throttleMs: number = 50) {
    const now = performance.now();
    const wasFinishedSent = this.lastSentFinishedByRacer.get(racer.id) || false;
    const isFreshFinish = racer.finished && !wasFinishedSent;

    if (!isFreshFinish && now - this.lastSentTime < throttleMs) return;
    this.lastSentTime = now;
    if (racer.finished) {
      this.lastSentFinishedByRacer.set(racer.id, true);
    } else if (wasFinishedSent) {
      this.lastSentFinishedByRacer.set(racer.id, false);
    }

    const isNitroActive =
      racer.isBoostingNitro ||
      racer.nitroTimer > 0 ||
      racer.rocketStartTimer > 0;

    const data: RemoteRacerUpdate = {
      id: racer.id,
      x: Math.round(racer.x * 10) / 10,
      y: Math.round(racer.y * 10) / 10,
      vx: Math.round(racer.vx * 10) / 10,
      vy: Math.round(racer.vy * 10) / 10,
      angle: Math.round(racer.angle * 1000) / 1000,
      speed: Math.round(racer.speed * 10) / 10,
      drifting: racer.drifting,
      isBoostingNitro: racer.isBoostingNitro,
      isNitroActive,
      nitroCharge: Math.round(racer.nitroCharge),
      lap: racer.lap,
      waypointIndex: racer.waypointIndex,
      currentCheckpoint: racer.currentCheckpoint,
      totalProgress: Math.round(racer.totalProgress * 100) / 100,
      finished: racer.finished,
      finishTimeMs: racer.finishTimeMs,
      placement: racer.placement,
      elevation: racer.elevation ?? 0,
      computedStats: racer.computedStats,
      timestamp: Date.now(),
    };

    this.broadcast({
      type: 'RACER_POSITION',
      data,
    });

    // Also sync position to Firebase RTDB Cloud at ~10Hz (or immediately on finish) as NAT fallback
    if (
      this.currentRoomPin &&
      (isFreshFinish || now - this.lastCloudPosSentTime >= 95)
    ) {
      this.lastCloudPosSentTime = now;
      dualDB.syncRacerPositionToCloud(this.currentRoomPin, racer.id, data);
    }
  }

  public sendItemUsed(hazard: NetworkHazardMessage) {
    this.processedHazardIds.add(hazard.id);
    this.broadcast({
      type: 'USE_ITEM',
      hazard,
    });
    if (this.currentRoomPin) {
      dualDB.pushRoomHazardToCloud(this.currentRoomPin, hazard);
    }
  }

  public getRemoteRacer(id: string): RemoteRacerUpdate | undefined {
    const direct = this.latestRemoteRacers.get(id);
    if (direct) return direct;

    const lowerId = id.toLowerCase();
    for (const [k, v] of this.latestRemoteRacers.entries()) {
      const lowerK = k.toLowerCase();
      if (
        lowerK === lowerId ||
        lowerId.startsWith(`${lowerK}_guest_`) ||
        lowerK.startsWith(`${lowerId}_guest_`)
      ) {
        return v;
      }
    }
    return undefined;
  }

  public leaveRoom(participantId?: string) {
    this.broadcast({ type: 'LEAVE_ROOM', participantId });
    this.disconnect();
  }

  public sendCollisionBump(bump: Omit<NetworkCollisionBump, 'id'>) {
    const now = performance.now();
    const lastSent = this.lastBumpSentByTarget.get(bump.targetId) || 0;
    if (now - lastSent < 320) return;
    this.lastBumpSentByTarget.set(bump.targetId, now);

    const fullBump: NetworkCollisionBump = {
      ...bump,
      id: `bump_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
    this.processedHazardIds.add(fullBump.id);
    this.broadcast({
      type: 'CAR_BUMP',
      bump: fullBump,
    });
  }

  public popRemoteBumps(localPlayerId: string | null): NetworkCollisionBump[] {
    if (!localPlayerId || this.latestRemoteBumps.length === 0) return [];
    const lowerLocal = localPlayerId.toLowerCase();
    const mine = this.latestRemoteBumps.filter((b) => {
      const lowerTarget = b.targetId.toLowerCase();
      return (
        lowerTarget === lowerLocal ||
        lowerLocal.startsWith(`${lowerTarget}_guest_`) ||
        lowerTarget.startsWith(`${lowerLocal}_guest_`)
      );
    });
    this.latestRemoteBumps = [];
    return mine;
  }

  public popRemoteHazards(): NetworkHazardMessage[] {
    if (this.latestRemoteHazards.length === 0) return [];
    const items = [...this.latestRemoteHazards];
    this.latestRemoteHazards = [];
    return items;
  }

  public isConnected(): boolean {
    if (this.bcConnected) {
      return true;
    }
    if (this.currentRoomPin && dualDB.getFirebaseStatus().connected) {
      return true;
    }
    if (this.isHost) {
      return this.connections.size > 0;
    }
    return this.hostConnection !== null && this.hostConnection.open;
  }

  public disconnect() {
    this.cloudUnsubscribes.forEach((u) => u());
    this.cloudUnsubscribes = [];

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }
    this.bcConnected = false;

    this.connections.forEach((conn) => {
      try {
        conn.close();
      } catch {}
    });
    this.connections.clear();

    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch {}
      this.hostConnection = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }

    this.isHost = false;
    this.currentRoomPin = null;
    this.latestRemoteRacers.clear();
    this.latestRemoteHazards = [];
    this.processedHazardIds.clear();
    this.processedMsgIds.clear();
    this.lastSentFinishedByRacer.clear();
    this.notifyStatus(null);
  }
}

export const multiplayerService = new MultiplayerService();

import {
  Trophy,
  ClipboardList,
  RefreshCw,
  Home,
  Flag,
  BarChart3,
  Zap,
  Medal,
  Coins,
  Crown,
  Timer,
  Gauge,
  Flame,
  TrendingUp,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { drawModularCar } from '../game/carRenderer';
import { RANK_TIERS } from '../game/constants';
import {
  calculateCoinReward,
  calculateRPDelta,
  formatLeaderboardClipboard,
  getPlayerTitleById,
  getRankByRP,
} from '../game/rules';
import {
  BotDifficulty,
  CarLoadout,
  PlayerTitleId,
  PlayModeCategory,
  RacerState,
  TournamentRewardConfig,
} from '../game/types';
import { soundEngine } from '../services/sound';
import { drawRankCrestOnCanvas, RankCrest } from './RankBadge';

export interface FinalRacerResult {
  id: string;
  username: string;
  isBot: boolean;
  isBoss?: boolean;
  equippedTitle?: PlayerTitleId | null;
  damageDealtToBoss?: number;
  bossKnockdowns?: number;
  placement: number;
  teamId?: number;
  loadout: CarLoadout;
  rpBefore: number;
  rpDelta: number;
  coinsEarned: number;
  finishTimeMs: number;
  teamWon: boolean;
  maxSpeedKmh?: number;
  driftCount?: number;
}

interface PodiumStageProps {
  results: FinalRacerResult[];
  raceMode: 'solo' | 'team';
  teamCount: 2 | 3 | 4;
  winningTeamId: number | null;
  mapName: string;
  playMode?: PlayModeCategory;
  localPlayerId?: string | null;
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
  onPlayAgainLobby: () => void;
  onBackToMainMenu: () => void;
}

export function buildFinalResults(
  racers: RacerState[],
  raceMode: 'solo' | 'team',
  teamCount: 2 | 3 | 4,
  playMode?: PlayModeCategory,
  teacherRewards?: TournamentRewardConfig,
  botDifficulty: BotDifficulty = 'medium',
  laps: number = 3
): {
  results: FinalRacerResult[];
  winningTeamId: number | null;
  teamScores: Record<number, number>;
} {
  const sorted = [...racers].sort((a, b) => a.placement - b.placement);
  const total = sorted.length;

  // Calculate team scores if in team mode (points = (total - placement + 1))
  const teamScores: Record<number, number> = {};
  if (raceMode === 'team') {
    for (let t = 1; t <= teamCount; t++) teamScores[t] = 0;
    for (const r of sorted) {
      const tid = r.teamId || 1;
      const pts = Math.max(1, total - r.placement + 1);
      teamScores[tid] = (teamScores[tid] || 0) + pts;
    }
  }

  let winningTeamId: number | null = null;
  if (raceMode === 'team') {
    let bestScore = -1;
    for (const [tidStr, score] of Object.entries(teamScores)) {
      if (score > bestScore) {
        bestScore = score;
        winningTeamId = Number(tidStr);
      }
    }
  }

  const effectivePlayMode: PlayModeCategory = playMode || 'practice_ai';

  const results: FinalRacerResult[] = sorted.map((r) => {
    const teamWon =
      raceMode === 'team' && winningTeamId !== null && r.teamId === winningTeamId;
    const coinsEarned = calculateCoinReward(
      r.placement,
      teamWon,
      effectivePlayMode,
      teacherRewards,
      botDifficulty,
      laps
    );
    // Requirement #2: Only Official Teacher Tournaments ('teacher_cup') count toward Rank RP!
    const rpDelta = calculateRPDelta(
      r.placement,
      total,
      r.rp,
      effectivePlayMode
    );

    const fallbackMaxSpeed = Math.round(
      215 +
        (r.computedStats?.topSpeedBonus || 10) * 2.2 +
        Math.max(0, (total - r.placement) * 4)
    );
    const fallbackDrifts = Math.max(
      3,
      Math.round(laps * 4 + (r.placement === 1 ? 3 : 1))
    );

    return {
      id: r.id,
      username: r.username,
      isBot: r.isBot,
      isBoss: r.isBoss,
      equippedTitle: (r.equippedTitle as any) ?? null,
      damageDealtToBoss: (r as any).damageDealtToBoss || r.damageDealt || 0,
      bossKnockdowns: r.bossKnockdowns || 0,
      placement: r.placement,
      teamId: r.teamId,
      loadout: r.loadout,
      rpBefore: r.rp,
      rpDelta,
      coinsEarned,
      finishTimeMs: r.finishTimeMs,
      teamWon,
      maxSpeedKmh:
        r.maxSpeedKmh && r.maxSpeedKmh > 80 ? r.maxSpeedKmh : fallbackMaxSpeed,
      driftCount:
        typeof r.driftCount === 'number' && r.driftCount > 0
          ? r.driftCount
          : fallbackDrifts,
    };
  });

  return { results, winningTeamId, teamScores };
}

export const PodiumStage: React.FC<PodiumStageProps> = ({
  results,
  raceMode,
  winningTeamId,
  mapName,
  playMode = 'practice_ai',
  localPlayerId = null,
  campaignSummary = null,
  raidSummary = null,
  onPlayAgainLobby,
  onBackToMainMenu,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  const nonBossResults = results.filter((r) => !r.isBoss);
  const fastestFinisher = nonBossResults[0] || results[0];
  const mvpDamageRacer = [...nonBossResults].sort(
    (a, b) => (b.damageDealtToBoss || 0) - (a.damageDealtToBoss || 0)
  )[0];

  const top1 = results[0];
  const top2 = results[1];
  const top3 = results[2];

  // Determine the featured player for the Telemetry & Rank Progress card
  const playerResult =
    (localPlayerId
      ? results.find(
          (r) =>
            r.id.toLowerCase() === localPlayerId.toLowerCase() ||
            r.id.toLowerCase().startsWith(`${localPlayerId.toLowerCase()}_guest_`)
        )
      : null) ||
    results.find((r) => !r.isBot) ||
    results[0];

  // Best time across the match or player's own time
  const validTimes = results
    .filter((r) => r.finishTimeMs > 0)
    .map((r) => r.finishTimeMs);
  const bestMatchTimeMs =
    validTimes.length > 0 ? Math.min(...validTimes) : 0;
  const displayBestTimeSec =
    playerResult && playerResult.finishTimeMs > 0
      ? (playerResult.finishTimeMs / 1000).toFixed(2)
      : bestMatchTimeMs > 0
      ? (bestMatchTimeMs / 1000).toFixed(2)
      : '--';

  const displayMaxSpeed = playerResult?.maxSpeedKmh || 238;
  const displayDriftCount = playerResult?.driftCount ?? 12;

  // Next Rank Progression calculation
  const currentTotalRP = playerResult
    ? Math.max(0, playerResult.rpBefore + playerResult.rpDelta)
    : 0;
  const currentRankDef = getRankByRP(currentTotalRP);
  const currentRankIdx = RANK_TIERS.findIndex(
    (t) => t.id === currentRankDef.id
  );
  const nextRankDef =
    currentRankIdx >= 0 && currentRankIdx < RANK_TIERS.length - 1
      ? RANK_TIERS[currentRankIdx + 1]
      : null;

  const rankProgressPercent = nextRankDef
    ? Math.max(
        4,
        Math.min(
          100,
          Math.round(
            ((currentTotalRP - currentRankDef.minRP) /
              Math.max(1, nextRankDef.minRP - currentRankDef.minRP)) *
              100
          )
        )
      )
    : 100;
  const rpNeededForNext = nextRankDef
    ? Math.max(0, nextRankDef.minRP - currentTotalRP)
    : 0;

  useEffect(() => {
    soundEngine.playFanfare(true);
  }, []);

  // Animated 3-Tier Metallic Podium Canvas with Overhead Spotlights, Starburst Rays, Drive-In Brake Animation & Multi-Color Confetti
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Multi-color Confetti Ribbons falling from top to bottom (Orange, Gold, Cyan, Pink)
    const confettiColors = [
      '#F59E0B', // Neon Orange-Amber
      '#FACC15', // Bright Gold
      '#06B6D4', // Electric Cyan
      '#EC4899', // Hot Pink
      '#38BDF8', // Sky Cyan
      '#F43F5E', // Rose Pink
    ];

    interface ConfettiPiece {
      x: number;
      y: number;
      vx: number;
      vy: number;
      w: number;
      h: number;
      color: string;
      rotation: number;
      vRot: number;
      swayPhase: number;
      swaySpeed: number;
    }

    const confetti: ConfettiPiece[] = Array.from({ length: 85 }, () => ({
      x: Math.random() * w,
      y: -Math.random() * h,
      vx: (Math.random() - 0.5) * 28,
      vy: 68 + Math.random() * 85,
      w: 6 + Math.random() * 6,
      h: 3.5 + Math.random() * 4.5,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 7,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 2 + Math.random() * 3,
    }));

    interface BrakeSpark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      color: string;
      size: number;
    }
    const brakeSparks: BrakeSpark[] = [];

    const startTime = performance.now();
    let lastTime = startTime;
    let animId = 0;

    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const nowSec = now / 1000;
      const elapsed = (now - startTime) / 1000;

      // 1. Stage Background (Adapts between Daylight Studio & Deep Navy-Blue Night Stage)
      const isLightStage =
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('theme-light');
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      if (isLightStage) {
        bgGrad.addColorStop(0, '#E2E8F0');
        bgGrad.addColorStop(0.5, '#F1F5F9');
        bgGrad.addColorStop(0.82, '#E2E8F0');
        bgGrad.addColorStop(1, '#CBD5E1');
      } else {
        bgGrad.addColorStop(0, '#040711');
        bgGrad.addColorStop(0.5, '#091128');
        bgGrad.addColorStop(0.82, '#111C3D');
        bgGrad.addColorStop(1, '#070B19');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle perspective stage grid on the floor
      const horizonY = h - 155;
      ctx.save();
      ctx.strokeStyle = isLightStage
        ? 'rgba(2, 132, 199, 0.16)'
        : 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.5 + i * 38, horizonY);
        ctx.lineTo(w * 0.5 + i * 115, h);
        ctx.stroke();
      }
      for (let r = 0; r < 5; r++) {
        const yLine = horizonY + Math.pow(r / 4, 1.5) * (h - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, yLine);
        ctx.lineTo(w, yLine);
        ctx.stroke();
      }
      ctx.restore();

      // Ambient stage aura behind Top 1
      const stageGlow = ctx.createRadialGradient(
        w * 0.5,
        h * 0.42,
        15,
        w * 0.5,
        h * 0.42,
        340
      );
      stageGlow.addColorStop(
        0,
        isLightStage ? 'rgba(245, 158, 11, 0.30)' : 'rgba(245, 158, 11, 0.24)'
      );
      stageGlow.addColorStop(
        0.45,
        isLightStage ? 'rgba(14, 165, 233, 0.14)' : 'rgba(139, 92, 246, 0.10)'
      );
      stageGlow.addColorStop(1, 'rgba(4, 7, 17, 0)');
      ctx.fillStyle = stageGlow;
      ctx.fillRect(0, 0, w, h);

      // 3-Tier Podium Configuration (2nd Left Silver, 1st Center Gold, 3rd Right Bronze)
      const pedestals = [
        {
          slot: 2,
          racer: top2,
          rankLabel: 'HẠNG 2 • Á QUÂN',
          cx: w * 0.21,
          baseY: h - 16,
          boxW: 196,
          boxH: 108,
          gradStops: ['#E2E8F0', '#94A3B8', '#475569'] as [string, string, string],
          topDeckGrad: ['#F8FAFC', '#CBD5E1'] as [string, string],
          border: '#F1F5F9',
          glowColor: 'rgba(226, 232, 240, 0.28)',
          spotlightColor: 'rgba(226, 232, 240, 0.13)',
          textColor: '#0F172A',
          badgeColor: '#E2E8F0',
          scale: 1.55,
          entryDelay: 0.18,
          entryFromX: -140,
        },
        {
          slot: 3,
          racer: top3,
          rankLabel: 'HẠNG 3 • QUÝ QUÂN',
          cx: w * 0.79,
          baseY: h - 16,
          boxW: 196,
          boxH: 90,
          gradStops: ['#FDBA74', '#D97706', '#78350F'] as [string, string, string],
          topDeckGrad: ['#FED7AA', '#B45309'] as [string, string],
          border: '#FCD34D',
          glowColor: 'rgba(217, 119, 6, 0.25)',
          spotlightColor: 'rgba(251, 146, 60, 0.12)',
          textColor: '#0F172A',
          badgeColor: '#FDE68A',
          scale: 1.5,
          entryDelay: 0.32,
          entryFromX: w + 140,
        },
        {
          slot: 1,
          racer: top1,
          rankLabel: '👑 TOP 1 VÔ ĐỊCH',
          cx: w * 0.5,
          baseY: h - 16,
          boxW: 232,
          boxH: 146,
          gradStops: ['#FEF08A', '#F59E0B', '#B45309'] as [string, string, string],
          topDeckGrad: ['#FEF9C3', '#F59E0B'] as [string, string],
          border: '#FEF08A',
          glowColor: 'rgba(250, 204, 21, 0.45)',
          spotlightColor: 'rgba(250, 204, 21, 0.22)',
          textColor: '#090D16',
          badgeColor: '#FEF08A',
          scale: 1.85,
          entryDelay: 0.0,
          entryFromX: w * 0.5 - 260,
        },
      ];

      // 2. Rotating Starburst Rays behind the Winning Cars (Especially Top 1)
      for (const ped of pedestals) {
        if (!ped.racer) continue;
        const topY = ped.baseY - ped.boxH;
        const carCenterY = topY - 58;
        const isFirst = ped.slot === 1;
        const rayCount = isFirst ? 16 : 10;
        const outerR = isFirst ? 155 : 95;

        ctx.save();
        ctx.translate(ped.cx, carCenterY);
        ctx.rotate(nowSec * (isFirst ? 0.45 : -0.3));
        for (let i = 0; i < rayCount; i++) {
          const a0 = (i / rayCount) * Math.PI * 2;
          const a1 = a0 + (Math.PI / rayCount) * 0.48;
          const rayGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, outerR);
          if (isFirst) {
            rayGrad.addColorStop(0, 'rgba(254, 240, 138, 0.42)');
            rayGrad.addColorStop(0.55, 'rgba(245, 158, 11, 0.16)');
            rayGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          } else {
            rayGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
            rayGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          }
          ctx.fillStyle = rayGrad;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, outerR, a0, a1);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // 3. Overhead Spotlight Cones shining from Top of Stage onto each Pedestal
      for (const ped of pedestals) {
        const topY = ped.baseY - ped.boxH;
        ctx.save();
        const coneGrad = ctx.createLinearGradient(ped.cx, 0, ped.cx, topY + 20);
        if (ped.racer) {
          coneGrad.addColorStop(0, ped.spotlightColor);
          coneGrad.addColorStop(0.7, ped.spotlightColor.replace(/[\d.]+\)$/, '0.06)'));
          coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          coneGrad.addColorStop(0, 'rgba(148, 163, 184, 0.05)');
          coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(ped.cx - 26, 0);
        ctx.lineTo(ped.cx + 26, 0);
        ctx.lineTo(ped.cx + ped.boxW * 0.62, topY + 12);
        ctx.lineTo(ped.cx - ped.boxW * 0.62, topY + 12);
        ctx.closePath();
        ctx.fill();

        // Overhead lamp fixture glow at y = 4
        ctx.fillStyle = ped.racer ? ped.border : '#475569';
        ctx.beginPath();
        ctx.ellipse(ped.cx, 4, 20, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 4. Draw 3 Metallic Pedestals & Cars Perched cleanly ABOVE the Pedestals
      for (const ped of pedestals) {
        const topY = ped.baseY - ped.boxH;
        const halfW = ped.boxW / 2;
        const isEmpty = !ped.racer;

        ctx.save();
        if (isEmpty) {
          ctx.globalAlpha = 0.42;
        }

        // 3D Isometric Top Surface Deck of Pedestal (from topY - 14 to topY)
        const deckGrad = ctx.createLinearGradient(
          ped.cx - halfW,
          topY - 14,
          ped.cx + halfW,
          topY
        );
        if (isEmpty) {
          deckGrad.addColorStop(0, '#1E293B');
          deckGrad.addColorStop(1, '#0F172A');
        } else {
          deckGrad.addColorStop(0, ped.topDeckGrad[0]);
          deckGrad.addColorStop(1, ped.topDeckGrad[1]);
        }
        ctx.fillStyle = deckGrad;
        ctx.beginPath();
        ctx.moveTo(ped.cx - halfW + 14, topY - 14);
        ctx.lineTo(ped.cx + halfW - 14, topY - 14);
        ctx.lineTo(ped.cx + halfW, topY);
        ctx.lineTo(ped.cx - halfW, topY);
        ctx.closePath();
        ctx.fill();

        // Metallic Front Face of Pedestal
        const faceGrad = ctx.createLinearGradient(
          ped.cx - halfW,
          topY,
          ped.cx + halfW,
          ped.baseY
        );
        if (isEmpty) {
          faceGrad.addColorStop(0, '#1E293B');
          faceGrad.addColorStop(0.5, '#0F172A');
          faceGrad.addColorStop(1, '#090D16');
        } else {
          faceGrad.addColorStop(0, ped.gradStops[0]);
          faceGrad.addColorStop(0.45, ped.gradStops[1]);
          faceGrad.addColorStop(1, ped.gradStops[2]);
        }

        ctx.fillStyle = faceGrad;
        ctx.strokeStyle = isEmpty ? '#475569' : ped.border;
        ctx.lineWidth = ped.slot === 1 ? 3 : 2;
        ctx.beginPath();
        ctx.roundRect(ped.cx - halfW, topY, ped.boxW, ped.boxH, [6, 6, 0, 0]);
        ctx.fill();
        ctx.stroke();

        // Diagonal Metallic Sheen Reflection across Pedestal Face
        if (!isEmpty) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(ped.cx - halfW, topY, ped.boxW, ped.boxH, [6, 6, 0, 0]);
          ctx.clip();
          const sheenX =
            ped.cx -
            halfW -
            60 +
            (((nowSec * 90 + ped.slot * 80) % (ped.boxW + 180)));
          const sheenGrad = ctx.createLinearGradient(
            sheenX - 35,
            topY,
            sheenX + 35,
            topY + ped.boxH
          );
          sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.28)');
          sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = sheenGrad;
          ctx.fillRect(ped.cx - halfW, topY, ped.boxW, ped.boxH);
          ctx.restore();
        }

        // Dark Inner Plate on Front of Pedestal for Crisp High-Contrast Text Readability
        const plateMargin = 10;
        const plateY = topY + 32;
        const plateH = ped.boxH - 40;
        ctx.fillStyle = 'rgba(9, 13, 22, 0.84)';
        ctx.strokeStyle = isEmpty
          ? 'rgba(100, 116, 139, 0.3)'
          : 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(
          ped.cx - halfW + plateMargin,
          plateY,
          ped.boxW - plateMargin * 2,
          plateH,
          8
        );
        ctx.fill();
        ctx.stroke();

        // Top Header Ribbon on Pedestal ("TOP 1 VÔ ĐỊCH", "HẠNG 2", "HẠNG 3")
        ctx.fillStyle = isEmpty ? '#94A3B8' : ped.textColor;
        ctx.font =
          ped.slot === 1
            ? '900 14px "Orbitron", "Be Vietnam Pro", sans-serif'
            : '800 12px "Orbitron", "Be Vietnam Pro", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ped.rankLabel, ped.cx, topY + 21);

        if (ped.racer) {
          // Player Name on Pedestal Face
          ctx.fillStyle = '#FFFFFF';
          ctx.font =
            ped.slot === 1
              ? '800 15px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif'
              : '700 13px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
          const displayName =
            ped.racer.username.length > 18
              ? ped.racer.username.slice(0, 17) + '…'
              : ped.racer.username;
          ctx.fillText(displayName, ped.cx, plateY + 24);

          // Rank Crest Icon + Rank Name & Coins on Pedestal Face
          const rankDef = getRankByRP(ped.racer.rpBefore + ped.racer.rpDelta);
          const rankText = `Hạng ${rankDef.name}  •  +${ped.racer.coinsEarned} Xu`;
          ctx.font = '700 12px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
          const textW = ctx.measureText(rankText).width;
          const crestSize = 21;
          const gap = 5;
          const totalGroupW = crestSize + gap + textW;
          const groupStartX = ped.cx - totalGroupW * 0.5;

          drawRankCrestOnCanvas(
            ctx,
            rankDef.id,
            groupStartX + crestSize * 0.5,
            plateY + 41,
            crestSize
          );

          ctx.fillStyle = rankDef.color;
          ctx.textAlign = 'left';
          ctx.fillText(rankText, groupStartX + crestSize + gap, plateY + 45);
          ctx.textAlign = 'center';

          // Finish Time on Top 1 Pedestal
          if (ped.slot === 1 && ped.racer.finishTimeMs > 0) {
            ctx.fillStyle = '#FEF08A';
            ctx.font = '700 11px "Rajdhani", monospace';
            ctx.fillText(
              `⏱ THỜI GIAN: ${(ped.racer.finishTimeMs / 1000).toFixed(2)}s`,
              ped.cx,
              plateY + 66
            );
          }
        } else {
          // Empty Pedestal Placeholder text
          ctx.fillStyle = '#64748B';
          ctx.font = '700 12px "Be Vietnam Pro", sans-serif';
          ctx.fillText('Chưa có tay đua', ped.cx, plateY + plateH / 2 + 4);
        }
        ctx.restore();

        // 5. Render Car ABOVE Pedestal (With Drive-In + Hard Brake Stop Animation) OR "?" for Empty Slot
        const carRestY = topY - 64; // Strictly ABOVE topY - 14 deck so even nitro flames never touch pedestal text!
        if (!ped.racer) {
          // Dimmed "?" Mystery Placeholder above empty pedestal
          ctx.save();
          ctx.globalAlpha = 0.55 + Math.sin(nowSec * 2.5 + ped.slot) * 0.15;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ped.cx, carRestY + 8, 28, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#94A3B8';
          ctx.font = '900 28px "Orbitron", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', ped.cx, carRestY + 10);
          ctx.restore();
        } else {
          // Drive-in & Hard-Brake Stop Animation (0 -> 0.85s after ped.entryDelay)
          const localT = Math.max(0, elapsed - ped.entryDelay);
          const driveDuration = 0.85;
          const rawProg = Math.min(1, localT / driveDuration);
          // Ease-out back overshoot for dramatic hard braking stop!
          const easeOutBack = (t: number) => {
            const c1 = 1.45;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
          };
          const eased = rawProg < 1 ? easeOutBack(rawProg) : 1;
          const carX = ped.entryFromX + (ped.cx - ped.entryFromX) * eased;

          // Spawn tire brake sparks during braking window (0.55 < rawProg < 0.96)
          if (rawProg > 0.52 && rawProg < 0.96 && Math.random() < 0.65) {
            brakeSparks.push({
              x: carX + (Math.random() - 0.5) * 32,
              y: topY - 12 + (Math.random() - 0.5) * 6,
              vx: (ped.entryFromX < ped.cx ? 1 : -1) * (35 + Math.random() * 55),
              vy: -25 - Math.random() * 45,
              alpha: 1,
              color: Math.random() < 0.5 ? '#FACC15' : '#FB923C',
              size: 2 + Math.random() * 2.5,
            });
          }

          // Brake nose-tilt pitch & subtle showcase angle above the pedestal
          const brakeTilt =
            rawProg < 1
              ? Math.sin(rawProg * Math.PI) *
                (ped.entryFromX < ped.cx ? 0.22 : -0.22)
              : Math.sin(nowSec * 1.6 + ped.slot) * 0.08;

          // Car shadow on top of the pedestal deck
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
          ctx.beginPath();
          ctx.ellipse(
            carX,
            topY - 8,
            34 * (ped.scale / 1.6),
            9 * (ped.scale / 1.6),
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.restore();

          // Draw car cleanly ABOVE pedestal (facing upward with slight showcase angle)
          drawModularCar(ctx, ped.racer.loadout, {
            x: carX,
            y: carRestY,
            angle: -Math.PI * 0.5 + brakeTilt,
            scale: ped.scale,
            nowSec,
            drifting: rawProg > 0.5 && rawProg < 0.95,
            nitroActive: ped.slot === 1,
          });
        }
      }

      // 6. Update & Draw Brake Sparks
      for (let i = brakeSparks.length - 1; i >= 0; i--) {
        const sp = brakeSparks[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.vy += 120 * dt;
        sp.alpha -= 2.2 * dt;
        if (sp.alpha <= 0) {
          brakeSparks.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, sp.alpha);
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 7. Update & Draw Multi-Color Falling Confetti Ribbons
      for (const c of confetti) {
        c.y += c.vy * dt;
        c.x +=
          c.vx * dt + Math.sin(nowSec * c.swaySpeed + c.swayPhase) * 28 * dt;
        c.rotation += c.vRot * dt;

        if (c.y > h + 16) {
          c.y = -12 - Math.random() * 40;
          c.x = Math.random() * w;
        }
        if (c.x < -20) c.x = w + 15;
        if (c.x > w + 20) c.x = -15;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        const flipScaleY = Math.cos(nowSec * c.swaySpeed + c.swayPhase);
        ctx.scale(1, Math.max(0.25, Math.abs(flipScaleY)));
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [top1, top2, top3]);

  const handleCopyStandings = async () => {
    const text = formatLeaderboardClipboard(
      results.map((r) => ({
        placement: r.placement,
        username: r.username,
        coinsEarned: r.coinsEarned,
      }))
    );
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    soundEngine.playCoin();
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-gradient-to-br from-[#050814] via-[#0B1228] to-[#140E2E] overflow-y-auto text-slate-100 select-none flex flex-col justify-between"
      style={{ fontFamily: "'Be Vietnam Pro', 'Rajdhani', sans-serif" }}
    >
      {/* Dynamic Animated Speed Lines & Floating Glowing Particles Background (Synchronized with Login Screen) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[420px] bg-gradient-to-b from-amber-500/15 via-cyan-500/8 to-transparent blur-[130px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[360px] bg-purple-600/15 blur-[150px] rounded-full" />
        <div className="absolute top-1/3 left-0 w-[450px] h-[300px] bg-cyan-500/10 blur-[130px] rounded-full" />

        {/* Subtle diagonal speed lines */}
        <div className="absolute inset-0 opacity-20">
          <div className="podium-speed-line top-[14%] left-[-20%] w-[45%]" />
          <div
            className="podium-speed-line top-[38%] left-[-30%] w-[55%]"
            style={{ animationDelay: '1.1s' }}
          />
          <div
            className="podium-speed-line top-[68%] left-[-25%] w-[50%]"
            style={{ animationDelay: '2.3s' }}
          />
          <div
            className="podium-speed-line top-[86%] left-[-15%] w-[40%]"
            style={{ animationDelay: '0.6s' }}
          />
        </div>
      </div>

      {/* Main Centered Container Occupying Full Viewport Height */}
      <div className="relative z-10 w-full max-w-7xl mx-auto my-auto py-4 sm:py-6 px-3.5 sm:px-6 flex flex-col justify-center gap-4 sm:gap-5 min-h-screen">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#0B1224]/90 border border-amber-500/35 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.65)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FACC15] via-[#F59E0B] to-[#EA580C] p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.45)] flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#070B18] flex items-center justify-center">
                <Trophy className="w-6 h-6 text-[#FEF08A]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1
                  className="text-lg sm:text-2xl font-black uppercase tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent"
                  style={{ fontFamily: "'Orbitron', 'Be Vietnam Pro', sans-serif" }}
                >
                  KẾT QUẢ CHẶNG ĐUA
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    playMode === 'teacher_cup'
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                      : 'bg-slate-800/90 text-cyan-300 border border-cyan-500/40'
                  }`}
                >
                  {playMode === 'teacher_cup' ? '🏆 GIẢI ĐẤU RANK' : '⚡ LUYỆN TẬP'}
                </span>
              </div>
              <div className="text-xs sm:text-sm text-slate-300 flex items-center gap-2 mt-0.5 flex-wrap">
                <span>
                  Đường đua: <strong className="text-amber-300">{mapName}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-400 font-bold">
                  {results.length} tay đua
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Secondary ("COPY BẢNG VÀO LỚP", "SẢNH CHÍNH") & Primary Pulsing ("ĐUA TIẾP") */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleCopyStandings}
              className="px-3.5 py-2.5 rounded-2xl bg-[#131C33] hover:bg-[#1E2946] border border-slate-700/80 hover:border-cyan-400/50 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow active:scale-95"
            >
              <ClipboardList className="w-4 h-4 text-cyan-400" />
              <span>{copied ? '✓ ĐÃ COPY' : 'COPY BẢNG VÀO LỚP'}</span>
            </button>

            <button
              type="button"
              onClick={onBackToMainMenu}
              className="px-3.5 py-2.5 rounded-2xl bg-[#090E1D] hover:bg-[#162038] border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
            >
              <Home className="w-4 h-4 text-slate-400" />
              <span>SẢNH CHÍNH</span>
            </button>

            <button
              type="button"
              onClick={onPlayAgainLobby}
              className="group relative overflow-hidden px-5 sm:px-6 py-3 rounded-2xl bg-gradient-to-r from-[#F59E0B] via-[#FACC15] to-[#EA580C] hover:brightness-110 text-[#070B18] text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-200 cursor-pointer inline-flex items-center gap-2 shadow-[0_0_28px_rgba(245,158,11,0.55)] hover:shadow-[0_0_38px_rgba(250,204,21,0.85)] hover:scale-[1.03] active:scale-95 animate-pulse"
              style={{ fontFamily: "'Orbitron', 'Be Vietnam Pro', sans-serif" }}
            >
              <RefreshCw className="w-4 h-4 stroke-[2.75] transition-transform duration-300 group-hover:rotate-180" />
              <span>ĐUA TIẾP</span>
            </button>
          </div>
        </div>

        {/* Raid Boss / Solo Campaign Special Banner */}
        {raidSummary && (
          <div
            data-testid="podium-raid-summary"
            className={`p-4 rounded-3xl border-2 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 ${
              raidSummary.teamWon
                ? 'bg-gradient-to-r from-rose-950/90 via-[#1E1024]/95 to-amber-950/90 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.35)]'
                : 'bg-slate-900/95 border-rose-500/60'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-2xl shrink-0">
                {raidSummary.bossIcon}
              </div>
              <div>
                <div className="text-[11px] font-sci font-black uppercase tracking-widest text-amber-300">
                  {raidSummary.teamWon
                    ? '🔥 CHIẾN THẮNG SĂN TRÙM — TOÀN ĐỘI HẠ GỤC BOSS!'
                    : '💀 BOSS VỀ ĐÍCH TRƯỚC — HÃY NÂNG CẤP XE & THỬ LẠI!'}
                </div>
                <div className="text-sm sm:text-base font-black text-white mt-0.5">
                  Boss: {raidSummary.bossName} • Số lần bắn Sập Nguồn: {raidSummary.knockdowns}/3
                </div>
                {raidSummary.unlockedTitleName && (
                  <div className="text-xs font-extrabold text-emerald-300 mt-1">
                    🎁 Đã mở khóa Danh Hiệu Độc Quyền: {raidSummary.unlockedTitleName}!
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {fastestFinisher && (
                <div className="px-3.5 py-2 rounded-2xl bg-[#070B18]/90 border border-amber-400/50">
                  <div className="text-[9px] font-black text-amber-300 uppercase">
                    🏁 TOP VỀ ĐÍCH NHANH NHẤT
                  </div>
                  <div className="text-xs font-black text-white">
                    {fastestFinisher.username} (#{fastestFinisher.placement})
                  </div>
                </div>
              )}
              {mvpDamageRacer && (mvpDamageRacer.damageDealtToBoss || 0) > 0 && (
                <div className="px-3.5 py-2 rounded-2xl bg-[#070B18]/90 border border-rose-400/50">
                  <div className="text-[9px] font-black text-rose-300 uppercase">
                    💥 MVP SÁT THƯƠNG BOSS
                  </div>
                  <div className="text-xs font-black text-white">
                    {mvpDamageRacer.username} ({mvpDamageRacer.damageDealtToBoss?.toLocaleString()} DMG)
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {campaignSummary && (
          <div
            data-testid="podium-campaign-summary"
            className={`p-4 rounded-3xl border-2 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 ${
              campaignSummary.passed
                ? 'bg-gradient-to-r from-amber-950/90 via-[#0E1B38]/95 to-emerald-950/90 border-amber-400'
                : 'bg-slate-900/95 border-rose-500/60'
            }`}
          >
            <div>
              <div className="text-[11px] font-sci font-black uppercase tracking-widest text-amber-300">
                {campaignSummary.passed
                  ? `🗺️ VƯỢT MÀN THÀNH CÔNG — CẤP ĐỘ ${campaignSummary.levelNumber}`
                  : `⚠️ CHƯA ĐẠT MỤC TIÊU CẤP ĐỘ ${campaignSummary.levelNumber}`}
              </div>
              <div className="text-sm sm:text-base font-black text-white mt-0.5">
                {campaignSummary.title}
              </div>
              {campaignSummary.unlockedTitleName && (
                <div className="text-xs font-extrabold text-emerald-300 mt-1">
                  👑 Mở khóa Danh Hiệu Cột Mốc: {campaignSummary.unlockedTitleName}!
                </div>
              )}
              {campaignSummary.passed && (
                <div className="text-xs font-bold text-cyan-300 mt-0.5">
                  ✓ Đã mở khóa Màn {Math.min(50, campaignSummary.levelNumber + 1)}!
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-2 rounded-2xl bg-[#070B18]/90 border border-amber-400/40 text-center">
                <div className="text-[9px] font-black text-slate-400 uppercase">ĐÁNH GIÁ SAO</div>
                <div className="text-sm font-black text-[#FACC15]">
                  {'⭐'.repeat(campaignSummary.stars)}{'☆'.repeat(3 - campaignSummary.stars)} ({campaignSummary.stars}★)
                </div>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-[#070B18]/90 border border-emerald-400/40 text-center">
                <div className="text-[9px] font-black text-slate-400 uppercase">THƯỞNG XU NHẬN ĐƯỢC</div>
                <div className="text-sm font-black text-emerald-300">
                  {campaignSummary.firstClearCoins > 0
                    ? `+${campaignSummary.firstClearCoins} XU`
                    : '0 XU'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Responsive Grid: On Mobile Podium is on Top and Leaderboard is Below; on Desktop 7/5 Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
          {/* Left Column (7 cols): 3-Tier Podium Canvas + Race Telemetry & Rank Progress Block */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Podium Stage Card */}
            <div className="relative rounded-3xl overflow-hidden border border-amber-500/35 bg-[#060A17] shadow-[0_16px_50px_rgba(0,0,0,0.75)] flex flex-col justify-between">
              <div className="absolute top-3.5 left-4 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 border border-amber-400/30 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span
                  className="text-[11px] font-black text-amber-300 uppercase tracking-widest"
                  style={{ fontFamily: "'Orbitron', 'Be Vietnam Pro', sans-serif" }}
                >
                  PODIUM VINH QUANG
                </span>
              </div>

              <canvas
                ref={canvasRef}
                width={880}
                height={420}
                className="w-full h-auto block"
              />

              {raceMode === 'team' && winningTeamId !== null && (
                <div className="p-3.5 bg-[#0B1224]/95 border-t border-amber-500/30 backdrop-blur-md flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow">
                      <Flag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                        ĐỒNG ĐỘI CHIẾN THẮNG
                      </div>
                      <div className="text-xs sm:text-sm font-black text-white">
                        ĐỘI {winningTeamId} VÔ ĐỊCH TỔNG SẮP!
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-amber-200/80 hidden sm:inline">
                    +Xu thưởng đồng đội cho toàn bộ thành viên
                  </span>
                </div>
              )}
            </div>

            {/* Race Statistics & Rank Progression Block */}
            <div className="p-4 sm:p-5 rounded-3xl bg-[#0B1224]/90 border border-slate-800/90 shadow-2xl backdrop-blur-xl flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span
                    className="text-xs sm:text-sm font-black text-white uppercase tracking-wider"
                    style={{ fontFamily: "'Orbitron', 'Be Vietnam Pro', sans-serif" }}
                  >
                    THỐNG KÊ CHẶNG ĐUA — {playerResult?.username || 'TAY ĐUA'}
                  </span>
                </div>
                {playerResult && (
                  <span className="text-[11px] font-bold text-amber-300 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    Hạng về đích: #{playerResult.placement}
                  </span>
                )}
              </div>

              {/* 3 Telemetry Stat Cards: Best Time, Max Speed, Drift Count */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
                <div className="p-3 rounded-2xl bg-[#070B16]/90 border border-slate-800/90 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <Timer className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase truncate">
                      Thời gian tốt nhất
                    </div>
                    <div
                      className="text-sm sm:text-base font-black text-white font-mono"
                      style={{ fontFamily: "'Rajdhani', monospace" }}
                    >
                      {displayBestTimeSec !== '--' ? `${displayBestTimeSec}s` : '--'}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#070B16]/90 border border-slate-800/90 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Gauge className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase truncate">
                      Tốc độ tối đa
                    </div>
                    <div
                      className="text-sm sm:text-base font-black text-amber-300 font-mono"
                      style={{ fontFamily: "'Rajdhani', monospace" }}
                    >
                      {displayMaxSpeed} KM/H
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#070B16]/90 border border-slate-800/90 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4 text-pink-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase truncate">
                      Số lần drift
                    </div>
                    <div
                      className="text-sm sm:text-base font-black text-pink-300 font-mono"
                      style={{ fontFamily: "'Rajdhani', monospace" }}
                    >
                      {displayDriftCount} lần
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar to Next Rank */}
              <div className="p-3.5 rounded-2xl bg-[#070B16]/95 border border-slate-800/90 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <RankCrest tierId={currentRankDef.id} size={18} />
                    <span
                      className="font-black uppercase tracking-wide"
                      style={{ color: currentRankDef.color }}
                    >
                      Hạng {currentRankDef.name} ({currentTotalRP} RP)
                    </span>
                    {playerResult && playerResult.rpDelta !== 0 && (
                      <span
                        className={`text-[11px] font-black px-1.5 py-0.5 rounded ${
                          playerResult.rpDelta > 0
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {playerResult.rpDelta > 0
                          ? `+${playerResult.rpDelta} RP`
                          : `${playerResult.rpDelta} RP`}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    {nextRankDef ? (
                      <>
                        <span>Tiếp theo:</span>
                        <RankCrest tierId={nextRankDef.id} size={15} />
                        <span
                          className="font-black"
                          style={{ color: nextRankDef.color }}
                        >
                          {nextRankDef.name}
                        </span>
                        <span className="text-slate-400">
                          (còn {rpNeededForNext} RP)
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-300 font-black">
                        👑 ĐÃ ĐẠT BẬC THÁCH ĐẤU TỐI THƯỢNG
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-cyan-400 transition-all duration-700 shadow-[0_0_12px_rgba(250,204,21,0.6)]"
                    style={{ width: `${rankProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Upgraded Leaderboard Table */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex-1 rounded-3xl bg-[#0B1224]/90 border border-slate-800/90 shadow-[0_16px_50px_rgba(0,0,0,0.75)] backdrop-blur-xl flex flex-col overflow-hidden">
              <div className="px-4 py-3.5 bg-[#070B16]/90 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span
                    className="text-xs sm:text-sm font-black text-white uppercase tracking-wider"
                    style={{ fontFamily: "'Orbitron', 'Be Vietnam Pro', sans-serif" }}
                  >
                    BẢNG XẾP HẠNG TRẬN ĐẤU
                  </span>
                </div>
                <span className="text-[11px] font-bold text-cyan-300 px-2.5 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-500/35">
                  {results.length} tay đua
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 max-h-[540px]">
                {results.map((r) => {
                  const totalRP = Math.max(0, r.rpBefore + r.rpDelta);
                  const newRank = getRankByRP(totalRP);
                  const isTop1 = r.placement === 1;
                  const isTop2 = r.placement === 2;
                  const isTop3 = r.placement === 3;
                  const isCurrentPlayer = Boolean(
                    playerResult && r.id === playerResult.id
                  );

                  const timeSec =
                    r.finishTimeMs > 0
                      ? `${(r.finishTimeMs / 1000).toFixed(2)}s`
                      : '--';

                  return (
                    <div
                      key={r.id}
                      className={`p-3 rounded-2xl flex items-center justify-between text-xs transition-all border ${
                        isCurrentPlayer
                          ? 'bg-gradient-to-r from-amber-500/20 via-[#152244] to-[#0B1224] border-amber-400 shadow-[0_0_22px_rgba(245,158,11,0.28)] ring-1 ring-amber-400/50'
                          : isTop1
                          ? 'bg-gradient-to-r from-[#271C08] to-[#0B1224] border-amber-500/70 shadow-[0_0_16px_rgba(245,158,11,0.16)]'
                          : isTop2
                          ? 'bg-gradient-to-r from-[#1E293B] to-[#0B1224] border-slate-400/50'
                          : isTop3
                          ? 'bg-gradient-to-r from-[#23160C] to-[#0B1224] border-amber-700/60'
                          : 'bg-[#070B16]/90 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {/* Crown / Medal Badge for Top 3 instead of "P1" */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isTop1
                              ? 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 text-slate-950 shadow-[0_0_15px_rgba(250,204,21,0.5)]'
                              : isTop2
                              ? 'bg-gradient-to-br from-white via-slate-200 to-slate-400 text-slate-950 shadow-[0_0_12px_rgba(226,232,240,0.35)]'
                              : isTop3
                              ? 'bg-gradient-to-br from-amber-300 via-amber-600 to-amber-800 text-white shadow-[0_0_12px_rgba(217,119,6,0.35)]'
                              : 'bg-slate-800/90 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {isTop1 ? (
                            <Crown className="w-5 h-5 stroke-[2.4]" />
                          ) : isTop2 ? (
                            <Medal className="w-5 h-5 stroke-[2.2]" />
                          ) : isTop3 ? (
                            <Medal className="w-5 h-5 stroke-[2.2]" />
                          ) : (
                            <span style={{ fontFamily: "'Orbitron', sans-serif" }}>
                              #{r.placement}
                            </span>
                          )}
                        </div>

                        {/* Player Name, Badges & Rank + Time */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-white text-xs sm:text-sm truncate">
                              {r.username}
                            </span>
                            {r.equippedTitle && (() => {
                              const tDef = getPlayerTitleById(r.equippedTitle);
                              return tDef ? (
                                <span
                                  style={{
                                    color: tDef.color,
                                    borderColor: `${tDef.color}66`,
                                  }}
                                  className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-950/90 border shrink-0"
                                >
                                  {tDef.icon} {tDef.badgeText || (tDef as any).name}
                                </span>
                              ) : null;
                            })()}
                            {isCurrentPlayer && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 uppercase tracking-wider shrink-0">
                                BẠN
                              </span>
                            )}
                            {r.isBoss && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white shrink-0">
                                BOSS
                              </span>
                            )}
                            {r.isBot && !r.isBoss && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                                AI
                              </span>
                            )}
                            {(r.damageDealtToBoss || 0) > 0 && (
                              <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-500/40 text-rose-300 shrink-0">
                                💥 {r.damageDealtToBoss} DMG
                              </span>
                            )}
                            {raceMode === 'team' && (
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 border ${
                                  r.teamId === 1
                                    ? 'bg-rose-950 border-rose-500/50 text-rose-300'
                                    : r.teamId === 2
                                    ? 'bg-sky-950 border-sky-500/50 text-sky-300'
                                    : r.teamId === 3
                                    ? 'bg-amber-950 border-amber-500/50 text-amber-300'
                                    : 'bg-purple-950 border-purple-500/50 text-purple-300'
                                }`}
                              >
                                ĐỘI {r.teamId}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5 mt-1 text-[11px] flex-wrap">
                            <span
                              style={{ color: newRank.color }}
                              className="font-bold inline-flex items-center gap-1"
                            >
                              <RankCrest tierId={newRank.id} size={14} />
                              <span>{newRank.name}</span>
                            </span>

                            {playMode === 'teacher_cup' && (
                              <span
                                className={`font-mono font-extrabold ${
                                  r.rpDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {r.rpDelta >= 0 ? `+${r.rpDelta}` : r.rpDelta} RP
                              </span>
                            )}

                            <span className="text-slate-300 font-mono inline-flex items-center gap-1">
                              <Timer className="w-3 h-3 text-cyan-400" />
                              {timeSec}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Coin Reward Badge */}
                      <div className="px-3 py-1.5 rounded-xl bg-[#060A15] border border-amber-500/45 text-[#FEF08A] font-mono font-black text-xs shrink-0 flex items-center gap-1.5 shadow-inner">
                        <Coins className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span>+{r.coinsEarned}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
        .podium-speed-line {
          position: absolute;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.7), rgba(56, 189, 248, 0.8), transparent);
          transform: rotate(-12deg);
          animation: podiumSpeedSweep 3.8s linear infinite;
        }
        @keyframes podiumSpeedSweep {
          0% {
            transform: translateX(-40%) rotate(-12deg);
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateX(260%) rotate(-12deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

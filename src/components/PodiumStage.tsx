import React, { useEffect, useRef, useState } from 'react';
import { drawModularCar } from '../game/carRenderer';
import {
  calculateCoinReward,
  calculateRPDelta,
  formatLeaderboardClipboard,
  getRankByRP,
} from '../game/rules';
import {
  BotDifficulty,
  CarLoadout,
  PlayModeCategory,
  RacerState,
  TournamentRewardConfig,
} from '../game/types';
import { soundEngine } from '../services/sound';
import { RankAvatarFrame, RankCrest } from './RankBadge';

export interface FinalRacerResult {
  id: string;
  username: string;
  isBot: boolean;
  placement: number;
  teamId?: number;
  loadout: CarLoadout;
  rpBefore: number;
  rpDelta: number;
  coinsEarned: number;
  finishTimeMs: number;
  teamWon: boolean;
}

interface PodiumStageProps {
  results: FinalRacerResult[];
  raceMode: 'solo' | 'team';
  teamCount: 2 | 3 | 4;
  winningTeamId: number | null;
  mapName: string;
  playMode?: PlayModeCategory;
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
    return {
      id: r.id,
      username: r.username,
      isBot: r.isBot,
      placement: r.placement,
      teamId: r.teamId,
      loadout: r.loadout,
      rpBefore: r.rp,
      rpDelta,
      coinsEarned,
      finishTimeMs: r.finishTimeMs,
      teamWon,
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
  onPlayAgainLobby,
  onBackToMainMenu,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  const top1 = results[0];
  const top2 = results[1];
  const top3 = results[2];

  useEffect(() => {
    soundEngine.playFanfare(true);
  }, []);

  // Animated Podium Canvas with Fireworks & Zoomed Custom Cars for Top 1, 2, 3
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fireworks: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      alpha: number;
    }[] = [];

    const spawnFireworkBurst = (bx: number, by: number) => {
      const colors = ['#F59E0B', '#4ADE80', '#38BDF8', '#FB7185', '#FEF08A'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const spd = 40 + Math.random() * 90;
        fireworks.push({
          x: bx,
          y: by,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          color,
          alpha: 1,
        });
      }
    };

    spawnFireworkBurst(200, 80);
    spawnFireworkBurst(520, 65);
    spawnFireworkBurst(360, 50);

    let lastTime = performance.now();
    let burstTimer = 0;
    let animId = 0;

    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const nowSec = now / 1000;

      burstTimer += dt;
      if (burstTimer > 0.9) {
        burstTimer = 0;
        spawnFireworkBurst(
          100 + Math.random() * (canvas.width - 200),
          45 + Math.random() * 80
        );
      }

      const w = canvas.width;
      const h = canvas.height;

      // Stage Background
      ctx.fillStyle = '#151C14';
      ctx.fillRect(0, 0, w, h);

      // Update & draw fireworks
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];
        fw.x += fw.vx * dt;
        fw.y += fw.vy * dt;
        fw.vy += 65 * dt;
        fw.alpha -= 0.75 * dt;
        if (fw.alpha <= 0) {
          fireworks.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, fw.alpha);
        ctx.fillStyle = fw.color;
        ctx.beginPath();
        ctx.arc(fw.x, fw.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw 3 Podium Pedestals (Left: Top 2, Center: Top 1, Right: Top 3)
      const pedestals = [
        {
          racer: top2,
          rankLabel: 'TOP 2',
          cx: w * 0.23,
          baseY: h - 20,
          boxH: 82,
          color: '#94A3B8',
          border: '#E2E8F0',
          scale: 1.75,
        },
        {
          racer: top1,
          rankLabel: '👑 TOP 1 VÔ ĐỊCH',
          cx: w * 0.5,
          baseY: h - 20,
          boxH: 112,
          color: '#CA8A04',
          border: '#FEF08A',
          scale: 2.15,
        },
        {
          racer: top3,
          rankLabel: 'TOP 3',
          cx: w * 0.77,
          baseY: h - 20,
          boxH: 66,
          color: '#B45309',
          border: '#FCD34D',
          scale: 1.65,
        },
      ];

      for (const ped of pedestals) {
        if (!ped.racer) continue;
        const topY = ped.baseY - ped.boxH;

        // Pedestal block
        ctx.save();
        ctx.fillStyle = ped.color;
        ctx.strokeStyle = ped.border;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(ped.cx - 88, topY, 176, ped.boxH, [10, 10, 0, 0]);
        ctx.fill();
        ctx.stroke();

        // Pedestal rank text
        ctx.fillStyle = '#0F172A';
        ctx.font = '900 15px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ped.rankLabel, ped.cx, topY + 24);

        // Player name + Rank Liên Quân badge
        const rankDef = getRankByRP(ped.racer.rpBefore + ped.racer.rpDelta);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(ped.racer.username, ped.cx, topY + 44);

        ctx.fillStyle = '#FEF08A';
        ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(
          `${rankDef.badgeIcon} ${rankDef.name} (+${ped.racer.coinsEarned} Xu)`,
          ped.cx,
          topY + 62
        );
        ctx.restore();

        // Draw Zoomed-In Customized Car above pedestal
        drawModularCar(ctx, ped.racer.loadout, {
          x: ped.cx,
          y: topY - 46,
          angle: -Math.PI * 0.5 + Math.sin(nowSec * 1.8 + ped.cx) * 0.25,
          scale: ped.scale,
          nowSec,
          nitroActive: ped.rankLabel.includes('TOP 1'),
        });
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
    <div className="fixed inset-0 z-50 bg-[#1E261D] overflow-y-auto p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0F172A] border-2 border-[#F59E0B]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                  playMode === 'teacher_cup'
                    ? 'bg-[#F59E0B] text-[#0F172A]'
                    : 'bg-[#334155] text-[#CBD5E1]'
                }`}
              >
                {playMode === 'teacher_cup'
                  ? '🏆 GIẢI ĐẤU CHÍNH THỨC GIÁO VIÊN (XẾP HẠNG RANK)'
                  : '⚡ CHẶNG ĐUA LUYỆN TẬP / BẠN BÈ (KHÔNG TÍNH ĐIỂM RANK)'}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              🏆 SÂN KHẤU VINH QUANG PODIUM TOP 3 — {mapName}
            </h1>
            <p className="text-xs text-[#E2E8F0]">
              {playMode === 'teacher_cup'
                ? 'Đã tự động cộng Xu giải đấu và Điểm Xếp Hạng (RP) vào tài khoản của từng tay đua!'
                : 'Đã cộng Xu hoàn thành chặng đua (Chỉ các giải đấu chính thức do Giáo Viên tổ chức mới tính điểm Rank RP).'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyStandings}
              className="px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0F172A] font-extrabold text-xs shadow-lg cursor-pointer"
            >
              {copied
                ? '✓ ĐÃ COPY BẢNG XẾP HẠNG VÀO CLIPBOARD!'
                : '📋 COPY BẢNG XẾP HẠNG'}
            </button>
            <button
              type="button"
              data-start="true"
              onClick={onPlayAgainLobby}
              className="px-4 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white border border-slate-600 font-bold text-xs cursor-pointer"
            >
              🔄 Về Phòng Chờ Đua Tiếp
            </button>
            <button
              type="button"
              onClick={onBackToMainMenu}
              className="px-4 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#38BDF8] border border-slate-600 font-bold text-xs cursor-pointer"
            >
              🏠 Về Sảnh Chính
            </button>
          </div>
        </div>

        {/* Team Racing Banner if in Team mode */}
        {raceMode === 'team' && winningTeamId !== null && (
          <div className="p-4 rounded-xl bg-[#0F172A] border-2 border-[#F59E0B] flex items-center justify-between">
            <div className="text-sm font-extrabold text-[#FEF08A]">
              🚩 CHIẾN THẮNG ĐỒNG ĐỘI: ĐỘI {winningTeamId} GIÀNH NGÔI VÔ ĐỊCH!
            </div>
            <div className="text-xs font-bold text-white">
              Toàn bộ thành viên Đội {winningTeamId} được thưởng thêm Xu chiến thắng đồng đội!
            </div>
          </div>
        )}

        {/* Top 3 Podium Canvas */}
        <div className="w-full rounded-2xl overflow-hidden border-2 border-[#7A9A75] bg-[#151C14] flex justify-center">
          <canvas
            ref={canvasRef}
            width={880}
            height={285}
            className="w-full max-w-[880px] h-[285px] block"
          />
        </div>

        {/* Full Standings Table */}
        <div className="p-5 rounded-2xl bg-[#0F172A]/95 border border-slate-700">
          <h2 className="text-base font-bold text-white mb-3">
            📊 Bảng Tổng Sắp Toàn Trận ({results.length} Tay Đua)
          </h2>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-xs text-[#94A3B8]">
                  <th className="py-2.5 px-3">Hạng</th>
                  <th className="py-2.5 px-3">Tay Đua & Khung Avatar Rank</th>
                  {raceMode === 'team' && <th className="py-2.5 px-3">Đội</th>}
                  <th className="py-2.5 px-3">Huy Hiệu Rank</th>
                  <th className="py-2.5 px-3">Biến Động RP</th>
                  <th className="py-2.5 px-3 text-right">Xu Nhận Được</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {results.map((r) => {
                  const totalRP = Math.max(0, r.rpBefore + r.rpDelta);
                  const newRank = getRankByRP(totalRP);
                  return (
                    <tr
                      key={r.id}
                      className={
                        r.placement <= 3
                          ? 'bg-[#1E293B]/80 font-bold'
                          : 'hover:bg-[#1E293B]/40'
                      }
                    >
                      <td className="py-2.5 px-3 font-mono-num text-[#F59E0B] font-extrabold">
                        #{r.placement}
                      </td>
                      <td className="py-2.5 px-3 text-white">
                        <div className="flex items-center gap-2.5">
                          <RankAvatarFrame
                            username={r.username}
                            rp={totalRP}
                            size="sm"
                          />
                          <div>
                            <div>
                              {r.username}{' '}
                              {r.isBot && (
                                <span className="text-[11px] text-[#94A3B8] font-normal">
                                  (AI Bot)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      {raceMode === 'team' && (
                        <td className="py-2.5 px-3 font-mono-num text-xs">
                          Đội {r.teamId}{' '}
                          {r.teamWon && (
                            <span className="text-[#FDE047] font-bold">
                              (Đội Thắng)
                            </span>
                          )}
                        </td>
                      )}
                      <td
                        className="py-2.5 px-3 text-xs font-bold"
                        style={{ color: newRank.color }}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <RankCrest tierId={newRank.id} size={26} />
                          <span>{newRank.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-xs">
                        {playMode !== 'teacher_cup' ? (
                          <span className="text-[#94A3B8]">
                            0 RP (Đua Thường)
                          </span>
                        ) : (
                          <span
                            className={
                              r.rpDelta >= 0 ? 'text-[#4ADE80]' : 'text-red-400'
                            }
                          >
                            {r.rpDelta >= 0 ? `+${r.rpDelta}` : r.rpDelta} RP
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-bold text-[#F59E0B]">
                        +{r.coinsEarned} Xu
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

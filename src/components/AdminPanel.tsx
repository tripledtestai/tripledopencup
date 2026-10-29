import {
  Award,
  Ban,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ClipboardList,
  Coins,
  Copy,
  Download,
  History,
  Key,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  Users,
  X,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import {
  ALL_PARTS,
  SLOT_LABELS,
  STARTER_OWNED_PARTS,
  TIER_COLORS,
} from '../game/constants';
import { getRankByRP } from '../game/rules';
import {
  GameSaveCheckpoint,
  Giftcode,
  LobbyConfig,
  StudentAccount,
  TournamentRewardConfig,
} from '../game/types';
import { dualDB } from '../services/database';
import { soundEngine } from '../services/sound';
import { RankAvatarFrame, RankCrest } from './RankBadge';
import { TeacherNavHeader, TeacherWorkspaceTab } from './TeacherNavHeader';

const DEFAULT_TOURNAMENT_REWARDS: TournamentRewardConfig = {
  top1Coins: 100,
  top2Coins: 70,
  top3Coins: 50,
  top10Coins: 30,
  finishCoins: 15,
  teamWinBonusCoins: 30,
};

interface AdminPanelProps {
  students: StudentAccount[];
  giftcodes: Giftcode[];
  teacherProfile: StudentAccount;
  lobby?: LobbyConfig;
  fbConnected: boolean;
  isNightMode?: boolean;
  onToggleNightMode?: () => void;
  onSelectTeacherTab: (tab: TeacherWorkspaceTab) => void;
  onOpenFirebaseModal: () => void;
  onOpenSettings?: () => void;
  onLogout: () => void;
}

type AdminSection = 'students' | 'giftcodes' | 'rewards' | 'checkpoints';
type StudentFilter = 'all' | 'active' | 'banned';
type StudentSort = 'rp_desc' | 'coins_desc' | 'matches_desc' | 'name_asc';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  students,
  giftcodes,
  teacherProfile,
  lobby,
  fbConnected,
  isNightMode = true,
  onToggleNightMode,
  onSelectTeacherTab,
  onOpenFirebaseModal,
  onOpenSettings = () => {},
  onLogout,
}) => {
  // Navigation Section within Admin
  const [activeSection, setActiveSection] = useState<AdminSection>('students');

  // Giftcode State
  const [newCode, setNewCode] = useState('');
  const [newCodeCoins, setNewCodeCoins] = useState(100);
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(50);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Status & Feedback Message
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Season Reset Confirmation
  const [confirmSeasonReset, setConfirmSeasonReset] = useState(false);

  // Student Search, Filter & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudentFilter>('all');
  const [sortBy, setSortBy] = useState<StudentSort>('rp_desc');

  // Student Delete Confirmation
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState<string | null>(
    null
  );

  // Student Skin Management Modal (Teacher Feature: View & Remove Student Skins)
  const [skinModalStudentEmail, setSkinModalStudentEmail] = useState<
    string | null
  >(null);
  const [confirmClearAllSkins, setConfirmClearAllSkins] = useState(false);

  // Checkpoints State
  const [checkpointLabel, setCheckpointLabel] = useState('');
  const [checkpoints, setCheckpoints] = useState<GameSaveCheckpoint[]>(() =>
    dualDB.getCheckpoints()
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentLobby = lobby || dualDB.getLobby();
  const teacherRewards: TournamentRewardConfig =
    currentLobby.teacherRewards || DEFAULT_TOURNAMENT_REWARDS;

  const refreshCheckpoints = () => {
    setCheckpoints(dualDB.getCheckpoints());
  };

  const showStatus = (
    text: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setStatusMessage({ text, type });
    window.setTimeout(() => {
      setStatusMessage((cur) => (cur?.text === text ? null : cur));
    }, 4500);
  };

  // --- GIFTCODE HANDLERS ---
  const handleCreateGiftcode = (e: React.FormEvent) => {
    e.preventDefault();
    const res = dualDB.createGiftcode(newCode, newCodeCoins, newCodeMaxUses);
    if (!res.ok) {
      soundEngine.playHazardHit();
      showStatus(res.error || 'Lỗi tạo Giftcode', 'error');
      return;
    }
    soundEngine.playCoin();
    showStatus(
      `Đã tạo Giftcode "${newCode.trim().toUpperCase()}" (+${newCodeCoins} Xu, tối đa ${newCodeMaxUses} lượt nhập)!`,
      'success'
    );
    setNewCode('');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    soundEngine.playCoin();
    setTimeout(() => setCopiedCode(null), 1800);
  };

  // --- TOURNAMENT REWARD HANDLERS ---
  const handleUpdateReward = (
    key: keyof TournamentRewardConfig,
    val: number
  ) => {
    const next: TournamentRewardConfig = {
      ...teacherRewards,
      [key]: Math.max(0, Math.min(10000, Math.floor(val))),
    };
    dualDB.updateLobby({ teacherRewards: next });
  };

  const handleApplyRewardPreset = (multiplier: number, label: string) => {
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
    showStatus(`Đã áp dụng mức thưởng giải đấu: ${label}!`, 'success');
  };

  // --- CSV EXPORT ---
  const handleExportCSV = () => {
    const headers = [
      'Ten Hoc Sinh',
      'Gmail',
      'Ma PIN 4 So',
      'Trang Thai',
      'Bac Rank',
      'Diem Tinh Anh (RP)',
      'Tong So Tran',
      'So Lan Top 1',
      'Ty Le Thang (%)',
      'So Du Xu TripleD',
    ];
    const rows = students.map((s) => {
      const rank = getRankByRP(s.rp);
      const winRate =
        s.totalMatches > 0
          ? ((s.top1Count / s.totalMatches) * 100).toFixed(1)
          : '0.0';
      return [
        `"${s.username.replace(/"/g, '""')}"`,
        `"${s.email}"`,
        `"${s.pin}"`,
        `"${s.banned ? 'DA BAN' : 'HOAT DONG'}"`,
        `"${rank.name}"`,
        s.rp,
        s.totalMatches,
        s.top1Count,
        `"${winRate}%"`,
        s.coins,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TripleD_Open_Cup_Students_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    soundEngine.playCoin();
    showStatus(
      'Đã xuất file CSV (Excel) danh sách toàn bộ học sinh thành công!',
      'success'
    );
  };

  // --- SEASON RESET ---
  const handleResetSeason = () => {
    dualDB.resetNewSeason();
    setConfirmSeasonReset(false);
    soundEngine.playFanfare(false);
    showStatus(
      'Đã Reset Mùa Giải Mới! Điểm Rank (RP) và số trận của học sinh đã về 0, giữ nguyên kho xe & Xu.',
      'success'
    );
  };

  // --- STUDENT ACTIONS ---
  const handleToggleBanStudent = (st: StudentAccount) => {
    const updated = dualDB.toggleBanStudent(st.email);
    if (!updated) return;
    soundEngine.playCoin();
    showStatus(
      updated.banned
        ? `🚫 Đã khóa (BAN) tài khoản "${st.username}" (${st.email}).`
        : `✅ Đã mở khóa (Unban) tài khoản "${st.username}".`,
      updated.banned ? 'error' : 'success'
    );
  };

  const handleDeleteStudent = (st: StudentAccount) => {
    const ok = dualDB.deleteStudent(st.email);
    setConfirmDeleteEmail(null);
    if (!ok) return;
    soundEngine.playHazardHit();
    showStatus(`🗑️ Đã xóa vĩnh viễn tài khoản "${st.username}".`, 'info');
  };

  // --- CHECKPOINTS ---
  const handleCreateCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    const cp = dualDB.createCheckpoint(checkpointLabel);
    setCheckpointLabel('');
    refreshCheckpoints();
    soundEngine.playFanfare(false);
    showStatus(
      `💾 Đã tạo điểm mốc: "${cp.label}" (${cp.studentCount} tài khoản học sinh)!`,
      'success'
    );
  };

  const handleRestoreCheckpoint = (cp: GameSaveCheckpoint) => {
    const res = dualDB.restoreCheckpoint(cp.id);
    refreshCheckpoints();
    if (res.ok) {
      soundEngine.playFanfare(false);
      showStatus(res.message, 'success');
    } else {
      showStatus(res.message, 'error');
    }
  };

  const handleDeleteCheckpoint = (cpId: string) => {
    dualDB.deleteCheckpoint(cpId);
    refreshCheckpoints();
    soundEngine.playCoin();
    showStatus('Đã xóa điểm mốc lưu game.', 'info');
  };

  const handleExportCheckpointJSON = (cpId?: string) => {
    const json = dualDB.exportCheckpointJSON(cpId);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TripleD_SaveCheckpoint_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    soundEngine.playCoin();
    showStatus('Đã tải file Bản Lưu (.json) về máy!', 'success');
  };

  const handleImportCheckpointFile = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const res = dualDB.importCheckpointJSON(text);
      refreshCheckpoints();
      if (res.ok) {
        soundEngine.playFanfare(false);
        showStatus(res.message, 'success');
      } else {
        showStatus(res.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- METRICS COMPUTATION ---
  const totalStudents = students.length;
  const bannedCount = students.filter((s) => s.banned).length;
  const activeCount = totalStudents - bannedCount;
  const totalCoinsInCirculation = students.reduce(
    (acc, s) => acc + (s.coins || 0),
    0
  );
  const totalClassRP = students.reduce((acc, s) => acc + (s.rp || 0), 0);
  const topRacer = [...students].sort((a, b) => (b.rp || 0) - (a.rp || 0))[0];

  // --- FILTER & SORT STUDENTS ---
  const filteredStudents = students
    .filter((s) => {
      if (statusFilter === 'active') return !s.banned;
      if (statusFilter === 'banned') return s.banned;
      return true;
    })
    .filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.username.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.pin && s.pin.includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'rp_desc') return (b.rp || 0) - (a.rp || 0);
      if (sortBy === 'coins_desc') return (b.coins || 0) - (a.coins || 0);
      if (sortBy === 'matches_desc')
        return (b.totalMatches || 0) - (a.totalMatches || 0);
      if (sortBy === 'name_asc') return a.username.localeCompare(b.username);
      return 0;
    });

  return (
    <div
      style={{ colorScheme: isNightMode ? 'dark' : 'light' }}
      className="relative min-h-screen bg-[#030712] text-white p-3 sm:p-5 select-none overflow-x-hidden"
    >
      {/* Subtle Dark Mode Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-40">
        <div className="absolute -top-40 left-1/4 w-[520px] h-[520px] rounded-full bg-cyan-500/12 blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[480px] h-[480px] rounded-full bg-amber-500/10 blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-4">
        {/* Unified 3-Section Teacher Navigation Bar */}
        <TeacherNavHeader
          activeTab="admin"
          teacherProfile={teacherProfile}
          fbConnected={fbConnected}
          isNightMode={isNightMode}
          onToggleNightMode={onToggleNightMode}
          onSelectTab={onSelectTeacherTab}
          onOpenFirebaseModal={onOpenFirebaseModal}
          onOpenSettings={onOpenSettings}
          onLogout={onLogout}
        />

        {/* Global Toast / Feedback Banner */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between shadow-xl transition-all animate-in fade-in ${
              statusMessage.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/60 text-rose-200'
                : statusMessage.type === 'info'
                ? 'bg-sky-950/90 border-sky-500/60 text-sky-200'
                : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'error' ? (
                <Ban className="w-4 h-4 text-rose-400 shrink-0" />
              ) : statusMessage.type === 'info' ? (
                <ClipboardList className="w-4 h-4 text-sky-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-xs px-2.5 py-0.5 rounded-lg bg-[#040814]/60 hover:bg-[#040814] border border-white/10 cursor-pointer ml-3 shrink-0"
            >
              Đóng
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* EXECUTIVE SUMMARY KPI CARDS (2x2 Grid - 2 Rows x 2 Columns)       */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: Total Students */}
          <div className="p-3.5 rounded-2xl bg-[#070D1B]/95 border border-slate-800/90 hover:border-cyan-500/40 flex items-center gap-3 shadow-lg transition-colors">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-cyan-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Học Sinh Toàn Giải
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono-num font-black text-xl text-white">
                  {totalStudents}
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold truncate">
                  {activeCount} active{' '}
                  {bannedCount > 0 ? `· ${bannedCount} khóa` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Total RP & Top Racer */}
          <div className="p-3.5 rounded-2xl bg-[#070D1B]/95 border border-slate-800/90 hover:border-amber-500/40 flex items-center gap-3 shadow-lg transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tổng Điểm RP Lớp
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono-num font-black text-xl text-amber-300">
                  {totalClassRP.toLocaleString()}
                </span>
                {topRacer && (
                  <span className="text-[11px] text-amber-200/90 truncate font-semibold">
                    Top 1: {topRacer.username}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Total Coins in Circulation */}
          <div className="p-3.5 rounded-2xl bg-[#070D1B]/95 border border-slate-800/90 hover:border-yellow-500/40 flex items-center gap-3 shadow-lg transition-colors">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-400/30 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tổng Xu Lưu Thông
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono-num font-black text-xl text-yellow-300">
                  {totalCoinsInCirculation.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-400">Xu TripleD</span>
              </div>
            </div>
          </div>

          {/* Card 4: Giftcodes Active */}
          <div className="p-3.5 rounded-2xl bg-[#070D1B]/95 border border-slate-800/90 hover:border-purple-500/40 flex items-center gap-3 shadow-lg transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5 text-purple-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Giftcode Đang Chạy
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono-num font-black text-xl text-purple-300">
                  {giftcodes.length}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold truncate">
                  Mã quà tặng thưởng
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* MAIN ADMIN WORKSPACE TABS (Dark-Mode Pill Switcher)               */}
        {/* ================================================================= */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/90 pb-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playCoin();
              setActiveSection('students');
            }}
            className={`px-4 py-2 rounded-xl font-sci font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
              activeSection === 'students'
                ? 'bg-cyan-500/20 border-cyan-400/80 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.18)]'
                : 'bg-[#070D1B]/90 text-slate-400 hover:text-white border-slate-800/90 hover:border-slate-700'
            }`}
          >
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Danh Sách Học Sinh ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playCoin();
              setActiveSection('giftcodes');
            }}
            className={`px-4 py-2 rounded-xl font-sci font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
              activeSection === 'giftcodes'
                ? 'bg-amber-500/20 border-amber-400/80 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.18)]'
                : 'bg-[#070D1B]/90 text-slate-400 hover:text-white border-slate-800/90 hover:border-slate-700'
            }`}
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span>Quản Lý Giftcode ({giftcodes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playCoin();
              setActiveSection('rewards');
            }}
            className={`px-4 py-2 rounded-xl font-sci font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
              activeSection === 'rewards'
                ? 'bg-emerald-500/20 border-emerald-400/80 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.18)]'
                : 'bg-[#070D1B]/90 text-slate-400 hover:text-white border-slate-800/90 hover:border-slate-700'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Cấu Hình Thưởng Giải Đấu</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playCoin();
              setActiveSection('checkpoints');
            }}
            className={`px-4 py-2 rounded-xl font-sci font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
              activeSection === 'checkpoints'
                ? 'bg-purple-500/20 border-purple-400/80 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.18)]'
                : 'bg-[#070D1B]/90 text-slate-400 hover:text-white border-slate-800/90 hover:border-slate-700'
            }`}
          >
            <BookmarkCheck className="w-4 h-4 text-purple-400" />
            <span>Sao Lưu & Mùa Giải</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* SECTION 1: QUẢN LÝ DANH SÁCH HỌC SINH                            */}
        {/* ================================================================= */}
        {activeSection === 'students' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* Action Bar: Search, Filters, Sorters & Export */}
            <div className="p-3.5 rounded-2xl bg-[#070D1B]/95 border border-slate-800/90 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              {/* Left: Search Box */}
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo Tên, Gmail hoặc Mã PIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#040814] border border-slate-700/80 focus:border-cyan-400 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Center: Status Filters (Dark-Tinted Pills) */}
              <div className="flex items-center gap-1.5 bg-[#040814] p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    statusFilter === 'all'
                      ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Tất Cả ({totalStudents})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    statusFilter === 'active'
                      ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Hoạt Động ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('banned')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    statusFilter === 'banned'
                      ? 'bg-rose-500/20 border-rose-400/60 text-rose-200'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Đã Khóa ({bannedCount})
                </button>
              </div>

              {/* Right: Sorter & Export CSV */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[#040814] px-2.5 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-bold">Xếp:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as StudentSort)}
                    className="bg-transparent text-xs font-bold text-cyan-300 focus:outline-none cursor-pointer"
                  >
                    <option value="rp_desc" className="bg-[#091326] text-white">
                      Điểm RP cao nhất
                    </option>
                    <option
                      value="coins_desc"
                      className="bg-[#091326] text-white"
                    >
                      Xu nhiều nhất
                    </option>
                    <option
                      value="matches_desc"
                      className="bg-[#091326] text-white"
                    >
                      Số trận nhiều nhất
                    </option>
                    <option
                      value="name_asc"
                      className="bg-[#091326] text-white"
                    >
                      Tên A → Z
                    </option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  title="Xuất danh sách ra file Excel (CSV)"
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 font-sci font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Xuất Excel</span>
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="rounded-2xl bg-[#070D1B]/95 border border-slate-800/90 overflow-hidden shadow-xl">
              <div className="overflow-x-auto max-h-[560px]">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead className="sticky top-0 z-10 bg-[#0B1528] border-b border-slate-800 text-[11px] font-sci uppercase tracking-wider text-slate-300">
                    <tr>
                      <th className="py-3 px-4">Học Sinh</th>
                      <th className="py-3 px-3">Gmail</th>
                      <th className="py-3 px-3">Mã PIN</th>
                      <th className="py-3 px-3">Bậc Rank RP</th>
                      <th className="py-3 px-3">Trận / Top 1</th>
                      <th className="py-3 px-3">Số Dư Xu</th>
                      <th className="py-3 px-4 text-right">
                        Điều Chỉnh & Quản Trị
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-12 text-slate-500 font-bold"
                        >
                          Không tìm thấy tài khoản học sinh nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st) => {
                        const rank = getRankByRP(st.rp);
                        const isConfirmingDelete =
                          confirmDeleteEmail === st.email;
                        const winRate =
                          st.totalMatches > 0
                            ? Math.round((st.top1Count / st.totalMatches) * 100)
                            : 0;

                        return (
                          <tr
                            key={st.id}
                            className={`transition-colors ${
                              st.banned
                                ? 'bg-rose-950/15 hover:bg-rose-950/25 opacity-80'
                                : 'hover:bg-[#0B1528]/70'
                            }`}
                          >
                            {/* Column 1: Identity */}
                            <td className="py-3 px-4 font-bold text-white">
                              <div className="flex items-center gap-3">
                                <RankAvatarFrame
                                  username={st.username}
                                  rp={st.rp}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`font-extrabold truncate ${
                                        st.banned
                                          ? 'line-through text-rose-300'
                                          : 'text-white'
                                      }`}
                                    >
                                      {st.username}
                                    </span>
                                    {st.banned && (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[9px] font-black uppercase tracking-wider">
                                        ĐÃ KHÓA
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Column 2: Email */}
                            <td className="py-3 px-3 font-mono-num text-xs text-slate-300">
                              {st.email}
                            </td>

                            {/* Column 3: PIN */}
                            <td className="py-3 px-3">
                              <span className="font-mono-num font-bold text-amber-300 bg-[#040814] px-2.5 py-1 rounded-lg border border-amber-500/30">
                                {st.pin}
                              </span>
                            </td>

                            {/* Column 4: Rank & RP */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <RankCrest tierId={rank.id} size={22} />
                                <div>
                                  <div
                                    style={{ color: rank.color }}
                                    className="font-bold text-xs tracking-wide"
                                  >
                                    {rank.name}
                                  </div>
                                  <div className="font-mono-num text-[11px] text-slate-400">
                                    {st.rp} RP
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Column 5: Matches & Win Rate */}
                            <td className="py-3 px-3 font-mono-num text-xs text-slate-300">
                              <div>
                                {st.totalMatches} Trận · {st.top1Count} Win
                              </div>
                              <div className="text-[10px] text-emerald-400 font-bold">
                                {winRate}% Thắng
                              </div>
                            </td>

                            {/* Column 6: Coins */}
                            <td className="py-3 px-3 font-mono-num font-bold text-amber-300">
                              <div className="flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5 text-amber-400" />
                                <span>{st.coins.toLocaleString()}</span>
                              </div>
                            </td>

                            {/* Column 7: Actions (Dark-Mode Optimized) */}
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5 justify-end flex-wrap">
                                {/* Coin Quick Adjust */}
                                <div className="inline-flex items-center bg-[#040814] rounded-lg border border-slate-800 p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      dualDB.adjustStudentStats(
                                        st.email,
                                        25,
                                        0
                                      );
                                      soundEngine.playCoin();
                                    }}
                                    title="Cộng +25 Xu"
                                    className="px-1.5 py-0.5 rounded text-[11px] font-mono-num font-bold text-amber-300 hover:bg-amber-500/20 cursor-pointer transition-colors"
                                  >
                                    +25 Xu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      dualDB.adjustStudentStats(
                                        st.email,
                                        -25,
                                        0
                                      )
                                    }
                                    title="Trừ -25 Xu"
                                    className="px-1.5 py-0.5 rounded text-[11px] font-mono-num font-bold text-rose-300 hover:bg-rose-500/20 cursor-pointer transition-colors"
                                  >
                                    -25
                                  </button>
                                </div>

                                {/* RP Quick Adjust */}
                                <div className="inline-flex items-center bg-[#040814] rounded-lg border border-slate-800 p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      dualDB.adjustStudentStats(
                                        st.email,
                                        0,
                                        25
                                      );
                                      soundEngine.playCoin();
                                    }}
                                    title="Cộng +25 RP"
                                    className="px-1.5 py-0.5 rounded text-[11px] font-mono-num font-bold text-emerald-300 hover:bg-emerald-500/20 cursor-pointer transition-colors"
                                  >
                                    +25 RP
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      dualDB.adjustStudentStats(
                                        st.email,
                                        0,
                                        -25
                                      )
                                    }
                                    title="Trừ -25 RP"
                                    className="px-1.5 py-0.5 rounded text-[11px] font-mono-num font-bold text-rose-300 hover:bg-rose-500/20 cursor-pointer transition-colors"
                                  >
                                    -25
                                  </button>
                                </div>

                                {/* Manage / Remove Student Skins */}
                                {(() => {
                                  const customSkinCount = (
                                    st.ownedParts || []
                                  ).filter(
                                    (pid) => !STARTER_OWNED_PARTS.includes(pid)
                                  ).length;
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playCoin();
                                        setConfirmClearAllSkins(false);
                                        setSkinModalStudentEmail(st.email);
                                      }}
                                      title="Xem & xóa skin/phụ kiện của học sinh này"
                                      className="px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors border bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/40 text-purple-200"
                                    >
                                      <Palette className="w-3 h-3 text-purple-300" />
                                      <span>Skin ({customSkinCount})</span>
                                    </button>
                                  );
                                })()}

                                {/* Ban / Unban Account */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleBanStudent(st)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors border ${
                                    st.banned
                                      ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                                      : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/35 text-amber-300'
                                  }`}
                                >
                                  {st.banned ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Mở Khóa</span>
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="w-3 h-3" />
                                      <span>Khóa</span>
                                    </>
                                  )}
                                </button>

                                {/* Delete Account with Confirmation */}
                                {!isConfirmingDelete ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmDeleteEmail(st.email)
                                    }
                                    title="Xóa vĩnh viễn tài khoản học sinh"
                                    className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-500/35 text-xs cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <div className="inline-flex items-center gap-1 bg-rose-950/90 border border-rose-500/60 px-2 py-0.5 rounded-lg shadow-lg">
                                    <span className="text-[11px] text-rose-200 font-bold">
                                      Xóa?
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteStudent(st)}
                                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black cursor-pointer"
                                    >
                                      Có
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirmDeleteEmail(null)
                                      }
                                      className="px-1.5 py-0.5 rounded bg-[#040814] text-slate-300 text-[11px] cursor-pointer"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SECTION 2: HỆ THỐNG GIFTCODE & VOUCHER                            */}
        {/* ================================================================= */}
        {activeSection === 'giftcodes' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-in fade-in duration-150">
            {/* Left Card: Create Giftcode Form (5 cols) */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-[#070D1B]/95 border border-slate-800/90 space-y-4 shadow-xl">
              <div>
                <h3 className="text-base font-sci font-bold text-amber-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Phát Hành Giftcode Mới</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tạo mã quà tặng Xu để thưởng cho học sinh đạt thành tích hoặc
                  làm bài tập xuất sắc.
                </p>
              </div>

              <form onSubmit={handleCreateGiftcode} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Mã Giftcode (Viết hoa, không dấu)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: LOP12A_XUAN2026"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#040814] border border-slate-700/80 text-sm font-mono-num font-bold text-amber-300 uppercase focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Số Xu Thưởng
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5000}
                      value={newCodeCoins}
                      onChange={(e) => setNewCodeCoins(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#040814] border border-slate-700/80 text-sm font-mono-num font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Lượt Nhập Tối Đa
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={newCodeMaxUses}
                      onChange={(e) =>
                        setNewCodeMaxUses(Number(e.target.value))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#040814] border border-slate-700/80 text-sm font-mono-num font-bold text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/70 text-amber-200 font-sci font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.18)] cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[3] text-amber-300" />
                  <span>Xác Nhận Phát Hành Giftcode</span>
                </button>
              </form>
            </div>

            {/* Right Card: Active Giftcode Inventory (7 cols) */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-[#070D1B]/95 border border-slate-800/90 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-sci font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>
                      Danh Sách Giftcode Đang Chạy ({giftcodes.length})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Học sinh có thể nhập tại mục Giftcode ở thanh trên cùng màn
                    hình chính.
                  </p>
                </div>
              </div>

              {giftcodes.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-bold border border-dashed border-slate-800 rounded-xl">
                  Chưa có mã Giftcode nào. Hãy tạo mã đầu tiên ở cột bên trái!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {giftcodes.map((g) => {
                    const usedCount = (g.usedBy || []).length;
                    const percent = Math.min(
                      100,
                      Math.round((usedCount / g.maxUses) * 100)
                    );
                    const isCopied = copiedCode === g.code;

                    return (
                      <div
                        key={g.code}
                        className="p-3.5 rounded-xl bg-[#040814] border border-slate-800 hover:border-amber-500/40 flex flex-col justify-between space-y-2.5 shadow-md transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono-num font-black text-sm text-amber-300 tracking-wider">
                            {g.code}
                          </span>
                          <span className="font-mono-num text-xs font-bold text-amber-200 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-400/30">
                            +{g.coins} Xu
                          </span>
                        </div>

                        {/* Usage Progress Bar */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                            <span>Lượt đã nhập:</span>
                            <span className="font-mono-num font-bold text-slate-200">
                              {usedCount} / {g.maxUses} ({percent}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              style={{ width: `${percent}%` }}
                              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(g.code)}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-[#0B1528] hover:bg-[#132240] border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Đã Copy!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Mã</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              dualDB.deleteGiftcode(g.code);
                              soundEngine.playCoin();
                              showStatus(
                                `Đã xóa mã giftcode ${g.code}.`,
                                'info'
                              );
                            }}
                            className="py-1.5 px-2.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 border border-rose-500/35 text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xóa</span>
                          </button>
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
        {/* SECTION 3: CẤU HÌNH THƯỞNG GIẢI ĐẤU & TRỌNG TÀI                  */}
        {/* ================================================================= */}
        {activeSection === 'rewards' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-in fade-in duration-150">
            <div className="lg:col-span-8 p-5 rounded-2xl bg-[#070D1B]/95 border border-slate-800/90 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-sci font-bold text-emerald-300 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Cấu Hình Phần Thưởng Xu Giải Đấu Lớp Học</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tùy chỉnh số Xu thưởng tự động trao cho học sinh khi kết thúc
                    chặng đua Giải Đấu Giáo Viên.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyRewardPreset(1, 'Mặc Định Chuẩn (x1)')
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-[#0B1528] hover:bg-[#132240] border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors"
                  >
                    Chuẩn (x1)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyRewardPreset(2, 'Sự Kiện X2 Thưởng')
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-xs font-bold text-amber-300 cursor-pointer transition-colors"
                  >
                    Thưởng x2
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyRewardPreset(3, 'Chung Kết Lớn (x3)')
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/50 text-xs font-bold text-emerald-300 cursor-pointer transition-colors"
                  >
                    Chung Kết (x3)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  {
                    key: 'top1Coins' as const,
                    label: 'Quán Quân (Top 1)',
                    accent: 'text-amber-300 border-amber-500/40',
                  },
                  {
                    key: 'top2Coins' as const,
                    label: 'Á Quân (Top 2)',
                    accent: 'text-cyan-300 border-cyan-500/40',
                  },
                  {
                    key: 'top3Coins' as const,
                    label: 'Hạng Ba (Top 3)',
                    accent: 'text-emerald-300 border-emerald-500/40',
                  },
                  {
                    key: 'top10Coins' as const,
                    label: 'Top 4 – Top 10',
                    accent: 'text-purple-300 border-purple-500/40',
                  },
                  {
                    key: 'finishCoins' as const,
                    label: 'Hoàn Thành Chặng',
                    accent: 'text-slate-200 border-slate-700',
                  },
                  {
                    key: 'teamWinBonusCoins' as const,
                    label: 'Thưởng Đội Thắng',
                    accent: 'text-yellow-300 border-yellow-500/40',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-3 rounded-xl bg-[#040814] border border-slate-800 space-y-1.5"
                  >
                    <label className="block text-[11px] font-bold text-slate-400">
                      {item.label}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={10000}
                        value={teacherRewards[item.key]}
                        onChange={(e) =>
                          handleUpdateReward(item.key, Number(e.target.value))
                        }
                        className={`w-full px-2.5 py-1.5 rounded-lg bg-[#070D1B] border font-mono-num text-sm font-black focus:outline-none ${item.accent}`}
                      />
                      <span className="text-xs font-bold text-slate-400 shrink-0">
                        Xu
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Card: Host Mode Role in Tournament */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-[#070D1B]/95 border border-slate-800/90 flex flex-col justify-between space-y-4 shadow-xl">
              <div className="space-y-2">
                <h3 className="text-base font-sci font-bold text-cyan-300 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-cyan-400" />
                  <span>Vai Trò Giáo Viên Trong Giải</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Chọn chế độ tham gia của Giáo Viên khi phát lệnh bắt đầu phòng
                  Giải Đấu Lớp Học:
                </p>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      dualDB.updateLobby({ hostMode: 'play' });
                      soundEngine.playCoin();
                    }}
                    className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      currentLobby.hostMode === 'play'
                        ? 'bg-cyan-500/15 border-cyan-400/70 text-white'
                        : 'bg-[#040814] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black text-cyan-300">
                      🏎️ Trực Tiếp Đua Cùng Học Sinh
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Xe của Giáo Viên sẽ xuất hiện trên vạch xuất phát cùng cả
                      lớp.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      dualDB.updateLobby({ hostMode: 'spectator' });
                      soundEngine.playCoin();
                    }}
                    className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      currentLobby.hostMode === 'spectator'
                        ? 'bg-amber-500/15 border-amber-400/70 text-white'
                        : 'bg-[#040814] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black text-amber-300">
                      🎥 Trọng Tài Quan Sát (Spectator)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Giáo Viên không lái xe mà điều khiển Camera theo dõi toàn
                      trận đua.
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SECTION 4: SAO LƯU CHECKPOINTS & RESET MÙA GIẢI                   */}
        {/* ================================================================= */}
        {activeSection === 'checkpoints' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-in fade-in duration-150">
            {/* Left Card: Save Checkpoints (7 cols) */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-[#070D1B]/95 border border-slate-800/90 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-sci font-bold text-purple-300 flex items-center gap-2">
                    <BookmarkCheck className="w-4 h-4 text-purple-400" />
                    <span>Điểm Mốc Lưu Game (Save Checkpoints)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tạo điểm mốc trạng thái cả lớp (tài khoản, Xu, RP, kho xe)
                    để khôi phục bất cứ lúc nào.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportCheckpointJSON()}
                    className="px-3 py-1.5 rounded-xl bg-[#0B1528] hover:bg-[#132240] border border-cyan-500/35 text-xs font-bold text-cyan-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-[#0B1528] hover:bg-[#132240] border border-purple-500/35 text-xs font-bold text-purple-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Nhập JSON</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportCheckpointFile}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Form Create Checkpoint */}
              <form onSubmit={handleCreateCheckpoint} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tên điểm mốc (VD: Trước giải đấu Lớp 12A1)..."
                  value={checkpointLabel}
                  onChange={(e) => setCheckpointLabel(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#040814] border border-slate-700/80 text-sm text-white focus:outline-none focus:border-purple-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/70 text-purple-200 font-sci font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-md"
                >
                  <Save className="w-4 h-4 text-purple-300" />
                  <span>+ Lưu Mốc</span>
                </button>
              </form>

              {/* Checkpoint Inventory */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {checkpoints.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 font-bold border border-dashed border-slate-800 rounded-xl">
                    Chưa có điểm mốc lưu game nào.
                  </div>
                ) : (
                  checkpoints.map((cp) => (
                    <div
                      key={cp.id}
                      className="p-3 rounded-xl bg-[#040814] border border-slate-800 hover:border-purple-500/40 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-purple-200 truncate">
                          {cp.label}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono-num mt-0.5 flex items-center gap-1.5">
                          <History className="w-3 h-3 text-purple-400" />
                          <span>
                            {new Date(cp.createdAt).toLocaleString('vi-VN')} ·{' '}
                            {cp.studentCount} Học Sinh
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestoreCheckpoint(cp)}
                          className="px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold cursor-pointer transition-colors"
                        >
                          Khôi Phục
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCheckpoint(cp.id)}
                          title="Xóa điểm mốc"
                          className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 border border-rose-500/35 text-rose-300 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Card: New Season Reset (5 cols) */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-[#070D1B]/95 border border-slate-800/90 flex flex-col justify-between space-y-4 shadow-xl">
              <div className="space-y-2.5">
                <h3 className="text-base font-sci font-bold text-rose-300 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-rose-400" />
                  <span>Khởi Tạo Mùa Giải Mới (New Season)</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Đưa điểm Rank RP và số trận của toàn bộ học sinh về vạch xuất
                  phát để bắt đầu chặng thi đua mới.
                </p>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quyền lợi được bảo toàn 100%:</span>
                  </div>
                  <div>• Toàn bộ số dư Xu của học sinh được giữ nguyên.</div>
                  <div>
                    • Tất cả xe, chi tiết độ và trang bị trong Gara không bị
                    mất.
                  </div>
                </div>
              </div>

              <div>
                {!confirmSeasonReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmSeasonReset(true)}
                    className="w-full py-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/50 text-rose-200 font-sci font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
                  >
                    <RefreshCw className="w-4 h-4 text-rose-400" />
                    <span>Reset Mùa Giải Mới</span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-400/70 space-y-2.5">
                    <div className="text-xs text-rose-100 font-bold">
                      ⚠️ Bạn có chắc chắn muốn đưa Rank RP toàn bộ học sinh về
                      0?
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetSeason}
                        className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                      >
                        Xác Nhận Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmSeasonReset(false)}
                        className="px-4 py-2 rounded-lg bg-[#040814] border border-slate-700 text-slate-300 text-xs cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* MODAL QUẢN LÝ & XÓA SKIN HỌC SINH (DÀNH CHO GIÁO VIÊN)           */}
      {/* ================================================================= */}
      {skinModalStudentEmail &&
        (() => {
          const targetStudent = students.find(
            (s) => s.email.toLowerCase() === skinModalStudentEmail.toLowerCase()
          );
          if (!targetStudent) return null;

          const ownedNonStarterIds = (targetStudent.ownedParts || []).filter(
            (id) => !STARTER_OWNED_PARTS.includes(id)
          );
          const ownedNonStarterParts = ownedNonStarterIds.map((pid) => {
            const found = ALL_PARTS.find((p) => p.id === pid);
            return (
              found || {
                id: pid,
                slot: 'chassis' as const,
                name: pid,
                tier: 'B' as const,
                price: 0,
                gachaOnly: false,
                description: 'Trang bị mở khóa',
                visualKey: pid,
              }
            );
          });

          const equippedSet = new Set(
            Object.values(targetStudent.loadout || {})
          );

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
              <div className="w-full max-w-2xl rounded-2xl bg-[#070D1B] border border-purple-500/40 shadow-[0_0_50px_rgba(168,85,247,0.25)] overflow-hidden flex flex-col max-h-[85vh]">
                {/* Modal Header */}
                <div className="px-5 py-4 bg-[#0B1528] border-b border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center shrink-0">
                      <Palette className="w-5 h-5 text-purple-300" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-sci font-black text-white uppercase tracking-wider truncate">
                        Quản Lý & Xóa Skin: {targetStudent.username}
                      </h3>
                      <p className="text-xs text-slate-400 truncate">
                        {targetStudent.email} · Đang sở hữu{' '}
                        <span className="text-purple-300 font-bold">
                          {ownedNonStarterParts.length}
                        </span>{' '}
                        skin/phụ kiện mở khóa
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSkinModalStudentEmail(null);
                      setConfirmClearAllSkins(false);
                    }}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body: List of Owned Non-Starter Skins */}
                <div className="p-5 overflow-y-auto space-y-3 flex-1">
                  {ownedNonStarterParts.length === 0 ? (
                    <div className="py-12 px-4 text-center rounded-xl border border-dashed border-slate-800 bg-[#040814]/60 space-y-2">
                      <Palette className="w-8 h-8 text-slate-600 mx-auto" />
                      <div className="text-sm font-bold text-slate-300">
                        Học sinh này chỉ đang có trang bị mặc định cơ bản.
                      </div>
                      <div className="text-xs text-slate-500">
                        Chưa có skin hoặc phụ kiện mở khóa nào để xóa.
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {ownedNonStarterParts.map((part) => {
                        const tierStyle =
                          TIER_COLORS[part.tier] || TIER_COLORS.D;
                        const slotMeta = SLOT_LABELS.find(
                          (sl) => sl.slot === part.slot
                        );
                        const isEquipped = equippedSet.has(part.id);

                        return (
                          <div
                            key={part.id}
                            className="p-3 rounded-xl bg-[#040814] border border-slate-800/90 hover:border-purple-500/40 flex items-center justify-between gap-2.5 transition-colors"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  style={{
                                    backgroundColor: tierStyle.bg,
                                    color: tierStyle.text,
                                    borderColor: tierStyle.border,
                                  }}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-sci font-black border uppercase"
                                >
                                  {part.tier}
                                </span>
                                <span className="text-xs font-extrabold text-white truncate">
                                  {part.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                <span>
                                  {slotMeta
                                    ? `${slotMeta.icon} ${slotMeta.label.replace(/^\d+\.\s*/, '')}`
                                    : part.slot}
                                </span>
                                {isEquipped && (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-black uppercase">
                                    Đang trang bị
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const res = dualDB.removeStudentSkin(
                                  targetStudent.email,
                                  part.id
                                );
                                if (res.ok) {
                                  soundEngine.playHazardHit();
                                  showStatus(res.message, 'info');
                                } else {
                                  showStatus(res.message, 'error');
                                }
                              }}
                              title={`Xóa skin "${part.name}" khỏi tài khoản học sinh`}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Modal Footer: Clear All Skins & Close */}
                <div className="px-5 py-3.5 bg-[#0B1528] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  {ownedNonStarterParts.length > 0 ? (
                    !confirmClearAllSkins ? (
                      <button
                        type="button"
                        onClick={() => setConfirmClearAllSkins(true)}
                        className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/50 font-sci font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>
                          Xóa Tất Cả Skin ({ownedNonStarterParts.length}) Về Mặc
                          Định
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-rose-950/90 border border-rose-500/60 px-3 py-1.5 rounded-xl">
                        <span className="text-xs font-bold text-rose-200">
                          Xác nhận xóa hết {ownedNonStarterParts.length} skin?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const res = dualDB.removeStudentSkin(
                              targetStudent.email,
                              'ALL'
                            );
                            setConfirmClearAllSkins(false);
                            if (res.ok) {
                              soundEngine.playHazardHit();
                              showStatus(res.message, 'info');
                            } else {
                              showStatus(res.message, 'error');
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer"
                        >
                          Đồng Ý Xóa Hết
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearAllSkins(false)}
                          className="px-2.5 py-1 rounded-lg bg-[#040814] text-slate-300 text-xs cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="text-xs text-slate-500">
                      Trang bị mặc định của hệ thống được giữ cố định.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSkinModalStudentEmail(null);
                      setConfirmClearAllSkins(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-sci font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors ml-auto"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};

import {
  Ban,
  BarChart3,
  BookmarkCheck,
  CheckCircle2,
  ClipboardList,
  Coins,
  Download,
  History,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { getRankByRP } from '../game/rules';
import { GameSaveCheckpoint, Giftcode, StudentAccount } from '../game/types';
import { dualDB } from '../services/database';
import { soundEngine } from '../services/sound';
import { RankAvatarFrame, RankCrest } from './RankBadge';
import { TeacherNavHeader, TeacherWorkspaceTab } from './TeacherNavHeader';

interface AdminPanelProps {
  students: StudentAccount[];
  giftcodes: Giftcode[];
  teacherProfile: StudentAccount;
  fbConnected: boolean;
  onSelectTeacherTab: (tab: TeacherWorkspaceTab) => void;
  onOpenFirebaseModal: () => void;
  onOpenSettings?: () => void;
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  students,
  giftcodes,
  teacherProfile,
  fbConnected,
  onSelectTeacherTab,
  onOpenFirebaseModal,
  onOpenSettings = () => {},
  onLogout,
}) => {
  const [newCode, setNewCode] = useState('');
  const [newCodeCoins, setNewCodeCoins] = useState(100);
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(50);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmSeasonReset, setConfirmSeasonReset] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState<string | null>(
    null
  );
  const [checkpointLabel, setCheckpointLabel] = useState('');
  const [checkpoints, setCheckpoints] = useState<GameSaveCheckpoint[]>(() =>
    dualDB.getCheckpoints()
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshCheckpoints = () => {
    setCheckpoints(dualDB.getCheckpoints());
  };

  const handleCreateGiftcode = (e: React.FormEvent) => {
    e.preventDefault();
    const res = dualDB.createGiftcode(newCode, newCodeCoins, newCodeMaxUses);
    if (!res.ok) {
      setStatusMessage(res.error || 'Lỗi tạo Giftcode');
      return;
    }
    soundEngine.playCoin();
    setStatusMessage(
      `Đã tạo Giftcode "${newCode.trim().toUpperCase()}" (+${newCodeCoins} Xu, tối đa ${newCodeMaxUses} lượt nhập)!`
    );
    setNewCode('');
  };

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
      'So Du Xu TripleD',
    ];
    const rows = students.map((s) => {
      const rank = getRankByRP(s.rp);
      return [
        `"${s.username.replace(/"/g, '""')}"`,
        `"${s.email}"`,
        `"${s.pin}"`,
        `"${s.banned ? 'DA BAN' : 'HOAT DONG'}"`,
        `"${rank.name}"`,
        s.rp,
        s.totalMatches,
        s.top1Count,
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
    setStatusMessage(
      'Đã xuất file CSV (Excel) danh sách toàn bộ học sinh thành công!'
    );
  };

  const handleResetSeason = () => {
    dualDB.resetNewSeason();
    setConfirmSeasonReset(false);
    soundEngine.playFanfare(false);
    setStatusMessage(
      'Đã Reset Mùa Giải Mới! Điểm Rank (RP) và thống kê trận đấu của toàn bộ học sinh đã về khởi điểm.'
    );
  };

  const handleToggleBanStudent = (st: StudentAccount) => {
    const updated = dualDB.toggleBanStudent(st.email);
    if (!updated) return;
    soundEngine.playCoin();
    setStatusMessage(
      updated.banned
        ? `🚫 Đã khóa (BAN) tài khoản học sinh "${st.username}" (${st.email}).`
        : `✅ Đã mở khóa (Unban) cho tài khoản học sinh "${st.username}" (${st.email}).`
    );
  };

  const handleDeleteStudent = (st: StudentAccount) => {
    const ok = dualDB.deleteStudent(st.email);
    setConfirmDeleteEmail(null);
    if (!ok) return;
    soundEngine.playHazardHit();
    setStatusMessage(
      `🗑️ Đã xóa vĩnh viễn tài khoản học sinh "${st.username}" (${st.email}).`
    );
  };

  const handleCreateCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    const cp = dualDB.createCheckpoint(checkpointLabel);
    setCheckpointLabel('');
    refreshCheckpoints();
    soundEngine.playFanfare(false);
    setStatusMessage(
      `💾 Đã tạo điểm mốc lưu game: "${cp.label}" (${cp.studentCount} tài khoản học sinh)!`
    );
  };

  const handleRestoreCheckpoint = (cp: GameSaveCheckpoint) => {
    const res = dualDB.restoreCheckpoint(cp.id);
    refreshCheckpoints();
    if (res.ok) {
      soundEngine.playFanfare(false);
    }
    setStatusMessage(res.message);
  };

  const handleDeleteCheckpoint = (cpId: string) => {
    dualDB.deleteCheckpoint(cpId);
    refreshCheckpoints();
    soundEngine.playCoin();
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
    setStatusMessage('Đã tải file Điểm Mốc Lưu Game (.json) về máy!');
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
      }
      setStatusMessage(res.message);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredStudents = students.filter(
    (s) =>
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#1E261D] text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Unified 3-Section Teacher Navigation Bar */}
        <TeacherNavHeader
          activeTab="admin"
          teacherProfile={teacherProfile}
          fbConnected={fbConnected}
          onSelectTab={onSelectTeacherTab}
          onOpenFirebaseModal={onOpenFirebaseModal}
          onOpenSettings={onOpenSettings}
          onLogout={onLogout}
        />

        {statusMessage && (
          <div className="p-4 rounded-xl bg-[#4A6046] border border-[#F59E0B] text-sm text-[#FEF08A] font-semibold flex items-center justify-between">
            <span>{statusMessage}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-xs underline ml-4 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Giftcode Generator + Season Controls Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Giftcode Creator (7 cols) */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-[#273325] border border-[#7A9A75] space-y-4">
            <h2 className="text-lg font-bold text-white">
              Công Cụ Tạo Mã Giftcode
            </h2>
            <form
              onSubmit={handleCreateGiftcode}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label className="block text-xs text-[#CBD5E1] mb-1">
                  Mã Giftcode
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: LOP12A"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg bg-[#1E261D] border border-[#7A9A75] text-sm text-white uppercase font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-[#CBD5E1] mb-1">
                  Số Xu Thưởng
                </label>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={newCodeCoins}
                  onChange={(e) => setNewCodeCoins(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#1E261D] border border-[#7A9A75] text-sm text-[#F59E0B] font-mono-num font-bold"
                />
              </div>
              <div>
                <label className="block text-xs text-[#CBD5E1] mb-1">
                  Lượt Nhập Tối Đa
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={newCodeMaxUses}
                  onChange={(e) => setNewCodeMaxUses(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#1E261D] border border-[#7A9A75] text-sm text-white font-mono-num"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#F59E0B] text-[#1E261D] hover:bg-[#FBBF24] font-extrabold text-sm cursor-pointer"
              >
                + Phát Hành Mã
              </button>
            </form>

            {/* Active Giftcodes List */}
            <div className="pt-2">
              <div className="text-xs font-semibold text-[#A7C4A0] mb-2">
                Danh sách Giftcode đang hoạt động:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-[140px] overflow-y-auto">
                {giftcodes.map((g) => (
                  <div
                    key={g.code}
                    className="p-2.5 rounded-lg bg-[#1E261D] border border-[#7A9A75]/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono-num font-bold text-[#F59E0B]">
                        {g.code}
                      </div>
                      <div className="text-[#CBD5E1] font-mono-num">
                        +{g.coins} Xu · Đã nhập: {(g.usedBy || []).length}/
                        {g.maxUses}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => dualDB.deleteGiftcode(g.code)}
                      aria-label={`Xóa mã ${g.code}`}
                      className="px-2 py-1 rounded bg-red-900/60 text-red-200 hover:bg-red-800 text-[11px] cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Export CSV & Season Reset (5 cols) */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-[#273325] border border-[#7A9A75] flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#38BDF8]" /> Quản Lý Dữ Liệu
                Lớp & Mùa Giải
              </h2>
              <p className="text-xs text-[#CBD5E1] mt-1">
                Xuất toàn bộ bảng điểm, Gmail, Mã PIN và số dư Xu ra file Excel
                (CSV) hoặc khởi tạo học kỳ mới.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full py-3 rounded-xl bg-[#4A6046] hover:bg-[#5A7455] border border-[#7A9A75] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Xuất File CSV (Excel) Toàn Bộ
                Học Sinh
              </button>

              {!confirmSeasonReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmSeasonReset(true)}
                  className="w-full py-3 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/70 text-red-200 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" /> Reset Mùa Giải Mới (New
                  Season)
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-red-950 border border-red-400 flex items-center justify-between gap-2">
                  <span className="text-xs text-red-100 font-semibold">
                    Xác nhận đưa Rank RP cả lớp về 0? (Giữ nguyên Xu & Kho xe)
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleResetSeason}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Xác Nhận
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmSeasonReset(false)}
                      className="px-3 py-1.5 rounded-lg bg-[#1E261D] text-white text-xs cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Game Save Checkpoints Section (Điểm Mốc Lưu Game) */}
        <div className="p-5 rounded-2xl bg-[#273325] border border-[#7A9A75] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-[#FACC15]" /> Điểm Mốc
                Lưu Game (Save Checkpoints)
              </h2>
              <p className="text-xs text-[#CBD5E1] mt-0.5">
                Tạo điểm mốc lưu trạng thái toàn bộ tài khoản học sinh, kho xe,
                Xu, RP và Giftcode để khôi phục bất kỳ lúc nào.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportCheckpointJSON()}
                className="px-3.5 py-2 rounded-xl bg-[#1E261D] hover:bg-[#334231] border border-[#7A9A75] text-xs font-bold text-[#FEF08A] flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Bản Lưu (.json)</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-[#1E261D] hover:bg-[#334231] border border-[#7A9A75] text-xs font-bold text-[#38BDF8] flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Nhập Bản Lưu (.json)</span>
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

          <form
            onSubmit={handleCreateCheckpoint}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              placeholder="Đặt tên điểm mốc lưu (VD: Trước vòng Chung kết Lớp 12A1)..."
              value={checkpointLabel}
              onChange={(e) => setCheckpointLabel(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl bg-[#1E261D] border border-[#7A9A75] text-sm text-white"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#FBBF24] text-[#1E261D] font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>+ Tạo Điểm Mốc Lưu Game</span>
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[210px] overflow-y-auto pr-1">
            {checkpoints.map((cp) => (
              <div
                key={cp.id}
                className="p-3 rounded-xl bg-[#1E261D] border border-[#7A9A75]/60 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-[#FEF08A] truncate">
                    {cp.label}
                  </div>
                  <div className="text-[11px] text-[#CBD5E1] font-mono-num mt-0.5 flex items-center gap-1.5">
                    <History className="w-3 h-3 text-[#A7C4A0]" />
                    <span>
                      {new Date(cp.createdAt).toLocaleString('vi-VN')} ·{' '}
                      {cp.studentCount} HS
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestoreCheckpoint(cp)}
                    className="px-2.5 py-1 rounded-lg bg-[#4A6046] hover:bg-[#5E7A59] text-white text-xs font-bold cursor-pointer"
                  >
                    Khôi Phục
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCheckpoint(cp.id)}
                    title="Xóa điểm mốc"
                    className="p-1.5 rounded-lg bg-red-950/70 hover:bg-red-800 text-red-200 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full Student Management Table */}
        <div className="p-5 rounded-2xl bg-[#273325] border border-[#7A9A75] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#A7C4A0]" /> Danh Sách Học
              Sinh Toàn Giải ({students.length} Tài Khoản)
            </h2>
            <input
              type="search"
              placeholder="Tìm tên học sinh hoặc Gmail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 rounded-lg bg-[#1E261D] border border-[#7A9A75] text-sm text-white w-full sm:w-72"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#7A9A75] text-xs text-[#A7C4A0]">
                  <th className="py-3 px-3">Tên Học Sinh</th>
                  <th className="py-3 px-3">Gmail Đăng Ký</th>
                  <th className="py-3 px-3">Mã PIN (Nhắc HS)</th>
                  <th className="py-3 px-3">Bậc Rank Liên Quân</th>
                  <th className="py-3 px-3">Số Trận / Top 1</th>
                  <th className="py-3 px-3">Số Dư Xu</th>
                  <th className="py-3 px-3 text-right">
                    Cộng / Trừ & Quản Trị Tài Khoản
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7A9A75]/30">
                {filteredStudents.map((st) => {
                  const rank = getRankByRP(st.rp);
                  const isConfirmingDelete = confirmDeleteEmail === st.email;
                  return (
                    <tr
                      key={st.id}
                      className={`transition-colors ${
                        st.banned
                          ? 'bg-red-950/35 hover:bg-red-950/50 opacity-80'
                          : 'hover:bg-[#1E261D]/60'
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-white">
                        <div className="flex items-center gap-2.5">
                          <RankAvatarFrame
                            username={st.username}
                            rp={st.rp}
                            size="sm"
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={
                                st.banned ? 'line-through text-red-300' : ''
                              }
                            >
                              {st.username}
                            </span>
                            {st.banned && (
                              <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                                ĐÃ BAN
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono-num text-xs text-[#CBD5E1]">
                        {st.email}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono-num font-bold text-[#FDE047] bg-[#1E261D] px-2.5 py-1 rounded border border-[#7A9A75]/50">
                          {st.pin}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          style={{ color: rank.color }}
                          className="font-bold text-xs inline-flex items-center gap-1.5"
                        >
                          <RankCrest tierId={rank.id} size={24} />
                          <span>
                            {rank.name} ({st.rp} RP)
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono-num text-xs text-[#CBD5E1]">
                        {st.totalMatches} trận · {st.top1Count} Top 1
                      </td>
                      <td className="py-3 px-3 font-mono-num font-bold text-[#F59E0B]">
                        <Coins className="w-3.5 h-3.5 inline mr-1" />
                        {st.coins.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              dualDB.adjustStudentStats(st.email, 25, 0);
                              soundEngine.playCoin();
                            }}
                            className="px-2.5 py-1 rounded bg-[#4A6046] hover:bg-[#5E7A59] text-[#FEF08A] text-xs font-mono-num font-bold cursor-pointer"
                          >
                            +25 Xu
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              dualDB.adjustStudentStats(st.email, -25, 0)
                            }
                            className="px-2.5 py-1 rounded bg-[#1E261D] hover:bg-red-950 text-red-300 border border-[#7A9A75]/40 text-xs font-mono-num cursor-pointer"
                          >
                            -25 Xu
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              dualDB.adjustStudentStats(st.email, 0, 25);
                              soundEngine.playCoin();
                            }}
                            className="px-2.5 py-1 rounded bg-[#4A6046] hover:bg-[#5E7A59] text-[#4ADE80] text-xs font-mono-num font-bold cursor-pointer"
                          >
                            +25 RP
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              dualDB.adjustStudentStats(st.email, 0, -25)
                            }
                            className="px-2.5 py-1 rounded bg-[#1E261D] hover:bg-red-950 text-red-300 border border-[#7A9A75]/40 text-xs font-mono-num cursor-pointer"
                          >
                            -25 RP
                          </button>

                          {/* Ban / Unban Account Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleBanStudent(st)}
                            className={`px-2.5 py-1 rounded text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                              st.banned
                                ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                                : 'bg-amber-700/80 hover:bg-amber-600 text-amber-100'
                            }`}
                          >
                            {st.banned ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mở Ban</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5" />
                                <span>Ban</span>
                              </>
                            )}
                          </button>

                          {/* Delete Account Button with Inline Confirmation */}
                          {!isConfirmingDelete ? (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteEmail(st.email)}
                              className="px-2.5 py-1 rounded bg-red-900/80 hover:bg-red-700 text-red-100 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa</span>
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1 bg-red-950 border border-red-400 px-2 py-0.5 rounded">
                              <span className="text-[11px] text-red-200 font-bold">
                                Xóa?
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteStudent(st)}
                                className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Có
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteEmail(null)}
                                className="px-1.5 py-0.5 rounded bg-[#1E261D] text-slate-200 text-[11px] cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          )}
                        </div>
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


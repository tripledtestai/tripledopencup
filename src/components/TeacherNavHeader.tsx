import React, { useState } from 'react';
import {
  Settings,
  Volume2,
  VolumeX,
  LogOut,
  Coins,
  Car,
  Flame,
  CheckCircle2,
  Sun,
  Moon,
  Trophy,
  Users,
} from 'lucide-react';
import { StudentAccount } from '../game/types';
import { dualDB } from '../services/database';
import { multiplayerService } from '../services/multiplayer';
import { soundEngine } from '../services/sound';
import { RankAvatarFrame } from './RankBadge';

export type TeacherWorkspaceTab = 'admin' | 'lobby' | 'menu';

interface TeacherNavHeaderProps {
  activeTab: TeacherWorkspaceTab;
  teacherProfile: StudentAccount;
  fbConnected: boolean;
  onSelectTab: (tab: TeacherWorkspaceTab) => void;
  onOpenFirebaseModal: () => void;
  onOpenSettings?: () => void;
  onLogout: () => void;
}

export const TeacherNavHeader: React.FC<TeacherNavHeaderProps> = ({
  activeTab,
  teacherProfile,
  fbConnected,
  onSelectTab,
  onOpenFirebaseModal,
  onOpenSettings = () => {},
  onLogout,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(teacherProfile.username);
  const [isNightTheme, setIsNightTheme] = useState(
    () => !document.documentElement.classList.contains('theme-light')
  );

  const handleToggleTheme = () => {
    const nextNight = !document.documentElement.classList.contains('theme-light')
      ? false
      : true;
    document.documentElement.classList.toggle('theme-light', !nextNight);
    try {
      localStorage.setItem('tripled_theme_night_v1', nextNight ? '1' : '0');
    } catch {}
    setIsNightTheme(nextNight);
    soundEngine.playCoin();
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameDraft.trim();
    if (trimmed) {
      dualDB.updateTeacherProfile({ username: trimmed });
      soundEngine.playCoin();
    }
    setEditingName(false);
  };

  return (
    <div className="w-full rounded-2xl bg-gradient-to-r from-[#071126] via-[#0E2042] to-[#071126] border-2 border-amber-400/60 p-3.5 shadow-2xl space-y-3 select-none">
      {/* Top Row: Teacher Identity + Custom Display Name + Self-Add Coins + Firebase/Logout */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Teacher Profile & Customizable Display Name */}
        <div className="flex items-center gap-3 flex-wrap">
          <RankAvatarFrame
            username={teacherProfile.username}
            rp={teacherProfile.rp}
            size="md"
            isTeacher={true}
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-950 shadow-sm">
                TRỌNG TÀI GIÁO VIÊN
              </span>
              {!editingName ? (
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white">
                    {teacherProfile.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(teacherProfile.username);
                      setEditingName(true);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-[#0F1D3D] hover:bg-[#1A2E5A] border border-cyan-500/40 text-[11px] font-bold text-cyan-300 cursor-pointer transition-colors"
                  >
                    Đổi Tên
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Nhập tên hiển thị GV..."
                    className="px-2.5 py-1 rounded-lg bg-[#060D1E] border border-amber-400 text-xs font-bold text-white w-44 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0F172A] text-xs font-black cursor-pointer"
                  >
                    Lưu Tên
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="px-2 py-1 rounded-lg bg-[#0F1D3D] text-xs text-slate-300 cursor-pointer"
                  >
                    Hủy
                  </button>
                </form>
              )}
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">
              Phân khu điều hành: Quản Trị Lớp Học · Tạo Phòng Giải Đấu (Pristine Không Bot) · Showroom Xe & Shop GV
            </div>
          </div>
        </div>

        {/* Right: Teacher Self-Coin Balance + Quick Add Coins + Firebase + Logout */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#081226] border border-amber-400/50 rounded-xl px-3 py-1.5 shadow-inner">
            <span className="font-mono-num text-xs font-black text-amber-400 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{teacherProfile.coins.toLocaleString()}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                dualDB.addTeacherCoins(500);
                soundEngine.playCoin();
              }}
              title="Tự cộng +500 cho Giáo Viên"
              className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0F172A] font-mono-num font-black text-[11px] cursor-pointer"
            >
              +500
            </button>
            <button
              type="button"
              onClick={() => {
                dualDB.addTeacherCoins(2000);
                soundEngine.playCoin();
              }}
              title="Tự cộng +2,000 cho Giáo Viên"
              className="px-2 py-0.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0F172A] font-mono-num font-black text-[11px] cursor-pointer"
            >
              +2,000
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenFirebaseModal}
            className="px-3 py-2 rounded-xl bg-[#09152E] hover:bg-[#102247] text-amber-300 border border-amber-400/40 text-xs font-bold cursor-pointer transition-colors"
          >
            {fbConnected ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Firebase Online
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> Cấu Hình Firebase
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={isNightTheme ? 'Chuyển sang Chế Độ Sáng' : 'Chuyển sang Chế Độ Tối'}
            title={isNightTheme ? 'Chế Độ Tối — Đổi sang Chế Độ Sáng' : 'Chế Độ Sáng — Đổi sang Chế Độ Tối'}
            className="w-10 h-10 p-0 rounded-xl bg-[#09152E] hover:bg-[#102247] text-amber-400 border border-slate-700 flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            {isNightTheme ? (
              <Moon className="w-5 h-5 stroke-[2.2]" />
            ) : (
              <Sun className="w-5 h-5 stroke-[2.2]" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            title="Cài đặt phím & âm thanh"
            className="w-10 h-10 p-0 rounded-xl bg-[#09152E] hover:bg-[#102247] text-slate-300 hover:text-amber-300 border border-slate-700 flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <Settings className="w-5 h-5 stroke-[2.25]" />
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-2 rounded-xl bg-[#09152E] hover:bg-rose-950/80 text-rose-200 border border-rose-500/40 text-xs font-bold cursor-pointer transition-colors"
          >
            Đăng Xuất
          </button>
        </div>
      </div>

      {/* Bottom Row: 3 Separated Teacher Workspace Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-slate-700/60">
        <button
          type="button"
          onClick={() => {
            soundEngine.playCoin();
            onSelectTab('admin');
          }}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
            activeTab === 'admin'
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-[1.01]'
              : 'bg-[#060D1E]/80 text-white border-slate-700/80 hover:border-amber-400/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Users className={`w-5 h-5 ${activeTab === 'admin' ? 'text-slate-950' : 'text-cyan-400'}`} />
            <div>
              <div className="text-xs sm:text-sm font-black uppercase">
                1. Quản Trị Lớp Học
              </div>
              <div
                className={`text-[11px] font-semibold ${
                  activeTab === 'admin' ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                Học Sinh, PIN, Giftcode, Sao Lưu & Xuất CSV
              </div>
            </div>
          </div>
          {activeTab === 'admin' && (
            <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-300 text-[10px] font-black shrink-0">
              ĐANG MỞ
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playCoin();
            const freshPin = dualDB.generateNewRoomPin();
            multiplayerService.disconnect();
            dualDB.updateLobby({
              playModeCategory: 'teacher_cup',
              roomPin: freshPin,
              participants: [],
              botCount: 0,
              isFriendGuest: false,
              status: 'waiting',
            });
            onSelectTab('lobby');
          }}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
            activeTab === 'lobby'
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-[1.01]'
              : 'bg-[#060D1E]/80 text-white border-slate-700/80 hover:border-amber-400/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Trophy className={`w-5 h-5 ${activeTab === 'lobby' ? 'text-slate-950' : 'text-amber-400'}`} />
            <div>
              <div className="text-xs sm:text-sm font-black uppercase">
                2. Tạo Phòng & Giải Đấu
              </div>
              <div
                className={`text-[11px] font-semibold ${
                  activeTab === 'lobby' ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                Mở phòng mới (Phòng sạch 100% không người cũ)
              </div>
            </div>
          </div>
          {activeTab === 'lobby' && (
            <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-300 text-[10px] font-black shrink-0">
              ĐANG MỞ
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playCoin();
            onSelectTab('menu');
          }}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
            activeTab === 'menu'
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-[1.01]'
              : 'bg-[#060D1E]/80 text-white border-slate-700/80 hover:border-amber-400/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Car className={`w-5 h-5 ${activeTab === 'menu' ? 'text-slate-950' : 'text-amber-400'}`} />
            <div>
              <div className="text-xs sm:text-sm font-black uppercase">
                3. Menu Xe & Shop GV
              </div>
              <div
                className={`text-[11px] font-semibold ${
                  activeTab === 'menu' ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                Chọn xe, Nâng cấp, Quay Gacha & Tự Cộng Xu
              </div>
            </div>
          </div>
          {activeTab === 'menu' && (
            <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-300 text-[10px] font-black shrink-0">
              ĐANG MỞ
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

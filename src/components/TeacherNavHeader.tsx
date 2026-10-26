import React, { useEffect, useState } from 'react';
import {
  Settings,
  LogOut,
  Coins,
  Car,
  Flame,
  CheckCircle2,
  Sun,
  Moon,
  Trophy,
  Users,
  ShieldCheck,
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
  isNightMode?: boolean;
  onToggleNightMode?: () => void;
  onSelectTab: (tab: TeacherWorkspaceTab) => void;
  onOpenFirebaseModal: () => void;
  onOpenSettings?: () => void;
  onLogout: () => void;
}

export const TeacherNavHeader: React.FC<TeacherNavHeaderProps> = ({
  activeTab,
  teacherProfile,
  fbConnected,
  isNightMode: propNightMode,
  onToggleNightMode,
  onSelectTab,
  onOpenFirebaseModal,
  onOpenSettings = () => {},
  onLogout,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(teacherProfile.username);
  const [localNightTheme, setLocalNightTheme] = useState(
    () => !document.documentElement.classList.contains('theme-light')
  );

  const isNightTheme =
    propNightMode !== undefined ? propNightMode : localNightTheme;

  useEffect(() => {
    if (propNightMode !== undefined) {
      setLocalNightTheme(propNightMode);
    }
  }, [propNightMode]);

  const handleToggleTheme = () => {
    if (onToggleNightMode) {
      onToggleNightMode();
      soundEngine.playCoin();
      return;
    }
    const nextNight = document.documentElement.classList.contains('theme-light');
    document.documentElement.classList.toggle('theme-light', !nextNight);
    try {
      localStorage.setItem('tripled_theme_night_v1', nextNight ? '1' : '0');
      window.dispatchEvent(
        new CustomEvent('tripled-theme-change', { detail: { isNight: nextNight } })
      );
    } catch {}
    setLocalNightTheme(nextNight);
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

  const tabs: {
    id: TeacherWorkspaceTab;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    accentText: string;
    activeBorder: string;
    activeBg: string;
    activeBadge: string;
    onClick: () => void;
  }[] = [
    {
      id: 'admin',
      title: '1. Quản Trị Lớp Học',
      subtitle: 'Học Sinh, PIN, Giftcode, Sao Lưu & CSV',
      icon: <Users className="w-4 h-4 shrink-0" />,
      accentText: 'text-cyan-300',
      activeBorder: 'border-cyan-400/80 shadow-[0_0_22px_rgba(34,211,238,0.18)]',
      activeBg:
        'bg-gradient-to-r from-cyan-500/20 via-sky-500/10 to-[#0B1528]',
      activeBadge:
        'bg-cyan-500/20 border border-cyan-400/50 text-cyan-200',
      onClick: () => {
        soundEngine.playCoin();
        onSelectTab('admin');
      },
    },
    {
      id: 'lobby',
      title: '2. Tạo Phòng & Giải Đấu',
      subtitle: 'Mở phòng sạch 100% · Đua Giải Đấu Lớp',
      icon: <Trophy className="w-4 h-4 shrink-0" />,
      accentText: 'text-amber-300',
      activeBorder: 'border-amber-400/80 shadow-[0_0_22px_rgba(245,158,11,0.18)]',
      activeBg:
        'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-[#0B1528]',
      activeBadge:
        'bg-amber-500/20 border border-amber-400/50 text-amber-200',
      onClick: () => {
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
      },
    },
    {
      id: 'menu',
      title: '3. Menu Xe & Shop GV',
      subtitle: 'Showroom 3D, Độ Máy, Gacha & Thử Xe',
      icon: <Car className="w-4 h-4 shrink-0" />,
      accentText: 'text-purple-300',
      activeBorder:
        'border-purple-400/80 shadow-[0_0_22px_rgba(168,85,247,0.18)]',
      activeBg:
        'bg-gradient-to-r from-purple-500/20 via-indigo-500/10 to-[#0B1528]',
      activeBadge:
        'bg-purple-500/20 border border-purple-400/50 text-purple-200',
      onClick: () => {
        soundEngine.playCoin();
        onSelectTab('menu');
      },
    },
  ];

  return (
    <div className="relative w-full rounded-2xl bg-[#070D1B]/95 backdrop-blur-xl border border-slate-800/90 p-3 sm:p-3.5 shadow-[0_14px_36px_rgba(0,0,0,0.65)] space-y-2.5 select-none overflow-hidden">
      {/* Subtle Top Neon Accent Line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-500/60 via-amber-400/80 to-purple-500/60 opacity-90" />

      {/* Top Row: Teacher Identity + Custom Display Name + Self-Add Coins + Firebase/Theme/Settings/Logout */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Teacher Profile & Customizable Display Name */}
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <RankAvatarFrame
            username={teacherProfile.username}
            rp={teacherProfile.rp}
            size="sm"
            isTeacher={true}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/40 text-amber-300">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>QUẢN TRỊ GIÁO VIÊN</span>
              </span>
              {!editingName ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-black text-white truncate">
                    {teacherProfile.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(teacherProfile.username);
                      setEditingName(true);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-[#0D1830] hover:bg-[#152648] border border-cyan-500/35 text-[11px] font-bold text-cyan-300 cursor-pointer transition-colors"
                  >
                    Đổi Tên
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSaveName}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Nhập tên hiển thị GV..."
                    className="px-2.5 py-1 rounded-lg bg-[#040814] border border-amber-400/60 text-xs font-bold text-white w-40 sm:w-48 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-xs font-black cursor-pointer transition-colors"
                  >
                    Lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="px-2 py-1 rounded-lg bg-[#0D1830] border border-slate-700 text-xs text-slate-300 cursor-pointer"
                  >
                    Hủy
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Right: Teacher Self-Coin Balance + Quick Add Coins + Firebase + Theme + Settings + Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#040814]/90 border border-slate-800 rounded-xl px-2.5 py-1">
            <span className="font-mono-num text-xs font-black text-amber-300 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{teacherProfile.coins.toLocaleString()}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                dualDB.addTeacherCoins(500);
                soundEngine.playCoin();
              }}
              title="Tự cộng +500 Xu cho Giáo Viên"
              className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-mono-num font-bold text-[10.5px] cursor-pointer transition-colors"
            >
              +500
            </button>
            <button
              type="button"
              onClick={() => {
                dualDB.addTeacherCoins(2000);
                soundEngine.playCoin();
              }}
              title="Tự cộng +2,000 Xu cho Giáo Viên"
              className="px-1.5 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-mono-num font-bold text-[10.5px] cursor-pointer transition-colors"
            >
              +2K
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenFirebaseModal}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
              fbConnected
                ? 'bg-emerald-950/50 hover:bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : 'bg-[#0B1528] hover:bg-[#132240] text-amber-300 border-slate-700/80'
            }`}
          >
            {fbConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Firebase Online</span>
              </>
            ) : (
              <>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Firebase</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={
              isNightTheme ? 'Chuyển sang Chế Độ Sáng' : 'Chuyển sang Chế Độ Tối'
            }
            title={
              isNightTheme
                ? 'Đang ở Chế Độ Tối (Dark Mode) — Bấm để đổi sang Sáng'
                : 'Đang ở Chế Độ Sáng (Light Mode) — Bấm để đổi sang Tối'
            }
            className="w-8 h-8 sm:w-9 sm:h-9 p-0 rounded-xl bg-[#0B1528] hover:bg-[#132240] text-amber-300 border border-slate-700/80 flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            {isNightTheme ? (
              <Moon className="w-4 h-4 stroke-[2.2]" />
            ) : (
              <Sun className="w-4 h-4 stroke-[2.2]" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            title="Cài đặt phím, âm thanh & điểm mốc lưu"
            className="w-8 h-8 sm:w-9 sm:h-9 p-0 rounded-xl bg-[#0B1528] hover:bg-[#132240] text-slate-300 hover:text-cyan-300 border border-slate-700/80 flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <Settings className="w-4 h-4 stroke-[2.2]" />
          </button>

          <button
            type="button"
            onClick={onLogout}
            title="Đăng xuất khỏi quyền Giáo Viên"
            className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 text-rose-300 border border-rose-500/35 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thoát</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: 3 Separated Teacher Workspace Tabs (Dark-Mode Optimized) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                isActive
                  ? `${tab.activeBg} ${tab.activeBorder} text-white`
                  : 'bg-[#040814]/80 hover:bg-[#0B1528]/80 text-slate-300 border-slate-800/90 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    isActive
                      ? `${tab.activeBadge}`
                      : 'bg-[#0B1528] border-slate-800 text-slate-400'
                  }`}
                >
                  <span className={isActive ? tab.accentText : 'text-slate-400'}>
                    {tab.icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-xs font-black uppercase tracking-wide truncate ${
                      isActive ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {tab.title}
                  </div>
                  <div
                    className={`text-[10.5px] truncate ${
                      isActive ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {tab.subtitle}
                  </div>
                </div>
              </div>
              {isActive && (
                <span
                  className={`px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider shrink-0 ${tab.activeBadge}`}
                >
                  Đang Mở
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

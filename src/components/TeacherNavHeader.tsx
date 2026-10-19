import React, { useState } from 'react';
import { StudentAccount } from '../game/types';
import { dualDB } from '../services/database';
import { soundEngine } from '../services/sound';
import { RankAvatarFrame } from './RankBadge';

export type TeacherWorkspaceTab = 'admin' | 'lobby' | 'menu';

interface TeacherNavHeaderProps {
  activeTab: TeacherWorkspaceTab;
  teacherProfile: StudentAccount;
  fbConnected: boolean;
  onSelectTab: (tab: TeacherWorkspaceTab) => void;
  onOpenFirebaseModal: () => void;
  onLogout: () => void;
}

export const TeacherNavHeader: React.FC<TeacherNavHeaderProps> = ({
  activeTab,
  teacherProfile,
  fbConnected,
  onSelectTab,
  onOpenFirebaseModal,
  onLogout,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(teacherProfile.username);

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
    <div className="w-full rounded-2xl bg-gradient-to-r from-[#233121] via-[#3B4E38] to-[#233121] border-2 border-[#F59E0B] p-3.5 shadow-2xl space-y-3 select-none">
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
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#F59E0B] text-[#1E261D]">
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
                    className="px-2 py-0.5 rounded-lg bg-[#1E261D] hover:bg-[#2C392A] border border-[#7A9A75] text-[11px] font-bold text-[#FEF08A] cursor-pointer"
                  >
                    ✏️ Đổi Tên Hiển Thị
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Nhập tên hiển thị GV..."
                    className="px-2.5 py-1 rounded-lg bg-[#1E261D] border border-[#F59E0B] text-xs font-bold text-white w-44"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-lg bg-[#22C55E] text-[#0F172A] text-xs font-black cursor-pointer"
                  >
                    Lưu Tên
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="px-2 py-1 rounded-lg bg-[#1E261D] text-xs text-[#CBD5E1] cursor-pointer"
                  >
                    Hủy
                  </button>
                </form>
              )}
            </div>
            <div className="text-[11px] text-[#E2E8F0] mt-0.5">
              Chuyển đổi nhanh giữa 3 phân khu: Quản Trị Lớp Học · Tạo Phòng Giải Đấu (Không Bot) · Menu Xe & Shop Giáo Viên
            </div>
          </div>
        </div>

        {/* Right: Teacher Self-Coin Balance + Quick Add Coins + Firebase + Logout */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#1E261D] border-2 border-[#F59E0B] rounded-xl px-3 py-1.5">
            <span className="font-mono-num text-xs font-black text-[#F59E0B]">
              🪙 {teacherProfile.coins} Xu
            </span>
            <button
              type="button"
              onClick={() => {
                dualDB.addTeacherCoins(500);
                soundEngine.playCoin();
              }}
              title="Tự cộng +500 Xu cho Giáo Viên"
              className="px-2 py-0.5 rounded-lg bg-[#22C55E] hover:bg-[#4ADE80] text-[#0F172A] font-mono-num font-black text-[11px] cursor-pointer"
            >
              +500 Xu
            </button>
            <button
              type="button"
              onClick={() => {
                dualDB.addTeacherCoins(2000);
                soundEngine.playCoin();
              }}
              title="Tự cộng +2,000 Xu cho Giáo Viên"
              className="px-2 py-0.5 rounded-lg bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0F172A] font-mono-num font-black text-[11px] cursor-pointer"
            >
              +2,000 Xu
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenFirebaseModal}
            className="px-3 py-2 rounded-xl bg-[#1E261D] hover:bg-[#2C392A] text-[#FEF08A] border border-[#7A9A75] text-xs font-bold cursor-pointer"
          >
            {fbConnected ? '🟢 Firebase Online' : '🔥 Cấu Hình Firebase'}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-2 rounded-xl bg-[#1E261D] hover:bg-red-950 text-white border border-[#7A9A75] text-xs font-bold cursor-pointer"
          >
            Đăng Xuất
          </button>
        </div>
      </div>

      {/* Bottom Row: 3 Separated Teacher Workspace Tabs (Requirement #4) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-[#7A9A75]/50">
        <button
          type="button"
          onClick={() => {
            soundEngine.playCoin();
            onSelectTab('admin');
          }}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
            activeTab === 'admin'
              ? 'bg-[#F59E0B] text-[#1E261D] border-[#FEF08A] shadow-lg scale-[1.01]'
              : 'bg-[#1E261D]/90 text-white border-[#7A9A75]/60 hover:border-[#F59E0B]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🛡️</span>
            <div>
              <div className="text-xs sm:text-sm font-black uppercase">
                1. Menu Quản Trị Lớp Học
              </div>
              <div
                className={`text-[11px] font-semibold ${
                  activeTab === 'admin' ? 'text-[#1E261D]/85' : 'text-[#A7C4A0]'
                }`}
              >
                Quản lý Học Sinh, PIN, Giftcode & Xuất CSV
              </div>
            </div>
          </div>
          {activeTab === 'admin' && (
            <span className="px-2 py-0.5 rounded bg-[#1E261D] text-[#FEF08A] text-[10px] font-black shrink-0">
              ĐANG MỞ
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playCoin();
            dualDB.updateLobby({
              playModeCategory: 'teacher_cup',
              botCount: 0,
            });
            onSelectTab('lobby');
          }}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
            activeTab === 'lobby'
              ? 'bg-[#F59E0B] text-[#1E261D] border-[#FEF08A] shadow-lg scale-[1.01]'
              : 'bg-[#1E261D]/90 text-white border-[#7A9A75]/60 hover:border-[#F59E0B]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🏟️</span>
            <div>
              <div className="text-xs sm:text-sm font-black uppercase">
                2. Tạo Phòng & Giải Đấu
              </div>
              <div
                className={`text-[11px] font-semibold ${
                  activeTab === 'lobby' ? 'text-[#1E261D]/85' : 'text-[#A7C4A0]'
                }`}
              >
                Tạo phòng riêng (Không Bot) & Chỉnh Xu giải đấu
              </div>
            </div>
          </div>
          {activeTab === 'lobby' && (
            <span className="px-2 py-0.5 rounded bg-[#1E261D] text-[#FEF08A] text-[10px] font-black shrink-0">
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
              ? 'bg-[#F59E0B] text-[#1E261D] border-[#FEF08A] shadow-lg scale-[1.01]'
              : 'bg-[#1E261D]/90 text-white border-[#7A9A75]/60 hover:border-[#F59E0B]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🏎️</span>
            <div>
              <div className="text-xs sm:text-sm font-black uppercase">
                3. Menu Xe & Shop Giáo Viên
              </div>
              <div
                className={`text-[11px] font-semibold ${
                  activeTab === 'menu' ? 'text-[#1E261D]/85' : 'text-[#A7C4A0]'
                }`}
              >
                Chọn xe, Mua đồ, Quay Gacha & Tự Cộng Xu
              </div>
            </div>
          </div>
          {activeTab === 'menu' && (
            <span className="px-2 py-0.5 rounded bg-[#1E261D] text-[#FEF08A] text-[10px] font-black shrink-0">
              ĐANG MỞ
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

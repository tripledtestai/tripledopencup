import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Volume2,
  VolumeX,
  RotateCcw,
  X,
  Gamepad2,
  ShieldAlert,
  BookmarkCheck,
  Save,
  Download,
  Upload,
  Trash2,
  History,
} from 'lucide-react';
import {
  CustomKeyBindings,
  DEFAULT_KEY_BINDINGS,
  getKeyBindings,
  getKeyLabel,
  saveKeyBindings,
} from '../game/keyboard';
import { GameSaveCheckpoint } from '../game/types';
import { dualDB } from '../services/database';
import { soundEngine } from '../services/sound';

interface SettingsModalProps {
  onClose: () => void;
  isTeacher?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  isTeacher = false,
}) => {
  const [bindings, setBindings] = useState<CustomKeyBindings>(getKeyBindings);
  const [activeBindingAction, setActiveBindingAction] = useState<
    keyof CustomKeyBindings | null
  >(null);
  const [isMuted, setIsMuted] = useState(() => soundEngine.getMuted());
  const [checkpointLabel, setCheckpointLabel] = useState('');
  const [checkpoints, setCheckpoints] = useState<GameSaveCheckpoint[]>(() =>
    dualDB.getCheckpoints()
  );
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!activeBindingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const newCode = e.code || 'Space';
      if (newCode === 'Escape' && activeBindingAction !== 'pause') {
        setActiveBindingAction(null);
        return;
      }

      setBindings((prev) => {
        const next = { ...prev, [activeBindingAction]: [newCode] };
        saveKeyBindings(next);
        return next;
      });

      setActiveBindingAction(null);
      soundEngine.playCoin();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [activeBindingAction]);

  const handleResetDefaults = () => {
    setBindings(DEFAULT_KEY_BINDINGS);
    saveKeyBindings(DEFAULT_KEY_BINDINGS);
    soundEngine.playCoin();
  };

  const handleToggleSound = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleCreateCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    const cp = dualDB.createCheckpoint(checkpointLabel);
    setCheckpointLabel('');
    setCheckpoints(dualDB.getCheckpoints());
    soundEngine.playFanfare(false);
    setSaveFeedback(`💾 Đã lưu điểm mốc: "${cp.label}"`);
  };

  const handleRestoreCheckpoint = (cp: GameSaveCheckpoint) => {
    const res = dualDB.restoreCheckpoint(cp.id);
    setCheckpoints(dualDB.getCheckpoints());
    if (res.ok) {
      soundEngine.playFanfare(false);
    }
    setSaveFeedback(res.message);
  };

  const handleDeleteCheckpoint = (id: string) => {
    dualDB.deleteCheckpoint(id);
    setCheckpoints(dualDB.getCheckpoints());
    soundEngine.playCoin();
  };

  const handleExportJSON = () => {
    const json = dualDB.exportCheckpointJSON();
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
    setSaveFeedback('Đã xuất file Điểm Mốc Lưu Game (.json)!');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = dualDB.importCheckpointJSON(String(reader.result || ''));
      setCheckpoints(dualDB.getCheckpoints());
      if (res.ok) soundEngine.playFanfare(false);
      setSaveFeedback(res.message);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const CONTROL_ITEMS: { key: keyof CustomKeyBindings; label: string }[] = [
    { key: 'forward', label: 'Tăng Tốc (Tiến)' },
    { key: 'reverse', label: 'Phanh / Lùi' },
    { key: 'steerLeft', label: 'Bẻ Lái Trái' },
    { key: 'steerRight', label: 'Bẻ Lái Phải' },
    { key: 'nitro', label: 'Đốt Bình Nitro' },
    { key: 'useItem', label: 'Dùng Kỹ Năng / Đồ' },
    { key: 'rescue', label: 'Giải Cứu Xe Kẹt' },
    { key: 'pause', label: 'Tạm Dừng Game' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-[#0B0F1A] border border-slate-800 shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden">
        {/* Top Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#F59E0B] via-[#FEF08A] to-[#F59E0B]" />

        {/* Content Container */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-[#F59E0B]/50 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Settings className="w-6 h-6 text-[#FEF08A]" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight">
                  SETTINGS & SAVE CHECKPOINTS
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  Cấu Hình Điều Khiển, Âm Thanh & Điểm Mốc Lưu Game
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 bg-[#1E293B] hover:bg-red-950/40 text-slate-400 hover:text-red-400 flex items-center justify-center cursor-pointer transition-colors border border-slate-800 hover:border-red-900/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Settings Body */}
          <div className="space-y-6 max-h-[62vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Game Save Checkpoints Section (Teachers Only) */}
            {isTeacher && (
              <div className="p-4 bg-[#111827]/80 border border-[#F59E0B]/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-black text-[#FEF08A] uppercase tracking-wider">
                    <BookmarkCheck className="w-4 h-4 text-[#F59E0B]" />
                    <span>Điểm Mốc Lưu Game (Save Checkpoints)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleExportJSON}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-bold text-[#FEF08A] flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Xuất File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-bold text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Nhập File</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportJSON}
                      className="hidden"
                    />
                  </div>
                </div>

                {saveFeedback && (
                  <div className="p-2 bg-emerald-950/60 border border-emerald-500/50 text-xs font-bold text-emerald-300">
                    {saveFeedback}
                  </div>
                )}

                <form onSubmit={handleCreateCheckpoint} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tên điểm mốc lưu (VD: Trước khi quay Gacha)..."
                    value={checkpointLabel}
                    onChange={(e) => setCheckpointLabel(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-black/50 border border-slate-700 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0F172A] font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Tạo Mốc Lưu</span>
                  </button>
                </form>

                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {checkpoints.map((cp) => (
                    <div
                      key={cp.id}
                      className="p-2.5 bg-black/40 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {cp.label}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono-num flex items-center gap-1">
                          <History className="w-3 h-3 text-[#F59E0B]" />
                          <span>
                            {new Date(cp.createdAt).toLocaleString('vi-VN')} ·{' '}
                            {cp.studentCount} tài khoản
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestoreCheckpoint(cp)}
                          className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/60 text-emerald-200 text-[10px] font-black uppercase cursor-pointer"
                        >
                          Khôi Phục
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCheckpoint(cp.id)}
                          className="p-1 bg-red-950/50 hover:bg-red-900 border border-red-700/50 text-red-300 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audio Setting Section */}
            <div className="p-5 bg-gradient-to-r from-[#1E293B]/40 to-transparent border-l-4 border-[#4ADE80] flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isMuted ? (
                  <VolumeX className="w-6 h-6 text-red-500" />
                ) : (
                  <Volume2 className="w-6 h-6 text-[#4ADE80]" />
                )}
                <div>
                  <div className="text-sm font-black text-white uppercase tracking-tight">
                    Âm Thanh Trò Chơi
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">
                    Hiệu ứng âm thanh & Nhạc nền
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleSound}
                className={`px-5 py-2 text-xs font-black tracking-widest cursor-pointer transition-all ${
                  isMuted
                    ? 'bg-red-950/30 border border-red-500/50 text-red-400'
                    : 'bg-emerald-950/30 border border-emerald-500/50 text-[#4ADE80]'
                }`}
              >
                {isMuted ? 'MUTE' : 'ACTIVE'}
              </button>
            </div>

            {/* Keybinding Controls List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#F59E0B] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  <span>Cấu Hình Phím Bấm</span>
                </span>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-[10px] text-slate-500 hover:text-white font-bold flex items-center gap-1.5 cursor-pointer transition-colors uppercase tracking-widest"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Mặc Định</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CONTROL_ITEMS.map((item) => {
                  const currentKeys = bindings[item.key] || [];
                  const isBinding = activeBindingAction === item.key;
                  return (
                    <div
                      key={item.key}
                      className="p-4 bg-[#111827]/60 border border-slate-800/80 flex items-center justify-between gap-4 transition-colors hover:border-slate-700"
                    >
                      <div className="text-[11px] font-black text-slate-300 uppercase tracking-tight">
                        {item.label}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveBindingAction(item.key)}
                        className={`min-w-[100px] px-3 py-2 border text-xs font-mono font-black cursor-pointer transition-all ${
                          isBinding
                            ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0F172A] animate-pulse'
                            : 'bg-black/40 border-slate-700 hover:border-[#F59E0B] text-[#FDE047]'
                        }`}
                      >
                        {isBinding
                          ? 'INPUT...'
                          : currentKeys.map((k) => getKeyLabel(k)).join(' / ')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#F59E0B]" />
              <span>Phím bấm & Điểm mốc lưu tự động đồng bộ</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0F172A] font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-[0_5px_20px_rgba(245,158,11,0.2)]"
            >
              Lưu & Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


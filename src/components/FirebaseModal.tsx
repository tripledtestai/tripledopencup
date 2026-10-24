import React, { useState } from 'react';
import { X, Database, CheckCircle2, Zap, Flame } from 'lucide-react';
import { dualDB, FirebaseConfigInput } from '../services/database';

interface FirebaseModalProps {
  onClose: () => void;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({ onClose }) => {
  const status = dualDB.getFirebaseStatus();
  const [rawJson, setRawJson] = useState(
    status.savedConfig ||
      `{\n  "apiKey": "AIzaSy...",\n  "authDomain": "your-project.firebaseapp.com",\n  "databaseURL": "https://your-project-default-rtdb.firebaseio.com",\n  "projectId": "your-project"\n}`
  );
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const cleaned = rawJson
        .replace(/const\s+firebaseConfig\s*=\s*/, '')
        .replace(/;\s*$/, '');
      const parsed: FirebaseConfigInput = JSON.parse(cleaned);
      if (!parsed.databaseURL || !parsed.apiKey) {
        setFeedback({
          ok: false,
          text: 'JSON thiếu trường bắt buộc: "apiKey" và "databaseURL" của Firebase Realtime Database.',
        });
        return;
      }
      setLoading(true);
      const res = await dualDB.connectFirebase(parsed);
      setLoading(false);
      if (res.ok) {
        setFeedback({
          ok: true,
          text: 'Đã kết nối thành công với Firebase Realtime Database! Dữ liệu sẽ đồng bộ thời gian thực.',
        });
      } else {
        setFeedback({
          ok: false,
          text: `Lỗi kết nối: ${res.error}`,
        });
      }
    } catch {
      setFeedback({
        ok: false,
        text: 'Định dạng JSON không hợp lệ. Hãy đảm bảo các khóa nằm trong dấu ngoặc kép (VD: "databaseURL": "...").',
      });
    }
  };

  const handleDisconnect = () => {
    dualDB.disconnectFirebase(true);
    setFeedback({
      ok: true,
      text: 'Đã ngắt kết nối Firebase và chuyển về chế độ LocalStorage + BroadcastChannel tốc độ cao.',
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#070D1B] border border-slate-800 shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden text-white">
        {/* Top Accent Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500/70 via-amber-400/90 to-cyan-500/70" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0B1528] border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-sci font-bold text-white uppercase tracking-wide">
                Kết Nối Cơ Sở Dữ Liệu (Dual-DB)
              </h2>
              <p className="text-[11px] text-slate-400">
                Đồng bộ đám mây Firebase Realtime Database hoặc LocalStorage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Cấu Hình Database"
            title="Đóng"
            className="w-8 h-8 p-0 leading-none rounded-xl bg-[#040814] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4 stroke-[2.5] block shrink-0" />
          </button>
        </div>

        <form onSubmit={handleConnect} className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-[#040814] border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-300 font-medium">
              Trạng thái cơ sở dữ liệu hiện tại:
            </span>
            <span className="font-bold flex items-center gap-1.5">
              {status.connected ? (
                <span className="text-emerald-300 flex items-center gap-1.5 bg-emerald-500/15 px-2.5 py-0.5 rounded-lg border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Đang đồng bộ Firebase RTDB</span>
                </span>
              ) : (
                <span className="text-amber-300 flex items-center gap-1.5 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/40">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>LocalStorage + P2P Online (Tức thì)</span>
                </span>
              )}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Cấu hình JSON <code className="text-amber-300">firebaseConfig</code>{' '}
              (Firebase Realtime Database):
            </label>
            <textarea
              rows={7}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-[#040814] border border-slate-700/90 font-mono-num text-xs text-emerald-300 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold ${
                feedback.ok
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            {status.connected && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/50 text-rose-200 text-xs font-bold cursor-pointer transition-colors"
              >
                Chuyển Về LocalStorage
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/70 text-amber-200 font-sci font-black text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {loading ? 'Đang kết nối...' : 'Lưu & Kết Nối Firebase RTDB'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

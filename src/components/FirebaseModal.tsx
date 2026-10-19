import React, { useState } from 'react';
import { X } from 'lucide-react';
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
  const [feedback, setFeedback] = useState<string | null>(null);
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
        setFeedback(
          'JSON thiếu trường bắt buộc: "apiKey" và "databaseURL" của Firebase Realtime Database.'
        );
        return;
      }
      setLoading(true);
      const res = await dualDB.connectFirebase(parsed);
      setLoading(false);
      if (res.ok) {
        setFeedback(
          'Đã kết nối thành công với Firebase Realtime Database! Dữ liệu sẽ đồng bộ thời gian thực.'
        );
      } else {
        setFeedback(`Lỗi kết nối: ${res.error}`);
      }
    } catch {
      setFeedback(
        'Định dạng JSON không hợp lệ. Hãy đảm bảo các khóa nằm trong dấu ngoặc kép (VD: "databaseURL": "...").'
      );
    }
  };

  const handleDisconnect = () => {
    dualDB.disconnectFirebase(true);
    setFeedback(
      'Đã ngắt kết nối Firebase và chuyển về chế độ LocalStorage + BroadcastChannel tốc độ cao.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#1E261D] border-2 border-[#7A9A75] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#4A6046] border-b border-[#7A9A75]">
          <h2 className="text-base sm:text-lg font-bold text-white">
            🔥 Kết Nối Cơ Sở Dữ Liệu (Dual-DB)
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Cấu Hình Database"
            title="Đóng"
            className="w-9 h-9 p-0 leading-none rounded-xl bg-[#1E261D] hover:bg-[#2E3B2C] text-white border border-[#7A9A75] inline-flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 stroke-[2.75] block shrink-0" />
          </button>
        </div>

        <form onSubmit={handleConnect} className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-[#273325] border border-[#7A9A75] flex items-center justify-between text-xs">
            <span>Trạng thái cơ sở dữ liệu hiện tại:</span>
            <span className="font-bold text-[#F59E0B]">
              {status.connected
                ? '🟢 Đang đồng bộ Firebase Realtime DB'
                : '⚡ Đang chạy LocalStorage + AI Bots (Tức thì)'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
              Cấu hình JSON `firebaseConfig` (Firebase Realtime Database):
            </label>
            <textarea
              rows={7}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#141A13] border border-[#7A9A75] font-mono-num text-xs text-[#4ADE80] focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          {feedback && (
            <div className="p-3 rounded-lg bg-[#4A6046] border border-[#F59E0B] text-xs text-[#FEF08A] font-medium">
              {feedback}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            {status.connected && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl bg-red-950 border border-red-500 text-red-200 text-xs font-bold cursor-pointer"
              >
                Chuyển Về LocalStorage
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#FBBF24] text-[#1E261D] font-extrabold text-xs cursor-pointer"
            >
              {loading ? 'Đang kết nối...' : 'Lưu & Kết Nối Firebase RTDB'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

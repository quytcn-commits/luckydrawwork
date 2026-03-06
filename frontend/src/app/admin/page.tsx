"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  open: "Đang mở",
  closed: "Đã đóng",
  drawing: "Đang quay",
  finished: "Hoàn thành",
};

const statusColors: Record<string, string> = {
  open: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  closed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  drawing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  finished: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("admin@luckydraw.work");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [rooms, setRooms] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);

  const [eventName, setEventName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [prizes, setPrizes] = useState([
    { name: "Giải Ba", order: 3, winnerCount: 1 },
    { name: "Giải Nhì", order: 2, winnerCount: 1 },
    { name: "Giải Nhất", order: 1, winnerCount: 1 },
  ]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      loadRooms();
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem("token", data.access_token);
      setIsLoggedIn(true);
      loadRooms();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRooms() {
    try {
      const data = await api.getRooms();
      setRooms(data);
    } catch {
      localStorage.removeItem("token");
      setIsLoggedIn(false);
    }
  }

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createRoom({
        eventName,
        roomName,
        description,
        createdBy,
        prizes: prizes.filter((p) => p.name.trim()),
      });
      setShowCreate(false);
      setEventName("");
      setRoomName("");
      setDescription("");
      setCreatedBy("");
      loadRooms();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function addPrize() {
    setPrizes([...prizes, { name: "", order: prizes.length + 1, winnerCount: 1 }]);
  }

  function removePrize(index: number) {
    setPrizes(prizes.filter((_, i) => i !== index));
  }

  function updatePrize(index: number, field: string, value: any) {
    const updated = [...prizes];
    (updated[index] as any)[field] = value;
    setPrizes(updated);
  }

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-[120px]" />
        </div>

        <form
          onSubmit={handleLogin}
          className="relative card w-full max-w-md p-8"
        >
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center font-bold text-xl">
              LD
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 text-center">Đăng nhập quản trị</h1>
          <p className="text-sm text-slate-400 text-center mb-6">Truy cập bảng điều khiển Lucky Draw</p>

          {error && (
            <div className="bg-red-500/15 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm border border-red-500/20">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5 font-medium">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </div>
          <Link href="/" className="block text-center text-sm text-slate-500 mt-5 hover:text-slate-300 transition-colors">
            ← Quay về trang chủ
          </Link>
        </form>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen gradient-bg text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center font-bold text-xs">
              LD
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 hidden sm:block">
              LuckyDraw
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary text-sm px-3 sm:px-5 py-2"
            >
              <span className="sm:hidden">+ Tạo</span>
              <span className="hidden sm:inline">+ Tạo phòng mới</span>
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                setIsLoggedIn(false);
              }}
              className="px-3 sm:px-4 py-2 rounded-xl bg-white/5 text-sm hover:bg-white/10 transition-colors text-slate-400"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Phòng quay thưởng</h1>
            <p className="text-sm text-slate-400 mt-1">Quản lý tất cả sự kiện quay thưởng</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-indigo-400">{rooms.length}</span>
            <p className="text-xs text-slate-500">phòng</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/15 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm border border-red-500/20">
            {error}
          </div>
        )}

        {/* Create Room Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <form
              onSubmit={handleCreateRoom}
              className="bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold">Tạo phòng quay thưởng</h2>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5 font-medium">Tên sự kiện <span className="text-red-400">*</span></label>
                  <input
                    required
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="input-field"
                    placeholder="VD: Year End Party 2026"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5 font-medium">Tên phòng <span className="text-red-400">*</span></label>
                  <input
                    required
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="input-field"
                    placeholder="VD: Quay thưởng cuối năm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5 font-medium">Mô tả</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field resize-none"
                    rows={2}
                    placeholder="Mô tả ngắn về sự kiện..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5 font-medium">Người tạo <span className="text-red-400">*</span></label>
                  <input
                    required
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    className="input-field"
                    placeholder="VD: Ban tổ chức"
                  />
                </div>

                {/* Prizes */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2 font-medium">Giải thưởng</label>
                  <div className="space-y-2">
                    {prizes.map((prize, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          value={prize.name}
                          onChange={(e) => updatePrize(i, "name", e.target.value)}
                          className="input-field flex-1 !py-2.5 text-sm"
                          placeholder="Tên giải"
                        />
                        <input
                          type="number"
                          min={1}
                          value={prize.order}
                          onChange={(e) => updatePrize(i, "order", parseInt(e.target.value))}
                          className="input-field !w-16 !py-2.5 text-sm text-center"
                          title="Thứ tự quay"
                        />
                        <input
                          type="number"
                          min={1}
                          value={prize.winnerCount}
                          onChange={(e) => updatePrize(i, "winnerCount", parseInt(e.target.value))}
                          className="input-field !w-16 !py-2.5 text-sm text-center"
                          title="Số lượng giải"
                        />
                        <button
                          type="button"
                          onClick={() => removePrize(i)}
                          className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 text-sm hover:bg-red-500/25 transition-colors flex items-center justify-center flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex-1">Tên giải</span>
                    <span className="w-16 text-center">Thứ tự</span>
                    <span className="w-16 text-center">Số giải</span>
                    <span className="w-10"></span>
                  </div>
                  <button
                    type="button"
                    onClick={addPrize}
                    className="text-sm text-indigo-400 hover:text-indigo-300 mt-3 transition-colors"
                  >
                    + Thêm giải thưởng
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {loading ? "Đang tạo..." : "Tạo phòng"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary px-6"
                >
                  Huỷ
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Room list */}
        {rooms.length === 0 ? (
          <div className="text-center py-16 sm:py-24">
            <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center text-4xl mx-auto mb-6 animate-float">
              🎰
            </div>
            <p className="text-lg text-slate-300 mb-2">Chưa có phòng quay thưởng nào</p>
            <p className="text-sm text-slate-500 mb-6">Bắt đầu bằng cách tạo phòng đầu tiên</p>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary"
            >
              Tạo phòng đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <Link
                key={room.id}
                href={`/admin/room/${room.id}`}
                className="card hover:bg-white/10 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${statusColors[room.status]}`}>
                    {statusLabels[room.status]}
                  </span>
                  <span className="text-xs text-slate-500 font-mono bg-white/5 px-2 py-1 rounded">
                    {room.code}
                  </span>
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-indigo-300 transition-colors">
                  {room.eventName}
                </h3>
                <p className="text-sm text-slate-400 mb-4">{room.roomName}</p>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-white/5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    {room.participants?.length || 0} người tham gia
                  </span>
                  <span>{room.prizes?.length || 0} giải thưởng</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

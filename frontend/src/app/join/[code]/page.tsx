"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { joinRoom } from "@/lib/socket";

export default function JoinPage() {
  const params = useParams();
  const code = params.code as string;

  const [room, setRoom] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [winner, setWinner] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getPublicRoom(code);
        setRoom(data);
        const initial: Record<string, string> = {};
        data.formFields?.forEach((f: any) => {
          initial[f.name] = "";
        });
        setFormData(initial);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [code]);

  useEffect(() => {
    if (!submitted || !room) return;
    const socket = joinRoom(room.code);

    socket.on("winnerSelected", (data: any) => {
      setWinner(data);
    });
    socket.on("registrationClosed", () => {
      setRoom((prev: any) => ({ ...prev, status: "closed" }));
    });
    socket.on("drawStarted", () => {
      setRoom((prev: any) => ({ ...prev, status: "drawing" }));
    });

    return () => {
      socket.off("winnerSelected");
      socket.off("registrationClosed");
      socket.off("drawStarted");
    };
  }, [submitted, room?.code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.registerParticipant(code, formData);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Đang tải thông tin...</span>
        </div>
      </div>
    );
  }

  // Room not found
  if (error && !room) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center text-4xl mx-auto mb-5">
            😔
          </div>
          <h1 className="text-xl font-bold mb-2">Phòng không tồn tại</h1>
          <p className="text-slate-400 text-sm">{error}</p>
          <p className="text-xs text-slate-600 mt-4">Vui lòng kiểm tra lại mã phòng hoặc liên hệ ban tổ chức</p>
        </div>
      </div>
    );
  }

  if (!room) return null;

  // Room closed - can't register
  if (room.status !== "open" && !submitted) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white p-4">
        <div className="text-center max-w-sm">
          {room.logoUrl && <img src={room.logoUrl} alt="Logo" className="h-14 mx-auto mb-4 object-contain" />}
          <h1 className="text-xl font-bold mb-1">{room.eventName}</h1>
          <p className="text-sm text-slate-400 mb-6">{room.roomName}</p>
          <div className="card py-6 px-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-2xl mx-auto mb-4">
              🔒
            </div>
            <p className="text-lg font-semibold text-amber-400">Phòng đã đóng đăng ký</p>
            <p className="text-sm mt-2 text-slate-400">
              Phòng này không còn nhận đăng ký mới. Vui lòng liên hệ ban tổ chức.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Submitted - waiting / watching screen
  if (submitted) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white p-4">
        <div className="text-center max-w-sm w-full">
          {room.logoUrl && <img src={room.logoUrl} alt="Logo" className="h-14 mx-auto mb-4 object-contain" />}
          <h1 className="text-xl font-bold mb-1">{room.eventName}</h1>
          <p className="text-sm text-slate-400 mb-6">{room.roomName}</p>

          {/* Success message */}
          <div className="card py-6 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
              ✓
            </div>
            <p className="text-lg font-semibold text-emerald-400">Đăng ký thành công!</p>
            <p className="text-sm mt-2 text-slate-400">
              Bạn đã được thêm vào danh sách quay thưởng
            </p>
          </div>

          {/* Drawing status */}
          {room.status === "drawing" && (
            <div className="card py-5 mb-4 animate-pulse-glow">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-blue-400 font-semibold">Đang quay thưởng...</span>
              </div>
              <p className="text-xs text-slate-400">Hãy theo dõi màn hình chính!</p>
            </div>
          )}

          {/* Winner announcement */}
          {winner && (
            <div className="card py-6 mb-4 animate-fade-in-up bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <p className="text-amber-400 text-sm font-medium mb-1">{winner.prize?.name}</p>
              <p className="text-2xl font-bold text-amber-400">
                🏆 {winner.winners?.[0]?.displayName}
              </p>
            </div>
          )}

          {/* Participant count */}
          <div className="card py-4">
            <p className="text-3xl font-bold text-indigo-400">{room.participantCount || 0}</p>
            <p className="text-xs text-slate-400 mt-1">người đã tham gia</p>
          </div>

          <p className="text-[10px] text-slate-600 mt-6">Powered by LuckyDraw.work</p>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Event header */}
        <div className="text-center mb-5">
          {room.logoUrl && (
            <img src={room.logoUrl} alt="Logo" className="h-14 mx-auto mb-4 object-contain" />
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-white">{room.eventName}</h1>
          <p className="text-slate-400 mt-1 text-sm">{room.roomName}</p>
          {room.description && (
            <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">{room.description}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-sm">
              📝
            </div>
            <h2 className="text-base font-semibold text-white">Đăng ký tham gia</h2>
          </div>

          {error && (
            <div className="bg-red-500/15 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm border border-red-500/20 flex items-start gap-2">
              <span className="text-red-400 flex-shrink-0 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {(room.formFields || []).map((field: any) => (
              <div key={field.name}>
                <label className="block text-sm text-slate-400 mb-1.5 font-medium">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>
                {field.type === "select" && field.options ? (
                  <select
                    required={field.required}
                    value={formData[field.name] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Chọn...</option>
                    {field.options.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === "phone" ? "tel" : field.type === "number" ? "text" : field.type}
                    inputMode={field.type === "number" || field.type === "phone" ? "numeric" : undefined}
                    required={field.required}
                    value={formData[field.name] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="input-field"
                    placeholder={field.label}
                    autoComplete="off"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang gửi...
              </span>
            ) : (
              "Đăng ký tham gia"
            )}
          </button>

          <p className="text-center text-[10px] text-slate-600 mt-5">
            Powered by <span className="text-slate-500">LuckyDraw.work</span>
          </p>
        </form>
      </div>
    </div>
  );
}

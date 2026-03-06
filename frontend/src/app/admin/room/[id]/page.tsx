"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { joinRoom } from "@/lib/socket";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import * as XLSX from "xlsx";

const statusLabels: Record<string, string> = {
  open: "Đang mở đăng ký",
  closed: "Đã đóng đăng ký",
  drawing: "Đang quay thưởng",
  finished: "Đã hoàn thành",
};

const statusColors: Record<string, string> = {
  open: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  closed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  drawing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  finished: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

type ViewType = "participants" | "qr" | "draw" | "results" | "settings";

export default function RoomDetailPage() {
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [drawResults, setDrawResults] = useState<any[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<any>(null);
  const [currentPrizeName, setCurrentPrizeName] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<ViewType>("participants");
  const [uploading, setUploading] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const kvInputRef = useRef<HTMLInputElement>(null);

  const loadRoom = useCallback(async () => {
    try {
      const data = await api.getRoom(roomId);
      setRoom(data);
      setParticipants(data.participants || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, [roomId]);

  useEffect(() => { loadRoom(); }, [loadRoom]);

  useEffect(() => {
    if (!room) return;
    const socket = joinRoom(room.code);
    socket.on("participantJoined", (participant: any) => {
      setParticipants((prev) => [participant, ...prev]);
    });
    return () => { socket.off("participantJoined"); };
  }, [room?.code]);

  async function handleCloseRegistration() {
    if (!confirm("Bạn có chắc muốn đóng đăng ký?")) return;
    try {
      const updated = await api.closeRegistration(roomId);
      setRoom(updated);
    } catch (err: any) { setError(err.message); }
  }

  async function handleStartDraw() {
    try {
      const updated = await api.startDraw(roomId);
      setRoom(updated);
      setView("draw");
    } catch (err: any) { setError(err.message); }
  }

  async function handleDrawPrize(prizeId: string, prizeName: string) {
    setSpinning(true);
    setCurrentWinner(null);
    setCurrentPrizeName(prizeName);

    const eligible = participants.filter((p) => !p.isWinner);
    let spinCount = 0;
    const spinInterval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * eligible.length);
      setCurrentWinner(eligible[randomIdx]);
      spinCount++;
      if (spinCount > 25) clearInterval(spinInterval);
    }, 80);

    try {
      const result = await api.drawPrize(roomId, prizeId);
      setTimeout(() => {
        clearInterval(spinInterval);
        setCurrentWinner(result.winner);
        setSpinning(false);

        // Update prize state with partial draw progress
        setRoom((prev: any) => ({
          ...prev,
          prizes: prev.prizes.map((p: any) =>
            p.id === prizeId
              ? { ...p, drawn: result.prize.drawn, winnerIds: result.prize.winnerIds }
              : p
          ),
        }));

        // Mark participant as winner
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === result.winner.id ? { ...p, isWinner: true } : p
          )
        );
      }, 3000);
    } catch (err: any) {
      clearInterval(spinInterval);
      setSpinning(false);
      setError(err.message);
    }
  }

  async function loadResults() {
    try {
      const data = await api.getResults(roomId);
      setDrawResults(data);
      setView("results");
    } catch (err: any) { setError(err.message); }
  }

  // === FILE UPLOAD ===
  async function handleFileUpload(file: File, field: "logoUrl" | "kvImageUrl") {
    setUploading(true);
    try {
      const result = await api.uploadFile(file);
      const fileUrl = api.getFileUrl(result.url);
      await api.updateRoom(roomId, { [field]: fileUrl });
      setRoom((prev: any) => ({ ...prev, [field]: fileUrl }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  // === THEME SAVE ===
  async function handleSaveTheme(theme: any) {
    setSavingTheme(true);
    try {
      await api.updateRoom(roomId, { theme });
      setRoom((prev: any) => ({ ...prev, theme }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingTheme(false);
    }
  }

  // === EXPORT EXCEL ===
  function exportParticipantsExcel() {
    const data = participants.map((p, i) => {
      const row: any = { "STT": participants.length - i, "Họ tên": p.displayName };
      room.formFields?.forEach((f: any) => {
        row[f.label] = p.data?.[f.name] || "";
      });
      row["Trạng thái"] = p.isWinner ? "Trúng thưởng" : "Tham gia";
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Người tham gia");
    XLSX.writeFile(wb, `${room.eventName}_participants.xlsx`);
  }

  function exportResultsExcel() {
    if (drawResults.length === 0) return;
    const data: any[] = [];
    drawResults.forEach((result) => {
      result.winners.forEach((w: any) => {
        const row: any = {
          "Giải thưởng": result.prize.name,
          "Họ tên": w.displayName,
        };
        Object.entries(w.data || {}).forEach(([key, val]) => {
          row[key] = String(val);
        });
        data.push(row);
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kết quả");
    XLSX.writeFile(wb, `${room.eventName}_results.xlsx`);
  }

  if (!room) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400">Đang tải...</span>
        </div>
      </div>
    );
  }

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${room.code}`
    : `https://luckydraw.work/join/${room.code}`;
  const sortedPrizes = [...(room.prizes || [])].sort((a: any, b: any) => b.order - a.order);
  const eligibleCount = participants.filter((p) => !p.isWinner).length;

  const tabItems: { key: ViewType; label: string; count?: number }[] = [
    { key: "participants", label: "Người tham gia", count: participants.length },
    { key: "qr", label: "Mã QR" },
    { key: "draw", label: "Quay thưởng" },
    { key: "results", label: "Kết quả" },
    { key: "settings", label: "Cài đặt" },
  ];

  return (
    <div className="min-h-screen gradient-bg text-white">
      {/* Hidden file inputs */}
      <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "logoUrl")} />
      <input ref={kvInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "kvImageUrl")} />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors flex-shrink-0 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="font-bold truncate text-sm sm:text-base">{room.eventName}</h1>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium border ${statusColors[room.status]}`}>
                  {statusLabels[room.status]}
                </span>
                <span className="font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px] sm:text-xs">
                  {room.code}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {room.status === "open" && (
              <button onClick={handleCloseRegistration}
                className="px-2.5 sm:px-4 py-2 rounded-xl bg-amber-500/15 text-amber-400 text-xs sm:text-sm hover:bg-amber-500/25 transition-colors border border-amber-500/20">
                <span className="hidden sm:inline">Đóng đăng ký</span>
                <span className="sm:hidden">Đóng</span>
              </button>
            )}
            {(room.status === "closed" || room.status === "open") && (
              <button onClick={handleStartDraw} className="btn-primary text-xs sm:text-sm !px-3 sm:!px-5 !py-2">
                <span className="hidden sm:inline">Bắt đầu quay</span>
                <span className="sm:hidden">Quay</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/15 text-red-400 px-4 py-2.5 text-sm text-center border-b border-red-500/20">
          {error}
          <button onClick={() => setError("")} className="ml-3 text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-white/10 px-4 sm:px-6 overflow-x-auto">
        <div className="flex gap-0 max-w-7xl mx-auto">
          {tabItems.map((tab) => (
            <button key={tab.key}
              onClick={() => { if (tab.key === "results") loadResults(); else setView(tab.key); }}
              className={`px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium transition-all relative whitespace-nowrap ${
                view === tab.key ? "text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                  view === tab.key ? "bg-indigo-500/30 text-indigo-300" : "bg-white/5 text-slate-500"
                }`}>{tab.count}</span>
              )}
              {view === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 gradient-primary rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto">

        {/* ===== PARTICIPANTS ===== */}
        {view === "participants" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">Realtime</span>
              </div>
              <button onClick={exportParticipantsExcel}
                className="px-3 sm:px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs sm:text-sm hover:bg-emerald-500/25 transition-colors border border-emerald-500/20">
                📥 Xuất Excel
              </button>
            </div>

            <div className="card overflow-hidden !p-0">
              <div className="max-h-[65vh] overflow-y-auto">
                {participants.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-4">📋</div>
                    <p className="text-slate-400 mb-2">Chưa có người tham gia</p>
                    <p className="text-xs text-slate-600">Chia sẻ mã QR để bắt đầu nhận đăng ký</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="sm:hidden divide-y divide-white/5">
                      {participants.map((p, i) => (
                        <div key={p.id} className="px-4 py-3 hover:bg-white/5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{p.displayName}</span>
                            <span className="text-[10px] text-slate-600">#{participants.length - i}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                            {room.formFields?.slice(1).map((f: any) => (
                              <span key={f.name}>{p.data?.[f.name]}</span>
                            ))}
                            {p.isWinner && <span className="text-amber-400 font-medium ml-auto">🏆 Trúng</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop table */}
                    <table className="w-full hidden sm:table">
                      <thead className="bg-white/5 sticky top-0">
                        <tr>
                          <th className="px-5 py-2.5 text-left text-xs text-slate-500 font-medium w-12">#</th>
                          <th className="px-5 py-2.5 text-left text-xs text-slate-500 font-medium">Họ tên</th>
                          {room.formFields?.slice(1).map((f: any) => (
                            <th key={f.name} className="px-5 py-2.5 text-left text-xs text-slate-500 font-medium">{f.label}</th>
                          ))}
                          <th className="px-5 py-2.5 text-left text-xs text-slate-500 font-medium w-28">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map((p, i) => (
                          <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                            <td className="px-5 py-2.5 text-sm text-slate-600">{participants.length - i}</td>
                            <td className="px-5 py-2.5 text-sm font-medium">{p.displayName}</td>
                            {room.formFields?.slice(1).map((f: any) => (
                              <td key={f.name} className="px-5 py-2.5 text-sm text-slate-300">{p.data?.[f.name] || "—"}</td>
                            ))}
                            <td className="px-5 py-2.5">
                              {p.isWinner ? (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md">🏆 Trúng</span>
                              ) : (
                                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">Đủ điều kiện</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== QR VIEW ===== */}
        {view === "qr" && (
          <div className="flex flex-col items-center justify-center py-6 sm:py-12">
            <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/20 max-w-sm w-full">
              {room.logoUrl && (
                <img src={room.logoUrl} alt="Logo" className="h-10 sm:h-12 mx-auto mb-4 object-contain" />
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-1">{room.eventName}</h2>
              <p className="text-slate-500 text-center text-sm mb-6">{room.roomName}</p>
              <div className="flex justify-center">
                <QRCodeSVG value={joinUrl} size={220} level="H" marginSize={2} className="mx-auto" />
              </div>
              <div className="mt-6 text-center">
                <p className="font-mono text-2xl font-bold text-indigo-600 tracking-widest">{room.code}</p>
                <p className="text-slate-400 text-xs mt-2">Quét mã QR hoặc truy cập link bên dưới</p>
                <p className="text-indigo-600 text-xs mt-1 font-mono break-all">{joinUrl}</p>
              </div>
            </div>
            <div className="mt-6 sm:mt-8 card text-center px-8 py-5">
              <p className="text-4xl sm:text-5xl font-bold text-indigo-400">{participants.length}</p>
              <p className="text-sm text-slate-400 mt-1">người đã tham gia</p>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">Cập nhật realtime</span>
              </div>
            </div>
          </div>
        )}

        {/* ===== DRAW VIEW ===== */}
        {view === "draw" && (
          <div className="max-w-2xl mx-auto py-4 sm:py-8">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-4xl font-bold mb-2">🎰 Quay thưởng</h2>
              <p className="text-slate-400 text-sm sm:text-base">
                Còn <strong className="text-white">{eligibleCount}</strong> người trong danh sách
              </p>
            </div>

            {currentWinner && (
              <div className={`text-center mb-6 sm:mb-8 p-6 sm:p-10 rounded-2xl border transition-all duration-500 ${
                spinning ? "glass border-white/10" : "bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-amber-500/20 border-amber-500/30 animate-winner-glow"
              }`}>
                {!spinning && currentPrizeName && (
                  <p className="text-amber-400/80 text-sm font-medium mb-2 animate-fade-in">{currentPrizeName}</p>
                )}
                <p className={`text-3xl sm:text-5xl font-bold mb-3 transition-all duration-300 ${spinning ? "text-white/80" : "text-amber-400"}`}>
                  {spinning ? (
                    <span>{currentWinner.displayName || currentWinner.data?.fullName}</span>
                  ) : (
                    <span className="animate-fade-in-up inline-block">🏆 {currentWinner.displayName || currentWinner.data?.fullName}</span>
                  )}
                </p>
                {!spinning && currentWinner.data && (
                  <div className="text-slate-300 animate-fade-in-up text-sm sm:text-base">
                    {Object.entries(currentWinner.data).map(([key, val]) => (
                      <span key={key} className="mx-2">{String(val)}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              {sortedPrizes.map((prize: any, index: number) => {
                const drawnCount = prize.winnerIds?.length || 0;
                const totalCount = prize.winnerCount || 1;
                const isFullyDrawn = prize.drawn || drawnCount >= totalCount;
                const isPartiallyDrawn = drawnCount > 0 && !isFullyDrawn;

                return (
                  <div key={prize.id}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
                      isFullyDrawn ? "glass opacity-60" : isPartiallyDrawn ? "glass border-amber-500/30" : "glass hover:bg-white/10"
                    }`}>
                    <div className="flex items-center gap-3 mb-3 sm:mb-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl font-bold flex-shrink-0 ${
                        isFullyDrawn ? "bg-emerald-500/20 text-emerald-400" : isPartiallyDrawn ? "bg-amber-500/20 text-amber-400" : index === 0 ? "bg-amber-500/20 text-amber-400" : "bg-indigo-500/20 text-indigo-400"
                      }`}>{isFullyDrawn ? "✓" : prize.order}</div>
                      <div>
                        <h3 className="font-semibold text-base sm:text-lg">{prize.name}</h3>
                        <p className="text-xs sm:text-sm text-slate-400">
                          {totalCount} người trúng · Thứ tự: {prize.order}
                          {drawnCount > 0 && !isFullyDrawn && (
                            <span className="text-amber-400 ml-2">· Đã quay {drawnCount}/{totalCount}</span>
                          )}
                        </p>
                        {isPartiallyDrawn && (
                          <div className="mt-1.5 w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(drawnCount / totalCount) * 100}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                    {isFullyDrawn ? (
                      <span className="btn-success !py-2 text-xs sm:text-sm w-full sm:w-auto text-center">✓ Đã quay xong</span>
                    ) : (
                      <button onClick={() => handleDrawPrize(prize.id, prize.name)} disabled={spinning}
                        className="btn-primary !py-2.5 text-sm w-full sm:w-auto disabled:opacity-50">
                        {spinning ? "Đang quay..." : `🎲 Quay giải này (${drawnCount + 1}/${totalCount})`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {sortedPrizes.every((p: any) => p.drawn || (p.winnerIds?.length || 0) >= (p.winnerCount || 1)) && (
              <div className="text-center mt-8 card py-8">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold mb-2">Đã quay xong tất cả giải!</h3>
                <button onClick={loadResults} className="btn-primary mt-2">Xem kết quả</button>
              </div>
            )}
          </div>
        )}

        {/* ===== RESULTS VIEW ===== */}
        {view === "results" && (
          <div className="max-w-2xl mx-auto py-4 sm:py-8">
            <div className="flex items-center justify-between mb-6 sm:mb-10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">🏆 Kết quả</h2>
                <p className="text-slate-400 text-sm">{room.eventName}</p>
              </div>
              {drawResults.length > 0 && (
                <button onClick={exportResultsExcel}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs sm:text-sm hover:bg-emerald-500/25 transition-colors border border-emerald-500/20">
                  📥 Xuất Excel
                </button>
              )}
            </div>

            {drawResults.length === 0 ? (
              <div className="text-center py-12 card">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-slate-400">Chưa có kết quả quay thưởng</p>
              </div>
            ) : (
              <div className="space-y-4">
                {drawResults.map((result, i) => (
                  <div key={i} className="card animate-fade-in-up" style={{ animationDelay: `${i * 150}ms` }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-lg">🏆</div>
                      <h3 className="text-lg sm:text-xl font-bold text-amber-400">{result.prize.name}</h3>
                    </div>
                    <div className="space-y-2">
                      {result.winners.map((w: any) => (
                        <div key={w.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/5">
                          <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center text-sm font-bold text-slate-900 flex-shrink-0">W</div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm sm:text-base truncate">{w.displayName}</p>
                            <p className="text-xs sm:text-sm text-slate-400 truncate">
                              {Object.values(w.data || {}).map((v) => String(v)).join(" · ")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== SETTINGS VIEW ===== */}
        {view === "settings" && (
          <div className="max-w-2xl mx-auto py-4 sm:py-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold">⚙️ Cài đặt & Thương hiệu</h2>

            {/* Logo & KV upload */}
            <div className="card">
              <h3 className="font-semibold mb-4">Hình ảnh thương hiệu</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Logo */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Logo sự kiện</label>
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all min-h-[120px] flex flex-col items-center justify-center"
                  >
                    {room.logoUrl ? (
                      <img src={room.logoUrl} alt="Logo" className="max-h-16 object-contain mb-2" />
                    ) : (
                      <div className="text-3xl mb-2">🖼️</div>
                    )}
                    <p className="text-xs text-slate-400">{uploading ? "Đang tải lên..." : "Bấm để upload logo"}</p>
                  </div>
                </div>

                {/* KV */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Ảnh KV sự kiện</label>
                  <div
                    onClick={() => kvInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all min-h-[120px] flex flex-col items-center justify-center"
                  >
                    {room.kvImageUrl ? (
                      <img src={room.kvImageUrl} alt="KV" className="max-h-16 object-contain mb-2" />
                    ) : (
                      <div className="text-3xl mb-2">🎨</div>
                    )}
                    <p className="text-xs text-slate-400">{uploading ? "Đang tải lên..." : "Bấm để upload ảnh KV"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Theme colors */}
            <div className="card">
              <h3 className="font-semibold mb-4">Tuỳ chỉnh màu sắc</h3>
              <ThemeEditor
                theme={room.theme || {}}
                onSave={handleSaveTheme}
                saving={savingTheme}
              />
            </div>

            {/* Room info */}
            <div className="card">
              <h3 className="font-semibold mb-4">Thông tin phòng</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Mã phòng</span>
                  <span className="font-mono text-indigo-400">{room.code}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Trạng thái</span>
                  <span>{statusLabels[room.status]}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Người tạo</span>
                  <span>{room.createdBy}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Người tham gia</span>
                  <span>{participants.length}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Link tham gia</span>
                  <span className="font-mono text-xs text-indigo-400 break-all text-right max-w-[200px]">{joinUrl}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// === Theme Editor Component ===
function ThemeEditor({ theme, onSave, saving }: { theme: any; onSave: (t: any) => void; saving: boolean }) {
  const [primary, setPrimary] = useState(theme.primaryColor || "#6366f1");
  const [secondary, setSecondary] = useState(theme.secondaryColor || "#8b5cf6");
  const [button, setButton] = useState(theme.buttonColor || "#6366f1");
  const [text, setText] = useState(theme.textColor || "#ffffff");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Màu chính</label>
          <div className="flex items-center gap-2">
            <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent" />
            <input type="text" value={primary} onChange={(e) => setPrimary(e.target.value)} className="input-field !py-2 text-xs font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Màu phụ</label>
          <div className="flex items-center gap-2">
            <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent" />
            <input type="text" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="input-field !py-2 text-xs font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Màu nút</label>
          <div className="flex items-center gap-2">
            <input type="color" value={button} onChange={(e) => setButton(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent" />
            <input type="text" value={button} onChange={(e) => setButton(e.target.value)} className="input-field !py-2 text-xs font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Màu chữ</label>
          <div className="flex items-center gap-2">
            <input type="color" value={text} onChange={(e) => setText(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent" />
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} className="input-field !py-2 text-xs font-mono" />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl p-4 border border-white/10" style={{ backgroundColor: primary + "20" }}>
        <p className="text-xs text-slate-400 mb-2">Xem trước:</p>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: button, color: text }}>
            Nút mẫu
          </button>
          <span style={{ color: primary }} className="text-sm font-semibold">Văn bản chính</span>
          <span style={{ color: secondary }} className="text-sm">Văn bản phụ</span>
        </div>
      </div>

      <button
        onClick={() => onSave({ primaryColor: primary, secondaryColor: secondary, buttonColor: button, textColor: text })}
        disabled={saving}
        className="btn-primary text-sm disabled:opacity-50"
      >
        {saving ? "Đang lưu..." : "💾 Lưu cài đặt màu"}
      </button>
    </div>
  );
}
